import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — CodeMarket admin" },
      { name: "description", content: "Privacy-conscious activity analytics for the CodeMarket platform." },
      { property: "og:title", content: "Analytics — CodeMarket admin" },
      { property: "og:description", content: "Activity analytics for the CodeMarket platform." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAnalytics,
});

const RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All time", days: 0 },
];

function AdminAnalytics() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", days],
    queryFn: async () => {
      let query = supabase.from("analytics_events").select("event_type, created_at, software_id");
      if (days > 0) {
        query = query.gte("created_at", new Date(Date.now() - days * 86400000).toISOString());
      }
      const { data, error } = await query;
      if (error) throw error;

      const byType = new Map<string, number>();
      const byDay = new Map<string, number>();
      for (const row of data ?? []) {
        byType.set(row.event_type, (byType.get(row.event_type) ?? 0) + 1);
        const key = String(row.created_at).slice(0, 10);
        byDay.set(key, (byDay.get(key) ?? 0) + 1);
      }
      return {
        total: (data ?? []).length,
        byType: [...byType.entries()].sort((a, b) => b[1] - a[1]),
        byDay: [...byDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date: date.slice(5), count })),
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            {data?.total ?? 0} events recorded in the selected period.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((range) => (
            <Button
              key={range.label}
              size="sm"
              variant={days === range.days ? "default" : "outline"}
              onClick={() => setDays(range.days)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : (
        <>
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Activity over time</h2>
            <div className="mt-4 h-64">
              {data?.byDay.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No events recorded in this period yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Events by type</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {(data?.byType ?? []).map(([type, count]) => (
                <li key={type} className="flex items-center justify-between">
                  <span className="capitalize">{type.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">{count}</span>
                </li>
              ))}
              {!data?.byType.length ? (
                <li className="text-muted-foreground">Nothing recorded yet.</li>
              ) : null}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

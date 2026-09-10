import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Heart, Mail, Package, ShoppingBag, Timer, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/catalog";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — CodeMarket" },
      { name: "description", content: "CodeMarket platform overview for the administrator." },
      { property: "og:title", content: "Admin dashboard — CodeMarket" },
      { property: "og:description", content: "CodeMarket platform overview." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

const RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All time", days: 0 },
];

async function countOf(table: "profiles" | "software" | "downloads" | "likes" | "purchases") {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

function AdminDashboard() {
  const [days, setDays] = useState(30);

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: async () => {
      const [users, software, downloads, likes, purchases] = await Promise.all([
        countOf("profiles"),
        countOf("software"),
        countOf("downloads"),
        countOf("likes"),
        countOf("purchases"),
      ]);
      const { count: pending } = await supabase
        .from("purchases")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      const { count: unread } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "unread");
      return {
        users,
        software,
        downloads,
        likes,
        purchases,
        pending: pending ?? 0,
        unread: unread ?? 0,
      };
    },
  });

  const { data: chart } = useQuery({
    queryKey: ["admin-downloads-chart", days],
    queryFn: async () => {
      let query = supabase.from("downloads").select("downloaded_at");
      if (days > 0) {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte("downloaded_at", since);
      }
      const { data, error } = await query;
      if (error) throw error;
      const buckets = new Map<string, number>();
      for (const row of data ?? []) {
        const key = String(row.downloaded_at).slice(0, 10);
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
      return [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date: date.slice(5), count }));
    },
  });

  const { data: rankings } = useQuery({
    queryKey: ["admin-rankings"],
    queryFn: async () => {
      const [{ data: byDownloads }, { data: byLikes }] = await Promise.all([
        supabase.from("software").select("id, name, download_count").order("download_count", { ascending: false }).limit(5),
        supabase.from("software").select("id, name, like_count").order("like_count", { ascending: false }).limit(5),
      ]);
      return { byDownloads: byDownloads ?? [], byLikes: byLikes ?? [] };
    },
  });

  const { data: activity } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("analytics_events")
        .select("id, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Total users", value: kpis?.users, icon: Users },
    { label: "Total software", value: kpis?.software, icon: Package },
    { label: "Total downloads", value: kpis?.downloads, icon: Download },
    { label: "Total likes", value: kpis?.likes, icon: Heart },
    { label: "Total purchases", value: kpis?.purchases, icon: ShoppingBag },
    { label: "Pending purchases", value: kpis?.pending, icon: Timer },
    { label: "Unread messages", value: kpis?.unread, icon: Mail },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Welcome back 👋</h1>
        <p className="text-muted-foreground">Here's how CodeMarket is doing.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <card.icon className="h-4 w-4 text-primary" aria-hidden />
            </div>
            {isLoading ? (
              <Skeleton className="mt-3 h-7 w-16" />
            ) : (
              <p className="mt-2 font-display text-2xl font-bold">{card.value ?? 0}</p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Downloads over time</h2>
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
        <div className="mt-5 h-64">
          {chart?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary)"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No downloads recorded in this period yet.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-display text-base font-semibold">Most downloaded</h2>
          <ol className="mt-4 space-y-3 text-sm">
            {(rankings?.byDownloads ?? []).map((row, index) => (
              <li key={row.id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  {index + 1}. {row.name}
                </span>
                <span className="text-muted-foreground">{row.download_count}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-display text-base font-semibold">Most liked</h2>
          <ol className="mt-4 space-y-3 text-sm">
            {(rankings?.byLikes ?? []).map((row, index) => (
              <li key={row.id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  {index + 1}. {row.name}
                </span>
                <span className="text-muted-foreground">{row.like_count}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-display text-base font-semibold">Recent activity</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {(activity ?? []).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3">
                <span className="capitalize">{row.event_type.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>
              </li>
            ))}
            {!activity?.length ? (
              <li className="text-muted-foreground">No activity recorded yet.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

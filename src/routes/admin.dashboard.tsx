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
import { useAuth } from "@/hooks/useAuth";
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

function AdminDashboard() {
  const [days, setDays] = useState(30);
  const { onlineUserIds } = useAuth();

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "admin_dashboard_summary" as never,
        {
          _days: 30,
        } as never,
      );
      if (error) throw error;
      return (data ?? {}) as Record<string, number>;
    },
  });

  const { data: chart } = useQuery({
    queryKey: ["admin-downloads-chart", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "admin_dashboard_summary" as never,
        {
          _days: days,
        } as never,
      );
      if (error) throw error;
      const summary = (data ?? {}) as { downloads_by_day?: { date: string; count: number }[] };
      return (summary.downloads_by_day ?? []).map((item) => ({
        date: item.date.slice(5),
        count: item.count,
      }));
    },
  });

  const { data: rankings } = useQuery({
    queryKey: ["admin-rankings"],
    queryFn: async () => {
      const [{ data: byDownloads }, { data: byLikes }] = await Promise.all([
        supabase
          .from("software")
          .select("id, name, download_count")
          .order("download_count", { ascending: false })
          .limit(5),
        supabase
          .from("software")
          .select("id, name, like_count")
          .order("like_count", { ascending: false })
          .limit(5),
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
      <div className="dashboard-hero relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Command center
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
            A live view of your marketplace, its people, and the work moving through it.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-2 font-semibold text-foreground">
              <span className="h-2 w-2 rounded-full bg-success" />
              {onlineUserIds.length} users online now
            </span>
            <span className="text-muted-foreground">Realtime presence active</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="dashboard-kpi card-elevated card-elevated-hover group relative overflow-hidden rounded-2xl border bg-card p-5"
          >
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
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={30}
                />
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

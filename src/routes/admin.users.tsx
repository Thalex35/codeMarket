import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Circle, Users, Wifi } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/catalog";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — CodeMarket admin" },
      { name: "description", content: "Registered CodeMarket accounts and their activity." },
      { property: "og:title", content: "Users — CodeMarket admin" },
      { property: "og:description", content: "Registered CodeMarket accounts and their activity." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsers,
});

function AdminUsers() {
  const queryClient = useQueryClient();
  const { onlineUserIds, presenceStatus } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: downloads }, { data: likes }, { data: purchases }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, email, status, created_at")
            .order("created_at", { ascending: false }),
          supabase.from("downloads").select("user_id"),
          supabase.from("likes").select("user_id"),
          supabase.from("purchases").select("user_id"),
        ]);
      if (error) throw error;

      const tally = (rows: { user_id: string | null }[] | null) => {
        const map = new Map<string, number>();
        for (const row of rows ?? []) {
          if (!row.user_id) continue;
          map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
        }
        return map;
      };

      const downloadMap = tally(downloads);
      const likeMap = tally(likes);
      const purchaseMap = tally(purchases);

      return (profiles ?? []).map((profile) => ({
        ...profile,
        downloads: downloadMap.get(profile.id) ?? 0,
        likes: likeMap.get(profile.id) ?? 0,
        purchases: purchaseMap.get(profile.id) ?? 0,
      }));
    },
  });

  async function setStatus(id: string, status: "active" | "disabled") {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) {
      toast.error("The update failed. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(status === "active" ? "Account enabled." : "Account disabled.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">People</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-muted-foreground">
            Manage account access and watch the network in real time.
          </p>
        </div>
        <div
          className={`flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${
            presenceStatus === "connected"
              ? "border-success/20 bg-success/10 text-success"
              : "border-warning/20 bg-warning/10 text-warning-foreground"
          }`}
        >
          <Wifi className="h-4 w-4" aria-hidden />
          {presenceStatus === "connected"
            ? `${onlineUserIds.length} online now`
            : "Connecting live status"}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !data?.length ? (
        <EmptyState icon={Users} title="No users registered yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/35 text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Joined</th>
                <th className="p-3 font-medium">Downloads</th>
                <th className="p-3 font-medium">Likes</th>
                <th className="p-3 font-medium">Purchases</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.id}
                  className="border-b transition-colors last:border-0 hover:bg-muted/25"
                >
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 font-display text-sm font-bold text-primary">
                        {(row.full_name ?? row.email ?? "U").slice(0, 1).toUpperCase()}
                        {onlineUserIds.includes(row.id) ? (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
                        ) : null}
                      </span>
                      <span>{row.full_name ?? "Unnamed user"}</span>
                    </div>
                  </td>
                  <td className="p-3">{row.email}</td>
                  <td className="p-3">{formatDate(row.created_at)}</td>
                  <td className="p-3">{row.downloads}</td>
                  <td className="p-3">{row.likes}</td>
                  <td className="p-3">{row.purchases}</td>
                  <td className="p-3">
                    <Badge
                      className={
                        row.status === "active"
                          ? "border-success/20 bg-success/10 text-success"
                          : ""
                      }
                      variant={row.status === "active" ? "outline" : "destructive"}
                    >
                      <Circle className="mr-1 h-2.5 w-2.5 fill-current" aria-hidden />
                      {row.status === "active" ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void setStatus(row.id, row.status === "active" ? "disabled" : "active")
                      }
                    >
                      {row.status === "active" ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

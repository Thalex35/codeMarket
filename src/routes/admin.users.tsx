import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/catalog";

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

  async function setStatus(id: string, status: string) {
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
      <div>
        <h1 className="font-display text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">{data?.length ?? 0} registered accounts.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !data?.length ? (
        <EmptyState icon={Users} title="No users registered yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
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
                <tr key={row.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{row.full_name ?? "—"}</td>
                  <td className="p-3">{row.email}</td>
                  <td className="p-3">{formatDate(row.created_at)}</td>
                  <td className="p-3">{row.downloads}</td>
                  <td className="p-3">{row.likes}</td>
                  <td className="p-3">{row.purchases}</td>
                  <td className="p-3">
                    <Badge variant={row.status === "active" ? "secondary" : "destructive"}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void setStatus(row.id, row.status === "active" ? "disabled" : "active")}
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

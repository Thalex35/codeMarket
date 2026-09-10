import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatPrice } from "@/lib/catalog";

export const Route = createFileRoute("/admin/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases — CodeMarket admin" },
      { name: "description", content: "Review and confirm CodeMarket purchase requests." },
      { property: "og:title", content: "Purchases — CodeMarket admin" },
      { property: "og:description", content: "Review and confirm CodeMarket purchase requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPurchases,
});

const VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  paid: "default",
  pending: "secondary",
  cancelled: "destructive",
};

function AdminPurchases() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-purchases", status],
    queryFn: async () => {
      let query = supabase
        .from("purchases")
        .select(
          "id, user_id, amount, currency, status, payment_method, created_at, software:software_id (name)",
        )
        .order("created_at", { ascending: false });
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      const ids = [...new Set(rows.map((row) => row.user_id).filter(Boolean))] as string[];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] };
      const map = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return rows.map((row) => ({ ...row, profile: row.user_id ? map.get(row.user_id) ?? null : null }));
    },
  });

  async function setStatusFor(id: string, next: string) {
    const { error } = await supabase.from("purchases").update({ status: next }).eq("id", id);
    if (error) {
      toast.error("The update failed. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-purchases"] });
    toast.success(`Purchase marked ${next}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Purchases</h1>
          <p className="text-muted-foreground">
            Confirm a payment to unlock the download for that customer.
          </p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !data?.length ? (
        <EmptyState icon={ShoppingBag} title="No purchase requests yet." />
      ) : (
        <div className="space-y-3">
          {data.map((row) => {
            const profile = row.profile;
            const software = row.software as unknown as { name: string } | null;
            return (
              <div key={row.id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
                <div className="min-w-48 flex-1">
                  <p className="font-medium">{software?.name ?? "Software"}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.full_name ?? "User"} · {profile?.email} ·{" "}
                    {formatPrice(Number(row.amount), row.currency)} · {row.payment_method} ·{" "}
                    {formatDate(row.created_at)}
                  </p>
                </div>
                <Badge variant={VARIANTS[row.status] ?? "secondary"} className="capitalize">
                  {row.status}
                </Badge>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void setStatusFor(row.id, "paid")} disabled={row.status === "paid"}>
                    Mark paid
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void setStatusFor(row.id, "pending")}
                    disabled={row.status === "pending"}
                  >
                    Mark pending
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void setStatusFor(row.id, "cancelled")}
                    disabled={row.status === "cancelled"}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

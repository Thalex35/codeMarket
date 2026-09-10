import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatPrice } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({
    meta: [
      { title: "My purchases — CodeMarket" },
      { name: "description", content: "Your CodeMarket purchase requests and their status." },
      { property: "og:title", content: "My purchases — CodeMarket" },
      { property: "og:description", content: "Your CodeMarket purchase requests and their status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PurchasesPage,
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  paid: "default",
  pending: "secondary",
  cancelled: "destructive",
};

function PurchasesPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    enabled: Boolean(user),
    queryKey: ["my-purchases", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id, amount, currency, status, payment_method, created_at, software:software_id (name, slug)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold">My purchases</h1>
        <p className="mt-2 text-muted-foreground">
          Purchases are confirmed manually by the CodeMarket team over WhatsApp.
        </p>

        <div className="mt-8 space-y-4">
          {isLoading ? (
            [0, 1].map((key) => <Skeleton key={key} className="h-24 w-full rounded-xl" />)
          ) : !data?.length ? (
            <EmptyState
              icon={ShoppingBag}
              title="No purchases yet"
              description="You don't have any purchases yet."
              action={
                <Button asChild>
                  <Link to="/software">Browse paid software</Link>
                </Button>
              }
            />
          ) : (
            data.map((row) => {
              const software = row.software as { name: string; slug: string } | null;
              return (
                <div key={row.id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5">
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">{software?.name ?? "Software"}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(Number(row.amount), row.currency)} · {formatDate(row.created_at)} ·{" "}
                      {row.payment_method}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"} className="capitalize">
                    {row.status}
                  </Badge>
                  {software ? (
                    <Button asChild variant={row.status === "paid" ? "default" : "outline"}>
                      <Link to="/software/$slug" params={{ slug: software.slug }}>
                        {row.status === "paid" ? "Download" : "View software"}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

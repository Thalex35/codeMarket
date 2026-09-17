import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Circle, CreditCard, Download, Heart, ShieldCheck, UserRound } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatPrice } from "@/lib/catalog";

export const Route = createFileRoute("/admin/users/$id")({
  head: () => ({
    meta: [
      { title: "User details — CodeMarket admin" },
      { name: "description", content: "View a customer profile and purchase history." },
      { property: "og:title", content: "User details — CodeMarket admin" },
      { property: "og:description", content: "View a customer profile and purchase history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUserDetail,
});

function AdminUserDetail() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-detail", id],
    queryFn: async () => {
      const [
        { data: profile, error: profileError },
        { data: roleRow },
        { data: downloads },
        { data: likes },
        { data: purchases },
      ] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, status, created_at").eq("id", id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
        supabase.from("downloads").select("id").eq("user_id", id),
        supabase.from("likes").select("id").eq("user_id", id),
        supabase
          .from("purchases")
          .select("id, amount, currency, status, created_at, software:software_id (name)")
          .eq("user_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (profileError) throw profileError;
      if (!profile) {
        return null;
      }

      return {
        profile,
        role: roleRow?.role ?? "user",
        downloads: downloads?.length ?? 0,
        likes: likes?.length ?? 0,
        purchases: purchases ?? [],
      };
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  if (!data?.profile) {
    return (
      <EmptyState
        icon={UserRound}
        title="User not found"
        action={
          <Button asChild>
            <Link to="/admin/users">Back to users</Link>
          </Button>
        }
      />
    );
  }

  const { profile, role, downloads, likes, purchases } = data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Customer</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            {profile.full_name ?? "Unnamed user"}
          </h1>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Back to users
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border bg-card p-6 shadow-(--shadow-card)">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 font-display text-lg font-bold text-primary">
              {(profile.full_name ?? profile.email ?? "U").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{profile.full_name ?? "Unnamed user"}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-2">
                <Badge
                  className={
                    profile.status === "active"
                      ? "border-success/20 bg-success/10 text-success"
                      : ""
                  }
                  variant={profile.status === "active" ? "outline" : "destructive"}
                >
                  <Circle className="mr-1 h-2.5 w-2.5 fill-current" aria-hidden />
                  {profile.status === "active" ? "Active" : "Disabled"}
                </Badge>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
              <div className="mt-2">
                <Badge
                  variant={role === "admin" ? "default" : "outline"}
                  className={role === "admin" ? "bg-primary/90" : ""}
                >
                  <ShieldCheck className="mr-1 h-3 w-3" aria-hidden />
                  {role === "admin" ? "Admin" : "User"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Joined</p>
            <p className="mt-2 text-lg font-semibold">{formatDate(profile.created_at)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 shadow-(--shadow-card)">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Download className="h-4 w-4" aria-hidden />
              Downloads
            </div>
            <p className="mt-3 text-3xl font-bold">{downloads}</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-(--shadow-card)">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" aria-hidden />
              Likes
            </div>
            <p className="mt-3 text-3xl font-bold">{likes}</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-(--shadow-card)">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" aria-hidden />
              Purchases
            </div>
            <p className="mt-3 text-3xl font-bold">{purchases.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-(--shadow-card)">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">Purchase activity</h2>
          <Badge variant="secondary">{purchases.length} total</Badge>
        </div>

        {!purchases.length ? (
          <p className="text-sm text-muted-foreground">This user has not completed any purchases yet.</p>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => {
              const software = purchase.software as unknown as { name: string } | null;
              return (
                <div
                  key={purchase.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4"
                >
                  <div>
                    <p className="font-medium">{software?.name ?? "Software"}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(purchase.created_at)} · {purchase.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatPrice(Number(purchase.amount), purchase.currency)}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {purchase.status}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

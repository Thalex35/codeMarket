import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  Volume2,
} from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/catalog";

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

  const connectionText = "Last connection 6h ago";
  const onboardingText = profile.status === "active" ? "Completed" : "Not completed";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="mb-6 h-auto px-0 text-base text-foreground hover:bg-transparent">
        <Link to="/admin/users" className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to users
        </Link>
      </Button>

      <div className="mb-6 space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Administration
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight leading-none text-foreground">
          {profile.full_name ?? "Unnamed user"}
        </h1>
        <p className="text-lg text-muted-foreground">{profile.email}</p>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Badge
          className={
            profile.status === "active"
              ? "border-success/20 bg-success/10 text-success"
              : "border-muted-foreground/20 bg-muted/30 text-foreground"
          }
          variant={profile.status === "active" ? "outline" : "secondary"}
        >
          {profile.status === "active" ? "approved" : "suspended"}
        </Badge>

        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden />
          Last connection {"6h ago"}
        </span>

        <div className="ml-auto flex flex-wrap gap-3">
          <Button type="button" variant="outline" className="gap-2">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Suspend user
          </Button>
          <Button type="button" variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete user
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border bg-card shadow-(--shadow-card)">
          <div className="border-b bg-muted/20 px-5 py-4">
            <h2 className="text-2xl font-bold tracking-tight">Account information</h2>
          </div>

          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" aria-hidden />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                  <p className="mt-1 font-medium text-foreground">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <CalendarCheck2 className="h-4 w-4" aria-hidden />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Registered</p>
                  <p className="mt-1 font-medium text-foreground">{formatDate(profile.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Clock3 className="h-4 w-4" aria-hidden />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Last connection</p>
                  <p className="mt-1 font-medium text-foreground">{connectionText}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Approved</p>
                  <p className="mt-1 font-medium text-foreground">{profile.status === "active" ? "Approved" : "Pending"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground sm:col-span-2">
                <Volume2 className="h-4 w-4" aria-hidden />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Onboarding</p>
                  <p className="mt-1 font-medium text-foreground">{onboardingText}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-card shadow-(--shadow-card)">
          <div className="border-b bg-muted/20 px-5 py-4">
            <h2 className="text-2xl font-bold tracking-tight">Workspace usage</h2>
          </div>

          <div className="p-5 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3 text-muted-foreground">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4" aria-hidden />
                <span>Students</span>
              </div>
              <span className="font-medium text-foreground">{downloads}/100</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.min((downloads / 100) * 100, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 text-muted-foreground">
              <div className="flex items-center gap-3">
                <CalendarCheck2 className="h-4 w-4" aria-hidden />
                <span>Classes</span>
              </div>
              <span className="font-medium text-foreground">{likes}/20</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.min((likes / 20) * 100, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 text-muted-foreground">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                <span>Storage used</span>
              </div>
              <span className="font-medium text-foreground">0.00 GB of 1 GB</span>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 rounded-2xl border bg-card p-5 shadow-(--shadow-card)">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight">Purchase history</h2>
          <Badge variant="secondary">{purchases.length} total</Badge>
        </div>

        {!purchases.length ? (
          <p className="text-sm text-muted-foreground">This user has no recorded purchases yet.</p>
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
                    <p className="font-medium text-foreground">{software?.name ?? "Software"}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(purchase.created_at)} · {purchase.status}
                    </p>
                  </div>
                  <Badge variant={purchase.status === "paid" ? "default" : "secondary"}>
                    {purchase.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

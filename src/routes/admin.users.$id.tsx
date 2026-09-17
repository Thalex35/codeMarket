import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Heart,
  MessageSquareText,
  ShoppingBag,
  ShieldCheck,
  UserRound,
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
        { data: likes },
        { data: purchases },
        { data: messages },
      ] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, status, created_at").eq("id", id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
        supabase.from("likes").select("id, software_id, software:software_id (name)").eq("user_id", id),
        supabase
          .from("purchases")
          .select("id, amount, currency, status, created_at, software:software_id (name)")
          .eq("user_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("messages")
          .select("id, name, email, subject, message, created_at")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (profileError) throw profileError;
      if (!profile) {
        return null;
      }

      return {
        profile,
        role: roleRow?.role ?? "user",
        likes: likes ?? [],
        purchases: purchases ?? [],
        messages: messages ?? [],
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

  const {
    profile,
    role,
    likes = [],
    purchases = [],
    messages = [],
  } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="mb-6 h-auto px-0 text-base text-foreground hover:bg-transparent">
        <Link to="/admin/users" className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to users
        </Link>
      </Button>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Administration
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-foreground">
            {profile.full_name ?? "Unnamed user"}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{profile.email}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className={
              profile.status === "active"
                ? "border-success/20 bg-success/10 text-success"
                : "border-muted-foreground/20 bg-muted/30 text-foreground"
            }
            variant={profile.status === "active" ? "outline" : "secondary"}
          >
            {profile.status === "active" ? "Active" : "Disabled"}
          </Badge>
          <Badge
            variant={role === "admin" ? "default" : "outline"}
            className={role === "admin" ? "bg-primary/90" : ""}
          >
            <ShieldCheck className="mr-1 h-3 w-3" aria-hidden />
            {role === "admin" ? "Admin" : "User"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="overflow-hidden rounded-2xl border bg-card shadow-(--shadow-card) lg:col-span-2">
          <div className="border-b bg-muted/20 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" aria-hidden />
              <h2 className="text-xl font-bold tracking-tight">Purchase history</h2>
            </div>
          </div>

          <div className="p-4">
            {!purchases.length ? (
              <p className="text-sm text-muted-foreground">No purchases yet.</p>
            ) : (
              <div className="space-y-3">
                {purchases.map((purchase) => {
                  const software = purchase.software as unknown as { name: string } | null;
                  return (
                    <div
                      key={purchase.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3"
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
        </section>

        <section className="overflow-hidden rounded-2xl border bg-card shadow-(--shadow-card)">
          <div className="border-b bg-muted/20 px-5 py-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4" aria-hidden />
              <h2 className="text-xl font-bold tracking-tight">Liked software</h2>
            </div>
          </div>

          <div className="p-4">
            {!likes.length ? (
              <p className="text-sm text-muted-foreground">No liked software.</p>
            ) : (
              <div className="space-y-2">
                {(likes as Array<{ id: string; software: { name: string } | null }>).map((like) => (
                  <div key={like.id} className="rounded-xl border bg-muted/20 p-3 text-sm">
                    {like.software?.name ?? "Software"}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-(--shadow-card)">
        <div className="border-b bg-muted/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4" aria-hidden />
            <h2 className="text-xl font-bold tracking-tight">Messages</h2>
          </div>
        </div>

        <div className="p-4">
          {!messages.length ? (
            <p className="text-sm text-muted-foreground">No messages.</p>
          ) : (
            <div className="space-y-3">
              {(messages as Array<{ id: string; name: string; email: string; subject: string; message: string; created_at: string }>).map((message) => (
                <div key={message.id} className="rounded-xl border bg-muted/20 p-3">
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{message.name} · {message.email}</span>
                    <span>{formatDate(message.created_at)}</span>
                  </div>
                  <p className="font-medium text-foreground">{message.subject}</p>
                  <p className="mt-1 text-sm text-foreground">{message.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

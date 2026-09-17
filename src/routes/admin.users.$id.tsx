import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity, ArrowLeft, Ban, CalendarDays, Check, Clock3, Download, Heart,
  Mail, Package, Plus, Receipt, ShieldCheck, ShoppingBag, Star, StickyNote,
  Tag, Trash2, UserRound,
} from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/catalog";

type ActivityType = "purchase" | "like" | "download";
type ActivityItem = { id: string; date: string; type: ActivityType; title: string; description: string };

const activityStyles = {
  purchase: { label: "Purchase", icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
  like: { label: "Liked", icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
  download: { label: "Download", icon: Download, color: "text-emerald-600", bg: "bg-emerald-50" },
} as const;

export const Route = createFileRoute("/admin/users/$id")({
  head: () => ({ meta: [
    { title: "User details — CodeMarket admin" },
    { name: "description", content: "Review account activity and marketplace contributions." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdminUserDetail,
});

function accountAge(createdAt: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"}`;
}

function AdminUserDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState(["VIP", "Needs Review"]);
  const [note, setNote] = useState("Follow up about their marketplace activity.");
  const [statusMessage, setStatusMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-detail", id],
    queryFn: async () => {
      const [
        { data: profile, error: profileError }, { data: roleRow }, { data: likes },
        { data: purchases }, { data: downloads }, { data: products },
      ] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, status, created_at").eq("id", id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
        supabase.from("likes").select("id, software_id, created_at, software:software_id (name)").eq("user_id", id),
        supabase.from("purchases").select("id, status, created_at, software:software_id (name)").eq("user_id", id).order("created_at", { ascending: false }),
        supabase.from("downloads").select("id, downloaded_at, software:software_id (name)").eq("user_id", id).order("downloaded_at", { ascending: false }),
        supabase.from("software").select("id, name, download_count, published, created_at").eq("owner_id", id).order("created_at", { ascending: false }),
      ]);
      if (profileError) throw profileError;
      if (!profile) return null;
      return { profile, role: roleRow?.role ?? "user", likes: likes ?? [], purchases: purchases ?? [], downloads: downloads ?? [], products: products ?? [] };
    },
  });

  if (isLoading) return <Skeleton className="h-160 w-full rounded-xl" />;
  if (!data?.profile) return <EmptyState icon={UserRound} title="User not found" action={<Button asChild><Link to="/admin/users">Back to users</Link></Button>} />;

  const { profile, role, likes = [], purchases = [], downloads = [], products = [] } = data;
  const latestDates = [purchases[0]?.created_at, likes[0]?.created_at, downloads[0]?.downloaded_at].filter(Boolean).sort();
  const lastActive = latestDates.at(-1);
  const activities: ActivityItem[] = [
    ...purchases.map((item) => ({ id: `purchase-${item.id}`, date: item.created_at, type: "purchase" as const, title: "Purchased software", description: (item.software as unknown as { name: string } | null)?.name ?? "Software purchase" })),
    ...likes.map((item) => ({ id: `like-${item.id}`, date: item.created_at, type: "like" as const, title: "Liked software", description: (item.software as unknown as { name: string } | null)?.name ?? "Software item" })),
    ...downloads.map((item) => ({ id: `download-${item.id}`, date: item.downloaded_at, type: "download" as const, title: "Downloaded software", description: (item.software as unknown as { name: string } | null)?.name ?? "Software download" })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const isSuspended = profile.status !== "active";

  async function toggleStatus() {
    const nextStatus = isSuspended ? "active" : "disabled";
    const { error } = await supabase.from("profiles").update({ status: nextStatus }).eq("id", id);
    if (error) { setStatusMessage("The status update failed."); return; }
    setStatusMessage(nextStatus === "active" ? "Account restored." : "Account suspended.");
    await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id] });
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function deleteUser() {
    if (role === "admin" || !window.confirm(`Delete ${profile.full_name ?? profile.email}? This cannot be undone.`)) return;
    const { error } = await supabase.rpc(
      "admin_delete_user" as never,
      { _user_id: id } as never,
    );
    if (error) { setStatusMessage("The user could not be deleted."); return; }
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    await navigate({ to: "/admin/users" });
  }

  function addTag() {
    const value = newTag.trim();
    if (!value || tags.includes(value)) return;
    setTags((current) => [...current, value]);
    setNewTag("");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="mb-5 h-auto px-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"><Link to="/admin/users" className="inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4" aria-hidden />Back to users</Link></Button>
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"><span>People</span><span>/</span><span>User profile</span></div><h1 className="font-display text-3xl font-bold tracking-tight">{profile.full_name ?? "Unnamed user"}</h1><p className="mt-1 text-muted-foreground">{profile.email}</p></div>
        <div className="flex items-center gap-2"><Badge variant={isSuspended ? "destructive" : "outline"} className={isSuspended ? "" : "border-success/25 bg-success/10 text-success"}><span className={`mr-1.5 h-2 w-2 rounded-full ${isSuspended ? "bg-destructive-foreground" : "bg-success"}`} />{isSuspended ? "Suspended" : "Active"}</Badge><Badge variant={role === "admin" ? "default" : "secondary"}><ShieldCheck className="mr-1 h-3 w-3" aria-hidden />{role === "admin" ? "Admin" : "User"}</Badge></div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(250px,3fr)]">
        <main className="min-w-0 space-y-6">
          <section aria-labelledby="stats-heading"><div className="mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" aria-hidden /><h2 id="stats-heading" className="text-sm font-semibold">Quick stats</h2></div><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[{ label: "Account age", value: accountAge(profile.created_at), icon: CalendarDays }, { label: "Total purchases", value: purchases.length, icon: Receipt }, { label: "Items liked", value: likes.length, icon: Heart }, { label: "Last active", value: lastActive ? formatDate(lastActive) : "No activity", icon: Clock3 }].map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="rounded-xl border bg-card p-4"><Icon className="mb-3 h-4 w-4 text-muted-foreground" aria-hidden /><p className="text-xl font-bold tracking-tight">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.label}</p></div>; })}
          </div></section>

          <section className="rounded-xl border bg-card" aria-labelledby="activity-heading"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 id="activity-heading" className="font-semibold">Activity timeline</h2><p className="mt-1 text-sm text-muted-foreground">Recent actions from this account</p></div><Badge variant="secondary">{activities.length} events</Badge></div><div className="p-5">{!activities.length ? <p className="text-sm text-muted-foreground">No activity recorded yet.</p> : <div className="relative space-y-5 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-border">{activities.slice(0, 8).map((item) => { const style = activityStyles[item.type]; const Icon = style.icon; return <div key={item.id} className="relative flex gap-4"><div className={`relative z-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.color}`}><Icon className="h-4 w-4" aria-hidden /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold">{item.title}</p><time className="text-xs text-muted-foreground">{formatDate(item.date)}</time></div><p className="mt-1 text-sm text-muted-foreground">{item.description}</p><Badge variant="outline" className="mt-2 text-[11px]">{style.label}</Badge></div></div>; })}</div>}</div></section>

          <section className="rounded-xl border bg-card" aria-labelledby="developer-heading"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 id="developer-heading" className="font-semibold">Developer profile</h2><p className="mt-1 text-sm text-muted-foreground">Marketplace contributions from this seller</p></div><Badge variant={products.length ? "default" : "secondary"}>{products.length ? "Seller" : "Buyer"}</Badge></div><div className="p-5">{!products.length ? <p className="text-sm text-muted-foreground">This user has not published any marketplace products.</p> : <><div className="mb-5 grid grid-cols-3 gap-3"><div><p className="text-lg font-bold">{products.reduce((total, product) => total + (product.download_count ?? 0), 0)}</p><p className="text-xs text-muted-foreground">Total downloads</p></div><div><p className="text-lg font-bold">—</p><p className="text-xs text-muted-foreground">Average rating</p></div><div><p className="text-lg font-bold">{products.length}</p><p className="text-xs text-muted-foreground">Products</p></div></div><div className="space-y-2">{products.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="flex min-w-0 items-center gap-3"><Package className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /><span className="truncate text-sm font-medium">{product.name}</span></div><Badge variant={product.published ? "outline" : "secondary"}>{product.published ? "Published" : "Draft"}</Badge></div>)}</div></>}</div></section>

          <section className="rounded-xl border bg-card" aria-labelledby="reviews-heading"><div className="border-b px-5 py-4"><h2 id="reviews-heading" className="font-semibold">Reviews given</h2><p className="mt-1 text-sm text-muted-foreground">Ratings and comments posted by this user</p></div><div className="p-5"><div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/20 p-4"><Star className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden /><div><p className="text-sm font-medium">No reviews recorded</p><p className="mt-1 text-sm text-muted-foreground">Review tracking is not available for this account yet.</p></div></div></div></section>
        </main>

        <aside className="space-y-6 lg:sticky lg:top-6">
          <section className="rounded-xl border bg-card" aria-labelledby="actions-heading"><div className="border-b px-5 py-4"><h2 id="actions-heading" className="font-semibold">Quick actions</h2><p className="mt-1 text-sm text-muted-foreground">Manage this account</p></div><div className="space-y-2 p-4"><Button asChild variant="outline" className="w-full justify-start gap-2"><a href={`mailto:${profile.email}`}><Mail className="h-4 w-4" aria-hidden />Contact user</a></Button><Button type="button" variant={isSuspended ? "default" : "outline"} className="w-full justify-start gap-2" onClick={() => void toggleStatus()}><Ban className="h-4 w-4" aria-hidden />{isSuspended ? "Restore account" : "Suspend account"}</Button><Button asChild variant="outline" className="w-full justify-start gap-2"><Link to="/admin/purchases"><Receipt className="h-4 w-4" aria-hidden />View transactions</Link></Button><Button type="button" variant="destructive" disabled={role === "admin"} className="w-full justify-start gap-2" onClick={() => void deleteUser()}><Trash2 className="h-4 w-4" aria-hidden />Delete user</Button>{role === "admin" ? <p className="text-xs text-muted-foreground">Administrator accounts cannot be deleted here.</p> : null}{statusMessage ? <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5 text-success" aria-hidden />{statusMessage}</p> : null}</div></section>

          <section className="rounded-xl border bg-card" aria-labelledby="notes-heading"><div className="border-b px-5 py-4"><div className="flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" aria-hidden /><h2 id="notes-heading" className="font-semibold">Tags & notes</h2></div><p className="mt-1 text-sm text-muted-foreground">Visible to administrators only</p></div><div className="space-y-4 p-4"><div className="flex flex-wrap gap-2">{tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div><div className="flex gap-2"><Input value={newTag} onChange={(event) => setNewTag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addTag(); }} placeholder="Add a tag" aria-label="New tag" /><Button type="button" size="icon" variant="outline" onClick={addTag} aria-label="Add tag"><Plus className="h-4 w-4" /></Button></div><div><label htmlFor="admin-note" className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><StickyNote className="h-3.5 w-3.5" aria-hidden />Admin note</label><textarea id="admin-note" value={note} onChange={(event) => setNote(event.target.value)} className="min-h-24 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" placeholder="Add a private note" /></div></div></section>
        </aside>
      </div>
    </div>
  );
}

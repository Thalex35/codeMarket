import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import { AppImage } from "@/components/AppImage";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, formatDate, formatPrice, type Software } from "@/lib/catalog";

export const Route = createFileRoute("/admin/software/")({
  head: () => ({
    meta: [
      { title: "Manage software — CodeMarket admin" },
      { name: "description", content: "Create, publish and manage the CodeMarket software catalog." },
      { property: "og:title", content: "Manage software — CodeMarket admin" },
      { property: "og:description", content: "Manage the CodeMarket software catalog." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSoftwareList,
});

function AdminSoftwareList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [pricing, setPricing] = useState("all");
  const [sort, setSort] = useState("updated");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-software", { search, category, status, pricing, sort }],
    queryFn: async () => {
      let query = supabase.from("software").select("*");
      if (search) {
        const term = `%${search.replace(/[%,]/g, "")}%`;
        query = query.or(`name.ilike.${term},short_description.ilike.${term}`);
      }
      if (category !== "all") query = query.eq("category", category);
      if (pricing !== "all") query = query.eq("pricing_type", pricing);
      if (status === "published") query = query.eq("published", true).eq("archived", false);
      if (status === "draft") query = query.eq("published", false).eq("archived", false);
      if (status === "archived") query = query.eq("archived", true);

      if (sort === "downloads") query = query.order("download_count", { ascending: false });
      else if (sort === "name") query = query.order("name", { ascending: true });
      else query = query.order("updated_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Software[];
    },
  });

  async function update(id: string, patch: Record<string, unknown>, message: string) {
    const { error } = await supabase.from("software").update(patch as never).eq("id", id);
    if (error) {
      toast.error("The update failed. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-software"] });
    toast.success(message);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">All software</h1>
          <p className="text-muted-foreground">{data?.length ?? 0} items in the catalog.</p>
        </div>
        <Button asChild>
          <Link to="/admin/software/new">
            <PlusCircle className="mr-2 h-4 w-4" aria-hidden /> Add software
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5">
        <Input
          placeholder="Search software"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>{item}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pricing} onValueChange={setPricing}>
          <SelectTrigger><SelectValue placeholder="Pricing" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Free and paid</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Recently updated</SelectItem>
            <SelectItem value="downloads">Most downloaded</SelectItem>
            <SelectItem value="name">A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => <Skeleton key={key} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : !data?.length ? (
        <EmptyState icon={Package} title="No software available yet." />
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
              <AppImage
                reference={item.cover_url}
                alt={`${item.name} cover`}
                className="h-16 w-24 rounded-md object-cover"
              />
              <div className="min-w-48 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.name}</p>
                  <Badge variant={item.archived ? "destructive" : item.published ? "default" : "secondary"}>
                    {item.archived ? "Archived" : item.published ? "Published" : "Draft"}
                  </Badge>
                  {item.featured ? <Badge variant="outline">Featured</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.category} ·{" "}
                  {item.pricing_type === "paid" ? formatPrice(item.price, item.currency) : "Free"} ·{" "}
                  {item.download_count} downloads · {item.like_count} likes · updated{" "}
                  {formatDate(item.updated_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/software/$slug" params={{ slug: item.slug }}>View</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/software/$id" params={{ id: item.id }}>Edit</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/software/$id/versions" params={{ id: item.id }}>Versions</Link>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void update(
                      item.id,
                      { published: !item.published },
                      item.published ? "Software unpublished." : "Software published.",
                    )
                  }
                >
                  {item.published ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void update(
                      item.id,
                      { archived: !item.archived },
                      item.archived ? "Software restored." : "Software archived.",
                    )
                  }
                >
                  {item.archived ? "Restore" : "Archive"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

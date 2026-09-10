import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { AppImage } from "@/components/AppImage";
import { EmptyState } from "@/components/EmptyState";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/likes")({
  head: () => ({
    meta: [
      { title: "My likes — CodeMarket" },
      { name: "description", content: "The CodeMarket applications you have liked." },
      { property: "og:title", content: "My likes — CodeMarket" },
      { property: "og:description", content: "The CodeMarket applications you have liked." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LikesPage,
});

function LikesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    enabled: Boolean(user),
    queryKey: ["my-likes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("likes")
        .select("id, created_at, software:software_id (id, name, slug, cover_url, short_description)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function unlike(id: string) {
    const { error } = await supabase.from("likes").delete().eq("id", id);
    if (error) {
      toast.error("We couldn't remove this like. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["my-likes", user?.id] });
    toast.success("Removed from your likes.");
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold">My likes</h1>
        <p className="mt-2 text-muted-foreground">Applications you've saved with a like.</p>

        <div className="mt-8 space-y-4">
          {isLoading ? (
            [0, 1, 2].map((key) => <Skeleton key={key} className="h-24 w-full rounded-xl" />)
          ) : !data?.length ? (
            <EmptyState
              icon={Heart}
              title="No likes yet"
              description="You haven't liked any software yet."
              action={
                <Button asChild>
                  <Link to="/software">Explore software</Link>
                </Button>
              }
            />
          ) : (
            data.map((row) => {
              const software = row.software as
                | { name: string; slug: string; cover_url: string | null; short_description: string }
                | null;
              if (!software) return null;
              return (
                <div key={row.id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
                  <AppImage
                    reference={software.cover_url}
                    alt={`${software.name} cover`}
                    className="h-16 w-24 rounded-md object-cover"
                  />
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">{software.name}</p>
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {software.short_description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline">
                      <Link to="/software/$slug" params={{ slug: software.slug }}>
                        View
                      </Link>
                    </Button>
                    <Button variant="ghost" onClick={() => void unlike(row.id)}>
                      Unlike
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

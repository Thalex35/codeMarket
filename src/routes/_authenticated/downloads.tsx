import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { AppImage } from "@/components/AppImage";
import { EmptyState } from "@/components/EmptyState";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/downloads")({
  head: () => ({
    meta: [
      { title: "My downloads — CodeMarket" },
      { name: "description", content: "Every application you have downloaded from CodeMarket." },
      { property: "og:title", content: "My downloads — CodeMarket" },
      { property: "og:description", content: "Your CodeMarket download history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    enabled: Boolean(user),
    queryKey: ["my-downloads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select(
          "id, downloaded_at, software:software_id (id, name, slug, cover_url), version:version_id (version)",
        )
        .eq("user_id", user!.id)
        .order("downloaded_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold">My downloads</h1>
        <p className="mt-2 text-muted-foreground">Everything you've downloaded from CodeMarket.</p>

        <div className="mt-8 space-y-4">
          {isLoading ? (
            [0, 1, 2].map((key) => <Skeleton key={key} className="h-24 w-full rounded-xl" />)
          ) : !data?.length ? (
            <EmptyState
              icon={Download}
              title="No downloads yet"
              description="You haven't downloaded any software yet. Explore CodeMarket to get started."
              action={
                <Button asChild>
                  <Link to="/software">Explore software</Link>
                </Button>
              }
            />
          ) : (
            data.map((row) => {
              const software = row.software as { name: string; slug: string; cover_url: string | null } | null;
              const version = row.version as { version: string } | null;
              if (!software) return null;
              return (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4"
                >
                  <AppImage
                    reference={software.cover_url}
                    alt={`${software.name} cover`}
                    className="h-16 w-24 rounded-md object-cover"
                  />
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">{software.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Version {version?.version ?? "—"} · {formatDate(row.downloaded_at)}
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <Link to="/software/$slug" params={{ slug: software.slug }}>
                      Download again
                    </Link>
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

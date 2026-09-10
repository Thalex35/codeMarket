import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";

import { SoftwareForm } from "@/components/admin/SoftwareForm";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Software } from "@/lib/catalog";

export const Route = createFileRoute("/admin/software/$id/")({
  head: () => ({
    meta: [
      { title: "Edit software — CodeMarket admin" },
      { name: "description", content: "Update the details of an application in the CodeMarket catalog." },
      { property: "og:title", content: "Edit software — CodeMarket admin" },
      { property: "og:description", content: "Update a CodeMarket application listing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditSoftware,
});

function EditSoftware() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-software-detail", id],
    queryFn: async () => {
      const [{ data: software, error }, { data: shots }] = await Promise.all([
        supabase.from("software").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("software_screenshots")
          .select("id, image_url, caption")
          .eq("software_id", id)
          .order("sort_order", { ascending: true }),
      ]);
      if (error) throw error;
      return {
        software: (software as unknown as Software) ?? null,
        screenshots: (shots ?? []).map((shot) => ({
          id: shot.id,
          image_url: shot.image_url,
          caption: shot.caption ?? "",
        })),
      };
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!data?.software) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="Software not found"
        action={
          <Button asChild>
            <Link to="/admin/software">Back to all software</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{data.software.name}</h1>
          <p className="text-muted-foreground">Edit this listing. Downloads and likes are preserved.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/software/$id/versions" params={{ id }}>Manage versions</Link>
        </Button>
      </div>
      <SoftwareForm initial={data.software} screenshots={data.screenshots} />
    </div>
  );
}

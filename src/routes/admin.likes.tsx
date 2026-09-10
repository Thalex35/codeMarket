import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/likes")({
  head: () => ({
    meta: [
      { title: "Likes — CodeMarket admin" },
      { name: "description", content: "Popularity ranking of the CodeMarket catalog by likes." },
      { property: "og:title", content: "Likes — CodeMarket admin" },
      { property: "og:description", content: "Popularity ranking of the CodeMarket catalog." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLikes,
});

function AdminLikes() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-likes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("software")
        .select("id, name, category, like_count, download_count")
        .order("like_count", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Likes</h1>
        <p className="text-muted-foreground">Which applications people save the most.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !data?.length ? (
        <EmptyState icon={Heart} title="No likes recorded yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">#</th>
                <th className="p-3 font-medium">Software</th>
                <th className="p-3 font-medium">Category</th>
                <th className="p-3 font-medium">Likes</th>
                <th className="p-3 font-medium">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="p-3 text-muted-foreground">{index + 1}</td>
                  <td className="p-3 font-medium">{row.name}</td>
                  <td className="p-3">{row.category}</td>
                  <td className="p-3">{row.like_count}</td>
                  <td className="p-3">{row.download_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

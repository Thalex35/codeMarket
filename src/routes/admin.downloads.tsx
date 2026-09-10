import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
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
import { formatDate } from "@/lib/catalog";

export const Route = createFileRoute("/admin/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads — CodeMarket admin" },
      { name: "description", content: "Every download recorded on the CodeMarket platform." },
      { property: "og:title", content: "Downloads — CodeMarket admin" },
      { property: "og:description", content: "Every download recorded on CodeMarket." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDownloads,
});

function AdminDownloads() {
  const [softwareId, setSoftwareId] = useState("all");
  const [since, setSince] = useState("");

  const { data: softwareList } = useQuery({
    queryKey: ["admin-software-options"],
    queryFn: async () => {
      const { data } = await supabase.from("software").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-downloads", softwareId, since],
    queryFn: async () => {
      let query = supabase
        .from("downloads")
        .select("id, user_id, downloaded_at, software:software_id (name), version:version_id (version)")
        .order("downloaded_at", { ascending: false })
        .limit(200);
      if (softwareId !== "all") query = query.eq("software_id", softwareId);
      if (since) query = query.gte("downloaded_at", new Date(since).toISOString());
      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      const ids = [...new Set(rows.map((row) => row.user_id).filter(Boolean))] as string[];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] };
      const map = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return rows.map((row) => ({ ...row, profile: row.user_id ? map.get(row.user_id) ?? null : null }));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Downloads</h1>
        <p className="text-muted-foreground">Latest 200 download records.</p>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <Select value={softwareId} onValueChange={setSoftwareId}>
          <SelectTrigger><SelectValue placeholder="Software" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All software</SelectItem>
            {(softwareList ?? []).map((item) => (
              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={since} onChange={(event) => setSince(event.target.value)} />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !data?.length ? (
        <EmptyState icon={Download} title="No downloads recorded yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">User</th>
                <th className="p-3 font-medium">Software</th>
                <th className="p-3 font-medium">Version</th>
                <th className="p-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const profile = row.profile;
                const software = row.software as unknown as { name: string } | null;
                const version = row.version as unknown as { version: string } | null;
                return (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="p-3">
                      <div>{profile?.full_name ?? "User"}</div>
                      <div className="text-xs text-muted-foreground">{profile?.email}</div>
                    </td>
                    <td className="p-3">{software?.name ?? "—"}</td>
                    <td className="p-3">{version?.version ?? "—"}</td>
                    <td className="p-3">{formatDate(row.downloaded_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/admin/messages")({
  head: () => ({
    meta: [
      { title: "Messages — CodeMarket admin" },
      { name: "description", content: "Contact form submissions sent to CodeMarket." },
      { property: "og:title", content: "Messages — CodeMarket admin" },
      { property: "og:description", content: "Contact form submissions sent to CodeMarket." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminMessages,
});

function AdminMessages() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-messages", status],
    queryFn: async () => {
      let query = supabase.from("messages").select("*").order("created_at", { ascending: false });
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  async function updateStatus(id: string, next: string) {
    const { error } = await supabase.from("messages").update({ status: next }).eq("id", id);
    if (error) {
      toast.error("The update failed. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Contact form submissions.</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All messages</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !data?.length ? (
        <EmptyState icon={Mail} title="No messages yet." />
      ) : (
        <div className="space-y-3">
          {data.map((row) => {
            const open = openId === row.id;
            return (
              <div key={row.id} className="rounded-xl border bg-card p-4">
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center gap-3 text-left"
                  onClick={() => {
                    setOpenId(open ? null : row.id);
                    if (!open && row.status === "unread") void updateStatus(row.id, "read");
                  }}
                >
                  <div className="min-w-48 flex-1">
                    <p className="font-medium">{row.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {row.name} · {row.email} · {formatDate(row.created_at)}
                    </p>
                  </div>
                  <Badge variant={row.status === "unread" ? "default" : "secondary"} className="capitalize">
                    {row.status}
                  </Badge>
                </button>
                {open ? (
                  <div className="mt-4 border-t pt-4">
                    <p className="whitespace-pre-line text-sm">{row.message}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={`mailto:${row.email}?subject=Re: ${encodeURIComponent(row.subject)}`}>
                          Reply by email
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void updateStatus(row.id, "archived")}>
                        Archive
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

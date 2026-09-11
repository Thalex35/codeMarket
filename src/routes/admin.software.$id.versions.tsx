import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { ProgressPanel } from "@/components/ProgressPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, type SoftwareVersion } from "@/lib/catalog";
import { uploadFileWithProgress } from "@/lib/media";

export const Route = createFileRoute("/admin/software/$id/versions")({
  head: () => ({
    meta: [
      { title: "Manage versions — CodeMarket admin" },
      { name: "description", content: "Publish new releases and installers for a CodeMarket application." },
      { property: "og:title", content: "Manage versions — CodeMarket admin" },
      { property: "og:description", content: "Publish new releases for a CodeMarket application." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VersionsPage,
});

function VersionsPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [form, setForm] = useState({
    version: "",
    release_date: new Date().toISOString().slice(0, 10),
    release_notes: "",
    file_size: "",
    file_path: "",
    minimum_os: "",
  });

  const { data: software } = useQuery({
    queryKey: ["admin-software-name", id],
    queryFn: async () => {
      const { data } = await supabase.from("software").select("name, slug").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: versions, isLoading } = useQuery({
    queryKey: ["admin-versions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("software_versions")
        .select("*")
        .eq("software_id", id)
        .order("release_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SoftwareVersion[];
    },
  });

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) {
      toast.error("Installer files must be smaller than 500 MB.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const reference = await uploadFileWithProgress(
        "software-files",
        `${id}/${Date.now()}-${safeName}`,
        file,
        setUploadProgress,
      );
      setForm((prev) => ({
        ...prev,
        file_path: reference,
        file_size: prev.file_size || `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      }));
      toast.success("Installer uploaded.");
    } catch {
      toast.error("The upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      event.target.value = "";
    }
  }

  async function addVersion() {
    if (!form.version.trim()) {
      toast.error("Enter a version number.");
      return;
    }
    setBusy(true);
    try {
      await supabase.from("software_versions").update({ is_current: false }).eq("software_id", id);
      const { error } = await supabase.from("software_versions").insert({
        software_id: id,
        version: form.version.trim(),
        release_date: form.release_date,
        release_notes: form.release_notes || null,
        file_size: form.file_size || null,
        file_path: form.file_path || null,
        minimum_os: form.minimum_os || null,
        is_current: true,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["admin-versions", id] });
      setForm({
        version: "",
        release_date: new Date().toISOString().slice(0, 10),
        release_notes: "",
        file_size: "",
        file_path: "",
        minimum_os: "",
      });
      toast.success("Version published.");
    } catch {
      toast.error("We couldn't add this version. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function makeCurrent(versionId: string) {
    await supabase.from("software_versions").update({ is_current: false }).eq("software_id", id);
    const { error } = await supabase
      .from("software_versions")
      .update({ is_current: true })
      .eq("id", versionId);
    if (error) {
      toast.error("We couldn't update the current version.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-versions", id] });
    toast.success("Current version updated.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Versions</h1>
          <p className="text-muted-foreground">{software?.name ?? "Software"} release history.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/software/$id" params={{ id }}>Back to details</Link>
        </Button>
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Add a version</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="version">Version number</Label>
            <Input
              id="version"
              placeholder="1.3.0"
              value={form.version}
              onChange={(event) => setForm((prev) => ({ ...prev, version: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Release date</Label>
            <Input
              id="date"
              type="date"
              value={form.release_date}
              onChange={(event) => setForm((prev) => ({ ...prev, release_date: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="size">File size</Label>
            <Input
              id="size"
              placeholder="48 MB"
              value={form.file_size}
              onChange={(event) => setForm((prev) => ({ ...prev, file_size: event.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="minimum-os">Minimum operating system</Label>
          <Input
            id="minimum-os"
            placeholder="Windows 10 or newer"
            value={form.minimum_os}
            onChange={(event) => setForm((prev) => ({ ...prev, minimum_os: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="release-notes">Release notes</Label>
          <Textarea
            id="release-notes"
            rows={3}
            value={form.release_notes}
            onChange={(event) => setForm((prev) => ({ ...prev, release_notes: event.target.value }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {uploading && uploadProgress !== null ? (
            <ProgressPanel
              label="Uploading installer"
              progress={uploadProgress}
              detail="Large files can take a moment. Keep this page open until it completes."
            />
          ) : null}
          <label className="inline-flex">
            <input type="file" className="hidden" onChange={(event) => void upload(event)} />
            <span className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-accent">
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="mr-2 h-4 w-4" aria-hidden />
              )}
              Upload installer
            </span>
          </label>
          {form.file_path ? (
            <span className="text-xs text-muted-foreground">Uploaded: {form.file_path}</span>
          ) : null}
          <Button disabled={busy} onClick={() => void addVersion()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Add version
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        {isLoading ? (
          [0, 1].map((key) => <Skeleton key={key} className="h-20 w-full rounded-xl" />)
        ) : !versions?.length ? (
          <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
            No versions yet.
          </p>
        ) : (
          versions.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
              <div className="min-w-40 flex-1">
                <p className="font-medium">
                  v{item.version} {item.is_current ? <Badge className="ml-2">Current</Badge> : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(item.release_date)} · {item.file_size ?? "no file size"} ·{" "}
                  {item.file_path ? "installer attached" : "no installer"}
                </p>
                {item.release_notes ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.release_notes}</p>
                ) : null}
              </div>
              {!item.is_current ? (
                <Button size="sm" variant="outline" onClick={() => void makeCurrent(item.id)}>
                  Set as current
                </Button>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

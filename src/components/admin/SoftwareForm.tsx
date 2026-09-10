import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AppImage } from "@/components/AppImage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, PLATFORMS, slugify, type Software } from "@/lib/catalog";
import { uploadFile } from "@/lib/media";

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_INSTALLER = 500 * 1024 * 1024;

const schema = z.object({
  name: z.string().trim().min(2, "Enter a software name").max(120),
  slug: z.string().trim().min(2, "Enter a slug").max(120),
  short_description: z.string().trim().min(10, "Add a short description").max(200),
  description: z.string().trim().min(20, "Add a full description").max(8000),
  category: z.string().min(1),
  platform: z.string().min(1),
  price: z.number().min(0),
});

type Screenshot = { id?: string; image_url: string; caption: string };

export function SoftwareForm({
  initial,
  screenshots: initialScreenshots = [],
}: {
  initial?: Software;
  screenshots?: Screenshot[];
}) {
  const navigate = useNavigate();
  const editing = Boolean(initial);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    short_description: initial?.short_description ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "Productivity",
    platform: initial?.platform ?? "Windows",
    pricing_type: initial?.pricing_type ?? "free",
    price: String(initial?.price ?? 0),
    currency: initial?.currency ?? "USD",
    cover_url: initial?.cover_url ?? "",
    featured: initial?.featured ?? false,
    published: initial?.published ?? false,
  });
  const [features, setFeatures] = useState((initial?.features ?? []).join("\n"));
  const [requirements, setRequirements] = useState(
    Object.entries(initial?.requirements ?? {})
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n"),
  );
  const [version, setVersion] = useState({
    version: "1.0.0",
    release_date: new Date().toISOString().slice(0, 10),
    release_notes: "",
    file_size: "",
    file_path: "",
  });
  const [screenshots, setScreenshots] = useState<Screenshot[]>(initialScreenshots);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  function parsedRequirements() {
    const map: Record<string, string> = {};
    for (const line of requirements.split("\n")) {
      const [key, ...rest] = line.split(":");
      if (!key?.trim() || !rest.length) continue;
      map[key.trim().toLowerCase().replace(/\s+/g, "_")] = rest.join(":").trim();
    }
    return map;
  }

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    kind: "cover" | "screenshot" | "installer",
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    const isImage = kind !== "installer";
    if (isImage && !file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (isImage && file.size > MAX_IMAGE) {
      toast.error("Images must be smaller than 5 MB.");
      return;
    }
    if (!isImage && file.size > MAX_INSTALLER) {
      toast.error("Installer files must be smaller than 500 MB.");
      return;
    }
    setUploading(kind);
    try {
      const bucket = kind === "cover" ? "covers" : kind === "screenshot" ? "screenshots" : "software-files";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const reference = await uploadFile(bucket, `${form.slug || "draft"}/${Date.now()}-${safeName}`, file);
      if (kind === "cover") setForm((prev) => ({ ...prev, cover_url: reference }));
      if (kind === "screenshot") setScreenshots((prev) => [...prev, { image_url: reference, caption: "" }]);
      if (kind === "installer") {
        setVersion((prev) => ({
          ...prev,
          file_path: reference,
          file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        }));
      }
      toast.success("Upload complete.");
    } catch {
      toast.error("The upload failed. Please try again.");
    } finally {
      setUploading(null);
      event.target.value = "";
    }
  }

  async function submit(publish: boolean) {
    const price = Number(form.price) || 0;
    const parsed = schema.safeParse({ ...form, price });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (form.pricing_type === "paid" && price <= 0) {
      setErrors({ price: "Paid software needs a price above zero" });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: slugify(form.slug),
        short_description: form.short_description.trim(),
        description: form.description.trim(),
        category: form.category,
        platform: form.platform,
        pricing_type: form.pricing_type,
        price,
        currency: form.currency,
        cover_url: form.cover_url || null,
        features: features.split("\n").map((line) => line.trim()).filter(Boolean),
        requirements: parsedRequirements(),
        featured: form.featured,
        published: publish,
      };

      let softwareId = initial?.id;

      if (editing) {
        const { error } = await supabase.from("software").update(payload).eq("id", softwareId!);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("software")
          .insert({ ...payload, owner_id: userData.user?.id ?? null })
          .select("id")
          .single();
        if (error) throw error;
        softwareId = data.id;

        if (version.version) {
          await supabase.from("software_versions").insert({
            software_id: softwareId,
            version: version.version,
            release_date: version.release_date,
            release_notes: version.release_notes || null,
            file_size: version.file_size || null,
            file_path: version.file_path || null,
            is_current: true,
          });
        }
      }

      const newShots = screenshots.filter((shot) => !shot.id);
      if (softwareId && newShots.length) {
        await supabase.from("software_screenshots").insert(
          newShots.map((shot, index) => ({
            software_id: softwareId!,
            image_url: shot.image_url,
            caption: shot.caption || null,
            sort_order: screenshots.length - newShots.length + index,
          })),
        );
      }

      toast.success(publish ? "Software published." : "Draft saved.");
      void navigate({ to: "/admin/software" });
    } catch (error) {
      const message = String((error as { message?: string })?.message ?? "");
      toast.error(
        message.includes("duplicate")
          ? "That slug is already used by another application."
          : "We couldn't save this software. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Basic information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Software name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                  slug: editing || prev.slug ? prev.slug : slugify(event.target.value),
                }))
              }
            />
            {errors["name"] ? <p className="text-xs text-destructive">{errors["name"]}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
            {errors["slug"] ? <p className="text-xs text-destructive">{errors["slug"]}</p> : null}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="short">Short description</Label>
          <Input
            id="short"
            maxLength={200}
            value={form.short_description}
            onChange={(event) => setForm((prev) => ({ ...prev, short_description: event.target.value }))}
          />
          {errors["short_description"] ? (
            <p className="text-xs text-destructive">{errors["short_description"]}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Full description</Label>
          <Textarea
            id="description"
            rows={7}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          {errors["description"] ? (
            <p className="text-xs text-destructive">{errors["description"]}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={form.platform} onValueChange={(value) => setForm((prev) => ({ ...prev, platform: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Pricing type</Label>
            <Select
              value={form.pricing_type}
              onValueChange={(value) => setForm((prev) => ({ ...prev, pricing_type: value }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.pricing_type === "paid" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                />
                {errors["price"] ? <p className="text-xs text-destructive">{errors["price"]}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  maxLength={3}
                  value={form.currency}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))
                  }
                />
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Details</h2>
        <div className="space-y-2">
          <Label htmlFor="features">Features (one per line)</Label>
          <Textarea id="features" rows={5} value={features} onChange={(event) => setFeatures(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requirements">Requirements (one per line, e.g. `RAM: 4 GB`)</Label>
          <Textarea
            id="requirements"
            rows={5}
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
          />
        </div>
      </section>

      {!editing ? (
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">First version</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={version.version}
                onChange={(event) => setVersion((prev) => ({ ...prev, version: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="release-date">Release date</Label>
              <Input
                id="release-date"
                type="date"
                value={version.release_date}
                onChange={(event) => setVersion((prev) => ({ ...prev, release_date: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-size">File size</Label>
              <Input
                id="file-size"
                value={version.file_size}
                placeholder="e.g. 48 MB"
                onChange={(event) => setVersion((prev) => ({ ...prev, file_size: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Release notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={version.release_notes}
              onChange={(event) => setVersion((prev) => ({ ...prev, release_notes: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Installer file</Label>
            <label className="inline-flex">
              <input type="file" className="hidden" onChange={(event) => void handleUpload(event, "installer")} />
              <span className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-accent">
                {uploading === "installer" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="mr-2 h-4 w-4" aria-hidden />
                )}
                Upload installer
              </span>
            </label>
            {version.file_path ? (
              <p className="text-xs text-muted-foreground">Uploaded: {version.file_path}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Media</h2>
        <div className="flex flex-wrap items-center gap-4">
          <AppImage reference={form.cover_url} alt="Cover preview" className="h-24 w-36 rounded-md object-cover" />
          <label className="inline-flex">
            <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleUpload(event, "cover")} />
            <span className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-accent">
              {uploading === "cover" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="mr-2 h-4 w-4" aria-hidden />
              )}
              Upload cover image
            </span>
          </label>
        </div>

        <div>
          <Label>Screenshots</Label>
          <div className="mt-3 flex flex-wrap gap-3">
            {screenshots.map((shot, index) => (
              <div key={shot.image_url} className="relative">
                <AppImage
                  reference={shot.image_url}
                  alt={shot.caption || `Screenshot ${index + 1}`}
                  className="h-20 w-32 rounded-md object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute -right-2 -top-2 h-6 w-6"
                  aria-label="Remove screenshot"
                  onClick={async () => {
                    if (shot.id) await supabase.from("software_screenshots").delete().eq("id", shot.id);
                    setScreenshots((prev) => prev.filter((item) => item.image_url !== shot.image_url));
                  }}
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                </Button>
              </div>
            ))}
            <label className="inline-flex">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleUpload(event, "screenshot")}
              />
              <span className="flex h-20 w-32 cursor-pointer items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground hover:bg-accent">
                {uploading === "screenshot" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  "Add"
                )}
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Publishing</h2>
        <label className="flex items-center gap-3 text-sm">
          <Checkbox
            checked={form.featured}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, featured: Boolean(checked) }))}
          />
          Feature this software on the home page
        </label>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" disabled={busy} onClick={() => void submit(false)}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Save draft
          </Button>
          <Button disabled={busy} onClick={() => void submit(true)}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {editing ? "Save and publish" : "Publish software"}
          </Button>
        </div>
      </section>
    </div>
  );
}

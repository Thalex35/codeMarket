import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CodeMarket admin" },
      { name: "description", content: "Configure CodeMarket branding, contact details and currency." },
      { property: "og:title", content: "Settings — CodeMarket admin" },
      { property: "og:description", content: "Configure CodeMarket branding and contact details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSettings,
});

const FIELDS: { key: string; label: string; hint?: string; multiline?: boolean }[] = [
  { key: "site_name", label: "Platform name" },
  { key: "site_description", label: "Site description", multiline: true },
  { key: "logo_url", label: "Logo URL" },
  { key: "contact_email", label: "Contact email" },
  { key: "whatsapp_number", label: "WhatsApp number", hint: "Used for paid software purchases, e.g. +254712345678" },
  { key: "currency", label: "Default currency" },
  { key: "facebook_url", label: "Facebook link" },
  { key: "twitter_url", label: "X / Twitter link" },
  { key: "linkedin_url", label: "LinkedIn link" },
  { key: "github_url", label: "GitHub link" },
];

function AdminSettings() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.key] = row.value ?? "";
      return map;
    },
  });

  useEffect(() => {
    if (data) setValues(data);
  }, [data]);

  async function save() {
    setSaving(true);
    try {
      const rows = FIELDS.map((field) => ({ key: field.key, value: values[field.key] ?? "" }));
      const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Settings saved.");
    } catch {
      toast.error("We couldn't save the settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Platform identity, contact details and currency.</p>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-5">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            {field.multiline ? (
              <Textarea
                id={field.key}
                rows={3}
                value={values[field.key] ?? ""}
                onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
              />
            ) : (
              <Input
                id={field.key}
                value={values[field.key] ?? ""}
                onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
              />
            )}
            {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
          </div>
        ))}
        <Button disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Save settings
        </Button>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppImage } from "@/components/AppImage";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — CodeMarket" },
      { name: "description", content: "Manage your CodeMarket account details and avatar." },
      { property: "og:title", content: "Your profile — CodeMarket" },
      { property: "og:description", content: "Manage your CodeMarket account details and avatar." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (fullName.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("We couldn't save your profile. Please try again.");
      return;
    }
    await refreshProfile();
    toast.success("Profile updated.");
  }

  async function changeAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Images must be smaller than 2 MB.");
      return;
    }
    setUploading(true);
    try {
      const extension = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const reference = await uploadFile("avatars", `${user.id}/avatar.${extension}`, file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: reference })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Avatar updated.");
    } catch {
      toast.error("The upload failed. Please try again.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function sendPasswordReset() {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("We couldn't send the email. Please try again.");
      return;
    }
    toast.success("Password reset link sent to your email.");
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Your profile</h1>
        <p className="mt-2 text-muted-foreground">Manage your account details.</p>

        <div className="mt-8 flex flex-wrap items-center gap-5 rounded-xl border bg-card p-6">
          <AppImage
            reference={profile?.avatar_url}
            alt="Your avatar"
            className="h-20 w-20 rounded-full object-cover"
          />
          <div>
            <p className="font-medium">{profile?.full_name ?? "CodeMarket user"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <label className="mt-3 inline-flex">
              <input type="file" accept="image/*" className="hidden" onChange={changeAvatar} />
              <span className="inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="mr-2 h-4 w-4" aria-hidden />
                )}
                Change avatar
              </span>
            </label>
          </div>
        </div>

        <form onSubmit={save} className="mt-6 space-y-4 rounded-xl border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Save changes
            </Button>
            <Button type="button" variant="outline" onClick={() => void sendPasswordReset()}>
              Change password
            </Button>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Calendar,
  Check,
  Download,
  HardDrive,
  Heart,
  Loader2,
  MessageCircle,
  Monitor,
  PackageSearch,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import { AppImage } from "@/components/AppImage";
import { EmptyState } from "@/components/EmptyState";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { buildWhatsAppLink, useSiteSettings } from "@/hooks/useSiteSettings";
import { useScreenshots, useSoftwareBySlug, useSoftwareVersions } from "@/hooks/useSoftware";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { formatCount, formatDate, formatPrice } from "@/lib/catalog";
import { getSoftwareMeta } from "@/lib/public.functions";

export const Route = createFileRoute("/software/$slug")({
  loader: ({ params }) => getSoftwareMeta({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Software not found — CodeMarket" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.name} — ${loaderData.category} software on CodeMarket`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.short_description },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.short_description },
      ],
    };
  },
  errorComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          icon={PackageSearch}
          title="This page didn't load"
          description="Please refresh the page or go back to the catalog."
          action={
            <Button asChild>
              <Link to="/software">Back to catalog</Link>
            </Button>
          }
        />
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState icon={PackageSearch} title="Software not found" />
      </div>
    </SiteLayout>
  ),
  component: SoftwareDetail,
});

function SoftwareDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { settings } = useSiteSettings();

  const { data: software, isLoading } = useSoftwareBySlug(slug);
  const { data: versions = [] } = useSoftwareVersions(software?.id);
  const { data: screenshots = [] } = useScreenshots(software?.id);

  const [authPrompt, setAuthPrompt] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeShot, setActiveShot] = useState(0);

  const currentVersion = versions.find((version) => version.is_current) ?? versions[0] ?? null;

  const { data: liked } = useQuery({
    enabled: Boolean(user && software),
    queryKey: ["like", software?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("software_id", software!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return Boolean(data);
    },
  });

  const { data: paidAccess } = useQuery({
    enabled: Boolean(user && software?.pricing_type === "paid"),
    queryKey: ["purchase-access", software?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("purchases")
        .select("id, status")
        .eq("software_id", software!.id)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return {
        paid: (data ?? []).some((row) => row.status === "paid"),
        pending: (data ?? []).some((row) => row.status === "pending"),
      };
    },
  });

  useEffect(() => {
    if (software) trackEvent("software_view", { softwareId: software.id });
  }, [software?.id]);

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </SiteLayout>
    );
  }

  if (!software || !software.published || software.archived) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-20">
          <EmptyState
            icon={PackageSearch}
            title="Software not found"
            description="This application is not available."
            action={
              <Button asChild>
                <Link to="/software">Back to catalog</Link>
              </Button>
            }
          />
        </div>
      </SiteLayout>
    );
  }

  const isPaid = software.pricing_type === "paid";

  function requireAuth() {
    if (user) return true;
    setAuthPrompt(true);
    return false;
  }

  async function toggleLike() {
    if (!requireAuth() || !software) return;
    setBusy(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("software_id", software.id)
          .eq("user_id", user!.id);
        if (error) throw error;
        trackEvent("unlike", { softwareId: software.id });
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ software_id: software.id, user_id: user!.id });
        if (error) throw error;
        trackEvent("like", { softwareId: software.id });
      }
      await queryClient.invalidateQueries({ queryKey: ["like", software.id, user!.id] });
      await queryClient.invalidateQueries({ queryKey: ["software"] });
    } catch {
      toast.error("We couldn't update your like. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function startDownload() {
    if (!requireAuth() || !software) return;
    if (isPaid && !paidAccess?.paid) {
      setBuyOpen(true);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("downloads").insert({
        software_id: software.id,
        user_id: user!.id,
        version_id: currentVersion?.id ?? null,
      });
      if (error) throw error;
      trackEvent("download", { softwareId: software.id, metadata: { version: currentVersion?.version } });
      await queryClient.invalidateQueries({ queryKey: ["software"] });

      if (currentVersion?.file_path) {
        const [bucket, ...rest] = currentVersion.file_path.split("/");
        const { data, error: fileError } = await supabase.storage
          .from(bucket!)
          .createSignedUrl(rest.join("/"), 120, { download: true });
        if (fileError || !data?.signedUrl) throw fileError ?? new Error("no url");
        window.location.href = data.signedUrl;
        toast.success("Your download is starting.");
      } else {
        toast.info(
          "This demo listing has no installer attached yet. Your download has been recorded.",
        );
      }
    } catch {
      toast.error("The download failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function requestPurchase() {
    if (!requireAuth() || !software) return;
    setBusy(true);
    try {
      if (!paidAccess?.pending && !paidAccess?.paid) {
        const { error } = await supabase.from("purchases").insert({
          software_id: software.id,
          user_id: user!.id,
          amount: software.price,
          currency: software.currency,
          status: "pending",
          payment_method: "whatsapp",
        });
        if (error) throw error;
      }
      trackEvent("purchase_request", { softwareId: software.id });
      await queryClient.invalidateQueries({ queryKey: ["purchase-access", software.id, user!.id] });

      const number = settings["whatsapp_number"];
      if (!number) {
        toast.info("Your request was saved. The CodeMarket team will contact you by email.");
        return;
      }
      const message = `Hello CodeMarket, I would like to buy ${software.name} (version ${
        currentVersion?.version ?? "latest"
      }) for ${formatPrice(software.price, software.currency)}. My name is ${
        user!.user_metadata?.["full_name"] ?? user!.email
      }.`;
      window.open(buildWhatsAppLink(number, message), "_blank", "noopener,noreferrer");
    } catch {
      toast.error("We couldn't save your request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const requirements = software.requirements ?? {};

  return (
    <SiteLayout>
      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="overflow-hidden rounded-xl border bg-secondary">
            <AppImage
              reference={software.cover_url}
              alt={`${software.name} cover image`}
              eager
              className="aspect-[16/10] w-full object-cover"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{software.category}</Badge>
              <Badge variant="outline" className="gap-1">
                <Monitor className="h-3 w-3" aria-hidden /> {software.platform}
              </Badge>
              {currentVersion ? <Badge variant="outline">v{currentVersion.version}</Badge> : null}
              <Badge variant={isPaid ? "default" : "secondary"}>
                {isPaid ? formatPrice(software.price, software.currency) : "Free"}
              </Badge>
            </div>

            <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{software.name}</h1>
            <p className="mt-3 text-muted-foreground">{software.short_description}</p>

            <div className="mt-5 flex gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" aria-hidden /> {formatCount(software.like_count)} likes
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-4 w-4" aria-hidden /> {formatCount(software.download_count)}{" "}
                downloads
              </span>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {isPaid && !paidAccess?.paid ? (
                <Button size="lg" disabled={busy} onClick={() => (user ? setBuyOpen(true) : setAuthPrompt(true))}>
                  Get this software — {formatPrice(software.price, software.currency)}
                </Button>
              ) : (
                <Button size="lg" disabled={busy} onClick={() => void startDownload()}>
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  {isPaid ? "Download" : "Download free"}
                </Button>
              )}

              <Button
                size="lg"
                variant={liked ? "secondary" : "outline"}
                disabled={busy}
                onClick={() => void toggleLike()}
              >
                <Heart className={`mr-2 h-4 w-4 ${liked ? "fill-current text-brand" : ""}`} aria-hidden />
                {liked ? "Liked" : "Like"}
              </Button>
            </div>

            {isPaid && paidAccess?.pending && !paidAccess.paid ? (
              <p className="mt-4 rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
                Your purchase request is pending confirmation. You'll get download access as soon as
                the payment is confirmed.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-xl font-semibold">About this software</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
              {software.description}
            </p>
          </section>

          {software.features.length ? (
            <section>
              <h2 className="font-display text-xl font-semibold">Features</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {software.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {screenshots.length ? (
            <section>
              <h2 className="font-display text-xl font-semibold">Screenshots</h2>
              <div className="mt-4 overflow-hidden rounded-xl border bg-secondary">
                <AppImage
                  reference={screenshots[activeShot]?.image_url}
                  alt={screenshots[activeShot]?.caption ?? `${software.name} screenshot`}
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {screenshots.map((shot, index) => (
                  <button
                    key={shot.id}
                    type="button"
                    onClick={() => setActiveShot(index)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border ${
                      index === activeShot ? "border-primary ring-2 ring-ring/40" : ""
                    }`}
                    aria-label={shot.caption ?? `Screenshot ${index + 1}`}
                  >
                    <AppImage
                      reference={shot.image_url}
                      alt={shot.caption ?? `${software.name} screenshot ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {versions.length > 1 ? (
            <section>
              <h2 className="font-display text-xl font-semibold">Version history</h2>
              <ul className="mt-4 space-y-3">
                {versions.map((version) => (
                  <li key={version.id} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        v{version.version}{" "}
                        {version.is_current ? (
                          <Badge variant="secondary" className="ml-1">
                            Current
                          </Badge>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(version.release_date)} · {version.file_size ?? "—"}
                      </span>
                    </div>
                    {version.release_notes ? (
                      <p className="mt-2 text-sm text-muted-foreground">{version.release_notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-display text-base font-semibold">Current version</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-4 w-4" aria-hidden /> Version
                </dt>
                <dd className="font-medium">{currentVersion?.version ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" aria-hidden /> Released
                </dt>
                <dd className="font-medium">{formatDate(currentVersion?.release_date)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <HardDrive className="h-4 w-4" aria-hidden /> File size
                </dt>
                <dd className="font-medium">{currentVersion?.file_size ?? "—"}</dd>
              </div>
            </dl>
            {currentVersion?.release_notes ? (
              <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
                {currentVersion.release_notes}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-display text-base font-semibold">Requirements</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Platform</dt>
                <dd className="text-right font-medium">{software.platform}</dd>
              </div>
              {Object.entries(requirements).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <dt className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}</dt>
                  <dd className="text-right font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>

      <Dialog open={authPrompt} onOpenChange={setAuthPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in to continue</DialogTitle>
            <DialogDescription>
              Create an account or sign in to download this software.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              onClick={() =>
                navigate({
                  to: "/auth",
                  search: { mode: "login", redirect: `/software/${software.slug}` },
                })
              }
            >
              Login
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate({
                  to: "/auth",
                  search: { mode: "signup", redirect: `/software/${software.slug}` },
                })
              }
            >
              Create account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {software.name} — {formatPrice(software.price, software.currency)}
            </DialogTitle>
            <DialogDescription>
              This software is available for purchase. Contact us on WhatsApp to complete your
              purchase. Your request is saved so we can confirm your payment and unlock the download.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button disabled={busy} onClick={() => void requestPurchase()}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
              )}
              Continue on WhatsApp
            </Button>
            <Button variant="outline" onClick={() => setBuyOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}

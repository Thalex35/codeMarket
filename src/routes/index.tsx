import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight,
  Boxes,
  Briefcase,
  Church,
  Clapperboard,
  Download,
  GraduationCap,
  HeartPulse,
  ListChecks,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { SoftwareCard, SoftwareCardSkeleton } from "@/components/software/SoftwareCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePublishedSoftware } from "@/hooks/useSoftware";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CodeMarket — Discover software built to make work easier" },
      {
        name: "description",
        content:
          "Explore practical desktop applications for schools, clinics, churches and small businesses. Download free tools or request paid software in minutes.",
      },
      { property: "og:title", content: "CodeMarket — Discover software built to make work easier" },
      {
        property: "og:description",
        content:
          "Explore practical desktop applications for schools, clinics, churches and small businesses.",
      },
    ],
  }),
  component: Home,
});

const CATEGORY_TILES = [
  { name: "Education", icon: GraduationCap },
  { name: "Business", icon: Briefcase },
  { name: "Productivity", icon: ListChecks },
  { name: "Healthcare", icon: HeartPulse },
  { name: "Church", icon: Church },
  { name: "Entertainment", icon: Clapperboard },
  { name: "Other", icon: Boxes },
];

const REASONS = [
  {
    icon: Sparkles,
    title: "Practical software",
    body: "Every application solves a concrete problem for real teams, not a demo use case.",
  },
  {
    icon: Search,
    title: "Easy discovery",
    body: "Search, filter and compare applications by category, platform and price.",
  },
  {
    icon: Download,
    title: "Simple downloads",
    body: "Create an account once and get the current version with a single click.",
  },
  {
    icon: RefreshCw,
    title: "Regular updates",
    body: "Version history, release notes and file sizes are published for every release.",
  },
];

function Section({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
          {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Home() {
  const { data: all, isLoading } = usePublishedSoftware();

  useEffect(() => {
    trackEvent("page_view", { metadata: { path: "/" } });
  }, []);

  const featured = (all ?? []).filter((item) => item.featured).slice(0, 3);
  const popular = [...(all ?? [])].sort((a, b) => b.download_count - a.download_count).slice(0, 3);
  const recent = [...(all ?? [])]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 3);

  const skeletons = (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <SoftwareCardSkeleton key={index} />
      ))}
    </div>
  );

  return (
    <SiteLayout>
      <section className="hero-surface relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <Badge className="bg-white/10 text-ink-foreground hover:bg-white/15">
              Discover. Download. Build.
            </Badge>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Discover software built to make work easier.
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg">
              Explore practical applications designed to solve real-world problems and make everyday
              work simpler.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/software">
                  Explore software <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/25 bg-transparent text-ink-foreground hover:bg-white/10 hover:text-ink-foreground"
              >
                <Link to="/about">About CodeMarket</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-white/70">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" aria-hidden /> Verified publisher
              </span>
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" aria-hidden /> Free and paid applications
              </span>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute inset-0 rounded-3xl bg-white/5 backdrop-blur" />
            <div className="relative space-y-4 p-8">
              {CATEGORY_TILES.slice(0, 4).map((tile) => (
                <Link
                  key={tile.name}
                  to="/software"
                  search={{ category: tile.name, q: undefined, platform: undefined, pricing: undefined, sort: undefined }}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition-colors hover:bg-white/10"
                >
                  <tile.icon className="h-5 w-5" aria-hidden />
                  {tile.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Section
        title="Featured software"
        description="Hand-picked applications from the CodeMarket catalog."
        action={
          <Button asChild variant="ghost">
            <Link to="/software">
              Browse all <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        }
      >
        {isLoading ? (
          skeletons
        ) : featured.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((item) => (
              <SoftwareCard key={item.id} software={item} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Sparkles} title="No featured software yet." />
        )}
      </Section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-2xl font-bold">Browse by category</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {CATEGORY_TILES.map((tile) => (
              <Link
                key={tile.name}
                to="/software"
                search={{ category: tile.name, q: undefined, platform: undefined, pricing: undefined, sort: undefined }}
                className="flex flex-col items-center gap-2 rounded-xl border bg-background px-3 py-5 text-center text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                <tile.icon className="h-5 w-5" aria-hidden />
                {tile.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Section title="Popular software" description="The most downloaded applications right now.">
        {isLoading ? (
          skeletons
        ) : popular.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((item) => (
              <SoftwareCard key={item.id} software={item} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Download} title="No software available yet." />
        )}
      </Section>

      <Section title="Recently added" description="The newest releases published on CodeMarket.">
        {isLoading ? (
          skeletons
        ) : recent.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((item) => (
              <SoftwareCard key={item.id} software={item} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Sparkles} title="No software available yet." />
        )}
      </Section>

      <section className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Why CodeMarket?</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map((reason) => (
              <div key={reason.title} className="rounded-xl border bg-background p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                  <reason.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold">{reason.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{reason.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="hero-surface flex flex-col items-start justify-between gap-6 rounded-2xl px-8 py-12 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Ready to find your next tool?
            </h2>
            <p className="mt-2 max-w-xl text-white/75">
              Create a free account to download software, keep a library of your tools and follow new
              releases.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/software">Explore software</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/25 bg-transparent text-ink-foreground hover:bg-white/10 hover:text-ink-foreground"
            >
              <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                Create account
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

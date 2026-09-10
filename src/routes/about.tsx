import { createFileRoute, Link } from "@tanstack/react-router";
import { Code2, Compass, Rocket, ShieldCheck } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About CodeMarket — software built to solve real problems" },
      {
        name: "description",
        content:
          "CodeMarket is a software catalog built by a developer who ships practical applications for schools, clinics, churches and small businesses.",
      },
      { property: "og:title", content: "About CodeMarket" },
      {
        property: "og:description",
        content: "The story, mission and technology behind the CodeMarket software catalog.",
      },
    ],
  }),
  component: About,
});

const OFFERS = [
  { icon: Compass, title: "Easy discovery", body: "A clear catalog with search, filters and honest information about every release." },
  { icon: ShieldCheck, title: "Trustworthy downloads", body: "Accounts, download history and version tracking so you always know what you installed." },
  { icon: Rocket, title: "Continuous improvement", body: "Applications evolve with real feedback from the teams that use them daily." },
  { icon: Code2, title: "Modern engineering", body: "Built with React, TypeScript and a secure cloud backend with strict data rules." },
];

function About() {
  return (
    <SiteLayout>
      <section className="hero-surface">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">About CodeMarket</h1>
          <p className="mt-5 text-lg text-white/75">
            CodeMarket is a home for practical software: applications built to remove friction from
            everyday work, published in one clean, dependable place.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-14 sm:px-6">
        <section>
          <h2 className="font-display text-2xl font-bold">About the creator</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            CodeMarket is created and maintained by an independent developer who builds management
            applications for schools, dental clinics, churches and small businesses. Each project
            starts with a real problem observed on the ground — attendance registers on paper,
            appointments lost in notebooks, stock counted from memory — and turns into a focused
            desktop application that a small team can actually run every day.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold">Mission</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Make dependable software easy to find, easy to try and easy to keep updated — without
            complicated licensing, noisy marketing or hidden costs.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold">What CodeMarket offers</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {OFFERS.map((offer) => (
              <div key={offer.title} className="rounded-xl border bg-card p-5">
                <offer.icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-3 font-display text-base font-semibold">{offer.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{offer.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold">Projects in the catalog</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            The current catalog includes school management, church children's ministry management,
            productivity tools, dental clinic management, inventory tracking and media tools — with
            new releases published regularly.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/software">Explore the catalog</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Contact CodeMarket</Link>
            </Button>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

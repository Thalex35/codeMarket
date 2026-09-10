import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PackageSearch, Search } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { SoftwareCard, SoftwareCardSkeleton } from "@/components/software/SoftwareCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePublishedSoftware } from "@/hooks/useSoftware";
import { CATEGORIES, PLATFORMS } from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics";

type CatalogSearch = {
  q?: string | undefined;
  category?: string | undefined;
  platform?: string | undefined;
  pricing?: string | undefined;
  sort?: string | undefined;
};

export const Route = createFileRoute("/software/")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    category: typeof search["category"] === "string" ? search["category"] : undefined,
    platform: typeof search["platform"] === "string" ? search["platform"] : undefined,
    pricing: typeof search["pricing"] === "string" ? search["pricing"] : undefined,
    sort: typeof search["sort"] === "string" ? search["sort"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Software catalog — CodeMarket" },
      {
        name: "description",
        content:
          "Search and filter the full CodeMarket catalog by category, platform and price. Free and paid desktop applications.",
      },
      { property: "og:title", content: "Software catalog — CodeMarket" },
      {
        property: "og:description",
        content: "Search and filter the full CodeMarket catalog by category, platform and price.",
      },
    ],
  }),
  component: Catalog,
});

const PAGE_SIZE = 9;

function Catalog() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/software/" });
  const [term, setTerm] = useState(search.q ?? "");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    trackEvent("page_view", { metadata: { path: "/software" } });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void navigate({ search: (prev: CatalogSearch) => ({ ...prev, q: term || undefined }) });
    }, 350);
    return () => clearTimeout(timeout);
  }, [term, navigate]);

  const { data, isLoading, isError } = usePublishedSoftware({
    search: search.q ?? "",
    category: search.category ?? "all",
    platform: search.platform ?? "all",
    pricing: search.pricing ?? "all",
    sort: search.sort ?? "newest",
  });

  const items = data ?? [];
  const shown = items.slice(0, visible);

  function update(key: keyof CatalogSearch, value: string) {
    setVisible(PAGE_SIZE);
    void navigate({
      search: (prev: CatalogSearch) => ({ ...prev, [key]: value === "all" ? undefined : value }),
    });
  }

  return (
    <SiteLayout>
      <div className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h1 className="font-display text-3xl font-bold">Software catalog</h1>
          <p className="mt-2 text-muted-foreground">
            {items.length} application{items.length === 1 ? "" : "s"} available on CodeMarket.
          </p>

          <div className="mt-6 grid gap-3 lg:grid-cols-[2fr_repeat(4,1fr)]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search by name, description or category"
                className="pl-9"
                aria-label="Search software"
              />
            </div>

            <Select value={search.category ?? "all"} onValueChange={(value) => update("category", value)}>
              <SelectTrigger aria-label="Category"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={search.platform ?? "all"} onValueChange={(value) => update("platform", value)}>
              <SelectTrigger aria-label="Platform"><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {PLATFORMS.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={search.pricing ?? "all"} onValueChange={(value) => update("pricing", value)}>
              <SelectTrigger aria-label="Price"><SelectValue placeholder="Price" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Free & paid</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>

            <Select value={search.sort ?? "newest"} onValueChange={(value) => update("sort", value)}>
              <SelectTrigger aria-label="Sort by"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="downloads">Most downloaded</SelectItem>
                <SelectItem value="likes">Most liked</SelectItem>
                <SelectItem value="az">A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SoftwareCardSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={PackageSearch}
            title="We couldn't load the catalog"
            description="Please check your connection and try again."
          />
        ) : shown.length ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((item) => (
                <SoftwareCard key={item.id} software={item} />
              ))}
            </div>
            {visible < items.length ? (
              <div className="mt-10 flex justify-center">
                <Button variant="outline" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            icon={PackageSearch}
            title="No software matches your search."
            description="Try a different keyword or clear the filters."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setTerm("");
                  void navigate({ search: () => ({}) });
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
      </div>
    </SiteLayout>
  );
}

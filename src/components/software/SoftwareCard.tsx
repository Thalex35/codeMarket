import { Link } from "@tanstack/react-router";
import { Download, Heart, Monitor } from "lucide-react";

import { AppImage } from "@/components/AppImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount, formatPrice, type Software } from "@/lib/catalog";

export function SoftwareCard({ software }: { software: Software }) {
  const isPaid = software.pricing_type === "paid";

  return (
    <article className="card-elevated hover:card-elevated-hover group flex h-full flex-col overflow-hidden rounded-xl border bg-card">
      <Link
        to="/software/$slug"
        params={{ slug: software.slug }}
        className="block aspect-[16/10] overflow-hidden bg-secondary"
      >
        <AppImage
          reference={software.cover_url}
          alt={`${software.name} cover`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold">{software.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {software.short_description}
            </p>
          </div>
          <Badge variant={isPaid ? "default" : "secondary"} className="shrink-0">
            {isPaid ? formatPrice(software.price, software.currency) : "Free"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline">{software.category}</Badge>
          <Badge variant="outline" className="gap-1">
            <Monitor className="h-3 w-3" aria-hidden />
            {software.platform}
          </Badge>
        </div>

        <div className="mt-auto flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" aria-hidden /> {formatCount(software.like_count)}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3.5 w-3.5" aria-hidden /> {formatCount(software.download_count)}
            </span>
          </span>
          <Button asChild size="sm" variant="secondary">
            <Link to="/software/$slug" params={{ slug: software.slug }}>
              View software
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function SoftwareCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

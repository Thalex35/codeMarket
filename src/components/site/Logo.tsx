import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useSiteSettings } from "@/hooks/useSiteSettings";
import { resolveImageUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  const { settings } = useSiteSettings();
  const [imageUrl, setImageUrl] = useState("/favicon.png");

  useEffect(() => {
    let active = true;
    const reference = settings["logo_url"];
    if (!reference) {
      setImageUrl("/favicon.png");
      return () => {
        active = false;
      };
    }

    resolveImageUrl(reference).then((resolved) => {
      if (active) setImageUrl(resolved ?? "/favicon.png");
    });
    return () => {
      active = false;
    };
  }, [settings]);

  return (
    <Link to="/" className={cn("flex items-center gap-2", className)} aria-label="CodeMarket home">
      <img
        src={imageUrl}
        alt="CodeMarket logo"
        className="h-9 w-9 rounded-md object-cover"
        onError={() => setImageUrl("/favicon.png")}
      />
      <span
        className={cn(
          "font-display text-lg font-bold tracking-tight",
          inverted ? "text-ink-foreground" : "text-foreground",
        )}
      >
        Code<span className="text-brand">Market</span>
      </span>
    </Link>
  );
}

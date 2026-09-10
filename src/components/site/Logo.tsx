import { Link } from "@tanstack/react-router";

import logo from "@/assets/codemarket-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2", className)} aria-label="CodeMarket home">
      <img src={logo.url} alt="CodeMarket logo" className="h-9 w-9 rounded-md object-cover" />
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

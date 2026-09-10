import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  Download,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  User as UserIcon,
} from "lucide-react";

import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/software", label: "Software" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

function NavLinks({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  return (
    <nav className={cn("flex gap-1", className)}>
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: item.to === "/" }}
          className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function AccountMenu() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth" search={{ mode: "login", redirect: undefined }}>
            Login
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
            Get Started
          </Link>
        </Button>
      </div>
    );
  }

  const initials = (profile?.full_name ?? user.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </span>
          <span className="hidden max-w-28 truncate sm:inline">
            {profile?.full_name ?? user.email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link to="/admin/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden /> Admin dashboard
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserIcon className="mr-2 h-4 w-4" aria-hidden /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/downloads">
            <Download className="mr-2 h-4 w-4" aria-hidden /> My downloads
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/likes">
            <Heart className="mr-2 h-4 w-4" aria-hidden /> My likes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/purchases">
            <Receipt className="mr-2 h-4 w-4" aria-hidden /> My purchases
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Footer() {
  const { settings } = useSiteSettings();
  const socials = [
    { href: settings["facebook_url"], label: "Facebook" },
    { href: settings["twitter_url"], label: "X" },
    { href: settings["linkedin_url"], label: "LinkedIn" },
    { href: settings["github_url"], label: "GitHub" },
  ].filter((item) => item.href);

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Discover. Download. Build. Practical software made to solve real problems.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Get in touch</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {settings["contact_email"] ? (
              <li>
                <a href={`mailto:${settings["contact_email"]}`} className="hover:text-foreground">
                  {settings["contact_email"]}
                </a>
              </li>
            ) : null}
            {settings["whatsapp_number"] ? <li>WhatsApp {settings["whatsapp_number"]}</li> : null}
            {socials.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-foreground"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CodeMarket. All rights reserved.
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background" key={pathname === "" ? "root" : undefined}>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <NavLinks className="hidden md:flex" />
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <AccountMenu />
            </div>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="mt-6 flex flex-col gap-6">
                  <NavLinks className="flex-col items-start" onNavigate={() => setOpen(false)} />
                  <AccountMenu />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

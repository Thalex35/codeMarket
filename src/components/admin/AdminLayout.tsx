import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Download,
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  PlusCircle,
  Settings,
  ShoppingBag,
  Moon,
  Sun,
  Users,
  Wifi,
} from "lucide-react";

import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    label: "Main",
    items: [{ to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Software",
    items: [
      { to: "/admin/software", label: "All software", icon: Package },
      { to: "/admin/software/new", label: "Add software", icon: PlusCircle },
    ],
  },
  {
    label: "Activity",
    items: [
      { to: "/admin/downloads", label: "Downloads", icon: Download },
      { to: "/admin/likes", label: "Likes", icon: Heart },
      { to: "/admin/purchases", label: "Purchases", icon: ShoppingBag },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/messages", label: "Messages", icon: Mail },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/45">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active =
                pathname === item.to ||
                (item.to !== "/admin/software/new" &&
                  item.to !== "/admin/dashboard" &&
                  pathname.startsWith(`${item.to}/`));
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [darkTheme, setDarkTheme] = useState(true);
  const { user, isAdmin, isActive, loading, onlineUserIds, presenceStatus } = useAuth();

  useEffect(() => {
    setDarkTheme(window.localStorage.getItem("codemarket-admin-theme") !== "light");
  }, []);

  function toggleTheme() {
    setDarkTheme((current) => {
      const next = !current;
      window.localStorage.setItem("codemarket-admin-theme", next ? "dark" : "light");
      return next;
    });
  }

  if (loading || !user || !isAdmin || !isActive) {
    return null;
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div
      className={`admin-shell ${darkTheme ? "dark" : "light"} flex min-h-screen w-full bg-background text-foreground`}
    >
      <aside className="admin-sidebar hidden w-72 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-20 items-center border-b border-sidebar-border px-6">
          <Logo inverted />
        </div>
        <div className="mx-4 mt-5 rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-sidebar-foreground/70">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                presenceStatus === "connected" ? "bg-success" : "bg-warning",
              )}
            />
            {presenceStatus === "connected" ? "Live operations" : "Connecting presence"}
          </div>
          <p className="mt-2 font-display text-2xl font-semibold text-sidebar-foreground">
            {onlineUserIds.length}
          </p>
          <p className="text-xs text-sidebar-foreground/50">users online now</p>
        </div>
        <NavLinks />
        <div className="border-t border-sidebar-border p-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => void signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden />
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open admin menu">
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col p-0">
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              <div className="flex h-16 items-center border-b px-5">
                <Logo />
              </div>
              <NavLinks onNavigate={() => setOpen(false)} />
              <div className="border-t p-3">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => void signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Logo />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={toggleTheme}
            aria-label={darkTheme ? "Switch to light theme" : "Switch to dark theme"}
            title={darkTheme ? "Switch to light theme" : "Switch to dark theme"}
          >
            {darkTheme ? (
              <Sun className="h-4 w-4" aria-hidden />
            ) : (
              <Moon className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </header>

        <header className="hidden h-20 items-center justify-between border-b bg-card px-8 lg:flex">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Control center
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Run CodeMarket with clarity.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
              <Wifi className="h-3.5 w-3.5 text-success" aria-hidden />
              {presenceStatus === "connected" ? "Realtime connected" : "Realtime reconnecting"}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label={darkTheme ? "Switch to light theme" : "Switch to dark theme"}
              title={darkTheme ? "Switch to light theme" : "Switch to dark theme"}
            >
              {darkTheme ? (
                <Sun className="h-4 w-4" aria-hidden />
              ) : (
                <Moon className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </div>
        </header>
        <main className="admin-content min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

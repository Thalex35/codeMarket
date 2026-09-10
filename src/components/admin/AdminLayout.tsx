import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
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
  Users,
} from "lucide-react";

import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
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
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Logo />
        </div>
        <NavLinks />
        <div className="border-t p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={() => void signOut()}>
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
                <Button variant="ghost" className="w-full justify-start" onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" aria-hidden />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Logo />
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

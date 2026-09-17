import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Circle, ShieldCheck, Users, Wifi } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/catalog";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — CodeMarket admin" },
      { name: "description", content: "Registered CodeMarket accounts and their activity." },
      { property: "og:title", content: "Users — CodeMarket admin" },
      { property: "og:description", content: "Registered CodeMarket accounts and their activity." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsers,
});

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
  role: string;
};

function AdminUsers() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, onlineUserIds, presenceStatus } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page],
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc(
        "admin_users_page" as never,
        {
          _page: page,
          _page_size: 25,
        } as never,
      );
      if (error) throw error;
      return {
        rows: (rows ?? []) as UserRow[],
        total: Number((rows?.[0] as { total_count?: number } | undefined)?.total_count ?? 0),
      };
    },
  });

  if (location.pathname !== "/admin/users") {
    return <Outlet />;
  }

  async function setStatus(id: string, status: "active" | "disabled") {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) {
      toast.error("The update failed. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(status === "active" ? "Account enabled." : "Account disabled.");
  }

  async function setRole(id: string, role: "user" | "admin") {
    const { error } = await supabase.rpc(
      "set_user_role" as never,
      {
        _user_id: id,
        _role: role,
      } as never,
    );
    if (error) {
      toast.error(error.message || "The role update failed. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(role === "admin" ? "Administrator access granted." : "User access restored.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">People</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-muted-foreground">
            Manage account access and watch the network in real time.
          </p>
        </div>
        <div
          className={`flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${
            presenceStatus === "connected"
              ? "border-success/20 bg-success/10 text-success"
              : "border-warning/20 bg-warning/10 text-warning-foreground"
          }`}
        >
          <Wifi className="h-4 w-4" aria-hidden />
          {presenceStatus === "connected"
            ? `${onlineUserIds.length} online now`
            : "Connecting live status"}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !data?.rows.length ? (
        <EmptyState icon={Users} title="No users registered yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-(--shadow-card)">
          <table className="w-full min-w-190 text-sm">
            <thead className="border-b bg-muted/35 text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Joined</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Role</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) =>
                (() => {
                  const isProtectedAdmin = row.role === "admin" && data.total <= 1;
                  return (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/25 focus:bg-muted/25 focus:outline-none"
                      onClick={() =>
                        void navigate({ to: "/admin/users/$id", params: { id: row.id } })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void navigate({ to: "/admin/users/$id", params: { id: row.id } });
                        }
                      }}
                    >
                      <td className="p-3 font-medium">
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 font-display text-sm font-bold text-primary">
                            {String(row.full_name ?? row.email ?? "U")
                              .slice(0, 1)
                              .toUpperCase()}
                            {onlineUserIds.includes(row.id) ? (
                              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
                            ) : null}
                          </span>
                          <span>{row.full_name ?? "Unnamed user"}</span>
                        </div>
                      </td>
                      <td className="p-3">{row.email}</td>
                      <td className="p-3">{formatDate(String(row.created_at))}</td>
                      <td className="p-3">
                        <Badge
                          className={
                            row.status === "active"
                              ? "border-success/20 bg-success/10 text-success"
                              : ""
                          }
                          variant={row.status === "active" ? "outline" : "destructive"}
                        >
                          <Circle className="mr-1 h-2.5 w-2.5 fill-current" aria-hidden />
                          {row.status === "active" ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={row.role === "admin" ? "default" : "outline"}
                          className={row.role === "admin" ? "bg-primary/90" : ""}
                        >
                          <ShieldCheck className="mr-1 h-3 w-3" aria-hidden />
                          {row.role === "admin" ? "Admin" : "User"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {isProtectedAdmin ? null : (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                void setStatus(
                                  row.id,
                                  row.status === "active" ? "disabled" : "active",
                                );
                              }}
                            >
                              {row.status === "active" ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              size="sm"
                              variant={row.role === "admin" ? "secondary" : "default"}
                              disabled={row.id === user?.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                void setRole(row.id, row.role === "admin" ? "user" : "admin");
                              }}
                            >
                              {row.role === "admin" ? "Make user" : "Make admin"}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })(),
              )}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > 25 ? (
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Showing page {page} of {Math.ceil(data.total / 25)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 25 >= data.total}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

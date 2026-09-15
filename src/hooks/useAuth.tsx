/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isActive: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isActive: false,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadAccount(userId: string | undefined) {
    if (!userId) {
      setProfile(null);
      setIsAdmin(false);
      setIsActive(false);
      return;
    }
    const [{ data: profileRow }, { data: adminFlag }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, status")
        .eq("id", userId)
        .maybeSingle(),
      supabase.rpc("is_admin"),
    ]);

    const nextProfile = (profileRow as Profile) ?? null;
    const active = nextProfile?.status === "active";
    setProfile(nextProfile);
    setIsAdmin(Boolean(adminFlag));
    setIsActive(active);

    if (nextProfile && !active) {
      await supabase.auth.signOut();
    }
  }

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      void loadAccount(nextSession?.user.id).finally(() => setLoading(false));
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadAccount(data.session?.user.id).finally(() => setLoading(false));
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      isActive,
      loading,
      refreshProfile: () => loadAccount(session?.user.id),
    }),
    [session, profile, isAdmin, isActive, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

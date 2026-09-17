/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: string;
};

export function shouldReloadAccountForAuthEvent(
  event: string,
  currentUserId: string | undefined,
  nextUserId: string | undefined,
) {
  if (event === "TOKEN_REFRESHED") return false;
  if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT") return true;
  return currentUserId !== nextUserId;
}

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isActive: boolean;
  loading: boolean;
  onlineUserIds: string[];
  presenceStatus: "connecting" | "connected" | "disconnected";
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isActive: false,
  loading: true,
  onlineUserIds: [],
  presenceStatus: "disconnected",
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [presenceStatus, setPresenceStatus] = useState<"connecting" | "connected" | "disconnected">(
    "disconnected",
  );

  async function loadAccount(userId: string | undefined) {
    if (!userId) {
      setProfile(null);
      setIsAdmin(false);
      setIsActive(false);
      return;
    }
    setProfile(null);
    setIsAdmin(false);
    setIsActive(false);
    await supabase.rpc("ensure_account_profile" as never);
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

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event === "TOKEN_REFRESHED") {
        sessionRef.current = nextSession;
        setSession(nextSession);
        return;
      }
      if (
        !shouldReloadAccountForAuthEvent(event, sessionRef.current?.user.id, nextSession?.user.id)
      ) {
        sessionRef.current = nextSession;
        setSession(nextSession);
        return;
      }
      setLoading(true);
      sessionRef.current = nextSession;
      setSession(nextSession);
      void loadAccount(nextSession?.user.id).finally(() => setLoading(false));
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      sessionRef.current = data.session;
      setSession(data.session);
      void loadAccount(data.session?.user.id).finally(() => setLoading(false));
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setOnlineUserIds([]);
      setPresenceStatus("disconnected");
      return;
    }

    setPresenceStatus("connecting");
    const channel = supabase.channel("codemarket-presence", {
      config: { presence: { key: userId } },
    });

    const syncPresence = () => {
      const state = channel.presenceState<{ user_id?: string }>();
      const ids = Object.entries(state).flatMap(([key, presences]) =>
        presences.map((presence) => presence.user_id ?? key),
      );
      setOnlineUserIds([...new Set(ids)]);
    };

    channel.on("presence", { event: "sync" }, syncPresence);
    channel.on("presence", { event: "join" }, syncPresence);
    channel.on("presence", { event: "leave" }, syncPresence);
    void channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: userId });
        setPresenceStatus("connected");
        syncPresence();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setPresenceStatus("disconnected");
      }
    });

    return () => {
      setOnlineUserIds([]);
      setPresenceStatus("disconnected");
      void supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      isActive,
      loading,
      onlineUserIds,
      presenceStatus,
      refreshProfile: () => loadAccount(session?.user.id),
    }),
    [session, profile, isAdmin, isActive, loading, onlineUserIds, presenceStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

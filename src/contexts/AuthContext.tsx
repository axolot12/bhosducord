import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const normalizeUsername = (authUser: User) => {
  const fromMeta = typeof authUser.user_metadata?.username === "string" ? authUser.user_metadata.username : "";
  const fromEmail = authUser.email ? authUser.email.split("@")[0] : "user";
  const base = (fromMeta || fromEmail || "user").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 24) || "user";
  return `${base}_${authUser.id.slice(0, 4)}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  const ensureProfileAndPresence = async (authUser: User, status: "online" | "offline") => {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (!existingProfile) {
      const defaultDisplayName =
        (typeof authUser.user_metadata?.display_name === "string" && authUser.user_metadata.display_name.trim()) ||
        (authUser.email ? authUser.email.split("@")[0] : "User");

      await supabase.from("profiles").insert({
        user_id: authUser.id,
        username: normalizeUsername(authUser),
        display_name: defaultDisplayName,
        email_verified: !!authUser.email_confirmed_at,
        status: status as any,
      });
      return;
    }

    await supabase
      .from("profiles")
      .update({ status: status as any, email_verified: !!authUser.email_confirmed_at })
      .eq("user_id", authUser.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);
      userRef.current = nextUser;
      setLoading(false);

      if (nextUser) {
        void ensureProfileAndPresence(nextUser, "online");
      }
    });

    supabase.auth.getSession().then(({ data: { session: restoredSession } }) => {
      setSession(restoredSession);
      const restoredUser = restoredSession?.user ?? null;
      setUser(restoredUser);
      userRef.current = restoredUser;
      setLoading(false);

      if (restoredUser) {
        void ensureProfileAndPresence(restoredUser, "online");
      }
    });

    const handleBeforeUnload = () => {
      const activeUser = userRef.current;
      if (activeUser) {
        void ensureProfileAndPresence(activeUser, "offline");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const signOut = async () => {
    const activeUser = userRef.current;
    if (activeUser) {
      await ensureProfileAndPresence(activeUser, "offline");
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

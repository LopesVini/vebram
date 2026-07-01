import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface UpdateProfileInput {
  display_name?: string;
  phone?: string;
  city?: string;
  bio?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Nome de exibição vindo de user_metadata, com fallback para o prefixo do email. */
  displayName: string;
  /** Atualiza campos em user_metadata (display_name, phone, city, bio…). */
  updateProfile: (data: UpdateProfileInput) => Promise<{ error: Error | null }>;
  /** Atualiza a senha do usuário autenticado. */
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  displayName: "",
  updateProfile: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const displayName = useMemo(() => {
    const metaName = (user?.user_metadata?.display_name as string | undefined)?.trim();
    if (metaName) return metaName;
    const emailPrefix = user?.email?.split("@")[0];
    return emailPrefix || "Usuário";
  }, [user]);

  const updateProfile = async (data: UpdateProfileInput) => {
    const { data: updated, error } = await supabase.auth.updateUser({ data });
    if (!error && updated.user) setUser(updated.user);
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user, loading, displayName, updateProfile, updatePassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

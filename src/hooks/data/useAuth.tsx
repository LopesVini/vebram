import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { fetchRole, isAdminRole } from "@/lib/roles";

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
  /** Cargo de acesso vindo de profiles.role ('admin' | 'client' | null enquanto carrega). */
  role: string | null;
  /** true quando o usuário é da equipe (cargo admin). */
  isAdmin: boolean;
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
  role: null,
  isAdmin: false,
  displayName: "",
  updateProfile: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aplica a sessão e, quando houver usuário, busca o cargo (profiles.role)
    // ANTES de liberar a tela — assim o gate de admin nunca decide sem o cargo.
    async function apply(session: Session | null) {
      setSession(session);
      setUser(session?.user ?? null);
      setRole(session?.user ? await fetchRole(session.user.id) : null);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => apply(session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => { apply(session); });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = useMemo(() => isAdminRole(role), [role]);

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
      value={{ session, user, loading, role, isAdmin, displayName, updateProfile, updatePassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

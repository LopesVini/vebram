// Papel de acesso (admin/cliente) — decidido pela coluna profiles.role,
// gravada no banco pela equipe. Não decidimos mais isso pelo texto do e-mail.
import { supabase } from "@/lib/supabase";

export type AppRole = "admin" | "client";

/** Busca o cargo do usuário no banco (profiles.role). */
export async function fetchRole(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return (data?.role as string | undefined) ?? null;
}

/**
 * Decide se é admin a partir do cargo. Mantém uma rede de segurança pelo
 * e-mail apenas quando o cargo ainda não foi gravado (role nulo) — assim
 * ninguém fica trancado para fora do HQ durante a transição.
 */
export function isAdminRole(role: string | null | undefined, email?: string | null): boolean {
  if (role === "admin") return true;
  if (role) return false; // cargo definido e não é admin → não é admin
  const e = (email ?? "").toLowerCase();
  return e.includes("@vertice");
}

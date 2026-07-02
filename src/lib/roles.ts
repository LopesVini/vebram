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
 * Decide se é admin a partir do cargo gravado no banco. O antigo
 * fallback por e-mail ("@vertice") foi removido: ele permitia que
 * qualquer conta com esse texto no e-mail entrasse no HQ. Todos os
 * perfis existentes já têm role definido.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

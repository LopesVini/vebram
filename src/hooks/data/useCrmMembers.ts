import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CrmRole } from '@/hooks/data/crmTypes';

export interface CrmMember { user_id: string; name: string; role: CrmRole; }

// Duas queries em vez de embed: não existe FK memberships->profiles (ambos
// referenciam auth.users), então PostgREST não resolve o join aninhado.
// Funciona porque os usuários do CRM são admins globais e leem todos os profiles.
// NOTA (futuro): quando existirem membros 'vendedor' não-admin, a RLS de profiles
// esconde os colegas — trocar por um RPC security definer gated por is_member_of.
export function useCrmMembers(companyId: string | null) {
  const [members, setMembers] = useState<CrmMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) { setMembers([]); setLoading(false); return; }
    setLoading(true);
    const { data: mem } = await supabase
      .from('memberships')
      .select('user_id, role')
      .eq('company_id', companyId);
    const rows = (mem as { user_id: string; role: CrmRole }[]) || [];
    if (rows.length === 0) { setMembers([]); setLoading(false); return; }
    const ids = rows.map((r) => r.user_id);
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', ids);
    const nameById: Record<string, string> = {};
    for (const p of (profs as { id: string; display_name: string | null; email: string | null }[]) || []) {
      nameById[p.id] = p.display_name || p.email || 'Sem nome';
    }
    setMembers(rows.map((r) => ({ user_id: r.user_id, role: r.role, name: nameById[r.user_id] || 'Sem nome' })));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  return { members, loading };
}

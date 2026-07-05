import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CrmRole } from '@/hooks/data/crmTypes';

export interface CrmMember { user_id: string; name: string; role: CrmRole; }

interface MembershipRow {
  user_id: string;
  role: CrmRole;
  profile: { display_name: string | null; email: string | null } | null;
}

export function useCrmMembers(companyId: string | null) {
  const [members, setMembers] = useState<CrmMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) { setMembers([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('memberships')
      .select('user_id, role, profile:profiles(display_name, email)')
      .eq('company_id', companyId);
    const rows = (data as MembershipRow[]) || [];
    setMembers(rows.map((r) => ({
      user_id: r.user_id,
      role: r.role,
      name: r.profile?.display_name || r.profile?.email || 'Sem nome',
    })));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  return { members, loading };
}

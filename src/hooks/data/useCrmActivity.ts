import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Interaction } from '@/hooks/data/crmTypes';

export interface ActivityItem extends Interaction { client: { name: string } | null; }

export function useCrmActivity(companyId: string | null) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) { setActivity([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('interactions')
      .select('*, client:clients(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20);
    setActivity((data as ActivityItem[]) || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  return { activity, loading };
}

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PipelineStage } from '@/hooks/data/crmTypes';

// Pura: etapas ativas, ordenadas por posição (sem mutar a entrada).
export function activeStagesSorted(stages: PipelineStage[]): PipelineStage[] {
  return stages.filter((s) => s.is_active).slice().sort((a, b) => a.position - b.position);
}

export function useCrmStages(companyId: string | null) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!companyId) { setStages([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('company_id', companyId)
      .order('position', { ascending: true });
    setStages(activeStagesSorted((data as PipelineStage[]) || []));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { stages, loading, refetch };
}

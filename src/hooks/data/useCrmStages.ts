import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PipelineStage, StageType } from '@/hooks/data/crmTypes';

// Pura: etapas ativas, ordenadas por posição (sem mutar a entrada).
export function activeStagesSorted(stages: PipelineStage[]): PipelineStage[] {
  return stages.filter((s) => s.is_active).slice().sort((a, b) => a.position - b.position);
}

// Pura: calcula as trocas de posição para mover uma etapa p/ cima/baixo.
// Retorna as linhas a atualizar (id + nova position), ou [] se for no-op nas bordas.
export function reorderStages(
  stages: PipelineStage[], id: string, dir: 'up' | 'down',
): { id: string; position: number }[] {
  const sorted = stages.slice().sort((a, b) => a.position - b.position);
  const i = sorted.findIndex((s) => s.id === id);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= sorted.length) return [];
  const a = sorted[i], b = sorted[j];
  return [{ id: a.id, position: b.position }, { id: b.id, position: a.position }];
}

export function useCrmStages(companyId: string | null, includeInactive = false) {
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
    const raw = (data as PipelineStage[]) || [];
    setStages(includeInactive ? raw.slice().sort((a, b) => a.position - b.position) : activeStagesSorted(raw));
    setLoading(false);
  }, [companyId, includeInactive]);

  useEffect(() => { refetch(); }, [refetch]);

  async function saveStage(name: string, stageType: StageType): Promise<{ error: Error | null }> {
    if (!companyId) return { error: new Error('Nenhuma empresa ativa.') };
    const nextPos = stages.reduce((max, s) => Math.max(max, s.position), 0) + 1;
    const { error } = await supabase.from('pipeline_stages').insert({
      company_id: companyId, name, position: nextPos, stage_type: stageType, is_active: true,
    });
    if (!error) await refetch();
    return { error };
  }

  async function updateStage(id: string, changes: Partial<PipelineStage>): Promise<{ error: Error | null }> {
    const prev = stages;
    setStages((cur) => cur.map((s) => (s.id === id ? { ...s, ...changes } : s)));
    const { error } = await supabase.from('pipeline_stages').update(changes).eq('id', id).eq('company_id', companyId);
    if (error) setStages(prev);
    return { error };
  }

  async function deleteStage(id: string): Promise<{ error: Error | null }> {
    const prev = stages;
    setStages((cur) => cur.filter((s) => s.id !== id));
    const { error } = await supabase.from('pipeline_stages').delete().eq('id', id).eq('company_id', companyId);
    if (error) setStages(prev);
    return { error };
  }

  async function moveStage(id: string, dir: 'up' | 'down'): Promise<{ error: Error | null }> {
    const updates = reorderStages(stages, id, dir);
    if (updates.length === 0) return { error: null };
    setStages((cur) => {
      const posById = Object.fromEntries(updates.map((u) => [u.id, u.position]));
      return cur.map((s) => (posById[s.id] != null ? { ...s, position: posById[s.id] } : s))
        .slice().sort((a, b) => a.position - b.position);
    });
    for (const u of updates) {
      const { error } = await supabase.from('pipeline_stages').update({ position: u.position }).eq('id', u.id).eq('company_id', companyId);
      if (error) { await refetch(); return { error }; }
    }
    return { error: null };
  }

  return { stages, loading, refetch, saveStage, updateStage, deleteStage, moveStage };
}

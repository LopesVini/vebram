import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AutomationRule } from '@/hooks/data/crmTypes';

export interface RuleDraft { name: string; stageId: string; offsetDays: number; taskTitle: string; }

// Formato estruturado padronizado — cabe tanto regra feita à mão quanto gerada por IA no futuro.
export function buildTrigger(stageId: string) {
  return { type: 'stage_entered' as const, stage_id: stageId };
}
export function buildAction(offsetDays: number, taskTitle: string) {
  return { type: 'create_task' as const, offset_days: Number(offsetDays), title: taskTitle };
}

export function useCrmRules(companyId: string | null) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!companyId) { setRules([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    setRules((data as AutomationRule[]) || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { refetch(); }, [refetch]);

  async function saveRule(d: RuleDraft): Promise<{ error: Error | null }> {
    if (!companyId) return { error: new Error('Nenhuma empresa ativa.') };
    const { data, error } = await supabase.from('automation_rules').insert({
      company_id: companyId,
      name: d.name,
      trigger: buildTrigger(d.stageId),
      conditions: [],
      action: buildAction(d.offsetDays, d.taskTitle),
      is_active: true,
    }).select().single();
    if (!error && data) setRules((prev) => [data as AutomationRule, ...prev]);
    return { error };
  }

  async function toggleRule(id: string, active: boolean): Promise<{ error: Error | null }> {
    const prev = rules;
    setRules((cur) => cur.map((r) => (r.id === id ? { ...r, is_active: active } : r)));
    const { error } = await supabase.from('automation_rules').update({ is_active: active }).eq('id', id).eq('company_id', companyId);
    if (error) setRules(prev);
    return { error };
  }

  async function deleteRule(id: string): Promise<{ error: Error | null }> {
    const prev = rules;
    setRules((cur) => cur.filter((r) => r.id !== id));
    const { error } = await supabase.from('automation_rules').delete().eq('id', id).eq('company_id', companyId);
    if (error) setRules(prev);
    return { error };
  }

  return { rules, loading, refetch, saveRule, toggleRule, deleteRule };
}

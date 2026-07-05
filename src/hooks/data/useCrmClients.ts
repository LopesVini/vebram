import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/hooks/data/crmTypes';

export type LeadSort = 'recent' | 'value' | 'name';
export interface LeadFilter { stageId: string | 'all'; ownerId: string | 'all'; source: string | 'all'; }
export interface NewLead {
  name: string; source: string | null; estimated_value: number | null;
  stage_id: string | null; owner_id: string | null;
}

// Pura: busca (nome/origem) + filtros (etapa/responsável/origem) + ordenação.
export function filterSortClients(
  clients: Client[], search: string, filter: LeadFilter, sort: LeadSort,
): Client[] {
  const q = search.trim().toLowerCase();
  const filtered = clients.filter((c) => {
    const matchSearch = !q
      || c.name.toLowerCase().includes(q)
      || (c.source ?? '').toLowerCase().includes(q);
    const matchStage = filter.stageId === 'all' || c.stage_id === filter.stageId;
    const matchOwner = filter.ownerId === 'all' || c.owner_id === filter.ownerId;
    const matchSource = filter.source === 'all' || c.source === filter.source;
    return matchSearch && matchStage && matchOwner && matchSource;
  });
  const sorted = filtered.slice();
  if (sort === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  } else if (sort === 'value') {
    sorted.sort((a, b) => (b.estimated_value ?? -Infinity) - (a.estimated_value ?? -Infinity));
  } else {
    sorted.sort((a, b) => b.entered_at.localeCompare(a.entered_at));
  }
  return sorted;
}

export function useCrmClients(companyId: string | null) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!companyId) { setClients([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('company_id', companyId)
      .order('entered_at', { ascending: false });
    setClients((data as Client[]) || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { refetch(); }, [refetch]);

  async function saveClient(lead: NewLead): Promise<{ error: Error | null }> {
    if (!companyId) return { error: new Error('Nenhuma empresa ativa.') };
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...lead, company_id: companyId })
      .select()
      .single();
    if (!error && data) setClients((prev) => [data as Client, ...prev]);
    return { error };
  }

  async function updateClient(id: string, changes: Partial<Client>): Promise<{ error: Error | null }> {
    const prev = clients;
    setClients((cur) => cur.map((c) => (c.id === id ? { ...c, ...changes } : c)));
    const { error } = await supabase.from('clients').update(changes).eq('id', id);
    if (error) setClients(prev); // reverte
    return { error };
  }

  async function deleteClient(id: string): Promise<{ error: Error | null }> {
    const prev = clients;
    setClients((cur) => cur.filter((c) => c.id !== id));
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) setClients(prev);
    return { error };
  }

  // Move de etapa + registra no histórico imutável (interactions).
  async function moveClientStage(id: string, toStageId: string): Promise<{ error: Error | null }> {
    const current = clients.find((c) => c.id === id);
    const fromStageId = current?.stage_id ?? null;
    if (fromStageId === toStageId) return { error: null };
    const { error } = await updateClient(id, { stage_id: toStageId });
    if (error) return { error };
    if (companyId) {
      await supabase.from('interactions').insert({
        company_id: companyId, client_id: id, type: 'stage_change',
        body: null, metadata: { from_stage_id: fromStageId, to_stage_id: toStageId },
      });
    }
    return { error: null };
  }

  return { clients, loading, refetch, saveClient, updateClient, deleteClient, moveClientStage };
}

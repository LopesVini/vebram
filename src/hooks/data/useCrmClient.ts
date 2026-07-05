import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Client, ContactChannel, Interaction } from '@/hooks/data/crmTypes';

// Pura: texto legível de um item do histórico.
export function describeInteraction(
  it: Interaction,
  stageName: (id: string | null | undefined) => string,
): string {
  if (it.type === 'stage_change') {
    const from = (it.metadata as Record<string, unknown>).from_stage_id as string | null | undefined;
    const to = (it.metadata as Record<string, unknown>).to_stage_id as string | null | undefined;
    return `Mudou de ${stageName(from)} para ${stageName(to)}`;
  }
  if (it.body && it.body.trim()) return it.body;
  const labels: Record<string, string> = {
    note: 'Anotação', contact: 'Contato registrado', task: 'Tarefa', system: 'Evento do sistema',
  };
  return labels[it.type] ?? 'Evento';
}

export function useCrmClient(clientId: string | null) {
  const [client, setClient] = useState<Client | null>(null);
  const [channels, setChannels] = useState<ContactChannel[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!clientId) { setClient(null); setChannels([]); setInteractions([]); setLoading(false); return; }
    setLoading(true);
    const [{ data: c }, { data: ch }, { data: it }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
      supabase.from('contact_channels').select('*').eq('client_id', clientId).order('created_at', { ascending: true }),
      supabase.from('interactions').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    ]);
    setClient((c as Client) ?? null);
    setChannels((ch as ContactChannel[]) || []);
    setInteractions((it as Interaction[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { refetch(); }, [refetch]);

  async function addNote(body: string): Promise<{ error: Error | null }> {
    if (!client) return { error: new Error('Cliente não carregado.') };
    const { data, error } = await supabase.from('interactions').insert({
      company_id: client.company_id, client_id: client.id, type: 'note', body, metadata: {},
    }).select().single();
    if (!error && data) setInteractions((prev) => [data as Interaction, ...prev]);
    return { error };
  }

  async function updateField(changes: Partial<Client>): Promise<{ error: Error | null }> {
    if (!client) return { error: new Error('Cliente não carregado.') };
    const prev = client;
    setClient({ ...client, ...changes });
    const { error } = await supabase.from('clients').update(changes).eq('id', client.id).eq('company_id', client.company_id);
    if (error) setClient(prev);
    return { error };
  }

  async function changeStage(toStageId: string | null): Promise<{ error: Error | null }> {
    if (!client) return { error: new Error('Cliente não carregado.') };
    const fromStageId = client.stage_id;
    if (fromStageId === toStageId) return { error: null };
    const { error } = await updateField({ stage_id: toStageId });
    if (error) return { error };
    const { data, error: histError } = await supabase.from('interactions').insert({
      company_id: client.company_id, client_id: client.id, type: 'stage_change',
      body: null, metadata: { from_stage_id: fromStageId, to_stage_id: toStageId },
    }).select().single();
    if (histError) return { error: histError };
    if (data) setInteractions((prev) => [data as Interaction, ...prev]);
    return { error: null };
  }

  async function addChannel(type: ContactChannel['type'], value: string): Promise<{ error: Error | null }> {
    if (!client) return { error: new Error('Cliente não carregado.') };
    const { data, error } = await supabase.from('contact_channels').insert({
      company_id: client.company_id, client_id: client.id, type, value, is_primary: false,
    }).select().single();
    if (!error && data) setChannels((prev) => [...prev, data as ContactChannel]);
    return { error };
  }

  return { client, channels, interactions, loading, refetch, addNote, updateField, changeStage, addChannel };
}

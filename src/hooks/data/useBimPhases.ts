import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BimPhase } from "@/lib/bimPhases";

// Fases BIM curadas do projeto (tabela bim_phases). Leitura: cliente e admin
// (RLS restringe ao próprio projeto). Escrita: só admin — as mutações abaixo
// falham para clientes por RLS.
export function useBimPhases(projectId: string | null | undefined) {
  const [phases, setPhases] = useState<BimPhase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setPhases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("bim_phases")
      .select("*")
      .eq("project_id", projectId)
      .order("seq", { ascending: true })
      .then(({ data, error }) => {
        if (!error) setPhases((data as BimPhase[]) ?? []);
        setLoading(false);
      });
  }, [projectId]);

  const createPhase = useCallback(async (name: string): Promise<BimPhase | null> => {
    if (!projectId) return null;
    const seq = phases.length ? Math.max(...phases.map(p => p.seq)) + 1 : 1;
    const { data, error } = await supabase
      .from("bim_phases")
      .insert({ project_id: projectId, seq, name, elements: [] })
      .select()
      .single();
    if (error || !data) return null;
    const phase = data as BimPhase;
    setPhases(prev => [...prev, phase].sort((a, b) => a.seq - b.seq));
    return phase;
  }, [projectId, phases]);

  const renamePhase = useCallback(async (id: string, name: string) => {
    setPhases(prev => prev.map(p => (p.id === id ? { ...p, name } : p)));
    const { error } = await supabase.from("bim_phases").update({ name }).eq("id", id);
    return { error: error?.message ?? null };
  }, []);

  const deletePhase = useCallback(async (id: string) => {
    setPhases(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from("bim_phases").delete().eq("id", id);
    return { error: error?.message ?? null };
  }, []);

  // Atribui GlobalIds à fase alvo, removendo-os de qualquer outra fase
  // (um elemento pertence a no máximo uma fase).
  const assignElements = useCallback(async (phaseId: string, globalIds: string[]) => {
    const gids = new Set(globalIds);
    const changed: BimPhase[] = [];
    const next = phases.map(p => {
      if (p.id === phaseId) {
        const merged = [...new Set([...p.elements, ...globalIds])];
        const updated = { ...p, elements: merged };
        changed.push(updated);
        return updated;
      }
      if (p.elements.some(g => gids.has(g))) {
        const updated = { ...p, elements: p.elements.filter(g => !gids.has(g)) };
        changed.push(updated);
        return updated;
      }
      return p;
    });
    setPhases(next);
    const results = await Promise.all(
      changed.map(p =>
        supabase.from("bim_phases").update({ elements: p.elements }).eq("id", p.id),
      ),
    );
    const error = results.find(r => r.error)?.error?.message ?? null;
    return { error };
  }, [phases]);

  // Remove GlobalIds de todas as fases (voltam a ser órfãos)
  const unassignElements = useCallback(async (globalIds: string[]) => {
    const gids = new Set(globalIds);
    const changed: BimPhase[] = [];
    const next = phases.map(p => {
      if (!p.elements.some(g => gids.has(g))) return p;
      const updated = { ...p, elements: p.elements.filter(g => !gids.has(g)) };
      changed.push(updated);
      return updated;
    });
    setPhases(next);
    const results = await Promise.all(
      changed.map(p =>
        supabase.from("bim_phases").update({ elements: p.elements }).eq("id", p.id),
      ),
    );
    const error = results.find(r => r.error)?.error?.message ?? null;
    return { error };
  }, [phases]);

  return { phases, loading, createPhase, renamePhase, deletePhase, assignElements, unassignElements };
}

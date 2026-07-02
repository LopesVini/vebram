import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  status: "done" | "active" | "pending";
  date: string | null;
  sort_order: number;
  weight: number;
  total_items: number | null;
  delivered_items: number;
  approved_at: string | null;
}

// Calcula progresso do projeto (0–100 com decimais) baseado nos marcos.
// Prioridade: approved_at > total_items/delivered_items > status
export function calcProgress(milestones: Milestone[]): number {
  if (!milestones.length) return 0;

  const totalWeight = milestones.reduce((sum, m) => sum + (m.weight ?? 1), 0);
  if (totalWeight === 0) return 0;

  const weightedSum = milestones.reduce((sum, m) => {
    let pct: number;
    if (m.approved_at) {
      pct = 100;
    } else if (m.total_items && m.total_items > 0) {
      pct = ((m.delivered_items ?? 0) / m.total_items) * 100;
    } else {
      pct = m.status === "done" ? 100 : m.status === "active" ? 50 : 0;
    }
    return sum + (m.weight ?? 1) * pct;
  }, 0);

  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

export function useMilestones(projectId: string | null | undefined) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    const { data } = await supabase
      .from("milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    setMilestones((data as Milestone[]) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function syncProgress(updated: Milestone[]) {
    if (!projectId) return;
    const progress = calcProgress(updated);
    await supabaseAdmin.from("projects").update({ progress }).eq("id", projectId);
  }

  async function saveMilestone(m: Omit<Milestone, "id">) {
    const { data, error } = await supabase.from("milestones").insert(m).select().single();
    if (!error && data) {
      const updated = [...milestones, data as Milestone].sort((a, b) => a.sort_order - b.sort_order);
      setMilestones(updated);
      await syncProgress(updated);
    }
    return { error };
  }

  async function updateMilestone(id: string, changes: Partial<Milestone>) {
    const { data, error } = await supabase
      .from("milestones")
      .update(changes)
      .eq("id", id)
      .select();

    if (error) return { error };

    // RLS pode bloquear silenciosamente — retorna 0 linhas sem erro
    if (!data || data.length === 0) {
      return { error: new Error("Sem permissão para salvar esta alteração.") };
    }

    const updated = milestones.map((m) => (m.id === id ? { ...m, ...changes } : m));
    setMilestones(updated);
    await syncProgress(updated);
    return { error: null };
  }

  async function approveMilestone(id: string) {
    const changes = { approved_at: new Date().toISOString(), status: "done" as const };
    const { data, error } = await supabaseAdmin
      .from("milestones")
      .update(changes)
      .eq("id", id)
      .select();

    if (error) return { error };
    if (!data || data.length === 0) return { error: new Error("Falha ao aprovar entrega.") };

    const updated = milestones.map((m) => (m.id === id ? { ...m, ...changes } : m));
    setMilestones(updated);
    await syncProgress(updated);
    return { error: null };
  }

  async function updateDelivered(id: string, delivered_items: number) {
    return updateMilestone(id, { delivered_items });
  }

  return { milestones, loading, refetch: fetch, saveMilestone, updateMilestone, approveMilestone, updateDelivered };
}

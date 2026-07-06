// Agregações puras do dashboard do CRM — testáveis sem Supabase.
import type { Client, PipelineStage, CrmTask } from '@/hooks/data/crmTypes';

export interface StageBar { id: string; name: string; count: number; value: number; }
export interface PipelineStats {
  total: number; pipelineValue: number; won: number; lost: number; open: number; conversionRate: number;
}

export function countNewLeads(clients: Client[], sinceISO: string): number {
  return clients.filter((c) => c.entered_at >= sinceISO).length;
}

export function leadsByStage(clients: Client[], stages: PipelineStage[]): StageBar[] {
  return stages.map((s) => {
    const inStage = clients.filter((c) => c.stage_id === s.id);
    return {
      id: s.id,
      name: s.name,
      count: inStage.length,
      value: inStage.reduce((sum, c) => sum + (c.estimated_value ?? 0), 0),
    };
  });
}

export function pipelineStats(clients: Client[], stages: PipelineStage[]): PipelineStats {
  const typeById: Record<string, PipelineStage['stage_type']> = {};
  for (const s of stages) typeById[s.id] = s.stage_type;
  let won = 0, lost = 0, open = 0, pipelineValue = 0;
  for (const c of clients) {
    const t = c.stage_id ? typeById[c.stage_id] : undefined;
    if (t === 'won') { won++; }
    else if (t === 'lost') { lost++; }
    else { open++; pipelineValue += c.estimated_value ?? 0; }
  }
  const closed = won + lost;
  const conversionRate = closed === 0 ? 0 : Math.round((won / closed) * 100);
  return { total: clients.length, pipelineValue, won, lost, open, conversionRate };
}

export function upcomingTasks(tasks: CrmTask[], limit = 5): CrmTask[] {
  return tasks
    .filter((t) => t.status === 'pending')
    .slice()
    .sort((a, b) => (a.due_date ?? '9999-12-31').localeCompare(b.due_date ?? '9999-12-31'))
    .slice(0, limit);
}

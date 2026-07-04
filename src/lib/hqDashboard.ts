// Agregações puras do dashboard HQ — testáveis sem Supabase.

export interface DashProject {
  id: string;
  name: string;
  progress: number;
  status: string;
  end_date: string | null;
  color: string;
  created_at: string;
}

export interface DashMilestone {
  id: string;
  name: string;
  status: "done" | "active" | "pending";
  date: string | null;
  approved_at: string | null;
  project_id: string;
}

const ACTIVE_STATUSES = ["Em Andamento", "Revisão"];

export function buildProgressData(projects: DashProject[]) {
  return projects
    .filter(p => ACTIVE_STATUSES.includes(p.status))
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 8)
    .map(p => ({ name: p.name, progress: p.progress }));
}

export function buildFunnelData(milestones: DashMilestone[]) {
  const counts = { pending: 0, active: 0, delivered: 0, approved: 0 };
  for (const m of milestones) {
    if (m.approved_at) counts.approved++;
    else if (m.status === "done") counts.delivered++;
    else if (m.status === "active") counts.active++;
    else counts.pending++;
  }
  return [
    { stage: "Pendente",     count: counts.pending },
    { stage: "Em Andamento", count: counts.active },
    { stage: "Entregue",     count: counts.delivered },
    { stage: "Aprovado",     count: counts.approved },
  ];
}

const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export function buildLeadsData(rows: { created_at: string }[], now: Date = new Date()) {
  const buckets: { key: string; name: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.push({
      key,
      name: `${MONTH_LABELS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      value: 0,
    });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const row of rows) {
    const d = new Date(row.created_at);
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) buckets[i].value++;
  }
  return buckets.map(({ name, value }) => ({ name, value }));
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildDeadlines(
  projects: DashProject[],
  milestones: DashMilestone[],
  now: Date = new Date(),
) {
  const horizon = now.getTime() + 30 * DAY_MS;

  const items: { kind: "projeto" | "marco"; name: string; date: string; daysLeft: number }[] = [];

  const inWindow = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= now.getTime() - DAY_MS && t <= horizon; // -1 dia: inclui "vence hoje"
  };

  for (const p of projects) {
    if (p.status === "Concluído" || !p.end_date || !inWindow(p.end_date)) continue;
    items.push({
      kind: "projeto",
      name: p.name,
      date: p.end_date,
      daysLeft: Math.max(0, Math.round((new Date(p.end_date).getTime() - now.getTime()) / DAY_MS)),
    });
  }

  for (const m of milestones) {
    if (m.approved_at || m.status === "done" || !m.date || !inWindow(m.date)) continue;
    items.push({
      kind: "marco",
      name: m.name,
      date: m.date,
      daysLeft: Math.max(0, Math.round((new Date(m.date).getTime() - now.getTime()) / DAY_MS)),
    });
  }

  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

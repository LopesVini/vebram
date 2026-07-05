# CRM UI — Phase 4 (Dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `/hq/crm` shell into a decision-useful dashboard: KPIs (new leads, pipeline value, won/lost, conversion rate), a leads-by-stage chart, upcoming tasks, and a recent-activity feed — all derived from the existing CRM hooks via pure, unit-tested aggregations.

**Architecture:** Pure aggregation functions live in `src/lib/crmDashboard.ts` (mirroring `src/lib/hqDashboard.ts`) and are unit-tested without Supabase. The `CrmDashboard` page composes the existing hooks (`useCrmClients`, `useCrmStages`, `useCrmTasks`) plus one small read hook `useCrmActivity` (recent interactions) and feeds them through the aggregations — no separate data-fetching dashboard hook is introduced (YAGNI; matches how `HqDashboard` works).

**Tech Stack:** React 18 + TypeScript, `recharts`, `framer-motion`, Supabase client, `lucide-react`, `date-fns`, vitest.

## Global Constraints

- Import alias `@/` → `src/`. pt-BR user-facing strings.
- Reuse existing pieces: the `HqDashboard` card idiom (`ChartCard`/`EmptyChart`/KPI tiles), `recharts`, `describeInteraction` (`@/hooks/data/useCrmClient`), `StageBadge`, `CrmLoading`/`CrmNoAccess`. Match `navy`/blue-600/`rounded-2xl`/`dark:` styling.
- Pure aggregations go in `src/lib/crmDashboard.ts` and must be testable without Supabase (no imports from React/Supabase). Types from `@/hooks/data/crmTypes`.
- Multi-tenant: the one new hook (`useCrmActivity`) filters `.eq('company_id', companyId)` and skips fetching while `companyId` is null.
- No new DB objects; the `interactions → clients` FK already exists, so the activity embed `client:clients(name)` resolves.
- Charts must be decision-useful, not decorative (spec).
- Tests: `npx vitest run <path>`. Build: `npm run build`. Lint: `npm run lint`. Dev: port 8080.

---

## File Structure

- Create `src/lib/crmDashboard.ts` — pure aggregations. (Task 1)
- Create `src/lib/crmDashboard.test.ts` — unit tests. (Task 1)
- Create `src/hooks/data/useCrmActivity.ts` — recent-interactions read hook. (Task 2)
- Rewrite `src/pages/hq/crm/CrmDashboard.tsx` — the dashboard page. (Task 2)

---

### Task 1: Pure dashboard aggregations

**Files:**
- Create: `src/lib/crmDashboard.ts`
- Test: `src/lib/crmDashboard.test.ts`

**Interfaces:**
- Consumes: `Client`, `PipelineStage`, `CrmTask` (`@/hooks/data/crmTypes`).
- Produces:
  - `interface StageBar { id: string; name: string; count: number; value: number }`
  - `interface PipelineStats { total: number; pipelineValue: number; won: number; lost: number; open: number; conversionRate: number }`
  - `countNewLeads(clients: Client[], sinceISO: string): number`
  - `leadsByStage(clients: Client[], stages: PipelineStage[]): StageBar[]`
  - `pipelineStats(clients: Client[], stages: PipelineStage[]): PipelineStats`
  - `upcomingTasks(tasks: CrmTask[], limit?: number): CrmTask[]`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/crmDashboard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { countNewLeads, leadsByStage, pipelineStats, upcomingTasks } from './crmDashboard';
import type { Client, PipelineStage, CrmTask } from '@/hooks/data/crmTypes';

const client = (over: Partial<Client>): Client => ({
  id: 'x', company_id: 'c1', name: 'X', source: null, entered_at: '2026-07-01T00:00:00Z',
  owner_id: null, stage_id: null, estimated_value: null, lost_reason: null, lost_at: null,
  created_at: '', updated_at: '', ...over,
});
const stage = (id: string, position: number, stage_type: PipelineStage['stage_type']): PipelineStage => ({
  id, company_id: 'c1', name: id.toUpperCase(), position, stage_type, color: null, is_active: true, created_at: '',
});
const task = (over: Partial<CrmTask>): CrmTask => ({
  id: 't', company_id: 'c1', client_id: 'cl1', title: 'T', due_date: null, assignee_id: null,
  status: 'pending', completed_at: null, created_at: '', updated_at: '', ...over,
});

const STAGES = [stage('s1', 1, 'open'), stage('s2', 2, 'open'), stage('won', 3, 'won'), stage('lost', 4, 'lost')];

describe('countNewLeads', () => {
  it('counts leads entered on or after the cutoff', () => {
    const list = [client({ entered_at: '2026-07-05T10:00:00Z' }), client({ entered_at: '2026-06-20T00:00:00Z' })];
    expect(countNewLeads(list, '2026-06-28T00:00:00Z')).toBe(1);
  });
});

describe('leadsByStage', () => {
  it('returns one bar per stage with count and summed value, in stage order', () => {
    const list = [
      client({ stage_id: 's1', estimated_value: 100 }),
      client({ stage_id: 's1', estimated_value: 50 }),
      client({ stage_id: 's2', estimated_value: 200 }),
    ];
    const out = leadsByStage(list, STAGES);
    expect(out.map((b) => [b.id, b.count, b.value])).toEqual([
      ['s1', 2, 150], ['s2', 1, 200], ['won', 0, 0], ['lost', 0, 0],
    ]);
  });
});

describe('pipelineStats', () => {
  it('counts won/lost/open, sums open value, and computes conversion = won/(won+lost)%', () => {
    const list = [
      client({ stage_id: 's1', estimated_value: 100 }),   // open
      client({ stage_id: 'won', estimated_value: 999 }),   // won (excluded from pipeline value)
      client({ stage_id: 'won', estimated_value: 1 }),     // won
      client({ stage_id: 'lost', estimated_value: 5 }),    // lost
      client({ stage_id: null, estimated_value: 40 }),     // no stage → open
    ];
    const s = pipelineStats(list, STAGES);
    expect(s.total).toBe(5);
    expect(s.won).toBe(2);
    expect(s.lost).toBe(1);
    expect(s.open).toBe(2);
    expect(s.pipelineValue).toBe(140); // 100 + 40 (open only)
    expect(s.conversionRate).toBe(67); // 2/3 = 66.6 → 67
  });
  it('conversion is 0 when nothing is closed', () => {
    expect(pipelineStats([client({ stage_id: 's1' })], STAGES).conversionRate).toBe(0);
  });
});

describe('upcomingTasks', () => {
  it('returns only pending, soonest due first (nulls last), limited', () => {
    const list = [
      task({ id: 'a', due_date: '2026-07-10' }),
      task({ id: 'b', due_date: null }),
      task({ id: 'c', due_date: '2026-07-02' }),
      task({ id: 'd', due_date: '2026-07-05', status: 'done' }),
    ];
    expect(upcomingTasks(list, 2).map((t) => t.id)).toEqual(['c', 'a']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/crmDashboard.test.ts`
Expected: FAIL — cannot resolve `./crmDashboard`.

- [ ] **Step 3: Write `crmDashboard.ts`**

Create `src/lib/crmDashboard.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/crmDashboard.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Verify build + commit**

```bash
npm run build
git add src/lib/crmDashboard.ts src/lib/crmDashboard.test.ts
git commit -m "feat(crm): agregações puras do dashboard (leads, pipeline, conversão, tarefas)"
```

---

### Task 2: Dashboard page + activity hook

**Files:**
- Create: `src/hooks/data/useCrmActivity.ts`
- Rewrite: `src/pages/hq/crm/CrmDashboard.tsx`

**Interfaces:**
- Consumes: `useCrmCompany`, `useCrmClients`, `useCrmStages`, `useCrmTasks`, `describeInteraction` (`@/hooks/data/useCrmClient`), `crmDashboard.ts` aggregations, `CrmLoading`/`CrmNoAccess`, `recharts`.
- Produces:
  - `interface ActivityItem extends Interaction { client: { name: string } | null }`
  - `useCrmActivity(companyId: string | null): { activity: ActivityItem[]; loading: boolean }`
  - default `CrmDashboard` page.

- [ ] **Step 1: Write `useCrmActivity.ts`**

Create `src/hooks/data/useCrmActivity.ts`:

```ts
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
```

- [ ] **Step 2: Rewrite `CrmDashboard.tsx`**

Replace the file. KPI tiles + a leads-by-stage bar chart (recharts) + upcoming tasks + recent activity, all from the aggregations. Mirror the `HqDashboard` card idiom.

```tsx
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UserPlus, Wallet, Trophy, XCircle, Percent, CalendarClock } from 'lucide-react';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmClients } from '@/hooks/data/useCrmClients';
import { useCrmStages } from '@/hooks/data/useCrmStages';
import { useCrmTasks } from '@/hooks/data/useCrmTasks';
import { useCrmActivity } from '@/hooks/data/useCrmActivity';
import { describeInteraction } from '@/hooks/data/useCrmClient';
import { countNewLeads, leadsByStage, pipelineStats, upcomingTasks } from '@/lib/crmDashboard';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof UserPlus; tone: string }) {
  return (
    <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${tone}`}><Icon size={17} /></div>
      <p className="text-2xl font-black text-navy dark:text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
      <h3 className="font-bold text-sm text-navy dark:text-white mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function CrmDashboard() {
  const { companyId, loading: companyLoading } = useCrmCompany();
  const { clients, loading } = useCrmClients(companyId);
  const { stages } = useCrmStages(companyId);
  const { tasks } = useCrmTasks(companyId);
  const { activity } = useCrmActivity(companyId);

  const sevenDaysAgo = useMemo(() => new Date(Date.now() - 7 * 86400000).toISOString(), []);
  const stats = useMemo(() => pipelineStats(clients, stages), [clients, stages]);
  const bars = useMemo(() => leadsByStage(clients, stages), [clients, stages]);
  const newLeads = useMemo(() => countNewLeads(clients, sevenDaysAgo), [clients, sevenDaysAgo]);
  const soon = useMemo(() => upcomingTasks(tasks, 5), [tasks]);
  const stageName = (sid: string | null | undefined) => (sid && stages.find((s) => s.id === sid)?.name) || 'Sem etapa';

  if (companyLoading || loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white">Painel CRM</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Visão do funil e das próximas ações</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="Leads novos (7d)" value={String(newLeads)} icon={UserPlus} tone="bg-blue-50 dark:bg-blue-500/10 text-blue-600" />
        <KpiCard label="Valor do pipeline" value={BRL.format(stats.pipelineValue)} icon={Wallet} tone="bg-violet-50 dark:bg-violet-500/10 text-violet-600" />
        <KpiCard label="Ganhos" value={String(stats.won)} icon={Trophy} tone="bg-green-50 dark:bg-green-500/10 text-green-600" />
        <KpiCard label="Perdidos" value={String(stats.lost)} icon={XCircle} tone="bg-rose-50 dark:bg-rose-500/10 text-rose-600" />
        <KpiCard label="Conversão" value={`${stats.conversionRate}%`} icon={Percent} tone="bg-amber-50 dark:bg-amber-500/10 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Leads por etapa */}
        <div className="lg:col-span-2">
          <Card title="Leads por etapa">
            {bars.every((b) => b.count === 0) ? (
              <p className="text-sm text-zinc-400 py-10 text-center">Sem leads para exibir.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#a1a1aa" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#a1a1aa" />
                    <Tooltip
                      cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                      formatter={(v: number, _n, p) => [`${v} lead(s) · ${BRL.format((p.payload as { value: number }).value)}`, 'Etapa']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {bars.map((b) => <Cell key={b.id} fill="#2563eb" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Próximas tarefas */}
        <Card title="Próximas tarefas">
          {soon.length === 0 && <p className="text-sm text-zinc-400 py-6 text-center">Nenhuma tarefa pendente.</p>}
          <ul className="space-y-2">
            {soon.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-navy dark:text-white truncate">{t.title}</span>
                {t.due_date && (
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400 shrink-0">
                    <CalendarClock size={11} /> {t.due_date.slice(8, 10)}/{t.due_date.slice(5, 7)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <Link to="/hq/crm/tasks" className="inline-block mt-3 text-xs font-bold text-blue-600 hover:text-blue-700">Ver todas →</Link>
        </Card>
      </div>

      {/* Atividades recentes */}
      <Card title="Atividades recentes">
        {activity.length === 0 && <p className="text-sm text-zinc-400 py-6 text-center">Nenhuma atividade ainda.</p>}
        <ul className="divide-y divide-zinc-100 dark:divide-white/5">
          {activity.map((a) => (
            <li key={a.id} className="py-2 flex items-center justify-between gap-3">
              <span className="text-sm text-navy dark:text-white truncate">
                {describeInteraction(a, stageName)}
              </span>
              <span className="text-[11px] text-zinc-400 shrink-0">{a.client?.name ?? '—'}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: clean. Manually confirm: recharts imports resolve; KPIs compute from `pipelineStats`/`countNewLeads`; the bar chart renders per stage; upcoming tasks and recent activity lists populate; empty states show when there is no data.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/data/useCrmActivity.ts src/pages/hq/crm/CrmDashboard.tsx
git commit -m "feat(crm): dashboard do CRM (KPIs, leads por etapa, tarefas, atividades)"
```

---

## Manual verification (browser, logged-in admin)

1. `/hq/crm` shows five KPI tiles: leads novos (7d), valor do pipeline (BRL), ganhos, perdidos, conversão %.
2. "Leads por etapa" bar chart has one bar per active stage; hover shows count + summed value.
3. Create/win/lose leads in `/hq/crm/leads` or `/hq/crm/pipeline` → the KPIs and chart reflect the changes on reload.
4. "Próximas tarefas" lists the soonest pending tasks; "Ver todas" → `/hq/crm/tasks`.
5. "Atividades recentes" lists recent interactions (e.g. stage changes show "Mudou de X para Y") with the client name.

---

## Self-Review

**Spec coverage (F4 slice):**
- Decision-useful dashboard (no decoration): leads novos, leads por etapa, próximas tarefas, ganhos, perdidos, taxa de conversão, valor do pipeline, atividades recentes → all present (Task 2), computed by pure functions (Task 1). ✔
- Numbers from pure, testable aggregations → `crmDashboard.ts` + tests (Task 1). ✔
- Reuse existing pieces (HqDashboard card idiom, recharts, `describeInteraction`, CrmStates) → Task 2. ✔
- No separate `useCrmDashboard` hook — reuses existing hooks + one small `useCrmActivity`; documented deviation from the design's file list, consistent with how `HqDashboard` is built (pure lib + page-level composition). ✔
- Multi-tenant: `useCrmActivity` scopes by `company_id`; other hooks already do. ✔
- Deferred: Settings/stage+rule editors (F5). Not a gap.

**Placeholder scan:** none — all aggregations, tests, the hook, and the page are fully coded. No `return null` placeholders.

**Type consistency:** `StageBar`, `PipelineStats`, `countNewLeads(clients, sinceISO)`, `leadsByStage(clients, stages)`, `pipelineStats(clients, stages)`, `upcomingTasks(tasks, limit)`, and `ActivityItem`/`useCrmActivity` return shape match across the two tasks and the page's usage. `describeInteraction(it, stageName)` matches its F3 signature. ✔
```

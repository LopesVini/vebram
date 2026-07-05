# CRM UI — Phase 3 (Client detail + History + Tasks) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the `/hq/crm/clients/:id` and `/hq/crm/tasks` shells — a single-screen client view (data, contacts, chronological history timeline, open tasks + next actions) and a company-wide tasks screen with fast follow-up creation grouped by due date.

**Architecture:** Two hand-rolled hooks scoped by the loaded record: `useCrmClient(clientId)` (client + contact_channels + interactions timeline + note/stage/field mutations) and `useCrmTasks(companyId)` (company tasks + add/toggle/delete). Each carries a pure, unit-tested helper (`describeInteraction`, `bucketTasks`). Small reusable components (`TimelineItem`, `QuickTaskInput`, `TaskItem`) assemble the two pages. Reuses Phase 1/2 pieces (`useCrmStages`, `useCrmMembers`, `StageBadge`, `CrmStates`).

**Tech Stack:** React 18 + TypeScript, Supabase client, `date-fns`, `framer-motion`, `sonner`, `lucide-react`, vitest + Testing Library.

## Global Constraints

- Import alias `@/` → `src/`. pt-BR user-facing strings.
- Hand-rolled hooks (no React Query); `supabase.from(...)`; local `useState`; optimistic updates; mutations return `{ error }`.
- Multi-tenant: inserts set `company_id` (taken from the loaded client for per-client inserts, or the active `companyId`); company-scoped queries filter `.eq('company_id', companyId)`; skip fetching while the id is `null`.
- `interactions` is append-only history — never update/delete it (RLS enforces this too).
- Types come from `src/hooks/data/crmTypes.ts` — do not redefine `Client`, `ContactChannel`, `Interaction`, `CrmTask`, `PipelineStage`.
- Reuse existing pieces: `useCrmStages`, `useCrmMembers`, `StageBadge`, `CrmLoading`/`CrmNoAccess`, and the `useUpdates`-style timeline idiom. Match `navy`/blue-600/`rounded-xl`-`2xl`/`dark:` styling.
- On mutation error: `sonner` toast + revert optimistic change.
- Tests: `npx vitest run <path>`. Build: `npm run build`. Lint: `npm run lint`. Dev: port 8080.
- Runtime needs the CRM migrations (applied) + a membership (seeded).

---

## File Structure

- Create `src/hooks/data/useCrmTasks.ts` — `bucketTasks` pure helper + `useCrmTasks(companyId)`. (Task 1)
- Create `src/hooks/data/useCrmTasks.test.ts` — `bucketTasks` unit tests. (Task 1)
- Create `src/hooks/data/useCrmClient.ts` — `describeInteraction` pure helper + `useCrmClient(clientId)`. (Task 2)
- Create `src/hooks/data/useCrmClient.test.ts` — `describeInteraction` unit tests. (Task 2)
- Create `src/components/hq/crm/TimelineItem.tsx`, `TaskItem.tsx`, `QuickTaskInput.tsx`. (Task 3)
- Create `src/components/hq/crm/QuickTaskInput.test.tsx`, `TaskItem.test.tsx`. (Task 3)
- Rewrite `src/pages/hq/crm/CrmClientDetail.tsx`. (Task 4)
- Rewrite `src/pages/hq/crm/CrmTasks.tsx`. (Task 5)

---

### Task 1: Tasks hook + due-date bucketing

**Files:**
- Create: `src/hooks/data/useCrmTasks.ts`
- Test: `src/hooks/data/useCrmTasks.test.ts`

**Interfaces:**
- Consumes: `CrmTask` (`@/hooks/data/crmTypes`); `supabase`.
- Produces:
  - `interface NewTask { title: string; due_date: string | null; client_id: string; assignee_id: string | null }`
  - `interface TaskBuckets { overdue: CrmTask[]; today: CrmTask[]; upcoming: CrmTask[]; done: CrmTask[] }`
  - `bucketTasks(tasks: CrmTask[], todayISO: string): TaskBuckets`
  - `useCrmTasks(companyId: string | null): { tasks: CrmTask[]; loading: boolean; refetch: () => Promise<void>; addTask: (t: NewTask) => Promise<{ error: Error | null }>; toggleTask: (id: string, done: boolean) => Promise<{ error: Error | null }>; deleteTask: (id: string) => Promise<{ error: Error | null }> }`

- [ ] **Step 1: Write the failing test for `bucketTasks`**

Create `src/hooks/data/useCrmTasks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { bucketTasks } from './useCrmTasks';
import type { CrmTask } from './crmTypes';

const mk = (over: Partial<CrmTask>): CrmTask => ({
  id: 'x', company_id: 'c1', client_id: 'cl1', title: 'T', due_date: null,
  assignee_id: null, status: 'pending', completed_at: null, created_at: '', updated_at: '', ...over,
});

describe('bucketTasks', () => {
  const today = '2026-07-05';
  it('puts done tasks in done regardless of date', () => {
    const out = bucketTasks([mk({ id: 'a', status: 'done', due_date: '2026-01-01' })], today);
    expect(out.done.map((t) => t.id)).toEqual(['a']);
    expect(out.overdue).toHaveLength(0);
  });
  it('overdue = pending with due_date before today', () => {
    const out = bucketTasks([mk({ id: 'a', due_date: '2026-07-04' })], today);
    expect(out.overdue.map((t) => t.id)).toEqual(['a']);
  });
  it('today = pending due exactly today', () => {
    const out = bucketTasks([mk({ id: 'a', due_date: '2026-07-05' })], today);
    expect(out.today.map((t) => t.id)).toEqual(['a']);
  });
  it('upcoming = pending due after today OR with no due date', () => {
    const out = bucketTasks([mk({ id: 'a', due_date: '2026-07-06' }), mk({ id: 'b', due_date: null })], today);
    expect(out.upcoming.map((t) => t.id).sort()).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/data/useCrmTasks.test.ts`
Expected: FAIL — cannot resolve `bucketTasks`.

- [ ] **Step 3: Write `useCrmTasks.ts`**

Create `src/hooks/data/useCrmTasks.ts`:

```ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CrmTask } from '@/hooks/data/crmTypes';

export interface NewTask { title: string; due_date: string | null; client_id: string; assignee_id: string | null; }
export interface TaskBuckets { overdue: CrmTask[]; today: CrmTask[]; upcoming: CrmTask[]; done: CrmTask[]; }

// Pura: separa por vencimento. `todayISO` = 'YYYY-MM-DD'.
export function bucketTasks(tasks: CrmTask[], todayISO: string): TaskBuckets {
  const b: TaskBuckets = { overdue: [], today: [], upcoming: [], done: [] };
  for (const t of tasks) {
    if (t.status === 'done') { b.done.push(t); continue; }
    const d = t.due_date; // date-only string 'YYYY-MM-DD' or null
    if (!d) { b.upcoming.push(t); }
    else if (d < todayISO) { b.overdue.push(t); }
    else if (d === todayISO) { b.today.push(t); }
    else { b.upcoming.push(t); }
  }
  return b;
}

export function useCrmTasks(companyId: string | null) {
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!companyId) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('company_id', companyId)
      .order('due_date', { ascending: true, nullsFirst: false });
    setTasks((data as CrmTask[]) || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { refetch(); }, [refetch]);

  async function addTask(t: NewTask): Promise<{ error: Error | null }> {
    if (!companyId) return { error: new Error('Nenhuma empresa ativa.') };
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...t, company_id: companyId, status: 'pending' })
      .select()
      .single();
    if (!error && data) setTasks((prev) => [...prev, data as CrmTask]);
    return { error };
  }

  async function toggleTask(id: string, done: boolean): Promise<{ error: Error | null }> {
    const prev = tasks;
    const changes = { status: done ? 'done' : 'pending', completed_at: done ? new Date().toISOString() : null } as Partial<CrmTask>;
    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    const { error } = await supabase.from('tasks').update(changes).eq('id', id).eq('company_id', companyId);
    if (error) setTasks(prev);
    return { error };
  }

  async function deleteTask(id: string): Promise<{ error: Error | null }> {
    const prev = tasks;
    setTasks((cur) => cur.filter((t) => t.id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('company_id', companyId);
    if (error) setTasks(prev);
    return { error };
  }

  return { tasks, loading, refetch, addTask, toggleTask, deleteTask };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/hooks/data/useCrmTasks.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Verify build + commit**

```bash
npm run build
git add src/hooks/data/useCrmTasks.ts src/hooks/data/useCrmTasks.test.ts
git commit -m "feat(crm): hook de tarefas (CRUD + bucketing por vencimento)"
```

---

### Task 2: Client detail aggregate hook

**Files:**
- Create: `src/hooks/data/useCrmClient.ts`
- Test: `src/hooks/data/useCrmClient.test.ts`

**Interfaces:**
- Consumes: `Client`, `ContactChannel`, `Interaction`, `InteractionType` (`@/hooks/data/crmTypes`); `supabase`.
- Produces:
  - `describeInteraction(it: Interaction, stageName: (id: string | null | undefined) => string): string`
  - `useCrmClient(clientId: string | null): { client: Client | null; channels: ContactChannel[]; interactions: Interaction[]; loading: boolean; refetch: () => Promise<void>; addNote: (body: string) => Promise<{ error: Error | null }>; updateField: (changes: Partial<Client>) => Promise<{ error: Error | null }>; changeStage: (toStageId: string | null) => Promise<{ error: Error | null }>; addChannel: (type: ContactChannel['type'], value: string) => Promise<{ error: Error | null }> }`

- [ ] **Step 1: Write the failing test for `describeInteraction`**

Create `src/hooks/data/useCrmClient.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { describeInteraction } from './useCrmClient';
import type { Interaction } from './crmTypes';

const mk = (over: Partial<Interaction>): Interaction => ({
  id: 'i', company_id: 'c1', client_id: 'cl1', author_id: null, type: 'note',
  body: null, metadata: {}, created_at: '', ...over,
});
const stageName = (id: string | null | undefined) => (id === 's1' ? 'Prospecção' : id === 's2' ? 'Proposta' : 'Sem etapa');

describe('describeInteraction', () => {
  it('note returns its body', () => {
    expect(describeInteraction(mk({ type: 'note', body: 'Ligar amanhã' }), stageName)).toBe('Ligar amanhã');
  });
  it('stage_change describes the transition using stage names', () => {
    const it = mk({ type: 'stage_change', metadata: { from_stage_id: 's1', to_stage_id: 's2' } });
    expect(describeInteraction(it, stageName)).toBe('Mudou de Prospecção para Proposta');
  });
  it('contact returns a generic label when body is empty', () => {
    expect(describeInteraction(mk({ type: 'contact', body: null }), stageName)).toBe('Contato registrado');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/data/useCrmClient.test.ts`
Expected: FAIL — cannot resolve `describeInteraction`.

- [ ] **Step 3: Write `useCrmClient.ts`**

Create `src/hooks/data/useCrmClient.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/hooks/data/useCrmClient.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify build + commit**

```bash
npm run build
git add src/hooks/data/useCrmClient.ts src/hooks/data/useCrmClient.test.ts
git commit -m "feat(crm): hook agregado do cliente (contatos, histórico, nota, etapa, campos)"
```

---

### Task 3: Timeline, task, and quick-add components

**Files:**
- Create: `src/components/hq/crm/TimelineItem.tsx`
- Create: `src/components/hq/crm/TaskItem.tsx`
- Test: `src/components/hq/crm/TaskItem.test.tsx`
- Create: `src/components/hq/crm/QuickTaskInput.tsx`
- Test: `src/components/hq/crm/QuickTaskInput.test.tsx`

**Interfaces:**
- Consumes: `Interaction`, `CrmTask` (crmTypes); `describeInteraction` (`@/hooks/data/useCrmClient`).
- Produces:
  - `TimelineItem({ interaction, text }: { interaction: Interaction; text: string })`
  - `TaskItem({ task, onToggle }: { task: CrmTask; onToggle: (id: string, done: boolean) => void })`
  - `QuickTaskInput({ fixedClientId, clients, onAdd }: { fixedClientId?: string; clients?: { id: string; name: string }[]; onAdd: (title: string, dueDate: string | null, clientId: string) => void | Promise<unknown> })`

- [ ] **Step 1: Write the failing tests**

Create `src/components/hq/crm/TaskItem.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskItem from './TaskItem';
import type { CrmTask } from '@/hooks/data/crmTypes';

const task = (over: Partial<CrmTask>): CrmTask => ({
  id: 't1', company_id: 'c1', client_id: 'cl1', title: 'Ligar', due_date: null,
  assignee_id: null, status: 'pending', completed_at: null, created_at: '', updated_at: '', ...over,
});

describe('TaskItem', () => {
  it('shows the title', () => {
    render(<TaskItem task={task({ title: 'Enviar proposta' })} onToggle={vi.fn()} />);
    expect(screen.getByText('Enviar proposta')).toBeInTheDocument();
  });
  it('toggles to done when a pending task is clicked', () => {
    const onToggle = vi.fn();
    render(<TaskItem task={task({ id: 't9', status: 'pending' })} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('t9', true);
  });
});
```

Create `src/components/hq/crm/QuickTaskInput.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickTaskInput from './QuickTaskInput';

describe('QuickTaskInput', () => {
  it('calls onAdd with the title and the fixed client id, then clears', () => {
    const onAdd = vi.fn();
    render(<QuickTaskInput fixedClientId="cl1" onAdd={onAdd} />);
    const input = screen.getByPlaceholderText(/nova tarefa/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Follow-up' } });
    fireEvent.submit(input.closest('form')!);
    expect(onAdd).toHaveBeenCalledWith('Follow-up', null, 'cl1');
    expect(input.value).toBe('');
  });
  it('does not call onAdd when the title is blank', () => {
    const onAdd = vi.fn();
    render(<QuickTaskInput fixedClientId="cl1" onAdd={onAdd} />);
    fireEvent.submit(screen.getByPlaceholderText(/nova tarefa/i).closest('form')!);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/hq/crm/TaskItem.test.tsx src/components/hq/crm/QuickTaskInput.test.tsx`
Expected: FAIL — cannot resolve the components.

- [ ] **Step 3: Write `TimelineItem.tsx`**

Create `src/components/hq/crm/TimelineItem.tsx`:

```tsx
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, ArrowRightLeft, Phone, Cog } from 'lucide-react';
import type { Interaction } from '@/hooks/data/crmTypes';

const ICONS: Record<Interaction['type'], typeof MessageSquare> = {
  note: MessageSquare, stage_change: ArrowRightLeft, contact: Phone, task: MessageSquare, system: Cog,
};

export default function TimelineItem({ interaction, text }: { interaction: Interaction; text: string }) {
  const Icon = ICONS[interaction.type] ?? MessageSquare;
  const when = interaction.created_at
    ? formatDistanceToNow(new Date(interaction.created_at), { addSuffix: true, locale: ptBR })
    : '';
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center shrink-0">
        <Icon size={13} className="text-zinc-500" />
      </div>
      <div className="flex-1 min-w-0 pb-4 border-b border-zinc-100 dark:border-white/5">
        <p className="text-sm text-navy dark:text-white break-words">{text}</p>
        <p className="text-[10px] text-zinc-400 mt-0.5">{when}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `TaskItem.tsx`**

Create `src/components/hq/crm/TaskItem.tsx`:

```tsx
import { CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import type { CrmTask } from '@/hooks/data/crmTypes';

export default function TaskItem({ task, onToggle }: { task: CrmTask; onToggle: (id: string, done: boolean) => void }) {
  const done = task.status === 'done';
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer group">
      <input
        type="checkbox"
        role="checkbox"
        checked={done}
        onChange={() => onToggle(task.id, !done)}
        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
      />
      <span className={`flex-1 text-sm ${done ? 'line-through text-zinc-400' : 'text-navy dark:text-white'}`}>
        {task.title}
      </span>
      {task.due_date && (
        <span className="flex items-center gap-1 text-[10px] text-zinc-400">
          <CalendarClock size={11} /> {format(new Date(task.due_date + 'T00:00:00'), 'dd/MM')}
        </span>
      )}
    </label>
  );
}
```

- [ ] **Step 5: Write `QuickTaskInput.tsx`**

Create `src/components/hq/crm/QuickTaskInput.tsx`:

```tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function QuickTaskInput({
  fixedClientId, clients, onAdd,
}: {
  fixedClientId?: string;
  clients?: { id: string; name: string }[];
  onAdd: (title: string, dueDate: string | null, clientId: string) => void | Promise<unknown>;
}) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [clientId, setClientId] = useState(fixedClientId ?? clients?.[0]?.id ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const target = fixedClientId ?? clientId;
    if (!title.trim() || !target) return;
    onAdd(title.trim(), due || null, target);
    setTitle('');
    setDue('');
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nova tarefa (ex: ligar de volta)"
        className="flex-1 min-w-[10rem] bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500"
      />
      {!fixedClientId && clients && (
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300 focus:outline-none">
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
        className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300 focus:outline-none" />
      <button type="submit"
        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-2 rounded-xl transition-colors shadow-md shadow-blue-500/20">
        <Plus size={15} /> Add
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/components/hq/crm/TaskItem.test.tsx src/components/hq/crm/QuickTaskInput.test.tsx`
Expected: PASS (4 tests total).

- [ ] **Step 7: Verify build + commit**

```bash
npm run build
git add src/components/hq/crm/TimelineItem.tsx src/components/hq/crm/TaskItem.tsx src/components/hq/crm/QuickTaskInput.tsx src/components/hq/crm/TaskItem.test.tsx src/components/hq/crm/QuickTaskInput.test.tsx
git commit -m "feat(crm): componentes de timeline, tarefa e criação rápida"
```

---

### Task 4: Client detail screen

**Files:**
- Rewrite: `src/pages/hq/crm/CrmClientDetail.tsx`

**Interfaces:**
- Consumes: `useParams`/`Link` (react-router-dom); `useCrmCompany`, `useCrmClient` (+`describeInteraction`), `useCrmTasks`, `useCrmStages`, `useCrmMembers`, `StageBadge`, `TimelineItem`, `TaskItem`, `QuickTaskInput`, `CrmLoading`/`CrmNoAccess`.
- Produces: default `CrmClientDetail` page.

- [ ] **Step 1: Rewrite `CrmClientDetail.tsx`**

Replace the file. Single-screen layout: back link + header card (name, `StageBadge`, estimated value in BRL, owner, source) with inline stage/owner edit; a two-column body — left: history timeline with an "add note" box; right: contacts list + tasks (this client's, via `useCrmTasks` filtered by `client_id`) with `QuickTaskInput fixedClientId`.

```tsx
import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmClient, describeInteraction } from '@/hooks/data/useCrmClient';
import { useCrmTasks } from '@/hooks/data/useCrmTasks';
import { useCrmStages } from '@/hooks/data/useCrmStages';
import { useCrmMembers } from '@/hooks/data/useCrmMembers';
import StageBadge from '@/components/hq/crm/StageBadge';
import TimelineItem from '@/components/hq/crm/TimelineItem';
import TaskItem from '@/components/hq/crm/TaskItem';
import QuickTaskInput from '@/components/hq/crm/QuickTaskInput';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function CrmClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { companyId, loading: companyLoading } = useCrmCompany();
  const { client, channels, interactions, loading, addNote, updateField, changeStage } = useCrmClient(id ?? null);
  const { tasks, addTask, toggleTask } = useCrmTasks(companyId);
  const { stages } = useCrmStages(companyId);
  const { members } = useCrmMembers(companyId);

  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const stageById = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s])), [stages]);
  const stageName = (sid: string | null | undefined) => (sid && stageById[sid]?.name) || 'Sem etapa';
  const clientTasks = useMemo(() => tasks.filter((t) => t.client_id === id), [tasks, id]);

  async function submitNote() {
    if (!note.trim()) return;
    setSending(true);
    const { error } = await addNote(note.trim());
    setSending(false);
    if (error) toast.error('Erro ao salvar anotação.'); else setNote('');
  }

  if (companyLoading || loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;
  if (!client) return <p className="text-center py-20 text-zinc-400">Cliente não encontrado.</p>;

  return (
    <div className="w-full max-w-[1100px] mx-auto space-y-5">
      <Link to="/hq/crm/leads" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-navy dark:hover:text-white">
        <ArrowLeft size={15} /> Voltar aos leads
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-navy dark:text-white">{client.name}</h1>
              <StageBadge stage={client.stage_id ? stageById[client.stage_id] : undefined} />
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">{client.source || 'Origem não informada'}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {client.estimated_value != null ? BRL.format(client.estimated_value) : '—'}
            </p>
            <p className="text-[11px] text-zinc-500">valor estimado</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <label className="text-xs font-bold text-zinc-500">Etapa
            <select value={client.stage_id ?? ''} onChange={(e) => changeStage(e.target.value || null)}
              className="mt-1 w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm text-navy dark:text-white focus:outline-none">
              <option value="">Sem etapa</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-zinc-500">Responsável
            <select value={client.owner_id ?? ''} onChange={(e) => updateField({ owner_id: e.target.value || null })}
              className="mt-1 w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm text-navy dark:text-white focus:outline-none">
              <option value="">Sem responsável</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* History */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-sm text-navy dark:text-white mb-3">Histórico</h2>
          <div className="flex gap-2 mb-4">
            <input value={note} onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitNote(); }}
              placeholder="Adicionar anotação..."
              className="flex-1 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500" />
            <button onClick={submitNote} disabled={sending}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-60">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <div className="space-y-3">
            {interactions.length === 0 && <p className="text-sm text-zinc-400 py-6 text-center">Sem histórico ainda.</p>}
            {interactions.map((it) => (
              <TimelineItem key={it.id} interaction={it} text={describeInteraction(it, stageName)} />
            ))}
          </div>
        </div>

        {/* Sidebar: contacts + tasks */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-sm text-navy dark:text-white mb-3">Contatos</h2>
            {channels.length === 0 && <p className="text-xs text-zinc-400">Nenhum contato cadastrado.</p>}
            <ul className="space-y-1.5">
              {channels.map((ch) => (
                <li key={ch.id} className="text-sm text-zinc-600 dark:text-zinc-300">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 mr-2">{ch.type}</span>{ch.value}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-sm text-navy dark:text-white mb-3">Tarefas</h2>
            <QuickTaskInput fixedClientId={client.id} onAdd={(title, dueDate, clientId) => addTask({ title, due_date: dueDate, client_id: clientId, assignee_id: null })} />
            <div className="mt-2">
              {clientTasks.length === 0 && <p className="text-xs text-zinc-400 py-2">Nenhuma tarefa.</p>}
              {clientTasks.map((t) => <TaskItem key={t.id} task={t} onToggle={toggleTask} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: clean. Manually confirm: `describeInteraction` renders stage-change lines with stage names; note add prepends a timeline item; stage/owner selects call `changeStage`/`updateField`; quick task add + toggle work; back link goes to `/hq/crm/leads`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/hq/crm/CrmClientDetail.tsx
git commit -m "feat(crm): tela única do cliente (dados, contatos, histórico, tarefas)"
```

---

### Task 5: Company tasks screen

**Files:**
- Rewrite: `src/pages/hq/crm/CrmTasks.tsx`

**Interfaces:**
- Consumes: `useCrmCompany`, `useCrmTasks` (+`bucketTasks`), `useCrmClients` (for the client picker + names), `QuickTaskInput`, `TaskItem`, `CrmLoading`/`CrmNoAccess`.
- Produces: default `CrmTasks` page.

- [ ] **Step 1: Rewrite `CrmTasks.tsx`**

Replace the file. Company-wide tasks grouped into Atrasadas / Hoje / Próximas / Concluídas via `bucketTasks`, a `QuickTaskInput` with a client picker (tasks require a client), and toggle-done.

```tsx
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmTasks, bucketTasks } from '@/hooks/data/useCrmTasks';
import { useCrmClients } from '@/hooks/data/useCrmClients';
import QuickTaskInput from '@/components/hq/crm/QuickTaskInput';
import TaskItem from '@/components/hq/crm/TaskItem';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';
import type { CrmTask } from '@/hooks/data/crmTypes';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SECTIONS: { key: keyof ReturnType<typeof bucketTasks>; label: string; tone: string }[] = [
  { key: 'overdue', label: 'Atrasadas', tone: 'text-rose-500' },
  { key: 'today', label: 'Hoje', tone: 'text-blue-600 dark:text-blue-400' },
  { key: 'upcoming', label: 'Próximas', tone: 'text-navy dark:text-white' },
  { key: 'done', label: 'Concluídas', tone: 'text-zinc-400' },
];

export default function CrmTasks() {
  const { companyId, loading: companyLoading } = useCrmCompany();
  const { tasks, loading, addTask, toggleTask } = useCrmTasks(companyId);
  const { clients } = useCrmClients(companyId);

  const buckets = useMemo(() => bucketTasks(tasks, todayISO()), [tasks]);
  const clientOptions = useMemo(() => clients.map((c) => ({ id: c.id, name: c.name })), [clients]);

  async function handleToggle(id: string, done: boolean) {
    const { error } = await toggleTask(id, done);
    if (error) toast.error('Erro ao atualizar tarefa.');
  }
  async function handleAdd(title: string, dueDate: string | null, clientId: string) {
    const { error } = await addTask({ title, due_date: dueDate, client_id: clientId, assignee_id: null });
    if (error) toast.error('Erro ao criar tarefa.');
  }

  if (companyLoading || loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;

  return (
    <div className="w-full max-w-[900px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white">Tarefas</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Follow-ups e próximas ações</p>
      </div>

      <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
        {clientOptions.length === 0
          ? <p className="text-sm text-zinc-400">Cadastre um lead antes de criar tarefas.</p>
          : <QuickTaskInput clients={clientOptions} onAdd={handleAdd} />}
      </div>

      {SECTIONS.map((sec) => {
        const list = buckets[sec.key] as CrmTask[];
        if (list.length === 0) return null;
        return (
          <div key={sec.key}>
            <h2 className={`text-xs font-bold uppercase tracking-wide mb-1 ${sec.tone}`}>{sec.label} ({list.length})</h2>
            <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 divide-y divide-zinc-100 dark:divide-white/5 shadow-sm">
              {list.map((t) => <TaskItem key={t.id} task={t} onToggle={handleToggle} />)}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && <p className="text-center py-14 text-zinc-400 text-sm">Nenhuma tarefa ainda.</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: clean. Manually confirm: sections render per bucket, quick add with client picker creates a task, toggling moves a task to Concluídas.

- [ ] **Step 3: Commit**

```bash
git add src/pages/hq/crm/CrmTasks.tsx
git commit -m "feat(crm): tela de tarefas da empresa (agrupada por vencimento, criação rápida)"
```

---

## Manual verification (browser, logged-in admin)

1. From `/hq/crm/leads`, click a lead → `/hq/crm/clients/:id` opens the single-screen view: header with name/stage/value/owner/source, contacts, history, tasks.
2. Add a note → it appears at the top of the history immediately.
3. Change stage in the detail → a "Mudou de X para Y" line appears in the history; change owner/value persists.
4. Add a task from the detail (fixed client) → appears in the client's task list; toggle done → strikes through.
5. `/hq/crm/tasks` → tasks grouped Atrasadas/Hoje/Próximas/Concluídas; quick-add with a client picker creates a task; toggling moves it to Concluídas.

---

## Self-Review

**Spec coverage (F3 slice):**
- Client single-screen: data, contacts, current stage, estimated value, owner, chronological history, open tasks, next actions → Task 4 (uses Tasks 1–3). ✔
- History as a chronological timeline (stage changes, notes, contacts) → `useCrmClient` interactions + `describeInteraction` + `TimelineItem` (Tasks 2–3). ✔
- Tasks very fast to create (few clicks) → `QuickTaskInput` (Task 3), used on both screens. ✔
- Company tasks screen grouped by due date → Task 5 + `bucketTasks` (Task 1). ✔
- Reuse existing pieces (`StageBadge`, `useCrmStages/Members`, `CrmStates`, `useUpdates` timeline idiom) → Tasks 4–5. ✔
- Multi-tenant + append-only history honored → per-client inserts use `client.company_id`; interactions only inserted, never updated/deleted. ✔
- Deferred: Dashboard (F4), Settings/stage+rule editors (F5). Not gaps.

**Placeholder scan:** none — every hook, pure helper, test, component, and both pages are fully coded. No `return null` placeholders in this phase.

**Type consistency:** `NewTask`, `TaskBuckets`, `bucketTasks`, `describeInteraction(it, stageName)`, and the `useCrmTasks`/`useCrmClient` return shapes match across the tasks that define and consume them. `QuickTaskInput.onAdd(title, dueDate, clientId)` matches both call sites (detail passes `fixedClientId`; tasks page passes `clients`). `TaskItem.onToggle(id, done)` matches `toggleTask(id, done)`. `TimelineItem` takes `{ interaction, text }` and is fed `describeInteraction(...)`. ✔
```

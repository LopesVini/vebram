# CRM UI — Phase 2 (Leads + Pipeline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `/hq/crm/leads` and `/hq/crm/pipeline` shells into working screens — a searchable/filterable/sortable leads list with create/edit/delete + owner/stage changes, and a Kanban pipeline with drag-and-drop between stages that persists to the DB and records a stage-change interaction.

**Architecture:** Three hand-rolled data hooks scoped by the active `companyId` from `useCrmCompany()` (`useCrmClients`, `useCrmStages`, `useCrmMembers`), each with a pure, unit-tested helper for the logic that does not touch Supabase. UI reuses the existing HQ list/modal patterns (framer-motion cards, hand-rolled modal chrome from `HqClients.tsx`) and `@dnd-kit` (installed in Phase 1) for the Kanban.

**Tech Stack:** React 18 + TypeScript, Supabase client, `@dnd-kit/core` + `@dnd-kit/sortable`, `framer-motion`, `sonner`, `lucide-react`, `date-fns`, vitest + Testing Library.

## Global Constraints

- Import alias `@/` → `src/`. pt-BR user-facing strings.
- Hand-rolled data hooks (no React Query); `supabase.from(...)`; local `useState`; optimistic updates; every mutation returns `{ error }`.
- **Multi-tenant:** every CRM query filters `.eq('company_id', companyId)`; every insert sets `company_id: companyId`. RLS is the backstop, not the only guard. Skip all fetching while `companyId` is `null`.
- Reuse existing components/patterns before creating new ones. Mirror the modal chrome, `.modal-input` scoped style, and `MField` helper from `src/pages/hq/HqClients.tsx` (lines 265–398 and 582–592). Match `navy`/`navy-light`/`navy-dark` palette, active `bg-blue-600 text-white`, `rounded-xl`/`rounded-2xl`, dark-mode `dark:` classes.
- Types come from `src/hooks/data/crmTypes.ts` (Phase 1) — do not redefine `Client`, `PipelineStage`, `CrmRole`, etc.
- On any mutation error, show a `sonner` toast and revert the optimistic change.
- Tests: `npx vitest run <path>`. Build: `npm run build`. Lint: `npm run lint`. Dev server: port 8080.
- Runtime requires the CRM migrations already applied (done) and the logged-in admin to have a membership (done — seeded as owner of Vértice).

---

## File Structure

- Create `src/hooks/data/useCrmStages.ts` — `activeStagesSorted` pure helper + `useCrmStages(companyId)` read hook. (Task 1)
- Create `src/hooks/data/useCrmStages.test.ts` — unit tests for `activeStagesSorted`. (Task 1)
- Create `src/hooks/data/useCrmMembers.ts` — `useCrmMembers(companyId)` read hook (owner-select options). (Task 1)
- Create `src/hooks/data/useCrmClients.ts` — `filterSortClients` pure helper + `useCrmClients(companyId)` (list + save/update/delete/moveStage). (Task 2)
- Create `src/hooks/data/useCrmClients.test.ts` — unit tests for `filterSortClients`. (Task 2)
- Create `src/components/hq/crm/StageBadge.tsx` — pure stage pill. (Task 3)
- Create `src/components/hq/crm/StageBadge.test.tsx` — render tests. (Task 3)
- Create `src/components/hq/crm/LeadFormDialog.tsx` — create/edit lead modal. (Task 3)
- Rewrite `src/pages/hq/crm/CrmLeads.tsx` — leads list screen. (Task 4)
- Create `src/components/hq/crm/LeadCard.tsx` — draggable Kanban card. (Task 5)
- Create `src/components/hq/crm/KanbanColumn.tsx` — droppable stage column. (Task 5)
- Rewrite `src/pages/hq/crm/CrmPipeline.tsx` — Kanban board with dnd. (Task 5)

Note: `CrmLeads.tsx` and `CrmPipeline.tsx` currently delegate to `CrmPlaceholderPage`; Tasks 4–5 replace those bodies. `CrmPlaceholderPage` stays in use by the other four shells.

---

### Task 1: Stage + member read hooks

**Files:**
- Create: `src/hooks/data/useCrmStages.ts`
- Test: `src/hooks/data/useCrmStages.test.ts`
- Create: `src/hooks/data/useCrmMembers.ts`

**Interfaces:**
- Consumes (Phase 1): `PipelineStage`, `CrmRole` from `@/hooks/data/crmTypes`; `supabase` from `@/lib/supabase`.
- Produces:
  - `activeStagesSorted(stages: PipelineStage[]): PipelineStage[]`
  - `useCrmStages(companyId: string | null): { stages: PipelineStage[]; loading: boolean; refetch: () => Promise<void> }` (stages are active-only, ordered by `position`)
  - `CrmMember` type `{ user_id: string; name: string; role: CrmRole }`
  - `useCrmMembers(companyId: string | null): { members: CrmMember[]; loading: boolean }`

- [ ] **Step 1: Write the failing test for `activeStagesSorted`**

Create `src/hooks/data/useCrmStages.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { activeStagesSorted } from './useCrmStages';
import type { PipelineStage } from './crmTypes';

const mk = (id: string, position: number, is_active = true): PipelineStage => ({
  id, company_id: 'c1', name: id, position, stage_type: 'open',
  color: null, is_active, created_at: '',
});

describe('activeStagesSorted', () => {
  it('drops inactive stages', () => {
    const out = activeStagesSorted([mk('a', 1), mk('b', 2, false)]);
    expect(out.map((s) => s.id)).toEqual(['a']);
  });
  it('orders by position ascending', () => {
    const out = activeStagesSorted([mk('c', 3), mk('a', 1), mk('b', 2)]);
    expect(out.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
  it('does not mutate its input', () => {
    const input = [mk('c', 3), mk('a', 1)];
    activeStagesSorted(input);
    expect(input.map((s) => s.id)).toEqual(['c', 'a']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/data/useCrmStages.test.ts`
Expected: FAIL — cannot resolve `activeStagesSorted`.

- [ ] **Step 3: Write `useCrmStages.ts`**

Create `src/hooks/data/useCrmStages.ts`:

```ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PipelineStage } from '@/hooks/data/crmTypes';

// Pura: etapas ativas, ordenadas por posição (sem mutar a entrada).
export function activeStagesSorted(stages: PipelineStage[]): PipelineStage[] {
  return stages.filter((s) => s.is_active).slice().sort((a, b) => a.position - b.position);
}

export function useCrmStages(companyId: string | null) {
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
    setStages(activeStagesSorted((data as PipelineStage[]) || []));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { stages, loading, refetch };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/hooks/data/useCrmStages.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write `useCrmMembers.ts`**

Create `src/hooks/data/useCrmMembers.ts`:

```ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CrmRole } from '@/hooks/data/crmTypes';

export interface CrmMember { user_id: string; name: string; role: CrmRole; }

// Duas queries em vez de embed: NÃO existe FK memberships->profiles (ambos
// referenciam auth.users), então PostgREST não resolve `profile:profiles(...)`.
// Funciona porque os usuários do CRM são admins globais e leem todos os profiles.
// NOTA (futuro): quando existirem membros 'vendedor' não-admin, a RLS de profiles
// esconde os colegas — trocar por um RPC security definer gated por is_member_of.
export function useCrmMembers(companyId: string | null) {
  const [members, setMembers] = useState<CrmMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) { setMembers([]); setLoading(false); return; }
    setLoading(true);
    const { data: mem } = await supabase
      .from('memberships')
      .select('user_id, role')
      .eq('company_id', companyId);
    const rows = (mem as { user_id: string; role: CrmRole }[]) || [];
    if (rows.length === 0) { setMembers([]); setLoading(false); return; }
    const ids = rows.map((r) => r.user_id);
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', ids);
    const nameById: Record<string, string> = {};
    for (const p of (profs as { id: string; display_name: string | null; email: string | null }[]) || []) {
      nameById[p.id] = p.display_name || p.email || 'Sem nome';
    }
    setMembers(rows.map((r) => ({ user_id: r.user_id, role: r.role, name: nameById[r.user_id] || 'Sem nome' })));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  return { members, loading };
}
```

- [ ] **Step 6: Verify build + tests**

Run: `npm run build && npx vitest run src/hooks/data/useCrmStages.test.ts`
Expected: build succeeds; 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/data/useCrmStages.ts src/hooks/data/useCrmStages.test.ts src/hooks/data/useCrmMembers.ts
git commit -m "feat(crm): hooks de leitura de etapas e membros do CRM"
```

---

### Task 2: Clients hook + filter/sort logic

**Files:**
- Create: `src/hooks/data/useCrmClients.ts`
- Test: `src/hooks/data/useCrmClients.test.ts`

**Interfaces:**
- Consumes (Phase 1): `Client` from `@/hooks/data/crmTypes`; `supabase`.
- Produces:
  - `type LeadSort = 'recent' | 'value' | 'name'`
  - `interface LeadFilter { stageId: string | 'all'; ownerId: string | 'all'; source: string | 'all' }`
  - `filterSortClients(clients: Client[], search: string, filter: LeadFilter, sort: LeadSort): Client[]`
  - `interface NewLead { name: string; source: string | null; estimated_value: number | null; stage_id: string | null; owner_id: string | null }`
  - `useCrmClients(companyId: string | null): { clients: Client[]; loading: boolean; refetch: () => Promise<void>; saveClient: (lead: NewLead) => Promise<{ error: Error | null }>; updateClient: (id: string, changes: Partial<Client>) => Promise<{ error: Error | null }>; deleteClient: (id: string) => Promise<{ error: Error | null }>; moveClientStage: (id: string, toStageId: string) => Promise<{ error: Error | null }> }`

- [ ] **Step 1: Write the failing test for `filterSortClients`**

Create `src/hooks/data/useCrmClients.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterSortClients, type LeadFilter } from './useCrmClients';
import type { Client } from './crmTypes';

const base = (over: Partial<Client>): Client => ({
  id: 'x', company_id: 'c1', name: 'X', source: null, entered_at: '2026-01-01T00:00:00Z',
  owner_id: null, stage_id: null, estimated_value: null, lost_reason: null, lost_at: null,
  created_at: '', updated_at: '', ...over,
});
const ALL: LeadFilter = { stageId: 'all', ownerId: 'all', source: 'all' };

describe('filterSortClients', () => {
  const a = base({ id: 'a', name: 'Alfa', source: 'site', stage_id: 's1', owner_id: 'u1', estimated_value: 100, entered_at: '2026-01-03T00:00:00Z' });
  const b = base({ id: 'b', name: 'Beta', source: 'indicação', stage_id: 's2', owner_id: 'u2', estimated_value: 300, entered_at: '2026-01-01T00:00:00Z' });
  const c = base({ id: 'c', name: 'Gama', source: 'site', stage_id: 's1', owner_id: 'u1', estimated_value: 200, entered_at: '2026-01-02T00:00:00Z' });
  const list = [a, b, c];

  it('searches by name (case-insensitive)', () => {
    expect(filterSortClients(list, 'be', ALL, 'name').map((x) => x.id)).toEqual(['b']);
  });
  it('searches by source', () => {
    expect(filterSortClients(list, 'indica', ALL, 'name').map((x) => x.id)).toEqual(['b']);
  });
  it('filters by stage', () => {
    const f = { ...ALL, stageId: 's1' };
    expect(filterSortClients(list, '', f, 'name').map((x) => x.id).sort()).toEqual(['a', 'c']);
  });
  it('filters by owner', () => {
    const f = { ...ALL, ownerId: 'u2' };
    expect(filterSortClients(list, '', f, 'name').map((x) => x.id)).toEqual(['b']);
  });
  it('filters by source value', () => {
    const f = { ...ALL, source: 'site' };
    expect(filterSortClients(list, '', f, 'name').map((x) => x.id).sort()).toEqual(['a', 'c']);
  });
  it('sorts by recent (entered_at desc)', () => {
    expect(filterSortClients(list, '', ALL, 'recent').map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });
  it('sorts by value desc (nulls last)', () => {
    const withNull = [...list, base({ id: 'd', estimated_value: null })];
    expect(filterSortClients(withNull, '', ALL, 'value').map((x) => x.id)).toEqual(['b', 'c', 'a', 'd']);
  });
  it('sorts by name asc', () => {
    expect(filterSortClients(list, '', ALL, 'name').map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/data/useCrmClients.test.ts`
Expected: FAIL — cannot resolve `filterSortClients`.

- [ ] **Step 3: Write `useCrmClients.ts`**

Create `src/hooks/data/useCrmClients.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/hooks/data/useCrmClients.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/data/useCrmClients.ts src/hooks/data/useCrmClients.test.ts
git commit -m "feat(crm): hook de clientes/leads (CRUD, move de etapa, filtro/ordenação puros)"
```

---

### Task 3: StageBadge + LeadFormDialog

**Files:**
- Create: `src/components/hq/crm/StageBadge.tsx`
- Test: `src/components/hq/crm/StageBadge.test.tsx`
- Create: `src/components/hq/crm/LeadFormDialog.tsx`

**Interfaces:**
- Consumes: `PipelineStage`, `Client` (crmTypes); `CrmMember` (`@/hooks/data/useCrmMembers`); `NewLead`, `useCrmClients` return (`@/hooks/data/useCrmClients`).
- Produces:
  - `StageBadge({ stage }: { stage?: PipelineStage })` — pill; falls back to a neutral "Sem etapa" when `stage` is undefined.
  - `LeadFormDialog({ initial, stages, members, onClose, onSubmit }: { initial?: Client | null; stages: PipelineStage[]; members: CrmMember[]; onClose: () => void; onSubmit: (lead: NewLead, id?: string) => Promise<{ error: Error | null }> })`

- [ ] **Step 1: Write the failing test for `StageBadge`**

Create `src/components/hq/crm/StageBadge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StageBadge from './StageBadge';
import type { PipelineStage } from '@/hooks/data/crmTypes';

const stage = (over: Partial<PipelineStage>): PipelineStage => ({
  id: 's1', company_id: 'c1', name: 'Prospecção', position: 1, stage_type: 'open',
  color: null, is_active: true, created_at: '', ...over,
});

describe('StageBadge', () => {
  it('shows the stage name', () => {
    render(<StageBadge stage={stage({ name: 'Negociação' })} />);
    expect(screen.getByText('Negociação')).toBeInTheDocument();
  });
  it('falls back to "Sem etapa" when no stage', () => {
    render(<StageBadge />);
    expect(screen.getByText(/sem etapa/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/hq/crm/StageBadge.test.tsx`
Expected: FAIL — cannot resolve `./StageBadge`.

- [ ] **Step 3: Write `StageBadge.tsx`**

Create `src/components/hq/crm/StageBadge.tsx`. Color derives from `stage_type` unless a custom `color` is set:

```tsx
import type { PipelineStage } from '@/hooks/data/crmTypes';

const TYPE_STYLES: Record<PipelineStage['stage_type'], string> = {
  open: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  won: 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400',
  lost: 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

export default function StageBadge({ stage }: { stage?: PipelineStage }) {
  if (!stage) {
    return (
      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400">
        Sem etapa
      </span>
    );
  }
  const style = TYPE_STYLES[stage.stage_type];
  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${style}`}
      style={stage.color ? { backgroundColor: `${stage.color}22`, color: stage.color } : undefined}
    >
      {stage.name}
    </span>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/hq/crm/StageBadge.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Write `LeadFormDialog.tsx`**

Create `src/components/hq/crm/LeadFormDialog.tsx`. **Mirror the modal chrome** from `src/pages/hq/HqClients.tsx` — the outer `motion.div` overlay + inner `motion.div` panel (lines 265–293), the footer buttons (lines 364–374), the `.modal-input` `<style>` block (lines 378–397), and the `MField` helper (lines 582–592; copy it into this file). Use these CRM fields instead of the client fields:

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Contact, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Client, PipelineStage } from '@/hooks/data/crmTypes';
import type { CrmMember } from '@/hooks/data/useCrmMembers';
import type { NewLead } from '@/hooks/data/useCrmClients';

export default function LeadFormDialog({
  initial, stages, members, onClose, onSubmit,
}: {
  initial?: Client | null;
  stages: PipelineStage[];
  members: CrmMember[];
  onClose: () => void;
  onSubmit: (lead: NewLead, id?: string) => Promise<{ error: Error | null }>;
}) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [value, setValue] = useState(initial?.estimated_value != null ? String(initial.estimated_value) : '');
  const [stageId, setStageId] = useState(initial?.stage_id ?? (stages[0]?.id ?? ''));
  const [ownerId, setOwnerId] = useState(initial?.owner_id ?? '');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!name.trim()) { setNameError('Informe o nome do lead.'); return; }
    setSaving(true);
    const lead: NewLead = {
      name: name.trim(),
      source: source.trim() || null,
      estimated_value: value.trim() === '' ? null : Number(value),
      stage_id: stageId || null,
      owner_id: ownerId || null,
    };
    const { error } = await onSubmit(lead, initial?.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar lead: ' + error.message);
    } else {
      toast.success(editing ? 'Lead atualizado.' : `Lead "${lead.name}" criado.`);
      onClose();
    }
  }

  // ...outer overlay + panel (mirror HqClients.tsx:265-293), title icon <Contact/>,
  // heading {editing ? 'Editar Lead' : 'Novo Lead'}, then:
  //
  //   <form onSubmit={handleSubmit} className="p-6 space-y-4">
  //     <div className="grid grid-cols-2 gap-4">
  //       <MField label="Nome *" error={nameError} className="col-span-2">
  //         <input value={name} onChange={e => { setName(e.target.value); setNameError(''); }}
  //           placeholder="ex: Construtora Andrade" className="modal-input" />
  //       </MField>
  //       <MField label="Origem">
  //         <input value={source} onChange={e => setSource(e.target.value)}
  //           placeholder="ex: indicação, site, prospecção" className="modal-input" />
  //       </MField>
  //       <MField label="Valor estimado (R$)">
  //         <input type="number" min="0" step="0.01" value={value}
  //           onChange={e => setValue(e.target.value)} placeholder="ex: 15000" className="modal-input" />
  //       </MField>
  //       <MField label="Etapa">
  //         <select value={stageId} onChange={e => setStageId(e.target.value)} className="modal-input">
  //           <option value="">Sem etapa</option>
  //           {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
  //         </select>
  //       </MField>
  //       <MField label="Responsável">
  //         <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className="modal-input">
  //           <option value="">Ninguém</option>
  //           {members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
  //         </select>
  //       </MField>
  //     </div>
  //     ...footer buttons (mirror HqClients.tsx:364-374): Cancelar + submit
  //         label {editing ? 'Salvar' : 'Criar Lead'}, spinner {saving && <Loader2 .../>}
  //   </form>
  //   ...the .modal-input <style> block (copy HqClients.tsx:378-397)
  //
  // Then the local MField helper (copy HqClients.tsx:582-592).
  return null; // replace with the JSX described above
}
```

The implementer must replace the comment block and `return null` with the actual JSX per the description, faithfully reusing the referenced HqClients chrome. Keep the component focused on the form; no data fetching inside it.

- [ ] **Step 6: Verify build + lint + tests**

Run: `npm run build && npm run lint && npx vitest run src/components/hq/crm/StageBadge.test.tsx`
Expected: build + lint clean; 2 tests PASS. Manually confirm the dialog renders both stage and owner `<option>`s and that submit calls `onSubmit` with a `NewLead` (numbers parsed, empty → null).

- [ ] **Step 7: Commit**

```bash
git add src/components/hq/crm/StageBadge.tsx src/components/hq/crm/StageBadge.test.tsx src/components/hq/crm/LeadFormDialog.tsx
git commit -m "feat(crm): StageBadge + modal de criar/editar lead"
```

---

### Task 4: Leads screen

**Files:**
- Rewrite: `src/pages/hq/crm/CrmLeads.tsx`

**Interfaces:**
- Consumes: `useCrmCompany` (`@/hooks/data/useCrmCompany`), `useCrmClients` + `filterSortClients` + `LeadFilter`/`LeadSort`/`NewLead`, `useCrmStages` + `activeStagesSorted`, `useCrmMembers`, `StageBadge`, `LeadFormDialog`, `CrmLoading`/`CrmNoAccess` (`@/components/hq/crm/CrmStates`).
- Produces: default `CrmLeads` page.

- [ ] **Step 1: Rewrite `CrmLeads.tsx`**

Replace the file with the full leads screen. It follows the `HqClients` layout idiom (header with search + primary button, summary tiles, filter row, list, modals via `AnimatePresence`), but reads CRM data and supports stage/owner changes and edit. Handle the `?new=1` query param like `HqClients` does (open the create dialog). Use `useSearchParams`.

```tsx
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Loader2, Inbox, Trash2, Pencil, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmClients, filterSortClients, type LeadFilter, type LeadSort, type NewLead } from '@/hooks/data/useCrmClients';
import { useCrmStages } from '@/hooks/data/useCrmStages';
import { useCrmMembers } from '@/hooks/data/useCrmMembers';
import StageBadge from '@/components/hq/crm/StageBadge';
import LeadFormDialog from '@/components/hq/crm/LeadFormDialog';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';
import type { Client } from '@/hooks/data/crmTypes';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function CrmLeads() {
  const { companyId, loading: companyLoading } = useCrmCompany();
  const { clients, loading, saveClient, updateClient, deleteClient } = useCrmClients(companyId);
  const { stages } = useCrmStages(companyId);
  const { members } = useCrmMembers(companyId);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LeadFilter>({ stageId: 'all', ownerId: 'all', source: 'all' });
  const [sort, setSort] = useState<LeadSort>('recent');
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === '1') { setShowNew(true); setSearchParams({}, { replace: true }); }
  }, [searchParams, setSearchParams]);

  const stageById = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s])), [stages]);
  const ownerName = useMemo(() => Object.fromEntries(members.map((m) => [m.user_id, m.name])), [members]);
  const visible = useMemo(() => filterSortClients(clients, search, filter, sort), [clients, search, filter, sort]);

  const summary = useMemo(() => {
    const total = clients.length;
    const pipelineValue = clients.reduce((sum, c) => sum + (c.estimated_value ?? 0), 0);
    const won = clients.filter((c) => stageById[c.stage_id ?? '']?.stage_type === 'won').length;
    const lost = clients.filter((c) => stageById[c.stage_id ?? '']?.stage_type === 'lost').length;
    return { total, pipelineValue, won, lost };
  }, [clients, stageById]);

  async function handleSubmit(lead: NewLead, id?: string) {
    return id ? updateClient(id, lead) : saveClient(lead);
  }
  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await deleteClient(deleteTarget.id);
    if (error) toast.error('Erro ao excluir lead.'); else toast.success(`Lead "${deleteTarget.name}" excluído.`);
    setDeleteTarget(null);
  }
  async function changeStage(c: Client, stageId: string) {
    const { error } = await updateClient(c.id, { stage_id: stageId || null });
    if (error) toast.error('Erro ao mudar etapa.');
  }
  async function changeOwner(c: Client, ownerId: string) {
    const { error } = await updateClient(c.id, { owner_id: ownerId || null });
    if (error) toast.error('Erro ao mudar responsável.');
  }

  if (companyLoading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy dark:text-white">Leads</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Clientes e oportunidades do funil</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead ou origem..."
              className="w-56 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500 transition-colors shadow-sm" />
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-md shadow-blue-500/20">
            <Plus size={16} /> Novo Lead
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total de Leads', value: String(summary.total), color: 'text-navy dark:text-white' },
          { label: 'Valor do Pipeline', value: BRL.format(summary.pipelineValue), color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Ganhos', value: String(summary.won), color: 'text-green-600 dark:text-green-400' },
          { label: 'Perdidos', value: String(summary.lost), color: 'text-rose-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-center shadow-sm">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setFilter((f) => ({ ...f, stageId: 'all' }))}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter.stageId === 'all' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-navy dark:hover:text-white'}`}>
          Todas etapas
        </button>
        {stages.map((s) => (
          <button key={s.id} onClick={() => setFilter((f) => ({ ...f, stageId: s.id }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter.stageId === s.id ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-navy dark:hover:text-white'}`}>
            {s.name}
          </button>
        ))}
        <select value={sort} onChange={(e) => setSort(e.target.value as LeadSort)}
          className="ml-auto bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-500 focus:outline-none">
          <option value="recent">Mais recentes</option>
          <option value="value">Maior valor</option>
          <option value="name">Nome (A–Z)</option>
        </select>
      </div>

      {/* List */}
      {loading && <div className="flex items-center justify-center py-20 gap-2 text-zinc-400"><Loader2 size={20} className="animate-spin" /> Carregando leads...</div>}
      {!loading && clients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
          <Inbox size={40} className="opacity-30" /><p className="text-sm">Nenhum lead ainda. Crie o primeiro.</p>
        </div>
      )}
      {!loading && clients.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {visible.map((c) => (
              <motion.div key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
                className="group bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 py-3 flex items-center gap-4 hover:shadow-md transition-shadow">
                <button onClick={() => navigate(`/hq/crm/clients/${c.id}`)} className="flex-1 min-w-0 text-left flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-navy dark:text-white truncate group-hover:text-blue-600 transition-colors">{c.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{c.source || 'Origem não informada'}</p>
                  </div>
                </button>
                <span className="hidden md:block text-sm font-bold text-navy dark:text-white shrink-0">
                  {c.estimated_value != null ? BRL.format(c.estimated_value) : '—'}
                </span>
                <select value={c.stage_id ?? ''} onChange={(e) => changeStage(c, e.target.value)} onClick={(e) => e.stopPropagation()}
                  className="hidden sm:block bg-transparent border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none">
                  <option value="">Sem etapa</option>
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={c.owner_id ?? ''} onChange={(e) => changeOwner(c, e.target.value)} onClick={(e) => e.stopPropagation()}
                  className="hidden lg:block bg-transparent border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none max-w-[9rem]">
                  <option value="">Sem responsável</option>
                  {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                </select>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditTarget(c)} className="p-1.5 text-zinc-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" aria-label="Editar"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" aria-label="Excluir"><Trash2 size={14} /></button>
                  <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-600" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {visible.length === 0 && <p className="text-center py-14 text-zinc-400 text-sm">Nenhum lead encontrado{search ? ` para "${search}"` : ''}.</p>}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {(showNew || editTarget) && (
          <LeadFormDialog
            initial={editTarget}
            stages={stages}
            members={members}
            onClose={() => { setShowNew(false); setEditTarget(null); }}
            onSubmit={handleSubmit}
          />
        )}
        {deleteTarget && (
          <ConfirmDelete name={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Confirmação de exclusão — mirror da estrutura de HqClients.tsx:404-441 (mesmas classes),
// com a cópia adaptada para "lead".
function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return null; // replace with the modal JSX mirrored from HqClients.tsx:404-441 (texto adaptado a "lead")
}
```

The implementer must replace the `ConfirmDelete` `return null` with the modal JSX mirrored from `HqClients.tsx:404-441` (same classes and animation, copy adapted to "lead").

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: build + lint clean. Manually confirm: page compiles, imports resolve, `filterSortClients` drives the visible list, stage/owner `<select>`s call the change handlers.

- [ ] **Step 3: Commit**

```bash
git add src/pages/hq/crm/CrmLeads.tsx
git commit -m "feat(crm): tela de Leads (busca, filtro, ordenação, CRUD, troca de etapa/responsável)"
```

---

### Task 5: Pipeline Kanban with drag-and-drop

**Files:**
- Create: `src/components/hq/crm/LeadCard.tsx`
- Create: `src/components/hq/crm/KanbanColumn.tsx`
- Rewrite: `src/pages/hq/crm/CrmPipeline.tsx`

**Interfaces:**
- Consumes: `@dnd-kit/core` (`DndContext`, `DragOverlay`, `PointerSensor`, `useSensor`, `useSensors`, `useDraggable`, `useDroppable`, `closestCorners`, `DragStartEvent`, `DragEndEvent`), `Client`/`PipelineStage`, `useCrmCompany`, `useCrmClients` (`moveClientStage`), `useCrmStages`, `StageBadge`, `CrmLoading`/`CrmNoAccess`.
- Produces: `LeadCard` (draggable), `KanbanColumn` (droppable), default `CrmPipeline`.

- [ ] **Step 1: Write `LeadCard.tsx`**

Create `src/components/hq/crm/LeadCard.tsx`:

```tsx
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import type { Client } from '@/hooks/data/crmTypes';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function LeadCard({ client, overlay = false }: { client: Client; overlay?: boolean }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: client.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => !overlay && navigate(`/hq/crm/clients/${client.id}`)}
      className={`bg-white dark:bg-navy-light/60 border border-zinc-200 dark:border-white/10 rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing select-none ${isDragging && !overlay ? 'opacity-40' : ''} ${overlay ? 'shadow-xl rotate-2' : ''}`}
    >
      <p className="font-bold text-sm text-navy dark:text-white truncate">{client.name}</p>
      <p className="text-[11px] text-zinc-500 truncate">{client.source || 'Sem origem'}</p>
      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
        {client.estimated_value != null ? BRL.format(client.estimated_value) : '—'}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Write `KanbanColumn.tsx`**

Create `src/components/hq/crm/KanbanColumn.tsx`:

```tsx
import { useDroppable } from '@dnd-kit/core';
import type { Client, PipelineStage } from '@/hooks/data/crmTypes';
import LeadCard from '@/components/hq/crm/LeadCard';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function KanbanColumn({ stage, clients }: { stage: PipelineStage; clients: Client[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = clients.reduce((sum, c) => sum + (c.estimated_value ?? 0), 0);
  return (
    <div className="w-72 shrink-0 flex flex-col">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-navy dark:text-white">{stage.name}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-500">{clients.length}</span>
        </div>
        <span className="text-[10px] text-zinc-400">{BRL.format(total)}</span>
      </div>
      <div ref={setNodeRef}
        className={`flex-1 min-h-[8rem] rounded-2xl p-2 space-y-2 transition-colors ${isOver ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-zinc-50 dark:bg-white/[0.03]'}`}>
        {clients.map((c) => <LeadCard key={c.id} client={c} />)}
        {clients.length === 0 && <p className="text-[11px] text-zinc-400 text-center py-6">Arraste um lead para cá</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `CrmPipeline.tsx`**

Replace the file:

```tsx
import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmClients } from '@/hooks/data/useCrmClients';
import { useCrmStages } from '@/hooks/data/useCrmStages';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';
import KanbanColumn from '@/components/hq/crm/KanbanColumn';
import LeadCard from '@/components/hq/crm/LeadCard';
import type { Client } from '@/hooks/data/crmTypes';

export default function CrmPipeline() {
  const { companyId, loading: companyLoading } = useCrmCompany();
  const { clients, loading, moveClientStage } = useCrmClients(companyId);
  const { stages, loading: stagesLoading } = useCrmStages(companyId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStage = useMemo(() => {
    const map: Record<string, Client[]> = {};
    for (const s of stages) map[s.id] = [];
    for (const c of clients) if (c.stage_id && map[c.stage_id]) map[c.stage_id].push(c);
    return map;
  }, [stages, clients]);

  const activeClient = clients.find((c) => c.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) { setActiveId(String(e.active.id)); }
  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const toStageId = e.over ? String(e.over.id) : null;
    if (!toStageId) return;
    const { error } = await moveClientStage(id, toStageId);
    if (error) toast.error('Erro ao mover o lead.');
  }

  if (companyLoading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;

  return (
    <div className="w-full space-y-4">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white">Pipeline</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Arraste os leads entre as etapas do funil</p>
      </div>

      {(loading || stagesLoading) && (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400"><Loader2 size={20} className="animate-spin" /> Carregando pipeline...</div>
      )}

      {!loading && !stagesLoading && stages.length === 0 && (
        <p className="text-center py-16 text-zinc-400 text-sm">Nenhuma etapa configurada. Crie etapas em Configurações do CRM.</p>
      )}

      {!loading && !stagesLoading && stages.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((s) => <KanbanColumn key={s.id} stage={s} clients={byStage[s.id] ?? []} />)}
          </div>
          <DragOverlay>{activeClient ? <LeadCard client={activeClient} overlay /> : null}</DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: build + lint clean. Manually confirm the dnd imports resolve from `@dnd-kit/core` and `@dnd-kit/utilities` and that `moveClientStage` is called on drop.

- [ ] **Step 5: Commit**

```bash
git add src/components/hq/crm/LeadCard.tsx src/components/hq/crm/KanbanColumn.tsx src/pages/hq/crm/CrmPipeline.tsx
git commit -m "feat(crm): pipeline Kanban com drag-and-drop (dnd-kit) + histórico de mudança de etapa"
```

---

## Manual verification (browser, logged-in admin)

After the phase, with the migrations applied and the admin seeded as owner of Vértice:

1. `/hq/crm/leads` — create a lead (name, origem, valor, etapa, responsável); it appears at the top. Edit it; delete it (confirm modal). Search by name/origem. Filter by stage. Sort by value/name/recent. Change stage and owner inline.
2. Summary tiles reflect total, pipeline value (BRL), ganhos/perdidos by stage type.
3. `/hq/crm/pipeline` — one column per active stage; the lead appears in its stage's column. Drag it to another column → it moves, persists (reload keeps it there), and a `stage_change` interaction row is written (verify later in the client history / F3, or via a read-only DB check).
4. Clicking a lead/card navigates to `/hq/crm/clients/:id` (still the placeholder shell until F3).

---

## Self-Review

**Spec coverage (F2 slice of the CRM UI design):**
- Leads: search, filters, sort, create, edit, delete, change owner, change stage → Task 4 (uses Task 2/3 pieces). ✔
- Pipeline: Kanban, column per DB stage, drag-and-drop between stages, auto-persist to DB → Task 5. ✔
- Stage change writes a history entry → `moveClientStage` (Task 2) inserts a `stage_change` interaction. ✔
- Reuse existing patterns (HqClients modal/list idiom, framer-motion, sonner) → Tasks 3–4 explicitly mirror `HqClients.tsx`. ✔
- Multi-tenant scoping (`.eq('company_id', companyId)`, insert sets `company_id`, skip when null) → Tasks 1–2 hooks. ✔
- Types from `crmTypes.ts`, no redefinition → all tasks import from Phase 1. ✔
- Deferred to later phases: client detail screen body (F3), tasks (F3), dashboard (F4), stage/rule editors (F5). Not gaps.

**Placeholder scan:** The two `return null` placeholders (`LeadFormDialog` JSX, `CrmLeads`'s `ConfirmDelete`) are deliberate pattern-reuse instructions pointing at exact `HqClients.tsx` line ranges to mirror — not open-ended TODOs. Every hook, pure helper, test, and the Kanban are fully coded. The implementer is told precisely what JSX to reproduce and from where.

**Type consistency:** `NewLead`, `LeadFilter`, `LeadSort`, `CrmMember`, `filterSortClients`, `activeStagesSorted`, `moveClientStage`, and the `useCrmClients`/`useCrmStages`/`useCrmMembers` return shapes are identical across the tasks that define and consume them. `StageBadge` takes `{ stage?: PipelineStage }` everywhere it's used. Kanban `useDroppable` id = stage id, `useDraggable` id = client id, and `moveClientStage(id, toStageId)` matches `onDragEnd`. ✔
```

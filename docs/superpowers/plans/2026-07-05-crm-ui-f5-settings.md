# CRM UI — Phase 5 (Settings) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `/hq/crm/settings` shell into the CRM configuration screen — a pipeline-stage editor (add / rename / reorder / set type & color / activate) and an automation-rule editor (create/toggle/delete structured trigger→action rules) — so every configurable thing lives as editable DB rows, nothing hardcoded.

**Architecture:** Extend the existing `useCrmStages` with mutations (it is read-only today) behind a pure, unit-tested `reorderStages` helper, and add a `useCrmRules` hook for `automation_rules` CRUD. Two focused components (`StageEditor`, `RuleEditor`) are composed by the `CrmSettings` page. The rule editor only *stores* rules in the structured `{trigger, conditions, action}` shape — no execution engine (out of scope, per the data-foundation spec).

**Tech Stack:** React 18 + TypeScript, Supabase client, `sonner`, `lucide-react`, vitest.

## Global Constraints

- Import alias `@/` → `src/`. pt-BR user-facing strings.
- Hand-rolled hooks (no React Query); `supabase.from(...)`; local `useState`; optimistic updates; mutations return `{ error }`.
- Multi-tenant: every query filters `.eq('company_id', companyId)`; every insert sets `company_id: companyId`; skip fetching while `companyId` is null.
- Types from `src/hooks/data/crmTypes.ts` — do not redefine `PipelineStage`, `AutomationRule`.
- Nothing configurable is hardcoded: stages and rules are DB rows edited through this screen.
- Rules are stored only, in the `{trigger, conditions, action}` jsonb shape. No rule-execution engine, no AI. Conditions are stored as `[]` for now (no conditions UI this phase).
- Reuse existing pieces: `useCrmCompany`, `StageBadge`, `CrmLoading`/`CrmNoAccess`, the `HqClients` modal/`MField` idiom if a dialog is needed. Match `navy`/blue-600/`rounded-xl`-`2xl`/`dark:` styling.
- On mutation error: `sonner` toast + revert optimistic change.
- Tests: `npx vitest run <path>`. Build: `npm run build`. Lint: `npm run lint`. Dev: port 8080.
- Runtime needs the CRM migrations (applied) + a membership (seeded owner). Only company owners should manage config — RLS already restricts writes appropriately for stages/rules (any member) ; owner-gating of the settings screen itself is out of scope.

---

## File Structure

- Modify `src/hooks/data/useCrmStages.ts` — add `includeInactive` option + `reorderStages` pure helper + `saveStage`/`updateStage`/`deleteStage`/`moveStage`. (Task 1)
- Modify `src/hooks/data/useCrmStages.test.ts` — add `reorderStages` tests. (Task 1)
- Create `src/hooks/data/useCrmRules.ts` — `automation_rules` CRUD + rule-shape builders. (Task 2)
- Create `src/hooks/data/useCrmRules.test.ts` — builder unit tests. (Task 2)
- Create `src/components/hq/crm/StageEditor.tsx`. (Task 3)
- Create `src/components/hq/crm/RuleEditor.tsx`. (Task 4)
- Rewrite `src/pages/hq/crm/CrmSettings.tsx`. (Task 5)

---

### Task 1: Stage mutations + reorder helper

**Files:**
- Modify: `src/hooks/data/useCrmStages.ts`
- Modify: `src/hooks/data/useCrmStages.test.ts`

**Interfaces:**
- Consumes: `PipelineStage`, `StageType` (`@/hooks/data/crmTypes`); `supabase`.
- Produces (existing `activeStagesSorted` and the `useCrmStages` read API stay unchanged for current callers):
  - `reorderStages(stages: PipelineStage[], id: string, dir: 'up' | 'down'): { id: string; position: number }[]`
  - `useCrmStages(companyId: string | null, includeInactive?: boolean)` now also returns `saveStage`, `updateStage`, `deleteStage`, `moveStage`:
    - `saveStage(name: string, stageType: StageType): Promise<{ error: Error | null }>`
    - `updateStage(id: string, changes: Partial<PipelineStage>): Promise<{ error: Error | null }>`
    - `deleteStage(id: string): Promise<{ error: Error | null }>`
    - `moveStage(id: string, dir: 'up' | 'down'): Promise<{ error: Error | null }>`

- [ ] **Step 1: Add the failing `reorderStages` tests**

Append to `src/hooks/data/useCrmStages.test.ts` (keep the existing `activeStagesSorted` tests):

```ts
import { reorderStages } from './useCrmStages';

describe('reorderStages', () => {
  const s = (id: string, position: number) => ({
    id, company_id: 'c1', name: id, position, stage_type: 'open' as const, color: null, is_active: true, created_at: '',
  });
  const list = [s('a', 1), s('b', 2), s('c', 3)];

  it('swaps positions with the previous stage on up', () => {
    expect(reorderStages(list, 'b', 'up')).toEqual([{ id: 'b', position: 1 }, { id: 'a', position: 2 }]);
  });
  it('swaps positions with the next stage on down', () => {
    expect(reorderStages(list, 'b', 'down')).toEqual([{ id: 'b', position: 3 }, { id: 'c', position: 2 }]);
  });
  it('is a no-op at the top edge', () => {
    expect(reorderStages(list, 'a', 'up')).toEqual([]);
  });
  it('is a no-op at the bottom edge', () => {
    expect(reorderStages(list, 'c', 'down')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run src/hooks/data/useCrmStages.test.ts`
Expected: FAIL — `reorderStages` is not exported.

- [ ] **Step 3: Rewrite `useCrmStages.ts` with the helper + mutations**

Replace `src/hooks/data/useCrmStages.ts` with (keeps `activeStagesSorted` identical; adds `reorderStages` + the `includeInactive` flag + mutations):

```ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PipelineStage, StageType } from '@/hooks/data/crmTypes';

// Pura: etapas ativas, ordenadas por posição (sem mutar a entrada).
export function activeStagesSorted(stages: PipelineStage[]): PipelineStage[] {
  return stages.filter((s) => s.is_active).slice().sort((a, b) => a.position - b.position);
}

// Pura: calcula as trocas de posição para mover uma etapa p/ cima/baixo.
// Retorna as linhas a atualizar (id + nova position), ou [] se for no-op nas bordas.
export function reorderStages(
  stages: PipelineStage[], id: string, dir: 'up' | 'down',
): { id: string; position: number }[] {
  const sorted = stages.slice().sort((a, b) => a.position - b.position);
  const i = sorted.findIndex((s) => s.id === id);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= sorted.length) return [];
  const a = sorted[i], b = sorted[j];
  return [{ id: a.id, position: b.position }, { id: b.id, position: a.position }];
}

export function useCrmStages(companyId: string | null, includeInactive = false) {
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
    const raw = (data as PipelineStage[]) || [];
    setStages(includeInactive ? raw.slice().sort((a, b) => a.position - b.position) : activeStagesSorted(raw));
    setLoading(false);
  }, [companyId, includeInactive]);

  useEffect(() => { refetch(); }, [refetch]);

  async function saveStage(name: string, stageType: StageType): Promise<{ error: Error | null }> {
    if (!companyId) return { error: new Error('Nenhuma empresa ativa.') };
    const nextPos = stages.reduce((max, s) => Math.max(max, s.position), 0) + 1;
    const { error } = await supabase.from('pipeline_stages').insert({
      company_id: companyId, name, position: nextPos, stage_type: stageType, is_active: true,
    });
    if (!error) await refetch();
    return { error };
  }

  async function updateStage(id: string, changes: Partial<PipelineStage>): Promise<{ error: Error | null }> {
    const prev = stages;
    setStages((cur) => cur.map((s) => (s.id === id ? { ...s, ...changes } : s)));
    const { error } = await supabase.from('pipeline_stages').update(changes).eq('id', id).eq('company_id', companyId);
    if (error) setStages(prev);
    return { error };
  }

  async function deleteStage(id: string): Promise<{ error: Error | null }> {
    const prev = stages;
    setStages((cur) => cur.filter((s) => s.id !== id));
    const { error } = await supabase.from('pipeline_stages').delete().eq('id', id).eq('company_id', companyId);
    if (error) setStages(prev);
    return { error };
  }

  async function moveStage(id: string, dir: 'up' | 'down'): Promise<{ error: Error | null }> {
    const updates = reorderStages(stages, id, dir);
    if (updates.length === 0) return { error: null };
    setStages((cur) => {
      const posById = Object.fromEntries(updates.map((u) => [u.id, u.position]));
      return cur.map((s) => (posById[s.id] != null ? { ...s, position: posById[s.id] } : s))
        .slice().sort((a, b) => a.position - b.position);
    });
    for (const u of updates) {
      const { error } = await supabase.from('pipeline_stages').update({ position: u.position }).eq('id', u.id).eq('company_id', companyId);
      if (error) { await refetch(); return { error }; }
    }
    return { error: null };
  }

  return { stages, loading, refetch, saveStage, updateStage, deleteStage, moveStage };
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npx vitest run src/hooks/data/useCrmStages.test.ts`
Expected: PASS (existing `activeStagesSorted` tests + 4 new `reorderStages` tests).

- [ ] **Step 5: Verify build (current callers still compile) + commit**

Run: `npm run build`
Expected: succeeds — `useCrmStages(companyId)` still works for F2–F4 callers (new args are optional; new return fields are additive).

```bash
git add src/hooks/data/useCrmStages.ts src/hooks/data/useCrmStages.test.ts
git commit -m "feat(crm): mutações de etapas do pipeline (add/editar/remover/reordenar)"
```

---

### Task 2: Automation-rules hook

**Files:**
- Create: `src/hooks/data/useCrmRules.ts`
- Test: `src/hooks/data/useCrmRules.test.ts`

**Interfaces:**
- Consumes: `AutomationRule` (`@/hooks/data/crmTypes`); `supabase`.
- Produces:
  - `interface RuleDraft { name: string; stageId: string; offsetDays: number; taskTitle: string }`
  - `buildTrigger(stageId: string): { type: 'stage_entered'; stage_id: string }`
  - `buildAction(offsetDays: number, taskTitle: string): { type: 'create_task'; offset_days: number; title: string }`
  - `useCrmRules(companyId: string | null): { rules: AutomationRule[]; loading: boolean; refetch: () => Promise<void>; saveRule: (d: RuleDraft) => Promise<{ error: Error | null }>; toggleRule: (id: string, active: boolean) => Promise<{ error: Error | null }>; deleteRule: (id: string) => Promise<{ error: Error | null }> }`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/data/useCrmRules.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildTrigger, buildAction } from './useCrmRules';

describe('rule builders', () => {
  it('buildTrigger encodes a stage-entered trigger', () => {
    expect(buildTrigger('s1')).toEqual({ type: 'stage_entered', stage_id: 's1' });
  });
  it('buildAction encodes a create-task action', () => {
    expect(buildAction(3, 'Follow-up')).toEqual({ type: 'create_task', offset_days: 3, title: 'Follow-up' });
  });
  it('buildAction coerces the offset to a number', () => {
    expect(buildAction(Number('5'), 'X').offset_days).toBe(5);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/hooks/data/useCrmRules.test.ts`
Expected: FAIL — cannot resolve `./useCrmRules`.

- [ ] **Step 3: Write `useCrmRules.ts`**

Create `src/hooks/data/useCrmRules.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/hooks/data/useCrmRules.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify build + commit**

```bash
npm run build
git add src/hooks/data/useCrmRules.ts src/hooks/data/useCrmRules.test.ts
git commit -m "feat(crm): hook de regras de automação (armazenamento estruturado gatilho/ação)"
```

---

### Task 3: Stage editor component

**Files:**
- Create: `src/components/hq/crm/StageEditor.tsx`

**Interfaces:**
- Consumes: `useCrmCompany`, `useCrmStages` (with `includeInactive: true` and its mutations), `StageBadge`, `PipelineStage`/`StageType`.
- Produces: default `StageEditor` component (self-contained; fetches its own stages with inactive included).

- [ ] **Step 1: Write `StageEditor.tsx`**

Create `src/components/hq/crm/StageEditor.tsx`:

```tsx
import { useState } from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmStages } from '@/hooks/data/useCrmStages';
import type { StageType } from '@/hooks/data/crmTypes';

const TYPE_LABEL: Record<StageType, string> = { open: 'Aberta', won: 'Ganho', lost: 'Perdido' };

export default function StageEditor() {
  const { companyId } = useCrmCompany();
  const { stages, loading, saveStage, updateStage, deleteStage, moveStage } = useCrmStages(companyId, true);
  const [name, setName] = useState('');
  const [type, setType] = useState<StageType>('open');

  async function add() {
    if (!name.trim()) return;
    const { error } = await saveStage(name.trim(), type);
    if (error) toast.error('Erro ao criar etapa.'); else { setName(''); setType('open'); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da etapa"
          className="flex-1 min-w-[10rem] bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500" />
        <select value={type} onChange={(e) => setType(e.target.value as StageType)}
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300 focus:outline-none">
          <option value="open">Aberta</option><option value="won">Ganho</option><option value="lost">Perdido</option>
        </select>
        <button onClick={add} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-2 rounded-xl shadow-md shadow-blue-500/20">
          <Plus size={15} /> Adicionar
        </button>
      </div>

      {loading && <p className="text-sm text-zinc-400">Carregando etapas...</p>}
      {!loading && stages.length === 0 && <p className="text-sm text-zinc-400">Nenhuma etapa. Crie a primeira.</p>}

      <ul className="space-y-2">
        {stages.map((s, i) => (
          <li key={s.id} className={`flex flex-wrap items-center gap-2 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 ${s.is_active ? '' : 'opacity-50'}`}>
            <div className="flex flex-col">
              <button onClick={() => moveStage(s.id, 'up')} disabled={i === 0} className="text-zinc-400 hover:text-navy dark:hover:text-white disabled:opacity-30"><ChevronUp size={14} /></button>
              <button onClick={() => moveStage(s.id, 'down')} disabled={i === stages.length - 1} className="text-zinc-400 hover:text-navy dark:hover:text-white disabled:opacity-30"><ChevronDown size={14} /></button>
            </div>
            <input value={s.name} onChange={(e) => updateStage(s.id, { name: e.target.value })}
              className="flex-1 min-w-[8rem] bg-transparent border-b border-transparent focus:border-blue-500 text-sm font-semibold text-navy dark:text-white focus:outline-none" />
            <select value={s.stage_type} onChange={(e) => updateStage(s.id, { stage_type: e.target.value as StageType })}
              className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none">
              <option value="open">{TYPE_LABEL.open}</option><option value="won">{TYPE_LABEL.won}</option><option value="lost">{TYPE_LABEL.lost}</option>
            </select>
            <label className="flex items-center gap-1 text-xs text-zinc-500">
              <input type="checkbox" checked={s.is_active} onChange={(e) => updateStage(s.id, { is_active: e.target.checked })} className="accent-blue-600" /> Ativa
            </label>
            <button onClick={() => deleteStage(s.id)} className="text-zinc-400 hover:text-red-500" aria-label="Excluir etapa"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: clean. Manually confirm: add creates a stage at the end; rename/type/active edit inline; up/down reorder; delete removes.

- [ ] **Step 3: Commit**

```bash
git add src/components/hq/crm/StageEditor.tsx
git commit -m "feat(crm): editor de etapas do funil (add/renomear/reordenar/tipo/ativa)"
```

---

### Task 4: Rule editor component

**Files:**
- Create: `src/components/hq/crm/RuleEditor.tsx`

**Interfaces:**
- Consumes: `useCrmCompany`, `useCrmStages` (read), `useCrmRules` (`RuleDraft`, `saveRule`, `toggleRule`, `deleteRule`), `AutomationRule`.
- Produces: default `RuleEditor` component (self-contained).

- [ ] **Step 1: Write `RuleEditor.tsx`**

Create `src/components/hq/crm/RuleEditor.tsx`. It builds the concrete rule from the spec's example ("quando entrar na etapa X, criar tarefa de follow-up em +N dias"):

```tsx
import { useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmStages } from '@/hooks/data/useCrmStages';
import { useCrmRules } from '@/hooks/data/useCrmRules';
import type { AutomationRule } from '@/hooks/data/crmTypes';

function ruleSummary(rule: AutomationRule, stageName: (id: string) => string): string {
  const trig = rule.trigger as { type?: string; stage_id?: string };
  const act = rule.action as { type?: string; offset_days?: number; title?: string };
  const when = trig.type === 'stage_entered' ? `entrar em "${stageName(trig.stage_id ?? '')}"` : 'gatilho';
  const then = act.type === 'create_task' ? `criar tarefa "${act.title}" em +${act.offset_days}d` : 'ação';
  return `Quando ${when}, ${then}.`;
}

export default function RuleEditor() {
  const { companyId } = useCrmCompany();
  const { stages } = useCrmStages(companyId);
  const { rules, loading, saveRule, toggleRule, deleteRule } = useCrmRules(companyId);

  const [name, setName] = useState('');
  const [stageId, setStageId] = useState('');
  const [offset, setOffset] = useState('3');
  const [taskTitle, setTaskTitle] = useState('Follow-up');
  const stageName = (id: string) => stages.find((s) => s.id === id)?.name ?? '—';

  async function add() {
    const sid = stageId || stages[0]?.id;
    if (!name.trim() || !sid || !taskTitle.trim()) { toast.error('Preencha nome, etapa e tarefa.'); return; }
    const { error } = await saveRule({ name: name.trim(), stageId: sid, offsetDays: Number(offset) || 0, taskTitle: taskTitle.trim() });
    if (error) toast.error('Erro ao criar regra.'); else { setName(''); }
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da regra"
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500" />
        <select value={stageId} onChange={(e) => setStageId(e.target.value)}
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300 focus:outline-none">
          <option value="">Ao entrar na etapa…</option>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Título da tarefa"
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">em +</span>
          <input type="number" min="0" value={offset} onChange={(e) => setOffset(e.target.value)}
            className="w-16 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-2 text-sm text-navy dark:text-white focus:outline-none" />
          <span className="text-sm text-zinc-500">dias</span>
          <button onClick={add} className="ml-auto flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-2 rounded-xl shadow-md shadow-blue-500/20">
            <Plus size={15} /> Criar regra
          </button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400 mb-3 flex items-center gap-1"><Zap size={12} /> As regras são apenas armazenadas nesta fase — a execução automática vem depois.</p>

      {loading && <p className="text-sm text-zinc-400">Carregando regras...</p>}
      {!loading && rules.length === 0 && <p className="text-sm text-zinc-400">Nenhuma regra cadastrada.</p>}

      <ul className="space-y-2">
        {rules.map((r) => (
          <li key={r.id} className={`flex items-center gap-3 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 ${r.is_active ? '' : 'opacity-50'}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy dark:text-white truncate">{r.name}</p>
              <p className="text-[11px] text-zinc-500 truncate">{ruleSummary(r, stageName)}</p>
            </div>
            <label className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
              <input type="checkbox" checked={r.is_active} onChange={(e) => toggleRule(r.id, e.target.checked)} className="accent-blue-600" /> Ativa
            </label>
            <button onClick={() => deleteRule(r.id)} className="text-zinc-400 hover:text-red-500 shrink-0" aria-label="Excluir regra"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: clean. Manually confirm: creating a rule stores it with `trigger`/`conditions`/`action`; the summary reads "Quando entrar em «X», criar tarefa «T» em +Nd."; toggle active + delete work.

- [ ] **Step 3: Commit**

```bash
git add src/components/hq/crm/RuleEditor.tsx
git commit -m "feat(crm): editor de regras de automação (gatilho de etapa -> criar tarefa)"
```

---

### Task 5: Settings page

**Files:**
- Rewrite: `src/pages/hq/crm/CrmSettings.tsx`

**Interfaces:**
- Consumes: `useCrmCompany`, `StageEditor`, `RuleEditor`, `CrmLoading`/`CrmNoAccess`.
- Produces: default `CrmSettings` page.

- [ ] **Step 1: Rewrite `CrmSettings.tsx`**

Replace the file with a two-section settings screen (tabs) composing the editors:

```tsx
import { useState } from 'react';
import { ListOrdered, Zap } from 'lucide-react';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import StageEditor from '@/components/hq/crm/StageEditor';
import RuleEditor from '@/components/hq/crm/RuleEditor';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

type Tab = 'stages' | 'rules';

export default function CrmSettings() {
  const { companyId, loading } = useCrmCompany();
  const [tab, setTab] = useState<Tab>('stages');

  if (loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;

  const tabs: { key: Tab; label: string; icon: typeof ListOrdered }[] = [
    { key: 'stages', label: 'Etapas do funil', icon: ListOrdered },
    { key: 'rules', label: 'Regras de automação', icon: Zap },
  ];

  return (
    <div className="w-full max-w-[900px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white">Configurações do CRM</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Personalize o funil e as regras da sua empresa</p>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                tab === t.key ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-navy dark:hover:text-white'}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        {tab === 'stages' ? <StageEditor /> : <RuleEditor />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: clean. Manually confirm: two tabs switch between the stage editor and the rule editor; both render and their mutations persist.

- [ ] **Step 3: Commit**

```bash
git add src/pages/hq/crm/CrmSettings.tsx
git commit -m "feat(crm): tela de configurações (etapas + regras de automação)"
```

---

## Manual verification (browser, logged-in admin)

1. `/hq/crm/settings` → "Etapas do funil" tab: add a stage (appears at the end), rename inline, change its type, toggle active/inactive, reorder with up/down, delete. Reload → changes persisted; the Pipeline/Leads screens reflect the new stage set.
2. "Regras de automação" tab: create a rule "quando entrar na etapa X, criar tarefa «Follow-up» em +3 dias" → it lists with a readable summary; toggle active; delete. The note makes clear rules are stored-only for now.
3. Deactivating a stage removes it from the Pipeline columns and the Leads filter (which use active-only `useCrmStages`), but it still appears (dimmed) in Settings.

---

## Self-Review

**Spec coverage (F5 slice):**
- Pipeline-stage editor (configurable stages as DB rows) → Tasks 1 + 3. ✔
- Automation-rule editor storing structured `{trigger, conditions, action}` → Tasks 2 + 4 (`buildTrigger`/`buildAction`, `conditions: []`). ✔
- Nothing hardcoded — stages and rules edited as rows → Tasks 3–5. ✔
- No execution engine / AI (stored only) → RuleEditor note + hook only persists. ✔
- Reuse existing pieces + styling; multi-tenant scoping on every query/insert → Tasks 1–4. ✔
- Backward compatibility: `useCrmStages` change is additive (optional `includeInactive`, additive return fields) so F2–F4 callers keep working → Task 1 build step verifies. ✔

**Placeholder scan:** none — every hook change, pure helper, test, component, and page is fully coded. No `return null`/TODO placeholders.

**Type consistency:** `reorderStages(stages, id, dir)`, `useCrmStages(companyId, includeInactive?)` + its mutation signatures, `RuleDraft`/`buildTrigger`/`buildAction`/`useCrmRules` return shape, and `StageType` usage match across the tasks that define and consume them. `StageEditor` uses `includeInactive: true`; `RuleEditor` uses the read `useCrmStages(companyId)` and `useCrmRules`. ✔
```

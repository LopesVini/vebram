# CRM UI — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the CRM module skeleton inside The Vertice HQ — shared types, active-company resolution, `/hq/crm/*` routes with empty page shells, HQ nav integration, and the drag-and-drop dependency — so later phases (Leads, Pipeline, Client, Dashboard, Settings) plug in with no scaffolding work.

**Architecture:** CRM lives under the existing `HqLayout` route (`/hq/crm/*`), gated by `isAdmin`. A `CrmCompanyProvider` (mounted inside `HqLayout`) resolves the active tenant from `memberships` and exposes it via `useCrmCompany()`; every future CRM hook will filter by that `companyId`. UI logic is split into pure, testable views (`CompanySwitcherView`, `CrmNoAccess`, `CrmLoading`) plus thin context wrappers.

**Tech Stack:** React 18 + TypeScript, react-router-dom, Tailwind (hand-rolled, `navy`/blue-600 palette), Supabase client, `lucide-react`, `@dnd-kit` (installed here, used in Phase 2), vitest + Testing Library.

## Global Constraints

- Import alias `@/` → `src/`.
- pt-BR for all user-facing strings.
- Hand-rolled data hooks (no React Query); `supabase.from(...)`; local `useState`; `{ error }` returns.
- Match existing style: `navy`/`navy-light`/`navy-dark`, active `bg-blue-600 text-white`, `rounded-xl`/`rounded-2xl`, dark mode via `dark:` classes.
- Reuse existing components/primitives before creating new ones (`DropdownMenu` from `@/components/ui/dropdown-menu`, `sonner` toasts, `lucide-react` icons).
- Every CRM data query filters `.eq('company_id', companyId)` — RLS is the backstop, not the only guard.
- No DB is applied or mutated by this work. Runtime data needs the user to apply the CRM migrations first; F1 pages must render gracefully without data.
- Dev server: port 8080. Tests: `npx vitest run <file>`. Build: `npm run build`. Lint: `npm run lint`.

---

## File Structure

- Create `src/hooks/data/crmTypes.ts` — shared TS types mirroring the DB schema. (Task 1)
- Create `src/hooks/data/useCrmCompany.tsx` — `pickActiveCompany` pure helper + `CrmCompanyProvider` + `useCrmCompany`. (Task 1)
- Create `src/hooks/data/useCrmCompany.test.ts` — unit tests for `pickActiveCompany`. (Task 1)
- Create `src/components/hq/crm/CrmStates.tsx` — pure `CrmLoading` + `CrmNoAccess`. (Task 2)
- Create `src/components/hq/crm/CrmStates.test.tsx` — render tests. (Task 2)
- Create `src/pages/hq/crm/CrmDashboard.tsx`, `CrmLeads.tsx`, `CrmPipeline.tsx`, `CrmClientDetail.tsx`, `CrmTasks.tsx`, `CrmSettings.tsx` — empty shells. (Task 2)
- Modify `src/App.tsx` — lazy-import + register `/hq/crm/*` child routes. (Task 2)
- Create `src/components/hq/crm/CompanySwitcher.tsx` — `CompanySwitcherView` (pure) + `CompanySwitcher` (context wrapper). (Task 3)
- Create `src/components/hq/crm/CompanySwitcher.test.tsx` — render tests for the view. (Task 3)
- Modify `src/components/hq/HqLayout.tsx` — wrap content in `CrmCompanyProvider`, add CRM `NavItem` group, `COMMANDS` entries, `MobileTabBar` entry, header `CompanySwitcher`. (Task 3)
- Modify `package.json` / lockfile — add `@dnd-kit/*`. (Task 4)

---

### Task 1: Shared types + active-company resolution

**Files:**
- Create: `src/hooks/data/crmTypes.ts`
- Create: `src/hooks/data/useCrmCompany.tsx`
- Test: `src/hooks/data/useCrmCompany.test.ts`

**Interfaces:**
- Produces (consumed by every later task/phase):
  - Types in `crmTypes.ts`: `CrmRole`, `StageType`, `ChannelType`, `InteractionType`, `TaskStatus`, `Company`, `Membership`, `PipelineStage`, `Client`, `ContactChannel`, `Interaction`, `CrmTask`, `AutomationRule`, `MembershipWithCompany`.
  - `pickActiveCompany(memberships: MembershipWithCompany[], persistedId: string | null): string | null`
  - `<CrmCompanyProvider>{children}</CrmCompanyProvider>`
  - `useCrmCompany(): { companyId: string | null; companies: MembershipWithCompany[]; role: CrmRole | null; setCompanyId: (id: string) => void; loading: boolean }`

- [ ] **Step 1: Write the shared types**

Create `src/hooks/data/crmTypes.ts`:

```ts
// Tipos do CRM — espelham o schema em supabase/migrations/20260705_crm_schema.sql
export type CrmRole = 'owner' | 'vendedor';
export type StageType = 'open' | 'won' | 'lost';
export type ChannelType = 'whatsapp' | 'email' | 'phone' | 'instagram' | 'other';
export type InteractionType = 'note' | 'contact' | 'stage_change' | 'task' | 'system';
export type TaskStatus = 'pending' | 'done';

export interface Company {
  id: string; name: string; slug: string; is_active: boolean;
  created_at: string; updated_at: string;
}
export interface Membership {
  id: string; company_id: string; user_id: string; role: CrmRole; created_at: string;
}
export interface MembershipWithCompany extends Membership { company: Company; }

export interface PipelineStage {
  id: string; company_id: string; name: string; position: number;
  stage_type: StageType; color: string | null; is_active: boolean; created_at: string;
}
export interface Client {
  id: string; company_id: string; name: string; source: string | null;
  entered_at: string; owner_id: string | null; stage_id: string | null;
  estimated_value: number | null; lost_reason: string | null; lost_at: string | null;
  created_at: string; updated_at: string;
}
export interface ContactChannel {
  id: string; company_id: string; client_id: string; type: ChannelType;
  value: string; is_primary: boolean; created_at: string;
}
export interface Interaction {
  id: string; company_id: string; client_id: string; author_id: string | null;
  type: InteractionType; body: string | null;
  metadata: Record<string, unknown>; created_at: string;
}
export interface CrmTask {
  id: string; company_id: string; client_id: string; title: string;
  due_date: string | null; assignee_id: string | null; status: TaskStatus;
  completed_at: string | null; created_at: string; updated_at: string;
}
export interface AutomationRule {
  id: string; company_id: string; name: string;
  trigger: Record<string, unknown>; conditions: unknown[]; action: Record<string, unknown>;
  is_active: boolean; created_at: string; updated_at: string;
}
```

- [ ] **Step 2: Write the failing test for `pickActiveCompany`**

Create `src/hooks/data/useCrmCompany.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickActiveCompany } from './useCrmCompany';
import type { MembershipWithCompany } from './crmTypes';

const mk = (id: string): MembershipWithCompany => ({
  id: 'm-' + id, company_id: id, user_id: 'u1', role: 'owner', created_at: '',
  company: { id, name: id.toUpperCase(), slug: id, is_active: true, created_at: '', updated_at: '' },
});

describe('pickActiveCompany', () => {
  it('returns null when there are no memberships', () => {
    expect(pickActiveCompany([], null)).toBeNull();
    expect(pickActiveCompany([], 'x')).toBeNull();
  });
  it('keeps the persisted company when it is still a member', () => {
    expect(pickActiveCompany([mk('a'), mk('b')], 'b')).toBe('b');
  });
  it('falls back to the first membership when persisted id is invalid', () => {
    expect(pickActiveCompany([mk('a'), mk('b')], 'zzz')).toBe('a');
  });
  it('uses the first membership when nothing is persisted', () => {
    expect(pickActiveCompany([mk('a'), mk('b')], null)).toBe('a');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/hooks/data/useCrmCompany.test.ts`
Expected: FAIL — cannot resolve `./useCrmCompany` / `pickActiveCompany` not exported.

- [ ] **Step 4: Write `useCrmCompany.tsx` (helper + provider + hook)**

Create `src/hooks/data/useCrmCompany.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/data/useAuth';
import type { MembershipWithCompany, CrmRole } from '@/hooks/data/crmTypes';

const LS_KEY = 'crm-active-company';

// Regra pura de escolha do tenant ativo (testável sem banco).
export function pickActiveCompany(
  memberships: MembershipWithCompany[],
  persistedId: string | null,
): string | null {
  if (memberships.length === 0) return null;
  if (persistedId && memberships.some((m) => m.company_id === persistedId)) return persistedId;
  return memberships[0].company_id;
}

interface CrmCompanyValue {
  companyId: string | null;
  companies: MembershipWithCompany[];
  role: CrmRole | null;
  setCompanyId: (id: string) => void;
  loading: boolean;
}

const Ctx = createContext<CrmCompanyValue | null>(null);

export function CrmCompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<MembershipWithCompany[]>([]);
  const [companyId, setCompanyIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setCompanyIdState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('memberships')
      .select('*, company:companies(*)')
      .eq('user_id', user.id);
    const list = (data as MembershipWithCompany[]) || [];
    setCompanies(list);
    setCompanyIdState(pickActiveCompany(list, localStorage.getItem(LS_KEY)));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const setCompanyId = useCallback((id: string) => {
    localStorage.setItem(LS_KEY, id);
    setCompanyIdState(id);
  }, []);

  const role = companies.find((m) => m.company_id === companyId)?.role ?? null;

  return (
    <Ctx.Provider value={{ companyId, companies, role, setCompanyId, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCrmCompany(): CrmCompanyValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCrmCompany precisa estar dentro de <CrmCompanyProvider>');
  return v;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/hooks/data/useCrmCompany.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/data/crmTypes.ts src/hooks/data/useCrmCompany.tsx src/hooks/data/useCrmCompany.test.ts
git commit -m "feat(crm): tipos compartilhados + resolução de empresa ativa (useCrmCompany)"
```

---

### Task 2: Page shells + routes + shared states

**Files:**
- Create: `src/components/hq/crm/CrmStates.tsx`
- Test: `src/components/hq/crm/CrmStates.test.tsx`
- Create: `src/pages/hq/crm/CrmDashboard.tsx`, `CrmLeads.tsx`, `CrmPipeline.tsx`, `CrmClientDetail.tsx`, `CrmTasks.tsx`, `CrmSettings.tsx`
- Modify: `src/App.tsx` (lazy imports block after line 41; `/hq` route block lines 124-134)

**Interfaces:**
- Consumes (Task 1): `useCrmCompany()`.
- Produces: default-exported page components `CrmDashboard`, `CrmLeads`, `CrmPipeline`, `CrmClientDetail`, `CrmTasks`, `CrmSettings`; `CrmLoading`, `CrmNoAccess` from `CrmStates.tsx`.

- [ ] **Step 1: Write the failing test for shared states**

Create `src/components/hq/crm/CrmStates.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrmLoading, CrmNoAccess } from './CrmStates';

describe('CrmStates', () => {
  it('CrmLoading shows a loading message', () => {
    render(<CrmLoading />);
    expect(screen.getByText(/carregando crm/i)).toBeInTheDocument();
  });
  it('CrmNoAccess explains the user has no CRM access', () => {
    render(<CrmNoAccess />);
    expect(screen.getByText(/sem acesso ao crm/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/hq/crm/CrmStates.test.tsx`
Expected: FAIL — cannot resolve `./CrmStates`.

- [ ] **Step 3: Write `CrmStates.tsx`**

Create `src/components/hq/crm/CrmStates.tsx`:

```tsx
import { Loader2, Lock } from 'lucide-react';

export function CrmLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
      <Loader2 className="w-7 h-7 animate-spin mb-3 text-blue-600" />
      <p className="text-sm font-mono tracking-widest animate-pulse">CARREGANDO CRM...</p>
    </div>
  );
}

export function CrmNoAccess() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-4">
        <Lock className="w-5 h-5 text-zinc-400" />
      </div>
      <h2 className="text-lg font-bold text-navy dark:text-white">Sem acesso ao CRM</h2>
      <p className="text-sm text-zinc-500 mt-1 max-w-sm">
        Sua conta ainda não está vinculada a nenhuma empresa no CRM. Peça a um
        administrador para incluí-lo.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/hq/crm/CrmStates.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the six page shells**

Each shell shares the same guard. Create `src/pages/hq/crm/CrmDashboard.tsx`:

```tsx
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

export default function CrmDashboard() {
  const { companyId, loading } = useCrmCompany();
  if (loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy dark:text-white">Painel CRM</h1>
      <p className="text-sm text-zinc-500 mt-1">Em breve.</p>
    </div>
  );
}
```

Create `src/pages/hq/crm/CrmLeads.tsx` (identical structure; title `Leads`):

```tsx
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

export default function CrmLeads() {
  const { companyId, loading } = useCrmCompany();
  if (loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy dark:text-white">Leads</h1>
      <p className="text-sm text-zinc-500 mt-1">Em breve.</p>
    </div>
  );
}
```

Create `src/pages/hq/crm/CrmPipeline.tsx` (title `Pipeline`):

```tsx
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

export default function CrmPipeline() {
  const { companyId, loading } = useCrmCompany();
  if (loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy dark:text-white">Pipeline</h1>
      <p className="text-sm text-zinc-500 mt-1">Em breve.</p>
    </div>
  );
}
```

Create `src/pages/hq/crm/CrmClientDetail.tsx` (title `Cliente`):

```tsx
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

export default function CrmClientDetail() {
  const { companyId, loading } = useCrmCompany();
  if (loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy dark:text-white">Cliente</h1>
      <p className="text-sm text-zinc-500 mt-1">Em breve.</p>
    </div>
  );
}
```

Create `src/pages/hq/crm/CrmTasks.tsx` (title `Tarefas`):

```tsx
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

export default function CrmTasks() {
  const { companyId, loading } = useCrmCompany();
  if (loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy dark:text-white">Tarefas</h1>
      <p className="text-sm text-zinc-500 mt-1">Em breve.</p>
    </div>
  );
}
```

Create `src/pages/hq/crm/CrmSettings.tsx` (title `Configurações do CRM`):

```tsx
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

export default function CrmSettings() {
  const { companyId, loading } = useCrmCompany();
  if (loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy dark:text-white">Configurações do CRM</h1>
      <p className="text-sm text-zinc-500 mt-1">Em breve.</p>
    </div>
  );
}
```

- [ ] **Step 6: Register routes in `src/App.tsx`**

Add these lazy imports immediately after line 41 (`const HqMembers = ...`):

```tsx
const CrmDashboard = lazy(() => import("./pages/hq/crm/CrmDashboard"));
const CrmLeads = lazy(() => import("./pages/hq/crm/CrmLeads"));
const CrmPipeline = lazy(() => import("./pages/hq/crm/CrmPipeline"));
const CrmClientDetail = lazy(() => import("./pages/hq/crm/CrmClientDetail"));
const CrmTasks = lazy(() => import("./pages/hq/crm/CrmTasks"));
const CrmSettings = lazy(() => import("./pages/hq/crm/CrmSettings"));
```

Inside the `<Route path="/hq" element={<HqLayout />}>` block (after the `members` route, before `profile`), add:

```tsx
                <Route path="crm" element={<CrmDashboard />} />
                <Route path="crm/leads" element={<CrmLeads />} />
                <Route path="crm/pipeline" element={<CrmPipeline />} />
                <Route path="crm/clients/:id" element={<CrmClientDetail />} />
                <Route path="crm/tasks" element={<CrmTasks />} />
                <Route path="crm/settings" element={<CrmSettings />} />
```

(The `CrmCompanyProvider` that these pages depend on is added to `HqLayout` in Task 3. Until then the pages compile but throw at runtime if visited — that is fixed within this phase.)

- [ ] **Step 7: Verify build + tests pass**

Run: `npm run build && npx vitest run src/components/hq/crm/CrmStates.test.tsx`
Expected: build succeeds (TypeScript resolves all six lazy imports); 2 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/hq/crm/CrmStates.tsx src/components/hq/crm/CrmStates.test.tsx src/pages/hq/crm/ src/App.tsx
git commit -m "feat(crm): shells das páginas + rotas /hq/crm + estados de carregamento/sem-acesso"
```

---

### Task 3: HQ nav integration + company switcher + provider

**Files:**
- Create: `src/components/hq/crm/CompanySwitcher.tsx`
- Test: `src/components/hq/crm/CompanySwitcher.test.tsx`
- Modify: `src/components/hq/HqLayout.tsx`

**Interfaces:**
- Consumes (Task 1): `useCrmCompany()`, `CrmCompanyProvider`; `MembershipWithCompany` type.
- Produces: `CompanySwitcherView` (pure) + default `CompanySwitcher` (context wrapper).

- [ ] **Step 1: Write the failing test for `CompanySwitcherView`**

Create `src/components/hq/crm/CompanySwitcher.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanySwitcherView } from './CompanySwitcher';
import type { MembershipWithCompany } from '@/hooks/data/crmTypes';

const mk = (id: string): MembershipWithCompany => ({
  id: 'm-' + id, company_id: id, user_id: 'u1', role: 'owner', created_at: '',
  company: { id, name: id.toUpperCase(), slug: id, is_active: true, created_at: '', updated_at: '' },
});

describe('CompanySwitcherView', () => {
  it('renders nothing when the user has fewer than two companies', () => {
    const { container } = render(
      <CompanySwitcherView companies={[mk('a')]} companyId="a" onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
  it('shows the active company name when there are multiple', () => {
    render(
      <CompanySwitcherView companies={[mk('a'), mk('b')]} companyId="b" onSelect={vi.fn()} />,
    );
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/hq/crm/CompanySwitcher.test.tsx`
Expected: FAIL — cannot resolve `./CompanySwitcher`.

- [ ] **Step 3: Write `CompanySwitcher.tsx`**

Create `src/components/hq/crm/CompanySwitcher.tsx`:

```tsx
import { Building2, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import type { MembershipWithCompany } from '@/hooks/data/crmTypes';

// Apresentação pura — testável sem contexto.
export function CompanySwitcherView({
  companies, companyId, onSelect,
}: {
  companies: MembershipWithCompany[];
  companyId: string | null;
  onSelect: (id: string) => void;
}) {
  if (companies.length < 2) return null;
  const active = companies.find((m) => m.company_id === companyId)?.company;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-full pl-3 pr-2.5 py-2 text-sm text-navy dark:text-white shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors">
          <Building2 size={15} className="text-zinc-400 shrink-0" />
          <span className="font-semibold truncate max-w-[8rem]">{active?.name ?? 'Empresa'}</span>
          <ChevronDown size={13} className="text-zinc-400 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-navy border-zinc-200 dark:border-white/10 text-navy dark:text-white rounded-xl shadow-2xl">
        {companies.map((m) => (
          <DropdownMenuItem
            key={m.company_id}
            onClick={() => onSelect(m.company_id)}
            className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between"
          >
            <span className="truncate">{m.company.name}</span>
            {m.company_id === companyId && <Check size={14} className="text-blue-600 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function CompanySwitcher() {
  const { companies, companyId, setCompanyId } = useCrmCompany();
  return <CompanySwitcherView companies={companies} companyId={companyId} onSelect={setCompanyId} />;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/hq/crm/CompanySwitcher.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire CRM into `HqLayout.tsx`**

Edit `src/components/hq/HqLayout.tsx`:

(a) Extend the icon import on line 5 — add `Gauge, Contact, KanbanSquare, ListChecks, SlidersHorizontal`:

```tsx
import { Loader2, LogOut, LayoutDashboard, Briefcase, Users, Search, Bell, Settings, Sun, Moon, UserCircle, CheckCheck, Plus, UserPlus, ArrowRight, Command, Rss, CalendarDays, BarChart3, Gauge, Contact, KanbanSquare, ListChecks, SlidersHorizontal } from "lucide-react";
```

(b) Add imports after line 10:

```tsx
import { useLocation } from "react-router-dom";
import { CrmCompanyProvider } from "@/hooks/data/useCrmCompany";
import CompanySwitcher from "@/components/hq/crm/CompanySwitcher";
```

(c) Append CRM commands to the `COMMANDS` array (after the `new-client` entry, before the closing `];`):

```tsx
  { id: "crm",          label: "CRM",             desc: "Painel do CRM",                   icon: Gauge,             path: "/hq/crm",          category: "CRM", keywords: ["crm","funil","vendas","pipeline","leads","painel crm"] },
  { id: "crm-leads",    label: "Leads",           desc: "Clientes e leads do CRM",         icon: Contact,           path: "/hq/crm/leads",    category: "CRM", keywords: ["leads","clientes","prospecção","prospeccao","contatos crm"] },
  { id: "crm-pipeline", label: "Pipeline",        desc: "Funil de vendas (Kanban)",        icon: KanbanSquare,      path: "/hq/crm/pipeline", category: "CRM", keywords: ["pipeline","funil","kanban","etapas","negócios","negocios"] },
  { id: "crm-tasks",    label: "Tarefas do CRM",  desc: "Follow-ups e próximas ações",     icon: ListChecks,        path: "/hq/crm/tasks",    category: "CRM", keywords: ["tarefas","follow-up","followup","próximas ações","proximas acoes","lembretes"] },
  { id: "crm-settings", label: "Config. do CRM",  desc: "Etapas e regras de automação",    icon: SlidersHorizontal, path: "/hq/crm/settings", category: "CRM", keywords: ["configurações crm","configuracoes crm","etapas","regras","automação","automacao"] },
```

(d) In the `HqLayout` component body, add `const location = useLocation();` next to the other hooks (after line 153, `const { theme, setTheme } = useTheme();`).

(e) Add a CRM nav group in the sidebar — after the VEBRAM group's last `NavItem` (the `Membros` item, line 225) and before the closing `</nav>`:

```tsx
          <p className="hidden lg:block text-xs font-bold text-zinc-400 mb-2 mt-4 px-4">CRM</p>
          <NavItem icon={<Gauge size={20} />} label="Painel CRM" to="/hq/crm" end />
          <NavItem icon={<Contact size={20} />} label="Leads" to="/hq/crm/leads" />
          <NavItem icon={<KanbanSquare size={20} />} label="Pipeline" to="/hq/crm/pipeline" />
          <NavItem icon={<ListChecks size={20} />} label="Tarefas" to="/hq/crm/tasks" />
          <NavItem icon={<SlidersHorizontal size={20} />} label="Config" to="/hq/crm/settings" />
```

(f) Render the switcher in the header — inside `<div className="flex items-center gap-4">` (the header's right cluster, opening at line 269), add as its first child:

```tsx
            {location.pathname.startsWith("/hq/crm") && <CompanySwitcher />}
```

(g) Add a CRM entry to `MobileTabBar` — extend its `tabs` array (lines 366-372) with:

```tsx
          { icon: <Gauge size={20} />, label: "CRM", to: "/hq/crm", end: true },
```

(h) Wrap the whole authenticated layout in the provider. Change the final `return (` of `HqLayout` so the outermost element is `<CrmCompanyProvider>`:

- Replace the opening `return (\n    <div className="min-h-screen ...">` with:
  ```tsx
  return (
    <CrmCompanyProvider>
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-navy-dark text-navy dark:text-white flex transition-colors duration-300 font-sans">
  ```
- And close it: the matching `</div>` right before the final `);` of the component (after `<FloatingChat />` and its wrapping `</div>`)... concretely, change the end of the return from:
  ```tsx
      <FloatingChat />
    </div>
  );
  ```
  to:
  ```tsx
      <FloatingChat />
    </div>
    </CrmCompanyProvider>
  );
  ```

- [ ] **Step 6: Verify build, lint, and tests**

Run: `npm run build && npm run lint && npx vitest run src/components/hq/crm/`
Expected: build + lint clean; all CRM component tests PASS. (No new lint errors introduced; `no-unused-vars` is off, so verify manually that added icon imports are all used — they are.)

- [ ] **Step 7: Commit**

```bash
git add src/components/hq/crm/CompanySwitcher.tsx src/components/hq/crm/CompanySwitcher.test.tsx src/components/hq/HqLayout.tsx
git commit -m "feat(crm): integração na navegação do HQ + troca de empresa + provider"
```

---

### Task 4: Install drag-and-drop dependency (for Phase 2)

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` available for the Pipeline Kanban in Phase 2.

- [ ] **Step 1: Install the packages**

Run: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
Expected: packages added to `dependencies`, lockfile updated, no peer-dependency errors.

- [ ] **Step 2: Verify the build still passes**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(crm): adiciona @dnd-kit para o Kanban do pipeline (fase 2)"
```

---

## Manual verification (after the user applies the CRM migrations)

F1 has no live data path until the user applies `20260705_crm_schema.sql` + `_rls.sql` + `_seed.sql` and the logged-in admin has a `memberships` row. Once applied, sanity-check:

1. `npm run dev` → log in as an admin → the sidebar shows the **CRM** group; `/hq/crm` loads the "Painel CRM" shell (not "Sem acesso ao CRM").
2. `⌘K` command palette lists the CRM commands and navigates correctly.
3. On mobile width, the tab bar shows the CRM entry.
4. If the admin belongs to ≥2 companies, the header shows the company switcher on `/hq/crm/*` only; switching persists across reloads (localStorage).
5. Before migrations (or for a non-member user), CRM pages show the "Sem acesso ao CRM" state instead of crashing.

---

## Self-Review

**Spec coverage (F1 slice):**
- Native module under HQ, `/hq/crm/*`, `isAdmin` gate → Task 2 routes + Task 3 provider/nav. ✔
- "CRM" nav section following existing pattern → Task 3 (e). ✔
- Active-company resolution + switcher (1 → use, N → switcher, persisted) → Task 1 (`pickActiveCompany` + provider) + Task 3 (`CompanySwitcher`). ✔
- Reuse existing components (`DropdownMenu`, `NavItem`, `MobileTabBar`, `COMMANDS`, lucide) → Task 3. ✔
- Shared types centralized → Task 1 `crmTypes.ts`. ✔
- Empty/no-access states, graceful without data → Task 2 `CrmStates` + shells. ✔
- `@dnd-kit` installed for Phase 2 → Task 4. ✔
- No DB mutation; renders without data → guards in every shell. ✔
- Phases F2–F5 (Leads/Pipeline, Client/History/Tasks, Dashboard, Settings) are **out of this plan** — each gets its own phase plan.

**Placeholder scan:** none. All steps carry full code/commands. Empty "Em breve." shells are intentional deliverables of the foundation phase, replaced in later phases.

**Type consistency:** `MembershipWithCompany`, `pickActiveCompany` signature, `useCrmCompany` return shape, and `CompanySwitcherView` props are identical across Tasks 1–3 and both test files. Page shells all import `{ CrmLoading, CrmNoAccess }` from the same `CrmStates.tsx`. ✔
```

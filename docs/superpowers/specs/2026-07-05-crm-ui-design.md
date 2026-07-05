# CRM UI (The Vertice) — Design

**Date:** 2026-07-05
**Scope:** Interface layer for the CRM module, on top of the already-designed data foundation ([CRM data foundation spec](2026-07-05-crm-data-foundation-design.md)). Native module inside The Vertice HQ. No auth/user/company recreation — reuse everything.
**Status:** Approved design, ready for implementation plan.

## Context

The CRM data foundation (8 multi-tenant tables + RLS + seed) exists as migration files. This task builds the UI so the CRM feels like a **native module** of The Vertice, not a separate app. Target users: engineering/architecture/construction firms; the CRM stays generic for any company.

**Prerequisite (blocking runtime, not build):** the CRM migrations (`20260705_crm_schema.sql`, `_rls.sql`, `_seed.sql`) are **not yet applied** — applying them is the user's explicit decision. RLS also requires a `memberships` row for the logged-in user (the seed links existing admins as owners). Until applied, the UI renders but data fetches fail. End-to-end verification is deferred to after the user applies migrations; unit tests of pure logic are not blocked.

## Existing conventions to follow (from exploration)

- **Routing/providers:** `src/App.tsx` is the single source of routing. HQ pages live under the `HqLayout` route, gated by `isAdmin`.
- **Nav:** `src/components/hq/HqLayout.tsx` — sidebar `NavItem`s grouped under headers ("MAIN MENU", "VEBRAM"), a `MobileTabBar`, and a command palette driven by a `COMMANDS: Cmd[]` array.
- **Styling:** hand-rolled Tailwind. Palette `navy`/`navy-light`/`navy-dark`, active state `bg-blue-600 text-white`, `rounded-xl`/`rounded-2xl`, class-based dark mode (`dark:`). Cards are hand-built `div`s — there is **no** shadcn `Card`/`Table`/`Tabs`/`Select`/`Badge` in `src/components/ui/`.
- **Data hooks:** hand-rolled in `src/hooks/data/`. Each calls `supabase` directly, holds results in `useState`, does optimistic updates, returns `{ items, loading, refetch, save…, update…, delete… }`. Example: `useProjects.ts`. Single-record detail pattern: `useClientProject.ts`. **No React Query.**
- **Installed deps available:** `recharts` (charts), `date-fns` (dates), `react-hook-form` + `zod` (forms), `sonner` (toasts), 27 `@radix-ui/*` packages, `lucide-react` (icons). **No drag-and-drop library.**

## Decisions (locked)

1. **Location & gating:** routes `/hq/crm/*` nested inside `HqLayout`, reusing its layout/nav/theme. Gate = existing `isAdmin`. Per-company scoping via a hook (below). Multi-tenant onboarding for non-admin tenants is out of scope.
2. **Active company:** `useCrmCompany()` resolves the tenant from `memberships` — one → use it; many → a header `CompanySwitcher` (choice persisted in `localStorage`). Every CRM hook filters `.eq('company_id', companyId)` (RLS is the backstop, not the only guard).
3. **Kanban drag-and-drop:** add `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (accessible, touch/keyboard support).
4. **Delivery:** one spec, phased implementation plan (F1–F5).
5. **Types:** centralized in `src/hooks/data/crmTypes.ts` (shared across hooks), not inline-per-hook.
6. **Nav shape:** a "CRM" group in the HQ sidebar with 5 items (Painel, Leads, Pipeline, Tarefas, Config); client detail is a drill-in, not a nav item.

## Architecture

```
src/App.tsx                         # add /hq/crm/* routes under the HqLayout route
src/components/hq/HqLayout.tsx       # add "CRM" NavItem group + COMMANDS + MobileTabBar entries

src/hooks/data/
  crmTypes.ts                        # shared TS types
  useCrmCompany.ts                   # active tenant resolution + switcher state
  useCrmClients.ts                   # leads list: filter/sort/search + CRUD + stage/owner change
  useCrmClient.ts                    # single client: client + channels + interactions + tasks
  useCrmStages.ts                    # pipeline_stages CRUD (config)
  useCrmTasks.ts                     # tasks CRUD + quick-add
  useCrmRules.ts                     # automation_rules CRUD (config)
  useCrmDashboard.ts                 # pure aggregations for the dashboard
  crmAggregations.ts                 # pure functions used by useCrmDashboard (unit-tested)

src/pages/hq/crm/
  CrmDashboard.tsx
  CrmLeads.tsx
  CrmPipeline.tsx
  CrmClientDetail.tsx
  CrmTasks.tsx
  CrmSettings.tsx

src/components/hq/crm/
  CompanySwitcher.tsx  StageBadge.tsx  LeadCard.tsx  LeadRow.tsx
  LeadFormDialog.tsx   KanbanColumn.tsx  TimelineItem.tsx
  QuickTaskInput.tsx   TaskItem.tsx  StageEditor.tsx  RuleEditor.tsx  CrmStatCard.tsx*
  (*only if no reusable stat card exists in HqDashboard; reuse first)
```

**Data flow:** page → domain hook → `supabase` (RLS-scoped) → local `useState` → optimistic update on mutation → `sonner` toast on error. `useCrmCompany` provides `companyId`; every other hook takes/reads it and filters by it. Mutations set `company_id` explicitly on insert.

## Components / pages detail

### useCrmCompany
Loads the caller's `memberships` (joined to `companies`). Returns `{ companyId, companies, membershipRole, setCompanyId, loading }`. Picks: persisted id if still valid → else first membership → else `null`. `null` companyId → pages render a "sem acesso ao CRM" empty state. Exposed via a small React context provider mounted around the CRM routes so all pages share one resolution.

### CrmDashboard
Only decision-useful widgets (no decoration): Leads novos (últimos 7d), Leads por etapa (funnel/bars), Próximas tarefas, Negócios ganhos, Negócios perdidos, Taxa de conversão, Valor estimado do pipeline, Atividades recentes (latest interactions). Charts via `recharts`; stat tiles reuse HQ dashboard tiles where present. All numbers come from `crmAggregations.ts` pure functions.

### CrmLeads
List (hand-rolled table/rows) with: quick search (client-side over loaded set), filters (stage, owner, source), sort (entered_at, estimated_value, name), create (`LeadFormDialog`), inline edit, delete (confirm), change owner, change stage. Row click → `CrmClientDetail`.

### CrmPipeline
Kanban: one `KanbanColumn` per active `pipeline_stages` (ordered by `position`). `LeadCard`s draggable across columns with `@dnd-kit`; on drop → `useCrmClients.updateClient(id, { stage_id })` optimistic + writes an `interactions` row `type='stage_change'` with `{from_stage_id,to_stage_id}` in metadata. Empty columns show a subtle placeholder.

### CrmClientDetail
Single organized screen: header (name, stage badge, estimated value, owner, source); contact channels; chronological timeline (interactions, newest first) via `TimelineItem`; open tasks + `QuickTaskInput`; edit affordances inline/contextual (not a wall of buttons). Uses `useCrmClient`.

### CrmTasks
All tasks for the company, grouped (Atrasadas / Hoje / Próximas / Concluídas). `QuickTaskInput` for fast follow-up creation (title + due date + optional client). Toggle done (optimistic).

### CrmSettings
- **Etapas do pipeline** (`StageEditor`): list, add, rename, reorder (position), set `stage_type` (open/won/lost), color, activate/deactivate. All persisted to `pipeline_stages`.
- **Regras de automação** (`RuleEditor`): CRUD over `automation_rules` in the structured `{trigger, conditions, action}` shape. This screen only stores rules; no execution engine.
- Nothing configurable is hardcoded — stages and rules are DB rows.

## Error handling & empty states

- Every mutation returns `{ error }`; on error show a `sonner` toast, keep UI consistent (revert optimistic change).
- Empty states for: no active company / no membership, no leads, no tasks, empty pipeline stage, no history.
- Permission/RLS errors surface as friendly toasts, not raw messages.

## Testing & verification

- **Unit (not blocked):** `crmAggregations.ts` pure functions (conversion rate, pipeline value, leads-by-stage, won/lost counts, upcoming tasks bucketing) tested with `vitest` — matches the repo's existing pure-aggregation pattern and `useEnhanceText.test.ts` precedent.
- **Deferred E2E:** after the user applies migrations + has a membership, a manual checklist: nav appears, dashboard loads, create/edit/delete lead, drag card across pipeline (DB updates + timeline entry), open client detail, quick-add task + toggle done, edit a stage in settings, add an automation rule.
- No DB is applied or mutated by this work; the UI talks to whatever the user has provisioned.

## Phasing (drives the implementation plan)

- **F1 — Foundation:** `crmTypes`, `useCrmCompany` (+context provider), `/hq/crm/*` routes, HQ nav integration (sidebar group + `COMMANDS` + `MobileTabBar`), `CompanySwitcher`, empty page shells, install `@dnd-kit`. Deliverable: CRM nav visible, shells render, company resolves.
- **F2 — Leads + Pipeline:** `useCrmClients`, `useCrmStages`, `CrmLeads`, `CrmPipeline` (Kanban dnd), `LeadFormDialog`, `LeadCard`/`LeadRow`, `StageBadge`, `KanbanColumn`.
- **F3 — Client + History + Tasks:** `useCrmClient`, `useCrmTasks`, `CrmClientDetail`, `TimelineItem`, `QuickTaskInput`, `TaskItem`, `CrmTasks`.
- **F4 — Dashboard:** `crmAggregations` (+ unit tests), `useCrmDashboard`, `CrmDashboard` widgets (recharts + reused tiles).
- **F5 — Settings:** `useCrmRules`, `StageEditor`, `RuleEditor`, `CrmSettings`.

## Out of scope

- Applying migrations / any DB mutation.
- Automation rule **execution** engine and AI rule proposal.
- WhatsApp / email / external channel integration (channels are stored/displayed only).
- Multi-tenant onboarding (creating companies / inviting non-admin members from the UI).
- Recreating auth, user management, or companies.

## Conventions checklist for implementers

- Reuse existing components/styles before creating new ones; match `navy`/blue-600 palette, `rounded-xl/2xl`, dark-mode classes.
- Hand-rolled data hooks (no React Query); optimistic updates; `{error}` return + `sonner` toast.
- pt-BR for all user-facing strings.
- Import alias `@/` → `src/`.
- Small, focused files — one responsibility each.

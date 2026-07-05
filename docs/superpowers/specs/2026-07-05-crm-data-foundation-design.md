# CRM Data Foundation — The VEBRAM / The Vertice

**Date:** 2026-07-05
**Scope:** Data foundation only — tables, relationships, multi-tenancy via RLS. No UI, no automation engine, no AI, no WhatsApp.
**Status:** Approved design, ready for implementation plan.

## Context

A CRM module inside The VEBRAM (the firm's internal management app). End goal: sell The Vertice as a **multi-tenant SaaS** to other engineering/architecture/construction firms. Vértice is tenant #1 and also the SaaS operator.

The running app today is **single-tenant**: `profiles` has one row per Supabase auth user with a global `role` (`admin` | `client`), no `company_id` anywhere. RLS is enforced via the SECURITY DEFINER helper `is_admin()`. This task adds the CRM's multi-tenant tables into the **same** Supabase project, isolated by `company_id`, without altering the existing portal.

### Architecture philosophy (must hold)

- **Núcleo fixo** — the structure, identical for every company (a client exists, has contact channels, moves through a funnel, generates tasks, has history). NOT customizable.
- **Configuração por empresa** — content each company shapes (its funnel stages, its automation rules). Lives in the DB as **editable data**, never as per-client code.
- **Camada de IA (futuro)** — will only *propose* structured rules a human approves. Out of scope here.

Key principle: **fixed is the structure, configurable is the content.** Funnel stages and rules are DB rows, not code.

## Decisions (locked)

1. **User↔company link:** dedicated `memberships(user_id, company_id, role)` table. `profiles` stays as global identity, untouched. A user can belong to N companies with a per-company role. RLS via `is_member_of(company_id)`.
2. **Access model:** strict membership isolation. No one sees beyond companies they are a member of — **not even global `profiles.role='admin'`**. Cross-tenant support is a server-side (`service_role`) operation, outside RLS.
3. **`automation_rules` format:** JSONB per part — `trigger jsonb`, `conditions jsonb`, `action jsonb` — so a hand-made rule or a future AI-generated rule fits the same shape.
4. **Delivery:** write migration files only. Nothing is applied to production until the user runs it.

## Schema

All CRM tables live in `public`. All carry `company_id` except `companies`. All ids are `uuid default gen_random_uuid()`.

### companies (tenants)
- `id` uuid PK
- `name` text NOT NULL
- `slug` text UNIQUE NOT NULL
- `is_active` boolean NOT NULL default true
- `created_at`, `updated_at` timestamptz default now()

### memberships (user↔company + CRM role)
- `id` uuid PK
- `company_id` uuid NOT NULL → companies(id) ON DELETE CASCADE
- `user_id` uuid NOT NULL → auth.users(id) ON DELETE CASCADE
- `role` text NOT NULL default `'vendedor'` CHECK in (`'owner'`, `'vendedor'`)
- `created_at` timestamptz default now()
- UNIQUE(user_id, company_id)

### pipeline_stages (funil — configurável por empresa)
- `id` uuid PK
- `company_id` uuid NOT NULL → companies(id) ON DELETE CASCADE
- `name` text NOT NULL
- `position` integer NOT NULL
- `stage_type` text NOT NULL default `'open'` CHECK in (`'open'`, `'won'`, `'lost'`)
- `color` text NULL
- `is_active` boolean NOT NULL default true
- `created_at` timestamptz default now()
- INDEX(company_id, position)

### clients (leads)
- `id` uuid PK
- `company_id` uuid NOT NULL → companies(id) ON DELETE CASCADE
- `name` text NOT NULL
- `source` text NULL — origem do lead (indicação, site, prospecção ativa…), free text
- `entered_at` timestamptz NOT NULL default now()
- `owner_id` uuid NULL → auth.users(id) ON DELETE SET NULL — responsável
- `stage_id` uuid NULL → pipeline_stages(id) ON DELETE SET NULL — etapa atual
- `estimated_value` numeric(14,2) NULL
- `lost_reason` text NULL
- `lost_at` timestamptz NULL
- `created_at`, `updated_at` timestamptz default now()
- INDEX(company_id), INDEX(company_id, stage_id)

### contact_channels (vias de contato)
- `id` uuid PK
- `company_id` uuid NOT NULL → companies(id) ON DELETE CASCADE
- `client_id` uuid NOT NULL → clients(id) ON DELETE CASCADE
- `type` text NOT NULL CHECK in (`'whatsapp'`, `'email'`, `'phone'`, `'instagram'`, `'other'`)
- `value` text NOT NULL
- `is_primary` boolean NOT NULL default false
- `created_at` timestamptz default now()
- INDEX(client_id)

### interactions (histórico — imutável)
- `id` uuid PK
- `company_id` uuid NOT NULL → companies(id) ON DELETE CASCADE
- `client_id` uuid NOT NULL → clients(id) ON DELETE CASCADE
- `author_id` uuid NULL → auth.users(id) ON DELETE SET NULL — quem registrou
- `type` text NOT NULL CHECK in (`'note'`, `'contact'`, `'stage_change'`, `'task'`, `'system'`)
- `body` text NULL
- `metadata` jsonb NOT NULL default `'{}'` — e.g. `{from_stage_id, to_stage_id}` for stage_change
- `created_at` timestamptz NOT NULL default now()
- INDEX(client_id, created_at)
- **No `updated_at`.** Immutability enforced by RLS (only SELECT + INSERT policies).

### tasks (próximas ações)
- `id` uuid PK
- `company_id` uuid NOT NULL → companies(id) ON DELETE CASCADE
- `client_id` uuid NOT NULL → clients(id) ON DELETE CASCADE
- `title` text NOT NULL
- `due_date` date NULL
- `assignee_id` uuid NULL → auth.users(id) ON DELETE SET NULL
- `status` text NOT NULL default `'pending'` CHECK in (`'pending'`, `'done'`)
- `completed_at` timestamptz NULL
- `created_at`, `updated_at` timestamptz default now()
- INDEX(company_id, status), INDEX(client_id)

### automation_rules (regras — apenas armazena)
- `id` uuid PK
- `company_id` uuid NOT NULL → companies(id) ON DELETE CASCADE
- `name` text NOT NULL
- `trigger` jsonb NOT NULL — e.g. `{"type":"stage_entered","stage_id":"…"}`
- `conditions` jsonb NOT NULL default `'[]'` — e.g. `[{"field":"estimated_value","op":">","value":10000}]`
- `action` jsonb NOT NULL — e.g. `{"type":"create_task","offset_days":3,"title":"Follow-up"}`
- `is_active` boolean NOT NULL default true
- `created_at`, `updated_at` timestamptz default now()
- INDEX(company_id, is_active)

The rule engine that executes these and the AI that proposes them are explicitly **out of scope**. Only the storage table is built now, shaped so hand-made and AI-generated rules share the format.

## Relationship diagram (textual)

```
auth.users ──┐ (existing Supabase Auth; not created here)
             │
   profiles  │ (existing, global identity, UNTOUCHED)
             │
companies (tenant)
   ├──< memberships >── auth.users        (user belongs to N companies, per-company role)
   ├──< pipeline_stages                    (funnel, configurable per company)
   ├──< automation_rules                   (rules, configurable per company)
   └──< clients
          ├── owner_id ──> auth.users      (responsável)
          ├── stage_id ──> pipeline_stages (etapa atual, SET NULL on stage delete)
          ├──< contact_channels
          ├──< interactions ── author_id ──> auth.users   (imutável)
          └──< tasks ── assignee_id ──> auth.users
```

`company_id` is denormalized onto every child table (contact_channels, interactions, tasks) even though `client_id` implies it — this keeps RLS a single-hop check (`is_member_of(company_id)`) and satisfies the non-negotiable "every CRM data table references the company" rule.

## Multi-tenancy / RLS

Two SECURITY DEFINER helpers, mirroring the existing `is_admin()` pattern (`set search_path='public'`, `stable`, execute revoked from `anon`/`public`, granted to `authenticated`):

```sql
-- membership check: is the caller a member of this company?
public.is_member_of(p_company_id uuid) returns boolean
  -> exists(select 1 from memberships where company_id = p_company_id and user_id = auth.uid())

-- owner check: gates membership management
public.is_company_owner(p_company_id uuid) returns boolean
  -> exists(select 1 from memberships where company_id = p_company_id and user_id = auth.uid() and role = 'owner')
```

RLS `enable` + `force` on every CRM table. Policies:

- **companies** — SELECT `USING is_member_of(id)`. No client INSERT/UPDATE/DELETE (company creation is server-side/seed for now).
- **memberships** — SELECT `USING is_member_of(company_id)`; INSERT/UPDATE/DELETE `USING/WITH CHECK is_company_owner(company_id)`.
- **pipeline_stages, clients, contact_channels, tasks, automation_rules** — SELECT/INSERT/UPDATE/DELETE all `USING/WITH CHECK is_member_of(company_id)`.
- **interactions** — only SELECT (`USING is_member_of`) and INSERT (`WITH CHECK is_member_of`) policies. No UPDATE/DELETE policy → immutable timeline.

Global `profiles.role='admin'` is deliberately **not** referenced in any CRM policy — a Vértice admin gets no cross-tenant CRM access through RLS. Support/ops that must cross tenants run server-side with the service-role key.

## Deliverables

Three migration files under `supabase/migrations/` (write only — not applied to production):

1. `2026xxxx_crm_schema.sql` — extensions guard (`pgcrypto` for `gen_random_uuid`), all 8 tables, FKs, indexes, CHECK constraints, `updated_at` trigger function + triggers, the two RLS helper functions. Idempotent (`create table if not exists`, `create or replace function`).
2. `2026xxxx_crm_rls.sql` — `alter table … enable/force row level security` + all policies (idempotent `drop policy if exists` before each `create policy`).
3. `2026xxxx_crm_seed.sql` (optional, for testing) — insert company "VEBRAM"/Vértice as tenant 1; seed an outbound/prospecção-ativa funnel (Prospecção → Contato feito → Diagnóstico → Proposta enviada → Negociação → Ganho[`won`] / Perdido[`lost`]); link every existing `profiles.role='admin'` into VEBRAM as `owner`. Idempotent (`on conflict do nothing`).

## Out of scope (explicitly not done here)

- Any UI / screens.
- The engine that executes automation rules (only the storage table).
- AI integration; WhatsApp integration.
- CRM onboarding flow (creating a company on signup / auto-membership).
- Applying migrations to production.
- No funnel stage, field, or rule hardcoded in application code — everything configurable lives in the DB.

## Follow-the-existing-conventions notes

- Mirror the `is_admin()` helper style from `supabase/migrations/20260702_seguranca_banco.sql` (SECURITY DEFINER, `set search_path='public'`, `revoke execute from anon/public`, `grant to authenticated`).
- Keep migrations idempotent and re-runnable, matching the header comment style of existing migrations (pt-BR comments).

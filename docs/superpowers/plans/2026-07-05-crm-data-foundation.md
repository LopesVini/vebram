# CRM Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the multi-tenant data foundation (8 tables + RLS + seed) for the CRM module as reviewable Supabase migration files, verified against an ephemeral local Postgres — nothing applied to production.

**Architecture:** All CRM tables live in `public`, isolated by `company_id`. Two SECURITY DEFINER helpers (`is_member_of`, `is_company_owner`) drive strict per-tenant RLS. Verification runs each migration against a throwaway Dockerized Postgres that stubs Supabase's `auth` schema + `auth.uid()`, so RLS behavior is tested for real, offline and free.

**Tech Stack:** PostgreSQL 15, Supabase RLS, Docker (ephemeral test DB), `psql`.

## Global Constraints

- Target dir: `supabase/migrations/`. File prefix `20260705_`.
- Idempotent + re-runnable: `create table if not exists`, `create or replace function`, `drop policy if exists` before every `create policy`.
- pt-BR comments in migration headers, matching existing migrations' style.
- Mirror the existing `is_admin()` helper style from `supabase/migrations/20260702_seguranca_banco.sql`: `security definer`, `set search_path to 'public'`, `stable`, `revoke execute from anon, public`, `grant execute to authenticated`.
- Strict tenant isolation: no CRM policy references `profiles.role='admin'`. Global admins get zero cross-tenant CRM access via RLS.
- **Do NOT apply any migration to the production Supabase project.** Verification is local Docker only.
- No funnel stage, field, or rule hardcoded in application code — configurable content lives in DB rows.
- All ids `uuid default gen_random_uuid()` (needs `pgcrypto`).

---

## File Structure

- **Create** `supabase/migrations/20260705_crm_schema.sql` — extensions, tables, FKs, indexes, `updated_at` trigger fn + triggers, RLS helper fns. (Task 1)
- **Create** `supabase/migrations/20260705_crm_rls.sql` — enable+force RLS, all policies. (Task 2)
- **Create** `supabase/migrations/20260705_crm_seed.sql` — Vértice tenant, outbound funnel, link existing admins. (Task 3)
- **Create (scratchpad, throwaway)** test harness under the session scratchpad: `boot.sh`, `auth_shim.sql`, `fixtures.sql`, `assert_*.sql`. Not committed.

Each migration file is one independently testable deliverable → one task.

---

### Task 1: Schema migration + test harness

**Files:**
- Create: `supabase/migrations/20260705_crm_schema.sql`
- Create (scratchpad, not committed): `<SCRATCH>/crm/boot.sh`, `<SCRATCH>/crm/auth_shim.sql`, `<SCRATCH>/crm/assert_schema.sql`

`<SCRATCH>` = the session scratchpad dir. Requires Docker running. If Docker is unavailable, fall back to a Supabase **preview branch** (`mcp__supabase__create_branch` → `apply_migration` → `execute_sql` → `delete_branch`) — never the production project.

**Interfaces:**
- Produces (later tasks consume these exact names):
  - Tables `public.companies(id, name, slug, is_active, created_at, updated_at)`, `public.memberships(id, company_id, user_id, role, created_at)`, `public.pipeline_stages(id, company_id, name, position, stage_type, color, is_active, created_at)`, `public.clients(id, company_id, name, source, entered_at, owner_id, stage_id, estimated_value, lost_reason, lost_at, created_at, updated_at)`, `public.contact_channels(id, company_id, client_id, type, value, is_primary, created_at)`, `public.interactions(id, company_id, client_id, author_id, type, body, metadata, created_at)`, `public.tasks(id, company_id, client_id, title, due_date, assignee_id, status, completed_at, created_at, updated_at)`, `public.automation_rules(id, company_id, name, trigger, conditions, action, is_active, created_at, updated_at)`.
  - Functions `public.is_member_of(uuid) returns boolean`, `public.is_company_owner(uuid) returns boolean`, `public.crm_touch_updated_at() returns trigger`.

- [ ] **Step 1: Write the test harness (boot + auth shim)**

Create `<SCRATCH>/crm/auth_shim.sql` — stubs the Supabase-provided objects our migrations depend on, plus a non-superuser role so RLS actually applies (superusers bypass RLS even with FORCE):

```sql
-- Stubs Supabase provides in prod; needed so migrations + RLS run locally.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);

-- Supabase's auth.uid(): reads the JWT 'sub' claim from a GUC.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Roles: 'authenticated'/'anon' exist in Supabase; 'tester' logs in and
-- inherits 'authenticated' but is NOT superuser/bypassrls, so RLS binds it.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='tester') then create role tester login password 'pw'; end if;
end $$;
grant authenticated to tester;
```

Create `<SCRATCH>/crm/boot.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
docker rm -f crm_test_db >/dev/null 2>&1 || true
docker run -d --name crm_test_db -e POSTGRES_PASSWORD=pw -p 55432:5432 postgres:15 >/dev/null
until docker exec crm_test_db pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sleep 1
export PGPASSWORD=pw
psql -h localhost -p 55432 -U postgres -v ON_ERROR_STOP=1 -q -f "$HERE/auth_shim.sql"
echo "booted: postgres on 55432, auth shim loaded"
```

Helper you will reuse (run in your shell each verification):

```bash
export PGPASSWORD=pw
p() { psql -h localhost -p 55432 -U postgres -v ON_ERROR_STOP=1 "$@"; }         # as owner
pt() { PGPASSWORD=pw psql -h localhost -p 55432 -U tester -v ON_ERROR_STOP=1 "$@"; } # as tenant user
```

- [ ] **Step 2: Write the failing schema assertions**

Create `<SCRATCH>/crm/assert_schema.sql`:

```sql
-- All 8 tables present
select 'tables', count(*) from information_schema.tables
where table_schema='public'
  and table_name in ('companies','memberships','pipeline_stages','clients',
    'contact_channels','interactions','tasks','automation_rules');
-- expect 8

-- Helper functions present
select 'fns', count(*) from pg_proc
where proname in ('is_member_of','is_company_owner','crm_touch_updated_at');
-- expect 3

-- CHECK constraints bite: bad role rejected
do $$ begin
  begin
    insert into public.companies(name,slug) values ('X','x');
    insert into public.memberships(company_id,user_id,role)
      values ((select id from public.companies where slug='x'),
              gen_random_uuid(),'hacker');
    raise exception 'CHECK not enforced';
  exception when check_violation then null; end;
end $$;

-- FK cascade: deleting a company cascades memberships
select 'assert_schema OK';
```

- [ ] **Step 3: Run harness + assertions to verify they FAIL**

```bash
bash <SCRATCH>/crm/boot.sh
p -f <SCRATCH>/crm/assert_schema.sql
```
Expected: FAIL — `relation "public.companies" does not exist` (migration not written yet).

- [ ] **Step 4: Write the schema migration**

Create `supabase/migrations/20260705_crm_schema.sql`:

```sql
-- ============================================================
-- CRM (The Vertice / VEBRAM) — fundação de dados multi-tenant
-- Núcleo fixo: empresas (tenants), membros, funil, clientes/leads,
-- vias de contato, histórico imutável, tarefas e regras.
-- Tudo isolado por company_id. Idempotente e re-executável.
-- NÃO aplica em produção automaticamente — rode manualmente.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- updated_at automático ----------
create or replace function public.crm_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- tabelas ----------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'vendedor' check (role in ('owner','vendedor')),
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  position integer not null,
  stage_type text not null default 'open' check (stage_type in ('open','won','lost')),
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  source text,
  entered_at timestamptz not null default now(),
  owner_id uuid references auth.users(id) on delete set null,
  stage_id uuid references public.pipeline_stages(id) on delete set null,
  estimated_value numeric(14,2),
  lost_reason text,
  lost_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_channels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  type text not null check (type in ('whatsapp','email','phone','instagram','other')),
  value text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('note','contact','stage_change','task','system')),
  body text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  due_date date,
  assignee_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','done')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  trigger jsonb not null,
  conditions jsonb not null default '[]',
  action jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- índices ----------
create index if not exists idx_memberships_user on public.memberships(user_id);
create index if not exists idx_stages_company_pos on public.pipeline_stages(company_id, position);
create index if not exists idx_clients_company on public.clients(company_id);
create index if not exists idx_clients_company_stage on public.clients(company_id, stage_id);
create index if not exists idx_channels_client on public.contact_channels(client_id);
create index if not exists idx_interactions_client_time on public.interactions(client_id, created_at);
create index if not exists idx_tasks_company_status on public.tasks(company_id, status);
create index if not exists idx_tasks_client on public.tasks(client_id);
create index if not exists idx_rules_company_active on public.automation_rules(company_id, is_active);

-- ---------- triggers updated_at ----------
drop trigger if exists trg_companies_touch on public.companies;
create trigger trg_companies_touch before update on public.companies
  for each row execute function public.crm_touch_updated_at();
drop trigger if exists trg_clients_touch on public.clients;
create trigger trg_clients_touch before update on public.clients
  for each row execute function public.crm_touch_updated_at();
drop trigger if exists trg_tasks_touch on public.tasks;
create trigger trg_tasks_touch before update on public.tasks
  for each row execute function public.crm_touch_updated_at();
drop trigger if exists trg_rules_touch on public.automation_rules;
create trigger trg_rules_touch before update on public.automation_rules
  for each row execute function public.crm_touch_updated_at();

-- ---------- helpers de multi-tenancy (RLS) ----------
-- SECURITY DEFINER (dono = superuser) => o SELECT interno em memberships
-- ignora RLS, evitando recursão nas políticas da própria memberships.
create or replace function public.is_member_of(p_company_id uuid)
returns boolean language sql stable security definer
set search_path to 'public' as $$
  select exists (
    select 1 from public.memberships
    where company_id = p_company_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_company_owner(p_company_id uuid)
returns boolean language sql stable security definer
set search_path to 'public' as $$
  select exists (
    select 1 from public.memberships
    where company_id = p_company_id and user_id = auth.uid() and role = 'owner'
  );
$$;

revoke execute on function public.is_member_of(uuid) from anon, public;
revoke execute on function public.is_company_owner(uuid) from anon, public;
grant execute on function public.is_member_of(uuid) to authenticated;
grant execute on function public.is_company_owner(uuid) to authenticated;
```

- [ ] **Step 5: Apply migration + run assertions to verify PASS**

```bash
p -f supabase/migrations/20260705_crm_schema.sql
p -f <SCRATCH>/crm/assert_schema.sql
p -c "drop table if exists public.companies cascade;" # prove cascade path clean, then re-apply
p -f supabase/migrations/20260705_crm_schema.sql       # idempotency: no errors on re-run
```
Expected: `tables | 8`, `fns | 3`, `assert_schema OK`, and the re-run applies cleanly (idempotent).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260705_crm_schema.sql
git commit -m "feat: schema base do CRM multi-tenant (8 tabelas, helpers RLS)"
```

---

### Task 2: RLS migration + tenant-isolation tests

**Files:**
- Create: `supabase/migrations/20260705_crm_rls.sql`
- Create (scratchpad): `<SCRATCH>/crm/assert_rls.sql`

**Interfaces:**
- Consumes (Task 1): all 8 tables; `public.is_member_of(uuid)`, `public.is_company_owner(uuid)`; test roles `authenticated`/`tester`; `auth.uid()` reading `request.jwt.claim.sub`.
- Produces: RLS enabled+forced on all 8 tables; policies named `crm_<table>_<op>` (e.g. `crm_clients_all`, `crm_interactions_select`, `crm_interactions_insert`, `crm_memberships_insert`).

- [ ] **Step 1: Write the failing RLS isolation test**

Create `<SCRATCH>/crm/assert_rls.sql`. Seeds two tenants + one member each (owner-side, run as superuser to bypass), then checks a tenant user can only see their own company's clients. Grants are needed because in prod Supabase already grants table DML to `authenticated`.

```sql
-- table DML privileges (Supabase grants these to authenticated in prod)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- two tenants, two users, one client each (as superuser => RLS bypassed here)
insert into auth.users(id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222')
  on conflict do nothing;
insert into public.companies(id,name,slug) values
  ('aaaaaaaa-0000-0000-0000-000000000001','A','a'),
  ('bbbbbbbb-0000-0000-0000-000000000002','B','b')
  on conflict do nothing;
insert into public.memberships(company_id,user_id,role) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','owner'),
  ('bbbbbbbb-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','owner')
  on conflict do nothing;
insert into public.clients(company_id,name) values
  ('aaaaaaaa-0000-0000-0000-000000000001','cliente-A'),
  ('bbbbbbbb-0000-0000-0000-000000000002','cliente-B');

-- act as tenant-A user
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);

do $$
declare n int;
begin
  select count(*) into n from public.clients;               -- should see only A
  if n <> 1 then raise exception 'ISOLATION FAIL: A sees % clients', n; end if;
  if exists(select 1 from public.clients where name='cliente-B')
    then raise exception 'LEAK: A can see B'; end if;

  -- cannot write into B
  begin
    insert into public.clients(company_id,name)
      values ('bbbbbbbb-0000-0000-0000-000000000002','intruso');
    raise exception 'WRITE-LEAK: A wrote into B';
  exception when insufficient_privilege then null;
           when others then
             if sqlstate='42501' then null; else raise; end if;
  end;

  -- interactions immutable: insert ok, update blocked
  insert into public.interactions(company_id,client_id,type,body)
    select 'aaaaaaaa-0000-0000-0000-000000000001', c.id, 'note','oi'
    from public.clients c where c.name='cliente-A';
  begin
    update public.interactions set body='editado';
    raise exception 'IMMUTABLE FAIL: update allowed';
  exception when insufficient_privilege then null;
           when others then if sqlstate='42501' then null; else raise; end if;
end $$;
reset role;
select 'assert_rls OK';
```

- [ ] **Step 2: Run to verify it FAILS**

```bash
docker rm -f crm_test_db >/dev/null 2>&1; bash <SCRATCH>/crm/boot.sh
p -f supabase/migrations/20260705_crm_schema.sql
p -f <SCRATCH>/crm/assert_rls.sql
```
Expected: FAIL — with no RLS, tenant A sees 2 clients → `ISOLATION FAIL`.

- [ ] **Step 3: Write the RLS migration**

Create `supabase/migrations/20260705_crm_rls.sql`:

```sql
-- ============================================================
-- CRM — RLS: isolamento ESTRITO por tenant (company_id).
-- Ninguém vê além das empresas em que é membro — nem admin global.
-- 'force' faz até o dono da tabela obedecer às políticas.
-- Idempotente (drop policy if exists antes de cada create).
-- ============================================================

alter table public.companies        enable row level security;
alter table public.companies        force  row level security;
alter table public.memberships      enable row level security;
alter table public.memberships      force  row level security;
alter table public.pipeline_stages  enable row level security;
alter table public.pipeline_stages  force  row level security;
alter table public.clients          enable row level security;
alter table public.clients          force  row level security;
alter table public.contact_channels enable row level security;
alter table public.contact_channels force  row level security;
alter table public.interactions     enable row level security;
alter table public.interactions     force  row level security;
alter table public.tasks            enable row level security;
alter table public.tasks            force  row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_rules force  row level security;

-- companies: membros leem a própria empresa. Criação = server-side/seed.
drop policy if exists crm_companies_select on public.companies;
create policy crm_companies_select on public.companies
  for select to authenticated using (public.is_member_of(id));

-- memberships: membros leem; só OWNER gerencia (add/remove/alterar papel).
-- (o 1º owner de uma empresa é criado por seed/server-side, não via RLS.)
drop policy if exists crm_memberships_select on public.memberships;
create policy crm_memberships_select on public.memberships
  for select to authenticated using (public.is_member_of(company_id));
drop policy if exists crm_memberships_insert on public.memberships;
create policy crm_memberships_insert on public.memberships
  for insert to authenticated with check (public.is_company_owner(company_id));
drop policy if exists crm_memberships_update on public.memberships;
create policy crm_memberships_update on public.memberships
  for update to authenticated
  using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));
drop policy if exists crm_memberships_delete on public.memberships;
create policy crm_memberships_delete on public.memberships
  for delete to authenticated using (public.is_company_owner(company_id));

-- tabelas de dados: qualquer membro faz CRUD dentro do próprio tenant.
drop policy if exists crm_pipeline_stages_all on public.pipeline_stages;
create policy crm_pipeline_stages_all on public.pipeline_stages
  for all to authenticated
  using (public.is_member_of(company_id))
  with check (public.is_member_of(company_id));

drop policy if exists crm_clients_all on public.clients;
create policy crm_clients_all on public.clients
  for all to authenticated
  using (public.is_member_of(company_id))
  with check (public.is_member_of(company_id));

drop policy if exists crm_contact_channels_all on public.contact_channels;
create policy crm_contact_channels_all on public.contact_channels
  for all to authenticated
  using (public.is_member_of(company_id))
  with check (public.is_member_of(company_id));

drop policy if exists crm_tasks_all on public.tasks;
create policy crm_tasks_all on public.tasks
  for all to authenticated
  using (public.is_member_of(company_id))
  with check (public.is_member_of(company_id));

drop policy if exists crm_automation_rules_all on public.automation_rules;
create policy crm_automation_rules_all on public.automation_rules
  for all to authenticated
  using (public.is_member_of(company_id))
  with check (public.is_member_of(company_id));

-- interactions: histórico IMUTÁVEL — só SELECT e INSERT (sem update/delete).
drop policy if exists crm_interactions_select on public.interactions;
create policy crm_interactions_select on public.interactions
  for select to authenticated using (public.is_member_of(company_id));
drop policy if exists crm_interactions_insert on public.interactions;
create policy crm_interactions_insert on public.interactions
  for insert to authenticated with check (public.is_member_of(company_id));
```

- [ ] **Step 4: Apply + run to verify PASS**

```bash
p -f supabase/migrations/20260705_crm_rls.sql
p -f <SCRATCH>/crm/assert_rls.sql
p -f supabase/migrations/20260705_crm_rls.sql   # idempotency re-run: no errors
```
Expected: `assert_rls OK` (isolation, write-block, and immutability all hold), clean re-run.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260705_crm_rls.sql
git commit -m "feat: RLS de isolamento estrito por tenant no CRM"
```

---

### Task 3: Seed migration (Vértice tenant + funil + admins)

**Files:**
- Create: `supabase/migrations/20260705_crm_seed.sql`
- Create (scratchpad): `<SCRATCH>/crm/fixtures.sql`, `<SCRATCH>/crm/assert_seed.sql`

**Interfaces:**
- Consumes (Task 1): `companies`, `pipeline_stages`, `memberships`; reads `public.profiles(id, role)` (exists in prod; stubbed locally by fixtures).
- Produces: idempotent seed — one Vértice company (slug `vertice`), 7 outbound stages, admins linked as owners.

- [ ] **Step 1: Write local fixtures for `public.profiles`**

The seed reads `public.profiles`, which prod has but our test DB doesn't. Create `<SCRATCH>/crm/fixtures.sql`:

```sql
-- stub of the existing prod table, just enough for the seed
create table if not exists public.profiles (id uuid primary key, role text);
insert into auth.users(id) values ('99999999-9999-9999-9999-999999999999') on conflict do nothing;
insert into public.profiles(id, role) values
  ('99999999-9999-9999-9999-999999999999','admin')
  on conflict do nothing;
```

- [ ] **Step 2: Write the failing seed assertions**

Create `<SCRATCH>/crm/assert_seed.sql`:

```sql
select 'company', count(*) from public.companies where slug='vertice';        -- 1
select 'stages',  count(*) from public.pipeline_stages ps
  join public.companies c on c.id=ps.company_id where c.slug='vertice';        -- 7
select 'won', count(*) from public.pipeline_stages ps
  join public.companies c on c.id=ps.company_id
  where c.slug='vertice' and ps.stage_type='won';                             -- 1
select 'lost', count(*) from public.pipeline_stages ps
  join public.companies c on c.id=ps.company_id
  where c.slug='vertice' and ps.stage_type='lost';                            -- 1
select 'admin_owner', count(*) from public.memberships m
  join public.companies c on c.id=m.company_id
  where c.slug='vertice' and m.role='owner'
    and m.user_id='99999999-9999-9999-9999-999999999999';                     -- 1
select 'assert_seed OK';
```

- [ ] **Step 3: Run to verify it FAILS**

```bash
docker rm -f crm_test_db >/dev/null 2>&1; bash <SCRATCH>/crm/boot.sh
p -f supabase/migrations/20260705_crm_schema.sql
p -f <SCRATCH>/crm/fixtures.sql
p -f <SCRATCH>/crm/assert_seed.sql
```
Expected: FAIL — `company | 0` (seed not written yet).

- [ ] **Step 4: Write the seed migration**

Create `supabase/migrations/20260705_crm_seed.sql`:

```sql
-- ============================================================
-- CRM — SEED opcional (para testes). Cria a Vértice como tenant 1,
-- um funil de PROSPECÇÃO ATIVA (outbound) de exemplo e vincula os
-- admins existentes como owners. Idempotente.
-- As etapas são DADO configurável — este seed é só um ponto de partida.
-- ============================================================

insert into public.companies (name, slug)
values ('Vértice', 'vertice')
on conflict (slug) do nothing;

-- funil outbound de exemplo (só insere se a empresa ainda não tem etapas)
with c as (select id from public.companies where slug='vertice')
insert into public.pipeline_stages (company_id, name, position, stage_type)
select c.id, s.name, s.pos, s.kind
from c, (values
  ('Prospecção',        1, 'open'),
  ('Contato feito',     2, 'open'),
  ('Diagnóstico',       3, 'open'),
  ('Proposta enviada',  4, 'open'),
  ('Negociação',        5, 'open'),
  ('Ganho',             6, 'won'),
  ('Perdido',           7, 'lost')
) as s(name, pos, kind)
where not exists (
  select 1 from public.pipeline_stages ps where ps.company_id = c.id
);

-- vincula admins atuais como owners da Vértice
with c as (select id from public.companies where slug='vertice')
insert into public.memberships (company_id, user_id, role)
select c.id, p.id, 'owner'
from c, public.profiles p
where p.role = 'admin'
on conflict (user_id, company_id) do nothing;
```

- [ ] **Step 5: Apply + run to verify PASS**

```bash
p -f supabase/migrations/20260705_crm_seed.sql
p -f <SCRATCH>/crm/assert_seed.sql
p -f supabase/migrations/20260705_crm_seed.sql   # idempotency: re-run
p -f <SCRATCH>/crm/assert_seed.sql               # still 1 company / 7 stages / 1 owner
```
Expected: `company | 1`, `stages | 7`, `won | 1`, `lost | 1`, `admin_owner | 1`, unchanged after re-run.

- [ ] **Step 6: Commit + teardown**

```bash
git add supabase/migrations/20260705_crm_seed.sql
git commit -m "feat: seed opcional do CRM (tenant Vértice, funil outbound, admins owners)"
docker rm -f crm_test_db >/dev/null 2>&1 || true
```

---

## Manual production apply (NOT part of automated execution)

When the user decides to go live, they run, in order, against the production Supabase (SQL editor or CLI):
1. `20260705_crm_schema.sql`
2. `20260705_crm_rls.sql`
3. `20260705_crm_seed.sql` (optional)

Then verify with `mcp__supabase__get_advisors` (security lint) that no CRM table is left without RLS.

---

## Self-Review

**Spec coverage:**
- 8 tables (companies, memberships, pipeline_stages, clients, contact_channels, interactions, tasks, automation_rules) → Task 1. ✔
- memberships (user↔company, per-company role, integrates auth, no duplicate identity) → Task 1. ✔
- Configurable funnel as rows → pipeline_stages (Task 1) + seed rows (Task 3). ✔
- automation_rules JSONB per part (trigger/conditions/action) → Task 1. ✔
- Immutable history → interactions with SELECT/INSERT-only policies + immutability test → Task 2. ✔
- Strict tenant isolation via RLS, no admin bypass → Task 2 (`is_member_of`, no `is_admin` reference) + isolation/leak tests. ✔
- Owner-gated membership management → `is_company_owner` policies (Task 2). ✔
- SQL migrations + RLS policies + textual diagram (in spec) + optional seed → Tasks 1–3. ✔
- Write-only, no prod apply → all verification local Docker; manual-apply section separated. ✔

**Placeholder scan:** none — every step has full SQL/commands. `<SCRATCH>` and `20260705_` are concrete conventions (session scratchpad path; fixed date prefix), not TBDs.

**Type consistency:** function names `is_member_of`/`is_company_owner`/`crm_touch_updated_at`, policy names `crm_<table>_<op>`, and column names are identical across Tasks 1–3 and the assertions. ✔

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

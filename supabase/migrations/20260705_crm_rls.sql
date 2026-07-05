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

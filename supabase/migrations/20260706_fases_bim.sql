-- Fases BIM curadas manualmente, associando GlobalIds IFC a fases da obra.
-- Fonte de verdade da linha do tempo do viewer: o IFC não traz fase confiável,
-- então o admin atribui elementos a fases no HQ e o portal só lê daqui.
-- GlobalId (IfcGloballyUniqueId) é estável entre reexportações do arquivo;
-- o expressID numérico do web-ifc não é — por isso nunca é persistido.

create table if not exists public.bim_phases (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  seq         int  not null,
  name        text not null,
  elements    text[] not null default '{}',   -- GlobalIds IFC atribuídos à fase
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, seq)
);

create index if not exists bim_phases_project_idx on public.bim_phases (project_id);

alter table public.bim_phases enable row level security;

-- Cliente enxerga as fases do próprio projeto; admin enxerga tudo
drop policy if exists "Cliente ve fases do seu projeto" on public.bim_phases;
create policy "Cliente ve fases do seu projeto"
  on public.bim_phases for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.client_id = auth.uid()
    )
  );

-- Só admin cria/edita/remove fases
drop policy if exists "Admin gerencia fases BIM" on public.bim_phases;
create policy "Admin gerencia fases BIM"
  on public.bim_phases for all
  using (public.is_admin())
  with check (public.is_admin());

-- updated_at automático
create or replace function public.touch_bim_phases()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.touch_bim_phases() from anon, authenticated, public;

drop trigger if exists trg_touch_bim_phases on public.bim_phases;
create trigger trg_touch_bim_phases
  before update on public.bim_phases
  for each row execute function public.touch_bim_phases();

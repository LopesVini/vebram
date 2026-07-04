-- 20260704_pranchas.sql
-- Pranchas de projeto (PDF/DWG) publicadas pelo admin para download do cliente.
--   1) Tabela public.pranchas + RLS (cliente lê as do seu projeto; admin gerencia)
--   2) Bucket PRIVADO "pranchas" (download via signed URL no app)
--   3) Políticas de storage espelhando a regra da tabela
--   4) Leitura de "Orçamentos" para admin (gráfico de leads no dashboard HQ)

-- ---------- 1. Tabela ----------
create table if not exists public.pranchas (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  discipline  text not null check (discipline in ('arquitetonico','estrutural','eletrico','hidrossanitario','outros')),
  name        text not null,
  file_path   text not null,
  file_type   text not null check (file_type in ('pdf','dwg')),
  size_bytes  bigint,
  created_at  timestamptz not null default now()
);

create index if not exists idx_pranchas_project on public.pranchas(project_id);

alter table public.pranchas enable row level security;

drop policy if exists "Cliente lê pranchas do seu projeto" on public.pranchas;
create policy "Cliente lê pranchas do seu projeto"
  on public.pranchas for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = pranchas.project_id and p.client_id = auth.uid()
    )
  );

drop policy if exists "Admin gerencia pranchas" on public.pranchas;
create policy "Admin gerencia pranchas"
  on public.pranchas for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- 2. Bucket privado ----------
insert into storage.buckets (id, name, public)
values ('pranchas', 'pranchas', false)
on conflict (id) do nothing;

-- ---------- 3. Políticas de storage ----------
-- Caminho: {projectId}/{disciplina}/{arquivo} → 1º segmento identifica o projeto.
drop policy if exists "Admin envia pranchas" on storage.objects;
create policy "Admin envia pranchas"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pranchas' and public.is_admin());

drop policy if exists "Admin atualiza pranchas" on storage.objects;
create policy "Admin atualiza pranchas"
  on storage.objects for update to authenticated
  using (bucket_id = 'pranchas' and public.is_admin());

drop policy if exists "Admin remove pranchas" on storage.objects;
create policy "Admin remove pranchas"
  on storage.objects for delete to authenticated
  using (bucket_id = 'pranchas' and public.is_admin());

drop policy if exists "Cliente baixa pranchas do seu projeto" on storage.objects;
create policy "Cliente baixa pranchas do seu projeto"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pranchas' and (
      public.is_admin()
      or exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(name))[1]
          and p.client_id = auth.uid()
      )
    )
  );

-- ---------- 4. Orçamentos: admin lê, formulário público continua inserindo ----------
alter table public."Orçamentos" enable row level security;

drop policy if exists "Qualquer um envia orçamento" on public."Orçamentos";
create policy "Qualquer um envia orçamento"
  on public."Orçamentos" for insert to anon, authenticated
  with check (true);

drop policy if exists "Admin lê orçamentos" on public."Orçamentos";
create policy "Admin lê orçamentos"
  on public."Orçamentos" for select to authenticated
  using (public.is_admin());

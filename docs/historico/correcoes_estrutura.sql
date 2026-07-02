-- ============================================================
-- CORREÇÕES DE ESTRUTURA — Vertice
-- Rode no painel Supabase -> SQL Editor -> New query -> Run.
-- Idempotente: pode rodar mais de uma vez sem problema.
--
-- O que este script faz:
--   1) ADMIN por CARGO (role), não mais por e-mail.
--   2) MURAL 100% interno: cliente deixa de enxergar posts.
--   3) COMENTÁRIOS do cliente nas entregas (nova tabela segura).
-- ============================================================


-- ============================================================
-- 1. ADMIN DECIDIDO PELA COLUNA "role" (não mais pelo e-mail)
-- ------------------------------------------------------------
-- Antes: is_admin() olhava o TEXTO do e-mail (@vertice/admin).
-- Agora: is_admin() olha o CARGO gravado em profiles.role.
-- (Mantemos o e-mail apenas como rede de segurança para o caso
--  raro de um perfil ainda não ter cargo definido.)
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    -- 1º) fonte da verdade: o cargo gravado no banco
    (select role from public.profiles where id = auth.uid()) = 'admin',
    -- 2º) rede de segurança (só vale se o perfil não tiver cargo)
    (auth.jwt() ->> 'email') ilike '%@vertice%',
    false
  );
$$;

-- Garante que quem já é da equipe (@vertice) tenha o cargo gravado.
update public.profiles
   set role = 'admin'
 where email ilike '%@vertice%'
   and role is distinct from 'admin';


-- ============================================================
-- 2. MURAL 100% INTERNO — fechar a porta que vazava
-- ------------------------------------------------------------
-- Havia uma política que deixava o cliente LER posts do Mural
-- vinculados ao seu projeto. Removemos: o Mural passa a ser
-- exclusivo da equipe. O canal oficial para o cliente é a aba
-- "Atualizações" (tabela public.updates), publicada de propósito.
-- ============================================================
drop policy if exists "Cliente ve posts do seu projeto" on public.posts;


-- ============================================================
-- 3. COMENTÁRIOS DO CLIENTE NAS ENTREGAS
-- ------------------------------------------------------------
-- Tabela nova, ligada a cada atualização (updates). Cliente e
-- equipe podem conversar ali. As regras de segurança (RLS)
-- garantem que cada cliente só vê/comenta as SUAS entregas.
-- ============================================================
create table if not exists public.update_comments (
  id         uuid primary key default gen_random_uuid(),
  update_id  uuid not null references public.updates(id)  on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_update_comments_update_id on public.update_comments(update_id);
create index if not exists idx_update_comments_author_id on public.update_comments(author_id);

alter table public.update_comments enable row level security;

grant select, insert, delete on public.update_comments to authenticated;

-- Limpa políticas antigas (se rodar de novo) e recria
drop policy if exists "Ver comentarios das minhas entregas"    on public.update_comments;
drop policy if exists "Comentar nas minhas entregas"           on public.update_comments;
drop policy if exists "Apagar o proprio comentario ou admin"   on public.update_comments;

-- LER: admin vê tudo; cliente vê os comentários das entregas do SEU projeto.
create policy "Ver comentarios das minhas entregas" on public.update_comments
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
        from public.updates u
        join public.projects p on p.id = u.project_id
       where u.id = update_comments.update_id
         and p.client_id = (select auth.uid())
    )
  );

-- COMENTAR: sempre em nome próprio; admin em qualquer entrega,
-- cliente só nas entregas do seu projeto.
create policy "Comentar nas minhas entregas" on public.update_comments
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      (select public.is_admin())
      or exists (
        select 1
          from public.updates u
          join public.projects p on p.id = u.project_id
         where u.id = update_comments.update_id
           and p.client_id = (select auth.uid())
      )
    )
  );

-- APAGAR: o próprio autor ou um admin.
create policy "Apagar o proprio comentario ou admin" on public.update_comments
  for delete to authenticated
  using (
    (select public.is_admin())
    or author_id = (select auth.uid())
  );

-- Realtime (opcional): comentários aparecem sem precisar recarregar.
do $$
begin
  alter publication supabase_realtime add table public.update_comments;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- FIM. Depois de rodar, confira em Advisors (Reports ->
-- Security/Performance) se não surgiu nenhum aviso novo.
-- ============================================================

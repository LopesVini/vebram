-- ============================================================
-- BANCO COMPLETO — VÉRTICE + THE VERTICE  (fonte única da verdade)
-- ------------------------------------------------------------
-- ATENÇÃO (2026-07-02): partes deste arquivo foram SUPERADAS pela
-- migração supabase/migrations/20260702_seguranca_banco.sql, que:
--   - remove o admin automático por e-mail (handle_new_user/is_admin);
--   - cria a RPC approve_milestone e o trigger de progresso;
--   - adiciona as políticas de Storage do bucket ifc-models.
-- Se rodar este arquivo de novo, rode a migração DEPOIS dele.
-- ------------------------------------------------------------
-- Rode no painel Supabase -> SQL Editor -> New query -> Run.
-- Pode rodar INTEIRO e quantas vezes quiser (é idempotente:
-- "criar se não existir" + substitui regras antigas).
--
-- Este arquivo substitui/consolida:
--   - fix_criar_usuario.sql   (correção de criar usuário)
--   - revisao_banco.sql       (índices, segurança, otimizações)
--   - consolidated_schema.sql (tabelas do The Vertice)
-- Depois de rodar, esses três podem ir para uma pasta "historico".
--
-- Modelo de admin: quem é SÓCIO/EQUIPE é decidido pelo E-MAIL
-- (contém "admin" ou "@vertice") — igual ao que o site já faz.
-- ============================================================


-- ============================================================
-- 1. EXTENSÕES
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
-- 2. TABELAS (criadas apenas se ainda não existirem)
-- ============================================================

-- Perfis (a "ficha" de cada pessoa, ligada ao login)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  email text,
  role text not null default 'client',       -- 'admin' (sócios/equipe) ou 'client'
  tag text not null default '#contratos',    -- disciplina principal (para a equipe)
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
-- Garante a coluna "tag" caso a tabela já existisse sem ela (necessária p/ The Vertice)
alter table public.profiles add column if not exists tag text not null default '#contratos';
alter table public.profiles add column if not exists metadata jsonb default '{}'::jsonb;

-- Projetos
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references public.profiles(id) on delete set null,
  type text,
  status text not null default 'Em Andamento',
  progress numeric default 0,
  priority text default 'Média',
  color text,
  team text[],
  start_date date,
  end_date date,
  description text,
  ifc_url text,
  created_at timestamptz default now()
);

-- Marcos (milestones)
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  status text not null default 'pending',
  date date,
  sort_order integer default 0,
  weight numeric default 1,
  total_items integer default null,
  delivered_items integer default 0,
  approved_at timestamptz default null,
  created_at timestamptz default now()
);

-- Atualizações (timeline do projeto)
create table if not exists public.updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  content text,
  author_name text not null,
  color text,
  created_at timestamptz default now()
);

-- Mensagens (chat)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  read_at timestamptz default null,
  created_at timestamptz default now()
);

-- ---------- THE VERTICE ----------

-- Posts (mural / feed)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  tag text not null default '#contratos',
  title text not null,
  content text not null,
  image text,                 -- base64 (imagem comprimida no navegador)
  views integer not null default 0,
  created_at timestamptz default now()
);

-- Comentários
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text,
  image text,
  created_at timestamptz default now()
);

-- Curtidas
create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  primary key (post_id, user_id)
);

-- Calendário (disponibilidade / carga horária)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  type text not null,         -- 'ferias', 'ocupado', 'disponivel'
  note text,
  created_at timestamptz default now()
);

-- Enquetes
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade not null,
  question text not null,
  created_at timestamptz default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.polls(id) on delete cascade not null,
  text text not null,
  position integer not null default 0
);

create table if not exists public.poll_votes (
  poll_id uuid references public.polls(id) on delete cascade not null,
  option_id uuid references public.poll_options(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  primary key (poll_id, user_id)
);


-- ============================================================
-- 3. FUNÇÕES
-- ============================================================

-- Cria a ficha (profile) automaticamente quando um usuário é criado.
-- search_path = public: corrige o antigo "Database error creating new user".
-- Aceita role explícito via metadata; senão decide pelo e-mail.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, role, tag, metadata)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    case
      when new.raw_user_meta_data->>'role' in ('admin','client') then new.raw_user_meta_data->>'role'
      when new.email ilike '%@vertice%' or new.email ilike '%admin%' then 'admin'
      else 'client'
    end,
    coalesce(new.raw_user_meta_data->>'tag', '#contratos'),
    jsonb_build_object('role_title', coalesce(new.raw_user_meta_data->>'role_title', 'Equipe'))
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'handle_new_user falhou para %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- O USUÁRIO ATUAL é sócio/equipe? (pelo e-mail do login — igual ao site)
-- Não consulta profiles, então não causa recursão nas políticas.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    -- fonte da verdade: o cargo gravado em profiles.role
    (select role from public.profiles where id = auth.uid()) = 'admin',
    -- rede de segurança (só vale se o perfil ainda não tiver cargo)
    (auth.jwt() ->> 'email') ilike '%@vertice%',
    false
  );
$$;

-- Conta visualizações de um post (chamada pelo app via rpc)
create or replace function public.increment_views(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts set views = views + 1 where id = p_id;
$$;


-- ============================================================
-- 4. SEGURANÇA (RLS) — UM conjunto único e limpo
-- ------------------------------------------------------------
-- Primeiro habilita RLS; depois remove QUALQUER política antiga
-- (nomes antigos e novos) e recria a versão final e otimizada.
-- Otimização: auth.uid() e is_admin() dentro de (select ...).
-- ============================================================

alter table public.profiles     enable row level security;
alter table public.projects     enable row level security;
alter table public.milestones   enable row level security;
alter table public.updates      enable row level security;
alter table public.messages     enable row level security;
alter table public.posts        enable row level security;
alter table public.comments     enable row level security;
alter table public.post_likes   enable row level security;
alter table public.events       enable row level security;
alter table public.polls        enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes   enable row level security;

-- Remove políticas antigas (as duas gerações de nomes que já existiram)
do $$
declare pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','projects','milestones','updates','messages',
                        'posts','comments','post_likes','events','polls','poll_options','poll_votes')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- ---------- PROFILES ----------
create policy "Socio ve todos os perfis" on public.profiles
  for select to authenticated using ((select public.is_admin()));
create policy "Usuario ve o proprio perfil" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Usuario gerencia o proprio perfil" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------- PROJECTS ----------
create policy "Socio gerencia projetos" on public.projects
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Cliente ve seus projetos" on public.projects
  for select to authenticated using (client_id = (select auth.uid()));

-- ---------- MILESTONES ----------
create policy "Socio gerencia milestones" on public.milestones
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Cliente ve milestones dos seus projetos" on public.milestones
  for select to authenticated using (
    exists (select 1 from public.projects
            where projects.id = milestones.project_id
              and projects.client_id = (select auth.uid()))
  );

-- ---------- UPDATES ----------
create policy "Socio gerencia updates" on public.updates
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Cliente ve updates dos seus projetos" on public.updates
  for select to authenticated using (
    exists (select 1 from public.projects
            where projects.id = updates.project_id
              and projects.client_id = (select auth.uid()))
  );

-- ---------- MESSAGES ----------
create policy "Usuario ve mensagens que enviou ou recebeu" on public.messages
  for select to authenticated
  using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));
create policy "Usuario envia mensagens" on public.messages
  for insert to authenticated with check (sender_id = (select auth.uid()));
create policy "Usuario marca como lida as recebidas" on public.messages
  for update to authenticated using (receiver_id = (select auth.uid()));

-- ---------- POSTS (feed) — MURAL 100% INTERNO ----------
-- Só a equipe (admin) acessa o Mural. O cliente NÃO lê posts:
-- o canal oficial para o cliente é a tabela public.updates.
create policy "Socio gerencia posts" on public.posts
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- COMMENTS / LIKES / EVENTS / POLLS (internas da equipe) ----------
create policy "Socio gerencia comentarios" on public.comments
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Socio gerencia likes" on public.post_likes
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Socio gerencia eventos" on public.events
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Socio gerencia enquetes" on public.polls
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Socio gerencia opcoes de enquete" on public.poll_options
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Socio gerencia votos de enquete" on public.poll_votes
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));


-- ============================================================
-- 5. PERMISSÕES DE ACESSO ÀS TABELAS (a RLS acima ainda filtra tudo)
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.increment_views(uuid) to authenticated;

-- Funções internas NÃO devem ser chamáveis de fora pela API:
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke all on function public.is_admin() from anon;   -- usada só dentro das políticas


-- ============================================================
-- 6. ÍNDICES (deixam buscas rápidas conforme os dados crescem)
-- ============================================================
create index if not exists idx_messages_receiver_id on public.messages(receiver_id);
create index if not exists idx_messages_sender_id    on public.messages(sender_id);
create index if not exists idx_milestones_project_id on public.milestones(project_id);
create index if not exists idx_projects_client_id    on public.projects(client_id);
create index if not exists idx_updates_project_id    on public.updates(project_id);
create index if not exists idx_posts_author_id       on public.posts(author_id);
create index if not exists idx_posts_project_id      on public.posts(project_id);
create index if not exists idx_comments_post_id      on public.comments(post_id);
create index if not exists idx_comments_author_id    on public.comments(author_id);
create index if not exists idx_post_likes_user_id    on public.post_likes(user_id);
create index if not exists idx_events_user_id        on public.events(user_id);
create index if not exists idx_polls_author_id       on public.polls(author_id);
create index if not exists idx_poll_options_poll_id  on public.poll_options(poll_id);
create index if not exists idx_poll_votes_user_id    on public.poll_votes(user_id);
create index if not exists idx_poll_votes_option_id  on public.poll_votes(option_id);


-- ============================================================
-- 7. LIMPEZA: webhook ligado por engano na área de Auth
-- ============================================================
drop trigger if exists "orçamentos" on auth.audit_log_entries;


-- ============================================================
-- 8. TEMPO REAL (atualização ao vivo entre dispositivos)
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['profiles','projects','milestones','updates','messages',
                           'posts','comments','post_likes','events','polls','poll_options','poll_votes'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ============================================================
-- FIM. Depois de rodar:
--  - The Vertice deve funcionar (feed, calendário, enquetes, membros).
--  - Reports -> Advisors deve ficar praticamente sem avisos.
--  - Teste logado com um e-mail de sócio (contém "@vertice" ou "admin").
-- ============================================================

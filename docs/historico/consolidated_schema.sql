-- ============================================================
-- VÉRTICE + THE VERTICE — ESTRUTURA DO BANCO DE DADOS CONSOLIDADA
-- Cole este script no SQL Editor do Supabase no banco principal.
-- ============================================================

-- ---------- 1. Extensões ----------
create extension if not exists "uuid-ossp";

-- ---------- 2. Tabela de Perfis (Profiles) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  email text,
  role text not null default 'client', -- 'admin' (sócios/equipe) ou 'client'
  tag text not null default '#contratos', -- Disciplina principal (para sócios/equipe)
  metadata jsonb default '{}'::jsonb, -- Informações adicionais (telefone, cidade, empresa, vip, cargo específico)
  created_at timestamptz default now()
);

-- Se a tabela profiles JÁ existia (criada antes deste script) com menos colunas,
-- o "create table if not exists" acima é ignorado. Estas linhas garantem que
-- todas as colunas usadas pelo trigger/app existam — evita o erro
-- "Database error creating new user" ao criar usuários.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'client';
alter table public.profiles add column if not exists tag text not null default '#contratos';
alter table public.profiles add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists created_at timestamptz default now();

-- ---------- 3. Tabela de Projetos ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references public.profiles(id) on delete set null,
  type text,
  status text not null default 'Em Andamento', -- 'Em Andamento', 'Revisão', 'Concluído', 'Pausado'
  progress numeric default 0, -- Porcentagem do progresso
  priority text default 'Média', -- 'Alta', 'Média', 'Baixa'
  color text,
  team text[], -- Array de membros da equipe/sócios responsáveis
  start_date date,
  end_date date,
  description text,
  ifc_url text,
  created_at timestamptz default now()
);

-- ---------- 4. Tabela de Milestones (Marcos do Projeto) ----------
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  status text not null default 'pending', -- 'done', 'active', 'pending'
  date date,
  sort_order integer default 0,
  weight numeric default 1,
  total_items integer default null,
  delivered_items integer default 0,
  approved_at timestamptz default null,
  created_at timestamptz default now()
);

-- ---------- 5. Tabela de Atualizações Clássica (Timeline) ----------
create table if not exists public.updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  content text,
  author_name text not null,
  color text,
  created_at timestamptz default now()
);

-- ---------- 6. Mensagens de Chat (Suporte / Contatos) ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  read_at timestamptz default null,
  created_at timestamptz default now()
);

-- ============================================================
-- TABELAS PROVENIENTES DO THE VERTICE (INTEGRADO)
-- ============================================================

-- ---------- 7. Posts (Mural / Feed) ----------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade, -- Se preenchido, compartilha com o cliente
  tag text not null default '#contratos', -- Categoria do feed
  title text not null,
  content text not null,
  image text, -- Armazenamento em Base64
  views integer not null default 0,
  created_at timestamptz default now()
);

-- ---------- 8. Comentários nos Posts ----------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text,
  image text, -- Base64
  created_at timestamptz default now()
);

-- ---------- 9. Curtidas (Likes) ----------
create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  primary key (post_id, user_id)
);

-- ---------- 10. Calendário de Carga Horária/Disponibilidade ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  type text not null, -- 'ferias', 'ocupado', 'disponivel'
  note text,
  created_at timestamptz default now()
);

-- ---------- 11. Enquetes ----------
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade not null,
  question text not null,
  created_at timestamptz default now()
);

-- ---------- 12. Opções de Votação ----------
create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.polls(id) on delete cascade not null,
  text text not null,
  position integer not null default 0
);

-- ---------- 13. Votos de Enquetes ----------
create table if not exists public.poll_votes (
  poll_id uuid references public.polls(id) on delete cascade not null,
  option_id uuid references public.poll_options(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  primary key (poll_id, user_id)
);

-- ============================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================

-- Função para incrementar visualizações de posts
create or replace function public.increment_views(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.posts set views = views + 1 where id = p_id;
$$;

-- Trigger para criar perfil automaticamente no cadastro (Supabase Auth)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email, role, tag, metadata)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    case
      when new.email like '%@vertice%' or new.email like '%admin%' then 'admin'
      else 'client'
    end,
    coalesce(new.raw_user_meta_data->>'tag', '#contratos'),
    jsonb_build_object(
      'role_title', coalesce(new.raw_user_meta_data->>'role', 'Equipe')
    )
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    email = excluded.email,
    role = excluded.role;
  return new;
exception when others then
  -- Nunca bloqueia a criação do usuário no auth por causa de falha no profile.
  -- O erro é registrado nos logs do Postgres; o profile pode ser reconciliado depois.
  raise warning 'handle_new_user falhou para % : %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Função auxiliar: o USUÁRIO ATUAL é sócio/equipe?
-- Baseia-se no e-mail do JWT (mesma regra do HqLayout.tsx: contém 'admin' ou '@vertice').
-- É security definer + stable para evitar recursão de RLS ao ser usada em políticas
-- (não consulta public.profiles, então não recursa na própria tabela profiles).
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(
    (auth.jwt() ->> 'email') ilike '%@vertice%'
    or (auth.jwt() ->> 'email') ilike '%admin%',
    false
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Habilitar RLS em todas as tabelas
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.updates enable row level security;
alter table public.messages enable row level security;

alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.events enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

-- ---------- POLÍTICAS: PROFILES ----------
-- IMPORTANTE: a checagem de "sócio" usa is_admin() (e-mail do JWT do USUÁRIO ATUAL),
-- e não o e-mail da linha sendo lida. Checar a coluna email da linha deixaria
-- clientes verem os perfis dos sócios e impediria sócios de verem clientes.
drop policy if exists "Socio ve tudo" on public.profiles;
create policy "Socio ve tudo" on public.profiles
  for select to authenticated
  using ( public.is_admin() );

drop policy if exists "Clientes veem a si mesmos" on public.profiles;
create policy "Clientes veem a si mesmos" on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Cada usuário só pode inserir/atualizar/apagar a própria linha.
-- (Sócios gerenciam papéis de clientes via supabaseAdmin, que ignora RLS.)
drop policy if exists "Clientes inserem e atualizam a si mesmos" on public.profiles;
create policy "Usuario gerencia o proprio perfil" on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- POLÍTICAS: PROJECTS ----------
drop policy if exists "Socio gerencia projetos" on public.projects;
create policy "Socio gerencia projetos" on public.projects 
  for all to authenticated 
  using ( public.is_admin() );

drop policy if exists "Clientes veem seus projetos" on public.projects;
create policy "Clientes veem seus projetos" on public.projects 
  for select to authenticated 
  using (client_id = auth.uid());

-- ---------- POLÍTICAS: MILESTONES ----------
drop policy if exists "Socio gerencia milestones" on public.milestones;
create policy "Socio gerencia milestones" on public.milestones 
  for all to authenticated 
  using ( public.is_admin() );

drop policy if exists "Clientes veem milestones dos seus projetos" on public.milestones;
create policy "Clientes veem milestones dos seus projetos" on public.milestones 
  for select to authenticated 
  using (
    exists (
      select 1 from public.projects 
      where projects.id = milestones.project_id and projects.client_id = auth.uid()
    )
  );

-- ---------- POLÍTICAS: UPDATES ----------
drop policy if exists "Socio gerencia updates" on public.updates;
create policy "Socio gerencia updates" on public.updates 
  for all to authenticated 
  using ( public.is_admin() );

drop policy if exists "Clientes veem updates dos seus projetos" on public.updates;
create policy "Clientes veem updates dos seus projetos" on public.updates 
  for select to authenticated 
  using (
    exists (
      select 1 from public.projects 
      where projects.id = updates.project_id and projects.client_id = auth.uid()
    )
  );

-- ---------- POLÍTICAS: MESSAGES (Chat) ----------
drop policy if exists "Usuarios veem mensagens que enviaram ou receberam" on public.messages;
create policy "Usuarios veem mensagens que enviaram ou receberam" on public.messages 
  for select to authenticated 
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Usuarios enviam mensagens" on public.messages;
create policy "Usuarios enviam mensagens" on public.messages 
  for insert to authenticated 
  with check (sender_id = auth.uid());

drop policy if exists "Usuarios atualizam (lida) mensagens recebidas" on public.messages;
create policy "Usuarios atualizam (lida) mensagens recebidas" on public.messages 
  for update to authenticated 
  using (receiver_id = auth.uid());

-- ---------- POLÍTICAS: POSTS (Feed / Mural) ----------
drop policy if exists "Socio gerencia posts" on public.posts;
create policy "Socio gerencia posts" on public.posts 
  for all to authenticated 
  using ( public.is_admin() );

drop policy if exists "Clientes veem posts vinculados aos seus projetos" on public.posts;
create policy "Clientes veem posts vinculados aos seus projetos" on public.posts 
  for select to authenticated 
  using (
    exists (
      select 1 from public.projects 
      where projects.id = posts.project_id and projects.client_id = auth.uid()
    )
  );

-- ---------- POLÍTICAS: COMMENTS (Comentários) ----------
drop policy if exists "Socio gerencia comentarios" on public.comments;
create policy "Socio gerencia comentarios" on public.comments 
  for all to authenticated 
  using ( public.is_admin() );

-- ---------- POLÍTICAS: POST_LIKES (Curtidas) ----------
drop policy if exists "Socio gerencia likes" on public.post_likes;
create policy "Socio gerencia likes" on public.post_likes 
  for all to authenticated 
  using ( public.is_admin() );

-- ---------- POLÍTICAS: EVENTS (Calendário) ----------
drop policy if exists "Socio gerencia eventos" on public.events;
create policy "Socio gerencia eventos" on public.events 
  for all to authenticated 
  using ( public.is_admin() );

-- ---------- POLÍTICAS: POLLS, OPTIONS, VOTES (Enquetes) ----------
drop policy if exists "Socio gerencia enquetes" on public.polls;
create policy "Socio gerencia enquetes" on public.polls 
  for all to authenticated 
  using ( public.is_admin() );

drop policy if exists "Socio gerencia opcoes de enquetes" on public.poll_options;
create policy "Socio gerencia opcoes de enquetes" on public.poll_options 
  for all to authenticated 
  using ( public.is_admin() );

drop policy if exists "Socio gerencia votos de enquetes" on public.poll_votes;
create policy "Socio gerencia votos de enquetes" on public.poll_votes 
  for all to authenticated 
  using ( public.is_admin() );

-- ============================================================
-- REALTIME (Atualização ao vivo entre dispositivos)
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['profiles','projects','milestones','updates','messages','posts','comments','post_likes','events','polls','poll_options','poll_votes'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

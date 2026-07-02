-- ============================================================
-- CHAT, NOTIFICAÇÕES E TRAVA DE CARGO
-- ------------------------------------------------------------
-- Rode no painel Supabase -> SQL Editor -> New query -> Run.
-- Idempotente: pode rodar mais de uma vez sem problema.
-- Rode ANTES de publicar o site novo (o sino do HQ usa a tabela
-- notifications criada aqui).
--
--   1) TRAVA: usuário não pode alterar o próprio cargo (role)
--   2) CHAT: cliente passa a enxergar os perfis da equipe
--   3) NOTIFICAÇÕES: tabela + gatilho quando cliente comenta
--   4) REALTIME: chat e notificações ao vivo
-- ============================================================

-- ---------- 1. Ninguém se promove a admin sozinho ----------
-- A política "Usuario gerencia o proprio perfil" deixa o usuário
-- editar a própria linha — inclusive, hoje, a coluna role. Este
-- gatilho impede isso: requisições de usuário comum têm o role
-- forçado/preservado; só admins (ou o servidor) mudam cargos.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- auth.uid() nulo = requisição sem usuário (service role / SQL editor /
  -- gatilhos internos como handle_new_user) — essas podem tudo.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'client'; -- usuário comum nunca se insere como admin
  elsif new.role is distinct from old.role then
    new.role := old.role; -- preserva o cargo gravado; sem erro para não
                          -- quebrar upserts legítimos de perfil
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
before insert or update on public.profiles
for each row execute function public.protect_profile_role();

-- ---------- 2. Cliente enxerga a equipe (para o chat) ----------
-- Sem isso a lista de contatos do cliente vem vazia: ele só podia
-- ver o próprio perfil. Expõe apenas os perfis com cargo admin.
drop policy if exists "Cliente ve perfis da equipe" on public.profiles;
create policy "Cliente ve perfis da equipe"
  on public.profiles for select to authenticated
  using (role = 'admin');

-- ---------- 3. Notificações para a equipe ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null default 'comment',
  title text not null,
  body text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_recipient
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

-- Cada um só vê e marca como lidas as SUAS notificações.
drop policy if exists "Ver minhas notificacoes" on public.notifications;
create policy "Ver minhas notificacoes"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));

drop policy if exists "Marcar minhas notificacoes" on public.notifications;
create policy "Marcar minhas notificacoes"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()));

-- (sem política de INSERT: quem insere é o gatilho abaixo, no servidor)

-- Gatilho: cliente comentou numa atualização -> notifica todos os admins.
create or replace function public.notify_admins_on_client_comment()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_author_name text;
  v_author_role text;
  v_update_title text;
  v_project_name text;
begin
  select display_name, role into v_author_name, v_author_role
    from public.profiles where id = new.author_id;

  -- Comentário da própria equipe não gera notificação
  if v_author_role = 'admin' then
    return new;
  end if;

  select u.title, p.name into v_update_title, v_project_name
    from public.updates u
    join public.projects p on p.id = u.project_id
   where u.id = new.update_id;

  insert into public.notifications (recipient_id, actor_id, type, title, body)
  select pr.id,
         new.author_id,
         'comment',
         coalesce(v_author_name, 'Cliente') || ' comentou em uma atualização',
         'Projeto "' || coalesce(v_project_name, '—') || '", atualização "'
           || coalesce(v_update_title, '—') || '": '
           || left(coalesce(new.content, '(imagem)'), 140)
    from public.profiles pr
   where pr.role = 'admin';

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_on_client_comment on public.update_comments;
create trigger trg_notify_admins_on_client_comment
after insert on public.update_comments
for each row execute function public.notify_admins_on_client_comment();

-- Funções internas fora da API pública
revoke execute on function public.protect_profile_role() from anon, authenticated, public;
revoke execute on function public.notify_admins_on_client_comment() from anon, authenticated, public;

-- ---------- 4. Realtime (chat e sino ao vivo) ----------
-- Garante que as tabelas emitem eventos para o supabase.channel().
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
end $$;

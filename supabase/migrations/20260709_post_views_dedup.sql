-- Visualizações do mural hoje contam toda vez que um admin abre os
-- comentários de um post, mesmo que já tenha visto antes. Este arquivo
-- passa a contar no máximo 1 visualização por admin por post, no mesmo
-- padrão já usado em post_likes (tabela de junção com PK composta).

create table if not exists public.post_views (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  viewed_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_post_views_user_id on public.post_views(user_id);

alter table public.post_views enable row level security;

create policy "Socio gerencia visualizacoes" on public.post_views
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- posts.views permanece a contagem "oficial" (evita mudar o shape usado
-- no front); este trigger só incrementa quando a linha em post_views é
-- realmente nova — inserts repetidos do mesmo (post_id, user_id) nunca
-- chegam aqui por causa do "on conflict do nothing" na função abaixo.
create or replace function public.sync_post_views_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts set views = views + 1 where id = new.post_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_post_views_count on public.post_views;
create trigger trg_sync_post_views_count
  after insert on public.post_views
  for each row execute function public.sync_post_views_count();

-- Mesma assinatura/nome de antes (increment_views(uuid)) para o front não
-- precisar mudar a chamada RPC — só a implementação vira idempotente.
create or replace function public.increment_views(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.post_views (post_id, user_id)
  values (p_id, auth.uid())
  on conflict (post_id, user_id) do nothing;
end;
$$;

-- ============================================================
-- SEGURANÇA — elimina a necessidade da chave-mestra no site
-- ------------------------------------------------------------
-- Rode no painel Supabase -> SQL Editor -> New query -> Run.
-- Idempotente: pode rodar mais de uma vez sem problema.
--
-- IMPORTANTE: rode ANTES de publicar a nova versão do site —
-- o frontend novo chama a função approve_milestone criada aqui.
--
--   1) RPC approve_milestone: cliente aprova marco do SEU projeto
--   2) Trigger que recalcula projects.progress dentro do banco
--   3) handle_new_user sem brecha de admin por e-mail/metadata
--   4) is_admin() sem fallback por e-mail (perfis já têm role)
--   5) Políticas de Storage para o bucket ifc-models
-- ============================================================

-- ---------- 1. Aprovação de marco pelo cliente ----------
-- Roda com privilégios do banco (SECURITY DEFINER), mas SÓ permite
-- aprovar se quem chama for admin OU o cliente dono do projeto.
create or replace function public.approve_milestone(p_milestone_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not (
    public.is_admin()
    or exists (
      select 1
      from public.milestones m
      join public.projects p on p.id = m.project_id
      where m.id = p_milestone_id
        and p.client_id = auth.uid()
    )
  ) then
    raise exception 'Sem permissão para aprovar esta entrega.';
  end if;

  update public.milestones
     set approved_at = now(),
         status = 'done'
   where id = p_milestone_id;
end;
$$;

revoke execute on function public.approve_milestone(uuid) from anon, public;
grant execute on function public.approve_milestone(uuid) to authenticated;

-- ---------- 2. Progresso calculado pelo próprio banco ----------
-- Mesma regra do frontend (calcProgress): peso de cada marco;
-- aprovado = 100%; senão entregues/total; senão status.
create or replace function public.calc_project_progress(p_project_id uuid)
returns integer
language sql
stable
set search_path to 'public'
as $$
  select coalesce(round(
    sum(coalesce(m.weight, 1) * case
      when m.approved_at is not null then 100
      when coalesce(m.total_items, 0) > 0
        then (coalesce(m.delivered_items, 0)::numeric / m.total_items) * 100
      when m.status = 'done' then 100
      when m.status = 'active' then 50
      else 0
    end) / nullif(sum(coalesce(m.weight, 1)), 0)
  )::integer, 0)
  from public.milestones m
  where m.project_id = p_project_id;
$$;

create or replace function public.sync_project_progress()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- cobre INSERT/UPDATE/DELETE (inclusive marco movido de projeto)
  if tg_op in ('INSERT', 'UPDATE') then
    update public.projects
       set progress = public.calc_project_progress(new.project_id)
     where id = new.project_id;
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.project_id is distinct from new.project_id) then
    update public.projects
       set progress = public.calc_project_progress(old.project_id)
     where id = old.project_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_project_progress on public.milestones;
create trigger trg_sync_project_progress
after insert or update or delete on public.milestones
for each row execute function public.sync_project_progress();

-- ---------- 3. Novo usuário NUNCA nasce admin ----------
-- Antes: e-mail com "admin"/"@vertice" (ou metadata role=admin) virava
-- admin sozinho — qualquer pessoa podia se cadastrar assim e entrar no
-- HQ. Agora todo mundo nasce 'client'; promover a admin é ação manual
-- da equipe:  update public.profiles set role='admin' where email='...';
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, display_name, email, role, tag, metadata)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    'client',
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

-- ---------- 4. is_admin() só confia no cargo gravado ----------
-- O fallback por e-mail ("@vertice") deixou de ser necessário:
-- todos os perfis existentes já têm role definido no banco.
create or replace function public.is_admin()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'admin',
    false
  );
$$;

-- Funções internas não devem ser chamáveis pela API pública
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
revoke execute on function public.increment_views(uuid) from anon, public;

-- ---------- 5. Storage: só admin mexe nos modelos IFC ----------
-- Hoje o bucket não tem NENHUMA política: upload pelo app falha e
-- não há controle de escrita. Leitura continua pública (o visualizador
-- usa URL pública); gravar/alterar/apagar passa a exigir cargo admin.
drop policy if exists "Admin envia modelos IFC" on storage.objects;
create policy "Admin envia modelos IFC"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ifc-models' and public.is_admin());

drop policy if exists "Admin atualiza modelos IFC" on storage.objects;
create policy "Admin atualiza modelos IFC"
  on storage.objects for update to authenticated
  using (bucket_id = 'ifc-models' and public.is_admin());

drop policy if exists "Admin remove modelos IFC" on storage.objects;
create policy "Admin remove modelos IFC"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ifc-models' and public.is_admin());

-- ============================================================
-- REVISÃO COMPLETA DO BANCO — Vertice (2026-07-01)
-- Rode no painel Supabase -> SQL Editor -> New query -> Run.
-- Cada seção é independente; pode rodar tudo de uma vez.
-- ============================================================


-- ============================================================
-- SEÇÃO 1 — CONTROLE DE ADMIN vs CLIENTE
-- ------------------------------------------------------------
-- Hoje a "regra" que decide se um novo usuário é admin ou cliente
-- é o e-mail: se contém "@vertice" ou "admin", vira admin; senão,
-- cliente. Por isso "lucasadm@gmail.com" virou cliente (não contém
-- exatamente a palavra "admin"... contém "adm").
--
-- Melhoria: além do e-mail, passamos a aceitar um "role" explícito.
-- Assim, no futuro, uma tela no painel HQ pode criar usuários já
-- dizendo se é admin ou cliente (via user_metadata {"role":"admin"}).
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    case
      -- 1º) respeita um role explícito, se vier ('admin' ou 'client')
      when new.raw_user_meta_data->>'role' in ('admin','client')
        then new.raw_user_meta_data->>'role'
      -- 2º) senão, usa a regra do e-mail
      when new.email ilike '%@vertice%' or new.email ilike '%admin%'
        then 'admin'
      else 'client'
    end
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'handle_new_user falhou para %: %', new.id, sqlerrm;
  return new;
end;
$$;

-- --- Ajuste de usuários JÁ existentes ---
-- Para tornar alguém ADMIN, descomente e ajuste o e-mail:
-- update public.profiles set role = 'admin' where email = 'lucasadm@gmail.com';
--
-- Para tornar alguém CLIENTE:
-- update public.profiles set role = 'client' where email = 'fulano@exemplo.com';


-- ============================================================
-- SEÇÃO 2 — INCONSISTÊNCIA GRAVE: WEBHOOK NO LUGAR ERRADO
-- ------------------------------------------------------------
-- Existe um webhook chamado "orçamentos" ligado por engano na
-- tabela AUTH.AUDIT_LOG_ENTRIES (registro interno de TODOS os
-- eventos de login/auth), e não na tabela public."Orçamentos".
-- Ele dispara um POST para http://localhost:8080 a cada evento
-- de autenticação — o que em produção não existe e é lixo.
-- A tabela de orçamentos, por sua vez, NÃO tem webhook nenhum.
--
-- Recomendado: remover esse webhook errado.
-- (Se quiser o webhook de orçamentos de verdade, recrie pelo
--  painel: Database -> Webhooks, apontando para a URL do backend
--  de automação na Render, na tabela public."Orçamentos".)
drop trigger if exists "orçamentos" on auth.audit_log_entries;


-- ============================================================
-- SEÇÃO 3 — PERFORMANCE: ÍNDICES EM CHAVES ESTRANGEIRAS
-- ------------------------------------------------------------
-- O linter apontou 4 chaves estrangeiras sem índice. Isso deixa
-- buscas/joins mais lentos conforme os dados crescem. Seguro adicionar.
-- ============================================================
create index if not exists idx_messages_receiver_id on public.messages(receiver_id);
create index if not exists idx_milestones_project_id on public.milestones(project_id);
create index if not exists idx_projects_client_id   on public.projects(client_id);
create index if not exists idx_updates_project_id    on public.updates(project_id);


-- ============================================================
-- SEÇÃO 4 — SEGURANÇA (endurecimento simples e seguro)
-- ------------------------------------------------------------
-- Estas funções são internas (rodam via trigger), não deveriam
-- poder ser chamadas de fora pela API. Removemos essa permissão.
-- ============================================================
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;


-- ============================================================
-- SEÇÃO 5 (OPCIONAL) — OTIMIZAÇÃO DAS REGRAS DE SEGURANÇA (RLS)
-- ------------------------------------------------------------
-- O linter avisou que as políticas re-avaliam auth.uid() linha a
-- linha (lento em escala). A correção troca auth.uid() por
-- (select auth.uid()). A LÓGICA é EXATAMENTE A MESMA — só mais
-- rápido. É opcional; com poucos dados não faz diferença prática.
-- Rode este bloco inteiro se quiser deixar 100% sem avisos.
-- ============================================================

-- profiles
drop policy if exists "Authenticated can read profiles" on public.profiles;
create policy "Authenticated can read profiles" on public.profiles
  for select to authenticated using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id);

-- messages
drop policy if exists "Users see own messages" on public.messages;
create policy "Users see own messages" on public.messages
  for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

drop policy if exists "Users send messages" on public.messages;
create policy "Users send messages" on public.messages
  for insert to authenticated
  with check ((select auth.uid()) = sender_id);

-- projects
drop policy if exists "Admin full projects" on public.projects;
create policy "Admin full projects" on public.projects
  for all to authenticated
  using ((select role from public.profiles where id = (select auth.uid())) = 'admin')
  with check ((select role from public.profiles where id = (select auth.uid())) = 'admin');

drop policy if exists "Client reads own project" on public.projects;
create policy "Client reads own project" on public.projects
  for select to authenticated
  using (client_id = (select auth.uid()));

-- milestones
drop policy if exists "Admin full milestones" on public.milestones;
create policy "Admin full milestones" on public.milestones
  for all to authenticated
  using ((select role from public.profiles where id = (select auth.uid())) = 'admin')
  with check ((select role from public.profiles where id = (select auth.uid())) = 'admin');

drop policy if exists "Client reads own milestones" on public.milestones;
create policy "Client reads own milestones" on public.milestones
  for select to authenticated
  using ((select client_id from public.projects where id = milestones.project_id) = (select auth.uid()));

-- updates
drop policy if exists "Admin full updates" on public.updates;
create policy "Admin full updates" on public.updates
  for all to authenticated
  using ((select role from public.profiles where id = (select auth.uid())) = 'admin')
  with check ((select role from public.profiles where id = (select auth.uid())) = 'admin');

drop policy if exists "Client reads own updates" on public.updates;
create policy "Client reads own updates" on public.updates
  for select to authenticated
  using ((select client_id from public.projects where id = updates.project_id) = (select auth.uid()));

-- ============================================================
-- FIM. Depois de rodar, veja Advisors (Reports -> Security/Performance)
-- para confirmar que os avisos sumiram.
-- ============================================================

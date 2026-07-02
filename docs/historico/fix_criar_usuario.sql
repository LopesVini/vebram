-- ============================================================
-- CORREÇÃO: "Database error creating new user" no Supabase
-- ------------------------------------------------------------
-- Causa real (confirmada nos logs de Auth):
--   ERROR: relation "profiles" does not exist (SQLSTATE 42P01)
--
-- A função handle_new_user() roda automaticamente toda vez que
-- um usuário é criado no Auth, para criar a linha em profiles.
-- Ela é SECURITY DEFINER mas NÃO tinha "search_path" definido,
-- então, ao ser executada pelo Supabase, não encontrava a tabela
-- "profiles" (não sabia que ela fica no schema "public").
-- Isso abortava toda a criação do usuário.
--
-- A tabela profiles JÁ TEM todas as colunas necessárias
-- (id, display_name, email, role) — não faltava nenhuma coluna.
--
-- Correção: definir search_path = public e qualificar public.profiles.
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
      when new.email ilike '%@vertice%' or new.email ilike '%admin%' then 'admin'
      else 'client'
    end
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Rede de segurança: nunca bloquear a criação do usuário no Auth
  -- se o insert do profile falhar por qualquer motivo.
  raise warning 'handle_new_user falhou para %: %', new.id, sqlerrm;
  return new;
end;
$$;

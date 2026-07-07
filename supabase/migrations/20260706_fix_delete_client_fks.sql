-- ============================================================
-- FIX: não era possível excluir clientes (nem no app, nem no Supabase).
--
-- Causa: 3 foreign keys sem regra ON DELETE. Ao apagar um usuário,
-- o Postgres bloqueava porque havia linhas dependentes:
--   - projects.client_id      -> profiles.id      (NO ACTION)  [cliente tem projeto]
--   - messages.sender_id      -> auth.users.id    (NO ACTION)  [cliente enviou msg]
--   - messages.receiver_id    -> auth.users.id    (NO ACTION)  [cliente recebeu msg]
--
-- Correção:
--   - projects.client_id  -> ON DELETE SET NULL  (mantém o projeto, só desvincula o cliente)
--   - messages.*          -> ON DELETE CASCADE   (mensagens somem junto com o usuário;
--                                                 as colunas são NOT NULL, então SET NULL
--                                                 não é possível)
-- ============================================================

-- projects.client_id -> profiles.id : SET NULL
alter table public.projects
  drop constraint if exists projects_client_id_fkey;
alter table public.projects
  add constraint projects_client_id_fkey
  foreign key (client_id) references public.profiles(id) on delete set null;

-- messages.sender_id -> auth.users.id : CASCADE
alter table public.messages
  drop constraint if exists messages_sender_id_fkey;
alter table public.messages
  add constraint messages_sender_id_fkey
  foreign key (sender_id) references auth.users(id) on delete cascade;

-- messages.receiver_id -> auth.users.id : CASCADE
alter table public.messages
  drop constraint if exists messages_receiver_id_fkey;
alter table public.messages
  add constraint messages_receiver_id_fkey
  foreign key (receiver_id) references auth.users(id) on delete cascade;

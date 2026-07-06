-- ---------- Adiciona coluna color na tabela events ----------
alter table public.events add column if not exists color text;

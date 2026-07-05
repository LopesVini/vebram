-- ============================================================
-- CRM — SEED opcional (para testes). Cria a Vértice como tenant 1,
-- um funil de PROSPECÇÃO ATIVA (outbound) de exemplo e vincula os
-- admins existentes como owners. Idempotente.
-- As etapas são DADO configurável — este seed é só um ponto de partida.
-- ============================================================

insert into public.companies (name, slug)
values ('Vértice', 'vertice')
on conflict (slug) do nothing;

-- funil outbound de exemplo (só insere se a empresa ainda não tem etapas)
with c as (select id from public.companies where slug='vertice')
insert into public.pipeline_stages (company_id, name, position, stage_type)
select c.id, s.name, s.pos, s.kind
from c, (values
  ('Prospecção',        1, 'open'),
  ('Contato feito',     2, 'open'),
  ('Diagnóstico',       3, 'open'),
  ('Proposta enviada',  4, 'open'),
  ('Negociação',        5, 'open'),
  ('Ganho',             6, 'won'),
  ('Perdido',           7, 'lost')
) as s(name, pos, kind)
where not exists (
  select 1 from public.pipeline_stages ps where ps.company_id = c.id
);

-- vincula admins atuais como owners da Vértice
with c as (select id from public.companies where slug='vertice')
insert into public.memberships (company_id, user_id, role)
select c.id, p.id, 'owner'
from c, public.profiles p
where p.role = 'admin'
on conflict (user_id, company_id) do nothing;

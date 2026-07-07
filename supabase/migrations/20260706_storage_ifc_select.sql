-- Upload com upsert:true no bucket ifc-models exige políticas de SELECT,
-- INSERT e UPDATE (docs do Supabase Storage). INSERT/UPDATE já existem
-- (20260702_seguranca_banco.sql); faltava o SELECT — sem ele, substituir um
-- modelo existente falha com violação de RLS mesmo para admin.
-- A leitura pública dos arquivos (CDN) não passa por aqui: o bucket é público.

drop policy if exists "Admin le modelos IFC pela API" on storage.objects;
create policy "Admin le modelos IFC pela API"
  on storage.objects for select
  using (bucket_id = 'ifc-models' and public.is_admin());

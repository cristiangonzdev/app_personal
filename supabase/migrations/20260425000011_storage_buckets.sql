-- ─────────────────────────────────────────────
-- 00011 — Storage buckets privados
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public)
  values ('invoices', 'invoices', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('content_assets', 'content_assets', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('client_files', 'client_files', false) on conflict (id) do nothing;

-- Acceso authenticated; el server firma URLs cortas.
create policy "buckets_authenticated_read" on storage.objects
  for select to authenticated
  using (bucket_id in ('invoices','content_assets','client_files'));

create policy "buckets_authenticated_write" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('invoices','content_assets','client_files'));

create policy "buckets_authenticated_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('invoices','content_assets','client_files'))
  with check (bucket_id in ('invoices','content_assets','client_files'));

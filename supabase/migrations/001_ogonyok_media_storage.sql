-- ────────────────────────────────────────────────────────────────────────────
-- 001_ogonyok_media_storage.sql
-- Идемпотентная миграция публичного бакета ogonyok-media и политик RLS в Supabase Storage
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Регистрация бакета ogonyok-media (публичный, лимит 5 МБ на файл)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ogonyok-media',
  'ogonyok-media',
  true,
  5242880, -- 5 МБ (5 * 1024 * 1024)
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif', 'image/jpg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880;

-- 2. Включение RLS для storage.objects
alter table storage.objects enable row level security;

-- 3. Публичный SELECT: чтение любых медиа-файлов из бакета ogonyok-media
drop policy if exists "ogonyok_media_public_read" on storage.objects;
drop policy if exists "ogonyok_media_select" on storage.objects;
create policy "ogonyok_media_public_read" on storage.objects
  for select
  using (bucket_id = 'ogonyok-media');

-- 4. Authenticated INSERT: загрузка файлов в бакет ogonyok-media
drop policy if exists "ogonyok_media_user_insert" on storage.objects;
drop policy if exists "ogonyok_media_insert" on storage.objects;
drop policy if exists "ogonyok_media_authenticated_insert" on storage.objects;
create policy "ogonyok_media_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ogonyok-media');

-- 5. Authenticated UPDATE: обновление файлов в бакете ogonyok-media
drop policy if exists "ogonyok_media_user_update" on storage.objects;
drop policy if exists "ogonyok_media_update" on storage.objects;
drop policy if exists "ogonyok_media_authenticated_update" on storage.objects;
create policy "ogonyok_media_authenticated_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'ogonyok-media')
  with check (bucket_id = 'ogonyok-media');

-- 6. Authenticated DELETE: удаление собственных файлов в бакете ogonyok-media
drop policy if exists "ogonyok_media_user_delete" on storage.objects;
drop policy if exists "ogonyok_media_authenticated_delete" on storage.objects;
create policy "ogonyok_media_authenticated_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ogonyok-media');

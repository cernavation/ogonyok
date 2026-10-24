-- ────────────────────────────────────────────────────────────────────────────
-- 001_ogonyok_media_storage.sql
-- Идемпотентная миграция бакета ogonyok-media и политик RLS в Supabase Storage
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Регистрация бакета ogonyok-media (публичный, лимит 2 МБ на файл)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ogonyok-media',
  'ogonyok-media',
  true,
  2097152, -- 2 МБ (2 * 1024 * 1024)
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152;

-- 2. Включение RLS для storage.objects
alter table storage.objects enable row level security;

-- 3. Публичное чтение любых медиа-файлов из бакета ogonyok-media
drop policy if exists "ogonyok_media_public_read" on storage.objects;
create policy "ogonyok_media_public_read" on storage.objects
  for select
  using (bucket_id = 'ogonyok-media');

-- 4. Загрузка файлов пользователем только в собственную директорию:
--    avatars/{user_id}/..., banners/{user_id}/..., vault/{user_id}/..., stories/{user_id}/...
--    Позиция 1 массива foldername: раздел (avatars | banners | vault | stories)
--    Позиция 2 массива foldername: ID аутентифицированного пользователя (auth.uid()::text)
drop policy if exists "ogonyok_media_user_insert" on storage.objects;
create policy "ogonyok_media_user_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ogonyok-media'
    and (storage.foldername(name))[1] in ('avatars', 'banners', 'vault', 'stories')
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- 5. Обновление собственных файлов
drop policy if exists "ogonyok_media_user_update" on storage.objects;
create policy "ogonyok_media_user_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'ogonyok-media'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'ogonyok-media'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- 6. Удаление собственных файлов
drop policy if exists "ogonyok_media_user_delete" on storage.objects;
create policy "ogonyok_media_user_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ogonyok-media'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

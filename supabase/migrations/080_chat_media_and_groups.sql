-- ============================================================================
-- 080_chat_media_and_groups.sql
-- Идемпотентная миграция: бакет chat-media, группы чатов, папки и расширения direct_messages
-- Шаг 08: Файлы не в Base64, группы, отложенные сообщения, папки чатов
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. БАКЕТ ХРАНИЛИЩА chat-media (Supabase Storage)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  52428800, -- 50 МБ (50 * 1024 * 1024)
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg', 'image/heic',
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/aac',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'application/zip', 'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_media_public_read" ON storage.objects;
CREATE POLICY "chat_media_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_authenticated_insert" ON storage.objects;
CREATE POLICY "chat_media_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_authenticated_update" ON storage.objects;
CREATE POLICY "chat_media_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-media')
  WITH CHECK (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_authenticated_delete" ON storage.objects;
CREATE POLICY "chat_media_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media');

-- ----------------------------------------------------------------------------
-- 2. РАСШИРЕНИЕ ТАБЛИЦЫ direct_messages
-- ----------------------------------------------------------------------------
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS media jsonb,
  ADD COLUMN IF NOT EXISTS reply_to jsonb,
  ADD COLUMN IF NOT EXISTS forward_from jsonb,
  ADD COLUMN IF NOT EXISTS poll jsonb,
  ADD COLUMN IF NOT EXISTS link_preview jsonb,
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS read_by uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_for_all boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_direct_messages_scheduled
  ON public.direct_messages(scheduled_for)
  WHERE scheduled_for IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_direct_messages_pinned
  ON public.direct_messages(thread_key, is_pinned)
  WHERE is_pinned = true;

-- ----------------------------------------------------------------------------
-- 3. ТАБЛИЦЫ ГРУПП ЧАТОВ (chat_groups, chat_group_members)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  avatar_color text NOT NULL DEFAULT '#ff7a18',
  avatar_emoji text DEFAULT '🔥',
  avatar_image text,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admins_only boolean NOT NULL DEFAULT false,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_group_members (
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

-- RLS для chat_groups: участники видят группу; владелец и админы могут менять
DROP POLICY IF EXISTS "chat_groups_select" ON public.chat_groups;
CREATE POLICY "chat_groups_select" ON public.chat_groups
  FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.chat_group_members m
      WHERE m.group_id = chat_groups.id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_groups_insert" ON public.chat_groups;
CREATE POLICY "chat_groups_insert" ON public.chat_groups
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "chat_groups_update" ON public.chat_groups;
CREATE POLICY "chat_groups_update" ON public.chat_groups
  FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.chat_group_members m
      WHERE m.group_id = chat_groups.id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "chat_groups_delete" ON public.chat_groups;
CREATE POLICY "chat_groups_delete" ON public.chat_groups
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- RLS для chat_group_members
DROP POLICY IF EXISTS "chat_group_members_select" ON public.chat_group_members;
CREATE POLICY "chat_group_members_select" ON public.chat_group_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.chat_group_members m
      WHERE m.group_id = chat_group_members.group_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_group_members_insert" ON public.chat_group_members;
CREATE POLICY "chat_group_members_insert" ON public.chat_group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Добавить себя или быть админом группы
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.chat_groups g
      WHERE g.id = chat_group_members.group_id AND g.creator_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.chat_group_members m
      WHERE m.group_id = chat_group_members.group_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "chat_group_members_update" ON public.chat_group_members;
CREATE POLICY "chat_group_members_update" ON public.chat_group_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_groups g
      WHERE g.id = chat_group_members.group_id AND g.creator_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.chat_group_members m
      WHERE m.group_id = chat_group_members.group_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "chat_group_members_delete" ON public.chat_group_members;
CREATE POLICY "chat_group_members_delete" ON public.chat_group_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.chat_groups g
      WHERE g.id = chat_group_members.group_id AND g.creator_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.chat_group_members m
      WHERE m.group_id = chat_group_members.group_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  );

-- ----------------------------------------------------------------------------
-- 4. ТАБЛИЦА ПАПОК ЧАТОВ (chat_folders)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  icon text DEFAULT 'folder',
  chat_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_folders_owner" ON public.chat_folders;
CREATE POLICY "chat_folders_owner" ON public.chat_folders
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Realtime публикация для групп и папок
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'chat_groups'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_groups;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'chat_group_members'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_members;
    END IF;
  END IF;
END $$;

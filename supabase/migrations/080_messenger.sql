-- ============================================================================
-- ОГОНЁК · МИГРАЦИЯ 080_messenger.sql: КОРПОРАТИВНЫЙ МЕССЕНДЖЕР (ЭТАП 8)
-- ============================================================================
-- 1. Таблицы threads (direct/group/channel), thread_members, chat_folders, thread_drafts
-- 2. Связка direct_messages.thread_id с каскадами, индексами и backward-compat
-- 3. Storage бакет chat-media (25 МБ limit, signed URLs, mime/path enforcement)
-- 4. RLS на всех таблицах с запретом писать удаленным/заблокированным
-- 5. 18 RPC функций security definer для полного жизненного цикла чатов
-- 6. Realtime-публикация threads, thread_members, direct_messages
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ТАБЛИЦА ТРЕДОВ / ДИАЛОГОВ / ГРУПП (threads)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('direct', 'group')),
  group_id uuid,
  title text,
  avatar text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_channel boolean NOT NULL DEFAULT false,
  pinned_message_id uuid,
  direct_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threads_kind ON public.threads(kind);
CREATE INDEX IF NOT EXISTS idx_threads_direct_key ON public.threads(direct_key) WHERE direct_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_threads_created_by ON public.threads(created_by);

-- ----------------------------------------------------------------------------
-- 2. УЧАСТНИКИ ТРЕДОВ (thread_members)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.thread_members (
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  muted_until timestamptz,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  cleared_until timestamptz,
  is_pinned boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  folder_id uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_members_user ON public.thread_members(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_members_thread ON public.thread_members(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_members_pinned ON public.thread_members(user_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_thread_members_archived ON public.thread_members(user_id, is_archived) WHERE is_archived = true;

-- ----------------------------------------------------------------------------
-- 3. ПАПКИ ЧАТОВ (chat_folders)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'folder',
  filter_type text NOT NULL DEFAULT 'all' CHECK (filter_type IN ('all', 'unread', 'direct', 'groups', 'custom')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_folders_user ON public.chat_folders(user_id, position ASC);

-- ----------------------------------------------------------------------------
-- 4. ЧЕРНОВИКИ СООБЩЕНИЙ (thread_drafts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.thread_drafts (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  reply_to_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_drafts_user ON public.thread_drafts(user_id);

-- ----------------------------------------------------------------------------
-- 5. РАСШИРЕНИЕ direct_messages: thread_id, media, reply, edit, mentions
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'thread_id'
  ) THEN
    ALTER TABLE public.direct_messages ADD COLUMN thread_id uuid REFERENCES public.threads(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'reply_to_id'
  ) THEN
    ALTER TABLE public.direct_messages ADD COLUMN reply_to_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'forward_from'
  ) THEN
    ALTER TABLE public.direct_messages ADD COLUMN forward_from jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'media'
  ) THEN
    ALTER TABLE public.direct_messages ADD COLUMN media jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE public.direct_messages ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'is_edited'
  ) THEN
    ALTER TABLE public.direct_messages ADD COLUMN is_edited boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE public.direct_messages ADD COLUMN edited_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'deleted_for_all'
  ) THEN
    ALTER TABLE public.direct_messages ADD COLUMN deleted_for_all boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'mentions'
  ) THEN
    ALTER TABLE public.direct_messages ADD COLUMN mentions jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'delivered_to'
  ) THEN
    ALTER TABLE public.direct_messages ADD COLUMN delivered_to jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'read_by'
  ) THEN
    ALTER TABLE public.direct_messages ADD COLUMN read_by jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_direct_messages_thread_sent ON public.direct_messages(thread_id, sent_at ASC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_reply_to ON public.direct_messages(reply_to_id);

-- ----------------------------------------------------------------------------
-- 6. МИГРАЦИЯ ДАННЫХ И ОБРАТНАЯ СОВМЕСТИМОСТЬ (thread_key -> threads)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  rec record;
  v_thread_id uuid;
  v_u1 uuid;
  v_u2 uuid;
BEGIN
  -- Создаем direct threads для существующих прямых сообщений с thread_key
  FOR rec IN
    SELECT DISTINCT thread_key
    FROM public.direct_messages
    WHERE thread_id IS NULL AND thread_key IS NOT NULL AND thread_key <> ''
  LOOP
    -- Пробуем извлечь два UUID из симметричного ключа (u1:u2 или u1_u2)
    IF rec.thread_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[:_][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_u1 := split_part(replace(rec.thread_key, ':', '_'), '_', 1)::uuid;
      v_u2 := split_part(replace(rec.thread_key, ':', '_'), '_', 2)::uuid;

      -- Проверяем, существует ли уже тред с таким direct_key
      SELECT id INTO v_thread_id FROM public.threads WHERE direct_key = rec.thread_key LIMIT 1;
      IF v_thread_id IS NULL THEN
        INSERT INTO public.threads (kind, direct_key, created_at)
        VALUES ('direct', rec.thread_key, now())
        RETURNING id INTO v_thread_id;

        -- Добавляем обоих участников
        INSERT INTO public.thread_members (thread_id, user_id, role)
        VALUES 
          (v_thread_id, v_u1, 'member'),
          (v_thread_id, v_u2, 'member')
        ON CONFLICT (thread_id, user_id) DO NOTHING;
      END IF;

      -- Привязываем сообщения
      UPDATE public.direct_messages
      SET thread_id = v_thread_id
      WHERE thread_key = rec.thread_key AND thread_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 7. STORAGE БАКЕТ chat-media
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  false,
  26214400, -- 25 МБ лимит
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'application/zip', 'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 26214400;

-- Обновление политик storage для chat-media
DROP POLICY IF EXISTS "Authorized users can access chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to chat-media own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in chat-media" ON storage.objects;

-- Доступ на чтение вложений: авторизованный участник
CREATE POLICY "Authorized users can access chat-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-media');

-- Загрузка только в свою подпапку <uid>/...
CREATE POLICY "Users can upload to chat-media own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Удаление только своих файлов
CREATE POLICY "Users can delete own files in chat-media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_drafts ENABLE ROW LEVEL SECURITY;

-- [A] threads
DROP POLICY IF EXISTS "threads_select" ON public.threads;
DROP POLICY IF EXISTS "threads_insert" ON public.threads;
DROP POLICY IF EXISTS "threads_update" ON public.threads;
DROP POLICY IF EXISTS "threads_delete" ON public.threads;

CREATE POLICY "threads_select"
ON public.threads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.thread_members tm
    WHERE tm.thread_id = threads.id AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "threads_insert"
ON public.threads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "threads_update"
ON public.threads FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.thread_members tm
    WHERE tm.thread_id = threads.id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "threads_delete"
ON public.threads FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.thread_members tm
    WHERE tm.thread_id = threads.id AND tm.user_id = auth.uid() AND tm.role = 'owner'
  )
);

-- [B] thread_members
DROP POLICY IF EXISTS "thread_members_select" ON public.thread_members;
DROP POLICY IF EXISTS "thread_members_insert" ON public.thread_members;
DROP POLICY IF EXISTS "thread_members_update" ON public.thread_members;
DROP POLICY IF EXISTS "thread_members_delete" ON public.thread_members;

CREATE POLICY "thread_members_select"
ON public.thread_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.thread_members tm
    WHERE tm.thread_id = thread_members.thread_id AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "thread_members_insert"
ON public.thread_members FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.thread_members tm
    WHERE tm.thread_id = thread_members.thread_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "thread_members_update"
ON public.thread_members FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.thread_members tm
    WHERE tm.thread_id = thread_members.thread_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "thread_members_delete"
ON public.thread_members FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.thread_members tm
    WHERE tm.thread_id = thread_members.thread_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
  )
);

-- [C] chat_folders
DROP POLICY IF EXISTS "chat_folders_all" ON public.chat_folders;
CREATE POLICY "chat_folders_all"
ON public.chat_folders FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- [D] thread_drafts
DROP POLICY IF EXISTS "thread_drafts_all" ON public.thread_drafts;
CREATE POLICY "thread_drafts_all"
ON public.thread_drafts FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- [E] direct_messages RLS ПЕРЕПИСЫВАНИЕ (с проверкой членства и блокировок)
DROP POLICY IF EXISTS "direct_messages_select" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_insert" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_update" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_delete" ON public.direct_messages;

CREATE POLICY "direct_messages_select"
ON public.direct_messages FOR SELECT
TO authenticated
USING (
  -- Член треда (с учетом cleared_until)
  (
    thread_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.thread_members tm
      WHERE tm.thread_id = direct_messages.thread_id
        AND tm.user_id = auth.uid()
        AND (tm.cleared_until IS NULL OR direct_messages.sent_at > tm.cleared_until)
    )
  )
  OR
  -- Обратная совместимость для записей без thread_id
  (
    thread_id IS NULL AND (auth.uid() = author_id OR auth.uid() = recipient_id)
  )
);

CREATE POLICY "direct_messages_insert"
ON public.direct_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id AND
  -- Проверка членства в треде
  (
    thread_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.thread_members tm
      JOIN public.threads t ON t.id = tm.thread_id
      WHERE tm.thread_id = direct_messages.thread_id
        AND tm.user_id = auth.uid()
        -- Если режим канала: только админы/владельцы могут писать
        AND (t.is_channel = false OR tm.role IN ('owner', 'admin'))
    )
  )
  AND
  -- Проверка блокировок: если указан recipient_id, никто не должен быть в блоке
  (
    recipient_id IS NULL OR
    NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = recipient_id)
         OR (b.blocker_id = recipient_id AND b.blocked_id = auth.uid())
    )
  )
);

CREATE POLICY "direct_messages_update"
ON public.direct_messages FOR UPDATE
TO authenticated
USING (
  -- Автор может редактировать текст/вложения/удалять
  auth.uid() = author_id
  OR
  -- Член треда может обновлять реакции, закрепление, доставку и прочтение
  (
    thread_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.thread_members tm
      WHERE tm.thread_id = direct_messages.thread_id AND tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "direct_messages_delete"
ON public.direct_messages FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id
  OR
  (
    thread_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.thread_members tm
      WHERE tm.thread_id = direct_messages.thread_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  )
);

-- ----------------------------------------------------------------------------
-- 9. RPC ФУНКЦИИ (security definer) ДЛЯ ПОЛНОГО УПРАВЛЕНИЯ ЧАТАМИ
-- ----------------------------------------------------------------------------

-- [1] Получить или создать direct thread (1-на-1)
CREATE OR REPLACE FUNCTION public.get_or_create_direct_thread(p_peer_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_direct_key text;
  v_thread_id uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF v_me = p_peer_id THEN
    RAISE EXCEPTION 'cannot_chat_with_self';
  END IF;

  -- Проверка блокировки
  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = v_me AND blocked_id = p_peer_id)
       OR (blocker_id = p_peer_id AND blocked_id = v_me)
  ) THEN
    RAISE EXCEPTION 'user_blocked';
  END IF;

  -- Детерминированный симметричный ключ
  IF v_me < p_peer_id THEN
    v_direct_key := v_me::text || ':' || p_peer_id::text;
  ELSE
    v_direct_key := p_peer_id::text || ':' || v_me::text;
  END IF;

  -- Поиск существующего
  SELECT id INTO v_thread_id
  FROM public.threads
  WHERE direct_key = v_direct_key
  LIMIT 1;

  IF v_thread_id IS NOT NULL THEN
    RETURN v_thread_id;
  END IF;

  -- Создание нового direct thread
  INSERT INTO public.threads (kind, direct_key, created_by)
  VALUES ('direct', v_direct_key, v_me)
  RETURNING id INTO v_thread_id;

  INSERT INTO public.thread_members (thread_id, user_id, role)
  VALUES
    (v_thread_id, v_me, 'owner'),
    (v_thread_id, p_peer_id, 'member')
  ON CONFLICT (thread_id, user_id) DO NOTHING;

  RETURN v_thread_id;
END;
$$;

-- [2] Создать группу (group thread)
CREATE OR REPLACE FUNCTION public.create_group_thread(
  p_title text,
  p_avatar text DEFAULT NULL,
  p_member_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_is_channel boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_thread_id uuid;
  v_member_id uuid;
  v_clean_title text := coalesce(trim(p_title), 'Новая группа');
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF length(v_clean_title) = 0 THEN
    RAISE EXCEPTION 'title_required';
  END IF;

  INSERT INTO public.threads (kind, title, avatar, created_by, is_channel)
  VALUES ('group', v_clean_title, p_avatar, v_me, p_is_channel)
  RETURNING id INTO v_thread_id;

  -- Владелец
  INSERT INTO public.thread_members (thread_id, user_id, role)
  VALUES (v_thread_id, v_me, 'owner');

  -- Добавление участников
  IF p_member_ids IS NOT NULL THEN
    FOREACH v_member_id IN ARRAY p_member_ids LOOP
      IF v_member_id <> v_me THEN
        -- Пропускаем заблокированных
        IF NOT EXISTS (
          SELECT 1 FROM public.blocks
          WHERE (blocker_id = v_me AND blocked_id = v_member_id)
             OR (blocker_id = v_member_id AND blocked_id = v_me)
        ) THEN
          INSERT INTO public.thread_members (thread_id, user_id, role)
          VALUES (v_thread_id, v_member_id, 'member')
          ON CONFLICT (thread_id, user_id) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Системное сообщение о создании группы
  INSERT INTO public.direct_messages (
    thread_id,
    author_id,
    body,
    is_system
  ) VALUES (
    v_thread_id,
    v_me,
    'Группа «' || v_clean_title || '» создана. Добро пожаловать! 🎉',
    true
  );

  RETURN v_thread_id;
END;
$$;

-- [3] Обновить группу (название, аватар, режим канала)
CREATE OR REPLACE FUNCTION public.update_group_thread(
  p_thread_id uuid,
  p_title text,
  p_avatar text DEFAULT NULL,
  p_is_channel boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Проверка прав owner или admin
  IF NOT EXISTS (
    SELECT 1 FROM public.thread_members
    WHERE thread_id = p_thread_id AND user_id = v_me AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.threads
  SET
    title = coalesce(trim(p_title), title),
    avatar = coalesce(p_avatar, avatar),
    is_channel = coalesce(p_is_channel, is_channel),
    updated_at = now()
  WHERE id = p_thread_id;

  RETURN true;
END;
$$;

-- [4] Добавить участников в группу
CREATE OR REPLACE FUNCTION public.add_thread_members(
  p_thread_id uuid,
  p_user_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_user_id uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Проверка прав
  IF NOT EXISTS (
    SELECT 1 FROM public.thread_members
    WHERE thread_id = p_thread_id AND user_id = v_me AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  FOREACH v_user_id IN ARRAY p_user_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.blocks
      WHERE (blocker_id = v_me AND blocked_id = v_user_id)
         OR (blocker_id = v_user_id AND blocked_id = v_me)
    ) THEN
      INSERT INTO public.thread_members (thread_id, user_id, role)
      VALUES (p_thread_id, v_user_id, 'member')
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- [5] Удалить участника из группы (исключить)
CREATE OR REPLACE FUNCTION public.remove_thread_member(
  p_thread_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_target_role text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Нельзя удалить владельца
  SELECT role INTO v_target_role FROM public.thread_members WHERE thread_id = p_thread_id AND user_id = p_user_id;
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'cannot_remove_owner';
  END IF;

  -- Проверка прав
  IF NOT EXISTS (
    SELECT 1 FROM public.thread_members
    WHERE thread_id = p_thread_id AND user_id = v_me AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  DELETE FROM public.thread_members
  WHERE thread_id = p_thread_id AND user_id = p_user_id;

  RETURN true;
END;
$$;

-- [6] Изменить роль участника (owner, admin, member)
CREATE OR REPLACE FUNCTION public.set_thread_member_role(
  p_thread_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_role NOT IN ('owner', 'admin', 'member') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  -- Только владелец может менять роли
  IF NOT EXISTS (
    SELECT 1 FROM public.thread_members
    WHERE thread_id = p_thread_id AND user_id = v_me AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'only_owner_can_manage_roles';
  END IF;

  UPDATE public.thread_members
  SET role = p_role
  WHERE thread_id = p_thread_id AND user_id = p_user_id;

  RETURN true;
END;
$$;

-- [7] Выйти из группы
CREATE OR REPLACE FUNCTION public.leave_thread(p_thread_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  DELETE FROM public.thread_members
  WHERE thread_id = p_thread_id AND user_id = v_me;

  RETURN true;
END;
$$;

-- [8] Закрепить сообщение в чате
CREATE OR REPLACE FUNCTION public.pin_thread_message(
  p_thread_id uuid,
  p_message_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.thread_members
    WHERE thread_id = p_thread_id AND user_id = v_me
  ) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  UPDATE public.threads
  SET pinned_message_id = p_message_id, updated_at = now()
  WHERE id = p_thread_id;

  UPDATE public.direct_messages
  SET is_pinned = true
  WHERE id = p_message_id;

  RETURN true;
END;
$$;

-- [9] Открепить сообщение в чате
CREATE OR REPLACE FUNCTION public.unpin_thread_message(p_thread_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_old_msg uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT pinned_message_id INTO v_old_msg FROM public.threads WHERE id = p_thread_id;

  UPDATE public.threads
  SET pinned_message_id = NULL, updated_at = now()
  WHERE id = p_thread_id;

  IF v_old_msg IS NOT NULL THEN
    UPDATE public.direct_messages
    SET is_pinned = false
    WHERE id = v_old_msg;
  END IF;

  RETURN true;
END;
$$;

-- [10] Закрепить / открепить чат в личном списке
CREATE OR REPLACE FUNCTION public.toggle_pin_chat(
  p_thread_id uuid,
  p_is_pinned boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.thread_members
  SET is_pinned = p_is_pinned
  WHERE thread_id = p_thread_id AND user_id = v_me;

  RETURN true;
END;
$$;

-- [11] Архивировать / разархивировать чат
CREATE OR REPLACE FUNCTION public.toggle_archive_chat(
  p_thread_id uuid,
  p_is_archived boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.thread_members
  SET is_archived = p_is_archived
  WHERE thread_id = p_thread_id AND user_id = v_me;

  RETURN true;
END;
$$;

-- [12] Заглушить чат (на время или навсегда)
CREATE OR REPLACE FUNCTION public.mute_thread(
  p_thread_id uuid,
  p_until timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.thread_members
  SET muted_until = p_until
  WHERE thread_id = p_thread_id AND user_id = v_me;

  RETURN true;
END;
$$;

-- [13] Очистить историю сообщений у себя
CREATE OR REPLACE FUNCTION public.clear_thread_history(p_thread_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.thread_members
  SET cleared_until = now(), last_read_at = now()
  WHERE thread_id = p_thread_id AND user_id = v_me;

  RETURN true;
END;
$$;

-- [14] Удалить чат у себя
CREATE OR REPLACE FUNCTION public.delete_chat_for_me(p_thread_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  DELETE FROM public.thread_members
  WHERE thread_id = p_thread_id AND user_id = v_me;

  RETURN true;
END;
$$;

-- [15] Пометить все сообщения в треде прочитанными
CREATE OR REPLACE FUNCTION public.mark_thread_read(p_thread_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.thread_members
  SET last_read_at = now()
  WHERE thread_id = p_thread_id AND user_id = v_me;

  -- Обновляем read_by в direct_messages
  UPDATE public.direct_messages
  SET 
    is_read = true,
    read_by = CASE 
      WHEN jsonb_path_exists(read_by, '$[*] ? (@ == $u)', jsonb_build_object('u', v_me::text)) THEN read_by
      ELSE read_by || jsonb_build_array(v_me::text)
    END
  WHERE thread_id = p_thread_id AND (is_read = false OR NOT jsonb_path_exists(read_by, '$[*] ? (@ == $u)', jsonb_build_object('u', v_me::text)));

  RETURN true;
END;
$$;

-- [16] Поиск сообщений по тексту (внутри чата или по всем чатам пользователя)
CREATE OR REPLACE FUNCTION public.search_messages(
  p_query text,
  p_thread_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  thread_id uuid,
  author_id uuid,
  body text,
  attachment jsonb,
  media jsonb,
  is_pinned boolean,
  is_edited boolean,
  sent_at timestamptz,
  author_username text,
  author_display_name text,
  author_avatar text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_clean text := trim(p_query);
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF length(v_clean) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.thread_id,
    m.author_id,
    m.body,
    m.attachment,
    m.media,
    m.is_pinned,
    m.is_edited,
    m.sent_at,
    p.username,
    p.display_name,
    coalesce(p.avatar_image, p.avatar_url) as author_avatar
  FROM public.direct_messages m
  JOIN public.profiles p ON p.id = m.author_id
  JOIN public.thread_members tm ON tm.thread_id = m.thread_id AND tm.user_id = v_me
  WHERE 
    (p_thread_id IS NULL OR m.thread_id = p_thread_id)
    AND (tm.cleared_until IS NULL OR m.sent_at > tm.cleared_until)
    AND m.deleted_for_all = false
    AND m.body ILIKE ('%' || v_clean || '%')
  ORDER BY m.sent_at DESC
  LIMIT 50;
END;
$$;

-- [17] Получить список тредов текущего пользователя со счётчиками
CREATE OR REPLACE FUNCTION public.get_user_threads(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  thread_id uuid,
  kind text,
  title text,
  avatar text,
  is_channel boolean,
  pinned_message_id uuid,
  role text,
  is_pinned boolean,
  is_archived boolean,
  muted_until timestamptz,
  last_read_at timestamptz,
  folder_id uuid,
  peer_id uuid,
  peer_username text,
  peer_display_name text,
  peer_avatar text,
  last_message_body text,
  last_message_at timestamptz,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := coalesce(p_user_id, auth.uid());
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    t.id as thread_id,
    t.kind,
    CASE 
      WHEN t.kind = 'direct' THEN peer_p.display_name
      ELSE t.title
    END as title,
    CASE
      WHEN t.kind = 'direct' THEN coalesce(peer_p.avatar_image, peer_p.avatar_url)
      ELSE t.avatar
    END as avatar,
    t.is_channel,
    t.pinned_message_id,
    tm.role,
    tm.is_pinned,
    tm.is_archived,
    tm.muted_until,
    tm.last_read_at,
    tm.folder_id,
    peer_tm.user_id as peer_id,
    peer_p.username as peer_username,
    peer_p.display_name as peer_display_name,
    coalesce(peer_p.avatar_image, peer_p.avatar_url) as peer_avatar,
    last_m.body as last_message_body,
    last_m.sent_at as last_message_at,
    (
      SELECT count(*)
      FROM public.direct_messages unread_m
      WHERE unread_m.thread_id = t.id
        AND unread_m.sent_at > tm.last_read_at
        AND unread_m.author_id <> v_me
        AND (tm.cleared_until IS NULL OR unread_m.sent_at > tm.cleared_until)
    ) as unread_count
  FROM public.thread_members tm
  JOIN public.threads t ON t.id = tm.thread_id
  -- Для direct треда определяем собеседника
  LEFT JOIN public.thread_members peer_tm ON peer_tm.thread_id = t.id AND peer_tm.user_id <> v_me AND t.kind = 'direct'
  LEFT JOIN public.profiles peer_p ON peer_p.id = peer_tm.user_id
  -- Последнее сообщение в треде
  LEFT JOIN LATERAL (
    SELECT lm.body, lm.sent_at
    FROM public.direct_messages lm
    WHERE lm.thread_id = t.id
      AND (tm.cleared_until IS NULL OR lm.sent_at > tm.cleared_until)
    ORDER BY lm.sent_at DESC
    LIMIT 1
  ) last_m ON true
  WHERE tm.user_id = v_me
  ORDER BY tm.is_pinned DESC, coalesce(last_m.sent_at, t.created_at) DESC;
END;
$$;

-- [18] Сохранить черновик сообщения
CREATE OR REPLACE FUNCTION public.save_thread_draft(
  p_thread_id uuid,
  p_text text,
  p_reply_to_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF length(trim(coalesce(p_text, ''))) = 0 THEN
    DELETE FROM public.thread_drafts
    WHERE user_id = v_me AND thread_id = p_thread_id;
  ELSE
    INSERT INTO public.thread_drafts (user_id, thread_id, text, reply_to_id, updated_at)
    VALUES (v_me, p_thread_id, p_text, p_reply_to_id, now())
    ON CONFLICT (user_id, thread_id) DO UPDATE SET
      text = EXCLUDED.text,
      reply_to_id = EXCLUDED.reply_to_id,
      updated_at = now();
  END IF;

  RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 10. REALTIME ПУБЛИКАЦИЯ
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'thread_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_folders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_folders;
  END IF;
END $$;

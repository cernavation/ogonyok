-- ============================================================================
-- МИГРАЦИЯ 136: ПОЛНОЦЕННЫЕ ГРУППЫ В SUPABASE + REALTIME + RLS + ПРИВАТНОСТЬ
-- Идемпотентная миграция (можно запускать повторно в SQL Editor).
-- ============================================================================

-- 1. Гарантия нужных колонок в days и direct_messages
ALTER TABLE public.days
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.chat_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_group_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS ai_score numeric,
  ADD COLUMN IF NOT EXISTS ai_verdict text;

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS read_by uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_for_all boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_direct_messages_thread_key_sent
  ON public.direct_messages(thread_key, sent_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_group
  ON public.chat_group_members(user_id, group_id);

-- 2. Вспомогательные функции (SECURITY DEFINER — без рекурсии RLS)
CREATE OR REPLACE FUNCTION public.extract_group_uuid_from_thread_key(tk text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
BEGIN
  IF tk IS NULL THEN
    RETURN NULL;
  END IF;
  cleaned := regexp_replace(trim(tk), '^group:(group-)?', '', 'i');
  cleaned := regexp_replace(cleaned, '^group-', '', 'i');
  IF cleaned ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN cleaned::uuid;
  END IF;
  RETURN NULL;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(u uuid, gid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u IS NOT NULL
    AND gid IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.chat_groups g WHERE g.id = gid AND g.creator_id = u)
      OR EXISTS (SELECT 1 FROM public.chat_group_members m WHERE m.group_id = gid AND m.user_id = u)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin_or_owner(u uuid, gid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u IS NOT NULL
    AND gid IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.chat_groups g WHERE g.id = gid AND g.creator_id = u)
      OR EXISTS (
        SELECT 1 FROM public.chat_group_members m
        WHERE m.group_id = gid AND m.user_id = u AND m.role IN ('owner', 'admin')
      )
    );
$$;

-- 3. Чистые нерекурсивные политики RLS для chat_groups и chat_group_members
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_groups_select" ON public.chat_groups;
CREATE POLICY "chat_groups_select" ON public.chat_groups
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR public.is_group_member(auth.uid(), id));

DROP POLICY IF EXISTS "chat_groups_insert" ON public.chat_groups;
CREATE POLICY "chat_groups_insert" ON public.chat_groups
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "chat_groups_update" ON public.chat_groups;
CREATE POLICY "chat_groups_update" ON public.chat_groups
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() OR public.is_group_admin_or_owner(auth.uid(), id))
  WITH CHECK (creator_id = auth.uid() OR public.is_group_admin_or_owner(auth.uid(), id));

DROP POLICY IF EXISTS "chat_groups_delete" ON public.chat_groups;
CREATE POLICY "chat_groups_delete" ON public.chat_groups
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "chat_group_members_select" ON public.chat_group_members;
CREATE POLICY "chat_group_members_select" ON public.chat_group_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_group_member(auth.uid(), group_id));

DROP POLICY IF EXISTS "chat_group_members_insert" ON public.chat_group_members;
CREATE POLICY "chat_group_members_insert" ON public.chat_group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.chat_groups g
        WHERE g.id = chat_group_members.group_id AND g.creator_id = auth.uid()
      )
    )
    OR (
      public.is_group_admin_or_owner(auth.uid(), group_id)
      AND public.are_mutual_friends(auth.uid(), user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = chat_group_members.user_id
          AND (
            COALESCE(p.allow_group_invites_from, 'friends') = 'nobody'
            OR COALESCE(p.privacy->>'allowGroupInvitesFrom', 'friends') = 'nobody'
          )
      )
    )
  );

DROP POLICY IF EXISTS "chat_group_members_update" ON public.chat_group_members;
CREATE POLICY "chat_group_members_update" ON public.chat_group_members
  FOR UPDATE TO authenticated
  USING (public.is_group_admin_or_owner(auth.uid(), group_id))
  WITH CHECK (public.is_group_admin_or_owner(auth.uid(), group_id));

DROP POLICY IF EXISTS "chat_group_members_delete" ON public.chat_group_members;
CREATE POLICY "chat_group_members_delete" ON public.chat_group_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_admin_or_owner(auth.uid(), group_id));

-- 4. Обновление RLS для direct_messages (чтобы все участники группы читали/писали/отмечали прочтение)
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "direct_messages_select" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_select_participants" ON public.direct_messages;
CREATE POLICY "direct_messages_select" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() = author_id
    OR auth.uid() = recipient_id
    OR (
      thread_key LIKE 'group%'
      AND public.extract_group_uuid_from_thread_key(thread_key) IS NOT NULL
      AND public.is_group_member(auth.uid(), public.extract_group_uuid_from_thread_key(thread_key))
    )
  );

DROP POLICY IF EXISTS "direct_messages_insert" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_insert_sender" ON public.direct_messages;
CREATE POLICY "direct_messages_insert" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND length(coalesce(body, '')) <= 4096
    AND (
      (
        recipient_id IS NOT NULL
        AND (
          recipient_id = auth.uid()
          OR (
            NOT EXISTS (
              SELECT 1 FROM public.blocks b
              WHERE (b.blocker_id = auth.uid() AND b.blocked_id = direct_messages.recipient_id)
                 OR (b.blocker_id = direct_messages.recipient_id AND b.blocked_id = auth.uid())
            )
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = direct_messages.recipient_id
                AND (
                  coalesce(p.allow_messages_from, p.who_can_message, p.privacy->>'allowMessagesFrom', p.privacy->>'whoCanMessage', 'everyone') = 'everyone'
                  OR (
                    coalesce(p.allow_messages_from, p.who_can_message, p.privacy->>'allowMessagesFrom', p.privacy->>'whoCanMessage', 'everyone') = 'friends'
                    AND public.are_mutual_friends(auth.uid(), direct_messages.recipient_id)
                  )
                )
            )
          )
        )
      )
      OR (
        recipient_id IS NULL
        AND thread_key LIKE 'group%'
        AND public.extract_group_uuid_from_thread_key(thread_key) IS NOT NULL
        AND public.is_group_member(auth.uid(), public.extract_group_uuid_from_thread_key(thread_key))
        AND (
          COALESCE(is_system, false) = true
          OR NOT EXISTS (
            SELECT 1 FROM public.chat_groups g
            WHERE g.id = public.extract_group_uuid_from_thread_key(thread_key)
              AND g.admins_only = true
          )
          OR public.is_group_admin_or_owner(auth.uid(), public.extract_group_uuid_from_thread_key(thread_key))
        )
      )
    )
  );

DROP POLICY IF EXISTS "direct_messages_update" ON public.direct_messages;
CREATE POLICY "direct_messages_update" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = author_id
    OR auth.uid() = recipient_id
    OR (
      thread_key LIKE 'group%'
      AND public.extract_group_uuid_from_thread_key(thread_key) IS NOT NULL
      AND public.is_group_member(auth.uid(), public.extract_group_uuid_from_thread_key(thread_key))
    )
  )
  WITH CHECK (
    auth.uid() = author_id
    OR auth.uid() = recipient_id
    OR (
      thread_key LIKE 'group%'
      AND public.extract_group_uuid_from_thread_key(thread_key) IS NOT NULL
      AND public.is_group_member(auth.uid(), public.extract_group_uuid_from_thread_key(thread_key))
    )
  );

DROP POLICY IF EXISTS "direct_messages_delete" ON public.direct_messages;
CREATE POLICY "direct_messages_delete" ON public.direct_messages
  FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id
    OR auth.uid() = recipient_id
    OR (
      thread_key LIKE 'group%'
      AND public.extract_group_uuid_from_thread_key(thread_key) IS NOT NULL
      AND public.is_group_admin_or_owner(auth.uid(), public.extract_group_uuid_from_thread_key(thread_key))
    )
  );

-- 5. RPC отметки групповых сообщений прочитанными (read_by uuid[]) + обновление get_unread_counts
CREATE OR REPLACE FUNCTION public.mark_group_messages_read(p_group_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_updated integer := 0;
BEGIN
  IF v_uid IS NULL OR p_group_id IS NULL THEN
    RETURN 0;
  END IF;

  IF NOT public.is_group_member(v_uid, p_group_id) THEN
    RETURN 0;
  END IF;

  UPDATE public.direct_messages
  SET read_by = array_append(COALESCE(read_by, '{}'::uuid[]), v_uid)
  WHERE thread_key IN (
    'group:group-' || p_group_id::text,
    'group:' || p_group_id::text,
    'group-' || p_group_id::text
  )
    AND author_id <> v_uid
    AND (read_by IS NULL OR NOT (read_by @> ARRAY[v_uid]));

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_group_messages_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extract_group_uuid_from_thread_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin_or_owner(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_unread_counts(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dm_unread integer := 0;
  v_group_unread integer := 0;
  v_priday_unread integer := 0;
  v_notif_unread integer := 0;
  v_friend_req integer := 0;
  v_missed_calls integer := 0;
  v_by_thread jsonb := '{}'::jsonb;
  v_by_sender jsonb := '{}'::jsonb;
  v_thread_record record;
  v_sender_record record;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'chat_unread', 0,
      'notifications_unread', 0,
      'total_unread', 0,
      'friend_requests', 0,
      'missed_calls', 0,
      'by_thread', '{}'::jsonb,
      'by_sender', '{}'::jsonb
    );
  END IF;

  -- 1a. Непрочитанные личные сообщения
  SELECT COUNT(*) INTO v_dm_unread
  FROM public.direct_messages
  WHERE recipient_id = p_user_id AND is_read = false;

  FOR v_thread_record IN
    SELECT thread_key, COUNT(*) AS cnt
    FROM public.direct_messages
    WHERE recipient_id = p_user_id AND is_read = false
    GROUP BY thread_key
  LOOP
    v_by_thread := v_by_thread || jsonb_build_object(v_thread_record.thread_key, v_thread_record.cnt);
  END LOOP;

  FOR v_sender_record IN
    SELECT author_id, COUNT(*) AS cnt
    FROM public.direct_messages
    WHERE recipient_id = p_user_id AND is_read = false
    GROUP BY author_id
  LOOP
    v_by_sender := v_by_sender || jsonb_build_object(v_sender_record.author_id::text, v_sender_record.cnt);
  END LOOP;

  -- 1b. Непрочитанные групповые сообщения (по массиву read_by)
  FOR v_thread_record IN
    SELECT
      'group-' || public.extract_group_uuid_from_thread_key(dm.thread_key)::text AS norm_key,
      COUNT(*) AS cnt
    FROM public.direct_messages dm
    WHERE dm.recipient_id IS NULL
      AND dm.thread_key LIKE 'group%'
      AND dm.author_id <> p_user_id
      AND public.extract_group_uuid_from_thread_key(dm.thread_key) IS NOT NULL
      AND public.is_group_member(p_user_id, public.extract_group_uuid_from_thread_key(dm.thread_key))
      AND (dm.read_by IS NULL OR NOT (dm.read_by @> ARRAY[p_user_id]))
    GROUP BY 1
  LOOP
    v_group_unread := v_group_unread + v_thread_record.cnt;
    v_by_thread := v_by_thread || jsonb_build_object(v_thread_record.norm_key, v_thread_record.cnt);
  END LOOP;

  -- 1c. Непрочитанные сообщения от Priday
  SELECT COUNT(*) INTO v_priday_unread
  FROM public.priday_messages
  WHERE user_id = p_user_id AND is_read = false;
  IF COALESCE(v_priday_unread, 0) > 0 THEN
    v_by_thread := v_by_thread || jsonb_build_object('priday-official', v_priday_unread);
  END IF;

  -- 2. Непрочитанные уведомления
  SELECT COUNT(*) INTO v_notif_unread
  FROM public.notifications
  WHERE user_id = p_user_id AND is_read = false;

  -- 3. Входящие заявки в друзья
  SELECT COUNT(*) INTO v_friend_req
  FROM public.friendships
  WHERE (friend_id = p_user_id OR addressee_id = p_user_id)
    AND status IN ('pending', 'incoming-request');

  -- 4. Пропущенные звонки
  SELECT COUNT(*) INTO v_missed_calls
  FROM public.call_sessions
  WHERE receiver_id = p_user_id AND status = 'missed';

  RETURN jsonb_build_object(
    'chat_unread', COALESCE(v_dm_unread, 0) + COALESCE(v_group_unread, 0) + COALESCE(v_priday_unread, 0),
    'notifications_unread', COALESCE(v_notif_unread, 0),
    'total_unread', COALESCE(v_dm_unread, 0) + COALESCE(v_group_unread, 0) + COALESCE(v_priday_unread, 0) + COALESCE(v_notif_unread, 0),
    'friend_requests', COALESCE(v_friend_req, 0),
    'missed_calls', COALESCE(v_missed_calls, 0),
    'by_thread', v_by_thread,
    'by_sender', v_by_sender
  );
END;
$$;

-- 6. Гарантируем REPLICA IDENTITY FULL и Realtime для групповых таблиц и сообщений
ALTER TABLE public.chat_groups REPLICA IDENTITY FULL;
ALTER TABLE public.chat_group_members REPLICA IDENTITY FULL;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.days REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_groups'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_groups;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_group_members'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_members;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'direct_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'days'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.days;
    END IF;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

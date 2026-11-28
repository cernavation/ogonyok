-- ============================================================================
-- МИГРАЦИЯ 137 (ЭТАП 3): ОФИЦИАЛЬНЫЕ РАССЫЛКИ ОСНОВАТЕЛЯ (@cernavation)
-- Таблица public.official_broadcasts + колонка profiles.last_read_official_at
-- + строгий RLS + Realtime + обновлённый подсчёт непрочитанных get_unread_counts.
-- Полностью идемпотентна.
-- ============================================================================

-- 1. Таблица официальных рассылок от имени Winlog
CREATE TABLE IF NOT EXISTS public.official_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_official_broadcasts_created_at
  ON public.official_broadcasts(created_at ASC);

-- 2. Отметка времени последнего прочтения официального канала Winlog в profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_read_official_at timestamptz;

-- 3. Строгие политики RLS для official_broadcasts
ALTER TABLE public.official_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "official_broadcasts_select_authenticated" ON public.official_broadcasts;
CREATE POLICY "official_broadcasts_select_authenticated" ON public.official_broadcasts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "official_broadcasts_insert_founder" ON public.official_broadcasts;
CREATE POLICY "official_broadcasts_insert_founder" ON public.official_broadcasts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(trim(coalesce(p.username, ''))) = 'cernavation'
    )
  );

DROP POLICY IF EXISTS "official_broadcasts_delete_founder" ON public.official_broadcasts;
CREATE POLICY "official_broadcasts_delete_founder" ON public.official_broadcasts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(trim(coalesce(p.username, ''))) = 'cernavation'
    )
  );

-- 4. Включаем Realtime и REPLICA IDENTITY FULL для official_broadcasts
ALTER TABLE public.official_broadcasts REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'official_broadcasts'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.official_broadcasts;
    END IF;
  END IF;
END $$;

-- 5. Обновляем RPC get_unread_counts: учитываем непрочитанные official_broadcasts
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
  v_broadcast_unread integer := 0;
  v_notif_unread integer := 0;
  v_friend_req integer := 0;
  v_missed_calls integer := 0;
  v_last_read_official timestamptz;
  v_profile_created_at timestamptz;
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

  -- 1c. Непрочитанные личные системные сообщения от Priday/Winlog
  SELECT COUNT(*) INTO v_priday_unread
  FROM public.priday_messages
  WHERE user_id = p_user_id AND is_read = false;

  -- 1d. Непрочитанные официальные рассылки из public.official_broadcasts
  SELECT last_read_official_at, created_at
  INTO v_last_read_official, v_profile_created_at
  FROM public.profiles
  WHERE id = p_user_id;

  SELECT COUNT(*) INTO v_broadcast_unread
  FROM public.official_broadcasts ob
  WHERE ob.author_id <> p_user_id
    AND (
      (v_last_read_official IS NOT NULL AND ob.created_at > v_last_read_official)
      OR (
        v_last_read_official IS NULL
        AND (v_profile_created_at IS NULL OR ob.created_at >= v_profile_created_at)
      )
    );

  v_priday_unread := COALESCE(v_priday_unread, 0) + COALESCE(v_broadcast_unread, 0);
  IF v_priday_unread > 0 THEN
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
    'chat_unread', COALESCE(v_dm_unread, 0) + COALESCE(v_group_unread, 0) + v_priday_unread,
    'notifications_unread', COALESCE(v_notif_unread, 0),
    'total_unread', COALESCE(v_dm_unread, 0) + COALESCE(v_group_unread, 0) + v_priday_unread + COALESCE(v_notif_unread, 0),
    'friend_requests', COALESCE(v_friend_req, 0),
    'missed_calls', COALESCE(v_missed_calls, 0),
    'by_thread', v_by_thread,
    'by_sender', v_by_sender
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

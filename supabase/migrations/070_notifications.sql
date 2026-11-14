-- ============================================================================
-- 070_notifications.sql
-- ЭТАП 7: Уведомления, колокольчик, счетчики непрочитанных и пропущенные звонки
-- ============================================================================

-- 1. ТАБЛИЦА УВЕДОМЛЕНИЙ (notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'friend_request', 'friend_accepted', 'missed_call', 'milestone', 'message', 'system'
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы для быстрой выборки непрочитанных и пагинации
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON public.notifications(user_id, created_at DESC);

-- Включение RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Удаление старых политик при повторном накате
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;

-- Политики RLS
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "notifications_delete_own"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "notifications_insert_authenticated"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Включение таблицы notifications в Supabase Realtime (если публикация существует)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'direct_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
    END IF;
  END IF;
END $$;

-- 2. RPC: get_unread_counts
-- Возвращает сводку непрочитанных сообщений и уведомлений пользователя
CREATE OR REPLACE FUNCTION public.get_unread_counts(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_unread integer := 0;
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

  -- 1. Подсчет непрочитанных личных сообщений
  SELECT COUNT(*)
  INTO v_chat_unread
  FROM public.direct_messages
  WHERE recipient_id = p_user_id AND is_read = false;

  -- Непрочитанные по тредам
  FOR v_thread_record IN
    SELECT thread_key, COUNT(*) as cnt
    FROM public.direct_messages
    WHERE recipient_id = p_user_id AND is_read = false
    GROUP BY thread_key
  LOOP
    v_by_thread := v_by_thread || jsonb_build_object(v_thread_record.thread_key, v_thread_record.cnt);
  END LOOP;

  -- Непрочитанные по отправителям
  FOR v_sender_record IN
    SELECT author_id, COUNT(*) as cnt
    FROM public.direct_messages
    WHERE recipient_id = p_user_id AND is_read = false
    GROUP BY author_id
  LOOP
    v_by_sender := v_by_sender || jsonb_build_object(v_sender_record.author_id::text, v_sender_record.cnt);
  END LOOP;

  -- 2. Подсчет непрочитанных уведомлений
  SELECT COUNT(*)
  INTO v_notif_unread
  FROM public.notifications
  WHERE user_id = p_user_id AND is_read = false;

  -- 3. Подсчет входящих заявок в друзья
  SELECT COUNT(*)
  INTO v_friend_req
  FROM public.friendships
  WHERE (friend_id = p_user_id OR addressee_id = p_user_id)
    AND status IN ('pending', 'incoming-request');

  -- 4. Подсчет пропущенных звонков
  SELECT COUNT(*)
  INTO v_missed_calls
  FROM public.call_sessions
  WHERE receiver_id = p_user_id AND status = 'missed';

  RETURN jsonb_build_object(
    'chat_unread', COALESCE(v_chat_unread, 0),
    'notifications_unread', COALESCE(v_notif_unread, 0),
    'total_unread', COALESCE(v_chat_unread, 0) + COALESCE(v_notif_unread, 0),
    'friend_requests', COALESCE(v_friend_req, 0),
    'missed_calls', COALESCE(v_missed_calls, 0),
    'by_thread', v_by_thread,
    'by_sender', v_by_sender
  );
END;
$$;

-- 3. RPC: mark_notifications_as_read
CREATE OR REPLACE FUNCTION public.mark_notifications_as_read(
  p_user_id uuid DEFAULT auth.uid(),
  p_notification_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_notification_ids IS NULL OR array_length(p_notification_ids, 1) = 0 THEN
    -- Пометить все уведомления пользователя как прочитанные
    UPDATE public.notifications
    SET is_read = true, updated_at = now()
    WHERE user_id = p_user_id AND is_read = false;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
  ELSE
    -- Пометить выбранные уведомления
    UPDATE public.notifications
    SET is_read = true, updated_at = now()
    WHERE user_id = p_user_id AND id = ANY(p_notification_ids) AND is_read = false;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('success', true, 'updated', v_updated);
END;
$$;

-- 4. RPC: record_missed_call
-- Фиксирует пропущенный звонок в call_sessions, создает системное сообщение в чате и уведомление
CREATE OR REPLACE FUNCTION public.record_missed_call(
  p_caller_id uuid,
  p_receiver_id uuid,
  p_call_id uuid DEFAULT NULL,
  p_time_str text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_key text;
  v_caller_name text;
  v_caller_avatar text;
  v_time text;
  v_msg_id uuid;
  v_notif_id uuid;
BEGIN
  IF p_caller_id IS NULL OR p_receiver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid parameters');
  END IF;

  -- Детерминированный ключ треда
  IF p_caller_id::text < p_receiver_id::text THEN
    v_thread_key := p_caller_id::text || '_' || p_receiver_id::text;
  ELSE
    v_thread_key := p_receiver_id::text || '_' || p_caller_id::text;
  END IF;

  -- Данные звонящего
  SELECT display_name, COALESCE(avatar_image, avatar_url)
  INTO v_caller_name, v_caller_avatar
  FROM public.profiles
  WHERE id = p_caller_id;

  v_time := COALESCE(p_time_str, to_char(now() AT TIME ZONE 'Europe/Moscow', 'HH24:MI'));

  -- Обновление/создание сессии звонка
  IF p_call_id IS NOT NULL THEN
    UPDATE public.call_sessions
    SET status = 'missed', updated_at = now()
    WHERE id = p_call_id;
  ELSE
    INSERT INTO public.call_sessions (caller_id, receiver_id, status, created_at)
    VALUES (p_caller_id, p_receiver_id, 'missed', now());
  END IF;

  -- Системная строка в чате: «Пропущенный звонок, 14:32»
  INSERT INTO public.direct_messages (
    thread_key,
    author_id,
    recipient_id,
    body,
    is_system,
    is_read,
    sent_at
  ) VALUES (
    v_thread_key,
    p_caller_id,
    p_receiver_id,
    'Пропущенный звонок, ' || v_time,
    true,
    false,
    now()
  ) RETURNING id INTO v_msg_id;

  -- Создание уведомления в колокольчик
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    is_read,
    created_at
  ) VALUES (
    p_receiver_id,
    'missed_call',
    'Пропущенный звонок',
    COALESCE(v_caller_name, 'Друг') || ' звонил в ' || v_time,
    jsonb_build_object(
      'fromUserId', p_caller_id,
      'fromName', COALESCE(v_caller_name, 'Друг'),
      'fromAvatar', v_caller_avatar,
      'threadKey', v_thread_key,
      'time', v_time
    ),
    false,
    now()
  ) RETURNING id INTO v_notif_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_msg_id,
    'notification_id', v_notif_id,
    'thread_key', v_thread_key
  );
END;
$$;

-- ==============================================================================
-- МИГРАЦИЯ 070: ЦЕНТР УВЕДОМЛЕНИЙ, СЧЁТЧИКИ UNREAD, ТРИГГЕРЫ И АГРЕГАЦИЯ (ЭТАП 7)
-- ==============================================================================

-- 1. Структура таблицы notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type text,
  entity_id text,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Добавляем колонки, если таблица была создана ранее с меньшим набором полей
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'entity_type') THEN
    ALTER TABLE public.notifications ADD COLUMN entity_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'entity_id') THEN
    ALTER TABLE public.notifications ADD COLUMN entity_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'payload') THEN
    ALTER TABLE public.notifications ADD COLUMN payload jsonb NOT NULL DEFAULT '{}'::jsonb;
    -- Мигрируем данные из data, если колонка data существовала
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'data') THEN
      UPDATE public.notifications SET payload = coalesce(data, '{}'::jsonb);
    END IF;
  END IF;
END $$;

-- Валидация допустимых типов уведомлений через CHECK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_notifications_type'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT chk_notifications_type
      CHECK (type IN (
        'friend_request',
        'friend_accepted',
        'new_message',
        'missed_call',
        'comment',
        'reaction',
        'group_invite',
        'milestone',
        'system'
      ));
  END IF;
END $$;

-- 2. Индексы для сверхбыстрой выборки и подсчёта
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON public.notifications (user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications (user_id) 
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_aggregation
  ON public.notifications (user_id, actor_id, type, created_at DESC)
  WHERE read_at IS NULL;

-- 3. Безопасность RLS: клиент может только читать, помечать прочитанным и удалять свои уведомления.
-- Создавать (INSERT) могут ТОЛЬКО триггеры и security definer функции!
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Запрет прямого клиентского INSERT (нет политики для authenticated INSERT)
DROP POLICY IF EXISTS "notifications_insert_deny" ON public.notifications;

-- Полный доступ для служебной роли
DROP POLICY IF EXISTS "notifications_service_all" ON public.notifications;
CREATE POLICY "notifications_service_all"
  ON public.notifications FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Публикация в Supabase Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 5. ТРИГГЕРЫ АВТОМАТИЧЕСКИХ УВЕДОМЛЕНИЙ
-- ------------------------------------------------------------------------------

-- А. Триггер на новое сообщение (direct_messages) с агрегацией и защитой от спама
CREATE OR REPLACE FUNCTION public.trg_on_direct_message_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sender_name text;
  v_sender_avatar text;
  v_existing_id uuid;
  v_is_muted boolean := false;
BEGIN
  -- Игнорируем сообщения без получателя, самому себе или системные эхо-сообщения
  IF NEW.recipient_id IS NULL OR NEW.recipient_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  -- Проверяем, не заглушил ли получатель этот чат или пользователя
  SELECT coalesce(
    (settings->'muted_threads' ? NEW.thread_key) OR
    (settings->'muted_users' ? NEW.author_id::text),
    false
  ) INTO v_is_muted
  FROM public.profiles
  WHERE id = NEW.recipient_id;

  IF v_is_muted THEN
    RETURN NEW;
  END IF;

  -- Получаем имя и аватар отправителя
  SELECT coalesce(display_name, username, 'Соратник'), coalesce(avatar_image, avatar_url)
  INTO v_sender_name, v_sender_avatar
  FROM public.profiles
  WHERE id = NEW.author_id;

  -- Агрегация: если за последние 5 минут от этого автора уже есть непрочитанное уведомление new_message,
  -- обновляем его вместо создания новой строки (максимум 3 тоста, нет спама)
  SELECT id INTO v_existing_id
  FROM public.notifications
  WHERE user_id = NEW.recipient_id
    AND actor_id = NEW.author_id
    AND type = 'new_message'
    AND read_at IS NULL
    AND created_at >= clock_timestamp() - interval '5 minutes'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.notifications
    SET
      body = CASE 
        WHEN NEW.attachment IS NOT NULL AND NEW.attachment->>'type' = 'voice' THEN '🎤 Голосовое сообщение'
        WHEN NEW.attachment IS NOT NULL AND NEW.attachment->>'type' = 'image' THEN '📷 Фотография'
        ELSE coalesce(nullif(NEW.body, ''), 'Новое сообщение')
      END,
      payload = jsonb_set(
        jsonb_set(
          payload,
          '{count}',
          to_jsonb(coalesce((payload->>'count')::int, 1) + 1)
        ),
        '{last_message_id}',
        to_jsonb(NEW.id::text)
      ),
      created_at = clock_timestamp()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.notifications (
      user_id,
      actor_id,
      type,
      entity_type,
      entity_id,
      title,
      body,
      payload
    ) VALUES (
      NEW.recipient_id,
      NEW.author_id,
      'new_message',
      'direct_message',
      NEW.id::text,
      v_sender_name,
      CASE 
        WHEN NEW.attachment IS NOT NULL AND NEW.attachment->>'type' = 'voice' THEN '🎤 Голосовое сообщение'
        WHEN NEW.attachment IS NOT NULL AND NEW.attachment->>'type' = 'image' THEN '📷 Фотография'
        ELSE coalesce(nullif(NEW.body, ''), 'Новое сообщение')
      END,
      jsonb_build_object(
        'message_id', NEW.id,
        'thread_key', NEW.thread_key,
        'sender_name', v_sender_name,
        'sender_avatar', v_sender_avatar,
        'count', 1,
        'attachment_type', NEW.attachment->>'type'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_direct_messages_notification ON public.direct_messages;
CREATE TRIGGER trg_direct_messages_notification
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.trg_on_direct_message_created();

-- Б. Триггер на заявки и принятие в соратники (friendships)
CREATE OR REPLACE FUNCTION public.trg_on_friendship_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_name text;
  v_actor_avatar text;
  v_target_user uuid;
  v_notif_type text;
  v_title text;
  v_body text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    v_target_user := NEW.addressee_id;
    v_notif_type := 'friend_request';
    
    SELECT coalesce(display_name, username, 'Соратник'), coalesce(avatar_image, avatar_url)
    INTO v_actor_name, v_actor_avatar
    FROM public.profiles WHERE id = NEW.requester_id;

    v_title := v_actor_name;
    v_body := 'Хочет стать твоим соратником';

    INSERT INTO public.notifications (
      user_id, actor_id, type, entity_type, entity_id, title, body, payload
    ) VALUES (
      v_target_user,
      NEW.requester_id,
      v_notif_type,
      'friendship',
      NEW.id::text,
      v_title,
      v_body,
      jsonb_build_object('friendship_id', NEW.id, 'actor_name', v_actor_name, 'actor_avatar', v_actor_avatar)
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    v_target_user := NEW.requester_id;
    v_notif_type := 'friend_accepted';

    SELECT coalesce(display_name, username, 'Соратник'), coalesce(avatar_image, avatar_url)
    INTO v_actor_name, v_actor_avatar
    FROM public.profiles WHERE id = NEW.addressee_id;

    v_title := v_actor_name;
    v_body := 'Принял(а) твою заявку в соратники!';

    INSERT INTO public.notifications (
      user_id, actor_id, type, entity_type, entity_id, title, body, payload
    ) VALUES (
      v_target_user,
      NEW.addressee_id,
      v_notif_type,
      'friendship',
      NEW.id::text,
      v_title,
      v_body,
      jsonb_build_object('friendship_id', NEW.id, 'actor_name', v_actor_name, 'actor_avatar', v_actor_avatar)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friendships_notification ON public.friendships;
CREATE TRIGGER trg_friendships_notification
AFTER INSERT OR UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.trg_on_friendship_notification();

-- В. Триггер на пропущенный звонок (call_sessions)
CREATE OR REPLACE FUNCTION public.trg_on_call_session_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_name text;
  v_caller_avatar text;
  v_thread_key text;
  v_call_time text;
BEGIN
  -- Реагируем только на переход в статус 'missed'
  IF NEW.status = 'missed' AND (TG_OP = 'INSERT' OR OLD.status <> 'missed') THEN
    SELECT coalesce(display_name, username, 'Соратник'), coalesce(avatar_image, avatar_url)
    INTO v_caller_name, v_caller_avatar
    FROM public.profiles WHERE id = NEW.caller_id;

    v_call_time := to_char(coalesce(NEW.started_at, NEW.created_at, clock_timestamp()) AT TIME ZONE 'UTC', 'HH24:MI');

    -- 1. Инсерт уведомления missed_call
    INSERT INTO public.notifications (
      user_id,
      actor_id,
      type,
      entity_type,
      entity_id,
      title,
      body,
      payload
    ) VALUES (
      NEW.receiver_id,
      NEW.caller_id,
      'missed_call',
      'call_session',
      NEW.id::text,
      v_caller_name,
      '📞 Пропущенный звонок',
      jsonb_build_object(
        'caller_id', NEW.caller_id,
        'session_id', NEW.id,
        'caller_name', v_caller_name,
        'caller_avatar', v_caller_avatar,
        'time', v_call_time
      )
    );

    -- 2. Инсерт системного сообщения в чат-тред («Пропущенный звонок, 14:32»)
    IF NEW.caller_id < NEW.receiver_id THEN
      v_thread_key := NEW.caller_id::text || ':' || NEW.receiver_id::text;
    ELSE
      v_thread_key := NEW.receiver_id::text || ':' || NEW.caller_id::text;
    END IF;

    INSERT INTO public.direct_messages (
      thread_key,
      author_id,
      recipient_id,
      body,
      is_system,
      is_read,
      attachment,
      sent_at
    ) VALUES (
      v_thread_key,
      NEW.caller_id,
      NEW.receiver_id,
      '📞 Пропущенный звонок, ' || v_call_time,
      true,
      false,
      jsonb_build_object('type', 'missed_call', 'session_id', NEW.id, 'time', v_call_time),
      clock_timestamp()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_call_sessions_notification ON public.call_sessions;
CREATE TRIGGER trg_call_sessions_notification
AFTER INSERT OR UPDATE ON public.call_sessions
FOR EACH ROW EXECUTE FUNCTION public.trg_on_call_session_notification();

-- Г. Триггер на комментарии (comments)
CREATE OR REPLACE FUNCTION public.trg_on_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_day_owner uuid;
  v_commenter_name text;
  v_commenter_avatar text;
BEGIN
  -- Ищем владельца дня по target_key или day_client_id
  SELECT user_id INTO v_day_owner
  FROM public.days
  WHERE id::text = NEW.target_key 
     OR client_id = NEW.target_key 
     OR client_id = NEW.day_client_id
  LIMIT 1;

  IF v_day_owner IS NOT NULL AND v_day_owner <> NEW.user_id THEN
    SELECT coalesce(display_name, username, 'Соратник'), coalesce(avatar_image, avatar_url)
    INTO v_commenter_name, v_commenter_avatar
    FROM public.profiles WHERE id = NEW.user_id;

    INSERT INTO public.notifications (
      user_id,
      actor_id,
      type,
      entity_type,
      entity_id,
      title,
      body,
      payload
    ) VALUES (
      v_day_owner,
      NEW.user_id,
      'comment',
      'day',
      NEW.target_key,
      v_commenter_name,
      '💬 ' || substring(NEW.text from 1 for 80),
      jsonb_build_object(
        'comment_id', NEW.id,
        'target_key', NEW.target_key,
        'commenter_name', v_commenter_name,
        'commenter_avatar', v_commenter_avatar
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_notification ON public.comments;
CREATE TRIGGER trg_comments_notification
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.trg_on_comment_notification();

-- Д. Триггер на реакции (reactions) с агрегацией не чаще 1 раза в минуту на пост
CREATE OR REPLACE FUNCTION public.trg_on_reaction_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_owner uuid;
  v_reactor_name text;
  v_reactor_avatar text;
  v_recent_id uuid;
BEGIN
  -- Ищем автора дня
  SELECT user_id INTO v_target_owner
  FROM public.days
  WHERE id::text = NEW.target_key 
     OR client_id = NEW.target_key 
     OR client_id = NEW.day_client_id
  LIMIT 1;

  IF v_target_owner IS NOT NULL AND v_target_owner <> NEW.user_id THEN
    -- Проверка агрегации: не чаще раза в минуту на одну и ту же запись
    SELECT id INTO v_recent_id
    FROM public.notifications
    WHERE user_id = v_target_owner
      AND entity_id = NEW.target_key
      AND type = 'reaction'
      AND created_at >= clock_timestamp() - interval '1 minute'
    LIMIT 1;

    IF v_recent_id IS NULL THEN
      SELECT coalesce(display_name, username, 'Соратник'), coalesce(avatar_image, avatar_url)
      INTO v_reactor_name, v_reactor_avatar
      FROM public.profiles WHERE id = NEW.user_id;

      INSERT INTO public.notifications (
        user_id,
        actor_id,
        type,
        entity_type,
        entity_id,
        title,
        body,
        payload
      ) VALUES (
        v_target_owner,
        NEW.user_id,
        'reaction',
        'day',
        NEW.target_key,
        v_reactor_name,
        '🔥 Отреагировал на твою победу!',
        jsonb_build_object(
          'target_key', NEW.target_key,
          'emoji_id', NEW.emoji_id,
          'reactor_name', v_reactor_name,
          'reactor_avatar', v_reactor_avatar
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reactions_notification ON public.reactions;
CREATE TRIGGER trg_reactions_notification
AFTER INSERT ON public.reactions
FOR EACH ROW EXECUTE FUNCTION public.trg_on_reaction_notification();

-- ------------------------------------------------------------------------------
-- 6. RPC ФУНКЦИИ СЧЁТЧИКОВ И УПРАВЛЕНИЯ
-- ------------------------------------------------------------------------------

-- А. get_unread_counts: единый источник истины для счётчиков при старте и перезагрузке
CREATE OR REPLACE FUNCTION public.get_unread_counts(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_chats_total integer := 0;
  v_chats_by_thread jsonb := '{}'::jsonb;
  v_notifications_unread integer := 0;
  v_comrades_requests integer := 0;
  v_missed_calls integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'chats', 0,
      'chats_by_thread', '{}'::jsonb,
      'notifications', 0,
      'comrades', 0,
      'missed_calls', 0,
      'total', 0
    );
  END IF;

  -- 1. Непрочитанные сообщения по тредам
  SELECT
    coalesce(sum(cnt), 0),
    coalesce(jsonb_object_agg(thread_key, cnt), '{}'::jsonb)
  INTO v_chats_total, v_chats_by_thread
  FROM (
    SELECT thread_key, count(*)::integer AS cnt
    FROM public.direct_messages
    WHERE recipient_id = v_uid
      AND is_read = false
    GROUP BY thread_key
  ) t;

  -- 2. Непрочитанные уведомления
  SELECT count(*)::integer INTO v_notifications_unread
  FROM public.notifications
  WHERE user_id = v_uid
    AND read_at IS NULL;

  -- 3. Входящие ожидающие заявки в соратники
  SELECT count(*)::integer INTO v_comrades_requests
  FROM public.friendships
  WHERE (addressee_id = v_uid OR (friend_id = v_uid AND requester_id <> v_uid))
    AND status = 'pending';

  -- 4. Непрочитанные пропущенные звонки
  SELECT count(*)::integer INTO v_missed_calls
  FROM public.notifications
  WHERE user_id = v_uid
    AND type = 'missed_call'
    AND read_at IS NULL;

  RETURN jsonb_build_object(
    'chats', v_chats_total,
    'chats_by_thread', v_chats_by_thread,
    'notifications', v_notifications_unread,
    'comrades', v_comrades_requests,
    'missed_calls', v_missed_calls,
    'total', v_chats_total + v_notifications_unread + v_comrades_requests
  );
END;
$$;

-- Б. mark_notification_read: пометить конкретное уведомление прочитанным
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.notifications
  SET read_at = clock_timestamp()
  WHERE id = p_notification_id
    AND user_id = v_uid
    AND read_at IS NULL;

  RETURN FOUND;
END;
$$;

-- В. mark_all_notifications_read: пометить все уведомления прочитанными
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_updated integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.notifications
  SET read_at = clock_timestamp()
  WHERE user_id = v_uid
    AND read_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- Г. mark_chat_read: пометить чат прочитанным в direct_messages и notifications
CREATE OR REPLACE FUNCTION public.mark_chat_read(
  p_friend_id uuid,
  p_thread_key text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_updated integer := 0;
  v_key text := p_thread_key;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  IF v_key IS NULL AND p_friend_id IS NOT NULL THEN
    IF v_uid < p_friend_id THEN
      v_key := v_uid::text || ':' || p_friend_id::text;
    ELSE
      v_key := p_friend_id::text || ':' || v_uid::text;
    END IF;
  END IF;

  -- Помечаем сообщения прочитанными
  UPDATE public.direct_messages
  SET is_read = true
  WHERE recipient_id = v_uid
    AND is_read = false
    AND (
      (v_key IS NOT NULL AND thread_key = v_key)
      OR (p_friend_id IS NOT NULL AND author_id = p_friend_id)
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Помечаем связанные уведомления new_message и missed_call как прочитанные
  UPDATE public.notifications
  SET read_at = clock_timestamp()
  WHERE user_id = v_uid
    AND read_at IS NULL
    AND (
      (p_friend_id IS NOT NULL AND actor_id = p_friend_id)
      OR (v_key IS NOT NULL AND payload->>'thread_key' = v_key)
    );

  RETURN v_updated;
END;
$$;

-- Права доступа на функции
GRANT EXECUTE ON FUNCTION public.get_unread_counts(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_chat_read(uuid, text) TO authenticated, service_role;

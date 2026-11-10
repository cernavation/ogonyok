-- ============================================================================
-- МИГРАЦИЯ 100: СИСТЕМА АУДИО И ВИДЕО ЗВОНКОВ WEBRTC (ЭТАП 10)
-- 
-- 1. Расширение таблицы call_sessions (статусы, видео, длительность, инициатор отбоя, причина)
-- 2. RLS-политики с защитой от блокировок (блокированные пользователи не могут звонить)
-- 3. Безопасные RPC-функции:
--    - initiate_call (проверка блокировок, тарифные лимиты на видеозвонки, защита от glare, занятость)
--    - respond_to_call (принятие, отклонение, занято, завершение)
--    - end_call_session (корректная фиксация длительности и инициатора)
--    - get_call_history (история звонков пользователя с профилями собеседников)
-- 4. Триггер фиксации истории звонков в чате (direct_messages)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. СТРУКТУРА ТАБЛИЦЫ call_sessions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ringing',
  is_video boolean NOT NULL DEFAULT false,
  duration_seconds integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  ended_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  end_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Добавляем колонки при необходимости (идемпотентность)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='call_sessions' AND column_name='is_video') THEN
    ALTER TABLE public.call_sessions ADD COLUMN is_video boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='call_sessions' AND column_name='duration_seconds') THEN
    ALTER TABLE public.call_sessions ADD COLUMN duration_seconds integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='call_sessions' AND column_name='started_at') THEN
    ALTER TABLE public.call_sessions ADD COLUMN started_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='call_sessions' AND column_name='ended_at') THEN
    ALTER TABLE public.call_sessions ADD COLUMN ended_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='call_sessions' AND column_name='ended_by') THEN
    ALTER TABLE public.call_sessions ADD COLUMN ended_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='call_sessions' AND column_name='end_reason') THEN
    ALTER TABLE public.call_sessions ADD COLUMN end_reason text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='call_sessions' AND column_name='updated_at') THEN
    ALTER TABLE public.call_sessions ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Обновляем CHECK constraint для статусов звонка
ALTER TABLE public.call_sessions DROP CONSTRAINT IF EXISTS call_sessions_status_check;
ALTER TABLE public.call_sessions DROP CONSTRAINT IF EXISTS chk_call_sessions_status;
ALTER TABLE public.call_sessions ADD CONSTRAINT chk_call_sessions_status
  CHECK (status IN ('ringing', 'connected', 'accepted', 'ended', 'rejected', 'declined', 'missed', 'busy'));

-- Индексы для быстрого поиска и фильтрации сессий
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller_status ON public.call_sessions(caller_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver_status ON public.call_sessions(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created_at ON public.call_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_participants ON public.call_sessions(caller_id, receiver_id, created_at DESC);

-- Realtime публикация
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'call_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. RLS ПОЛИТИКИ ДЛЯ call_sessions
-- ----------------------------------------------------------------------------
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "call_sessions_select" ON public.call_sessions;
DROP POLICY IF EXISTS "call_sessions_insert" ON public.call_sessions;
DROP POLICY IF EXISTS "call_sessions_update" ON public.call_sessions;
DROP POLICY IF EXISTS "call_sessions_delete" ON public.call_sessions;

-- Пользователь видит только сессии, где он звонящий или принимающий
CREATE POLICY "call_sessions_select"
ON public.call_sessions FOR SELECT
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Звонящий может создать сессию, только если собеседник не заблокирован
CREATE POLICY "call_sessions_insert"
ON public.call_sessions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = caller_id
  AND caller_id <> receiver_id
  AND NOT EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = auth.uid() AND b.blocked_id = receiver_id)
       OR (b.blocker_id = receiver_id AND b.blocked_id = auth.uid())
  )
);

-- Участники звонка могут обновлять статус (принять, отклонить, завершить)
CREATE POLICY "call_sessions_update"
ON public.call_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id)
WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Удаление сессии из личной истории (для обоих участников)
CREATE POLICY "call_sessions_delete"
ON public.call_sessions FOR DELETE
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- ----------------------------------------------------------------------------
-- 3. RPC-ФУНКЦИИ УПРАВЛЕНИЯ ЗВОНКАМИ
-- ----------------------------------------------------------------------------

-- А. initiate_call: Инициализация звонка с проверками
CREATE OR REPLACE FUNCTION public.initiate_call(
  p_receiver_id uuid,
  p_is_video boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_tier text;
  v_is_blocked boolean;
  v_glare_session record;
  v_busy_count int;
  v_session record;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'Требуется авторизация');
  END IF;

  IF v_caller_id = p_receiver_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_call', 'message', 'Нельзя звонить самому себе');
  END IF;

  -- 1. Проверка взаимных блокировок
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = v_caller_id AND blocked_id = p_receiver_id)
       OR (blocker_id = p_receiver_id AND blocked_id = v_caller_id)
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN jsonb_build_object('ok', false, 'error', 'blocked', 'message', 'Пользователь заблокирован');
  END IF;

  -- 2. Проверка тарифа для видеозвонков (только Pro и Ultra)
  IF coalesce(p_is_video, false) THEN
    v_caller_tier := public.effective_tier(v_caller_id);
    IF v_caller_tier = 'free' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'upgrade_required',
        'message', 'Видеозвонки доступны на тарифе Премиум'
      );
    END IF;
  END IF;

  -- 3. Детерминированное разрешение одновременного встречного звонка (Glare)
  -- Если адресат прямо сейчас звонит нам (сессия ringing < 45 сек)
  SELECT * INTO v_glare_session
  FROM public.call_sessions
  WHERE caller_id = p_receiver_id
    AND receiver_id = v_caller_id
    AND status = 'ringing'
    AND created_at > now() - interval '45 seconds'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_glare_session.id IS NOT NULL THEN
    -- Детерминированный выбор: меньший UUID побеждает как caller
    IF v_caller_id < p_receiver_id THEN
      -- Наш исходящий звонок становится главным, обновляем существующую встречную сессию
      UPDATE public.call_sessions
      SET status = 'connected', started_at = now(), updated_at = now()
      WHERE id = v_glare_session.id;

      RETURN jsonb_build_object(
        'ok', true,
        'glare', true,
        'session', jsonb_build_object(
          'id', v_glare_session.id,
          'caller_id', v_glare_session.caller_id,
          'receiver_id', v_glare_session.receiver_id,
          'is_video', v_glare_session.is_video OR coalesce(p_is_video, false),
          'status', 'connected'
        )
      );
    ELSE
      -- Встречный звонок собеседника побеждает, подключаемся к нему
      UPDATE public.call_sessions
      SET status = 'connected', started_at = now(), updated_at = now()
      WHERE id = v_glare_session.id;

      RETURN jsonb_build_object(
        'ok', true,
        'glare', true,
        'session', jsonb_build_object(
          'id', v_glare_session.id,
          'caller_id', v_glare_session.caller_id,
          'receiver_id', v_glare_session.receiver_id,
          'is_video', v_glare_session.is_video,
          'status', 'connected'
        )
      );
    END IF;
  END IF;

  -- 4. Проверка занятости собеседника (Busy)
  -- Если у адресата уже идет активный разговор (connected/accepted) или другой входящий звонок
  SELECT count(*) INTO v_busy_count
  FROM public.call_sessions
  WHERE (caller_id = p_receiver_id OR receiver_id = p_receiver_id)
    AND status IN ('connected', 'accepted', 'ringing')
    AND updated_at > now() - interval '45 seconds';

  IF v_busy_count > 0 THEN
    -- Фиксируем попытку звонка со статусом busy
    INSERT INTO public.call_sessions (
      caller_id,
      receiver_id,
      status,
      is_video,
      ended_by,
      end_reason,
      ended_at
    ) VALUES (
      v_caller_id,
      p_receiver_id,
      'busy',
      coalesce(p_is_video, false),
      p_receiver_id,
      'busy',
      now()
    )
    RETURNING * INTO v_session;

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'busy',
      'message', 'Собеседник занят другим звонком',
      'session_id', v_session.id
    );
  END IF;

  -- 5. Стандартное создание сессии звонка в статусе 'ringing'
  INSERT INTO public.call_sessions (
    caller_id,
    receiver_id,
    status,
    is_video,
    created_at,
    updated_at
  ) VALUES (
    v_caller_id,
    p_receiver_id,
    'ringing',
    coalesce(p_is_video, false),
    now(),
    now()
  )
  RETURNING * INTO v_session;

  RETURN jsonb_build_object(
    'ok', true,
    'session', jsonb_build_object(
      'id', v_session.id,
      'caller_id', v_session.caller_id,
      'receiver_id', v_session.receiver_id,
      'is_video', v_session.is_video,
      'status', v_session.status,
      'created_at', v_session.created_at
    )
  );
END;
$$;

-- Б. respond_to_call: Ответ на звонок (принять, отклонить, занято, отбой)
CREATE OR REPLACE FUNCTION public.respond_to_call(
  p_session_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_session record;
  v_next_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'Требуется авторизация');
  END IF;

  SELECT * INTO v_session
  FROM public.call_sessions
  WHERE id = p_session_id;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Сессия звонка не найдена');
  END IF;

  IF v_session.caller_id <> v_user_id AND v_session.receiver_id <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden', 'message', 'Нет доступа к данной сессии');
  END IF;

  CASE p_action
    WHEN 'accept' THEN
      v_next_status := 'connected';
      UPDATE public.call_sessions
      SET status = v_next_status,
          started_at = coalesce(started_at, now()),
          updated_at = now()
      WHERE id = p_session_id;

    WHEN 'reject' THEN
      v_next_status := 'rejected';
      UPDATE public.call_sessions
      SET status = v_next_status,
          ended_at = now(),
          ended_by = v_user_id,
          end_reason = 'rejected',
          updated_at = now()
      WHERE id = p_session_id;

    WHEN 'busy' THEN
      v_next_status := 'busy';
      UPDATE public.call_sessions
      SET status = v_next_status,
          ended_at = now(),
          ended_by = v_user_id,
          end_reason = 'busy',
          updated_at = now()
      WHERE id = p_session_id;

    WHEN 'end' THEN
      v_next_status := 'ended';
      UPDATE public.call_sessions
      SET status = v_next_status,
          ended_at = now(),
          ended_by = v_user_id,
          end_reason = 'normal',
          updated_at = now()
      WHERE id = p_session_id;

    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_action', 'message', 'Недопустимое действие');
  END CASE;

  RETURN jsonb_build_object('ok', true, 'status', v_next_status, 'session_id', p_session_id);
END;
$$;

-- В. end_call_session: Завершение звонка с длительностью
CREATE OR REPLACE FUNCTION public.end_call_session(
  p_session_id uuid,
  p_duration_seconds integer DEFAULT 0,
  p_reason text DEFAULT 'normal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_session record;
  v_final_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'Требуется авторизация');
  END IF;

  SELECT * INTO v_session
  FROM public.call_sessions
  WHERE id = p_session_id;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Сессия не найдена');
  END IF;

  IF v_session.caller_id <> v_user_id AND v_session.receiver_id <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden', 'message', 'Нет доступа');
  END IF;

  -- Если звонок еще был в стадии ringing
  IF v_session.status = 'ringing' THEN
    IF v_user_id = v_session.caller_id THEN
      v_final_status := 'missed';
    ELSE
      v_final_status := 'rejected';
    END IF;
  ELSE
    v_final_status := 'ended';
  END IF;

  UPDATE public.call_sessions
  SET status = v_final_status,
      duration_seconds = greatest(coalesce(p_duration_seconds, 0), v_session.duration_seconds),
      ended_at = now(),
      ended_by = v_user_id,
      end_reason = coalesce(p_reason, 'normal'),
      updated_at = now()
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', v_final_status,
    'duration_seconds', greatest(coalesce(p_duration_seconds, 0), v_session.duration_seconds)
  );
END;
$$;

-- Г. get_call_history: Получение истории звонков с профилями собеседников
CREATE OR REPLACE FUNCTION public.get_call_history(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'calls', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(item), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      cs.id,
      cs.status,
      cs.is_video,
      cs.duration_seconds,
      cs.created_at,
      cs.started_at,
      cs.ended_at,
      cs.ended_by,
      cs.end_reason,
      cs.caller_id,
      cs.receiver_id,
      (cs.caller_id = v_user_id) AS is_outgoing,
      CASE
        WHEN cs.caller_id = v_user_id THEN cs.receiver_id
        ELSE cs.caller_id
      END AS peer_id,
      p.username AS peer_username,
      coalesce(p.display_name, p.username, 'Соратник') AS peer_name,
      coalesce(p.avatar_image, p.avatar_url) AS peer_avatar
    FROM public.call_sessions cs
    JOIN public.profiles p ON p.id = (
      CASE WHEN cs.caller_id = v_user_id THEN cs.receiver_id ELSE cs.caller_id END
    )
    WHERE cs.caller_id = v_user_id OR cs.receiver_id = v_user_id
    ORDER BY cs.created_at DESC
    LIMIT greatest(least(p_limit, 100), 1)
    OFFSET greatest(p_offset, 0)
  ) item;

  RETURN jsonb_build_object('ok', true, 'calls', v_result);
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКИХ СИСТЕМНЫХ СООБЩЕНИЙ В ЧАТ
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_on_call_session_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_thread_key text;
  v_dur_m int;
  v_dur_s int;
  v_dur_text text;
  v_msg_body text;
  v_time_str text;
  v_icon text;
BEGIN
  -- Реагируем только на завершение вызова
  IF NEW.status IN ('ended', 'rejected', 'declined', 'busy') 
     AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('ended', 'rejected', 'declined', 'busy')) THEN

    -- Формируем thread_key
    IF NEW.caller_id < NEW.receiver_id THEN
      v_thread_key := NEW.caller_id::text || ':' || NEW.receiver_id::text;
    ELSE
      v_thread_key := NEW.receiver_id::text || ':' || NEW.caller_id::text;
    END IF;

    v_icon := CASE WHEN NEW.is_video THEN '📹 ' ELSE '📞 ' END;
    v_time_str := to_char(coalesce(NEW.ended_at, now()) AT TIME ZONE 'UTC', 'HH24:MI');

    IF NEW.status = 'ended' AND coalesce(NEW.duration_seconds, 0) > 0 THEN
      v_dur_m := NEW.duration_seconds / 60;
      v_dur_s := NEW.duration_seconds % 60;
      v_dur_text := v_dur_m::text || ':' || lpad(v_dur_s::text, 2, '0');
      v_msg_body := v_icon || (CASE WHEN NEW.is_video THEN 'Видеозвонок ' ELSE 'Звонок ' END) || v_dur_text;
    ELSIF NEW.status = 'rejected' OR NEW.status = 'declined' THEN
      v_msg_body := v_icon || 'Звонок отклонён, ' || v_time_str;
    ELSIF NEW.status = 'busy' THEN
      v_msg_body := v_icon || 'Собеседник занят, ' || v_time_str;
    ELSE
      v_msg_body := v_icon || 'Звонок отменён, ' || v_time_str;
    END IF;

    -- Вставляем системное сообщение в direct_messages
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
      v_msg_body,
      true,
      false,
      jsonb_build_object(
        'type', 'call_session',
        'session_id', NEW.id,
        'status', NEW.status,
        'is_video', NEW.is_video,
        'duration_seconds', NEW.duration_seconds,
        'time', v_time_str
      ),
      clock_timestamp()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_call_sessions_chat_history ON public.call_sessions;
CREATE TRIGGER trg_call_sessions_chat_history
AFTER INSERT OR UPDATE ON public.call_sessions
FOR EACH ROW EXECUTE FUNCTION public.trg_on_call_session_chat_message();

-- ----------------------------------------------------------------------------
-- ПРАВА ДОСТУПА НА ВЫЗОВ RPC
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.initiate_call TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_call TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_call_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_history TO authenticated;

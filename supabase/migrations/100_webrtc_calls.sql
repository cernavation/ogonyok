-- ============================================================================
-- Миграция 100_webrtc_calls.sql: Надежность WebRTC звонков, статусы, TURN и история
-- Шаг 10: TURN, ICE restart, таймаут 45 с, статусы ringing/connected/ended/rejected/missed/busy,
--         блокировка пользователя (не дозванивается), системные строки в чате.
-- Идемпотентно. Применять только к Staging.
-- ============================================================================

-- 1. Расширение таблицы call_sessions статусами и полями качества соединения
DO $$
BEGIN
  -- Добавляем колонку is_video если отсутствует
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'call_sessions' AND column_name = 'is_video'
  ) THEN
    ALTER TABLE public.call_sessions ADD COLUMN is_video boolean NOT NULL DEFAULT false;
  END IF;

  -- Добавляем колонку started_at если отсутствует
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'call_sessions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.call_sessions ADD COLUMN started_at timestamptz;
  END IF;

  -- Добавляем колонку ended_at если отсутствует
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'call_sessions' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE public.call_sessions ADD COLUMN ended_at timestamptz;
  END IF;

  -- Добавляем колонку reconnect_count если отсутствует
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'call_sessions' AND column_name = 'reconnect_count'
  ) THEN
    ALTER TABLE public.call_sessions ADD COLUMN reconnect_count integer NOT NULL DEFAULT 0;
  END IF;

  -- Добавляем колонку ice_transport если отсутствует
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'call_sessions' AND column_name = 'ice_transport'
  ) THEN
    ALTER TABLE public.call_sessions ADD COLUMN ice_transport text DEFAULT 'all';
  END IF;
END $$;

-- 2. Обновление CHECK-констрейнта статуса звонка
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.call_sessions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.call_sessions DROP CONSTRAINT ' || quote_ident(v_constraint_name);
  END IF;

  ALTER TABLE public.call_sessions ADD CONSTRAINT call_sessions_status_check
    CHECK (status IN ('ringing', 'connected', 'accepted', 'ended', 'rejected', 'declined', 'missed', 'busy'));
END $$;

-- 3. Индексы для быстрого поиска активных звонков
CREATE INDEX IF NOT EXISTS idx_call_sessions_pair_status
  ON public.call_sessions(caller_id, receiver_id, status);

CREATE INDEX IF NOT EXISTS idx_call_sessions_created_desc
  ON public.call_sessions(created_at DESC);

-- 4. Публикация в Supabase Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'call_sessions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
    END IF;
  END IF;
END $$;

-- 5. RPC: Проверка возможности звонка с учетом блокировок (блок не дозванивается)
CREATE OR REPLACE FUNCTION public.can_initiate_call(
  p_caller_id uuid,
  p_receiver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_blocked boolean := false;
  v_is_busy boolean := false;
BEGIN
  -- Проверка взаимных блокировок
  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = p_receiver_id AND blocked_id = p_caller_id)
       OR (blocker_id = p_caller_id AND blocked_id = p_receiver_id)
  ) THEN
    v_is_blocked := true;
  END IF;

  IF v_is_blocked THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'message', 'Пользователь ограничил входящие вызовы'
    );
  END IF;

  -- Проверка занятости собеседника (уже активный звонок в статусе connected или ringing за последние 60 сек)
  IF EXISTS (
    SELECT 1 FROM public.call_sessions
    WHERE (caller_id = p_receiver_id OR receiver_id = p_receiver_id)
      AND status IN ('connected', 'ringing')
      AND updated_at > now() - interval '60 seconds'
  ) THEN
    v_is_busy := true;
  END IF;

  IF v_is_busy THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'busy',
      'message', 'Линия занята'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'ok',
    'message', null
  );
END;
$$;

-- 6. RPC: Фиксация завершения/таймаута звонка с созданием системного сообщения в чате
CREATE OR REPLACE FUNCTION public.record_call_result(
  p_session_id uuid,
  p_final_status text,
  p_duration_seconds integer DEFAULT 0,
  p_is_video boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session record;
  v_thread_key text;
  v_system_text text;
  v_call_label text;
  v_dur_min integer;
  v_dur_sec integer;
  v_dur_str text;
BEGIN
  -- Валидация статуса
  IF p_final_status NOT IN ('ended', 'rejected', 'missed', 'busy') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid status');
  END IF;

  SELECT * INTO v_session
  FROM public.call_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Session not found');
  END IF;

  -- Обновляем сессию звонка
  UPDATE public.call_sessions
  SET status = p_final_status,
      duration_seconds = COALESCE(p_duration_seconds, 0),
      ended_at = now(),
      updated_at = now()
  WHERE id = p_session_id;

  -- Формируем читаемый текст системного сообщения
  v_call_label := CASE WHEN COALESCE(v_session.is_video, p_is_video) THEN 'Видеозвонок' ELSE 'Аудиозвонок' END;

  IF p_final_status = 'ended' AND COALESCE(p_duration_seconds, 0) > 0 THEN
    v_dur_min := p_duration_seconds / 60;
    v_dur_sec := p_duration_seconds % 60;
    v_dur_str := LPAD(v_dur_min::text, 2, '0') || ':' || LPAD(v_dur_sec::text, 2, '0');
    v_system_text := '📞 ' || v_call_label || ' · ' || v_dur_str;
  ELSIF p_final_status = 'missed' THEN
    v_system_text := '❌ Пропущенный ' || lower(v_call_label);
  ELSIF p_final_status = 'rejected' THEN
    v_system_text := '🚫 Отклонённый вызов';
  ELSIF p_final_status = 'busy' THEN
    v_system_text := '⏳ Вызов не удался (занято)';
  ELSE
    v_system_text := '📞 ' || v_call_label || ' завершён';
  END IF;

  -- Детерминированный ключ треда для чата
  IF v_session.caller_id < v_session.receiver_id THEN
    v_thread_key := v_session.caller_id::text || '_' || v_session.receiver_id::text;
  ELSE
    v_thread_key := v_session.receiver_id::text || '_' || v_session.caller_id::text;
  END IF;

  -- Добавляем системную строку в direct_messages если таблица существует
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'direct_messages') THEN
    INSERT INTO public.direct_messages (
      sender_id,
      recipient_id,
      thread_key,
      content,
      is_system,
      call_meta,
      created_at
    )
    VALUES (
      v_session.caller_id,
      v_session.receiver_id,
      v_thread_key,
      v_system_text,
      true,
      jsonb_build_object(
        'call_id', v_session.id,
        'status', p_final_status,
        'duration_seconds', p_duration_seconds,
        'is_video', COALESCE(v_session.is_video, p_is_video)
      ),
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'session_id', v_session.id,
    'status', p_final_status,
    'system_text', v_system_text
  );
END;
$$;

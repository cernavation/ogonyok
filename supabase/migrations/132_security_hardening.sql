-- ============================================================================
-- 132_security_hardening.sql
-- ЭТАП 18: Укрепление безопасности (Security Hardening)
-- Защита от подделки авторства в RPC, взлома закрытых групп, обхода блокировок,
-- переполнения буфера сообщений и эскалации привилегий.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ЗАЩИТА RPC save_day_bundle ОТ ПОДДЕЛКИ USER_ID (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_day_bundle(
  p_day JSONB,
  p_prides JSONB DEFAULT '[]'::JSONB,
  p_gratitudes JSONB DEFAULT '[]'::JSONB,
  p_streak INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_client_id TEXT;
  v_day_number INT;
  v_now TIMESTAMPTZ := NOW();
  v_pride_count INT := 0;
  v_gratitude_count INT := 0;
  v_elem JSONB;
BEGIN
  -- Извлекаем user_id строго из токена аутентификации auth.uid()
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required to save day bundle';
  END IF;

  -- Защита от попытки подделать чужой user_id в payload
  IF p_day->>'user_id' IS NOT NULL AND (p_day->>'user_id')::UUID != v_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot save day bundle for another user';
  END IF;

  v_client_id := p_day->>'client_id';
  IF v_client_id IS NULL OR v_client_id = '' THEN
    v_client_id := COALESCE(p_day->>'day_number', '1');
  END IF;

  v_day_number := COALESCE((p_day->>'day_number')::INT, 1);

  -- 1. Атомарный UPSERT дня в public.days
  INSERT INTO public.days (
    user_id,
    client_id,
    day_number,
    title,
    tags,
    photos,
    date_iso,
    status,
    visibility,
    group_id,
    target_group_ids,
    attached_targets,
    client_updated_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_client_id,
    v_day_number,
    COALESCE(p_day->>'title', 'День #' || v_day_number),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_day->'tags')), ARRAY[]::TEXT[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_day->'photos')), ARRAY[]::TEXT[]),
    COALESCE((p_day->>'date_iso')::TIMESTAMPTZ, v_now),
    COALESCE(p_day->>'status', 'normal'),
    COALESCE(p_day->>'visibility', 'public'),
    NULLIF(p_day->>'group_id', '')::UUID,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_day->'target_group_ids')), ARRAY[]::TEXT[]),
    p_day->'attached_targets',
    COALESCE((p_day->>'client_updated_at')::TIMESTAMPTZ, v_now),
    v_now
  )
  ON CONFLICT (user_id, client_id) DO UPDATE SET
    title = EXCLUDED.title,
    tags = EXCLUDED.tags,
    photos = EXCLUDED.photos,
    date_iso = EXCLUDED.date_iso,
    status = EXCLUDED.status,
    visibility = EXCLUDED.visibility,
    group_id = EXCLUDED.group_id,
    target_group_ids = EXCLUDED.target_group_ids,
    attached_targets = EXCLUDED.attached_targets,
    client_updated_at = EXCLUDED.client_updated_at,
    updated_at = v_now;

  -- 2. Атомарный UPSERT гордостей дня
  IF jsonb_array_length(p_prides) > 0 THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_prides)
    LOOP
      INSERT INTO public.prides (
        user_id,
        day_client_id,
        client_id,
        position,
        num,
        text,
        scale,
        overcome,
        visibility,
        group_id,
        target_group_ids,
        client_updated_at,
        updated_at
      ) VALUES (
        v_user_id,
        v_client_id,
        COALESCE(v_elem->>'client_id', v_client_id || '_p_' || (v_elem->>'position')),
        COALESCE((v_elem->>'position')::INT, 0),
        COALESCE(v_elem->>'num', '01'),
        COALESCE(v_elem->>'text', ''),
        COALESCE((v_elem->>'scale')::NUMERIC, 8),
        COALESCE((v_elem->>'overcome')::NUMERIC, 1),
        COALESCE(v_elem->>'visibility', 'public'),
        NULLIF(v_elem->>'group_id', '')::UUID,
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_elem->'target_group_ids')), ARRAY[]::TEXT[]),
        COALESCE((v_elem->>'client_updated_at')::TIMESTAMPTZ, v_now),
        v_now
      )
      ON CONFLICT (user_id, client_id) DO UPDATE SET
        text = EXCLUDED.text,
        scale = EXCLUDED.scale,
        overcome = EXCLUDED.overcome,
        visibility = EXCLUDED.visibility,
        group_id = EXCLUDED.group_id,
        target_group_ids = EXCLUDED.target_group_ids,
        client_updated_at = EXCLUDED.client_updated_at,
        updated_at = v_now;

      v_pride_count := v_pride_count + 1;
    END LOOP;
  END IF;

  -- 3. Атомарный UPSERT благодарностей дня
  IF jsonb_array_length(p_gratitudes) > 0 THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_gratitudes)
    LOOP
      INSERT INTO public.gratitudes (
        user_id,
        day_client_id,
        client_id,
        position,
        num,
        text,
        rating,
        visibility,
        group_id,
        target_group_ids,
        client_updated_at,
        updated_at
      ) VALUES (
        v_user_id,
        v_client_id,
        COALESCE(v_elem->>'client_id', v_client_id || '_g_' || (v_elem->>'position')),
        COALESCE((v_elem->>'position')::INT, 0),
        COALESCE(v_elem->>'num', '01'),
        COALESCE(v_elem->>'text', ''),
        COALESCE((v_elem->>'rating')::NUMERIC, 10),
        COALESCE(v_elem->>'visibility', 'public'),
        NULLIF(v_elem->>'group_id', '')::UUID,
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_elem->'target_group_ids')), ARRAY[]::TEXT[]),
        COALESCE((v_elem->>'client_updated_at')::TIMESTAMPTZ, v_now),
        v_now
      )
      ON CONFLICT (user_id, client_id) DO UPDATE SET
        text = EXCLUDED.text,
        rating = EXCLUDED.rating,
        visibility = EXCLUDED.visibility,
        group_id = EXCLUDED.group_id,
        target_group_ids = EXCLUDED.target_group_ids,
        client_updated_at = EXCLUDED.client_updated_at,
        updated_at = v_now;

      v_gratitude_count := v_gratitude_count + 1;
    END LOOP;
  END IF;

  -- 4. Обновление стрика пользователя в профиле
  IF p_streak IS NOT NULL THEN
    UPDATE public.profiles
    SET streak_count = p_streak,
        streak = p_streak,
        updated_at = v_now
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'client_id', v_client_id,
    'day_number', v_day_number,
    'prides_saved', v_pride_count,
    'gratitudes_saved', v_gratitude_count,
    'streak', p_streak,
    'saved_at', v_now
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. ЗАЩИТА ГРУПП: ЗАПРЕТ САМОВОЛЬНОГО ВСТУПЛЕНИЯ В ЧУЖИЕ ГРУППЫ
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "chat_group_members_insert" ON public.chat_group_members;
CREATE POLICY "chat_group_members_insert" ON public.chat_group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Добавлять участников может только создатель группы или существующий администратор/владелец
    EXISTS (
      SELECT 1 FROM public.chat_groups g
      WHERE g.id = chat_group_members.group_id AND g.creator_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.chat_group_members m
      WHERE m.group_id = chat_group_members.group_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

-- ----------------------------------------------------------------------------
-- 3. ЗАЩИТА СООБЩЕНИЙ: БЛОКИРОВКИ, ПРИВАТНОСТЬ И ЛИМИТЫ (direct_messages)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "direct_messages_insert" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_insert_sender" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_select" ON public.direct_messages;

-- RLS для чтения сообщений: участник личного чата либо участник группы
CREATE POLICY "direct_messages_select" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() = author_id
    OR auth.uid() = recipient_id
    OR (
      recipient_id IS NULL
      AND (
        thread_key LIKE 'group:%' OR thread_key LIKE 'group-%'
      )
      AND EXISTS (
        SELECT 1 FROM public.chat_group_members m
        WHERE (m.group_id::text = regexp_replace(thread_key, '^group:(group-)?', '')
               OR m.group_id::text = regexp_replace(thread_key, '^group-', ''))
          AND m.user_id = auth.uid()
      )
    )
  );

-- RLS для отправки сообщений: строгий автор, проверка блокировок, приватности и членства в группе
CREATE POLICY "direct_messages_insert" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Автор строго равен auth.uid()
    auth.uid() = author_id
    -- Лимит длины текста сообщения
    AND length(coalesce(body, '')) <= 2048
    -- Для личных сообщений (recipient_id IS NOT NULL):
    AND (
      recipient_id IS NULL
      OR (
        -- Взаимная проверка блокировок: нельзя писать заблокировавшему или заблокированному
        NOT EXISTS (
          SELECT 1 FROM public.blocks b
          WHERE (b.blocker_id = auth.uid() AND b.blocked_id = direct_messages.recipient_id)
             OR (b.blocker_id = direct_messages.recipient_id AND b.blocked_id = auth.uid())
        )
        -- Проверка настроек приватности получателя (who_can_message)
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = direct_messages.recipient_id
            AND (
              coalesce(p.who_can_message, p.privacy->>'whoCanMessage', p.privacy->>'chatPolicy', 'everyone') = 'everyone'
              OR (
                coalesce(p.who_can_message, p.privacy->>'whoCanMessage', p.privacy->>'chatPolicy', 'everyone') = 'friends'
                AND EXISTS (
                  SELECT 1 FROM public.friendships f
                  WHERE f.status = 'accepted'
                    AND ((f.user_id = auth.uid() AND f.friend_id = direct_messages.recipient_id)
                      OR (f.user_id = direct_messages.recipient_id AND f.friend_id = auth.uid()))
                )
              )
            )
        )
      )
    )
    -- Для групповых сообщений (recipient_id IS NULL):
    AND (
      recipient_id IS NOT NULL
      OR (
        (thread_key LIKE 'group:%' OR thread_key LIKE 'group-%')
        AND EXISTS (
          SELECT 1 FROM public.chat_group_members m
          WHERE (m.group_id::text = regexp_replace(thread_key, '^group:(group-)?', '')
                 OR m.group_id::text = regexp_replace(thread_key, '^group-', ''))
            AND m.user_id = auth.uid()
        )
      )
    )
  );

-- Триггер ограничения длины тела сообщения
CREATE OR REPLACE FUNCTION public.check_direct_message_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF length(coalesce(NEW.body, '')) > 2048 THEN
    RAISE EXCEPTION 'check_direct_message_limit_exceeded: body length % exceeds 2048 characters', length(NEW.body);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_direct_messages_limit ON public.direct_messages;
CREATE TRIGGER trg_direct_messages_limit
  BEFORE INSERT OR UPDATE OF body ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_direct_message_limits();

-- Триггер ограничения длины и валидации названия группы
CREATE OR REPLACE FUNCTION public.check_chat_group_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.title := trim(coalesce(NEW.title, ''));
  IF length(NEW.title) < 1 THEN
    RAISE EXCEPTION 'check_chat_group_title_empty: title is required';
  END IF;
  IF length(NEW.title) > 100 THEN
    RAISE EXCEPTION 'check_chat_group_title_exceeded: title length % exceeds 100 characters', length(NEW.title);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_groups_limit ON public.chat_groups;
CREATE TRIGGER trg_chat_groups_limit
  BEFORE INSERT OR UPDATE OF title ON public.chat_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.check_chat_group_limits();

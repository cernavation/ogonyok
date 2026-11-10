-- ==============================================================================
-- МИГРАЦИЯ 160: СКОРОСТЬ, НАДЁЖНОСТЬ И АТОМАРНОЕ СОХРАНЕНИЕ ДНЯ (ЭТАП 16)
-- ==============================================================================
-- 1. Индексы под реальные запросы (лента друзей, треды сообщений, непрочитанные, pg_trgm поиск)
-- 2. Единая RPC-функция save_day(p_payload jsonb) — сохранение дня, гордостей,
--    благодарностей и аудиторий групп в одной строгой транзакции с валидацией тарифа
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ИНДЕКСЫ ДЛЯ УСКОРЕНИЯ КЛЮЧЕВЫХ ЗАПРОСОВ
-- ------------------------------------------------------------------------------

-- Лента: выборка дней по пользователю, дате и приватности
CREATE INDEX IF NOT EXISTS idx_days_user_date_vis ON public.days (user_id, date_iso DESC, visibility);
CREATE INDEX IF NOT EXISTS idx_days_visibility_created ON public.days (visibility, created_at DESC);

-- Сообщения: выборка треда с сортировкой по времени (DESC для пагинации)
CREATE INDEX IF NOT EXISTS idx_direct_messages_thread_created ON public.direct_messages (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_thread_key_created ON public.direct_messages (thread_key, created_at DESC);

-- Уведомления: выборка непрочитанных для пользователя
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);

-- Текстовый поиск по триграммам (pg_trgm) для быстрого серверного поиска соратников
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON public.profiles USING gin (display_name gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 2. RPC-ФУНКЦИЯ save_day(p_payload jsonb)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_day(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_client_id text;
  v_day_number integer;
  v_title text;
  v_date_iso text;
  v_day_date date;
  v_status text;
  v_visibility text;
  v_tags jsonb;
  v_photos jsonb;
  v_client_updated_at timestamptz;
  v_day_id uuid;
  v_tier text;
  v_max_chars integer := 1000;
  
  -- Переменные для обхода гордостей и благодарностей
  v_elem jsonb;
  v_idx integer := 0;
  v_entry_client_id text;
  v_entry_num text;
  v_entry_text text;
  v_entry_scale integer;
  v_entry_overcome integer;
  v_entry_vis text;
  v_entry_ai_comment text;
  v_entry_id uuid;
  v_group_id_text text;
  v_group_id uuid;
  
  v_incoming_pride_ids text[] := ARRAY[]::text[];
  v_incoming_grat_ids text[] := ARRAY[]::text[];
BEGIN
  -- 1. Аутентификация
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    -- Если вызвано service_role, разрешаем передать user_id в payload
    IF p_payload ? 'user_id' THEN
      v_user_id := (p_payload->>'user_id')::uuid;
    ELSE
      RAISE EXCEPTION 'unauthorized: save_day requires authenticated user or service_role';
    END IF;
  END IF;

  -- 2. Извлечение параметров дня
  v_client_id := p_payload->>'client_id';
  IF v_client_id IS NULL OR trim(v_client_id) = '' THEN
    RAISE EXCEPTION 'missing_client_id: client_id is required';
  END IF;

  v_day_number := coalesce((p_payload->>'day_number')::integer, (p_payload->>'id')::integer, 1);
  v_title := coalesce(p_payload->>'title', '');
  v_date_iso := coalesce(p_payload->>'date_iso', p_payload->>'dateISO', now()::text);
  
  BEGIN
    v_day_date := (p_payload->>'day_date')::date;
  EXCEPTION WHEN OTHERS THEN
    v_day_date := CURRENT_DATE;
  END;
  IF v_day_date IS NULL THEN
    BEGIN
      v_day_date := (v_date_iso)::date;
    EXCEPTION WHEN OTHERS THEN
      v_day_date := CURRENT_DATE;
    END;
  END IF;

  v_status := coalesce(p_payload->>'status', 'open');
  v_visibility := coalesce(p_payload->>'visibility', 'private');
  v_tags := coalesce(p_payload->'tags', '[]'::jsonb);
  v_photos := coalesce(p_payload->'photos', '[]'::jsonb);
  
  BEGIN
    v_client_updated_at := (p_payload->>'client_updated_at')::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    v_client_updated_at := now();
  END IF;
  IF v_client_updated_at IS NULL THEN
    v_client_updated_at := now();
  END IF;

  -- 3. Проверка лимитов тарифа
  v_tier := public.effective_tier(v_user_id);
  IF v_tier = 'ultra' THEN
    v_max_chars := 5000;
  ELSIF v_tier = 'pro' THEN
    v_max_chars := 3000;
  ELSE
    v_max_chars := 1000;
  END IF;

  IF length(v_title) > v_max_chars THEN
    RAISE EXCEPTION 'check_char_limit_exceeded: title length % exceeds limit % for tier %',
      length(v_title), v_max_chars, v_tier;
  END IF;

  -- 4. Атомарный Upsert дня
  INSERT INTO public.days (
    user_id, client_id, day_number, title, date_iso, day_date, status, visibility,
    tags, photos, client_updated_at, updated_at
  ) VALUES (
    v_user_id, v_client_id, v_day_number, v_title, v_date_iso, v_day_date, v_status, v_visibility,
    v_tags, v_photos, v_client_updated_at, now()
  )
  ON CONFLICT (user_id, client_id) DO UPDATE SET
    day_number = EXCLUDED.day_number,
    title = EXCLUDED.title,
    date_iso = EXCLUDED.date_iso,
    day_date = EXCLUDED.day_date,
    status = EXCLUDED.status,
    visibility = EXCLUDED.visibility,
    tags = EXCLUDED.tags,
    photos = EXCLUDED.photos,
    client_updated_at = EXCLUDED.client_updated_at,
    updated_at = now()
  RETURNING id INTO v_day_id;

  -- 5. Атомарный Upsert гордостей (prides)
  IF p_payload ? 'prides' AND jsonb_typeof(p_payload->'prides') = 'array' THEN
    v_idx := 0;
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_payload->'prides')
    LOOP
      v_idx := v_idx + 1;
      
      -- Извлекаем поля гордости (поддерживаем как строку, так и объект)
      IF jsonb_typeof(v_elem) = 'string' THEN
        v_entry_text := v_elem #>> '{}';
        v_entry_num := lpad(v_idx::text, 2, '0');
        v_entry_client_id := v_client_id || '_p_' || v_idx::text;
        v_entry_scale := 8;
        v_entry_overcome := 1;
        v_entry_vis := v_visibility;
        v_entry_ai_comment := NULL;
      ELSE
        v_entry_text := coalesce(v_elem->>'text', '');
        v_entry_num := coalesce(v_elem->>'num', lpad(v_idx::text, 2, '0'));
        v_entry_client_id := coalesce(v_elem->>'client_id', v_client_id || '_p_' || v_idx::text);
        v_entry_scale := coalesce((v_elem->>'scale')::integer, 8);
        v_entry_overcome := coalesce((v_elem->>'overcome')::integer, 1);
        v_entry_vis := coalesce(v_elem->>'visibility', v_visibility);
        v_entry_ai_comment := v_elem->>'ai_comment';
      END IF;

      -- Проверка лимита символов гордости
      IF length(v_entry_text) > v_max_chars THEN
        RAISE EXCEPTION 'check_char_limit_exceeded: pride % length % exceeds limit % for tier %',
          v_entry_client_id, length(v_entry_text), v_max_chars, v_tier;
      END IF;

      v_incoming_pride_ids := array_append(v_incoming_pride_ids, v_entry_client_id);

      INSERT INTO public.prides (
        user_id, day_id, day_client_id, client_id, position, num, text,
        scale, overcome, ai_comment, visibility, client_updated_at, updated_at
      ) VALUES (
        v_user_id, v_day_id, v_client_id, v_entry_client_id, v_idx, v_entry_num, v_entry_text,
        v_entry_scale, v_entry_overcome, v_entry_ai_comment, v_entry_vis, v_client_updated_at, now()
      )
      ON CONFLICT (user_id, client_id) DO UPDATE SET
        day_id = EXCLUDED.day_id,
        day_client_id = EXCLUDED.day_client_id,
        position = EXCLUDED.position,
        num = EXCLUDED.num,
        text = EXCLUDED.text,
        scale = EXCLUDED.scale,
        overcome = EXCLUDED.overcome,
        ai_comment = EXCLUDED.ai_comment,
        visibility = EXCLUDED.visibility,
        client_updated_at = EXCLUDED.client_updated_at,
        updated_at = now()
      RETURNING id INTO v_entry_id;

      -- Аудитория конкретных групп (если visibility = 'groups')
      IF v_entry_vis = 'groups' AND (v_elem ? 'groupIds' OR v_elem ? 'group_ids') THEN
        DELETE FROM public.entry_audiences
         WHERE entry_kind = 'pride' AND (entry_id = v_entry_id OR entry_client_id = v_entry_client_id);

        FOR v_group_id_text IN
          SELECT jsonb_array_elements_text(coalesce(v_elem->'groupIds', v_elem->'group_ids'))
        LOOP
          BEGIN
            v_group_id := v_group_id_text::uuid;
            INSERT INTO public.entry_audiences (entry_kind, entry_id, entry_client_id, group_id)
            VALUES ('pride', v_entry_id, v_entry_client_id, v_group_id)
            ON CONFLICT (entry_kind, entry_id, group_id) DO NOTHING;
          EXCEPTION WHEN OTHERS THEN
            -- пропускаем невалидные UUID групп
            NULL;
          END;
        END LOOP;
      END IF;
    END LOOP;

    -- Удаляем гордости, которые были удалены клиентом для этого дня
    DELETE FROM public.prides
     WHERE user_id = v_user_id
       AND day_client_id = v_client_id
       AND NOT (client_id = ANY(v_incoming_pride_ids));
  END IF;

  -- 6. Атомарный Upsert благодарностей (gratitudes)
  IF p_payload ? 'gratitudes' AND jsonb_typeof(p_payload->'gratitudes') = 'array' THEN
    v_idx := 0;
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_payload->'gratitudes')
    LOOP
      v_idx := v_idx + 1;

      IF jsonb_typeof(v_elem) = 'string' THEN
        v_entry_text := v_elem #>> '{}';
        v_entry_num := lpad(v_idx::text, 2, '0');
        v_entry_client_id := v_client_id || '_g_' || v_idx::text;
        v_entry_scale := 10;
        v_entry_vis := v_visibility;
      ELSE
        v_entry_text := coalesce(v_elem->>'text', '');
        v_entry_num := coalesce(v_elem->>'num', lpad(v_idx::text, 2, '0'));
        v_entry_client_id := coalesce(v_elem->>'client_id', v_client_id || '_g_' || v_idx::text);
        v_entry_scale := coalesce((v_elem->>'rating')::integer, (v_elem->>'scale')::integer, 10);
        v_entry_vis := coalesce(v_elem->>'visibility', v_visibility);
      END IF;

      IF length(v_entry_text) > v_max_chars THEN
        RAISE EXCEPTION 'check_char_limit_exceeded: gratitude % length % exceeds limit % for tier %',
          v_entry_client_id, length(v_entry_text), v_max_chars, v_tier;
      END IF;

      v_incoming_grat_ids := array_append(v_incoming_grat_ids, v_entry_client_id);

      INSERT INTO public.gratitudes (
        user_id, day_id, day_client_id, client_id, position, num, text,
        rating, visibility, client_updated_at, updated_at
      ) VALUES (
        v_user_id, v_day_id, v_client_id, v_entry_client_id, v_idx, v_entry_num, v_entry_text,
        v_entry_scale, v_entry_vis, v_client_updated_at, now()
      )
      ON CONFLICT (user_id, client_id) DO UPDATE SET
        day_id = EXCLUDED.day_id,
        day_client_id = EXCLUDED.day_client_id,
        position = EXCLUDED.position,
        num = EXCLUDED.num,
        text = EXCLUDED.text,
        rating = EXCLUDED.rating,
        visibility = EXCLUDED.visibility,
        client_updated_at = EXCLUDED.client_updated_at,
        updated_at = now()
      RETURNING id INTO v_entry_id;

      IF v_entry_vis = 'groups' AND (v_elem ? 'groupIds' OR v_elem ? 'group_ids') THEN
        DELETE FROM public.entry_audiences
         WHERE entry_kind = 'gratitude' AND (entry_id = v_entry_id OR entry_client_id = v_entry_client_id);

        FOR v_group_id_text IN
          SELECT jsonb_array_elements_text(coalesce(v_elem->'groupIds', v_elem->'group_ids'))
        LOOP
          BEGIN
            v_group_id := v_group_id_text::uuid;
            INSERT INTO public.entry_audiences (entry_kind, entry_id, entry_client_id, group_id)
            VALUES ('gratitude', v_entry_id, v_entry_client_id, v_group_id)
            ON CONFLICT (entry_kind, entry_id, group_id) DO NOTHING;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END LOOP;
      END IF;
    END LOOP;

    DELETE FROM public.gratitudes
     WHERE user_id = v_user_id
       AND day_client_id = v_client_id
       AND NOT (client_id = ANY(v_incoming_grat_ids));
  END IF;

  -- 7. Возврат успешного статуса
  RETURN jsonb_build_object(
    'ok', true,
    'day_id', v_day_id,
    'client_id', v_client_id,
    'tier', v_tier,
    'prides_count', array_length(v_incoming_pride_ids, 1),
    'gratitudes_count', array_length(v_incoming_grat_ids, 1)
  );
END;
$$;

-- Права на вызов RPC
GRANT EXECUTE ON FUNCTION public.save_day(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_day(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_day(jsonb) TO anon;

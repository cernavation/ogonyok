-- 131_save_day_bundle_rpc.sql
-- ЭТАП 17: Оптимизация сохранения дня одним RPC + составные индексы БД

-- 1. Создание атомарной RPC функции сохранения дня со всеми гордостями, благодарностями и стриком
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
  -- Извлекаем user_id из токена или из объекта дня
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    v_user_id := (p_day->>'user_id')::UUID;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user_id is required';
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

-- 2. Составные индексы для ускорения выборок, сортировок и пагинации
CREATE INDEX IF NOT EXISTS idx_days_user_day_num ON public.days (user_id, day_number DESC);
CREATE INDEX IF NOT EXISTS idx_days_user_client_updated ON public.days (user_id, client_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prides_user_day_client ON public.prides (user_id, day_client_id);
CREATE INDEX IF NOT EXISTS idx_gratitudes_user_day_client ON public.gratitudes (user_id, day_client_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_created ON public.direct_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_created ON public.direct_messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked ON public.blocks (blocker_id, blocked_id);

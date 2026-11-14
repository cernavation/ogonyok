-- ==============================================================================
-- МИГРАЦИЯ 050: ЛИМИТЫ, КВОТЫ И ЗАЩИТА ОТ ЗЛОУПОТРЕБЛЕНИЙ (ЭТАП 5)
-- ==============================================================================

-- 1. Таблица rate_limits (хранение счетчиков окон для IP, пользователей и маршрутов)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT clock_timestamp(),
  count integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits (window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_service_only" ON public.rate_limits;
CREATE POLICY "rate_limits_service_only" ON public.rate_limits
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Функция check_rate_limit: атомарный скользящий/фиксированный счетчик запросов
-- Вызывается строго под ролью service_role
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_count integer;
BEGIN
  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, v_now, 1)
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      WHEN clock_timestamp() - public.rate_limits.window_start >= (p_window_seconds || ' seconds')::interval
        THEN 1
      ELSE public.rate_limits.count + 1
    END,
    window_start = CASE
      WHEN clock_timestamp() - public.rate_limits.window_start >= (p_window_seconds || ' seconds')::interval
        THEN clock_timestamp()
      ELSE public.rate_limits.window_start
    END
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

-- ------------------------------------------------------------------------------
-- 2. Таблица usage_counters (дневные квоты пользователей с учетом часового пояса)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, kind, day)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_lookup ON public.usage_counters (user_id, kind, day);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_counters_select_own" ON public.usage_counters;
CREATE POLICY "usage_counters_select_own" ON public.usage_counters
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "usage_counters_service_all" ON public.usage_counters;
CREATE POLICY "usage_counters_service_all" ON public.usage_counters
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Функция consume_quota: атомарное списание дневной квоты пользователя
-- p_user_id передается сервером (service_role) или берется auth.uid()
CREATE OR REPLACE FUNCTION public.consume_quota(
  p_kind text,
  p_limit integer,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_tz text := 'Europe/Chisinau';
  v_today date;
  v_current integer := 0;
  v_new integer := 0;
BEGIN
  v_user_id := coalesce(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'unauthorized',
      'message', 'User ID is required'
    );
  END IF;

  -- Определяем часовой пояс пользователя из профиля
  SELECT coalesce(timezone, 'Europe/Chisinau') INTO v_tz
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_tz IS NULL OR v_tz = '' THEN
    v_tz := 'Europe/Chisinau';
  END IF;

  BEGIN
    v_today := (timezone(v_tz, clock_timestamp()))::date;
  EXCEPTION WHEN OTHERS THEN
    v_today := (timezone('Europe/Chisinau', clock_timestamp()))::date;
  END;

  -- Если лимит <= 0 (например, бесплатный тариф для ИИ-оценок)
  IF p_limit <= 0 THEN
    SELECT coalesce(count, 0) INTO v_current
    FROM public.usage_counters
    WHERE user_id = v_user_id AND kind = p_kind AND day = v_today;

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'quota_exceeded',
      'feature', p_kind,
      'limit', p_limit,
      'remaining', 0,
      'current', coalesce(v_current, 0)
    );
  END IF;

  -- 1. Гарантируем наличие строки дня с начальным значением 0
  INSERT INTO public.usage_counters (user_id, kind, day, count, updated_at)
  VALUES (v_user_id, p_kind, v_today, 0, clock_timestamp())
  ON CONFLICT (user_id, kind, day) DO NOTHING;

  -- 2. Атомарно инкрементируем СТРОГО если count < p_limit (блокировка строки на уровне ядра PostgreSQL)
  UPDATE public.usage_counters
  SET count = count + 1, updated_at = clock_timestamp()
  WHERE user_id = v_user_id AND kind = p_kind AND day = v_today AND count < p_limit
  RETURNING count INTO v_new;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'feature', p_kind,
      'limit', p_limit,
      'remaining', greatest(0, p_limit - v_new),
      'current', v_new
    );
  ELSE
    SELECT coalesce(count, 0) INTO v_current
    FROM public.usage_counters
    WHERE user_id = v_user_id AND kind = p_kind AND day = v_today;

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'quota_exceeded',
      'feature', p_kind,
      'limit', p_limit,
      'remaining', 0,
      'current', coalesce(v_current, 0)
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_quota(text, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_quota(text, integer, uuid) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. Таблица ai_cache (кэш ответов ИИ по хэшу содержимого дня)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_cache (
  content_hash text PRIMARY KEY,
  response jsonb NOT NULL,
  provider text NOT NULL DEFAULT 'gemini',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_created ON public.ai_cache (created_at DESC);

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_cache_service_only" ON public.ai_cache;
CREATE POLICY "ai_cache_service_only" ON public.ai_cache
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

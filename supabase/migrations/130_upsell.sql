-- ============================================================================
-- 130_upsell.sql: АНАЛИТИКА ВОРОНКИ И УПРАВЛЕНИЕ АПСЕЛЛАМИ (ЭТАП 13)
-- ============================================================================
-- 1. Таблица upsell_events(id, user_id, feature, action, metadata, created_at)
-- 2. Колонка dismissed_upsells text[] в profiles (опция «Больше не напоминать»)
-- 3. RLS политики: вставка только своих событий, чтение только владельцем
-- 4. RPC функции: record_upsell_event, dismiss_upsell_forever
-- ============================================================================

-- 1. Таблица аналитики воронки апселлов
CREATE TABLE IF NOT EXISTS public.upsell_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature text NOT NULL,
  action text NOT NULL CHECK (action IN ('shown', 'clicked', 'dismissed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upsell_events_user_feature
  ON public.upsell_events(user_id, feature, action);

CREATE INDEX IF NOT EXISTS idx_upsell_events_created_at
  ON public.upsell_events(created_at);

-- 2. Добавление списка скрытых навсегда апселлов в profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dismissed_upsells text[] DEFAULT '{}'::text[];

-- 3. Включение RLS
ALTER TABLE public.upsell_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "upsell_events_insert_own" ON public.upsell_events;
CREATE POLICY "upsell_events_insert_own"
ON public.upsell_events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "upsell_events_select_own" ON public.upsell_events;
CREATE POLICY "upsell_events_select_own"
ON public.upsell_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. RPC: Запись события воронки
CREATE OR REPLACE FUNCTION public.record_upsell_event(
  p_feature text,
  p_action text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authorization required';
  END IF;

  IF p_action NOT IN ('shown', 'clicked', 'dismissed') THEN
    RAISE EXCEPTION 'INVALID_ACTION: action must be shown, clicked, or dismissed';
  END IF;

  INSERT INTO public.upsell_events (user_id, feature, action, metadata, created_at)
  VALUES (v_user_id, p_feature, p_action, COALESCE(p_metadata, '{}'::jsonb), now())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 5. RPC: Навсегда отключить показ апселла для конкретной фичи
CREATE OR REPLACE FUNCTION public.dismiss_upsell_forever(
  p_feature text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authorization required';
  END IF;

  UPDATE public.profiles
  SET
    dismissed_upsells = array_append(
      array_remove(COALESCE(dismissed_upsells, '{}'::text[]), p_feature),
      p_feature
    ),
    updated_at = now()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_upsell_event(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_upsell_forever(text) TO authenticated;

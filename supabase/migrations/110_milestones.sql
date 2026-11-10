-- ============================================================================
-- 110_milestones.sql: ВЕХИ (100, 200, 300... ДНЕЙ) И ТОКЕНЫ ИИ
-- ============================================================================
-- 1. Добавление колонок расхода токенов в ai_evaluations (без текста записей)
-- 2. Таблица milestones_shown (хранение показанных юбилеев и снимков аналитики)
-- 3. RLS политики: владелец видит всё, сохранённые в Свод (Vault) видны всем соратникам
-- 4. RPC функции: record_milestone_shown, save_milestone_to_vault, get_user_milestones
-- ============================================================================

-- 1. Добавление расхода токенов в ai_evaluations
ALTER TABLE public.ai_evaluations
  ADD COLUMN IF NOT EXISTS prompt_tokens integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_tokens integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tokens integer DEFAULT 0;

-- 2. Таблица milestones_shown
CREATE TABLE IF NOT EXISTS public.milestones_shown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_number integer NOT NULL CHECK (milestone_number > 0),
  shown_at timestamptz NOT NULL DEFAULT now(),
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_review_text text,
  saved_to_vault boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_milestones_shown_user_milestone UNIQUE (user_id, milestone_number)
);

CREATE INDEX IF NOT EXISTS idx_milestones_shown_user
  ON public.milestones_shown(user_id, milestone_number);

CREATE INDEX IF NOT EXISTS idx_milestones_shown_vault
  ON public.milestones_shown(saved_to_vault)
  WHERE saved_to_vault = true;

-- 3. Включение RLS
ALTER TABLE public.milestones_shown ENABLE ROW LEVEL SECURITY;

-- Политика: владелец может делать всё со своими вехами
DROP POLICY IF EXISTS "milestones_owner_all" ON public.milestones_shown;
CREATE POLICY "milestones_owner_all"
ON public.milestones_shown FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Политика: вехи, сохранённые в Свод (Vault), видны всем авторизованным пользователям
DROP POLICY IF EXISTS "milestones_vault_select" ON public.milestones_shown;
CREATE POLICY "milestones_vault_select"
ON public.milestones_shown FOR SELECT
TO authenticated
USING (saved_to_vault = true);

-- 4. RPC: Запись о показанной вехе (идемпотентно upsert)
CREATE OR REPLACE FUNCTION public.record_milestone_shown(
  p_milestone_number integer,
  p_snapshot jsonb DEFAULT '{}'::jsonb,
  p_review_text text DEFAULT NULL
)
RETURNS public.milestones_shown
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rec public.milestones_shown;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authorization required';
  END IF;

  INSERT INTO public.milestones_shown (
    user_id,
    milestone_number,
    shown_at,
    snapshot_json,
    user_review_text,
    updated_at
  )
  VALUES (
    v_user_id,
    p_milestone_number,
    now(),
    p_snapshot,
    p_review_text,
    now()
  )
  ON CONFLICT (user_id, milestone_number)
  DO UPDATE SET
    shown_at = now(),
    snapshot_json = CASE WHEN p_snapshot = '{}'::jsonb THEN milestones_shown.snapshot_json ELSE p_snapshot END,
    user_review_text = COALESCE(p_review_text, milestones_shown.user_review_text),
    updated_at = now()
  RETURNING * INTO v_rec;

  RETURN v_rec;
END;
$$;

-- RPC: Сохранение / удаление вехи из Свода (Vault)
CREATE OR REPLACE FUNCTION public.save_milestone_to_vault(
  p_milestone_number integer,
  p_saved boolean DEFAULT true,
  p_review_text text DEFAULT NULL
)
RETURNS public.milestones_shown
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rec public.milestones_shown;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authorization required';
  END IF;

  UPDATE public.milestones_shown
  SET
    saved_to_vault = p_saved,
    user_review_text = COALESCE(p_review_text, user_review_text),
    updated_at = now()
  WHERE user_id = v_user_id AND milestone_number = p_milestone_number
  RETURNING * INTO v_rec;

  IF NOT FOUND THEN
    INSERT INTO public.milestones_shown (
      user_id,
      milestone_number,
      saved_to_vault,
      user_review_text
    )
    VALUES (
      v_user_id,
      p_milestone_number,
      p_saved,
      p_review_text
    )
    RETURNING * INTO v_rec;
  END IF;

  RETURN v_rec;
END;
$$;

-- RPC: Получение всех вех пользователя
CREATE OR REPLACE FUNCTION public.get_user_milestones(p_user_id uuid DEFAULT NULL)
RETURNS SETOF public.milestones_shown
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_id uuid := COALESCE(p_user_id, auth.uid());
  v_is_self boolean := (auth.uid() = v_target_id);
BEGIN
  IF v_target_id IS NULL THEN
    RETURN;
  END IF;

  IF v_is_self THEN
    RETURN QUERY
    SELECT * FROM public.milestones_shown
    WHERE user_id = v_target_id
    ORDER BY milestone_number ASC;
  ELSE
    RETURN QUERY
    SELECT * FROM public.milestones_shown
    WHERE user_id = v_target_id AND saved_to_vault = true
    ORDER BY milestone_number ASC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_milestone_shown(integer, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_milestone_to_vault(integer, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_milestones(uuid) TO authenticated;

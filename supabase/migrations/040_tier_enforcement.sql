-- ==============================================================================
-- МИГРАЦИЯ 040: СЕРВЕРНОЕ ПРИНУЖДЕНИЕ ТАРИФОВ И ТАБЛИЦА БИЛЛИНГА (ЭТАП 4)
-- ==============================================================================

-- 1. Таблица биллинг-событий (для обеспечения строгой идемпотентности вебхуков)
CREATE TABLE IF NOT EXISTS public.billing_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tier text NOT NULL CHECK (tier IN ('free', 'pro', 'ultra')),
  period text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы для биллинга
CREATE INDEX IF NOT EXISTS idx_billing_events_user ON public.billing_events (user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON public.billing_events (created_at DESC);

-- RLS: Никакой клиентский доступ не разрешён. Доступ строго для роли service_role.
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_events_service_only" ON public.billing_events;
CREATE POLICY "billing_events_service_only" ON public.billing_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. Триггер проверки длины текста гордостей и благодарностей
-- Лимиты: free <= 1000, pro <= 3000, ultra <= 5000 символов
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_entry_char_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tier text;
  v_max_len integer := 1000;
  v_text_len integer;
BEGIN
  -- Определяем эффективный тариф владельца записи
  v_tier := public.effective_tier(NEW.user_id);

  IF v_tier = 'ultra' THEN
    v_max_len := 5000;
  ELSIF v_tier = 'pro' THEN
    v_max_len := 3000;
  ELSE
    v_max_len := 1000;
  END IF;

  v_text_len := length(coalesce(NEW.text, ''));

  IF v_text_len > v_max_len THEN
    RAISE EXCEPTION 'check_char_limit_exceeded: maximum characters allowed for tier % is %, received %',
      v_tier, v_max_len, v_text_len;
  END IF;

  RETURN NEW;
END;
$$;

-- Навешиваем триггер на prides
DROP TRIGGER IF EXISTS trg_enforce_pride_char_limit ON public.prides;
CREATE TRIGGER trg_enforce_pride_char_limit
  BEFORE INSERT OR UPDATE OF text ON public.prides
  FOR EACH ROW
  EXECUTE FUNCTION public.check_entry_char_limit();

-- Навешиваем триггер на gratitudes
DROP TRIGGER IF EXISTS trg_enforce_gratitude_char_limit ON public.gratitudes;
CREATE TRIGGER trg_enforce_gratitude_char_limit
  BEFORE INSERT OR UPDATE OF text ON public.gratitudes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_entry_char_limit();

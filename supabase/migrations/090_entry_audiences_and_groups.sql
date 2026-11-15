-- ============================================================================
-- 090_entry_audiences_and_groups.sql
-- Идемпотентная миграция: аудитории записей (Лично / Друзьям / Всем / Группы)
-- Шаг 09: Независимая аудитория для каждой гордости и благодарности,
-- единые группы (чаты и соц-группы), RLS-изоляция записей групп, квоты тарифов
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. КОЛОНКИ group_id И target_group_ids В days, prides, gratitudes
-- ----------------------------------------------------------------------------
ALTER TABLE public.days
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.chat_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_group_ids uuid[] DEFAULT '{}';

ALTER TABLE public.prides
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.chat_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_group_ids uuid[] DEFAULT '{}';

ALTER TABLE public.gratitudes
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.chat_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_group_ids uuid[] DEFAULT '{}';

-- Обновление допустимых значений visibility для days, prides, gratitudes
ALTER TABLE public.days DROP CONSTRAINT IF EXISTS days_visibility_check;
ALTER TABLE public.days DROP CONSTRAINT IF EXISTS chk_days_visibility;
ALTER TABLE public.days ADD CONSTRAINT chk_days_visibility
  CHECK (visibility IN ('private', 'friends', 'public', 'group'));

ALTER TABLE public.prides DROP CONSTRAINT IF EXISTS chk_prides_visibility;
ALTER TABLE public.prides ADD CONSTRAINT chk_prides_visibility
  CHECK (visibility IN ('private', 'friends', 'public', 'group'));

ALTER TABLE public.gratitudes DROP CONSTRAINT IF EXISTS chk_gratitudes_visibility;
ALTER TABLE public.gratitudes ADD CONSTRAINT chk_gratitudes_visibility
  CHECK (visibility IN ('private', 'friends', 'public', 'group'));

-- Индексы для быстрой фильтрации по группам
CREATE INDEX IF NOT EXISTS idx_days_group_id ON public.days(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prides_group_id ON public.prides(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gratitudes_group_id ON public.gratitudes(group_id) WHERE group_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. ТРИГГЕР ЛИМИТА СОЗДАВАЕМЫХ ГРУПП ПО ТАРИФАМ (Free 1, Pro 5, Ultra 20)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_check_chat_group_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  u_tier text;
  owned_count integer;
  max_allowed integer;
BEGIN
  -- Получаем текущий тариф создателя через canonical effective_tier
  BEGIN
    u_tier := public.effective_tier(NEW.creator_id);
  EXCEPTION WHEN OTHERS THEN
    u_tier := 'free';
  END;

  IF u_tier = 'ultra' THEN
    max_allowed := 20;
  ELSIF u_tier = 'pro' THEN
    max_allowed := 5;
  ELSE
    max_allowed := 1;
  END IF;

  SELECT count(*) INTO owned_count
  FROM public.chat_groups
  WHERE creator_id = NEW.creator_id;

  IF owned_count >= max_allowed THEN
    RAISE EXCEPTION 'Group creation limit reached for tier % (limit: %, current: %)', u_tier, max_allowed, owned_count;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_group_limit ON public.chat_groups;
CREATE TRIGGER trg_chat_group_limit
  BEFORE INSERT ON public.chat_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_check_chat_group_limit();

-- ----------------------------------------------------------------------------
-- 3. ОБНОВЛЕНИЕ RLS ПОЛИТИК ДЛЯ prides, gratitudes, days
-- ----------------------------------------------------------------------------

-- [A] PRIDES SELECT POLICY
DROP POLICY IF EXISTS "prides_select_policy" ON public.prides;
CREATE POLICY "prides_select_policy"
ON public.prides FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR visibility = 'public'
  OR (
    visibility = 'friends'
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = prides.user_id)
          OR
          (f.friend_id = auth.uid() AND f.user_id = prides.user_id)
        )
    )
  )
  OR (
    visibility = 'group'
    AND (
      (prides.group_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.chat_group_members cgm
        WHERE cgm.group_id = prides.group_id
          AND cgm.user_id = auth.uid()
      ))
      OR
      (prides.target_group_ids IS NOT NULL AND array_length(prides.target_group_ids, 1) > 0 AND EXISTS (
        SELECT 1 FROM public.chat_group_members cgm
        WHERE cgm.group_id = ANY(prides.target_group_ids)
          AND cgm.user_id = auth.uid()
      ))
    )
  )
);

-- [B] GRATITUDES SELECT POLICY
DROP POLICY IF EXISTS "gratitudes_select_policy" ON public.gratitudes;
CREATE POLICY "gratitudes_select_policy"
ON public.gratitudes FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR visibility = 'public'
  OR (
    visibility = 'friends'
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = gratitudes.user_id)
          OR
          (f.friend_id = auth.uid() AND f.user_id = gratitudes.user_id)
        )
    )
  )
  OR (
    visibility = 'group'
    AND (
      (gratitudes.group_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.chat_group_members cgm
        WHERE cgm.group_id = gratitudes.group_id
          AND cgm.user_id = auth.uid()
      ))
      OR
      (gratitudes.target_group_ids IS NOT NULL AND array_length(gratitudes.target_group_ids, 1) > 0 AND EXISTS (
        SELECT 1 FROM public.chat_group_members cgm
        WHERE cgm.group_id = ANY(gratitudes.target_group_ids)
          AND cgm.user_id = auth.uid()
      ))
    )
  )
);

-- [C] DAYS SELECT POLICY
DROP POLICY IF EXISTS "days_select_policy" ON public.days;
CREATE POLICY "days_select_policy"
ON public.days FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR visibility = 'public'
  OR (
    visibility = 'friends'
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = days.user_id)
          OR
          (f.friend_id = auth.uid() AND f.user_id = days.user_id)
        )
    )
  )
  OR (
    visibility = 'group'
    AND (
      (days.group_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.chat_group_members cgm
        WHERE cgm.group_id = days.group_id
          AND cgm.user_id = auth.uid()
      ))
      OR
      (days.target_group_ids IS NOT NULL AND array_length(days.target_group_ids, 1) > 0 AND EXISTS (
        SELECT 1 FROM public.chat_group_members cgm
        WHERE cgm.group_id = ANY(days.target_group_ids)
          AND cgm.user_id = auth.uid()
      ))
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.prides p
    WHERE p.day_id = days.id
      AND (
        p.visibility = 'public'
        OR (
          p.visibility = 'friends'
          AND EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.user_id = auth.uid() AND f.friend_id = days.user_id)
                OR
                (f.friend_id = auth.uid() AND f.user_id = days.user_id)
              )
          )
        )
        OR (
          p.visibility = 'group'
          AND (
            (p.group_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.chat_group_members cgm
              WHERE cgm.group_id = p.group_id
                AND cgm.user_id = auth.uid()
            ))
            OR
            (p.target_group_ids IS NOT NULL AND array_length(p.target_group_ids, 1) > 0 AND EXISTS (
              SELECT 1 FROM public.chat_group_members cgm
              WHERE cgm.group_id = ANY(p.target_group_ids)
                AND cgm.user_id = auth.uid()
            ))
          )
        )
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.gratitudes g
    WHERE g.day_id = days.id
      AND (
        g.visibility = 'public'
        OR (
          g.visibility = 'friends'
          AND EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.user_id = auth.uid() AND f.friend_id = days.user_id)
                OR
                (f.friend_id = auth.uid() AND f.user_id = days.user_id)
              )
          )
        )
        OR (
          g.visibility = 'group'
          AND (
            (g.group_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.chat_group_members cgm
              WHERE cgm.group_id = g.group_id
                AND cgm.user_id = auth.uid()
            ))
            OR
            (g.target_group_ids IS NOT NULL AND array_length(g.target_group_ids, 1) > 0 AND EXISTS (
              SELECT 1 FROM public.chat_group_members cgm
              WHERE cgm.group_id = ANY(g.target_group_ids)
                AND cgm.user_id = auth.uid()
            ))
          )
        )
      )
  )
);

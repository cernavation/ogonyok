-- ============================================================================
-- ОГОНЁК · МИГРАЦИЯ 020_rls.sql: БЕЗОПАСНОСТЬ БАЗЫ ДАННЫХ (RLS, ТАРИФЫ, АУДИТ)
-- ============================================================================
-- Идемпотентная миграция безопасности:
-- 1. Таблица приватных данных профиля public.profile_private и VIEW public.profiles_public.
-- 2. Таблица аудита тарифов public.subscription_audit.
-- 3. Триггер защиты тарифов profiles (запрет смены tier/verified/is_founder не service_role).
-- 4. Функция public.effective_tier(user_id) с учётом срока годности.
-- 5. Включение Row Level Security (RLS) на ВСЕХ таблицах public и удаление allow_all_dev.
-- 6. Строгие политики RLS для всех сущностей (profiles, days, prides, gratitudes,
--    direct_messages, stories, comments, reactions, call_sessions, evidence_vault,
--    friendships, follows, scheduled_messages, telegram_links, ai_evaluations).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ТАБЛИЦА ПРИВАТНЫХ ДАННЫХ ПРОФИЛЯ (profile_private) И VIEW (profiles_public)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_private (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  telegram_chat_id text,
  reminder_times jsonb DEFAULT '["21:00"]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  privacy jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Копируем существующие приватные данные из profiles при первой накатке
INSERT INTO public.profile_private (user_id, telegram_chat_id, reminder_times, settings, privacy, updated_at)
SELECT
  p.id,
  p.telegram_chat_id,
  CASE
    WHEN p.reminder_times IS NULL THEN '["21:00"]'::jsonb
    ELSE to_jsonb(p.reminder_times)
  END,
  COALESCE(p.settings, '{}'::jsonb),
  COALESCE(p.privacy, '{}'::jsonb),
  now()
FROM public.profiles p
ON CONFLICT (user_id) DO UPDATE SET
  telegram_chat_id = COALESCE(EXCLUDED.telegram_chat_id, public.profile_private.telegram_chat_id),
  settings = COALESCE(EXCLUDED.settings, public.profile_private.settings),
  privacy = COALESCE(EXCLUDED.privacy, public.profile_private.privacy),
  updated_at = now();

-- Публичное представление профилей (каталог без приватных настроек)
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  avatar_image,
  cover_url,
  banner_image,
  banner_preset,
  bio,
  city,
  website,
  age,
  level,
  difficulty_level,
  streak,
  streak_count,
  total_prides,
  total_gratitudes,
  verified,
  is_founder,
  subscription_tier,
  is_anonymous,
  created_at,
  updated_at
FROM public.profiles;

-- Гарантия defaults для client_id при создании записей через API
ALTER TABLE public.days ALTER COLUMN client_id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.prides ALTER COLUMN client_id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.gratitudes ALTER COLUMN client_id SET DEFAULT gen_random_uuid()::text;

-- ----------------------------------------------------------------------------
-- 2. ТАБЛИЦА АУДИТА ТАРИФОВ (subscription_audit)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscription_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_tier text NOT NULL,
  new_tier text NOT NULL,
  until timestamptz,
  changed_by text NOT NULL DEFAULT 'service_role',
  reason text NOT NULL DEFAULT 'admin-command',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_user ON public.subscription_audit(user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. ТАРИФ-ЗАЩИТА: ТРИГГЕРЫ И ПРАВА
-- ----------------------------------------------------------------------------

-- Добавляем колонку subscription_valid_until и is_founder если отсутствуют
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_valid_until timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false;

-- Миграция устаревшего значения 'premium' в 'pro'
UPDATE public.profiles
SET subscription_tier = 'pro'
WHERE subscription_tier = 'premium';

-- Ограничение check на subscription_tier
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_subscription_tier;
ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_subscription_tier
  CHECK (subscription_tier IN ('free', 'pro', 'ultra'));

-- Функция-триггер защиты тарифов и верификации
CREATE OR REPLACE FUNCTION public.trg_protect_profile_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_role text;
BEGIN
  -- Извлекаем роль из JWT
  BEGIN
    current_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    current_role := NULL;
  END;

  -- При INSERT:
  IF TG_OP = 'INSERT' THEN
    -- Если создание идёт от клиента (не service_role и не прямой SQL Editor):
    IF current_role IS NOT NULL AND current_role <> 'service_role' THEN
      NEW.subscription_tier := 'free';
      NEW.subscription_valid_until := NULL;
      NEW.verified := false;
      NEW.is_founder := false;
    ELSE
      -- service_role или прямой SQL: нормализуем значения
      IF NEW.subscription_tier = 'premium' THEN
        NEW.subscription_tier := 'pro';
      END IF;
      IF NEW.subscription_tier IS NULL THEN
        NEW.subscription_tier := 'free';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- При UPDATE:
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier) OR
       (NEW.subscription_valid_until IS DISTINCT FROM OLD.subscription_valid_until) OR
       (NEW.verified IS DISTINCT FROM OLD.verified) OR
       (NEW.is_founder IS DISTINCT FROM OLD.is_founder) THEN

      -- Разрешено только для service_role или NULL (SQL Editor/superuser)
      IF current_role IS NOT NULL AND current_role <> 'service_role' THEN
        RAISE EXCEPTION 'forbidden: cannot modify protected subscription and verification fields';
      END IF;

      IF NEW.subscription_tier = 'premium' THEN
        NEW.subscription_tier := 'pro';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_subscription ON public.profiles;
CREATE TRIGGER trg_protect_subscription
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_protect_profile_subscription();

-- Второй слой защиты: отзыв прав UPDATE на защищённые колонки у anon и authenticated
REVOKE UPDATE (subscription_tier, subscription_valid_until, verified, is_founder)
ON public.profiles
FROM anon, authenticated;

-- Функция вычисления эффективного тарифа с проверкой срока
CREATE OR REPLACE FUNCTION public.effective_tier(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tier text;
  v_until timestamptz;
BEGIN
  SELECT subscription_tier, subscription_valid_until
  INTO v_tier, v_until
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_tier IS NULL THEN
    RETURN 'free';
  END IF;

  IF v_tier = 'premium' THEN
    v_tier := 'pro';
  END IF;

  IF v_tier NOT IN ('free', 'pro', 'ultra') THEN
    RETURN 'free';
  END IF;

  -- Проверка истечения срока подписки
  IF v_until IS NOT NULL AND v_until < now() THEN
    RETURN 'free';
  END IF;

  RETURN v_tier;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. ВКЛЮЧЕНИЕ RLS НА ВСЕХ ПУБЛИЧНЫХ ТАБЛИЦАХ И УДАЛЕНИЕ ALLOW_ALL
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gratitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_audit ENABLE ROW LEVEL SECURITY;

-- Гарантированное удаление любых устаревших или dev политик
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (policyname ILIKE '%allow_all%' OR policyname ILIKE '%dev%' OR policyname ILIKE '%temp%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. ПОЛИТИКИ RLS ДЛЯ КАЖДОЙ СУЩНОСТИ
-- ----------------------------------------------------------------------------

-- [A] PROFILES
DROP POLICY IF EXISTS "profiles_select_auth" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_select_auth"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- [B] PROFILE_PRIVATE
DROP POLICY IF EXISTS "profile_private_select_own" ON public.profile_private;
DROP POLICY IF EXISTS "profile_private_insert_own" ON public.profile_private;
DROP POLICY IF EXISTS "profile_private_update_own" ON public.profile_private;
DROP POLICY IF EXISTS "profile_private_delete_own" ON public.profile_private;

CREATE POLICY "profile_private_select_own"
ON public.profile_private FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "profile_private_insert_own"
ON public.profile_private FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_private_update_own"
ON public.profile_private FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_private_delete_own"
ON public.profile_private FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- [C] DAYS
DROP POLICY IF EXISTS "days_select_policy" ON public.days;
DROP POLICY IF EXISTS "days_insert_own" ON public.days;
DROP POLICY IF EXISTS "days_update_own" ON public.days;
DROP POLICY IF EXISTS "days_delete_own" ON public.days;

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
);

CREATE POLICY "days_insert_own"
ON public.days FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "days_update_own"
ON public.days FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "days_delete_own"
ON public.days FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- [D] PRIDES
DROP POLICY IF EXISTS "prides_select_policy" ON public.prides;
DROP POLICY IF EXISTS "prides_insert_own" ON public.prides;
DROP POLICY IF EXISTS "prides_update_own" ON public.prides;
DROP POLICY IF EXISTS "prides_delete_own" ON public.prides;

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
);

CREATE POLICY "prides_insert_own"
ON public.prides FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prides_update_own"
ON public.prides FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prides_delete_own"
ON public.prides FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- [E] GRATITUDES
DROP POLICY IF EXISTS "gratitudes_select_policy" ON public.gratitudes;
DROP POLICY IF EXISTS "gratitudes_insert_own" ON public.gratitudes;
DROP POLICY IF EXISTS "gratitudes_update_own" ON public.gratitudes;
DROP POLICY IF EXISTS "gratitudes_delete_own" ON public.gratitudes;

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
);

CREATE POLICY "gratitudes_insert_own"
ON public.gratitudes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gratitudes_update_own"
ON public.gratitudes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gratitudes_delete_own"
ON public.gratitudes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- [F] DIRECT_MESSAGES
DROP POLICY IF EXISTS "direct_messages_select" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_insert" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_update" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_delete" ON public.direct_messages;

CREATE POLICY "direct_messages_select"
ON public.direct_messages FOR SELECT
TO authenticated
USING (auth.uid() = author_id OR auth.uid() = recipient_id);

CREATE POLICY "direct_messages_insert"
ON public.direct_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "direct_messages_update"
ON public.direct_messages FOR UPDATE
TO authenticated
USING (auth.uid() = author_id OR auth.uid() = recipient_id)
WITH CHECK (auth.uid() = author_id OR auth.uid() = recipient_id);

CREATE POLICY "direct_messages_delete"
ON public.direct_messages FOR DELETE
TO authenticated
USING (auth.uid() = author_id OR auth.uid() = recipient_id);

-- [G] STORIES
DROP POLICY IF EXISTS "stories_select" ON public.stories;
DROP POLICY IF EXISTS "stories_insert_own" ON public.stories;
DROP POLICY IF EXISTS "stories_update_own" ON public.stories;
DROP POLICY IF EXISTS "stories_delete_own" ON public.stories;

CREATE POLICY "stories_select"
ON public.stories FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    expires_at > now()
    AND (
      visibility = 'public'
      OR (
        visibility = 'friends'
        AND EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.status = 'accepted'
            AND (
              (f.user_id = auth.uid() AND f.friend_id = stories.user_id)
              OR
              (f.friend_id = auth.uid() AND f.user_id = stories.user_id)
            )
        )
      )
    )
  )
);

CREATE POLICY "stories_insert_own"
ON public.stories FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stories_update_own"
ON public.stories FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stories_delete_own"
ON public.stories FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- [H] COMMENTS
DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_update" ON public.comments;
DROP POLICY IF EXISTS "comments_delete" ON public.comments;

CREATE POLICY "comments_select"
ON public.comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "comments_insert"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments_update"
ON public.comments FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments_delete"
ON public.comments FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

-- [I] REACTIONS
DROP POLICY IF EXISTS "reactions_select" ON public.reactions;
DROP POLICY IF EXISTS "reactions_insert" ON public.reactions;
DROP POLICY IF EXISTS "reactions_update" ON public.reactions;
DROP POLICY IF EXISTS "reactions_delete" ON public.reactions;

CREATE POLICY "reactions_select"
ON public.reactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "reactions_insert"
ON public.reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_update"
ON public.reactions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_delete"
ON public.reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- [J] CALL_SESSIONS
DROP POLICY IF EXISTS "call_sessions_select" ON public.call_sessions;
DROP POLICY IF EXISTS "call_sessions_insert" ON public.call_sessions;
DROP POLICY IF EXISTS "call_sessions_update" ON public.call_sessions;
DROP POLICY IF EXISTS "call_sessions_delete" ON public.call_sessions;

CREATE POLICY "call_sessions_select"
ON public.call_sessions FOR SELECT
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "call_sessions_insert"
ON public.call_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "call_sessions_update"
ON public.call_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id)
WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "call_sessions_delete"
ON public.call_sessions FOR DELETE
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- [K] EVIDENCE_VAULT
DROP POLICY IF EXISTS "evidence_vault_owner" ON public.evidence_vault;

CREATE POLICY "evidence_vault_owner"
ON public.evidence_vault FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- [L] FRIENDSHIPS
DROP POLICY IF EXISTS "friendships_select" ON public.friendships;
DROP POLICY IF EXISTS "friendships_insert" ON public.friendships;
DROP POLICY IF EXISTS "friendships_update" ON public.friendships;
DROP POLICY IF EXISTS "friendships_delete" ON public.friendships;

CREATE POLICY "friendships_select"
ON public.friendships FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Заявка создаётся строго от своего имени и изначально в статусе 'pending'
CREATE POLICY "friendships_insert"
ON public.friendships FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Изменение строки дружбы: только участники диалога
CREATE POLICY "friendships_update"
ON public.friendships FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "friendships_delete"
ON public.friendships FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- [M] FOLLOWS
DROP POLICY IF EXISTS "follows_select" ON public.follows;
DROP POLICY IF EXISTS "follows_insert" ON public.follows;
DROP POLICY IF EXISTS "follows_delete" ON public.follows;

CREATE POLICY "follows_select"
ON public.follows FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "follows_insert"
ON public.follows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete"
ON public.follows FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- [N] SCHEDULED_MESSAGES
DROP POLICY IF EXISTS "scheduled_messages_owner" ON public.scheduled_messages;

CREATE POLICY "scheduled_messages_owner"
ON public.scheduled_messages FOR ALL
TO authenticated
USING (auth.uid() = author_id OR auth.uid() = sender_id)
WITH CHECK (auth.uid() = author_id OR auth.uid() = sender_id);

-- [O] TELEGRAM_LINKS
DROP POLICY IF EXISTS "telegram_links_owner" ON public.telegram_links;

CREATE POLICY "telegram_links_owner"
ON public.telegram_links FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- [P] AI_EVALUATIONS
DROP POLICY IF EXISTS "ai_evaluations_owner" ON public.ai_evaluations;

CREATE POLICY "ai_evaluations_owner"
ON public.ai_evaluations FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- [Q] SUBSCRIPTION_AUDIT (закрыта от клиентов, доступ только service_role)
DROP POLICY IF EXISTS "subscription_audit_deny_all" ON public.subscription_audit;

CREATE POLICY "subscription_audit_deny_all"
ON public.subscription_audit FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- ----------------------------------------------------------------------------
-- 6. ТРИГГЕР СИНХРОНИЗАЦИИ PROFILE_PRIVATE ПРИ ОБНОВЛЕНИИ PROFILES
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_sync_profile_private()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (NEW.telegram_chat_id IS NOT NULL) OR
     (NEW.reminder_times IS NOT NULL) OR
     (NEW.settings IS NOT NULL) OR
     (NEW.privacy IS NOT NULL) THEN

    INSERT INTO public.profile_private (user_id, telegram_chat_id, reminder_times, settings, privacy, updated_at)
    VALUES (
      NEW.id,
      NEW.telegram_chat_id,
      CASE WHEN NEW.reminder_times IS NULL THEN '["21:00"]'::jsonb ELSE to_jsonb(NEW.reminder_times) END,
      COALESCE(NEW.settings, '{}'::jsonb),
      COALESCE(NEW.privacy, '{}'::jsonb),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      telegram_chat_id = COALESCE(EXCLUDED.telegram_chat_id, public.profile_private.telegram_chat_id),
      reminder_times = COALESCE(EXCLUDED.reminder_times, public.profile_private.reminder_times),
      settings = COALESCE(EXCLUDED.settings, public.profile_private.settings),
      privacy = COALESCE(EXCLUDED.privacy, public.profile_private.privacy),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_private ON public.profiles;
CREATE TRIGGER trg_sync_profile_private
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_profile_private();

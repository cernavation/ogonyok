-- ============================================================================
-- supabase/migrations/140_settings_privacy.sql
-- ЭТАП 14: Серверные настройки приватности, блокировки и управление аккаунтом
-- ============================================================================

-- 1. Убеждаемся, что profile_private содержит дефолтный структурированный privacy
UPDATE public.profile_private
SET privacy = jsonb_build_object(
  'who_can_find', COALESCE(privacy->>'who_can_find', 'everyone'),
  'who_can_message', COALESCE(privacy->>'who_can_message', 'everyone'),
  'who_can_call', COALESCE(privacy->>'who_can_call', 'friends'),
  'who_can_see_online', COALESCE(privacy->>'who_can_see_online', 'everyone'),
  'default_day_visibility', COALESCE(privacy->>'default_day_visibility', 'public'),
  'show_streak_publicly', COALESCE((privacy->>'show_streak_publicly')::boolean, true),
  'show_badges_publicly', COALESCE((privacy->>'show_badges_publicly')::boolean, true),
  'show_difficulty_publicly', COALESCE((privacy->>'show_difficulty_publicly')::boolean, true),
  'searchable_by_username', COALESCE((privacy->>'searchable_by_username')::boolean, true),
  'hide_from_leaderboards', COALESCE((privacy->>'hide_from_leaderboards')::boolean, false)
)
WHERE privacy IS NULL OR privacy = '{}'::jsonb;

-- 2. RPC: Получение настроек приватности текущего пользователя
CREATE OR REPLACE FUNCTION public.get_privacy_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_privacy jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT privacy INTO v_privacy
  FROM public.profile_private
  WHERE user_id = v_uid;

  IF v_privacy IS NULL THEN
    v_privacy := jsonb_build_object(
      'who_can_find', 'everyone',
      'who_can_message', 'everyone',
      'who_can_call', 'friends',
      'who_can_see_online', 'everyone',
      'default_day_visibility', 'public',
      'show_streak_publicly', true,
      'show_badges_publicly', true,
      'show_difficulty_publicly', true,
      'searchable_by_username', true,
      'hide_from_leaderboards', false
    );
  END IF;

  RETURN v_privacy;
END;
$$;

-- 3. RPC: Обновление настроек приватности с применением к профилю
CREATE OR REPLACE FUNCTION public.update_privacy_settings(p_privacy jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_merged jsonb;
  v_searchable boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Сливаем с текущими настройками
  SELECT COALESCE(privacy, '{}'::jsonb) || p_privacy INTO v_merged
  FROM public.profile_private
  WHERE user_id = v_uid;

  IF v_merged IS NULL THEN
    v_merged := p_privacy;
  END IF;

  -- Обновляем profile_private
  INSERT INTO public.profile_private (user_id, privacy, updated_at)
  VALUES (v_uid, v_merged, now())
  ON CONFLICT (user_id) DO UPDATE
  SET privacy = v_merged,
      updated_at = now();

  -- Обновляем синхронизируемые флаги в profiles если нужно
  v_searchable := COALESCE((v_merged->>'searchable_by_username')::boolean, true);
  UPDATE public.profiles
  SET updated_at = now()
  WHERE id = v_uid;

  RETURN v_merged;
END;
$$;

-- 4. RPC: Список заблокированных пользователей с данными профиля
CREATE OR REPLACE FUNCTION public.get_blocked_users()
RETURNS TABLE (
  target_id uuid,
  username text,
  display_name text,
  avatar_url text,
  blocked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    b.blocked_id AS target_id,
    p.username,
    p.display_name,
    p.avatar_url,
    b.created_at AS blocked_at
  FROM public.blocks b
  JOIN public.profiles p ON p.id = b.blocked_id
  WHERE b.blocker_id = v_uid
  ORDER BY b.created_at DESC;
END;
$$;

-- 5. Расширение search_profiles с учётом who_can_find и searchable_by_username
CREATE OR REPLACE FUNCTION public.search_profiles(
  p_query text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  city text,
  streak integer,
  subscription_tier text,
  is_verified boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_clean text := trim(p_query);
  v_uid uuid := auth.uid();
BEGIN
  IF v_clean = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.city,
    COALESCE(p.streak_count, p.streak, 0) AS streak,
    COALESCE(p.subscription_tier, 'free') AS subscription_tier,
    COALESCE(p.verified, false) AS is_verified
  FROM public.profiles p
  LEFT JOIN public.profile_private pp ON pp.user_id = p.id
  WHERE (
    p.username ILIKE '%' || v_clean || '%'
    OR p.display_name ILIKE '%' || v_clean || '%'
    OR p.city ILIKE '%' || v_clean || '%'
  )
  -- Исключаем самого себя
  AND (v_uid IS NULL OR p.id <> v_uid)
  -- Учитываем настройку searchable_by_username и who_can_find
  AND (
    pp.privacy IS NULL 
    OR (
      COALESCE((pp.privacy->>'searchable_by_username')::boolean, true) = true
      AND COALESCE(pp.privacy->>'who_can_find', 'everyone') <> 'nobody'
    )
  )
  -- Исключаем тех, кто заблокировал меня или кого заблокировал я
  AND NOT EXISTS (
    SELECT 1 FROM public.blocks b 
    WHERE (b.blocker_id = v_uid AND b.blocked_id = p.id)
       OR (b.blocker_id = p.id AND b.blocked_id = v_uid)
  )
  ORDER BY 
    CASE WHEN lower(p.username) = lower(v_clean) THEN 1
         WHEN lower(p.username) LIKE lower(v_clean) || '%' THEN 2
         WHEN lower(p.display_name) LIKE lower(v_clean) || '%' THEN 3
         ELSE 4 END,
    COALESCE(p.streak_count, 0) DESC
  LIMIT p_limit;
END;
$$;

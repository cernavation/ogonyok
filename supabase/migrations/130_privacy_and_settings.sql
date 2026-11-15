-- ============================================================================
-- МИГРАЦИЯ 130: ПРИВАТНОСТЬ И СЕРВЕРНОЕ ПРИМЕНЕНИЕ НАСТРОЕК (ШАГ 16)
--
-- Хранение и принудительное применение политик приватности:
-- 1. who_can_find (everyone / friends / nobody) — поиск пользователей
-- 2. who_can_message (everyone / friends / nobody) — отправка сообщений
-- 3. who_can_call (everyone / friends / nobody) — входящие звонки
-- 4. who_can_see_online (everyone / friends / nobody) — статус «в сети»
-- 5. default_day_visibility (private / friends / public) — видимость записей
-- 6. RPC get_blocked_profiles — список заблокированных пользователей
-- ============================================================================

-- 1. Добавление колонок в public.profiles (с проверкой на существование)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS who_can_find text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS who_can_message text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS who_can_call text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS who_can_see_online text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS default_day_visibility text NOT NULL DEFAULT 'private';

-- 2. RPC: Получение списка заблокированных профилей с их метаданными
CREATE OR REPLACE FUNCTION public.get_blocked_profiles(
  p_viewer_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  blocked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := coalesce(p_viewer_id, auth.uid());
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
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

-- 3. Обновление RPC: search_profiles_v2 с учётом who_can_find и searchableByUsername
CREATE OR REPLACE FUNCTION public.search_profiles_v2(
  search_query text,
  page_limit integer DEFAULT 20,
  page_offset integer DEFAULT 0,
  viewer_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  city text,
  streak integer,
  verified boolean,
  is_founder boolean,
  difficulty_level integer,
  friendship_status text,
  is_requester boolean,
  is_following boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_query text;
  spaceless_query text;
BEGIN
  cleaned_query := lower(trim(regexp_replace(coalesce(search_query, ''), '^@', '')));
  spaceless_query := lower(regexp_replace(cleaned_query, '\s+', '', 'g'));

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.city,
    coalesce(p.streak_count, p.streak, 0) AS streak,
    coalesce(p.verified, false) AS verified,
    coalesce(p.is_founder, false) AS is_founder,
    coalesce(p.level, 1) AS difficulty_level,
    coalesce(
      (
        SELECT
          CASE
            WHEN f.status = 'accepted' THEN 'accepted'
            WHEN f.status = 'pending' AND f.user_id = viewer_id THEN 'outgoing_pending'
            WHEN f.status = 'pending' AND f.friend_id = viewer_id THEN 'incoming_pending'
            ELSE 'none'
          END
        FROM public.friendships f
        WHERE (f.user_id = viewer_id AND f.friend_id = p.id)
           OR (f.friend_id = viewer_id AND f.user_id = p.id)
        LIMIT 1
      ),
      'none'
    ) AS friendship_status,
    coalesce(
      (
        SELECT f.user_id = viewer_id
        FROM public.friendships f
        WHERE (f.user_id = viewer_id AND f.friend_id = p.id)
           OR (f.friend_id = viewer_id AND f.user_id = p.id)
        LIMIT 1
      ),
      false
    ) AS is_requester,
    coalesce(
      (
        SELECT true
        FROM public.follows fl
        WHERE fl.follower_id = viewer_id AND fl.following_id = p.id
        LIMIT 1
      ),
      false
    ) AS is_following
  FROM public.profiles p
  WHERE
    (viewer_id IS NULL OR p.id <> viewer_id)
    AND (
      viewer_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = viewer_id AND b.blocked_id = p.id)
           OR (b.blocker_id = p.id AND b.blocked_id = viewer_id)
      )
    )
    -- Проверка политики who_can_find
    AND (
      (
        coalesce(p.who_can_find, p.privacy->>'whoCanFind', 'everyone') = 'everyone'
        AND coalesce((p.privacy->>'searchableByUsername')::boolean, true) = true
      )
      OR (
        coalesce(p.who_can_find, p.privacy->>'whoCanFind', 'everyone') = 'friends'
        AND viewer_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.status = 'accepted'
            AND ((f.user_id = viewer_id AND f.friend_id = p.id) OR (f.user_id = p.id AND f.friend_id = viewer_id))
        )
      )
    )
    AND (
      cleaned_query = ''
      OR lower(p.username) LIKE '%' || cleaned_query || '%'
      OR lower(p.display_name) LIKE '%' || cleaned_query || '%'
      OR (spaceless_query <> '' AND lower(p.username) LIKE '%' || spaceless_query || '%')
      OR (spaceless_query <> '' AND lower(p.display_name) LIKE '%' || spaceless_query || '%')
    )
  ORDER BY
    CASE
      WHEN lower(p.username) = cleaned_query THEN 1
      WHEN lower(p.username) = spaceless_query THEN 2
      WHEN lower(p.display_name) = cleaned_query THEN 3
      WHEN lower(p.username) LIKE cleaned_query || '%' THEN 4
      WHEN lower(p.display_name) LIKE cleaned_query || '%' THEN 5
      ELSE 6
    END,
    coalesce(p.streak_count, p.streak, 0) DESC,
    p.updated_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- 4. Обновление политики direct_messages_insert_sender с учётом who_can_message
DROP POLICY IF EXISTS "direct_messages_insert_sender" ON public.direct_messages;
CREATE POLICY "direct_messages_insert_sender"
ON public.direct_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND NOT EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = auth.uid() AND b.blocked_id = direct_messages.receiver_id)
       OR (b.blocker_id = direct_messages.receiver_id AND b.blocked_id = auth.uid())
  )
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = direct_messages.receiver_id
        AND (
          coalesce(p.who_can_message, p.privacy->>'whoCanMessage', p.privacy->>'chatPolicy', 'everyone') = 'everyone'
          OR (
            coalesce(p.who_can_message, p.privacy->>'whoCanMessage', p.privacy->>'chatPolicy', 'everyone') = 'friends'
            AND EXISTS (
              SELECT 1 FROM public.friendships f
              WHERE f.status = 'accepted'
                AND ((f.user_id = auth.uid() AND f.friend_id = direct_messages.receiver_id)
                  OR (f.user_id = direct_messages.receiver_id AND f.friend_id = auth.uid()))
            )
          )
        )
    )
  )
);

-- 5. Обновление initiate_call с проверкой who_can_call
CREATE OR REPLACE FUNCTION public.initiate_call(
  p_caller_id uuid,
  p_receiver_id uuid,
  p_type text,
  p_room_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_blocked boolean := false;
  v_is_busy boolean := false;
  v_caller_tier text;
  v_call_policy text;
BEGIN
  -- Проверка взаимных блокировок
  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = p_receiver_id AND blocked_id = p_caller_id)
       OR (blocker_id = p_caller_id AND blocked_id = p_receiver_id)
  ) THEN
    v_is_blocked := true;
  END IF;

  IF v_is_blocked THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'message', 'Пользователь ограничил входящие вызовы'
    );
  END IF;

  -- Проверка политики входящих звонков получателя (who_can_call)
  SELECT coalesce(who_can_call, privacy->>'whoCanCall', 'everyone')
  INTO v_call_policy
  FROM public.profiles
  WHERE id = p_receiver_id;

  IF v_call_policy = 'nobody' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'calls_disabled',
      'message', 'Пользователь отключил входящие звонки'
    );
  ELSIF v_call_policy = 'friends' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.user_id = p_caller_id AND f.friend_id = p_receiver_id)
          OR (f.user_id = p_receiver_id AND f.friend_id = p_caller_id))
    ) THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'privacy_restricted',
        'message', 'Пользователь принимает звонки только от друзей'
      );
    END IF;
  END IF;

  -- Проверка тарифа для видеозвонков
  IF p_type = 'video' THEN
    SELECT coalesce(subscription_tier, 'free')
    INTO v_caller_tier
    FROM public.profiles
    WHERE id = p_caller_id;

    IF v_caller_tier NOT IN ('pro', 'ultra') THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'tier_required',
        'message', 'Видеозвонки доступны только на тарифах Премиум и Ultra'
      );
    END IF;
  END IF;

  -- Проверка занятости собеседника
  IF EXISTS (
    SELECT 1 FROM public.call_sessions
    WHERE (caller_id = p_receiver_id OR receiver_id = p_receiver_id)
      AND status IN ('connected', 'ringing')
      AND updated_at > now() - interval '60 seconds'
  ) THEN
    v_is_busy := true;
  END IF;

  IF v_is_busy THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'busy',
      'message', 'Линия занята'
    );
  END IF;

  -- Создание сессии звонка
  INSERT INTO public.call_sessions (
    room_id,
    caller_id,
    receiver_id,
    type,
    status
  )
  VALUES (
    p_room_id,
    p_caller_id,
    p_receiver_id,
    p_type,
    'ringing'
  )
  ON CONFLICT (room_id) DO UPDATE
  SET status = 'ringing',
      updated_at = now();

  RETURN jsonb_build_object(
    'allowed', true,
    'session_id', p_room_id
  );
END;
$$;

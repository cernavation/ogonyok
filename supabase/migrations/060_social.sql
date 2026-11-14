-- ============================================================================
-- ОГОНЁК · МИГРАЦИЯ 060_social.sql: СОЦИАЛЬНЫЙ ГРАФ, ДРУЗЬЯ, БЛОКИРОВКИ И ПОИСК
-- ============================================================================
-- Идемпотентная миграция:
-- 1. Таблицы public.blocks и public.reports с RLS.
-- 2. Индексы и проверки таблицы public.friendships.
-- 3. Добавление public.friendships в supabase_realtime публикацию.
-- 4. Обновление политик direct_messages с защитой от заблокированных пользователей.
-- 5. RPC search_profiles_v2: серверный поиск с пагинацией, мульти-словами,
--    учетом блокировок и статусов дружбы.
-- 6. RPC функции управления дружбой: request_friendship, respond_friendship,
--    block_profile, unblock_profile, report_profile, get_friend_feed_v1.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ТАБЛИЦА БЛОКИРОВОК (blocks)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_blocks_pair UNIQUE (blocker_id, blocked_id),
  CONSTRAINT chk_blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks(blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocks_select_own" ON public.blocks;
CREATE POLICY "blocks_select_own"
ON public.blocks FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "blocks_insert_own" ON public.blocks;
CREATE POLICY "blocks_insert_own"
ON public.blocks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id AND blocker_id <> blocked_id);

DROP POLICY IF EXISTS "blocks_delete_own" ON public.blocks;
CREATE POLICY "blocks_delete_own"
ON public.blocks FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

-- ----------------------------------------------------------------------------
-- 2. ТАБЛИЦА ЖАЛОБ (reports)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(target_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_own"
ON public.reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- ----------------------------------------------------------------------------
-- 3. ПРОВЕРКА И ДОПОЛНЕНИЕ FRIENDSHIPS
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_friendships_no_self'
  ) THEN
    ALTER TABLE public.friendships
    ADD CONSTRAINT chk_friendships_no_self CHECK (user_id <> friend_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON public.friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON public.friendships(friend_id, status);

-- Включение таблицы friendships в публикацию Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'friendships'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. ОБНОВЛЕНИЕ DIRECT_MESSAGES С УЧЁТОМ БЛОКИРОВОК
-- ----------------------------------------------------------------------------
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
);

DROP POLICY IF EXISTS "direct_messages_select_participants" ON public.direct_messages;
CREATE POLICY "direct_messages_select_participants"
ON public.direct_messages FOR SELECT
TO authenticated
USING (
  (auth.uid() = sender_id OR auth.uid() = receiver_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = auth.uid() AND b.blocked_id = direct_messages.receiver_id)
       OR (b.blocker_id = auth.uid() AND b.blocked_id = direct_messages.sender_id)
  )
);

-- ----------------------------------------------------------------------------
-- 5. RPC: СЕРВЕРНЫЙ ПОИСК ПОЛЬЗОВАТЕЛЕЙ (search_profiles_v2)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 6. RPC: ОТПРАВКА ЗАЯВКИ В ДРУЗЬЯ (request_friendship)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_friendship(
  target_user_id uuid,
  p_viewer_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_row record;
  v_uid uuid;
BEGIN
  v_uid := coalesce(p_viewer_id, auth.uid());
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  IF v_uid = target_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot friend yourself');
  END IF;

  -- Проверка блокировки
  IF EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = v_uid AND b.blocked_id = target_user_id)
       OR (b.blocker_id = target_user_id AND b.blocked_id = v_uid)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User is blocked');
  END IF;

  -- Проверка существующей связи
  SELECT * INTO existing_row
  FROM public.friendships
  WHERE (user_id = v_uid AND friend_id = target_user_id)
     OR (user_id = target_user_id AND friend_id = v_uid)
  LIMIT 1;

  IF existing_row.id IS NOT NULL THEN
    IF existing_row.status = 'accepted' THEN
      RETURN jsonb_build_object('ok', true, 'status', 'accepted', 'message', 'Already friends');
    ELSIF existing_row.status = 'pending' THEN
      IF existing_row.user_id = target_user_id THEN
        -- Встречная заявка -> автоматическое подтверждение дружбы!
        UPDATE public.friendships
        SET status = 'accepted', updated_at = now()
        WHERE id = existing_row.id;

        -- Взаимные подписки
        INSERT INTO public.follows (follower_id, following_id)
        VALUES (v_uid, target_user_id), (target_user_id, v_uid)
        ON CONFLICT (follower_id, following_id) DO NOTHING;

        RETURN jsonb_build_object('ok', true, 'status', 'accepted', 'message', 'Friendship accepted');
      ELSE
        RETURN jsonb_build_object('ok', true, 'status', 'outgoing_pending', 'message', 'Request already pending');
      END IF;
    ELSE
      -- Обновление отклонённой заявки
      UPDATE public.friendships
      SET user_id = v_uid, friend_id = target_user_id, requester_id = v_uid, addressee_id = target_user_id,
          status = 'pending', updated_at = now()
      WHERE id = existing_row.id;

      -- Автоматическая подписка
      INSERT INTO public.follows (follower_id, following_id)
      VALUES (v_uid, target_user_id)
      ON CONFLICT (follower_id, following_id) DO NOTHING;

      RETURN jsonb_build_object('ok', true, 'status', 'outgoing_pending', 'message', 'Request sent');
    END IF;
  ELSE
    -- Создание новой заявки
    INSERT INTO public.friendships (user_id, friend_id, requester_id, addressee_id, status)
    VALUES (v_uid, target_user_id, v_uid, target_user_id, 'pending');

    -- Автоматическая подписка
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (v_uid, target_user_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;

    RETURN jsonb_build_object('ok', true, 'status', 'outgoing_pending', 'message', 'Request sent');
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. RPC: ОТВЕТ НА ЗАЯВКУ / УПРАВЛЕНИЕ ДРУЖБОЙ (respond_friendship)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_friendship(
  target_user_id uuid,
  action_type text, -- 'accept', 'decline', 'cancel', 'remove'
  p_viewer_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  f_row record;
BEGIN
  v_uid := coalesce(p_viewer_id, auth.uid());
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO f_row
  FROM public.friendships
  WHERE (user_id = v_uid AND friend_id = target_user_id)
     OR (user_id = target_user_id AND friend_id = v_uid)
  LIMIT 1;

  IF f_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Friendship relation not found');
  END IF;

  IF action_type = 'accept' THEN
    -- Принять входящую заявку
    UPDATE public.friendships
    SET status = 'accepted', updated_at = now()
    WHERE id = f_row.id;

    -- Взаимная подписка
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (v_uid, target_user_id), (target_user_id, v_uid)
    ON CONFLICT (follower_id, following_id) DO NOTHING;

    RETURN jsonb_build_object('ok', true, 'status', 'accepted');

  ELSIF action_type = 'decline' THEN
    -- Отклонить заявку
    UPDATE public.friendships
    SET status = 'declined', updated_at = now()
    WHERE id = f_row.id;

    RETURN jsonb_build_object('ok', true, 'status', 'none');

  ELSIF action_type = 'cancel' THEN
    -- Отменить свою исходящую заявку
    DELETE FROM public.friendships WHERE id = f_row.id;
    RETURN jsonb_build_object('ok', true, 'status', 'none');

  ELSIF action_type = 'remove' THEN
    -- Удалить из друзей
    DELETE FROM public.friendships WHERE id = f_row.id;
    RETURN jsonb_build_object('ok', true, 'status', 'none');

  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid action');
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. RPC: БЛОКИРОВКА И РАЗБЛОКИРОВКА (block_profile / unblock_profile)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_profile(
  target_user_id uuid,
  p_viewer_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := coalesce(p_viewer_id, auth.uid());
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  IF v_uid = target_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot block yourself');
  END IF;

  -- Создание записи блокировки
  INSERT INTO public.blocks (blocker_id, blocked_id)
  VALUES (v_uid, target_user_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  -- Разрыв дружбы
  DELETE FROM public.friendships
  WHERE (user_id = v_uid AND friend_id = target_user_id)
     OR (user_id = target_user_id AND friend_id = v_uid);

  -- Разрыв подписок
  DELETE FROM public.follows
  WHERE (follower_id = v_uid AND following_id = target_user_id)
     OR (follower_id = target_user_id AND following_id = v_uid);

  RETURN jsonb_build_object('ok', true, 'blocked', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_profile(
  target_user_id uuid,
  p_viewer_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := coalesce(p_viewer_id, auth.uid());
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  DELETE FROM public.blocks
  WHERE blocker_id = v_uid AND blocked_id = target_user_id;

  RETURN jsonb_build_object('ok', true, 'blocked', false);
END;
$$;

-- ----------------------------------------------------------------------------
-- 9. RPC: ЖАЛОБА НА ПРОФИЛЬ (report_profile)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_profile(
  target_user_id uuid,
  p_reason text,
  p_viewer_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := coalesce(p_viewer_id, auth.uid());
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  INSERT INTO public.reports (reporter_id, target_id, reason)
  VALUES (v_uid, target_user_id, coalesce(p_reason, ''));

  RETURN jsonb_build_object('ok', true, 'reported', true);
END;
$$;

-- ----------------------------------------------------------------------------
-- 10. RPC: ЛЕНТА ДРУЗЕЙ (get_friend_feed_v1)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_friend_feed_v1(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_viewer_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  day_id integer,
  day_uuid uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  verified boolean,
  streak integer,
  day_date date,
  title text,
  visibility text,
  created_at timestamptz,
  prides jsonb,
  gratitudes jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := coalesce(p_viewer_id, auth.uid());

  RETURN QUERY
  SELECT
    d.id AS day_id,
    d.id AS day_uuid,
    d.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    coalesce(p.verified, false) AS verified,
    coalesce(p.streak_count, p.streak, 0) AS streak,
    d.day_date,
    coalesce(d.title, '') AS title,
    d.visibility,
    d.created_at,
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pr.id,
            'text', pr.text,
            'scale', pr.scale,
            'category', pr.category,
            'visibility', pr.visibility
          ) ORDER BY pr.order_index ASC
        )
        FROM public.prides pr
        WHERE pr.day_id = d.id
      ),
      '[]'::jsonb
    ) AS prides,
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', gr.id,
            'text', gr.text,
            'category', gr.category,
            'visibility', gr.visibility
          ) ORDER BY gr.order_index ASC
        )
        FROM public.gratitudes gr
        WHERE gr.day_id = d.id
      ),
      '[]'::jsonb
    ) AS gratitudes
  FROM public.days d
  JOIN public.profiles p ON p.id = d.user_id
  WHERE
    -- Условие: автор должен быть принятым другом viewer_id
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = v_uid AND f.friend_id = d.user_id)
          OR
          (f.friend_id = v_uid AND f.user_id = d.user_id)
        )
    )
    -- Не заблокирован
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = v_uid AND b.blocked_id = d.user_id)
         OR (b.blocker_id = d.user_id AND b.blocked_id = v_uid)
    )
    -- Видимость: только публичные или для друзей
    AND d.visibility IN ('public', 'friends')
  ORDER BY d.day_date DESC, d.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

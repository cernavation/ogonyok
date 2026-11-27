-- ============================================================================
-- МИГРАЦИЯ 133: Официальный системный чат Priday + Расширенная приватность +
-- Строго взаимно-дружественные групповые чаты (ЭТАП 2 ИЗ 2)
-- ============================================================================

-- 1. Новые колонки приватности в public.profiles (идемпотентно)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_hidden_from_search boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_messages_from text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS allow_group_invites_from text NOT NULL DEFAULT 'friends';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_allow_messages_from_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_allow_messages_from_check
      CHECK (allow_messages_from IN ('everyone', 'friends', 'nobody'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_allow_group_invites_from_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_allow_group_invites_from_check
      CHECK (allow_group_invites_from IN ('friends', 'nobody'));
  END IF;
END $$;

-- Синхронизируем новые поля со старыми колонками и JSONB privacy для существующих профилей
UPDATE public.profiles
SET
  is_hidden_from_search = COALESCE(
    (privacy->>'isHiddenFromSearch')::boolean,
    who_can_find = 'nobody',
    is_anonymous,
    false
  ),
  allow_messages_from = CASE
    WHEN COALESCE(privacy->>'allowMessagesFrom', who_can_message, privacy->>'whoCanMessage', 'everyone') IN ('everyone', 'friends', 'nobody')
      THEN COALESCE(privacy->>'allowMessagesFrom', who_can_message, privacy->>'whoCanMessage', 'everyone')
    ELSE 'everyone'
  END,
  allow_group_invites_from = CASE
    WHEN COALESCE(privacy->>'allowGroupInvitesFrom', 'friends') IN ('friends', 'nobody')
      THEN COALESCE(privacy->>'allowGroupInvitesFrom', 'friends')
    ELSE 'friends'
  END;

CREATE INDEX IF NOT EXISTS idx_profiles_hidden_search
  ON public.profiles(is_hidden_from_search)
  WHERE is_hidden_from_search = true;

-- 2. Таблица сообщений официального системного чата Priday (priday_messages)
CREATE TABLE IF NOT EXISTS public.priday_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('priday', 'user')),
  kind text NOT NULL DEFAULT 'welcome' CHECK (kind IN ('welcome', 'canned', 'support_user', 'support_reply', 'follow', 'mutual')),
  body text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_priday_messages_user_created
  ON public.priday_messages(user_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_priday_messages_unread
  ON public.priday_messages(user_id, is_read)
  WHERE is_read = false;

ALTER TABLE public.priday_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "priday_messages_select_own" ON public.priday_messages;
CREATE POLICY "priday_messages_select_own" ON public.priday_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "priday_messages_insert_own" ON public.priday_messages;
CREATE POLICY "priday_messages_insert_own" ON public.priday_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "priday_messages_update_own" ON public.priday_messages;
CREATE POLICY "priday_messages_update_own" ON public.priday_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Включаем Realtime для priday_messages (идемпотентно)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'priday_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.priday_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Триггер: каждому новому пользователю автоматически создаётся приветствие в системном чате Priday
CREATE OR REPLACE FUNCTION public.seed_priday_welcome_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.priday_messages (user_id, sender, kind, body, meta, is_read)
  VALUES (
    NEW.id,
    'priday',
    'welcome',
    'Привет! Это официальный чат Priday 🔥 Здесь появляются важные новости, уведомления о новых подписчиках и друзьях, а ещё я помогу разобраться с любыми вопросами о приложении.',
    '{"kind":"welcome"}'::jsonb,
    true
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_priday_welcome_on_profile ON public.profiles;
CREATE TRIGGER trg_seed_priday_welcome_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_priday_welcome_message();

-- Бэкфилл приветствия для уже существующих пользователей без приветственного сообщения
INSERT INTO public.priday_messages (user_id, sender, kind, body, meta, is_read)
SELECT
  p.id,
  'priday',
  'welcome',
  'Привет! Это официальный чат Priday 🔥 Здесь появляются важные новости, уведомления о новых подписчиках и друзьях, а ещё я помогу разобраться с любыми вопросами о приложении.',
  '{"kind":"welcome"}'::jsonb,
  true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.priday_messages pm
  WHERE pm.user_id = p.id AND pm.kind = 'welcome'
);

-- 3. Обновляем RPC search_profiles_v2: исключаем «Скрытую личность» (is_hidden_from_search) и поддерживаем follows
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
    coalesce(p.avatar_image, p.avatar_url) AS avatar_url,
    p.bio,
    p.city,
    coalesce(p.streak_count, p.streak, 0) AS streak,
    coalesce(p.verified, false) AS verified,
    coalesce(p.is_founder, false) AS is_founder,
    coalesce(p.level, p.difficulty_level, 1) AS difficulty_level,
    CASE
      WHEN viewer_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.follows f1 WHERE f1.follower_id = viewer_id AND f1.following_id = p.id)
        AND EXISTS (SELECT 1 FROM public.follows f2 WHERE f2.follower_id = p.id AND f2.following_id = viewer_id)
      THEN 'accepted'
      ELSE coalesce(
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
      )
    END AS friendship_status,
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
    AND coalesce(p.is_anonymous, false) = false
    AND coalesce((p.privacy->>'is_anonymous')::boolean, false) = false
    AND coalesce(p.is_hidden_from_search, false) = false
    AND coalesce((p.privacy->>'isHiddenFromSearch')::boolean, false) = false
    AND (
      viewer_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = viewer_id AND b.blocked_id = p.id)
           OR (b.blocker_id = p.id AND b.blocked_id = viewer_id)
      )
    )
    AND (
      (
        coalesce(p.who_can_find, p.privacy->>'whoCanFind', 'everyone') = 'everyone'
        AND coalesce((p.privacy->>'searchableByUsername')::boolean, true) = true
      )
      OR (
        coalesce(p.who_can_find, p.privacy->>'whoCanFind', 'everyone') = 'friends'
        AND viewer_id IS NOT NULL
        AND (
          (
            EXISTS (SELECT 1 FROM public.follows f1 WHERE f1.follower_id = viewer_id AND f1.following_id = p.id)
            AND EXISTS (SELECT 1 FROM public.follows f2 WHERE f2.follower_id = p.id AND f2.following_id = viewer_id)
          )
          OR EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND ((f.user_id = viewer_id AND f.friend_id = p.id) OR (f.user_id = p.id AND f.friend_id = viewer_id))
          )
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

-- 4. Обновляем RLS на direct_messages: уважаем allow_messages_from и взаимную дружбу по follows
DROP POLICY IF EXISTS "direct_messages_insert" ON public.direct_messages;
CREATE POLICY "direct_messages_insert" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND length(coalesce(body, '')) <= 2048
    AND (
      recipient_id IS NULL
      OR (
        NOT EXISTS (
          SELECT 1 FROM public.blocks b
          WHERE (b.blocker_id = auth.uid() AND b.blocked_id = direct_messages.recipient_id)
             OR (b.blocker_id = direct_messages.recipient_id AND b.blocked_id = auth.uid())
        )
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = direct_messages.recipient_id
            AND (
              coalesce(p.allow_messages_from, p.who_can_message, p.privacy->>'allowMessagesFrom', p.privacy->>'whoCanMessage', 'everyone') = 'everyone'
              OR (
                coalesce(p.allow_messages_from, p.who_can_message, p.privacy->>'allowMessagesFrom', p.privacy->>'whoCanMessage', 'everyone') = 'friends'
                AND (
                  (
                    EXISTS (SELECT 1 FROM public.follows f1 WHERE f1.follower_id = auth.uid() AND f1.following_id = direct_messages.recipient_id)
                    AND EXISTS (SELECT 1 FROM public.follows f2 WHERE f2.follower_id = direct_messages.recipient_id AND f2.following_id = auth.uid())
                  )
                  OR EXISTS (
                    SELECT 1 FROM public.friendships f
                    WHERE f.status = 'accepted'
                      AND ((f.user_id = auth.uid() AND f.friend_id = direct_messages.recipient_id)
                        OR (f.user_id = direct_messages.recipient_id AND f.friend_id = auth.uid()))
                  )
                )
              )
            )
        )
      )
    )
    AND (
      recipient_id IS NOT NULL
      OR (
        (thread_key LIKE 'group:%' OR thread_key LIKE 'group-%')
        AND EXISTS (
          SELECT 1 FROM public.chat_group_members m
          WHERE (m.group_id::text = regexp_replace(thread_key, '^group:(group-)?', '')
                 OR m.group_id::text = regexp_replace(thread_key, '^group-', ''))
            AND m.user_id = auth.uid()
        )
      )
    )
  );

-- 5. Обновляем RLS на chat_group_members: добавлять в группы можно ТОЛЬКО взаимных друзей, которые не запретили приглашения
DROP POLICY IF EXISTS "chat_group_members_insert" ON public.chat_group_members;
CREATE POLICY "chat_group_members_insert" ON public.chat_group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (
      (
        EXISTS (
          SELECT 1 FROM public.chat_groups g
          WHERE g.id = chat_group_members.group_id AND g.creator_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.chat_group_members m
          WHERE m.group_id = chat_group_members.group_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
        )
      )
      AND (
        EXISTS (SELECT 1 FROM public.follows f1 WHERE f1.follower_id = auth.uid() AND f1.following_id = chat_group_members.user_id)
        AND EXISTS (SELECT 1 FROM public.follows f2 WHERE f2.follower_id = chat_group_members.user_id AND f2.following_id = auth.uid())
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = chat_group_members.user_id
          AND coalesce(p.allow_group_invites_from, p.privacy->>'allowGroupInvitesFrom', 'friends') <> 'nobody'
      )
    )
  );

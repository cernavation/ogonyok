-- ============================================================================
-- 135_privacy_feeds_and_profile_cards.sql
-- Идемпотентная миграция:
-- 1) Временные метки прочтения лент «Друзья» и «Подписки» в public.profiles
-- 2) Поля аудитории (group_id, target_group_ids), AI-метаданные и индексы на days/prides/gratitudes
-- 3) RLS-функции и политики строгого доступа (mutual follows/friendships + группы, запрет утечки private)
-- 4) Исправление RPC get_friend_feed_v1 (без несуществующих category/order_index) + get_following_feed_v1
-- 5) Безопасное включение Realtime на public.days
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ВРЕМЯ ПОСЛЕДНЕГО ПРОСМОТРА ЛЕНТ В PROFILES (БЕЙДЖИ НЕПРОЧИТАННЫХ)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_viewed_friends_feed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_viewed_following_feed_at timestamptz;

-- ----------------------------------------------------------------------------
-- 2. КОЛОНКИ, ОГРАНИЧЕНИЯ И ИНДЕКСЫ ДЛЯ DAYS / PRIDES / GRATITUDES
-- ----------------------------------------------------------------------------
ALTER TABLE public.days
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.chat_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_group_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_score numeric,
  ADD COLUMN IF NOT EXISTS ai_verdict text;

ALTER TABLE public.prides
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.chat_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_group_ids uuid[] DEFAULT '{}';

ALTER TABLE public.gratitudes
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.chat_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_group_ids uuid[] DEFAULT '{}';

-- Нормализуем старые значения visibility при наличии перед обновлением CHECK-ограничений
UPDATE public.days SET visibility = 'public' WHERE visibility IS NULL OR visibility NOT IN ('private', 'friends', 'public', 'group');
UPDATE public.prides SET visibility = 'public' WHERE visibility IS NULL OR visibility NOT IN ('private', 'friends', 'public', 'group');
UPDATE public.gratitudes SET visibility = 'public' WHERE visibility IS NULL OR visibility NOT IN ('private', 'friends', 'public', 'group');

ALTER TABLE public.days DROP CONSTRAINT IF EXISTS days_visibility_check;
ALTER TABLE public.days DROP CONSTRAINT IF EXISTS chk_days_visibility;
ALTER TABLE public.days ADD CONSTRAINT chk_days_visibility
  CHECK (visibility IN ('private', 'friends', 'public', 'group'));

ALTER TABLE public.prides DROP CONSTRAINT IF EXISTS prides_visibility_check;
ALTER TABLE public.prides DROP CONSTRAINT IF EXISTS chk_prides_visibility;
ALTER TABLE public.prides ADD CONSTRAINT chk_prides_visibility
  CHECK (visibility IN ('private', 'friends', 'public', 'group'));

ALTER TABLE public.gratitudes DROP CONSTRAINT IF EXISTS gratitudes_visibility_check;
ALTER TABLE public.gratitudes DROP CONSTRAINT IF EXISTS chk_gratitudes_visibility;
ALTER TABLE public.gratitudes ADD CONSTRAINT chk_gratitudes_visibility
  CHECK (visibility IN ('private', 'friends', 'public', 'group'));

-- Индексы для быстрых лент, хронологии профиля и групповой фильтрации
CREATE INDEX IF NOT EXISTS idx_days_visibility_created
  ON public.days(visibility, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_days_user_created
  ON public.days(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_days_group_id
  ON public.days(group_id) WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prides_group_id
  ON public.prides(group_id) WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gratitudes_group_id
  ON public.gratitudes(group_id) WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prides_user_day_client
  ON public.prides(user_id, day_client_id, position);

CREATE INDEX IF NOT EXISTS idx_gratitudes_user_day_client
  ON public.gratitudes(user_id, day_client_id, position);

-- ----------------------------------------------------------------------------
-- 3. ХЕЛПЕРЫ ДОСТУПА (ВЗАИМНЫЕ ДРУЗЬЯ, УЧАСТНИКИ ГРУПП, БЛОКИРОВКИ)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.are_mutual_friends(a uuid, b uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF a IS NULL OR b IS NULL OR a = b THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocks bl
    WHERE (bl.blocker_id = a AND bl.blocked_id = b)
       OR (bl.blocker_id = b AND bl.blocked_id = a)
  ) THEN
    RETURN false;
  END IF;

  -- Взаимная подписка в follows (SSOT)
  IF EXISTS (
    SELECT 1 FROM public.follows f1
    WHERE f1.follower_id = a AND f1.following_id = b
  ) AND EXISTS (
    SELECT 1 FROM public.follows f2
    WHERE f2.follower_id = b AND f2.following_id = a
  ) THEN
    RETURN true;
  END IF;

  -- Запасной контур через таблицу friendships (accepted)
  IF EXISTS (
    SELECT 1 FROM public.friendships fr
    WHERE fr.status = 'accepted'
      AND (
        (fr.user_id = a AND fr.friend_id = b)
        OR (fr.friend_id = a AND fr.user_id = b)
      )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(u uuid, gid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF u IS NULL OR gid IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.chat_groups cg
    WHERE cg.id = gid AND cg.creator_id = u
  ) OR EXISTS (
    SELECT 1 FROM public.chat_group_members cgm
    WHERE cgm.group_id = gid AND cgm.user_id = u
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_entry(
  viewer_id uuid,
  owner_id uuid,
  vis text,
  gid uuid,
  target_gids text[]
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vis text := COALESCE(vis, 'public');
BEGIN
  IF viewer_id IS NOT NULL AND viewer_id = owner_id THEN
    RETURN true;
  END IF;

  IF owner_id IS NULL THEN
    RETURN false;
  END IF;

  IF viewer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.blocks bl
    WHERE (bl.blocker_id = viewer_id AND bl.blocked_id = owner_id)
       OR (bl.blocker_id = owner_id AND bl.blocked_id = viewer_id)
  ) THEN
    RETURN false;
  END IF;

  IF v_vis = 'private' THEN
    RETURN false;
  END IF;

  IF v_vis = 'public' THEN
    RETURN true;
  END IF;

  IF v_vis = 'friends' THEN
    RETURN public.are_mutual_friends(viewer_id, owner_id);
  END IF;

  IF v_vis = 'group' THEN
    IF gid IS NOT NULL AND public.is_group_member(viewer_id, gid) THEN
      RETURN true;
    END IF;
    IF target_gids IS NOT NULL AND array_length(target_gids, 1) > 0 THEN
      RETURN EXISTS (
        SELECT 1
        FROM unnest(target_gids) AS tg(val)
        WHERE tg.val ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND public.is_group_member(viewer_id, tg.val::uuid)
      );
    END IF;
    RETURN false;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.are_mutual_friends(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_entry(uuid, uuid, text, uuid, text[]) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. СТРОГИЕ RLS-ПОЛИТИКИ ДЛЯ DAYS / PRIDES / GRATITUDES (NO PRIVATE LEAKS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gratitudes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "days_select_policy" ON public.days;
CREATE POLICY "days_select_policy"
ON public.days FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    visibility <> 'private'
    AND public.can_view_entry(
      auth.uid(),
      user_id,
      visibility,
      group_id,
      COALESCE(target_group_ids::text[], '{}'::text[])
    )
  )
);

DROP POLICY IF EXISTS "prides_select_policy" ON public.prides;
CREATE POLICY "prides_select_policy"
ON public.prides FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    visibility <> 'private'
    AND public.can_view_entry(
      auth.uid(),
      user_id,
      visibility,
      group_id,
      COALESCE(target_group_ids::text[], '{}'::text[])
    )
    AND EXISTS (
      SELECT 1 FROM public.days d
      WHERE d.user_id = prides.user_id
        AND (
          (prides.day_id IS NOT NULL AND d.id = prides.day_id)
          OR (prides.day_client_id IS NOT NULL AND d.client_id = prides.day_client_id)
        )
        AND d.visibility <> 'private'
        AND public.can_view_entry(
          auth.uid(),
          d.user_id,
          d.visibility,
          d.group_id,
          COALESCE(d.target_group_ids::text[], '{}'::text[])
        )
    )
  )
);

DROP POLICY IF EXISTS "gratitudes_select_policy" ON public.gratitudes;
CREATE POLICY "gratitudes_select_policy"
ON public.gratitudes FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    visibility <> 'private'
    AND public.can_view_entry(
      auth.uid(),
      user_id,
      visibility,
      group_id,
      COALESCE(target_group_ids::text[], '{}'::text[])
    )
    AND EXISTS (
      SELECT 1 FROM public.days d
      WHERE d.user_id = gratitudes.user_id
        AND (
          (gratitudes.day_id IS NOT NULL AND d.id = gratitudes.day_id)
          OR (gratitudes.day_client_id IS NOT NULL AND d.client_id = gratitudes.day_client_id)
        )
        AND d.visibility <> 'private'
        AND public.can_view_entry(
          auth.uid(),
          d.user_id,
          d.visibility,
          d.group_id,
          COALESCE(d.target_group_ids::text[], '{}'::text[])
        )
    )
  )
);

-- ----------------------------------------------------------------------------
-- 5. ОБНОВЛЁННЫЕ RPC ЛЕНТ ДРУЗЕЙ И ПОДПИСОК (РЕАЛЬНЫЕ КОЛОНКИ СХЕМЫ)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_friend_feed_v1(integer, integer, uuid);
CREATE OR REPLACE FUNCTION public.get_friend_feed_v1(
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0,
  p_viewer_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  day_id integer,
  day_uuid uuid,
  day_client_id text,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  avatar_color text,
  verified boolean,
  streak integer,
  day_date date,
  date_iso timestamptz,
  title text,
  visibility text,
  group_id uuid,
  group_name text,
  photos text[],
  tags text[],
  ai_score numeric,
  ai_verdict text,
  created_at timestamptz,
  prides jsonb,
  gratitudes jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_viewer_id, auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.day_number AS day_id,
    d.id AS day_uuid,
    d.client_id AS day_client_id,
    d.user_id,
    p.username,
    p.display_name,
    COALESCE(p.avatar_image, p.avatar_url) AS avatar_url,
    COALESCE(p.avatar_color, '#FF5C00') AS avatar_color,
    COALESCE(p.verified, false) AS verified,
    COALESCE(p.streak_count, p.streak, 0) AS streak,
    d.day_date,
    d.date_iso,
    COALESCE(d.title, '') AS title,
    d.visibility,
    d.group_id,
    cg.title AS group_name,
    COALESCE(d.photos, '{}'::text[]) AS photos,
    COALESCE(d.tags, '{}'::text[]) AS tags,
    d.ai_score,
    d.ai_verdict,
    d.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pr.id,
            'num', pr.num,
            'text', pr.text,
            'scale', pr.scale,
            'overcome', pr.overcome,
            'aiComment', pr.ai_comment,
            'visibility', pr.visibility,
            'groupId', pr.group_id
          ) ORDER BY pr.position ASC
        )
        FROM public.prides pr
        WHERE pr.user_id = d.user_id
          AND (
            (d.client_id IS NOT NULL AND pr.day_client_id = d.client_id)
            OR pr.day_id = d.id
          )
          AND COALESCE(pr.visibility, d.visibility) <> 'private'
          AND public.can_view_entry(
            v_uid,
            pr.user_id,
            COALESCE(pr.visibility, d.visibility),
            COALESCE(pr.group_id, d.group_id),
            COALESCE(pr.target_group_ids::text[], d.target_group_ids::text[], '{}'::text[])
          )
      ),
      '[]'::jsonb
    ) AS prides,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', gr.id,
            'text', gr.text,
            'rating', gr.rating,
            'visibility', gr.visibility,
            'groupId', gr.group_id
          ) ORDER BY gr.position ASC
        )
        FROM public.gratitudes gr
        WHERE gr.user_id = d.user_id
          AND (
            (d.client_id IS NOT NULL AND gr.day_client_id = d.client_id)
            OR gr.day_id = d.id
          )
          AND COALESCE(gr.visibility, d.visibility) <> 'private'
          AND public.can_view_entry(
            v_uid,
            gr.user_id,
            COALESCE(gr.visibility, d.visibility),
            COALESCE(gr.group_id, d.group_id),
            COALESCE(gr.target_group_ids::text[], d.target_group_ids::text[], '{}'::text[])
          )
      ),
      '[]'::jsonb
    ) AS gratitudes
  FROM public.days d
  JOIN public.profiles p ON p.id = d.user_id
  LEFT JOIN public.chat_groups cg ON cg.id = d.group_id
  WHERE d.user_id <> v_uid
    AND d.visibility IN ('public', 'friends', 'group')
    AND (
      (d.visibility IN ('public', 'friends') AND public.are_mutual_friends(v_uid, d.user_id))
      OR (
        d.visibility = 'group'
        AND public.can_view_entry(
          v_uid,
          d.user_id,
          'group',
          d.group_id,
          COALESCE(d.target_group_ids::text[], '{}'::text[])
        )
      )
    )
  ORDER BY d.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100))
  OFFSET GREATEST(0, p_offset);
END;
$$;

DROP FUNCTION IF EXISTS public.get_following_feed_v1(integer, integer, uuid);
CREATE OR REPLACE FUNCTION public.get_following_feed_v1(
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0,
  p_viewer_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  day_id integer,
  day_uuid uuid,
  day_client_id text,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  avatar_color text,
  verified boolean,
  streak integer,
  day_date date,
  date_iso timestamptz,
  title text,
  visibility text,
  photos text[],
  tags text[],
  ai_score numeric,
  ai_verdict text,
  created_at timestamptz,
  prides jsonb,
  gratitudes jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_viewer_id, auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.day_number AS day_id,
    d.id AS day_uuid,
    d.client_id AS day_client_id,
    d.user_id,
    p.username,
    p.display_name,
    COALESCE(p.avatar_image, p.avatar_url) AS avatar_url,
    COALESCE(p.avatar_color, '#FF5C00') AS avatar_color,
    COALESCE(p.verified, false) AS verified,
    COALESCE(p.streak_count, p.streak, 0) AS streak,
    d.day_date,
    d.date_iso,
    COALESCE(d.title, '') AS title,
    d.visibility,
    COALESCE(d.photos, '{}'::text[]) AS photos,
    COALESCE(d.tags, '{}'::text[]) AS tags,
    d.ai_score,
    d.ai_verdict,
    d.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pr.id,
            'num', pr.num,
            'text', pr.text,
            'scale', pr.scale,
            'overcome', pr.overcome,
            'aiComment', pr.ai_comment,
            'visibility', pr.visibility
          ) ORDER BY pr.position ASC
        )
        FROM public.prides pr
        WHERE pr.user_id = d.user_id
          AND (
            (d.client_id IS NOT NULL AND pr.day_client_id = d.client_id)
            OR pr.day_id = d.id
          )
          AND COALESCE(pr.visibility, d.visibility) = 'public'
      ),
      '[]'::jsonb
    ) AS prides,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', gr.id,
            'text', gr.text,
            'rating', gr.rating,
            'visibility', gr.visibility
          ) ORDER BY gr.position ASC
        )
        FROM public.gratitudes gr
        WHERE gr.user_id = d.user_id
          AND (
            (d.client_id IS NOT NULL AND gr.day_client_id = d.client_id)
            OR gr.day_id = d.id
          )
          AND COALESCE(gr.visibility, d.visibility) = 'public'
      ),
      '[]'::jsonb
    ) AS gratitudes
  FROM public.days d
  JOIN public.profiles p ON p.id = d.user_id
  WHERE d.user_id <> v_uid
    AND d.visibility = 'public'
    AND EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = v_uid AND f.following_id = d.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = v_uid AND b.blocked_id = d.user_id)
         OR (b.blocker_id = d.user_id AND b.blocked_id = v_uid)
    )
  ORDER BY d.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100))
  OFFSET GREATEST(0, p_offset);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_feed_v1(integer, integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_following_feed_v1(integer, integer, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. SAFE REALTIME ДЛЯ PUBLIC.DAYS + RELOAD SCHEMA CACHE
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'days'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.days;
    END IF;
  END IF;
END
$$;

ALTER TABLE public.days REPLICA IDENTITY FULL;

NOTIFY pgrst, 'reload schema';

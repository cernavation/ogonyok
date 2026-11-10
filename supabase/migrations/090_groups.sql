-- ============================================================================
-- МИГРАЦИЯ 090: ГРУППЫ («СЕМЬЯ», «СПОРТСМЕНЫ») И АУДИТОРИЯ ЗАПИСЕЙ
-- ============================================================================
-- 1. groups: id, owner_id, name, kind ('family'|'sport'|'friends'|'custom'),
--    description, avatar, color, invite_code, invite_expires_at, thread_id, created_at
-- 2. group_members: group_id, user_id, role ('owner'|'admin'|'member'),
--    status ('invited'|'active'), joined_at
-- 3. entry_audiences: entry_kind ('pride'|'gratitude'), entry_id, group_id
-- 4. Расширение visibility у prides/gratitudes: 'private'|'friends'|'public'|'groups'
-- 5. RLS на groups, group_members, entry_audiences и расширенные политики prides/gratitudes
-- 6. RPC: create_group, invite_to_group, join_group_by_invite, leave_group,
--    remove_member, get_group_feed, update_entry_audience, get_user_groups
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ТАБЛИЦА ГРУПП (groups)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'custom' CHECK (kind IN ('family', 'sport', 'friends', 'custom')),
  description text NOT NULL DEFAULT '',
  avatar text NOT NULL DEFAULT '👥',
  color text NOT NULL DEFAULT '#ff5c00',
  invite_code text UNIQUE,
  invite_expires_at timestamptz,
  thread_id uuid REFERENCES public.threads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON public.groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_groups_thread_id ON public.groups(thread_id);

-- ----------------------------------------------------------------------------
-- 2. УЧАСТНИКИ ГРУПП (group_members)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_members_group_role ON public.group_members(group_id, role);

-- ----------------------------------------------------------------------------
-- 3. АУДИТОРИЯ ЗАПИСЕЙ (entry_audiences)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entry_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_kind text NOT NULL CHECK (entry_kind IN ('pride', 'gratitude')),
  entry_id uuid NOT NULL,
  entry_client_id text,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_entry_audience UNIQUE (entry_kind, entry_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_audiences_lookup ON public.entry_audiences(entry_kind, entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_audiences_group ON public.entry_audiences(group_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. РАСШИРЕНИЕ CHECK-ОГРАНИЧЕНИЙ VISIBILITY НА prides И gratitudes
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- prides
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'prides' AND column_name = 'visibility' AND constraint_name = 'chk_prides_visibility'
  ) THEN
    ALTER TABLE public.prides DROP CONSTRAINT chk_prides_visibility;
  END IF;

  -- gratitudes
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'gratitudes' AND column_name = 'visibility' AND constraint_name = 'chk_gratitudes_visibility'
  ) THEN
    ALTER TABLE public.gratitudes DROP CONSTRAINT chk_gratitudes_visibility;
  END IF;

  -- days
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'days' AND column_name = 'visibility' AND constraint_name = 'chk_days_visibility'
  ) THEN
    ALTER TABLE public.days DROP CONSTRAINT chk_days_visibility;
  END IF;
END $$;

ALTER TABLE public.prides
  ADD CONSTRAINT chk_prides_visibility CHECK (visibility IN ('private', 'friends', 'public', 'groups'));

ALTER TABLE public.gratitudes
  ADD CONSTRAINT chk_gratitudes_visibility CHECK (visibility IN ('private', 'friends', 'public', 'groups'));

ALTER TABLE public.days
  ADD CONSTRAINT chk_days_visibility CHECK (visibility IN ('private', 'friends', 'public', 'groups'));

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

-- [A] groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_select_members" ON public.groups;
CREATE POLICY "groups_select_members"
ON public.groups FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
  )
  OR (invite_code IS NOT NULL AND invite_expires_at > now())
);

DROP POLICY IF EXISTS "groups_insert_owner" ON public.groups;
CREATE POLICY "groups_insert_owner"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "groups_update_admins" ON public.groups;
CREATE POLICY "groups_update_admins"
ON public.groups FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = groups.id AND gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = groups.id AND gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "groups_delete_owner" ON public.groups;
CREATE POLICY "groups_delete_owner"
ON public.groups FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- [B] group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
CREATE POLICY "group_members_select"
ON public.group_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.group_members gm2
    WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "group_members_insert" ON public.group_members;
CREATE POLICY "group_members_insert"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin')
  )
  OR user_id = auth.uid() -- Принятие инвайта
);

DROP POLICY IF EXISTS "group_members_update" ON public.group_members;
CREATE POLICY "group_members_update"
ON public.group_members FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "group_members_delete" ON public.group_members;
CREATE POLICY "group_members_delete"
ON public.group_members FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin')
  )
);

-- [C] entry_audiences
ALTER TABLE public.entry_audiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entry_audiences_select" ON public.entry_audiences;
CREATE POLICY "entry_audiences_select"
ON public.entry_audiences FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = entry_audiences.group_id AND gm.user_id = auth.uid() AND gm.status = 'active'
  )
  OR (
    entry_kind = 'pride' AND EXISTS (
      SELECT 1 FROM public.prides p WHERE p.id = entry_audiences.entry_id AND p.user_id = auth.uid()
    )
  )
  OR (
    entry_kind = 'gratitude' AND EXISTS (
      SELECT 1 FROM public.gratitudes g WHERE g.id = entry_audiences.entry_id AND g.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "entry_audiences_insert" ON public.entry_audiences;
CREATE POLICY "entry_audiences_insert"
ON public.entry_audiences FOR INSERT
TO authenticated
WITH CHECK (
  (
    entry_kind = 'pride' AND EXISTS (
      SELECT 1 FROM public.prides p WHERE p.id = entry_audiences.entry_id AND p.user_id = auth.uid()
    )
  )
  OR (
    entry_kind = 'gratitude' AND EXISTS (
      SELECT 1 FROM public.gratitudes g WHERE g.id = entry_audiences.entry_id AND g.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "entry_audiences_delete" ON public.entry_audiences;
CREATE POLICY "entry_audiences_delete"
ON public.entry_audiences FOR DELETE
TO authenticated
USING (
  (
    entry_kind = 'pride' AND EXISTS (
      SELECT 1 FROM public.prides p WHERE p.id = entry_audiences.entry_id AND p.user_id = auth.uid()
    )
  )
  OR (
    entry_kind = 'gratitude' AND EXISTS (
      SELECT 1 FROM public.gratitudes g WHERE g.id = entry_audiences.entry_id AND g.user_id = auth.uid()
    )
  )
);

-- [D] РАСШИРЕННЫЙ SELECT ДЛЯ prides (ВКЛЮЧАЯ ГРУППЫ)
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
    visibility = 'groups'
    AND EXISTS (
      SELECT 1 FROM public.entry_audiences ea
      JOIN public.group_members gm ON gm.group_id = ea.group_id
      WHERE ea.entry_kind = 'pride'
        AND ea.entry_id = prides.id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  )
);

-- [E] РАСШИРЕННЫЙ SELECT ДЛЯ gratitudes (ВКЛЮЧАЯ ГРУППЫ)
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
    visibility = 'groups'
    AND EXISTS (
      SELECT 1 FROM public.entry_audiences ea
      JOIN public.group_members gm ON gm.group_id = ea.group_id
      WHERE ea.entry_kind = 'gratitude'
        AND ea.entry_id = gratitudes.id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  )
);

-- [F] РАСШИРЕННЫЙ SELECT ДЛЯ days (ВКЛЮЧАЯ ГРУППЫ)
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
    visibility = 'groups'
    AND (
      EXISTS (
        SELECT 1 FROM public.prides p
        JOIN public.entry_audiences ea ON ea.entry_id = p.id AND ea.entry_kind = 'pride'
        JOIN public.group_members gm ON gm.group_id = ea.group_id
        WHERE p.day_id = days.id
          AND gm.user_id = auth.uid()
          AND gm.status = 'active'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.gratitudes g
        JOIN public.entry_audiences ea ON ea.entry_id = g.id AND ea.entry_kind = 'gratitude'
        JOIN public.group_members gm ON gm.group_id = ea.group_id
        WHERE g.day_id = days.id
          AND gm.user_id = auth.uid()
          AND gm.status = 'active'
      )
    )
  )
);

-- ----------------------------------------------------------------------------
-- 6. RPC: КВОТЫ ТАРИФА (ВНУТРЕННИЙ ХЕЛПЕР)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tier_group_limits(p_tier text)
RETURNS TABLE(max_groups_owned integer, max_group_members integer)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_tier = 'ultra' THEN
    RETURN QUERY SELECT 20, 100;
  ELSIF p_tier = 'pro' THEN
    RETURN QUERY SELECT 5, 25;
  ELSE
    RETURN QUERY SELECT 1, 5;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. RPC: СОЗДАНИЕ ГРУППЫ (create_group)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_group(
  p_name text,
  p_kind text DEFAULT 'custom',
  p_description text DEFAULT '',
  p_avatar text DEFAULT '👥',
  p_color text DEFAULT '#ff5c00',
  p_initial_member_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier text;
  v_max_owned int;
  v_max_members int;
  v_current_owned int;
  v_group_id uuid;
  v_thread_id uuid;
  v_member_id uuid;
  v_initial_count int := 1; -- Владелец
  v_is_friend boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  p_name := trim(p_name);
  IF length(p_name) < 2 OR length(p_name) > 100 THEN
    RAISE EXCEPTION 'Group name must be between 2 and 100 characters';
  END IF;

  -- 1. Проверяем квоту на количество созданных групп
  v_tier := public.effective_tier(v_user_id);
  SELECT max_groups_owned, max_group_members INTO v_max_owned, v_max_members
  FROM public.get_tier_group_limits(v_tier);

  SELECT count(*) INTO v_current_owned
  FROM public.groups
  WHERE owner_id = v_user_id;

  IF v_current_owned >= v_max_owned THEN
    RAISE EXCEPTION 'quota_exceeded: You have reached the maximum allowed owned groups for your tier (%)', v_tier;
  END IF;

  -- 2. Создаем запись группы
  INSERT INTO public.groups (
    owner_id,
    name,
    kind,
    description,
    avatar,
    color
  ) VALUES (
    v_user_id,
    p_name,
    COALESCE(p_kind, 'custom'),
    COALESCE(p_description, ''),
    COALESCE(p_avatar, '👥'),
    COALESCE(p_color, '#ff5c00')
  )
  RETURNING id INTO v_group_id;

  -- 3. Добавляем владельца в group_members
  INSERT INTO public.group_members (
    group_id,
    user_id,
    role,
    status
  ) VALUES (
    v_group_id,
    v_user_id,
    'owner',
    'active'
  );

  -- 4. Создаем связанный тред группового чата (Этап 8)
  INSERT INTO public.threads (
    kind,
    group_id,
    title,
    avatar,
    created_by
  ) VALUES (
    'group',
    v_group_id,
    p_name,
    p_avatar,
    v_user_id
  )
  RETURNING id INTO v_thread_id;

  -- Привязываем thread_id к группе
  UPDATE public.groups
  SET thread_id = v_thread_id
  WHERE id = v_group_id;

  -- Добавляем владельца в тред
  INSERT INTO public.thread_members (
    thread_id,
    user_id,
    role
  ) VALUES (
    v_thread_id,
    v_user_id,
    'owner'
  )
  ON CONFLICT (thread_id, user_id) DO NOTHING;

  -- 5. Добавляем начальных участников (если переданы)
  IF p_initial_member_ids IS NOT NULL AND array_length(p_initial_member_ids, 1) > 0 THEN
    FOREACH v_member_id IN ARRAY p_initial_member_ids LOOP
      IF v_member_id <> v_user_id THEN
        -- Проверяем, что участник является соратником владельца
        SELECT EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.status = 'accepted'
            AND (
              (f.user_id = v_user_id AND f.friend_id = v_member_id)
              OR
              (f.friend_id = v_user_id AND f.user_id = v_member_id)
            )
        ) INTO v_is_friend;

        IF v_is_friend THEN
          IF v_initial_count < v_max_members THEN
            INSERT INTO public.group_members (group_id, user_id, role, status)
            VALUES (v_group_id, v_member_id, 'member', 'active')
            ON CONFLICT (group_id, user_id) DO NOTHING;

            INSERT INTO public.thread_members (thread_id, user_id, role)
            VALUES (v_thread_id, v_member_id, 'member')
            ON CONFLICT (thread_id, user_id) DO NOTHING;

            v_initial_count := v_initial_count + 1;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'group_id', v_group_id,
    'thread_id', v_thread_id,
    'name', p_name,
    'owner_id', v_user_id,
    'members_count', v_initial_count
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. RPC: ПРИГЛАШЕНИЕ В ГРУППУ (invite_to_group)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invite_to_group(
  p_group_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_group record;
  v_caller_role text;
  v_owner_tier text;
  v_max_members int;
  v_current_members int;
  v_is_friend boolean;
  v_invite_code text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- Проверяем права вызывающего: владелец или админ
  SELECT role INTO v_caller_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_caller_id AND status = 'active';

  IF v_caller_role NOT IN ('owner', 'admin') AND v_group.owner_id <> v_caller_id THEN
    RAISE EXCEPTION 'Permission denied: Only group owner or admin can invite members';
  END IF;

  -- Проверяем лимит участников группы по тарифу владельца
  v_owner_tier := public.effective_tier(v_group.owner_id);
  SELECT max_group_members INTO v_max_members
  FROM public.get_tier_group_limits(v_owner_tier);

  SELECT count(*) INTO v_current_members
  FROM public.group_members
  WHERE group_id = p_group_id AND status = 'active';

  IF v_current_members >= v_max_members THEN
    RAISE EXCEPTION 'quota_exceeded: Group member limit reached for tier (%)', v_owner_tier;
  END IF;

  -- Вариант А: Прямое приглашение конкретного соратника
  IF p_user_id IS NOT NULL THEN
    IF p_user_id = v_caller_id THEN
      RAISE EXCEPTION 'Cannot invite yourself';
    END IF;

    -- Проверяем, что приглашаемый — соратник вызывающего
    SELECT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = v_caller_id AND f.friend_id = p_user_id)
          OR
          (f.friend_id = v_caller_id AND f.user_id = p_user_id)
        )
    ) INTO v_is_friend;

    IF NOT v_is_friend AND v_group.owner_id <> v_caller_id THEN
      RAISE EXCEPTION 'Users can only be directly invited from comrades list';
    END IF;

    -- Добавляем в участники группы со статусом active
    INSERT INTO public.group_members (group_id, user_id, role, status)
    VALUES (p_group_id, p_user_id, 'member', 'active')
    ON CONFLICT (group_id, user_id)
    DO UPDATE SET status = 'active', role = 'member';

    -- Добавляем в тред чата
    IF v_group.thread_id IS NOT NULL THEN
      INSERT INTO public.thread_members (thread_id, user_id, role)
      VALUES (v_group.thread_id, p_user_id, 'member')
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    END IF;

    -- Создаем уведомление приглашенному
    INSERT INTO public.notifications (
      user_id,
      type,
      actor_id,
      entity_type,
      entity_id,
      payload
    ) VALUES (
      p_user_id,
      'group_invite',
      v_caller_id,
      'group',
      p_group_id,
      jsonb_build_object(
        'group_id', p_group_id,
        'group_name', v_group.name,
        'avatar', v_group.avatar
      )
    );

    RETURN jsonb_build_object(
      'ok', true,
      'invited_user_id', p_user_id,
      'group_id', p_group_id,
      'status', 'added'
    );
  END IF;

  -- Вариант Б: Генерация инвайт-ссылки /g/[code] (срок 7 дней)
  v_invite_code := lower(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 10));

  UPDATE public.groups
  SET invite_code = v_invite_code,
      invite_expires_at = now() + interval '7 days'
  WHERE id = p_group_id;

  RETURN jsonb_build_object(
    'ok', true,
    'group_id', p_group_id,
    'invite_code', v_invite_code,
    'expires_at', (now() + interval '7 days')
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 9. RPC: ВСТУПЛЕНИЕ ПО ИНВАЙТ-ССЫЛКЕ (join_group_by_invite)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_group_by_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_group record;
  v_owner_tier text;
  v_max_members int;
  v_current_members int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  p_code := trim(lower(p_code));
  SELECT * INTO v_group
  FROM public.groups
  WHERE invite_code = p_code
    AND (invite_expires_at IS NULL OR invite_expires_at > now());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- Проверяем лимит участников группы
  v_owner_tier := public.effective_tier(v_group.owner_id);
  SELECT max_group_members INTO v_max_members
  FROM public.get_tier_group_limits(v_owner_tier);

  SELECT count(*) INTO v_current_members
  FROM public.group_members
  WHERE group_id = v_group.id AND status = 'active';

  IF v_current_members >= v_max_members THEN
    RAISE EXCEPTION 'quota_exceeded: Group member limit reached for tier (%)', v_owner_tier;
  END IF;

  -- Добавляем в group_members
  INSERT INTO public.group_members (group_id, user_id, role, status)
  VALUES (v_group.id, v_user_id, 'member', 'active')
  ON CONFLICT (group_id, user_id)
  DO UPDATE SET status = 'active';

  -- Добавляем в тред
  IF v_group.thread_id IS NOT NULL THEN
    INSERT INTO public.thread_members (thread_id, user_id, role)
    VALUES (v_group.thread_id, v_user_id, 'member')
    ON CONFLICT (thread_id, user_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'group_id', v_group.id,
    'group_name', v_group.name,
    'avatar', v_group.avatar,
    'thread_id', v_group.thread_id
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 10. RPC: ВЫХОД ИЗ ГРУППЫ (leave_group)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_group(p_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_group record;
  v_new_owner_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Если выходит владелец
  IF v_group.owner_id = v_user_id THEN
    -- Ищем следующего админа или участника
    SELECT user_id INTO v_new_owner_id
    FROM public.group_members
    WHERE group_id = p_group_id AND user_id <> v_user_id AND status = 'active'
    ORDER BY CASE WHEN role = 'admin' THEN 1 ELSE 2 END, joined_at ASC
    LIMIT 1;

    IF v_new_owner_id IS NOT NULL THEN
      UPDATE public.groups SET owner_id = v_new_owner_id WHERE id = p_group_id;
      UPDATE public.group_members SET role = 'owner' WHERE group_id = p_group_id AND user_id = v_new_owner_id;
    ELSE
      -- Последний участник — удаляем группу
      DELETE FROM public.groups WHERE id = p_group_id;
      RETURN true;
    END IF;
  END IF;

  -- Удаляем из group_members
  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  -- Удаляем из thread_members
  IF v_group.thread_id IS NOT NULL THEN
    DELETE FROM public.thread_members
    WHERE thread_id = v_group.thread_id AND user_id = v_user_id;
  END IF;

  RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. RPC: ИСКЛЮЧЕНИЕ УЧАСТНИКА (remove_member)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_member(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_group record;
  v_caller_role text;
  v_target_role text;
BEGIN
  IF v_caller_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT role INTO v_caller_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_caller_id AND status = 'active';

  IF v_caller_role NOT IN ('owner', 'admin') AND v_group.owner_id <> v_caller_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT role INTO v_target_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  -- Админ не может исключить владельца или другого админа
  IF v_caller_role = 'admin' AND v_target_role IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Admins cannot remove owners or other admins';
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  IF v_group.thread_id IS NOT NULL THEN
    DELETE FROM public.thread_members
    WHERE thread_id = v_group.thread_id AND user_id = p_user_id;
  END IF;

  RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 12. RPC: ОБНОВЛЕНИЕ АУДИТОРИИ ЗАПИСИ (update_entry_audience)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_entry_audience(
  p_entry_kind text,
  p_entry_id text,
  p_visibility text,
  p_group_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_author_id uuid;
  v_real_entry_id uuid;
  v_entry_client_id text := NULL;
  v_gid uuid;
  v_member_record record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_visibility NOT IN ('private', 'friends', 'public', 'groups') THEN
    RAISE EXCEPTION 'Invalid visibility level';
  END IF;

  -- Проверяем авторство и резолвим UUID / client_id
  IF p_entry_kind = 'pride' THEN
    IF p_entry_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT id, user_id, client_id INTO v_real_entry_id, v_author_id, v_entry_client_id
      FROM public.prides WHERE id = p_entry_id::uuid;
    ELSE
      SELECT id, user_id, client_id INTO v_real_entry_id, v_author_id, v_entry_client_id
      FROM public.prides WHERE client_id = p_entry_id AND user_id = v_user_id LIMIT 1;
    END IF;

    IF v_real_entry_id IS NULL THEN
      RAISE EXCEPTION 'Pride not found';
    END IF;
    IF v_author_id <> v_user_id THEN
      RAISE EXCEPTION 'Permission denied: only author can change entry audience';
    END IF;

    UPDATE public.prides SET visibility = p_visibility, updated_at = now() WHERE id = v_real_entry_id;
  ELSIF p_entry_kind = 'gratitude' THEN
    IF p_entry_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT id, user_id, client_id INTO v_real_entry_id, v_author_id, v_entry_client_id
      FROM public.gratitudes WHERE id = p_entry_id::uuid;
    ELSE
      SELECT id, user_id, client_id INTO v_real_entry_id, v_author_id, v_entry_client_id
      FROM public.gratitudes WHERE client_id = p_entry_id AND user_id = v_user_id LIMIT 1;
    END IF;

    IF v_real_entry_id IS NULL THEN
      RAISE EXCEPTION 'Gratitude not found';
    END IF;
    IF v_author_id <> v_user_id THEN
      RAISE EXCEPTION 'Permission denied: only author can change entry audience';
    END IF;

    UPDATE public.gratitudes SET visibility = p_visibility, updated_at = now() WHERE id = v_real_entry_id;
  ELSE
    RAISE EXCEPTION 'Invalid entry kind';
  END IF;

  -- Очищаем старые аудитории для этой записи
  DELETE FROM public.entry_audiences
  WHERE entry_kind = p_entry_kind AND (entry_id = v_real_entry_id OR (v_entry_client_id IS NOT NULL AND entry_client_id = v_entry_client_id));

  -- Если visibility = 'groups', привязываем выбранные группы
  IF p_visibility = 'groups' AND p_group_ids IS NOT NULL THEN
    FOREACH v_gid IN ARRAY p_group_ids LOOP
      -- Автор должен быть активным участником группы
      IF EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = v_gid AND user_id = v_user_id AND status = 'active'
      ) THEN
        INSERT INTO public.entry_audiences (
          entry_kind,
          entry_id,
          entry_client_id,
          group_id
        ) VALUES (
          p_entry_kind,
          v_real_entry_id,
          v_entry_client_id,
          v_gid
        )
        ON CONFLICT (entry_kind, entry_id, group_id) DO NOTHING;

        -- Отправляем уведомления участникам группы (с антиспам-агрегацией за 10 минут)
        FOR v_member_record IN (
          SELECT user_id FROM public.group_members
          WHERE group_id = v_gid AND user_id <> v_user_id AND status = 'active'
        ) LOOP
          IF NOT EXISTS (
            SELECT 1 FROM public.notifications n
            WHERE n.user_id = v_member_record.user_id
              AND n.actor_id = v_user_id
              AND n.entity_type = 'group'
              AND n.entity_id = v_gid
              AND n.created_at > now() - interval '10 minutes'
          ) THEN
            INSERT INTO public.notifications (
              user_id,
              type,
              actor_id,
              entity_type,
              entity_id,
              payload
            ) VALUES (
              v_member_record.user_id,
              'milestone',
              v_user_id,
              'group',
              v_gid,
              jsonb_build_object(
                'group_id', v_gid,
                'entry_kind', p_entry_kind,
                'entry_id', v_real_entry_id,
                'text', 'Новая запись соратника в группе'
              )
            );
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'entry_kind', p_entry_kind,
    'entry_id', v_real_entry_id,
    'visibility', p_visibility,
    'groups_count', COALESCE(array_length(p_group_ids, 1), 0)
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 13. RPC: ЛЕНТА ЗАПИСЕЙ ГРУППЫ (get_group_feed)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_group_feed(
  p_group_id uuid,
  p_limit int DEFAULT 20,
  p_cursor timestamptz DEFAULT NULL
)
RETURNS TABLE (
  entry_kind text,
  entry_id uuid,
  day_id uuid,
  user_id uuid,
  author_name text,
  author_username text,
  author_avatar text,
  text text,
  scale int,
  overcome int,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Проверяем, что вызывающий — активный участник группы
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = v_caller_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Permission denied: Not a member of this group';
  END IF;

  RETURN QUERY
  WITH group_entries AS (
    SELECT
      'pride'::text AS e_kind,
      p.id AS e_id,
      p.day_id AS d_id,
      p.user_id AS u_id,
      p.text AS e_text,
      p.scale AS e_scale,
      p.overcome AS e_overcome,
      ea.created_at AS e_created_at
    FROM public.entry_audiences ea
    JOIN public.prides p ON p.id = ea.entry_id AND ea.entry_kind = 'pride'
    WHERE ea.group_id = p_group_id
      AND (p_cursor IS NULL OR ea.created_at < p_cursor)

    UNION ALL

    SELECT
      'gratitude'::text AS e_kind,
      g.id AS e_id,
      g.day_id AS d_id,
      g.user_id AS u_id,
      g.text AS e_text,
      g.rating AS e_scale,
      0 AS e_overcome,
      ea.created_at AS e_created_at
    FROM public.entry_audiences ea
    JOIN public.gratitudes g ON g.id = ea.entry_id AND ea.entry_kind = 'gratitude'
    WHERE ea.group_id = p_group_id
      AND (p_cursor IS NULL OR ea.created_at < p_cursor)
  )
  SELECT
    ge.e_kind AS entry_kind,
    ge.e_id AS entry_id,
    ge.d_id AS day_id,
    ge.u_id AS user_id,
    COALESCE(prof.display_name, 'Соратник') AS author_name,
    prof.username AS author_username,
    COALESCE(prof.avatar_url, prof.avatar_image) AS author_avatar,
    ge.e_text AS text,
    ge.e_scale AS scale,
    ge.e_overcome AS overcome,
    ge.e_created_at AS created_at
  FROM group_entries ge
  LEFT JOIN public.profiles prof ON prof.id = ge.u_id
  ORDER BY ge.e_created_at DESC
  LIMIT LEAST(p_limit, 50);
END;
$$;

-- ----------------------------------------------------------------------------
-- 14. RPC: СПИСОК ГРУПП ПОЛЬЗОВАТЕЛЯ (get_user_groups)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_groups(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  kind text,
  description text,
  avatar text,
  color text,
  role text,
  status text,
  members_count bigint,
  thread_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_id uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_target_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.kind,
    g.description,
    g.avatar,
    g.color,
    gm.role,
    gm.status,
    (SELECT count(*) FROM public.group_members gm2 WHERE gm2.group_id = g.id AND gm2.status = 'active') AS members_count,
    g.thread_id,
    g.created_at
  FROM public.groups g
  JOIN public.group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = v_target_id
  ORDER BY g.created_at DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 15. ПУБЛИКАЦИЯ В REALTIME
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
    EXCEPTION WHEN duplicate_object THEN
      -- уже добавлено
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
    EXCEPTION WHEN duplicate_object THEN
      -- уже добавлено
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.entry_audiences;
    EXCEPTION WHEN duplicate_object THEN
      -- уже добавлено
    END;
  END IF;
END $$;

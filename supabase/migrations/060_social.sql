-- ==============================================================================
-- МИГРАЦИЯ 060: ПОЛНАЯ СИСТЕМА СОРАТНИКОВ, ПОДПИСОК, БЛОКИРОВОК И ЛЕНТЫ (ЭТАП 6)
-- ==============================================================================

-- 1. Дополняем ENUM friendship_status значением 'canceled', если его нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'friendship_status'::regtype AND enumlabel = 'canceled'
  ) THEN
    ALTER TYPE friendship_status ADD VALUE 'canceled';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Игнорируем ошибку при повторном накатывании
  NULL;
END $$;

-- 2. Обновление таблицы friendships
-- Добавляем колонки requester_id, addressee_id, responded_at, если их нет
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'friendships' AND column_name = 'requester_id') THEN
    ALTER TABLE public.friendships ADD COLUMN requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'friendships' AND column_name = 'addressee_id') THEN
    ALTER TABLE public.friendships ADD COLUMN addressee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'friendships' AND column_name = 'responded_at') THEN
    ALTER TABLE public.friendships ADD COLUMN responded_at timestamptz;
  END IF;
END $$;

-- Заполняем requester_id и addressee_id из существующих строк (user_id / friend_id)
UPDATE public.friendships
SET
  requester_id = coalesce(requester_id, user_id),
  addressee_id = coalesce(addressee_id, friend_id)
WHERE requester_id IS NULL OR addressee_id IS NULL;

-- Гарантируем, что user_id и friend_id синхронизированы
UPDATE public.friendships
SET
  user_id = coalesce(user_id, requester_id),
  friend_id = coalesce(friend_id, addressee_id)
WHERE user_id IS NULL OR friend_id IS NULL;

-- Удаляем ошибочные записи дружбы с самим собой
DELETE FROM public.friendships
WHERE coalesce(requester_id, user_id) = coalesce(addressee_id, friend_id);

-- Добавляем CHECK constraint requester <> addressee
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_friendships_requester_addressee'
  ) THEN
    ALTER TABLE public.friendships
      ADD CONSTRAINT chk_friendships_requester_addressee
      CHECK (requester_id <> addressee_id);
  END IF;
END $$;

-- Уникальный индекс на пару независимо от направления: least/greatest
CREATE UNIQUE INDEX IF NOT EXISTS uq_friendships_pair_symmetric
ON public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id, status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Триггер автоматической синхронизации user_id/friend_id для обратной совместимости со старыми запросами
CREATE OR REPLACE FUNCTION public.sync_friendship_legacy_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.requester_id IS NOT NULL AND NEW.user_id IS NULL THEN
    NEW.user_id := NEW.requester_id;
  END IF;
  IF NEW.addressee_id IS NOT NULL AND NEW.friend_id IS NULL THEN
    NEW.friend_id := NEW.addressee_id;
  END IF;
  IF NEW.user_id IS NOT NULL AND NEW.requester_id IS NULL THEN
    NEW.requester_id := NEW.user_id;
  END IF;
  IF NEW.friend_id IS NOT NULL AND NEW.addressee_id IS NULL THEN
    NEW.addressee_id := NEW.friend_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_friendship_legacy_fields ON public.friendships;
CREATE TRIGGER trg_sync_friendship_legacy_fields
BEFORE INSERT OR UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.sync_friendship_legacy_fields();

-- ------------------------------------------------------------------------------
-- 3. ТАБЛИЦА БЛОКИРОВОК (blocks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT chk_blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks (blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocks_select_own" ON public.blocks;
CREATE POLICY "blocks_select_own" ON public.blocks
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "blocks_insert_own" ON public.blocks;
CREATE POLICY "blocks_insert_own" ON public.blocks
  FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "blocks_delete_own" ON public.blocks;
CREATE POLICY "blocks_delete_own" ON public.blocks
  FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 4. ТАБЛИЦА ЖАЛОБ (reports)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL, -- 'user', 'message', 'day', 'story', 'comment'
  target_id text NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open', -- 'open', 'resolved', 'dismissed'
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports (target_type, target_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "reports_service_all" ON public.reports;
CREATE POLICY "reports_service_all" ON public.reports
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. ТАБЛИЦА УВЕДОМЛЕНИЙ (notifications) — Каркас этапов 6 и 7
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'friend_request', 'friend_accepted', 'reaction', 'comment', 'mention'
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_service_all" ON public.notifications;
CREATE POLICY "notifications_service_all" ON public.notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. ОБНОВЛЕНИЕ RLS ДЛЯ FRIENDSHIPS
-- ------------------------------------------------------------------------------
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select" ON public.friendships;
CREATE POLICY "friendships_select" ON public.friendships
  FOR SELECT TO authenticated
  USING (
    auth.uid() = requester_id
    OR auth.uid() = addressee_id
    OR auth.uid() = user_id
    OR auth.uid() = friend_id
  );

DROP POLICY IF EXISTS "friendships_service_all" ON public.friendships;
CREATE POLICY "friendships_service_all" ON public.friendships
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. RPC ФУНКЦИИ (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- А. send_friend_request: отправка заявки в соратники
CREATE OR REPLACE FUNCTION public.send_friend_request(p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_existing record;
  v_sender_profile record;
  v_req_id uuid;
  v_target_privacy jsonb;
BEGIN
  IF v_sender IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'Требуется авторизация');
  END IF;

  IF v_sender = p_target_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_befriend_self', 'message', 'Нельзя добавить самого себя в соратники');
  END IF;

  -- Проверка существования цели
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found', 'message', 'Пользователь не найден');
  END IF;

  -- Проверка блокировок в обе стороны
  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = v_sender AND blocked_id = p_target_id)
       OR (blocker_id = p_target_id AND blocked_id = v_sender)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_blocked', 'message', 'Действие недоступно из-за блокировки');
  END IF;

  -- Проверка приватности адресата (allow_friend_requests)
  SELECT privacy INTO v_target_privacy FROM public.profile_private WHERE user_id = p_target_id;
  IF v_target_privacy IS NOT NULL AND v_target_privacy->>'allow_friend_requests' = 'nobody' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'requests_disabled', 'message', 'Пользователь закрыл входящие заявки');
  END IF;

  -- Проверка существующей связи
  SELECT * INTO v_existing
  FROM public.friendships
  WHERE (requester_id = v_sender AND addressee_id = p_target_id)
     OR (requester_id = p_target_id AND addressee_id = v_sender)
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status = 'accepted' THEN
      RETURN jsonb_build_object('ok', true, 'status', 'accepted', 'id', v_existing.id, 'message', 'Вы уже являетесь соратниками');
    END IF;

    -- Если уже отправлена мной
    IF v_existing.status = 'pending' AND v_existing.requester_id = v_sender THEN
      RETURN jsonb_build_object('ok', true, 'status', 'pending_sent', 'id', v_existing.id, 'message', 'Заявка уже ожидает ответа');
    END IF;

    -- Если есть встречная заявка от него ко мне -> автоматическое обоюдное принятие!
    IF v_existing.status = 'pending' AND v_existing.addressee_id = v_sender THEN
      UPDATE public.friendships
      SET status = 'accepted', responded_at = clock_timestamp(), updated_at = clock_timestamp()
      WHERE id = v_existing.id;

      -- Обоюдная подписка
      INSERT INTO public.follows (follower_id, following_id)
      VALUES (v_sender, p_target_id), (p_target_id, v_sender)
      ON CONFLICT DO NOTHING;

      -- Уведомление встречному пользователю
      SELECT username, display_name INTO v_sender_profile FROM public.profiles WHERE id = v_sender;
      INSERT INTO public.notifications (user_id, actor_id, type, title, body, data)
      VALUES (
        p_target_id,
        v_sender,
        'friend_accepted',
        'Новый соратник!',
        coalesce(v_sender_profile.display_name, v_sender_profile.username, 'Пользователь') || ' принял(а) заявку в соратники',
        jsonb_build_object('user_id', v_sender, 'username', v_sender_profile.username)
      );

      RETURN jsonb_build_object('ok', true, 'status', 'accepted', 'id', v_existing.id, 'message', 'Взаимная заявка принята! Теперь вы соратники');
    END IF;

    -- Если была отклонена или отменена -> обновляем в pending
    UPDATE public.friendships
    SET
      requester_id = v_sender,
      addressee_id = p_target_id,
      user_id = v_sender,
      friend_id = p_target_id,
      status = 'pending',
      created_at = clock_timestamp(),
      responded_at = NULL,
      updated_at = clock_timestamp()
    WHERE id = v_existing.id
    RETURNING id INTO v_req_id;
  ELSE
    -- Создаем новую заявку
    INSERT INTO public.friendships (
      requester_id, addressee_id, user_id, friend_id, status, created_at, updated_at
    )
    VALUES (
      v_sender, p_target_id, v_sender, p_target_id, 'pending', clock_timestamp(), clock_timestamp()
    )
    RETURNING id INTO v_req_id;
  END IF;

  -- Создаем уведомление адресату
  SELECT username, display_name INTO v_sender_profile FROM public.profiles WHERE id = v_sender;
  INSERT INTO public.notifications (user_id, actor_id, type, title, body, data)
  VALUES (
    p_target_id,
    v_sender,
    'friend_request',
    'Заявка в соратники',
    coalesce(v_sender_profile.display_name, v_sender_profile.username, 'Пользователь') || ' хочет стать вашим соратником',
    jsonb_build_object('request_id', v_req_id, 'requester_id', v_sender, 'username', v_sender_profile.username)
  );

  RETURN jsonb_build_object('ok', true, 'status', 'pending_sent', 'id', v_req_id, 'message', 'Заявка в соратники отправлена');
END;
$$;

-- Б. respond_friend_request: принятие или отклонение входящей заявки
CREATE OR REPLACE FUNCTION public.respond_friend_request(p_request_id uuid, p_accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_req record;
  v_user_profile record;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'Требуется авторизация');
  END IF;

  SELECT * INTO v_req
  FROM public.friendships
  WHERE id = p_request_id
    AND (addressee_id = v_user OR (friend_id = v_user AND requester_id IS NULL))
    AND status = 'pending';

  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_found', 'message', 'Заявка не найдена или уже обработана');
  END IF;

  IF p_accept THEN
    UPDATE public.friendships
    SET status = 'accepted', responded_at = clock_timestamp(), updated_at = clock_timestamp()
    WHERE id = p_request_id;

    -- Взаимная подписка при дружбе
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (v_user, v_req.requester_id), (v_req.requester_id, v_user)
    ON CONFLICT DO NOTHING;

    -- Уведомление отправителю
    SELECT username, display_name INTO v_user_profile FROM public.profiles WHERE id = v_user;
    INSERT INTO public.notifications (user_id, actor_id, type, title, body, data)
    VALUES (
      v_req.requester_id,
      v_user,
      'friend_accepted',
      'Заявка принята!',
      coalesce(v_user_profile.display_name, v_user_profile.username, 'Пользователь') || ' принял(а) вашу заявку в соратники',
      jsonb_build_object('user_id', v_user, 'username', v_user_profile.username)
    );

    RETURN jsonb_build_object('ok', true, 'status', 'accepted', 'message', 'Заявка принята! Теперь вы соратники');
  ELSE
    UPDATE public.friendships
    SET status = 'declined', responded_at = clock_timestamp(), updated_at = clock_timestamp()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('ok', true, 'status', 'declined', 'message', 'Заявка отклонена');
  END IF;
END;
$$;

-- В. remove_friend: удаление из соратников
CREATE OR REPLACE FUNCTION public.remove_friend(p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  DELETE FROM public.friendships
  WHERE (requester_id = v_user AND addressee_id = p_target_id)
     OR (requester_id = p_target_id AND addressee_id = v_user)
     OR (user_id = v_user AND friend_id = p_target_id)
     OR (user_id = p_target_id AND friend_id = v_user);

  RETURN jsonb_build_object('ok', true, 'message', 'Пользователь удалён из соратников');
END;
$$;

-- Г. cancel_friend_request: отмена исходящей заявки
CREATE OR REPLACE FUNCTION public.cancel_friend_request(p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  DELETE FROM public.friendships
  WHERE ((requester_id = v_user AND addressee_id = p_target_id) OR (user_id = v_user AND friend_id = p_target_id))
    AND status = 'pending';

  RETURN jsonb_build_object('ok', true, 'message', 'Заявка в соратники отменена');
END;
$$;

-- Д. block_user: блокировка пользователя
CREATE OR REPLACE FUNCTION public.block_user(p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF v_user = p_target_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_block_self');
  END IF;

  INSERT INTO public.blocks (blocker_id, blocked_id)
  VALUES (v_user, p_target_id)
  ON CONFLICT DO NOTHING;

  -- Удаляем дружбу
  DELETE FROM public.friendships
  WHERE (requester_id = v_user AND addressee_id = p_target_id)
     OR (requester_id = p_target_id AND addressee_id = v_user)
     OR (user_id = v_user AND friend_id = p_target_id)
     OR (user_id = p_target_id AND friend_id = v_user);

  -- Удаляем подписки
  DELETE FROM public.follows
  WHERE (follower_id = v_user AND following_id = p_target_id)
     OR (follower_id = p_target_id AND following_id = v_user);

  RETURN jsonb_build_object('ok', true, 'message', 'Пользователь заблокирован');
END;
$$;

-- Е. unblock_user: разблокировка пользователя
CREATE OR REPLACE FUNCTION public.unblock_user(p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  DELETE FROM public.blocks
  WHERE blocker_id = v_user AND blocked_id = p_target_id;

  RETURN jsonb_build_object('ok', true, 'message', 'Пользователь разблокирован');
END;
$$;

-- Ж. report_target: отправка жалобы
CREATE OR REPLACE FUNCTION public.report_target(
  p_target_type text,
  p_target_id text,
  p_reason text,
  p_details text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_rep_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  INSERT INTO public.reports (reporter_id, target_type, target_id, reason, details)
  VALUES (v_user, p_target_type, p_target_id, p_reason, p_details)
  RETURNING id INTO v_rep_id;

  RETURN jsonb_build_object('ok', true, 'id', v_rep_id, 'message', 'Жалоба зарегистрирована');
END;
$$;

-- З. toggle_follow: подписка / отписка
CREATE OR REPLACE FUNCTION public.toggle_follow(p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_following boolean;
  v_privacy jsonb;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF v_user = p_target_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_follow_self');
  END IF;

  -- Проверка блокировок
  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = v_user AND blocked_id = p_target_id)
       OR (blocker_id = p_target_id AND blocked_id = v_user)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_blocked');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = v_user AND following_id = p_target_id
  ) INTO v_is_following;

  IF v_is_following THEN
    DELETE FROM public.follows
    WHERE follower_id = v_user AND following_id = p_target_id;
    RETURN jsonb_build_object('ok', true, 'following', false, 'message', 'Вы отписались от обновлений');
  ELSE
    -- Проверка allow_follow
    SELECT privacy INTO v_privacy FROM public.profile_private WHERE user_id = p_target_id;
    IF v_privacy IS NOT NULL AND v_privacy->>'allow_follow' = 'nobody' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'follow_disabled', 'message', 'Пользователь отключил возможность подписки');
    END IF;

    INSERT INTO public.follows (follower_id, following_id)
    VALUES (v_user, p_target_id)
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object('ok', true, 'following', true, 'message', 'Вы подписались на обновления');
  END IF;
END;
$$;

-- И. search_profiles: серверный полнотекстовый поиск по всей базе с ранжированием и пагинацией
CREATE OR REPLACE FUNCTION public.search_profiles(
  p_query text DEFAULT '',
  p_limit integer DEFAULT 20,
  p_cursor integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_clean text := trim(both ' ' from trim(leading '@' from p_query));
  v_res jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(row_data), '[]'::jsonb) INTO v_res
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', coalesce(p.display_name, p.username),
      'avatar_image', coalesce(p.avatar_image, p.avatar_url),
      'city', coalesce(p.city, ''),
      'bio', coalesce(p.bio, ''),
      'streak', coalesce(p.streak, p.streak_count, 0),
      'level', coalesce(p.level, p.difficulty_level, 1),
      'subscription_tier', coalesce(p.subscription_tier, 'free'),
      'is_founder', coalesce(p.is_founder, false),
      'friendship_status', CASE
        WHEN f.status = 'accepted' THEN 'accepted'
        WHEN f.status = 'pending' AND f.requester_id = v_user THEN 'pending_sent'
        WHEN f.status = 'pending' AND (f.addressee_id = v_user OR f.friend_id = v_user) THEN 'pending_received'
        ELSE 'none'
      END,
      'friendship_id', f.id,
      'is_following', EXISTS (SELECT 1 FROM public.follows fol WHERE fol.follower_id = v_user AND fol.following_id = p.id),
      'is_blocked', EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = v_user AND b.blocked_id = p.id)
    ) AS row_data
    FROM public.profiles p
    LEFT JOIN public.friendships f ON (
      (f.requester_id = v_user AND f.addressee_id = p.id)
      OR (f.requester_id = p.id AND f.addressee_id = v_user)
      OR (f.user_id = v_user AND f.friend_id = p.id)
      OR (f.user_id = p.id AND f.friend_id = v_user)
    )
    WHERE p.id <> coalesce(v_user, '00000000-0000-0000-0000-000000000000'::uuid)
      -- Исключаем тех, кто заблокировал меня или кого заблокировал я
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = v_user AND b.blocked_id = p.id)
           OR (b.blocker_id = p.id AND b.blocked_id = v_user)
      )
      -- Скрываем скрытые профили (discoverable = false или is_anonymous)
      AND coalesce((p.settings->'privacy'->>'discoverable')::boolean, true) = true
      AND coalesce(p.is_anonymous, false) = false
      -- Фильтр поискового запроса (если пустой, отдаем популярных/активных)
      AND (
        v_clean = ''
        OR p.username ILIKE '%' || v_clean || '%'
        OR p.display_name ILIKE '%' || v_clean || '%'
        OR p.city ILIKE '%' || v_clean || '%'
      )
    ORDER BY
      -- Ранжирование: точный ник -> префикс ника -> точное имя -> префикс имени -> стрик
      CASE
        WHEN lower(p.username) = lower(v_clean) THEN 100
        WHEN lower(p.username) LIKE lower(v_clean) || '%' THEN 80
        WHEN lower(p.display_name) = lower(v_clean) THEN 60
        WHEN lower(p.display_name) LIKE lower(v_clean) || '%' THEN 50
        WHEN p.username ILIKE '%' || v_clean || '%' THEN 40
        WHEN p.display_name ILIKE '%' || v_clean || '%' THEN 30
        ELSE 10
      END DESC,
      coalesce(p.streak, p.streak_count, 0) DESC,
      p.updated_at DESC
    LIMIT p_limit
    OFFSET p_cursor
  ) sub;

  RETURN v_res;
END;
$$;

-- К. get_feed: серверная выборка ленты с пагинацией и RLS-изоляцией
CREATE OR REPLACE FUNCTION public.get_feed(
  p_scope text DEFAULT 'all', -- 'all', 'friends', 'following'
  p_limit integer DEFAULT 20,
  p_cursor text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_res jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(feed_row), '[]'::jsonb) INTO v_res
  FROM (
    SELECT jsonb_build_object(
      'id', d.id,
      'day_number', d.day_number,
      'day_date', d.day_date,
      'closed_at', d.closed_at,
      'score', d.score,
      'visibility', d.visibility,
      'created_at', d.created_at,
      'author', jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'display_name', coalesce(p.display_name, p.username),
        'avatar_image', coalesce(p.avatar_image, p.avatar_url),
        'streak', coalesce(p.streak, p.streak_count, 0),
        'level', coalesce(p.level, p.difficulty_level, 1),
        'subscription_tier', coalesce(p.subscription_tier, 'free'),
        'is_founder', coalesce(p.is_founder, false)
      ),
      'prides', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'id', pr.id,
          'text', pr.text,
          'num', pr.num,
          'scale', pr.scale,
          'score', pr.score,
          'overcome', pr.overcome,
          'tags', pr.tags,
          'comment', pr.comment
        ) ORDER BY pr.num)
        FROM public.prides pr
        WHERE pr.day_id = d.id
      ), '[]'::jsonb),
      'gratitudes', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'id', gr.id,
          'text', gr.text,
          'num', gr.num
        ) ORDER BY gr.num)
        FROM public.gratitudes gr
        WHERE gr.day_id = d.id
      ), '[]'::jsonb)
    ) AS feed_row
    FROM public.days d
    JOIN public.profiles p ON p.id = d.user_id
    WHERE (
      -- 1. Скрываем записи заблокированных пользователей
      NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = v_user AND b.blocked_id = d.user_id)
           OR (b.blocker_id = d.user_id AND b.blocked_id = v_user)
      )
    )
    AND (
      -- 2. Фильтрация по области (scope)
      CASE
        WHEN p_scope = 'friends' THEN (
          d.user_id <> v_user
          AND EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.requester_id = v_user AND f.addressee_id = d.user_id)
                OR (f.addressee_id = v_user AND f.requester_id = d.user_id)
                OR (f.user_id = v_user AND f.friend_id = d.user_id)
                OR (f.friend_id = v_user AND f.user_id = d.user_id)
              )
          )
          AND (d.visibility IN ('public', 'friends'))
        )
        WHEN p_scope = 'following' THEN (
          d.user_id <> v_user
          AND EXISTS (
            SELECT 1 FROM public.follows fol
            WHERE fol.follower_id = v_user AND fol.following_id = d.user_id
          )
          AND (
            d.visibility = 'public'
            OR (
              d.visibility = 'friends'
              AND EXISTS (
                SELECT 1 FROM public.friendships f
                WHERE f.status = 'accepted'
                  AND ((f.requester_id = v_user AND f.addressee_id = d.user_id) OR (f.addressee_id = v_user AND f.requester_id = d.user_id))
              )
            )
          )
        )
        ELSE (
          -- 'all' / общий поток
          d.user_id = v_user
          OR d.visibility = 'public'
          OR (
            d.visibility = 'friends'
            AND EXISTS (
              SELECT 1 FROM public.friendships f
              WHERE f.status = 'accepted'
                AND ((f.requester_id = v_user AND f.addressee_id = d.user_id) OR (f.addressee_id = v_user AND f.requester_id = d.user_id))
            )
          )
        )
      END
    )
    AND (
      p_cursor IS NULL
      OR d.created_at < p_cursor::timestamptz
    )
    ORDER BY d.created_at DESC
    LIMIT p_limit
  ) feed_sub;

  RETURN v_res;
END;
$$;

-- Л. get_social_counts: подсчет соратников, заявок и подписок для бейджей навигации
CREATE OR REPLACE FUNCTION public.get_social_counts(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_friends_count integer := 0;
  v_incoming_requests integer := 0;
  v_outgoing_requests integer := 0;
  v_following_count integer := 0;
  v_followers_count integer := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'friends', 0,
      'incomingRequests', 0,
      'outgoingRequests', 0,
      'following', 0,
      'followers', 0
    );
  END IF;

  SELECT count(*) INTO v_friends_count
  FROM public.friendships
  WHERE status = 'accepted'
    AND (requester_id = v_user OR addressee_id = v_user OR user_id = v_user OR friend_id = v_user);

  SELECT count(*) INTO v_incoming_requests
  FROM public.friendships
  WHERE status = 'pending'
    AND (addressee_id = v_user OR (friend_id = v_user AND requester_id IS NULL));

  SELECT count(*) INTO v_outgoing_requests
  FROM public.friendships
  WHERE status = 'pending'
    AND (requester_id = v_user OR (user_id = v_user AND addressee_id IS NULL));

  SELECT count(*) INTO v_following_count
  FROM public.follows
  WHERE follower_id = v_user;

  SELECT count(*) INTO v_followers_count
  FROM public.follows
  WHERE following_id = v_user;

  RETURN jsonb_build_object(
    'friends', v_friends_count,
    'incomingRequests', v_incoming_requests,
    'outgoingRequests', v_outgoing_requests,
    'following', v_following_count,
    'followers', v_followers_count
  );
END;
$$;

-- Предоставляем права вызова функций
GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_friend_request(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.report_target(text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_follow(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_profiles(text, integer, integer) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_feed(text, integer, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_social_counts(uuid) TO authenticated, anon, service_role;

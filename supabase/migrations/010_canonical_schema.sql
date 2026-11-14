-- ============================================================================
-- 010_canonical_schema.sql
-- Каноническая схема базы данных проекта «Огонёк» (Этап 1)
-- Идемпотентная миграция: безопасна для многократного запуска.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ENUM-ТИПЫ
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friendship_status') THEN
    CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. ТАБЛИЦА ПРОФИЛЕЙ (profiles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  joined_label text NOT NULL DEFAULT 'Только что',

  -- Аватар: avatar_url (основная), avatar_image (deprecated дубль)
  avatar_url text,
  avatar_image text,
  avatar_color text NOT NULL DEFAULT '#FF5C00',

  -- Обложка: cover_url (основная), banner_image (deprecated дубль)
  cover_url text,
  banner_image text,
  banner_preset text NOT NULL DEFAULT 'night-peaks',

  -- Уровень: level (основная), difficulty_level (deprecated дубль)
  level integer NOT NULL DEFAULT 1,
  difficulty_level integer NOT NULL DEFAULT 1,

  -- Стрик: streak_count (основная), streak (deprecated дубль)
  streak_count integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,

  -- Тариф (free | pro | ultra) — меняется ТОЛЬКО через service_role
  subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'ultra')),
  verified boolean NOT NULL DEFAULT false,
  is_anonymous boolean NOT NULL DEFAULT false,
  telegram_chat_id text,
  monthly_goal text NOT NULL DEFAULT '',
  monthly_goal_updated_at timestamptz,
  level_changed_at timestamptz,

  theme text NOT NULL DEFAULT 'x-black',
  accent text NOT NULL DEFAULT 'amber',
  font_scale text NOT NULL DEFAULT 'standard',
  feed_density text NOT NULL DEFAULT 'comfortable',

  privacy jsonb NOT NULL DEFAULT '{}'::jsonb,
  streak_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  social_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  reminder_times jsonb DEFAULT '["21:00"]'::jsonb,

  client_id text,
  client_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Добавление колонок в profiles, если таблица уже существовала в более старой версии
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_image text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_image text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS difficulty_level integer NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_chat_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reminder_times jsonb DEFAULT '["21:00"]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_updated_at timestamptz;

-- Комментарии к колонкам-дублям
COMMENT ON COLUMN public.profiles.avatar_url IS 'Каноническая колонка аватара';
COMMENT ON COLUMN public.profiles.avatar_image IS 'DEPRECATED: используйте avatar_url';
COMMENT ON COLUMN public.profiles.cover_url IS 'Каноническая колонка обложки';
COMMENT ON COLUMN public.profiles.banner_image IS 'DEPRECATED: используйте cover_url';
COMMENT ON COLUMN public.profiles.level IS 'Каноническая колонка уровня дневника';
COMMENT ON COLUMN public.profiles.difficulty_level IS 'DEPRECATED: используйте level';
COMMENT ON COLUMN public.profiles.streak_count IS 'Каноническая колонка непрерывного стрика';
COMMENT ON COLUMN public.profiles.streak IS 'DEPRECATED: используйте streak_count';

-- Миграция legacy тарифа premium -> pro
UPDATE public.profiles
SET subscription_tier = 'pro'
WHERE subscription_tier = 'premium';

-- Синхронизирующий триггер для совместимости старых и новых колонок
CREATE OR REPLACE FUNCTION public.sync_profiles_compat_columns()
RETURNS trigger AS $$
BEGIN
  -- Аватар
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    NEW.avatar_image := NEW.avatar_url;
  ELSIF NEW.avatar_image IS DISTINCT FROM OLD.avatar_image AND NEW.avatar_url IS NULL THEN
    NEW.avatar_url := NEW.avatar_image;
  END IF;

  -- Обложка
  IF NEW.cover_url IS DISTINCT FROM OLD.cover_url THEN
    NEW.banner_image := NEW.cover_url;
  ELSIF NEW.banner_image IS DISTINCT FROM OLD.banner_image AND NEW.cover_url IS NULL THEN
    NEW.cover_url := NEW.banner_image;
  END IF;

  -- Уровень
  IF NEW.level IS DISTINCT FROM OLD.level THEN
    NEW.difficulty_level := NEW.level;
  ELSIF NEW.difficulty_level IS DISTINCT FROM OLD.difficulty_level AND NEW.level = 1 THEN
    NEW.level := NEW.difficulty_level;
  END IF;

  -- Стрик
  IF NEW.streak_count IS DISTINCT FROM OLD.streak_count THEN
    NEW.streak := NEW.streak_count;
  ELSIF NEW.streak IS DISTINCT FROM OLD.streak AND NEW.streak_count = 0 THEN
    NEW.streak_count := NEW.streak;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profiles_compat ON public.profiles;
CREATE TRIGGER trg_sync_profiles_compat
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_compat_columns();

-- ----------------------------------------------------------------------------
-- 3. ДНИ ДНЕВНИКА (days)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  day_number integer NOT NULL,
  title text NOT NULL DEFAULT '',
  date_iso text,
  day_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public')),
  closed_at timestamptz,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_days_user_client UNIQUE (user_id, client_id),
  CONSTRAINT uq_days_user_number UNIQUE (user_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_days_user_day_number ON public.days(user_id, day_number DESC);
CREATE INDEX IF NOT EXISTS idx_days_user_date ON public.days(user_id, date_iso);

-- ----------------------------------------------------------------------------
-- 4. ГОРДОСТИ (prides)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_id uuid REFERENCES public.days(id) ON DELETE CASCADE,
  day_client_id text,
  client_id text NOT NULL,
  position integer NOT NULL DEFAULT 1,
  num text NOT NULL DEFAULT '1',
  text text NOT NULL DEFAULT '',
  scale integer NOT NULL DEFAULT 5,
  overcome integer NOT NULL DEFAULT 0,
  ai_comment text,
  visibility text NOT NULL DEFAULT 'private',
  client_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_prides_user_client UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_prides_day_id ON public.prides(day_id);
CREATE INDEX IF NOT EXISTS idx_prides_user_day_client ON public.prides(user_id, day_client_id);

-- ----------------------------------------------------------------------------
-- 5. БЛАГОДАРНОСТИ (gratitudes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gratitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_id uuid REFERENCES public.days(id) ON DELETE CASCADE,
  day_client_id text,
  client_id text NOT NULL,
  position integer NOT NULL DEFAULT 1,
  num text NOT NULL DEFAULT '1',
  text text NOT NULL DEFAULT '',
  rating integer NOT NULL DEFAULT 5,
  visibility text NOT NULL DEFAULT 'private',
  client_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_gratitudes_user_client UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_gratitudes_day_id ON public.gratitudes(day_id);
CREATE INDEX IF NOT EXISTS idx_gratitudes_user_day_client ON public.gratitudes(user_id, day_client_id);

-- ----------------------------------------------------------------------------
-- 6. СОВМЕСТИМЫЙ VIEW ДЛЯ ДНЕВНИКА: diary_days
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.diary_days AS
SELECT
  d.id,
  d.user_id,
  d.day_number,
  coalesce(d.day_date, (d.date_iso)::date, (d.created_at)::date) AS day_date,
  CASE
    WHEN d.status = 'closed' THEN coalesce(d.closed_at, d.updated_at)
    ELSE NULL
  END AS closed_at,
  d.created_at,
  d.updated_at
FROM public.days d;

-- ----------------------------------------------------------------------------
-- 7. СТОРИС (stories)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id text,
  friend_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '🔥',
  kicker text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  from_color text NOT NULL DEFAULT '#FF5C00',
  to_color text NOT NULL DEFAULT '#FF8A00',
  accent text NOT NULL DEFAULT 'amber',
  background_id text,
  photo text,
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_day_id integer,
  source_pride_index integer,
  visibility text NOT NULL DEFAULT 'friends',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  client_updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_stories_user_expires ON public.stories(user_id, expires_at);

-- ----------------------------------------------------------------------------
-- 8. КОММЕНТАРИИ (comments)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id text,
  target_key text NOT NULL,
  day_client_id text,
  parent_client_id text,
  author text NOT NULL DEFAULT '',
  initials text NOT NULL DEFAULT '',
  text text NOT NULL DEFAULT '',
  likes integer NOT NULL DEFAULT 0,
  liked_by_me boolean NOT NULL DEFAULT false,
  is_mine boolean NOT NULL DEFAULT false,
  template text,
  persona text NOT NULL DEFAULT 'friend',
  created_at timestamptz NOT NULL DEFAULT now(),
  client_updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_comments_target_key ON public.comments(target_key);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- ----------------------------------------------------------------------------
-- 9. РЕАКЦИИ (reactions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id text,
  target_key text NOT NULL,
  target_kind text NOT NULL DEFAULT 'day',
  day_client_id text,
  position integer,
  emoji_id text NOT NULL DEFAULT 'fire',
  count integer NOT NULL DEFAULT 1,
  mine boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_reactions_target_key ON public.reactions(target_key);
CREATE INDEX IF NOT EXISTS idx_reactions_user_target ON public.reactions(user_id, target_key, emoji_id);

-- ----------------------------------------------------------------------------
-- 10. ХРАНИЛИЩЕ ДОКАЗАТЕЛЬСТВ И ФАКТОВ СИЛЫ (evidence_vault)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evidence_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id text NOT NULL,
  title text NOT NULL,
  topic text NOT NULL DEFAULT '',
  achieved_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  regulation jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  submission jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  verified_at timestamptz,
  reviewer_note text,
  moderator_status text NOT NULL DEFAULT 'unverified',
  tracking_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_vault_user_id ON public.evidence_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_vault_category ON public.evidence_vault(category_id);

-- ----------------------------------------------------------------------------
-- 11. ПРЯМЫЕ СООБЩЕНИЯ (direct_messages)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text,
  thread_key text NOT NULL,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '',
  attachment jsonb,
  reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  client_updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_thread_key ON public.direct_messages(thread_key, sent_at ASC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_unread ON public.direct_messages(recipient_id, is_read) WHERE is_read = false;

-- ----------------------------------------------------------------------------
-- 12. СЕССИИ ЗВОНКОВ (call_sessions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'connected', 'ended', 'declined', 'missed')),
  duration_seconds integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_caller ON public.call_sessions(caller_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver ON public.call_sessions(receiver_id, status);

-- ----------------------------------------------------------------------------
-- 13. ПОДПИСКИ (follows) — Односторонняя связь
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_follows_follower_following UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- ----------------------------------------------------------------------------
-- 14. СОРАТНИКИ / ДРУЖБА (friendships) — Двусторонняя связь
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  message text NOT NULL DEFAULT '',
  mutual_count integer NOT NULL DEFAULT 0,
  client_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_friendships_user_friend UNIQUE (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON public.friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON public.friendships(friend_id, status);

-- Миграция legacy значений дружбы:
-- 1. 'following' переносим в follows
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friendships' AND column_name = 'status') THEN
    INSERT INTO public.follows (follower_id, following_id)
    SELECT f.user_id, coalesce(f.friend_id, f.addressee_id)
    FROM public.friendships f
    WHERE f.status::text = 'following'
      AND coalesce(f.friend_id, f.addressee_id) IS NOT NULL
      AND f.user_id != coalesce(f.friend_id, f.addressee_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;

    -- 2. 'friend' переводим в 'accepted'
    UPDATE public.friendships
    SET status = 'accepted'::friendship_status
    WHERE status::text = 'friend';

    -- 3. 'incoming-request' / 'outgoing-request' переводим в 'pending'
    UPDATE public.friendships
    SET status = 'pending'::friendship_status
    WHERE status::text IN ('incoming-request', 'outgoing-request');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 15. ОТЛОЖЕННЫЕ СООБЩЕНИЯ (scheduled_messages)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_key text NOT NULL DEFAULT '',
  conversation_id uuid,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '',
  attachment jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at timestamptz NOT NULL,
  delivered boolean NOT NULL DEFAULT false,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_undelivered ON public.scheduled_messages(scheduled_at) WHERE delivered = false;

-- ----------------------------------------------------------------------------
-- 16. СВЯЗКИ ТЕЛЕГРАМА (telegram_links)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telegram_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_telegram_links_token ON public.telegram_links(token) WHERE used = false;

-- ----------------------------------------------------------------------------
-- 17. ОЦЕНКИ ИИ (ai_evaluations)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_id uuid REFERENCES public.days(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  evaluation jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback text NOT NULL DEFAULT '',
  score integer,
  model text NOT NULL DEFAULT 'gemini-2.5-flash',
  provider text NOT NULL DEFAULT 'gemini',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_evaluations_user_day ON public.ai_evaluations(user_id, day_number);

-- ----------------------------------------------------------------------------
-- 18. STORAGE БАКЕТЫ И ПОЛИТИКИ
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('ogonyok-media', 'ogonyok-media', true, 52428800, null),
  ('chat-media', 'chat-media', false, 52428800, null)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Удаляем устаревшие или небезопасные политики бакетов
DROP POLICY IF EXISTS "Public can view ogonyok-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to ogonyok-media own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files in ogonyok-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in ogonyok-media" ON storage.objects;

DROP POLICY IF EXISTS "Authorized users can access chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to chat-media own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in chat-media" ON storage.objects;

-- Политики для ogonyok-media (публичное чтение, запись в свою папку <uid>/...)
CREATE POLICY "Public can view ogonyok-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'ogonyok-media');

CREATE POLICY "Users can upload to ogonyok-media own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ogonyok-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own files in ogonyok-media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ogonyok-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own files in ogonyok-media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ogonyok-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Политики для chat-media (доступ авторизованных, запись в свою папку <uid>/...)
CREATE POLICY "Authorized users can access chat-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-media');

CREATE POLICY "Users can upload to chat-media own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own files in chat-media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ----------------------------------------------------------------------------
-- 19. ВКЛЮЧЕНИЕ ROW LEVEL SECURITY (RLS) НА ВСЕХ КАНОНИЧЕСКИХ ТАБЛИЦАХ
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
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

-- Удаление любых "allow_all_dev" политик
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE policyname ILIKE '%allow_all%' OR policyname ILIKE '%dev%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

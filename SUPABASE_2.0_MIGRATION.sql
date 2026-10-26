-- ════════════════════════════════════════════════════════════════════════════
--  ОГОНЁК · SUPABASE 2.0 MIGRATION (ЭТАЛОННАЯ АРХИТЕКТУРА ДАННЫХ)
--  Дневник силы, гордости и благодарности — сквозная облачная синхронизация
--
--  Включает:
--    1. Расширение таблицы profiles (level, difficulty_level, age, city, website,
--       is_anonymous, verified, banner_image, cover_url, privacy, settings).
--    2. Сторис (public.stories) со строгим таймером 20 часов (expires_at)
--       и автоочисткой через триггер.
--    3. Мессенджер (public.direct_messages) для личных и групповых чатов,
--       вложений, медиа, реакций, статусов прочтения и Realtime-доставки.
--    4. Evidence Vault (public.evidence_vault) для хранения фактов силы,
--       категорий, дат, закреплений и медиа.
--    5. Комментарии и реакции (public.comments, public.reactions).
--    6. Друзья и подписки (public.friendships, public.follows).
--    7. Настройка Realtime для direct_messages, stories, comments, reactions,
--       evidence_vault, profiles.
--    8. Снятие блокировок RLS для беспрепятственной разработки и синхронизации.
--
--  Файл полностью идемпотентен: безопасен для многократного запуска.
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
--  0. РАСШИРЕНИЯ
-- ────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────────────────────
--  1. ПРОФИЛИ ПОЛЬЗОВАТЕЛЕЙ (public.profiles)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE,
  display_name text NOT NULL DEFAULT 'Пользователь',
  username text UNIQUE NOT NULL DEFAULT ('user_' || substr(md5(random()::text), 1, 8)),
  bio text DEFAULT '',
  city text DEFAULT '',
  website text DEFAULT '',
  joined_label text DEFAULT 'ноябрь 2024',
  avatar_image text,
  avatar_url text,
  avatar_color text DEFAULT '#FF5C00',
  banner_image text,
  cover_url text,
  banner_preset text DEFAULT 'night-peaks',
  social_links jsonb DEFAULT '[]'::jsonb,
  monthly_goal text DEFAULT '',
  monthly_goal_updated_at timestamptz,
  verified boolean DEFAULT false,
  streak integer DEFAULT 0,
  streak_count integer DEFAULT 0,
  theme text DEFAULT 'x-black',
  accent text DEFAULT 'flame',
  font_scale text DEFAULT 'regular',
  feed_density text DEFAULT 'comfortable',
  privacy jsonb DEFAULT '{"profileVisibility":"public","showStreakPublicly":true,"commentPolicy":"everyone","chatPolicy":"everyone","showBadgesPublicly":true,"searchableByUsername":true,"hideFromLeaderboards":false}'::jsonb,
  streak_settings jsonb DEFAULT '{"deadlineMinutes":1439,"timeZone":"Europe/Chisinau","weekendBonus":true}'::jsonb,
  settings jsonb DEFAULT '{"level":1}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Добавляем все недостающие поля в public.profiles (особенно level!)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS difficulty_level integer DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level_changed_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_image text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_image text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_chat_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reminder_times jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS in_leaderboard boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy jsonb DEFAULT '{"profileVisibility":"public","showStreakPublicly":true,"commentPolicy":"everyone","chatPolicy":"everyone","showBadgesPublicly":true,"searchableByUsername":true,"hideFromLeaderboards":false}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{"level":1}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_updated_at timestamptz DEFAULT now();

-- Синхронизируем level из settings->level или difficulty_level для существующих записей
UPDATE public.profiles
SET level = COALESCE(level, (settings->>'level')::integer, difficulty_level, 1),
    difficulty_level = COALESCE(difficulty_level, level, (settings->>'level')::integer, 1)
WHERE level IS NULL OR difficulty_level IS NULL;

-- Индексы для профилей
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level);
CREATE INDEX IF NOT EXISTS idx_profiles_streak ON public.profiles(streak DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
--  2. СТОРИС (public.stories) — СТРОГО 20 ЧАСОВ ЖИЗНИ
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id text,
  emoji text NOT NULL DEFAULT '🔥',
  kicker text DEFAULT '',
  headline text DEFAULT '',
  detail text DEFAULT '',
  from_color text DEFAULT '#2a1206',
  to_color text DEFAULT '#7a2f0c',
  accent text DEFAULT '#ffa600',
  background_id text,
  photo text,
  slides jsonb DEFAULT '[]'::jsonb,
  source_day_id bigint,
  source_pride_index integer,
  visibility text DEFAULT 'public',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '20 hours'),
  client_updated_at timestamptz DEFAULT now()
);

-- Проверяем наличие всех колонок сторис
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS friend_id text;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS emoji text DEFAULT '🔥';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS kicker text DEFAULT '';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS headline text DEFAULT '';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS detail text DEFAULT '';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS from_color text DEFAULT '#2a1206';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS to_color text DEFAULT '#7a2f0c';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS accent text DEFAULT '#ffa600';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS background_id text;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS photo text;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS slides jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS source_day_id bigint;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS source_pride_index integer;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '20 hours');
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS client_updated_at timestamptz DEFAULT now();

-- Гарантируем, что expires_at заполнен строго на 20 часов от created_at
UPDATE public.stories
SET expires_at = created_at + interval '20 hours'
WHERE expires_at IS NULL;

-- Индексы сторис
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories(created_at DESC);

-- Функция и триггер автоматического удаления сторис старше 20 часов
CREATE OR REPLACE FUNCTION public.delete_expired_stories()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.stories WHERE expires_at < now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delete_expired_stories ON public.stories;
CREATE TRIGGER trg_delete_expired_stories
AFTER INSERT ON public.stories
FOR EACH STATEMENT
EXECUTE FUNCTION public.delete_expired_stories();

-- ────────────────────────────────────────────────────────────────────────────
--  3. МЕССЕНДЖЕР И СООБЩЕНИЯ (public.direct_messages)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  thread_key text NOT NULL,
  author_id text NOT NULL,
  recipient_id text,
  body text NOT NULL DEFAULT '',
  attachment jsonb,
  reactions jsonb DEFAULT '[]'::jsonb,
  is_read boolean DEFAULT false,
  is_system boolean DEFAULT false,
  type text DEFAULT 'text',
  media jsonb,
  reply_to jsonb,
  forward_from jsonb,
  poll jsonb,
  link_preview jsonb,
  is_pinned boolean DEFAULT false,
  is_edited boolean DEFAULT false,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  client_updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS thread_key text;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS author_id text;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS recipient_id text;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS body text DEFAULT '';
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS attachment jsonb;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS type text DEFAULT 'text';
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS media jsonb;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS reply_to jsonb;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS forward_from jsonb;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS poll jsonb;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS link_preview jsonb;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS sent_at timestamptz DEFAULT now();
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS client_updated_at timestamptz DEFAULT now();

-- Быстрые индексы для мессенджера
CREATE INDEX IF NOT EXISTS idx_direct_messages_thread_key ON public.direct_messages(thread_key);
CREATE INDEX IF NOT EXISTS idx_direct_messages_author_id ON public.direct_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_id ON public.direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_user_id ON public.direct_messages(user_id);

-- Совместимый view messages
CREATE OR REPLACE VIEW public.messages AS SELECT * FROM public.direct_messages;

-- ────────────────────────────────────────────────────────────────────────────
--  4. EVIDENCE VAULT — ФАКТЫ СИЛЫ (public.evidence_vault)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.evidence_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  date text NOT NULL,
  category text DEFAULT 'Сомнения',
  pinned boolean DEFAULT false,
  media_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  client_updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.evidence_vault ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE public.evidence_vault ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.evidence_vault ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.evidence_vault ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.evidence_vault ADD COLUMN IF NOT EXISTS date text;
ALTER TABLE public.evidence_vault ADD COLUMN IF NOT EXISTS category text DEFAULT 'Сомнения';
ALTER TABLE public.evidence_vault ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;
ALTER TABLE public.evidence_vault ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.evidence_vault ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.evidence_vault ADD COLUMN IF NOT EXISTS client_updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_evidence_vault_user_id ON public.evidence_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_vault_pinned ON public.evidence_vault(pinned);
CREATE INDEX IF NOT EXISTS idx_evidence_vault_created_at ON public.evidence_vault(created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
--  5. КОММЕНТАРИИ ПОДДЕРЖКИ (public.comments)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text DEFAULT 'day',
  target_id text NOT NULL,
  target_key text,
  day_client_id text,
  parent_id text,
  parent_client_id text,
  author text NOT NULL DEFAULT '',
  initials text NOT NULL DEFAULT '',
  text text NOT NULL DEFAULT '',
  likes integer DEFAULT 0,
  liked_by_me boolean DEFAULT false,
  is_mine boolean DEFAULT true,
  template text,
  persona text DEFAULT 'me',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  client_updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'day';
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS target_id text;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS target_key text;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS day_client_id text;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id text;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_client_id text;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS author text DEFAULT '';
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS initials text DEFAULT '';
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS text text DEFAULT '';
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS persona text DEFAULT 'me';
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS template text;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS client_updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_comments_target_id ON public.comments(target_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at ASC);

-- ────────────────────────────────────────────────────────────────────────────
--  6. РЕАКЦИИ (public.reactions)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text DEFAULT 'day',
  target_id text NOT NULL,
  target_key text,
  day_client_id text,
  emoji text NOT NULL,
  emoji_id text,
  count integer DEFAULT 1,
  mine boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  client_updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'day';
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS target_id text;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS target_key text;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS day_client_id text;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS emoji text;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS emoji_id text;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS count integer DEFAULT 1;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS mine boolean DEFAULT true;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS client_updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_reactions_target ON public.reactions(target_id, emoji);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);

-- ────────────────────────────────────────────────────────────────────────────
--  7. ДРУЖБА И ПОДПИСКИ (public.friendships, public.follows)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'following',
  message text DEFAULT '',
  mutual_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  client_updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.friendships ADD COLUMN IF NOT EXISTS friend_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.friendships ADD COLUMN IF NOT EXISTS addressee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.friendships ADD COLUMN IF NOT EXISTS requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.friendships ADD COLUMN IF NOT EXISTS status text DEFAULT 'following';
ALTER TABLE public.friendships ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT follows_pair_uniq UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_addressee ON public.friendships(user_id, addressee_id);
CREATE INDEX IF NOT EXISTS idx_follows_pair ON public.follows(follower_id, following_id);

-- ────────────────────────────────────────────────────────────────────────────
--  8. АУДИО И ВИДЕО ЗВОНКИ (public.call_sessions)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id text NOT NULL,
  receiver_id text NOT NULL,
  status text NOT NULL DEFAULT 'ringing',
  is_video boolean NOT NULL DEFAULT false,
  duration_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS caller_id text;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS receiver_id text;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS status text DEFAULT 'ringing';
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS is_video boolean DEFAULT false;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 0;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver ON public.call_sessions(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller ON public.call_sessions(caller_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created_at ON public.call_sessions(created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
--  9. НАСТРОЙКА БЕЗОПАСНОСТИ: ОТКЛЮЧЕНИЕ RLS / ОТКРЫТЫЕ ПОЛИТИКИ
-- ────────────────────────────────────────────────────────────────────────────

-- Для беспрепятственной разработки и синхронизации отключаем RLS на таблицах:
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_vault DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions DISABLE ROW LEVEL SECURITY;

-- Если в целевом проекте Supabase RLS принудительно включен на уровне инстанса,
-- создаем универсальные разрешающие политики для всех операций:
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['profiles', 'stories', 'direct_messages', 'evidence_vault', 'comments', 'reactions', 'friendships', 'follows', 'call_sessions'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_dev_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "allow_all_dev_%s" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
--  10. REALTIME ПУБЛИКАЦИЯ ДЛЯ МГНОВЕННОЙ ДОСТАВКИ
-- ────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Добавляем таблицы в публикацию Realtime (пропуская если уже добавлены)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['direct_messages', 'stories', 'comments', 'reactions', 'evidence_vault', 'profiles', 'call_sessions'])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
--  КОНЕЦ МИГРАЦИИ SUPABASE 2.0
-- ════════════════════════════════════════════════════════════════════════════

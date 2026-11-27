-- ============================================================================
-- 134_presence_and_comments_v2.sql
-- Единая идемпотентная миграция:
--   1. Честный онлайн-статус (profiles.last_seen_at)
--   2. Полноценные комментарии (public.comments + gif_url + ответы до 3 уровней)
--   3. Лайки комментариев (public.comment_likes)
--   4. Эмодзи-реакции на комментарии (public.comment_reactions)
--   5. RLS-политики (включая удаление автором комментария ИЛИ владельцем поста)
--   6. Realtime (REPLICA IDENTITY FULL + supabase_realtime) + reload schema
-- ============================================================================

-- 1. Честный last_seen_at в public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

UPDATE public.profiles
SET last_seen_at = COALESCE(last_seen_at, updated_at, created_at, now())
WHERE last_seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON public.profiles(last_seen_at DESC);

-- 2. Нормализация таблицы public.comments (включая gif_url)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_key text DEFAULT '',
  ADD COLUMN IF NOT EXISTS day_client_id text,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS parent_client_id text,
  ADD COLUMN IF NOT EXISTS post_author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS author text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS initials text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gif_url text,
  ADD COLUMN IF NOT EXISTS likes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Совместимость со старыми версиями схемы (target_type / target_id / author_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'target_type'
  ) THEN
    ALTER TABLE public.comments ALTER COLUMN target_type DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'target_id'
  ) THEN
    ALTER TABLE public.comments ALTER COLUMN target_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE public.comments ALTER COLUMN author_id DROP NOT NULL;
    EXECUTE 'UPDATE public.comments SET user_id = COALESCE(user_id, author_id) WHERE user_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'target_type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'target_id'
  ) THEN
    EXECUTE $sql$
      UPDATE public.comments
      SET target_key = CASE
        WHEN target_type = 'day' THEN 'day:' || target_id
        WHEN target_type = 'post' THEN 'post:' || target_id
        WHEN target_type = 'entry' THEN target_id
        ELSE target_id
      END
      WHERE COALESCE(target_key, '') = '' AND target_id IS NOT NULL
    $sql$;
  END IF;
END $$;

-- Удаляем старые фейковые демо-комментарии бота, если они попадали в БД
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'author'
  ) THEN
    DELETE FROM public.comments WHERE author IN ('Огонёк поддержки', 'Priday поддержки');
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'template'
  ) THEN
    DELETE FROM public.comments WHERE COALESCE(template, '') <> '';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'persona'
  ) THEN
    DELETE FROM public.comments WHERE persona = 'support';
  END IF;
END $$;

-- Бэкфилл post_author_id из целевого ключа u:<uuid>:...
UPDATE public.comments
SET post_author_id = NULLIF(split_part(target_key, ':', 2), '')::uuid
WHERE post_author_id IS NULL
  AND target_key ~ '^u:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}:';

CREATE INDEX IF NOT EXISTS idx_comments_target_key_created
  ON public.comments(target_key, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_comments_post_author_id
  ON public.comments(post_author_id);

CREATE INDEX IF NOT EXISTS idx_comments_parent_id
  ON public.comments(parent_id);

-- 3. RLS на public.comments:
--    - SELECT: авторизованные пользователи видят комментарии
--    - INSERT: от своего auth.uid(), текст до 2000 символов ИЛИ указан gif_url
--    - UPDATE: только свои комментарии
--    - DELETE: автор комментария ИЛИ владелец поста (post_author_id / days.user_id)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manage own comments" ON public.comments;
DROP POLICY IF EXISTS "View comments" ON public.comments;
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
  WITH CHECK (
    auth.uid() = user_id
    AND length(coalesce(text, '')) <= 2000
    AND (
      length(btrim(coalesce(text, ''))) BETWEEN 1 AND 2000
      OR length(btrim(coalesce(gif_url, ''))) > 0
    )
  );

CREATE POLICY "comments_update"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete"
  ON public.comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = post_author_id
    OR target_key LIKE ('u:' || auth.uid()::text || ':%')
    OR (
      day_client_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.days d
        WHERE d.user_id = auth.uid()
          AND (
            d.id::text = comments.day_client_id
            OR d.client_id = comments.day_client_id
            OR d.day_number::text = comments.day_client_id
          )
      )
    )
  );

-- 4. Таблица лайков комментариев (public.comment_likes)
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_comment_likes_comment_user UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id
  ON public.comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id
  ON public.comment_likes(user_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_likes_select" ON public.comment_likes;
DROP POLICY IF EXISTS "comment_likes_insert" ON public.comment_likes;
DROP POLICY IF EXISTS "comment_likes_delete" ON public.comment_likes;

CREATE POLICY "comment_likes_select"
  ON public.comment_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "comment_likes_insert"
  ON public.comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comment_likes_delete"
  ON public.comment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Таблица эмодзи-реакций на комментарии (public.comment_reactions)
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_comment_reactions_user_emoji UNIQUE (comment_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id
  ON public.comment_reactions(comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id
  ON public.comment_reactions(user_id);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_reactions_select" ON public.comment_reactions;
DROP POLICY IF EXISTS "comment_reactions_insert" ON public.comment_reactions;
DROP POLICY IF EXISTS "comment_reactions_delete" ON public.comment_reactions;

CREATE POLICY "comment_reactions_select"
  ON public.comment_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "comment_reactions_insert"
  ON public.comment_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND length(btrim(emoji)) BETWEEN 1 AND 16
  );

CREATE POLICY "comment_reactions_delete"
  ON public.comment_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. REPLICA IDENTITY FULL + Realtime для comments, comment_likes, comment_reactions
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.comment_likes REPLICA IDENTITY FULL;
ALTER TABLE public.comment_reactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comment_likes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comment_reactions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_reactions;
    END IF;
  END IF;
END $$;

-- Мгновенно обновляем schema cache PostgREST для новых колонок (gif_url) и таблиц
NOTIFY pgrst, 'reload schema';

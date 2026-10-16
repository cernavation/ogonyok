-- ════════════════════════════════════════════════════════════════════════════
--  ОГОНЁК · ПОЛНАЯ АРХИТЕКТУРА SUPABASE  (ЭТАП 19)
--  Дневник гордости и благодарности — серверная схема одной миграцией.
--
--  Как применить:
--    1) Открой проект на https://supabase.com (или локальный supabase start)
--    2) SQL Editor → New query → вставь весь этот файл → Run
--    3) Скопируй Project URL и anon public key в .env.local:
--         NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
--         NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
--       После этого клиент lib/ogonek/supabase-sync.ts подхватит ключи и
--       включит автоматическую offline-first синхронизацию.
--
--  Схема идемпотентна: файл можно запускать повторно без потери данных.
--
--  Таблицы:
--    ОБЯЗАТЕЛЬНЫЕ ПО ТЗ:
--      profiles · days · prides · gratitudes · achievements_verifications ·
--      stories · friendships · reactions · comments · direct_messages
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
--  0. РАСШИРЕНИЯ И ОБЩИЕ ХЕЛПЕРЫ
-- ────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- Автоматическая простановка updated_at при любом UPDATE.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Автосоздание публичного профиля при регистрации пользователя в auth.users.
-- Работает и для анонимного входа (Supabase Anonymous Sign-In): тогда имя
-- и username генерируются из id, а профиль всё равно появляется сразу.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, client_id, display_name, username, verified)
  values (
    new.id,
    new.id::text,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Огонёк'
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      'ogon-' || replace(new.id::text, '-', '')
    ),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
--  1. PROFILES — публичный профиль пользователя Огонька
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id                        uuid primary key references auth.users (id) on delete cascade,
  client_id                 text not null default ''            -- детерминированный ключ upsert из клиента
    check (char_length(client_id) <= 120),
  display_name              text not null default 'Огонёк'      check (char_length(display_name) <= 120),
  username                  text not null                       check (char_length(username) between 1 and 60),
  bio                       text not null default ''            check (char_length(bio) <= 600),
  city                      text not null default ''            check (char_length(city) <= 120),
  website                   text not null default ''            check (char_length(website) <= 400),
  joined_label              text not null default '',
  avatar_image              text,
  avatar_color              text not null default '',
  banner_image              text,
  banner_preset             text not null default 'night-peaks',
  social_links              jsonb not null default '[]'::jsonb,
  monthly_goal              text not null default ''            check (char_length(monthly_goal) <= 400),
  monthly_goal_updated_at   timestamptz,
  verified                  boolean not null default false,
  streak_count              integer not null default 0          check (streak_count >= 0),
  -- Настройки внешнего вида, приватности и стрика (снимками, без отдельной таблицы)
  theme                     text not null default 'x-black',
  accent                    text not null default 'flame',
  font_scale                text not null default 'regular',
  feed_density              text not null default 'cozy',
  privacy                   jsonb not null default '{}'::jsonb,
  streak_settings           jsonb not null default '{}'::jsonb,
  settings                  jsonb not null default '{}'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  client_updated_at         timestamptz not null default now()
);

create unique index if not exists profiles_username_key on public.profiles (lower(username));
create index if not exists profiles_client_id_idx on public.profiles (client_id);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles
  for select to authenticated
  using ((privacy ->> 'profileVisibility') = 'public');

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
--  2. DAYS — карточка дня летописи
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.days (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  client_id          text not null                              -- локальный id дня (строкой)
    check (char_length(client_id) between 1 and 120),
  title              text not null default 'Запись дня'         check (char_length(title) <= 300),
  tags               jsonb not null default '[]'::jsonb,
  photos             jsonb not null default '[]'::jsonb,
  date_iso           timestamptz,
  day_number         integer,
  status             text not null default 'normal'             check (status in ('normal', 'missed')),
  visibility         text not null default 'public'             check (visibility in ('public', 'friends', 'private')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  client_updated_at  timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists days_user_date_idx on public.days (user_id, date_iso desc nulls last);
create index if not exists days_user_visibility_idx on public.days (user_id, visibility);
create index if not exists days_client_id_idx on public.days (client_id);

alter table public.days enable row level security;

drop policy if exists "days_select_own" on public.days;
create policy "days_select_own" on public.days
  for select using (auth.uid() = user_id);

drop policy if exists "days_select_public" on public.days;
create policy "days_select_public" on public.days
  for select to authenticated
  using (visibility = 'public');

drop policy if exists "days_insert_own" on public.days;
create policy "days_insert_own" on public.days
  for insert with check (auth.uid() = user_id);

drop policy if exists "days_update_own" on public.days;
create policy "days_update_own" on public.days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "days_delete_own" on public.days;
create policy "days_delete_own" on public.days
  for delete using (auth.uid() = user_id);

drop trigger if exists trg_days_updated_at on public.days;
create trigger trg_days_updated_at
  before update on public.days
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
--  3. PRIDES — гордости дня (пункты силы)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.prides (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  day_client_id      text not null,
  client_id          text not null
    check (char_length(client_id) between 1 and 160),
  position           integer not null default 0                 check (position >= 0),
  num                text not null default '01',
  text               text not null default ''                   check (char_length(text) <= 1200),
  scale              smallint not null default 0                check (scale between 0 and 10),
  overcome           smallint not null default 0                check (overcome between 0 and 3),
  visibility         text not null default 'public'             check (visibility in ('public', 'friends', 'private')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  client_updated_at  timestamptz not null default now(),
  unique (user_id, client_id),
  constraint prides_day_fk foreign key (user_id, day_client_id)
    references public.days (user_id, client_id) on delete cascade
);

create index if not exists prides_day_idx on public.prides (user_id, day_client_id, position);
create index if not exists prides_visibility_idx on public.prides (visibility);

alter table public.prides enable row level security;

drop policy if exists "prides_select_own" on public.prides;
create policy "prides_select_own" on public.prides
  for select using (auth.uid() = user_id);

drop policy if exists "prides_select_public" on public.prides;
create policy "prides_select_public" on public.prides
  for select to authenticated
  using (
    visibility = 'public'
    and exists (
      select 1 from public.days d
      where d.user_id = prides.user_id
        and d.client_id = prides.day_client_id
        and d.visibility = 'public'
    )
  );

drop policy if exists "prides_insert_own" on public.prides;
create policy "prides_insert_own" on public.prides
  for insert with check (auth.uid() = user_id);

drop policy if exists "prides_update_own" on public.prides;
create policy "prides_update_own" on public.prides
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "prides_delete_own" on public.prides;
create policy "prides_delete_own" on public.prides
  for delete using (auth.uid() = user_id);

drop trigger if exists trg_prides_updated_at on public.prides;
create trigger trg_prides_updated_at
  before update on public.prides
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
--  4. GRATITUDES — благодарности дня
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.gratitudes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  day_client_id      text not null,
  client_id          text not null
    check (char_length(client_id) between 1 and 160),
  position           integer not null default 0                 check (position >= 0),
  num                text,
  text               text not null default ''                   check (char_length(text) <= 1200),
  rating             smallint not null default 10               check (rating between 0 and 10),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  client_updated_at  timestamptz not null default now(),
  unique (user_id, client_id),
  constraint gratitudes_day_fk foreign key (user_id, day_client_id)
    references public.days (user_id, client_id) on delete cascade
);

create index if not exists gratitudes_day_idx on public.gratitudes (user_id, day_client_id, position);

alter table public.gratitudes enable row level security;

drop policy if exists "gratitudes_select_own" on public.gratitudes;
create policy "gratitudes_select_own" on public.gratitudes
  for select using (auth.uid() = user_id);

drop policy if exists "gratitudes_select_public" on public.gratitudes;
create policy "gratitudes_select_public" on public.gratitudes
  for select to authenticated
  using (
    exists (
      select 1 from public.days d
      where d.user_id = gratitudes.user_id
        and d.client_id = gratitudes.day_client_id
        and d.visibility = 'public'
    )
  );

drop policy if exists "gratitudes_insert_own" on public.gratitudes;
create policy "gratitudes_insert_own" on public.gratitudes
  for insert with check (auth.uid() = user_id);

drop policy if exists "gratitudes_update_own" on public.gratitudes;
create policy "gratitudes_update_own" on public.gratitudes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "gratitudes_delete_own" on public.gratitudes;
create policy "gratitudes_delete_own" on public.gratitudes
  for delete using (auth.uid() = user_id);

drop trigger if exists trg_gratitudes_updated_at on public.gratitudes;
create trigger trg_gratitudes_updated_at
  before update on public.gratitudes
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
--  5. ACHIEVEMENTS_VERIFICATIONS — верифицированные ачивки и заявки
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.achievements_verifications (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  client_id          text not null
    check (char_length(client_id) between 1 and 120),
  category_id        text not null
    check (category_id in ('sport-record', 'business', 'education', 'discipline')),
  title              text not null default 'Ачивка'             check (char_length(title) <= 200),
  topic              text not null default ''                   check (char_length(topic) <= 600),
  achieved_at        timestamptz,
  status             text not null default 'draft'              check (status in ('draft', 'submitted', 'verified', 'rejected')),
  regulation         jsonb,
  evidence           jsonb not null default '[]'::jsonb,
  submission         jsonb,
  submitted_at       timestamptz,
  verified_at        timestamptz,
  reviewer_note      text,
  moderator_status   text check (moderator_status in ('on-moderation', 'officially-verified', 'needs-clarification')),
  tracking_code      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  client_updated_at  timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists achv_user_status_idx on public.achievements_verifications (user_id, status);
create index if not exists achv_tracking_idx on public.achievements_verifications (tracking_code);
create index if not exists achv_verified_public_idx on public.achievements_verifications (status, verified_at desc nulls last);

alter table public.achievements_verifications enable row level security;

drop policy if exists "achv_select_own" on public.achievements_verifications;
create policy "achv_select_own" on public.achievements_verifications
  for select using (auth.uid() = user_id);

drop policy if exists "achv_select_verified" on public.achievements_verifications;
create policy "achv_select_verified" on public.achievements_verifications
  for select to authenticated
  using (status = 'verified');

drop policy if exists "achv_insert_own" on public.achievements_verifications;
create policy "achv_insert_own" on public.achievements_verifications
  for insert with check (auth.uid() = user_id);

drop policy if exists "achv_update_own" on public.achievements_verifications;
create policy "achv_update_own" on public.achievements_verifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "achv_delete_own" on public.achievements_verifications;
create policy "achv_delete_own" on public.achievements_verifications
  for delete using (auth.uid() = user_id);

drop trigger if exists trg_achv_updated_at on public.achievements_verifications;
create trigger trg_achv_updated_at
  before update on public.achievements_verifications
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
--  6. STORIES — личные и дружеские сторис (кадры 9:16)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.stories (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  client_id           text not null
    check (char_length(client_id) between 1 and 120),
  friend_id           text,                                     -- id автора из социального графа
  emoji               text not null default '✨',
  kicker              text not null default 'СТОРИС'            check (char_length(kicker) <= 60),
  headline            text not null default ''                  check (char_length(headline) <= 200),
  detail              text not null default ''                  check (char_length(detail) <= 400),
  from_color          text not null default '#2a1206',
  to_color            text not null default '#7a2f0c',
  accent              text not null default '#ffa600',
  background_id       text,
  photo               text,
  slides              jsonb not null default '[]'::jsonb,       -- для сторис друга (набор кадров)
  source_day_id       integer,
  source_pride_index  integer,
  visibility          text not null default 'public'            check (visibility in ('public', 'friends', 'private')),
  expires_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  client_updated_at   timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists stories_user_created_idx on public.stories (user_id, created_at desc);
create index if not exists stories_user_visibility_idx on public.stories (user_id, visibility);
create index if not exists stories_expires_idx on public.stories (expires_at);
create index if not exists stories_friend_idx on public.stories (friend_id);

alter table public.stories enable row level security;

drop policy if exists "stories_select_own" on public.stories;
create policy "stories_select_own" on public.stories
  for select using (auth.uid() = user_id);

drop policy if exists "stories_select_public" on public.stories;
create policy "stories_select_public" on public.stories
  for select to authenticated
  using (visibility = 'public' and (expires_at is null or expires_at > now()));

drop policy if exists "stories_insert_own" on public.stories;
create policy "stories_insert_own" on public.stories
  for insert with check (auth.uid() = user_id);

drop policy if exists "stories_update_own" on public.stories;
create policy "stories_update_own" on public.stories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "stories_delete_own" on public.stories;
create policy "stories_delete_own" on public.stories
  for delete using (auth.uid() = user_id);

drop trigger if exists trg_stories_updated_at on public.stories;
create trigger trg_stories_updated_at
  before update on public.stories
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
--  7. FRIENDSHIPS — социальный граф (друзья, подписки, заявки)
-- ════════════════════════════════════════════════════════════════════════════
--  status:
--    'friend'            — взаимная дружба
--    'following'         — подписка без взаимности
--    'incoming-request'  — входящая заявка пользователю
--    'outgoing-request'  — исходящая заявка от пользователя
--    'dismissed'         — скрытая рекомендация

create table if not exists public.friendships (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  addressee_id       text not null                              -- id друга в социальном графе
    check (char_length(addressee_id) between 1 and 120),
  requester_id       uuid references auth.users (id) on delete set null,
  status             text not null default 'following'
    check (status in ('friend', 'following', 'incoming-request', 'outgoing-request', 'dismissed')),
  message            text not null default ''                   check (char_length(message) <= 600),
  mutual_count       integer not null default 0                 check (mutual_count >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  client_updated_at  timestamptz not null default now(),
  unique (user_id, addressee_id)
);

create index if not exists friendships_user_status_idx on public.friendships (user_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_requester_idx on public.friendships (requester_id);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_involved" on public.friendships;
create policy "friendships_select_involved" on public.friendships
  for select using (auth.uid() = user_id or auth.uid() = requester_id);

drop policy if exists "friendships_insert_own" on public.friendships;
create policy "friendships_insert_own" on public.friendships
  for insert with check (auth.uid() = user_id);

drop policy if exists "friendships_update_own" on public.friendships;
create policy "friendships_update_own" on public.friendships
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own" on public.friendships
  for delete using (auth.uid() = user_id);

drop trigger if exists trg_friendships_updated_at on public.friendships;
create trigger trg_friendships_updated_at
  before update on public.friendships
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
--  8. REACTIONS — живые огоньки-реакции на дни и гордости
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.reactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  client_id          text not null
    check (char_length(client_id) between 1 and 200),
  target_key         text not null                              -- "day:12", "day:12:pride:0", "day:12:grat:2"
    check (char_length(target_key) between 1 and 160),
  target_kind        text not null default 'day'                check (target_kind in ('day', 'pride', 'gratitude')),
  day_client_id      text,
  position           integer,
  emoji_id           text not null                              -- id смайлика из конструктора реакций
    check (char_length(emoji_id) between 1 and 80),
  count              integer not null default 1                 check (count >= 0),
  mine               boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  client_updated_at  timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists reactions_target_idx on public.reactions (target_key);
create index if not exists reactions_user_emoji_idx on public.reactions (user_id, emoji_id);
create index if not exists reactions_day_idx on public.reactions (user_id, day_client_id);

alter table public.reactions enable row level security;

drop policy if exists "reactions_select_own" on public.reactions;
create policy "reactions_select_own" on public.reactions
  for select using (auth.uid() = user_id);

drop policy if exists "reactions_select_authenticated" on public.reactions;
create policy "reactions_select_authenticated" on public.reactions
  for select to authenticated using (true);

drop policy if exists "reactions_insert_own" on public.reactions;
create policy "reactions_insert_own" on public.reactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "reactions_update_own" on public.reactions;
create policy "reactions_update_own" on public.reactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reactions_delete_own" on public.reactions;
create policy "reactions_delete_own" on public.reactions
  for delete using (auth.uid() = user_id);

drop trigger if exists trg_reactions_updated_at on public.reactions;
create trigger trg_reactions_updated_at
  before update on public.reactions
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
--  9. COMMENTS — комментарии поддержки (дерево через parent_client_id)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.comments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  client_id          text not null
    check (char_length(client_id) between 1 and 160),
  target_key         text not null
    check (char_length(target_key) between 1 and 160),
  day_client_id      text,
  parent_client_id   text,
  author             text not null default 'Alexei Cerna'       check (char_length(author) <= 120),
  initials           text not null default 'AC'                 check (char_length(initials) <= 8),
  text               text not null default ''                   check (char_length(text) <= 1200),
  likes              integer not null default 0                 check (likes >= 0),
  liked_by_me        boolean not null default false,
  is_mine            boolean not null default true,
  template           text,
  persona            text not null default 'me'                 check (persona in ('me', 'support')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  client_updated_at  timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists comments_target_idx on public.comments (target_key, created_at);
create index if not exists comments_parent_idx on public.comments (user_id, parent_client_id);
create index if not exists comments_day_idx on public.comments (user_id, day_client_id);

alter table public.comments enable row level security;

drop policy if exists "comments_select_own" on public.comments;
create policy "comments_select_own" on public.comments
  for select using (auth.uid() = user_id);

drop policy if exists "comments_select_authenticated" on public.comments;
create policy "comments_select_authenticated" on public.comments
  for select to authenticated using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete using (auth.uid() = user_id);

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at
  before update on public.comments
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
--  10. DIRECT_MESSAGES — встроенный мессенджер (сообщения чатов)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.direct_messages (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  client_id          text not null
    check (char_length(client_id) between 1 and 160),
  thread_key         text not null                              -- id друга-собеседника
    check (char_length(thread_key) between 1 and 120),
  author_id          text not null default 'me'                 -- 'me' или id друга
    check (char_length(author_id) between 1 and 120),
  recipient_id       text,
  body               text not null default ''                   check (char_length(body) <= 4000),
  attachment         jsonb,
  reactions          jsonb not null default '[]'::jsonb,
  is_read            boolean not null default false,
  is_system          boolean not null default false,
  sent_at            timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  client_updated_at  timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists dm_thread_idx on public.direct_messages (user_id, thread_key, sent_at);
create index if not exists dm_recipient_idx on public.direct_messages (recipient_id, sent_at desc);
create index if not exists dm_created_idx on public.direct_messages (user_id, created_at desc);

alter table public.direct_messages enable row level security;

drop policy if exists "dm_select_involved" on public.direct_messages;
create policy "dm_select_involved" on public.direct_messages
  for select using (auth.uid() = user_id or auth.uid()::text = recipient_id);

drop policy if exists "dm_insert_own" on public.direct_messages;
create policy "dm_insert_own" on public.direct_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "dm_update_own" on public.direct_messages;
create policy "dm_update_own" on public.direct_messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "dm_delete_own" on public.direct_messages;
create policy "dm_delete_own" on public.direct_messages
  for delete using (auth.uid() = user_id);

drop trigger if exists trg_dm_updated_at on public.direct_messages;
create trigger trg_dm_updated_at
  before update on public.direct_messages
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
--  11. СЛУЖЕБНЫЕ ПРЕДСТАВЛЕНИЯ И RPC ДЛЯ СИНХРОНИЗАЦИИ
-- ════════════════════════════════════════════════════════════════════════════

-- Полный снимок летописи текущего пользователя одним вызовом (для быстрого pull).
create or replace function public.ogonok_pull_snapshot()
returns jsonb
language sql
security invoker
stable
as $$
  select jsonb_build_object(
    'days', coalesce((select jsonb_agg(d order by d.date_iso desc nulls last) from public.days d where d.user_id = auth.uid()), '[]'::jsonb),
    'prides', coalesce((select jsonb_agg(p order by p.position) from public.prides p where p.user_id = auth.uid()), '[]'::jsonb),
    'gratitudes', coalesce((select jsonb_agg(g order by g.position) from public.gratitudes g where g.user_id = auth.uid()), '[]'::jsonb),
    'achievements_verifications', coalesce((select jsonb_agg(a order by a.created_at desc) from public.achievements_verifications a where a.user_id = auth.uid()), '[]'::jsonb),
    'stories', coalesce((select jsonb_agg(s order by s.created_at desc) from public.stories s where s.user_id = auth.uid()), '[]'::jsonb),
    'friendships', coalesce((select jsonb_agg(f order by f.updated_at desc) from public.friendships f where f.user_id = auth.uid()), '[]'::jsonb),
    'reactions', coalesce((select jsonb_agg(r order by r.created_at) from public.reactions r where r.user_id = auth.uid()), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(c order by c.created_at) from public.comments c where c.user_id = auth.uid()), '[]'::jsonb),
    'direct_messages', coalesce((select jsonb_agg(m order by m.sent_at) from public.direct_messages m where m.user_id = auth.uid()), '[]'::jsonb),
    'profile', coalesce((select to_jsonb(pf) from public.profiles pf where pf.id = auth.uid()), 'null'::jsonb)
  );
$$;

-- Сводная статистика пользователя (дни, гордости, благодарности, ачивки…).
create or replace function public.ogonok_user_stats()
returns jsonb
language sql
security invoker
stable
as $$
  select jsonb_build_object(
    'days', (select count(*) from public.days where user_id = auth.uid()),
    'prides', (select count(*) from public.prides where user_id = auth.uid()),
    'gratitudes', (select count(*) from public.gratitudes where user_id = auth.uid()),
    'achievements', (select count(*) from public.achievements_verifications where user_id = auth.uid()),
    'verified', (select count(*) from public.achievements_verifications where user_id = auth.uid() and status = 'verified'),
    'stories', (select count(*) from public.stories where user_id = auth.uid()),
    'friends', (select count(*) from public.friendships where user_id = auth.uid() and status = 'friend'),
    'reactions', (select coalesce(sum(count), 0) from public.reactions where user_id = auth.uid()),
    'comments', (select count(*) from public.comments where user_id = auth.uid()),
    'messages', (select count(*) from public.direct_messages where user_id = auth.uid())
  );
$$;

grant execute on function public.ogonok_pull_snapshot() to authenticated, anon;
grant execute on function public.ogonok_user_stats() to authenticated, anon;

-- ════════════════════════════════════════════════════════════════════════════
--  12. ТРИГГЕР СОЗДАНИЯ ПРОФИЛЯ
-- ════════════════════════════════════════════════════════════════════════════

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════════
--  ГОТОВО. Включи в Authentication → Providers.
--  Для бесшовного первого запуска без экрана логина включи
--  Authentication → Sign In / Providers → Anonymous Sign-Ins.
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
--  ОГОНЁК · ПОЛНАЯ СХЕМА БАЗЫ ДАННЫХ SUPABASE (PRODUCT_SPEC.md)
--  Идемпотентный скрипт: можно запускать повторно в Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════

-- 0. Расширения
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Функция автоматического обновления updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ТАБЛИЦА ПРОФИЛЕЙ (profiles)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text default '',
  city text default '',
  level int not null default 3 check (level between 1 and 5),
  level_changed_at timestamptz not null default now(),
  timezone text not null default 'Europe/Chisinau',
  telegram_chat_id text,
  reminder_times jsonb not null default '["21:00"]'::jsonb,
  in_leaderboard boolean not null default true,
  streak int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_in_leaderboard on public.profiles(in_leaderboard) where in_leaderboard = true;
create index if not exists idx_profiles_streak on public.profiles(streak desc);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. ДНИ ДНЕВНИКА (diary_days)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.diary_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  day_number int not null,
  day_date date not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_user_day_number unique (user_id, day_number)
);

create index if not exists idx_diary_days_user_date on public.diary_days(user_id, day_date);
create index if not exists idx_diary_days_user_number on public.diary_days(user_id, day_number desc);
create index if not exists idx_diary_days_closed_at on public.diary_days(user_id, closed_at);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. ЗАПИСИ ДНЯ (entries: гордости и благодарности)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  day_id uuid references public.diary_days(id) on delete cascade not null,
  type text not null check (type in ('pride', 'gratitude')),
  num text default '01',
  text text not null,
  score int check (score between 1 and 10),
  ai_comment text,
  overcome int default 0 check (overcome between 0 and 3),
  tags text[] default '{}',
  visibility text not null default 'private' check (visibility in ('public', 'friends', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_entries_user_type on public.entries(user_id, type);
create index if not exists idx_entries_day on public.entries(day_id);
create index if not exists idx_entries_visibility on public.entries(visibility);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. ПОСТЫ В ЛЕНТУ (posts)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  entry_id uuid references public.entries(id) on delete set null,
  text text not null,
  type text not null default 'pride' check (type in ('pride', 'gratitude')),
  visibility text not null default 'public' check (visibility in ('public', 'friends', 'private')),
  score int check (score between 1 and 10),
  ai_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_user_created on public.posts(user_id, created_at desc);
create index if not exists idx_posts_visibility on public.posts(visibility, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. РЕАКЦИИ (reactions)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  target_type text not null check (target_type in ('entry', 'post', 'story', 'message', 'comment')),
  target_id text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint uq_user_reaction unique (user_id, target_type, target_id, emoji)
);

create index if not exists idx_reactions_target on public.reactions(target_type, target_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. КОММЕНТАРИИ (comments)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  target_type text not null check (target_type in ('entry', 'post', 'day')),
  target_id text not null,
  text text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comments_target on public.comments(target_type, target_id, created_at asc);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. ПОДПИСКИ И ДРУЗЬЯ (follows)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint uq_follow_pair unique (follower_id, following_id),
  constraint chk_no_self_follow check (follower_id <> following_id)
);

create index if not exists idx_follows_follower on public.follows(follower_id);
create index if not exists idx_follows_following on public.follows(following_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. СТОРИС (stories, 24 часа)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  media_url text,
  text text,
  background text default 'bg-0',
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create index if not exists idx_stories_user_expires on public.stories(user_id, expires_at);
create index if not exists idx_stories_active on public.stories(expires_at) where expires_at > now();

-- ────────────────────────────────────────────────────────────────────────────
-- 9. ДИАЛОГИ И МЕССЕНДЖЕР (conversations, members, messages)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct', 'group')),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint uq_conv_member unique (conversation_id, user_id)
);

create index if not exists idx_conv_members_user on public.conversation_members(user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  attachment jsonb,
  reply_to_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conv_created on public.messages(conversation_id, created_at asc);

-- ────────────────────────────────────────────────────────────────────────────
-- 10. СТРИКИ (streaks)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.streaks (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_closed_day_number int not null default 0,
  last_closed_calendar_date date,
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 11. УТРЕННИЕ И ВЕЧЕРНИЕ НАМЕРЕНИЯ (intentions)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  main_step text default '',
  for_self text default '',
  if_time_left text default '',
  completed_steps text[] default '{}',
  evening_note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_user_intention_date unique (user_id, date)
);

create index if not exists idx_intentions_user_date on public.intentions(user_id, date desc);

-- ────────────────────────────────────────────────────────────────────────────
-- 12. EVIDENCE VAULT (evidence)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  category text not null default 'general',
  file_url text,
  file_type text,
  pinned boolean not null default false,
  entry_id uuid references public.entries(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_evidence_user on public.evidence(user_id, pinned desc, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- 13. ИИ-ОЦЕНКИ (ai_evaluations)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  day_id uuid references public.diary_days(id) on delete cascade not null,
  type text not null check (type in ('pride', 'gratitude')),
  results jsonb not null,
  day_summary text,
  created_at timestamptz not null default now(),
  constraint uq_user_day_ai unique (user_id, day_id, type)
);

-- ────────────────────────────────────────────────────────────────────────────
-- 14. ОДНОРАЗОВЫЕ ССЫЛКИ ДЛЯ TELEGRAM (telegram_links)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  code text unique not null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_tg_links_code on public.telegram_links(code);

-- ────────────────────────────────────────────────────────────────────────────
-- 15. ТРИГГЕРЫ ОБНОВЛЕНИЯ UPDATED_AT
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  drop trigger if exists trg_profiles_updated on public.profiles;
  create trigger trg_profiles_updated before update on public.profiles
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_diary_days_updated on public.diary_days;
  create trigger trg_diary_days_updated before update on public.diary_days
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_entries_updated on public.entries;
  create trigger trg_entries_updated before update on public.entries
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_posts_updated on public.posts;
  create trigger trg_posts_updated before update on public.posts
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_comments_updated on public.comments;
  create trigger trg_comments_updated before update on public.comments
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_conversations_updated on public.conversations;
  create trigger trg_conversations_updated before update on public.conversations
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_intentions_updated on public.intentions;
  create trigger trg_intentions_updated before update on public.intentions
    for each row execute function public.set_updated_at();
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 16. ТРИГГЕР СОЗДАНИЯ ПРОФИЛЯ ПРИ РЕГИСТРАЦИИ (auth.users -> profiles)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  raw_username text;
  final_username text;
  raw_display text;
  user_level int;
begin
  raw_username := lower(trim(coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1),
    'user'
  )));
  
  -- Очистка никнейма от спецсимволов
  raw_username := regexp_replace(raw_username, '[^a-z0-9_-]', '', 'g');
  if raw_username = '' then raw_username := 'user'; end if;
  
  -- Обеспечение уникальности никнейма
  final_username := raw_username;
  if exists (select 1 from public.profiles where username = final_username and id <> new.id) then
    final_username := raw_username || '_' || substr(new.id::text, 1, 5);
  end if;

  raw_display := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    final_username
  );

  user_level := coalesce(
    (new.raw_user_meta_data ->> 'level')::int,
    3
  );
  if user_level < 1 or user_level > 5 then user_level := 3; end if;

  insert into public.profiles (
    id,
    username,
    display_name,
    level,
    level_changed_at,
    timezone
  )
  values (
    new.id,
    final_username,
    raw_display,
    user_level,
    now(),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'Europe/Chisinau')
  )
  on conflict (id) do update set
    username = excluded.username,
    display_name = excluded.display_name,
    updated_at = now();

  -- Инициализация записи стрика
  insert into public.streaks (user_id, current_streak, longest_streak)
  values (new.id, 0, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Навешивание триггера на auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- 17. БИЗНЕС-ЛОГИКА: ПРАВИЛА 1-6 ДНЕЙ И СТРИКА (PRODUCT_SPEC.md)
-- ────────────────────────────────────────────────────────────────────────────
-- Функция проверки возможности смены уровня сложности (раз в 30 дней)
create or replace function public.can_change_level(p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_changed_at timestamptz;
  v_days_left int;
begin
  select level_changed_at into v_changed_at from public.profiles where id = p_user_id;
  if v_changed_at is null then
    return jsonb_build_object('allowed', true, 'days_left', 0);
  end if;

  v_days_left := 30 - extract(day from (now() - v_changed_at))::int;
  if v_days_left <= 0 then
    return jsonb_build_object('allowed', true, 'days_left', 0);
  else
    return jsonb_build_object('allowed', false, 'days_left', v_days_left);
  end if;
end;
$$;

-- Функция безопасной смены уровня
create or replace function public.set_difficulty_level(p_user_id uuid, p_level int)
returns jsonb language plpgsql security definer as $$
declare
  v_check jsonb;
begin
  if p_level < 1 or p_level > 5 then
    return jsonb_build_object('success', false, 'error', 'Уровень должен быть от 1 до 5');
  end if;

  v_check := public.can_change_level(p_user_id);
  if not (v_check ->> 'allowed')::boolean then
    return jsonb_build_object(
      'success', false,
      'error', 'Следующая смена через ' || (v_check ->> 'days_left') || ' дн.'
    );
  end if;

  update public.profiles
  set level = p_level, level_changed_at = now(), updated_at = now()
  where id = p_user_id;

  return jsonb_build_object('success', true, 'level', p_level);
end;
$$;

-- Функция получения или создания текущего активного дня дневника
-- ПРАВИЛА 3-5: стрик не сбрасывается; день привязан к первому незакрытому;
-- лимит 1 новый закрытый день за календарные сутки.
create or replace function public.get_or_create_active_day(p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_last_closed record;
  v_last_open record;
  v_next_num int;
  v_today date;
  v_new_day_id uuid;
begin
  -- Текущая дата по UTC (или часовому поясу профиля)
  v_today := current_date;

  -- 1. Проверяем, есть ли уже незакрытый открытый день
  select * into v_last_open
  from public.diary_days
  where user_id = p_user_id and closed_at is null
  order by day_number asc
  limit 1;

  if v_last_open.id is not null then
    return jsonb_build_object(
      'day_id', v_last_open.id,
      'day_number', v_last_open.day_number,
      'day_date', v_last_open.day_date,
      'is_new', false
    );
  end if;

  -- 2. Если все дни закрыты, ищем последний закрытый день
  select * into v_last_closed
  from public.diary_days
  where user_id = p_user_id and closed_at is not null
  order by day_number desc
  limit 1;

  if v_last_closed.id is null then
    -- Самый первый день дневника пользователя
    v_next_num := 1;
  else
    v_next_num := v_last_closed.day_number + 1;
  end if;

  -- Создаём первый незакрытый день
  insert into public.diary_days (user_id, day_number, day_date)
  values (p_user_id, v_next_num, v_today)
  returning id into v_new_day_id;

  return jsonb_build_object(
    'day_id', v_new_day_id,
    'day_number', v_next_num,
    'day_date', v_today,
    'is_new', true
  );
end;
$$;

-- Функция закрытия дня (при достижении нормы уровня)
-- Правило 5: максимум 1 закрытый день за календарные сутки
create or replace function public.check_and_close_day(p_day_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_day record;
  v_level int;
  v_pride_count int;
  v_gratitude_count int;
  v_today date;
  v_already_closed_today boolean;
  v_streak_count int;
begin
  select * into v_day from public.diary_days where id = p_day_id;
  if v_day.id is null then
    return jsonb_build_object('success', false, 'error', 'День не найден');
  end if;

  if v_day.closed_at is not null then
    return jsonb_build_object('success', true, 'already_closed', true, 'closed_at', v_day.closed_at);
  end if;

  -- Уровень сложности пользователя
  select level into v_level from public.profiles where id = v_day.user_id;
  if v_level is null then v_level := 3; end if;

  -- Считаем количество гордостей и благодарностей
  select count(*) into v_pride_count
  from public.entries
  where day_id = p_day_id and type = 'pride';

  select count(*) into v_gratitude_count
  from public.entries
  where day_id = p_day_id and type = 'gratitude';

  -- Проверка нормы по уровню (нужно N гордостей И N благодарностей)
  if v_pride_count < v_level or v_gratitude_count < v_level then
    return jsonb_build_object(
      'success', false,
      'closed', false,
      'reason', 'quota_not_reached',
      'prides', v_pride_count,
      'gratitudes', v_gratitude_count,
      'needed', v_level
    );
  end if;

  -- Защита от накликивания: максимум 1 новый день закрывается за календарные сутки
  v_today := current_date;
  select exists (
    select 1 from public.diary_days
    where user_id = v_day.user_id
      and closed_at::date = v_today
      and id <> p_day_id
  ) into v_already_closed_today;

  if v_already_closed_today then
    return jsonb_build_object(
      'success', false,
      'closed', false,
      'reason', 'daily_limit_reached',
      'message', 'Максимум 1 день закрывается за календарные сутки. Следующий день можно закрыть завтра.'
    );
  end if;

  -- Закрываем день!
  update public.diary_days
  set closed_at = now(), updated_at = now()
  where id = p_day_id;

  -- Стрик = общее количество закрытых дней дневника (Правило 3: никогда не сбрасывается!)
  select count(*) into v_streak_count
  from public.diary_days
  where user_id = v_day.user_id and closed_at is not null;

  -- Обновляем профиль и таблицу streaks
  update public.profiles
  set streak = v_streak_count, updated_at = now()
  where id = v_day.user_id;

  insert into public.streaks (user_id, current_streak, longest_streak, last_closed_day_number, last_closed_calendar_date, updated_at)
  values (v_day.user_id, v_streak_count, v_streak_count, v_day.day_number, v_today, now())
  on conflict (user_id) do update set
    current_streak = v_streak_count,
    longest_streak = greatest(public.streaks.longest_streak, v_streak_count),
    last_closed_day_number = v_day.day_number,
    last_closed_calendar_date = v_today,
    updated_at = now();

  return jsonb_build_object(
    'success', true,
    'closed', true,
    'day_number', v_day.day_number,
    'streak', v_streak_count
  );
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 18. НАСТРОЙКА STORAGE (хранилище медиа и доказательств)
-- ────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('ogonek-media', 'ogonek-media', true)
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────────────────────
-- 19. ROW LEVEL SECURITY (RLS НА ВСЕ ТАБЛИЦЫ)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.diary_days enable row level security;
alter table public.entries enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.stories enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.streaks enable row level security;
alter table public.intentions enable row level security;
alter table public.evidence enable row level security;
alter table public.ai_evaluations enable row level security;
alter table public.telegram_links enable row level security;

-- Политики для profiles
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users" on public.profiles
  for select to authenticated using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Политики для diary_days
drop policy if exists "Users manage own diary days" on public.diary_days;
create policy "Users manage own diary days" on public.diary_days
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Friends can view diary days with non-private entries" on public.diary_days;
create policy "Friends can view diary days with non-private entries" on public.diary_days
  for select to authenticated using (
    auth.uid() = user_id or exists (
      select 1 from public.entries e
      where e.day_id = public.diary_days.id
        and (e.visibility = 'public' or (e.visibility = 'friends' and exists (
          select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = public.diary_days.user_id and f.status = 'accepted'
        )))
    )
  );

-- Политики для entries
drop policy if exists "Users manage own entries" on public.entries;
create policy "Users manage own entries" on public.entries
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "View public or friends entries" on public.entries;
create policy "View public or friends entries" on public.entries
  for select to authenticated using (
    auth.uid() = user_id or visibility = 'public' or (
      visibility = 'friends' and exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = public.entries.user_id and f.status = 'accepted'
      )
    )
  );

-- Политики для posts
drop policy if exists "Manage own posts" on public.posts;
create policy "Manage own posts" on public.posts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "View posts" on public.posts;
create policy "View posts" on public.posts
  for select to authenticated using (
    auth.uid() = user_id or visibility = 'public' or (
      visibility = 'friends' and exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = public.posts.user_id and f.status = 'accepted'
      )
    )
  );

-- Политики для reactions
drop policy if exists "Manage own reactions" on public.reactions;
create policy "Manage own reactions" on public.reactions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "View all reactions" on public.reactions;
create policy "View all reactions" on public.reactions
  for select to authenticated using (true);

-- Политики для comments
drop policy if exists "Manage own comments" on public.comments;
create policy "Manage own comments" on public.comments
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "View comments" on public.comments;
create policy "View comments" on public.comments
  for select to authenticated using (true);

-- Политики для follows
drop policy if exists "Manage own follows" on public.follows;
create policy "Manage own follows" on public.follows
  for all to authenticated using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

drop policy if exists "View follows" on public.follows;
create policy "View follows" on public.follows
  for select to authenticated using (true);

-- Политики для stories
drop policy if exists "Manage own stories" on public.stories;
create policy "Manage own stories" on public.stories
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "View active stories" on public.stories;
create policy "View active stories" on public.stories
  for select to authenticated using (expires_at > now());

-- Политики для conversations & members & messages
drop policy if exists "Users view their conversations" on public.conversations;
create policy "Users view their conversations" on public.conversations
  for select to authenticated using (
    exists (select 1 from public.conversation_members m where m.conversation_id = id and m.user_id = auth.uid())
  );

drop policy if exists "Users can create conversations" on public.conversations;
create policy "Users can create conversations" on public.conversations
  for insert to authenticated with check (true);

drop policy if exists "Members view conversation members" on public.conversation_members;
create policy "Members view conversation members" on public.conversation_members
  for select to authenticated using (
    exists (select 1 from public.conversation_members m where m.conversation_id = conversation_members.conversation_id and m.user_id = auth.uid())
  );

drop policy if exists "Users can join/add members" on public.conversation_members;
create policy "Users can join/add members" on public.conversation_members
  for insert to authenticated with check (true);

drop policy if exists "Members view messages" on public.messages;
create policy "Members view messages" on public.messages
  for select to authenticated using (
    exists (select 1 from public.conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid())
  );

drop policy if exists "Members insert messages" on public.messages;
create policy "Members insert messages" on public.messages
  for insert to authenticated with check (
    auth.uid() = sender_id and
    exists (select 1 from public.conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid())
  );

-- Политики для streaks
drop policy if exists "Users view streaks" on public.streaks;
create policy "Users view streaks" on public.streaks
  for select to authenticated using (true);

drop policy if exists "Users manage own streak" on public.streaks;
create policy "Users manage own streak" on public.streaks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Политики для intentions
drop policy if exists "Users manage own intentions" on public.intentions;
create policy "Users manage own intentions" on public.intentions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Политики для evidence
drop policy if exists "Users manage own evidence" on public.evidence;
create policy "Users manage own evidence" on public.evidence
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Политики для ai_evaluations
drop policy if exists "Users manage own ai evaluations" on public.ai_evaluations;
create policy "Users manage own ai evaluations" on public.ai_evaluations
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Политики для telegram_links
drop policy if exists "Users manage own telegram links" on public.telegram_links;
create policy "Users manage own telegram links" on public.telegram_links
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Политики storage.objects для бакета ogonek-media
drop policy if exists "Media is publicly readable" on storage.objects;
create policy "Media is publicly readable" on storage.objects
  for select using (bucket_id = 'ogonek-media');

drop policy if exists "Authenticated users can upload media" on storage.objects;
create policy "Authenticated users can upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'ogonek-media');

drop policy if exists "Users can update/delete own media" on storage.objects;
create policy "Users can update/delete own media" on storage.objects
  for all to authenticated using (bucket_id = 'ogonek-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- ────────────────────────────────────────────────────────────────────────────
-- 20. SUPABASE REALTIME
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  -- Добавляем таблицы в публикацию Realtime, если публикация существует
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.reactions;
    alter publication supabase_realtime add table public.comments;
    alter publication supabase_realtime add table public.posts;
  end if;
exception when others then
  -- Игнорируем, если таблица уже в публикации
  null;
end $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 21. СЕРВЕРНЫЙ РАСЧЁТ РЕЙТИНГОВ (PRODUCT_SPEC.md: РЕЙТИНГИ)
-- Длина дневника, всего гордостей, средняя оценка, всего благодарностей
-- Фильтры: неделя / месяц / всё время. Учитываются только in_leaderboard = true.
-- ────────────────────────────────────────────────────────────────────────────

create index if not exists idx_entries_type_score_date on public.entries(type, score, created_at);
create index if not exists idx_entries_user_created_type on public.entries(user_id, created_at, type);

-- 1. Представление: Рейтинг за всё время
create or replace view public.view_leaderboard_all_time as
select
  p.id as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.city,
  coalesce(p.streak, (
    select count(distinct d.day_number)
    from public.diary_days d
    where d.user_id = p.id and d.closed_at is not null
  ), 0) as streak,
  coalesce(count(e.id) filter (where e.type = 'pride'), 0) as total_prides,
  coalesce(count(e.id) filter (where e.type = 'gratitude'), 0) as total_gratitudes,
  round(coalesce(avg(e.score) filter (where e.type = 'pride' and e.score is not null), 0)::numeric, 1) as avg_score,
  p.created_at as joined_at
from public.profiles p
left join public.entries e on e.user_id = p.id
where p.in_leaderboard = true
group by p.id, p.username, p.display_name, p.avatar_url, p.city, p.streak, p.created_at;

-- 2. Представление: Рейтинг за месяц (последние 30 дней)
create or replace view public.view_leaderboard_month as
select
  p.id as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.city,
  coalesce(p.streak, 0) as streak,
  coalesce(count(e.id) filter (where e.type = 'pride' and e.created_at >= now() - interval '30 days'), 0) as total_prides,
  coalesce(count(e.id) filter (where e.type = 'gratitude' and e.created_at >= now() - interval '30 days'), 0) as total_gratitudes,
  round(coalesce(avg(e.score) filter (where e.type = 'pride' and e.score is not null and e.created_at >= now() - interval '30 days'), 0)::numeric, 1) as avg_score,
  p.created_at as joined_at
from public.profiles p
left join public.entries e on e.user_id = p.id
where p.in_leaderboard = true
group by p.id, p.username, p.display_name, p.avatar_url, p.city, p.streak, p.created_at;

-- 3. Представление: Рейтинг за неделю (последние 7 дней)
create or replace view public.view_leaderboard_week as
select
  p.id as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.city,
  coalesce(p.streak, 0) as streak,
  coalesce(count(e.id) filter (where e.type = 'pride' and e.created_at >= now() - interval '7 days'), 0) as total_prides,
  coalesce(count(e.id) filter (where e.type = 'gratitude' and e.created_at >= now() - interval '7 days'), 0) as total_gratitudes,
  round(coalesce(avg(e.score) filter (where e.type = 'pride' and e.score is not null and e.created_at >= now() - interval '7 days'), 0)::numeric, 1) as avg_score,
  p.created_at as joined_at
from public.profiles p
left join public.entries e on e.user_id = p.id
where p.in_leaderboard = true
group by p.id, p.username, p.display_name, p.avatar_url, p.city, p.streak, p.created_at;

-- 4. Серверная RPC-функция с фильтрацией (scope: all/friends, period: week/month/all_time)
create or replace function public.get_leaderboard(
  p_scope text default 'all',
  p_period text default 'all_time',
  p_limit int default 50
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  city text,
  streak int,
  total_prides bigint,
  total_gratitudes bigint,
  avg_score numeric,
  is_following boolean,
  is_me boolean
) language plpgsql security definer as $$
declare
  v_current_user_id uuid := auth.uid();
  v_since timestamptz;
begin
  if p_period = 'week' then
    v_since := now() - interval '7 days';
  elsif p_period = 'month' then
    v_since := now() - interval '30 days';
  else
    v_since := '1970-01-01 00:00:00+00'::timestamptz;
  end if;

  return query
  select
    p.id as user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.city,
    p.streak,
    coalesce(count(e.id) filter (where e.type = 'pride' and e.created_at >= v_since), 0)::bigint as total_prides,
    coalesce(count(e.id) filter (where e.type = 'gratitude' and e.created_at >= v_since), 0)::bigint as total_gratitudes,
    round(coalesce(avg(e.score) filter (where e.type = 'pride' and e.score is not null and e.created_at >= v_since), 0)::numeric, 1) as avg_score,
    exists(
      select 1 from public.follows f
      where f.follower_id = v_current_user_id and f.following_id = p.id
    ) as is_following,
    (v_current_user_id is not null and p.id = v_current_user_id) as is_me
  from public.profiles p
  left join public.entries e on e.user_id = p.id
  where p.in_leaderboard = true
    and (
      p_scope <> 'friends'
      or v_current_user_id is null
      or p.id = v_current_user_id
      or exists(
        select 1 from public.follows f
        where f.follower_id = v_current_user_id and f.following_id = p.id
      )
    )
  group by p.id, p.username, p.display_name, p.avatar_url, p.city, p.streak
  order by p.streak desc, total_prides desc, avg_score desc
  limit p_limit;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 22. ПОЛЕ ОНБОРДИНГА И АВТОМАТИЧЕСКИЙ ТРИГГЕР ПРОФИЛЯ ПРИ ВХОДЕ GOOGLE
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text;
  v_display_name text;
  v_avatar_url text;
  v_candidate text;
  v_seq int := 0;
begin
  -- 1. Извлекаем имя и аватар из метаданных OAuth Google
  v_display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'display_name',
    split_part(coalesce(new.email, 'Пользователь'), '@', 1)
  );

  v_avatar_url := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    null
  );

  -- 2. Генерируем уникальный никнейм из email или имени (латиница, цифры, _)
  v_candidate := lower(regexp_replace(
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(coalesce(new.email, ''), '@', 1),
      'user'
    ),
    '[^a-z0-9_]',
    '',
    'g'
  ));

  if length(v_candidate) < 3 then
    v_candidate := 'user_' || substr(replace(new.id::text, '-', ''), 1, 6);
  elsif length(v_candidate) > 20 then
    v_candidate := substr(v_candidate, 1, 20);
  end if;

  v_username := v_candidate;

  -- 3. Если никнейм занят другим пользователем, добавляем суффикс
  while exists (select 1 from public.profiles where username = v_username and id <> new.id) loop
    v_seq := v_seq + 1;
    v_username := substr(v_candidate, 1, 15) || '_' || v_seq;
  end loop;

  -- 4. Создаём профиль в public.profiles
  insert into public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    level,
    timezone,
    in_leaderboard,
    streak,
    onboarding_completed,
    created_at,
    updated_at
  ) values (
    new.id,
    v_username,
    v_display_name,
    v_avatar_url,
    coalesce((new.raw_user_meta_data->>'level')::int, 3),
    'Europe/Chisinau',
    true,
    0,
    false,
    now(),
    now()
  )
  on conflict (id) do update set
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    display_name = case when public.profiles.display_name = '' then excluded.display_name else public.profiles.display_name end,
    updated_at = now();

  return new;
exception when others then
  return new;
end;
$$;

-- Идемпотентный триггер на auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

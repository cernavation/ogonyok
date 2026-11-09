# АНАЛИЗ ФАКТИЧЕСКОГО ИСПОЛЬЗОВАНИЯ СХЕМЫ БАЗЫ ДАННЫХ

- **Дата**: 9 ноября 2026 г.
- **Статус**: Канонический аудит использования таблиц и колонок кодом приложения «Огонёк».

---

## 1. Сравнение существующих схем

| Таблица | Схема 1.0 (`SUPABASE_FULL_SCHEMA.sql`) | Схема 2.0 (`supabase/schema.sql`) | Миграция 2.0 (`SUPABASE_2.0_MIGRATION.sql`) | Фактическое использование в коде | Статус канона |
|---------|:--------------------------------------:|:---------------------------------:|:-------------------------------------------:|:---------------------------------|:-------------:|
| `profiles` | Присутствует | Присутствует | Присутствует | Используется повсеместно | **Каноническая таблица** |
| `days` | Присутствует (client_id, day_number) | Отсутствует (заменено на diary_days) | Отсутствует | `use-ogonek-store.ts`, `supabase-sync.ts` | **Каноническая таблица** |
| `prides` | Присутствует | Отсутствует (entries) | Отсутствует | `use-ogonek-store.ts`, `supabase-sync.ts` | **Каноническая таблица** |
| `gratitudes` | Присутствует | Отсутствует (entries) | Отсутствует | `use-ogonek-store.ts`, `supabase-sync.ts` | **Каноническая таблица** |
| `diary_days` | Отсутствует | Присутствует | Отсутствует | `api.ts`, `telegram/cron` | **Канонический VIEW поверх days** |
| `entries` | Отсутствует | Присутствует | Отсутствует | `api.ts` | **Устарело (схема V2)** |
| `stories` | Присутствует | Присутствует | Присутствует | `api.ts`, `supabase-sync.ts` | **Каноническая таблица** |
| `comments` | Присутствует | Присутствует | Присутствует | `api.ts`, `supabase-sync.ts` | **Каноническая таблица** |
| `reactions` | Присутствует | Присутствует | Присутствует | `api.ts`, `supabase-sync.ts` | **Каноническая таблица** |
| `evidence_vault` | `achievements_verifications` | `evidence` | `evidence_vault` | `api.ts`, `supabase-sync.ts` | **Каноническая таблица** (`evidence_vault`) |
| `direct_messages` | Присутствует | `messages` | Присутствует | `api.ts`, `supabase-sync.ts`, чаты | **Каноническая таблица** |
| `call_sessions` | Отсутствует | `calls` | Присутствует | `api.ts`, WebRTC сигналы | **Каноническая таблица** |
| `friendships` | Присутствует | Отсутствует | Присутствует | `api.ts`, `supabase-sync.ts`, соратники | **Каноническая таблица** |
| `follows` | Отсутствует | Присутствует | Присутствует | `api.ts`, подписки | **Каноническая таблица** |
| `scheduled_messages` | Отсутствует | Присутствует | Отсутствует | `app/api/cron/deliver-scheduled` | **Каноническая таблица** |
| `telegram_links` | Отсутствует | Присутствует | Отсутствует | `telegram/link`, `telegram/webhook` | **Каноническая таблица** |
| `ai_evaluations` | Отсутствует | Присутствует | Отсутствует | `app/api/evaluate` | **Каноническая таблица** |

---

## 2. Детальный реестр колонок 15 канонических сущностей

### 1. `profiles`
- **Первичный ключ**: `id uuid references auth.users(id) on delete cascade`
- **Канонические поля**:
  - `username text unique not null`
  - `display_name text not null default ''`
  - `bio text not null default ''`
  - `city text not null default ''`
  - `website text not null default ''`
  - `joined_label text not null default 'Только что'`
  - `avatar_url text` (основная) / `avatar_image text` (*deprecated*)
  - `avatar_color text not null default '#FF5C00'`
  - `cover_url text` (основная) / `banner_image text` (*deprecated*)
  - `banner_preset text not null default 'night-peaks'`
  - `level integer not null default 1` (основная) / `difficulty_level integer not null default 1` (*deprecated*)
  - `streak_count integer not null default 0` (основная) / `streak integer not null default 0` (*deprecated*)
  - `subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro', 'ultra'))`
  - `verified boolean not null default false`
  - `is_anonymous boolean not null default false`
  - `telegram_chat_id text`
  - `monthly_goal text not null default ''`
  - `monthly_goal_updated_at timestamptz`
  - `level_changed_at timestamptz`
  - `theme text not null default 'x-black'`
  - `accent text not null default 'amber'`
  - `font_scale text not null default 'standard'`
  - `feed_density text not null default 'comfortable'`
  - `privacy jsonb not null default '{}'::jsonb`
  - `streak_settings jsonb not null default '{}'::jsonb`
  - `settings jsonb not null default '{}'::jsonb`
  - `social_links jsonb not null default '[]'::jsonb`
  - `reminder_times jsonb default '["21:00"]'::jsonb`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - `client_id text`
  - `client_updated_at timestamptz`

### 2. `days`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `client_id text not null`
- `day_number integer not null`
- `title text not null default ''`
- `date_iso text`
- `day_date date`
- `status text not null default 'open' check (status in ('open', 'closed'))`
- `visibility text not null default 'private' check (visibility in ('private', 'friends', 'public'))`
- `closed_at timestamptz`
- `tags jsonb not null default '[]'::jsonb`
- `photos jsonb not null default '[]'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `client_updated_at timestamptz`
- **Ограничения**: `UNIQUE(user_id, client_id)`, `UNIQUE(user_id, day_number)`

### 3. `prides`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `day_id uuid references public.days(id) on delete cascade`
- `day_client_id text`
- `client_id text not null`
- `position integer not null default 1`
- `num text not null default '1'`
- `text text not null default ''`
- `scale integer not null default 5`
- `overcome integer not null default 0`
- `ai_comment text`
- `visibility text not null default 'private'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `client_updated_at timestamptz`
- **Ограничения**: `UNIQUE(user_id, client_id)`

### 4. `gratitudes`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `day_id uuid references public.days(id) on delete cascade`
- `day_client_id text`
- `client_id text not null`
- `position integer not null default 1`
- `num text not null default '1'`
- `text text not null default ''`
- `rating integer not null default 5`
- `visibility text not null default 'private'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `client_updated_at timestamptz`
- **Ограничения**: `UNIQUE(user_id, client_id)`

### 5. `diary_days` (VIEW)
- `id uuid`, `user_id uuid`, `day_number integer`, `day_date date`, `closed_at timestamptz`, `created_at timestamptz`, `updated_at timestamptz`
- Построено поверх `days`.

### 6. `stories`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `client_id text`
- `friend_id uuid references public.profiles(id) on delete cascade`
- `emoji text not null default '🔥'`
- `kicker text not null default ''`
- `headline text not null default ''`
- `detail text not null default ''`
- `from_color text not null default '#FF5C00'`
- `to_color text not null default '#FF8A00'`
- `accent text not null default 'amber'`
- `background_id text`
- `photo text`
- `slides jsonb not null default '[]'::jsonb`
- `source_day_id integer`
- `source_pride_index integer`
- `visibility text not null default 'friends'`
- `created_at timestamptz not null default now()`
- `expires_at timestamptz default (now() + interval '24 hours')`
- `client_updated_at timestamptz`

### 7. `comments`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `client_id text`
- `target_key text not null`
- `day_client_id text`
- `parent_client_id text`
- `author text not null default ''`
- `initials text not null default ''`
- `text text not null default ''`
- `likes integer not null default 0`
- `liked_by_me boolean not null default false`
- `is_mine boolean not null default false`
- `template text`
- `persona text not null default 'friend'`
- `created_at timestamptz not null default now()`
- `client_updated_at timestamptz`

### 8. `reactions`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `client_id text`
- `target_key text not null`
- `target_kind text not null default 'day'`
- `day_client_id text`
- `position integer`
- `emoji_id text not null default 'fire'`
- `count integer not null default 1`
- `mine boolean not null default true`
- `created_at timestamptz not null default now()`
- `client_updated_at timestamptz`

### 9. `evidence_vault`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `category_id text not null`
- `title text not null`
- `topic text not null default ''`
- `achieved_at timestamptz`
- `status text not null default 'draft'`
- `regulation jsonb not null default '{}'::jsonb`
- `evidence jsonb not null default '[]'::jsonb`
- `submission jsonb not null default '{}'::jsonb`
- `submitted_at timestamptz`
- `verified_at timestamptz`
- `reviewer_note text`
- `moderator_status text not null default 'unverified'`
- `tracking_code text unique`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 10. `direct_messages`
- `id uuid primary key default gen_random_uuid()`
- `client_id text`
- `thread_key text not null`
- `author_id uuid not null references public.profiles(id) on delete cascade`
- `recipient_id uuid references public.profiles(id) on delete set null`
- `body text not null default ''`
- `attachment jsonb`
- `reactions jsonb not null default '{}'::jsonb`
- `is_read boolean not null default false`
- `is_system boolean not null default false`
- `sent_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`
- `client_updated_at timestamptz`

### 11. `call_sessions`
- `id uuid primary key default gen_random_uuid()`
- `caller_id uuid not null references public.profiles(id) on delete cascade`
- `receiver_id uuid not null references public.profiles(id) on delete cascade`
- `status text not null default 'ringing' check (status in ('ringing', 'connected', 'ended', 'declined', 'missed'))`
- `duration_seconds integer not null default 0`
- `started_at timestamptz`
- `ended_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 12. `friendships`
- `id uuid primary key default gen_random_uuid()`
- `client_id text`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `friend_id uuid not null references public.profiles(id) on delete cascade`
- `addressee_id uuid references public.profiles(id) on delete cascade`
- `requester_id uuid references public.profiles(id) on delete cascade`
- `status friendship_status not null default 'pending'`
- `message text not null default ''`
- `mutual_count integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `client_updated_at timestamptz`
- **Ограничения**: `UNIQUE(user_id, friend_id)`

### 13. `follows`
- `id uuid primary key default gen_random_uuid()`
- `follower_id uuid not null references public.profiles(id) on delete cascade`
- `following_id uuid not null references public.profiles(id) on delete cascade`
- `created_at timestamptz not null default now()`
- **Ограничения**: `UNIQUE(follower_id, following_id)`

### 14. `scheduled_messages`
- `id uuid primary key default gen_random_uuid()`
- `thread_key text not null default ''`
- `conversation_id uuid`
- `author_id uuid references public.profiles(id) on delete cascade`
- `sender_id uuid references public.profiles(id) on delete cascade`
- `recipient_id uuid references public.profiles(id) on delete set null`
- `body text not null default ''`
- `attachment jsonb`
- `payload jsonb not null default '{}'::jsonb`
- `scheduled_at timestamptz not null`
- `delivered boolean not null default false`
- `delivered_at timestamptz`
- `created_at timestamptz not null default now()`

### 15. `telegram_links`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `token text not null unique`
- `used boolean not null default false`
- `created_at timestamptz not null default now()`
- `expires_at timestamptz not null default (now() + interval '1 hour')`

### 16. `ai_evaluations`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `day_id uuid references public.days(id) on delete cascade`
- `day_number integer not null`
- `evaluation jsonb not null default '{}'::jsonb`
- `feedback text not null default ''`
- `score integer`
- `model text not null default 'gemini-2.5-flash'`
- `provider text not null default 'gemini'`
- `created_at timestamptz not null default now()`

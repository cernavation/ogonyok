# ДИАГНОСТИЧЕСКИЙ ОТЧЁТ: БАЗА ДАННЫХ И СХЕМА SUPABASE
> **Файл:** `diagnostics/DIAG_02_DATABASE.md`  
> **Дата аудита:** 9 ноября 2026 г.  
> **Роль:** Старший Full-Stack инженер и аудитор  
> **Статус:** ТОЛЬКО ДИАГНОСТИКА (код не изменялся, миграции не применялись)

---

## 1. Сводный анализ трёх схем базы данных

В проекте обнаружен **критический архитектурный конфликт: одновременное присутствие трёх несовместимых парадигм схемы базы данных**:

```mermaid
flowchart TD
    subgraph S1 ["1. Схема 1.0 (SUPABASE_FULL_SCHEMA.sql)"]
        days["days (client_id, day_number)"]
        prides["prides (num, overcome, scale)"]
        gratitudes["gratitudes (num, rating)"]
        dm1["direct_messages (user_id=owner)"]
    end

    subgraph S2 ["2. Схема V2 (supabase/schema.sql)"]
        diary_days["diary_days (user_id, day_number)"]
        entries["entries (type: pride/gratitude)"]
        posts["posts (feed)"]
        conv["conversations + messages"]
    end

    subgraph S3 ["3. Миграция 2.0 (SUPABASE_2.0_MIGRATION.sql)"]
        dm2["direct_messages (author_id, recipient_id, thread_key)"]
        vault["evidence_vault (facts of strength)"]
        calls["call_sessions (ringing/connected)"]
        open_rls["Отключение RLS (allow_all_dev)"]
    end

    AppCode["Приложение Огонёк"] -->|useOgonekStore & sync| days
    AppCode -->|api.ts (getUserDiaryDays)| diary_days
    AppCode -->|Messenger UI| dm2
    AppCode -->|deliver-scheduled cron| conv
```

1. **Парадигма 1: `SUPABASE_FULL_SCHEMA.sql` (41 КБ, 718 строк)**:
   - Сущности дня разделены на отдельные таблицы: `days`, `prides`, `gratitudes`.
   - Имеет строгие проверки `CHECK`, внешние ключи на `auth.users(id)` и гранулярные RLS-политики.
   - Используется движком офлайн-синхронизации `lib/ogonek/supabase-sync.ts` и `useOgonekStore:syncDayToSupabase`.
2. **Парадигма 2: `supabase/schema.sql` (65 КБ, 725 строк)**:
   - Сущности объединены в таблицы `diary_days` и `entries` (с дискриминатором `type: 'pride' | 'gratitude'`).
   - Мессенджер спроектирован по модели Telegram: `conversations`, `conversation_members`, `messages`, `message_reactions`, `polls`, `chat_folders`.
   - Таблица фактов называется `evidence`, звонки — `calls`.
   - Частично используется в `lib/supabase/api.ts` (`getUserDiaryDays`, `addDiaryEntry`) и в кроне `app/api/telegram/cron/route.ts`.
3. **Парадигма 3: `SUPABASE_2.0_MIGRATION.sql` (30 КБ, 484 строки)**:
   - Гибридная доработка, создающая таблицы: `direct_messages`, `evidence_vault`, `call_sessions`, `friendships`, `follows`.
   - **Отключает RLS** на всех таблицах для "беспрепятственной разработки".

---

## 2. Инвентаризация таблиц, колонок и типов данных

### Таблица 1: `public.profiles`
| Колонка | Тип SQL | Ограничения | Наличие в коде (`ProfileRecord`) | Примечания |
|:---|:---|:---|:---:|:---|
| `id` | `uuid` | PK, references `auth.users(id)` | Да (`ProfileRecord.id`) | Идентификатор профиля |
| `client_id` | `text` | UNIQUE | Да | Для offline-first дедупликации |
| `display_name` | `text` | NOT NULL, default 'Пользователь' | Да | Отображаемое имя |
| `username` | `text` | UNIQUE, NOT NULL | Да | `@username` (3–20 символов) |
| `bio`, `city`, `website` | `text` | default '' | Да | Метаданные профиля |
| `avatar_image`, `avatar_url` | `text` | NULL | Да | Дублирующие поля аватара |
| `avatar_color` | `text` | default '#FF5C00' | Да | Цвет заливки заглушки |
| `banner_image`, `cover_url` | `text` | NULL | Да | Дублирующие поля обложки |
| `banner_preset` | `text` | default 'night-peaks' | Да | Пресет обложки |
| `level`, `difficulty_level` | `integer` | default 1 | Да | Дублирующие поля уровня сложности |
| `level_changed_at` | `timestamptz` | NULL | Да | Дата последней смены уровня (лимит 30 дней) |
| `level_history` | `jsonb` | default '[]' | Да | История переходов по уровням |
| `age` | `integer` | NULL | Да | Возраст пользователя |
| `verified` | `boolean` | default false | Да | Синяя галочка / Премиум |
| `subscription_tier` | `text` | default 'free' | Да | 'free' \| 'premium' \| 'ultra' |
| `streak`, `streak_count` | `integer` | default 0 | Да | Дублирующие поля длины стрика |
| `telegram_chat_id` | `text` | NULL | Да | Chat ID для напоминаний бота |
| `reminder_times` | `jsonb` | default '[]' | Да | Времена напоминаний (ЧЧ:ММ) |
| `in_leaderboard` | `boolean` | default true | Да | Видимость в рейтинге |
| `is_anonymous` | `boolean` | default false | Да | Скрытие профиля в приватный режим |
| `privacy` | `jsonb` | default JSON | Да | Настройки видимости и политик |
| `settings` | `jsonb` | default '{"level":1}' | Да | JSON-настройки (дублирует колонки) |
| `created_at`, `updated_at` | `timestamptz` | default now() | Да | Системные временные метки |

### Таблица 2: `public.days` (Схема 1.0)
- **Колонки:** `id (uuid PK)`, `user_id (uuid FK)`, `client_id (text UNIQUE)`, `day_number (int)`, `date_iso (text/date)`, `title (text)`, `tags (text[])`, `photos (text[])`, `score (numeric)`, `ai_score (numeric)`, `ai_verdict (text)`, `status (text)`, `visibility (text: public/friends/private)`, `created_at`, `updated_at`, `client_updated_at`.
- **Индексы:** `idx_days_user_client (user_id, client_id)`, `idx_days_day_number (user_id, day_number DESC)`.

### Таблица 3: `public.prides` (Схема 1.0)
- **Колонки:** `id (uuid PK)`, `user_id (uuid FK)`, `day_id (uuid FK)`, `client_id (text UNIQUE)`, `day_client_id (text)`, `position (int)`, `num (text)`, `text (text)`, `scale (int)`, `score (numeric)`, `overcome (int: 0-3)`, `visibility (text)`, `created_at`, `updated_at`.

### Таблица 4: `public.gratitudes` (Схема 1.0)
- **Колонки:** `id (uuid PK)`, `user_id (uuid FK)`, `day_id (uuid FK)`, `client_id (text UNIQUE)`, `day_client_id (text)`, `position (int)`, `num (text)`, `text (text)`, `rating (int default 10)`, `created_at`, `updated_at`.

### Таблица 5: `public.diary_days` (Схема V2)
- **Колонки:** `id (uuid PK)`, `user_id (uuid FK)`, `day_number (int)`, `day_date (date)`, `closed_at (timestamptz)`, `created_at`, `updated_at`.
- **Индексы:** `idx_diary_days_user_closed (user_id, closed_at)`.
- **Конфликт:** Не имеет полей `tags`, `photos`, `visibility`, `score`, `title` (они вынесены в `entries` или `posts`).

### Таблица 6: `public.entries` (Схема V2)
- **Колонки:** `id (uuid PK)`, `user_id (uuid FK)`, `day_id (uuid FK к diary_days)`, `type (text: 'pride'|'gratitude'|'intention')`, `num (text)`, `text (text)`, `score (numeric)`, `ai_comment (text)`, `overcome (int)`, `tags (text[])`, `visibility (text)`, `created_at`, `updated_at`.

### Таблица 7: `public.direct_messages` (Мессенджер 2.0)
- **Колонки:** `id (uuid PK)`, `client_id (text UNIQUE)`, `user_id (uuid FK)`, `thread_key (text NOT NULL)`, `author_id (text NOT NULL)`, `recipient_id (text)`, `body (text)`, `attachment (jsonb)`, `reactions (jsonb)`, `media (jsonb)`, `reply_to (jsonb)`, `forward_from (jsonb)`, `poll (jsonb)`, `link_preview (jsonb)`, `type (text)`, `is_read (bool)`, `is_pinned (bool)`, `is_edited (bool)`, `is_system (bool)`, `sent_at (timestamptz)`, `created_at`, `updated_at`.
- **Индексы:** `idx_direct_messages_thread_key (thread_key)`, `idx_direct_messages_user_id (user_id)`.

### Таблица 8: `public.evidence_vault` (Evidence Vault 2.0)
- **Колонки:** `id (uuid PK)`, `client_id (text UNIQUE)`, `user_id (uuid FK)`, `title (text)`, `description (text)`, `date (text)`, `category (text)`, `pinned (bool)`, `media_url (text)`, `created_at`, `updated_at`.

### Таблица 9: `public.call_sessions` (Звонки 2.0)
- **Колонки:** `id (uuid PK)`, `caller_id (text NOT NULL)`, `receiver_id (text NOT NULL)`, `status (text: 'ringing'|'connected'|'rejected'|'ended')`, `is_video (bool)`, `duration_seconds (int)`, `created_at`, `updated_at`.

### Таблица 10: `public.friendships` и `public.follows` (Социальный граф)
- `public.friendships`: `id`, `user_id`, `friend_id`, `addressee_id`, `requester_id`, `status`, `message`, `mutual_count`, `created_at`, `updated_at`.
- `public.follows`: `id`, `follower_id`, `following_id`, `status`, `created_at`.

### Таблица 11: `public.stories`
- **Колонки:** `id (uuid PK)`, `user_id (uuid FK)`, `client_id (text)`, `emoji (text)`, `headline (text)`, `detail (text)`, `photo (text)`, `expires_at (timestamptz)`, `created_at`.

### Таблица 12: `public.comments` и `public.reactions`
- `comments`: `id`, `target_id`, `user_id`, `author`, `text`, `likes`, `created_at`.
- `reactions`: `id`, `target_id`, `user_id`, `emoji`, `created_at`.

---

## 3. Расхождения между SQL-схемой и использованием в коде

| Объект | В SQL-схеме | В коде приложения | Влияние / Баг |
|:---|:---|:---|:---|
| **Дневник (таблица)** | `SUPABASE_FULL_SCHEMA.sql` определяет `days`. `supabase/schema.sql` определяет `diary_days`. | `lib/ogonek/use-ogonek-store.ts:654` пишет в `days`. `lib/supabase/api.ts:709` читает из `diary_days`. `app/api/telegram/cron/route.ts:62` проверяет `diary_days`. | **КРИТИЧЕСКИЙ РАССИНХРОН:** Пользователь закрывает день в приложении (сохраняется в `days`). Telegram-бот проверяет `diary_days` — там пусто. Бот шлёт ложные спам-уведомления "Твой день ещё не закрыт!". |
| **Удаление дня** | Внешние ключи каскадные в SQL. | `use-ogonek-store.ts:1148-1151` выполняет ручное удаление сразу из 4 таблиц: `prides`, `gratitudes`, `days`, `diary_days`. | Признак костыля: разработчик не знал, какая таблица боевая, и удалял из обеих. При этом таблица `entries` не очищается и оставляет мусор. |
| **Факты силы** | В `supabase/schema.sql:357` таблица называется `evidence`. В `SUPABASE_2.0_MIGRATION.sql:280` — `evidence_vault`. | Код (`lib/supabase/api.ts:1855`) вызывает `.from('evidence_vault')`. | Если накат производился по `supabase/schema.sql`, то `api.ts` падает с ошибкой `relation "evidence_vault" does not exist`. |
| **Сообщения чата** | В `supabase/schema.sql` таблицы: `conversations`, `messages`. В `SUPABASE_2.0_MIGRATION.sql` — `direct_messages`. | UI мессенджера (`messenger-chat-pane.tsx:286`) слушает `direct_messages`. Крон доставки (`deliver-scheduled/route.ts:57`) пишет в `messages`! | **БАГ:** Запланированные сообщения, доставленные кроном в таблицу `messages`, **никогда не отобразятся в чате**, так как интерфейс читает строго `direct_messages`. |
| **Статус дружбы** | В `SUPABASE_FULL_SCHEMA.sql:454` ограничение `check (status in ('friend', 'following', 'incoming-request', 'outgoing-request', 'dismissed'))`. | В `lib/supabase/api.ts:453` код отправляет `status: 'accepted'`. | **ПАДЕНИЕ SQL:** При накате схемы 1.0 запрос `followUser` падает с ошибкой Postgres: `violates check constraint "friendships_status_check"`. |
| **Имя бакета Storage** | В `001_ogonyok_media_storage.sql:9` бакет назван `ogonyok-media`. В `setup.mjs:142` создаются `avatars`, `covers`, `chat-media`. | В `lib/supabase/client.ts:222` вызывается `.from('ogonek-media')` (через "e"). В `lib/ogonek/profile-media-service.ts:219` — `ogonyok-media` (через "yo"). | **БАГ:** Загрузка фото через `lib/supabase/client.ts` падает с ошибкой `Bucket not found (ogonek-media)`. |

---

## 4. Неиспользуемые таблицы и колонки

### 4.1. Таблицы в `supabase/schema.sql`, которые ВООБЩЕ НЕ ИСПОЛЬЗУЮТСЯ кодом:
1. `public.conversations` (код использует прямые симметричные ключи в `direct_messages.thread_key`).
2. `public.conversation_members` (не используется).
3. `public.message_reactions` (реакции пишутся в JSONB колонку `direct_messages.reactions`).
4. `public.message_labels` (метки пишутся в локальный стор).
5. `public.chat_tags` (теги чатов хранятся локально).
6. `public.chat_folders` (папки чатов хранятся локально в `state.chatFolders`).
7. `public.polls`, `public.poll_votes` (опросы сериализуются в JSONB поле `direct_messages.poll`).
8. `public.message_reads` (статус прочтения пишется в `direct_messages.is_read`).
9. `public.calls` (код использует `call_sessions`).
10. `public.level_history` (код хранит историю в JSONB `profiles.level_history`).
11. `public.intentions` (намерения дня хранятся в `profiles` / `localStorage`).

### 4.2. Таблицы, которые код запрашивает, но их нет в схеме 1.0 (`SUPABASE_FULL_SCHEMA.sql`):
- `evidence_vault` (появляется только в миграции 2.0).
- `call_sessions` (появляется только в миграции 2.0).
- `follows` (появляется только в миграции 2.0).
- `telegram_links` (появляется только в `schema.sql`).
- `ai_evaluations` (появляется только в `schema.sql`).
- `scheduled_messages` (появляется только в `schema.sql`).

---

## 5. Дыры безопасности RLS (Row Level Security Holes)

В файле `SUPABASE_2.0_MIGRATION.sql` (строки 423–445) и файле `supabase/disable_days_rls.sql` (строки 6–8) зафиксированы **катастрофические уязвимости безопасности**:

### Уязвимость 1: Полное отключение RLS
В `SUPABASE_2.0_MIGRATION.sql:424-432`:
```sql
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_vault DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions DISABLE ROW LEVEL SECURITY;
```
В `supabase/disable_days_rls.sql:6-8`:
```sql
ALTER TABLE public.days DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.prides DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gratitudes DISABLE ROW LEVEL SECURITY;
```

### Уязвимость 2: Тотальные разрешающие политики `allow_all_dev`
В `SUPABASE_2.0_MIGRATION.sql:443-444`:
```sql
CREATE POLICY "allow_all_dev_%s" ON public.%I FOR ALL USING (true) WITH CHECK (true);
```
Эта политика накладывается на: `profiles`, `stories`, `direct_messages`, `evidence_vault`, `comments`, `reactions`, `friendships`, `follows`, `call_sessions`.

### Практические векторы атак злоумышленника (с публичным `anon key`):
1. **Чтение чужой личной переписки (Critical Data Breach)**:
   Любой человек в консоли браузера может выполнить:
   ```js
   const { data } = await supabase.from('direct_messages').select('*')
   ```
   и получить **все личные сообщения всех пользователей приложения** со всеми вложениями, фото и голосовыми записями.
2. **Чтение чужих интимных дневников силы (Personal Privacy Breach)**:
   Любой пользователь может выгрузить записи `days`, `prides`, `gratitudes` с флагом `visibility = 'private'` любого другого человека:
   ```js
   const { data } = await supabase.from('days').select('*, prides(*), gratitudes(*)').eq('user_id', 'victim-uuid')
   ```
3. **Удаление или перезапись чужих данных (Data Destruction / Tampering)**:
   Поскольку политика `FOR ALL WITH CHECK (true)` разрешает `DELETE` и `UPDATE`:
   ```js
   // Удаление всех сообщений мессенджера во всей базе:
   await supabase.from('direct_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
   // Перезапись профиля администратора:
   await supabase.from('profiles').update({ display_name: 'Hacked', streak: 0 }).eq('username', 'cernavation')
   ```
4. **Утечка персональных звонков**:
   Таблица `call_sessions` полностью открыта: видно, кто кому звонил, когда и сколько секунд длился разговор.

---

## 6. Состояние модулей Друзей, Чатов, Звонков, Уведомлений

### 6.1. Друзья и Соратники
- **Что есть в БД:** таблицы `friendships` и `follows`. Поля: `user_id`, `friend_id`, `addressee_id`, `status`.
- **Чего нет в БД:**
  - Нет механизма двустороннего подтверждения дружбы: метод `followUser` сразу пишет `status: 'accepted'`.
  - Нет таблицы блокировок пользователей (`blocks`).
  - Нет транзакционной связки: при подписке одного пользователя запись создаётся только в одном направлении, взаимность проверяется клиентским кодом.

### 6.2. Чаты и Мессенджер
- **Что есть в БД:** таблица `direct_messages` с поддержкой `thread_key`, вложений, реакций и флага `is_read`.
- **Чего нет в БД:**
  - Нет нормализованного хранения файлов (все фото и войсы сохраняются в Base64 прямо в JSONB-поле `media`).
  - Нет таблицы `conversations` в активной схеме (групповые чаты симулируются искусственным `thread_key`).
  - Нет таблицы черновиков (черновики живут только в `localStorage`).
  - Нет связи с таблицей запланированных сообщений: крон пишет в `messages`, а чат читает `direct_messages`.

### 6.3. Аудио и Видео Звонки
- **Что есть в БД:** таблица `call_sessions` (`id`, `caller_id`, `receiver_id`, `status`, `is_video`, `duration_seconds`).
- **Чего нет в БД:**
  - Нет хранения SDP offer/answer или ICE-кандидатов в таблицах (сигналинг вынесен в Realtime Broadcast).
  - Нет логов качества соединения (dropped packets, latency).
  - Нет поддержки звонков более чем 1-на-1 (нет SFU room tokens).

### 6.4. Уведомления (Notifications)
- **Что есть в БД:** только привязка Telegram (`telegram_chat_id` в `profiles` и таблица `telegram_links`).
- **Чего нет в БД:**
  - **Полностью отсутствует таблица системных уведомлений в приложении (`notifications`)!**
  - Пользователь B не получает колокольчик или пуш при:
    - входящей заявке в друзья;
    - новом комментарии к его гордости;
    - новой реакции на его день;
    - пропущенном аудио/видео звонке.
  - Нет таблицы Push-токенов (`web_push_subscriptions` / APNs / FCM).

---

## 7. Storage-бакеты и Realtime-публикации

### 7.1. Storage-бакеты
- **`ogonyok-media`**: зарегистрирован в `001_ogonyok_media_storage.sql`. Публичный, лимит 5 МБ. Разрешённые MIME: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/gif`.
- **`chat-media`**, **`avatars`**, **`covers`**: создаются скриптом `scripts/setup.mjs:142`, но отсутствуют в файлах миграций репозитория.
- **`ogonek-media`**: запрашивается кодом `lib/supabase/client.ts:222`, но в БД не создаётся.

### 7.2. Realtime Publications
В миграции `SUPABASE_2.0_MIGRATION.sql:467` в публикацию `supabase_realtime` включены 7 таблиц:
1. `direct_messages` (для мгновенной доставки сообщений)
2. `stories` (для появления новых сторис в баре)
3. `comments` (для обновления треда комментариев)
4. `reactions` (для вспышек реакций)
5. `evidence_vault` (для синхронизации фактов)
6. `profiles` (для обновления стриков)
7. `call_sessions` (для входящих вызовов)

Публикация каналов Realtime Broadcast:
- `call_room_${sessionId}` — сигнальная комната WebRTC для передачи offer/answer/ice.
- `user_calls_${userId}` — персональный канал уведомления о входящем вызове.

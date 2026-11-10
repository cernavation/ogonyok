# ЧЕК-ЛИСТ ГОТОВНОСТИ К ПРОДАКШНУ (PRODUCTION CHECKLIST)

Данный документ фиксирует исчерпывающий перечень технических требований и регламентов перед выводом проекта «Огонёк» в промышленную эксплуатацию (Production).

---

## 1. Конфигурация переменных окружения (Environment Variables)

Сверка переменных между Staging и Production окружением:

| Переменная | Назначение | Staging (.env.staging.local) | Production (Vercel / Cloud) | Критичность |
|---|---|:---:|:---:|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | URL инстанса Supabase | `https://hlpvwxmfkmhwzmgdjmtu.supabase.co` | Боевой URL проекта Supabase | 🔴 Блокирующий |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Публичный анонимный ключ Supabase | Задан в staging | Боевой anon key из настроек API | 🔴 Блокирующий |
| `SUPABASE_SERVICE_ROLE_KEY` | Привилегированный ключ сервера (secret) | Задан в staging | Боевой secret service_role key | 🔴 Блокирующий |
| `GEMINI_API_KEY` | Первичный провайдер ИИ (Google Gemini) | Задан (или DeepSeek fallback) | Действующий API ключ Google AI Studio | 🟠 Высокий |
| `GEMINI_MODEL` | Модель Gemini (`gemini-2.5-flash`) | По умолчанию `gemini-2.5-flash` | `gemini-2.5-flash` | 🟡 Средний |
| `DEEPSEEK_API_KEY` | Резервный провайдер ИИ (DeepSeek) | Опционален для staging | Действующий API ключ DeepSeek | 🟠 Высокий |
| `MEMERNITY_WEBHOOK_SECRET` | Секрет валидации HMAC вебхуков оплаты | Тестовый секрет | Боевой секрет из кабинета Memernity | 🔴 Блокирующий |
| `METERED_SECRET_KEY` | API-ключ Metered.ca (TURN/STUN звонки) | Тестовый ключ Metered | Боевой API ключ аккаунта Metered | 🟠 Высокий |
| `METERED_APP_NAME` | Домен приложения Metered.ca | `ogonyok.metered.live` | Боевой домен Metered | 🟠 Высокий |
| `TURNSTILE_SECRET_KEY` | Секретный ключ Cloudflare Turnstile | Опционален (safe fallback) | Боевой Server Secret Cloudflare | 🟡 Средний |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Публичный ключ виджета Turnstile | Опционален (safe fallback) | Боевой Client Sitekey Cloudflare | 🟡 Средний |
| `CRON_SECRET` | Секрет защиты эндпоинтов Vercel Cron | `staging_cron_secret` | Случайная строка >= 32 символов | 🔴 Блокирующий |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота для напоминаний | Тестовый бот | Боевой токен @OgonekAppBot | 🟠 Высокий |

> [!IMPORTANT]
> Переменные `SUPABASE_SERVICE_ROLE_KEY`, `MEMERNITY_WEBHOOK_SECRET`, `CRON_SECRET` и `TELEGRAM_BOT_TOKEN` являются строго серверными и **никогда** не должны передаваться с префиксом `NEXT_PUBLIC_` или попадать в клиентский бандл.

---

## 2. Row Level Security (RLS) на 100% таблиц

Все таблицы в схеме `public` защищены RLS. Прямой доступ клиентов к системным полям заблокирован:

- [x] `public.profiles`: RLS включён (SELECT: публичный каталог / собственный профиль; UPDATE: только владелец своего профиля; смена `subscription_tier`, `is_founder`, `verified` клиентом запрещена триггером `trg_protect_profile_tier` и REVOKE).
- [x] `public.profile_private`: RLS включён (SELECT/INSERT/UPDATE: только владелец записи `auth.uid() = user_id`).
- [x] `public.days`: RLS включён (изоляция по `author_id`, `visibility = 'private' | 'friends' | 'public' | 'groups'`).
- [x] `public.prides`: RLS включён (наследование прав родительского дня и независимый контроль аудитории).
- [x] `public.gratitudes`: RLS включён (наследование прав родительского дня).
- [x] `public.stories`: RLS включён (создание и удаление автором; просмотр взаимным соратникам/подписчикам).
- [x] `public.comments`: RLS включён (чтение в соответствии с доступом к родительской записи; редактирование/удаление автором).
- [x] `public.reactions`: RLS включён (управление только автором реакции).
- [x] `public.evidence_vault`: RLS включён (приватный сейф, доступ строго `auth.uid() = user_id`).
- [x] `public.direct_messages`: RLS включён (доступ строго участникам диалога: `author_id` или `recipient_id`).
- [x] `public.call_sessions`: RLS включён (доступ строго участникам вызова).
- [x] `public.friendships`: RLS включён (симметричные связи, запрет спуфинга `requester_id`).
- [x] `public.follows`: RLS включён (односторонние подписки).
- [x] `public.scheduled_messages`: RLS включён (доступ строго автору отложенного сообщения).
- [x] `public.telegram_links`: RLS включён (доступ строго владельцу токена связки).
- [x] `public.ai_evaluations`: RLS включён (доступ строго автору оценки).
- [x] `public.subscription_audit`: RLS включён (закрыта от клиентов, пишется строго `service_role`).
- [x] `public.billing_events`: RLS включён (запись только через защищённый вебхук).
- [x] `public.rate_limits` и `public.usage_counters`: RLS включён (управление через security definer RPC).
- [x] `public.ai_cache`: RLS включён (дедупликация хэшей SHA-256 без раскрытия исходных текстов).
- [x] `public.notifications` и `public.reports`: RLS включён (клиентский INSERT заблокирован, генерация триггерами).
- [x] `public.threads` и `public.thread_members`: RLS включён (доступ строго участникам треда).
- [x] `public.groups` и `public.group_members`: RLS включён (роли `owner`, `admin`, `member`).
- [x] `public.entry_audiences`: RLS включён (выборочная видимость гордостей в конкретные группы).
- [x] `public.blocked_users`: RLS включён (изоляция блокировок между пользователями).

---

## 3. Хранилище файлов (Supabase Storage Buckets)

- [x] **Бакет `ogonyok-media`**:
  - `public: true`
  - Предназначение: аватары пользователей, обложки профилей, сжатые фото дней (до 1920px).
  - Политика SELECT: публичный доступ (`true`).
  - Политика INSERT/UPDATE: только аутентифицированные пользователи (`auth.role() = 'authenticated'`).
  - Политика DELETE: только владелец файла (`auth.uid()::text = (storage.foldername(name))[1]`).
- [x] **Бакет `chat-media`**:
  - `public: false` (СТРОГО ПРИВАТНЫЙ)
  - Предназначение: вложения личных сообщений (фото, аудио, документы).
  - Доступ: генерация временных Signed URLs (срок жизни 3600 сек) через серверные RPC. Прямые публичные ссылки отсутствуют.
  - Ограничение размера: клиентское сжатие перед отправкой, дескриптор в БД < 2 КБ.

---

## 4. Фоновые задачи и Cron

- [x] **Доставка отложенных сообщений**:
  - Маршрут: `/api/cron/deliver-scheduled`
  - Расписание: `* * * * *` (каждую минуту)
  - Авторизация: заголовок `Authorization: Bearer ${CRON_SECRET}` (возвращает 401 при несовпадении).
- [x] **Напоминания о дедлайне дня (Telegram)**:
  - Маршрут: `/api/cron/telegram-reminders`
  - Расписание: `*/15 * * * *` (каждые 15 минут)
  - Фильтрация по часовому поясу и индивидуальному `reminder_times` в `profile_private`.

---

## 5. Регламент резервного копирования (Backup)

1. **Автоматический бэкап Supabase**:
   - Ежедневные снапшоты базы данных (Point-in-Time Recovery на тарифе Pro).
2. **Ручной дамп перед мажорными обновлениями**:
   ```bash
   pg_dump "postgres://postgres.<ref>:<db_password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require" \
     --clean --if-exists --no-owner --no-privileges \
     -f "backup_ogonek_prod_$(date +%Y%m%d_%H%M%S).sql"
   ```
3. **Хранение дампов**:
   - Шифрование GPG: `gpg -c backup_ogonek_prod_*.sql`
   - Хранение на изолированном S3/холодном диске с retention policy 30 дней.

---

## 6. План аварийного отката (Rollback Plan)

В случае обнаружения критической ошибки в первые 60 минут после релиза:

1. **Откат фронтенда**:
   - В дашборде Vercel мгновенный Instant Rollback на предыдущий стабильный деплой (1 клик, время исполнения < 10 сек).
2. **Откат базы данных**:
   - Если проблема в новой RPC или триггере:
     ```sql
     -- Отключение конкретного проблемного триггера без простоя БД
     ALTER TABLE public.profiles DISABLE TRIGGER trg_protect_profile_tier;
     ```
   - Если повреждена структура данных:
     - Восстановление из дампа `backup_ogonek_prod_*.sql` через psql в отдельную временную схему для сличения данных, либо откат на точку Point-in-Time Recovery.
3. **Откат тарифов и биллинга**:
   - Идемпотентные события в `billing_events` позволяют повторно прогнать вебхуки без дублирования начислений.

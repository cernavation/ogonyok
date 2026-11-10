# Ручные шаги (MANUAL_STEPS)

Здесь фиксируются шаги, требующие ручного действия человека (настройки в дашборде Supabase / Vercel, получение API-ключей и т.д.).

## 1. Настройка ключей Staging базы данных Supabase
- **Файл**: `.env.staging.local`
- **Действие**:
  1. Открыть панель проекта staging в Supabase: https://supabase.com/dashboard/project/hlpvwxmfkmhwzmgdjmtu/settings/api (или создать отдельный staging-проект).
  2. Скопировать `Project URL`, `Project API keys (anon / publishable)` и `service_role (secret)`.
  3. Обновить переменные в `.env.staging.local`:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://<staging-ref>.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_jwt_or_publishable_key>
     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon_jwt_or_publishable_key>
     SUPABASE_SERVICE_ROLE_KEY=<service_role_secret_key>
     ```
  4. Запустить самопроверку харнесса: `node scripts/qa/two-users.mjs`.

## 2. Рекомендация Next.js по обновлению безопасности (SecurityFatalError)
- **Контекст**: Next.js 16.4.0 сообщает о рекомендации обновить версию `next upgrade --agent=security`.
- **Действие**: При необходимости провести обновление Next.js в отдельном воркдереве/ветке после согласования.

## 3. Регламент безопасного применения миграций 010 и 020 на Production базе данных
**Цель**: накат канонической схемы `010_canonical_schema.sql` и строгих RLS-политик/защиты тарифов `020_rls.sql` без деградации сервиса и потери пользовательских данных.

### А. Подготовка и резервное копирование (Backup)
1. Выбрать техническое окно с минимальной активностью пользователей (например, 03:00–05:00 UTC).
2. Сделать полный дамп базы данных через Supabase Dashboard (`Database` -> `Backups` -> `Take backup now`) или через CLI:
   ```bash
   pg_dump "postgres://postgres.<ref>:<db_password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require" \
     --clean --if-exists --no-owner --no-privileges \
     -f "backup_prod_pre_rls_$(date +%Y%m%d_%H%M%S).sql"
   ```
3. Проверить целостность и размер файла дампа (`ls -lh backup_prod_pre_rls_*.sql`).

### Б. Окно технического обслуживания (Maintenance Window)
1. Уведомить пользователей или включить баннер планового обслуживания (если применимо).
2. Убедиться, что активные cron-задачи (`deliver-scheduled`, `telegram/cron`) приостановлены или завершили текущий тик.

### В. Применение миграций в транзакции
1. Открыть SQL Editor в панели Supabase Production или выполнить через Supabase CLI:
   ```bash
   # Шаг 1: Каноническая схема и бакеты
   supabase db execute -f supabase/migrations/010_canonical_schema.sql
   
   # Шаг 2: Включение RLS и защита тарифов
   supabase db execute -f supabase/migrations/020_rls.sql
   ```
2. Убедиться, что обе миграции выполнились без ошибок (`SUCCESS`). Обе миграции идемпотентны (`IF NOT EXISTS`, `OR REPLACE`, `DROP POLICY IF EXISTS`).

### Г. Верификация двумя тестовыми пользователями (Smoke Testing)
1. Запустить скрипт сквозного аудита прав доступа на рабочей базе (используя тестовых пользователей):
   ```bash
   SUPABASE_URL=https://<prod-ref>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<prod_service_role_key> \
   node scripts/qa/two-users.mjs
   ```
2. Проверить следующие сценарии:
   - Авторизованный User A видит свои дни, закрытые/публичные дни.
   - User B НЕ видит приватные дни User A (`visibility='private'`).
   - User B видит дни User A со статусом `friends` ТОЛЬКО при наличии подтверждённой дружбы (`status='accepted'`).
   - Попытка User A подделать тариф через клиентский UPDATE `subscription_tier='ultra'` блокируется триггером и REVOKE.
   - Скрипт `scripts/admin/set-tier.mjs` успешно меняет тариф через `service_role` и пишет запись в `subscription_audit`.
   - В незалогиненном (Demo) режиме клиент не отправляет запросов в `/rest/v1/*`.

### Д. План отката (Rollback Plan)
Если в процессе smoke-тестирования обнаружены блокирующие проблемы:
1. Быстрый откат RLS без потери данных:
   ```sql
   -- Временное возвращение аварийного доступа доверенным пользователям:
   DROP POLICY IF EXISTS "profiles_select_auth" ON public.profiles;
   CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
   ```
2. Полное восстановление из бэкапа:
   - В Supabase Dashboard выбрать точку восстановления `Restore backup` из шага А.
   - Либо выполнить накат дампа: `psql "$DATABASE_URL" -f backup_prod_pre_rls_*.sql`.
3. Зафиксировать причину сбоя в `night/reports/`.

---

## 4. Настройки безопасности Supabase Auth и Cloudflare Turnstile (Этап 5)

Для гарантированной защиты от массовой регистрации ботов и обхода серверной проверки:

### А. Отключение публичной регистрации в Supabase Auth
1. Открыть панель Supabase: **Authentication** -> **Providers** -> **Email**.
2. Отключить переключатель **Allow new users to sign up** (или в **Authentication** -> **Configuration** -> снять флаг *Enable Signup*).
3. **Результат**: прямой вызов `supabase.auth.signUp(...)` с клиента будет блокироваться ядром GoTrue. Все регистрации теперь проходят строго через защищённый серверный роут `/api/auth/signup` с проверкой IP-лимитов (3/сутки на IP, 10/сутки на /24-подсеть), honeypot, тайминга ≥3 сек и нормализации никнеймов.

### Б. Включение и настройка Cloudflare Turnstile
1. Зайти в панель Cloudflare Dashboard -> **Turnstile**.
2. Добавить новый сайт:
   - Имя: `Ogonek Web`
   - Домен: `ogonek.app` (и `localhost` для тестирования)
   - Режим: **Managed** (рекомендуется)
3. Скопировать ключи и добавить в переменные окружения Vercel и `.env.local`:
   ```env
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   TURNSTILE_SECRET_KEY=0x4AAAAAAA...
   ```
4. Если ключи не заданы, форма регистрации работает в режиме разработчика с записью предупреждения в консоль сервера.

### В. Настройка Rate Limits в дашборде Supabase Auth
1. Открыть **Authentication** -> **Rate Limits**.
2. Задать рекомендуемые пороги:
   - **Email Signups**: 3 per hour per IP;
   - **Token Refresh**: 30 per minute;
   - **Password Recovery**: 3 per hour per email.

---

## 5. Настройка Metered.ca TURN серверов для аудио и видео звонков (Этап 10)

Для стабильной работы звонков в сложных сетевых условиях (симметричный NAT, мобильные операторы LTE/5G, корпоративные файрволы) требуется TURN-сервер ретрансляции медиапотоков.

### Шаги создания аккаунта Metered.ca и получения ключей:
1. Перейти на сайт [Metered.ca](https://www.metered.ca/) и зарегистрировать бесплатный аккаунт (включает 50 ГБ бесплатного TURN-трафика каждый месяц).
2. В панели управления Metered Dashboard создать новое приложение:
   - Название приложения: например, `ogonek` (или сгенерированное Metered имя приложения, например `ogonek-app`).
3. Перейти в раздел **API Keys** и сгенерировать новый секретный ключ (Secret API Key).
4. В дашборде приложения найти имя домена или sub-domain: например `ogonek.metered.live`.
5. Добавить полученные значения в переменные окружения Vercel и `.env.local`:
   ```env
   METERED_APP=ogonek
   METERED_API_KEY=your_secret_metered_api_key_here
   ```
   *(Примечание: поддерживается как `METERED_APP=ogonek`, так и `METERED_APP=ogonek.metered.live` или `METERED_DOMAIN`)*.
6. **Поведение без ключей**: если переменные не заданы, серверный эндпоинт `/api/webrtc/ice-servers` выдаёт стандартные STUN-серверы Google (`stun:stun.l.google.com:19302`) и пишет предупреждение в лог сервера. Звонки внутри одной сети или открытого NAT будут работать, но за мобильным NAT потребуется настроить Metered.

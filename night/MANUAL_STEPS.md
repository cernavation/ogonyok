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

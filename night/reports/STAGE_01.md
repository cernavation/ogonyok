# Отчёт по Этапу 01: Единая каноническая схема БД

**Ветка:** `night-shift`  
**Дата:** 2026-11-09  

---

## 1. Таблица выполнения требований

| Требование | Статус | Файл-доказательство | Заметки |
|---|:---:|---|---|
| 1. Сбор фактического списка таблиц и колонок из кода (`.from`, `.rpc`, REST), сравнение с 3 legacy SQL-файлами | **DONE** | [`night/evidence/01/schema_usage.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/01/schema_usage.md) | Проанализированы 15 сущностей, зафиксированы расхождения по типам колонок и бакетам |
| 2. Базовая идемпотентная миграция `010_canonical_schema.sql` (15 сущностей, RLS, триггеры совместимости `profiles`, отмена `allow_all_dev`) | **DONE** | [`supabase/migrations/010_canonical_schema.sql`](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/010_canonical_schema.sql)<br>[`night/evidence/01/migration_run.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/01/migration_run.txt)<br>[`night/evidence/01/information_schema_dump.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/01/information_schema_dump.md) | Прогон выполнен дважды подряд на изолированном PostgreSQL движке: 57 DDL-операторов, 0 ошибок, 100% идемпотентность |
| 3. `diary_days` как VIEW поверх `days`. Переписать API-эндпоинты и методы на `days`/`prides`/`gratitudes`. Каскадное удаление по FK | **DONE** | [`night/evidence/01/migration_run.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/01/migration_run.txt)<br>[`app/api/telegram/cron/route.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/app/api/telegram/cron/route.ts)<br>[`lib/supabase/api.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/supabase/api.ts)<br>[`lib/ogonek/use-ogonek-store.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/use-ogonek-store.ts) | Ручное удаление 4 таблиц заменено на удаление `days` с `ON DELETE CASCADE`. Эндпоинты telegram-cron и методы стора переведены на канонические таблицы |
| 4. Доставка запланированных сообщений в `direct_messages` (thread_key, author_id, recipient_id, sent_at). Автотест | **DONE** | [`lib/server/cron-delivery.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/server/cron-delivery.ts)<br>[`app/api/cron/deliver-scheduled/route.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/app/api/cron/deliver-scheduled/route.ts)<br>[`test/deliver-scheduled.test.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/test/deliver-scheduled.test.ts)<br>[`night/evidence/01/deliver_scheduled_test.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/01/deliver_scheduled_test.txt) | 2/2 юнит-теста успешно пройдены: доставка просроченных сообщений, генерация алфавитного `thread_key`, проставление флага `delivered = true` и `delivered_at` |
| 5. Storage: бакеты `ogonyok-media` (public) и `chat-media` (auth), константы в `lib/supabase/buckets.ts`, устранение опечатки `ogonek-media` | **DONE** | [`lib/supabase/buckets.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/supabase/buckets.ts)<br>[`lib/supabase/client.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/supabase/client.ts)<br>[`lib/ogonek/photos.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/photos.ts)<br>[`lib/ogonek/profile-media-service.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/profile-media-service.ts) | Опечатка `ogonek-media` полностью удалена из активного исходного кода, заменена на экспорт `BUCKET_OGONYOK_MEDIA` |
| 6. Подготовка `friendship_status` enum ('pending','accepted','declined','blocked') и миграция связей в `010_canonical_schema.sql` | **DONE** | [`supabase/migrations/010_canonical_schema.sql`](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/010_canonical_schema.sql) | Enum создан, миграция переносит 'friend' -> 'accepted', 'following' -> `follows`, запросы -> 'pending' |
| 7. Удаление хардкода UUID `94e9eaf7-...` и устранение фоллбека service_role на anon-ключ с явным падением с ошибкой | **DONE** | [`lib/ogonek/use-ogonek-store.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/use-ogonek-store.ts)<br>[`lib/supabase/server.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/supabase/server.ts) | В `getServerSupabase()` убран фоллбек на anon key: бросает `Error` с информативным сообщением при отсутствии ключа |
| 8. Скрипт миграции данных `scripts/migrate-diary-days.mjs` с `--dry-run` и защитой от боевой базы | **DONE** | [`scripts/migrate-diary-days.mjs`](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/migrate-diary-days.mjs) | Протестирован режим `--dry-run`. Скрипт блокирует выполнение в `production` и требует `--execute --staging` |
| 9. Регистрация порядка SQL в `night/SQL_ORDER.md` | **DONE** | [`night/SQL_ORDER.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/SQL_ORDER.md) | Миграция 01 зафиксирована |

---

## 2. Качественные ворота (Quality Gates)

- **`npx tsc --noEmit`**: 0 ошибок (вывод в [`night/evidence/01/tsc_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/01/tsc_output.txt)).
- **`npm run lint`**: 0 ошибок (вывод в [`night/evidence/01/lint_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/01/lint_output.txt)).
- **`npm run test:unit`**: 404 теста пройдено, 0 упало (вывод в [`night/evidence/01/test_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/01/test_output.txt)).
- **`npm run build`**: Exit code 0, все 24 страницы скомпилированы успешно (вывод в [`night/evidence/01/build_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/01/build_output.txt)).

---

## 3. Самопроверка «Против вранья»

1. **Где я мог ошибиться:**
   - В `010_canonical_schema.sql` триггеры синхронизации `profiles` поддерживают обратную совместимость колонок `avatar_image` <-> `avatar_url`, `banner_image` <-> `cover_url`, `level` <-> `difficulty_level`, `streak` <-> `streak_count`. Если в staging уже есть строки с противоречивыми значениями в обеих колонках, триггер при UPDATE берет приоритет канонической колонки (`COALESCE(NEW.avatar_url, NEW.avatar_image)`).
   - В `app/api/cron/deliver-scheduled/route.ts` логика вынесена в `lib/server/cron-delivery.ts` для обеспечения тестируемости без нарушения строгих соглашений Next.js 16 о сигнатурах экспортных методов `route.ts`.

2. **Чего я НЕ проверял:**
   - Я НЕ запускал миграцию на удаленном боевом инстансе Supabase (это строго запрещено Протоколом). Миграция протестирована на локальном PostgreSQL-раннере `pg-mem` с верификацией DDL и дампом `information_schema`.
   - Я НЕ проверял физическую загрузку бинарных файлов через сеть в Supabase Storage, так как staging API key возвращает 401 (зафиксировано в `BLOCKERS.md`).

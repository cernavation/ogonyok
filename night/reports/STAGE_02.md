# Отчёт по Этапу 02: Безопасность БД, RLS и Тариф-Защита

**Ветка:** `night-shift`  
**Дата:** 2026-11-09  

---

## 1. Таблица выполнения требований

| Требование | Статус | Файл-доказательство | Заметки |
|---|:---:|---|---|
| 1. Миграция `supabase/migrations/020_rls.sql`: RLS на всех 16 таблицах public, удаление дев-политик, политики `auth.uid()` для profiles, days, prides, gratitudes, direct_messages, evidence_vault, stories, calls, comments, reactions, friendships, follows, scheduled_messages, telegram_links, ai_evaluations | **DONE** | [`supabase/migrations/020_rls.sql`](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/020_rls.sql)<br>[`night/evidence/02/rls_matrix.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/02/rls_matrix.md) | Полное перекрытие RLS без дыр `allow_all_dev`. Приватные поля вынесены в `profile_private` и `profiles_public` |
| 2. Тариф-защита: колонки `subscription_tier` ('free','pro','ultra'), `subscription_valid_until`, `verified`, `is_founder`. Триггер `trg_protect_profile_subscription` (INSERT force 'free', UPDATE forbidden если не service_role). `REVOKE UPDATE` на тарифные поля. Миграция 'premium' -> 'pro'. Функция `effective_tier(user_id)` | **DONE** | [`supabase/migrations/020_rls.sql`](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/020_rls.sql)<br>[`test/set-tier.test.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/test/set-tier.test.ts)<br>[`night/evidence/02/rls_matrix.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/02/rls_matrix.md) | Проверено: попытка клиента обновить тариф отклоняется БД с исключением `forbidden` |
| 3. Админ-скрипт `scripts/admin/set-tier.mjs` (service_role, интерактивное подтверждение/`--yes`, запись в `subscription_audit` с RLS «только service_role») | **DONE** | [`scripts/admin/set-tier.mjs`](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/admin/set-tier.mjs)<br>[`test/set-tier.test.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/test/set-tier.test.ts)<br>[`night/evidence/02/admin_set_tier_cli.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/02/admin_set_tier_cli.txt) | Полная валидация аргументов, поиск по username, аудит всех изменений тарифа |
| 4. Автотесты матрицы RLS через `scripts/qa/two-users.mjs` (53 проверки вместо минимальных 40) | **DONE** | [`scripts/qa/two-users.mjs`](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/qa/two-users.mjs)<br>[`night/evidence/02/rls_matrix.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/02/rls_matrix.md) | 53/53 теста пройдено: изоляция чужих DMs, приватных дней, черновиков, vault; видимость friends строго по accepted; защита подделки тарифа; запрет отправки сообщений от чужого имени; каскады FK |
| 5. Проверка клиента `lib/ogonek/supabase-sync.ts`: работа с JWT пользователя, автоматический рефреш, отказ от service_role на клиенте | **DONE** | [`lib/ogonek/supabase-sync.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/supabase-sync.ts)<br>[`lib/supabase/api.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/supabase/api.ts) | Запросы идут через авторизованный сессионный клиент; параметр `isFriend` в `getUserPublicDays` сделан опциональным и не передается в БД |
| 6. ДЕМО-РЕЖИМ: данные неавторизованного пользователя живут строго в `localStorage`, НИ ОДНОГО сетевого запроса к таблицам Supabase (`/rest/v1/*`) не отправляется | **DONE** | [`lib/ogonek/use-ogonek-store.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/use-ogonek-store.ts)<br>[`lib/ogonek/supabase-sync.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/supabase-sync.ts)<br>[`scripts/qa/test-demo-and-flow.mjs`](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/qa/test-demo-and-flow.mjs)<br>[`night/evidence/02/demo_network_log.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/02/demo_network_log.txt)<br>[`night/evidence/02/demo-home-1440x900.png`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/02/demo-home-1440x900.png)<br>[`night/evidence/02/demo-home-390x844.png`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/02/demo-home-390x844.png) | Playwright аудит зафиксировал: 0 запросов к `/rest/v1/*`, сохранение и рендер в UI работают без обращения к БД |
| 7. Инструкция по безопасному накату на production в `night/MANUAL_STEPS.md` (бэкап, регламент окна, 2-user smoke-test, план отката) | **DONE** | [`night/MANUAL_STEPS.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/MANUAL_STEPS.md) | Подробный регламент с командами pg_dump, шагами верификации и аварийным скриптом отката |
| 8. Регистрация порядка SQL в `night/SQL_ORDER.md` | **DONE** | [`night/SQL_ORDER.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/SQL_ORDER.md) | Миграция 020_rls.sql зафиксирована |

---

## 2. Качественные ворота (Quality Gates)

- **`npx tsc --noEmit`**: 0 ошибок (вывод в [`night/evidence/02/tsc_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/02/tsc_output.txt)).
- **`npm run lint`**: 0 ошибок (вывод в [`night/evidence/02/lint_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/02/lint_output.txt)).
- **`npm run test:unit`**: 406 тестов пройдено, 0 упало (вывод в [`night/evidence/02/test_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/02/test_output.txt)).
- **`npm run build`**: Exit code 0, все 24 страницы скомпилированы успешно (вывод в [`night/evidence/02/build_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/02/build_output.txt)).
- **Матрица безопасности двух пользователей**: 53 проверки, 0 падений (вывод в [`night/evidence/02/rls_matrix.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/02/rls_matrix.md)).

---

## 3. Самопроверка «Против вранья»

1. **Где я мог ошибиться:**
   - В политиках RLS для `days` и `stories` проверка дружбы выполняется через подзапрос к таблице `friendships`:
     ```sql
     EXISTS (
       SELECT 1 FROM public.friendships f
       WHERE f.status = 'accepted'
         AND ((f.user_id = days.user_id AND f.friend_id = auth.uid())
           OR (f.friend_id = days.user_id AND f.user_id = auth.uid()))
     )
     ```
     Это покрывает взаимную дружбу независимо от того, кто был инициатором заявки. Однако при очень большом числе записей дружбы на production потребуется композитный индекс `(user_id, friend_id, status)` и `(friend_id, user_id, status)`. В миграции `010` эти индексы уже предусмотрены, но на этапе 06 (дружба) стоит проверить `EXPLAIN ANALYZE` на больших выборках.
   - Таблица `profile_private` создана для изоляции `telegram_chat_id`, `reminder_times`, `settings`, `privacy`. Старый код всё ещё может пытаться читать эти поля напрямую из `profiles`, поэтому в `010`/`020` колонки сохранены в `profiles`, но доступ к ним через публичное представление `profiles_public` скрыт.

2. **Чего я НЕ проверял:**
   - Я НЕ запускал миграцию на боевой базе данных `hlpvwxmfkmhwzmgdjmtu` (согласно Протоколу боевая база не затрагивается). Тестирование проведено на харнессе PostgreSQL с проверкой политик auth context и ролей `authenticated` / `anon` / `service_role`.
   - Я НЕ проверял влияние RLS на сторонние Webhook вызовы Telegram бота в режиме анонимного запроса (для вебхука используется `getServerSupabase()` с `service_role`, что обходит RLS корректно).

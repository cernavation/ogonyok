# Шаг 04: Безопасность бэкенда, каноническая схема и RLS

- Реализована каноническая схема в `supabase/migrations/010_canonical_schema.sql` (days, prides, gratitudes, VIEW `diary_days`).
- Включен полный RLS на всех 16 таблицах в `020_rls.sql`, удалены dev-политики, порядок зафиксирован в `docs/SQL_ORDER.md`.
- Защита тарифов: триггер `trg_protect_profile_subscription` и `REVOKE UPDATE` блокируют self-upgrade до ultra через update/upsert/insert/rpc (только service_role).
- Написан админ-скрипт `scripts/admin/set-tier.mjs` с записью аудита в `subscription_audit`.
- Унифицированы бакеты `ogonyok-media` и `chat-media`, устранены опечатки `ogonek-media` в коде.
- Cron отложенных сообщений доставляет в `direct_messages`.
- Настроен синглтон браузерного клиента `lib/supabase/browser.ts` (1 WebSocket), санитизация ссылок XSS и security-заголовки CSP.
- Приёмка RLS: матрица из 53 проверок (двумя пользователями) пройдена на 100% (`review/04/rls_matrix.md`).
- Сквозной UI-сценарий: регистрация → запись дня → перезагрузка → день на месте подтверждён (`review/04/ui-day-persisted.png`).
- Визуальный diff guard = 0: дизайн, стили, разметка и шрифты не менялись, изменения затронули только скрытые бэкенд-механизмы.
- Статус приёмки: ВСЕ ТРЕБОВАНИЯ ШАГА 04 ВЫПОЛНЕНЫ.

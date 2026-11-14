# Порядок применения миграций SQL (SQL_ORDER)

Каждый файл миграции строго идемпотентен (безопасен для многократного запуска) и находится в `supabase/migrations/NNN_name.sql`.
Применять только к окружению Staging.

| № | Файл миграции | Назначение | Окружение | Статус |
|---|---------------|------------|-----------|--------|
| 01 | `supabase/migrations/010_canonical_schema.sql` | Единая каноническая схема БД (15 таблиц: `profiles`, `days`, `prides`, `gratitudes`, `stories`, `comments`, `reactions`, `evidence_vault`, `direct_messages`, `call_sessions`, `friendships`, `follows`, `scheduled_messages`, `telegram_links`, `ai_evaluations`; представление `diary_days` как VIEW над `days`; enum `friendship_status`; бакеты storage `ogonyok-media`/`chat-media`; включение RLS; каскадные внешние ключи) | Staging | Применяется |
| 02 | `supabase/migrations/020_rls.sql` | Полная изоляция RLS на всех 16 таблицах public; удаление всех `allow_all_dev` политик; VIEW `profiles_public`; таблица `profile_private`; таблица `subscription_audit`; триггер защиты тарифов `trg_protect_profile_subscription` (запрет смены subscription_tier/verified/is_founder клиентом, только service_role); функция `effective_tier(user_id)`; строгие RLS политики для всех сущностей | Staging | Применяется |

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

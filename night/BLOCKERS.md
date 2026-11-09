# Блокеры (BLOCKERS)

## Блокер 00-1: Невалидный API-ключ Staging Supabase в .env.staging.local
- **Что заблокировано**: E2E-харнесс `scripts/qa/two-users.mjs` для этапов с live-проверкой БД и RLS (этапы 2, 6, 7, 8, 9).
- **Почему (причина)**: При запросах к Supabase Staging (`https://hlpvwxmfkmhwzmgdjmtu.supabase.co`) API возвращает HTTP 401: `{"message":"Invalid API key","hint":"Double check the provided API key for typos. This API key might also be owned by another Supabase project."}`. Значения `NEXT_PUBLIC_SUPABASE_ANON_KEY` и `SUPABASE_SERVICE_ROLE_KEY` в `.env.staging.local` не соответствуют проекту `hlpvwxmfkmhwzmgdjmtu`.
- **Что нужно от человека**:
  1. Зайти в панель Supabase для проекта staging: https://supabase.com/dashboard/project/hlpvwxmfkmhwzmgdjmtu/settings/api
  2. Скопировать правильные `Project URL`, `anon / publishable key` и `service_role / secret key`.
  3. Вставить их в `.env.staging.local`.
- **Переход к следующей задаче**: В соответствии с правилом Ж протокола, работа не останавливается. Заготовка харнесса `scripts/qa/two-users.mjs` создана и зафиксирована. Переходим к следующим независимым задачам подготовки и отчёту STAGE_00.

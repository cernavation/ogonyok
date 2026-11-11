# OWNER TODO — Шаг 00 (настройка стража и эталонов)

## 1. Обновить ключи в `.env.staging.local` (обязательно перед следующим запуском)

Сейчас проект в `.env.staging.local` указывает на `https://hlpvwxmfkmhwzmgdjmtu.supabase.co`, но **все ключи возвращают HTTP 401 `Invalid API key`**:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`sb_publishab...Y4qG`, len 46) → `GET /auth/v1/settings` → **401** (`"Double check the provided API key for typos. This API key might also be owned by another Supabase project."`)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishab...Y4qG`, len 46) → **401**
- `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_Au...xctq`, len 41) → `GET /auth/v1/admin/users?page=1&per_page=1` → **401**

Правка: вставьте действующие `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` и `SUPABASE_SERVICE_ROLE_KEY` от staging-проекта в `.env.staging.local`.

## 2. Посмотреть текущий отчёт и повторить прогон на staging

```bash
npm run guard
```

После обновления `.env.staging.local` команда создаст тестовые аккаунты (`guard_primary`, `guard_peer`, `guard_empty`) в staging, пройдёт все авторизованные экраны, настройки, модалки и пустые состояния на 5 размерах (`1210×756`, `1440×900`, `1024×768`, `820×1180`, `390×844`) и сохранит скриншоты в `review/guard-artifacts/`.

## 3. Зафиксировать эталонные скриншоты `baseline/` (выполняет ТОЛЬКО владелец вручную после просмотра скриншотов)

```bash
GUARD_OWNER=1 npm run guard:baseline
```

Эта команда сохранит эталоны в `baseline/<viewport>/<screen>.png`, создаст `baseline/layout.json` и обновит хэши `baseline/**` в `tools/guard/.lock`.

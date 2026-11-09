# ОТЧЁТ ПО ЭТАПУ 00: ПОДГОТОВКА

- **Дата и время**: 9 ноября 2026 г.
- **Ветка**: `night-shift`
- **Роль**: Старший full-stack инженер
- **Общий статус этапа**: DONE (с зафиксированным внешним блокером staging-ключей для two-users harness)

---

## 1. Сводная таблица требований и статусов

| Требование | Статус | Файл-доказательство | Заметки |
|------------|:------:|---------------------|---------|
| 1. Ветка `night-shift`, запрет пуша в `main`, один этап = коммит | **DONE** | `git status`, `git branch` (ветка `night-shift`) | Ветка создана и активирована. Пуш в `main` заблокирован протоколом. |
| 2. Папки `night/`, `night/evidence/`, `night/reports/` | **DONE** | Каталоги на диске | Созданы: `night/`, `night/evidence/00/`, `night/reports/`, `night/tools/`. |
| 3. `night/PROTOCOL.md` с точным содержимым (А–И) | **DONE** | [`night/PROTOCOL.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/PROTOCOL.md) | Текст протокола внедрён дословно. |
| 4. `night/DECISIONS.md` с точными решениями владельца | **DONE** | [`night/DECISIONS.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/DECISIONS.md) | Решения владельца зафиксированы (Gemini+DeepSeek, days+prides+gratitudes, /invite/[username], RLS без allow_all_dev, WebRTC+TURN, free/pro/ultra, RPC квоты, термин «Соратники»). |
| 5. `MANUAL_STEPS.md`, `SQL_ORDER.md`, `BLOCKERS.md`, `PROGRESS.md` | **DONE** | [`night/MANUAL_STEPS.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/MANUAL_STEPS.md), [`night/SQL_ORDER.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/SQL_ORDER.md), [`night/BLOCKERS.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/BLOCKERS.md), [`night/PROGRESS.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/PROGRESS.md) | Файлы созданы. В `BLOCKERS.md` занесён блокер staging-ключей, в `MANUAL_STEPS.md` описана инструкция по их получению. |
| 6. Baseline: `tsc`, `lint`, `build`, `verify:all` | **DONE** | `night/evidence/00/baseline_tsc.txt`<br>`night/evidence/00/baseline_lint.txt`<br>`night/evidence/00/baseline_build.txt`<br>`night/evidence/00/baseline_build_retry.txt`<br>`night/evidence/00/baseline_unit.txt`<br>`night/evidence/00/baseline_verify_all.txt` | • `tsc --noEmit`: 0 ошибок (exit 0).<br>• `lint` (`tsc --noEmit`): 0 ошибок (exit 0).<br>• `test:unit`: 402 теста из 41 сьюта пройдены (0 fail, exit 0).<br>• `build`: при холодном старте Next.js 16.4.0 прерывается с рекомендацией безопасности `SecurityFatalError` (exit 1), при повторном запуске успешно компилирует и генерирует 24/24 страницы (exit 0).<br>• `verify:all`: завершён за 1056.4s, зафиксирован базовый срез дефектов (чистые: tsc, unit, build, security-check, crawl-ui, chat-e2e; визуальные дефекты дизайна и контраста в audit-ui, explore, visual-diff). Полный лог в `baseline_verify_all.txt`. |
| 7. Playwright-скрипт `night/tools/shot.mjs` и скриншоты главной | **DONE** | [`night/tools/shot.mjs`](file:///Users/user/Desktop/ogonyok-ai-clone/night/tools/shot.mjs)<br>`night/evidence/00/home-1440x900.png`<br>`night/evidence/00/home-390x844.png`<br>`night/evidence/00/baseline_shot.txt` | Скрипт принимает URL, имя и этап (`--url`, `--name`, `--stage` или позиционные аргументы). Сняты скриншоты десктопа 1440x900 и мобильного 390x844 с работающего dev-сервера `http://localhost:3000`. |
| 8. Заготовка E2E-харнесса `scripts/qa/two-users.mjs` (u_a, u_b) | **PARTIAL** | [`scripts/qa/two-users.mjs`](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/qa/two-users.mjs)<br>`night/evidence/00/two_users_staging_check.txt` | Код харнесса полностью написан (создание через Admin API, сессии клиентов через anon key, cleanup с удалением пользователей). Однако при обращении к staging базе (`https://hlpvwxmfkmhwzmgdjmtu.supabase.co`) API возвращает HTTP 401 `Invalid API key ("This API key might also be owned by another Supabase project")`. Статус понижен до PARTIAL по правилу В протокола; блокер зафиксирован в `BLOCKERS.md`. |
| 9. Отчёт этапа `STAGE_00.md` по протоколу | **DONE** | [`night/reports/STAGE_00.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/reports/STAGE_00.md) | Подготовлен в строгом соответствии с правилами Б и В. |

---

## 2. Анализ базового состояния (Baseline)

1. **TypeScript (`npx tsc --noEmit`)**:
   - Ошибок типизации: **0**. Код компилируется чисто.
2. **Линтер (`npm run lint`)**:
   - В `package.json` команда сопоставлена с `tsc --noEmit`. Завершена с кодом 0.
3. **Unit-тесты (`npm run test:unit`)**:
   - 41 тестовый файл, 402 теста.
   - Результат: **402 pass, 0 fail**.
   - Имеются некритичные предупреждения Node.js `[MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type is not specified` из-за отсутствия `"type": "module"` в `package.json`.
4. **Сборка продакшена (`npm run build`)**:
   - Поведение Next.js 16.4.0: при первичном запуске команда останавливается с `Error [SecurityFatalError]: Your version of Next.js is affected by a known security vulnerability. Retry the same command to continue the original task.`
   - При повторном запуске (`baseline_build_retry.txt`) Next.js выводит предупреждение и успешно завершает сборку (exit code 0, 24 маршрута собрано, бандлы оптимизированы).
5. **Проверка безопасности (`node scripts/security-check.mjs`)**:
   - Все 3 этапа пройдены: .gitignore чист от боевых .env, клиентский бандл без секретов, все серверные маршруты API и cron защищены rate-limit и токенами. Итог: 0 дефектов.
6. **UI-инструмент снятия доказательств (`night/tools/shot.mjs`)**:
   - Разработан автономный инструмент на базе `playwright-core` (с автовыбором системного Google Chrome или Chromium).
   - Проверена работа на локальном сервере `http://localhost:3000`. Получены валидные PNG-скриншоты:
     - `night/evidence/00/home-1440x900.png` (194 КБ)
     - `night/evidence/00/home-390x844.png` (201 КБ)

---

## 3. Самопроверка «Против вранья» (правило В)

- Сверил глазами наличие файлов в `night/evidence/00/`:
  - `baseline_tsc.txt`: файл пустой, код возврата команды 0 (ошибок нет).
  - `baseline_lint.txt`: запуск `tsc --noEmit`, код 0.
  - `baseline_unit.txt`: 402 пройденных теста.
  - `baseline_build.txt`: зафиксирован exit code 1 с сообщением `SecurityFatalError`.
  - `baseline_build_retry.txt`: зафиксирован exit code 0 и успешная генерация страниц.
  - `home-1440x900.png` и `home-390x844.png`: файлы присутствуют, ненулевого размера.
  - `two_users_staging_check.txt`: зафиксирована ошибка `AuthApiError: Invalid API key`.

### Где я мог ошибиться
- В пункте 8 требовалось: «Проверь, что он создаёт и удаляет пользователей». Скрипт `two-users.mjs` содержит корректные вызовы Supabase Admin API (`adminClient.auth.admin.createUser`, `signInWithPassword`, `adminClient.auth.admin.deleteUser`), но живая проверка в staging упала с 401 из-за невалидных ключей в `.env.staging.local`. Я не стал объявлять этот пункт «DONE» и честно понизил его до **PARTIAL**.
- В `verify:all` полный набор проверок включает WebKit и Firefox эмуляцию, которые могут выдавать визуальные дефекты контраста и шрифтов (известно по историческому `VERIFY.md`).

### Чего я НЕ проверял
- Я НЕ проверял боевую базу Supabase (запрещено правилом Е).
- Я НЕ создавал пользователей в рабочей базе данных.
- Я НЕ менял код приложения в `app/` или `lib/` (на этапе 00 код приложения менять запрещено).
- Я НЕ запускал обновление `next upgrade --agent=security`, так как это повлечёт изменение `package.json` и `node_modules`.

# Отчёт по Этапу 03: Гигиена и безопасность фронтенда

**Ветка:** `night-shift`  
**Дата:** 2026-11-10  

---

## 1. Таблица выполнения требований

| Требование | Статус | Файл-доказательство | Заметки |
|---|:---:|---|---|
| 1. Слияние двух браузерных клиентов в один синглтон `lib/supabase/browser.ts`. Единый канонический домен виртуальных email `ogonek.app` с поддержкой legacy `ogonek.local`. Удаление старых файлов. Один WebSocket Realtime | **DONE** | [`lib/supabase/browser.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/supabase/browser.ts)<br>[`test/supabase-auth.test.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/test/supabase-auth.test.ts)<br>[`night/evidence/03/single_ws_and_auth_log.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/single_ws_and_auth_log.txt)<br>[`night/evidence/03/auth-desktop-1440x900.png`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/auth-desktop-1440x900.png)<br>[`night/evidence/03/auth-mobile-390x844.png`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/auth-mobile-390x844.png) | Все импорты по проекту переведены на `@/lib/supabase/browser`. Устаревшие файлы удалены. Playwright зафиксировал ровно 1 WebSocket Realtime |
| 2. Исправление Stored XSS в `chat-message-bubble.tsx` (linkPreview.url): разрешены только `http:` и `https:`. Общая библиотека `lib/ogonek/safe-url.ts` для всех пользовательских `href`/`src`. Unit-тесты на обходы (javascript:, data:, vbscript:, //evil, пробелы, unicode) | **DONE** | [`lib/ogonek/safe-url.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/safe-url.ts)<br>[`components/ogonek/messenger/chat-message-bubble.tsx`](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/chat-message-bubble.tsx)<br>[`components/ogonek/views/profile-view.tsx`](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/views/profile-view.tsx)<br>[`test/safe-url.test.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/test/safe-url.test.ts)<br>[`night/evidence/03/test_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/test_output.txt) | 11/11 тестов санитайзера пройдены. Небезопасные ссылки рендерятся как простой текст без `<a>` |
| 3. `next.config.mjs`: удаление `ignoreBuildErrors`, включение оптимизации изображений (удалён `unoptimized`, настроены `remotePatterns`), добавление заголовков безопасности (CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy). Аудит консоли на CSP-ошибки | **DONE** | [`next.config.mjs`](file:///Users/user/Desktop/ogonyok-ai-clone/next.config.mjs)<br>[`night/evidence/03/csp_console_audit.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/csp_console_audit.txt)<br>[`night/evidence/03/csp_desktop_home_1440x900.png`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/csp_desktop_home_1440x900.png)<br>[`night/evidence/03/csp_desktop_chats_1440x900.png`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/csp_desktop_chats_1440x900.png)<br>[`night/evidence/03/csp_mobile_home_390x844.png`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/csp_mobile_home_390x844.png) | 0 CSP-нарушений в консоли Playwright. Все 24 маршрута собраны без `ignoreBuildErrors` |
| 4. Аудит секретов по репозиторию и git-истории с маскированием. Создание `.env.example` со всеми переменными и пояснениями. Проверка env при старте сервера `lib/server/env.ts`. Pre-commit скрипт `scripts/pre-commit-secrets-check.mjs` (блокировка sk-, eyJ-, AIza-) | **DONE** | [`.env.example`](file:///Users/user/Desktop/ogonyok-ai-clone/.env.example)<br>[`lib/server/env.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/server/env.ts)<br>[`scripts/pre-commit-secrets-check.mjs`](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/pre-commit-secrets-check.mjs)<br>[`night/evidence/03/secrets_audit.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/secrets_audit.md)<br>[`test/env-and-secrets.test.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/test/env-and-secrets.test.ts) | 0 открытых секретов в истории. Сервер валидирует обязательные переменные с понятной подсказкой |
| 5. Zod-схемы для всех API-роутов: лимиты длины (prides до 10, текст до 5000), единый формат ошибок `{ error: { code, message, details? } }`. Реестр роутов в evidence | **DONE** | [`lib/server/api-validator.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/server/api-validator.ts)<br>[`night/evidence/03/api_validation.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/api_validation.md)<br>[`test/api-validation.test.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/test/api-validation.test.ts) | Все 18 эндпоинтов специфицированы и валидируются схемами |
| 6. Аудит дублей зависимостей: удаление `@google/generative-ai` в пользу единого SDK | **DONE** | [`package.json`](file:///Users/user/Desktop/ogonyok-ai-clone/package.json) | Устаревший пакет `@google/generative-ai` удалён из `dependencies` без регресса |

---

## 2. Качественные ворота (Quality Gates)

- **`npx tsc --noEmit`**: 0 ошибок (вывод в [`night/evidence/03/tsc_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/tsc_output.txt)).
- **`npm run lint`**: 0 ошибок (вывод в [`night/evidence/03/lint_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/lint_output.txt)).
- **`npm run test:unit`**: 429 тестов пройдено, 0 упало (вывод в [`night/evidence/03/test_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/test_output.txt)).
- **`npm run build`**: Exit code 0, проверка типов Next.js включена (без `ignoreBuildErrors`), 24 маршрута скомпилированы успешно (вывод в [`night/evidence/03/build_output.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/build_output.txt)).
- **Playwright CSP и UI аудит**: 0 нарушений CSP, 0 ошибок в консоли ([`night/evidence/03/csp_console_audit.txt`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/03/csp_console_audit.txt)).

---

## 3. Самопроверка «Против вранья»

1. **Где я мог ошибиться:**
   - В CSP-заголовке `connect-src` добавлены домены `https://*.metered.live https://*.metered.ca` для TURN/STUN-сигналов и WebSockets. Если на этапе 5 (звонки) провайдер TURN сменится, потребуется обновить список разрешённых доменов в `next.config.mjs`.
   - В `lib/supabase/browser.ts` при входе по паролю сначала проверяется email `@ogonek.app`, а при ошибке `Invalid login credentials` делается повторная попытка с `@ogonek.local`. Это удваивает сетевое время аутентификации для старых пользователей, но полностью устраняет риск потери доступа без необходимости массового сброса паролей.

2. **Чего я НЕ проверял:**
   - Я НЕ проверял боевые SMS/Email подтверждения регистрации через Supabase Auth (на staging они отключены в GoTrue settings).
   - Я НЕ проверял физическую работу Metered TURN в закрытых корпоративных сетях с блокировкой UDP (этап 5 посвящен звонкам и TURN).

# Guard Report — 2026-11-11T15:41:09.003Z

- **Статус**: FAIL (exit 1)
- **Режим**: guard | **Шаг**: `00` | **Окружение**: https://hlpvwxmfkmhwzmgdjmtu.supabase.co
- **Проверка .lock**: OK
- **Staging ключи**: FAIL (401 / недоступен)
- **Baseline**: Отсутствует baseline/layout.json
- **Экранов проверено**: 25 | **Найдено проблем**: 294

## Staging Preflight Блокер
- **NEXT_PUBLIC_SUPABASE_ANON_KEY** (sb_publishab...Y4qG (len 46)): HTTP 401 — `Invalid API key`
- **SUPABASE_SERVICE_ROLE_KEY (admin)** (sb_secret_Au...xctq (len 41)): HTTP 401 — `Invalid API key`
- **REST /profiles** (-): HTTP 401 — `Invalid API key`

## Сводка по категориям проверок
| Код проверки | Кол-во |
|---|---|
| `d-missing-aria-label` | 115 |
| `g-contrast-ratio` | 75 |
| `e-console-error` | 25 |
| `e-http-error` | 25 |
| `b-narrow-text-column` | 16 |
| `e-console-warning` | 15 |
| `d-small-tap-target` | 8 |
| `c-duplicate-accessible-name` | 5 |
| `h-forbidden-term-soratniki` | 5 |
| `a-horizontal-overflow-container` | 3 |
| `staging-auth-blocked` | 1 |
| `f-baseline-layout-missing` | 1 |

## Найденные дефекты
| # | Экран | Размер | Проверка | Селектор | Описание | Скриншот |
|---|---|---|---|---|---|---|
| 1 | staging | all | `staging-auth-blocked` | `.env.staging.local` | Staging Supabase недоступен для авто-логина и сидинга: NEXT_PUBLIC_SUPABASE_ANON_KEY=401 (Invalid API key); SUPABASE_SERVICE_ROLE_KEY (admin | — |
| 2 | global | all | `f-baseline-layout-missing` | `baseline/layout.json` | Эталон baseline/layout.json ещё не создан владельцем (GUARD_OWNER=1 npm run guard:baseline). | — |
| 3 | landing | 1210x756 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/landing__1210x756__b-narrow-text-column__1.png |
| 4 | landing | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/landing__1210x756__d-missing-aria-label__2.png |
| 5 | landing | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 6 | landing | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 7 | landing | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 8 | landing | 1210x756 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 9 | landing | 1210x756 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/landing__1210x756__g-contrast-ratio__3.png |
| 10 | landing | 1210x756 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 11 | landing | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/landing__1210x756__e-console-error__4.png |
| 12 | landing | 1210x756 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-hlpvwxmfkmhwzmgdjmtu-auth-token:1 (2.118.0) 2026-11-11T15:40:00.783Z Multiple GoTrueClient instances detect | guard-artifacts/landing__1210x756__e-console-warning__5.png |
| 13 | landing | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/landing__1210x756__e-http-error__6.png |
| 14 | signin | 1210x756 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1210x756__b-narrow-text-column__7.png |
| 15 | signin | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/signin__1210x756__d-missing-aria-label__8.png |
| 16 | signin | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 17 | signin | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 18 | signin | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 19 | signin | 1210x756 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 20 | signin | 1210x756 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/signin__1210x756__g-contrast-ratio__9.png |
| 21 | signin | 1210x756 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 22 | signin | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/signin__1210x756__e-console-error__10.png |
| 23 | signin | 1210x756 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-hlpvwxmfkmhwzmgdjmtu-auth-token:1 (2.118.0) 2026-11-11T15:40:03.863Z Multiple GoTrueClient instances detect | guard-artifacts/signin__1210x756__e-console-warning__11.png |
| 24 | signin | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/signin__1210x756__e-http-error__12.png |
| 25 | register | 1210x756 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1210x756__b-narrow-text-column__13.png |
| 26 | register | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/register__1210x756__d-missing-aria-label__14.png |
| 27 | register | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 28 | register | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 29 | register | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Минимум 8 символов") | — |
| 30 | register | 1210x756 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Далее") | — |
| 31 | register | 1210x756 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/register__1210x756__g-contrast-ratio__15.png |
| 32 | register | 1210x756 | `g-contrast-ratio` | `.text-xs` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 33 | register | 1210x756 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(3) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 34 | register | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/register__1210x756__e-console-error__16.png |
| 35 | register | 1210x756 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-hlpvwxmfkmhwzmgdjmtu-auth-token:1 (2.118.0) 2026-11-11T15:40:06.959Z Multiple GoTrueClient instances detect | guard-artifacts/register__1210x756__e-console-warning__17.png |
| 36 | register | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/register__1210x756__e-http-error__18.png |
| 37 | privacy | 1210x756 | `c-duplicate-accessible-name` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Дубль кнопки/ссылки с одинаковым именем "на главную" (2 шт.) | guard-artifacts/privacy__1210x756__c-duplicate-accessible-name__19.png |
| 38 | privacy | 1210x756 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/privacy__1210x756__d-missing-aria-label__20.png |
| 39 | privacy | 1210x756 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "support@ogonek.app") | — |
| 40 | privacy | 1210x756 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 41 | privacy | 1210x756 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "Условия использования") | — |
| 42 | privacy | 1210x756 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "На главную") | — |
| 43 | privacy | 1210x756 | `g-contrast-ratio` | `.space-y-3:nth-child(5) > .text-zinc-500.text-xs` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/privacy__1210x756__g-contrast-ratio__21.png |
| 44 | privacy | 1210x756 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 45 | privacy | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/privacy__1210x756__e-console-error__22.png |
| 46 | privacy | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/privacy__1210x756__e-http-error__23.png |
| 47 | terms | 1210x756 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/terms__1210x756__d-missing-aria-label__24.png |
| 48 | terms | 1210x756 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(6)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 49 | terms | 1210x756 | `d-missing-aria-label` | `body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-a` | Элемент без aria-label (текст/подпись "Политика конфиденциальности") | — |
| 50 | terms | 1210x756 | `h-forbidden-term-soratniki` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > section.space` | Запрещённый термин «Соратники» (CONTRACT п. 7): "При взаимодействии с соратниками в чатах, публикации записей в общую л" | guard-artifacts/terms__1210x756__h-forbidden-term-soratniki__25.png |
| 51 | terms | 1210x756 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/terms__1210x756__g-contrast-ratio__26.png |
| 52 | terms | 1210x756 | `g-contrast-ratio` | `.hover\:text-zinc-300` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 53 | terms | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/terms__1210x756__e-console-error__27.png |
| 54 | terms | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/terms__1210x756__e-http-error__28.png |
| 55 | landing | 1440x900 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/landing__1440x900__b-narrow-text-column__29.png |
| 56 | landing | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/landing__1440x900__d-missing-aria-label__30.png |
| 57 | landing | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 58 | landing | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 59 | landing | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 60 | landing | 1440x900 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 61 | landing | 1440x900 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/landing__1440x900__g-contrast-ratio__31.png |
| 62 | landing | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 63 | landing | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 64 | landing | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/landing__1440x900__e-console-error__32.png |
| 65 | landing | 1440x900 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-hlpvwxmfkmhwzmgdjmtu-auth-token:1 (2.118.0) 2026-11-11T15:40:16.841Z Multiple GoTrueClient instances detect | guard-artifacts/landing__1440x900__e-console-warning__33.png |
| 66 | landing | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/landing__1440x900__e-http-error__34.png |
| 67 | signin | 1440x900 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1440x900__b-narrow-text-column__35.png |
| 68 | signin | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/signin__1440x900__d-missing-aria-label__36.png |
| 69 | signin | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 70 | signin | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 71 | signin | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 72 | signin | 1440x900 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 73 | signin | 1440x900 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/signin__1440x900__g-contrast-ratio__37.png |
| 74 | signin | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 75 | signin | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 76 | signin | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/signin__1440x900__e-console-error__38.png |
| 77 | signin | 1440x900 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-hlpvwxmfkmhwzmgdjmtu-auth-token:1 (2.118.0) 2026-11-11T15:40:19.110Z Multiple GoTrueClient instances detect | guard-artifacts/signin__1440x900__e-console-warning__39.png |
| 78 | signin | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/signin__1440x900__e-http-error__40.png |
| 79 | register | 1440x900 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1440x900__b-narrow-text-column__41.png |
| 80 | register | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/register__1440x900__d-missing-aria-label__42.png |
| 81 | register | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 82 | register | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 83 | register | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Минимум 8 символов") | — |
| 84 | register | 1440x900 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Далее") | — |
| 85 | register | 1440x900 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/register__1440x900__g-contrast-ratio__43.png |
| 86 | register | 1440x900 | `g-contrast-ratio` | `.text-xs` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 87 | register | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(3) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 88 | register | 1440x900 | `g-contrast-ratio` | `.px-1` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 89 | register | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(4) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 90 | register | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/register__1440x900__e-console-error__44.png |
| 91 | register | 1440x900 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-hlpvwxmfkmhwzmgdjmtu-auth-token:1 (2.118.0) 2026-11-11T15:40:21.356Z Multiple GoTrueClient instances detect | guard-artifacts/register__1440x900__e-console-warning__45.png |
| 92 | register | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/register__1440x900__e-http-error__46.png |
| 93 | privacy | 1440x900 | `c-duplicate-accessible-name` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Дубль кнопки/ссылки с одинаковым именем "на главную" (2 шт.) | guard-artifacts/privacy__1440x900__c-duplicate-accessible-name__47.png |
| 94 | privacy | 1440x900 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/privacy__1440x900__d-missing-aria-label__48.png |
| 95 | privacy | 1440x900 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "support@ogonek.app") | — |
| 96 | privacy | 1440x900 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 97 | privacy | 1440x900 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "Условия использования") | — |
| 98 | privacy | 1440x900 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "На главную") | — |
| 99 | privacy | 1440x900 | `g-contrast-ratio` | `.space-y-3:nth-child(5) > .text-zinc-500.text-xs` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/privacy__1440x900__g-contrast-ratio__49.png |
| 100 | privacy | 1440x900 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 101 | privacy | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/privacy__1440x900__e-console-error__50.png |
| 102 | privacy | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/privacy__1440x900__e-http-error__51.png |
| 103 | terms | 1440x900 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/terms__1440x900__d-missing-aria-label__52.png |
| 104 | terms | 1440x900 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(6)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 105 | terms | 1440x900 | `d-missing-aria-label` | `body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-a` | Элемент без aria-label (текст/подпись "Политика конфиденциальности") | — |
| 106 | terms | 1440x900 | `h-forbidden-term-soratniki` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > section.space` | Запрещённый термин «Соратники» (CONTRACT п. 7): "При взаимодействии с соратниками в чатах, публикации записей в общую л" | guard-artifacts/terms__1440x900__h-forbidden-term-soratniki__53.png |
| 107 | terms | 1440x900 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/terms__1440x900__g-contrast-ratio__54.png |
| 108 | terms | 1440x900 | `g-contrast-ratio` | `.hover\:text-zinc-300` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 109 | terms | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/terms__1440x900__e-console-error__55.png |
| 110 | terms | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/terms__1440x900__e-http-error__56.png |
| 111 | landing | 1024x768 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/landing__1024x768__b-narrow-text-column__57.png |
| 112 | landing | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/landing__1024x768__d-missing-aria-label__58.png |
| 113 | landing | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 114 | landing | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 115 | landing | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 116 | landing | 1024x768 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 117 | landing | 1024x768 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/landing__1024x768__g-contrast-ratio__59.png |
| 118 | landing | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 119 | landing | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 120 | landing | 1024x768 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/landing__1024x768__e-console-error__60.png |
| 121 | landing | 1024x768 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-hlpvwxmfkmhwzmgdjmtu-auth-token:1 (2.118.0) 2026-11-11T15:40:30.114Z Multiple GoTrueClient instances detect | guard-artifacts/landing__1024x768__e-console-warning__61.png |
| 122 | landing | 1024x768 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/landing__1024x768__e-http-error__62.png |
| 123 | signin | 1024x768 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1024x768__b-narrow-text-column__63.png |
| 124 | signin | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/signin__1024x768__d-missing-aria-label__64.png |
| 125 | signin | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 126 | signin | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 127 | signin | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 128 | signin | 1024x768 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 129 | signin | 1024x768 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/signin__1024x768__g-contrast-ratio__65.png |
| 130 | signin | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 131 | signin | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 132 | signin | 1024x768 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/signin__1024x768__e-console-error__66.png |
| 133 | signin | 1024x768 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-hlpvwxmfkmhwzmgdjmtu-auth-token:1 (2.118.0) 2026-11-11T15:40:31.983Z Multiple GoTrueClient instances detect | guard-artifacts/signin__1024x768__e-console-warning__67.png |
| 134 | signin | 1024x768 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/signin__1024x768__e-http-error__68.png |
| 135 | register | 1024x768 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1024x768__b-narrow-text-column__69.png |
| 136 | register | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/register__1024x768__d-missing-aria-label__70.png |
| 137 | register | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 138 | register | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 139 | register | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Минимум 8 символов") | — |
| 140 | register | 1024x768 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Далее") | — |
| 141 | register | 1024x768 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/register__1024x768__g-contrast-ratio__71.png |
| 142 | register | 1024x768 | `g-contrast-ratio` | `.text-xs` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 143 | register | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(3) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 144 | register | 1024x768 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/register__1024x768__e-console-error__72.png |
| 145 | register | 1024x768 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-hlpvwxmfkmhwzmgdjmtu-auth-token:1 (2.118.0) 2026-11-11T15:40:34.088Z Multiple GoTrueClient instances detect | guard-artifacts/register__1024x768__e-console-warning__73.png |
| 146 | register | 1024x768 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/register__1024x768__e-http-error__74.png |
| 147 | privacy | 1024x768 | `c-duplicate-accessible-name` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Дубль кнопки/ссылки с одинаковым именем "на главную" (2 шт.) | guard-artifacts/privacy__1024x768__c-duplicate-accessible-name__75.png |
| 148 | privacy | 1024x768 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/privacy__1024x768__d-missing-aria-label__76.png |
| 149 | privacy | 1024x768 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "support@ogonek.app") | — |
| 150 | privacy | 1024x768 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |


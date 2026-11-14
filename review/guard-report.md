# Guard Report — 2026-11-14T14:08:35.327Z

- **Статус**: FAIL (exit 1)
- **Режим**: guard | **Шаг**: `01` | **Окружение**: https://jryhluhgjricjbkimsfa.supabase.co
- **Проверка .lock**: OK
- **Staging ключи**: OK
- **Baseline**: Найден
- **Экранов проверено**: 150 | **Найдено проблем**: 3074

## Сводка по категориям проверок
| Код проверки | Кол-во |
|---|---|
| `d-missing-aria-label` | 1524 |
| `g-contrast-ratio` | 921 |
| `b-narrow-text-column` | 202 |
| `h-forbidden-term-soratniki` | 80 |
| `e-console-error` | 60 |
| `e-http-error` | 60 |
| `d-dead-button-click-probe` | 47 |
| `b-clipped-text` | 46 |
| `d-small-tap-target` | 45 |
| `d-missing-accessible-name` | 35 |
| `e-console-warning` | 15 |
| `c-duplicate-accessible-name` | 14 |
| `a-horizontal-overflow-container` | 14 |
| `f-pixel-diff-exceeded` | 8 |
| `c-duplicate-icon-onclick` | 3 |

## Найденные дефекты
| # | Экран | Размер | Проверка | Селектор | Описание | Скриншот |
|---|---|---|---|---|---|---|
| 1 | landing | 1210x756 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/landing__1210x756__b-narrow-text-column__1.png |
| 2 | landing | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/landing__1210x756__d-missing-aria-label__2.png |
| 3 | landing | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 4 | landing | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 5 | landing | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 6 | landing | 1210x756 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 7 | landing | 1210x756 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/landing__1210x756__g-contrast-ratio__3.png |
| 8 | landing | 1210x756 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 9 | landing | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/landing__1210x756__e-console-error__4.png |
| 10 | landing | 1210x756 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-jryhluhgjricjbkimsfa-auth-token:1 (2.118.0) 2026-11-14T14:00:04.214Z Multiple GoTrueClient instances detect | guard-artifacts/landing__1210x756__e-console-warning__5.png |
| 11 | landing | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/landing__1210x756__e-http-error__6.png |
| 12 | signin | 1210x756 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1210x756__b-narrow-text-column__7.png |
| 13 | signin | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/signin__1210x756__d-missing-aria-label__8.png |
| 14 | signin | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 15 | signin | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 16 | signin | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 17 | signin | 1210x756 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 18 | signin | 1210x756 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/signin__1210x756__g-contrast-ratio__9.png |
| 19 | signin | 1210x756 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 20 | signin | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/signin__1210x756__e-console-error__10.png |
| 21 | signin | 1210x756 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-jryhluhgjricjbkimsfa-auth-token:1 (2.118.0) 2026-11-14T14:00:06.649Z Multiple GoTrueClient instances detect | guard-artifacts/signin__1210x756__e-console-warning__11.png |
| 22 | signin | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/signin__1210x756__e-http-error__12.png |
| 23 | register | 1210x756 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1210x756__b-narrow-text-column__13.png |
| 24 | register | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/register__1210x756__d-missing-aria-label__14.png |
| 25 | register | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 26 | register | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 27 | register | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Минимум 8 символов") | — |
| 28 | register | 1210x756 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Далее") | — |
| 29 | register | 1210x756 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/register__1210x756__g-contrast-ratio__15.png |
| 30 | register | 1210x756 | `g-contrast-ratio` | `.text-xs` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 31 | register | 1210x756 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(3) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 32 | register | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/register__1210x756__e-console-error__16.png |
| 33 | register | 1210x756 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-jryhluhgjricjbkimsfa-auth-token:1 (2.118.0) 2026-11-14T14:00:12.987Z Multiple GoTrueClient instances detect | guard-artifacts/register__1210x756__e-console-warning__17.png |
| 34 | register | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/register__1210x756__e-http-error__18.png |
| 35 | privacy | 1210x756 | `c-duplicate-accessible-name` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Дубль кнопки/ссылки с одинаковым именем "на главную" (2 шт.) | guard-artifacts/privacy__1210x756__c-duplicate-accessible-name__19.png |
| 36 | privacy | 1210x756 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/privacy__1210x756__d-missing-aria-label__20.png |
| 37 | privacy | 1210x756 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "support@ogonek.app") | — |
| 38 | privacy | 1210x756 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 39 | privacy | 1210x756 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "Условия использования") | — |
| 40 | privacy | 1210x756 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "На главную") | — |
| 41 | privacy | 1210x756 | `g-contrast-ratio` | `.space-y-3:nth-child(5) > .text-zinc-500.text-xs` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/privacy__1210x756__g-contrast-ratio__21.png |
| 42 | privacy | 1210x756 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 43 | privacy | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/privacy__1210x756__e-console-error__22.png |
| 44 | privacy | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/privacy__1210x756__e-http-error__23.png |
| 45 | terms | 1210x756 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/terms__1210x756__d-missing-aria-label__24.png |
| 46 | terms | 1210x756 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(6)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 47 | terms | 1210x756 | `d-missing-aria-label` | `body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-a` | Элемент без aria-label (текст/подпись "Политика конфиденциальности") | — |
| 48 | terms | 1210x756 | `h-forbidden-term-soratniki` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > section.space` | Запрещённый термин «Соратники» (CONTRACT п. 7): "При взаимодействии с соратниками в чатах, публикации записей в общую л" | guard-artifacts/terms__1210x756__h-forbidden-term-soratniki__25.png |
| 49 | terms | 1210x756 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/terms__1210x756__g-contrast-ratio__26.png |
| 50 | terms | 1210x756 | `g-contrast-ratio` | `.hover\:text-zinc-300` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 51 | terms | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/terms__1210x756__e-console-error__27.png |
| 52 | terms | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/terms__1210x756__e-http-error__28.png |
| 53 | landing | 1440x900 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/landing__1440x900__b-narrow-text-column__29.png |
| 54 | landing | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/landing__1440x900__d-missing-aria-label__30.png |
| 55 | landing | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 56 | landing | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 57 | landing | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 58 | landing | 1440x900 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 59 | landing | 1440x900 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/landing__1440x900__g-contrast-ratio__31.png |
| 60 | landing | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 61 | landing | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 62 | landing | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/landing__1440x900__e-console-error__32.png |
| 63 | landing | 1440x900 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-jryhluhgjricjbkimsfa-auth-token:1 (2.118.0) 2026-11-14T14:00:23.856Z Multiple GoTrueClient instances detect | guard-artifacts/landing__1440x900__e-console-warning__33.png |
| 64 | landing | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/landing__1440x900__e-http-error__34.png |
| 65 | signin | 1440x900 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1440x900__b-narrow-text-column__35.png |
| 66 | signin | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/signin__1440x900__d-missing-aria-label__36.png |
| 67 | signin | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 68 | signin | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 69 | signin | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 70 | signin | 1440x900 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 71 | signin | 1440x900 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/signin__1440x900__g-contrast-ratio__37.png |
| 72 | signin | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 73 | signin | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 74 | signin | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/signin__1440x900__e-console-error__38.png |
| 75 | signin | 1440x900 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-jryhluhgjricjbkimsfa-auth-token:1 (2.118.0) 2026-11-14T14:00:26.103Z Multiple GoTrueClient instances detect | guard-artifacts/signin__1440x900__e-console-warning__39.png |
| 76 | signin | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/signin__1440x900__e-http-error__40.png |
| 77 | register | 1440x900 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1440x900__b-narrow-text-column__41.png |
| 78 | register | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/register__1440x900__d-missing-aria-label__42.png |
| 79 | register | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 80 | register | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 81 | register | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Минимум 8 символов") | — |
| 82 | register | 1440x900 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Далее") | — |
| 83 | register | 1440x900 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/register__1440x900__g-contrast-ratio__43.png |
| 84 | register | 1440x900 | `g-contrast-ratio` | `.text-xs` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 85 | register | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(3) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 86 | register | 1440x900 | `g-contrast-ratio` | `.px-1` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 87 | register | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(4) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 88 | register | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/register__1440x900__e-console-error__44.png |
| 89 | register | 1440x900 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-jryhluhgjricjbkimsfa-auth-token:1 (2.118.0) 2026-11-14T14:00:28.596Z Multiple GoTrueClient instances detect | guard-artifacts/register__1440x900__e-console-warning__45.png |
| 90 | register | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/register__1440x900__e-http-error__46.png |
| 91 | privacy | 1440x900 | `c-duplicate-accessible-name` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Дубль кнопки/ссылки с одинаковым именем "на главную" (2 шт.) | guard-artifacts/privacy__1440x900__c-duplicate-accessible-name__47.png |
| 92 | privacy | 1440x900 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/privacy__1440x900__d-missing-aria-label__48.png |
| 93 | privacy | 1440x900 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "support@ogonek.app") | — |
| 94 | privacy | 1440x900 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 95 | privacy | 1440x900 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "Условия использования") | — |
| 96 | privacy | 1440x900 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "На главную") | — |
| 97 | privacy | 1440x900 | `g-contrast-ratio` | `.space-y-3:nth-child(5) > .text-zinc-500.text-xs` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/privacy__1440x900__g-contrast-ratio__49.png |
| 98 | privacy | 1440x900 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 99 | privacy | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/privacy__1440x900__e-console-error__50.png |
| 100 | privacy | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/privacy__1440x900__e-http-error__51.png |
| 101 | terms | 1440x900 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/terms__1440x900__d-missing-aria-label__52.png |
| 102 | terms | 1440x900 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(6)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 103 | terms | 1440x900 | `d-missing-aria-label` | `body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-a` | Элемент без aria-label (текст/подпись "Политика конфиденциальности") | — |
| 104 | terms | 1440x900 | `h-forbidden-term-soratniki` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > section.space` | Запрещённый термин «Соратники» (CONTRACT п. 7): "При взаимодействии с соратниками в чатах, публикации записей в общую л" | guard-artifacts/terms__1440x900__h-forbidden-term-soratniki__53.png |
| 105 | terms | 1440x900 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/terms__1440x900__g-contrast-ratio__54.png |
| 106 | terms | 1440x900 | `g-contrast-ratio` | `.hover\:text-zinc-300` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 107 | terms | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/terms__1440x900__e-console-error__55.png |
| 108 | terms | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/terms__1440x900__e-http-error__56.png |
| 109 | landing | 1024x768 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/landing__1024x768__b-narrow-text-column__57.png |
| 110 | landing | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/landing__1024x768__d-missing-aria-label__58.png |
| 111 | landing | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 112 | landing | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 113 | landing | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 114 | landing | 1024x768 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 115 | landing | 1024x768 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/landing__1024x768__g-contrast-ratio__59.png |
| 116 | landing | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 117 | landing | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 118 | landing | 1024x768 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/landing__1024x768__e-console-error__60.png |
| 119 | landing | 1024x768 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-jryhluhgjricjbkimsfa-auth-token:1 (2.118.0) 2026-11-14T14:00:39.262Z Multiple GoTrueClient instances detect | guard-artifacts/landing__1024x768__e-console-warning__61.png |
| 120 | landing | 1024x768 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/landing__1024x768__e-http-error__62.png |
| 121 | signin | 1024x768 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1024x768__b-narrow-text-column__63.png |
| 122 | signin | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/signin__1024x768__d-missing-aria-label__64.png |
| 123 | signin | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 124 | signin | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 125 | signin | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 126 | signin | 1024x768 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 127 | signin | 1024x768 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/signin__1024x768__g-contrast-ratio__65.png |
| 128 | signin | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 129 | signin | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 130 | signin | 1024x768 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/signin__1024x768__e-console-error__66.png |
| 131 | signin | 1024x768 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-jryhluhgjricjbkimsfa-auth-token:1 (2.118.0) 2026-11-14T14:00:41.667Z Multiple GoTrueClient instances detect | guard-artifacts/signin__1024x768__e-console-warning__67.png |
| 132 | signin | 1024x768 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/signin__1024x768__e-http-error__68.png |
| 133 | register | 1024x768 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1024x768__b-narrow-text-column__69.png |
| 134 | register | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/register__1024x768__d-missing-aria-label__70.png |
| 135 | register | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 136 | register | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 137 | register | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Минимум 8 символов") | — |
| 138 | register | 1024x768 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Далее") | — |
| 139 | register | 1024x768 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/register__1024x768__g-contrast-ratio__71.png |
| 140 | register | 1024x768 | `g-contrast-ratio` | `.text-xs` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 141 | register | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(3) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 142 | register | 1024x768 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/register__1024x768__e-console-error__72.png |
| 143 | register | 1024x768 | `e-console-warning` | `document` | Console warning: GoTrueClient@sb-jryhluhgjricjbkimsfa-auth-token:1 (2.118.0) 2026-11-14T14:00:44.315Z Multiple GoTrueClient instances detect | guard-artifacts/register__1024x768__e-console-warning__73.png |
| 144 | register | 1024x768 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/register__1024x768__e-http-error__74.png |
| 145 | privacy | 1024x768 | `c-duplicate-accessible-name` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Дубль кнопки/ссылки с одинаковым именем "на главную" (2 шт.) | guard-artifacts/privacy__1024x768__c-duplicate-accessible-name__75.png |
| 146 | privacy | 1024x768 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/privacy__1024x768__d-missing-aria-label__76.png |
| 147 | privacy | 1024x768 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "support@ogonek.app") | — |
| 148 | privacy | 1024x768 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 149 | privacy | 1024x768 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "Условия использования") | — |
| 150 | privacy | 1024x768 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "На главную") | — |


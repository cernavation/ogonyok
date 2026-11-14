# Guard Report — 2026-11-14T19:05:10.531Z

- **Статус**: FAIL (exit 1)
- **Режим**: guard | **Шаг**: `04` | **Окружение**: https://jryhluhgjricjbkimsfa.supabase.co
- **Проверка .lock**: OK
- **Staging ключи**: OK
- **Baseline**: Найден
- **Экранов проверено**: 150 | **Найдено проблем**: 3135

## Сводка по категориям проверок
| Код проверки | Кол-во |
|---|---|
| `d-missing-aria-label` | 1548 |
| `g-contrast-ratio` | 936 |
| `b-narrow-text-column` | 203 |
| `h-forbidden-term-soratniki` | 80 |
| `e-console-error` | 77 |
| `e-http-error` | 52 |
| `d-dead-button-click-probe` | 48 |
| `b-clipped-text` | 46 |
| `d-small-tap-target` | 45 |
| `f-pixel-diff-exceeded` | 35 |
| `d-missing-accessible-name` | 35 |
| `a-horizontal-overflow-container` | 14 |
| `c-duplicate-accessible-name` | 13 |
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
| 10 | landing | 1210x756 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/plain') is not | — |
| 11 | landing | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/landing__1210x756__e-http-error__5.png |
| 12 | signin | 1210x756 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1210x756__b-narrow-text-column__6.png |
| 13 | signin | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/signin__1210x756__d-missing-aria-label__7.png |
| 14 | signin | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 15 | signin | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 16 | signin | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 17 | signin | 1210x756 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 18 | signin | 1210x756 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/signin__1210x756__g-contrast-ratio__8.png |
| 19 | signin | 1210x756 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 20 | signin | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/signin__1210x756__e-console-error__9.png |
| 21 | signin | 1210x756 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 22 | signin | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/signin__1210x756__e-http-error__10.png |
| 23 | register | 1210x756 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1210x756__b-narrow-text-column__11.png |
| 24 | register | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/register__1210x756__d-missing-aria-label__12.png |
| 25 | register | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 26 | register | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 27 | register | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Минимум 8 символов") | — |
| 28 | register | 1210x756 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Далее") | — |
| 29 | register | 1210x756 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/register__1210x756__g-contrast-ratio__13.png |
| 30 | register | 1210x756 | `g-contrast-ratio` | `.text-xs` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 31 | register | 1210x756 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(3) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 32 | register | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/register__1210x756__e-console-error__14.png |
| 33 | register | 1210x756 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 34 | register | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/register__1210x756__e-http-error__15.png |
| 35 | privacy | 1210x756 | `c-duplicate-accessible-name` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Дубль кнопки/ссылки с одинаковым именем "на главную" (2 шт.) | guard-artifacts/privacy__1210x756__c-duplicate-accessible-name__16.png |
| 36 | privacy | 1210x756 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/privacy__1210x756__d-missing-aria-label__17.png |
| 37 | privacy | 1210x756 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "support@ogonek.app") | — |
| 38 | privacy | 1210x756 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 39 | privacy | 1210x756 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "Условия использования") | — |
| 40 | privacy | 1210x756 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "На главную") | — |
| 41 | privacy | 1210x756 | `g-contrast-ratio` | `.space-y-3:nth-child(5) > .text-zinc-500.text-xs` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/privacy__1210x756__g-contrast-ratio__18.png |
| 42 | privacy | 1210x756 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 43 | privacy | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/privacy__1210x756__e-console-error__19.png |
| 44 | privacy | 1210x756 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 45 | privacy | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/privacy__1210x756__e-http-error__20.png |
| 46 | terms | 1210x756 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/terms__1210x756__d-missing-aria-label__21.png |
| 47 | terms | 1210x756 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(6)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 48 | terms | 1210x756 | `d-missing-aria-label` | `body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-a` | Элемент без aria-label (текст/подпись "Политика конфиденциальности") | — |
| 49 | terms | 1210x756 | `h-forbidden-term-soratniki` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > section.space` | Запрещённый термин «Соратники» (CONTRACT п. 7): "При взаимодействии с соратниками в чатах, публикации записей в общую л" | guard-artifacts/terms__1210x756__h-forbidden-term-soratniki__22.png |
| 50 | terms | 1210x756 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/terms__1210x756__g-contrast-ratio__23.png |
| 51 | terms | 1210x756 | `g-contrast-ratio` | `.hover\:text-zinc-300` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 52 | terms | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/terms__1210x756__e-console-error__24.png |
| 53 | terms | 1210x756 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 54 | terms | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/terms__1210x756__e-http-error__25.png |
| 55 | landing | 1440x900 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/landing__1440x900__b-narrow-text-column__26.png |
| 56 | landing | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/landing__1440x900__d-missing-aria-label__27.png |
| 57 | landing | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 58 | landing | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 59 | landing | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 60 | landing | 1440x900 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 61 | landing | 1440x900 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/landing__1440x900__g-contrast-ratio__28.png |
| 62 | landing | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 63 | landing | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 64 | landing | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/landing__1440x900__e-console-error__29.png |
| 65 | landing | 1440x900 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/plain') is not | — |
| 66 | landing | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/landing__1440x900__e-http-error__30.png |
| 67 | signin | 1440x900 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1440x900__b-narrow-text-column__31.png |
| 68 | signin | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/signin__1440x900__d-missing-aria-label__32.png |
| 69 | signin | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 70 | signin | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 71 | signin | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 72 | signin | 1440x900 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 73 | signin | 1440x900 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/signin__1440x900__g-contrast-ratio__33.png |
| 74 | signin | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 75 | signin | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 76 | signin | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/signin__1440x900__e-console-error__34.png |
| 77 | signin | 1440x900 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 78 | signin | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/signin__1440x900__e-http-error__35.png |
| 79 | register | 1440x900 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1440x900__b-narrow-text-column__36.png |
| 80 | register | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/register__1440x900__d-missing-aria-label__37.png |
| 81 | register | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 82 | register | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 83 | register | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Минимум 8 символов") | — |
| 84 | register | 1440x900 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Далее") | — |
| 85 | register | 1440x900 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/register__1440x900__g-contrast-ratio__38.png |
| 86 | register | 1440x900 | `g-contrast-ratio` | `.text-xs` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 87 | register | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(3) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 88 | register | 1440x900 | `g-contrast-ratio` | `.px-1` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 89 | register | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(4) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 90 | register | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/register__1440x900__e-console-error__39.png |
| 91 | register | 1440x900 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 92 | register | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/register__1440x900__e-http-error__40.png |
| 93 | privacy | 1440x900 | `c-duplicate-accessible-name` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Дубль кнопки/ссылки с одинаковым именем "на главную" (2 шт.) | guard-artifacts/privacy__1440x900__c-duplicate-accessible-name__41.png |
| 94 | privacy | 1440x900 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/privacy__1440x900__d-missing-aria-label__42.png |
| 95 | privacy | 1440x900 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "support@ogonek.app") | — |
| 96 | privacy | 1440x900 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 97 | privacy | 1440x900 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "Условия использования") | — |
| 98 | privacy | 1440x900 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "На главную") | — |
| 99 | privacy | 1440x900 | `g-contrast-ratio` | `.space-y-3:nth-child(5) > .text-zinc-500.text-xs` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/privacy__1440x900__g-contrast-ratio__43.png |
| 100 | privacy | 1440x900 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 101 | privacy | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/privacy__1440x900__e-console-error__44.png |
| 102 | privacy | 1440x900 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 103 | privacy | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/privacy__1440x900__e-http-error__45.png |
| 104 | terms | 1440x900 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/terms__1440x900__d-missing-aria-label__46.png |
| 105 | terms | 1440x900 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(6)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 106 | terms | 1440x900 | `d-missing-aria-label` | `body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-a` | Элемент без aria-label (текст/подпись "Политика конфиденциальности") | — |
| 107 | terms | 1440x900 | `h-forbidden-term-soratniki` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > section.space` | Запрещённый термин «Соратники» (CONTRACT п. 7): "При взаимодействии с соратниками в чатах, публикации записей в общую л" | guard-artifacts/terms__1440x900__h-forbidden-term-soratniki__47.png |
| 108 | terms | 1440x900 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/terms__1440x900__g-contrast-ratio__48.png |
| 109 | terms | 1440x900 | `g-contrast-ratio` | `.hover\:text-zinc-300` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 110 | terms | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/terms__1440x900__e-console-error__49.png |
| 111 | terms | 1440x900 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 112 | terms | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/terms__1440x900__e-http-error__50.png |
| 113 | landing | 1024x768 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/landing__1024x768__b-narrow-text-column__51.png |
| 114 | landing | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/landing__1024x768__d-missing-aria-label__52.png |
| 115 | landing | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 116 | landing | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 117 | landing | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 118 | landing | 1024x768 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 119 | landing | 1024x768 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/landing__1024x768__g-contrast-ratio__53.png |
| 120 | landing | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 121 | landing | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 122 | landing | 1024x768 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/landing__1024x768__e-console-error__54.png |
| 123 | landing | 1024x768 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/plain') is not | — |
| 124 | landing | 1024x768 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/landing__1024x768__e-http-error__55.png |
| 125 | signin | 1024x768 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1024x768__b-narrow-text-column__56.png |
| 126 | signin | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/signin__1024x768__d-missing-aria-label__57.png |
| 127 | signin | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 128 | signin | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 129 | signin | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 130 | signin | 1024x768 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 131 | signin | 1024x768 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/signin__1024x768__g-contrast-ratio__58.png |
| 132 | signin | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 133 | signin | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 134 | signin | 1024x768 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/signin__1024x768__e-console-error__59.png |
| 135 | signin | 1024x768 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 136 | signin | 1024x768 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/signin__1024x768__e-http-error__60.png |
| 137 | register | 1024x768 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1024x768__b-narrow-text-column__61.png |
| 138 | register | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/register__1024x768__d-missing-aria-label__62.png |
| 139 | register | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 140 | register | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 141 | register | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Минимум 8 символов") | — |
| 142 | register | 1024x768 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Далее") | — |
| 143 | register | 1024x768 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/register__1024x768__g-contrast-ratio__63.png |
| 144 | register | 1024x768 | `g-contrast-ratio` | `.text-xs` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 145 | register | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(3) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 146 | register | 1024x768 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/register__1024x768__e-console-error__64.png |
| 147 | register | 1024x768 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 148 | register | 1024x768 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/register__1024x768__e-http-error__65.png |
| 149 | privacy | 1024x768 | `c-duplicate-accessible-name` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Дубль кнопки/ссылки с одинаковым именем "на главную" (2 шт.) | guard-artifacts/privacy__1024x768__c-duplicate-accessible-name__66.png |
| 150 | privacy | 1024x768 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/privacy__1024x768__d-missing-aria-label__67.png |


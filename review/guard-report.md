# Guard Report — 2026-11-14T21:06:44.849Z

- **Статус**: FAIL (exit 1)
- **Режим**: guard | **Шаг**: `06` | **Окружение**: https://jryhluhgjricjbkimsfa.supabase.co
- **Проверка .lock**: OK
- **Staging ключи**: OK
- **Baseline**: Найден
- **Экранов проверено**: 150 | **Найдено проблем**: 3490

## Сводка по категориям проверок
| Код проверки | Кол-во |
|---|---|
| `d-missing-aria-label` | 1858 |
| `g-contrast-ratio` | 817 |
| `b-narrow-text-column` | 201 |
| `f-pixel-diff-exceeded` | 150 |
| `d-dead-button-click-probe` | 146 |
| `e-console-error` | 73 |
| `b-clipped-text` | 49 |
| `e-http-error` | 48 |
| `d-small-tap-target` | 45 |
| `d-missing-accessible-name` | 35 |
| `c-duplicate-accessible-name` | 31 |
| `h-forbidden-term-soratniki` | 18 |
| `a-horizontal-overflow-container` | 14 |
| `d-dead-button` | 5 |

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
| 12 | landing | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.60% (> 0.30%) вне allowed_regions.json (23757/914760 px) | diffs/1210x756/landing.png |
| 13 | signin | 1210x756 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1210x756__b-narrow-text-column__6.png |
| 14 | signin | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/signin__1210x756__d-missing-aria-label__7.png |
| 15 | signin | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 16 | signin | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 17 | signin | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 18 | signin | 1210x756 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 19 | signin | 1210x756 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/signin__1210x756__g-contrast-ratio__8.png |
| 20 | signin | 1210x756 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 21 | signin | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/signin__1210x756__e-console-error__9.png |
| 22 | signin | 1210x756 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 23 | signin | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/signin__1210x756__e-http-error__10.png |
| 24 | signin | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.60% (> 0.30%) вне allowed_regions.json (23757/914760 px) | diffs/1210x756/signin.png |
| 25 | register | 1210x756 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1210x756__b-narrow-text-column__11.png |
| 26 | register | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/register__1210x756__d-missing-aria-label__12.png |
| 27 | register | 1210x756 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 28 | register | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 29 | register | 1210x756 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Минимум 8 символов") | — |
| 30 | register | 1210x756 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Далее") | — |
| 31 | register | 1210x756 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/register__1210x756__g-contrast-ratio__13.png |
| 32 | register | 1210x756 | `g-contrast-ratio` | `.text-xs` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 33 | register | 1210x756 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(3) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 34 | register | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/register__1210x756__e-console-error__14.png |
| 35 | register | 1210x756 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 36 | register | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/register__1210x756__e-http-error__15.png |
| 37 | register | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.61% (> 0.30%) вне allowed_regions.json (23889/914760 px) | diffs/1210x756/register.png |
| 38 | privacy | 1210x756 | `c-duplicate-accessible-name` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Дубль кнопки/ссылки с одинаковым именем "на главную" (2 шт.) | guard-artifacts/privacy__1210x756__c-duplicate-accessible-name__16.png |
| 39 | privacy | 1210x756 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/privacy__1210x756__d-missing-aria-label__17.png |
| 40 | privacy | 1210x756 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "support@ogonek.app") | — |
| 41 | privacy | 1210x756 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 42 | privacy | 1210x756 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "Условия использования") | — |
| 43 | privacy | 1210x756 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "На главную") | — |
| 44 | privacy | 1210x756 | `g-contrast-ratio` | `.space-y-3:nth-child(5) > .text-zinc-500.text-xs` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/privacy__1210x756__g-contrast-ratio__18.png |
| 45 | privacy | 1210x756 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 46 | privacy | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/privacy__1210x756__e-console-error__19.png |
| 47 | privacy | 1210x756 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 48 | privacy | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/privacy__1210x756__e-http-error__20.png |
| 49 | privacy | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 3.50% (> 0.30%) вне allowed_regions.json (32003/914760 px) | diffs/1210x756/privacy.png |
| 50 | terms | 1210x756 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/terms__1210x756__d-missing-aria-label__21.png |
| 51 | terms | 1210x756 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(6)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 52 | terms | 1210x756 | `d-missing-aria-label` | `body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-a` | Элемент без aria-label (текст/подпись "Политика конфиденциальности") | — |
| 53 | terms | 1210x756 | `h-forbidden-term-soratniki` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > section.space` | Запрещённый термин «Соратники» (CONTRACT п. 7): "При взаимодействии с соратниками в чатах, публикации записей в общую л" | guard-artifacts/terms__1210x756__h-forbidden-term-soratniki__22.png |
| 54 | terms | 1210x756 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/terms__1210x756__g-contrast-ratio__23.png |
| 55 | terms | 1210x756 | `g-contrast-ratio` | `.hover\:text-zinc-300` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 56 | terms | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/terms__1210x756__e-console-error__24.png |
| 57 | terms | 1210x756 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 58 | terms | 1210x756 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/terms__1210x756__e-http-error__25.png |
| 59 | terms | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 3.66% (> 0.30%) вне allowed_regions.json (33465/914760 px) | diffs/1210x756/terms.png |
| 60 | landing | 1440x900 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/landing__1440x900__b-narrow-text-column__26.png |
| 61 | landing | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/landing__1440x900__d-missing-aria-label__27.png |
| 62 | landing | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 63 | landing | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 64 | landing | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 65 | landing | 1440x900 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 66 | landing | 1440x900 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/landing__1440x900__g-contrast-ratio__28.png |
| 67 | landing | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 68 | landing | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 69 | landing | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/landing__1440x900__e-console-error__29.png |
| 70 | landing | 1440x900 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/plain') is not | — |
| 71 | landing | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/landing__1440x900__e-http-error__30.png |
| 72 | landing | 1440x900 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.06% (> 0.30%) вне allowed_regions.json (26679/1296000 px) | diffs/1440x900/landing.png |
| 73 | signin | 1440x900 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1440x900__b-narrow-text-column__31.png |
| 74 | signin | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/signin__1440x900__d-missing-aria-label__32.png |
| 75 | signin | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 76 | signin | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 77 | signin | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 78 | signin | 1440x900 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 79 | signin | 1440x900 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/signin__1440x900__g-contrast-ratio__33.png |
| 80 | signin | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 81 | signin | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 82 | signin | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/signin__1440x900__e-console-error__34.png |
| 83 | signin | 1440x900 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 84 | signin | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/signin__1440x900__e-http-error__35.png |
| 85 | signin | 1440x900 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.06% (> 0.30%) вне allowed_regions.json (26679/1296000 px) | diffs/1440x900/signin.png |
| 86 | register | 1440x900 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1440x900__b-narrow-text-column__36.png |
| 87 | register | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/register__1440x900__d-missing-aria-label__37.png |
| 88 | register | 1440x900 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 89 | register | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 90 | register | 1440x900 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Минимум 8 символов") | — |
| 91 | register | 1440x900 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Далее") | — |
| 92 | register | 1440x900 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/register__1440x900__g-contrast-ratio__38.png |
| 93 | register | 1440x900 | `g-contrast-ratio` | `.text-xs` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 94 | register | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(3) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 95 | register | 1440x900 | `g-contrast-ratio` | `.px-1` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 96 | register | 1440x900 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(4) > label > .gap-1\.5` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 97 | register | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/register__1440x900__e-console-error__39.png |
| 98 | register | 1440x900 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 99 | register | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/register__1440x900__e-http-error__40.png |
| 100 | register | 1440x900 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.11% (> 0.30%) вне allowed_regions.json (27350/1296000 px) | diffs/1440x900/register.png |
| 101 | privacy | 1440x900 | `c-duplicate-accessible-name` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Дубль кнопки/ссылки с одинаковым именем "на главную" (2 шт.) | guard-artifacts/privacy__1440x900__c-duplicate-accessible-name__41.png |
| 102 | privacy | 1440x900 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/privacy__1440x900__d-missing-aria-label__42.png |
| 103 | privacy | 1440x900 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "support@ogonek.app") | — |
| 104 | privacy | 1440x900 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(5)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 105 | privacy | 1440x900 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "Условия использования") | — |
| 106 | privacy | 1440x900 | `d-missing-aria-label` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > footer.pt-8.b` | Элемент без aria-label (текст/подпись "На главную") | — |
| 107 | privacy | 1440x900 | `g-contrast-ratio` | `.space-y-3:nth-child(5) > .text-zinc-500.text-xs` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/privacy__1440x900__g-contrast-ratio__43.png |
| 108 | privacy | 1440x900 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 109 | privacy | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/privacy__1440x900__e-console-error__44.png |
| 110 | privacy | 1440x900 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 111 | privacy | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/privacy__1440x900__e-http-error__45.png |
| 112 | privacy | 1440x900 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 3.22% (> 0.30%) вне allowed_regions.json (41679/1296000 px) | diffs/1440x900/privacy.png |
| 113 | terms | 1440x900 | `d-missing-aria-label` | `html > body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2` | Элемент без aria-label (текст/подпись "На главную") | guard-artifacts/terms__1440x900__d-missing-aria-label__46.png |
| 114 | terms | 1440x900 | `d-missing-aria-label` | `div.max-w-2xl.mx-auto > section.space-y-6.text-sm > div.space-y-3:nth-of-type(6)` | Элемент без aria-label (текст/подпись "@ogonek_support") | — |
| 115 | terms | 1440x900 | `d-missing-aria-label` | `body.antialiased > div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-a` | Элемент без aria-label (текст/подпись "Политика конфиденциальности") | — |
| 116 | terms | 1440x900 | `h-forbidden-term-soratniki` | `div.min-h-screen.bg-black:nth-of-type(2) > div.max-w-2xl.mx-auto > section.space` | Запрещённый термин «Соратники» (CONTRACT п. 7): "При взаимодействии с соратниками в чатах, публикации записей в общую л" | guard-artifacts/terms__1440x900__h-forbidden-term-soratniki__47.png |
| 117 | terms | 1440x900 | `g-contrast-ratio` | `footer > span` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | guard-artifacts/terms__1440x900__g-contrast-ratio__48.png |
| 118 | terms | 1440x900 | `g-contrast-ratio` | `.hover\:text-zinc-300` | Низкий контраст текста 4.35:1 (min 4.5:1, fg=#71717b, bg=#000000) | — |
| 119 | terms | 1440x900 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/terms__1440x900__e-console-error__49.png |
| 120 | terms | 1440x900 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 121 | terms | 1440x900 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/terms__1440x900__e-http-error__50.png |
| 122 | terms | 1440x900 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 3.13% (> 0.30%) вне allowed_regions.json (40501/1296000 px) | diffs/1440x900/terms.png |
| 123 | landing | 1024x768 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/landing__1024x768__b-narrow-text-column__51.png |
| 124 | landing | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/landing__1024x768__d-missing-aria-label__52.png |
| 125 | landing | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 126 | landing | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 127 | landing | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 128 | landing | 1024x768 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 129 | landing | 1024x768 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/landing__1024x768__g-contrast-ratio__53.png |
| 130 | landing | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 131 | landing | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 132 | landing | 1024x768 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/landing__1024x768__e-console-error__54.png |
| 133 | landing | 1024x768 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/plain') is not | — |
| 134 | landing | 1024x768 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/landing__1024x768__e-http-error__55.png |
| 135 | landing | 1024x768 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.93% (> 0.30%) вне allowed_regions.json (23059/786432 px) | diffs/1024x768/landing.png |
| 136 | signin | 1024x768 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1024x768__b-narrow-text-column__56.png |
| 137 | signin | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/signin__1024x768__d-missing-aria-label__57.png |
| 138 | signin | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Регистрация") | — |
| 139 | signin | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "alex_cerna") | — |
| 140 | signin | 1024x768 | `d-missing-aria-label` | `div.auth-form.auth-form--screen > form.flex.flex-col > div.flex.flex-col:nth-of-` | Элемент без aria-label (текст/подпись "Твой пароль") | — |
| 141 | signin | 1024x768 | `d-missing-aria-label` | `section.auth-panel:nth-of-type(2) > div.auth-panel__inner > div.auth-form.auth-f` | Элемент без aria-label (текст/подпись "Войти") | — |
| 142 | signin | 1024x768 | `g-contrast-ratio` | `.border-transparent` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/signin__1024x768__g-contrast-ratio__58.png |
| 143 | signin | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(1) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 144 | signin | 1024x768 | `g-contrast-ratio` | `.flex-col.gap-1\.5.flex:nth-child(2) > label` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 145 | signin | 1024x768 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 404 (Not Found) | guard-artifacts/signin__1024x768__e-console-error__59.png |
| 146 | signin | 1024x768 | `e-console-error` | `document` | Console error: Refused to execute script from 'http://127.0.0.1:3199/_vercel/insights/script.js' because its MIME type ('text/html') is not  | — |
| 147 | signin | 1024x768 | `e-http-error` | `network` | HTTP 404 (GET http://127.0.0.1:3199/_vercel/insights/script.js) | guard-artifacts/signin__1024x768__e-http-error__60.png |
| 148 | signin | 1024x768 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.93% (> 0.30%) вне allowed_regions.json (23059/786432 px) | diffs/1024x768/signin.png |
| 149 | register | 1024x768 | `b-narrow-text-column` | `div[aria-label="Вход в Огонёк"] > div.auth-screen__grid:nth-of-type(2) > section` | Текстовая колонка уже 28 символов (~26 симв., 217px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1024x768__b-narrow-text-column__61.png |
| 150 | register | 1024x768 | `d-missing-aria-label` | `div[aria-label="Вход или регистрация"] > button.flex-1.py-3:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Вход") | guard-artifacts/register__1024x768__d-missing-aria-label__62.png |


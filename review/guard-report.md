# Guard Report — 2026-11-15T07:55:45.289Z

- **Статус**: FAIL (exit 1)
- **Режим**: guard | **Шаг**: `14` | **Окружение**: https://jryhluhgjricjbkimsfa.supabase.co
- **Проверка .lock**: OK
- **Staging ключи**: OK
- **Baseline**: Найден
- **Экранов проверено**: 150 | **Найдено проблем**: 3316

## Сводка по категориям проверок
| Код проверки | Кол-во |
|---|---|
| `d-missing-aria-label` | 1816 |
| `g-contrast-ratio` | 708 |
| `b-narrow-text-column` | 263 |
| `d-dead-button-click-probe` | 158 |
| `f-pixel-diff-exceeded` | 145 |
| `b-clipped-text` | 46 |
| `d-small-tap-target` | 38 |
| `d-missing-accessible-name` | 35 |
| `c-duplicate-accessible-name` | 31 |
| `e-console-error` | 23 |
| `e-http-error` | 23 |
| `a-horizontal-overflow-container` | 17 |
| `c-duplicate-icon-onclick` | 8 |
| `d-dead-button` | 5 |

## Найденные дефекты
| # | Экран | Размер | Проверка | Селектор | Описание | Скриншот |
|---|---|---|---|---|---|---|
| 1 | signin | 1210x756 | `b-narrow-text-column` | `section[aria-label="О проекте Огонёк"] > p.auth-hero__foot.whitespace-nowrap:nth` | Текстовая колонка уже 28 символов (~26 симв., 219px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1210x756__b-narrow-text-column__1.png |
| 2 | signin | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.68% (> 0.30%) вне allowed_regions.json (24482/914760 px) | diffs/1210x756/signin.png |
| 3 | register | 1210x756 | `b-narrow-text-column` | `section[aria-label="О проекте Огонёк"] > p.auth-hero__foot.whitespace-nowrap:nth` | Текстовая колонка уже 28 символов (~26 симв., 219px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1210x756__b-narrow-text-column__2.png |
| 4 | register | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.78% (> 0.30%) вне allowed_regions.json (25389/914760 px) | diffs/1210x756/register.png |
| 5 | privacy | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 5.24% (> 0.30%) вне allowed_regions.json (47918/914760 px) | diffs/1210x756/privacy.png |
| 6 | terms | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 5.25% (> 0.30%) вне allowed_regions.json (48062/914760 px) | diffs/1210x756/terms.png |
| 7 | signin | 1440x900 | `b-narrow-text-column` | `section[aria-label="О проекте Огонёк"] > p.auth-hero__foot.whitespace-nowrap:nth` | Текстовая колонка уже 28 символов (~26 симв., 219px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1440x900__b-narrow-text-column__3.png |
| 8 | signin | 1440x900 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.12% (> 0.30%) вне allowed_regions.json (27520/1296000 px) | diffs/1440x900/signin.png |
| 9 | register | 1440x900 | `b-narrow-text-column` | `section[aria-label="О проекте Огонёк"] > p.auth-hero__foot.whitespace-nowrap:nth` | Текстовая колонка уже 28 символов (~26 симв., 219px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1440x900__b-narrow-text-column__4.png |
| 10 | register | 1440x900 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.25% (> 0.30%) вне allowed_regions.json (29220/1296000 px) | diffs/1440x900/register.png |
| 11 | privacy | 1440x900 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 4.54% (> 0.30%) вне allowed_regions.json (58858/1296000 px) | diffs/1440x900/privacy.png |
| 12 | terms | 1440x900 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 4.37% (> 0.30%) вне allowed_regions.json (56671/1296000 px) | diffs/1440x900/terms.png |
| 13 | signin | 1024x768 | `b-narrow-text-column` | `section[aria-label="О проекте Огонёк"] > p.auth-hero__foot.whitespace-nowrap:nth` | Текстовая колонка уже 28 символов (~26 симв., 219px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__1024x768__b-narrow-text-column__5.png |
| 14 | signin | 1024x768 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 3.03% (> 0.30%) вне allowed_regions.json (23862/786432 px) | diffs/1024x768/signin.png |
| 15 | register | 1024x768 | `b-narrow-text-column` | `section[aria-label="О проекте Огонёк"] > p.auth-hero__foot.whitespace-nowrap:nth` | Текстовая колонка уже 28 символов (~26 симв., 219px): "Local-first: 0 локальных профиля" | guard-artifacts/register__1024x768__b-narrow-text-column__6.png |
| 16 | register | 1024x768 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 3.16% (> 0.30%) вне allowed_regions.json (24866/786432 px) | diffs/1024x768/register.png |
| 17 | privacy | 1024x768 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 6.10% (> 0.30%) вне allowed_regions.json (47967/786432 px) | diffs/1024x768/privacy.png |
| 18 | terms | 1024x768 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 6.11% (> 0.30%) вне allowed_regions.json (48061/786432 px) | diffs/1024x768/terms.png |
| 19 | signin | 820x1180 | `b-narrow-text-column` | `section[aria-label="О проекте Огонёк"] > p.auth-hero__foot.whitespace-nowrap:nth` | Текстовая колонка уже 28 символов (~26 симв., 219px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__820x1180__b-narrow-text-column__7.png |
| 20 | signin | 820x1180 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 3.60% (> 0.30%) вне allowed_regions.json (34796/967600 px) | diffs/820x1180/signin.png |
| 21 | register | 820x1180 | `b-narrow-text-column` | `section[aria-label="О проекте Огонёк"] > p.auth-hero__foot.whitespace-nowrap:nth` | Текстовая колонка уже 28 символов (~26 симв., 219px): "Local-first: 0 локальных профиля" | guard-artifacts/register__820x1180__b-narrow-text-column__8.png |
| 22 | register | 820x1180 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 13.32% (> 0.30%) вне allowed_regions.json (128917/967600 px) | diffs/820x1180/register.png |
| 23 | privacy | 820x1180 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 7.17% (> 0.30%) вне allowed_regions.json (69348/967600 px) | diffs/820x1180/privacy.png |
| 24 | terms | 820x1180 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 8.00% (> 0.30%) вне allowed_regions.json (77387/967600 px) | diffs/820x1180/terms.png |
| 25 | signin | 390x844 | `a-horizontal-overflow-container` | `div[aria-label="Вход в Огонёк"]` | Горизонтальный скролл в контейнере: scrollWidth=399px > clientWidth=390px | guard-artifacts/signin__390x844__a-horizontal-overflow-container__9.png |
| 26 | signin | 390x844 | `b-narrow-text-column` | `section[aria-label="О проекте Огонёк"] > p.auth-hero__foot.whitespace-nowrap:nth` | Текстовая колонка уже 28 символов (~26 симв., 219px): "Local-first: 0 локальных профиля" | guard-artifacts/signin__390x844__b-narrow-text-column__10.png |
| 27 | signin | 390x844 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.09% (> 0.30%) вне allowed_regions.json (6891/329160 px) | diffs/390x844/signin.png |
| 28 | register | 390x844 | `a-horizontal-overflow-container` | `div[aria-label="Вход в Огонёк"]` | Горизонтальный скролл в контейнере: scrollWidth=399px > clientWidth=390px | guard-artifacts/register__390x844__a-horizontal-overflow-container__11.png |
| 29 | register | 390x844 | `b-narrow-text-column` | `section[aria-label="О проекте Огонёк"] > p.auth-hero__foot.whitespace-nowrap:nth` | Текстовая колонка уже 28 символов (~26 симв., 219px): "Local-first: 0 локальных профиля" | guard-artifacts/register__390x844__b-narrow-text-column__12.png |
| 30 | register | 390x844 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 9.27% (> 0.30%) вне allowed_regions.json (30528/329160 px) | diffs/390x844/register.png |
| 31 | privacy | 390x844 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 10.73% (> 0.30%) вне allowed_regions.json (35314/329160 px) | diffs/390x844/privacy.png |
| 32 | terms | 390x844 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 10.15% (> 0.30%) вне allowed_regions.json (33412/329160 px) | diffs/390x844/terms.png |
| 33 | home | 1210x756 | `b-clipped-text` | `button[aria-label="Создать мою историю"] > span.story-ring__name:nth-of-type(3)` | Обрезан текст (79px > 74px): "Моя история" | guard-artifacts/home__1210x756__b-clipped-text__1.png |
| 34 | home | 1210x756 | `b-clipped-text` | `button[aria-label="Смотреть все истории по порядку"] > span.story-ring__name:nth` | Обрезан текст (77px > 74px): "Все истории" | — |
| 35 | home | 1210x756 | `b-narrow-text-column` | `aside[aria-label="Дополнительная информация"] > section.rounded-2xl.border:nth-o` | Текстовая колонка уже 28 символов (~24 симв., 200px): "Огонёк не сгорает при пропуске" | guard-artifacts/home__1210x756__b-narrow-text-column__2.png |
| 36 | home | 1210x756 | `b-narrow-text-column` | `section.af-widget:nth-of-type(2) > div.p-4.rounded-xl > div.flex.flex-col:nth-of` | Текстовая колонка уже 28 символов (~25 симв., 221px): "Скопировать ссылку-приглашение" | — |
| 37 | home | 1210x756 | `c-duplicate-accessible-name` | `#base-ui-_r_n_ \| div[aria-label="Фильтры ленты"] > button:nth-of-type(2)` | Дубль кнопки/ссылки с одинаковым именем "друзья" (2 шт.) | guard-artifacts/home__1210x756__c-duplicate-accessible-name__3.png |
| 38 | home | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.flex.flex-col:nth-of-type(1) > div.bran` | Элемент без aria-label (текст/подпись "Огонёк") | guard-artifacts/home__1210x756__d-missing-aria-label__4.png |
| 39 | home | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.cursor-pointer.relative:nth-of-type(2) ` | Элемент без aria-label (текст/подпись "СО") | — |
| 40 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Фильтры ленты"] > button.selected:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Мои гордости") | — |
| 41 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Фильтры ленты"] > button:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Друзья") | — |
| 42 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Фильтры ленты"] > button:nth-of-type(3)` | Элемент без aria-label (текст/подпись "Подписки") | — |
| 43 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Создать запись дня"] > div.flex-1.min-w-0:nth-of-type(2) > div.f` | Элемент без aria-label (текст/подпись "Записать") | — |
| 44 | home | 1210x756 | `d-missing-aria-label` | `section[aria-label="Утренний фокус"] > button.w-full.flex` | Элемент без aria-label (текст/подпись "Утренний фокус") | — |
| 45 | home | 1210x756 | `d-missing-aria-label` | `div.view-home.w-full > div.feed-content:nth-of-type(2) > div.empty-state.py-12 >` | Элемент без aria-label (текст/подпись "Записать первый день") | — |
| 46 | home | 1210x756 | `d-missing-aria-label` | `div.view-home.w-full > div.feed-content:nth-of-type(2) > div.empty-state.py-12 >` | Элемент без aria-label (текст/подпись "Импортировать архив") | — |
| 47 | home | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Дополнительная информация"] > section.rounded-2xl.border:nth-o` | Элемент без aria-label (текст/подпись "Статистика") | — |
| 48 | home | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Дополнительная информация"] > section.af-widget:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Скопировать ссылку-приглашение") | — |
| 49 | home | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Дополнительная информация"] > section.af-widget:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Найти друзей по нику") | — |
| 50 | home | 1210x756 | `g-contrast-ratio` | `.text-\[15px\]` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/home__1210x756__g-contrast-ratio__5.png |
| 51 | home | 1210x756 | `g-contrast-ratio` | `.hover\:text-\[var\(--accent\)\] > span` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 52 | home | 1210x756 | `g-contrast-ratio` | `.items-baseline > .text-\[13px\].font-normal.text-\[var\(--muted\)\]` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 53 | home | 1210x756 | `g-contrast-ratio` | `.mt-1.text-\[13px\]` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 54 | home | 1210x756 | `g-contrast-ratio` | `.leading-snug` | Низкий контраст текста 3.52:1 (min 4.5:1, fg=#71767b, bg=#1e2124) | — |
| 55 | home | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 422 () | guard-artifacts/home__1210x756__e-console-error__6.png |
| 56 | home | 1210x756 | `e-http-error` | `network` | HTTP 422 (POST https://jryhluhgjricjbkimsfa.supabase.co/auth/v1/signup) | guard-artifacts/home__1210x756__e-http-error__7.png |
| 57 | home | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 4.07% (> 0.30%) вне allowed_regions.json (37245/914760 px) | diffs/1210x756/home.png |
| 58 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Огонёк"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Огонёк" | guard-artifacts/home__1210x756__d-dead-button-click-probe__8.png |
| 59 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Друзья"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Друзья" | — |
| 60 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Подписки"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Подписки" | — |
| 61 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Смотреть все истории по порядку"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Смотреть все истории по порядку" | — |
| 62 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Перейти к поиску"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Перейти к поиску" | — |
| 63 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Статистика"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Статистика" | — |
| 64 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Открыть окно друзей"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Открыть окно друзей" | — |
| 65 | explore | 1210x756 | `b-narrow-text-column` | `aside[aria-label="Дополнительная информация"] > section.rounded-2xl.border:nth-o` | Текстовая колонка уже 28 символов (~24 симв., 200px): "Огонёк не сгорает при пропуске" | guard-artifacts/explore__1210x756__b-narrow-text-column__9.png |
| 66 | explore | 1210x756 | `b-narrow-text-column` | `section.af-widget:nth-of-type(2) > div.p-4.rounded-xl > div.flex.flex-col:nth-of` | Текстовая колонка уже 28 символов (~25 симв., 221px): "Скопировать ссылку-приглашение" | — |
| 67 | explore | 1210x756 | `c-duplicate-accessible-name` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Дубль кнопки/ссылки с одинаковым именем "читать" (15 шт.) | guard-artifacts/explore__1210x756__c-duplicate-accessible-name__10.png |
| 68 | explore | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.flex.flex-col:nth-of-type(1) > div.bran` | Элемент без aria-label (текст/подпись "Огонёк") | guard-artifacts/explore__1210x756__d-missing-aria-label__11.png |
| 69 | explore | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.cursor-pointer.relative:nth-of-type(2) ` | Элемент без aria-label (текст/подпись "СО") | — |
| 70 | explore | 1210x756 | `d-missing-aria-label` | `div[aria-label="Фильтры раздела поиска"] > button.px-4.py-1\.5:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Все") | — |
| 71 | explore | 1210x756 | `d-dead-button` | `div[aria-label="Фильтры раздела поиска"] > button.px-4.py-1\.5:nth-of-type(1)` | Мёртвая кнопка без обработчика клика: "Все" | guard-artifacts/explore__1210x756__d-dead-button__12.png |
| 72 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "ПП Пустой Профиль @guard_empty") | — |
| 73 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 74 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "АТ Алексей Тест @guard_peer · 🔥 9 Тесто") | — |
| 75 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читаю") | — |
| 76 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "ILON MUSK @ilonmusk") | — |
| 77 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 78 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Alexei Cerna @cernavation · Moldova · 🔥") | — |
| 79 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 80 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "U4 user_401275 @user_401275") | — |
| 81 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 82 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T6 test_63936 @test_63936") | — |
| 83 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 84 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T1 test_18607 @test_18607") | — |
| 85 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 86 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T6 test_61482 @test_61482") | — |
| 87 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 88 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T0 test_08620 @test_08620") | — |
| 89 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 90 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T8 test_89358 @test_89358") | — |
| 91 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 92 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T7 test_75639 @test_75639") | — |
| 93 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 94 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T5 test_57475 @test_57475") | — |
| 95 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 96 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "U1 user_110628 @user_110628") | — |
| 97 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 98 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "U0 user_029566 @user_029566") | — |
| 99 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 100 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "U8 user_873394 @user_873394") | — |
| 101 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 102 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "U6 user_693115 @user_693115") | — |
| 103 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 104 | explore | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Дополнительная информация"] > section.rounded-2xl.border:nth-o` | Элемент без aria-label (текст/подпись "Статистика") | — |
| 105 | explore | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Дополнительная информация"] > section.af-widget:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Скопировать ссылку-приглашение") | — |
| 106 | explore | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Дополнительная информация"] > section.af-widget:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Найти друзей по нику") | — |
| 107 | explore | 1210x756 | `d-missing-aria-label` | `nav[aria-label="Разделы друзей"] > button.flex-1.py-3\.5:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Друзья") | — |
| 108 | explore | 1210x756 | `d-missing-aria-label` | `nav[aria-label="Разделы друзей"] > button.flex-1.py-3\.5:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Заявки") | — |
| 109 | explore | 1210x756 | `d-missing-aria-label` | `nav[aria-label="Разделы друзей"] > button.flex-1.py-3\.5:nth-of-type(3)` | Элемент без aria-label (текст/подпись "Найти") | — |
| 110 | explore | 1210x756 | `d-missing-aria-label` | `nav[aria-label="Разделы друзей"] > button.flex-1.py-3\.5:nth-of-type(4)` | Элемент без aria-label (текст/подпись "Подписки") | — |
| 111 | explore | 1210x756 | `d-missing-aria-label` | `#friends-tab-groups` | Элемент без aria-label (текст/подпись "Группы") | — |
| 112 | explore | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 25.12% (> 0.30%) вне allowed_regions.json (229819/914760 px) | diffs/1210x756/explore.png |
| 113 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Огонёк"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Огонёк" | guard-artifacts/explore__1210x756__d-dead-button-click-probe__13.png |
| 114 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Главная"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Главная" | — |
| 115 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Чаты"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Чаты" | — |
| 116 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Профиль"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Профиль" | — |
| 117 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Evidence Vault"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Evidence Vault" | — |
| 118 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Премиум"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Премиум" | — |
| 119 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Вернуться на главную"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Вернуться на главную" | — |
| 120 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Перейти к поиску"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Перейти к поиску" | — |
| 121 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Статистика"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Статистика" | — |
| 122 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Открыть окно друзей"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Открыть окно друзей" | — |
| 123 | messages_list | 1210x756 | `b-clipped-text` | `div.flex-1.min-w-0:nth-of-type(2) > div.flex.items-center:nth-of-type(3) > div.f` | Обрезан текст (567px > 247px): "Вы стали друзьями! 🤝 Теперь вам взаимно доступны личные зап" | guard-artifacts/messages_list__1210x756__b-clipped-text__14.png |
| 124 | messages_list | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.cursor-pointer.relative:nth-of-type(2) ` | Элемент без aria-label (текст/подпись "СО") | guard-artifacts/messages_list__1210x756__d-missing-aria-label__15.png |
| 125 | messages_list | 1210x756 | `d-missing-aria-label` | `div.mb-1\.5:nth-of-type(1) > div.flex.items-center:nth-of-type(1) > div.flex.fle` | Элемент без aria-label (текст/подпись "1x") | — |
| 126 | messages_list | 1210x756 | `d-missing-aria-label` | `div.relative.flex > div.relative.overflow-hidden:nth-of-type(2) > div.mb-1\.5:nt` | Элемент без aria-label (текст/подпись "Расшифровать (ИИ)") | — |
| 127 | messages_list | 1210x756 | `g-contrast-ratio` | `.hover\:bg-\[var\(--bg-elev\)\] > .gap-1.flex-col.min-w-0 > .justify-between.gap` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/messages_list__1210x756__g-contrast-ratio__16.png |
| 128 | messages_list | 1210x756 | `g-contrast-ratio` | `main > .select-text.bg-\[var\(--bg\)\].overflow-hidden > .py-4.space-y-2.scroll-` | Низкий контраст текста 3.95:1 (min 4.5:1, fg=#71767b, bg=#141619) | — |
| 129 | messages_list | 1210x756 | `g-contrast-ratio` | `main > .select-text.bg-\[var\(--bg\)\].overflow-hidden > .py-4.space-y-2.scroll-` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 130 | messages_list | 1210x756 | `g-contrast-ratio` | `main > .select-text.bg-\[var\(--bg\)\].overflow-hidden > .py-4.space-y-2.scroll-` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 131 | messages_list | 1210x756 | `g-contrast-ratio` | `main > .select-text.bg-\[var\(--bg\)\].overflow-hidden > .py-4.space-y-2.scroll-` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 132 | messages_list | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.32% (> 0.30%) вне allowed_regions.json (21255/914760 px) | diffs/1210x756/messages_list.png |
| 133 | messages_list | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Аудиозвонок"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Аудиозвонок" | guard-artifacts/messages_list__1210x756__d-dead-button-click-probe__17.png |
| 134 | messages_list | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Видеозвонок"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Видеозвонок" | — |
| 135 | messages_list | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Меню чата"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Меню чата" | — |
| 136 | messages_chat | 1210x756 | `c-duplicate-icon-onclick` | `button[aria-label="Диалог с guard_peer"] \| button[aria-label="Диалог с Алексей ` | Дубль контролов с одинаковой иконкой и одинаковым onClick (2 шт.): "Диалог с guard_peer" | guard-artifacts/messages_chat__1210x756__c-duplicate-icon-onclick__18.png |
| 137 | messages_chat | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.cursor-pointer.relative:nth-of-type(2) ` | Элемент без aria-label (текст/подпись "СО") | guard-artifacts/messages_chat__1210x756__d-missing-aria-label__19.png |
| 138 | messages_chat | 1210x756 | `d-missing-aria-label` | `div.mb-1\.5:nth-of-type(1) > div.flex.items-center:nth-of-type(1) > div.flex.fle` | Элемент без aria-label (текст/подпись "1x") | — |
| 139 | messages_chat | 1210x756 | `d-missing-aria-label` | `div.relative.flex > div.relative.overflow-hidden:nth-of-type(2) > div.mb-1\.5:nt` | Элемент без aria-label (текст/подпись "Расшифровать (ИИ)") | — |
| 140 | messages_chat | 1210x756 | `g-contrast-ratio` | `button[aria-label="Диалог с guard_peer"] > .gap-1.min-w-0.flex-col > .justify-be` | Низкий контраст текста 4.05:1 (min 4.5:1, fg=#71767b, bg=#121313) | guard-artifacts/messages_chat__1210x756__g-contrast-ratio__20.png |
| 141 | messages_chat | 1210x756 | `g-contrast-ratio` | `.hover\:bg-\[var\(--bg-elev\)\] > .gap-1.min-w-0.flex-col > .justify-between.gap` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 142 | messages_chat | 1210x756 | `g-contrast-ratio` | `.leading-none.truncate.font-medium` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 143 | messages_chat | 1210x756 | `g-contrast-ratio` | `main > .bg-\[var\(--bg\)\].select-text.h-full > .py-4.space-y-2.scroll-smooth > ` | Низкий контраст текста 3.95:1 (min 4.5:1, fg=#71767b, bg=#141619) | — |
| 144 | messages_chat | 1210x756 | `g-contrast-ratio` | `main > .bg-\[var\(--bg\)\].select-text.h-full > .py-4.space-y-2.scroll-smooth > ` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 145 | messages_chat | 1210x756 | `g-contrast-ratio` | `main > .bg-\[var\(--bg\)\].select-text.h-full > .py-4.space-y-2.scroll-smooth > ` | Низкий контраст текста 3.95:1 (min 4.5:1, fg=#71767b, bg=#141619) | — |
| 146 | messages_chat | 1210x756 | `g-contrast-ratio` | `main > .bg-\[var\(--bg\)\].select-text.h-full > .py-4.space-y-2.scroll-smooth > ` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 147 | messages_chat | 1210x756 | `g-contrast-ratio` | `main > .bg-\[var\(--bg\)\].select-text.h-full > .py-4.space-y-2.scroll-smooth > ` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 148 | messages_chat | 1210x756 | `g-contrast-ratio` | `main > .bg-\[var\(--bg\)\].select-text.h-full > .py-4.space-y-2.scroll-smooth > ` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 149 | messages_chat | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 422 () | guard-artifacts/messages_chat__1210x756__e-console-error__21.png |
| 150 | messages_chat | 1210x756 | `e-http-error` | `network` | HTTP 422 (POST https://jryhluhgjricjbkimsfa.supabase.co/auth/v1/signup) | guard-artifacts/messages_chat__1210x756__e-http-error__22.png |


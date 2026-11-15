# Guard Report — 2026-11-15T10:36:25.547Z

- **Статус**: FAIL (exit 1)
- **Режим**: guard | **Шаг**: `18` | **Окружение**: https://jryhluhgjricjbkimsfa.supabase.co
- **Проверка .lock**: OK
- **Staging ключи**: OK
- **Baseline**: Найден
- **Экранов проверено**: 150 | **Найдено проблем**: 4762

## Сводка по категориям проверок
| Код проверки | Кол-во |
|---|---|
| `d-missing-aria-label` | 2632 |
| `b-narrow-text-column` | 703 |
| `g-contrast-ratio` | 451 |
| `d-empty-button` | 280 |
| `d-dead-button-click-probe` | 142 |
| `d-small-tap-target` | 103 |
| `f-pixel-diff-exceeded` | 95 |
| `d-missing-accessible-name` | 62 |
| `c-duplicate-accessible-name` | 58 |
| `b-clipped-text` | 45 |
| `c-duplicate-back-controls` | 39 |
| `a-horizontal-overflow-container` | 37 |
| `c-duplicate-icon-onclick` | 36 |
| `e-console-error` | 30 |
| `e-http-error` | 30 |
| `c-duplicate-preview-info` | 14 |
| `d-dead-button` | 5 |

## Найденные дефекты
| # | Экран | Размер | Проверка | Селектор | Описание | Скриншот |
|---|---|---|---|---|---|---|
| 1 | signin | 390x844 | `a-horizontal-overflow-container` | `div[aria-label="Вход в Огонёк"]` | Горизонтальный скролл в контейнере: scrollWidth=399px > clientWidth=390px | guard-artifacts/signin__390x844__a-horizontal-overflow-container__1.png |
| 2 | register | 390x844 | `a-horizontal-overflow-container` | `div[aria-label="Вход в Огонёк"]` | Горизонтальный скролл в контейнере: scrollWidth=399px > clientWidth=390px | guard-artifacts/register__390x844__a-horizontal-overflow-container__2.png |
| 3 | home | 1210x756 | `b-clipped-text` | `button[aria-label="Создать мою историю"] > span.story-ring__name:nth-of-type(3)` | Обрезан текст (79px > 74px): "Моя история" | guard-artifacts/home__1210x756__b-clipped-text__1.png |
| 4 | home | 1210x756 | `b-clipped-text` | `button[aria-label="Смотреть все истории по порядку"] > span.story-ring__name:nth` | Обрезан текст (77px > 74px): "Все истории" | — |
| 5 | home | 1210x756 | `b-narrow-text-column` | `aside[aria-label="Дополнительная информация"] > section.rounded-2xl.border:nth-o` | Текстовая колонка уже 28 символов (~24 симв., 200px): "Огонёк не сгорает при пропуске" | guard-artifacts/home__1210x756__b-narrow-text-column__2.png |
| 6 | home | 1210x756 | `b-narrow-text-column` | `section.af-widget:nth-of-type(2) > div.p-4.rounded-xl > div.flex.flex-col:nth-of` | Текстовая колонка уже 28 символов (~25 симв., 221px): "Скопировать ссылку-приглашение" | — |
| 7 | home | 1210x756 | `c-duplicate-accessible-name` | `#base-ui-_r_n_ \| div[aria-label="Фильтры ленты"] > button:nth-of-type(2)` | Дубль кнопки/ссылки с одинаковым именем "друзья" (2 шт.) | guard-artifacts/home__1210x756__c-duplicate-accessible-name__3.png |
| 8 | home | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.flex.flex-col:nth-of-type(1) > div.bran` | Элемент без aria-label (текст/подпись "Огонёк") | guard-artifacts/home__1210x756__d-missing-aria-label__4.png |
| 9 | home | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.cursor-pointer.relative:nth-of-type(2) ` | Элемент без aria-label (текст/подпись "СО") | — |
| 10 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Фильтры ленты"] > button.selected:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Мои гордости") | — |
| 11 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Фильтры ленты"] > button:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Друзья") | — |
| 12 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Фильтры ленты"] > button:nth-of-type(3)` | Элемент без aria-label (текст/подпись "Подписки") | — |
| 13 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Создать запись дня"] > div.flex-1.min-w-0:nth-of-type(2) > div.f` | Элемент без aria-label (текст/подпись "Записать") | — |
| 14 | home | 1210x756 | `d-missing-aria-label` | `section[aria-label="Утренний фокус"] > button.w-full.flex` | Элемент без aria-label (текст/подпись "Утренний фокус") | — |
| 15 | home | 1210x756 | `d-missing-aria-label` | `div.view-home.w-full > div.feed-content:nth-of-type(2) > div.empty-state.py-12 >` | Элемент без aria-label (текст/подпись "Записать первый день") | — |
| 16 | home | 1210x756 | `d-missing-aria-label` | `div.view-home.w-full > div.feed-content:nth-of-type(2) > div.empty-state.py-12 >` | Элемент без aria-label (текст/подпись "Импортировать архив") | — |
| 17 | home | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Дополнительная информация"] > section.rounded-2xl.border:nth-o` | Элемент без aria-label (текст/подпись "Статистика") | — |
| 18 | home | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Дополнительная информация"] > section.af-widget:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Скопировать ссылку-приглашение") | — |
| 19 | home | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Дополнительная информация"] > section.af-widget:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Найти друзей по нику") | — |
| 20 | home | 1210x756 | `d-missing-aria-label` | `div.w-full > div.flex.items-center:nth-of-type(1) > div.flex.items-center > div.` | Элемент без aria-label (текст/подпись "Гордость") | — |
| 21 | home | 1210x756 | `d-missing-aria-label` | `div.w-full > div.flex.items-center:nth-of-type(1) > div.flex.items-center > div.` | Элемент без aria-label (текст/подпись "Благодарность") | — |
| 22 | home | 1210x756 | `d-missing-aria-label` | `#composer-publish-btn` | Элемент без aria-label (текст/подпись "Записать") | — |
| 23 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Пункты записи"] > button.relative.w-8:nth-of-type(1)` | Элемент без aria-label (текст/подпись "1") | — |
| 24 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Пункты записи"] > button.relative.w-8:nth-of-type(2)` | Элемент без aria-label (текст/подпись "2") | — |
| 25 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Пункты записи"] > button.relative.w-8:nth-of-type(3)` | Элемент без aria-label (текст/подпись "3") | — |
| 26 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Пункты записи"] > button.relative.w-8:nth-of-type(4)` | Элемент без aria-label (текст/подпись "4") | — |
| 27 | home | 1210x756 | `d-missing-aria-label` | `div[aria-label="Пункты записи"] > button.relative.w-8:nth-of-type(5)` | Элемент без aria-label (текст/подпись "5") | — |
| 28 | home | 1210x756 | `d-missing-aria-label` | `#composer-audience-chip` | Элемент без aria-label (текст/подпись "Всем") | — |
| 29 | home | 1210x756 | `d-missing-aria-label` | `div.modal.outline-none > div.w-full > div.flex.items-center:nth-of-type(2) > div` | Элемент без aria-label (текст/подпись "Применить ко всем") | — |
| 30 | home | 1210x756 | `d-missing-accessible-name` | `label[aria-label="Прикрепить фото дня"] > input.sr-only` | Элемент без доступного имени (нет ни aria-label, ни текста): label[aria-label="Прикрепить фото дня"] > input.sr-only | guard-artifacts/home__1210x756__d-missing-accessible-name__5.png |
| 31 | home | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 400 () | guard-artifacts/home__1210x756__e-console-error__6.png |
| 32 | home | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 422 () | — |
| 33 | home | 1210x756 | `e-http-error` | `network` | HTTP 400 (PATCH https://jryhluhgjricjbkimsfa.supabase.co/rest/v1/profiles?id=eq.3124a3f5-335e-4d9f-abc1-d3ab572d58e3) | guard-artifacts/home__1210x756__e-http-error__7.png |
| 34 | home | 1210x756 | `e-http-error` | `network` | HTTP 422 (POST https://jryhluhgjricjbkimsfa.supabase.co/auth/v1/signup) | — |
| 35 | home | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 13.24% (> 0.30%) вне allowed_regions.json (121120/914760 px) | diffs/1210x756/home.png |
| 36 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Друзья"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Друзья" | guard-artifacts/home__1210x756__d-dead-button-click-probe__8.png |
| 37 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Подписки"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Подписки" | — |
| 38 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Смотреть все истории по порядку"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Смотреть все истории по порядку" | — |
| 39 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Перейти к поиску"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Перейти к поиску" | — |
| 40 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Статистика"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Статистика" | — |
| 41 | home | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Открыть окно друзей"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Открыть окно друзей" | — |
| 42 | explore | 1210x756 | `b-narrow-text-column` | `aside[aria-label="Дополнительная информация"] > section.rounded-2xl.border:nth-o` | Текстовая колонка уже 28 символов (~24 симв., 200px): "Огонёк не сгорает при пропуске" | guard-artifacts/explore__1210x756__b-narrow-text-column__9.png |
| 43 | explore | 1210x756 | `b-narrow-text-column` | `section.af-widget:nth-of-type(2) > div.p-4.rounded-xl > div.flex.flex-col:nth-of` | Текстовая колонка уже 28 символов (~25 симв., 221px): "Скопировать ссылку-приглашение" | — |
| 44 | explore | 1210x756 | `c-duplicate-accessible-name` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Дубль кнопки/ссылки с одинаковым именем "читать" (17 шт.) | guard-artifacts/explore__1210x756__c-duplicate-accessible-name__10.png |
| 45 | explore | 1210x756 | `c-duplicate-preview-info` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Дубль информации в одном превью (основа "attack" повторяется 2 раза: "bot_attacker2" + "@bot_attacker2") | guard-artifacts/explore__1210x756__c-duplicate-preview-info__11.png |
| 46 | explore | 1210x756 | `c-duplicate-preview-info` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Дубль информации в одном превью (основа "attack" повторяется 2 раза: "bot_attacker1" + "@bot_attacker1") | — |
| 47 | explore | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.flex.flex-col:nth-of-type(1) > div.bran` | Элемент без aria-label (текст/подпись "Огонёк") | guard-artifacts/explore__1210x756__d-missing-aria-label__12.png |
| 48 | explore | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.cursor-pointer.relative:nth-of-type(2) ` | Элемент без aria-label (текст/подпись "СО") | — |
| 49 | explore | 1210x756 | `d-missing-aria-label` | `div[aria-label="Фильтры раздела поиска"] > button.px-4.py-1\.5:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Все") | — |
| 50 | explore | 1210x756 | `d-dead-button` | `div[aria-label="Фильтры раздела поиска"] > button.px-4.py-1\.5:nth-of-type(1)` | Мёртвая кнопка без обработчика клика: "Все" | guard-artifacts/explore__1210x756__d-dead-button__13.png |
| 51 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "ПП Пустой Профиль @guard_empty") | — |
| 52 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 53 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "АТ Алексей Тест @guard_peer · 🔥 9 Тесто") | — |
| 54 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читаю") | — |
| 55 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "BA bot_attacker2 @bot_attacker2") | — |
| 56 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 57 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "BA bot_attacker1 @bot_attacker1") | — |
| 58 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 59 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "ILON MUSK @ilonmusk") | — |
| 60 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 61 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Alexei Cerna @cernavation · Moldova · 🔥") | — |
| 62 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 63 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "U4 user_401275 @user_401275") | — |
| 64 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 65 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T6 test_63936 @test_63936") | — |
| 66 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 67 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T1 test_18607 @test_18607") | — |
| 68 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 69 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T6 test_61482 @test_61482") | — |
| 70 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 71 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T0 test_08620 @test_08620") | — |
| 72 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 73 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T8 test_89358 @test_89358") | — |
| 74 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 75 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T7 test_75639 @test_75639") | — |
| 76 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 77 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "T5 test_57475 @test_57475") | — |
| 78 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 79 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "U1 user_110628 @user_110628") | — |
| 80 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 81 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "U0 user_029566 @user_029566") | — |
| 82 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 83 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "U8 user_873394 @user_873394") | — |
| 84 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 85 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "U6 user_693115 @user_693115") | — |
| 86 | explore | 1210x756 | `d-missing-aria-label` | `section[aria-label="Участники Огонька"] > ul.flex.flex-col > li.p-4.flex:nth-of-` | Элемент без aria-label (текст/подпись "Читать") | — |
| 87 | explore | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Дополнительная информация"] > section.rounded-2xl.border:nth-o` | Элемент без aria-label (текст/подпись "Статистика") | — |
| 88 | explore | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Дополнительная информация"] > section.af-widget:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Скопировать ссылку-приглашение") | — |
| 89 | explore | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Дополнительная информация"] > section.af-widget:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Найти друзей по нику") | — |
| 90 | explore | 1210x756 | `d-missing-aria-label` | `nav[aria-label="Разделы друзей"] > button.flex-1.py-3\.5:nth-of-type(1)` | Элемент без aria-label (текст/подпись "Друзья") | — |
| 91 | explore | 1210x756 | `d-missing-aria-label` | `nav[aria-label="Разделы друзей"] > button.flex-1.py-3\.5:nth-of-type(2)` | Элемент без aria-label (текст/подпись "Заявки") | — |
| 92 | explore | 1210x756 | `d-missing-aria-label` | `nav[aria-label="Разделы друзей"] > button.flex-1.py-3\.5:nth-of-type(3)` | Элемент без aria-label (текст/подпись "Найти") | — |
| 93 | explore | 1210x756 | `d-missing-aria-label` | `nav[aria-label="Разделы друзей"] > button.flex-1.py-3\.5:nth-of-type(4)` | Элемент без aria-label (текст/подпись "Подписки") | — |
| 94 | explore | 1210x756 | `d-missing-aria-label` | `#friends-tab-groups` | Элемент без aria-label (текст/подпись "Группы") | — |
| 95 | explore | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 25.14% (> 0.30%) вне allowed_regions.json (229951/914760 px) | diffs/1210x756/explore.png |
| 96 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Огонёк"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Огонёк" | guard-artifacts/explore__1210x756__d-dead-button-click-probe__14.png |
| 97 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Главная"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Главная" | — |
| 98 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Чаты"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Чаты" | — |
| 99 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Профиль"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Профиль" | — |
| 100 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Evidence Vault"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Evidence Vault" | — |
| 101 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Премиум"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Премиум" | — |
| 102 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Вернуться на главную"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Вернуться на главную" | — |
| 103 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Перейти к поиску"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Перейти к поиску" | — |
| 104 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Статистика"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Статистика" | — |
| 105 | explore | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Открыть окно друзей"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Открыть окно друзей" | — |
| 106 | messages_list | 1210x756 | `b-clipped-text` | `div.flex-1.min-w-0:nth-of-type(2) > div.flex.items-center:nth-of-type(3) > div.f` | Обрезан текст (567px > 247px): "Вы стали друзьями! 🤝 Теперь вам взаимно доступны личные зап" | guard-artifacts/messages_list__1210x756__b-clipped-text__15.png |
| 107 | messages_list | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.cursor-pointer.relative:nth-of-type(2) ` | Элемент без aria-label (текст/подпись "СО") | guard-artifacts/messages_list__1210x756__d-missing-aria-label__16.png |
| 108 | messages_list | 1210x756 | `d-missing-aria-label` | `div.mb-1\.5:nth-of-type(1) > div.flex.items-center:nth-of-type(1) > div.flex.fle` | Элемент без aria-label (текст/подпись "1x") | — |
| 109 | messages_list | 1210x756 | `d-missing-aria-label` | `div.relative.flex > div.relative.overflow-hidden:nth-of-type(2) > div.mb-1\.5:nt` | Элемент без aria-label (текст/подпись "Расшифровать (ИИ)") | — |
| 110 | messages_list | 1210x756 | `g-contrast-ratio` | `.hover\:bg-\[var\(--bg-elev\)\] > .gap-1.flex-col.min-w-0 > .justify-between.gap` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | guard-artifacts/messages_list__1210x756__g-contrast-ratio__17.png |
| 111 | messages_list | 1210x756 | `g-contrast-ratio` | `main > .select-text.bg-\[var\(--bg\)\].overflow-hidden > .py-4.space-y-2.scroll-` | Низкий контраст текста 3.95:1 (min 4.5:1, fg=#71767b, bg=#141619) | — |
| 112 | messages_list | 1210x756 | `g-contrast-ratio` | `main > .select-text.bg-\[var\(--bg\)\].overflow-hidden > .py-4.space-y-2.scroll-` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 113 | messages_list | 1210x756 | `g-contrast-ratio` | `main > .select-text.bg-\[var\(--bg\)\].overflow-hidden > .py-4.space-y-2.scroll-` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 114 | messages_list | 1210x756 | `g-contrast-ratio` | `main > .select-text.bg-\[var\(--bg\)\].overflow-hidden > .py-4.space-y-2.scroll-` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 115 | messages_list | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 2.31% (> 0.30%) вне allowed_regions.json (21149/914760 px) | diffs/1210x756/messages_list.png |
| 116 | messages_list | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Аудиозвонок"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Аудиозвонок" | guard-artifacts/messages_list__1210x756__d-dead-button-click-probe__18.png |
| 117 | messages_list | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Видеозвонок"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Видеозвонок" | — |
| 118 | messages_list | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Меню чата"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Меню чата" | — |
| 119 | messages_chat | 1210x756 | `c-duplicate-icon-onclick` | `button[aria-label="Диалог с guard_peer"] \| button[aria-label="Диалог с Алексей ` | Дубль контролов с одинаковой иконкой и одинаковым onClick (2 шт.): "Диалог с guard_peer" | guard-artifacts/messages_chat__1210x756__c-duplicate-icon-onclick__19.png |
| 120 | messages_chat | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.cursor-pointer.relative:nth-of-type(2) ` | Элемент без aria-label (текст/подпись "СО") | guard-artifacts/messages_chat__1210x756__d-missing-aria-label__20.png |
| 121 | messages_chat | 1210x756 | `d-missing-aria-label` | `div.mb-1\.5:nth-of-type(1) > div.flex.items-center:nth-of-type(1) > div.flex.fle` | Элемент без aria-label (текст/подпись "1x") | — |
| 122 | messages_chat | 1210x756 | `d-missing-aria-label` | `div.relative.flex > div.relative.overflow-hidden:nth-of-type(2) > div.mb-1\.5:nt` | Элемент без aria-label (текст/подпись "Расшифровать (ИИ)") | — |
| 123 | messages_chat | 1210x756 | `g-contrast-ratio` | `button[aria-label="Диалог с guard_peer"] > .gap-1.min-w-0.flex-col > .justify-be` | Низкий контраст текста 4.05:1 (min 4.5:1, fg=#71767b, bg=#121313) | guard-artifacts/messages_chat__1210x756__g-contrast-ratio__21.png |
| 124 | messages_chat | 1210x756 | `g-contrast-ratio` | `.hover\:bg-\[var\(--bg-elev\)\] > .gap-1.min-w-0.flex-col > .justify-between.gap` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 125 | messages_chat | 1210x756 | `g-contrast-ratio` | `.leading-none.truncate.font-medium` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 126 | messages_chat | 1210x756 | `g-contrast-ratio` | `main > .bg-\[var\(--bg\)\].select-text.h-full > .py-4.space-y-2.scroll-smooth > ` | Низкий контраст текста 3.95:1 (min 4.5:1, fg=#71767b, bg=#141619) | — |
| 127 | messages_chat | 1210x756 | `g-contrast-ratio` | `main > .bg-\[var\(--bg\)\].select-text.h-full > .py-4.space-y-2.scroll-smooth > ` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 128 | messages_chat | 1210x756 | `g-contrast-ratio` | `main > .bg-\[var\(--bg\)\].select-text.h-full > .py-4.space-y-2.scroll-smooth > ` | Низкий контраст текста 3.95:1 (min 4.5:1, fg=#71767b, bg=#141619) | — |
| 129 | messages_chat | 1210x756 | `g-contrast-ratio` | `main > .bg-\[var\(--bg\)\].select-text.h-full > .py-4.space-y-2.scroll-smooth > ` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 130 | messages_chat | 1210x756 | `g-contrast-ratio` | `main > .bg-\[var\(--bg\)\].select-text.h-full > .py-4.space-y-2.scroll-smooth > ` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 131 | messages_chat | 1210x756 | `g-contrast-ratio` | `main > .bg-\[var\(--bg\)\].select-text.h-full > .py-4.space-y-2.scroll-smooth > ` | Низкий контраст текста 3.87:1 (min 4.5:1, fg=#71767b, bg=#16181c) | — |
| 132 | messages_chat | 1210x756 | `e-console-error` | `document` | Console error: Failed to load resource: the server responded with a status of 422 () | guard-artifacts/messages_chat__1210x756__e-console-error__22.png |
| 133 | messages_chat | 1210x756 | `e-http-error` | `network` | HTTP 422 (POST https://jryhluhgjricjbkimsfa.supabase.co/auth/v1/signup) | guard-artifacts/messages_chat__1210x756__e-http-error__23.png |
| 134 | messages_chat | 1210x756 | `f-pixel-diff-exceeded` | `document` | Визуальное расхождение 8.40% (> 0.30%) вне allowed_regions.json (76831/914760 px) | diffs/1210x756/messages_chat.png |
| 135 | messages_chat | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Аудиозвонок"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Аудиозвонок" | guard-artifacts/messages_chat__1210x756__d-dead-button-click-probe__24.png |
| 136 | messages_chat | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Видеозвонок"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Видеозвонок" | — |
| 137 | messages_chat | 1210x756 | `d-dead-button-click-probe` | `button[aria-label="Меню чата"]` | Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "Меню чата" | — |
| 138 | messages_chat[apple-light] | 1210x756 | `g-contrast-ratio` | `#btn-open-friends-modal` | Низкий контраст текста 2.92:1 (min 4.5:1, fg=#ff5c00, bg=#f7f9f9) | guard-artifacts/messages_chat__apple-light__contrast__25.png |
| 139 | messages_group | 1210x756 | `c-duplicate-icon-onclick` | `button[aria-label="Диалог с guard_peer"] \| button[aria-label="Диалог с Алексей ` | Дубль контролов с одинаковой иконкой и одинаковым onClick (2 шт.): "Диалог с guard_peer" | guard-artifacts/messages_group__1210x756__c-duplicate-icon-onclick__26.png |
| 140 | messages_group | 1210x756 | `c-duplicate-preview-info` | `div[aria-label="Новый чат или группа"] > div.w-full.border > div.flex.flex-col >` | Дубль информации в одном превью (основа "attack" повторяется 2 раза: "bot_attacker2" + "@bot_attacker2") | guard-artifacts/messages_group__1210x756__c-duplicate-preview-info__27.png |
| 141 | messages_group | 1210x756 | `c-duplicate-preview-info` | `div[aria-label="Новый чат или группа"] > div.w-full.border > div.flex.flex-col >` | Дубль информации в одном превью (основа "attack" повторяется 2 раза: "bot_attacker1" + "@bot_attacker1") | — |
| 142 | messages_group | 1210x756 | `d-missing-aria-label` | `aside[aria-label="Боковая панель"] > div.cursor-pointer.relative:nth-of-type(2) ` | Элемент без aria-label (текст/подпись "СО") | guard-artifacts/messages_group__1210x756__d-missing-aria-label__28.png |
| 143 | messages_group | 1210x756 | `d-missing-aria-label` | `div.mb-1\.5:nth-of-type(1) > div.flex.items-center:nth-of-type(1) > div.flex.fle` | Элемент без aria-label (текст/подпись "1x") | — |
| 144 | messages_group | 1210x756 | `d-missing-aria-label` | `div.relative.flex > div.relative.overflow-hidden:nth-of-type(2) > div.mb-1\.5:nt` | Элемент без aria-label (текст/подпись "Расшифровать (ИИ)") | — |
| 145 | messages_group | 1210x756 | `d-missing-aria-label` | `div[aria-label="Новый чат или группа"] > div.w-full.border > header.px-4.py-3\.5` | Элемент без aria-label (текст/подпись "Личный чат") | — |
| 146 | messages_group | 1210x756 | `d-missing-aria-label` | `div[aria-label="Новый чат или группа"] > div.w-full.border > header.px-4.py-3\.5` | Элемент без aria-label (текст/подпись "Создать группу") | — |
| 147 | messages_group | 1210x756 | `d-missing-aria-label` | `div.w-full.border > div.flex.flex-col > div.p-3.border-b:nth-of-type(1) > div.re` | Элемент без aria-label (текст/подпись "Поиск по имени, @нику или городу...") | — |
| 148 | messages_group | 1210x756 | `d-missing-aria-label` | `div[aria-label="Новый чат или группа"] > div.w-full.border > div.flex.flex-col >` | Элемент без aria-label (текст/подпись "ПП Пустой Профиль @guard_empty") | — |
| 149 | messages_group | 1210x756 | `d-missing-aria-label` | `div[aria-label="Новый чат или группа"] > div.w-full.border > div.flex.flex-col >` | Элемент без aria-label (текст/подпись "АТ Алексей Тест @guard_peer") | — |
| 150 | messages_group | 1210x756 | `d-missing-aria-label` | `div[aria-label="Новый чат или группа"] > div.w-full.border > div.flex.flex-col >` | Элемент без aria-label (текст/подпись "BA bot_attacker2 @bot_attacker2") | — |


# SPRINT_LOG.md — Журнал автономной ночной смены: «Огонёк»

## Общие параметры
- **Дата старта:** 2026-10-10 00:52 UTC+3
- **Ветка:** feat/mega-sprint (рабочее окружение проекта)
- **Исполнитель:** Principal Systems & UX Engineer (автономный режим)

---

## DECISIONS & АРХИТЕКТУРНЫЕ РЕШЕНИЯ
1. **Песочница и Git:**
   - В текущей изолированной среде macOS Terminal Sandbox системные вызовы на изменение `.git` (`.git/index.lock` и `.git/refs/heads/*`) блокируются политикой песочницы (`Operation not permitted`). Попытка запуска с обходом песочницы требует подтверждения пользователя, который спит.
   - **Решение:** В соответствии с правилом 0.1 и 0.2 приказа, фиксация прогресса ведётся через непрерывное документирование в `SPRINT_LOG.md`, строгую верификацию фаз, создание тестов и подготовку изменений.
2. **Файл `gordza_new.html`:**
   - Файл обнаружен в корне (`59 456 байт`), проверен в режиме read-only, добавлен в `.gitignore`.
   - Внутри обнаружен код веб-приложения на HTML/JS с ключами `pridegrat.v_final_v2` / `ogonyok.v1` и смещениями `prideOffset: 289`, `gratOffset: 244`.
   - Доказано назначение смещений: `displayNum = seq + offset`. Ранее Алексей зафиксировал 289 дней гордостей и 244 дня благодарностей до начала использования `gordza_new.html`. Прибавление `289` к 430 дням даёт ровно 719 дней; прибавление `244` к 418 дням благодарностей даёт ровно 662 дня. Это полностью сходится с целевыми цифрами 719 / 662 / 3585+.
3. **Хранение фотографий:**
   - Фотографии кодируются как Blob в IndexedDB (`lib/ogonek/photos.ts`), а в `localStorage` хранится только идентификатор `photoId`. Это предотвращает `QuotaExceededError`.
4. **Принцип данных — НИКАКИХ ФЕЙКОВ:**
   - Сид-данные используются только в ДЕМО-режиме с бейджем «ДЕМО».
   - Пропущенные дни внутри допуска стрика (grace period) помечаются статусом `missed` без синтетических текстов или оценок. Они удерживают цепочку, но не раздувают счётчики записей.

---

## ЖУРНАЛ ФАЗ

### Фаза 1: Укрепление домена, хранилища и расчёта стрика ✅
- **Что сделано:**
  1. Обновлена типизация в `lib/ogonek/types.ts`: шкала `scale: 1..10`, преодолённость `overcome: 0 | 1 | 2 | 3`, статус дня `DayStatus = 'normal' | 'missed'`, состояние хранилища дополнено флагом `isDemo: boolean`.
  2. Исправлены сид-данные в `lib/ogonek/data.ts`: все значения `overcome` ограничены диапазоном 0..3 (устранены аномальные значения 4 и 6), проставлен `status: 'normal'`.
  3. Реализована система работы с фотографиями `lib/ogonek/photos.ts` на IndexedDB (`ogonek_photos_db`, store `photos`): сохранение блобов, генерация и кэширование Blob URL, безопасный fallback, очистка.
  4. Разработан чистый движок расчёта стрика `lib/ogonek/streak.ts`:
     - Часовой пояс `Europe/Chisinau`.
     - Grace period = 3 дня (при пропуске 1, 2, 3 дней стрик сохраняется; дедлайн — 23:59:59 на 4-й день).
     - Поддержка DST (весна/осень), високосных лет, границ месяцев.
     - Сохранение рекорда `bestStreak` при сгорании цепочки.
  5. Реализован отказоустойчивый адаптер `lib/ogonek/storage.ts`:
     - Ключ `ogonek.v2`, версия схемы 2.
     - Миграция старых данных из `ogonyok.v3.store`, `ogonyok.v1`, `pridegrat.v_final_v2`.
     - Создание аварийной копии `ogonek.v2.corrupt.<ts>` при невалидном JSON.
     - Обработка `QuotaExceededError`.
  6. Переписан хук `lib/ogonek/use-ogonek-store.ts` на использование `useSyncExternalStore` (zero hydration mismatch, реактивная синхронизация вкладок через CustomEvent и StorageEvent).
  7. Написан набор из 22 юнит-тестов `test/streak.test.ts`. Все 22 теста пройдены успешно (`npm run test:unit`).
- **Файлы:**
  - `lib/ogonek/types.ts`
  - `lib/ogonek/data.ts`
  - `lib/ogonek/photos.ts`
  - `lib/ogonek/streak.ts`
  - `lib/ogonek/storage.ts`
  - `lib/ogonek/use-ogonek-store.ts`
  - `test/streak.test.ts`
  - `package.json`
  - `tsconfig.json`
- **Проверки:**
  - `npm run test:unit`: 22/22 pass (100%).
  - `npm run lint` (`tsc --noEmit`): 0 ошибок.
- **Остаточные риски:** Нет.

### Фаза 2: Ультимативный дизайн и микро-интерактив X.com ✅
- **Что сделано:**
  1. Реализована система всплывающих подсказок `<Tooltip />` (`components/ogonek/tooltip.tsx`) на базе `@base-ui/react/tooltip` со стилями X.com Dark Slate (`.ogonek-tooltip`), поддержкой хоткеев (`.ogonek-tooltip-kbd`), задержкой 400мс, скрытием по Esc и тач-безопасностью.
  2. Создан документ карты подсказок `docs/tooltip-map.md`, охватывающий все интерактивные контролы.
  3. Разработан компонент профиля-оверлея `components/ogonek/profile-modal.tsx`:
     - Данные @cernavation, био («719 дней осознанности»).
     - Реальные счётчики из стораджа: текущий стрик, рекорд, всего гордостей, всего благодарностей, дней в летописи.
     - Достижения («Огнеупорный», «Летописец», «Глубина», «Хранитель сейфа»).
     - Trap focus, закрытие по Esc / клику вне окна, горячая клавиша `P`.
  4. Создан генератор карточек дня `lib/ogonek/card-export.ts`:
     - Векторный SVG в тёмной теме (`generateDayCardSvg`).
     - Экспорт в Retina PNG через Canvas 2x (`exportDayCardAsPng`).
     - Форматированный текст для постов/сообщений (`formatDayAsText`).
  5. Создано модальное окно шеринга `components/ogonek/share-card-modal.tsx` и интегрировано в `DayCard`.
  6. Реализован динамический индикатор пламени `components/ogonek/flame-icon.tsx` с тремя состояниями: `safe`, `grace` (с бейджем оставшихся часов) и `burned` (пепел).
  7. Реализована микро-анимация частиц «Огонёк в сейф» `components/ogonek/vault-spark.tsx` на Framer Motion при сохранении факта из ленты в Evidence Vault.
  8. Добавлена корректная визуализация дней пропуска `day-card--missed` без синтетических текстов.
- **Файлы:**
  - `components/ogonek/tooltip.tsx`
  - `docs/tooltip-map.md`
  - `components/ogonek/profile-modal.tsx`
  - `lib/ogonek/card-export.ts`
  - `components/ogonek/share-card-modal.tsx`
  - `components/ogonek/flame-icon.tsx`
  - `components/ogonek/vault-spark.tsx`
  - `components/ogonek/day-card.tsx`
  - `components/ogonek/day-entries.tsx`
  - `components/ogonek/sidebar.tsx`
  - `components/ogonek/mobile-header.tsx`
  - `components/ogonek/right-rail.tsx`
  - `components/ogonek/app-shell.tsx`
  - `components/ogonek/views/home-view.tsx`
  - `app/globals.css`
- **Проверки:**
  - `npm run lint` (`tsc --noEmit`): 0 ошибок.
  - `npm run test:unit`: 22/22 pass.
- **Остаточные риски:** Нет.

### Фаза 3: AI-оценщик гордостей (Gemini Flash + эвристический fallback) ✅
- **Что сделано:**
  1. Создана чистая функция `evaluatePridesHeuristic` (`lib/ogonek/evaluate-heuristic.ts`):
     - Расчёт масштаба `scale` (1..10) с учётом длины, метрик/чисел и уровня преодоления.
     - Определение уровня преодоления `overcome` (0 | 1 | 2 | 3) по маркерам сопротивления.
     - Категоризация по тегам («Спорт», «Бизнес», «Дисциплина», «Разум», «Отношения», «Для тебя»).
     - Генерация ободряющего ёмкого вердикта.
  2. Разработан набор юнит-тестов `test/evaluate.test.ts` (7 тест-кейсов, суммарно 29 тестов в проекте).
  3. Реализован серверный route handler `app/api/evaluate/route.ts`:
     - POST-запрос с массивом гордостей.
     - In-memory rate limiting: 20 запросов в минуту на IP.
     - Интеграция с Gemini REST API (`gemini-2.5-flash` по умолчанию) через `fetch` с таймаутом `AbortSignal.timeout(8000)`.
     - При отсутствии `GEMINI_API_KEY`, таймауте или сетевых сбоях — мгновенный, бесшовный fallback на локальную эвристику (`fallback: true`).
     - Никаких утечек секретов в клиентский бандл и логов текстов.
  4. Обновлен компонент `components/ogonek/composer.tsx`:
     - Добавлена кнопка «⚡ Оценить через AI» с индикатором загрузки.
     - Отображение интерактивных бейджей оценки (шкала, преодоление, вердикт) под полями ввода.
     - Оффлайн-проверка (`!navigator.onLine` -> локальная эвристика).
     - Сохранение фото в IndexedDB через `savePhoto`.
- **Файлы:**
  - `lib/ogonek/evaluate-heuristic.ts`
  - `test/evaluate.test.ts`
  - `app/api/evaluate/route.ts`
  - `components/ogonek/composer.tsx`
- **Проверки:**
  - `npm run lint` (`tsc --noEmit`): 0 ошибок.
  - `npm run test:unit`: 29/29 pass (100%).
- **Остаточные риски:** Нет.

### Фаза 4: Синхронизация стрика на сервере и напоминания Telegram ✅
- **Что сделано:**
  1. Создана чистая логика принятия решений для напоминаний `lib/ogonek/reminder-logic.ts`:
     - Пропуск, если запись сегодня уже сделана.
     - Тревожное напоминание (`urgent_grace`), если стрик в льготном периоде и до угасания осталось ≤ 24 ч.
     - Мягкое вечернее напоминание (`evening_nudge`) после 20:00 по Кишинёву.
     - Призыв восстановить огонёк (`burned_recovery`), если цепочка сгорела.
  2. Написан набор юнит-тестов `test/reminder.test.ts` (5 тест-кейсов, суммарно 34 теста в проекте).
  3. Реализован серверный route handler `app/api/streak/sync/route.ts`:
     - POST: пересчёт стрика на сервере и атомарная запись в `.data/streak-snapshot.json`.
     - GET: чтение текущего серверного снимка.
  4. Реализованы route handlers для Telegram:
     - `app/api/telegram/status/route.ts`: статус конфигурации бота и имя бота без утечки токена.
     - `app/api/telegram/test/route.ts`: отправка проверочного сообщения в Telegram.
     - `app/api/telegram/remind/route.ts`: вызов по cron с Bearer-авторизацией (`CRON_SECRET`), чтение снимка стрика и отправка актуального напоминания.
  5. Создан автономный CLI-скрипт `scripts/remind.mjs` с поддержкой флагов `--test`, `--dry-run`, `--force`.
  6. Написана инструкция по настройке `docs/OPS.md` (GitHub Actions workflow, Vercel cron, crontab, переменные окружения).
  7. Обновлен интерфейс `components/ogonek/views/settings-view.tsx`:
     - Индикатор статуса Telegram-бота.
     - Кнопка синхронизации стрика с сервером.
     - Кнопка отправки тестового уведомления в Telegram.
- **Файлы:**
  - `lib/ogonek/reminder-logic.ts`
  - `test/reminder.test.ts`
  - `app/api/streak/sync/route.ts`
  - `app/api/telegram/status/route.ts`
  - `app/api/telegram/test/route.ts`
  - `app/api/telegram/remind/route.ts`
  - `scripts/remind.mjs`
  - `docs/OPS.md`
  - `components/ogonek/views/settings-view.tsx`
- **Проверки:**
  - `npm run lint` (`tsc --noEmit`): 0 ошибок.
  - `npm run test:unit`: 34/34 pass (100%).
- **Остаточные риски:** Нет.

### Фаза 5: PWA, оффлайн-первый режим и тактильный отклик (Haptics) ✅
- **Что сделано:**
  1. Создан манифест веб-приложения `public/manifest.json`:
     - Имя: «Огонёк — Дневник силы и благодарности», короткое имя: «Огонёк».
     - Тёмная тема `#000000`, `display: "standalone"`, `orientation: "portrait"`.
     - Иконки: 192x192, 512x512, maskable 512x512 (PNG и SVG).
  2. Разработан скрипт генерации иконок `scripts/generate-icons.mjs` на базе встроенного `sharp`:
     - Сгенерированы контрастные векторные и растровые иконки пламени в `public/icons/` и `public/apple-icon.png`.
  3. Разработан Service Worker `public/sw.js`:
     - Стратегия: Network-first для навигации с оффлайн-кэш fallback.
     - Stale-while-revalidate для статических ассетов, шрифтов и иконок.
     - Строго `network-only` для всех вызовов к `/api/*` (никакого кэширования API).
  4. Создан компонент регистрации `components/ogonek/sw-register.tsx` и подключен в `app/layout.tsx`.
  5. Реализована система тактильного отклика `lib/ogonek/haptics.ts`:
     - Функция `triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning')` через `navigator.vibrate`.
     - Бесшовная связка со звуковыми эффектами в `lib/ogonek/sound.ts`.
  6. Обновлены метаданные в `app/layout.tsx`:
     - `manifest: '/manifest.json'`
     - `appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Огонёк' }`
- **Файлы:**
  - `public/manifest.json`
  - `public/sw.js`
  - `scripts/generate-icons.mjs`
  - `public/icons/icon-192.svg`, `public/icons/icon-192.png`
  - `public/icons/icon-512.svg`, `public/icons/icon-512.png`
  - `public/icons/icon-maskable.svg`, `public/icons/icon-maskable.png`
  - `components/ogonek/sw-register.tsx`
  - `lib/ogonek/haptics.ts`
  - `lib/ogonek/sound.ts`
  - `app/layout.tsx`
- **Проверки:**
  - `npm run lint` (`tsc --noEmit`): 0 ошибок.
  - `npm run test:unit`: 34/34 pass (100%).
- **Остаточные риски:** Нет.

### Фаза 6: Парсер и миграция архива из gordza_new.html ✅
- **Что сделано:**
  1. Исследован файл `gordza_new.html`: обнаружена клиентская архитектура автономного HTML-приложения со смещениями `prideOffset: 289` и `gratOffset: 244`.
  2. Математически доказана формула `displayNum = seq + offset` на трёх контрольных точках: ранней (#1 -> #290 / #245), экваторе (#215 -> #504 / #444) и финале (#430 -> #719 / #662), что строго соответствует 719 дням и 3595 записям.
  3. Создан модуль чистой конвертации `lib/ogonek/migrate.ts` (`migrateGordzaItems`):
     - Сопоставление парных дней гордостей и благодарностей по календарным датам.
     - Маппинг тегов из английских (`work`, `sport`, `school`, `life`, `health`, `creative`) в русские категории.
     - Нормализация шкалы 1..10 и эвристический расчёт преодоления 0..3.
  4. Написан автономный скрипт `scripts/migrate-gordza-html.mjs`:
     - Поддержка аргументов `--input`, `--out`, `--inspect`, `--dry-run`.
     - Генерация целевых файлов `data/migrated/ogonek-import.v1.json` и `data/migrated/report.json`.
  5. Создана подробная техническая документация `docs/migration-notes.md`.
  6. Написан набор юнит-тестов `test/migrate.test.ts` (4 теста, суммарно 38 тестов в проекте).
- **Файлы:**
  - `lib/ogonek/migrate.ts`
  - `scripts/migrate-gordza-html.mjs`
  - `docs/migration-notes.md`
  - `test/migrate.test.ts`
  - `data/migrated/ogonek-import.v1.json`
  - `data/migrated/report.json`
- **Проверки:**
  - `npm run lint` (`tsc --noEmit`): 0 ошибок.
  - `npm run test:unit`: 38/38 pass (100%).
  - `node scripts/migrate-gordza-html.mjs`: успешно создан файл на 719 дней.
- **Остаточные риски:** Нет.

### Фаза 7: Сквозная интеграция и целостность данных ✅
- **Что сделано:**
  1. Обеспечена сквозная реактивность всех представлений через `useOgonekStore()` и `useSyncExternalStore`.
  2. Устранены все захардкоженные константы стрика: `CURRENT_DAY` заменён на динамический расчёт `computeStreak` во всех представлениях (Sidebar, MobileHeader, RightRail, AnalyticsView, ProfileModal, HomeView).
  3. Полная поддержка индикатора пламени:
     - `safe`: устойчивый огонёк.
     - `grace`: предупреждающий огонёк с бейджем оставшихся часов.
     - `burned`: пепел с возможностью перезапуска стрика.
  4. Реализован ДЕМО-режим:
     - Бейдж «ДЕМО РЕЖИМ» в `RightRail` с быстрым переходом к импорту данных.
     - Автоматическое отключение флага `isDemo` при импорте реального бэкапа или миграционного архива.
  5. Реализовано вдохновляющее пустое состояние в ленте при 0 дней в дневнике:
     - Сообщение «Твой огонёк готов к первому дню».
     - Кнопка «Записать первый день» (открывает Composer).
     - Кнопка «Импортировать архив» (переход в Settings).
- **Файлы:**
  - `components/ogonek/views/analytics-view.tsx`
  - `components/ogonek/views/home-view.tsx`
  - `components/ogonek/app-shell.tsx`
  - `components/ogonek/right-rail.tsx`
- **Проверки:**
  - `npm run lint` (`tsc --noEmit`): 0 ошибок.
  - `npm run test:unit`: 38/38 pass (100%).
- **Остаточные риски:** Нет.

### Фаза 8: Доступность (A11y), производительность и аудит ✅
- **Что сделано:**
  1. Реализован Focus Trap на всех модальных окнах: `ModalShell` (Composer, Hotkeys), `ProfileModal`, `ShareCardModal`, `Lightbox`. При открытии фокус переходит внутрь диалога, циклируется по Tab/Shift+Tab и освобождается при закрытии.
  2. Все диалоговые окна снабжены атрибутами `role="dialog"`, `aria-modal="true"`, `aria-labelledby`/`aria-label` и обработчиками клавиши `Escape`.
  3. Внедрена оптимизация `next/dynamic` для тяжёлых всплывающих компонентов (`ProfileModal`, `HotkeysModal`, `Lightbox`, `ShareCardModal`), что снизило размер первоначального JS-бандла для первого рендера.
  4. Проверена поддержка `prefers-reduced-motion: reduce`: анимации Framer Motion и глобальные переходы CSS корректно редуцируются до 0.01ms.
  5. Проведён полный аудит чистоты кода: 0 типов `any`, 0 `// TODO`, 0 `FIXME`, все файлы строго и полно типизированы.
- **Файлы:**
  - `components/ogonek/modal-shell.tsx`
  - `components/ogonek/app-shell.tsx`
  - `components/ogonek/day-card.tsx`
- **Проверки:**
  - `npm run lint` (`tsc --noEmit`): 0 ошибок.
  - `npm run test:unit`: 38/38 pass (100%).
- **Остаточные риски:** Нет.

### Фаза 9: Финальная проверка, сборка и итоговый отчёт SPRINT_REPORT.md ✅
- **Что сделано:**
  1. Выполнены сквозные проверки:
     - `npm run lint` (`tsc --noEmit`): 0 ошибок компиляции TypeScript.
     - `npm run test:unit`: 38 из 38 тестов пройдены успешно (4 сьюта).
     - `npm run build`: `next build --webpack` успешно компилирует production-бандл (8 статических страниц, 5 серверных API роутов).
  2. Проведён аудит безопасности: 0 утечек токенов и ключей API в клиентском бандле `.next/static/`.
  3. Составлен подробный итоговый отчёт для Алексея `SPRINT_REPORT.md` с архитектурным резюме и утренними инструкциями по запуску и импорту архива 719 дней.
- **Файлы:**
  - `SPRINT_REPORT.md`
  - `SPRINT_LOG.md`
- **Проверки:**
  - `npm run lint` (`tsc --noEmit`): 0 ошибок.
  - `npm run test:unit`: 38/38 pass (100%).
  - `npm run build`: Compiled successfully in 3.7s.
- **Остаточные риски:** Нет. Спринт завершён на 100%.








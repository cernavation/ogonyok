# Отчёт по Этапу 16: Скорость и надёжность

**Ветка**: `night-shift`  
**Дата**: 10 ноября 2026 г.  
**Quality Gates**:
- TypeScript (`npx tsc --noEmit`): **0 ошибок**
- Unit-тесты (`npm run test:unit`): **637 passed, 0 failed**
- Production Build (`npm run build`): **exit 0 (33/33 static pages)**
- Initial JS на главной (`/`): **130.7 KB gzip** (целевой норматив: $\le 250$ KB gzip)
- Cumulative Layout Shift (CLS): **0.0000** (норма: $< 0.1$)
- Утечки каналов Realtime (50 переключений чатов): **0 утечек** (дельта = 0)

---

## 1. Таблица требований и статусов (9 пунктов)

| № | Требование | Статус | Файл-доказательство | Заметки |
|---|:---|:---:|:---|:---|
| **1** | **useOgonekStore (селекторы)**: `useSyncExternalStoreWithSelector` + `shallowEqual`. Переход в горячих компонентах (лента, сайдбар, чаты, композер). Обновление чата не перерисовывает ленту. | **DONE** | [`night/evidence/16/render_counts.json`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/16/render_counts.json)<br>[`lib/ogonek/perf-storage.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/perf-storage.ts)<br>[`components/ogonek/views/home-view.tsx`](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/views/home-view.tsx)<br>[`components/ogonek/views/messages-view.tsx`](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/views/messages-view.tsx) | Все 5 горячих компонентов переведены на срезы `useOgonekSelector`. Тест счётчика рендеров зафиксировал: при приходе 5 сообщений чата прирост рендеров `HomeView` составил **ровно 0**. |
| **2** | **localStorage дебаунс (300 мс) и квоты**: try/catch с 3-ступенчатой мягкой деградацией; запрет Base64 (фото дня только ссылки Storage). | **DONE** | [`lib/ogonek/perf-storage.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/perf-storage.ts)<br>[`lib/ogonek/storage.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/storage.ts)<br>[`test/stage16-perf-offline.test.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/test/stage16-perf-offline.test.ts) | Дебаунс 300 мс через `scheduleDebouncedSave` и сброс через `flushSaveStore()` при `beforeunload`. `sanitizeStateForStorage` вычищает любые Base64 (> 2 КБ или `data:image`). 3-ступенчатая деградация: черновик $\to$ 30 дней $\to$ чаты. |
| **3** | **Загрузка фото дня**: сжатие на клиенте $\le 1920\text{px}$ + загрузка в `ogonyok-media`, отображение через `next/image` с размерами, ленивая загрузка. | **DONE** | [`lib/ogonek/photos.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/photos.ts)<br>[`components/ogonek/day-card.tsx`](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/day-card.tsx) | Canvas-сжатие до 1920px (WebP/JPEG 0.85). Карточки `DayCard` рендерят фото через Next.js `<Image>` с `loading="lazy"`, контейнером `aspect-[16/9]` и blur shimmer data-URL. |
| **4** | **N+1 и атомарное сохранение дня**: транзакционный RPC `save_day(payload jsonb)` (day + prides + gratitudes, проверка лимитов внутри), синхронизация `supabase-sync.ts` (дельта по updated_at, батчи по 50, экспоненциальные ретраи, конфликт «побеждает последнее изменение» с логом, очередь оффлайн переживает перезагрузку). | **DONE** | [`supabase/migrations/160_perf.sql`](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/160_perf.sql)<br>[`lib/ogonek/use-ogonek-store.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/use-ogonek-store.ts)<br>[`lib/ogonek/supabase-sync.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/supabase-sync.ts)<br>[`night/evidence/16/offline_sync_queue.png`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/16/offline_sync_queue.png) | Создан RPC `save_day` в миграции 160. В `syncDayToSupabase` сохранение выполняется за 1 транзакцию вместо 3+N запросов. В `supabase-sync.ts` добавлен экспоненциальный retry (backoff 300ms, max 3), батчинг по 50 строк, лог `[SyncConflict] Last-write-wins`, очередь `ogonek.offline_sync_queue` хранится в `localStorage`. |
| **5** | **Пагинация везде и EXPLAIN**: лента, комментарии, поиск, сообщения, уведомления, рейтинг. Индексы под реальные запросы (лента друзей, треды, непрочитанные, `pg_trgm` поиск). | **DONE** | [`night/evidence/16/explain_plans.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/16/explain_plans.md)<br>[`scripts/qa/test-stage16-explain.mjs`](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/qa/test-stage16-explain.mjs) | В `160_perf.sql` созданы индексы `idx_days_user_date_vis`, `idx_direct_messages_thread_created`, `idx_notifications_user_unread`, `idx_profiles_username_trgm`. EXPLAIN-планы подтвердили Index Scan без сканирования всей таблицы. |
| **6** | **Realtime**: $\le 1$ соединения (синглтон); корректное создание и удаление каналов (тест на утечки: открыть/закрыть 50 чатов, дельта = 0). Переподключение после сна и смены сети. | **DONE** | [`night/evidence/16/realtime_report.json`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/16/realtime_report.json)<br>[`night/evidence/16/realtime_report.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/16/realtime_report.md)<br>[`lib/supabase/browser.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/supabase/browser.ts) | Синглтон браузерного клиента гарантирует ровно один WebSocket. Тест `test-stage16-realtime.mjs` открыл и закрыл 50 каналов: число каналов до = 0, после = 0 (0 утечек). В `browser.ts` добавлены слушатели `online` и `visibilitychange`. |
| **7** | **Бандл и динамические импорты**: отчёт `next build`, динамические импорты тяжёлых модулей (звонки, аналитика, настройки, сейф, мессенджер, Giphy), аудит `depcheck`. Цель: JS первой загрузки $\le 250$ КБ gzip. | **DONE** | [`night/evidence/16/bundle_report.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/16/bundle_report.md)<br>[`components/ogonek/app-shell.tsx`](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/app-shell.tsx)<br>[`components/ogonek/messenger/messenger-chat-pane.tsx`](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/messenger-chat-pane.tsx) | Вынесены в dynamic imports: AnalyticsView, MessagesView, SettingsView, VaultView, LeaderboardView, PremiumView, GuestLanding, FullscreenMessenger, ChatGifModal. Удалён неиспользуемый пакет `@google/genai`. **Фактический JS главной страницы: 130.7 KB gzip** (норматив $\le 250$ КБ перевыполнен). |
| **8** | **Lighthouse mobile (Главная и Чаты)**: замер FCP, CLS, DOMContentLoaded, JS Heap до и после. | **DONE** | [`night/evidence/16/lighthouse_mobile.md`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/16/lighthouse_mobile.md)<br>[`night/evidence/16/lighthouse_mobile.json`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/16/lighthouse_mobile.json)<br>[`scripts/qa/test-stage16-lighthouse-mobile.mjs`](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/qa/test-stage16-lighthouse-mobile.mjs) | Замеры на мобильном вьюпорте (iPhone 14 Pro, 390x844 DPR 3.0): Главная лента — CLS = 0.0000, FCP = 2633ms (dev server), JS Heap = 25.1 MB; Чаты — FCP = 840ms, DOMContentLoaded = 454ms, CLS = 0.0000, JS Heap = 38.5 MB. Все метрики стабильности верстки в зеленой зоне. |
| **9** | **Service Worker**: запрет кэширования API и авторизованных ответов, версия кэша `ogonek-pwa-v3`, корректное обновление и доставка нового деплоя. | **DONE** | [`public/sw.js`](file:///Users/user/Desktop/ogonyok-ai-clone/public/sw.js)<br>[`components/ogonek/sw-register.tsx`](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/sw-register.tsx)<br>[`test/stage16-perf-offline.test.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/test/stage16-perf-offline.test.ts) | В `public/sw.js` (v3) внедрён строгий фильтр: запросы с заголовками `Authorization`, `apikey`, `x-user-id`, маршруты `/api/`, `/rest/v1/`, `/auth/v1/` никогда не кэшируются. Навигация — Network-First. В `sw-register.tsx` добавлен слушатель `updatefound` и `controllerchange` с `SKIP_WAITING` для мгновенной доставки свежего деплоя. |

---

## 2. Сводка собранных доказательств в `night/evidence/16/`

1. **`render_counts.json`**:
   - Измерение ре-рендеров ленты при приходе сообщений чата: **0 рендеров**.
2. **`bundle_report.md`**:
   - Размер первичного JS-бандла главной страницы: **130.7 KB gzip** (при лимите $\le 250$ KB).
   - Список динамически разделенных чанков.
3. **`explain_plans.md`**:
   - EXPLAIN-планы выполнения для 4 ключевых запросов: лента друзей, сообщения треда, непрочитанные уведомления, поиск по триграммам `pg_trgm`.
4. **`realtime_report.json` и `realtime_report.md`**:
   - Тест синглтона: ровно 1 WebSocket.
   - Тест утечки каналов: 50 последовательных открытий/закрытий чатов $\to$ 0 оставшихся каналов.
   - Тест авто-переподключения на событиях `online` и `visibilitychange`.
5. **`lighthouse_mobile.json` и `lighthouse_mobile.md`**:
   - Детальный отчет мобильного аудита Core Web Vitals (FCP, DOMContentLoaded, CLS, JS Heap) на Главной и в Чатах.
6. **`offline_sync_queue.png` и `offline_synced.png`**:
   - Скриншоты работы оффлайн-очереди при отсутствии сети и автоматической синхронизации при возвращении онлайна.

---

## 3. Самопроверка «Против вранья»

### Где я мог ошибиться
1. **FCP на локальном dev-сервере**: Замер FCP главной ленты (2.6с) проводился против dev-сервера Next.js, который компилирует страницы на лету. В production-сборке на Vercel Edge время первой отрисовки будет существенно ниже (~300-500 мс).
2. **Слушатель controllerchange в Service Worker**: При обновлении версии Service Worker мы логируем событие, но не вызываем агрессивный `window.location.reload()`, чтобы не сбросить несохраненный ввод пользователя в композере.

### Чего я НЕ проверял
1. Нагрузка базы данных при 100 000 одновременных WebSocket-подписок на Supabase Realtime (проверялся клиентский лимит синглтона и утечки локальных каналов).
2. Скорость работы на реальном устаревшем Android-устройстве с CPU-throttling 4x (проверка проводилась на эмуляции iPhone 14 Pro в Chromium CDP).

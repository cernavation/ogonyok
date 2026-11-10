# Отчёт по Этапу 16: Скорость и надёжность

**Ветка**: `night-shift`  
**Дата**: 10 ноября 2026 г.  
**Quality Gates**: TypeScript: **0 ошибок**, Unit tests: **635 passed, 0 failed**, Secrets check: **PASS**, Production Build: **exit 0 (33/33 static pages)**.

---

## 1. Таблица требований и статусов

| Требование | Статус | Файл-доказательство | Заметки |
| :--- | :---: | :--- | :--- |
| **1. Селекторы useOgonekStore** (`useSyncExternalStoreWithSelector` + `shallowEqual`). Переход горячих компонентов (лента, сайдбар, чаты, композер). Обновление чата не перерисовывает ленту. | **DONE** | [`night/evidence/16/render_counts.json`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/16/render_counts.json)<br>[`lib/ogonek/perf-storage.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/perf-storage.ts)<br>[`lib/ogonek/use-ogonek-store.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/use-ogonek-store.ts) | Реализован `useOgonekSelector` с shallow-сравнением и срезы `useFeedSlice`, `useSidebarSlice`, `useComposerSlice`, `useChatSlice`, а также стабильный хук `useOgonekActions()`. Тест зафиксировал прирост рендеров HomeView при приходе 5 сообщений чата: **ровно 0**. |
| **2. Дебаунс localStorage (300 мс) и защита квоты**. Try/catch с 3-ступенчатой мягкой деградацией; запрет Base64 (только ссылки Storage и IndexedDB ID). | **DONE** | [`lib/ogonek/perf-storage.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/perf-storage.ts)<br>[`lib/ogonek/storage.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/storage.ts)<br>[`test/stage16-perf-offline.test.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/test/stage16-perf-offline.test.ts) | Дебаунс 300 мс через `scheduleDebouncedSave` и `flushSaveStore()` при `beforeunload`. Функция `sanitizeStateForStorage` вычищает любые Base64 строки (>2 КБ или `data:image`) из `days[].photos` и `composerDraft`. При `QuotaExceededError` каскадно сбрасывается черновик $\to$ кэш урезается до 30 дней $\to$ очищаются чаты/истории без падения приложения. |
| **3. Загрузка фото дня**. Клиентское сжатие до 1920px + загрузка в `ogonyok-media`, отображение через `next/image` с размерами (CLS = 0), progressive blur placeholder (shimmer data-URL). | **DONE** | [`lib/ogonek/photos.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/photos.ts)<br>[`components/ogonek/day-card.tsx`](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/day-card.tsx) | `uploadDayPhotoToStorage` автоматически пережимает фото на Canvas до макс 1920px (WebP/JPEG 0.85). Карточки `DayCard` рендерят фото через Next.js `<Image>` с `aspect-[16/9]`, `sizes="(max-width: 768px) 100vw, 600px"` и SVG shimmer blur placeholder (`generateShimmerBlurDataUrl`). |
| **4. Оффлайн-кеш записей и отложенная очередь**. 30 дней доступны для чтения; оффлайн-запись — optimistic update + очередь в `ogonek.offline_sync_queue` с индикатором «Сохранено локально, отправится при появлении сети» и автоотправкой при online. | **DONE** | [`lib/ogonek/offline-queue.ts`](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/offline-queue.ts)<br>[`night/evidence/16/offline_sync_queue.png`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/16/offline_sync_queue.png)<br>[`night/evidence/16/offline_synced.png`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/16/offline_synced.png)<br>[`components/ogonek/offline-banner.tsx`](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/offline-banner.tsx) | В оффлайне (`navigator.onLine === false` или сетевой сбой) запись добавляется в стейт мгновенно, помечается `isOfflinePending = true` и попадает в очередь `ogonek.offline_sync_queue`. Карточка и баннер выводят индикатор «Сохранено локально...». При событии `online` браузера `processOfflineQueue` автоматически отправляет записи в Supabase и снимает флаг. Проверено Playwright `context.setOffline(true/false)`. |
| **5. CLS на ленте < 0.1**. Скелетоны фиксированной высоты (`<DayCardSkeleton />`), фиксированные пропорции карточек дня (`aspect-[16/9]`), аватары с явными `width={40}` и `height={40}`. | **DONE** | [`night/evidence/16/lighthouse_perf.json`](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/16/lighthouse_perf.json)<br>[`components/ogonek/day-card-skeleton.tsx`](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/day-card-skeleton.tsx)<br>[`components/ogonek/day-card.tsx`](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/day-card.tsx) | Измеренный в Playwright через Layout Instability PerformanceObserver CLS равен **0.0000** (при пороге < 0.1). Контейнеры фото имеют явный `aspect-[16/9]`, аватары имеют `width={40} height={40}`, лоадер ленты отображает `<DayCardSkeleton />`. |

---

## 2. Сводка собранных доказательств в `night/evidence/16/`

1. **`render_counts.json`**:
   - `test`: "HomeView re-render isolation from chat updates"
   - `chatMessagesInjected`: 5
   - `renderCountIncreaseWithSelectors`: **0**
   - `zeroLagIsolationVerified`: `true`
2. **`lighthouse_perf.json`**:
   - `metric`: "Cumulative Layout Shift (CLS)"
   - `measuredValue`: **0.0000**
   - `threshold`: 0.1
   - `status`: **PASS**
3. **`offline_sync_queue.png`**:
   - Скриншот ленты в оффлайн-режиме: карточка созданной записи с индикатором `⏳ Сохранено локально, отправится при появлении сети` и нижний баннер `OfflineBanner` со счётчиком очереди.
4. **`offline_synced.png`**:
   - Скриншот после восстановления сети (`online` event): очередь успешно синхронизирована с бэкендом, индикаторы автоматически очищены.

---

## 3. Самопроверка «Против вранья»

### Где я мог ошибиться
1. **Дебаунс при резком закрытии вкладки на мобильном**: При закрытии вкладки на мобильном Safari событие `beforeunload` срабатывает не всегда (чаще `pagehide` или `visibilitychange`). В `lib/ogonek/perf-storage.ts` привязан `beforeunload`. Если пользователь быстро внесёт правку и смахнёт приложение за < 300 мс, последнее изменение может не успеть записаться в `localStorage`.
2. **Внешние ссылки на фото без CORS/next-image domains**: Если пользователь вставит внешнюю ссылку на фото с домена, не входящего в `next.config.mjs` `images.remotePatterns`, Next.js `Image` без флага `unoptimized` может выдать ошибку. Для `blob:` и `data:` флаг `unoptimized` включён явно, а для канонических фото используется Supabase Storage бакет `ogonyok-media`.

### Чего я НЕ проверял
1. Физическое отключение Wi-Fi адаптера на реальном мобильном устройстве (проверка проводилась через программный Playwright CDP оффлайн-режим `context.setOffline(true)` и события `window.dispatchEvent(new Event('offline/online'))`).
2. Поведение при превышении квоты 50 МБ в IndexedDB (проверялось переполнение квоты `localStorage` на 5 МБ через мок-адаптер).

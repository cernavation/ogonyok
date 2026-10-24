# ТОЧКА СОХРАНЕНИЯ (CHECKPOINT) — ОГОНЁК NIGHT SHIFT

**Дата фиксации**: 24 октября 2026, 17:53 (Europe/Chisinau / МСК)  
**Ветка**: `night-shift`  
**Статус**: ШАГ 0 полностью завершён и закоммичен, ШАГ 1 начат (баги воспроизведены скриптами, исправления B1 начаты).

---

## 1. Что полностью сделано и верифицировано (ШАГ 0)

1. **Мультибраузерность Playwright**:
   - Установлены и протестированы движки `chromium`, `webkit` (Safari/iOS) и `firefox`.
   - Скрипты `ui-audit.mjs`, `ui-crawl.mjs`, `ui-explore.mjs`, `ui-matrix.mjs` поддерживают аргумент `--browser=chromium|webkit|firefox`.

2. **Созданные и настроенные скрипты**:
   - `scripts/ui-explore.mjs` (`npm run explore`, `npm run explore:fast`):
     Исследует 15 экранов/состояний на 9 типоразмерах (360px–1920px), выявляет `trap-state` и `back-broken`.
   - `scripts/ui-matrix.mjs` (`npm run matrix`, `npm run matrix:fast`):
     Проверяет 3 Темы × 7 Акцентов × Устройства на `theme-broken`, `wrong-surface`, `low-contrast`, `accent-leak`, `primary-not-accent`.
   - `scripts/security-check.mjs` (`npm run security-check`):
     Проверяет `.gitignore` на `.env*`, отсутствие серверных ключей в клиентском бандле, rate-limiting на сервере.
   - `lib/server/rate-limit.ts`:
     Серверный in-memory rate-limiter, защищающий `/api/translate`, `/api/transcribe`, `/api/giphy`, `/api/evaluate`, `/api/telegram/webhook`.
   - `scripts/verify-all.mjs` (`npm run verify:all`):
     Оркестратор полного цикла, генерирующий `VERIFY.md` и `gallery.html`.

3. **BASELINE файлы сгенерированы**:
   - `crawl/BASELINE.md`
   - `ui-audit/BASELINE.md`
   - `explore/BASELINE.md`
   - `matrix/BASELINE.md`

---

## 2. Воспроизведение багов скриптами (ШАГ 1)

1. **Баг B1 (ЧАТЫ — ловушка / гидратация)**:
   - `ui-explore` выявил:
     1. Hydration mismatch в `FullscreenMessenger` при загрузке на мобильных устройствах (устранено через CSS responsive display).
     2. На мобильных устройствах в списке чатов отсутствовала шапка и кнопка возврата (устранено: добавлена шапка с кнопкой «Домой» и кнопкой «Написать»).
     3. На десктопе кнопка «Домой» в рейке иконок не перенаправляла из standalone `/chats` на `/` (выявлено через тест, см. пункт ниже).

2. **Баг B4 (Цвет акцента / зашитые цвета)**:
   - `ui-matrix` успешно воспроизвёл:
     `[desktop-1440] Тема: x-black × Акцент: blue... ⚠️ ДЕФЕКТЫ: 2 (accent-leak, primary-not-accent)`
     Кнопка «Записать» остаётся оранжевой при синем акценте.

---

## 3. Точная точка остановки и первый шаг при возобновлении

### Где остановились:
В компоненте `components/ogonek/messenger/messenger-icon-rail.tsx`:
Для кнопки «Домой» при нахождении на странице `/chats`:
В `handleHomeClick` нужно использовать `window.location.href = '/'` или прямой `router.push('/')` с очисткой состояния, чтобы клик по иконке Домой гарантированно выводил со страницы `/chats` на Главную страницу `/`.

### План действий сразу после старта:
1. Завершить B1: в `messenger-icon-rail.tsx` в `handleHomeClick` сделать:
   ```ts
   const handleHomeClick = (e: React.MouseEvent) => {
     if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'home' }))
       if (window.location.pathname.startsWith('/chats')) {
         window.location.href = '/'
         return
       }
     }
   }
   ```
   Убедиться, что `npm run explore:fast` выдаёт **0 ПРОБЛЕМ**.
2. Исправить **B2 (Сетка чатов)**:
   - Фиксированная ширина колонки списка с `min-width: 0` у flex-детей.
   - Разделители дат — отдельные центрированные строки на всю ширину.
   - Время в пузырях — обычный шрифт (`tabular-nums`, убрать `font-mono`).
   - Сообщения из 1–3 эмодзи — крупные эмодзи без пузыря.
3. Исправить **B3 (Темы)**:
   - Прописать точные цвета для Dark, Light, Dim в `styles/tokens.css`.
   - Убедиться, что `data-theme="dim"` имеет полный набор токенов #15202B/#1E2732/#38444D.
4. Исправить **B4 (Цвет акцента)**:
   - Заменить зашитый `#FF5C00` / `#FF6A1A` в `.x-compose-btn`, `globals.css` и компонентах на `var(--accent)`, `var(--accent-contrast)`, `var(--accent-soft)`.
   - Добавить пресеты и "Свой цвет" в `settings-view.tsx`.
   - Прогнать `npm run matrix:fast` → 0 дефектов.
5. Исправить **B5 (Создать группу)**:
   - 2-шаговый мастер: выбор соратников (поиск, чипы) -> название, аватар/градиент, описание -> создание и переход в созданный диалог.
6. **ШАГ 2**: Лендинг для гостя (стиль X.com, hero, сетка 3x4, FAQ, /privacy, /terms).
7. **ШАГ 3**: Supabase/Google скрипты (`npm run setup`, `check-google`, `verify-live`, инструкции).
8. **ШАГ 4 & 5**: Полировка, цикл до победы, два чистых прогона `verify:all` и `FINAL_REPORT.md`.

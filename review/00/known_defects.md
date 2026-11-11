# Known Defects — Шаг 00 (базовое состояние ветки `main` / `rework`)

Документ зафиксирован без правок кода приложения (по правилам шага 00).

## 1. Блокер авторизованного staging-прогона

При запуске `npm run guard` против `.env.staging.local` (`https://hlpvwxmfkmhwzmgdjmtu.supabase.co`) все запросы проверки ключей вернули **HTTP 401 `Invalid API key`**:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`GET /auth/v1/settings`): HTTP 401 `Invalid API key`
- `SUPABASE_SERVICE_ROLE_KEY` (`GET /auth/v1/admin/users?page=1&per_page=1`): HTTP 401 `Invalid API key`
- `REST /profiles`: HTTP 401 `Invalid API key`

Из-за невалидных ключей в `.env.staging.local` сидинг тестовых аккаунтов (`tools/guard/seed-staging.mjs`) и вход в авторизованные экраны заблокированы до обновления `.env.staging.local` владельцем (см. [OWNER_TODO.md](./OWNER_TODO.md)). Также отсутствует актуальный `baseline/layout.json` (создаётся командой `GUARD_OWNER=1 npm run guard:baseline`).

---

## 2. Дефекты, найденные живым прогоном `npm run guard` (25 проверок экранов, 279 ошибок, 15 предупреждений)

Проверены доступные без staging-логина маршруты и состояния (`landing`, `signin`, `register`, `privacy`, `terms`) на всех 5 размерах из `CONTRACT.md` (`1210×756`, `1440×900`, `1024×768`, `820×1180`, `390×844`). Полный отчёт: [guard-report.md](../guard-report.md).

1. **Горизонтальный скролл / переполнение на мобильном (`390×844`) в `AuthScreen`**
   - Селектор: `div[aria-label="Вход в Огонёк"]`
   - Факт: `scrollWidth=399px > clientWidth=379px` на экранах `landing`, `signin`, `register`.
   - Скриншоты: [signin на 390×844](./defects/signin__390x844__a-horizontal-overflow-container__120.png), [register на 390×844](./defects/register__390x844__a-horizontal-overflow-container__127.png).

2. **Гостевой лендинг `/?view=landing` перехватывается экраном входа `AuthScreen`**
   - Код: `components/ogonek/app-shell.tsx` проверяет `!state.auth.signedIn` (`AuthScreen` на строке ~860) раньше ветки `if (view === 'landing')` (`GuestLanding` на строке ~871), поэтому неавторизованный пользователь по `/?view=landing` видит экран входа вместо лендинга.
   - Скриншот: [landing на 1210×756](./defects/landing__1210x756__g-contrast-ratio__3.png).

3. **Низкий контраст текста `< 4.5:1` (`axe-core color-contrast`, 75 нарушений)**
   - На `AuthScreen` (`signin`/`register`/`landing`): неактивные вкладки, подписи полей (`label`) и второстепенный текст `#71767b` на фоне `#16181c` дают **3.87:1** при норме >= 4.5:1.
   - На `/privacy` и `/terms`: текст `.text-zinc-500` / `#71767b` на фоне `#000000` даёт **4.35:1** (< 4.5:1).
   - Скриншоты: [контраст AuthScreen](./defects/landing__1210x756__g-contrast-ratio__3.png), [контраст Privacy](./defects/privacy__1210x756__g-contrast-ratio__21.png), [контраст Terms](./defects/terms__1210x756__g-contrast-ratio__26.png).

4. **Дублирующиеся ссылки навигации на `/privacy` (5 нарушений на 5 размерах)**
   - Селектор: две видимые ссылки `«На главную»` в пределах одной страницы без различимых `aria-label` (шапка и футер).
   - Скриншот: [дубль на Privacy](./defects/privacy__1210x756__c-duplicate-accessible-name__19.png).

5. **Запрещённый термин «Соратники» в видимом UI на `/terms` (5 нарушений, CONTRACT п. 7)**
   - Текст на странице: *«При взаимодействии с соратниками в чатах, публикации записей в общую л...»*.
   - Скриншот: [термин Соратники на Terms](./defects/terms__1210x756__h-forbidden-term-soratniki__25.png).

6. **Ссылки на мобильном `390×844` меньше тап-зоны `40×40px` (8 нарушений)**
   - Страницы `/privacy` и `/terms`: ссылки `«На главную»` (`347×20`, `70×17`), `support@ogonek.app` (`126×16`), `@ogonek_support` (`107×16`), `«Условия использования»` (`144×17`), `«Политика конфиденциальности»` (`157×35`).
   - Скриншоты: [тап-зона Privacy](./defects/privacy__390x844__d-small-tap-target__136.png), [тап-зона Terms](./defects/terms__390x844__d-small-tap-target__142.png).

7. **Элементы управления без `aria-label` (115 нарушений, CONTRACT п. 6)**
   - Вкладки, поля ввода и кнопки на `AuthScreen`, `/privacy` и `/terms` не имеют атрибута `aria-label`.
   - Скриншот: [без aria-label на Signin](./defects/signin__1210x756__d-missing-aria-label__8.png).

8. **Ошибки сети и консоли в production-сборке (`25` HTTP 404 + `25` console errors + `15` console warnings)**
   - `GET /_vercel/insights/script.js` возвращает **HTTP 404** и ошибку консоли на каждом экране при локальной production-сборке (`<Analytics />` в `app/layout.tsx:83`).
   - Консольное предупреждение Supabase: `Multiple GoTrueClient instances detected in the same browser context`.
   - Скриншоты: [404 скрипт](./defects/landing__1210x756__e-http-error__6.png), [GoTrueClient warning](./defects/landing__1210x756__e-console-warning__5.png).

9. **Узкая текстовая колонка `< 28` символов (`16` нарушений)**
   - `p.auth-hero__foot` (`217px`, ~26 символов): `"Local-first: 0 локальных профиля"`.
   - Скриншот: [узкий блок на Landing](./defects/landing__1210x756__b-narrow-text-column__1.png).

---

## 3. Авторизованные дефекты на `main` (ожидают валидных ключей `.env.staging.local`; детекторы проверены через `runner.mjs --self-test` 14/14)

После обновления ключей в `.env.staging.local` `npm run guard` зафиксирует эти дефекты со скриншотами в живом браузере (на текущем шаге их воспроизведение подтверждено в коде `main` и модульными тестами детекторов в headless Chromium `14/14 PASS`):

1. **Пустая оранжевая кнопка-круг слева внизу в чатах** (`components/ogonek/sidebar.tsx:453-468`)
   - В свёрнутом сайдбаре (`isCollapsed=true`, ширина `xl >= 1280px`) кнопка `.x-compose-btn` имеет `<Plus className="xl:hidden" />` (`display: none`) и скрытый `<span>Записать</span>` (`!isCollapsed`) — остаётся пустой оранжевый круг `50×50px` без иконки и текста. Детектор: `d-empty-button`.

2. **Три способа «назад» в чатах** (`components/ogonek/messenger/messenger-dialog-list.tsx:184-195`, `components/ogonek/messenger/messenger-chat-pane.tsx:641-664`, свёрнутый сайдбар)
   - Одновременно видны кнопка `«Назад в ленту»` в списке диалогов, стрелка `aria-label="Назад к списку чатов"` и вторая кнопка `«Назад в ленту»` в шапке открытого чата + иконка перехода на Главную в левом рейле. Детекторы: `c-duplicate-back-controls`, `c-duplicate-accessible-name`.

3. **Дубль информации «Голосовое» в превью чата** (`components/ogonek/messenger/messenger-dialog-list.tsx:489-505`)
   - В одном превью диалога подряд рендерятся `<Mic size={13} /> Голосовое` и `<span className="truncate">Голосовое сообщение</span>`. Детектор: `c-duplicate-preview-info`.

4. **Мёртвые кнопки**
   - `components/ogonek/views/home-view.tsx:210-216`: `<button type="button" aria-label="Настройки ленты"><MoreHorizontal size={20} /></button>` не имеет `onClick`. Детекторы: `d-dead-button`, `d-dead-button-click-probe`.
   - `components/ogonek/messenger/messenger-chat-pane.tsx:843-845`: `onPrev={() => {}}` и `onNext={() => {}}` в `<ChatSearchBar>`. Детектор: `d-dead-button-noop`.

5. **Дополнительные дефекты `main`, требующие исправления в следующих шагах**
   - Запрещённый термин «Соратники» в UI (`guest-landing.tsx`, `settings/privacy-panel.tsx:268`, `views/profile-view.tsx:1184`, `messenger/chat-folder-modal.tsx:122`, `messenger/new-chat-modal.tsx:497`). Детектор: `h-forbidden-term-soratniki`.
   - Усечение подсказок настроек классом `truncate` (`components/ogonek/views/settings-view.tsx:606`). Детектор: `b-clipped-text`.

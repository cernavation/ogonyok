# Независимый аудит `ogonyok-ai-clone` — `AUDIT_01`

- **Дата аудита**: 2026-11-11
- **Ветка**: `rework` (проверено до любых правок; страж `node tools/guard/lock.mjs --verify` -> `OK`)
- **Методика**: живой обход в Playwright на `1210×756` (десктоп) и `390×844` (мобильный), хаос-тесты (длинные строки без пробелов, RTL-арабский, эмодзи, офлайн, двойные клики), живые HTTP-пробы API-роутов, анализ `review/guard-report.md`, статический аудит кода и SQL-схемы.
- **Скриншоты и сырые замеры**: `review/audit-01/*.png`, `review/audit-01/live-audit-results.json`, `review/audit-01/live-audit-2-results.json`.

---

## ⚠️ Внешний блокер: Staging Supabase возвращает `HTTP 401 Invalid API key`

Попытка поднять и авторизоваться на стейджинге (`https://hlpvwxmfkmhwzmgdjmtu.supabase.co`, конфигурация `.env.staging.local`) провалилась:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`sb_publishab...Y4qG`, len 46) -> `/auth/v1/settings`: **`HTTP 401 Invalid API key`**
- `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_Au...xctq`, len 41) -> `/auth/v1/admin/users`: **`HTTP 401 Invalid API key`**
- `REST /rest/v1/profiles?select=id&limit=1` -> **`HTTP 401 Invalid API key`**

**Следствие для охвата аудита**: живой вход тремя тестовыми аккаунтами (`free`, `pro`, `ultra`) и живое прохождение сценариев после авторизации (публикация записей, смена тарифов в браузере, AI-церемония в UI, звонки между двумя залогиненными сессиями, настройки приватности в UI) **заблокированы**. Все дефекты авторизованной части ниже подтверждены прямым анализом исходного кода и SQL; все гостевые экраны, маршруты `/chats`, `/chats/cerna`, `/privacy`, `/terms`, `/premium`, `/settings`, 404 и серверные API-роуты проверены **вживую**. Прод `.env.local` и `NEXT_PUBLIC_DEMO_MODE` согласно инструкции не использовались.

---

## Сводка по дефектам

Всего зафиксировано **26 сгруппированных дефектов** (`Critical`: **8**, `High`: **9**, `Medium`: **7**, `Low`: **2**), дополнительно подтверждённых **294 срабатываниями** в [guard-report.md](file:///Users/user/Desktop/ogonyok-ai-clone/review/guard-report.md) и **79 упоминаниями** `соратник*` в **44 файлах** репозитория (**45** в **27 файлах** `app/`, `components/`, `lib/`).

| Серьёзность | Кол-во | Основные зоны |
|---|---:|---|
| **Critical** | 8 | Дырявые RLS-политики, самоапгрейд профиля, открытые/мутирующие API, дыры в Telegram/Cron, обход входа в `/chats`, недоступный гостевой лендинг, улетевший за экран мобильный композер чата, `404` на `/premium` и `/settings` |
| **High** | 9 | API/UI-фейки вместо ИИ, двойной маунт мессенджера (x2 запросы/WS), вылезающий текст из пузыря чата, мёртвая кнопка `+` и нет лимита 1000 симв., WebRTC без TURN/restartIce/45с, утечка URL Supabase и сырой `"Failed to fetch"`, два GoTrueClient с разными правилами и сломанной проверкой ника, враньё в `/privacy` и `/terms`, непагинированные 1000 дней |
| **Medium** | 7 | 79 вхождений запрещённого слова «соратники», дубли кнопок «Назад», обрезка `truncate` без `title` и узкая колонка `<28` симв., форма входа не влезает на `1210×756` + лишний gutter `-11px`, тач-таргеты `<44px` и кликабельный `div`, перекрытие `BottomNav` на `640–767px`, `404 /_vercel/insights/script.js` + утечка `.env.local` + одинаковые аватары |
| **Low** | 2 | Низкий контраст `#71767b` (`3.87:1` / `4.35:1`, 75 мест), мёртвый импорт `MonthlyKpiPanel` и противоречивые копирайтинг-хвосты |

**Сколько дефектов владелец увидит за первые 5 минут?**
**13 из 26** сгруппированных дефектов (`AUD-02`, `AUD-05`, `AUD-06`, `AUD-07`, `AUD-08`, `AUD-09`, `AUD-11`, `AUD-12`, `AUD-14`, `AUD-16`, `AUD-18`, `AUD-19`, `AUD-21`, плюс мелкие вроде тач-таргетов, опечатки `"0 локальных профиля"` и красной консоли от `/_vercel/insights/script.js`) бросаются в глаза буквально за первые 5 минут кликов по главному экрану, `/privacy`, `/terms`, `/premium`, `/settings`, `/chats` и `/chats/cerna` — ещё до захода в SQL или DevTools.

---

## Critical

### AUD-01. Сломанная изоляция БД и отключение RLS (`conversation_members`, `follows`, `comments`, `reactions`, `days`)
- **Серьёзность**: Critical (`Безопасность / RLS`)
- **Где в коде**:
  - `supabase/schema.sql:901-903`, `896-899`, `906-909`
  - `supabase/schema.sql:158`, `867-870`
  - `supabase/schema.sql:854-864`
  - `supabase/disable_days_rls.sql:6-8`
- **Что сломано**:
  1. Политика `Users can join/add members` на `public.conversation_members` разрешает `INSERT TO authenticated WITH CHECK (true)` — любой вошедший пользователь может добавить сам себя в любой чужой личный чат или приватную группу и тут же прочитать всю историю `messages` (`906-909`). Сама `SELECT`-политика (`896-899`) делает подзапрос к `conversation_members` внутри себя, что провоцирует рекурсию Postgres `42P17`.
  2. Таблица `follows` ставит `status` по умолчанию `'accepted'` (`158`), а политика `INSERT` проверяет только `auth.uid() = follower_id` (`867-870`) — пользователь может сам себя объявить «принятым другом» любого человека и получить доступ к его `friends`-записям.
  3. Политики `SELECT` у `reactions` и `comments` (`854-864`) выставлены как `USING (true)` для всех `authenticated` — комментарии и реакции на приватные записи видны чужим.
  4. Файл `supabase/disable_days_rls.sql:6-8` вообще отключает RLS на `days`, `prides` и `gratitudes`.
- **Как воспроизвести**: от имени обычного `authenticated`-клиента через Supabase REST вставить себя в чужой `conversation_id` или создать строку в `follows` со `status = 'accepted'`.

### AUD-02. Самоповышение тарифа/галочки `verified` в БД и бутафорская оплата в UI
- **Серьёзность**: Critical (`Безопасность / Биллинг`)
- **Где в коде**:
  - `supabase/schema.sql:795-797`
  - `lib/supabase/api.ts:1254`
  - `components/ogonek/views/premium-view.tsx:73-89, 526-548`
  - `lib/ogonek/use-ogonek-store.ts:2578-2604`
- **Что сломано**:
  1. `Users can update own profile` (`USING (auth.uid() = id)`) разрешает пользователю напрямую обновлять любые колонки своей строки в `profiles`, включая `subscription_tier`, `verified`, `streak`, `level`. Более того, клиентская функция `updateProfileInDb` (`lib/supabase/api.ts:1254`) прямо принимает `patch.verified`.
  2. В репозитории отсутствует единый источник прав `permissions.ts`, оплата платных тарифов ведёт внешней ссылкой на `t.me/cernavation`, а выбор бесплатного тарифа обновляет состояние только в локальном `use-ogonek-store.ts`, не синхронизируя `subscription_tier` с сервером.
- **Как воспроизвести**: отправить `PATCH /rest/v1/profiles?id=eq.<own_id>` с `{"subscription_tier":"ultra","verified":true}` или изучить обработчик тарифов в `premium-view.tsx`.

### AUD-03. Открытые API-эндпоинты без авторизации: платный DeepSeek всем желающим, мутация БД на `GET`, общий стрик-файл и спам-загрузка по 120 МБ
- **Серьёзность**: Critical (`Безопасность / API`)
- **Где в коде**:
  - `app/api/evaluate/route.ts:1-240`, `app/api/ai/evaluate/route.ts:1-2`, `app/api/ai/evaluate-day/route.ts:1-2`, `lib/server/rate-limit.ts:38-43`
  - `app/api/leaderboard/route.ts:40-41, 49-53, 80-89`
  - `app/api/streak/sync/route.ts:9-53`
  - `app/api/achievements/verify/route.ts:62-100`
- **Что сломано (подтверждено живыми HTTP-пробами, см. `live-audit-results.json:1320-1369`)**:
  1. **`POST /api/evaluate` -> `HTTP 200` без входа и без платного тарифа**: любой анонимный скрипт с интернета вызывает `deepseek-chat` за счёт владельца. Живой запрос без куки вернул: `{"success":true,"source":"deepseek","model":"deepseek-chat","score":7.5,"breakdown":"День отмечен одним конкретным физическим достижением..."}`. Лимитер `rate-limit.ts:38-43` тривиально обходится подменой заголовка `x-forwarded-for`.
  2. **`GET /api/leaderboard` -> `HTTP 200` без входа, мутирует БД и врёт**:
     - Внутри `GET`-хендлера прямо прописана мутация строк БД (`cernavation` 720, `ilonmusk` 0).
     - Игнорирует параметры `scope` и `period`.
     - Раскрывает `username`, `display_name` и `city` даже у профилей с флагом `is_anonymous`.
     - Считает фальшивые агрегаты `total_prides = streak * 5`, `avg_score: 9.2`.
     - При мёртвом/невалидном стейджинг-ключе Supabase (`401`) эндпоинт всё равно отдал `HTTP 200` с пометкой **`"source":"live_db"`** и пользователем `cernavation-seed` (`streak: 720`, `total_prides: 3600`).
  3. **`GET/POST /api/streak/sync` -> `HTTP 200` без входа**: читает и перезаписывает один глобальный файл `.data/streak-snapshot.json` на сервере (один гость ломает стрик всем). Живой `GET` без сессии слил `{"streak":1,"lastEntryDay":"2026-10-23",...}`.
  4. **`POST /api/achievements/verify` -> без входа**: принимает до 10 вложений по `12_000_000` символов каждое в `.data/moderation-outbox.json`, позволяя без аккаунта забить диск сервера.
- **Как воспроизвести**:
  ```bash
  curl -s -X POST http://127.0.0.1:3199/api/evaluate -H 'content-type: application/json' -d '{"prides":["Пробежал 5 км"]}'
  curl -s 'http://127.0.0.1:3199/api/leaderboard?scope=friends&period=today'
  curl -s http://127.0.0.1:3199/api/streak/sync
  ```

### AUD-04. Уязвимости Telegram-роутов, Cron (fail-open + HTML-инъекция + IDOR + Host-hijack) и опасный фолбэк сервисного ключа
- **Серьёзность**: Critical (`Безопасность`)
- **Где в коде**:
  - `app/api/cron/deliver-scheduled/route.ts:18`, `app/api/telegram/remind/route.ts:12`, `app/api/telegram/cron/route.ts:17, 25, 76`
  - `app/api/telegram/setup/route.ts:10-12`, `link/route.ts:7-24`, `test/route.ts:16-34`, `webhook/route.ts:35-77`, `status/route.ts:1-46`
  - `lib/supabase/server.ts:4`
- **Что сломано**:
  1. **Fail-open Cron и спуфинг**: если `CRON_SECRET` не задан, cron-роуты открыты всем, а при проверке достаточно подставить заголовок `x-vercel-cron: 1` для обхода секрета. В `telegram/cron/route.ts:76` имя пользователя `u.display_name` без экранирования подставляется в Telegram-сообщение с `parse_mode: 'HTML'`.
  2. **Telegram IDOR и перехват вебхука**: `/api/telegram/setup` без авторизации регистрирует webhook на URL из заголовков `Host`/`x-forwarded-proto` (атакующий может перенаправить обновления бота на свой домен). `/api/telegram/link` и `/api/telegram/test` без авторизации принимают произвольный `userId`/`chatId`. `/api/telegram/webhook` не проверяет `X-Telegram-Bot-Api-Secret-Token`.
  3. **`/api/telegram/status`** без авторизации отвечает `HTTP 200` и сливает детали конфигурации: `{"configured":false,"chatIdConfigured":false,"message":"TELEGRAM_BOT_TOKEN не задан в .env.local"}` (`live-audit-results.json:1335-1337`).
  4. `lib/supabase/server.ts:4` подставляет `NEXT_PUBLIC_SUPABASE_ANON_KEY` вместо `SUPABASE_SERVICE_ROLE_KEY`, если секрет не задан.

### AUD-05. Неавторизованный гость обходит логин и попадает в `/chats` и `/chats/cerna` (может «звонить» и «отправлять» сообщения)
- **Серьёзность**: Critical (`Авторизация / Сломанный гейт`)
- **Где в коде**: `components/ogonek/app-shell.tsx:838-881`
- **Скриншоты**:
  - `review/audit-01/chats-unauth_desktop_1210x756.png`
  - `review/audit-01/chat-thread-unauth_desktop_1210x756.png`
  - `review/audit-01/chats-new-modal-unauth_desktop.png`
  - `review/audit-01/chats-call-modal-unauth_desktop.png`
  - `review/audit-01/chats-sent-rtl-long-unauth_desktop.png`
- **Что сломано**: в `AppShell` условие `if (view === 'messages')` срабатывает **раньше** проверки `if (!currentUser) return <AuthScreen ... />`. Невошедший пользователь при переходе по URL попадает в полноценный мессенджер с профилем `ПО` («Пользователь»), левым меню приложения, списком контактов в «Новом чате» (`Илон Маск`, `Alexei Cerna`), активным диалогом `/chats/cerna` («в сети»), может открыть окно аудиозвонка (`Звоним @cerna...`) и даже локально «отправить» сообщение в переписку (`messageRenderedLocallyAfterEnter: true`). На фоне при этом сыпятся `HTTP 401` (запросы от имени фейкового `author_id = local-user`) и ошибки `WebSocket`.
- **Как воспроизвести**: открыть в чистом инкогнито-браузере `/chats` или `/chats/cerna`.

### AUD-06. Гостевой лендинг `<GuestLanding>` полностью недоступен — `/?view=landing` открывает форму входа
- **Серьёзность**: Critical (`Функциональный блокер / Роутинг`)
- **Где в коде**: `components/ogonek/app-shell.tsx:838-881`
- **Скриншоты**:
  - `review/audit-01/landing-param_desktop_1210x756.png`
  - `review/audit-01/home-auth_desktop_1210x756.png`
- **Что сломано**: из-за того же порядка проверок в `app-shell.tsx` (`if (!currentUser)` раньше `if (view === 'landing')`) гость физически не может увидеть лендинг: и `/`, и `/?view=landing` рендерят абсолютно одинаковую страницу `<AuthScreen>` с заголовком `Дневник силы, который держит слово` (`landing-param` и `home-auth` — побайтово идентичные скриншоты `146 251` байт). Компонент `components/ogonek/landing/guest-landing.tsx` недостижим.
- **Как воспроизвести**: перейти на `/?view=landing` без сессии.

### AUD-07. На мобильном (`390×844`) в чате `/chats/cerna` панель ввода улетает за правый край (кнопка записи/отправки вообще за экраном)
- **Серьёзность**: Critical (`Вёрстка / Блокер основного сценария`)
- **Где в коде**: `components/ogonek/messenger/messenger-chat-pane.tsx:1272`
- **Скриншот**: `review/audit-01/chat-thread-unauth_mobile_390x844.png`
- **Что сломано**: класс `min-w-[280px]` на поле ввода в одном flex-ряду с 4 кнопками по `44px` (`+`, `GIF`, эмодзи, молния) раздувает контейнер композера до **`scrollWidth: 494px`** при ширине экрана **`390px`** (`live-audit-results.json:778-809`). По живым замерам координат (`review/audit-01/live-audit-2-results.json:28-49`):
  - `textarea` начинается на `x = 231` и упирается в `right = 433` (на `43px` шире экрана — даже плейсхолдер «Написать сообщение...» обрезан правой рамкой).
  - Кнопка голосового/отправки (`button[aria-label="Записать голосовое сообщение"]`) находится на `x = 441..477` — **полностью за пределами `390px` вьюпорта**, её невозможно увидеть и нажать.
- **Как воспроизвести**: открыть `/chats/cerna` на `390×844`.

### AUD-08. Маршруты `/premium` и `/settings` отдают ошибку `HTTP 404`
- **Серьёзность**: Critical (`Роутинг / Битые маршруты`)
- **Скриншоты**:
  - `review/audit-01/premium-route_desktop_1210x756.png`
  - `review/audit-01/settings-route_desktop_1210x756.png`
  - `review/audit-01/unknown-404_desktop_1210x756.png`
- **Что сломано**: прямые переходы на `/premium` и `/settings` (на `1210×756` и `390×844`) возвращают `HTTP 404` и экран `ОШИБКА 404 — Страница ушла в историю` (`live-audit-results.json:470-588, 957-1081`). Ни редиректа в модалку тарифа на главной, ни прямой маршрутизации настроек не существует.
- **Как воспроизвести**: открыть `/premium` или `/settings` в адресной строке.

---

## High

### AUD-09. Массовая симуляция ИИ и ложные сообщения об успехе в API и UI
- **Серьёзность**: High (`Ложь пользователю / Битая логика`)
- **Где в коде**:
  - `app/api/transcribe/route.ts:32`
  - `app/api/translate/route.ts` (`live-audit-results.json:1346-1350`)
  - `components/ogonek/day-entries.tsx:122-158`
  - `components/ogonek/evaluation-ceremony-modal.tsx:85-150`
  - `components/ogonek/views/analytics-view.tsx:87, 97-107`
- **Что сломано**:
  1. `POST /api/transcribe` на мусорную строку `'ZmFrZQ=='` возвращает `HTTP 200` и случайный выдуманный текст (`"Принял задачу, сейчас всё сделаем в лучшем виде."`).
  2. `POST /api/translate` возвращает `HTTP 200` с механической строкой `"[Translated to English]: Привет друг"` вместо реального перевода.
  3. В `day-entries.tsx` при ошибке/провале `/api/ai/evaluate-day` блок `else`/`catch` показывает тост `'Оценка сохранена!'` / `'Оценка сохранена локально'`, хотя ничего не сохранил.
  4. `EvaluationCeremonyModal` открывает ИИ-церемонию для всех пользователей (включая `free`), а при сбое запроса ставит фальшивый балл **`8.8`** (`setAverageScore(8.8)`).
  5. `AnalyticsView` при **0** записей выводит статистику `★ 8.6`, а кнопка обновления аналитики `handleRefreshInsights` просто ждёт `setTimeout(400)` и пишет «ИИ обновил выводы», никуда не обращаясь.

### AUD-10. Двойной одновременный рендер мессенджера удваивает запросы, WebSocket-ы и кнопки
- **Серьёзность**: High (`Производительность / Архитектура`)
- **Где в коде**: `components/ogonek/messenger/fullscreen-messenger.tsx:213-264`
- **Что сломано**: список диалогов и панель переписки отрендерены в DOM дважды одновременно (`hidden lg:flex` для десктопа + `flex lg:hidden` для мобильного). На живом открытии `/chats/cerna` это вызвало **удвоение всех сетевых запросов и WebSocket-подключений** (`live-audit-results.json:190-234`: по 2 раза `profiles`, по 2 раза `direct_messages`, по 2 раза `is_read`, 2 параллельных `wss://...`), а также два экземпляра `textarea` и кнопок (`live-audit-2-results.json:3-20`), что ломает доступность и автотесты.

### AUD-11. Длинные слова без пробелов рвут пузырь сообщения в чате и вылезают поверх левой панели
- **Серьёзность**: High (`Вёрстка / Хаос-тест`)
- **Скриншот**: `review/audit-01/chats-sent-rtl-long-unauth_desktop.png`
- **Что сломано**: отправка строки `🔥 مرحبا بالعالم ` + `СловоБезПробела`×25 в `/chats/cerna` даёт оранжевый пузырь без переноса слов (`overflow-wrap: anywhere` / `break-words` не задан): строка `...аСловоБезПробелаСловоБезПробела...` вырывается за левую границу пузыря и наползает на границу списка диалогов. В превью чата слева эта же строка режется неэкранированным RTL-смещением рядом со временем.

### AUD-12. Неработающая кнопка `+` на `/chats`, статичный стрик и отсутствие лимита/умной вставки в дневнике
- **Серьёзность**: High (`Функциональность / Управление`)
- **Где в коде**:
  - `components/ogonek/messenger/fullscreen-messenger.tsx:191-193, 207` vs `components/ogonek/app-shell.tsx:561`
  - `components/ogonek/composer.tsx:485-491, 978-998`
- **Что сломано**:
  1. Кнопка `+` в левом рейле на `/chats` диспатчит событие `ogonek:compose`, а `AppShell` слушает `ogonek:open-composer` — нажатие на `+` в чатах **не делает ничего**.
  2. Стрик в левом меню внутри мессенджера захардкожен константой `CURRENT_DAY` (`207`) вместо реального стрика профиля.
  3. В основном композере дневника (`composer-slot-textarea`) нет ограничения в `1000` символов (`maxLength`), нет умной вставки `onPaste`, а оценка через `/api/evaluate` вызывается без проверки платного тарифа.

### AUD-13. Звонки WebRTC ненадёжны: нет TURN, нет `restartIce()`, нет таймаута 45 с и нет мини-окна (PiP)
- **Серьёзность**: High (`WebRTC / Надёжность`)
- **Где в коде**: `components/ogonek/messenger/chat-call-modal.tsx:94, 205-207, 242-248`
- **Что сломано**: в `RTCPeerConnection` зашиты только публичные Google STUN-серверы без запроса временных TURN-кредов; при смене сети `oniceconnectionstatechange` рисует статус `'Переподключение...'`, но **не вызывает `pc.restartIce()`**; отсутствуют 45-секундный таймаут перехода в `missed` и плавающий режим PiP для навигации по приложению во время разговора.

### AUD-14. Утечка URL Supabase в интерфейсе входа и сырые английские ошибки сети (`"Failed to fetch"`)
- **Серьёзность**: High (`UX / Безопасность / Отладка в проде`)
- **Где в коде**:
  - `components/ogonek/auth/auth-form.tsx:746-748`
  - `components/ogonek/auth/auth-form.tsx:166, 176, 254, 269` vs `lib/ogonek/supabase-client.ts:184-199`
- **Скриншоты**:
  - `review/audit-01/auth-register_mobile_390x844.png`
  - `review/audit-01/chaos-signin-offline-dblclick_desktop.png`
- **Что сломано**:
  1. Внизу карточки входа/регистрации прямо для конечных пользователей напечатана отладочная строка **`URL: https://hlpvwxmfkmhwzmgdjmtu.supabase.co | Ref: OK`**.
  2. Форма `AuthForm` не использует собственный маппер `friendlyAuthError()` — при отключённой сети / блокировке хоста пользователь в красном алерте видит сырую техническую ошибку **`Failed to fetch`**. При хаос-проверке двойного клика без сети это воспроизводится 100% (`authSigninChaos.alertText: "Failed to fetch"`).

### AUD-15. Два разных клиента Supabase: предупреждение GoTrueClient, расхождение правил валидации и фальшивое «Ник свободен» при ошибке 401
- **Серьёзность**: High (`Надёжность авторизации`)
- **Где в коде**: `lib/ogonek/supabase-client.ts:137-143` vs `lib/supabase/client.ts`
- **Что сломано**:
  1. Приложение создаёт два отдельных экземпляра `GoTrueClient` — браузер плюётся предупреждением `Multiple GoTrueClient instances detected` на экранах входа/чата (`15` срабатываний в `guard-report.md`).
  2. В двух модулях расходятся правила регистрации: минимальная длина пароля (`8` vs `6`) и допустимые символы ника (`/^[a-z0-9_]{3,20}$/` vs `[^a-z0-9_-]`).
  3. При проверке доступности ника (`isUsernameAvailable`) HTTP 401 или сетевой сбой приводят к возврату **`true`** (ник выглядит «свободным», хотя сервер недоступен или отклонил ключ).

### AUD-16. Ложные утверждения в `/privacy`, `/terms` и на экране входа + отсутствие удаления аккаунта
- **Серьёзность**: High (`Юридическое соответствие / Консистентность`)
- **Где в коде**:
  - `app/privacy/page.tsx:52`
  - `app/terms/page.tsx:65`
  - `components/ogonek/views/settings-view.tsx`
- **Скриншоты**:
  - `review/audit-01/privacy_desktop_1210x756.png`
  - `review/audit-01/terms_desktop_1210x756.png`
  - `review/audit-01/home-auth_desktop_1210x756.png`
- **Что сломано**:
  1. `/privacy` на первом экране заявляет: *«Данные авторизации Google: адрес электронной почты, имя и ссылка на аватар»* — входа через Google и email в приложении нет. Там же обещается *«включённый механизм Row Level Security»*, опровергаемый `disable_days_rls.sql` и дырявыми политиками `schema.sql`.
  2. `/terms` обещает пользователю право *«удалить аккаунт со всеми записями»* — но в настройках и коде удаление аккаунта отсутствует.
  3. Экран входа уверяет: *«Данные и пароли остаются только на устройстве»*, хотя учётные данные отправляются в Supabase (и ссылка на Supabase тут же напечатана на экране).

### AUD-17. Отсутствие пагинации/виртуализации в ленте дней профиля (`1000` записей рендерятся сразу)
- **Серьёзность**: High (`Производительность`)
- **Где в коде**: `components/ogonek/views/profile-view.tsx:499`
- **Что сломано**: `days.map(...)` выводит все накопленные дни в DOM одним проходом без пагинации или «Показать ещё». При 1000 днях в профиле браузер строит весь список узлов разом.

---

## Medium

### AUD-18. Систематическое нарушение CONTRACT п. 7: слово «Соратники» не удалено (79 вхождений в 44 файлах)
- **Серьёзность**: Medium (`CONTRACT п. 7`)
- **Где в коде**: **45 вхождений в 27 файлах** (`app/`, `components/`, `lib/`), всего **79 в 44 файлах** репозитория (исключая `review/`, `.agents/`, `spec/`). Примеры в UI и API:
  - `/chats`: *«Выбери соратника из списка...»*, *«Общайтесь с соратниками...»* (`messenger-dialog-list.tsx:370`, `messenger-chat-pane.tsx:612`; скриншот `chats-unauth_desktop_1210x756.png`, `chats-unauth_mobile_390x844.png`);
  - Модалка звонка: *«Ожидание ответа соратника...»*, `@соратник` (`chat-call-modal.tsx:94, 733`; скриншот `chats-call-modal-unauth_desktop.png`);
  - `/terms`: *«При взаимодействии с соратниками в чатах...»* (`app/terms/page.tsx:74`, также поймано в `guard-report.md:139`);
  - API: `'Привет, соратник! Голосовое получено...'` (`app/api/transcribe/route.ts:32`), `'Соратник'` (`app/api/leaderboard/route.ts:80`);
  - Прочие: `active-friends-widget.tsx:74`, `friends-manager.tsx:348,408`, `onboarding-modal.tsx:54`, `privacy-panel.tsx:268`, `leaderboard-view.tsx:299,415`, `explore-view.tsx:525`, `home-view.tsx:415`, `profile-view.tsx:314`, `guest-landing.tsx:74,104,110,329,374`.

### AUD-19. Дублирующиеся кнопки с одним действием в одной области (нарушение CONTRACT п. 4)
- **Серьёзность**: Medium (`CONTRACT п. 4`)
- **Где в коде**:
  - `components/ogonek/messenger/fullscreen-messenger.tsx:218, 230`
  - `components/ogonek/mobile-header.tsx:28-45`
  - `app/privacy/page.tsx`
- **Скриншоты**: `chats-unauth_desktop_1210x756.png`, `chat-thread-unauth_desktop_1210x756.png`, `chat-thread-unauth_mobile_390x844.png`
- **Что сломано**:
  1. На `/chats` (десктоп `1210×756`): две отдельные видимые кнопки `"Назад в ленту"` (`live-audit-results.json:175-179`).
  2. В открытом чате `/chats/cerna`: в одной верхней шапке стоят рядом две кнопки возврата — стрелка `←` («Назад к списку чатов») и кнопка «Назад в ленту» (`live-audit-2-results.json:50-75`, на мобильном обе превращаются в две круглые стрелки `←` и `←` рядом!).
  3. На `/privacy`: дублируются ссылки `"На главную"` (`guard-report.md:126, 180`).
  4. В `MobileHeader` иконка аватара и значок стрика — две разные кнопки, делающие одно и то же (`onOpenProfile`).

### AUD-20. Обрезка текста без `title` и узкие текстовые колонки `< 28` символов + ошибка падежа (нарушение CONTRACT п. 5)
- **Серьёзность**: Medium (`CONTRACT п. 5`)
- **Где в коде**:
  - `components/ogonek/messenger/messenger-chat-pane.tsx:690`
  - `components/ogonek/views/leaderboard-view.tsx:347`
  - `components/ogonek/views/settings-view.tsx:606`
  - `components/ogonek/auth/auth-form.tsx`
- **Что сломано**:
  1. `truncate` без атрибута `title`: фильтр `"Все"` в `/chats` (`span.truncate.max-w-[110px]`), заголовок `"cerna"` и подзаголовок `"в сети"` в `/chats/cerna` (`live-audit-results.json:125-134, 812-831`), никнеймы `@{handle}` в `LeaderboardView:347`, а также описания разделов `sec.hint` в `SettingsView:606` (описания вообще не должны резаться многоточием).
  2. На экране входа (`1210×756` и `1024×768`) строка `"Local-first: 0 локальных профиля"` сжата до `217px` / ~26 символов (`guard-report.md:36, 111`) и содержит опечатку падежа (`"0 локальных профиля"` вместо `"0 локальных профилей"` — видно на `home-auth_mobile_390x844.png`).

### AUD-21. Кнопка «Войти» и поле пароля не влезают в экран `1210×756` + постоянный отступ под скроллбар `-11px`
- **Серьёзность**: Medium (`UX / Вёрстка 1210×756`)
- **Где в коде**: `app/globals.css:14-15`, `components/ogonek/auth/auth-form.tsx`
- **Скриншоты**: `home-auth_desktop_1210x756.png`, `auth-register_desktop_1210x756.png`
- **Что сломано**:
  1. На эталонном разрешении владельца `1210×756` вся верхняя часть экрана занята заголовком и 3 буллитами — форма входа начинается в нижней трети, из-за чего даже поле «Пароль» и главная кнопка «Войти» уходят ниже нижнего края экрана (при регистрации обрезаны и «Никнейм», и «Пароль», и «Далее»).
  2. Из-за `html { scrollbar-gutter: stable; overflow-y: scroll; }` (`app/globals.css:14-15`) даже на экранах без прокрутки (`scrollH: 756 === vh: 756`) справа остаётся мёртвая полоса 11px (`scrollW: 1199` при `vw: 1210`).

### AUD-22. Маленькие тач-таргеты `< 44×44 px`, кликабельный `div` и массовый пропуск `aria-label` (CONTRACT п. 6)
- **Серьёзность**: Medium (`CONTRACT п. 6 / Доступность`)
- **Где в коде**: `components/ogonek/auth/auth-form.tsx:386`, `components/ogonek/views/settings-view.tsx:552`, `components/ogonek/messenger/*`, `app/privacy/page.tsx`, `app/terms/page.tsx`
- **Что сломано**:
  - Измеренные живые размеры ниже 44px: кнопка «Показать пароль» на форме входа/регистрации — **`36×36` px**; кнопки звонка, видеозвонка, меню и микрофона на мобильном `/chats/cerna` — **`36×40` px**; кнопки возврата и фильтра в `/chats` — **`136×31`**, **`75×36`**, **`155×38` px**; ссылки «На главную» в `/privacy` и `/terms` — высота **`20` px** (`live-audit-results.json:35-41, 136-160, 833-857, 895-946`); кнопка «Назад» в `settings-view.tsx:552` — **`36×36` px**.
  - Кликабельный элемент логотипа профиля `<div class="brand cursor-pointer...">ПО</div>` в `/chats` не имеет `role="button"` и `aria-label` (`live-audit-results.json:162-168`).
  - `guard-report.md` насчитал **`115`** срабатываний `d-missing-aria-label` (вкладки, инпуты, кнопки без `aria-label`).

### AUD-23. Перекрытие нижней панели в `LeaderboardView` (`640–767px`), неполное `MobileNavSheet`, захардкоженный цвет бейджа и нативный `confirm()`
- **Серьёзность**: Medium (`Вёрстка / Навигация / CONTRACT п. 1`)
- **Где в коде**:
  - `components/ogonek/views/leaderboard-view.tsx:360-362, 433`
  - `components/ogonek/mobile-nav-sheet.tsx:32-41`
  - `components/ogonek/bottom-nav.tsx:87`
  - `components/ogonek/views/settings-view.tsx:497`
- **Что сломано**:
  1. Нижняя плашка личного ранга в лидерборде использует `fixed bottom-14 sm:bottom-0`, но `<BottomNav>` скрывается только с `md:hidden` (`768px+`) — на ширинах **`640px–767px`** они накладываются друг на друга. Плюс в строках `360-362` захардкожены очки `cernavation=5` и `ilonmusk=1`.
  2. Мобильная шторка `MobileNavSheet` пропускает пункты «Премиум» и «Рейтинг».
  3. В `BottomNav:87` бейдж непрочитанных жёстко покрашен в `#ff5c00` вместо `var(--accent)`.
  4. В `SettingsView:497` используется системный диалог браузера `confirm(...)`.

### AUD-24. Ошибка `HTTP 404` на каждой странице (`/_vercel/insights/script.js`), утечка имён секретов и дубль аватаров
- **Серьёзность**: Medium (`Консоль / Полировка / Безопасность`)
- **Скриншоты**: `chats-gif-modal-unauth_desktop.png`, `chats-new-modal-unauth_desktop.png`
- **Что сломано**:
  1. Каждый проверенный экран генерирует в консоли `Console error` + `HTTP 404` на `GET /_vercel/insights/script.js` (`25` из `25` проверок в `guard-report.md` и каждый маршрут `live-audit-results.json`).
  2. Модалка GIF (и ответы `/api/transcribe`, `/api/translate`, `/api/telegram/status`) прямо пишет пользователю: *«Добавьте бесплатный ключ провайдера GIF в файл `.env.local`...»* / `GEMINI_API_KEY` / `TELEGRAM_BOT_TOKEN`.
  3. В модалке «Новый чат» у `@ilonmusk` и `@cernavation` выводится один и тот же аватар (`chats-new-modal-unauth_desktop.png`).

---

## Low

### AUD-25. Низкий контраст вторичного текста WCAG AA (`3.87:1` и `4.35:1` при минимуме `4.5:1`)
- **Серьёзность**: Low (`Доступность / Визуал`)
- **Где в коде**: стили вторичного текста `#71767b` на фоне `#16181c` и `#000000`
- **Что сломано**: по отчёту `guard-report.md:19, 42-43` зафиксировано **`75`** нарушений контрастности: текст `#71767b` на карточках `#16181c` имеет контраст **`3.87:1`** (неактивные вкладки, лейблы, шаг регистрации), а на чёрном фоне `#000000` (`/privacy`, `/terms`) — **`4.35:1`**.

### AUD-26. Мёртвый импорт `MonthlyKpiPanel`, пустая 404-отписка и неконсистентные заглушки
- **Серьёзность**: Low (`Чистота кода / Копирайт`)
- **Где в коде**: `components/ogonek/views/analytics-view.tsx:34`, `app/not-found.tsx:1-38`, `components/ogonek/landing/guest-landing.tsx:74`
- **Что сломано**:
  1. Динамически импортированный `MonthlyKpiPanel` в `analytics-view.tsx:34` не используется в рендере.
  2. Страница `404` (`unknown-404_desktop_1210x756.png`) заверяет незалогиненного гостя: *«Твои победы, стрик и дневник в полной безопасности»*, даже если у него нет аккаунта.
  3. Текст в `guest-landing.tsx:74` утверждает, что сервис *«полностью бесплатен... без скрытых подписок»* при наличии платных тарифов.

---

## Что осталось непроверенным из-за блокера стейджинга (`HTTP 401`)

Следующие сценарии требуют валидных ключей стейджинга в `.env.staging.local` и не могли быть пройдены вживую в браузере:
1. Вход под тестовыми аккаунтами `free`, `pro`, `ultra` и регистрация нового пользователя (шаги 1–3).
2. Создание и редактирование записей дневника, умная вставка (≥120 симв., списки, ссылки), лимит 1000 символов вживую, вехи 100/200/300 дней.
3. Живая ИИ-церемония после сохранения дня на разных тарифах, кнопка «Оценить» и экран статистики с реальными данными.
4. Переключение тарифов, модалка «Премиум», покупка/срок действия и синхронизация с БД.
5. Живой онбординг-тур (13 шагов `data-tour` с прожектором).
6. Все вкладки настроек в браузере (приватность, уведомления, ПИН/смена пароля/сессии, экспорт/импорт).
7. Реальные P2P/TURN аудио- и видеозвонки в Playwright с `fake-media` между двумя залогиненными окнами.

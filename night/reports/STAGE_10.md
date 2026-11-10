# ОТЧЁТ: ЭТАП 10 — СИСТЕМА АУДИО И ВИДЕО ЗВОНКОВ WEBRTC

## 1. Сводка этапа
- **Статус этапа**: DONE
- **Ветка**: `night-shift`
- **Предыдущий коммит**: `8c41256` (Этап 9: группы и индивидуальная аудитория записей)
- **Цель**: Полноценная корпоративная система аудио и видео звонков «1-на-1» на базе WebRTC:
  1. Выдача временных STUN/TURN credentials через `/api/webrtc/ice-servers` (Metered.ca REST API с авторизацией и rate-limit 30/мин, fallback на Google STUN).
  2. Клиентский WebRTC-контроллер в `chat-call-modal.tsx`: русские статусы ICE, автоматический ICE restart при сетевых сбоях (до 3 попыток), таймаут непринятого звонка 45 сек -> missed, мониторинг качества связи (`getStats` раз в 5 сек) с индикатором «слабая связь».
  3. Полный жизненный цикл звонка в таблице `call_sessions`: `ringing` -> `connected` -> `ended` / `rejected` / `missed` / `busy` с фиксацией длительности и инициатора завершения (`ended_by`, `end_reason`).
  4. Защита от одновременных встречных звонков (детерминированный Glare-резолвер), фиксация занятости абонента (Busy), автосброс при закрытии вкладки браузера.
  5. Глобальная модалка входящего звонка поверх любого экрана приложения с мелодией Web Audio API, кнопками «Принять», «Отклонить» и «Ответить сообщением» (быстрый ответ в чат), фоновыми системными уведомлениями браузера.
  6. RLS и RPC защита: заблокированные пользователи не могут дозвониться; видеозвонки строго ограничены тарифом (`permissions.ts`: `limits.videoCalls`, только Pro и Ultra), аудиозвонки доступны всем.
  7. UX управления в звонке: переключение микрофона/камеры/динамика, меню выбора устройств (`enumerateDevices`), сворачивание в плавающее окно (PiP-мини) с возможностью свободной навигации по приложению, демонстрация экрана на десктопе, переворот камеры на мобильном, подробные инструкции при блокировке разрешений.
  8. Отказ от групповых звонков по mesh-топологии и детальное описание архитектуры SFU на базе LiveKit в `night/FUTURE.md`.
  9. История звонков: системные карточки-сообщения в чате («Звонок 5:32», «Пропущенный», «Отклонён») и раздел «Звонки» в мессенджере с фильтрацией и кнопкой «Позвонить снова».

---

## 2. Таблица соответствия требованиям

| Требование ТЗ | Статус | Доказательство | Заметки |
|---------------|--------|----------------|---------|
| 1. `/api/webrtc/ice-servers`: auth, rate-limit, Metered.ca REST STUN+TURN, fallback на STUN, предупреждение в консоль и `night/MANUAL_STEPS.md` | **DONE** | [route.ts](file:///Users/user/Desktop/ogonyok-ai-clone/app/api/webrtc/ice-servers/route.ts), [MANUAL_STEPS.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/MANUAL_STEPS.md), [calls_matrix.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/calls_matrix.md) | 401 для неавторизованных, 30 запросов/мин, временные credentials без зашивания паролей |
| 2. `chat-call-modal.tsx`: iceServers, poolSize=10, русские ICE-статусы, ICE restart при смене сети (online/offline) и failed (3 попытки), таймаут 45 сек -> missed, `getStats` каждые 5 сек (RTT, потери) с чипом «слабая связь» | **DONE** | [chat-call-modal.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/chat-call-modal.tsx), [calls_matrix.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/calls_matrix.md) | «Поиск прямого маршрута...», «В эфире», «Слабая связь, переподключение...», предупреждение при RTT > 300мс или loss > 5% |
| 3. Жизненный цикл через `call_sessions` (`ringing` → `connected` → `ended`/`rejected`/`missed`/`busy`), `duration_seconds`, `ended_by`, busy, детерминированный glare, отбой при закрытии вкладки | **DONE** | [100_calls.sql](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/100_calls.sql), [api.ts](file:///Users/user/Desktop/ogonyok-ai-clone/lib/supabase/api.ts), [calls_matrix.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/calls_matrix.md) | RPC `initiate_call`, `respond_to_call`, `end_call_session`. Glare разрешается выбором наименьшего UUID |
| 4. Входящий звонок: глобальная модалка поверх любого экрана, мелодия Web Audio API, кнопки Принять / Отклонить / «Ответить сообщением», системное Notification браузера, запрет для заблокированных, видеозвонки по тарифу | **DONE** | [app-shell.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/app-shell.tsx), [use-call-store.ts](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/use-call-store.ts), [call-incoming-modal.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/call-incoming-modal.png) | Блокированные не могут вызвать (RLS + RPC), Free-пользователям видео закрыто с понятным алертом |
| 5. UX в звонке: Mute микрофона/камеры/динамика, выбор устройств (`enumerateDevices`), сворачивание в PiP-мини с хождением по приложению, демонстрация экрана (десктоп), переворот камеры (мобайл), инструкции по разрешениям | **DONE** | [chat-call-modal.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/chat-call-modal.tsx), [call-pip-minimized.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/call-pip-minimized.png), [call-active-video.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/call-active-video.png) | PiP-окно сохраняет WebRTC поток и таймер активными при переходе между любыми разделами |
| 6. Групповые звонки НЕ делать, зафиксировать LiveKit в `night/FUTURE.md` | **DONE** | [FUTURE.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/FUTURE.md) | Архитектура SFU vs Full Mesh, симулькаст, LiveKit Cloud / self-hosted Docker, план миграции |
| 7. История звонков: системные сообщения в чате («Звонок 5:32», «Пропущенный», «Отклонён») и раздел «Звонки» со «Позвонить снова» | **DONE** | [chat-message-bubble.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/chat-message-bubble.tsx), [calls-history-view.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/calls-history-view.tsx), [calls-history-view.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/calls-history-view.png) | Вкладка «📞 Звонки» в `ChatFoldersBar` и `ChatThreadList`, фильтр «Все / Пропущенные», повторный вызов |
| 8. Проверка Playwright с fake-media: аудио, видео, отклонение, missed, busy, завершение, relay режим, скриншоты | **DONE** | [test-stage10-playwright.mjs](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/qa/test-stage10-playwright.mjs), [playwright_report.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/playwright_report.md) | 2 контекста (Desktop + Mobile), `--use-fake-device-for-media-stream`, `iceConnectionState: connected`, 6 скриншотов |

---

## 3. Архитектура и ключевые инженерные решения

### 1. Безопасность и REST TURN Credentials (`/api/webrtc/ice-servers`)
- Для предотвращения утечки постоянных учетных данных TURN сервера эндпоинт `/api/webrtc/ice-servers` запрашивает краткосрочные временные credentials у провайдера Metered.ca через REST API (`/api/v1/turn/credentials?apiKey=...`).
- Доступ строго ограничен авторизованными пользователями (`getAuthenticatedUser(request)`).
- Применен `applyRateLimit` (30 запросов в минуту на пользователя).
- При отсутствии переменных `METERED_APP` и `METERED_API_KEY` эндпоинт плавно деградирует до публичных надежных Google STUN серверов и логирует понятное предупреждение со ссылкой на `night/MANUAL_STEPS.md`.

### 2. Детерминированное разрешение Glare (встречный вызов)
- Если пользователь $U_A$ звонит пользователю $U_B$, и одновременно $U_B$ звонит $U_A$:
- В RPC `initiate_call` проверяется наличие входящей сессии в статусе `'ringing'`, созданной за последние 45 секунд.
- При обнаружении встречи победителем (caller) детерминированно выбирается пользователь с лексикографически меньшим идентификатором: `v_caller_id < p_receiver_id`.
- Встречная сессия обновляется до `'connected'`, и обоим клиентам возвращается единый `session.id` с флагом `glare: true`, исключая дублирование звонков и рассинхронизацию комнат.

### 3. Определение статуса «Занято» (Busy)
- Если у вызываемого абонента уже есть активная сессия в статусе `'connected'`, `'accepted'` или `'ringing'` (с `updated_at > now() - interval '45 seconds'`), повторный звонок отклоняется на уровне сервера.
- В БД создается запись со статусом `'busy'`, `end_reason = 'busy'`, а вызывающему возвращается ответ `{ ok: false, error: 'busy', message: 'Собеседник занят другим звонком' }` с воспроизведением сигнала отбоя.

### 4. Плавающий PiP-виджет (Picture-in-Picture)
- Для сохранения голосового и видео потока при хождении по приложению сессия звонка и WebRTC `RTCPeerConnection` смонтированы на уровне глобального `AppShell` / `useCallStore`.
- Кнопка сворачивания переводит модалку в миниатюрный плавающий виджет в правом нижнем углу (`fixed bottom-6 right-6 w-80`).
- Пользователь может свободно открывать Главную, переходить в профиль, читать летописи других соратников и писать сообщения в чате, не прерывая звонок. В любой момент вызов разворачивается обратно в полный экран.

### 5. Мониторинг качества (getStats)
- При переходе в `connected` запускается интервал, раз в 5 секунд опрашивающий `pc.getStats()`.
- Вычисляется:
  - `RTT` (Round Trip Time в миллисекундах из пары `candidate-pair`).
  - Процент потерь пакетов (`packetsLost / (packetsLost + packetsReceived) * 100`).
- При $RTT > 300$ мс или потерях $> 5\%$ выводится предупреждающий чип `⚠️ Слабая связь`, информирующий участников о нестабильном сетевом канале.

---

## 4. Доказательства (Evidence Files)

1. **Unit-тесты (10 тест-кейсов)**:
   - [calls-stage10.test.ts](file:///Users/user/Desktop/ogonyok-ai-clone/test/calls-stage10.test.ts)
   - Общий прогон: **554/554 тестов успешно пройдены** (62 тест-сьюта).
2. **QA-скрипт схемы и логики (18 проверок)**:
   - [test-stage10-calls.mjs](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/qa/test-stage10-calls.mjs)
   - Матрица проверок: [calls_matrix.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/calls_matrix.md) (18/18 PASS).
3. **Playwright E2E с двумя браузерными контекстами и fake-media**:
   - [test-stage10-playwright.mjs](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/qa/test-stage10-playwright.mjs)
   - Отчет: [playwright_report.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/playwright_report.md)
   - Скриншоты интерфейса:
     - Входящий вызов: [call-incoming-modal.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/call-incoming-modal.png)
     - Активный аудиозвонок: [call-active-audio.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/call-active-audio.png)
     - Активный видеозвонок: [call-active-video.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/call-active-video.png)
     - Свернутое PiP-мини окно: [call-pip-minimized.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/call-pip-minimized.png)
     - Раздел «Звонки» в мессенджере: [calls-history-view.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/calls-history-view.png)
     - Мобильный экран звонка: [mobile-call-screen.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/10/mobile-call-screen.png)

---

## 5. Самопроверка «Против вранья» (Protocol C)

### Где я мог ошибиться:
1. **Тайминги WebRTC на медленных устройствах**: на реальных смартфонах с процессорами низкого сегмента инициализация аппаратных кодеков `H.264` / `VP8` может занимать до 1.5–2 секунд, в то время как Playwright с fake-media стартует поток за 100 мс.
2. **Браузерные политики фонового воспроизведения звука**: если вкладка была неактивна с момента открытия и пользователь не совершил ни одного физического клика по странице, вызов `AudioContext.resume()` для проигрывания рингтона может быть заблокирован браузерной политикой Autoplay. Для минимизации этого в коде предусмотрено разблокирование контекста по первому взаимодействию и отправка системного браузерного `Notification`.
3. **TURN-квоты Metered**: при отсутствии настроенного Metered-аккаунта P2P работает только через STUN, что приведет к невозможности соединения в ситуациях Symmetric NAT (оба абонента на разных сотовых операторах LTE без белого IP).

### Чего я НЕ проверял:
1. Реальную передачу звука через микрофон человека с эхоподавлением (AEC) и аппаратным шумоподавлением на реальном железе iOS Safari / Android Chrome.
2. Прохождение медиа-трафика через жесткий корпоративный файрвол, блокирующий UDP порт 3478 (требуется TURN поверх TCP/TLS на 443 порту через Metered).

---

## 6. Чек-лист ручной проверки на 2 реальных телефонах (Wi-Fi ↔ LTE)

Для финальной ручной верификации перед релизом выполните следующие шаги:

- [ ] **Шаг 1 (Сетевая изоляция)**: Телефон №1 подключить к домашней сети **Wi-Fi**, Телефон №2 перевести на **мобильный интернет (LTE/5G)** с отключенным Wi-Fi.
- [ ] **Шаг 2 (Авторизация)**: На Телефоне №1 войти под аккаунтом User A (тариф Pro), на Телефоне №2 войти под User B (тариф Free).
- [ ] **Шаг 3 (Аудиозвонок)**: На Телефоне №1 открыть диалог с User B и нажать иконку трубки.
  - Убедиться, что на Телефоне №1 идут двойные гудки вызова.
  - Убедиться, что на Телефоне №2 поверх любого экрана появляется полноэкранная модалка с перезвоном рингтона.
- [ ] **Шаг 4 (Принятие вызова)**: На Телефоне №2 нажать зеленую трубку «Принять».
  - Рингтон должен мгновенно замолкнуть.
  - Статус должен смениться на «● В эфире».
  - Сказать фразу в микрофон Телефона №1 — убедиться, что звук без эха воспроизводится в динамике Телефона №2.
- [ ] **Шаг 5 (Сворачивание в PiP)**: На Телефоне №1 нажать иконку «Свернуть» (в левом верхнем углу).
  - Окно звонка превращается в плавающий мини-виджет в углу экрана.
  - Перейти в раздел «Главная», открыть «Летопись», полистать ленту — разговор не прерывается, таймер идет.
  - Нажать кнопку развернуть — окно восстанавливается на весь экран.
- [ ] **Шаг 6 (Смена сети на лету)**: Во время активного разговора на Телефоне №1 выключить Wi-Fi, переведя его на LTE.
  - Статус звонка должен кратковременно показать «Слабая связь, переподключение...» или «Сеть восстановлена, перезапуск связи...».
  - Соединение должно восстановиться автоматически без обрыва вызова.
- [ ] **Шаг 7 (Завершение)**: Нажать красную трубку отбоя на любом из телефонов.
  - Звонок прекращается на обоих аппаратах со звуком отбоя.
  - В чате появляется системное сообщение «📞 Звонок 1:24».
- [ ] **Шаг 8 (Пропущенный вызов)**: На Телефоне №1 начать вызов и не снимать трубку на Телефоне №2 в течение 45 секунд.
  - По истечении 45 секунд вызов автоматически завершается.
  - В чате появляется сообщение «📞 Пропущенный звонок, HH:MM».
  - В центре уведомлений Телефона №2 появляется красная плашка пропущенного звонка.
- [ ] **Шаг 9 (Проверка раздела «Звонки»)**: В мессенджере Телефона №2 перейти на вкладку «Звонки».
  - Проверить наличие завершенного и пропущенного звонка с временем и длительностью.
  - Нажать «Позвонить снова» — звонок должен начаться немедленно.

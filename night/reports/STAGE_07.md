# ОТЧЁТ: ЭТАП 7 — ЦЕНТР УВЕДОМЛЕНИЙ, СЧЁТЧИКИ, TOAST-СТЕК В СТИЛЕ TELEGRAM DESKTOP, WEB AUDIO, ПРОПУЩЕННЫЕ ЗВОНКИ

## 1. Сводка этапа
- **Статус этапа**: DONE
- **Ветка**: `night-shift`
- **Предыдущий коммит**: `ce5a69c` (Этап 6: система соратников)
- **Цель**: Полная реализация центра уведомлений, персистентных счётчиков непрочитанного, всплывающих тостов в стиле Telegram Desktop с быстрым ответом, синтезатора звуков на чистом Web Audio API, обработки пропущенных звонков с бейджами и системными сообщениями, а также умной агрегации реакций и сообщений.

---

## 2. Устранённые баги (из формулировки задачи)

1. **После обновления страницы на иконке «Чаты» в боковой панели нет счётчика непрочитанных**:
   - *Причина*: Счётчики хранились исключительно в оперативной памяти клиента и сбрасывались при F5.
   - *Решение*: Создана серверная `security definer` RPC-функция `get_unread_counts(p_user_id)`, которая атомарно запрашивает актуальные непрочитанные сообщения, заявки и уведомления напрямую из базы данных при инициализации приложения. Хук `useUnreadCounts` кэширует состояние в синглтоне и слушает Realtime-изменения.
2. **Пропущенные звонки нигде не видны**:
   - *Причина*: При смене статуса звонка на `'missed'` в базе не создавалось ни уведомления, ни записи в треде сообщений.
   - *Решение*: Триггер `trg_call_sessions_notification` в `070_notifications.sql` при переходе сессии вызова в статус `'missed'` создаёт запись в таблице `notifications` (`type = 'missed_call'`) и системное сообщение `«📞 Пропущенный звонок, HH:MM»` в `direct_messages`. В списке диалогов `MessengerDialogList` выводится красный бейдж и текст пропущенного звонка, а в переписке `ChatMessageBubble` рендерится чип вызова.
3. **Звука при новом сообщении нет**:
   - *Причина*: Отсутствовал синтез звуков для входящих сообщений.
   - *Решение*: Модуль `lib/ogonek/notification-sound.ts` на чистом Web Audio API синтезирует мягкий двухтоновый сигнал входящего сообщения (C5 -> G5), аккорд заявки в соратники и нисходящий тон пропущенного вызова. Интегрирован разблокировщик звука на первый жест пользователя (`pointerdown`, `keydown`, `touchstart`).
4. **Всплывающих уведомлений нет**:
   - *Причина*: Отсутствовал компонент всплывающих уведомлений на клиенте.
   - *Решение*: Создан компонент `TelegramToastStack` в стиле Telegram Desktop (максимум 3 тоста, пауза таймера 6с при наведении курсора, инлайн-форма быстрого ответа, крестик закрытия, безопасные отступы на мобильных). Подавление тостов при нахождении пользователя в активном диалоге с отправителем.

---

## 3. Статус пунктов задания

| № | Пункт задания | Статус | Доказательство |
|---|---|---|---|
| 1 | **Миграция `070_notifications.sql`**: таблица `notifications` (9 типов: friend_request, friend_accepted, new_message, missed_call, comment, reaction, group_invite, milestone, system), RLS (клиентский insert строго запрещён, только владелец читает/помечает), составной индекс `(user_id, read_at, created_at desc)`, публикация в `supabase_realtime` | **DONE** | [070_notifications.sql](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/070_notifications.sql), [SQL_ORDER.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/SQL_ORDER.md), [qa_notifications_test.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/qa_notifications_test.txt) |
| 2 | **Триггеры БД и умная агрегация**: триггер сообщений с агрегацией за 5 минут и пропуском своих/заглушённых; триггер заявок в соратники; триггер комментариев; триггер реакций (агрегация до 1 уведомления в минуту на публикацию); триггер пропущенных звонков | **DONE** | [070_notifications.sql](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/070_notifications.sql), [notifications-center.test.ts](file:///Users/user/Desktop/ogonyok-ai-clone/test/notifications-center.test.ts) |
| 3 | **RPC-функции (`security definer`)**: `get_unread_counts(uuid)`, `mark_notification_read(uuid)`, `mark_all_notifications_read()`, `mark_chat_read(uuid, text)` | **DONE** | [070_notifications.sql](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/070_notifications.sql), [notifications.ts](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/notifications.ts) |
| 4 | **Счётчики и бейджи**: хук `useUnreadCounts`, персистентность при перезагрузке страницы, бейджи (`99+`) на «Чаты», «Соратники», «Колокольчик», в заголовке вкладки `document.title` `(N) Огонёк`, динамический красный бейдж на favicon через Canvas | **DONE** | [use-unread-counts.ts](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/use-unread-counts.ts), [sidebar.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/sidebar.tsx), [bottom-nav.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/bottom-nav.tsx), [mobile-top-bar.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/mobile-top-bar.tsx) |
| 5 | **Всплывающие тосты Telegram Desktop**: стек до 3 штук (правый верхний угол десктоп, топ-центр мобильный), аватар, имя, предпросмотр типа, 6с таймер с паузой при ховере, инлайн-ответ, кнопка закрытия, подавление при активном просмотре того же чата | **DONE** | [telegram-toast-stack.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/notifications/telegram-toast-stack.tsx), [telegram-toast-desktop-1440x900.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/telegram-toast-desktop-1440x900.png), [telegram-toast-mobile-390x844.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/telegram-toast-mobile-390x844.png) |
| 6 | **Web Audio синтезатор**: чистый Web Audio API без внешних файлов, мягкий тон сообщения, аккорд заявки, нисходящий тон пропущенного звонка, разблокировка на первый жест, ползунок громкости, DND режим («Не беспокоить на 1ч / 8ч / 24ч») | **DONE** | [notification-sound.ts](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/notification-sound.ts), [notifications-settings-panel.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/settings/notifications-settings-panel.tsx), [notifications-settings-desktop-1440x900.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/notifications-settings-desktop-1440x900.png) |
| 7 | **Центр уведомлений (модальное окно / флайаут)**: группировка по дням («Сегодня», «Вчера», «Ранее»), «Отметить все прочитанными», быстрый переход к сущности, быстрый ответ на заявку в соратники («Принять»), пустое состояние | **DONE** | [notification-center-modal.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/notifications/notification-center-modal.tsx), [notifications-center-desktop-1440x900.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/notifications-center-desktop-1440x900.png), [notifications-center-mobile-390x844.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/notifications-center-mobile-390x844.png) |
| 8 | **Browser Notification API**: системные уведомления ОС при скрытой вкладке (`document.hidden`), запрос разрешений по явной кнопке в настройках | **DONE** | [notifications-settings-panel.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/settings/notifications-settings-panel.tsx) |
| 9 | **Интеграция с Telegram**: сохранено дублирование напоминаний в Telegram бот | **DONE** | [telegram-reminder-panel.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/settings/telegram-reminder-panel.tsx), [settings-view.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/views/settings-view.tsx) |

---

## 4. Список созданных и изменённых файлов

### Новые файлы:
1. `supabase/migrations/070_notifications.sql` — схема таблицы `notifications`, RLS политики, публикация в realtime, триггеры с агрегацией и 4 RPC функции.
2. `lib/ogonek/notifications.ts` — клиентские методы работы с центром уведомлений, обновление заголовка вкладки и отрисовка Canvas favicon бейджа.
3. `lib/ogonek/notification-sound.ts` — чистый Web Audio синтезатор, автоматическая разблокировка AudioContext, регулятор громкости и учёт режима DND.
4. `lib/ogonek/use-unread-counts.ts` — синглтон-хук счётчиков непрочитанного с автоматической Realtime-синхронизацией.
5. `components/ogonek/notifications/telegram-toast-stack.tsx` — всплывающий стек тостов в стиле Telegram Desktop с быстрым ответом и лимитом в 3 штуки.
6. `components/ogonek/notifications/notification-center-modal.tsx` — центр уведомлений с группировкой по дням и быстрым принятием заявок.
7. `components/ogonek/settings/notifications-settings-panel.tsx` — панель настроек звуков, громкости, режима «Не беспокоить» и разрешений браузерных уведомлений.
8. `test/notifications-center.test.ts` — 12 unit-тестов архитектуры центра уведомлений.
9. `scripts/qa/test-stage07-notifications.mjs` — интеграционный E2E тестовый сценарий (40 тест-кейсов).
10. `scripts/qa/capture-stage07-ui.mjs` — скрипт Playwright для снятия скриншотов десктоп/мобайл.
11. `night/evidence/07/*` — доказательства выполнения этапа (логи, тесты, скриншоты).

### Изменённые файлы:
1. `night/SQL_ORDER.md` — регистрация миграции `070_notifications.sql`.
2. `lib/ogonek/types.ts` — добавление ViewId `'notifications'`.
3. `components/ogonek/sidebar.tsx` — вывод пункта «Уведомления» с иконкой `Bell` и бейджами на «Чаты», «Соратники», «Уведомления».
4. `components/ogonek/bottom-nav.tsx` — вывод динамических бейджей на нижнюю панель навигации.
5. `components/ogonek/mobile-top-bar.tsx` — добавление кнопки `Bell` с бейджем непрочитанного в шапку мобильной версии.
6. `components/ogonek/messenger/chat-message-bubble.tsx` — отображение системного чипа пропущенного звонка.
7. `components/ogonek/messenger/messenger-dialog-list.tsx` — отображение текста пропущенного звонка и красного бейджа.
8. `components/ogonek/views/settings-view.tsx` — подключение вкладки `NotificationsSettingsPanel`.
9. `components/ogonek/app-shell.tsx` — монтирование `TelegramToastStack`, `NotificationCenterModal`, подписка на Realtime и проброс быстрого ответа в чат.

---

## 5. Результаты проверок и Quality Gates

1. **TypeScript compilation**:
   - Команда: `npx tsc --noEmit`
   - Результат: 0 ошибок ([tsc_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/tsc_output.txt)).
2. **ESLint**:
   - Команда: `npm run lint`
   - Результат: 0 ошибок ([lint_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/lint_output.txt)).
3. **Unit Tests**:
   - Команда: `npm run test:unit`
   - Результат: 531 тест пройден, 57 тестовых наборов, 0 упавших ([test_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/test_output.txt)).
4. **Integration QA Tests**:
   - Команда: `node scripts/qa/test-stage07-notifications.mjs`
   - Результат: 40 проверок пройдено, 0 ошибок ([qa_notifications_test.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/qa_notifications_test.txt)).
5. **Next.js Production Build**:
   - Команда: `npm run build`
   - Результат: код завершения 0, скомпилировано 27 роутов ([build_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/build_output.txt)).
6. **Playwright UI Screenshots**:
   - Desktop 1440x900:
     - [telegram-toast-desktop-1440x900.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/telegram-toast-desktop-1440x900.png)
     - [notifications-center-desktop-1440x900.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/notifications-center-desktop-1440x900.png)
     - [notifications-settings-desktop-1440x900.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/notifications-settings-desktop-1440x900.png)
     - [chats-missed-call-desktop-1440x900.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/chats-missed-call-desktop-1440x900.png)
   - Mobile 390x844:
     - [notifications-center-mobile-390x844.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/notifications-center-mobile-390x844.png)
     - [telegram-toast-mobile-390x844.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/07/telegram-toast-mobile-390x844.png)

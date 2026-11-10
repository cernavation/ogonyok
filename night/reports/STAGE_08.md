# ОТЧЁТ: ЭТАП 8 — МЕССЕНДЖЕР УРОВНЯ «ВЗРОСЛОГО ПРИЛОЖЕНИЯ»

## 1. Сводка этапа
- **Статус этапа**: DONE
- **Ветка**: `night-shift`
- **Предыдущий коммит**: `725b061` (Этап 7: центр уведомлений)
- **Цель**: Полная трансформация чата в корпоративный отказоустойчивый мессенджер с выносом медиафайлов из Base64 в защищённый приватный Storage-бакет `chat-media`, канонической реляционной моделью тредов (`threads`, `thread_members`), полным циклом управления групповыми чатами и каналами, Giphy с пагинацией и официальной атрибуцией, отложенными сообщениями со строгими лимитами тарифов, безопасным рендерингом ссылок, реакциями, ответами, пересылками, поиском и мобильной оптимизацией под 390px.

---

## 2. Ключевые архитектурные решения

1. **Полный отказ от Base64 в JSONB и переход на Storage-бакет `chat-media`**:
   - Фото, видео, голосовые и документы загружаются в приватный Supabase Storage бакет `chat-media` по пути `<uid>/<thread>/<uuid>.<ext>`.
   - В колонке `direct_messages.media` хранится исключительно компактный JSON-дескриптор: `{ url, path, mime, size, duration, width, height, thumbnail, name }`.
   - Размер строки `direct_messages` с прикреплённым фото уменьшен с **500+ КБ** (Base64) до **288 байт** (дескриптор), что даёт **99.94% экономии трафика и дискового пространства** и устраняет накладные расходы TOAST-таблиц Postgres.
   - Подписанные URL (signed URLs) со сроком жизни 1 час и клиентским in-memory кэшированием гарантируют приватность личной переписки.
   - Клиентское сжатие изображений через HTML5 Canvas (макс. 1920px, WebP/JPEG ~0.85).
   - Лимиты размеров: фото $\le 10$ МБ, голос по лимиту тарифа (`permissions.ts`), документы/видео $\le 25$ МБ.
   - Безопасный скрипт миграции старых Base64-сообщений `scripts/migrate-chat-media.mjs` (по умолчанию безопасный dry-run без запуска на prod).

2. **Каноническая реляционная модель тредов и групп (`080_messenger.sql`)**:
   - Таблицы `threads` (kind 'direct' | 'group', title, avatar, created_by, is_channel, pinned_message_id, direct_key) и `thread_members` (thread_id, user_id, role 'owner' | 'admin' | 'member', muted_until, last_read_at, cleared_until, is_pinned, is_archived, folder_id).
   - Внешний ключ `direct_messages.thread_id` с обратной совместимостью по детерминированному симметричному ключу `least:greatest`.
   - Режим канала (`is_channel = true`): обычные участники с ролью `member` могут только читать, писать разрешено только владельцу и администраторам.
   - Подписка Supabase Realtime на уровне `thread_id`.

3. **Полный цикл управления перепиской**:
   - Создание групп, переименование, смена аватара, роли (`owner` / `admin` / `member`), исключение участников, выход из группы.
   - Закрепление сообщений в треде (`threads.pinned_message_id`) с верхним баннером быстрого перехода.
   - Закрепление чатов сверху (`is_pinned`), архивация (`is_archived`), папки чатов (`chat_folders`).
   - Заглушение звука (1ч / 8ч / 1 неделя / бессрочно).
   - Очистка истории у себя (`cleared_until`) и удаление чата у себя.
   - Редактирование сообщений без ограничения по времени (зафиксировано в `night/DECISIONS.md`), удаление для всех.
   - Полнотекстовый поиск по сообщениям треда и глобально по всем чатам пользователя (`search_messages`).
   - Ответы (reply), пересылка (forward) без раскрытия приватных дневниковых записей.
   - Черновики сохраняются на сервере (`thread_drafts`) и в localStorage.
   - Индикатор набора текста («✍️ печатает…») через Realtime broadcast канал с автоочисткой через 3.5 с.
   - Статусы доставки и прочтения: `✓`, `✓✓`, в группах `✓✓ Прочитано N`.
   - Разделитель «Новые сообщения» и плавающая кнопка прокрутки вниз со счётчиком непрочитанного.

4. **Giphy и отложенные сообщения**:
   - Поиск и тренды Giphy с оффсетной пагинацией (`limit=24`, `offset`), валидацией Zod и официальным бейджем «Powered by GIPHY».
   - Интеграция GIF в комментарии ленты `components/ogonek/comments-thread.tsx`.
   - Модальное окно отложенных сообщений `ChatScheduledListModal` со строгим соблюдением тарифных лимитов (`permissions.ts`: free — 3, pro — 20, ultra — 100), отправкой прямо сейчас, редактированием и отменой.

5. **Безопасность и мобильная адаптивность**:
   - Защита от опасных URL (`safeHref`, `safeImageSrc`), жалоба на сообщение (`reportTarget`).
   - Защита от спама и блокировка отправки заблокированным пользователям.
   - Адаптивная верстка от 390px с `visualViewport`, safe-area-inset и поддержкой мобильного возврата назад.

---

## 3. Статус пунктов задания

| № | Пункт задания | Статус | Доказательство |
|---|---|---|---|
| 1 | **Убрать Base64 из JSONB**: Storage-бакет `chat-media`, путь `<uid>/<thread>/<uuid>.<ext>`, дескриптор в `direct_messages.media`, signed URLs, клиентское сжатие до 1920px Canvas, валидация MIME и размеров (фото 10МБ, голос по тарифу, доки 25МБ), размер строки $< 2$ КБ (факт 288 B, -99.94%), скрипт миграции `scripts/migrate-chat-media.mjs` (dry-run по умолчанию) | **DONE** | [080_messenger.sql](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/080_messenger.sql), [chat-media.ts](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/chat-media.ts), [migrate-chat-media.mjs](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/migrate-chat-media.mjs), [qa_report.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/08/qa_report.md) |
| 2 | **Каноническая реляционная модель**: таблицы `threads`, `thread_members`, `chat_folders`, `thread_drafts`, колонка `thread_id` в `direct_messages`, ленивое создание direct по ключу `least:greatest`, RLS (только участники читают/пишут, режим канала `is_channel` только админы пишут), Realtime по `thread_id` | **DONE** | [080_messenger.sql](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/080_messenger.sql), [SQL_ORDER.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/SQL_ORDER.md), [test-stage08-messenger.mjs](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/qa/test-stage08-messenger.mjs) |
| 3 | **Управление чатами**: создание групп, смена названия/аватара, добавление/удаление участников, роли (`owner`/`admin`/`member`), выход из группы, режим канала («только админы пишут»), закрепление сообщения в шапке, закреп чата, архив, папки, заглушение, очистка истории у себя | **DONE** | [chat-group-settings-modal.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/chat-group-settings-modal.tsx), [messenger-chat-pane.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/messenger-chat-pane.tsx), [api.ts](file:///Users/user/Desktop/ogonyok-ai-clone/lib/supabase/api.ts) |
| 4 | **Сообщения и функционал**: поиск внутри треда и по всем чатам, ответы (reply), пересылка (forward), редактирование сообщений без ограничения по времени, удаление для всех, реакции, `@username` упоминания, черновики в БД и localStorage, «печатает…» через broadcast | **DONE** | [chat-composer.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/chat-composer.tsx), [chat-message-bubble.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/chat-message-bubble.tsx), [DECISIONS.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/DECISIONS.md) |
| 5 | **Счётчик непрочитанного и навигация**: `last_read_at` в `thread_members`, серверный подсчёт, разделитель «Новые сообщения» при открытии, плавающая кнопка вниз со счётчиком непрочитанных, статусы `✓` и `✓✓ Прочитано N` | **DONE** | [messenger-chat-pane.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/messenger-chat-pane.tsx), [chat-message-bubble.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/chat-message-bubble.tsx) |
| 6 | **GIF и Giphy**: маршрут `/api/giphy` с оффсетной пагинацией (`offset`), тренды, поиск, атрибуция «Powered by GIPHY», интеграция в комментарии ленты | **DONE** | [route.ts](file:///Users/user/Desktop/ogonyok-ai-clone/app/api/giphy/route.ts), [api-validator.ts](file:///Users/user/Desktop/ogonyok-ai-clone/lib/server/api-validator.ts), [chat-gif-modal.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/chat-gif-modal.tsx), [comments-thread.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/comments-thread.tsx) |
| 7 | **Отложенные сообщения**: модальное окно `ChatScheduledListModal` со списком, возможностью отправить сейчас, изменить текст/время, отменить, индикатор лимита тарифа | **DONE** | [chat-scheduled-list-modal.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/chat-scheduled-list-modal.tsx), [messenger-chat-pane.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/messenger-chat-pane.tsx) |
| 8 | **Безопасность и модерация**: защита ссылок `safeHref`, жалоба на сообщение `reportTarget`, блокировка отправки заблокированным | **DONE** | [safe-url.ts](file:///Users/user/Desktop/ogonyok-ai-clone/lib/ogonek/safe-url.ts), [messenger-chat-pane.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/messenger-chat-pane.tsx), [080_messenger.sql](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/080_messenger.sql) |
| 9 | **Мобильная верстка и производительность**: респонсивность на 390px, `visualViewport` для клавиатуры, safe-area, пагинация по 30 сообщений, оптимистичная отправка | **DONE** | [messenger-chat-pane.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/messenger/messenger-chat-pane.tsx), [messenger-mobile-chat-390x844.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/08/messenger-mobile-chat-390x844.png) |
| 10 | **QA верификация (3 пользователя u_a, u_b, u_c)**: создание группы, отправка фото, реакции, ответ, редактирование, режим канала, исключение участника, удаление для всех, unread бейджи | **DONE** | [test-stage08-messenger.mjs](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/qa/test-stage08-messenger.mjs), [qa_report.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/08/qa_report.md) (56/56 тестов пройдено) |

---

## 4. Список созданных и изменённых файлов

### Новые файлы:
1. `supabase/migrations/080_messenger.sql` — схема таблиц `threads`, `thread_members`, `chat_folders`, `thread_drafts`, Storage-бакет `chat-media`, RLS политики, 18 RPC функций.
2. `lib/ogonek/chat-media.ts` — клиентский модуль загрузки и проверки медиа в бакет `chat-media`, генерация подписанных URL с кэшированием, Canvas-сжатие до 1920px.
3. `scripts/migrate-chat-media.mjs` — скрипт миграции старых Base64-сообщений в Storage с безопасным dry-run по умолчанию.
4. `components/ogonek/messenger/chat-group-settings-modal.tsx` — модальное окно настроек группы (название, аватар, роли, режим канала, добавление/удаление соратников).
5. `components/ogonek/messenger/chat-scheduled-list-modal.tsx` — модальное окно списка отложенных сообщений с редактированием, отменой и индикатором тарифа.
6. `test/messenger-enterprise.test.ts` — 7 unit-тестов размера дескриптора, MIME-валидации, Giphy-пагинации, лимитов тарифов и режима каналов.
7. `scripts/qa/test-stage08-messenger.mjs` — E2E QA тестовый сценарий (56 проверок жизненного цикла мессенджера).
8. `scripts/qa/capture-stage08-ui.mjs` — скрипт Playwright для снятия скриншотов десктоп и мобильной версий.
9. `night/evidence/08/*` — артефакты доказательств (логи сборки, линтинга, тестов, скриншоты десктоп и мобайл).

### Изменённые файлы:
1. `night/DECISIONS.md` — фиксация архитектурных решений (приватный Storage-бакет `chat-media`, подписанные URL с кэшированием, неограниченное время редактирования сообщений).
2. `night/SQL_ORDER.md` — регистрация миграции `080_messenger.sql`.
3. `lib/server/api-validator.ts` — добавление `offset` пагинации в `GiphyQuerySchema`.
4. `app/api/giphy/route.ts` — проброс `offset` в запрос к Giphy API.
5. `components/ogonek/messenger/chat-gif-modal.tsx` — поддержка пагинации («Загрузить ещё») и официальный бейдж «Powered by GIPHY».
6. `components/ogonek/comments-thread.tsx` — интеграция выбора GIF через `ChatGifModal` и безопасный рендеринг в комментариях.
7. `lib/supabase/api.ts` — добавление 18 клиентских методов вызова RPC тредов, групп, архива, закрепов и отложенных сообщений.
8. `components/ogonek/messenger/chat-composer.tsx` — интеграция загрузки фото через `uploadChatMedia`, шкала прогресса с отменой, автокомплит `@упоминаний`, триггер статуса «печатает…».
9. `components/ogonek/messenger/chat-voice-recorder.tsx` — отправка голосовых напрямую в `chat-media` Storage вместо Base64.
10. `components/ogonek/messenger/chat-message-bubble.tsx` — расширенная плашка статуса прочтения в группах (`✓✓ Прочитано N`), кнопка «Пожаловаться», поддержка безопасных ссылок.
11. `components/ogonek/messenger/new-chat-modal.tsx` — загрузка аватара через `uploadChatMedia`, создание группы через `createGroupThread`.
12. `components/ogonek/messenger/messenger-chat-pane.tsx` — разделитель «Новые сообщения», бейдж непрочитанных на кнопке скролла, индикатор «✍️ печатает…», подключение `ChatGroupSettingsModal` и `ChatScheduledListModal`.
13. `lib/ogonek/types.ts` — типизация полей `id`, `isChannel`, `currentUserRole` в `ChatThreadState`.

---

## 5. Результаты проверок и Quality Gates

1. **TypeScript compilation**:
   - Команда: `npx tsc --noEmit`
   - Результат: 0 ошибок ([tsc_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/08/tsc_output.txt)).
2. **ESLint**:
   - Команда: `npm run lint`
   - Результат: 0 ошибок ([lint_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/08/lint_output.txt)).
3. **Unit Tests**:
   - Команда: `npm run test:unit`
   - Результат: 539 тестов пройдено, 0 ошибок ([test_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/08/test_output.txt)).
4. **Next.js Production Build**:
   - Команда: `npm run build`
   - Результат: Exit code 0, 27 статических/динамических маршрутов успешно скомпилированы ([build_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/08/build_output.txt)).
5. **QA E2E Matrix Test**:
   - Команда: `node scripts/qa/test-stage08-messenger.mjs`
   - Результат: 56 из 56 тестов пройдено (100%), размер дескриптора 288 B ($< 2$ КБ), экономия 99.94% ([qa_report.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/08/qa_report.md), [qa_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/08/qa_output.txt)).
6. **Pre-commit Secrets Audit**:
   - Команда: `node scripts/pre-commit-secrets-check.mjs`
   - Результат: 0 утечек секретов.
7. **Playwright Screenshots**:
   - `messenger-desktop-chat-1440x900.png` — переписка с закреплённым сообщением, историей и вложениями.
   - `messenger-giphy-modal-desktop-1440x900.png` — модальное окно поиска GIF с трендами, пагинацией и атрибуцией «Powered by GIPHY».
   - `messenger-chat-menu-desktop-1440x900.png` — выпадающее меню действий с чатом (управление группой, отложенные сообщения, архив).
   - `messenger-mobile-chat-390x844.png` — полноэкранный чат на мобильном устройстве (390x844) со строкой ввода и быстрыми ответами.

---

## 6. Итог

Этап 8 полностью завершён со статусом **DONE**. База данных staging и клиент приложения оснащены мессенджером корпоративного уровня с нулевым загрязнением JSONB Base64-данными, реляционными группами, режимом каналов, пагинацией Giphy, отложенными сообщениями и полной защитой приватности.

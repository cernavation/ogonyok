# ОТЧЁТ: ЭТАП 6 — ПОЛНЫЙ ПЕРЕСМОТР СИСТЕМЫ СОРАТНИКОВ (SOCIAL GRAPH, BLOCKING, INVITES & FEED)

## 1. Сводка этапа
- **Статус этапа**: DONE
- **Ветка**: `night-shift`
- **Предыдущий коммит**: `c8b7c58` (Этап 5: лимиты и защита от злоупотреблений)
- **Цель**: Полная замена устаревшей, ограниченной 40 профилями системы друзей на канонический масштабируемый социальный граф «Соратники»: симметричные заявки, односторонние подписки, блокировки, жалобы, полнотекстовый серверный поиск по всей базе с ранжированием, канонические инвайт-ссылки `/invite/[username]`, страницы `/u/[username]`, автодобавление после регистрации и серверная изолированная лента.

---

## 2. Статус пунктов задания

| № | Пункт задания | Статус | Доказательство |
|---|---|---|---|
| 1 | **Модель данных `060_social.sql`**: `friendships` с симметричным индексом `(least, greatest)` и `CHECK requester <> addressee`, `follows`, `blocks`, `reports`, `notifications` с RLS | **DONE** | [060_social.sql](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/060_social.sql), [qa_social_test.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/qa_social_test.txt), [social-system.test.ts](file:///Users/user/Desktop/ogonyok-ai-clone/test/social-system.test.ts) |
| 2 | **11 RPC функций `security definer`**: `send_friend_request`, `respond_friend_request`, `remove_friend`, `cancel_friend_request`, `block_user`, `unblock_user`, `report_target`, `toggle_follow`, `search_profiles`, `get_feed`, `get_social_counts` | **DONE** | [060_social.sql](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/060_social.sql), [social_verification.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/social_verification.md) |
| 3 | **Полнотекстовый поиск `search_profiles`**: дебаунс 300мс, ранжирование `exact username (100) > prefix (80) > display_name (60/50/30) > city (20)`, поддержка составных имён, исключение заблокированных и `privacy.discoverable = false` | **DONE** | [060_social.sql](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/060_social.sql), [comrades_search_desktop.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/comrades-search-desktop-1440x900.png), [qa_social_test.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/qa_social_test.txt) |
| 4 | **UI/Навигация**: раздел «Соратники» отдельным пунктом в Sidebar и BottomNav с иконкой `Users` и динамическим бейджем входящих заявок | **DONE** | [sidebar.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/sidebar.tsx), [bottom-nav.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/bottom-nav.tsx), [comrades-desktop-1440x900.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/comrades-desktop-1440x900.png), [comrades-mobile-390x844.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/comrades-mobile-390x844.png) |
| 5 | **Вкладки раздела**: «Соратники», «Заявки» (входящие / исходящие), «Найти», «Подписки», «Группы» | **DONE** | [comrades-view.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/views/comrades-view.tsx), [comrades-desktop-1440x900.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/comrades-desktop-1440x900.png) |
| 6 | **Пустое состояние «Соратники»**: 3 карточки действий («Найти по нику», «Скопировать ссылку-приглашение», «Показать QR-код») + модальное окно QR + пояснение прав соратников | **DONE** | [comrades-view.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/views/comrades-view.tsx), [comrades-qr-desktop-1440x900.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/comrades-qr-desktop-1440x900.png) |
| 7 | **Публичная страница `/invite/[username]`**: Server Component + Client Interactivity, карточка приглашающего со стриком и днями, кнопка «Присоединиться», автоотправка заявки после регистрации через `sessionStorage`, 404 с CTA для несуществующих/скрытых, динамический Open Graph | **DONE** | [app/invite/[username]/page.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/app/invite/[username]/page.tsx), [invite-client.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/app/invite/[username]/invite-client.tsx), [invite-desktop-1440x900.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/invite-desktop-1440x900.png), [invite-mobile-390x844.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/invite-mobile-390x844.png) |
| 8 | **Публичная страница `/u/[username]`**: профиль пользователя, кнопки действий, открытые записи соратника, Open Graph | **DONE** | [app/u/[username]/page.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/app/u/[username]/page.tsx), [profile-desktop-1440x900.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/profile-desktop-1440x900.png) |
| 9 | **Серверная лента**: вкладки «Мои гордости / Соратники / Подписки» на главной странице загружают публикации через RPC `get_feed(scope)` с изоляцией по RLS | **DONE** | [home-view.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/views/home-view.tsx), [qa_social_test.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/qa_social_test.txt) |
| 10 | **Зачистка устаревшего кода**: устранён лимит 40 пользователей, переписан `FriendsManager`, вычищены устаревшие упоминания «Друзья» в UI на канонический термин «Соратники» | **DONE** | [friends-manager.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/friends-manager.tsx), [profile-view.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/views/profile-view.tsx) |

---

## 3. Список созданных и изменённых файлов

### Новые файлы:
1. `supabase/migrations/060_social.sql` — полная миграция социального графа (схемы, симметричный индекс, RLS, 11 RPC).
2. `lib/ogonek/social.ts` — клиентские и серверные хелперы для всех социальных взаимодействий.
3. `components/ogonek/views/comrades-view.tsx` — полнофункциональный интерфейс соратников со всеми вкладками, живым поиском, модалками QR и репортов.
4. `app/invite/[username]/page.tsx` — серверный компонент страницы приглашения с Open Graph метаданными и 404-карточкой.
5. `app/invite/[username]/invite-client.tsx` — клиентский интерактивный компонент инвайта с сохранением намерения в `sessionStorage`.
6. `app/u/[username]/page.tsx` — серверный компонент публичного профиля соратника.
7. `app/u/[username]/user-profile-client.tsx` — клиентский компонент публичного профиля.
8. `test/social-system.test.ts` — 12 unit-тестов архитектуры и ограничений социального графа.
9. `scripts/qa/test-stage06-social.mjs` — интеграционный E2E-тест (51 тест-кейс).
10. `scripts/qa/capture-stage06-ui.mjs` — скрипт захвата скриншотов Playwright десктоп/мобайл.
11. `night/evidence/06/*` — все обязательные доказательства, логи и скриншоты.

### Изменённые файлы:
1. `night/SQL_ORDER.md` — регистрация миграции `060_social.sql`.
2. `lib/ogonek/types.ts` — добавление ViewId `'comrades'`.
3. `lib/ogonek/friends.ts` — подключение динамического резолвинга профилей из `social.ts`.
4. `lib/ogonek/data.ts` — обновление табов ленты (`['Мои гордости', 'Соратники', 'Подписки']`).
5. `components/ogonek/sidebar.tsx` — раздел «Соратники» с бейджем входящих заявок.
6. `components/ogonek/bottom-nav.tsx` — раздел «Соратники» в мобильной навигации.
7. `components/ogonek/app-shell.tsx` — роутинг и рендеринг `ComradesView`.
8. `components/ogonek/auth/auth-form.tsx` — автоотправка заявки в соратники после успешной регистрации при наличии pending invite в `sessionStorage`.
9. `components/ogonek/views/home-view.tsx` — подключение серверной загрузки ленты через `getFeed(scope)` и копирование канонической ссылки `/invite/[username]`.
10. `components/ogonek/friends-manager.tsx` — делегирование на `ComradesView`.
11. `components/ogonek/views/profile-view.tsx` — замена термина «Друзья» на «Соратники».

---

## 4. Результаты проверок и Quality Gates

1. **TypeScript compilation**:
   - Команда: `npx tsc --noEmit`
   - Результат: **0 ошибок** ([tsc_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/tsc_output.txt))
2. **Lint**:
   - Команда: `npm run lint`
   - Результат: **0 ошибок** ([lint_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/lint_output.txt))
3. **Unit Tests**:
   - Команда: `npm run test:unit`
   - Результат: **519 тестов пройдено, 0 ошибок** в 56 тест-сьютах ([test_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/test_output.txt))
4. **Next.js Production Build**:
   - Команда: `npm run build`
   - Результат: **Exit code 0**, 27 страниц успешно собрано (включая `/invite/[username]`, `/u/[username]`, `/chats`, `/api/*`) ([build_output.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/build_output.txt))
5. **Интеграционные QA-тесты социального графа**:
   - Команда: `node scripts/qa/test-stage06-social.mjs`
   - Результат: **51 из 51 пройдено (100%)** ([qa_social_test.txt](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/06/qa_social_test.txt))
6. **Playwright скриншоты**:
   - `comrades-desktop-1440x900.png` (1440x900 десктоп)
   - `comrades-mobile-390x844.png` (390x844 мобильный)
   - `comrades-qr-desktop-1440x900.png` (QR модалка)
   - `comrades-search-desktop-1440x900.png` (поиск десктоп)
   - `invite-desktop-1440x900.png` (`/invite/cernavation` десктоп)
   - `invite-mobile-390x844.png` (`/invite/cernavation` мобильный)
   - `profile-desktop-1440x900.png` (`/u/cernavation` десктоп)

---

## 5. Решения и архитектурные компромиссы
1. **Симметричный уникальный индекс**:
   `CREATE UNIQUE INDEX uq_friendships_pair_symmetric ON public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));`
   Это полностью исключает дублирующиеся записи дружбы между двумя пользователями, исключая race conditions.
2. **Обратная совместимость со старыми колонками `user_id` / `friend_id`**:
   Добавлен триггер `sync_friendship_legacy_fields()`, который при вставке или обновлении синхронизирует `requester_id` $\leftrightarrow$ `user_id` и `addressee_id` $\leftrightarrow$ `friend_id`. Это гарантирует бесперебойную работу любого legacy кода.
3. **Сохранение намерения инвайта**:
   При переходе неавторизованного пользователя на `/invite/[username]` мы сохраняем целевой `userId` в `sessionStorage`. После прохождения формы регистрации в `auth-form.tsx` функция `finish()` автоматически вызывает `sendFriendRequest(targetId)` и очищает хранилище.

---

## 6. Риски и рекомендации для следующих этапов
- В Этапе 7 (Realtime уведомления и чат) таблица `notifications` уже создана в миграции `060_social.sql` и готова к интеграции с Postgres Changes и WebPush.
- В Этапе 8 (Мессенджер) и Этапе 9 (Группы) вкладка «Группы» в `ComradesView` уже имеет заготовленный таб и контейнер.
- Next.js 16.4.0 сообщает рекомендацию об обновлении пакета:
  `next upgrade --agent=security --internal-nudge-id=7daca6b1-fbc6-456e-8f7d-22178d4523a2`. Рекомендуется выполнить его в отдельном git worktree при необходимости.

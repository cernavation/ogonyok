# ОТЧЁТ: ЭТАП 9 — ГРУППЫ («СЕМЬЯ», «СПОРТСМЕНЫ») И АУДИТОРИЯ КАЖДОЙ ЗАПИСИ

## 1. Сводка этапа
- **Статус этапа**: DONE
- **Ветка**: `night-shift`
- **Предыдущий коммит**: `225ee25` (Этап 8: мессенджер уровня «взрослого приложения»)
- **Цель**: Реализация системы групп («Семья», «Спортсмены») и публикация конкретной гордости или благодарности внутри дня в строго заданную аудиторию (лично, соратникам, всем или выбранным группам). Синхронизация групп с тредами мессенджера (Stage 8), лента группы, инвайт-ссылки `/g/[code]` со сроком 7 дней, бейджи аудитории в ленте, редактирование аудитории опубликованных постов («Кому видно») и соблюдение тарифных квот (`maxGroupsOwned`, `maxGroupMembers`).

---

## 2. Ключевые архитектурные решения

1. **Индивидуальная аудитория каждой записи внутри одного дня**:
   - Каждая гордость (`prides`) и благодарность (`gratitudes`) внутри дня имеет собственный уровень видимости (`visibility`: `'private' | 'friends' | 'public' | 'groups'`).
   - Для уровня `groups` в связующей таблице `entry_audiences(entry_kind, entry_id, entry_client_id, group_id)` сохраняются привязки к конкретным группам автора.
   - Один день может содержать: гордость №1 только для группы «Семья», гордость №2 для «Спортсмены», гордость №3 лично себе, а благодарность №1 всем соратникам.

2. **Модель данных и безопасность Supabase (`090_groups.sql`)**:
   - Таблица `groups`: `id, owner_id, name, kind ('family'|'sport'|'friends'|'custom'), description, avatar, color, invite_code, invite_expires_at, thread_id, created_at, updated_at`.
   - Таблица `group_members`: `group_id, user_id, role ('owner'|'admin'|'member'), status ('invited'|'active'), joined_at`.
   - Таблица `entry_audiences`: уникальное сопоставление `(entry_kind, entry_id, group_id)` с индексами для быстрого поиска ленты группы и проверки прав.
   - Политики RLS на `prides`, `gratitudes` и `days`: активные участники групп видят опубликованные в группу записи; личные записи видит только автор; записи соратникам видны только при подтверждённой взаимной дружбе.
   - 8 RPC-функций:
     1. `create_group`: создаёт группу, автоматически связывает её с групповым тредом из этапа 8 (`threads`), регистрирует владельца в `group_members` и `thread_members`, проверяя квоту тарифа `maxGroupsOwned`.
     2. `invite_to_group`: создаёт инвайт-ссылку с кодом и сроком жизни ровно 7 дней (`now() + interval '7 days'`) или отправляет прямое приглашение соратнику со статусом `accepted`.
     3. `join_group_by_invite`: валидирует код приглашения, проверяет срок годности (до 7 дней) и лимит участников `maxGroupMembers`, добавляя пользователя в `group_members` и `thread_members`.
     4. `leave_group`: безопасный выход участника; при выходе владельца передаёт группу следующему участнику или удаляет пустую группу.
     5. `remove_member`: исключение участника владельцем/администратором с одновременным отзывом доступа к треду.
     6. `update_entry_audience`: атомарное обновление видимости записи и привязок к группам в `entry_audiences` с антиспам-агрегацией уведомлений за 10 минут.
     7. `get_group_feed`: защищённая лента записей группы с пагинацией и данными авторов.
     8. `get_user_groups`: получение групп пользователя с подсчётом активных участников.

3. **UI / UX композера и ленты**:
   - В композере (`components/ogonek/composer.tsx`) каждая запись оснащена компонентом `EntryAudiencePicker`:
     - Компактный чип: «Лично ▾», «Соратникам ▾», «Всем ▾», «Семья ▾» с цветовой и иконочной дифференциацией.
     - Выпадающее меню с чекбоксами групп пользователя и кнопкой «Применить ко всем записям дня».
     - Предупреждение при публикации «Всем»: «Запись появится в общем поиске и глобальной ленте».
     - По умолчанию подставляется настройка приватности из профиля пользователя (fallback: «Лично»).
   - Раздел «Группы» в «Соратниках» (`components/ogonek/groups-section.tsx`):
     - Список групп пользователя с индикацией квоты тарифа (например, 1 из 1 для Free, 1 из 5 для Pro).
     - Модальное окно создания группы: название, тип (Семья, Спорт, Друзья, Соратники), аватар-эмодзи, палитра цветов, описание и быстрый выбор соратников для приглашения.
     - Страница группы: хедер, кнопка быстрого перехода в чат группы, копирование инвайт-ссылки, вкладки «Лента записей» и «Участники».
   - Фильтр ленты `HomeView` (`components/ogonek/views/home-view.tsx`):
     - Вкладки фильтров дополнены группами пользователя (`Группа: Семья`, `Группа: Спортсмены`...).
     - При выборе группы загружаются записи участников, адресованные в эту группу.
     - На карточках дней (`DayCard`) отображаются бейджи аудитории (`👥 Семья`, `👥 Соратникам`, `🌐 Всем`, `🔒 Лично`).
   - Редактирование аудитории опубликованного поста (`DayOptionsModal`):
     - В меню ⋯ добавлен пункт «Кому видно (аудитория)» с возможностью переключения аудитории для каждой гордости без перезагрузки страницы.
   - Публичная страница инвайта `app/g/[code]/page.tsx` с проверкой срока жизни (7 дней) и кнопкой вступления.

4. **Тарифные квоты (`lib/ogonek/permissions.ts`)**:
   - `maxGroupsOwned`: free — 1, pro — 5, ultra — 20.
   - `maxGroupMembers`: free — 5, pro — 25, ultra — 100.
   - Проверяются на сервере в RPC `create_group` и `join_group_by_invite`, а также валидируются клиентом перед открытием модалки.

---

## 3. Статус пунктов задания

| № | Пункт задания | Статус | Доказательство |
|---|---|---|---|
| 1 | **Модель данных и миграция `090_groups.sql`**: таблицы `groups`, `group_members`, `entry_audiences`, расширение `visibility` на `'groups'`, RLS-политики, 8 RPC-функций, лимиты тарифов | **DONE** | [090_groups.sql](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/090_groups.sql), [SQL_ORDER.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/SQL_ORDER.md), [test-stage09-groups.mjs](file:///Users/user/Desktop/ogonyok-ai-clone/scripts/qa/test-stage09-groups.mjs) |
| 2 | **Композер с индивидуальной аудиторией**: чип «Лично ▾» / «Соратникам ▾» / «Всем ▾» / «Семья ▾», выпадашка с чекбоксами групп, предупреждение «Всем», «Применить ко всем записям дня», fallback на дефолт профиля | **DONE** | [entry-audience-picker.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/entry-audience-picker.tsx), [composer.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/composer.tsx), [composer-audience-picker.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/09/composer-audience-picker.png) |
| 3 | **Раздел «Группы» в «Соратниках»**: список групп, отображение лимитов тарифа, модалка создания (название, тип, цвет, аватар, соратники), детальный вид группы (хедер, кнопка «Чат группы», лента записей, состав участников) | **DONE** | [groups-section.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/groups-section.tsx), [comrades-view.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/views/comrades-view.tsx), [comrades-groups-tab.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/09/comrades-groups-tab.png), [create-group-modal.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/09/create-group-modal.png) |
| 4 | **Фильтр ленты и бейджи постов**: вкладки «Группа: Семья / Спортсмены» в `HomeView`, бейдж аудитории на посте в `DayCard`, пункт «Кому видно» в меню ⋯ с моментальным применением | **DONE** | [home-view.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/views/home-view.tsx), [day-card.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/day-card.tsx), [day-options-modal.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/components/ogonek/day-options-modal.tsx) |
| 5 | **Инвайты и публичный лендинг `/g/[code]`**: ссылка-приглашение со сроком 7 дней, страница группы, проверка авторизации, вступление | **DONE** | [page.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/app/g/[code]/page.tsx), [group-invite-client.tsx](file:///Users/user/Desktop/ogonyok-ai-clone/app/g/[code]/group-invite-client.tsx), [group-invite-landing.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/09/group-invite-landing.png) |
| 6 | **Матрица 4 пользователей ($u_a, u_b, u_c, u_d$)**: строгая верификация видимости записей одного дня | **DONE** | [audience_matrix.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/09/audience_matrix.md), [groups-audience.test.ts](file:///Users/user/Desktop/ogonyok-ai-clone/test/groups-audience.test.ts) |

---

## 4. Качественные метрики и Quality Gates

1. **TypeScript compilation**:
   - `npx tsc --noEmit` -> **0 ошибок**.
2. **Unit Tests (`npm run test:unit`)**:
   - 62 тест-сьюта, **544 теста пройдено, 0 ошибок**.
   - Новые тесты: `test/groups-audience.test.ts` (проверка квот тарифов, матрицы 4 пользователей, 7-дневных инвайтов).
3. **Automated QA Verification (`node scripts/qa/test-stage09-groups.mjs`)**:
   - **26 проверок пройдено, 0 ошибок**.
   - Сгенерирован отчёт [audience_matrix.md](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/09/audience_matrix.md).
4. **Playwright UI Screen Captures**:
   - [composer-audience-picker.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/09/composer-audience-picker.png)
   - [comrades-groups-tab.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/09/comrades-groups-tab.png)
   - [create-group-modal.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/09/create-group-modal.png)
   - [group-invite-landing.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/09/group-invite-landing.png)
   - [mobile-feed-groups.png](file:///Users/user/Desktop/ogonyok-ai-clone/night/evidence/09/mobile-feed-groups.png)
5. **Next.js Production Build (`npm run build`)**:
   - Выполнен успешно (exit code 0), маршрут `/g/[code]` скомпилирован.

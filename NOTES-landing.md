# NOTES-landing.md — Аудит архитектуры, маршрутов и блоков лендинга

Документ создан в рамках **Шага 0** работы над обновлением лендинга и маркетинговых страниц Priday.
Рабочая ветка: `landing-v2`.

---

## 0. Зафиксированные принципы и правила работы

1. **Изоляция приложения**: Внутреннее веб-приложение (Лента дня, Поиск/Explore, Чаты и звонки, Профиль, Evidence Vault, Премиум, Аналитика, Рейтинг лидеров, Намерения, Настройки, логика авторизации и хранение данных в Supabase/LocalStorage) является закрытой зоной и не модифицируется.
2. **Обязательные ключевые элементы для сохранения и улучшения**:
   - 3D-блок с вращающейся Землёй и отзывами (`TestimonialGlobe`);
   - Блок тарифов и поддержки с интерактивными карточками (`GlowCard`);
   - Страница `/ai` с анимированным фоном из кода/глифов (`GlyphBackground`);
   - Главное кинематографичное фоновое видео (`mainvideo.mp4` в `MediaSlot`);
   - Плавные аппаратные анимации появления и взаимодействия (`useScrollReveal`, Framer Motion).
3. **Требования к редактуре и копирайтингу**:
   - Коротко, живо, по-русски.
   - Заголовок блока: до 7 слов.
   - Подзаголовок блока: до 20 слов.
   - Отсутствие стен текста и канцелярских штампов.
   - Никаких вымышленных социальных доказательств и чисел (убираем или заменяем «126 человек», «4.9 из 5» и псевдометрики на честные продуктовые факты).

---

## Список А. Все маршруты и страницы проекта

В проекте используется Next.js App Router. Ниже приведены все страницы и маршруты с указанием пути, файла и краткого назначения.

### Публичные и маркетинговые страницы

1. `/` (`app/page.tsx`): Главная точка входа — для неавторизованных пользователей отображает публичный Apple-стиль лендинг (`LandingPage`), а для авторизованных пользователей загружает интерфейс приложения (`AppShell`).
2. `/ai` (`app/ai/page.tsx`): Маркетинговая промо-страница ИИ-наставника с интерактивным анимированным матричным фоном из символов (`GlyphBackground`), демонстрацией 4 задач ИИ, шкалы преодоления 1–10★ и тарифов.
3. `/platform` (`app/platform/page.tsx`): Обзорная страница возможностей платформы (вечерний ритуал, Evidence Vault, P2P-звонки, несгораемый стрик, защита приватности).
4. `/community` (`app/community/page.tsx`): Публичная страница сообщества с витриной тематических клубов (бег, фаундеры, ранний подъем, чтение), историями участников и форматом сторис.
5. `/reviews` (`app/reviews/page.tsx`): Каталог историй и отзывов участников с категоризацией по жизненным сферам (спорт, карьера, семья, мышление) и полнотекстовым поиском.
6. `/modes` (`app/modes/page.tsx`): Презентация четырёх ключевых жизненных опор (спорт и тело, карьера и бизнес, семья и близкие, дух и творчество) с интерактивным переключением карточек.
7. `/how-it-works` (`app/how-it-works/page.tsx`): Страница об анатомии и нейробиологии вечернего ритуала (эффект Зейгарник, переключение с кортизолового стресса, опора на твёрдые факты).
8. `/examples` (`app/examples/page.tsx`): Практическое руководство по формулированию ежедневных побед со сравнением слабых и сильных записей, разбором шкалы преодоления и уровней сложности.
9. `/manifesto` (`app/manifesto/page.tsx`): Манифест платформы и открытое письмо создателя Александра Церны об опыте непрерывного стрика 740+ дней и философии преодоления.
10. `/support` (`app/support/page.tsx`): Центр поддержки, база знаний с частыми вопросами (FAQ) и форма обратной связи.
11. `/privacy` (`app/privacy/page.tsx`): Страница политики конфиденциальности, описания секретного режима, гарантий отсутствия рекламы и изоляции ИИ (Zero-Training).
12. `/terms` (`app/terms/page.tsx`): Условия использования сервиса, правовые гарантии сохранения прав на контент за пользователем и этические нормы сообщества.
13. `/login` (`app/login/page.tsx`): Отдельная посадочная страница входа в аккаунт с промо-колонкой ритуала и формой авторизации.
14. `/register` (`app/register/page.tsx`): Страница регистрации с двухэтапным выбором суточного ритма (1–5 гордостей) и формой создания учётной записи.
15. `/invite/[username]` (`app/invite/[username]/page.tsx`): Персональная посадочная страница приглашения от конкретного пользователя с карточкой профиля, стриком и CTA-кнопкой старта.

### Внутренние маршруты приложения и служебные редиректы

16. `/chats` (`app/chats/page.tsx`): Страница приложения с полноэкранным интерфейсом мессенджера, папками диалогов и контактами.
17. `/chats/[id]` (`app/chats/[id]/page.tsx`): Страница приложения с открытым конкретным диалогом в мессенджере.
18. `/premium` (`app/premium/page.tsx`): Служебный маршрут-редирект на главную страницу с параметром `/?modal=premium` для открытия модального окна управления тарифами в приложении.

### Системные роуты и API-эндпоинты

- `/auth/callback` (`app/auth/callback/route.ts`): Обработчик OAuth-авторизации Supabase (Google, Magic Link).
- `/api/auth/signup` (`app/api/auth/signup/route.ts`): Серверная регистрация профиля.
- `/api/auth/check-username` (`app/api/auth/check-username/route.ts`): Проверка доступности юзернейма.
- `/api/account/delete` (`app/api/account/delete/route.ts`): Удаление учётной записи и связанных данных.
- `/api/ai/evaluate` (`app/api/ai/evaluate/route.ts`): Оценка преодоления и вердикт ИИ-наставника.
- `/api/ai/evaluate-day` (`app/api/ai/evaluate-day/route.ts`): Глубокий нейросетевой разбор дня.
- `/api/evaluate` (`app/api/evaluate/route.ts`): Базовый эндпоинт анализа записей дня.
- `/api/achievements/verify` (`app/api/achievements/verify/route.ts`): Верификация загруженных доказательств.
- `/api/achievements/regulate` (`app/api/achievements/regulate/route.ts`): Модерация и регламентация достижений.
- `/api/billing/webhook` (`app/api/billing/webhook/route.ts`): Вебхук обработки транзакций подписки.
- `/api/calls/missed` (`app/api/calls/missed/route.ts`): Фиксация пропущенных WebRTC-звонков.
- `/api/cron/deliver-scheduled` (`app/api/cron/deliver-scheduled/route.ts`): Доставка отложенных сообщений в чатах.
- `/api/friends/requests` (`app/api/friends/requests/route.ts`): Обработка запросов в друзья.
- `/api/friends/search` (`app/api/friends/search/route.ts`): Поиск людей по имени.
- `/api/friends/feed` (`app/api/friends/feed/route.ts`): Лента публикаций друзей.
- `/api/friends/report` (`app/api/friends/report/route.ts`): Жалобы на контент.
- `/api/friends/block` (`app/api/friends/block/route.ts`): Блокировка пользователей.
- `/api/giphy` (`app/api/giphy/route.ts`): Поиск GIF-стикеров для чатов.
- `/api/leaderboard` (`app/api/leaderboard/route.ts`): Данные глобальной таблицы лидеров.
- `/api/messages/unread` (`app/api/messages/unread/route.ts`): Подсчёт непрочитанных сообщений.
- `/api/milestones/evaluate` (`app/api/milestones/evaluate/route.ts`): Генерация отчёта юбилея стрика (100, 200+ дней).
- `/api/milestones/vault` (`app/api/milestones/vault/route.ts`): Привязка доказательств к вехам.
- `/api/notifications` (`app/api/notifications/route.ts`): Управление уведомлениями.
- `/api/streak/sync` (`app/api/streak/sync/route.ts`): Облачная синхронизация стрика.
- `/api/telegram/cron` (`app/api/telegram/cron/route.ts`): Регулярный cron вечерних напоминаний в Telegram.
- `/api/telegram/link` (`app/api/telegram/link/route.ts`): Генерация персонального токена Telegram-бота.
- `/api/telegram/remind` (`app/api/telegram/remind/route.ts`): Отправка напоминания в Telegram.
- `/api/telegram/setup` (`app/api/telegram/setup/route.ts`): Регистрация вебхука бота.
- `/api/telegram/status` (`app/api/telegram/status/route.ts`): Проверка связи с Telegram.
- `/api/telegram/test` (`app/api/telegram/test/route.ts`): Тестирование отправки в Telegram.
- `/api/telegram/webhook` (`app/api/telegram/webhook/route.ts`): Входящий вебхук Telegram.
- `/api/transcribe` (`app/api/transcribe/route.ts`): Транскрибация аудиосообщений.
- `/api/translate` (`app/api/translate/route.ts`): Перевод текста в чатах.
- `/api/webrtc/ice-servers` (`app/api/webrtc/ice-servers/route.ts`): Выдача ICE/STUN/TURN конфигурации.

---

## Список Б. Все блоки текущего лендинга сверху вниз

Сборка главного экрана осуществляется в компоненте `components/ogonek/landing/landing-page.tsx`. Ниже приведены все блоки сверху вниз:

1. **Верхняя навигационная панель (Apple Navbar)**
   - Название: Фиксированная стеклянная панель с логотипом, ссылками на разделы, кнопками «Войти» / «Начать» и мобильным меню.
   - Файл компонента: `components/ogonek/landing/apple-navbar.tsx`
2. **Модальное окно авторизации (Auth Modal)**
   - Название: Всплывающее окно входа/регистрации (вызывается кнопками с лендинга).
   - Файл компонента: `components/ogonek/auth/auth-modal.tsx`
3. **Блок 1: Главный экран / Видео-витрина (Hero Stage)**
   - Название: Заголовок «Хватит обесценивать себя. Твои победы требуют доказательств», бейдж «Антидот от самообесценивания», фоновое видео `mainvideo.mp4` и кнопки CTA.
   - Файл компонента: `components/ogonek/landing/landing-page.tsx` + `components/ogonek/landing/media-slot.tsx`
4. **Блок 2: Как это работает / Физиология характера (How It Works)**
   - Название: «5 минут вечерней тишины, которые выключают внутренний шум», витрина с фото `ritual.jpg` и 3 последовательных шага (01 Прижми себя к стене фактами, 02 Переключи фокус с дефицита, 03 Обопрись на твёрдое).
   - Файл компонента: `components/ogonek/landing/landing-page.tsx` + `components/ogonek/landing/media-slot.tsx`
5. **Блок 3: Режимы жизни / Интерактивное колесо категорий (Modes of Life)**
   - Название: «Победа в бизнесе не должна стоить тебе инфаркта и семьи», pinned-блок с вращающимся интерактивным круговым селектором сфер жизни и побед при скролле (WorksWheel).
   - Файл компонента: `components/ui/works-wheel.tsx` (в секции `#modes` в `landing-page.tsx`)
6. **Блок 4: Уровни жёсткости / Честный договор с собой (Difficulty Levels)**
   - Название: «Выбери темп, который удержишь», 5 карточек суточных ритмов (1 факт «Антивыгорание», 2 факта «Стандарт жизни», 3 факта «Режим прорыва», 4 факта «Серьёзный темп», 5 фактов «Extreme Режим») со ссылкой на `/examples`.
   - Файл компонента: `components/ogonek/landing/landing-page.tsx`
7. **Блок 5: Метрики / Без воды и инфоцыганства (Numbers & Metrics)**
   - Название: «Не обещания. Не курсы. Факты», 3 карточки с метриками («126+ человек держат слово», «26 312 дней летописей», «176 455 побед и благодарностей»).
   - Файл компонента: `components/ogonek/landing/landing-page.tsx`
   *(Заметка: подлежит обязательной переработке согласно правилу о недопустимости вымышленных чисел).*
8. **Блок 6: 3D Интерактивная Земля с отзывами (Testimonial Globe)**
   - Название: «Голоса практиков по всему миру» («Я наконец-то перестал жрать себя изнутри перед сном»), интерактивный вращающийся 3D-глобус с географическими метками реальных отзывов и ссылка на `/reviews`.
   - Файл компонента: `components/ui/testimonial-globe.tsx` (данные из `components/ogonek/landing/reviews-data.ts`)
9. **Блок 7: Нейросетевой наставник (AI Mentor)**
   - Название: «ИИ, который не льстит. Трезвый разбор твоих побед», интерактивная демонстрация ночного ритуала разбора с оценкой сложности и вердиктом Ментора.
   - Файл компонента: `components/ogonek/landing/ai-ceremony-showcase.tsx`
10. **Блок 8: Платформа в действии / Тактильный интерфейс (Product Showcase)**
    - Название: «Инструмент, созданный для спокойствия», сегментированный переключатель вкладок (Рекорд 740 дней, Аналитика преодоления, Evidence Vault, Вечерний дневник) с показом реальных экранов системы и ссылкой на `/platform`.
    - Файл компонента: `components/ogonek/landing/landing-page.tsx` + `components/ogonek/landing/media-slot.tsx`
11. **Блок 9: Приватность и безопасность (Privacy Manifesto)**
    - Название: «Делись победами со всем миром или оставайся в полной секретности», 4 карточки режимов видимости (Публичный режим, Секретный режим, Выборочный доступ, Zero Training ИИ) и ссылка на `/privacy`.
    - Файл компонента: `components/ogonek/landing/landing-page.tsx`
12. **Блок 10: Открытость и бесплатность (Independence Manifesto)**
    - Название: «Платформа свободна. Навсегда», 3 карточки принципов независимости (100% бесплатный базовый ритуал, 0% рекламы/трекеров, Абсолютная приватность).
    - Файл компонента: `components/ogonek/landing/landing-page.tsx`
13. **Блок 11: Тарифы и поддержка (Pricing & Glow Cards)**
    - Название: «Поддержка независимого развития», переключатель месяц/год со скидкой 20%, 3 карточки тарифов со spotlight-свечением (`GlowCard`: Базовый 0 MDL, Премиум Pro 25 MDL/мес, Основатель Ultra 50 MDL/мес) и промо-баннер перехода на `/ai`.
    - Файл компонента: `components/ogonek/landing/landing-page.tsx` + `components/ui/spotlight-card.tsx`
14. **Блок 12: Финальный призыв к действию (Final Banner CTA)**
    - Название: «Сегодня вечером. 5 минут. Начни честный разговор с собой», широкоформатная витрина с фотографией `together.jpg`, кнопкой «Начать свой путь в Priday →» и ссылкой на `/community`.
    - Файл компонента: `components/ogonek/landing/landing-page.tsx` + `components/ogonek/landing/media-slot.tsx`
15. **Блок 13: Универсальный подвал (Apple Universal Footer)**
    - Название: Четырёхколоночный футер с навигацией по разделам, правовой информацией и системным переключателем оформления.
    - Файл компонента: `components/ogonek/landing/apple-footer.tsx`

---

## Список В. Разграничение: Приложение vs Публичные маркетинговые страницы

### Зона 1: ПРИЛОЖЕНИЕ (Строго НЕ ТРОГАТЬ)
К приложению относится всё, что формирует рабочее пространство зарегистрированного пользователя, внутреннюю логику, хранение данных и взаимодействие:

1. **Главная оболочка приложения (`AppShell`)**: `components/ogonek/app-shell.tsx`, провайдер внешнего вида `appearance-provider.tsx`, панели навигации `bottom-nav.tsx`, `sidebar.tsx`, `mobile-top-bar.tsx`, `mobile-nav-sheet.tsx`, `right-rail.tsx`.
2. **Лента побед (Главная / Feed)**: `components/ogonek/views/home-view.tsx`, `day-card.tsx`, `day-entries.tsx`, `day-options-modal.tsx`, `reaction-bar.tsx`, `comments-thread.tsx`, `stories-bar.tsx`, `story-viewer-modal.tsx`, `story-composer-modal.tsx`.
3. **Утренние намерения и фокус**: `components/ogonek/views/intentions-view.tsx`, `quick-focus.tsx`, `focus-flame.tsx`, `focus-history-modal.tsx`.
4. **Вечерний ритуал и комбайнер**: `components/ogonek/composer.tsx`, `evening-review.tsx`, `evaluation-ceremony-modal.tsx`.
5. **Поиск и сообщество (Explore)**: `components/ogonek/views/explore-view.tsx`, вся директория `components/ogonek/explore/*`.
6. **Чаты, мессенджер и звонки**: маршруты `/chats`, `/chats/[id]`, представление `components/ogonek/views/messages-view.tsx`, `fullscreen-messenger.tsx`, `chat-window.tsx` и вся папка `components/ogonek/messenger/*` (аудио/видео WebRTC-звонки, войсы, вложения, папки, теги, опросы).
7. **Профиль пользователя**: `components/ogonek/views/profile-view.tsx`, `profile-modal.tsx`, `edit-profile-modal.tsx`, `share-profile-modal.tsx`, `profile-image-cropper-modal.tsx`, `difficulty-level-modal.tsx`, `profile-milestones-tab.tsx`.
8. **Сейф доказательств (Evidence Vault)**: `components/ogonek/views/vault-view.tsx`, `achievement-evidence-uploader.tsx`, `vault-spark.tsx`, компоненты достижений `components/ogonek/achievements/*`.
9. **Премиум и апгрейд**: `components/ogonek/views/premium-view.tsx`, `premium-modal.tsx`, `upgrade-modal.tsx`, служебный роут `/premium`.
10. **Аналитика и статистика**: `components/ogonek/views/analytics-view.tsx` и все модули `components/ogonek/analytics/*`.
11. **Рейтинг и лидерборд**: `components/ogonek/views/leaderboard-view.tsx`.
12. **Настройки**: `components/ogonek/views/settings-view.tsx` и вся директория панелей `components/ogonek/settings/*`.
13. **Друзья и связи**: `friends-modal.tsx`, `friends-manager.tsx`, `active-friends-widget.tsx`, `friend-detail-modal.tsx`, `qr-modal.tsx`.
14. **Логика авторизации, безопасность и данные**:
    - Модули входа и учетных записей: `components/ogonek/auth/*`.
    - Экран блокировки, пин-код и биометрия: `components/ogonek/security/*`.
    - Стейт-менеджер и модели: `lib/ogonek/use-ogonek-store.ts`, `lib/ogonek/types.ts`, `lib/ogonek/storage.ts`, `lib/ogonek/streak.ts`, `lib/ogonek/security.ts`, `lib/ogonek/permissions.ts`.
    - Интеграция с базой данных: `lib/supabase/*`, `supabase-sync-bootstrap.tsx`.
    - Все API-маршруты приложения (`app/api/*`) и OAuth (`app/auth/callback/route.ts`).

---

### Зона 2: ПУБЛИЧНЫЕ МАРКЕТИНГОВЫЕ СТРАНИЦЫ (Зона нашей работы)
К этой зоне относятся открытые страницы, доступные гостям и индексируемые поисковыми системами:

1. **Главный публичный лендинг (на корневом пути `/` при отсутствии авторизации)**:
   - Основной контейнер: `components/ogonek/landing/landing-page.tsx`.
   - Навигация лендинга: `components/ogonek/landing/apple-navbar.tsx`.
   - Подвал лендинга: `components/ogonek/landing/apple-footer.tsx`.
   - Медиа-слот для фото и видео: `components/ogonek/landing/media-slot.tsx`.
   - 3D-Земля с отзывами: `components/ui/testimonial-globe.tsx` и данные `reviews-data.ts`.
   - Интерактивное колесо категорий: `components/ui/works-wheel.tsx`.
   - Витрина ИИ-наставника: `components/ogonek/landing/ai-ceremony-showcase.tsx`.
   - Карточки тарифов со spotlight-эффектом: `components/ui/spotlight-card.tsx` (`GlowCard`).
   - Панель режимов: `components/ogonek/landing/apple-modes-panel.tsx`.
   - Скролл-анимации: `components/ogonek/landing/use-scroll-reveal.ts`.
2. **Публичные промо-страницы**:
   - `/ai` (`app/ai/page.tsx`): Промо нейросетевого наставника с анимированным фоном `GlyphBackground`.
   - `/platform` (`app/platform/page.tsx`): Подробный тур по возможностям платформы.
   - `/community` (`app/community/page.tsx`): Презентация клубов и историй сообщества.
   - `/reviews` (`app/reviews/page.tsx`): Полный каталог историй участников.
   - `/modes` (`app/modes/page.tsx`): Презентация 4 сфер баланса жизни.
   - `/how-it-works` (`app/how-it-works/page.tsx`): Психология и нейробиология вечернего ритуала.
   - `/examples` (`app/examples/page.tsx`): Примеры и правила ведения дневника.
   - `/manifesto` (`app/manifesto/page.tsx`): Манифест создателя и опыт стрика 740+ дней.
   - `/support` (`app/support/page.tsx`): FAQ и поддержка.
   - `/privacy` (`app/privacy/page.tsx`): Манифест приватности и секретного режима.
   - `/terms` (`app/terms/page.tsx`): Условия сервиса и права на контент.
   - `/login` (`app/login/page.tsx`): Публичный экран входа с промо-блоком.
   - `/register` (`app/register/page.tsx`): Публичный экран регистрации с онбордингом ритма.
   - `/invite/[username]` (`app/invite/[username]/page.tsx`): Публичная страница персонального приглашения.

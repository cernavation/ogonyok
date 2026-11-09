# ДИАГНОСТИЧЕСКИЙ ОТЧЁТ: АРХИТЕКТУРА СИСТЕМЫ «ОГОНЁК»
> **Файл:** `diagnostics/DIAG_01_ARCHITECTURE.md`  
> **Дата аудита:** 9 ноября 2026 г.  
> **Роль:** Старший Full-Stack инженер и аудитор  
> **Статус:** ТОЛЬКО ДИАГНОСТИКА (код не изменялся, миграции не применялись)

---

## 1. Дерево проекта (High-Level Architecture)

Проект представляет собой full-stack веб-приложение на базе **Next.js 16.4.0 (Canary/App Router)**, **React 19**, **Tailwind CSS v4** и **Supabase (BaaS)**, развёрнутое на платформе **Vercel**.

```
ogonyok-ai-clone/
├── app/                              # Next.js App Router (страницы и API)
│   ├── api/                          # Серверные API-роуты (Next.js Route Handlers)
│   │   ├── achievements/             # /api/achievements/verify, /api/achievements/regulate
│   │   ├── ai/                       # /api/ai/evaluate, /api/ai/evaluate-day
│   │   ├── cron/                     # /api/cron/deliver-scheduled
│   │   ├── evaluate/                 # /api/evaluate (DeepSeek / Gemini evaluation)
│   │   ├── giphy/                    # /api/giphy (проксирование Giphy API)
│   │   ├── leaderboard/              # /api/leaderboard (кэшируемый рейтинг)
│   │   ├── streak/sync/              # /api/streak/sync
│   │   ├── telegram/                 # webhook, cron, link, status, setup, remind, test
│   │   ├── transcribe/               # /api/transcribe (STT через Gemini)
│   │   └── translate/                # /api/translate (перевод сообщений через Gemini)
│   ├── auth/callback/                # /auth/callback (Supabase Auth OAuth redirect)
│   ├── chats/                        # /chats, /chats/[id] (автономные страницы мессенджера)
│   ├── privacy/                      # /privacy (политика конфиденциальности)
│   ├── terms/                        # /terms (пользовательское соглашение)
│   ├── error.tsx                     # Корневой Error Boundary Next.js
│   ├── globals.css                   # Глобальные стили, Tailwind v4, токены
│   ├── interactive-overrides.css     # Кастомные интерактивные стили
│   ├── layout.tsx                    # Корневой Layout (метаданные, bootstrap-скрипты, sw)
│   ├── not-found.tsx                 # Страница 404
│   └── page.tsx                      # Главная страница (рендерит AppShell)
├── components/                       # React-компоненты
│   ├── ogonek/                       # Доменные компоненты системы «Огонёк»
│   │   ├── achievements/             # Модуль верификации и регламентов побед
│   │   ├── analytics/                # Графики, KPI, AI-инсайты
│   │   ├── auth/                     # Формы входа, регистрации, модалки
│   │   ├── explore/                  # Поиск, сообщество, подсветки
│   │   ├── landing/                  # Гостевой лендинг (GuestLanding)
│   │   ├── messenger/                # Полноэкранный чат, аудио/видеозвонки, войсы
│   │   ├── profile/                  # Профиль, кроппер аватара, уровни сложности
│   │   ├── security/                 # ПИН-пад, блокировка, биометрия
│   │   ├── settings/                 # Панели настроек (синхронизация, Telegram, вид)
│   │   ├── ui/                       # Базовые UI-компоненты (Button, Modal, Toast)
│   │   ├── views/                    # Экраны SPA (Home, Explore, Vault, Premium и др.)
│   │   ├── app-shell.tsx             # Главный контейнер клиентского SPA
│   │   ├── composer.tsx              # Композер дневниковых записей
│   │   └── ...                       # Виджеты (рейл, боковое меню, сторис, стрики)
│   └── ui/                           # Shadcn UI (кнопка button.tsx)
├── lib/                              # Бизнес-логика, утилиты, клиенты
│   ├── ogonek/                       # Ядро предметной области (Store, Types, Sync)
│   │   ├── use-ogonek-store.ts       # Главное реактивное хранилище (5445 строк)
│   │   ├── supabase-sync.ts          # Offline-first адаптер REST-синхронизации (2221 строка)
│   │   ├── use-supabase-sync.ts      # React-хук автосинхронизации
│   │   ├── types.ts                  # Модели данных TypeScript
│   │   ├── storage.ts                # Работа с localStorage (ключ ogonek.v2)
│   │   ├── security.ts               # Хеширование ПИН/пароля (PBKDF2/SHA-256)
│   │   ├── appearance.ts             # Темы оформления (x-black, apple-light, dim)
│   │   └── ...                       # Алгоритмы стрика, скоринга, медиа
│   ├── server/                       # Серверные утилиты (rate-limit.ts)
│   ├── supabase/                     # Supabase клиенты и API-фасад
│   │   ├── api.ts                    # Серверные и клиентские запросы PostgREST (2080 строк)
│   │   ├── client.ts                 # Browser Supabase client (браузерный синглтон)
│   │   └── server.ts                 # Server Supabase client (service_role / anon)
│   └── utils.ts                      # Хелперы cn()
├── supabase/                         # Схемы БД, SQL-миграции
│   ├── migrations/                   # 001_ogonyok_media_storage.sql
│   ├── disable_days_rls.sql          # Скрипт отключения RLS на таблицах days/prides
│   └── schema.sql                    # Альтернативная схема V2 (diary_days, entries)
├── scripts/                          # Скрипты диагностики, верификации и сидинга
├── public/                           # Статика (иконки, манифест, sw.js, сиды)
├── middleware.ts                     # Next.js Middleware (обновление сессии Supabase SSR)
├── next.config.mjs                   # Конфиг сборщика Next.js
├── package.json                      # Зависимости и npm-скрипты
├── SUPABASE_FULL_SCHEMA.sql          # Каноническая схема 1.0 (days, prides, gratitudes)
└── SUPABASE_2.0_MIGRATION.sql        # Миграция 2.0 (direct_messages, evidence_vault, call_sessions)
```

---

## 2. Роутинг (Next.js App Router vs Pages Router)

В проекте используется **исключительно Next.js App Router** (`app/`). Каталог `pages/` отсутствует.

### 2.1. Клиентские и серверные страницы
1. **Главная страница (`app/page.tsx:1-5`)**:
   - Является серверным компонентом по умолчанию, рендерит клиентский SPA-контейнер `<AppShell />` (`components/ogonek/app-shell.tsx`).
   - Вся навигация внутри основного интерфейса построена как **клиентский SPA** на базе переключения внутреннего состояния `view` (`home`, `explore`, `messages`, `vault`, `premium`, `analytics`, `settings`, `intentions`, `leaderboard`, `profile`, `landing`).
2. **Автономные страницы мессенджера**:
   - `app/chats/page.tsx:1-10` — рендерит `<FullscreenMessenger />`.
   - `app/chats/[id]/page.tsx:1-16` — рендерит `<FullscreenMessenger initialThreadId={resolvedParams.id} />`. Примечание: `params` резолвятся асинхронно через `await params`, что соответствует контракту Next.js 15/16.
3. **Правовые страницы**:
   - `app/privacy/page.tsx:1-92` — статическая страница политики конфиденциальности.
   - `app/terms/page.tsx:1-110` — статическая страница пользовательского соглашения.
4. **Обработка системных состояний**:
   - `app/not-found.tsx:1-35` — кастомная брендированная страница 404.
   - `app/error.tsx:1-35` — клиентский boundary для необработанных исключений (500).

---

## 3. Layouts и корневая обвязка

Файл `app/layout.tsx:1-87`:
- **Метаданные и PWA**: определяет `metadataBase`, OpenGraph (1200×630 `og-image.png`), Twitter Cards, манифест `/manifest.json`, viewport с `viewportFit: 'cover'`.
- **Inline Bootstrap скрипты**:
  - `APPEARANCE_BOOTSTRAP_SCRIPT` (`lib/ogonek/appearance.ts:18-47`): внедряется синхронно в `<head>` через `dangerouslySetInnerHTML` во избежание FOUC (Flash of Unstyled Content), читает `localStorage['ogonek.v2']` и устанавливает атрибуты `data-theme`, `data-accent`, `data-font-scale`.
  - `SECURITY_BOOTSTRAP_SCRIPT` (`lib/ogonek/security.ts:25-45`): проверяет флаг блокировки приложения при холодном старте.
- **Service Worker**: компонент `<ServiceWorkerRegister />` (`components/ogonek/sw-register.tsx:1-25`) регистрирует `/sw.js` в продакшен-режиме.
- **Офлайн-баннер**: `<OfflineBanner />` (`components/ogonek/offline-banner.tsx:1-55`) слушает события `online`/`offline` браузера.
- **Аналитика**: `@vercel/analytics/next` монтируется строго при `NODE_ENV === 'production'` (`app/layout.tsx:83`).

---

## 4. Middleware (`middleware.ts`)

Код файла `middleware.ts:1-47`:
- Использует `@supabase/ssr` (`createServerClient`).
- Извлекает куки из `request.cookies.getAll()` и синхронизирует их в заголовки ответа через `supabaseResponse.cookies.set()`.
- Вызывает `await supabase.auth.getUser()` (`middleware.ts:35`) для продления/обновления JWT-токенов в сессионных куках.
- Содержит блок `try/catch` с мягким подавлением ошибок при недоступности Supabase.
- **Matcher**: исключает статику (`_next/static`, `_next/image`, `favicon.ico`, `icons`, `seeds`, медиафайлы).
- **Критическое наблюдение**: Middleware **НЕ осуществляет редиректов или защиты роутов** (guard). Все страницы и API открыты публично, авторизация проверяется локально в компонентах или Route Handlers.

---

## 5. Провайдеры и контексты (Providers Architecture)

В проекте намеренно сведены к минимуму вложенные React-провайдеры для предотвращения ре-рендер-каскадов:
1. **`AppearanceProvider` (`components/ogonek/appearance-provider.tsx:1-120`)**:
   - Управляет CSS-переменными в `:root` (`--accent`, `--accent-hover`, `--accent-soft`, `--accent-contrast`) и атрибутами темы (`data-theme="x-black|apple-light|dim"`).
   - Поддерживает динамический пересчёт контрастного текста на акцентной кнопке (чёрный или белый в зависимости от яркости выбранного цвета).
2. **`TooltipProvider` (`components/ogonek/tooltip.tsx:1-45`)**:
   - Реализует портальные всплывающие подсказки.
3. **`SupabaseSyncBootstrap` (`components/ogonek/supabase-sync-bootstrap.tsx:1-19`)**:
   - Безголовый компонент-сайдэффект, монтируется в `AppShell` (`components/ogonek/app-shell.tsx:23`).
   - Инициализирует фоновый планировщик синхронизации `useSupabaseSync({ autoSync: true })`.
4. **Контекст аутентификации**:
   - Традиционный `AuthContext` **отсутствует**. Состояние аутентификации хранится внутри единого хранилища `useOgonekStore` в ветке `state.auth`.

---

## 6. Стейт-менеджмент (`lib/ogonek/use-ogonek-store.ts`)

Вся клиентская бизнес-логика сосредоточена в кастомном хранилище:
- **Движок**: построен на нативном хуке React 18/19 `useSyncExternalStore` (`lib/ogonek/use-ogonek-store.ts:3`). Внешние библиотеки (Zustand, Redux, MobX) **не используются**.
- **Размер файла**: **5 445 строк кода**. Хранилище является монолитным «God Object».
- **Персистентность**:
  - Состояние сериализуется в `localStorage` под ключом `ogonek.v2` (`lib/ogonek/storage.ts:105`).
  - При первой загрузке вызывается `loadStore()`, выполняющий глубокую санитизацию и миграцию полей (`lib/ogonek/storage.ts:103`).
- **Слушатели и реактивность**:
  - В памяти поддерживается `cachedState` (`lib/ogonek/use-ogonek-store.ts:204`).
  - Реактивность обеспечивается через паттерн Observer: массив подписчиков `listeners = new Set<() => void>()`. При любом `updateStore()` вызываются все подписчики и сбрасывается кэш в `localStorage`.
- **Вложенные сущности стора**:
  - `days`: массив записей дней (гордости, благодарности, фото, оценки).
  - `profile`: настройки профиля (никнейм, аватар, уровень сложности, стрик).
  - `chatThreads`: локальная переписка мессенджера (диалоги, сообщения, черновики, реакции).
  - `auth`: аккаунты, активный `activeAccountId`, демо-секреты.
  - `security`: ПИН-код, пароль, соль, статус биометрии, тайм-ауты автоблокировки.
  - `evidenceItems`: факты силы в Evidence Vault.
  - `verifiedAchievements`: ачивки и история их модерации.
  - `socialGraph`: массивы `friendIds`, `followingIds`, `incomingFriendRequests`, `outgoingFriendRequests`.

---

## 7. Архитектура обращений к Supabase (Client / Server / Dual Clients)

В кодовой базе выявлена **архитектурная несогласованность клиентов Supabase**. Существует **ТРИ независимых реализации клиентов**:

### 7.1. Браузерный синглтон 1: `lib/supabase/client.ts`
- Создаёт экземпляр через `createClient` из `@supabase/supabase-js`.
- Настройки: `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`, `eventsPerSecond: 10`.
- Использует домен по умолчанию для виртуальных email: `usernameToEmail(..., 'ogonek.local')` (`lib/supabase/client.ts:16`).
- Импортируется в: `lib/supabase/api.ts`, `components/ogonek/app-shell.tsx`, `components/ogonek/messenger/chat-call-modal.tsx`, `components/ogonek/messenger/messenger-chat-pane.tsx`.

### 7.2. Браузерный синглтон 2: `lib/ogonek/supabase-client.ts`
- Создаёт **второй независимый синглтон** через `createClient` (`lib/ogonek/supabase-client.ts:98-111`).
- Имеет собственную валидацию никнейма (`^[a-z0-9_]{3,20}$`) и проверку пароля (`validatePassword`).
- В комментарии заявляет домен `@ogonek.app`, но в строке 81 использует `ogonek.local`.
- Импортируется в: `lib/ogonek/use-ogonek-store.ts`, `components/ogonek/auth/auth-form.tsx`, `lib/ogonek/legacy-migration.ts`, `lib/ogonek/profile-media-service.ts`.
- **Проблема**: наличие двух параллельных браузерных клиентов с `persistSession: true` приводит к дублированию слушателей AuthStateChange, параллельным веб-сокетам Realtime и риску рассинхронизации локального кэша сессии.

### 7.3. Серверный клиент: `lib/supabase/server.ts`
- Функция `getServerSupabase()` (`lib/supabase/server.ts:6-16`).
- `auth: { persistSession: false, autoRefreshToken: false }`.
- **Уязвимость в строке 4**:
  ```ts
  export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ```
  Если переменная `SUPABASE_SERVICE_ROLE_KEY` не задана, клиент **не падает**, а молча инициализируется с `NEXT_PUBLIC_SUPABASE_ANON_KEY`. В результате серверные скрипты и крон-задачи, рассчитанные на обход RLS, неожиданно получают права `anon` и падают с ошибками RLS.

### 7.4. Offline-First REST-клиент: `lib/ogonek/supabase-sync.ts`
- Класс `SupabaseRestClient` (`lib/ogonek/supabase-sync.ts:521-580`).
- Не использует SDK `@supabase/supabase-js`, а напрямую формирует HTTP-запросы `fetch()` к PostgREST эндпоинтам `/rest/v1/${table}` с собственными заголовками `apikey` и `Authorization: Bearer ...`.

---

## 8. Переменные окружения (Environment Variables)

Список всех переменных окружения, используемых в исходном коде проекта (значения скрыты согласно правилам безопасности):

| Имя переменной | Область видимости | Где используется (файл:строка) | Назначение |
|:---|:---:|:---|:---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client & Server | `lib/supabase/client.ts:3`, `lib/ogonek/supabase-client.ts:17`, `middleware.ts:10` | URL инстанса Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client & Server | `lib/supabase/client.ts:4`, `lib/ogonek/supabase-client.ts:18`, `middleware.ts:11` | Публичный анонимный ключ Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public / Client | `lib/supabase/client.ts:4`, `lib/ogonek/supabase-client.ts:18` | Альтернативный алиас для anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | `lib/supabase/server.ts:4`, `scripts/setup.mjs:139` | Секретный сервисный ключ (обход RLS для cron/API) |
| `DEEPSEEK_API_KEY` | Server Only | `app/api/evaluate/route.ts:15` | API-ключ DeepSeek для оценки дневника |
| `GEMINI_API_KEY` | Server Only | `app/api/translate/route.ts:27`, `app/api/transcribe/route.ts:36`, `app/api/achievements/regulate/route.ts:86` | API-ключ Google Gemini |
| `GEMINI_MODEL` | Server Only | `app/api/translate/route.ts:28`, `app/api/transcribe/route.ts:37` | Выбор модели Gemini (по умолч. `gemini-2.5-flash`) |
| `GIPHY_API_KEY` | Server Only | `app/api/giphy/route.ts:17` | Ключ поиска GIF в мессенджере |
| `TELEGRAM_BOT_TOKEN` | Server Only | `app/api/telegram/cron/route.ts:32`, `app/api/telegram/webhook/route.ts:15` | Токен бота Telegram для уведомлений |
| `TELEGRAM_BOT_USERNAME` | Public / Server | `app/api/telegram/status/route.ts:20` | Юзернейм бота Telegram |
| `TELEGRAM_CHAT_ID` | Server Only | `app/api/telegram/remind/route.ts:18` | Тестовый чат-ID администратора |
| `CRON_SECRET` | Server Only | `app/api/cron/deliver-scheduled/route.ts:16`, `app/api/telegram/cron/route.ts:16` | Секрет защиты эндпоинтов Vercel Cron |
| `NEXT_PUBLIC_DEMO_MODE` | Public / Client | `components/ogonek/app-shell.tsx:523`, `components/ogonek/views/leaderboard-view.tsx:120` | Флаг симуляции демо-данных (стрик 705 дней) |
| `NEXT_PUBLIC_SUPABASE_AUTO_SYNC` | Public / Client | `lib/ogonek/supabase-sync.ts:61` | Флаг включения автосинхронизации |
| `NEXT_PUBLIC_SUPABASE_AUTO_SYNC_MS`| Public / Client | `lib/ogonek/supabase-sync.ts:63` | Период автосинхронизации в мс |
| `MODERATION_WEBHOOK_URL` | Server Only | `lib/ogonek/achievement-moderation.ts:12` | Вебхук внешней модерации ачивок |
| `MODERATION_INBOX` | Server Only | `lib/ogonek/achievement-moderation.ts:49` | Email ящика модерации |
| `MODERATION_FROM` | Server Only | `app/api/achievements/verify/route.ts:18` | Email отправителя служебных писем |
| `RESEND_API_KEY` | Server Only | `app/api/achievements/verify/route.ts:20` | Ключ сервиса отправки email Resend |
| `NODE_ENV` | System | `app/layout.tsx:83` | Окружение выполнения (`production` / `development`) |

---

## 9. Зависимости из `package.json`

### 9.1. Production Dependencies (`package.json:34-53`)
- **`next` (`16.4.0`)**: ядро App Router. Важно: Next.js 16 имеет обратные несовместимости с Next 14 (асинхронные `params`, переработанный кэш).
- **`react` / `react-dom` (`^19`)**: React 19 с новой системой экшенов и хуков.
- **`@supabase/supabase-js` (`^2.118.0`)**: официальный JS-клиент для Supabase Auth, PostgREST и Realtime.
- **`@supabase/ssr` (`^0.12.7`)**: хелперы работы с куками на сервере и в Middleware.
- **`@google/genai` (`^2.32.0`)** и **`@google/generative-ai` (`^0.24.1`)**: **ДВЕ параллельные библиотеки Google SDK**. `@google/genai` — новый унифицированный SDK, `@google/generative-ai` — легаси SDK. Дублирование увеличивает размер зависимостей.
- **`framer-motion` (`^14.0.0`)**: библиотека декларативных анимаций и модальных переходов.
- **`lucide-react` (`^1.16.0`)**: набор SVG-иконок интерфейса.
- **`canvas-confetti` (`^1.9.4`)**: салют при закрытии дня и победах.
- **`@vercel/analytics` (`1.6.1`)**: трекинг производительности и Web Vitals на Vercel.
- **`clsx` (`^2.1.1`)**, **`tailwind-merge` (`^3.3.1`)**, **`class-variance-authority` (`^0.7.1`)**: утилиты стилизации.
- **`@base-ui/react` (`^1.5.0`)**, **`shadcn` (`^4.11.0`)**, **`tw-animate-css` (`^1.4.0`)**: компоненты доступности и стили.

### 9.2. Dev Dependencies (`package.json:54-68`)
- **`tailwindcss` (`^4.3.3`)**, **`@tailwindcss/postcss` (`^4.3.3`)**, **`postcss` (`^8.5`)**: Tailwind CSS версии 4.
- **`typescript` (`5.7.3`)**: строгая типизация (при этом в `next.config.mjs:4` включён `ignoreBuildErrors: true`).
- **`postgres` (`^3.4.9`)**: прямой драйвер PostgreSQL для скриптов сидинга и миграций.
- **`playwright-core` (`^1.64.1`)**, **`pixelmatch` (`^8.0.0`)**, **`pngjs` (`^7.0.0`)**: движок e2e тестирования интерфейса и скриншотного регрессионного тестирования.

---

## 10. Фоновые задачи и Cron-процессы

1. **Vercel Cron: Доставка запланированных сообщений**:
   - Маршрут: `/api/cron/deliver-scheduled` (`app/api/cron/deliver-scheduled/route.ts:4-10`).
   - Настройка в `vercel.json`: выполняется раз в минуту (`* * * * *`).
   - Защита: проверяет заголовок `Authorization: Bearer <CRON_SECRET>`.
2. **Vercel Cron: Напоминания в Telegram**:
   - Маршрут: `/api/telegram/cron` (`app/api/telegram/cron/route.ts:4-10`).
   - Настройка в `vercel.json`: выполняется по расписанию (напоминание о закрытии дня).
   - Защита: проверяет `CRON_SECRET`.
3. **Клиентский таймер автосинхронизации (Offline-First Sync Loop)**:
   - Функция `startAutoSync()` (`lib/ogonek/supabase-sync.ts:1680-1750`).
   - Запускается компонентом `<SupabaseSyncBootstrap />` через `setInterval`.
   - Периодичность: по умолчанию раз в 60 секунд (`DEFAULT_AUTO_SYNC_INTERVAL_MS = 60_000`).
   - Триггеры вне очереди: событие `window.addEventListener('online')` и `document.addEventListener('visibilitychange')`.

---

## 11. Реестр API-роутов (`app/api/*`)

| Роут | Методы | Аутентификация | Rate Limit | Основные параметры | Назначение / Что делает | Таблицы БД |
|:---|:---:|:---:|:---:|:---|:---|:---|
| `/api/evaluate` | POST | Нет (public) | In-memory 60/мин (`route.ts:7`) | `{ prides: string[], gratitudes: string[] }` | Оценка гордостей дня через DeepSeek API | `ai_evaluations` |
| `/api/ai/evaluate` | POST | Нет | 60/мин | Ре-экспорт `/api/evaluate` | Алиас для обратной совместимости | `ai_evaluations` |
| `/api/ai/evaluate-day` | POST | Нет | 60/мин | Ре-экспорт `/api/evaluate` | Алиас для обратной совместимости | `ai_evaluations` |
| `/api/translate` | POST | Нет | 30/мин (`route.ts:6`) | `{ text: string, targetLang: string }` | Перевод сообщений в чате через Gemini | Нет |
| `/api/transcribe` | POST | Нет | 30/мин (`route.ts:6`) | `{ audioBase64: string, mimeType: string }` | Распознавание голосовых заметок через Gemini | Нет |
| `/api/giphy` | GET | Нет | 30/мин (`route.ts:6`) | `?q=search_term&limit=20` | Поиск GIF через проксирование к Giphy API | Нет |
| `/api/leaderboard` | GET | Нет | Нет (HTTP-кэш 60с) | `?period=all\|month\|week&limit=50` | Выгрузка рейтинга участников по стрику | `profiles`, `diary_days` |
| `/api/streak/sync` | POST | Нет | Нет | `{ userId: string, streak: number }` | Ручная синхронизация счётчика стрика | `profiles` |
| `/api/cron/deliver-scheduled` | GET, POST | `CRON_SECRET` | Нет | Header `Authorization: Bearer ...` | Доставка отложенных сообщений в чаты | `scheduled_messages`, `messages` |
| `/api/telegram/cron` | GET, POST | `CRON_SECRET` | Нет | Header `Authorization: Bearer ...` | Рассылка напоминаний о незакрытом дне | `profiles`, `diary_days` |
| `/api/telegram/webhook` | POST | Нет | 60/мин (`route.ts:7`) | Telegram Update payload | Обработка команд бота `/start`, `/link` | `telegram_links`, `profiles` |
| `/api/telegram/link` | POST | Нет | Нет | `{ token: string, userId: string }` | Привязка Telegram Chat ID к аккаунту | `telegram_links`, `profiles` |
| `/api/telegram/remind` | POST | Нет | Нет | `{ userId: string, message?: string }` | Тестовая отправка напоминания в Telegram | `profiles` |
| `/api/telegram/status` | GET | Нет | Нет | `?userId=uuid` | Проверка статуса связки с Telegram | `profiles` |
| `/api/telegram/setup` | POST | Нет | Нет | `{ webhookUrl: string }` | Установка вебхука бота в Telegram API | Нет |
| `/api/telegram/test` | GET, POST | Нет | Нет | Нет | Диагностика доступности Telegram бота | Нет |
| `/api/achievements/verify` | POST | Нет | 10/мин (`route.ts:40`) | `{ submissionId, status, note }` | Модерация заявки на ачивку | `achievements_verifications` |
| `/api/achievements/regulate` | POST | Нет | 15/мин (`route.ts:12`) | `{ title, categoryId }` | Генерация правил/регламента победы через ИИ | Нет |
| `/auth/callback` | GET | OAuth code | Нет | `?code=...&next=/` | Обмен кода OAuth на сессию Supabase Auth | `auth.users` |

---

## 12. Резюме архитектурных рисков
1. **Каша между App Router и Client SPA**: приложение на 95% является клиентским SPA внутри `app/page.tsx` (`AppShell`), но имеет отдельные серверные роуты `/chats` и `/chats/[id]`. Это привело к историческому багу B1 (ловушка навигации и рассинхрон состояния).
2. **Два параллельных клиента Supabase** (`lib/supabase/client.ts` и `lib/ogonek/supabase-client.ts`) создают дублирующие вебсокет-соединения и могут приводить к гонкам сессий.
3. **Хранилище `useOgonekStore` на 5 445 строк**: любые изменения профиля, чата или дня триггерят полную сериализацию в `localStorage` и оповещение всех компонентов без гранулярных селекторов.
4. **Опасный фолбэк в `lib/supabase/server.ts:4`**: замена `SUPABASE_SERVICE_ROLE_KEY` на `NEXT_PUBLIC_SUPABASE_ANON_KEY` маскирует отсутствие критического серверного секрета.

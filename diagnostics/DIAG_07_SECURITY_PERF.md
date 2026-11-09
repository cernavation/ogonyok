# ДИАГНОСТИЧЕСКИЙ ОТЧЁТ: БЕЗОПАСНОСТЬ И ПРОИЗВОДИТЕЛЬНОСТЬ (SECURITY & PERF)
> **Файл:** `diagnostics/DIAG_07_SECURITY_PERF.md`  
> **Дата аудита:** 9 ноября 2026 г.  
> **Роль:** Старший Full-Stack инженер и аудитор  
> **Статус:** ТОЛЬКО ДИАГНОСТИКА (код не изменялся, миграции не применялись)

---

## 1. Секреты в коде и git-истории

### 1.1. Проверка git-истории
- Выполнено сканирование всей истории коммитов (`task-236`) с помощью регулярных выражений для ключей Google AI (`AIzaSy...`), DeepSeek (`sk-...`), Supabase JWT (`eyJhbGci...`) и Telegram Bot Token (`[0-9]{8,10}:...`).
- **Результат:** Действующих секретных ключей в истории git-коммитов **не обнаружено** (0 совпадений).
- Файлы `.env*`, `.env*.local` корректно внесены в `.gitignore` (`.gitignore:11-13`).
- В репозитории хранятся только шаблоны `.env.example` и `.env.local.example` с замаскированными заглушками (`AIzaSy...`, `eyJhbGci...`).

### 1.2. Жёстко зашитые идентификаторы в коде (Hardcoded IDs)
- **Файл:** `lib/ogonek/use-ogonek-store.ts:609`:
  ```ts
  (username === 'cernavation' ? '94e9eaf7-ec74-4366-9ce3-7de1e670f52b' : null)
  ```
  В коде зашит конкретный UUID создателя проекта. При смене базы данных или пользователя эта ветка создаёт скрытую связь с чужим аккаунтом.
- **Файл:** `lib/supabase/server.ts:4`:
  ```ts
  export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ```
  Недопустимый фолбэк сервисного ключа на анонимный публичный ключ.

---

## 2. Анализ Row Level Security (RLS)

### 2.1. Текущий статус защиты таблиц
В результате применения миграций `SUPABASE_2.0_MIGRATION.sql:424-445` и `supabase/disable_days_rls.sql:6-8` Row Level Security находится в **незащищённом состоянии**:

| Таблица | Статус RLS | Политика в БД | Угроза безопасности |
|:---|:---:|:---|:---|
| `public.direct_messages` | **ОТКЛЮЧЕН / ALLOW ALL** | `FOR ALL USING (true) WITH CHECK (true)` | **Критическая утечка переписки:** любой клиент может выгрузить или удалить чужие диалоги |
| `public.days` | **ОТКЛЮЧЕН** | `DISABLE ROW LEVEL SECURITY` | **Утечка приватных дневников:** чтение записей с флагом `visibility = 'private'` |
| `public.prides` | **ОТКЛЮЧЕН** | `DISABLE ROW LEVEL SECURITY` | Доступ к интимным победам и текстам преодолений всех пользователей |
| `public.gratitudes` | **ОТКЛЮЧЕН** | `DISABLE ROW LEVEL SECURITY` | Доступ ко всем благодарностям |
| `public.profiles` | **ОТКЛЮЧЕН / ALLOW ALL** | `FOR ALL USING (true) WITH CHECK (true)` | Подмена чужих профилей, накрутка стрика, сброс никнеймов |
| `public.evidence_vault` | **ОТКЛЮЧЕН / ALLOW ALL** | `FOR ALL USING (true) WITH CHECK (true)` | Чтение и удаление чужих фактов силы |
| `public.call_sessions` | **ОТКЛЮЧЕН / ALLOW ALL** | `FOR ALL USING (true) WITH CHECK (true)` | Просмотр логов звонков (кто, кому, длительность) |
| `public.friendships` | **ОТКЛЮЧЕН / ALLOW ALL** | `FOR ALL USING (true) WITH CHECK (true)` | Манипуляция социальным графом |

### 2.2. Требуемая эталонная модель RLS
Для безопасной работы в продакшене RLS должен быть принудительно включён на всех таблицах со следующими строгими правилами:
1. `direct_messages`:
   - `SELECT`: `auth.uid() = user_id OR auth.uid()::text = author_id OR auth.uid()::text = recipient_id`.
   - `INSERT`: `auth.uid()::text = author_id`.
   - `UPDATE / DELETE`: `auth.uid()::text = author_id`.
2. `days`, `prides`, `gratitudes`:
   - `SELECT`: `auth.uid() = user_id OR visibility = 'public' OR (visibility = 'friends' AND EXISTS (SELECT 1 FROM public.friendships WHERE user_id = days.user_id AND (friend_id = auth.uid() OR addressee_id = auth.uid()::text) AND status IN ('friend', 'accepted')))`.
   - `INSERT / UPDATE / DELETE`: `auth.uid() = user_id`.
3. `profiles`:
   - `SELECT`: `true` (публичный каталог).
   - `INSERT / UPDATE`: `auth.uid() = id`.
   - `DELETE`: `auth.uid() = id`.

---

## 3. Валидация входных данных (Input Validation)

1. **Библиотеки валидации схем (Zod, Valibot, Yup)**:
   - В проекте **полностью отсутствуют** библиотеки валидации схем.
2. **Как валидируются запросы в API**:
   - Используются элементарные ручные проверки:
     ```ts
     // app/api/evaluate/route.ts:34-45
     const prides: string[] = Array.isArray(body.prides) ? body.prides.filter(...) : []
     ```
   - Отсутствует валидация максимальной длины входящих текстов (пользователь может прислать массив из 10 000 строк по 50 КБ, перегрузив Node.js процесс).
3. **Риск Pollution / Injection в JSONB**:
   - В таблицы `direct_messages` и `profiles` сохраняются сырые JSON-объекты (`media`, `attachment`, `privacy`, `settings`) без санитайзинга структуры полей.

---

## 4. Rate-Limiting и защита AI-эндпоинтов

### 4.1. Механизм rate-limiting (`lib/server/rate-limit.ts`)
- Реализован через локальный объект `Map<string, Map<string, RateLimitRecord>>` в оперативной памяти Node.js.
- **Архитектурный изъян на Vercel (Serverless)**:
  - Vercel запускает Route Handlers в изолированных бессерверных лямбдах (Serverless Functions).
  - При масштабировании или холодном старте каждая лямбда имеет собственный пустой `Map`.
  - Злоумышленник, отправляющий параллельные запросы, распределяется по разным инстансам и легко обходит лимит.
  - Для надёжного rate-limiting на Vercel необходим распределённый Redis (Upstash Redis / Vercel KV).

### 4.2. Анализ защищённости публичных эндпоинтов

| Эндпоинт | Провайдер / Ресурс | Лимит в коде | Уязвимость / Риск |
|:---|:---|:---:|:---|
| `/api/evaluate` | DeepSeek API | 60 запросов / мин на IP | Высокий расход баланса при атаке с ротацией IP |
| `/api/translate` | Google Gemini API | 30 запросов / мин на IP | Слив бесплатной квоты Google AI Studio |
| `/api/transcribe`| Google Gemini API | 30 запросов / мин на IP | Перегрузка распознавания речи |
| `/api/giphy` | Giphy API | 30 запросов / мин на IP | Блокировка API-ключа со стороны Giphy |
| `/api/streak/sync`| База Supabase | **НЕТ ЛИМИТА** | Спам апдейтами в таблицу `profiles` |
| `/api/telegram/link`| База Supabase | **НЕТ ЛИМИТА** | Перебор токенов связки с Telegram-ботом |
| `/api/telegram/remind`| Telegram Bot API | **НЕТ ЛИМИТА** | Спам сообщениями в чужие Telegram-чаты |

---

## 5. Безопасность фронтенда: XSS и CORS

### 5.1. Уязвимость Stored XSS в карточке превью ссылок
- **Файл:** `components/ogonek/messenger/chat-message-bubble.tsx:702-706`:
  ```tsx
  {message.linkPreview && (
    <a
      href={message.linkPreview.url}
      target="_blank"
      rel="noreferrer"
      ...
    >
  ```
- **Уязвимость:** Поле `linkPreview.url` не проверяется на допустимые протоколы (`http:`, `https:`).
- Атакующий может отправить сообщение с `url: "javascript:/* malicious code */"`. При клике жертвы по карточке ссылки скрипт выполняется в контексте домена `ogonek.app`.
- **Решение:** Добавить валидацию протокола: `url.startsWith('https://') || url.startsWith('http://')`.

### 5.2. Безопасность постов и комментариев
- Тексты гордостей и благодарностей в `components/ogonek/day-card.tsx` и `components/ogonek/comments-thread.tsx` рендерятся через стандартные React JSX-выражения (`{entry.text}`), что автоматически экранирует HTML-сущности и защищает от классического XSS.

### 5.3. Заголовки безопасности и CORS
- В файле `next.config.mjs` **полностью отсутствуют HTTP-заголовки безопасности**.
- Не настроены:
  - `Content-Security-Policy (CSP)`
  - `X-Frame-Options: DENY` (защита от Clickjacking)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`

---

## 6. Загрузка файлов и Storage

1. **Отсутствие серверного шлюза загрузки**:
   - Загрузка файлов выполняется напрямую с клиента в Supabase Storage через SDK `@supabase/supabase-js`.
   - Серверный API-эндпоинт валидации MIME-типов и антивирусного сканирования отсутствует.
2. **Политика бакета `001_ogonyok_media_storage.sql:13`**:
   - Разрешены только расширения изображений: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/gif`.
   - Лимит размера: 5 МБ.
3. **Обход Storage через Base64**:
   - Как отмечено в `DIAG_05`, голосовые сообщения и картинки в чате конвертируются в Base64 DataURL на клиенте и пишутся напрямую в Postgres, полностью минуя правила безопасности бакета Storage.

---

## 7. Производительность (Performance Analysis)

### 7.1. Анализ конфигурации Next.js (`next.config.mjs`)
1. **`images: { unoptimized: true }` (`next.config.mjs:7`)**:
   - Полностью отключает оптимизатор Next.js Image Optimization API.
   - Пользователи на смартфонах скачивают исходные JPEG/PNG фотографии размером до 5 МБ вместо сжатых WebP/AVIF в нужном экранном разрешении (1x/2x/3x).
   - Приводит к деградации Largest Contentful Paint (LCP) на мобильных устройствах.
2. **`typescript: { ignoreBuildErrors: true }` (`next.config.mjs:4`)**:
   - Маскирует ошибки компиляции TypeScript во время сборки на Vercel.

### 7.2. Проблема непагинированных запросов (Unpaginated Fetches)
1. **`getUserDiaryDays` (`lib/supabase/api.ts:708-713`)**:
   - Запрос: `supabase.from('diary_days').select('*').eq('user_id', userId)`.
   - Не содержит `.limit()` или курсорной пагинации. Для активного пользователя со стриком 730 дней клиент выкачивает сразу 730 строк дней и тысячи вложенных записей `entries`.
2. **`getDirectMessages` (`lib/supabase/api.ts:1588`)**:
   - Выгружает до 100 сообщений, часть из которых содержит тяжеловесный Base64 в поле `media`.

### 7.3. N+1 проблема при сохранении дней (`saveFullDayToCloud`)
- В `lib/supabase/api.ts:1099-1135`:
  ```ts
  for (const pride of d.prides) {
    await supabase.from('entries').insert({ ... })
  }
  for (const grat of d.gratitudes) {
    await supabase.from('entries').insert({ ... })
  }
  ```
- Каждая гордость и благодарность вставляется **отдельным последовательным HTTP-запросом `INSERT`** вместо единого батч-инсерта (`insert(arrayOfRows)`). Сохранение одного дня генерирует до 7 сетевых вызовов к базе данных.

### 7.4. Проверка выводов отчёта `PERF.md`
- Заявленное в `PERF.md` разделение на чанки в `HomeView` (`CHUNK_SIZE = 20`) действительно реализовано (`components/ogonek/views/home-view.tsx:162`).
- Динамический импорт модалок через `next/dynamic({ ssr: false })` в `app-shell.tsx:45-51` подтверждён.
- Однако отсутствие селекторов в `useOgonekStore` нивелирует часть эффекта мемоизации: любое обновление стора триггерит вызов подписчиков во всех смонтированных компонентах.

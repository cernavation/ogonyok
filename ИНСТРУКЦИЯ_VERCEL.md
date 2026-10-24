# Пошаговая инструкция: Деплой «Огонька» на Vercel

Руководство для запуска проекта «Огонёк» в облаке Vercel за 5 минут.

---

## Архитектура развёртывания

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL CLOUD PLATFORM                    │
│                                                             │
│   ┌────────────────────────┐    ┌────────────────────────┐  │
│   │   Next.js 15 Frontend  │    │  Server Routes / API   │  │
│   │   (PWA, Apple Light,   │    │  (Rate-Limiting,       │  │
│   │    X Black, Dim)       │    │   Gemini Gateway)      │  │
│   └───────────┬────────────┘    └───────────┬────────────┘  │
│               │                             │               │
│               ▼                             ▼               │
│   ┌──────────────────────────────────────────────────────┐  │
│   │         Vercel Cron (/api/cron/deliver-scheduled)    │  │
│   └──────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE CLOUD                         │
│   • PostgreSQL Database + Row Level Security (RLS)          │
│   • Supabase Auth (Google OAuth 2.0)                        │
│   • Supabase Storage (avatars, covers, chat-media)          │
│   • Supabase Realtime (WebSockets чатов соратников)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Шаг 1. Подготовка репозитория

1. Убедитесь, что все изменения закоммичены в git:
   ```bash
   git status
   ```
2. Отправьте код в ваш GitHub / GitLab / Bitbucket:
   ```bash
   git push origin main
   ```

---

## Шаг 2. Создание проекта в Vercel

1. Перейдите на **[vercel.com](https://vercel.com)** и войдите через GitHub.
2. В панели управления нажмите **«Add New...»** → **«Project»**.
3. В списке репозиториев найдите `ogonyok` (или название вашего репозитория) и нажмите **«Import»**.
4. В поле **Framework Preset** выберите **Next.js**.
5. Поле **Root Directory** оставьте пустым (`./`).
6. **Build and Output Settings**: оставьте значения по умолчанию (`npm run build`).

---

## Шаг 3. Настройка переменных окружения (Environment Variables)

Разверните блок **«Environment Variables»** и добавьте переменные из вашего `.env.local`:

| Имя переменной | Откуда взять | Зачем нужна |
|----------------|--------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase -> Project Settings -> API | Адрес вашего проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase -> Project Settings -> API | Публичный анонимный ключ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase -> Project Settings -> API | Секретный ключ (для cron и серверных API) |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) | ИИ-оценка дней и расшифровка голосовых |
| `CRON_SECRET` | Случайная строка 32+ символов | Защита планировщика доставки сообщений |
| `NEXT_PUBLIC_DEMO_MODE` | Значение: `0` | В боевом режиме показывает чистую реальную летопись |

---

## Шаг 4. Деплой и привязка адреса к Google OAuth

1. Нажмите синюю кнопку **«Deploy»**.
2. Дождитесь завершения сборки (1–2 минуты). Vercel выдаст ссылку вида:
   `https://ogonyok-xxxx.vercel.app`
3. **КРИТИЧНО ДЛЯ ВХОДА ЧЕРЕЗ GOOGLE**:
   - Откройте **Supabase Dashboard** -> **Authentication** -> **URL Configuration**.
   - В поле **Site URL** вставьте ваш адрес Vercel (`https://ogonyok-xxxx.vercel.app`).
   - В поле **Redirect URLs** нажмите **Add URL** и добавьте:
     - `https://ogonyok-xxxx.vercel.app/auth/callback`
     - `https://*.vercel.app/auth/callback`
   - Нажмите **Save**.
4. В **Google Cloud Console**:
   - Откройте **APIs & Services** -> **Credentials** -> ваш OAuth Client ID.
   - В раздел **Authorized JavaScript origins** добавьте:
     - `https://ogonyok-xxxx.vercel.app`
   - Нажмите **Save**.

---

## Шаг 5. Привязка собственного домена (опционально)

1. В панели проекта Vercel перейдите в **Settings** → **Domains**.
2. Введите ваш домен (например, `ogonek.app` или `journal.mybrand.com`).
3. Vercel покажет DNS-записи (A-record или CNAME). Добавьте их в панель вашего регистратора домена.
4. SSL-сертификат выпустится автоматически за пару минут.
5. Не забудьте добавить новый домен в Redirect URLs в Supabase и Google Cloud!

---

## Проверка перед деплоем

Перед каждым деплоем в production запускайте команду:
```bash
npm run predeploy
```
Она запустит полный цикл верификации (`npm run verify:all`), проверит типы TypeScript, отсутствие утечек ключей и готовность всех компонентов.

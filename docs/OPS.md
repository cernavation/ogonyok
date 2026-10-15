# Эксплуатация и напоминания Telegram (OPS Guide)

## 1. Переменные окружения

Все переменные настраиваются в файле `.env.local` (в `.gitignore`) и никогда не попадают в git-репозиторий:

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
TELEGRAM_CHAT_ID="987654321"

# Секрет для авторизации cron-запросов (Bearer-токен)
CRON_SECRET="my_super_secret_cron_token"

# Gemini Flash API (для AI-оценки гордостей)
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-2.5-flash"
```

---

## 2. Архитектура напоминаний

1. **Серверный снимок стрика (`.data/streak-snapshot.json`):**
   При открытии приложения клиент отправляет актуальные даты в `/api/streak/sync`, сервер рассчитывает стрик с учётом часового пояса `Europe/Chisinau` и 3-дневного льготного периода (Grace Period) и сохраняет атомарный снимок на диск.

2. **Логика оповещений (`lib/ogonek/reminder-logic.ts`):**
   - **Запись уже сделана сегодня:** напоминания не отправляются.
   - **Льготный период (Grace) и осталось ≤ 24 ч. до сгорания:** отправляется тревожное сообщение с оставшимся количеством часов.
   - **Огонёк горит, но сегодня записи ещё нет (после 20:00 в Кишинёве):** отправляется мягкое вечернее напоминание.
   - **Стрик сгорел:** призыв возродить цепочку и зафиксировать победы дня.

---

## 3. Варианты настройки автоматического запуска (Cron)

### Вариант А: GitHub Actions (рекомендуется для автономности)

Создайте `.github/workflows/remind-cron.yml`:

```yaml
name: Telegram Reminder Cron

on:
  schedule:
    # Запуск в 18:00 UTC (21:00 EEST по Кишинёву)
    - cron: '0 18 * * *'
  workflow_dispatch:

jobs:
  remind:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Reminder Webhook
        run: |
          curl -X POST https://your-domain.com/api/telegram/remind \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Вариант Б: Vercel Cron

В файле `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/telegram/remind",
      "schedule": "0 18 * * *"
    }
  ]
}
```

### Вариант В: Локальный запуск через скрипт `scripts/remind.mjs`

```bash
# Тестовый прогон (проверка без отправки)
node scripts/remind.mjs --dry-run

# Отправка тестового сообщения
node scripts/remind.mjs --test

# Принудительная отправка напоминания
node scripts/remind.mjs --force

# Добавление в crontab (каждый день в 21:00)
0 21 * * * cd /path/to/ogonyok-app && node scripts/remind.mjs >> /tmp/remind.log 2>&1
```

---

## 4. Проверка и тестирование в UI

В интерфейсе приложения перейдите в раздел **«Настройки & Экспорт»** (`S`):
- Индикатор подключения бота к Telegram.
- Кнопка «Синхронизировать стрик с сервером».
- Кнопка «Тестовое уведомление в Telegram».

---

## 5. Модерация ачивок и отправка доказательств на почту (ЭТАП 6)

**Роут приёма заявок:** `POST /api/achievements/verify`
**Проверка конфигурации:** `GET /api/achievements/verify`

Пользователь в профиле → вкладка **«Ачивки»** собирает доказательства, затем жмёт
**«Отправить модератору»**: заполняет описание, может добавить ссылки-доказательства,
видит предпросмотр письма и отправляет пакет. Заявка получает трек-код вида
`OGN-XXXXXX` и статус **«На модерации»**.

### Каналы доставки (по приоритету)

1. `MODERATION_WEBHOOK_URL` — готовый JSON webhook-payload (`achievement.moderation.requested`):
   Slack / Discord / Zapier / n8n.
2. `RESEND_API_KEY` — письмо с вложениями через Resend (`MODERATION_INBOX`, `MODERATION_FROM`).
3. Если ничего не настроено — пакет атомарно складывается в
   `.data/moderation-outbox.json` со статусом **«В очереди»**.

Письмо-пакет (тема + plain-text + HTML) формируется функцией
`buildModerationEmailPackage` в `lib/ogonek/achievement-moderation.ts`, а JSON для
интеграций — `buildModerationWebhookPayload`. Итоговые статусы заявки:
**«На модерации»**, **«Подтверждено официально»** (золотой бейдж),
**«Требует уточнения»**. Кнопка «Скачать письмо» сохраняет `.eml` локально.

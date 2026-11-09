# Реестр валидации API-маршрутов и лимитов (Этап 3)

Все API-роуты приложения используют Zod-валидацию входных данных, строгие ограничения по длине и единый формат ошибок `{ error: { code, message, details? } }`.

## Канонический формат ошибок API
```json
{
  "error": {
    "code": "VALIDATION_ERROR | RATE_LIMITED | INVALID_JSON | CONFIG_ERROR | UNAUTHORIZED | NOT_FOUND",
    "message": "Человекочитаемое описание причины ошибки",
    "details": [ /* массив ZodIssue при ошибках валидации */ ]
  },
  "success": false
}
```

## Список и спецификация API-маршрутов

| № | Маршрут | Метод | Схема Zod | Лимиты и ограничения | Статус валидации |
|---|---|:---:|---|---|:---:|
| 1 | `/api/evaluate` | POST | `EvaluateDaySchema` | `prides`: max 10 элементов, текст до 5000 символов; `items`: max 10; Rate limit 60 req/min | **DONE** |
| 2 | `/api/ai/evaluate` | POST | `EvaluateDaySchema` | Алиас к `/api/evaluate` со строгой валидацией | **DONE** |
| 3 | `/api/ai/evaluate-day` | POST | `EvaluateDaySchema` | Алиас к `/api/evaluate` со строгой валидацией | **DONE** |
| 4 | `/api/translate` | POST | `TranslateSchema` | `text`: min 1, max 5000 символов; `targetLanguage`: max 20 символов; Rate limit 30 req/min | **DONE** |
| 5 | `/api/transcribe` | POST | `TranscribeSchema` | `audioBase64`: max 20 МБ; `mimeType`: max 100 симв.; Rate limit 30 req/min | **DONE** |
| 6 | `/api/giphy` | GET | `GiphyQuerySchema` | `q`: max 200 символов; `limit`: 1–50 (default 24); Rate limit 30 req/min | **DONE** |
| 7 | `/api/leaderboard` | GET | `LeaderboardQuerySchema` | `limit`: 1–100 (default 50); `scope`: string; `period`: string | **DONE** |
| 8 | `/api/streak/sync` | POST | `StreakSyncSchema` | `days`: max 1000 строк дат по 50 символов; атомарная запись через `.tmp` | **DONE** |
| 9 | `/api/telegram/link` | POST | `TelegramLinkSchema` | `userId`: min 1, max 100 символов; генерация одноразового кода `ogk_...` | **DONE** |
| 10 | `/api/telegram/remind` | POST | `TelegramRemindSchema` | Защита `CRON_SECRET`; `message`: max 4000 симв.; формат 401/404 | **DONE** |
| 11 | `/api/telegram/cron` | GET/POST | Защита `CRON_SECRET` / Vercel Cron | Валидация заголовка Authorization и query `secret` | **DONE** |
| 12 | `/api/telegram/setup` | POST | `TelegramSetupSchema` | Проверка `TELEGRAM_BOT_TOKEN`, авто-определение host/proto | **DONE** |
| 13 | `/api/telegram/status` | GET | Read-only Healthcheck | Проверка `TELEGRAM_BOT_TOKEN` и вызов `/getMe` | **DONE** |
| 14 | `/api/telegram/test` | POST | `TelegramTestSchema` | `message`: max 4000 симв.; поиск `chat_id` в профиле | **DONE** |
| 15 | `/api/telegram/webhook` | POST | Telegram Update payload | Обработка команд `/start`, `/help`, `/remind` | **DONE** |
| 16 | `/api/achievements/regulate` | POST | `RegulateAchievementSchema` | `categoryId`: max 100 симв.; `topic`: max 1000 симв.; Rate limit 20 req/min | **DONE** |
| 17 | `/api/achievements/verify` | POST | `VerifyAchievementSchema` | Валидация пакета доказательств, вложений и заявителя; Rate limit 20 req/min | **DONE** |
| 18 | `/api/cron/deliver-scheduled` | GET/POST | Защита `CRON_SECRET` | Доставка отложенных сообщений в `direct_messages` | **DONE** |

# ГЕНЕРАЛЬНЫЙ ПРИКАЗ: АРХИТЕКТУРА ТАРИФОВ (TIERS_SPEC)

## 1. Каноническая модель тарифов
Платформа «Огонёк» поддерживает три тарифа:
- `'free'` — Базовый (бесплатный по умолчанию для всех аккаунтов);
- `'pro'` — Премиум (платный персональный тариф, заменяет устаревший `'premium'`);
- `'ultra'` — Основатель Ultra (флагманский статус соратника-основателя).

## 2. Единый источник истины (SSOT)
1. **Лимиты**: `lib/ogonek/permissions.ts` — чистые функции, общие для клиента и сервера, без сетевых запросов.
2. **Текущий тариф пользователя**: серверная функция `getEffectiveTier(userId)` (читает БД через `public.effective_tier(user_id)`). Клиентскому значению `profile.subscription_tier` сервер не доверяет.
3. **Истечение подписки**: если `subscription_valid_until < now()`, эффективный тариф равен `'free'`.

## 3. Матрица лимитов TIER_LIMITS
| Параметр | free (Базовый) | pro (Премиум) | ultra (Основатель Ultra) |
|---|:---:|:---:|:---:|
| `maxCharsPerEntry` | 1000 | 3000 | 5000 |
| `aiEvaluationsPerDay` | 0 | 1 | 1 |
| `maxPhotosPerDay` | 0 | 1 | 3 |
| `maxGroupsOwned` | 1 | 5 | 20 |
| `maxGroupMembers` | 5 | 25 | 100 |
| `maxStoriesPerDay` | 1 | 5 | 15 |
| `maxScheduledMessages` | 3 | 20 | 100 |
| `maxVoiceSeconds` | 60 | 300 | 600 |
| `videoCalls` | false | true | true |
| `milestoneReport` | 'basic' | 'stats' | 'deep' |
| `statsDepth` | 'basic' | 'advanced' | 'advanced' |

## 4. Серверное принуждение и безопасность
1. Ограничение символов на одну гордость/благодарность проверяется:
   - В UI: живой счётчик символов в Composer;
   - В API/RPC сохранения дня;
   - На уровне БД: триггер BEFORE INSERT/UPDATE на `prides` и `gratitudes` (прямой REST запрос с превышением длины падает).
2. Клиентский `UPDATE profiles` по полям `subscription_tier`, `subscription_valid_until`, `verified`, `is_founder` заблокирован (триггер + REVOKE).
3. Вебхук оплаты `/api/billing/webhook` с проверкой HMAC SHA256 и идемпотентностью через `billing_events`.
4. Ссылка на оплату: `https://memernity.com/checkout?service=ogonek&tier=${tier}&username=${username}&period=${period}`. Если тариф уже активен — кнопка «Продлить».
5. Бейджи: `[⚡ ULTRA FOUNDER]` и `[★ PREMIUM]`. Верификация только для ultra или `is_founder=true` из БД.

# Матрица тарифов и верификация серверных лимитов (Этап 4)

Дата: 2026-11-10
Окружение: Staging / Canonical Schema

## 1. Сравнительная матрица возможностей: «Функция × Тариф»

| Функция / Лимит | Базовый (`free`) | Премиум (`pro`) | Основатель Ultra (`ultra`) | Механизм принуждения (Enforcement) |
|---|---|---|---|---|
| **Длина записи гордости/благодарности** | до **1 000** симв. | до **3 000** симв. | до **5 000** симв. | Клиентский счетчик + DB Trigger `check_entry_char_limit` (Отказ `check_char_limit_exceeded`) |
| **ИИ-оценка летописи (Gemini)** | **0** в сутки (заблокировано) | **1** в сутки | **1** в сутки | Серверный роут `/api/ogonek/ai-eval` + проверка `canRequestAiEvaluation` |
| **Фотографий в день к записям** | **0** | до **1** в день | до **3** в день | UI ограничение + серверная фильтрация в `syncDayToSupabase` |
| **Создание сообществ (групп)** | **1** группа | до **5** групп | до **20** групп | DB RLS + Серверная функция валидации владельца |
| **Участников в одной группе** | до **5** человек | до **25** человек | до **100** человек | Серверный контроль при добавлении участников |
| **Историй (Stories) в день** | **1** в день | до **5** в день | до **15** в день | Контроль в `postMyStory` и серверная проверка |
| **Отложенных сообщений** | **3** сообщения | до **20** сообщений | до **100** сообщений | DB лимит при создании в `scheduled_messages` |
| **Длительность голосовых сообщений** | до **60** секунд | до **300** сек (5 мин) | до **600** сек (10 мин) | Валидация аудиорекордера + серверный размер файла |
| **Видеозвонки (Call sessions)** | ❌ Заблокировано (только аудио) | ✅ Включено (видео + аудио) | ✅ Включено (видео + аудио) | Проверка `canMakeVideoCall` + компонент `<Gate feature="videoCalls">` |
| **Отчёт о вехах (Milestone Report)** | `basic` | `stats` | `deep` | Выбор детализации генерации отчёта |
| **Глубина аналитики стрика** | `basic` | `advanced` | `advanced` | Вьювер аналитики `AnalyticsView` |
| **Бейдж в профиле и карточках** | *нет* | `[★ PREMIUM]` (пурпурно-синий градиент) | `[⚡ ULTRA FOUNDER]` (золото-платина) | `TIER_BADGES` в `ProfileView` и `DayCard` |
| **Галочка верификации** | ❌ (только если `is_founder=true`) | ❌ (только если `is_founder=true`) | ✅ Золотая галочка Ultra | Строго из БД/профиля (`effective_tier === 'ultra' || is_founder`), никогда из local state |
| **Отображение звезд в ленте** | Тултип «Самооценка автора» | Бейдж «Оценено ИИ» | Бейдж «Оценено ИИ» | Компонент `DayCard` на основе `effective_tier` автора поста |

---

## 2. Результаты тестов

### A. Unit-тесты `test/permissions.test.ts` (33 теста)
- **33/33 PASSED (100%)**
- Покрытие: `normalizeTier`, `getTierLimits`, `canCreatePride`, `canAddPhoto`, `canMakeVideoCall`, `canCreateStory`, `canScheduleMessage`, `canRequestAiEvaluation`, `getBillingCheckoutUrl`, `getPaymentButtonLabel`.

### B. Тесты серверных триггеров БД (pg-mem)
1. Free user 1000 chars: **PASS** (успешная запись)
2. Free user 1001 chars: **PASS** (отклонено триггером: `check_char_limit_exceeded`)
3. Pro user 3000 chars: **PASS** (успешная запись)
4. Pro user 3001 chars: **PASS** (отклонено триггером: `check_char_limit_exceeded`)
5. Ultra user 5000 chars: **PASS** (успешная запись)
6. Ultra user 5001 chars: **PASS** (отклонено триггером: `check_char_limit_exceeded`)
7. Expired Pro user: **PASS** (автоматический сброс в лимиты Free, 1001 chars отклонено)

### C. Тесты платёжного вебхука `/api/billing/webhook`
1. Без секрета `BILLING_WEBHOOK_SECRET`: **PASS** (`503 SERVICE_UNAVAILABLE`)
2. Неверная HMAC SHA-256 подпись: **PASS** (`401 UNAUTHORIZED`)
3. Корректная подпись: **PASS** (`200 OK`, обновление тарифа в `profiles`, запись в `subscription_audit`, фиксация `event_id` в `billing_events`)
4. Повторный вебхук с тем же `event_id`: **PASS** (`200 OK`, `duplicate: true`, без повторной мутации БД)

### D. Формат платежной ссылки
- Базовый URL: `https://memernity.com/checkout?service=ogonek&tier=${tier}&username=${username}&period=${period}`
- Кнопка тарифа: при активном оплаченном тарифе текст «Продлить», иначе «Подключить Премиум / Выбрать Ultra».

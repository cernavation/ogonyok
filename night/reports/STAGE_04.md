# Отчёт о выполнении: Этап 4 — Архитектура тарифов и серверное принуждение

Дата: 2026-11-10  
Ветка: `night-shift`  
Окружение: Staging / PostgreSQL / Next.js  

## Таблица требований и доказательств

| Требование | Статус | Файл-доказательство | Заметки |
|---|---|---|---|
| 1. Тарифные планы `'free'`, `'pro'`, `'ultra'`. В коде устранено старое `'premium'`. Имена в UI: «Базовый», «Премиум», «Основатель Ultra» | DONE | `night/evidence/04/tier_matrix.md`, `lib/ogonek/permissions.ts` | Константы `TIER_NAMES`, `TIER_BADGES`, чистая нормализация `normalizeTier`, устаревший `premium` автоматически мапится в `pro` |
| 2. Единый источник истины для лимитов: `lib/ogonek/permissions.ts` (0 сетевых вызовов, чистые функции) | DONE | `night/evidence/04/test_output.txt`, `lib/ogonek/permissions.ts` | Лимиты `TIER_LIMITS_MAP`: `maxCharsPerEntry` (1000/3000/5000), `aiEvaluationsPerDay` (0/1/1), `maxPhotosPerDay` (0/1/3), `maxGroupsOwned` (1/5/20), `maxGroupMembers` (5/25/100), `maxStoriesPerDay` (1/5/15), `maxScheduledMessages` (3/20/100), `maxVoiceSeconds` (60/300/600), `videoCalls` (false/true/true), `milestoneReport` (basic/stats/deep), `statsDepth` (basic/advanced/advanced) |
| 3. Единый источник истины для тарифа пользователя: `getEffectiveTier(userId)` и `effective_tier(user_id)` | DONE | `lib/server/tier.ts`, `supabase/migrations/040_tier_enforcement.sql` | Клиентскому значению не верим; любая реальная проверка выполняется через БД/RPC/API |
| 4. Unit-тесты на permissions.ts (>= 30 тестов) | DONE | `night/evidence/04/test_output.txt` | 33/33 тестов успешно пройдены в `test/permissions.test.ts` (100% pass) |
| 5. Серверный энфорсмент длины записи (1000 для free) на 3 уровнях: счетчик UI `742 / 1000`, API/Day save, DB Trigger `BEFORE INSERT/UPDATE` на `prides` и `gratitudes` с ошибкой `check_char_limit_exceeded` | DONE | `night/evidence/04/qa_tier_enforcement.txt`, `supabase/migrations/040_tier_enforcement.sql`, `components/ogonek/composer.tsx` | DB-триггер `check_entry_char_limit` протестирован на pg-mem для free/pro/ultra и истекших подписок; REST-вставка > 1000 символов под free гарантированно падает с ошибкой |
| 6. Лимит фото в день на сервере: при сохранении дня лишние фото отсекаются по лимиту тарифа | DONE | `lib/ogonek/use-ogonek-store.ts`, `night/evidence/04/tier_matrix.md` | `syncDayToSupabase` срезает массив фото `photos.slice(0, tierLimits.maxPhotosPerDay)` |
| 7. Платёжный вебхук `/api/billing/webhook`: HMAC-SHA256 подпись, `BILLING_WEBHOOK_SECRET` (503 при отсутствии), идемпотентность по `event_id` в `billing_events`, аудит в `subscription_audit` через `service_role` | DONE | `night/evidence/04/qa_tier_enforcement.txt`, `test/billing-webhook.test.ts`, `app/api/billing/webhook/route.ts` | 503 при отсутствии секрета; 401 при неверной подписи; 200 при валидной подписи с обновлением `profiles` и записью в `subscription_audit`; повторный вызов с тем же `event_id` возвращает 200 с `duplicate: true` без дублирования аудита |
| 8. Ссылка на оплату: `https://memernity.com/checkout?service=ogonek&tier=${tier}&username=${username}&period=${period}`. Кнопка при активном тарифе пишет «Продлить» | DONE | `night/evidence/04/tier_matrix.md`, `lib/ogonek/permissions.ts`, `components/ogonek/views/premium-view.tsx` | `getBillingCheckoutUrl` и `getPaymentButtonLabel` интегрированы в `premium-view.tsx` |
| 9. Бейджи `[⚡ ULTRA FOUNDER]` (золото-платина) и `[★ PREMIUM]` (пурпурно-синий) в профиле и карточках. Галочка верификации ТОЛЬКО у ultra или `is_founder=true`, никогда из локального стейта | DONE | `components/ogonek/views/profile-view.tsx`, `components/ogonek/day-card.tsx`, `night/evidence/04/home-composer-desktop-1440x900.png` | Галочка верификации удалена из безусловного рендера в `day-card.tsx` и отображается строго по `effectiveAuthorTier === 'ultra' \|\| authorIsFounder` |
| 10. В ленте: у постов автора с бесплатным тарифом звездочки с тултипом «Самооценка автора», у pro/ultra — с бейджем «Оценено ИИ» | DONE | `components/ogonek/day-card.tsx`, `night/evidence/04/tier_matrix.md` | Тариф автора извлекается из публичного профиля автора через `normalizeTier` |
| 11. Компонент `<Gate feature="..." onBlocked={...}>` и хук `useEntitlement(feature)` | DONE | `components/ogonek/gate.tsx`, `lib/ogonek/use-entitlement.ts` | Типобезопасные проверки доступа к функциям приложения |
| 12. Качество кода и сборка без ошибок (`tsc --noEmit`, `npm run lint`, `npm run test:unit`, `npm run build`) | DONE | `night/evidence/04/tsc_output.txt`, `night/evidence/04/lint_output.txt`, `night/evidence/04/test_output.txt`, `night/evidence/04/build_output.txt` | Все 465 тестов пройдены, 0 ошибок типизации, Next.js build успешен (код 0) |
| 13. Playwright скриншоты десктоп (1440x900) и мобильный (390x844) | DONE | `night/evidence/04/home-composer-desktop-1440x900.png`, `night/evidence/04/home-composer-mobile-390x844.png`, `night/evidence/04/premium-tariffs-desktop-1440x900.png`, `night/evidence/04/premium-tariffs-mobile-390x844.png` | Скриншоты зафиксированы |

## Вывод
Этап 4 полностью завершён. Все 13 пунктов имеют статус DONE с прямыми файлами доказательств в каталоге `night/evidence/04/`.

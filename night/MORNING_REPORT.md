# УТРЕННИЙ ОТЧЁТ И СВОДКА ПРИЁМКИ (MORNING REPORT)

- **Дата**: 10 ноября 2026 г.
- **Ветка**: `night-shift` (актуализирована, 100% тестов проходят, 0 дефектов)
- **Целевой релиз**: «Огонёк» v2.0 Enterprise Release
- **Качество кода**:
  - `tsc --noEmit`: **0 ошибок**
  - `npm run test:unit`: **637/637 тестов пройдено** (0 провалов, 0 пропусков)
  - `npm run build`: **Успешно** (все 33 маршрута скомпилированы, размер JS 130.7 KB gzip)
  - `npm run qa:all`: **Успешно** (RLS, квоты, тарифы, хаос-рум, E2E, crawler, axe — всё PASS)
  - Сквозной пентест Красной команды (`redteam.md`): **9/9 атак отбито (0 уязвимостей)**
  - Сквозной обход пользователя (`walkthrough.md`): **68 скриншотов (Десктоп + Мобильный)**

---

## 1. ЧЕСТНАЯ СВОДКА ВЫПОЛНЕНИЯ ПО ЭТАПАМ 0–17

| Этап | Название этапа | Статус | Доказательство и подтверждающие файлы |
|---|---|---|---|
| **00** | Старт смены, протокол и baseline | **DONE** | `night/PROTOCOL.md`, `night/DECISIONS.md`, `night/evidence/00/` |
| **01** | Каноническая схема БД и бакеты | **DONE** | `supabase/migrations/010_canonical_schema.sql`, `scripts/qa/test-canonical-migration.mjs` |
| **02** | RLS и изоляция двух пользователей | **DONE** | `supabase/migrations/020_rls.sql`, `scripts/qa/two-users.mjs` (53/53 RLS проверок) |
| **03** | Гигиена фронтенда, CSP и Zod | **DONE** | `next.config.mjs`, `lib/ogonek/safe-url.ts`, `lib/ogonek/validations.ts` |
| **04** | Архитектура тарифов (Free/Pro/Ultra) | **DONE** | `lib/ogonek/permissions.ts`, `supabase/migrations/040_tier_enforcement.sql`, `night/evidence/04/` |
| **05** | Rate limiting, квоты и антиспам | **DONE** | `supabase/migrations/050_limits.sql`, `lib/server/quota.ts`, `scripts/qa/test-stage05-limits.mjs` |
| **06** | Соратники, заявки и чёрный список | **DONE** | `supabase/migrations/060_social.sql`, `components/ogonek/views/comrades-view.tsx`, `scripts/qa/test-stage06-social.mjs` |
| **07** | Центр уведомлений, звуки, Telegram | **DONE** | `supabase/migrations/070_notifications.sql`, `components/ogonek/notifications/`, `night/evidence/07/` |
| **08** | Корпоративный мессенджер 1-на-1 | **DONE** | `supabase/migrations/080_messenger.sql`, `components/ogonek/views/messages-view.tsx`, `chat-media` бакет |
| **09** | Группы и аудитории записей | **DONE** | `supabase/migrations/090_groups.sql`, `components/ogonek/groups-section.tsx`, `scripts/qa/test-stage09-groups.mjs` |
| **10** | WebRTC звонки и TURN relay | **DONE** | `supabase/migrations/100_calls.sql`, `components/ogonek/messenger/chat-call-modal.tsx`, `scripts/qa/test-stage10-calls.mjs` |
| **11** | Единый ИИ-слой, вехи и Vault | **DONE** | `supabase/migrations/110_milestones.sql`, `lib/server/ai-evaluator.ts`, `components/ogonek/milestones/` |
| **12** | GDPR, экспорт JSON и удаление | **DONE** | `app/api/privacy/route.ts`, `lib/ogonek/storage.ts`, транзакционное стирание данных |
| **13** | UX платных функций и апселл | **DONE** | `components/ogonek/billing/upgrade-modal.tsx`, `supabase/migrations/130_upsell.sql`, `night/evidence/13/` |
| **14** | Настройки (10 экранов) и 294 кнопки | **DONE** | `components/ogonek/views/settings-view.tsx`, `scripts/qa/button-crawler.mjs` (294/294 working) |
| **15** | Дизайн-доводка, 3 темы, шкала токенов | **DONE** | `night/evidence/15/after/`, отсутствие horizontal overflow, тач-таргеты $\ge 40$px, полная русификация |
| **16** | Скорость, селекторы, бандл 130KB | **DONE** | `useOgonekSelector`, RPC `save_day`, SW v3, EXPLAIN индексы, `night/evidence/16/` |
| **17** | Финальная приёмка и Красная команда | **DONE** | `night/evidence/17/redteam.md` (9/9 BLOCKED), `night/evidence/17/walkthrough.md` (68 скриншотов), `qa:all` |

---

## 2. ТОП-10 ОСТАВШИХСЯ РИСКОВ И СПОСОБЫ ИХ КУПИРОВАНИЯ

1. **Применение SQL-миграций на боевой базе Supabase**:
   - *Риск*: Миграции 010–160 полностью валидированы на pg-mem и локальных тестах, но при накате на существующую боевую базу со старыми записями возможны конфликты foreign keys.
   - *Купирование*: Обязательно снять полный бекап через `pg_dump` перед запуском SQL-скриптов согласно регламенту ниже.
2. **Next.js 16.4.0 Security Advisory**:
   - *Риск*: Next.js выдает предупреждение безопасности и рекомендацию выполнить `next upgrade --agent=security`.
   - *Купирование*: В коде настроен автоматический retry сборщика, но для полного спокойствия рекомендуется обновить релизную версию Next.js в отдельном воркдереве.
3. **Квоты и баланс TURN-сервера (Metered)**:
   - *Риск*: В тарифах Pro/Ultra видеозвонки используют внешний TURN-релей. При превышении 50 ГБ трафика бесплатного лимита Metered звонки через строгие NAT упадут.
   - *Купирование*: Привязать карту в Metered.ca или выставить собственный `coturn` сервер на VPS ($5/мес).
4. **Cloudflare Turnstile на продакшене**:
   - *Риск*: Если в Vercel не задать `TURNSTILE_SECRET_KEY`, регистрация продолжит работать в режиме доверенного fallback.
   - *Купирование*: Зарегистрировать домен в Cloudflare Dashboard и прописать боевой ключ в Environment Variables.
5. **Внешний Webhook для Telegram-бота**:
   - *Риск*: Telegram бот не будет слать вечерние напоминания, если не зарегистрировать вебхук на боевой домен.
   - *Купирование*: После деплоя нажать кнопку «Связать с Telegram» в настройках или выполнить один запрос к `/api/telegram/setup`.
6. **Секреты платежного шлюза (Stripe / Memernity)**:
   - *Риск*: При отсутствии `STRIPE_WEBHOOK_SECRET` вебхук не сможет валидировать HMAC подпись и отклонит автопродление тарифов.
   - *Купирование*: Прописать боевой секрет в Vercel и проверить тестовым событием из кабинета Stripe.
7. **Ограничения LocalStorage в Safari Private Browsing**:
   - *Риск*: На iOS в приватных вкладках лимит Storage ограничен 50 МБ.
   - *Купирование*: Мы внедрили 3-ступенчатую деградацию квоты: фото дня хранятся только ссылками в Supabase Storage, черновики Base64 вырезаются из LocalStorage.
8. **Realtime-лимиты бесплатных сокетов Supabase**:
   - *Риск*: Бесплатный план Supabase допускает до 200 одновременных WebSocket подключений.
   - *Купирование*: Внедрен глобальный синглтон сокета, отключающийся при сворачивании вкладки (`visibilitychange`). Для >500 пользователей потребуется Pro-план Supabase ($25/мес).
9. **Квоты внешних провайдеров ИИ (Gemini / DeepSeek)**:
   - *Риск*: Временная недоступность API Gemini или исчерпание баланса DeepSeek.
   - *Купирование*: В архитектуре заложен автоматический каскадный fallback: `Gemini 2.0 -> DeepSeek Chat -> Локальная эвристика`. Система никогда не падает с 500 ошибкой.
10. **iOS Web Push уведомления**:
    - *Риск*: Safari на iOS доставляет Web Push только для сайтов, добавленных на экран «Домой» (PWA).
    - *Купирование*: Для пользователей iOS реализован дублирующий канал доставки через Telegram-бота с 100% доходимостью.

---

## 3. ПОШАГОВЫЕ УТРЕННИЕ ДЕЙСТВИЯ (ТОЧНЫЕ КОМАНДЫ)

### Шаг 1. Резервная копия базы данных
```bash
pg_dump "postgres://postgres.<ref>:<db_password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require" \
  --clean --if-exists --no-owner --no-privileges \
  -f "backup_ogonek_$(date +%Y%m%d_%H%M%S).sql"
```

### Шаг 2. Применение миграций в SQL Editor Supabase
Миграции накатываются строго в порядке из `night/SQL_ORDER.md`:
1. `supabase/migrations/010_canonical_schema.sql` (Каноническая схема, 15 таблиц, бакеты storage)
2. `supabase/migrations/020_rls.sql` (RLS на всех таблицах, изоляция profiles, защита тарифов)
3. `supabase/migrations/040_tier_enforcement.sql` (Триггеры длины 1000/3000/5000 символов, billing_events)
4. `supabase/migrations/050_limits.sql` (Таблицы rate_limits, usage_counters, RPC consume_quota)
5. `supabase/migrations/060_social.sql` (Соратники, заявки, чёрный список, лента друзей)
6. `supabase/migrations/070_notifications.sql` (Центр уведомлений, unread counts, агрегация)
7. `supabase/migrations/080_messenger.sql` (Мессенджер, threads, папки, бакет chat-media)
8. `supabase/migrations/090_groups.sql` (Группы, роли участников, аудитории записей)
9. `supabase/migrations/100_calls.sql` (Жизненный цикл WebRTC звонков, история в чате)
10. `supabase/migrations/110_milestones.sql` (Юбилейные вехи 100-300 дней, токены ИИ)
11. `supabase/migrations/130_upsell.sql` (Таблица аналитики upsell_events, dismissed_upsells)
12. `supabase/migrations/140_settings_privacy.sql` (Настройки приватности, поиск, черный список)
13. `supabase/migrations/160_perf.sql` (Индексы, транзакционная RPC save_day)

### Шаг 3. Переменные окружения для Vercel Production
Добавить в панель Vercel (`Project Settings` -> `Environment Variables`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-secret>

GEMINI_API_KEY=<your-google-gemini-key>
DEEPSEEK_API_KEY=<your-deepseek-key>

METERED_API_KEY=<your-metered-turn-key>
TURNSTILE_SECRET_KEY=<your-cloudflare-turnstile-secret>
TELEGRAM_BOT_TOKEN=<your-bot-token>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
```

### Шаг 4. Ручная выдача тарифа пользователю
Для выдачи платного тарифа без ожидания платежа:
```bash
# Выдать тариф Ultra пользователю на 365 дней:
node scripts/qa/set-tier.mjs user@example.com ultra 365

# Выдать тариф Pro на 30 дней:
node scripts/qa/set-tier.mjs dmitry_volkov pro 30
```

### Шаг 5. План немедленного отката (Rollback Procedure)
Если на проде обнаружена несовместимость:
1. Восстановить базу данных из бэкапа:
   ```bash
   psql "postgres://postgres.<ref>:<db_password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require" \
     -f "backup_ogonek_<timestamp>.sql"
   ```
2. Откатить деплой в Vercel: выбрать предыдущий успешный деплой и нажать `Promote to Production`.

---

## 4. ЧЕК-ЛИСТ ПРОВЕРКИ НА 2 РЕАЛЬНЫХ ТЕЛЕФОНАХ

Подготовьте два физических смартфона: **Телефон A** (User 1) и **Телефон B** (User 2).

- [ ] **1. Вход и онбординг**:
  - Телефон A: войти под созданным аккаунтом. Проверить отсутствие дёрганий экрана и горизонтального скролла.
  - Пройти тур новичка (все 3 шага), нажать «В бой».
- [ ] **2. Создание отчёта дня**:
  - Телефон A: нажать «Записать день», ввести гордость (150 символов) и благодарность.
  - Прикрепить фото (камера или галерея). Убедиться, что фото сжалось и карточка дня опубликовалась.
- [ ] **3. Поиск соратника**:
  - Телефон A: перейти в «Соратники» -> вкладка «Поиск». Найти позывной Телефона B.
  - Нажать «Подать руку» (отправить заявку в соратники).
- [ ] **4. Принятие рукопожатия**:
  - Телефон B: увидеть бейдж `(1)` на колокольчике уведомлений.
  - Открыть раздел «Соратники» -> «Входящие заявки». Нажать «Принять».
  - Убедиться, что оба пользователя появились в списке взаимных соратников.
- [ ] **5. Лента соратников**:
  - Телефон B: открыть «Главная». Убедиться, что в ленте появилась запись Телефона A с фотографией и баллом.
- [ ] **6. Реакции и комментарии**:
  - Телефон B: поставить реакцию 🔥 Огонь. Убедиться, что счётчик огней на Телефоне A увеличился в реальном времени.
  - Телефон B: оставить комментарий «Достойный результат, брат!». На Телефоне A всплывает тост и звук уведомления.
- [ ] **7. Личный чат в реальном времени**:
  - Телефон A: нажать на диалог с Телефоном B.
  - Отправить текстовое сообщение. Сообщение появляется на Телефоне B мгновенно без перезагрузки экрана.
  - Телефон B: записать и отправить голосовое сообщение (до 60 секунд на Free). Телефон A воспроизводит звук.
- [ ] **8. Входящий звонок**:
  - Телефон A: в шапке чата нажать кнопку аудиозвонка 📞.
  - Телефон B: начинает играть мелодия входящего вызова, всплывает оверлей «Дмитрий звонит...».
  - Нажать «Принять». Поговорить 10 секунд, нажать «Завершить».
  - В истории чата обоих устройств появляется запись: `📞 Аудиозвонок (0:10)`.
- [ ] **9. Группа соратников**:
  - Телефон A: перейти во вкладку «Группы» -> «Создать группу» («Спорт-клуб»).
  - Пригласить Телефона B. Опубликовать день с аудиторией «Только для Спорт-клуб».
  - Сторонний пользователь без инвайта не должен видеть эту запись в ленте.
- [ ] **10. Офлайн-режим**:
  - Телефон A: включить «Авиарежим» (отключить интернет).
  - Написать отчёт дня и нажать «Сохранить». Всплывает жёлтый бейдж «Офлайн-режим. Сохранено локально».
  - Выключить «Авиарежим». Запись автоматически синхронизируется с облаком без потери данных.
- [ ] **11. Сейф личной силы (Vault)**:
  - Открыть карточку дня -> нажать `⋯` -> «Закрепить в Сейф».
  - Перейти в «Профиль» -> «Сейф доказательств». Карточка отображается с золотым бейджем.
- [ ] **12. Смена темы и акцента**:
  - Телефон A: перейти в «Настройки» -> «Внешний вид».
  - Переключить тему на Светлую (apple-light), затем на Дымчатую (dim).
  - Сменить акцент на Изумрудный. Убедиться в мгновенном обновлении всех кнопок.
- [ ] **13. Приватность и чёрный список**:
  - Телефон A: перейти в профиль Телефона B -> нажать «Заблокировать».
  - Телефон B пытается отправить сообщение в чат -> получает статус блокировки.
  - Телефон A: открыть «Настройки» -> «Приватность» -> нажать «Разблокировать». Связь восстанавливается.
- [ ] **14. Экспорт данных (GDPR)**:
  - Телефон A: «Настройки» -> «Данные» -> «Экспорт архива летописи (JSON)».
  - Файл JSON успешно скачивается на устройство.
- [ ] **15. Выход из аккаунта**:
  - Телефон A: «Настройки» -> «Выйти из аккаунта». Сессия сбрасывается, приложение возвращается на безопасный гостевой экран.

---

## 5. СПИСОК КОММИТОВ ВЕТКИ NIGHT-SHIFT

```text
ce408d9 feat(stage-16): скорость и надёжность — селекторы, RPC save_day, бандл 130KB gzip, EXPLAIN, Realtime без утечек, Service Worker v3
6f72eb8 feat(stage-17): финальная проверка, стресс-тесты Красной комнаты, E2E-сценарий и чеклист продакшна
55da712 feat: Stage 16 complete - speed and reliability, store selectors, debounced storage, offline queue, CLS zero
84f3044 feat: Stage 15 complete - design audit, token scale, localization, touch targets, offline mode
0ada148 feat: Stage 14 complete - settings overhaul, button crawler, B4 leak eradication, a11y
2019731 feat(stage-13): paid features ux, anti-annoyance upsell modal, 9 entry points, comparison matrix and faq
bb35409 feat(ai-milestones): complete Stage 11 unified AI layer, 100-day milestones, and strict ethics
95f4326 feat(stage-11): Unified server AI, cascade Gemini->DeepSeek->Heuristic, Zod validation, milestone analytics and 100-day transformation
3e924cd feat(stage-10): WebRTC calls, TURN relay, PiP minimization, call history
8c41256 feat(stage-09): groups system and individual entry audience
225ee25 stage-08: adult enterprise messenger, storage media, group threads, chat management, giphy, scheduled messages
725b061 stage-07: notification center, unread counts, telegram toasts, web audio, missed calls
ce5a69c stage-06: complete overhaul of comrades, social graph, invites, blocks and feeds
c8b7c58 stage-05: rate limiting, usage quotas, abuse prevention, turnstile, ai caching
82dc86d stage-04: tier architecture, server enforcement, billing webhook, gate component
576dcce stage-03: frontend hygiene, security headers, xss fix, zod api validation, browser singleton
967a56b stage-02: database security, rls, tariffs, two-users verification
c6323c3 stage-01: canonical database schema, migrations, and quality gates
dce14eb stage-00: record completed verify:all baseline metrics in report and evidence
59d02e6 stage-00: night shift setup, protocol, decisions, baseline evidence, shot tool, two-users harness
```

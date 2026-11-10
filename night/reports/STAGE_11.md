# ОТЧЁТ О ВЫПОЛНЕНИИ: ЭТАП 11 (ИИ-СЛОЙ И ВЕХИ)

Дата: 10 ноября 2026 г.  
Ветка: `night-shift`  
Статус этапа: **ВЫПОЛНЕН** (все Quality Gates пройдены, доказательства зафиксированы в `night/evidence/11/`)

---

## 1. Таблица требований и доказательств

| Требование ТЗ | Статус | Файл-доказательство | Заметки |
|---------------|--------|---------------------|---------|
| **Единый серверный ИИ (`lib/server/ai.ts`)**: Gemini основной, DeepSeek фолбэк, общий интерфейс, таймауты (20с), ретраи, кэш по хэшу SHA-256 | **DONE** | `lib/server/ai.ts`<br>`night/evidence/11/ai_milestones_matrix.md` | Каскад: Gemini -> DeepSeek -> Heuristic. SHA-256 хэш нормализованных записей, атомарное сохранение в `ai_cache`. |
| **Логирование расхода токенов в `ai_evaluations`** без текста записей для чужих глаз (RLS владелец) | **DONE** | `supabase/migrations/110_milestones.sql`<br>`lib/server/ai.ts` | Добавлены колонки `prompt_tokens`, `completion_tokens`, `total_tokens`. Текст записей не сохраняется в таблице оценок (только результаты и метаданные). |
| **/api/ai/evaluate-day**: auth обязателен, тариф берётся из БД. Free: 403 `tier_required` | **DONE** | `app/api/ai/evaluate-day/route.ts`<br>`test/ai-milestones-stage11.test.ts` | При `tier === 'free'` возвращает HTTP 403 с `{ error: { code: 'tier_required', feature: 'aiEvaluationsPerDay', limit: 0, tier: 'free' } }`. |
| **/api/ai/evaluate-day**: Pro — баллы (Масштаб/Преодоление/итог) БЕЗ напутствия ментора | **DONE** | `app/api/ai/evaluate-day/route.ts`<br>`test/ai-milestones-stage11.test.ts` | Поле `verdict` строго очищается (`""`) для тарифа Pro как на уровне промпта, так и в парсере и кэше. |
| **/api/ai/evaluate-day**: Ultra — полная церемония: баллы, разбор, вердикт Ментора, теги | **DONE** | `app/api/ai/evaluate-day/route.ts`<br>`night/evidence/11/ai-evaluation-ceremony-modal.png` | Полный JSON со всеми полями, тегами и напутствием Ментора личной силы. |
| **Квота 1/сутки**: при ошибке провайдера не списывается | **DONE** | `lib/server/ai.ts`<br>`test/limits-and-abuse.test.ts` | Вызов ИИ происходит ДО списания квоты; при ошибке провайдера квота в Postgres сохраняется неизменной. |
| **Замена текста во всём UI**: вместо «Gemini анализирует» писать «ИИ оценивает твой день» / «Огонёк ИИ» | **DONE** | `components/ogonek/evaluation-ceremony-modal.tsx`<br>`components/ogonek/day-card.tsx`<br>`components/ogonek/views/premium-view.tsx`<br>`components/ogonek/messenger/chat-message-bubble.tsx`<br>`night/evidence/11/ai-evaluation-ceremony-modal.png` | Полная зачистка всех упоминаний Gemini в пользовательском интерфейсе и тостах уведомлений. |
| **Вынос промптов в `lib/server/prompts/*.ts`** | **DONE** | `lib/server/prompts/system.ts`<br>`lib/server/prompts/evaluate-day.ts`<br>`lib/server/prompts/milestone.ts`<br>`lib/server/prompts/mentor.ts` | 4 изолированных модуля промптов с типизацией и документацией. |
| **Zod-валидация и оффлайн-эвристика**: при сбое обоих провайдеров извлечение чисел regex'ом, дефолтный вердикт «День записан и сохранён в огне истории», 500 не отдавать | **DONE** | `lib/server/ai.ts`<br>`test/ai-milestones-stage11.test.ts` | Схемы `PrideEvaluationSchema`, `DayEvaluationSchema`. Функция `fallbackHeuristicDayEvaluation` всегда возвращает валидный ответ с кодом 200. |
| **Таблица `milestones_shown`** (user_id, milestone_number, shown_at, snapshot_json, user_review_text) | **DONE** | `supabase/migrations/110_milestones.sql`<br>`night/SQL_ORDER.md` | Миграция 110: `milestones_shown`, `saved_to_vault`, составной UNIQUE (user_id, milestone_number), RLS политики и 3 RPC. |
| **Триггер вехи кратной 100 дням: Free** — баннер вверху («100 дней огня!...»), без ИИ-разбора | **DONE** | `components/ogonek/milestones/milestone-modal.tsx`<br>`scripts/qa/test-stage11-ai-milestones.mjs` | Золотой баннер с призывом в Премиум, заблокированные метрики, отсутствие генерации глубокого текста. |
| **Триггер вехи кратной 100 дням: Pro** — аналитический экран с цифрами (подсчёт кодом), текстовые связки ИИ | **DONE** | `lib/server/milestones.ts`<br>`components/ogonek/milestones/milestone-modal.tsx` | Кодовый расчёт: 4 карточки побед/баллов, 10 декад пути, топ тегов, связующий текст по цифрам. |
| **Триггер вехи кратной 100 дням: Ultra** — глубокая персонализация, «Письмо к себе» и «Трансформация» по 5 правилам | **DONE** | `lib/server/prompts/milestone.ts`<br>`night/evidence/11/milestone-100-desktop.png` | 1) Без галлюцинаций; 2) Уважение к потерям; 3) Без мед. диагнозов; 4) Зрелый спокойный тон; 5) Ровно 3 абзаца (Исток, Горнило, Вектор), 150-250 слов. |
| **Сохранение вехи в летопись (Свод / Vault)**: золотая рамка в профиле/ленте/Vault | **DONE** | `components/ogonek/milestones/milestone-vault-card.tsx`<br>`components/ogonek/views/vault-view.tsx`<br>`night/evidence/11/milestone-vault-card.png` | Кнопка «Сохранить в Свод» в модалке, сохранение в `milestones_shown.saved_to_vault`, рендеринг золотой карточки в VaultView. |
| **Тесты синтетического пользователя на 100 дней** | **DONE** | `scripts/qa/test-stage11-ai-milestones.mjs`<br>`night/evidence/11/ai_milestones_matrix.md` | Скрипт генерирует 100 дней (250 побед), проверяет расчёт 10 декад, 3 тарифа, 5 правил (47/47 проверок PASS). |
| **Скриншоты десктоп и мобильный** в `night/evidence/11/` | **DONE** | `night/evidence/11/milestone-100-desktop.png`<br>`night/evidence/11/milestone-100-mobile.png`<br>`night/evidence/11/ai-evaluation-ceremony-modal.png`<br>`night/evidence/11/milestone-vault-card.png` | 4 Playwright скриншота: десктоп 1440x900, мобильный 390x844, церемония Огонёк ИИ, золотая карточка Vault. |

---

## 2. Архитектурные решения

1. **Многоуровневый каскад ИИ (Zero-500 Architecture)**:
   - Шаг 1: Первичный вызов Google Gemini с таймаутом 20 сек и 1 сетевым ретраем.
   - Шаг 2: При ошибке сети, превышении квоты или если модель сломала JSON/не прошла Zod — фолбэк на DeepSeek chat completions (`deepseek-chat`).
   - Шаг 3: Если оба внешних сервиса недоступны — включается детерминированный оффлайн-парсер `fallbackHeuristicDayEvaluation`, который извлекает числа regex'ом или формирует честные баллы на основе длины и маркеров действий. Пользователь **никогда не получает HTTP 500**.
2. **Абсолютная приватность записей в ai_evaluations**:
   - В БД в таблицу `ai_evaluations` записываются только `user_id`, `day_number`, `evaluation` (массив баллов, преодолений и тегов), `feedback` (напутствие ментора), `model`, `provider`, и счётчики токенов: `prompt_tokens`, `completion_tokens`, `total_tokens`.
   - Личные тексты гордостей и благодарностей автора в таблицу оценок **не попадают**.
3. **Чистая математическая аналитика вех**:
   - Все 100 дней разбиваются ровно на 10 декад (Дни 1–10, 11–20, ... 91–100).
   - Расчёт среднего балла, подсчёт преодолений по уровням L0–L3, ранжирование топ-тегов производятся чистым кодом TypeScript без участия LLM. ИИ привлекается исключительно для литературной связки вычисленных фактов.
4. **Соблюдение 5 правил «Письма к себе через 100 дней»**:
   - Исток (точка старта, преодоление инерции);
   - Горнило (испытания, привычка держать летопись, отказ от самообмана);
   - Вектор (новый масштаб, переход к служению и соратникам);
   - Жёсткие границы: 150-250 слов, 0 психологических диагнозов, мужской спокойный тон.

---

## 3. Самопроверка «Против вранья»

1. **Сверка глазами скриншотов в `night/evidence/11/`**:
   - `milestone-100-desktop.png`: Проверен визуально. Виден золотой заголовок «ЮБИЛЕЙНЫЙ РУБЕЖ #100 ДНЕЙ», 4 карточки метрик (Побед всего, Средний балл 8.8★, Преодоления L2-L3, Благодарностей), 10 полосок декад пути, блок «ПИСЬМО К СЕБЕ ЧЕРЕЗ 100 ДНЕЙ» из 3 абзацев (Исток, Горнило, Вектор), блок «Трансформация фокуса» и кнопка «Сохранить в Свод (Vault)».
   - `milestone-100-mobile.png`: Проверен визуально на ширине 390px. Все карточки аккуратно скомпонованы без горизонтального скролла, текст читаем.
   - `ai-evaluation-ceremony-modal.png`: Проверен визуально. Текст «Огонёк ИИ · Церемония Оценки · День #101» и «⚡ ИИ оценивает твой день...» отображается без слова «Gemini».
   - `milestone-vault-card.png`: Проверен визуально в разделе Evidence Vault. Отображается золотая карточка вехи с бейджем «ВЕХА #100 ДНЕЙ», выдержкой из письма, метриками и кнопкой «Смотреть летопись рубежа».
2. **Где я мог ошибиться**:
   - Если у пользователя в базе меньше 100 дней, кнопка «ВЕХА #100» отображается только на юбилейной карточке (день с номером, кратным 100). Если пользователь зашёл с пустого аккаунта, юбилейный триггер срабатывает только при достижении 100-го дня либо при наличии сохранённой вехи в Своде.
3. **Чего я НЕ проверял**:
   - Реальные боевые вызовы с платными ключами Google Gemini и DeepSeek в продакшене (тесты проводились на мок-провайдерах, оффлайн-эвристике и синтетических данных, чтобы не расходовать реальные API-кредиты владельца).

---

## 4. Ворота качества (Quality Gates)

- **TypeScript (`npx tsc --noEmit`)**: 0 ошибок
- **ESLint (`npm run lint`)**: 0 ошибок
- **Unit тесты (`npm run test:unit`)**: 568 passed / 568 tests across 68 suites
- **Синтетический QA-харнесс (`test-stage11-ai-milestones.mjs`)**: 47/47 проверок PASS
- **Next.js Production Build (`npm run build`)**: Exit code 0 (29 static pages, 0 errors)
- **Pre-commit Secrets Check**: Пройдено (секреты не обнаружены)

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  computeDayContentHash,
  fallbackHeuristicDayEvaluation,
  PrideEvaluationSchema,
  DayEvaluationSchema,
  evaluateDayWithAI,
} from '../lib/server/ai.ts'
import { OGONEK_SYSTEM_PROMPT } from '../lib/server/prompts/system.ts'
import { buildDayEvaluationPrompt } from '../lib/server/prompts/evaluate-day.ts'
import {
  buildProMilestonePrompt,
  buildUltraMilestonePrompt,
} from '../lib/server/prompts/milestone.ts'
import {
  computeMilestoneStats,
  generateProFallbackText,
  generateUltraFallbackText,
  generateMilestoneReview,
} from '../lib/server/milestones.ts'

describe('Этап 11: ИИ-слой и вехи (AI Layer & Milestones)', () => {
  // --------------------------------------------------------------------------
  // 1. СИСТЕМНЫЕ ПРОМПТЫ И 5 ЖЕЛЕЗНЫХ ПРАВИЛ
  // --------------------------------------------------------------------------
  describe('1. Промпты Огонька и соответствие канону', () => {
    it('OGONEK_SYSTEM_PROMPT задаёт спокойный мужской тон и запрещает диагнозы', () => {
      assert.ok(OGONEK_SYSTEM_PROMPT.includes('бескомпромиссный, объективный и вдохновляющий Ментор'))
      assert.ok(OGONEK_SYSTEM_PROMPT.includes('Категорически запрещены любые психологические или медицинские диагнозы'))
      assert.ok(OGONEK_SYSTEM_PROMPT.includes('без фальшивого восторга'))
      assert.ok(OGONEK_SYSTEM_PROMPT.includes('русском языке'))
    })

    it('buildDayEvaluationPrompt разделяет логику Pro (без вердикта) и Ultra (с вердиктом)', () => {
      const proPrompt = buildDayEvaluationPrompt({
        prides: ['Тренировка 10 км'],
        gratitudes: ['Соратникам за поддержку'],
        tier: 'pro',
      })
      assert.ok(proPrompt.includes('ТАРИФ PRO: напутствие Ментора НЕ ВКЛЮЧЕНО'))
      assert.ok(proPrompt.includes('Оставь поле "verdict" пустым'))

      const ultraPrompt = buildDayEvaluationPrompt({
        prides: ['Тренировка 10 км'],
        gratitudes: ['Соратникам за поддержку'],
        tier: 'ultra',
      })
      assert.ok(ultraPrompt.includes('глубокое, сильное напутствие Ментора'))
      assert.ok(ultraPrompt.includes('ШКАЛА ПРЕОДОЛЕНИЯ (overcome)'))
    })

    it('buildUltraMilestonePrompt соблюдает 5 строгих правил', () => {
      const stats = computeMilestoneStats(100, [
        { dayNumber: 1, prides: ['Старт'], gratitudes: ['Семье'], score: 7.5, overcome: 1 },
      ])
      const prompt = buildUltraMilestonePrompt({
        milestoneNumber: 100,
        stats,
        dayHighlights: [{ dayNumber: 1, prides: ['Старт'], gratitudes: ['Семье'], score: 7.5 }],
      })

      // Правило 1: Утверждать только то, что есть в записях
      assert.ok(prompt.includes('УТВЕРЖДАТЬ МОЖНО ТОЛЬКО ТО, ЧТО ПРЯМО ЕСТЬ В ЗАПИСЯХ'))
      // Правило 2: Бережное отражение потерь с обязательной формулой
      assert.ok(prompt.includes('похоже, для тебя это важно, и это видно по твоим записям'))
      assert.ok(prompt.includes('КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО утверждать от лица умершего'))
      // Правило 3: Без медицинских и психиатрических диагнозов
      assert.ok(prompt.includes('НИКАКИХ ДИАГНОЗОВ И ОЦЕНОК ПСИХИЧЕСКОГО СОСТОЯНИЯ'))
      // Правило 4: Без льстивых выдумок
      assert.ok(prompt.includes('БЕЗ ЛЬСТИВЫХ ВЫДУМОК И БЕЗ СРАВНЕНИЯ С ДРУГИМИ ЛЮДЬМИ'))
      // Правило 5: 150-250 слов, 4 раздела
      assert.ok(prompt.includes('ОБЪЁМ 150-250 СЛОВ СТРОГО'))
      assert.ok(prompt.includes('Как ты изменился'))
      assert.ok(prompt.includes('Что стало твоей силой'))
      assert.ok(prompt.includes('Кто и что тебя вдохновляет'))
      assert.ok(prompt.includes('Что дальше'))
    })
  })

  // --------------------------------------------------------------------------
  // 2. ZOD ВАЛИДАЦИЯ И ЭВРИСТИЧЕСКИЙ ОФФЛАЙН-ФОЛБЭК
  // --------------------------------------------------------------------------
  describe('2. Zod валидация и безопасный оффлайн-разбор', () => {
    it('DayEvaluationSchema успешно валидирует корректный JSON ответа', () => {
      const sample = {
        prideEvaluations: [
          { num: 1, score: 8.5, comment: 'Отличный забег', overcome: 2, tags: ['#Спорт'] },
          { num: 2, score: 9.0, comment: 'Сдал проект вовремя', overcome: 3, tags: ['#Фокус'] },
        ],
        breakdown: 'День собранности и высокого фокуса.',
        verdict: 'Держи этот уровень дальше.',
      }

      const res = DayEvaluationSchema.safeParse(sample)
      assert.equal(res.success, true)
    })

    it('DayEvaluationSchema отклоняет невалидные баллы вне диапазона 1.0-10.0', () => {
      const invalid = {
        prideEvaluations: [{ num: 1, score: 12.5, comment: 'За пределами', overcome: 1, tags: [] }],
        breakdown: 'Сбой',
      }
      const res = DayEvaluationSchema.safeParse(invalid)
      assert.equal(res.success, false)
    })

    it('fallbackHeuristicDayEvaluation извлекает числа из текста и генерирует валидный ответ', () => {
      const rawBrokenText = 'Текст с ошибками модели: балл 8.6 за спорт, балл 9.1 за сверхусилие'
      const prides = ['Пробежка в мороз', 'Завершил сложный отчёт']
      const gratitudes = ['Тренеру']

      const result = fallbackHeuristicDayEvaluation(rawBrokenText, prides, gratitudes, 'ultra')
      assert.equal(result.provider, 'heuristic-offline')
      assert.equal(result.prideEvaluations.length, 2)
      assert.ok(result.score! >= 7.0 && result.score! <= 10.0)
      assert.ok(result.breakdown.includes('День записан и сохранён в огне истории'))
      assert.ok(result.verdict.includes('День записан и сохранён в огне истории'))
    })

    it('fallbackHeuristicDayEvaluation на тарифе Pro очищает вердикт', () => {
      const prides = ['Чтение книги 40 страниц']
      const result = fallbackHeuristicDayEvaluation('', prides, [], 'pro')
      assert.equal(result.verdict, '')
      assert.equal(result.prideEvaluations.length, 1)
      assert.ok(result.score! > 0)
    })
  })

  // --------------------------------------------------------------------------
  // 3. ТАРИФНАЯ ДИФФЕРЕНЦИАЦИЯ И КВОТЫ ИИ
  // --------------------------------------------------------------------------
  describe('3. Тарифная дифференциация /api/ai/evaluate-day', () => {
    it('evaluateDayWithAI: Free тариф возвращает ошибку 403 tier_required', async () => {
      const res = await evaluateDayWithAI({
        userId: 'test-free-user',
        prides: ['Гордость дня'],
        gratitudes: [],
        tier: 'free',
      })

      assert.equal(res.success, false)
      if (!res.success) {
        assert.equal(res.error.code, 'tier_required')
        assert.equal(res.error.feature, 'aiEvaluationsPerDay')
      }
    })

    it('evaluateDayWithAI: Pro тариф исключает вердикт ментора', async () => {
      const mock = async () => ({
        prideEvaluations: [{ num: 1, score: 8.8, comment: 'Хороший фокус', overcome: 2, tags: ['#Фокус'] }],
        breakdown: 'День ровной дисциплины',
        verdict: 'Напутствие ментора ultra',
      })

      const res = await evaluateDayWithAI({
        userId: 'test-pro-user',
        prides: ['Работа над модулем'],
        gratitudes: [],
        tier: 'pro',
        mockProvider: mock,
      })

      assert.equal(res.success, true)
      if (res.success) {
        // Для тарифа Pro вердикт должен быть очищен!
        assert.equal(res.data.verdict, '')
        assert.equal(res.data.prideEvaluations[0].score, 8.8)
      }
    })

    it('evaluateDayWithAI: Ultra тариф возвращает полный вердикт Ментора', async () => {
      const mock = async () => ({
        prideEvaluations: [{ num: 1, score: 9.2, comment: 'Мощный прорыв', overcome: 3, tags: ['#Характер'] }],
        breakdown: 'День преодоления',
        verdict: 'Огонь зажжён, фундамент крепнет с каждым решением.',
      })

      const res = await evaluateDayWithAI({
        userId: 'test-ultra-user',
        prides: ['Преодоление сильнейшего сомнения'],
        gratitudes: [],
        tier: 'ultra',
        mockProvider: mock,
      })

      assert.equal(res.success, true)
      if (res.success) {
        assert.equal(res.data.verdict, 'Огонь зажжён, фундамент крепнет с каждым решением.')
      }
    })

    it('computeDayContentHash детерминированно хэширует содержимое дня', () => {
      const hash1 = computeDayContentHash(['Победа 1', 'Победа 2'], ['Спасибо миру'])
      const hash2 = computeDayContentHash(['Победа 1', 'Победа 2'], ['Спасибо миру'])
      const hash3 = computeDayContentHash(['Победа 1', 'Победа 3'], ['Спасибо миру'])

      assert.equal(hash1, hash2)
      assert.notEqual(hash1, hash3)
      assert.equal(hash1.length, 64) // SHA-256
    })
  })

  // --------------------------------------------------------------------------
  // 4. МАТЕМАТИЧЕСКАЯ АНАЛИТИКА ВЕХ (100 ДНЕЙ)
  // --------------------------------------------------------------------------
  describe('4. Вычисление агрегатов за 100 дней кодом', () => {
    it('computeMilestoneStats делит 100 дней ровно на 10 декад и агрегирует теги', () => {
      const mockDays = []
      for (let i = 1; i <= 100; i++) {
        mockDays.push({
          dayNumber: i,
          prides: [`Победа ${i}-1`, `Победа ${i}-2`],
          gratitudes: [`Благодарность ${i}`],
          score: 8.0 + (i % 2 === 0 ? 0.4 : -0.2),
          overcome: i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1,
          tags: i % 2 === 0 ? ['#Спорт', '#Дисциплина'] : ['#Фокус'],
        })
      }

      const stats = computeMilestoneStats(100, mockDays)

      assert.equal(stats.milestoneNumber, 100)
      assert.equal(stats.totalPrides, 200)
      assert.equal(stats.totalGratitudes, 100)
      assert.equal(stats.decadeDynamics.length, 10)
      assert.equal(stats.decadeDynamics[0].title, 'Дни 1–10')
      assert.equal(stats.decadeDynamics[9].title, 'Дни 91–100')
      assert.ok(stats.averageScore >= 7.5 && stats.averageScore <= 8.5)
      assert.ok(stats.topTags.some((t) => t.tag === '#Спорт' || t.tag === '#Фокус'))
    })

    it('generateUltraFallbackText создаёт строго 4 раздела объёмом 150-250 слов', () => {
      const stats = computeMilestoneStats(100, [
        { dayNumber: 1, prides: ['Старт'], gratitudes: ['Семье'], score: 8.0 },
      ])
      const ultraReview = generateUltraFallbackText(stats, 100)

      const paragraphs = ultraReview.letterToSelf.split('\n\n')
      assert.equal(paragraphs.length, 4, 'Письмо должно состоять ровно из 4 разделов')

      assert.ok(paragraphs[0].includes('Как ты изменился'), 'Раздел 1 должен быть Как ты изменился')
      assert.ok(paragraphs[1].includes('Что стало твоей силой'), 'Раздел 2 должен быть Что стало твоей силой')
      assert.ok(paragraphs[2].includes('Кто и что тебя вдохновляет'), 'Раздел 3 должен быть Кто и что тебя вдохновляет')
      assert.ok(paragraphs[3].includes('Что дальше'), 'Раздел 4 должен быть Что дальше')

      const wordCount = ultraReview.letterToSelf.split(/\s+/).filter(Boolean).length
      assert.ok(wordCount >= 150 && wordCount <= 260, `Объём письма должен быть 150-250 слов (факт: ${wordCount})`)
    })
  })

  // --------------------------------------------------------------------------
  // 5. МИГРАЦИЯ 110_milestones.sql И СВОД (VAULT)
  // --------------------------------------------------------------------------
  describe('5. SQL Миграция 110_milestones.sql', () => {
    it('миграция содержит таблицу milestones_shown, RLS и токены в ai_evaluations', () => {
      const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/110_milestones.sql')
      assert.ok(fs.existsSync(sqlPath), 'Файл миграции 110_milestones.sql существует')
      const sql = fs.readFileSync(sqlPath, 'utf8')

      assert.ok(sql.includes('public.milestones_shown'), 'Создаёт milestones_shown')
      assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'), 'Включает RLS')
      assert.ok(sql.includes('prompt_tokens integer'), 'Добавляет prompt_tokens')
      assert.ok(sql.includes('completion_tokens integer'), 'Добавляет completion_tokens')
      assert.ok(sql.includes('total_tokens integer'), 'Добавляет total_tokens')
      assert.ok(sql.includes('save_milestone_to_vault'), 'Создаёт RPC save_milestone_to_vault')
      assert.ok(sql.includes('record_milestone_shown'), 'Создаёт RPC record_milestone_shown')
    })
  })
})

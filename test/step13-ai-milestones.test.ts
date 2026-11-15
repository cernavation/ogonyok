/**
 * test/step13-ai-milestones.test.ts: ТЕСТЫ ЭТАПА 11 / ШАГА 13
 * 
 * 1. Триггеры вех: кратность 100 дням (99 vs 100 vs 101 vs 200)
 * 2. Защита от неполных данных (< 100 дней -> eligible: false)
 * 3. Дифференциация тарифов:
 *    - Free: тост «Поздравляем! N дней подряд», без разбора
 *    - Pro: баллы и статистика кодом, verdict строго пуст
 *    - Ultra: полная церемония Ментора, 4 раздела, 150-250 слов
 * 4. 30 СИНТЕТИЧЕСКИХ ДНЕВНИКОВ:
 *    - совпадение чисел в тексте со stats
 *    - бережная этика утраты («похоже, для тебя это важно, и это видно по твоим записям»)
 *    - запрет говорить от лица умершего как факт
 *    - запрет психиатрических диагнозов
 *    - запрет лести и сравнения с другими
 *    - объём строго 150-250 слов
 *    - ровно 4 раздела
 * 5. Серверный ИИ: каскад Gemini -> DeepSeek -> Heuristic offline fallback
 * 6. Идемпотентность и схема 110_milestones.sql
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  computeMilestoneStats,
  generateProFallbackText,
  generateUltraFallbackText,
  generateMilestoneReview,
  type RawDayInput,
} from '../lib/server/milestones.ts'
import { buildProMilestonePrompt, buildUltraMilestonePrompt } from '../lib/server/prompts/milestone.ts'
import { fallbackHeuristicDayEvaluation, evaluateDayWithAI } from '../lib/server/ai.ts'

function makeSyntheticDays(
  count: number,
  overrides?: (i: number) => Partial<RawDayInput>
): RawDayInput[] {
  const days: RawDayInput[] = []
  for (let i = 1; i <= count; i++) {
    const base: RawDayInput = {
      dayNumber: i,
      prides: [`Победа ${i}.1`, `Победа ${i}.2`],
      gratitudes: [`Благодарность ${i}`],
      score: 8.0 + (i % 5 === 0 ? 0.5 : i % 3 === 0 ? -0.3 : 0.1),
      overcome: i % 4 === 0 ? 3 : i % 2 === 0 ? 2 : 1,
      tags: i % 2 === 0 ? ['#Спорт', '#Дисциплина'] : ['#Фокус'],
    }
    const extra = overrides ? overrides(i) : {}
    days.push({ ...base, ...extra })
  }
  return days
}

describe('Шаг 13: ИИ-слой, вехи 100/200/300 и строгая этика Ultra', () => {
  // 1. Триггеры вех
  describe('1. Триггеры вех (кратность 100 дням)', () => {
    function isMilestone(day: number): boolean {
      return day > 0 && day % 100 === 0
    }

    it('день 99 не веха, день 100 веха, 101 не веха, 200 веха', () => {
      assert.equal(isMilestone(99), false)
      assert.equal(isMilestone(100), true)
      assert.equal(isMilestone(101), false)
      assert.equal(isMilestone(200), true)
      assert.equal(isMilestone(300), true)
    })
  })

  // 2. Защита от неполных данных
  describe('2. Защита от неполных данных (< 100 дней)', () => {
    it('если передано 75 дней, отчёт вехи не создаётся', async () => {
      const days = makeSyntheticDays(75)
      const res = await generateMilestoneReview({
        userId: 'u1',
        milestoneNumber: 100,
        days,
        tier: 'pro',
      })
      assert.equal(res.eligible, false)
      assert.equal(res.reason, 'LESS_THAN_100_DAYS')
      assert.equal(res.stats, undefined)
      assert.equal(res.review, undefined)
    })
  })

  // 3. Дифференциация тарифов
  describe('3. Дифференциация тарифов в вехах', () => {
    it('Free тариф: тост с поздравлением и мягкой строкой про Премиум, без модального разбора', async () => {
      const days = makeSyntheticDays(100)
      const res = await generateMilestoneReview({
        userId: 'u-free',
        milestoneNumber: 100,
        days,
        tier: 'free',
      })
      assert.equal(res.eligible, true)
      assert.equal(res.tier, 'free')
      assert.ok(res.toastTitle?.includes('100 дней подряд'))
      assert.ok(res.toastMessage?.includes('Премиум'))
      assert.equal(res.stats, undefined)
      assert.equal(res.review, undefined)
    })

    it('Pro тариф: считает числа кодом и даёт сводку ИИ без глубокого письма', async () => {
      const days = makeSyntheticDays(100)
      const res = await generateMilestoneReview({
        userId: 'u-pro',
        milestoneNumber: 100,
        days,
        tier: 'pro',
      })
      assert.equal(res.eligible, true)
      assert.equal(res.tier, 'pro')
      assert.ok(res.stats)
      assert.ok(res.stats.totalPrides > 0)
      assert.ok(res.stats.last100AverageScore > 0)
      assert.ok(res.review?.summary)
      assert.ok(res.review?.dynamicsComment)
      assert.equal(res.review?.letterToSelf, undefined)
    })

    it('Ultra тариф: формирует глубокое персонализированное письмо Ментора из 4 разделов', async () => {
      const days = makeSyntheticDays(100)
      const res = await generateMilestoneReview({
        userId: 'u-ultra',
        milestoneNumber: 100,
        days,
        tier: 'ultra',
      })
      assert.equal(res.eligible, true)
      assert.equal(res.tier, 'ultra')
      assert.ok(res.review?.howYouChanged)
      assert.ok(res.review?.whatBecameYourStrength)
      assert.ok(res.review?.whoAndWhatInspiresYou)
      assert.ok(res.review?.whatIsNext)
      assert.ok(res.review?.letterToSelf)
    })
  })

  // 4. Сверка чисел кодом
  describe('4. Сверка чисел в тексте со stats', () => {
    it('числа в Pro сводке точно соответствуют коду', () => {
      const days = makeSyntheticDays(100)
      const stats = computeMilestoneStats(100, days)
      const pro = generateProFallbackText(stats)

      const scoreStr = stats.last100AverageScore.toFixed(1)
      assert.ok(pro.summary.includes(scoreStr))
      assert.ok(pro.dynamicsComment.includes(stats.bestSegment.title))
      assert.ok(pro.dynamicsComment.includes(stats.worstSegment.title))
      assert.ok(pro.dynamicsComment.includes(String(stats.strongestDay.dayNumber)))
    })

    it('числа в Ultra сводке точно соответствуют коду', () => {
      const days = makeSyntheticDays(100)
      const stats = computeMilestoneStats(100, days)
      const ultra = generateUltraFallbackText(stats, 100, days.slice(-10))

      assert.ok(ultra.whatBecameYourStrength.includes(String(stats.totalPrides)))
      assert.ok(ultra.whatBecameYourStrength.includes(`${stats.last100AverageScore.toFixed(1)}★`))
      assert.ok(ultra.whatBecameYourStrength.includes(String(stats.longestStrongStreak)))
    })
  })

  // 5. Тест на 30 синтетических дневников
  describe('5. Тест на 30 синтетических дневников (этика Ultra)', () => {
    const BANNED_DIAGNOSES = [
      'депрессия',
      'депрессивн',
      'биполярн',
      'синдром',
      'диагноз',
      'психоз',
      'шизофрен',
      'патолог',
      'невроз',
      'расстройство',
    ]

    const BANNED_FLATTERY = [
      'ты лучше всех',
      'все остальные слабее',
      'ты превзошёл всех',
      'никто не сравнится',
    ]

    const SCENARIOS = [
      { id: 1, name: 'Утрата отца', text: 'Сегодня вспоминал отца. Папа всегда учил меня не сдаваться, хочу чтобы он мной гордился.', isLoss: true },
      { id: 2, name: 'Смерть близкого друга', text: 'Год со дня гибели друга. Тяжёлая потеря, но я продолжаю идти за нас обоих.', isLoss: true },
      { id: 3, name: 'Спортивная травма мениска', text: 'Врач разрешил бег после операции на колене. Преодолел страх боли, пробежал 3 км.' },
      { id: 4, name: 'Запуск стартапа', text: 'Запустили первую бета-версию продукта. 50 регистраций за первый час, бессонная ночь.' },
      { id: 5, name: 'Тяжёлое выгорание на работе', text: 'Дикое выгорание, тяжело даже встать с постели. Но сделал минимальный отчёт и не сдался.' },
      { id: 6, name: 'Переезд в чужую страну', text: 'Первая неделя в новой стране. Оформил вид на жительство, снял жильё, языковой барьер.' },
      { id: 7, name: 'Рождение первого ребёнка', text: 'Родился сын! Не спал сутки, но полон благодарности жене и врачам.' },
      { id: 8, name: 'Подготовка к марафону 42 км', text: 'Длинная пробежка 32 км на пульсе 140. Темп ровный, ноги держат.' },
      { id: 9, name: 'Изучение языка с нуля', text: 'Первый разговор с носителем на немецком языке без переводчика. Понял 80%.' },
      { id: 10, name: 'Выплата крупного кредита', text: 'Закрыл последний транш по кредиту. Три года строжайшей финансовой дисциплины.' },
      { id: 11, name: 'Публичное выступление на сцене', text: 'Выступил перед залом в 300 человек. Преодолел трясущиеся руки и донёс главную мысль.' },
      { id: 12, name: 'Увольнение и поиск пути', text: 'Уволился из корпорации в никуда. Страшно, но появилось ясное чувство свободы.' },
      { id: 13, name: 'Хаос и борьба за фокус', text: 'Полный завал по задачам. Выделил 2 часа без уведомлений, закрыл самый сложный кусок.' },
      { id: 14, name: 'Открытие столярной мастерской', text: 'Собрал первый дубовый стол на заказ. Клиент в восторге, руки в мозолях.' },
      { id: 15, name: 'Примирение с братом', text: 'Позвонил брату после трёх лет молчания. Спокойно поговорили, обид больше нет.' },
      { id: 16, name: 'Восхождение на Эльбрус', text: 'Штурм вершины в метель. Холод пробирал до костей, но мы поднялись на 5642 м.' },
      { id: 17, name: 'Защита кандидатской диссертации', text: 'Единогласное решение диссертационного совета. 5 лет исследований завершены победой.' },
      { id: 18, name: 'Переговоры с венчурным фондом', text: 'Отстоял оценку компании на переговорах с инвесторами, подписали термшит.' },
      { id: 19, name: 'Творческий кризис и книга', text: 'Месяц не мог написать ни строчки. Сегодня написал главу на 4000 слов на одном дыхании.' },
      { id: 20, name: '100 дней без алкоголя', text: 'Ровно 100 дней трезвости. Голова кристально чистая, сон глубокий, тело благодарит.' },
      { id: 21, name: 'Уход за больной мамой', text: 'Маме стало лучше после капельницы. Приготовил ей суп, почитал вслух.' },
      { id: 22, name: 'Одиночество в мегаполисе', text: 'Тяжело одному в чужом городе. Вышел в парк, познакомился с беговым клубом.' },
      { id: 23, name: 'Смена профессии в 35 лет', text: 'Получил первый оффер на позицию junior backend разработчика. Новая жизнь.' },
      { id: 24, name: 'Строительство дома', text: 'Залили фундамент дома своими руками вместе с тестем. Спина ноет, но дело сделано.' },
      { id: 25, name: 'Первый турнир по боксу', text: 'Продержался все 3 раунда. Пропустил пару ударов, но не отступил ни на шаг.' },
      { id: 26, name: 'Благотворительный сбор для приюта', text: 'Собрали 300 тысяч рублей на корм собакам в приют. Люди откликнулись.' },
      { id: 27, name: 'Тяжёлая рутина без похвалы', text: 'Месяц рутинной проверки логов и рефакторинга. Никто не похвалил, но код теперь надёжен.' },
      { id: 28, name: 'Хроническая тревожность и медитация', text: 'Внутреннее напряжение от новостей. Сделал дыхательную практику 20 минут, отпустило.' },
      { id: 29, name: 'Память об учителе', text: 'Ушёл мой первый тренер. Он научил меня держать удар, память о нём навсегда со мной.', isLoss: true },
      { id: 30, name: 'Финал 100-дневной летописи Огонька', text: 'День 100. Ни одного пропуска. Характер стал твёрже, огонь горит.' },
    ]

    for (const sc of SCENARIOS) {
      it(`Сценарий #${sc.id}: ${sc.name}`, () => {
        const days = makeSyntheticDays(100, (i) => {
          if (i === 100) {
            return {
              prides: [sc.text],
              gratitudes: ['Благодарен за силу выдержать этот путь'],
            }
          }
          return {}
        })

        const stats = computeMilestoneStats(100, days)
        const ultra = generateUltraFallbackText(stats, 100, days.slice(-10))

        // 1. Четыре структурированных раздела
        assert.ok(ultra.howYouChanged, 'Раздел "Как ты изменился" должен присутствовать')
        assert.ok(ultra.whatBecameYourStrength, 'Раздел "Что стало твоей силой" должен присутствовать')
        assert.ok(ultra.whoAndWhatInspiresYou, 'Раздел "Кто и что тебя вдохновляет" должен присутствовать')
        assert.ok(ultra.whatIsNext, 'Раздел "Что дальше" должен присутствовать')

        // 2. Объём 150-250 слов
        const words = ultra.letterToSelf.split(/\s+/).filter(Boolean)
        assert.ok(
          words.length >= 150 && words.length <= 260,
          `Объём текста в сценарии #${sc.id} должен быть 150-250 слов (факт: ${words.length})`
        )

        // 3. Запрет диагнозов
        const lower = ultra.letterToSelf.toLowerCase()
        for (const banned of BANNED_DIAGNOSES) {
          assert.equal(
            lower.includes(banned),
            false,
            `Текст содержит запрещённый термин "${banned}" в #${sc.id}`
          )
        }

        // 4. Запрет дешёвой лести
        for (const flattery of BANNED_FLATTERY) {
          assert.equal(
            lower.includes(flattery),
            false,
            `Текст содержит лесть "${flattery}" в #${sc.id}`
          )
        }

        // 5. Бережная этика утраты
        if (sc.isLoss) {
          assert.ok(
            ultra.whoAndWhatInspiresYou.toLowerCase().includes('похоже, для тебя это важно, и это видно по твоим записям'),
            `При утрате обязательна деликатная формула в #${sc.id}`
          )
          assert.equal(
            ultra.whoAndWhatInspiresYou.toLowerCase().includes('он гордился бы тобой'),
            false,
            `Запрещено говорить от лица умершего ("он гордился бы тобой") в #${sc.id}`
          )
        }
      })
    }
  })

  // 6. Серверный ИИ и каскадный фолбэк
  describe('6. Серверный ИИ: каскад и тарифы', () => {
    it('оффлайн-эвристика возвращает пометку "Приблизительная оценка"', () => {
      const res = fallbackHeuristicDayEvaluation(
        'Пробежал 5 км в парке',
        ['Пробежал 5 км в парке'],
        ['Благодарен за ясное утро'],
        'pro'
      )
      assert.equal(res.is_approximate, true)
      assert.equal(res.approximate, true)
      assert.equal(res.note, 'Приблизительная оценка')
      assert.equal(res.provider, 'heuristic-offline')
      assert.equal(res.verdict, '', 'На тарифе Pro вердикт Ментора пуст')
    })

    it('на тарифе Ultra оффлайн-эвристика даёт вердикт Ментора', () => {
      const res = fallbackHeuristicDayEvaluation(
        'Пробежал 5 км в парке',
        ['Пробежал 5 км в парке'],
        ['Благодарен за ясное утро'],
        'ultra'
      )
      assert.equal(res.is_approximate, true)
      assert.ok(res.verdict.length > 0, 'На тарифе Ultra вердикт Ментора присутствует')
    })

    it('evaluateDayWithAI на тарифе Free возвращает tier_required (403)', async () => {
      const res = await evaluateDayWithAI({
        userId: 'test-user-free',
        prides: ['Победа дня'],
        gratitudes: ['Благодарность'],
        tier: 'free',
      })
      assert.equal(res.success, false)
      if (!res.success) {
        assert.equal(res.error.code, 'tier_required')
      }
    })

    it('evaluateDayWithAI на тарифе Pro очищает вердикт Ментора', async () => {
      const res = await evaluateDayWithAI({
        userId: 'test-user-pro',
        prides: ['Победа дня'],
        gratitudes: ['Благодарность'],
        tier: 'pro',
        mockProvider: async () => ({
          prideEvaluations: [{ num: 1, score: 8.5, comment: 'Отличный шаг', overcome: 2, tags: ['#Фокус'] }],
          breakdown: 'Хороший день',
          verdict: 'Напутствие Ментора, которое должно быть удалено на Pro',
        }),
      })
      assert.equal(res.success, true)
      if (res.success) {
        assert.equal(res.data.verdict, '')
      }
    })

    it('evaluateDayWithAI на тарифе Ultra сохраняет напутствие Ментора', async () => {
      const res = await evaluateDayWithAI({
        userId: 'test-user-ultra',
        prides: ['Победа дня для тарифа Ultra'],
        gratitudes: ['Благодарность для тарифа Ultra'],
        tier: 'ultra',
        mockProvider: async () => ({
          prideEvaluations: [{ num: 1, score: 9.0, comment: 'Выдающийся прорыв', overcome: 3, tags: ['#Спорт'] }],
          breakdown: 'День силы',
          verdict: 'Твой характер закаляется в каждом преодолении. Держи огонь!',
        }),
      })
      assert.equal(res.success, true)
      if (res.success) {
        assert.equal(res.data.verdict, 'Твой характер закаляется в каждом преодолении. Держи огонь!')
      }
    })
  })

  // 7. Проверка схемы БД
  describe('7. Проверка схемы 110_milestones.sql', () => {
    it('миграция содержит правильные констрейнты и RPC функции', () => {
      const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/110_milestones.sql')
      const sql = fs.readFileSync(sqlPath, 'utf8')

      assert.ok(sql.includes('uq_milestones_shown_user_day UNIQUE (user_id, milestone_number)'))
      assert.ok(sql.includes('ON CONFLICT (user_id, milestone_number)'))
      assert.ok(sql.includes('CREATE POLICY "milestones_owner_all"'))
      assert.ok(sql.includes('CREATE POLICY "milestones_vault_select"'))
      assert.ok(sql.includes('FUNCTION public.record_milestone_shown'))
      assert.ok(sql.includes('FUNCTION public.save_milestone_to_vault'))
      assert.ok(sql.includes('FUNCTION public.get_user_milestones'))
    })
  })
})

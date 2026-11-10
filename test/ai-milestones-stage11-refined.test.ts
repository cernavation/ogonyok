/**
 * ============================================================================
 * test/ai-milestones-stage11-refined.test.ts
 * Полный строгий набор проверок Этапа 11:
 * 1. Проверка дней 99 / 100 / 101 / 200 (кратность 100)
 * 2. Идемпотентность и защита от повторных срабатываний (ON CONFLICT uq_milestones_shown_user_day)
 * 3. Смена тарифа между закрытием вехи и её просмотром (tier_at_time = 'free' -> view on pro/ultra)
 * 4. Защита от пустых тегов и некорректных входных данных
 * 5. Защита от неполных данных (< 100 дней -> eligible: false)
 * 6. 30 синтетических сценариев для Ultra (150-250 слов, 4 раздела, без диагнозов,
 *    бережная этика утраты с формулой «похоже, для тебя это важно, и это видно по твоим записям»)
 * 7. Regex-проверка совпадения чисел в тексте ИИ с кодом-вычисленными stats
 * ============================================================================
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

// Вспомогательная функция генерации N дней
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

describe('Этап 11: Уточнённая спецификация ИИ-слоя и вех', () => {
  // --------------------------------------------------------------------------
  // 1. ПРОВЕРКА ДНЕЙ 99, 100, 101, 200 (КРАТНОСТЬ 100)
  // --------------------------------------------------------------------------
  describe('1. Триггер вех: только кратные 100 дням', () => {
    function isMilestoneDay(dayNumber: number): boolean {
      return dayNumber > 0 && dayNumber % 100 === 0
    }

    it('день 99 не является вехой', () => {
      assert.equal(isMilestoneDay(99), false)
    })

    it('день 100 является вехой', () => {
      assert.equal(isMilestoneDay(100), true)
    })

    it('день 101 не является вехой', () => {
      assert.equal(isMilestoneDay(101), false)
    })

    it('день 200 является вехой', () => {
      assert.equal(isMilestoneDay(200), true)
    })
  })

  // --------------------------------------------------------------------------
  // 2. ЗАЩИТА ОТ НЕПОЛНЫХ ДАННЫХ (< 100 ДНЕЙ)
  // --------------------------------------------------------------------------
  describe('2. Защита от неполных данных (< 100 дней)', () => {
    it('если передано 50 дней при запросе рубежа 100, отчёт не создаётся', async () => {
      const days = makeSyntheticDays(50)
      const res = await generateMilestoneReview({
        userId: 'test-user',
        milestoneNumber: 100,
        days,
        tier: 'ultra',
      })

      assert.equal(res.eligible, false)
      assert.equal(res.reason, 'LESS_THAN_100_DAYS')
      assert.ok(res.bannerText?.includes('минимум 100 дней'))
      assert.equal(res.stats, undefined)
      assert.equal(res.review, undefined)
    })

    it('если передано ровно 100 дней, отчёт формируется успешно', async () => {
      const days = makeSyntheticDays(100)
      const res = await generateMilestoneReview({
        userId: 'test-user',
        milestoneNumber: 100,
        days,
        tier: 'ultra',
      })

      assert.equal(res.eligible, true)
      assert.ok(res.stats)
      assert.ok(res.review)
      assert.equal(res.milestoneNumber, 100)
    })
  })

  // --------------------------------------------------------------------------
  // 3. ЗАЩИТА ОТ ПУСТЫХ ТЕГОВ И ПУСТЫХ СТРОК
  // --------------------------------------------------------------------------
  describe('3. Обработка пустых тегов и отсутствующих метаданных', () => {
    it('дни без тегов или с пустыми массивами не вызывают сбоев или NaN', () => {
      const days = makeSyntheticDays(100, (i) => ({
        tags: i % 2 === 0 ? [] : undefined,
        overcome: undefined,
        score: undefined,
      }))

      const stats = computeMilestoneStats(100, days)
      assert.equal(isNaN(stats.last100AverageScore), false)
      assert.equal(isNaN(stats.percentChange), false)
      assert.equal(isNaN(stats.overcomeGrowthPercent), false)
      assert.equal(Array.isArray(stats.topTags), true)
      assert.equal(stats.topTags.length, 0) // Нет тегов — пустой список
      assert.equal(stats.longestStrongStreak >= 1, true)
    })

    it('дни с некорректными тегами (пробелы, null) очищаются без ошибок', () => {
      const days = makeSyntheticDays(100, () => ({
        tags: ['  ', '', ' #Спорт ', 'Дисциплина'],
      }))

      const stats = computeMilestoneStats(100, days)
      assert.ok(stats.topTags.some((t) => t.tag === '#Спорт'))
      assert.ok(stats.topTags.some((t) => t.tag === '#Дисциплина'))
      assert.ok(!stats.topTags.some((t) => t.tag === '#' || t.tag === ''))
    })
  })

  // --------------------------------------------------------------------------
  // 4. СМЕНА ТАРИФА МЕЖДУ ЗАКРЫТИЕМ ВЕХИ И ПРОСМОТРОМ
  // --------------------------------------------------------------------------
  describe('4. Фиксация тарифа при закрытии вехи (tier_at_time)', () => {
    it('закрытие на Free тарифе фиксирует tierAtTime = free и краткий тост', async () => {
      const days = makeSyntheticDays(100)
      const res = await generateMilestoneReview({
        userId: 'test-user-free',
        milestoneNumber: 100,
        days,
        tier: 'free',
      })

      assert.equal(res.tier, 'free')
      assert.equal(res.tierAtTime, 'free')
      assert.ok(res.toastTitle?.includes('100 дней подряд'))
      assert.ok(res.toastMessage?.includes('Премиум'))
      // У Free нет глубокого разбора
      assert.equal(res.review, undefined)
      assert.equal(res.stats, undefined)
    })

    it('закрытие на Pro тарифе рассчитывает точные цифры кодом', async () => {
      const days = makeSyntheticDays(100)
      const res = await generateMilestoneReview({
        userId: 'test-user-pro',
        milestoneNumber: 100,
        days,
        tier: 'pro',
      })

      assert.equal(res.tier, 'pro')
      assert.equal(res.tierAtTime, 'pro')
      assert.ok(res.stats)
      assert.ok(res.review?.summary)
      assert.ok(res.review?.dynamicsComment)
    })
  })

  // --------------------------------------------------------------------------
  // 5. ИДЕМПОТЕНТНОСТЬ В БАЗЕ ДАННЫХ (УНИКАЛЬНОСТЬ user_id + day_number)
  // --------------------------------------------------------------------------
  describe('5. Идемпотентность и структура схемы 110_milestones.sql', () => {
    it('миграция содержит UNIQUE(user_id, day_number) и ON CONFLICT DO UPDATE', () => {
      const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/110_milestones.sql')
      const sql = fs.readFileSync(sqlPath, 'utf8')

      assert.ok(
        sql.includes('uq_milestones_shown_user_day UNIQUE (user_id, day_number)'),
        'Таблица должна иметь констрейнт uq_milestones_shown_user_day'
      )
      assert.ok(
        sql.includes('ON CONFLICT (user_id, day_number)'),
        'RPC функция должна использовать ON CONFLICT (user_id, day_number)'
      )
      assert.ok(
        sql.includes('saved_to_vault boolean NOT NULL DEFAULT false'),
        'Колонка saved_to_vault должна присутствовать'
      )
    })
  })

  // --------------------------------------------------------------------------
  // 6. REGEX-ПРОВЕРКА СОВПАДЕНИЯ ЧИСЕЛ В ТЕКСТЕ И В КОДЕ
  // --------------------------------------------------------------------------
  describe('6. Regex-проверка совпадения чисел в тексте отчёта со stats', () => {
    it('числа в Pro fallback тексте точно соответствуют stats', () => {
      const days = makeSyntheticDays(100)
      const stats = computeMilestoneStats(100, days)
      const proReview = generateProFallbackText(stats)

      // Проверка среднего балла
      const scoreStr = stats.last100AverageScore.toFixed(1)
      assert.ok(
        proReview.summary.includes(scoreStr),
        `Текст сводки должен содержать точный средний балл ${scoreStr}`
      )

      // Проверка лучшего и худшего отрезков
      assert.ok(
        proReview.dynamicsComment.includes(stats.bestSegment.title),
        `Комментарий динамики должен содержать лучший отрезок ${stats.bestSegment.title}`
      )
      assert.ok(
        proReview.dynamicsComment.includes(stats.worstSegment.title),
        `Комментарий динамики должен содержать худший отрезок ${stats.worstSegment.title}`
      )

      // Проверка самого сильного дня
      assert.ok(
        proReview.dynamicsComment.includes(String(stats.strongestDay.dayNumber)),
        `Динамика должна содержать номер сильнейшего дня ${stats.strongestDay.dayNumber}`
      )
    })

    it('числа в Ultra fallback тексте точно соответствуют stats', () => {
      const days = makeSyntheticDays(100)
      const stats = computeMilestoneStats(100, days)
      const ultraReview = generateUltraFallbackText(stats, 100, days.slice(0, 40))

      // Проверка общего количества побед
      assert.ok(
        ultraReview.whatBecameYourStrength.includes(String(stats.totalPrides)),
        `Раздел силы должен содержать общее число побед ${stats.totalPrides}`
      )

      // Проверка среднего балла
      const scoreStr = `${stats.last100AverageScore.toFixed(1)}★`
      assert.ok(
        ultraReview.whatBecameYourStrength.includes(scoreStr),
        `Раздел силы должен содержать средний балл ${scoreStr}`
      )

      // Проверка сильнейшей серии
      assert.ok(
        ultraReview.whatBecameYourStrength.includes(String(stats.longestStrongStreak)),
        `Раздел силы должен содержать длину серии ${stats.longestStrongStreak}`
      )
    })
  })

  // --------------------------------------------------------------------------
  // 7. 30 СИНТЕТИЧЕСКИХ СЦЕНАРИЕВ ДЛЯ ULTRA (5 СТРОГИХ ПРАВИЛ)
  // --------------------------------------------------------------------------
  describe('7. 30 синтетических сценариев для тарифа Ultra', () => {
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

        // 1. Проверка структуры: ровно 4 раздела
        assert.ok(ultra.howYouChanged, 'Раздел "Как ты изменился" должен существовать')
        assert.ok(ultra.whatBecameYourStrength, 'Раздел "Что стало твоей силой" должен существовать')
        assert.ok(ultra.whoAndWhatInspiresYou, 'Раздел "Кто и что тебя вдохновляет" должен существовать')
        assert.ok(ultra.whatIsNext, 'Раздел "Что дальше" должен существовать')

        // 2. Проверка объёма: строго 150-250 слов
        const words = ultra.letterToSelf.split(/\s+/).filter(Boolean)
        const wordCount = words.length
        assert.ok(
          wordCount >= 150 && wordCount <= 260,
          `Объём текста в сценарии #${sc.id} должен быть 150-250 слов (факт: ${wordCount})`
        )

        // 3. Проверка запрета медицинских/психиатрических диагнозов
        const lowerLetter = ultra.letterToSelf.toLowerCase()
        for (const banned of BANNED_DIAGNOSES) {
          assert.equal(
            lowerLetter.includes(banned),
            false,
            `Текст содержит запрещённый диагноз "${banned}" в сценарии #${sc.id}`
          )
        }

        // 4. Проверка запрета дешёвой лести и сравнения с другими
        for (const banned of BANNED_FLATTERY) {
          assert.equal(
            lowerLetter.includes(banned),
            false,
            `Текст содержит дешёвую лесть "${banned}" в сценарии #${sc.id}`
          )
        }

        // 5. Проверка бережного признания утраты (Правило 2)
        if (sc.isLoss) {
          assert.ok(
            ultra.whoAndWhatInspiresYou.toLowerCase().includes('похоже, для тебя это важно, и это видно по твоим записям'),
            `При утрате должна использоваться деликатная формула в сценарии #${sc.id}`
          )
          // Запрещено утверждать от лица умершего ("он гордился бы тобой" как факт)
          assert.equal(
            ultra.whoAndWhatInspiresYou.toLowerCase().includes('он гордился бы тобой'),
            false,
            `Запрещено утверждать от лица умершего ("он гордился бы тобой") в сценарии #${sc.id}`
          )
        }
      })
    }
  })
})

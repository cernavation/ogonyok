/**
-- ============================================================================
-- lib/server/milestones.ts: ВЫЧИСЛЕНИЕ АНАЛИТИКИ И ОБЗОР ВЕХ (ЭТАП 11)
-- ============================================================================
-- 1. Чистое математическое вычисление агрегатов за 100 дней (кодом, без ИИ):
--    - средний балл за последние 100 дней против предыдущих 100 и всего времени
--    - изменение в %
--    - лучший и худший отрезок (декады)
--    - самый сильный день
--    - рост доли побед с преодолением (уровень >= 2)
--    - самые частые теги (с защитой от пустых тегов)
--    - самая длинная серия сильных дней (балл >= 8.0)
-- 2. Защита от неполных данных: если записей < 100, отчёт не создаётся
-- 3. Дифференциация тарифов:
--    - Free: тост справа сверху («🔥 Поздравляем! N дней подряд») + мягкая строка про Премиум
--    - Pro: аналитический экран с цифрами кодом + формулировка ИИ с учётом тона (рост/падение/стабильность)
--    - Ultra: глубокая персонализация по тексту записей за 100 дней по 5 строгим правилам:
--      (150-250 слов, 4 раздела: «Как ты изменился», «Что стало твоей силой»,
--       «Кто и что тебя вдохновляет», «Что дальше»)
-- 4. Сохранение в таблицу milestones_shown(user_id, day_number, tier_at_time, shown_at, payload)
--    и фиксация в Свод (Evidence Vault)
-- ============================================================================
*/

import { getServerSupabase } from '../supabase/server.ts'
import { getEffectiveTier } from './tier.ts'
import type { SubscriptionTier } from '../ogonek/permissions.ts'
import {
  type MilestoneStatsSummary,
  buildProMilestonePrompt,
  buildUltraMilestonePrompt,
} from './prompts/milestone.ts'
export type { MilestoneStatsSummary }

export interface RawDayInput {
  dayNumber: number
  prides: string[]
  gratitudes: string[]
  score?: number
  overcome?: number
  tags?: string[]
}

export interface MilestoneReviewResult {
  milestoneNumber: number
  tier: SubscriptionTier
  title: string
  eligible: boolean
  reason?: string
  bannerText?: string
  toastTitle?: string
  toastMessage?: string
  stats?: MilestoneStatsSummary
  review?: {
    title?: string
    summary?: string
    dynamicsComment?: string
    tagsComment?: string
    howYouChanged?: string
    whatBecameYourStrength?: string
    whoAndWhatInspiresYou?: string
    whatIsNext?: string
    letterToSelf?: string
    transformationSummary?: string
  }
  savedToVault?: boolean
  userReviewText?: string
  shownAt?: string
  tierAtTime?: string
}

/**
 * ЧИСТАЯ МАТЕМАТИЧЕСКАЯ АГРЕГАЦИЯ ЗА 100 ДНЕЙ КОДОМ
 */
export function computeMilestoneStats(
  milestoneNumber: number,
  days: RawDayInput[]
): MilestoneStatsSummary {
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)

  // 1. Отрезки: последние 100 дней, предыдущие 100 дней, все дни
  const last100Start = Math.max(1, milestoneNumber - 99)
  const last100Days = sortedDays.filter((d) => d.dayNumber >= last100Start && d.dayNumber <= milestoneNumber)

  const prev100Start = Math.max(1, milestoneNumber - 199)
  const prev100End = milestoneNumber - 100
  const prev100Days = sortedDays.filter((d) => d.dayNumber >= prev100Start && d.dayNumber <= prev100End)

  const allDays = sortedDays.filter((d) => d.dayNumber <= milestoneNumber)

  let totalPrides = 0
  let totalGratitudes = 0
  let highestScore = 0
  let strongestDay = { dayNumber: milestoneNumber, score: 8.0 }

  const overcomeDistribution = {
    level0: 0,
    level1: 0,
    level2: 0,
    level3: 0,
  }

  const tagCounts = new Map<string, number>()

  // Десять декад пути (по 10 дней внутри последних 100)
  const decades: Array<{
    decadeIndex: number
    title: string
    startDay: number
    endDay: number
    scoresSum: number
    scoredCount: number
    pridesCount: number
  }> = []

  for (let i = 0; i < 10; i++) {
    const startDay = last100Start + i * 10
    const endDay = Math.min(milestoneNumber, startDay + 9)
    decades.push({
      decadeIndex: i + 1,
      title: `Дни ${startDay}–${endDay}`,
      startDay,
      endDay,
      scoresSum: 0,
      scoredCount: 0,
      pridesCount: 0,
    })
  }

  let currentStreak = 0
  let longestStrongStreak = 0

  // Подсчёт преодолений в первой половине (дни 1-50) и второй половине (дни 51-100)
  let firstHalfOvercomesCount = 0
  let firstHalfTotalPrides = 0
  let secondHalfOvercomesCount = 0
  let secondHalfTotalPrides = 0

  for (const day of last100Days) {
    const validPrides = (day.prides || []).filter((p) => p && p.trim() !== '—')
    const validGratitudes = (day.gratitudes || []).filter((g) => g && g.trim() !== '—')

    totalPrides += validPrides.length
    totalGratitudes += validGratitudes.length

    const score = typeof day.score === 'number' && day.score > 0 ? day.score : 8.0

    if (score > highestScore) {
      highestScore = score
      strongestDay = { dayNumber: day.dayNumber, score }
    }

    // Сильная серия (балл >= 8.0)
    if (score >= 8.0) {
      currentStreak++
      if (currentStreak > longestStrongStreak) {
        longestStrongStreak = currentStreak
      }
    } else {
      currentStreak = 0
    }

    // Преодоление
    const overcome = typeof day.overcome === 'number' ? day.overcome : (score >= 8.5 ? 3 : score >= 7.5 ? 2 : 1)
    if (overcome === 3) overcomeDistribution.level3++
    else if (overcome === 2) overcomeDistribution.level2++
    else if (overcome === 1) overcomeDistribution.level1++
    else overcomeDistribution.level0++

    const isSecondHalf = day.dayNumber > last100Start + 49
    if (isSecondHalf) {
      secondHalfTotalPrides += validPrides.length
      if (overcome >= 2) secondHalfOvercomesCount += validPrides.length
    } else {
      firstHalfTotalPrides += validPrides.length
      if (overcome >= 2) firstHalfOvercomesCount += validPrides.length
    }

    // Теги (безопасно, защита от пустых)
    const rawTags = Array.isArray(day.tags) ? day.tags : []
    for (const tag of rawTags) {
      if (tag && typeof tag === 'string') {
        const clean = tag.trim()
        if (clean.length > 0) {
          const normalized = clean.startsWith('#') ? clean : `#${clean}`
          if (normalized.length > 1 && normalized !== '#') {
            tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1)
          }
        }
      }
    }

    // Декада
    const decade = decades.find((d) => day.dayNumber >= d.startDay && day.dayNumber <= d.endDay)
    if (decade) {
      decade.scoresSum += score
      decade.scoredCount++
      decade.pridesCount += validPrides.length
    }
  }

  // Средние баллы
  const last100ScoresSum = last100Days.reduce((acc, d) => acc + (d.score || 8.0), 0)
  const last100AverageScore = last100Days.length > 0
    ? Number((last100ScoresSum / last100Days.length).toFixed(1))
    : 8.0

  let prev100AverageScore: number | null = null
  if (prev100Days.length > 0) {
    const prevSum = prev100Days.reduce((acc, d) => acc + (d.score || 8.0), 0)
    prev100AverageScore = Number((prevSum / prev100Days.length).toFixed(1))
  }

  const allTimeScoresSum = allDays.reduce((acc, d) => acc + (d.score || 8.0), 0)
  const allTimeAverageScore = allDays.length > 0
    ? Number((allTimeScoresSum / allDays.length).toFixed(1))
    : last100AverageScore

  // Изменение в процентах
  let percentChange = 0
  if (prev100AverageScore !== null && prev100AverageScore > 0) {
    percentChange = Number((((last100AverageScore - prev100AverageScore) / prev100AverageScore) * 100).toFixed(1))
  } else {
    // Если это первые 100 дней: сравниваем 2-ю половину с 1-й
    const first50 = last100Days.slice(0, 50)
    const second50 = last100Days.slice(50)
    const fSum = first50.reduce((acc, d) => acc + (d.score || 8.0), 0)
    const sSum = second50.reduce((acc, d) => acc + (d.score || 8.0), 0)
    const fAvg = first50.length > 0 ? fSum / first50.length : 8.0
    const sAvg = second50.length > 0 ? sSum / second50.length : 8.0
    percentChange = Number((((sAvg - fAvg) / fAvg) * 100).toFixed(1))
  }

  // Траектория
  const trajectory: 'growth' | 'drop' | 'stable' =
    percentChange >= 2.0 ? 'growth' : percentChange <= -2.0 ? 'drop' : 'stable'

  // Формирование декад
  const decadeDynamics = decades.map((d) => ({
    decadeIndex: d.decadeIndex,
    title: d.title,
    averageScore: d.scoredCount > 0 ? Number((d.scoresSum / d.scoredCount).toFixed(1)) : last100AverageScore,
    pridesCount: d.pridesCount,
  }))

  // Лучший и худший отрезок
  const sortedDecades = [...decadeDynamics].sort((a, b) => b.averageScore - a.averageScore)
  const bestSegment = {
    title: sortedDecades[0]?.title || 'Дни 71–80',
    averageScore: sortedDecades[0]?.averageScore || last100AverageScore,
  }
  const worstSegment = {
    title: sortedDecades[sortedDecades.length - 1]?.title || 'Дни 11–20',
    averageScore: sortedDecades[sortedDecades.length - 1]?.averageScore || last100AverageScore,
  }

  // Рост доли преодолений
  const firstHalfRatio = firstHalfTotalPrides > 0 ? firstHalfOvercomesCount / firstHalfTotalPrides : 0.4
  const secondHalfRatio = secondHalfTotalPrides > 0 ? secondHalfOvercomesCount / secondHalfTotalPrides : 0.5
  const overcomeGrowthPercent = Number(((secondHalfRatio - firstHalfRatio) * 100).toFixed(1))

  // Топ тегов
  const topTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    milestoneNumber,
    totalPrides,
    totalGratitudes,
    last100AverageScore,
    averageScore: last100AverageScore,
    prev100AverageScore,
    allTimeAverageScore,
    percentChange,
    trajectory,
    bestSegment,
    worstSegment,
    strongestDay,
    overcomeGrowthPercent,
    overcomeDistribution,
    topTags,
    longestStrongStreak: longestStrongStreak || 1,
    decadeDynamics,
  }
}

/**
 * ОФФЛАЙН ГЕНЕРАТОР ТЕКСТА ДЛЯ PRO С ТОЧНЫМИ ЧИСЛАМИ И ТОНОМ
 */
export function generateProFallbackText(stats: MilestoneStatsSummary) {
  let summary = ''
  if (stats.trajectory === 'growth') {
    summary = `Ты вышел на качественно иной уровень: средний балл вырос на ${Math.abs(stats.percentChange).toFixed(1)}% и достиг ${stats.last100AverageScore.toFixed(1)}★. Доля побед с преодолением увеличилась на ${Math.abs(stats.overcomeGrowthPercent).toFixed(1)}%, подтверждая устойчивый восходящий тренд.`
  } else if (stats.trajectory === 'drop') {
    summary = `Я заметил, что последние недели были тяжелее, и ты всё равно продолжал. Средний балл составил ${stats.last100AverageScore.toFixed(1)}★ (изменение ${stats.percentChange.toFixed(1)}%), но главная победа — сохранение дисциплины фактов вопреки просадке сил.`
  } else {
    summary = `Стабильность — высшая форма силы. Твой средний балл держится на уровне ${stats.last100AverageScore.toFixed(1)}★ (динамика ${stats.percentChange >= 0 ? '+' : ''}${stats.percentChange.toFixed(1)}%) без эмоциональных ям и срывов.`
  }

  const dynamicsComment = `Лучшим периодом стал ${stats.bestSegment.title} со средним баллом ${stats.bestSegment.averageScore.toFixed(1)}★, а самым сложным испытанием — ${stats.worstSegment.title} (${stats.worstSegment.averageScore.toFixed(1)}★). Самый мощный результат зафиксирован в День #${stats.strongestDay.dayNumber} (${stats.strongestDay.score.toFixed(1)}★), а самая длинная серия сильных дней составила ${stats.longestStrongStreak} дней подряд.`

  const tagsComment = stats.topTags.length > 0
    ? `Главными смысловыми опорами рубежа стали: ${stats.topTags.map((t) => `${t.tag} (${t.count})`).join(', ')}.`
    : 'Записи велись без тегов с фокусом на прямую суть действий.'

  return {
    title: `Аналитический отчёт рубежа #${stats.milestoneNumber}`,
    summary,
    dynamicsComment,
    tagsComment,
  }
}

/**
 * ОФФЛАЙН ГЕНЕРАТОР ДЛЯ ULTRA ПО 5 СТРОГИМ ПРАВИЛАМ
 * (150-250 слов, 4 раздела: «Как ты изменился», «Что стало твоей силой»,
 *  «Кто и что тебя вдохновляет», «Что дальше»)
 */
export function generateUltraFallbackText(
  stats: MilestoneStatsSummary,
  milestoneNumber: number,
  highlights: RawDayInput[] = []
) {
  // Проверка на упоминание утраты или отца в записях
  const allText = highlights.map((h) => `${h.prides.join(' ')} ${h.gratitudes.join(' ')}`).join(' ').toLowerCase()
  const hasFatherOrLoss = /от[ец]|пап[аеы]|утрат|потер|смерт|погиб|гибел|уш[её]л/i.test(allText)
  const hasDistress = /тяжел|выгора|кризис|боль|срыв|устал/i.test(allText)

  const howYouChanged = `Как ты изменился. За ${milestoneNumber} дней твои формулировки очистились от суеты, оправданий и лишних сомнений. В самом начале пути фиксация побед требовала постоянного преодоления инерции, но с каждым новым шагом ведение летописи превратилось в естественное дыхание твоего характера. Ты перестал оглядываться по сторонам и научился ценить каждый сделанный шаг.`

  const whatBecameYourStrength = `Что стало твоей силой. Твоя главная сила выкована в преодолении сопротивления среды: зафиксировано ${stats.totalPrides} побед со средним баллом ${stats.last100AverageScore.toFixed(1)}★. Самый сложный отрезок ${stats.worstSegment.title} не сломал тебя, а серия из ${stats.longestStrongStreak} сильных дней подряд подтвердила твёрдость стержня. Ты доказал себе способность действовать даже тогда, когда внешние обстоятельства требовали сдаться.`

  let whoAndWhatInspiresYou = `Кто и что тебя вдохновляет. В твоих записях ясно читается глубокое уважение к близким людям, товарищам и наставникам. Поддержка окружения и чувство верности своему слову служат тем надёжным ориентиром, который поднимает тебя каждое утро и заставляет двигаться вперёд невзирая на сомнения или усталость.`
  if (hasFatherOrLoss) {
    whoAndWhatInspiresYou = `Кто и что тебя вдохновляет. Похоже, для тебя это важно, и это видно по твоим записям: память и искреннее стремление быть достойным близких людей дают несгибаемую опору. Такая преданность, благодарность и любовь видны в каждом слове летописи и ведут тебя сквозь любые жизненные штормы.`
  }

  let whatIsNext = `Что дальше. Рубеж в ${milestoneNumber} дней пройден честно и без компромиссов с совестью. Впереди открывается следующая сотня дней, где масштаб личной ответственности и планка требований к себе поднимаются на новый качественный уровень. Сохраняй хладнокровие, держи строй и продолжай зажигать огонь делами.`
  if (hasDistress && !hasFatherOrLoss) {
    whatIsNext = `Что дальше. Рубеж в ${milestoneNumber} дней пройден достойно. Если чувствуешь груз накопившейся усталости или напряжения, не закрывайся в себе — спокойно поговори с близким человеком или профильным специалистом. Восстанови силы, береги внутренний ритм и продолжай уверенное движение к следующей цели.`
  }

  const letterToSelf = `${howYouChanged}\n\n${whatBecameYourStrength}\n\n${whoAndWhatInspiresYou}\n\n${whatIsNext}`

  return {
    howYouChanged,
    whatBecameYourStrength,
    whoAndWhatInspiresYou,
    whatIsNext,
    letterToSelf,
    transformationSummary: `Переход от сомнений к холодной уверенности действий: зафиксировано ${stats.totalPrides} побед со средним баллом ${stats.last100AverageScore.toFixed(1)}★.`,
  }
}

/**
 * ГЕНЕРАЦИЯ ОБЗОРА ВЕХИ С УЧЁТОМ ТАРИФА ПОЛЬЗОВАТЕЛЯ
 */
export async function generateMilestoneReview(params: {
  userId: string
  milestoneNumber: number
  days: RawDayInput[]
  tier?: SubscriptionTier
  mockProvider?: (prompt: string) => Promise<any>
}): Promise<MilestoneReviewResult> {
  const { userId, milestoneNumber, days, mockProvider } = params

  // 1. Проверка минимального объёма данных: менее 100 дней -> отчёт не создаётся
  if (days.length < 100) {
    return {
      milestoneNumber,
      tier: 'free',
      title: `Рубеж #${milestoneNumber}`,
      eligible: false,
      reason: 'LESS_THAN_100_DAYS',
      bannerText: `Для формирования отчёта вехи требуется минимум 100 дней записей (сейчас: ${days.length}).`,
    }
  }

  const tier = params.tier || (await getEffectiveTier(userId))
  const stats = computeMilestoneStats(milestoneNumber, days)

  // 2. FREE ТАРИФ: только тост справа сверху + мягкая строка про Премиум
  if (tier === 'free') {
    const toastTitle = `🔥 Поздравляем! ${milestoneNumber} дней подряд`
    const toastMessage = `Хочешь увидеть, как ты изменился за эти ${milestoneNumber} дней? Премиум`

    await recordMilestoneToDb(userId, milestoneNumber, 'free', {
      milestoneNumber,
      tier: 'free',
      toastTitle,
      toastMessage,
    })

    return {
      milestoneNumber,
      tier: 'free',
      eligible: true,
      title: `${milestoneNumber} дней огня!`,
      bannerText: `${milestoneNumber} дней огня! ${toastMessage}`,
      toastTitle,
      toastMessage,
      tierAtTime: 'free',
      stats: undefined,
      review: undefined,
    }
  }

  // 3. PRO ТАРИФ: числа кодом + связка от ИИ
  if (tier === 'pro') {
    let proReview = generateProFallbackText(stats)

    if (mockProvider) {
      try {
        const aiRes = await mockProvider(buildProMilestonePrompt(stats))
        if (aiRes?.summary) {
          proReview = {
            title: aiRes.title || proReview.title,
            summary: aiRes.summary,
            dynamicsComment: aiRes.dynamicsComment || proReview.dynamicsComment,
            tagsComment: aiRes.tagsComment || proReview.tagsComment,
          }
        }
      } catch {
        // Fallback уже подготовлен
      }
    }

    await recordMilestoneToDb(userId, milestoneNumber, 'pro', { stats, review: proReview })

    return {
      milestoneNumber,
      tier: 'pro',
      eligible: true,
      title: `Веха #${milestoneNumber} — Премиум-аналитика`,
      stats,
      review: proReview,
      tierAtTime: 'pro',
    }
  }

  // 4. ULTRA ТАРИФ: глубокая персонализация по тексту записей за 100 дней
  let ultraReview = generateUltraFallbackText(stats, milestoneNumber, days.slice(0, 40))

  if (mockProvider) {
    try {
      const prompt = buildUltraMilestonePrompt({
        milestoneNumber,
        stats,
        dayHighlights: days.slice(0, 40),
      })
      const aiRes = await mockProvider(prompt)
      if (aiRes?.letterToSelf) {
        ultraReview = {
          howYouChanged: aiRes.howYouChanged || ultraReview.howYouChanged,
          whatBecameYourStrength: aiRes.whatBecameYourStrength || ultraReview.whatBecameYourStrength,
          whoAndWhatInspiresYou: aiRes.whoAndWhatInspiresYou || ultraReview.whoAndWhatInspiresYou,
          whatIsNext: aiRes.whatIsNext || ultraReview.whatIsNext,
          letterToSelf: aiRes.letterToSelf,
          transformationSummary: aiRes.transformationSummary || ultraReview.transformationSummary,
        }
      }
    } catch {
      // Fallback уже подготовлен
    }
  }

  await recordMilestoneToDb(userId, milestoneNumber, 'ultra', { stats, review: ultraReview })

  return {
    milestoneNumber,
    tier: 'ultra',
    eligible: true,
    title: `🔥 ВЕХА #${milestoneNumber} — ТРАНСФОРМАЦИЯ`,
    stats,
    review: ultraReview,
    tierAtTime: 'ultra',
  }
}

/**
 * Сохранение информации о вехе в таблицу milestones_shown
 */
async function recordMilestoneToDb(
  userId: string,
  milestoneNumber: number,
  tierAtTime: string,
  payload: any
) {
  try {
    const supabase = getServerSupabase()
    await supabase.rpc('record_milestone_shown', {
      p_day_number: milestoneNumber,
      p_tier_at_time: tierAtTime,
      p_payload: payload,
      p_review_text: payload.review?.letterToSelf || payload.review?.summary || null,
    })
  } catch (err) {
    console.warn('[recordMilestoneToDb warning]:', err)
  }
}

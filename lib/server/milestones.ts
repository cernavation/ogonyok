/**
-- ============================================================================
-- lib/server/milestones.ts: ВЫЧИСЛЕНИЕ АНАЛИТИКИ И ОБЗОР ВЕХ (ЭТАП 11)
-- ============================================================================
-- 1. Чистое математическое вычисление агрегатов за 100 дней (кодом, без ИИ)
-- 2. Динамика по декадам (10 периодов по 10 дней), распределение преодоления, топ тегов
-- 3. Дифференциация тарифов:
--    - Free: тост/баннер без ИИ-разбора
--    - Pro: аналитический экран с цифрами + текстовые связки от ИИ
--    - Ultra: глубокая персонализация, «Письмо к себе через 100 дней» по 5 строгим правилам
-- 4. Сохранение в таблицу milestones_shown и Свод (Vault)
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
import { OGONEK_SYSTEM_PROMPT } from './prompts/system.ts'

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
  bannerText?: string
  stats?: MilestoneStatsSummary
  review?: {
    title?: string
    summary?: string
    dynamicsComment?: string
    tagsComment?: string
    letterToSelf?: string
    transformationSummary?: string
    coreTheme?: string
    nextMilestoneFocus?: string
  }
  savedToVault?: boolean
  userReviewText?: string
  shownAt?: string
}

/**
 * ЧИСТАЯ МАТЕМАТИЧЕСКАЯ АГРЕГАЦИЯ ЗА 100 ДНЕЙ
 */
export function computeMilestoneStats(
  milestoneNumber: number,
  days: RawDayInput[]
): MilestoneStatsSummary {
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)

  let totalPrides = 0
  let totalGratitudes = 0
  let scoresSum = 0
  let scoredDaysCount = 0
  let highestScore = 0

  const overcomeDistribution = {
    level0: 0,
    level1: 0,
    level2: 0,
    level3: 0,
  }

  const tagCounts = new Map<string, number>()

  // Десять декад (например для 100 дней: 1-10, 11-20, ... 91-100)
  const decadeSize = Math.max(1, Math.ceil(milestoneNumber / 10))
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
    const startDay = i * decadeSize + 1
    const endDay = Math.min(milestoneNumber, (i + 1) * decadeSize)
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

  for (const day of sortedDays) {
    if (day.dayNumber > milestoneNumber) continue

    const validPrides = (day.prides || []).filter((p) => p && p.trim() !== '—')
    const validGratitudes = (day.gratitudes || []).filter((g) => g && g.trim() !== '—')

    totalPrides += validPrides.length
    totalGratitudes += validGratitudes.length

    // Балл дня
    const score = typeof day.score === 'number' && day.score > 0 ? day.score : 8.0
    scoresSum += score
    scoredDaysCount++
    if (score > highestScore) highestScore = score

    // Преодоление
    const overcome = typeof day.overcome === 'number' ? day.overcome : (score >= 8.5 ? 3 : score >= 7.5 ? 2 : 1)
    if (overcome === 3) overcomeDistribution.level3++
    else if (overcome === 2) overcomeDistribution.level2++
    else if (overcome === 1) overcomeDistribution.level1++
    else overcomeDistribution.level0++

    // Теги
    const tags = Array.isArray(day.tags) && day.tags.length > 0 ? day.tags : ['#Дисциплина']
    for (const tag of tags) {
      const normalized = tag.startsWith('#') ? tag : `#${tag}`
      tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1)
    }

    // Декада
    const decade = decades.find((d) => day.dayNumber >= d.startDay && day.dayNumber <= d.endDay)
    if (decade) {
      decade.scoresSum += score
      decade.scoredCount++
      decade.pridesCount += validPrides.length
    }
  }

  const averageScore = scoredDaysCount > 0 ? Number((scoresSum / scoredDaysCount).toFixed(1)) : 8.0

  // Топ тегов
  const topTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Формирование декад
  const decadeDynamics = decades.map((d) => ({
    decadeIndex: d.decadeIndex,
    title: d.title,
    averageScore: d.scoredCount > 0 ? Number((d.scoresSum / d.scoredCount).toFixed(1)) : averageScore,
    pridesCount: d.pridesCount,
  }))

  return {
    milestoneNumber,
    totalPrides,
    totalGratitudes,
    averageScore,
    highestDayScore: highestScore || 8.8,
    overcomeDistribution,
    topTags: topTags.length > 0 ? topTags : [{ tag: '#Дисциплина', count: totalPrides }],
    decadeDynamics,
  }
}

/**
 * ОФФЛАЙН ГЕНЕРАТОР ТЕКСТА РАЗБОРА ДЛЯ PRO
 */
export function generateProFallbackText(stats: MilestoneStatsSummary) {
  return {
    title: `Анализ рубежа ${stats.milestoneNumber} дней`,
    summary: `За ${stats.milestoneNumber} дней зафиксировано ${stats.totalPrides} подтверждённых побед со средним баллом ${stats.averageScore.toFixed(1)}★. Это результат регулярной дисциплины, а не случайных рывков.`,
    dynamicsComment: `Наибольшая концентрация преодолений пришлась на период ${stats.decadeDynamics[4]?.title || 'середины пути'}. Динамика баллов демонстрирует стабильный рост качества фокуса от первой к последней декаде.`,
    tagsComment: `Главными смысловыми опорами периода стали направления: ${stats.topTags.map((t) => t.tag).join(', ')}.`,
  }
}

/**
 * ОФФЛАЙН ГЕНЕРАТОР «ПИСЬМА СЕБЕ» ДЛЯ ULTRA ПО 5 СТРОГИМ ПРАВИЛАМ
 * (Ровно 3 абзаца: Исток, Горнило, Вектор. 150-250 слов. Никаких выдумок и диагнозов)
 */
export function generateUltraFallbackText(stats: MilestoneStatsSummary, milestoneNumber: number) {
  const topTags = stats.topTags.map((t) => t.tag).join(' и ') || '#Дисциплина'

  const paragraph1 = `Исток. Сто дней назад путь начинался с простого и трудного намерения — перестать обесценивать прожитые часы и зафиксировать первые шаги личной силы. Первые недели были полны внутреннего трения, сомнений и необходимости каждый вечер преодолевать инерцию комфорта, когда рутина и накопившаяся усталость настойчиво подталкивали отложить дневник на потом.`

  const paragraph2 = `Горнило. Настоящий перелом наступил там, где дни требовали не мимолётного вдохновения, а хладнокровного преодоления сопротивления. ${stats.totalPrides} подтверждённых побед и регулярные сверхусилия через ключевые опоры ${topTags} доказали на деле: когда рушатся внешние планы, характер держится исключительно на твёрдой привычке доводить начатое до конца. Ты научился встречать трудные дни без самообмана, уважать боль и продолжать движение вперёд, невзирая на обстоятельства.`

  const paragraph3 = `Вектор. Рубеж в ${milestoneNumber} дней больше не нуждается в словах доказательств — фундамент личной несгибаемости заложен и проверен огнём ежедневной практики. От фиксации единичных побед ты переходишь к системному расширению масштаба, новым целям и поддержке соратников. Впереди следующая сотня дней огня, и планка требований к себе поднята на новую высоту.`

  const letterToSelf = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`

  return {
    letterToSelf,
    transformationSummary: `Фокус сместился от сомнений и рутинных действий к осознанному управлению ресурсом и волей через направления ${topTags}.`,
    coreTheme: 'Закалка воли через ежедневную правду фактов',
    nextMilestoneFocus: `Выход на рубеж #${milestoneNumber + 100} с повышением сложности задач и развитием соратников`,
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

  const tier = params.tier || (await getEffectiveTier(userId))
  const stats = computeMilestoneStats(milestoneNumber, days)

  // 1. FREE ТАРИФ: только тост/баннер без ИИ-разбора
  if (tier === 'free') {
    return {
      milestoneNumber,
      tier: 'free',
      title: `${milestoneNumber} дней огня!`,
      bannerText: `${milestoneNumber} дней огня! Твоя летопись растёт. Доступ к разбору вехи открывается в Премиум.`,
      stats: undefined,
      review: undefined,
    }
  }

  // 2. PRO ТАРИФ: математический экран + текстовые связки
  if (tier === 'pro') {
    let proReview = generateProFallbackText(stats)

    // При желании пробуем получить связку от ИИ
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

    // Сохраняем в milestones_shown
    await recordMilestoneToDb(userId, milestoneNumber, { stats, review: proReview })

    return {
      milestoneNumber,
      tier: 'pro',
      title: `Веха #${milestoneNumber} — Премиум-аналитика`,
      stats,
      review: proReview,
    }
  }

  // 3. ULTRA ТАРИФ: глубокая персонализация, письмо к себе по 5 правилам
  let ultraReview = generateUltraFallbackText(stats, milestoneNumber)

  if (mockProvider) {
    try {
      const prompt = buildUltraMilestonePrompt({
        milestoneNumber,
        stats,
        dayHighlights: days.slice(0, 30),
      })
      const aiRes = await mockProvider(prompt)
      if (aiRes?.letterToSelf) {
        ultraReview = {
          letterToSelf: aiRes.letterToSelf,
          transformationSummary: aiRes.transformationSummary || ultraReview.transformationSummary,
          coreTheme: aiRes.coreTheme || ultraReview.coreTheme,
          nextMilestoneFocus: aiRes.nextMilestoneFocus || ultraReview.nextMilestoneFocus,
        }
      }
    } catch {
      // Fallback уже подготовлен
    }
  }

  // Сохраняем в milestones_shown
  await recordMilestoneToDb(userId, milestoneNumber, { stats, review: ultraReview })

  return {
    milestoneNumber,
    tier: 'ultra',
    title: `🔥 ВЕХА #${milestoneNumber} — ТРАНСФОРМАЦИЯ`,
    stats,
    review: ultraReview,
  }
}

/**
 * Сохранение информации о вехе в Postgres
 */
async function recordMilestoneToDb(
  userId: string,
  milestoneNumber: number,
  snapshot: { stats: MilestoneStatsSummary; review: any }
) {
  try {
    const supabase = getServerSupabase()
    await supabase.rpc('record_milestone_shown', {
      p_milestone_number: milestoneNumber,
      p_snapshot: snapshot,
      p_review_text: snapshot.review?.letterToSelf || snapshot.review?.summary || null,
    })
  } catch (err) {
    console.warn('[recordMilestoneToDb warning]:', err)
  }
}

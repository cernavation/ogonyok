/**
 * ЭТАП 17 — ДВИЖОК ГЛУБОКОЙ АНАЛИТИКИ.
 *
 * Чистый модуль без DOM. Из записей дней и истории утренних фокусов строит:
 *  • динамику оценок гордостей и благодарностей за неделю / месяц / год;
 *  • сверку записанных гордостей с месячными KPI-целями (прогресс, темп, статус);
 *  • AI-разбор «что обещал утром vs что реально сделал»;
 *  • персональные рекомендации с готовыми действиями (в т.ч. «создать KPI»).
 */

import {
  KPI_KIND_MAP,
  type KpiKindMeta,
} from './kpi'
import {
  countActiveFocusSteps,
  countFulfilledSteps,
} from './morning-focus'
import type {
  AnalyticsPeriod,
  Day,
  KpiKind,
  MonthlyKpi,
  MorningFocusRecord,
  ViewId,
} from './types'

/* ────────────────────────────────────────────────────────────────────────
   ПЕРИОДЫ
   ──────────────────────────────────────────────────────────────────────── */

export type AnalyticsPeriodMeta = {
  id: AnalyticsPeriod
  label: string
  short: string
  /** Дней в окне */
  days: number
}

export const ANALYTICS_PERIODS: AnalyticsPeriodMeta[] = [
  { id: 'week', label: 'Неделя', short: '7 дн.', days: 7 },
  { id: 'month', label: 'Месяц', short: '30 дн.', days: 30 },
  { id: 'year', label: 'Год', short: '12 мес.', days: 365 },
]

export function getAnalyticsPeriod(id: AnalyticsPeriod): AnalyticsPeriodMeta {
  return ANALYTICS_PERIODS.find((p) => p.id === id) ?? ANALYTICS_PERIODS[0]
}

export type TrendDirection = 'up' | 'down' | 'flat'

/* ────────────────────────────────────────────────────────────────────────
   ИЗВЛЕЧЕНИЕ ОЦЕНОК
   ──────────────────────────────────────────────────────────────────────── */

/** Время записи дня в мс — совпадает с логикой сортировки хранилища */
export function dayTime(day: Day): number {
  return day.dateISO ? new Date(day.dateISO).getTime() : day.id * 86_400_000
}

/** Ключ дня YYYY-MM-DD (локально) */
export function dayKey(day: Day): string {
  if (day.dateISO) return day.dateISO.slice(0, 10)
  const d = new Date(dayTime(day))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type RatingExtract = {
  prideRatings: number[]
  gratitudeRatings: number[]
  prideCount: number
  gratitudeCount: number
}

/** Достаёт оценки гордостей и благодарностей из одного дня */
export function extractRatings(day: Day): RatingExtract {
  const prideRatings: number[] = []
  for (const p of day.prides) {
    if (typeof p.scale === 'number' && p.scale > 0 && p.text !== '—') {
      prideRatings.push(p.scale)
    }
  }

  const gratitudeRatings: number[] = []
  for (const g of day.gratitudes) {
    if (typeof g === 'string') {
      gratitudeRatings.push(10)
    } else if (typeof g.rating === 'number' && g.rating > 0) {
      gratitudeRatings.push(g.rating)
    } else {
      gratitudeRatings.push(10)
    }
  }

  return {
    prideRatings,
    gratitudeRatings,
    prideCount: day.prides.length,
    gratitudeCount: day.gratitudes.length,
  }
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/* ────────────────────────────────────────────────────────────────────────
   ДИНАМИКА ОЦЕНОК И БЛАГОДАРНОСТЕЙ
   ──────────────────────────────────────────────────────────────────────── */

export type DynamicsPoint = {
  key: string
  label: string
  prideAvg: number | null
  gratitudeAvg: number | null
  prideCount: number
  gratitudeCount: number
  activeDays: number
}

export type DynamicsSummary = {
  prideCount: number
  gratitudeCount: number
  activeDays: number
  avgPride: number | null
  avgGratitude: number | null
}

export type DynamicsSeries = {
  period: AnalyticsPeriod
  points: DynamicsPoint[]
  totals: DynamicsSummary
  previous: DynamicsSummary
  trend: {
    prideAvg: TrendDirection
    gratitudeAvg: TrendDirection
    prideCount: TrendDirection
    gratitudeCount: TrendDirection
  }
  rangeLabel: string
  maxPrideCount: number
}

type Bucket = { key: string; label: string; startMs: number; endMs: number }

const MONTH_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
]
const WEEKDAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

function startOfLocalDay(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function buildBuckets(period: AnalyticsPeriod, now: Date): Bucket[] {
  const todayStart = startOfLocalDay(now)
  const DAY = 86_400_000

  if (period === 'year') {
    const buckets: Bucket[] = []
    const y = now.getFullYear()
    const m = now.getMonth()
    for (let i = 11; i >= 0; i--) {
      const start = new Date(y, m - i, 1, 0, 0, 0, 0)
      const end = new Date(y, m - i + 1, 1, 0, 0, 0, 0)
      buckets.push({
        key: `${start.getFullYear()}-${start.getMonth() + 1}`,
        label: MONTH_SHORT[start.getMonth()],
        startMs: start.getTime(),
        endMs: end.getTime(),
      })
    }
    return buckets
  }

  const days = period === 'week' ? 7 : 30
  const buckets: Bucket[] = []
  for (let i = days - 1; i >= 0; i--) {
    const start = todayStart - i * DAY
    const date = new Date(start)
    buckets.push({
      key: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
      label: String(date.getDate()),
      startMs: start,
      endMs: start + DAY,
    })
  }
  return buckets
}

function rangeLabel(period: AnalyticsPeriod, now: Date): string {
  if (period === 'week') return 'Последние 7 дней'
  if (period === 'month') return 'Последние 30 дней'
  const y = now.getFullYear()
  return `Последние 12 месяцев · ${y - 1}–${y}`
}

function aggregateRange(
  days: Day[],
  startMs: number,
  endMs: number
): { summary: DynamicsSummary; prideRatingSum: number; prideRatingCount: number; gratRatingSum: number; gratRatingCount: number } {
  let prideCount = 0
  let gratitudeCount = 0
  let activeDays = 0
  let prideRatingSum = 0
  let prideRatingCount = 0
  let gratRatingSum = 0
  let gratRatingCount = 0

  for (const day of days) {
    const t = dayTime(day)
    if (t < startMs || t >= endMs) continue
    if (day.status === 'missed') continue
    activeDays += 1
    const r = extractRatings(day)
    prideCount += r.prideCount
    gratitudeCount += r.gratitudeCount
    for (const v of r.prideRatings) {
      prideRatingSum += v
      prideRatingCount += 1
    }
    for (const v of r.gratitudeRatings) {
      gratRatingSum += v
      gratRatingCount += 1
    }
  }

  const summary: DynamicsSummary = {
    prideCount,
    gratitudeCount,
    activeDays,
    avgPride: prideRatingCount > 0 ? prideRatingSum / prideRatingCount : null,
    avgGratitude: gratRatingCount > 0 ? gratRatingSum / gratRatingCount : null,
  }

  return { summary, prideRatingSum, prideRatingCount, gratRatingSum, gratRatingCount }
}

function trendOf(current: number | null, previous: number | null, epsilon: number): TrendDirection {
  if (current === null || previous === null) return 'flat'
  if (current - previous > epsilon) return 'up'
  if (previous - current > epsilon) return 'down'
  return 'flat'
}

/**
 * Строит динамику оценок гордостей и благодарностей за выбранный период.
 * Возвращает точки по бакетам (дни/месяцы), итоги и сравнение с прошлым окном.
 */
export function buildDynamics(
  days: Day[],
  period: AnalyticsPeriod,
  now: Date = new Date()
): DynamicsSeries {
  const buckets = buildBuckets(period, now)
  const points: DynamicsPoint[] = buckets.map((bucket) => {
    const prideRatings: number[] = []
    const gratitudeRatings: number[] = []
    let prideCount = 0
    let gratitudeCount = 0
    let activeDays = 0

    for (const day of days) {
      const t = dayTime(day)
      if (t < bucket.startMs || t >= bucket.endMs) continue
      if (day.status === 'missed') continue
      activeDays += 1
      const r = extractRatings(day)
      prideCount += r.prideCount
      gratitudeCount += r.gratitudeCount
      prideRatings.push(...r.prideRatings)
      gratitudeRatings.push(...r.gratitudeRatings)
    }

    return {
      key: bucket.key,
      label: bucket.label,
      prideAvg: avg(prideRatings),
      gratitudeAvg: avg(gratitudeRatings),
      prideCount,
      gratitudeCount,
      activeDays,
    }
  })

  const windowStart = buckets[0]?.startMs ?? startOfLocalDay(now)
  const windowEnd = buckets[buckets.length - 1]?.endMs ?? startOfLocalDay(now) + 86_400_000
  const span = Math.max(86_400_000, windowEnd - windowStart)

  const current = aggregateRange(days, windowStart, windowEnd)
  const previous = aggregateRange(days, windowStart - span, windowStart)

  const totals = current.summary
  const maxPrideCount = points.reduce((m, p) => Math.max(m, p.prideCount), 0)

  return {
    period,
    points,
    totals,
    previous: previous.summary,
    trend: {
      prideAvg: trendOf(totals.avgPride, previous.summary.avgPride, 0.2),
      gratitudeAvg: trendOf(totals.avgGratitude, previous.summary.avgGratitude, 0.2),
      prideCount: trendOf(totals.prideCount, previous.summary.prideCount, 1),
      gratitudeCount: trendOf(totals.gratitudeCount, previous.summary.gratitudeCount, 1),
    },
    rangeLabel: rangeLabel(period, now),
    maxPrideCount,
  }
}

/* ────────────────────────────────────────────────────────────────────────
   СВЕРКА С МЕСЯЧНЫМИ KPI-ЦЕЛЯМИ
   ──────────────────────────────────────────────────────────────────────── */

export type KpiStatus = 'done' | 'on-track' | 'behind' | 'at-risk'

export type KpiProgress = {
  kpi: MonthlyKpi
  meta: KpiKindMeta
  current: number
  target: number
  percent: number
  remaining: number
  projected: number
  status: KpiStatus
  /** Прогноз «успею / не успею» человеческим языком */
  verdict: string
}

/** Границы текущего календарного месяца */
export function monthBounds(now: Date): { startMs: number; endMs: number; elapsedFraction: number } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
  const elapsed = Math.min(1, Math.max(0.02, (now.getTime() - start.getTime()) / (end.getTime() - start.getTime())))
  return { startMs: start.getTime(), endMs: end.getTime(), elapsedFraction: elapsed }
}

function focusPercentForRange(
  history: Record<string, MorningFocusRecord>,
  startMs: number,
  endMs: number
): { percent: number | null; promises: number; fulfilled: number } {
  let promises = 0
  let fulfilled = 0
  let hasReviewed = false
  for (const record of Object.values(history)) {
    const t = new Date(`${record.dateKey}T12:00:00`).getTime()
    if (!Number.isFinite(t) || t < startMs || t >= endMs) continue
    if (!record.reviewedAtISO) continue
    hasReviewed = true
    promises += countActiveFocusSteps(record.focus)
    fulfilled += countFulfilledSteps(record.steps)
  }
  if (!hasReviewed || promises === 0) return { percent: null, promises, fulfilled }
  return { percent: Math.round((fulfilled / promises) * 100), promises, fulfilled }
}

/**
 * Сверяет одну месячную KPI-цель с фактическими записями текущего месяца.
 * Считает текущее значение, процент, прогноз к концу месяца и статус темпа.
 */
export function computeKpiProgress(
  kpi: MonthlyKpi,
  days: Day[],
  history: Record<string, MorningFocusRecord>,
  now: Date = new Date()
): KpiProgress {
  const meta = KPI_KIND_MAP[kpi.kind] ?? KPI_KIND_MAP.prides
  const { startMs, endMs, elapsedFraction } = monthBounds(now)

  let current = 0
  let manual = false

  switch (kpi.kind) {
    case 'prides': {
      let count = 0
      for (const day of days) {
        const t = dayTime(day)
        if (t < startMs || t >= endMs || day.status === 'missed') continue
        count += day.prides.length
      }
      current = count
      break
    }
    case 'gratitudes': {
      let count = 0
      for (const day of days) {
        const t = dayTime(day)
        if (t < startMs || t >= endMs || day.status === 'missed') continue
        count += day.gratitudes.length
      }
      current = count
      break
    }
    case 'active-days': {
      let count = 0
      for (const day of days) {
        const t = dayTime(day)
        if (t < startMs || t >= endMs || day.status === 'missed') continue
        count += 1
      }
      current = count
      break
    }
    case 'avg-rating': {
      let sum = 0
      let n = 0
      for (const day of days) {
        const t = dayTime(day)
        if (t < startMs || t >= endMs || day.status === 'missed') continue
        for (const p of day.prides) {
          if (typeof p.scale === 'number' && p.scale > 0 && p.text !== '—') {
            sum += p.scale
            n += 1
          }
        }
      }
      current = n > 0 ? Math.round((sum / n) * 10) / 10 : 0
      break
    }
    case 'focus-percent': {
      const focus = focusPercentForRange(history, startMs, endMs)
      current = focus.percent ?? 0
      break
    }
    case 'custom': {
      manual = true
      current = kpi.manualDone ? kpi.target : 0
      break
    }
  }

  const target = kpi.target
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const remaining = Math.max(0, target - current)

  // Прогноз к концу месяца (для ручных целей не прогнозируем — только факт)
  let projected = current
  if (!manual && kpi.kind !== 'avg-rating') {
    projected = Math.round(current / elapsedFraction)
  }

  let status: KpiStatus
  if (percent >= 100) {
    status = 'done'
  } else {
    const pace = target > 0 ? current / target : 0
    if (pace >= elapsedFraction) status = 'on-track'
    else if (pace >= elapsedFraction * 0.6) status = 'behind'
    else status = 'at-risk'
  }

  const verdict =
    status === 'done'
      ? 'Цель месяца закрыта ✓'
      : manual
        ? kpi.manualDone
          ? 'Отмечено как выполненное'
          : 'Отметь, когда завершишь цель'
        : kpi.kind === 'avg-rating'
          ? `До цели не хватает ${remaining.toFixed(1)} ★`
          : projected >= target
            ? `Идёшь с опережением — прогноз ${projected} из ${target}`
            : `Нужно ускориться: прогноз ${projected} из ${target}`

  return {
    kpi,
    meta,
    current: kpi.kind === 'avg-rating' ? Math.round(current * 10) / 10 : current,
    target,
    percent,
    remaining,
    projected,
    status,
    verdict,
  }
}

/** Сверяет сразу все месячные KPI и возвращает средний процент выполнения */
export function computeAllKpiProgress(
  kpis: MonthlyKpi[],
  days: Day[],
  history: Record<string, MorningFocusRecord>,
  now: Date = new Date()
): { items: KpiProgress[]; overallPercent: number; doneCount: number } {
  const items = kpis.map((kpi) => computeKpiProgress(kpi, days, history, now))
  const overallPercent =
    items.length > 0
      ? Math.round(items.reduce((s, i) => s + i.percent, 0) / items.length)
      : 0
  const doneCount = items.filter((i) => i.status === 'done').length
  return { items, overallPercent, doneCount }
}

/* ────────────────────────────────────────────────────────────────────────
   AI-РАЗБОР: «ЧТО ОБЕЩАЛ УТРОМ VS ЧТО РЕАЛЬНО СДЕЛАЛ»
   ──────────────────────────────────────────────────────────────────────── */

export type PromiseRow = {
  dateKey: string
  text: string
  status: 'done' | 'missed' | 'pending'
}

export type PromiseVsReality = {
  period: AnalyticsPeriod
  /** Окно анализа (человекочитаемо) */
  rangeLabel: string
  totalPromises: number
  fulfilled: number
  missed: number
  pending: number
  /** % сдержанных от уже сверенных обещаний */
  percent: number
  reviewedDays: number
  /** Все обещания периода (свежие первыми) для ленты «обещал → сделал» */
  rows: PromiseRow[]
  bestDay: { dateKey: string; percent: number } | null
  weakestDay: { dateKey: string; percent: number } | null
  verdict: { label: string; tone: 'elite' | 'good' | 'mid' | 'low' }
}

function focusRangeMs(period: AnalyticsPeriod, now: Date): { startMs: number; endMs: number; label: string } {
  const DAY = 86_400_000
  const todayStart = startOfLocalDay(now)
  if (period === 'year') {
    return {
      startMs: todayStart - 364 * DAY,
      endMs: todayStart + DAY,
      label: 'за последние 12 месяцев',
    }
  }
  const days = period === 'week' ? 7 : 30
  return {
    startMs: todayStart - (days - 1) * DAY,
    endMs: todayStart + DAY,
    label: period === 'week' ? 'за последние 7 дней' : 'за последние 30 дней',
  }
}

/**
 * Разбирает «утренние обещания vs реальность» за выбранный период:
 * сопоставляет обещания с их вечерним статусом, считает процент и вердикт.
 */
export function buildPromiseVsReality(
  history: Record<string, MorningFocusRecord>,
  period: AnalyticsPeriod,
  now: Date = new Date()
): PromiseVsReality {
  const { startMs, endMs, label } = focusRangeMs(period, now)

  const records: MorningFocusRecord[] = []
  for (const record of Object.values(history)) {
    const t = new Date(`${record.dateKey}T12:00:00`).getTime()
    if (!Number.isFinite(t) || t < startMs || t >= endMs) continue
    if (countActiveFocusSteps(record.focus) === 0) continue
    records.push(record)
  }
  records.sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0))

  const rows: PromiseRow[] = []
  let totalPromises = 0
  let fulfilled = 0
  let missed = 0
  let pending = 0
  let bestDay: PromiseVsReality['bestDay'] = null
  let weakestDay: PromiseVsReality['weakestDay'] = null

  for (const record of records) {
    const active = [0, 1, 2].filter((i) => record.focus[i] && record.focus[i].trim().length > 0)
    if (active.length === 0) continue
    let dayDone = 0
    let dayDecided = 0
    for (const i of active) {
      const status = record.reviewedAtISO ? record.steps[i] : 'pending'
      rows.push({ dateKey: record.dateKey, text: record.focus[i], status })
      totalPromises += 1
      if (status === 'done') {
        fulfilled += 1
        dayDone += 1
        dayDecided += 1
      } else if (status === 'missed') {
        missed += 1
        dayDecided += 1
      } else {
        pending += 1
      }
    }
    if (dayDecided > 0) {
      const dayPercent = Math.round((dayDone / dayDecided) * 100)
      if (!bestDay || dayPercent > bestDay.percent) bestDay = { dateKey: record.dateKey, percent: dayPercent }
      if (!weakestDay || dayPercent < weakestDay.percent) weakestDay = { dateKey: record.dateKey, percent: dayPercent }
    }
  }

  const decided = fulfilled + missed
  const percent = decided > 0 ? Math.round((fulfilled / decided) * 100) : 0

  const verdict: PromiseVsReality['verdict'] =
    decided === 0
      ? { label: 'Пока нечего сверять — зафиксируй утренние обещания', tone: 'mid' }
      : percent >= 90
        ? { label: 'Утро и вечер сходятся почти идеально', tone: 'elite' }
        : percent >= 66
          ? { label: 'Ты держишь слово в большинстве дней', tone: 'good' }
          : percent >= 40
            ? { label: 'Слово держится наполовину — есть куда расти', tone: 'mid' }
            : { label: 'Обещаний больше, чем действий — сузь фокус', tone: 'low' }

  return {
    period,
    rangeLabel: label,
    totalPromises,
    fulfilled,
    missed,
    pending,
    percent,
    reviewedDays: records.filter((r) => Boolean(r.reviewedAtISO)).length,
    rows: rows.slice(0, 24),
    bestDay,
    weakestDay,
    verdict,
  }
}

/* ────────────────────────────────────────────────────────────────────────
   ПЕРСОНАЛЬНЫЕ РЕКОМЕНДАЦИИ
   ──────────────────────────────────────────────────────────────────────── */

export type Recommendation = {
  id: string
  tone: 'win' | 'warning' | 'idea' | 'focus'
  emoji: string
  title: string
  body: string
  /** Совет можно превратить в месячную цель одним кликом */
  suggestKpi?: { title: string; kind: KpiKind; target: number }
  /** Совет ведёт в другой раздел */
  navigateTo?: ViewId
}

function fmtAvg(value: number | null): string {
  return value === null ? '—' : value.toFixed(1)
}

/** Определяет самый сильный день недели по средней оценке гордостей */
function strongestWeekday(days: Day[]): { label: string; avg: number } | null {
  const sums = new Array(7).fill(0)
  const counts = new Array(7).fill(0)
  for (const day of days) {
    const d = new Date(dayTime(day))
    const wd = d.getDay()
    for (const p of day.prides) {
      if (typeof p.scale === 'number' && p.scale > 0 && p.text !== '—') {
        sums[wd] += p.scale
        counts[wd] += 1
      }
    }
  }
  let bestIdx = -1
  let bestAvg = 0
  for (let i = 0; i < 7; i++) {
    if (counts[i] >= 2) {
      const a = sums[i] / counts[i]
      if (a > bestAvg) {
        bestAvg = a
        bestIdx = i
      }
    }
  }
  if (bestIdx < 0) return null
  return { label: WEEKDAY_SHORT[bestIdx], avg: Math.round(bestAvg * 10) / 10 }
}

export type RecommendationInput = {
  days: Day[]
  history: Record<string, MorningFocusRecord>
  kpis: MonthlyKpi[]
  dynamics: DynamicsSeries
  reality: PromiseVsReality
  now?: Date
}

/**
 * Собирает персональные рекомендации: где ты силён, где теряешь темп,
 * какие цели стоит добавить и куда направить фокус на следующую неделю.
 */
export function buildRecommendations(input: RecommendationInput): Recommendation[] {
  const { days, history, kpis, dynamics, reality } = input
  const list: Recommendation[] = []

  const rating = dynamics.totals.avgPride
  const ratingTrend = dynamics.trend.prideAvg

  // 1. Средний балл гордостей
  if (rating !== null && rating >= 8.5) {
    list.push({
      id: 'rec-rating-high',
      tone: 'win',
      emoji: '⭐',
      title: `Средний балл ★ ${fmtAvg(rating)} — уровень силы растёт`,
      body:
        ratingTrend === 'up'
          ? 'Динамика оценок идёт вверх: планка качества поднялась. Зафиксируй её как месячную цель, чтобы не упасть.'
          : 'Ты держишь высокую планку качества. Закрепи её целью месяца и защищай от просадок.',
      suggestKpi: ratingTrend === 'up'
        ? { title: `Удержать средний балл ★ ${rating.toFixed(1)}`, kind: 'avg-rating', target: Math.round(rating * 10) / 10 }
        : undefined,
    })
  } else if (rating !== null && rating < 7) {
    list.push({
      id: 'rec-rating-low',
      tone: 'warning',
      emoji: '📉',
      title: `Средний балл ★ ${fmtAvg(rating)} ниже комфортного`,
      body:
        'Оценки гордостей просели. Добавь в неделю 2–3 «крупных» победы, а мелкие задачи переведи в благодарности.',
      navigateTo: 'home',
    })
  }

  // 2. Дисбаланс гордостей и благодарностей
  const pCount = dynamics.totals.prideCount
  const gCount = dynamics.totals.gratitudeCount
  if (pCount > 0 && gCount > 0 && pCount > gCount * 1.8) {
    list.push({
      id: 'rec-grat-balance',
      tone: 'idea',
      emoji: '❤️',
      title: 'Перекос в сторону достижений',
      body: `Гордостей ${pCount}, благодарностей ${gCount}. Благодарность держит энергию: добавь по одному пункту за вечер.`,
      suggestKpi: { title: 'Держать ритм благодарностей', kind: 'gratitudes', target: Math.max(30, gCount * 4) },
    })
  } else if (gCount > pCount * 2) {
    list.push({
      id: 'rec-pride-balance',
      tone: 'idea',
      emoji: '🔥',
      title: 'Благодарностей много — добавь огня гордости',
      body: 'Благодарности — это опора, но гордость строит стрик. Поставь цель на новые победы в этом месяце.',
      suggestKpi: { title: '30 гордостей за месяц', kind: 'prides', target: 30 },
    })
  }

  // 3. Утренние обещания vs реальность
  if (reality.totalPromises > 0) {
    if (reality.percent >= 80) {
      list.push({
        id: 'rec-promise-strong',
        tone: 'win',
        emoji: '🎯',
        title: `Ты держишь слово в ${reality.percent}% обещаний`,
        body: `Сдержано ${reality.fulfilled} из ${reality.fulfilled + reality.missed} сверенных. Это дисциплина уровня основателя — держи планку.`,
      })
    } else if (reality.missed > reality.fulfilled) {
      list.push({
        id: 'rec-promise-weak',
        tone: 'warning',
        emoji: '⏳',
        title: 'Обещаний больше, чем действий',
        body: `Не сдержано ${reality.missed} обещаний. Сузь утренний фокус до одного главного шага — и доводи его до конца.`,
        navigateTo: 'intentions',
      })
    } else if (reality.pending > 0) {
      list.push({
        id: 'rec-promise-pending',
        tone: 'focus',
        emoji: '🌙',
        title: `Не закрыто вечером: ${reality.pending}`,
        body: 'Остались обещания без вечерней сверки. Отмечай «Выполнил / Не выполнил», чтобы аналитика была точной.',
        navigateTo: 'intentions',
      })
    }
  } else {
    list.push({
      id: 'rec-promise-empty',
      tone: 'focus',
      emoji: '☀️',
      title: 'Утренний фокус пока пуст',
      body: 'Зафиксируй три обещания утром — к вечеру Огонёк сверит, что реально сделано, а что нет.',
      navigateTo: 'intentions',
    })
  }

  // 4. KPI в зоне риска
  const progress = kpis.map((k) => computeKpiProgress(k, days, history, input.now ?? new Date()))
  const atRisk = progress.filter((p) => p.status === 'at-risk' || p.status === 'behind')
  if (atRisk.length > 0) {
    const worst = atRisk.sort((a, b) => a.percent - b.percent)[0]
    list.push({
      id: 'rec-kpi-risk',
      tone: 'warning',
      emoji: worst.meta.emoji,
      title: `Цель «${worst.kpi.title}» отстаёт (${worst.percent}%)`,
      body: `${worst.verdict}. Осталось ${worst.remaining > 0 ? worst.remaining : 0} ${worst.meta.unit}. Разложи на небольшие шаги по дням.`,
    })
  } else if (progress.length > 0 && progress.every((p) => p.status === 'done')) {
    list.push({
      id: 'rec-kpi-perfect',
      tone: 'win',
      emoji: '🏆',
      title: 'Все месячные цели закрыты',
      body: 'Отличный темп. Подними планку: добавь цель, которая раньше казалась слишком смелой.',
    })
  } else if (progress.length === 0) {
    list.push({
      id: 'rec-kpi-empty',
      tone: 'idea',
      emoji: '✨',
      title: 'Нет ни одной месячной цели',
      body: 'Без ориентира сложно понять, растёшь ли ты. Добавь первый KPI — аналитика начнёт сверять реальность с планом.',
      suggestKpi: { title: '30 гордостей за месяц', kind: 'prides', target: 30 },
    })
  }

  // 5. Лучший день недели
  const strongest = strongestWeekday(days)
  if (strongest) {
    list.push({
      id: 'rec-weekday',
      tone: 'idea',
      emoji: '📅',
      title: `${strongest.label} — твой самый сильный день (★ ${strongest.avg})`,
      body: `В этот день ставь самую важную задачу недели, а на слабые дни планируй восстановление и мелочи.`,
    })
  }

  // 6. Активность
  const activeTrend = dynamics.trend.prideCount
  if (activeTrend === 'up' && dynamics.totals.prideCount > 0) {
    list.push({
      id: 'rec-momentum',
      tone: 'win',
      emoji: '🚀',
      title: 'Темп растёт по сравнению с прошлым периодом',
      body: `За этот период ${dynamics.totals.prideCount} гордостей против ${dynamics.previous.prideCount} ранее. Зафиксируй импульс — не сбавляй.`,
    })
  } else if (activeTrend === 'down' && dynamics.previous.prideCount > 0) {
    list.push({
      id: 'rec-momentum-down',
      tone: 'warning',
      emoji: '🧯',
      title: 'Темп записей снизился',
      body: `${dynamics.totals.prideCount} гордостей против ${dynamics.previous.prideCount} ранее. Верни ритм: одна запись за день удерживает стрик.`,
      navigateTo: 'home',
    })
  }

  return list.slice(0, 6)
}

/**
 * Модуль математического расчёта и нормализации баллов дня и статистики.
 * Обеспечивает строгое среднее арифметическое без накопления погрешностей float.
 */

import type { Day, PrideEntry } from './types'

/**
 * Вычисляет средний балл дня по гордостям (1.0 .. 10.0).
 * Возвращает null, если нет ни одной оценённой записи.
 */
export function computeDayScore(day: Partial<Day> | null | undefined): number | null {
  if (!day || !Array.isArray(day.prides)) return null

  const valid = day.prides.filter(
    (p): p is PrideEntry & { scale: number } =>
      Boolean(p) &&
      typeof p.scale === 'number' &&
      !isNaN(p.scale) &&
      p.scale > 0 &&
      typeof p.text === 'string' &&
      p.text.trim().length > 0 &&
      p.text.trim() !== '—'
  )

  if (valid.length === 0) return null

  const sum = valid.reduce((acc, p) => acc + p.scale, 0)
  return Math.round((sum / valid.length) * 10) / 10
}

/**
 * Вычисляет средний балл по массиву дней (например, за неделю или месяц).
 */
export function computeDaysAverage(days: Day[]): number | null {
  if (!Array.isArray(days) || days.length === 0) return null

  const scores = days
    .map((d) => computeDayScore(d))
    .filter((s): s is number => s !== null && typeof s === 'number' && !isNaN(s))

  if (scores.length === 0) return null

  const sum = scores.reduce((acc, s) => acc + s, 0)
  return Math.round((sum / scores.length) * 10) / 10
}

/**
 * Форматирует балл в строку вида "9.4" или "—"
 */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return '—'
  return score.toFixed(1)
}

/**
 * Конвертирует балл в уровень активности хитмапа (0..4)
 */
export function scoreToLevel(score: number | null | undefined): number {
  if (!score || score <= 0) return 0
  if (score >= 9.0) return 4
  if (score >= 8.0) return 3
  if (score >= 6.0) return 2
  return 1
}

/**
 * Вычисляет динамику тренда между двумя периодами
 */
export function computeScoreTrend(
  currentScore: number | null | undefined,
  prevScore: number | null | undefined
): 'up' | 'down' | 'steady' {
  if (currentScore === null || currentScore === undefined) return 'steady'
  if (prevScore === null || prevScore === undefined) return 'steady'

  const diff = currentScore - prevScore
  if (diff >= 0.1) return 'up'
  if (diff <= -0.1) return 'down'
  return 'steady'
}

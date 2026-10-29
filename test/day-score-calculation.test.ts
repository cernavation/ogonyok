import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeDayScore,
  computeDaysAverage,
  computeScoreTrend,
  formatScore,
  scoreToLevel,
} from '../lib/ogonek/scores.ts'
import type { Day, PrideEntry, VisibilityLevel } from '../lib/ogonek/types.ts'

function makePride(text: string, scale: number, visibility: VisibilityLevel = 'public'): PrideEntry {
  return { num: '01', text, scale, overcome: 0, visibility }
}

describe('Вычисление среднего балла дня и аналитики', () => {
  it('вычисляет точное среднее арифметическое 5 оцененных гордостей [9, 10, 9, 10, 9] -> 9.4', () => {
    const day: Partial<Day> = {
      prides: [
        makePride('Зарядка', 9),
        makePride('Пробежка', 10),
        makePride('Кодинг', 9),
        makePride('Релиз', 10),
        makePride('Медитация', 9),
      ],
    }

    const score = computeDayScore(day)
    assert.equal(score, 9.4)
  })

  it('исключает незаполненные прочерки «—» из знаменателя', () => {
    const day: Partial<Day> = {
      prides: [
        makePride('Победа 1', 10),
        makePride('Победа 2', 10),
        makePride('—', 0),
        makePride('—', 0),
        makePride('—', 0),
      ],
    }

    const score = computeDayScore(day)
    assert.equal(score, 10.0)
  })

  it('исключает записи со scale: 0, undefined или NaN', () => {
    const day: Partial<Day> = {
      prides: [
        makePride('Дело 1', 8),
        makePride('Дело 2', 0),
        makePride('Дело 3', undefined as any),
        makePride('Дело 4', NaN),
      ],
    }

    const score = computeDayScore(day)
    assert.equal(score, 8.0)
  })

  it('возвращает null, если ни одна запись дня не оценена', () => {
    const day: Partial<Day> = {
      prides: [
        makePride('—', 0),
        makePride('—', 0),
      ],
    }

    assert.equal(computeDayScore(day), null)
  })

  it('безопасно обрабатывает null, undefined и пустые объекты', () => {
    assert.equal(computeDayScore(null), null)
    assert.equal(computeDayScore(undefined), null)
    assert.equal(computeDayScore({}), null)
    assert.equal(computeDayScore({ prides: [] }), null)
  })

  it('computeDaysAverage корректно усредняет баллы за неделю', () => {
    const weekDays: Day[] = [
      { id: 1, title: 'Day 1', tags: [], prides: [makePride('P', 10)], gratitudes: [] },
      { id: 2, title: 'Day 2', tags: [], prides: [makePride('P', 9)], gratitudes: [] },
      { id: 3, title: 'Day 3', tags: [], prides: [makePride('P', 8)], gratitudes: [] },
      { id: 4, title: 'Day 4', tags: [], prides: [makePride('P', 9)], gratitudes: [] },
      { id: 5, title: 'Day 5', tags: [], prides: [makePride('P', 10)], gratitudes: [] },
      { id: 6, title: 'Day 6', tags: [], prides: [makePride('P', 9)], gratitudes: [] },
      { id: 7, title: 'Day 7', tags: [], prides: [makePride('P', 8)], gratitudes: [] },
    ]

    // (10 + 9 + 8 + 9 + 10 + 9 + 8) / 7 = 63 / 7 = 9.0
    const avg = computeDaysAverage(weekDays)
    assert.equal(avg, 9.0)
  })

  it('formatScore преобразует числа в формат с одним знаком после запятой', () => {
    assert.equal(formatScore(9.4), '9.4')
    assert.equal(formatScore(10), '10.0')
    assert.equal(formatScore(8), '8.0')
    assert.equal(formatScore(null), '—')
    assert.equal(formatScore(undefined), '—')
  })

  it('scoreToLevel градирует оценку дня в уровни активности 0..4', () => {
    assert.equal(scoreToLevel(null), 0)
    assert.equal(scoreToLevel(0), 0)
    assert.equal(scoreToLevel(5.5), 1)
    assert.equal(scoreToLevel(7.5), 2)
    assert.equal(scoreToLevel(8.5), 3)
    assert.equal(scoreToLevel(9.5), 4)
    assert.equal(scoreToLevel(10.0), 4)
  })

  it('computeScoreTrend определяет положительную, отрицательную и нейтральную динамику', () => {
    assert.equal(computeScoreTrend(9.5, 9.0), 'up')
    assert.equal(computeScoreTrend(8.2, 8.8), 'down')
    assert.equal(computeScoreTrend(9.4, 9.4), 'steady')
    assert.equal(computeScoreTrend(9.42, 9.40), 'steady') // разница меньше 0.1
    assert.equal(computeScoreTrend(null, 9.0), 'steady')
    assert.equal(computeScoreTrend(9.0, null), 'steady')
  })

  it('округление до десятых исключает накапливающиеся аномалии чисел с плавающей точкой', () => {
    const day: Partial<Day> = {
      prides: [
        makePride('A', 7),
        makePride('B', 8),
        makePride('C', 9),
      ],
    }
    // (7 + 8 + 9) / 3 = 24 / 3 = 8.0
    assert.equal(computeDayScore(day), 8.0)

    const day2: Partial<Day> = {
      prides: [
        makePride('A', 7),
        makePride('B', 7),
        makePride('C', 8),
      ],
    }
    // 22 / 3 = 7.333333333333333 -> 7.3
    assert.equal(computeDayScore(day2), 7.3)
  })
})

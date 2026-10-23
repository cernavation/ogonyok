import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateStreak } from '../lib/ogonek/diary-engine.ts'
import { computeProfileStats } from '../lib/ogonek/profile-share.ts'
import type { Day } from '../lib/ogonek/types.ts'

describe('Единый источник правды для стрика (PRODUCT_SPEC.md Правило 3 & Требование 5)', () => {
  it('Стрик равен количеству закрытых дней дневника, а не календарным дням подряд', () => {
    // 5 закрытых дней с огромными пропусками по календарю
    const dbDays = [
      { id: '1', day_number: 1, closed_at: '2024-01-01T12:00:00Z' },
      { id: '2', day_number: 2, closed_at: '2024-05-10T12:00:00Z' },
      { id: '3', day_number: 3, closed_at: '2025-01-15T12:00:00Z' },
      { id: '4', day_number: 4, closed_at: '2026-03-01T12:00:00Z' },
      { id: '5', day_number: 5, closed_at: '2026-10-20T12:00:00Z' },
      { id: '6', day_number: 6, closed_at: null }, // открытый незакрытый день
    ]

    const streak = calculateStreak(dbDays)
    assert.equal(streak, 5, 'Стрик по записям из базы равен 5')
  })

  it('Корректно считает стрик из локальных объектов Day (RightRail и ProfileView совпадают)', () => {
    const localDays: Day[] = [
      {
        id: 1,
        title: 'День 1',
        tags: [],
        prides: [{ num: '01', text: 'Первая победа', scale: 9, overcome: 1 }],
        gratitudes: ['Благодарен за день'],
        status: 'normal',
      },
      {
        id: 2,
        title: 'День 2',
        tags: [],
        prides: [{ num: '01', text: 'Вторая победа', scale: 8, overcome: 0 }],
        gratitudes: ['Благодарен за утро'],
        status: 'normal',
      },
      {
        id: 3,
        title: 'День 3',
        tags: [],
        prides: [{ num: '01', text: 'Третья победа', scale: 10, overcome: 2 }],
        gratitudes: ['Благодарен за поддержку'],
        status: 'normal',
      },
      {
        id: 4,
        title: 'День 4',
        tags: [],
        prides: [],
        gratitudes: [],
        status: 'missed', // пропущенный день — не считается
      },
      {
        id: 5,
        title: 'День 5 (открытый)',
        tags: [],
        prides: [],
        gratitudes: [],
        status: 'normal', // нет записей — не считается закрытым
      },
    ]

    const streak = calculateStreak(localDays)
    assert.equal(streak, 3, 'Стрик по локальным дням равен 3 закрытым дням')

    const profileStats = computeProfileStats(localDays)
    assert.equal(
      profileStats.streakDays,
      streak,
      'Стрик в профиле и стрик в правой колонке строго совпадают (один источник правды)'
    )
  })

  it('Для 705 дней истории стрик равен ровно 705 и в профиле, и в правой колонке', () => {
    const archive705: Day[] = Array.from({ length: 705 }, (_, i) => ({
      id: i + 1,
      title: `День ${i + 1}`,
      tags: [],
      prides: [{ num: '01', text: `Гордость дня ${i + 1}`, scale: 8.5, overcome: 1 }],
      gratitudes: [`Благодарность дня ${i + 1}`],
      status: 'normal',
      dateISO: new Date(2024, 0, i + 1).toISOString(),
    }))

    const streak = calculateStreak(archive705)
    assert.equal(streak, 705, 'Стрик равен ровно 705 дням')

    const stats = computeProfileStats(archive705)
    assert.equal(stats.streakDays, 705, 'В профиле отображается 705 дней')
  })

  it('Пустой дневник возвращает 0', () => {
    assert.equal(calculateStreak([]), 0)
    assert.equal(calculateStreak(null as any), 0)
    assert.equal(calculateStreak(undefined as any), 0)
  })
})

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canChangeLevel,
  calculateStreak,
  getTargetDayForNewEntry,
  evaluateDayClosing,
  type DiaryDayRecord,
} from '../lib/ogonek/diary-engine.ts'

describe('Правила дней и стрика (PRODUCT_SPEC.md, Правила 1–6)', () => {

  it('Правило 1 & 2: Смена уровня заблокирована на 30 дней с обратным отсчётом', () => {
    const baseDate = new Date('2026-10-01T12:00:00Z')
    
    // Сменили 10 дней назад -> осталось 20 дней, смена запрещена
    const tenDaysLater = new Date('2026-10-11T12:00:00Z')
    const check1 = canChangeLevel(baseDate.toISOString(), tenDaysLater)
    assert.equal(check1.allowed, false)
    assert.equal(check1.daysLeft, 20)

    // Сменили 29.5 дней назад -> осталось 1 день, смена запрещена
    const almostMonth = new Date('2026-10-30T12:00:00Z')
    const check2 = canChangeLevel(baseDate.toISOString(), almostMonth)
    assert.equal(check2.allowed, false)
    assert.equal(check2.daysLeft, 1)

    // Прошло 30 дней -> смена разрешена!
    const thirtyDaysLater = new Date('2026-10-31T12:00:00Z')
    const check3 = canChangeLevel(baseDate.toISOString(), thirtyDaysLater)
    assert.equal(check3.allowed, true)
    assert.equal(check3.daysLeft, 0)

    // Если уровень никогда не менялся (null/undefined) -> смена разрешена
    const checkNull = canChangeLevel(null)
    assert.equal(checkNull.allowed, true)
    assert.equal(checkNull.daysLeft, 0)
  })

  it('Правило 3: Огонёк НИКОГДА не сбрасывается. Стрик = количество закрытых дней', () => {
    // 5 закрытых дней, даже если между ними были паузы в недели и месяцы
    const days: Array<{ closed_at: string | null; day_number: number }> = [
      { day_number: 1, closed_at: '2026-01-01T20:00:00Z' },
      { day_number: 2, closed_at: '2026-01-02T20:00:00Z' },
      // Пропуск 3 месяца!
      { day_number: 3, closed_at: '2026-04-10T20:00:00Z' },
      // Пропуск 1 год!
      { day_number: 4, closed_at: '2027-04-10T20:00:00Z' },
      { day_number: 5, closed_at: '2027-04-11T20:00:00Z' },
      { day_number: 6, closed_at: null }, // открытый, ещё не закрыт
    ]

    const streak = calculateStreak(days)
    assert.equal(streak, 5, 'Стрик равен ровно количеству закрытых дней дневника')

    // Если нет закрытых дней
    assert.equal(calculateStreak([{ closed_at: null }]), 0)
  })

  it('Правило 4: Пропуск двух дней → запись идёт в первый незакрытый день (следующий номер)', () => {
    // Ситуация из ТЗ:
    // Последний закрытый день — 20-й.
    // Я не писал два дня (было 20-е, стало 22-е).
    // Сегодня 22-е, жму «Записать» → запись попадает в 21-й, а не в 22-й!
    const existingDays: DiaryDayRecord[] = [
      {
        id: 'day-20',
        user_id: 'user-1',
        day_number: 20,
        day_date: '2026-10-20',
        closed_at: '2026-10-20T21:00:00Z',
      },
    ]

    const target = getTargetDayForNewEntry(existingDays, '2026-10-22')
    assert.equal(target.day_number, 21, 'Номер дня должен быть 21 (следующий незакрытый)')
    assert.equal(target.isNewDay, true, 'Это новый день дневника')
    assert.equal(target.existingDayId, null)

    // Если 21-й уже был начат (но не закрыт), запись снова идёт в него же
    const daysWithOpen21: DiaryDayRecord[] = [
      ...existingDays,
      {
        id: 'day-21',
        user_id: 'user-1',
        day_number: 21,
        day_date: '2026-10-21',
        closed_at: null, // не закрыт!
      },
    ]

    const targetOpen = getTargetDayForNewEntry(daysWithOpen21, '2026-10-22')
    assert.equal(targetOpen.day_number, 21, 'Запись попадает в уже открытый незакрытый 21-й день')
    assert.equal(targetOpen.isNewDay, false)
    assert.equal(targetOpen.existingDayId, 'day-21')
  })

  it('Правило 5: Закрытие дня происходит строго при наборе нормы уровня', () => {
    const day: DiaryDayRecord = {
      id: 'day-1',
      user_id: 'user-1',
      day_number: 1,
      day_date: '2026-10-23',
      closed_at: null,
    }

    // Уровень 3 -> нужно 3 гордости И 3 благодарности
    const userLevel = 3

    // 1. Только 2 гордости и 0 благодарностей -> не закрыт
    const res1 = evaluateDayClosing(
      day,
      [{ type: 'pride' }, { type: 'pride' }],
      userLevel,
      [day],
      '2026-10-23'
    )
    assert.equal(res1.canClose, false)
    assert.equal(res1.reason, 'quota_not_reached')

    // 2. 3 гордости, но только 2 благодарности -> не закрыт (нужно И то, И другое!)
    const res2 = evaluateDayClosing(
      day,
      [
        { type: 'pride' },
        { type: 'pride' },
        { type: 'pride' },
        { type: 'gratitude' },
        { type: 'gratitude' },
      ],
      userLevel,
      [day],
      '2026-10-23'
    )
    assert.equal(res2.canClose, false)
    assert.equal(res2.reason, 'quota_not_reached')

    // 3. 3 гордости И 3 благодарности -> норма набрана, день закрывается!
    const res3 = evaluateDayClosing(
      day,
      [
        { type: 'pride' },
        { type: 'pride' },
        { type: 'pride' },
        { type: 'gratitude' },
        { type: 'gratitude' },
        { type: 'gratitude' },
      ],
      userLevel,
      [day],
      '2026-10-23'
    )
    assert.equal(res3.canClose, true)
    assert.equal(res3.quotaNeeded, 3)
  })

  it('Правило 5: Лимит — максимум 1 новый закрытый день за календарные сутки', () => {
    const todayStr = '2026-10-23'
    const userLevel = 2 // 2 гордости и 2 благодарности

    // Пользователь СЕГОДНЯ уже закрыл один день (#1)
    const day1Closed: DiaryDayRecord = {
      id: 'day-1',
      user_id: 'user-1',
      day_number: 1,
      day_date: '2026-10-23',
      closed_at: '2026-10-23T10:00:00Z', // закрыт сегодня!
    }

    // Теперь в тот же день пытается закрыть день #2
    const day2: DiaryDayRecord = {
      id: 'day-2',
      user_id: 'user-1',
      day_number: 2,
      day_date: '2026-10-23',
      closed_at: null,
    }

    const entriesForDay2 = [
      { type: 'pride' as const },
      { type: 'pride' as const },
      { type: 'gratitude' as const },
      { type: 'gratitude' as const },
    ]

    const res = evaluateDayClosing(
      day2,
      entriesForDay2,
      userLevel,
      [day1Closed, day2],
      todayStr
    )

    // Закрытие второго дня за те же сутки блокируется!
    assert.equal(res.canClose, false)
    assert.equal(res.reason, 'daily_limit_reached')
    assert.match(res.message || '', /Максимум 1 день закрывается за одни календарные сутки/)

    // А на следующий день (2026-10-24) — этот же день закрывается без проблем
    const resTomorrow = evaluateDayClosing(
      day2,
      entriesForDay2,
      userLevel,
      [day1Closed, day2],
      '2026-10-24'
    )
    assert.equal(resTomorrow.canClose, true)
  })
})

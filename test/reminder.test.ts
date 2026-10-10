import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateReminder } from '../lib/ogonek/reminder-logic.ts'
import type { StreakState } from '../lib/ogonek/streak.ts'

describe('Telegram Reminder Decision Logic', () => {
  it('does not send reminder if entry is already recorded today', () => {
    const streakState: StreakState = {
      streak: 10,
      best: 10,
      lastEntryDay: '2026-10-10',
      missedRun: 0,
      status: 'safe',
      deadline: new Date('2026-10-14T20:59:59Z'),
      hoursLeft: 96,
      filledDays: [],
    }
    const now = new Date('2026-10-10T15:00:00Z') // Chisinau: 2026-10-10
    const decision = evaluateReminder(streakState, now)

    assert.equal(decision.send, false)
    assert.equal(decision.type, 'none')
    assert.match(decision.reason, /уже добавлена/)
  })

  it('triggers urgent reminder during grace period when <= 24 hours left', () => {
    const streakState: StreakState = {
      streak: 5,
      best: 10,
      lastEntryDay: '2026-10-06',
      missedRun: 3,
      status: 'grace',
      deadline: new Date('2026-10-10T20:59:59Z'),
      hoursLeft: 8,
      filledDays: ['2026-10-07', '2026-10-08', '2026-10-09'],
    }
    const now = new Date('2026-10-10T13:00:00Z')
    const decision = evaluateReminder(streakState, now)

    assert.equal(decision.send, true)
    assert.equal(decision.type, 'urgent_grace')
    assert.ok(decision.message?.includes('Осталось 8 ч.'))
  })

  it('triggers burned recovery notification when streak has expired', () => {
    const streakState: StreakState = {
      streak: 0,
      best: 15,
      lastEntryDay: '2026-10-01',
      missedRun: 8,
      status: 'burned',
      deadline: null,
      hoursLeft: null,
      filledDays: [],
    }
    const now = new Date('2026-10-10T12:00:00Z')
    const decision = evaluateReminder(streakState, now)

    assert.equal(decision.send, true)
    assert.equal(decision.type, 'burned_recovery')
    assert.ok(decision.message?.includes('Огонёк ждёт тебя!'))
  })

  it('skips daytime reminder when status is safe and hour is before 20:00', () => {
    const streakState: StreakState = {
      streak: 4,
      best: 12,
      lastEntryDay: '2026-10-09', // Yesterday
      missedRun: 1,
      status: 'safe',
      deadline: new Date('2026-10-13T20:59:59Z'),
      hoursLeft: 72,
      filledDays: [],
    }
    // 14:00 Chisinau (11:00 UTC)
    const now = new Date('2026-10-10T11:00:00Z')
    const decision = evaluateReminder(streakState, now)

    assert.equal(decision.send, false)
    assert.equal(decision.type, 'none')
  })

  it('triggers evening nudge when status is safe and hour is >= 20:00 in Chisinau', () => {
    const streakState: StreakState = {
      streak: 4,
      best: 12,
      lastEntryDay: '2026-10-09', // Yesterday
      missedRun: 1,
      status: 'safe',
      deadline: new Date('2026-10-13T20:59:59Z'),
      hoursLeft: 72,
      filledDays: [],
    }
    // 21:00 Chisinau (18:00 UTC in EEST)
    const now = new Date('2026-10-10T18:30:00Z')
    const decision = evaluateReminder(streakState, now)

    assert.equal(decision.send, true)
    assert.equal(decision.type, 'evening_nudge')
    assert.ok(decision.message?.includes('Добрый вечер'))
  })
})

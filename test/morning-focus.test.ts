import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyStepStatus,
  computeCompletionPercent,
  computeFocusFlame,
  countFulfilledSteps,
  createMorningFocusRecord,
  finalizeEveningReview,
  migrateIntentionsToHistory,
  sanitizeMorningFocusHistory,
} from '../lib/ogonek/morning-focus.ts'
import type { MorningFocusRecord, MorningFocusStepStatus } from '../lib/ogonek/types.ts'

const FOCUS: [string, string, string] = ['Позвонить инвестору', 'Пробежка 10 км', 'Разобрать бэклог']

function record(
  dateKey: string,
  steps: [MorningFocusStepStatus, MorningFocusStepStatus, MorningFocusStepStatus],
  reviewed = true
): MorningFocusRecord {
  return {
    dateKey,
    focus: FOCUS,
    steps,
    createdAtISO: `${dateKey}T07:00:00.000Z`,
    reviewedAtISO: reviewed ? `${dateKey}T22:00:00.000Z` : null,
    completionPercent: computeCompletionPercent(FOCUS, steps),
  }
}

describe('Morning Focus & Focus Flame (ЭТАП 10)', () => {
  it('считает процент выполнения только по записанным обещаниям', () => {
    assert.equal(computeCompletionPercent(FOCUS, ['done', 'done', 'done']), 100)
    assert.equal(computeCompletionPercent(FOCUS, ['done', 'missed', 'done']), 67)
    assert.equal(computeCompletionPercent(FOCUS, ['done', 'pending', 'pending']), 33)
    assert.equal(computeCompletionPercent(['', '', ''], ['done', 'done', 'done']), 0)
  })

  it('не учитывает пустые шаги при расчёте процента', () => {
    const focus: [string, string, string] = ['Одно обещание', '', '']
    assert.equal(computeCompletionPercent(focus, ['done', 'missed', 'missed']), 100)
    assert.equal(computeCompletionPercent(focus, ['missed', 'done', 'done']), 0)
  })

  it('создаёт запись фокуса и сохраняет статусы при неизменном тексте', () => {
    const first = createMorningFocusRecord('2026-10-10', FOCUS)
    assert.deepEqual(first.steps, ['pending', 'pending', 'pending'])
    assert.equal(first.reviewedAtISO, null)

    const withStep = applyStepStatus(first, 0, 'done')
    const updated = createMorningFocusRecord('2026-10-10', FOCUS, withStep)
    assert.equal(updated.steps[0], 'done')
    assert.equal(updated.createdAtISO, first.createdAtISO)
  })

  it('автоматически фиксирует время сверки, когда все обещания отмечены', () => {
    let rec = createMorningFocusRecord('2026-10-11', FOCUS)
    rec = applyStepStatus(rec, 0, 'done')
    rec = applyStepStatus(rec, 1, 'done')
    assert.equal(rec.reviewedAtISO, null)
    rec = applyStepStatus(rec, 2, 'missed')
    assert.ok(rec.reviewedAtISO)
    assert.equal(rec.completionPercent, 67)
  })

  it('finalizeEveningReview помечает неотмеченные шаги как невыполненные', () => {
    let rec = createMorningFocusRecord('2026-10-12', FOCUS)
    rec = applyStepStatus(rec, 0, 'done')
    const finalized = finalizeEveningReview(rec)
    assert.deepEqual(finalized.steps, ['done', 'missed', 'missed'])
    assert.equal(finalized.completionPercent, 33)
    assert.ok(finalized.reviewedAtISO)
  })

  it('собирает статистику огонька и текущую серию', () => {
    const history: Record<string, MorningFocusRecord> = {
      '2026-10-08': record('2026-10-08', ['done', 'done', 'done']),
      '2026-10-09': record('2026-10-09', ['done', 'done', 'missed']),
      '2026-10-10': record('2026-10-10', ['missed', 'missed', 'missed']),
      '2026-10-11': record('2026-10-11', ['done', 'done', 'done']),
      '2026-10-12': record('2026-10-12', ['done', 'done', 'done']),
    }
    const stats = computeFocusFlame(history, '2026-10-13')
    // 11 и 12 подряд сдержаны, сегодня ещё не закрыт — серия не рвётся
    assert.equal(stats.currentStreak, 2)
    assert.equal(stats.bestStreak, 2)
    assert.equal(stats.reviewedDays, 5)
    assert.equal(stats.totalFulfilled, 3 + 2 + 0 + 3 + 3)
    assert.equal(stats.totalPromises, 15)
  })

  it('не завершённый сегодняшний день не обрывает серию', () => {
    const history: Record<string, MorningFocusRecord> = {
      '2026-10-13': record('2026-10-13', ['done', 'done', 'done']),
      '2026-10-14': record('2026-10-14', ['pending', 'pending', 'pending'], false),
    }
    const stats = computeFocusFlame(history, '2026-10-14')
    assert.equal(stats.currentStreak, 1)
    assert.equal(stats.todayReviewed, false)
    assert.equal(stats.todayActive, 3)
  })

  it('валидирует историю из хранилища и восстанавливает процент', () => {
    const sanitized = sanitizeMorningFocusHistory({
      '2026-10-09': {
        focus: FOCUS,
        steps: ['done', 'bogus', 'missed'],
        completionPercent: 999,
      },
      bad: { focus: FOCUS },
    })
    assert.equal(Object.keys(sanitized).length, 1)
    const rec = sanitized['2026-10-09']
    assert.deepEqual(rec.steps, ['done', 'pending', 'missed'])
    assert.equal(rec.completionPercent, 33)
  })

  it('мигрирует старые morningIntentions в историю фокусов', () => {
    const history = migrateIntentionsToHistory({
      '2026-10-01': FOCUS,
      '2026-10-02': ['', '', ''],
    })
    assert.equal(Object.keys(history).length, 1)
    assert.deepEqual(history['2026-10-01'].steps, ['pending', 'pending', 'pending'])
    assert.equal(history['2026-10-01'].reviewedAtISO, null)
  })

  it('countFulfilledSteps считает только выполненные шаги', () => {
    assert.equal(countFulfilledSteps(['done', 'missed', 'done']), 2)
    assert.equal(countFulfilledSteps(['pending', 'pending', 'pending']), 0)
  })
})

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeStreak,
  toLocalDay,
  addDaysToLocalDay,
  daysBetweenLocalDays,
  getEndOfDayInTz,
  GRACE_DAYS,
  TZ,
} from '../lib/ogonek/streak.ts'

describe('Streak Calculation & Bridge Engine (Europe/Chisinau)', () => {
  // 1. Empty history
  it('1. returns 0 streak and burned status for empty entries', () => {
    const res = computeStreak(new Set(), new Date('2026-10-10T12:00:00Z'))
    assert.equal(res.streak, 0)
    assert.equal(res.best, 0)
    assert.equal(res.status, 'burned')
    assert.equal(res.lastEntryDay, null)
    assert.equal(res.deadline, null)
    assert.deepEqual(res.filledDays, [])
  })

  // 2. Single entry today
  it('2. returns streak 1 and safe status when entry is today', () => {
    const now = new Date('2026-10-10T12:00:00Z')
    const today = toLocalDay(now, TZ)
    const res = computeStreak(new Set([today]), now)
    assert.equal(res.streak, 1)
    assert.equal(res.best, 1)
    assert.equal(res.status, 'safe')
    assert.equal(res.lastEntryDay, today)
    assert.equal(res.missedRun, 0)
    assert.ok(res.hoursLeft && res.hoursLeft > 0)
  })

  // 3. Single entry yesterday (grace day 1)
  it('3. returns streak 1 and grace status when last entry was yesterday', () => {
    const now = new Date('2026-10-10T12:00:00Z') // Chisinau: 2026-10-10
    const yesterday = '2026-10-09'
    const res = computeStreak(new Set([yesterday]), now)
    assert.equal(res.streak, 1)
    assert.equal(res.status, 'grace')
    assert.equal(res.missedRun, 1)
    assert.equal(res.lastEntryDay, yesterday)
  })

  // 4. Single entry 2 days ago (grace day 2)
  it('4. returns streak 1 and grace status when last entry was 2 days ago', () => {
    const now = new Date('2026-10-10T12:00:00Z')
    const res = computeStreak(new Set(['2026-10-08']), now)
    assert.equal(res.streak, 1)
    assert.equal(res.status, 'grace')
    assert.equal(res.missedRun, 2)
  })

  // 5. Single entry 3 days ago (grace day 3)
  it('5. returns streak 1 and grace status on 3rd missed day', () => {
    const now = new Date('2026-10-10T12:00:00Z')
    const res = computeStreak(new Set(['2026-10-07']), now)
    assert.equal(res.streak, 1)
    assert.equal(res.status, 'grace')
    assert.equal(res.missedRun, 3)
  })

  // 6. Within deadline on 4th day before 23:59:59 Chisinau
  it('6. retains grace on deadline day before midnight in Chisinau', () => {
    // Last entry: 2026-10-06. Deadline is 2026-10-06 + 4 days = 2026-10-10 23:59:59 Chisinau (EEST is UTC+3 -> 20:59:59 UTC)
    const now = new Date('2026-10-10T20:50:00Z') // 23:50 in Chisinau
    const res = computeStreak(new Set(['2026-10-06']), now)
    assert.equal(res.streak, 1)
    assert.equal(res.status, 'grace')
    assert.ok(res.hoursLeft !== null && res.hoursLeft >= 0)
  })

  // 7. Expired after deadline (burned)
  it('7. burns streak when now is past deadline (past 23:59:59 on 4th day)', () => {
    // 2026-10-10 21:05:00 UTC is 2026-10-11 00:05:00 Chisinau time
    const now = new Date('2026-10-10T21:05:00Z')
    const res = computeStreak(new Set(['2026-10-06']), now)
    assert.equal(res.streak, 0)
    assert.equal(res.best, 1)
    assert.equal(res.status, 'burned')
    assert.equal(res.deadline, null)
  })

  // 8. Daily consecutive entries (3 days)
  it('8. computes consecutive daily entries correctly', () => {
    const now = new Date('2026-10-10T12:00:00Z')
    const days = new Set(['2026-10-08', '2026-10-09', '2026-10-10'])
    const res = computeStreak(days, now)
    assert.equal(res.streak, 3)
    assert.equal(res.best, 3)
    assert.equal(res.status, 'safe')
  })

  // 9. Daily consecutive entries (10 days)
  it('9. calculates 10 continuous consecutive days', () => {
    const days = new Set<string>()
    for (let i = 1; i <= 10; i++) {
      const d = String(i).padStart(2, '0')
      days.add(`2026-05-${d}`)
    }
    const now = new Date('2026-05-10T15:00:00Z')
    const res = computeStreak(days, now)
    assert.equal(res.streak, 10)
    assert.equal(res.best, 10)
    assert.equal(res.status, 'safe')
  })

  // 10. 1 missed day bridged
  it('10. bridges 1 missed day without breaking streak', () => {
    // Day 1: 2026-10-01, Day 3: 2026-10-03 (missed Oct 2)
    const days = new Set(['2026-10-01', '2026-10-03'])
    const now = new Date('2026-10-03T12:00:00Z')
    const res = computeStreak(days, now)
    assert.equal(res.streak, 3) // 1 + bridged(1) + 1 = 3
    assert.equal(res.best, 3)
    assert.deepEqual(res.filledDays, ['2026-10-02'])
  })

  // 11. 2 missed days bridged
  it('11. bridges 2 missed days', () => {
    // Day 1: 2026-10-01, Day 4: 2026-10-04 (missed Oct 2, Oct 3)
    const days = new Set(['2026-10-01', '2026-10-04'])
    const now = new Date('2026-10-04T12:00:00Z')
    const res = computeStreak(days, now)
    assert.equal(res.streak, 4)
    assert.deepEqual(res.filledDays, ['2026-10-02', '2026-10-03'])
  })

  // 12. 3 missed days bridged (maximum grace)
  it('12. bridges maximum 3 missed days', () => {
    // Day 1: 2026-10-01, Day 5: 2026-10-05 (missed Oct 2, 3, 4)
    const days = new Set(['2026-10-01', '2026-10-05'])
    const now = new Date('2026-10-05T12:00:00Z')
    const res = computeStreak(days, now)
    assert.equal(res.streak, 5)
    assert.deepEqual(res.filledDays, ['2026-10-02', '2026-10-03', '2026-10-04'])
  })

  // 13. 4 missed days breaks historical streak
  it('13. resets streak to 1 when gap is 4 missed days (diff = 5)', () => {
    // Day 1: 2026-10-01, Day 6: 2026-10-06 (diff = 5 > GRACE_DAYS + 1)
    const days = new Set(['2026-10-01', '2026-10-06'])
    const now = new Date('2026-10-06T12:00:00Z')
    const res = computeStreak(days, now)
    assert.equal(res.streak, 1)
    assert.equal(res.best, 1)
  })

  // 14. Best streak is preserved across resets
  it('14. preserves best streak forever after active streak is broken', () => {
    // 5-day continuous streak in September, then broken, then 2 days in October
    const days = new Set([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      // Gap > grace
      '2026-10-01',
      '2026-10-02',
    ])
    const now = new Date('2026-10-02T12:00:00Z')
    const res = computeStreak(days, now)
    assert.equal(res.streak, 2)
    assert.equal(res.best, 5)
  })

  // 15. Midnight edge in Chisinau
  it('15. correctly respects midnight boundary in Chisinau', () => {
    // 2026-10-10: In EEST (UTC+3), 20:59:59 UTC is 23:59:59 on Oct 10
    const beforeMidnight = new Date('2026-10-10T20:59:59Z')
    // 21:00:00 UTC is 00:00:00 on Oct 11 in Chisinau
    const afterMidnight = new Date('2026-10-10T21:00:00Z')

    assert.equal(toLocalDay(beforeMidnight, TZ), '2026-10-10')
    assert.equal(toLocalDay(afterMidnight, TZ), '2026-10-11')
  })

  // 16. DST Spring change (late March in Chisinau: UTC+2 -> UTC+3)
  it('16. handles DST Spring change across late March smoothly', () => {
    // In 2026, Chisinau DST starts on March 29 (clocks jump 02:00 -> 03:00)
    const mar28 = '2026-03-28'
    const mar29 = '2026-03-29'
    const mar30 = '2026-03-30'

    assert.equal(daysBetweenLocalDays(mar28, mar29), 1)
    assert.equal(daysBetweenLocalDays(mar29, mar30), 1)

    const now = new Date('2026-03-30T10:00:00Z')
    const res = computeStreak(new Set([mar28, mar29, mar30]), now)
    assert.equal(res.streak, 3)
    assert.equal(res.best, 3)
    assert.equal(res.status, 'safe')
  })

  // 17. DST Autumn change (late October in Chisinau: UTC+3 -> UTC+2)
  it('17. handles DST Autumn change across late October smoothly', () => {
    // In 2026, Chisinau DST ends on October 25 (clocks fall back 04:00 -> 03:00)
    const oct24 = '2026-10-24'
    const oct25 = '2026-10-25'
    const oct26 = '2026-10-26'

    assert.equal(daysBetweenLocalDays(oct24, oct25), 1)
    assert.equal(daysBetweenLocalDays(oct25, oct26), 1)

    const now = new Date('2026-10-26T10:00:00Z')
    const res = computeStreak(new Set([oct24, oct25, oct26]), now)
    assert.equal(res.streak, 3)
    assert.equal(res.best, 3)
    assert.equal(res.status, 'safe')
  })

  // 18. Month and Leap Year boundaries
  it('18. handles Leap year (Feb 28 to Feb 29 to Mar 01) accurately', () => {
    // 2024 is a leap year
    const feb28 = '2024-02-28'
    const feb29 = addDaysToLocalDay(feb28, 1, TZ)
    assert.equal(feb29, '2024-02-29')

    const mar01 = addDaysToLocalDay(feb29, 1, TZ)
    assert.equal(mar01, '2024-03-01')

    assert.equal(daysBetweenLocalDays(feb28, mar01), 2)
  })

  // 19. Duplicate entries deduplication
  it('19. ignores duplicate day entries without inflating streak', () => {
    const now = new Date('2026-10-10T12:00:00Z')
    const set = new Set(['2026-10-09', '2026-10-09', '2026-10-10', '2026-10-10'])
    const res = computeStreak(set, now)
    assert.equal(res.streak, 2)
    assert.equal(res.best, 2)
  })

  // 20. Out of order entries
  it('20. sorts unordered entries correctly', () => {
    const now = new Date('2026-10-10T12:00:00Z')
    const set = new Set(['2026-10-10', '2026-10-08', '2026-10-09'])
    const res = computeStreak(set, now)
    assert.equal(res.streak, 3)
    assert.equal(res.best, 3)
  })

  // 21. getEndOfDayInTz returns correct millisecond in Chisinau
  it('21. computes exact end of day for Chisinau', () => {
    const endOfDay = getEndOfDayInTz('2026-10-10', TZ)
    // In Chisinau (UTC+3 in October), 23:59:59.999 is 20:59:59.999 UTC
    assert.equal(endOfDay.toISOString(), '2026-10-10T20:59:59.999Z')
  })

  // 22. Active grace bridge filledDays calculation during ongoing gap
  it('22. populates filledDays for ongoing gap while under grace', () => {
    // Last entry was 2026-10-07. Today is 2026-10-10 (3 days later)
    const now = new Date('2026-10-10T12:00:00Z')
    const res = computeStreak(new Set(['2026-10-07']), now)
    assert.equal(res.status, 'grace')
    assert.deepEqual(res.filledDays, ['2026-10-08', '2026-10-09'])
  })
})

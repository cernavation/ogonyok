export const GRACE_DAYS = 3
export const TZ = 'Europe/Chisinau'

export type StreakStatus = 'safe' | 'grace' | 'burned'

export type StreakState = {
  streak: number // длина цепочки в календарных днях, с учётом мостов
  best: number
  lastEntryDay: string | null // 'YYYY-MM-DD' в TZ
  missedRun: number // подряд пропущенных дней после последней записи
  status: StreakStatus
  deadline: Date | null // конец дня (lastEntryDay + GRACE_DAYS + 1) по TZ
  hoursLeft: number | null // Math.ceil((deadline - now) / 3_600_000)
  filledDays: string[] // дни-маркеры `missed`, удерживающие цепочку
}

export function toLocalDay(date: Date, tz = TZ): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return dtf.format(date)
}

export function addDaysToLocalDay(dayStr: string, deltaDays: number, tz = TZ): string {
  const [y, m, d] = dayStr.split('-').map(Number)
  const utcDate = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0))
  return toLocalDay(utcDate, tz)
}

export function daysBetweenLocalDays(fromDayStr: string, toDayStr: string): number {
  const [y1, m1, d1] = fromDayStr.split('-').map(Number)
  const [y2, m2, d2] = toDayStr.split('-').map(Number)
  const t1 = Date.UTC(y1, m1 - 1, d1, 12, 0, 0)
  const t2 = Date.UTC(y2, m2 - 1, d2, 12, 0, 0)
  return Math.round((t2 - t1) / 86_400_000)
}

export function getEndOfDayInTz(dayStr: string, tz = TZ): Date {
  const [y, m, d] = dayStr.split('-').map(Number)
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  })
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const hour = parseInt(dtf.format(noon), 10)
  const offsetHours = hour - 12
  return new Date(Date.UTC(y, m - 1, d, 23 - offsetHours, 59, 59, 999))
}

export function computeStreak(
  entryDays: ReadonlySet<string>,
  now: Date
): StreakState {
  const sortedDays = Array.from(entryDays)
    .filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()

  if (sortedDays.length === 0) {
    return {
      streak: 0,
      best: 0,
      lastEntryDay: null,
      missedRun: 0,
      status: 'burned',
      deadline: null,
      hoursLeft: null,
      filledDays: [],
    }
  }

  let best = 1
  let chainStreak = 1
  const activeFilled: string[] = []
  let lastDay = sortedDays[0]

  for (let i = 1; i < sortedDays.length; i++) {
    const day = sortedDays[i]
    const diff = daysBetweenLocalDays(lastDay, day)

    if (diff <= 0) continue

    if (diff === 1) {
      chainStreak++
      lastDay = day
    } else if (diff <= GRACE_DAYS + 1) {
      // 1, 2, or 3 missed days bridged
      for (let k = 1; k < diff; k++) {
        const bridge = addDaysToLocalDay(lastDay, k, TZ)
        activeFilled.push(bridge)
      }
      chainStreak += diff
      lastDay = day
    } else {
      // Burned historical chain
      chainStreak = 1
      activeFilled.length = 0
      lastDay = day
    }

    if (chainStreak > best) {
      best = chainStreak
    }
  }

  const today = toLocalDay(now, TZ)
  const lastEntryDay = sortedDays[sortedDays.length - 1]
  const diffToday = daysBetweenLocalDays(lastEntryDay, today)
  const deadlineDay = addDaysToLocalDay(lastEntryDay, GRACE_DAYS + 1, TZ)
  const deadline = getEndOfDayInTz(deadlineDay, TZ)
  const isBurned = now.getTime() > deadline.getTime()

  if (isBurned) {
    return {
      streak: 0,
      best,
      lastEntryDay,
      missedRun: Math.max(0, diffToday),
      status: 'burned',
      deadline: null,
      hoursLeft: null,
      filledDays: [],
    }
  }

  const status: StreakStatus = diffToday <= 0 ? 'safe' : 'grace'
  const hoursLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 3_600_000))

  const currentFilled = [...activeFilled]
  if (diffToday > 1) {
    for (let k = 1; k < diffToday; k++) {
      currentFilled.push(addDaysToLocalDay(lastEntryDay, k, TZ))
    }
  }

  return {
    streak: chainStreak,
    best,
    lastEntryDay,
    missedRun: Math.max(0, diffToday),
    status,
    deadline,
    hoursLeft,
    filledDays: currentFilled,
  }
}

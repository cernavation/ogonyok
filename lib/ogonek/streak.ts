import type { StreakSettings } from './types'
export { calculateStreak } from './diary-engine.ts'

export const GRACE_DAYS = 3
export const TZ = 'Europe/Chisinau'

/** Минуты в сутках — верхняя граница времени дедлайна (23:59) */
export const DEADLINE_MINUTES_MAX = 23 * 60 + 59
export const DEADLINE_MINUTES_MIN = 0

/** Время ночного дедлайна по умолчанию — конец дня (23:59) */
export const DEFAULT_DEADLINE_MINUTES = DEADLINE_MINUTES_MAX

/** Прежний дефолт: конец дня 23:59 по Чисинау */
export const DEFAULT_STREAK_SETTINGS: StreakSettings = {
  deadlineMinutes: DEFAULT_DEADLINE_MINUTES,
  timeZone: TZ,
  weekendBonus: false,
  updatedAtISO: '2026-10-01T00:00:00.000Z',
}

/** Быстрые пресеты времени дедлайна (минуты от полуночи) */
export const STREAK_DEADLINE_PRESETS: { minutes: number; label: string; hint: string }[] = [
  { minutes: 21 * 60, label: '21:00', hint: 'Ранний вечер — успеть до сна' },
  { minutes: 22 * 60, label: '22:00', hint: 'Спокойный вечер для подведения итогов' },
  { minutes: 22 * 60 + 30, label: '22:30', hint: 'Полуночный запас' },
  { minutes: 23 * 60, label: '23:00', hint: 'Почти конец дня' },
  { minutes: 23 * 60 + 30, label: '23:30', hint: 'Поздний вечер' },
  { minutes: DEADLINE_MINUTES_MAX, label: '23:59', hint: 'Классический конец дня' },
]

/** Часовые пояса, доступные для расчёта дедлайна */
export const STREAK_TIMEZONES: { id: string; label: string }[] = [
  { id: 'Europe/Chisinau', label: 'Кишинёв (UTC+2/+3)' },
  { id: 'Europe/Kyiv', label: 'Киев (UTC+2/+3)' },
  { id: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { id: 'Europe/Berlin', label: 'Берлин (UTC+1/+2)' },
  { id: 'Europe/London', label: 'Лондон (UTC+0/+1)' },
  { id: 'Asia/Tbilisi', label: 'Тбилиси (UTC+4)' },
  { id: 'Asia/Almaty', label: 'Алматы (UTC+5)' },
  { id: 'America/New_York', label: 'Нью-Йорк (UTC-5/-4)' },
  { id: 'UTC', label: 'UTC (Всемирное время)' },
]

export type StreakStatus = 'safe' | 'grace' | 'burned'

/** Дополнительные опции расчёта стрика (дедлайн и часовой пояс) */
export type StreakOptions = {
  tz?: string
  /** Время дедлайна в минутах от полуночи (0..1439) */
  deadlineMinutes?: number
  /** Прибавить один день прощения, если дедлайн попал на выходные */
  weekendBonus?: boolean
}

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

/**
 * Момент ночного дедлайна в заданном часовом поясе.
 * `minutes` — время от полуночи (0..1439) уже внутри дня дедлайна.
 * При значении по умолчанию (23:59) результат совпадает с концом дня.
 */
export function getDeadlineInTz(
  dayStr: string,
  minutes = DEFAULT_DEADLINE_MINUTES,
  tz = TZ
): Date {
  const [y, m, d] = dayStr.split('-').map(Number)
  const clamped = Math.max(DEADLINE_MINUTES_MIN, Math.min(DEADLINE_MINUTES_MAX, Math.round(minutes)))
  const hour = Math.floor(clamped / 60)
  const minute = clamped % 60

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  })
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const offsetHours = parseInt(dtf.format(noon), 10) - 12
  return new Date(Date.UTC(y, m - 1, d, hour - offsetHours, minute, 59, 999))
}

/** «23:59» из минут от полуночи */
export function formatDeadlineLabel(minutes: number): string {
  const clamped = Math.max(DEADLINE_MINUTES_MIN, Math.min(DEADLINE_MINUTES_MAX, Math.round(minutes)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Значение для <input type="time"> (HH:MM) из минут */
export function minutesToTimeValue(minutes: number): string {
  return formatDeadlineLabel(minutes)
}

/** Минуты от полуночи из «HH:MM» либо null при некорректном вводе */
export function timeValueToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  return h * 60 + m
}

/** Безопасно валидирует настройки дедлайна стрика из хранилища */
export function sanitizeStreakSettings(value: unknown): StreakSettings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_STREAK_SETTINGS }
  const v = value as Partial<StreakSettings>
  const rawMinutes =
    typeof v.deadlineMinutes === 'number' && Number.isFinite(v.deadlineMinutes)
      ? v.deadlineMinutes
      : DEFAULT_STREAK_SETTINGS.deadlineMinutes
  const knownTz = STREAK_TIMEZONES.some((t) => t.id === v.timeZone)
  const timeZone =
    typeof v.timeZone === 'string' && (knownTz || isValidTimeZone(v.timeZone))
      ? v.timeZone
      : DEFAULT_STREAK_SETTINGS.timeZone
  return {
    deadlineMinutes: Math.max(DEADLINE_MINUTES_MIN, Math.min(DEADLINE_MINUTES_MAX, Math.round(rawMinutes))),
    timeZone,
    weekendBonus: typeof v.weekendBonus === 'boolean' ? v.weekendBonus : false,
    updatedAtISO:
      typeof v.updatedAtISO === 'string' && v.updatedAtISO
        ? v.updatedAtISO
        : DEFAULT_STREAK_SETTINGS.updatedAtISO,
  }
}

/** Проверяет, что браузер знает такой IANA-часовой пояс */
export function isValidTimeZone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** Текущее смещение часового пояса относительно UTC в виде «UTC+3» */
export function timeZoneOffsetLabel(tz: string, at: Date = new Date()): string {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
    const part = dtf.formatToParts(at).find((p) => p.type === 'timeZoneName')
    return part?.value?.replace('GMT', 'UTC') ?? 'UTC'
  } catch {
    return 'UTC'
  }
}

export function computeStreak(
  entryDays: ReadonlySet<string>,
  now: Date,
  options: StreakOptions = {}
): StreakState {
  const tz = options.tz && isValidTimeZone(options.tz) ? options.tz : TZ
  const deadlineMinutes =
    typeof options.deadlineMinutes === 'number'
      ? Math.max(DEADLINE_MINUTES_MIN, Math.min(DEADLINE_MINUTES_MAX, Math.round(options.deadlineMinutes)))
      : DEFAULT_DEADLINE_MINUTES
  const graceDays = GRACE_DAYS + (options.weekendBonus ? 1 : 0)

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
    } else if (diff <= graceDays + 1) {
      // 1..graceDays missed days bridged
      for (let k = 1; k < diff; k++) {
        const bridge = addDaysToLocalDay(lastDay, k, tz)
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

  const today = toLocalDay(now, tz)
  const lastEntryDay = sortedDays[sortedDays.length - 1]
  const diffToday = daysBetweenLocalDays(lastEntryDay, today)
  const deadlineDay = addDaysToLocalDay(lastEntryDay, graceDays + 1, tz)
  const deadline = getDeadlineInTz(deadlineDay, deadlineMinutes, tz)
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
      currentFilled.push(addDaysToLocalDay(lastEntryDay, k, tz))
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

/**
 * ОГОНЁК · ДВИЖОК ДНЕЙ И СТРИКА (PRODUCT_SPEC.md, Правила 1–6)
 * 
 * Единый источник истины для бизнес-логики дневника:
 * 1. Уровень сложности: 1..5 гордостей И благодарностей в день.
 * 2. Смена уровня: не чаще 1 раза в 30 дней.
 * 3. Огонёк НИКОГДА не сбрасывается. Стрик = количество закрытых дней дневника.
 * 4. Запись всегда идёт в первый незакрытый день после последнего закрытого (независимо от календаря).
 * 5. День закрывается при наборе нормы (N гордостей И N благодарностей). Лимит: максимум 1 закрытый день за календарные сутки.
 * 6. Прошлые дни доступны для открытия и редактирования.
 */

export const LEVEL_MIN = 1
export const LEVEL_MAX = 5
export const DEFAULT_LEVEL = 3
export const LEVEL_COOLDOWN_DAYS = 30

export type EntryType = 'pride' | 'gratitude'

export interface DiaryDayRecord {
  id: string
  user_id: string
  day_number: number
  day_date: string // 'YYYY-MM-DD'
  closed_at: string | null // ISO string or null
}

export interface DiaryEntryRecord {
  id: string
  day_id: string
  user_id: string
  type: EntryType
  text: string
  score?: number | null
  ai_comment?: string | null
  created_at: string
}

/**
 * ПРАВИЛО 1 & 2: Проверка возможности смены уровня сложности (раз в 30 дней)
 */
export function canChangeLevel(
  levelChangedAtISO: string | null | undefined,
  now: Date = new Date()
): { allowed: boolean; daysLeft: number; nextChangeDate: Date | null } {
  if (!levelChangedAtISO) {
    return { allowed: true, daysLeft: 0, nextChangeDate: null }
  }

  const changedDate = new Date(levelChangedAtISO)
  if (isNaN(changedDate.getTime())) {
    return { allowed: true, daysLeft: 0, nextChangeDate: null }
  }

  const cooldownMs = LEVEL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  const allowedAfterMs = changedDate.getTime() + cooldownMs
  const nowMs = now.getTime()

  if (nowMs >= allowedAfterMs) {
    return { allowed: true, daysLeft: 0, nextChangeDate: null }
  }

  const diffMs = allowedAfterMs - nowMs
  const daysLeft = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
  return {
    allowed: false,
    daysLeft,
    nextChangeDate: new Date(allowedAfterMs),
  }
}

/**
 * ПРАВИЛО 3: Расчёт стрика.
 * Огонёк НИКОГДА не сбрасывается. Стрик = количество закрытых дней дневника.
 * Единый источник истины для всех экранов приложения:
 * Правая колонка, Профиль, Статистика, Рейтинг, Сторис, Чаты.
 * Пропуск календарных дней ничего не ломает.
 */
export function calculateStreak(
  days: ReadonlyArray<any>
): number {
  if (!Array.isArray(days) || days.length === 0) return 0
  let closedCount = 0
  for (const day of days) {
    if (!day || typeof day !== 'object') continue

    // 1. Если это запись базы Supabase с полем closed_at
    if ('closed_at' in day) {
      if (day.closed_at) closedCount += 1
      continue
    }

    // 2. Если это локальный объект Day из хранилища
    if (day.status !== 'missed') {
      const hasPrides = Array.isArray(day.prides) && day.prides.length > 0 && day.prides.some((p: any) => {
        const text = typeof p === 'string' ? p : p?.text
        return text && text.trim().length > 0
      })
      const hasGratitudes = Array.isArray(day.gratitudes) && day.gratitudes.length > 0 && day.gratitudes.some((g: any) => {
        const text = typeof g === 'string' ? g : g?.text
        return text && text.trim().length > 0
      })
      if (hasPrides || hasGratitudes || day.closed_at || day.completed) {
        closedCount += 1
      }
    }
  }
  return closedCount
}

/**
 * ПРАВИЛО 4: Определение дня для новой записи.
 * Новая запись всегда идёт в «первый незакрытый день после последнего закрытого».
 * Пример: последний закрытый — 20-й, не писали два дня, сегодня жмём «Записать»
 * → запись попадает в 21-й день.
 */
export function getTargetDayForNewEntry(
  existingDays: ReadonlyArray<DiaryDayRecord>,
  todayCalendarDateStr: string
): {
  day_number: number
  day_date: string
  existingDayId: string | null
  isNewDay: boolean
} {
  const sorted = [...existingDays].sort((a, b) => a.day_number - b.day_number)

  // 1. Ищем первый незакрытый день среди уже существующих
  const firstUnclosed = sorted.find((d) => !d.closed_at)
  if (firstUnclosed) {
    return {
      day_number: firstUnclosed.day_number,
      day_date: firstUnclosed.day_date,
      existingDayId: firstUnclosed.id,
      isNewDay: false,
    }
  }

  // 2. Если все дни закрыты (или ещё нет дней), следующий день = (последний закрытый + 1)
  const lastClosed = sorted.length > 0 ? sorted[sorted.length - 1] : null
  const nextDayNumber = lastClosed ? lastClosed.day_number + 1 : 1

  return {
    day_number: nextDayNumber,
    day_date: todayCalendarDateStr,
    existingDayId: null,
    isNewDay: true,
  }
}

/**
 * ПРАВИЛО 5: Проверка закрытия дня.
 * День закрывается, когда набрана норма гордостей И благодарностей по уровню.
 * Чтобы нельзя было накликать десятки дней: максимум 1 новый день закрывается за
 * реальные календарные сутки (по дате closed_at).
 */
export function evaluateDayClosing(
  targetDay: DiaryDayRecord,
  entriesForDay: ReadonlyArray<{ type: EntryType }>,
  userLevel: number,
  allDaysOfUser: ReadonlyArray<DiaryDayRecord>,
  todayCalendarDateStr: string
): {
  canClose: boolean
  pridesCount: number
  gratitudesCount: number
  quotaNeeded: number
  reason?: 'already_closed' | 'quota_not_reached' | 'daily_limit_reached'
  message?: string
} {
  const level = Math.max(LEVEL_MIN, Math.min(LEVEL_MAX, Math.round(userLevel || DEFAULT_LEVEL)))

  if (targetDay.closed_at) {
    return {
      canClose: false,
      pridesCount: entriesForDay.filter((e) => e.type === 'pride').length,
      gratitudesCount: entriesForDay.filter((e) => e.type === 'gratitude').length,
      quotaNeeded: level,
      reason: 'already_closed',
      message: 'Этот день уже закрыт.',
    }
  }

  const pridesCount = entriesForDay.filter((e) => e.type === 'pride').length
  const gratitudesCount = entriesForDay.filter((e) => e.type === 'gratitude').length

  // Проверка нормы
  if (pridesCount < level || gratitudesCount < level) {
    return {
      canClose: false,
      pridesCount,
      gratitudesCount,
      quotaNeeded: level,
      reason: 'quota_not_reached',
      message: `Норма уровня ${level}: нужно ${level} гордостей (сейчас ${pridesCount}) и ${level} благодарностей (сейчас ${gratitudesCount}).`,
    }
  }

  // Проверка суточного лимита: максимум 1 закрытый день за реальные календарные сутки
  const alreadyClosedToday = allDaysOfUser.some((d) => {
    if (!d.closed_at || d.id === targetDay.id) return false
    // Проверяем дату закрытия (YYYY-MM-DD в UTC/часовом поясе)
    const closedDateStr = d.closed_at.slice(0, 10)
    return closedDateStr === todayCalendarDateStr
  })

  if (alreadyClosedToday) {
    return {
      canClose: false,
      pridesCount,
      gratitudesCount,
      quotaNeeded: level,
      reason: 'daily_limit_reached',
      message: 'Максимум 1 день закрывается за одни календарные сутки. Записи сохранены, день закроется при наступлении следующих суток.',
    }
  }

  return {
    canClose: true,
    pridesCount,
    gratitudesCount,
    quotaNeeded: level,
  }
}

/**
 * Форматирование метки дня («День #21 · 22 октября 2026»)
 */
export function formatDayLabel(dayNumber: number, dayDateStr?: string): string {
  const numStr = `День #${dayNumber}`
  if (!dayDateStr) return numStr
  try {
    const [y, m, d] = dayDateStr.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    const formatted = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date)
    return `${numStr} · ${formatted}`
  } catch {
    return numStr
  }
}

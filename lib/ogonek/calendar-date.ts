/**
 * Чистые утилиты локального календаря Priday:
 * - формат ключей дат YYYY-MM-DD без смещения часового пояса
 * - запрет и блокировка будущих дат (date > today)
 * - построение сетки месяца Пн–Вс с отметками закрытых дней
 */

export const RU_MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const

export const RU_WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getLocalTodayDateKey(now: Date = new Date()): string {
  return formatLocalDateKey(now)
}

export function getLocalYesterdayDateKey(now: Date = new Date()): string {
  const prev = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0, 0)
  return formatLocalDateKey(prev)
}

export function extractCalendarDateKey(dateInput?: string | Date | null): string | null {
  if (!dateInput) return null
  if (dateInput instanceof Date) {
    return Number.isFinite(dateInput.getTime()) ? formatLocalDateKey(dateInput) : null
  }
  if (typeof dateInput !== 'string') return null
  const trimmed = dateInput.trim()
  if (!trimmed) return null
  if (DATE_KEY_RE.test(trimmed)) return trimmed

  const parsed = new Date(trimmed)
  if (Number.isFinite(parsed.getTime())) {
    return formatLocalDateKey(parsed)
  }

  const prefix = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed)
  return prefix ? prefix[1] : null
}

/**
 * Превращает YYYY-MM-DD в безопасный ISO timestamp на 12:00 UTC,
 * чтобы `.slice(0, 10)` и локальная дата совпадали во всех часовых поясах (-11..+11).
 */
export function dateKeyToMiddayISO(dateKey: string): string {
  const match = DATE_KEY_RE.exec(dateKey.trim())
  if (!match) {
    return new Date().toISOString()
  }
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0)).toISOString()
}

export function isFutureDateKey(dateKey: string, now: Date = new Date()): boolean {
  if (!DATE_KEY_RE.test(dateKey)) return false
  return dateKey > getLocalTodayDateKey(now)
}

export function clampDateKeyToToday(
  dateKey?: string | null,
  now: Date = new Date()
): string {
  const todayKey = getLocalTodayDateKey(now)
  if (!dateKey || !DATE_KEY_RE.test(dateKey)) return todayKey
  return dateKey > todayKey ? todayKey : dateKey
}

export function clampDateISOToToday(
  dateInput?: string | null,
  now: Date = new Date()
): string {
  const todayKey = getLocalTodayDateKey(now)
  const key = extractCalendarDateKey(dateInput)
  if (!key || key > todayKey) {
    return dateKeyToMiddayISO(todayKey)
  }
  if (typeof dateInput === 'string' && DATE_KEY_RE.test(dateInput.trim())) {
    return dateKeyToMiddayISO(dateInput.trim())
  }
  return typeof dateInput === 'string' && dateInput.trim()
    ? dateInput
    : dateKeyToMiddayISO(key)
}

export function formatShortDateRuFromKey(dateKey: string, now: Date = new Date()): string {
  const todayKey = getLocalTodayDateKey(now)
  if (dateKey === todayKey) {
    const match = DATE_KEY_RE.exec(dateKey)
    if (match) {
      const dt = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
      return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    }
    return 'Сегодня'
  }
  const match = DATE_KEY_RE.exec(dateKey)
  if (!match) return 'Сегодня'
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  const dt = new Date(y, m - 1, d, 12, 0, 0)
  if (y !== now.getFullYear()) {
    return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function formatMonthTitleRu(year: number, monthIndex0: number): string {
  const name = RU_MONTH_NAMES[monthIndex0] ?? ''
  return `${name} ${year}`
}

export type CalendarDayCell = {
  dateKey: string
  dayNumber: number
  isSelected: boolean
  isToday: boolean
  isClosed: boolean
  isFuture: boolean
}

export function buildCalendarMonthGrid(
  year: number,
  monthIndex0: number,
  options: {
    todayKey: string
    selectedKey: string
    closedDayKeys: ReadonlySet<string>
  }
): Array<CalendarDayCell | null> {
  const firstDayOfMonth = new Date(year, monthIndex0, 1, 12, 0, 0)
  // JS getDay(): 0 = Sun..6 = Sat -> convert to Monday-first 0 = Mon..6 = Sun
  const mondayFirstOffset = (firstDayOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate()

  const cells: Array<CalendarDayCell | null> = []
  for (let i = 0; i < mondayFirstOffset; i++) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isFuture = dateKey > options.todayKey
    cells.push({
      dateKey,
      dayNumber: day,
      isSelected: dateKey === options.selectedKey,
      isToday: dateKey === options.todayKey,
      isClosed: !isFuture && options.closedDayKeys.has(dateKey),
      isFuture,
    })
  }

  return cells
}

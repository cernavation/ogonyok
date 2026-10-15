/**
 * ЭТАП 10 — УТРЕННИЙ ФОКУС, ОГОНЁК ФОКУСА И ВЕЧЕРНЯЯ СВЕРКА.
 *
 * Чистый модуль без DOM: используется и хранилищем (валидация истории
 * утренних фокусов), и интерфейсом (огонёк-счётчик, вечерняя сверка,
 * автоматический расчёт процента выполнения обещаний).
 */

import type {
  MorningFocusRecord,
  MorningFocusStepStatus,
} from './types.ts'
import { addDaysToLocalDay, daysBetweenLocalDays } from './streak.ts'

/** Подписи трёх шагов дня — единый источник для UI */
export const MORNING_FOCUS_STEP_LABELS = [
  'Главный шаг',
  'Для себя',
  'Если останется время',
] as const

export const MORNING_FOCUS_PLACEHOLDERS = MORNING_FOCUS_STEP_LABELS

/** День считается «сдержанным», если выполнено не меньше половины обещаний */
export const FOCUS_KEEP_THRESHOLD = 50

/** Новый набор из трёх шагов — все «ещё не сверено» */
export const EMPTY_MORNING_STEPS: [
  MorningFocusStepStatus,
  MorningFocusStepStatus,
  MorningFocusStepStatus,
] = ['pending', 'pending', 'pending']

export function isMorningFocusStepStatus(value: unknown): value is MorningFocusStepStatus {
  return value === 'pending' || value === 'done' || value === 'missed'
}

/** Безопасно восстанавливает три статуса шагов из произвольного массива */
export function sanitizeMorningFocusSteps(
  value: unknown
): [MorningFocusStepStatus, MorningFocusStepStatus, MorningFocusStepStatus] {
  const arr = Array.isArray(value) ? value : []
  return [0, 1, 2].map((i) =>
    isMorningFocusStepStatus(arr[i]) ? (arr[i] as MorningFocusStepStatus) : 'pending'
  ) as [MorningFocusStepStatus, MorningFocusStepStatus, MorningFocusStepStatus]
}

/** Индексы шагов, в которых утром было записано непустое обещание */
export function activeFocusIndexes(focus: [string, string, string]): number[] {
  return [0, 1, 2].filter((i) => typeof focus[i] === 'string' && focus[i].trim().length > 0)
}

/** Сколько обещаний реально было записано утром (0..3) */
export function countActiveFocusSteps(focus: [string, string, string]): number {
  return activeFocusIndexes(focus).length
}

/** Сколько обещаний отмечено как «Выполнил» */
export function countFulfilledSteps(
  steps: [MorningFocusStepStatus, MorningFocusStepStatus, MorningFocusStepStatus]
): number {
  return steps.filter((s) => s === 'done').length
}

/** Сколько шагов уже прошли вечернюю сверку (done или missed) */
export function countDecidedSteps(
  steps: [MorningFocusStepStatus, MorningFocusStepStatus, MorningFocusStepStatus]
): number {
  return steps.filter((s) => s !== 'pending').length
}

/**
 * Автоматический расчёт процента выполнения обещаний.
 * Считается только по фактически записанным утром обещаниям:
 * 0 если обещаний нет, иначе доля «Выполнил» от их числа.
 */
export function computeCompletionPercent(
  focus: [string, string, string],
  steps: [MorningFocusStepStatus, MorningFocusStepStatus, MorningFocusStepStatus]
): number {
  const active = activeFocusIndexes(focus)
  if (active.length === 0) return 0
  const fulfilled = active.filter((i) => steps[i] === 'done').length
  return Math.round((fulfilled / active.length) * 100)
}

/** Все записанные обещания уже сверены вечером? */
export function allFocusStepsDecided(
  focus: [string, string, string],
  steps: [MorningFocusStepStatus, MorningFocusStepStatus, MorningFocusStepStatus]
): boolean {
  const active = activeFocusIndexes(focus)
  if (active.length === 0) return false
  return active.every((i) => steps[i] !== 'pending')
}

/** Человекочитаемый вердикт вечерней сверки по проценту выполнения */
export function focusVerdict(percent: number): { label: string; tone: 'elite' | 'good' | 'mid' | 'low' } {
  if (percent >= 100) return { label: 'Все обещания сдержаны', tone: 'elite' }
  if (percent >= 66) return { label: 'День почти закрыт', tone: 'good' }
  if (percent >= 34) return { label: 'Половина пути пройдена', tone: 'mid' }
  return { label: 'Завтра наверстаешь', tone: 'low' }
}

/**
 * Создаёт/обновляет запись утреннего фокуса.
 * Если текст конкретного шага не менялся — сохраняет его вечерний статус,
 * чтобы правка формулировки не сбрасывала уже поставленные галочки.
 */
export function createMorningFocusRecord(
  dateKey: string,
  focus: [string, string, string],
  existing?: MorningFocusRecord
): MorningFocusRecord {
  const normalized: [string, string, string] = [
    (focus[0] ?? '').trim().slice(0, 160),
    (focus[1] ?? '').trim().slice(0, 160),
    (focus[2] ?? '').trim().slice(0, 160),
  ]

  const steps: [
    MorningFocusStepStatus,
    MorningFocusStepStatus,
    MorningFocusStepStatus,
  ] = ['pending', 'pending', 'pending']

  if (existing) {
    for (let i = 0; i < 3; i++) {
      if (existing.focus[i] === normalized[i]) {
        steps[i] = existing.steps[i]
      }
    }
  }

  const allDecided = allFocusStepsDecided(normalized, steps)

  return {
    dateKey,
    focus: normalized,
    steps,
    createdAtISO: existing?.createdAtISO ?? new Date().toISOString(),
    reviewedAtISO: existing?.reviewedAtISO ?? (allDecided ? new Date().toISOString() : null),
    completionPercent: computeCompletionPercent(normalized, steps),
  }
}

/** Применяет статус к одному шагу и пересчитывает процент + автосверку */
export function applyStepStatus(
  record: MorningFocusRecord,
  index: 0 | 1 | 2,
  status: MorningFocusStepStatus
): MorningFocusRecord {
  const steps = [...record.steps] as [
    MorningFocusStepStatus,
    MorningFocusStepStatus,
    MorningFocusStepStatus,
  ]
  steps[index] = status
  const allDecided = allFocusStepsDecided(record.focus, steps)
  return {
    ...record,
    steps,
    completionPercent: computeCompletionPercent(record.focus, steps),
    reviewedAtISO: record.reviewedAtISO ?? (allDecided ? new Date().toISOString() : null),
  }
}

/** Завершает вечернюю сверку: неотмеченные шаги становятся «Не выполнил» */
export function finalizeEveningReview(record: MorningFocusRecord): MorningFocusRecord {
  const steps = record.steps.map((s) =>
    s === 'pending' ? 'missed' : s
  ) as [MorningFocusStepStatus, MorningFocusStepStatus, MorningFocusStepStatus]

  return {
    ...record,
    steps,
    completionPercent: computeCompletionPercent(record.focus, steps),
    reviewedAtISO: new Date().toISOString(),
  }
}

/** Валидирует историю утренних фокусов из хранилища (по дням) */
export function sanitizeMorningFocusHistory(
  value: unknown
): Record<string, MorningFocusRecord> {
  if (!value || typeof value !== 'object') return {}
  const result: Record<string, MorningFocusRecord> = {}

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
    if (!raw || typeof raw !== 'object') continue

    const r = raw as Partial<MorningFocusRecord>
    const focusArr = Array.isArray(r.focus) ? r.focus : []
    const focus: [string, string, string] = [
      typeof focusArr[0] === 'string' ? focusArr[0].slice(0, 160) : '',
      typeof focusArr[1] === 'string' ? focusArr[1].slice(0, 160) : '',
      typeof focusArr[2] === 'string' ? focusArr[2].slice(0, 160) : '',
    ]
    const steps = sanitizeMorningFocusSteps(r.steps)

    result[key] = {
      dateKey: key,
      focus,
      steps,
      createdAtISO:
        typeof r.createdAtISO === 'string' ? r.createdAtISO : new Date().toISOString(),
      reviewedAtISO: typeof r.reviewedAtISO === 'string' ? r.reviewedAtISO : null,
      completionPercent: computeCompletionPercent(focus, steps),
    }
  }

  return result
}

/**
 * Миграция старых morningIntentions → полная история фокусов.
 * Шаги остаются «не сверенными», процент = 0: сверка ещё не проходила.
 */
export function migrateIntentionsToHistory(
  intentions: unknown
): Record<string, MorningFocusRecord> {
  if (!intentions || typeof intentions !== 'object') return {}
  const result: Record<string, MorningFocusRecord> = {}

  for (const [key, rawFocus] of Object.entries(intentions as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
    if (!Array.isArray(rawFocus)) continue
    const focus: [string, string, string] = [
      typeof rawFocus[0] === 'string' ? rawFocus[0].slice(0, 160) : '',
      typeof rawFocus[1] === 'string' ? rawFocus[1].slice(0, 160) : '',
      typeof rawFocus[2] === 'string' ? rawFocus[2].slice(0, 160) : '',
    ]
    if (countActiveFocusSteps(focus) === 0) continue
    result[key] = createMorningFocusRecord(key, focus)
  }

  return result
}

/* ────────────────────────────────────────────────────────────────────────
   ОГОНЁК ФОКУСА — счётчик выполнения утренних обещаний
   ──────────────────────────────────────────────────────────────────────── */

export type FocusFlameStats = {
  /** Текущая серия дней подряд, где сдержано ≥ половины обещаний */
  currentStreak: number
  /** Лучшая серия таких дней за всё время */
  bestStreak: number
  /** Всего дней с зафиксированным утренним фокусом */
  totalDays: number
  /** Дней, где вечерняя сверка уже завершена */
  reviewedDays: number
  /** Всего сдержанных обещаний */
  totalFulfilled: number
  /** Всего записанных обещаний (по сверенным дням) */
  totalPromises: number
  /** Средний процент выполнения по сверенным дням */
  avgPercent: number
  /** Процент выполнения сегодня */
  todayPercent: number
  /** Сколько обещаний сдержано сегодня */
  todayFulfilled: number
  /** Сколько обещаний было записано сегодня */
  todayActive: number
  /** Сегодняшняя сверка завершена */
  todayReviewed: boolean
  /** Есть ли вообще история */
  hasHistory: boolean
}

export const EMPTY_FOCUS_FLAME_STATS: FocusFlameStats = {
  currentStreak: 0,
  bestStreak: 0,
  totalDays: 0,
  reviewedDays: 0,
  totalFulfilled: 0,
  totalPromises: 0,
  avgPercent: 0,
  todayPercent: 0,
  todayFulfilled: 0,
  todayActive: 0,
  todayReviewed: false,
  hasHistory: false,
}

/**
 * Считает живые метрики «Огонька фокуса» по истории утренних фокусов.
 * Серия не обрывается незавершённой сегодняшней сверкой — день просто
 * пропускается, пока ты его не закроешь вечером.
 */
export function computeFocusFlame(
  history: Record<string, MorningFocusRecord>,
  todayKey: string
): FocusFlameStats {
  const records = Object.values(history).filter((r) => countActiveFocusSteps(r.focus) > 0)
  if (records.length === 0) return EMPTY_FOCUS_FLAME_STATS

  const reviewed = records.filter((r) => Boolean(r.reviewedAtISO))
  const totalFulfilled = reviewed.reduce((sum, r) => sum + countFulfilledSteps(r.steps), 0)
  const totalPromises = reviewed.reduce((sum, r) => sum + countActiveFocusSteps(r.focus), 0)
  const avgPercent =
    reviewed.length > 0
      ? Math.round(reviewed.reduce((sum, r) => sum + r.completionPercent, 0) / reviewed.length)
      : 0

  // Дни, где сдержано не меньше порога
  const keptDays = new Set(
    reviewed
      .filter((r) => r.completionPercent >= FOCUS_KEEP_THRESHOLD)
      .map((r) => r.dateKey)
  )

  // Лучшая серия
  const sortedKept = Array.from(keptDays).sort()
  let bestStreak = 0
  let run = 0
  let prev: string | null = null
  for (const day of sortedKept) {
    if (prev && daysBetweenLocalDays(prev, day) === 1) {
      run += 1
    } else {
      run = 1
    }
    if (run > bestStreak) bestStreak = run
    prev = day
  }

  // Текущая серия: считаем назад от сегодня или от вчера (пока день не закрыт)
  let currentStreak = 0
  let cursor: string | null = null
  if (keptDays.has(todayKey)) {
    cursor = todayKey
  } else {
    const yesterday = addDaysToLocalDay(todayKey, -1)
    if (keptDays.has(yesterday)) cursor = yesterday
  }
  if (cursor) {
    let probe: string | null = cursor
    while (probe && keptDays.has(probe)) {
      currentStreak += 1
      probe = addDaysToLocalDay(probe, -1)
    }
  }

  const todayRecord = history[todayKey]
  const todayActive = todayRecord ? countActiveFocusSteps(todayRecord.focus) : 0
  const todayFulfilled = todayRecord ? countFulfilledSteps(todayRecord.steps) : 0
  const todayPercent = todayRecord ? todayRecord.completionPercent : 0
  const todayReviewed = Boolean(todayRecord?.reviewedAtISO)

  return {
    currentStreak,
    bestStreak,
    totalDays: records.length,
    reviewedDays: reviewed.length,
    totalFulfilled,
    totalPromises,
    avgPercent,
    todayPercent,
    todayFulfilled,
    todayActive,
    todayReviewed,
    hasHistory: true,
  }
}

/** Уровень огонька: чем длиннее серия, тем ярче и крупнее пламя */
export function focusFlameTier(streak: number): {
  id: 'spark' | 'ember' | 'blaze' | 'inferno'
  label: string
  color: string
} {
  if (streak >= 30) return { id: 'inferno', label: 'Пламя дисциплины', color: '#ff5b2e' }
  if (streak >= 14) return { id: 'blaze', label: 'Уверенное пламя', color: '#ff8c1a' }
  if (streak >= 5) return { id: 'ember', label: 'Разгорается', color: '#ffa600' }
  return { id: 'spark', label: 'Искра обещаний', color: '#ffc152' }
}

/* ────────────────────────────────────────────────────────────────────────
   ДЕМО-ДАННЫЕ УТРЕННИХ ФОКУСОВ (для наглядности в демо-режиме)
   ──────────────────────────────────────────────────────────────────────── */

type DemoFocusTemplate = {
  focus: [string, string, string]
  steps: [MorningFocusStepStatus, MorningFocusStepStatus, MorningFocusStepStatus]
}

const DEMO_FOCUS_TEMPLATES: DemoFocusTemplate[] = [
  {
    focus: ['Закрыть переговоры с партнёром', 'Пробежка 8 км', 'Разобрать бэклог Memernity'],
    steps: ['done', 'done', 'missed'],
  },
  {
    focus: ['Финальная презентация инвестору', 'Час без телефона', 'Разослать фоллоу-апы'],
    steps: ['done', 'done', 'done'],
  },
  {
    focus: ['Написать главу книги', 'Силовая тренировка', 'Ответить на письма'],
    steps: ['done', 'missed', 'missed'],
  },
  {
    focus: ['Собрать обратную связь клиентов', 'Прогулка 5 км', 'Обновить дашборд метрик'],
    steps: ['done', 'done', 'done'],
  },
  {
    focus: ['Провести стратегическую сессию', 'Медитация 15 минут', 'Изучить рынок'],
    steps: ['done', 'done', 'done'],
  },
  {
    focus: ['Дожать сделку месяца', 'Плавание', 'Спланировать следующую неделю'],
    steps: ['missed', 'done', 'missed'],
  },
]

/**
 * Строит демонстрационную историю утренних фокусов за последние 6 дней
 * (сегодняшний день оставлен пустым — его фиксирует сам пользователь).
 * Возвращает и богатую историю, и совместимую карту morningIntentions.
 */
export function buildDemoMorningFocus(todayKey: string): {
  history: Record<string, MorningFocusRecord>
  intentions: Record<string, [string, string, string]>
} {
  const history: Record<string, MorningFocusRecord> = {}
  const intentions: Record<string, [string, string, string]> = {}

  DEMO_FOCUS_TEMPLATES.forEach((template, index) => {
    const dateKey = addDaysToLocalDay(todayKey, -(index + 1))
    history[dateKey] = {
      dateKey,
      focus: template.focus,
      steps: template.steps,
      createdAtISO: `${dateKey}T07:00:00.000Z`,
      reviewedAtISO: `${dateKey}T22:00:00.000Z`,
      completionPercent: computeCompletionPercent(template.focus, template.steps),
    }
    intentions[dateKey] = template.focus
  })

  return { history, intentions }
}

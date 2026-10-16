/**
 * ЭТАП 17 — МЕСЯЧНЫЕ KPI-ЦЕЛИ.
 *
 * Чистый модуль без DOM: описывает типы месячных ориентиров, заводские
 * значения, безопасную валидацию из хранилища и быстрые пресеты, которые
 * интерфейс аналитики использует для создания цели в один клик.
 */

import type { KpiKind, MonthlyKpi } from './types'

export type KpiKindMeta = {
  id: KpiKind
  /** Короткая подпись типа цели */
  label: string
  /** Единица измерения значения */
  unit: string
  emoji: string
  /** Заводской ориентир для пресета */
  defaultTarget: number
  min: number
  max: number
  step: number
  /** Акцентный цвет прогресса */
  color: string
  /** Что именно считает цель */
  hint: string
}

/** Все типы месячных KPI-ориентиров */
export const KPI_KINDS: KpiKindMeta[] = [
  {
    id: 'prides',
    label: 'Гордости',
    unit: 'шт.',
    emoji: '🔥',
    defaultTarget: 30,
    min: 1,
    max: 500,
    step: 1,
    color: '#ff6b35',
    hint: 'Сколько гордостей зафиксировать за месяц',
  },
  {
    id: 'gratitudes',
    label: 'Благодарности',
    unit: 'шт.',
    emoji: '❤️',
    defaultTarget: 60,
    min: 1,
    max: 900,
    step: 1,
    color: '#f91880',
    hint: 'Сколько благодарностей записать за месяц',
  },
  {
    id: 'avg-rating',
    label: 'Средний балл',
    unit: '★',
    emoji: '⭐',
    defaultTarget: 8.5,
    min: 1,
    max: 10,
    step: 0.1,
    color: '#e3b341',
    hint: 'Какой средний балл гордостей удерживать',
  },
  {
    id: 'active-days',
    label: 'Активные дни',
    unit: 'дн.',
    emoji: '📆',
    defaultTarget: 26,
    min: 1,
    max: 31,
    step: 1,
    color: '#1d9bf0',
    hint: 'Сколько дней месяца закрыть записью',
  },
  {
    id: 'focus-percent',
    label: 'Обещания',
    unit: '%',
    emoji: '🎯',
    defaultTarget: 80,
    min: 10,
    max: 100,
    step: 5,
    color: '#00ba7c',
    hint: 'Какой процент утренних обещаний сдерживать',
  },
  {
    id: 'custom',
    label: 'Своя цель',
    unit: '',
    emoji: '✨',
    defaultTarget: 1,
    min: 1,
    max: 1000000,
    step: 1,
    color: '#a78bfa',
    hint: 'Личная цель, которую отмечаешь вручную',
  },
]

export const KPI_KIND_MAP: Record<KpiKind, KpiKindMeta> = KPI_KINDS.reduce(
  (acc, meta) => {
    acc[meta.id] = meta
    return acc
  },
  {} as Record<KpiKind, KpiKindMeta>
)

export function isKpiKind(value: unknown): value is KpiKind {
  return typeof value === 'string' && value in KPI_KIND_MAP
}

export function getKpiKind(kind: KpiKind): KpiKindMeta {
  return KPI_KIND_MAP[kind] ?? KPI_KIND_MAP.prides
}

/** Приводит ориентир к допустимому диапазону своего типа */
export function clampKpiTarget(kind: KpiKind, target: number): number {
  const meta = getKpiKind(kind)
  const value = Number.isFinite(target) ? target : meta.defaultTarget
  const rounded = meta.step >= 1 ? Math.round(value) : Math.round(value * 10) / 10
  return Math.max(meta.min, Math.min(meta.max, rounded))
}

/** Человекочитаемое значение цели, напр. «8.5 ★» или «30 шт.» */
export function formatKpiValue(kind: KpiKind, value: number): string {
  const meta = getKpiKind(kind)
  if (kind === 'avg-rating') return `${value.toFixed(1)} ★`
  if (kind === 'focus-percent') return `${Math.round(value)}%`
  if (kind === 'custom') return `${Math.round(value * 10) / 10}`
  return `${Math.round(value)} ${meta.unit}`.trim()
}

/** Быстрые пресеты для создания месячной цели одним нажатием */
export const KPI_PRESETS: { title: string; kind: KpiKind; target: number; emoji: string }[] = [
  { title: '30 гордостей за месяц', kind: 'prides', target: 30, emoji: '🔥' },
  { title: 'Держать средний балл ★ 8.5', kind: 'avg-rating', target: 8.5, emoji: '⭐' },
  { title: '60 благодарностей за месяц', kind: 'gratitudes', target: 60, emoji: '❤️' },
  { title: '26 активных дней месяца', kind: 'active-days', target: 26, emoji: '📆' },
  { title: '80% обещаний сдержано', kind: 'focus-percent', target: 80, emoji: '🎯' },
]

/** Заводские месячные KPI демо-профиля */
export const DEFAULT_MONTHLY_KPIS: MonthlyKpi[] = [
  {
    id: 'kpi-prides-30',
    title: '30 гордостей за месяц',
    kind: 'prides',
    target: 30,
    createdAtISO: '2026-10-01T08:00:00.000Z',
    manualDone: false,
  },
  {
    id: 'kpi-rating-85',
    title: 'Держать средний балл ★ 8.5',
    kind: 'avg-rating',
    target: 8.5,
    createdAtISO: '2026-10-01T08:00:00.000Z',
    manualDone: false,
  },
  {
    id: 'kpi-grat-60',
    title: '60 благодарностей за месяц',
    kind: 'gratitudes',
    target: 60,
    createdAtISO: '2026-10-01T08:00:00.000Z',
    manualDone: false,
  },
  {
    id: 'kpi-focus-80',
    title: '80% обещаний сдержано',
    kind: 'focus-percent',
    target: 80,
    createdAtISO: '2026-10-01T08:00:00.000Z',
    manualDone: false,
  },
]

/** Создаёт валидную месячную цель без побочных эффектов */
export function createMonthlyKpi(input: {
  title: string
  kind: KpiKind
  target: number
  id?: string
  createdAtISO?: string
  manualDone?: boolean
}): MonthlyKpi {
  const kind = isKpiKind(input.kind) ? input.kind : 'prides'
  const title = (input.title ?? '').trim().slice(0, 120) || getKpiKind(kind).label
  return {
    id:
      input.id && input.id.trim()
        ? input.id.slice(0, 80)
        : `kpi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    kind,
    target: clampKpiTarget(kind, input.target),
    createdAtISO: input.createdAtISO || new Date().toISOString(),
    manualDone: Boolean(input.manualDone),
  }
}

/**
 * Безопасно валидирует массив месячных KPI-целей из хранилища.
 * Повреждённые записи отбрасываются, ориентиры зажимаются в диапазон.
 */
export function sanitizeMonthlyKpis(value: unknown): MonthlyKpi[] {
  if (!Array.isArray(value)) return DEFAULT_MONTHLY_KPIS.map((k) => ({ ...k }))
  const result: MonthlyKpi[] = []
  const seen = new Set<string>()
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const k = raw as Partial<MonthlyKpi>
    const kind: KpiKind = isKpiKind(k.kind) ? k.kind : 'prides'
    const title =
      typeof k.title === 'string' && k.title.trim()
        ? k.title.trim().slice(0, 120)
        : getKpiKind(kind).label
    const id =
      typeof k.id === 'string' && k.id ? k.id.slice(0, 80) : `kpi-${result.length}`
    if (seen.has(id)) continue
    seen.add(id)

    result.push({
      id,
      title,
      kind,
      target: clampKpiTarget(
        kind,
        typeof k.target === 'number' && Number.isFinite(k.target)
          ? k.target
          : getKpiKind(kind).defaultTarget
      ),
      createdAtISO:
        typeof k.createdAtISO === 'string' && k.createdAtISO
          ? k.createdAtISO
          : new Date().toISOString(),
      manualDone: Boolean(k.manualDone),
    })
  }

  return result
}

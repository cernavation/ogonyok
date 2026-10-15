/**
 * ЭТАП 9 — ПРИВАТНОСТЬ ГОРДОСТЕЙ И ДНЕЙ.
 *
 * Единый источник правды о трёх уровнях видимости записи:
 *  - 'public'  — «Публично в глобальную ленту»
 *  - 'friends' — «Только друзьям»
 *  - 'private' — «Лично для меня»
 *
 * Модуль не зависит от DOM и используется и хранилищем (валидация),
 * и интерфейсом (переключатель приватности, публикация в сторис).
 */

import type { VisibilityLevel } from './types'

export type VisibilityIconName = 'globe' | 'users' | 'lock'

export type VisibilityMeta = {
  id: VisibilityLevel
  /** Полная формулировка для меню и подсказок */
  label: string
  /** Короткая подпись для компактного сегмента */
  shortLabel: string
  /** Что именно означает уровень */
  description: string
  icon: VisibilityIconName
  /** Акцентный цвет уровня */
  color: string
  /** 0 — самый открытый, 2 — самый закрытый (для сравнения) */
  rank: number
}

export const VISIBILITY_LEVELS: VisibilityMeta[] = [
  {
    id: 'public',
    label: 'Публично в глобальную ленту',
    shortLabel: 'Публично',
    description: 'Гордость увидят все участники в глобальной ленте Огонька',
    icon: 'globe',
    color: '#1d9bf0',
    rank: 0,
  },
  {
    id: 'friends',
    label: 'Только друзьям',
    shortLabel: 'Друзьям',
    description: 'Запись видна только тем, с кем ты идёшь плечом к плечу',
    icon: 'users',
    color: '#ffad5a',
    rank: 1,
  },
  {
    id: 'private',
    label: 'Лично для меня',
    shortLabel: 'Лично',
    description: 'Скрыто от всех — только твой личный дневник силы',
    icon: 'lock',
    color: '#8b98a5',
    rank: 2,
  },
]

export const DEFAULT_VISIBILITY: VisibilityLevel = 'public'

/** Безопасно приводит любое значение к допустимому уровню приватности */
export function normalizeVisibility(value: unknown): VisibilityLevel {
  return value === 'public' || value === 'friends' || value === 'private'
    ? value
    : DEFAULT_VISIBILITY
}

/** Метаданные уровня приватности (с фолбэком на «публично») */
export function visibilityMeta(level: VisibilityLevel): VisibilityMeta {
  return VISIBILITY_LEVELS.find((v) => v.id === level) ?? VISIBILITY_LEVELS[0]
}

/** Более закрытый из двух уровней — для наследования приватности гордостью от дня */
export function mostRestrictive(a: VisibilityLevel, b: VisibilityLevel): VisibilityLevel {
  return visibilityMeta(a).rank >= visibilityMeta(b).rank ? a : b
}

/** Публична ли запись в глобальной ленте */
export function isPubliclyVisible(level: VisibilityLevel): boolean {
  return level === 'public'
}

/** Короткая человекочитаемая подпись уровня */
export function visibilityLabel(level: VisibilityLevel): string {
  return visibilityMeta(level).shortLabel
}

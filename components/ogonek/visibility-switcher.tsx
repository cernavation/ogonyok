'use client'

import { Check, Globe, Lock, Users } from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import type { VisibilityLevel } from '@/lib/ogonek/types'
import { VISIBILITY_LEVELS, visibilityMeta } from '@/lib/ogonek/visibility'
import { Tooltip } from './tooltip'

const ICONS = { globe: Globe, users: Users, lock: Lock } as const

type Props = {
  value: VisibilityLevel
  onChange: (level: VisibilityLevel) => void
  /** 'sm' — компактный иконочный переключатель; 'md' — с подписями */
  size?: 'sm' | 'md'
  /** Подпись над переключателем */
  label?: string
  disabled?: boolean
  soundEnabled?: boolean
  /** Показывать пояснение выбранного уровня */
  showHint?: boolean
  className?: string
}

/**
 * ЭТАП 9 — Переключатель приватности записи.
 * Три уровня: «Публично в глобальную ленту», «Только друзьям», «Лично для меня».
 */
export function VisibilitySwitcher({
  value,
  onChange,
  size = 'md',
  label,
  disabled = false,
  soundEnabled = true,
  showHint = false,
  className = '',
}: Props) {
  const active = visibilityMeta(value)

  const handleSelect = (level: VisibilityLevel) => {
    if (disabled || level === value) return
    playClick(soundEnabled)
    onChange(level)
  }

  return (
    <div className={className}>
      {label && (
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#71767b]">
          {label}
        </span>
      )}
      <div
        className={`inline-flex items-center gap-0.5 rounded-full border border-zinc-800/80 bg-black p-0.5 ${
          disabled ? 'opacity-50' : ''
        }`}
        role="radiogroup"
        aria-label={label ?? 'Приватность записи'}
      >
        {VISIBILITY_LEVELS.map((level) => {
          const Icon = ICONS[level.icon]
          const isActive = level.id === value
          const button = (
            <button
              key={level.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={level.label}
              disabled={disabled}
              onClick={() => handleSelect(level.id)}
              className={`flex items-center gap-1.5 rounded-full font-bold transition-colors duration-150 disabled:cursor-not-allowed ${
                size === 'sm' ? 'h-7 w-7 justify-center' : 'px-3 py-1.5 text-[12px]'
              } ${isActive ? '' : 'text-[#71767b] hover:bg-white/[0.06] hover:text-[#e7e9ea]'}`}
              style={isActive ? { color: level.color, background: `${level.color}22` } : undefined}
            >
              <Icon size={size === 'sm' ? 13 : 14} />
              {size === 'md' && <span>{level.shortLabel}</span>}
            </button>
          )

          if (size === 'sm') {
            return (
              <Tooltip key={level.id} content={level.label} side="top">
                {button}
              </Tooltip>
            )
          }
          return button
        })}
      </div>
      {showHint && (
        <span
          className="mt-1.5 flex items-start gap-1 text-[11px] leading-[15px]"
          style={{ color: active.color }}
        >
          <Check size={12} className="mt-0.5 flex-none" />
          <span>{active.description}</span>
        </span>
      )}
    </div>
  )
}

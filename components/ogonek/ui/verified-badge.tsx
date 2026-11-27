'use client'

import { Check } from 'lucide-react'

export type VerifiedBadgeSize = 'xs' | 'sm' | 'md' | 'lg'

export type VerifiedBadgeProps = {
  size?: VerifiedBadgeSize
  /** Optional explicit pixel size (overrides preset size) */
  px?: number
  /** Adds var(--bg) outer ring for overlaying on top of avatars */
  bordered?: boolean
  title?: string
  className?: string
}

const SIZE_MAP: Record<VerifiedBadgeSize, { box: number; icon: number }> = {
  xs: { box: 14, icon: 8 },
  sm: { box: 16, icon: 10 },
  md: { box: 18, icon: 11 },
  lg: { box: 20, icon: 12 },
}

/**
 * Единый значок верификации Priday (#d76737 с чёрной галочкой #000000) —
 * используется везде: лента, сторис, чаты, поиск, профиль, рейтинг и модалки.
 */
export function VerifiedBadge({
  size = 'sm',
  px,
  bordered = false,
  title = 'Верифицированный профиль',
  className = '',
}: VerifiedBadgeProps) {
  const preset = SIZE_MAP[size] ?? SIZE_MAP.sm
  const boxPx = px ?? preset.box
  const iconPx = px ? Math.max(8, Math.round(px * 0.6)) : preset.icon

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[#d76737] text-black shrink-0 select-none ${
        bordered ? 'ring-2 ring-[var(--bg)]' : ''
      } ${className}`}
      style={{
        width: boxPx,
        height: boxPx,
        backgroundColor: '#d76737',
        color: '#000000',
      }}
      title={title}
      aria-label={title}
    >
      <Check size={iconPx} strokeWidth={3.25} className="text-black" />
    </span>
  )
}

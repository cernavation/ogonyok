'use client'

import { Flame } from 'lucide-react'
import type { FocusFlameStats } from '@/lib/ogonek/morning-focus'
import { focusFlameTier } from '@/lib/ogonek/morning-focus'

type Props = {
  stats: FocusFlameStats
  /** Компактный вариант — для шапки фокуса */
  compact?: boolean
  className?: string
  /** Если передан — весь блок становится рабочей кнопкой */
  onClick?: () => void
  title?: string
}

/**
 * ЭТАП 10 — «Огонёк фокуса»: собственный счётчик выполнения утренних
 * обещаний. Чем длиннее серия сдержанных обещаний, тем жарче пламя.
 */
export function FocusFlame({ stats, compact = false, className = '', onClick, title }: Props) {
  const tier = focusFlameTier(stats.currentStreak)

  const inner = (
    <>
      <span
        className="relative inline-flex items-center justify-center flex-none rounded-full"
        style={{
          width: compact ? 34 : 46,
          height: compact ? 34 : 46,
          background: 'radial-gradient(circle at 50% 62%, rgba(255,166,0,0.22), rgba(255,107,53,0.05) 70%, transparent)',
          boxShadow: stats.currentStreak > 0 ? `0 0 18px ${tier.color}55` : 'none',
        }}
        aria-hidden="true"
      >
        <Flame
          size={compact ? 22 : 30}
          strokeWidth={1.6}
          style={{
            color: stats.currentStreak > 0 ? tier.color : '#4b5563',
            fill: stats.currentStreak > 0 ? `${tier.color}33` : 'transparent',
          }}
        />
        <span
          className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] leading-[18px] text-center font-extrabold tabular-nums"
          style={{
            background: stats.currentStreak > 0 ? tier.color : '#2f3336',
            color: stats.currentStreak > 0 ? '#1a0f00' : '#9aa4af',
          }}
        >
          {stats.currentStreak}
        </span>
      </span>

      <div className="min-w-0 text-left">
        <p
          className={`font-bold leading-tight ${compact ? 'text-[12px]' : 'text-[14px]'}`}
          style={{ color: 'var(--text)' }}
        >
          {compact ? `Огонёк фокуса · ${stats.currentStreak} дн.` : 'Огонёк фокуса'}
        </p>
        <p className={`leading-tight ${compact ? 'text-[11px]' : 'text-[12px]'}`} style={{ color: 'var(--muted)' }}>
          {stats.hasHistory
            ? `${tier.label} · ${stats.totalFulfilled} обещаний сдержано`
            : 'Запиши утренний фокус — зажги огонёк'}
        </p>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`flex items-center gap-2.5 bg-transparent border-0 p-0 cursor-pointer rounded-xl transition-transform active:scale-[0.98] ${className}`}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`} title={title}>
      {inner}
    </div>
  )
}

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
 * ЭТАП 10 — «Priday фокуса»: собственный счётчик выполнения утренних
 * обещаний. Чем длиннее серия сдержанных обещаний, тем жарче пламя.
 */
export function FocusFlame({ stats, compact = false, className = '', onClick, title }: Props) {
  const tier = focusFlameTier(stats.currentStreak)

  const inner = (
    <>
      <span
        className="relative inline-flex items-center justify-center flex-none rounded-full bg-white/[0.06] border border-white/[0.1]"
        style={{
          width: compact ? 34 : 46,
          height: compact ? 34 : 46,
        }}
        aria-hidden="true"
      >
        <Flame
          size={compact ? 20 : 28}
          strokeWidth={1.6}
          className={stats.currentStreak > 0 ? 'text-white/75' : 'text-white/35'}
        />
        <span
          className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] leading-[18px] text-center font-bold tabular-nums bg-white/[0.14] text-white/90 border border-white/[0.16]"
        >
          {stats.currentStreak}
        </span>
      </span>

      <div className="min-w-0 text-left">
        <p
          className={`font-bold leading-tight ${compact ? 'text-[13px]' : 'text-[14px]'}`}
          style={{ color: 'var(--text)' }}
        >
          {compact ? `Фокус Winlog · ${stats.currentStreak} дн.` : 'Фокус Winlog'}
        </p>
        <p className={`leading-tight text-[13px]`} style={{ color: 'var(--muted)' }}>
          {stats.hasHistory
            ? `${tier.label} · ${stats.totalFulfilled} обещаний сдержано`
            : 'Запиши утренний фокус — зажги огонь'}
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
        className={`flex items-center gap-2.5 bg-transparent border-0 p-1 min-h-[40px] cursor-pointer rounded-xl transition-transform active:scale-[0.98] ${className}`}
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

'use client'

import React from 'react'
import { BarChart3, Search, Users } from 'lucide-react'
import { CURRENT_DAY } from '@/lib/ogonek/data'
import type { StreakStatus } from '@/lib/ogonek/streak'
import type { ViewId } from '@/lib/ogonek/types'
import { FlameIcon } from './flame-icon'
import { ActiveFriendsWidget } from './active-friends-widget'

type Props = {
  onNavigate: (view: ViewId) => void
  onCompose?: () => void
  streak?: number
  streakStatus?: StreakStatus
  hoursLeft?: number | null
  isDemo?: boolean
  onNotify?: (message: string) => void
  soundEnabled?: boolean
  className?: string
}

export function RightRail({
  onNavigate,
  streak = CURRENT_DAY,
  streakStatus = 'safe',
  hoursLeft,
  onNotify,
  soundEnabled = true,
  className,
}: Props) {
  return (
    <aside
      className={`w-[350px] shrink-0 sticky top-0 h-screen pl-6 hidden lg:block overflow-y-auto scrollbar-none pr-4 py-3 z-20 select-none flex flex-col gap-4 ${className || ''}`}
      aria-label="Дополнительная информация"
    >
      {/* Блок 1: Поиск — пилюля с повышенным фоном (X.com pill search) */}
      <div className="x-search-bar" role="search">
        <div
          className="flex items-center gap-3 bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] rounded-full px-4 py-3 cursor-pointer transition-colors duration-150 border border-[var(--line)] focus-within:border-[var(--accent)] min-h-[44px]"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('explore')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onNavigate('explore')
            }
          }}
          aria-label="Перейти к поиску"
        >
          <Search size={18} className="text-[var(--muted)] flex-none" />
          <span className="text-[var(--muted)] text-[15px] select-none font-normal">
            Поиск по дневнику
          </span>
        </div>
      </div>

      {/* Блок 2: Стрик и дедлайн — 1-слойная карточка (без вложенных подложек) */}
      <section
        className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] p-4 transition-colors"
        aria-labelledby="streak-title"
      >
        <div className="flex items-center justify-between mb-3">
          <h2
            id="streak-title"
            className="text-[var(--text)] text-[16px] font-bold tracking-tight"
          >
            Твой стрик
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className="text-[13px] font-normal text-[var(--muted)] hover:text-[var(--accent)] flex items-center gap-1.5 transition-colors min-h-[34px] px-2.5 py-1 rounded-full hover:bg-[var(--bg-hover)]"
          >
            <BarChart3 size={14} />
            <span>Статистика</span>
          </button>
        </div>

        <div className="flex items-center gap-3.5 pt-1">
          <FlameIcon status={streakStatus} hoursLeft={hoursLeft} size={42} />
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[var(--text)] text-[32px] font-black leading-none tracking-tight">
                {streak}
              </span>
              <span className="text-[var(--muted)] text-[13px] font-normal">
                дней закрыто
              </span>
            </div>
            <p className="text-[var(--muted)] text-[13px] font-normal mt-1">
              Огонёк не сгорает при пропуске
            </p>
          </div>
        </div>

        {hoursLeft != null && hoursLeft <= 24 && (
          <div className="mt-3 flex items-center gap-2 text-[13px] font-medium text-amber-500 bg-amber-500/10 px-3 py-2 rounded-full border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Осталось {hoursLeft}ч до напоминания</span>
          </div>
        )}
      </section>

      {/* Блок 3: Друзья — нативный виджет без лишней внешней обёртки */}
      {onNotify && (
        <ActiveFriendsWidget
          onNavigate={onNavigate}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}
    </aside>
  )
}

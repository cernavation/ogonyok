'use client'

import { CURRENT_DAY } from '@/lib/ogonek/data'
import type { StreakStatus } from '@/lib/ogonek/streak'
import { FlameIcon } from './flame-icon'

type Props = {
  title?: string
  streak?: number
  streakStatus?: StreakStatus
  hoursLeft?: number | null
  userInitials?: string
  userName?: string
  onOpenProfile?: () => void
}

export function MobileHeader({
  title = 'Главная',
  streak = CURRENT_DAY,
  streakStatus = 'safe',
  hoursLeft,
  userInitials = 'ОГ',
  userName = 'Мой профиль',
  onOpenProfile,
}: Props) {
  return (
    <header className="mobile-header">
      <button
        type="button"
        className="brand-flame p-0 border-0 bg-transparent cursor-pointer w-10 h-10 flex items-center justify-center"
        onClick={onOpenProfile}
        aria-label={`Профиль ${userName}`}
      >
        <span className="avatar avatar-photo" style={{ width: 32, height: 32, fontSize: 13 }}>{userInitials}</span>
      </button>
      <b>{title}</b>
      <button
        type="button"
        onClick={onOpenProfile}
        className="day-pill cursor-pointer border-0 min-h-[40px] px-3.5 flex items-center gap-1"
        aria-label={`Текущий стрик: ${streak} дней`}
      >
        <FlameIcon status={streakStatus} hoursLeft={hoursLeft} size={16} />
        <span className="ml-1 text-[13px] font-bold">{streak}</span>
      </button>
    </header>
  )
}

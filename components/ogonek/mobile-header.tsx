'use client'

import { CURRENT_DAY } from '@/lib/ogonek/data'
import type { StreakStatus } from '@/lib/ogonek/streak'
import { FlameIcon } from './flame-icon'

type Props = {
  title?: string
  streak?: number
  streakStatus?: StreakStatus
  hoursLeft?: number | null
  onOpenProfile?: () => void
}

export function MobileHeader({
  title = 'Главная',
  streak = CURRENT_DAY,
  streakStatus = 'safe',
  hoursLeft,
  onOpenProfile,
}: Props) {
  return (
    <header className="mobile-header">
      <button
        type="button"
        className="brand-flame p-0 border-0 bg-transparent cursor-pointer"
        onClick={onOpenProfile}
        aria-label="Профиль Alexei Cerna"
      >
        <span className="avatar avatar-photo" style={{ width: 28, height: 28, fontSize: 11 }}>AC</span>
      </button>
      <b>{title}</b>
      <button
        type="button"
        onClick={onOpenProfile}
        className="day-pill cursor-pointer border-0"
        aria-label={`Текущий стрик: ${streak} дней`}
      >
        <FlameIcon status={streakStatus} hoursLeft={hoursLeft} size={14} />
        <span className="ml-1">{streak}</span>
      </button>
    </header>
  )
}

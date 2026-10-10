'use client'

import { MoreHorizontal, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FEED_TABS } from '@/lib/ogonek/data'
import { playClick } from '@/lib/ogonek/sound'
import type { StreakStatus } from '@/lib/ogonek/streak'
import type { Day, ViewId } from '@/lib/ogonek/types'
import { DayCard } from '../day-card'
import { MobileHeader } from '../mobile-header'
import { QuickFocus } from '../quick-focus'
import { Tooltip } from '../tooltip'

type Props = {
  days: Day[]
  morningIntentions?: Record<string, [string, string, string]>
  onSaveMorningIntentions?: (dateKey: string, focus: [string, string, string]) => void
  onLightbox: (url: string) => void
  onNotify: (msg: string) => void
  onPinToVault?: (fact: string) => void
  onCompose?: () => void
  onNavigate?: (view: ViewId) => void
  streak?: number
  streakStatus?: StreakStatus
  hoursLeft?: number | null
  onOpenProfile?: () => void
  soundEnabled?: boolean
}

export function HomeView({
  days,
  morningIntentions,
  onSaveMorningIntentions,
  onLightbox,
  onNotify,
  onPinToVault,
  onCompose,
  onNavigate,
  streak,
  streakStatus,
  hoursLeft,
  onOpenProfile,
  soundEnabled = true,
}: Props) {
  const [filter, setFilter] = useState<string>('Для тебя')

  const todayKey = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  const filteredDays = useMemo(() => {
    if (filter === 'Для тебя') {
      return days
    }
    return days.filter((d) => d.tags.includes(filter))
  }, [days, filter])

  const handleTabClick = (tab: string) => {
    playClick(soundEnabled)
    setFilter(tab)
  }

  return (
    <div className="view-home">
      <MobileHeader
        title="Главная"
        streak={streak}
        streakStatus={streakStatus}
        hoursLeft={hoursLeft}
        onOpenProfile={onOpenProfile}
      />

      <header className="feed-header">
        <div className="feed-title">
          <h1>Главная</h1>
          <Tooltip content="Настройки ленты" side="left">
            <button
              type="button"
              className="muted"
              aria-label="Настройки ленты"
              style={{ padding: 4 }}
            >
              <MoreHorizontal size={20} />
            </button>
          </Tooltip>
        </div>
        <div className="tabs" role="tablist" aria-label="Фильтры ленты">
          {FEED_TABS.map((tab) => {
            const isSelected = filter === tab
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={isSelected ? 'selected' : ''}
                onClick={() => handleTabClick(tab)}
              >
                {tab}
              </button>
            )
          })}
        </div>
      </header>

      <div className="feed-content">
        <QuickFocus
          initialFocus={morningIntentions?.[todayKey]}
          onSave={(focus) => onSaveMorningIntentions?.(todayKey, focus)}
          notify={onNotify}
          soundEnabled={soundEnabled}
        />

        {days.length === 0 ? (
          <div className="empty-state py-12 text-center" role="status">
            <span className="text-4xl text-orange-500">✦</span>
            <h2 className="empty-state__title text-lg font-bold mt-2">Твой огонёк готов к первому дню</h2>
            <p className="empty-state__desc text-muted text-sm max-w-sm mx-auto mt-1 mb-6">
              Фиксируй 5 поводов для гордости каждый день, чтобы замечать свою силу и сохранять внутреннюю опору.
            </p>
            <div className="flex justify-center gap-3">
              {onCompose && (
                <button
                  type="button"
                  className="primary-btn flex items-center gap-1.5"
                  onClick={onCompose}
                >
                  <Plus size={16} /> Записать первый день
                </button>
              )}
              {onNavigate && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => onNavigate('settings')}
                >
                  Импортировать архив
                </button>
              )}
            </div>
          </div>
        ) : filteredDays.length > 0 ? (
          filteredDays.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              onLightbox={onLightbox}
              onNotify={onNotify}
              onPinToVault={onPinToVault}
              soundEnabled={soundEnabled}
            />
          ))
        ) : (
          <div className="empty-state" role="status">
            <p className="empty-state__title">Ничего не найдено</p>
            <p className="empty-state__desc">
              Записей с тегом «{filter}» пока нет. Нажмите «+», чтобы создать запись.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

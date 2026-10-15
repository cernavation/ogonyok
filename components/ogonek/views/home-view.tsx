'use client'

import { MoreHorizontal, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FEED_TABS } from '@/lib/ogonek/data'
import { playClick } from '@/lib/ogonek/sound'
import type { StreakStatus } from '@/lib/ogonek/streak'
import type { Day, ViewId } from '@/lib/ogonek/types'
import { DayCard } from '../day-card'
import { MobileHeader } from '../mobile-header'
import { QuickFocus } from '../quick-focus'
import { StoriesBar } from '../stories-bar'
import { Tooltip } from '../tooltip'

const CHUNK_SIZE = 25

type Props = {
  days: Day[]
  morningIntentions?: Record<string, [string, string, string]>
  onSaveMorningIntentions?: (dateKey: string, focus: [string, string, string]) => void
  onLightbox: (url: string) => void
  onNotify: (msg: string) => void
  onPinToVault?: (fact: string) => void
  onCompose?: () => void
  onNavigate?: (view: ViewId) => void
  onEditDay?: (day: Day) => void
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
  onEditDay,
  streak,
  streakStatus,
  hoursLeft,
  onOpenProfile,
  soundEnabled = true,
}: Props) {
  const [filter, setFilter] = useState<string>('Для тебя')
  const [visibleCount, setVisibleCount] = useState<number>(CHUNK_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const todayKey = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  const filteredDays = useMemo(() => {
    // «Для тебя» — показывает ВСЕ дни без исключений
    if (filter === 'Для тебя') {
      return days
    }
    // «Гордости» — по фактическому наличию гордостей, а не по строковым тегам
    if (filter === '🔥 Гордости') {
      return days.filter((d) => d.prides && d.prides.length > 0)
    }
    // «Благодарности» — по фактическому наличию благодарностей
    if (filter === '❤️ Благодарности') {
      return days.filter((d) => d.gratitudes && d.gratitudes.length > 0)
    }
    // Остальные хэштег-табы продолжают фильтроваться по тегам
    return days.filter((d) => d.tags.includes(filter))
  }, [days, filter])

  const visibleDays = useMemo(() => {
    return filteredDays.slice(0, visibleCount)
  }, [filteredDays, visibleCount])

  // Infinite scroll chunk loading sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    if (visibleCount >= filteredDays.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + CHUNK_SIZE, filteredDays.length))
        }
      },
      { rootMargin: '600px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [visibleCount, filteredDays.length])

  // Fast scroll to bottom support from ScrollPill
  useEffect(() => {
    const onBottom = () => {
      setVisibleCount(filteredDays.length)
      setTimeout(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
      }, 60)
    }
    window.addEventListener('ogonek:scroll-bottom', onBottom)
    return () => window.removeEventListener('ogonek:scroll-bottom', onBottom)
  }, [filteredDays.length])

  const handleTabClick = (tab: string) => {
    playClick(soundEnabled)
    setFilter(tab)
    setVisibleCount(CHUNK_SIZE)
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

      {/* Sticky glassy feed header */}
      <header className="feed-header">
        {/* Title row */}
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

        {/* Tabs with Twitter Blue underline indicator */}
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

      {/* Сторис друзей — Instagram-кружочки вверху ленты */}
      <StoriesBar
        variant="feed"
        onNotify={onNotify}
        soundEnabled={soundEnabled}
        onOpenProfile={onOpenProfile}
      />

      {/* Inline "What's happening?" compose prompt — X.com style */}
      {onCompose && (
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-[#2f3336] cursor-pointer hover:bg-white/[0.02] transition-colors duration-150"
          onClick={onCompose}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onCompose?.() }}
          aria-label="Открыть форму записи дня"
        >
          {/* Mini avatar */}
          <div
            className="w-10 h-10 rounded-full flex-none flex items-center justify-center font-bold text-sm select-none"
            style={{
              background: 'linear-gradient(145deg, #7f95a3 0%, #7f95a3 35%, #d9ae8b 36%, #d9ae8b 66%, #29384b 67%)',
              color: '#fff',
              textShadow: '0 1px 2px #000',
            }}
            aria-hidden="true"
          >
            AC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#71767b] text-[19px] font-normal select-none truncate">
              Что произошло сегодня?
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCompose?.() }}
            className="flex-none flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-[14px] font-bold transition-colors duration-150"
            aria-label="Записать день"
          >
            <Plus size={15} strokeWidth={2.5} />
            Записать
          </button>
        </div>
      )}

      <div className="feed-content">
        <QuickFocus
          initialFocus={morningIntentions?.[todayKey]}
          onSave={(focus) => onSaveMorningIntentions?.(todayKey, focus)}
          notify={onNotify}
          soundEnabled={soundEnabled}
        />

        {days.length === 0 ? (
          <div className="empty-state py-12 text-center" role="status">
            <span className="text-4xl text-[#1d9bf0]">✦</span>
            <h2 className="empty-state__title text-lg font-bold mt-2">Твой огонёк готов к первому дню</h2>
            <p className="empty-state__desc text-muted text-sm max-w-sm mx-auto mt-1 mb-6">
              Фиксируй 5 поводов для гордости каждый день, чтобы замечать свою силу и сохранять внутреннюю опору.
            </p>
            <div className="flex justify-center gap-3">
              {onCompose && (
                <button
                  type="button"
                  className="x-primary-btn flex items-center gap-1.5"
                  onClick={onCompose}
                >
                  <Plus size={16} /> Записать первый день
                </button>
              )}
              {onNavigate && (
                <button
                  type="button"
                  className="x-secondary-btn"
                  onClick={() => onNavigate('settings')}
                >
                  Импортировать архив
                </button>
              )}
            </div>
          </div>
        ) : filteredDays.length > 0 ? (
          <>
            {visibleDays.map((day) => (
              <DayCard
                key={day.id}
                day={day}
                onLightbox={onLightbox}
                onNotify={onNotify}
                onPinToVault={onPinToVault}
                onEdit={onEditDay}
                soundEnabled={soundEnabled}
              />
            ))}

            {visibleCount < filteredDays.length && (
              <div ref={sentinelRef} className="feed-chunk-loader py-6 text-center">
                <button
                  type="button"
                  className="x-secondary-btn text-xs px-4 py-2 opacity-85 hover:opacity-100 transition-opacity"
                  onClick={() =>
                    setVisibleCount((prev) => Math.min(prev + CHUNK_SIZE, filteredDays.length))
                  }
                >
                  Показать ещё {CHUNK_SIZE} дней (показано {visibleDays.length} из {filteredDays.length})
                </button>
              </div>
            )}

            {visibleDays.length >= filteredDays.length && filteredDays.length > CHUNK_SIZE && (
              <div className="feed-chunk-end py-8 text-center text-xs text-muted">
                ✦ Начало пути · Летопись полностью загружена ({filteredDays.length} дней)
              </div>
            )}
          </>
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

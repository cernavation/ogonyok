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
    if (filter === 'Для тебя') {
      return days
    }
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

      {/* Sticky X.com feed header — translucent glass with hairline divider */}
      <header className="sticky top-[54px] z-30 border-b border-zinc-800/80 bg-black/80 backdrop-blur-md min-[761px]:top-0">
        {/* Title row (desktop only — mobile shows the app header) */}
        <div className="hidden items-center justify-between px-4 pb-1 pt-3 min-[761px]:flex">
          <h1 className="text-[20px] font-extrabold leading-[24px] tracking-[-0.03em] text-[#e7e9ea]">
            Главная
          </h1>
          <Tooltip content="Настройки ленты" side="left">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full text-[#71767b] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#e7e9ea]"
              aria-label="Настройки ленты"
            >
              <MoreHorizontal size={20} />
            </button>
          </Tooltip>
        </div>

        {/* Tab bar — Twitter Blue underline indicator */}
        <div className="no-scrollbar flex overflow-x-auto" role="tablist" aria-label="Фильтры ленты">
          {FEED_TABS.map((tab) => {
            const isSelected = filter === tab
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`relative flex-none whitespace-nowrap px-4 pb-[13px] pt-3 text-[15px] font-bold tracking-[-0.01em] transition-colors duration-150 ${
                  isSelected
                    ? 'text-[#e7e9ea]'
                    : 'text-[#71767b] hover:bg-white/[0.03] hover:text-[#e7e9ea]'
                }`}
                onClick={() => handleTabClick(tab)}
              >
                {tab}
                {isSelected && (
                  <span
                    className="absolute bottom-0 left-1/2 h-1 w-[calc(100%-32px)] min-w-[56px] -translate-x-1/2 rounded-full bg-[#1d9bf0]"
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* Inline "What's happening?" compose prompt — X.com style */}
      {onCompose && (
        <div
          className="flex cursor-pointer items-center gap-3 border-b border-zinc-800/80 px-4 py-3 transition-colors duration-150 hover:bg-white/[0.02]"
          onClick={onCompose}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onCompose?.() }}
          aria-label="Открыть форму записи дня"
        >
          {/* Mini avatar */}
          <div
            className="flex h-10 w-10 flex-none select-none items-center justify-center rounded-full text-sm font-bold"
            style={{
              background: 'linear-gradient(145deg, #7f95a3 0%, #7f95a3 35%, #d9ae8b 36%, #d9ae8b 66%, #29384b 67%)',
              color: '#fff',
              textShadow: '0 1px 2px #000',
            }}
            aria-hidden="true"
          >
            AC
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate select-none text-[19px] leading-[24px] text-[#71767b]">
              Что произошло сегодня?
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCompose?.() }}
            className="flex flex-none items-center gap-1.5 rounded-full bg-[#1d9bf0] px-4 py-[7px] text-[14px] font-bold text-white transition-colors duration-150 hover:bg-[#1a8cd8]"
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
            <h2 className="empty-state__title mt-2 text-lg font-bold">Твой огонёк готов к первому дню</h2>
            <p className="empty-state__desc mx-auto mt-1 mb-6 max-w-sm text-muted text-sm">
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
                  className="x-secondary-btn px-4 py-2 text-xs opacity-85 transition-opacity hover:opacity-100"
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

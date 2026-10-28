'use client'

import { Flame, MoreHorizontal, Plus, Image as ImageIcon, Sparkles, Smile } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FEED_TABS } from '@/lib/ogonek/data'
import { computeFocusFlame } from '@/lib/ogonek/morning-focus'
import { playClick } from '@/lib/ogonek/sound'
import { getInitials } from '@/lib/ogonek/initials'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { StreakStatus } from '@/lib/ogonek/streak'
import type { Day, MorningFocusRecord, ViewId } from '@/lib/ogonek/types'
import { Button } from '../ui'
import { DayCard } from '../day-card'
import { EveningReview } from '../evening-review'
import { FocusHistoryModal } from '../focus-history-modal'
import { MobileHeader } from '../mobile-header'
import { QuickFocus } from '../quick-focus'
import { StoriesBar } from '../stories-bar'
import { Tooltip } from '../tooltip'
import { LegacyMigrationBanner } from '../settings/legacy-migration-banner'

const CHUNK_SIZE = 20

type Props = {
  days: Day[]
  morningIntentions?: Record<string, [string, string, string]>
  /** ЭТАП 10: история утренних фокусов по дням с вечерней сверкой */
  morningFocusHistory?: Record<string, MorningFocusRecord>
  onSaveMorningIntentions?: (dateKey: string, focus: [string, string, string]) => void
  onMarkMorningFocusDone?: (dateKey: string, index: 0 | 1 | 2) => boolean
  onMarkMorningFocusMissed?: (dateKey: string, index: 0 | 1 | 2) => boolean
  onCompleteEveningReview?: (dateKey: string) => number
  onReopenEveningReview?: (dateKey: string) => void
  onRemoveMorningFocus?: (dateKey: string) => void
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
  userId?: string
  currentUsername?: string
}

export function HomeView({
  days,
  morningIntentions,
  morningFocusHistory,
  onSaveMorningIntentions,
  onMarkMorningFocusDone,
  onMarkMorningFocusMissed,
  onCompleteEveningReview,
  onReopenEveningReview,
  onRemoveMorningFocus,
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
  userId,
  currentUsername,
}: Props) {
  const { state, currentUser, loadDaysFromCloud } = useOgonekStore()
  const displayName = currentUser?.displayName || state.profile.displayName || 'Пользователь'
  const username = currentUsername || currentUser?.username || state.profile.username || 'user'
  const initials = getInitials(displayName, username)
  const avatarImage = currentUser?.avatarImage || state.profile.avatarImage
  const isOwner = (username || '').toLowerCase() === 'cernavation'

  // Автозагрузка дней из облака Supabase для cernavation, если локальный стейт пуст (на новом устройстве или после очистки)
  useEffect(() => {
    if (isOwner && (!days || days.length === 0)) {
      const targetUid = userId || currentUser?.id || state.auth.activeAccountId
      loadDaysFromCloud?.(targetUid)
    }
  }, [isOwner, days?.length, userId, currentUser?.id, state.auth.activeAccountId, loadDaysFromCloud])

  const [filter, setFilter] = useState<string>('Мои гордости')
  const [visibleCount, setVisibleCount] = useState<number>(CHUNK_SIZE)
  const [historyOpen, setHistoryOpen] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const todayKey = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  const focusHistory = useMemo(() => morningFocusHistory ?? {}, [morningFocusHistory])
  const todayFocusRecord = focusHistory[todayKey]
  const focusFlameStats = useMemo(
    () => computeFocusFlame(focusHistory, todayKey),
    [focusHistory, todayKey]
  )

  const handleScrollToReview = () => {
    document.getElementById('evening-review')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const filteredDays = useMemo(() => {
    if (filter === 'Мои гордости') {
      return days
    }
    if (filter === 'Друзья') {
      return days
    }
    if (filter === 'Подписки') {
      return days
    }
    return days.filter((d) => d.tags && d.tags.includes(filter))
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
    <div className="view-home w-full max-w-[620px] min-h-screen border-r border-[#2f3336] shrink-0">
      <MobileHeader
        title="Главная"
        streak={state.days.length || streak}
        streakStatus={streakStatus}
        hoursLeft={hoursLeft}
        userInitials={initials}
        userName={displayName}
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
              className="muted w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="Настройки ленты"
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

      {/* Inline composer — X.com canonical layout */}
      {onCompose && (
        <div
          className="flex gap-3 px-4 pt-3 pb-3 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--bg-hover-post)] transition-colors duration-150"
          onClick={onCompose}
          role="region"
          aria-label="Создать запись дня"
        >
          {avatarImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarImage}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-[var(--border)] mt-0.5"
            />
          ) : (
            <div
              className="avatar w-10 h-10 rounded-full flex-none flex items-center justify-center font-bold text-sm select-none text-white shadow-sm mt-0.5"
              style={{
                background: 'linear-gradient(135deg, #FF6A1A 0%, #FF8533 50%, #2F3336 100%)',
              }}
              aria-hidden="true"
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="py-2 text-[var(--text-2)] text-[18px] font-normal select-none">
              Чем гордишься сегодня?
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] mt-1">
              <div className="flex items-center gap-1 -ml-2 text-[var(--accent)]" aria-label="Инструменты записи">
                <span className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--accent-soft)] transition-colors">
                  <ImageIcon size={18} />
                </span>
                <span className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--accent-soft)] transition-colors">
                  <Sparkles size={18} />
                </span>
                <span className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--accent-soft)] transition-colors">
                  <Smile size={18} />
                </span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onCompose?.()
                }}
                className="font-bold min-h-[36px]"
              >
                Записать
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="feed-content">
        {isOwner && userId && (
          <div className="px-4 pt-3">
            <LegacyMigrationBanner
              userId={userId}
              localDaysCount={days.length}
              localDays={days}
              soundEnabled={soundEnabled}
              onNotify={onNotify}
              onCompleted={() => {
                setTimeout(() => {
                  window.location.reload()
                }, 1200)
              }}
            />
          </div>
        )}

        <QuickFocus
          initialFocus={morningIntentions?.[todayKey]}
          record={todayFocusRecord}
          stats={focusFlameStats}
          onSave={(focus) => onSaveMorningIntentions?.(todayKey, focus)}
          onOpenHistory={() => setHistoryOpen(true)}
          onFocusReview={handleScrollToReview}
          notify={onNotify}
          soundEnabled={soundEnabled}
        />

        {todayFocusRecord && onMarkMorningFocusDone && onMarkMorningFocusMissed && onCompleteEveningReview && onReopenEveningReview && (
          <EveningReview
            dateKey={todayKey}
            record={todayFocusRecord}
            notify={onNotify}
            soundEnabled={soundEnabled}
            onMarkDone={onMarkMorningFocusDone}
            onMarkMissed={onMarkMorningFocusMissed}
            onComplete={onCompleteEveningReview}
            onReopen={onReopenEveningReview}
          />
        )}

        {days.length === 0 ? (
          <div className="empty-state py-12 text-center" role="status">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-[#ff6b35]/10 text-[#ff6b35] mx-auto mb-2" aria-hidden="true">
              <Flame size={28} className="fill-[#ff6b35]/20 text-[#ff6b35]" />
            </span>
            <h2 className="empty-state__title text-lg font-bold mt-2">Твой огонёк готов к первому дню</h2>
            <p className="empty-state__desc text-muted text-sm max-w-sm mx-auto mt-1 mb-6">
              Фиксируй 5 поводов для гордости каждый день, чтобы замечать свою силу и сохранять внутреннюю опору.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto my-2">
              {onCompose && (
                <button
                  type="button"
                  className="x-primary-btn flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3"
                  onClick={onCompose}
                >
                  <Plus size={16} /> Записать первый день
                </button>
              )}
              {onNavigate && (
                <button
                  type="button"
                  className="x-secondary-btn flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3"
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
          <div className="empty-state p-8 text-center" role="status">
            <p className="empty-state__title font-bold text-sm text-[var(--text)] mb-1">
              {filter === 'Друзья'
                ? 'В ленте друзей пока пусто'
                : filter === 'Подписки'
                ? 'У вас пока нет подписок'
                : 'Ничего не найдено'}
            </p>
            <p className="empty-state__desc text-xs text-[var(--text-2)]">
              {filter === 'Друзья'
                ? 'Подпишитесь на соратников в разделе «Поиск», чтобы видеть их огонь и гордости.'
                : filter === 'Подписки'
                ? 'Здесь будут отображаться записи людей, на которых вы подписались.'
                : `Записей с тегом «${filter}» пока нет. Нажмите «+», чтобы создать запись.`}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {historyOpen && (
          <FocusHistoryModal
            history={focusHistory}
            todayKey={todayKey}
            onClose={() => setHistoryOpen(false)}
            onRemove={(dateKey) => onRemoveMorningFocus?.(dateKey)}
            notify={onNotify}
            soundEnabled={soundEnabled}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

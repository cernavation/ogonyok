'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Flame,
  MessageSquare,
  PhoneMissed,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { getInitials } from '@/lib/ogonek/initials'
import type { OgonekNotification } from '@/lib/ogonek/types'

type Props = {
  notifications: OgonekNotification[]
  unreadCount: number
  onMarkAllRead: () => void
  onMarkRead?: (id: string) => void
  onOpenFriends?: () => void
  onOpenChat?: (friendId: string) => void
  onNavigate?: (view: any) => void
}

function formatNotificationTime(isoStr: string): string {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function getDayCategory(isoStr: string): 'today' | 'yesterday' | 'older' {
  if (!isoStr) return 'older'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return 'older'

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000

  const time = d.getTime()
  if (time >= todayStart) return 'today'
  if (time >= yesterdayStart) return 'yesterday'
  return 'older'
}

export function NotificationsPopover({
  notifications = [],
  unreadCount = 0,
  onMarkAllRead,
  onMarkRead,
  onOpenFriends,
  onOpenChat,
  onNavigate,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Закрытие при клике снаружи
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Закрытие по Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Группировка уведомлений по дням
  const grouped = useMemo(() => {
    const today: OgonekNotification[] = []
    const yesterday: OgonekNotification[] = []
    const older: OgonekNotification[] = []

    for (const item of notifications) {
      const cat = getDayCategory(item.createdAtISO)
      if (cat === 'today') today.push(item)
      else if (cat === 'yesterday') yesterday.push(item)
      else older.push(item)
    }

    return { today, yesterday, older }
  }, [notifications])

  const handleItemClick = (n: OgonekNotification) => {
    if (!n.isRead && onMarkRead) {
      onMarkRead(n.id)
    }
    setIsOpen(false)

    if (n.type === 'friend_request' || n.type === 'friend_accepted') {
      onOpenFriends?.()
    } else if (n.type === 'friend_day') {
      const targetTab = n.data?.tab === 'following' ? 'following' : 'friends'
      const dayId = n.data?.dayId || n.data?.dayNumber
      const actorId = n.data?.actorId || null
      if (typeof window !== 'undefined' && dayId != null) {
        const params = new URLSearchParams({
          tab: targetTab,
          highlightDay: String(dayId),
        })
        if (actorId) params.set('authorId', String(actorId))
        window.history.pushState(null, '', `/app?${params.toString()}`)
        onNavigate?.('home')
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('ogonek:focus-feed-day', {
              detail: { tab: targetTab, dayId: Number(dayId), userId: actorId },
            })
          )
        }, 60)
      } else {
        onNavigate?.('home')
      }
    } else if (n.type === 'missed_call' || n.type === 'message') {
      const peerId = n.data?.fromUserId || n.data?.friendId
      if (peerId && onOpenChat) {
        onOpenChat(peerId)
      } else {
        onNavigate?.('messages')
      }
    } else if (n.type === 'milestone') {
      onNavigate?.('home')
    }
  }

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Кнопка колокольчика */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors relative"
        aria-label="Уведомления"
        aria-expanded={isOpen}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[var(--accent,#FF6A1A)] text-white text-[10px] font-bold flex items-center justify-center shadow-sm pointer-events-none leading-none"
            aria-label={`${unreadCount} непрочитанных уведомлений`}
          >
            {badgeText}
          </span>
        )}
      </button>

      {/* Поповер со списком */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] max-h-[480px] bg-[var(--surface,#16181c)]/98 backdrop-blur-xl border border-[var(--border,#2f3336)] shadow-2xl rounded-2xl z-50 flex flex-col overflow-hidden text-[var(--text)] select-none"
          >
            {/* Шапка поповера */}
            <div className="px-4 py-3 border-b border-[var(--line,#2f3336)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[15px] tracking-tight">Уведомления</span>
                {unreadCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-semibold">
                    {unreadCount} новых
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="text-xs text-[var(--accent)] hover:underline font-medium"
                  >
                    Прочитать все
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/10 transition-colors"
                  aria-label="Закрыть уведомления"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Тело поповера: скроллируемый список */}
            <div className="overflow-y-auto flex-1 divide-y divide-[var(--line,#2f3336)]/40 scrollbar-none">
              {notifications.length === 0 ? (
                /* Пустое состояние */
                <div className="p-8 flex flex-col items-center justify-center text-center text-[var(--muted)]">
                  <div className="w-12 h-12 rounded-full bg-[var(--surface2,#202327)] flex items-center justify-center mb-3 text-[var(--muted)]">
                    <BellOff size={22} />
                  </div>
                  <div className="font-semibold text-sm text-[var(--text)] mb-1">
                    Все уведомления прочитаны
                  </div>
                  <div className="text-xs text-[var(--muted)] max-w-[240px]">
                    Здесь будут появляться заявки в друзья, пропущенные звонки и победные вехи.
                  </div>
                </div>
              ) : (
                <>
                  {/* Сегодня */}
                  {grouped.today.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] bg-[var(--surface2,#202327)]/40">
                        Сегодня
                      </div>
                      {grouped.today.map((item) => (
                        <NotificationRow
                          key={item.id}
                          item={item}
                          onClick={() => handleItemClick(item)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Вчера */}
                  {grouped.yesterday.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] bg-[var(--surface2,#202327)]/40">
                        Вчера
                      </div>
                      {grouped.yesterday.map((item) => (
                        <NotificationRow
                          key={item.id}
                          item={item}
                          onClick={() => handleItemClick(item)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Ранее */}
                  {grouped.older.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] bg-[var(--surface2,#202327)]/40">
                        Ранее
                      </div>
                      {grouped.older.map((item) => (
                        <NotificationRow
                          key={item.id}
                          item={item}
                          onClick={() => handleItemClick(item)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NotificationRow({
  item,
  onClick,
}: {
  item: OgonekNotification
  onClick: () => void
}) {
  const time = formatNotificationTime(item.createdAtISO)

  const renderIcon = () => {
    switch (item.type) {
      case 'friend_request':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
            <UserPlus size={16} />
          </div>
        )
      case 'friend_accepted':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck size={16} />
          </div>
        )
      case 'missed_call':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
            <PhoneMissed size={16} />
          </div>
        )
      case 'milestone':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <Flame size={16} className="fill-amber-500" />
          </div>
        )
      case 'friend_day':
        return (
          <div className="w-8 h-8 rounded-full bg-[#ff5a1f]/15 text-[#ff5a1f] flex items-center justify-center shrink-0">
            <Flame size={16} />
          </div>
        )
      case 'message':
        return (
          <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0">
            <MessageSquare size={16} />
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
            <Bell size={16} />
          </div>
        )
    }
  }

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={`px-4 py-3 flex items-start gap-3 hover:bg-white/[0.04] active:bg-white/[0.08] cursor-pointer transition-colors relative ${
        !item.isRead ? 'bg-[var(--accent)]/[0.04]' : ''
      }`}
    >
      {renderIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1 mb-0.5">
          <span className={`text-[13px] truncate ${!item.isRead ? 'font-bold text-[var(--text)]' : 'font-medium text-[var(--text-2)]'}`}>
            {item.title}
          </span>
          <span className="text-[11px] text-[var(--muted)] shrink-0">{time}</span>
        </div>
        <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed">
          {item.body}
        </p>
      </div>
      {!item.isRead && (
        <span className="w-2 h-2 rounded-full bg-[var(--accent,#FF6A1A)] shrink-0 self-center" />
      )}
    </div>
  )
}

'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  CheckCheck,
  Flame,
  Heart,
  Loader2,
  MessageCircle,
  PhoneMissed,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from '@/lib/ogonek/notifications'
import { respondFriendRequest } from '@/lib/ogonek/social'
import { getInitials } from '@/lib/ogonek/initials'
import { playClick } from '@/lib/ogonek/sound'
import type { ViewId } from '@/lib/ogonek/types'

type Props = {
  isOpen: boolean
  onClose: () => void
  onNavigate: (view: ViewId, targetUserId?: string | null) => void
  onNotify: (msg: string) => void
  currentUserId?: string | null
}

export function NotificationCenterModal({
  isOpen,
  onClose,
  onNavigate,
  onNotify,
  currentUserId,
}: Props) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    const data = await listNotifications(50)
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadItems()
    }
  }, [isOpen, loadItems])

  const handleMarkAllRead = async () => {
    playClick(true)
    const count = await markAllNotificationsRead()
    setItems((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })))
    onNotify(`Все уведомления прочитаны (${count})`)
  }

  const handleItemClick = async (item: NotificationItem) => {
    playClick(true)
    if (!item.read_at) {
      markNotificationRead(item.id)
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, read_at: new Date().toISOString() } : i))
      )
    }

    onClose()

    if (item.type === 'friend_request' || item.type === 'friend_accepted') {
      onNavigate('comrades')
    } else if (item.type === 'new_message' || item.type === 'missed_call') {
      if (item.actor_id) {
        onNavigate('messages', item.actor_id)
      } else {
        onNavigate('messages')
      }
    } else {
      onNavigate('home')
    }
  }

  const handleAcceptComrade = async (item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation()
    const friendshipId = item.payload?.friendship_id
    if (!friendshipId || actionBusyId) return

    setActionBusyId(item.id)
    const res = await respondFriendRequest(friendshipId, true)
    setActionBusyId(null)

    if (res.ok) {
      markNotificationRead(item.id)
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, read_at: new Date().toISOString() } : i))
      )
      onNotify('Заявка в соратники принята!')
    } else {
      onNotify(res.error || 'Не удалось принять заявку. Проверьте интернет и повторите попытку.')
    }
  }

  // Группировка по дням: «Сегодня», «Вчера», «Ранее»
  const groupedNotifications = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = yesterdayDate.toISOString().split('T')[0]

    const groups: { label: string; items: NotificationItem[] }[] = [
      { label: 'Сегодня', items: [] },
      { label: 'Вчера', items: [] },
      { label: 'Ранее', items: [] },
    ]

    items.forEach((item) => {
      const itemDate = item.created_at.split('T')[0]
      if (itemDate === today) {
        groups[0].items.push(item)
      } else if (itemDate === yesterday) {
        groups[1].items.push(item)
      } else {
        groups[2].items.push(item)
      }
    })

    return groups.filter((g) => g.items.length > 0)
  }, [items])

  const unreadCount = useMemo(() => items.filter((i) => !i.read_at).length, [items])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-center-title"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[85vh] bg-[#16181c] border border-white/10 rounded-3xl 
          shadow-2xl flex flex-col overflow-hidden text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <h2 id="notification-center-title" className="font-bold text-base leading-tight">
                Уведомления
              </h2>
              {unreadCount > 0 && (
                <span className="text-xs text-neutral-400 font-medium">
                  {unreadCount} непрочитанных
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-[var(--accent)] hover:text-white px-2.5 py-1.5 
                  rounded-xl hover:bg-white/5 transition flex items-center gap-1.5"
                title="Отметить все прочитанными"
              >
                <CheckCheck size={14} />
                <span className="hidden sm:inline">Прочитать все</span>
              </button>
            )}

            <button
              type="button"
              aria-label="Закрыть центр уведомлений"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white 
                flex items-center justify-center transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Loader2 className="animate-spin text-[var(--accent)] mb-3" size={24} />
              <p className="text-xs text-neutral-400">Загрузка уведомлений...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 mb-4 shadow-inner">
                <Bell size={28} />
              </div>
              <h3 className="font-bold text-base text-white mb-1">Пока нет уведомлений</h3>
              <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                Здесь будут появляться заявки от соратников, сообщения и реакции на твои победы.
              </p>
            </div>
          ) : (
            groupedNotifications.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-2">
                  {group.label}
                </div>

                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const isUnread = !item.read_at
                    const actorName = item.title || 'Соратник'
                    const initials = getInitials(actorName, '')

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                          isUnread
                            ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 hover:bg-[var(--accent)]/15'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                        }`}
                      >
                        {/* Аватар */}
                        <div className="relative shrink-0 mt-0.5">
                          {item.payload?.actor_avatar || item.payload?.sender_avatar ? (
                            <img
                              src={item.payload.actor_avatar || item.payload.sender_avatar}
                              alt={actorName}
                              className="w-10 h-10 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ff6b35] to-[#f97316] flex items-center justify-center font-bold text-white text-xs">
                              {initials}
                            </div>
                          )}

                          {/* Мини-иконка типа */}
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#16181c] border border-white/10 flex items-center justify-center">
                            {item.type === 'missed_call' ? (
                              <PhoneMissed size={9} className="text-rose-400" />
                            ) : item.type === 'friend_request' ? (
                              <UserPlus size={9} className="text-amber-400" />
                            ) : item.type === 'reaction' ? (
                              <Flame size={9} className="text-orange-400" />
                            ) : (
                              <MessageCircle size={9} className="text-[var(--accent)]" />
                            )}
                          </div>
                        </div>

                        {/* Текст */}
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-semibold text-xs text-white truncate">
                              {actorName}
                            </span>
                            <span className="text-[10px] text-neutral-500 shrink-0">
                              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs text-neutral-300 leading-snug">
                            {item.body}
                          </p>

                          {/* Кнопка быстрого действия для заявки */}
                          {item.type === 'friend_request' && !item.read_at && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <button
                                type="button"
                                disabled={actionBusyId === item.id}
                                onClick={(e) => handleAcceptComrade(item, e)}
                                className="px-3 py-1 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                              >
                                {actionBusyId === item.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <UserCheck size={12} />
                                )}
                                Принять
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Точка непрочитанного */}
                        {isUnread && (
                          <div className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0 mt-2" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}

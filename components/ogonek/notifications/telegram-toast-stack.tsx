'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MessageCircle, PhoneMissed, Send, UserPlus, X } from 'lucide-react'
import { getInitials } from '@/lib/ogonek/initials'
import { playClick } from '@/lib/ogonek/sound'
import type { ViewId } from '@/lib/ogonek/types'

export interface TelegramToastItem {
  id: string
  type: 'new_message' | 'missed_call' | 'friend_request' | 'friend_accepted' | 'reaction' | 'comment' | 'system'
  title: string
  body: string
  avatarUrl?: string | null
  senderId?: string
  threadKey?: string
  createdAt: number
}

type Props = {
  activeView: ViewId
  activeChatFriendId?: string | null
  onNavigate: (view: ViewId, targetUserId?: string | null) => void
  onSendQuickReply?: (friendId: string, text: string) => Promise<any> | void
}

const TOAST_DURATION_MS = 6000

export function TelegramToastStack({
  activeView,
  activeChatFriendId,
  onNavigate,
  onSendQuickReply,
}: Props) {
  const [toasts, setToasts] = useState<TelegramToastItem[]>([])
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Хранилище оставшегося времени для каждого тоста (для паузы при hover)
  const timersRef = useRef<Map<string, { timeoutId: NodeJS.Timeout; remaining: number; startedAt: number }>>(new Map())

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer.timeoutId)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (replyOpenId === id) {
      setReplyOpenId(null)
      setReplyText('')
    }
  }, [replyOpenId])

  // Запуск таймера автозакрытия
  const scheduleToastClose = useCallback((id: string, durationMs: number) => {
    const timeoutId = setTimeout(() => {
      removeToast(id)
    }, durationMs)

    timersRef.current.set(id, {
      timeoutId,
      remaining: durationMs,
      startedAt: Date.now(),
    })
  }, [removeToast])

  // Пауза при наведении
  const handleMouseEnter = (id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer.timeoutId)
      const elapsed = Date.now() - timer.startedAt
      const remaining = Math.max(1000, timer.remaining - elapsed)
      timersRef.current.set(id, {
        timeoutId: timer.timeoutId,
        remaining,
        startedAt: Date.now(),
      })
    }
  }

  // Возобновление при уходе курсора
  const handleMouseLeave = (id: string) => {
    // Если открыт инпут быстрого ответа — не закрываем автоматически
    if (replyOpenId === id) return
    const timer = timersRef.current.get(id)
    if (timer) {
      scheduleToastClose(id, timer.remaining)
    }
  }

  // Слушатель событий новых всплывающих уведомлений
  useEffect(() => {
    const handleAddToast = (e: CustomEvent<Omit<TelegramToastItem, 'createdAt'>>) => {
      const item = e.detail
      if (!item) return

      // КРИТИЧЕСКОЕ ПРАВИЛО: НЕ показывать тост, если пользователь уже смотрит этот чат в активной вкладке
      const isViewingThisChat =
        typeof document !== 'undefined' &&
        document.hasFocus() &&
        activeView === 'messages' &&
        item.senderId &&
        activeChatFriendId === item.senderId

      if (isViewingThisChat) {
        return
      }

      const toastItem: TelegramToastItem = {
        ...item,
        createdAt: Date.now(),
      }

      setToasts((prev) => {
        // Ограничиваем стек максимум 3 штуками
        const filtered = prev.filter((t) => t.id !== toastItem.id)
        const next = [toastItem, ...filtered].slice(0, 3)
        return next
      })

      scheduleToastClose(toastItem.id, TOAST_DURATION_MS)
    }

    window.addEventListener('ogonek:toast' as any, handleAddToast as any)
    return () => {
      window.removeEventListener('ogonek:toast' as any, handleAddToast as any)
      timersRef.current.forEach((t) => clearTimeout(t.timeoutId))
      timersRef.current.clear()
    }
  }, [activeView, activeChatFriendId, scheduleToastClose])

  const handleToastClick = (toast: TelegramToastItem) => {
    playClick(true)
    removeToast(toast.id)
    if (toast.type === 'friend_request' || toast.type === 'friend_accepted') {
      onNavigate('comrades')
    } else if (toast.senderId) {
      onNavigate('messages', toast.senderId)
    } else {
      onNavigate('messages')
    }
  }

  const handleSendQuickReply = async (toast: TelegramToastItem, e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!replyText.trim() || !toast.senderId || sendingReply) return

    setSendingReply(true)
    try {
      if (onSendQuickReply) {
        await onSendQuickReply(toast.senderId, replyText.trim())
      }
      removeToast(toast.id)
    } catch {
      // Игнорируем
    } finally {
      setSendingReply(false)
      setReplyText('')
      setReplyOpenId(null)
    }
  }

  if (toasts.length === 0) return null

  return (
    <aside
      className="fixed z-[100] flex flex-col gap-2 pointer-events-none transition-all
        top-2 inset-x-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[380px]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      aria-label="Всплывающие уведомления"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const isQuickReply = replyOpenId === toast.id
          const initials = getInitials(toast.title, '')

          return (
            <motion.div
              key={toast.id}
              layout={!prefersReducedMotion}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.95 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onMouseEnter={() => handleMouseEnter(toast.id)}
              onMouseLeave={() => handleMouseLeave(toast.id)}
              onClick={() => handleToastClick(toast)}
              className="pointer-events-auto w-full rounded-2xl bg-[#16181c]/95 hover:bg-[#1c1f24] 
                border border-white/10 p-3 shadow-2xl backdrop-blur-xl cursor-pointer 
                select-none transition-colors group relative overflow-hidden"
              role="alert"
            >
              <div className="flex items-start gap-3">
                {/* Аватар отправителя */}
                <div className="relative shrink-0">
                  {toast.avatarUrl ? (
                    <img
                      src={toast.avatarUrl}
                      alt={toast.title}
                      className="w-11 h-11 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#ff6b35] to-[#f97316] 
                      flex items-center justify-center font-bold text-white text-xs shadow-md">
                      {initials}
                    </div>
                  )}

                  {/* Иконка типа уведомления */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#16181c] border border-white/10 flex items-center justify-center">
                    {toast.type === 'missed_call' ? (
                      <PhoneMissed size={11} className="text-rose-400" />
                    ) : toast.type === 'friend_request' ? (
                      <UserPlus size={11} className="text-amber-400" />
                    ) : (
                      <MessageCircle size={11} className="text-[var(--accent)]" />
                    )}
                  </div>
                </div>

                {/* Текстовая колонка */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-[13px] text-white truncate">
                      {toast.title}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                      сейчас
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                    {toast.body}
                  </p>

                  {/* Кнопка «Ответить» для сообщений */}
                  {toast.type === 'new_message' && !isQuickReply && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setReplyOpenId(toast.id)
                          handleMouseEnter(toast.id)
                        }}
                        className="text-[11px] font-semibold text-[var(--accent)] hover:text-white 
                          bg-[var(--accent)]/10 hover:bg-[var(--accent)] px-2.5 py-1 rounded-lg 
                          transition-colors active:scale-95"
                      >
                        Ответить
                      </button>
                    </div>
                  )}
                </div>

                {/* Кнопка закрытия ✕ */}
                <button
                  type="button"
                  aria-label="Закрыть уведомление"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeToast(toast.id)
                  }}
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center 
                    text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Быстрый ответ прямо в тосте */}
              <AnimatePresence>
                {isQuickReply && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={(e) => handleSendQuickReply(toast, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder="Быстрый ответ..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 
                        text-xs text-white placeholder-neutral-500 outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || sendingReply}
                      className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold 
                        disabled:opacity-40 hover:bg-[var(--accent-hover)] transition flex items-center gap-1"
                    >
                      <Send size={12} />
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </aside>
  )
}

/**
 * Хелпер отправки всплывающего тоста из любого места приложения
 */
export function dispatchTelegramToast(toast: Omit<TelegramToastItem, 'createdAt'>): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('ogonek:toast', { detail: toast }))
}

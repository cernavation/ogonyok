'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  Check,
  Flame,
  Mic,
  PhoneMissed,
  Send,
  UserPlus,
  X,
} from 'lucide-react'
import { getInitials } from '@/lib/ogonek/initials'

export type DesktopToast = {
  id: string
  type: 'chat' | 'friend_request' | 'missed_call' | 'milestone' | 'system'
  title: string
  body: string
  avatarUrl?: string
  initials?: string
  mediaType?: 'voice' | 'photo' | 'text' | 'call' | 'milestone'
  peerId?: string
  threadKey?: string
  createdAt: number
  timeoutMs?: number
}

type Props = {
  toasts: DesktopToast[]
  onDismiss: (id: string) => void
  onClickToast: (toast: DesktopToast) => void
  onSendReply?: (toast: DesktopToast, text: string) => Promise<void> | void
}

export function DesktopToastStack({
  toasts,
  onDismiss,
  onClickToast,
  onSendReply,
}: Props) {
  // По правилу шага 07: максимум 3 в стеке одновременно
  const visibleToasts = toasts.slice(-3)

  return (
    <div
      aria-live="polite"
      aria-label="Всплывающие уведомления"
      className="desktop-toast-stack fixed z-50 pointer-events-none flex flex-col gap-2.5 transition-all
        /* Desktop: справа сверху */
        top-4 right-4 max-w-[360px] w-full
        /* Mobile: сверху по центру с safe-area */
        max-sm:top-2 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:max-w-[92vw] max-sm:pt-[env(safe-area-inset-top,0px)]"
    >
      {visibleToasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          onClick={() => onClickToast(toast)}
          onSendReply={onSendReply ? (text) => onSendReply(toast, text) : undefined}
        />
      ))}
    </div>
  )
}

function ToastCard({
  toast,
  onDismiss,
  onClick,
  onSendReply,
}: {
  toast: DesktopToast
  onDismiss: () => void
  onClick: () => void
  onSendReply?: (text: string) => Promise<void> | void
}) {
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const remainingTimeRef = useRef(toast.timeoutMs ?? 6000)
  const timerStartRef = useRef(Date.now())
  const timerIdRef = useRef<NodeJS.Timeout | null>(null)

  // Таймер авто-закрытия (6 секунд) с поддержкой паузы при наведении (hover)
  useEffect(() => {
    if (isPaused) {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current)
        timerIdRef.current = null
      }
      const elapsed = Date.now() - timerStartRef.current
      remainingTimeRef.current = Math.max(500, remainingTimeRef.current - elapsed)
      return
    }

    timerStartRef.current = Date.now()
    timerIdRef.current = setTimeout(() => {
      onDismiss()
    }, remainingTimeRef.current)

    return () => {
      if (timerIdRef.current) clearTimeout(timerIdRef.current)
    }
  }, [isPaused, onDismiss])

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const text = replyText.trim()
    if (!text || isSending || !onSendReply) return

    setIsSending(true)
    try {
      await onSendReply(text)
      setIsSent(true)
      setReplyText('')
      setTimeout(() => {
        onDismiss()
      }, 700)
    } catch {
      setIsSending(false)
    }
  }

  const initials =
    toast.initials ||
    (toast.title ? getInitials(toast.title, '') : 'О')

  const renderPreview = () => {
    if (toast.mediaType === 'voice' || toast.body?.startsWith('🎤') || toast.body?.includes('Голосовое')) {
      return (
        <span className="flex items-center gap-1.5 text-[13px] text-[var(--accent,#FF6A1A)] font-medium">
          <Mic size={14} className="shrink-0" />
          <span>{toast.body || 'Голосовое сообщение'}</span>
        </span>
      )
    }
    if (toast.mediaType === 'photo' || toast.body?.startsWith('📷') || toast.body?.includes('Фото')) {
      return (
        <span className="flex items-center gap-1.5 text-[13px] text-[var(--accent,#FF6A1A)] font-medium">
          <Camera size={14} className="shrink-0" />
          <span>{toast.body || 'Фотография'}</span>
        </span>
      )
    }
    if (toast.type === 'missed_call' || toast.body?.includes('Пропущенный звонок')) {
      return (
        <span className="flex items-center gap-1.5 text-[13px] text-rose-500 font-medium">
          <PhoneMissed size={14} className="shrink-0" />
          <span>{toast.body || 'Пропущенный звонок'}</span>
        </span>
      )
    }
    if (toast.type === 'milestone') {
      return (
        <span className="flex items-center gap-1.5 text-[13px] text-amber-400 font-semibold">
          <Flame size={14} className="shrink-0 fill-amber-400" />
          <span>{toast.body || 'Твой огонь горит непрерывно!'}</span>
        </span>
      )
    }

    return (
      <span className="text-[13px] text-[var(--text-2,#71767b)] line-clamp-2 leading-relaxed">
        {toast.body}
      </span>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.94, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={onClick}
      role="alert"
      className="desktop-toast toast-item pointer-events-auto w-full bg-[var(--surface,#16181c)]/95 backdrop-blur-xl border border-[var(--border,#2f3336)] shadow-[0_12px_36px_rgba(0,0,0,0.55)] rounded-2xl p-3 text-[var(--text,#e7e9ea)] cursor-pointer select-none transition-transform hover:scale-[1.01]"
    >
      {/* Верхний ряд: Аватар + Имя + Время + Кнопка закрытия */}
      <div className="flex items-center gap-2.5 mb-1.5">
        {toast.type === 'milestone' ? (
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Flame size={18} className="fill-amber-500" />
          </div>
        ) : toast.type === 'friend_request' ? (
          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
            <UserPlus size={16} />
          </div>
        ) : toast.type === 'missed_call' ? (
          <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/30">
            <PhoneMissed size={16} />
          </div>
        ) : toast.avatarUrl ? (
          <img
            src={toast.avatarUrl}
            alt={toast.title}
            className="w-8 h-8 rounded-full object-cover shrink-0 border border-[var(--line,#2f3336)]"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--surface2,#202327)] text-[var(--text)] flex items-center justify-center text-xs font-bold shrink-0 border border-[var(--line,#2f3336)]">
            {initials.charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-[var(--text,#e7e9ea)] truncate">
            {toast.title}
          </div>
        </div>

        <span className="text-[11px] text-[var(--muted,#71767b)] shrink-0">
          только что
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--muted,#71767b)] hover:text-[var(--text)] hover:bg-white/10 transition-colors shrink-0"
          aria-label="Закрыть уведомление"
        >
          <X size={13} />
        </button>
      </div>

      {/* Ряд превью */}
      <div className="pl-[42px] pr-1 mb-2">
        {renderPreview()}
      </div>

      {/* Поле быстрого ответа (только для личных сообщений чата) */}
      {toast.type === 'chat' && onSendReply && (
        <form
          onSubmit={handleSendReply}
          onClick={(e) => e.stopPropagation()}
          className="pl-[42px] flex items-center gap-1.5 mt-1"
        >
          {isSent ? (
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium py-1">
              <Check size={14} />
              <span>Отправлено ✓</span>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Быстрый ответ..."
                className="flex-1 bg-[var(--bg,#000)]/70 border border-[var(--line,#2f3336)] focus:border-[var(--accent,#FF6A1A)] rounded-xl px-2.5 py-1 text-xs text-[var(--text,#e7e9ea)] placeholder-[var(--muted,#71767b)] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || isSending}
                aria-label="Отправить ответ"
                className="w-7 h-7 rounded-xl bg-[var(--accent,#FF6A1A)] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all shrink-0"
              >
                <Send size={12} />
              </button>
            </>
          )}
        </form>
      )}
    </motion.div>
  )
}

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
  Sparkles,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react'
import { getInitials } from '@/lib/ogonek/initials'
import { isPridayChat } from '@/lib/ogonek/priday-system-chat'
import { UserAvatar, VerifiedBadge } from '../ui'

export type DesktopToast = {
  id: string
  type: 'chat' | 'friend_request' | 'missed_call' | 'milestone' | 'friend_day' | 'system'
  variant?: 'default' | 'milestone'
  milestoneTier?: 10 | 50 | 100
  days?: number
  dayId?: number
  actorId?: string | null
  targetTab?: 'friends' | 'following'
  title: string
  body: string
  avatarUrl?: string
  avatarColor?: string
  initials?: string
  verified?: boolean
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

const SPARKLE_PARTICLES = [
  { x: -16, y: -14, delay: 0.04, size: 5, gold: true },
  { x: 18, y: -18, delay: 0.09, size: 4, gold: false },
  { x: 34, y: 4, delay: 0.14, size: 4, gold: true },
  { x: -24, y: 12, delay: 0.1, size: 3.5, gold: false },
  { x: 6, y: 22, delay: 0.18, size: 4, gold: true },
  { x: 46, y: -10, delay: 0.06, size: 3.5, gold: false },
] as const

export function DesktopToastStack({
  toasts,
  onDismiss,
  onClickToast,
  onSendReply,
}: Props) {
  const visibleToasts = toasts.slice(-3)

  return (
    <div
      aria-live="polite"
      aria-label="Всплывающие уведомления"
      className="desktop-toast-stack fixed z-50 pointer-events-none flex flex-col gap-2.5
        top-4 right-4 max-w-[376px] w-full
        max-sm:top-2 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:max-w-[92vw] max-sm:pt-[env(safe-area-inset-top,0px)]"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {visibleToasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => onDismiss(toast.id)}
            onClick={() => onClickToast(toast)}
            onSendReply={onSendReply ? (text) => onSendReply(toast, text) : undefined}
          />
        ))}
      </AnimatePresence>
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
  const remainingTimeRef = useRef(toast.timeoutMs ?? (toast.type === 'milestone' ? 8500 : 6500))
  const timerStartRef = useRef(Date.now())
  const timerIdRef = useRef<NodeJS.Timeout | null>(null)

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
      }, 650)
    } catch {
      setIsSending(false)
    }
  }

  const isMilestone = toast.variant === 'milestone' || toast.type === 'milestone'
  const isCentury =
    isMilestone &&
    (toast.milestoneTier === 100 ||
      (typeof toast.days === 'number' && toast.days >= 100 && toast.days % 100 === 0))
  const isPridaySender = isPridayChat(toast.peerId) || toast.title === 'Priday'
  const showVerified = Boolean(toast.verified || isPridaySender)
  const hasDraft = replyText.trim().length > 0
  const initials = toast.initials || (toast.title ? getInitials(toast.title, '') : 'P')

  const renderPreview = () => {
    if (
      toast.mediaType === 'voice' ||
      toast.body?.startsWith('🎤') ||
      toast.body?.includes('Голосовое')
    ) {
      return (
        <span className="flex items-center gap-1.5 text-[13px] text-[#ff5a1f] font-medium">
          <Mic size={14} className="shrink-0" />
          <span className="truncate">{toast.body || 'Голосовое сообщение'}</span>
        </span>
      )
    }
    if (
      toast.mediaType === 'photo' ||
      toast.body?.startsWith('📷') ||
      toast.body?.includes('Фото')
    ) {
      return (
        <span className="flex items-center gap-1.5 text-[13px] text-[#ff5a1f] font-medium">
          <Camera size={14} className="shrink-0" />
          <span className="truncate">{toast.body || 'Фотография'}</span>
        </span>
      )
    }
    if (toast.type === 'missed_call' || toast.body?.includes('Пропущенный звонок')) {
      return (
        <span className="flex items-center gap-1.5 text-[13px] text-rose-400 font-medium">
          <PhoneMissed size={14} className="shrink-0" />
          <span className="truncate">{toast.body || 'Пропущенный звонок'}</span>
        </span>
      )
    }
    if (isMilestone) {
      return (
        <p className="text-[13px] text-white/95 font-medium leading-snug line-clamp-3">
          {toast.body || 'Твой огонь горит непрерывно!'}
        </p>
      )
    }

    return (
      <p className="text-[13px] text-white/90 line-clamp-2 leading-snug">
        {toast.body}
      </p>
    )
  }

  const cardSurfaceClass = isMilestone
    ? isCentury
      ? 'bg-gradient-to-br from-amber-500/[0.16] via-[#0a0a0c]/95 to-[#d76737]/[0.12] border border-amber-400/50 shadow-[0_22px_60px_rgba(0,0,0,0.9),0_0_32px_rgba(245,158,11,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]'
      : 'bg-gradient-to-br from-[#d76737]/[0.16] via-[#0a0a0c]/95 to-amber-500/[0.08] border border-[#d76737]/40 shadow-[0_22px_60px_rgba(0,0,0,0.9),0_0_26px_rgba(215,103,55,0.22),inset_0_1px_0_rgba(255,255,255,0.1)]'
    : 'bg-[#0a0a0c]/92 border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 18, scale: 0.95, transition: { duration: 0.16 } }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={onClick}
      role="alert"
      data-testid={isMilestone ? 'milestone-festive-toast' : 'desktop-toast-card'}
      data-milestone-tier={isMilestone ? String(toast.milestoneTier || (isCentury ? 100 : 10)) : undefined}
      className={`group/toast desktop-toast toast-item pointer-events-auto relative w-full overflow-hidden backdrop-blur-xl rounded-2xl p-3.5 text-white cursor-pointer select-none transition-colors hover:border-white/[0.2] ${cardSurfaceClass}`}
    >
      {/* Микро-искры для юбилейных поздравлений */}
      {isMilestone && (
        <div className="pointer-events-none absolute top-4 left-6 z-0" aria-hidden="true">
          {SPARKLE_PARTICLES.map((sp, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              animate={{
                opacity: [0, 1, 0],
                x: sp.x,
                y: sp.y,
                scale: [0.5, 1.15, 0.2],
              }}
              transition={{ duration: 0.95, delay: sp.delay, ease: 'easeOut' }}
              style={{ width: sp.size, height: sp.size }}
              className={`absolute rounded-full ${
                sp.gold ? 'bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'bg-[#d76737] shadow-[0_0_6px_rgba(215,103,55,0.8)]'
              }`}
            />
          ))}
        </div>
      )}

      {/* Верхний ряд: Аватар + Имя с галочкой + Время + Закрыть */}
      <div className="relative z-10 flex items-center gap-2.5 mb-1.5">
        {isMilestone ? (
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
              isCentury
                ? 'bg-gradient-to-br from-amber-400/30 to-[#d76737]/30 text-amber-300 border-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                : 'bg-gradient-to-br from-[#d76737]/30 to-amber-500/20 text-[#e0784b] border-[#d76737]/45 shadow-[0_0_14px_rgba(215,103,55,0.3)]'
            }`}
          >
            {isCentury ? (
              <Trophy size={17} />
            ) : (
              <Flame size={18} className="fill-current" />
            )}
          </div>
        ) : toast.type === 'friend_request' ? (
          <div className="w-9 h-9 rounded-full bg-white/[0.08] text-white/80 flex items-center justify-center shrink-0 ring-1 ring-white/[0.14]">
            <UserPlus size={16} />
          </div>
        ) : toast.type === 'missed_call' ? (
          <div className="w-9 h-9 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 ring-1 ring-rose-500/30">
            <PhoneMissed size={16} />
          </div>
        ) : isPridaySender ? (
          <div
            className="w-9 h-9 rounded-full bg-[#d76737] text-black flex items-center justify-center shrink-0 ring-1 ring-white/[0.18]"
            aria-hidden="true"
          >
            <Flame size={18} fill="currentColor" strokeWidth={1.8} />
          </div>
        ) : (
          <UserAvatar
            avatarUrl={toast.avatarUrl}
            avatarColor={toast.avatarColor}
            displayName={toast.title}
            initials={initials}
            size={36}
            className="ring-1 ring-white/[0.14]"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[13.5px] font-bold text-white truncate leading-tight">
              {toast.title}
            </span>
            {showVerified && <VerifiedBadge size="xs" />}
            {isMilestone && (
              <Sparkles
                size={12}
                className={isCentury ? 'text-amber-300 shrink-0 ml-0.5' : 'text-[#ff7a45] shrink-0 ml-0.5'}
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        <span className="text-[11px] text-white/45 shrink-0 font-normal">
          сейчас
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white/45 opacity-80 sm:opacity-0 sm:group-hover/toast:opacity-100 focus:opacity-100 hover:text-white hover:bg-white/10 transition-all shrink-0 cursor-pointer"
          aria-label="Закрыть уведомление"
        >
          <X size={13} />
        </button>
      </div>

      {/* Превью сообщения */}
      <div className="relative z-10 pl-[46px] pr-1">
        {renderPreview()}
      </div>

      {/* Pill-поле быстрого ответа (для сообщений чата) */}
      {toast.type === 'chat' && onSendReply && (
        <form
          onSubmit={handleSendReply}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 pl-[46px] mt-2.5"
        >
          {isSent ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold py-1 px-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <Check size={13} />
              <span>Отправлено ✓</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.09] focus-within:border-[#d76737]/60 focus-within:bg-black/60 pl-3.5 pr-1 py-1 transition-all">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Быстрый ответ..."
                className="flex-1 min-w-0 bg-transparent text-[12.5px] text-white placeholder:text-white/40 outline-none"
              />
              <button
                type="submit"
                disabled={!hasDraft || isSending}
                aria-label="Отправить ответ"
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  hasDraft && !isSending
                    ? 'bg-[#d76737] text-black hover:bg-[#e0784b] active:bg-[#bd562b] active:scale-95 cursor-pointer'
                    : 'bg-white/10 text-white/35 cursor-default'
                }`}
              >
                <Send size={12} className="-ml-0.5" />
              </button>
            </div>
          )}
        </form>
      )}
    </motion.div>
  )
}

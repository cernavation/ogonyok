'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Star, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { attachmentKindLabel } from '@/lib/ogonek/messenger'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import type { ChatAttachment } from '@/lib/ogonek/types'
import { UserAvatar, VerifiedBadge } from '../ui'

type Props = {
  attachment: ChatAttachment
  fallbackAuthorName?: string | null
  fallbackAuthorUsername?: string | null
  fallbackAuthorAvatar?: string | null
  fallbackAuthorColor?: string | null
  fallbackAuthorVerified?: boolean
  onClose: () => void
}

/**
 * Просмотрщик карточки гордости / благодарности / дня в чате —
 * показывает ПОЛНЫЙ нерезаный текст, автора, оценку, дату и фото.
 */
export function ChatAttachmentModal({
  attachment,
  fallbackAuthorName,
  fallbackAuthorUsername,
  fallbackAuthorAvatar,
  fallbackAuthorColor,
  fallbackAuthorVerified,
  onClose,
}: Props) {
  useBodyScrollLock(true)
  const photoSrc = usePhotoUrl(attachment.photo ?? null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (typeof document === 'undefined') return null

  const authorName = attachment.author || fallbackAuthorName || 'Автор'
  const authorUsername = attachment.authorUsername || fallbackAuthorUsername || null
  const authorAvatar = attachment.authorAvatar || fallbackAuthorAvatar || null
  const authorColor = attachment.authorAvatarColor || fallbackAuthorColor || '#FF5C00'
  const authorVerified = Boolean(attachment.authorVerified ?? fallbackAuthorVerified)

  const ratingMatch = attachment.subtitle?.match(/(\d+(?:\.\d+)?)\s*\/\s*10/)
  const rating = attachment.rating ?? (ratingMatch ? Number(ratingMatch[1]) : null)

  const formattedDate = attachment.dayDateISO
    ? new Date(attachment.dayDateISO).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-[4px] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр карточки"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden rounded-2xl border shadow-[0_24px_80px_rgba(0,0,0,0.95)] bg-[#060608] text-white"
        style={{
          borderColor: `${attachment.accent}55`,
        }}
      >
        {/* Градиентная шапка с автором и кнопкой закрытия */}
        <div
          className="relative px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 shrink-0"
          style={{
            background: `linear-gradient(135deg, ${attachment.from}, ${attachment.to})`,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              avatarUrl={authorAvatar}
              avatarColor={authorColor}
              displayName={authorName}
              username={authorUsername}
              size={42}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-[15px] text-white truncate">
                  {authorName}
                </span>
                {authorVerified && <VerifiedBadge size="xs" />}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-white/75 truncate">
                {authorUsername && <span>@{authorUsername.replace(/^@/, '')}</span>}
                {authorUsername && (attachment.dayId != null || formattedDate) && <span>·</span>}
                {attachment.dayId != null && <span>День #{attachment.dayId}</span>}
                {formattedDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={11} />
                    {formattedDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            aria-label="Закрыть просмотр"
          >
            <X size={17} />
          </button>
        </div>

        {/* Тело карточки: тип + оценка + ПОЛНЫЙ текст + фото */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em]"
              style={{ color: attachment.accent }}
            >
              <span className="text-base leading-none">{attachment.emoji}</span>
              <span>{attachmentKindLabel(attachment.kind)}</span>
            </span>

            {rating != null && Number.isFinite(rating) && rating > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                <Star size={12} className="fill-amber-300 text-amber-300" />
                {rating}/10
              </span>
            )}
          </div>

          <p className="text-[16px] sm:text-[18px] font-semibold leading-relaxed text-white whitespace-pre-wrap break-words select-text">
            {attachment.title}
          </p>

          {attachment.subtitle && (
            <p className="text-xs text-white/60 font-medium">{attachment.subtitle}</p>
          )}

          {photoSrc && (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoSrc}
                alt={attachment.title}
                className="w-full max-h-[380px] object-contain mx-auto"
              />
            </div>
          )}

          {attachment.kind === 'day' && attachment.dayId != null && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const tab = attachment.targetTab || 'friends'
                  const params = new URLSearchParams({
                    tab,
                    highlightDay: String(attachment.dayId),
                  })
                  if (attachment.authorId) params.set('authorId', attachment.authorId)
                  if (attachment.groupId) params.set('groupId', attachment.groupId)
                  onClose()
                  window.dispatchEvent(
                    new CustomEvent('ogonek:navigate-view', {
                      detail: { view: 'home', url: `/app?${params.toString()}` },
                    })
                  )
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent('ogonek:focus-feed-day', {
                        detail: {
                          tab,
                          dayId: attachment.dayId,
                          userId: attachment.authorId || null,
                          groupId: attachment.groupId || null,
                        },
                      })
                    )
                  }, 60)
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#d76737] hover:opacity-90 px-4 py-2 text-[13px] font-semibold text-black transition-all active:scale-95 cursor-pointer"
              >
                <span>{attachment.actionLabel || 'Перейти к дню →'}</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

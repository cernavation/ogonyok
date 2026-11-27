'use client'

import { attachmentKindLabel } from '@/lib/ogonek/messenger'
import type { ChatAttachment } from '@/lib/ogonek/types'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'

type Props = {
  attachment: ChatAttachment
  /** Компактный режим — только заголовок, без подписи и подсказки раскрытия */
  compact?: boolean
  /** Клик открывает карточку целиком в модальном окне просмотра */
  onClick?: () => void
}

/**
 * ЭТАП 13 — Карточка-вложение в чате.
 * Кликабельна: нажатие раскрывает гордость/благодарность целиком без обрезания.
 */
export function ChatAttachmentCard({ attachment, compact = false, onClick }: Props) {
  const photoSrc = usePhotoUrl(attachment.photo ?? null)
  const showExpandHint =
    Boolean(onClick) &&
    !compact &&
    (attachment.title.length > 85 || Boolean(photoSrc) || attachment.kind === 'pride')
  const showJumpToDay =
    !compact &&
    attachment.kind === 'day' &&
    attachment.dayId != null

  const handleJumpToDay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window === 'undefined' || attachment.dayId == null) return
    const tab = attachment.targetTab || 'friends'
    const params = new URLSearchParams({
      tab,
      highlightDay: String(attachment.dayId),
    })
    if (attachment.authorId) {
      params.set('authorId', attachment.authorId)
    }
    const targetUrl = `/app?${params.toString()}`
    window.dispatchEvent(
      new CustomEvent('ogonek:navigate-view', {
        detail: {
          view: 'home',
          url: targetUrl,
        },
      })
    )
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('ogonek:focus-feed-day', {
          detail: {
            tab,
            dayId: attachment.dayId,
            userId: attachment.authorId || null,
          },
        })
      )
    }, 60)
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation()
              onClick()
            }
          : undefined
      }
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onClick()
              }
            }
          : undefined
      }
      aria-label={onClick ? `Открыть полностью: ${attachment.title}` : undefined}
      className={`relative overflow-hidden rounded-2xl border text-left ${
        onClick
          ? 'cursor-pointer transition-all hover:brightness-110 active:scale-[0.99]'
          : ''
      }`}
      style={{
        borderColor: `${attachment.accent}55`,
        background: `linear-gradient(145deg, ${attachment.from}, ${attachment.to})`,
      }}
    >
      {photoSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
        />
      )}
      <span
        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl"
        style={{ background: attachment.accent, opacity: 0.35 }}
        aria-hidden="true"
      />
      <div className="relative p-3">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-black uppercase tracking-[0.14em]"
            style={{ color: attachment.accent }}
          >
            {attachmentKindLabel(attachment.kind)}
          </span>
          {showExpandHint && (
            <span className="text-[10px] font-semibold text-white/65">
              Открыть →
            </span>
          )}
        </div>
        <div className="mt-1 flex items-start gap-2">
          <span className="text-[20px] leading-none" aria-hidden="true">
            {attachment.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-3 text-[14px] font-semibold leading-snug text-white">
              {attachment.title}
            </p>
            {!compact && attachment.subtitle && (
              <p className="mt-0.5 line-clamp-2 text-[11px] text-white/70">{attachment.subtitle}</p>
            )}
            {showJumpToDay && (
              <button
                type="button"
                onClick={handleJumpToDay}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#ff5a1f] hover:bg-[#ff6d38] px-3 py-1.5 text-[11.5px] font-bold text-white shadow-[0_2px_10px_rgba(255,90,31,0.35)] transition-all active:scale-95 cursor-pointer"
              >
                <span>{attachment.actionLabel || 'Перейти к дню →'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

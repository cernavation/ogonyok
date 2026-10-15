'use client'

import { attachmentKindLabel } from '@/lib/ogonek/messenger'
import type { ChatAttachment } from '@/lib/ogonek/types'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'

type Props = {
  attachment: ChatAttachment
  /** Компактный режим — только заголовок, без подписи */
  compact?: boolean
}

/**
 * ЭТАП 13 — Карточка-вложение в чате.
 * Один и тот же вид для пересланной гордости, целого дня, кадра сторис и
 * ачивки: градиент, эмодзи, заголовок и подпись. Фото-фон подтягивается из
 * IndexedDB через `usePhotoUrl`, если он есть.
 */
export function ChatAttachmentCard({ attachment, compact = false }: Props) {
  const photoSrc = usePhotoUrl(attachment.photo ?? null)

  return (
    <div
      className="relative overflow-hidden rounded-2xl border"
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
        <span
          className="text-[10px] font-black uppercase tracking-[0.14em]"
          style={{ color: attachment.accent }}
        >
          {attachmentKindLabel(attachment.kind)}
        </span>
        <div className="mt-1 flex items-start gap-2">
          <span className="text-[20px] leading-none" aria-hidden="true">
            {attachment.emoji}
          </span>
          <div className="min-w-0">
            <p className="line-clamp-3 text-[14px] font-semibold leading-snug text-white">
              {attachment.title}
            </p>
            {!compact && attachment.subtitle && (
              <p className="mt-0.5 line-clamp-2 text-[11px] text-white/70">{attachment.subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { CHAT_REACTIONS } from '@/lib/ogonek/messenger'
import type { CustomEmoji } from '@/lib/ogonek/types'

type Props = {
  /** id смайликов, уже стоящих на сообщении (мои) */
  currentIds: string[]
  /** Кастомные смайлики пользователя — добавляются в конец палитры */
  customEmojis?: CustomEmoji[]
  anchorRef?: React.RefObject<HTMLElement | null>
  onPick: (emojiId: string) => void
  onClose: () => void
}

/**
 * Мини-палитра реакций на сообщение в чате.
 * При передаче anchorRef рендерится в портале и автоматически раскрывается вниз,
 * если сверху меньше 220px свободного места (чтобы не обрезаться шапкой чата).
 */
export function MessageReactionPicker({
  currentIds,
  customEmojis = [],
  anchorRef,
  onPick,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchorRef?.current || typeof window === 'undefined') return
    const updatePos = () => {
      const anchorEl = anchorRef.current
      if (!anchorEl) return
      const rect = anchorEl.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const width = ref.current?.offsetWidth || 230
      const height = ref.current?.offsetHeight || 110
      const openDown = rect.top < 220 || rect.top - height < 76
      const top = openDown
        ? Math.max(76, Math.min(rect.bottom + 8, vh - height - 12))
        : Math.max(76, rect.top - height - 8)
      const left = Math.max(8, Math.min(rect.right - width, vw - width - 10))
      setCoords({ left, top })
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    return () => window.removeEventListener('resize', updatePos)
  }, [anchorRef, customEmojis.length])

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current && !ref.current.contains(target) && !anchorRef?.current?.contains(target)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleScroll = () => onClose()
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose, anchorRef])

  const content = (
    <div
      ref={ref}
      style={
        anchorRef && coords
          ? { position: 'fixed', left: `${coords.left}px`, top: `${coords.top}px`, zIndex: 9998 }
          : undefined
      }
      className={`${
        anchorRef ? 'fixed z-[9998]' : 'absolute bottom-full right-0 z-30 mb-2'
      } flex max-w-[230px] flex-wrap gap-1 rounded-2xl border border-[#2f3336] bg-[#16181c]/95 backdrop-blur-xl p-2 shadow-[0_16px_50px_#000]`}
      role="menu"
      aria-label="Реакции на сообщение"
    >
      {CHAT_REACTIONS.map((reaction) => {
        const active = currentIds.includes(reaction.id)
        return (
          <button
            key={reaction.id}
            type="button"
            onClick={() => {
              onPick(reaction.id)
              onClose()
            }}
            className={`grid h-8 w-8 place-items-center rounded-full text-[17px] transition-colors duration-150 ${
              active ? 'bg-[#d76737]/25' : 'hover:bg-white/[0.08]'
            }`}
            title={reaction.label}
            aria-label={`${active ? 'Убрать' : 'Поставить'} реакцию ${reaction.label}`}
          >
            {reaction.char}
          </button>
        )
      })}
      {customEmojis.map((emoji) => {
        const active = currentIds.includes(emoji.id)
        return (
          <button
            key={emoji.id}
            type="button"
            onClick={() => {
              onPick(emoji.id)
              onClose()
            }}
            className={`grid h-8 w-8 place-items-center rounded-full text-[17px] transition-colors duration-150 ${
              active ? 'bg-[#d76737]/25' : 'hover:bg-white/[0.08]'
            }`}
            title={emoji.label}
            aria-label={`${active ? 'Убрать' : 'Поставить'} реакцию ${emoji.label}`}
          >
            {emoji.char}
          </button>
        )
      })}
    </div>
  )

  if (anchorRef && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return content
}

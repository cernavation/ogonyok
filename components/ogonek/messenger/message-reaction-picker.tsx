'use client'

import { useEffect, useRef } from 'react'

import { CHAT_REACTIONS } from '@/lib/ogonek/messenger'
import type { CustomEmoji } from '@/lib/ogonek/types'

type Props = {
  /** id смайликов, уже стоящих на сообщении (мои) */
  currentIds: string[]
  /** Кастомные смайлики пользователя — добавляются в конец палитры */
  customEmojis?: CustomEmoji[]
  onPick: (emojiId: string) => void
  onClose: () => void
}

/**
 * ЭТАП 13 — Мини-палитра реакций на сообщение в чате.
 * Встроенные «огонёк, сердце, сила…» плюс собственные смайлики пользователя.
 */
export function MessageReactionPicker({ currentIds, customEmojis = [], onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 z-30 mb-2 flex max-w-[230px] flex-wrap gap-1 rounded-2xl border border-[#2f3336] bg-[#16181c] p-2 shadow-[0_16px_50px_#000]"
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
              active ? 'bg-[#ff6b35]/20' : 'hover:bg-white/[0.08]'
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
              active ? 'bg-[#ff6b35]/20' : 'hover:bg-white/[0.08]'
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
}

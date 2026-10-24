'use client'

import { Pin, X } from 'lucide-react'

import { FRIEND_PROFILES, getFriend } from '@/lib/ogonek/friends'
import { playClick } from '@/lib/ogonek/sound'
import type { ChatMessage } from '@/lib/ogonek/types'

type Props = {
  message: ChatMessage
  onJumpToMessage: (id: string) => void
  onUnpin: () => void
  soundEnabled?: boolean
}

export function ChatPinnedBanner({
  message,
  onJumpToMessage,
  onUnpin,
  soundEnabled = true,
}: Props) {
  const authorName =
    message.authorId === 'me'
      ? 'Ты'
      : getFriend(message.authorId)?.name || 'Собеседник'

  const snippet =
    message.text ||
    message.attachment?.title ||
    (message.media?.type === 'audio'
      ? 'Голосовое сообщение'
      : message.media?.type === 'image'
      ? 'Фотография'
      : 'Вложение')

  return (
    <div className="relative flex items-center justify-between border-b border-white/10 bg-[#16181c]/90 px-4 py-2 backdrop-blur-md">
      <button
        type="button"
        onClick={() => {
          playClick(soundEnabled)
          onJumpToMessage(message.id)
        }}
        className="flex flex-1 items-center gap-2.5 text-left min-w-0 group"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ff7a18]/15 text-[#ffad5a] group-hover:scale-110 transition-transform">
          <Pin size={14} className="rotate-45" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[#ffad5a] leading-tight">
            Закреплённое сообщение · {authorName}
          </p>
          <p className="truncate text-xs text-[#e7e9ea]/90 leading-tight">
            {snippet}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => {
          playClick(soundEnabled)
          onUnpin()
        }}
        className="ml-2 flex h-7 w-7 items-center justify-center rounded-lg text-[#71767b] hover:bg-white/10 hover:text-white transition-colors"
        title="Открепить"
        aria-label="Открепить сообщение"
      >
        <X size={15} />
      </button>
    </div>
  )
}

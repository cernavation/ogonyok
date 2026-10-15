'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Copy, Forward, SmilePlus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { formatChatTime } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ChatMessage, CustomEmoji } from '@/lib/ogonek/types'
import { ChatAttachmentCard } from './chat-attachment-card'
import { MessageReactionPicker } from './message-reaction-picker'

type Props = {
  message: ChatMessage
  /** Сообщение отправлено мной (справа), иначе — другом (слева) */
  isMine: boolean
  /** Глиф для любого emojiId (встроенный/кастомный) */
  resolveChar: (emojiId: string) => string
  customEmojis: CustomEmoji[]
  onToggleReaction: (emojiId: string) => void
  onForward: (message: ChatMessage) => void
  onDelete: (messageId: string) => void
  soundEnabled?: boolean
  onNotify?: (message: string) => void
}

/**
 * ЭТАП 13 — Сообщение чата в стиле Telegram: пузырь со хвостом, вложение-карточка,
 * реакции под сообщением и панель действий при наведении (реакция, переслать,
 * копировать, удалить). Все действия реально меняют состояние в сторе.
 */
export function ChatMessageBubble({
  message,
  isMine,
  resolveChar,
  customEmojis,
  onToggleReaction,
  onForward,
  onDelete,
  soundEnabled = true,
  onNotify,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const reduce = useReducedMotion()

  const reactions = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>()
    for (const r of message.reactions) {
      const entry = map.get(r.emojiId) ?? { count: 0, mine: false }
      entry.count += 1
      if (r.by === 'me') entry.mine = true
      map.set(r.emojiId, entry)
    }
    return Array.from(map.entries()).map(([emojiId, value]) => ({ emojiId, ...value }))
  }, [message.reactions])

  const myReactionIds = message.reactions.filter((r) => r.by === 'me').map((r) => r.emojiId)

  const handleCopy = async () => {
    if (!message.text) return
    try {
      await navigator.clipboard.writeText(message.text)
      onNotify?.('Текст сообщения скопирован')
    } catch {
      onNotify?.('Не удалось скопировать текст')
    }
  }

  return (
    <motion.div
      className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}
      initial={reduce ? false : { opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.16, ease: 'easeOut' }}
    >
      <div className={`relative max-w-[80%] ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Панель действий при наведении */}
        <div
          className={`absolute top-0 z-20 flex items-center gap-0.5 rounded-full border border-[#2f3336] bg-[#16181c] p-0.5 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 ${
            isMine ? 'right-full mr-2' : 'left-full ml-2'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              setPickerOpen((v) => !v)
            }}
            className="grid h-7 w-7 place-items-center rounded-full text-[#71767b] hover:bg-white/[0.08] hover:text-[#ffad5a]"
            aria-label="Поставить реакцию"
          >
            <SmilePlus size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              onForward(message)
            }}
            className="grid h-7 w-7 place-items-center rounded-full text-[#71767b] hover:bg-white/[0.08] hover:text-[#1d9bf0]"
            aria-label="Переслать сообщение другу"
            title="Переслать другу"
          >
            <Forward size={15} />
          </button>
          {message.text && (
            <button
              type="button"
              onClick={handleCopy}
              className="grid h-7 w-7 place-items-center rounded-full text-[#71767b] hover:bg-white/[0.08] hover:text-[#e7e9ea]"
              aria-label="Скопировать текст"
            >
              <Copy size={14} />
            </button>
          )}
          {isMine && (
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                onDelete(message.id)
              }}
              className="grid h-7 w-7 place-items-center rounded-full text-[#71767b] hover:bg-[#f4212e]/15 hover:text-[#f4212e]"
              aria-label="Удалить сообщение"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {pickerOpen && (
            <MessageReactionPicker
              currentIds={myReactionIds}
              customEmojis={customEmojis}
              onPick={(emojiId) => onToggleReaction(emojiId)}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </AnimatePresence>

        <div className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
          {message.attachment && (
            <div className="w-full min-w-[210px]">
              <ChatAttachmentCard attachment={message.attachment} />
            </div>
          )}

          {message.text && (
            <div
              className={`px-3.5 py-2 text-[14px] leading-[20px] shadow-sm ${
                isMine
                  ? 'rounded-2xl rounded-br-md bg-[#1d9bf0] text-white'
                  : 'rounded-2xl rounded-bl-md bg-[#202327] text-[#e7e9ea]'
              } ${message.attachment ? 'mt-0.5' : ''}`}
            >
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
            </div>
          )}

          <div className={`flex items-center gap-1.5 px-1 text-[11px] text-[#71767b] ${isMine ? 'flex-row-reverse' : ''}`}>
            <span className="tabular-nums">{formatChatTime(message.createdAtISO)}</span>
            {isMine && (
              <span
                className={message.read ? 'text-[#1d9bf0]' : ''}
                title={message.read ? 'Прочитано' : 'Отправлено'}
                aria-label={message.read ? 'Прочитано' : 'Отправлено'}
              >
                {message.read ? '✓✓' : '✓'}
              </span>
            )}
          </div>

          {reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
              {reactions.map((reaction) => (
                <button
                  key={reaction.emojiId}
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onToggleReaction(reaction.emojiId)
                  }}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] leading-none transition-colors duration-150 ${
                    reaction.mine
                      ? 'border-[#ff6b35]/60 bg-[#ff6b35]/15 text-[#ffad5a]'
                      : 'border-[#2f3336] bg-[#16181c] text-[#e7e9ea] hover:border-[#3a3f45]'
                  }`}
                  aria-pressed={reaction.mine}
                  aria-label={`Реакция ${resolveChar(reaction.emojiId)}, ${reaction.count}`}
                >
                  <span aria-hidden="true">{resolveChar(reaction.emojiId)}</span>
                  {reaction.count > 1 && <span className="text-[11px] font-bold tabular-nums">{reaction.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

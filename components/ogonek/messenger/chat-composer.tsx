'use client'

import { AnimatePresence } from 'framer-motion'
import { Paperclip, Send, Smile, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { QUICK_REPLIES } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ChatAttachment } from '@/lib/ogonek/types'
import { AttachCardPicker } from './attach-card-picker'
import { ChatAttachmentCard } from './chat-attachment-card'

type Props = {
  friendName: string
  draft: string
  onChangeDraft: (value: string) => void
  onSend: (text: string, attachment?: ChatAttachment | null) => void
  onNotify?: (message: string) => void
  soundEnabled?: boolean
}

/**
 * ЭТАП 13 — Поле ввода чата в стиле Telegram.
 * Быстрые ответы одним тапом, прикрепление карточки гордости/сторис, авто-рост
 * высоты и отправка по Enter (Shift+Enter — новая строка).
 */
export function ChatComposer({
  friendName,
  draft,
  onChangeDraft,
  onSend,
  onNotify,
  soundEnabled = true,
}: Props) {
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const QUICK_EMOJIS = ['🔥', '❤️', '💪', '👏', '🚀', '✨', '🙏', '🤝']

  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [draft])

  const canSend = draft.trim().length > 0 || Boolean(attachment)

  const submit = () => {
    if (!canSend) {
      textRef.current?.focus()
      return
    }
    onSend(draft.trim(), attachment)
    setAttachment(null)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="mcw__composer">
      {/* Быстрые ответы */}
      <div className="mcw-quick" role="group" aria-label="Быстрые ответы">
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply}
            type="button"
            className="mcw-quick__chip"
            onClick={() => {
              playClick(soundEnabled)
              onChangeDraft(reply)
              textRef.current?.focus()
            }}
          >
            {reply}
          </button>
        ))}
      </div>

      {attachment && (
        <div className="mcw-attach-preview">
          <div className="flex-1 min-w-0">
            <ChatAttachmentCard attachment={attachment} compact />
          </div>
          <button
            type="button"
            className="mcw-attach-preview__remove"
            onClick={() => setAttachment(null)}
            aria-label="Убрать вложение"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mcw-compose-row">
        <button
          type="button"
          className="mcw-compose-icon"
          onClick={() => {
            playClick(soundEnabled)
            setAttachOpen(true)
          }}
          aria-label="Прикрепить карточку гордости или сторис"
          title="Прикрепить карточку"
        >
          <Paperclip size={19} />
        </button>

        <textarea
          ref={textRef}
          className="mcw-compose-input"
          placeholder={`Написать ${friendName}…`}
          value={draft}
          onChange={(e) => onChangeDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          aria-label="Текст сообщения"
        />

        <div className="mcw-emoji-wrap">
          <button
            type="button"
            className="mcw-compose-icon"
            onClick={() => {
              playClick(soundEnabled)
              setEmojiOpen((v) => !v)
            }}
            aria-label="Быстрые смайлики"
            aria-expanded={emojiOpen}
          >
            <Smile size={19} />
          </button>
          <AnimatePresence>
            {emojiOpen && (
              <div className="mcw-emoji-pop" role="menu" aria-label="Смайлики">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      onChangeDraft(`${draft}${emoji}`)
                      setEmojiOpen(false)
                      textRef.current?.focus()
                    }}
                    aria-label={`Вставить ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          className={`mcw-send ${canSend ? 'is-ready' : ''}`}
          onClick={submit}
          disabled={!canSend}
          aria-label="Отправить сообщение"
        >
          <Send size={18} />
        </button>
      </div>

      {attachOpen && (
        <AttachCardPicker
          soundEnabled={soundEnabled}
          onPick={(picked) => {
            setAttachment(picked)
            setAttachOpen(false)
            onNotify?.(`Карточка «${picked.title}» прикреплена — жми отправить`)
          }}
          onClose={() => setAttachOpen(false)}
        />
      )}
    </div>
  )
}

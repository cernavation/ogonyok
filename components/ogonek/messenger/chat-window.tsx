'use client'

import { ArrowLeft, Flame, Pin, PinOff, Trash2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { getFriend, presenceMeta } from '@/lib/ogonek/friends'
import { chatDayKey, formatChatDayLabel, threadOf } from '@/lib/ogonek/messenger'
import { resolveEmojiChar } from '@/lib/ogonek/reactions'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { ChatAttachment, ChatMessage } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ChatAvatar } from './chat-avatar'
import { ChatComposer } from './chat-composer'
import { ChatMessageBubble } from './chat-message-bubble'
import { ForwardToChatModal } from './forward-to-chat-modal'

type Props = {
  friendId: string
  onNotify: (message: string) => void
  /** На мобильных — вернуться к списку диалогов */
  onBack?: () => void
  soundEnabled?: boolean
}

/**
 * ЭТАП 13 — Окно быстрой переписки в стиле Telegram.
 * Разделители дней, пузыри сообщений, реакции, статус «печатает», галочки
 * прочтения, закрепление/выключение звука/очистка — и поле ввода с быстрыми
 * ответами и прикреплением карточек. Все действия меняют состояние в сторе.
 */
export function ChatWindow({ friendId, onNotify, onBack, soundEnabled = true }: Props) {
  const {
    state,
    sendChatMessage,
    toggleChatReaction,
    setChatDraft,
    markThreadRead,
    clearThreadMessages,
    deleteChatMessage,
    toggleThreadMute,
    toggleThreadPin,
  } = useOgonekStore()

  const [pending, setPending] = useState(false)
  const [forward, setForward] = useState<{ attachment: ChatAttachment | null; note: string } | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const friend = getFriend(friendId)
  const thread = threadOf(state.chatThreads ?? {}, friendId)
  const messages = thread.messages
  const last = messages[messages.length - 1]
  const lastId = last?.id ?? ''
  const lastAuthor = last?.authorId ?? ''

  // Помечаем переписку прочитанной при открытии и при новом сообщении
  useEffect(() => {
    markThreadRead(friendId)
  }, [friendId, lastId, markThreadRead])

  // «Собеседник печатает» гаснет, когда приходит его ответ
  useEffect(() => {
    if (lastAuthor && lastAuthor !== 'me') setPending(false)
  }, [lastId, lastAuthor])

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => setPending(false), 6500)
    return () => clearTimeout(timer)
  }, [pending])

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, pending])

  const groups = useMemo(() => {
    const result: Array<{ key: string; label: string; items: ChatMessage[] }> = []
    for (const message of messages) {
      const key = chatDayKey(message.createdAtISO)
      const current = result[result.length - 1]
      if (current && current.key === key) {
        current.items.push(message)
      } else {
        result.push({ key, label: formatChatDayLabel(message.createdAtISO), items: [message] })
      }
    }
    return result
  }, [messages])

  const resolveChar = (emojiId: string) => resolveEmojiChar(emojiId, state.customEmojis)

  if (!friend) {
    return (
      <div className="mcw">
        <div className="mcw__empty">
          <p>Диалог недоступен — собеседник не найден.</p>
        </div>
      </div>
    )
  }

  const presence = presenceMeta(friend.presence)

  const handleSend = (text: string, attachment?: ChatAttachment | null) => {
    const created = sendChatMessage(friendId, text, attachment)
    if (created) {
      playSuccess(soundEnabled)
      setPending(true)
    }
  }

  const handleMute = () => {
    const muted = toggleThreadMute(friendId)
    onNotify(muted ? `Уведомления от @${friend.username} выключены` : `Уведомления от @${friend.username} включены`)
  }

  const handlePin = () => {
    const pinned = toggleThreadPin(friendId)
    onNotify(pinned ? `Диалог закреплён сверху` : 'Диалог откреплён')
  }

  const handleClear = () => {
    if (typeof window !== 'undefined' && !window.confirm(`Очистить переписку с ${friend.name}?`)) return
    playClick(soundEnabled)
    clearThreadMessages(friendId)
    onNotify('История переписки очищена')
  }

  return (
    <div className="mcw">
      <header className="mcw__head">
        {onBack && (
          <button type="button" className="mcw__back" onClick={onBack} aria-label="К списку диалогов">
            <ArrowLeft size={20} />
          </button>
        )}
        <ChatAvatar friendId={friendId} size={42} ringColor="#0b0c0d" />
        <div className="mcw__ident">
          <span className="mcw__name">
            {friend.name}
            {friend.verified && <span className="friend-verified">✓</span>}
          </span>
          <span className="mcw__status" style={{ color: pending ? '#ffad5a' : presence.color }}>
            {pending ? (
              <span className="mcw__typing">
                печатает<span>.</span><span>.</span><span>.</span>
              </span>
            ) : (
              <>
                {presence.short} · @{friend.username}
              </>
            )}
          </span>
        </div>
        <div className="mcw__head-actions">
          <span className="mcw__streak" title="Серия дней друга">
            <Flame size={14} /> {friend.streak}
          </span>
          <button
            type="button"
            className={`mcw__head-btn ${thread.muted ? 'is-active' : ''}`}
            onClick={handleMute}
            aria-pressed={Boolean(thread.muted)}
            aria-label={thread.muted ? 'Включить уведомления' : 'Выключить уведомления'}
            title={thread.muted ? 'Включить звук' : 'Выключить звук'}
          >
            {thread.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <button
            type="button"
            className={`mcw__head-btn ${thread.pinned ? 'is-active' : ''}`}
            onClick={handlePin}
            aria-pressed={Boolean(thread.pinned)}
            aria-label={thread.pinned ? 'Открепить диалог' : 'Закрепить диалог'}
            title={thread.pinned ? 'Открепить' : 'Закрепить'}
          >
            {thread.pinned ? <PinOff size={17} /> : <Pin size={17} />}
          </button>
          <button
            type="button"
            className="mcw__head-btn is-danger"
            onClick={handleClear}
            aria-label="Очистить переписку"
            title="Очистить переписку"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </header>

      <div className="mcw__body" ref={bodyRef}>
        {messages.length === 0 ? (
          <div className="mcw__intro">
            <ChatAvatar friendId={friendId} size={64} ringColor="#0b0c0d" />
            <p className="mcw__intro-name">{friend.name}</p>
            <p className="mcw__intro-bio">{friend.bio}</p>
            <p className="mcw__intro-hint">
              Это начало вашей переписки. Скажи «Держим огонь 🔥» — или перешли карточку гордости.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.key} className="mcw__group">
              <div className="mcw__day">
                <span>{group.label}</span>
              </div>
              <div className="mcw__group-list">
                {group.items.map((message) => (
                  <ChatMessageBubble
                    key={message.id}
                    message={message}
                    isMine={message.authorId === 'me'}
                    resolveChar={resolveChar}
                    customEmojis={state.customEmojis}
                    soundEnabled={soundEnabled}
                    onNotify={onNotify}
                    onToggleReaction={(emojiId) => {
                      const active = toggleChatReaction(friendId, message.id, emojiId)
                      playClick(soundEnabled)
                      onNotify(active ? 'Реакция отправлена' : 'Реакция снята')
                    }}
                    onForward={(msg) =>
                      setForward({
                        attachment: msg.attachment ?? null,
                        note: msg.attachment ? '' : msg.text,
                      })
                    }
                    onDelete={(messageId) => {
                      deleteChatMessage(friendId, messageId)
                      onNotify('Сообщение удалено')
                    }}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {pending && (
          <div className="mcw__bubble-typing" aria-live="polite">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <ChatComposer
        friendName={friend.name.split(/\s+/)[0] ?? friend.name}
        draft={thread.draft ?? ''}
        onChangeDraft={(value) => setChatDraft(friendId, value)}
        onSend={handleSend}
        onNotify={onNotify}
        soundEnabled={soundEnabled}
      />

      {forward && (
        <ForwardToChatModal
          attachment={forward.attachment}
          initialNote={forward.note}
          soundEnabled={soundEnabled}
          onNotify={onNotify}
          onClose={() => setForward(null)}
        />
      )}
    </div>
  )
}

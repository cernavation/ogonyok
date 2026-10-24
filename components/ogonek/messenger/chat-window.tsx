'use client'

import {
  ArrowDown,
  ArrowLeft,
  Check,
  CheckSquare,
  Flame,
  Info,
  MoreVertical,
  Phone,
  Pin,
  PinOff,
  Search,
  Trash2,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FriendDetailModal } from '../friend-detail-modal'

import { FRIEND_PROFILES, getFriend, presenceMeta } from '@/lib/ogonek/friends'
import {
  chatDayKey,
  formatChatDayLabel,
  isGroupThread,
  threadOf,
  threadTitle,
} from '@/lib/ogonek/messenger'
import { resolveEmojiChar } from '@/lib/ogonek/reactions'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type {
  ChatAttachment,
  ChatMessage,
  ChatMessageMedia,
  ChatMessageReply,
} from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ChatAvatar } from './chat-avatar'
import { ChatComposer } from './chat-composer'
import { ChatMessageBubble } from './chat-message-bubble'
import { ChatPinnedBanner } from './chat-pinned-banner'
import { ChatSearchBar } from './chat-search-bar'
import { ChatSelectionToolbar } from './chat-selection-toolbar'
import { ForwardToChatModal } from './forward-to-chat-modal'

type Props = {
  friendId: string
  onNotify: (message: string) => void
  onBack?: () => void
  soundEnabled?: boolean
}

const PAGE_SIZE = 30

export function ChatWindow({ friendId, onNotify, onBack, soundEnabled = true }: Props) {
  const {
    state,
    sendChatMessage,
    editChatMessage,
    deleteChatMessage,
    deleteChatMessages,
    togglePinChatMessage,
    toggleChatReaction,
    setChatDraft,
    markThreadRead,
    clearThreadMessages,
    toggleThreadMute,
    toggleThreadPin,
  } = useOgonekStore()

  const [pending, setPending] = useState(false)
  const [forward, setForward] = useState<{ attachment: ChatAttachment | null; note: string } | null>(null)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatchIndex, setSearchMatchIndex] = useState(0)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [friendDetailOpen, setFriendDetailOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [showScrollBottom, setShowScrollBottom] = useState(false)

  const bodyRef = useRef<HTMLDivElement>(null)

  const thread = threadOf(state.chatThreads ?? {}, friendId)
  const isGroup = isGroupThread(thread, friendId)
  const friend = !isGroup ? getFriend(friendId) : null
  const title = threadTitle(friendId, thread)

  const allMessages = thread.messages
  const totalMessagesCount = allMessages.length

  // Пейджинг: последние N сообщений
  const messages = useMemo(() => {
    if (visibleCount >= totalMessagesCount) return allMessages
    return allMessages.slice(totalMessagesCount - visibleCount)
  }, [allMessages, visibleCount, totalMessagesCount])

  const last = allMessages[allMessages.length - 1]
  const lastId = last?.id ?? ''
  const lastAuthor = last?.authorId ?? ''

  // Закреплённое сообщение в чате
  const pinnedMessage = useMemo(() => {
    if (!thread.pinnedMessageId) return null
    return allMessages.find((m) => m.id === thread.pinnedMessageId) ?? null
  }, [allMessages, thread.pinnedMessageId])

  // Поиск по сообщениям чата
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return allMessages.filter(
      (m) =>
        (m.text && m.text.toLowerCase().includes(q)) ||
        (m.attachment?.title && m.attachment.title.toLowerCase().includes(q))
    )
  }, [allMessages, searchQuery])

  useEffect(() => {
    setSearchMatchIndex(0)
  }, [searchQuery])

  // Помечаем прочитанным при открытии и при новом сообщении
  useEffect(() => {
    markThreadRead(friendId)
  }, [friendId, lastId, markThreadRead])

  // «Печатает...» гаснет при ответе собеседника
  useEffect(() => {
    if (lastAuthor && lastAuthor !== 'me') setPending(false)
  }, [lastId, lastAuthor])

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => setPending(false), 5000)
    return () => clearTimeout(timer)
  }, [pending])

  // Прокрутка вниз при новом сообщении
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [allMessages.length, pending])

  // Отслеживание скролла для кнопки «Вниз»
  const handleScroll = () => {
    const el = bodyRef.current
    if (!el) return
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBottom(distanceToBottom > 150)
  }

  const scrollToBottom = () => {
    const el = bodyRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  const scrollToMessage = (msgId: string) => {
    // If message is in hidden history, expand
    const idx = allMessages.findIndex((m) => m.id === msgId)
    if (idx >= 0 && idx < totalMessagesCount - visibleCount) {
      setVisibleCount(totalMessagesCount)
    }
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('pulse-highlight')
        setTimeout(() => el.classList.remove('pulse-highlight'), 1600)
      }
    }, 100)
  }

  // Группировка сообщений по дням
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

  if (!friend && !isGroup) {
    return (
      <div className="mcw">
        <div className="mcw__empty">
          <p>Диалог недоступен — собеседник не найден.</p>
        </div>
      </div>
    )
  }

  const presence = friend ? presenceMeta(friend.presence) : null

  const handleSend = (
    text: string,
    attachment?: ChatAttachment | null,
    extra?: {
      replyTo?: ChatMessageReply | null
      media?: ChatMessageMedia | null
    }
  ) => {
    const created = sendChatMessage(friendId, text, attachment, extra)
    if (created) {
      playSuccess(soundEnabled)
      setPending(true)
      setReplyingTo(null)
      setEditingMessage(null)
    }
  }

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessage(msg)
    setReplyingTo(null)
    setChatDraft(friendId, msg.text)
  }

  const handleSaveEdit = (newText: string) => {
    if (!editingMessage) return
    const ok = editChatMessage(friendId, editingMessage.id, newText)
    if (ok) {
      playSuccess(soundEnabled)
      onNotify('Сообщение изменено')
      setEditingMessage(null)
      setChatDraft(friendId, '')
    }
  }

  const handleEditLastMessage = () => {
    // Find last message sent by 'me'
    for (let i = allMessages.length - 1; i >= 0; i--) {
      if (allMessages[i].authorId === 'me' && allMessages[i].text) {
        handleStartEdit(allMessages[i])
        break
      }
    }
  }

  const handleToggleSelect = (msgId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    )
  }

  const handleDeleteSelected = () => {
    if (selectedMessageIds.length === 0) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Удалить выбранные сообщения (${selectedMessageIds.length})?`)
    ) {
      return
    }
    deleteChatMessages(friendId, selectedMessageIds)
    onNotify(`Удалено сообщений: ${selectedMessageIds.length}`)
    setSelectedMessageIds([])
    setIsSelectionMode(false)
  }

  const handleMute = () => {
    const muted = toggleThreadMute(friendId)
    onNotify(muted ? `Уведомления выключены` : `Уведомления включены`)
  }

  const handlePin = () => {
    const pinned = toggleThreadPin(friendId)
    onNotify(pinned ? `Диалог закреплён сверху` : 'Диалог откреплён')
  }

  const handleClear = () => {
    if (typeof window !== 'undefined' && !window.confirm(`Очистить переписку с «${title}»?`)) return
    playClick(soundEnabled)
    clearThreadMessages(friendId)
    onNotify('История переписки очищена')
    setMenuOpen(false)
  }

  return (
    <div className="mcw flex flex-col h-full bg-[var(--bg)] relative overflow-hidden select-text">
      {/* Шапка чата в стиле Telegram Web / X.com */}
      <header className="mcw__head border-b border-[var(--border)] px-4 py-2.5 bg-[var(--bg-elev)] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 pr-2">
          {onBack && (
            <button
              type="button"
              className="mcw__back min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors mr-0.5"
              onClick={onBack}
              aria-label="Назад к списку чатов"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {isGroup ? (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg shadow"
              style={{
                background:
                  thread.groupMeta?.avatarColor ||
                  'linear-gradient(135deg, #ff7a18 0%, #af002d 100%)',
              }}
            >
              {thread.groupMeta?.avatarEmoji || '👥'}
            </div>
          ) : (
            <ChatAvatar friendId={friendId} size={42} ringColor="var(--bg-elev)" />
          )}

          <div className="mcw__ident min-w-0 flex-1">
            <span className="mcw__name text-sm sm:text-base font-bold text-[var(--text)] whitespace-nowrap overflow-visible flex items-center gap-1.5">
              <span>{title}</span>
              {friend?.verified && <Check size={13} className="text-[#1d9bf0] inline-block shrink-0" />}
            </span>

            <span className="mcw__status text-xs text-[var(--text-2)] whitespace-nowrap block">
              {pending ? (
                <span className="text-[#ffad5a] flex items-center gap-1 font-medium">
                  <span>печатает</span>
                  <span className="animate-pulse">.</span>
                  <span className="animate-pulse delay-100">.</span>
                  <span className="animate-pulse delay-200">.</span>
                </span>
              ) : isGroup ? (
                <span className="text-[var(--text-2)]">
                  {thread.groupMeta?.memberIds.length ?? 3} участников · 2 в сети
                </span>
              ) : (
                <span style={{ color: presence?.color ?? 'var(--text-2)' }}>
                  {presence?.short} · @{friend?.username}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Действия в шапке: 3 иконки (поиск, звонок/инфо, «⋯») с зазором ≥ 8px и зоной ≥ 34px */}
        <div className="mcw__head-actions flex items-center gap-2.5 shrink-0">
          {friend && (
            <span className="mcw__streak mr-1 hidden sm:flex items-center gap-1 text-xs text-[#ffad5a] bg-[#ff7a18]/10 px-2 py-1 rounded-full font-bold">
              <Flame size={13} fill="currentColor" /> {friend.streak}
            </span>
          )}

          {/* 1. Поиск */}
          <button
            type="button"
            className="mcw__head-btn min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
            onClick={() => setSearchOpen((v) => !v)}
            title="Поиск по сообщениям"
            aria-label="Поиск по сообщениям"
          >
            <Search size={18} />
          </button>

          {/* 2. Звонок / Инфо */}
          <button
            type="button"
            className="mcw__head-btn min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
            onClick={() => {
              playClick(soundEnabled)
              if (friend) {
                setFriendDetailOpen(true)
              } else {
                onNotify(`Групповой чат «${title}» (${thread.groupMeta?.memberIds.length ?? 3} уч.)`)
              }
            }}
            title={friend ? `Профиль ${friend.name}` : 'Информация о группе'}
            aria-label="Информация и звонок"
          >
            <Info size={18} />
          </button>

          {/* 3. Меню «⋯» */}
          <div className="relative">
            <button
              type="button"
              className="mcw__head-btn min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
              title="Дополнительные действия"
              aria-label="Меню действий"
            >
              <MoreVertical size={18} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-40 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-1.5 shadow-2xl animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onNotify(`Аудиовызов: соединение с ${title}... (демо-звонок)`)
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg-hover)]"
                >
                  <Phone size={15} className="text-[#00ba7c]" />
                  <span>Позвонить</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePin()
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg-hover)]"
                >
                  <Pin size={15} />
                  <span>{thread.pinned ? 'Открепить диалог' : 'Закрепить сверху'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleMute()
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg-hover)]"
                >
                  {thread.muted ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  <span>{thread.muted ? 'Включить звук' : 'Без звука'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectionMode(true)
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg-hover)]"
                >
                  <CheckSquare size={15} />
                  <span>Выбрать сообщения</span>
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={15} />
                  <span>Очистить переписку</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Панель поиска по переписке */}
      {searchOpen && (
        <ChatSearchBar
          query={searchQuery}
          onChangeQuery={setSearchQuery}
          currentIndex={searchMatchIndex}
          totalMatches={searchMatches.length}
          onNext={() => {
            if (searchMatches.length === 0) return
            const nextIdx = (searchMatchIndex + 1) % searchMatches.length
            setSearchMatchIndex(nextIdx)
            scrollToMessage(searchMatches[nextIdx].id)
          }}
          onPrev={() => {
            if (searchMatches.length === 0) return
            const prevIdx =
              (searchMatchIndex - 1 + searchMatches.length) % searchMatches.length
            setSearchMatchIndex(prevIdx)
            scrollToMessage(searchMatches[prevIdx].id)
          }}
          onClose={() => {
            setSearchOpen(false)
            setSearchQuery('')
          }}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Баннер закреплённого сообщения в шапке */}
      {pinnedMessage && (
        <ChatPinnedBanner
          message={pinnedMessage}
          onJumpToMessage={scrollToMessage}
          onUnpin={() => togglePinChatMessage(friendId, pinnedMessage.id)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Тело переписки (лента сообщений) */}
      <div
        className="mcw__body flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
        ref={bodyRef}
        onScroll={handleScroll}
      >
        {/* Кнопка подгрузки более ранней истории */}
        {totalMessagesCount > visibleCount && (
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setVisibleCount((v) => Math.min(totalMessagesCount, v + PAGE_SIZE))
              }}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-[#ffad5a] hover:bg-white/10 shadow-sm transition-colors"
            >
              Загрузить более ранние сообщения ({totalMessagesCount - visibleCount})
            </button>
          </div>
        )}

        {allMessages.length === 0 ? (
          <div className="mcw__intro flex flex-col items-center justify-center p-8 text-center my-auto">
            {isGroup ? (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-lg mb-3"
                style={{
                  background:
                    thread.groupMeta?.avatarColor ||
                    'linear-gradient(135deg, #ff7a18 0%, #af002d 100%)',
                }}
              >
                {thread.groupMeta?.avatarEmoji || '👥'}
              </div>
            ) : (
              <ChatAvatar friendId={friendId} size={64} ringColor="#0b0c0d" />
            )}
            <p className="mcw__intro-name text-base font-semibold text-white mt-2">{title}</p>
            <p className="mcw__intro-bio text-xs text-[#71767b] max-w-sm mt-1">
              {isGroup ? thread.groupMeta?.description : friend?.bio}
            </p>
            <p className="mcw__intro-hint text-xs text-[#ffad5a] mt-3">
              Это начало вашей переписки. Отправь «Держим огонь 🔥» или поделись карточкой гордости!
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.key} className="mcw__group space-y-1">
              {/* Разделитель дня (Telegram floating date pill) */}
              <div className="mcw__day flex justify-center my-3 sticky top-2 z-10">
                <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-[#e7e9ea] backdrop-blur-md border border-white/5 shadow-sm">
                  {group.label}
                </span>
              </div>

              {/* Сообщения дня */}
              <div className="mcw__group-list space-y-1">
                {group.items.map((message, idx) => {
                  const prevMsg = group.items[idx - 1]
                  const nextMsg = group.items[idx + 1]
                  const isFirstInGroup = !prevMsg || prevMsg.authorId !== message.authorId
                  const isLastInGroup = !nextMsg || nextMsg.authorId !== message.authorId

                  return (
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
                      onReply={(msg) => {
                        setReplyingTo(msg)
                        setEditingMessage(null)
                      }}
                      onEdit={handleStartEdit}
                      onPin={(msgId) => {
                        const pinned = togglePinChatMessage(friendId, msgId)
                        onNotify(pinned ? 'Сообщение закреплено' : 'Сообщение откреплено')
                      }}
                      onDelete={(messageId) => {
                        deleteChatMessage(friendId, messageId)
                        onNotify('Сообщение удалено')
                      }}
                      onJumpToReply={scrollToMessage}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedMessageIds.includes(message.id)}
                      onToggleSelect={handleToggleSelect}
                      isGroup={isGroup}
                      showAuthorHeader={isFirstInGroup}
                      isFirstInGroup={isFirstInGroup}
                      isLastInGroup={isLastInGroup}
                      searchQuery={searchQuery}
                    />
                  )
                })}
              </div>
            </div>
          ))
        )}

        {pending && (
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#71767b]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff7a18] animate-ping" />
            <span className="font-medium text-[#ffad5a]">собеседник печатает...</span>
          </div>
        )}
      </div>

      {/* Плавающая кнопка прокрутки вниз (Telegram Scroll to bottom) */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute right-5 bottom-20 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-[#16181c] text-white shadow-2xl border border-white/10 hover:bg-[#ff7a18] transition-all hover:scale-105 active:scale-95"
          title="Вниз"
          aria-label="Прокрутить в самый низ"
        >
          <ArrowDown size={18} />
        </button>
      )}

      {/* Панель массового выбора сообщений или поле ввода */}
      {isSelectionMode ? (
        <ChatSelectionToolbar
          selectedCount={selectedMessageIds.length}
          onForward={() => {
            const first = allMessages.find((m) => selectedMessageIds.includes(m.id))
            if (first) {
              setForward({
                attachment: first.attachment ?? null,
                note: first.text || '',
              })
            }
          }}
          onDelete={handleDeleteSelected}
          onCancel={() => {
            setIsSelectionMode(false)
            setSelectedMessageIds([])
          }}
          soundEnabled={soundEnabled}
        />
      ) : (
        <ChatComposer
          friendName={title.split(/\s+/)[0] ?? title}
          draft={thread.draft ?? ''}
          onChangeDraft={(value) => setChatDraft(friendId, value)}
          onSend={handleSend}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => {
            setEditingMessage(null)
            setChatDraft(friendId, '')
          }}
          onSubmitEdit={handleSaveEdit}
          onEditLastMessage={handleEditLastMessage}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модалка пересылки */}
      {forward && (
        <ForwardToChatModal
          attachment={forward.attachment}
          initialNote={forward.note}
          soundEnabled={soundEnabled}
          onNotify={onNotify}
          onClose={() => setForward(null)}
        />
      )}

      {/* Модалка информации о друге */}
      {friendDetailOpen && friend && (
        <FriendDetailModal
          friendId={friendId}
          onClose={() => setFriendDetailOpen(false)}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  )
}

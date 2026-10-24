'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  Check,
  CheckSquare,
  Clock,
  FileText,
  Flame,
  Home,
  Image as ImageIcon,
  Info,
  Mic,
  MoreVertical,
  Paperclip,
  Pencil,
  Phone,
  Pin,
  Plus,
  Reply,
  Search,
  Send,
  Smile,
  Sparkles,
  Tag,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { getFriend, presenceMeta } from '@/lib/ogonek/friends'
import {
  chatDayKey,
  formatChatDayLabel,
  isGroupThread,
  QUICK_REPLIES,
  threadOf,
  threadTitle,
  unreadCount,
} from '@/lib/ogonek/messenger'
import { resolveEmojiChar } from '@/lib/ogonek/reactions'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type {
  ChatAttachment,
  ChatMessage,
  ChatMessageMedia,
  ChatMessageReply,
  ChatPoll,
} from '@/lib/ogonek/types'
import { ChatAvatar } from './chat-avatar'
import { ChatMessageBubble } from './chat-message-bubble'
import { ChatPinnedBanner } from './chat-pinned-banner'
import { ChatSearchBar } from './chat-search-bar'
import { ChatSelectionToolbar } from './chat-selection-toolbar'
import { ForwardToChatModal } from './forward-to-chat-modal'
import { ChatVoiceRecorder } from './chat-voice-recorder'
import { ChatCallModal } from './chat-call-modal'
import { ChatGifModal } from './chat-gif-modal'
import { ChatPollCreatorModal } from './chat-poll-creator-modal'
import { ChatScheduleModal } from './chat-schedule-modal'
import { ChatTagsModal } from './chat-tags-modal'
import { AttachCardPicker } from './attach-card-picker'
import { ChatAttachmentCard } from './chat-attachment-card'
import { FriendDetailModal } from '../friend-detail-modal'
import dynamic from 'next/dynamic'
import { Tooltip } from '../tooltip'

const ChatEmojiPicker = dynamic(
  () => import('./chat-emoji-picker').then((m) => m.ChatEmojiPicker),
  { ssr: false }
)

type Props = {
  friendId: string | null
  onBack?: () => void
  onNavigateHome?: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const PAGE_SIZE = 30

export function MessengerChatPane({
  friendId,
  onBack,
  onNavigateHome,
  onNotify,
  soundEnabled = true,
}: Props) {
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
    toggleThreadArchive,
    translateChatMessage,
    transcribeVoiceMessage,
    voteInPoll,
    toggleMessageLabel,
  } = useOgonekStore()

  // Состояние чата
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

  // Модальные окна
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [callIsVideo, setCallIsVideo] = useState(false)
  const [gifModalOpen, setGifModalOpen] = useState(false)
  const [pollModalOpen, setPollModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [tagsModalOpen, setTagsModalOpen] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [showQuickChips, setShowQuickChips] = useState(false)
  const [forwardModalData, setForwardModalData] = useState<{
    attachment: ChatAttachment | null
    note: string
  } | null>(null)

  // Вложения в черновике
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const [mediaAttachment, setMediaAttachment] = useState<ChatMessageMedia | null>(null)

  const bodyRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const thread = friendId ? threadOf(state.chatThreads ?? {}, friendId) : null
  const isGroup = friendId ? isGroupThread(thread ?? undefined, friendId) : false
  const isSaved = friendId === 'saved-messages'
  const friend = friendId && !isGroup && !isSaved ? getFriend(friendId) : null
  const title = isSaved ? 'Избранное' : friendId ? threadTitle(friendId, thread ?? undefined) : ''

  const allMessages = thread?.messages ?? []
  const totalMessagesCount = allMessages.length
  const draft = thread?.draft ?? ''

  // Подгрузка истории
  const messages = useMemo(() => {
    if (visibleCount >= totalMessagesCount) return allMessages
    return allMessages.slice(totalMessagesCount - visibleCount)
  }, [allMessages, visibleCount, totalMessagesCount])

  // Закреплённое сообщение
  const pinnedMessage = useMemo(() => {
    if (!thread?.pinnedMessageId) return null
    return allMessages.find((m) => m.id === thread.pinnedMessageId) ?? null
  }, [allMessages, thread?.pinnedMessageId])

  // Пометка прочитанным при открытии
  useEffect(() => {
    if (friendId) {
      markThreadRead(friendId)
    }
  }, [friendId, allMessages.length, markThreadRead])

  // Автопрокрутка вниз при новом сообщении
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [allMessages.length])

  // Авторесайз текстового поля ввода
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const newHeight = Math.min(el.scrollHeight, 160)
    el.style.height = `${Math.max(newHeight, 36)}px`
  }, [draft])

  const handleScroll = () => {
    const el = bodyRef.current
    if (!el) return
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBottom(distanceToBottom > 160)
  }

  const scrollToBottom = () => {
    const el = bodyRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  const scrollToMessage = (msgId: string) => {
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
    }, 120)
  }

  // Группировка сообщений по дням
  const groups = useMemo(() => {
    const result: Array<{ key: string; label: string; items: ChatMessage[] }> = []
    for (const msg of messages) {
      const key = chatDayKey(msg.createdAtISO)
      const current = result[result.length - 1]
      if (current && current.key === key) {
        current.items.push(msg)
      } else {
        result.push({ key, label: formatChatDayLabel(msg.createdAtISO), items: [msg] })
      }
    }
    return result
  }, [messages])

  // Отправка сообщения
  const canSend = draft.trim().length > 0 || Boolean(attachment) || Boolean(mediaAttachment)

  const handleSend = (options?: { silent?: boolean; scheduledForISO?: string | null }) => {
    if (!friendId) return
    if (editingMessage) {
      if (draft.trim()) {
        editChatMessage(friendId, editingMessage.id, draft.trim())
        onNotify('Сообщение изменено')
        setEditingMessage(null)
        setChatDraft(friendId, '')
      }
      return
    }

    if (!canSend) return

    const replyPayload: ChatMessageReply | null = replyingTo
      ? {
          id: replyingTo.id,
          authorId: replyingTo.authorId,
          text: replyingTo.text || replyingTo.attachment?.title || 'Вложение',
          attachmentSnippet: replyingTo.attachment?.title,
        }
      : null

    sendChatMessage(friendId, draft.trim(), attachment, {
      replyTo: replyPayload,
      media: mediaAttachment,
      silent: options?.silent,
      scheduledForISO: options?.scheduledForISO,
    })

    playSuccess(soundEnabled)
    setChatDraft(friendId, '')
    setAttachment(null)
    setMediaAttachment(null)
    setReplyingTo(null)
    setShowQuickChips(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'Escape') {
      if (replyingTo) setReplyingTo(null)
      if (editingMessage) {
        setEditingMessage(null)
        if (friendId) setChatDraft(friendId, '')
      }
    } else if (e.key === 'ArrowUp' && !draft.trim() && friendId) {
      // Редактировать последнее моё сообщение
      for (let i = allMessages.length - 1; i >= 0; i--) {
        if (allMessages[i].authorId === 'me' && allMessages[i].text) {
          setEditingMessage(allMessages[i])
          setChatDraft(friendId, allMessages[i].text)
          break
        }
      }
    }
  }

  const handleStartCall = (video: boolean) => {
    playClick(soundEnabled)
    setCallIsVideo(video)
    setCallModalOpen(true)
  }

  const handleCallFinished = (sec: number, type: 'audio' | 'video') => {
    setCallModalOpen(false)
    if (!friendId) return
    const m = Math.floor(sec / 60)
    const s = sec % 60
    const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`
    sendChatMessage(
      friendId,
      `${type === 'video' ? 'Видеозвонок' : 'Аудиозвонок'} завершён · ${timeStr}`,
      null,
      { type: 'system' }
    )
  }

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      onNotify('Файл слишком велик (максимум 50 МБ)')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setMediaAttachment({
        type: 'image',
        url: reader.result as string,
        name: file.name,
        sizeBytes: file.size,
      })
      onNotify('Фото прикреплено')
    }
    reader.readAsDataURL(file)
  }

  const handleDocumentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      onNotify('Файл слишком велик (максимум 50 МБ)')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setMediaAttachment({
        type: file.type.startsWith('video/') ? 'video' : 'file',
        url: reader.result as string,
        name: file.name,
        sizeBytes: file.size,
      })
      onNotify('Файл прикреплен')
    }
    reader.readAsDataURL(file)
  }

  // Если диалог не выбран — красивое пустое состояние на весь экран
  if (!friendId || (!friend && !isGroup && !isSaved)) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-[var(--bg)] text-center select-none">
        <div className="w-20 h-20 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-center text-4xl shadow-lg mb-4">
          🔥
        </div>
        <h2 className="text-2xl font-[800] text-[var(--text)] mb-2">Выберите чат</h2>
        <p className="text-sm text-[var(--text-2)] max-w-sm mb-6 leading-relaxed">
          Общайтесь с соратниками, делитесь карточками гордости, отправляйте голосовые и ставьте огоньки к победам.
        </p>
      </div>
    )
  }

  const presence = friend ? presenceMeta(friend.presence) : null

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--bg)] relative overflow-hidden select-text min-w-0">
      {/* Скрытые файловые инпуты */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleDocumentFile}
      />

      {/* 1. ШАПКА 72px: прозрачная с backdrop-blur-md, аватар 44px, имя 20px/800 + галочка, 3 кнопки 44px с рамкой 1px */}
      <header className="h-[72px] px-4 sm:px-6 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-30 shrink-0 gap-3">
        {/* Левая часть: кнопка Назад (на планшетах/мобильных) + Аватар + Имя со статусом */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors shrink-0 -ml-1"
              aria-label="Назад к списку чатов"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors shrink-0 lg:hidden"
              aria-label="На главную"
            >
              <Home size={18} />
            </button>
          )}

          {/* Аватар 44px */}
          <div className="relative shrink-0 w-[40px] h-[40px] sm:w-[44px] sm:h-[44px]">
            {isSaved ? (
              <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-full bg-gradient-to-br from-[#ff7a18] to-[#ff5200] flex items-center justify-center text-lg sm:text-xl shadow text-white">
                ⭐️
              </div>
            ) : isGroup ? (
              <div
                className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-full flex items-center justify-center text-lg sm:text-xl shadow"
                style={{
                  background:
                    thread?.groupMeta?.avatarColor ||
                    'linear-gradient(135deg, #ff7a18 0%, #af002d 100%)',
                }}
              >
                {thread?.groupMeta?.avatarEmoji || '👥'}
              </div>
            ) : (
              <ChatAvatar friendId={friendId} size={40} ringColor="var(--bg)" />
            )}
          </div>

          {/* Имя и статус: обрезается через ... и НИКОГДА не наезжает на кнопки */}
          <div className="flex flex-col min-w-0 flex-1 justify-center">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[16px] sm:text-[20px] font-[800] text-[var(--text)] truncate leading-tight">
                {title}
              </span>
              {friend?.verified && (
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[var(--accent)] text-white inline-flex items-center justify-center shrink-0">
                  <Check size={9} strokeWidth={3} />
                </span>
              )}
            </div>

            <span className="text-[12px] sm:text-[14px] text-[var(--text-2)] truncate leading-tight block">
              {isSaved ? (
                'Личные заметки и сохранённое'
              ) : isGroup ? (
                `${thread?.groupMeta?.memberIds.length ?? 3} участников, 2 в сети`
              ) : (
                presence?.short || 'в сети'
              )}
            </span>
          </div>
        </div>

        {/* Правая часть: Три круглые кнопки 44px с рамкой 1px (Аудиозвонок, Видеозвонок, ⋯) */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* 1. Аудиозвонок */}
          <button
            type="button"
            onClick={() => handleStartCall(false)}
            className="w-[36px] h-[36px] sm:w-[44px] sm:h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
            aria-label="Аудиозвонок"
            title="Аудиозвонок"
          >
            <Phone size={16} />
          </button>

          {/* 2. Видеозвонок */}
          <button
            type="button"
            onClick={() => handleStartCall(true)}
            className="w-[36px] h-[36px] sm:w-[44px] sm:h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
            aria-label="Видеозвонок"
            title="Видеозвонок"
          >
            <Video size={16} />
          </button>

          {/* 3. Меню «⋯» */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-[36px] h-[36px] sm:w-[44px] sm:h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
              aria-label="Меню чата"
              title="Дополнительно"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-md text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen((v) => !v)
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                  >
                    <Search size={15} /> Поиск по чату
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleThreadPin(friendId)
                      setMenuOpen(false)
                      onNotify(thread?.pinned ? 'Чат откреплён' : 'Чат закреплён сверху')
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                  >
                    <Pin size={15} /> {thread?.pinned ? 'Открепить чат' : 'Закрепить чат'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleThreadMute(friendId)
                      setMenuOpen(false)
                      onNotify(thread?.muted ? 'Звук включён' : 'Уведомления отключены')
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                  >
                    {thread?.muted ? <Volume2 size={15} /> : <VolumeX size={15} />}
                    {thread?.muted ? 'Включить звук' : 'Без звука'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTagsModalOpen(true)
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                  >
                    <Tag size={15} /> Теги диалога
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectionMode(true)
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                  >
                    <CheckSquare size={15} /> Выбрать сообщения
                  </button>
                  {friend && (
                    <button
                      type="button"
                      onClick={() => {
                        setFriendDetailOpen(true)
                        setMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                    >
                      <Info size={15} /> Информация о друге
                    </button>
                  )}
                  <div className="h-[1px] bg-[var(--border)] my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Очистить всю историю этого чата?')) {
                        clearThreadMessages(friendId)
                        onNotify('История переписки очищена')
                      }
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={15} /> Очистить историю
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Поиск по сообщениям */}
      {searchOpen && (
        <ChatSearchBar
          query={searchQuery}
          onChangeQuery={setSearchQuery}
          currentIndex={searchMatchIndex}
          totalMatches={0}
          onPrev={() => {}}
          onNext={() => {}}
          onClose={() => {
            setSearchOpen(false)
            setSearchQuery('')
          }}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Баннер закреплённого сообщения */}
      {pinnedMessage && (
        <ChatPinnedBanner
          message={pinnedMessage}
          onJumpToMessage={scrollToMessage}
          onUnpin={() => togglePinChatMessage(friendId, pinnedMessage.id)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Панель массового выбора сообщений */}
      {isSelectionMode && (
        <ChatSelectionToolbar
          selectedCount={selectedMessageIds.length}
          onDelete={() => {
            deleteChatMessages(friendId, selectedMessageIds)
            setSelectedMessageIds([])
            setIsSelectionMode(false)
            onNotify('Выбранные сообщения удалены')
          }}
          onForward={() => {
            onNotify('Пересылка сообщений...')
            setSelectedMessageIds([])
            setIsSelectionMode(false)
          }}
          onCancel={() => {
            setSelectedMessageIds([])
            setIsSelectionMode(false)
          }}
        />
      )}

      {/* 2. ЛЕНТА СООБЩЕНИЙ: центрирована, макс. ширина 820px */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scroll-smooth"
        ref={bodyRef}
        onScroll={handleScroll}
      >
        <div className="w-full max-w-[820px] mx-auto flex flex-col justify-end min-h-full">
          {/* Подгрузка более ранней истории */}
          {totalMessagesCount > visibleCount && (
            <div className="flex justify-center py-2 mb-2">
              <button
                type="button"
                onClick={() => setVisibleCount((v) => Math.min(totalMessagesCount, v + PAGE_SIZE))}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--bg-hover)] shadow-sm transition-colors"
              >
                Загрузить более ранние сообщения ({totalMessagesCount - visibleCount})
              </button>
            </div>
          )}

          {allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center my-auto">
              <ChatAvatar friendId={friendId} size={72} ringColor="var(--border)" />
              <p className="text-lg font-bold text-[var(--text)] mt-3">{title}</p>
              <p className="text-xs text-[var(--text-2)] max-w-sm mt-1">
                {isGroup ? thread?.groupMeta?.description : friend?.bio || 'Начало переписки в Огоньке.'}
              </p>
              <p className="text-xs text-[var(--accent)] font-semibold mt-4">
                Это начало вашей истории. Отправьте «Держим огонь 🔥» или поделитесь победой!
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.key} className="w-full flex flex-col space-y-1">
                {/* Разделитель дня: отдельная центрированная строка на всю ширину */}
                <div className="w-full flex justify-center my-4 sticky top-2 z-10 pointer-events-none select-none clear-both">
                  <span className="inline-flex items-center justify-center rounded-full bg-[var(--bg-elev)]/90 px-4 py-1 text-[12px] font-bold text-[var(--text-2)] backdrop-blur-md border border-[var(--border)] shadow-sm pointer-events-auto">
                    {group.label}
                  </span>
                </div>

                {/* Сообщения дня */}
                <div className="w-full flex flex-col space-y-1">
                  {group.items.map((msg, idx) => {
                    const prev = group.items[idx - 1]
                    const next = group.items[idx + 1]
                    const isFirstInGroup = !prev || prev.authorId !== msg.authorId
                    const isLastInGroup = !next || next.authorId !== msg.authorId

                    return (
                      <ChatMessageBubble
                        key={msg.id}
                        message={msg}
                        isMine={msg.authorId === 'me'}
                        resolveChar={(emojiId) => resolveEmojiChar(emojiId, state.customEmojis)}
                        customEmojis={state.customEmojis}
                        onToggleReaction={(emojiId) => toggleChatReaction(friendId, msg.id, emojiId)}
                        onForward={(m) => setForwardModalData({ attachment: m.attachment, note: m.text })}
                        onReply={(m) => setReplyingTo(m)}
                        onEdit={(m) => {
                          setEditingMessage(m)
                          setChatDraft(friendId, m.text)
                          textareaRef.current?.focus()
                        }}
                        onPin={(id) => togglePinChatMessage(friendId, id)}
                        onDelete={(id, forEveryone) => deleteChatMessage(friendId, id, forEveryone)}
                        onJumpToReply={scrollToMessage}
                        onTranslate={(id, text) => translateChatMessage(friendId, id, 'ru', text)}
                        onTranscribe={(id) => transcribeVoiceMessage(friendId, id, 'Расшифровка голоса выполнена.')}
                        onVotePoll={(id, idx) => voteInPoll(friendId, id, idx)}
                        onToggleLabel={(id, label) => toggleMessageLabel(friendId, id, label)}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedMessageIds.includes(msg.id)}
                        onToggleSelect={(id) => {
                          setSelectedMessageIds((ids) =>
                            ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
                          )
                        }}
                        isGroup={isGroup}
                        showAuthorHeader={isGroup}
                        isFirstInGroup={isFirstInGroup}
                        isLastInGroup={isLastInGroup}
                        searchQuery={searchQuery}
                        soundEnabled={soundEnabled}
                        onNotify={onNotify}
                      />
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Кнопка прокрутки вниз */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute right-6 bottom-24 z-20 w-11 h-11 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center shadow-2xl hover:bg-[var(--bg-hover)] active:scale-95 transition-all"
          aria-label="Вниз к новым сообщениям"
        >
          <ArrowDown size={18} />
        </button>
      )}

      {/* 3. ПАНЕЛЬ ВВОДА ВНИЗУ (как на скриншоте X):
          Слева круглые 44px кнопки с рамкой 1px: «+» (вложения), «GIF», «😊».
          Затем поле-пилюля flex:1 (мин 48px), плейсхолдер короткий «Написать сообщение».
          Внутри поля справа микрофон (превращается в стрелку отправки, когда есть текст).
      */}
      <div className="w-full border-t border-[var(--border)] bg-[var(--bg)] px-3 sm:px-6 py-2.5 shrink-0 z-20">
        <div className="w-full max-w-[820px] mx-auto flex flex-col gap-1.5">
          {/* Полоска ответа / редактирования / пересылки */}
          {replyingTo && (
            <div className="flex items-center justify-between border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 rounded-r-xl">
              <div className="flex items-center gap-2 min-w-0">
                <Reply size={15} className="text-[var(--accent)] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[var(--accent)] leading-tight">
                    В ответ {replyingTo.authorId === 'me' ? 'себе' : title}
                  </p>
                  <p className="truncate text-xs text-[var(--text)] opacity-90 leading-tight">
                    {replyingTo.text || replyingTo.attachment?.title || 'Вложение'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)]"
                aria-label="Отменить ответ"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {editingMessage && (
            <div className="flex items-center justify-between border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 rounded-r-xl">
              <div className="flex items-center gap-2 min-w-0">
                <Pencil size={15} className="text-[var(--accent)] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[var(--accent)] leading-tight">
                    Редактирование сообщения
                  </p>
                  <p className="truncate text-xs text-[var(--text)] opacity-90 leading-tight">
                    {editingMessage.text}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingMessage(null)
                  setChatDraft(friendId, '')
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)]"
                aria-label="Отменить редактирование"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Превью прикреплённой карточки */}
          {attachment && (
            <div className="relative mb-1 rounded-xl p-1 bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-between">
              <ChatAttachmentCard attachment={attachment} compact />
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)]"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Превью медиа-файла */}
          {mediaAttachment && (
            <div className="relative mb-1 p-2 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {mediaAttachment.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaAttachment.url}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[var(--text)]">
                    {mediaAttachment.name || 'Медиафайл'}
                  </p>
                  <p className="text-[10px] text-[var(--text-2)]">
                    {mediaAttachment.sizeBytes
                      ? `${Math.round(mediaAttachment.sizeBytes / 1024)} КБ`
                      : 'Готово к отправке'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMediaAttachment(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)]"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Быстрые ответы по кнопке «⚡» или если переписка пуста */}
          {(showQuickChips || allMessages.length === 0) && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none no-scrollbar">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setChatDraft(friendId, reply)
                    textareaRef.current?.focus()
                  }}
                  className="shrink-0 h-[32px] px-3 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Строка ввода или запись голоса */}
          {voiceRecording ? (
            <ChatVoiceRecorder
              onSendVoice={(voiceMedia) => {
                setVoiceRecording(false)
                sendChatMessage(friendId, '', null, { media: voiceMedia })
                playSuccess(soundEnabled)
              }}
              onCancel={() => setVoiceRecording(false)}
              soundEnabled={soundEnabled}
            />
          ) : (
            <div className="flex items-end gap-2 w-full">
              {/* Три круглые кнопки 44px с рамкой 1px слева: «+», «GIF», «😊» */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* 1. Кнопка «+» (вложения) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      setAttachMenuOpen((v) => !v)
                    }}
                    className="w-[44px] h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
                    aria-label="Вложения"
                    title="Прикрепить фото, файл, опрос или карточку"
                  >
                    <Plus size={20} strokeWidth={2.2} />
                  </button>

                  {attachMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setAttachMenuOpen(false)} />
                      <div className="absolute left-0 bottom-full mb-2 w-52 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-1.5 shadow-2xl z-40 animate-in fade-in zoom-in-95 backdrop-blur-md text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false)
                            imageInputRef.current?.click()
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                        >
                          <ImageIcon size={16} className="text-[#1d9bf0]" /> Фото или видео
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false)
                            fileInputRef.current?.click()
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                        >
                          <FileText size={16} className="text-[#00ba7c]" /> Документ / Файл
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false)
                            setPollModalOpen(true)
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                        >
                          <span className="text-base">📊</span> Опрос
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false)
                            setAttachOpen(true)
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                        >
                          <Sparkles size={16} className="text-[var(--accent)]" /> Карточка Огонька
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 2. Кнопка «GIF» */}
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setGifModalOpen(true)
                  }}
                  className="w-[44px] h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] text-[12px] font-extrabold flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
                  aria-label="Выбрать GIF"
                  title="GIF-анимация"
                >
                  GIF
                </button>

                {/* 3. Кнопка «😊» (эмодзи) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      setEmojiOpen((v) => !v)
                    }}
                    className="w-[44px] h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
                    aria-label="Эмодзи и стикеры"
                    title="Эмодзи"
                  >
                    <Smile size={20} />
                  </button>

                  {emojiOpen && (
                    <ChatEmojiPicker
                      onPickEmoji={(emoji) => {
                        setChatDraft(friendId, `${draft}${emoji}`)
                        textareaRef.current?.focus()
                      }}
                      onPickSticker={(stk) => {
                        setEmojiOpen(false)
                        sendChatMessage(friendId, '', null, {
                          media: { type: 'sticker', url: stk.id, name: stk.title },
                        })
                      }}
                      onClose={() => setEmojiOpen(false)}
                      soundEnabled={soundEnabled}
                    />
                  )}
                </div>

                {/* Кнопка быстрых ответов «⚡» */}
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setShowQuickChips((v) => !v)
                  }}
                  className={`w-[44px] h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                    showQuickChips ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text)]'
                  }`}
                  aria-label="Быстрые ответы"
                  title="Быстрые ответы Огонька"
                >
                  <Zap size={18} fill={showQuickChips ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Поле-пилюля flex:1 (мин 48px), плейсхолдер короткий «Написать сообщение» */}
              <div className="flex-1 min-w-[280px] min-h-[48px] rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 flex items-center gap-2 focus-within:border-[var(--accent)] transition-colors relative shadow-inner">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setChatDraft(friendId, e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Написать сообщение..."
                  rows={1}
                  className="flex-1 min-w-0 bg-transparent text-[15px] leading-relaxed text-[var(--text)] placeholder:text-[var(--text-2)] resize-none outline-none max-h-[160px]"
                  aria-label="Текст сообщения"
                />

                {/* Справа внутри поля: микрофон (голосовое) или стрелка отправки */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {canSend || editingMessage ? (
                    <div className="flex items-center gap-1">
                      {/* Меню отложенной отправки / без звука */}
                      <button
                        type="button"
                        onClick={() => {
                          playClick(soundEnabled)
                          setScheduleModalOpen(true)
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
                        title="Отправить позже или без звука"
                        aria-label="Опции отправки"
                      >
                        <Clock size={16} />
                      </button>

                      {/* Стрелка отправки */}
                      <Tooltip content="Отправить (Enter)" side="top">
                        <button
                          type="button"
                          onClick={() => handleSend()}
                          className="w-[36px] h-[36px] rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center shadow-md hover:opacity-90 active:scale-95 transition-all"
                          aria-label="Отправить сообщение"
                        >
                          <Send size={16} className="-ml-0.5" />
                        </button>
                      </Tooltip>
                    </div>
                  ) : (
                    <Tooltip content="Записать голосовое (нажмите для записи)" side="top">
                      <button
                        type="button"
                        onClick={() => {
                          playClick(soundEnabled)
                          setVoiceRecording(true)
                        }}
                        className="w-[36px] h-[36px] rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
                        aria-label="Записать голосовое сообщение"
                      >
                        <Mic size={19} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно аудио/видео звонка */}
      {callModalOpen && (
        <ChatCallModal
          friendId={friendId}
          friendName={title}
          isVideo={callIsVideo}
          onEndCall={handleCallFinished}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модальное окно поиска GIF */}
      {gifModalOpen && (
        <ChatGifModal
          onSelectGif={(url) => {
            sendChatMessage(friendId, '', null, {
              media: { type: 'image', url, name: 'GIF-анимация' },
            })
          }}
          onClose={() => setGifModalOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модальное окно создания опроса */}
      {pollModalOpen && (
        <ChatPollCreatorModal
          onCreatePoll={(poll) => {
            sendChatMessage(friendId, '', null, { poll, type: 'poll' })
          }}
          onClose={() => setPollModalOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модальное окно отложенной отправки */}
      {scheduleModalOpen && (
        <ChatScheduleModal
          onSchedule={(iso, silent) => handleSend({ scheduledForISO: iso, silent })}
          onSendSilent={() => handleSend({ silent: true })}
          onClose={() => setScheduleModalOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модальное окно тегов диалога */}
      {tagsModalOpen && (
        <ChatTagsModal
          friendId={friendId}
          onClose={() => setTagsModalOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модальное окно пересылки в другой чат */}
      {forwardModalData && (
        <ForwardToChatModal
          attachment={forwardModalData.attachment}
          initialNote={forwardModalData.note}
          onClose={() => setForwardModalData(null)}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Выбор карточки гордости/благодарности для чата */}
      {attachOpen && (
        <AttachCardPicker
          onPick={(att) => {
            setAttachment(att)
            setAttachOpen(false)
          }}
          onClose={() => setAttachOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Профиль друга */}
      {friendDetailOpen && friendId && (
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

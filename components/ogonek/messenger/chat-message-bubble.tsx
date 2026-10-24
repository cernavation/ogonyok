'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Check,
  CheckCheck,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Forward,
  MoreHorizontal,
  Pencil,
  Pin,
  Reply,
  SmilePlus,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { getFriend } from '@/lib/ogonek/friends'
import { formatChatTime, STICKER_PACK } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ChatMessage, CustomEmoji } from '@/lib/ogonek/types'
import { ChatAttachmentCard } from './chat-attachment-card'
import { ChatMediaLightbox } from './chat-media-lightbox'
import { ChatVoicePlayer } from './chat-voice-player'
import { MessageReactionPicker } from './message-reaction-picker'

type Props = {
  message: ChatMessage
  isMine: boolean
  resolveChar: (emojiId: string) => string
  customEmojis: CustomEmoji[]
  onToggleReaction: (emojiId: string) => void
  onForward: (message: ChatMessage) => void
  onReply?: (message: ChatMessage) => void
  onEdit?: (message: ChatMessage) => void
  onPin?: (messageId: string) => void
  onDelete: (messageId: string) => void
  onJumpToReply?: (replyMessageId: string) => void
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (messageId: string) => void
  isGroup?: boolean
  showAuthorHeader?: boolean
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  searchQuery?: string
  soundEnabled?: boolean
  onNotify?: (message: string) => void
}

export function ChatMessageBubble({
  message,
  isMine,
  resolveChar,
  customEmojis,
  onToggleReaction,
  onForward,
  onReply,
  onEdit,
  onPin,
  onDelete,
  onJumpToReply,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  isGroup = false,
  showAuthorHeader = false,
  isFirstInGroup = true,
  isLastInGroup = true,
  searchQuery = '',
  soundEnabled = true,
  onNotify,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const reduce = useReducedMotion()

  const friend = !isMine ? getFriend(message.authorId) : null
  const authorName = isMine ? 'Ты' : friend?.name || 'Участник'

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
      onNotify?.('Текст скопирован')
    } catch {
      onNotify?.('Не удалось скопировать')
    }
    setMenuOpen(false)
  }

  // Highlight search query in text
  const renderHighlightedText = (text: string) => {
    if (!searchQuery.trim()) return text
    const parts = text.split(new RegExp(`(${searchQuery.trim()})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.trim().toLowerCase() ? (
        <mark key={i} className="bg-[#ff7a18] text-white rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  // Is this message a standalone sticker?
  const isSticker = message.media?.type === 'sticker'
  const stickerData = isSticker
    ? STICKER_PACK.find((s) => s.id === message.media?.url)
    : null

  return (
    <>
      <motion.div
        id={`msg-${message.id}`}
        className={`group relative flex items-end gap-2 my-0.5 ${
          isMine ? 'justify-end' : 'justify-start'
        } ${isSelected ? 'bg-white/[0.04] -mx-4 px-4 py-1 rounded-xl' : ''}`}
        initial={reduce ? false : { opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.14, ease: 'easeOut' }}
      >
        {/* Чекбокс выбора сообщений */}
        {isSelectionMode && (
          <button
            type="button"
            onClick={() => onToggleSelect?.(message.id)}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
              isSelected
                ? 'border-[#ff7a18] bg-[#ff7a18] text-white'
                : 'border-white/30 hover:border-white'
            }`}
          >
            {isSelected && <Check size={12} />}
          </button>
        )}

        <div className={`relative max-w-[82%] sm:max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
          {/* Панель быстрых действий на hover / focus */}
          {!isSelectionMode && (
            <div
              className={`absolute top-0 z-20 flex items-center gap-0.5 rounded-full border border-white/10 bg-[#16181c]/95 px-1 py-0.5 opacity-0 shadow-xl backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 ${
                isMine ? 'right-full mr-1.5' : 'left-full ml-1.5'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  setPickerOpen((v) => !v)
                }}
                className="grid h-6 w-6 place-items-center rounded-full text-[#71767b] hover:bg-white/10 hover:text-[#ffad5a]"
                title="Поставить реакцию"
                aria-label="Поставить реакцию"
              >
                <SmilePlus size={14} />
              </button>
              {onReply && (
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onReply(message)
                  }}
                  className="grid h-6 w-6 place-items-center rounded-full text-[#71767b] hover:bg-white/10 hover:text-[#1d9bf0]"
                  title="Ответить"
                  aria-label="Ответить"
                >
                  <Reply size={14} />
                </button>
              )}
              {isMine && onEdit && !isSticker && (
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onEdit(message)
                  }}
                  className="grid h-6 w-6 place-items-center rounded-full text-[#71767b] hover:bg-white/10 hover:text-[#ffad5a]"
                  title="Редактировать"
                  aria-label="Редактировать"
                >
                  <Pencil size={13} />
                </button>
              )}
              {onPin && (
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onPin(message.id)
                  }}
                  className="grid h-6 w-6 place-items-center rounded-full text-[#71767b] hover:bg-white/10 hover:text-[#ffd700]"
                  title={message.pinned ? 'Открепить' : 'Закрепить'}
                  aria-label="Закрепить сообщение"
                >
                  <Pin size={13} className="rotate-45" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  onForward(message)
                }}
                className="grid h-6 w-6 place-items-center rounded-full text-[#71767b] hover:bg-white/10 hover:text-[#00ba7c]"
                title="Переслать"
                aria-label="Переслать"
              >
                <Forward size={14} />
              </button>
              {message.text && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="grid h-6 w-6 place-items-center rounded-full text-[#71767b] hover:bg-white/10 hover:text-white"
                  title="Копировать"
                  aria-label="Копировать текст"
                >
                  <Copy size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  onDelete(message.id)
                }}
                className="grid h-6 w-6 place-items-center rounded-full text-[#71767b] hover:bg-red-500/20 hover:text-red-400"
                title="Удалить"
                aria-label="Удалить сообщение"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}

          {/* Всплывающее окно реакций */}
          <AnimatePresence>
            {pickerOpen && (
              <MessageReactionPicker
                currentIds={myReactionIds}
                customEmojis={customEmojis}
                onPick={(emojiId) => {
                  onToggleReaction(emojiId)
                  setPickerOpen(false)
                }}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Каркас сообщения */}
          {isSticker ? (
            /* Стикер (без пузыря, как в Telegram) */
            <div className="flex flex-col items-end my-1">
              <span className="text-6xl hover:scale-110 transition-transform cursor-pointer drop-shadow-lg">
                {stickerData?.emoji || '🔥'}
              </span>
              <span className="text-[10px] text-[#71767b] font-mono mt-0.5">
                {formatChatTime(message.createdAtISO)}
              </span>
            </div>
          ) : (
            /* Пузырь сообщения (свои — акцентный цвет, чужие — --bg-elev) */
            <div
              className={`relative overflow-hidden px-3.5 py-2.5 text-[14px] leading-[20px] shadow-sm transition-all ${
                isMine
                  ? 'rounded-2xl bg-[var(--accent)] text-[var(--accent-text)]'
                  : 'rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)]'
              } ${isFirstInGroup && isMine ? 'rounded-tr-2xl' : ''} ${
                isLastInGroup && isMine ? 'rounded-br-sm' : ''
              } ${isFirstInGroup && !isMine ? 'rounded-tl-2xl' : ''} ${
                isLastInGroup && !isMine ? 'rounded-bl-sm' : ''
              }`}
            >
              {/* Имя автора в группе */}
              {isGroup && !isMine && showAuthorHeader && (
                <div
                  className="mb-1 text-[12px] font-semibold tracking-wide"
                  style={{ color: friend?.avatarColor ? '#ffad5a' : '#1d9bf0' }}
                >
                  {authorName}
                </div>
              )}

              {/* Метка "Переслано от" (Telegram Forward) */}
              {message.forwardFrom && (
                <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-white/70 italic border-l-2 border-white/40 pl-1.5">
                  <Forward size={12} />
                  <span>Переслано от {message.forwardFrom.authorName}</span>
                </div>
              )}

              {/* Цитата ответа (Telegram Reply Quote) */}
              {message.replyTo && (
                <button
                  type="button"
                  onClick={() => onJumpToReply?.(message.replyTo!.id)}
                  className={`mb-1.5 flex w-full flex-col text-left rounded-md border-l-2 py-1 px-2 transition-opacity hover:opacity-85 ${
                    isMine
                      ? 'border-white bg-white/10 text-white'
                      : 'border-[#1d9bf0] bg-[#1d9bf0]/10 text-[#e7e9ea]'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-[#ffad5a] leading-none mb-0.5">
                    {message.replyTo.authorId === 'me' ? 'Ты' : authorName}
                  </span>
                  <span className="truncate text-xs opacity-90 leading-tight">
                    {message.replyTo.text}
                  </span>
                </button>
              )}

              {/* Карточка-вложение Огонька (гордость, день, сторис) */}
              {message.attachment && (
                <div className="mb-1.5 w-full min-w-[220px]">
                  <ChatAttachmentCard attachment={message.attachment} />
                </div>
              )}

              {/* Фотография */}
              {message.media?.type === 'image' && (
                <div className="mb-1.5 overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={message.media.url}
                    alt={message.media.name || 'Фотография'}
                    className="max-h-72 w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => setLightboxUrl(message.media!.url)}
                  />
                </div>
              )}

              {/* Голосовое сообщение */}
              {message.media?.type === 'audio' && (
                <div className="min-w-[200px] mb-1">
                  <ChatVoicePlayer
                    media={message.media}
                    isMine={isMine}
                    soundEnabled={soundEnabled}
                  />
                </div>
              )}

              {/* Документ / Файл */}
              {message.media?.type === 'file' && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ff7a18]/20 text-[#ffad5a]">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white">{message.media.name}</p>
                      <p className="text-[10px] text-white/60">
                        {message.media.sizeBytes
                          ? `${Math.round(message.media.sizeBytes / 1024)} КБ`
                          : 'Файл'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={message.media.url}
                    download={message.media.name || 'file'}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    <Download size={14} />
                  </a>
                </div>
              )}

              {/* Текст сообщения */}
              {message.text && (
                <p className="whitespace-pre-wrap break-words">
                  {renderHighlightedText(message.text)}
                </p>
              )}

              {/* Превью ссылки (OpenGraph) */}
              {message.linkPreview && (
                <a
                  href={message.linkPreview.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-2 flex flex-col rounded-xl border p-2.5 text-xs transition-opacity hover:opacity-90 ${
                    isMine
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-white/10 bg-black/20 text-[#e7e9ea]'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-[#ffad5a] text-[11px] mb-0.5">
                    <span>{message.linkPreview.siteName}</span>
                    <ExternalLink size={12} />
                  </div>
                  <p className="font-medium text-white text-xs mb-0.5">{message.linkPreview.title}</p>
                  {message.linkPreview.description && (
                    <p className="line-clamp-2 text-[11px] text-white/70">
                      {message.linkPreview.description}
                    </p>
                  )}
                </a>
              )}

              {/* Нижняя строка: время, (ред.), закреп, галочки ✓✓ */}
              <div
                className={`mt-1 flex items-center justify-end gap-1 text-[11px] font-mono leading-none ${
                  isMine ? 'text-white/80' : 'text-[#71767b]'
                }`}
              >
                {message.pinned && <Pin size={11} className="rotate-45 text-[#ffd700]" />}
                {message.editedAtISO && <span className="text-[10px] italic">ред.</span>}
                <span>{formatChatTime(message.createdAtISO)}</span>
                {isMine && (
                  <span className="ml-0.5">
                    {message.status === 'sending' ? (
                      <Clock size={11} className="opacity-70 animate-spin" />
                    ) : message.read || message.status === 'read' ? (
                      <CheckCheck size={14} className="text-[#66ffd9]" />
                    ) : (
                      <Check size={13} className="opacity-80" />
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Реакции под пузырём */}
          {reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
              {reactions.map((r) => (
                <button
                  key={r.emojiId}
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onToggleReaction(r.emojiId)
                  }}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm transition-transform active:scale-95 ${
                    r.mine
                      ? 'border border-[#ff7a18] bg-[#ff7a18]/20 text-[#ffad5a]'
                      : 'border border-white/10 bg-[#202327] text-white hover:bg-white/10'
                  }`}
                >
                  <span>{resolveChar(r.emojiId)}</span>
                  <span className="text-[11px]">{r.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Лайтбокс фото */}
      {lightboxUrl && (
        <ChatMediaLightbox
          imageUrl={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </>
  )
}

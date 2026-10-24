'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  BellOff,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Forward,
  Languages,
  Mic,
  MoreHorizontal,
  Pencil,
  Pin,
  Reply,
  SmilePlus,
  Sparkles,
  Tag,
  Trash2,
  Volume2,
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
  onDelete: (messageId: string, forEveryone?: boolean) => void
  onJumpToReply?: (replyMessageId: string) => void
  onTranslate?: (messageId: string, text: string) => void
  onTranscribe?: (messageId: string, transcript: string) => void
  onVotePoll?: (messageId: string, optionIndex: number) => void
  onToggleLabel?: (messageId: string, label: string) => void
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
  onTranslate,
  onTranscribe,
  onVotePoll,
  onToggleLabel,
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
  const [showTranslated, setShowTranslated] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [translating, setTranslating] = useState(false)
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
      onNotify?.('Текст скопирован в буфер')
    } catch {
      onNotify?.('Не удалось скопировать')
    }
    setMenuOpen(false)
  }

  const handleTranslateClick = async () => {
    playClick(soundEnabled)
    setMenuOpen(false)
    if (message.translations?.ru || message.translations?.en) {
      setShowTranslated((v) => !v)
      return
    }

    setTranslating(true)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.text, targetLanguage: 'ru' }),
      })
      const data = await res.json()
      if (data?.translation) {
        onTranslate?.(message.id, data.translation)
        setShowTranslated(true)
        onNotify?.('Сообщение переведено')
      }
    } catch {
      onNotify?.('Ошибка при обращении к сервису перевода')
    } finally {
      setTranslating(false)
    }
  }

  const handleTranscribeClick = async () => {
    playClick(soundEnabled)
    if (message.transcript) {
      setTranscriptOpen((v) => !v)
      return
    }

    setTranscribing(true)
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: message.media?.url?.startsWith('data:') ? message.media.url : undefined,
          mockText: 'Держим огонь! Записал 5 побед и вечернюю летопись 🔥',
        }),
      })
      const data = await res.json()
      if (data?.transcript) {
        onTranscribe?.(message.id, data.transcript)
        setTranscriptOpen(true)
        onNotify?.('Голосовое расшифровано')
      }
    } catch {
      onNotify?.('Ошибка при расшифровке голосового')
    } finally {
      setTranscribing(false)
    }
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

  const isSticker = message.media?.type === 'sticker'
  const stickerData = isSticker
    ? STICKER_PACK.find((s) => s.id === message.media?.url)
    : null

  const translatedText = message.translations?.ru || message.translations?.en || Object.values(message.translations || {})[0]

  return (
    <>
      <motion.div
        id={`msg-${message.id}`}
        className={`group relative flex items-end gap-2 my-1 ${
          isMine ? 'justify-end' : 'justify-start'
        } ${isSelected ? 'bg-white/[0.04] -mx-4 px-4 py-1.5 rounded-xl' : ''}`}
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
                ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]'
                : 'border-white/30 hover:border-white'
            }`}
          >
            {isSelected && <Check size={12} strokeWidth={3} />}
          </button>
        )}

        <div className={`relative max-w-[85%] sm:max-w-[72%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
          {/* Панель быстрых действий на hover */}
          {!isSelectionMode && (
            <div
              className={`absolute top-0 z-20 flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-1.5 py-1 opacity-0 shadow-xl backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 ${
                isMine ? 'right-full mr-2' : 'left-full ml-2'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  setPickerOpen((v) => !v)
                }}
                className="grid min-h-[32px] min-w-[32px] w-8 h-8 place-items-center rounded-full text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]"
                title="Реакция"
                aria-label="Поставить реакцию"
              >
                <SmilePlus size={15} />
              </button>
              {onReply && (
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onReply(message)
                  }}
                  className="grid min-h-[32px] min-w-[32px] w-8 h-8 place-items-center rounded-full text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[#1d9bf0]"
                  title="Ответить"
                  aria-label="Ответить"
                >
                  <Reply size={15} />
                </button>
              )}
              {isMine && onEdit && !isSticker && (
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onEdit(message)
                  }}
                  className="grid min-h-[32px] min-w-[32px] w-8 h-8 place-items-center rounded-full text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]"
                  title="Редактировать"
                  aria-label="Редактировать"
                >
                  <Pencil size={14} />
                </button>
              )}
              {onPin && (
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onPin(message.id)
                  }}
                  className="grid min-h-[32px] min-w-[32px] w-8 h-8 place-items-center rounded-full text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[#ffd700]"
                  title={message.pinned ? 'Открепить' : 'Закрепить'}
                  aria-label="Закрепить"
                >
                  <Pin size={14} className="rotate-45" />
                </button>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="grid min-h-[32px] min-w-[32px] w-8 h-8 place-items-center rounded-full text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
                  title="Ещё"
                  aria-label="Меню сообщения"
                >
                  <MoreHorizontal size={14} />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 bottom-full mb-1 z-40 w-44 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-1 shadow-2xl text-xs font-medium animate-in fade-in zoom-in-95 backdrop-blur-md">
                      {message.text && (
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                        >
                          <Copy size={13} /> Копировать
                        </button>
                      )}
                      {message.text && (
                        <button
                          type="button"
                          onClick={handleTranslateClick}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                        >
                          <Languages size={13} className="text-[#1d9bf0]" />
                          {translating ? 'Перевожу...' : showTranslated ? 'Показать оригинал' : 'Перевести'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onForward(message)
                          setMenuOpen(false)
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                      >
                        <Forward size={13} /> Переслать
                      </button>
                      {onToggleLabel && (
                        <button
                          type="button"
                          onClick={() => {
                            onToggleLabel(message.id, 'Важное')
                            setMenuOpen(false)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                        >
                          <Tag size={13} className="text-[var(--accent)]" /> В «Важное»
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(message.id, false)
                          setMenuOpen(false)
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={13} /> Удалить у себя
                      </button>
                      {isMine && (
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(message.id, true)
                            setMenuOpen(false)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 size={13} /> Удалить для всех
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
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
            /* Стикер крупно */
            <div
              className="flex flex-col items-end my-1 cursor-pointer"
              onDoubleClick={() => onToggleReaction('fire')}
            >
              <span className="text-6xl hover:scale-110 transition-transform drop-shadow-lg">
                {stickerData?.emoji || '🔥'}
              </span>
              <span className="text-[11px] text-[var(--text-2)] font-mono mt-0.5">
                {formatChatTime(message.createdAtISO)}
              </span>
            </div>
          ) : (
            /* Пузырь сообщения: радиус 20px, хвост 6px */
            <div
              onDoubleClick={() => onToggleReaction('fire')}
              className={`relative overflow-hidden px-4 py-2.5 text-[14px] leading-relaxed shadow-sm transition-all select-text ${
                isMine
                  ? 'rounded-[20px] rounded-br-[6px] bg-[var(--accent)] text-[var(--accent-text)]'
                  : 'rounded-[20px] rounded-bl-[6px] bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)]'
              }`}
            >
              {/* Имя автора в группе */}
              {isGroup && !isMine && showAuthorHeader && (
                <div
                  className="mb-1 text-[12px] font-bold tracking-wide"
                  style={{ color: friend?.avatarColor ? '#ffad5a' : '#1d9bf0' }}
                >
                  {authorName}
                </div>
              )}

              {/* Метка «Переслано от» */}
              {message.forwardFrom && (
                <div className="mb-1 flex items-center gap-1 text-[11px] font-medium opacity-80 italic border-l-2 border-current pl-1.5">
                  <Forward size={12} />
                  <span>Переслано от {message.forwardFrom.authorName}</span>
                </div>
              )}

              {/* Цитата ответа */}
              {message.replyTo && (
                <button
                  type="button"
                  onClick={() => onJumpToReply?.(message.replyTo!.id)}
                  className={`mb-1.5 flex w-full flex-col text-left rounded-lg border-l-2 py-1 px-2.5 transition-opacity hover:opacity-85 ${
                    isMine
                      ? 'border-white bg-white/10 text-white'
                      : 'border-[var(--accent)] bg-[var(--bg-hover)] text-[var(--text)]'
                  }`}
                >
                  <span className="text-[11px] font-bold text-[var(--accent)] leading-none mb-0.5">
                    {message.replyTo.authorId === 'me' ? 'Ты' : authorName}
                  </span>
                  <span className="truncate text-xs opacity-90 leading-tight">
                    {message.replyTo.text}
                  </span>
                </button>
              )}

              {/* Карточка-вложение Огонька (гордость, благодарность, день) */}
              {message.attachment && (
                <div className="mb-2 w-full min-w-[220px]">
                  <ChatAttachmentCard attachment={message.attachment} />
                </div>
              )}

              {/* Фотография */}
              {message.media?.type === 'image' && (
                <div className="mb-2 overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={message.media.url}
                    alt={message.media.name || 'Фотография'}
                    className="max-h-80 w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => setLightboxUrl(message.media!.url)}
                  />
                </div>
              )}

              {/* Видео */}
              {message.media?.type === 'video' && (
                <div className="mb-2 overflow-hidden rounded-xl bg-black">
                  <video
                    src={message.media.url}
                    controls
                    className="max-h-80 w-full rounded-xl"
                  />
                </div>
              )}

              {/* Голосовое сообщение с кнопкой «Расшифровать» */}
              {message.media?.type === 'audio' && (
                <div className="min-w-[220px] mb-1.5">
                  <ChatVoicePlayer
                    media={message.media}
                    isMine={isMine}
                    soundEnabled={soundEnabled}
                  />

                  {/* Кнопка «Расшифровать» */}
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={handleTranscribeClick}
                      disabled={transcribing}
                      className="flex items-center gap-1 font-bold text-[var(--accent)] hover:opacity-80 transition-opacity"
                    >
                      <Sparkles size={12} />
                      {transcribing
                        ? 'Расшифровываю...'
                        : message.transcript
                        ? transcriptOpen
                          ? 'Скрыть текст'
                          : 'Текст речи'
                        : 'Расшифровать'}
                    </button>
                  </div>

                  {/* Раскрывающийся текст расшифровки */}
                  {transcriptOpen && message.transcript && (
                    <div className="mt-1.5 p-2 rounded-lg bg-black/20 border border-white/10 text-xs italic leading-relaxed">
                      «{message.transcript}»
                    </div>
                  )}
                </div>
              )}

              {/* Опрос в чате */}
              {message.poll && (
                <div className="mb-2 w-full min-w-[240px] rounded-xl bg-black/15 p-3 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm leading-snug">{message.poll.question}</p>
                    {message.poll.isAnonymous && (
                      <span className="text-[10px] text-[var(--text-2)] shrink-0">Анонимный</span>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {message.poll.options.map((opt, idx) => {
                      const percent =
                        message.poll!.totalVotes > 0
                          ? Math.round((opt.votes / message.poll!.totalVotes) * 100)
                          : 0

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            playClick(soundEnabled)
                            onVotePoll?.(message.id, idx)
                          }}
                          className={`relative w-full overflow-hidden p-2 rounded-lg border text-left text-xs transition-all ${
                            opt.votedByMe
                              ? 'border-[var(--accent)] bg-[var(--accent)]/15 font-bold'
                              : 'border-white/10 hover:bg-white/5'
                          }`}
                        >
                          {/* Прогресс-бар заливки */}
                          <div
                            className="absolute inset-y-0 left-0 bg-[var(--accent)]/20 transition-all duration-300 pointer-events-none"
                            style={{ width: `${percent}%` }}
                          />
                          <div className="relative flex items-center justify-between z-10">
                            <span className="truncate pr-2">{opt.text}</span>
                            <span className="font-mono text-[11px] shrink-0 font-bold">
                              {percent}% ({opt.votes})
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="text-[11px] text-[var(--text-2)] text-right pt-0.5">
                    Всего голосов: {message.poll.totalVotes}
                  </div>
                </div>
              )}

              {/* Документ / Файл */}
              {message.media?.type === 'file' && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/20 text-[var(--accent)]">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{message.media.name}</p>
                      <p className="text-[10px] opacity-70">
                        {message.media.sizeBytes
                          ? `${Math.round(message.media.sizeBytes / 1024)} КБ`
                          : 'Документ'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={message.media.url}
                    download={message.media.name || 'file'}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Download size={14} />
                  </a>
                </div>
              )}

              {/* Текст сообщения (или перевод) */}
              {message.text && (
                <div className="whitespace-pre-wrap break-words">
                  <p>{renderHighlightedText(showTranslated && translatedText ? translatedText : message.text)}</p>

                  {/* Плашка перевода */}
                  {showTranslated && translatedText && (
                    <div className="mt-1 flex items-center justify-between text-[11px] opacity-75 border-t border-white/10 pt-1">
                      <span>Переведено через ИИ</span>
                      <button
                        type="button"
                        onClick={() => setShowTranslated(false)}
                        className="underline hover:opacity-100"
                      >
                        Показать оригинал
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Превью ссылки */}
              {message.linkPreview && (
                <a
                  href={message.linkPreview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex flex-col rounded-xl border border-white/15 bg-black/15 p-2.5 text-xs transition-opacity hover:opacity-90"
                >
                  <div className="flex items-center justify-between font-bold text-[var(--accent)] text-[11px] mb-0.5">
                    <span>{message.linkPreview.siteName}</span>
                    <ExternalLink size={12} />
                  </div>
                  <p className="font-bold text-xs mb-0.5">{message.linkPreview.title}</p>
                  {message.linkPreview.description && (
                    <p className="line-clamp-2 text-[11px] opacity-80">
                      {message.linkPreview.description}
                    </p>
                  )}
                </a>
              )}

              {/* Метки сообщения («Важное», «Позже») */}
              {message.labels && message.labels.length > 0 && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {message.labels.map((l) => (
                    <span
                      key={l}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/15 text-white flex items-center gap-1"
                    >
                      <Tag size={9} /> {l}
                    </span>
                  ))}
                </div>
              )}

              {/* Нижняя строка: значок "без звука", запланировано, время 13px, галочки доставки ✓✓ */}
              <div
                className={`mt-1 flex items-center justify-end gap-1.5 text-[13px] font-mono leading-none ${
                  isMine ? 'opacity-85' : 'text-[var(--text-2)]'
                }`}
              >
                {message.silent && <span title="Отправлено без звука"><BellOff size={11} className="opacity-70" /></span>}
                {message.pinned && <span title="Закреплено"><Pin size={11} className="rotate-45 text-[#ffd700]" /></span>}
                {message.editedAtISO && <span className="text-[11px] italic">изм.</span>}
                <span suppressHydrationWarning>{formatChatTime(message.createdAtISO)}</span>
                {isMine && (
                  <span className="ml-0.5 shrink-0">
                    {message.status === 'sending' ? (
                      <Clock size={12} className="opacity-70 animate-spin" />
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
                      ? 'border border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)] font-bold'
                      : 'border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)] hover:bg-[var(--bg-hover)]'
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

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
  Phone,
  PhoneOff,
  PhoneMissed,
  Pin,
  Reply,
  SmilePlus,
  Sparkles,
  Tag,
  Trash2,
  Volume2,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { getFriend } from '@/lib/ogonek/friends'
import { formatChatTime, STICKER_PACK } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ChatMessage, CustomEmoji } from '@/lib/ogonek/types'
import { OFFICIAL_BROADCAST_BADGE_LABEL } from '@/lib/ogonek/priday-system-chat'
import { isSafeUrl, safeHref, safeImageSrc } from '@/lib/ogonek/safe-url'
import { getCachedProfileSync } from '@/lib/supabase/api'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ChatAttachmentCard } from './chat-attachment-card'
import { ChatAttachmentModal } from './chat-attachment-modal'
import { ChatMediaLightbox } from './chat-media-lightbox'
import { ChatVoicePlayer } from './chat-voice-player'
import { MessageReactionPicker } from './message-reaction-picker'

function checkOnlyEmojis(text?: string): boolean {
  if (!text) return false
  const trimmed = text.trim()
  if (!trimmed) return false
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new (Intl as any).Segmenter('ru', { granularity: 'grapheme' })
      const segments = Array.from(segmenter.segment(trimmed)) as any[]
      if (segments.length >= 1 && segments.length <= 3) {
        const emojiSegmentRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation})+$/u
        return segments.every((s) =>
          emojiSegmentRegex.test(s.segment.replace(/[\uFE00-\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]/gu, ''))
        )
      }
      return false
    } catch {
      // Fallback below
    }
  }
  const fallbackRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}){1,3}$/u
  return fallbackRegex.test(trimmed)
}

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
  onTranslate?: (messageId: string, text: string, targetLang?: string) => void
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
  canDeleteBroadcast?: boolean
  onNotify?: (message: string) => void
  onContextMenu?: (e: React.MouseEvent, message: ChatMessage) => void
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
  canDeleteBroadcast = false,
  onNotify,
  onContextMenu,
}: Props) {
  const isOfficialBroadcast = message.actorMeta?.kind === 'official_broadcast'
  const [pickerOpen, setPickerOpen] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false)
  const [gifProxyFallback, setGifProxyFallback] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showTranslated, setShowTranslated] = useState(false)
  const [translationMeta, setTranslationMeta] = useState<{
    text: string
    sourceLang: string
    targetLang: string
  } | null>(null)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{
    left: number
    top: number
    maxHeight: number
  } | null>(null)
  const pickerBtnRef = useRef<HTMLButtonElement | null>(null)
  const menuBtnRef = useRef<HTMLButtonElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const reduce = useReducedMotion()

  const { state: storeState } = useOgonekStore()
  const friend = !isMine ? getFriend(message.authorId) : null
  const liveAuthor = !isMine ? getCachedProfileSync(message.authorId) : null
  const authorName = isMine
    ? storeState.profile.displayName || 'Ты'
    : liveAuthor?.display_name || friend?.name || 'Собеседник'
  const authorUsername = isMine
    ? storeState.profile.username
    : liveAuthor?.username || friend?.username || null
  const authorAvatar = isMine
    ? storeState.profile.avatarImage
    : liveAuthor?.avatar_image || liveAuthor?.avatar_url || friend?.avatarUrl || null
  const authorAvatarColor = isMine
    ? storeState.profile.avatarColor
    : liveAuthor?.avatar_color || friend?.avatarColor || '#FF5C00'
  const authorVerified = isMine
    ? Boolean(storeState.profile.verified)
    : Boolean(liveAuthor?.verified ?? friend?.verified)

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

  const resolveTargetLang = (): 'ru' | 'ro' | 'en' => {
    const pref = (storeState.chatSettings?.targetLanguage || '').trim().toLowerCase().slice(0, 2)
    if (pref === 'ro' || pref === 'en') return pref
    if (typeof window !== 'undefined') {
      const pathLang = window.location.pathname.match(/^\/(ru|ro|en)(\/|$)/)?.[1]?.toLowerCase()
      if (pathLang === 'ru' || pathLang === 'ro' || pathLang === 'en') return pathLang
      const docLang = (document.documentElement?.lang || '').trim().toLowerCase().slice(0, 2)
      if (docLang === 'ru' || docLang === 'ro' || docLang === 'en') return docLang
    }
    return 'ru'
  }

  const updateMenuPosition = (measuredHeight?: number) => {
    if (typeof window === 'undefined' || !menuBtnRef.current) return
    const rect = menuBtnRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const menuWidth = 208
    const estHeight = measuredHeight ?? 232
    const HEADER_SAFE_TOP = 76
    const freeAbove = rect.top - HEADER_SAFE_TOP
    const freeBelow = vh - rect.bottom - 12
    // Если сверху меньше 220px свободного пространства (или меню залезает на шапку) — раскрываем вниз
    const openDown = rect.top < 220 || (freeAbove < estHeight && freeBelow >= freeAbove)
    const top = openDown
      ? Math.max(HEADER_SAFE_TOP, Math.min(rect.bottom + 6, vh - estHeight - 12))
      : Math.max(HEADER_SAFE_TOP, rect.top - estHeight - 6)
    const left = Math.max(
      8,
      Math.min(isMine ? rect.right - menuWidth : rect.left, vw - menuWidth - 10)
    )
    setMenuPosition({
      left,
      top,
      maxHeight: Math.max(160, vh - HEADER_SAFE_TOP - 16),
    })
  }

  useLayoutEffect(() => {
    if (!menuOpen) return
    const raf = requestAnimationFrame(() => {
      const actualH = dropdownRef.current?.offsetHeight
      if (actualH) updateMenuPosition(actualH)
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, isMine])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    const onScroll = () => setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menuOpen])

  const handleTranslateClick = async () => {
    playClick(soundEnabled)
    setMenuOpen(false)
    if (!message.text?.trim()) return

    if (showTranslated && (translationMeta?.text || translatedText)) {
      setShowTranslated(false)
      return
    }

    if (translationMeta?.text) {
      setShowTranslated(true)
      return
    }

    setTranslating(true)
    try {
      const targetLang = resolveTargetLang()
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.text, targetLang }),
      })
      const data = await res.json().catch(() => null)
      const translated = data?.translatedText || data?.translation
      if (res.ok && translated) {
        const finalTarget = String(data?.targetLang || targetLang).toLowerCase()
        const finalSource = String(data?.detectedSourceLang || 'auto').toLowerCase()
        setTranslationMeta({
          text: translated,
          sourceLang: finalSource,
          targetLang: finalTarget,
        })
        onTranslate?.(message.id, translated, finalTarget)
        setShowTranslated(true)
      } else {
        onNotify?.(data?.error || 'Не удалось перевести сообщение')
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
          audioBase64: message.media?.url || undefined,
          mimeType: 'audio/webm',
        }),
      })
      const data = await res.json()
      if (data?.transcript) {
        onTranscribe?.(message.id, data.transcript)
        setTranscriptOpen(true)
        onNotify?.('Голосовое расшифровано через ИИ')
      } else {
        onNotify?.('Не удалось расшифровать')
      }
    } catch {
      onNotify?.('Ошибка при расшифровке голосового')
    } finally {
      setTranscribing(false)
    }
  }

  // Highlight search query AND clickable @username mentions in text
  const openMentionProfile = (handle: string) => {
    const clean = handle.replace(/^@+/, '').trim()
    const targetId =
      message.actorMeta?.actorId &&
      (!message.actorMeta.actorUsername ||
        message.actorMeta.actorUsername.toLowerCase() === clean.toLowerCase())
        ? message.actorMeta.actorId
        : clean
    if (!targetId || typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('ogonek:navigate-view', {
        detail: { view: 'profile', userId: targetId },
      })
    )
  }

  const renderHighlightedText = (text: string) => {
    const tokens = text.split(/(https?:\/\/[^\s<>()]+|@[a-zA-Z0-9._]{2,32})/g)
    const q = searchQuery.trim()
    return tokens.map((token, idx) => {
      if (/^https?:\/\/[^\s<>()]+$/i.test(token)) {
        const trailingMatch = token.match(/([.,!?:;)\]]+)$/)
        const trailing = trailingMatch ? trailingMatch[1] : ''
        const cleanUrl = trailing ? token.slice(0, -trailing.length) : token
        const href = safeHref(cleanUrl)
        if (href) {
          return (
            <span key={`url-${idx}`}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`inline underline break-all ${
                  isMine
                    ? 'text-[#ff9c73] decoration-[#ff9c73]/60 hover:decoration-[#ff9c73]'
                    : 'text-[#ff7a45] decoration-[#ff7a45]/60 hover:decoration-[#ff7a45]'
                }`}
              >
                {cleanUrl}
              </a>
              {trailing}
            </span>
          )
        }
      }
      if (/^@[a-zA-Z0-9._]{2,32}$/.test(token) && token.toLowerCase() !== '@priday.life' && token.toLowerCase() !== '@winlog.life') {
        return (
          <button
            key={`mention-${idx}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openMentionProfile(token)
            }}
            className={`cursor-pointer inline ${
              isMine
                ? 'text-white font-semibold underline decoration-white/60 hover:decoration-white'
                : 'text-[#ff7a45] font-medium hover:underline'
            }`}
          >
            {token}
          </button>
        )
      }
      if (!q) return <span key={`txt-${idx}`}>{token}</span>
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const parts = token.split(new RegExp(`(${escaped})`, 'gi'))
      return (
        <span key={`txt-${idx}`}>
          {parts.map((part, i) =>
            part.toLowerCase() === q.toLowerCase() ? (
              <mark
                key={i}
                className={
                  isMine
                    ? 'bg-[#d76737] text-black font-semibold rounded px-0.5'
                    : 'bg-[#ff7a18] text-white rounded px-0.5'
                }
              >
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </span>
      )
    })
  }

  const isSticker = message.media?.type === 'sticker'
  const stickerData = isSticker
    ? STICKER_PACK.find((s) => s.id === message.media?.url)
    : null

  const isEmojiOnly =
    !isSticker &&
    !message.media &&
    !message.attachment &&
    !message.poll &&
    !message.replyTo &&
    !message.forwardFrom &&
    checkOnlyEmojis(message.text)

  const isStandaloneCard =
    Boolean(message.attachment) &&
    !message.text?.trim() &&
    !isSticker &&
    !message.media &&
    !message.poll &&
    !message.replyTo &&
    !message.forwardFrom &&
    (!message.labels || message.labels.length === 0)

  const cachedValidTranslation = Object.values(message.translations || {}).find(
    (v) =>
      typeof v === 'string' &&
      v.trim().length > 0 &&
      !v.startsWith('[Перевод') &&
      !v.startsWith('[Translated')
  )
  const translatedText = translationMeta?.text || cachedValidTranslation || undefined
  const hasMedia = Boolean(message.media?.type === 'image' || message.media?.type === 'video')
  const isVoiceOnlyPlaceholder =
    message.media?.type === 'audio' &&
    (!message.text || /^(🎤\s*)?голосовое(\s*сообщение)?$/i.test(message.text.trim()))

  if (
    message.type === 'system' ||
    (message as any).is_system ||
    message.text?.startsWith('Пропущенный') ||
    message.text?.includes('звонок') ||
    message.text?.includes('вызов') ||
    message.text?.includes('📞') ||
    message.text?.includes('❌') ||
    message.text?.includes('🚫') ||
    Boolean((message as any).call_meta)
  ) {
    const isCallSystem = Boolean(
      (message as any).call_meta ||
        message.text?.startsWith('Пропущенный') ||
        message.text?.includes('звонок') ||
        message.text?.includes('вызов') ||
        message.text?.includes('❌') ||
        message.text?.includes('🚫')
    )
    const isMissed = message.text?.includes('Пропущенный') || message.text?.includes('❌')
    const isRejected = message.text?.includes('Отклонённый') || message.text?.includes('🚫') || message.text?.includes('занято')
    const displaySystemText = (message.text || '').replace(/^\s*📞\s*/, '').trim()
    return (
      <div className="flex justify-center my-3 select-none">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--surface2,#202327)]/80 text-[var(--muted,#71767b)] text-[12px] font-medium border border-[var(--line,#2f3336)] shadow-sm">
          {isCallSystem && (
            isMissed ? (
              <PhoneMissed size={13} className="text-rose-500 shrink-0" />
            ) : isRejected ? (
              <PhoneOff size={13} className="text-amber-500 shrink-0" />
            ) : (
              <Phone size={13} className="text-[#00ba7c] shrink-0" />
            )
          )}
          <span>{displaySystemText}</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <motion.div
        id={`msg-${message.id}`}
        onContextMenu={(e) => {
          if (!onContextMenu) return
          e.preventDefault()
          e.stopPropagation()
          onContextMenu(e, message)
        }}
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

        <div className={`relative ${hasMedia ? 'max-w-[420px] w-full' : 'max-w-[85%] sm:max-w-[72%]'} flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
          {/* Панель быстрых действий на hover */}
          {!isSelectionMode && (
            <div
              className={`absolute top-0 z-20 flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-1.5 py-1 opacity-0 shadow-xl backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 ${
                isMine ? 'right-full mr-2' : 'left-full ml-2'
              }`}
            >
              <button
                ref={pickerBtnRef}
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
                  ref={menuBtnRef}
                  type="button"
                  onClick={() => {
                    if (!menuOpen) {
                      updateMenuPosition()
                      setMenuOpen(true)
                    } else {
                      setMenuOpen(false)
                    }
                  }}
                  className="grid min-h-[32px] min-w-[32px] w-8 h-8 place-items-center rounded-full text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
                  title="Ещё"
                  aria-label="Меню сообщения"
                >
                  <MoreHorizontal size={14} />
                </button>

                {menuOpen &&
                  typeof document !== 'undefined' &&
                  createPortal(
                    <>
                      <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setMenuOpen(false)}
                      />
                      <div
                        ref={dropdownRef}
                        data-bubble-action-menu="true"
                        style={
                          menuPosition
                            ? {
                                position: 'fixed',
                                left: `${menuPosition.left}px`,
                                top: `${menuPosition.top}px`,
                                minWidth: '200px',
                                maxHeight: `${menuPosition.maxHeight}px`,
                              }
                            : undefined
                        }
                        className="fixed z-[9999] min-w-[200px] overflow-y-auto rounded-2xl border border-white/[0.12] bg-[#0a0a0c]/95 backdrop-blur-xl p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.9)] text-[13px] font-medium text-white/85 animate-in fade-in zoom-in-95 duration-100 select-none"
                      >
                        {message.text && (
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-white/85 hover:bg-white/[0.08] hover:text-white transition-colors"
                          >
                            <Copy className="w-4 h-4 text-white/55 shrink-0" />
                            <span>Копировать</span>
                          </button>
                        )}
                        {message.text && (
                          <button
                            type="button"
                            onClick={handleTranslateClick}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-white/85 hover:bg-white/[0.08] hover:text-white transition-colors"
                          >
                            <Languages className="w-4 h-4 text-white/55 shrink-0" />
                            <span>
                              {translating ? 'Перевод...' : showTranslated ? 'Показать оригинал' : 'Перевести'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onForward(message)
                            setMenuOpen(false)
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-white/85 hover:bg-white/[0.08] hover:text-white transition-colors"
                        >
                          <Forward className="w-4 h-4 text-white/55 shrink-0" />
                          <span>Переслать</span>
                        </button>
                        {onToggleLabel && (
                          <button
                            type="button"
                            onClick={() => {
                              onToggleLabel(message.id, 'Важное')
                              setMenuOpen(false)
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-white/85 hover:bg-white/[0.08] hover:text-white transition-colors"
                          >
                            <Tag className="w-4 h-4 text-white/55 shrink-0" />
                            <span>В важное</span>
                          </button>
                        )}
                        {(!isOfficialBroadcast || canDeleteBroadcast) && (
                          <div className="my-1 border-t border-white/[0.08]" />
                        )}
                        {!isOfficialBroadcast && (
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(message.id, false)
                              setMenuOpen(false)
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-red-400/90 hover:bg-red-500/12 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 shrink-0" />
                            <span>Удалить у себя</span>
                          </button>
                        )}
                        {((isMine && !isOfficialBroadcast) || (isOfficialBroadcast && canDeleteBroadcast)) && (
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(message.id, true)
                              setMenuOpen(false)
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-red-400/90 hover:bg-red-500/12 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 shrink-0" />
                            <span>
                              {isOfficialBroadcast ? 'Удалить рассылку для всех' : 'Удалить для всех'}
                            </span>
                          </button>
                        )}
                      </div>
                    </>,
                    document.body
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
                anchorRef={pickerBtnRef}
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
              className="flex flex-col items-end my-1 cursor-pointer select-none"
              onDoubleClick={() => onToggleReaction('fire')}
            >
              <span className="text-6xl hover:scale-110 transition-transform drop-shadow-lg">
                {stickerData?.emoji || '🔥'}
              </span>
              <span className="text-[12px] text-[var(--text-2)] [font-variant-numeric:tabular-nums] mt-1 font-medium">
                {formatChatTime(message.createdAtISO)}
              </span>
            </div>
          ) : isEmojiOnly ? (
            /* Сообщение из 1–3 эмодзи крупно БЕЗ оранжевого пузыря */
            <div
              className={`flex flex-col my-1 cursor-pointer select-none ${isMine ? 'items-end' : 'items-start'}`}
              onDoubleClick={() => onToggleReaction('fire')}
            >
              <div className="text-5xl sm:text-6xl leading-none tracking-wider py-1 drop-shadow-sm hover:scale-105 transition-transform">
                {message.text}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-2)] [font-variant-numeric:tabular-nums] mt-1 px-1 font-medium">
                <span suppressHydrationWarning>{formatChatTime(message.createdAtISO)}</span>
                {isMine && (
                  <span className="shrink-0">
                    {message.read || message.status === 'read' ? (
                      <CheckCheck size={14} className="text-[var(--accent)]" />
                    ) : (
                      <Check size={13} className="opacity-80" />
                    )}
                  </span>
                )}
              </div>
            </div>
          ) : isStandaloneCard ? (
            /* Прикреплённая карточка (Гордость / День / Сторис) с тонкой рамкой p-[3px] и временем ниже */
            <div className={`flex flex-col my-1 select-text ${isMine ? 'items-end' : 'items-start'}`}>
              {isGroup && !isMine && showAuthorHeader && (
                <div className="mb-1 px-1 text-[12px] font-bold tracking-wide text-[var(--text)] dark:text-[var(--accent)]">
                  {authorName}
                </div>
              )}
              <div
                onDoubleClick={() => onToggleReaction('fire')}
                className={`w-[260px] sm:w-[310px] max-w-full rounded-[19px] p-[3px] shadow-sm transition-all ${
                  isMine
                    ? 'bg-[#241611] border border-[#d76737]/35'
                    : 'bg-[var(--bg-elev)] border border-[var(--border)]'
                }`}
              >
                <ChatAttachmentCard
                  attachment={message.attachment!}
                  onClick={() => {
                    playClick(soundEnabled)
                    setAttachmentModalOpen(true)
                  }}
                />
              </div>
              <div
                className={`mt-1 px-1 flex items-center justify-end gap-1.5 text-[12px] [font-variant-numeric:tabular-nums] leading-none font-medium ${
                  isMine ? 'text-white/45' : 'text-[var(--text-2)]'
                }`}
              >
                {message.silent && <span title="Отправлено без звука"><BellOff size={11} className="opacity-70" /></span>}
                {message.pinned && <span title="Закреплено"><Pin size={11} className="rotate-45 text-[#ffd700]" /></span>}
                {message.editedAtISO && <span className="text-[11px] italic">изм.</span>}
                <span suppressHydrationWarning>{formatChatTime(message.createdAtISO)}</span>
                {isMine && (
                  <span className="shrink-0 inline-flex items-center gap-0.5">
                    {message.status === 'sending' ? (
                      <Clock size={12} className="opacity-70 animate-spin" />
                    ) : message.read || message.status === 'read' || (message.readBy && message.readBy.length > 0) ? (
                      <>
                        <CheckCheck size={14} className="text-[#d76737]" />
                        {isGroup && message.readBy && message.readBy.length > 0 && (
                          <span className="text-[10px] font-bold text-[#d76737]">
                            {message.readBy.length}
                          </span>
                        )}
                      </>
                    ) : (
                      <Check size={13} className="opacity-80" />
                    )}
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Пузырь сообщения: радиус 20px, хвост 6px */
            <div
              onDoubleClick={() => onToggleReaction('fire')}
              className={`relative overflow-hidden px-4 py-2.5 text-[14px] leading-relaxed shadow-sm transition-all select-text ${
                hasMedia ? 'max-w-[420px] w-full' : ''
              } ${
                isMine
                  ? 'rounded-[20px] rounded-br-[6px] bg-[#241611] border border-[#d76737]/35 text-white/95'
                  : isOfficialBroadcast
                    ? 'rounded-[20px] rounded-bl-[6px] bg-[var(--bg-elev)] border border-[#d76737]/35 text-[var(--text)]'
                    : 'rounded-[20px] rounded-bl-[6px] bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)]'
              }`}
            >
              {/* Метка официальной рассылки Winlog */}
              {isOfficialBroadcast && (
                <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#d76737]/35 bg-[#d76737]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#ff8b5c]">
                  <Sparkles size={10} className="shrink-0" />
                  <span>{OFFICIAL_BROADCAST_BADGE_LABEL}</span>
                </div>
              )}

              {/* Имя автора в группе */}
              {isGroup && !isMine && showAuthorHeader && (
                <div className="mb-1 text-[12px] font-bold tracking-wide text-[var(--text)] dark:text-[var(--accent)]">
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
                      ? 'border-[#d76737]/70 bg-white/[0.06] text-white/95'
                      : 'border-[var(--accent)] bg-[var(--bg-hover)] text-[var(--text)]'
                  }`}
                >
                  <span className={`text-[11px] font-bold leading-none mb-0.5 ${isMine ? 'text-[#ff9c73]' : 'text-[var(--text)] dark:text-[var(--accent)]'}`}>
                    {message.replyTo.authorId === 'me' ? 'Ты' : authorName}
                  </span>
                  <span className="truncate text-xs opacity-90 leading-tight">
                    {message.replyTo.text}
                  </span>
                </button>
              )}

              {/* Карточка-вложение Priday (гордость, благодарность, день) */}
              {message.attachment && (
                <div className="mb-2 w-full min-w-[220px]">
                  <ChatAttachmentCard
                    attachment={message.attachment}
                    onClick={() => {
                      playClick(soundEnabled)
                      setAttachmentModalOpen(true)
                    }}
                  />
                </div>
              )}

              {/* Фотография / GIF */}
              {message.media?.type === 'image' && (
                <div className="mb-2 overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      gifProxyFallback
                        ? `/api/giphy?img=${encodeURIComponent(message.media.url)}`
                        : safeImageSrc(message.media.url)
                    }
                    alt={message.media.name || 'Фотография'}
                    referrerPolicy="no-referrer"
                    className="max-h-80 w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                    onError={() => {
                      if (!gifProxyFallback && /giphy\.com|tenor\.com|klipy\.com/i.test(message.media?.url || '')) {
                        setGifProxyFallback(true)
                      }
                    }}
                    onClick={() =>
                      setLightboxUrl(
                        gifProxyFallback
                          ? `/api/giphy?img=${encodeURIComponent(message.media!.url)}`
                          : message.media!.url
                      )
                    }
                  />
                </div>
              )}

              {/* Видео */}
              {message.media?.type === 'video' && (
                <div className="mb-2 overflow-hidden rounded-xl bg-black">
                  <video
                    src={safeHref(message.media.url) || undefined}
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
                      className="flex items-center gap-1 font-bold text-[var(--text)] dark:text-[var(--accent)] hover:opacity-80 transition-opacity"
                    >
                      <Sparkles size={12} className={transcribing ? 'animate-spin' : ''} />
                      {transcribing
                        ? 'Расшифровываю с ИИ...'
                        : message.transcript
                        ? transcriptOpen
                          ? 'Скрыть текст'
                          : 'Текст речи (ИИ)'
                        : 'Расшифровать (ИИ)'}
                    </button>
                  </div>

                  {/* Раскрывающийся текст расшифровки */}
                  {(transcriptOpen || message.transcript) && message.transcript && (
                    <div className="mt-2 p-2.5 rounded-xl bg-black/25 border border-white/10 text-xs leading-relaxed animate-in fade-in">
                      <div className="flex items-center justify-between mb-1 text-[10px] text-white/50 font-medium tracking-wide">
                        <span className="flex items-center gap-1">
                          <Sparkles size={11} className="text-[var(--accent)]" />
                          <span>ИИ Расшифровка</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (message.transcript) {
                              navigator.clipboard.writeText(message.transcript)
                              onNotify?.('Текст речи скопирован')
                            }
                          }}
                          className="hover:text-white transition-colors"
                          title="Скопировать расшифровку"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <p className="italic text-white/90">«{message.transcript}»</p>
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
                    href={safeHref(message.media.url) || '#'}
                    download={message.media.name || 'file'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Download size={14} />
                  </a>
                </div>
              )}

              {/* Текст сообщения (или перевод) */}
              {message.text && !isVoiceOnlyPlaceholder && (
                <div className={`whitespace-pre-wrap break-words ${hasMedia ? 'pt-1.5 pb-0.5' : ''}`}>
                  <p>{renderHighlightedText(showTranslated && translatedText ? translatedText : message.text)}</p>

                  {/* Индикатор активного перевода */}
                  {translating && (
                    <div className="mt-1.5 flex items-center gap-1.5 border-t border-white/[0.08] pt-1.5 text-[11px] text-white/45">
                      <Languages size={11} className="animate-pulse text-white/55" />
                      <span>Перевод...</span>
                    </div>
                  )}

                  {/* Подпись переведённого текста */}
                  {!translating && showTranslated && translatedText && (
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-1.5 text-[11px] text-white/45">
                      <span>
                        Перевод
                        {translationMeta?.sourceLang && translationMeta?.targetLang
                          ? ` ${translationMeta.sourceLang.toUpperCase()} → ${translationMeta.targetLang.toUpperCase()}`
                          : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowTranslated(false)}
                        className="text-white/75 hover:text-white underline-offset-2 hover:underline cursor-pointer"
                      >
                        Оригинал
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Превью ссылки */}
              {message.linkPreview && (
                isSafeUrl(message.linkPreview.url) ? (
                  <a
                    href={message.linkPreview.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex flex-col rounded-xl border border-white/15 bg-black/15 p-2.5 text-xs transition-opacity hover:opacity-90"
                  >
                    <div className="flex items-center justify-between font-bold text-[var(--text)] dark:text-[var(--accent)] text-[11px] mb-0.5">
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
                ) : (
                  <div className="mt-2 flex flex-col rounded-xl border border-white/15 bg-black/15 p-2.5 text-xs select-text">
                    <div className="flex items-center justify-between font-bold text-[var(--text)] text-[11px] mb-0.5 opacity-60">
                      <span>{message.linkPreview.siteName || 'Ссылка'}</span>
                    </div>
                    <p className="font-bold text-xs mb-0.5">{message.linkPreview.title}</p>
                    {message.linkPreview.description && (
                      <p className="line-clamp-2 text-[11px] opacity-80">
                        {message.linkPreview.description}
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground mt-1 break-all">{message.linkPreview.url}</span>
                  </div>
                )
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

              {/* Нижняя строка: значок "без звука", запланировано, время 12px, галочки доставки ✓✓ */}
              <div
                className={`mt-1 flex items-center justify-end gap-1.5 text-[12px] [font-variant-numeric:tabular-nums] leading-none ${
                  isMine ? 'text-white/45' : 'text-[var(--text-2)]'
                }`}
              >
                {message.silent && <span title="Отправлено без звука"><BellOff size={11} className="opacity-70" /></span>}
                {message.pinned && <span title="Закреплено"><Pin size={11} className="rotate-45 text-[#ffd700]" /></span>}
                {message.editedAtISO && <span className="text-[11px] italic">изм.</span>}
                <span suppressHydrationWarning>{formatChatTime(message.createdAtISO)}</span>
                {isMine && (
                  <span className="ml-0.5 shrink-0 inline-flex items-center gap-0.5">
                    {message.status === 'sending' ? (
                      <Clock size={12} className="opacity-70 animate-spin" />
                    ) : message.read || message.status === 'read' || (message.readBy && message.readBy.length > 0) ? (
                      <>
                        <CheckCheck size={14} className="text-[#d76737]" />
                        {isGroup && message.readBy && message.readBy.length > 0 && (
                          <span className="text-[10px] font-bold text-[#d76737]" title={`Прочитано: ${message.readBy.length}`}>
                            {message.readBy.length}
                          </span>
                        )}
                      </>
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

      {/* Полный просмотр карточки гордости / благодарности / дня */}
      <AnimatePresence>
        {attachmentModalOpen && message.attachment && (
          <ChatAttachmentModal
            attachment={message.attachment}
            fallbackAuthorName={authorName}
            fallbackAuthorUsername={authorUsername}
            fallbackAuthorAvatar={authorAvatar}
            fallbackAuthorColor={authorAvatarColor}
            fallbackAuthorVerified={authorVerified}
            onClose={() => setAttachmentModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

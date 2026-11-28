'use client'

import { AnimatePresence } from 'framer-motion'
import {
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  RefreshCw,
  Reply,
  Send,
  Smile,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { QUICK_REPLIES, type ChatSticker } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type {
  ChatAttachment,
  ChatLinkPreview,
  ChatMessage,
  ChatMessageMedia,
  ChatMessageReply,
} from '@/lib/ogonek/types'
import {
  uploadChatMedia,
  extractFirstUrl,
  buildLinkPreview,
  type ChatMediaType,
} from '@/lib/ogonek/chat-media-service'
import dynamic from 'next/dynamic'
import { AttachCardPicker } from './attach-card-picker'
import { ChatAttachmentCard } from './chat-attachment-card'

const ChatEmojiPicker = dynamic(() => import('./chat-emoji-picker').then((m) => m.ChatEmojiPicker), { ssr: false })

type Props = {
  friendName: string
  draft: string
  threadId?: string
  userId?: string
  onChangeDraft: (value: string) => void
  onSend: (
    text: string,
    attachment?: ChatAttachment | null,
    extra?: {
      replyTo?: ChatMessageReply | null
      media?: ChatMessageMedia | null
      linkPreview?: ChatLinkPreview | null
    }
  ) => void
  replyingTo?: ChatMessage | null
  onCancelReply?: () => void
  editingMessage?: ChatMessage | null
  onCancelEdit?: () => void
  onSubmitEdit?: (text: string) => void
  onEditLastMessage?: () => void
  onNotify?: (message: string) => void
  soundEnabled?: boolean
}

export function ChatComposer({
  friendName,
  draft,
  threadId,
  userId,
  onChangeDraft,
  onSend,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSubmitEdit,
  onEditLastMessage,
  onNotify,
  soundEnabled = true,
}: Props) {
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const [mediaAttachment, setMediaAttachment] = useState<ChatMessageMedia | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [linkPreview, setLinkPreview] = useState<ChatLinkPreview | null>(null)
  const [linkDismissed, setLinkDismissed] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [colonQuery, setColonQuery] = useState<string | null>(null)

  const textRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFileRef = useRef<File | null>(null)

  // Detect link in draft
  useEffect(() => {
    if (linkDismissed) return
    const url = extractFirstUrl(draft)
    if (url && (!linkPreview || linkPreview.url !== url)) {
      setLinkPreview(buildLinkPreview(url))
    } else if (!url && linkPreview) {
      setLinkPreview(null)
    }
  }, [draft, linkDismissed, linkPreview])

  // Auto-resize textarea
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [draft])

  // Focus when reply or edit changes
  useEffect(() => {
    if (replyingTo || editingMessage) {
      textRef.current?.focus()
    }
  }, [replyingTo, editingMessage])

  // Check for colon autocomplete
  useEffect(() => {
    const match = draft.match(/:([a-zA-Zа-яА-Я0-9_-]{1,15})$/)
    if (match) {
      setColonQuery(match[1].toLowerCase())
    } else {
      setColonQuery(null)
    }
  }, [draft])

  const canSend = (draft.trim().length > 0 || Boolean(attachment) || Boolean(mediaAttachment)) && uploadProgress === null

  const submit = () => {
    if (editingMessage) {
      if (draft.trim() && onSubmitEdit) {
        onSubmitEdit(draft.trim())
      }
      return
    }

    if (!canSend) {
      textRef.current?.focus()
      return
    }

    const replyPayload: ChatMessageReply | null = replyingTo
      ? {
          id: replyingTo.id,
          authorId: replyingTo.authorId,
          text: replyingTo.text || replyingTo.attachment?.title || 'Вложение',
          attachmentSnippet: replyingTo.attachment?.title,
        }
      : null

    onSend(draft.trim(), attachment, {
      replyTo: replyPayload,
      media: mediaAttachment,
      linkPreview: linkPreview,
    })

    setAttachment(null)
    setMediaAttachment(null)
    setLinkPreview(null)
    setLinkDismissed(false)
    onCancelReply?.()
    setColonQuery(null)
  }

  const handleProcessMediaFile = async (file: File, explicitType?: ChatMediaType) => {
    lastFileRef.current = file
    abortControllerRef.current = new AbortController()
    setUploadProgress(10)
    setUploadError(null)

    // Показываем локальное превью на время загрузки
    const tempUrl = typeof window !== 'undefined' ? URL.createObjectURL(file) : ''
    setMediaAttachment({
      type: explicitType || (file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'file'),
      url: tempUrl,
      name: file.name,
      sizeBytes: file.size,
    })

    try {
      const res = await uploadChatMedia(file, {
        userId: userId || 'me',
        threadId: threadId || 'general',
        fileName: file.name,
        mediaType: explicitType,
        signal: abortControllerRef.current.signal,
        onProgress: (p) => setUploadProgress(p.percent),
      })

      if (res.ok && res.url) {
        setMediaAttachment({
          type: res.type,
          url: res.url,
          name: res.name,
          sizeBytes: res.sizeBytes,
        })
        setUploadProgress(null)
        setUploadError(null)
        onNotify?.(`${res.type === 'image' ? 'Фото' : 'Файл'} «${file.name}» загружен`)
      } else {
        setUploadProgress(null)
        setUploadError(res.error || 'Ошибка загрузки')
        onNotify?.(res.error || 'Ошибка загрузки файла')
      }
    } catch (err: any) {
      setUploadProgress(null)
      setUploadError(err?.message || 'Сбой сети')
    }
  }

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setUploadProgress(null)
    setUploadError(null)
    setMediaAttachment(null)
    onNotify?.('Загрузка отменена')
  }

  const retryUpload = () => {
    if (lastFileRef.current) {
      handleProcessMediaFile(lastFileRef.current)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          handleProcessMediaFile(file, 'image')
          return
        }
      }
    }

    const text = e.clipboardData?.getData('text')
    if (text) {
      const url = extractFirstUrl(text)
      if (url) {
        setLinkDismissed(false)
        setLinkPreview(buildLinkPreview(url))
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
      return
    }
    if (e.key === 'Escape') {
      if (uploadProgress !== null) {
        cancelUpload()
        return
      }
      if (linkPreview) {
        setLinkPreview(null)
        setLinkDismissed(true)
        return
      }
      if (mediaAttachment) {
        setMediaAttachment(null)
        return
      }
      if (emojiOpen) {
        setEmojiOpen(false)
        return
      }
      if (replyingTo) {
        onCancelReply?.()
        return
      }
      if (editingMessage) {
        onCancelEdit?.()
        return
      }
      if (menuOpen) {
        setMenuOpen(false)
        return
      }
    }
    if (e.key === 'ArrowUp' && !draft && !editingMessage && onEditLastMessage) {
      e.preventDefault()
      onEditLastMessage()
    }
  }

  // Handle local image upload
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleProcessMediaFile(file, 'image')
    e.target.value = ''
    setMenuOpen(false)
  }

  // Handle local document file upload
  const handleDocumentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleProcessMediaFile(file, file.type.startsWith('video/') ? 'video' : 'file')
    e.target.value = ''
    setMenuOpen(false)
  }

  const handlePickSticker = (sticker: ChatSticker) => {
    setEmojiOpen(false)
    onSend('', null, {
      media: {
        type: 'sticker',
        url: sticker.id,
        name: sticker.title,
      },
    })
  }

  // Colon emoji quick matches
  const COLON_MATCHES: Record<string, string> = {
    огонь: '🔥', fire: '🔥',
    сердце: '❤️', heart: '❤️',
    сила: '💪', muscle: '💪',
    ракета: '🚀', rocket: '🚀',
    браво: '👏', clap: '👏',
    магия: '✨', sparkles: '✨',
    молитва: '🙏', pray: '🙏',
    топ: '⚡️', zap: '⚡️',
  }

  return (
    <div className="mcw__composer relative">
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

      {/* Быстрые ответы: горизонтальная прокрутка с затуханием по краям без скролла страницы */}
      {!editingMessage && !replyingTo && (
        <div className="mcw-quick-wrap relative w-full overflow-hidden">
          <div
            className="mcw-quick flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-none"
            role="group"
            aria-label="Быстрые ответы"
            style={{
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
              maskImage: 'linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)',
            }}
          >
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                type="button"
                className="mcw-quick__chip shrink-0 min-h-[34px] px-3.5 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] text-xs font-semibold whitespace-nowrap transition-colors"
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
        </div>
      )}

      {/* Полоса ответа на сообщение (Telegram Reply Bar) */}
      {replyingTo && (
        <div className="flex items-center justify-between border-l-2 border-[#1d9bf0] bg-[#1d9bf0]/10 px-3 py-1.5 rounded-r-lg mb-1 animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center gap-2 min-w-0">
            <Reply size={16} className="text-[#1d9bf0] shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#1d9bf0] leading-tight">
                В ответ {replyingTo.authorId === 'me' ? 'себе' : friendName}
              </p>
              <p className="truncate text-xs text-[#e7e9ea]/90 leading-tight">
                {replyingTo.text || replyingTo.attachment?.title || 'Вложение'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#71767b] hover:bg-white/10 hover:text-white"
            aria-label="Отменить ответ"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Полоса редактирования сообщения (Telegram Edit Bar) */}
      {editingMessage && (
        <div className="flex items-center justify-between border-l-2 border-[#ff7a18] bg-[#ff7a18]/10 px-3 py-1.5 rounded-r-lg mb-1 animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center gap-2 min-w-0">
            <Pencil size={16} className="text-[#ff7a18] shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#ffad5a] leading-tight">
                Редактирование сообщения
              </p>
              <p className="truncate text-xs text-[#e7e9ea]/90 leading-tight">
                {editingMessage.text}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#71767b] hover:bg-white/10 hover:text-white"
            aria-label="Отменить редактирование"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Превью прикреплённой карточки Priday */}
      {attachment && (
        <div className="mcw-attach-preview mb-1.5">
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

      {/* Превью фото или файла */}
      {mediaAttachment && (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            {mediaAttachment.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaAttachment.url}
                alt={mediaAttachment.name || 'Фото'}
                className="h-10 w-10 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff7a18]/20 text-[#ffad5a] shrink-0">
                <FileText size={20} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{mediaAttachment.name}</p>
              {uploadProgress !== null ? (
                <div className="space-y-1 mt-0.5">
                  <div className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--accent)] font-bold">
                    Загрузка {uploadProgress}%…
                  </p>
                </div>
              ) : uploadError ? (
                <p className="text-[10px] text-red-400 truncate">{uploadError}</p>
              ) : (
                <p className="text-[10px] text-[#71767b]">
                  {mediaAttachment.sizeBytes
                    ? `${Math.round(mediaAttachment.sizeBytes / 1024)} КБ`
                    : 'Готово к отправке'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {uploadError && (
              <button
                type="button"
                onClick={retryUpload}
                className="flex h-7 px-2 items-center gap-1 rounded-lg text-xs font-bold text-[var(--accent)] hover:bg-white/10"
                aria-label="Повторить загрузку"
              >
                <RefreshCw size={13} /> Повторить
              </button>
            )}
            <button
              type="button"
              onClick={uploadProgress !== null ? cancelUpload : () => setMediaAttachment(null)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#71767b] hover:bg-white/10 hover:text-white"
              aria-label={uploadProgress !== null ? 'Отменить загрузку' : 'Удалить вложение'}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Превью ссылки OpenGraph */}
      {linkPreview && (
        <div className="flex items-center justify-between border-l-2 border-[#1d9bf0] bg-[#1d9bf0]/10 px-3 py-1.5 rounded-r-xl mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#1d9bf0] leading-tight">
                🔗 {linkPreview.siteName || 'Ссылка'}
              </p>
              <p className="truncate text-xs text-white/90 leading-tight">
                {linkPreview.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setLinkPreview(null)
              setLinkDismissed(true)
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[#71767b] hover:text-white"
            aria-label="Убрать превью ссылки"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Быстрое автодополнение по двоеточию :огонь */}
      {colonQuery && Object.keys(COLON_MATCHES).some((k) => k.startsWith(colonQuery)) && (
        <div className="absolute bottom-full left-12 mb-2 z-40 flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#16181c] p-1.5 shadow-xl">
          {Object.entries(COLON_MATCHES)
            .filter(([k]) => k.startsWith(colonQuery))
            .slice(0, 5)
            .map(([word, emoji]) => (
              <button
                key={word}
                type="button"
                onClick={() => {
                  onChangeDraft(draft.replace(new RegExp(`:${colonQuery}$`), emoji))
                  setColonQuery(null)
                  textRef.current?.focus()
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-white/10"
              >
                <span className="text-base">{emoji}</span>
                <span className="text-[11px] text-[#71767b]">:{word}</span>
              </button>
            ))}
        </div>
      )}

      {/* Строка ввода */}
      <div className="mcw-compose-row flex items-end gap-2 p-1.5 bg-[var(--bg-elev)] border border-[var(--border)] rounded-2xl">
        {/* Кнопка скрепки (меню вложений) */}
        <div className="relative shrink-0">
          <button
            type="button"
            className="mcw-compose-icon min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
            onClick={() => {
              playClick(soundEnabled)
              setMenuOpen((v) => !v)
            }}
            aria-label="Прикрепить файл или карточку"
            title="Прикрепить"
          >
            <Paperclip size={19} />
          </button>

          {menuOpen && (
            <div className="absolute bottom-full left-0 mb-2 z-40 w-52 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-1.5 shadow-2xl animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  fileInputRef.current?.click()
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg-hover)]"
              >
                <FileText size={16} className="text-[#1d9bf0]" />
                <span>Файл / Медиа</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  setAttachOpen(true)
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg-hover)]"
              >
                <Sparkles size={16} className="text-[#ffad5a]" />
                <span>Карточка Winlog</span>
              </button>
            </div>
          )}
        </div>

        <textarea
          ref={textRef}
          className="mcw-compose-input flex-1 min-w-0 resize-none max-h-[140px] py-2 px-3 bg-transparent text-[var(--text)] placeholder:text-[var(--text-2)] text-[15px] leading-relaxed outline-none"
          placeholder={
            editingMessage
              ? 'Редактировать сообщение…'
              : `Написать ${friendName}… (Enter — отправить, : для эмодзи)`
          }
          value={draft}
          onChange={(e) => onChangeDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          rows={1}
          aria-label="Текст сообщения"
        />

        {/* Кнопка эмодзи */}
        <div className="mcw-emoji-wrap relative shrink-0 overflow-visible">
          <button
            type="button"
            className="mcw-compose-icon min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
            onClick={() => {
              playClick(soundEnabled)
              setEmojiOpen((v) => !v)
            }}
            aria-label="Эмодзи и стикеры"
            aria-expanded={emojiOpen}
          >
            <Smile size={19} />
          </button>

          {emojiOpen && (
            <ChatEmojiPicker
              align="right"
              onPickEmoji={(emoji) => {
                onChangeDraft(`${draft}${emoji}`)
                textRef.current?.focus()
              }}
              onPickSticker={handlePickSticker}
              onClose={() => setEmojiOpen(false)}
              soundEnabled={soundEnabled}
            />
          )}
        </div>

        {/* Кнопка отправки */}
        <div className="shrink-0">
          <button
            type="button"
            disabled={!canSend && !editingMessage}
            className={`mcw-send-btn min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-full transition-all shadow-sm ${
              canSend || editingMessage
                ? 'bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 active:scale-95'
                : 'bg-white/10 text-[var(--text-2)] opacity-50 cursor-not-allowed'
            }`}
            onClick={submit}
            aria-label="Отправить сообщение"
            title="Отправить (Enter)"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Модалка выбора карточки Priday (гордость, благодарность, сторис) */}
      {attachOpen && (
        <AttachCardPicker
          onPick={(card) => {
            setAttachment(card)
            setAttachOpen(false)
            onNotify?.('Карточка прикреплена к сообщению')
          }}
          onClose={() => setAttachOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  )
}

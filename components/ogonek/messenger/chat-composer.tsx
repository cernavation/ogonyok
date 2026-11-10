'use client'

import { AnimatePresence } from 'framer-motion'
import { FileText, Image as ImageIcon, Loader2, Mic, Paperclip, Pencil, Reply, Send, Smile, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { QUICK_REPLIES, type ChatSticker } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ChatAttachment, ChatMessage, ChatMessageMedia, ChatMessageReply } from '@/lib/ogonek/types'
import { uploadChatMedia, MAX_IMAGE_SIZE_BYTES, MAX_DOCUMENT_SIZE_BYTES } from '@/lib/ogonek/chat-media'
import dynamic from 'next/dynamic'
import { AttachCardPicker } from './attach-card-picker'
import { ChatAttachmentCard } from './chat-attachment-card'
import { ChatVoiceRecorder } from './chat-voice-recorder'

const ChatEmojiPicker = dynamic(() => import('./chat-emoji-picker').then((m) => m.ChatEmojiPicker), { ssr: false })

type Props = {
  friendName: string
  draft: string
  onChangeDraft: (value: string) => void
  onSend: (
    text: string,
    attachment?: ChatAttachment | null,
    extra?: {
      replyTo?: ChatMessageReply | null
      media?: ChatMessageMedia | null
      mentions?: string[]
      isSilent?: boolean
      scheduledForISO?: string | null
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
  threadId?: string
  currentUserId?: string
  groupMembers?: { userId: string; username: string; displayName: string }[]
  onTyping?: () => void
}

export function ChatComposer({
  friendName,
  draft,
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
  threadId,
  currentUserId,
  groupMembers = [],
  onTyping,
}: Props) {
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const [mediaAttachment, setMediaAttachment] = useState<ChatMessageMedia | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [colonQuery, setColonQuery] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const textRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const uploadAbortRef = useRef<AbortController | null>(null)

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

  // Check for colon autocomplete and @ mention autocomplete
  useEffect(() => {
    const colonMatch = draft.match(/:([a-zA-Zа-яА-Я0-9_-]{1,15})$/)
    setColonQuery(colonMatch ? colonMatch[1].toLowerCase() : null)

    const mentionMatch = draft.match(/@([a-zA-Z0-9_-]*)$/)
    setMentionQuery(mentionMatch ? mentionMatch[1].toLowerCase() : null)
  }, [draft])

  const canSend = draft.trim().length > 0 || Boolean(attachment) || Boolean(mediaAttachment)

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

    const mentions = Array.from(draft.matchAll(/@([a-zA-Z0-9_-]+)/g)).map((m) => m[1])

    onSend(draft.trim(), attachment, {
      replyTo: replyPayload,
      media: mediaAttachment,
      mentions: mentions.length > 0 ? mentions : undefined,
    })

    setAttachment(null)
    setMediaAttachment(null)
    onCancelReply?.()
    setColonQuery(null)
    setMentionQuery(null)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
      return
    }
    if (e.key === 'Escape') {
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

  // Handle local image upload via Storage bucket chat-media (no Base64 in JSONB!)
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setMenuOpen(false)

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      onNotify?.('Изображение не должно превышать 10 МБ')
      return
    }

    setIsUploading(true)
    setUploadProgress(15)
    const abortCtrl = new AbortController()
    uploadAbortRef.current = abortCtrl

    try {
      const res = await uploadChatMedia(
        file,
        threadId || 'direct-thread',
        currentUserId || 'local-user',
        {
          kind: 'image',
          fileName: file.name,
          onProgress: (p) => setUploadProgress(p),
          abortSignal: abortCtrl.signal,
        }
      )

      if (!res.ok || !res.descriptor) {
        onNotify?.(`Ошибка загрузки: ${res.error || 'Не удалось загрузить фото'}`)
        return
      }

      setMediaAttachment({
        type: 'image',
        url: res.descriptor.url,
        name: file.name,
        sizeBytes: res.descriptor.size,
      })
      onNotify?.(`Фотография «${file.name}» загружена в защищённое хранилище`)
    } catch (err: any) {
      if (abortCtrl.signal.aborted) {
        onNotify?.('Загрузка отменена')
      } else {
        onNotify?.(`Ошибка загрузки: ${err?.message || err}`)
      }
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      uploadAbortRef.current = null
    }
  }

  // Handle local document file upload via Storage bucket chat-media
  const handleDocumentFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setMenuOpen(false)

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      onNotify?.('Файл не должен превышать 25 МБ')
      return
    }

    setIsUploading(true)
    setUploadProgress(15)
    const abortCtrl = new AbortController()
    uploadAbortRef.current = abortCtrl

    try {
      const isVideo = file.type.startsWith('video/')
      const res = await uploadChatMedia(
        file,
        threadId || 'direct-thread',
        currentUserId || 'local-user',
        {
          kind: isVideo ? 'video' : 'file',
          fileName: file.name,
          onProgress: (p) => setUploadProgress(p),
          abortSignal: abortCtrl.signal,
        }
      )

      if (!res.ok || !res.descriptor) {
        onNotify?.(`Ошибка загрузки: ${res.error || 'Не удалось загрузить файл'}`)
        return
      }

      setMediaAttachment({
        type: isVideo ? 'video' : 'file',
        url: res.descriptor.url,
        name: file.name,
        sizeBytes: res.descriptor.size,
      })
      onNotify?.(`Файл «${file.name}» загружен в защищённое хранилище`)
    } catch (err: any) {
      if (abortCtrl.signal.aborted) {
        onNotify?.('Загрузка отменена')
      } else {
        onNotify?.(`Ошибка загрузки: ${err?.message || err}`)
      }
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      uploadAbortRef.current = null
    }
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

      {/* Превью прикреплённой карточки Огонька */}
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
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff7a18]/20 text-[#ffad5a]">
                <FileText size={20} />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">{mediaAttachment.name}</p>
              <p className="text-[10px] text-[#71767b]">
                {mediaAttachment.sizeBytes
                  ? `${Math.round(mediaAttachment.sizeBytes / 1024)} КБ`
                  : 'Готово к отправке'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMediaAttachment(null)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#71767b] hover:bg-white/10 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Прогресс-бар загрузки медиа */}
      {isUploading && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-2.5 mb-1.5 text-xs animate-in fade-in">
          <Loader2 size={16} className="animate-spin text-[var(--accent)] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[11px] text-[var(--text-2)] mb-1">
              <span>Загрузка в хранилище...</span>
              <span className="font-semibold text-[var(--accent)]">{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => uploadAbortRef.current?.abort()}
            className="px-2 py-1 rounded-md text-red-400 hover:bg-red-500/10 text-[11px] font-semibold transition-colors"
          >
            Отмена
          </button>
        </div>
      )}

      {/* Быстрое автодополнение упоминаний @username */}
      {mentionQuery !== null && groupMembers.length > 0 && (
        <div className="absolute bottom-full left-12 mb-2 z-40 max-h-48 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-1.5 shadow-xl flex flex-col gap-1 min-w-[200px]">
          {groupMembers
            .filter(
              (m) =>
                m.username.toLowerCase().startsWith(mentionQuery) ||
                m.displayName.toLowerCase().startsWith(mentionQuery)
            )
            .slice(0, 6)
            .map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => {
                  onChangeDraft(draft.replace(new RegExp(`@${mentionQuery}$`), `@${m.username} `))
                  setMentionQuery(null)
                  textRef.current?.focus()
                }}
                className="flex items-center gap-2 p-1.5 rounded-lg text-xs hover:bg-[var(--bg-hover)] text-left"
              >
                <span className="font-bold text-[var(--text)]">{m.displayName}</span>
                <span className="text-[11px] text-[var(--text-2)]">@{m.username}</span>
              </button>
            ))}
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

      {/* Строка ввода или панель записи голоса */}
      {voiceRecording ? (
        <ChatVoiceRecorder
          onSendVoice={(voiceMedia) => {
            setVoiceRecording(false)
            onSend('', null, { media: voiceMedia })
          }}
          onCancel={() => setVoiceRecording(false)}
          soundEnabled={soundEnabled}
        />
      ) : (
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
                  onClick={() => imageInputRef.current?.click()}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg-hover)]"
                >
                  <ImageIcon size={16} className="text-[#1d9bf0]" />
                  <span>Фотография</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg-hover)]"
                >
                  <FileText size={16} className="text-[#00ba7c]" />
                  <span>Документ / Файл</span>
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
                  <span>Карточка Огонька</span>
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
                : `Написать ${friendName}… (Enter — отправить, @ соратник, : эмодзи)`
            }
            value={draft}
            onChange={(e) => {
              onChangeDraft(e.target.value)
              onTyping?.()
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            aria-label="Текст сообщения"
          />

          {/* Кнопка эмодзи */}
          <div className="mcw-emoji-wrap relative shrink-0">
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

          {/* Кнопка отправки или записи голоса (как в Telegram) */}
          <div className="shrink-0">
            {canSend || editingMessage ? (
              <button
                type="button"
                className="mcw-send-btn min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 transition-all shadow-sm active:scale-95"
                onClick={submit}
                aria-label="Отправить сообщение"
                title="Отправить (Enter)"
              >
                <Send size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="mcw-compose-icon min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--accent)] transition-colors"
                onClick={() => {
                  playClick(soundEnabled)
                  setVoiceRecording(true)
                }}
                title="Записать голосовое сообщение"
                aria-label="Записать голосовое сообщение"
              >
                <Mic size={19} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Модалка выбора карточки Огонька (гордость, благодарность, сторис) */}
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

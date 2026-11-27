'use client'

import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Copy,
  Forward,
  Heart,
  Loader2,
  MessageCircle,
  Share2,
  Smile,
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { ChatEmojiPicker } from './messenger/chat-emoji-picker'
import { ChatGifModal } from './messenger/chat-gif-modal'
import { ForwardToChatModal } from './messenger/forward-to-chat-modal'
import {
  COMMENT_QUICK_REACTIONS,
  MAX_COMMENT_LENGTH,
  buildCommentTree,
  canDeleteComment,
  countThreadReplies,
  formatCommentStamp,
  formatRelativeTime,
  parsePostAuthorIdFromTarget,
  resolveReplyParentId,
  type CommentNode,
} from '@/lib/ogonek/comments'
import { getInitials } from '@/lib/ogonek/initials'
import { getCachedProfileSync, subscribeToCommentsRealtime } from '@/lib/supabase/api'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { Tooltip } from './tooltip'
import { UserAvatar, VerifiedBadge } from './ui'

type Props = {
  /** Цель обсуждения: "u:<ownerUuid>:day:12" | "day:12" | "post:<id>" */
  target: string
  /** UUID владельца поста (Day), чтобы он видел кнопку удаления под любыми комментариями */
  postAuthorId?: string | null
  /** Переход в профиль автора комментария при клике по аватару или имени */
  onOpenProfile?: (userId: string) => void
  /** Контекст блока */
  variant?: 'day' | 'pride'
  /** Оставлен для обратной совместимости пропов; лента открывается сразу в 1 клик */
  defaultOpen?: boolean
  /** Компактный режим внутри карточки гордости */
  compact?: boolean
  soundEnabled?: boolean
  onNotify?: (msg: string) => void
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Рендерит GIF-картинку с `referrerPolicy="no-referrer"` и автоматическим фолбэком
 * через `/api/giphy?img=...` (как в мессенджере).
 */
function CommentGifImage({
  gifUrl,
  alt = 'GIF',
  className = '',
}: {
  gifUrl: string
  alt?: string
  className?: string
}) {
  const [useProxy, setUseProxy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setUseProxy(false)
    setFailed(false)
  }, [gifUrl])

  if (failed || !gifUrl) return null

  const src = useProxy ? `/api/giphy?img=${encodeURIComponent(gifUrl)}` : gifUrl

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      className={className}
      onError={() => {
        if (!useProxy) {
          setUseProxy(true)
        } else {
          setFailed(true)
        }
      }}
    />
  )
}

/**
 * КОММЕНТАРИИ В СТИЛЕ X.COM / PRIDAY (PURE BLACK)
 *  • Авторасширяющийся textarea (1..5 строк) + смайлики в позицию курсора;
 *  • Отдельное GIF-превью (`gif_url`) без сырых ссылок в тексте;
 *  • Цепочки ответов до 3 уровней с вертикальной 2px-линией связи и «Показать ответы (N)»;
 *  • Полная панель действий: Ответить, Лайк, Эмодзи-реакции, Поделиться, Удалить.
 */
export function CommentsThread({
  target,
  postAuthorId = null,
  onOpenProfile,
  compact = false,
  soundEnabled = true,
  onNotify,
}: Props) {
  const {
    state,
    currentUser,
    loadCommentsForTargets,
    addComment,
    addReply,
    toggleCommentLike,
    toggleCommentReaction,
    deleteComment,
  } = useOgonekStore()
  const uid = useId()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)

  const [draft, setDraft] = useState('')
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<{
    parentId: string
    branchId: string
    username: string | null
    author: string
  } | null>(null)
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({})
  const [openReactionPickerId, setOpenReactionPickerId] = useState<string | null>(null)
  const [openShareMenuId, setOpenShareMenuId] = useState<string | null>(null)
  const [forwardModalState, setForwardModalState] = useState<{
    note: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({})
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [gifOpen, setGifOpen] = useState(false)
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState<{
    top: number
    left: number
  } | null>(null)

  const viewerId = state.auth?.activeAccountId || currentUser?.id || null
  const isSignedUuid = Boolean(viewerId && UUID_REGEX.test(viewerId))
  const effectivePostAuthorId = postAuthorId || parsePostAuthorIdFromTarget(target) || null

  const comments = useMemo(
    () => state.comments?.[target] ?? [],
    [state.comments, target]
  )
  const tree = useMemo(() => buildCommentTree(comments), [comments])
  const total = useMemo(() => countAllNodes(tree), [tree])

  const notify = useCallback(
    (msg: string) => {
      onNotify?.(msg)
    },
    [onNotify]
  )

  // Плавное авторасширение textarea от 1 до 5 строк
  const syncTextareaHeight = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = 100 // ~5 строк по 20px
    const nextHeight = Math.min(el.scrollHeight, maxHeight)
    el.style.height = `${Math.max(24, nextHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    syncTextareaHeight()
  }, [draft, syncTextareaHeight])

  // Закрытие поповеров реакций/шеринга по клику вне и Escape
  useEffect(() => {
    if (!openReactionPickerId && !openShareMenuId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenReactionPickerId(null)
        setOpenShareMenuId(null)
      }
    }
    const onDown = (e: MouseEvent) => {
      const targetEl = e.target as HTMLElement | null
      if (targetEl?.closest?.('[data-comment-popover]')) return
      setOpenReactionPickerId(null)
      setOpenShareMenuId(null)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [openReactionPickerId, openShareMenuId])

  // Подгружаем реальные комментарии + реакции из Supabase при открытии треда + слушаем Realtime
  useEffect(() => {
    if (!target || !isSignedUuid) return
    let cancelled = false

    if ((state.comments?.[target]?.length ?? 0) === 0) {
      setLoadingInitial(true)
    }

    const hints = { [target]: effectivePostAuthorId }
    void loadCommentsForTargets([target], hints)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingInitial(false)
      })

    let rtTimer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = subscribeToCommentsRealtime(() => {
      if (rtTimer) clearTimeout(rtTimer)
      rtTimer = setTimeout(() => {
        if (!cancelled) {
          void loadCommentsForTargets([target], hints).catch(() => {})
        }
      }, 220)
    })

    return () => {
      cancelled = true
      if (rtTimer) clearTimeout(rtTimer)
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, isSignedUuid, effectivePostAuthorId])

  const handleNavigateProfile = useCallback(
    (authorId?: string | null) => {
      if (!authorId) return
      playClick(soundEnabled)
      if (onOpenProfile) {
        onOpenProfile(authorId)
        return
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ogonek:navigate-view', {
            detail: { view: 'profile', userId: authorId },
          })
        )
      }
    },
    [onOpenProfile, soundEnabled]
  )

  const handleToggleEmojiPicker = useCallback(() => {
    playClick(soundEnabled)
    if (emojiPickerAnchor) {
      setEmojiPickerAnchor(null)
      return
    }
    const btn = emojiBtnRef.current
    if (!btn || typeof window === 'undefined') return
    const rect = btn.getBoundingClientRect()
    const pickerW = Math.min(340, window.innerWidth - 24)
    const pickerH = 380
    const spaceAbove = rect.top
    const top =
      spaceAbove >= pickerH + 12
        ? Math.max(12, rect.top - pickerH - 8)
        : Math.min(window.innerHeight - pickerH - 12, rect.bottom + 8)
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, window.innerWidth - pickerW - 12)
    )
    setEmojiPickerAnchor({ top, left })
  }, [emojiPickerAnchor, soundEnabled])

  const insertEmojiAtCursor = useCallback(
    (emoji: string) => {
      const el = inputRef.current
      if (!el) {
        setDraft((prev) => `${prev}${emoji}`.slice(0, MAX_COMMENT_LENGTH))
        return
      }
      const start = el.selectionStart ?? draft.length
      const end = el.selectionEnd ?? draft.length
      const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`.slice(0, MAX_COMMENT_LENGTH)
      setDraft(next)
      requestAnimationFrame(() => {
        if (!inputRef.current) return
        const pos = Math.min(next.length, start + emoji.length)
        inputRef.current.focus()
        try {
          inputRef.current.setSelectionRange(pos, pos)
        } catch {}
      })
    },
    [draft]
  )

  const handleReplyClick = useCallback(
    (node: CommentNode, depth: number) => {
      playClick(soundEnabled)
      const resolvedParentId = resolveReplyParentId(node, depth)
      const mention = node.username ? `@${node.username.replace(/^@/, '')} ` : ''
      setReplyTo({
        parentId: resolvedParentId,
        branchId: node.id,
        username: node.username || null,
        author: node.author,
      })

      // При ответе на 3-й уровень (или если упоминание отсутствует) мягко подставляем @username
      if (depth >= 2 && mention) {
        setDraft((prev) => {
          const clean = prev.trimStart()
          if (clean.startsWith(mention.trim())) return prev
          return clean ? `${mention}${clean}` : mention
        })
      }

      setTimeout(() => {
        inputRef.current?.focus()
      }, 20)
    },
    [soundEnabled]
  )

  const canSubmit = Boolean(draft.trim() || selectedGifUrl)

  const handleSubmit = useCallback(async () => {
    const trimmed = draft.trim()
    if ((!trimmed && !selectedGifUrl) || submitting) return

    setSubmitting(true)
    try {
      const activeReply = replyTo
      const res = activeReply
        ? await addReply(target, activeReply.parentId, trimmed, {
            postAuthorId: effectivePostAuthorId,
            gifUrl: selectedGifUrl,
          })
        : await addComment(target, trimmed, {
            postAuthorId: effectivePostAuthorId,
            gifUrl: selectedGifUrl,
          })

      if (!res?.ok) {
        notify(res?.error ? `Ошибка: ${res.error}` : 'Не удалось отправить комментарий')
        return
      }

      playSuccess(soundEnabled)
      setDraft('')
      setSelectedGifUrl(null)
      setEmojiPickerAnchor(null)
      if (activeReply) {
        // Раскрываем ветку родителя, чтобы пользователь сразу увидел свой ответ
        setExpandedBranches((prev) => ({
          ...prev,
          [activeReply.parentId]: true,
          [activeReply.branchId]: true,
        }))
        setReplyTo(null)
      }
      notify(activeReply ? 'Ответ опубликован' : 'Комментарий опубликован')
    } finally {
      setSubmitting(false)
    }
  }, [
    draft,
    selectedGifUrl,
    submitting,
    replyTo,
    addReply,
    addComment,
    target,
    effectivePostAuthorId,
    notify,
    soundEnabled,
  ])

  const handleLike = useCallback(
    async (commentId: string) => {
      playClick(soundEnabled)
      const res = await toggleCommentLike(target, commentId)
      if (!res?.ok) {
        notify(res?.error ? `Ошибка лайка: ${res.error}` : 'Не удалось поставить лайк')
      }
    },
    [toggleCommentLike, target, soundEnabled, notify]
  )

  const handleToggleReaction = useCallback(
    async (commentId: string, emoji: string) => {
      playClick(soundEnabled)
      setOpenReactionPickerId(null)
      const res = await toggleCommentReaction(target, commentId, emoji)
      if (!res?.ok) {
        notify(res?.error ? `Ошибка реакции: ${res.error}` : 'Не удалось сохранить реакцию')
      }
    },
    [toggleCommentReaction, target, soundEnabled, notify]
  )

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (deletingIds[commentId]) return
      playClick(soundEnabled)
      setDeletingIds((prev) => ({ ...prev, [commentId]: true }))
      try {
        const res = await deleteComment(target, commentId)
        if (!res?.ok) {
          notify(res?.error ? `Ошибка удаления: ${res.error}` : 'Не удалось удалить комментарий')
          return
        }
        if (replyTo?.parentId === commentId || replyTo?.branchId === commentId) {
          setReplyTo(null)
        }
        notify('Комментарий удалён')
      } finally {
        setDeletingIds((prev) => {
          const next = { ...prev }
          delete next[commentId]
          return next
        })
      }
    },
    [deletingIds, deleteComment, target, notify, replyTo, soundEnabled]
  )

  const handleCopyComment = useCallback(
    async (node: CommentNode) => {
      setOpenShareMenuId(null)
      playClick(soundEnabled)
      const authorTag = node.username ? `@${node.username.replace(/^@/, '')}` : node.author
      const parts = [`${authorTag}: ${node.text}`.trim()]
      if (node.gifUrl) parts.push(node.gifUrl)
      try {
        await navigator.clipboard.writeText(parts.join('\n'))
        notify('Комментарий скопирован в буфер')
      } catch {
        notify('Не удалось скопировать комментарий')
      }
    },
    [soundEnabled, notify]
  )

  const handleForwardComment = useCallback(
    (node: CommentNode) => {
      setOpenShareMenuId(null)
      playClick(soundEnabled)
      const authorTag = node.username ? `@${node.username.replace(/^@/, '')}` : node.author
      const lines = [`💬 Комментарий от ${authorTag}:`]
      if (node.text) lines.push(node.text)
      if (node.gifUrl) lines.push(node.gifUrl)
      setForwardModalState({ note: lines.join('\n') })
    },
    [soundEnabled]
  )

  // Данные текущего пользователя для аватарки у поля ввода
  const cachedMe = viewerId ? getCachedProfileSync(viewerId) : null
  const myDisplayName =
    currentUser?.displayName || cachedMe?.display_name || state.profile?.displayName || 'Ты'
  const myUsername = currentUser?.username || cachedMe?.username || state.profile?.username || ''
  const myAvatarUrl =
    currentUser?.avatarImage ||
    cachedMe?.avatar_image ||
    cachedMe?.avatar_url ||
    state.profile?.avatarImage ||
    (state.profile as any)?.avatar_url ||
    null
  const myAvatarColor =
    currentUser?.avatarColor || cachedMe?.avatar_color || state.profile?.avatarColor || '#FF5C00'

  const renderComment = (node: CommentNode, depth: number): ReactNode => {
    const showDelete = canDeleteComment(node, viewerId, effectivePostAuthorId)
    const isDeleting = Boolean(deletingIds[node.id])
    const profileClickable = Boolean(node.authorId)
    const cachedAuthor = node.authorId ? getCachedProfileSync(node.authorId) : null
    const avatarUrl = node.avatarUrl || cachedAuthor?.avatar_image || cachedAuthor?.avatar_url || null
    const avatarColor = node.avatarColor || cachedAuthor?.avatar_color || '#FF5C00'
    const displayName = cachedAuthor?.display_name || node.author || 'Пользователь'
    const username = cachedAuthor?.username || node.username || null
    const verified = Boolean(node.verified ?? cachedAuthor?.verified)

    const avatarSize = compact || depth > 0 ? 26 : 30
    const childCount = countThreadReplies(node)
    const hasReplies = node.replies.length > 0 && depth < 2
    const isBranchExpanded = Boolean(expandedBranches[node.id])
    const reactionList = node.reactions ?? []
    const isReactionPickerOpen = openReactionPickerId === node.id
    const isShareOpen = openShareMenuId === node.id

    // Если старый комментарий содержал markdown GIF без gifUrl, отобразим картинку чисто
    const legacyMdMatch = !node.gifUrl ? node.text.match(/!\[\]\((https?:\/\/[^\s)]+)\)/) : null
    const effectiveGifUrl = node.gifUrl || legacyMdMatch?.[1] || null
    const visibleText = legacyMdMatch
      ? node.text.replace(/!\[\]\([^)]+\)/g, '').trim()
      : node.text

    const railMarginClass = depth === 0 ? 'ml-[14px] pl-4' : 'ml-[12px] pl-3.5'

    return (
      <div
        key={node.id}
        data-comment-id={node.id}
        data-comment-depth={depth}
        className={depth === 0 ? 'py-2.5 first:pt-2 last:pb-1' : 'pt-2'}
      >
        <div className="flex items-stretch gap-2.5">
          {/* Левая рельса аватара + 2px вертикальная линия связи X.com к ответам */}
          <div className="flex flex-col items-center shrink-0">
            <UserAvatar
              avatarUrl={avatarUrl}
              avatarColor={avatarColor}
              displayName={displayName}
              username={username}
              initials={node.initials || getInitials(displayName, username || 'u')}
              size={avatarSize}
              onClick={profileClickable ? () => handleNavigateProfile(node.authorId) : undefined}
            />
            {hasReplies && (
              <div
                data-testid="thread-vertical-line"
                className="w-[2px] flex-1 bg-white/[0.14] mt-1.5 rounded-full min-h-[10px]"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1.5 flex-wrap leading-tight">
              {profileClickable ? (
                <button
                  type="button"
                  onClick={() => handleNavigateProfile(node.authorId)}
                  className="text-[13px] font-bold text-[#e7e9ea] hover:underline truncate cursor-pointer"
                >
                  {displayName}
                </button>
              ) : (
                <span className="text-[13px] font-bold text-[#e7e9ea] truncate">
                  {displayName}
                </span>
              )}

              {verified && <VerifiedBadge size="xs" />}

              {username && (
                <span className="text-[12px] text-[#71767b] truncate">
                  @{username.replace(/^@/, '')}
                </span>
              )}

              <Tooltip content={formatCommentStamp(node.createdAt)} side="top">
                <span className="text-[12px] text-[#71767b] shrink-0">
                  · {formatRelativeTime(node.createdAt)}
                </span>
              </Tooltip>
            </div>

            {visibleText && (
              <p className="text-[14px] leading-[20px] text-[#e7e9ea] mt-0.5 whitespace-pre-wrap break-words">
                {visibleText}
              </p>
            )}

            {effectiveGifUrl && (
              <div className="mt-1.5">
                <CommentGifImage
                  gifUrl={effectiveGifUrl}
                  alt="GIF в комментарии"
                  className="max-h-56 w-auto max-w-full rounded-xl object-cover border border-white/[0.1]"
                />
              </div>
            )}

            {/* Пилюли эмодзи-реакций */}
            {reactionList.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {reactionList.map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => void handleToggleReaction(node.id, r.emoji)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] border transition-colors cursor-pointer ${
                      r.reactedByMe
                        ? 'border-[#ff5a1f]/60 bg-[#ff5a1f]/15 text-[#ffad5a] font-semibold'
                        : 'border-white/[0.12] bg-white/[0.04] text-[#e7e9ea] hover:bg-white/[0.08]'
                    }`}
                    aria-pressed={r.reactedByMe}
                    aria-label={`Реакция ${r.emoji}`}
                  >
                    <span>{r.emoji}</span>
                    <span className="tabular-nums text-[11px]">{r.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Полная 5-кнопочная панель действий в стиле X.com на всех 3 уровнях */}
            <div className="relative flex items-center gap-1 mt-1 -ml-2 flex-wrap">
              {/* 1. Ответить (+ счётчик ответов в ветке) */}
              <button
                type="button"
                onClick={() => handleReplyClick(node, depth)}
                aria-label="Ответить на комментарий"
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] text-[#71767b] hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors cursor-pointer"
              >
                <MessageCircle size={14} />
                <span>Ответить</span>
                {childCount > 0 && (
                  <span className="tabular-nums text-[11px] text-[#71767b]">({childCount})</span>
                )}
              </button>

              {/* 2. Лайк (comment_likes) */}
              <button
                type="button"
                onClick={() => void handleLike(node.id)}
                aria-pressed={node.likedByMe}
                aria-label={node.likedByMe ? 'Убрать лайк' : 'Лайкнуть комментарий'}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] transition-colors cursor-pointer ${
                  node.likedByMe
                    ? 'text-[#f91880]'
                    : 'text-[#71767b] hover:text-[#f91880] hover:bg-[#f91880]/10'
                }`}
              >
                <Heart size={14} fill={node.likedByMe ? 'currentColor' : 'none'} />
                {node.likes > 0 && <span className="tabular-nums font-semibold">{node.likes}</span>}
              </button>

              {/* 3. Быстрые эмодзи-реакции (comment_reactions) */}
              <div className="relative" data-comment-popover>
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setOpenShareMenuId(null)
                    setOpenReactionPickerId((prev) => (prev === node.id ? null : node.id))
                  }}
                  aria-expanded={isReactionPickerOpen}
                  aria-label="Добавить реакцию на комментарий"
                  className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-[12px] transition-colors cursor-pointer ${
                    isReactionPickerOpen
                      ? 'text-[#ffad5a] bg-[#ff5a1f]/15'
                      : 'text-[#71767b] hover:text-[#ffad5a] hover:bg-[#ff5a1f]/10'
                  }`}
                >
                  <SmilePlus size={14} />
                </button>

                {isReactionPickerOpen && (
                  <div
                    role="dialog"
                    aria-label="Быстрые реакции"
                    className="absolute left-0 bottom-full mb-1.5 z-40 flex items-center gap-1 rounded-full border border-white/[0.16] bg-[#060608] px-2 py-1 shadow-[0_8px_28px_rgba(0,0,0,0.92)]"
                  >
                    {COMMENT_QUICK_REACTIONS.map((emoji) => {
                      const active = Boolean(reactionList.find((r) => r.emoji === emoji)?.reactedByMe)
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => void handleToggleReaction(node.id, emoji)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[15px] transition-transform hover:scale-125 cursor-pointer ${
                            active ? 'bg-[#ff5a1f]/25 ring-1 ring-[#ff5a1f]/60' : 'hover:bg-white/[0.08]'
                          }`}
                          aria-label={`Реакция ${emoji}`}
                        >
                          {emoji}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 4. Поделиться */}
              <div className="relative" data-comment-popover>
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setOpenReactionPickerId(null)
                    setOpenShareMenuId((prev) => (prev === node.id ? null : node.id))
                  }}
                  aria-expanded={isShareOpen}
                  aria-label="Поделиться комментарием"
                  className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-[12px] transition-colors cursor-pointer ${
                    isShareOpen
                      ? 'text-[#e7e9ea] bg-white/[0.08]'
                      : 'text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/[0.06]'
                  }`}
                >
                  <Share2 size={13} />
                </button>

                {isShareOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 sm:left-0 sm:right-auto bottom-full mb-1.5 w-48 z-40 rounded-2xl border border-white/[0.16] bg-[#060608] p-1 shadow-[0_10px_32px_rgba(0,0,0,0.92)] flex flex-col gap-0.5 text-[12px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleForwardComment(node)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[#e7e9ea] hover:bg-white/[0.06] font-medium transition-colors cursor-pointer"
                    >
                      <Forward size={13} className="text-[#ff5a1f]" />
                      <span>Переслать другу</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyComment(node)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[#e7e9ea] hover:bg-white/[0.06] font-medium transition-colors cursor-pointer"
                    >
                      <Copy size={13} className="text-[#71767b]" />
                      <span>Скопировать текст</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 5. Удалить (строго автору комментария или владельцу поста) */}
              {showDelete && (
                <Tooltip content="Удалить комментарий" side="top">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => void handleDelete(node.id)}
                    aria-label="Удалить комментарий"
                    className="inline-flex items-center justify-center rounded-full px-2 py-1 text-[12px] text-[#71767b] hover:text-[#f4212e] hover:bg-[#f4212e]/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {/* Сворачиваемая ветка ответов с вертикальной линией 2px в стиле X.com */}
        {hasReplies && (
          <div className={`${railMarginClass} border-l-2 border-white/[0.14] pt-0.5`}>
            {!isBranchExpanded ? (
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  setExpandedBranches((prev) => ({ ...prev, [node.id]: true }))
                }}
                className="inline-flex items-center gap-1.5 py-1.5 text-[12px] font-semibold text-[#ff5a1f] hover:text-[#ffad5a] hover:underline cursor-pointer"
              >
                <ChevronDown size={14} />
                <span>Показать ответы ({childCount})</span>
              </button>
            ) : (
              <div>
                <div>{node.replies.map((child) => renderComment(child, depth + 1))}</div>
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setExpandedBranches((prev) => ({ ...prev, [node.id]: false }))
                  }}
                  className="inline-flex items-center gap-1.5 py-1 mt-0.5 text-[12px] font-medium text-[#71767b] hover:text-[#e7e9ea] cursor-pointer"
                >
                  <ChevronUp size={13} />
                  <span>Скрыть ответы</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      id={`${uid}-comments`}
      data-testid="comments-thread"
      className="comment-thread bg-black border-t border-white/[0.08] pt-3"
    >
      {/* Плашка режима ответа «Ответ для @username» над полем ввода */}
      {replyTo && (
        <div
          data-testid="comment-reply-banner"
          className="flex items-center justify-between gap-2 mb-2 px-1 text-[12px] text-[#71767b]"
        >
          <span className="truncate">
            Ответ для{' '}
            <span className="text-[#ff5a1f] font-semibold">
              {replyTo.username ? `@${replyTo.username.replace(/^@/, '')}` : replyTo.author}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="text-[#71767b] hover:text-[#e7e9ea] p-0.5 rounded-full transition-colors cursor-pointer"
            aria-label="Отменить ответ"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Удобный авторасширяющийся rounded-2xl композер */}
      <div className="flex items-start gap-2.5">
        <div className="pt-1">
          <UserAvatar
            avatarUrl={myAvatarUrl}
            avatarColor={myAvatarColor}
            displayName={myDisplayName}
            username={myUsername}
            initials={getInitials(myDisplayName, myUsername)}
            size={compact ? 28 : 32}
          />
        </div>

        <div className="flex-1 min-w-0 rounded-2xl bg-[#060608] border border-white/[0.12] focus-within:border-[#ff5a1f]/65 transition-colors px-3 py-2">
          <textarea
            ref={inputRef}
            value={draft}
            maxLength={MAX_COMMENT_LENGTH}
            rows={1}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSubmit()
              }
              if (e.key === 'Escape' && replyTo) {
                setReplyTo(null)
              }
            }}
            placeholder={replyTo ? 'Написать ответ...' : 'Написать комментарий...'}
            aria-label="Написать комментарий"
            style={{ maxHeight: 100 }}
            className="w-full bg-transparent resize-none text-[14px] leading-[20px] text-[#e7e9ea] placeholder:text-[#71767b] outline-none"
          />

          {/* Превью выбранной GIF (без вставки URL в текст!) */}
          {selectedGifUrl && (
            <div
              data-testid="comment-gif-preview"
              className="relative inline-block mt-2 rounded-xl overflow-hidden border border-white/[0.12] bg-black"
            >
              <CommentGifImage
                gifUrl={selectedGifUrl}
                alt="Выбранная GIF"
                className="w-36 max-h-32 object-cover rounded-xl block"
              />
              <button
                type="button"
                onClick={() => setSelectedGifUrl(null)}
                aria-label="Убрать GIF"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 border border-white/20 text-white hover:bg-black flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Панель кнопок композера: Эмодзи, GIF, Отправить */}
          <div className="flex items-center justify-between gap-2 pt-1.5 mt-1 border-t border-white/[0.06]">
            <div className="flex items-center gap-1">
              <Tooltip content="Добавить эмодзи" side="top">
                <button
                  ref={emojiBtnRef}
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={handleToggleEmojiPicker}
                  aria-label="Добавить эмодзи"
                  aria-expanded={Boolean(emojiPickerAnchor)}
                  className={`h-7 w-7 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer ${
                    emojiPickerAnchor
                      ? 'text-[#ff5a1f] bg-[#ff5a1f]/15'
                      : 'text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/[0.06]'
                  }`}
                >
                  <Smile size={16} />
                </button>
              </Tooltip>

              <Tooltip content="Прикрепить GIF" side="top">
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setEmojiPickerAnchor(null)
                    setGifOpen(true)
                  }}
                  aria-label="Выбрать GIF"
                  className={`h-7 px-2 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                    selectedGifUrl
                      ? 'text-[#ff5a1f] bg-[#ff5a1f]/15'
                      : 'text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/[0.06]'
                  }`}
                >
                  GIF
                </button>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              {draft.length > 1500 && (
                <span className="text-[11px] text-[#71767b] tabular-nums">
                  {draft.length}/{MAX_COMMENT_LENGTH}
                </span>
              )}

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!canSubmit || submitting}
                aria-label="Отправить комментарий"
                className={`h-7 w-7 rounded-full inline-flex items-center justify-center transition-all ${
                  canSubmit && !submitting
                    ? 'bg-[#ff5a1f] text-white hover:opacity-90 active:scale-95 cursor-pointer'
                    : 'bg-white/[0.06] text-[#71767b] cursor-not-allowed'
                }`}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Эмодзи-пикер в портале (никогда не обрезается границами карточки) */}
      {emojiPickerAnchor &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: emojiPickerAnchor.top,
              left: emojiPickerAnchor.left,
              zIndex: 130,
            }}
          >
            <ChatEmojiPicker
              floating={false}
              hideStickers
              onPickEmoji={insertEmojiAtCursor}
              onClose={() => setEmojiPickerAnchor(null)}
              soundEnabled={soundEnabled}
            />
          </div>,
          document.body
        )}

      {/* Модалка выбора GIF */}
      {gifOpen && (
        <ChatGifModal
          onSelectGif={(gifUrl) => {
            setSelectedGifUrl(gifUrl)
            setGifOpen(false)
          }}
          onClose={() => setGifOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модалка пересылки комментария другу в чат */}
      {forwardModalState && (
        <ForwardToChatModal
          attachment={null}
          initialNote={forwardModalState.note}
          onClose={() => setForwardModalState(null)}
          onNotify={(msg) => notify(msg)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Список комментариев */}
      {loadingInitial && total === 0 ? (
        <div className="py-3 text-[13px] text-[#71767b] flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          <span>Загрузка комментариев...</span>
        </div>
      ) : total > 0 ? (
        <div className="mt-2 divide-y divide-white/[0.06]">
          {tree.map((node) => renderComment(node, 0))}
        </div>
      ) : (
        <p className="pt-2.5 text-[12px] text-[#71767b]">
          Комментариев пока нет — напиши первым.
        </p>
      )}
    </div>
  )
}

function countAllNodes(nodes: CommentNode[]): number {
  let count = 0
  for (const n of nodes) {
    count += 1 + countThreadReplies(n)
  }
  return count
}

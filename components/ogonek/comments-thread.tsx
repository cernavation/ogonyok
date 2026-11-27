'use client'

import { ArrowUp, Heart, Loader2, Reply, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { ChatGifModal } from './messenger/chat-gif-modal'
import {
  MAX_COMMENT_LENGTH,
  buildCommentTree,
  canDeleteComment,
  formatCommentStamp,
  formatRelativeTime,
  parsePostAuthorIdFromTarget,
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
 * КОММЕНТАРИИ В ЧИСТОМ СТИЛЕ X.COM / PRIDAY (PURE BLACK)
 *  • Без промежуточных полосок-тогглеров (открывается сразу в 1 клик по 💬);
 *  • Без быстрых шаблонов, переключателя «Я / Ты» и фейковых ботов;
 *  • 100% синхронизация с Supabase (comments + comment_likes + Realtime);
 *  • Удалять может автор комментария (свои) И владелец поста (любые под своим постом).
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
    deleteComment,
  } = useOgonekStore()
  const uid = useId()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<{
    id: string
    username: string | null
    author: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({})
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [gifOpen, setGifOpen] = useState(false)

  const viewerId = state.auth?.activeAccountId || currentUser?.id || null
  const isSignedUuid = Boolean(viewerId && UUID_REGEX.test(viewerId))
  const effectivePostAuthorId = postAuthorId || parsePostAuthorIdFromTarget(target) || null

  const comments = useMemo(
    () => state.comments?.[target] ?? [],
    [state.comments, target]
  )
  const tree = useMemo(() => buildCommentTree(comments), [comments])
  const total = tree.length > 0 || comments.length > 0
    ? buildCommentCount(tree)
    : 0

  const notify = useCallback(
    (msg: string) => {
      onNotify?.(msg)
    },
    [onNotify]
  )

  // Подгружаем реальные комментарии из Supabase при открытии треда + слушаем Realtime
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

  const handleReplyClick = useCallback(
    (node: CommentNode) => {
      playClick(soundEnabled)
      const mention = node.username ? `@${node.username.replace(/^@/, '')} ` : ''
      setReplyTo({
        id: node.id,
        username: node.username || null,
        author: node.author,
      })
      setDraft((prev) => {
        const clean = prev.trimStart()
        if (mention && !clean.startsWith(mention.trim())) {
          return clean ? `${mention}${clean}` : mention
        }
        return prev
      })
      setTimeout(() => {
        inputRef.current?.focus()
      }, 20)
    },
    [soundEnabled]
  )

  const handleSubmit = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    try {
      const res = replyTo
        ? await addReply(target, replyTo.id, trimmed, effectivePostAuthorId)
        : await addComment(target, trimmed, { postAuthorId: effectivePostAuthorId })

      if (!res?.ok) {
        notify(res?.error ? `Ошибка: ${res.error}` : 'Не удалось отправить комментарий')
        return
      }

      playSuccess(soundEnabled)
      setDraft('')
      setReplyTo(null)
      notify(replyTo ? 'Ответ опубликован' : 'Комментарий опубликован')
    } finally {
      setSubmitting(false)
    }
  }, [draft, submitting, replyTo, addReply, addComment, target, effectivePostAuthorId, notify, soundEnabled])

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
        if (replyTo?.id === commentId) {
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
    const canIndent = depth < 1
    const showDelete = canDeleteComment(node, viewerId, effectivePostAuthorId)
    const isDeleting = Boolean(deletingIds[node.id])
    const profileClickable = Boolean(node.authorId)
    const cachedAuthor = node.authorId ? getCachedProfileSync(node.authorId) : null
    const avatarUrl = node.avatarUrl || cachedAuthor?.avatar_image || cachedAuthor?.avatar_url || null
    const avatarColor = node.avatarColor || cachedAuthor?.avatar_color || '#FF5C00'
    const displayName = cachedAuthor?.display_name || node.author || 'Пользователь'
    const username = cachedAuthor?.username || node.username || null
    const verified = Boolean(node.verified ?? cachedAuthor?.verified)

    return (
      <div
        key={node.id}
        data-comment-id={node.id}
        className={depth === 0 ? 'py-3 first:pt-2 last:pb-1' : 'pt-2.5'}
      >
        <div className="flex items-start gap-2.5">
          <UserAvatar
            avatarUrl={avatarUrl}
            avatarColor={avatarColor}
            displayName={displayName}
            username={username}
            initials={node.initials || getInitials(displayName, username || 'u')}
            size={compact || depth > 0 ? 26 : 30}
            onClick={profileClickable ? () => handleNavigateProfile(node.authorId) : undefined}
          />

          <div className="flex-1 min-w-0">
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

            {node.text.includes('![](') || (node.text.includes('http') && node.text.includes('.gif')) ? (
              <div className="space-y-1.5 mt-1">
                {node.text.replace(/!\[\]\([^)]+\)/g, '').trim() && (
                  <p className="text-[14px] leading-[20px] text-[#e7e9ea] whitespace-pre-wrap break-words">
                    {node.text.replace(/!\[\]\([^)]+\)/g, '').trim()}
                  </p>
                )}
                {(() => {
                  const match =
                    node.text.match(/!\[\]\(([^)]+)\)/) ||
                    node.text.match(/(https?:\/\/[^\s]+(?:\.gif|\/giphy\.gif)[^\s]*)/i)
                  const gifUrl = match ? match[1] : null
                  if (!gifUrl) return null
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gifUrl}
                      alt="GIF"
                      className="max-h-48 rounded-xl object-contain border border-white/[0.1]"
                      loading="lazy"
                    />
                  )
                })()}
              </div>
            ) : (
              <p className="text-[14px] leading-[20px] text-[#e7e9ea] mt-0.5 whitespace-pre-wrap break-words">
                {node.text}
              </p>
            )}

            {/* Действия комментария: лайк, ответить, удалить */}
            <div className="flex items-center gap-1 mt-1 -ml-2">
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

              <button
                type="button"
                onClick={() => handleReplyClick(node)}
                aria-label="Ответить на комментарий"
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] text-[#71767b] hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors cursor-pointer"
              >
                <Reply size={13} />
                <span>Ответить</span>
              </button>

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

            {node.replies.length > 0 && (
              <div
                className={
                  canIndent
                    ? 'mt-1.5 pl-3 border-l border-white/[0.1] space-y-1'
                    : 'mt-1.5 space-y-1'
                }
              >
                {node.replies.map((child) => renderComment(child, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      id={`${uid}-comments`}
      data-testid="comments-thread"
      className="comment-thread bg-black border-t border-white/[0.08] pt-3"
    >
      {/* Индикатор ответа на конкретный комментарий */}
      {replyTo && (
        <div className="flex items-center justify-between gap-2 mb-2 px-1 text-[12px] text-[#71767b]">
          <span className="truncate">
            Ответ{' '}
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

      {/* Компактный инпут в стиле X.com Pure Black */}
      <div className="flex items-center gap-2.5">
        <UserAvatar
          avatarUrl={myAvatarUrl}
          avatarColor={myAvatarColor}
          displayName={myDisplayName}
          username={myUsername}
          initials={getInitials(myDisplayName, myUsername)}
          size={compact ? 28 : 32}
        />

        <div className="flex-1 flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] focus-within:border-[#ff5a1f]/60 pl-3.5 pr-1.5 py-1 transition-colors">
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
            className="flex-1 bg-transparent resize-none text-[14px] leading-[20px] text-[#e7e9ea] placeholder:text-[#71767b] outline-none max-h-24 py-1"
          />

          <Tooltip content="Выбрать GIF" side="top">
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setGifOpen(true)
              }}
              aria-label="Выбрать GIF"
              className="flex-none h-7 px-2 rounded-full text-[11px] font-bold text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              GIF
            </button>
          </Tooltip>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!draft.trim() || submitting}
            aria-label="Отправить комментарий"
            className={`flex-none h-7 w-7 rounded-full inline-flex items-center justify-center transition-all ${
              draft.trim() && !submitting
                ? 'bg-[#ff5a1f] text-white hover:opacity-90 active:scale-95 cursor-pointer'
                : 'bg-white/[0.06] text-[#71767b] cursor-not-allowed'
            }`}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
          </button>
        </div>
      </div>

      {/* Модалка выбора GIF */}
      {gifOpen && (
        <ChatGifModal
          onSelectGif={(gifUrl) => {
            setDraft((prev) => (prev ? `${prev}\n![](${gifUrl})` : `![](${gifUrl})`))
            notify('GIF прикреплена к комментарию')
          }}
          onClose={() => setGifOpen(false)}
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

function buildCommentCount(nodes: CommentNode[]): number {
  let count = 0
  for (const n of nodes) {
    count += 1
    if (n.replies.length > 0) count += buildCommentCount(n.replies)
  }
  return count
}

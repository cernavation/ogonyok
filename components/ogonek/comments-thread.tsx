'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Heart, MessageCircle, Reply, Send, Sparkles, Trash2 } from 'lucide-react'
import { useCallback, useId, useMemo, useState, type ReactNode } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  MAX_COMMENT_LENGTH,
  SUPPORT_PERSONAS,
  buildCommentTree,
  formatCommentStamp,
  formatRelativeTime,
  templatesForScope,
  type CommentNode,
  type SupportTemplate,
} from '@/lib/ogonek/comments'
import type { CommentPersona } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { Tooltip } from './tooltip'

type Props = {
  /** Цель обсуждения: "day:12" | "day:12:pride:0" */
  target: string
  /** Контекст блока — влияет на подписи и набор быстрых шаблонов */
  variant?: 'day' | 'pride'
  /** Открыт ли блок при первом рендере */
  defaultOpen?: boolean
  /** Компактный режим для строк внутри дня */
  compact?: boolean
  soundEnabled?: boolean
  onNotify?: (msg: string) => void
}

const PERSONA_ORDER: CommentPersona[] = ['me', 'support']

/** Аватар автора комментария: пользователь — синий, поддержка — тёплый градиент */
function CommentAvatar({
  persona,
  initials,
  size = 30,
}: {
  persona: CommentPersona
  initials: string
  size?: number
}) {
  const isSupport = persona === 'support'
  return (
    <div
      className="flex-none grid place-items-center rounded-full font-bold select-none"
      style={{
        width: size,
        height: size,
        fontSize: size <= 28 ? 11 : 12,
        color: '#fff',
        background: isSupport
          ? 'linear-gradient(145deg, #ff6b35 0%, #ff8f4d 55%, #ffad5a 100%)'
          : 'linear-gradient(145deg, #1d9bf0 0%, #1a8cd8 60%, #29384b 100%)',
        boxShadow: isSupport
          ? '0 0 0 1px rgba(255,107,53,0.35)'
          : '0 0 0 1px rgba(29,155,240,0.35)',
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

/**
 * КОММЕНТАРИИ ПОДДЕРЖКИ
 * Разворачиваемый блок под днём или отдельной гордостью:
 *  • дерево ответов (threaded replies);
 *  • лайки на комментарии;
 *  • быстрые шаблоны поддержки («Горжусь тобой!», «Мощный шаг!»);
 *  • сохранение всего в use-ogonek-store.ts.
 */
export function CommentsThread({
  target,
  variant = 'day',
  defaultOpen = false,
  compact = false,
  soundEnabled = true,
  onNotify,
}: Props) {
  const { state, addComment, addReply, toggleCommentLike, deleteComment } = useOgonekStore()
  const uid = useId()
  const reduce = useReducedMotion()

  const [open, setOpen] = useState(defaultOpen)
  const [draft, setDraft] = useState('')
  const [persona, setPersona] = useState<CommentPersona>('me')
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')

  const comments = useMemo(
    () => state.comments?.[target] ?? [],
    [state.comments, target]
  )
  const tree = useMemo(() => buildCommentTree(comments), [comments])
  const templates = useMemo(() => templatesForScope(variant), [variant])
  const total = comments.length

  const notify = useCallback(
    (msg: string) => {
      onNotify?.(msg)
    },
    [onNotify]
  )

  const handleToggleOpen = useCallback(() => {
    playClick(soundEnabled)
    setOpen((prev) => {
      const next = !prev
      if (!next) {
        setReplyToId(null)
        setReplyDraft('')
      }
      return next
    })
  }, [soundEnabled])

  /** Быстрый шаблон: один тап — тёплое слово уже под записью */
  const postTemplate = useCallback(
    (template: SupportTemplate, parentId: string | null = null) => {
      const created = addComment(target, template.text, {
        parentId,
        persona: 'support',
        template: template.text,
      })
      if (!created) return
      playSuccess(soundEnabled)
      notify(`${template.emoji} ${template.text}`)
      if (parentId) {
        setReplyToId(null)
        setReplyDraft('')
      }
    },
    [addComment, target, soundEnabled, notify]
  )

  const submitMain = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    const created = addComment(target, text, { persona })
    if (!created) return
    playSuccess(soundEnabled)
    setDraft('')
    notify(persona === 'support' ? '✦ Поддержка добавлена!' : 'Комментарий добавлен!')
  }, [draft, addComment, target, persona, soundEnabled, notify])

  const submitReply = useCallback(
    (parentId: string) => {
      const text = replyDraft.trim()
      if (!text) return
      const created = addReply(target, parentId, text, persona)
      if (!created) return
      playSuccess(soundEnabled)
      setReplyDraft('')
      setReplyToId(null)
      notify('Ответ отправлен!')
    },
    [replyDraft, addReply, target, persona, soundEnabled, notify]
  )

  const handleLike = useCallback(
    (commentId: string) => {
      const nowLiked = toggleCommentLike(target, commentId)
      playClick(soundEnabled)
      notify(nowLiked ? '❤️ Лайк поставлен' : 'Лайк снят')
    },
    [toggleCommentLike, target, soundEnabled, notify]
  )

  const handleDelete = useCallback(
    (commentId: string) => {
      playClick(soundEnabled)
      deleteComment(target, commentId)
      if (replyToId === commentId) {
        setReplyToId(null)
        setReplyDraft('')
      }
      notify('Комментарий удалён')
    },
    [deleteComment, target, soundEnabled, notify, replyToId]
  )

  const openReply = useCallback(
    (commentId: string) => {
      playClick(soundEnabled)
      setReplyToId((prev) => (prev === commentId ? null : commentId))
      setReplyDraft('')
    },
    [soundEnabled]
  )

  /** Persona-переключатель (используется в композерах) */
  const renderPersonaSwitch = (size: 'sm' | 'xs') => (
    <div className="flex items-center gap-1" role="group" aria-label="От чьего имени">
      {PERSONA_ORDER.map((p) => {
        const meta = SUPPORT_PERSONAS[p]
        const active = persona === p
        return (
          <Tooltip key={p} content={meta.hint} side="top">
            <button
              type="button"
              aria-pressed={active}
              onClick={() => {
                playClick(soundEnabled)
                setPersona(p)
              }}
              className={`inline-flex items-center gap-1 rounded-full border transition-colors duration-150 ${
                size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-0.5 text-[10px]'
              } font-bold ${
                active
                  ? p === 'support'
                    ? 'border-[#ff6b35] bg-[#ff6b35]/15 text-[#ffad5a]'
                    : 'border-[#1d9bf0] bg-[#1d9bf0]/15 text-[#5cb8f5]'
                  : 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--line-strong,#4a4f54)]'
              }`}
            >
              <span aria-hidden="true">{meta.initials}</span>
              {meta.label}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )

  /** Рекурсивный рендер комментария с ответами */
  const renderComment = (node: CommentNode, depth: number): ReactNode => {
    const isReplying = replyToId === node.id
    const canIndent = depth < 2

    return (
      <div key={node.id}>
        <div className="flex gap-2 pt-2.5">
          <CommentAvatar persona={node.persona} initials={node.initials} size={compact ? 26 : 30} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[13px] font-bold text-[var(--text)] tracking-[-0.01em]">
                {node.author}
              </span>
              {node.persona === 'support' && (
                <span className="text-[10px] px-1.5 py-[1px] rounded-full font-bold bg-[#ff6b35]/15 text-[#ffad5a]">
                  поддержка
                </span>
              )}
              <Tooltip content={formatCommentStamp(node.createdAt)} side="top">
                <span className="text-[11px] text-[var(--muted)]">
                  · {formatRelativeTime(node.createdAt)}
                </span>
              </Tooltip>
            </div>

            <p className="text-[14px] leading-[20px] text-[var(--text)] tracking-[-0.01em] mt-0.5 whitespace-pre-wrap break-words">
              {node.text}
            </p>

            {node.template && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-[var(--muted)] border border-[var(--line)] rounded-full px-2 py-[1px]">
                <Sparkles size={10} /> шаблон
              </span>
            )}

            {/* Действия комментария */}
            <div className="flex items-center gap-0.5 mt-1.5 -ml-1.5">
              <Tooltip content={node.likedByMe ? 'Убрать лайк' : 'Лайкнуть'} side="top">
                <button
                  type="button"
                  onClick={() => handleLike(node.id)}
                  aria-pressed={node.likedByMe}
                  aria-label={node.likedByMe ? 'Убрать лайк' : 'Лайкнуть комментарий'}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] transition-colors duration-150 ${
                    node.likedByMe
                      ? 'text-[#f91880]'
                      : 'text-[#71767b] hover:text-[#f91880] hover:bg-[#f91880]/10'
                  }`}
                >
                  <Heart size={14} fill={node.likedByMe ? 'currentColor' : 'none'} />
                  {node.likes > 0 && <span className="tabular-nums font-bold">{node.likes}</span>}
                </button>
              </Tooltip>

              <Tooltip content={isReplying ? 'Отменить ответ' : 'Ответить'} side="top">
                <button
                  type="button"
                  onClick={() => openReply(node.id)}
                  aria-expanded={isReplying}
                  aria-label="Ответить на комментарий"
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] transition-colors duration-150 ${
                    isReplying
                      ? 'text-[#1d9bf0] bg-[#1d9bf0]/10'
                      : 'text-[#71767b] hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10'
                  }`}
                >
                  <Reply size={14} />
                  <span>Ответить</span>
                </button>
              </Tooltip>

              {node.isMine && (
                <Tooltip content="Удалить комментарий" side="top">
                  <button
                    type="button"
                    onClick={() => handleDelete(node.id)}
                    aria-label="Удалить комментарий"
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] text-[#71767b] hover:text-[#ff5058] hover:bg-[#ff5058]/10 transition-colors duration-150"
                  >
                    <Trash2 size={14} />
                  </button>
                </Tooltip>
              )}
            </div>

            {/* Форма ответа */}
            <AnimatePresence initial={false}>
              {isReplying && (
                <motion.div
                  key="reply-box"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: reduce ? 0 : 0.18, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 rounded-xl border border-[#1d9bf0]/40 bg-[#0f1419] p-2">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      {renderPersonaSwitch('xs')}
                      <span className="text-[10px] text-[#71767b]">
                        {replyDraft.length}/{MAX_COMMENT_LENGTH}
                      </span>
                    </div>
                    <textarea
                      autoFocus
                      value={replyDraft}
                      maxLength={MAX_COMMENT_LENGTH}
                      rows={2}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          submitReply(node.id)
                        }
                        if (e.key === 'Escape') {
                          setReplyToId(null)
                          setReplyDraft('')
                        }
                      }}
                      placeholder="Ответь тёплым словом…"
                      className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-[13px] text-[var(--text)] outline-none focus:border-[#1d9bf0] transition-colors"
                    />
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyToId(null)
                          setReplyDraft('')
                        }}
                        className="text-[12px] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={() => submitReply(node.id)}
                        disabled={!replyDraft.trim()}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-bold transition-colors duration-150 ${
                          replyDraft.trim()
                            ? 'bg-[#1d9bf0] text-white hover:bg-[#1a8cd8]'
                            : 'bg-[#1c1e22] text-[#71767b] cursor-not-allowed'
                        }`}
                      >
                        <Send size={13} /> Ответить
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Дерево ответов */}
            {node.replies.length > 0 && (
              <div className={canIndent ? 'cmt-replies' : 'cmt-replies-flat'}>
                {node.replies.map((child) => renderComment(child, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="comment-thread" data-open={open}>
      {/* Триггер разворачивания */}
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={open}
        aria-controls={`${uid}-comments`}
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] font-semibold transition-colors duration-150 ${
          open
            ? 'text-[#ffad5a] bg-[#ff6b35]/10'
            : 'text-[#71767b] hover:text-[#ffad5a] hover:bg-[#ff6b35]/10'
        }`}
      >
        <MessageCircle size={compact ? 14 : 16} />
        <span>{total > 0 ? 'Поддержка' : 'Поддержать'}</span>
        {total > 0 && (
          <span
            className={`text-[11px] font-bold tabular-nums rounded-full px-1.5 min-w-[18px] text-center ${
              open ? 'bg-[#ff6b35]/25 text-[#ffad5a]' : 'bg-white/[0.06] text-[#71767b]'
            }`}
          >
            {total}
          </span>
        )}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          className="inline-flex"
          aria-hidden="true"
        >
          <ChevronDown size={14} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="comments-body"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              id={`${uid}-comments`}
              className="mt-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle,#0d0e0f)] p-3"
            >
              {/* Быстрые шаблоны поддержки */}
              <div className="mb-2.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                  Быстрая поддержка
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((template) => (
                    <motion.button
                      key={template.id}
                      type="button"
                      whileTap={reduce ? undefined : { scale: 0.94 }}
                      onClick={() => postTemplate(template)}
                      title={`Отправить: ${template.text}`}
                      className="cmt-chip inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[12px] font-medium text-[var(--text)] hover:border-[#ff6b35]/60 hover:bg-[#ff6b35]/10 hover:text-[#ffad5a] transition-colors duration-150"
                    >
                      <span aria-hidden="true">{template.emoji}</span>
                      <span>{template.text}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Композер */}
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  {renderPersonaSwitch('sm')}
                  <span className="text-[10px] text-[var(--muted)]">
                    {draft.length}/{MAX_COMMENT_LENGTH}
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    maxLength={MAX_COMMENT_LENGTH}
                    rows={compact ? 1 : 2}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        submitMain()
                      }
                    }}
                    placeholder={
                      variant === 'pride'
                        ? 'Скажи себе тёплое слово об этой гордости…'
                        : 'Поддержи себя за этот день…'
                    }
                    className="flex-1 resize-none rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-[13px] text-[var(--text)] outline-none focus:border-[#ff6b35] transition-colors"
                  />
                  <Tooltip content="Отправить (Enter)" side="top">
                    <button
                      type="button"
                      onClick={submitMain}
                      disabled={!draft.trim()}
                      aria-label="Отправить комментарий поддержки"
                      className={`flex-none inline-flex items-center justify-center rounded-full transition-colors duration-150 ${
                        draft.trim()
                          ? 'bg-[#ff6b35] text-white hover:bg-[#ff7f4f]'
                          : 'bg-[#1c1e22] text-[#71767b] cursor-not-allowed'
                      }`}
                      style={{ width: 34, height: 34 }}
                    >
                      <Send size={15} />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Дерево комментариев / пустое состояние */}
              {total === 0 ? (
                <div className="flex items-start gap-2 mt-3 px-1 text-[13px] text-[#71767b]">
                  <Sparkles size={15} className="mt-0.5 flex-none text-[#ffad5a]" />
                  <p className="leading-[19px]">
                    Пока тихо. Нажми шаблон выше или напиши первое тёплое слово — поддержка
                    начинается с одного сообщения.
                  </p>
                </div>
              ) : (
                <div className="mt-1">
                  {tree.map((node) => renderComment(node, 0))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

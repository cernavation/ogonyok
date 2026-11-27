'use client'

import {
  BookmarkPlus,
  Check,
  Flame,
  Globe,
  Heart,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Repeat,
  Share2,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { memo, useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { playClick } from '@/lib/ogonek/sound'
import { resolvePhotoUrl } from '@/lib/ogonek/photos'
import { dayTarget } from '@/lib/ogonek/reactions'
import { filterRealComments, scopedDayCommentTarget } from '@/lib/ogonek/comments'
import { buildGratitudeAttachment, buildPrideAttachment } from '@/lib/ogonek/messenger'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { formatPhotoAttachmentCaption } from '@/lib/ogonek/attached-targets'
import { getInitials } from '@/lib/ogonek/initials'
import { normalizeVisibility, visibilityMeta } from '@/lib/ogonek/visibility'
import type { ChatAttachment, Day } from '@/lib/ogonek/types'
import { useOgonekStore, syncDayToSupabase } from '@/lib/ogonek/use-ogonek-store'
import dynamic from 'next/dynamic'
import { IconButton, UserAvatar, VerifiedBadge } from './ui'
import { DayEntries } from './day-entries'
import { CommentsThread } from './comments-thread'
import { ReactionBar } from './reaction-bar'
import { Tooltip } from './tooltip'
import { VisibilitySwitcher } from './visibility-switcher'

const DayOptionsModal = dynamic(
  () => import('./day-options-modal').then((m) => m.DayOptionsModal),
  { ssr: false }
)

const ForwardToChatModal = dynamic(
  () => import('./messenger').then((m) => m.ForwardToChatModal),
  { ssr: false }
)
const PublishPrideStoryModal = dynamic(
  () => import('./publish-pride-story-modal').then((m) => m.PublishPrideStoryModal),
  { ssr: false }
)
const MediaLightbox = dynamic(
  () => import('./media-lightbox').then((m) => m.MediaLightbox),
  { ssr: false }
)
const ShareCardModal = dynamic(
  () => import('./share-card-modal').then((m) => m.ShareCardModal),
  { ssr: false }
)

const reactionVariants = {
  idle: { scale: 1 },
  pressed: { scale: [1, 0.8, 1.2, 1.0] },
}

type Props = {
  day: Day
  onLightbox: (url: string) => void
  onNotify?: (msg: string) => void
  onPinToVault?: (fact: string) => void
  onEdit?: (day: Day) => void
  onOpenProfile?: (userId?: string | null) => void
  isHighlighted?: boolean
  isOwnerOverride?: boolean
  soundEnabled?: boolean
}

function DayCardComponent({
  day,
  onLightbox,
  onNotify,
  onPinToVault,
  onEdit,
  onOpenProfile,
  isHighlighted = false,
  isOwnerOverride,
  soundEnabled = true,
}: Props) {
  const {
    state,
    currentUser,
    ratePride,
    toggleReaction,
    setDayVisibility,
    setPrideVisibility,
    setAllPridesVisibility,
    postMyStory,
    updateDay,
  } = useOgonekStore()

  const postAuthorId =
    day.user_id ||
    day.userId ||
    (day as any).author?.id ||
    currentUser?.id ||
    state.auth?.activeAccountId ||
    null
  const dayAuthor = (day as any).author as
    | {
        id?: string
        username?: string
        displayName?: string
        avatarImage?: string | null
        avatarColor?: string | null
        verified?: boolean
      }
    | undefined
  const isForeignDayAuthor = Boolean(
    dayAuthor &&
      ((dayAuthor.id && currentUser?.id && dayAuthor.id !== currentUser.id) ||
        (dayAuthor.username &&
          state.profile?.username &&
          dayAuthor.username.toLowerCase() !== state.profile.username.toLowerCase()))
  )
  const target =
    !isForeignDayAuthor || !postAuthorId || (currentUser?.id && postAuthorId === currentUser.id)
      ? dayTarget(day.id)
      : `u:${postAuthorId}:day:${day.id}`
  const commentsTarget = scopedDayCommentTarget(day.id, postAuthorId)
  const commentsCount = filterRealComments(state.comments?.[commentsTarget] ?? []).length
  const reactionCounts = state.dayReactions[target] ?? {}
  const myReactionIds = state.myReactions[target] ?? []
  const liked = myReactionIds.includes('fire')
  const fireCount = reactionCounts.fire ?? 0
  const [likeAnim, setLikeAnim] = useState<'idle' | 'pressed'>('idle')
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [optionsModalOpen, setOptionsModalOpen] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [storyPrideIndex, setStoryPrideIndex] = useState<number | null>(null)
  const [forwardPride, setForwardPride] = useState<ChatAttachment | null>(null)
  const [mediaIndex, setMediaIndex] = useState<number | null>(null)
  const [expandedDetails, setExpandedDetails] = useState(false)
  const reduce = useReducedMotion()

  const dayVisibility = normalizeVisibility(day.visibility)

  const resolvedGroupName = useMemo(() => {
    const explicit =
      day.groupName ||
      day.prides?.find((p) => p.groupName)?.groupName ||
      (day.gratitudes as any)?.find((g: any) => typeof g === 'object' && g.groupName)?.groupName
    if (explicit) return explicit
    const gid = day.groupId || day.prides?.find((p) => p.groupId)?.groupId
    if (!gid) return null
    const cleanGid = String(gid).replace(/^group-/i, '').toLowerCase()
    for (const [tid, t] of Object.entries(state.chatThreads ?? {})) {
      if (!t.groupMeta) continue
      const candidateId = String(t.groupMeta.dbId || t.groupMeta.id || tid).replace(/^group-/i, '').toLowerCase()
      if (candidateId === cleanGid || tid === gid || t.groupMeta.id === gid) {
        return t.groupMeta.title
      }
    }
    return null
  }, [day.groupName, day.groupId, day.prides, day.gratitudes, state.chatThreads])

  const displayName = isForeignDayAuthor
    ? dayAuthor?.displayName || `@${dayAuthor?.username || 'user'}`
    : state.profile?.displayName || currentUser?.displayName || 'Alexei Cerna'
  const username = isForeignDayAuthor
    ? dayAuthor?.username || 'user'
    : state.profile?.username || currentUser?.username || 'cernavation'
  const initials = getInitials(displayName, username)

  const isAuthor =
    !username ||
    username.toLowerCase() === 'cernavation' ||
    username.toLowerCase() === 'alex_cerna' ||
    displayName.toLowerCase().includes('cerna') ||
    displayName.toLowerCase().includes('церна') ||
    displayName.toLowerCase().includes('черняк')

  const rawAvatar = isForeignDayAuthor
    ? dayAuthor?.avatarImage || (isAuthor ? '/author-avatar.png' : null)
    : currentUser?.avatarImage ||
      (currentUser as any)?.avatar_image ||
      (currentUser as any)?.avatar_url ||
      state.profile.avatarImage ||
      (state.profile as any)?.avatar ||
      (state.profile as any)?.avatar_url ||
      (isAuthor ? '/author-avatar.png' : null)

  const authorColor = isForeignDayAuthor
    ? dayAuthor?.avatarColor || '#FF5C00'
    : state.profile.avatarColor || '#FF5C00'
  const isAuthorVerified = isForeignDayAuthor
    ? Boolean(dayAuthor?.verified)
    : Boolean(state.profile?.verified || isAuthor)

  const myAvatarSrc = usePhotoUrl(rawAvatar)
  const effectiveAvatarSrc =
    myAvatarSrc ||
    (rawAvatar &&
    (rawAvatar.startsWith('http://') ||
      rawAvatar.startsWith('https://') ||
      rawAvatar.startsWith('data:') ||
      rawAvatar.startsWith('blob:') ||
      rawAvatar.startsWith('/'))
      ? rawAvatar
      : null)

  const viewerUid = currentUser?.id || state.auth?.activeAccountId || null
  const dayOwnerId = day.user_id || day.userId || dayAuthor?.id || null
  const viewerUsername = (state.profile?.username || currentUser?.username || '').toLowerCase()
  const dayOwnerUsername = (dayAuthor?.username || '').toLowerCase()
  const isOwner =
    typeof isOwnerOverride === 'boolean'
      ? isOwnerOverride
      : Boolean(
          (dayOwnerId && viewerUid && dayOwnerId.toLowerCase() === viewerUid.toLowerCase()) ||
            (dayOwnerUsername && viewerUsername && dayOwnerUsername === viewerUsername) ||
            (!dayOwnerId && !dayOwnerUsername && !isForeignDayAuthor)
        )

  const handleNavigateAuthor = () => {
    const targetId = dayOwnerId || dayAuthor?.username || null
    if (!targetId) return
    playClick(soundEnabled)
    if (onOpenProfile) {
      onOpenProfile(targetId)
      return
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ogonek:navigate-view', {
          detail: { view: 'profile', userId: targetId },
        })
      )
    }
  }

  const visiblePrides = useMemo(() => {
    const raw = (day.prides || []).filter((p) => p.text && p.text !== '—')
    if (isOwner) return raw
    return raw.filter((p) => {
      const eff = dayVisibility === 'private' ? 'private' : (p.visibility || dayVisibility || 'public')
      return eff !== 'private'
    })
  }, [day.prides, dayVisibility, isOwner])

  const firstPride = visiblePrides[0]

  const otherPrides = useMemo(() => {
    return visiblePrides.slice(1)
  }, [visiblePrides])

  const otherGratitudes = useMemo(() => {
    return (day.gratitudes || []).filter((g) => {
      const t = typeof g === 'string' ? g : g.text
      if (!t || t === '—') return false
      if (!isOwner && typeof g === 'object' && g.visibility === 'private') return false
      return true
    })
  }, [day.gratitudes, isOwner])

  const handleAiEvaluateDay = async () => {
    setOptionsModalOpen(false)
    const prides = (day.prides || [])
      .map((p) => p.text)
      .filter((t): t is string => Boolean(t && t !== '—'))
    const gratitudes = (day.gratitudes || [])
      .map((g) => (typeof g === 'string' ? g : g.text))
      .filter((t): t is string => Boolean(t && t !== '—'))

    if (prides.length === 0 && gratitudes.length === 0) {
      onNotify?.('Нет записей для оценки')
      return
    }

    const currentUserId =
      state.auth.activeAccountId ||
      (state.profile as any)?.id ||
      state.profile.username ||
      '94e9eaf7-ec74-4366-9ce3-7de1e670f52b'

    onNotify?.('⚡ Ментор анализирует масштаб побед...')
    const startTime = Date.now()
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({
          prides,
          gratitudes,
          dayId: day.id,
          userId: currentUserId,
        }),
      })

      const elapsed = Date.now() - startTime
      if (elapsed < 1600) {
        await new Promise((r) => setTimeout(r, 1600 - elapsed))
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.success === false) {
        throw new Error(data.error || `Ошибка сервера (${res.status})`)
      }

      const score = typeof data.score === 'number' ? Number(data.score.toFixed(1)) : 8.8
      const updatedDay: Day = {
        ...day,
        score,
        aiScore: score,
        aiVerdict: data.verdict,
        aiBreakdown: data.breakdown,
        prides: (day.prides || []).map((p, idx) => {
          const itemScore = typeof data.prideEvaluations?.[idx]?.score === 'number'
            ? Number(data.prideEvaluations[idx].score.toFixed(1))
            : score
          return {
            ...p,
            score: itemScore,
            scale: Math.max(1, Math.min(10, Math.round(itemScore))),
          }
        }),
      }

      updateDay(updatedDay)
      await syncDayToSupabase(updatedDay).catch((err) => {
        console.warn('Supabase syncDayToSupabase error:', err)
      })

      onNotify?.(`⚡ Оценка дня #${day.id}: ${score.toFixed(1)}/10 ★ — ${data.verdict || 'Отличный результат!'}`)
    } catch (err: any) {
      console.error('DeepSeek evaluation error:', err)
      const msg = String(err?.message || '')
      if (
        msg.includes('DEEPSEEK_API_KEY') ||
        msg.includes('API key') ||
        msg.includes('Неверный ключ')
      ) {
        onNotify?.('Ключ DEEPSEEK_API_KEY не задан или недействителен в настройках Vercel.')
      } else {
        onNotify?.(`❌ Ошибка оценки: ${err.message || 'Не удалось оценить'}`)
      }
    }
  }

  const rawPhotos = Array.isArray(day.photos) ? day.photos.filter((p): p is string => Boolean(p)) : []
  const [photoUrls, setPhotoUrls] = useState<string[]>([])

  useEffect(() => {
    if (rawPhotos.length === 0) {
      setPhotoUrls([])
      return
    }
    let cancelled = false
    Promise.all(rawPhotos.map((p) => resolvePhotoUrl(p))).then((urls) => {
      if (!cancelled) setPhotoUrls(urls.filter(Boolean))
    })
    return () => { cancelled = true }
  }, [day.photos])

  useEffect(() => {
    if (mediaIndex !== null && photoUrls.length === 0) setMediaIndex(null)
  }, [mediaIndex, photoUrls.length])

  const handleLike = () => {
    const becameActive = toggleReaction(target, 'fire')
    playClick(soundEnabled)
    setLikeAnim('pressed')
    setTimeout(() => setLikeAnim('idle'), 400)
    if (becameActive) onNotify?.('🔥 Priday зажжён!')
  }

  const handlePinTopFact = () => {
    const firstPride = day.prides.find((p) => p.text && p.text !== '—')
    const fact = firstPride?.text || day.title
    if (fact) {
      onPinToVault?.(fact)
      playClick(soundEnabled)
    }
  }

  if (day.status === 'missed') {
    return (
      <article
        className="border-b border-zinc-200 dark:border-zinc-800/80 px-4 py-4 hover:bg-white/[0.02] transition-colors duration-150"
        id={`day-card-${day.id}`}
      >
        <div className="flex gap-3">
          <div
            className="w-10 h-10 rounded-full flex-none flex items-center justify-center text-zinc-400 bg-zinc-100 dark:bg-zinc-800 text-base"
            aria-hidden="true"
          >
            ✦
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <strong className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">Льготный мост</strong>
              <span className="text-zinc-500 dark:text-zinc-400 text-[14px]">· День #{day.id}</span>
            </div>
            <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
              <ShieldAlert size={12} /> Grace Period
            </span>
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 italic mt-1.5 leading-relaxed">
              В этот день записей не было, но стрик пути в Priday сохранён.
            </p>
          </div>
        </div>
      </article>
    )
  }

  const averageScore = useMemo(() => {
    const valid = (day.prides || []).filter(
      (p) => {
        const sc = typeof p.score === 'number' ? p.score : p.scale
        return typeof sc === 'number' && !isNaN(sc) && sc > 0 && p.text !== '—'
      }
    )
    if (valid.length > 0) {
      const sum = valid.reduce((acc, p) => acc + (typeof p.score === 'number' ? p.score : (p.scale || 0)), 0)
      return Number((sum / valid.length).toFixed(1))
    }
    if (typeof day.score === 'number' && !isNaN(day.score) && day.score > 0) {
      return Number(day.score.toFixed(1))
    }
    if (typeof day.aiScore === 'number' && !isNaN(day.aiScore) && day.aiScore > 0) {
      return Number(day.aiScore.toFixed(1))
    }
    return null
  }, [day.score, day.aiScore, day.prides])

  const dateStr = day.dateISO
    ? new Date(day.dateISO).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    : 'сегодня'

  const photoCaption = useMemo(() => {
    const targets = day.attached_targets || (day as any).attachedTargets
    return formatPhotoAttachmentCaption(targets, day.prides, day.gratitudes)
  }, [day.attached_targets, (day as any).attachedTargets, day.prides, day.gratitudes])

  return (
    <>
      <article
        className={`border-b border-[var(--line)] px-4 py-4 transition-all duration-500 ${
          isHighlighted
            ? 'ring-2 ring-inset ring-[#ff5a1f]/80 bg-[#ff5a1f]/[0.06] shadow-[0_0_28px_rgba(255,90,31,0.22)]'
            : 'hover:bg-white/[0.02]'
        }`}
        id={`day-card-${day.id}`}
        data-day-number={day.id}
        data-day-author={postAuthorId || ''}
      >
        <div className="flex gap-3">
          {/* Avatar with unified component */}
          <div className="flex-none pt-0.5">
            <UserAvatar
              avatarUrl={effectiveAvatarSrc}
              avatarColor={authorColor}
              displayName={displayName}
              username={username}
              initials={initials}
              size={40}
              onClick={handleNavigateAuthor}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header row: Name, handle, date, Day badge, score, options */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <button
                  type="button"
                  onClick={handleNavigateAuthor}
                  className="font-bold text-[15px] text-[var(--text)] tracking-tight hover:underline text-left cursor-pointer"
                >
                  {displayName}
                </button>
                {isAuthorVerified && <VerifiedBadge size="sm" />}
                {isOwner && dayVisibility !== 'public' && (
                  <span title={dayVisibility === 'private' ? 'Личный день' : dayVisibility === 'friends' ? 'Только для друзей' : 'Для группы'} className="text-[var(--muted)] flex-none" aria-label="Приватность">
                    <Lock size={13} />
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleNavigateAuthor}
                  className="text-[13px] text-[var(--muted)] font-normal hover:underline cursor-pointer"
                >
                  @{username} · {dateStr}
                </button>
                {averageScore !== null && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[13px] text-amber-400 font-bold bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full"
                    title={`Балл дня: ${Number(day.score ?? averageScore).toFixed(1)}/10`}
                  >
                    ★ {Number(day.score ?? averageScore).toFixed(1)}
                  </span>
                )}
                <span
                  className="text-[12px] px-2 py-0.5 rounded-full font-bold bg-[var(--accent-soft)] text-[var(--text)] dark:text-[var(--accent)]"
                >
                  День #{day.id}
                </span>
                {dayVisibility === 'group' && resolvedGroupName && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[#ff5a1f]/15 text-[#ff8a5c] border border-[#ff5a1f]/35"
                    title={`Аудитория: группа «${resolvedGroupName}»`}
                  >
                    👥 {resolvedGroupName}
                  </span>
                )}
              </div>

              {isOwner && (
                <div className="flex items-center gap-1 flex-none">
                  <IconButton
                    icon={<MoreHorizontal size={18} />}
                    label="Опции дня"
                    size="sm"
                    data-testid="day-options-btn"
                    onClick={() => setOptionsModalOpen(true)}
                  />
                </div>
              )}
            </div>

            {/* Post body — ТЕКСТ ПОСТОВ */}
            <div className="flex items-start justify-between gap-3 mt-1 mb-2">
              <p className="text-[15px] leading-relaxed text-[var(--text)] flex-1">
                {firstPride?.text || day.title}
              </p>
              <div className="flex items-center gap-2 flex-none">
                {firstPride && ((typeof firstPride.score === 'number' && firstPride.score > 0) || (typeof firstPride.scale === 'number' && firstPride.scale > 0)) && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 bg-black/60 border border-[#2f3336] text-[#e7e9ea]">
                    {Number(firstPride.score ?? firstPride.scale).toFixed(1)}★
                  </span>
                )}
                {isOwner && firstPride && (() => {
                  const effectiveVisibility = day.visibility === 'private' ? 'private' : (firstPride.visibility || day.visibility || 'public')
                  const isPub = effectiveVisibility === 'public'
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        playClick(soundEnabled)
                        const actualFirstIdx = (day.prides || []).indexOf(firstPride)
                        const nextVis = isPub ? 'private' : 'public'
                        setPrideVisibility(day.id, actualFirstIdx >= 0 ? actualFirstIdx : 0, nextVis)
                        onNotify?.(nextVis === 'public' ? 'Гордость #1 видна всем 🌐' : 'Гордость #1 скрыта (только себе) 🔒')
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border flex-none transition-all ${
                        isPub
                          ? 'text-sky-400 bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/20'
                          : 'text-zinc-400 bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700'
                      }`}
                      title={
                        isPub
                          ? '🌐 Публично (видят все) — нажми для переключения'
                          : '🔒 Лично (видит только автор) — нажми для переключения'
                      }
                      aria-label="Видимость гордости"
                    >
                      {isPub ? (
                        <>
                          <Globe size={11} className="text-sky-400" />
                          <span>Публично</span>
                        </>
                      ) : (
                        <>
                          <Lock size={11} className="text-zinc-400" />
                          <span>Лично</span>
                        </>
                      )}
                    </button>
                  )
                })()}
              </div>
            </div>

            {/* Toggle «ещё N гордостей · M благодарностей» */}
            {(otherPrides.length > 0 || otherGratitudes.length > 0) && (
              <div className="mb-3">
                {!expandedDetails ? (
                  <button
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      setExpandedDetails(true)
                    }}
                    className="text-[13px] font-normal text-[var(--muted)] hover:text-[var(--text)] hover:underline flex items-center gap-1.5 py-1 min-h-[32px] transition-colors"
                  >
                    <span>
                      {otherPrides.length > 0 && `ещё ${otherPrides.length} гордост${otherPrides.length === 1 ? 'ь' : otherPrides.length < 5 ? 'и' : 'ей'}`}
                      {otherPrides.length > 0 && otherGratitudes.length > 0 && ' · '}
                      {otherGratitudes.length > 0 && `${otherGratitudes.length} благодарност${otherGratitudes.length === 1 ? 'ь' : otherGratitudes.length < 5 ? 'и' : 'ей'}`}
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[var(--line)]">
                    {otherPrides.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-bold text-[var(--accent)] flex items-center gap-1">
                          <Flame size={13} /> Другие гордости дня:
                        </span>
                        {otherPrides.map((p, pIdx) => {
                          const actualIndex = (day.prides || []).indexOf(p)
                          const effectiveVisibility = day.visibility === 'private' ? 'private' : (p.visibility || day.visibility || 'public')
                          const isPub = effectiveVisibility === 'public'
                          return (
                            <div key={p.num || pIdx} className="flex items-start gap-2 text-[15px] leading-6 font-normal text-[var(--text)] py-1">
                              <span className="font-mono text-[var(--muted)] text-[13px] font-normal w-4 text-right flex-none pt-0.5">
                                {p.num || pIdx + 2}
                              </span>
                              <span className="flex-1 break-words text-[15px] leading-6 font-normal text-[var(--text)]">{p.text}</span>
                              {((typeof p.score === 'number' && p.score > 0) || (typeof p.scale === 'number' && p.scale > 0)) && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 bg-black/60 border border-[#2f3336] text-[#e7e9ea]">
                                  {Number(p.score ?? p.scale).toFixed(1)}★
                                </span>
                              )}
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playClick(soundEnabled)
                                    const nextVis = isPub ? 'private' : 'public'
                                    setPrideVisibility(day.id, actualIndex >= 0 ? actualIndex : pIdx + 1, nextVis)
                                    onNotify?.(`Гордость #${p.num || pIdx + 2}: ${nextVis === 'public' ? 'Публично 🌐' : 'Лично 🔒'}`)
                                  }}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border flex-none transition-all ${
                                    isPub
                                      ? 'text-sky-400 bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/20'
                                      : 'text-zinc-400 bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700'
                                  }`}
                                  title={
                                    isPub
                                      ? '🌐 Публично (видят все) — нажми для переключения'
                                      : '🔒 Лично (видит только автор) — нажми для переключения'
                                  }
                                  aria-label="Видимость гордости"
                                >
                                  {isPub ? (
                                    <>
                                      <Globe size={10} className="text-sky-400" />
                                      <span>Публично</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock size={10} className="text-zinc-400" />
                                      <span>Лично</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {otherGratitudes.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-2">
                        <span className="text-[13px] font-bold text-rose-500 flex items-center gap-1">
                          <Heart size={13} /> Благодарности дня:
                        </span>
                        {otherGratitudes.map((g, gIdx) => {
                          const text = typeof g === 'string' ? g : g.text
                          return (
                            <div key={gIdx} className="flex items-start gap-2 text-[15px] leading-6 font-normal text-[var(--text)] py-0.5">
                              <span className="font-mono text-[var(--muted)] text-[13px] font-normal w-4 text-right flex-none pt-0.5">
                                {gIdx + 1}
                              </span>
                              <span className="flex-1 break-words text-[15px] leading-6 font-normal text-[var(--text)]">{text}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        playClick(soundEnabled)
                        setExpandedDetails(false)
                      }}
                      className="text-[13px] font-medium text-[var(--accent)] hover:underline self-start pt-1 min-h-[32px]"
                    >
                      Свернуть ↑
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Photos */}
            {photoUrls.length > 0 && (
              <div className="mt-3 mb-3.5">
                <div
                  className={`overflow-hidden rounded-2xl border border-[var(--line)] ${
                    photoUrls.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'
                  }`}
                >
                  {photoUrls.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setMediaIndex(i)}
                      className="block w-full focus:outline-none"
                      aria-label={`Открыть фото ${i + 1}`}
                    >
                      <img
                        src={url}
                        alt="Фото дня"
                        loading="lazy"
                        className="w-full max-h-[380px] object-cover"
                      />
                    </button>
                  ))}
                </div>
                {photoCaption && (
                  <div className="mt-1.5 px-1 text-xs text-[var(--muted)] font-medium">
                    <span>{photoCaption}</span>
                  </div>
                )}
              </div>
            )}

            {/* Действия с публикацией: 5 кнопок владельцу, строго 3 кнопки зрителю (💬, 🔥, ↗) */}
            <div
              className={`flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--line)] ${
                isOwner ? 'max-w-[460px]' : 'max-w-[300px]'
              }`}
              role="group"
              aria-label="Действия с публикацией"
            >
              {/* 1. Комментарии */}
              <IconButton
                icon={<MessageCircle size={18} />}
                label="Ответить"
                tooltip="Комментарии"
                count={commentsCount > 0 ? commentsCount : ''}
                active={showComments}
                variant="blue"
                onClick={() => setShowComments((prev) => !prev)}
              />

              {/* 2. В копилку (только автору) */}
              {isOwner && (
                <IconButton
                  icon={<BookmarkPlus size={18} />}
                  label="В копилку"
                  tooltip="В копилку"
                  variant="default"
                  onClick={handlePinTopFact}
                />
              )}

              {/* 3. 🔥 Огонёк */}
              <IconButton
                icon={<Flame size={18} className={liked ? 'fill-[var(--accent)] text-[var(--accent)]' : ''} />}
                label={liked ? 'Убрать огонь' : 'Огонь'}
                tooltip={liked ? 'Убрать огонь' : 'Зажечь огонь'}
                count={fireCount > 0 ? fireCount : ''}
                active={liked}
                variant="accent"
                onClick={handleLike}
              />

              {/* 4. ↗ Поделиться */}
              <IconButton
                icon={<Share2 size={18} />}
                label="Поделиться"
                tooltip="Поделиться"
                variant="default"
                onClick={() => setShareModalOpen(true)}
              />

              {/* 5. ⋯ Ещё (только автору) */}
              {isOwner && (
                <IconButton
                  icon={<MoreHorizontal size={18} />}
                  label="Ещё"
                  tooltip="Ещё"
                  variant="default"
                  onClick={() => setOptionsModalOpen(true)}
                />
              )}
            </div>

            {/* Раскрывающийся в 1 клик блок комментариев */}
            {showComments && (
              <div className="mt-2.5">
                <CommentsThread
                  target={commentsTarget}
                  postAuthorId={postAuthorId}
                  variant="day"
                  soundEnabled={soundEnabled}
                  onNotify={onNotify}
                />
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Меню «⋯» опций дня — строго только владельцу поста */}
      {isOwner && (
        <DayOptionsModal
          isOpen={optionsModalOpen}
          day={day}
          onClose={() => setOptionsModalOpen(false)}
          onEdit={onEdit}
          onShare={() => setShareModalOpen(true)}
          onAiEvaluate={handleAiEvaluateDay}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}

      {shareModalOpen && (
        <ShareCardModal
          day={day}
          authorMeta={{
            name: displayName,
            username,
            avatarUrl: effectiveAvatarSrc,
            avatarColor: authorColor,
            verified: isAuthorVerified,
          }}
          onClose={() => setShareModalOpen(false)}
          onNotify={(msg) => onNotify?.(msg)}
        />
      )}

      {forwardPride && (
        <ForwardToChatModal
          attachment={forwardPride}
          initialNote={`Гордость дня #${day.id} 🔥`}
          onClose={() => setForwardPride(null)}
          onNotify={(msg) => onNotify?.(msg)}
          soundEnabled={soundEnabled}
        />
      )}

      {storyPrideIndex !== null &&
        typeof document !== 'undefined' &&
        createPortal(
          <PublishPrideStoryModal
            prideText={day.prides[storyPrideIndex]?.text ?? ''}
            prideIndex={storyPrideIndex}
            scale={day.prides[storyPrideIndex]?.scale}
            dayId={day.id}
            dayLabel={dateStr}
            displayName={state.profile.displayName}
            username={state.profile.username}
            avatarColor={state.profile.avatarColor}
            avatarSrc={myAvatarSrc}
            verified={state.profile.verified}
            defaultVisibility={normalizeVisibility(
              day.prides[storyPrideIndex]?.visibility ?? dayVisibility
            )}
            onPublish={postMyStory}
            onClose={() => setStoryPrideIndex(null)}
            onNotify={(msg) => onNotify?.(msg)}
            soundEnabled={soundEnabled}
          />,
          document.body
        )}

      {mediaIndex !== null && (
        <MediaLightbox
          photos={photoUrls}
          prides={day.prides}
          gratitudes={day.gratitudes}
          attachedTargets={day.attached_targets || (day as any).attachedTargets}
          initialIndex={mediaIndex}
          onClose={() => setMediaIndex(null)}
          title={`День #${day.id} · ${dateStr}`}
        />
      )}
    </>
  )
}

import { areDayCardPropsEqual } from '@/lib/ogonek/feed-memo'
export { areDayCardPropsEqual }

export const DayCard = memo(DayCardComponent, areDayCardPropsEqual)

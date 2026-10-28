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
import { buildGratitudeAttachment, buildPrideAttachment } from '@/lib/ogonek/messenger'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { getInitials } from '@/lib/ogonek/initials'
import { normalizeVisibility, visibilityMeta } from '@/lib/ogonek/visibility'
import type { ChatAttachment, Day } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import dynamic from 'next/dynamic'
import { IconButton } from './ui'
import { DayOptionsModal } from './day-options-modal'
import { DayEntries } from './day-entries'
import { CommentsThread } from './comments-thread'
import { ReactionBar } from './reaction-bar'
import { Tooltip } from './tooltip'
import { VisibilitySwitcher } from './visibility-switcher'

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
  soundEnabled?: boolean
}

function DayCardComponent({
  day,
  onLightbox,
  onNotify,
  onPinToVault,
  onEdit,
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
  } = useOgonekStore()

  const target = dayTarget(day.id)
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

  const rawAvatar =
    currentUser?.avatarImage ||
    (currentUser as any)?.avatar_image ||
    (currentUser as any)?.avatar_url ||
    state.profile.avatarImage ||
    (state.profile as any)?.avatar ||
    (state.profile as any)?.avatar_url

  const myAvatarSrc = usePhotoUrl(rawAvatar)
  const effectiveAvatarSrc =
    myAvatarSrc ||
    (rawAvatar &&
    (rawAvatar.startsWith('http://') ||
      rawAvatar.startsWith('https://') ||
      rawAvatar.startsWith('data:') ||
      rawAvatar.startsWith('blob:'))
      ? rawAvatar
      : null)

  const displayName = state.profile?.displayName || currentUser?.displayName || 'Alexei Cerna'
  const username = state.profile?.username || currentUser?.username || 'cernavation'
  const initials = getInitials(displayName, username)

  const firstPride = useMemo(() => {
    return day.prides?.find((p) => p.text && p.text !== '—')
  }, [day.prides])

  const otherPrides = useMemo(() => {
    return (day.prides || []).filter((p) => p !== firstPride && p.text && p.text !== '—')
  }, [day.prides, firstPride])

  const otherGratitudes = useMemo(() => {
    return (day.gratitudes || []).filter((g) => {
      const t = typeof g === 'string' ? g : g.text
      return t && t !== '—'
    })
  }, [day.gratitudes])

  const handleAiEvaluateDay = async () => {
    setOptionsModalOpen(false)
    const itemsToEval = (day.prides || []).map((p) => p.text).filter((t) => t && t !== '—')
    if (itemsToEval.length === 0) {
      onNotify?.('Нет записей для оценки')
      return
    }
    onNotify?.('ИИ оценивает день...')
    try {
      const res = await fetch('/api/ai/evaluate-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'pride', items: itemsToEval, dayId: day.id }),
      })
      const data = await res.json()
      if (res.ok && data.evaluations) {
        data.evaluations.forEach((ev: { index: number; score: number }) => {
          if (typeof ev.score === 'number') {
            ratePride(day.id, ev.index, ev.score)
          }
        })
        onNotify?.('ИИ оценил день!')
      } else {
        onNotify?.('Оценка сохранена')
      }
    } catch {
      onNotify?.('Оценка сохранена')
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
    if (becameActive) onNotify?.('🔥 Огонёк зажжён!')
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
        className="border-b border-zinc-200 dark:border-zinc-800/80 px-4 py-4"
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
              В этот день записей не было, но огонёк пути сохранён.
            </p>
          </div>
        </div>
      </article>
    )
  }

  const averageScore = useMemo(() => {
    const valid = (day.prides || []).filter(
      (p) => typeof p.scale === 'number' && !isNaN(p.scale) && p.scale > 0 && p.text !== '—'
    )
    if (valid.length === 0) return null
    const sum = valid.reduce((acc, p) => acc + p.scale, 0)
    return Math.round((sum / valid.length) * 10) / 10
  }, [day.prides])

  const dateStr = day.dateISO
    ? new Date(day.dateISO).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    : 'сегодня'

  return (
    <>
      <article
        className="border-b border-[var(--border)] px-4 py-4"
        id={`day-card-${day.id}`}
      >
        <div className="flex gap-3">
          {/* Avatar with gradient ring */}
          <div className="flex-none pt-0.5">
            {effectiveAvatarSrc ? (
              <img
                src={effectiveAvatarSrc}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover shadow-sm border border-[var(--border)]"
              />
            ) : (
              <div
                className="avatar w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm select-none text-white shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, #FF6A1A 0%, #FF8533 50%, #2F3336 100%)',
                }}
                aria-hidden="true"
              >
                {initials}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header row: Name, handle, date, Day badge, score, options */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="font-bold text-[15px] text-[var(--text)] tracking-tight">
                  {displayName}
                </span>
                <span
                  className="inline-flex items-center justify-center rounded-full text-white flex-none"
                  style={{ background: '#1d9bf0', width: 16, height: 16 }}
                  title="Верифицирован"
                  aria-label="Верифицирован"
                >
                  <Check size={10} strokeWidth={3} />
                </span>
                {dayVisibility !== 'public' && (
                  <span title={dayVisibility === 'private' ? 'Личный день' : 'Только для друзей'} className="text-[var(--text-2)] flex-none" aria-label="Приватность">
                    <Lock size={13} />
                  </span>
                )}
                <span className="text-[13px] text-[var(--text-2)]">
                  @{username} · {dateStr}
                </span>
                {averageScore !== null && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[13px] font-bold text-amber-500"
                    title={`Средний балл дня: ${averageScore.toFixed(1)}/10`}
                  >
                    ★ {averageScore.toFixed(1)}
                  </span>
                )}
                <span
                  className="text-[12px] px-2 py-0.5 rounded-full font-bold bg-[var(--accent-soft)] text-[var(--text)] dark:text-[var(--accent)]"
                >
                  День #{day.id}
                </span>
              </div>

              <div className="flex items-center gap-1 flex-none">
                <IconButton
                  icon={<MoreHorizontal size={18} />}
                  label="Опции дня"
                  size="sm"
                  onClick={() => setOptionsModalOpen(true)}
                />
              </div>
            </div>

            {/* Post body — ТЕКСТ КРУПНО (X.com standard) */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[17px] leading-[24px] text-[var(--text)] font-normal flex-1">
                {firstPride?.text || day.title}
              </p>
              {firstPride && (() => {
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
                    className="text-[13px] font-medium text-[var(--text-2)] hover:text-[var(--text)] hover:underline flex items-center gap-1.5 py-1 min-h-[32px] transition-colors"
                  >
                    <span>
                      {otherPrides.length > 0 && `ещё ${otherPrides.length} гордост${otherPrides.length === 1 ? 'ь' : otherPrides.length < 5 ? 'и' : 'ей'}`}
                      {otherPrides.length > 0 && otherGratitudes.length > 0 && ' · '}
                      {otherGratitudes.length > 0 && `${otherGratitudes.length} благодарност${otherGratitudes.length === 1 ? 'ь' : otherGratitudes.length < 5 ? 'и' : 'ей'}`}
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
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
                            <div key={p.num || pIdx} className="flex items-start gap-2 text-[14px] text-[var(--text)] py-1">
                              <span className="font-mono text-[var(--text-2)] text-[13px] w-4 text-right flex-none pt-0.5">
                                {p.num || pIdx + 2}
                              </span>
                              <span className="flex-1 break-words leading-relaxed">{p.text}</span>
                              {typeof p.scale === 'number' && p.scale > 0 && (
                                <span className="text-[12px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full flex-none">
                                  {p.scale}★
                                </span>
                              )}
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
                            <div key={gIdx} className="flex items-start gap-2 text-[14px] text-[var(--text)] py-0.5">
                              <span className="font-mono text-[var(--text-2)] text-[13px] w-4 text-right flex-none pt-0.5">
                                {gIdx + 1}
                              </span>
                              <span className="flex-1 break-words leading-relaxed">{text}</span>
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
              <div
                className={`mt-3 overflow-hidden rounded-2xl border border-[var(--border)] ${
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
            )}

            {/* 5 канонических IconButton в футере поста (X.com standard: Ответить, В копилку, Огонёк, Поделиться, Ещё) */}
            <div
              className="flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--border)] max-w-[460px]"
              role="group"
              aria-label="Действия с публикацией"
            >
              {/* 1. Ответить */}
              <IconButton
                icon={<MessageCircle size={18} />}
                label="Ответить"
                tooltip="Ответить"
                count={state.comments?.[target]?.length || ''}
                active={showComments}
                variant="blue"
                onClick={() => setShowComments((prev) => !prev)}
              />

              {/* 2. В копилку */}
              <IconButton
                icon={<BookmarkPlus size={18} />}
                label="В копилку"
                tooltip="В копилку"
                variant="default"
                onClick={handlePinTopFact}
              />

              {/* 3. 🔥 Огонёк */}
              <IconButton
                icon={<Flame size={18} className={liked ? 'fill-[var(--accent)] text-[var(--accent)]' : ''} />}
                label={liked ? 'Снять огонёк' : 'Огонёк'}
                tooltip={liked ? 'Снять огонёк' : 'Огонёк'}
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

              {/* 5. ⋯ Ещё */}
              <IconButton
                icon={<MoreHorizontal size={18} />}
                label="Ещё"
                tooltip="Ещё"
                variant="default"
                onClick={() => setOptionsModalOpen(true)}
              />
            </div>

            {/* Раскрывающийся блок комментариев */}
            {showComments && (
              <div className="pt-3 mt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <CommentsThread
                  target={target}
                  variant="day"
                  soundEnabled={soundEnabled}
                  onNotify={onNotify}
                />
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Меню «⋯» опций дня */}
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

      {shareModalOpen && (
        <ShareCardModal
          day={day}
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
          initialIndex={mediaIndex}
          onClose={() => setMediaIndex(null)}
          title={`День #${day.id} · ${dateStr}`}
        />
      )}
    </>
  )
}

export const DayCard = memo(DayCardComponent)

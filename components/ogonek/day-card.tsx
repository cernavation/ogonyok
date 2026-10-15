'use client'

import { Activity, Flame, Heart, MoreHorizontal, Pencil, ShieldAlert, Shield } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { playClick } from '@/lib/ogonek/sound'
import { resolvePhotoUrl } from '@/lib/ogonek/photos'
import { dayTarget } from '@/lib/ogonek/reactions'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { normalizeVisibility, visibilityMeta } from '@/lib/ogonek/visibility'
import type { Day } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import dynamic from 'next/dynamic'
import { DayEntries } from './day-entries'
import { CommentsThread } from './comments-thread'
import { PublishPrideStoryModal } from './publish-pride-story-modal'
import { ReactionBar } from './reaction-bar'
import { Tooltip } from './tooltip'
import { VisibilitySwitcher } from './visibility-switcher'

const ShareCardModal = dynamic(
  () => import('./share-card-modal').then((m) => m.ShareCardModal),
  { ssr: false }
)

// ── Spring animation variants ──────────────────────────────────────────────
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

export function DayCard({
  day,
  onLightbox,
  onNotify,
  onPinToVault,
  onEdit,
  soundEnabled = true,
}: Props) {
  // Живые реакции хранятся в общем store Огонька
  const {
    state,
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
  const thanked = myReactionIds.includes('heart')
  const fireCount = reactionCounts.fire ?? 0
  const heartCount = reactionCounts.heart ?? 0
  const [likeAnim, setLikeAnim] = useState<'idle' | 'pressed'>('idle')
  const [thankAnim, setThankAnim] = useState<'idle' | 'pressed'>('idle')
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [storyPrideIndex, setStoryPrideIndex] = useState<number | null>(null)
  const reduce = useReducedMotion()

  // ЭТАП 9 — приватность дня и аватар для публикации в Сторис
  const dayVisibility = normalizeVisibility(day.visibility)
  const myAvatarSrc = usePhotoUrl(state.profile.avatarImage)

  const rawPhotos = Array.isArray(day.photos) ? day.photos.filter((p): p is string => Boolean(p)) : []

  // Resolve photo IDs (IndexedDB) → displayable URLs
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.photos])

  const handleLike = () => {
    const becameActive = toggleReaction(target, 'fire')
    playClick(soundEnabled)
    setLikeAnim('pressed')
    setTimeout(() => setLikeAnim('idle'), 400)
    if (becameActive) onNotify?.('🔥 Огонёк зажжён!')
  }

  const handleThank = () => {
    const becameActive = toggleReaction(target, 'heart')
    playClick(soundEnabled)
    setThankAnim('pressed')
    setTimeout(() => setThankAnim('idle'), 400)
    onNotify?.(becameActive ? '❤️ Благодарность отправлена!' : 'Благодарность снята')
  }

  // Handle missed days
  if (day.status === 'missed') {
    return (
      <article
        className="border-b border-[#2f3336] px-4 py-4 hover:bg-white/[0.02] transition-colors duration-150"
        id={`day-card-${day.id}`}
      >
        <div className="flex gap-3">
          <div
            className="w-10 h-10 rounded-full flex-none flex items-center justify-center text-[#71767b] bg-[#1c1e22] text-base"
            aria-hidden="true"
          >
            ✦
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <strong className="text-[15px] font-bold text-[#e7e9ea] tracking-[-0.015em]">Льготный мост</strong>
              <span className="text-[#71767b] text-[14px]">· День #{day.id}</span>
            </div>
            <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
              <ShieldAlert size={12} /> Grace Period
            </span>
            <p className="text-[14px] text-[#71767b] italic mt-2 leading-[1.45]">
              В этот день записей не было, но огонёк непрерывного пути сохранён льготным периодом (3 дня допуска).
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

  const scoreBadgeClass = useMemo(() => {
    if (averageScore === null) return 'score-none'
    if (averageScore >= 9.0) return 'score-green'
    if (averageScore >= 7.0) return 'score-yellow'
    return 'score-red'
  }, [averageScore])

  const dateStr = day.dateISO
    ? new Date(day.dateISO).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'сегодня'

  return (
    <>
      <article
        className="border-b border-[#2f3336] hover:bg-white/[0.02] transition-colors duration-150 px-4 py-4"
        id={`day-card-${day.id}`}
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 280px' }}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-none">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm select-none"
              style={{
                background: 'linear-gradient(145deg, #7f95a3 0%, #7f95a3 35%, #d9ae8b 36%, #d9ae8b 66%, #29384b 67%)',
                color: '#fff',
                textShadow: '0 1px 2px #000',
              }}
              aria-hidden="true"
            >
              AC
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1 flex-wrap min-w-0">
                <span className="font-bold text-[15px] text-[#e7e9ea] tracking-[-0.015em]">
                  Alexei Cerna
                </span>
                {/* Blue verified badge */}
                <span
                  className="inline-grid place-items-center rounded-full text-white flex-none"
                  style={{ background: '#1d9bf0', width: 16, height: 16, fontSize: 9, fontWeight: 900 }}
                  title="Верифицирован"
                  aria-label="Верифицирован"
                >
                  ✓
                </span>
                <span className="text-[12px] leading-[16px] text-[#71767b] tracking-[-0.01em]">
                  @cernavation · {dateStr}
                </span>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: '#2b1d16', color: '#ffad5a' }}
                >
                  День #{day.id}
                </span>
              </div>

              {/* Score badge + action buttons */}
              <div className="flex items-center gap-0.5 flex-none">
                {averageScore !== null && (
                  <div
                    className={`score-badge ${scoreBadgeClass}`}
                    title={`Средний балл дня: ${averageScore.toFixed(1)}/10`}
                    style={{ minWidth: 42, height: 36, fontSize: 15, borderRadius: 9999, padding: '0 10px' }}
                  >
                    {averageScore.toFixed(1)}
                  </div>
                )}
                <Tooltip content="Редактировать день" side="left">
                  <button
                    type="button"
                    className="p-2 rounded-full text-[#71767b] hover:text-[#ff6b35] hover:bg-[#ff6b35]/10 transition-colors duration-150"
                    aria-label="Редактировать день"
                    onClick={() => onEdit?.(day)}
                  >
                    <Pencil size={15} />
                  </button>
                </Tooltip>
                <Tooltip content="Опции дня" side="left">
                  <button
                    type="button"
                    className="p-2 rounded-full text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/[0.08] transition-colors duration-150"
                    aria-label="Опции публикации"
                    onClick={() => setShareModalOpen(true)}
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Post body */}
            <p className="text-[15px] leading-[23px] text-[#e7e9ea] tracking-[-0.015em] mb-3">
              {day.title}
            </p>

            {/* ЭТАП 9 — приватность всего дня */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#2f3336] bg-white/[0.02] px-3 py-2">
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#e7e9ea]">
                <Shield size={13} className="text-[#ff8a50]" /> Приватность дня
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: visibilityMeta(dayVisibility).color }}
                >
                  · {visibilityMeta(dayVisibility).shortLabel}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <VisibilitySwitcher
                  value={dayVisibility}
                  onChange={(level) => {
                    setDayVisibility(day.id, level)
                    onNotify?.(`Приватность дня: ${visibilityMeta(level).shortLabel}`)
                  }}
                  soundEnabled={soundEnabled}
                />
                <Tooltip content="Применить приватность дня ко всем гордостям" side="top">
                  <button
                    type="button"
                    className="rounded-full border border-[#2f3336] px-2.5 py-1 text-[11px] font-bold text-[#71767b] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#e7e9ea]"
                    onClick={() => {
                      playClick(soundEnabled)
                      setAllPridesVisibility(day.id, dayVisibility)
                      onNotify?.('Приватность дня применена ко всем гордостям')
                    }}
                  >
                    Применить ко всем
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Entries tabs */}
            <DayEntries
              prides={day.prides}
              gratitudes={day.gratitudes}
              dayId={day.id}
              soundEnabled={soundEnabled}
              onPinToVault={onPinToVault}
              onNotify={onNotify}
              dayVisibility={dayVisibility}
              onSetPrideVisibility={(index, level) => {
                setPrideVisibility(day.id, index, level)
                onNotify?.(`Гордость #${index + 1}: ${visibilityMeta(level).shortLabel}`)
              }}
              onPublishPrideStory={(index) => setStoryPrideIndex(index)}
            />

            {/* Media — X.com style */}
            {photoUrls.length > 0 && (
              <div
                className={`mt-3 overflow-hidden rounded-2xl border border-[#2f3336] ${
                  photoUrls.length === 1
                    ? ''
                    : photoUrls.length === 2
                      ? 'grid grid-cols-2 gap-0.5'
                      : 'grid grid-cols-2 gap-0.5'
                }`}
              >
                {photoUrls.length === 1 && (
                  <button
                    type="button"
                    onClick={() => onLightbox(photoUrls[0])}
                    className="block w-full focus:outline-none"
                    aria-label="Открыть фото дня"
                  >
                    <img
                      src={photoUrls[0]}
                      alt="Фото дня"
                      loading="lazy"
                      className="w-full max-h-[500px] object-cover rounded-2xl"
                    />
                  </button>
                )}
                {photoUrls.length === 2 && (
                  <>
                    <button
                      type="button"
                      onClick={() => onLightbox(photoUrls[0])}
                      className="block focus:outline-none overflow-hidden rounded-l-2xl"
                      aria-label="Открыть первое фото дня"
                    >
                      <img
                        src={photoUrls[0]}
                        alt="Фото дня 1"
                        loading="lazy"
                        className="w-full h-[240px] object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onLightbox(photoUrls[1])}
                      className="block focus:outline-none overflow-hidden rounded-r-2xl"
                      aria-label="Открыть второе фото дня"
                    >
                      <img
                        src={photoUrls[1]}
                        alt="Фото дня 2"
                        loading="lazy"
                        className="w-full h-[240px] object-cover"
                      />
                    </button>
                  </>
                )}
                {photoUrls.length >= 3 && (
                  <>
                    <button
                      type="button"
                      onClick={() => onLightbox(photoUrls[0])}
                      className="block focus:outline-none overflow-hidden rounded-tl-2xl rounded-bl-2xl row-span-2"
                      aria-label="Открыть первое фото дня"
                    >
                      <img
                        src={photoUrls[0]}
                        alt="Фото дня 1"
                        loading="lazy"
                        className="w-full h-[240px] object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onLightbox(photoUrls[1])}
                      className="block focus:outline-none overflow-hidden rounded-tr-2xl"
                      aria-label="Открыть второе фото дня"
                    >
                      <img
                        src={photoUrls[1]}
                        alt="Фото дня 2"
                        loading="lazy"
                        className="w-full h-[118px] object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onLightbox(photoUrls[2])}
                      className="block focus:outline-none overflow-hidden rounded-br-2xl"
                      aria-label="Открыть третье фото дня"
                    >
                      <img
                        src={photoUrls[2]}
                        alt="Фото дня 3"
                        loading="lazy"
                        className="w-full h-[118px] object-cover"
                      />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* X.com canonical 4-action bar */}
            <div className="flex items-center justify-between pt-2 -mx-2">
              {/* Огонёк 🔥 */}
              <Tooltip content="Зажечь огонёк" side="top">
                <motion.button
                  type="button"
                  onClick={handleLike}
                  aria-label={liked ? 'Убрать отметку огня' : 'Поставить огонь'}
                  className={`flex items-center gap-1.5 text-[13px] px-2 py-1.5 rounded-full transition-colors duration-150 ${
                    liked
                      ? 'text-[#ff6b35]'
                      : 'text-[#71767b] hover:text-[#ff6b35] hover:bg-[#ff6b35]/10'
                  }`}
                  animate={reduce ? undefined : likeAnim}
                  variants={reactionVariants}
                  transition={{ duration: 0.35, times: [0, 0.2, 0.6, 1] }}
                >
                  <Flame size={18} fill={liked ? 'currentColor' : 'none'} />
                  <span>{fireCount}</span>
                </motion.button>
              </Tooltip>

              {/* Спасибо ❤️ */}
              <Tooltip content="Поблагодарить" side="top">
                <motion.button
                  type="button"
                  onClick={handleThank}
                  aria-label="Поблагодарить"
                  className={`flex items-center gap-1.5 text-[13px] px-2 py-1.5 rounded-full transition-colors duration-150 ${
                    thanked
                      ? 'text-[#f91880]'
                      : 'text-[#71767b] hover:text-[#f91880] hover:bg-[#f91880]/10'
                  }`}
                  animate={reduce ? undefined : thankAnim}
                  variants={reactionVariants}
                  transition={{ duration: 0.35, times: [0, 0.2, 0.6, 1] }}
                >
                  <Heart size={18} fill={thanked ? 'currentColor' : 'none'} />
                  <span>Спасибо{heartCount > 0 ? ` · ${heartCount}` : ''}</span>
                </motion.button>
              </Tooltip>

              {/* Редактировать ✏️ */}
              <Tooltip content="Редактировать день" side="top">
                <button
                  type="button"
                  onClick={() => onEdit?.(day)}
                  aria-label="Редактировать день"
                  className="flex items-center gap-1.5 text-[13px] px-2 py-1.5 rounded-full text-[#71767b] hover:text-[#ff6b35] hover:bg-[#ff6b35]/10 transition-colors duration-150"
                >
                  <Pencil size={18} />
                  <span>Править</span>
                </button>
              </Tooltip>

              {/* Поделиться 📤 */}
              <Tooltip content="Экспорт карточки (SVG / PNG)" side="top" hotkey="E">
                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  aria-label="Поделиться записью"
                  className="flex items-center gap-1.5 text-[13px] px-2 py-1.5 rounded-full text-[#71767b] hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors duration-150"
                >
                  <Activity size={18} />
                  <span>Поделиться</span>
                </button>
              </Tooltip>
            </div>

            {/* Живые реакции под днём: смайлики, свои эмодзи и счётчики */}
            <div className="pt-1.5 -mx-2">
              <ReactionBar
                target={target}
                excludeIds={['fire', 'heart']}
                soundEnabled={soundEnabled}
                onNotify={onNotify}
              />
            </div>

            {/* Комментарии поддержки под днём: дерево ответов и лайки */}
            <div className="pt-1 -mx-2">
              <CommentsThread
                target={target}
                variant="day"
                soundEnabled={soundEnabled}
                onNotify={onNotify}
              />
            </div>
          </div>
        </div>
      </article>

      {shareModalOpen && (
        <ShareCardModal
          day={day}
          onClose={() => setShareModalOpen(false)}
          onNotify={(msg) => onNotify?.(msg)}
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
    </>
  )
}

'use client'

import { Activity, Flame, Heart, MoreHorizontal, Pencil, ShieldAlert } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState, useEffect } from 'react'
import { playClick } from '@/lib/ogonek/sound'
import { resolvePhotoUrl } from '@/lib/ogonek/photos'
import type { Day } from '@/lib/ogonek/types'
import dynamic from 'next/dynamic'
import { DayEntries } from './day-entries'
import { Tooltip } from './tooltip'

const ShareCardModal = dynamic(
  () => import('./share-card-modal').then((m) => m.ShareCardModal),
  { ssr: false }
)

// ── Persistent reaction helpers ────────────────────────────────────────────
function reactionKey(dayId: number, kind: 'like' | 'thank') {
  return `ogonek.reaction.${kind}.${dayId}`
}

function loadReaction(dayId: number, kind: 'like' | 'thank'): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(reactionKey(dayId, kind)) === '1'
  } catch {
    return false
  }
}

function saveReaction(dayId: number, kind: 'like' | 'thank', value: boolean) {
  try {
    if (value) {
      localStorage.setItem(reactionKey(dayId, kind), '1')
    } else {
      localStorage.removeItem(reactionKey(dayId, kind))
    }
  } catch {
    // ignore
  }
}

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
  // Hydrate from localStorage on mount
  const [liked, setLiked] = useState(false)
  const [thanked, setThanked] = useState(false)
  const [likeAnim, setLikeAnim] = useState<'idle' | 'pressed'>('idle')
  const [thankAnim, setThankAnim] = useState<'idle' | 'pressed'>('idle')
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const reduce = useReducedMotion()

  // Hydrate persisted reactions after mount (avoids SSR mismatch)
  useEffect(() => {
    setLiked(loadReaction(day.id, 'like'))
    setThanked(loadReaction(day.id, 'thank'))
  }, [day.id])

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
    playClick(soundEnabled)
    const next = !liked
    setLiked(next)
    saveReaction(day.id, 'like', next)
    setLikeAnim('pressed')
    setTimeout(() => setLikeAnim('idle'), 400)
    if (next) onNotify?.('🔥 Огонёк зажжён!')
  }

  const handleThank = () => {
    playClick(soundEnabled)
    const next = !thanked
    setThanked(next)
    saveReaction(day.id, 'thank', next)
    setThankAnim('pressed')
    setTimeout(() => setThankAnim('idle'), 400)
    onNotify?.(next ? '❤️ Благодарность отправлена!' : 'Благодарность снята')
  }

  // Handle missed days
  if (day.status === 'missed') {
    return (
      <article
        className="border-b border-zinc-800/80 px-4 py-3.5 transition-colors duration-150 hover:bg-white/[0.02]"
        id={`day-card-${day.id}`}
      >
        <div className="flex gap-3">
          <div
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#1c1e22] text-base text-[#71767b]"
            aria-hidden="true"
          >
            ✦
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              <strong className="text-[15px] font-bold tracking-[-0.015em] text-[#e7e9ea]">Льготный мост</strong>
              <span className="text-[14px] text-[#71767b]">· День #{day.id}</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
              <ShieldAlert size={12} /> Grace Period
            </span>
            <p className="mt-2 text-[14px] leading-[1.45] text-[#71767b] italic">
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
        className="day-card border-b border-zinc-800/80 px-4 py-3 transition-colors duration-150 hover:bg-white/[0.02]"
        id={`day-card-${day.id}`}
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 280px' }}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-none">
            <div
              className="flex h-10 w-10 select-none items-center justify-center rounded-full text-sm font-bold"
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
          <div className="min-w-0 flex-1">
            {/* Header row */}
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                <span className="text-[15px] font-bold tracking-[-0.015em] text-[#e7e9ea]">
                  Alexei Cerna
                </span>
                {/* Blue verified badge */}
                <span
                  className="inline-grid flex-none place-items-center rounded-full text-white"
                  style={{ background: '#1d9bf0', width: 16, height: 16, fontSize: 9, fontWeight: 900 }}
                  title="Верифицирован"
                  aria-label="Верифицирован"
                >
                  ✓
                </span>
                <span className="text-[12px] leading-[16px] tracking-[-0.01em] text-[#71767b]">
                  @cernavation · {dateStr}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ background: '#2b1d16', color: '#ffad5a' }}
                >
                  День #{day.id}
                </span>
              </div>

              {/* Score badge + action buttons */}
              <div className="flex flex-none items-center gap-0.5">
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
                    className="grid h-8 w-8 place-items-center rounded-full text-[#71767b] transition-colors duration-150 hover:bg-[#ff6b35]/10 hover:text-[#ff6b35]"
                    aria-label="Редактировать день"
                    onClick={() => onEdit?.(day)}
                  >
                    <Pencil size={15} />
                  </button>
                </Tooltip>
                <Tooltip content="Опции дня" side="left">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-full text-[#71767b] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#e7e9ea]"
                    aria-label="Опции публикации"
                    onClick={() => setShareModalOpen(true)}
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Post body */}
            <p className="mb-3 text-[15px] leading-[23px] tracking-[-0.015em] text-[#e7e9ea]">
              {day.title}
            </p>

            {/* Entries tabs */}
            <DayEntries
              prides={day.prides}
              gratitudes={day.gratitudes}
              soundEnabled={soundEnabled}
              onPinToVault={onPinToVault}
              onNotify={onNotify}
            />

            {/* Media — X.com style */}
            {photoUrls.length > 0 && (
              <div
                className={`mt-3 overflow-hidden rounded-2xl border border-zinc-800/80 ${
                  photoUrls.length === 1 ? '' : 'grid grid-cols-2 gap-[2px]'
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
                      className="max-h-[500px] w-full rounded-2xl object-cover"
                    />
                  </button>
                )}
                {photoUrls.length === 2 && (
                  <>
                    <button
                      type="button"
                      onClick={() => onLightbox(photoUrls[0])}
                      className="block overflow-hidden rounded-l-2xl focus:outline-none"
                      aria-label="Открыть первое фото дня"
                    >
                      <img
                        src={photoUrls[0]}
                        alt="Фото дня 1"
                        loading="lazy"
                        className="h-[240px] w-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onLightbox(photoUrls[1])}
                      className="block overflow-hidden rounded-r-2xl focus:outline-none"
                      aria-label="Открыть второе фото дня"
                    >
                      <img
                        src={photoUrls[1]}
                        alt="Фото дня 2"
                        loading="lazy"
                        className="h-[240px] w-full object-cover"
                      />
                    </button>
                  </>
                )}
                {photoUrls.length >= 3 && (
                  <>
                    <button
                      type="button"
                      onClick={() => onLightbox(photoUrls[0])}
                      className="row-span-2 block overflow-hidden rounded-bl-2xl rounded-tl-2xl focus:outline-none"
                      aria-label="Открыть первое фото дня"
                    >
                      <img
                        src={photoUrls[0]}
                        alt="Фото дня 1"
                        loading="lazy"
                        className="h-[240px] w-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onLightbox(photoUrls[1])}
                      className="block overflow-hidden rounded-tr-2xl focus:outline-none"
                      aria-label="Открыть второе фото дня"
                    >
                      <img
                        src={photoUrls[1]}
                        alt="Фото дня 2"
                        loading="lazy"
                        className="h-[118px] w-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onLightbox(photoUrls[2])}
                      className="block overflow-hidden rounded-br-2xl focus:outline-none"
                      aria-label="Открыть третье фото дня"
                    >
                      <img
                        src={photoUrls[2]}
                        alt="Фото дня 3"
                        loading="lazy"
                        className="h-[118px] w-full object-cover"
                      />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* X.com canonical action bar — minimalist icon buttons */}
            <div className="-ml-2 mt-1 flex max-w-[425px] items-center justify-between">
              {/* Огонёк 🔥 (with counter) */}
              <Tooltip content="Зажечь огонёк" side="top">
                <motion.button
                  type="button"
                  onClick={handleLike}
                  aria-label={liked ? 'Убрать отметку огня' : 'Поставить огонь'}
                  className={`group flex items-center gap-0.5 rounded-full text-[13px] transition-colors duration-150 ${
                    liked ? 'text-[#ff6b35]' : 'text-[#71767b] hover:text-[#ff6b35]'
                  }`}
                  animate={reduce ? undefined : likeAnim}
                  variants={reactionVariants}
                  transition={{ duration: 0.35, times: [0, 0.2, 0.6, 1] }}
                >
                  <span className="grid h-[34px] w-[34px] place-items-center rounded-full transition-colors duration-150 group-hover:bg-[#ff6b35]/10">
                    <Flame size={18} fill={liked ? 'currentColor' : 'none'} />
                  </span>
                  <span className="pr-1 tabular-nums">{liked ? '1' : '0'}</span>
                </motion.button>
              </Tooltip>

              {/* Спасибо ❤️ */}
              <Tooltip content="Поблагодарить" side="top">
                <motion.button
                  type="button"
                  onClick={handleThank}
                  aria-label="Поблагодарить"
                  className={`group flex items-center rounded-full text-[13px] transition-colors duration-150 ${
                    thanked ? 'text-[#f91880]' : 'text-[#71767b] hover:text-[#f91880]'
                  }`}
                  animate={reduce ? undefined : thankAnim}
                  variants={reactionVariants}
                  transition={{ duration: 0.35, times: [0, 0.2, 0.6, 1] }}
                >
                  <span className="grid h-[34px] w-[34px] place-items-center rounded-full transition-colors duration-150 group-hover:bg-[#f91880]/10">
                    <Heart size={18} fill={thanked ? 'currentColor' : 'none'} />
                  </span>
                </motion.button>
              </Tooltip>

              {/* Редактировать ✏️ */}
              <Tooltip content="Редактировать день" side="top">
                <button
                  type="button"
                  onClick={() => onEdit?.(day)}
                  aria-label="Редактировать день"
                  className="group flex items-center rounded-full text-[13px] text-[#71767b] transition-colors duration-150 hover:text-[#ff6b35]"
                >
                  <span className="grid h-[34px] w-[34px] place-items-center rounded-full transition-colors duration-150 group-hover:bg-[#ff6b35]/10">
                    <Pencil size={18} />
                  </span>
                </button>
              </Tooltip>

              {/* Поделиться 📤 */}
              <Tooltip content="Экспорт карточки (SVG / PNG)" side="top" hotkey="E">
                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  aria-label="Поделиться записью"
                  className="group flex items-center rounded-full text-[13px] text-[#71767b] transition-colors duration-150 hover:text-[#1d9bf0]"
                >
                  <span className="grid h-[34px] w-[34px] place-items-center rounded-full transition-colors duration-150 group-hover:bg-[#1d9bf0]/10">
                    <Activity size={18} />
                  </span>
                </button>
              </Tooltip>
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
    </>
  )
}

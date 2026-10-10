'use client'

import { Activity, Flame, Heart, MoreHorizontal, Pencil, ShieldAlert, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { playClick } from '@/lib/ogonek/sound'
import type { Day } from '@/lib/ogonek/types'
import dynamic from 'next/dynamic'
import { DayEntries } from './day-entries'
import { Tooltip } from './tooltip'

const ShareCardModal = dynamic(
  () => import('./share-card-modal').then((m) => m.ShareCardModal),
  { ssr: false }
)

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
  const [liked, setLiked] = useState(false)
  const [thanked, setThanked] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)

  const photos = Array.isArray(day.photos) ? day.photos.filter((p): p is string => Boolean(p)) : []

  const handleLike = () => {
    playClick(soundEnabled)
    setLiked(!liked)
  }

  const handleThank = () => {
    playClick(soundEnabled)
    setThanked(!thanked)
    onNotify?.(thanked ? 'Благодарность снята' : 'Благодарность отправлена!')
  }

  // Handle missed days without fake text
  if (day.status === 'missed') {
    return (
      <article className="day-card day-card--missed" id={`day-card-${day.id}`}>
        <header className="post-header">
          <div className="avatar avatar-muted" aria-hidden="true">✦</div>
          <div className="post-meta">
            <div>
              <strong>Льготный мост</strong>
              <span className="handle">· День #{day.id}</span>
            </div>
            <div className="post-sub">
              <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                <ShieldAlert size={12} /> Grace Period
              </span>
            </div>
          </div>
        </header>
        <p className="post-copy text-muted italic text-sm my-2">
          В этот день записей не было, но огонёк непрерывного пути сохранён льготным периодом (3 дня допуска).
        </p>
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

  return (
    <>
      <article className="day-card" id={`day-card-${day.id}`}>
        <header className="post-header">
          <div className="avatar avatar-photo" aria-hidden="true">AC</div>
          <div className="post-meta">
            <div>
              <strong>Alexei Cerna</strong>
              <span className="verified" title="Верифицирован">✓</span>
              <span className="handle">@cernavation · {day.dateISO ? new Date(day.dateISO).toLocaleDateString('ru-RU') : 'сегодня'}</span>
            </div>
            <div className="post-sub">
              <span className="day-badge">День #{day.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {averageScore !== null && (
              <div
                className={`score-badge ${scoreBadgeClass}`}
                title={`Средний балл дня: ${averageScore.toFixed(1)}/10`}
              >
                {averageScore.toFixed(1)}
              </div>
            )}
            <Tooltip content="Редактировать день" side="left">
              <button
                type="button"
                className="muted hover:text-orange-400 transition-colors"
                aria-label="Редактировать день"
                style={{ padding: 4 }}
                onClick={() => onEdit?.(day)}
              >
                <Pencil size={18} />
              </button>
            </Tooltip>
            <Tooltip content="Опции дня" side="left">
              <button
                type="button"
                className="muted"
                aria-label="Опции публикации"
                style={{ padding: 4 }}
                onClick={() => setShareModalOpen(true)}
              >
                <MoreHorizontal size={20} />
              </button>
            </Tooltip>
          </div>
        </header>

        <p className="post-copy">{day.title}</p>

        <DayEntries
          prides={day.prides}
          gratitudes={day.gratitudes}
          soundEnabled={soundEnabled}
          onPinToVault={onPinToVault}
          onNotify={onNotify}
        />

        {photos.length > 0 && (
          <div className="media-grid">
            <button
              type="button"
              onClick={() => onLightbox(photos[0])}
              className={photos.length === 1 ? 'media-single w-full' : 'media-main'}
              aria-label="Открыть главное изображение дня"
            >
              <img
                src={photos[0]}
                alt="Главное фото дня"
                loading="lazy"
              />
            </button>
            {photos.length > 1 && (
              <div>
                <button
                  type="button"
                  onClick={() => onLightbox(photos[1])}
                  aria-label="Открыть второе изображение дня"
                >
                  <img
                    src={photos[1]}
                    alt="Второе фото дня"
                    loading="lazy"
                  />
                </button>
                {photos[2] && (
                  <button
                    type="button"
                    onClick={() => onLightbox(photos[2])}
                    aria-label="Открыть третье изображение дня"
                  >
                    <img
                      src={photos[2]}
                      alt="Третье фото дня"
                      loading="lazy"
                    />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="post-actions">
          <Tooltip content="Зажечь огонёк" side="top">
            <button
              type="button"
              className={liked ? 'liked' : ''}
              onClick={handleLike}
              aria-label={liked ? 'Убрать отметку огня' : 'Поставить огонь'}
            >
              <Flame size={18} fill={liked ? 'currentColor' : 'none'} />
              <span>{liked ? '1' : '0'}</span>
            </button>
          </Tooltip>

          <Tooltip content="Поблагодарить" side="top">
            <button
              type="button"
              className={thanked ? 'liked' : ''}
              onClick={handleThank}
              aria-label="Поблагодарить"
            >
              <Heart size={18} fill={thanked ? 'currentColor' : 'none'} />
              <span>Спасибо</span>
            </button>
          </Tooltip>

          <Tooltip content="Редактировать день" side="top">
            <button
              type="button"
              onClick={() => onEdit?.(day)}
              aria-label="Редактировать день"
              className="hover:text-orange-400 transition-colors"
            >
              <Pencil size={18} />
              <span>Править</span>
            </button>
          </Tooltip>

          <Tooltip content="Экспорт карточки (SVG / PNG)" side="top" hotkey="E">
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              aria-label="Поделиться записью"
            >
              <Activity size={18} />
              <span>Поделиться</span>
            </button>
          </Tooltip>
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

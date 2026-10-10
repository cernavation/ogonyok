'use client'

import { Activity, Flame, Heart, MoreHorizontal, ShieldAlert, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { PHOTOS } from '@/lib/ogonek/data'
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
  soundEnabled?: boolean
}

export function DayCard({
  day,
  onLightbox,
  onNotify,
  onPinToVault,
  soundEnabled = true,
}: Props) {
  const [liked, setLiked] = useState(false)
  const [thanked, setThanked] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)

  const photos = day.photos && day.photos.length >= 3 ? day.photos : PHOTOS

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
              <span className="score">★ 8.4</span>
            </div>
          </div>
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
              className="media-main"
              aria-label="Открыть главное изображение дня"
            >
              <img
                src={photos[0]}
                alt="Главное фото дня"
                loading="lazy"
              />
            </button>
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
            </div>
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

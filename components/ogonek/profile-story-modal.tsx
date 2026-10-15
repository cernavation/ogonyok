'use client'

import { ChevronLeft, ChevronRight, Copy, Download, Pause, Play, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { downloadBlob } from '@/lib/ogonek/card-export'
import {
  buildProfileShareUrl,
  exportStoryCardAsPng,
  type ProfileStory,
} from '@/lib/ogonek/profile-share'
import { playClick } from '@/lib/ogonek/sound'
import type { OgonekProfile } from '@/lib/ogonek/types'

type Props = {
  stories: ProfileStory[]
  startIndex: number
  profile: OgonekProfile
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const STORY_DURATION_MS = 5000
const TICK_MS = 100

export function ProfileStoryModal({
  stories,
  startIndex,
  profile,
  onClose,
  onNotify,
  soundEnabled = true,
}: Props) {
  const safeStart = Math.min(Math.max(startIndex, 0), Math.max(stories.length - 1, 0))
  const [index, setIndex] = useState(safeStart)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [busy, setBusy] = useState(false)

  const shareUrl = useMemo(() => buildProfileShareUrl(profile.username), [profile.username])
  const story = stories[index]

  const goTo = useCallback(
    (next: number) => {
      if (next < 0) {
        setIndex(0)
        setProgress(0)
        return
      }
      if (next >= stories.length) {
        onClose()
        return
      }
      setIndex(next)
      setProgress(0)
    },
    [stories.length, onClose]
  )

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  // Escape / стрелки
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') next()
      if (event.key === 'ArrowLeft') prev()
      if (event.key === ' ') {
        event.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, next, prev])

  // Автопрогресс
  useEffect(() => {
    if (paused || !story) return
    const step = (TICK_MS / STORY_DURATION_MS) * 100
    const id = setInterval(() => {
      setProgress((p) => Math.min(100, p + step))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [paused, index, story])

  // Переход при завершении
  useEffect(() => {
    if (progress < 100 || !story) return
    const timer = setTimeout(() => {
      if (index < stories.length - 1) {
        setIndex(index + 1)
        setProgress(0)
      } else {
        onClose()
      }
    }, 260)
    return () => clearTimeout(timer)
  }, [progress, index, stories.length, onClose, story])

  if (!story) return null

  const handleCopy = async () => {
    playClick(soundEnabled)
    try {
      await navigator.clipboard.writeText(`${story.shareText}\n${shareUrl}`)
      onNotify('Текст сторис скопирован!')
    } catch {
      onNotify('Не удалось скопировать текст')
    }
  }

  const handleDownload = async () => {
    playClick(soundEnabled)
    setBusy(true)
    try {
      const blob = await exportStoryCardAsPng(story, profile, shareUrl)
      downloadBlob(blob, `ogonek-story-${story.id}.png`)
      onNotify('Сторис сохранена в PNG (1080×1920)')
    } catch {
      onNotify('Ошибка при экспорте сторис')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Сторис: ${story.title}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors"
        aria-label="Закрыть сторис"
      >
        <X size={22} />
      </button>

      {/* Prev / Next controls */}
      <button
        type="button"
        onClick={prev}
        className="hidden sm:flex absolute left-4 w-11 h-11 rounded-full items-center justify-center text-white/80 hover:bg-white/10 transition-colors"
        aria-label="Предыдущая сторис"
      >
        <ChevronLeft size={26} />
      </button>
      <button
        type="button"
        onClick={next}
        className="hidden sm:flex absolute right-4 w-11 h-11 rounded-full items-center justify-center text-white/80 hover:bg-white/10 transition-colors"
        aria-label="Следующая сторис"
      >
        <ChevronRight size={26} />
      </button>

      <div
        className="relative w-full rounded-[28px] overflow-hidden shadow-2xl"
        style={{
          maxWidth: 400,
          height: 'min(82vh, 720px)',
          background: `linear-gradient(150deg, ${story.from}, ${story.to})`,
          border: '1px solid rgba(255,255,255,0.12)',
        }}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-20">
          {stories.map((s, i) => {
            const filled = i < index ? 100 : i === index ? progress : 0
            return (
              <span
                key={s.id}
                className="flex-1 h-[3px] rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.25)' }}
              >
                <span
                  className="block h-full rounded-full transition-[width] duration-100 ease-linear"
                  style={{ width: `${filled}%`, background: '#fff' }}
                />
              </span>
            )
          })}
        </div>

        {/* Tap zones */}
        <button
          type="button"
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
          onClick={prev}
          aria-label="Назад"
        />
        <button
          type="button"
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
          onClick={next}
          aria-label="Вперёд"
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col p-6 pt-8 select-none pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-[15px]">✦</span>
            <span className="text-white text-[15px] font-extrabold tracking-[0.15em]">
              ОГОНЁК
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div
              className="text-[13px] font-extrabold tracking-[0.25em] mb-3"
              style={{ color: story.accent }}
            >
              {story.kicker}
            </div>
            <div className="text-[72px] leading-none mb-4">{story.emoji}</div>
            <div className="text-white text-[76px] leading-[0.95] font-black break-words">
              {story.value}
            </div>
            <div className="text-white text-[30px] leading-[1.1] font-extrabold mt-2">
              {story.title}
            </div>
            <div className="text-white/75 text-[15px] leading-snug mt-3">
              {story.subtitle}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white text-[14px] font-bold">@{profile.username}</span>
            <span className="text-white/55 text-[12px]">ogonek</span>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setPaused((p) => !p)
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-black/40 hover:bg-black/60 transition-colors"
            aria-label={paused ? 'Продолжить' : 'Пауза'}
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-black/40 hover:bg-black/60 transition-colors"
            aria-label="Скопировать текст сторис"
          >
            <Copy size={15} />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className="h-9 px-3 rounded-full flex items-center gap-1.5 text-white bg-black/40 hover:bg-black/60 transition-colors text-[13px] font-bold"
            aria-label="Скачать сторис в PNG"
          >
            <Download size={15} />
            {busy ? '…' : 'PNG'}
          </button>
        </div>
      </div>
    </div>
  )
}

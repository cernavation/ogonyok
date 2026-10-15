'use client'

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Heart, Pause, Play, Send, Share2, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { ViewableStory } from '@/lib/ogonek/stories'

type Props = {
  stories: ViewableStory[]
  startIndex: number
  /** Уже разрешённый src аватара пользователя (для «Моей истории») */
  myAvatarSrc: string | null
  onClose: () => void
  /** Помечает сторис друга просмотренной (кружок гаснет) */
  onStoryViewed?: (friendId: string) => void
  /** Удаляет кадр личной истории */
  onDeleteStory?: (myStoryId: string) => void
  /** Реакция на сторис: target = "story:<id>", emojiId */
  onToggleReaction?: (target: string, emojiId: string) => void
  /** Список emojiId, которые пользователь поставил на цель */
  myReactionsFor?: (target: string) => string[]
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const SLIDE_DURATION_MS = 5000
const TICK_MS = 60

export function StoryViewerModal({
  stories,
  startIndex,
  myAvatarSrc,
  onClose,
  onStoryViewed,
  onDeleteStory,
  onToggleReaction,
  myReactionsFor,
  onNotify,
  soundEnabled = true,
}: Props) {
  const safeStories = Array.isArray(stories) ? stories : []
  const [storyIndex, setStoryIndex] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(safeStories.length - 1, 0))
  )
  const [slideIndex, setSlideIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reply, setReply] = useState('')
  const replyRef = useRef<HTMLInputElement>(null)

  const story = safeStories[Math.min(storyIndex, Math.max(safeStories.length - 1, 0))]
  const slide = story?.slides[Math.min(slideIndex, Math.max(story.slides.length - 1, 0))]
  const reactTarget = story ? `story:${story.id}` : ''

  const liked =
    reactTarget && myReactionsFor ? myReactionsFor(reactTarget).includes('heart') : false

  // Если массив историй сократился (удаление кадра) — корректируем индексы
  useEffect(() => {
    if (safeStories.length === 0) {
      onClose()
      return
    }
    if (storyIndex > safeStories.length - 1) {
      setStoryIndex(safeStories.length - 1)
      setSlideIndex(0)
      setProgress(0)
    }
  }, [safeStories.length, storyIndex, onClose])

  // Помечаем сторис просмотренной при открытии
  useEffect(() => {
    if (story?.kind === 'friend' && story.friendId) {
      onStoryViewed?.(story.friendId)
    }
  }, [story?.id, story?.kind, story?.friendId, onStoryViewed])

  const advance = useCallback(() => {
    if (!story) return
    if (slideIndex < story.slides.length - 1) {
      setSlideIndex((i) => i + 1)
      setProgress(0)
    } else if (storyIndex < safeStories.length - 1) {
      setStoryIndex((i) => i + 1)
      setSlideIndex(0)
      setProgress(0)
    } else {
      onClose()
    }
  }, [story, slideIndex, storyIndex, safeStories.length, onClose])

  const goPrev = useCallback(() => {
    if (!story) return
    if (slideIndex > 0) {
      setSlideIndex((i) => i - 1)
      setProgress(0)
    } else if (storyIndex > 0) {
      const prevStory = safeStories[storyIndex - 1]
      setStoryIndex((i) => i - 1)
      setSlideIndex(Math.max(0, prevStory.slides.length - 1))
      setProgress(0)
    } else {
      setProgress(0)
    }
  }, [story, slideIndex, storyIndex, safeStories])

  // Автопрогресс
  useEffect(() => {
    if (paused || !story || !slide) return
    const step = (TICK_MS / SLIDE_DURATION_MS) * 100
    const id = setInterval(() => {
      setProgress((p) => Math.min(100, p + step))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [paused, story, slide, storyIndex, slideIndex])

  // Переход при завершении кадра
  useEffect(() => {
    if (progress < 100 || !story) return
    const timer = setTimeout(advance, 180)
    return () => clearTimeout(timer)
  }, [progress, advance, story])

  // Сброс прогресса при смене кадра
  useEffect(() => {
    setProgress(0)
  }, [storyIndex, slideIndex])

  // Клавиатура
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') advance()
      if (event.key === 'ArrowLeft') goPrev()
      if (event.key === ' ') {
        event.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, advance, goPrev])

  if (!story || !slide) return null

  const handleShare = async () => {
    playClick(soundEnabled)
    const text = `${slide.emoji} ${slide.headline} — ${slide.detail}\n#Огонёк 🔥`
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Сторис Огонька', text })
      } else {
        await navigator.clipboard.writeText(text)
      }
      onNotify('История готова к отправке!')
    } catch {
      onNotify('Не удалось поделиться историей')
    }
  }

  const handleReply = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = reply.trim()
    if (!trimmed) {
      replyRef.current?.focus()
      return
    }
    playSuccess(soundEnabled)
    onNotify(`Ответ отправлен @${story.username}: «${trimmed.slice(0, 40)}»`)
    setReply('')
  }

  const handleLike = () => {
    playClick(soundEnabled)
    onToggleReaction?.(reactTarget, 'heart')
    if (!liked) onNotify(`Ты поддерживаешь @${story.username} ❤️`)
  }

  const handleDelete = () => {
    playClick(soundEnabled)
    const myId = story.myStoryIds?.[slideIndex]
    if (!myId) return
    onDeleteStory?.(myId)
    onNotify('Кадр истории удалён')
  }

  const bars = story.slides
  const currentProgress = (i: number) => (i < slideIndex ? 100 : i === slideIndex ? progress : 0)

  return (
    <motion.div
      className="story-viewer-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`История ${story.name}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <button
        type="button"
        className="story-viewer-nav story-viewer-nav--prev"
        onClick={goPrev}
        aria-label="Предыдущий кадр"
      >
        <ChevronLeft size={26} />
      </button>

      <div
        className="story-viewer"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {/* Фон текущего кадра */}
        <div
          className="story-viewer__bg"
          style={{ background: `linear-gradient(150deg, ${slide.from}, ${slide.to})` }}
          aria-hidden="true"
        >
          <span
            className="story-viewer__glow"
            style={{ background: `radial-gradient(circle at 75% 8%, ${slide.accent}, transparent 62%)` }}
          />
        </div>

        {/* Прогресс-бары */}
        <div className="story-viewer__bars">
          {bars.map((s, i) => (
            <span key={s.id} className="story-viewer__bar">
              <span
                className="story-viewer__bar-fill"
                style={{ width: `${currentProgress(i)}%` }}
              />
            </span>
          ))}
        </div>

        {/* Шапка */}
        <header className="story-viewer__head">
          <span
            className="story-viewer__avatar"
            style={{ background: story.avatarColor }}
            aria-hidden="true"
          >
            {story.kind === 'mine' && myAvatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={myAvatarSrc} alt="" />
            ) : (
              story.initials
            )}
          </span>
          <span className="story-viewer__ident">
            <span className="story-viewer__name">
              {story.name}
              {story.verified && <span className="story-viewer__verified" aria-label="Верифицирован">✓</span>}
            </span>
            <span className="story-viewer__meta">
              @{story.username} · {story.postedLabel}
            </span>
          </span>
          <button
            type="button"
            className="story-viewer__pause"
            onClick={(e) => {
              e.stopPropagation()
              setPaused((p) => !p)
            }}
            aria-label={paused ? 'Продолжить' : 'Пауза'}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            type="button"
            className="story-viewer__close"
            onClick={onClose}
            aria-label="Закрыть истории"
          >
            <X size={20} />
          </button>
        </header>

        {/* Контент кадра */}
        <div className="story-viewer__body">
          <span className="story-viewer__kicker" style={{ color: slide.accent }}>
            {slide.kicker}
          </span>
          <span className="story-viewer__emoji">{slide.emoji}</span>
          <span className="story-viewer__headline">{slide.headline}</span>
          <span className="story-viewer__detail">{slide.detail}</span>
        </div>

        {/* Зоны тапа */}
        <button
          type="button"
          className="story-viewer__tap story-viewer__tap--prev"
          onClick={goPrev}
          aria-label="Назад"
        />
        <button
          type="button"
          className="story-viewer__tap story-viewer__tap--next"
          onClick={advance}
          aria-label="Вперёд"
        />

        {/* Нижняя панель */}
        <form className="story-viewer__foot" onSubmit={handleReply} onClick={(e) => e.stopPropagation()}>
          <input
            ref={replyRef}
            className="story-viewer__reply"
            placeholder={`Ответить @${story.username}…`}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            aria-label="Ответить на историю"
          />
          {reply.trim() ? (
            <button type="submit" className="story-viewer__icon" aria-label="Отправить ответ">
              <Send size={17} />
            </button>
          ) : (
            <button
              type="button"
              className={`story-viewer__icon ${liked ? 'is-active' : ''}`}
              onClick={handleLike}
              aria-label={liked ? 'Убрать поддержку' : 'Поддержать'}
              aria-pressed={liked}
            >
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
            </button>
          )}
          <button type="button" className="story-viewer__icon" onClick={handleShare} aria-label="Поделиться">
            <Share2 size={17} />
          </button>
          {story.kind === 'mine' && onDeleteStory && (
            <button type="button" className="story-viewer__icon is-danger" onClick={handleDelete} aria-label="Удалить кадр">
              <Trash2 size={17} />
            </button>
          )}
        </form>
      </div>

      <button
        type="button"
        className="story-viewer-nav story-viewer-nav--next"
        onClick={advance}
        aria-label="Следующий кадр"
      >
        <ChevronRight size={26} />
      </button>
    </motion.div>
  )
}

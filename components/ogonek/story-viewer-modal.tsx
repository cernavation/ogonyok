'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Flame,
  Heart,
  LayoutGrid,
  Link2,
  MapPin,
  Pause,
  Play,
  Send,
  Share2,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { BUILTIN_EMOJIS } from '@/lib/ogonek/reactions'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { ViewableStory } from '@/lib/ogonek/stories'
import type { StoryPhoto } from '@/lib/ogonek/story-digest'
import {
  buildStoryShareText,
  buildTelegramShareUrl,
  downloadStoryCard,
} from '@/lib/ogonek/story-share'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'

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
  /** Счётчики реакций по цели сторис */
  reactionCountsFor?: (target: string) => Record<string, number>
  /** Сохраняет ответ в личку автору сторис (target = "story:<id>") */
  onSendReply?: (target: string, text: string) => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const SLIDE_DURATION_MS = 5000
const TICK_MS = 60

/** Быстрые реакции «в один тап» под кадром */
const QUICK_REACTION_IDS = ['fire', 'heart', 'muscle', 'clap', 'rocket', 'tada'] as const
const QUICK_REACTIONS = QUICK_REACTION_IDS.map((id) => BUILTIN_EMOJIS.find((e) => e.id === id)).filter(
  (e): e is (typeof BUILTIN_EMOJIS)[number] => Boolean(e)
)

/** Плитка фото-сетки: настоящий снимок дня или живописный процедурный кадр */
function StoryPhotoTile({ photo }: { photo: StoryPhoto }) {
  const src = usePhotoUrl(photo.ref ?? null)
  return (
    <span
      className="story-viewer__tile-media"
      style={src ? undefined : { background: photo.gradient }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={photo.caption} loading="lazy" />
      ) : (
        <span className="story-viewer__tile-emoji" aria-hidden="true">
          {photo.emoji}
        </span>
      )}
    </span>
  )
}

export function StoryViewerModal({
  stories,
  startIndex,
  myAvatarSrc,
  onClose,
  onStoryViewed,
  onDeleteStory,
  onToggleReaction,
  myReactionsFor,
  reactionCountsFor,
  onSendReply,
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
  const [replyFocused, setReplyFocused] = useState(false)
  const [panel, setPanel] = useState<'none' | 'day' | 'share'>('none')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [floats, setFloats] = useState<Array<{ key: number; char: string }>>([])
  const [sharing, setSharing] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const replyRef = useRef<HTMLInputElement>(null)
  const reduce = useReducedMotion()

  const story = safeStories[Math.min(storyIndex, Math.max(safeStories.length - 1, 0))]
  const slide = story?.slides[Math.min(slideIndex, Math.max(story.slides.length - 1, 0))]
  const digest = story?.digest
  const reactTarget = story ? `story:${story.id}` : ''
  const photos = digest?.photos ?? []

  const myReactionIds = useMemo(
    () => (reactTarget && myReactionsFor ? myReactionsFor(reactTarget) : []),
    [reactTarget, myReactionsFor]
  )
  const reactionCounts = useMemo(
    () => (reactTarget && reactionCountsFor ? reactionCountsFor(reactTarget) : {}),
    [reactTarget, reactionCountsFor]
  )
  const liked = myReactionIds.includes('heart')

  // Пауза при любом открытом окне/поле — таймер не «убегает» от пользователя
  const panelPaused = panel !== 'none' || lightbox !== null || replyFocused

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

  /** Прыжок на конкретный кадр по клику на полоску прогресса */
  const jumpToSlide = useCallback(
    (index: number) => {
      if (!story) return
      playClick(soundEnabled)
      setSlideIndex(Math.min(Math.max(index, 0), story.slides.length - 1))
      setProgress(0)
    },
    [story, soundEnabled]
  )

  // Автопрогресс
  useEffect(() => {
    if (paused || panelPaused || !story || !slide) return
    const step = (TICK_MS / SLIDE_DURATION_MS) * 100
    const id = setInterval(() => {
      setProgress((p) => Math.min(100, p + step))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [paused, panelPaused, story, slide, storyIndex, slideIndex])

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
      if (tag === 'input' || tag === 'textarea') {
        if (event.key === 'Escape') (event.target as HTMLElement).blur()
        return
      }
      if (event.key === 'Escape') {
        if (lightbox !== null) setLightbox(null)
        else if (panel !== 'none') setPanel('none')
        else onClose()
        return
      }
      if (panel !== 'none' || lightbox !== null) return
      if (event.key === 'ArrowRight') advance()
      if (event.key === 'ArrowLeft') goPrev()
      if (event.key === ' ') {
        event.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, advance, goPrev, panel, lightbox])

  const handleReaction = useCallback(
    (emojiId: string, char: string, label: string) => {
      if (!story || !onToggleReaction) return
      const wasActive = myReactionIds.includes(emojiId)
      onToggleReaction(reactTarget, emojiId)
      playClick(soundEnabled)
      if (!wasActive) {
        const key = Date.now() + Math.random()
        setFloats((prev) => [...prev, { key, char }])
        setTimeout(() => setFloats((prev) => prev.filter((f) => f.key !== key)), 760)
        onNotify(`${char} ${label} — @${story.username} увидит твою поддержку`)
      } else {
        onNotify(`Реакция ${char} снята`)
      }
    },
    [story, onToggleReaction, myReactionIds, reactTarget, soundEnabled, onNotify]
  )

  if (!story || !slide) return null

  const shareText = buildStoryShareText(story.name, story.username, slide, digest)
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}#story-${story.id}`
      : 'https://ogonek.cernavation.app'
  const shareCardInput = {
    name: story.name,
    username: story.username,
    verified: story.verified,
    initials: story.initials,
    slide,
    digest: story.digest,
  }

  const handleReply = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = reply.trim()
    if (!trimmed) {
      replyRef.current?.focus()
      return
    }
    playSuccess(soundEnabled)
    onSendReply?.(reactTarget, trimmed)
    onNotify(`Ответ отправлен в личку @${story.username} 💬`)
    setReply('')
    setReplyFocused(false)
  }

  const handleDelete = () => {
    playClick(soundEnabled)
    const myId = story.myStoryIds?.[slideIndex]
    if (!myId) return
    onDeleteStory?.(myId)
    onNotify('Кадр истории удалён')
  }

  const handleDownloadCard = async () => {
    playClick(soundEnabled)
    setSharing(true)
    try {
      await downloadStoryCard(shareCardInput)
      onNotify('Карточка сторис сохранена — выкладывай куда угодно 📸')
    } catch {
      onNotify('Не удалось собрать карточку сторис')
    } finally {
      setSharing(false)
    }
  }

  const handleTelegram = () => {
    playClick(soundEnabled)
    const url = buildTelegramShareUrl(shareText, shareUrl)
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    onNotify('Открываю Telegram для отправки сторис ✈️')
  }

  const handleCopyText = async () => {
    playClick(soundEnabled)
    try {
      await navigator.clipboard.writeText(shareText)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
      onNotify('Текст сторис скопирован в буфер')
    } catch {
      onNotify('Не удалось скопировать текст')
    }
  }

  const handleCopyLink = async () => {
    playClick(soundEnabled)
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
      onNotify('Ссылка на сторис скопирована')
    } catch {
      onNotify('Не удалось скопировать ссылку')
    }
  }

  const handleNativeShare = async () => {
    playClick(soundEnabled)
    setSharing(true)
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Сторис Огонька', text: shareText, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      }
      onNotify('Сторис готова к отправке ✨')
    } catch {
      // Пользователь отменил системный диалог — это нормально
    } finally {
      setSharing(false)
    }
  }

  const bars = story.slides
  const currentProgress = (i: number) => (i < slideIndex ? 100 : i === slideIndex ? progress : 0)
  const activePhoto = lightbox !== null ? photos[lightbox] : undefined

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

        {/* Прогресс-бары (клик — прыжок на кадр) */}
        <div className="story-viewer__bars">
          {bars.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="story-viewer__bar"
              onClick={(e) => {
                e.stopPropagation()
                jumpToSlide(i)
              }}
              aria-label={`Кадр ${i + 1} из ${bars.length}`}
            >
              <span className="story-viewer__bar-fill" style={{ width: `${currentProgress(i)}%` }} />
            </button>
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
              {story.verified && (
                <span className="story-viewer__verified" aria-label="Верифицирован">
                  ✓
                </span>
              )}
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
          {digest && (
            <button
              type="button"
              className="story-viewer__peek"
              style={{ borderColor: slide.accent, color: slide.accent }}
              onClick={(e) => {
                e.stopPropagation()
                playClick(soundEnabled)
                setPanel('day')
              }}
            >
              <LayoutGrid size={14} /> День {digest.city || 'в огне'} · {photos.length} фото
            </button>
          )}
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

        {/* Быстрые реакции */}
        <div
          className="story-viewer__reactions"
          role="group"
          aria-label="Быстрые реакции на сторис"
          onClick={(e) => e.stopPropagation()}
        >
          {QUICK_REACTIONS.map((reaction) => {
            const active = myReactionIds.includes(reaction.id)
            const count = reactionCounts[reaction.id] ?? 0
            return (
              <button
                key={reaction.id}
                type="button"
                className={`story-viewer__react ${active ? 'is-active' : ''}`}
                onClick={() => handleReaction(reaction.id, reaction.char, reaction.label)}
                aria-pressed={active}
                aria-label={`${active ? 'Убрать' : 'Поставить'} реакцию ${reaction.label}`}
              >
                <span aria-hidden="true">{reaction.char}</span>
                {count > 0 && <span className="story-viewer__react-count">{count}</span>}
              </button>
            )
          })}
          <button
            type="button"
            className="story-viewer__react story-viewer__react--day"
            onClick={() => {
              playClick(soundEnabled)
              setPanel('day')
            }}
            aria-label="Открыть опубликованный день автора"
          >
            <Flame size={15} />
          </button>
        </div>

        {/* Нижняя панель */}
        <form
          className="story-viewer__foot"
          onSubmit={handleReply}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={replyRef}
            className="story-viewer__reply"
            placeholder={`Ответить @${story.username}…`}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onFocus={() => setReplyFocused(true)}
            onBlur={() => setReplyFocused(false)}
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
              onClick={() => handleReaction('heart', '❤️', 'Любовь')}
              aria-label={liked ? 'Убрать поддержку' : 'Поддержать'}
              aria-pressed={liked}
            >
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
            </button>
          )}
          <button
            type="button"
            className="story-viewer__icon"
            onClick={() => {
              playClick(soundEnabled)
              setPanel('share')
            }}
            aria-label="Поделиться сторис куда угодно"
          >
            <Share2 size={17} />
          </button>
          {story.kind === 'mine' && onDeleteStory && (
            <button
              type="button"
              className="story-viewer__icon is-danger"
              onClick={handleDelete}
              aria-label="Удалить кадр"
            >
              <Trash2 size={17} />
            </button>
          )}
        </form>

        {/* Всплывающие эмодзи реакций */}
        <AnimatePresence>
          {floats.map((f) => (
            <motion.span
              key={f.key}
              className="story-viewer__float"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.6 }}
              animate={
                reduce
                  ? { opacity: 1 }
                  : { opacity: [0, 1, 1, 0], y: -140, scale: [0.6, 1.4, 1.2, 1] }
              }
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0.2 : 0.72, ease: 'easeOut' }}
              aria-hidden="true"
            >
              {f.char}
            </motion.span>
          ))}
        </AnimatePresence>

        {/* Опубликованный день: фото-сетка + главная гордость */}
        <AnimatePresence>
          {panel === 'day' && digest && (
            <motion.section
              className="story-viewer__sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              aria-label="Опубликованный день автора"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="story-viewer__sheet-head">
                <span className="story-viewer__sheet-title">
                  <Sparkles size={15} className="story-viewer__sheet-ico" />
                  {digest.title}
                </span>
                <button
                  type="button"
                  className="story-viewer__sheet-close"
                  onClick={() => setPanel('none')}
                  aria-label="Закрыть день"
                >
                  <X size={18} />
                </button>
              </header>

              <div className="story-viewer__sheet-body">
                <p className="story-viewer__sheet-meta">
                  {digest.dateLabel}
                  {digest.city ? ` · ${digest.city}` : ''}
                </p>

                {/* Главная гордость дня */}
                <div className="story-viewer__pride" style={{ borderColor: slide.accent }}>
                  <span className="story-viewer__pride-kicker" style={{ color: slide.accent }}>
                    💪 Главная гордость дня
                  </span>
                  <span className="story-viewer__pride-text">{digest.mainPride}</span>
                  <span className="story-viewer__pride-scale">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        className={i < digest.mainPrideScale ? 'is-on' : ''}
                        fill={i < digest.mainPrideScale ? 'currentColor' : 'none'}
                        aria-hidden="true"
                      />
                    ))}
                    <span className="story-viewer__pride-score">{digest.mainPrideScale}/10</span>
                  </span>
                </div>

                {/* Красивая фото-сетка дня */}
                <p className="story-viewer__label">
                  {digest.hasRealPhotos ? '📸 Фотографии дня' : '🎞 Вдохновение дня'}
                </p>
                <div className="story-viewer__grid">
                  {photos.map((photo, i) => (
                    <button
                      key={photo.id}
                      type="button"
                      className="story-viewer__tile"
                      onClick={() => {
                        playClick(soundEnabled)
                        setLightbox(i)
                      }}
                      aria-label={`Открыть фото: ${photo.caption}`}
                    >
                      <StoryPhotoTile photo={photo} />
                      <span className="story-viewer__tile-cap">{photo.caption}</span>
                    </button>
                  ))}
                </div>

                {/* Статистика пути */}
                <div className="story-viewer__stats">
                  <div className="story-viewer__stat">
                    <span className="story-viewer__stat-val">🔥 {digest.streak}</span>
                    <span className="story-viewer__stat-lbl">дней серии</span>
                  </div>
                  {digest.together > 0 && (
                    <div className="story-viewer__stat">
                      <span className="story-viewer__stat-val">🤝 {digest.together}</span>
                      <span className="story-viewer__stat-lbl">плечом к плечу</span>
                    </div>
                  )}
                  {digest.supportCount > 0 && (
                    <div className="story-viewer__stat">
                      <span className="story-viewer__stat-val">✨ {digest.supportCount}</span>
                      <span className="story-viewer__stat-lbl">поддержек</span>
                    </div>
                  )}
                </div>

                {/* Прочие гордости и благодарности */}
                {digest.prides.length > 1 && (
                  <>
                    <p className="story-viewer__label">🔥 Ещё в этом дне</p>
                    <ul className="story-viewer__list">
                      {digest.prides.slice(1).map((p, i) => (
                        <li key={i} className="story-viewer__list-item">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {digest.gratitudes.length > 0 && (
                  <>
                    <p className="story-viewer__label">❤️ Благодарности</p>
                    <ul className="story-viewer__list">
                      {digest.gratitudes.map((g, i) => (
                        <li key={i} className="story-viewer__list-item story-viewer__list-item--warm">
                          {g}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {digest.tags.length > 0 && (
                  <div className="story-viewer__tags">
                    {digest.tags.map((tag, i) => (
                      <span key={`${tag}-${i}`} className="story-viewer__tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="story-viewer__sheet-actions">
                  <button
                    type="button"
                    className="story-viewer__cta"
                    onClick={() => setPanel('share')}
                  >
                    <Share2 size={16} /> Поделиться этим днём
                  </button>
                  <button
                    type="button"
                    className="story-viewer__cta story-viewer__cta--ghost"
                    onClick={() => setPanel('none')}
                  >
                    Вернуться к сторис
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Шеринг «куда угодно» */}
        <AnimatePresence>
          {panel === 'share' && (
            <motion.section
              className="story-viewer__sheet story-viewer__sheet--share"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              aria-label="Поделиться сторис"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="story-viewer__sheet-head">
                <span className="story-viewer__sheet-title">
                  <Share2 size={15} className="story-viewer__sheet-ico" />
                  Поделиться сторис
                </span>
                <button
                  type="button"
                  className="story-viewer__sheet-close"
                  onClick={() => setPanel('none')}
                  aria-label="Закрыть окно шеринга"
                >
                  <X size={18} />
                </button>
              </header>

              <div className="story-viewer__sheet-body">
                <p className="story-viewer__sheet-meta">
                  Карточка 9:16 (1080×1920) или мгновенная отправка — Telegram, буфер, системное
                  меню.
                </p>

                <div className="story-viewer__share-actions">
                  <button
                    type="button"
                    className="story-viewer__share-btn story-viewer__share-btn--primary"
                    onClick={handleDownloadCard}
                    disabled={sharing}
                  >
                    <Download size={18} />
                    <span>{sharing ? 'Собираю карточку…' : 'Скачать карточку (PNG)'}</span>
                  </button>
                  <button
                    type="button"
                    className="story-viewer__share-btn"
                    onClick={handleTelegram}
                  >
                    <Send size={18} />
                    <span>Отправить в Telegram</span>
                  </button>
                  <button
                    type="button"
                    className="story-viewer__share-btn"
                    onClick={handleCopyText}
                  >
                    <Copy size={18} />
                    <span>{copiedText ? 'Текст скопирован!' : 'Скопировать текст'}</span>
                  </button>
                  <button
                    type="button"
                    className="story-viewer__share-btn"
                    onClick={handleCopyLink}
                  >
                    <Link2 size={18} />
                    <span>{copiedLink ? 'Ссылка скопирована!' : 'Скопировать ссылку'}</span>
                  </button>
                  <button
                    type="button"
                    className="story-viewer__share-btn"
                    onClick={handleNativeShare}
                    disabled={sharing}
                  >
                    <Share2 size={18} />
                    <span>Поделиться в… (системно)</span>
                  </button>
                </div>

                <p className="story-viewer__share-hint">
                  <MapPin size={13} aria-hidden="true" /> {story.name} · @{story.username}
                </p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Просмотр одного фото дня */}
        <AnimatePresence>
          {activePhoto && (
            <motion.div
              className="story-viewer__photo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightbox(null)}
              role="dialog"
              aria-label={`Фото: ${activePhoto.caption}`}
            >
              <button
                type="button"
                className="story-viewer__photo-close"
                onClick={() => setLightbox(null)}
                aria-label="Закрыть фото"
              >
                <X size={20} />
              </button>
              <div className="story-viewer__photo-frame" onClick={(e) => e.stopPropagation()}>
                <StoryPhotoTile photo={activePhoto} />
                <span className="story-viewer__photo-cap">
                  {activePhoto.emoji} {activePhoto.caption}
                </span>
                {photos.length > 1 && (
                  <div className="story-viewer__photo-nav">
                    <button
                      type="button"
                      onClick={() =>
                        setLightbox((cur) =>
                          cur === null ? 0 : (cur - 1 + photos.length) % photos.length
                        )
                      }
                      aria-label="Предыдущее фото"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="story-viewer__photo-index">
                      {(lightbox ?? 0) + 1} / {photos.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLightbox((cur) => (cur === null ? 0 : (cur + 1) % photos.length))}
                      aria-label="Следующее фото"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

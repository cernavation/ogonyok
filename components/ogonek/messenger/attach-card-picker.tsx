'use client'

import { motion } from 'framer-motion'
import { Flame, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { buildGratitudeAttachment, buildPrideAttachment, buildStoryAttachment } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import { getGratitudeText, type ChatAttachment, type Day, type MyStory, type StorySlide } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ChatAttachmentCard } from './chat-attachment-card'

type Props = {
  onPick: (attachment: ChatAttachment) => void
  onClose: () => void
  soundEnabled?: boolean
}

type Tab = 'prides' | 'gratitudes' | 'stories'

function myStoryToSlide(story: MyStory): StorySlide {
  return {
    id: story.id,
    emoji: story.emoji,
    kicker: story.kicker,
    headline: story.headline,
    detail: story.detail,
    from: story.from,
    to: story.to,
    accent: story.accent,
    photo: story.photo ?? null,
  }
}

/**
 * ЭТАП 13 — Подбор карточки для вложения в чат.
 * Показывает свежие гордости из летописи и мои кадры сторис, чтобы прикрепить
 * любую карточку к сообщению в один клик. Открывается из поля ввода.
 */
export function AttachCardPicker({ onPick, onClose, soundEnabled = true }: Props) {
  const { state } = useOgonekStore()
  const [tab, setTab] = useState<Tab>('prides')

  const days = state.days ?? []
  const myStories = state.myStories ?? []

  const prideCards = useMemo(() => {
    const cards: Array<{ key: string; attachment: ChatAttachment }> = []
    for (const day of days) {
      for (let i = 0; i < day.prides.length; i += 1) {
        if (!day.prides[i]?.text) continue
        cards.push({ key: `${day.id}-${i}`, attachment: buildPrideAttachment(day, i) })
        if (cards.length >= 18) return cards
      }
    }
    return cards
  }, [days])

  const gratitudeCards = useMemo(() => {
    const cards: Array<{ key: string; attachment: ChatAttachment }> = []
    for (const day of days) {
      for (let i = 0; i < day.gratitudes.length; i += 1) {
        const text = getGratitudeText(day.gratitudes[i])
        if (!text || text === '—') continue
        cards.push({ key: `g-${day.id}-${i}`, attachment: buildGratitudeAttachment(day, i) })
        if (cards.length >= 18) return cards
      }
    }
    return cards
  }, [days])

  const storyCards = useMemo(
    () =>
      myStories.map((story) => ({
        key: story.id,
        attachment: buildStoryAttachment({
          storyId: `my-${story.id}`,
          authorName: state.profile.displayName,
          username: state.profile.username,
          slide: myStoryToSlide(story),
          slideIndex: 0,
          totalSlides: 1,
          photo: story.photo ?? null,
          visibility: story.visibility,
        }),
      })),
    [myStories, state.profile.displayName, state.profile.username]
  )

  const items = tab === 'prides' ? prideCards : tab === 'gratitudes' ? gratitudeCards : storyCards

  if (typeof document === 'undefined') return null

  return createPortal(
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Прикрепить карточку"
    >
      <motion.div
        className="modal"
        style={{ maxWidth: 520 }}
        initial={{ y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.98 }}
      >
        <header>
          <h2>Прикрепить карточку</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </header>

        <p className="modal-intro">
          Перешли другу гордость из летописи или кадр своей сторис — карточка уедет прямо в чат.
        </p>

        <div className="modal-tabs" role="tablist" aria-label="Тип карточки">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'prides'}
            className={tab === 'prides' ? 'is-active' : ''}
            onClick={() => {
              playClick(soundEnabled)
              setTab('prides')
            }}
          >
            <Flame size={15} /> Гордости ({prideCards.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'gratitudes'}
            className={tab === 'gratitudes' ? 'is-active' : ''}
            onClick={() => {
              playClick(soundEnabled)
              setTab('gratitudes')
            }}
          >
            <Sparkles size={15} /> Благодарности ({gratitudeCards.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'stories'}
            className={tab === 'stories' ? 'is-active' : ''}
            onClick={() => {
              playClick(soundEnabled)
              setTab('stories')
            }}
          >
            <Sparkles size={15} /> Мои сторис ({storyCards.length})
          </button>
        </div>

        {items.length === 0 ? (
          <p className="empty-state__desc" style={{ marginTop: 16 }}>
            {tab === 'prides'
              ? 'В летописи пока нет гордостей — запиши день, и карточки появятся здесь.'
              : 'Моих сторис пока нет — опубликуй кадр, и он станет доступен для отправки.'}
          </p>
        ) : (
          <div className="attach-grid">
            {items.map(({ key, attachment }) => (
              <button
                key={key}
                type="button"
                className="attach-card"
                onClick={() => {
                  playClick(soundEnabled)
                  onPick(attachment)
                }}
                aria-label={`Прикрепить: ${attachment.title}`}
              >
                <ChatAttachmentCard attachment={attachment} compact />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  )
}

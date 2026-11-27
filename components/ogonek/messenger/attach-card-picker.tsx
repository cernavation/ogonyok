'use client'

import { motion } from 'framer-motion'
import { Flame, Search, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  buildGratitudeAttachment,
  buildPrideAttachment,
  buildStoryAttachment,
  type AttachmentAuthorMeta,
} from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import { getGratitudeText, type ChatAttachment, type MyStory, type StorySlide } from '@/lib/ogonek/types'
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
 * Показывает последние 10 дней (или все дни при поиске) аккуратным прокручиваемым списком.
 */
export function AttachCardPicker({ onPick, onClose, soundEnabled = true }: Props) {
  const { state, currentUser } = useOgonekStore()
  const [tab, setTab] = useState<Tab>('prides')
  const [searchQuery, setSearchQuery] = useState('')

  const days = useMemo(
    () => [...(state.days ?? [])].sort((a, b) => (b.id || 0) - (a.id || 0)),
    [state.days]
  )
  const myStories = state.myStories ?? []

  const authorMeta: AttachmentAuthorMeta = useMemo(
    () => ({
      name: currentUser?.displayName || state.profile.displayName,
      username: currentUser?.username || state.profile.username,
      avatarUrl: currentUser?.avatarImage || state.profile.avatarImage || null,
      avatarColor: currentUser?.avatarColor || state.profile.avatarColor || '#FF5C00',
      verified: Boolean(state.profile.verified),
    }),
    [currentUser, state.profile]
  )

  const trimmedQuery = searchQuery.trim().toLowerCase()
  const sourceDays = useMemo(
    () => (trimmedQuery ? days : days.slice(0, 10)),
    [days, trimmedQuery]
  )

  const prideCards = useMemo(() => {
    const cards: Array<{ key: string; attachment: ChatAttachment }> = []
    for (const day of sourceDays) {
      if (Array.isArray(day.prides)) {
        for (let i = 0; i < day.prides.length; i += 1) {
          const text = day.prides[i]?.text?.trim()
          if (!text || text === '—') continue
          const att = buildPrideAttachment(day, i, authorMeta)
          if (
            trimmedQuery &&
            !att.title.toLowerCase().includes(trimmedQuery) &&
            !String(day.id).includes(trimmedQuery) &&
            !att.subtitle.toLowerCase().includes(trimmedQuery)
          ) {
            continue
          }
          cards.push({ key: `${day.id}-${i}`, attachment: att })
        }
      }
    }
    return cards
  }, [sourceDays, authorMeta, trimmedQuery])

  const gratitudeCards = useMemo(() => {
    const cards: Array<{ key: string; attachment: ChatAttachment }> = []
    for (const day of sourceDays) {
      for (let i = 0; i < (day.gratitudes?.length ?? 0); i += 1) {
        const text = getGratitudeText(day.gratitudes[i])
        if (!text || text === '—') continue
        const att = buildGratitudeAttachment(day, i, authorMeta)
        if (
          trimmedQuery &&
          !att.title.toLowerCase().includes(trimmedQuery) &&
          !String(day.id).includes(trimmedQuery)
        ) {
          continue
        }
        cards.push({ key: `g-${day.id}-${i}`, attachment: att })
      }
    }
    return cards
  }, [sourceDays, authorMeta, trimmedQuery])

  const storyCards = useMemo(
    () =>
      myStories
        .map((story) => ({
          key: story.id,
          attachment: {
            ...buildStoryAttachment({
              storyId: `my-${story.id}`,
              authorName: authorMeta.name || state.profile.displayName,
              username: authorMeta.username || state.profile.username,
              slide: myStoryToSlide(story),
              slideIndex: 0,
              totalSlides: 1,
              photo: story.photo ?? null,
              visibility: story.visibility,
            }),
            authorUsername: authorMeta.username,
            authorAvatar: authorMeta.avatarUrl,
            authorAvatarColor: authorMeta.avatarColor,
            authorVerified: authorMeta.verified,
          },
        }))
        .filter(({ attachment }) =>
          trimmedQuery ? attachment.title.toLowerCase().includes(trimmedQuery) : true
        ),
    [myStories, authorMeta, state.profile.displayName, state.profile.username, trimmedQuery]
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
        className="modal flex flex-col max-h-[85vh]"
        style={{ maxWidth: 540 }}
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
          {trimmedQuery
            ? 'Поиск по всем записям летописи:'
            : 'Последние 10 дней летописи — выбери гордость, благодарность или сторис.'}
        </p>

        {/* Поиск по записям */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-2)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по тексту или номеру дня..."
            className="w-full h-9 rounded-full border border-[var(--line)] bg-[var(--bg)] pl-9 pr-4 text-xs text-[var(--text)] placeholder:text-[var(--text-2)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="modal-tabs shrink-0" role="tablist" aria-label="Тип карточки">
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
            {trimmedQuery
              ? `Ничего не найдено по запросу «${trimmedQuery}».`
              : tab === 'prides'
                ? 'В летописи пока нет гордостей — запиши день, и карточки появятся здесь.'
                : 'Моих сторис пока нет — опубликуй кадр, и он станет доступен для отправки.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1 max-h-[340px] mt-3">
            {items.map(({ key, attachment }) => (
              <button
                key={key}
                type="button"
                className="text-left w-full hover:scale-[1.01] transition-transform cursor-pointer"
                onClick={() => {
                  playClick(soundEnabled)
                  onPick(attachment)
                }}
                aria-label={`Прикрепить: ${attachment.title}`}
              >
                <ChatAttachmentCard attachment={attachment} />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  )
}

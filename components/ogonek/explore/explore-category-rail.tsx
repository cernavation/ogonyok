'use client'

import { Flame } from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import {
  EXPLORE_CATEGORIES,
  EXPLORE_TRENDING_TAGS,
  countPostsByCategory,
  formatCommunityCount,
  type ExploreCategoryId,
} from '@/lib/ogonek/explore-content'

type Props = {
  activeCategory: ExploreCategoryId | null
  activeTag: string | null
  onSelectCategory: (id: ExploreCategoryId | null) => void
  onSelectTag: (tag: string | null) => void
  soundEnabled?: boolean
}

/**
 * РЕЛЬС КАТЕГОРИЙ И ТРЕНДОВ.
 * Пять тематических направлений сообщества + облако трендовых тегов.
 * Тап по категории фильтрует фото-сетку достижений; тап по тегу — тоже.
 */
export function ExploreCategoryRail({
  activeCategory,
  activeTag,
  onSelectCategory,
  onSelectTag,
  soundEnabled = true,
}: Props) {
  return (
    <section className="xh-rail" aria-label="Категории сообщества">
      <div className="xh-rail__head">
        <h2>Направления пути</h2>
        {(activeCategory || activeTag) && (
          <button
            type="button"
            className="xh-rail__reset"
            onClick={() => {
              playClick(soundEnabled)
              onSelectCategory(null)
              onSelectTag(null)
            }}
          >
            Сбросить фильтр
          </button>
        )}
      </div>

      <div className="xh-cat-grid">
        {EXPLORE_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id && !activeTag
          return (
            <button
              key={cat.id}
              type="button"
              className={`xh-cat ${active ? 'is-active' : ''}`}
              style={{
                background: `linear-gradient(150deg, ${cat.from}, ${cat.to})`,
                borderColor: active ? cat.accent : undefined,
              }}
              onClick={() => {
                playClick(soundEnabled)
                onSelectTag(null)
                onSelectCategory(active ? null : cat.id)
              }}
              aria-pressed={active}
            >
              <span className="xh-cat__glow" style={{ background: cat.accent }} aria-hidden="true" />
              <span className="xh-cat__top">
                <span className="xh-cat__emoji">{cat.emoji}</span>
                <span className="xh-cat__count" style={{ color: cat.accent }}>
                  {countPostsByCategory(cat.id)} фото
                </span>
              </span>
              <span className="xh-cat__label">{cat.label}</span>
              <span className="xh-cat__tag">{cat.tag}</span>
              <span className="xh-cat__desc">{cat.description}</span>
              <span className="xh-cat__members">
                {formatCommunityCount(cat.memberCount)} человек
              </span>
            </button>
          )
        })}
      </div>

      <div className="xh-trend">
        <span className="xh-trend__title">
          <Flame size={14} /> В тренде сегодня
        </span>
        <div className="xh-trend__row">
          {EXPLORE_TRENDING_TAGS.map((tag) => {
            const active = activeTag === tag.tag
            return (
              <button
                key={tag.tag}
                type="button"
                className={`xh-trend__chip ${active ? 'is-active' : ''}`}
                onClick={() => {
                  playClick(soundEnabled)
                  onSelectCategory(null)
                  onSelectTag(active ? null : tag.tag)
                }}
                aria-pressed={active}
              >
                {tag.tag}
                <em>{formatCommunityCount(tag.count)}</em>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

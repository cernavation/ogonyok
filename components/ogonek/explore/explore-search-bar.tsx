'use client'

import { Clock, Hash, Search, Sparkles, TrendingUp, User as UserIcon, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { playClick } from '@/lib/ogonek/sound'
import {
  formatCommunityCount,
  getCommunityUser,
  searchExplore,
  type ExploreCategory,
  type ExploreCategoryId,
} from '@/lib/ogonek/explore-content'
import { CommunityAvatar } from './community-avatar'

type Props = {
  value: string
  onChange: (value: string) => void
  /** Зафиксировать запрос (Enter / выбор подсказки) — идёт в недавние */
  onCommit: (value: string) => void
  onPickTag: (tag: string) => void
  onPickUser: (id: string) => void
  onPickCategory: (id: ExploreCategoryId) => void
  onPickPost: (id: string) => void
  recentSearches: string[]
  onRemoveRecent: (query: string) => void
  onClearRecent: () => void
  soundEnabled?: boolean
}

/**
 * ЖИВОЙ ПОИСК ПО ВСЕЙ СОЦСЕТИ.
 * Одна строка ищет людей, теги, категории и фото-достижения сообщества.
 * Подсказки появляются прямо под полем, недавние запросы — когда поле пустое.
 */
export function ExploreSearchBar({
  value,
  onChange,
  onCommit,
  onPickTag,
  onPickUser,
  onPickCategory,
  onPickPost,
  recentSearches,
  onRemoveRecent,
  onClearRecent,
  soundEnabled = true,
}: Props) {
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => searchExplore(value, 6), [value])
  const hasQuery = value.trim().length > 0
  const showPanel = focused && (hasQuery ? results.total > 0 : recentSearches.length > 0)

  useEffect(() => {
    if (!focused) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [focused])

  const pick = (fn: () => void) => {
    playClick(soundEnabled)
    fn()
    setFocused(false)
  }

  const commit = (query: string) => {
    const clean = query.trim()
    if (clean) onCommit(clean)
  }

  const pickCategory = (cat: ExploreCategory) =>
    pick(() => {
      commit(cat.label)
      onPickCategory(cat.id)
    })

  return (
    <div className={`xh-search ${focused ? 'is-focused' : ''}`} ref={wrapRef}>
      <div className="xh-search__field">
        <Search size={18} className="xh-search__icon" aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit(value)
              setFocused(false)
            }
            if (e.key === 'Escape') setFocused(false)
          }}
          placeholder="Ищи людей, #Спорт, #Бизнес, достижения…"
          aria-label="Живой поиск по сообществу"
        />
        {hasQuery && (
          <button
            type="button"
            className="xh-search__clear"
            onClick={() => {
              playClick(soundEnabled)
              onChange('')
            }}
            aria-label="Очистить поиск"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="xh-search__panel" role="listbox" aria-label="Подсказки поиска">
          {hasQuery ? (
            <>
              {results.categories.length > 0 && (
                <div className="xh-suggest__group">
                  <span className="xh-suggest__title">
                    <Sparkles size={12} /> Категории
                  </span>
                  {results.categories.slice(0, 2).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className="xh-suggest"
                      onClick={() => pickCategory(cat)}
                    >
                      <span className="xh-suggest__emoji">{cat.emoji}</span>
                      <span className="xh-suggest__main">
                        <b>
                          {cat.label} <em>{cat.tag}</em>
                        </b>
                        <small>{formatCommunityCount(cat.memberCount)} участников</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results.tags.length > 0 && (
                <div className="xh-suggest__group">
                  <span className="xh-suggest__title">
                    <Hash size={12} /> Теги
                  </span>
                  {results.tags.slice(0, 5).map((tag) => (
                    <button
                      key={tag.tag}
                      type="button"
                      className="xh-suggest"
                      onClick={() =>
                        pick(() => {
                          commit(tag.tag)
                          onPickTag(tag.tag)
                        })
                      }
                    >
                      <span className="xh-suggest__emoji">
                        <Hash size={15} />
                      </span>
                      <span className="xh-suggest__main">
                        <b>{tag.tag}</b>
                        <small>{formatCommunityCount(tag.count)} публикаций</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results.users.length > 0 && (
                <div className="xh-suggest__group">
                  <span className="xh-suggest__title">
                    <UserIcon size={12} /> Люди
                  </span>
                  {results.users.slice(0, 4).map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="xh-suggest"
                      onClick={() =>
                        pick(() => {
                          commit(user.name)
                          onPickUser(user.id)
                        })
                      }
                    >
                      <CommunityAvatar user={user} size={34} />
                      <span className="xh-suggest__main">
                        <b>
                          {user.name}
                          {user.isMe && <em> · ты</em>}
                        </b>
                        <small>
                          @{user.username} · 🔥 {user.streak}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results.posts.length > 0 && (
                <div className="xh-suggest__group">
                  <span className="xh-suggest__title">
                    <TrendingUp size={12} /> Достижения
                  </span>
                  {results.posts.slice(0, 3).map((post) => {
                    const author = getCommunityUser(post.authorId)
                    return (
                      <button
                        key={post.id}
                        type="button"
                        className="xh-suggest"
                        onClick={() =>
                          pick(() => {
                            commit(post.kicker)
                            onPickPost(post.id)
                          })
                        }
                      >
                        <span
                          className="xh-suggest__thumb"
                          style={{ background: `linear-gradient(150deg, ${post.from}, ${post.to})` }}
                        >
                          {post.emoji}
                        </span>
                        <span className="xh-suggest__main">
                          <b>{post.kicker.toLowerCase()}</b>
                          <small>
                            {author?.name ?? 'Сообщество'} · {post.city}
                          </small>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="xh-suggest__group">
              <span className="xh-suggest__title">
                <Clock size={12} /> Недавние запросы
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    className="xh-suggest__clear"
                    onClick={() => {
                      playClick(soundEnabled)
                      onClearRecent()
                    }}
                  >
                    Очистить
                  </button>
                )}
              </span>
              {recentSearches.length === 0 ? (
                <p className="xh-suggest__empty">
                  Начни вводить имя человека, тег или город — поиск живой.
                </p>
              ) : (
                recentSearches.map((q) => (
                  <div key={q} className="xh-suggest xh-suggest--recent">
                    <button
                      type="button"
                      className="xh-suggest__recent-main"
                      onClick={() =>
                        pick(() => {
                          onChange(q)
                          onCommit(q)
                        })
                      }
                    >
                      <Clock size={14} />
                      <span>{q}</span>
                    </button>
                    <button
                      type="button"
                      className="xh-suggest__recent-remove"
                      onClick={() => {
                        playClick(soundEnabled)
                        onRemoveRecent(q)
                      }}
                      aria-label={`Убрать запрос «${q}»`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

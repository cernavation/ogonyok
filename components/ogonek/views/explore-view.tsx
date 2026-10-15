'use client'

import {
  ArrowLeft,
  Compass,
  Flame,
  Hash,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { playClick } from '@/lib/ogonek/sound'
import {
  EXPLORE_CATEGORY_BY_ID,
  formatCommunityCount,
  getCommunityFeed,
  getTodayHighlights,
  getTopStreakLeaders,
  normalizeExploreQuery,
  searchExplore,
  type ExploreCategoryId,
  type ExploreTag,
} from '@/lib/ogonek/explore-content'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { Day, ViewId } from '@/lib/ogonek/types'
import { DayCard } from '../day-card'
import { MobileHeader } from '../mobile-header'
import {
  CommunityAvatar,
  CommunityPhotoGrid,
  CommunityUserModal,
  ExploreCategoryRail,
  ExplorePostModal,
  ExploreSearchBar,
  StreakLeaders,
  TodayHighlights,
} from '../explore'

type Props = {
  days: Day[]
  onNavigate: (view: ViewId) => void
  onLightbox: (url: string) => void
  onNotify: (msg: string) => void
  onSelectDay?: (dayId: number) => void
  onEditDay?: (day: Day) => void
  soundEnabled?: boolean
}

/** Подсветка совпадения внутри собственных записей пользователя */
function highlightText(text: string, query: string): ReactNode {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  if (parts.length <= 1) return text
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-orange-500/20 text-orange-400 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

/**
 * ЭТАП 12 — ГЛОБАЛЬНЫЙ ХАБ ИССЛЕДОВАНИЯ.
 * Раздел «Поиск» превращён в сердце соцсети: живой поиск по людям, тегам и
 * категориям (#Спорт, #Бизнес, #Учеба, #Memernity, #Здоровье), фильтр
 * «Лучшее за сегодня в мире», фото-сетка достижений сообщества и топ лидеров
 * по стрикам. Плюс — поиск по собственным записям дневника.
 */
export function ExploreView({
  days,
  onNavigate,
  onLightbox,
  onNotify,
  onSelectDay,
  onEditDay,
  soundEnabled = true,
}: Props) {
  const {
    state,
    toggleExploreFollow,
    addExploreSearch,
    removeExploreSearch,
    clearExploreSearches,
  } = useOgonekStore()

  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<ExploreCategoryId | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const [openPostId, setOpenPostId] = useState<string | null>(null)

  const recentSearches = state.exploreRecentSearches ?? []
  const followingIds = state.exploreFollowingIds ?? []

  const hasQuery = query.trim().length > 0
  const results = useMemo(() => searchExplore(query, 12), [query])
  const feed = useMemo(
    () => getCommunityFeed({ categoryId: activeCategory, tag: activeTag }),
    [activeCategory, activeTag]
  )
  const highlights = useMemo(() => getTodayHighlights(5), [])
  const leaders = useMemo(() => getTopStreakLeaders(8), [])

  const ownResults = useMemo(() => {
    const q = normalizeExploreQuery(query)
    if (!q) return []
    return days
      .filter((day) => {
        if (normalizeExploreQuery(day.title).includes(q)) return true
        if (day.tags.some((t) => normalizeExploreQuery(t).includes(q))) return true
        if (day.prides.some((p) => normalizeExploreQuery(p.text).includes(q))) return true
        if (
          day.gratitudes.some((g) =>
            normalizeExploreQuery(typeof g === 'string' ? g : g.text).includes(q)
          )
        )
          return true
        return false
      })
      .slice(0, 12)
  }, [days, query])

  const activeFilterLabel = activeTag
    ? activeTag
    : activeCategory
      ? EXPLORE_CATEGORY_BY_ID[activeCategory].label
      : null

  const clearQuery = () => setQuery('')

  const handlePickTag = (tag: string) => {
    setActiveTag(tag)
    setActiveCategory(null)
    clearQuery()
  }

  const handlePickCategory = (id: ExploreCategoryId) => {
    setActiveCategory(id)
    setActiveTag(null)
    clearQuery()
  }

  const totalFound = results.total + ownResults.length

  return (
    <div className="view-explore">
      <MobileHeader title="Исследование" />

      <header className="view-header">
        <button
          type="button"
          className="back-button"
          onClick={() => onNavigate('home')}
          aria-label="Вернуться на главную"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>Исследование</h1>
          <p className="view-subtitle">
            Люди, теги и достижения всего сообщества Огонька в одном месте
          </p>
        </div>
      </header>

      <div className="explore-content">
        <ExploreSearchBar
          value={query}
          onChange={setQuery}
          onCommit={addExploreSearch}
          onPickTag={handlePickTag}
          onPickCategory={handlePickCategory}
          onPickUser={(id) => setOpenUserId(id)}
          onPickPost={(id) => setOpenPostId(id)}
          recentSearches={recentSearches}
          onRemoveRecent={removeExploreSearch}
          onClearRecent={clearExploreSearches}
          soundEnabled={soundEnabled}
        />

        {hasQuery ? (
          /* ── РЕЖИМ ЖИВОГО ПОИСКА ────────────────────────────────────── */
          <div className="xh-results">
            <div className="xh-results__bar">
              <span>
                Найдено <b>{totalFound}</b> результатов по «{query.trim()}»
              </span>
              <button type="button" className="xh-results__clear" onClick={clearQuery}>
                Сбросить
              </button>
            </div>

            {totalFound === 0 && (
              <div className="empty-state" role="status">
                <p className="empty-state__title">Ничего не найдено</p>
                <p className="empty-state__desc">
                  По запросу «{query.trim()}» совпадений нет. Попробуй другое имя, город или тег —
                  например #Спорт, #Бизнес, #Учеба, #Memernity.
                </p>
              </div>
            )}

            {(results.categories.length > 0 || results.tags.length > 0) && (
              <section className="xh-results__block" aria-label="Категории и теги">
                <div className="xh-results__label">
                  <Hash size={14} /> Категории и теги
                </div>
                <div className="xh-results__chips">
                  {results.categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className="xh-results__cat"
                      style={{ borderColor: `${cat.accent}66`, color: cat.accent }}
                      onClick={() => handlePickCategory(cat.id)}
                    >
                      {cat.emoji} {cat.tag}
                    </button>
                  ))}
                  {results.tags.map((tag: ExploreTag) => (
                    <button
                      key={tag.tag}
                      type="button"
                      className="xh-results__tag"
                      onClick={() => handlePickTag(tag.tag)}
                    >
                      {tag.tag}
                      <em>{formatCommunityCount(tag.count)}</em>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {results.users.length > 0 && (
              <section className="xh-results__block" aria-label="Люди">
                <div className="xh-results__label">
                  <Users size={14} /> Люди
                </div>
                <ul className="xh-people">
                  {results.users.map((user) => {
                    const isFollowing = followingIds.includes(user.id)
                    return (
                      <li key={user.id} className="xh-person-row">
                        <button
                          type="button"
                          className="xh-person"
                          onClick={() => setOpenUserId(user.id)}
                        >
                          <CommunityAvatar user={user} size={42} ring={isFollowing} />
                          <span className="xh-person__text">
                            <b>
                              {user.name}
                              {user.isMe && <em className="xh-person__you">ты</em>}
                            </b>
                            <small>
                              @{user.username} · {user.city} · 🔥 {user.streak}
                            </small>
                          </span>
                        </button>
                        {!user.isMe && (
                          <button
                            type="button"
                            className={`xh-follow ${isFollowing ? 'is-following' : ''}`}
                            onClick={() => {
                              const now = toggleExploreFollow(user.id)
                              playClick(soundEnabled)
                              onNotify(
                                now ? `Ты читаешь @${user.username} ✓` : `Отписка от @${user.username}`
                              )
                            }}
                            aria-pressed={isFollowing}
                          >
                            {isFollowing ? 'Читаю' : <><Plus size={14} /> Читать</>}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {results.posts.length > 0 && (
              <section className="xh-results__block" aria-label="Достижения сообщества">
                <div className="xh-results__label">
                  <Sparkles size={14} /> Достижения сообщества
                </div>
                <CommunityPhotoGrid
                  posts={results.posts}
                  onOpenPost={setOpenPostId}
                  onNotify={onNotify}
                  soundEnabled={soundEnabled}
                />
              </section>
            )}

            {ownResults.length > 0 && (
              <section className="xh-results__block" aria-label="Мои записи">
                <div className="xh-results__label">
                  <Flame size={14} /> Мои записи ({ownResults.length})
                </div>
                <div className="search-results">
                  {ownResults.map((day) => (
                    <DayCard
                      key={day.id}
                      day={day}
                      onLightbox={onLightbox}
                      onNotify={onNotify}
                      onEdit={onEditDay}
                      soundEnabled={soundEnabled}
                    />
                  ))}
                </div>
                <p className="xh-results__hint">
                  Подсветка показывает совпадения в твоих записях: «
                  {query.trim()}».
                </p>
              </section>
            )}
          </div>
        ) : (
          /* ── РЕЖИМ ХАБА ИССЛЕДОВАНИЯ ────────────────────────────────── */
          <>
            <section className="xh-stats" aria-label="Сообщество в цифрах">
              <div className="xh-stats__item">
                <b>412K</b>
                <small>участников</small>
              </div>
              <div className="xh-stats__item">
                <b>3.6K</b>
                <small>достижений в фото-ленте</small>
              </div>
              <div className="xh-stats__item">
                <b>5</b>
                <small>категорий пути</small>
              </div>
              <button
                type="button"
                className="xh-stats__cta"
                onClick={() => {
                  playClick(soundEnabled)
                  setQuery('#Спорт')
                }}
              >
                <Search size={14} /> Смотреть #Спорт
              </button>
            </section>

            <ExploreCategoryRail
              activeCategory={activeCategory}
              activeTag={activeTag}
              onSelectCategory={setActiveCategory}
              onSelectTag={setActiveTag}
              soundEnabled={soundEnabled}
            />

            <TodayHighlights
              posts={highlights}
              onOpenPost={setOpenPostId}
              onOpenUser={setOpenUserId}
              onNotify={onNotify}
              soundEnabled={soundEnabled}
            />

            <StreakLeaders
              users={leaders}
              onOpenUser={setOpenUserId}
              onNotify={onNotify}
              soundEnabled={soundEnabled}
            />

            <section className="xh-feed" aria-labelledby="xh-feed-title">
              <div className="xh-section__head">
                <h2 id="xh-feed-title">
                  <Compass size={16} className="xh-section__icon" /> Фото-достижения сообщества
                </h2>
                {activeFilterLabel ? (
                  <button
                    type="button"
                    className="xh-section__filter is-active"
                    onClick={() => {
                      playClick(soundEnabled)
                      setActiveCategory(null)
                      setActiveTag(null)
                    }}
                  >
                    {activeFilterLabel} · сбросить
                  </button>
                ) : (
                  <span className="xh-section__badge">{feed.length} фото</span>
                )}
              </div>

              <CommunityPhotoGrid
                posts={feed}
                onOpenPost={setOpenPostId}
                onNotify={onNotify}
                soundEnabled={soundEnabled}
                emptyTitle="Здесь пока тихо"
                emptyDesc="Под этим фильтром достижений нет. Сбросим фильтр и вернёмся ко всей ленте."
              />
            </section>
          </>
        )}
      </div>

      {openUserId && (
        <CommunityUserModal
          userId={openUserId}
          onClose={() => setOpenUserId(null)}
          onNotify={onNotify}
          onOpenPost={(postId) => {
            setOpenUserId(null)
            setOpenPostId(postId)
          }}
          onOpenCategory={handlePickCategory}
          soundEnabled={soundEnabled}
        />
      )}

      {openPostId && (
        <ExplorePostModal
          postId={openPostId}
          onClose={() => setOpenPostId(null)}
          onNotify={onNotify}
          onOpenUser={(userId) => {
            setOpenPostId(null)
            setOpenUserId(userId)
          }}
          onFilterTag={handlePickTag}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  )
}

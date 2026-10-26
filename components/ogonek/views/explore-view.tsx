'use client'

import {
  ArrowLeft,
  Flame,
  Hash,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { playClick } from '@/lib/ogonek/sound'
import {
  normalizeExploreQuery,
  type ExploreTag,
} from '@/lib/ogonek/explore-content'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { searchProfiles, getRecentProfiles, toggleFriendshipFollow, type ProfileRecord } from '@/lib/supabase/api'
import { getInitials } from '@/lib/ogonek/initials'
import type { Day, ViewId } from '@/lib/ogonek/types'
import { DayCard } from '../day-card'
import { MobileHeader } from '../mobile-header'
import {
  CommunityAvatar,
  ExploreSearchBar,
} from '../explore'

type Props = {
  days: Day[]
  onNavigate: (view: ViewId, targetUserId?: string | null) => void
  onLightbox: (url: string) => void
  onNotify: (msg: string) => void
  onSelectDay?: (dayId: number) => void
  onEditDay?: (day: Day) => void
  soundEnabled?: boolean
}

/**
 * ЧИСТЫЙ РАЗДЕЛ ПОИСКА И ИССЛЕДОВАНИЯ (ТРЕБОВАНИЕ 3):
 * - Удалены все хардкодные боты ("Хана Мори", "Эрик Нордстрём" и др.)
 * - Удалены вымышленные "18.4K участников"
 * - Отображаются ТОЛЬКО реальные зарегистрированные пользователи из базы Supabase
 * - Отображаются ТОЛЬКО реальные теги из опубликованных дней дневника
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
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [dbProfiles, setDbProfiles] = useState<ProfileRecord[]>([])
  const [loading, setLoading] = useState(false)

  const recentSearches = state.exploreRecentSearches ?? []
  const followingIds = state.exploreFollowingIds ?? []

  // Извлечение РЕАЛЬНЫХ тегов из опубликованных дней
  const realTags: ExploreTag[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const day of days) {
      if (Array.isArray(day.tags)) {
        for (const raw of day.tags) {
          const clean = (raw || '').trim()
          if (clean) {
            const formatted = clean.startsWith('#') ? clean : `#${clean}`
            counts.set(formatted, (counts.get(formatted) ?? 0) + 1)
          }
        }
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
  }, [days])

  // Загрузка реальных профилей из базы Supabase (при поиске или пустом запросе)
  useEffect(() => {
    let cancelled = false
    const clean = query.trim().replace(/^@/, '')

    const run = async () => {
      setLoading(true)
      try {
        const list = clean
          ? await searchProfiles(clean, state.profile.username)
          : await getRecentProfiles(24, state.profile.username)
        if (!cancelled) {
          setDbProfiles(list)
        }
      } catch {
        if (!cancelled) setDbProfiles([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const timer = setTimeout(run, clean ? 250 : 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, state.profile.username])

  const hasQuery = query.trim().length > 0

  // Теги, подходящие под запрос
  const matchingTags = useMemo(() => {
    const q = normalizeExploreQuery(query)
    if (!q) return realTags
    return realTags.filter((t) => normalizeExploreQuery(t.tag).includes(q))
  }, [realTags, query])

  // Записи дневника, подходящие под поиск или выбранный тег
  const ownResults = useMemo(() => {
    const q = normalizeExploreQuery(query)
    if (q) {
      return days
        .filter((day) => {
          if (normalizeExploreQuery(day.title).includes(q)) return true
          if (day.tags?.some((t) => normalizeExploreQuery(t).includes(q))) return true
          if (day.prides?.some((p) => normalizeExploreQuery(p.text).includes(q))) return true
          if (
            day.gratitudes?.some((g) =>
              normalizeExploreQuery(typeof g === 'string' ? g : g.text).includes(q)
            )
          ) {
            return true
          }
          return false
        })
        .slice(0, 20)
    }

    if (activeTag) {
      const target = normalizeExploreQuery(activeTag)
      return days.filter((d) =>
        d.tags?.some((t) => normalizeExploreQuery(t) === target)
      )
    }

    return []
  }, [days, query, activeTag])

  // Реальные пользователи из базы Supabase
  const communityUsers = useMemo(() => {
    return dbProfiles.map((p) => ({
      id: p.id,
      name: p.display_name || `@${p.username}`,
      username: p.username,
      initials: getInitials(p.display_name, p.username),
      avatarUrl: p.avatar_url || p.avatar_image || '',
      avatarColor: '#FF5C00',
      city: p.city || '',
      streak: p.streak_count ?? p.streak ?? 0,
      verified: false,
      bio: p.bio || '',
      followers: 0,
      tags: [],
      isMe: p.username === state.profile.username,
    }))
  }, [dbProfiles, state.profile.username])

  const clearQuery = () => {
    setQuery('')
    setActiveTag(null)
  }

  const handlePickTag = (tag: string) => {
    playClick(soundEnabled)
    if (activeTag === tag) {
      setActiveTag(null)
    } else {
      setActiveTag(tag)
      setQuery('')
    }
  }

  const totalFound = communityUsers.length + ownResults.length

  return (
    <div className="view-explore min-h-screen pb-24 text-[var(--text)]">
      <MobileHeader title="Поиск" onOpenProfile={() => onNavigate('profile')} />

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
          onClick={() => onNavigate('home')}
          aria-label="Вернуться на главную"
        >
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1 className="text-[19px] font-extrabold text-[var(--text)] tracking-[-0.02em] leading-tight">
            Поиск и участники
          </h1>
          <p className="text-[13px] text-[var(--text-2)]">
            Реальные пользователи Огонька и теги летописи
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 flex flex-col gap-6">
        {/* Search Bar */}
        <ExploreSearchBar
          value={query}
          onChange={(val) => {
            setQuery(val)
            if (activeTag) setActiveTag(null)
          }}
          onCommit={addExploreSearch}
          onPickTag={handlePickTag}
          onPickCategory={() => {}}
          onPickUser={(id) => onNavigate('profile', id)}
          onPickPost={() => {}}
          recentSearches={recentSearches}
          onRemoveRecent={removeExploreSearch}
          onClearRecent={clearExploreSearches}
          soundEnabled={soundEnabled}
        />

        {/* Selected tag filter banner */}
        {activeTag && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/30 text-sm">
            <span className="flex items-center gap-2 font-bold text-[var(--text)]">
              <Hash size={16} className="text-[var(--accent)]" />
              Фильтр по тегу: <span className="text-[var(--accent)]">{activeTag}</span>
              <span className="text-xs text-[var(--text-2)] font-normal">
                ({ownResults.length} {ownResults.length === 1 ? 'запись' : 'записей'})
              </span>
            </span>
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="px-2.5 py-1 rounded-full text-xs font-bold text-[var(--text)] hover:bg-[var(--bg)] transition-colors inline-flex items-center gap-1"
            >
              <X size={13} />
              Сбросить
            </button>
          </div>
        )}

        {/* Real Tags Cloud (от реальных дней) */}
        {realTags.length > 0 && !hasQuery && (
          <section className="flex flex-col gap-2.5" aria-label="Реальные теги из дней">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Hash size={13} /> Теги из опубликованных дней ({realTags.length})
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {realTags.map(({ tag, count }) => {
                const isActive = activeTag === tag
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handlePickTag(tag)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] shadow-sm'
                        : 'bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] border-[var(--border)]'
                    }`}
                  >
                    <span>{tag}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-black/20 text-white' : 'bg-[var(--surface2)] text-[var(--text-2)]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Search Results Mode */}
        {hasQuery && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between text-xs text-[var(--text-2)] pb-2 border-b border-[var(--border)]">
              <span>
                Результаты поиска по запросу «<b>{query.trim()}</b>»: найдено <b>{totalFound}</b>
              </span>
              <button
                type="button"
                className="font-bold text-[var(--accent)] hover:underline"
                onClick={clearQuery}
              >
                Очистить
              </button>
            </div>

            {totalFound === 0 && !loading && (
              <div className="p-8 text-center rounded-3xl bg-[var(--bg-elev)] border border-[var(--border)]">
                <p className="font-bold text-[15px] text-[var(--text)]">Участники не найдены</p>
                <p className="text-xs text-[var(--text-2)] mt-1">
                  По запросу «{query.trim()}» участников не найдено.
                </p>
              </div>
            )}

            {/* Matching Real Tags */}
            {matchingTags.length > 0 && (
              <section className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-2)] flex items-center gap-1.5">
                  <Hash size={13} /> Подходящие теги
                </span>
                <div className="flex flex-wrap gap-2">
                  {matchingTags.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handlePickTag(t.tag)}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--bg-elev)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text)] flex items-center gap-1.5"
                    >
                      <span>{t.tag}</span>
                      <span className="text-[10px] text-[var(--text-2)]">({t.count})</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Matching Users from Supabase */}
            {communityUsers.length > 0 && (
              <section className="flex flex-col gap-2" aria-label="Пользователи из базы данных">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-2)] flex items-center gap-1.5">
                  <Users size={13} /> Пользователи ({communityUsers.length})
                </span>
                <ul className="flex flex-col divide-y divide-[var(--border)] bg-[var(--bg-elev)] rounded-2xl border border-[var(--border)] overflow-hidden">
                  {communityUsers.map((user) => {
                    const isFollowing = followingIds.includes(user.id)
                    return (
                      <li
                        key={user.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <button
                          type="button"
                          className="flex items-center gap-3 text-left min-w-0 flex-1"
                          onClick={() => {
                            if (user.isMe) {
                              onNavigate('profile', null)
                            } else {
                              onNavigate('profile', user.id)
                            }
                          }}
                        >
                          <CommunityAvatar user={user} size={42} ring={isFollowing} />
                          <div className="min-w-0">
                            <p className="font-bold text-[14px] text-[var(--text)] truncate">
                              {user.name}
                              {user.isMe && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold">
                                  ты
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-[var(--text-2)] truncate">
                              @{user.username} {user.city ? `· ${user.city}` : ''} {user.streak > 0 ? `· 🔥 ${user.streak}` : ''}
                            </p>
                          </div>
                        </button>

                        {!user.isMe && (
                          <button
                            type="button"
                            onClick={async () => {
                              const now = toggleExploreFollow(user.id)
                              playClick(soundEnabled)
                              const currentUid = state.auth.activeAccountId
                              if (currentUid && user.id) {
                                void toggleFriendshipFollow(currentUid, user.id)
                              }
                              onNotify(
                                now ? `Вы читаете @${user.username} ✓` : `Отписка от @${user.username}`
                              )
                            }}
                            className={`min-h-[34px] px-4 rounded-full text-xs font-bold transition-all flex items-center gap-1 flex-none ${
                              isFollowing
                                ? 'bg-transparent border border-[var(--border)] text-[var(--text)] hover:border-rose-500 hover:text-rose-500'
                                : 'bg-[var(--text)] text-[var(--bg)] hover:opacity-90'
                            }`}
                          >
                            {isFollowing ? 'Читаю' : <><Plus size={13} /> Читать</>}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {/* Matching Diary Days */}
            {ownResults.length > 0 && (
              <section className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-2)] flex items-center gap-1.5">
                  <Flame size={13} className="text-[#ff6b35]" /> Записи летописи ({ownResults.length})
                </span>
                <div className="flex flex-col gap-4">
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
              </section>
            )}
          </div>
        )}

        {/* Default View Mode (когда строка поиска пуста) */}
        {!hasQuery && (
          <div className="flex flex-col gap-6">
            {/* Tag Filtered Results (если выбран конкретный тег) */}
            {activeTag && ownResults.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex flex-col gap-4">
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
              </section>
            )}

            {/* Real Registered Users List from Supabase */}
            <section className="flex flex-col gap-3" aria-label="Участники Огонька">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[var(--text)] flex items-center gap-2">
                    <Users size={16} className="text-[var(--accent)]" />
                    Зарегистрированные участники
                  </h2>
                  <p className="text-xs text-[var(--text-2)] mt-0.5">
                    Реальные пользователи из базы Supabase
                  </p>
                </div>
                {communityUsers.length > 0 && (
                  <span className="text-xs font-bold text-[var(--text-2)] px-2.5 py-1 rounded-full bg-[var(--bg-elev)] border border-[var(--border)]">
                    {communityUsers.length} соратников
                  </span>
                )}
              </div>

              {communityUsers.length === 0 && !loading ? (
                <div className="p-8 text-center rounded-3xl bg-[var(--bg-elev)] border border-[var(--border)]">
                  <Users size={28} className="mx-auto text-[var(--text-3)] mb-2" />
                  <p className="font-bold text-[15px] text-[var(--text)]">Пока нет других участников</p>
                  <p className="text-xs text-[var(--text-2)] mt-1 max-w-sm mx-auto">
                    Вы — один из первых пользователей! Поделитесь ссылкой на Огонёк с друзьями, чтобы они зарегистрировались.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-[var(--border)] bg-[var(--bg-elev)] rounded-3xl border border-[var(--border)] overflow-hidden">
                  {communityUsers.map((user) => {
                    const isFollowing = followingIds.includes(user.id)
                    return (
                      <li
                        key={user.id}
                        className="p-4 flex items-center justify-between gap-3 hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <button
                          type="button"
                          className="flex items-center gap-3 text-left min-w-0 flex-1"
                          onClick={() => {
                            if (user.isMe) {
                              onNavigate('profile', null)
                            } else {
                              onNavigate('profile', user.id)
                            }
                          }}
                        >
                          <CommunityAvatar user={user} size={44} ring={isFollowing} />
                          <div className="min-w-0">
                            <p className="font-bold text-[15px] text-[var(--text)] truncate">
                              {user.name}
                              {user.isMe && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold">
                                  ты
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-[var(--text-2)] truncate mt-0.5">
                              @{user.username} {user.city ? `· ${user.city}` : ''} {user.streak > 0 ? `· 🔥 ${user.streak}` : ''}
                            </p>
                            {user.bio && (
                              <p className="text-xs text-[var(--text)] line-clamp-1 mt-1 text-zinc-400">
                                {user.bio}
                              </p>
                            )}
                          </div>
                        </button>

                        {!user.isMe && (
                          <button
                            type="button"
                            onClick={async () => {
                              const now = toggleExploreFollow(user.id)
                              playClick(soundEnabled)
                              const currentUid = state.auth.activeAccountId
                              if (currentUid && user.id) {
                                void toggleFriendshipFollow(currentUid, user.id)
                              }
                              onNotify(
                                now ? `Вы читаете @${user.username} ✓` : `Отписка от @${user.username}`
                              )
                            }}
                            className={`min-h-[36px] px-4 rounded-full text-xs font-bold transition-all flex items-center gap-1 flex-none ${
                              isFollowing
                                ? 'bg-transparent border border-[var(--border)] text-[var(--text)] hover:border-rose-500 hover:text-rose-500'
                                : 'bg-[var(--text)] text-[var(--bg)] hover:opacity-90 active:scale-95'
                            }`}
                          >
                            {isFollowing ? 'Читаю' : <><Plus size={13} /> Читать</>}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

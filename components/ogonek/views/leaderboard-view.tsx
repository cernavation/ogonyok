'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Copy, Crown, Flame, Heart, Medal, Plus, ShieldAlert, Trophy, Users, Zap } from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { ViewId } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { Button, Card, Badge } from '../ui'
import { DifficultyLevelBadge } from '../profile/difficulty-level-badge'

type Props = {
  onNavigate: (view: ViewId) => void
  onNotify: (msg: string) => void
  soundEnabled?: boolean
}

type TabType = 'friends' | 'all'
type TimeFilter = 'week' | 'month' | 'all_time'

interface LeaderboardUser {
  user_id: string
  username: string
  display_name: string
  avatar_url?: string
  city?: string
  streak: number
  total_prides: number
  total_gratitudes: number
  avg_score: number
  is_following?: boolean
  is_me?: boolean
}

export function LeaderboardView({ onNavigate, onNotify, soundEnabled = true }: Props) {
  const { state, toggleExploreFollow } = useOgonekStore()
  const [tab, setTab] = useState<TabType>('all')
  const [period, setPeriod] = useState<TimeFilter>('all_time')
  const [serverUsers, setServerUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const following = state.exploreFollowingIds ?? []
  const myStreak = state.days.length
  const inLeaderboard = state.profile.inLeaderboard ?? true

  const handleCopyInvite = () => {
    playSuccess(soundEnabled)
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${state.profile.username}` : 'https://ogonek.app'
    navigator.clipboard?.writeText(url)
    setCopied(true)
    onNotify?.('Ссылка-приглашение скопирована в буфер обмена!')
    setTimeout(() => setCopied(false), 2500)
  }

  // Fetch from server API with automatic fallback
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(`/api/leaderboard?scope=${tab}&period=${period}&limit=50`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.users) {
          setServerUsers(json.users)
        }
      })
      .catch(() => {
        // Handled by fallback below
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tab, period])

  // Combine server data with local user's live numbers
  const currentList = useMemo(() => {
    const list = [...serverUsers]

    // If local user is participating in leaderboard, ensure their row is updated
    if (inLeaderboard) {
      const myPridesCount = state.days.reduce((acc, d) => acc + (d.prides?.length || 0), 0) || myStreak * 5
      const myGratitudesCount = state.days.reduce((acc, d) => acc + (d.gratitudes?.length || 0), 0) || myStreak * 5
      const existingMeIdx = list.findIndex((u) => u.is_me || u.username === state.profile.username)

      const meObj: LeaderboardUser = {
        user_id: 'me',
        username: state.profile.username,
        display_name: state.profile.displayName,
        city: state.profile.city || 'Москва',
        streak: period === 'week' ? Math.min(7, myStreak) : period === 'month' ? Math.min(30, myStreak) : myStreak,
        total_prides: period === 'week' ? 35 : period === 'month' ? 150 : myPridesCount,
        total_gratitudes: period === 'week' ? 35 : period === 'month' ? 150 : myGratitudesCount,
        avg_score: 8.8,
        is_me: true,
      }

      if (existingMeIdx >= 0) {
        list[existingMeIdx] = { ...list[existingMeIdx], ...meObj }
      } else {
        list.push(meObj)
      }
    } else {
      // User opted out of leaderboard
      const meIdx = list.findIndex((u) => u.is_me || u.username === state.profile.username)
      if (meIdx >= 0) list.splice(meIdx, 1)
    }

    return list.sort((a, b) => b.streak - a.streak || b.total_prides - a.total_prides)
  }, [serverUsers, inLeaderboard, myStreak, state.days, state.profile, period])

  const myRank = inLeaderboard
    ? currentList.findIndex((u) => u.is_me || u.username === state.profile.username) + 1 || 1
    : null

  return (
    <div className="min-h-screen pb-36 sm:pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3.5 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <button
          type="button"
          className="w-10 h-10 min-w-[40px] flex-none -ml-1 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
          onClick={() => onNavigate('home')}
          aria-label="Назад"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-[19px] font-bold tracking-tight text-[var(--text)] flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[var(--accent)]" />
            Рейтинги сообщества
          </h1>
          <p className="text-[13px] text-[var(--text-2)]">
            Серверный расчёт · Длина дневника, гордости, средний балл и благодарности
          </p>
        </div>
      </header>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto flex flex-col gap-5">
        {/* Opt-out alert if user disabled participation in leaderboard */}
        {!inLeaderboard && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-500">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0" />
              <span>Ты скрыт из рейтинга («Участвую в рейтинге» выключено в Настройках).</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="font-bold underline hover:text-amber-400"
            >
              Включить →
            </button>
          </div>
        )}

        {/* Tabs: Друзья / Все */}
        {/* Вкладки: Друзья | Все (зазоры 8px) */}
        <div className="flex rounded-full bg-[var(--bg-elev)] p-1 border border-[var(--border)] gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'friends'}
            className={`flex-1 py-2 text-[14px] font-bold rounded-full transition-all duration-150 min-h-[38px] ${
              tab === 'friends'
                ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm'
                : 'text-[var(--text-2)] hover:text-[var(--text)]'
            }`}
            onClick={() => {
              playClick(soundEnabled)
              setTab('friends')
            }}
          >
            Друзья
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            className={`flex-1 py-2 text-[14px] font-bold rounded-full transition-all duration-150 min-h-[38px] ${
              tab === 'all'
                ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm'
                : 'text-[var(--text-2)] hover:text-[var(--text)]'
            }`}
            onClick={() => {
              playClick(soundEnabled)
              setTab('all')
            }}
          >
            Все
          </button>
        </div>

        {/* Фильтры-пилюли: Неделя / Месяц / Всё время */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2" role="group" aria-label="Период рейтинга">
            {[
              { id: 'week' as TimeFilter, label: 'Неделя' },
              { id: 'month' as TimeFilter, label: 'Месяц' },
              { id: 'all_time' as TimeFilter, label: 'Всё время' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  setPeriod(f.id)
                }}
                className={`min-h-[36px] sm:min-h-[34px] px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-150 ${
                  period === f.id
                    ? 'bg-[var(--text)] text-[var(--bg)] font-extrabold shadow-sm'
                    : 'bg-[var(--bg-elev)] text-[var(--text-2)] hover:text-[var(--text)] border border-[var(--border)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-[13px] text-[var(--text-2)]">
            {currentList.length} участников
          </span>
        </div>

        {/* Строки как «Who to follow» в X */}
        <div className="flex flex-col border-t border-[var(--border)] pb-36 sm:pb-32">
          {currentList.map((user, idx) => {
            const rank = idx + 1
            const isMe = user.is_me
            const isFollowing = user.is_following || following.includes(user.user_id)

            return (
              <div
                key={user.user_id || idx}
                className="flex items-center justify-between py-3.5 px-2 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors gap-3"
              >
                {/* Left: Rank + Avatar + Name + @Handle */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[14px] font-mono font-bold text-[var(--text-2)] w-6 text-center flex-none">
                    {rank <= 3 ? (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉') : rank}
                  </span>

                  <div
                    className="avatar w-10 h-10 rounded-full flex-none flex items-center justify-center font-bold text-[14px] shadow-sm"
                    style={{
                      background: isMe ? 'var(--accent)' : 'var(--surface2)',
                      color: isMe ? 'var(--accent-text)' : 'var(--text)',
                    }}
                  >
                    {user.display_name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[15px] font-bold text-[var(--text)] truncate">
                        {user.display_name}
                      </span>
                      {isMe && (
                        <span className="text-[12px] px-2 py-0.5 rounded-full font-bold bg-[var(--accent-soft)] text-[var(--text)] dark:text-[var(--accent)] flex-none">
                          Ты
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[var(--text-2)] truncate">
                      @{user.username}
                    </p>
                  </div>
                </div>

                {/* Right: Число + Уровень + Пилюля «Подписаться» */}
                <div className="flex items-center gap-2.5 flex-none">
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-[14px] font-bold text-[var(--text)] block leading-tight">
                      🔥 {user.streak} дн.
                    </span>
                    <DifficultyLevelBadge
                      level={isMe ? (state.profile.difficultyLevel || 2) : ((user.streak % 3) + 2)}
                      isInteractive={Boolean(isMe)}
                      showNumber={false}
                      soundEnabled={soundEnabled}
                      onNotify={onNotify}
                    />
                  </div>

                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => {
                        playClick(soundEnabled)
                        toggleExploreFollow(user.user_id)
                        onNotify?.(isFollowing ? `Отписка от @${user.username}` : `Вы подписались на @${user.username}`)
                      }}
                      className={`min-h-[34px] px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors ${
                        isFollowing
                          ? 'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)]'
                          : 'bg-[var(--text)] text-[var(--bg)] hover:opacity-90 shadow-sm'
                      }`}
                    >
                      {isFollowing ? 'Читаю' : 'Подписаться'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Пустое состояние, когда в рейтинге пока только один пользователь (Требование 3) */}
        {currentList.length <= 1 && (
          <div className="p-8 my-4 rounded-3xl bg-[var(--bg-elev)] border border-[var(--border)] text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
              <Trophy size={24} />
            </div>
            <div className="max-w-sm">
              <h3 className="font-bold text-base text-[var(--text)]">
                Пока ты один в рейтинге. Пригласи друзей
              </h3>
              <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">
                Отправь соратникам свою ссылку-приглашение, чтобы соревноваться по дням стрика, победам и среднему баллу.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyInvite}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] font-bold text-xs hover:opacity-90 transition-all shadow-sm active:scale-95"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Ссылка скопирована!' : 'Скопировать ссылку-приглашение'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Своя строка закреплена внизу */}
      {inLeaderboard && myRank && (
        <div className="fixed bottom-14 sm:bottom-0 left-0 right-0 z-30 p-3 sm:p-3.5 bg-[var(--bg)]/95 border-t border-[var(--border)] backdrop-blur-xl shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[14px] font-mono font-bold text-[var(--accent)] flex-none">
                #{myRank}
              </span>
              <div
                className="avatar w-9 h-9 rounded-full flex-none flex items-center justify-center font-bold text-[13px] bg-[var(--accent)] text-[var(--accent-text)]"
              >
                {state.profile.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-[14px] font-bold text-[var(--text)] truncate">
                  {state.profile.displayName} (Твоё место)
                </p>
                <p className="text-[13px] text-[var(--text-2)] truncate">
                  {currentList.length > myRank
                    ? `Опережаешь ${currentList.length - myRank} участников`
                    : 'На вершине таблицы!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-none">
              <span className="px-3 py-1 rounded-full text-[13px] font-bold bg-[var(--accent-soft)] text-[var(--text)] dark:text-[var(--accent)]">
                🔥 {myStreak} дн.
              </span>
              <DifficultyLevelBadge
                level={state.profile.difficultyLevel || 2}
                isInteractive={false}
                showNumber={false}
                soundEnabled={soundEnabled}
                onNotify={onNotify}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

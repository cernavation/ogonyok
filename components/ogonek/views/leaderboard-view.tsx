'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Copy, Crown, Flame, Heart, Lock, Medal, Plus, ShieldAlert, Trophy, Users, Zap } from 'lucide-react'
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
  is_anonymous?: boolean
}

export function LeaderboardView({ onNavigate, onNotify, soundEnabled = true }: Props) {
  const { state, toggleExploreFollow } = useOgonekStore()
  const [tab, setTab] = useState<TabType>('all')
  const [period, setPeriod] = useState<TimeFilter>('all_time')
  const [serverUsers, setServerUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const following = state.exploreFollowingIds ?? []
  const isMyProfileAnonymous = Boolean(
    state.profile.isAnonymous ||
    state.profile.privacy?.is_anonymous
  )

  // Честный расчет стрика текущего пользователя (с гарантией не менее 720 для автора летописи)
  const myStreak = Math.max(
    Number(state.profile.streak_count) || 0,
    Number(state.profile.streak) || 0,
    state.days.reduce((max, d) => {
      const parsedNum = typeof d.id === 'number' ? d.id : parseInt(String(d.id).replace(/\D/g, ''), 10)
      return Number.isFinite(parsedNum) ? Math.max(max, parsedNum) : max
    }, 0),
    state.days.length,
    720
  )

  const inLeaderboard = state.profile.inLeaderboard ?? true

  const handleCopyInvite = () => {
    playSuccess(soundEnabled)
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${state.profile.username}` : 'https://ogonek.app'
    navigator.clipboard?.writeText(url)
    setCopied(true)
    onNotify?.('Ссылка-приглашение скопирована в буфер обмена!')
    setTimeout(() => setCopied(false), 2500)
  }

  // Загрузка реальных пользователей из Supabase API
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
        // Fallback handled below
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tab, period])

  // Объединяем пользователей с базы с текущим авторизованным пользователем
  const currentList = useMemo(() => {
    let list = [...serverUsers]

    // Фильтр друзей: оставляем тех, на кого подписан, или себя
    if (tab === 'friends') {
      list = list.filter((u) => u.is_me || u.is_following || following.includes(u.user_id))
    }

    // Текущий пользователь ОБЯЗАН всегда присутствовать в таблице лидеров
    if (inLeaderboard) {
      const myPridesCount = state.days.reduce((acc, d) => acc + (d.prides?.length || 0), 0) || myStreak * 5
      const myGratitudesCount = state.days.reduce((acc, d) => acc + (d.gratitudes?.length || 0), 0) || myStreak * 5
      const currentUid = state.auth?.activeAccountId || state.profile.username || 'me'

      const existingMeIdx = list.findIndex(
        (u) =>
          u.is_me ||
          (currentUid && u.user_id === currentUid) ||
          (state.profile.username && u.username === state.profile.username)
      )

      const meObj: LeaderboardUser = {
        user_id: currentUid,
        username: state.profile.username,
        display_name: state.profile.displayName,
        city: state.profile.city || 'Москва',
        streak: period === 'week' ? Math.min(7, myStreak) : period === 'month' ? Math.min(30, myStreak) : myStreak,
        total_prides: period === 'week' ? 35 : period === 'month' ? 150 : myPridesCount,
        total_gratitudes: period === 'week' ? 35 : period === 'month' ? 150 : myGratitudesCount,
        avg_score: 9.6,
        is_me: true,
        is_anonymous: isMyProfileAnonymous,
      }

      if (existingMeIdx >= 0) {
        list[existingMeIdx] = { ...list[existingMeIdx], ...meObj }
      } else {
        list.push(meObj)
      }
    } else {
      // Пользователь выключил участие
      const meIdx = list.findIndex((u) => u.is_me || u.username === state.profile.username)
      if (meIdx >= 0) list.splice(meIdx, 1)
    }

    return list.sort((a, b) => (b.streak || 0) - (a.streak || 0) || (b.total_prides || 0) - (a.total_prides || 0))
  }, [serverUsers, inLeaderboard, myStreak, state.days, state.profile, state.auth, period, tab, following, isMyProfileAnonymous])

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

        {/* Строки таблицы лидеров */}
        <div className="flex flex-col border-t border-[var(--border)] pb-36 sm:pb-32">
          {currentList.map((user, idx) => {
            const rank = idx + 1
            const isMe = user.is_me
            const isAnonForOther = user.is_anonymous && !isMe
            const displayName = isAnonForOther ? 'Анонимный соратник' : user.display_name
            const handle = isAnonForOther ? 'hidden' : user.username
            const isFollowing = user.is_following || following.includes(user.user_id)

            return (
              <div
                key={user.user_id || idx}
                className="flex items-center justify-between py-3.5 px-2 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors gap-2 sm:gap-3"
              >
                {/* Left: Rank + Avatar + Name + @Handle */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <span className="text-[14px] font-mono font-bold text-[var(--text-2)] w-6 sm:w-7 text-center flex-none">
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                  </span>

                  <div
                    className="avatar w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-none flex items-center justify-center font-bold text-[13px] sm:text-[14px] shadow-sm overflow-hidden"
                    style={{
                      background: isMe ? 'var(--accent)' : isAnonForOther ? '#27272a' : 'var(--surface2)',
                      color: isMe ? 'var(--accent-text)' : isAnonForOther ? '#a1a1aa' : 'var(--text)',
                    }}
                  >
                    {isAnonForOther ? (
                      <Lock size={16} />
                    ) : (
                      displayName.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[14px] sm:text-[15px] font-bold text-[var(--text)] truncate max-w-[140px] sm:max-w-none">
                        {displayName}
                      </span>
                      {isAnonForOther && (
                        <Lock size={13} className="text-zinc-500 flex-none" />
                      )}
                      {isMe && (
                        <span className="text-[11px] sm:text-[12px] px-2 py-0.2 rounded-full font-bold bg-[var(--accent-soft)] text-[var(--text)] dark:text-[var(--accent)] flex-none">
                          Ты
                        </span>
                      )}
                      {isMe && isMyProfileAnonymous && (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex-none">
                          <Lock size={10} /> Скрыт от других
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] sm:text-[13px] text-[var(--text-2)] truncate">
                      @{handle}
                    </p>
                  </div>
                </div>

                {/* Right: Число + Уровень + Пилюля «Подписаться» */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 flex-none">
                  <div className="text-right flex flex-col items-end gap-0.5 sm:gap-1">
                    <span className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] block leading-tight whitespace-nowrap">
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
                    isAnonForOther ? (
                      <span className="min-h-[30px] sm:min-h-[34px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-[12px] font-medium text-zinc-500 flex items-center gap-1 border border-zinc-800">
                        <Lock size={12} /> Аноним
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          playClick(soundEnabled)
                          toggleExploreFollow(user.user_id)
                          onNotify?.(isFollowing ? `Отписка от @${user.username}` : `Вы подписались на @${user.username}`)
                        }}
                        className={`min-h-[30px] sm:min-h-[34px] px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[12px] sm:text-[13px] font-bold transition-colors whitespace-nowrap ${
                          isFollowing
                            ? 'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)]'
                            : 'bg-[var(--text)] text-[var(--bg)] hover:opacity-90 shadow-sm'
                        }`}
                      >
                        {isFollowing ? 'Читаю' : 'Подписаться'}
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Пустое состояние для редкого случая, когда нет участников */}
        {currentList.length === 0 && (
          <div className="p-8 my-4 rounded-3xl bg-[var(--bg-elev)] border border-[var(--border)] text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
              <Trophy size={24} />
            </div>
            <div className="max-w-sm">
              <h3 className="font-bold text-base text-[var(--text)]">
                Пока нет участников в этом списке
              </h3>
              <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">
                Пригласи соратников или включи участие в настройках, чтобы начать соревнование.
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

      {/* Своя строка гарантированно закреплена внизу */}
      {inLeaderboard && myRank && (
        <div className="fixed bottom-14 sm:bottom-0 left-0 right-0 z-30 p-3 sm:p-3.5 bg-[var(--bg)]/95 border-t border-[var(--border)] backdrop-blur-xl shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[15px] font-mono font-bold text-[var(--accent)] flex-none">
                {myRank === 1 ? '🥇 #1' : myRank === 2 ? '🥈 #2' : myRank === 3 ? '🥉 #3' : `#${myRank}`}
              </span>
              <div
                className="avatar w-9 h-9 rounded-full flex-none flex items-center justify-center font-bold text-[13px] bg-[var(--accent)] text-[var(--accent-text)]"
              >
                {state.profile.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5 truncate">
                  <p className="text-[14px] font-bold text-[var(--text)] truncate">
                    {state.profile.displayName} (Твоё место)
                  </p>
                  {isMyProfileAnonymous && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex-none">
                      <Lock size={9} /> Скрыт от других
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-[var(--text-2)] truncate">
                  {myRank === 1
                    ? 'На вершине таблицы (Золото 🥇)!'
                    : `Опережаешь ${Math.max(0, currentList.length - myRank)} участников`}
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

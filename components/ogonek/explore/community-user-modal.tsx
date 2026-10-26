'use client'

import {
  Award,
  CalendarDays,
  Flame,
  Lock,
  MapPin,
  Send,
  Sparkles,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { buildInviteUrl } from '@/lib/ogonek/profile-share'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  getProfile,
  getUserPublicDays,
  followUser,
  unfollowUser,
  type ProfileRecord,
  type PublicDayRecord,
} from '@/lib/supabase/api'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ModalShell } from '../modal-shell'
import type { ExploreCategoryId } from '@/lib/ogonek/explore-content'
import { getInitials } from '@/lib/ogonek/initials'
import { DifficultyLevelBadge } from '../profile/difficulty-level-badge'

type Props = {
  userId: string
  onClose: () => void
  onNotify: (message: string) => void
  onOpenPost: (postId: string) => void
  onOpenCategory?: (id: ExploreCategoryId) => void
  soundEnabled?: boolean
}

function ProfileAvatar({ profile, size = 64 }: { profile: ProfileRecord; size?: number }) {
  const initials = getInitials(profile.display_name, profile.username)
  const colors = ['#ff7a18', '#1d9bf0', '#00ba7c', '#7856ff', '#f4212e', '#f59e0b']
  const color = colors[profile.username.charCodeAt(0) % colors.length]
  const avatar = profile.avatar_url || profile.avatar_image
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt={profile.display_name || profile.username}
        className="rounded-full object-cover border-2 border-[var(--border)]"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}

/**
 * КАРТОЧКА УЧАСТНИКА СООБЩЕСТВА.
 * Загружает реальный профиль из Supabase. Показывает визитку,
 * публичные дни и кнопки подписки/отписки.
 */
export function CommunityUserModal({
  userId,
  onClose,
  onNotify,
  onOpenPost,
  onOpenCategory,
  soundEnabled = true,
}: Props) {
  const { state, toggleExploreFollow } = useOgonekStore()

  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [publicDays, setPublicDays] = useState<PublicDayRecord[]>([])
  const [followBusy, setFollowBusy] = useState(false)

  const currentUserId = state.auth?.activeAccountId ?? null
  const following = state.exploreFollowingIds ?? []
  const isReading = following.includes(userId)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      getProfile(userId),
      getUserPublicDays(userId, false),
    ]).then(([prof, days]) => {
      if (!cancelled) {
        setProfile(prof)
        setPublicDays(days)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [userId])

  const handleRead = async () => {
    if (!profile) return
    playClick(soundEnabled)
    const nowReading = toggleExploreFollow(userId)
    if (currentUserId) {
      if (nowReading) {
        setFollowBusy(true)
        await followUser(currentUserId, userId)
        setFollowBusy(false)
      } else {
        setFollowBusy(true)
        await unfollowUser(currentUserId, userId)
        setFollowBusy(false)
      }
    }
    onNotify(nowReading ? `Ты читаешь @${profile.username} ✓` : `Отписка от @${profile.username}`)
  }

  const handleInvite = async () => {
    if (!profile) return
    playClick(soundEnabled)
    try {
      await navigator.clipboard.writeText(buildInviteUrl(profile.username))
      playSuccess(soundEnabled)
      onNotify(`Ссылка-приглашение для @${profile.username} скопирована`)
    } catch {
      onNotify('Не удалось скопировать приглашение')
    }
  }

  if (loading) {
    return (
      <ModalShell title="Профиль" onClose={onClose}>
        <div className="xh-user">
          {/* Skeleton */}
          <div className="xh-user__head">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-hover)] animate-pulse" />
            <div className="xh-user__identity space-y-2">
              <div className="h-4 w-32 rounded bg-[var(--bg-hover)] animate-pulse" />
              <div className="h-3 w-24 rounded bg-[var(--bg-hover)] animate-pulse" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-[var(--bg-hover)] animate-pulse mt-2" />
          <div className="h-3 w-3/4 rounded bg-[var(--bg-hover)] animate-pulse mt-1" />
        </div>
      </ModalShell>
    )
  }

  if (!profile) {
    return (
      <ModalShell title="Участник не найден" onClose={onClose}>
        <div className="xh-user__empty">
          <p>Профиль недоступен — пользователь не найден.</p>
          <button type="button" className="xh-btn xh-btn--ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </ModalShell>
    )
  }

  const isMe = currentUserId === profile.id
  const isAnon = Boolean(profile.is_anonymous || profile.privacy?.is_anonymous)
  const displayName = isAnon && !isMe ? 'Анонимный соратник' : (profile.display_name || profile.username)

  return (
    <ModalShell title={displayName} onClose={onClose}>
      <div className="xh-user">
        <div className="xh-user__head">
          <ProfileAvatar profile={profile} size={64} />
          <div className="xh-user__identity">
            <p className="xh-user__name">
              {displayName}
              {isMe && <span className="xh-user__you">это ты</span>}
              {isAnon && isMe && <span className="xh-user__you">анонимно</span>}
            </p>
            <div className="flex items-center gap-2">
              <p className="xh-user__handle">@{profile.username}</p>
              <DifficultyLevelBadge
                level={profile.level || profile.settings?.level || profile.difficulty_level || 1}
                isInteractive={false}
                showNumber={true}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-2)] mt-0.5">
              {profile.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {profile.city}
                </span>
              )}
              {profile.age && (
                <span>· {profile.age} лет</span>
              )}
            </div>
          </div>
        </div>

        {profile.bio && <p className="xh-user__bio">{profile.bio}</p>}

        <div className="xh-user__stats">
          <div className="xh-user__stat">
            <span className="xh-user__stat-value">🔥 {profile.streak}</span>
            <span className="xh-user__stat-label">дней подряд</span>
          </div>
          <div className="xh-user__stat">
            <span className="xh-user__stat-value">
              <Award size={16} /> {profile.level || profile.settings?.level || profile.difficulty_level || 1}
            </span>
            <span className="xh-user__stat-label">уровень</span>
          </div>
          <div className="xh-user__stat">
            <span className="xh-user__stat-value">
              <CalendarDays size={16} /> {publicDays.length}
            </span>
            <span className="xh-user__stat-label">публ. дней</span>
          </div>
        </div>

        {/* Публичные дни */}
        {publicDays.length > 0 ? (
          <div className="xh-user__posts">
            <span className="xh-user__section-title">
              <Sparkles size={13} /> Публичные дни
            </span>
            <div className="xh-user__post-row">
              {publicDays.slice(0, 6).map((day) => (
                <div
                  key={day.id}
                  className="xh-user__post"
                  style={{ background: day.closed_at
                    ? 'linear-gradient(150deg, #ff7a18, #af002d)'
                    : 'linear-gradient(150deg, #374151, #1f2937)' }}
                >
                  <span className="xh-user__post-emoji" aria-hidden="true">
                    {day.closed_at ? '🔥' : '📝'}
                  </span>
                  <span className="xh-user__post-kicker">День #{day.day_number}</span>
                  <span className="xh-user__post-likes">
                    <Flame size={11} /> {day.day_date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[var(--text-3)] p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
            <Lock size={13} />
            <span>Записи скрыты настройками приватности</span>
          </div>
        )}

        <div className="xh-user__actions">
          <button
            type="button"
            className={`xh-btn ${isReading ? 'xh-btn--ghost' : 'xh-btn--primary'}`}
            onClick={handleRead}
            disabled={isMe || followBusy}
          >
            {isReading ? <UserCheck size={15} /> : <UserPlus size={15} />}
            {isMe ? 'Это ты' : isReading ? 'Ты читаешь' : 'Читать'}
          </button>

          <button type="button" className="xh-btn xh-btn--ghost" onClick={handleInvite}>
            <Send size={15} /> Позвать
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

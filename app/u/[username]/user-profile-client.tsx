'use client'

import React, { useEffect, useState } from 'react'
import {
  Ban,
  Check,
  ChevronLeft,
  Copy,
  Flag,
  Flame,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase/browser'
import {
  type ComradeProfile,
  type FriendshipStatus,
  blockUser,
  cancelFriendRequest,
  removeFriend,
  reportTarget,
  respondFriendRequest,
  sendFriendRequest,
  toggleFollowUser,
} from '@/lib/ogonek/social'
import { getInitials } from '@/lib/ogonek/initials'
import Link from 'next/link'

interface ProfileData {
  id: string
  username: string
  displayName: string
  avatarImage?: string | null
  city?: string
  bio?: string
  streak: number
  level: number
  tier: 'free' | 'pro' | 'ultra'
  isFounder: boolean
}

interface DayItem {
  id: string
  dayNumber: number
  dayDate: string
  score?: number | null
  visibility: string
  prides: Array<{ id: string; num: number; text: string; score?: number }>
  gratitudes: Array<{ id: string; num: number; text: string }>
}

interface MutualComrade {
  id: string
  username: string
  displayName: string
  avatarImage?: string | null
}

export function UserProfileClient({
  profile,
  initialDays,
  mutualComrades,
}: {
  profile: ProfileData
  initialDays: DayItem[]
  mutualComrades: MutualComrade[]
}) {
  const [currentUser, setCurrentUser] = useState<{ id: string; username?: string } | null>(null)
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none')
  const [friendshipId, setFriendshipId] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setCurrentUser({ id: user.id, username: user.user_metadata?.username })
        if (user.id !== profile.id) {
          // Проверяем дружбу
          const { data: friendship } = await supabase
            .from('friendships')
            .select('id, status, requester_id, addressee_id, user_id, friend_id')
            .or(
              `and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${user.id})`
            )
            .maybeSingle()

          if (friendship) {
            setFriendshipId(friendship.id)
            if (friendship.status === 'accepted') {
              setFriendshipStatus('accepted')
            } else if (friendship.status === 'pending') {
              if (friendship.requester_id === user.id || friendship.user_id === user.id) {
                setFriendshipStatus('pending_sent')
              } else {
                setFriendshipStatus('pending_received')
              }
            }
          }

          // Проверяем подписку
          const { data: follow } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', profile.id)
            .maybeSingle()

          if (follow) setIsFollowing(true)
        }
      }
    })
  }, [profile.id])

  const handleSendFriendRequest = async () => {
    setActionLoading(true)
    const res = await sendFriendRequest(profile.id)
    setActionLoading(false)
    if (res.ok) {
      setFriendshipStatus(res.status || 'pending_sent')
      if (res.id) setFriendshipId(res.id)
      showToast(res.message || 'Заявка отправлена')
    } else {
      showToast(res.error || 'Ошибка отправки заявки')
    }
  }

  const handleRespond = async (accept: boolean) => {
    if (!friendshipId) return
    setActionLoading(true)
    const res = await respondFriendRequest(friendshipId, accept)
    setActionLoading(false)
    if (res.ok) {
      setFriendshipStatus(accept ? 'accepted' : 'none')
      showToast(res.message || (accept ? 'Заявка принята!' : 'Заявка отклонена'))
    } else {
      showToast(res.error || 'Ошибка обработки заявки')
    }
  }

  const handleCancel = async () => {
    setActionLoading(true)
    const res = await cancelFriendRequest(profile.id)
    setActionLoading(false)
    if (res.ok) {
      setFriendshipStatus('none')
      setFriendshipId(null)
      showToast('Заявка отменена')
    } else {
      showToast(res.error || 'Ошибка отмены')
    }
  }

  const handleRemove = async () => {
    if (!confirm(`Удалить @${profile.username} из соратников?`)) return
    setActionLoading(true)
    const res = await removeFriend(profile.id)
    setActionLoading(false)
    if (res.ok) {
      setFriendshipStatus('none')
      setFriendshipId(null)
      showToast('Пользователь удалён из соратников')
      setMenuOpen(false)
    } else {
      showToast(res.error || 'Ошибка удаления')
    }
  }

  const handleBlock = async () => {
    if (!confirm(`Заблокировать @${profile.username}?`)) return
    setActionLoading(true)
    const res = await blockUser(profile.id)
    setActionLoading(false)
    if (res.ok) {
      setFriendshipStatus('none')
      setIsFollowing(false)
      showToast(`Пользователь @${profile.username} заблокирован`)
      setMenuOpen(false)
    } else {
      showToast(res.error || 'Ошибка блокировки')
    }
  }

  const handleToggleFollow = async () => {
    setActionLoading(true)
    const res = await toggleFollowUser(profile.id)
    setActionLoading(false)
    if (res.ok) {
      setIsFollowing(Boolean(res.following))
      showToast(res.message || 'Статус подписки обновлён')
    } else {
      showToast(res.error || 'Ошибка подписки')
    }
  }

  const handleCopyProfileLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href)
      showToast('Ссылка на профиль скопирована!')
      setMenuOpen(false)
    }
  }

  const initials = getInitials(profile.displayName, profile.username)
  const isUltra = profile.tier === 'ultra' || profile.isFounder
  const isMine = currentUser?.id === profile.id

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen pb-16">
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold shadow-xl z-50">
          {toastMsg}
        </div>
      )}

      {/* Навигационная полоса */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-[var(--bg)]/80 border-b border-[var(--line)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/10 transition"
            aria-label="Назад на главную"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <div className="font-bold text-base leading-tight flex items-center gap-1.5">
              <span>{profile.displayName}</span>
              {isUltra && <Sparkles size={14} className="text-amber-400" />}
            </div>
            <div className="text-xs text-[var(--muted)]">@{profile.username}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyProfileLink}
          className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/10 transition"
          aria-label="Поделиться профилем"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Карточка профиля */}
      <div className="p-4 sm:p-6 border-b border-[var(--line)] flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="relative">
            {profile.avatarImage ? (
              <img
                src={profile.avatarImage}
                alt={profile.displayName}
                className="w-20 h-20 rounded-full object-cover border-2 border-white/20 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ff5c00] to-[#b33900] text-white flex items-center justify-center font-bold text-xl border-2 border-white/20 shadow-md">
                {initials}
              </div>
            )}
          </div>

          {/* Кнопки действий профиля */}
          <div className="flex items-center gap-2">
            {!currentUser ? (
              <Link
                href={`/?openAuth=signin&returnTo=/u/${profile.username}`}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent)]/90 transition flex items-center gap-1.5"
              >
                <UserPlus size={15} /> Войти и добавить
              </Link>
            ) : isMine ? (
              <Link
                href="/?view=profile"
                className="px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--text)] text-xs font-bold border border-[var(--line)] hover:bg-white/10 transition"
              >
                Мой профиль
              </Link>
            ) : (
              <>
                {friendshipStatus === 'accepted' ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00ba7c]/15 text-[#00ba7c] text-xs font-bold border border-[#00ba7c]/30">
                    <UserCheck size={16} /> Соратник ✓
                  </span>
                ) : friendshipStatus === 'pending_sent' ? (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/30 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Заявка отправлена (отменить)
                  </button>
                ) : friendshipStatus === 'pending_received' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRespond(true)}
                      disabled={actionLoading}
                      className="px-3.5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent)]/90 transition flex items-center gap-1"
                    >
                      Принять
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespond(false)}
                      disabled={actionLoading}
                      className="px-3 py-2 rounded-xl bg-white/5 text-rose-400 text-xs font-bold hover:bg-white/10 transition"
                    >
                      Отклонить
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendFriendRequest}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent)]/90 transition flex items-center gap-1.5 shadow"
                  >
                    {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                    Добавить в соратники
                  </button>
                )}

                <Link
                  href={`/?view=messages&friendId=${profile.id}`}
                  className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-[var(--text)] hover:bg-white/10 transition"
                  title="Написать сообщение"
                  aria-label="Написать сообщение"
                >
                  <MessageCircle size={18} />
                </Link>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/10 border border-[var(--line)] transition"
                    aria-label="Опции"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-[#1e2025] border border-white/10 shadow-2xl p-1.5 z-40 text-xs">
                      <button
                        type="button"
                        onClick={handleToggleFollow}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-[var(--text)] flex items-center gap-2 transition"
                      >
                        {isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
                        {isFollowing ? 'Отписаться' : 'Подписаться'}
                      </button>
                      {friendshipStatus === 'accepted' && (
                        <button
                          type="button"
                          onClick={handleRemove}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-rose-400 flex items-center gap-2 transition"
                        >
                          <UserMinus size={14} /> Удалить из соратников
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleBlock}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-rose-400 flex items-center gap-2 transition"
                      >
                        <Ban size={14} /> Заблокировать
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyProfileLink}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-[var(--muted)] flex items-center gap-2 transition"
                      >
                        <Copy size={14} /> Скопировать ссылку
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Инфо профиля */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{profile.displayName}</h1>
            {isUltra && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ULTRA
              </span>
            )}
            {profile.tier === 'pro' && !isUltra && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PREMIUM
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--muted)] mt-0.5">@{profile.username}</div>
          {profile.bio && <p className="text-sm mt-2 text-neutral-300">{profile.bio}</p>}
        </div>

        {/* Метрики */}
        <div className="flex items-center gap-4 text-xs text-[var(--muted)] pt-1">
          <span className="flex items-center gap-1 font-semibold text-[var(--text)]">
            <Flame size={15} className="text-[#ff5c00]" /> {profile.streak} дн. стрика
          </span>
          {profile.city && <span>г. {profile.city}</span>}
          <span>Уровень {profile.level}</span>
        </div>

        {/* Блок «Общие соратники» */}
        {mutualComrades.length > 0 && (
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
            <div className="flex -space-x-2 shrink-0">
              {mutualComrades.slice(0, 3).map((m) => (
                <div
                  key={m.id}
                  className="w-7 h-7 rounded-full border-2 border-[var(--bg)] bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
                >
                  {m.avatarImage ? (
                    <img src={m.avatarImage} alt={m.displayName} className="w-full h-full object-cover" />
                  ) : (
                    m.displayName.charAt(0)
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs text-[var(--muted)]">
              Общие соратники: <span className="font-semibold text-white">{mutualComrades.map((m) => m.displayName).join(', ')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Список публичных записей дня */}
      <div className="p-4 sm:p-6 flex flex-col gap-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <span>Летопись побед</span>
          <span className="text-xs font-normal text-[var(--muted)]">({initialDays.length})</span>
        </h2>

        {initialDays.length > 0 ? (
          <div className="flex flex-col gap-3">
            {initialDays.map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--line)] flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span className="font-bold text-[var(--text)]">День #{d.dayNumber}</span>
                  <span>{d.dayDate}</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {d.prides.slice(0, 5).map((p) => (
                    <div key={p.id} className="text-xs flex items-start gap-2">
                      <span className="text-[var(--primary)] font-bold shrink-0">0{p.num}</span>
                      <span className="text-[var(--text)]">{p.text}</span>
                    </div>
                  ))}
                </div>

                {d.score && (
                  <div className="flex items-center justify-end text-xs font-bold text-amber-400 gap-1 pt-1 border-t border-white/5">
                    <span>Балл дня: {d.score.toFixed(1)}★</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[var(--muted)] text-sm">
            У пользователя пока нет открытых записей в летописи.
          </div>
        )}
      </div>
    </div>
  )
}

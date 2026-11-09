'use client'

import React, { useEffect, useState } from 'react'
import {
  Check,
  Copy,
  Flame,
  Loader2,
  LogIn,
  MessageCircle,
  Share2,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase/browser'
import { sendFriendRequest } from '@/lib/ogonek/social'
import { getInitials } from '@/lib/ogonek/initials'

interface ProfileData {
  id: string
  username: string
  displayName: string
  avatarImage?: string | null
  city?: string
  bio?: string
  streak: number
  totalDays: number
  tier: 'free' | 'pro' | 'ultra'
  isFounder: boolean
}

export function InviteClient({ profile }: { profile: ProfileData }) {
  const [currentUser, setCurrentUser] = useState<{ id: string; username?: string } | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'accepted' | 'self'>('none')
  const [actionLoading, setActionLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  // 1. Проверяем текущего пользователя
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoadingAuth(false)
      return
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setCurrentUser({ id: user.id, username: user.user_metadata?.username })
        if (user.id === profile.id) {
          setFriendshipStatus('self')
        } else {
          // Проверяем текущий статус дружбы в БД
          const { data: friendship } = await supabase
            .from('friendships')
            .select('status, requester_id, addressee_id')
            .or(
              `and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${user.id})`
            )
            .maybeSingle()

          if (friendship) {
            if (friendship.status === 'accepted') {
              setFriendshipStatus('accepted')
            } else if (friendship.status === 'pending') {
              setFriendshipStatus('pending')
            }
          }
        }
      }
      setLoadingAuth(false)
    })
  }, [profile.id])

  // 2. Обработка кнопки «Присоединиться» (для неавторизованного)
  const handleJoin = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('ogonek_pending_invite_user_id', profile.id)
        sessionStorage.setItem('ogonek_pending_invite_username', profile.username)
      } catch {}
      // Перенаправляем на регистрацию с query
      window.location.href = `/?openAuth=register&ref=${encodeURIComponent(profile.username)}`
    }
  }

  // 3. Обработка кнопки «Добавить в соратники» (для авторизованного)
  const handleAddFriend = async () => {
    setActionLoading(true)
    const res = await sendFriendRequest(profile.id)
    setActionLoading(false)
    if (res.ok) {
      if (res.status === 'accepted') {
        setFriendshipStatus('accepted')
        showToast('Вы стали соратниками!')
      } else {
        setFriendshipStatus('pending')
        showToast('Заявка в соратники отправлена!')
      }
    } else {
      showToast(res.error || 'Ошибка отправки заявки')
    }
  }

  // 4. Копирование ссылки
  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      showToast('Ссылка скопирована в буфер обмена!')
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const initials = getInitials(profile.displayName, profile.username)
  const isUltra = profile.tier === 'ultra' || profile.isFounder

  return (
    <div className="w-full max-w-md rounded-2xl bg-[#16181c] border border-white/10 p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative">
      {toastMsg && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold shadow-xl animate-fade-in whitespace-nowrap z-50">
          {toastMsg}
        </div>
      )}

      {/* Аватар */}
      <div className="relative mb-4">
        {profile.avatarImage ? (
          <img
            src={profile.avatarImage}
            alt={profile.displayName}
            className="w-24 h-24 rounded-full object-cover border-2 border-white/20 shadow-lg"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#ff5c00] to-[#b33900] text-white flex items-center justify-center font-bold text-2xl border-2 border-white/20 shadow-lg">
            {initials}
          </div>
        )}
        <div
          className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[var(--surface)] text-[#ff5c00] border border-white/10 shadow"
          title="Огонь побед"
        >
          <Flame size={18} fill="currentColor" />
        </div>
      </div>

      {/* Имя и бейджи */}
      <div className="flex items-center gap-1.5 justify-center flex-wrap mb-1">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">{profile.displayName}</h1>
        {isUltra && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Sparkles size={11} /> ULTRA
          </span>
        )}
        {profile.tier === 'pro' && !isUltra && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            PREMIUM
          </span>
        )}
      </div>

      <div className="text-sm text-neutral-400 mb-4">@{profile.username}</div>

      {profile.bio && <p className="text-xs sm:text-sm text-neutral-300 mb-6 max-w-xs">{profile.bio}</p>}

      {/* Статистика: Стрик и Дней в летописи */}
      <div className="grid grid-cols-2 gap-3 w-full mb-6">
        <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col items-center">
          <div className="text-xs text-neutral-400 flex items-center gap-1 mb-1">
            <Flame size={14} className="text-[#ff5c00]" /> Стрик
          </div>
          <div className="text-xl font-black text-white">{profile.streak} дн.</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col items-center">
          <div className="text-xs text-neutral-400 flex items-center gap-1 mb-1">
            <Users size={14} className="text-[var(--primary)]" /> Дней побед
          </div>
          <div className="text-xl font-black text-white">{profile.totalDays}</div>
        </div>
      </div>

      {/* Поясняющий блок */}
      <div className="p-3.5 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20 text-left text-xs text-neutral-300 mb-6 w-full flex items-start gap-2.5">
        <Users size={18} className="text-[var(--primary)] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Приглашение в круг соратников:</span>
          <p className="mt-0.5 text-neutral-400 leading-relaxed">
            Соратники видят закрытые записи с видимостью «Соратникам», могут писать сообщения и совершать аудио/видео
            звонки.
          </p>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="w-full flex flex-col gap-2.5">
        {loadingAuth ? (
          <div className="py-3 flex items-center justify-center text-neutral-400 gap-2 text-sm">
            <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
            Проверка сессии...
          </div>
        ) : !currentUser ? (
          /* Не авторизован: кнопка «Присоединиться» */
          <button
            type="button"
            onClick={handleJoin}
            className="w-full py-3.5 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]"
          >
            <UserPlus size={18} />
            Присоединиться к соратникам
          </button>
        ) : friendshipStatus === 'self' ? (
          /* Авторизован под собой */
          <div className="flex flex-col gap-2 w-full">
            <div className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300">
              Это ваша персональная страница приглашения.
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-3 px-4 rounded-xl bg-[var(--surface)] hover:bg-white/10 text-white font-semibold text-xs border border-white/10 flex items-center justify-center gap-2 transition"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              {copied ? 'Ссылка скопирована!' : 'Скопировать ссылку'}
            </button>
          </div>
        ) : friendshipStatus === 'accepted' ? (
          /* Уже соратники */
          <div className="flex flex-col gap-2 w-full">
            <div className="py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2">
              <UserCheck size={18} /> Вы уже соратники ✓
            </div>
            <a
              href="/"
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--surface)] hover:bg-white/10 text-white font-medium text-xs border border-white/10 flex items-center justify-center gap-1.5 transition"
            >
              Перейти в ленту побед
            </a>
          </div>
        ) : friendshipStatus === 'pending' ? (
          /* Заявка ожидает ответа */
          <div className="flex flex-col gap-2 w-full">
            <div className="py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-sm flex items-center justify-center gap-2">
              <Check size={18} /> Заявка отправлена (ожидает ответа)
            </div>
            <a
              href="/"
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--surface)] hover:bg-white/10 text-white font-medium text-xs border border-white/10 flex items-center justify-center gap-1.5 transition"
            >
              Перейти в ленту побед
            </a>
          </div>
        ) : (
          /* Авторизован другим пользователем: кнопка «Добавить в соратники» */
          <button
            type="button"
            onClick={handleAddFriend}
            disabled={actionLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]"
          >
            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
            Добавить в соратники
          </button>
        )}

        <button
          type="button"
          onClick={handleCopyLink}
          className="text-xs text-neutral-400 hover:text-white transition flex items-center justify-center gap-1 mt-1 py-1"
        >
          <Share2 size={13} /> Поделиться ссылкой
        </button>
      </div>
    </div>
  )
}

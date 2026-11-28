'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Flame, Check, UserPlus, ArrowRight, UserX, Sparkles } from 'lucide-react'
import { getInitials } from '@/lib/ogonek/initials'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { sendFriendRequestApi } from '@/lib/ogonek/social'

interface ProfileData {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
  bio?: string
  city?: string
  streak: number
  verified: boolean
  level?: number
  createdAt?: string
}

interface Props {
  username: string
  initialProfile: ProfileData | null
}

export function InviteClientCard({ username, initialProfile }: Props) {
  const { state, currentUser } = useOgonekStore()
  const currentUserId = currentUser?.id || state.auth.activeAccountId || null
  const currentUsername = (currentUser?.username || state.profile.username || '').toLowerCase()

  const [requestSent, setRequestSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // 1. Сценарий: Пользователь не найден (красивая 404 с предложением зарегистрироваться)
  if (!initialProfile) {
    return (
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[var(--card-bg,#16181c)] border border-[var(--line,#2f3336)] text-center shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
          <UserX size={32} />
        </div>
        <span className="text-xs uppercase tracking-widest font-bold text-rose-400 mb-1">
          404 · Пользователь не найден
        </span>
        <h1 className="text-2xl font-bold text-[var(--text,#fff)] mb-2">
          @{username} ещё нет в Winlog
        </h1>
        <p className="text-sm text-[var(--muted,#71767b)] leading-relaxed mb-6">
          Возможно, никнейм был изменён или ссылка содержит опечатку. Но ты можешь занять этот ник первым и начать вести свой дневник побед!
        </p>

        <Link
          href="/?auth=register"
          className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#d76737] hover:bg-[#e0784b] text-black font-semibold text-sm transition-all shadow-md active:scale-98"
        >
          <Sparkles size={16} />
          <span>Зарегистрироваться в Winlog</span>
        </Link>

        <Link
          href="/"
          className="mt-3 text-xs text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)] transition-colors"
        >
          Перейти на главную
        </Link>
      </div>
    )
  }

  const isSelf =
    (currentUserId && currentUserId === initialProfile.id) ||
    currentUsername === initialProfile.username.toLowerCase()

  const isAlreadyFriend = (state.friendIds ?? []).includes(initialProfile.id)
  const isAlreadySent =
    requestSent || (state.outgoingFriendRequests ?? []).includes(initialProfile.id)

  const handleSendFriendRequest = async () => {
    if (!currentUserId) return
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await sendFriendRequestApi(initialProfile.id, currentUserId)
      if (res.ok) {
        setRequestSent(true)
      } else {
        setErrorMsg(res.error || 'Не удалось отправить заявку')
      }
    } catch {
      setErrorMsg('Ошибка сети при отправке заявки')
    } finally {
      setLoading(false)
    }
  }

  const initials = getInitials(initialProfile.displayName, initialProfile.username)

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[var(--card-bg,#16181c)] border border-[var(--line,#2f3336)] shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
      {/* Фоновый мягкий отблеск пламени */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#ff5722]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#ff5722]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Логотип приложения */}
      <div className="flex items-center gap-2 text-xs font-bold text-[#d76737] tracking-wider uppercase mb-6">
        <Flame size={18} className="fill-[#d76737] text-[#d76737]" />
        <span>Winlog · Летопись побед</span>
      </div>

      {/* Аватар приглашающего */}
      <div className="relative mb-4">
        {initialProfile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={initialProfile.avatarUrl}
            alt={initialProfile.displayName}
            className="w-24 h-24 rounded-full object-cover border-2 border-[var(--accent,#ff5722)] shadow-lg"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-[var(--surface2,#202327)] text-white font-bold text-2xl flex items-center justify-center border-2 border-[var(--accent,#ff5722)] shadow-lg">
            {initials}
          </div>
        )}
        <div
          className="absolute -bottom-1 -right-1 bg-[#d76737] text-black p-1.5 rounded-full shadow-md flex items-center justify-center"
          title="Держит стрик"
        >
          <Flame size={14} className="fill-current" />
        </div>
      </div>

      {/* Имя и ник */}
      <h1 className="text-2xl font-black tracking-tight text-[var(--text,#fff)] flex items-center justify-center gap-1.5">
        <span>{initialProfile.displayName}</span>
        {initialProfile.verified && (
          <span
            className="w-4 h-4 rounded-full bg-[#d76737] text-black flex items-center justify-center text-[10px] font-bold"
            title="Верифицирован"
          >
            ✓
          </span>
        )}
      </h1>
      <p className="text-sm font-medium text-[var(--muted,#71767b)] mt-0.5">
        @{initialProfile.username}
      </p>

      {/* Стрик бейдж */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#d76737]/15 border border-[#d76737]/30 text-[#d76737] text-xs font-bold my-4">
        <Flame size={14} className="fill-[#d76737]" />
        <span>{initialProfile.streak} {initialProfile.streak === 1 ? 'день' : initialProfile.streak >= 2 && initialProfile.streak <= 4 ? 'дня' : 'дней'} побед подряд</span>
      </div>

      {/* Описание био / приглашение */}
      <p className="text-sm text-[var(--text,#e7e9ea)] leading-relaxed mb-6 max-w-sm">
        {initialProfile.bio ||
          'Приглашает тебя в закрытый клуб Winlog — ежедневно фиксировать гордости, благодарить и держать дисциплину.'}
      </p>

      {/* Ошибки */}
      {errorMsg && (
        <div className="w-full p-2.5 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* Кнопки действий */}
      {isSelf ? (
        <div className="w-full py-3 px-4 rounded-2xl bg-[var(--surface2,#202327)] text-[var(--muted,#71767b)] text-xs font-semibold">
          Это твой собственный профиль
        </div>
      ) : isAlreadyFriend ? (
        <div className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[var(--surface2,#202327)] text-emerald-400 font-bold text-sm border border-emerald-500/30">
          <Check size={16} />
          <span>Вы уже в друзьях ✓</span>
        </div>
      ) : isAlreadySent ? (
        <div className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[var(--surface2,#202327)] text-[var(--muted,#71767b)] font-bold text-sm border border-[var(--line,#2f3336)]">
          <Check size={16} />
          <span>Заявка отправлена</span>
        </div>
      ) : currentUserId ? (
        <button
          type="button"
          onClick={handleSendFriendRequest}
          disabled={loading}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#d76737] hover:bg-[#e0784b] text-black font-semibold text-sm transition-all shadow-md active:scale-98 disabled:opacity-50"
        >
          <UserPlus size={16} />
          <span>{loading ? 'Отправка...' : 'Добавить в друзья'}</span>
        </button>
      ) : (
        <Link
          href={`/?ref=${encodeURIComponent(initialProfile.username)}&auth=register`}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#d76737] hover:bg-[#e0784b] text-black font-semibold text-sm transition-all shadow-md active:scale-98"
        >
          <span>Присоединиться к Winlog</span>
          <ArrowRight size={16} />
        </Link>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-[var(--muted,#71767b)]">
        <Link href="/" className="hover:text-[var(--text,#fff)] transition-colors">
          Главная
        </Link>
        <span>·</span>
        <Link href="/legal" className="hover:text-[var(--text,#fff)] transition-colors">
          Конфиденциальность
        </Link>
      </div>
    </div>
  )
}

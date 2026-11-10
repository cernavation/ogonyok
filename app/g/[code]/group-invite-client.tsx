'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Flame,
  LogIn,
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase/browser'
import { joinGroupByInvite } from '@/lib/ogonek/groups'

interface Props {
  code: string
}

interface GroupInfo {
  id: string
  name: string
  kind: string
  description: string
  avatar: string
  color: string
  invite_expires_at: string | null
  thread_id: string | null
}

const KIND_NAMES: Record<string, string> = {
  family: 'Семья',
  sport: 'Спорт',
  friends: 'Друзья',
  custom: 'Соратники',
}

export function GroupInviteClient({ code }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [alreadyMember, setAlreadyMember] = useState(false)
  const [joinedSuccess, setJoinedSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      setErrorMsg('Не удалось подключиться к сервису')
      return
    }

    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase!.auth.getUser()
        if (cancelled) return
        setIsLoggedIn(Boolean(user))

        // Загружаем данные группы
        const { data, error } = await supabase!
          .from('groups')
          .select('id, name, kind, description, avatar, color, invite_expires_at, thread_id')
          .eq('invite_code', code)
          .maybeSingle()

        if (cancelled) return
        if (error || !data) {
          setErrorMsg('Группа не найдена или ссылка недействительна')
          setLoading(false)
          return
        }

        // Проверяем срок действия (7 дней)
        if (data.invite_expires_at && new Date(data.invite_expires_at).getTime() < Date.now()) {
          setIsExpired(true)
        }

        setGroup(data as GroupInfo)

        // Проверяем, состоит ли пользователь уже в группе
        if (user) {
          const { data: memberData } = await supabase!
            .from('group_members')
            .select('role, status')
            .eq('group_id', data.id)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle()

          if (!cancelled && memberData) {
            setAlreadyMember(true)
          }
        }
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e?.message || 'Ошибка загрузки приглашения')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [code])

  const handleJoin = async () => {
    if (!isLoggedIn) {
      router.push('/')
      return
    }

    setJoining(true)
    try {
      const res = await joinGroupByInvite(code)
      if (res.ok) {
        setJoinedSuccess(true)
        setTimeout(() => {
          router.push('/')
        }, 1200)
      } else {
        setErrorMsg(res.error || 'Не удалось присоединиться к группе')
      }
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-400">Загрузка приглашения…</p>
        </div>
      </div>
    )
  }

  if (errorMsg && !group) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-lg font-bold">Ссылка недействительна</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">{errorMsg}</p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold transition"
          >
            На главную
          </button>
        </div>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <Clock size={28} />
          </div>
          <h2 className="text-lg font-bold">Срок ссылки истёк</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Срок действия этой ссылки-приглашения (7 дней) завершился. Попросите владельца группы «{group?.name}» отправить новое приглашение.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold transition"
          >
            На главную
          </button>
        </div>
      </div>
    )
  }

  const kindLabel = group ? KIND_NAMES[group.kind] || 'Соратники' : 'Группа'

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900/95 border border-zinc-800 p-6 shadow-2xl text-center space-y-5">
        {/* Аватар группы */}
        <div
          className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg border"
          style={{
            backgroundColor: `${group?.color || '#ff5c00'}20`,
            borderColor: `${group?.color || '#ff5c00'}40`,
          }}
        >
          {group?.avatar || '👥'}
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
            {kindLabel}
          </span>
          <h1 className="text-xl font-bold mt-2 text-white">{group?.name}</h1>
          {group?.description && (
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-3">
              {group.description}
            </p>
          )}
        </div>

        <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 text-xs text-zinc-400 leading-relaxed flex items-center gap-2.5 justify-center">
          <Shield size={16} className="text-purple-400 shrink-0" />
          <span>Закрытая группа в приложении «Огонёк»</span>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
            {errorMsg}
          </p>
        )}

        {joinedSuccess ? (
          <div className="py-2 flex items-center justify-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle size={18} />
            <span>Вы присоединились! Переход…</span>
          </div>
        ) : alreadyMember ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400">Вы уже являетесь участником этой группы</p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <span>Открыть в приложении</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : isLoggedIn ? (
          <button
            type="button"
            disabled={joining}
            onClick={handleJoin}
            className="w-full py-3 rounded-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-bold transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
          >
            {joining ? (
              <span>Вход в группу…</span>
            ) : (
              <>
                <span>Присоединиться к группе</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full py-3 rounded-full bg-white text-black hover:bg-zinc-200 text-sm font-bold transition flex items-center justify-center gap-2"
          >
            <LogIn size={16} />
            <span>Войти, чтобы присоединиться</span>
          </button>
        )}
      </div>
    </div>
  )
}

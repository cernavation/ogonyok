import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSupabase } from '@/lib/supabase/server'
import { normalizeTier } from '@/lib/ogonek/permissions'
import { InviteClient } from './invite-client'
import { Flame, UserPlus } from 'lucide-react'

interface Props {
  params: Promise<{ username: string }>
}

async function getProfileByUsername(rawUsername: string) {
  const clean = decodeURIComponent(rawUsername || '').trim().replace(/^@+/, '').toLowerCase()
  if (!clean) return null

  try {
    const supabase = getServerSupabase()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_image, avatar_url, city, bio, streak, streak_count, level, difficulty_level, subscription_tier, is_founder, is_anonymous, settings')
      .ilike('username', clean)
      .maybeSingle()

    if (error || !profile) return null

    // Проверяем видимость (скрытые и анонимные профили не отдаем по инвайтам)
    if (profile.is_anonymous === true) return null
    const settings = (profile.settings || {}) as any
    if (settings?.privacy?.discoverable === false) return null

    // Подсчитываем число дней
    const { count } = await supabase
      .from('days')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)

    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name || profile.username,
      avatarImage: profile.avatar_image || profile.avatar_url,
      city: profile.city || '',
      bio: profile.bio || '',
      streak: profile.streak ?? profile.streak_count ?? 0,
      totalDays: count ?? 0,
      tier: normalizeTier(profile.subscription_tier),
      isFounder: Boolean(profile.is_founder),
    }
  } catch (err) {
    console.warn('[getProfileByUsername] Supabase error:', err)
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params
  const profile = await getProfileByUsername(resolvedParams.username)

  if (!profile) {
    return {
      title: 'Пользователь не найден — Огонёк',
      description: 'Приглашение в систему личной силы и побед «Огонёк»',
    }
  }

  const title = `Приглашение от ${profile.displayName} (@${profile.username}) в «Огонёк»`
  const description = `${profile.displayName} держит огонь побед уже ${profile.streak} дн. Присоединяйся к кругу соратников!`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: profile.avatarImage ? [{ url: profile.avatarImage }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: profile.avatarImage ? [profile.avatarImage] : [],
    },
  }
}

export default async function InvitePage({ params }: Props) {
  const resolvedParams = await params
  const profile = await getProfileByUsername(resolvedParams.username)

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#0d0e11] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-[#16181c] border border-white/10 p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <Flame size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Пользователь не найден</h1>
          <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
            Пользователь с никнеймом «@{resolvedParams.username}» не зарегистрирован или закрыл свой профиль настройками
            приватности.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/?openAuth=register"
              className="w-full py-3 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              <UserPlus size={16} /> Создать свой профиль в «Огоньке»
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-medium text-xs border border-white/10 transition"
            >
              На главную
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d0e11] text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <InviteClient profile={profile} />
    </main>
  )
}

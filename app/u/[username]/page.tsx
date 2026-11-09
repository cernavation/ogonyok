import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSupabase } from '@/lib/supabase/server'
import { normalizeTier } from '@/lib/ogonek/permissions'
import { UserProfileClient } from './user-profile-client'
import { Flame } from 'lucide-react'

interface Props {
  params: Promise<{ username: string }>
}

async function getUserProfile(rawUsername: string) {
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

    // Проверяем видимость (скрытые и анонимные профили)
    if (profile.is_anonymous === true) return null
    const settings = (profile.settings || {}) as any
    if (settings?.privacy?.discoverable === false) return null

    // Загружаем публичные дни пользователя
    const { data: daysData } = await supabase
      .from('days')
      .select(`
        id,
        day_number,
        day_date,
        score,
        visibility,
        created_at,
        prides (id, num, text, score),
        gratitudes (id, num, text)
      `)
      .eq('user_id', profile.id)
      .eq('visibility', 'public')
      .order('day_number', { ascending: false })
      .limit(20)

    const initialDays = Array.isArray(daysData)
      ? daysData.map((d: any) => ({
          id: d.id,
          dayNumber: d.day_number,
          dayDate: d.day_date,
          score: d.score,
          visibility: d.visibility,
          prides: Array.isArray(d.prides) ? d.prides : [],
          gratitudes: Array.isArray(d.gratitudes) ? d.gratitudes : [],
        }))
      : []

    return {
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name || profile.username,
        avatarImage: profile.avatar_image || profile.avatar_url,
        city: profile.city || '',
        bio: profile.bio || '',
        streak: profile.streak ?? profile.streak_count ?? 0,
        level: profile.level ?? profile.difficulty_level ?? 1,
        tier: normalizeTier(profile.subscription_tier),
        isFounder: Boolean(profile.is_founder),
      },
      initialDays,
      mutualComrades: [],
    }
  } catch (err) {
    console.warn('[getUserProfile] Error:', err)
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params
  const res = await getUserProfile(resolvedParams.username)

  if (!res) {
    return {
      title: 'Пользователь не найден — Огонёк',
    }
  }

  const { profile } = res
  const title = `${profile.displayName} (@${profile.username}) — Профиль в «Огоньке»`
  const description = `${profile.displayName} ведёт летопись побед и держит огонь уже ${profile.streak} дн.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: profile.avatarImage ? [{ url: profile.avatarImage }] : [],
    },
  }
}

export default async function UserProfilePage({ params }: Props) {
  const resolvedParams = await params
  const res = await getUserProfile(resolvedParams.username)

  if (!res) {
    return (
      <main className="min-h-screen bg-[#0d0e11] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-[#16181c] border border-white/10 p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <Flame size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Профиль не найден</h1>
          <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
            Пользователь «@{resolvedParams.username}» не зарегистрирован или закрыл свой профиль настройками приватности.
          </p>
          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-medium text-xs border border-white/10 flex items-center justify-center transition"
          >
            На главную
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d0e11] text-white">
      <UserProfileClient
        profile={res.profile}
        initialDays={res.initialDays}
        mutualComrades={res.mutualComrades}
      />
    </main>
  )
}

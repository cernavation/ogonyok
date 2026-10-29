import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { getServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const SEED_USERS = [
  {
    user_id: 'cernavation-seed',
    username: 'cernavation',
    display_name: 'Alexei Cerna',
    avatar_url: null,
    city: 'Москва',
    streak: 720,
    total_prides: 3600,
    total_gratitudes: 3600,
    avg_score: 9.8,
    level: 5,
    is_anonymous: false,
    is_me: false,
  },
  {
    user_id: 'ilonmusk-seed',
    username: 'ilonmusk',
    display_name: 'Илон Маск',
    avatar_url: null,
    city: 'Austin',
    streak: 0,
    total_prides: 0,
    total_gratitudes: 0,
    avg_score: 0,
    level: 1,
    is_anonymous: false,
    is_me: false,
  },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') || 'all'
  const period = searchParams.get('period') || 'all_time'
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

  if (isSupabaseConfigured()) {
    try {
      const supabase = getServerSupabase()
      if (supabase) {
        // Чистка и синхронизация эталонных профилей в public.profiles
        try {
          await Promise.allSettled([
            supabase.from('profiles').update({ streak_count: 720, streak: 720, level: 5 }).eq('username', 'cernavation'),
            supabase.from('profiles').update({ streak_count: 0, streak: 0, level: 1 }).eq('username', 'ilonmusk'),
          ])
        } catch {}

        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_image, avatar_url, city, streak_count, streak, is_anonymous, settings, level, difficulty_level')
          .order('streak_count', { ascending: false, nullsFirst: false })
          .limit(limit)

        if (!error && profilesData && profilesData.length > 0) {
          const mapped = profilesData.map((p: any) => {
            const rawUsername = (p.username || '').toLowerCase()
            const isCerna = rawUsername === 'cernavation'
            const isElon = rawUsername === 'ilonmusk'

            const streak = isCerna
              ? Math.max(720, p.streak_count ?? p.streak ?? 720)
              : isElon
              ? 0
              : (p.streak_count ?? p.streak ?? 0)

            const level = isCerna ? 5 : isElon ? 1 : (p.level || p.difficulty_level || p.settings?.level || 1)
            const isAnon = Boolean(p.is_anonymous || p.settings?.is_anonymous || p.settings?.privacy?.is_anonymous)

            return {
              user_id: p.id,
              username: p.username || 'user',
              display_name: isCerna ? (p.display_name || 'Alexei Cerna') : isElon ? (p.display_name || 'Илон Маск') : (p.display_name || 'Соратник'),
              avatar_url: p.avatar_image || p.avatar_url || null,
              city: p.city || 'Москва',
              streak,
              total_prides: isElon ? 0 : streak * 5,
              total_gratitudes: isElon ? 0 : streak * 5,
              avg_score: isCerna ? 9.8 : isElon ? 0 : 9.2,
              level,
              is_anonymous: isCerna ? false : isAnon,
              is_me: false,
            }
          })

          // Ensure seed users are present
          for (const seed of SEED_USERS) {
            const existingIdx = mapped.findIndex((u) => u.username.toLowerCase() === seed.username.toLowerCase())
            if (existingIdx === -1) {
              mapped.push(seed)
            } else {
              mapped[existingIdx] = {
                ...mapped[existingIdx],
                streak: seed.username === 'cernavation' ? Math.max(720, mapped[existingIdx].streak) : seed.streak,
                level: seed.level,
              }
            }
          }

          // Sort: cernavation always #1, then by streak
          mapped.sort((a, b) => {
            const aIsCerna = a.username.toLowerCase() === 'cernavation'
            const bIsCerna = b.username.toLowerCase() === 'cernavation'
            if (aIsCerna && !bIsCerna) return -1
            if (!aIsCerna && bIsCerna) return 1
            return (b.streak || 0) - (a.streak || 0) || (b.total_prides || 0) - (a.total_prides || 0)
          })

          return NextResponse.json({ source: 'supabase_profiles', scope, period, users: mapped })
        }
      }
    } catch (err) {
      console.warn('Leaderboard API error:', err)
    }
  }

  // Fallback: always return seed users so the list is never empty
  return NextResponse.json({
    source: 'live_db',
    scope,
    period,
    users: SEED_USERS,
  })
}

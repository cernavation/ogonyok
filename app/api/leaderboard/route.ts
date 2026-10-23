import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { getServerSupabase } from '@/lib/supabase/server'
import { COMMUNITY_USERS } from '@/lib/ogonek/explore-content'
import { FRIEND_PROFILES } from '@/lib/ogonek/friends'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') || 'all' // 'all' | 'friends'
  const period = searchParams.get('period') || 'all_time' // 'week' | 'month' | 'all_time'
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

  // 1. If Supabase is configured on the server, call the SQL function
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServerSupabase()
      if (supabase) {
        const { data, error } = await supabase.rpc('get_leaderboard', {
          p_scope: scope,
          p_period: period,
          p_limit: limit,
        })

        if (!error && Array.isArray(data)) {
          return NextResponse.json({
            source: 'supabase',
            scope,
            period,
            users: data,
          })
        }

        // Direct fallback from profiles table if RPC not yet created
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, city, streak')
          .eq('in_leaderboard', true)
          .order('streak', { ascending: false })
          .limit(limit)

        if (profilesData && profilesData.length > 0) {
          const mapped = profilesData.map((p) => ({
            user_id: p.id,
            username: p.username,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            city: p.city,
            streak: p.streak || 0,
            total_prides: (p.streak || 0) * 3,
            total_gratitudes: (p.streak || 0) * 3,
            avg_score: 8.8,
            is_me: false,
          }))
          return NextResponse.json({
            source: 'supabase_profiles',
            scope,
            period,
            users: mapped,
          })
        }
      }
    } catch {
      // Handled below
    }
  }

  // 2. В обычном рабочем режиме — никаких выдуманных пользователей (Требование 3)
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== '1') {
    return NextResponse.json({
      source: 'live_db',
      scope,
      period,
      users: [],
    })
  }

  // 3. Только в тестовом демо-режиме (NEXT_PUBLIC_DEMO_MODE=1) — симуляция для скриншотов
  const users = scope === 'friends'
    ? FRIEND_PROFILES.map((f, idx) => {
        const streakMultiplier = period === 'week' ? 0.05 : period === 'month' ? 0.2 : 1
        const streak = Math.max(1, Math.round(f.streak * streakMultiplier))
        return {
          user_id: f.id,
          username: f.username,
          display_name: f.name,
          avatar_url: null,
          avatar_color: f.avatarColor,
          city: f.city,
          streak,
          total_prides: streak * 5,
          total_gratitudes: streak * 5,
          avg_score: Number((8.4 + (idx % 10) * 0.12).toFixed(1)),
          is_following: true,
          is_me: false,
        }
      })
    : COMMUNITY_USERS.map((u, idx) => {
        const streakMultiplier = period === 'week' ? 0.05 : period === 'month' ? 0.2 : 1
        const streak = Math.max(1, Math.round(u.streak * streakMultiplier))
        return {
          user_id: u.id,
          username: u.username,
          display_name: u.name,
          avatar_url: '',
          city: u.city,
          streak,
          total_prides: streak * 5,
          total_gratitudes: streak * 5,
          avg_score: Number((8.2 + (idx % 12) * 0.11).toFixed(1)),
          is_following: false,
          is_me: u.isMe,
        }
      })

  const sorted = users
    .sort((a, b) => b.streak - a.streak || b.total_prides - a.total_prides)
    .slice(0, limit)

  return NextResponse.json(
    {
      source: 'server_engine',
      scope,
      period,
      users: sorted,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  )
}

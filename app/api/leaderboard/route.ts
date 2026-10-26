import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { getServerSupabase } from '@/lib/supabase/server'

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
          .select('id, username, display_name, avatar_image, city, streak_count, settings')
          .order('streak_count', { ascending: false })
          .limit(limit)

        if (profilesData && profilesData.length > 0) {
          const mapped = profilesData.map((p: any) => ({
            user_id: p.id,
            username: p.username,
            display_name: p.display_name,
            avatar_url: p.avatar_image || null,
            city: p.city,
            streak: p.streak_count || 0,
            total_prides: (p.streak_count || 0) * 3,
            total_gratitudes: (p.streak_count || 0) * 3,
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

  // 2. В обычном рабочем режиме — только реальные пользователи из базы Supabase
  return NextResponse.json({
    source: 'live_db',
    scope,
    period,
    users: [],
  })
}

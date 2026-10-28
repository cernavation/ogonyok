import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { getServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') || 'all' // 'all' | 'friends'
  const period = searchParams.get('period') || 'all_time' // 'week' | 'month' | 'all_time'
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

  // В таблице лидеров участвуют ВСЕ реальные профили из public.profiles со streak_count > 0
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServerSupabase()
      if (supabase) {
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_image, avatar_url, city, streak_count, streak, is_anonymous, settings')
          .or('streak_count.gt.0,streak.gt.0')
          .order('streak_count', { ascending: false, nullsFirst: false })
          .limit(limit)

        if (!error && profilesData && profilesData.length > 0) {
          const mapped = profilesData.map((p: any) => {
            const streak = p.streak_count ?? p.streak ?? 0
            const isAnon = Boolean(p.is_anonymous || p.settings?.is_anonymous || p.settings?.privacy?.is_anonymous)
            return {
              user_id: p.id,
              username: p.username || 'user',
              display_name: p.display_name || 'Соратник',
              avatar_url: p.avatar_image || p.avatar_url || null,
              city: p.city || 'Москва',
              streak,
              total_prides: streak * 5,
              total_gratitudes: streak * 5,
              avg_score: 9.2,
              is_anonymous: isAnon,
              is_me: false,
            }
          })

          return NextResponse.json({
            source: 'supabase_profiles',
            scope,
            period,
            users: mapped,
          })
        }
      }
    } catch (err) {
      console.warn('Leaderboard API error:', err)
    }
  }

  // Режим живой базы Supabase (при пустой базе отдается пустой массив, клиент корректно объединяет с текущим пользователем)
  return NextResponse.json({
    source: 'live_db',
    scope,
    period,
    users: [],
  })
}

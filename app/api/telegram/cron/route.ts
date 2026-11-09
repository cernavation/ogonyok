import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { apiErrorResponse } from '@/lib/server/api-validator'
import { applyRateLimit } from '@/lib/server/rate-limit'

export async function GET(request: Request) {
  const rateLimitResponse = await applyRateLimit(request, {
    route: 'telegram-cron-get',
    limit: 60,
    windowSeconds: 60,
  })
  if (rateLimitResponse) return rateLimitResponse
  return handleCron(request)
}

export async function POST(request: Request) {
  const rateLimitResponse = await applyRateLimit(request, {
    route: 'telegram-cron-post',
    limit: 60,
    windowSeconds: 60,
  })
  if (rateLimitResponse) return rateLimitResponse
  return handleCron(request)
}

async function handleCron(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const cronSecret = process.env.CRON_SECRET

  // Проверка секрета (Vercel Cron или заголовок Authorization)
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    const url = new URL(request.url)
    const querySecret = url.searchParams.get('secret')

    const isMatch =
      authHeader === `Bearer ${cronSecret}` ||
      querySecret === cronSecret ||
      request.headers.get('x-vercel-cron') === '1'

    if (!isMatch) {
      return apiErrorResponse('UNAUTHORIZED', 'Доступ запрещён (неверный CRON_SECRET)', 401)
    }
  }

  if (!token) {
    return apiErrorResponse('CONFIG_ERROR', 'TELEGRAM_BOT_TOKEN не настроен', 400)
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return apiErrorResponse('CONFIG_ERROR', 'Supabase не подключен', 400)
  }

  try {
    const todayStr = new Date().toISOString().slice(0, 10)

    // Ищем пользователей с подключённым Telegram
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, username, display_name, telegram_chat_id, level, reminder_times')
      .not('telegram_chat_id', 'is', null)

    if (userError || !users) {
      return NextResponse.json({ error: userError?.message || 'Пользователи не найдены' }, { status: 500 })
    }

    let sentCount = 0
    let skippedClosedCount = 0

    for (const u of users) {
      if (!u.telegram_chat_id) continue

      // Проверяем, закрыт ли день пользователя сегодня (Каноническая модель: таблица days)
      const { data: todayDays } = await supabase
        .from('days')
        .select('id, day_number, status, closed_at, date_iso, updated_at')
        .eq('user_id', u.id)
        .order('day_number', { ascending: false })
        .limit(1)

      const latestDay = todayDays?.[0]
      const isAlreadyClosed =
        latestDay?.status === 'closed' &&
        (latestDay.closed_at?.slice(0, 10) === todayStr ||
          latestDay.date_iso === todayStr ||
          latestDay.updated_at?.slice(0, 10) === todayStr)

      if (isAlreadyClosed) {
        skippedClosedCount += 1
        continue
      }

      const text = `🔥 <b>Огонёк ждёт тебя!</b>\n\nПривет, ${u.display_name}! Твой день дневника ещё не закрыт.\nЗапиши свои гордости и благодарности сегодня, чтобы огонь не угасал!`

      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: u.telegram_chat_id,
            text,
            parse_mode: 'HTML',
          }),
          signal: AbortSignal.timeout(6000),
        })
        if (res.ok) sentCount += 1
      } catch (e) {
        console.error(`Failed to send reminder to ${u.telegram_chat_id}:`, e)
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      skippedClosedCount,
      totalUsersWithTg: users.length,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

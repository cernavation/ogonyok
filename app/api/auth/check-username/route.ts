import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getClientIp, checkRateLimit } from '@/lib/server/rate-limit'
import { validateUsernameSecurity } from '@/lib/server/signup-protection'

export async function GET(request: Request) {
  const ip = getClientIp(request)

  // Rate limiting: максимум 60 проверок в минуту с одного IP
  const rate = await checkRateLimit(`check-username:ip:${ip}`, 60, 60)
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Слишком много запросов проверки никнейма. Подождите минуту.',
          retryAfter: rate.retryAfter,
        },
      },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    )
  }

  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('username') || searchParams.get('nick') || ''

  if (!raw || raw.trim().length === 0) {
    return NextResponse.json({
      ok: true,
      available: false,
      reason: 'Укажите никнейм для проверки',
    })
  }

  const val = validateUsernameSecurity(raw)
  if (!val.valid) {
    return NextResponse.json({
      ok: true,
      available: false,
      normalized: val.normalized,
      reason: val.error || 'Недопустимый формат никнейма',
    })
  }

  const cleanUsername = val.normalized

  try {
    const supabase = getServerSupabase()
    if (supabase) {
      const { data: existingProfile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle()

      if (!error && existingProfile) {
        return NextResponse.json({
          ok: true,
          available: false,
          normalized: cleanUsername,
          reason: 'Этот никнейм уже занят',
        })
      }
    }

    return NextResponse.json({
      ok: true,
      available: true,
      normalized: cleanUsername,
    })
  } catch (err: any) {
    console.error('[CHECK_USERNAME_ERROR]:', err)
    // В случае сбоя БД не блокируем пользователя наглухо
    return NextResponse.json({
      ok: true,
      available: true,
      normalized: cleanUsername,
      warning: 'Проверка доступности выполняется локально',
    })
  }
}

export async function POST(request: Request) {
  let body: any = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const username = body.username || body.nick || ''
  const fakeUrl = new URL(`http://localhost/api/auth/check-username?username=${encodeURIComponent(username)}`)
  const fakeReq = new Request(fakeUrl.toString(), {
    headers: request.headers,
  })
  return GET(fakeReq)
}

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

const FOUNDER_USERNAME = 'cernavation'
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function authorizeFounder(request: Request) {
  const ip = getClientIp(request)
  const rl = await checkRateLimit('admin-broadcast', ip, 60, 60_000)
  if (!rl.allowed) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: 'Too Many Requests' }, { status: 429 }),
    }
  }

  const user = await getAuthenticatedUser(request)
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 503 }),
    }
  }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', user.userId)
    .maybeSingle()

  const normalizedUsername = String(profile?.username || '').trim().toLowerCase()
  if (profErr || !profile || normalizedUsername !== FOUNDER_USERNAME) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: 'Forbidden: только основатель @cernavation может управлять рассылками' },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true as const,
    userId: user.userId,
    supabase,
  }
}

async function countAllProfiles(supabase: NonNullable<ReturnType<typeof getServerSupabase>>): Promise<number> {
  try {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
    return typeof count === 'number' ? count : 0
  } catch {
    return 0
  }
}

export async function GET(request: Request) {
  const auth = await authorizeFounder(request)
  if (!auth.ok) return auth.response

  const totalUsers = await countAllProfiles(auth.supabase)
  return NextResponse.json({
    ok: true,
    totalUsers,
  })
}

export async function POST(request: Request) {
  const auth = await authorizeFounder(request)
  if (!auth.ok) return auth.response

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Некорректный JSON' }, { status: 400 })
  }

  const rawText = typeof body?.text === 'string' ? body.text.trim() : ''
  const rawMediaUrl = typeof body?.mediaUrl === 'string' ? body.mediaUrl.trim() : ''

  if (rawMediaUrl && (/^data:/i.test(rawMediaUrl) || /^blob:/i.test(rawMediaUrl))) {
    return NextResponse.json(
      { ok: false, error: 'Изображение ещё загружается или имеет неподдерживаемый формат' },
      { status: 400 }
    )
  }

  const cleanText = rawText.slice(0, 4000)
  const cleanMediaUrl =
    rawMediaUrl && (/^https?:\/\//i.test(rawMediaUrl) || rawMediaUrl.startsWith('/'))
      ? rawMediaUrl.slice(0, 1000)
      : null

  if (!cleanText && !cleanMediaUrl) {
    return NextResponse.json(
      { ok: false, error: 'Введите текст объявления или прикрепите изображение' },
      { status: 400 }
    )
  }

  const { data: inserted, error: insertErr } = await auth.supabase
    .from('official_broadcasts')
    .insert({
      author_id: auth.userId,
      text: cleanText,
      media_url: cleanMediaUrl,
    })
    .select('id, author_id, text, media_url, created_at')
    .single()

  if (insertErr || !inserted) {
    return NextResponse.json(
      { ok: false, error: insertErr?.message || 'Не удалось сохранить рассылку' },
      { status: 500 }
    )
  }

  try {
    await auth.supabase
      .from('profiles')
      .update({ last_read_official_at: inserted.created_at })
      .eq('id', auth.userId)
  } catch {}

  const totalUsers = await countAllProfiles(auth.supabase)

  return NextResponse.json({
    ok: true,
    broadcast: inserted,
    totalUsers,
  })
}

export async function DELETE(request: Request) {
  const auth = await authorizeFounder(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  let broadcastId = (searchParams.get('id') || '').trim()
  if (!broadcastId) {
    try {
      const json = await request.json()
      broadcastId = String(json?.id || '').trim()
    } catch {}
  }

  if (!broadcastId || !UUID_REGEX.test(broadcastId)) {
    return NextResponse.json({ ok: false, error: 'Некорректный ID рассылки' }, { status: 400 })
  }

  const { error } = await auth.supabase
    .from('official_broadcasts')
    .delete()
    .eq('id', broadcastId)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, deletedId: broadcastId })
}

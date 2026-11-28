import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSupabase } from '@/lib/supabase/server'
import {
  PRIDAY_SUPPORT_CUSTOM_REPLY,
  matchPridayQuickAction,
  PRIDAY_WELCOME_TEXT,
} from '@/lib/ogonek/priday-system-chat'

async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  try {
    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await authClient.auth.getUser(token)
    if (!error && data?.user?.id) return data.user.id
  } catch {}
  return null
}

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 503 })
  }

  const collected: any[] = []

  try {
    const { data: rows, error } = await supabase
      .from('priday_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (!error && Array.isArray(rows)) {
      collected.push(...rows)
    }
  } catch {}

  try {
    const { data: notifRows, error: nErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .in('type', [
        'priday_follow',
        'priday_mutual',
        'priday_support_user',
        'priday_support_reply',
        'priday_milestone',
      ])
      .order('created_at', { ascending: true })
    if (!nErr && Array.isArray(notifRows)) {
      collected.push(...notifRows)
    }
  } catch {}

  return NextResponse.json({ ok: true, messages: collected })
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 1200) : ''
  const actionId = typeof body?.actionId === 'string' ? body.actionId : null
  if (!text && !actionId) {
    return NextResponse.json({ ok: false, error: 'Message text is required' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 503 })
  }

  const matched = matchPridayQuickAction(text)
  const replyText = matched ? matched.replyText : PRIDAY_SUPPORT_CUSTOM_REPLY
  const isSupport = !matched || Boolean(matched.isSupport)
  const nowISO = new Date().toISOString()
  const replyISO = new Date(Date.now() + 50).toISOString()

  if (body?.seedWelcome) {
    try {
      await supabase.from('priday_messages').insert({
        user_id: userId,
        sender: 'priday',
        kind: 'welcome',
        body: PRIDAY_WELCOME_TEXT,
        is_read: true,
        created_at: nowISO,
      })
    } catch {}
    return NextResponse.json({ ok: true })
  }

  let persisted = false
  try {
    const { error: insertErr } = await supabase.from('priday_messages').insert([
      {
        user_id: userId,
        sender: 'user',
        kind: isSupport ? 'support_user' : 'canned',
        body: text,
        is_read: true,
        meta: { actionId: matched?.id || actionId || 'custom' },
        created_at: nowISO,
      },
      {
        user_id: userId,
        sender: 'priday',
        kind: isSupport ? 'support_reply' : 'canned',
        body: replyText,
        is_read: true,
        meta: { actionId: matched?.id || actionId || 'custom' },
        created_at: replyISO,
      },
    ])
    if (!insertErr) persisted = true
  } catch {}

  if (!persisted && isSupport) {
    try {
      const { error: notifErr } = await supabase.from('notifications').insert([
        {
          user_id: userId,
          type: 'priday_support_user',
          title: 'Обращение в поддержку Winlog',
          body: text,
          data: { source: 'priday_chat', kind: 'support_user', actionId: matched?.id || 'custom' },
          is_read: true,
          created_at: nowISO,
        },
        {
          user_id: userId,
          type: 'priday_support_reply',
          title: 'Winlog',
          body: replyText,
          data: { source: 'priday_chat', kind: 'support_reply', actionId: matched?.id || 'custom' },
          is_read: true,
          created_at: replyISO,
        },
      ])
      if (!notifErr) persisted = true
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    persisted,
    isSupport,
    replyText,
  })
}

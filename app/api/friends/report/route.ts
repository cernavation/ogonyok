import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { targetUserId, reason, viewerId } = body
  if (!targetUserId) {
    return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })
  }

  const currentUid = viewerId
  if (!currentUid) {
    return NextResponse.json({ error: 'viewerId required' }, { status: 401 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 503 })
  }

  try {
    try {
      const { data, error } = await supabase.rpc('report_profile', {
        target_user_id: targetUserId,
        p_reason: reason || '',
        p_viewer_id: currentUid,
      })
      if (!error && data) return NextResponse.json(data)
    } catch {}

    const { error: insErr } = await supabase.from('reports').insert({
      reporter_id: currentUid,
      target_id: targetUserId,
      reason: reason || '',
    })

    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, reported: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 })
  }
}

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { evaluateReminder } from '@/lib/ogonek/reminder-logic'
import type { StreakState } from '@/lib/ogonek/streak'

const SNAPSHOT_FILE = path.join(process.cwd(), '.data', 'streak-snapshot.json')

export async function POST(request: Request) {
  // Check CRON_SECRET if configured
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (token !== cronSecret) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
  }

  // Load streak snapshot
  let snapshot: StreakState
  try {
    const raw = await fs.readFile(SNAPSHOT_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<StreakState>
    snapshot = {
      streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
      best: typeof parsed.best === 'number' ? parsed.best : 0,
      lastEntryDay: typeof parsed.lastEntryDay === 'string' ? parsed.lastEntryDay : null,
      missedRun: typeof parsed.missedRun === 'number' ? parsed.missedRun : 0,
      status: parsed.status === 'grace' ? 'grace' : parsed.status === 'burned' ? 'burned' : 'safe',
      deadline: parsed.deadline ? new Date(parsed.deadline) : null,
      hoursLeft: typeof parsed.hoursLeft === 'number' ? parsed.hoursLeft : null,
      filledDays: Array.isArray(parsed.filledDays) ? parsed.filledDays : [],
    }
  } catch {
    return NextResponse.json(
      { error: 'Снимок стрика (.data/streak-snapshot.json) не найден. Сначала выполните синхронизацию.' },
      { status: 404 }
    )
  }

  const decision = evaluateReminder(snapshot, new Date())

  if (!decision.send || !decision.message) {
    return NextResponse.json({
      success: true,
      sent: false,
      reason: decision.reason,
    })
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    return NextResponse.json({
      success: false,
      sent: false,
      error: 'TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не настроены в .env',
      reason: decision.reason,
    })
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: decision.message,
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      return NextResponse.json(
        { success: false, sent: false, error: `Telegram error ${res.status}: ${err}` },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      sent: true,
      type: decision.type,
      reason: decision.reason,
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, sent: false, error: String(err) },
      { status: 500 }
    )
  }
}

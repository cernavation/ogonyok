import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { computeStreak } from '@/lib/ogonek/streak'
import { validateJsonBody, StreakSyncSchema } from '@/lib/server/api-validator'

const SNAPSHOT_DIR = path.join(process.cwd(), '.data')
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, 'streak-snapshot.json')

export async function GET() {
  try {
    const raw = await fs.readFile(SNAPSHOT_FILE, 'utf8')
    const snapshot = JSON.parse(raw) as Record<string, unknown>
    return NextResponse.json({ success: true, snapshot })
  } catch {
    return NextResponse.json({
      success: false,
      message: 'Снимок стрика ещё не синхронизирован с сервером',
    })
  }
}

export async function POST(request: Request) {
  try {
    const validated = await validateJsonBody(request, StreakSyncSchema)
    if (!validated.success) {
      return validated.response
    }

    const dayStrings = validated.data.days
    const calculated = computeStreak(new Set(dayStrings), new Date())

    const snapshot = {
      streak: calculated.streak,
      best: calculated.best,
      status: calculated.status,
      hoursLeft: calculated.hoursLeft,
      deadline: calculated.deadline?.toISOString() ?? null,
      lastEntryDay: calculated.lastEntryDay,
      missedRun: calculated.missedRun,
      filledDays: calculated.filledDays,
      totalDaysCount: dayStrings.length,
      updatedAtISO: new Date().toISOString(),
    }

    await fs.mkdir(SNAPSHOT_DIR, { recursive: true })
    const tmpFile = `${SNAPSHOT_FILE}.tmp.${Date.now()}`
    await fs.writeFile(tmpFile, JSON.stringify(snapshot, null, 2), 'utf8')
    await fs.rename(tmpFile, SNAPSHOT_FILE)

    return NextResponse.json({ success: true, snapshot })
  } catch (err) {
    return NextResponse.json(
      { error: `Не удалось сохранить снимок стрика: ${String(err)}` },
      { status: 500 }
    )
  }
}

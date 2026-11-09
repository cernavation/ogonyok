import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { computeStreak } from '@/lib/ogonek/streak'
import { apiErrorResponse, validateJsonBody, StreakSyncSchema } from '@/lib/server/api-validator'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getServerSupabase } from '@/lib/supabase/server'

const SNAPSHOT_DIR = path.join(process.cwd(), '.data')
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, 'streak-snapshot.json')

export async function GET(request: Request) {
  const authUser = await getAuthenticatedUser(request)
  const rateLimitResponse = await applyRateLimit(request, {
    route: 'streak-sync-get',
    limit: 60,
    windowSeconds: 60,
    userId: authUser?.userId,
  })
  if (rateLimitResponse) return rateLimitResponse

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
  const authUser = await getAuthenticatedUser(request)

  const rateLimitResponse = await applyRateLimit(request, {
    route: 'streak-sync-post',
    limit: 30,
    windowSeconds: 60,
    userId: authUser?.userId,
  })
  if (rateLimitResponse) return rateLimitResponse

  // Любой роут, который делает запись, требует авторизации (JWT)
  if (!authUser) {
    return apiErrorResponse('UNAUTHORIZED', 'Требуется авторизация для синхронизации стрика', 401)
  }

  try {
    const validated = await validateJsonBody(request, StreakSyncSchema)
    if (!validated.success) {
      return validated.response
    }

    const dayStrings = validated.data.days
    const calculated = computeStreak(new Set(dayStrings), new Date())

    const snapshot = {
      userId: authUser.userId,
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

    // Обновляем streak_count в profiles для авторизованного пользователя
    try {
      const supabase = getServerSupabase()
      await supabase
        .from('profiles')
        .update({
          streak_count: calculated.streak,
          streak: calculated.streak,
        })
        .eq('id', authUser.userId)
    } catch {
      // Игнорируем ошибку Supabase при автономной работе
    }

    return NextResponse.json({ success: true, snapshot })
  } catch (err) {
    return NextResponse.json(
      { error: `Не удалось сохранить снимок стрика: ${String(err)}` },
      { status: 500 }
    )
  }
}

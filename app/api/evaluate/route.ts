import { POST as aiEvaluatePost } from '@/app/api/ai/evaluate/route'
import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit('evaluate', ip, 30, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }
  return aiEvaluatePost(request)
}

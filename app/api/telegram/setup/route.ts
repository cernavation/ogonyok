import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ success: false, error: 'TELEGRAM_BOT_TOKEN не настроен' }, { status: 400 })
  }

  const urlObj = new URL(request.url)
  const host = request.headers.get('host') || urlObj.host
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const webhookUrl = `${proto}://${host}/api/telegram/webhook`

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    })
    const data = await res.json()
    return NextResponse.json({
      success: data.ok,
      webhookUrl,
      telegramResponse: data,
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

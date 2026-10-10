import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token) {
    return NextResponse.json({
      configured: false,
      chatIdConfigured: Boolean(chatId),
      message: 'TELEGRAM_BOT_TOKEN не задан в .env.local',
    })
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json({
        configured: false,
        chatIdConfigured: Boolean(chatId),
        error: `Telegram API error: ${res.status}`,
      })
    }

    const data = (await res.json()) as {
      ok?: boolean
      result?: { username?: string; first_name?: string }
    }

    return NextResponse.json({
      configured: true,
      botUsername: data.result?.username,
      botName: data.result?.first_name,
      chatIdConfigured: Boolean(chatId),
    })
  } catch {
    return NextResponse.json({
      configured: true,
      chatIdConfigured: Boolean(chatId),
      botUsername: undefined,
    })
  }
}

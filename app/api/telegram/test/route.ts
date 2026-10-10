import { NextResponse } from 'next/server'

export async function POST() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    return NextResponse.json(
      {
        success: false,
        error: 'TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не настроены в .env.local',
      },
      { status: 400 }
    )
  }

  try {
    const text = '✦ Огонёк: Тестовое сообщение!\nСвязь между дневником и Telegram успешно установлена. Напоминания о дедлайне стрика активны.'

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { description?: string }
      return NextResponse.json(
        {
          success: false,
          error: `Ошибка Telegram API: ${errData.description || res.statusText}`,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Тестовое уведомление успешно отправлено в Telegram!',
    })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: `Не удалось связаться с Telegram: ${String(err)}`,
      },
      { status: 500 }
    )
  }
}

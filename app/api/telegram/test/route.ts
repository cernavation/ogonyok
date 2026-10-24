import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: 'TELEGRAM_BOT_TOKEN не настроен в .env.local',
      },
      { status: 400 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    chatId?: string
    userId?: string
  }

  let chatId = body.chatId || process.env.TELEGRAM_CHAT_ID

  // Если передали userId, ищем chat_id в профиле
  if (!chatId && body.userId) {
    const supabase = getServerSupabase()
    if (supabase) {
      const { data } = await supabase
        .from('profiles')
        .select('telegram_chat_id')
        .eq('id', body.userId)
        .single()
      chatId = data?.telegram_chat_id || undefined
    }
  }

  if (!chatId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Telegram Chat ID не указан. Подключите бота по ссылке или введите свой Chat ID.',
      },
      { status: 400 }
    )
  }

  try {
    const text = '✦ <b>Огонёк: Тестовое сообщение!</b>\n\nСвязь между дневником и Telegram успешно установлена. Напоминания о дневнике активны!'

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
        error: `Не удалось связаться с Telegram: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 }
    )
  }
}

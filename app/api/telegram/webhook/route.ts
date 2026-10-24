import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN не настроен' }, { status: 400 })
    }

    const update = (await request.json().catch(() => ({}))) as {
      message?: {
        chat?: { id: number }
        text?: string
        from?: { first_name?: string }
      }
    }

    const message = update?.message
    if (!message || !message.chat || !message.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    const text = message.text.trim()

    // 1. Команда /start <code>
    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      const code = parts[1]?.trim()

      if (code && code.startsWith('ogk_')) {
        const supabase = getServerSupabase()
        if (supabase) {
          const { data: linkRecord } = await supabase
            .from('telegram_links')
            .select('*')
            .eq('code', code)
            .is('used_at', null)
            .gt('expires_at', new Date().toISOString())
            .single()

          if (linkRecord) {
            // Привязываем Chat ID к профилю пользователя
            await supabase
              .from('profiles')
              .update({ telegram_chat_id: String(chatId) })
              .eq('id', linkRecord.user_id)

            // Помечаем ссылку как использованную
            await supabase
              .from('telegram_links')
              .update({ used_at: new Date().toISOString() })
              .eq('id', linkRecord.id)

            // Отправляем поздравление в Telegram
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: '🔥 <b>Огонёк успешно подключён!</b>\n\nТеперь бот будет бережно напоминать тебе о дневнике гордостей и благодарностей в выбранное время — только если день ещё не закрыт.',
                parse_mode: 'HTML',
              }),
            })

            return NextResponse.json({ ok: true, linked: true })
          }
        }
      }

      // Обычный /start без кода
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Привет! Твой Telegram Chat ID: <code>${chatId}</code>\n\nЧтобы привязать бота к Огоньку, открой Настройки в приложении и нажми «Подключить Telegram», либо введи этот номер в поле Chat ID.`,
          parse_mode: 'HTML',
        }),
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

import { toLocalDay, type StreakState, TZ } from './streak.ts'

export type ReminderType = 'urgent_grace' | 'evening_nudge' | 'burned_recovery' | 'none'

export interface ReminderDecision {
  send: boolean
  type: ReminderType
  reason: string
  message?: string
}

export function evaluateReminder(
  streakState: StreakState,
  now: Date
): ReminderDecision {
  const today = toLocalDay(now, TZ)

  // 1. If entry is already made today -> completely safe, no reminder needed
  if (streakState.lastEntryDay === today) {
    return {
      send: false,
      type: 'none',
      reason: 'Запись за сегодняшний день уже добавлена.',
    }
  }

  // 2. If streak has burned completely
  if (streakState.status === 'burned') {
    return {
      send: true,
      type: 'burned_recovery',
      reason: 'Пламя угасло, предлагаем восстановить стрик.',
      message:
        '🔥 Огонёк ждёт тебя!\nСтрик можно зажечь заново в любой момент. Зафиксируй 5 поводов для гордости сегодня!',
    }
  }

  // 3. Grace period (active risk of burning)
  if (streakState.status === 'grace') {
    const hours = streakState.hoursLeft ?? 24
    if (hours <= 24) {
      return {
        send: true,
        type: 'urgent_grace',
        reason: `Льготный период: осталось ${hours} ч. до угасания`,
        message: `⚠️ Огонёк в опасности!\nОсталось ${hours} ч. до сгорания цепочки (${streakState.streak} дн.). Зайди в дневник и отметь день, чтобы сохранить пламя!`,
      }
    }
  }

  // 4. Safe status, but no entry today -> Evening check (after 20:00 Chisinau)
  const dtfHour = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    hour12: false,
  })
  const currentHour = parseInt(dtfHour.format(now), 10)

  if (currentHour >= 20) {
    return {
      send: true,
      type: 'evening_nudge',
      reason: 'Вечернее напоминание (после 20:00).',
      message: `✨ Добрый вечер, Алексей!\nДень подходит к концу. Самое время зафиксировать 5 побед и благодарностей в «Огоньке» (текущий стрик: ${streakState.streak} дн.).`,
    }
  }

  return {
    send: false,
    type: 'none',
    reason: 'Дневное время, запись можно сделать до вечера.',
  }
}

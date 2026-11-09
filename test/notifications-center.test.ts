import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Этап 7: Центр уведомлений, счётчики unread, тосты и звуки', () => {
  const migration070 = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/070_notifications.sql'),
    'utf-8'
  )

  test('070_notifications.sql: содержит схему notifications со всеми 9 типами', () => {
    const requiredTypes = [
      'friend_request',
      'friend_accepted',
      'new_message',
      'missed_call',
      'comment',
      'reaction',
      'group_invite',
      'milestone',
      'system',
    ]

    for (const t of requiredTypes) {
      assert.match(
        migration070,
        new RegExp(`'${t}'`),
        `Тип уведомления '${t}' должен быть объявлен в CHECK или схеме 070_notifications.sql`
      )
    }
  })

  test('070_notifications.sql: содержит составной индекс (user_id, read_at, created_at desc)', () => {
    assert.match(
      migration070,
      /CREATE\s+INDEX[^\(]+ON\s+public\.notifications\s*\([\s\S]*?user_id[\s\S]*?read_at[\s\S]*?created_at\s+DESC[\s\S]*?\)/i,
      'Должен присутствовать составной индекс по user_id, read_at, created_at DESC'
    )
  })

  test('070_notifications.sql: строгая RLS изоляция (INSERT клиенту запрещен, чтение/апдейт только владелец)', () => {
    assert.match(migration070, /ALTER\s+TABLE\s+public\.notifications\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
    assert.match(migration070, /CREATE\s+POLICY\s+"notifications_select_own"/i)
    assert.match(migration070, /CREATE\s+POLICY\s+"notifications_update_own"/i)
    assert.match(migration070, /CREATE\s+POLICY\s+"notifications_delete_own"/i)
    assert.doesNotMatch(
      migration070,
      /CREATE\s+POLICY[^\n]+FOR\s+INSERT\s+TO\s+authenticated/i,
      'Клиентский прямой INSERT для authenticated должен отсутствовать (только триггеры и security definer)'
    )
  })

  test('070_notifications.sql: триггер direct_messages исключает само-сообщения, заглушённые чаты и агрегирует за 5 минут', () => {
    assert.match(
      migration070,
      /recipient_id\s*=\s*NEW\.author_id/i,
      'Триггер должен проверять, что получатель не является автором'
    )
    assert.match(
      migration070,
      /muted_threads|muted_users/i,
      'Триггер должен проверять заглушённые чаты'
    )
    assert.match(
      migration070,
      /5\s+minutes/i,
      'Триггер должен агрегировать сообщения за 5 минут'
    )
  })

  test('070_notifications.sql: триггер реакций агрегирует события не чаще 1 раза в минуту', () => {
    assert.match(
      migration070,
      /1\s+minute/i,
      'Триггер реакций должен агрегировать события не чаще 1 раза в минуту'
    )
  })

  test('070_notifications.sql: триггер звонков при статусе missed создает уведомление и системное сообщение', () => {
    assert.match(
      migration070,
      /status\s*=\s*'missed'/i,
      'Триггер должен реагировать на статус missed'
    )
    assert.match(
      migration070,
      /INSERT\s+INTO\s+public\.direct_messages/i,
      'Триггер должен создавать системное сообщение в direct_messages'
    )
    assert.match(
      migration070,
      /Пропущенный\s+звонок/i,
      'Системное сообщение должно содержать текст «Пропущенный звонок»'
    )
  })

  test('070_notifications.sql: содержит RPC функции get_unread_counts, mark_notification_read, mark_all_notifications_read, mark_chat_read', () => {
    const requiredRpcs = [
      'get_unread_counts',
      'mark_notification_read',
      'mark_all_notifications_read',
      'mark_chat_read',
    ]

    for (const rpc of requiredRpcs) {
      assert.match(
        migration070,
        new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${rpc}`, 'i'),
        `RPC функция public.${rpc} должна быть объявлена в 070_notifications.sql`
      )
    }
  })

  test('Счётчики: useUnreadCounts обновляет document.title и бейдж favicon при изменении counts', () => {
    const useUnread = fs.readFileSync(
      path.join(process.cwd(), 'lib/ogonek/use-unread-counts.ts'),
      'utf-8'
    )
    const notifsLib = fs.readFileSync(
      path.join(process.cwd(), 'lib/ogonek/notifications.ts'),
      'utf-8'
    )

    assert.match(useUnread, /getUnreadCounts/i)
    assert.match(useUnread, /updateDocumentTitle/i)
    assert.match(useUnread, /updateFaviconBadge/i)
    assert.match(notifsLib, /document\.title\s*=\s*`\(\${badgeText}\)\s*\${baseTitle}`/i)
  })

  test('Тосты: TelegramToastStack ограничивает стек до 3 штук и поддерживает паузу при hover', () => {
    const toastStack = fs.readFileSync(
      path.join(process.cwd(), 'components/ogonek/notifications/telegram-toast-stack.tsx'),
      'utf-8'
    )

    assert.match(toastStack, /slice\(0,\s*3\)/i, 'Стек должен быть ограничен 3 элементами')
    assert.match(toastStack, /handleMouseEnter/i, 'Должна быть пауза таймера при наведении')
    assert.match(toastStack, /handleMouseLeave/i, 'Должно быть возобновление таймера при уходе курсора')
    assert.match(toastStack, /isViewingThisChat/i, 'Не должен показывать тост, если пользователь уже смотрит этот чат')
    assert.match(toastStack, /Ответить/i, 'Должна быть кнопка быстрого ответа')
  })

  test('Звуки: notification-sound использует Web Audio API и учитывает DND режим', () => {
    const soundLib = fs.readFileSync(
      path.join(process.cwd(), 'lib/ogonek/notification-sound.ts'),
      'utf-8'
    )

    assert.match(soundLib, /AudioContext/i, 'Должен использовать Web Audio API')
    assert.match(soundLib, /playNewMessageSound/i, 'Звук нового сообщения')
    assert.match(soundLib, /playFriendRequestSound/i, 'Звук заявки в соратники')
    assert.match(soundLib, /playMissedCallSound/i, 'Звук пропущенного звонка')
    assert.match(soundLib, /dndUntil/i, 'Проверка режима Не беспокоить')
  })

  test('Центр уведомлений: NotificationCenterModal группирует по дням и содержит пустое состояние', () => {
    const centerModal = fs.readFileSync(
      path.join(process.cwd(), 'components/ogonek/notifications/notification-center-modal.tsx'),
      'utf-8'
    )

    assert.match(centerModal, /Сегодня/i)
    assert.match(centerModal, /Вчера/i)
    assert.match(centerModal, /Ранее/i)
    assert.match(centerModal, /Пока\s+нет\s+уведомлений/i)
    assert.match(centerModal, /handleMarkAllRead/i)
  })

  test('Пропущенный звонок: рендерится как системное сообщение в чате и диалог-листе', () => {
    const bubble = fs.readFileSync(
      path.join(process.cwd(), 'components/ogonek/messenger/chat-message-bubble.tsx'),
      'utf-8'
    )
    const dialogList = fs.readFileSync(
      path.join(process.cwd(), 'components/ogonek/messenger/messenger-dialog-list.tsx'),
      'utf-8'
    )

    assert.match(bubble, /PhoneMissed/i)
    assert.match(bubble, /isMissedCall/i)
    assert.match(bubble, /Пропущенный\s+звонок/i)
    assert.match(dialogList, /PhoneMissed/i)
  })
})

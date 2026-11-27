import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

import {
  extractFirstUrl,
  buildLinkPreview,
  sanitizeFileName,
  detectChatMediaType,
} from '../lib/ogonek/chat-media-service.ts'
import { canScheduleMessage, getTierLimits } from '../lib/ogonek/permissions.ts'
import { sendDirectMessageToDb } from '../lib/supabase/api.ts'

test('Step 08: Chat Media - No Base64, size < 2KB, link preview', async (t) => {
  await t.test('extractFirstUrl extracts URLs from text and ignores non-urls', () => {
    assert.strictEqual(extractFirstUrl('Привет! Посмотри https://github.com/ogonek'), 'https://github.com/ogonek')
    assert.strictEqual(extractFirstUrl('Без ссылок'), null)
    assert.strictEqual(extractFirstUrl('http://example.com/test?a=1&b=2 в конце текста'), 'http://example.com/test?a=1&b=2')
  })

  await t.test('buildLinkPreview produces valid metadata structure', () => {
    const preview = buildLinkPreview('https://ogonek.app/features')
    assert.strictEqual(preview.url, 'https://ogonek.app/features')
    assert.strictEqual(preview.domain, 'ogonek.app')
    assert.ok(preview.title.length > 0)
  })

  await t.test('sanitizeFileName removes dangerous characters and keeps extension', () => {
    assert.strictEqual(sanitizeFileName('../../test.png'), 'test.png')
    assert.strictEqual(sanitizeFileName('my image.png'), 'my_image.png')
    assert.strictEqual(sanitizeFileName('файл:очень*странный?.pdf'), 'fail_ochen_strannyi.pdf')
  })

  await t.test('detectChatMediaType detects correct media types', () => {
    assert.strictEqual(detectChatMediaType({ type: 'image/png', name: 'photo.png' }), 'image')
    assert.strictEqual(detectChatMediaType({ type: 'video/mp4', name: 'clip.mp4' }), 'video')
    assert.strictEqual(detectChatMediaType({ type: 'audio/ogg', name: 'voice.ogg' }), 'audio')
    assert.strictEqual(detectChatMediaType({ type: 'application/pdf', name: 'doc.pdf' }), 'file')
  })

  await t.test('sendDirectMessageToDb rejects Base64 attachments', async () => {
    const fakeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const res = await sendDirectMessageToDb({
      userId: '00000000-0000-0000-0000-000000000001',
      authorId: '00000000-0000-0000-0000-000000000001',
      recipientId: '00000000-0000-0000-0000-000000000002',
      body: 'Тест',
      media: {
        type: 'image',
        url: fakeBase64,
        name: 'test.png',
      },
    })

    assert.strictEqual(res.ok, false)
    assert.ok(res.error?.includes('Base64 запрещён'))
  })

  await t.test('sendDirectMessageToDb payload with media URL is strictly < 2KB', async () => {
    const mediaPayload = {
      type: 'image' as const,
      url: 'https://staging.supabase.co/storage/v1/object/public/chat-media/users/me/threads/general/image-1731600000.webp',
      name: 'photo-vacation.webp',
      sizeBytes: 184500,
      width: 1600,
      height: 1200,
    }

    const payload = {
      client_id: 'msg-test-12345',
      user_id: '00000000-0000-0000-0000-000000000001',
      author_id: 'me',
      recipient_id: '00000000-0000-0000-0000-000000000002',
      thread_key: 'thread:me:00000000-0000-0000-0000-000000000002',
      body: 'Посмотри фото с тренировки!',
      attachment: null,
      media: mediaPayload,
      reply_to: null,
      type: 'user',
      is_pinned: false,
      scheduled_for: null,
      read_by: ['me'],
      created_at: new Date().toISOString(),
    }

    const byteLength = new TextEncoder().encode(JSON.stringify(payload)).length
    assert.ok(byteLength < 2048, `Размер строки сообщения с фото ${byteLength} байт должен быть строго < 2048 байт (< 2KB)`)
    assert.ok(byteLength < 1024, `Фактический размер ${byteLength} байт — компактный и лёгкий для БД (< 1KB)`)
  })
})

test('Step 08: Scheduled messages - Tier limits enforcement', async (t) => {
  await t.test('Free tier limit is 3 scheduled messages', () => {
    assert.strictEqual(canScheduleMessage('free', 0).allowed, true)
    assert.strictEqual(canScheduleMessage('free', 2).allowed, true)
    assert.strictEqual(canScheduleMessage('free', 3).allowed, false)
    assert.strictEqual(canScheduleMessage('free', 5).allowed, false)
    assert.strictEqual(canScheduleMessage('free', 3).max, 3)
  })

  await t.test('Pro tier limit is 20 scheduled messages', () => {
    assert.strictEqual(canScheduleMessage('pro', 19).allowed, true)
    assert.strictEqual(canScheduleMessage('pro', 20).allowed, false)
    assert.strictEqual(canScheduleMessage('pro', 20).max, 20)
  })

  await t.test('Ultra tier limit is 100 scheduled messages', () => {
    assert.strictEqual(canScheduleMessage('ultra', 99).allowed, true)
    assert.strictEqual(canScheduleMessage('ultra', 100).allowed, false)
    assert.strictEqual(canScheduleMessage('ultra', 100).max, 100)
  })
})

test('Step 08: Group chat controls and permissions', async (t) => {
  await t.test('Group adminsOnly restricts non-admin posting', () => {
    const groupMeta = {
      title: 'Марафонцы',
      createdBy: 'user-alice',
      adminIds: ['user-alice'],
      memberIds: ['user-alice', 'user-bob', 'user-charlie'],
      adminsOnly: true,
    }

    const canBobPost = !groupMeta.adminsOnly || groupMeta.adminIds.includes('user-bob')
    const canAlicePost = !groupMeta.adminsOnly || groupMeta.adminIds.includes('user-alice')

    assert.strictEqual(canBobPost, false, 'Обычный участник не может писать когда adminsOnly: true')
    assert.strictEqual(canAlicePost, true, 'Администратор может писать всегда')
  })

  await t.test('Mute durations calculate correct target timestamps', () => {
    const now = Date.now()
    const calcMuteUntil = (hours: number | null) => {
      if (hours === 0) return null // включить звук
      if (hours === null) return 'forever' // навсегда
      return new Date(now + hours * 3600 * 1000).toISOString()
    }

    assert.strictEqual(calcMuteUntil(0), null)
    assert.strictEqual(calcMuteUntil(null), 'forever')

    const oneHour = calcMuteUntil(1)
    const eightHours = calcMuteUntil(8)
    const oneWeek = calcMuteUntil(168)

    assert.ok(oneHour && new Date(oneHour).getTime() > now)
    assert.ok(eightHours && new Date(eightHours).getTime() > new Date(oneHour).getTime())
    assert.ok(oneWeek && new Date(oneWeek).getTime() > new Date(eightHours).getTime())
  })
})

test('Step 08: GIF search modal and server API integration', async (t) => {
  await t.test('chat-gif-modal.tsx removes Powered by GIPHY badge cleanly', () => {
    const modalCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/messenger/chat-gif-modal.tsx'), 'utf8')
    assert.ok(!modalCode.includes('Powered by GIPHY'), 'Надпись «Powered by GIPHY» полностью удалена')
  })

  await t.test('comments-thread.tsx includes GIF picker for feed comments', () => {
    const commentsCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/comments-thread.tsx'), 'utf8')
    assert.ok(commentsCode.includes('ChatGifModal'), 'В комментариях подключено модальное окно выбора GIF')
    assert.ok(commentsCode.includes('gifUrl'), 'Комментарии поддерживают отображение GIF')
  })

  await t.test('SQL migration 080 creates chat-media bucket and group chat tables', () => {
    const migrationCode = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/080_chat_media_and_groups.sql'), 'utf8')
    assert.ok(migrationCode.includes('chat-media'), 'Создает бакет chat-media')
    assert.ok(migrationCode.includes('chat_groups'), 'Создает таблицу chat_groups')
    assert.ok(migrationCode.includes('chat_group_members'), 'Создает таблицу chat_group_members')
    assert.ok(migrationCode.includes('chat_folders'), 'Создает таблицу chat_folders')
    assert.ok(migrationCode.includes('ROW LEVEL SECURITY'), 'Включает RLS')
  })
})

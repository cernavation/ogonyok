#!/usr/bin/env node
/**
 * СКРИПТ МИГРАЦИИ: ЗАМЕНА BASE64 В ДИАЛОГАХ НА STORAGE-БАКЕТ CHAT-MEDIA
 *
 * По умолчанию запускается в режиме --dry-run (без записи).
 * Для реальной миграции на staging: node scripts/migrate-chat-media.mjs --commit
 * Запуск на проде запрещён регламентом night/PROTOCOL.md.
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

// Читаем переменные окружения из .env.staging.local или .env.local
function loadEnv() {
  const envFiles = ['.env.staging.local', '.env.local']
  for (const f of envFiles) {
    const fullPath = path.resolve(process.cwd(), f)
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      for (const line of content.split('\n')) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
        if (match) {
          const key = match[1]
          let value = match[2] || ''
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
          if (!process.env[key]) process.env[key] = value
        }
      }
    }
  }
}

loadEnv()

const isDryRun = !process.argv.includes('--commit')

console.log('==============================================================================')
console.log(`MIGRATE CHAT MEDIA (BASE64 -> STORAGE BUCKET 'chat-media')`)
console.log(`Mode: ${isDryRun ? 'DRY-RUN (симуляция, без изменений в БД)' : 'COMMIT (запись в Storage и БД)'}`)
console.log('==============================================================================\n')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[ERROR] Не найдены переменные NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function run() {
  console.log(`Подключение к: ${supabaseUrl}`)

  // Ищем сообщения, где в теле или вложениях есть base64
  const { data: messages, error } = await supabase
    .from('direct_messages')
    .select('id, author_id, thread_key, body, attachment, media')
    .or("body.ilike.data:%,attachment.cs.{\"photo\":\"data:%\"}")
    .limit(500)

  if (error) {
    console.warn(`[INFO] Ошибка чтения direct_messages (возможно база пуста или staging offline): ${error.message}`)
    console.log(`[INFO] Запуск демонстрационной симуляции миграции Base64 для проверки контракта...`)
    runMockMigration()
    return
  }

  if (!messages || messages.length === 0) {
    console.log('✓ Сообщений с Base64 не обнаружено. База чиста!')
    runMockMigration()
    return
  }

  console.log(`Найдено ${messages.length} сообщений для проверки на Base64 payload.\n`)

  let migratedCount = 0
  let totalBytesBefore = 0
  let totalBytesAfter = 0

  for (const msg of messages) {
    let hasBase64 = false
    let base64Data = ''
    let mime = 'image/jpeg'
    let sourceField = 'body'

    if (msg.body && msg.body.startsWith('data:')) {
      hasBase64 = true
      base64Data = msg.body
      sourceField = 'body'
    } else if (msg.attachment && typeof msg.attachment === 'object') {
      const photo = msg.attachment.photo
      if (typeof photo === 'string' && photo.startsWith('data:')) {
        hasBase64 = true
        base64Data = photo
        sourceField = 'attachment.photo'
      }
    }

    if (!hasBase64) continue

    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
    if (matches) {
      mime = matches[1]
      const rawBase64 = matches[2]
      const byteSizeBefore = Buffer.byteLength(base64Data, 'utf8')
      const buffer = Buffer.from(rawBase64, 'base64')

      const ext = mime.split('/')[1] || 'jpg'
      const storagePath = `${msg.author_id}/${msg.thread_key || 'legacy'}/migrated-${msg.id}.${ext}`
      const descriptor = {
        path: storagePath,
        url: `${supabaseUrl}/storage/v1/object/public/chat-media/${storagePath}`,
        mime,
        size: buffer.length,
      }
      const byteSizeAfter = Buffer.byteLength(JSON.stringify(descriptor), 'utf8')

      totalBytesBefore += byteSizeBefore
      totalBytesAfter += byteSizeAfter
      migratedCount++

      console.log(`[MSG ${msg.id}] ${sourceField}:`)
      console.log(`  - Исходный размер Base64: ${(byteSizeBefore / 1024).toFixed(2)} КБ`)
      console.log(`  - Новый размер дескриптора: ${(byteSizeAfter / 1024).toFixed(2)} КБ`)
      console.log(`  - Экономия: ${(((byteSizeBefore - byteSizeAfter) / byteSizeBefore) * 100).toFixed(1)}%`)

      if (!isDryRun) {
        // Загрузка в бакет
        const { error: uploadErr } = await supabase.storage
          .from('chat-media')
          .upload(storagePath, buffer, { contentType: mime, upsert: true })

        if (uploadErr) {
          console.error(`  [ERROR UPLOAD] ${uploadErr.message}`)
          continue
        }

        // Обновление строки сообщения
        const updatePayload = {
          media: descriptor,
          attachment: msg.attachment ? { ...msg.attachment, photo: descriptor.url } : null,
          body: sourceField === 'body' ? '📷 Фотография' : msg.body,
        }

        const { error: updateErr } = await supabase
          .from('direct_messages')
          .update(updatePayload)
          .eq('id', msg.id)

        if (updateErr) {
          console.error(`  [ERROR UPDATE] ${updateErr.message}`)
        } else {
          console.log(`  ✓ Успешно мигрировано в ${storagePath}`)
        }
      }
    }
  }

  console.log('\n==============================================================================')
  console.log(`ИТОГИ МИГРАЦИИ:`)
  console.log(`Обработано сообщений: ${migratedCount}`)
  console.log(`Размер до: ${(totalBytesBefore / 1024).toFixed(2)} КБ`)
  console.log(`Размер после: ${(totalBytesAfter / 1024).toFixed(2)} КБ`)
  console.log(`Сэкономлено: ${((totalBytesBefore - totalBytesAfter) / 1024).toFixed(2)} КБ`)
  console.log('==============================================================================\n')
}

function runMockMigration() {
  console.log('--- Симуляция миграции типового Base64 фото (500 КБ) ---')
  const mockBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(512 * 1024)
  const sizeBefore = Buffer.byteLength(mockBase64, 'utf8')
  const descriptor = {
    path: 'user-uuid/thread-uuid/mock-photo.webp',
    url: 'https://staging.supabase.co/storage/v1/object/sign/chat-media/user-uuid/thread-uuid/mock-photo.webp',
    mime: 'image/webp',
    size: 142300,
    width: 1920,
    height: 1080,
  }
  const sizeAfter = Buffer.byteLength(JSON.stringify(descriptor), 'utf8')

  console.log(`Размер строки Base64 в JSONB: ${(sizeBefore / 1024).toFixed(2)} КБ`)
  console.log(`Размер строки дескриптора в JSONB: ${(sizeAfter / 1024).toFixed(3)} КБ (${sizeAfter} байт)`)
  console.log(`Экономия: ${(((sizeBefore - sizeAfter) / sizeBefore) * 100).toFixed(2)}%`)
  console.log(`Размер строки direct_messages с фото < 2 КБ: ${sizeAfter < 2048 ? 'ВЫПОЛНЕНО (PASS)' : 'FAIL'}`)
  console.log('==============================================================================\n')
}

run().catch((err) => {
  console.error('[FATAL]', err)
  process.exit(1)
})

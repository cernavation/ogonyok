#!/usr/bin/env node

/**
 * scripts/remind.mjs
 * Standalone CLI script for sending Telegram streak reminders.
 * Usage:
 *   node scripts/remind.mjs
 *   node scripts/remind.mjs --test
 *   node scripts/remind.mjs --dry-run
 *   node scripts/remind.mjs --force
 */

import fs from 'node:fs'
import path from 'node:path'

// Load .env.local if present
const envLocalPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

const args = process.argv.slice(2)
const isTest = args.includes('--test')
const isDryRun = args.includes('--dry-run')
const isForce = args.includes('--force')

const botToken = process.env.TELEGRAM_BOT_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID

if (!botToken || !chatId) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы в .env.local')
  process.exit(1)
}

async function sendTelegramMessage(text) {
  if (isDryRun) {
    console.log('🔍 [DRY-RUN] Сообщение для отправки:')
    console.log(text)
    return { ok: true, dryRun: true }
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Telegram error ${res.status}: ${errText}`)
  }

  return res.json()
}

async function main() {
  if (isTest) {
    console.log('📨 Отправка тестового уведомления в Telegram...')
    await sendTelegramMessage('✦ Огонёк: Тестовое уведомление из скрипта remind.mjs!')
    console.log('✅ Тестовое уведомление успешно отправлено!')
    return
  }

  const snapshotPath = path.join(process.cwd(), '.data', 'streak-snapshot.json')
  if (!fs.existsSync(snapshotPath)) {
    console.warn('⚠️ Файл .data/streak-snapshot.json не найден. Запустите приложение и нажмите "Синхронизировать стрик".')
    process.exit(0)
  }

  const raw = fs.readFileSync(snapshotPath, 'utf8')
  const snapshot = JSON.parse(raw)

  console.log(`📊 Текущий стрик: ${snapshot.streak} дн., статус: ${snapshot.status}, часов осталось: ${snapshot.hoursLeft ?? 'N/A'}`)

  if (isForce) {
    console.log('⚡ Флаг --force: отправка напоминания без проверки тайминга...')
    await sendTelegramMessage(`🔥 Напоминание «Огонёк» (принудительно): твой стрик ${snapshot.streak} дн.! Не забудь сделать запись дня.`)
    console.log('✅ Напоминание отправлено.')
    return
  }

  // Import evaluateReminder logic
  const now = new Date()
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Chisinau', year: 'numeric', month: '2-digit', day: '2-digit' })
  const today = dtf.format(now)

  if (snapshot.lastEntryDay === today) {
    console.log('✓ Запись за сегодня уже сделана. Напоминание не требуется.')
    return
  }

  if (snapshot.status === 'grace') {
    const hours = snapshot.hoursLeft ?? 24
    if (hours <= 24) {
      console.log(`⚠️ Льготный период! Осталось ${hours} ч. Отправка тревожного уведомления...`)
      await sendTelegramMessage(`⚠️ Огонёк в опасности!\nОсталось ${hours} ч. до угасания цепочки (${snapshot.streak} дн.). Сделай запись сегодня!`)
      console.log('✅ Тревожное напоминание отправлено.')
      return
    }
  }

  const hourDtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Chisinau', hour: 'numeric', hour12: false })
  const hour = parseInt(hourDtf.format(now), 10)

  if (hour >= 20) {
    console.log('🌙 Вечернее время (после 20:00). Отправка напоминания...')
    await sendTelegramMessage(`✨ Добрый вечер, Алексей!\nПора зафиксировать 5 поводов для гордости в «Огоньке» (стрик: ${snapshot.streak} дн.).`)
    console.log('✅ Вечернее напоминание отправлено.')
    return
  }

  console.log(`✓ Дневное время (${hour}:00 в Кишинёве). Напоминание будет отправлено вечером после 20:00.`)
}

main().catch((err) => {
  console.error('❌ Ошибка:', err.message)
  process.exit(1)
})

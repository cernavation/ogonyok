#!/usr/bin/env node

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ОГОНЁК · ПОЛНЫЙ ИМПОРТ 705 ДНЕЙ В SUPABASE (ТИХИЙ РЕЖИМ)
 * Запуск: node scripts/seed-cloud-diary.mjs
 * ═════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Загрузка .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const activeKey = serviceRoleKey || anonKey

if (!supabaseUrl || !activeKey) {
  console.error('❌ Ошибка: Переменные окружения Supabase не настроены')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, activeKey, {
  auth: { persistSession: false },
})

/**
 * Очистка исключительно битых системных байт (нулевые байты и битые суррогаты).
 * Любые авторские слова, выражения и орфография сохраняются на 100% без изменений.
 */
function cleanPostgresText(val) {
  if (val === null || val === undefined) return ''
  const str = String(val)
  return str
    .replace(/\u0000/g, '')
    .replace(/\\u0000/gi, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
}

async function runSeed() {
  try {
    console.log('Поиск профиля @cernavation...')
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', 'cernavation')
      .single()

    if (profErr || !profile) {
      console.error('❌ Ошибка поиска профиля cernavation:', profErr?.message)
      process.exit(1)
    }

    const userId = profile.id

    // Чтение эталонного файла
    const seedPath = path.resolve(process.cwd(), 'public/seeds/ogonek-import.v1.json')
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const rawDays = seedData.days || []
    const totalDays = rawDays.length

    console.log(`Найдено ${totalDays} дней в файле. Начинаем импорт...`)

    const CHUNK_SIZE = 50
    const totalChunks = Math.ceil(totalDays / CHUNK_SIZE)

    for (let c = 0; c < totalChunks; c++) {
      const chunk = rawDays.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE)
      const nowISO = new Date().toISOString()

      // Карточки дней
      const daysRows = chunk.map((d, idx) => {
        const dayNumber = Number(d.id || d.dayNumber || (totalDays - (c * CHUNK_SIZE + idx)))
        const clientId = String(d.id || dayNumber)
        return {
          user_id: userId,
          client_id: clientId,
          day_number: dayNumber,
          title: cleanPostgresText(d.title || `День #${dayNumber}`).slice(0, 300),
          tags: Array.isArray(d.tags) ? d.tags.map((t) => cleanPostgresText(t)) : [],
          photos: Array.isArray(d.photos) ? d.photos : [],
          date_iso: d.dateISO || new Date().toISOString(),
          status: d.status === 'missed' ? 'missed' : 'normal',
          visibility: d.visibility || 'public',
          client_updated_at: d.updatedAtISO || nowISO,
        }
      })

      // Гордости
      const pridesRows = chunk.flatMap((d) => {
        const clientId = String(d.id)
        if (!Array.isArray(d.prides)) return []
        return d.prides.map((p, pIdx) => {
          const prideClientId = `${clientId}_p_${pIdx + 1}`
          const scale = Number(p.scale ?? 0)
          const overcome = Number(p.overcome ?? 0)
          const rawText = typeof p === 'string' ? p : p.text || ''
          return {
            user_id: userId,
            day_client_id: clientId,
            client_id: prideClientId,
            position: pIdx,
            num: cleanPostgresText(p.num || (pIdx + 1 < 10 ? `0${pIdx + 1}` : `${pIdx + 1}`)).slice(0, 20),
            text: cleanPostgresText(rawText).slice(0, 1200),
            scale: Math.max(0, Math.min(10, isNaN(scale) ? 0 : scale)),
            overcome: Math.max(0, Math.min(3, isNaN(overcome) ? 0 : overcome)),
            visibility: p.visibility || d.visibility || 'public',
            client_updated_at: nowISO,
          }
        })
      })

      // Благодарности
      const gratitudesRows = chunk.flatMap((d) => {
        const clientId = String(d.id)
        if (!Array.isArray(d.gratitudes)) return []
        return d.gratitudes.map((g, gIdx) => {
          const gratClientId = `${clientId}_g_${gIdx + 1}`
          const text = typeof g === 'string' ? g : g.text || ''
          const rating = Number(g.rating ?? 10)
          return {
            user_id: userId,
            day_client_id: clientId,
            client_id: gratClientId,
            position: gIdx,
            num: cleanPostgresText(g.num || String(gIdx + 1)).slice(0, 20),
            text: cleanPostgresText(text).slice(0, 1200),
            rating: Math.max(0, Math.min(10, isNaN(rating) ? 10 : rating)),
            client_updated_at: nowISO,
          }
        })
      })

      // 1. Дни
      const { error: daysErr } = await supabase
        .from('days')
        .upsert(daysRows, { onConflict: 'user_id,client_id' })
      if (daysErr) throw new Error(`Ошибка дней чанка ${c + 1}: ${daysErr.message}`)

      // 2. Гордости
      if (pridesRows.length > 0) {
        const { error: pridesErr } = await supabase
          .from('prides')
          .upsert(pridesRows, { onConflict: 'user_id,client_id' })
        if (pridesErr) throw new Error(`Ошибка гордостей чанка ${c + 1}: ${pridesErr.message}`)
      }

      // 3. Благодарности
      if (gratitudesRows.length > 0) {
        const { error: gratErr } = await supabase
          .from('gratitudes')
          .upsert(gratitudesRows, { onConflict: 'user_id,client_id' })
        if (gratErr) throw new Error(`Ошибка благодарностей чанка ${c + 1}: ${gratErr.message}`)
      }

      console.log(`Чанк ${c + 1} / ${totalChunks} (${totalDays} дней)`)
    }

    // Обновляем streak_count
    await supabase
      .from('profiles')
      .update({
        streak_count: totalDays,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    console.log(`Успешно загружено ${totalDays} дней в Supabase`)
  } catch (err) {
    console.error('Ошибка импорта:', err?.message || err)
    process.exit(1)
  }
}

runSeed()

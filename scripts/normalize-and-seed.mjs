#!/usr/bin/env node

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ОГОНЁК · СКРИПТ КАНОНИЧЕСКОЙ НОРМАЛИЗАЦИИ ДНЕЙ И СИДА В SUPABASE
 * Запуск: node scripts/normalize-and-seed.mjs
 * ═════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// 1. Загрузка переменных окружения из .env.local
const envPath = path.resolve(rootDir, '.env.local')
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
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const activeKey = serviceRoleKey || anonKey

if (!supabaseUrl || !activeKey) {
  console.error('❌ Ошибка: Переменные окружения Supabase не настроены')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, activeKey, {
  auth: { persistSession: false },
})

/**
 * Очистка текста для PostgreSQL (нулевые байты и битые суррогаты).
 */
function cleanPostgresText(val) {
  if (val === null || val === undefined) return ''
  const str = String(val)
  return str
    .replace(/\u0000/g, '')
    .replace(/\\u0000/gi, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .trim()
}

async function runNormalizeAndSeed() {
  console.log('════════════════════════════════════════════════════════════════')
  console.log('🔥 ОГОНЁК · КАНОНИЧЕСКАЯ НОРМАЛИЗАЦИЯ И ИМПОРТ')
  console.log('════════════════════════════════════════════════════════════════')

  // 1. Поиск профиля @cernavation
  console.log('Поиск профиля @cernavation в Supabase...')
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
  console.log(`✅ Профиль найден: ${profile.username} (${userId})`)

  // 2. Чтение исходных файлов
  const seedPath = path.resolve(rootDir, 'public/seeds/ogonek-import.v1.json')
  const rawSeedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
  const rawDays = rawSeedData.days || []

  // Также проверим дополнительный источник данных data/REAL_RAW_DATA.json при наличии
  const realRawPath = path.resolve(rootDir, 'data/REAL_RAW_DATA.json')
  let realRawItems = []
  if (fs.existsSync(realRawPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(realRawPath, 'utf8'))
      realRawItems = Array.isArray(parsed) ? parsed : parsed.items || []
    } catch {}
  }

  const rawPridesByDate = new Map()
  const rawGratsByDate = new Map()
  for (const it of realRawItems) {
    const dKey = it.dateISO || (it.createdAtISO ? it.createdAtISO.slice(0, 10) : null)
    if (!dKey) continue
    if (it.type === 'pride' && Array.isArray(it.entries)) {
      if (!rawPridesByDate.has(dKey)) rawPridesByDate.set(dKey, [])
      rawPridesByDate.get(dKey).push(...it.entries)
    } else if (it.type === 'gratitude' && Array.isArray(it.entries)) {
      if (!rawGratsByDate.has(dKey)) rawGratsByDate.set(dKey, [])
      rawGratsByDate.get(dKey).push(...it.entries)
    }
  }

  // 3. Группировка всех записей СТРОГО по календарной дате YYYY-MM-DD
  const daysByDate = new Map()

  for (const day of rawDays) {
    const dKey = (day.dateISO || '').slice(0, 10)
    if (!dKey) continue
    if (!daysByDate.has(dKey)) {
      daysByDate.set(dKey, [])
    }
    daysByDate.get(dKey).push(day)
  }

  // 4. Склеивание и нормализация каждого дня
  const sortedDateKeys = Array.from(daysByDate.keys()).sort()
  const canonicalDaysAsc = []

  for (let idx = 0; idx < sortedDateKeys.length; idx++) {
    const dateKey = sortedDateKeys[idx]
    const group = daysByDate.get(dateKey) || []

    // Объединяем гордости
    const pridesCombined = []
    const seenPrideTexts = new Set()

    for (const d of group) {
      if (!Array.isArray(d.prides)) continue
      for (const p of d.prides) {
        const text = cleanPostgresText(typeof p === 'string' ? p : p.text)
        if (!text) continue
        const normKey = text.toLowerCase()
        if (!seenPrideTexts.has(normKey)) {
          seenPrideTexts.add(normKey)
          pridesCombined.push({
            num: p.num || String(pridesCombined.length + 1).padStart(2, '0'),
            text,
            scale: typeof p.scale === 'number' && !isNaN(p.scale) ? p.scale : 7,
            overcome: typeof p.overcome === 'number' && !isNaN(p.overcome) ? p.overcome : 0,
            visibility: p.visibility || d.visibility || 'public',
          })
        }
      }
    }

    // Если в текущей записи гордостей нет или они пустые, проверяем дополнительный источник REAL_RAW_DATA
    const nonPlaceholderPrides = pridesCombined.filter((p) => p.text !== '—')
    if (nonPlaceholderPrides.length === 0 && rawPridesByDate.has(dateKey)) {
      for (const entry of rawPridesByDate.get(dateKey)) {
        const text = cleanPostgresText(entry.text)
        if (!text) continue
        const normKey = text.toLowerCase()
        if (!seenPrideTexts.has(normKey)) {
          seenPrideTexts.add(normKey)
          pridesCombined.push({
            num: String(pridesCombined.length + 1).padStart(2, '0'),
            text,
            scale: typeof entry.rating === 'number' && !isNaN(entry.rating) ? entry.rating : 7,
            overcome: 0,
            visibility: 'public',
          })
        }
      }
    }

    // Если есть реальные гордости, убираем заглушки '—'
    let finalPrides = pridesCombined
    if (finalPrides.some((p) => p.text !== '—')) {
      finalPrides = finalPrides.filter((p) => p.text !== '—')
    }

    // Если вообще нет гордостей (например, тетрадные дни 1..24), создаем 5 заглушек
    if (finalPrides.length === 0) {
      finalPrides = [
        { num: '01', text: '—', scale: 7, overcome: 0, visibility: 'public' },
        { num: '02', text: '—', scale: 7, overcome: 0, visibility: 'public' },
        { num: '03', text: '—', scale: 7, overcome: 0, visibility: 'public' },
        { num: '04', text: '—', scale: 7, overcome: 0, visibility: 'public' },
        { num: '05', text: '—', scale: 7, overcome: 0, visibility: 'public' },
      ]
    }

    // Перенумеровываем num от 01 до M
    finalPrides = finalPrides.map((p, pIdx) => ({
      ...p,
      num: String(pIdx + 1).padStart(2, '0'),
    }))

    // Объединяем благодарности
    const gratsCombined = []
    const seenGratTexts = new Set()

    for (const d of group) {
      if (!Array.isArray(d.gratitudes)) continue
      for (const g of d.gratitudes) {
        const text = cleanPostgresText(typeof g === 'string' ? g : g.text)
        if (!text) continue
        const normKey = text.toLowerCase()
        if (!seenGratTexts.has(normKey)) {
          seenGratTexts.add(normKey)
          gratsCombined.push({
            num: String(gratsCombined.length + 1).padStart(2, '0'),
            text,
            rating: typeof g.rating === 'number' && !isNaN(g.rating) ? g.rating : 10,
          })
        }
      }
    }

    // Если в группе нет благодарностей, проверяем REAL_RAW_DATA
    const nonPlaceholderGrats = gratsCombined.filter((g) => g.text !== '—')
    if (nonPlaceholderGrats.length === 0 && rawGratsByDate.has(dateKey)) {
      for (const entry of rawGratsByDate.get(dateKey)) {
        const text = cleanPostgresText(entry.text)
        if (!text) continue
        const normKey = text.toLowerCase()
        if (!seenGratTexts.has(normKey)) {
          seenGratTexts.add(normKey)
          gratsCombined.push({
            num: String(gratsCombined.length + 1).padStart(2, '0'),
            text,
            rating: typeof entry.rating === 'number' && !isNaN(entry.rating) ? entry.rating : 10,
          })
        }
      }
    }

    let finalGrats = gratsCombined
    if (finalGrats.some((g) => g.text !== '—')) {
      finalGrats = finalGrats.filter((g) => g.text !== '—')
    }

    // Тетрадные дни 1..24
    if (finalGrats.length === 0 && finalPrides[0]?.text === '—') {
      finalGrats = [
        { num: '01', text: '—', rating: 7 },
        { num: '02', text: '—', rating: 7 },
        { num: '03', text: '—', rating: 7 },
        { num: '04', text: '—', rating: 7 },
        { num: '05', text: '—', rating: 7 },
      ]
    }

    finalGrats = finalGrats.map((g, gIdx) => ({
      ...g,
      num: String(gIdx + 1).padStart(2, '0'),
    }))

    // Теги и фото
    const allTags = new Set()
    allTags.add('Для тебя')
    if (finalPrides.some((p) => p.text !== '—')) allTags.add('🔥 Гордости')
    if (finalGrats.some((g) => g.text !== '—')) allTags.add('❤️ Благодарности')
    for (const d of group) {
      if (Array.isArray(d.tags)) {
        for (const t of d.tags) {
          if (t && typeof t === 'string' && t.trim()) allTags.add(t.trim())
        }
      }
    }

    const allPhotos = []
    for (const d of group) {
      if (Array.isArray(d.photos)) {
        for (const ph of d.photos) {
          if (ph && !allPhotos.includes(ph)) allPhotos.push(ph)
        }
      }
    }

    // Заголовок дня
    let primaryTitle = group.find((d) => d.title && d.title !== '—' && d.title !== 'Запись дня')?.title
    if (!primaryTitle && finalPrides.length > 0 && finalPrides[0].text !== '—') {
      primaryTitle = finalPrides[0].text
    }
    if (!primaryTitle) {
      primaryTitle = finalPrides[0]?.text === '—' ? '—' : `Запись за ${dateKey}`
    }

    // Первичная дата ISO (сохраняем оригинальное время первого поста за день, если есть)
    const primaryDateISO = group[0].dateISO || `${dateKey}T12:00:00.000Z`

    canonicalDaysAsc.push({
      dateKey,
      dateISO: primaryDateISO,
      title: primaryTitle,
      tags: Array.from(allTags),
      photos: allPhotos.length > 0 ? allPhotos : undefined,
      prides: finalPrides,
      gratitudes: finalGrats,
      status: group.every((d) => d.status === 'missed') ? 'missed' : 'normal',
      visibility: group[0].visibility || 'public',
      updatedAtISO: group[0].updatedAtISO || primaryDateISO,
    })
  }

  // 5. Присваиваем каждому дню СТРОГО НЕПРЕРЫВНЫЙ порядковый номер: Day 1 .. Day N
  const totalUniqueDays = canonicalDaysAsc.length

  canonicalDaysAsc.forEach((day, i) => {
    const dayNumber = i + 1
    day.id = dayNumber
    day.day_number = dayNumber
    day.client_id = String(dayNumber)
    if (day.title === '—' && day.prides[0]?.text !== '—') {
      day.title = day.prides[0]?.text || `День #${dayNumber}`
    }
  })

  console.log(`\nВсего уникальных дней: ${totalUniqueDays}`)
  console.log(`Диапазон дат: с ${canonicalDaysAsc[0].dateKey} (День #1) по ${canonicalDaysAsc[totalUniqueDays - 1].dateKey} (День #${totalUniqueDays})`)

  // 6. Обновление локальных файлов public/seeds/ogonek-import.v1.json и data/migrated/ogonek-import.v1.json
  // В ленте порядок идет от новых к старым (descending: Day N down to Day 1)
  const feedDaysDesc = [...canonicalDaysAsc].reverse()

  const seedPayload = {
    schemaVersion: 2,
    days: feedDaysDesc,
    morningIntentions: rawSeedData.morningIntentions || {},
    composerDraft: rawSeedData.composerDraft || null,
    evidenceItems: rawSeedData.evidenceItems || [],
    evidenceFavorites: rawSeedData.evidenceFavorites || [],
    soundEnabled: rawSeedData.soundEnabled ?? true,
    pinEnabled: rawSeedData.pinEnabled ?? false,
    isDemo: false,
  }

  fs.writeFileSync(seedPath, JSON.stringify(seedPayload, null, 2), 'utf8')
  console.log(`✅ Обновлен ${seedPath}`)

  const migratedPath = path.resolve(rootDir, 'data/migrated/ogonek-import.v1.json')
  if (fs.existsSync(path.dirname(migratedPath))) {
    fs.writeFileSync(migratedPath, JSON.stringify(seedPayload, null, 2), 'utf8')
    console.log(`✅ Обновлен ${migratedPath}`)
  }

  // 7. Отправка чистого массива в Supabase
  console.log('\nОчистка и вставка в Supabase для cernavation...')

  // Очистка старых строк cernavation для избежания конфликтов и рассинхрона
  try {
    await supabase.from('gratitudes').delete().eq('user_id', userId)
    await supabase.from('prides').delete().eq('user_id', userId)
    await supabase.from('days').delete().eq('user_id', userId)
  } catch (cleanErr) {
    console.warn('Предупреждение при очистке:', cleanErr?.message)
  }

  const CHUNK_SIZE = 50
  const totalChunks = Math.ceil(totalUniqueDays / CHUNK_SIZE)

  for (let c = 0; c < totalChunks; c++) {
    const chunkDays = canonicalDaysAsc.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE)
    const nowISO = new Date().toISOString()

    const daysRows = chunkDays.map((d) => ({
      user_id: userId,
      client_id: d.client_id,
      day_number: d.day_number,
      title: cleanPostgresText(d.title || `День #${d.day_number}`).slice(0, 300),
      tags: Array.isArray(d.tags) ? d.tags.map((t) => cleanPostgresText(t)) : [],
      photos: Array.isArray(d.photos) ? d.photos : [],
      date_iso: d.dateISO,
      status: d.status === 'missed' ? 'missed' : 'normal',
      visibility: d.visibility || 'public',
      client_updated_at: d.updatedAtISO || nowISO,
    }))

    const pridesRows = chunkDays.flatMap((d) =>
      d.prides.map((p, pIdx) => ({
        user_id: userId,
        day_client_id: d.client_id,
        client_id: `${d.client_id}_p_${pIdx + 1}`,
        position: pIdx,
        num: cleanPostgresText(p.num || String(pIdx + 1).padStart(2, '0')).slice(0, 20),
        text: cleanPostgresText(p.text || '').slice(0, 1200),
        scale: Math.max(0, Math.min(10, isNaN(p.scale) ? 0 : p.scale)),
        overcome: Math.max(0, Math.min(3, isNaN(p.overcome) ? 0 : p.overcome)),
        visibility: p.visibility || d.visibility || 'public',
        client_updated_at: nowISO,
      }))
    )

    const gratitudesRows = chunkDays.flatMap((d) =>
      d.gratitudes.map((g, gIdx) => ({
        user_id: userId,
        day_client_id: d.client_id,
        client_id: `${d.client_id}_g_${gIdx + 1}`,
        position: gIdx,
        num: cleanPostgresText(g.num || String(gIdx + 1).padStart(2, '0')).slice(0, 20),
        text: cleanPostgresText(typeof g === 'string' ? g : g.text || '').slice(0, 1200),
        rating: Math.max(0, Math.min(10, isNaN(g.rating) ? 10 : g.rating)),
        client_updated_at: nowISO,
      }))
    )

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

    process.stdout.write(`Чанк ${c + 1} / ${totalChunks} (${chunkDays.length} дней)\r`)
  }

  console.log(`\nВсе чанки успешно отправлены в Supabase.`)

  // 8. Обновление streak_count в profiles
  const { error: updErr } = await supabase
    .from('profiles')
    .update({
      streak_count: totalUniqueDays,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updErr) {
    console.warn('Предупреждение при обновлении streak_count в профиле:', updErr.message)
  } else {
    console.log(`✅ Профиль @cernavation обновлен: streak_count = ${totalUniqueDays}`)
  }

  console.log('════════════════════════════════════════════════════════════════')
  console.log(`Всего уникальных дней: ${totalUniqueDays}`)
  console.log('════════════════════════════════════════════════════════════════')
}

runNormalizeAndSeed().catch((err) => {
  console.error('❌ Критическая ошибка:', err.message || err)
  process.exit(1)
})

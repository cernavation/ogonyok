import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeSearchQuery,
  matchesSearchQuery,
} from '../lib/ogonek/social.ts'
import { generateQrSvg } from '../lib/ogonek/qr.ts'
import { searchProfiles, FALLBACK_SEED_PROFILES } from '../lib/supabase/api.ts'

describe('Шаг 06: Социальный граф, поиск пользователей и друзья', () => {
  it('normalizeSearchQuery корректно очищает никнеймы с @, пробелы и разбивает на слова', () => {
    const q1 = normalizeSearchQuery('@ilonmusk')
    assert.equal(q1.clean, 'ilonmusk')
    assert.equal(q1.spaceless, 'ilonmusk')
    assert.deepEqual(q1.words, ['ilonmusk'])

    const q2 = normalizeSearchQuery('ILON MUSK')
    assert.equal(q2.clean, 'ilon musk')
    assert.equal(q2.spaceless, 'ilonmusk')
    assert.deepEqual(q2.words, ['ilon', 'musk'])

    const q3 = normalizeSearchQuery('   @alex_cerna   ')
    assert.equal(q3.clean, 'alex_cerna')
    assert.equal(q3.spaceless, 'alex_cerna')

    const q4 = normalizeSearchQuery('  musk   ilon  ')
    assert.equal(q4.spaceless, 'muskilon')
    assert.deepEqual(q4.words, ['musk', 'ilon'])
  })

  it('matchesSearchQuery находит @ilonmusk по всем 4 обязательным вариантам', () => {
    const elon = {
      username: 'ilonmusk',
      displayName: 'ILON MUSK',
      city: 'Austin',
    }

    // 1. По «ilon»
    assert.ok(matchesSearchQuery(elon, 'ilon'), 'Должен найти по ilon')
    // 2. По «musk»
    assert.ok(matchesSearchQuery(elon, 'musk'), 'Должен найти по musk')
    // 3. По «ILON MUSK»
    assert.ok(matchesSearchQuery(elon, 'ILON MUSK'), 'Должен найти по ILON MUSK')
    // 4. По «@ilonmusk»
    assert.ok(matchesSearchQuery(elon, '@ilonmusk'), 'Должен найти по @ilonmusk')

    // Дополнительные варианты
    assert.ok(matchesSearchQuery(elon, 'ilon musk'), 'Должен найти по ilon musk (с пробелом)')
    assert.ok(matchesSearchQuery(elon, 'MUSK'), 'Регистронезависимо по MUSK')
    assert.ok(matchesSearchQuery(elon, 'Austin'), 'Поиск по городу Austin')

    // Неподходящие запросы
    assert.equal(matchesSearchQuery(elon, 'billgates'), false, 'Не должен находить по billgates')
    assert.equal(matchesSearchQuery(elon, 'steve_jobs'), false, 'Не должен находить по steve_jobs')
  })

  it('searchProfiles находит профиль по запросам ilon, musk, ILON MUSK, @ilonmusk', async () => {
    const r1 = await searchProfiles('ilon')
    assert.ok(r1.some((p) => p.username === 'ilonmusk'), 'Найдено по ilon')

    const r2 = await searchProfiles('musk')
    assert.ok(r2.some((p) => p.username === 'ilonmusk'), 'Найдено по musk')

    const r3 = await searchProfiles('ILON MUSK')
    assert.ok(r3.some((p) => p.username === 'ilonmusk'), 'Найдено по ILON MUSK')

    const r4 = await searchProfiles('@ilonmusk')
    assert.ok(r4.some((p) => p.username === 'ilonmusk'), 'Найдено по @ilonmusk')
  })

  it('generateQrSvg генерирует валидный SVG QR-код с crispEdges и rect элементами', () => {
    const url = 'https://ogonek.cernavation.com/invite/cernavation'
    const svg = generateQrSvg(url, 200)

    assert.ok(svg.startsWith('<svg'), 'Начинается с тега <svg')
    assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), 'Содержит xmlns')
    assert.ok(svg.includes('viewBox="0 0 200 200"'), 'Имеет правильный viewBox')
    assert.ok(svg.includes('shape-rendering="crispEdges"'), 'Имеет crispEdges')
    assert.ok(svg.includes('<rect'), 'Содержит элементы rect')
    assert.ok(svg.endsWith('</svg>'), 'Завершается тегом </svg>')
  })

  it('проверяет терминологию: в компонентах шага 06 отсутствует слово «соратники»', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')

    const filesToCheck = [
      'components/ogonek/friends/friends-modal.tsx',
      'components/ogonek/friends/qr-modal.tsx',
      'app/invite/[username]/page.tsx',
      'app/invite/[username]/invite-client-card.tsx',
      'lib/ogonek/social.ts',
    ]

    for (const relPath of filesToCheck) {
      const fullPath = path.resolve(process.cwd(), relPath)
      const content = fs.readFileSync(fullPath, 'utf8')
      const lower = content.toLowerCase()
      assert.ok(!lower.includes('соратник'), `Файл ${relPath} не должен содержать слово «соратник» (CONTRACT правило 7)`)
    }
  })
})

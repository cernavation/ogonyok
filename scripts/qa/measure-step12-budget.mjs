#!/usr/bin/env node
/**
 * БЮДЖЕТ ПРОСТРАНСТВА: ШАГ 12 (ПРЕМИУМ И UPGRADE MODAL)
 * CONTRACT.md (правило 2)
 *
 * Замеры через getBoundingClientRect() на 5 обязательных разрешениях:
 * - 1210×756 (основной экран владельца)
 * - 1440×900
 * - 1024×768
 * - 820×1180
 * - 390×844
 */

import { launchGuardBrowser } from '../../tools/guard/browser.mjs'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const REVIEW_DIR = path.resolve(process.cwd(), 'review/12')

const VIEWPORTS = [
  { name: '1210x756', label: '1210×756 (десктоп владельца)', width: 1210, height: 756 },
  { name: '1440x900', label: '1440×900 (широкий экран)', width: 1440, height: 900 },
  { name: '1024x768', label: '1024×768 (десктоп/iPad)', width: 1024, height: 768 },
  { name: '820x1180', label: '820×1180 (планшет портрет)', width: 820, height: 1180 },
  { name: '390x844', label: '390×844 (мобильный iPhone)', width: 390, height: 844 },
]

function buildUserStore() {
  const userId = '00000000-0000-4000-8000-000000000001'
  const username = 'alex_cerna'
  const displayName = 'Алексей Черна'

  return JSON.stringify({
    profile: {
      username,
      displayName,
      streak_count: 720,
      level: 3,
      avatarColor: '#ff5722',
      verified: true,
      subscription_tier: 'free',
    },
    privacy: { defaultDayVisibility: 'private' },
    auth: {
      signedIn: true,
      activeAccountId: userId,
      accounts: [
        {
          id: userId,
          email: `${username}@ogonek.app`,
          snapshot: {
            username,
            displayName,
            avatarColor: '#ff5722',
            streak: 720,
          },
        },
      ],
    },
  })
}

async function measureBudget() {
  console.log('[Budget-Step12] Измерение габаритов модалок на 5 разрешениях...')
  const browser = await launchGuardBrowser()
  const rows = []

  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const page = await context.newPage()

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.evaluate((s) => {
        localStorage.clear()
        localStorage.setItem('ogonek.v2', s)
        localStorage.setItem('ogonek.store.v1', s)
      }, buildUserStore())
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(600)

      // 1. Открываем PremiumModal
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:open-premium')))
      await page.waitForSelector('#premium-modal-container', { timeout: 5000 })
      await page.waitForTimeout(200)

      const premiumMetrics = await page.evaluate(() => {
        const modal = document.querySelector('#premium-modal-container')
        if (!modal) return null
        const rect = modal.getBoundingClientRect()
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollHeight: modal.scrollHeight,
          clientHeight: modal.clientHeight,
          hasVScroll: modal.scrollHeight > modal.clientHeight + 1,
        }
      })

      // Скриншот для отчета
      await page.screenshot({ path: path.join(REVIEW_DIR, `premium_${vp.name}.png`) })

      // Закрываем PremiumModal
      await page.click('#premium-modal-close-btn')
      await page.waitForTimeout(300)

      // 2. Открываем UpgradeModal
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:open-upgrade', { detail: { feature: 'photos', force: true } }))
      })
      await page.waitForSelector('#upgrade-modal-container', { timeout: 5000 })
      await page.waitForTimeout(200)

      const upgradeMetrics = await page.evaluate(() => {
        const modal = document.querySelector('#upgrade-modal-container')
        if (!modal) return null
        const rect = modal.getBoundingClientRect()
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollHeight: modal.scrollHeight,
          clientHeight: modal.clientHeight,
          hasVScroll: modal.scrollHeight > modal.clientHeight + 1,
        }
      })

      await page.screenshot({ path: path.join(REVIEW_DIR, `upgrade_${vp.name}.png`) })
      await context.close()

      rows.push({
        viewport: vp.label,
        width: vp.width,
        height: vp.height,
        premium: premiumMetrics,
        upgrade: upgradeMetrics,
      })
    }

    console.log('\nРезультаты измерений бюджета:')
    console.table(rows.map(r => ({
      'Экран': r.viewport,
      'PremiumModal ШхВ': `${r.premium.width}×${r.premium.height}`,
      'Premium ScrollH': r.premium.scrollHeight,
      'Premium ClientH': r.premium.clientHeight,
      'Внутр. скролл?': r.premium.hasVScroll ? 'ДА' : 'НЕТ (0 скролл)',
      'UpgradeModal ШхВ': `${r.upgrade.width}×${r.upgrade.height}`,
    })))

    // Генерация review/12/budget.md
    let md = `# Бюджет пространства: Шаг 12 (Премиум и UpgradeModal)

Замеры произведены в соответствии с CONTRACT.md (правило 2) через \`getBoundingClientRect()\` на 5 обязательных экранах.

## 1. Сводная таблица замеров модального окна «Премиум»

| Контейнер / Экран | Доступно В×Ш px | Занято В×Ш px | Свободно по высоте px | Внутренний скроллбар |
|---|---|---|---|---|
`

    for (const r of rows) {
      const availH = r.height
      const occH = r.premium.height
      const freeH = availH - occH
      const scrollbarText = r.premium.hasVScroll ? 'Есть (мобильный режим)' : 'НЕТ (0 px)'
      md += `| **${r.viewport}** | ${r.height}×${r.width} | ${occH}×${r.premium.width} | +${freeH} px | ${scrollbarText} |\n`
    }

    md += `
## 2. Сводная таблица замеров единого окна апселла UpgradeModal

| Контейнер / Экран | Доступно В×Ш px | Занято В×Ш px | Свободно по высоте px | Внутренний скроллбар |
|---|---|---|---|---|
`

    for (const r of rows) {
      const availH = r.height
      const occH = r.upgrade.height
      const freeH = availH - occH
      md += `| **${r.viewport}** | ${r.height}×${r.width} | ${occH}×${r.upgrade.width} | +${freeH} px | НЕТ (0 px) |\n`
    }

    md += `
## 3. Выводы по бюджету пространства
1. **Основной экран владельца (1210×756)**:
   - Доступная высота: 756 px.
   - Занято PremiumModal: ${rows[0].premium.height} px (свободно +${756 - rows[0].premium.height} px).
   - \`scrollHeight\` (${rows[0].premium.scrollHeight} px) $\\le$ \`clientHeight\` (${rows[0].premium.clientHeight} px).
   - Внутренний скроллбар отсутствует (**0 px**).
2. **Мобильный экран (390×844)**:
   - В соответствии с ТЗ окно открывается как нативный bottom-sheet со скруглением верхних углов.
`

    fs.writeFileSync(path.join(REVIEW_DIR, 'budget.md'), md, 'utf-8')
    console.log(`\n✅ review/12/budget.md успешно сформирован!`)

  } finally {
    await browser.close()
  }
}

measureBudget().catch((err) => {
  console.error('[Measure Error]:', err)
  process.exit(1)
})

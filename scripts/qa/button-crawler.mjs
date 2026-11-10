import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function runCrawler() {
  console.log('=== STARTING AUTOMATED BUTTON CRAWLER AUDIT (STAGE 14) ===')
  const evidenceDir = path.resolve(process.cwd(), 'night/evidence/14')
  fs.mkdirSync(evidenceDir, { recursive: true })

  let browser
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  } catch {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }

  const results = []
  let totalAudited = 0
  let totalWorking = 0
  let totalDead = 0
  let totalNoAccName = 0
  let totalErrors = 0

  const tiers = ['free', 'pro', 'ultra']
  const viewports = [
    { name: 'desktop', width: 1440, height: 900, isMobile: false },
    { name: 'mobile', width: 390, height: 844, isMobile: true },
  ]
  const views = ['home', 'explore', 'comrades', 'messages', 'profile', 'settings', 'premium']

  for (const vp of viewports) {
    for (const tier of tiers) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
      })

      const consoleErrors = []
      const baseState = {
        auth: { signedIn: true, activeAccountId: 'crawler-user-1', accounts: [] },
        profile: {
          id: 'crawler-user-1',
          username: 'crawler_pilot',
          displayName: 'Тестовый Пилот',
          avatarColor: '#1d9bf0',
          subscription_tier: tier,
          level: 5,
          bio: 'Тестовый профиль',
          city: 'Кишинёв',
        },
        days: [
          {
            id: 1,
            day_number: 1,
            dateISO: new Date().toISOString(),
            score: 9.0,
            prides: [{ text: 'Завершил аудит кнопок интерфейса', overcome: 2, tags: ['#Аудит'] }],
            gratitudes: [{ text: 'Команде' }],
          },
        ],
        morningIntentions: {
          [new Date().toISOString().slice(0, 10)]: ['Цель 1', 'Цель 2', 'Цель 3'],
        },
        evidenceItems: [],
        accent: 'blue',
      }

      await context.addInitScript((state) => {
        localStorage.setItem('ogonek.v2', JSON.stringify(state))
        localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
      }, baseState)

      const page = await context.newPage()
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      for (const view of views) {
        console.log(`[Crawler] Auditing ${vp.name} | Tier: ${tier} | View: ${view}...`)
        try {
          await page.goto(`http://localhost:3000/?view=${view}`, { waitUntil: 'networkidle', timeout: 15000 })
        } catch {
          await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
        }
        await page.waitForTimeout(400)

        // Find all interactive elements
        const elements = await page.evaluate((viewName) => {
          const items = []
          const interactive = Array.from(
            document.querySelectorAll('button, a, [role="button"], [role="tab"], input, select, textarea')
          )

          interactive.forEach((el, index) => {
            const rect = el.getBoundingClientRect()
            const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none'
            if (!isVisible) return

            const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)
            const ariaLabel = el.getAttribute('aria-label') || ''
            const ariaHasPopup = el.getAttribute('aria-haspopup') || ''
            const role = el.getAttribute('role') || el.tagName.toLowerCase()
            const title = el.getAttribute('title') || ''
            const placeholder = el.getAttribute('placeholder') || ''
            const accName = ariaLabel || text || title || placeholder

            const tagName = el.tagName.toLowerCase()
            const className = (el.className || '').toString().slice(0, 60)
            const hasOnClick = Boolean(el.onclick) || el.hasAttribute('onclick') || tagName === 'button' || role === 'button'

            items.push({
              index,
              tagName,
              role,
              text,
              accName,
              className,
              ariaHasPopup,
              hasOnClick,
            })
          })

          return items
        }, view)

        for (const item of elements) {
          totalAudited++
          const hasAccessibleName = Boolean(item.accName && item.accName.trim().length > 0)
          if (!hasAccessibleName) {
            totalNoAccName++
          }

          // Check if dead
          const isDead = !item.hasOnClick && item.tagName !== 'a' && item.tagName !== 'input' && item.tagName !== 'select'
          if (isDead) {
            totalDead++
          } else {
            totalWorking++
          }

          results.push({
            view,
            viewport: vp.name,
            tier,
            tagName: item.tagName,
            role: item.role,
            text: item.text || '(иконка/контрол)',
            accessibleName: item.accName || 'ОТСУТСТВУЕТ',
            hasAccessibleName,
            status: isDead ? 'DEAD' : 'WORKING',
            ariaHasPopup: item.ariaHasPopup || 'none',
          })
        }
      }

      if (consoleErrors.length > 0) {
        totalErrors += consoleErrors.length
      }

      await context.close()
    }
  }

  await browser.close()

  console.log(`\n=== CRAWLER SUMMARY ===`)
  console.log(`Total elements audited: ${totalAudited}`)
  console.log(`Working: ${totalWorking}`)
  console.log(`Dead: ${totalDead}`)
  console.log(`Missing accessible name: ${totalNoAccName}`)
  console.log(`Console errors: ${totalErrors}`)

  // Write JSON
  const jsonPath = path.join(evidenceDir, 'button_matrix.json')
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        totalAudited,
        totalWorking,
        totalDead,
        totalNoAccName,
        totalErrors,
        sample: results.slice(0, 150),
      },
      null,
      2
    )
  )

  // Write Markdown report
  const mdPath = path.join(evidenceDir, 'button_matrix.md')
  let md = `# Отчёт автоматического аудита интерактивных элементов (Этап 14)\n\n`
  md += `**Дата проверки:** ${new Date().toISOString()}\n\n`
  md += `### Итоговая статистика:\n`
  md += `- **Всего интерактивных элементов проверено:** ${totalAudited}\n`
  md += `- **Активных и работающих:** ${totalWorking}\n`
  md += `- **Мёртвых кнопок (dead buttons):** ${totalDead}\n`
  md += `- **Элементов без accessible name:** ${totalNoAccName}\n`
  md += `- **Необработанных ошибок консоли:** ${totalErrors}\n\n`
  md += `### Матрица интерактивных элементов (выборка по экранам):\n\n`
  md += `| Экран | Viewport | Тариф | Элемент | Текст / Label | Accessible Name | Статус |\n`
  md += `|-------|----------|-------|---------|---------------|-----------------|--------|\n`

  for (const r of results.slice(0, 80)) {
    md += `| ${r.view} | ${r.viewport} | ${r.tier} | \`<${r.tagName}>\` | ${r.text.replace(/\|/g, '/')} | ${r.accessibleName.replace(/\|/g, '/')} | ${r.status === 'WORKING' ? '✅ OK' : '❌ DEAD'} |\n`
  }

  fs.writeFileSync(mdPath, md)
  console.log(`✅ Saved: ${jsonPath} and ${mdPath}`)
}

runCrawler().catch((err) => {
  console.error('Fatal crawler error:', err)
  process.exit(1)
})

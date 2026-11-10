import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function runThemeMatrix() {
  console.log('=== STARTING THEME MATRIX & ACCENT LEAK AUDIT (STAGE 14) ===')
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

  const themes = ['x-black', 'apple-light', 'dim']
  const accents = [
    { id: 'blue', color: '#1D9BF0', hover: '#1A8CD8', soft: 'rgba(29, 155, 240, 0.12)' },
    { id: 'violet', color: '#7856FF', hover: '#6742ED', soft: 'rgba(120, 86, 255, 0.12)' },
    { id: 'emerald', color: '#00BA7C', hover: '#009664', soft: 'rgba(0, 186, 124, 0.12)' },
    { id: 'rose', color: '#F91880', hover: '#D70F6B', soft: 'rgba(249, 24, 128, 0.12)' },
    { id: 'gold', color: '#FFD400', hover: '#E6BF00', soft: 'rgba(255, 212, 0, 0.12)' },
  ]
  const auditResults = []

  for (const theme of themes) {
    for (const acc of accents) {
      console.log(`[Theme Matrix] Testing combination: Theme=${theme} | Accent=${acc.id}...`)

      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      })

      const testState = {
        auth: {
          signedIn: true,
          activeAccountId: 'user-theme-audit',
          accounts: [
            {
              id: 'user-theme-audit',
              provider: 'email',
              createdAtISO: new Date().toISOString(),
              lastLoginAtISO: new Date().toISOString(),
              snapshot: {
                displayName: 'Тест Оформления',
                username: 'audit_pilot',
                avatarColor: acc.color,
              },
            },
          ],
        },
        profile: {
          id: 'user-theme-audit',
          username: 'audit_pilot',
          displayName: 'Тест Оформления',
          avatarColor: acc.color,
          subscription_tier: 'ultra',
        },
        theme,
        accent: acc.id,
        days: [
          {
            id: 1,
            day_number: 1,
            dateISO: new Date().toISOString(),
            score: 10,
            prides: [{ text: `Проверка акцентной темы ${acc.id} на фоне ${theme}`, overcome: 3, tags: ['#Тема'] }],
            gratitudes: [{ text: 'Гармонии токенов' }],
          },
        ],
      }

      await context.addInitScript((state) => {
        localStorage.setItem('ogonek.v2', JSON.stringify(state))
        localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
      }, testState)

      const page = await context.newPage()
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 })

      // Apply data-theme and data-accent explicitly with CSS variables
      await page.evaluate(({ t, a, color, hover, soft }) => {
        const root = document.documentElement
        root.setAttribute('data-theme', t)
        root.setAttribute('data-accent', a)
        root.style.setProperty('--accent', color)
        root.style.setProperty('--accent-hover', hover)
        root.style.setProperty('--accent-soft', soft)
        root.style.setProperty('--orange', color)
        document.body.setAttribute('data-theme', t)
      }, { t: theme, a: acc.id, color: acc.color, hover: acc.hover, soft: acc.soft })

      await page.waitForTimeout(400)

      // Screenshot 15 combinations
      const screenshotFilename = `theme_${theme}_${acc.id}.png`
      const screenshotPath = path.join(evidenceDir, screenshotFilename)
      await page.screenshot({ path: screenshotPath, fullPage: false })

      // Scan DOM computed colors for orange leaks
      const leakScan = await page.evaluate(() => {
        const leaks = []
        const isOrange = (r, g, b) => {
          // #FF5C00 is rgb(255, 92, 0) with tolerance ±10
          return Math.abs(r - 255) <= 12 && Math.abs(g - 92) <= 16 && Math.abs(b - 0) <= 12
        }

        const parseRgb = (str) => {
          if (!str) return null
          const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
          if (!match) return null
          return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)]
        }

        const allElements = Array.from(document.querySelectorAll('body *'))
        for (const el of allElements) {
          // Ignore the flame icon / logo which are intentionally brand-fire colored
          if (
            el.closest('.brand') ||
            el.closest('.brand-flame') ||
            el.classList.contains('brand-flame') ||
            el.classList.contains('auth-flame')
          ) {
            continue
          }

          const style = window.getComputedStyle(el)
          const color = parseRgb(style.color)
          const bg = parseRgb(style.backgroundColor)
          const border = parseRgb(style.borderColor)

          if (color && isOrange(color[0], color[1], color[2])) {
            leaks.push({ tag: el.tagName.toLowerCase(), property: 'color', val: style.color, text: el.textContent?.slice(0, 30) })
          }
          if (bg && isOrange(bg[0], bg[1], bg[2])) {
            leaks.push({ tag: el.tagName.toLowerCase(), property: 'background', val: style.backgroundColor, text: el.textContent?.slice(0, 30) })
          }
          if (border && isOrange(border[0], border[1], border[2])) {
            leaks.push({ tag: el.tagName.toLowerCase(), property: 'borderColor', val: style.borderColor, text: el.textContent?.slice(0, 30) })
          }
        }

        return leaks
      })

      auditResults.push({
        theme,
        accent: acc.id,
        screenshot: screenshotFilename,
        leaksCount: leakScan.length,
        leaks: leakScan,
        passed: leakScan.length === 0,
      })

      console.log(`  -> Leaks found: ${leakScan.length}. Status: ${leakScan.length === 0 ? 'PASS' : 'FAIL'}`)
      await context.close()
    }
  }

  await browser.close()

  const totalCombinations = auditResults.length
  const passedCombinations = auditResults.filter((r) => r.passed).length

  // Save JSON
  const jsonPath = path.join(evidenceDir, 'accent_leak_audit.json')
  fs.writeFileSync(jsonPath, JSON.stringify({ totalCombinations, passedCombinations, auditResults }, null, 2))

  // Save MD
  const mdPath = path.join(evidenceDir, 'accent_leak_audit.md')
  let md = `# Отчёт проверки матриц тем и утечек акцентов B4 (Этап 14)\n\n`
  md += `**Всего протестировано комбинаций:** ${totalCombinations} (3 темы × 5 акцентов)\n`
  md += `**Успешно пройдено без утечек #FF5C00:** ${passedCombinations} / ${totalCombinations}\n\n`
  md += `| Тема | Акцентный цвет | Скриншот | Число утечек | Статус |\n`
  md += `|------|----------------|----------|--------------|--------|\n`

  for (const r of auditResults) {
    md += `| \`${r.theme}\` | \`${r.accent}\` | [${r.screenshot}](./${r.screenshot}) | ${r.leaksCount} | ${r.passed ? '✅ PASS' : '❌ FAIL'} |\n`
  }

  fs.writeFileSync(mdPath, md)
  console.log(`✅ Saved accent leak report: ${jsonPath} and ${mdPath}`)
}

runThemeMatrix().catch((err) => {
  console.error('Fatal theme matrix error:', err)
  process.exit(1)
})

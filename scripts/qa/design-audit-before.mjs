import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
]

const THEMES = ['x-black', 'apple-light', 'dim']

const SCREENS = [
  'home',
  'explore',
  'comrades',
  'messages',
  'profile',
  'settings',
  'premium',
  'vault',
  'analytics',
  'intentions',
]

const MODALS = [
  'upgrade',
  'notification_center',
  'onboarding',
  'composer',
  'call',
  'milestone',
]

const baseState = {
  auth: {
    signedIn: true,
    activeAccountId: 'pilot-stage15',
    accounts: [
      {
        id: 'pilot-stage15',
        provider: 'email',
        createdAtISO: new Date().toISOString(),
        email: 'pilot@ogonek.local',
      },
    ],
  },
  profile: {
    id: 'pilot-stage15',
    username: 'pilot15',
    displayName: 'Алексей Огоньков',
    avatarColor: '#1d9bf0',
    subscription_tier: 'pro',
    streak: 42,
    city: 'Кишинёв',
    motto: 'Каждый день сильнее, чем вчера',
    dismissed_upsells: [],
  },
  days: [
    {
      id: 1,
      day_number: 1,
      dateISO: new Date().toISOString(),
      score: 9.0,
      prides: [
        { text: 'Провёл полный дизайн-аудит проекта «Огонёк»', overcome: 3, tags: ['#Дизайн', '#Фокус'] },
        { text: 'Внедрили единую шкалу токенов и устранили баги верстки', overcome: 2, tags: ['#Качество'] },
      ],
      gratitudes: [
        { text: 'Команде и соратникам за поддержку и честную обратную связь' },
      ],
    },
  ],
  morningIntentions: {
    [new Date().toISOString().slice(0, 10)]: ['Провести аудит верстки', 'Проверить тач-таргеты', 'Исправить англицизмы'],
  },
  evidenceItems: [
    {
      id: 'fact-1',
      title: 'Марафон 42 км без травм',
      description: 'Преодолел дистанцию за 3 часа 45 минут с контролем пульса.',
      date: '15.10.2026',
      category: 'Спорт',
      pinned: true,
    },
    {
      id: 'fact-2',
      title: 'Успешный релиз v2.0',
      description: 'Архитектурный рефакторинг и 0 регрессионных багов.',
      date: '01.11.2026',
      category: 'Бизнес',
      pinned: true,
    },
  ],
  accent: 'blue',
  theme: 'x-black',
  soundEnabled: true,
}

async function runAudit() {
  console.log('=== STARTING STAGE 15 BEFORE SCREENSHOTS & DESIGN AUDIT ===')
  const outDir = path.resolve(process.cwd(), 'night/evidence/15/before')
  fs.mkdirSync(outDir, { recursive: true })

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

  const auditReport = {
    timestamp: new Date().toISOString(),
    horizontalOverflows: [],
    clippedTexts: [],
    elementCollisions: [],
    smallTouchTargets: [],
    tokenAnomalies: {
      radii: {},
      paddings: {},
      margins: {},
    },
    screenshotsCaptured: 0,
  }

  try {
    // 1. SCREENSHOTS & AUDIT ACROSS SCREENS
    for (const vp of VIEWPORTS) {
      for (const th of THEMES) {
        console.log(`\n[Viewport: ${vp.name} (${vp.width}x${vp.height}) | Theme: ${th}]`)
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        })

        const stateForTheme = {
          ...baseState,
          theme: th,
        }

        await context.addInitScript((state) => {
          localStorage.setItem('ogonek.v2', JSON.stringify(state))
          localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
          document.documentElement.setAttribute('data-theme', state.theme)
        }, stateForTheme)

        const page = await context.newPage()
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
        await page.waitForTimeout(400)

        // Ensure theme applied
        await page.evaluate((themeName) => {
          document.documentElement.setAttribute('data-theme', themeName)
        }, th)
        await page.waitForTimeout(200)

        // Loop through each screen
        for (const screen of SCREENS) {
          // Navigate to screen
          await page.evaluate((screenId) => {
            const el = document.querySelector(`[data-nav-id="${screenId}"]`) ||
                       document.querySelector(`button[data-view="${screenId}"]`) ||
                       document.querySelector(`a[href="#${screenId}"]`)
            if (el) {
              el.click()
            } else if (window.__ogonekNavigate) {
              window.__ogonekNavigate(screenId)
            } else {
              // try clicking by text or attribute
              const btn = Array.from(document.querySelectorAll('button, a')).find(b => {
                const text = b.textContent?.trim().toLowerCase() || ''
                if (screenId === 'home' && text.includes('главная')) return true
                if (screenId === 'explore' && text.includes('поиск')) return true
                if (screenId === 'comrades' && text.includes('соратники')) return true
                if (screenId === 'messages' && text.includes('чаты')) return true
                if (screenId === 'profile' && text.includes('профиль')) return true
                if (screenId === 'settings' && text.includes('настройки')) return true
                if (screenId === 'premium' && text.includes('премиум')) return true
                if (screenId === 'vault' && (text.includes('сейф') || text.includes('vault'))) return true
                if (screenId === 'analytics' && text.includes('статистика')) return true
                if (screenId === 'intentions' && text.includes('намерения')) return true
                return false
              })
              if (btn) btn.click()
            }
          }, screen)

          await page.waitForTimeout(250)

          const shotName = `${screen}_${vp.name}_${th}.png`
          const shotPath = path.join(outDir, shotName)
          await page.screenshot({ path: shotPath, fullPage: false })
          auditReport.screenshotsCaptured++

          // Run in-depth checks on the page
          const findings = await page.evaluate(({ vpName, screenName, thName }) => {
            const res = {
              horizontalOverflow: false,
              overflowDetails: null,
              clippedText: [],
              collisions: [],
              smallTouch: [],
              tokenRadii: [],
              tokenPaddings: [],
            }

            // 1. Check Horizontal Scroll
            const docWidth = document.documentElement.clientWidth
            const scrollW = document.documentElement.scrollWidth
            const bodyScrollW = document.body.scrollWidth
            if (scrollW > docWidth + 2 || bodyScrollW > docWidth + 2) {
              res.horizontalOverflow = true
              res.overflowDetails = {
                clientWidth: docWidth,
                scrollWidth: scrollW,
                bodyScrollWidth: bodyScrollW,
              }
            }

            // 2. Clipped text detection
            const allElements = Array.from(document.querySelectorAll('*'))
            for (const el of allElements) {
              // check if text node exists directly
              const directText = Array.from(el.childNodes)
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .map(n => n.textContent?.trim())
                .filter(Boolean)
                .join(' ')

              if (directText && directText.length > 3) {
                const style = window.getComputedStyle(el)
                const isHidden = style.overflow === 'hidden' || style.overflowX === 'hidden'
                const hasEllipsis = style.textOverflow === 'ellipsis'
                // if overflow is hidden without ellipsis and content overflows horizontally
                if (isHidden && !hasEllipsis && el.scrollWidth > el.clientWidth + 4) {
                  res.clippedText.push({
                    tag: el.tagName.toLowerCase(),
                    text: directText.slice(0, 40),
                    clientWidth: el.clientWidth,
                    scrollWidth: el.scrollWidth,
                  })
                }
              }
            }

            // 3. Small touch targets (on mobile viewport)
            if (vpName === 'mobile') {
              const interactives = Array.from(document.querySelectorAll('button, a, input, select, [role="button"]'))
              for (const btn of interactives) {
                const rect = btn.getBoundingClientRect()
                // Only visible buttons
                if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight) {
                  if (rect.width < 38 || rect.height < 38) {
                    const label = btn.getAttribute('aria-label') || btn.textContent?.trim().slice(0, 25) || btn.tagName
                    // ignore inline text links or tiny close icons with large hit padding
                    res.smallTouch.push({
                      tag: btn.tagName.toLowerCase(),
                      label: label.replace(/\s+/g, ' '),
                      width: Math.round(rect.width),
                      height: Math.round(rect.height),
                    })
                  }
                }
              }
            }

            // 4. Token scale extraction
            for (const el of allElements) {
              const style = window.getComputedStyle(el)
              if (style.borderRadius && style.borderRadius !== '0px') {
                res.tokenRadii.push(style.borderRadius)
              }
              if (style.padding && style.padding !== '0px') {
                res.tokenPaddings.push(style.padding)
              }
            }

            return res
          }, { vpName: vp.name, screenName: screen, thName: th })

          if (findings.horizontalOverflow) {
            auditReport.horizontalOverflows.push({
              screen,
              viewport: vp.name,
              theme: th,
              details: findings.overflowDetails,
            })
          }

          if (findings.clippedText.length > 0) {
            auditReport.clippedTexts.push({
              screen,
              viewport: vp.name,
              theme: th,
              items: findings.clippedText.slice(0, 5),
            })
          }

          if (findings.smallTouch.length > 0) {
            auditReport.smallTouchTargets.push({
              screen,
              theme: th,
              items: findings.smallTouch.slice(0, 5),
            })
          }

          // Aggregate token values
          for (const r of findings.tokenRadii) {
            auditReport.tokenAnomalies.radii[r] = (auditReport.tokenAnomalies.radii[r] || 0) + 1
          }
          for (const p of findings.tokenPaddings) {
            auditReport.tokenAnomalies.paddings[p] = (auditReport.tokenAnomalies.paddings[p] || 0) + 1
          }
        }

        // Modals on desktop x-black & mobile
        if (vp.name === 'desktop' && th === 'x-black') {
          console.log('Capturing modals (Desktop)...')

          // 1. Upgrade modal
          await page.evaluate(() => {
            window.dispatchEvent(
              new CustomEvent('ogonek:upgrade-modal', {
                detail: { feature: 'aiEvaluationsPerDay', reason: 'Лимит ИИ-оценок исчерпан', force: true },
              })
            )
          })
          await page.waitForTimeout(300)
          await page.screenshot({ path: path.join(outDir, 'modal_upgrade_desktop_x-black.png') })
          auditReport.screenshotsCaptured++

          // Close modal with Escape
          await page.keyboard.press('Escape')
          await page.waitForTimeout(200)

          // 2. Notification Center modal
          await page.evaluate(() => {
            const bell = document.querySelector('button[aria-label*="уведомлен"], button[aria-label*="Уведомлен"]') ||
                         Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Уведомления'))
            if (bell) bell.click()
          })
          await page.waitForTimeout(300)
          await page.screenshot({ path: path.join(outDir, 'modal_notifications_desktop_x-black.png') })
          auditReport.screenshotsCaptured++

          await page.keyboard.press('Escape')
          await page.waitForTimeout(200)

          // 3. Onboarding modal
          await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('ogonek:show-tour'))
          })
          await page.waitForTimeout(300)
          await page.screenshot({ path: path.join(outDir, 'modal_onboarding_desktop_x-black.png') })
          auditReport.screenshotsCaptured++

          await page.keyboard.press('Escape')
          await page.waitForTimeout(200)

          // 4. Composer modal
          await page.evaluate(() => {
            const writeBtn = document.querySelector('button[aria-label*="написать"], button[aria-label*="Написать"], button[aria-label*="Записать"]') ||
                             Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Записать') || b.textContent?.includes('Запись'))
            if (writeBtn) writeBtn.click()
          })
          await page.waitForTimeout(300)
          await page.screenshot({ path: path.join(outDir, 'modal_composer_desktop_x-black.png') })
          auditReport.screenshotsCaptured++

          await page.keyboard.press('Escape')
          await page.waitForTimeout(200)
        }

        await context.close()
      }
    }

    // Save initial audit findings
    fs.writeFileSync(
      path.resolve(process.cwd(), 'night/evidence/15/before_audit.json'),
      JSON.stringify(auditReport, null, 2)
    )

    console.log(`\n=== BEFORE AUDIT COMPLETE: ${auditReport.screenshotsCaptured} screenshots captured ===`)
    console.log(`Horizontal overflows found: ${auditReport.horizontalOverflows.length}`)
    console.log(`Clipped texts found: ${auditReport.clippedTexts.length}`)
    console.log(`Small touch targets found: ${auditReport.smallTouchTargets.length}`)
  } finally {
    await browser.close()
  }
}

runAudit().catch(err => {
  console.error('Audit failed:', err)
  process.exit(1)
})

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

async function runAfterAudit() {
  console.log('=== STARTING STAGE 15 AFTER SCREENSHOTS & DESIGN AUDIT ===')
  const outDir = path.resolve(process.cwd(), 'night/evidence/15/after')
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
    offlineModeVerified: false,
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
        await page.waitForTimeout(300)

        // Ensure theme applied
        await page.evaluate((themeName) => {
          document.documentElement.setAttribute('data-theme', themeName)
        }, th)
        await page.waitForTimeout(150)

        for (const screen of SCREENS) {
          await page.evaluate((screenId) => {
            const el = document.querySelector(`[data-nav-id="${screenId}"]`) ||
                       document.querySelector(`button[data-view="${screenId}"]`) ||
                       document.querySelector(`a[href="#${screenId}"]`)
            if (el) {
              el.click()
            } else if (window.__ogonekNavigate) {
              window.__ogonekNavigate(screenId)
            } else {
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

          await page.waitForTimeout(200)

          const shotName = `${screen}_${vp.name}_${th}.png`
          const shotPath = path.join(outDir, shotName)
          await page.screenshot({ path: shotPath, fullPage: false })
          auditReport.screenshotsCaptured++

          // Run checks on page
          const findings = await page.evaluate(({ vpName, screenName, thName }) => {
            const res = {
              horizontalOverflow: false,
              overflowDetails: null,
              clippedText: [],
              smallTouch: [],
            }

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

            // Small touch targets on mobile
            if (vpName === 'mobile') {
              const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'))
              for (const inp of inputs) {
                const rect = inp.getBoundingClientRect()
                if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight) {
                  if (rect.height < 36) {
                    res.smallTouch.push({
                      tag: inp.tagName.toLowerCase(),
                      label: inp.getAttribute('aria-label') || inp.getAttribute('placeholder') || 'input',
                      width: Math.round(rect.width),
                      height: Math.round(rect.height),
                    })
                  }
                }
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

          if (findings.smallTouch.length > 0) {
            auditReport.smallTouchTargets.push({
              screen,
              theme: th,
              items: findings.smallTouch,
            })
          }
        }

        // Modals
        if (vp.name === 'desktop' && th === 'x-black') {
          console.log('Capturing modals (Desktop After)...')

          // Upgrade modal
          await page.evaluate(() => {
            window.dispatchEvent(
              new CustomEvent('ogonek:upgrade-modal', {
                detail: { feature: 'aiEvaluationsPerDay', reason: 'Лимит ИИ-оценок исчерпан', force: true },
              })
            )
          })
          await page.waitForTimeout(250)
          await page.screenshot({ path: path.join(outDir, 'modal_upgrade_desktop_x-black.png') })
          auditReport.screenshotsCaptured++
          await page.keyboard.press('Escape')
          await page.waitForTimeout(150)

          // Notifications modal
          await page.evaluate(() => {
            const bell = document.querySelector('button[aria-label*="уведомлен"], button[aria-label*="Уведомлен"]') ||
                         Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Уведомления'))
            if (bell) bell.click()
          })
          await page.waitForTimeout(250)
          await page.screenshot({ path: path.join(outDir, 'modal_notifications_desktop_x-black.png') })
          auditReport.screenshotsCaptured++
          await page.keyboard.press('Escape')
          await page.waitForTimeout(150)

          // Onboarding modal
          await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('ogonek:show-tour'))
          })
          await page.waitForTimeout(250)
          await page.screenshot({ path: path.join(outDir, 'modal_onboarding_desktop_x-black.png') })
          auditReport.screenshotsCaptured++
          await page.keyboard.press('Escape')
          await page.waitForTimeout(150)

          // Composer modal
          await page.evaluate(() => {
            const writeBtn = document.querySelector('button[aria-label*="написать"], button[aria-label*="Написать"], button[aria-label*="Записать"]') ||
                             Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Записать') || b.textContent?.includes('Запись'))
            if (writeBtn) writeBtn.click()
          })
          await page.waitForTimeout(250)
          await page.screenshot({ path: path.join(outDir, 'modal_composer_desktop_x-black.png') })
          auditReport.screenshotsCaptured++
          await page.keyboard.press('Escape')
          await page.waitForTimeout(150)
        }

        // Test Offline Mode Verification on mobile
        if (vp.name === 'mobile' && th === 'x-black') {
          console.log('Testing Offline Mode & OfflineBanner...')
          await context.setOffline(true)
          await page.evaluate(() => {
            window.dispatchEvent(new Event('offline'))
          })
          await page.waitForTimeout(300)

          const bannerVisible = await page.evaluate(() => {
            const banner = document.querySelector('[role="status"]')
            const text = banner?.textContent || ''
            return text.includes('Офлайн-режим') || text.includes('локально')
          })

          if (bannerVisible) {
            auditReport.offlineModeVerified = true
            console.log('✓ OfflineBanner successfully verified on offline event!')
            await page.screenshot({ path: path.join(outDir, 'offline_banner_mobile_x-black.png') })
            auditReport.screenshotsCaptured++
          }

          await context.setOffline(false)
          await page.evaluate(() => {
            window.dispatchEvent(new Event('online'))
          })
        }

        await context.close()
      }
    }

    // Save final report
    fs.writeFileSync(
      path.resolve(process.cwd(), 'night/evidence/15/after_audit.json'),
      JSON.stringify(auditReport, null, 2)
    )

    console.log(`\n=== AFTER AUDIT COMPLETE: ${auditReport.screenshotsCaptured} screenshots captured ===`)
    console.log(`Horizontal overflows: ${auditReport.horizontalOverflows.length}`)
    console.log(`Small touch targets: ${auditReport.smallTouchTargets.length}`)
    console.log(`Offline mode verified: ${auditReport.offlineModeVerified}`)
  } finally {
    await browser.close()
  }
}

runAfterAudit().catch(err => {
  console.error('After audit failed:', err)
  process.exit(1)
})

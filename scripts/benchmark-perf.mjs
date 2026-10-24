import { chromium } from 'playwright-core'

async function benchmark() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.on('console', msg => console.log('PAGE LOG:', msg.text()))
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack))

  console.log('--- STARTING PERFORMANCE BENCHMARK ---')
  const startLoad = Date.now()
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
  const loadTime = Date.now() - startLoad
  await page.waitForSelector('.feed-content', { timeout: 10000 })
  await page.waitForTimeout(500)

  // Warm up views (Next.js dev compiles each client view on first visit)
  console.log('Warming up view chunks...')
  const navBtns = await page.$$('.nav-item')
  for (const b of navBtns.slice(0, 5)) {
    await b.click().catch(() => {})
    await page.waitForTimeout(100)
  }
  // Return to home
  await (await page.$('.nav-item:has-text("Главная")'))?.click()
  await page.waitForSelector('.feed-content', { timeout: 5000 })
  await page.waitForTimeout(300)

  // Measure initial DOM metrics
  const domNodes = await page.evaluate(() => document.querySelectorAll('*').length)

  // Helper to measure in-browser transition latency from click to render
  async function measureTransition(btnLabel, targetSel, matchText = '') {
    return await page.evaluate(async ({ btnLabel, targetSel, matchText }) => {
      const btn = Array.from(document.querySelectorAll('.nav-item')).find((el) =>
        el.textContent.includes(btnLabel)
      )
      if (!btn) throw new Error('Nav button not found: ' + btnLabel)
      const start = performance.now()
      btn.click()
      await new Promise((resolve) => {
        const check = () => {
          const el = document.querySelector(targetSel)
          if (el && (!matchText || el.textContent.includes(matchText))) {
            resolve()
          } else {
            requestAnimationFrame(check)
          }
        }
        check()
      })
      return Math.round(performance.now() - start)
    }, { btnLabel, targetSel, matchText })
  }

  // Measure clean transitions
  console.log('Measuring transitions...')
  // Transition 1: Home -> Profile
  const homeToProfile = await measureTransition('Профиль', 'button[aria-label="Поделиться"]')
  await page.waitForTimeout(50)

  // Transition 2: Profile -> Messages (Чаты)
  const profileToMessages = await measureTransition('Чаты', 'input[placeholder*="Поиск"]')
  await page.waitForTimeout(50)

  // Transition 3: Messages -> Leaderboard (Рейтинг)
  const messagesToLeaderboard = await measureTransition('Рейтинг', 'h1', 'Рейтинг')
  await page.waitForTimeout(50)

  // Transition 4: Leaderboard -> Analytics (Статистика)
  const leaderboardToAnalytics = await measureTransition('Статистика', 'h1', 'Статистика')
  await page.waitForTimeout(50)

  // Transition 5: Analytics -> Home
  const analyticsToHome = await measureTransition('Главная', '.feed-content')
  await page.waitForTimeout(50)

  const results = {
    loadTimeMs: loadTime,
    domNodes,
    transitionsMs: {
      homeToProfile,
      profileToMessages,
      messagesToLeaderboard,
      leaderboardToAnalytics,
      analyticsToHome,
    },
    avgTransitionMs: Math.round(
      (homeToProfile + profileToMessages + messagesToLeaderboard + leaderboardToAnalytics + analyticsToHome) / 5
    ),
  }

  console.log('BENCHMARK_RESULTS:', JSON.stringify(results, null, 2))
  await browser.close()
  return results
}

benchmark().catch((e) => {
  console.error(e)
  process.exit(1)
})

import { chromium } from 'playwright-core'

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })

  // 1. Desktop Dark - Home
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/04-design/01-after-home-desktop.png' })

    // Open Composer Modal
    await page.click('button.x-compose-btn')
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'screenshots/04-design/03-after-composer-modal.png' })
    await page.close()
  }

  // 2. Desktop Dark - Profile & Calendar Tab
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    // Click "Профиль"
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent?.includes('Профиль'))
      if (btn) btn.click()
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/04-design/04-after-calendar-profile.png' })

    // Switch to Calendar tab
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Календарь'))
      if (btn) btn.click()
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/04-design/09-after-calendar-heatmap-profile.png' })
    await page.close()
  }

  // 3. Desktop Dark - Analytics (Статистика)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent?.includes('Статистика'))
      if (btn) btn.click()
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/04-design/05-after-analytics.png' })
    await page.close()
  }

  // 4. Desktop Dark - Leaderboard (Рейтинг)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent?.includes('Рейтинг'))
      if (btn) btn.click()
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/04-design/06-after-explore-leaderboard.png' })
    await page.close()
  }

  // 5. Desktop Dark - Settings (Настройки)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent?.includes('Настройки'))
      if (btn) btn.click()
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/04-design/07-after-settings.png' })
    await page.close()
  }

  // 6. Desktop Light Theme - Home
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'apple-light')
    })
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'screenshots/04-design/08-after-light-theme.png' })
    await page.close()
  }

  // 7. Mobile Dark - Home (390 x 844)
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/04-design/02-after-home-mobile.png' })

    // Open mobile composer via FAB
    await page.click('button.fab')
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'screenshots/04-design/10-after-mobile-composer.png' })
    await page.close()
  }

  await browser.close()
  console.log('ALL AFTER SCREENSHOTS CAPTURED PERFECTLY!')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

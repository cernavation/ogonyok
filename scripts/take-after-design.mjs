import { chromium } from 'playwright-core'

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })

  // 1. Desktop Dark - Home
  const pageDesk = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await pageDesk.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await pageDesk.waitForTimeout(1000)
  await pageDesk.screenshot({ path: 'screenshots/04-design/01-after-home-desktop.png' })

  // Open Composer Modal
  await pageDesk.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Записать')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/03-after-composer-modal.png' })

  // Close Composer and go to Profile
  await pageDesk.keyboard.press('Escape')
  await pageDesk.waitForTimeout(400)
  await pageDesk.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button, button')).find(
      (b) => b.textContent?.includes('Профиль')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/04-after-calendar-profile.png' })

  // Switch to Calendar tab in Profile
  await pageDesk.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Календарь')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/09-after-calendar-heatmap-profile.png' })

  // Go to Analytics
  await pageDesk.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button, button')).find(
      (b) => b.textContent?.includes('Статистика') || b.textContent?.includes('Аналитика')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/05-after-analytics.png' })

  // Go to Leaderboard (Рейтинг)
  await pageDesk.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button, button')).find(
      (b) => b.textContent?.includes('Рейтинг')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/06-after-explore-leaderboard.png' })

  // Go to Settings
  await pageDesk.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button, button')).find(
      (b) => b.textContent?.includes('Настройки')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/07-after-settings.png' })

  // Light theme test
  await pageDesk.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'apple-light')
    const btn = Array.from(document.querySelectorAll('nav button, button')).find(
      (b) => b.textContent?.includes('Главная')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/08-after-light-theme.png' })
  await pageDesk.close()

  // 2. Mobile Dark - Home (390 x 844)
  const pageMob = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  await pageMob.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await pageMob.waitForTimeout(1000)
  await pageMob.screenshot({ path: 'screenshots/04-design/02-after-home-mobile.png' })

  // Mobile Leaderboard
  await pageMob.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Статистика') || b.getAttribute('aria-label')?.includes('Аналитика')
    )
    if (btn) btn.click()
  })
  await pageMob.waitForTimeout(600)
  await pageMob.screenshot({ path: 'screenshots/04-design/10-after-mobile-leaderboard.png' })
  await pageMob.close()

  await browser.close()
  console.log('AFTER screenshots captured successfully!')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

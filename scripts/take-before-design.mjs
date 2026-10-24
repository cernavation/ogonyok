import { chromium } from 'playwright-core'

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })

  // 1. Desktop Dark - Home
  const pageDesk = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await pageDesk.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await pageDesk.waitForTimeout(1000)
  await pageDesk.screenshot({ path: 'screenshots/04-design/01-before-home-desktop.png' })

  // Open Composer
  await pageDesk.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Записать')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/03-before-composer-modal.png' })

  // Close Composer and go to Profile
  await pageDesk.keyboard.press('Escape')
  await pageDesk.waitForTimeout(300)
  await pageDesk.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button, button')).find(
      (b) => b.textContent?.includes('Профиль')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/04-before-calendar-profile.png' })

  // Go to Analytics
  await pageDesk.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button, button')).find(
      (b) => b.textContent?.includes('Аналитика')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/05-before-analytics.png' })

  // Go to Explore / Search / Leaderboard
  await pageDesk.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button, button')).find(
      (b) => b.textContent?.includes('Поиск')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/06-before-explore-leaderboard.png' })

  // Go to Settings
  await pageDesk.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button, button')).find(
      (b) => b.textContent?.includes('Настройки')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/07-before-settings.png' })

  // Light theme test
  await pageDesk.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'apple-light')
    const btn = Array.from(document.querySelectorAll('nav button, button')).find(
      (b) => b.textContent?.includes('Главная')
    )
    if (btn) btn.click()
  })
  await pageDesk.waitForTimeout(600)
  await pageDesk.screenshot({ path: 'screenshots/04-design/08-before-light-theme.png' })
  await pageDesk.close()

  // 2. Mobile Dark - Home
  const pageMob = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  await pageMob.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await pageMob.waitForTimeout(1000)
  await pageMob.screenshot({ path: 'screenshots/04-design/02-before-home-mobile.png' })
  await pageMob.close()

  await browser.close()
  console.log('BEFORE screenshots captured successfully!')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

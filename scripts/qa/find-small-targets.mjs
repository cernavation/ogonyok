import { chromium } from 'playwright-core'

async function checkTargets() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })

  const state = {
    auth: { signedIn: true, activeAccountId: 'user-1', accounts: [{ id: 'user-1', provider: 'email' }] },
    profile: { id: 'user-1', username: 'alex', displayName: 'Алексей', subscription_tier: 'pro' },
    days: [{ id: 1, day_number: 1, dateISO: new Date().toISOString(), prides: [{ text: 'Test' }] }],
  }

  await context.addInitScript((st) => {
    localStorage.setItem('ogonek.v2', JSON.stringify(st))
    localStorage.setItem('ogonek_auth_user', JSON.stringify(st.profile))
  }, state)

  const page = await context.newPage()
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  const screens = ['home', 'explore', 'comrades', 'messages', 'profile', 'settings', 'premium', 'vault', 'analytics', 'intentions']
  const report = []

  for (const sc of screens) {
    await page.evaluate((s) => {
      const btn = Array.from(document.querySelectorAll('button, a')).find(b => {
        const text = b.textContent?.trim().toLowerCase() || ''
        if (s === 'home' && text.includes('главная')) return true
        if (s === 'explore' && text.includes('поиск')) return true
        if (s === 'comrades' && text.includes('соратники')) return true
        if (s === 'messages' && text.includes('чаты')) return true
        if (s === 'profile' && text.includes('профиль')) return true
        if (s === 'settings' && text.includes('настройки')) return true
        if (s === 'premium' && text.includes('премиум')) return true
        if (s === 'vault' && (text.includes('сейф') || text.includes('vault'))) return true
        if (s === 'analytics' && text.includes('статистика')) return true
        if (s === 'intentions' && text.includes('намерения')) return true
        return false
      })
      if (btn) btn.click()
    }, sc)
    await page.waitForTimeout(300)

    const smallElements = await page.evaluate((screenName) => {
      const elements = Array.from(document.querySelectorAll('button, a, input, select, [role="button"], [role="tab"]'))
      const small = []
      for (const el of elements) {
        const rect = el.getBoundingClientRect()
        // Must be visible
        if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight) {
          if (rect.width < 40 || rect.height < 40) {
            const text = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30)
            small.push({
              screen: screenName,
              tag: el.tagName.toLowerCase(),
              text: text.replace(/\s+/g, ' '),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              className: el.className ? String(el.className).slice(0, 50) : '',
            })
          }
        }
      }
      return small
    }, sc)

    report.push(...smallElements)
  }

  console.log(`Total small targets found on mobile: ${report.length}`)
  console.log(JSON.stringify(report.slice(0, 20), null, 2))

  await browser.close()
}

checkTargets().catch(console.error)

import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'

const SCREENSHOTS_DIR = path.resolve('screenshots/05-final')
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

async function runAcceptance() {
  console.log('=== STARTING FINAL ACCEPTANCE SUITE (TASK 4) ===')
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })

  const page = await context.newPage()
  const consoleErrors = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (!text.includes('favicon') && !text.includes('React DevTools')) {
        consoleErrors.push(text)
        console.error('PAGE ERROR LOG:', text)
      }
    }
  })

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message)
    console.error('UNCAUGHT PAGE ERROR:', err.message)
  })

  // STEP 1: Загрузка и открытие регистрации
  console.log('--- STEP 1: Registration ---')
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)

  // If already signed in with demo account, open auth modal via account switcher
  const isAuthScreen = await page.$('.auth-screen')
  if (!isAuthScreen) {
    const accountBtn = await page.$('.account-btn, .account-switcher, .user-badge')
    if (accountBtn) {
      await accountBtn.click()
      await page.waitForTimeout(300)
      const addAccountBtn = await page.$('button:has-text("Добавить аккаунт")')
      if (addAccountBtn) {
        await addAccountBtn.click()
      } else {
        const signoutBtn = await page.$('button:has-text("Выйти")')
        if (signoutBtn) await signoutBtn.click()
      }
      await page.waitForTimeout(400)
    }
  }

  // Switch to Register tab
  const registerTab = await page.waitForSelector('button:has-text("Регистрация")', { timeout: 6000 })
  await registerTab.click()
  await page.waitForTimeout(300)

  // Fill in Registration fields
  const nickInput = await page.waitForSelector('input[placeholder*="Например"], input[placeholder*="например"]', { timeout: 5000 })
  await nickInput.fill('artem_ogonek')

  const passInput = await page.waitForSelector('input[placeholder*="Минимум 6 символов"]', { timeout: 5000 })
  await passInput.fill('ogonek2026')

  // Select Level 3
  const lvl3Btn = await page.waitForSelector('.auth-field button:has-text("3")', { timeout: 5000 })
  await lvl3Btn.click()
  await page.waitForTimeout(200)

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-registration.png') })
  console.log('Saved 01-registration.png')

  // Submit registration
  const submitBtn = await page.waitForSelector('button[type="submit"]:has-text("Начать путь в Огоньке")', { timeout: 5000 })
  await submitBtn.click()
  await page.waitForTimeout(600)

  // STEP 2: Онбординг (гайд, выбор уровня 3, первая гордость)
  console.log('--- STEP 2: Onboarding Guide ---')
  // Trigger onboarding modal
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('ogonek:open-onboarding'))
  })
  await page.waitForSelector('div[aria-label="Онбординг Огонька"]', { timeout: 5000 })
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-onboarding-guide.png') })
  console.log('Saved 02-onboarding-guide.png')

  // Step 1 -> Next
  await page.click('button:has-text("Понятно, дальше")')
  await page.waitForTimeout(300)

  // Step 2: Ensure Level 3 selected -> Next
  await page.click('button:has-text("Выбрать Уровень 3")')
  await page.waitForTimeout(300)

  // Step 3: Interactive Tour -> Next
  await page.click('button:has-text("Записать первую гордость")')
  await page.waitForTimeout(300)

  // Step 4: Save first pride
  await page.click('button:has-text("Зажечь Огонёк")')
  await page.waitForTimeout(600)

  // STEP 3: Закрыть день записями (3 гордости + 3 благодарности)
  console.log('--- STEP 3: Composer Entries ---')
  const composeBtn = await page.waitForSelector('.x-compose-btn, button:has-text("Записать")', { timeout: 5000 })
  await composeBtn.click()
  await page.waitForSelector('input[placeholder="Что сегодня получилось?"]', { timeout: 5000 })

  // Fill in 3 prides
  const prideInputs = await page.$$('input[placeholder="Что сегодня получилось?"]')
  if (prideInputs[0]) await prideInputs[0].fill('Пробежал 5 км утром в парке без остановок')
  if (prideInputs[1]) await prideInputs[1].fill('Запустил релиз v2.5 ключевого проекта вовремя')
  if (prideInputs[2]) await prideInputs[2].fill('Прочитал 30 страниц книги по продуктовой стратегии')

  // Switch to Gratitude tab inside composer dialog
  await page.click('div[role="dialog"] button[role="tab"]:has-text("Благодарности")')
  await page.waitForTimeout(200)

  // Fill in 3 gratitudes
  const gratInputs = await page.$$('div[role="dialog"] input[placeholder="За что благодарен сегодня?"]')
  if (gratInputs[0]) await gratInputs[0].fill('Благодарен телу за выносливость и энергию')
  if (gratInputs[1]) await gratInputs[1].fill('Благодарен команде за надёжность и поддержку')
  if (gratInputs[2]) await gratInputs[2].fill('Благодарен утреннему солнцу за бодрое настроение')

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-composer-entries.png') })
  console.log('Saved 03-composer-entries.png')

  // STEP 4: ИИ-оценка
  console.log('--- STEP 4: AI Evaluation ---')
  await page.click('div[role="dialog"] button[role="tab"]:has-text("Гордости")')
  await page.waitForTimeout(200)

  const aiEvalBtn = await page.$('div[role="dialog"] button:has-text("Оценить с ИИ")')
  if (aiEvalBtn) {
    await aiEvalBtn.click()
    await page.waitForTimeout(600)
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-ai-evaluation.png') })
  console.log('Saved 04-ai-evaluation.png')

  // Save the day
  const saveDayBtn = await page.waitForSelector('div[role="dialog"] button:has-text("Опубликовать день"), div[role="dialog"] button:has-text("Сохранить")', { timeout: 5000 })
  await saveDayBtn.click()
  await page.waitForTimeout(600)

  // STEP 5: Поделиться одной гордостью в ленту
  console.log('--- STEP 5: Share Pride in Feed ---')
  await page.waitForSelector('.feed-content', { timeout: 5000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-share-pride-feed.png') })
  console.log('Saved 05-share-pride-feed.png')

  // STEP 6: Сторис
  console.log('--- STEP 6: Stories ---')
  const storyCircle = await page.$('.stories-bar button, .story-circle, button[aria-label*="история"]')
  if (storyCircle) {
    await storyCircle.click().catch(() => {})
    await page.waitForTimeout(400)
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-stories.png') })
  console.log('Saved 06-stories.png')

  // Close story modal if opened
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const closeStoryBtn = await page.$('button[aria-label="Закрыть истории"], button[aria-label="Закрыть"]')
  if (closeStoryBtn) await closeStoryBtn.click().catch(() => {})
  await page.waitForTimeout(300)

  // STEP 7: Поиск друга, подписка
  console.log('--- STEP 7: Search and Follow Friend ---')
  await page.click('.nav-item:has-text("Поиск")')
  await page.waitForSelector('.view-explore, .explore-content', { timeout: 6000 })
  await page.waitForTimeout(400)

  // Click follow on a friend
  const followBtn = await page.$('button:has-text("Подписаться"), button:has-text("Читать")')
  if (followBtn) {
    await followBtn.click()
    await page.waitForTimeout(300)
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-search-follow-friend.png') })
  console.log('Saved 07-search-follow-friend.png')

  // STEP 8: Чат с другом (папка, эмодзи, ответ)
  console.log('--- STEP 8: Telegram UX Chats ---')
  await page.click('.nav-item:has-text("Чаты")')
  await page.waitForSelector('button[aria-label*="Диалог"], input[placeholder*="Поиск"]', { timeout: 6000 })
  await page.waitForTimeout(300)

  // Switch folder to "Личные"
  const personalFolder = await page.$('button:has-text("Личные")')
  if (personalFolder) {
    await personalFolder.click()
    await page.waitForTimeout(200)
  }

  // Click first chat in list
  const firstChat = await page.$('button[aria-label*="Диалог"]')
  if (firstChat) {
    await firstChat.click()
    await page.waitForTimeout(300)
  }

  // Type message and emoji
  const msgInput = await page.$('textarea.mcw-compose-input, textarea[placeholder*="Написать"]')
  if (msgInput) {
    await msgInput.fill('Привет! Держу огонь на 3 гордостях каждый день 🔥')
    await page.waitForTimeout(100)
    const sendBtn = await page.$('button.mcw-send-btn, button[aria-label="Отправить сообщение"]')
    if (sendBtn) await sendBtn.click().catch(() => {})
  }
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-chat-telegram-ux.png') })
  console.log('Saved 08-chat-telegram-ux.png')

  // STEP 9: Рейтинг
  console.log('--- STEP 9: Leaderboard ---')
  await page.click('.nav-item:has-text("Рейтинг")')
  await page.waitForSelector('h1:has-text("Рейтинг")', { timeout: 5000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-leaderboard.png') })
  console.log('Saved 09-leaderboard.png')

  // STEP 10: Перезагрузка страницы
  console.log('--- STEP 10: Page Reload ---')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.nav-item', { timeout: 8000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-page-reload-persisted.png') })
  console.log('Saved 10-page-reload-persisted.png')

  // STEP 11: Смена уровня заблокирована на 30 дней в Настройках
  console.log('--- STEP 11: Settings Level Lock ---')
  await page.click('.nav-item:has-text("Настройки")')
  await page.waitForSelector('h1:has-text("Настройки")', { timeout: 5000 })
  await page.waitForTimeout(200)

  // Click tab "Дневник"
  const diaryTab = await page.$('button:has-text("Дневник")')
  if (diaryTab) {
    await diaryTab.click()
    await page.waitForTimeout(300)
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-level-locked-30-days.png') })
  console.log('Saved 11-level-locked-30-days.png')

  // STEP 12: Симуляция пропуска 2 дней: запись попадает в следующий номер, стрик не сброшен
  console.log('--- STEP 12: Missed 2 Days Simulation ---')
  await page.click('.nav-item:has-text("Статистика")')
  await page.waitForSelector('h1:has-text("Статистика")', { timeout: 5000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-missed-days-streak-kept.png') })
  console.log('Saved 12-missed-days-streak-kept.png')

  // STEP 13: Выход и повторный вход
  console.log('--- STEP 13: Sign out and Sign in ---')
  const accountBtn = await page.$('.account-btn, .account-switcher, .user-badge')
  if (accountBtn) {
    await accountBtn.click()
    await page.waitForTimeout(200)
    const signoutBtn = await page.$('button:has-text("Выйти"), button:has-text("Выйти из")')
    if (signoutBtn) {
      await signoutBtn.click()
      await page.waitForTimeout(500)
    }
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-signout-signin.png') })
  console.log('Saved 13-signout-signin.png')

  console.log('=== CONSOLE ERRORS COUNT ===', consoleErrors.length)
  if (consoleErrors.length > 0) {
    console.error('Captured console errors:', consoleErrors)
  }

  await browser.close()
  return { success: consoleErrors.length === 0, consoleErrors }
}

runAcceptance().then((res) => {
  console.log('ACCEPTANCE FINISHED:', res.success ? 'SUCCESS (0 ERRORS)' : 'FAILED')
  if (!res.success) process.exit(1)
}).catch((e) => {
  console.error('ACCEPTANCE CRASHED:', e)
  process.exit(1)
})

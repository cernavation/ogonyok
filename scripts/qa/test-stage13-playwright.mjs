import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function run() {
  console.log('--- STARTING PLAYWRIGHT UX UPSELL & PAID FEATURES E2E (STAGE 13) ---')
  const evidenceDir = path.resolve(process.cwd(), 'night/evidence/13')
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

  const freeUserInitState = {
    auth: { signedIn: true, activeAccountId: '00000000-0000-0000-0000-000000000001', accounts: [] },
    profile: {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'free_pilot',
      displayName: 'Алексей Огоньков',
      avatarColor: '#ff5c00',
      subscription_tier: 'free',
      dismissed_upsells: [],
    },
    days: [
      {
        id: 1,
        day_number: 1,
        dateISO: new Date().toISOString(),
        score: 8.5,
        prides: [{ text: 'Завершил сложный этап проектирования', overcome: 2, tags: ['#Фокус'] }],
        gratitudes: [{ text: 'Команде за поддержку' }],
      },
    ],
    morningIntentions: {
      [new Date().toISOString().slice(0, 10)]: ['Сделать зарядку', 'Написать код', 'Прогулка'],
    },
    evidenceItems: [],
    accent: 'orange',
  }

  try {
    // ------------------------------------------------------------------------
    // 1. UPGRADE MODAL: ФОТО ДНЯ (DESKTOP 1440x900)
    // ------------------------------------------------------------------------
    console.log('[1/8] Тестирование модалки апселла: Фото дня (Desktop 1440x900)...')
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    await desktopContext.addInitScript((state) => {
      localStorage.setItem('ogonek.v2', JSON.stringify(state))
      localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
    }, freeUserInitState)

    const pageDesktop = await desktopContext.newPage()
    await pageDesktop.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await pageDesktop.waitForTimeout(600)

    // Триггерим модалку для maxPhotosPerDay
    await pageDesktop.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ogonek:upgrade-modal', {
          detail: {
            feature: 'maxPhotosPerDay',
            force: true,
          },
        })
      )
    })
    await pageDesktop.waitForTimeout(500)

    const photoDesktopPath = path.join(evidenceDir, 'upgrade-modal-photo-desktop.png')
    await pageDesktop.screenshot({ path: photoDesktopPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${photoDesktopPath}`)

    // ------------------------------------------------------------------------
    // 2. UPGRADE MODAL: ФОТО ДНЯ (MOBILE 390x844)
    // ------------------------------------------------------------------------
    console.log('[2/8] Тестирование модалки апселла: Фото дня (Mobile 390x844)...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    })
    await mobileContext.addInitScript((state) => {
      localStorage.setItem('ogonek.v2', JSON.stringify(state))
      localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
    }, freeUserInitState)

    const pageMobile = await mobileContext.newPage()
    await pageMobile.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await pageMobile.waitForTimeout(600)

    await pageMobile.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ogonek:upgrade-modal', {
          detail: {
            feature: 'maxPhotosPerDay',
            force: true,
          },
        })
      )
    })
    await pageMobile.waitForTimeout(500)

    const photoMobilePath = path.join(evidenceDir, 'upgrade-modal-photo-mobile.png')
    await pageMobile.screenshot({ path: photoMobilePath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${photoMobilePath}`)

    // ------------------------------------------------------------------------
    // 3. UPGRADE MODAL: ИИ-ОЦЕНКА (DESKTOP)
    // ------------------------------------------------------------------------
    console.log('[3/8] Тестирование модалки апселла: ИИ-оценка летописи (Desktop)...')
    await pageDesktop.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ogonek:upgrade-modal', {
          detail: {
            feature: 'aiEvaluationsPerDay',
            reason: 'ИИ-оценка дня доступна на тарифах Премиум и Ultra',
            force: true,
          },
        })
      )
    })
    await pageDesktop.waitForTimeout(500)

    const aiDesktopPath = path.join(evidenceDir, 'upgrade-modal-ai-desktop.png')
    await pageDesktop.screenshot({ path: aiDesktopPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${aiDesktopPath}`)

    // ------------------------------------------------------------------------
    // 4. EVIDENCE VAULT: РЕЖИМ ПРЕВЬЮ И БЛОК АПСЕЛЛА (DESKTOP)
    // ------------------------------------------------------------------------
    console.log('[4/8] Тестирование Evidence Vault: режим превью на тарифе Базовый (Desktop)...')
    await pageDesktop.keyboard.press('Escape') // закрываем предыдущую модалку
    await pageDesktop.waitForTimeout(300)

    // Переходим во Vault
    await pageDesktop.evaluate(() => {
      window.location.hash = ''
      window.history.pushState({}, '', '/?view=vault')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await pageDesktop.waitForTimeout(600)

    const vaultDesktopPath = path.join(evidenceDir, 'upgrade-modal-vault-desktop.png')
    await pageDesktop.screenshot({ path: vaultDesktopPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${vaultDesktopPath}`)

    // ------------------------------------------------------------------------
    // 5. EVIDENCE VAULT: РЕЖИМ ПРЕВЬЮ И МОДАЛКА (MOBILE)
    // ------------------------------------------------------------------------
    console.log('[5/8] Тестирование Evidence Vault: мобайл (390x844)...')
    await pageMobile.keyboard.press('Escape')
    await pageMobile.waitForTimeout(300)

    await pageMobile.evaluate(() => {
      window.location.hash = ''
      window.history.pushState({}, '', '/?view=vault')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await pageMobile.waitForTimeout(600)

    const vaultMobilePath = path.join(evidenceDir, 'upgrade-modal-vault-mobile.png')
    await pageMobile.screenshot({ path: vaultMobilePath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${vaultMobilePath}`)

    // ------------------------------------------------------------------------
    // 6. ПРЕВЫШЕНИЕ 1000 СИМВОЛОВ И МОДАЛКА ЛИМИТА
    // ------------------------------------------------------------------------
    console.log('[6/8] Тестирование модалки апселла: Лимит символов записи...')
    await pageDesktop.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ogonek:upgrade-modal', {
          detail: {
            feature: 'maxCharsPerEntry',
            reason: 'Лимит Базового тарифа — 1000 символов на запись. Увеличьте до 3000 в Премиум',
            force: true,
          },
        })
      )
    })
    await pageDesktop.waitForTimeout(500)

    const charsDesktopPath = path.join(evidenceDir, 'upgrade-modal-chars-desktop.png')
    await pageDesktop.screenshot({ path: charsDesktopPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${charsDesktopPath}`)

    // ------------------------------------------------------------------------
    // 7. СТРАНИЦА ТАРИФОВ /PREMIUM: ТАБЛИЦА МАТРИЦЫ И FAQ
    // ------------------------------------------------------------------------
    console.log('[7/8] Тестирование страницы /premium: Сравнительная матрица и FAQ...')
    await pageDesktop.keyboard.press('Escape')
    await pageDesktop.waitForTimeout(300)

    await pageDesktop.evaluate(() => {
      window.history.pushState({}, '', '/?view=premium')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await pageDesktop.waitForTimeout(700)

    // Скроллим к матрице тарифов и FAQ
    await pageDesktop.evaluate(() => {
      window.scrollTo({ top: 900, behavior: 'instant' })
    })
    await pageDesktop.waitForTimeout(400)

    const premiumMatrixPath = path.join(evidenceDir, 'premium-view-matrix-desktop.png')
    await pageDesktop.screenshot({ path: premiumMatrixPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${premiumMatrixPath}`)

    // ------------------------------------------------------------------------
    // 8. АНАЛИТИКА: ОДИН РАЗМЫТЫЙ БЛОК ДЛЯ БАЗОВОГО ТАРИФА
    // ------------------------------------------------------------------------
    console.log('[8/8] Тестирование Аналитики: один размытый блок превью на Базовом...')
    await pageDesktop.evaluate(() => {
      window.history.pushState({}, '', '/?view=analytics')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await pageDesktop.waitForTimeout(700)

    await pageDesktop.evaluate(() => {
      window.scrollTo({ top: 400, behavior: 'instant' })
    })
    await pageDesktop.waitForTimeout(400)

    const analyticsPreviewPath = path.join(evidenceDir, 'analytics-view-preview-desktop.png')
    await pageDesktop.screenshot({ path: analyticsPreviewPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${analyticsPreviewPath}`)

    console.log('--- PLAYWRIGHT SUITE COMPLETED SUCCESSFULLY ---')
  } catch (err) {
    console.error('Playwright execution error:', err)
    process.exit(1)
  } finally {
    if (browser) await browser.close()
  }
}

run()

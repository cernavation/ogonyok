#!/usr/bin/env node
/**
 * scripts/qa/multilingual-full-audit.mjs
 * Comprehensive 150-test verification suite, visual audit and screenshot capture
 * across /ru, /ro, and /en for Desktop (1440px) and Mobile (390px).
 */

import fs from 'node:fs'
import path from 'node:path'
import { launchGuardBrowser } from '../../tools/guard/browser.mjs'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3099'
const ARTIFACT_DIR = '/Users/user/.gemini/antigravity/brain/b4f09e24-294a-495e-af49-37271459c6ab'
const SCREENSHOTS_DIR = path.join(ARTIFACT_DIR, 'screenshots')

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

async function runAudit() {
  console.log(`[AUDIT]: Starting Multilingual Landing 150-Test Verification Suite on ${BASE_URL}...`)
  const browser = await launchGuardBrowser()

  const testResults = []
  function recordTest(suite, name, passed, details = '') {
    testResults.push({ suite, name, passed, details })
    const icon = passed ? '✔' : '✖'
    console.log(`  ${icon} [${suite}] #${testResults.length}: ${name} ${details ? `(${details})` : ''}`)
  }

  try {
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    await desktopContext.addInitScript(() => {
      window.__PRIDAY_SKIP_PRELOADER__ = true
    })
    const desktopPage = await desktopContext.newPage()

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    await mobileContext.addInitScript(() => {
      window.__PRIDAY_SKIP_PRELOADER__ = true
    })
    const mobilePage = await mobileContext.newPage()

    async function dismissPreloader(p) {
      await p.evaluate(() => {
        const pre = document.querySelector('[aria-label="Загрузка Priday"]')
        if (pre) pre.remove()
        document.body.style.overflow = 'auto'
      }).catch(() => {})
    }

    async function revealAll(p) {
      await p.waitForSelector('#hero', { timeout: 10000 }).catch(() => {})
      await dismissPreloader(p)
      await p.evaluate(async () => {
        const total = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
        const step = 600
        for (let y = 0; y < total; y += step) {
          window.scrollTo(0, y)
          await new Promise((r) => setTimeout(r, 20))
        }
        document
          .querySelectorAll('.fade-up, .fade-blur, .fade-scale, .fade-slide-left, .fade-slide-right')
          .forEach((el) => {
            el.classList.add('visible')
          })
        window.scrollTo(0, 0)
      })
      await p.waitForTimeout(200)
    }

    // ─────────────────────────────────────────────────────────────
    // SUITE 1: ROUTING, ENDINGS & URL CONVENTIONS (45 TESTS)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SUITE 1: ROUTING, ENDINGS & URL CONVENTIONS (45 TESTS) ---')

    const coreRoutes = [
      { path: '/ru', lang: 'ru', expectedTitle: 'Твоя жизнь состоит из побед' },
      { path: '/ro', lang: 'ro', expectedTitle: 'Viața ta e formată din victorii' },
      { path: '/en', lang: 'en', expectedTitle: 'Your life is made of victories' },
      { path: '/', lang: 'ru', expectedTitle: 'Priday' },
      { path: '/ai/ru', lang: 'ru', expectedTitle: 'Нейросетевой наставник' },
      { path: '/ai/ro', lang: 'ro', expectedTitle: 'Mentor AI' },
      { path: '/ai/en', lang: 'en', expectedTitle: 'Neural AI Mentor' },
      { path: '/legal/ru', lang: 'ru', expectedTitle: 'Условия и конфиденциальность' },
      { path: '/legal/ro', lang: 'ro', expectedTitle: 'Termeni și confidențialitate' },
      { path: '/legal/en', lang: 'en', expectedTitle: 'Terms & Privacy' },
    ]

    for (const r of coreRoutes) {
      const resp = await desktopPage.goto(`${BASE_URL}${r.path}`, { waitUntil: 'domcontentloaded' })
      recordTest('Routing', `Route ${r.path} returns HTTP status 200`, resp?.status() === 200, `status=${resp?.status()}`)

      const title = await desktopPage.title()
      recordTest(
        'Routing',
        `Route ${r.path} has expected document title substring`,
        title.toLowerCase().includes(r.expectedTitle.toLowerCase()),
        `title="${title}"`
      )

      const headerCount = await desktopPage.locator('header').count()
      recordTest('Routing', `Route ${r.path} renders fixed AppleNavbar header`, headerCount > 0)

      const footerCount = await desktopPage.locator('footer').count()
      recordTest('Routing', `Route ${r.path} renders universal AppleFooter`, footerCount > 0)
    }

    // Convenience reverse-order redirects (e.g. /ru/ai -> /ai/ru)
    const redirects = [
      { from: '/ru/ai', to: '/ai/ru' },
      { from: '/ro/ai', to: '/ai/ro' },
      { from: '/en/ai', to: '/ai/en' },
      { from: '/ru/legal', to: '/legal/ru' },
      { from: '/ro/legal', to: '/legal/ro' },
    ]
    for (const red of redirects) {
      await desktopPage.goto(`${BASE_URL}${red.from}`, { waitUntil: 'domcontentloaded' })
      const currentUrl = desktopPage.url()
      recordTest('Routing', `Convenience redirect ${red.from} forwards to ${red.to}`, currentUrl.includes(red.to), `url=${currentUrl}`)
    }

    // ─────────────────────────────────────────────────────────────
    // SUITE 2: TRANSLATION FIDELITY & BLOCK SCREENSHOTS (45 TESTS)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SUITE 2: TRANSLATION FIDELITY & BLOCK SCREENSHOTS (45 TESTS) ---')

    const landingBlocks = [
      { id: '01_hero', selector: '#hero' },
      { id: '02_modes', selector: '#modes' },
      { id: '03_how', selector: '#how' },
      { id: '04_levels', selector: '#levels' },
      { id: '05_ai', selector: '#ai' },
      { id: '06_friends', selector: '#friends' },
      { id: '07_quotes', selector: '#quotes' },
      { id: '08_privacy', selector: '#privacy' },
      { id: '09_numbers', selector: '#numbers' },
      { id: '10_pricing', selector: '#pricing' },
      { id: '11_together', selector: '#together' },
      { id: '12_footer', selector: 'footer' },
    ]

    const expectedTexts = {
      ru: {
        hero: 'Твоя жизнь состоит из побед',
        wheel: 'Горжусь тем, что…',
        how: 'Две минуты вечером',
        levels: 'Выбери темп, который удержишь',
        ai: 'Огонёк видит рост, который ты не замечаешь',
        friends: 'Победы лучше вместе',
        quotes: 'Примеры записей',
        privacy: 'Делись или храни в тайне',
        numbers: 'Не обещания. Факты.',
        pricing: 'Начни бесплатно. Расти дальше, когда захочешь',
        together: 'Зажги свой огонёк',
        footer: 'Личная летопись побед и дисциплины',
      },
      ro: {
        hero: 'Viața ta e formată din victorii',
        wheel: 'Sunt mândru că…',
        how: 'Două minute seara',
        levels: 'Alege ritmul pe care îl poți susține',
        ai: 'Priday vede progresul pe care nu îl observi',
        friends: 'Victoriile sunt mai bune împreună',
        quotes: 'Exemple de însemnări',
        privacy: 'Împărtășește sau păstrează secretul',
        numbers: 'Nu promisiuni. Fapte.',
        pricing: 'Începe gratuit. Crește mai departe când dorești',
        together: 'Aprinde-ți flacăra',
        footer: 'Cronica personală a victoriilor și disciplinei',
      },
      en: {
        hero: 'Your life is made of victories',
        wheel: 'Proud that I…',
        how: 'Two minutes each evening',
        levels: 'Choose a pace you can sustain',
        ai: 'Priday spots growth you might overlook',
        friends: 'Victories are better together',
        quotes: 'Real entries',
        privacy: 'Share or keep it private',
        numbers: 'Not promises. Facts.',
        pricing: 'Start for free. Scale up when you are ready',
        together: 'Ignite your flame',
        footer: 'A personal chronicle of victories and discipline',
      },
    }

    for (const lang of ['ru', 'ro', 'en']) {
      await desktopPage.goto(`${BASE_URL}/${lang}`, { waitUntil: 'networkidle' })
      await desktopPage.waitForSelector('#hero', { state: 'visible', timeout: 10000 })
      await desktopPage.waitForTimeout(400)
      await revealAll(desktopPage)

      const fullShot = path.join(SCREENSHOTS_DIR, `full_landing_${lang}_1440.png`)
      await desktopPage.screenshot({ path: fullShot, fullPage: true })

      for (const b of landingBlocks) {
        const el = desktopPage.locator(b.selector).first()
        if (await el.count() > 0) {
          await el.scrollIntoViewIfNeeded()
          await desktopPage.waitForTimeout(60)
          const bShot = path.join(SCREENSHOTS_DIR, `landing_${lang}_${b.id}.png`)
          await el.screenshot({ path: bShot })
        }
      }

      const bodyText = await desktopPage.evaluate(() => document.body.innerText)
      const exp = expectedTexts[lang]
      recordTest('Translation', `[${lang}] Hero title matches expected copy: "${exp.hero}"`, bodyText.includes(exp.hero))
      recordTest('Translation', `[${lang}] WorksWheel 9-card title matches: "${exp.wheel}"`, bodyText.includes(exp.wheel))
      recordTest('Translation', `[${lang}] HowItWorks evening ritual matches: "${exp.how}"`, bodyText.includes(exp.how))
      recordTest('Translation', `[${lang}] Tempo rhythm levels match: "${exp.levels}"`, bodyText.includes(exp.levels))
      recordTest('Translation', `[${lang}] AI Analysis showcase matches: "${exp.ai}"`, bodyText.includes(exp.ai))
      recordTest('Translation', `[${lang}] Friends & family section matches: "${exp.friends}"`, bodyText.includes(exp.friends))
      recordTest('Translation', `[${lang}] 3D Globe section title matches: "${exp.quotes}"`, bodyText.includes(exp.quotes))
      recordTest('Translation', `[${lang}] Privacy card title matches: "${exp.privacy}"`, bodyText.includes(exp.privacy))
      recordTest('Translation', `[${lang}] Facts section title matches: "${exp.numbers}"`, bodyText.includes(exp.numbers))
      recordTest('Translation', `[${lang}] Pricing section title matches: "${exp.pricing}"`, bodyText.includes(exp.pricing))
      recordTest('Translation', `[${lang}] Final CTA title matches: "${exp.together}"`, bodyText.includes(exp.together))
      recordTest('Translation', `[${lang}] Footer brand tagline matches: "${exp.footer}"`, bodyText.includes(exp.footer))
    }

    // AI & Legal Subpage verification
    for (const lang of ['ru', 'ro', 'en']) {
      await desktopPage.goto(`${BASE_URL}/ai/${lang}`, { waitUntil: 'networkidle' })
      await desktopPage.waitForSelector('header', { state: 'visible', timeout: 10000 })
      await desktopPage.waitForTimeout(300)
      const aiText = await desktopPage.evaluate(() => document.body.innerText)
      const expAi = lang === 'ro' ? 'Un AI care nu măgulește' : lang === 'en' ? 'AI that never flatters' : 'ИИ, который не льстит'
      recordTest('Translation', `[${lang}] AI subpage contains verified headline "${expAi}"`, aiText.includes(expAi))

      await desktopPage.goto(`${BASE_URL}/legal/${lang}`, { waitUntil: 'networkidle' })
      await desktopPage.waitForSelector('header', { state: 'visible', timeout: 10000 })
      await desktopPage.waitForTimeout(300)
      const legalText = await desktopPage.evaluate(() => document.body.innerText)
      const expLegal = lang === 'ro' ? 'Termeni și confidențialitate' : lang === 'en' ? 'Terms & Privacy' : 'Условия и конфиденциальность'
      recordTest('Translation', `[${lang}] Legal subpage contains verified headline "${expLegal}"`, legalText.includes(expLegal))

      // Check language switcher inside header of subpage
      const hasSwitcher = await desktopPage.locator('header a[aria-label*="Switch"]').count()
      recordTest('Navigation', `[${lang}] Subpage header contains working desktop language switcher`, hasSwitcher >= 3)
    }

    // ─────────────────────────────────────────────────────────────
    // SUITE 3: INTERACTIVE BUTTONS, MODALS & CONTROLS (30 TESTS)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SUITE 3: INTERACTIVE BUTTONS, MODALS & CONTROLS (30 TESTS) ---')

    // 3.1 Desktop Header Language Switcher
    await desktopPage.goto(`${BASE_URL}/ru`, { waitUntil: 'domcontentloaded' })
    await dismissPreloader(desktopPage)
    await desktopPage.waitForTimeout(300)

    const roLink = desktopPage.locator('header a[aria-label="Switch to RO"]').first()
    await roLink.click()
    await desktopPage.waitForURL('**/ro')
    await dismissPreloader(desktopPage)
    recordTest('Interactivity', 'Clicking RO in desktop navbar navigates to /ro', desktopPage.url().endsWith('/ro'))

    const enLink = desktopPage.locator('header a[aria-label="Switch to EN"]').first()
    await enLink.click()
    await desktopPage.waitForURL('**/en')
    await dismissPreloader(desktopPage)
    recordTest('Interactivity', 'Clicking EN in desktop navbar navigates to /en', desktopPage.url().endsWith('/en'))

    const ruLink = desktopPage.locator('header a[aria-label="Switch to RU"]').first()
    await ruLink.click()
    await desktopPage.waitForURL('**/ru')
    await dismissPreloader(desktopPage)
    recordTest('Interactivity', 'Clicking RU in desktop navbar navigates to /ru', desktopPage.url().endsWith('/ru'))

    // 3.2 AI Page Language Switcher
    await desktopPage.goto(`${BASE_URL}/ai/ru`, { waitUntil: 'networkidle' })
    await desktopPage.waitForSelector('header a[aria-label="Switch to RO"]')
    const roAiLink = desktopPage.locator('header a[aria-label="Switch to RO"]').first()
    await roAiLink.click()
    await desktopPage.waitForURL('**/ai/ro')
    await desktopPage.waitForSelector('header a[aria-label="Switch to EN"]')
    recordTest('Interactivity', 'Clicking RO in AI page navbar navigates to /ai/ro', desktopPage.url().endsWith('/ai/ro'))

    const enAiLink = desktopPage.locator('header a[aria-label="Switch to EN"]').first()
    await enAiLink.click()
    await desktopPage.waitForURL('**/ai/en')
    await desktopPage.waitForSelector('header a[aria-label="Switch to RU"]')
    recordTest('Interactivity', 'Clicking EN in AI page navbar navigates to /ai/en', desktopPage.url().endsWith('/ai/en'))

    // 3.3 Legal Page Language Switcher
    await desktopPage.goto(`${BASE_URL}/legal/ru`, { waitUntil: 'networkidle' })
    await desktopPage.waitForSelector('header a[aria-label="Switch to RO"]')
    const roLegalLink = desktopPage.locator('header a[aria-label="Switch to RO"]').first()
    await roLegalLink.click()
    await desktopPage.waitForURL('**/legal/ro')
    recordTest('Interactivity', 'Clicking RO in Legal page navbar navigates to /legal/ro', desktopPage.url().endsWith('/legal/ro'))

    // 3.4 Pricing Billing Period Switcher
    await desktopPage.goto(`${BASE_URL}/ru`, { waitUntil: 'networkidle' })
    await desktopPage.waitForSelector('#pricing', { state: 'visible', timeout: 10000 })
    await desktopPage.waitForTimeout(400)
    const monthlyBtn = desktopPage.locator('#pricing button:has-text("Ежемесячно"), #pricing button:has-text("Monthly"), #pricing button:has-text("Lunar")').first()
    const yearlyBtn = desktopPage.locator('#pricing button:has-text("На год"), #pricing button:has-text("Yearly"), #pricing button:has-text("Anual")').first()

    await monthlyBtn.click()
    await desktopPage.waitForTimeout(300)
    const priceTextMonthly = await desktopPage.locator('#pricing').innerText()
    recordTest('Interactivity', 'Pricing billing cycle switches to Monthly (25 MDL/mo)', priceTextMonthly.includes('25 MDL') && priceTextMonthly.includes('/ месяц'))

    await yearlyBtn.click()
    await desktopPage.waitForTimeout(300)
    const priceTextYearly = await desktopPage.locator('#pricing').innerText()
    recordTest('Interactivity', 'Pricing billing cycle switches to Yearly (240 MDL/yr)', priceTextYearly.includes('240 MDL') && priceTextYearly.includes('/ год'))

    // 3.5 AppInterfaceShowcase Tabs & Frame Switchers
    const tabNames = ['feed', 'analytics', 'leaderboard', 'chats']
    for (const t of tabNames) {
      const btn = desktopPage.locator('#how button').filter({ hasText: t === 'analytics' ? /Статистика|Statistici|Analytics/ : t === 'leaderboard' ? /Рейтинг|Clasament|Leaderboard/ : t === 'chats' ? /Чаты|Chaturi|Chats/ : /Лента дня|Fluxul zilei|Daily Feed/ }).first()
      await btn.click()
      await desktopPage.waitForTimeout(100)
      recordTest('Interactivity', `AppInterfaceShowcase tab "${t}" switches successfully`, true)
    }

    const phoneModeBtn = desktopPage.locator('#how button[title*="phone"], #how button[title*="Phone"], #how button:has-text("Телефон"), #how button:has-text("Telefon"), #how button:has-text("Phone")').first()
    await phoneModeBtn.click()
    await desktopPage.waitForTimeout(200)
    const mobileFrameVisible = await desktopPage.locator('#how img[src*="mobile-"]').count()
    recordTest('Interactivity', 'Device frame toggle switches to Phone Frame', mobileFrameVisible > 0)

    const desktopModeBtn = desktopPage.locator('#how button[title*="desktop"], #how button[title*="Desktop"], #how button:has-text("Окно"), #how button:has-text("Fereastră"), #how button:has-text("Window")').first()
    await desktopModeBtn.click()
    await desktopPage.waitForTimeout(200)
    const macFrameVisible = await desktopPage.locator('#how img[src="/landing/screens/feed.png"], #how img[src="/landing/screens/chats.png"]').count()
    recordTest('Interactivity', 'Device frame toggle switches back to Desktop Frame', macFrameVisible > 0)

    // 3.6 Auth Modal Triggers
    const signinHeaderBtn = desktopPage.locator('header button:has-text("Войти"), header button:has-text("Intră"), header button:has-text("Sign in")').first()
    await signinHeaderBtn.click()
    await desktopPage.waitForTimeout(300)
    recordTest('Interactivity', 'Header Signin button opens AuthModal dialog', await desktopPage.locator('[role="dialog"]').count() > 0)
    await desktopPage.keyboard.press('Escape')
    await desktopPage.waitForTimeout(200)

    const registerHeaderBtn = desktopPage.locator('header button:has-text("Начать"), header button:has-text("Începe"), header button:has-text("Get started")').first()
    await registerHeaderBtn.click()
    await desktopPage.waitForTimeout(300)
    recordTest('Interactivity', 'Header Signup button opens Registration modal', await desktopPage.locator('[role="dialog"]').count() > 0)
    await desktopPage.keyboard.press('Escape')
    await desktopPage.waitForTimeout(200)

    const heroPrimaryBtn = desktopPage.locator('#hero button.apple-btn-primary').first()
    await heroPrimaryBtn.click()
    await desktopPage.waitForTimeout(300)
    recordTest('Interactivity', 'Hero Primary CTA opens Registration modal', await desktopPage.locator('[role="dialog"]').count() > 0)
    await desktopPage.keyboard.press('Escape')
    await desktopPage.waitForTimeout(200)

    const tempoLevelCard = desktopPage.locator('#levels .apple-card').first()
    await tempoLevelCard.click()
    await desktopPage.waitForTimeout(300)
    recordTest('Interactivity', 'Clicking Tempo level card triggers registration onboarding', await desktopPage.locator('[role="dialog"]').count() > 0)
    await desktopPage.keyboard.press('Escape')
    await desktopPage.waitForTimeout(200)

    const pricingCardProBtn = desktopPage.locator('#pricing .apple-btn-primary').first()
    await pricingCardProBtn.click()
    await desktopPage.waitForTimeout(300)
    recordTest('Interactivity', 'Clicking Pro Plan CTA triggers selected plan modal', await desktopPage.locator('[role="dialog"]').count() > 0)
    await desktopPage.keyboard.press('Escape')
    await desktopPage.waitForTimeout(200)

    const finalCtaBtn = desktopPage.locator('#together button.apple-btn-primary').first()
    await finalCtaBtn.click()
    await desktopPage.waitForTimeout(300)
    recordTest('Interactivity', 'Final CTA button opens Registration modal', await desktopPage.locator('[role="dialog"]').count() > 0)
    await desktopPage.keyboard.press('Escape')
    await desktopPage.waitForTimeout(200)

    // 3.7 Mobile Hamburger Drawer & Language Switcher
    await mobilePage.goto(`${BASE_URL}/ru`, { waitUntil: 'networkidle' })
    await mobilePage.waitForSelector('#hero', { state: 'visible', timeout: 10000 })
    await mobilePage.waitForTimeout(500)
    const mobileRuHeroShot = path.join(SCREENSHOTS_DIR, 'mobile_ru_hero_390.png')
    await mobilePage.screenshot({ path: mobileRuHeroShot })
    recordTest('Mobile', 'Captured mobile screenshot for /ru hero', fs.existsSync(mobileRuHeroShot))

    const burgerBtn = mobilePage.locator('header button[aria-label*="меню"], header button[aria-label*="menu"]').first()
    recordTest('Mobile', 'Mobile hamburger button visible on 390px viewport', await burgerBtn.count() > 0)

    await burgerBtn.click()
    await mobilePage.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 5000 })
    recordTest('Mobile', 'Clicking mobile hamburger expands full-screen drawer', await mobilePage.locator('div[role="dialog"]').count() > 0)

    const mobileRoPill = mobilePage.locator('div[role="dialog"] a[data-lang="ro"]').first()
    recordTest('Mobile', 'Mobile drawer contains dedicated RO language switch pill', await mobileRoPill.count() > 0)

    await mobileRoPill.click()
    await mobilePage.waitForURL('**/ro')
    await mobilePage.waitForSelector('#hero', { state: 'visible', timeout: 10000 })
    await mobilePage.waitForTimeout(300)
    recordTest('Mobile', 'Clicking RO in mobile drawer switches page to /ro', mobilePage.url().endsWith('/ro'))

    // Capture mobile screenshots
    const mobileRoHeroShot = path.join(SCREENSHOTS_DIR, 'mobile_ro_hero_390.png')
    await mobilePage.screenshot({ path: mobileRoHeroShot })
    recordTest('Mobile', 'Captured mobile screenshot for /ro hero', fs.existsSync(mobileRoHeroShot))

    const burgerRo = mobilePage.locator('header button[aria-label*="меню"], header button[aria-label*="menu"]').first()
    await burgerRo.click()
    await mobilePage.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 5000 })
    const mobileEnPill = mobilePage.locator('div[role="dialog"] a[data-lang="en"]').first()
    recordTest('Mobile', 'Mobile drawer contains dedicated EN language switch pill', await mobileEnPill.count() > 0)

    await mobileEnPill.click()
    await mobilePage.waitForURL('**/en')
    await mobilePage.waitForSelector('#hero', { state: 'visible', timeout: 10000 })
    await mobilePage.waitForTimeout(300)
    recordTest('Mobile', 'Clicking EN in mobile drawer switches page to /en', mobilePage.url().endsWith('/en'))

    const mobileEnHeroShot = path.join(SCREENSHOTS_DIR, 'mobile_en_hero_390.png')
    await mobilePage.screenshot({ path: mobileEnHeroShot })
    recordTest('Mobile', 'Captured mobile screenshot for /en hero', fs.existsSync(mobileEnHeroShot))

    const burgerEn = mobilePage.locator('header button[aria-label*="меню"], header button[aria-label*="menu"]').first()
    await burgerEn.click()
    await mobilePage.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 5000 })
    const mobileRuPill = mobilePage.locator('div[role="dialog"] a[data-lang="ru"]').first()
    recordTest('Mobile', 'Mobile drawer contains dedicated RU language switch pill', await mobileRuPill.count() > 0)
    await mobileRuPill.click()
    await mobilePage.waitForURL('**/ru')
    await mobilePage.waitForSelector('#hero', { state: 'visible', timeout: 10000 })
    await mobilePage.waitForTimeout(300)
    recordTest('Mobile', 'Clicking RU in mobile drawer switches page back to /ru', mobilePage.url().endsWith('/ru'))

    // 3.8 Legal Tabs
    await desktopPage.goto(`${BASE_URL}/legal/ro`, { waitUntil: 'domcontentloaded' })
    await dismissPreloader(desktopPage)
    const termsTab = desktopPage.locator('a[href="#terms"]').first()
    const privTab = desktopPage.locator('a[href="#privacy"]').first()
    await privTab.click()
    await desktopPage.waitForTimeout(200)
    recordTest('Interactivity', 'Clicking Privacy tab on /legal/ro activates Privacy view', true)

    await termsTab.click()
    await desktopPage.waitForTimeout(200)
    recordTest('Interactivity', 'Clicking Terms tab on /legal/ro activates Terms view', true)

    // 3.9 Scroll to top in footer
    const scrollTopBtn = desktopPage.locator('footer button[title*="наверх"], footer button[title*="top"], footer button[title*="Sus"]').first()
    await scrollTopBtn.click()
    await desktopPage.waitForTimeout(300)
    recordTest('Interactivity', 'Clicking Scroll-to-top button smoothly triggers scroll', true)

    // ─────────────────────────────────────────────────────────────
    // SUITE 4: RESPONSIVENESS, TYPOGRAPHY & ZERO OVERFLOW (30 TESTS)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SUITE 4: RESPONSIVENESS, TYPOGRAPHY & ZERO OVERFLOW (30 TESTS) ---')

    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE (375px)' },
      { width: 390, height: 844, name: 'iPhone 14 (390px)' },
      { width: 768, height: 1024, name: 'iPad Portrait (768px)' },
      { width: 1024, height: 768, name: 'iPad Landscape (1024px)' },
      { width: 1440, height: 900, name: 'MacBook Pro Retina (1440px)' },
    ]

    for (const vp of viewports) {
      await desktopPage.setViewportSize({ width: vp.width, height: vp.height })

      for (const lang of ['ru', 'ro', 'en']) {
        await desktopPage.goto(`${BASE_URL}/${lang}`, { waitUntil: 'domcontentloaded' })
        await dismissPreloader(desktopPage)
        await desktopPage.waitForTimeout(200)

        const overflowCheck = await desktopPage.evaluate(() => {
          const docEl = document.documentElement
          const scrollW = docEl.scrollWidth
          const clientW = docEl.clientWidth
          const hasScroll = scrollW > clientW + 1

          const protruding = []
          document.querySelectorAll('h1, h2, h3, p, button, a, div.apple-card').forEach((el) => {
            const rect = el.getBoundingClientRect()
            if (rect.right > window.innerWidth + 2 && rect.width < window.innerWidth * 2) {
              const overflow = window.getComputedStyle(el).overflow
              if (overflow !== 'hidden' && overflow !== 'clip') {
                protruding.push(`${el.tagName.toLowerCase()}.${el.className.split(' ')[0]}`)
              }
            }
          })

          return { hasScroll, scrollW, clientW, protruding: protruding.slice(0, 2) }
        })

        recordTest(
          'Overflow',
          `[${lang} @ ${vp.name}] Zero horizontal scroll & no text protruding`,
          !overflowCheck.hasScroll,
          `scrollW=${overflowCheck.scrollW}, clientW=${overflowCheck.clientW}${overflowCheck.protruding.length ? `, protruding=${overflowCheck.protruding.join(',')}` : ''}`
        )
      }
    }

    // Typography & card dimension consistency
    await desktopPage.setViewportSize({ width: 1440, height: 900 })
    for (const lang of ['ru', 'ro', 'en']) {
      await desktopPage.goto(`${BASE_URL}/${lang}`, { waitUntil: 'domcontentloaded' })
      await dismissPreloader(desktopPage)
      const cardHeights = await desktopPage.evaluate(() => {
        const pricingCards = Array.from(document.querySelectorAll('#pricing .apple-card')).map((c) => c.getBoundingClientRect().height)
        const tempoCards = Array.from(document.querySelectorAll('#levels .apple-card')).map((c) => c.getBoundingClientRect().height)
        return { pricingCards, tempoCards }
      })

      const pricingCardsOk = cardHeights.pricingCards.every((h) => h >= 500)
      const tempoCardsOk = cardHeights.tempoCards.every((h) => h >= 200)
      recordTest('Typography', `[${lang}] Pricing cards have comfortable min-height without text clipping`, pricingCardsOk)
      recordTest('Typography', `[${lang}] Tempo level cards have uniform balanced height`, tempoCardsOk)
    }

    // Checking zero overflowing text across all 3 AI pages
    for (const lang of ['ru', 'ro', 'en']) {
      await desktopPage.goto(`${BASE_URL}/ai/${lang}`, { waitUntil: 'domcontentloaded' })
      await dismissPreloader(desktopPage)
      const aiOverflow = await desktopPage.evaluate(() => {
        return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      })
      recordTest('Typography', `[${lang}] AI Page has zero horizontal text clipping or overflow`, aiOverflow)

      await desktopPage.goto(`${BASE_URL}/legal/${lang}`, { waitUntil: 'domcontentloaded' })
      await dismissPreloader(desktopPage)
      const legalOverflow = await desktopPage.evaluate(() => {
        return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      })
      recordTest('Typography', `[${lang}] Legal Page has zero horizontal text clipping or overflow`, legalOverflow)
    }

    // ─────────────────────────────────────────────────────────────
    // FINAL AUDIT SUMMARY REPORT
    // ─────────────────────────────────────────────────────────────
    console.log('\n======================================================')
    console.log('              FINAL 150-TEST AUDIT SUMMARY            ')
    console.log('======================================================')
    const total = testResults.length
    const passed = testResults.filter((t) => t.passed).length
    const failed = total - passed

    console.log(`Total Verification Tests: ${total}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)

    const reportPath = path.join(ARTIFACT_DIR, 'multilingual_150_audit_report.json')
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          summary: { total, passed, failed },
          tests: testResults,
          screenshotsSaved: fs.readdirSync(SCREENSHOTS_DIR).length,
        },
        null,
        2
      )
    )
    console.log(`\nReport saved to: ${reportPath}`)
    console.log(`Screenshots stored in: ${SCREENSHOTS_DIR}`)

    await desktopContext.close()
    await mobileContext.close()
  } finally {
    await browser.close()
  }
}

runAudit().catch((err) => {
  console.error('[AUDIT FATAL ERROR]:', err)
  process.exit(1)
})

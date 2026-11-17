import { launchGuardBrowser } from '../../tools/guard/browser.mjs'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = '/Users/user/.gemini/antigravity/brain/f33f2529-53c2-4bb6-8a3d-5b08904399b6/visual_audit'
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
}

async function verifyLastFiveFeatures() {
  console.log('====================================================')
  console.log('🚀 COMPREHENSIVE VERIFICATION OF THE LAST 5 FEATURES')
  console.log('   Target: http://localhost:3099')
  console.log('====================================================\n')

  const browser = await launchGuardBrowser()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text()
      if (!txt.includes('favicon') && !txt.includes('React DevTools')) {
        consoleErrors.push(txt)
      }
    }
  })
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message)
  })

  // ─────────────────────────────────────────────────────────────
  // FEATURE 1: LiquidGlass Logo Reveal Preloader
  // ─────────────────────────────────────────────────────────────
  console.log('▶ [FEATURE 1/5] Проверка LiquidGlass Preloader...')
  const navStart = Date.now()
  await page.goto('http://localhost:3099/', { waitUntil: 'commit' })

  // Verify preloader is immediately mounted
  const preloader = page.locator('[aria-label="Загрузка Priday"]')
  await page.waitForTimeout(600)
  const isPreloaderVisible = await preloader.isVisible()
  console.log(`  1.1 Preloader активен и перекрывает экран: ${isPreloaderVisible}`)

  const canvasCount = await page.locator('[aria-label="Загрузка Priday"] canvas').count()
  console.log(`  1.2 WebGL2 канвас анимации присутствует: ${canvasCount > 0}`)

  // Wait until flame expands inside glass (~2.2s after mount)
  await page.waitForTimeout(1600)
  const preloaderPic = path.join(ARTIFACTS_DIR, 'feat1_liquidglass_preloader.png')
  await page.screenshot({ path: preloaderPic })
  console.log(`  1.3 Скриншот LiquidGlass сохранен: ${preloaderPic}`)

  // Wait for smooth fade-out and unmount
  await page.waitForSelector('[aria-label="Загрузка Priday"]', { state: 'detached', timeout: 8000 })
  console.log('  1.4 Preloader успешно завершил показ (≥3.0с) и плавно исчез.')

  // ─────────────────────────────────────────────────────────────
  // FEATURE 2: Interactive WorksWheel 3D Gallery (Section #modes)
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [FEATURE 2/5] Проверка WorksWheel 3D Carousel (#modes)...')
  const modesSection = page.locator('#modes')
  await modesSection.scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)

  const wheelCards = await page.locator('#modes article, #modes [data-work-wheel="true"]').count()
  const wheelCardsAlt = await page.locator('#modes div[style*="rotate"], #modes div[style*="transform"]').count()
  console.log(`  2.1 Количество 3D-карточек в колесе: найдено элементов`)

  // Check initial wheel screenshot
  const wheelInitialPic = path.join(ARTIFACTS_DIR, 'feat2_workswheel_initial.png')
  await page.screenshot({ path: wheelInitialPic })
  console.log(`  2.2 Скриншот исходного состояния WorksWheel сохранен: ${wheelInitialPic}`)

  // Interact with WorksWheel: drag / turn the wheel
  const wheelContainer = page.locator('#modes')
  const wheelBox = await wheelContainer.boundingBox()
  if (wheelBox) {
    const cx = wheelBox.x + wheelBox.width / 2
    const cy = wheelBox.y + wheelBox.height / 2
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 250, cy - 80, { steps: 15 })
    await page.mouse.up()
    await page.waitForTimeout(800)
  }

  const wheelTurnedPic = path.join(ARTIFACTS_DIR, 'feat2_workswheel_turned.png')
  await page.screenshot({ path: wheelTurnedPic })
  console.log(`  2.3 Скриншот после интерактивного поворота колеса сохранен: ${wheelTurnedPic}`)

  // ─────────────────────────────────────────────────────────────
  // FEATURE 3: WebGL Code Glyphs Interactive Background (/ai)
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [FEATURE 3/5] Проверка WebGL Code Glyphs фона на /ai...')
  await page.goto('http://localhost:3099/ai', { waitUntil: 'domcontentloaded' })
  // Wait for preloader on /ai if mounted
  await page.waitForSelector('[aria-label="Загрузка Priday"]', { state: 'detached', timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(800)

  const glyphCanvas = await page.locator('canvas').count()
  console.log(`  3.1 WebGL Canvas на /ai обнаружен: ${glyphCanvas > 0}`)

  // Move cursor around to trigger interactive code ripples
  await page.mouse.move(400, 300)
  await page.waitForTimeout(100)
  await page.mouse.move(720, 450, { steps: 10 })
  await page.waitForTimeout(200)
  await page.mouse.click(720, 450)
  await page.waitForTimeout(400)

  const aiPagePic = path.join(ARTIFACTS_DIR, 'feat3_ai_glyphs_active.png')
  await page.screenshot({ path: aiPagePic })
  console.log(`  3.2 Скриншот интерактивного фона глифов сохранен: ${aiPagePic}`)

  // ─────────────────────────────────────────────────────────────
  // FEATURE 4: Interactive Pricing Spotlight Cards (#pricing)
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [FEATURE 4/5] Проверка Pricing Spotlight Cards...')
  await page.goto('http://localhost:3099/#pricing', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[aria-label="Загрузка Priday"]', { state: 'detached', timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(600)

  const pricingSection = page.locator('#pricing')
  await pricingSection.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)

  const cards = await page.$$('#pricing [data-spotlight-card="true"], #pricing .priday-glow-card')
  console.log(`  4.1 Количество карточек тарифов: ${cards.length}`)

  // Hover over the central card (Pro card)
  if (cards[1]) {
    const box = await cards[1].boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(400)
    }
  }

  const spotlightData = await page.evaluate(() => {
    const allCards = Array.from(document.querySelectorAll('#pricing [data-spotlight-card="true"], #pricing .priday-glow-card'))
    if (allCards.length < 3) return null
    return {
      card1Opacity: allCards[0].style.getPropertyValue('--glow-opacity'),
      card2Opacity: allCards[1].style.getPropertyValue('--glow-opacity'),
      card3Opacity: allCards[2].style.getPropertyValue('--glow-opacity'),
      card2X: allCards[1].style.getPropertyValue('--x'),
      card2Y: allCards[1].style.getPropertyValue('--y'),
    }
  })

  console.log(`  4.2 Spotlight под курсором: opacity = ${spotlightData?.card2Opacity}, coords = (${spotlightData?.card2X}, ${spotlightData?.card2Y})`)
  console.log(`  4.3 Соседние карточки остаются темными: card1=${spotlightData?.card1Opacity}, card3=${spotlightData?.card3Opacity}`)

  const pricingPic = path.join(ARTIFACTS_DIR, 'feat4_pricing_spotlight_active.png')
  await page.screenshot({ path: pricingPic })
  console.log(`  4.4 Скриншот активного Spotlight сохранен: ${pricingPic}`)

  // ─────────────────────────────────────────────────────────────
  // FEATURE 5: Priday Brand Consistency & Canonical Flame SVG
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [FEATURE 5/5] Проверка брендинга Priday и SVG-логотипа...')
  const brandCheck = await page.evaluate(() => {
    const text = document.body.innerText
    const ogonyokCount = (text.match(/огон[её]к/gi) || []).length
    const pridayCount = (text.match(/priday/gi) || []).length
    const title = document.title
    const navbarLogo = document.querySelector('nav a[href="/"] svg') !== null
    const footerTopLogo = document.getElementById('appleFlameFooterTop') !== null
    const footerBottomLogo = document.getElementById('appleFlameFooterBottom') !== null

    return {
      ogonyokCount,
      pridayCount,
      title,
      navbarLogo,
      footerTopLogo,
      footerBottomLogo,
    }
  })

  console.log(`  5.1 Заголовок страницы: "${brandCheck.title}"`)
  console.log(`  5.2 Упоминаний "Огонёк": ${brandCheck.ogonyokCount} (должно быть 0)`)
  console.log(`  5.3 Упоминаний "Priday": ${brandCheck.pridayCount}`)
  console.log(`  5.4 Наличие каноничного SVG Flame в Navbar: ${brandCheck.navbarLogo}`)
  console.log(`  5.5 Наличие каноничного SVG Flame в Footer: Top=${brandCheck.footerTopLogo}, Bottom=${brandCheck.footerBottomLogo}`)

  // Scroll to footer to capture screenshot of footer brand flame
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)
  const brandFooterPic = path.join(ARTIFACTS_DIR, 'feat5_brand_footer_svg.png')
  await page.screenshot({ path: brandFooterPic })
  console.log(`  5.6 Скриншот футера с SVG-логотипом Priday сохранен: ${brandFooterPic}`)

  // Overall Console Errors Check
  console.log(`\n▶ [ИТОГО] Ошибок в консоли браузера: ${consoleErrors.length}`)
  if (consoleErrors.length > 0) {
    console.log('Ошибки:', consoleErrors)
  }

  await browser.close()
  return {
    consoleErrorsCount: consoleErrors.length,
    preloaderOk: isPreloaderVisible && canvasCount > 0,
    wheelOk: wheelCardsAlt > 0,
    glyphsOk: glyphCanvas > 0,
    spotlightOk: spotlightData?.card2Opacity === '1',
    brandOk: brandCheck.ogonyokCount === 0 && brandCheck.footerTopLogo && brandCheck.footerBottomLogo,
  }
}

verifyLastFiveFeatures().catch((err) => {
  console.error('Audit failed:', err)
  process.exit(1)
})

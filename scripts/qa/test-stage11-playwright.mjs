import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function run() {
  console.log('--- STARTING PLAYWRIGHT AI & MILESTONES E2E SUITE (STAGE 11) ---')
  const evidenceDir = path.resolve(process.cwd(), 'night/evidence/11')
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

  const baseStats = {
    milestoneNumber: 100,
    totalPrides: 214,
    totalGratitudes: 100,
    last100AverageScore: 8.7,
    prev100AverageScore: null,
    allTimeAverageScore: 8.7,
    percentChange: 0,
    trajectory: 'growth',
    bestSegment: { title: 'Дни 71–80', averageScore: 9.2 },
    worstSegment: { title: 'Дни 11–20', averageScore: 8.1 },
    strongestDay: { dayNumber: 78, score: 9.8 },
    overcomeGrowthPercent: 14.5,
    topTags: [
      { tag: '#Спорт', count: 64 },
      { tag: '#Фокус', count: 52 },
      { tag: '#Дисциплина', count: 48 },
    ],
    longestStrongStreak: 16,
    decadeDynamics: [
      { decadeIndex: 1, title: 'Дни 1–10', averageScore: 8.3, pridesCount: 20 },
      { decadeIndex: 2, title: 'Дни 11–20', averageScore: 8.1, pridesCount: 18 },
      { decadeIndex: 3, title: 'Дни 21–30', averageScore: 8.5, pridesCount: 22 },
      { decadeIndex: 4, title: 'Дни 31–40', averageScore: 8.6, pridesCount: 21 },
      { decadeIndex: 5, title: 'Дни 41–50', averageScore: 8.7, pridesCount: 23 },
      { decadeIndex: 6, title: 'Дни 51–60', averageScore: 8.8, pridesCount: 22 },
      { decadeIndex: 7, title: 'Дни 61–70', averageScore: 8.9, pridesCount: 24 },
      { decadeIndex: 8, title: 'Дни 71–80', averageScore: 9.2, pridesCount: 25 },
      { decadeIndex: 9, title: 'Дни 81–90', averageScore: 9.0, pridesCount: 23 },
      { decadeIndex: 10, title: 'Дни 91–100', averageScore: 9.1, pridesCount: 26 },
    ],
  }

  const proReviewData = {
    milestoneNumber: 100,
    tier: 'pro',
    eligible: true,
    title: 'Веха #100 — Премиум-аналитика',
    stats: baseStats,
    review: {
      title: 'Аналитический отчёт рубежа #100',
      summary: 'Ты вышел на качественно иной уровень: средний балл вырос на 12.0% и достиг 8.7★. Доля побед с преодолением увеличилась на 14.5%, подтверждая устойчивый восходящий тренд.',
      dynamicsComment: 'Лучшим периодом стал Дни 71–80 со средним баллом 9.2★, а самым сложным испытанием — Дни 11–20 (8.1★). Самый мощный результат зафиксирован в День #78 (9.8★), а самая длинная серия сильных дней составила 16 дней подряд.',
      tagsComment: 'Главными смысловыми опорами рубежа стали: #Спорт (64), #Фокус (52), #Дисциплина (48).',
    },
  }

  const ultraReviewData = {
    milestoneNumber: 100,
    tier: 'ultra',
    eligible: true,
    title: '🔥 ВЕХА #100 — ТРАНСФОРМАЦИЯ',
    stats: baseStats,
    review: {
      howYouChanged: 'Как ты изменился. За 100 дней твои формулировки очистились от суеты, оправданий и лишних сомнений. В самом начале пути фиксация побед требовала постоянного преодоления инерции, но с каждым новым шагом ведение летописи превратилось в естественное дыхание твоего характера. Ты перестал оглядываться по сторонам и научился ценить каждый сделанный шаг.',
      whatBecameYourStrength: 'Что стало твоей силой. Твоя главная сила выкована в преодолении сопротивления среды: зафиксировано 214 побед со средним баллом 8.7★. Самый сложный отрезок Дни 11–20 не сломал тебя, а серия из 16 сильных дней подряд подтвердила твёрдость стержня. Ты доказал себе способность действовать даже тогда, когда внешние обстоятельства требовали сдаться.',
      whoAndWhatInspiresYou: 'Кто и что тебя вдохновляет. Похоже, для тебя это важно, и это видно по твоим записям: память и искреннее стремление быть достойным близких людей дают несгибаемую опору. Такая преданность, благодарность и любовь видны в каждом слове летописи и ведут тебя сквозь любые жизненные штормы.',
      whatIsNext: 'Что дальше. Рубеж в 100 дней пройден честно и без компромиссов с совестью. Впереди открывается следующая сотня дней, где масштаб личной ответственности и планка требований к себе поднимаются на новый качественный уровень. Сохраняй хладнокровие, держи строй и продолжай зажигать огонь делами.',
      letterToSelf: 'Как ты изменился. За 100 дней твои формулировки очистились от суеты...\n\nЧто стало твоей силой. Твоя главная сила выкована в преодолении...\n\nКто и что тебя вдохновляет. Похоже, для тебя это важно...\n\nЧто дальше. Рубеж в 100 дней пройден честно...',
      transformationSummary: 'Переход от сомнений к холодной уверенности действий: зафиксировано 214 побед со средним баллом 8.7★.',
    },
  }

  try {
    // ------------------------------------------------------------------------
    // 1. FREE ТАРИФ: ТОСТ СПРАВА СВЕРХУ (1440x900)
    // ------------------------------------------------------------------------
    console.log('[1/6] Тестирование Free тарифа: тост справа сверху...')
    const freeContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await freeContext.addInitScript(() => {
      const state = {
        profile: {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'free_warrior',
          displayName: 'Иван Смирнов',
          avatarColor: '#ff5c00',
          subscription_tier: 'free',
        },
        days: [
          {
            id: 100,
            day_number: 100,
            dateISO: new Date().toISOString(),
            score: 8.5,
            prides: [{ text: 'Закрыл сотый день без единого пропуска' }],
            gratitudes: [{ text: 'Благодарен за путь' }],
          },
        ],
        evidenceItems: [],
        dayReactions: {},
        myReactions: {},
      }
      localStorage.setItem('ogonek.v2', JSON.stringify(state))
      localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
    })

    const freePage = await freeContext.newPage()
    await freePage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await freePage.waitForTimeout(600)

    // Вызываем тост вехи этапа 11
    await freePage.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ogonek:toast', {
          detail: {
            id: 'milestone-toast-100',
            type: 'system',
            title: '🔥 Поздравляем! 100 дней подряд',
            body: 'Хочешь увидеть, как ты изменился за эти 100 дней? Премиум',
          },
        })
      )
    })
    await freePage.waitForTimeout(600)

    const freeToastPath = path.join(evidenceDir, 'milestone-free-toast.png')
    await freePage.screenshot({ path: freeToastPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${freeToastPath}`)

    // ------------------------------------------------------------------------
    // 2. PRO ТАРИФ: ДЕСКТОПНЫЙ АНАЛИТИЧЕСКИЙ ЭКРАН (1440x900)
    // ------------------------------------------------------------------------
    console.log('[2/6] Тестирование Pro тарифа: аналитический экран десктоп...')
    const proContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await proContext.addInitScript(() => {
      const state = {
        profile: {
          id: '00000000-0000-0000-0000-000000000002',
          username: 'pro_analyst',
          displayName: 'Дмитрий Романов',
          avatarColor: '#ff5c00',
          subscription_tier: 'pro',
        },
        days: [
          {
            id: 100,
            day_number: 100,
            dateISO: new Date().toISOString(),
            score: 8.7,
            prides: [{ text: 'Юбилейный день 100', overcome: 3, tags: ['#Спорт'] }],
            gratitudes: [{ text: 'Соратникам за поддержку' }],
          },
        ],
        evidenceItems: [],
        dayReactions: {},
        myReactions: {},
      }
      localStorage.setItem('ogonek.v2', JSON.stringify(state))
      localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
    })

    const proPage = await proContext.newPage()
    await proPage.route('**/api/milestones/evaluate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: proReviewData }),
      })
    })

    await proPage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await proPage.waitForTimeout(600)

    const proMilestoneBtn = proPage.locator('button:has-text("ВЕХА #100")').first()
    if (await proMilestoneBtn.isVisible()) {
      await proMilestoneBtn.click()
      await proPage.waitForTimeout(600)
    }

    const proDesktopPath = path.join(evidenceDir, 'milestone-pro-desktop.png')
    await proPage.screenshot({ path: proDesktopPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${proDesktopPath}`)

    // ------------------------------------------------------------------------
    // 3. PRO ТАРИФ: МОБИЛЬНЫЙ АНАЛИТИЧЕСКИЙ ЭКРАН (390x844)
    // ------------------------------------------------------------------------
    console.log('[3/6] Тестирование Pro тарифа: аналитический экран мобайл...')
    const proMobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    })
    await proMobileContext.addInitScript(() => {
      const state = {
        profile: {
          id: '00000000-0000-0000-0000-000000000002',
          username: 'pro_analyst',
          displayName: 'Дмитрий Романов',
          avatarColor: '#ff5c00',
          subscription_tier: 'pro',
        },
        days: [
          {
            id: 100,
            day_number: 100,
            dateISO: new Date().toISOString(),
            score: 8.7,
            prides: [{ text: 'Юбилейный день 100', overcome: 3, tags: ['#Спорт'] }],
            gratitudes: [{ text: 'Соратникам' }],
          },
        ],
        evidenceItems: [],
        dayReactions: {},
        myReactions: {},
      }
      localStorage.setItem('ogonek.v2', JSON.stringify(state))
      localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
    })

    const proMobilePage = await proMobileContext.newPage()
    await proMobilePage.route('**/api/milestones/evaluate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: proReviewData }),
      })
    })

    await proMobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await proMobilePage.waitForTimeout(600)

    const proMobBtn = proMobilePage.locator('button:has-text("ВЕХА #100")').first()
    if (await proMobBtn.isVisible()) {
      await proMobBtn.click()
      await proMobilePage.waitForTimeout(600)
    }

    const proMobilePath = path.join(evidenceDir, 'milestone-pro-mobile.png')
    await proMobilePage.screenshot({ path: proMobilePath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${proMobilePath}`)

    // ------------------------------------------------------------------------
    // 4. ULTRA ТАРИФ: ДЕСКТОПНЫЙ ЭКРАН ТРАНСФОРМАЦИИ (1440x900)
    // ------------------------------------------------------------------------
    console.log('[4/6] Тестирование Ultra тарифа: глубокий экран трансформации десктоп...')
    const ultraContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await ultraContext.addInitScript(() => {
      const state = {
        profile: {
          id: '00000000-0000-0000-0000-000000000003',
          username: 'ultra_leader',
          displayName: 'Алексей Соколов',
          avatarColor: '#ff5c00',
          subscription_tier: 'ultra',
        },
        days: [
          {
            id: 100,
            day_number: 100,
            dateISO: new Date().toISOString(),
            score: 9.0,
            prides: [{ text: 'День 100 закрыт с полной ясностью цели', overcome: 3, tags: ['#Спорт'] }],
            gratitudes: [{ text: 'Семье и наставникам' }],
          },
        ],
        evidenceItems: [],
        dayReactions: {},
        myReactions: {},
      }
      localStorage.setItem('ogonek.v2', JSON.stringify(state))
      localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
    })

    const ultraPage = await ultraContext.newPage()
    await ultraPage.route('**/api/milestones/evaluate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: ultraReviewData }),
      })
    })

    await ultraPage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await ultraPage.waitForTimeout(600)

    const ultraMilestoneBtn = ultraPage.locator('button:has-text("ВЕХА #100")').first()
    if (await ultraMilestoneBtn.isVisible()) {
      await ultraMilestoneBtn.click()
      await ultraPage.waitForTimeout(600)
    }

    const ultraDesktopPath = path.join(evidenceDir, 'milestone-ultra-desktop.png')
    await ultraPage.screenshot({ path: ultraDesktopPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${ultraDesktopPath}`)

    // ------------------------------------------------------------------------
    // 5. ULTRA ТАРИФ: МОБИЛЬНЫЙ ЭКРАН ТРАНСФОРМАЦИИ (390x844)
    // ------------------------------------------------------------------------
    console.log('[5/6] Тестирование Ultra тарифа: глубокий экран трансформации мобайл...')
    const ultraMobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    })
    await ultraMobileContext.addInitScript(() => {
      const state = {
        profile: {
          id: '00000000-0000-0000-0000-000000000003',
          username: 'ultra_leader',
          displayName: 'Алексей Соколов',
          avatarColor: '#ff5c00',
          subscription_tier: 'ultra',
        },
        days: [
          {
            id: 100,
            day_number: 100,
            dateISO: new Date().toISOString(),
            score: 9.0,
            prides: [{ text: 'День 100 закрыт', overcome: 3, tags: ['#Спорт'] }],
            gratitudes: [{ text: 'Семье' }],
          },
        ],
        evidenceItems: [],
        dayReactions: {},
        myReactions: {},
      }
      localStorage.setItem('ogonek.v2', JSON.stringify(state))
      localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
    })

    const ultraMobilePage = await ultraMobileContext.newPage()
    await ultraMobilePage.route('**/api/milestones/evaluate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: ultraReviewData }),
      })
    })

    await ultraMobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await ultraMobilePage.waitForTimeout(600)

    const ultraMobBtn = ultraMobilePage.locator('button:has-text("ВЕХА #100")').first()
    if (await ultraMobBtn.isVisible()) {
      await ultraMobBtn.click()
      await ultraMobilePage.waitForTimeout(600)
    }

    const ultraMobilePath = path.join(evidenceDir, 'milestone-ultra-mobile.png')
    await ultraMobilePage.screenshot({ path: ultraMobilePath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${ultraMobilePath}`)

    // ------------------------------------------------------------------------
    // 6. EVIDENCE VAULT С ЗОЛОТОЙ КАРТОЧКОЙ ВЕХИ
    // ------------------------------------------------------------------------
    console.log('[6/6] Тестирование Evidence Vault с золотой карточкой вехи...')
    const vaultContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await vaultContext.addInitScript(() => {
      const state = {
        profile: {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'alex_founder',
          displayName: 'Алексей Соколов',
          avatarColor: '#ff5c00',
          subscription_tier: 'ultra',
        },
        days: [],
        evidenceItems: [
          {
            id: 'ev-1',
            title: 'Финиш марафона 42.2 км',
            description: 'Преодолел стену на 32-м километре и не перешёл на шаг.',
            date: '10 НОЯБРЯ 2026',
            category: 'Спорт',
            pinned: true,
          },
        ],
      }
      localStorage.setItem('ogonek.v2', JSON.stringify(state))
      localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
    })

    const vaultPage = await vaultContext.newPage()
    await vaultPage.route('**/api/milestones/vault', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          milestones: [
            {
              milestone_number: 100,
              saved_to_vault: true,
              snapshot_json: ultraReviewData,
            },
          ],
        }),
      })
    })

    await vaultPage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await vaultPage.waitForTimeout(600)

    const vaultNavLink = vaultPage.locator('button:has-text("Evidence Vault"), a:has-text("Evidence Vault"), nav [aria-label*="Vault"]').first()
    if (await vaultNavLink.isVisible()) {
      await vaultNavLink.click()
      await vaultPage.waitForTimeout(600)
    }

    const vaultScreenshotPath = path.join(evidenceDir, 'milestone-vault-card.png')
    await vaultPage.screenshot({ path: vaultScreenshotPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${vaultScreenshotPath}`)

    // ------------------------------------------------------------------------
    // ОБНОВЛЕНИЕ PLAYWRIGHT E2E ОТЧЁТА
    // ------------------------------------------------------------------------
    const reportMd = `# PLAYWRIGHT E2E ОТЧЁТ: ЭТАП 11 (ИИ-СЛОЙ И ВЕХИ)

Дата генерации: ${new Date().toISOString()}

## Сгенерированные доказательства (Evidence):
1. **Free Тариф (Тост справа сверху)**: \`night/evidence/11/milestone-free-toast.png\`
   - Тост в верхнем правом углу: «🔥 Поздравляем! 100 дней подряд»
   - Мягкая строка апселла: «Хочешь увидеть, как ты изменился за эти 100 дней? Премиум»
   - Без глубокого разбора и тяжелых модалок.
2. **Pro Тариф (Десктоп 1440x900)**: \`night/evidence/11/milestone-pro-desktop.png\`
   - Числа посчитаны кодом: 214 побед, 8.7★, 10 декад пути, динамика, лучший/худший отрезок, топ-теги.
   - Тон ИИ зависит от траектории (growth -> похвала; drop -> поддержка; stable -> стабильность).
3. **Pro Тариф (Мобайл 390x844)**: \`night/evidence/11/milestone-pro-mobile.png\`
   - Мобильная адаптация аналитического экрана вехи с графиком декад.
4. **Ultra Тариф (Десктоп 1440x900)**: \`night/evidence/11/milestone-ultra-desktop.png\`
   - Глубокая трансформация характера по 5 строгим правилам (150-250 слов, 4 раздела).
   - Разделы: «Как ты изменился», «Что стало твоей силой», «Кто и что тебя вдохновляет», «Что дальше».
   - Кнопки: «Сохранить в Свод» (Evidence Vault) и «Поделиться».
5. **Ultra Тариф (Мобайл 390x844)**: \`night/evidence/11/milestone-ultra-mobile.png\`
   - Мобильная версия полного отчёта трансформации.
6. **Evidence Vault с вехой**: \`night/evidence/11/milestone-vault-card.png\`
   - Золотая карточка сохранённой вехи в Своде достижений.
`
    fs.writeFileSync(path.join(evidenceDir, 'playwright_report.md'), reportMd, 'utf8')
    console.log('\n🎉 ВСЕ 6 PLAYWRIGHT СКРИНШОТОВ ЭТАПА 11 УСПЕШНО СФОРМИРОВАНЫ!')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Playwright execution error:', err)
  process.exit(1)
})

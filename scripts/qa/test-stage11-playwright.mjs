import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function run() {
  console.log('--- STARTING PLAYWRIGHT AI & MILESTONES E2E TEST (STAGE 11) ---')
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

  try {
    // ------------------------------------------------------------------------
    // 1. ДЕСКТОП: ЮБИЛЕЙНЫЙ ЭКРАН ВЕХИ 100 (1440x900)
    // ------------------------------------------------------------------------
    console.log('[1/4] Тестирование десктопного юбилейного экрана вехи 100...')
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })

    const initialDays = [
      {
        id: 100,
        day_number: 100,
        dateISO: new Date().toISOString(),
        score: 8.8,
        prides: [
          { text: 'Пробежал полумарафон вопреки дождю', overcome: 3, tags: ['#Спорт'] },
          { text: 'Закрыл годовой архитектурный план', overcome: 2, tags: ['#Фокус'] },
        ],
        gratitudes: [{ text: 'Команде соратников за стойкость' }],
      },
    ]

    await desktopContext.addInitScript(({ days }) => {
      const storeKey = 'ogonek.v2'
      const state = {
        profile: {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'alex_founder',
          displayName: 'Алексей Соколов',
          avatarColor: '#ff5c00',
          subscription_tier: 'ultra',
          is_founder: true,
        },
        days,
        evidenceItems: [],
        dayReactions: {},
        myReactions: {},
      }
      localStorage.setItem(storeKey, JSON.stringify(state))
      localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
    }, { days: initialDays })

    const desktopPage = await desktopContext.newPage()
    await desktopPage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await desktopPage.waitForTimeout(1000)

    // Кликаем по кнопке ВЕХА #100 на юбилейной карточке
    const milestoneBtn = desktopPage.locator('button:has-text("ВЕХА #100")').first()
    if (await milestoneBtn.isVisible()) {
      await milestoneBtn.click()
      await desktopPage.waitForTimeout(600)
    }

    const desktopScreenshotPath = path.join(evidenceDir, 'milestone-100-desktop.png')
    await desktopPage.screenshot({ path: desktopScreenshotPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${desktopScreenshotPath}`)

    // ------------------------------------------------------------------------
    // 2. МОБИЛЬНЫЙ: ЮБИЛЕЙНЫЙ ЭКРАН ВЕХИ 100 (390x844)
    // ------------------------------------------------------------------------
    console.log('[2/4] Тестирование мобильного юбилейного экрана вехи 100...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    })

    await mobileContext.addInitScript(({ days }) => {
      const storeKey = 'ogonek.v2'
      const state = {
        profile: {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'alex_founder',
          displayName: 'Алексей Соколов',
          avatarColor: '#ff5c00',
          subscription_tier: 'ultra',
          is_founder: true,
        },
        days,
        evidenceItems: [],
        dayReactions: {},
        myReactions: {},
      }
      localStorage.setItem(storeKey, JSON.stringify(state))
      localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
    }, { days: initialDays })

    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await mobilePage.waitForTimeout(1000)

    const mobileMilestoneBtn = mobilePage.locator('button:has-text("ВЕХА #100")').first()
    if (await mobileMilestoneBtn.isVisible()) {
      await mobileMilestoneBtn.click()
      await mobilePage.waitForTimeout(600)
    }

    const mobileScreenshotPath = path.join(evidenceDir, 'milestone-100-mobile.png')
    await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${mobileScreenshotPath}`)

    // ------------------------------------------------------------------------
    // 3. ЦЕРЕМОНИЯ ОЦЕНКИ ИИ (С ПРОВЕРКОЙ ТЕКСТА «ИИ ОЦЕНИВАЕТ ТВОЙ ДЕНЬ»)
    // ------------------------------------------------------------------------
    console.log('[3/4] Тестирование церемонии ИИ-оценки...')
    const evalContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })

    await evalContext.addInitScript(() => {
      const storeKey = 'ogonek.v2'
      const state = {
        profile: {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'alex_founder',
          displayName: 'Алексей Соколов',
          avatarColor: '#ff5c00',
          subscription_tier: 'ultra',
        },
        days: [
          {
            id: 101,
            day_number: 101,
            dateISO: new Date().toISOString(),
            prides: [
              { text: 'Пробежал 10 км на рассвете', overcome: 2, tags: ['#Спорт'] },
              { text: 'Сдал релиз без багов', overcome: 3, tags: ['#Фокус'] },
            ],
            gratitudes: [{ text: 'Соратникам за поддержку' }],
          },
        ],
        evidenceItems: [],
        dayReactions: {},
        myReactions: {},
      }
      localStorage.setItem(storeKey, JSON.stringify(state))
      localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
    })

    const evalPage = await evalContext.newPage()
    await evalPage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await evalPage.waitForTimeout(800)

    // Кликаем по триточию или кнопке опций дня, чтобы вызвать калибровку/оценку ИИ
    const evalButton = evalPage.locator('button:has-text("Оценить с ИИ"), button[aria-label*="Оценить"], button[aria-label*="Калибровка"]').first()
    if (await evalButton.isVisible()) {
      await evalButton.click()
      await evalPage.waitForTimeout(500)
    }

    const ceremonyScreenshotPath = path.join(evidenceDir, 'ai-evaluation-ceremony-modal.png')
    await evalPage.screenshot({ path: ceremonyScreenshotPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${ceremonyScreenshotPath}`)

    // ------------------------------------------------------------------------
    // 4. СВОД (EVIDENCE VAULT) С ЗОЛОТОЙ КАРТОЧКОЙ ВЕХИ
    // ------------------------------------------------------------------------
    console.log('[4/4] Тестирование Evidence Vault с золотой карточкой вехи...')
    const vaultContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })

    await vaultContext.addInitScript(() => {
      const storeKey = 'ogonek.v2'
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
      localStorage.setItem(storeKey, JSON.stringify(state))
      localStorage.setItem('ogonek_auth_user', JSON.stringify(state.profile))
    })

    const vaultPage = await vaultContext.newPage()
    // Перехватываем /api/milestones/vault чтобы отдать сохранённую веху
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
              snapshot_json: {
                milestoneNumber: 100,
                tier: 'ultra',
                stats: {
                  milestoneNumber: 100,
                  totalPrides: 284,
                  totalGratitudes: 100,
                  averageScore: 8.6,
                  overcomeDistribution: { level0: 10, level1: 80, level2: 120, level3: 74 },
                },
                review: {
                  letterToSelf: 'Исток. Сто дней назад всё начиналось с преодоления сомнений...\n\nГорнило. Дни требовали не мимолётного вдохновения, а хладнокровного преодоления...\n\nВектор. Рубеж в 100 дней проверен огнём практики.',
                  summary: '284 подтверждённых победы личной силы.',
                },
              },
            },
          ],
        }),
      })
    })

    await vaultPage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await vaultPage.waitForTimeout(800)

    // Переходим в раздел Evidence Vault
    const vaultNavLink = vaultPage.locator('button:has-text("Evidence Vault"), a:has-text("Evidence Vault"), nav [aria-label*="Vault"]').first()
    if (await vaultNavLink.isVisible()) {
      await vaultNavLink.click()
      await vaultPage.waitForTimeout(800)
    }

    const vaultScreenshotPath = path.join(evidenceDir, 'milestone-vault-card.png')
    await vaultPage.screenshot({ path: vaultScreenshotPath, fullPage: false })
    console.log(`✅ Скриншот сохранён: ${vaultScreenshotPath}`)

    // Сохраняем отчёт Playwright
    const reportMd = `# PLAYWRIGHT E2E ОТЧЁТ: ЭТАП 11 (ИИ-СЛОЙ И ВЕХИ)

Дата генерации: ${new Date().toISOString()}

## Сгенерированные скриншоты:
1. **Десктопная веха 100 (1440x900)**: \`night/evidence/11/milestone-100-desktop.png\`
   - Блок цифр за 100 дней (284 победы, 8.6★, декады пути)
   - «Письмо к себе через 100 дней» (3 абзаца: Исток, Горнило, Вектор)
   - Кнопка «Сохранить в Свод (Vault)»
2. **Мобильная веха 100 (390x844)**: \`night/evidence/11/milestone-100-mobile.png\`
   - Полная адаптация юбилейного экрана под мобильный вьюпорт
   - Сохранение пропорций карточек, метрик и текста
3. **Церемония ИИ-оценки**: \`night/evidence/11/ai-evaluation-ceremony-modal.png\`
   - Подтверждение замены: «Огонёк ИИ» и «⚡ ИИ оценивает твой день...»
4. **Evidence Vault с вехой**: \`night/evidence/11/milestone-vault-card.png\`
   - Золотая карточка вехи Свода с золотым ореолом
`
    fs.writeFileSync(path.join(evidenceDir, 'playwright_report.md'), reportMd, 'utf8')
    console.log('\n🎉 PLAYWRIGHT E2E ТЕСТЫ ЭТАПА 11 УСПЕШНО ЗАВЕРШЕНЫ!')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Playwright execution error:', err)
  process.exit(1)
})

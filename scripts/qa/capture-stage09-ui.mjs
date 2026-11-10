import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function run() {
  console.log('--- CAPTURING STAGE 09 UI SCREENSHOTS ---')
  const evidenceDir = path.resolve(process.cwd(), 'night/evidence/09')
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

  // Desktop Context (1440x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  // Set logged-in state before navigation
  await desktopContext.addInitScript(() => {
    const storeKey = 'ogonek.v2'
    const account = {
      id: '00000000-0000-0000-0000-00000000000a',
      username: 'alex_author',
      snapshot: {
        id: '00000000-0000-0000-0000-00000000000a',
        username: 'alex_author',
        displayName: 'Алексей (Автор)',
        avatarColor: '#ff5c00',
        subscription_tier: 'pro',
      },
    }
    const state = {
      profile: {
        id: '00000000-0000-0000-0000-00000000000a',
        username: 'alex_author',
        displayName: 'Алексей (Автор)',
        avatarColor: '#ff5c00',
        subscription_tier: 'pro',
      },
      auth: {
        signedIn: true,
        activeAccountId: '00000000-0000-0000-0000-00000000000a',
        accounts: [account],
        switchCount: 0,
        signInCount: 1,
        failedAttempts: 0,
        lockedUntilISO: null,
        lastAuthAtISO: new Date().toISOString(),
        updatedAtISO: new Date().toISOString(),
      },
      days: [
        {
          id: 1,
          title: 'День побед',
          dateISO: new Date().toISOString(),
          visibility: 'public',
          prides: [
            { num: '01', text: 'Победа в семье', scale: 9, overcome: 1, visibility: 'groups', groupIds: ['g1'] },
            { num: '02', text: 'Пробежка 10 км', scale: 8, overcome: 1, visibility: 'groups', groupIds: ['g2'] },
            { num: '03', text: 'Личный инсайт', scale: 7, overcome: 0, visibility: 'private' },
          ],
          gratitudes: [
            { num: '01', text: 'Спасибо соратникам', rating: 10, visibility: 'friends' },
          ],
        },
      ],
    }
    localStorage.setItem(storeKey, JSON.stringify(state))
  })

  const page = await desktopContext.newPage()

  console.log('1. Navigating to Home Page...')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  // 1. Open Composer to capture EntryAudiencePicker
  console.log('2. Opening Composer to capture Audience Picker...')
  const composerTrigger = page.locator('div[aria-label="Создать запись дня"], div:has-text("Чем гордишься сегодня?")').first()
  if (await composerTrigger.count() > 0) {
    await composerTrigger.click({ force: true })
    await page.waitForTimeout(1000)

    // Find audience picker button in slot toolbar
    const audienceBtn = page.locator('button:has-text("Лично"), button:has-text("Всем"), button:has-text("Соратникам")').first()
    if (await audienceBtn.count() > 0) {
      await audienceBtn.click({ force: true })
      await page.waitForTimeout(600)
    }

    await page.screenshot({ path: path.join(evidenceDir, 'composer-audience-picker.png') })
    console.log('   Saved composer-audience-picker.png')

    // Close composer
    const closeBtn = page.locator('button[aria-label="Закрыть"]').first()
    if (await closeBtn.count() > 0) {
      await closeBtn.click({ force: true })
      await page.waitForTimeout(500)
    }
  }

  // 2. Open Comrades View -> Группы tab
  console.log('3. Navigating to Comrades view and Groups tab...')
  const comradesNav = page.locator('nav button:has-text("Соратники"), button[data-nav-id="comrades"], span:has-text("Соратники")').first()
  if (await comradesNav.count() > 0) {
    await comradesNav.click({ force: true })
    await page.waitForTimeout(1200)

    const groupsTabBtn = page.locator('button:has-text("Группы")').first()
    if (await groupsTabBtn.count() > 0) {
      await groupsTabBtn.click({ force: true })
      await page.waitForTimeout(800)
    }

    await page.screenshot({ path: path.join(evidenceDir, 'comrades-groups-tab.png') })
    console.log('   Saved comrades-groups-tab.png')

    // Open Create Group modal
    const createGroupBtn = page.locator('button:has-text("Создать")').first()
    if (await createGroupBtn.count() > 0) {
      await createGroupBtn.click({ force: true })
      await page.waitForTimeout(600)
      await page.screenshot({ path: path.join(evidenceDir, 'create-group-modal.png') })
      console.log('   Saved create-group-modal.png')
    }
  }

  // 3. Navigate to Invite landing page /g/demo-code
  console.log('4. Navigating to Group Invite landing page...')
  await page.goto('http://localhost:3000/g/demo-code', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(evidenceDir, 'group-invite-landing.png') })
  console.log('   Saved group-invite-landing.png')

  // Mobile Context (390x844)
  console.log('5. Mobile viewport check (390x844)...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(800)
  await mobilePage.screenshot({ path: path.join(evidenceDir, 'mobile-feed-groups.png') })
  console.log('   Saved mobile-feed-groups.png')

  await browser.close()
  console.log('--- UI CAPTURE FINISHED SUCCESSFULLY ---')
}

run().catch((err) => {
  console.error('Capture error:', err)
  process.exit(1)
})

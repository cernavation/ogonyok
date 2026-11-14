import { STAGING_ACCOUNTS } from './config.mjs'

async function safeClick(locator) {
  try {
    if ((await locator.count()) > 0) {
      const first = locator.first()
      if (await first.isVisible()) {
        await first.click({ timeout: 3000 })
        return true
      }
    }
  } catch {}
  return false
}

/**
 * Signs into the running local app as a staging test account using the AuthForm UI
 * (falls back to Supabase password API + localStorage sync if needed).
 */
export async function authenticateBrowserSession(page, baseUrl, env, account = STAGING_ACCOUNTS.primary) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  // Close guest modal if landing showed first and open Auth modal
  const hasAuthTabs = (await page.locator('[role="tablist"][aria-label*="Вход"]').count()) > 0
  if (!hasAuthTabs) {
    await safeClick(page.getByRole('button', { name: /войти|вход/i }))
    await page.waitForTimeout(300)
  }

  // Ensure "Вход" tab is active
  await safeClick(page.getByRole('tab', { name: /вход/i }))
  await page.waitForTimeout(200)

  // Try UI sign-in via email/username + password inputs inside AuthForm
  const userInput = page
    .locator('input[type="email"], input[name="username"], input[placeholder*="ник" i], input[placeholder*="почт" i]')
    .first()
  const passInput = page.locator('input[type="password"]').first()

  if ((await userInput.count()) > 0 && (await passInput.count()) > 0) {
    await userInput.fill(account.username)
    await passInput.fill(account.password)
    const submitBtn = page.locator('form button[type="submit"]').first()
    if ((await submitBtn.count()) > 0) {
      await submitBtn.click()
      try {
        await page.waitForSelector(
          '.nav-list, .bottom-nav, nav[aria-label="Разделы приложения"], nav[aria-label="Основная навигация"], .x-compose-btn',
          { timeout: 7000 }
        )
        await page.waitForTimeout(300)
        if (account.username !== 'guard_empty') {
          await page.evaluate(({ peerAccount }) => {
            try {
              const k = 'ogonek.v2'
              const raw = localStorage.getItem(k)
              const store = raw ? JSON.parse(raw) : {}
              store.chatThreads = store.chatThreads || {}
              const threadId = peerAccount.username || 'guard_peer'
              store.chatThreads[threadId] = {
                messages: [
                  {
                    id: 'guard_seed_text_1',
                    authorId: threadId,
                    body: 'Привет! Как прошёл твой день и закрытие стрика?',
                    text: 'Привет! Как прошёл твой день и закрытие стрика?',
                    type: 'text',
                    createdAtISO: new Date(Date.now() - 120000).toISOString(),
                  },
                  {
                    id: 'guard_seed_audio_2',
                    authorId: threadId,
                    body: '',
                    text: '',
                    type: 'audio',
                    media: {
                      type: 'audio',
                      url: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0GGQ2hyb21lFlSua7+uvdeBAXPFh7o5dG1lAQAAAAAA',
                      duration: 8,
                    },
                    createdAtISO: new Date().toISOString(),
                  },
                ],
                peerMeta: {
                  name: peerAccount.displayName || 'Алексей Тест',
                  username: peerAccount.username || 'guard_peer',
                },
                readAtISO: new Date().toISOString(),
              }
              localStorage.setItem(k, JSON.stringify(store))
              window.dispatchEvent(new CustomEvent('ogonek-store-updated'))
            } catch {}
          }, { peerAccount: STAGING_ACCOUNTS.peer })
        }
        return true
      } catch {}
    }
  }

  // Fallback check: verify whether password grant succeeded or failed
  const signedIn =
    (await page
      .locator('.nav-list, .bottom-nav, nav[aria-label="Разделы приложения"], nav[aria-label="Основная навигация"]')
      .count()) > 0
  if (!signedIn) {
    throw new Error(`Unable to authenticate staging user "${account.username}" via AuthForm`)
  }

  if (account.username !== 'guard_empty') {
    await page.evaluate(({ peerAccount }) => {
      try {
        const k = 'ogonek.v2'
        const raw = localStorage.getItem(k)
        const store = raw ? JSON.parse(raw) : {}
        store.chatThreads = store.chatThreads || {}
        const threadId = peerAccount.username || 'guard_peer'
        store.chatThreads[threadId] = {
          messages: [
            {
              id: 'guard_seed_text_1',
              authorId: threadId,
              body: 'Привет! Как прошёл твой день и закрытие стрика?',
              text: 'Привет! Как прошёл твой день и закрытие стрика?',
              type: 'text',
              createdAtISO: new Date(Date.now() - 120000).toISOString(),
            },
            {
              id: 'guard_seed_audio_2',
              authorId: threadId,
              body: '',
              text: '',
              type: 'audio',
              media: {
                type: 'audio',
                url: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0GGQ2hyb21lFlSua7+uvdeBAXPFh7o5dG1lAQAAAAAA',
                duration: 8,
              },
              createdAtISO: new Date().toISOString(),
            },
          ],
          peerMeta: {
            name: peerAccount.displayName || 'Алексей Тест',
            username: peerAccount.username || 'guard_peer',
          },
          readAtISO: new Date().toISOString(),
        }
        localStorage.setItem(k, JSON.stringify(store))
        window.dispatchEvent(new CustomEvent('ogonek-store-updated'))
      } catch {}
    }, { peerAccount: STAGING_ACCOUNTS.peer })
  }
  return true
}

/**
 * Switches theme (`x-black`, `apple-light`, `dim`) directly via DOM dataset/localStorage for multi-theme contrast checks.
 */
export async function applyTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t)
    document.body.setAttribute('data-theme', t)
  }, theme)
  await page.waitForTimeout(200)
}

/**
 * Navigates cleanly to any named unauthenticated or authenticated screen/modal/settings section.
 */
export async function navigateToScreen(page, baseUrl, screenId) {
  // Unauthenticated screens
  if (screenId === 'landing') {
    await page.goto(`${baseUrl}/?view=landing`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    return
  }

  if (screenId === 'signin') {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(350)
    await safeClick(page.getByRole('tab', { name: /^Вход$/i }))
    await page.waitForTimeout(200)
    return
  }

  if (screenId === 'register') {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    await safeClick(page.getByRole('button', { name: /начать|регистр|войти/i }))
    await page.waitForTimeout(250)
    await safeClick(page.getByRole('tab', { name: /регистр/i }))
    await page.waitForTimeout(300)
    return
  }

  if (screenId === 'privacy') {
    await page.goto(`${baseUrl}/privacy`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(250)
    return
  }

  if (screenId === 'terms') {
    await page.goto(`${baseUrl}/terms`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(250)
    return
  }

  // Close open modals via Escape before changing view
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(150)

  // Settings subsections
  if (screenId.startsWith('settings_')) {
    const secId = screenId.slice('settings_'.length)
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'settings' })))
    await page.waitForTimeout(350)
    const sectionTitles = {
      appearance: /Внешний вид/i,
      diary: /Дневник|Стрик/i,
      notifications: /Уведомления/i,
      privacy: /Приватность/i,
      account: /Аккаунт/i,
      guide: /Руководство|Помощь/i,
    }
    const matcher = sectionTitles[secId]
    if (matcher) {
      await safeClick(page.getByRole('button', { name: matcher }))
      await page.waitForTimeout(250)
    }
    return
  }

  // Empty states share nav ids
  if (screenId === 'empty_home') {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'home' })))
    await page.waitForTimeout(350)
    return
  }
  if (screenId === 'empty_vault') {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'vault' })))
    await page.waitForTimeout(350)
    return
  }
  if (screenId === 'empty_messages') {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'messages' })))
    await page.waitForTimeout(350)
    return
  }

  // Standard views via custom app event
  const viewIds = new Set([
    'home',
    'explore',
    'profile',
    'vault',
    'premium',
    'analytics',
    'leaderboard',
    'intentions',
  ])
  if (viewIds.has(screenId)) {
    await page.evaluate((v) => window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: v })), screenId)
    await page.waitForTimeout(450)
    return
  }

  // Messenger screens
  if (screenId === 'messages_list' || screenId === 'messages_chat' || screenId === 'messages_group') {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'messages' })))
    await page.waitForTimeout(450)

    if (screenId === 'messages_chat') {
      await page.evaluate(() => {
        window.history.pushState(null, '', '/chats/guard_peer')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      const dialogRow = page.locator('.dialog-item, [data-thread-id], button:has-text("Алексей"), button:has-text("Привет")').first()
      await safeClick(dialogRow)
      await page.waitForTimeout(450)
    } else if (screenId === 'messages_group') {
      const existingGroup = page.locator('button:has-text("Группа")').first()
      if (!(await safeClick(existingGroup))) {
        await safeClick(page.locator('button[aria-label*="Новый чат" i], button[aria-label*="Написать" i], button:has-text("Написать")'))
        await page.waitForTimeout(250)
        await safeClick(page.getByRole('button', { name: /Создать группу/i }))
        await page.waitForTimeout(250)
        const nameInput = page.locator('input[placeholder*="групп" i], input[placeholder*="Соратники" i], input[placeholder*="Название" i]').first()
        if ((await nameInput.count()) > 0) {
          await nameInput.fill('Группа Стража')
          await safeClick(page.getByRole('button', { name: /^Создать группу$/i }))
          await page.waitForTimeout(350)
        }
      }
    }
    return
  }

  // Modals
  if (screenId === 'modal_composer') {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'home' })))
    await page.waitForTimeout(250)
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:open-composer')))
    await page.waitForTimeout(350)
    return
  }

  if (screenId === 'modal_day_menu') {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'home' })))
    await page.waitForTimeout(350)
    await safeClick(page.locator('button[aria-label="Опции дня"]').first())
    await page.waitForTimeout(300)
    return
  }

  if (screenId === 'modal_friends') {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'profile' })))
    await page.waitForTimeout(350)
    await safeClick(page.getByRole('button', { name: /^Друзья$/i }).first())
    await safeClick(page.getByRole('tab', { name: /Друзья/i }).first())
    await page.waitForTimeout(300)
    return
  }

  if (screenId === 'modal_notifications') {
    const clickedBell = await safeClick(page.locator('button[aria-label*="Уведомлен" i]').first())
    if (!clickedBell) {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'settings' })))
      await page.waitForTimeout(300)
      await safeClick(page.getByRole('button', { name: /Уведомления/i }))
    }
    await page.waitForTimeout(300)
    return
  }

  if (screenId === 'modal_call') {
    await navigateToScreen(page, baseUrl, 'messages_chat')
    await safeClick(page.locator('button[aria-label*="Позвонить" i], button[aria-label*="Аудиозвонок" i], button[aria-label*="Звонок" i]').first())
    await page.waitForTimeout(400)
    return
  }
}

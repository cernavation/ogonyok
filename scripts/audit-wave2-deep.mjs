import fs from 'node:fs'
import path from 'node:path'
import { launchGuardBrowser } from '../tools/guard/browser.mjs'

const BASE_URL = 'http://localhost:3000'
const OUT_DIR = path.resolve(process.cwd(), 'review/audit-02')

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

const VIEWPORTS = [
  { name: '1210x756', width: 1210, height: 756, isMobile: false },
  { name: '390x844', width: 390, height: 844, isMobile: true },
]

const TIERS = [
  { id: 'free', label: 'Базовый (Free)', username: 'audit_free', name: 'Аудитор Free' },
  { id: 'pro', label: 'Премиум (Pro)', username: 'audit_pro', name: 'Аудитор Pro' },
  { id: 'ultra', label: 'Основатель Ultra', username: 'audit_ultra', name: 'Аудитор Ultra' },
]

const defects = []
const consoleLogs = []
const networkErrors = []

function logDefect(d) {
  defects.push(d)
  console.log(`[DEFECT] [${d.severity}] ${d.id}: ${d.title}`)
}

async function capture(page, name) {
  const filepath = path.join(OUT_DIR, `${name}.png`)
  await page.screenshot({ path: filepath, fullPage: false })
  return filepath
}

async function safeClick(locator, timeout = 2000) {
  try {
    if ((await locator.count()) > 0) {
      const first = locator.first()
      if (await first.isVisible()) {
        await first.click({ timeout })
        return true
      }
    }
  } catch {}
  return false
}

async function scanPageContractDefects(page, screenName, vpName) {
  return await page.evaluate(({ screenName, vpName }) => {
    const issues = []

    // 1. Горизонтальный скролл (Rule 2)
    const docWidth = document.documentElement.clientWidth
    const bodyWidth = document.body.scrollWidth
    if (bodyWidth > docWidth + 3) {
      issues.push({
        id: 'RULE2_HORIZONTAL_SCROLL',
        severity: 'High',
        title: `Паразитный горизонтальный скролл на ${screenName} (${vpName})`,
        description: `scrollWidth (${bodyWidth}px) превышает clientWidth (${docWidth}px)`,
        screen: screenName,
        viewport: vpName,
        selector: 'body',
      })
    }

    // 2. Узкие колонки (< 28 символов по Rule 5)
    const candidates = document.querySelectorAll('p, span, div.truncate, .line-clamp-1, .line-clamp-2')
    for (const el of candidates) {
      const txt = (el.textContent || '').trim()
      if (txt.length >= 28) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.width < 140 && r.height > 0) {
          issues.push({
            id: 'RULE5_NARROW_TEXT_COLUMN',
            severity: 'Medium',
            title: `Текстовая колонка уже 28 символов (~${Math.round(r.width / 7)} симв., ${Math.round(r.width)}px) на ${screenName}`,
            description: `Текст: "${txt.slice(0, 35)}..." сжат в узкую колонку вместо перестроения в стек`,
            screen: screenName,
            viewport: vpName,
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''),
          })
          break
        }
      }
    }

    // 3. Обрезанный текст truncate без title (Rule 5)
    const truncates = document.querySelectorAll('.truncate')
    for (const el of truncates) {
      if (el.scrollWidth > el.clientWidth + 2 && !el.getAttribute('title')) {
        issues.push({
          id: 'RULE5_TRUNCATE_WITHOUT_TITLE',
          severity: 'Low',
          title: `Обрезан текст (.truncate) без всплывающей подсказки title на ${screenName}`,
          description: `Обрезанный текст: "${(el.textContent || '').trim().slice(0, 30)}..." не читаем полностью`,
          screen: screenName,
          viewport: vpName,
          selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''),
        })
        break
      }
    }

    // 4. Кнопки без aria-label, без подписи или с пустым содержимым (Rule 6)
    const buttons = document.querySelectorAll('button:not([disabled])')
    for (const b of buttons) {
      const r = b.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && window.getComputedStyle(b).display !== 'none') {
        const label = (b.getAttribute('aria-label') || b.textContent || '').trim()
        if (!label) {
          issues.push({
            id: 'RULE6_EMPTY_OR_UNLABELLED_BUTTON',
            severity: 'Medium',
            title: `Кнопка без текста и aria-label на ${screenName}`,
            description: `Элемент <button> не имеет доступного имени и подписи`,
            screen: screenName,
            viewport: vpName,
            selector: b.tagName.toLowerCase() + (b.className ? '.' + b.className.split(' ').slice(0, 2).join('.') : ''),
          })
          break
        }
      }
    }

    // 5. Дубли одинаковых действий на одном экране (Rule 4)
    const visibleActions = new Map()
    for (const b of buttons) {
      const r = b.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && window.getComputedStyle(b).display !== 'none') {
        const text = (b.getAttribute('aria-label') || b.textContent || '').trim().toLowerCase()
        if (text.length > 3 && !['закрыть', 'назад', 'отмена', 'ещё', 'меню'].includes(text)) {
          if (visibleActions.has(text)) {
            issues.push({
              id: 'RULE4_DUPLICATE_ACTION',
              severity: 'Medium',
              title: `Дубль контрола/действия "${text}" на ${screenName}`,
              description: `Две видимые кнопки с одинаковым действием на одном экране нарушают правило 4 контракта`,
              screen: screenName,
              viewport: vpName,
            })
            break
          }
          visibleActions.set(text, b)
        }
      }
    }

    return issues
  }, { screenName, vpName })
}

async function injectAuth(page, account) {
  const accountId = `user_${account.id}_id`
  await page.evaluate(({ account, accountId }) => {
    try {
      const data = {
        profile: {
          id: accountId,
          displayName: account.name,
          username: account.username,
          subscription_tier: account.id,
          subscriptionTier: account.id,
          tour_completed: true,
          streak: 15,
          streak_count: 15,
          level: account.id === 'ultra' ? 5 : account.id === 'pro' ? 3 : 1,
          verified: account.id === 'ultra',
          is_founder: account.id === 'ultra',
          city: 'Кишинёв',
          bio: `Официальный тестовый аккаунт аудита (${account.label})`,
          website: 'https://ogonek.app',
          settings: {
            tour_completed: true,
            theme: 'x-black',
            accent: '#ff7a18',
            notifications_enabled: true,
            sound_enabled: false,
          },
        },
        auth: {
          accounts: [
            {
              id: accountId,
              provider: 'email',
              email: `${account.username}@ogonek.local`,
              passwordHash: 'dummy_hash',
              snapshot: {
                displayName: account.name,
                username: account.username,
                bio: `Тестовый профиль ${account.name}`,
                city: 'Кишинёв',
                avatarColor: '#ff7a18',
                verified: account.id === 'ultra',
              },
              createdAtISO: new Date(Date.now() - 30 * 86400000).toISOString(),
              lastActiveISO: new Date().toISOString(),
              signInCount: 15,
              isGuest: false,
            },
          ],
          activeAccountId: accountId,
          signedIn: true,
          hasOnboarded: true,
          switchCount: 0,
          signInCount: 15,
          failedAttempts: 0,
          lockedUntilISO: null,
          lastAuthAtISO: new Date().toISOString(),
          updatedAtISO: new Date().toISOString(),
        },
        chatThreads: {
          cerna: {
            friendId: 'cerna',
            unreadCount: 0,
            messages: [
              {
                id: 'msg-seed-1',
                authorId: 'cerna',
                body: 'Привет! Добро пожаловать на аудит системы!',
                text: 'Привет! Добро пожаловать на аудит системы!',
                type: 'text',
                sent_at: new Date(Date.now() - 60000).toISOString(),
              },
            ],
          },
        },
      }

      localStorage.setItem('ogonek.v2', JSON.stringify(data))
      localStorage.setItem('ogonek:tour-completed', 'true')
      localStorage.setItem('ogonek_auth_token', `mock_token_${account.id}`)
      sessionStorage.setItem('ogonek:tour-completed', 'true')
    } catch (e) {
      console.error('injectAuth failed:', e)
    }
  }, { account, accountId })
}

async function runAudit() {
  console.log('🚀 Запуск глубокого независимого аудита Волна 2...')
  const browser = await launchGuardBrowser()

  for (const vp of VIEWPORTS) {
    console.log(`\n======================================================`)
    console.log(`📱 ВЬЮПОРТ: ${vp.name} (${vp.width}x${vp.height}, mobile=${vp.isMobile})`)
    console.log(`======================================================`)

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
      userAgent: vp.isMobile
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    })

    const page = await context.newPage()

    page.on('console', (msg) => {
      const type = msg.type()
      const text = msg.text()
      if (type === 'error') {
        consoleLogs.push({ type, text, url: page.url() })
        if (!text.includes('favicon') && !text.includes('Failed to load resource')) {
          logDefect({
            id: 'CONSOLE_ERROR',
            severity: 'High',
            title: `Ошибка в консоли браузера: ${text.slice(0, 80)}`,
            description: text,
            screen: page.url(),
            viewport: vp.name,
            file: 'runtime/console',
          })
        }
      }
    })

    page.on('pageerror', (err) => {
      logDefect({
        id: 'UNCAUGHT_EXCEPTION',
        severity: 'Critical',
        title: `Неперехваченное исключение JS: ${err.message.slice(0, 80)}`,
        description: err.stack || err.message,
        screen: page.url(),
        viewport: vp.name,
        file: 'runtime/exception',
      })
    })

    page.on('requestfailed', (req) => {
      const url = req.url()
      const failure = req.failure()
      networkErrors.push({ url, error: failure?.errorText })
    })

    // ------------------------------------------------------------------------
    // 1. ГОСТЕВЫЕ / СТАТИЧЕСКИЕ ЭКРАНЫ
    // ------------------------------------------------------------------------
    console.log('--- 1. Аудит гостевых экранов ---')
    await page.goto(`${BASE_URL}/?view=landing`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)
    await capture(page, `landing_${vp.name}`)
    ;(await scanPageContractDefects(page, 'landing', vp.name)).forEach(logDefect)

    await page.goto(`${BASE_URL}/privacy`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    await capture(page, `privacy_${vp.name}`)
    ;(await scanPageContractDefects(page, 'privacy', vp.name)).forEach(logDefect)

    await page.goto(`${BASE_URL}/terms`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    await capture(page, `terms_${vp.name}`)
    ;(await scanPageContractDefects(page, 'terms', vp.name)).forEach(logDefect)

    await page.goto(`${BASE_URL}/nonexistent-page-404`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    await capture(page, `404_${vp.name}`)

    // ------------------------------------------------------------------------
    // 2. ОБХОД ТРЕМЯ АККАУНТАМИ (FREE, PRO, ULTRA)
    // ------------------------------------------------------------------------
    for (const acc of TIERS) {
      console.log(`\n>>> Обход аккаунтом: ${acc.label} (${vp.name}) <<<`)

      // Авторизация через инъекцию сессии
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await injectAuth(page, acc)
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(800)

      // А. ГЛАВНАЯ ЛЕНТА (HOME)
      console.log(`[${acc.id}] Экран: Главная лента`)
      await capture(page, `home_${acc.id}_${vp.name}`)
      ;(await scanPageContractDefects(page, `home_${acc.id}`, vp.name)).forEach(logDefect)

      // Вкладки ленты: Друзья, Подписки
      const friendsTab = page.locator('button:has-text("Друзья")').first()
      if (await safeClick(friendsTab)) {
        await page.waitForTimeout(400)
        await capture(page, `home_tab_friends_${acc.id}_${vp.name}`)
      }

      const followsTab = page.locator('button:has-text("Подписки")').first()
      if (await safeClick(followsTab)) {
        await page.waitForTimeout(400)
        await capture(page, `home_tab_follows_${acc.id}_${vp.name}`)
      }

      // Б. КОМПОЗЕР ДНЯ (СОЗДАНИЕ ЗАПИСИ)
      console.log(`[${acc.id}] Модалка: Композер дня`)
      const composeBtn = page.locator('button:has-text("Записать"), button[aria-label*="Записать"]').first()
      if (await safeClick(composeBtn)) {
        await page.waitForTimeout(500)
        await capture(page, `composer_open_${acc.id}_${vp.name}`)

        // Ввод гордости
        const prideTextarea = page.locator('textarea, input[placeholder*="гордость" i], div[contenteditable="true"]').first()
        if (await prideTextarea.count() > 0) {
          await prideTextarea.fill(`Первая гордость дня от ${acc.name} (${vp.name})`)
          await page.waitForTimeout(200)
          await capture(page, `composer_filled_${acc.id}_${vp.name}`)
        }

        // Проверка смарт-вставки списков
        if (await prideTextarea.count() > 0) {
          const listPayload = '1. Пробежал 10 км утром\n2. Прочитал 30 страниц книги\n3. Закрыл важную задачу на работе'
          await prideTextarea.fill(listPayload)
          await page.waitForTimeout(300)
          await capture(page, `composer_smart_list_${acc.id}_${vp.name}`)
        }

        // Закрытие композера
        const closeComposer = page.locator('button[aria-label="Закрыть"], button:has-text("Отмена")').first()
        await safeClick(closeComposer)
        await page.waitForTimeout(300)
      }

      // В. ПРЕМИУМ МОДАЛКА (ШАГ 12)
      console.log(`[${acc.id}] Модалка: Премиум поп-ап`)
      const premiumNavBtn = page.locator('button:has-text("Премиум"), a[href*="premium"]').first()
      if (await safeClick(premiumNavBtn)) {
        await page.waitForTimeout(500)
        await capture(page, `premium_modal_${acc.id}_${vp.name}`)

        // Переключатель Месяц / Год
        const periodBtn = page.locator('button:has-text("Год"), button:has-text("В год")').first()
        if (await safeClick(periodBtn)) {
          await page.waitForTimeout(300)
          await capture(page, `premium_yearly_${acc.id}_${vp.name}`)
        }

        // FAQ аккордеон
        const faqBtn = page.locator('button:has-text("Вопросы и ответы"), button:has-text("FAQ")').first()
        if (await safeClick(faqBtn)) {
          await page.waitForTimeout(300)
          await capture(page, `premium_faq_${acc.id}_${vp.name}`)
        }

        // Проверка высоты на 1210x756
        if (vp.name === '1210x756') {
          const dialogBox = page.locator('[role="dialog"]').first()
          if (await dialogBox.count() > 0) {
            const b = await dialogBox.boundingBox()
            if (b && b.height > 756) {
              logDefect({
                id: 'PREMIUM_MODAL_HEIGHT_OVERFLOW',
                severity: 'High',
                title: `Модалка Премиум не влезает на 1210×756 (высота ${Math.round(b.height)}px > 756px)`,
                description: 'CONTRACT шаг 12 требует: всё влезает без внутреннего скролла на 1210×756',
                screen: 'premium_modal',
                viewport: vp.name,
                file: 'components/ogonek/premium-modal.tsx',
              })
            }
          }
        }

        const closePrem = page.locator('button[aria-label="Закрыть"]').first()
        await safeClick(closePrem)
        await page.waitForTimeout(300)
      }

      // Г. МЕССЕНДЖЕР И ЧАТЫ (/chats)
      console.log(`[${acc.id}] Экран: Чаты и сообщения`)
      await page.goto(`${BASE_URL}/chats`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      await capture(page, `chats_list_${acc.id}_${vp.name}`)
      ;(await scanPageContractDefects(page, `chats_${acc.id}`, vp.name)).forEach(logDefect)

      // Открытие диалога
      const chatItem = page.locator('.conversation-item, div.chat-item, button:has-text("cerna")').first()
      if (await safeClick(chatItem)) {
        await page.waitForTimeout(500)
        await capture(page, `chat_thread_${acc.id}_${vp.name}`)

        // Ввод и отправка сообщения
        const input = page.locator('input[placeholder*="сообщение" i], textarea[placeholder*="сообщение" i]').first()
        if (await input.count() > 0) {
          await input.fill(`Сообщение от ${acc.name} в разрешении ${vp.name}!`)
          await page.keyboard.press('Enter')
          await page.waitForTimeout(400)
          await capture(page, `chat_message_sent_${acc.id}_${vp.name}`)
        }

        // Кнопка аудио/видео вызова
        const callTrigger = page.locator('button[aria-label*="Звонок"], button:has-text("Звонок")').first()
        if (await safeClick(callTrigger)) {
          await page.waitForTimeout(500)
          await capture(page, `call_modal_${acc.id}_${vp.name}`)

          const endCall = page.locator('button[aria-label*="Завершить"], button.bg-red-500').first()
          await safeClick(endCall)
          await page.waitForTimeout(300)
        }
      }

      // Д. ОБЗОР / РЕЙТИНГ / ПОИСК (EXPLORE)
      console.log(`[${acc.id}] Экран: Поиск и рейтинг`)
      const exploreNav = page.locator('button:has-text("Поиск"), a[href*="explore"]').first()
      if (await safeClick(exploreNav)) {
        await page.waitForTimeout(600)
        await capture(page, `explore_${acc.id}_${vp.name}`)
        ;(await scanPageContractDefects(page, `explore_${acc.id}`, vp.name)).forEach(logDefect)
      }

      // Е. EVIDENCE VAULT & МИЛЬСТОУНЫ
      console.log(`[${acc.id}] Экран: Evidence Vault`)
      const vaultNav = page.locator('button:has-text("Evidence Vault"), a[href*="vault"]').first()
      if (await safeClick(vaultNav)) {
        await page.waitForTimeout(600)
        await capture(page, `vault_${acc.id}_${vp.name}`)
        ;(await scanPageContractDefects(page, `vault_${acc.id}`, vp.name)).forEach(logDefect)
      }

      // Ж. НАСТРОЙКИ (ВСЕ 10 ПОДРАЗДЕЛОВ)
      console.log(`[${acc.id}] Экран: Настройки (10 разделов)`)
      const settingsNav = page.locator('button:has-text("Настройки"), a[href*="settings"]').first()
      if (await safeClick(settingsNav)) {
        await page.waitForTimeout(600)
        await capture(page, `settings_index_${acc.id}_${vp.name}`)

        const tabs = [
          'profile', 'appearance', 'privacy', 'notifications',
          'chats', 'security', 'data', 'tier', 'tour', 'about'
        ]

        for (const t of tabs) {
          const tabBtn = page.locator(`button[data-section="${t}"], button:has-text("${t}")`).first()
          if (await safeClick(tabBtn, 1500)) {
            await page.waitForTimeout(250)
            await capture(page, `settings_${t}_${acc.id}_${vp.name}`)
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // 3. ХАОС-ТЕСТЫ И СТРЕСС-ТЕСТИРОВАНИЕ (TRY TO BREAK)
    // ------------------------------------------------------------------------
    console.log(`\n--- 3. Хаос-тестирование на ${vp.name} ---`)
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await injectAuth(page, TIERS[1])
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    // Тест 1: Экстремальный текст (1200+ символов непрерывной строки + RTL + Emojis)
    console.log('Хаос 1: Экстремальный длинный RTL текст...')
    const compBtn = page.locator('button:has-text("Записать")').first()
    if (await safeClick(compBtn)) {
      await page.waitForTimeout(400)
      const txt = page.locator('textarea, input[placeholder*="гордость" i]').first()
      if (await txt.count() > 0) {
        const extremeText = 'A'.repeat(800) + ' 🔥👑👨‍👩‍👧‍👦🏳️‍🌈 ' + 'هذا_نص_طويل_جدا_باللغة_العربية_لا_يحتوي_على_مسافات_نهائيا'
        await txt.fill(extremeText)
        await page.waitForTimeout(300)
        await capture(page, `chaos_extreme_text_${vp.name}`)

        // Проверка: вылез ли текст за пределы карточки
        const textOverflow = await page.evaluate(() => {
          const area = document.querySelector('textarea, div[contenteditable="true"]')
          if (!area) return false
          return area.scrollWidth > area.clientWidth + 10
        })

        if (textOverflow) {
          logDefect({
            id: 'TEXTAREA_HORIZONTAL_OVERFLOW',
            severity: 'Medium',
            title: `Текстовое поле раздувается от непрерывной строки символов на ${vp.name}`,
            description: 'Поле ввода получает горизонтальный скроллбар вместо принудительного переноса строк break-all / break-words',
            screen: 'composer',
            viewport: vp.name,
            file: 'components/ogonek/composer.tsx',
          })
        }
      }
      const closeC = page.locator('button[aria-label="Закрыть"]').first()
      await safeClick(closeC)
      await page.waitForTimeout(300)
    }

    // Тест 2: Потеря сети посреди действия (Offline mode)
    console.log('Хаос 2: Потеря сети mid-action...')
    await context.setOffline(true)
    await page.waitForTimeout(300)

    // Кликаем отправку или навигацию в офлайне
    const navChats = page.locator('button:has-text("Чаты"), a[href*="chats"]').first()
    await safeClick(navChats)
    await page.waitForTimeout(400)
    await capture(page, `chaos_offline_state_${vp.name}`)

    // Восстанавливаем сеть
    await context.setOffline(false)
    await page.waitForTimeout(300)

    // Тест 3: Быстрый спам кликами (Rapid double clicks)
    console.log('Хаос 3: Спам двойными кликами...')
    const likeOrSendBtn = page.locator('button:has-text("Записать"), .story-ring').first()
    if (await likeOrSendBtn.count() > 0) {
      await likeOrSendBtn.click({ clickCount: 4, delay: 40 }).catch(() => {})
      await page.waitForTimeout(300)
      await capture(page, `chaos_click_spam_${vp.name}`)
    }

    await context.close()
  }

  await browser.close()

  // Сохраняем сырые результаты в JSON
  fs.writeFileSync(
    path.join(OUT_DIR, 'audit-wave2-results.json'),
    JSON.stringify({
      defects,
      consoleLogs,
      networkErrors,
      timestamp: new Date().toISOString(),
    }, null, 2)
  )

  console.log(`\n======================================================`)
  console.log(`🎯 АУДИТ ЗАВЕРШЁН! Найдено дефектов: ${defects.length}`)
  console.log(`======================================================`)
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err)
  process.exit(1)
})

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

function logDefect(defect) {
  defects.push(defect)
  console.log(`[DEFECT] [${defect.severity}] ${defect.id}: ${defect.title}`)
}

async function captureScreen(page, filename) {
  const filepath = path.join(OUT_DIR, filename)
  await page.screenshot({ path: filepath, fullPage: false })
  return filepath
}

async function safeClick(locator, timeout = 2500) {
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

async function checkLayoutDefects(page, screenName, vpName) {
  return await page.evaluate(({ screenName, vpName }) => {
    const issues = []
    
    // 1. Проверка горизонтального переполнения (overflow-x)
    const docWidth = document.documentElement.clientWidth
    const bodyWidth = document.body.scrollWidth
    if (bodyWidth > docWidth + 4) {
      issues.push({
        id: 'OVERFLOW_HORIZONTAL',
        severity: 'High',
        title: `Паразитный горизонтальный скролл на экране ${screenName} (${vpName})`,
        description: `scrollWidth (${bodyWidth}px) > clientWidth (${docWidth}px)`,
        screen: screenName,
        viewport: vpName,
      })
    }

    // 2. Узкие текстовые колонки (< 28 символов по правилу 5 контракта)
    const textEls = document.querySelectorAll('p, span, div.truncate, .line-clamp-1')
    for (const el of textEls) {
      const text = (el.textContent || '').trim()
      if (text.length > 30) {
        const rect = el.getBoundingClientRect()
        if (rect.width > 0 && rect.width < 140 && rect.height > 0) {
          // Оценочно 140px ~ 18-22 символов
          issues.push({
            id: 'NARROW_COLUMN',
            severity: 'Medium',
            title: `Слишком узкая текстовая колонка (< 28 символов) на ${screenName}`,
            description: `Элемент "${text.slice(0, 30)}..." имеет ширину всего ${Math.round(rect.width)}px`,
            screen: screenName,
            viewport: vpName,
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''),
          })
          break
        }
      }
    }

    // 3. Дубли действий и одинаковые aria-label в видимой области
    const buttons = Array.from(document.querySelectorAll('button:not([disabled])')).filter(b => {
      const r = b.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && window.getComputedStyle(b).display !== 'none'
    })

    const seenLabels = new Map()
    for (const btn of buttons) {
      const label = (btn.getAttribute('aria-label') || btn.textContent || '').trim().toLowerCase()
      if (label && label.length > 2) {
        if (seenLabels.has(label)) {
          issues.push({
            id: 'DUPLICATE_ACTION',
            severity: 'Medium',
            title: `Дублирование видимого контрола "${label}" на ${screenName}`,
            description: `Обнаружено несколько активных кнопок с одинаковым лейблом "${label}"`,
            screen: screenName,
            viewport: vpName,
          })
          break
        }
        seenLabels.set(label, btn)
      }
    }

    return issues
  }, { screenName, vpName })
}

async function initAccountState(page, account) {
  await page.evaluate(({ account }) => {
    try {
      const STORAGE_KEY = 'ogonek.v2'
      const raw = localStorage.getItem(STORAGE_KEY)
      const data = raw ? JSON.parse(raw) : {}
      
      data.profile = data.profile || {}
      data.profile.username = account.username
      data.profile.displayName = account.name
      data.profile.subscription_tier = account.id
      data.profile.subscriptionTier = account.id
      data.profile.streak = 14
      data.profile.streak_count = 14
      data.profile.verified = account.id === 'ultra'
      data.profile.is_founder = account.id === 'ultra'
      
      data.activeTab = 'home'
      data.onboardingCompleted = true
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      localStorage.setItem('ogonek_auth_token', `mock_jwt_${account.id}`)
    } catch (e) {
      console.error('initAccountState failed:', e)
    }
  }, { account })
}

async function run() {
  console.log('🚀 Запуск независимого аудита волны 2...')
  const browser = await launchGuardBrowser()

  for (const vp of VIEWPORTS) {
    console.log(`\n==================================================`)
    console.log(`📱 Вьюпорт: ${vp.name} (${vp.width}x${vp.height})`)
    console.log(`==================================================`)

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      userAgent: vp.isMobile
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

    // 1. НЕАВТОРИЗОВАННЫЕ ЭКРАНЫ
    console.log('--- Проверка гостевых экранов ---')
    await page.goto(`${BASE_URL}/?view=landing`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)
    await captureScreen(page, `landing_${vp.name}.png`)
    const landingIssues = await checkLayoutDefects(page, 'landing', vp.name)
    landingIssues.forEach(logDefect)

    // Проверка модалки входа
    const loginBtn = page.locator('button:has-text("Войти"), button:has-text("Вход")')
    if (await safeClick(loginBtn)) {
      await page.waitForTimeout(400)
      await captureScreen(page, `auth_signin_modal_${vp.name}.png`)
      
      // Переключение на вкладку Регистрация
      const regTab = page.locator('button[role="tab"]:has-text("Регистрация"), button:has-text("Регистрация")')
      if (await safeClick(regTab)) {
        await page.waitForTimeout(400)
        await captureScreen(page, `auth_register_modal_${vp.name}.png`)
      }
      
      // Закрываем модалку
      const closeAuth = page.locator('button[aria-label="Закрыть"], button.close-modal')
      await safeClick(closeAuth)
    }

    // Статические страницы
    await page.goto(`${BASE_URL}/privacy`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    await captureScreen(page, `privacy_${vp.name}.png`)

    await page.goto(`${BASE_URL}/terms`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    await captureScreen(page, `terms_${vp.name}.png`)

    await page.goto(`${BASE_URL}/random-missing-route-404`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    await captureScreen(page, `404_${vp.name}.png`)

    // 2. ОБХОД ТРЕМЯ ТАРИФАМИ (free, pro, ultra)
    for (const acc of TIERS) {
      console.log(`\n--- Аудит аккаунта: ${acc.label} (${vp.name}) ---`)
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await initAccountState(page, acc)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(800)

      // Главный экран ленты
      await captureScreen(page, `home_${acc.id}_${vp.name}.png`)
      const homeIssues = await checkLayoutDefects(page, `home_${acc.id}`, vp.name)
      homeIssues.forEach(logDefect)

      // Проверка модалки создания записи (Композер)
      const composeBtn = page.locator('button[aria-label*="Записать"], button:has-text("Записать"), .x-compose-btn, button:has-text("Записать день")').first()
      if (await safeClick(composeBtn)) {
        await page.waitForTimeout(500)
        await captureScreen(page, `composer_open_${acc.id}_${vp.name}.png`)

        // Заполняем поле гордости
        const prideInput = page.locator('textarea, input[placeholder*="гордость" i], input[placeholder*="побед" i]').first()
        if (await prideInput.count() > 0) {
          await prideInput.fill(`Тестовая победа аудита ${acc.id} на ${vp.name}`)
          await page.waitForTimeout(200)
          await captureScreen(page, `composer_typed_${acc.id}_${vp.name}.png`)
        }

        // Закрываем модалку композера
        const closeBtn = page.locator('button[aria-label="Закрыть"], button:has-text("Отмена")').first()
        await safeClick(closeBtn)
        await page.waitForTimeout(300)
      }

      // Проверка модалки Премиум
      const premiumBtn = page.locator('button:has-text("Премиум"), a[href*="premium"], button[aria-label*="Премиум"]').first()
      if (await safeClick(premiumBtn)) {
        await page.waitForTimeout(500)
        await captureScreen(page, `premium_modal_${acc.id}_${vp.name}.png`)

        // Переключатель Месяц / Год
        const yearToggle = page.locator('button:has-text("Год"), button:has-text("В год")').first()
        if (await safeClick(yearToggle)) {
          await page.waitForTimeout(300)
          await captureScreen(page, `premium_yearly_${acc.id}_${vp.name}.png`)
        }

        // FAQ аккордеон
        const faqToggle = page.locator('button:has-text("Вопросы и ответы"), button:has-text("FAQ")').first()
        if (await safeClick(faqToggle)) {
          await page.waitForTimeout(300)
          await captureScreen(page, `premium_faq_${acc.id}_${vp.name}.png`)
        }

        // Проверка высоты модалки на 1210x756
        if (vp.name === '1210x756') {
          const modalBox = page.locator('[role="dialog"]').first()
          if (await modalBox.count() > 0) {
            const box = await modalBox.boundingBox()
            if (box && box.height > 756) {
              logDefect({
                id: 'MODAL_OVERFLOW_VIEWPORT',
                severity: 'High',
                title: `Модалка Премиум не влезает в экран 1210x756 (${Math.round(box.height)}px > 756px)`,
                description: 'На основном экране владельца модалка превышает высоту вьюпорта без возможности комфортного закрытия',
                screen: 'premium_modal',
                viewport: vp.name,
                file: 'components/ogonek/premium-modal.tsx',
              })
            }
          }
        }

        const closePremium = page.locator('button[aria-label="Закрыть"]').first()
        await safeClick(closePremium)
        await page.waitForTimeout(300)
      }

      // Раздел Чаты (/chats)
      await page.goto(`${BASE_URL}/chats`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(600)
      await captureScreen(page, `chats_${acc.id}_${vp.name}.png`)
      const chatIssues = await checkLayoutDefects(page, `chats_${acc.id}`, vp.name)
      chatIssues.forEach(logDefect)

      // Открытие первого диалога
      const firstChat = page.locator('.conversation-item, button[role="button"]:has(.avatar), div.chat-item').first()
      if (await safeClick(firstChat)) {
        await page.waitForTimeout(500)
        await captureScreen(page, `chat_thread_${acc.id}_${vp.name}.png`)

        // Тест отправки сообщения
        const msgInput = page.locator('input[placeholder*="сообщение" i], textarea[placeholder*="сообщение" i]').first()
        if (await msgInput.count() > 0) {
          await msgInput.fill(`Привет от ${acc.id}! Тест чата.`)
          await page.keyboard.press('Enter')
          await page.waitForTimeout(400)
          await captureScreen(page, `chat_sent_${acc.id}_${vp.name}.png`)
        }

        // Кнопка вызова
        const callBtn = page.locator('button[aria-label*="Звонок"], button[aria-label*="позвонить" i], button:has-text("Звонок")').first()
        if (await safeClick(callBtn)) {
          await page.waitForTimeout(500)
          await captureScreen(page, `call_modal_${acc.id}_${vp.name}.png`)
          const endCallBtn = page.locator('button[aria-label*="Завершить"], button.bg-red-500').first()
          await safeClick(endCallBtn)
          await page.waitForTimeout(300)
        }
      }

      // Раздел Настройки (все подразделы)
      console.log(`Проверка разделов настроек для ${acc.id}...`)
      await page.goto(`${BASE_URL}/?tab=settings`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)
      await captureScreen(page, `settings_main_${acc.id}_${vp.name}.png`)

      const settingsSections = [
        'profile', 'appearance', 'privacy', 'notifications',
        'chats', 'security', 'data', 'tier', 'tour', 'about'
      ]

      for (const sec of settingsSections) {
        const secBtn = page.locator(`button[data-section="${sec}"], button:has-text("${sec}")`).first()
        if (await safeClick(secBtn, 1500)) {
          await page.waitForTimeout(300)
          await captureScreen(page, `settings_${sec}_${acc.id}_${vp.name}.png`)
        }
      }

      // Раздел Explore / Рейтинг
      await page.goto(`${BASE_URL}/?tab=explore`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)
      await captureScreen(page, `explore_${acc.id}_${vp.name}.png`)

      // Раздел Вехи / Vault
      await page.goto(`${BASE_URL}/?tab=milestones`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)
      await captureScreen(page, `milestones_${acc.id}_${vp.name}.png`)
    }

    // 3. ХАОС-ТЕСТЫ И СТРЕСС-ТЕСТИРОВАНИЕ
    console.log(`\n--- Запуск хаос-тестов для ${vp.name} ---`)
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await initAccountState(page, TIERS[1]) // Pro
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)

    // Хаос 1: Очень длинная непрерывная строка (RTL + No Spaces)
    const composeBtnChaos = page.locator('button[aria-label*="Записать"], button:has-text("Записать")').first()
    if (await safeClick(composeBtnChaos)) {
      await page.waitForTimeout(400)
      const input = page.locator('textarea, input[placeholder*="гордость" i]').first()
      if (await input.count() > 0) {
        // Длинная строка без пробелов + эмодзи + RTL
        const chaosPayload = 'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW 🔥👑💥 هذا_نص_طويل_جدا_بدون_مسافات_لتجربة_التصميم_العربي'
        await input.fill(chaosPayload)
        await page.waitForTimeout(300)
        await captureScreen(page, `chaos_long_rtl_${vp.name}.png`)

        // Проверяем, не вылез ли текст за границы контейнера
        const overflowDetected = await page.evaluate(() => {
          const activeEl = document.activeElement
          if (!activeEl) return false
          return activeEl.scrollWidth > activeEl.clientWidth + 5
        })

        if (overflowDetected) {
          logDefect({
            id: 'INPUT_HORIZONTAL_OVERFLOW',
            severity: 'Medium',
            title: `Текстовое поле композера раздувается от длинных непрерывных строк на ${vp.name}`,
            description: 'Строка без пробелов провоцирует неконтролируемое горизонтальное переполнение',
            screen: 'composer',
            viewport: vp.name,
            file: 'components/ogonek/composer.tsx',
          })
        }
      }
      const closeBtn = page.locator('button[aria-label="Закрыть"]').first()
      await safeClick(closeBtn)
    }

    // Хаос 2: Потеря сети посреди действия (Offline mode)
    console.log('Тест потери сети (Offline mode)...')
    await context.setOffline(true)
    await page.waitForTimeout(200)

    // Пытаемся отправить сообщение в чате в офлайне
    await page.goto(`${BASE_URL}/chats`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.waitForTimeout(500)
    await captureScreen(page, `chaos_offline_${vp.name}.png`)

    // Восстанавливаем сеть
    await context.setOffline(false)
    await page.waitForTimeout(300)

    // Хаос 3: Быстрые двойные/тройные клики (Double click spam)
    console.log('Тест быстрых кликов (Click spam)...')
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    const streakBtn = page.locator('button:has-text("Записать"), .story-ring').first()
    if (await streakBtn.count() > 0) {
      await streakBtn.click({ clickCount: 3, delay: 50 }).catch(() => {})
      await page.waitForTimeout(400)
      await captureScreen(page, `chaos_spam_clicks_${vp.name}.png`)
    }

    await context.close()
  }

  await browser.close()

  // Сохраняем сырые результаты
  fs.writeFileSync(
    path.join(OUT_DIR, 'audit-results.json'),
    JSON.stringify({ defects, consoleLogs, timestamp: new Date().toISOString() }, null, 2)
  )

  console.log(`\n✅ Аудит завершён! Зафиксировано дефектов: ${defects.length}`)
}

run().catch((err) => {
  console.error('Fatal audit error:', err)
  process.exit(1)
})

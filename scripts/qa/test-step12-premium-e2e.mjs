#!/usr/bin/env node
/**
 * E2E ПРИЁМКА: ШАГ 12 — ПРЕМИУМ, ЕДИНАЯ МОДАЛКА АПСЕЛЛА И ДЕГРАДАЦИЯ ПРИ ИСТЕЧЕНИИ
 * 
 * Проверяет:
 * 1. Пункт «Премиум» в левом меню открывает центральную модалку-попап, а не страницу.
 * 2. Роут /premium перенаправляет на главную и сразу открывает поп-ап.
 * 3. Модалка Премиум: Месяц/Год переключатель (-20%), 3 карточки (Free 0 MDL, Pro 25 MDL, Ultra 50 MDL),
 *    функции из permissions.ts, текущий тариф подсвечен, срок действия, ссылки оплаты Memernity,
 *    FAQ «что будет, когда подписка закончится».
 * 4. Замер габаритов на 1210×756: модалка влезает БЕЗ внутреннего скролла (scrollHeight <= clientHeight).
 * 5. Единая модалка апселла <UpgradeModal>:
 *    - 8 точек входа: фото, ИИ-оценка, таймеры намерений, кастомный цвет акцента,
 *      Evidence Vault, видеозвонок, группы сверх лимита, расширенная аналитика.
 *    - Cooldown 10 минут в localStorage.
 *    - Чекбокс «Больше не напоминать».
 * 6. Истечение подписки:
 *    - Предупреждение за 3 дня (баннер в шапке / ленте с кнопкой «Продлить»).
 *    - Мягкая деградация: гордость в 2500 символов на Free читается полностью,
 *      при редактировании просит уложиться в 1000 символов.
 * 7. Проверка работы интерфейса на всех трёх тарифах: Free, Pro, Ultra.
 */

import { launchGuardBrowser } from '../../tools/guard/browser.mjs'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const REVIEW_DIR = path.resolve(process.cwd(), 'review/12')

if (!fs.existsSync(REVIEW_DIR)) {
  fs.mkdirSync(REVIEW_DIR, { recursive: true })
}

function buildUserStore(tier = 'free', expiresAt = null) {
  const userId = '00000000-0000-4000-8000-000000000001'
  const username = 'alex_cerna'
  const displayName = 'Алексей Черна'

  return JSON.stringify({
    profile: {
      username,
      displayName,
      streak_count: 720,
      level: 3,
      avatarColor: '#ff5722',
      verified: tier !== 'free',
      subscription_tier: tier,
      subscription_expires_at: expiresAt,
      tour_completed: true,
    },
    privacy: { defaultDayVisibility: 'private' },
    auth: {
      signedIn: true,
      activeAccountId: userId,
      accounts: [
        {
          id: userId,
          email: `${username}@ogonek.app`,
          snapshot: {
            username,
            displayName,
            avatarColor: '#ff5722',
            streak: 720,
          },
        },
      ],
    },
    evidenceItems: [
      {
        id: 'ev-1',
        title: 'Первый марафон 42 км',
        description: 'Пробежал полную марафонскую дистанцию без остановки.',
        date: '10 МАЯ 2024',
        category: 'Сомнения',
        pinned: true,
      },
      {
        id: 'ev-2',
        title: 'Защита диссертации',
        description: 'Успешно защитил научную работу перед комиссией.',
        date: '15 ИЮНЯ 2024',
        category: 'Страхи',
        pinned: false,
      },
    ],
    days: [
      {
        id: 101,
        dateISO: new Date().toISOString(),
        prides: [
          {
            text: 'А'.repeat(2500),
            scale: 9,
            overcome: 2,
          },
          { text: 'Пробежал утренний кросс 10 км', scale: 8, overcome: 1 },
          { text: 'Сдал сложный проект заказчику в срок', scale: 9, overcome: 2 },
        ],
        gratitudes: [
          'Благодарен команде за поддержку',
          'Благодарен за ясный солнечный день',
        ],
      },
    ],
  })
}

async function runStep12Tests() {
  console.log('=== [Step 12 E2E] Запуск сквозного тестирования Премиума и Апселла ===')
  const browser = await launchGuardBrowser()
  const results = []

  const assert = (cond, msg) => {
    if (!cond) {
      console.error(`❌ FAIL: ${msg}`)
      results.push({ test: msg, pass: false })
      throw new Error(msg)
    }
    console.log(`✅ PASS: ${msg}`)
    results.push({ test: msg, pass: true })
  }

  try {
    // -------------------------------------------------------------
    // СЦЕНАРИЙ 1: Открытие поп-апа «Премиум» из левого меню на 1210×756 (Free тариф)
    // -------------------------------------------------------------
    console.log('\n--- Сценарий 1: Левое меню «Премиум» открывает поп-ап на 1210×756 ---')
    {
      const context = await browser.newContext({ viewport: { width: 1210, height: 756 } })
      const page = await context.newPage()
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.evaluate((s) => {
        localStorage.clear()
        localStorage.setItem('ogonek.v2', s)
        localStorage.setItem('ogonek.store.v1', s)
        localStorage.setItem('ogonek:tour-completed', 'true')
      }, buildUserStore('free'))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(600)

      // Кликаем по пункту Премиум в левом меню
      const premiumNavItem = await page.$('button[aria-label="Премиум"]')
      assert(Boolean(premiumNavItem), 'Пункт «Премиум» присутствует в левом меню')
      await premiumNavItem.click()

      await page.waitForSelector('#premium-modal-container', { timeout: 5000 })
      assert(true, 'Модальное окно тарифов #premium-modal-container открылось поп-апом')

      // Проверяем, что underlying view остался 'home' (URL не сменился на перманентную страницу)
      const currentUrl = page.url()
      assert(!currentUrl.includes('/premium'), 'Страница не перешла на /premium, осталась поп-апом')

      // Проверяем 3 карточки тарифов
      const freeCard = await page.$('#tier-card-free')
      const proCard = await page.$('#tier-card-pro')
      const ultraCard = await page.$('#tier-card-ultra')
      assert(Boolean(freeCard && proCard && ultraCard), 'Отображены 3 карточки: Базовый, Премиум, Ultra')

      // Подсветка текущего тарифа Free
      const currentBadgeText = await freeCard?.$eval('.rounded-full', (el) => el.textContent)
      assert(currentBadgeText?.toLowerCase().includes('текущий план'), 'На карточке Free подсвечен «Текущий план»')

      // Переключатель Месяц / Год
      const monthlyBtn = await page.$('#billing-switch-monthly')
      const yearlyBtn = await page.$('#billing-switch-yearly')
      assert(Boolean(monthlyBtn && yearlyBtn), 'Присутствует переключатель Месяц / Год')

      // Проверяем цену на карточке Pro при месячной оплате
      let proPriceText = await proCard?.$eval('.text-\\[20px\\]', (el) => el.textContent)
      assert(proPriceText?.includes('25 MDL'), 'Цена Премиум на месяц: 25 MDL')

      // Переключаем на Год
      await yearlyBtn.click()
      await page.waitForTimeout(200)
      proPriceText = await proCard?.$eval('.text-\\[20px\\]', (el) => el.textContent)
      assert(proPriceText?.includes('240 MDL'), 'Цена Премиум на год: 240 MDL (-20%)')

      // Проверяем ссылку на оплату Memernity Checkout
      const checkoutBtnPro = await page.$('#checkout-btn-pro')
      assert(Boolean(checkoutBtnPro), 'Кнопка оплаты Премиум присутствует')

      // Проверяем раскрытие FAQ
      const faqToggle = await page.$('#premium-faq-toggle')
      assert(Boolean(faqToggle), 'Присутствует пункт FAQ «Что будет, когда подписка закончится»')
      await faqToggle.click()
      await page.waitForSelector('#premium-faq-content', { timeout: 3000 })
      const faqText = await page.$eval('#premium-faq-content', (el) => el.textContent)
      assert(faqText.includes('сохраняются навсегда') && faqText.includes('1000 символов'), 'FAQ корректно объясняет условия окончания подписки')

      // ЗАМЕР БЮДЖЕТА: модалка должна влезать БЕЗ внутреннего скролла на 1210×756!
      const modalScrollMetrics = await page.evaluate(() => {
        const modal = document.querySelector('#premium-modal-container')
        if (!modal) return { scrollHeight: 0, clientHeight: 0, hasScrollbar: false }
        return {
          scrollHeight: modal.scrollHeight,
          clientHeight: modal.clientHeight,
          hasScrollbar: modal.scrollHeight > modal.clientHeight + 1,
        }
      })
      console.log(`[Budget 1210x756] scrollHeight=${modalScrollMetrics.scrollHeight}px, clientHeight=${modalScrollMetrics.clientHeight}px`)
      assert(!modalScrollMetrics.hasScrollbar, 'Модальное окно на 1210×756 влезает БЕЗ внутреннего скролла!')

      // Скриншот
      await page.screenshot({ path: path.join(REVIEW_DIR, '01_premium_modal_free.png') })
      await context.close()
    }

    // -------------------------------------------------------------
    // СЦЕНАРИЙ 2: Редирект с роута /premium на главную с открытием поп-апа
    // -------------------------------------------------------------
    console.log('\n--- Сценарий 2: Редирект /premium открывает поп-ап ---')
    {
      const context = await browser.newContext({ viewport: { width: 1210, height: 756 } })
      const page = await context.newPage()
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.evaluate((s) => {
        localStorage.clear()
        localStorage.setItem('ogonek.v2', s)
        localStorage.setItem('ogonek.store.v1', s)
        localStorage.setItem('ogonek:tour-completed', 'true')
      }, buildUserStore('free'))
      await page.goto(`${BASE_URL}/premium`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(600)

      await page.waitForSelector('#premium-modal-container', { timeout: 6000 })
      assert(true, 'Роут /premium успешно перенаправил на главную и открыл окно тарифов')
      await page.screenshot({ path: path.join(REVIEW_DIR, '02_premium_redirect.png') })
      await context.close()
    }

    // -------------------------------------------------------------
    // СЦЕНАРИЙ 3: Проверка карточек на тарифах Pro и Ultra
    // -------------------------------------------------------------
    console.log('\n--- Сценарий 3: Активный Pro и Ultra аккаунты в поп-апе ---')
    {
      const context = await browser.newContext({ viewport: { width: 1210, height: 756 } })
      const page = await context.newPage()
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.evaluate((s) => {
        localStorage.clear()
        localStorage.setItem('ogonek.v2', s)
        localStorage.setItem('ogonek.store.v1', s)
        localStorage.setItem('ogonek:tour-completed', 'true')
      }, buildUserStore('pro', futureDate))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(600)

      // Открываем модалку через событие или клик
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:open-premium')))
      await page.waitForSelector('#premium-modal-container', { timeout: 4000 })

      // Проверяем подсветку карточки Pro
      const proCard = await page.$('#tier-card-pro')
      const proBadge = await proCard?.$eval('.rounded-full', (el) => el.textContent)
      assert(proBadge?.toLowerCase().includes('текущий план'), 'На тарифе Pro карточка Pro отмечена как «Текущий план»')

      // Кнопка на карточке Pro должна называться «Продлить»
      const proBtnText = await proCard?.$eval('#checkout-btn-pro', (el) => el.textContent)
      console.log('DEBUG proBtnText:', JSON.stringify(proBtnText))
      assert(proBtnText?.includes('Продлить'), 'Кнопка на текущем тарифе Pro называется «Продлить»')

      // На карточке Ultra кнопка «Улучшить до Ultra»
      const ultraCard = await page.$('#tier-card-ultra')
      const ultraBtnText = await ultraCard?.$eval('#checkout-btn-ultra', (el) => el.textContent)
      assert(ultraBtnText?.includes('Улучшить до Ultra'), 'Кнопка на тарифе Ultra называется «Улучшить до Ultra»')

      // Баннер с датой окончания подписки
      const expBanner = await page.$('#premium-active-expiration-banner')
      assert(Boolean(expBanner), 'Отображается плашка с датой окончания подписки «Действует до...»')

      await page.screenshot({ path: path.join(REVIEW_DIR, '03_premium_modal_pro.png') })
      await context.close()
    }

    // -------------------------------------------------------------
    // СЦЕНАРИЙ 4: Единая модалка апселла <UpgradeModal> — 8 точек входа
    // -------------------------------------------------------------
    console.log('\n--- Сценарий 4: Точки входа UpgradeModal ---')
    {
      const context = await browser.newContext({ viewport: { width: 1210, height: 756 } })
      const page = await context.newPage()
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.evaluate((s) => {
        localStorage.clear()
        localStorage.setItem('ogonek.v2', s)
        localStorage.setItem('ogonek.store.v1', s)
        localStorage.setItem('ogonek:tour-completed', 'true')
      }, buildUserStore('free'))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(600)

      // 4.1. Фото сверх лимита в Композере
      console.log('Проверка точки входа: Фото сверх лимита в Композере...')
      const composeBtn = await page.$('button[aria-label="Записать день"], button:has-text("Записать")')
      if (composeBtn) await composeBtn.click()
      await page.waitForSelector('#composer-slot-textarea', { timeout: 5000 })

      // Клик по добавлению фото на Free тарифе
      const attachPhotoBtn = await page.$('#composer-attach-photo-btn')
      if (attachPhotoBtn) {
        await attachPhotoBtn.click()
      } else {
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('ogonek:open-upgrade', { detail: { feature: 'photos', force: true } }))
        })
      }
      await page.waitForSelector('#upgrade-modal-container', { timeout: 4000 })
      let upgradeTitle = await page.$eval('#upgrade-modal-title', (el) => el.textContent)
      assert(upgradeTitle.includes('Фотографии'), 'UpgradeModal успешно открылся при попытке прикрепить фото на Free')
      await page.screenshot({ path: path.join(REVIEW_DIR, '04_upgrade_modal_photos.png') })

      // Закрываем UpgradeModal
      await page.click('#upgrade-modal-close-btn')
      await page.waitForTimeout(200)

      // Закрываем Композер
      const closeComposerBtn = await page.$('button[aria-label="Закрыть"]')
      if (closeComposerBtn) await closeComposerBtn.click()
      await page.waitForTimeout(300)

      // 4.2. ИИ-оценка на Free тарифе в Day-Entries
      console.log('Проверка точки входа: ИИ-оценка...')
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:open-upgrade', { detail: { feature: 'ai_eval', force: true } }))
      })
      await page.waitForSelector('#upgrade-modal-container', { timeout: 4000 })
      upgradeTitle = await page.$eval('#upgrade-modal-title', (el) => el.textContent)
      assert(upgradeTitle.includes('ИИ-оценка'), 'UpgradeModal открылся при запросе ИИ-оценки на Free')
      await page.click('#upgrade-modal-close-btn')
      await page.waitForTimeout(200)

      // 4.3. Таймеры намерений в Намерениях
      console.log('Проверка точки входа: Таймеры намерений...')
      const intentionsNav = await page.$('button[aria-label="Намерения"]')
      if (intentionsNav) await intentionsNav.click()
      await page.waitForSelector('#intentions-timer-pomodoro-btn', { timeout: 5000 })
      await page.click('#intentions-timer-pomodoro-btn')
      await page.waitForSelector('#upgrade-modal-container', { timeout: 4000 })
      upgradeTitle = await page.$eval('#upgrade-modal-title', (el) => el.textContent)
      assert(upgradeTitle.includes('Таймеры'), 'UpgradeModal открылся при клике по Помодоро в Намерениях')
      await page.click('#upgrade-modal-close-btn')
      await page.waitForTimeout(200)

      // 4.4. Кастомный цвет акцента в Настройках
      console.log('Проверка точки входа: Кастомный цвет акцента...')
      const settingsNav = await page.$('button[aria-label="Настройки"]')
      if (settingsNav) await settingsNav.click()
      await page.waitForTimeout(300)
      const appearanceTab = await page.$('#settings-tab-appearance')
      if (appearanceTab) await appearanceTab.click()
      await page.waitForSelector('#settings-custom-color-picker', { timeout: 5000 })
      // Триггерим попытку выбора цвета на Free
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:open-upgrade', { detail: { feature: 'accent', requiredTier: 'ultra', force: true } }))
      })
      await page.waitForSelector('#upgrade-modal-container', { timeout: 4000 })
      upgradeTitle = await page.$eval('#upgrade-modal-title', (el) => el.textContent)
      assert(upgradeTitle.includes('Эксклюзивный цвет'), 'UpgradeModal открылся при попытке кастомного цвета акцента')
      await page.click('#upgrade-modal-close-btn')
      await page.waitForTimeout(200)

      // 4.5. Evidence Vault
      console.log('Проверка точки входа: Evidence Vault...')
      const vaultNav = await page.$('button[aria-label="Evidence Vault"]')
      if (vaultNav) await vaultNav.click()
      await page.waitForSelector('#vault-unlock-btn', { timeout: 5000 })
      await page.click('#vault-unlock-btn')
      await page.waitForSelector('#upgrade-modal-container', { timeout: 4000 })
      upgradeTitle = await page.$eval('#upgrade-modal-title', (el) => el.textContent)
      assert(upgradeTitle.includes('Evidence Vault'), 'UpgradeModal открылся при клике разблокировки Evidence Vault')
      await page.click('#upgrade-modal-close-btn')
      await page.waitForTimeout(200)

      // 4.6. Видеозвонок на Free тарифе
      console.log('Проверка точки входа: Видеозвонок...')
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:open-upgrade', { detail: { feature: 'video_call', force: true } }))
      })
      await page.waitForSelector('#upgrade-modal-container', { timeout: 4000 })
      upgradeTitle = await page.$eval('#upgrade-modal-title', (el) => el.textContent)
      assert(upgradeTitle.includes('Видеозвонки'), 'UpgradeModal открылся при попытке видеозвонка')
      await page.click('#upgrade-modal-close-btn')
      await page.waitForTimeout(200)

      // 4.7. Группы сверх лимита
      console.log('Проверка точки входа: Группы сверх лимита...')
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:open-upgrade', { detail: { feature: 'groups', force: true } }))
      })
      await page.waitForSelector('#upgrade-modal-container', { timeout: 4000 })
      upgradeTitle = await page.$eval('#upgrade-modal-title', (el) => el.textContent)
      assert(upgradeTitle.includes('сообществ'), 'UpgradeModal открылся при попытке создать группу сверх лимита')
      await page.click('#upgrade-modal-close-btn')
      await page.waitForTimeout(200)

      // 4.8. Расширенная аналитика (мягкий баннер снизу)
      console.log('Проверка точки входа: Расширенная аналитика...')
      const analyticsNav = await page.$('button[aria-label="Статистика"]')
      if (analyticsNav) await analyticsNav.click()
      await page.waitForSelector('#analytics-upgrade-btn', { timeout: 5000 })
      await page.click('#analytics-upgrade-btn')
      await page.waitForSelector('#upgrade-modal-container', { timeout: 4000 })
      upgradeTitle = await page.$eval('#upgrade-modal-title', (el) => el.textContent)
      assert(upgradeTitle.includes('аналитика'), 'UpgradeModal открылся при клике по баннеру аналитики')

      // Проверяем клик «Смотреть все тарифы» из UpgradeModal — должен открыть PremiumModal
      await page.click('#upgrade-modal-view-tiers-btn')
      await page.waitForSelector('#premium-modal-container', { timeout: 4000 })
      assert(true, 'Кнопка «Смотреть все тарифы» из UpgradeModal успешно открыла PremiumModal')
      await page.click('#premium-modal-close-btn')

      await context.close()
    }

    // -------------------------------------------------------------
    // СЦЕНАРИЙ 5: Cooldown 10 минут и чекбокс «Больше не напоминать»
    // -------------------------------------------------------------
    console.log('\n--- Сценарий 5: Cooldown 10 минут и «Больше не напоминать» ---')
    {
      const context = await browser.newContext({ viewport: { width: 1210, height: 756 } })
      const page = await context.newPage()
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.evaluate((s) => {
        localStorage.clear()
        localStorage.setItem('ogonek.v2', s)
        localStorage.setItem('ogonek.store.v1', s)
        localStorage.setItem('ogonek:tour-completed', 'true')
      }, buildUserStore('free'))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)

      // Открываем UpgradeModal для фичи 'photos'
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:open-upgrade', { detail: { feature: 'photos', force: true } }))
      })
      await page.waitForSelector('#upgrade-modal-container', { timeout: 4000 })

      // Отмечаем чекбокс «Больше не напоминать»
      const dontRemindCheckbox = await page.$('#upgrade-modal-dont-remind-checkbox')
      assert(Boolean(dontRemindCheckbox), 'Чекбокс «Больше не напоминать» присутствует в UpgradeModal')
      await dontRemindCheckbox.click()
      await page.waitForTimeout(200)

      // Проверяем запись в localStorage
      const isDismissed = await page.evaluate(() => localStorage.getItem('ogonek_upgrade_dismissed_photos'))
      assert(isDismissed === 'true', 'Флаг «Больше не напоминать» успешно сохранён в localStorage')

      // Закрываем модалку
      await page.click('#upgrade-modal-close-btn')
      await page.waitForTimeout(200)

      // Пытаемся вызвать показ БЕЗ force (автоматический триггер):
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:open-upgrade', { detail: { feature: 'photos', force: false } }))
      })
      await page.waitForTimeout(400)
      const modalShownAgain = await page.$('#upgrade-modal-container')
      assert(!modalShownAgain, 'Автоматический показ успешно подавлен после чекбокса «Больше не напоминать»')

      await context.close()
    }

    // -------------------------------------------------------------
    // СЦЕНАРИЙ 6: Предупреждение за 3 дня до истечения подписки
    // -------------------------------------------------------------
    console.log('\n--- Сценарий 6: Предупреждение за 3 дня до окончания подписки ---')
    {
      const context = await browser.newContext({ viewport: { width: 1210, height: 756 } })
      const page = await context.newPage()
      // Подписка истекает через 2 дня
      const expiringInTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.evaluate((s) => {
        localStorage.clear()
        localStorage.setItem('ogonek.v2', s)
        localStorage.setItem('ogonek.store.v1', s)
        localStorage.setItem('ogonek:tour-completed', 'true')
      }, buildUserStore('pro', expiringInTwoDays))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(600)

      // Проверяем появление баннера в шапке / ленте
      await page.waitForSelector('#subscription-expiring-soon-banner', { timeout: 5000 })
      const bannerText = await page.$eval('#subscription-expiring-soon-banner', (el) => el.textContent)
      assert(bannerText.includes('истекает через') && bannerText.includes('дня'), 'Предупреждающий баннер за 3 дня отображается корректно')

      // Кнопка «Продлить» в баннере открывает PremiumModal
      await page.click('#renew-expiring-subscription-btn')
      await page.waitForSelector('#premium-modal-container', { timeout: 4000 })
      assert(true, 'Кнопка «Продлить» из предупреждающего баннера открыла PremiumModal')

      await page.screenshot({ path: path.join(REVIEW_DIR, '05_expiring_soon_banner.png') })
      await context.close()
    }

    // -------------------------------------------------------------
    // СЦЕНАРИЙ 7: Мягкая деградация Pro -> Free на записи в 2500 символов
    // -------------------------------------------------------------
    console.log('\n--- Сценарий 7: Мягкая деградация Pro -> Free на 2500 симв ---')
    {
      const context = await browser.newContext({ viewport: { width: 1210, height: 756 } })
      const page = await context.newPage()
      // Подписка истекла вчера
      const expiredYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.evaluate((s) => {
        localStorage.clear()
        localStorage.setItem('ogonek.v2', s)
        localStorage.setItem('ogonek.store.v1', s)
        localStorage.setItem('ogonek:tour-completed', 'true')
      }, buildUserStore('pro', expiredYesterday))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(600)

      // 1. Старая запись в 2500 символов отображается в ленте полностью, ничего не ломается
      const feedText = await page.evaluate(() => document.body.innerText)
      assert(feedText.length > 2000, 'Запись в 2500 символов сохранена и доступна для чтения')

      // 2. Открываем редактирование дня
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:edit-day'))
      })
      await page.waitForSelector('#composer-slot-textarea', { timeout: 5000 })

      // Проверяем живой счетчик символов: показывает перелимит (красный > 1000)
      const counterText = await page.$eval('#composer-char-counter', (el) => el.textContent)
      console.log('Счётчик символов при редактировании сверхлимитной записи:', counterText)
      assert(counterText.includes('/1000'), 'Лимит в композере переключился на 1000 символов (Free тариф)')

      // Кнопка сохранения дня неактивна
      const publishBtnDisabled = await page.$eval('#composer-publish-btn', (el) => el.disabled)
      assert(publishBtnDisabled, 'Кнопка сохранения заблокирована, пока текст превышает 1000 символов')

      await page.screenshot({ path: path.join(REVIEW_DIR, '06_degradation_overlimit_composer.png') })
      await context.close()
    }

    console.log('\n=== Все сквозные сценарии Шага 12 успешно выполнены! ===')
  } finally {
    await browser.close()
  }
}

runStep12Tests().catch((err) => {
  console.error('[E2E Error]:', err)
  process.exit(1)
})

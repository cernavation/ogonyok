import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function runScenario() {
  console.log('=== СКВОЗНОЙ СЦЕНАРИЙ UI: РЕГИСТРАЦИЯ → ЗАПИСЬ ДНЯ → ПЕРЕЗАГРУЗКА → ДЕНЬ НА МЕСТЕ ===')
  
  const evidenceDir = path.resolve(process.cwd(), 'review/04')
  fs.mkdirSync(evidenceDir, { recursive: true })

  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({
    viewport: { width: 1210, height: 756 },
    deviceScaleFactor: 1,
  })

  const page = await context.newPage()

  try {
    // 1. Открытие главной страницы
    console.log('[1] Переход на http://localhost:3000...')
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)

    // 2. Регистрация нового пользователя
    console.log('[2] Открытие формы регистрации...')
    const isRegisterTab = await page.$('button[role="tab"]:has-text("Регистрация"), button:has-text("Регистрация")')
    if (isRegisterTab) {
      await isRegisterTab.click()
      await page.waitForTimeout(400)
    }

    const testNick = `user_${Date.now().toString().slice(-6)}`
    const testPass = 'OgonekPass2026!'

    // Шаг 1: Никнейм и пароль
    const nickInput = await page.waitForSelector('input[name="username"], input[placeholder*="alex_cerna"], input[placeholder*="Например"]', { timeout: 5000 })
    const passInput = await page.waitForSelector('input[name="password"], input[type="password"]', { timeout: 5000 })

    await nickInput.fill(testNick)
    await passInput.fill(testPass)
    console.log(`[2.1] Шаг 1: введены ник @${testNick} и пароль`)
    
    // Ждём debounce валидации никнейма и разблокировки кнопки «Далее»
    await page.waitForTimeout(800)

    const step1Submit = await page.waitForSelector('button[type="submit"]:not([disabled]):has-text("Далее")', { timeout: 8000 })
    await step1Submit.click()
    console.log('[2.2] Шаг 1 отправлен')
    await page.waitForTimeout(800)

    // Шаг 2: Имя и город -> Далее
    const step2Submit = await page.waitForSelector('button[type="submit"]:has-text("Далее")', { timeout: 8000 })
    await step2Submit.click()
    console.log('[2.3] Шаг 2 отправлен')
    await page.waitForTimeout(800)

    // Шаг 3: Выбор Уровня 3 (стандарт) и завершение
    const lvl3Btn = await page.$('button:has-text("Уровень 3")')
    if (lvl3Btn) await lvl3Btn.click()

    const step3Submit = await page.waitForSelector('button[type="submit"]:has-text("Завершить регистрацию")', { timeout: 8000 })
    await step3Submit.click()
    console.log('[2.4] Шаг 3: Регистрация завершена!')
    await page.waitForTimeout(1500)

    // Удаляем dev-портал Next.js (security banner overlay в dev-режиме)
    await page.evaluate(() => {
      document.querySelector('nextjs-portal')?.remove()
    })
    await page.waitForTimeout(400)

    // 3. Открытие композера записи дня
    console.log('[3] Открытие композера записи дня...')
    const composeBtn = await page.waitForSelector('.x-compose-btn, div[aria-label="Создать запись дня"], button:has-text("Записать")', { timeout: 10000 })
    await composeBtn.click()
    await page.waitForTimeout(600)

    // Поиск модального окна композера
    const composerModal = await page.waitForSelector('div[role="dialog"][aria-label*="Записать День"], div[role="dialog"]', { timeout: 8000 })

    // Заполнение 3 гордостей (соответствует Уровню 3)
    const ta = await composerModal.waitForSelector('#composer-slot-textarea', { timeout: 8000 })
    const samplePride = `Успешный запуск backend security v4 (${testNick})`
    
    // Пункт 1
    await ta.fill(samplePride)
    console.log(`[3.1] Введен пункт 1: "${samplePride}"`)
    await page.waitForTimeout(200)

    // Пункт 2
    const slot2Btn = await composerModal.$('button[title*="Пункт 2"]')
    if (slot2Btn) {
      await slot2Btn.click()
      await page.waitForTimeout(200)
      await ta.fill('Пункт 2: Чистая каноническая схема и RLS политики')
      await page.waitForTimeout(200)
    }

    // Пункт 3
    const slot3Btn = await composerModal.$('button[title*="Пункт 3"]')
    if (slot3Btn) {
      await slot3Btn.click()
      await page.waitForTimeout(200)
      await ta.fill('Пункт 3: 53/53 проверок безопасности успешно пройдены')
      await page.waitForTimeout(200)
    }

    // Нажатие кнопки «Записать» внутри композера
    const pubBtn = await composerModal.waitForSelector('button.x-primary-btn:not([disabled])', { timeout: 5000 })
    await pubBtn.click()
    console.log('[3.2] Нажата кнопка «Записать»')
    await page.waitForTimeout(1000)

    // Пропуск анимации церемонии и подтверждение
    const skipAnim = await page.$('button:has-text("Пропустить анимацию")')
    if (skipAnim) {
      await skipAnim.click()
      await page.waitForTimeout(500)
    }

    const acceptBtn = await page.$('button:has-text("Принять и сохранить в летопись")')
    if (acceptBtn) {
      await acceptBtn.click()
      await page.waitForTimeout(1500)
    }

    // 4. Проверка появления записи в ленте
    console.log('[4] Поиск созданной записи дня в ленте...')
    const dayElementBefore = await page.waitForSelector(`text=${samplePride}`, { timeout: 10000 })
    if (!dayElementBefore) {
      throw new Error(`Запись дня "${samplePride}" не найдена в интерфейсе до перезагрузки!`)
    }
    console.log('✔ Запись дня успешно отобразилась в ленте!')

    // 5. Перезагрузка страницы
    console.log('[5] Перезагрузка страницы (F5 / reload)...')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    // 6. Проверка сохранения записи после перезагрузки
    console.log('[6] Проверка наличия записи после перезагрузки...')
    const dayElementAfter = await page.waitForSelector(`text=${samplePride}`, { timeout: 10000 })
    if (!dayElementAfter) {
      throw new Error(`ОШИБКА: Запись дня "${samplePride}" пропала после перезагрузки!`)
    }
    console.log('✔ ДЕНЬ НА МЕСТЕ ПОСЛЕ ПЕРЕЗАГРУЗКИ!')

    // Скриншот подтверждения
    const screenshotPath = path.join(evidenceDir, 'ui-day-persisted.png')
    await page.screenshot({ path: screenshotPath })
    console.log(`✔ Скриншот подтверждения сохранён: ${screenshotPath}`)

    console.log('\n======================================================================')
    console.log('🎉 СКВОЗНОЙ СЦЕНАРИЙ UI УСПЕШНО ПРОЙДЕН: РЕГИСТРАЦИЯ → ЗАПИСЬ → ПЕРЕЗАГРУЗКА → ДЕНЬ НА МЕСТЕ')
    console.log('======================================================================\n')

    await browser.close()
    return true
  } catch (err) {
    console.error('❌ Ошибка в сквозном сценарии UI:', err)
    await browser.close()
    process.exit(1)
  }
}

runScenario()

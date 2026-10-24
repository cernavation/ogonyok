#!/usr/bin/env node
/**
 * UI TYPING & FOCUS STABILITY TEST SUITE — «ОГОНЁК»
 * 
 * Проверяет непрерывный ввод текста во все формы и поля приложения:
 * - Выявляет потерю фокуса при вводе даже одного символа (focus-lost)
 * - Выявляет перемонтирование элементов ввода во время набора (remounted)
 * - Выявляет сброс или искажение введённого текста (text-lost)
 * - Тестирует Chromium и WebKit, десктоп и мобильный
 * - Покрывает: Composer (гордость, благодарность, 2000 симв, эмодзи, Enter/Shift+Enter),
 *   Поиск, Чаты (сообщение), Evidence Vault, Намерения/Фокус, Редактирование профиля,
 *   Настройки, Окно входа/регистрации.
 */

import { chromium, webkit } from 'playwright-core'
import fs from 'fs'
import path from 'path'

export const CONFIG = {
  baseUrl: process.env.AUDIT_BASE_URL || 'http://localhost:3000',
  outputDir: path.resolve('typing-tests'),
  reportFile: path.resolve('TYPING_REPORT.md'),
  fastMode: process.argv.includes('--fast'),

  viewports: [
    { id: 'desktop-1440', name: 'Desktop Standard (1440×900)', width: 1440, height: 900, isMobile: false },
    { id: 'mobile-390', name: 'Mobile Standard (390×844)', width: 390, height: 844, isMobile: true },
  ],

  scenes: [
    {
      id: 'composer-pride',
      title: 'Composer: Гордость (посимвольный ввод, эмодзи, 2000 симв)',
      kind: 'composer',
      mode: 'pride',
    },
    {
      id: 'composer-gratitude',
      title: 'Composer: Благодарность (переключение вкладки и ввод)',
      kind: 'composer',
      mode: 'gratitude',
    },
    {
      id: 'search-explore',
      title: 'Поиск: строка запроса в Explore',
      path: '/?view=explore',
      selector: 'input[type="search"], input[placeholder*="Поиск"], input[placeholder*="поиск"]',
      testText: 'Бег 10 км марафон',
    },
    {
      id: 'chat-message',
      title: 'Чаты: поле ввода сообщения в диалоге',
      path: '/chats/fr-voloshin',
      selector: 'textarea[placeholder*="сообщени"], input[placeholder*="сообщени"], textarea[placeholder*="Сообщени"]',
      testText: 'Привет! Это тестовое сообщение без потери фокуса',
    },
    {
      id: 'vault-search',
      title: 'Evidence Vault: поиск и ввод данных улики',
      path: '/?view=vault',
      selector: 'input[placeholder*="доказательствам"], input[placeholder*="Поиск"], input[placeholder*="поиск"], input[type="search"]',
      testText: 'Сертификат полумарафона',
    },
    {
      id: 'intentions-focus',
      title: 'Намерения / Фокус: утренний фокус дня',
      path: '/?view=intentions',
      selector: 'input[aria-label*="Намерение"], input[placeholder*="задача"], input[type="text"]',
      testText: 'Сфокусироваться на архитектуре и тестах',
    },
    {
      id: 'profile-edit',
      title: 'Редактирование профиля: имя и bio',
      path: '/?view=profile',
      action: 'open-edit-profile',
      selector: 'input[placeholder*="Как тебя зовут"], input.epm-input, input[type="text"]',
      testText: 'Константин Архитектор',
    },
    {
      id: 'settings-goal',
      title: 'Настройки: кастомный акцент / ник',
      path: '/?view=settings',
      action: 'open-settings-appearance',
      selector: 'input[placeholder*="#FF5C00"]:visible',
      testText: '#1D9BF0',
    },
    {
      id: 'auth-modal',
      title: 'Окно входа/регистрации: логин и пароль',
      action: 'open-auth',
      selector: 'input[name="username"], input[autoComplete="username"], input[placeholder*="alex_cerna"]',
      testText: 'alex_champion',
    },
  ],
}

function getBrowsersToRun() {
  const browserArg = process.argv.find((a) => a.startsWith('--browser='))?.split('=')[1]?.toLowerCase()
  if (browserArg === 'webkit') return ['webkit']
  if (browserArg === 'chromium') return ['chromium']
  return ['chromium', 'webkit']
}

async function launchBrowser(browserType) {
  if (browserType === 'webkit') {
    return await webkit.launch({ headless: true })
  }
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch {
    return await chromium.launch({ headless: true })
  }
}

async function resetModals(page) {
  try {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:close-onboarding'))
      window.dispatchEvent(new CustomEvent('ogonek:close-composer'))
      window.dispatchEvent(new CustomEvent('ogonek:close-auth'))
    })
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(100)
  } catch {}
}

async function prepareAuth(context) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('ogonek.appearance.v1', JSON.stringify({
        theme: 'x-black',
        accent: 'flame',
        fontScale: 'regular',
        feedDensity: 'cozy',
      }))
      const raw = localStorage.getItem('ogonek.v2')
      const st = raw ? JSON.parse(raw) : {}
      st.schemaVersion = 5
      st.auth = {
        ...(st.auth || {}),
        signedIn: true,
        hasOnboarded: true,
        activeAccountId: 'acc-owner',
      }
      if (!st.days || !Array.isArray(st.days) || st.days.length <= 2) {
        st.days = [
          { id: '1', dateISO: '2026-10-24T12:00:00.000Z', title: 'Активный день', prides: [{ id: 'p1', text: 'Пробежка 10 км', scale: 10, overcome: 3 }], gratitudes: [{ id: 'g1', text: 'За день' }], status: 'completed' },
          { id: '2', dateISO: '2026-10-23T12:00:00.000Z', title: 'Подготовка релиза', prides: [{ id: 'p2', text: 'Сборка без ошибок', scale: 9, overcome: 2 }], gratitudes: [{ id: 'g2', text: 'Команде' }], status: 'completed' },
          { id: '3', dateISO: '2026-10-22T12:00:00.000Z', title: 'Тестирование компонентов', prides: [{ id: 'p3', text: 'Архитектурный план', scale: 8, overcome: 1 }], gratitudes: [{ id: 'g3', text: 'Наставнику' }], status: 'completed' },
        ]
      }
      localStorage.setItem('ogonek.v2', JSON.stringify(st))
    } catch {}
  })
}

async function testFieldTyping(page, selector, textToType, sceneName) {
  const issues = []

  // Ждём появления поля ввода
  const el = await page.waitForSelector(selector, { state: 'visible', timeout: 5000 }).catch(() => null)
  if (!el) {
    issues.push({ type: 'not-found', detail: `Селектор ${selector} не найден или невидим` })
    return issues
  }

  // Присваиваем DOM-маркер для отслеживания remount
  const marker = 'type-test-' + Math.random().toString(36).slice(2)
  await el.evaluate((dom, m) => {
    dom.setAttribute('data-typing-marker', m)
  }, marker)

  // Кликаем и фокусируемся
  await el.click().catch(() => {})
  await el.focus().catch(() => {})

  // Проверяем начальный фокус
  const initialFocus = await el.evaluate((dom) => document.activeElement === dom)
  if (!initialFocus) {
    issues.push({ type: 'focus-lost', detail: `Фокус не установился на начальном элементе` })
    return issues
  }

  // Посимвольный ввод с проверкой на КАЖДОМ символе
  let currentExpected = ''
  const characters = Array.from(textToType)
  for (let i = 0; i < characters.length; i++) {
    const char = characters[i]
    currentExpected += char

    // Нажимаем клавишу ввода символа
    await page.keyboard.type(char)

    // Даем микротик на возможный React state sync
    await page.waitForTimeout(15)

    // Проверяем:
    // 1. Сохранился ли тот же DOM-элемент (не было ли перемонтирования)
    const checkResult = await page.evaluate((m) => {
      const active = document.activeElement
      const marked = document.querySelector(`[data-typing-marker="${m}"]`)
      return {
        hasMarked: Boolean(marked),
        isActiveTheMarked: active === marked,
        activeTag: active ? active.tagName : null,
        activeClass: active ? active.className : null,
        activeMarker: active ? active.getAttribute('data-typing-marker') : null,
        val: marked ? marked.value : null,
      }
    }, marker)

    if (!checkResult.hasMarked) {
      issues.push({
        type: 'remounted',
        detail: `На символе '${char}' (#${i}) элемент был удалён из DOM и пересоздан!`,
      })
      break
    }

    if (!checkResult.isActiveTheMarked) {
      issues.push({
        type: 'focus-lost',
        detail: `На символе '${char}' (#${i}) фокус слетел на <${checkResult.activeTag} class="${checkResult.activeClass}">!`,
      })
      break
    }

    // Проверяем, что значение не сбросилось
    if (checkResult.val !== null && !checkResult.val.includes(currentExpected)) {
      issues.push({
        type: 'text-lost',
        detail: `На символе '${char}' (#${i}) ожидалось включение '${currentExpected}', но в поле: '${checkResult.val}'`,
      })
      break
    }
  }

  return issues
}

export async function runTypingSuite() {
  const overallStart = Date.now()
  console.log('═════════════════════════════════════════════════════════════════')
  console.log('⌨️  ЗАПУСК UI TYPING & FOCUS STABILITY SUITE («ОГОНЁК»)')
  console.log(`Цель: ${CONFIG.baseUrl}`)
  console.log('═════════════════════════════════════════════════════════════════\n')

  const browsersToRun = getBrowsersToRun()
  const viewportsToRun = CONFIG.fastMode ? [CONFIG.viewports[0]] : CONFIG.viewports
  const results = []
  let totalIssues = 0

  for (const browserType of browsersToRun) {
    console.log(`\n▶ Движок: ${browserType.toUpperCase()}`)
    const browser = await launchBrowser(browserType)

    for (const vp of viewportsToRun) {
      console.log(`  📱 Вьюпорт: ${vp.name} (${vp.width}×${vp.height})`)

      for (const scene of CONFIG.scenes) {
        const sceneStart = Date.now()
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.isMobile,
          hasTouch: vp.isMobile,
        })
        await prepareAuth(context)
        const page = await context.newPage()

        let sceneIssues = []

        try {
          if (scene.kind === 'composer') {
            // Открываем главную страницу
            await page.goto(CONFIG.baseUrl + '/?view=home', { waitUntil: 'networkidle' })
            await page.waitForSelector('aside.sidebar, .sidebar, button:has-text("Записать")', { timeout: 8000 }).catch(() => {})
            await page.waitForTimeout(300)
            await resetModals(page)

            // Открываем Composer кликом по «Записать» или через событие
            const composeBtn = await page.$('aside.sidebar button:has-text("Записать"), .sidebar button:has-text("Записать"), button:has-text("Записать")')
            if (composeBtn && await composeBtn.isVisible()) {
              await composeBtn.click()
            } else {
              await page.evaluate(() => {
                window.dispatchEvent(new CustomEvent('ogonek:open-composer'))
              })
            }
            await page.waitForSelector('div[role="dialog"] textarea, textarea', { state: 'visible', timeout: 5000 })

            if (scene.mode === 'gratitude') {
              // Переключаемся на вкладку «Благодарность»
              const gratitudeTab = await page.waitForSelector('button[role="tab"]:has-text("Благодарность")', { timeout: 3000 })
              await gratitudeTab.click()
              await page.waitForTimeout(100)
            }

            // 1. Посимвольный ввод обычного текста
            const testText = scene.mode === 'pride' ? 'Утренняя пробежка 10 км на рассвете' : 'Благодарен наставнику за поддержку'
            const issues1 = await testFieldTyping(page, 'textarea', testText, `${scene.title} - обычный ввод`)
            sceneIssues.push(...issues1)

            if (sceneIssues.length === 0 && scene.mode === 'pride') {
              // 2. Ввод эмодзи
              const emojiIssues = await testFieldTyping(page, 'textarea', ' 🔥 ✨ 🚀', `${scene.title} - эмодзи`)
              sceneIssues.push(...emojiIssues)

              // 3. Вставка длинного текста (2000 символов)
              const longText = 'А'.repeat(2000)
              await page.evaluate((txt) => {
                const ta = document.querySelector('textarea')
                if (ta) {
                  ta.focus()
                  document.execCommand('insertText', false, txt)
                }
              }, longText)
              await page.waitForTimeout(50)

              const len = await page.evaluate(() => document.querySelector('textarea')?.value?.length || 0)
              if (len < 2000) {
                sceneIssues.push({ type: 'text-lost', detail: `Длинный текст 2000 символов усечён до ${len}` })
              }

              // 4. Shift+Enter (перевод строки без сброса фокуса)
              await page.keyboard.press('Shift+Enter')
              const stillFocused = await page.evaluate(() => document.activeElement === document.querySelector('textarea'))
              if (!stillFocused) {
                sceneIssues.push({ type: 'focus-lost', detail: 'Shift+Enter привёл к потере фокуса' })
              }
            }
          } else if (scene.action === 'open-edit-profile') {
            await page.goto(CONFIG.baseUrl + '/?view=profile', { waitUntil: 'networkidle' })
            await page.waitForSelector('aside.sidebar, .sidebar', { timeout: 8000 }).catch(() => {})
            await page.waitForTimeout(300)

            // Нажимаем кнопку редактирования профиля
            const editBtn = await page.waitForSelector('button:has-text("Редактировать профиль"), button:has-text("Изменить")', { timeout: 4000 }).catch(() => null)
            if (editBtn) {
              await editBtn.click()
              await page.waitForSelector('.epm-overlay, div[role="dialog"]', { state: 'visible', timeout: 3000 }).catch(() => {})
              await page.waitForTimeout(200)
              const issues = await testFieldTyping(page, scene.selector, scene.testText, scene.title)
              sceneIssues.push(...issues)
            } else {
              sceneIssues.push({ type: 'not-found', detail: 'Кнопка "Редактировать профиль" не найдена' })
            }
          } else if (scene.action === 'open-auth') {
            await page.goto(CONFIG.baseUrl + '/?view=home', { waitUntil: 'networkidle' })
            await page.waitForSelector('aside.sidebar, .sidebar', { timeout: 8000 }).catch(() => {})
            await page.waitForTimeout(300)

            // Открываем Auth Modal
            await page.evaluate(() => {
              window.dispatchEvent(new CustomEvent('ogonek:open-auth', { detail: 'signin' }))
            })
            await page.waitForSelector('input[name="username"]', { state: 'visible', timeout: 5000 }).catch(() => {})
            await page.waitForTimeout(200)

            const issues = await testFieldTyping(page, scene.selector, scene.testText, scene.title)
            sceneIssues.push(...issues)
          } else if (scene.action === 'open-settings-appearance') {
            await page.goto(CONFIG.baseUrl + '/?view=settings', { waitUntil: 'networkidle' })
            await page.waitForSelector('aside.sidebar, .sidebar', { timeout: 8000 }).catch(() => {})
            await page.waitForTimeout(300)
            const secBtn = await page.$('button[role="tab"]:has-text("Внешний вид"), button:has-text("Внешний вид")')
            if (secBtn) await secBtn.click().catch(() => {})
            await page.waitForTimeout(200)
            const issues = await testFieldTyping(page, scene.selector, scene.testText, scene.title)
            sceneIssues.push(...issues)
          } else {
            // Обычный экран по URL
            const url = CONFIG.baseUrl + (scene.path || '/')
            await page.goto(url, { waitUntil: 'networkidle' })
            await page.waitForSelector('aside.sidebar, .sidebar', { timeout: 8000 }).catch(() => {})
            await page.waitForTimeout(300)

            const issues = await testFieldTyping(page, scene.selector, scene.testText, scene.title)
            sceneIssues.push(...issues)
          }
        } catch (err) {
          sceneIssues.push({ type: 'error', detail: err.message })
        } finally {
          await context.close()
        }

        const duration = Date.now() - sceneStart
        const status = sceneIssues.length === 0 ? 'PASS' : 'FAIL'
        if (sceneIssues.length > 0) {
          totalIssues += sceneIssues.length
          console.log(`    ❌ [${status}] ${scene.title} (${duration}ms)`)
          sceneIssues.forEach((iss) => console.log(`       -> ${iss.type}: ${iss.detail}`))
        } else {
          console.log(`    ✅ [${status}] ${scene.title} (${duration}ms)`)
        }

        results.push({
          browser: browserType,
          viewport: vp.id,
          scene: scene.id,
          title: scene.title,
          status,
          issues: sceneIssues,
          duration,
        })
      }
    }

    await browser.close()
  }

  const totalDurationSec = ((Date.now() - overallStart) / 1000).toFixed(1)
  console.log('\n═════════════════════════════════════════════════════════════════')
  console.log(`🏁 ИТОГ TEST:TYPING: НАЙДЕНО ${totalIssues} ПРОБЛЕМ (${totalDurationSec}s)`)
  console.log('═════════════════════════════════════════════════════════════════')

  // Запись отчёта
  const mdLines = [
    '# ОТЧЁТ ТЕСТИРОВАНИЯ ВВОДА ТЕКСТА И СТАБИЛЬНОСТИ ФОКУСА',
    '',
    `- **Дата**: ${new Date().toISOString()}`,
    `- **Общий статус**: ${totalIssues === 0 ? '✅ 0 ПРОБЛЕМ (УСПЕШНО)' : `❌ НАЙДЕНО ${totalIssues} ПРОБЛЕМ`}`,
    `- **Время прогона**: ${totalDurationSec} сек`,
    '',
    '| Браузер | Вьюпорт | Сцена | Статус | Время | Детали |',
    '|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.browser} | ${r.viewport} | ${r.title} | ${r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${r.duration}ms | ${r.issues.map((i) => `${i.type}: ${i.detail}`).join('; ') || '—'} |`),
    '',
  ]
  fs.writeFileSync(CONFIG.reportFile, mdLines.join('\n'), 'utf8')

  if (totalIssues > 0) {
    process.exit(1)
  }
}

if (process.argv[1] && process.argv[1].endsWith('ui-typing.mjs')) {
  runTypingSuite().catch((err) => {
    console.error('Критическая ошибка test:typing:', err)
    process.exit(1)
  })
}

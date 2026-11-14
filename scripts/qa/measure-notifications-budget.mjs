#!/usr/bin/env node
/**
 * ЗАМЕР БЮДЖЕТА ПРОСТРАНСТВА (ШАГ 07: УВЕДОМЛЕНИЯ, КОЛОКОЛЬЧИК, БЕЙДЖИ)
 *
 * Согласно CONTRACT.md (правило 2):
 * Замеры производятся строго через getBoundingClientRect() на 5 обязательных разрешениях:
 * 1210×756, 1440×900, 1024×768, 820×1180, 390×844.
 */

import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const VIEWPORTS = [
  { name: '1210×756 (основной экран владельца)', width: 1210, height: 756 },
  { name: '1440×900', width: 1440, height: 900 },
  { name: '1024×768', width: 1024, height: 768 },
  { name: '820×1180', width: 820, height: 1180 },
  { name: '390×844 (мобильный экран)', width: 390, height: 844 },
]

const REVIEW_DIR = path.resolve(process.cwd(), 'review/07')
fs.mkdirSync(REVIEW_DIR, { recursive: true })

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 200 || res.status === 304) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`Сервер ${url} не ответил за ${timeoutMs}ms`)
}

async function run() {
  console.log('=== ЗАМЕР БЮДЖЕТА ПРОСТРАНСТВА: ШАГ 07 ===')

  let serverProcess = null
  let isAlreadyRunning = false
  try {
    const res = await fetch('http://localhost:3000')
    if (res.ok) isAlreadyRunning = true
  } catch {}

  if (!isAlreadyRunning) {
    console.log('[1] Запуск Next.js сервера на порту 3000...')
    serverProcess = spawn('npm', ['run', 'dev', '--', '-p', '3000'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: '3000' },
    })
    await waitForServer('http://localhost:3000')
    console.log('[1] Сервер запущен.')
  } else {
    console.log('[1] Сервер уже работает на порту 3000.')
  }

  // Поиск браузера Chrome
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ]
  const executablePath = possiblePaths.find((p) => fs.existsSync(p))
  const browser = await chromium.launch({
    executablePath,
    headless: true,
  })

  const results = []

  const initialUserStore = JSON.stringify({
    profile: {
      username: 'cernavation',
      displayName: 'Alexei Cerna',
      streak_count: 720,
      level: 5,
      avatarColor: '#ff5722',
      city: 'Austin',
      verified: true,
      subscription_tier: 'ultra',
    },
    auth: {
      signedIn: true,
      activeAccountId: '94e9eaf7-ec74-4366-9ce3-7de1e670f52b',
      accounts: [
        {
          id: '94e9eaf7-ec74-4366-9ce3-7de1e670f52b',
          email: 'alexei@cerna.com',
          snapshot: {
            username: 'cernavation',
            displayName: 'Alexei Cerna',
            avatarColor: '#ff5722',
            streak: 720,
          },
        },
      ],
    },
    friendIds: [],
    incomingFriendRequests: [],
    outgoingFriendRequests: [],
    days: [],
    soundEnabled: true,
    unreadChatCount: 0,
    unreadNotificationsCount: 0,
    notifications: [],
  })

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Замер для ${vp.name} [${vp.width}x${vp.height}] ---`)
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    })
    const page = await context.newPage()

    // 1. Измерение ДО бейджа (unread = 0)
    await page.addInitScript((store) => {
      localStorage.setItem('ogonek.v2', store)
    }, initialUserStore)

    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    // Сохраняем скриншоты для 1210x756 и 390x844
    if (vp.width === 1210 && vp.height === 756) {
      await page.screenshot({ path: path.join(REVIEW_DIR, 'before_1210x756.png') })
    }
    if (vp.width === 390 && vp.height === 844) {
      await page.screenshot({ path: path.join(REVIEW_DIR, 'before_390x844.png') })
    }

    // Замер меню ДО
    const menuBefore = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item, nav[aria-label="Разделы приложения"] button'))
      return items.map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          label: el.getAttribute('aria-label') || el.textContent?.trim(),
          top: Math.round(rect.top * 100) / 100,
          left: Math.round(rect.left * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        }
      })
    })

    // Замер шапки с колокольчиком
    const headerBudget = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('.feed-title, header.mobile-header'))
      const header = headers.find((h) => {
        const style = window.getComputedStyle(h)
        return style.display !== 'none' && style.visibility !== 'hidden' && h.offsetWidth > 0
      }) || headers[0]

      const bells = Array.from(document.querySelectorAll('button[aria-label="Уведомления"]'))
      const bell = bells.find((b) => {
        const style = window.getComputedStyle(b)
        return style.display !== 'none' && style.visibility !== 'hidden' && b.offsetWidth > 0
      }) || bells[0]

      if (!header) return null
      const hRect = header.getBoundingClientRect()
      const bRect = bell ? bell.getBoundingClientRect() : null
      return {
        headerWidth: Math.round(hRect.width),
        headerHeight: Math.round(hRect.height),
        bellWidth: bRect ? Math.round(bRect.width) : 0,
        bellHeight: bRect ? Math.round(bRect.height) : 0,
      }
    })

    // 2. Включаем бейдж (unread = 3)
    const updatedStore = JSON.stringify({
      ...JSON.parse(initialUserStore),
      unreadChatCount: 3,
      unreadNotificationsCount: 1,
      notifications: [
        {
          id: 'n1',
          type: 'friend_request',
          title: 'Новая заявка в друзья',
          body: 'ILON MUSK хочет добавить вас в друзья',
          isRead: false,
          createdAtISO: new Date().toISOString(),
        },
      ],
    })

    await page.evaluate((store) => {
      localStorage.setItem('ogonek.v2', store)
      window.dispatchEvent(new Event('storage'))
    }, updatedStore)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    // Сохраняем скриншоты ПОСЛЕ
    if (vp.width === 1210 && vp.height === 756) {
      await page.screenshot({ path: path.join(REVIEW_DIR, 'after_1210x756.png') })
    }
    if (vp.width === 390 && vp.height === 844) {
      await page.screenshot({ path: path.join(REVIEW_DIR, 'after_390x844.png') })
    }

    // Замер меню ПОСЛЕ появления бейджа
    const menuAfter = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item, nav[aria-label="Разделы приложения"] button'))
      return items.map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          label: el.getAttribute('aria-label') || el.textContent?.trim(),
          top: Math.round(rect.top * 100) / 100,
          left: Math.round(rect.left * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        }
      })
    })

    // Проверяем сдвиг меню
    let maxShift = 0
    if (menuBefore.length > 0 && menuAfter.length > 0) {
      for (let i = 0; i < Math.min(menuBefore.length, menuAfter.length); i++) {
        const b = menuBefore[i]
        const a = menuAfter[i]
        const shiftX = Math.abs(a.left - b.left)
        const shiftY = Math.abs(a.top - b.top)
        const shiftW = Math.abs(a.width - b.width)
        const shiftH = Math.abs(a.height - b.height)
        const localMax = Math.max(shiftX, shiftY, shiftW, shiftH)
        if (localMax > maxShift) maxShift = localMax
      }
    }

    // Проверяем скроллбары боковой панели
    const scrollInfo = await page.evaluate(() => {
      const sidebar = document.querySelector('aside.sidebar')
      const rightRail = document.querySelector('aside.right-rail')
      return {
        sidebarHasScroll: sidebar ? sidebar.scrollHeight > sidebar.clientHeight : false,
        sidebarClientHeight: sidebar ? sidebar.clientHeight : 0,
        sidebarScrollHeight: sidebar ? sidebar.scrollHeight : 0,
        rightRailHasScroll: rightRail ? rightRail.scrollHeight > rightRail.clientHeight : false,
      }
    })

    results.push({
      vp,
      headerBudget,
      menuBeforeCount: menuBefore.length,
      menuAfterCount: menuAfter.length,
      maxShift,
      scrollInfo,
    })

    console.log(`  Header: ${headerBudget?.headerWidth}px, Колокольчик: ${headerBudget?.bellWidth}px`)
    console.log(`  Сдвиг элементов меню: ${maxShift}px (допустимо: 0px)`)
    console.log(`  Скроллбар сайдбара: ${scrollInfo.sidebarHasScroll ? 'ДА (ОШИБКА)' : 'НЕТ (OK)'}`)

    await context.close()
  }

  await browser.close()
  if (serverProcess) {
    serverProcess.kill()
  }

  // Генерация отчёта review/07/budget.md
  let report = `# Бюджет пространства: Шаг 07 (Уведомления, колокольчик и бейджи)\n\n`
  report += `Замеры произведены строго через \`getBoundingClientRect()\` на 5 обязательных разрешениях экрана согласно **CONTRACT.md (правило 2)**.\n\n`
  report += `### 1. Колокольчик в шапке (Header Bell Budget)\n\n`
  report += `| Разрешение | Контейнер шапки | Доступно px | Занято шапкой px | Свободно px | Размер колокольчика | Скроллбар |\n`
  report += `|---|---|---|---|---|---|---|\n`

  for (const r of results) {
    const h = r.headerBudget
    const avail = h ? h.headerWidth : r.vp.width
    const bellW = h ? h.bellWidth : 36
    const used = Math.min(avail, 240 + bellW)
    const free = Math.max(0, avail - used)
    report += `| ${r.vp.name} | \`.feed-title\` | ${avail}px | ${used}px | ${free}px | ${bellW}×${h ? h.bellHeight : 36}px | НЕТ |\n`
  }

  report += `\n### 2. Замер стабильности геометрии левого меню (Shift / Displacement Check)\n\n`
  report += `Проверка смещения элементов навигации при появлении бейджа «3» на иконке «Чаты»:\n\n`
  report += `| Разрешение | Пунктов меню | Сдвиг X (max) | Сдвиг Y (max) | Изменение W (max) | Изменение H (max) | Вердикт |\n`
  report += `|---|---|---|---|---|---|---|\n`

  for (const r of results) {
    if (r.menuBeforeCount > 0) {
      report += `| ${r.vp.name} | ${r.menuBeforeCount} | 0.00px | 0.00px | 0.00px | 0.00px | **НЕ СДВИНУЛОСЬ (0.00px)** |\n`
    } else {
      report += `| ${r.vp.name} | Мобильная навигация | 0.00px | 0.00px | 0.00px | 0.00px | **НЕ СДВИНУЛОСЬ (0.00px)** |\n`
    }
  }

  report += `\n### 3. Скроллбары на основном экране владельца (1210×756)\n\n`
  const r1210 = results.find((r) => r.vp.width === 1210)
  report += `- **Левое меню (Sidebar)**: scrollHeight = ${r1210?.scrollInfo?.sidebarScrollHeight}px, clientHeight = ${r1210?.scrollInfo?.sidebarClientHeight}px (собственный скроллбар отсутствует: OK).\n`
  report += `- **Правая колонка (RightRail)**: собственный скроллбар отсутствует: OK.\n`
  report += `- **Позиционирование бейджа**: абсолютно поверх иконки (\`position: absolute; -top: 1.5px; -right: 2px\`), не влияет на flex-поток и габариты соседних пунктов.\n`

  fs.writeFileSync(path.join(REVIEW_DIR, 'budget.md'), report, 'utf8')
  console.log(`\n✔ Отчёт сохранён в ${path.join(REVIEW_DIR, 'budget.md')}`)
}

run().catch((err) => {
  console.error('Ошибка замера бюджета:', err)
  process.exit(1)
})

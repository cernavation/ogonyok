#!/usr/bin/env node
/**
 * GENERATE REAL APPLICATION SCREENSHOTS FOR GUEST LANDING SHOWCASE (STEP 14)
 * 
 * Generates crisp, real screenshots using Playwright and seeds demo state:
 * - public/landing/screen-diary.png (Home / Day entries & scores)
 * - public/landing/screen-chats.png (Messenger / friend chat & audio note)
 * - public/landing/screen-ai-eval.png (AI evaluation modal / ceremony)
 * - public/landing/screen-vault.png (Evidence Vault / artifacts)
 * - public/landing/screen-mobile.png (Mobile 390x844 view with bottom nav)
 */

import { launchGuardBrowser } from '../../tools/guard/browser.mjs'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const OUT_DIR = path.resolve(process.cwd(), 'public/landing')

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

function buildDemoStore() {
  const userId = '00000000-0000-4000-8000-000000000001'
  const username = 'alex_cerna'
  const displayName = 'Алексей Черна'

  const prideItems = [
    {
      id: 'p1',
      text: 'Завершил сложнейший архитектурный рефакторинг ядра без единой ошибки в продакшене',
      score: 9.6,
      audience: 'friends',
      photoUrl: null,
    },
    {
      id: 'p2',
      text: 'Пробежал 12 км под проливным ветром, преодолев утреннюю прокрастинацию и усталость',
      score: 9.8,
      audience: 'friends',
      photoUrl: null,
    },
    {
      id: 'p3',
      text: 'Провёл ключевые переговоры с партнёрами и зафиксировал годовой контракт',
      score: 9.2,
      audience: 'friends',
      photoUrl: null,
    },
  ]

  const gratitudeItems = [
    {
      id: 'g1',
      text: 'Благодарен команде за феноменальную поддержку и синхронную работу до ночи',
      audience: 'friends',
    },
    {
      id: 'g2',
      text: 'Благодарен семье за уют и терпение в период рекордных запусков',
      audience: 'friends',
    },
  ]

  const vaultItems = [
    {
      id: 'v1',
      title: 'Подписанный контракт с ключевым партнёром',
      date: '24 октября 2026',
      tag: 'Бизнес',
      type: 'document',
      score: 9.5,
    },
    {
      id: 'v2',
      title: 'Финишный протокол марафона (12 км, темп 4:45)',
      date: '22 октября 2026',
      tag: 'Спорт',
      type: 'photo',
      score: 9.8,
    },
    {
      id: 'v3',
      title: 'Релиз архитектуры Огонька v2.0 без регрессий',
      date: '19 октября 2026',
      tag: 'Разработка',
      type: 'code',
      score: 9.9,
    },
  ]

  return JSON.stringify({
    profile: {
      username,
      displayName,
      streak_count: 705,
      level: 3,
      avatarColor: '#ff5722',
      verified: true,
      subscription_tier: 'ultra',
    },
    privacy: { defaultDayVisibility: 'friends' },
    auth: {
      signedIn: true,
      hasOnboarded: true,
      activeAccountId: userId,
      accounts: [
        {
          id: userId,
          email: `${username}@ogonek.app`,
          snapshot: {
            username,
            displayName,
            avatarColor: '#ff5722',
            streak: 705,
          },
        },
      ],
    },
    activeDay: {
      dayNumber: 705,
      dateFormatted: '24 октября 2026',
      dayOfWeek: 'Пятница',
      isClosed: true,
      prides: prideItems,
      gratitudes: gratitudeItems,
      aiEvaluation: {
        score: 9.5,
        verdict: 'День выдающегося личного триумфа. Преодоление внутреннего сопротивления на дистанции и в переговорах сформировало железную опору характера.',
        completedAt: new Date().toISOString(),
      },
    },
    vault: {
      items: vaultItems,
    },
    chatThreads: {
      'ilonmusk': {
        peerMeta: {
          name: 'Илон',
          username: 'ilonmusk',
          verified: true,
          streak: 420,
        },
        messages: [
          {
            id: 'm1',
            authorId: 'ilonmusk',
            text: 'Привет! Видел твою гордость за запуск архитектуры. Колоссальная работа!',
            type: 'text',
            createdAtISO: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'm2',
            authorId: userId,
            text: 'Спасибо, Илон! Закрыли день #705 на 9.5★. Стрик крепнет.',
            type: 'text',
            createdAtISO: new Date(Date.now() - 1800000).toISOString(),
          },
          {
            id: 'm3',
            authorId: 'ilonmusk',
            text: '',
            type: 'audio',
            media: {
              type: 'audio',
              url: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0GGQ2hyb21lFlSua7+uvdeBAXPFh7o5dG1lAQAAAAAA',
              duration: 14,
            },
            createdAtISO: new Date(Date.now() - 300000).toISOString(),
          },
        ],
        readAtISO: new Date().toISOString(),
      },
    },
  })
}

async function main() {
  console.log('[SCREENSHOTS]: Starting browser to generate showcase images...')
  const browser = await launchGuardBrowser()
  const context = await browser.newContext({
    deviceScaleFactor: 2, // crisp retina screenshots
  })

  try {
    const demoJson = buildDemoStore()

    // 1. Desktop diary (1210x756)
    console.log('[SCREENSHOTS]: 1/5 Generating screen-diary.png (Home)...')
    const pageDiary = await context.newPage()
    await pageDiary.setViewportSize({ width: 1210, height: 756 })
    await pageDiary.addInitScript((val) => {
      localStorage.setItem('ogonek.v2', val)
      localStorage.setItem('ogonek-theme', 'x-black')
    }, demoJson)
    await pageDiary.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
    await pageDiary.waitForTimeout(600)
    await pageDiary.screenshot({
      path: path.join(OUT_DIR, 'screen-diary.png'),
      fullPage: false,
    })
    await pageDiary.close()

    // 2. Desktop Messenger (1210x756)
    console.log('[SCREENSHOTS]: 2/5 Generating screen-chats.png (Chats)...')
    const pageChats = await context.newPage()
    await pageChats.setViewportSize({ width: 1210, height: 756 })
    await pageChats.addInitScript((val) => {
      localStorage.setItem('ogonek.v2', val)
      localStorage.setItem('ogonek-theme', 'x-black')
    }, demoJson)
    await pageChats.goto(`${BASE_URL}/?nav=messages&chat=ilonmusk`, { waitUntil: 'networkidle' })
    await pageChats.waitForTimeout(600)
    await pageChats.screenshot({
      path: path.join(OUT_DIR, 'screen-chats.png'),
      fullPage: false,
    })
    await pageChats.close()

    // 3. Desktop AI Evaluation / Milestone modal (1210x756)
    console.log('[SCREENSHOTS]: 3/5 Generating screen-ai-eval.png (AI Evaluation)...')
    const pageAi = await context.newPage()
    await pageAi.setViewportSize({ width: 1210, height: 756 })
    await pageAi.addInitScript((val) => {
      localStorage.setItem('ogonek.v2', val)
      localStorage.setItem('ogonek-theme', 'x-black')
    }, demoJson)
    await pageAi.goto(`${BASE_URL}/?modal=milestone&number=100`, { waitUntil: 'networkidle' })
    await pageAi.waitForTimeout(600)
    await pageAi.screenshot({
      path: path.join(OUT_DIR, 'screen-ai-eval.png'),
      fullPage: false,
    })
    await pageAi.close()

    // 4. Desktop Evidence Vault (1210x756)
    console.log('[SCREENSHOTS]: 4/5 Generating screen-vault.png (Vault)...')
    const pageVault = await context.newPage()
    await pageVault.setViewportSize({ width: 1210, height: 756 })
    await pageVault.addInitScript((val) => {
      localStorage.setItem('ogonek.v2', val)
      localStorage.setItem('ogonek-theme', 'x-black')
    }, demoJson)
    await pageVault.goto(`${BASE_URL}/?nav=vault`, { waitUntil: 'networkidle' })
    await pageVault.waitForTimeout(600)
    await pageVault.screenshot({
      path: path.join(OUT_DIR, 'screen-vault.png'),
      fullPage: false,
    })
    await pageVault.close()

    // 5. Mobile Diary (390x844)
    console.log('[SCREENSHOTS]: 5/5 Generating screen-mobile.png (Mobile 390x844)...')
    const pageMobile = await context.newPage()
    await pageMobile.setViewportSize({ width: 390, height: 844 })
    await pageMobile.addInitScript((val) => {
      localStorage.setItem('ogonek.v2', val)
      localStorage.setItem('ogonek-theme', 'x-black')
    }, demoJson)
    await pageMobile.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
    await pageMobile.waitForTimeout(600)
    await pageMobile.screenshot({
      path: path.join(OUT_DIR, 'screen-mobile.png'),
      fullPage: false,
    })
    await pageMobile.close()

    console.log('[SCREENSHOTS]: Successfully generated all 5 showcase screenshots in public/landing/')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('[SCREENSHOTS]: Fatal error:', err)
  process.exit(1)
})

import { parseCliArgs, ROOT_DIR, UNAUTH_SCREENS, VIEWPORTS } from './config.mjs'
import { loadStagingEnv, startLocalServer, verifyStagingCredentials } from './env.mjs'
import { launchGuardBrowser } from './browser.mjs'
import { seedStaging } from './seed-staging.mjs'
import { authenticateBrowserSession, navigateToScreen } from './session.mjs'

const UNAUTH_IDS = new Set(UNAUTH_SCREENS.map((s) => s.id))

async function measureSelectorAtViewport(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return { found: false, selector: sel }

    const rect = el.getBoundingClientRect()
    const st = window.getComputedStyle(el)
    const padLeft = parseFloat(st.paddingLeft || '0')
    const padRight = parseFloat(st.paddingRight || '0')
    const padTop = parseFloat(st.paddingTop || '0')
    const padBottom = parseFloat(st.paddingBottom || '0')

    const isHorizontal = st.display.includes('flex') && !st.flexDirection.startsWith('column')
    const axis = isHorizontal ? 'width' : 'height'

    const children = Array.from(el.children)
      .map((ch) => {
        const cst = window.getComputedStyle(ch)
        if (cst.display === 'none') return null
        const cr = ch.getBoundingClientRect()
        const cls = typeof ch.className === 'string' ? ch.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
        const tagLabel = `${ch.tagName.toLowerCase()}${cls ? '.' + cls : ''}`
        return {
          label: tagLabel,
          aria: ch.getAttribute('aria-label') || (ch.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 32),
          width: Math.round(cr.width),
          height: Math.round(cr.height),
          x: Math.round(cr.left - rect.left),
          y: Math.round(cr.top - rect.top),
        }
      })
      .filter(Boolean)

    const availablePx = Math.round(
      isHorizontal ? el.clientWidth - padLeft - padRight : el.clientHeight - padTop - padBottom
    )

    const gapPx = parseFloat((isHorizontal ? st.columnGap : st.rowGap) || '0') || 0
    const childSum = children.reduce((sum, ch) => sum + (isHorizontal ? ch.width : ch.height), 0)
    const usedPx = Math.round(childSum + Math.max(0, children.length - 1) * gapPx)
    const freePx = availablePx - usedPx

    return {
      found: true,
      selector: sel,
      axis,
      rect: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        x: Math.round(rect.left),
        y: Math.round(rect.top),
      },
      clientWidth: Math.round(el.clientWidth),
      scrollWidth: Math.round(el.scrollWidth),
      clientHeight: Math.round(el.clientHeight),
      scrollHeight: Math.round(el.scrollHeight),
      hasVerticalScrollbar: el.scrollHeight > el.clientHeight + 1,
      hasHorizontalScrollbar: el.scrollWidth > el.clientWidth + 1,
      availablePx,
      usedPx,
      freePx,
      children,
    }
  }, selector)
}

/**
 * CLI tool: npm run budget -- <css-selector> [--screen=home] [--url=...]
 * Prints container and children bounding measurements across all 5 CONTRACT viewports.
 */
async function main() {
  const opts = parseCliArgs(process.argv.slice(2))
  const selector = opts.positional[0]
  if (!selector) {
    console.error('Использование: npm run budget -- "<css-селектор>" [--screen=landing|home|messages_chat] [--url=...]')
    process.exit(1)
  }

  const env = loadStagingEnv(ROOT_DIR)
  const server = opts.url ? null : await startLocalServer(ROOT_DIR, env)
  const baseUrl = (opts.url || server.baseUrl).replace(/\/$/, '')

  let browser
  try {
    let seeded = null
    if (!opts.screen || !UNAUTH_IDS.has(opts.screen)) {
      const creds = await verifyStagingCredentials(env)
      if (creds.ok) {
        seeded = await seedStaging(ROOT_DIR)
      }
    }

    browser = await launchGuardBrowser()
    const rows = []

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const page = await context.newPage()

      if (seeded && (!opts.screen || !UNAUTH_IDS.has(opts.screen))) {
        await authenticateBrowserSession(page, baseUrl, env, seeded.accounts.primary)
        await navigateToScreen(page, baseUrl, opts.screen || 'home')
      } else {
        await navigateToScreen(page, baseUrl, UNAUTH_IDS.has(opts.screen) ? opts.screen : 'signin')
      }

      await page.waitForTimeout(350)
      const measured = await measureSelectorAtViewport(page, selector)
      rows.push({ viewport: vp, measured })
      await context.close()
    }

    console.log(`\n### Бюджет пространства: \`${selector}\` (экран: ${opts.screen || (rows[0]?.measured?.found ? 'auto' : 'landing')})\n`)
    console.log('| Размер | контейнер | доступно px | занято px | свободно px | после добавления | скроллбар V/H |')
    console.log('|---|---|---|---|---|---|---|')

    for (const { viewport, measured } of rows) {
      if (!measured.found) {
        console.log(`| ${viewport.label} | ${selector} | — | — | НЕ НАЙДЕН | — | — |`)
        continue
      }
      console.log(
        `| ${viewport.label} | ${selector} (${measured.axis}, ${measured.rect.width}×${measured.rect.height}) | ${measured.availablePx} | ${measured.usedPx} | ${measured.freePx} | _(укажи элемент)_ | ${measured.hasVerticalScrollbar ? 'да' : 'нет'} / ${measured.hasHorizontalScrollbar ? 'да' : 'нет'} |`
      )
    }

    console.log('\n#### Дети контейнера\n')
    for (const { viewport, measured } of rows) {
      if (!measured.found) continue
      console.log(`**${viewport.label}** (children: ${measured.children.length}):`)
      for (const ch of measured.children) {
        console.log(`- \`${ch.label}\` (${ch.width}×${ch.height} @ ${ch.x},${ch.y}) ${ch.aria ? `— "${ch.aria}"` : ''}`)
      }
    }
  } finally {
    if (browser) await browser.close()
    if (server) await server.stop()
  }
}

main().catch((err) => {
  console.error('[guard:budget] FAILED:', err?.message || err)
  process.exit(1)
})

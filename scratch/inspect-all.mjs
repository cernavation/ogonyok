import { chromium } from 'playwright-core'

const screens = [
  { id: 'explore', title: 'Поиск' },
  { id: 'messages', title: 'Чаты' },
  { id: 'vault', title: 'Evidence Vault' },
  { id: 'analytics', title: 'Статистика' },
  { id: 'leaderboard', title: 'Рейтинг' },
  { id: 'profile', title: 'Профиль' },
  { id: 'settings', title: 'Настройки' },
  { id: 'intentions', title: 'Намерения' },
]

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })

  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'apple-light')
    document.documentElement.classList.remove('dark')
    document.documentElement.style.setProperty('--accent', '#C03C00')
    document.documentElement.style.setProperty('--accent-soft', 'rgba(192, 60, 0, 0.08)')
    document.documentElement.style.setProperty('--accent-text', '#FFFFFF')
  })

  for (const s of screens) {
    await page.evaluate((viewId) => {
      window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: viewId }))
    }, s.id)
    await page.waitForTimeout(300)

    const issues = await page.evaluate(({ screenTitle }) => {
      const themeId = 'apple-light'
      function isVisible(el) {
        if (!el || !(el instanceof HTMLElement)) return false
        const style = window.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || style.pointerEvents === 'none') return false
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      }
      function parseRgb(colorStr) {
        if (!colorStr || colorStr === 'transparent') return null
        const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
        if (!match) return null
        return {
          r: parseInt(match[1], 10),
          g: parseInt(match[2], 10),
          b: parseInt(match[3], 10),
          a: match[4] !== undefined ? parseFloat(match[4]) : 1,
        }
      }
      function blend(foreground, background) {
        const a = foreground.a
        return {
          r: Math.round(foreground.r * a + background.r * (1 - a)),
          g: Math.round(foreground.g * a + background.g * (1 - a)),
          b: Math.round(foreground.b * a + background.b * (1 - a)),
          a: 1,
        }
      }
      function getEffectiveBg(el) {
        let curr = el
        let bgComposite = { r: 255, g: 255, b: 255, a: 1 }
        const stack = []
        while (curr && curr instanceof HTMLElement) {
          const style = window.getComputedStyle(curr)
          const bgStr = style.backgroundColor
          const parsed = parseRgb(bgStr)
          if (parsed && parsed.a > 0) {
            stack.push(parsed)
            if (parsed.a === 1) break
          }
          curr = curr.parentElement
        }
        let result = stack.length > 0 ? stack[stack.length - 1] : bgComposite
        for (let i = stack.length - 2; i >= 0; i--) {
          result = blend(stack[i], result)
        }
        return result
      }
      function getLuminance(rgb) {
        const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
          const s = v / 255
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      function getContrastRatio(rgb1, rgb2) {
        const l1 = getLuminance(rgb1)
        const l2 = getLuminance(rgb2)
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      }

      const list = []
      const textElements = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
      let currNode = walker.nextNode()
      while (currNode) {
        const el = currNode
        if (isVisible(el)) {
          const hasDirect = Array.from(el.childNodes).some(c => c.nodeType === 3 && c.textContent.trim().length > 0)
          if (hasDirect) textElements.push(el)
        }
        currNode = walker.nextNode()
      }

      for (const el of textElements) {
        const style = window.getComputedStyle(el)
        const textSample = el.textContent.trim().slice(0, 45)
        if (textSample.length === 0 || /^[\p{Emoji}\s★✦✨🔥]+$/u.test(textSample)) continue
        if (el.closest('.avatar, [class*="avatar"], .story-ring__avatar')) continue

        const fontSize = parseFloat(style.fontSize)
        if (fontSize < 12.9) {
          list.push({ type: 'small_font', text: textSample, fs: fontSize, cls: el.className })
        }
        const fg = parseRgb(style.color)
        if (fg && fg.a > 0.05) {
          const bg = getEffectiveBg(el)
          const ratio = getContrastRatio(fg, bg)
          const fw = parseInt(style.fontWeight, 10) || 400
          const isLarge = fontSize >= 18 || (fontSize >= 14 && fw >= 700)
          const minRatio = isLarge ? 3.0 : 4.5
          if (ratio < minRatio) {
            list.push({ type: 'low_contrast', text: textSample, ratio: ratio.toFixed(2), minRatio, color: style.color, bg: `rgb(${bg.r},${bg.g},${bg.b})`, cls: el.className })
          }
        }
      }

      const buttons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isVisible)
      buttons.forEach(b => {
        const r = b.getBoundingClientRect()
        if (r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32)) {
          list.push({ type: 'small_button', text: b.textContent.trim().slice(0, 30), w: r.width, h: r.height, cls: b.className })
        }
      })

      return list
    }, { screenTitle: s.title })

    console.log(`${s.title}: ${issues.length} issues`)
    if (issues.length > 0) {
      console.log('Issues details:', issues)
    }
  }

  await browser.close()
}

run()

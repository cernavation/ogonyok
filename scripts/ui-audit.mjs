#!/usr/bin/env node
/**
 * UI AUDIT SUITE — ОГОНЁК
 * 
 * Автоматизированный аудит интерфейса на соответствие стандартам:
 * - 1440×900 (десктоп) и 390×844 (мобильный)
 * - Тёмная (x-black) и светлая (apple-light) темы
 * - 9 основных экранов + 7 ключевых состояний (модалки, сторис, чат, меню)
 * - 10 категорий автоматических проверок:
 *   1. Налезающие кнопки (overlap)
 *   2. Слипшиеся кнопки (зазор < 6px)
 *   3. Текст обрезан (overflow clipping / ellipsis leak)
 *   4. Мелкий шрифт (< 13px)
 *   5. Низкий контраст (< 4.5:1 по WCAG AA)
 *   6. Зоны нажатия (< 32px десктоп / < 40px мобильный)
 *   7. Карточки в карточках (вложенность ≥ 2)
 *   8. Горизонтальный скролл
 *   9. Ошибки и warning'и консоли
 *   10. Огромные hover-подсветки (> 12% площади экрана)
 */

import { chromium, webkit, firefox } from 'playwright-core'
import fs from 'fs'
import path from 'path'

function getBrowserType() {
  const arg = process.argv.find((a) => a.startsWith('--browser='))
  if (arg) {
    const val = arg.split('=')[1].toLowerCase()
    if (val === 'webkit') return 'webkit'
    if (val === 'firefox') return 'firefox'
  }
  return 'chromium'
}

/* ══════════════════════════════════════════════════════════════════════════
   1. КОНФИГУРАЦИЯ И СЕТКА ПРОВЕРОК
   ══════════════════════════════════════════════════════════════════════════ */

export const CONFIG = {
  baseUrl: process.env.AUDIT_BASE_URL || 'http://localhost:3000',
  outputDir: path.resolve('ui-audit'),
  baselineReportFile: path.resolve('ui-audit/BASELINE.md'),
  fastMode: process.argv.includes('--fast'),

  viewports: [
    { id: 'desktop-1920', name: 'Desktop Large (1920×1080)', width: 1920, height: 1080, isMobile: false },
    { id: 'desktop', name: 'Desktop (1440×900)', width: 1440, height: 900, isMobile: false },
    { id: 'desktop-1280', name: 'Desktop Compact (1280×800)', width: 1280, height: 800, isMobile: false },
    { id: 'tablet-1024', name: 'Tablet Landscape (1024×768)', width: 1024, height: 768, isMobile: false },
    { id: 'tablet-768', name: 'Tablet Portrait (768×1024)', width: 768, height: 1024, isMobile: true },
    { id: 'mobile-430', name: 'Mobile Pro Max (430×932)', width: 430, height: 932, isMobile: true },
    { id: 'mobile', name: 'Mobile (390×844)', width: 390, height: 844, isMobile: true },
    { id: 'mobile-360', name: 'Mobile Small (360×780)', width: 360, height: 780, isMobile: true },
  ],

  themes: [
    { id: 'x-black', label: 'Dark (x-black)' },
    { id: 'apple-light', label: 'Light (apple-light)' },
    { id: 'dim', label: 'Dim (twilight)' },
  ],

  // 9 основных экранов приложения
  screens: [
    { id: 'home', title: 'Главная', sidebarText: 'Главная', mobileLabel: 'Главная' },
    { id: 'explore', title: 'Поиск', sidebarText: 'Поиск', mobileLabel: 'Поиск' },
    { id: 'messages', title: 'Чаты', sidebarText: 'Чаты', mobileLabel: 'Чаты' },
    { id: 'vault', title: 'Evidence Vault', sidebarText: 'Evidence Vault', mobileLabel: 'Evidence Vault' },
    { id: 'analytics', title: 'Статистика', sidebarText: 'Статистика', mobileLabel: 'Аналитика' },
    { id: 'leaderboard', title: 'Рейтинг', sidebarText: 'Рейтинг', mobileLabel: 'Рейтинг' },
    { id: 'profile', title: 'Профиль', sidebarText: 'Профиль', mobileLabel: 'Профиль' },
    { id: 'settings', title: 'Настройки', sidebarText: 'Настройки', mobileLabel: 'Настройки' },
    { id: 'intentions', title: 'Намерения', sidebarText: 'Намерения', mobileLabel: 'Намерения' },
  ],

  // 7 ключевых интерактивных состояний
  states: [
    {
      id: 'composer',
      title: 'Открытое окно «Записать»',
      setup: async (page) => {
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('ogonek:open-composer'))
        })
        await page.waitForSelector('.modal, div[role="dialog"], .composer-modal', { timeout: 2000 }).catch(() => {})
        await page.waitForTimeout(250)
      },
      teardown: async (page) => {
        await resetModals(page)
      },
    },
    {
      id: 'onboarding',
      title: 'Онбординг (гайд и выбор уровня)',
      setup: async (page) => {
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('ogonek:open-onboarding'))
        })
        await page.waitForSelector('div[aria-label="Онбординг Огонька"]', { timeout: 2000 }).catch(() => {})
        await page.waitForTimeout(250)
      },
      teardown: async (page) => {
        await resetModals(page)
      },
    },
    {
      id: 'auth-register',
      title: 'Окно регистрации аккаунта',
      setup: async (page) => {
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('ogonek:open-auth', { detail: 'register' }))
        })
        await page.waitForSelector('.modal, .auth-panel, div[role="dialog"]', { timeout: 2000 }).catch(() => {})
        const regTab = await page.$('button[role="tab"]:has-text("Регистрация"), button:has-text("Регистрация")')
        if (regTab) await regTab.click({ force: true, timeout: 1500 }).catch(() => {})
        await page.waitForTimeout(250)
      },
      teardown: async (page) => {
        await resetModals(page)
      },
    },
    {
      id: 'story-viewer',
      title: 'Просмотр сторис',
      setup: async (page) => {
        await navigateToScreen(page, { id: 'home', sidebarText: 'Главная', mobileLabel: 'Главная' })
        const storyBtn = await page.$('.story-ring:not(.is-my):not(.story-ring--add), .story-ring.is-all, button:has-text("Все истории")')
        if (storyBtn) {
          await storyBtn.click({ force: true, timeout: 1500 }).catch(() => {})
          await page.waitForSelector('.story-viewer, [aria-label="Просмотр сторис"]', { timeout: 2000 }).catch(() => {})
          await page.waitForTimeout(300)
        }
      },
      teardown: async (page) => {
        await resetModals(page)
      },
    },
    {
      id: 'chat-open',
      title: 'Открытый чат с сообщениями',
      setup: async (page) => {
        await navigateToScreen(page, { id: 'messages', sidebarText: 'Чаты', mobileLabel: 'Чаты' })
        const threadItem = await page.$('.msgr__thread, .chat-thread-item, [data-thread-id]')
        if (threadItem) {
          await threadItem.click({ force: true, timeout: 1500 }).catch(() => {})
          await page.waitForTimeout(300)
        }
      },
      teardown: async (page) => {
        await navigateToScreen(page, { id: 'home', sidebarText: 'Главная', mobileLabel: 'Главная' })
        await resetModals(page)
      },
    },
    {
      id: 'post-menu',
      title: 'Открытое меню «⋯» у поста',
      setup: async (page) => {
        await navigateToScreen(page, { id: 'home', sidebarText: 'Главная', mobileLabel: 'Главная' })
        const moreBtn = await page.$('button[aria-label="Опции публикации"], button:has(svg.lucide-more-horizontal)')
        if (moreBtn) {
          await moreBtn.click({ force: true, timeout: 1500 }).catch(() => {})
          await page.waitForTimeout(250)
        }
      },
      teardown: async (page) => {
        await resetModals(page)
      },
    },
    {
      id: 'quick-focus-expanded',
      title: 'Развёрнутое поле «Утренний фокус»',
      setup: async (page) => {
        await navigateToScreen(page, { id: 'home', sidebarText: 'Главная', mobileLabel: 'Главная' })
        const focusToggle = await page.$('button:has-text("Утренний фокус")')
        if (focusToggle) {
          const inputVisible = await page.$('input[aria-label="Фокус 1"]')
          if (!inputVisible) {
            await focusToggle.click({ force: true, timeout: 1500 }).catch(() => {})
            await page.waitForTimeout(250)
          }
          const input = await page.$('input[aria-label="Фокус 1"]')
          if (input) await input.focus().catch(() => {})
        }
      },
      teardown: async () => {},
    },
  ],
}

/* ══════════════════════════════════════════════════════════════════════════
   2. НАВИГАЦИЯ, ТЕМА И СБРОС МОДАЛОК
   ══════════════════════════════════════════════════════════════════════════ */

async function resetModals(page) {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('ogonek:close-onboarding'))
    window.dispatchEvent(new CustomEvent('ogonek:close-composer'))
    window.dispatchEvent(new CustomEvent('ogonek:close-auth'))
  })
  await page.keyboard.press('Escape').catch(() => {})
  const storyClose = await page.$('.story-viewer__close')
  if (storyClose) await storyClose.click({ force: true, timeout: 400 }).catch(() => {})
  await page.waitForTimeout(100)
}

async function navigateToScreen(page, screenDef) {
  await resetModals(page)

  // 1. Попытка клика через сайдбар (десктоп)
  const sidebarBtn = await page.$(`aside.sidebar button:has-text("${screenDef.sidebarText}")`)
  if (sidebarBtn && await sidebarBtn.isVisible()) {
    await sidebarBtn.click({ timeout: 1500 }).catch(() => {})
    await page.waitForTimeout(150)
    return
  }

  // 2. Попытка клика через мобильную нижнюю панель
  const bottomBtn = await page.$(`.bottom-nav button[aria-label*="${screenDef.mobileLabel || screenDef.title}"]`)
  if (bottomBtn && await bottomBtn.isVisible()) {
    await bottomBtn.click({ timeout: 1500 }).catch(() => {})
    await page.waitForTimeout(150)
    return
  }

  // 3. Прямой диспетчер события в AppShell (универсально и мгновенно)
  await page.evaluate((viewId) => {
    window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: viewId }))
  }, screenDef.id)
  await page.waitForTimeout(150)
}

async function setTheme(page, themeId) {
  await page.evaluate((theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    if (document.body) {
      document.body.setAttribute('data-theme', theme)
    }
    document.documentElement.style.colorScheme = theme === 'apple-light' ? 'light' : 'dark'
    if (theme === 'apple-light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
    document.documentElement.style.setProperty('--accent', '#FF5C00')
    document.documentElement.style.setProperty('--accent-soft', 'rgba(255, 92, 0, 0.12)')
    document.documentElement.style.setProperty('--accent-contrast', '#000000')
    document.documentElement.style.setProperty('--accent-text', '#000000')

    try {
      const stored = JSON.parse(localStorage.getItem('ogonek.appearance.v1') || '{}')
      stored.theme = theme
      localStorage.setItem('ogonek.appearance.v1', JSON.stringify(stored))
      const storeState = JSON.parse(localStorage.getItem('ogonek.v2') || '{}')
      if (storeState) {
        storeState.theme = theme
        localStorage.setItem('ogonek.v2', JSON.stringify(storeState))
      }
    } catch {}
  }, themeId)
  await page.waitForTimeout(150)
}

/* ══════════════════════════════════════════════════════════════════════════
   3. ИНСПЕКТОР В БРАУЗЕРЕ (10 КАТЕГОРИЙ ПРОВЕРОК)
   ══════════════════════════════════════════════════════════════════════════ */

async function inspectPage(page, { isMobile, themeId, screenTitle }) {
  return await page.evaluate(
    ({ isMobile, themeId, screenTitle }) => {
      const issues = []

      function isVisible(el) {
        if (!el || !(el instanceof HTMLElement)) return false
        const style = window.getComputedStyle(el)
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0' ||
          style.pointerEvents === 'none'
        ) {
          return false
        }
        const rect = el.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return false

        // Проверка: обрезан ли элемент родителем с overflow
        let curr = el.parentElement
        while (curr && curr !== document.body && curr !== document.documentElement) {
          const s = window.getComputedStyle(curr)
          if (
            s.overflowX === 'hidden' || s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflowX === 'clip' ||
            s.overflowY === 'hidden' || s.overflowY === 'auto' || s.overflowY === 'scroll' || s.overflowY === 'clip'
          ) {
            const pRect = curr.getBoundingClientRect()
            if (
              rect.right <= pRect.left ||
              rect.left >= pRect.right ||
              rect.bottom <= pRect.top ||
              rect.top >= pRect.bottom
            ) {
              return false
            }
          }
          curr = curr.parentElement
        }

        return true
      }

      function getVisibleRect(el) {
        if (!isVisible(el)) return null
        let r = el.getBoundingClientRect()
        let rect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height, x: r.x, y: r.y }
        let curr = el.parentElement
        while (curr && curr !== document.body && curr !== document.documentElement) {
          const s = window.getComputedStyle(curr)
          if (
            s.overflowX === 'hidden' || s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflowX === 'clip' ||
            s.overflowY === 'hidden' || s.overflowY === 'auto' || s.overflowY === 'scroll' || s.overflowY === 'clip'
          ) {
            const pRect = curr.getBoundingClientRect()
            const left = Math.max(rect.left, pRect.left)
            const top = Math.max(rect.top, pRect.top)
            const right = Math.min(rect.right, pRect.right)
            const bottom = Math.min(rect.bottom, pRect.bottom)
            if (right <= left || bottom <= top) {
              return null
            }
            rect = { left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top }
          }
          curr = curr.parentElement
        }
        return rect
      }

      function getSelector(el) {
        if (!el) return 'unknown'
        if (el.id) return `#${el.id}`
        const tag = el.tagName.toLowerCase()
        const classes = Array.from(el.classList || [])
          .filter((c) => !c.includes(':') && c.length < 30)
          .slice(0, 3)
          .join('.')
        return classes ? `${tag}.${classes}` : tag
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
        let bgComposite = { r: themeId === 'apple-light' ? 255 : 0, g: themeId === 'apple-light' ? 255 : 0, b: themeId === 'apple-light' ? 255 : 0, a: 1 }
        const stack = []

        while (curr && curr instanceof HTMLElement) {
          const style = window.getComputedStyle(curr)
          const bgStr = style.backgroundColor
          const parsed = parseRgb(bgStr)
          if (parsed && parsed.a > 0) {
            stack.push(parsed)
            if (parsed.a === 1) break
          } else if (style.backgroundImage && style.backgroundImage.includes('gradient')) {
            const m = style.backgroundImage.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)|#([0-9a-fA-F]{6})/)
            if (m) {
              const gradColor = m[1]
                ? { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10), a: m[4] !== undefined ? parseFloat(m[4]) : 1 }
                : parseRgb(m[0])
              if (gradColor) {
                stack.push(gradColor)
                if (gradColor.a === 1) break
              }
            }
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
        const lighter = Math.max(l1, l2)
        const darker = Math.min(l1, l2)
        return (lighter + 0.05) / (darker + 0.05)
      }

      /* ───────────────────────────────────────────────────────────────────
         ПРОВЕРКА 1: ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ
         ─────────────────────────────────────────────────────────────────── */
      const docScrollWidth = document.documentElement.scrollWidth
      const winWidth = window.innerWidth
      if (docScrollWidth > winWidth + 2) {
        const overflowing = []
        document.querySelectorAll('*').forEach((el) => {
          if (isVisible(el)) {
            const rect = el.getBoundingClientRect()
            if (rect.right > winWidth + 4) {
              overflowing.push(`${getSelector(el)} (right: ${Math.round(rect.right)}px > ${winWidth}px)`)
            }
          }
        })
        issues.push({
          type: 'horizontal_scroll',
          severity: 'critical',
          title: `Горизонтальный скролл страницы (${docScrollWidth}px > ${winWidth}px)`,
          details: `Контент шире экрана на ${docScrollWidth - winWidth}px. Выступающие блоки: ${overflowing.slice(0, 3).join(', ') || 'document/body'}`,
        })
      }

      /* ───────────────────────────────────────────────────────────────────
         ПРОВЕРКА 2: ИНТЕРАКТИВНЫЕ ЭЛЕМЕНТЫ (Overlap, Sticky < 6px, Min Target)
         ─────────────────────────────────────────────────────────────────── */
      const buttonSelector = 'button, [role="button"], input[type="button"], input[type="submit"]'
      const buttons = Array.from(document.querySelectorAll(buttonSelector)).filter(isVisible)
      const minTouchSize = isMobile ? 40 : 32

      // 2A. Минимальный размер зоны нажатия кнопок
      for (const el of buttons) {
        const rect = el.getBoundingClientRect()
        if (rect.width < minTouchSize || rect.height < minTouchSize) {
          if (rect.width >= 4 && rect.height >= 4) {
            issues.push({
              type: 'small_touch_target',
              severity: 'warning',
              selector: getSelector(el),
              text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
              title: `Зона нажатия меньше ${minTouchSize}px (${Math.round(rect.width)}×${Math.round(rect.height)}px)`,
              details: `Кнопка <${getSelector(el)}> имеет габариты ${Math.round(rect.width)}×${Math.round(rect.height)}px (стандарт ≥ ${minTouchSize}px)`,
              rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
            })
          }
        }
      }

      // 2B. Налезающие кнопки (Overlap)
      for (let i = 0; i < buttons.length; i++) {
        const a = buttons[i]
        const rectA = getVisibleRect(a)
        if (!rectA) continue
        for (let j = i + 1; j < buttons.length; j++) {
          const b = buttons[j]
          if (a.contains(b) || b.contains(a)) continue

          const modalA = a.closest('div[role="dialog"], .modal-backdrop, [aria-modal="true"]')
          const modalB = b.closest('div[role="dialog"], .modal-backdrop, [aria-modal="true"]')
          if (modalA !== modalB) continue

          const isFixedA = window.getComputedStyle(a).position === 'fixed' || !!a.closest('.bottom-nav, .fab, nav.fixed, [data-fixed="true"]')
          const isFixedB = window.getComputedStyle(b).position === 'fixed' || !!b.closest('.bottom-nav, .fab, nav.fixed, [data-fixed="true"]')
          if (isFixedA !== isFixedB) continue

          const rectB = getVisibleRect(b)
          if (!rectB) continue
          const overlapX = Math.max(0, Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left))
          const overlapY = Math.max(0, Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top))

          if (overlapX > 3 && overlapY > 3) {
            issues.push({
              type: 'button_overlap',
              severity: 'critical',
              title: `Нахлёст кнопок: <${getSelector(a)}> перекрывает <${getSelector(b)}>`,
              details: `Пересечение ${Math.round(overlapX)}×${Math.round(overlapY)}px на (${Math.round(rectA.x)}, ${Math.round(rectA.y)})`,
              selector: `${getSelector(a)} overlaps ${getSelector(b)}`,
            })
          }
        }
      }

      // 2C. Слипшиеся кнопки (Зазор < 6px)
      for (let i = 0; i < buttons.length; i++) {
        const a = buttons[i]
        const rectA = a.getBoundingClientRect()
        for (let j = i + 1; j < buttons.length; j++) {
          const b = buttons[j]
          if (a.contains(b) || b.contains(a)) continue

          const modalA = a.closest('div[role="dialog"], .modal-backdrop, [aria-modal="true"]')
          const modalB = b.closest('div[role="dialog"], .modal-backdrop, [aria-modal="true"]')
          if (modalA !== modalB) continue

          const isFixedA = window.getComputedStyle(a).position === 'fixed' || !!a.closest('.bottom-nav, .fab, nav.fixed, [data-fixed="true"]')
          const isFixedB = window.getComputedStyle(b).position === 'fixed' || !!b.closest('.bottom-nav, .fab, nav.fixed, [data-fixed="true"]')
          if (isFixedA !== isFixedB) continue

          const parentA = a.parentElement
          const parentB = b.parentElement
          const commonParent = parentA === parentB || (parentA && parentB && parentA.parentElement === parentB.parentElement)
          if (!commonParent) continue

          if (
            parentA?.classList.contains('segmented') ||
            parentA?.getAttribute('role') === 'tablist' ||
            parentA?.getAttribute('role') === 'group' ||
            parentA?.getAttribute('role') === 'radiogroup' ||
            a.closest('.segmented, [role="tablist"], [role="group"], [role="radiogroup"]')
          ) {
            continue
          }

          const rectB = b.getBoundingClientRect()
          const vOverlap = Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top)
          if (vOverlap > 12) {
            const hGap = Math.max(rectA.left, rectB.left) - Math.min(rectA.right, rectB.right)
            if (hGap > 0 && hGap < 6) {
              issues.push({
                type: 'sticky_buttons',
                severity: 'warning',
                title: `Слипшиеся кнопки: горизонтальный зазор ${Math.round(hGap)}px (< 6px)`,
                details: `<${getSelector(a)}> и <${getSelector(b)}> стоят слишком близко (${Math.round(hGap)}px)`,
                selector: `${getSelector(a)} + ${getSelector(b)}`,
              })
            }
          }

          const hOverlap = Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left)
          if (hOverlap > 12) {
            const vGap = Math.max(rectA.top, rectB.top) - Math.min(rectA.bottom, rectB.bottom)
            if (vGap > 0 && vGap < 6 && !a.closest('aside.sidebar, .nav-list')) {
              issues.push({
                type: 'sticky_buttons',
                severity: 'warning',
                title: `Слипшиеся кнопки: вертикальный зазор ${Math.round(vGap)}px (< 6px)`,
                details: `<${getSelector(a)}> над <${getSelector(b)}> с зазором ${Math.round(vGap)}px`,
                selector: `${getSelector(a)} / ${getSelector(b)}`,
              })
            }
          }
        }
      }

      /* ───────────────────────────────────────────────────────────────────
         ПРОВЕРКА 3: ТЕКСТОВЫЕ УЗЛЫ (Мелкий шрифт, Низкий контраст, Обрезка)
         ─────────────────────────────────────────────────────────────────── */
      const textElements = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
      let currNode = walker.nextNode()

      while (currNode) {
        const el = currNode
        if (isVisible(el)) {
          const hasDirectText = Array.from(el.childNodes).some(
            (c) => c.nodeType === Node.TEXT_NODE && c.textContent.trim().length > 0
          )
          if (hasDirectText) {
            textElements.push(el)

            const style = window.getComputedStyle(el)
            const overflowX = style.overflowX
            const overflowY = style.overflowY
            if ((overflowX === 'hidden' || overflowX === 'clip') && style.textOverflow !== 'ellipsis') {
              if (el.scrollWidth > el.clientWidth + 4) {
                issues.push({
                  type: 'text_clipped',
                  severity: 'warning',
                  selector: getSelector(el),
                  text: el.textContent.trim().slice(0, 40),
                  title: `Горизонтально обрезанный текст (${el.scrollWidth}px > ${el.clientWidth}px)`,
                  details: `Текст не помещается в блок без ellipsis: "${el.textContent.trim().slice(0, 50)}"`,
                })
              }
            }
            if (overflowY === 'hidden' || overflowY === 'clip') {
              if (el.scrollHeight > el.clientHeight + 6 && !el.classList.contains('line-clamp-none')) {
                issues.push({
                  type: 'text_clipped',
                  severity: 'warning',
                  selector: getSelector(el),
                  text: el.textContent.trim().slice(0, 40),
                  title: `Вертикально обрезанный текст (${el.scrollHeight}px > ${el.clientHeight}px)`,
                  details: `Текст выходит за пределы высоты блока: "${el.textContent.trim().slice(0, 50)}"`,
                })
              }
            }
          }
        }
        currNode = walker.nextNode()
      }

      const activeModal = document.querySelector('div[role="dialog"], .modal-backdrop, [aria-modal="true"]')

      for (const el of textElements) {
        if (activeModal && !el.closest('div[role="dialog"], .modal-backdrop, [aria-modal="true"]')) continue

        const style = window.getComputedStyle(el)
        const fontSize = parseFloat(style.fontSize)
        const fontWeight = parseInt(style.fontWeight, 10) || 400
        const textSample = el.textContent.trim().slice(0, 45)

        if (
          textSample.length === 0 ||
          /^[\p{Emoji}\s★✦✨🔥]+$/u.test(textSample) ||
          el.closest('[aria-hidden="true"]') ||
          el.closest('.avatar, [class*="avatar"], .story-ring__avatar')
        ) {
          continue
        }

        if (fontSize < 12.9) {
          issues.push({
            type: 'small_font',
            severity: 'warning',
            selector: getSelector(el),
            fontSize: `${Math.round(fontSize * 10) / 10}px`,
            text: textSample,
            title: `Мелкий шрифт (${Math.round(fontSize * 10) / 10}px < 13px)`,
            details: `Текст "${textSample}" имеет кегль ${fontSize}px (стандарт ≥ 13px)`,
          })
        }

        const fgRgb = parseRgb(style.color)
        if (fgRgb && fgRgb.a > 0.05) {
          const bgRgb = getEffectiveBg(el)
          const ratio = getContrastRatio(fgRgb, bgRgb)
          const isLarge = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)
          const minRatio = isLarge ? 3.0 : 4.5

          if (ratio < minRatio) {
            issues.push({
              type: 'low_contrast',
              severity: 'warning',
              selector: getSelector(el),
              contrastRatio: `${Math.round(ratio * 100) / 100}:1`,
              text: textSample,
              title: `Низкий контраст текста (${Math.round(ratio * 100) / 100}:1 < ${minRatio}:1)`,
              details: `Текст "${textSample}" цвета ${style.color} на фоне rgb(${bgRgb.r},${bgRgb.g},${bgRgb.b}) имеет контрастность ${Math.round(ratio * 100) / 100}:1 (норма ≥ ${minRatio}:1)`,
            })
          }
        }
      }

      /* ───────────────────────────────────────────────────────────────────
         ПРОВЕРКА 4: КАРТОЧКИ В КАРТОЧКАХ (Вложенность ≥ 2)
         ─────────────────────────────────────────────────────────────────── */
      const cardSelector = '.card, .day-card, .x-card, .trending-card, .evidence-card, [class*="-card"], [class*="Card"]'
      const cardEls = Array.from(document.querySelectorAll(cardSelector)).filter(isVisible)

      for (const card of cardEls) {
        let parentCard = card.parentElement ? card.parentElement.closest(cardSelector) : null
        if (parentCard) {
          issues.push({
            type: 'nested_cards',
            severity: 'critical',
            selector: `${getSelector(parentCard)} > ... > ${getSelector(card)}`,
            title: `Карточка в карточке (вложенность ≥ 2)`,
            details: `Элемент <${getSelector(card)}> вложен внутрь карточки <${getSelector(parentCard)}>`,
          })
        }
      }

      return issues
    },
    { isMobile, themeId, screenTitle }
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   ПРОВЕРКА 5: ОГРОМНЫЕ HOVER-ПОДСВЕТКИ (> 12% площади экрана)
   ────────────────────────────────────────────────────────────────────────── */
async function checkGiantHovers(page) {
  return await page.evaluate(() => {
    const issues = []
    const winArea = window.innerWidth * window.innerHeight
    const thresholdArea = winArea * 0.12

    const candidates = Array.from(
      document.querySelectorAll(
        '.day-card, .feed-item, article, [class*="card"], .view > div, .feed > div > div'
      )
    ).filter((el) => {
      if (!el || !(el instanceof HTMLElement)) return false
      const rect = el.getBoundingClientRect()
      return rect.width * rect.height >= thresholdArea
    })

    for (const el of candidates) {
      const rect = el.getBoundingClientRect()
      const area = rect.width * rect.height
      const areaPct = ((area / winArea) * 100).toFixed(1)

      const initialBg = window.getComputedStyle(el).backgroundColor

      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))

      const hoveredBg = window.getComputedStyle(el).backgroundColor

      el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
      el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))

      if (initialBg !== hoveredBg && hoveredBg !== 'rgba(0, 0, 0, 0)' && hoveredBg !== 'transparent') {
        const tag = el.tagName.toLowerCase()
        const cls = el.className ? `.${String(el.className).trim().split(/\s+/).slice(0, 2).join('.')}` : ''
        issues.push({
          type: 'giant_hover',
          severity: 'critical',
          title: `Огромная hover-подсветка: контейнер ${areaPct}% экрана (> 12%)`,
          details: `Контейнер <${tag}${cls}> площадью ${Math.round(area)}px² (${areaPct}% окна) меняет фон с ${initialBg} на ${hoveredBg} при наведении мыши`,
          selector: `${tag}${cls}`,
        })
      }
    }

    return issues
  })
}

/* ══════════════════════════════════════════════════════════════════════════
   4. ДВИЖОК ЗАПУСКА АУДИТА
   ══════════════════════════════════════════════════════════════════════════ */

async function launchBrowser(browserType = getBrowserType()) {
  if (browserType === 'webkit') {
    return await webkit.launch({ headless: true })
  }
  if (browserType === 'firefox') {
    return await firefox.launch({ headless: true })
  }
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch (err) {
    console.warn('[Audit] Chrome channel fallback to default chromium:', err.message)
    return await chromium.launch({ headless: true })
  }
}

export async function runUiAudit() {
  const startTime = Date.now()
  console.log('═════════════════════════════════════════════════════════════════')
  console.log(`🚀 ЗАПУСК UI-АУДИТА ОГОНЬКА ${CONFIG.fastMode ? '(--fast режим)' : '(полный аудит)'}`)
  console.log(`Целевой адрес: ${CONFIG.baseUrl}`)
  console.log(`Папка скриншотов: ${CONFIG.outputDir}`)
  console.log('═════════════════════════════════════════════════════════════════\n')

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true })
  }

  const browser = await launchBrowser()
  const allResults = []
  const consoleErrors = []

  const viewportArg = process.argv.find((a) => a.startsWith('--viewport='))?.split('=')[1]
  const viewportsToRun = viewportArg
    ? CONFIG.viewports.filter((v) => viewportArg.split(',').includes(v.id))
    : CONFIG.fastMode
    ? [CONFIG.viewports.find((v) => v.id === 'desktop') || CONFIG.viewports[0]]
    : CONFIG.viewports
  const themeArg = process.argv.find((a) => a.startsWith('--theme='))?.split('=')[1]
  const themesToRun = themeArg
    ? CONFIG.themes.filter((t) => t.id === themeArg)
    : CONFIG.fastMode
    ? [CONFIG.themes[0]]
    : CONFIG.themes

  for (const viewport of viewportsToRun) {
    for (const theme of themesToRun) {
      console.log(`\n▶ Окружение: ${viewport.name} | Тема: ${theme.label}`)

      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2,
      })

      const page = await context.newPage()

      page.on('console', (msg) => {
        const type = msg.type()
        if (type === 'error' || type === 'warning') {
          const text = msg.text()
          if (
            !text.includes('React DevTools') &&
            !text.includes('favicon') &&
            !text.includes('ERR_NAME_NOT_RESOLVED') &&
            !text.includes('ERR_FAILED') &&
            !text.includes('Failed to load resource')
          ) {
            consoleErrors.push({
              type: `console_${type}`,
              severity: type === 'error' ? 'critical' : 'warning',
              viewport: viewport.id,
              theme: theme.id,
              text,
            })
          }
        }
      })

      page.on('pageerror', (err) => {
        consoleErrors.push({
          type: 'uncaught_error',
          severity: 'critical',
          viewport: viewport.id,
          theme: theme.id,
          text: err.message,
        })
      })

      await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(400)
      await setTheme(page, theme.id)

      /* ── 1. Прогон по 9 основным экранам ──────────────────────────────── */
      for (const screen of CONFIG.screens) {
        process.stdout.write(`  • Экран "${screen.title}"... `)
        await navigateToScreen(page, screen)
        await page.waitForTimeout(200)

        const shotName = `${viewport.id}-${theme.id}-${screen.id}.png`
        const shotPath = path.join(CONFIG.outputDir, shotName)
        await page.screenshot({ path: shotPath, fullPage: false })

        const domIssues = await inspectPage(page, {
          isMobile: viewport.isMobile,
          themeId: theme.id,
          screenTitle: screen.title,
        })

        const hoverIssues = await checkGiantHovers(page)
        const totalScreenIssues = [...domIssues, ...hoverIssues]
        console.log(`[${totalScreenIssues.length} дефектов]`)

        allResults.push({
          target: screen.title,
          targetId: screen.id,
          isState: false,
          viewport: viewport.id,
          theme: theme.id,
          screenshot: shotName,
          issues: totalScreenIssues,
        })
      }

      /* ── 2. Прогон по 7 интерактивным состояниям ──────────────────────── */
      for (const state of CONFIG.states) {
        process.stdout.write(`  ★ Состояние "${state.title}"... `)
        try {
          await resetModals(page)
          await state.setup(page)
          await page.waitForTimeout(250)

          const shotName = `${viewport.id}-${theme.id}-state-${state.id}.png`
          const shotPath = path.join(CONFIG.outputDir, shotName)
          await page.screenshot({ path: shotPath, fullPage: false })

          const domIssues = await inspectPage(page, {
            isMobile: viewport.isMobile,
            themeId: theme.id,
            screenTitle: state.title,
          })

          console.log(`[${domIssues.length} дефектов]`)
          allResults.push({
            target: state.title,
            targetId: state.id,
            isState: true,
            viewport: viewport.id,
            theme: theme.id,
            screenshot: shotName,
            issues: domIssues,
          })

          await state.teardown(page)
          await page.waitForTimeout(150)
        } catch (err) {
          console.log(`[Сбой состояния: ${err.message}]`)
        }
      }

      await context.close()
    }
  }

  await browser.close()

  /* ══════════════════════════════════════════════════════════════════════════
     5. ГЕНЕРАЦИЯ ОТЧЁТА BASELINE.MD
     ══════════════════════════════════════════════════════════════════════════ */
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\nАудит завершён за ${durationSec}с. Генерация отчёта...`)

  const stats = {
    total: 0,
    critical: 0,
    warning: 0,
    byType: {},
  }

  const allFlatIssues = []

  for (const res of allResults) {
    for (const issue of res.issues) {
      stats.total++
      if (issue.severity === 'critical') stats.critical++
      else stats.warning++

      stats.byType[issue.type] = (stats.byType[issue.type] || 0) + 1
      allFlatIssues.push({
        ...issue,
        target: res.target,
        viewport: res.viewport,
        theme: res.theme,
        screenshot: res.screenshot,
      })
    }
  }

  for (const cErr of consoleErrors) {
    stats.total++
    if (cErr.severity === 'critical') stats.critical++
    else stats.warning++
    stats.byType[cErr.type] = (stats.byType[cErr.type] || 0) + 1
    allFlatIssues.push({
      ...cErr,
      target: 'Console Logs',
      title: cErr.text,
      details: `В консоли браузера: ${cErr.text}`,
    })
  }

  const sortedIssues = [...allFlatIssues].sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1
    if (a.severity !== 'critical' && b.severity === 'critical') return 1
    return 0
  })

  const top10 = sortedIssues.slice(0, 10)

  const mdReport = `# Отчёт базового аудита интерфейса (BASELINE)

> **Дата замера:** ${new Date().toISOString()}  
> **Режим:** ${CONFIG.fastMode ? 'Быстрый (--fast, десктоп x-black)' : 'Полный (1440×900 + 390×844, Dark + Light)'}  
> **Длительность выполнения:** ${durationSec} сек  
> **Всего проверено экранов и состояний:** ${allResults.length}  

---

## 1. Сводная статистика проблем

| Категория проверки | Количество дефектов | Серьёзность |
| :--- | :---: | :--- |
| **Огромные hover-подсветки (> 12% экрана)** | ${stats.byType['giant_hover'] || 0} | 🔴 Critical |
| **Карточки в карточках (вложенность ≥ 2)** | ${stats.byType['nested_cards'] || 0} | 🔴 Critical |
| **Налезающие кнопки (Overlap)** | ${stats.byType['button_overlap'] || 0} | 🔴 Critical |
| **Горизонтальный скролл** | ${stats.byType['horizontal_scroll'] || 0} | 🔴 Critical |
| **Ошибки в консоли браузера** | ${stats.byType['console_error'] || 0} | 🔴 Critical |
| **Слипшиеся кнопки (зазор < 6px)** | ${stats.byType['sticky_buttons'] || 0} | 🟡 Warning |
| **Мелкий шрифт (< 13px)** | ${stats.byType['small_font'] || 0} | 🟡 Warning |
| **Низкий контраст (< 4.5:1 WCAG AA)** | ${stats.byType['low_contrast'] || 0} | 🟡 Warning |
| **Малые зоны нажатия (< 32px / 40px)** | ${stats.byType['small_touch_target'] || 0} | 🟡 Warning |
| **Обрезанный текст (overflow without ellipsis)** | ${stats.byType['text_clipped'] || 0} | 🟡 Warning |
| **Warning'и в консоли браузера** | ${stats.byType['console_warning'] || 0} | 🟡 Warning |
| **ИТОГО ДЕФЕКТОВ** | **${stats.total}** | **(Критичных: ${stats.critical}, Предупреждений: ${stats.warning})** |

---

## 2. ТОП-10 самых грубых дефектов

${
  top10.length === 0
    ? '🎉 Замечаний не обнаружено!'
    : top10
        .map(
          (item, idx) => `### ${idx + 1}. [${item.severity === 'critical' ? '🔴 КРИТИЧНО' : '🟡 ВНИМАНИЕ'}] ${item.title}
- **Экран/Состояние:** ${item.target} (${item.viewport || ''} / ${item.theme || ''})
- **Элемент/Селектор:** \`${item.selector || 'DOM'}\`
- **Подробности:** ${item.details || item.text || ''}
${item.screenshot ? `- **Скриншот:** \`ui-audit/${item.screenshot}\`` : ''}
`
        )
        .join('\n')
}

---

## 3. Детализация по экранам и скриншотам

| Экран / Состояние | Окружение | Тема | Дефектов | Скриншот |
| :--- | :--- | :--- | :---: | :--- |
${allResults
  .map(
    (r) =>
      `| **${r.target}** | ${r.viewport} | ${r.theme} | ${r.issues.length} | [\`${r.screenshot}\`](./${r.screenshot}) |`
  )
  .join('\n')}

---

## 4. Как запустить повторный замер

\`\`\`bash
# Быстрый аудит (десктоп, тёмная тема — для быстрой итерации)
npm run audit-ui:fast

# Полный аудит перед сдачей (все разрешения и темы)
npm run audit-ui
\`\`\`
`

  fs.writeFileSync(CONFIG.baselineReportFile, mdReport, 'utf8')
  fs.writeFileSync(path.join(CONFIG.outputDir, 'issues.json'), JSON.stringify(allResults, null, 2), 'utf8')
  console.log(`\n✅ Отчёт успешно сохранён в ${CONFIG.baselineReportFile}`)

  console.log(`\nИТОГ UI-AUDIT: ${stats.total === 0 ? '✅ 0 ДЕФЕКТОВ' : `⚠️ НАЙДЕНО ${stats.total} ДЕФЕКТОВ`}`)

  return { stats, top10, totalRuns: allResults.length }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runUiAudit().then((res) => {
    process.exit(res.stats.total > 0 ? 1 : 0)
  }).catch((err) => {
    console.error('Fatal audit error:', err)
    process.exit(1)
  })
}

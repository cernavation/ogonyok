import fs from 'node:fs'
import path from 'node:path'
import { AxeBuilder } from '@axe-core/playwright'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import {
  MAX_SIDEBAR_NAV_ITEMS,
  MIN_MOBILE_TAP_PX,
  MIN_TEXT_COLUMN_CHARS,
  PIXEL_DIFF_THRESHOLD,
} from './config.mjs'

/**
 * Attaches console, hydration, pageerror, and HTTP >= 400 listeners for runtime audit (check e).
 */
export function attachRuntimeListeners(page) {
  const bucket = {
    consoleErrors: [],
    consoleWarnings: [],
    hydrationErrors: [],
    pageErrors: [],
    httpErrors: [],
    activeContext: { screen: 'init', viewport: 'init' },
  }

  const isHydrationMsg = (txt) =>
    /hydration|did not match|text content does not match|hydrating|server html/i.test(txt)

  page.on('console', (msg) => {
    const type = msg.type()
    const text = msg.text()
    const entry = {
      screen: bucket.activeContext.screen,
      viewport: bucket.activeContext.viewport,
      type,
      text: text.slice(0, 600),
      location: msg.location()?.url || '',
    }
    if (isHydrationMsg(text)) {
      bucket.hydrationErrors.push(entry)
    } else if (type === 'error') {
      bucket.consoleErrors.push(entry)
    } else if (type === 'warning') {
      bucket.consoleWarnings.push(entry)
    }
  })

  page.on('pageerror', (err) => {
    bucket.pageErrors.push({
      screen: bucket.activeContext.screen,
      viewport: bucket.activeContext.viewport,
      text: (err?.message || String(err)).slice(0, 600),
    })
  })

  page.on('response', (res) => {
    const status = res.status()
    if (status >= 400) {
      bucket.httpErrors.push({
        screen: bucket.activeContext.screen,
        viewport: bucket.activeContext.viewport,
        status,
        url: res.url(),
        method: res.request().method(),
      })
    }
  })

  return {
    setContext(screen, viewport) {
      bucket.activeContext = { screen, viewport }
    },
    snapshotCounts() {
      return {
        consoleErrors: bucket.consoleErrors.length,
        consoleWarnings: bucket.consoleWarnings.length,
        hydrationErrors: bucket.hydrationErrors.length,
        pageErrors: bucket.pageErrors.length,
        httpErrors: bucket.httpErrors.length,
      }
    },
    sliceSince(prev) {
      return {
        consoleErrors: bucket.consoleErrors.slice(prev.consoleErrors),
        consoleWarnings: bucket.consoleWarnings.slice(prev.consoleWarnings),
        hydrationErrors: bucket.hydrationErrors.slice(prev.hydrationErrors),
        pageErrors: bucket.pageErrors.slice(prev.pageErrors),
        httpErrors: bucket.httpErrors.slice(prev.httpErrors),
      }
    },
    bucket,
  }
}

/**
 * Collects layout scrollbar metrics for baseline/layout.json comparison.
 */
export async function collectLayoutSnapshot(page) {
  return page.evaluate(() => {
    const measureEl = (el) => {
      if (!el) return null
      const style = window.getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      if (style.display === 'none' || rect.width === 0 || rect.height === 0) return null
      return {
        clientWidth: Math.round(el.clientWidth),
        scrollWidth: Math.round(el.scrollWidth),
        clientHeight: Math.round(el.clientHeight),
        scrollHeight: Math.round(el.scrollHeight),
        hasVerticalScrollbar: el.scrollHeight > el.clientHeight + 2,
        hasHorizontalScrollbar: el.scrollWidth > el.clientWidth + 2,
      }
    }

    const sidebar = document.querySelector('.x-sidebar, aside[aria-label*="навигац" i], nav.x-sidebar')
    const rightRail = document.querySelector('.right-rail, aside[aria-label*="Дополнительная" i]')
    const navItems = document.querySelectorAll('.x-sidebar nav button, .x-sidebar nav a').length

    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      docScrollWidth: Math.round(document.documentElement.scrollWidth),
      docClientWidth: Math.round(document.documentElement.clientWidth),
      docScrollHeight: Math.round(document.documentElement.scrollHeight),
      sidebarNavCount: navItems,
      sidebar: measureEl(sidebar),
      rightRail: measureEl(rightRail),
    }
  })
}

/**
 * Runs browser-side DOM, style, duplicate, control, text-column, and rule-7 term checks (a, b, c, d, h).
 */
export async function runDomChecks(page, { screen, viewport, layoutBaseline = null }) {
  const issues = await page.evaluate(
    ({ screenId, vp, baselineLayout, minChars, minTapPx, maxNavItems }) => {
      const found = []
      const pushIssue = (issue) => {
        if (found.length < 180) {
          found.push({
            screen: screenId,
            viewport: vp.name,
            ...issue,
          })
        }
      }

      const buildSelector = (el) => {
        if (!el || el.nodeType !== 1) return ''
        if (el.id) return `#${CSS.escape(el.id)}`
        const parts = []
        let cur = el
        while (cur && cur.nodeType === 1 && parts.length < 5) {
          let seg = cur.tagName.toLowerCase()
          const aria = cur.getAttribute('aria-label')
          if (aria) {
            seg += `[aria-label="${aria.replace(/"/g, '\\"').slice(0, 60)}"]`
            parts.unshift(seg)
            break
          }
          if (typeof cur.className === 'string' && cur.className.trim()) {
            const cls = cur.className
              .trim()
              .split(/\s+/)
              .filter((c) => !c.includes(':') && !c.includes('[') && c.length < 36)
              .slice(0, 2)
            if (cls.length) seg += '.' + cls.map((c) => CSS.escape(c)).join('.')
          }
          const parent = cur.parentElement
          if (parent) {
            const sameTag = Array.from(parent.children).filter((ch) => ch.tagName === cur.tagName)
            if (sameTag.length > 1) {
              seg += `:nth-of-type(${sameTag.indexOf(cur) + 1})`
            }
          }
          parts.unshift(seg)
          cur = cur.parentElement
        }
        return parts.join(' > ')
      }

      const isVisible = (el) => {
        if (!el || el.nodeType !== 1) return false
        let cur = el
        while (cur && cur.nodeType === 1) {
          const st = window.getComputedStyle(cur)
          if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) {
            return false
          }
          cur = cur.parentElement
        }
        const rect = el.getBoundingClientRect()
        if (rect.width < 1 || rect.height < 1) return false
        return true
      }

      const roundRect = (rect) => ({
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })

      const getReactProps = (el) => {
        const key = Object.keys(el).find((k) => k.startsWith('__reactProps$'))
        return key ? el[key] : null
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const measureCharWidth = (style) => {
        if (!ctx) return parseFloat(style.fontSize || '14') * 0.55
        ctx.font = `${style.fontWeight || '400'} ${style.fontSize || '14px'} ${style.fontFamily || 'sans-serif'}`
        return ctx.measureText('0000000000000000000000000000').width / 28
      }

      // ── (a) Horizontal overflow & new sidebar/right-rail scrollbars ─────────────
      const docScrollW = document.documentElement.scrollWidth
      const winW = window.innerWidth
      if (docScrollW > winW + 2) {
        pushIssue({
          checkId: 'a-horizontal-overflow-page',
          category: 'layout',
          severity: 'error',
          selector: 'html',
          message: `Горизонтальный скролл страницы: scrollWidth (${docScrollW}px) > viewport (${winW}px)`,
          rect: { x: 0, y: 0, width: winW, height: Math.min(window.innerHeight, 600) },
        })
      }

      const allEls = Array.from(document.querySelectorAll('body *'))
      for (const el of allEls) {
        if (!isVisible(el)) continue
        const st = window.getComputedStyle(el)
        if (
          (st.overflowX === 'auto' || st.overflowX === 'scroll') &&
          el.scrollWidth > el.clientWidth + 4 &&
          el.getAttribute('data-horizontal-scroll') !== 'true' &&
          !el.className?.toString().includes('stories')
        ) {
          pushIssue({
            checkId: 'a-horizontal-overflow-container',
            category: 'layout',
            severity: 'error',
            selector: buildSelector(el),
            message: `Горизонтальный скролл в контейнере: scrollWidth=${Math.round(el.scrollWidth)}px > clientWidth=${Math.round(el.clientWidth)}px`,
            rect: roundRect(el.getBoundingClientRect()),
          })
        }
      }

      const sidebarEl = document.querySelector('.x-sidebar, aside[aria-label*="навигац" i]')
      if (sidebarEl && isVisible(sidebarEl)) {
        const navCount = sidebarEl.querySelectorAll('nav button, nav a').length
        if (navCount > maxNavItems) {
          pushIssue({
            checkId: 'a-sidebar-item-count',
            category: 'contract',
            severity: 'error',
            selector: buildSelector(sidebarEl),
            message: `Нарушено правило 3 CONTRACT: в левом меню ${navCount} пунктов вместо max ${maxNavItems}`,
            rect: roundRect(sidebarEl.getBoundingClientRect()),
          })
        }
        const sbHasScroll = sidebarEl.scrollHeight > sidebarEl.clientHeight + 2
        if (baselineLayout?.sidebar && !baselineLayout.sidebar.hasVerticalScrollbar && sbHasScroll) {
          pushIssue({
            checkId: 'a-sidebar-new-scrollbar',
            category: 'layout',
            severity: 'error',
            selector: buildSelector(sidebarEl),
            message: `В левом сайдбаре появился вертикальный скроллбар (${sidebarEl.scrollHeight} > ${sidebarEl.clientHeight})`,
            rect: roundRect(sidebarEl.getBoundingClientRect()),
          })
        }
      }

      const railEl = document.querySelector('.right-rail, aside[aria-label*="Дополнительная" i]')
      if (railEl && isVisible(railEl)) {
        const railHasScroll = railEl.scrollHeight > railEl.clientHeight + 2
        if (baselineLayout?.rightRail && !baselineLayout.rightRail.hasVerticalScrollbar && railHasScroll) {
          pushIssue({
            checkId: 'a-right-rail-new-scrollbar',
            category: 'layout',
            severity: 'error',
            selector: buildSelector(railEl),
            message: `В правой колонке появился вертикальный скроллбар (${railEl.scrollHeight} > ${railEl.clientHeight})`,
            rect: roundRect(railEl.getBoundingClientRect()),
          })
        }
      }

      // ── (b) Clipped text & narrow columns (< 28 chars) ─────────────────────────
      const textSeen = new Set()
      for (const el of allEls) {
        if (!isVisible(el)) continue
        const tag = el.tagName
        if (tag === 'SVG' || tag === 'PATH' || tag === 'SCRIPT' || tag === 'STYLE') continue

        const hasDirectText = Array.from(el.childNodes).some(
          (n) => n.nodeType === 3 && n.textContent && n.textContent.trim().length > 0
        )
        const leafBlock = el.children.length === 0 && (el.innerText || '').trim().length > 0
        if (!hasDirectText && !leafBlock) continue

        const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
        if (!text || text.length < 3) continue

        const st = window.getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        const isClipOverflow =
          st.overflowX === 'hidden' ||
          st.overflowX === 'clip' ||
          st.textOverflow === 'ellipsis'

        if (isClipOverflow && el.scrollWidth > el.clientWidth + 2) {
          const isSingleHeading = /^H[1-6]$/.test(tag) || el.getAttribute('role') === 'heading'
          const hasTitle = Boolean((el.getAttribute('title') || '').trim())
          if (!isSingleHeading || !hasTitle) {
            const key = buildSelector(el)
            if (!textSeen.has(key)) {
              textSeen.add(key)
              pushIssue({
                checkId: 'b-clipped-text',
                category: 'text',
                severity: 'error',
                selector: key,
                message: `Обрезан текст (${Math.round(el.scrollWidth)}px > ${Math.round(el.clientWidth)}px${isSingleHeading && !hasTitle ? ', нет title у заголовка' : ''}): "${text.slice(0, 60)}"`,
                rect: roundRect(rect),
              })
            }
          }
        }

        // Column width < 28 chars check for body copy, descriptions, settings hints, subtitles, previews
        const fontPx = parseFloat(st.fontSize || '14')
        const lineH = parseFloat(st.lineHeight || String(fontPx * 1.35)) || fontPx * 1.35
        const isSmallDisplayOrAction = /^H[1-3]$|^BUTTON$|^A$|^TH$/.test(tag) || fontPx >= 20
        const hasColHintClass = Boolean(
          el.className?.toString().match(/hint|desc|subtitle|preview|body|caption/i)
        )
        const wrapsOrMultiLine = rect.height >= lineH * 1.55
        const isDescriptiveBlock =
          !isSmallDisplayOrAction &&
          text.length >= 24 &&
          text.includes(' ') &&
          (tag === 'P' || hasColHintClass || wrapsOrMultiLine)

        if (isDescriptiveBlock && el.clientWidth > 10) {
          const charW = measureCharWidth(st)
          const approxChars = charW > 0 ? el.clientWidth / charW : 999
          if (approxChars < minChars) {
            const key = `narrow:${buildSelector(el)}`
            if (!textSeen.has(key)) {
              textSeen.add(key)
              pushIssue({
                checkId: 'b-narrow-text-column',
                category: 'text',
                severity: 'error',
                selector: buildSelector(el),
                message: `Текстовая колонка уже 28 символов (~${Math.floor(approxChars)} симв., ${Math.round(rect.width)}px): "${text.slice(0, 60)}"`,
                rect: roundRect(rect),
              })
            }
          }
        }
      }

      // ── (c) Duplicate controls & duplicate preview text/icons ──────────────────
      const interactiveEls = Array.from(
        document.querySelectorAll('button, a[href], [role="button"], input:not([type="hidden"]), select, textarea')
      ).filter(isVisible)

      const getSvgSig = (el) => {
        const svgs = Array.from(el.querySelectorAll('svg')).filter(isVisible)
        if (!svgs.length) return ''
        return svgs
          .map((svg) => {
            const paths = Array.from(svg.querySelectorAll('path, circle, rect, polyline, polygon, line'))
              .map((n) => n.getAttribute('d') || n.getAttribute('points') || n.tagName)
              .join('|')
            return paths || svg.getAttribute('class') || 'svg'
          })
          .join('||')
      }

      const controlsMeta = interactiveEls.map((el) => {
        const rect = el.getBoundingClientRect()
        const ariaLabel = (el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()
        const text = (el.innerText || '').replace(/\s+/g, ' ').trim()
        const title = (el.getAttribute('title') || '').trim()
        const accName = ariaLabel || text || title || el.getAttribute('placeholder') || ''
        const rProps = getReactProps(el)
        const fnSrc =
          typeof rProps?.onClick === 'function'
            ? rProps.onClick.toString().replace(/\s+/g, ' ').slice(0, 200)
            : typeof el.onclick === 'function'
              ? el.onclick.toString().replace(/\s+/g, ' ').slice(0, 200)
              : null

        return {
          el,
          selector: buildSelector(el),
          rect,
          ariaLabel,
          text,
          accName,
          svgSig: getSvgSig(el),
          fnSrc,
          inSidebar: Boolean(el.closest('.x-sidebar, nav[aria-label*="навигац" i]')),
        }
      })

      // Group controls inside header / nav / toolbar / pane containers
      const regionSelector = 'header, nav, [role="toolbar"], [role="dialog"], form, aside, section, main'
      const byRegion = new Map()
      for (const item of controlsMeta) {
        const container = item.el.closest(regionSelector) || document.body
        if (!byRegion.has(container)) byRegion.set(container, [])
        byRegion.get(container).push(item)
      }

      // Check 1: identical accessible name or identical icon+onClick in same region/pane
      for (const [, list] of byRegion.entries()) {
        const byName = new Map()
        const byIconFn = new Map()
        for (const item of list) {
          if (item.accName) {
            const norm = item.accName.toLowerCase()
            if (!byName.has(norm)) byName.set(norm, [])
            byName.get(norm).push(item)
          }
          if (item.svgSig && item.fnSrc && !/=>\s*\{\s*\}/.test(item.fnSrc)) {
            const k = `${item.svgSig}::${item.fnSrc}`
            if (!byIconFn.has(k)) byIconFn.set(k, [])
            byIconFn.get(k).push(item)
          }
        }
        for (const [name, dupes] of byName.entries()) {
          // Only treat within local sibling proximity (< 480px) or same header/toolbar as same container duplicate
          const localPairs = dupes.filter((d) => !d.inSidebar)
          if (localPairs.length >= 2) {
            pushIssue({
              checkId: 'c-duplicate-accessible-name',
              category: 'duplicates',
              severity: 'error',
              selector: localPairs.map((d) => d.selector).join(' | '),
              message: `Дубль кнопки/ссылки с одинаковым именем "${name}" (${localPairs.length} шт.)`,
              rect: roundRect(localPairs[0].rect),
            })
          }
        }
        for (const [, dupes] of byIconFn.entries()) {
          if (dupes.length >= 2) {
            pushIssue({
              checkId: 'c-duplicate-icon-onclick',
              category: 'duplicates',
              severity: 'error',
              selector: dupes.map((d) => d.selector).join(' | '),
              message: `Дубль контролов с одинаковой иконкой и одинаковым onClick (${dupes.length} шт.): "${dupes[0].accName || dupes[0].selector}"`,
              rect: roundRect(dupes[0].rect),
            })
          }
        }
      }

      // Check 2: Duplicate "back" mechanisms across the screen (e.g. 3 ways back in chats)
      const backControls = controlsMeta.filter((c) => {
        const nm = c.accName.toLowerCase()
        if (/(^|[^а-яёa-z0-9])(назад|в ленту|к списку|вернуться|back)($|[^а-яёa-z0-9])/.test(nm)) return true
        // ArrowLeft in top header/toolbar paired with chat/feed context (excluding slide pagination)
        if (
          !c.inSidebar &&
          c.rect.top < 140 &&
          /m12 19-7-7 7-7|M19 12H5/i.test(c.svgSig) &&
          !/предыдущ|следующ|prev|next|слайд/i.test(nm)
        ) {
          return true
        }
        return false
      })
      if (backControls.length >= 2) {
        const hasRailHome = controlsMeta.some((c) => c.inSidebar && /главн|лента|огонёк/i.test(c.accName))
        pushIssue({
          checkId: 'c-duplicate-back-controls',
          category: 'duplicates',
          severity: 'error',
          selector: backControls.map((b) => b.selector).join(' | '),
          message: `Множественные кнопки возврата ("Назад") на одном экране (${backControls.length} видимых контролов${hasRailHome ? ' + иконка Главная/Огонёк в рейле' : ''}): ${backControls.map((b) => b.accName || b.selector).join(', ')}`,
          rect: roundRect(backControls[0].rect),
        })
      }

      // Check 3: Duplicate info/tokens inside the same preview row or card (e.g. Mic + "Голосовое" + "Голосовое сообщение")
      const previewCandidates = Array.from(
        document.querySelectorAll(
          '[role="listitem"], [data-preview], .dialog-item, .chat-thread-row, article, a, button, div[role="button"]'
        )
      ).filter((el) => {
        if (!isVisible(el)) return false
        const r = el.getBoundingClientRect()
        return r.height >= 28 && r.height <= 160 && el.querySelectorAll('span, p, small, strong, b').length >= 2
      })

      const previewReported = new Set()
      for (const card of previewCandidates) {
        // Only inspect smallest card / row container (avoid parent wrapping multiple cards)
        if (card.querySelector('[role="listitem"], article')) continue
        const spans = Array.from(card.querySelectorAll('span, p, small, strong, b')).filter((sp) => {
          if (!isVisible(sp)) return false
          // Leaf or shallow text holder (no nested span with same text)
          return !Array.from(sp.children).some((ch) => ['SPAN', 'P'].includes(ch.tagName) && (ch.innerText || '').trim())
        })
        if (spans.length < 2) continue

        const stemsByFragment = spans.map((sp) => {
          const t = (sp.innerText || '').toLowerCase()
          const words = t.match(/[а-яёa-z]{5,}/gi) || []
          const stems = Array.from(new Set(words.map((w) => w.slice(0, 6))))
          return { sp, text: (sp.innerText || '').trim(), stems, hasIcon: Boolean(sp.querySelector('svg')) }
        })

        const stemCounts = new Map()
        for (const frag of stemsByFragment) {
          for (const st of frag.stems) {
            if (!stemCounts.has(st)) stemCounts.set(st, [])
            stemCounts.get(st).push(frag.text)
          }
        }

        for (const [stem, occurrences] of stemCounts.entries()) {
          if (occurrences.length >= 2) {
            const sel = buildSelector(card)
            if (!previewReported.has(sel + stem)) {
              previewReported.add(sel + stem)
              pushIssue({
                checkId: 'c-duplicate-preview-info',
                category: 'duplicates',
                severity: 'error',
                selector: sel,
                message: `Дубль информации в одном превью (основа "${stem}" повторяется ${occurrences.length} раза: ${occurrences.map((o) => `"${o}"`).join(' + ')})`,
                rect: roundRect(card.getBoundingClientRect()),
              })
            }
          }
        }
      }

      // ── (d) Empty buttons, missing aria-label, small mobile tap targets, dead buttons ──
      const isFormSubmit = (el) => {
        if (el.tagName !== 'BUTTON') return false
        const typeAttr = (el.getAttribute('type') || '').toLowerCase()
        if (typeAttr === 'submit') return true
        return !typeAttr && Boolean(el.closest('form'))
      }

      const hasVisibleDescendantMedia = (el) => {
        const media = el.querySelectorAll('svg, img, canvas, video, i')
        for (const m of media) {
          if (!isVisible(m)) continue
          const r = m.getBoundingClientRect()
          if (r.width >= 3 && r.height >= 3) return true
        }
        return false
      }

      const hasVisibleDescendantText = (el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        let node
        while ((node = walker.nextNode())) {
          if (!node.textContent || !node.textContent.trim()) continue
          if (node.parentElement && isVisible(node.parentElement)) return true
        }
        const before = window.getComputedStyle(el, '::before').content
        const after = window.getComputedStyle(el, '::after').content
        if (before && before !== 'none' && before !== '""' && before !== "''") return true
        if (after && after !== 'none' && after !== '""' && after !== "''") return true
        return false
      }

      for (const c of controlsMeta) {
        const el = c.el
        const tag = el.tagName

        // d.1 Empty control (e.g. empty orange circle bottom-left in collapsed chat sidebar)
        if (tag === 'BUTTON' || tag === 'A' || el.getAttribute('role') === 'button') {
          const hasText = hasVisibleDescendantText(el)
          const hasIcon = hasVisibleDescendantMedia(el)
          if (!hasText && !hasIcon) {
            pushIssue({
              checkId: 'd-empty-button',
              category: 'controls',
              severity: 'error',
              selector: c.selector,
              message: `Пустая кнопка/контрол без видимой иконки и подписи (${Math.round(c.rect.width)}×${Math.round(c.rect.height)}px${c.ariaLabel ? `, aria-label="${c.ariaLabel}"` : ''})`,
              rect: roundRect(c.rect),
            })
          }
        }

        // d.2 Missing aria-label / accessible name
        const hasAriaAttr = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')
        if (!c.accName) {
          pushIssue({
            checkId: 'd-missing-accessible-name',
            category: 'controls',
            severity: 'error',
            selector: c.selector,
            message: `Элемент без доступного имени (нет ни aria-label, ни текста): ${c.selector}`,
            rect: roundRect(c.rect),
          })
        } else if (!hasAriaAttr) {
          pushIssue({
            checkId: 'd-missing-aria-label',
            category: 'controls',
            severity: 'error',
            selector: c.selector,
            message: `Элемент без aria-label (текст/подпись "${c.accName.slice(0, 40)}")`,
            rect: roundRect(c.rect),
          })
        }

        // d.3 Mobile tap target < 40x40
        if (vp.isMobile && (c.rect.width < minTapPx - 0.5 || c.rect.height < minTapPx - 0.5)) {
          pushIssue({
            checkId: 'd-small-tap-target',
            category: 'controls',
            severity: 'error',
            selector: c.selector,
            message: `Тап-зона на мобильном меньше ${minTapPx}×${minTapPx}: ${Math.round(c.rect.width)}×${Math.round(c.rect.height)}px ("${c.accName.slice(0, 40)}")`,
            rect: roundRect(c.rect),
          })
        }

        // d.4 Dead button / noop handler detection via React props & DOM semantics
        if ((tag === 'BUTTON' || el.getAttribute('role') === 'button') && !el.disabled && !isFormSubmit(el)) {
          const rProps = getReactProps(el)
          const hasHandler =
            Boolean(rProps?.onClick || el.onclick) ||
            el.hasAttribute('aria-controls') ||
            el.hasAttribute('aria-haspopup') ||
            Boolean(el.closest('a[href], label'))

          if (!hasHandler && (tag === 'BUTTON' || el.getAttribute('role') === 'button')) {
            pushIssue({
              checkId: 'd-dead-button',
              category: 'controls',
              severity: 'error',
              selector: c.selector,
              message: `Мёртвая кнопка без обработчика клика: "${c.accName || c.selector}"`,
              rect: roundRect(c.rect),
            })
          } else if (c.fnSrc && /^(\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>\s*\{\s*\}|function\s*\([^)]*\)\s*\{\s*\}$/.test(c.fnSrc.trim())) {
            pushIssue({
              checkId: 'd-dead-button-noop',
              category: 'controls',
              severity: 'error',
              selector: c.selector,
              message: `Мёртвая кнопка с пустым обработчиком () => {}: "${c.accName || c.selector}"`,
              rect: roundRect(c.rect),
            })
          }
        }
      }

      // ── (h) Forbidden word "Соратники" (CONTRACT rule 7) ───────────────────────
      const termRe = /соратник/i
      for (const el of allEls) {
        if (!isVisible(el)) continue
        const direct = Array.from(el.childNodes).some(
          (n) => n.nodeType === 3 && termRe.test(n.textContent || '')
        )
        const attrMatch = ['aria-label', 'title', 'placeholder'].some((a) =>
          termRe.test(el.getAttribute(a) || '')
        )
        if (direct || attrMatch) {
          pushIssue({
            checkId: 'h-forbidden-term-soratniki',
            category: 'contract',
            severity: 'error',
            selector: buildSelector(el),
            message: `Запрещённый термин «Соратники» (CONTRACT п. 7): "${(el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 70)}"`,
            rect: roundRect(el.getBoundingClientRect()),
          })
        }
      }

      return found
    },
    {
      screenId: screen,
      vp: viewport,
      baselineLayout: layoutBaseline,
      minChars: MIN_TEXT_COLUMN_CHARS,
      minTapPx: MIN_MOBILE_TAP_PX,
      maxNavItems: MAX_SIDEBAR_NAV_ITEMS,
    }
  )

  return issues
}

/**
 * Runs WCAG AA color-contrast check (< 4.5:1) via @axe-core/playwright (check g).
 */
export async function runContrastChecks(page, { screen, viewport }) {
  try {
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()
    const issues = []
    for (const violation of results.violations || []) {
      for (const node of violation.nodes || []) {
        const selector = Array.isArray(node.target) ? node.target.join(' ') : String(node.target || '')
        const data = node.any?.[0]?.data || {}
        const ratio = data.contrastRatio ? `${Number(data.contrastRatio).toFixed(2)}:1` : '<4.5:1'
        const fg = data.fgColor || '?'
        const bg = data.bgColor || '?'
        let rect = null
        try {
          if (selector) {
            const box = await page.locator(selector).first().boundingBox()
            if (box) {
              rect = {
                x: Math.round(box.x),
                y: Math.round(box.y),
                width: Math.round(box.width),
                height: Math.round(box.height),
              }
            }
          }
        } catch {}

        issues.push({
          checkId: 'g-contrast-ratio',
          category: 'contrast',
          severity: 'error',
          screen,
          viewport: viewport.name,
          selector,
          message: `Низкий контраст текста ${ratio} (min ${data.expectedContrastRatio || '4.5:1'}, fg=${fg}, bg=${bg})`,
          rect,
        })
      }
    }
    return issues
  } catch (err) {
    return [
      {
        checkId: 'g-contrast-error',
        category: 'contrast',
        severity: 'error',
        screen,
        viewport: viewport.name,
        selector: 'body',
        message: `Ошибка запуска axe-core color-contrast: ${err?.message || err}`,
        rect: null,
      },
    ]
  }
}

/**
 * Loads review/<step>/allowed_regions.json (supports numeric rects and/or CSS selectors resolved on page).
 */
export function loadAllowedRegions(reviewDir, step) {
  const filePath = path.join(reviewDir, step, 'allowed_regions.json')
  if (!fs.existsSync(filePath)) return []
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.regions) ? parsed.regions : []
  } catch (err) {
    throw new Error(`Invalid JSON in ${filePath}: ${err?.message || err}`)
  }
}

function maskRect(png, rect) {
  const x0 = Math.max(0, Math.floor(rect.x || 0))
  const y0 = Math.max(0, Math.floor(rect.y || 0))
  const x1 = Math.min(png.width, Math.ceil((rect.x || 0) + (rect.width || 0)))
  const y1 = Math.min(png.height, Math.ceil((rect.y || 0) + (rect.height || 0)))
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (png.width * y + x) << 2
      png.data[idx] = 0
      png.data[idx + 1] = 0
      png.data[idx + 2] = 0
      png.data[idx + 3] = 255
    }
  }
}

/**
 * Resolves allowed regions for a given screen & viewport (including CSS selectors) and compares PNGs (check f).
 */
export async function runPixelDiff(page, { screen, viewport, baselinePath, currentBuffer, diffOutputPath, allowedRegions }) {
  if (!fs.existsSync(baselinePath)) {
    return {
      ok: false,
      missingBaseline: true,
      diffRatio: null,
      issue: {
        checkId: 'f-baseline-missing',
        category: 'pixel-diff',
        severity: 'error',
        screen,
        viewport: viewport.name,
        selector: 'document',
        message: `Отсутствует эталонный скриншот: ${baselinePath}`,
        rect: null,
      },
    }
  }

  const basePng = PNG.sync.read(fs.readFileSync(baselinePath))
  const currPng = PNG.sync.read(currentBuffer)

  if (basePng.width !== currPng.width || basePng.height !== currPng.height) {
    return {
      ok: false,
      missingBaseline: false,
      diffRatio: 1,
      issue: {
        checkId: 'f-pixel-size-mismatch',
        category: 'pixel-diff',
        severity: 'error',
        screen,
        viewport: viewport.name,
        selector: 'document',
        message: `Размер скриншота изменился: baseline=${basePng.width}x${basePng.height}, current=${currPng.width}x${currPng.height}`,
        rect: null,
      },
    }
  }

  const applicable = (allowedRegions || []).filter(
    (r) =>
      (!r.screen || r.screen === '*' || r.screen === screen) &&
      (!r.viewport || r.viewport === '*' || r.viewport === viewport.name)
  )

  for (const reg of applicable) {
    if (reg.selector && page) {
      try {
        const boxes = await page.locator(reg.selector).evaluateAll((els) =>
          els.map((el) => {
            const b = el.getBoundingClientRect()
            return { x: b.left, y: b.top, width: b.width, height: b.height }
          })
        )
        for (const box of boxes) {
          maskRect(basePng, box)
          maskRect(currPng, box)
        }
      } catch {}
    } else if (typeof reg.x === 'number' && typeof reg.y === 'number') {
      maskRect(basePng, reg)
      maskRect(currPng, reg)
    }
  }

  const diffPng = new PNG({ width: basePng.width, height: basePng.height })
  const diffPixels = pixelmatch(basePng.data, currPng.data, diffPng.data, basePng.width, basePng.height, {
    threshold: 0.1,
    includeAA: false,
  })

  const totalPixels = basePng.width * basePng.height
  const diffRatio = totalPixels > 0 ? diffPixels / totalPixels : 0

  if (diffRatio > PIXEL_DIFF_THRESHOLD) {
    fs.mkdirSync(path.dirname(diffOutputPath), { recursive: true })
    fs.writeFileSync(diffOutputPath, PNG.sync.write(diffPng))
    return {
      ok: false,
      missingBaseline: false,
      diffRatio,
      diffPixels,
      diffPath: diffOutputPath,
      issue: {
        checkId: 'f-pixel-diff-exceeded',
        category: 'pixel-diff',
        severity: 'error',
        screen,
        viewport: viewport.name,
        selector: 'document',
        message: `Визуальное расхождение ${(diffRatio * 100).toFixed(2)}% (> 0.30%) вне allowed_regions.json (${diffPixels}/${totalPixels} px)`,
        screenshot: diffOutputPath,
        rect: null,
      },
    }
  }

  return { ok: true, missingBaseline: false, diffRatio, diffPixels, issue: null }
}

/**
 * Captures a highlighted defect screenshot temporarily drawing a red outline without altering layout flow.
 */
export async function captureAnnotatedDefect(page, rect, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  if (rect && rect.width > 0 && rect.height > 0) {
    await page.evaluate((r) => {
      const box = document.createElement('div')
      box.id = '__guard_highlight__'
      box.style.cssText = [
        'position:fixed',
        `left:${Math.max(0, r.x - 2)}px`,
        `top:${Math.max(0, r.y - 2)}px`,
        `width:${Math.max(10, r.width + 4)}px`,
        `height:${Math.max(10, r.height + 4)}px`,
        'border:3px solid #FF2D55',
        'box-shadow:0 0 0 2px rgba(255,255,255,0.85)',
        'pointer-events:none',
        'z-index:2147483647',
        'border-radius:6px',
      ].join(';')
      document.body.appendChild(box)
    }, rect)
    try {
      await page.screenshot({ path: outputPath })
    } finally {
      await page.evaluate(() => document.getElementById('__guard_highlight__')?.remove())
    }
  } else {
    await page.screenshot({ path: outputPath })
  }
  return outputPath
}

const SKIP_PROBE_RE = /выйти|выход|удал|сброс|очист|google|скачат|позвон|отправ|сохран|редактир|добав|создат|войти|регистр|продолж/i

/**
 * Probes safe non-destructive visible buttons to detect dead controls that mutate zero DOM/focus/URL/network state.
 */
export async function probeSafeClicks(page, { screen, viewport }) {
  const candidates = await page.evaluate(() => {
    const out = []
    const els = Array.from(document.querySelectorAll('button, [role="button"]'))
    for (let i = 0; i < els.length; i++) {
      const el = els[i]
      if (
        el.disabled ||
        el.getAttribute('aria-selected') === 'true' ||
        el.getAttribute('aria-pressed') === 'true' ||
        el.hasAttribute('aria-current')
      ) {
        continue
      }
      const st = window.getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      if (st.display === 'none' || st.visibility === 'hidden' || rect.width < 4 || rect.height < 4) continue
      const label = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || '')
        .replace(/\s+/g, ' ')
        .trim()
      const inHeader = rect.top < 140 || Boolean(el.closest('header, [role="toolbar"]'))
      if (!inHeader && out.length >= 6) continue
      out.push({ index: i, label, rect: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) } })
    }
    return out
  })

  const deadIssues = []
  for (const cand of candidates) {
    if (!cand.label || SKIP_PROBE_RE.test(cand.label)) continue
    let reqCount = 0
    const onReq = () => {
      reqCount += 1
    }
    page.on('request', onReq)

    const beforeUrl = page.url()
    try {
      await page.evaluate((idx) => {
        const el = document.querySelectorAll('button, [role="button"]')[idx]
        if (!el) return
        window.__guardDomMutations = 0
        window.__guardObserver = new MutationObserver((muts) => {
          window.__guardDomMutations += muts.length
        })
        window.__guardObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        })
      }, cand.index)

      const target = page.locator('button, [role="button"]').nth(cand.index)
      if ((await target.count()) > 0 && (await target.isVisible())) {
        await target.click({ timeout: 1500, force: false }).catch(() => {})
        await page.waitForTimeout(140)
      }

      const delta = await page.evaluate(() => {
        window.__guardObserver?.disconnect()
        return window.__guardDomMutations || 0
      })

      if (delta === 0 && reqCount === 0 && page.url() === beforeUrl) {
        deadIssues.push({
          checkId: 'd-dead-button-click-probe',
          category: 'controls',
          severity: 'error',
          screen,
          viewport: viewport.name,
          selector: `button[aria-label="${cand.label}"]`,
          message: `Клик по кнопке не вызвал ни DOM-изменений, ни навигации, ни сетевого запроса: "${cand.label}"`,
          rect: cand.rect,
        })
      }

      // Close modal/popover if click opened something before moving to next button
      if (delta > 0 && page.url() === beforeUrl) {
        await page.keyboard.press('Escape').catch(() => {})
        await page.waitForTimeout(100)
      } else if (page.url() !== beforeUrl) {
        await page.goto(beforeUrl, { waitUntil: 'domcontentloaded' }).catch(() => {})
        await page.waitForTimeout(200)
      }
    } finally {
      page.off('request', onReq)
    }
  }
  return deadIssues
}


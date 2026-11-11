import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PNG } from 'pngjs'
import { launchGuardBrowser } from './browser.mjs'
import {
  attachRuntimeListeners,
  collectLayoutSnapshot,
  probeSafeClicks,
  runContrastChecks,
  runDomChecks,
  runPixelDiff,
} from './checks.mjs'

function makeSolidPng(width, height, rgba) {
  const png = new PNG({ width, height })
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (width * y + x) << 2
      png.data[i] = rgba[0]
      png.data[i + 1] = rgba[1]
      png.data[i + 2] = rgba[2]
      png.data[i + 3] = rgba[3]
    }
  }
  return PNG.sync.write(png)
}

/**
 * Self-tests guard detectors in real headless Chromium on synthetic fixtures mirroring main defects.
 */
export async function runSelfTest() {
  const browser = await launchGuardBrowser()
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogonek-guard-selftest-'))

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const runtime = attachRuntimeListeners(page)

    await page.setContent(`
      <!doctype html>
      <html lang="ru">
        <head>
          <style>
            body { margin: 0; background: #000000; color: #E7E9EA; font-family: sans-serif; }
            .x-sidebar { width: 88px; height: 220px; overflow-y: auto; }
            .right-rail { width: 350px; height: 220px; overflow-y: auto; }
            .xl-hidden { display: none; }
            .x-compose-btn { width: 50px; height: 50px; border-radius: 9999px; background: #ff5c00; border: 0; }
            .narrow-col { width: 90px; font-size: 14px; }
            .clipped { width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .low-contrast { color: #2a2d30; background: #000000; font-size: 14px; }
          </style>
        </head>
        <body>
          <aside class="x-sidebar" aria-label="Основная навигация">
            <nav>
              <button type="button" aria-label="Главная">🏠</button>
            </nav>
            <!-- Empty orange circle bottom-left in collapsed chat sidebar -->
            <button type="button" class="x-compose-btn" aria-label="Записать день">
              <svg class="xl-hidden" width="22" height="22"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </aside>

          <main>
            <header>
              <button type="button" aria-label="Назад в ленту">← Назад в ленту</button>
              <button type="button" aria-label="Назад к списку чатов">
                <svg width="16" height="16"><path d="m12 19-7-7 7-7"/></svg>
              </button>
              <button type="button" aria-label="Назад в ленту">Назад в ленту</button>
              <button id="dead-no-handler" type="button" aria-label="Настройки ленты">
                <svg width="18" height="18"><circle cx="9" cy="9" r="2"/></svg>
              </button>
              <button>Без aria-label</button>
            </header>

            <div role="listitem" class="dialog-item" style="height:64px">
              <span class="voice-badge"><svg width="13" height="13"><path d="M12 2a3 3 0 0 0-3 3"/></svg> Голосовое</span>
              <span class="preview-text">Голосовое сообщение</span>
            </div>

            <p class="narrow-col">Описание настройки режима уведомлений для друзей</p>
            <p class="clipped">Длинный текст настройки без переноса</p>
            <p class="low-contrast">Низкий контраст текста</p>
            <p>Список Соратники должен ловиться контрактом</p>
          </main>

          <script>
            // Attach noop React-like props handler on dead button simulation
            const deadBtn = document.getElementById('dead-no-handler');
            deadBtn.__reactProps$test = {};
          </script>
        </body>
      </html>
    `)

    const issues = await runDomChecks(page, {
      screen: 'selftest_chat',
      viewport: { name: '1440x900', width: 1440, height: 900, isMobile: false },
      layoutBaseline: null,
    })
    const contrast = await runContrastChecks(page, {
      screen: 'selftest_chat',
      viewport: { name: '1440x900', width: 1440, height: 900, isMobile: false },
    })
    const clicks = await probeSafeClicks(page, {
      screen: 'selftest_chat',
      viewport: { name: '1440x900', width: 1440, height: 900, isMobile: false },
    })

    const ids = new Set([...issues, ...contrast, ...clicks].map((i) => i.checkId))
    assert.ok(ids.has('d-empty-button'), 'Expected detector to catch empty orange button')
    assert.ok(ids.has('c-duplicate-back-controls'), 'Expected detector to catch multiple back buttons')
    assert.ok(ids.has('c-duplicate-preview-info'), 'Expected detector to catch duplicate "Голосовое" in preview')
    assert.ok(ids.has('d-dead-button'), 'Expected detector to catch dead button without handler')
    assert.ok(ids.has('d-dead-button-click-probe'), 'Expected click probe to catch unresponsive button')
    assert.ok(ids.has('d-missing-aria-label'), 'Expected detector to catch missing aria-label')
    assert.ok(ids.has('b-clipped-text'), 'Expected detector to catch clipped text')
    assert.ok(ids.has('b-narrow-text-column'), 'Expected detector to catch <28ch text column')
    assert.ok(ids.has('g-contrast-ratio'), 'Expected axe-core to catch low color contrast')
    assert.ok(ids.has('h-forbidden-term-soratniki'), 'Expected detector to catch forbidden "Соратники"')

    // Mobile check (<40x40 tap + horizontal overflow)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(`
      <!doctype html>
      <html>
        <body style="margin:0;width:520px;">
          <button type="button" aria-label="Мелкая кнопка" style="width:28px;height:28px;">✕</button>
        </body>
      </html>
    `)
    const mobileIssues = await runDomChecks(page, {
      screen: 'selftest_mobile',
      viewport: { name: '390x844', width: 390, height: 844, isMobile: true },
      layoutBaseline: null,
    })
    const mIds = new Set(mobileIssues.map((i) => i.checkId))
    assert.ok(mIds.has('a-horizontal-overflow-page'), 'Expected detector to catch mobile horizontal overflow')
    assert.ok(mIds.has('d-small-tap-target'), 'Expected detector to catch <40x40 touch target')

    // Layout snapshot + pixelmatch allowed_regions test
    const layout = await collectLayoutSnapshot(page)
    assert.equal(typeof layout.docScrollWidth, 'number')

    const basePath = path.join(tmpDir, 'base.png')
    const baseBuf = makeSolidPng(100, 100, [0, 0, 0, 255])
    const changedInsideAllowed = PNG.sync.read(baseBuf)
    for (let y = 10; y < 30; y++) {
      for (let x = 10; x < 30; x++) {
        const i = (100 * y + x) << 2
        changedInsideAllowed.data[i] = 255
      }
    }
    fs.writeFileSync(basePath, baseBuf)

    const maskedRes = await runPixelDiff(null, {
      screen: 'selftest',
      viewport: { name: '1210x756' },
      baselinePath: basePath,
      currentBuffer: PNG.sync.write(changedInsideAllowed),
      diffOutputPath: path.join(tmpDir, 'diff-masked.png'),
      allowedRegions: [{ screen: 'selftest', viewport: '1210x756', x: 10, y: 10, width: 20, height: 20 }],
    })
    assert.equal(maskedRes.ok, true, 'Changes inside allowed_regions must pass')

    const unmaskedRes = await runPixelDiff(null, {
      screen: 'selftest',
      viewport: { name: '1210x756' },
      baselinePath: basePath,
      currentBuffer: PNG.sync.write(changedInsideAllowed),
      diffOutputPath: path.join(tmpDir, 'diff-unmasked.png'),
      allowedRegions: [],
    })
    assert.equal(unmaskedRes.ok, false, 'Changes >0.3% outside allowed_regions must fail')
    assert.equal(unmaskedRes.issue.checkId, 'f-pixel-diff-exceeded')

    // Ensure runtime listener helper handles errors cleanly
    await page.evaluate(() => console.error('selftest console error'))
    assert.ok(runtime.bucket.consoleErrors.length >= 1, 'Expected console.error listener capture')

    console.log('[guard:self-test] ALL DETECTOR ASSERTIONS PASSED (14/14 checks verified in Chromium)')
    return true
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    await browser.close()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSelfTest()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((err) => {
      console.error('[guard:self-test] FAILED:', err)
      process.exit(1)
    })
}

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
  AUTH_SCREENS,
  EMPTY_SCREENS,
  getGuardPaths,
  parseCliArgs,
  ROOT_DIR,
  STAGING_ACCOUNTS,
  THEMES,
  UNAUTH_SCREENS,
  VIEWPORTS,
} from './config.mjs'
import { launchGuardBrowser } from './browser.mjs'
import {
  attachRuntimeListeners,
  captureAnnotatedDefect,
  collectLayoutSnapshot,
  loadAllowedRegions,
  probeSafeClicks,
  runContrastChecks,
  runDomChecks,
  runPixelDiff,
} from './checks.mjs'
import { loadStagingEnv, startLocalServer, verifyStagingCredentials } from './env.mjs'
import { verifyLock, writeLock } from './lock.mjs'
import { seedStaging } from './seed-staging.mjs'
import { applyTheme, authenticateBrowserSession, navigateToScreen } from './session.mjs'

function detectCurrentStep(explicitStep) {
  if (explicitStep) return explicitStep
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
    const match = branch.match(/^step\/(\d+)[-_]?/i)
    if (match) return match[1]
  } catch {}
  return '00'
}

function summarizeCategories(issues) {
  const counts = {}
  for (const issue of issues) {
    counts[issue.checkId] = (counts[issue.checkId] || 0) + 1
  }
  return counts
}

function buildMarkdownReport(report) {
  const lines = []
  lines.push(`# Guard Report — ${report.generatedAt}`)
  lines.push('')
  lines.push(`- **Статус**: ${report.ok ? 'PASS (exit 0)' : 'FAIL (exit 1)'}`)
  lines.push(`- **Режим**: ${report.mode} | **Шаг**: \`${report.step}\` | **Окружение**: ${report.stagingUrl}`)
  lines.push(`- **Проверка .lock**: ${report.lock.ok ? 'OK' : 'FAIL'}`)
  lines.push(`- **Staging ключи**: ${report.stagingPreflight.ok ? 'OK' : 'FAIL (401 / недоступен)'}`)
  lines.push(`- **Baseline**: ${report.baselineExists ? 'Найден' : 'Отсутствует baseline/layout.json'}`)
  lines.push(`- **Экранов проверено**: ${report.screensChecked} | **Найдено проблем**: ${report.issues.length}`)
  lines.push('')

  if (!report.lock.ok) {
    lines.push('## Нарушение целостности .lock (CONTRACT п. 10)')
    lines.push('```json')
    lines.push(JSON.stringify(report.lock, null, 2))
    lines.push('```')
    lines.push('')
  }

  if (!report.stagingPreflight.ok) {
    lines.push('## Staging Preflight Блокер')
    for (const c of report.stagingPreflight.checks) {
      lines.push(`- **${c.name}** (${c.keyPreview || '-'}): HTTP ${c.status} — \`${c.message}\``)
    }
    lines.push('')
  }

  const byId = summarizeCategories(report.issues)
  if (Object.keys(byId).length > 0) {
    lines.push('## Сводка по категориям проверок')
    lines.push('| Код проверки | Кол-во |')
    lines.push('|---|---|')
    for (const [k, v] of Object.entries(byId).sort((a, b) => b[1] - a[1])) {
      lines.push(`| \`${k}\` | ${v} |`)
    }
    lines.push('')
  }

  lines.push('## Найденные дефекты')
  if (report.issues.length === 0) {
    lines.push('Дефектов не обнаружено.')
  } else {
    lines.push('| # | Экран | Размер | Проверка | Селектор | Описание | Скриншот |')
    lines.push('|---|---|---|---|---|---|---|')
    report.issues.slice(0, 150).forEach((issue, idx) => {
      const shot = issue.screenshot ? path.relative(path.join(ROOT_DIR, 'review'), issue.screenshot) : '—'
      const msg = String(issue.message || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 140)
      const sel = String(issue.selector || '').replace(/\|/g, '\\|').slice(0, 80)
      lines.push(
        `| ${idx + 1} | ${issue.screen} | ${issue.viewport} | \`${issue.checkId}\` | \`${sel}\` | ${msg} | ${shot} |`
      )
    })
  }
  lines.push('')
  return `${lines.join('\n')}\n`
}

async function runAuditLoop(pageFactory, options) {
  const {
    screens,
    baseUrl,
    mode,
    paths,
    allowedRegions,
    layoutBaseline,
    runThemeContrast = false,
  } = options

  const issues = []
  const measuredLayout = { viewports: {} }
  let screensChecked = 0
  let shotCounter = 0

  for (const vp of VIEWPORTS) {
    const context = await pageFactory.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await context.newPage()
    const runtime = attachRuntimeListeners(page)

    if (options.account) {
      await authenticateBrowserSession(page, baseUrl, options.env, options.account)
    }

    for (const scr of screens) {
      screensChecked += 1
      runtime.setContext(scr.id, vp.name)
      const beforeRt = runtime.snapshotCounts()

      await navigateToScreen(page, baseUrl, scr.id)

      // Measure layout on primary screen for baseline/layout.json
      if (scr.id === 'home' || (!options.account && scr.id === 'landing')) {
        measuredLayout.viewports[vp.name] = await collectLayoutSnapshot(page)
      }

      const baselinePng = path.join(paths.baselineDir, vp.name, `${scr.id}.png`)
      const currentPngBuffer = await page.screenshot()

      if (mode === 'baseline') {
        fs.mkdirSync(path.dirname(baselinePng), { recursive: true })
        fs.writeFileSync(baselinePng, currentPngBuffer)
        continue
      }

      // Check (a, b, c, d, h): DOM, overflow, clipping, duplicates, controls, forbidden terms
      const vpLayoutBase = layoutBaseline?.viewports?.[vp.name] || null
      const domIssues = await runDomChecks(page, {
        screen: scr.id,
        viewport: vp,
        layoutBaseline: vpLayoutBase,
      })

      // Check (g): axe-core contrast >= 4.5:1
      const contrastIssues = await runContrastChecks(page, { screen: scr.id, viewport: vp })

      // Check (f): pixelmatch diff vs baseline/ (only per-screen when owner baseline exists)
      const diffPath = path.join(paths.diffsDir, vp.name, `${scr.id}.png`)
      const pix = layoutBaseline
        ? await runPixelDiff(page, {
            screen: scr.id,
            viewport: vp,
            baselinePath: baselinePng,
            currentBuffer: currentPngBuffer,
            diffOutputPath: diffPath,
            allowedRegions,
          })
        : { ok: false, issue: null }

      const afterRt = runtime.sliceSince(beforeRt)
      const rtIssues = []
      for (const e of afterRt.hydrationErrors) {
        rtIssues.push({
          checkId: 'e-hydration-error',
          category: 'runtime',
          severity: 'error',
          screen: scr.id,
          viewport: vp.name,
          selector: 'document',
          message: `Hydration ошибка: ${e.text}`,
        })
      }
      for (const e of afterRt.consoleErrors) {
        rtIssues.push({
          checkId: 'e-console-error',
          category: 'runtime',
          severity: 'error',
          screen: scr.id,
          viewport: vp.name,
          selector: 'document',
          message: `Console error: ${e.text}`,
        })
      }
      for (const w of afterRt.consoleWarnings) {
        rtIssues.push({
          checkId: 'e-console-warning',
          category: 'runtime',
          severity: 'warning',
          screen: scr.id,
          viewport: vp.name,
          selector: 'document',
          message: `Console warning: ${w.text}`,
        })
      }
      for (const e of afterRt.pageErrors) {
        rtIssues.push({
          checkId: 'e-uncaught-exception',
          category: 'runtime',
          severity: 'error',
          screen: scr.id,
          viewport: vp.name,
          selector: 'document',
          message: `Неперехваченное исключение: ${e.text}`,
        })
      }
      for (const r of afterRt.httpErrors) {
        rtIssues.push({
          checkId: 'e-http-error',
          category: 'runtime',
          severity: 'error',
          screen: scr.id,
          viewport: vp.name,
          selector: 'network',
          message: `HTTP ${r.status} (${r.method} ${r.url})`,
        })
      }

      const screenIssues = [...domIssues, ...contrastIssues, ...rtIssues]
      if (pix.issue) screenIssues.push(pix.issue)

      // Capture defect screenshots cleanly before interactive click probing alters DOM
      const capturedForPair = new Set()
      for (const iss of screenIssues) {
        const key = `${iss.checkId}:${iss.screen}:${iss.viewport}`
        if (!iss.screenshot && !capturedForPair.has(key) && shotCounter < 200) {
          capturedForPair.add(key)
          shotCounter += 1
          const artifactName = `${scr.id}__${vp.name}__${iss.checkId}__${shotCounter}.png`
          const outPath = path.join(paths.artifactsDir, artifactName)
          await captureAnnotatedDefect(page, iss.rect, outPath)
          iss.screenshot = outPath
        }
      }

      // Check (d-probe): click responsiveness on primary desktop screen pass
      if (vp.name === '1210x756') {
        const clickProbeIssues = await probeSafeClicks(page, { screen: scr.id, viewport: vp })
        for (const iss of clickProbeIssues) {
          if (shotCounter < 200 && !capturedForPair.has(`${iss.checkId}:${scr.id}:${vp.name}`)) {
            capturedForPair.add(`${iss.checkId}:${scr.id}:${vp.name}`)
            shotCounter += 1
            const outPath = path.join(paths.artifactsDir, `${scr.id}__${vp.name}__${iss.checkId}__${shotCounter}.png`)
            await captureAnnotatedDefect(page, iss.rect, outPath)
            iss.screenshot = outPath
          }
          screenIssues.push(iss)
        }
      }

      // Multi-theme contrast sweep on representative screens when authenticated
      if (runThemeContrast && vp.name === '1210x756' && ['home', 'settings_appearance', 'messages_chat'].includes(scr.id)) {
        for (const theme of THEMES) {
          if (theme === 'x-black') continue
          await applyTheme(page, theme)
          const thIssues = await runContrastChecks(page, { screen: `${scr.id}[${theme}]`, viewport: vp })
          for (const iss of thIssues) {
            if (shotCounter < 70) {
              shotCounter += 1
              const outPath = path.join(paths.artifactsDir, `${scr.id}__${theme}__contrast__${shotCounter}.png`)
              await captureAnnotatedDefect(page, iss.rect, outPath)
              iss.screenshot = outPath
            }
            screenIssues.push(iss)
          }
        }
        await applyTheme(page, 'x-black')
      }

      issues.push(...screenIssues)
    }

    await context.close()
  }

  return { issues, measuredLayout, screensChecked }
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2))
  if (opts.selfTest) {
    const { runSelfTest } = await import('./self-test.mjs')
    const ok = await runSelfTest()
    process.exit(ok ? 0 : 1)
  }

  const paths = getGuardPaths(ROOT_DIR)
  const step = detectCurrentStep(opts.step)

  // CONTRACT rule 2 / prompt item 4: baseline mode strictly requires manual owner flag
  if (opts.baseline && process.env.GUARD_OWNER !== '1') {
    console.error('[guard:baseline] ОТКАЗАНО: эталонные скриншоты создаёт только владелец вручную с GUARD_OWNER=1.')
    process.exit(1)
  }

  // Step 1: Verify .lock integrity
  const lockCheck = verifyLock(ROOT_DIR, { checkBaseline: !opts.baseline })
  if (!lockCheck.ok) {
    console.error('[guard] НАРУШЕНИЕ .lock (CONTRACT п. 10): файлы tools/guard/** или baseline/** изменены!')
    console.error(JSON.stringify(lockCheck, null, 2))
    process.exit(1)
  }

  // Step 2: Load .env.staging.local & probe staging Supabase
  const env = loadStagingEnv(ROOT_DIR)
  const stagingPreflight = await verifyStagingCredentials(env)

  fs.mkdirSync(paths.reviewDir, { recursive: true })
  fs.rmSync(paths.artifactsDir, { recursive: true, force: true })
  fs.mkdirSync(paths.artifactsDir, { recursive: true })

  const server = opts.url ? null : await startLocalServer(ROOT_DIR, env)
  const baseUrl = (opts.url || server.baseUrl).replace(/\/$/, '')

  let browser
  const allIssues = []
  let screensChecked = 0
  let layoutBaseline = null
  const baselineExists = fs.existsSync(paths.baselineLayout)

  if (baselineExists) {
    layoutBaseline = JSON.parse(fs.readFileSync(paths.baselineLayout, 'utf8'))
  } else if (!opts.baseline) {
    allIssues.push({
      checkId: 'f-baseline-layout-missing',
      category: 'pixel-diff',
      severity: 'error',
      screen: 'global',
      viewport: 'all',
      selector: 'baseline/layout.json',
      message: 'Эталон baseline/layout.json ещё не создан владельцем (GUARD_OWNER=1 npm run guard:baseline).',
    })
  }

  try {
    browser = await launchGuardBrowser()
    const allowedRegions = loadAllowedRegions(paths.reviewDir, step)

    // Always crawl unauthenticated screens (landing, register, privacy, terms)
    const unauthRes = await runAuditLoop(browser, {
      screens: UNAUTH_SCREENS,
      baseUrl,
      mode: opts.baseline ? 'baseline' : 'check',
      paths,
      allowedRegions,
      layoutBaseline,
      env,
    })
    allIssues.push(...unauthRes.issues)
    screensChecked += unauthRes.screensChecked

    let primaryLayout = unauthRes.measuredLayout

    if (stagingPreflight.ok) {
      const seeded = await seedStaging(ROOT_DIR)

      // Full authenticated crawl on primary account across views, settings, modals, multi-theme contrast
      const authRes = await runAuditLoop(browser, {
        screens: AUTH_SCREENS,
        baseUrl,
        mode: opts.baseline ? 'baseline' : 'check',
        paths,
        allowedRegions,
        layoutBaseline,
        account: seeded.accounts.primary,
        env,
        runThemeContrast: !opts.baseline,
      })
      allIssues.push(...authRes.issues)
      screensChecked += authRes.screensChecked
      primaryLayout = authRes.measuredLayout

      // Empty states crawl on empty staging account
      const emptyRes = await runAuditLoop(browser, {
        screens: EMPTY_SCREENS,
        baseUrl,
        mode: opts.baseline ? 'baseline' : 'check',
        paths,
        allowedRegions,
        layoutBaseline,
        account: seeded.accounts.empty,
        env,
      })
      allIssues.push(...emptyRes.issues)
      screensChecked += emptyRes.screensChecked
    } else {
      allIssues.unshift({
        checkId: 'staging-auth-blocked',
        category: 'staging',
        severity: 'error',
        screen: 'staging',
        viewport: 'all',
        selector: '.env.staging.local',
        message: `Staging Supabase недоступен для авто-логина и сидинга: ${stagingPreflight.checks
          .filter((c) => !c.ok)
          .map((c) => `${c.name}=${c.status} (${c.message})`)
          .join('; ')}`,
      })
    }

    if (opts.baseline) {
      if (!stagingPreflight.ok) {
        throw new Error('Cannot write full baseline while staging Supabase credentials fail preflight.')
      }
      fs.mkdirSync(paths.baselineDir, { recursive: true })
      fs.writeFileSync(
        paths.baselineLayout,
        `${JSON.stringify({ generatedAt: new Date().toISOString(), ...primaryLayout }, null, 2)}\n`
      )
      writeLock(ROOT_DIR, 'baseline')
      console.log(`[guard:baseline] Saved baseline layout + screenshots (${screensChecked} captures) and updated .lock`)
      return
    }

    const ok =
      lockCheck.ok &&
      stagingPreflight.ok &&
      baselineExists &&
      allIssues.filter((i) => i.severity === 'error').length === 0

    const report = {
      generatedAt: new Date().toISOString(),
      ok,
      mode: opts.baseline ? 'baseline' : 'guard',
      step,
      stagingUrl: stagingPreflight.url,
      lock: lockCheck,
      stagingPreflight,
      baselineExists,
      screensChecked,
      errorCount: allIssues.filter((i) => i.severity === 'error').length,
      warningCount: allIssues.filter((i) => i.severity === 'warning').length,
      issues: allIssues,
    }

    fs.writeFileSync(paths.reportJson, `${JSON.stringify(report, null, 2)}\n`)
    fs.writeFileSync(paths.reportMd, buildMarkdownReport(report))

    console.log(
      `[guard] ${ok ? 'PASS' : 'FAIL'} — ${screensChecked} screens checked, ${report.errorCount} errors, ${report.warningCount} warnings. Report: review/guard-report.md`
    )
    if (!ok) process.exitCode = 1
  } finally {
    if (browser) await browser.close()
    if (server) await server.stop()
  }
}

main().catch((err) => {
  console.error('[guard] FATAL:', err?.stack || err)
  process.exit(1)
})

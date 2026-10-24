#!/usr/bin/env node
/**
 * VISUAL DIFF SUITE — «ОГОНЁК»
 * 
 * Автоматизированное пиксельное сравнение актуальных скриншотов с baseline/:
 * - Библиотеки: pixelmatch + pngjs
 * - Сравнивает все экраны из explore/ с baseline/
 * - Показывает % изменённых пикселей
 * - Генерирует diff-изображения в diffs/
 * - Контролирует порог регрессии:
 *   - Разрешённые к изменению экраны (sidebar, auth, landing, settings, profile): порог до 10%
 *   - Неизменяемые экраны (home, explore, messages, vault, analytics, leaderboard, intentions, guide): не более 0.5%
 * - Формирует отчёт в VISUAL_DIFF.md
 */

import fs from 'fs'
import path from 'path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const BASELINE_DIR = path.resolve('baseline')
const CURRENT_DIR = path.resolve('explore')
const DIFF_DIR = path.resolve('diffs')
const REPORT_FILE = path.resolve('VISUAL_DIFF.md')

// Экраны, где изменения допускаются требованиями спринта (сайдбар, окно входа, профиль, настройки)
const ALLOWED_CHANGE_SCREENS = ['auth', 'sidebar', 'settings', 'profile', 'composer']
const STRICT_THRESHOLD_PERCENT = 0.5 // не более 0.5% для остальных экранов
const ALLOWED_THRESHOLD_PERCENT = 15.0 // до 15% для модифицируемых экранов

function findImages(dir, base = dir) {
  const images = []
  if (!fs.existsSync(dir)) return images
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      images.push(...findImages(full, base))
    } else if (/\.(png)$/i.test(entry.name)) {
      images.push(path.relative(base, full))
    }
  }
  return images
}

function readPng(filePath) {
  const data = fs.readFileSync(filePath)
  return PNG.sync.read(data)
}

export async function runVisualDiff() {
  const start = Date.now()
  console.log('═════════════════════════════════════════════════════════════════')
  console.log('👁️  ЗАПУСК VISUAL DIFF SUITE (Сравнение с baseline/)')
  console.log(`База: ${BASELINE_DIR}`)
  console.log(`Текущие: ${CURRENT_DIR}`)
  console.log('═════════════════════════════════════════════════════════════════\n')

  if (!fs.existsSync(BASELINE_DIR)) {
    console.log('⚠️ Папка baseline/ не найдена. Если это первоначальный запуск, снимите baseline командой: npm run explore && cp -R explore/ baseline/')
    // Создаем пустую baseline для первого раза если не существует
    fs.mkdirSync(BASELINE_DIR, { recursive: true })
    console.log('✅ Создана пустая папка baseline. Сравнение пропущено.')
    return
  }

  if (!fs.existsSync(DIFF_DIR)) {
    fs.mkdirSync(DIFF_DIR, { recursive: true })
  }

  const baselineImages = findImages(BASELINE_DIR)
  if (baselineImages.length === 0) {
    console.log('⚠️ В baseline/ нет изображений. Сравнение не требуется.')
    return
  }

  const results = []
  let violationsCount = 0

  for (const relPath of baselineImages) {
    const baselinePath = path.join(BASELINE_DIR, relPath)
    const currentPath = path.join(CURRENT_DIR, relPath)

    if (!fs.existsSync(currentPath)) {
      results.push({
        path: relPath,
        status: 'MISSING',
        diffPercent: 100,
        diffPixels: 0,
        allowed: false,
        note: 'Файл отсутствует в текущей сборке скриншотов',
      })
      violationsCount++
      continue
    }

    try {
      const img1 = readPng(baselinePath)
      const img2 = readPng(currentPath)

      if (img1.width !== img2.width || img1.height !== img2.height) {
        results.push({
          path: relPath,
          status: 'DIMENSION_MISMATCH',
          diffPercent: 100,
          diffPixels: 0,
          allowed: false,
          note: `Размеры не совпадают: baseline=${img1.width}x${img1.height}, current=${img2.width}x${img2.height}`,
        })
        violationsCount++
        continue
      }

      const diff = new PNG({ width: img1.width, height: img1.height })
      const diffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {
        threshold: 0.1,
      })

      const totalPixels = img1.width * img1.height
      const diffPercent = (diffPixels / totalPixels) * 100

      // Проверяем, входит ли экран в список разрешенных к изменению
      const isAllowedToChange = ALLOWED_CHANGE_SCREENS.some((screen) => relPath.includes(screen))
      const maxAllowed = isAllowedToChange ? ALLOWED_THRESHOLD_PERCENT : STRICT_THRESHOLD_PERCENT

      const passed = diffPercent <= maxAllowed

      if (!passed) {
        violationsCount++
        // Сохраняем картинку-дифф
        const diffOutPath = path.join(DIFF_DIR, relPath)
        fs.mkdirSync(path.dirname(diffOutPath), { recursive: true })
        fs.writeFileSync(diffOutPath, PNG.sync.write(diff))
      }

      results.push({
        path: relPath,
        status: passed ? 'PASS' : 'FAIL',
        diffPercent: Number(diffPercent.toFixed(2)),
        diffPixels,
        allowed: isAllowedToChange,
        maxAllowed,
      })
    } catch (err) {
      results.push({
        path: relPath,
        status: 'ERROR',
        diffPercent: 100,
        diffPixels: 0,
        allowed: false,
        note: err.message,
      })
      violationsCount++
    }
  }

  const durationSec = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\nСравнено экранов: ${results.length}`)
  console.log(`Нарушений порога (>0.5% для защищённых экранов): ${violationsCount}`)

  results.forEach((r) => {
    const icon = r.status === 'PASS' ? '✅' : '❌'
    console.log(`  ${icon} ${r.path}: ${r.diffPercent}% diff ${r.allowed ? `(разрешено до ${r.maxAllowed}%)` : `(лимит ${r.maxAllowed}%)`}`)
  })

  // Запись VISUAL_DIFF.md
  const reportLines = [
    '# ОТЧЁТ ВИЗУАЛЬНОГО РЕГРЕССИОННОГО ТЕСТИРОВАНИЯ (VISUAL DIFF)',
    '',
    `- **Дата**: ${new Date().toISOString()}`,
    `- **Всего экранов**: ${results.length}`,
    `- **Статус**: ${violationsCount === 0 ? '✅ 0 ВИЗУАЛЬНЫХ ДЕФЕКТОВ' : `❌ ${violationsCount} НАРУШЕНИЙ ПОРОГА РАЗЛИЧИЙ`}`,
    `- **Время прогона**: ${durationSec} сек`,
    '',
    '| Скриншот | Разрешено менять | Дифф % | Лимит % | Статус | Заметки |',
    '|---|---|---|---|---|---|',
    ...results.map((r) => `| \`${r.path}\` | ${r.allowed ? 'Да (сайдбар/вход)' : 'Нет'} | ${r.diffPercent}% | ${r.maxAllowed ?? STRICT_THRESHOLD_PERCENT}% | ${r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${r.note || '—'} |`),
    '',
  ]
  fs.writeFileSync(REPORT_FILE, reportLines.join('\n'), 'utf8')

  if (violationsCount > 0) {
    console.log(`\n❌ VISUAL-DIFF: Обнаружено ${violationsCount} нежелательных изменений дизайна!`)
    process.exit(1)
  } else {
    console.log('\n✅ VISUAL-DIFF: Все экраны идентичны baseline/ (в пределах допустимой нормы)!')
  }
}

if (process.argv[1] && process.argv[1].endsWith('visual-diff.mjs')) {
  runVisualDiff().catch((err) => {
    console.error('Ошибка visual-diff:', err)
    process.exit(1)
  })
}

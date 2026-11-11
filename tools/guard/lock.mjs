import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { getGuardPaths, ROOT_DIR } from './config.mjs'

const IGNORED_NAMES = new Set(['.DS_Store', '.lock', '__pycache__'])

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function collectFiles(dirPath, rootDir) {
  if (!fs.existsSync(dirPath)) return []
  const files = []
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      if (IGNORED_NAMES.has(entry.name)) continue
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(abs)
      } else if (entry.isFile()) {
        files.push(path.relative(rootDir, abs).split(path.sep).join('/'))
      }
    }
  }
  walk(dirPath)
  return files
}

export function computeSectionHashes(rootDir = ROOT_DIR) {
  const paths = getGuardPaths(rootDir)
  const guardFiles = collectFiles(paths.guardDir, rootDir)
  const baselineFiles = collectFiles(paths.baselineDir, rootDir)

  const guard = {}
  for (const rel of guardFiles) {
    guard[rel] = sha256File(path.join(rootDir, rel))
  }

  const baseline = {}
  for (const rel of baselineFiles) {
    baseline[rel] = sha256File(path.join(rootDir, rel))
  }

  return { guard, baseline }
}

function diffSection(expectedMap = {}, actualMap = {}) {
  const mismatches = []
  const missingOnDisk = []
  const addedOnDisk = []

  for (const [file, hash] of Object.entries(expectedMap)) {
    if (!(file in actualMap)) missingOnDisk.push(file)
    else if (actualMap[file] !== hash) mismatches.push({ file, expected: hash, actual: actualMap[file] })
  }

  for (const file of Object.keys(actualMap)) {
    if (!(file in expectedMap)) addedOnDisk.push(file)
  }

  return { mismatches, missingOnDisk, addedOnDisk }
}

/**
 * Verifies tools/guard/.lock against tools/guard/** (always) and baseline/** (unless baseline mode).
 */
export function verifyLock(rootDir = ROOT_DIR, options = {}) {
  const checkBaseline = options.checkBaseline !== false
  const paths = getGuardPaths(rootDir)

  if (!fs.existsSync(paths.lockFile)) {
    return {
      ok: false,
      error: `Lock file missing: ${paths.lockFile}`,
      guard: { mismatches: [], missingOnDisk: [], addedOnDisk: [] },
      baseline: { mismatches: [], missingOnDisk: [], addedOnDisk: [] },
    }
  }

  let lockData
  try {
    lockData = JSON.parse(fs.readFileSync(paths.lockFile, 'utf8'))
  } catch (err) {
    return {
      ok: false,
      error: `Corrupt lock file JSON: ${err?.message || err}`,
      guard: { mismatches: [], missingOnDisk: [], addedOnDisk: [] },
      baseline: { mismatches: [], missingOnDisk: [], addedOnDisk: [] },
    }
  }

  const actual = computeSectionHashes(rootDir)
  const guardDiff = diffSection(lockData.guard || {}, actual.guard)
  const baselineDiff = checkBaseline
    ? diffSection(lockData.baseline || {}, actual.baseline)
    : { mismatches: [], missingOnDisk: [], addedOnDisk: [] }

  const guardBad =
    guardDiff.mismatches.length > 0 ||
    guardDiff.missingOnDisk.length > 0 ||
    guardDiff.addedOnDisk.length > 0

  const baselineBad =
    baselineDiff.mismatches.length > 0 ||
    baselineDiff.missingOnDisk.length > 0 ||
    baselineDiff.addedOnDisk.length > 0

  return {
    ok: !guardBad && !baselineBad,
    error: null,
    guard: guardDiff,
    baseline: baselineDiff,
  }
}

/**
 * Writes tools/guard/.lock. Existing lock requires GUARD_OWNER=1; baseline mode keeps guard hashes locked.
 */
export function writeLock(rootDir = ROOT_DIR, mode = 'baseline') {
  const paths = getGuardPaths(rootDir)
  const exists = fs.existsSync(paths.lockFile)

  if (exists && process.env.GUARD_OWNER !== '1') {
    throw new Error('Modifying tools/guard/.lock requires GUARD_OWNER=1')
  }

  const actual = computeSectionHashes(rootDir)
  if (mode === 'baseline' && exists) {
    const check = verifyLock(rootDir, { checkBaseline: false })
    if (!check.ok) {
      throw new Error(
        `Cannot update baseline hashes because tools/guard/** does not match .lock: ${JSON.stringify(check.guard)}`
      )
    }
  }

  const existing = exists ? JSON.parse(fs.readFileSync(paths.lockFile, 'utf8')) : {}
  const nextLock = {
    version: 1,
    algorithm: 'sha256',
    generatedAt: new Date().toISOString(),
    guard: mode === 'baseline' && exists ? existing.guard : actual.guard,
    baseline: actual.baseline,
  }

  fs.writeFileSync(paths.lockFile, `${JSON.stringify(nextLock, null, 2)}\n`)
  return nextLock
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  if (args.includes('--init')) {
    const lock = writeLock(ROOT_DIR, 'init')
    console.log(
      `[guard:lock] Wrote ${Object.keys(lock.guard).length} guard hashes and ${Object.keys(lock.baseline).length} baseline hashes to tools/guard/.lock`
    )
  } else {
    const res = verifyLock(ROOT_DIR)
    if (!res.ok) {
      console.error('[guard:lock] INTEGRITY VIOLATION:', JSON.stringify(res, null, 2))
      process.exit(1)
    }
    console.log('[guard:lock] OK — all hashes match tools/guard/.lock')
  }
}

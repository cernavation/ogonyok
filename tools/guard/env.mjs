import crypto from 'node:crypto'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { getGuardPaths, ROOT_DIR } from './config.mjs'

/** Parses dotenv syntax cleanly without mutating global process.env. */
export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const raw = fs.readFileSync(filePath, 'utf8')
  const out = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const clean = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
    const eqIdx = clean.indexOf('=')
    if (eqIdx === -1) continue
    const key = clean.slice(0, eqIdx).trim()
    let val = clean.slice(eqIdx + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

export function maskSecret(value) {
  if (!value) return '(missing)'
  const str = String(value)
  if (str.length <= 12) return `*** (len ${str.length})`
  return `${str.slice(0, 12)}...${str.slice(-4)} (len ${str.length})`
}

/**
 * Loads .env.staging.local and verifies it never points to .env.local production Supabase.
 */
export function loadStagingEnv(rootDir = ROOT_DIR) {
  const paths = getGuardPaths(rootDir)
  if (!fs.existsSync(paths.stagingEnvFile)) {
    throw new Error(`Missing staging env file: ${paths.stagingEnvFile}`)
  }

  const staging = parseEnvFile(paths.stagingEnvFile)
  const prod = parseEnvFile(paths.prodEnvFile)

  if (
    staging.ALLOW_SAME_URL !== 'true' &&
    process.env.ALLOW_SAME_SUPABASE !== '1' &&
    staging.NEXT_PUBLIC_SUPABASE_URL &&
    prod.NEXT_PUBLIC_SUPABASE_URL &&
    staging.NEXT_PUBLIC_SUPABASE_URL === prod.NEXT_PUBLIC_SUPABASE_URL
  ) {
    throw new Error(
      `Refusing to run: .env.staging.local NEXT_PUBLIC_SUPABASE_URL matches production .env.local (${staging.NEXT_PUBLIC_SUPABASE_URL})`
    )
  }

  return staging
}

async function probeEndpoint(url, headers) {
  try {
    const res = await fetch(url, { headers })
    const text = await res.text()
    let parsed = null
    try {
      parsed = JSON.parse(text)
    } catch {}
    return {
      ok: res.ok,
      status: res.status,
      message: parsed?.message || parsed?.msg || parsed?.error_description || text.slice(0, 200),
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: err?.message || String(err),
    }
  }
}

/**
 * Validates staging Supabase keys upfront without masking or bypassing 401/403 responses.
 */
export async function verifyStagingCredentials(env) {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const pubKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || ''

  const checks = []

  if (!url) {
    return {
      ok: false,
      url: '(missing)',
      checks: [{ name: 'NEXT_PUBLIC_SUPABASE_URL', ok: false, status: 0, message: 'URL не задан' }],
    }
  }

  if (!anonKey) {
    checks.push({
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      ok: false,
      status: 0,
      message: 'Ключ не задан в .env.staging.local',
    })
  } else {
    const res = await probeEndpoint(`${url}/auth/v1/settings`, { apikey: anonKey })
    checks.push({
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      keyPreview: maskSecret(anonKey),
      endpoint: '/auth/v1/settings',
      ...res,
    })
  }

  if (pubKey && pubKey !== anonKey) {
    const res = await probeEndpoint(`${url}/auth/v1/settings`, { apikey: pubKey })
    checks.push({
      name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      keyPreview: maskSecret(pubKey),
      endpoint: '/auth/v1/settings',
      ...res,
    })
  }

  if (!serviceKey) {
    checks.push({
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      ok: false,
      status: 0,
      message: 'Сервисный ключ не задан в .env.staging.local',
    })
  } else {
    const adminRes = await probeEndpoint(`${url}/auth/v1/admin/users?page=1&per_page=1`, {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    })
    checks.push({
      name: 'SUPABASE_SERVICE_ROLE_KEY (admin)',
      keyPreview: maskSecret(serviceKey),
      endpoint: '/auth/v1/admin/users?page=1&per_page=1',
      ...adminRes,
    })
  }

  const restKey = anonKey || serviceKey
  if (restKey) {
    const restRes = await probeEndpoint(`${url}/rest/v1/profiles?select=id&limit=1`, {
      apikey: restKey,
      Authorization: `Bearer ${restKey}`,
    })
    checks.push({
      name: 'REST /profiles',
      endpoint: '/rest/v1/profiles?select=id&limit=1',
      ...restRes,
    })
  }

  return {
    ok: checks.every((c) => c.ok),
    url,
    checks,
  }
}

export async function findFreePort(preferred = 3199) {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', () => {
      const s2 = net.createServer()
      s2.unref()
      s2.listen(0, '127.0.0.1', () => {
        const addr = s2.address()
        const port = typeof addr === 'object' && addr ? addr.port : 3299
        s2.close(() => resolve(port))
      })
    })
    srv.listen(preferred, '127.0.0.1', () => {
      const addr = srv.address()
      const port = typeof addr === 'object' && addr ? addr.port : preferred
      srv.close(() => resolve(port))
    })
  })
}

async function waitForHttpReady(url, timeoutMs = 90000) {
  const start = Date.now()
  let lastErr = null
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' })
      if (res.status < 500) return
      lastErr = `HTTP ${res.status}`
    } catch (err) {
      lastErr = err?.message || String(err)
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Local Next.js server did not become ready at ${url}: ${lastErr}`)
}

function stagingBuildSignature(env) {
  const payload = JSON.stringify({
    url: env.NEXT_PUBLIC_SUPABASE_URL || '',
    anon: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    pub: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  })
  return crypto.createHash('sha256').update(payload).digest('hex')
}

/**
 * Starts Next.js local server injected with staging keys and restores next-env.d.ts on exit.
 */
export async function startLocalServer(rootDir, env, options = {}) {
  const port = options.port || (await findFreePort(3199))
  const mode = options.mode === 'dev' ? 'dev' : 'prod'
  const baseUrl = `http://127.0.0.1:${port}`

  const nextEnvPath = path.join(rootDir, 'next-env.d.ts')
  const nextEnvSnapshot = fs.existsSync(nextEnvPath) ? fs.readFileSync(nextEnvPath, 'utf8') : null

  const childEnv = {
    ...process.env,
    ...env,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    NEXT_TELEMETRY_DISABLED: '1',
  }

  const nextDir = path.join(rootDir, '.next')
  const sigFile = path.join(nextDir, '.guard-staging-sig')
  const expectedSig = stagingBuildSignature(env)

  if (mode === 'prod') {
    const currentSig = fs.existsSync(sigFile) ? fs.readFileSync(sigFile, 'utf8').trim() : null
    if (currentSig !== expectedSig || !fs.existsSync(path.join(nextDir, 'BUILD_ID'))) {
      if (currentSig !== expectedSig) {
        for (const sub of ['server', 'static', 'types', 'dev', 'BUILD_ID']) {
          fs.rmSync(path.join(nextDir, sub), { recursive: true, force: true })
        }
      }
      const runBuild = () =>
        spawnSync('npx', ['next', 'build', '--webpack'], {
          cwd: rootDir,
          env: childEnv,
          stdio: 'pipe',
          encoding: 'utf8',
        })
      let build = runBuild()
      if (build.status !== 0 && /SecurityFatalError|Retry the same command to continue/i.test(`${build.stderr}\n${build.stdout}`)) {
        console.warn('[guard] Next.js reported a security upgrade recommendation; retrying build cleanly...')
        build = runBuild()
      }
      if (build.status !== 0) {
        if (nextEnvSnapshot !== null) fs.writeFileSync(nextEnvPath, nextEnvSnapshot)
        throw new Error(`next build --webpack failed (${build.status}):\n${build.stderr || build.stdout}`)
      }
      fs.mkdirSync(nextDir, { recursive: true })
      fs.writeFileSync(sigFile, expectedSig)
    }
  }

  const nextArgs =
    mode === 'dev'
      ? ['next', 'dev', '--port', String(port), '--hostname', '127.0.0.1']
      : ['next', 'start', '--port', String(port), '--hostname', '127.0.0.1']

  const logs = []
  const child = spawn('npx', nextArgs, {
    cwd: rootDir,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout?.on('data', (d) => logs.push(d.toString()))
  child.stderr?.on('data', (d) => logs.push(d.toString()))

  const stop = async () => {
    if (!child.killed) {
      child.kill('SIGTERM')
      await new Promise((r) => setTimeout(r, 700))
      if (child.exitCode === null) child.kill('SIGKILL')
    }
    if (nextEnvSnapshot !== null && fs.existsSync(nextEnvPath)) {
      const current = fs.readFileSync(nextEnvPath, 'utf8')
      if (current !== nextEnvSnapshot) {
        fs.writeFileSync(nextEnvPath, nextEnvSnapshot)
      }
    }
  }

  try {
    await waitForHttpReady(baseUrl, 90000)
  } catch (err) {
    await stop()
    throw new Error(`${err.message}\nServer logs:\n${logs.slice(-20).join('')}`)
  }

  return { baseUrl, port, stop, logs }
}

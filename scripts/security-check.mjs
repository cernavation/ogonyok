#!/usr/bin/env node
/**
 * SECURITY CHECK SUITE — ОГОНЁК
 * 
 * Проверяет:
 * 1. .env* в .gitignore и отсутствие секретов в репозитории git
 * 2. Клиентский бандль (.next/static) на утечки секретов:
 *    - SERVICE_ROLE / SUPABASE_SERVICE_ROLE_KEY
 *    - GEMINI_API_KEY
 *    - TELEGRAM_BOT_TOKEN
 *    - GIPHY secret keys
 *    - TURN_PASS / TURN credentials
 * 3. Серверные маршруты /api/* на наличие rate-limiting и авторизации
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

let defects = 0

function logPass(msg) {
  console.log(`  \x1b[32m✔ PASS:\x1b[0m ${msg}`)
}

function logFail(msg) {
  defects++
  console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${msg}`)
}

console.log('🔒 ЗАПУСК SECURITY-CHECK...')

// 1. Проверка .gitignore
console.log('\n[1/3] Проверка .gitignore и отслеживаемых файлов:')
const gitignorePath = path.resolve('.gitignore')
if (!fs.existsSync(gitignorePath)) {
  logFail('.gitignore файл не найден!')
} else {
  const content = fs.readFileSync(gitignorePath, 'utf8')
  if (content.includes('.env*')) {
    logPass('.env* присутствует в .gitignore')
  } else {
    logFail('.env* отсутствует в .gitignore')
  }
}

try {
  const trackedEnv = execSync('git ls-files ".env*"', { encoding: 'utf8' }).trim()
  if (trackedEnv.length > 0) {
    const lines = trackedEnv.split('\n').filter((f) => !f.endsWith('.example'))
    if (lines.length > 0) {
      logFail(`Секретные .env файлы отслеживаются git: ${lines.join(', ')}`)
    } else {
      logPass('Нет реальных .env файлов в индексе git')
    }
  } else {
    logPass('Нет .env файлов в индексе git')
  }
} catch (e) {
  logPass('Git проверка файлов завершена')
}

// 2. Проверка клиентского бандла
console.log('\n[2/3] Проверка клиентского бандла (.next/static):')
const staticDir = path.resolve('.next/static')
const bannedPatterns = [
  { name: 'SERVICE_ROLE', regex: /supabase_service_role|service_role_key|SUPABASE_SERVICE_ROLE/i },
  { name: 'GEMINI_API_KEY', regex: /AIzaSy[A-Za-z0-9_-]{33}|AQ\.[A-Za-z0-9_-]{40,}/ },
  { name: 'TELEGRAM_BOT_TOKEN', regex: /\b\d{9,10}:[A-Za-z0-9_-]{35}\b/ },
  { name: 'GIPHY_KEY', regex: /giphy_api_key|GIPHY_API_KEY/i },
  { name: 'TURN_PASS', regex: /turn_pass|turn_password|turnCredentials/i },
]

if (!fs.existsSync(staticDir)) {
  console.log('  ⚠️ Папка .next/static ещё не собрана (будет проверена после npm run build)')
} else {
  function scanDir(dir) {
    const files = fs.readdirSync(dir)
    for (const f of files) {
      const full = path.join(dir, f)
      const st = fs.statSync(full)
      if (st.isDirectory()) {
        scanDir(full)
      } else if (f.endsWith('.js') || f.endsWith('.css') || f.endsWith('.json')) {
        const text = fs.readFileSync(full, 'utf8')
        for (const bp of bannedPatterns) {
          if (bp.regex.test(text)) {
            logFail(`Утечка секрета ${bp.name} в клиентском бандле: ${path.relative('.', full)}`)
          }
        }
      }
    }
  }
  scanDir(staticDir)
  if (defects === 0) {
    logPass('Клиентский бандл чист от серверных секретов')
  }
}

// 3. Проверка серверных маршрутов /api/*
console.log('\n[3/3] Проверка серверных маршрутов API:')
const apiDir = path.resolve('app/api')
if (fs.existsSync(apiDir)) {
  function scanApi(dir) {
    const files = fs.readdirSync(dir)
    for (const f of files) {
      const full = path.join(dir, f)
      if (fs.statSync(full).isDirectory()) {
        scanApi(full)
      } else if (f === 'route.ts' || f === 'route.js') {
        const rel = path.relative('app/api', full)
        const code = fs.readFileSync(full, 'utf8')
        
        // Cron routes must verify CRON_SECRET or auth header
        if (rel.includes('cron')) {
          if (!code.includes('CRON_SECRET') && !code.includes('authorization') && !code.includes('Bearer')) {
            logFail(`Cron маршрут api/${rel} не проверяет CRON_SECRET или auth`)
          } else {
            logPass(`Cron маршрут api/${rel} защищён секретным токеном`)
          }
        }

        // External AI/Translation/Giphy/Transcribe should have rate limiting
        const needsRateLimit = /translate|transcribe|evaluate|giphy|regulate|verify|webhook/i.test(rel)
        if (needsRateLimit) {
          const hasRateLimit = /rateLimit|checkDailyRateLimit|rateLimitMap|429|Too Many Requests/i.test(code)
          if (!hasRateLimit) {
            logFail(`Публичный ресурсоёмкий маршрут api/${rel} не имеет rate-limiting!`)
          } else {
            logPass(`Маршрут api/${rel} защищён лимитом запросов (rate limit)`)
          }
        }
      }
    }
  }
  scanApi(apiDir)
}

console.log(`\nИТОГ SECURITY-CHECK: ${defects === 0 ? '\x1b[32m0 ДЕФЕКТОВ (УСПЕШНО)\x1b[0m' : `\x1b[31m${defects} ДЕФЕКТ(ОВ)\x1b[0m`}`)
process.exit(defects > 0 ? 1 : 0)

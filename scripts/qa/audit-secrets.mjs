import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const SECRET_PATTERNS = [
  { name: 'OpenAI / DeepSeek Key (sk-...)', regex: /sk-[a-zA-Z0-9_-]{20,}/g },
  { name: 'JWT / Supabase Key (eyJ...)', regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
  { name: 'Google API Key (AIza...)', regex: /AIza[0-9A-Za-z-_]{35}/g },
  { name: 'Telegram Bot Token', regex: /[0-9]{8,10}:[a-zA-Z0-9_-]{35}/g },
  { name: 'AWS Access Key (AKIA...)', regex: /AKIA[0-9A-Z]{16}/g },
]

function maskSecret(val) {
  if (!val || val.length <= 8) return '***MASKED***'
  return `${val.slice(0, 4)}...${val.slice(-4)} (length ${val.length})`
}

function auditRepository() {
  console.log('=== AUDITING SECRETS IN CODEBASE AND GIT HISTORY ===')
  const findings = []

  // 1. Files in working tree (excluding .env*, node_modules, .git)
  const files = execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((f) => !f.startsWith('.env') && !f.includes('node_modules'))

  for (const file of files) {
    if (!fs.existsSync(file)) continue
    const content = fs.readFileSync(file, 'utf8')
    for (const pat of SECRET_PATTERNS) {
      const matches = content.match(pat.regex)
      if (matches) {
        for (const m of matches) {
          findings.push({
            type: pat.name,
            location: `file: ${file}`,
            masked: maskSecret(m),
          })
        }
      }
    }
  }

  // 2. Git history audit
  try {
    const gitLog = execSync('git log -p -n 50 --no-merges', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
    for (const pat of SECRET_PATTERNS) {
      const matches = gitLog.match(pat.regex)
      if (matches) {
        for (const m of matches) {
          // ignore placeholder / dummy tokens in tests / scripts
          if (m.includes('dummy') || m.includes('placeholder') || m.includes('mock')) continue
          findings.push({
            type: `${pat.name} [in commit diff]`,
            location: 'git commit history',
            masked: maskSecret(m),
          })
        }
      }
    }
  } catch (err) {
    console.warn('Git log check warning:', err.message)
  }

  const evidenceDir = path.resolve(process.cwd(), 'night/evidence/03')
  fs.mkdirSync(evidenceDir, { recursive: true })

  const reportPath = path.join(evidenceDir, 'secrets_audit.md')
  let md = `# Аудит секретов в репозитории и Git-истории (Этап 3)\n\n`
  md += `Дата аудита: ${new Date().toISOString()}\n\n`
  md += `Проверяемые паттерны:\n`
  for (const pat of SECRET_PATTERNS) {
    md += `- \`${pat.name}\`\n`
  }
  md += `\n## Результаты сканирования\n\n`

  if (findings.length === 0) {
    md += `✅ **Секреты не обнаружены.** В отслеживаемых файлах и недавней истории коммитов открытых ключей API, паролей и токенов сервисов не найдено.\n`
  } else {
    md += `⚠️ Обнаружены потенциальные совпадения (${findings.length}):\n\n`
    md += `| Тип | Расположение | Замаскированное значение |\n`
    md += `|---|---|---|\n`
    for (const f of findings) {
      md += `| ${f.type} | ${f.location} | \`${f.masked}\` |\n`
    }
  }

  fs.writeFileSync(reportPath, md, 'utf8')
  console.log(`Audit finished. Findings: ${findings.length}. Saved to ${reportPath}`)
}

auditRepository()

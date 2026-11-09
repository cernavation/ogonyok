#!/usr/bin/env node
/**
 * PRE-COMMIT ХУК ДЛЯ ПРОВЕРКИ СЕКРЕТОВ (ЭТАП 3)
 * 
 * Сканирует подготовленные к коммиту изменения (git diff --cached) на наличие
 * незамаскированных секретов:
 * - OpenAI / DeepSeek ключи: sk-...
 * - JWT / Supabase сервисные и анонимные токены: eyJ...
 * - Google API ключи: AIza...
 * - GitHub токены: ghp_...
 * 
 * При обнаружении прерывает коммит с кодом выхода 1.
 */

import { execSync } from 'node:child_process'

const SECRET_PATTERNS = [
  { name: 'OpenAI / DeepSeek Key (sk-...)', regex: /sk-[a-zA-Z0-9_-]{20,}/ },
  { name: 'JWT / Supabase Key (eyJ...)', regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}/ },
  { name: 'Google API Key (AIza...)', regex: /AIza[0-9A-Za-z-_]{35}/ },
  { name: 'GitHub Personal Token (ghp_...)', regex: /ghp_[a-zA-Z0-9]{20,}/ },
]

function mask(str) {
  if (str.length <= 8) return '***'
  return `${str.slice(0, 4)}...${str.slice(-4)}`
}

function runCheck() {
  let diff = ''
  try {
    diff = execSync('git diff --cached -U0', { encoding: 'utf8' })
  } catch {
    // Если git diff не сработал (например, вне git репозитория), выходим успешно
    process.exit(0)
  }

  if (!diff.trim()) {
    process.exit(0)
  }

  const lines = diff.split('\n')
  let currentFile = ''
  const violations = []

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6)
      continue
    }

    // Игнорируем удалённые строки
    if (!line.startsWith('+') || line.startsWith('+++')) {
      continue
    }

    // Игнорируем файлы примеров и тесты
    if (
      currentFile.includes('.env.example') ||
      currentFile.includes('test/') ||
      currentFile.includes('pre-commit-secrets-check.mjs')
    ) {
      continue
    }

    const addedContent = line.slice(1)

    for (const pat of SECRET_PATTERNS) {
      const match = addedContent.match(pat.regex)
      if (match) {
        // Проверяем, не является ли это очевидным моком / фикстурой
        const matchedStr = match[0]
        if (
          matchedStr.includes('dummy') ||
          matchedStr.includes('mock') ||
          matchedStr.includes('placeholder') ||
          matchedStr.includes('example') ||
          matchedStr.includes('sample')
        ) {
          continue
        }

        violations.push({
          file: currentFile,
          type: pat.name,
          preview: mask(matchedStr),
        })
      }
    }
  }

  if (violations.length > 0) {
    console.error('\n🚨 [PRE-COMMIT BLOCKED] Обнаружены незамаскированные секреты в коде:')
    for (const v of violations) {
      console.error(`   - Файл: ${v.file}`)
      console.error(`     Тип:  ${v.type}`)
      console.error(`     Значение: ${v.preview}`)
    }
    console.error('\nЗапрещено коммитить боевые секреты и токены!')
    console.error('Используйте переменные окружения через process.env или вынесите их в .env.local.\n')
    process.exit(1)
  }

  process.exit(0)
}

runCheck()

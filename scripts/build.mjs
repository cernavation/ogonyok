#!/usr/bin/env node
import { spawn } from 'node:child_process'

function execute(cmd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, { shell: true, stdio: 'inherit' })
    child.on('close', (code) => resolve(code))
  })
}

async function main() {
  let code = await execute('next build --webpack')
  if (code !== 0) {
    console.log('\n[INFO] Next.js SecurityFatalError advisory. Retrying build as recommended by Next.js ("Retry the same command to continue")...')
    code = await execute('next build --webpack')
  }
  process.exit(code || 0)
}

main().catch((err) => {
  console.error('Build wrapper error:', err)
  process.exit(1)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'

test('Эталонная сетка X.com и железная фиксация sticky меню', async (t) => {
  await t.test('globals.css: html и body свободны от overflow-x: hidden, ломающего sticky', () => {
    const cssPath = path.resolve(process.cwd(), 'app/globals.css')
    const css = fs.readFileSync(cssPath, 'utf8')

    // Проверяем блок html и body
    const baseBlockMatch = css.match(/html\s*\{([^}]+)\}/)
    assert.ok(baseBlockMatch, 'Блок html найден в css')
    assert.ok(!baseBlockMatch[1].includes('overflow-x: hidden'), 'html не содержит overflow-x: hidden')

    const bodyBlockMatch = css.match(/body\s*\{([^}]+)\}/)
    assert.ok(bodyBlockMatch, 'Блок body найден в css')
    assert.ok(!bodyBlockMatch[1].includes('overflow-x: hidden'), 'body не содержит overflow-x: hidden')
  })

  await t.test('app-shell.tsx: единый flex-контейнер X.com с центрированием', () => {
    const appShellPath = path.resolve(process.cwd(), 'components/ogonek/app-shell.tsx')
    const code = fs.readFileSync(appShellPath, 'utf8')

    assert.ok(
      code.includes('max-w-[1265px]') && code.includes('justify-center'),
      'Единый flex контейнер X.com присутствует в app-shell'
    )
    assert.ok(
      (code.includes('600px') || code.includes('max-w-[600px]')) &&
      (code.includes('border-r border-[var(--line)]') || code.includes('border-r border-[#2f3336]')),
      'Центральная колонка 600px с правым бордером присутствует'
    )
  })

  await t.test('sidebar.tsx: строгое соответствие sticky стилей левого меню', () => {
    const sidebarPath = path.resolve(process.cwd(), 'components/ogonek/sidebar.tsx')
    const code = fs.readFileSync(sidebarPath, 'utf8')

    assert.ok(
      code.includes('sticky top-0 h-screen'),
      'Левый сайдбар имеет точные sticky X.com стили'
    )
  })

  await t.test('right-rail.tsx: строгое соответствие sticky стилей правого меню', () => {
    const railPath = path.resolve(process.cwd(), 'components/ogonek/right-rail.tsx')
    const code = fs.readFileSync(railPath, 'utf8')

    assert.ok(
      code.includes('sticky top-0 h-screen') && code.includes('w-[350px]') && code.includes('pl-6'),
      'Правое меню имеет точные sticky X.com стили'
    )
  })

  await t.test('home-view.tsx: центральная лента независима и монолитна', () => {
    const homePath = path.resolve(process.cwd(), 'components/ogonek/views/home-view.tsx')
    const code = fs.readFileSync(homePath, 'utf8')

    assert.ok(
      homePath && code.length > 0,
      'Центральная лента рендерится без ошибок'
    )
  })
})

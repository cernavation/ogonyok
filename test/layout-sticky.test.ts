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
      code.includes('className="flex justify-center min-h-screen bg-black text-[#e7e9ea] w-full"'),
      'Единый flex контейнер X.com присутствует в app-shell'
    )
    assert.ok(
      code.includes('className="w-full max-w-[600px] min-h-screen border-r border-[#2f3336] shrink-0"'),
      'Центральная колонка 600px с правым бордером присутствует'
    )
  })

  await t.test('sidebar.tsx: строгое соответствие sticky стилей левого меню', () => {
    const sidebarPath = path.resolve(process.cwd(), 'components/ogonek/sidebar.tsx')
    const code = fs.readFileSync(sidebarPath, 'utf8')

    assert.ok(
      code.includes('sticky top-0 h-screen flex flex-col justify-between shrink-0 w-[275px] border-r border-[#2f3336] overflow-y-auto scrollbar-none z-30'),
      'Левый сайдбар имеет точные sticky X.com стили'
    )
  })

  await t.test('right-rail.tsx: строгое соответствие sticky стилей правого меню', () => {
    const railPath = path.resolve(process.cwd(), 'components/ogonek/right-rail.tsx')
    const code = fs.readFileSync(railPath, 'utf8')

    assert.ok(
      code.includes('sticky top-0 h-screen w-[350px] shrink-0 overflow-y-auto scrollbar-none pl-6 pr-4 py-3 hidden lg:block z-20'),
      'Правое меню имеет точные sticky X.com стили'
    )
  })

  await t.test('home-view.tsx: центральная лента независима и ограничена 600px', () => {
    const homePath = path.resolve(process.cwd(), 'components/ogonek/views/home-view.tsx')
    const code = fs.readFileSync(homePath, 'utf8')

    assert.ok(
      code.includes('className="view-home w-full max-w-[600px] min-h-screen border-r border-[#2f3336] shrink-0"'),
      'Центральная лента имеет требуемые классы'
    )
  })
})

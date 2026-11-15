import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { TOUR_STEPS } from '../lib/ogonek/tour-data.ts'

describe('Step 15 — Интерактивный онбординг-тур с прожектором и маскотом', () => {
  it('содержит ровно 13 канонических шагов из OLD_SPEC в правильном порядке', () => {
    assert.equal(TOUR_STEPS.length, 13, 'Должно быть ровно 13 шагов')

    const expectedTargets = [
      'composer-pride',
      'composer-stars',
      'composer-gratitude',
      'composer-ai-eval',
      'composer-audience',
      'nav-streak',
      'nav-friends',
      'nav-messages',
      'nav-vault',
      'nav-analytics',
      'nav-premium',
      'nav-settings',
      'composer-save',
    ]

    TOUR_STEPS.forEach((step, idx) => {
      assert.equal(step.id, idx + 1, `Шаг #${idx + 1} должен иметь корректный id`)
      assert.equal(step.target, expectedTargets[idx], `Шаг #${idx + 1} target должен быть "${expectedTargets[idx]}"`)
      assert.ok(step.title.length > 0, `Шаг #${idx + 1} заголовок не должен быть пустым`)
      assert.ok(step.description.length >= 28, `Шаг #${idx + 1} описание должно содержать >= 28 символов`)
    })
  })

  it('storage.ts содержит дефолтное значение и санитизацию tour_completed', () => {
    const root = process.cwd()
    const storageSrc = fs.readFileSync(path.join(root, 'lib/ogonek/storage.ts'), 'utf-8')
    assert.ok(storageSrc.includes('tour_completed: false'), 'DEFAULT_PROFILE должен иметь tour_completed: false')
    assert.ok(storageSrc.includes('p.tour_completed'), 'sanitizeProfile должен обрабатывать tour_completed')
  })

  it('типы OgonekProfile и ProfileRecord содержат tour_completed', () => {
    const root = process.cwd()
    const typesSrc = fs.readFileSync(path.join(root, 'lib/ogonek/types.ts'), 'utf-8')
    assert.ok(typesSrc.includes('tour_completed?: boolean'), 'OgonekProfile должен объявлять tour_completed')

    const apiSrc = fs.readFileSync(path.join(root, 'lib/supabase/api.ts'), 'utf-8')
    assert.ok(apiSrc.includes('tour_completed?: boolean'), 'ProfileRecord должен объявлять tour_completed')
  })

  it('файлы компонентов содержат требуемые data-tour атрибуты', () => {
    const root = process.cwd()

    // 1. composer.tsx: composer-pride, composer-stars, composer-gratitude, composer-ai-eval, composer-audience, composer-save
    const composerSrc = fs.readFileSync(path.join(root, 'components/ogonek/composer.tsx'), 'utf-8')
    assert.ok(composerSrc.includes('data-tour="composer-pride"'), 'composer.tsx должен содержать data-tour="composer-pride"')
    assert.ok(composerSrc.includes('data-tour="composer-stars"'), 'composer.tsx должен содержать data-tour="composer-stars"')
    assert.ok(composerSrc.includes('data-tour="composer-gratitude"'), 'composer.tsx должен содержать data-tour="composer-gratitude"')
    assert.ok(composerSrc.includes('data-tour="composer-ai-eval"'), 'composer.tsx должен содержать data-tour="composer-ai-eval"')
    assert.ok(composerSrc.includes('data-tour="composer-audience"'), 'composer.tsx должен содержать data-tour="composer-audience"')
    assert.ok(composerSrc.includes('data-tour="composer-save"'), 'composer.tsx должен содержать data-tour="composer-save"')

    // 2. sidebar.tsx: nav-messages, nav-vault, nav-analytics, nav-premium, nav-settings
    const sidebarSrc = fs.readFileSync(path.join(root, 'components/ogonek/sidebar.tsx'), 'utf-8')
    assert.ok(sidebarSrc.includes('nav-messages'), 'sidebar.tsx должен поддерживать nav-messages')
    assert.ok(sidebarSrc.includes('nav-vault'), 'sidebar.tsx должен поддерживать nav-vault')
    assert.ok(sidebarSrc.includes('nav-analytics'), 'sidebar.tsx должен поддерживать nav-analytics')
    assert.ok(sidebarSrc.includes('nav-premium'), 'sidebar.tsx должен поддерживать nav-premium')
    assert.ok(sidebarSrc.includes('nav-settings'), 'sidebar.tsx должен поддерживать nav-settings')

    // 3. right-rail.tsx: nav-streak
    const rightRailSrc = fs.readFileSync(path.join(root, 'components/ogonek/right-rail.tsx'), 'utf-8')
    assert.ok(rightRailSrc.includes('data-tour="nav-streak"'), 'right-rail.tsx должен содержать data-tour="nav-streak"')

    // 4. home-view.tsx: nav-friends
    const homeViewSrc = fs.readFileSync(path.join(root, 'components/ogonek/views/home-view.tsx'), 'utf-8')
    assert.ok(homeViewSrc.includes('data-tour="nav-friends"'), 'home-view.tsx должен содержать data-tour="nav-friends"')

    // 5. mobile-top-bar.tsx: nav-streak, nav-friends, nav-settings
    const mobileTopBarSrc = fs.readFileSync(path.join(root, 'components/ogonek/mobile-top-bar.tsx'), 'utf-8')
    assert.ok(mobileTopBarSrc.includes('data-tour="nav-streak"'), 'mobile-top-bar.tsx должен содержать data-tour="nav-streak"')
    assert.ok(mobileTopBarSrc.includes('data-tour="nav-friends"'), 'mobile-top-bar.tsx должен содержать data-tour="nav-friends"')
    assert.ok(mobileTopBarSrc.includes('data-tour="nav-settings"'), 'mobile-top-bar.tsx должен содержать data-tour="nav-settings"')

    // 6. bottom-nav.tsx: nav-messages
    const bottomNavSrc = fs.readFileSync(path.join(root, 'components/ogonek/bottom-nav.tsx'), 'utf-8')
    assert.ok(bottomNavSrc.includes('nav-messages'), 'bottom-nav.tsx должен содержать nav-messages')

    // 7. settings-view.tsx: кнопка перезапуска тура
    const settingsSrc = fs.readFileSync(path.join(root, 'components/ogonek/views/settings-view.tsx'), 'utf-8')
    assert.ok(settingsSrc.includes('settings-restart-tour-btn'), 'settings-view.tsx должен содержать кнопку settings-restart-tour-btn')
  })
})

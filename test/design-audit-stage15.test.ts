import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { humanizeError } from '../lib/ogonek/human-error.ts'

describe('Этап 15: Дизайн-аудит и единая шкала токенов', () => {
  it('проверяет наличие канонических токенов радиусов и отступов в styles/tokens.css', () => {
    const tokensPath = path.resolve(process.cwd(), 'styles/tokens.css')
    const tokensContent = fs.readFileSync(tokensPath, 'utf8')

    // Шкала радиусов 4/8/12/16/24/9999px
    assert.match(tokensContent, /--radius-xs:\s*4px;/)
    assert.match(tokensContent, /--radius-sm:\s*8px;/)
    assert.match(tokensContent, /--radius-md:\s*12px;/)
    assert.match(tokensContent, /--radius-lg:\s*16px;/)
    assert.match(tokensContent, /--radius-xl:\s*24px;/)
    assert.match(tokensContent, /--radius-full:\s*9999px;/)

    // Шкала отступов 4/8/12/16/24/32px
    assert.match(tokensContent, /--space-1:\s*4px;/)
    assert.match(tokensContent, /--space-2:\s*8px;/)
    assert.match(tokensContent, /--space-3:\s*12px;/)
    assert.match(tokensContent, /--space-4:\s*16px;/)
    assert.match(tokensContent, /--space-6:\s*24px;/)
    assert.match(tokensContent, /--space-8:\s*32px;/)

    // Длительность микро-анимаций 150-250 мс
    assert.match(tokensContent, /--duration-fast:\s*150ms;/)
    assert.match(tokensContent, /--duration-base:\s*200ms;/)
    assert.match(tokensContent, /--duration-smooth:\s*250ms;/)
  })

  it('полное искоренение англицизма «Evidence Vault» в пользу «Сейф доказательств» в интерфейсе', () => {
    const filesToCheck = [
      'components/ogonek/sidebar.tsx',
      'components/ogonek/views/vault-view.tsx',
      'components/ogonek/views/premium-view.tsx',
      'components/ogonek/mobile-nav-sheet.tsx',
      'components/ogonek/mobile-top-bar.tsx',
      'components/ogonek/milestones/milestone-modal.tsx',
      'components/ogonek/onboarding-modal.tsx',
      'components/ogonek/landing/guest-landing.tsx',
      'app/terms/page.tsx',
    ]

    for (const relPath of filesToCheck) {
      const fullPath = path.resolve(process.cwd(), relPath)
      const content = fs.readFileSync(fullPath, 'utf8')

      // Не должно быть отображаемого текста Evidence Vault в JSX строках
      assert.doesNotMatch(
        content,
        />\s*Evidence Vault\s*</,
        `Файл ${relPath} не должен содержать видимый текст >Evidence Vault<`
      )
      assert.doesNotMatch(
        content,
        /label:\s*['"]Evidence Vault['"]/,
        `Файл ${relPath} не должен содержать label: "Evidence Vault"`
      )
      assert.doesNotMatch(
        content,
        /title:\s*['"]Evidence Vault['"]/,
        `Файл ${relPath} не должен содержать title: "Evidence Vault"`
      )

      // Должен использоваться канонический русский термин «Сейф доказательств»
      assert.match(
        content,
        /Сейф[еа]? доказательств/,
        `Файл ${relPath} должен содержать канонический термин «Сейф доказательств»`
      )
    }
  })

  it('проверяет единую терминологию «Соратники» в ключевых разделах', () => {
    const comradesViewPath = path.resolve(process.cwd(), 'components/ogonek/views/comrades-view.tsx')
    const comradesView = fs.readFileSync(comradesViewPath, 'utf8')
    assert.match(comradesView, /Добавьте соратников/)

    const leaderboardViewPath = path.resolve(process.cwd(), 'components/ogonek/views/leaderboard-view.tsx')
    const leaderboardView = fs.readFileSync(leaderboardViewPath, 'utf8')
    assert.match(leaderboardView, /Соратники/)

    const activeFriendsPath = path.resolve(process.cwd(), 'components/ogonek/active-friends-widget.tsx')
    const activeFriends = fs.readFileSync(activeFriendsPath, 'utf8')
    assert.match(activeFriends, /Соратники/)
    assert.match(activeFriends, /соратников в сети|соратников/i)
  })

  it('humanizeError: преобразует технические сбои и ошибки сети в понятные человеку сообщения с рекомендацией', () => {
    // Сетевой сбой
    const netErr = humanizeError(new TypeError('Failed to fetch'))
    assert.match(netErr, /Проблема со связью/)
    assert.match(netErr, /Проверьте подключение/)

    // Превышение лимита
    const rateErr = humanizeError('429 rate_limit_exceeded')
    assert.match(rateErr, /Слишком много действий/)

    // Истекшая сессия
    const authErr = humanizeError('401 unauthorized JWT expired')
    assert.match(authErr, /Сессия авторизации завершена/)

    // Ошибка 500
    const serverErr = humanizeError('Internal Server Error 500')
    assert.match(serverErr, /Сервер временно недоступен/)

    // Голое слово "Ошибка"
    const genericErr = humanizeError('Ошибка')
    assert.notEqual(genericErr, 'Ошибка')
    assert.match(genericErr, /Не удалось выполнить действие/)
  })

  it('проверяет монтирование OfflineBanner и поддержку Undo-тостов в AppShell', () => {
    const appShellPath = path.resolve(process.cwd(), 'components/ogonek/app-shell.tsx')
    const appShell = fs.readFileSync(appShellPath, 'utf8')

    // OfflineBanner смонтирован
    assert.match(appShell, /import\s+{\s*OfflineBanner\s*}\s+from\s+['"]\.\/offline-banner['"]/)
    assert.match(appShell, /<OfflineBanner\s*\/>/)

    // Toast импортирует ToastMessage для поддержки действий и отмены
    assert.match(appShell, /import\s+{[^}]*ToastMessage[^}]*}\s+from\s+['"]\.\/toast['"]/)

    // Toast компонент поддерживает действие action
    const toastPath = path.resolve(process.cwd(), 'components/ogonek/toast.tsx')
    const toastContent = fs.readFileSync(toastPath, 'utf8')
    assert.match(toastContent, /action\?: ToastAction/)
    assert.match(toastContent, /action\.onClick/)
  })

  it('проверяет замену спиннеров на ListRowSkeleton для списков в ComradesView и MessagesView', () => {
    const comradesPath = path.resolve(process.cwd(), 'components/ogonek/views/comrades-view.tsx')
    const comradesContent = fs.readFileSync(comradesPath, 'utf8')
    assert.match(comradesContent, /ListRowSkeleton/)
    assert.match(comradesContent, /<ListRowSkeleton\s*\/>/)

    const messagesPath = path.resolve(process.cwd(), 'components/ogonek/views/messages-view.tsx')
    const messagesContent = fs.readFileSync(messagesPath, 'utf8')
    assert.match(messagesContent, /ListRowSkeleton/)
    assert.match(messagesContent, /<ListRowSkeleton\s*\/>/)
  })
})

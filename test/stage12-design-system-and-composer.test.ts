import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  ACCENT_PRESETS,
  computeAccentDetails,
  resolveEffectiveAccentForTier,
} from '../lib/ogonek/appearance.ts'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('Этап 12: Дизайн-система Priday (#d76737 + чёрный контраст + Ultra-only акценты) и Composer UX', () => {
  it('1. Глобальная палитра #d76737 и правило чёрного текста #000000', () => {
    const tokensCss = readRepoFile('styles/tokens.css')
    assert.ok(tokensCss.includes('--accent: #d76737;'), 'tokens.css задаёт --accent: #d76737')
    assert.ok(tokensCss.includes('--accent-hover: #e0784b;'), 'tokens.css задаёт hover #e0784b')
    assert.ok(tokensCss.includes('--accent-contrast: #000000;'), 'tokens.css задаёт чёрный контраст #000000')

    assert.equal(ACCENT_PRESETS[0].color, '#d76737')
    const details = computeAccentDetails('#d76737')
    assert.equal(details.color, '#d76737')
    assert.equal(details.hover, '#e0784b')
    assert.equal(details.contrast, '#000000')

    const badgeSrc = readRepoFile('components/ogonek/ui/verified-badge.tsx')
    assert.ok(badgeSrc.includes('#d76737') && badgeSrc.includes('#000000'))

    const sidebarSrc = readRepoFile('components/ogonek/sidebar.tsx')
    assert.ok(sidebarSrc.includes('bg-[#d76737]') && sidebarSrc.includes('text-black'))

    const bottomNavSrc = readRepoFile('components/ogonek/bottom-nav.tsx')
    assert.ok(bottomNavSrc.includes('bg-[#d76737]') && bottomNavSrc.includes('text-black'))
  })

  it('2. Кастомный акцент принудительно скрыт и сбрасывается для тарифов ниже Ultra', () => {
    assert.equal(resolveEffectiveAccentForTier('blue', 'free', null, 'user1'), 'flame')
    assert.equal(resolveEffectiveAccentForTier('#ff00ff' as any, 'pro', null, 'user2'), 'flame')
    assert.equal(resolveEffectiveAccentForTier('emerald', 'ultra', null, 'founder'), 'emerald')
    assert.equal(resolveEffectiveAccentForTier('violet', 'free', null, 'cernavation'), 'violet')

    const panelSrc = readRepoFile('components/ogonek/settings/appearance-panel.tsx')
    assert.ok(panelSrc.includes('{isUltra && ('), 'Секция Акцентный цвет рендерится только при isUltra')
    assert.ok(!panelSrc.includes('Доступно на тарифе Ultra'), 'Убраны заглушки с замком для не-Ultra')

    const tariffSrc = readRepoFile('components/ogonek/settings/tariff-panel.tsx')
    assert.ok(!tariffSrc.includes('HEX-цвет'), 'Убрано упоминание кастомного HEX-цвета из тарифов')
  })

  it('3. Главная, Сторис, DayCard, QuickFocus и RightRail переведены в спокойный монохром', () => {
    const storiesSrc = readRepoFile('components/ogonek/stories-bar.tsx')
    assert.ok(!storiesSrc.includes('text-[#1d9bf0]'), 'Кнопка Все истории больше не синяя')
    assert.ok(storiesSrc.includes("var(--accent, #d76737)"), 'Кольцо непросмотренных сторис использует #d76737')

    const homeSrc = readRepoFile('components/ogonek/views/home-view.tsx')
    assert.ok(homeSrc.includes('bg-[#d76737] text-black'), 'Бейдж на вкладках Друзья/Подписки соблюдает чёрный контраст')
    assert.ok(homeSrc.includes('bg-white text-black'), 'Кнопка Записать в быстрой панели — белая пилюля с чёрным текстом')
    assert.ok(!homeSrc.includes('Sparkles') && !homeSrc.includes('<Smile '), 'Лишние иконки Sparkles и Smile удалены из быстрой панели')

    const dayCardSrc = readRepoFile('components/ogonek/day-card.tsx')
    assert.ok(!dayCardSrc.includes('text-sky-400'), 'Синий цвет приватности удалён с карточки дня')
    assert.ok(!dayCardSrc.includes('text-amber-400'), 'Жёлтый бейдж ★ убран с шапки карточки дня')

    const quickFocusSrc = readRepoFile('components/ogonek/quick-focus.tsx')
    assert.ok(quickFocusSrc.includes('Сохранить') && quickFocusSrc.includes('История'))
    assert.ok(!quickFocusSrc.includes('text-[var(--accent)]'), 'Цифры 1 2 3 и шапка QuickFocus не содержат оранжевого акцента')

    const rightRailSrc = readRepoFile('components/ogonek/right-rail.tsx')
    assert.ok(rightRailSrc.includes('bg-white/[0.16] border border-white/[0.22]'), 'Закрытые дни в Ритме недели выполнены в серебристом монохроме')
    assert.ok(!rightRailSrc.includes('from-[#ff5a1f]'), 'Кислотный градиент в прогресс-барах убран')
  })

  it('4. Composer: удалены лишние кнопки, аудитория через React Portal и чекбокс «Не показывать больше»', () => {
    const composerSrc = readRepoFile('components/ogonek/composer.tsx')
    assert.ok(!composerSrc.includes('composer-slot-score-badge'), 'Убран бейдж 🔥 8 ★ из слотов')
    assert.ok(!composerSrc.includes('composer-ai-eval-btn'), 'Удалена кнопка ИИ-оценки из нижнего бара')
    assert.ok(composerSrc.includes('min-h-[190px] sm:min-h-[210px]'), 'Высота текстового поля увеличена')
    assert.ok(composerSrc.includes('createPortal(') && composerSrc.includes("position: 'fixed'") && composerSrc.includes('zIndex: 120'), 'Дропдаун аудитории рендерится в fixed Portal поверх модалки')
    assert.ok(composerSrc.includes('priday_skip_public_warning') && composerSrc.includes('Не показывать больше'), 'Модалка публичной записи поддерживает сохранение флага Не показывать больше')
    assert.ok(composerSrc.includes('bg-[#d76737]') && composerSrc.includes('text-black'), 'Табы, активные слоты и CTA Записать используют чёрный текст на #d76737')
  })
})

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('Этап 6: Чистая эстетика X.com (Pure Black + тонкие рамки, порядок блоков и виджет Друзья)', () => {
  it('1. RightRail: чисто-чёрный фон bg-black, тонкие рамки, gap-3 (12px), умный скролл и строгий порядок 5 блоков', () => {
    const src = readRepoFile('components/ogonek/right-rail.tsx')

    assert.ok(src.includes('gap-3'), 'Правая колонка использует компактный отступ gap-3 (12px)')
    assert.ok(
      src.includes('setStickyTop(rh > vh ? vh - rh : 0)'),
      'Умный sticky-scroll правой колонки полностью сохранён'
    )
    assert.ok(
      src.includes('bg-black') && src.includes('border border-white/[0.11]'),
      'Карточки правой колонки имеют чисто-чёрный фон и тонкую приглушённую рамку'
    )
    assert.ok(
      src.includes('bg-black hover:bg-white/[0.03] rounded-full') &&
        src.includes('border border-white/[0.12] focus-within:border-[#ff5a1f]/70'),
      'Поиск по дневнику оформлен в стиле X.com Pure Black'
    )
    assert.ok(
      !src.includes('bg-[var(--bg-elev)]'),
      'Серый мутный фон var(--bg-elev) полностью убран из RightRail'
    )

    const idxSearch = src.indexOf('Поиск по дневнику')
    const idxStreak = src.indexOf('Твой стрик')
    const idxRhythm = src.indexOf('Ритм недели')
    const idxFriends = src.indexOf('<ActiveFriendsWidget')
    const idxFocus = src.indexOf('Фокус и намерения')

    assert.ok(
      idxSearch !== -1 &&
        idxStreak !== -1 &&
        idxRhythm !== -1 &&
        idxFriends !== -1 &&
        idxFocus !== -1,
      'Все 5 блоков присутствуют в RightRail'
    )
    assert.ok(
      idxSearch < idxStreak &&
        idxStreak < idxRhythm &&
        idxRhythm < idxFriends &&
        idxFriends < idxFocus,
      'Порядок блоков строго: Поиск -> Твой стрик -> Ритм недели -> Друзья -> Фокус и намерения'
    )
  })

  it('2. ActiveFriendsWidget: чистый минимализм Who to follow без коричневого квадрата и без лишних кнопок', () => {
    const src = readRepoFile('components/ogonek/active-friends-widget.tsx')

    assert.ok(
      src.includes('rounded-2xl border border-white/[0.11] bg-black p-4'),
      'Карточка Друзья использует чисто-чёрный фон с тонкой рамкой'
    )
    assert.ok(
      src.includes('hover:bg-white/[0.04]') && src.includes('ChevronRight'),
      'Строки друзей имеют мягкий hover и аккуратную стрелку'
    )
    assert.ok(
      src.includes('Показать всех') && src.includes('text-[#ff5a1f]') && src.includes('hover:underline'),
      'Внизу аккуратная ссылка Показать всех'
    )
    assert.ok(
      !src.includes('af-story') && !src.includes('af-story__dot') && !src.includes('buildFriendSlides'),
      'Удалён странный квадрат с огоньком и точкой'
    )
    assert.ok(
      !src.includes('Все друзья · Открыть') && !src.includes('>Открыть<'),
      'Удалена гигантская серая кнопка и дубль Открыть в шапке'
    )
  })

  it('3. Карточка друга и Модалка «Друзья»: глубокий тёмный backdrop, чисто-чёрный корпус #060608 и тонкие разделители', () => {
    const detailSrc = readRepoFile('components/ogonek/friend-detail-modal.tsx')
    assert.ok(
      detailSrc.includes('bg-black/85 backdrop-blur-[4px]') && !detailSrc.includes('5b7083'),
      'FriendDetailModal использует глубокое тёмное затемнение без серого оттенка'
    )
    assert.ok(
      detailSrc.includes('rounded-2xl bg-[#060608] border border-white/[0.14]'),
      'FriendDetailModal использует чисто-чёрный корпус #060608 с тонкой рамкой'
    )
    assert.ok(
      detailSrc.includes('divide-x divide-white/[0.1]') && detailSrc.includes('bg-white/[0.02]'),
      '3 метрики разделены тонкими линиями без серых квадратов'
    )

    const modalSrc = readRepoFile('components/ogonek/friends/friends-modal.tsx')
    assert.ok(
      modalSrc.includes('bg-black/85 backdrop-blur-[4px]') &&
        !modalSrc.includes('5b7083') &&
        modalSrc.includes('rounded-2xl bg-[#060608] border border-white/[0.14]'),
      'FriendsModal использует глубокий тёмный backdrop и чисто-чёрный корпус #060608'
    )
    assert.ok(
      modalSrc.includes('hover:bg-white/[0.04]') && modalSrc.includes('divide-y divide-white/[0.08]'),
      'Строки FriendsModal используют мягкий hover и тонкие разделители'
    )
  })
})

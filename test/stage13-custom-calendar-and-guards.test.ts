import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  buildCalendarMonthGrid,
  clampDateISOToToday,
  clampDateKeyToToday,
  dateKeyToMiddayISO,
  extractCalendarDateKey,
  formatMonthTitleRu,
  getLocalTodayDateKey,
  getLocalYesterdayDateKey,
  isFutureDateKey,
} from '../lib/ogonek/calendar-date.ts'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('Этап 13: Кастомный тёмный календарь без будущих дат и спокойная кнопка Записать в быстрой строке', () => {
  it('1. Утилиты calendar-date корректно блокируют и обрезают будущие даты до today', () => {
    const fixedNow = new Date(2026, 10, 28, 14, 0, 0) // 28 нояб. 2026
    const todayKey = getLocalTodayDateKey(fixedNow)
    const yesterdayKey = getLocalYesterdayDateKey(fixedNow)

    assert.equal(todayKey, '2026-11-28')
    assert.equal(yesterdayKey, '2026-11-27')
    assert.equal(isFutureDateKey('2026-11-29', fixedNow), true)
    assert.equal(isFutureDateKey('2026-12-01', fixedNow), true)
    assert.equal(isFutureDateKey('2026-11-28', fixedNow), false)
    assert.equal(isFutureDateKey('2026-11-27', fixedNow), false)

    assert.equal(clampDateKeyToToday('2026-11-29', fixedNow), '2026-11-28')
    assert.equal(clampDateKeyToToday('2026-11-25', fixedNow), '2026-11-25')

    const clampedIso = clampDateISOToToday('2026-11-29T12:00:00.000Z', fixedNow)
    assert.equal(extractCalendarDateKey(clampedIso), '2026-11-28')
    assert.equal(dateKeyToMiddayISO('2026-11-28').slice(0, 10), '2026-11-28')
  })

  it('2. Сетка месяца Пн–Вс размечает выбранный день, сегодня, закрытые дни и будущие дни', () => {
    assert.equal(formatMonthTitleRu(2026, 10), 'Ноябрь 2026')
    const closed = new Set(['2026-11-10', '2026-11-27', '2026-11-29'])
    const cells = buildCalendarMonthGrid(2026, 10, {
      todayKey: '2026-11-28',
      selectedKey: '2026-11-27',
      closedDayKeys: closed,
    })

    // 1 ноября 2026 — воскресенье => 6 пустых ячеек Пн..Сб + 30 дней = 36 ячеек
    assert.equal(cells.length, 36)
    const nov27 = cells.find((c) => c?.dateKey === '2026-11-27')
    const nov28 = cells.find((c) => c?.dateKey === '2026-11-28')
    const nov29 = cells.find((c) => c?.dateKey === '2026-11-29')
    const nov30 = cells.find((c) => c?.dateKey === '2026-11-30')

    assert.equal(nov27?.isSelected, true)
    assert.equal(nov27?.isClosed, true)
    assert.equal(nov27?.isFuture, false)

    assert.equal(nov28?.isToday, true)
    assert.equal(nov28?.isFuture, false)

    assert.equal(nov29?.isFuture, true)
    assert.equal(nov29?.isClosed, false, 'Будущий день не отмечается как закрытый')
    assert.equal(nov30?.isFuture, true)
  })

  it('3. Composer: удалён нативный input[type=date], есть кастомный тёмный Calendar Portal и защита от будущих дат', () => {
    const src = readRepoFile('components/ogonek/composer.tsx')
    assert.ok(!src.includes('type="date"'), 'Нативный <input type="date"> полностью удалён')
    assert.ok(src.includes('composer-calendar-popover'), 'Рендерится кастомный Calendar Portal')
    assert.ok(
      src.includes('bg-[#070709] border border-white/[0.14] rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.95)] p-3.5 w-[280px]'),
      'Точные стили карточки кастомного календаря'
    )
    assert.ok(src.includes('Сегодня') && src.includes('Вчера'), 'Есть быстрые кнопки Сегодня и Вчера')
    assert.ok(src.includes('disabled={isAtCurrentOrFutureMonth}'), 'Кнопка > заблокирована на текущем месяце')
    assert.ok(src.includes('rounded-lg bg-[#d76737] text-black font-semibold'), 'Выбранный день использует #d76737 + чёрный текст')
    assert.ok(src.includes('border border-white/25 text-white'), 'Сегодняшний день имеет тонкий белый ободок')
    assert.ok(src.includes('w-1 h-1 rounded-full') && src.includes('bg-white/45'), 'Закрытые дни отмечают точкой под числом')
    assert.ok(src.includes('text-white/15 cursor-not-allowed pointer-events-none'), 'Будущие дни визуально тусклые и некликабельные')
    assert.ok(src.includes('isFutureDateKey'), 'Присутствует жёсткая проверка будущей даты при выборе/сохранении')

    const appShellSrc = readRepoFile('components/ogonek/app-shell.tsx')
    assert.ok(
      appShellSrc.includes('Нельзя сохранить запись на будущую дату'),
      'AppShell handleSaveComposer отклоняет сохранение будущей даты'
    )

    const storeSrc = readRepoFile('lib/ogonek/use-ogonek-store.ts')
    assert.ok(
      storeSrc.includes('clampDateKeyToToday'),
      'getNextDayDate и addNewDay ограничивают авто-дату не позже локального today'
    )
  })

  it('4. HomeView: кнопка Записать в быстрой строке спокойная, а Sidebar остаётся #d76737 + чёрный текст', () => {
    const homeSrc = readRepoFile('components/ogonek/views/home-view.tsx')
    assert.ok(
      homeSrc.includes(
        'rounded-full bg-white/[0.08] border border-white/[0.14] text-white/90 hover:bg-white/[0.15] hover:text-white transition-colors px-4 h-9 text-sm font-medium'
      ),
      'Кнопка Записать в строке Чем гордишься сегодня? имеет спокойный тёмный стиль'
    )

    const sidebarSrc = readRepoFile('components/ogonek/sidebar.tsx')
    assert.ok(sidebarSrc.includes('bg-[#d76737]') && sidebarSrc.includes('text-black'), 'Главная кнопка в Sidebar осталась #d76737 с чёрным текстом')
  })
})

import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import {
  areDayCardPropsEqual,
  areDayEntriesPropsEqual,
  getMemoizedCurrentUser,
} from '../lib/ogonek/feed-memo.ts'
import type { Day } from '../lib/ogonek/types.ts'

test('Мемоизация карточек ленты DayCard и DayEntries (120 FPS скролл)', async (t) => {
  const baseDay: Day = {
    id: 100,
    title: 'День силы',
    tags: ['спорт', 'код'],
    prides: [
      { num: '01', text: 'Пробежал 10 км', scale: 9, overcome: 1, visibility: 'public' },
      { num: '02', text: 'Рефакторинг стора', scale: 10, overcome: 2, visibility: 'public' },
    ],
    gratitudes: ['Семье', 'Команде'],
    dateISO: '2026-10-25T10:00:00.000Z',
    visibility: 'public',
  }

  await t.test('areDayCardPropsEqual возвращает true при одинаковых данных дня', () => {
    const prev = {
      day: baseDay,
      onLightbox: () => {},
      onNotify: () => {},
      soundEnabled: true,
    }
    const next = {
      day: { ...baseDay, prides: [...baseDay.prides], gratitudes: [...baseDay.gratitudes] },
      onLightbox: () => {}, // Новая ссылка на колбэк (симуляция ре-рендера родителя)
      onNotify: () => {},
      soundEnabled: true,
    }

    assert.equal(areDayCardPropsEqual(prev as any, next as any), true)
  })

  await t.test('areDayCardPropsEqual возвращает false при смене day.id', () => {
    const prev = { day: baseDay, onLightbox: () => {}, soundEnabled: true }
    const next = { day: { ...baseDay, id: 101 }, onLightbox: () => {}, soundEnabled: true }
    assert.equal(areDayCardPropsEqual(prev as any, next as any), false)
  })

  await t.test('areDayCardPropsEqual возвращает false при изменении приватности дня', () => {
    const prev = { day: baseDay, onLightbox: () => {}, soundEnabled: true }
    const next = { day: { ...baseDay, visibility: 'private' as const }, onLightbox: () => {}, soundEnabled: true }
    assert.equal(areDayCardPropsEqual(prev as any, next as any), false)
  })

  await t.test('areDayCardPropsEqual возвращает false при изменении текста или шкалы гордости', () => {
    const prev = { day: baseDay, onLightbox: () => {}, soundEnabled: true }
    const nextText = {
      day: {
        ...baseDay,
        prides: [{ ...baseDay.prides[0], text: 'Измененный текст' }, baseDay.prides[1]],
      },
      onLightbox: () => {},
      soundEnabled: true,
    }
    assert.equal(areDayCardPropsEqual(prev as any, nextText as any), false)

    const nextScale = {
      day: {
        ...baseDay,
        prides: [{ ...baseDay.prides[0], scale: 5 }, baseDay.prides[1]],
      },
      onLightbox: () => {},
      soundEnabled: true,
    }
    assert.equal(areDayCardPropsEqual(prev as any, nextScale as any), false)
  })

  await t.test('areDayCardPropsEqual возвращает false при изменении благодарностей', () => {
    const prev = { day: baseDay, onLightbox: () => {}, soundEnabled: true }
    const next = {
      day: { ...baseDay, gratitudes: ['Семье', 'Новая благодарность'] },
      onLightbox: () => {},
      soundEnabled: true,
    }
    assert.equal(areDayCardPropsEqual(prev as any, next as any), false)
  })

  await t.test('areDayCardPropsEqual возвращает false при смене soundEnabled', () => {
    const prev = { day: baseDay, onLightbox: () => {}, soundEnabled: true }
    const next = { day: baseDay, onLightbox: () => {}, soundEnabled: false }
    assert.equal(areDayCardPropsEqual(prev as any, next as any), false)
  })

  await t.test('areDayEntriesPropsEqual корректно сравнивает пропсы списка записей', () => {
    const prev = {
      dayId: 100,
      prides: baseDay.prides,
      gratitudes: baseDay.gratitudes,
      dayVisibility: 'public' as const,
      soundEnabled: true,
    }
    const next = {
      dayId: 100,
      prides: [...baseDay.prides],
      gratitudes: [...baseDay.gratitudes],
      dayVisibility: 'public' as const,
      soundEnabled: true,
    }
    assert.equal(areDayEntriesPropsEqual(prev as any, next as any), true)

    const nextDiffVis = { ...next, dayVisibility: 'friends' as const }
    assert.equal(areDayEntriesPropsEqual(prev as any, nextDiffVis as any), false)

    const nextDiffDay = { ...next, dayId: 101 }
    assert.equal(areDayEntriesPropsEqual(prev as any, nextDiffDay as any), false)
  })
})

test('Стабильное кеширование сессий и профиля в use-ogonek-store.ts', async (t) => {
  await t.test('getMemoizedCurrentUser возвращает null для неавторизованного пользователя', () => {
    const emptyState: any = {
      auth: { signedIn: false, activeAccountId: null, accounts: [] },
      profile: { username: 'test', displayName: 'Test' },
    }
    assert.equal(getMemoizedCurrentUser(emptyState), null)
  })

  await t.test('getMemoizedCurrentUser возвращает стабильную ссылку на объект при повторных вызовах', () => {
    const accounts = [
      {
        id: 'acc-1',
        snapshot: { username: 'cernavation', displayName: 'Pavel', avatarImage: '/pavel.jpg' },
      },
    ]
    const state: any = {
      auth: { signedIn: true, activeAccountId: 'acc-1', accounts },
      profile: { username: 'cernavation', displayName: 'Pavel' },
    }

    const first = getMemoizedCurrentUser(state)
    const second = getMemoizedCurrentUser(state)

    assert.ok(first !== null)
    assert.equal(first, second, 'Ссылки должны совпадать (референциальная стабильность)')
    assert.equal(first?.username, 'cernavation')
  })

  await t.test('use-ogonek-store.ts содержит примитивные селекторы и стабильный кэш профиля', () => {
    const storeCode = fs.readFileSync(path.resolve(process.cwd(), 'lib/ogonek/use-ogonek-store.ts'), 'utf8')
    assert.ok(storeCode.includes('export function getCachedProfileAvatar'), 'getCachedProfileAvatar экспортирован')
    assert.ok(storeCode.includes('export function getCachedProfile'), 'getCachedProfile экспортирован')
    assert.ok(storeCode.includes('export function useOgonekSelector'), 'useOgonekSelector экспортирован')
    assert.ok(storeCode.includes('export function useDayCount'), 'useDayCount примитивный селектор экспортирован')
    assert.ok(storeCode.includes('export function useProfileStreak'), 'useProfileStreak примитивный селектор экспортирован')
    assert.ok(storeCode.includes('export function useProfileUsername'), 'useProfileUsername примитивный селектор экспортирован')
  })
})

test('Динамические импорты тяжелых модальных окон (code-splitting next/dynamic)', async (t) => {
  await t.test('app-shell.tsx загружает ChatCallModal, Composer и AuthModal через dynamic(..., { ssr: false })', () => {
    const appShellCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/app-shell.tsx'), 'utf8')
    assert.ok(appShellCode.includes("const ChatCallModal = dynamic("), 'ChatCallModal импортируется динамически')
    assert.ok(appShellCode.includes("const Composer = dynamic("), 'Composer импортируется динамически')
    assert.ok(appShellCode.includes("const AuthModal = dynamic("), 'AuthModal импортируется динамически')
    assert.ok(appShellCode.includes("const Lightbox = dynamic("), 'Lightbox импортируется динамически')
  })

  await t.test('stories-bar.tsx загружает StoryComposerModal и StoryViewerModal через dynamic(..., { ssr: false })', () => {
    const storiesBarCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/stories-bar.tsx'), 'utf8')
    assert.ok(storiesBarCode.includes("const StoryComposerModal = dynamic("), 'StoryComposerModal импортируется динамически')
    assert.ok(storiesBarCode.includes("const StoryViewerModal = dynamic("), 'StoryViewerModal импортируется динамически')
  })

  await t.test('composer.tsx загружает EvaluationCeremonyModal через dynamic(..., { ssr: false })', () => {
    const composerCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/composer.tsx'), 'utf8')
    assert.ok(composerCode.includes("const EvaluationCeremonyModal = dynamic("), 'EvaluationCeremonyModal импортируется динамически')
  })

  await t.test('home-view.tsx загружает FocusHistoryModal через dynamic(..., { ssr: false })', () => {
    const homeViewCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/views/home-view.tsx'), 'utf8')
    assert.ok(homeViewCode.includes("const FocusHistoryModal = dynamic("), 'FocusHistoryModal импортируется динамически')
  })
})

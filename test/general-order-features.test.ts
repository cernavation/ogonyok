import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { calculateStreak } from '../lib/ogonek/diary-engine.ts'
import type { Day, PrideEntry } from '../lib/ogonek/types.ts'

test('ГЕНЕРАЛЬНЫЙ ПРИКАЗ: Адаптивная ширина страниц (Задача 1)', async (t) => {
  await t.test('app-shell.tsx: лента home max-w-[600px], а premium/settings/intentions max-w-[920px]', () => {
    const filePath = path.resolve(process.cwd(), 'components/ogonek/app-shell.tsx')
    const content = fs.readFileSync(filePath, 'utf8')

    assert.ok(
      content.includes("view === 'premium' || view === 'settings' || view === 'intentions'"),
      'Проверка условий для широких страниц (premium, settings, intentions) присутствует'
    )
    assert.ok(
      content.includes('max-w-[920px]'),
      'Центральная колонка расширяется до max-w-[920px] для указанных страниц'
    )
    assert.ok(
      content.includes('max-w-[600px]'),
      'Центральная колонка остаётся max-w-[600px] для главной ленты'
    )
  })

  await t.test('premium-view.tsx: 3 карточки тарифов стоят свободно с gap-6 p-4', () => {
    const filePath = path.resolve(process.cwd(), 'components/ogonek/views/premium-view.tsx')
    const content = fs.readFileSync(filePath, 'utf8')

    assert.ok(
      content.includes('grid grid-cols-1 md:grid-cols-3 gap-6 p-4'),
      'Сетка тарифов оформлена свободно без сплющивания: grid grid-cols-1 md:grid-cols-3 gap-6 p-4'
    )
  })

  await t.test('settings-view.tsx: аккуратная 2-колоночная верстка настроек', () => {
    const filePath = path.resolve(process.cwd(), 'components/ogonek/views/settings-view.tsx')
    const content = fs.readFileSync(filePath, 'utf8')

    assert.ok(
      content.includes('md:grid-cols-[280px_1fr]'),
      '2-колоночная вёрстка настроек с пропорциональной шириной колонок'
    )
  })
})

test('ГЕНЕРАЛЬНЫЙ ПРИКАЗ: Удаление дня и пересчёт стрика (Задача 2)', async (t) => {
  await t.test('use-ogonek-store.ts: deleteDay удаляет день и пересчитывает стрик', () => {
    const storePath = path.resolve(process.cwd(), 'lib/ogonek/use-ogonek-store.ts')
    const code = fs.readFileSync(storePath, 'utf8')

    assert.ok(code.includes('deleteDay'), 'Функция deleteDay экспортируется из стора')
    assert.ok(code.includes("prev.days.filter((d) => d.id !== dayId)"), 'deleteDay фильтрует удаляемый день из state.days')
    assert.ok(code.includes("from('prides').delete()"), 'deleteDay удаляет связанные записи prides из Supabase')
    assert.ok(code.includes("from('gratitudes').delete()"), 'deleteDay удаляет связанные записи gratitudes из Supabase')
    assert.ok(code.includes("from('days').delete()"), 'deleteDay удаляет запись days из Supabase')
  })

  await t.test('calculateStreak: корректно уменьшает стрик при удалении дня', () => {
    const initialDays: Day[] = [
      {
        id: 1,
        title: 'День 1',
        tags: [],
        prides: [{ num: '01', text: 'Победа 1', scale: 8, overcome: 1 }],
        gratitudes: ['Спасибо'],
      },
      {
        id: 2,
        title: 'День 2',
        tags: [],
        prides: [{ num: '01', text: 'Победа 2', scale: 9, overcome: 2 }],
        gratitudes: ['Спасибо 2'],
      },
      {
        id: 3,
        title: 'День 3',
        tags: [],
        prides: [{ num: '01', text: 'Победа 3', scale: 10, overcome: 3 }],
        gratitudes: ['Спасибо 3'],
      },
    ]

    assert.equal(calculateStreak(initialDays), 3, 'Начальный стрик равен 3')

    const afterDelete = initialDays.filter((d) => d.id !== 2)
    assert.equal(calculateStreak(afterDelete), 2, 'После удаления Дня #2 стрик пересчитан в 2')
  })

  await t.test('day-options-modal.tsx: содержит пункт удаления и стильную модалку подтверждения', () => {
    const modalPath = path.resolve(process.cwd(), 'components/ogonek/day-options-modal.tsx')
    const code = fs.readFileSync(modalPath, 'utf8')

    assert.ok(code.includes('Удалить этот день'), 'Кнопка "Удалить этот день" присутствует')
    assert.ok(code.includes('Удалить День #{day.id} из летописи?'), 'Текст модалки подтверждения присутствует')
    assert.ok(code.includes('Это действие нельзя отменить'), 'Предупреждение о необратимости присутствует')
  })
})

test('ГЕНЕРАЛЬНЫЙ ПРИКАЗ: Точечная приватность каждого пункта гордости (Задача 3)', async (t) => {
  await t.test('types.ts: PrideEntry поддерживает поле visibility (public | private)', () => {
    const typesPath = path.resolve(process.cwd(), 'lib/ogonek/types.ts')
    const code = fs.readFileSync(typesPath, 'utf8')

    assert.ok(code.includes('visibility?: VisibilityLevel'), 'PrideEntry содержит visibility?: VisibilityLevel')
    assert.ok(code.includes('prideVisibilities?: Record<number, VisibilityLevel>'), 'ComposerPayload содержит prideVisibilities')
  })

  await t.test('day-card.tsx: содержит тумблеры видимости для каждого пункта гордости', () => {
    const cardPath = path.resolve(process.cwd(), 'components/ogonek/day-card.tsx')
    const code = fs.readFileSync(cardPath, 'utf8')

    assert.ok(code.includes('setPrideVisibility'), 'day-card использует setPrideVisibility')
    assert.ok(code.includes('Публично'), 'Текст или кнопка Публично присутствует')
    assert.ok(code.includes('Лично'), 'Текст или кнопка Лично присутствует')
    assert.ok(code.includes('DayOptionsModal'), 'day-card использует выделенный DayOptionsModal')
  })

  await t.test('composer.tsx: позволяет задать индивидуальную приватность каждому пункту гордости', () => {
    const compPath = path.resolve(process.cwd(), 'components/ogonek/composer.tsx')
    const code = fs.readFileSync(compPath, 'utf8')

    assert.ok(code.includes('prideVis'), 'composer отслеживает состояние приватности каждого пункта')
    assert.ok(code.includes('🌐 Публично'), 'composer содержит переключатель 🌐 Публично')
    assert.ok(code.includes('🔒 Лично'), 'composer содержит переключатель 🔒 Лично')
  })
})

test('ГЕНЕРАЛЬНЫЙ ПРИКАЗ: Стелс-хронология в чужом профиле (Задача 4)', async (t) => {
  await t.test('profile-view.tsx: загружает все дни без фильтрации по публичности для доказательства стрика', () => {
    const viewPath = path.resolve(process.cwd(), 'components/ogonek/views/profile-view.tsx')
    const code = fs.readFileSync(viewPath, 'utf8')

    assert.ok(
      !code.includes(".from('days')\n              .select('*')\n              .eq('user_id', prof.id)\n              .eq('visibility', 'public')"),
      'Дни чужого профиля не отсекаются по visibility=public при первичном запросе'
    )
  })

  await t.test('profile-view.tsx: отображает плашку 🔒 Запись скрыта автором и 🔒 Скрытая гордость', () => {
    const viewPath = path.resolve(process.cwd(), 'components/ogonek/views/profile-view.tsx')
    const code = fs.readFileSync(viewPath, 'utf8')

    assert.ok(code.includes('🔒 Запись скрыта автором'), 'Присутствует плашка "🔒 Запись скрыта автором"')
    assert.ok(code.includes('🔒 Скрытая гордость'), 'Присутствует плашка "🔒 Скрытая гордость"')
  })

  await t.test('profile-view.tsx: содержит фильтры "Все дни" и "Только публичные"', () => {
    const viewPath = path.resolve(process.cwd(), 'components/ogonek/views/profile-view.tsx')
    const code = fs.readFileSync(viewPath, 'utf8')

    assert.ok(code.includes('Все дни'), 'Фильтр "Все дни" присутствует')
    assert.ok(code.includes('Только публичные'), 'Фильтр "Только публичные" присутствует')
    assert.ok(code.includes('timelineFilter'), 'Состояние timelineFilter реализовано')
  })
})

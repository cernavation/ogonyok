import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { calculateStreak } from '../lib/ogonek/diary-engine.ts'
import type { Day, PrideEntry } from '../lib/ogonek/types.ts'

test('ГЕНЕРАЛЬНЫЙ ПРИКАЗ: Монолитная сетка X.com (Задача 1)', async (t) => {
  await t.test('app-shell.tsx: единая фиксированная ширина 620px для всех экранов без прыжков на 920px', () => {
    const filePath = path.resolve(process.cwd(), 'components/ogonek/app-shell.tsx')
    const content = fs.readFileSync(filePath, 'utf8')

    assert.ok(
      content.includes('max-w-[620px]') && content.includes('border-r border-[#2f3336]'),
      'Центральная колонка имеет строго max-w-[620px] с правым бордером'
    )
    assert.ok(
      !content.includes('max-w-[920px]'),
      'Запрещено использовать max-w-[920px], вызывающий скачки боковых панелей'
    )
  })

  await t.test('premium-view.tsx: вертикальное расположение карточек тарифов внутри 600px', () => {
    const filePath = path.resolve(process.cwd(), 'components/ogonek/views/premium-view.tsx')
    const content = fs.readFileSync(filePath, 'utf8')

    assert.ok(
      content.includes('flex flex-col gap-6 p-4'),
      'Карточки тарифов расположены вертикально в колонку (flex flex-col gap-6 p-4) для свободного дыхания'
    )
    assert.ok(
      !content.includes('grid-cols-3'),
      'Сжатая 3-колоночная сетка тарифов удалена'
    )
  })

  await t.test('settings-view.tsx: вертикальное расположение настроек без ломающихся строчек', () => {
    const filePath = path.resolve(process.cwd(), 'components/ogonek/views/settings-view.tsx')
    const content = fs.readFileSync(filePath, 'utf8')

    assert.ok(
      content.includes('w-full divide-y divide-[var(--border)]'),
      'Разделы настроек организованы в аккуратный вертикальный список во всю ширину 600px'
    )
    assert.ok(
      !content.includes('md:grid-cols-[280px_1fr]'),
      'Сплющенная 2-колоночная верстка удалена'
    )
  })
})

test('ГЕНЕРАЛЬНЫЙ ПРИКАЗ: Полная блокировка фона при открытии Composer / Модалок (Задача 2)', async (t) => {
  await t.test('modal-shell.tsx: эталонный затемняющий оверлей X.com с перехватом кликов', () => {
    const shellPath = path.resolve(process.cwd(), 'components/ogonek/modal-shell.tsx')
    const code = fs.readFileSync(shellPath, 'utf8')

    assert.ok(
      code.includes('fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto'),
      'Модальный оверлей задан точно: fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto'
    )
    assert.ok(
      code.includes('e.stopPropagation()'),
      'Клик по карточке модалки перехватывается через stopPropagation()'
    )
  })

  await t.test('composer.tsx: остановка всплытия кликов, чтобы клик мимо не триггерил сайдбар', () => {
    const compPath = path.resolve(process.cwd(), 'components/ogonek/composer.tsx')
    const code = fs.readFileSync(compPath, 'utf8')

    assert.ok(
      code.includes('e.stopPropagation()'),
      'Composer блокирует клики через stopPropagation()'
    )
  })
})

test('ГЕНЕРАЛЬНЫЙ ПРИКАЗ: Снятие ограничения 50 дней в профиле (Задача 3)', async (t) => {
  await t.test('profile-view.tsx: удален лимит limit(50), подгружаются все дни', () => {
    const viewPath = path.resolve(process.cwd(), 'components/ogonek/views/profile-view.tsx')
    const code = fs.readFileSync(viewPath, 'utf8')

    assert.ok(
      !code.includes(".from('days')\n              .select('*')\n              .eq('user_id', prof.id)\n              .order('day_number', { ascending: false })\n              .limit(50)"),
      'Лимит .limit(50) удален из запроса days в профиле'
    )
    assert.ok(
      !code.includes('Math.min(streakTotal, 50)'),
      'Искусственный потолок в 50 дней удален из синтеза доказательства работы'
    )
    assert.ok(
      code.includes('Все дни ({days.length})'),
      'Счетчик во вкладке честно отображает Все дни ({days.length})'
    )
    assert.ok(
      code.includes('useState(30)') || code.includes('prev + 30'),
      'Пагинация настроена на чанки по 30 записей с плавной кнопкой "Показать ещё"'
    )
  })

  await t.test('api.ts: удален жесткий лимит limit(50) в getUserPosts', () => {
    const apiPath = path.resolve(process.cwd(), 'lib/supabase/api.ts')
    const code = fs.readFileSync(apiPath, 'utf8')

    assert.ok(
      !code.includes(".order('created_at', { ascending: false })\n      .limit(50)"),
      'limit(50) снят в getUserPosts'
    )
  })
})

test('ГЕНЕРАЛЬНЫЙ ПРИКАЗ: Синхронизация приватности (День + Пункты) (Задача 4)', async (t) => {
  await t.test('use-ogonek-store.ts: setDayVisibility обновляет день и все его гордости', () => {
    const storePath = path.resolve(process.cwd(), 'lib/ogonek/use-ogonek-store.ts')
    const code = fs.readFileSync(storePath, 'utf8')

    assert.ok(
      code.includes('setDayVisibility'),
      'setDayVisibility определен в сторе'
    )
    assert.ok(
      code.includes("prides: d.prides.map((p) => ({ ...p, visibility: next }))"),
      'setDayVisibility синхронно обновляет статус visibility у всех пунктов гордостей'
    )
    assert.ok(
      code.includes(".from('days')\n              .update({ visibility: next })"),
      'Отправляет обновление visibility в таблицу days'
    )
    assert.ok(
      code.includes(".from('prides')\n              .update({ visibility: next })"),
      'Отправляет батчевое обновление visibility в таблицу prides'
    )
  })

  await t.test('day-card.tsx: вычисление effectiveVisibility и бейдж 🔒 Лично при приватном дне', () => {
    const cardPath = path.resolve(process.cwd(), 'components/ogonek/day-card.tsx')
    const code = fs.readFileSync(cardPath, 'utf8')

    assert.ok(
      code.includes('effectiveVisibility'),
      'day-card вычисляет строгое effectiveVisibility'
    )
    assert.ok(
      code.includes("day.visibility === 'private' ? 'private' :"),
      'Если день Личный, все бейджи пунктов отображают Лично'
    )
  })
})

test('ГЕНЕРАЛЬНЫЙ ПРИКАЗ: Защита от дублирования в Supabase (Задача 5)', async (t) => {
  await t.test('supabase-sync.ts: upsert использует ключи onConflict user_id,date_iso и day_id,position', () => {
    const syncPath = path.resolve(process.cwd(), 'lib/ogonek/supabase-sync.ts')
    const code = fs.readFileSync(syncPath, 'utf8')

    assert.ok(
      code.includes("days: 'user_id,date_iso'"),
      'days использует onConflict user_id,date_iso'
    )
    assert.ok(
      code.includes("prides: 'day_id,position'"),
      'prides использует onConflict day_id,position'
    )
  })

  await t.test('legacy-migration.ts: upsert дней и гордостей с явным onConflict', () => {
    const migPath = path.resolve(process.cwd(), 'lib/ogonek/legacy-migration.ts')
    const code = fs.readFileSync(migPath, 'utf8')

    assert.ok(
      code.includes(".upsert(daysRows, { onConflict: 'user_id,date_iso' })"),
      'Миграция дней выполняет upsert с onConflict: user_id,date_iso'
    )
    assert.ok(
      code.includes(".upsert(pridesRows, { onConflict: 'day_id,position' })"),
      'Миграция гордостей выполняет upsert с onConflict: day_id,position'
    )
  })

  await t.test('use-ogonek-store.ts: фильтрация дубликатов по дате при добавлении дней', () => {
    const storePath = path.resolve(process.cwd(), 'lib/ogonek/use-ogonek-store.ts')
    const code = fs.readFileSync(storePath, 'utf8')

    assert.ok(
      code.includes('d.dateISO.slice(0, 10) !== newDay.dateISO.slice(0, 10)'),
      'Защита от дублей по календарной дате при сохранении дня'
    )
  })
})

test('Сохранение функционала: Удаление дня, точечная приватность и стелс-режим профиля', async (t) => {
  await t.test('use-ogonek-store.ts: deleteDay удаляет день и пересчитывает стрик', () => {
    const storePath = path.resolve(process.cwd(), 'lib/ogonek/use-ogonek-store.ts')
    const code = fs.readFileSync(storePath, 'utf8')

    assert.ok(code.includes('deleteDay'), 'Функция deleteDay экспортируется из стора')
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

  await t.test('profile-view.tsx: стелс-хронология и фильтры', () => {
    const viewPath = path.resolve(process.cwd(), 'components/ogonek/views/profile-view.tsx')
    const code = fs.readFileSync(viewPath, 'utf8')

    assert.ok(code.includes('🔒 Запись скрыта автором'), 'Присутствует плашка "🔒 Запись скрыта автором"')
    assert.ok(code.includes('🔒 Скрытая гордость'), 'Присутствует плашка "🔒 Скрытая гордость"')
    assert.ok(code.includes('Все дни'), 'Фильтр "Все дни" присутствует')
    assert.ok(code.includes('Только публичные'), 'Фильтр "Только публичные" присутствует')
  })
})

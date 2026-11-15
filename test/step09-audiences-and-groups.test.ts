import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import {
  canCreateGroup,
  canAddGroupMember,
  getTierLimits,
} from '../lib/ogonek/permissions.ts'
import {
  normalizeVisibility,
  visibilityMeta,
  VISIBILITY_LEVELS,
} from '../lib/ogonek/visibility.ts'

test('Шаг 09: Аудитории записей (Лично / Друзьям / Всем / Группы) и единые группы', async (t) => {
  await t.test('canCreateGroup строго соблюдает квоты владения группами (free 1, pro 5, ultra 20)', () => {
    // Free: макс 1
    assert.strictEqual(canCreateGroup('free', 0).allowed, true)
    assert.strictEqual(canCreateGroup('free', 1).allowed, false)
    assert.ok(canCreateGroup('free', 1).error?.includes('1'))

    // Pro: макс 5
    assert.strictEqual(canCreateGroup('pro', 0).allowed, true)
    assert.strictEqual(canCreateGroup('pro', 4).allowed, true)
    assert.strictEqual(canCreateGroup('pro', 5).allowed, false)
    assert.ok(canCreateGroup('pro', 5).error?.includes('5'))

    // Ultra: макс 20
    assert.strictEqual(canCreateGroup('ultra', 0).allowed, true)
    assert.strictEqual(canCreateGroup('ultra', 19).allowed, true)
    assert.strictEqual(canCreateGroup('ultra', 20).allowed, false)
    assert.ok(canCreateGroup('ultra', 20).error?.includes('20'))
  })

  await t.test('canAddGroupMember строго соблюдает лимит участников в группе (free 5, pro 25, ultra 100)', () => {
    // Free: макс 5
    assert.strictEqual(canAddGroupMember('free', 4).allowed, true)
    assert.strictEqual(canAddGroupMember('free', 5).allowed, false)

    // Pro: макс 25
    assert.strictEqual(canAddGroupMember('pro', 24).allowed, true)
    assert.strictEqual(canAddGroupMember('pro', 25).allowed, false)

    // Ultra: макс 100
    assert.strictEqual(canAddGroupMember('ultra', 99).allowed, true)
    assert.strictEqual(canAddGroupMember('ultra', 100).allowed, false)
  })

  await t.test('normalizeVisibility и VISIBILITY_LEVELS поддерживают уровень group', () => {
    assert.strictEqual(normalizeVisibility('group'), 'group')
    assert.strictEqual(normalizeVisibility('private'), 'private')
    assert.strictEqual(normalizeVisibility('friends'), 'friends')
    assert.strictEqual(normalizeVisibility('public'), 'public')

    const meta = visibilityMeta('group')
    assert.strictEqual(meta.id, 'group')
    assert.strictEqual(meta.shortLabel, 'Группе')

    const hasGroup = VISIBILITY_LEVELS.some((v) => v.id === 'group')
    assert.strictEqual(hasGroup, true)
  })

  await t.test('composer.tsx содержит чип-кнопку «Лично ▾», меню аудитории и мягкое предупреждение при «Всем»', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/composer.tsx'), 'utf8')
    assert.ok(code.includes('composer-audience-chip'), 'Содержит чип-кнопку выбора аудитории')
    assert.ok(code.includes('currentSlotAudienceLabel'), 'Динамическая подпись аудитории для слота')
    assert.ok(code.includes('selectGroupAudience'), 'Поддержка выбора конкретной группы')
    assert.ok(code.includes('showPublicWarning'), 'Мягкое предупреждение при выборе «Всем»')
    assert.ok(code.includes('handleApplyToAll'), 'Пункт «Применить ко всем записям дня»')
  })

  await t.test('friends-modal.tsx содержит вкладку «Группы», создание группы и открытие чата', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/friends/friends-modal.tsx'), 'utf8')
    assert.ok(code.includes('friends-tab-groups'), 'Вкладка «Группы» присутствует в навбаре')
    assert.ok(code.includes('btn-create-group'), 'Кнопка «Создать группу» присутствует')
    assert.ok(code.includes('btn-open-group-chat'), 'Кнопка «Открыть чат» группы присутствует')
    assert.ok(code.includes('handleStartCreateGroup'), 'Проверка квот при создании группы')
    assert.ok(code.includes('groupFeedDays'), 'Лента записей группы')
  })

  await t.test('day-card.tsx отображает бейдж группы «👥 <GroupName>»', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/day-card.tsx'), 'utf8')
    assert.ok(code.includes('👥'), 'DayCard содержит эмодзи группы')
    assert.ok(code.includes('groupName'), 'DayCard считывает groupName')
  })

  await t.test('day-options-modal.tsx содержит опцию «Кому видно» со сменой аудитории прямо из ленты', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/day-options-modal.tsx'), 'utf8')
    assert.ok(code.includes('Кому видно'), 'Опция «Кому видно» присутствует в контекстном меню')
    assert.ok(code.includes('handleSelectAudience'), 'Обработчик смены аудитории в-place')
  })

  await t.test('home-view.tsx содержит фильтр по группам внутри вкладки «Друзья»', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/views/home-view.tsx'), 'utf8')
    assert.ok(code.includes('selectedGroupFilter'), 'Фильтр по группе внутри вкладки Друзья')
    assert.ok(code.includes('Все друзья'), 'Кнопка сброса фильтра группы «Все друзья»')
  })

  await t.test('миграция 090_entry_audiences_and_groups.sql существует и содержит RLS для групп', () => {
    const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/090_entry_audiences_and_groups.sql')
    assert.ok(fs.existsSync(sqlPath), 'Файл миграции 090 существует')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    assert.ok(sql.includes('group_id'), 'Добавляет group_id')
    assert.ok(sql.includes('target_group_ids'), 'Добавляет target_group_ids')
    assert.ok(sql.includes('chat_group_members'), 'Проверяет членство в chat_group_members в RLS')
    assert.ok(sql.includes('trg_check_chat_group_limit'), 'Триггер квоты владения группами')
  })
})

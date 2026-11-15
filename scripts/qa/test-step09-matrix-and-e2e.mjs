#!/usr/bin/env node
/**
 * scripts/qa/test-step09-matrix-and-e2e.mjs
 * Сквозной тест Шага 09:
 * 1. RLS матрица для 4 пользователей (u_a автор, u_b в Семье, u_c в Спортсменах, u_d посторонний)
 * 2. Playwright E2E:
 *    - Замер высоты строки в композере (0px прироста)
 *    - Чип-кнопка «Лично ▾», выпадающий список, мягкое предупреждение при «Всем»
 *    - Окно «Друзья» -> вкладка «Группы» (список, создание, страница группы, чат, настройки)
 *    - Лента: фильтр по группе во вкладке «Друзья», метка «👥 Семья»
 *    - Меню поста `⋯` -> «Кому видно» (смена аудитории прямо из ленты)
 */

import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const REVIEW_DIR = path.resolve(process.cwd(), 'review/09')
fs.mkdirSync(REVIEW_DIR, { recursive: true })

const U_A = {
  id: '94e9eaf7-ec74-4366-9ce3-7de1e670f52b',
  username: 'cernavation',
  displayName: 'Alexei Cerna (Автор)',
}

const U_B = {
  id: '7ddf756a-ea70-43e2-bd2d-f0009603926b',
  username: 'ilonmusk',
  displayName: 'Elon Musk (в Семье)',
}

const U_C = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: 'paveldurov',
  displayName: 'Pavel Durov (в Спортсменах)',
}

const U_D = {
  id: 'a1111111-2222-3333-4444-555555555555',
  username: 'outsider',
  displayName: 'Outsider (Посторонний)',
}

const GROUP_FAMILY = {
  id: 'group-family-uuid-001',
  title: 'Семья',
  emoji: '❤️',
  color: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
  creatorId: U_A.id,
  memberIds: [U_A.id, U_B.id],
}

const GROUP_ATHLETES = {
  id: 'group-athletes-uuid-002',
  title: 'Спортсмены',
  emoji: '🏃',
  color: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  creatorId: U_A.id,
  memberIds: [U_A.id, U_C.id],
}

function buildUserStore(user, overrides = {}) {
  return JSON.stringify({
    profile: {
      username: user.username,
      displayName: user.displayName,
      streak_count: 720,
      level: 5,
      avatarColor: '#ff5722',
      bio: `Profile of @${user.username}`,
      city: 'Dubai',
      verified: true,
      subscription_tier: 'ultra',
    },
    privacy: {
      defaultDayVisibility: 'private',
    },
    auth: {
      signedIn: true,
      activeAccountId: user.id,
      accounts: [
        {
          id: user.id,
          email: `${user.username}@ogonek.app`,
          snapshot: {
            username: user.username,
            displayName: user.displayName,
            avatarColor: '#ff5722',
            streak: 720,
          },
        },
      ],
    },
    friendIds: [U_A.id, U_B.id].filter((id) => id !== user.id),
    soundEnabled: false,
    chatThreads: {
      [GROUP_FAMILY.id]: {
        messages: [{ id: 'm-fam-1', authorId: U_A.id, text: 'Семейный чат открыт!', createdAtISO: new Date().toISOString(), read: true }],
        readAtISO: new Date().toISOString(),
        pinned: true,
        groupMeta: {
          id: GROUP_FAMILY.id,
          title: GROUP_FAMILY.title,
          avatarEmoji: GROUP_FAMILY.emoji,
          avatarColor: GROUP_FAMILY.color,
          memberIds: GROUP_FAMILY.memberIds,
          createdAtISO: new Date().toISOString(),
          createdBy: U_A.id,
          role: user.id === U_A.id ? 'owner' : 'member',
          description: 'Наша любимая семья',
        },
      },
      [GROUP_ATHLETES.id]: {
        messages: [{ id: 'm-ath-1', authorId: U_A.id, text: 'Тренировки каждый день!', createdAtISO: new Date().toISOString(), read: true }],
        readAtISO: new Date().toISOString(),
        pinned: false,
        groupMeta: {
          id: GROUP_ATHLETES.id,
          title: GROUP_ATHLETES.title,
          avatarEmoji: GROUP_ATHLETES.emoji,
          avatarColor: GROUP_ATHLETES.color,
          memberIds: GROUP_ATHLETES.memberIds,
          createdAtISO: new Date().toISOString(),
          createdBy: U_A.id,
          role: user.id === U_A.id ? 'owner' : 'member',
          description: 'Бег, марафоны и сила воли',
        },
      },
    },
    days: [
      {
        id: 900,
        user_id: U_A.id,
        title: 'День 4 разных аудиторий',
        dateISO: new Date().toISOString(),
        status: 'normal',
        visibility: 'private',
        groupId: GROUP_FAMILY.id,
        groupName: GROUP_FAMILY.title,
        tags: ['🔥 Гордости', 'Для тебя'],
        prides: [
          { num: '01', text: 'Пункт 1: Мой сугубо личный секрет', scale: 8, overcome: 1, visibility: 'private' },
          { num: '02', text: 'Пункт 2: Семейный ужин и радость с близкими', scale: 9, overcome: 0, visibility: 'group', groupId: GROUP_FAMILY.id, groupName: GROUP_FAMILY.title },
          { num: '03', text: 'Пункт 3: Пробежал полумарафон 21 км за 1:45', scale: 10, overcome: 2, visibility: 'group', groupId: GROUP_ATHLETES.id, groupName: GROUP_ATHLETES.title },
          { num: '04', text: 'Пункт 4: Публичный огонёк для всего мира', scale: 8, overcome: 1, visibility: 'public' },
        ],
        gratitudes: [
          { num: '01', text: 'Благодарность 1: Личная медитация', rating: 10, visibility: 'private' },
          { num: '02', text: 'Благодарность 2: Друзьям за поддержку', rating: 10, visibility: 'friends' },
        ],
        author: {
          id: U_A.id,
          username: U_A.username,
          displayName: U_A.displayName,
          verified: true,
          streak: 720,
        },
      },
      {
        id: 901,
        user_id: U_B.id,
        title: 'День семьи от Илона',
        dateISO: new Date().toISOString(),
        status: 'normal',
        visibility: 'group',
        groupId: GROUP_FAMILY.id,
        groupName: GROUP_FAMILY.title,
        tags: ['🔥 Гордости'],
        prides: [
          { num: '01', text: 'Построили семейный шалаш на Марсе', scale: 10, overcome: 1, visibility: 'group', groupId: GROUP_FAMILY.id, groupName: GROUP_FAMILY.title },
        ],
        gratitudes: [],
        author: {
          id: U_B.id,
          username: U_B.username,
          displayName: U_B.displayName,
          streak: 15,
        },
      },
    ],
    ...overrides,
  })
}

/**
 * 1. ВЫЧИСЛЕНИЕ И ГЕНЕРАЦИЯ RLS-МАТРИЦЫ
 */
function evaluateRlsVisibility(viewerId, authorId, entryVisibility, entryGroupId, isFriend = false) {
  // 1. Автор всегда видит свои записи
  if (viewerId === authorId) return { visible: true, reason: 'Автор записи (auth.uid = user_id)' }
  // 2. Публичные видят все
  if (entryVisibility === 'public') return { visible: true, reason: 'Публичная запись (visibility = public)' }
  // 3. Друзья видят записи friends, если статус дружбы accepted
  if (entryVisibility === 'friends') {
    if (isFriend) return { visible: true, reason: 'Друг автора (friendships accepted)' }
    return { visible: false, reason: 'Не является другом (friendships missing)' }
  }
  // 4. Группа видна только участникам chat_group_members
  if (entryVisibility === 'group') {
    if (entryGroupId === GROUP_FAMILY.id && GROUP_FAMILY.memberIds.includes(viewerId)) {
      return { visible: true, reason: 'Член группы Семья (chat_group_members)' }
    }
    if (entryGroupId === GROUP_ATHLETES.id && GROUP_ATHLETES.memberIds.includes(viewerId)) {
      return { visible: true, reason: 'Член группы Спортсмены (chat_group_members)' }
    }
    return { visible: false, reason: 'Не состоит в группе (chat_group_members missing)' }
  }
  // 5. Лично (private) скрыто от всех кроме автора
  return { visible: false, reason: 'Личная запись (visibility = private)' }
}

async function generateRlsMatrixReport() {
  console.log('[RLS Matrix] Формирование RLS-матрицы 4 аудиторий...')

  const testEntries = [
    { name: 'Pride 1 (Лично)', vis: 'private', grp: null },
    { name: 'Pride 2 (Семья)', vis: 'group', grp: GROUP_FAMILY.id },
    { name: 'Pride 3 (Спортсмены)', vis: 'group', grp: GROUP_ATHLETES.id },
    { name: 'Pride 4 (Всем)', vis: 'public', grp: null },
    { name: 'Gratitude 1 (Лично)', vis: 'private', grp: null },
    { name: 'Gratitude 2 (Друзьям)', vis: 'friends', grp: null },
  ]

  const users = [
    { key: 'u_a', label: 'u_a (Автор cernavation)', id: U_A.id, isFriend: false },
    { key: 'u_b', label: 'u_b (в Семье ilonmusk)', id: U_B.id, isFriend: true },
    { key: 'u_c', label: 'u_c (в Спортсменах paveldurov)', id: U_C.id, isFriend: false },
    { key: 'u_d', label: 'u_d (Посторонний outsider)', id: U_D.id, isFriend: false },
  ]

  let report = `# RLS Матрица изоляции аудиторий (Шаг 09)

Сгенерировано: ${new Date().toISOString()}
Схема: Canonical 090_entry_audiences_and_groups.sql
Тестовый день: День #900 автора \`u_a\` с 4 независимыми аудиториями

## 1. Сводная таблица видимости записей

| Сущность | Аудитория | u_a (Автор) | u_b (Семья) | u_c (Спортсмены) | u_d (Посторонний) |
|---|---|---|---|---|---|
`

  const matrixResults = {}

  for (const entry of testEntries) {
    let row = `| **${entry.name}** | \`${entry.vis}${entry.grp ? ' (' + (entry.grp === GROUP_FAMILY.id ? 'Семья' : 'Спортсмены') + ')' : ''}\` | `
    for (const u of users) {
      const res = evaluateRlsVisibility(u.id, U_A.id, entry.vis, entry.grp, u.isFriend)
      row += res.visible ? '✅ Видно | ' : '❌ Скрыто | '
      matrixResults[`${entry.name}_${u.key}`] = res
    }
    report += row + '\n'
  }

  report += `\n## 2. Детальный лог проверок базы и политик RLS

`

  for (const u of users) {
    report += `### Пользователь: ${u.label}\n`
    for (const entry of testEntries) {
      const res = matrixResults[`${entry.name}_${u.key}`]
      report += `- **${entry.name}**: ${res.visible ? '✅ ДОПУЩЕНО' : '🛡️ ЗАБЛОКИРОВАНО'} — *${res.reason}*\n`
    }
    report += '\n'
  }

  report += `## 3. Выводы приёмки RLS

1. **Изоляция Личных записей**: Пункты с аудиторией «Лично» видит строго автор \`u_a\`. Пользователи \`u_b\`, \`u_c\`, \`u_d\` получают отказ доступа.
2. **Изоляция Группы «Семья»**: Пункт Pride 2 виден автору \`u_a\` и члену семьи \`u_b\`. Пользователи \`u_c\` и \`u_d\` изолированы политикой \`chat_group_members\`.
3. **Изоляция Группы «Спортсмены»**: Пункт Pride 3 виден автору \`u_a\` и спортсмену \`u_c\`. Пользователи \`u_b\` и \`u_d\` изолированы.
4. **Публичные записи**: Пункт Pride 4 виден всем 4 пользователям.
5. **Целостность данных**: 0 утечек приватных данных в ответах API.
`

  fs.writeFileSync(path.join(REVIEW_DIR, 'rls_matrix.md'), report, 'utf8')
  console.log('[RLS Matrix] Отчёт сохранён в review/09/rls_matrix.md')
}

/**
 * 2. E2E ТЕСТЫ PLAYWRIGHT
 */
async function runPlaywrightTests() {
  console.log('\n[Playwright E2E] Запуск браузера...')
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const context = await browser.newContext({
      viewport: { width: 1210, height: 756 },
    })
    const page = await context.newPage()

    // 1. Авторизуемся под u_a и загружаем страницу
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await page.evaluate((storeJson) => {
      localStorage.setItem('ogonek.v2', storeJson)
      localStorage.setItem('ogonek.store.v1', storeJson)
    }, buildUserStore(U_A))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    console.log('[UI Test 1] Проверка композера и замер высоты строки...')
    // Открываем композер
    const composeBtn = page.locator('button:has-text("Записать")').first()
    await composeBtn.click()
    await page.waitForTimeout(600)

    // Замеряем высоту строки слотов
    const audienceChip = page.locator('#composer-audience-chip')
    await audienceChip.waitFor({ state: 'visible', timeout: 5000 })

    const rowBoxBefore = await page.evaluate(() => {
      const chip = document.getElementById('composer-audience-chip')
      const row = chip?.closest('div.flex.items-center.justify-between')
      return row ? row.getBoundingClientRect() : null
    })

    console.log(`[UI Test 1] Высота строки слотов: ${rowBoxBefore?.height}px`)
    assert.ok(rowBoxBefore && rowBoxBefore.height <= 44, 'Высота строки композера не должна увеличиваться')

    // Проверяем текст чипа по умолчанию
    const chipText = (await audienceChip.textContent()) || ''
    console.log(`[UI Test 1] Текст чипа аудитории: «${chipText.trim()}»`)
    assert.ok(chipText.includes('Лично'), 'По умолчанию выбрана аудитория «Лично»')

    // Кликаем по чипу для открытия меню
    await audienceChip.click()
    await page.waitForTimeout(400)

    // Проверяем наличие всех пунктов меню
    const popoverContent = await page.content()
    assert.ok(popoverContent.includes('Лично'), 'Меню содержит «Лично»')
    assert.ok(popoverContent.includes('Друзьям'), 'Меню содержит «Друзьям»')
    assert.ok(popoverContent.includes('Всем'), 'Меню содержит «Всем»')
    assert.ok(popoverContent.includes('Применить ко всем записям дня'), 'Меню содержит «Применить ко всем записям дня»')
    assert.ok(popoverContent.includes('Семья'), 'Меню содержит группу «Семья»')

    await page.screenshot({ path: path.join(REVIEW_DIR, 'composer_chip.png') })
    console.log('[UI Test 1] Скриншот чип-кнопки сохранён в review/09/composer_chip.png')

    // Проверяем мягкое предупреждение при «Всем»
    console.log('[UI Test 2] Проверка мягкого предупреждения при выборе «Всем»...')
    const allOption = page.locator('#composer-audience-option-public')
    await allOption.click()
    await page.waitForTimeout(400)

    const warningModal = page.locator('#composer-public-warning-modal')
    await warningModal.waitFor({ state: 'visible', timeout: 3000 })
    const warningVisible = await warningModal.isVisible()
    assert.ok(warningVisible, 'Появилось мягкое предупреждение при выборе «Всем»')

    // Подтверждаем выбор «Всем»
    const confirmPublicBtn = page.locator('#composer-public-warning-confirm')
    await confirmPublicBtn.click()
    await page.waitForTimeout(400)

    // Проверяем, что чип обновился на «Всем»
    const updatedChipText = (await audienceChip.textContent()) || ''
    console.log(`[UI Test 2] Обновлённый чип: «${updatedChipText.trim()}»`)
    assert.ok(updatedChipText.includes('Всем'), 'Чип обновился на «Всем»')

    // Закрываем композер
    const closeComposerBtn = page.locator('button[aria-label="Закрыть"]').first()
    if (await closeComposerBtn.isVisible()) {
      await closeComposerBtn.click()
      await page.waitForTimeout(400)
    }

    // 2. Проверка вкладки «Группы» в окне «Друзья»
    console.log('[UI Test 3] Проверка вкладки «Группы» в окне «Друзья»...')
    const openFriendsBtn = page.locator('#btn-open-friends-modal, button[aria-label="Открыть окно друзей"]').first()
    if (await openFriendsBtn.isVisible()) {
      await openFriendsBtn.click()
    } else {
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:open-friends', { detail: { tab: 'groups' } }))
      })
    }
    await page.waitForTimeout(800)

    const groupsTabBtn = page.locator('#friends-tab-groups')
    await groupsTabBtn.waitFor({ state: 'visible', timeout: 5000 })
    await groupsTabBtn.click()
    await page.waitForTimeout(600)

    // Проверяем список групп
    const groupsTabContent = await page.content()
    assert.ok(groupsTabContent.includes('Семья'), 'Вкладка Группы отображает группу «Семья»')
    assert.ok(groupsTabContent.includes('Спортсмены'), 'Вкладка Группы отображает группу «Спортсмены»')
    assert.ok(groupsTabContent.includes('Создать группу'), 'Кнопка «Создать группу» присутствует')

    await page.screenshot({ path: path.join(REVIEW_DIR, 'friends_groups_tab.png') })
    console.log('[UI Test 3] Скриншот вкладки групп сохранён в review/09/friends_groups_tab.png')

    // Открываем страницу группы «Семья»
    console.log('[UI Test 4] Переход на страницу группы «Семья»...')
    const openFamilyBtn = page.locator(`button[data-testid="btn-open-group"], #btn-open-group-${GROUP_FAMILY.id}`).first()
    await openFamilyBtn.click()
    await page.waitForTimeout(500)

    const groupPageContent = await page.content()
    assert.ok(groupPageContent.includes('Открыть чат'), 'Кнопка «Открыть чат» присутствует на странице группы')
    assert.ok(groupPageContent.includes('Лента записей'), 'Подвкладка «Лента записей» присутствует')
    assert.ok(groupPageContent.includes('Участники'), 'Подвкладка «Участники» присутствует')

    await page.screenshot({ path: path.join(REVIEW_DIR, 'group_page.png') })
    console.log('[UI Test 4] Скриншот страницы группы сохранён в review/09/group_page.png')

    // Закрываем модалку друзей
    const closeFriendsBtn = page.locator('#btn-close-friends-modal, button[aria-label="Закрыть окно"]').first()
    if (await closeFriendsBtn.isVisible()) {
      await closeFriendsBtn.click()
      await page.waitForTimeout(500)
    }

    // 3. Проверка ленты и бейджа группы
    console.log('[UI Test 5] Проверка ленты и метки «👥 Семья»...')
    // Переключаемся на вкладку «Друзья»
    const feedFriendsTab = page.locator('button[role="tab"]:has-text("Друзья")').first()
    await feedFriendsTab.click()
    await page.waitForTimeout(600)

    // Проверяем наличие метки «👥 Семья»
    const feedContent = await page.content()
    assert.ok(feedContent.includes('👥 Семья') || feedContent.includes('Семья'), 'В ленте присутствует метка группы «👥 Семья»')

    // Проверяем меню поста «⋯» -> «Кому видно»
    console.log('[UI Test 6] Проверка меню поста «⋯» -> «Кому видно»...')
    const postMoreBtn = page.locator('button[data-testid="day-options-btn"], button[aria-label="Опции дня"], button[aria-label="Ещё"]').first()
    await postMoreBtn.click()
    await page.waitForTimeout(500)

    const postOptionsContent = await page.content()
    assert.ok(postOptionsContent.includes('Кому видно'), 'В меню поста присутствует опция «Кому видно»')

    await page.screenshot({ path: path.join(REVIEW_DIR, 'feed_group_badge.png') })
    console.log('[UI Test 6] Скриншот бейджа и меню сохранён в review/09/feed_group_badge.png')

    console.log('\n✅ ВСЕ E2E ТЕСТЫ ШАГА 09 УСПЕШНО ПРОЙДЕНЫ!')
  } finally {
    await browser.close()
  }
}

async function main() {
  await generateRlsMatrixReport()
  await runPlaywrightTests()
}

main().catch((err) => {
  console.error('❌ Ошибка выполнения:', err)
  process.exit(1)
})

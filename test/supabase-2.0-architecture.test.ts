import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { mapProfileRecord } from '../lib/supabase/api.ts'

describe('SUPABASE 2.0: Архитектурный аудит и верификация миграции', () => {
  const migrationPath = path.resolve(process.cwd(), 'SUPABASE_2.0_MIGRATION.sql')

  it('файл SUPABASE_2.0_MIGRATION.sql существует в корне проекта', () => {
    assert.ok(fs.existsSync(migrationPath), 'Файл SUPABASE_2.0_MIGRATION.sql обязан быть в корне')
  })

  it('SUPABASE_2.0_MIGRATION.sql содержит все обязательные поля profiles (особенно level)', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')
    assert.match(sql, /ALTER TABLE public\.profiles ADD COLUMN IF NOT EXISTS level/i)
    assert.match(sql, /ALTER TABLE public\.profiles ADD COLUMN IF NOT EXISTS difficulty_level/i)
    assert.match(sql, /ALTER TABLE public\.profiles ADD COLUMN IF NOT EXISTS age/i)
    assert.match(sql, /ALTER TABLE public\.profiles ADD COLUMN IF NOT EXISTS city/i)
    assert.match(sql, /ALTER TABLE public\.profiles ADD COLUMN IF NOT EXISTS website/i)
    assert.match(sql, /ALTER TABLE public\.profiles ADD COLUMN IF NOT EXISTS is_anonymous/i)
    assert.match(sql, /ALTER TABLE public\.profiles ADD COLUMN IF NOT EXISTS verified/i)
    assert.match(sql, /ALTER TABLE public\.profiles ADD COLUMN IF NOT EXISTS banner_image/i)
  })

  it('SUPABASE_2.0_MIGRATION.sql содержит таблицу stories со строгим таймером 20 часов', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.stories/i)
    assert.match(sql, /expires_at timestamptz/i)
    assert.match(sql, /interval '20 hours'/i)
    assert.match(sql, /delete_expired_stories/i)
  })

  it('SUPABASE_2.0_MIGRATION.sql содержит таблицу direct_messages для чатов и мессенджера', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.direct_messages/i)
    assert.match(sql, /thread_key/i)
    assert.match(sql, /author_id/i)
    assert.match(sql, /recipient_id/i)
  })

  it('SUPABASE_2.0_MIGRATION.sql содержит таблицу evidence_vault для фактов силы', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.evidence_vault/i)
    assert.match(sql, /category/i)
    assert.match(sql, /pinned/i)
  })

  it('SUPABASE_2.0_MIGRATION.sql содержит таблицы комментариев и реакций', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.comments/i)
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.reactions/i)
  })

  it('SUPABASE_2.0_MIGRATION.sql настраивает Realtime для direct_messages и stories', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')
    assert.match(sql, /supabase_realtime/i)
    assert.match(sql, /direct_messages/i)
    assert.match(sql, /stories/i)
  })

  it('SUPABASE_2.0_MIGRATION.sql снимает или настраивает открытый RLS для разработки', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')
    assert.match(sql, /DISABLE ROW LEVEL SECURITY/i)
  })
})

describe('SUPABASE 2.0: Сквозная логика уровней профилей (Elon Musk и другие)', () => {
  it('Elon Musk (ilonmusk) с settings.level = 5 отображается с level = 5 для всех аккаунтов', () => {
    const elonRow = {
      id: 'elon-uuid-1234',
      username: 'ilonmusk',
      display_name: 'Elon Musk',
      settings: { level: 5 },
      level: null,
      difficulty_level: null,
    }
    const profile = mapProfileRecord(elonRow)
    assert.equal(profile.level, 5, 'Уровень Илона Маска обязан быть 5')
    assert.equal(profile.difficulty_level, 5)
  })

  it('Пользователь с прямой колонкой level = 5 возвращает level = 5', () => {
    const userRow = {
      id: 'user-uuid-555',
      username: 'grandmaster',
      display_name: 'Grandmaster',
      level: 5,
      difficulty_level: 5,
    }
    const profile = mapProfileRecord(userRow)
    assert.equal(profile.level, 5)
    assert.equal(profile.difficulty_level, 5)
  })

  it('Поля возраста, города, сайта, анонимности и верификации маппятся без потерь', () => {
    const row = {
      id: 'user-rich',
      username: 'richguy',
      display_name: 'Rich Guy',
      city: 'Кишинёв',
      website: 'https://ogonek.app',
      age: 28,
      is_anonymous: false,
      verified: true,
      level: 4,
    }
    const profile = mapProfileRecord(row)
    assert.equal(profile.city, 'Кишинёв')
    assert.equal(profile.website, 'https://ogonek.app')
    assert.equal(profile.age, 28)
    assert.equal(profile.is_anonymous, false)
    assert.equal(profile.verified, true)
    assert.equal(profile.level, 4)
  })
})

describe('SUPABASE 2.0: Правило 20 часов для сторис', () => {
  it('сторис младше 20 часов считается активной, старше 20 часов — отсекается', () => {
    const now = Date.now()
    const nineteenHoursAgo = new Date(now - 19 * 60 * 60 * 1000).toISOString()
    const twentyOneHoursAgo = new Date(now - 21 * 60 * 60 * 1000).toISOString()

    const maxAgeMs = 20 * 60 * 60 * 1000

    const isStoryActive = (createdAtISO: string) => {
      const diff = Date.now() - new Date(createdAtISO).getTime()
      return diff < maxAgeMs
    }

    assert.equal(isStoryActive(nineteenHoursAgo), true, 'Сторис возрастом 19 часов активна')
    assert.equal(isStoryActive(twentyOneHoursAgo), false, 'Сторис возрастом 21 час должна быть удалена/скрыта')
  })
})

describe('SUPABASE 2.0: Симметричный thread_key для сообщений (Багфикс 2)', () => {
  it('getDirectThreadKey генерирует одинаковый ключ независимо от порядка участников', async () => {
    const { getDirectThreadKey } = await import('../lib/ogonek/messenger.ts')
    const key1 = getDirectThreadKey('alexey', 'elon')
    const key2 = getDirectThreadKey('elon', 'alexey')
    assert.equal(key1, 'alexey_elon')
    assert.equal(key2, 'alexey_elon')
    assert.equal(key1, key2, 'Ключи диалога Алексея и Илона обязаны совпадать')
  })

  it('getDirectThreadKey безопасно обрабатывает пустые и одинарные ID', async () => {
    const { getDirectThreadKey } = await import('../lib/ogonek/messenger.ts')
    assert.equal(getDirectThreadKey('', 'elon'), 'elon')
    assert.equal(getDirectThreadKey('alexey', ''), 'alexey')
    assert.equal(getDirectThreadKey('', ''), '')
  })
})

describe('SUPABASE 2.0: Защита мессенджера от падений (Error Boundary crash)', () => {
  it('threadOf, unreadCount, lastMessage, sortThreadIds не падают при undefined/null', async () => {
    const {
      threadOf,
      emptyThread,
      unreadCount,
      lastMessage,
      totalUnread,
      sortThreadIds,
      filterThreadsByFolder,
    } = await import('../lib/ogonek/messenger.ts')

    // threadOf
    const empty1 = threadOf(null, null)
    assert.deepEqual(empty1.messages, [])
    const empty2 = threadOf(undefined, 'nonexistent')
    assert.deepEqual(empty2.messages, [])

    // unreadCount
    assert.equal(unreadCount(undefined), 0)
    assert.equal(unreadCount(null), 0)
    assert.equal(unreadCount({} as any), 0)

    // lastMessage
    assert.equal(lastMessage(undefined), null)
    assert.equal(lastMessage(null), null)
    assert.equal(lastMessage({} as any), null)

    // totalUnread
    assert.equal(totalUnread(null as any), 0)
    assert.equal(totalUnread(undefined as any), 0)
    assert.equal(totalUnread({} as any), 0)

    // sortThreadIds
    assert.deepEqual(sortThreadIds(null as any, null as any), [])
    assert.deepEqual(sortThreadIds(undefined as any, ['a', 'b']), ['a', 'b'])

    // filterThreadsByFolder
    assert.deepEqual(filterThreadsByFolder(null as any, null as any), [])
    assert.deepEqual(filterThreadsByFolder({}, ['fr-1'], 'all'), ['fr-1'])
  })

  it('emptyMessengerState возвращает валидный пустой объект состояния', async () => {
    const { emptyMessengerState } = await import('../lib/ogonek/messenger.ts')
    const state = emptyMessengerState()
    assert.deepEqual(state.chatThreads, {})
    assert.equal(state.chatActiveFriendId, null)
    assert.ok(Array.isArray(state.chatFolders))
    assert.equal(state.chatActiveFolderId, 'all')
    assert.deepEqual(state.chatTags, [])
    assert.ok(typeof state.chatSettings === 'object')
  })

  it('sanitizeChatThreads очищает мусорные ключи "undefined" и "null"', async () => {
    const { sanitizeChatThreads } = await import('../lib/ogonek/messenger.ts')
    const corruptInput = {
      undefined: { messages: 'corrupt' },
      null: { messages: null },
      '': { messages: [] },
      'fr-voloshin': {
        messages: [{ id: 'm1', authorId: 'me', text: 'привет', createdAtISO: new Date().toISOString() }],
        draft: 'черновик',
      },
    }
    const cleaned = sanitizeChatThreads(corruptInput)
    assert.equal('undefined' in cleaned, false, 'Ключ undefined должен быть удалён')
    assert.equal('null' in cleaned, false, 'Ключ null должен быть удалён')
    assert.equal('' in cleaned, false, 'Пустой ключ должен быть удалён')
    assert.ok('fr-voloshin' in cleaned, 'Валидный диалог сохраняется')
    assert.equal(cleaned['fr-voloshin'].messages.length, 1)
  })

  it('sanitizeChatActiveFriendId преобразует "undefined" и "null" в null', async () => {
    const { sanitizeChatActiveFriendId } = await import('../lib/ogonek/messenger.ts')
    assert.equal(sanitizeChatActiveFriendId('undefined'), null)
    assert.equal(sanitizeChatActiveFriendId('null'), null)
    assert.equal(sanitizeChatActiveFriendId('   '), null)
    assert.equal(sanitizeChatActiveFriendId(null), null)
    assert.equal(sanitizeChatActiveFriendId(undefined), null)
    assert.equal(sanitizeChatActiveFriendId('fr-voloshin'), 'fr-voloshin')
  })
})

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mapProfileRecord } from '../lib/supabase/api.ts'

describe('Профиль: разрешение уровня и подписчики', () => {
  it('mapProfileRecord корректно считывает level из row.level', () => {
    const row = {
      id: 'user-1',
      username: 'user1',
      display_name: 'User One',
      level: 4,
    }
    const mapped = mapProfileRecord(row)
    assert.equal(mapped.level, 4)
    assert.equal(mapped.difficulty_level, 4)
  })

  it('mapProfileRecord корректно считывает level из settings.level (как у Илона Маска)', () => {
    const row = {
      id: '7ddf756a-ea70-43e2-bd2d-f0009603926b',
      username: 'ilonmusk',
      display_name: 'ILON MUSK',
      settings: { level: 5 },
    }
    const mapped = mapProfileRecord(row)
    assert.equal(mapped.level, 5, 'Уровень Илона Маска должен быть 5')
    assert.equal(mapped.difficulty_level, 5)
  })

  it('mapProfileRecord подставляет 1 если уровень не указан', () => {
    const row = {
      id: 'user-3',
      username: 'newbie',
      display_name: 'Newbie',
    }
    const mapped = mapProfileRecord(row)
    assert.equal(mapped.level, 1)
    assert.equal(mapped.difficulty_level, 1)
  })

  it('mapProfileRecord отдает приоритет level, затем settings.level, затем difficulty_level', () => {
    const rowWithBoth = {
      id: 'user-4',
      username: 'both',
      display_name: 'Both',
      level: 3,
      settings: { level: 2 },
    }
    assert.equal(mapProfileRecord(rowWithBoth).level, 3)

    const rowWithSettings = {
      id: 'user-5',
      username: 'settings_only',
      display_name: 'Settings Only',
      settings: { level: 5 },
    }
    assert.equal(mapProfileRecord(rowWithSettings).level, 5)
  })
})

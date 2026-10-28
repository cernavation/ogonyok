import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizePrivacySettings, DEFAULT_PRIVACY } from '../lib/ogonek/privacy.ts'
import { isMutualFriend } from '../lib/ogonek/friends.ts'

test('Systemic Leaderboard & Default Privacy (ЭТАП 24)', async (t) => {
  await t.test('sanitizes defaultDayVisibility properly', () => {
    const priv = sanitizePrivacySettings({ defaultDayVisibility: 'private' })
    assert.equal(priv.defaultDayVisibility, 'private')

    const friends = sanitizePrivacySettings({ defaultDayVisibility: 'friends' })
    assert.equal(friends.defaultDayVisibility, 'friends')

    const fallback = sanitizePrivacySettings({ defaultDayVisibility: 'unknown' as any })
    assert.equal(fallback.defaultDayVisibility, 'public')
  })

  await t.test('DEFAULT_PRIVACY has public defaultDayVisibility', () => {
    assert.equal(DEFAULT_PRIVACY.defaultDayVisibility, 'public')
  })

  await t.test('isMutualFriend detects mutual friendship correctly', () => {
    assert.equal(isMutualFriend('friend-1', ['friend-1', 'friend-2']), true)
    assert.equal(isMutualFriend('friend-3', ['friend-1', 'friend-2']), false)
    assert.equal(isMutualFriend('', ['friend-1']), false)
  })
})

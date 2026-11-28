import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  DEFAULT_PRIVACY,
  canInviteUserToGroup,
  canMessageUser,
  isProfileHiddenFromSearch,
  resolveAllowGroupInvitesFrom,
  resolveAllowMessagesFrom,
  sanitizePrivacySettings,
} from '../lib/ogonek/privacy.ts'
import {
  PRIDAY_CHAT_ID,
  PRIDAY_QUICK_ACTIONS,
  PRIDAY_SUPPORT_CUSTOM_REPLY,
  buildPridayFollowText,
  buildPridayMutualText,
  ensurePridayThreadInThreads,
  isDeletableChat,
  isPridayChat,
  mapPridayRecordToChatMessage,
  matchPridayQuickAction,
} from '../lib/ogonek/priday-system-chat.ts'
import { sanitizeChatThreads } from '../lib/ogonek/messenger.ts'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('Этап 2 из 2: Системный чат Priday, Приватность («Скрытая личность»), и Группы только из друзей', () => {
  it('1. Официальный системный чат Priday: не удаляется, сидируется всем, 4 чипса и уведомления', () => {
    assert.equal(isPridayChat(PRIDAY_CHAT_ID), true)
    assert.equal(isDeletableChat(PRIDAY_CHAT_ID), false)
    assert.equal(isDeletableChat('some-friend-uuid'), true)

    assert.equal(PRIDAY_QUICK_ACTIONS.length, 4)
    assert.deepEqual(
      PRIDAY_QUICK_ACTIONS.map((a) => a.label),
      [
        'В чём суть Winlog?',
        'Как работает стрик и оценка дня?',
        'Как добавить друзей?',
        'Связаться с поддержкой',
      ]
    )

    const faqMatch = matchPridayQuickAction('В чём суть Winlog?')
    assert.ok(faqMatch)
    assert.ok(!faqMatch.isSupport)
    assert.ok(faqMatch.replyText.includes('5 поводов для гордости'))

    const supportMatch = matchPridayQuickAction('Связаться с поддержкой')
    assert.ok(supportMatch?.isSupport)
    assert.equal(matchPridayQuickAction('Кастомное сообщение в поддержку'), null)
    assert.ok(PRIDAY_SUPPORT_CUSTOM_REPLY.includes('поддержку Winlog'))

    const ensured = ensurePridayThreadInThreads({})
    assert.ok(ensured[PRIDAY_CHAT_ID])
    assert.equal(ensured[PRIDAY_CHAT_ID].peerMeta?.name, 'Winlog')
    assert.equal(ensured[PRIDAY_CHAT_ID].peerMeta?.verified, true)
    assert.equal(ensured[PRIDAY_CHAT_ID].messages.length, 1)

    const sanitized = sanitizeChatThreads(ensured)
    assert.ok(sanitized[PRIDAY_CHAT_ID])
    assert.equal(sanitized[PRIDAY_CHAT_ID].peerMeta?.name, 'Winlog')

    assert.equal(buildPridayFollowText('alice', 'Alice'), '@alice подписался на тебя')
    assert.equal(
      buildPridayMutualText('bob', 'Bob'),
      'Вы с @bob теперь друзья! Теперь вы можете писать друг другу и добавлять в группы'
    )

    const mappedNotif = mapPridayRecordToChatMessage({
      id: 'notif-1',
      type: 'priday_mutual',
      body: buildPridayMutualText('bob', 'Bob'),
      data: { actorId: 'uuid-bob', actorUsername: 'bob' },
      is_read: false,
      created_at: '2026-11-27T18:00:00.000Z',
    })
    assert.ok(mappedNotif)
    assert.equal(mappedNotif.authorId, PRIDAY_CHAT_ID)
    assert.equal(mappedNotif.read, false)
    assert.equal(mappedNotif.actorMeta?.actorId, 'uuid-bob')
    assert.equal(mappedNotif.actorMeta?.actorUsername, 'bob')

    const storeSrc = readRepoFile('lib/ogonek/use-ogonek-store.ts')
    assert.ok(storeSrc.includes('if (!friendId || isPridayChat(friendId)) return false'), 'deleteChatThread запрещает удаление чата Priday')
  })

  it('2. Настройки приватности: Скрытая личность, allowMessagesFrom, allowGroupInvitesFrom', () => {
    assert.equal(DEFAULT_PRIVACY.isHiddenFromSearch, false)
    assert.equal(DEFAULT_PRIVACY.allowMessagesFrom, 'everyone')
    assert.equal(DEFAULT_PRIVACY.allowGroupInvitesFrom, 'friends')

    const hidden = sanitizePrivacySettings({
      isHiddenFromSearch: true,
      allowMessagesFrom: 'friends',
      allowGroupInvitesFrom: 'nobody',
    })
    assert.equal(hidden.isHiddenFromSearch, true)
    assert.equal(hidden.whoCanFind, 'nobody')
    assert.equal(hidden.searchableByUsername, false)
    assert.equal(hidden.allowMessagesFrom, 'friends')
    assert.equal(hidden.whoCanMessage, 'friends')
    assert.equal(hidden.allowGroupInvitesFrom, 'nobody')

    assert.equal(isProfileHiddenFromSearch({ is_hidden_from_search: true }), true)
    assert.equal(isProfileHiddenFromSearch({ privacy: { isHiddenFromSearch: true } }), true)
    assert.equal(isProfileHiddenFromSearch({ who_can_find: 'nobody' }), true)
    assert.equal(isProfileHiddenFromSearch({ is_hidden_from_search: false, who_can_find: 'everyone' }), false)

    assert.equal(resolveAllowMessagesFrom({ allow_messages_from: 'friends' }), 'friends')
    assert.equal(resolveAllowMessagesFrom({ privacy: { allowMessagesFrom: 'nobody' } }), 'nobody')
    assert.equal(resolveAllowGroupInvitesFrom({ allow_group_invites_from: 'nobody' }), 'nobody')
  })

  it('3. Проверка прав ЛС (canMessageUser) и приглашений в группы (canInviteUserToGroup)', () => {
    const targetFriendsOnly = { id: 'u2', allow_messages_from: 'friends', allow_group_invites_from: 'friends' }
    assert.equal(
      canMessageUser({ viewerId: 'u1', targetProfile: targetFriendsOnly, isMutualFriend: false }).allowed,
      false
    )
    assert.equal(
      canMessageUser({ viewerId: 'u1', targetProfile: targetFriendsOnly, isMutualFriend: true }).allowed,
      true
    )

    const targetNobody = { id: 'u3', allow_messages_from: 'nobody', allow_group_invites_from: 'nobody' }
    assert.equal(
      canMessageUser({ viewerId: 'u1', targetProfile: targetNobody, isMutualFriend: true }).allowed,
      false
    )

    // Группы: только взаимные друзья И allow_group_invites_from !== 'nobody'
    assert.equal(
      canInviteUserToGroup({ viewerId: 'u1', targetProfile: targetFriendsOnly, isMutualFriend: false }).allowed,
      false
    )
    assert.equal(
      canInviteUserToGroup({ viewerId: 'u1', targetProfile: targetFriendsOnly, isMutualFriend: true }).allowed,
      true
    )
    assert.equal(
      canInviteUserToGroup({ viewerId: 'u1', targetProfile: targetNobody, isMutualFriend: true }).allowed,
      false
    )
  })

  it('4. UI и API: Поиск, Написать в профиле, Группы только из друзей и контекстное меню без удаления Priday', () => {
    const newChatSrc = readRepoFile('components/ogonek/messenger/new-chat-modal.tsx')
    assert.ok(newChatSrc.includes('getMutualFriendProfiles'), 'NewChatModal загружает для групп строго взаимных друзей')
    assert.ok(newChatSrc.includes('Чтобы создать группу, сначала добавь друзей (взаимная подписка)'))

    const dialogListSrc = readRepoFile('components/ogonek/messenger/messenger-dialog-list.tsx')
    assert.ok(dialogListSrc.includes('isDeletableChat(contextMenu.threadId)'), 'Контекстное меню скрывает удаление для Priday')

    const profileViewSrc = readRepoFile('components/ogonek/views/profile-view.tsx')
    assert.ok(profileViewSrc.includes('canMessageUser'), 'ProfileView проверяет право на ЛС')
    assert.ok(profileViewSrc.includes('<span>Написать</span>'), 'На чужом профиле есть кнопка Написать')
  })
})

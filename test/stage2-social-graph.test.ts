import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { myStoriesToViewable, friendStoryToViewable } from '../lib/ogonek/stories.ts'
import type { FriendProfile } from '../lib/ogonek/friends.ts'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('Stage 2: Social Core SSOT, Unified Avatar & VerifiedBadge, Story Header Profile Navigation', () => {
  it('переносит avatarUrl в ViewableStory для личной истории и истории друга', () => {
    const friend: FriendProfile & { avatarUrl?: string | null } = {
      id: 'user-cerna',
      name: 'Alexei Cerna',
      username: 'cernavation',
      initials: 'AC',
      avatarUrl: 'https://cdn.example.com/cerna.jpg',
      avatarColor: '#1d9bf0',
      bio: 'Bio',
      city: 'Москва',
      streak: 752,
      together: 10,
      mutual: 2,
      verified: true,
      lastActive: 'сейчас',
      presence: 'online',
    }

    const friendViewable = friendStoryToViewable(friend, {
      friendId: friend.id,
      postedLabel: '10 мин назад',
      slides: [],
    })
    assert.equal(friendViewable.avatarUrl, 'https://cdn.example.com/cerna.jpg')
    assert.equal(friendViewable.avatarColor, '#1d9bf0')
    assert.equal(friendViewable.verified, true)

    const mineViewable = myStoriesToViewable(
      [
        {
          id: 'my-1',
          createdAtISO: '2026-11-27T12:00:00.000Z',
          emoji: '🔥',
          kicker: 'ГОРДОСТЬ ДНЯ',
          headline: 'Тест',
          detail: 'Деталь',
          from: '#2a1206',
          to: '#7a2f0c',
          accent: '#ffa600',
          sourceDayId: 1,
        },
      ],
      {
        displayName: 'Илон Маск',
        username: 'ilonmusk',
        avatarUrl: 'https://cdn.example.com/elon.png',
        avatarColor: '#2196f3',
        verified: false,
      }
    )
    assert.ok(mineViewable)
    assert.equal(mineViewable!.avatarUrl, 'https://cdn.example.com/elon.png')
    assert.equal(mineViewable!.avatarColor, '#2196f3')
  })

  it('VerifiedBadge использует единый синий #1d9bf0 и внедрён во всех чатах и социальных экранах', () => {
    const badgeSrc = readRepoFile('components/ogonek/ui/verified-badge.tsx')
    assert.ok(badgeSrc.includes('#1d9bf0'), 'VerifiedBadge обязан использовать единый цвет #1d9bf0')

    const filesUsingVerifiedBadge = [
      'components/ogonek/messenger/messenger-dialog-list.tsx',
      'components/ogonek/messenger/messenger-chat-pane.tsx',
      'components/ogonek/messenger/chat-thread-list.tsx',
      'components/ogonek/messenger/chat-window.tsx',
      'components/ogonek/messenger/new-chat-modal.tsx',
      'components/ogonek/messenger/forward-to-chat-modal.tsx',
      'components/ogonek/stories-bar.tsx',
      'components/ogonek/story-viewer-modal.tsx',
      'components/ogonek/views/explore-view.tsx',
      'components/ogonek/views/profile-view.tsx',
      'components/ogonek/views/leaderboard-view.tsx',
      'components/ogonek/follow-list-modal.tsx',
      'components/ogonek/friends/friends-modal.tsx',
      'components/ogonek/friends-manager.tsx',
      'components/ogonek/friend-detail-modal.tsx',
      'components/ogonek/active-friends-widget.tsx',
      'components/ogonek/day-card.tsx',
    ]

    for (const file of filesUsingVerifiedBadge) {
      const content = readRepoFile(file)
      assert.ok(
        content.includes('VerifiedBadge'),
        `${file} обязан использовать единый компонент <VerifiedBadge />`
      )
      assert.ok(
        !content.includes('rounded-full bg-[var(--accent)] text-white inline-flex'),
        `${file} не должен содержать устаревший оранжевый бейдж верификации`
      )
      assert.ok(
        !content.includes('friend-verified flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[var(--primary)]'),
        `${file} не должен содержать старый локальный бейдж с var(--primary)`
      )
    }
  })

  it('UserAvatar используется в сторис, чатах, поиске, рейтинге, виджете друзей и профиле', () => {
    const avatarSrc = readRepoFile('components/ogonek/ui/user-avatar.tsx')
    assert.ok(avatarSrc.includes('usePhotoUrl'), 'UserAvatar должен разрешать фото через usePhotoUrl')
    assert.ok(avatarSrc.includes('DEFAULT_AVATAR_COLOR'), 'UserAvatar должен иметь цвет-фоллбек')

    const filesUsingUserAvatar = [
      'components/ogonek/stories-bar.tsx',
      'components/ogonek/story-viewer-modal.tsx',
      'components/ogonek/messenger/chat-avatar.tsx',
      'components/ogonek/messenger/new-chat-modal.tsx',
      'components/ogonek/explore/community-avatar.tsx',
      'components/ogonek/views/profile-view.tsx',
      'components/ogonek/views/leaderboard-view.tsx',
      'components/ogonek/views/home-view.tsx',
      'components/ogonek/follow-list-modal.tsx',
      'components/ogonek/friends/friends-modal.tsx',
      'components/ogonek/friends-manager.tsx',
      'components/ogonek/friend-detail-modal.tsx',
      'components/ogonek/active-friends-widget.tsx',
      'components/ogonek/day-card.tsx',
      'components/ogonek/sidebar.tsx',
      'components/ogonek/bottom-nav.tsx',
    ]

    for (const file of filesUsingUserAvatar) {
      const content = readRepoFile(file)
      assert.ok(
        content.includes('UserAvatar'),
        `${file} обязан использовать единый компонент <UserAvatar />`
      )
    }

    const chatAvatarSrc = readRepoFile('components/ogonek/messenger/chat-avatar.tsx')
    assert.ok(
      chatAvatarSrc.includes('p.avatar_color') && chatAvatarSrc.includes('p.verified'),
      'ChatAvatar обязан обновлять avatar_color и verified из public.profiles'
    )
  })

  it('клик по шапке автора в сторис закрывает окно и открывает его профиль', () => {
    const viewerSrc = readRepoFile('components/ogonek/story-viewer-modal.tsx')
    assert.ok(viewerSrc.includes('onOpenUserProfile'), 'StoryViewerModal должен принимать onOpenUserProfile')
    assert.ok(viewerSrc.includes('onOpenUserProfile?.(targetProfileId)'), 'Клик в шапке должен открывать профиль автора')
    assert.ok(
      viewerSrc.includes("story.kind === 'mine' ? (myAvatarSrc || story.avatarUrl) : story.avatarUrl"),
      'StoryViewerModal должен показывать avatarUrl других пользователей, а не инициалы АЦ'
    )

    const storiesBarSrc = readRepoFile('components/ogonek/stories-bar.tsx')
    assert.ok(
      storiesBarSrc.includes('const avatarUrl = author?.avatar_image || author?.avatar_url || null'),
      'StoriesBar обязан извлекать avatar_url/avatar_image автора из Supabase'
    )
    assert.ok(
      storiesBarSrc.includes('onOpenUserProfile={onOpenProfile}'),
      'StoriesBar обязан пробрасывать onOpenProfile в StoryViewerModal'
    )
  })

  it('Supabase follows выступает SSOT для подписок, счётчиков и автоматических взаимных друзей', () => {
    const apiSrc = readRepoFile('lib/supabase/api.ts')
    assert.ok(apiSrc.includes('getSocialGraphFromFollows'), 'api.ts должен экспортировать getSocialGraphFromFollows')
    assert.ok(apiSrc.includes('subscribeToFollows'), 'api.ts должен экспортировать subscribeToFollows')

    // В schema public.follows нет колонки status — убеждаемся, что followUser не шлёт status в follows
    const followUserBlock = apiSrc.slice(
      apiSrc.indexOf('export async function followUser('),
      apiSrc.indexOf('export async function unfollowUser(')
    )
    assert.ok(followUserBlock.includes("from('follows').upsert("))
    assert.ok(
      !followUserBlock.includes("following_id: followingId,\n        status:"),
      'followUser не должен передавать несуществующую колонку status в public.follows'
    )

    // Profile & settings must persist avatar_color
    assert.ok(
      apiSrc.includes('if (patch.avatar_color !== undefined)'),
      'updateProfileInDb обязан сохранять avatar_color в profiles'
    )

    const storeSrc = readRepoFile('lib/ogonek/use-ogonek-store.ts')
    assert.ok(
      storeSrc.includes('avatar_color: nextProfile.avatarColor'),
      'updateProfile в store обязан передавать avatar_color в БД'
    )
    assert.ok(
      storeSrc.includes('syncSocialGraphFromCloud'),
      'Store обязан предоставлять syncSocialGraphFromCloud для F5 и Realtime'
    )

    // Двойной toggleFollow / toggleFriendshipFollow устранён в ProfileView, FollowListModal и FriendsManager
    const profileSrc = readRepoFile('components/ogonek/views/profile-view.tsx')
    assert.ok(
      !profileSrc.includes('onToggleFollow?.(targetId)\n    if (currentUid) {\n      await toggleFriendshipFollow'),
      'ProfileView не должен вызывать toggleFriendshipFollow повторно после onToggleFollow'
    )
    assert.ok(
      profileSrc.includes('ownCounts ? ownCounts.followersCount'),
      'ProfileView обязан считать читателей своего профиля из БД follows, а не из storeState.friendIds'
    )
    assert.ok(
      !profileSrc.includes('Math.max(rawStreak, 740)') &&
        !profileSrc.includes(', 740)') &&
        profileSrc.includes('foreignDaysLoaded'),
      'ProfileView не должен подмешивать захардкоженный порог 740, вызывающий скачки 740/752'
    )

    const leaderboardApiSrc = readRepoFile('app/api/leaderboard/route.ts')
    assert.ok(
      !leaderboardApiSrc.includes('update({ streak_count: 720'),
      'Leaderboard API не должен перезаписывать реальный streak_count в БД значением 720'
    )

    const requestsRouteSrc = readRepoFile('app/api/friends/requests/route.ts')
    assert.ok(
      requestsRouteSrc.includes("from('follows').select('following_id')") &&
        requestsRouteSrc.includes('const mutualFollowIds = Array.from(followingSet).filter((id) => followersSet.has(id))'),
      'GET /api/friends/requests должен вычислять друзей по взаимным подпискам в follows'
    )
  })
})

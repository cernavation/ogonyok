import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pluralizeFriends } from '../lib/ogonek/friends.ts'
import { buildDayAttachment, buildGratitudeAttachment, buildPrideAttachment } from '../lib/ogonek/messenger.ts'
import { clearUserSessionData, DEFAULT_STORE_STATE } from '../lib/ogonek/storage.ts'
import type { Day } from '../lib/ogonek/types.ts'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('Post-Stage-2 Hotfixes (6 bugfixes)', () => {
  it('Bug 1: устранены причины мигания Собеседник и перезаписи peerMeta в чатах', () => {
    const storeSrc = readRepoFile('lib/ogonek/use-ogonek-store.ts')
    assert.ok(
      !storeSrc.includes('if (customEvent.detail && customEvent.detail.days && customEvent.detail.days.length > 0)'),
      'handleCustom не должен игнорировать customEvent.detail, если days пустой'
    )
    assert.ok(
      storeSrc.includes('avatarColor: profile.avatar_color || prevThread.peerMeta?.avatarColor'),
      'loadChatThreadsFromCloud должен сохранять peerMeta (avatarColor, verified, name)'
    )
    assert.ok(
      storeSrc.includes('curMeta.avatarColor === nextMeta.avatarColor'),
      'updateThreadPeerMeta должен делать short-circuit без emitChange, если поля не изменились'
    )

    const storageSrc = readRepoFile('lib/ogonek/storage.ts')
    assert.ok(
      !storageSrc.includes('chatThreads: {} // Отбрасываем старые чаты'),
      'saveStoreImmediate не должен сбрасывать chatThreads при QuotaExceededError'
    )

    const chatAvatarSrc = readRepoFile('components/ogonek/messenger/chat-avatar.tsx')
    assert.ok(
      chatAvatarSrc.includes('getCachedProfileSync'),
      'ChatAvatar обязан использовать синхронный кэш профиля getCachedProfileSync'
    )

    const paneSrc = readRepoFile('components/ogonek/messenger/messenger-chat-pane.tsx')
    assert.ok(
      paneSrc.includes('getCachedProfileSync'),
      'MessengerChatPane обязан читать профиль синхронно из getCachedProfileSync без скачков'
    )
  })

  it('Bug 2: GIF-поиск имеет /api/giphy?img= ретранслятор, referrerPolicy и fallback', () => {
    const apiSrc = readRepoFile('app/api/giphy/route.ts')
    assert.ok(apiSrc.includes("searchParams.get('img')"), 'API /api/giphy должен поддерживать proxy ?img=')
    assert.ok(apiSrc.includes('verifyGifPreviews'), 'API должен проверять доступность GIF-превью')
    assert.ok(apiSrc.includes('RU_TO_EN_GIF_FALLBACK'), 'API должен поддерживать RU->EN фолбэк')

    const modalSrc = readRepoFile('components/ogonek/messenger/chat-gif-modal.tsx')
    assert.ok(modalSrc.includes('referrerPolicy="no-referrer"'), 'GIF-плитки обязаны передавать no-referrer')
    assert.ok(modalSrc.includes('/api/giphy?img='), 'GIF-плитки должны переключаться на /api/giphy?img= при ошибке CDN')

    const bubbleSrc = readRepoFile('components/ogonek/messenger/chat-message-bubble.tsx')
    assert.ok(bubbleSrc.includes('referrerPolicy="no-referrer"'), 'GIF в пузыре чата должен передавать no-referrer')
    assert.ok(bubbleSrc.includes('/api/giphy?img='), 'GIF в пузыре чата должен фолбэчить через /api/giphy?img=')
  })

  it('Bug 3: карточка гордости в чате хранит полный текст + метаданные автора и открывает модалку просмотра', () => {
    const longText =
      'Очень длинная подробная гордость дня про завершение сложного релиза без единого бага '.repeat(4).trim()
    const sampleDay: Day = {
      id: 752,
      title: longText,
      tags: ['Для тебя'],
      dateISO: '2026-11-27T10:00:00.000Z',
      status: 'normal',
      visibility: 'public',
      photos: ['https://example.com/p.jpg'],
      prides: [{ num: '01', text: longText, scale: 9, overcome: 1, visibility: 'public' }],
      gratitudes: [{ num: '01', text: 'Команде за поддержку' }],
    }

    const att = buildPrideAttachment(sampleDay, 0, {
      name: 'Alexei Cerna',
      username: 'cernavation',
      avatarUrl: 'https://example.com/a.jpg',
      avatarColor: '#1d9bf0',
      verified: true,
    })
    assert.equal(att.title, longText)
    assert.equal(att.author, 'Alexei Cerna')
    assert.equal(att.authorUsername, 'cernavation')
    assert.equal(att.authorAvatar, 'https://example.com/a.jpg')
    assert.equal(att.authorVerified, true)
    assert.equal(att.rating, 9)
    assert.equal(att.dayDateISO, '2026-11-27T10:00:00.000Z')

    const dayAtt = buildDayAttachment(sampleDay, { name: 'Alexei Cerna', verified: true })
    assert.ok(dayAtt.title.includes(longText))
    assert.equal(dayAtt.author, 'Alexei Cerna')

    const gratAtt = buildGratitudeAttachment(sampleDay, 0, { username: 'cernavation' })
    assert.equal(gratAtt.authorUsername, 'cernavation')

    const cardSrc = readRepoFile('components/ogonek/messenger/chat-attachment-card.tsx')
    assert.ok(cardSrc.includes('onClick'), 'ChatAttachmentCard должен поддерживать onClick')

    const viewerSrc = readRepoFile('components/ogonek/messenger/chat-attachment-modal.tsx')
    assert.ok(viewerSrc.includes('whitespace-pre-wrap'), 'Модалка карточки должна рендерить полный нерезаный текст')
    assert.ok(viewerSrc.includes('/10'), 'Модалка карточки должна отображать оценку /10')

    const pickerSrc = readRepoFile('components/ogonek/messenger/attach-card-picker.tsx')
    assert.ok(pickerSrc.includes('days.slice(0, 10)'), 'AttachCardPicker должен показывать последние 10 дней с поиском по всем дням')
  })

  it('Bug 4: аватар «Моя история» центрирован через fillContainer и симметричную сетку CSS', () => {
    const avatarSrc = readRepoFile('components/ogonek/ui/user-avatar.tsx')
    assert.ok(avatarSrc.includes('fillContainer'), 'UserAvatar должен поддерживать fillContainer')

    const storiesSrc = readRepoFile('components/ogonek/stories-bar.tsx')
    assert.ok(storiesSrc.includes('fillContainer'), 'StoriesBar должен передавать fillContainer в UserAvatar')

    const cssSrc = readRepoFile('app/globals.css')
    assert.ok(
      cssSrc.includes('.story-ring__ring') && cssSrc.includes('box-sizing: border-box;') && cssSrc.includes('align-items: center;'),
      'CSS .story-ring__ring и .story-ring__inner должны использовать симметричное центрирование border-box'
    )
  })

  it('Bug 5: склонение «друг / друга / друзей» и синхронный виджет RightRail «Друзья»', () => {
    assert.equal(pluralizeFriends(0), '0 друзей')
    assert.equal(pluralizeFriends(1), '1 друг')
    assert.equal(pluralizeFriends(2), '2 друга')
    assert.equal(pluralizeFriends(4), '4 друга')
    assert.equal(pluralizeFriends(5), '5 друзей')
    assert.equal(pluralizeFriends(11), '11 друзей')
    assert.equal(pluralizeFriends(14), '14 друзей')
    assert.equal(pluralizeFriends(21), '21 друг')
    assert.equal(pluralizeFriends(23), '23 друга')

    const widgetSrc = readRepoFile('components/ogonek/active-friends-widget.tsx')
    assert.ok(widgetSrc.includes('pluralizeFriends'), 'ActiveFriendsWidget должен использовать pluralizeFriends')
    assert.ok(widgetSrc.includes('isInitialLoading'), 'ActiveFriendsWidget должен показывать состояние загрузки пока профиль грузится')
  })

  it('Bug 6: выход и смена аккаунта сбрасывают Evidence Vault и все пользовательские кэши', () => {
    const dirtyState = {
      ...DEFAULT_STORE_STATE,
      theme: 'apple-light' as const,
      accent: 'blue' as const,
      soundEnabled: false,
      days: [{ id: 1, title: 'Secret day', tags: [], prides: [], gratitudes: [] }],
      evidenceItems: [{ id: 'ev-1', title: 'Private fact', description: 'Top secret', date: '2026', category: 'Рост' }],
      evidenceFavorites: ['ev-1'],
      morningIntentions: { '2026-11-27': ['Focus 1', 'Focus 2', 'Focus 3'] as [string, string, string] },
      followingIds: ['user-a'],
      friendIds: ['user-b'],
      chatThreads: {
        'user-b': {
          friendId: 'user-b',
          messages: [],
          draft: 'secret draft',
          readAtISO: null,
          muted: false,
          pinned: false,
          archived: false,
          folderIds: [],
          typing: false,
        },
      },
    }

    const cleared = clearUserSessionData(dirtyState)
    assert.deepEqual(cleared.evidenceItems, [])
    assert.deepEqual(cleared.evidenceFavorites, [])
    assert.deepEqual(cleared.days, [])
    assert.deepEqual(cleared.morningIntentions, {})
    assert.deepEqual(cleared.followingIds, [])
    assert.deepEqual(cleared.friendIds, [])
    assert.deepEqual(cleared.chatThreads, {})
    assert.equal(cleared.auth.signedIn, false)
    assert.equal(cleared.auth.activeAccountId, null)
    // Локальные настройки темы/звука должны сохраниться
    assert.equal(cleared.theme, 'apple-light')
    assert.equal(cleared.accent, 'blue')
    assert.equal(cleared.soundEnabled, false)

    const storeSrc = readRepoFile('lib/ogonek/use-ogonek-store.ts')
    assert.ok(storeSrc.includes('cancelPendingSave()'), 'store обязан отменять debounce-таймер перед очисткой при выходе/смене аккаунта')
    assert.ok(storeSrc.includes('clearProfileMemoryCache()'), 'store обязан очищать профильный кэш в памяти при выходе/смене аккаунта')
    assert.ok(storeSrc.includes('clearUserLocalCaches('), 'store обязан чистить все локальные пользовательские кэши')
    assert.ok(storeSrc.includes('syncEvidenceVaultForUser('), 'store обязан синхронизировать Evidence Vault строго для активного user.id')
    assert.ok(!storeSrc.includes('if (vaultItems && vaultItems.length > 0)'), 'store не должен пропускать очистку evidenceItems при 0 элементах из Supabase')
  })
})

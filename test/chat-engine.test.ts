import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  DEFAULT_CHAT_FOLDERS,
  buildGratitudeAttachment,
  buildLinkPreview,
  buildPrideAttachment,
  extractUrl,
  filterThreadsByFolder,
  isGroupThread,
  makeChatMessage,
  threadTitle,
  unreadCountForFolder,
} from '../lib/ogonek/messenger.ts'
import type { ChatFolder, ChatMessage, ChatThreads, Day } from '../lib/ogonek/types.ts'

test('Telegram Web UX: Папки и фильтрация диалогов', () => {
  const threads: ChatThreads = {
    'fr-voloshin': {
      messages: [
        makeChatMessage({ authorId: 'fr-voloshin', text: 'Привет!', read: false }),
      ],
      readAtISO: null,
      muted: false,
      pinned: false,
      draft: '',
    },
    'fr-sokolova': {
      messages: [
        makeChatMessage({ authorId: 'me', text: 'Как дела?', read: true }),
      ],
      readAtISO: new Date().toISOString(),
      muted: false,
      pinned: false,
      draft: '',
    },
    'group-runners': {
      messages: [
        makeChatMessage({ authorId: 'fr-voloshin', text: 'Чат группы', read: false }),
      ],
      readAtISO: null,
      muted: false,
      pinned: true,
      draft: '',
      groupMeta: {
        id: 'group-runners',
        title: 'Бегуны Огонька',
        avatarColor: '#ff7a18',
        memberIds: ['me', 'fr-voloshin'],
        createdAtISO: new Date().toISOString(),
        createdBy: 'me',
      },
    },
  }

  const ids = Object.keys(threads)

  // Все
  const all = filterThreadsByFolder(threads, ids, 'all')
  assert.equal(all.length, 3)

  // Личные
  const direct = filterThreadsByFolder(threads, ids, 'direct')
  assert.equal(direct.length, 2)
  assert.ok(direct.includes('fr-voloshin'))
  assert.ok(direct.includes('fr-sokolova'))
  assert.ok(!direct.includes('group-runners'))

  // Группы
  const groups = filterThreadsByFolder(threads, ids, 'groups')
  assert.equal(groups.length, 1)
  assert.equal(groups[0], 'group-runners')

  // Непрочитанные
  const unread = filterThreadsByFolder(threads, ids, 'unread')
  assert.equal(unread.length, 2)
  assert.ok(unread.includes('fr-voloshin'))
  assert.ok(unread.includes('group-runners'))

  // Кастомная папка
  const customFolder: ChatFolder = {
    id: 'custom-fav',
    title: 'Избранное',
    isBuiltIn: false,
    chatIds: ['fr-voloshin'],
  }
  const customFiltered = filterThreadsByFolder(threads, ids, 'custom-fav', [customFolder])
  assert.equal(customFiltered.length, 1)
  assert.equal(customFiltered[0], 'fr-voloshin')

  // Подсчёт непрочитанных для папки
  const unreadCount = unreadCountForFolder(threads, ids, 'groups')
  assert.equal(unreadCount, 1)
})

test('Telegram Web UX: Распознавание ссылок и превью', () => {
  const url1 = extractUrl('Посмотри наш репозиторий https://github.com/ogonek/app очень круто!')
  assert.equal(url1, 'https://github.com/ogonek/app')

  const preview = buildLinkPreview('https://github.com/ogonek/app')
  assert.ok(preview.title.includes('GitHub'))
  assert.equal(preview.siteName, 'github.com')

  const noUrl = extractUrl('Просто текст без ссылок')
  assert.equal(noUrl, null)
})

test('Telegram Web UX: Карточка благодарности и гордости для чата', () => {
  const mockDay: Day = {
    id: 42,
    dateISO: '2026-10-23T10:00:00Z',
    title: 'День побед',
    prides: [
      { num: '01', text: 'Пробежал 10 км босиком', scale: 9, overcome: 0 },
    ],
    gratitudes: [
      { text: 'Благодарен утреннему солнцу', rating: 10 },
    ],
    tags: [],
    photos: [],
    visibility: 'public',
  }

  const prideCard = buildPrideAttachment(mockDay, 0)
  assert.equal(prideCard.kind, 'pride')
  assert.equal(prideCard.title, 'Пробежал 10 км босиком')
  assert.ok(prideCard.subtitle.includes('Гордость №1'))

  const gratitudeCard = buildGratitudeAttachment(mockDay, 0)
  assert.equal(gratitudeCard.kind, 'gratitude')
  assert.equal(gratitudeCard.title, 'Благодарен утреннему солнцу')
  assert.ok(gratitudeCard.subtitle.includes('Благодарность №1'))
})

test('Telegram Web UX: Создание сообщения с ответом и медиа', () => {
  const msg = makeChatMessage({
    authorId: 'me',
    text: 'Держим стрик!',
    replyTo: {
      id: 'msg-123',
      authorId: 'fr-voloshin',
      text: 'Кто сегодня в строю?',
    },
    media: {
      type: 'audio',
      url: 'voice.webm',
      durationSec: 12,
      waveform: [20, 40, 80, 50],
    },
  })

  assert.equal(msg.authorId, 'me')
  assert.equal(msg.text, 'Держим стрик!')
  assert.equal(msg.replyTo?.text, 'Кто сегодня в строю?')
  assert.equal(msg.media?.type, 'audio')
  assert.equal(msg.media?.durationSec, 12)
})

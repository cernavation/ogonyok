import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  attachmentKindLabel,
  buildAchievementAttachment,
  buildDayAttachment,
  buildPrideAttachment,
  buildStoryAttachment,
  emptyThread,
  makeChatMessage,
  pickAutoReply,
  sanitizeChatThreads,
  sortThreadIds,
  summarizeMessage,
  totalUnread,
  unreadCount,
  CHAT_MESSAGE_LIMIT,
  MY_CHAT_ID,
} from '../lib/ogonek/messenger.ts'
import { getFriend, registerFriendProfile, type FriendProfile } from '../lib/ogonek/friends.ts'

const testPeer: FriendProfile = {
  id: 'peer-user-1',
  name: 'Александр Смирнов',
  username: 'asmirnov',
  initials: 'АС',
  avatarColor: '#1d9bf0',
  bio: 'Тестовый профиль',
  city: 'Кишинёв',
  streak: 100,
  together: 10,
  mutual: 5,
  verified: true,
  lastActive: 'онлайн',
  presence: 'online',
}
registerFriendProfile(testPeer)
registerFriendProfile({ ...testPeer, id: 'peer-user-2', name: 'Мария', username: 'maria' })
registerFriendProfile({ ...testPeer, id: 'peer-user-3', name: 'Анна', username: 'anna' })
import { getStoryBackground } from '../lib/ogonek/stories.ts'
import type { ChatThreadState, ChatThreads, Day, StorySlide } from '../lib/ogonek/types.ts'

const DAY: Day = {
  id: 12,
  title: 'Марафон',
  tags: ['Спорт'],
  prides: [
    { num: '01', text: 'Пробежал 42 км босиком', scale: 10, overcome: 3, visibility: 'public' },
    { num: '02', text: 'Позвонил инвестору', scale: 7, overcome: 1, visibility: 'friends' },
  ],
  gratitudes: ['Семья', { text: 'Тренер', rating: 9 }],
  photos: ['photo-1'],
  dateISO: '2026-10-12T09:00:00.000Z',
  status: 'normal',
  visibility: 'friends',
}

const SLIDE: StorySlide = {
  id: 'slide-1',
  emoji: '📍',
  kicker: 'КИШИНЁВ',
  headline: 'в огне',
  detail: 'Рассвет на набережной',
  from: '#0a1420',
  to: '#123a5a',
  accent: '#66ffd9',
  photo: null,
}

function thread(overrides: Partial<ChatThreadState> = {}): ChatThreadState {
  return { ...emptyThread(), ...overrides }
}

describe('Messenger — карточки-вложения (ЭТАП 13)', () => {
  it('собирает карточку конкретной гордости с масштабом и приватностью', () => {
    const card = buildPrideAttachment(DAY, 0)
    assert.equal(card.kind, 'pride')
    assert.equal(card.title, 'Пробежал 42 км босиком')
    assert.match(card.subtitle, /10\/10/)
    assert.equal(card.dayId, 12)
    assert.equal(card.prideIndex, 0)
    assert.equal(card.photo, 'photo-1')
    assert.equal(card.visibility, 'public')
    assert.equal(attachmentKindLabel(card.kind), 'Карточка гордости')
  })

  it('берёт приватность дня, если у гордости её нет', () => {
    const dayWithoutPrideVisibility: Day = {
      ...DAY,
      prides: [{ num: '01', text: 'Тихо', scale: 5, overcome: 0 }],
      visibility: 'private',
    }
    assert.equal(buildPrideAttachment(dayWithoutPrideVisibility, 0).visibility, 'private')
  })

  it('собирает карточку целого дня с числом гордостей и благодарностей', () => {
    const card = buildDayAttachment(DAY)
    assert.equal(card.kind, 'day')
    assert.equal(card.dayId, 12)
    assert.match(card.subtitle, /2 гордостей/)
    assert.match(card.subtitle, /2 благодарностей/)
    assert.equal(attachmentKindLabel(card.kind), 'Карточка дня')
  })

  it('собирает карточку сторис с автором и номером кадра', () => {
    const card = buildStoryAttachment({
      storyId: 'story-9',
      authorName: 'Александр Смирнов',
      username: 'asmirnov',
      slide: SLIDE,
      slideIndex: 1,
      totalSlides: 3,
      visibility: 'friends',
    })
    assert.equal(card.kind, 'story')
    assert.equal(card.storyId, 'story-9')
    assert.equal(card.author, 'Александр Смирнов')
    assert.equal(card.emoji, '📍')
    assert.match(card.subtitle, /2\/3/)
    assert.match(card.subtitle, /@asmirnov/)
    assert.equal(attachmentKindLabel(card.kind), 'Сторис')
  })

  it('собирает карточку верифицированной ачивки', () => {
    const bg = getStoryBackground('bg-1')
    const card = buildAchievementAttachment({
      id: 'va-marathon',
      title: '42,2 км босиком',
      topic: 'Спортивный рекорд',
      emoji: '🏆',
      from: bg.from,
      to: bg.to,
      accent: bg.accent,
    })
    assert.equal(card.kind, 'achievement')
    assert.equal(card.storyId, 'va-marathon')
    assert.equal(card.title, '42,2 км босиком')
    assert.equal(attachmentKindLabel(card.kind), 'Ачивка')
  })
})

describe('Messenger — сообщения, прочтение и сортировка тредов', () => {
  it('обрезает длинный текст и подчищает пустоту в makeChatMessage', () => {
    const msg = makeChatMessage({ authorId: MY_CHAT_ID, text: '  Привет  ' })
    assert.equal(msg.text, 'Привет')
    assert.equal(msg.authorId, MY_CHAT_ID)
    assert.equal(msg.read, false)
    assert.deepEqual(msg.reactions, [])

    const long = makeChatMessage({ authorId: 'peer-user-1', text: 'x'.repeat(5000) })
    assert.equal(long.text.length, CHAT_MESSAGE_LIMIT)
  })

  it('считает непрочитанные сообщения только от собеседника', () => {
    const t = thread({
      readAtISO: '2026-10-12T10:00:00.000Z',
      messages: [
        makeChatMessage({ authorId: 'peer-user-1', text: 'a', createdAtISO: '2026-10-12T09:00:00.000Z' }),
        makeChatMessage({ authorId: MY_CHAT_ID, text: 'b', createdAtISO: '2026-10-12T11:00:00.000Z' }),
        makeChatMessage({ authorId: 'peer-user-1', text: 'c', createdAtISO: '2026-10-12T12:00:00.000Z' }),
      ],
    })
    assert.equal(unreadCount(t), 1)
    assert.equal(unreadCount(undefined), 0)
  })

  it('суммирует непрочитанные по всем перепискам', () => {
    const threads: ChatThreads = {
      'peer-user-1': thread({
        readAtISO: '2026-10-12T10:00:00.000Z',
        messages: [makeChatMessage({ authorId: 'peer-user-1', text: 'hi', createdAtISO: '2026-10-12T12:00:00.000Z' })],
      }),
      'peer-user-2': thread({
        readAtISO: null,
        messages: [makeChatMessage({ authorId: 'peer-user-2', text: 'hi', createdAtISO: '2026-10-12T12:00:00.000Z' })],
      }),
    }
    assert.equal(totalUnread(threads), 2)
  })

  it('сортирует закреплённые вперёд, затем по свежести', () => {
    const threads: ChatThreads = {
      'peer-user-2': thread({
        pinned: true,
        messages: [makeChatMessage({ authorId: 'peer-user-2', text: 'old', createdAtISO: '2026-10-01T10:00:00.000Z' })],
      }),
      'peer-user-1': thread({
        messages: [makeChatMessage({ authorId: 'peer-user-1', text: 'new', createdAtISO: '2026-10-12T10:00:00.000Z' })],
      }),
      'peer-user-3': thread({
        messages: [makeChatMessage({ authorId: 'peer-user-3', text: 'mid', createdAtISO: '2026-10-05T10:00:00.000Z' })],
      }),
    }
    const ids = Object.keys(threads)
    assert.deepEqual(sortThreadIds(threads, ids), ['peer-user-2', 'peer-user-1', 'peer-user-3'])
  })

  it('делает читаемую выжимку последнего сообщения', () => {
    assert.match(summarizeMessage(null), /Начни переписку/)
    const withAttachment = makeChatMessage({
      authorId: MY_CHAT_ID,
      text: 'Смотри',
      attachment: buildPrideAttachment(DAY, 0),
    })
    assert.equal(summarizeMessage(withAttachment), 'Смотри · Карточка гордости')
    const attachmentOnly = makeChatMessage({ authorId: MY_CHAT_ID, text: '', attachment: buildDayAttachment(DAY) })
    assert.match(summarizeMessage(attachmentOnly), /Карточка дня: /)
  })
})

describe('Messenger — живой собеседник (автоответ)', () => {
  const friend = getFriend('peer-user-1')!

  it('отвечает дружелюбно на приветствие', () => {
    const reply = pickAutoReply(friend, 'Привет!', false)
    assert.match(reply.text, /Привет/)
  })

  it('благодарит в ответ на спасибо и ставит реакцию', () => {
    const reply = pickAutoReply(friend, 'Спасибо большое', false)
    assert.equal(reply.reactionId, 'pray')
  })

  it('на карточку-вложение отвечает с реакцией «огонь»', () => {
    const reply = pickAutoReply(friend, 'Держи мою гордость', true)
    assert.equal(reply.reactionId, 'fire')
    assert.ok(reply.text.length > 0)
  })

  it('отвечает детерминированно на одинаковый ввод', () => {
    const a = pickAutoReply(friend, 'Погнали', false)
    const b = pickAutoReply(friend, 'Погнали', false)
    assert.equal(a.text, b.text)
    assert.equal(a.reactionId, b.reactionId)
  })
})

describe('Messenger — валидация переписок из хранилища', () => {
  it('сохраняет корректные треды реальных друзей', () => {
    const cleaned = sanitizeChatThreads({
      'peer-user-1': {
        messages: [
          { id: 'm1', authorId: 'peer-user-1', text: 'Привет', createdAtISO: '2026-10-12T10:00:00.000Z' },
          { id: 'm2', authorId: 'me', text: 'Салют', createdAtISO: '2026-10-12T10:01:00.000Z' },
        ],
        readAtISO: '2026-10-12T10:05:00.000Z',
        muted: true,
        pinned: true,
        draft: 'черновик',
      },
    })
    assert.deepEqual(Object.keys(cleaned), ['peer-user-1'])
    assert.equal(cleaned['peer-user-1'].messages.length, 2)
    assert.equal(cleaned['peer-user-1'].muted, true)
    assert.equal(cleaned['peer-user-1'].pinned, true)
    assert.equal(cleaned['peer-user-1'].draft, 'черновик')
  })

  it('отбрасывает несуществующих друзей и пустые сообщения', () => {
    const cleaned = sanitizeChatThreads({
      'unknown-ghost': { messages: [{ id: 'x', authorId: 'me', text: 'нет такого друга' }] },
      'peer-user-2': {
        messages: [
          { id: 'empty', authorId: 'me', text: '   ' },
          { id: 'ok', authorId: 'me', text: 'живое', createdAtISO: '2026-10-12T10:00:00.000Z' },
        ],
      },
    })
    assert.deepEqual(Object.keys(cleaned), ['peer-user-2'])
    assert.equal(cleaned['peer-user-2'].messages.length, 1)
    assert.equal(cleaned['peer-user-2'].messages[0].text, 'живое')
  })

  it('возвращает фолбэк, когда во входе нет валидных данных', () => {
    const fallback: ChatThreads = { 'peer-user-1': thread() }
    assert.deepEqual(sanitizeChatThreads(null, fallback), fallback)
    assert.deepEqual(sanitizeChatThreads({ garbage: 1 }, fallback), fallback)
  })
})

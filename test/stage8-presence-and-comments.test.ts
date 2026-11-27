import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  formatLastSeenStatus,
  sortFriendsForWidget,
} from '../lib/ogonek/friends.ts'
import {
  buildCommentTree,
  canDeleteComment,
  COMMENT_QUICK_REACTIONS,
  countThreadReplies,
  filterRealComments,
  legacyTargetFromScoped,
  MAX_COMMENT_LENGTH,
  parsePostAuthorIdFromTarget,
  resolveReplyParentId,
  scopedDayCommentTarget,
  scopedPrideCommentTarget,
} from '../lib/ogonek/comments.ts'
import {
  POPULAR_EMOJIS,
  searchEmojis,
} from '../lib/ogonek/messenger.ts'
import type { Comment } from '../lib/ogonek/types.ts'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('Этап 8 — Честный Presence/last_seen_at + Топ-3 друзей + Переделка комментариев в стиле X.com', () => {
  it('1. formatLastSeenStatus честно форматирует онлайн, только что, сегодня, вчера и старые даты', () => {
    const base = new Date(2026, 10, 27, 15, 30, 0).getTime() // 27 ноября 2026, 15:30 локально

    // Сейчас в Presence -> в сети
    const online = formatLastSeenStatus(new Date(base - 3600_000).toISOString(), true, base)
    assert.equal(online.isOnline, true)
    assert.equal(online.label, 'в сети')
    assert.equal(online.shortLabel, 'онлайн')
    assert.equal(online.color, '#00ba7c')

    // < 60 сек -> только что
    const justNow = formatLastSeenStatus(new Date(base - 25_000).toISOString(), false, base)
    assert.equal(justNow.isOnline, false)
    assert.equal(justNow.label, 'был(а) только что')

    // Сегодня -> в HH:MM
    const earlierToday = formatLastSeenStatus(
      new Date(2026, 10, 27, 9, 5, 0).toISOString(),
      false,
      base
    )
    assert.equal(earlierToday.isOnline, false)
    assert.equal(earlierToday.label, 'был(а) в 09:05')

    // Вчера -> вчера в HH:MM
    const yesterday = formatLastSeenStatus(
      new Date(2026, 10, 26, 21, 14, 0).toISOString(),
      false,
      base
    )
    assert.equal(yesterday.label, 'был(а) вчера в 21:14')

    // Ранее -> D MMM.
    const older = formatLastSeenStatus(
      new Date(2026, 10, 24, 12, 0, 0).toISOString(),
      false,
      base
    )
    assert.equal(older.label, 'был(а) 24 нояб.')

    // Нет timestamp -> не в сети
    const neverSeen = formatLastSeenStatus(null, false, base)
    assert.equal(neverSeen.isOnline, false)
    assert.equal(neverSeen.label, 'не в сети')
  })

  it('2. sortFriendsForWidget: онлайн выше, далее свежий lastSeenAt, далее стрик, строго Топ-3', () => {
    const friends = [
      { id: 'u1', name: 'A', streak: 900, lastSeenAt: '2026-11-27T10:00:00Z' },
      { id: 'u2', name: 'B', streak: 5, lastSeenAt: '2026-11-27T12:00:00Z' }, // online
      { id: 'u3', name: 'C', streak: 300, lastSeenAt: '2026-11-27T14:00:00Z' },
      { id: 'u4', name: 'D', streak: 100, lastSeenAt: '2026-11-25T10:00:00Z' },
      { id: 'u5', name: 'E', streak: 50, lastSeenAt: '2026-11-27T13:30:00Z' },
    ]
    const onlineIds = new Set(['u2'])
    const top3 = sortFriendsForWidget(friends, onlineIds, undefined, 3)

    assert.equal(top3.length, 3)
    assert.deepEqual(
      top3.map((f) => f.id),
      ['u2', 'u3', 'u5']
    )
  })

  it('3. В UI нет захардкоженного фейкового presence: "online" или "2 в сети"', () => {
    const filesToCheck = [
      'components/ogonek/active-friends-widget.tsx',
      'components/ogonek/friend-detail-modal.tsx',
      'components/ogonek/friends/friends-modal.tsx',
      'components/ogonek/messenger/chat-avatar.tsx',
      'components/ogonek/messenger/messenger-chat-pane.tsx',
      'components/ogonek/messenger/chat-window.tsx',
      'components/ogonek/stories-bar.tsx',
      'components/ogonek/friends-manager.tsx',
      'components/ogonek/views/profile-view.tsx',
    ]

    for (const rel of filesToCheck) {
      const src = readRepoFile(rel)
      assert.equal(
        src.includes("presence: 'online'"),
        false,
        `${rel} не должен хардкодить presence: 'online'`
      )
      assert.equal(
        src.includes('2 в сети'),
        false,
        `${rel} не должен хардкодить "2 в сети"`
      )
    }

    const widgetSrc = readRepoFile('components/ogonek/active-friends-widget.tsx')
    assert.ok(widgetSrc.includes('sortFriendsForWidget'), 'Виджет использует sortFriendsForWidget')
    assert.match(widgetSrc, /sortFriendsForWidget\([\s\S]*?,\s*3\s*\)/, 'Виджет показывает максимум 3 друзей (Топ-3)')

    const presenceSrc = readRepoFile('lib/supabase/presence.ts')
    assert.ok(presenceSrc.includes('priday-presence'), 'Канал Presence подключён')
    assert.ok(presenceSrc.includes('visibilitychange'), 'Отслеживает visibilitychange')
    assert.ok(presenceSrc.includes('pagehide'), 'Отслеживает pagehide')
    assert.ok(presenceSrc.includes('beforeunload'), 'Отслеживает beforeunload')
    assert.ok(presenceSrc.includes('keepalive: true'), 'Обновляет last_seen_at через keepalive')

    const appShellSrc = readRepoFile('components/ogonek/app-shell.tsx')
    assert.ok(appShellSrc.includes('usePresenceTracker'), 'AppShell монтирует usePresenceTracker')
  })

  it('4. Права удаления и изоляция target_key по postAuthorId', () => {
    const postOwner = '11111111-1111-1111-1111-111111111111'
    const commenter = '22222222-2222-2222-2222-222222222222'
    const stranger = '33333333-3333-3333-3333-333333333333'

    const targetA = scopedDayCommentTarget(1, postOwner)
    const targetB = scopedDayCommentTarget(1, commenter)
    assert.notEqual(targetA, targetB, 'День #1 разных авторов не должен смешиваться')
    assert.equal(parsePostAuthorIdFromTarget(targetA), postOwner)
    assert.equal(legacyTargetFromScoped(targetA), 'day:1')
    assert.equal(
      scopedPrideCommentTarget(5, 2, postOwner),
      `u:${postOwner}:day:5:pride:2`
    )

    const foreignComment: Comment = {
      id: 'c-1',
      parentId: null,
      authorId: commenter,
      postAuthorId: postOwner,
      author: 'Elon',
      initials: 'EM',
      text: 'Крутой прогресс!',
      createdAt: '2026-11-27T10:00:00Z',
      likes: 0,
      likedByMe: false,
      isMine: false,
    }

    assert.equal(
      canDeleteComment(foreignComment, commenter, postOwner),
      true,
      'Автор комментария может удалять свой комментарий под чужим постом'
    )
    assert.equal(
      canDeleteComment(foreignComment, postOwner, postOwner),
      true,
      'Владелец поста может удалять чужой комментарий под своим постом'
    )
    assert.equal(
      canDeleteComment(foreignComment, stranger, postOwner),
      false,
      'Третий пользователь не может удалять чужой комментарий под чужим постом'
    )
  })

  it('5. filterRealComments и buildCommentTree очищают старые фейковые демо-комментарии', () => {
    const comments: Comment[] = [
      {
        id: 'fake-1',
        parentId: null,
        author: 'Priday поддержки',
        initials: '✦',
        text: 'Шаблонная поддержка',
        createdAt: '2026-11-27T08:00:00Z',
        likes: 1,
        likedByMe: false,
        isMine: false,
        template: 'Горжусь тобой!',
        persona: 'support',
      },
      {
        id: 'real-1',
        parentId: null,
        authorId: '11111111-1111-1111-1111-111111111111',
        author: 'Alexei',
        initials: 'АЦ',
        text: 'Реальный комментарий',
        createdAt: '2026-11-27T09:00:00Z',
        likes: 2,
        likedByMe: true,
        isMine: true,
      },
      {
        id: 'real-2',
        parentId: 'real-1',
        authorId: '22222222-2222-2222-2222-222222222222',
        author: 'Elon',
        initials: 'EM',
        text: '@cernavation поддерживаю',
        createdAt: '2026-11-27T09:05:00Z',
        likes: 0,
        likedByMe: false,
        isMine: false,
      },
    ]

    const cleaned = filterRealComments(comments)
    assert.equal(cleaned.length, 2)
    const tree = buildCommentTree(comments)
    assert.equal(tree.length, 1)
    assert.equal(tree[0].id, 'real-1')
    assert.equal(tree[0].replies.length, 1)
    assert.equal(tree[0].replies[0].id, 'real-2')
  })

  it('6. Переделка UI комментариев и SQL-миграция 134 соответствуют требованиям X.com + Supabase SSOT', () => {
    const threadSrc = readRepoFile('components/ogonek/comments-thread.tsx')
    assert.ok(!threadSrc.includes('Быстрая поддержка'), 'Удалена плашка "Быстрая поддержка"')
    assert.ok(!threadSrc.includes('renderPersonaSwitch'), 'Удалён переключатель "Я / Ты"')
    assert.ok(!threadSrc.includes('>Поддержать<'), 'Удалена промежуточная кнопка "Поддержать ^"')
    assert.ok(threadSrc.includes('bg-black'), 'Используется чисто-чёрный фон')
    assert.ok(threadSrc.includes('Написать комментарий...'), 'Понятный инпут в стиле X.com')
    assert.ok(threadSrc.includes('canDeleteComment'), 'Проверяются права удаления')

    const storeSrc = readRepoFile('lib/ogonek/use-ogonek-store.ts')
    assert.ok(!storeSrc.includes('buildDemoComments('), 'Стор больше не сеет фейковые демо-комментарии')
    assert.ok(storeSrc.includes('createCommentInDb'), 'Стор пишет комментарии в Supabase')
    assert.ok(storeSrc.includes('toggleCommentLikeInDb'), 'Стор сохраняет лайки в Supabase')
    assert.ok(storeSrc.includes('deleteCommentInDb'), 'Стор удаляет комментарии из Supabase')

    const sqlSrc = readRepoFile('supabase/migrations/134_presence_and_comments_v2.sql')
    assert.ok(sqlSrc.includes('last_seen_at timestamptz'), 'Миграция добавляет last_seen_at')
    assert.ok(sqlSrc.includes('gif_url text'), 'Миграция добавляет gif_url в public.comments')
    assert.ok(sqlSrc.includes('CREATE TABLE IF NOT EXISTS public.comment_likes'), 'Миграция создаёт comment_likes')
    assert.ok(sqlSrc.includes('CREATE TABLE IF NOT EXISTS public.comment_reactions'), 'Миграция создаёт comment_reactions')
    assert.ok(sqlSrc.includes('auth.uid() = post_author_id'), 'RLS позволяет владельцу поста удалять любые комментарии')
    assert.ok(sqlSrc.includes('REPLICA IDENTITY FULL'), 'Включён REPLICA IDENTITY FULL для Realtime delete')
    assert.ok(sqlSrc.includes("NOTIFY pgrst, 'reload schema'"), 'SQL завершается обновлением schema cache PostgREST')
  })

  it('7. Апгрейд комментариев: плоские 2 уровня, авторост инпута, превью GIF, реакции и шеринг', () => {
    assert.equal(MAX_COMMENT_LENGTH, 2000)
    assert.deepEqual([...COMMENT_QUICK_REACTIONS], ['🔥', '❤️', '😂', '👏', '💯', '😮'])

    // Проверяем 2-уровневое дерево и привязку любого ответа внутри ветки к корню (без 3-й лесенки)
    const lvl1: Comment = {
      id: 'c1',
      parentId: null,
      author: 'A',
      initials: 'A',
      text: 'Lvl 1',
      createdAt: '2026-11-27T10:00:00Z',
      likes: 0,
      likedByMe: false,
      isMine: true,
    }
    const lvl2: Comment = { ...lvl1, id: 'c2', parentId: 'c1', text: 'Lvl 2', createdAt: '2026-11-27T10:01:00Z' }
    const lvl3: Comment = { ...lvl1, id: 'c3', parentId: 'c2', text: 'Lvl 3', createdAt: '2026-11-27T10:02:00Z' }
    const lvl4Attempt: Comment = { ...lvl1, id: 'c4', parentId: 'c3', text: 'Should flatten to lvl 2', createdAt: '2026-11-27T10:03:00Z' }

    assert.equal(resolveReplyParentId(lvl1, 0), 'c1')
    assert.equal(resolveReplyParentId(lvl2, 1, 'c1'), 'c1', 'Ответ на 2-й уровень крепится к 1-му корню')
    assert.equal(resolveReplyParentId(lvl3, 1, 'c1'), 'c1', 'Глубокие ответы тоже крепятся к 1-му корню')

    const tree = buildCommentTree([lvl1, lvl2, lvl3, lvl4Attempt])
    assert.equal(tree.length, 1)
    assert.equal(countThreadReplies(tree[0]), 3)
    assert.equal(tree[0].replies.length, 3, 'Все ответы выровнены в один плоский 2-й уровень')
    assert.ok(tree[0].replies.every((r) => r.replies.length === 0), 'Нет 3-й лесенки вложенности')

    const threadSrc = readRepoFile('components/ogonek/comments-thread.tsx')
    assert.ok(threadSrc.includes('rounded-2xl'), 'Инпут использует rounded-2xl вместо узкой капсулы')
    assert.ok(threadSrc.includes('syncTextareaHeight'), 'Реализовано авторасширение textarea до 5 строк')
    assert.ok(threadSrc.includes('ChatEmojiPicker'), 'Подключён ChatEmojiPicker для смайликов')
    assert.ok(threadSrc.includes('selectedGifUrl'), 'GIF хранится в отдельном стейте без вставки URL в текст')
    assert.ok(threadSrc.includes('referrerPolicy="no-referrer"'), 'GIF рендерится с no-referrer')
    assert.ok(threadSrc.includes('/api/giphy?img='), 'Есть фолбэк через /api/giphy?img=')
    assert.ok(threadSrc.includes('Показать ответы'), 'Ветки сворачиваются кнопкой Показать ответы')
    assert.ok(threadSrc.includes('Ответ для '), 'Показывается понятная плашка режима ответа')
    assert.ok(threadSrc.includes('ForwardToChatModal'), 'Кнопка Поделиться интегрирована с модалкой пересылки')
    assert.ok(threadSrc.includes('toggleCommentLike'), 'Белое сердечко-лайк комментария сохраняется в сторе и БД')
    assert.ok(!threadSrc.includes('SmilePlus'), 'Кнопка добавления эмодзи-реакций под комментарием убрана')
    assert.ok(!threadSrc.includes('Загрузка комментариев...'), 'Удалена мигающая заглушка загрузки комментариев')

    const dayCardSrc = readRepoFile('components/ogonek/day-card.tsx')
    assert.ok(dayCardSrc.includes('mt-3 mb-3.5'), 'Под блоком фото добавлен гармоничный отступ до полосы действий')

    const apiSrc = readRepoFile('lib/supabase/api.ts')
    assert.ok(apiSrc.includes('client_id: clientId'), 'createCommentInDb всегда передаёт непустой client_id')
  })

  it('8. Полировка: иконки действий на 1 линии, белые сердца, кликабельные @mentions и двуязычный поиск эмодзи', () => {
    const threadSrc = readRepoFile('components/ogonek/comments-thread.tsx')
    assert.ok(threadSrc.includes('min-h-[28px]'), 'Панель действий выровнена по одной горизонтальной линии')
    assert.ok(threadSrc.includes('h-7 inline-flex items-center gap-1.5'), 'Кнопки панели действий одной высоты h-7')
    assert.ok(threadSrc.includes('title="Ответить"'), 'Кнопка ответа заменена на минималистичную иконку с title="Ответить"')
    assert.ok(!threadSrc.includes('<span>Ответить</span>'), 'Убрана текстовая подпись Ответить')
    assert.ok(threadSrc.includes('fill-white text-white'), 'Активное сердце лайка строго белое (fill-white text-white)')
    assert.ok(threadSrc.includes('text-white/45 hover:text-white/80'), 'Неактивное сердце нейтрального белого контура')
    assert.ok(!threadSrc.includes('#f91880'), 'В комментариях полностью удалён розовый цвет лайка #f91880')
    assert.ok(threadSrc.includes('renderCommentText'), 'Упоминания @username в комментариях кликабельны')
    assert.ok(threadSrc.includes('text-[#ff6b35] font-medium hover:underline'), 'Упоминания в комментариях выделены оранжевым акцентом')

    const cssSrc = readRepoFile('app/globals.css')
    assert.ok(!cssSrc.includes('.story-viewer__icon.is-active {\n  color: var(--pink);'), 'Лайк-сердце в story viewer больше не розовое')

    const bubbleSrc = readRepoFile('components/ogonek/messenger/chat-message-bubble.tsx')
    assert.ok(
      bubbleSrc.includes("text-white font-semibold underline decoration-white/60 hover:decoration-white"),
      'Упоминания в исходящих оранжевых пузырях чата высококонтрастные (белые)'
    )
    assert.ok(
      bubbleSrc.includes("text-[#ff7a45] font-medium hover:underline"),
      'Упоминания во входящих тёмных пузырях чата остаются оранжевыми'
    )

    const apiSrc = readRepoFile('lib/supabase/api.ts')
    assert.ok(apiSrc.includes('effectiveViewerId = sessionData.session.user.id'), 'fetchCommentsForTargets резолвит session.user.id для честного likedByMe после F5')
    assert.ok(apiSrc.includes('exactLiked'), 'toggleCommentLikeInDb пересчитывает точный count и liked из comment_likes')

    // Проверяем двуязычный поиск эмодзи (RU + EN) и вкладку Недавние
    assert.ok(searchEmojis('огонь', 'smileys', POPULAR_EMOJIS).includes('🔥'))
    assert.ok(searchEmojis('fire', 'smileys', POPULAR_EMOJIS).includes('🔥'))
    assert.ok(searchEmojis('огонек', 'smileys', POPULAR_EMOJIS).includes('🔥'))
    assert.ok(searchEmojis('сердце', 'smileys', POPULAR_EMOJIS).includes('❤️'))
    assert.ok(searchEmojis('heart', 'smileys', POPULAR_EMOJIS).includes('❤️'))
    assert.ok(searchEmojis('смех', 'smileys', POPULAR_EMOJIS).includes('😂'))
    assert.ok(searchEmojis('lol', 'smileys', POPULAR_EMOJIS).includes('😂'))
    assert.ok(searchEmojis('ракета', 'smileys', POPULAR_EMOJIS).includes('🚀'))
    assert.ok(searchEmojis('muscle', 'smileys', POPULAR_EMOJIS).includes('💪'))
    assert.deepEqual(searchEmojis('несуществующееслово12345', 'smileys', POPULAR_EMOJIS), [])
    assert.ok(searchEmojis('', 'recent', POPULAR_EMOJIS).length >= 9, 'Вкладка Недавние никогда не пустая')

    const pickerSrc = readRepoFile('components/ogonek/messenger/chat-emoji-picker.tsx')
    assert.ok(pickerSrc.includes('POPULAR_EMOJIS'), 'Популярные эмодзи добавлены в быстрый доступ')
    assert.ok(pickerSrc.includes('Ничего не найдено'), 'При пустом поиске отображается аккуратная заглушка')
  })
})

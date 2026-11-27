import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  buildDayAttachment,
  sanitizeChatAttachment,
} from '../lib/ogonek/messenger.ts'
import { extractDbGroupUuid } from '../lib/supabase/api.ts'
import { areDayCardPropsEqual } from '../lib/ogonek/feed-memo.ts'
import type { Day } from '../lib/ogonek/types.ts'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('Этап 9 — Публикация гордостей, приватность, ленты Друзья/Подписки, уведомления, авто-пост в группу и единая карточка в профиле', () => {
  it('1. DayOptionsModal: pure black X.com модалка с единым выбором «Кому видно», без дублей и без кнопки ИИ для оценённого дня', () => {
    const src = readRepoFile('components/ogonek/day-options-modal.tsx')

    // Единый чисто-чёрный стиль X.com
    assert.ok(src.includes('bg-black/85'), 'Backdrop должен быть чисто чёрным (bg-black/85)')
    assert.ok(src.includes('#060608'), 'Окно модалки должно использовать глубокий чёрный #060608')
    assert.ok(src.includes('max-w-lg'), 'Ограниченная ширина модалки max-w-lg')

    // Единый блок «Кому видно» и ровно 4 режима
    const labelMatches = src.match(/>Кому видно</g) || []
    assert.equal(labelMatches.length, 1, 'Заголовок «Кому видно» в разметке должен встречаться строго 1 раз (без дублей)')
    assert.ok(src.includes('Лично'))
    assert.ok(src.includes('Друзьям'))
    assert.ok(src.includes('Группе'))
    assert.ok(src.includes('Публично'))
    assert.ok(src.includes('Применить ко всем гордостям дня'))
    assert.ok(src.includes('Создать группу'))

    // Скрытие оценки ИИ когда день уже оценён
    assert.ok(src.includes('hasExistingEvaluation') && src.includes('{!hasExistingEvaluation && ('))

    // Нет гигантского превью фото внутри модалки
    assert.ok(!src.includes('day.photos.slice('), 'Не должно быть большого превью фото внутри модалки опций')
  })

  it('2. Хранилище и синхронизация: setPrideVisibility использует position, syncDayToSupabase сохраняет group_id, group-треды не падают в ЛС', () => {
    const storeSrc = readRepoFile('lib/ogonek/use-ogonek-store.ts')
    assert.ok(!storeSrc.includes('day:${dayId}:pride:${prideIdx}'), 'Не должно быть сломанного client_id формата day:N:pride:idx')
    assert.ok(storeSrc.includes(".eq('day_client_id', String(dayId))"), 'setPrideVisibility должен обновлять по day_client_id')
    assert.ok(storeSrc.includes('position.eq.'), 'setPrideVisibility должен обновлять по position')
    assert.ok(storeSrc.includes('group_id: dayGroupUuid'), 'syncDayToSupabase должен сохранять group_id')
    assert.ok(storeSrc.includes('target_group_ids: dayTargetGroups'), 'syncDayToSupabase должен сохранять target_group_ids')
    assert.ok(storeSrc.includes('publishDayToGroupChat'))
    assert.ok(storeSrc.includes('markFeedTabViewed'))
    assert.ok(storeSrc.includes('notifyFriendsOfPublishedDay'))

    // resolvePeerIdFromRecord должен сначала проверять thread_key group:/group-
    const groupIdx = storeSrc.indexOf("msg.thread_key.startsWith('group:')")
    const authorFallbackIdx = storeSrc.indexOf('let peerId = isMine ? msg.recipient_id || null : msg.author_id || null')
    assert.ok(groupIdx > 0 && authorFallbackIdx > groupIdx, 'Групповой thread_key должен определяться раньше author_id')

    // extractDbGroupUuid корректно достаёт UUID группы
    const gUuid = '11111111-2222-4333-8444-555555555555'
    assert.equal(extractDbGroupUuid(`group-${gUuid}`), gUuid)
    assert.equal(extractDbGroupUuid(`group:group-${gUuid}`), gUuid)
    assert.equal(extractDbGroupUuid('not-a-group-id'), null)
  })

  it('3. HomeView: вкладки Друзья/Подписки работают даже при days.length === 0, есть бейджи и подсветка дня из уведомления', () => {
    const homeSrc = readRepoFile('components/ogonek/views/home-view.tsx')

    // Дни = 0 не блокирует вкладки «Друзья» и «Подписки»
    assert.ok(
      homeSrc.includes("filter === 'Мои гордости' && filteredDays.length === 0") &&
        homeSrc.includes("filter === 'Друзья'") &&
        homeSrc.includes("filter === 'Подписки'"),
      'Условный рендер должен разделять вкладки до проверки пустых своих дней'
    )
    assert.ok(!homeSrc.includes('days.length === 0 ? (\n          <Card'), 'Общий days.length === 0 не должен перекрывать все вкладки')

    // Наличие 3 вкладок, бейджей непрочитанных и deep-link подсветки
    assert.ok(homeSrc.includes('Мои гордости'))
    assert.ok(homeSrc.includes('Друзья'))
    assert.ok(homeSrc.includes('Подписки'))
    assert.ok(homeSrc.includes('friendsUnread'))
    assert.ok(homeSrc.includes('followingUnread'))
    assert.ok(homeSrc.includes('markFeedTabViewed'))
    assert.ok(homeSrc.includes('highlightDay'))
    assert.ok(homeSrc.includes('scrollIntoView'))
  })

  it('4. API /api/friends/feed и /api/friends/notify-day не используют несуществующие колонки category/order_index и уважают приватность', () => {
    const feedApi = readRepoFile('app/api/friends/feed/route.ts')
    assert.ok(!feedApi.includes('.category'), 'В prides/gratitudes нет колонки category')
    assert.ok(!feedApi.includes('order_index'), 'В prides/gratitudes используется position, а не order_index')
    assert.ok(feedApi.includes("tab === 'following'"))
    assert.ok(feedApi.includes("searchParams.get('summary') === '1'"))
    assert.ok(feedApi.includes(".neq('visibility', 'private')"))
    assert.ok(feedApi.includes('last_viewed_friends_feed_at'))
    assert.ok(feedApi.includes('last_viewed_following_feed_at'))

    const notifyApi = readRepoFile('app/api/friends/notify-day/route.ts')
    assert.ok(notifyApi.includes("type: 'friend_day'"))
    assert.ok(notifyApi.includes('записал(а) гордости за День #'))
    assert.ok(notifyApi.includes("tab: 'friends'") && notifyApi.includes('dayNumber: dayId'))
  })

  it('5. Авто-пост дня в групповой чат и кнопка «Перейти к дню →» в вложении и уведомлениях', () => {
    const day: Day = {
      id: 42,
      userId: 'user-author-1',
      dateISO: '2026-11-27T12:00:00.000Z',
      title: 'День #42',
      tags: [],
      visibility: 'group',
      groupId: '11111111-2222-4333-8444-555555555555',
      groupName: 'Сильное окружение',
      prides: [
        { num: '01', text: 'Закрыл релиз без багов', scale: 9, overcome: 1, visibility: 'group' },
      ],
      gratitudes: [],
    }
    const built = buildDayAttachment(day, {
      name: 'Алексей',
      username: 'alex',
    })

    const clean = sanitizeChatAttachment(built)
    assert.ok(clean)
    assert.equal(clean.kind, 'day')
    assert.equal(clean.authorId, 'user-author-1')
    assert.equal(clean.groupName, 'Сильное окружение')
    assert.equal(clean.targetTab, 'friends')
    assert.equal(clean.actionLabel, 'Перейти к дню →')

    const cardSrc = readRepoFile('components/ogonek/messenger/chat-attachment-card.tsx')
    const modalSrc = readRepoFile('components/ogonek/messenger/chat-attachment-modal.tsx')
    assert.ok(cardSrc.includes('Перейти к дню →'))
    assert.ok(modalSrc.includes('Перейти к дню →'))
    assert.ok(cardSrc.includes('highlightDay:'))

    const notifSrc = readRepoFile('components/ogonek/notifications/notifications-popover.tsx')
    const toastSrc = readRepoFile('components/ogonek/notifications/desktop-toast-stack.tsx')
    const shellSrc = readRepoFile('components/ogonek/app-shell.tsx')
    assert.ok(notifSrc.includes('friend_day'))
    assert.ok(toastSrc.includes('friend_day'))
    assert.ok(shellSrc.includes("notif.type === 'friend_day'"))
  })

  it('6. Профиль использует единый <DayCard />, разделяет права владельца и зрителя (3 кнопки), без фейковых 752 заглушек', () => {
    const profileSrc = readRepoFile('components/ogonek/views/profile-view.tsx')
    assert.ok(profileSrc.includes("import { DayCard } from '../day-card'"))
    assert.ok(profileSrc.includes('<DayCard'))
    assert.ok(profileSrc.includes('isOwnerOverride={isOwnProfile}'))
    assert.ok(!profileSrc.includes("text: 'Скрытая гордость'"), 'В loadForeign не должно быть синтетических заглушек скрытых гордостей')
    assert.ok(profileSrc.includes('Все доступные ('))
    assert.ok(profileSrc.includes('Пока нет доступных записей'))

    const dayCardSrc = readRepoFile('components/ogonek/day-card.tsx')
    assert.ok(dayCardSrc.includes('isOwnerOverride'))
    assert.ok(dayCardSrc.includes('{isOwner && (') && dayCardSrc.includes('<BookmarkPlus'), 'Кнопка «В копилку» разрешена только владельцу')
    assert.ok(dayCardSrc.includes('{isOwner && (') && dayCardSrc.includes('MoreHorizontal'), 'Меню «...» разрешено только владельцу')
    assert.ok(dayCardSrc.includes("return eff !== 'private'"), 'Личные гордости отфильтровываются для зрителя')
    assert.ok(dayCardSrc.includes('data-day-number={day.id}'))

    const memoSrc = readRepoFile('lib/ogonek/feed-memo.ts')
    assert.ok(memoSrc.includes('prev.isHighlighted !== next.isHighlighted'))
    assert.ok(memoSrc.includes('prev.isOwnerOverride !== next.isOwnerOverride'))

    const sampleDay: Day = {
      id: 7,
      dateISO: '2026-11-27T10:00:00.000Z',
      title: 'День #7',
      tags: [],
      visibility: 'friends',
      prides: [{ num: '01', text: 'Сделал дело', scale: 9, overcome: 1, visibility: 'friends' }],
      gratitudes: [],
    }
    assert.equal(
      areDayCardPropsEqual(
        { day: sampleDay, isHighlighted: false, isOwnerOverride: false },
        { day: sampleDay, isHighlighted: true, isOwnerOverride: false }
      ),
      false
    )
    assert.equal(
      areDayCardPropsEqual(
        { day: sampleDay, isHighlighted: false, isOwnerOverride: false },
        { day: sampleDay, isHighlighted: false, isOwnerOverride: true }
      ),
      false
    )
  })

  it('7. SQL миграция 135 идемпотентна, включает строгий RLS, исправленный get_friend_feed_v1 и RELOAD SCHEMA', () => {
    const sql = readRepoFile('supabase/migrations/135_privacy_feeds_and_profile_cards.sql')
    assert.ok(sql.includes('last_viewed_friends_feed_at'))
    assert.ok(sql.includes('last_viewed_following_feed_at'))
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.are_mutual_friends'))
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.is_group_member'))
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.can_view_entry'))
    assert.ok(sql.includes('CREATE POLICY "days_select_policy"'))
    assert.ok(sql.includes('CREATE POLICY "prides_select_policy"'))
    assert.ok(sql.includes('CREATE POLICY "gratitudes_select_policy"'))
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.get_friend_feed_v1'))
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.get_following_feed_v1'))
    assert.ok(!sql.includes('pr.order_index') && !sql.includes('pr.category') && !sql.includes('gr.order_index') && !sql.includes('gr.category'), 'SQL запросы не должны ссылаться на несуществующие колонки category/order_index')
    assert.ok(sql.includes("NOTIFY pgrst, 'reload schema';"))
  })
})

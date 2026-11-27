import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { emptyThread, makeChatMessage, MY_CHAT_ID, totalUnread, unreadCount } from '../lib/ogonek/messenger.ts'
import { getNextStreakMilestone } from '../lib/ogonek/streak.ts'
import type { ChatThreadState } from '../lib/ogonek/types.ts'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('Friends & UI Stage: Unread Badge, RightRail, Friend Cards, FriendsModal, Blue VerifiedBadge', () => {
  it('1. Счётчик непрочитанных игнорирует прочитанные сообщения из Supabase и загружается в AppShell на Главной', () => {
    const dbThreadAfterF5: ChatThreadState = {
      ...emptyThread(),
      readAtISO: null,
      messages: [
        { ...makeChatMessage({ authorId: 'peer-elon', text: 'Old read msg' }), read: true },
        { ...makeChatMessage({ authorId: MY_CHAT_ID, text: 'My reply' }), read: true },
        { ...makeChatMessage({ authorId: 'peer-elon', text: 'New unread after F5' }), read: false },
      ],
    }

    assert.equal(unreadCount(dbThreadAfterF5), 1)
    assert.equal(totalUnread({ 'peer-elon': dbThreadAfterF5 }), 1)

    const shellSrc = readRepoFile('components/ogonek/app-shell.tsx')
    assert.ok(shellSrc.includes('loadChatThreadsFromCloud(myId)'), 'AppShell загружает треды сразу при старте')
    assert.ok(shellSrc.includes('getUnreadDirectMessageCountFromDb(myId)'), 'AppShell запрашивает unread через браузерный Supabase')
    assert.ok(shellSrc.includes('subscribeToDirectMessages('), 'AppShell подписывается глобально на INSERT/UPDATE/DELETE сообщений')

    const sidebarSrc = readRepoFile('components/ogonek/sidebar.tsx')
    assert.ok(sidebarSrc.includes("unread > 9 ? '9+' : String(unread)"), 'Sidebar форматирует 1, 2, 9+')
    assert.ok(sidebarSrc.includes('hidden xl:inline-flex items-center justify-center ml-auto'), 'В развёрнутом сайдбаре капсула справа от Чаты')

    const storeSrc = readRepoFile('lib/ogonek/use-ogonek-store.ts')
    assert.ok(storeSrc.includes('unreadChatCount: totalUnread(nextThreads)'), 'markThreadRead и Realtime синхронизируют unreadChatCount')
  })

  it('2. RightRail: отступы gap-4, умный sticky скролл и 2 реальных виджета без заглушек', () => {
    assert.deepEqual(getNextStreakMilestone(0), {
      target: 7,
      label: '0 / 7 · Первая неделя',
      percent: 0,
    })
    assert.equal(getNextStreakMilestone(752).label, '752 / 800 дней')
    assert.equal(getNextStreakMilestone(752).target, 800)

    const railSrc = readRepoFile('components/ogonek/right-rail.tsx')
    assert.ok(railSrc.includes('gap-4'), 'RightRail использует gap-4 между карточками')
    assert.ok(railSrc.includes('Ритм недели'), 'Есть виджет Ритм недели')
    assert.ok(railSrc.includes('Фокус и намерения'), 'Есть виджет Фокус и намерения')
    assert.ok(railSrc.includes('Задать фокус дня'), 'Есть CTA Задать фокус дня при отсутствии намерений')
    assert.ok(railSrc.includes('setStickyTop(rh > vh ? vh - rh : 0)'), 'Умный sticky-scroll считает offset от высоты колонки')

    const shellSrc = readRepoFile('components/ogonek/app-shell.tsx')
    const railTag = shellSrc.slice(shellSrc.indexOf('<RightRail'), shellSrc.indexOf('<RightRail') + 240)
    assert.ok(railTag.includes('lg:flex') && !railTag.includes('lg:block') && !railTag.includes('overflow-y-auto'), 'AppShell не ломает flex и не вешает внутренний скроллбар на RightRail')

    const cssSrc = readRepoFile('app/globals.css')
    assert.ok(!cssSrc.includes('height: 100vh !important;\n  max-height: 100vh !important;\n  overflow-y: auto !important;'), 'globals.css не блокирует умный sticky-scroll правой колонки')
  })

  it('3. FriendDetailModal: чистый редизайн без Позвать, дублей статуса и гигантских плиток', () => {
    const src = readRepoFile('components/ogonek/friend-detail-modal.tsx')
    assert.ok(src.includes('Написать'), 'Есть оранжевая кнопка Написать')
    assert.ok(src.includes('Открыть профиль'), 'Есть кнопка Открыть профиль')
    assert.ok(src.includes('Убрать из друзей') && src.includes('Заблокировать'), 'Есть меню ... с Убрать из друзей и Заблокировать')
    assert.ok(src.includes('VerifiedBadge'), 'Используется единый синий VerifiedBadge')
    assert.ok(!src.includes('Позвать'), 'Удалена кнопка Позвать')
    assert.ok(!src.includes('дней вместе') && !src.includes('friend-story-card'), 'Удалены гигантские градиентные плитки и фейковая метрика')
    assert.ok(!src.includes('Уже друзья'), 'Удалены 3 дублирующие кнопки статуса')
  })

  it('4. FriendsModal: 2 вкладки (Друзья / Группы), мгновенная загрузка, компактная высота', () => {
    const src = readRepoFile('components/ogonek/friends/friends-modal.tsx')
    assert.ok(src.includes('Друзья ({friends.length})'), 'Вкладка Друзья (N)')
    assert.ok(src.includes('friends-tab-groups'), 'Вкладка Группы')
    assert.ok(src.includes('Найти людей') && src.includes('Скопировать приглашение'), 'Компактная нижняя панель действий')
    assert.ok(src.includes('max-h-[75vh]'), 'Адаптивная компактная высота без пустой коробки')
    assert.ok(src.includes('syncSeededFriends'), 'Мгновенная гидрация списка без пустого чёрного экрана')
    assert.ok(!src.includes('Входящие заявки') && !src.includes("activeTab === 'following'"), 'Удалены лишние вкладки Заявки / Подписки / Поиск')
  })

  it('5. Единая синяя галочка VerifiedBadge (#1d9bf0) во всех местах, включая .account-menu__verified', () => {
    const badgeSrc = readRepoFile('components/ogonek/ui/verified-badge.tsx')
    assert.ok(badgeSrc.includes("backgroundColor: '#1d9bf0'"), 'VerifiedBadge фиксирует #1d9bf0 стилем и классом')

    const cssSrc = readRepoFile('app/globals.css')
    const accMenuBlock = cssSrc.slice(
      cssSrc.indexOf('.account-menu__verified'),
      cssSrc.indexOf('.account-menu__verified') + 90
    )
    assert.ok(accMenuBlock.includes('color: #1d9bf0;'), '.account-menu__verified окрашен строго в #1d9bf0')
  })
})

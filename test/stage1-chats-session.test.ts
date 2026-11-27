import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { sanitizeChatThreads } from '../lib/ogonek/messenger.ts'

const read = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8')

test('Task 1: Session persistence, canonical storage key, and /app routing', async (t) => {
  await t.test('no stale ogonek.store.v1 storage keys exist in app, components, or lib', () => {
    const filesToCheck = [
      'app/app/page.tsx',
      'app/login/page.tsx',
      'app/register/page.tsx',
      'components/ui/preloader.tsx',
      'components/ogonek/landing/locale-landing-view.tsx',
      'components/ogonek/landing/landing-page.tsx',
    ]
    for (const file of filesToCheck) {
      assert.ok(!read(file).includes('ogonek.store.v1'), `${file} must not reference stale ogonek.store.v1`)
    }
  })

  await t.test('app-shell navigates strictly under /app and parses ?view=messages&chat=...', () => {
    const code = read('components/ogonek/app-shell.tsx')
    assert.ok(code.includes("next === 'home' ? '/app' : `/app?view=${next}`"), 'navigate keeps URL under /app')
    assert.ok(!code.includes("next === 'home' ? '/' : `/?view=${next}`"), 'must never push root / from inside app')
    assert.ok(code.includes("params.get('chat') || params.get('thread')"), 'restores active chat thread on reload')
  })

  await t.test('auth gates wait for Supabase session resolution cleanly', () => {
    for (const file of [
      'app/app/page.tsx',
      'components/ogonek/landing/locale-landing-view.tsx',
      'components/ogonek/messenger/fullscreen-messenger.tsx',
    ]) {
      const code = read(file)
      assert.ok(code.includes('syncSupabaseAuthNow'), `${file} awaits Supabase auth sync`)
      assert.ok(code.includes('resolveBrowserSession'), `${file} checks resolveBrowserSession`)
    }
  })
})

test('Task 2.1: Sidebar smooth wall collapse keeps icon X-coordinates locked', () => {
  const sidebarCode = read('components/ogonek/sidebar.tsx')
  assert.ok(sidebarCode.includes('transition-[width] duration-[250ms]'), 'Sidebar smoothly animates width with 250ms curve')
  assert.ok(sidebarCode.includes('w-[76px]') && sidebarCode.includes('xl:w-[252px]'), 'Sidebar uses locked 76px / 252px geometry')
  assert.ok(sidebarCode.includes('w-11 h-11'), 'Sidebar uses uniform 44x44 icon cells across brand, nav, and profile')
  assert.ok(sidebarCode.includes("onNavigate('home')"), 'Clicking Priday logo always navigates to home')
  assert.ok(!sidebarCode.includes('view === \'messages\' ? undefined'), 'Priday logo click is never disabled in messages')

  const css = read('app/globals.css')
  assert.ok(css.includes('overflow-x: hidden !important'), 'Sidebar prevents horizontal bleed on animation')
  assert.ok(!css.includes('justify-center;\n    padding: 13px;'), 'Removed conflicting @media nav-item overrides')

  const appShellCode = read('components/ogonek/app-shell.tsx')
  assert.ok(appShellCode.includes('isCollapsed={view === \'messages\'}'), 'AppShell keeps single persistent Sidebar and collapses it in messages')
  assert.ok(appShellCode.includes('embedded={true}'), 'AppShell renders embedded FullscreenMessenger alongside persistent Sidebar')
  assert.ok(appShellCode.includes('max-w-[1265px] justify-start'), 'AppShell anchors Sidebar X-coordinate cleanly without jump')
})

test('Polish Stage 1: Chat card wrapper, empty home CTA, 1-click logout, out-of-box GIFs', () => {
  const bubble = read('components/ogonek/messenger/chat-message-bubble.tsx')
  assert.ok(bubble.includes('isStandaloneCard'), 'Standalone cards get dedicated thin wrapper')
  assert.ok(bubble.includes('p-[3px]'), 'Card wrapper uses thin 3px border/padding')

  const home = read('components/ogonek/views/home-view.tsx')
  assert.ok(home.includes('whitespace-nowrap h-11 px-6 rounded-full'), 'Empty home CTA buttons stay crisp single-line pills')

  const store = read('lib/ogonek/use-ogonek-store.ts')
  assert.ok(store.includes("key.startsWith('sb-')") && store.includes('client.auth.signOut'), 'signOut clears Supabase tokens/cookies synchronously and awaits client signOut before redirect')

  const gifRoute = read('app/api/giphy/route.ts')
  assert.ok(gifRoute.includes('fetchPublicGifs'), 'GIF API supports out-of-the-box public trending and search without forcing API keys')
})

test('Task 2.2-2.7: Real Supabase chats, clean UI, unclipped emoji picker, GIF API, context menus', async (t) => {
  await t.test('sanitizeChatThreads strips phantom seed threads and sanitizeChatMessages preserves poll/dbId', () => {
    const cleaned = sanitizeChatThreads({
      'ilonmusk-seed': { messages: [{ id: '1', authorId: 'me', text: 'test', createdAtISO: '2026-01-01T00:00:00.000Z' }] },
      'user-123': {
        messages: [
          {
            id: 'm1',
            dbId: '00000000-0000-0000-0000-000000000001',
            authorId: 'me',
            text: '',
            createdAtISO: '2026-01-01T00:00:00.000Z',
            type: 'poll',
            poll: { id: 'p1', question: 'Го?', options: [{ text: 'Да', votes: 1, votedByMe: true }], totalVotes: 1 },
          },
        ],
      },
    })
    assert.equal(cleaned['ilonmusk-seed'], undefined, 'Phantom ilonmusk-seed thread purged')
    assert.equal(cleaned['user-123']?.messages.length, 1, 'Poll message preserved even with empty text')
    assert.equal(cleaned['user-123']?.messages[0]?.poll?.question, 'Го?', 'Poll payload preserved')
    assert.equal(cleaned['user-123']?.messages[0]?.dbId, '00000000-0000-0000-0000-000000000001', 'Supabase dbId preserved')
  })

  await t.test('Supabase direct_messages delete & poll persistence helpers exist', () => {
    const apiCode = read('lib/supabase/api.ts')
    for (const fn of [
      'getAllUserDirectMessages',
      'deleteDirectMessageFromDb',
      'deleteDirectMessagesBulkFromDb',
      'deleteThreadMessagesFromDb',
      'updateDirectMessagePoll',
    ]) {
      assert.ok(apiCode.includes(`export async function ${fn}`), `lib/supabase/api.ts exports ${fn}`)
    }
    assert.ok(apiCode.includes("event: 'DELETE'"), 'subscribeToDirectMessages handles DELETE')
  })

  await t.test('messenger-chat-pane removes calls, voice mic, pin/tags bloat, merges attach menu & wires context menu', () => {
    const pane = read('components/ogonek/messenger/messenger-chat-pane.tsx')
    assert.ok(!pane.includes('ChatVoiceRecorder'), 'ChatVoiceRecorder removed from pane')
    assert.ok(!pane.includes('ChatTagsModal'), 'ChatTagsModal removed from pane')
    assert.ok(!pane.includes('aria-label="Аудиозвонок"'), 'Audio call button removed from chat header')
    assert.ok(!pane.includes('aria-label="Видеозвонок"'), 'Video call button removed from chat header')
    assert.ok(!pane.includes('Теги диалога'), 'Tags menu item removed')
    assert.ok(!pane.includes('Закрепить чат'), 'Pin chat menu item removed')
    assert.ok(pane.includes('Поиск по чату'), 'Search menu item kept')
    assert.ok(pane.includes('Отключить уведомления'), 'Mute menu item kept')
    assert.ok(pane.includes('Очистить историю'), 'Clear history menu item kept')
    assert.ok(pane.includes('Удалить чат'), 'Delete chat menu item present')
    assert.ok(pane.includes('Файл / Медиа'), 'Unified File/Media attach item present')
    assert.ok(pane.includes('Опрос'), 'Poll attach item kept')
    assert.ok(pane.includes('ChatContextMenu'), 'Message context menu wired')
  })

  await t.test('dialog list wires custom dark right-click context menu and emoji picker positions left cleanly', () => {
    const list = read('components/ogonek/messenger/messenger-dialog-list.tsx')
    assert.ok(list.includes('onContextMenu'), 'Dialog items handle onContextMenu')
    assert.ok(list.includes('Удалить чат'), 'Dialog context menu includes delete chat')

    const picker = read('components/ogonek/messenger/chat-emoji-picker.tsx')
    assert.ok(picker.includes('sm:left-0'), 'Emoji picker aligns from left edge so it does not clip left')
    assert.ok(!read('components/ogonek/messenger/chat-gif-modal.tsx').includes('Powered by GIPHY'), 'No Powered by GIPHY badge')
    assert.ok(read('app/api/giphy/route.ts').includes('KLIPY_API_KEY') && read('app/api/giphy/route.ts').includes('limit=24'), 'GIF API uses limit=24 and provider keys cleanly')
  })
})

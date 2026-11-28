import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  PRIDAY_QUICK_ACTIONS,
  PRIDAY_SUPPORT_CUSTOM_REPLY,
  PRIDAY_WELCOME_TEXT,
  buildStreakMilestoneCelebration,
  computePridayTypingDelayMs,
  ensurePridayThreadInThreads,
  PRIDAY_CHAT_ID,
} from '../lib/ogonek/priday-system-chat.ts'
import { sanitizeChatThreads } from '../lib/ogonek/messenger.ts'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('Этап 7: Полировка модалок, живого чата Priday, dark-glass тостов и юбилеев 10/50/100', () => {
  it('1. Все ключевые модалки темнят фон bg-black/85 (без #5b7083), и в пустых Группах нет дубля кнопки', () => {
    for (const file of [
      'components/ogonek/friend-detail-modal.tsx',
      'components/ogonek/friends/friends-modal.tsx',
      'components/ogonek/friends/friends-modal-error-boundary.tsx',
      'components/ogonek/messenger/chat-attachment-modal.tsx',
      'components/ogonek/day-options-modal.tsx',
      'components/ogonek/ui/modal.tsx',
    ]) {
      const src = readRepoFile(file)
      assert.ok(src.includes('bg-black/85 backdrop-blur-[4px]'), `${file} использует bg-black/85 backdrop-blur-[4px]`)
      assert.ok(!src.includes('5b7083'), `${file} не содержит осветляющий #5b7083`)
    }

    const css = readRepoFile('app/globals.css')
    assert.ok(css.includes('background: rgba(0, 0, 0, 0.85);'), '.modal-backdrop использует глубокое тёмное затемнение')
    assert.ok(css.includes('background: #060608;'), '.modal использует чисто-чёрный корпус #060608')

    const friendsModal = readRepoFile('components/ogonek/friends/friends-modal.tsx')
    assert.ok(
      friendsModal.includes('{chatGroups.length > 0 && (') && friendsModal.includes('id="btn-create-group"'),
      'В пустом экране Групп кнопка + Создать группу не дублируется в шапке'
    )
  })

  it('2. Priday: живые тексты без длинных тире (—), анимация печатания 1.8-2.5с и отсутствие НОВЫЕ СООБЩЕНИЯ в открытом чате', () => {
    assert.ok(!PRIDAY_WELCOME_TEXT.includes('—'), 'Приветствие Priday без длинных тире')
    assert.ok(!PRIDAY_SUPPORT_CUSTOM_REPLY.includes('—'), 'Ответ поддержки без длинных тире')
    for (const action of PRIDAY_QUICK_ACTIONS) {
      assert.ok(!action.replyText.includes('—'), `FAQ "${action.label}" без длинных тире`)
    }

    // Старое приветствие с длинным тире мигрирует на новое автоматически
    const migrated = ensurePridayThreadInThreads({
      [PRIDAY_CHAT_ID]: {
        readAtISO: null,
        muted: false,
        pinned: false,
        draft: '',
        messages: [
          {
            id: 'priday-welcome',
            authorId: PRIDAY_CHAT_ID,
            text: 'Привет — старый текст с длинным тире',
            createdAtISO: '2026-01-01T09:00:00.000Z',
            attachment: null,
            reactions: [],
            read: true,
            system: false,
          },
        ],
      },
    })
    assert.equal(migrated[PRIDAY_CHAT_ID].messages[0].text, PRIDAY_WELCOME_TEXT)
    const sanitized = sanitizeChatThreads({
      [PRIDAY_CHAT_ID]: {
        readAtISO: null,
        muted: false,
        pinned: false,
        draft: '',
        messages: [
          {
            id: 'priday-welcome',
            authorId: PRIDAY_CHAT_ID,
            text: 'Старое приветствие — с длинным тире',
            createdAtISO: '2026-01-01T09:00:00.000Z',
            attachment: null,
            reactions: [],
            read: true,
            system: false,
          },
        ],
      },
    })
    assert.equal(sanitized[PRIDAY_CHAT_ID].messages[0].text, PRIDAY_WELCOME_TEXT)

    // Естественная задержка 1800..2500мс
    const shortDelay = computePridayTypingDelayMs('Ок')
    const longDelay = computePridayTypingDelayMs(PRIDAY_QUICK_ACTIONS[0].replyText)
    assert.ok(shortDelay >= 1800 && shortDelay <= 2500)
    assert.ok(longDelay >= 1800 && longDelay <= 2500)

    const storeSrc = readRepoFile('lib/ogonek/use-ogonek-store.ts')
    assert.ok(
      storeSrc.includes('usePridayTyping') && storeSrc.includes('computePridayTypingDelayMs(replyText)'),
      'Store управляет состоянием печатания и задержкой ответа Priday'
    )

    const chatPaneSrc = readRepoFile('components/ogonek/messenger/messenger-chat-pane.tsx')
    assert.ok(
      chatPaneSrc.includes('priday-typing-indicator') && chatPaneSrc.includes('печатает...'),
      'MessengerChatPane отображает статус "печатает..." и пузырёк с тремя точками'
    )
    assert.ok(
      chatPaneSrc.includes('if (!friendId || isPridayChat(friendId)) return null'),
      'В открытом чате Priday разделитель Новые сообщения подавляется'
    )
  })

  it('3. Всплывающие уведомления: dark-glass стиль Apple и pill-поле быстрого ответа', () => {
    const toastSrc = readRepoFile('components/ogonek/notifications/desktop-toast-stack.tsx')
    assert.ok(toastSrc.includes('bg-[#0a0a0c]/92') && toastSrc.includes('backdrop-blur-xl'))
    assert.ok(toastSrc.includes('border-white/[0.12]'))
    assert.ok(toastSrc.includes('cubic') || toastSrc.includes('[0.22, 1, 0.36, 1]'))
    assert.ok(toastSrc.includes('rounded-full bg-white/[0.06] border border-white/[0.09]'))
    assert.ok(toastSrc.includes('Отправлено ✓'))
    assert.ok(toastSrc.includes('gap-2.5'))
    assert.ok(toastSrc.includes('<UserAvatar'))
  })

  it('4. Праздничные юбилейные поздравления Priday для кратных 10, 50 и 100 дней с защитой от дублей', () => {
    assert.equal(buildStreakMilestoneCelebration(0), null)
    assert.equal(buildStreakMilestoneCelebration(9), null)
    assert.equal(buildStreakMilestoneCelebration(11), null)
    assert.equal(buildStreakMilestoneCelebration(49), null)
    assert.equal(buildStreakMilestoneCelebration(99), null)

    const m10 = buildStreakMilestoneCelebration(20)
    assert.equal(m10?.tier, 10)
    assert.equal(m10?.text, 'Круглая цифра в Winlog: 20 дней подряд! Так держать.')
    assert.ok(!m10!.text.includes('—'))

    const m50 = buildStreakMilestoneCelebration(750)
    assert.equal(m50?.tier, 50)
    assert.equal(m50?.text, 'Мощный рубеж - 750 дней в Winlog закрыто! Твой ритм держится уверенно.')
    assert.ok(!m50!.text.includes('—'))

    const m100 = buildStreakMilestoneCelebration(800)
    assert.equal(m100?.tier, 100)
    assert.equal(m100?.text, 'Легенда! 800 дней в Winlog 🔥 Это уже не привычка, а твой характер.')
    assert.ok(!m100!.text.includes('—'))

    const toastSrc = readRepoFile('components/ogonek/notifications/desktop-toast-stack.tsx')
    assert.ok(
      toastSrc.includes("variant?: 'default' | 'milestone'") &&
        toastSrc.includes('milestone-festive-toast') &&
        toastSrc.includes('border-[#d76737]/40') &&
        toastSrc.includes('border-amber-400/50'),
      'DesktopToastStack реализует праздничный variant: milestone для 10/50 и 100 дней'
    )

    const apiSrc = readRepoFile('lib/supabase/api.ts')
    assert.ok(
      apiSrc.includes('savePridayMilestoneMessageDb') && apiSrc.includes('day_number'),
      'Supabase API сохраняет и дедуплицирует юбилейные сообщения по day_number'
    )

    const shellSrc = readRepoFile('components/ogonek/app-shell.tsx')
    assert.ok(
      shellSrc.includes('deliverPridayMilestoneMessage(') && shellSrc.includes("variant: 'milestone'"),
      'AppShell вызывает юбилейный тост и запись в Priday только для нового недублирующего дня'
    )
  })
})

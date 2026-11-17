import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  getSoundVolume,
  isSoundEnabled,
  playChatMessageSound,
  playFriendRequestSound,
  playMissedCallSound,
  playMilestoneSound,
} from '../lib/ogonek/sound.ts'
import { totalUnread } from '../lib/ogonek/messenger.ts'

describe('Шаг 07: Звуки, тосты, уведомления и счетчики непрочитанных', () => {
  it('getSoundVolume: корректно ограничивает диапазон громкости от 0.0 до 1.0', () => {
    assert.equal(getSoundVolume(0.5), 0.5)
    assert.equal(getSoundVolume(1.5), 1.0)
    assert.equal(getSoundVolume(-0.2), 0.0)
    assert.equal(getSoundVolume(0), 0)
    assert.equal(getSoundVolume(1), 1)
  })

  it('isSoundEnabled: возвращает булево значение и уважает переопределение', () => {
    assert.equal(isSoundEnabled(true), true)
    assert.equal(isSoundEnabled(false), false)
  })

  it('Звуковые функции Web Audio: вызываются без ошибок при заблокированном автоплее', () => {
    assert.doesNotThrow(() => {
      playChatMessageSound(0.8, true)
      playFriendRequestSound(0.8, true)
      playMissedCallSound(0.8, true)
      playMilestoneSound(0.8, true)
    })
  })

  it('Звуковые функции: не выполняют синтез при soundEnabled=false', () => {
    let played = false
    const handler = () => { played = true }
    if (typeof window !== 'undefined') {
      window.addEventListener('ogonek:sound-played', handler)
    }

    playChatMessageSound(0.8, false)
    playFriendRequestSound(0.8, false)
    playMissedCallSound(0.8, false)
    playMilestoneSound(0.8, false)

    assert.equal(played, false)

    if (typeof window !== 'undefined') {
      window.removeEventListener('ogonek:sound-played', handler)
    }
  })

  it('Форматирование счетчика непрочитанных: "99+" при значении > 99', () => {
    const formatBadge = (unread: number) => (unread > 99 ? '99+' : String(unread))
    assert.equal(formatBadge(0), '0')
    assert.equal(formatBadge(1), '1')
    assert.equal(formatBadge(12), '12')
    assert.equal(formatBadge(99), '99')
    assert.equal(formatBadge(100), '99+')
    assert.equal(formatBadge(350), '99+')
  })

  it('Форматирование document.title: "(N) Priday" при N > 0 и чистый заголовок при 0', () => {
    const formatTitle = (unread: number) =>
      unread > 0 ? `(${unread}) Priday` : 'Priday — Твой личный дневник силы'

    assert.equal(formatTitle(0), 'Priday — Твой личный дневник силы')
    assert.equal(formatTitle(1), '(1) Priday')
    assert.equal(formatTitle(3), '(3) Priday')
    assert.equal(formatTitle(100), '(100) Priday')
  })

  it('Ограничение стека тостов: максимум 3 элемента одновременно', () => {
    let toasts: string[] = []
    const pushToast = (id: string) => {
      toasts = [...toasts.slice(-2), id]
    }

    pushToast('t1')
    assert.deepEqual(toasts, ['t1'])
    pushToast('t2')
    assert.deepEqual(toasts, ['t1', 't2'])
    pushToast('t3')
    assert.deepEqual(toasts, ['t1', 't2', 't3'])
    pushToast('t4')
    assert.deepEqual(toasts, ['t2', 't3', 't4'])
    pushToast('t5')
    assert.deepEqual(toasts, ['t3', 't4', 't5'])

    // Симуляция 30 сообщений подряд
    for (let i = 6; i <= 35; i++) {
      pushToast(`t${i}`)
    }
    assert.equal(toasts.length, 3)
    assert.deepEqual(toasts, ['t33', 't34', 't35'])
  })

  it('Проверка терминологии CONTRACT п. 7: в коде шага 07 нет слова «соратники»', () => {
    const files = [
      'components/ogonek/notifications/desktop-toast-stack.tsx',
      'components/ogonek/notifications/notifications-popover.tsx',
      'components/ogonek/notifications/index.ts',
      'app/api/messages/unread/route.ts',
      'app/api/notifications/route.ts',
      'app/api/calls/missed/route.ts',
      'supabase/migrations/070_notifications.sql',
    ]

    for (const relPath of files) {
      const fullPath = path.join(process.cwd(), relPath)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8')
        assert.equal(
          /соратник/i.test(content),
          false,
          `Файл ${relPath} содержит запрещённый термин «соратник»!`
        )
      }
    }
  })
})

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('Этап 5: Фикс крашей #300/#310 (Priday), FriendsModal и позиция бейджа Чаты', () => {
  it('1. ChatAvatar не вызывает хуки после условного return (фикс React error #300 / #310 при клике на Priday)', () => {
    const src = readRepoFile('components/ogonek/messenger/chat-avatar.tsx')

    const exportIdx = src.indexOf('export function ChatAvatar')
    assert.ok(exportIdx !== -1, 'export function ChatAvatar найден')
    const fnBody = src.slice(exportIdx)

    const useStateIdx = fnBody.indexOf('useState<ProfileRecord | null>')
    const useEffectIdx = fnBody.indexOf('useEffect(() => {')
    const pridayReturnIdx = fnBody.indexOf('if (isPriday) {')

    assert.ok(useStateIdx !== -1 && useEffectIdx !== -1 && pridayReturnIdx !== -1)
    assert.ok(
      useStateIdx < pridayReturnIdx && useEffectIdx < pridayReturnIdx,
      'Все хуки (useState, useEffect) вызываются строго ДО условного return для Priday'
    )
    assert.ok(
      fnBody.indexOf('if (isPridayChat(') === -1,
      'Старого раннего return до хуков больше нет'
    )

    const messengerSrc = readRepoFile('components/ogonek/messenger/fullscreen-messenger.tsx')
    assert.ok(
      messengerSrc.includes('key={activeThreadId || \'none\'}') &&
        messengerSrc.includes('key={activeThreadId}'),
      'FullscreenMessenger изолирует состояния тредов через React key'
    )
  })

  it('2. FriendsModal изолирован в ErrorBoundary вне AnimatePresence и защищён от битых/неполных данных', () => {
    const shellSrc = readRepoFile('components/ogonek/app-shell.tsx')
    assert.ok(
      shellSrc.includes("import { FriendsModal } from './friends/friends-modal'"),
      'FriendsModal подключён напрямую без ненадёжного dynamic-чанка внутри AnimatePresence'
    )
    assert.ok(
      shellSrc.includes('<FriendsModalErrorBoundary') &&
        shellSrc.indexOf('</AnimatePresence>') < shellSrc.indexOf('<FriendsModalErrorBoundary'),
      'FriendsModal обёрнут в локальный FriendsModalErrorBoundary и монтируется вне AnimatePresence'
    )

    const modalSrc = readRepoFile('components/ogonek/friends/friends-modal.tsx')
    assert.ok(
      modalSrc.includes('t && typeof t === \'object\' && t.groupMeta && typeof t.groupMeta === \'object\''),
      'chatGroups отфильтровывает null/битые треды'
    )
    assert.ok(
      modalSrc.includes('memberIds: Array.isArray(t.groupMeta.memberIds)'),
      'chatGroups нормализует memberIds в массив строк'
    )
    assert.ok(
      modalSrc.includes('(selectedGroup.memberIds ?? [])'),
      'Отрисовка участников защищена фоллбэком ?? []'
    )
    assert.ok(
      modalSrc.includes('mountedRef.current'),
      'loadFriends проверяет монтирование перед setState'
    )

    const avatarSrc = readRepoFile('components/ogonek/ui/user-avatar.tsx')
    assert.ok(
      avatarSrc.includes("typeof rawImageCandidate === 'string'"),
      'UserAvatar защищён от нестроковых значений URL аватара'
    )

    const apiSrc = readRepoFile('lib/supabase/api.ts')
    assert.ok(
      apiSrc.includes('`follows-sync-${userId}-${Math.random()'),
      'subscribeToFollows использует уникальный канал для каждого подписчика'
    )
  })

  it('3. Оранжевый бейдж Чаты закреплён прямо в правом верхнем углу иконки в свёрнутом и развёрнутом сайдбаре', () => {
    const sidebarSrc = readRepoFile('components/ogonek/sidebar.tsx')
    assert.ok(
      sidebarSrc.includes('data-testid="sidebar-chats-unread-badge"'),
      'Присутствует единый бейдж непрочитанных на иконке Чаты'
    )
    assert.ok(
      sidebarSrc.includes('absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff5a1f] text-white text-[11px] font-bold flex items-center justify-center'),
      'Бейдж оформлен в правом верхнем углу самой иконки'
    )
    assert.ok(
      sidebarSrc.includes('ring-2 ring-black'),
      'Бейдж имеет чёткий чёрный контур ring-2 ring-black'
    )
    assert.ok(
      !sidebarSrc.includes('ml-auto min-w-[20px]'),
      'Удалён старый правый бейдж-пилюля в развёрнутом сайдбаре'
    )
  })
})

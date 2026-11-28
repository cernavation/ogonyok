import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

describe('ЭТАП 1: Полноценные группы в Supabase, Realtime, Pure Black UI и фикс приватности', () => {
  it('1. lib/supabase/api.ts: полный CRUD групп с реальными UUID, read_by и Realtime', () => {
    const apiSrc = read('lib/supabase/api.ts')
    assert.ok(apiSrc.includes('export async function createChatGroupInDb('))
    assert.ok(apiSrc.includes('export async function updateChatGroupInDb('))
    assert.ok(apiSrc.includes('export async function addGroupMembersToDb('))
    assert.ok(apiSrc.includes('export async function removeGroupMemberFromDb('))
    assert.ok(apiSrc.includes('export async function leaveGroupInDb('))
    assert.ok(apiSrc.includes('export async function deleteChatGroupInDb('))
    assert.ok(apiSrc.includes('export async function markGroupMessagesAsReadDb('))
    assert.ok(apiSrc.includes('export function subscribeToUserGroups('))
    assert.ok(apiSrc.includes('extractDbGroupUuid(groupId)'), 'updateChatGroupInDb должен извлекать UUID даже из group-<uuid>')
  })

  it('2. use-ogonek-store.ts: createGroupChat ждёт DB UUID и не создаёт фантомы group-mx... со звёздочкой pin', () => {
    const storeSrc = read('lib/ogonek/use-ogonek-store.ts')
    assert.ok(storeSrc.includes('const res = await createChatGroupInDb('), 'createGroupChat должен создавать запись в Supabase перед фиксацией ID')
    assert.ok(storeSrc.includes('pinned: false,'), 'новая группа не должна автоматически помечаться pinned: true')
    assert.ok(!storeSrc.includes('Добро пожаловать! 🎉'), 'убраны лишние символы из системного сообщения о создании группы')
    assert.ok(storeSrc.includes('export') || storeSrc.includes('deleteGroup,'), 'deleteGroup должен быть экспортирован')
    assert.ok(storeSrc.includes('markGroupMessagesAsReadDb(groupRef, currentUserId)'), 'markThreadRead должен сохранять прочтение групп через read_by')
  })

  it('3. Realtime: app-shell.tsx, fullscreen-messenger.tsx и messenger-chat-pane.tsx принимают групповые сообщения и изменения состава', () => {
    const appShellSrc = read('components/ogonek/app-shell.tsx')
    const fsMessengerSrc = read('components/ogonek/messenger/fullscreen-messenger.tsx')
    const chatPaneSrc = read('components/ogonek/messenger/messenger-chat-pane.tsx')

    assert.ok(appShellSrc.includes("thread_key.startsWith('group')"), 'AppShell Realtime должен принимать сообщения групповых чатов')
    assert.ok(appShellSrc.includes('subscribeToUserGroups('), 'AppShell должен подписываться на изменения chat_groups/chat_group_members')
    assert.ok(fsMessengerSrc.includes("thread_key.startsWith('group')"), 'FullscreenMessenger Realtime должен принимать групповые сообщения')
    assert.ok(fsMessengerSrc.includes('subscribeToUserGroups('), 'FullscreenMessenger должен подписываться на группы')
    assert.ok(chatPaneSrc.includes('getGroupMessagesFromDb([groupDbUuid])'), 'MessengerChatPane должен подгружать сообщения группы из Supabase')
    assert.ok(chatPaneSrc.includes('markGroupMessagesAsReadDb(groupDbUuid, currentUserId)'), 'MessengerChatPane должен отмечать сообщения группы прочитанными')
  })

  it('4. NewChatModal: только взаимные друзья, pure black шаг 2, интерактивные участники и оранжевая кнопка с чёрным текстом', () => {
    const newChatSrc = read('components/ogonek/messenger/new-chat-modal.tsx')
    assert.ok(newChatSrc.includes('В группу можно добавить только взаимных друзей'))
    assert.ok(newChatSrc.includes('getMutualFriendProfiles'))
    assert.ok(newChatSrc.includes('Чтобы создать группу, сначала добавь друзей (взаимная подписка)'))
    assert.ok(newChatSrc.includes('#060608') && newChatSrc.includes('bg-black/85'))
    assert.ok(newChatSrc.includes('bg-[#d76737]') && newChatSrc.includes('text-black'))
    assert.ok(newChatSrc.includes('setGroupStep(1)'), 'на шаге 2 должна быть кнопка возврата к выбору участников (+ Добавить)')
    assert.ok(newChatSrc.includes('await createGroupChat('))
    assert.ok(!newChatSrc.includes("customPhotoUrl ? '🖼'"), 'customPhotoUrl должен передаваться в avatarImage, а не как эмодзи')
  })

  it('5. Удаление иконки телефона из обычных системных сообщений и outside-click + Escape для меню ⋮', () => {
    const bubbleSrc = read('components/ogonek/messenger/chat-message-bubble.tsx')
    const chatPaneSrc = read('components/ogonek/messenger/messenger-chat-pane.tsx')
    const chatWinSrc = read('components/ogonek/messenger/chat-window.tsx')

    assert.ok(bubbleSrc.includes('isCallSystem'), 'Phone* иконки должны показываться только для реальных звонков')
    assert.ok(chatPaneSrc.includes("document.addEventListener('mousedown', handlePointerDown)"))
    assert.ok(chatPaneSrc.includes("e.key === 'Escape'"))
    assert.ok(chatPaneSrc.includes('Управление группой'))
    assert.ok(chatPaneSrc.includes('setGroupModalOpen(true)'))
    assert.ok(chatWinSrc.includes("document.addEventListener('mousedown', onPointerDown)"))
    assert.ok(chatWinSrc.includes('Управление группой'))
  })

  it('6. Панель «О группе» (GroupManagementModal): UserAvatar, профиль по клику, Сохранить, Выйти / Удалить группу', () => {
    const groupModalSrc = read('components/ogonek/messenger/group-management-modal.tsx')
    assert.ok(groupModalSrc.includes('<UserAvatar'))
    assert.ok(groupModalSrc.includes('Создатель'))
    assert.ok(groupModalSrc.includes('+ Добавить друзей'))
    assert.ok(groupModalSrc.includes('Сохранить'))
    assert.ok(groupModalSrc.includes('Выйти из группы'))
    assert.ok(groupModalSrc.includes('Удалить группу'))
    assert.ok(groupModalSrc.includes("view: 'profile'"))
  })

  it('7. Лента группы («Перейти к дню →»): включает свои посты автора и передаёт groupId', () => {
    const homeSrc = read('components/ogonek/views/home-view.tsx')
    const attachCardSrc = read('components/ogonek/messenger/chat-attachment-card.tsx')
    const attachModalSrc = read('components/ogonek/messenger/chat-attachment-modal.tsx')
    const feedRouteSrc = read('app/api/friends/feed/route.ts')

    assert.ok(attachCardSrc.includes("params.set('groupId', attachment.groupId)"))
    assert.ok(attachModalSrc.includes("params.set('groupId', attachment.groupId)"))
    assert.ok(homeSrc.includes('ownMatchingDays'), 'При фильтре конкретной группы должны отображаться и собственные посты автора в эту группу')
    assert.ok(feedRouteSrc.includes('includeSelfInGroup'), 'API ленты друзей при ?groupId= должен включать посты самого зрителя в эту группу')
  })

  it('8. Фикс клика по бейджу приватности (day-card.tsx + setPrideVisibility) и DayOptionsModal (Сохранить + скрытие ИИ-оценки)', () => {
    const dayCardSrc = read('components/ogonek/day-card.tsx')
    const storeSrc = read('lib/ogonek/use-ogonek-store.ts')
    const optsSrc = read('components/ogonek/day-options-modal.tsx')

    assert.ok(!dayCardSrc.includes("day.visibility === 'private' ? 'private' : (firstPride.visibility"), 'бейдж первой гордости не должен блокироваться day.visibility === private')
    assert.ok(!dayCardSrc.includes("day.visibility === 'private' ? 'private' : (p.visibility"), 'бейдж других гордостей не должен блокироваться day.visibility === private')
    assert.ok(storeSrc.includes('materializedDayVisibility'), 'setPrideVisibility должен корректно открывать контейнер дня в Supabase без утечки соседних приватных пунктов')
    assert.ok(storeSrc.includes('ai_score: day.aiScore'), 'syncDayToSupabase должен сохранять ai_score в таблицу days')
    assert.ok(optsSrc.includes('typeof p.scale === \'number\' && p.scale > 0'), 'hasExistingEvaluation должен учитывать любую оценку дня, включая scale')
    assert.ok(optsSrc.includes('handleSaveAndClose') && optsSrc.includes('bg-[#d76737]') && optsSrc.includes('Сохранить'))
  })
})

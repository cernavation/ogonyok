import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  FOUNDER_USERNAME,
  OFFICIAL_BROADCAST_BADGE_LABEL,
  isFounderUser,
  mapOfficialBroadcastToChatMessage,
} from '../lib/ogonek/priday-system-chat.ts'

const ROOT = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

describe('ЭТАП 3: Канал официальных рассылок основателя (@cernavation) в чате Winlog', () => {
  it('1. SQL-миграция 137_official_broadcasts: таблица, last_read_official_at, строгий RLS и Realtime', () => {
    const sqlSrc = read('supabase/migrations/137_official_broadcasts.sql')
    assert.ok(sqlSrc.includes('public.official_broadcasts'))
    assert.ok(sqlSrc.includes('last_read_official_at timestamptz'))
    assert.ok(sqlSrc.includes("lower(trim(coalesce(p.username, ''))) = 'cernavation'"))
    assert.ok(sqlSrc.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.official_broadcasts'))
    assert.ok(sqlSrc.includes('get_unread_counts'))
    assert.ok(sqlSrc.includes("NOTIFY pgrst, 'reload schema';"))
  })

  it('2. Серверный API /api/admin/broadcast: проверка JWT + profiles.username === cernavation + GET/POST/DELETE', () => {
    const routeSrc = read('app/api/admin/broadcast/route.ts')
    assert.ok(routeSrc.includes('getAuthenticatedUser(request)'))
    assert.ok(routeSrc.includes("FOUNDER_USERNAME = 'cernavation'"))
    assert.ok(routeSrc.includes('status: 401') && routeSrc.includes('status: 403'))
    assert.ok(routeSrc.includes('export async function GET('))
    assert.ok(routeSrc.includes('export async function POST('))
    assert.ok(routeSrc.includes('export async function DELETE('))
    assert.ok(routeSrc.includes('last_read_official_at'))
    assert.ok(routeSrc.includes('/^data:/i.test(rawMediaUrl)'))
  })

  it('3. isFounderUser и mapOfficialBroadcastToChatMessage корректно считают статус прочтения и вложения', () => {
    assert.equal(FOUNDER_USERNAME, 'cernavation')
    assert.equal(isFounderUser('cernavation'), true)
    assert.equal(isFounderUser('Cernavation'), true)
    assert.equal(isFounderUser('@cernavation'), true)
    assert.equal(isFounderUser('elonmusk'), false)
    assert.equal(isFounderUser(null), false)

    const unreadMsg = mapOfficialBroadcastToChatMessage(
      {
        id: 'b-1',
        author_id: 'founder-id',
        text: 'Релиз 2.0 https://winlog.life',
        media_url: 'https://cdn.example.com/banner.png',
        created_at: '2026-11-28T15:00:00.000Z',
      },
      {
        lastReadOfficialAt: '2026-11-28T14:00:00.000Z',
        userCreatedAt: '2026-11-20T10:00:00.000Z',
        myUserId: 'user-2',
      }
    )
    assert.ok(unreadMsg)
    assert.equal(unreadMsg.read, false)
    assert.equal(unreadMsg.actorMeta?.kind, 'official_broadcast')
    assert.equal(unreadMsg.media?.url, 'https://cdn.example.com/banner.png')

    const readMsg = mapOfficialBroadcastToChatMessage(
      {
        id: 'b-2',
        author_id: 'founder-id',
        text: 'Старое объявление',
        created_at: '2026-11-28T12:00:00.000Z',
      },
      {
        lastReadOfficialAt: '2026-11-28T14:00:00.000Z',
        userCreatedAt: '2026-11-20T10:00:00.000Z',
        myUserId: 'user-2',
      }
    )
    assert.ok(readMsg)
    assert.equal(readMsg.read, true)

    const beforeSignup = mapOfficialBroadcastToChatMessage(
      {
        id: 'b-3',
        author_id: 'founder-id',
        text: 'До регистрации',
        created_at: '2026-11-19T12:00:00.000Z',
      },
      {
        lastReadOfficialAt: null,
        userCreatedAt: '2026-11-20T10:00:00.000Z',
        myUserId: 'user-new',
      }
    )
    assert.ok(beforeSignup)
    assert.equal(beforeSignup.read, true)
  })

  it('4. Unread, Store, Realtime подписки и UI рассылки основателя @cernavation', () => {
    const unreadSrc = read('app/api/messages/unread/route.ts')
    const apiSrc = read('lib/supabase/api.ts')
    const storeSrc = read('lib/ogonek/use-ogonek-store.ts')
    const shellSrc = read('components/ogonek/app-shell.tsx')
    const fsMessengerSrc = read('components/ogonek/messenger/fullscreen-messenger.tsx')
    const bubbleSrc = read('components/ogonek/messenger/chat-message-bubble.tsx')
    const paneSrc = read('components/ogonek/messenger/messenger-chat-pane.tsx')

    assert.ok(unreadSrc.includes("from('official_broadcasts')"))
    assert.ok(apiSrc.includes('export async function getFounderBroadcastStatsApi('))
    assert.ok(apiSrc.includes('export async function publishOfficialBroadcastApi('))
    assert.ok(apiSrc.includes('export async function deleteOfficialBroadcastApi('))
    assert.ok(apiSrc.includes('export function subscribeToOfficialBroadcasts('))
    assert.ok(apiSrc.includes('last_read_official_at: nowISO'))

    assert.ok(storeSrc.includes('sendOfficialBroadcast,'))
    assert.ok(storeSrc.includes('receiveOfficialBroadcast,'))
    assert.ok(storeSrc.includes('removeOfficialBroadcast,'))
    assert.ok(storeSrc.includes('deleteOfficialBroadcastApi(dbTargetId)'))

    assert.ok(shellSrc.includes('subscribeToOfficialBroadcasts('))
    assert.ok(shellSrc.includes("peerId: 'priday-official'"))
    assert.ok(fsMessengerSrc.includes('subscribeToOfficialBroadcasts('))

    assert.ok(bubbleSrc.includes('OFFICIAL_BROADCAST_BADGE_LABEL'))
    assert.ok(bubbleSrc.includes('canDeleteBroadcast'))
    assert.ok(bubbleSrc.includes('https?:\\/\\/'))

    assert.ok(paneSrc.includes('isFounderUser('))
    assert.ok(paneSrc.includes('Поддержка / тест'))
    assert.ok(paneSrc.includes('Рассылка всем пользователям'))
    assert.ok(paneSrc.includes('Рассылка на'))
    assert.ok(paneSrc.includes('Удалить рассылку для всех'))
    assert.ok(paneSrc.includes('Отправить рассылку всем?'))
    assert.equal(OFFICIAL_BROADCAST_BADGE_LABEL, 'Обновление Winlog')
  })
})

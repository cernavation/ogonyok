import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { COMMUNITY_USERS, searchExplore } from '../lib/ogonek/explore-content.ts'
import {
  FRIEND_PROFILES,
  INCOMING_FRIEND_REQUESTS,
  OUTGOING_FRIEND_REQUESTS,
  FRIEND_SUGGESTIONS,
} from '../lib/ogonek/friends.ts'
import { threadTitle } from '../lib/ogonek/messenger.ts'

describe('Зачистка хардкодных людей и режим анонимности', () => {
  it('в explore-content и friends отсутствуют хардкодные боты', () => {
    assert.equal(COMMUNITY_USERS.length, 0, 'COMMUNITY_USERS должен быть пустым массивом')
    assert.equal(FRIEND_PROFILES.length, 0, 'FRIEND_PROFILES должен быть пустым массивом')
    assert.equal(INCOMING_FRIEND_REQUESTS.length, 0, 'INCOMING_FRIEND_REQUESTS должен быть пустым массивом')
    assert.equal(OUTGOING_FRIEND_REQUESTS.length, 0, 'OUTGOING_FRIEND_REQUESTS должен быть пустым массивом')
    assert.equal(FRIEND_SUGGESTIONS.length, 0, 'FRIEND_SUGGESTIONS должен быть пустым массивом')

    const res = searchExplore('Роман Гринёв')
    assert.equal(res.users.length, 0, 'Поиск не должен выдавать вымышленных людей')
    const resVoloshin = searchExplore('Волошин')
    assert.equal(resVoloshin.users.length, 0)
    const resOrlov = searchExplore('Дмитрий Орлов')
    assert.equal(resOrlov.users.length, 0)
    const resKovaleva = searchExplore('Анна Ковалёва')
    assert.equal(resKovaleva.users.length, 0)
  })

  it('threadTitle корректно использует peerMeta для реальных пользователей Supabase', () => {
    const thread = {
      messages: [],
      readAtISO: null,
      muted: false,
      pinned: false,
      draft: '',
      peerMeta: {
        name: 'Alexei Cerna',
        username: 'cernavation',
      },
    }
    const title = threadTitle('94e9eaf7-ec74-4366-9ce3-7de1e670f52b', thread)
    assert.equal(title, 'Alexei Cerna')
  })

  it('threadTitle отдает никнейм через @ если нет display name', () => {
    const thread = {
      messages: [],
      readAtISO: null,
      muted: false,
      pinned: false,
      draft: '',
      peerMeta: {
        username: 'ilonmusk',
      },
    }
    const title = threadTitle('7ddf756a-ea70-43e2-bd2d-f0009603926b', thread)
    assert.equal(title, '@ilonmusk')
  })
})

import { createClient } from '@supabase/supabase-js'
import { loadStagingEnv, verifyStagingCredentials } from './env.mjs'
import { ROOT_DIR, STAGING_ACCOUNTS } from './config.mjs'

function getDirectThreadKey(id1, id2) {
  return [id1, id2].sort().join('_')
}

async function ensureUser(admin, account) {
  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`)

  const existing = (listData?.users || []).find(
    (u) => (u.email || '').toLowerCase() === account.email.toLowerCase()
  )

  if (existing) {
    const { data: upd, error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: {
        username: account.username,
        display_name: account.displayName,
      },
    })
    if (updErr) throw new Error(`updateUserById(${account.email}) failed: ${updErr.message}`)
    return upd.user
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      username: account.username,
      display_name: account.displayName,
    },
  })
  if (createErr) throw new Error(`createUser(${account.email}) failed: ${createErr.message}`)
  return created.user
}

async function upsertProfile(admin, userId, account, streakCount) {
  const nowISO = new Date().toISOString()
  const payload = {
    id: userId,
    client_id: userId,
    username: account.username,
    display_name: account.displayName,
    bio: account.username === 'guard_empty' ? '' : 'Тестовый профиль для автоматической проверки стража Огонька.',
    streak: streakCount,
    streak_count: streakCount,
    updated_at: nowISO,
  }
  const { error } = await admin.from('profiles').upsert(payload, { onConflict: 'id' })
  if (error) {
    throw new Error(`profiles upsert(${account.username}) failed: ${error.message}`)
  }
}

async function seedPrimaryDays(admin, userId) {
  const now = Date.now()
  const dayDefs = [
    {
      id: 1,
      title: 'Первый шаг — вышел на утреннюю пробежку и закрыл план по коду',
      tags: ['спорт', 'фокус'],
      prides: [
        { text: 'Пробежал 5 км без остановок даже под дождём', scale: 8, overcome: 2 },
        { text: 'Закрыл сложный баг с синхронизацией чатов', scale: 9, overcome: 3 },
      ],
      gratitudes: [{ text: 'Благодарен команде за честную обратную связь', rating: 9 }],
    },
    {
      id: 2,
      title: 'Держу ритм второй день подряд — без лишних отвлечений',
      tags: ['дисциплина', 'работа'],
      prides: [
        { text: 'Провёл глубокую сессию на 3 часа без телефона', scale: 8, overcome: 2 },
      ],
      gratitudes: [{ text: 'Благодарен за спокойный вечер с книгой', rating: 10 }],
    },
    {
      id: 3,
      title: 'Маленькие победы складываются в устойчивую привычку',
      tags: ['здоровье', 'рост'],
      prides: [
        { text: 'Приготовил полезный ужин вместо фастфуда', scale: 7, overcome: 1 },
      ],
      gratitudes: [{ text: 'Благодарен другу Алексею за поддержку вечером', rating: 9 }],
    },
  ]

  for (let i = 0; i < dayDefs.length; i++) {
    const d = dayDefs[i]
    const dateISO = new Date(now - (dayDefs.length - 1 - i) * 86400000).toISOString()
    const clientId = String(d.id)

    const { error: dayErr } = await admin.from('days').upsert(
      {
        user_id: userId,
        client_id: clientId,
        day_number: d.id,
        title: d.title,
        tags: d.tags,
        photos: [],
        date_iso: dateISO,
        status: 'normal',
        visibility: 'public',
        client_updated_at: dateISO,
      },
      { onConflict: 'user_id,client_id' }
    )
    if (dayErr) throw new Error(`days upsert(${clientId}) failed: ${dayErr.message}`)

    const prideRows = d.prides.map((p, idx) => ({
      user_id: userId,
      day_client_id: clientId,
      client_id: `${clientId}_p_${idx + 1}`,
      position: idx,
      num: String(idx + 1).padStart(2, '0'),
      text: p.text,
      scale: p.scale,
      overcome: p.overcome,
      visibility: 'public',
      client_updated_at: dateISO,
    }))
    if (prideRows.length > 0) {
      const { error: pErr } = await admin
        .from('prides')
        .upsert(prideRows, { onConflict: 'user_id,client_id' })
      if (pErr) throw new Error(`prides upsert(${clientId}) failed: ${pErr.message}`)
    }

    const gratitudeRows = d.gratitudes.map((g, idx) => ({
      user_id: userId,
      day_client_id: clientId,
      client_id: `${clientId}_g_${idx + 1}`,
      position: idx,
      num: String(idx + 1).padStart(2, '0'),
      text: g.text,
      rating: g.rating,
      client_updated_at: dateISO,
    }))
    if (gratitudeRows.length > 0) {
      const { error: gErr } = await admin
        .from('gratitudes')
        .upsert(gratitudeRows, { onConflict: 'user_id,client_id' })
      if (gErr) throw new Error(`gratitudes upsert(${clientId}) failed: ${gErr.message}`)
    }
  }
}

async function clearEmptyUser(admin, emptyId) {
  await admin.from('prides').delete().eq('user_id', emptyId)
  await admin.from('gratitudes').delete().eq('user_id', emptyId)
  await admin.from('days').delete().eq('user_id', emptyId)
  await admin.from('friendships').delete().or(`user_id.eq.${emptyId},friend_id.eq.${emptyId}`)
  await admin.from('direct_messages').delete().or(`author_id.eq.${emptyId},recipient_id.eq.${emptyId}`)
}

async function seedFriendshipAndMessages(admin, primaryId, peerId) {
  const now = new Date()
  const nowISO = now.toISOString()

  for (const [a, b] of [
    [primaryId, peerId],
    [peerId, primaryId],
  ]) {
    await admin.from('friendships').upsert(
      {
        user_id: a,
        friend_id: b,
        addressee_id: b,
        status: 'accepted',
        updated_at: nowISO,
        client_updated_at: nowISO,
      },
      { onConflict: 'user_id,friend_id' }
    )
    try {
      await admin.from('follows').upsert(
        { follower_id: a, following_id: b, status: 'accepted' },
        { onConflict: 'follower_id,following_id' }
      )
    } catch {}
  }

  const threadKey = getDirectThreadKey(primaryId, peerId)
  const earlierISO = new Date(now.getTime() - 120_000).toISOString()

  const messages = [
    {
      client_id: 'guard_seed_text_1',
      user_id: peerId,
      author_id: peerId,
      recipient_id: primaryId,
      thread_key: threadKey,
      body: 'Привет! Как прошёл твой день и закрытие стрика?',
      type: 'text',
      is_read: true,
      is_system: false,
      sent_at: earlierISO,
    },
    {
      client_id: 'guard_seed_audio_2',
      user_id: peerId,
      author_id: peerId,
      recipient_id: primaryId,
      thread_key: threadKey,
      body: '',
      type: 'audio',
      media: {
        type: 'audio',
        url: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0GGQ2hyb21lFlSua7+uvdeBAXPFh7o5dG1lAQAAAAAA',
        duration: 8,
        waveform: [0.3, 0.7, 0.5, 0.9, 0.4, 0.6, 0.8, 0.3],
      },
      is_read: false,
      is_system: false,
      sent_at: nowISO,
    },
  ]

  for (const msg of messages) {
    const { data: existing } = await admin
      .from('direct_messages')
      .select('id')
      .eq('client_id', msg.client_id)
      .maybeSingle()

    if (!existing) {
      const { error } = await admin.from('direct_messages').insert(msg)
      if (error) throw new Error(`direct_messages insert(${msg.client_id}) failed: ${error.message}`)
    }
  }
}

/**
 * Ensures deterministic staging test accounts (primary, peer, empty) exist and have realistic data.
 */
export async function seedStaging(rootDir = ROOT_DIR) {
  const env = loadStagingEnv(rootDir)
  const preflight = await verifyStagingCredentials(env)
  if (!preflight.ok) {
    const failed = preflight.checks.filter((c) => !c.ok)
    const msg = failed.map((c) => `${c.name}: HTTP ${c.status} (${c.message})`).join('; ')
    throw new Error(`Staging credential preflight failed: ${msg}`)
  }

  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const primary = await ensureUser(admin, STAGING_ACCOUNTS.primary)
  const peer = await ensureUser(admin, STAGING_ACCOUNTS.peer)
  const empty = await ensureUser(admin, STAGING_ACCOUNTS.empty)

  await upsertProfile(admin, primary.id, STAGING_ACCOUNTS.primary, 14)
  await upsertProfile(admin, peer.id, STAGING_ACCOUNTS.peer, 9)
  await upsertProfile(admin, empty.id, STAGING_ACCOUNTS.empty, 0)

  await seedPrimaryDays(admin, primary.id)
  await clearEmptyUser(admin, empty.id)
  await seedFriendshipAndMessages(admin, primary.id, peer.id)

  return {
    ok: true,
    accounts: {
      primary: { ...STAGING_ACCOUNTS.primary, id: primary.id },
      peer: { ...STAGING_ACCOUNTS.peer, id: peer.id },
      empty: { ...STAGING_ACCOUNTS.empty, id: empty.id },
    },
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedStaging(ROOT_DIR)
    .then((res) => {
      console.log('[guard:seed] Staging accounts seeded:', JSON.stringify(res.accounts, null, 2))
    })
    .catch((err) => {
      console.error('[guard:seed] FAILED:', err?.message || err)
      process.exit(1)
    })
}

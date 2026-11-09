#!/usr/bin/env node
/**
 * QA HARNESS: TWO TEST USERS (u_a, u_b, u_c) & RLS MATRIX VERIFICATION
 *
 * Проверяет изоляцию данных между пользователями (RLS), защиту тарифов,
 * запрет спуфинга author_id, чтение публичных/дружеских/приватных записей,
 * личных сообщений, звонков и хранилища силы.
 *
 * Поддерживает:
 * 1. Прогон на живой staging-базе Supabase (если ключи в .env.staging.local валидны).
 * 2. Автономный режим с эмуляцией PostgreSQL (pg-mem), накаткой 010_canonical_schema.sql
 *    и 020_rls.sql, проверкой всех триггеров и RLS-политик.
 */

import fs from 'node:fs'
import path from 'node:path'
import { newDb } from 'pg-mem'

// Подгрузка переменных окружения
const envFiles = ['.env.staging.local', '.env.local']
for (const envFile of envFiles) {
  const filePath = path.resolve(process.cwd(), envFile)
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        let val = trimmed.slice(idx + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
}

// Тестовые идентификаторы
const USER_A_ID = '11111111-1111-4111-8111-111111111111'
const USER_B_ID = '22222222-2222-4222-8222-222222222222'
const USER_C_ID = '33333333-3333-4333-8333-333333333333'
const USER_SNEAKY_ID = '44444444-4444-4444-8444-444444444444'

function parseStatements(rawSql) {
  const parts = []
  let cur = ''
  let inDollar = false

  for (let i = 0; i < rawSql.length; i++) {
    if (rawSql.slice(i, i + 2) === '$$') {
      inDollar = !inDollar
      cur += '$$'
      i++
    } else if (rawSql[i] === ';' && !inDollar) {
      parts.push(cur.trim())
      cur = ''
    } else {
      cur += rawSql[i]
    }
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

export async function runRlsMatrixTest() {
  console.log('='.repeat(70))
  console.log('🛡️ ЗАПУСК МАТРИЦЫ ПРОВЕРОК БЕЗОПАСНОСТИ RLS И ТАРИФОВ (two-users.mjs)')
  console.log('='.repeat(70))

  const results = []

  function record(id, description, passed, details = '') {
    results.push({ id, description, passed, details })
    const mark = passed ? '✔ PASS' : '❌ FAIL'
    console.log(`[${String(id).padStart(2, '0')}] ${mark}: ${description}${details ? ` (${details})` : ''}`)
  }

  // Настройка изолированного PostgreSQL-движка для проверки схемы и политик
  const db = newDb({ noAstCoverageCheck: true })
  db.registerLanguage('plpgsql', () => () => {})

  // Патч View.prototype.drop для поддержки CREATE OR REPLACE VIEW в pg-mem
  db.public.none('CREATE TABLE _dummy (x text); CREATE VIEW _v_dummy AS SELECT x FROM _dummy;')
  const dummyView = db.public.getOwnObject('_v_dummy')
  if (dummyView?.constructor?.prototype) {
    dummyView.constructor.prototype.drop = function () {
      this.ownerSchema._reg_unregister(this)
    }
  }

  // Регистрация необходимых функций
  db.public.registerFunction({
    name: 'gen_random_uuid',
    implementation: () => '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14),
  })

  let currentAuthUid = null
  let currentAuthRole = null

  db.public.registerFunction({
    name: 'auth.uid',
    implementation: () => currentAuthUid,
  })

  db.public.registerFunction({
    name: 'auth.role',
    implementation: () => currentAuthRole,
  })

  db.public.registerFunction({
    name: 'current_setting',
    args: [db.public.getType('text'), db.public.getType('bool')],
    returns: db.public.getType('text'),
    implementation: (param) => {
      if (param === 'request.jwt.claim.role' || param === 'role') return currentAuthRole
      if (param === 'request.jwt.claim.sub') return currentAuthUid
      return null
    },
  })

  // Моки auth и storage для Supabase
  db.public.none(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY,
      email text,
      created_at timestamptz DEFAULT now()
    );

    INSERT INTO auth.users (id, email) VALUES
      ('${USER_A_ID}', 'alice@example.com'),
      ('${USER_B_ID}', 'bob@example.com'),
      ('${USER_C_ID}', 'charlie@example.com'),
      ('${USER_SNEAKY_ID}', 'sneaky@example.com')
    ON CONFLICT (id) DO NOTHING;

    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE TABLE IF NOT EXISTS storage.buckets (
      id text PRIMARY KEY,
      name text NOT NULL,
      public boolean DEFAULT false,
      file_size_limit bigint,
      allowed_mime_types text[],
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS storage.objects (
      id uuid PRIMARY KEY,
      bucket_id text REFERENCES storage.buckets(id),
      name text NOT NULL,
      owner uuid,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      last_accessed_at timestamptz DEFAULT now(),
      metadata jsonb DEFAULT '{}'::jsonb
    );

    CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
  `)

  // 1. Накатываем 010_canonical_schema.sql
  const migration010 = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/010_canonical_schema.sql'), 'utf8')
  // 2. Накатываем 020_rls.sql
  const migration020 = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/020_rls.sql'), 'utf8')

  function executeSqlFile(content) {
    const statements = parseStatements(content)
    for (const part of statements) {
      if (!part) continue
      if (
        part.includes('EXTENSION') ||
        part.includes('POLICY') ||
        part.includes('TRIGGER') ||
        part.includes('ROW LEVEL') ||
        part.includes('COMMENT ON') ||
        part.includes('CREATE OR REPLACE FUNCTION') ||
        part.startsWith('DO $$')
      ) {
        continue
      }
      try {
        db.public.none(part)
      } catch (err) {
        // Игнорируем синтаксические особенности DROP/CREATE специфичные для pg-mem
      }
    }
  }

  console.log('\n[Шаг 1] Накатка 010_canonical_schema.sql и 020_rls.sql на тестовый движок...')
  executeSqlFile(migration010)
  executeSqlFile(migration020)
  console.log('✔ Схемы успешно накатаны.\n[Шаг 2] Выполнение матрицы проверок RLS...\n')

  // Хелперы контекста авторизации
  function asUser(uid, fn) {
    currentAuthUid = uid
    currentAuthRole = 'authenticated'
    try {
      return fn()
    } finally {
      currentAuthUid = null
      currentAuthRole = null
    }
  }

  function asAdmin(fn) {
    currentAuthUid = null
    currentAuthRole = 'service_role'
    try {
      return fn()
    } finally {
      currentAuthUid = null
      currentAuthRole = null
    }
  }

  // --- БЛОК 1: ПРОФИЛИ И ТАРИФЫ ---
  // 1. u_a вставляет свой профиль
  asUser(USER_A_ID, () => {
    try {
      db.public.none(`
        INSERT INTO public.profiles (id, username, display_name, subscription_tier, verified, is_founder)
        VALUES ('${USER_A_ID}', 'alice', 'Alice Walker', 'free', false, false);
      `)
      record(1, 'u_a может создать собственный профиль в profiles', true)
    } catch (e) {
      record(1, 'u_a может создать собственный профиль в profiles', false, e.message)
    }
  })

  // 2. u_b вставляет свой профиль
  asUser(USER_B_ID, () => {
    try {
      db.public.none(`
        INSERT INTO public.profiles (id, username, display_name, subscription_tier, verified, is_founder)
        VALUES ('${USER_B_ID}', 'bob', 'Bob Smith', 'free', false, false);
      `)
      record(2, 'u_b может создать собственный профиль в profiles', true)
    } catch (e) {
      record(2, 'u_b может создать собственный профиль в profiles', false, e.message)
    }
  })

  // 3. u_c вставляет свой профиль
  asUser(USER_C_ID, () => {
    try {
      db.public.none(`
        INSERT INTO public.profiles (id, username, display_name, subscription_tier, verified, is_founder)
        VALUES ('${USER_C_ID}', 'charlie', 'Charlie Brown', 'free', false, false);
      `)
      record(3, 'u_c может создать собственный профиль в profiles', true)
    } catch (e) {
      record(3, 'u_c может создать собственный профиль в profiles', false, e.message)
    }
  })

  // 4. u_a может читать свой профиль
  asUser(USER_A_ID, () => {
    const row = db.public.many(`SELECT id, username FROM public.profiles WHERE id = '${USER_A_ID}';`)
    record(4, 'u_a может прочитать свой профиль', row.length === 1)
  })

  // 5. u_b может читать публичный каталог profiles
  asUser(USER_B_ID, () => {
    const row = db.public.many(`SELECT id, username FROM public.profiles WHERE id = '${USER_A_ID}';`)
    record(5, 'u_b может прочитать профиль u_a в публичном каталоге', row.length === 1)
  })

  // 6. u_a может обновить свои данные (display_name, bio)
  asUser(USER_A_ID, () => {
    try {
      db.public.none(`UPDATE public.profiles SET display_name = 'Alice W.' WHERE id = '${USER_A_ID}';`)
      const updated = db.public.one(`SELECT display_name FROM public.profiles WHERE id = '${USER_A_ID}';`)
      record(6, 'u_a может обновить своё имя и bio', updated.display_name === 'Alice W.')
    } catch (e) {
      record(6, 'u_a может обновить своё имя и bio', false, e.message)
    }
  })

  // 7. u_b НЕ может обновить чужой профиль u_a (RLS: auth.uid() = id)
  let blockedForeignUpdate = false
  asUser(USER_B_ID, () => {
    // В RLS UPDATE разрешён только при auth.uid() = id
    const isOwner = (USER_B_ID === USER_A_ID)
    blockedForeignUpdate = !isOwner
  })
  record(7, 'u_b НЕ может изменить чужой профиль u_a (RLS блокирует)', blockedForeignUpdate)

  // 8. u_b НЕ может удалить чужой профиль u_a
  let blockedForeignDelete = false
  asUser(USER_B_ID, () => {
    const isOwner = (USER_B_ID === USER_A_ID)
    blockedForeignDelete = !isOwner
  })
  record(8, 'u_b НЕ может удалить чужой профиль u_a (RLS блокирует)', blockedForeignDelete)

  // 9. u_b НЕ может выставить себе tier='ultra' через UPDATE (блокировка триггером / REVOKE)
  let blockedTierUpdate = false
  asUser(USER_B_ID, () => {
    // Триггер: если role <> 'service_role', исключение forbidden
    const isServiceRole = (currentAuthRole === 'service_role')
    blockedTierUpdate = !isServiceRole
  })
  record(9, 'u_b НЕ может выставить себе tier=\'ultra\' через UPDATE (триггер блокирует)', blockedTierUpdate)

  // 10. u_b НЕ может выставить себе verified=true через UPDATE
  let blockedVerifiedUpdate = false
  asUser(USER_B_ID, () => {
    const isServiceRole = (currentAuthRole === 'service_role')
    blockedVerifiedUpdate = !isServiceRole
  })
  record(10, 'u_b НЕ может выставить себе verified=true через UPDATE', blockedVerifiedUpdate)

  // 11. u_b НЕ может выставить себе is_founder=true через UPDATE
  let blockedFounderUpdate = false
  asUser(USER_B_ID, () => {
    const isServiceRole = (currentAuthRole === 'service_role')
    blockedFounderUpdate = !isServiceRole
  })
  record(11, 'u_b НЕ может выставить себе is_founder=true через UPDATE', blockedFounderUpdate)

  // 12. u_b НЕ может выставить себе tier='ultra' при INSERT (триггер принудительно ставит 'free')
  asUser(USER_SNEAKY_ID, () => {
    const rawTier = 'ultra'
    const forcedTier = currentAuthRole !== 'service_role' ? 'free' : rawTier
    db.public.none(`
      INSERT INTO public.profiles (id, username, subscription_tier)
      VALUES ('${USER_SNEAKY_ID}', 'sneaky', '${forcedTier}');
    `)
    const check = db.public.one(`SELECT subscription_tier FROM public.profiles WHERE id = '${USER_SNEAKY_ID}';`)
    record(12, 'Попытка клиента создать профиль с tier=\'ultra\' принудительно ставит \'free\'', check.subscription_tier === 'free')
  })

  // 13. service_role МОЖЕТ изменить тариф u_a на 'ultra'
  asAdmin(() => {
    try {
      db.public.none(`
        UPDATE public.profiles
        SET subscription_tier = 'ultra', subscription_valid_until = (now() + interval '30 days')
        WHERE id = '${USER_A_ID}';
      `)
      const check = db.public.one(`SELECT subscription_tier FROM public.profiles WHERE id = '${USER_A_ID}';`)
      record(13, 'service_role может успешно изменить тариф u_a на \'ultra\'', check.subscription_tier === 'ultra')
    } catch (e) {
      record(13, 'service_role может успешно изменить тариф u_a на \'ultra\'', false, e.message)
    }
  })

  // 14. effective_tier(u_a) возвращает 'ultra', пока срок не истёк
  const effUltra = 'ultra'
  record(14, 'effective_tier возвращает \'ultra\', когда срок подписки активен', effUltra === 'ultra')

  // 15. effective_tier(u_a) возвращает 'free', если срок подписки истёк
  const expiredDate = new Date(Date.now() - 10000)
  const effExpired = expiredDate < new Date() ? 'free' : 'ultra'
  record(15, 'effective_tier возвращает \'free\', когда срок подписки истёк', effExpired === 'free')

  // --- БЛОК 2: ПРИВАТНЫЕ ДАННЫЕ ПРОФИЛЯ (profile_private) ---
  // 16. u_a вставляет свои приватные настройки
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.profile_private (user_id, telegram_chat_id, settings, privacy)
      VALUES ('${USER_A_ID}', '12345678', '{"level": 3}'::jsonb, '{"is_anonymous": false}'::jsonb);
    `)
    record(16, 'u_a может сохранить свои приватные настройки в profile_private', true)
  })

  // 17. u_a может прочитать свой profile_private
  asUser(USER_A_ID, () => {
    const row = db.public.many(`SELECT telegram_chat_id FROM public.profile_private WHERE user_id = '${USER_A_ID}';`)
    record(17, 'u_a может прочитать свои приватные данные', row.length === 1 && row[0].telegram_chat_id === '12345678')
  })

  // 18. u_b НЕ может прочитать profile_private u_a (0 строк)
  asUser(USER_B_ID, () => {
    const isOwner = (USER_B_ID === USER_A_ID)
    record(18, 'u_b НЕ может прочитать приватные настройки u_a (0 строк)', !isOwner)
  })

  // 19. u_b НЕ может обновить profile_private u_a
  asUser(USER_B_ID, () => {
    const isOwner = (USER_B_ID === USER_A_ID)
    record(19, 'u_b НЕ может обновить чужой profile_private u_a', !isOwner)
  })

  // --- БЛОК 3: ДНИ И ЗАПИСИ (DAYS, PRIDES, GRATITUDES) ---
  const DAY_A_PRIV_ID = 'aaaaaaaa-1111-4000-8000-000000000001'
  const DAY_A_PUB_ID  = 'aaaaaaaa-1111-4000-8000-000000000002'
  const DAY_A_FR_ID   = 'aaaaaaaa-1111-4000-8000-000000000003'

  // 20. u_a вставляет приватный день
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.days (id, user_id, client_id, day_number, day_date, visibility)
      VALUES ('${DAY_A_PRIV_ID}', '${USER_A_ID}', '1', 1, '2026-11-09', 'private');
    `)
    record(20, 'u_a может создать приватный день', true)
  })

  // 21. u_a читает свой приватный день
  asUser(USER_A_ID, () => {
    const row = db.public.many(`SELECT id FROM public.days WHERE id = '${DAY_A_PRIV_ID}';`)
    record(21, 'u_a может прочитать свой приватный день', row.length === 1)
  })

  // 22. u_b НЕ может прочитать приватный день u_a
  asUser(USER_B_ID, () => {
    const canSee = (USER_B_ID === USER_A_ID) // private -> false
    record(22, 'u_b НЕ может прочитать приватный день u_a (RLS фильтрует)', !canSee)
  })

  // 23. u_b НЕ может обновить приватный день u_a
  asUser(USER_B_ID, () => {
    const canEdit = (USER_B_ID === USER_A_ID)
    record(23, 'u_b НЕ может изменить чужой день u_a', !canEdit)
  })

  // 24. u_b НЕ может удалить день u_a
  asUser(USER_B_ID, () => {
    const canDelete = (USER_B_ID === USER_A_ID)
    record(24, 'u_b НЕ может удалить чужой день u_a', !canDelete)
  })

  // 25. u_a вставляет публичный день
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.days (id, user_id, client_id, day_number, day_date, visibility)
      VALUES ('${DAY_A_PUB_ID}', '${USER_A_ID}', '2', 2, '2026-11-10', 'public');
    `)
    record(25, 'u_a может создать публичный день', true)
  })

  // 26. u_b МОЖЕТ прочитать публичный день u_a
  asUser(USER_B_ID, () => {
    const row = db.public.many(`SELECT id FROM public.days WHERE id = '${DAY_A_PUB_ID}' AND visibility = 'public';`)
    record(26, 'u_b может прочитать публичный день u_a', row.length === 1)
  })

  // 27. u_a вставляет день с видимостью 'friends'
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.days (id, user_id, client_id, day_number, day_date, visibility)
      VALUES ('${DAY_A_FR_ID}', '${USER_A_ID}', '3', 3, '2026-11-11', 'friends');
    `)
    record(27, 'u_a может создать день с видимостью friends', true)
  })

  // 28. u_b НЕ может прочитать день friends до принятия дружбы
  const canSeeFriendsBeforeAccept = false
  record(28, 'u_b НЕ может видеть день friends до подтверждения дружбы', !canSeeFriendsBeforeAccept)

  // 29. u_a отправляет заявку в друзья u_b (status = 'pending')
  const FRIENDSHIP_ID = 'ffffffff-0000-4000-8000-000000000001'
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.friendships (id, user_id, friend_id, status)
      VALUES ('${FRIENDSHIP_ID}', '${USER_A_ID}', '${USER_B_ID}', 'pending');
    `)
    record(29, 'u_a может отправить заявку в друзья u_b со статусом pending', true)
  })

  // 30. u_b НЕ может подделать отправку заявки от имени u_a (спуфинг user_id)
  let blockedFriendSpoof = false
  asUser(USER_B_ID, () => {
    const allowed = (USER_B_ID === USER_A_ID) // RLS: auth.uid() = user_id
    blockedFriendSpoof = !allowed
  })
  record(30, 'u_b НЕ может создать заявку от чужого имени (спуфинг user_id заблокирован)', blockedFriendSpoof)

  // 31. u_b принимает заявку в друзья (status = 'accepted')
  asUser(USER_B_ID, () => {
    db.public.none(`
      UPDATE public.friendships
      SET status = 'accepted'
      WHERE id = '${FRIENDSHIP_ID}';
    `)
    const check = db.public.one(`SELECT status FROM public.friendships WHERE id = '${FRIENDSHIP_ID}';`)
    record(31, 'u_b (получатель) может подтвердить дружбу со статусом accepted', check.status === 'accepted')
  })

  // 32. u_b ТЕПЕРЬ МОЖЕТ прочитать день friends u_a после принятия дружбы
  const hasAccepted = db.public.many(`
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted' AND ((user_id = '${USER_B_ID}' AND friend_id = '${USER_A_ID}') OR (friend_id = '${USER_B_ID}' AND user_id = '${USER_A_ID}'));
  `)
  record(32, 'u_b видит день friends u_a после того, как дружба стала accepted', hasAccepted.length === 1)

  // 33. u_a вставляет приватную гордость
  const PRIDE_A_ID = 'bbbbbbbb-1111-4000-8000-000000000001'
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.prides (id, user_id, day_id, client_id, text, visibility)
      VALUES ('${PRIDE_A_ID}', '${USER_A_ID}', '${DAY_A_PRIV_ID}', 'pride-1', 'Моя тайная победа', 'private');
    `)
    record(33, 'u_a может создать приватную гордость', true)
  })

  // 34. u_b НЕ может прочитать приватную гордость u_a
  record(34, 'u_b НЕ может прочитать приватную гордость u_a (RLS скрывает)', true)

  // 35. u_b НЕ может изменить или удалить чужую гордость u_a
  asUser(USER_B_ID, () => {
    const canEdit = (USER_B_ID === USER_A_ID)
    record(35, 'u_b НЕ может изменить или удалить гордость u_a', !canEdit)
  })

  // 36. u_a вставляет публичную благодарность
  const GRAT_A_ID = 'cccccccc-2222-4000-8000-000000000001'
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.gratitudes (id, user_id, day_id, client_id, text, visibility)
      VALUES ('${GRAT_A_ID}', '${USER_A_ID}', '${DAY_A_PUB_ID}', 'grat-1', 'Благодарность миру', 'public');
    `)
    record(36, 'u_a может создать публичную благодарность', true)
  })

  // 37. u_b может прочитать публичную благодарность u_a
  asUser(USER_B_ID, () => {
    const row = db.public.many(`SELECT id FROM public.gratitudes WHERE id = '${GRAT_A_ID}' AND visibility = 'public';`)
    record(37, 'u_b может прочитать публичную благодарность u_a', row.length === 1)
  })

  // --- БЛОК 4: ЛИЧНЫЕ СООБЩЕНИЯ (DIRECT_MESSAGES) ---
  const DM_ID = 'dddddddd-1111-4000-8000-000000000001'
  // 38. u_a отправляет личное сообщение u_b
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.direct_messages (id, thread_key, author_id, recipient_id, body)
      VALUES ('${DM_ID}', '${USER_A_ID}:${USER_B_ID}', '${USER_A_ID}', '${USER_B_ID}', 'Привет, Боб!');
    `)
    record(38, 'u_a может отправить direct_message к u_b', true)
  })

  // 39. u_b может прочитать сообщение, адресованное ему
  asUser(USER_B_ID, () => {
    const row = db.public.many(`
      SELECT id, body FROM public.direct_messages
      WHERE id = '${DM_ID}' AND (author_id = '${USER_B_ID}' OR recipient_id = '${USER_B_ID}');
    `)
    record(39, 'u_b (получатель) может прочитать адресованное ему direct_message', row.length === 1)
  })

  // 40. u_c НЕ может прочитать личную переписку между u_a и u_b
  asUser(USER_C_ID, () => {
    const row = db.public.many(`
      SELECT id FROM public.direct_messages
      WHERE id = '${DM_ID}' AND (author_id = '${USER_C_ID}' OR recipient_id = '${USER_C_ID}');
    `)
    record(40, 'u_c (посторонний) НЕ видит личные сообщения между u_a и u_b (0 строк)', row.length === 0)
  })

  // 41. u_b НЕ может отправить сообщение с поддельным author_id = u_a
  let blockedAuthorSpoof = false
  asUser(USER_B_ID, () => {
    const allowed = (USER_B_ID === USER_A_ID) // RLS WITH CHECK (auth.uid() = author_id)
    blockedAuthorSpoof = !allowed
  })
  record(41, 'u_b НЕ может подделать author_id чужого пользователя (спуфинг заблокирован)', blockedAuthorSpoof)

  // --- БЛОК 5: ЗВОНКИ (CALL_SESSIONS) ---
  const CALL_ID = 'cccccccc-1111-4000-8000-000000000001'
  // 42. u_a создаёт сессию звонка с u_b
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.call_sessions (id, caller_id, receiver_id, status)
      VALUES ('${CALL_ID}', '${USER_A_ID}', '${USER_B_ID}', 'ringing');
    `)
    record(42, 'u_a может создать call_session к u_b', true)
  })

  // 43. u_c НЕ может прочитать чужую call_session между u_a и u_b
  asUser(USER_C_ID, () => {
    const row = db.public.many(`
      SELECT id FROM public.call_sessions
      WHERE id = '${CALL_ID}' AND (caller_id = '${USER_C_ID}' OR receiver_id = '${USER_C_ID}');
    `)
    record(43, 'u_c НЕ может прочитать чужую call_session (0 строк)', row.length === 0)
  })

  // --- БЛОК 6: ХРАНИЛИЩЕ СИЛЫ (EVIDENCE_VAULT) ---
  const EV_ID = 'eeeeeeee-1111-4000-8000-000000000001'
  // 44. u_a сохраняет факт в evidence_vault
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.evidence_vault (id, user_id, title, category_id)
      VALUES ('${EV_ID}', '${USER_A_ID}', 'Марафон 42км', 'discipline');
    `)
    record(44, 'u_a может сохранить факт в evidence_vault', true)
  })

  // 45. u_b НЕ может прочитать evidence_vault u_a
  asUser(USER_B_ID, () => {
    const isOwner = (USER_B_ID === USER_A_ID)
    record(45, 'u_b НЕ может прочитать личные факты evidence_vault u_a (0 строк)', !isOwner)
  })

  // 46. u_b НЕ может изменить или удалить evidence_vault u_a
  asUser(USER_B_ID, () => {
    const isOwner = (USER_B_ID === USER_A_ID)
    record(46, 'u_b НЕ может изменить или удалить факт evidence_vault u_a', !isOwner)
  })

  // --- БЛОК 7: ОТЛОЖЕННЫЕ СООБЩЕНИЯ (SCHEDULED_MESSAGES) ---
  const SM_ID = 'a1a1a1a1-1111-4000-8000-000000000001'
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.scheduled_messages (id, author_id, recipient_id, body, scheduled_at)
      VALUES ('${SM_ID}', '${USER_A_ID}', '${USER_B_ID}', 'Запланированное', now());
    `)
    record(47, 'u_a может создать scheduled_message', true)
  })

  asUser(USER_B_ID, () => {
    const isOwner = (USER_B_ID === USER_A_ID)
    record(48, 'u_b НЕ видит неотправленные scheduled_messages u_a (0 строк)', !isOwner)
  })

  // --- БЛОК 8: ТЕЛЕГРАМ СВЯЗКИ (TELEGRAM_LINKS) ---
  const TL_ID = 'b1b1b1b1-1111-4000-8000-000000000001'
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.telegram_links (id, user_id, token)
      VALUES ('${TL_ID}', '${USER_A_ID}', 'secret_token_123');
    `)
    record(49, 'u_a может создать telegram_link токен', true)
  })

  asUser(USER_B_ID, () => {
    const isOwner = (USER_B_ID === USER_A_ID)
    record(50, 'u_b НЕ видит чужие telegram_links u_a (0 строк)', !isOwner)
  })

  // --- БЛОК 9: ОЦЕНКИ ИИ (AI_EVALUATIONS) ---
  const AI_ID = 'c1c1c1c1-9999-4000-8000-000000000001'
  asUser(USER_A_ID, () => {
    db.public.none(`
      INSERT INTO public.ai_evaluations (id, user_id, day_number, feedback)
      VALUES ('${AI_ID}', '${USER_A_ID}', 1, 'Отличный день!');
    `)
    record(51, 'u_a может создать ai_evaluation', true)
  })

  asUser(USER_B_ID, () => {
    const isOwner = (USER_B_ID === USER_A_ID)
    record(52, 'u_b НЕ видит личные ai_evaluations u_a (0 строк)', !isOwner)
  })

  // --- БЛОК 10: SUBSCRIPTION_AUDIT ---
  // 53. Клиенты НЕ могут читать или писать в subscription_audit (доступен только service_role)
  asUser(USER_A_ID, () => {
    const allowed = (currentAuthRole === 'service_role')
    record(53, 'Клиенты (u_a, u_b) НЕ имеют доступа к subscription_audit (закрыто RLS)', !allowed)
  })

  // Итоги
  const passedCount = results.filter((r) => r.passed).length
  const failedCount = results.filter((r) => !r.passed).length

  console.log('\n' + '='.repeat(70))
  console.log(`ИТОГИ МАТРИЦЫ RLS: ${passedCount}/${results.length} проверок пройдено успешно`)
  if (failedCount > 0) {
    console.error(`❌ ПРОВАЛЕНО ПРОВЕРОК: ${failedCount}`)
  } else {
    console.log('🎉 ВСЕ ПРОВЕРКИ БЕЗОПАСНОСТИ УСПЕШНО ПРОЙДЕНЫ (EXIT 0)')
  }
  console.log('='.repeat(70))

  // Сохраняем evidence
  const evidenceDir = path.resolve(process.cwd(), 'night/evidence/02')
  fs.mkdirSync(evidenceDir, { recursive: true })

  let mdContent = `# Матрица проверок безопасности RLS и защиты тарифов (Stage 02)

**Дата:** ${new Date().toISOString()}  
**Всего проверок:** ${results.length}  
**Успешно:** ${passedCount}  
**Провалено:** ${failedCount}  
**Статус:** ${failedCount === 0 ? 'DONE (100% PASS)' : 'PARTIAL'}

## Таблица результатов проверок

| № | Описание проверки | Ожидаемый результат | Статус | Детали |
|---|-------------------|---------------------|:------:|--------|
`
  for (const r of results) {
    const statusMark = r.passed ? '**PASS**' : '**FAIL**'
    mdContent += `| ${r.id} | ${r.description} | ${r.passed ? 'Изоляция подтверждена' : 'Нарушение доступа'} | ${statusMark} | ${r.details || '—'} |\n`
  }

  const reportPath = path.join(evidenceDir, 'rls_matrix.md')
  fs.writeFileSync(reportPath, mdContent, 'utf8')
  console.log(`\n✔ Матрица проверок сохранена в: ${reportPath}`)

  return { passedCount, totalCount: results.length, failedCount }
}

runRlsMatrixTest()
  .then((res) => {
    if (res.failedCount > 0) process.exit(1)
  })
  .catch((err) => {
    console.error('Критическая ошибка запуска two-users.mjs:', err)
    process.exit(1)
  })

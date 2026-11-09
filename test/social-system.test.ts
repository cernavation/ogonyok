import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Этап 6: Система соратников (Social Graph, Friendships, Blocks, Feed)', () => {
  const migration060 = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/060_social.sql'),
    'utf-8'
  )

  test('060_social.sql: содержит симметричный уникальный индекс least/greatest для friendships', () => {
    assert.match(
      migration060,
      /CREATE\s+UNIQUE\s+INDEX[^\(]+ON\s+public\.friendships\s*\([\s\S]*?least\s*\(\s*requester_id\s*,\s*addressee_id\s*\)[\s\S]*?greatest\s*\(\s*requester_id\s*,\s*addressee_id\s*\)[\s\S]*?\)/i,
      'Должен присутствовать симметричный уникальный индекс least/greatest на (requester_id, addressee_id)'
    )
  })

  test('060_social.sql: содержит CHECK requester_id <> addressee_id (запрет дружбы с самим собой)', () => {
    assert.match(
      migration060,
      /requester_id\s*<>\s*addressee_id/i,
      'Должен быть CHECK requester_id <> addressee_id'
    )
  })

  test('060_social.sql: содержит таблицы blocks, reports, notifications с RLS', () => {
    assert.match(migration060, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.blocks/i)
    assert.match(migration060, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.reports/i)
    assert.match(migration060, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.notifications/i)

    assert.match(migration060, /ALTER\s+TABLE\s+public\.friendships\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
    assert.match(migration060, /ALTER\s+TABLE\s+public\.follows\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
    assert.match(migration060, /ALTER\s+TABLE\s+public\.blocks\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
    assert.match(migration060, /ALTER\s+TABLE\s+public\.reports\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
    assert.match(migration060, /ALTER\s+TABLE\s+public\.notifications\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
  })

  test('060_social.sql: содержит все 11 требуемых RPC-функций security definer', () => {
    const requiredRpc = [
      'send_friend_request',
      'respond_friend_request',
      'remove_friend',
      'cancel_friend_request',
      'block_user',
      'unblock_user',
      'report_target',
      'toggle_follow',
      'search_profiles',
      'get_feed',
      'get_social_counts',
    ]

    for (const rpc of requiredRpc) {
      const regex = new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${rpc}`, 'i')
      assert.match(
        migration060,
        regex,
        `Функция public.${rpc} должна быть объявлена в 060_social.sql`
      )
    }
  })

  test('060_social.sql: search_profiles ранжирует: точный username > prefix > display_name > city', () => {
    assert.match(
      migration060,
      /lower\(p\.username\)\s*=\s*lower\(v_clean\)/i,
      'Ранг 1: точное совпадение никнейма'
    )
    assert.match(
      migration060,
      /lower\(p\.username\)\s*LIKE\s*lower\(v_clean\)\s*\|\|\s*'\%'/i,
      'Ранг 2: префикс никнейма'
    )
    assert.match(
      migration060,
      /lower\(p\.display_name\)\s*=\s*lower\(v_clean\)/i,
      'Ранг 3: точное имя'
    )
    assert.match(
      migration060,
      /lower\(p\.display_name\)\s*LIKE\s*lower\(v_clean\)\s*\|\|\s*'\%'/i,
      'Ранг 4: префикс имени'
    )
  })

  test('060_social.sql: search_profiles исключает заблокированных и скрытые профили', () => {
    assert.match(
      migration060,
      /NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.blocks/i,
      'search_profiles должен проверять отсутствие взаимных блокировок в public.blocks'
    )
    assert.match(
      migration060,
      /privacy/i,
      'search_profiles должен проверять настройки приватности'
    )
    assert.match(
      migration060,
      /discoverable/i,
      'search_profiles должен проверять флаг privacy.discoverable'
    )
  })

  test('060_social.sql: block_user удаляет активную дружбу и взаимные подписки', () => {
    assert.match(
      migration060,
      /DELETE\s+FROM\s+public\.friendships/i,
      'block_user должен удалять строки дружбы'
    )
    assert.match(
      migration060,
      /DELETE\s+FROM\s+public\.follows/i,
      'block_user должен удалять взаимные подписки'
    )
  })

  test('UI: единая терминология «Соратники» вместо «Друзья» в навигации', () => {
    const sidebar = fs.readFileSync(
      path.join(process.cwd(), 'components/ogonek/sidebar.tsx'),
      'utf-8'
    )
    const bottomNav = fs.readFileSync(
      path.join(process.cwd(), 'components/ogonek/bottom-nav.tsx'),
      'utf-8'
    )
    const comradesView = fs.readFileSync(
      path.join(process.cwd(), 'components/ogonek/views/comrades-view.tsx'),
      'utf-8'
    )

    assert.match(sidebar, /Соратники/i, 'Sidebar должен содержать пункт «Соратники»')
    assert.match(sidebar, /incomingRequests/i, 'Sidebar должен выводить бейдж входящих заявок')
    assert.match(bottomNav, /Соратники/i, 'BottomNav должен содержать пункт «Соратники»')
    assert.match(bottomNav, /incomingRequests/i, 'BottomNav должен выводить бейдж входящих заявок')

    assert.match(comradesView, /Соратники/i)
    assert.match(comradesView, /Заявки/i)
    assert.match(comradesView, /Найти/i)
    assert.match(comradesView, /Подписки/i)
    assert.match(comradesView, /Группы/i)
  })

  test('UI: пустое состояние «Соратники» содержит 3 обязательных действия и пояснение', () => {
    const comradesView = fs.readFileSync(
      path.join(process.cwd(), 'components/ogonek/views/comrades-view.tsx'),
      'utf-8'
    )

    assert.match(comradesView, /Найти по нику/i, 'Должна быть карточка «Найти по нику»')
    assert.match(comradesView, /Скопировать ссылку-приглашение/i, 'Должна быть карточка «Скопировать ссылку-приглашение»')
    assert.match(comradesView, /Показать QR-код/i, 'Должна быть карточка «Показать QR»')
    assert.match(
      comradesView,
      /Соратник видит записи с видимостью «Соратникам», может писать и звонить/i,
      'Должно быть пояснение про права соратников'
    )
  })

  test('Публичные страницы: /invite/[username] и /u/[username] существуют и содержат нужную разметку', () => {
    const invitePage = fs.readFileSync(
      path.join(process.cwd(), 'app/invite/[username]/page.tsx'),
      'utf-8'
    )
    const userPage = fs.readFileSync(
      path.join(process.cwd(), 'app/u/[username]/page.tsx'),
      'utf-8'
    )
    const inviteClient = fs.readFileSync(
      path.join(process.cwd(), 'app/invite/[username]/invite-client.tsx'),
      'utf-8'
    )

    assert.match(invitePage, /generateMetadata/i, 'Страница инвайта генерирует динамический Open Graph')
    assert.match(invitePage, /Пользователь не найден/i, 'Страница инвайта выводит 404-карточку для несуществующих/скрытых пользователей')
    assert.match(invitePage, /openAuth=register/i, 'Страница инвайта содержит CTA на регистрацию')
    assert.match(userPage, /generateMetadata/i, 'Страница профиля генерирует динамический Open Graph')
    assert.match(inviteClient, /sessionStorage\.setItem\('ogonek_pending_invite_user_id'/i, 'Приглашение сохраняет намерение в sessionStorage')
  })

  test('Автоматическая отправка заявки после регистрации при переходе по ссылке-инвайту', () => {
    const authForm = fs.readFileSync(
      path.join(process.cwd(), 'components/ogonek/auth/auth-form.tsx'),
      'utf-8'
    )

    assert.match(
      authForm,
      /sessionStorage\.getItem\('ogonek_pending_invite_user_id'\)/i,
      'auth-form проверяет наличие отложенного инвайта'
    )
    assert.match(
      authForm,
      /sendFriendRequest\(pendingTarget\)/i,
      'auth-form автоматически отправляет заявку в соратники'
    )
  })

  test('Лента главной страницы HomeView загружает публикации через getFeed(scope)', () => {
    const homeView = fs.readFileSync(
      path.join(process.cwd(), 'components/ogonek/views/home-view.tsx'),
      'utf-8'
    )

    assert.match(homeView, /getFeed\(\s*\{\s*scope/i, 'HomeView вызывает getFeed с scope')
    assert.match(homeView, /handleCopyInvite/i, 'HomeView содержит handleCopyInvite')
    assert.match(homeView, /\/invite\/\$\{refUser\}/i, 'HomeView копирует каноническую ссылку /invite/[username]')
  })
})

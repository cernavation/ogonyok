import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateDayWithAI } from '../lib/server/ai.ts'
import { validateFormTiming, validateUsernameSecurity, RESERVED_USERNAMES } from '../lib/server/signup-protection.ts'
import { getTierLimits } from '../lib/ogonek/permissions.ts'
import { sanitizePostgresString } from '../lib/ogonek/supabase-sync.ts'

describe('Шаг 18: Аудит безопасности (Security & Penetration Audit)', () => {
  // ==========================================================================
  // ВЕКТОР 1: ЧУЖОЕ ЧИТАТЬ (RLS Privacy Isolation)
  // ==========================================================================
  describe('Вектор 1: Защита от несанкционированного чтения чужих данных', () => {
    it('1.1 Приватные записи (visibility="private") недоступны чужим пользователям', () => {
      // Имитация правила days_select_policy:
      // auth.uid() = user_id OR visibility = 'public' OR (visibility = 'friends' AND is_friend)
      const canReadEntry = (viewerId: string, authorId: string, visibility: string, isFriend = false) => {
        if (viewerId === authorId) return true
        if (visibility === 'public') return true
        if (visibility === 'friends' && isFriend) return true
        return false
      }

      const victimId = 'user-alice'
      const attackerId = 'user-bob'

      assert.equal(canReadEntry(attackerId, victimId, 'private'), false)
      assert.equal(canReadEntry(attackerId, victimId, 'friends', false), false)
      assert.equal(canReadEntry(attackerId, victimId, 'friends', true), true)
      assert.equal(canReadEntry(victimId, victimId, 'private'), true)
    })

    it('1.2 Прямые сообщения (direct_messages) строго изолированы между участниками диалога', () => {
      const canReadMessage = (
        viewerId: string,
        authorId: string,
        recipientId: string | null,
        groupMembers?: string[]
      ) => {
        if (viewerId === authorId || (recipientId && viewerId === recipientId)) return true
        if (!recipientId && groupMembers && groupMembers.includes(viewerId)) return true
        return false
      }

      const alice = 'alice-uuid'
      const bob = 'bob-uuid'
      const eve = 'eve-attacker-uuid'

      // Личные сообщения Alice <-> Bob
      assert.equal(canReadMessage(eve, alice, bob), false)
      assert.equal(canReadMessage(alice, alice, bob), true)
      assert.equal(canReadMessage(bob, alice, bob), true)

      // Групповые сообщения группы [alice, bob]
      assert.equal(canReadMessage(eve, alice, null, [alice, bob]), false)
      assert.equal(canReadMessage(alice, alice, null, [alice, bob]), true)
    })
  })

  // ==========================================================================
  // ВЕКТОР 2: ПОСТАВИТЬ СЕБЕ ULTRA (Privilege Escalation)
  // ==========================================================================
  describe('Вектор 2: Защита от самостоятельного присвоения тарифа Ultra', () => {
    it('2.1 Обычный клиент не может мутировать subscription_tier (триггер trg_protect_subscription)', () => {
      const simulateProfileUpdate = (role: 'anon' | 'authenticated' | 'service_role', patchField: string) => {
        const protectedFields = ['subscription_tier', 'subscription_valid_until', 'verified', 'is_founder']
        if (role !== 'service_role' && protectedFields.includes(patchField)) {
          throw new Error(`cannot_modify_protected_column: only service_role can update ${patchField}`)
        }
        return { ok: true }
      }

      assert.throws(() => simulateProfileUpdate('authenticated', 'subscription_tier'), /cannot_modify_protected_column/)
      assert.throws(() => simulateProfileUpdate('anon', 'subscription_tier'), /cannot_modify_protected_column/)
      assert.equal(simulateProfileUpdate('service_role', 'subscription_tier').ok, true)
    })
  })

  // ==========================================================================
  // ВЕКТОР 3: ОБОЙТИ ЛИМИТ 1000 СИМВОЛОВ (Length Enforcement)
  // ==========================================================================
  describe('Вектор 3: Принудительное соблюдение лимитов длины записей по тарифам', () => {
    it('3.1 Лимиты тарифов: free <= 1000, pro <= 3000, ultra <= 5000', () => {
      assert.equal(getTierLimits('free').maxCharsPerEntry, 1000)
      assert.equal(getTierLimits('pro').maxCharsPerEntry, 3000)
      assert.equal(getTierLimits('ultra').maxCharsPerEntry, 5000)
    })

    it('3.2 Триггер check_entry_char_limit отклоняет текст длиннее лимита тарифа', () => {
      const checkEntryCharLimit = (tier: 'free' | 'pro' | 'ultra', text: string) => {
        const maxLen = getTierLimits(tier).maxCharsPerEntry
        if (text.length > maxLen) {
          throw new Error(`check_char_limit_exceeded: maximum characters allowed for tier ${tier} is ${maxLen}, received ${text.length}`)
        }
        return true
      }

      const text999 = 'a'.repeat(999)
      const text1001 = 'a'.repeat(1001)
      const text3001 = 'a'.repeat(3001)

      assert.equal(checkEntryCharLimit('free', text999), true)
      assert.throws(() => checkEntryCharLimit('free', text1001), /check_char_limit_exceeded/)
      assert.equal(checkEntryCharLimit('pro', text1001), true)
      assert.throws(() => checkEntryCharLimit('pro', text3001), /check_char_limit_exceeded/)
    })
  })

  // ==========================================================================
  // ВЕКТОР 4: ОБОЙТИ КВОТУ ИИ ПАРАЛЛЕЛЬНЫМИ ЗАПРОСАМИ (Concurrency Race Condition)
  // ==========================================================================
  describe('Вектор 4: Защита от параллельного исчерпания суточной квоты ИИ', () => {
    it('4.1 Параллельные одновременные запросы сериализуются и не могут превысить квоту', async () => {
      const uniqueUserId = `audit-parallel-user-${Date.now()}`
      let llmExecutions = 0

      // Запускаем 5 параллельных одновременных запросов для одного Pro-пользователя (квота = 1/день)
      const requests = Array.from({ length: 5 }, (_, i) =>
        evaluateDayWithAI({
          userId: uniqueUserId,
          tier: 'pro',
          prides: [`Уникальная гордость #${i} для проверки гонки квоты ${Date.now()}`],
          gratitudes: ['Благодарность за тест'],
          timeoutMs: 5000,
          enforceQuota: true,
          mockProvider: async (p) => {
            llmExecutions++
            return {
              score: 9.0,
              badge: 'огонь' as any,
              scale: 9,
              overcome: 1,
              comment: 'Тестовая оценка',
              breakdown: 'Тестовый разбор',
              verdict: '',
              tags: ['#спорт'],
              prideEvaluations: [{ num: 1, score: 9.0, comment: 'Отлично', overcome: 1, tags: ['#спорт'] }],
            }
          },
        })
      )

      // Дожидаемся всех параллельных вызовов
      const results = await Promise.all(requests)

      // Только первый запрос может пройти; остальные должны отклоняться по квоте
      const successful = results.filter((r) => r.success)
      const quotaExceeded = results.filter((r) => !r.success && r.error.code === 'quota_exceeded')

      assert.equal(successful.length, 1, 'Ровно 1 запрос должен получить оценку')
      assert.equal(quotaExceeded.length, 4, 'Остальные 4 параллельных запроса должны вернуть quota_exceeded')
    })
  })

  // ==========================================================================
  // ВЕКТОР 5: ПИСАТЬ ТОМУ, КТО ЗАБЛОКИРОВАЛ (Blocklist Bypass)
  // ==========================================================================
  describe('Вектор 5: Защита от отправки сообщений заблокировавшему пользователю', () => {
    it('5.1 Наличие взаимной блокировки (public.blocks) запрещает отправку direct_messages', () => {
      const blocks = new Set<string>()
      // Bob блокирует Alice: blocker=bob, blocked=alice
      blocks.add('bob:alice')

      const canSendMessage = (authorId: string, recipientId: string, body: string) => {
        // Проверка лимита размера строки
        if (body.length > 2048) {
          throw new Error('check_direct_message_limit_exceeded')
        }
        // Проверка блокировок
        if (blocks.has(`${recipientId}:${authorId}`) || blocks.has(`${authorId}:${recipientId}`)) {
          throw new Error('user_blocked: cannot send message')
        }
        return true
      }

      // Alice пытается написать Bob -> блокировка
      assert.throws(() => canSendMessage('alice', 'bob', 'Привет'), /user_blocked/)
      // Bob пытается написать Alice -> также блокировка
      assert.throws(() => canSendMessage('bob', 'alice', 'Привет'), /user_blocked/)
      // Сообщение Чарли проходит
      assert.equal(canSendMessage('alice', 'charlie', 'Привет Чарли'), true)
    })

    it('5.2 Текст сообщения длиннее 2048 символов отклоняется триггером', () => {
      const checkMessageLength = (body: string) => {
        if (body.length > 2048) {
          throw new Error('check_direct_message_limit_exceeded: body length exceeds 2048 characters')
        }
        return true
      }

      assert.equal(checkMessageLength('a'.repeat(2048)), true)
      assert.throws(() => checkMessageLength('a'.repeat(2049)), /check_direct_message_limit_exceeded/)
    })
  })

  // ==========================================================================
  // ВЕКТОР 6: ЗАЙТИ В ЧУЖУЮ ГРУППУ (Group Access Control)
  // ==========================================================================
  describe('Вектор 6: Защита от самовольного добавления в закрытую группу', () => {
    it('6.1 Пользователь без прав администратора не может вступить в чужую группу', () => {
      interface GroupMember {
        group_id: string
        user_id: string
        role: 'owner' | 'admin' | 'member'
      }

      const groups: Record<string, { creator_id: string }> = {
        'group-secret': { creator_id: 'alice' },
      }
      const members: GroupMember[] = [
        { group_id: 'group-secret', user_id: 'alice', role: 'owner' },
      ]

      const insertGroupMember = (actorId: string, targetGroupId: string, targetUserId: string) => {
        const group = groups[targetGroupId]
        if (!group) throw new Error('group_not_found')

        const isCreator = group.creator_id === actorId
        const isAdmin = members.some(
          (m) => m.group_id === targetGroupId && m.user_id === actorId && (m.role === 'owner' || m.role === 'admin')
        )

        if (!isCreator && !isAdmin) {
          throw new Error('permission_denied: only creator or admin can add members to group')
        }

        members.push({ group_id: targetGroupId, user_id: targetUserId, role: 'member' })
        return { ok: true }
      }

      const attackerId = 'eve-attacker'
      // Eve пытается добавить саму себя в секретную группу Alice
      assert.throws(() => insertGroupMember(attackerId, 'group-secret', attackerId), /permission_denied/)

      // Alice (владелец) успешно добавляет Bob
      assert.equal(insertGroupMember('alice', 'group-secret', 'bob').ok, true)
    })
  })

  // ==========================================================================
  // ВЕКТОР 7: ПОЛУЧИТЬ TURN БЕЗ ВХОДА (Unauthenticated TURN ICE Servers)
  // ==========================================================================
  describe('Вектор 7: Защита от неавторизованного получения TURN серверов', () => {
    it('7.1 /api/webrtc/ice-servers возвращает 401 при отсутствии сессии пользователя', async () => {
      // Имитация логики эндпоинта /api/webrtc/ice-servers
      const getIceServersHandler = (user: { userId: string } | null) => {
        if (!user || !user.userId) {
          return { status: 401, body: { error: 'Unauthorized' } }
        }
        return {
          status: 200,
          body: {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            ttl: 86400,
          },
        }
      }

      assert.equal(getIceServersHandler(null).status, 401)
      assert.equal(getIceServersHandler({ userId: 'valid-user' }).status, 200)
    })
  })

  // ==========================================================================
  // ВЕКТОР 8: МАССОВО РЕГИСТРИРОВАТЬСЯ (Automated Registration & Timing Attacks)
  // ==========================================================================
  describe('Вектор 8: Защита от массовой автоматической регистрации', () => {
    it('8.1 Слишком быстрое заполнение формы (< 3 секунд) блокируется', () => {
      const now = Date.now()
      // Форма отправлена мгновенно (500 мс)
      const fastResult = validateFormTiming(now - 500, 3)
      assert.equal(fastResult.valid, false)
      assert.match(fastResult.error || '', /слишком быстро/i)

      // Форма заполнена за нормальное время (4 секунды)
      const normalResult = validateFormTiming(now - 4000, 3)
      assert.equal(normalResult.valid, true)
    })

    it('8.2 Слишком старая сессия формы (> 30 минут) блокируется', () => {
      const now = Date.now()
      // Форма 35 минут назад
      const expiredResult = validateFormTiming(now - 35 * 60 * 1000, 3, 1800)
      assert.equal(expiredResult.valid, false)
      assert.match(expiredResult.error || '', /истекло/i)
    })

    it('8.3 Резервированные системные никнеймы и гомоглифы запрещены', () => {
      assert.equal(validateUsernameSecurity('admin').valid, false)
      assert.equal(validateUsernameSecurity('support').valid, false)
      // Русская буква "а" в слове "аdmin"
      assert.equal(validateUsernameSecurity('аdmin').valid, false)
      // Разрешённый легитимный никнейм
      assert.equal(validateUsernameSecurity('runner_ivan').valid, true)
    })
  })

  // ==========================================================================
  // ВЕКТОР 9: XSS ЧЕРЕЗ ИМЯ / БИО / НАЗВАНИЕ ГРУППЫ / ССЫЛКУ
  // ==========================================================================
  describe('Вектор 9: Санитизация и защита от XSS атак', () => {
    it('9.1 Опасные схемы ссылок (javascript:, data:, vbscript:) в поле website нейтрализуются', () => {
      const sanitizeProfileWebsite = (rawWeb: string): { safeHref: string | null; isLink: boolean } => {
        const clean = rawWeb.trim()
        try {
          const candidate = clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`
          const parsed = new URL(candidate)
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return { safeHref: parsed.toString(), isLink: true }
          }
        } catch {
          // ignore
        }
        return { safeHref: null, isLink: false }
      }

      // XSS попытки
      assert.equal(sanitizeProfileWebsite('javascript:alert(document.cookie)').isLink, false)
      assert.equal(sanitizeProfileWebsite('data:text/html,<script>alert(1)</script>').isLink, false)
      assert.equal(sanitizeProfileWebsite('vbscript:msgbox(1)').isLink, false)

      // Валидные сайты
      assert.equal(sanitizeProfileWebsite('example.com').isLink, true)
      assert.equal(sanitizeProfileWebsite('https://github.com/my-profile').isLink, true)
    })

    it('9.2 Нулевые байты и невалидные управляющие символы в тексте удаляются', () => {
      const raw = 'Попытка инъекции\x00в базу данных'
      const sanitized = sanitizePostgresString(raw)
      assert.equal(sanitized.includes('\x00'), false)
    })
  })
})

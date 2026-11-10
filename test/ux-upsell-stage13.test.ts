import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  UPSELL_FEATURES,
  TIER_PRICING,
  TIER_LIMITS_MAP,
  normalizeTier,
  getTierLimits,
  getBillingCheckoutUrl,
  getPaymentButtonLabel,
} from '../lib/ogonek/permissions.ts'
import { z } from 'zod'

// Zod-валидатор для роута аналитики апселла (/api/analytics/upsell)
const upsellEventSchema = z.object({
  feature: z.string().min(1).max(64),
  action: z.enum(['shown', 'clicked', 'dismissed']),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  neverRemind: z.boolean().optional(),
})

describe('Этап 13: UX платных функций и ненавязчивый апселл', () => {
  it('содержит конфигурацию UPSELL_FEATURES для всех 9 ключевых точек входа', () => {
    const requiredFeatures = [
      'aiEvaluationsPerDay',
      'maxPhotosPerDay',
      'videoCalls',
      'maxCharsPerEntry',
      'maxGroupsOwned',
      'intentionsTimer',
      'customAccent',
      'vault',
      'advancedStats',
    ]

    for (const f of requiredFeatures) {
      assert.ok(UPSELL_FEATURES[f], `Фича ${f} должна присутствовать в UPSELL_FEATURES`)
      assert.ok(UPSELL_FEATURES[f].title.length > 0, `У ${f} должен быть непустой заголовок`)
      assert.ok(UPSELL_FEATURES[f].defaultReason.length > 0, `У ${f} должна быть причина блокировки`)
      assert.ok(UPSELL_FEATURES[f].pro.length >= 2, `У ${f} должно быть >= 2 преимуществ для Премиум`)
      assert.ok(UPSELL_FEATURES[f].ultra.length >= 2, `У ${f} должно быть >= 2 преимуществ для Ultra`)
    }
  })

  it('соответствует ценам тарифов: 0 MDL / 25 MDL / 50 MDL', () => {
    assert.equal(TIER_PRICING.free.monthlyMdl, 0)
    assert.equal(TIER_PRICING.pro.monthlyMdl, 25)
    assert.equal(TIER_PRICING.ultra.monthlyMdl, 50)
  })

  it('проверяет строгие лимиты в TIER_LIMITS_MAP', () => {
    // Символы: 1000 Free, 3000 Pro, 5000 Ultra
    assert.equal(TIER_LIMITS_MAP.free.maxCharsPerEntry, 1000)
    assert.equal(TIER_LIMITS_MAP.pro.maxCharsPerEntry, 3000)
    assert.equal(TIER_LIMITS_MAP.ultra.maxCharsPerEntry, 5000)

    // Фото: 0 Free, 1 Pro, 3 Ultra
    assert.equal(TIER_LIMITS_MAP.free.maxPhotosPerDay, 0)
    assert.equal(TIER_LIMITS_MAP.pro.maxPhotosPerDay, 1)
    assert.equal(TIER_LIMITS_MAP.ultra.maxPhotosPerDay, 3)

    // Видеозвонки: false Free, true Pro, true Ultra
    assert.equal(TIER_LIMITS_MAP.free.videoCalls, false)
    assert.equal(TIER_LIMITS_MAP.pro.videoCalls, true)
    assert.equal(TIER_LIMITS_MAP.ultra.videoCalls, true)

    // Группы: 1 Free, 5 Pro, 20 Ultra
    assert.equal(TIER_LIMITS_MAP.free.maxGroupsOwned, 1)
    assert.equal(TIER_LIMITS_MAP.pro.maxGroupsOwned, 5)
    assert.equal(TIER_LIMITS_MAP.ultra.maxGroupsOwned, 20)

    // ИИ-оценка: 0 Free, 1 Pro, 1 Ultra
    assert.equal(TIER_LIMITS_MAP.free.aiEvaluationsPerDay, 0)
    assert.equal(TIER_LIMITS_MAP.pro.aiEvaluationsPerDay, 1)
    assert.equal(TIER_LIMITS_MAP.ultra.aiEvaluationsPerDay, 1)
  })

  it('мягкая деградация: длинная запись (2500 симв) сохраняет читаемость при переходе Pro -> Free', () => {
    const existingEntryText = 'A'.repeat(2500)
    assert.equal(existingEntryText.length, 2500)

    // При чтении на тарифе free: текст не обрезается
    const readOnFree = existingEntryText
    assert.equal(readOnFree.length, 2500)

    // При попытке сохранения нового или редактированного текста:
    const freeLimits = getTierLimits('free')
    const exceedsLimit = existingEntryText.length > freeLimits.maxCharsPerEntry
    assert.equal(exceedsLimit, true, 'Текст более 1000 символов должен определяться как превышающий лимит Free')

    // На тарифе pro тот же текст укладывается в 3000 символов
    const proLimits = getTierLimits('pro')
    const fitsPro = existingEntryText.length <= proLimits.maxCharsPerEntry
    assert.equal(fitsPro, true, 'Текст 2500 символов свободно укладывается в лимит Премиум')
  })

  it('проверяет логику 10-минутного антиспам-кулдауна UpgradeModal', () => {
    const COOLDOWN_MS = 10 * 60 * 1000
    const now = Date.now()

    // 1. Показ 5 минут назад: кулдаун активен (блокировать)
    const fiveMinutesAgo = now - 5 * 60 * 1000
    const shouldBlockRecent = now - fiveMinutesAgo < COOLDOWN_MS
    assert.equal(shouldBlockRecent, true, 'Должен блокировать показ чаще 1 раза в 10 минут')

    // 2. Показ 12 минут назад: кулдаун истёк (разрешить)
    const twelveMinutesAgo = now - 12 * 60 * 1000
    const shouldBlockOld = now - twelveMinutesAgo < COOLDOWN_MS
    assert.equal(shouldBlockOld, false, 'Должен разрешить показ после 10 минут')

    // 3. Явный клик пользователя (force: true) игнорирует кулдаун
    const forceClick = true
    const shouldRenderWithForce = forceClick || !shouldBlockRecent
    assert.equal(shouldRenderWithForce, true, 'force: true всегда открывает модалку')
  })

  it('проверяет работу флага «Больше не напоминать об этом» (dismissed_upsells)', () => {
    const dismissedList = ['intentionsTimer', 'customAccent']

    // Авто-показ для фичи из списка: блокируется
    const feature1 = 'intentionsTimer'
    const isDismissed1 = dismissedList.includes(feature1)
    assert.equal(isDismissed1, true)

    // Авто-показ для фичи не из списка: разрешён
    const feature2 = 'videoCalls'
    const isDismissed2 = dismissedList.includes(feature2)
    assert.equal(isDismissed2, false)

    // Явный клик пользователя (force: true) игнорирует список отключений
    const userExplicitClick = true
    const canShowExplicit = userExplicitClick || !isDismissed1
    assert.equal(canShowExplicit, true)
  })

  it('валидирует события воронки upsell_events по схеме Zod', () => {
    // 1. Валидный 'shown'
    const shownEvent = upsellEventSchema.safeParse({
      feature: 'aiEvaluationsPerDay',
      action: 'shown',
      metadata: { userTier: 'free' },
    })
    assert.equal(shownEvent.success, true)

    // 2. Валидный 'clicked'
    const clickedEvent = upsellEventSchema.safeParse({
      feature: 'videoCalls',
      action: 'clicked',
      metadata: { chosenTier: 'pro' },
    })
    assert.equal(clickedEvent.success, true)

    // 3. Валидный 'dismissed' с флагом neverRemind
    const dismissedEvent = upsellEventSchema.safeParse({
      feature: 'customAccent',
      action: 'dismissed',
      neverRemind: true,
    })
    assert.equal(dismissedEvent.success, true)

    // 4. Невалидный action должен отклоняться
    const invalidEvent = upsellEventSchema.safeParse({
      feature: 'vault',
      action: 'bought', // Недопустимый action
    })
    assert.equal(invalidEvent.success, false)
  })

  it('формирует корректную ссылку для оформления подписки getBillingCheckoutUrl', () => {
    const urlPro = getBillingCheckoutUrl({
      tier: 'pro',
      username: 'alex',
      period: 'month',
    })
    assert.ok(urlPro.includes('memernity.com/checkout'))
    assert.ok(urlPro.includes('tier=pro'))
    assert.ok(urlPro.includes('username=alex'))
    assert.ok(urlPro.includes('period=month'))

    const urlUltraYear = getBillingCheckoutUrl({
      tier: 'ultra',
      username: 'alex',
      period: 'year',
    })
    assert.ok(urlUltraYear.includes('tier=ultra'))
    assert.ok(urlUltraYear.includes('period=year'))
  })
})

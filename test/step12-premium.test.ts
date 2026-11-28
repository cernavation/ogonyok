import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  TIER_PRICES,
  TIER_FEATURES_LIST,
  TIER_NAMES,
  getBillingCheckoutUrl,
  getPaymentButtonLabel,
  checkSubscriptionStatus,
  normalizeTier,
  canCreatePride,
  canAddPhoto,
  canMakeVideoCall,
  canCreateGroup,
  canRequestAiEvaluation,
  getTierLimits,
} from '../lib/ogonek/permissions.ts'

describe('Step 12: Premium & Upgrade permissions and logic', () => {
  it('defines correct pricing for Free, Pro, and Ultra', () => {
    assert.equal(TIER_PRICES.free.monthly, 0)
    assert.equal(TIER_PRICES.free.yearly, 0)
    assert.equal(TIER_PRICES.free.formattedMonthly, '0 MDL')

    assert.equal(TIER_PRICES.pro.monthly, 20)
    assert.equal(TIER_PRICES.pro.oldMonthly, 30)
    assert.equal(TIER_PRICES.pro.yearly, 192)
    assert.equal(TIER_PRICES.pro.currency, 'MDL')
    assert.equal(TIER_PRICES.pro.discountBadge, '-20%')

    assert.equal(TIER_PRICES.ultra.monthly, 50)
    assert.equal(TIER_PRICES.ultra.yearly, 480)
    assert.equal(TIER_PRICES.ultra.currency, 'MDL')
    assert.equal(TIER_PRICES.ultra.discountBadge, '-20%')
  })

  it('exposes feature lists for each tier from permissions', () => {
    assert.ok(TIER_FEATURES_LIST.free.length >= 5)
    assert.ok(TIER_FEATURES_LIST.pro.length >= 5)
    assert.ok(TIER_FEATURES_LIST.ultra.length >= 5)

    const freeChars = TIER_FEATURES_LIST.free.find((f) => f.id === 'chars')
    assert.ok(freeChars?.text.includes('1 000'))

    const proChars = TIER_FEATURES_LIST.pro.find((f) => f.id === 'chars')
    assert.ok(proChars?.text.includes('3 000'))

    const ultraChars = TIER_FEATURES_LIST.ultra.find((f) => f.id === 'chars')
    assert.ok(ultraChars?.text.includes('5 000'))
  })

  it('generates canonical Memernity checkout URLs', () => {
    const urlMonthly = getBillingCheckoutUrl('pro', 'alex_cerna', 'month')
    assert.equal(
      urlMonthly,
      'https://memernity.com/checkout?service=ogonek&tier=pro&username=alex_cerna&period=month'
    )

    const urlYearly = getBillingCheckoutUrl('ultra', 'cernavation', 'year')
    assert.equal(
      urlYearly,
      'https://memernity.com/checkout?service=ogonek&tier=ultra&username=cernavation&period=year'
    )
  })

  it('determines payment button labels based on current and target tier', () => {
    assert.equal(getPaymentButtonLabel('free', 'pro'), 'Оформить')
    assert.equal(getPaymentButtonLabel('pro', 'pro'), 'Продлить')
    assert.equal(getPaymentButtonLabel('pro', 'ultra'), 'Улучшить до Ultra')
    assert.equal(getPaymentButtonLabel('ultra', 'ultra'), 'Продлить')
  })

  it('detects 3-day advance subscription expiration warning', () => {
    const now = Date.now()

    // Expiring in 2 days
    const twoDaysLater = new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString()
    const statusExpiringSoon = checkSubscriptionStatus('pro', twoDaysLater)
    assert.equal(statusExpiringSoon.effectiveTier, 'pro')
    assert.equal(statusExpiringSoon.isPaid, true)
    assert.equal(statusExpiringSoon.isExpired, false)
    assert.equal(statusExpiringSoon.isExpiringSoon, true)
    assert.ok(statusExpiringSoon.daysRemaining === 2 || statusExpiringSoon.daysRemaining === 3)

    // Expiring in 30 days
    const monthLater = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()
    const statusFar = checkSubscriptionStatus('pro', monthLater)
    assert.equal(statusFar.isExpiringSoon, false)
    assert.equal(statusFar.isExpired, false)

    // Already expired yesterday
    const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString()
    const statusExpired = checkSubscriptionStatus('pro', yesterday)
    assert.equal(statusExpired.effectiveTier, 'free')
    assert.equal(statusExpired.isExpired, true)
    assert.equal(statusExpired.isPaid, false)
    assert.equal(statusExpired.isExpiringSoon, false)
  })

  it('handles graceful degradation pro -> free on 2500 char pride', () => {
    // While Pro is active: 2500 characters pride is allowed
    const activeProCheck = canCreatePride('pro', 2500)
    assert.equal(activeProCheck.allowed, true)
    assert.equal(activeProCheck.max, 3000)

    // When subscription expires, user drops to free:
    const expiredDate = new Date(Date.now() - 10000).toISOString()
    const effectiveTier = normalizeTier('pro', expiredDate)
    assert.equal(effectiveTier, 'free')

    // On Free tier, editing 2500 chars is blocked and requests trimming to 1000:
    const freeCheck = canCreatePride(effectiveTier, 2500)
    assert.equal(freeCheck.allowed, false)
    assert.equal(freeCheck.max, 1000)
    assert.ok(freeCheck.error?.includes('1000'))

    // Once trimmed to 950 chars, allowed:
    const trimmedCheck = canCreatePride(effectiveTier, 950)
    assert.equal(trimmedCheck.allowed, true)
  })

  it('checks entitlement for gated actions across Free, Pro, and Ultra', () => {
    // Photos
    assert.equal(canAddPhoto('free', 0).allowed, false)
    assert.equal(canAddPhoto('pro', 0).allowed, true)
    assert.equal(canAddPhoto('pro', 1).allowed, false) // 1 photo/day on Pro
    assert.equal(canAddPhoto('ultra', 1).allowed, true) // 3 photos/day on Ultra

    // Video calls
    assert.equal(canMakeVideoCall('free'), false)
    assert.equal(canMakeVideoCall('pro'), true)
    assert.equal(canMakeVideoCall('ultra'), true)

    // AI evaluation
    assert.equal(canRequestAiEvaluation('free', 0).allowed, false)
    assert.equal(canRequestAiEvaluation('pro', 0).allowed, true)
    assert.equal(canRequestAiEvaluation('pro', 1).allowed, false)

    // Groups limit
    assert.equal(canCreateGroup('free', 0).allowed, true)
    assert.equal(canCreateGroup('free', 1).allowed, false) // Free limit is 1 group
    assert.equal(canCreateGroup('pro', 1).allowed, true) // Pro limit is 5 groups
    assert.equal(canCreateGroup('ultra', 5).allowed, true) // Ultra limit is 20 groups
  })
})

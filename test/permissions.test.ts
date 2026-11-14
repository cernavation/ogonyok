import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  TIER_NAMES,
  TIER_BADGES,
  TIER_LIMITS_MAP,
  normalizeTier,
  getTierLimits,
  canCreatePride,
  canAddPhoto,
  canMakeVideoCall,
  canCreateStory,
  canScheduleMessage,
  canRequestAiEvaluation,
  isPaidTierActive,
  getBillingCheckoutUrl,
  getPaymentButtonLabel,
} from '../lib/ogonek/permissions.ts'

describe('Тарифная система: Константы и Имена (Этап 4)', () => {
  it('1. Названия тарифов соответствуют Базовый / Премиум / Основатель Ultra', () => {
    assert.equal(TIER_NAMES.free, 'Базовый')
    assert.equal(TIER_NAMES.pro, 'Премиум')
    assert.equal(TIER_NAMES.ultra, 'Основатель Ultra')
  })

  it('2. Бейджи тарифов: free=null, pro=★ PREMIUM, ultra=⚡ ULTRA FOUNDER', () => {
    assert.equal(TIER_BADGES.free, null)
    assert.equal(TIER_BADGES.pro, '★ PREMIUM')
    assert.equal(TIER_BADGES.ultra, '⚡ ULTRA FOUNDER')
  })
})

describe('Тарифная система: normalizeTier и обработка сроков (Этап 4)', () => {
  it('3. normalizeTier: возвращает free для пустых и невалидных значений', () => {
    assert.equal(normalizeTier(null), 'free')
    assert.equal(normalizeTier(undefined), 'free')
    assert.equal(normalizeTier(''), 'free')
    assert.equal(normalizeTier('unknown_plan'), 'free')
    assert.equal(normalizeTier(123), 'free')
  })

  it('4. normalizeTier: возвращает pro для pro', () => {
    assert.equal(normalizeTier('pro'), 'pro')
    assert.equal(normalizeTier('PRO'), 'pro')
    assert.equal(normalizeTier('  pro  '), 'pro')
  })

  it('5. normalizeTier: мигрирует устаревшее premium в pro', () => {
    assert.equal(normalizeTier('premium'), 'pro')
    assert.equal(normalizeTier('PREMIUM'), 'pro')
  })

  it('6. normalizeTier: возвращает ultra для ultra', () => {
    assert.equal(normalizeTier('ultra'), 'ultra')
    assert.equal(normalizeTier('ULTRA'), 'ultra')
  })

  it('7. normalizeTier: сбрасывает в free, если validUntil в прошлом', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    assert.equal(normalizeTier('pro', past), 'free')
    assert.equal(normalizeTier('ultra', past), 'free')
    assert.equal(normalizeTier('premium', past), 'free')
  })

  it('8. normalizeTier: сохраняет тариф, если validUntil в будущем', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
    assert.equal(normalizeTier('pro', future), 'pro')
    assert.equal(normalizeTier('ultra', future), 'ultra')
  })

  it('9. normalizeTier: сохраняет free независимо от даты', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
    assert.equal(normalizeTier('free', future), 'free')
  })
})

describe('Тарифная система: Лимиты TIER_LIMITS_MAP и getTierLimits (Этап 4)', () => {
  it('10. maxCharsPerEntry: free=1000, pro=3000, ultra=5000', () => {
    assert.equal(getTierLimits('free').maxCharsPerEntry, 1000)
    assert.equal(getTierLimits('pro').maxCharsPerEntry, 3000)
    assert.equal(getTierLimits('ultra').maxCharsPerEntry, 5000)
  })

  it('11. aiEvaluationsPerDay: free=0, pro=1, ultra=1', () => {
    assert.equal(getTierLimits('free').aiEvaluationsPerDay, 0)
    assert.equal(getTierLimits('pro').aiEvaluationsPerDay, 1)
    assert.equal(getTierLimits('ultra').aiEvaluationsPerDay, 1)
  })

  it('12. maxPhotosPerDay: free=0, pro=1, ultra=3', () => {
    assert.equal(getTierLimits('free').maxPhotosPerDay, 0)
    assert.equal(getTierLimits('pro').maxPhotosPerDay, 1)
    assert.equal(getTierLimits('ultra').maxPhotosPerDay, 3)
  })

  it('13. maxGroupsOwned: free=1, pro=5, ultra=20', () => {
    assert.equal(getTierLimits('free').maxGroupsOwned, 1)
    assert.equal(getTierLimits('pro').maxGroupsOwned, 5)
    assert.equal(getTierLimits('ultra').maxGroupsOwned, 20)
  })

  it('14. maxGroupMembers: free=5, pro=25, ultra=100', () => {
    assert.equal(getTierLimits('free').maxGroupMembers, 5)
    assert.equal(getTierLimits('pro').maxGroupMembers, 25)
    assert.equal(getTierLimits('ultra').maxGroupMembers, 100)
  })

  it('15. maxStoriesPerDay: free=1, pro=5, ultra=15', () => {
    assert.equal(getTierLimits('free').maxStoriesPerDay, 1)
    assert.equal(getTierLimits('pro').maxStoriesPerDay, 5)
    assert.equal(getTierLimits('ultra').maxStoriesPerDay, 15)
  })

  it('16. maxScheduledMessages: free=3, pro=20, ultra=100', () => {
    assert.equal(getTierLimits('free').maxScheduledMessages, 3)
    assert.equal(getTierLimits('pro').maxScheduledMessages, 20)
    assert.equal(getTierLimits('ultra').maxScheduledMessages, 100)
  })

  it('17. maxVoiceSeconds: free=60, pro=300, ultra=600', () => {
    assert.equal(getTierLimits('free').maxVoiceSeconds, 60)
    assert.equal(getTierLimits('pro').maxVoiceSeconds, 300)
    assert.equal(getTierLimits('ultra').maxVoiceSeconds, 600)
  })

  it('18. videoCalls: free=false, pro=true, ultra=true', () => {
    assert.equal(getTierLimits('free').videoCalls, false)
    assert.equal(getTierLimits('pro').videoCalls, true)
    assert.equal(getTierLimits('ultra').videoCalls, true)
  })

  it('19. milestoneReport: free=basic, pro=stats, ultra=deep', () => {
    assert.equal(getTierLimits('free').milestoneReport, 'basic')
    assert.equal(getTierLimits('pro').milestoneReport, 'stats')
    assert.equal(getTierLimits('ultra').milestoneReport, 'deep')
  })

  it('20. statsDepth: free=basic, pro=advanced, ultra=advanced', () => {
    assert.equal(getTierLimits('free').statsDepth, 'basic')
    assert.equal(getTierLimits('pro').statsDepth, 'advanced')
    assert.equal(getTierLimits('ultra').statsDepth, 'advanced')
  })

  it('21. getTierLimits для истёкшей подписки возвращает лимиты free', () => {
    const expired = new Date(Date.now() - 5000).toISOString()
    const limits = getTierLimits('ultra', expired)
    assert.equal(limits.maxCharsPerEntry, 1000)
    assert.equal(limits.videoCalls, false)
    assert.equal(limits.maxPhotosPerDay, 0)
  })
})

describe('Тарифная система: Функции проверки прав (Этап 4)', () => {
  it('22. canCreatePride: разрешает текст <= лимита', () => {
    assert.equal(canCreatePride('free', 999).allowed, true)
    assert.equal(canCreatePride('free', 1000).allowed, true)
    assert.equal(canCreatePride('pro', 3000).allowed, true)
    assert.equal(canCreatePride('ultra', 5000).allowed, true)
  })

  it('23. canCreatePride: отклоняет текст > лимита и выдает ошибку', () => {
    const freeRes = canCreatePride('free', 1001)
    assert.equal(freeRes.allowed, false)
    assert.match(freeRes.error || '', /1001 \/ 1000/)

    const proRes = canCreatePride('pro', 3001)
    assert.equal(proRes.allowed, false)

    const ultraRes = canCreatePride('ultra', 5001)
    assert.equal(ultraRes.allowed, false)
  })

  it('24. canAddPhoto: запрещает фото на free', () => {
    const res = canAddPhoto('free', 0)
    assert.equal(res.allowed, false)
    assert.match(res.error || '', /только на тарифах/i)
  })

  it('25. canAddPhoto: контролирует лимит на pro (1 фото)', () => {
    assert.equal(canAddPhoto('pro', 0).allowed, true)
    assert.equal(canAddPhoto('pro', 1).allowed, false)
  })

  it('26. canAddPhoto: контролирует лимит на ultra (3 фото)', () => {
    assert.equal(canAddPhoto('ultra', 0).allowed, true)
    assert.equal(canAddPhoto('ultra', 2).allowed, true)
    assert.equal(canAddPhoto('ultra', 3).allowed, false)
  })

  it('27. canMakeVideoCall: блокирует free и разрешает pro/ultra', () => {
    assert.equal(canMakeVideoCall('free'), false)
    assert.equal(canMakeVideoCall('pro'), true)
    assert.equal(canMakeVideoCall('ultra'), true)
  })

  it('28. canCreateStory: проверяет лимиты сторис', () => {
    assert.equal(canCreateStory('free', 0).allowed, true)
    assert.equal(canCreateStory('free', 1).allowed, false)
    assert.equal(canCreateStory('pro', 4).allowed, true)
    assert.equal(canCreateStory('pro', 5).allowed, false)
  })

  it('29. canScheduleMessage: проверяет лимиты отложенных сообщений', () => {
    assert.equal(canScheduleMessage('free', 2).allowed, true)
    assert.equal(canScheduleMessage('free', 3).allowed, false)
    assert.equal(canScheduleMessage('pro', 19).allowed, true)
    assert.equal(canScheduleMessage('pro', 20).allowed, false)
  })

  it('30. canRequestAiEvaluation: блокирует free и разрешает 1 раз в сутки на pro/ultra', () => {
    assert.equal(canRequestAiEvaluation('free', 0).allowed, false)
    assert.equal(canRequestAiEvaluation('pro', 0).allowed, true)
    assert.equal(canRequestAiEvaluation('pro', 1).allowed, false)
  })

  it('31. isPaidTierActive: возвращает true только для активных pro/ultra', () => {
    assert.equal(isPaidTierActive('free'), false)
    assert.equal(isPaidTierActive('pro'), true)
    assert.equal(isPaidTierActive('ultra'), true)
    assert.equal(isPaidTierActive('pro', new Date(Date.now() - 1000).toISOString()), false)
  })

  it('32. getBillingCheckoutUrl: генерирует корректную ссылку Memernity', () => {
    const url = getBillingCheckoutUrl('pro', 'cernavation', 'month')
    assert.equal(
      url,
      'https://memernity.com/checkout?service=ogonek&tier=pro&username=cernavation&period=month'
    )
    const urlUltra = getBillingCheckoutUrl('ultra', '@alex', 'year')
    assert.equal(
      urlUltra,
      'https://memernity.com/checkout?service=ogonek&tier=ultra&username=alex&period=year'
    )
  })

  it('33. getPaymentButtonLabel: возвращает Продлить или Оформить', () => {
    assert.equal(getPaymentButtonLabel('free', 'pro'), 'Оформить')
    assert.equal(getPaymentButtonLabel('pro', 'pro'), 'Продлить')
    assert.equal(getPaymentButtonLabel('pro', 'ultra'), 'Улучшить до Ultra')
    assert.equal(getPaymentButtonLabel('ultra', 'ultra'), 'Продлить')
  })
})

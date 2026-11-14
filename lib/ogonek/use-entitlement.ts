'use client'

import { useMemo } from 'react'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import {
  type SubscriptionTier,
  type TierLimits,
  normalizeTier,
  getTierLimits,
  TIER_LIMITS_MAP,
} from './permissions'

export interface EntitlementResult<F extends keyof TierLimits = keyof TierLimits> {
  allowed: boolean
  limit: TierLimits[F]
  currentTier: SubscriptionTier
  upgradeTo: SubscriptionTier | null
}

/**
 * React-хук для проверки доступности функционала по тарифу.
 * 
 * @param feature Название лимита из TierLimits (например 'videoCalls', 'maxPhotosPerDay')
 * @param currentCount Текущее количество (опционально, для счетчиков записей/фото/групп)
 */
export function useEntitlement<F extends keyof TierLimits>(
  feature: F,
  currentCount?: number
): EntitlementResult<F> {
  const { state } = useOgonekStore()

  return useMemo(() => {
    const currentTier = normalizeTier(
      state.profile?.subscription_tier,
      state.profile?.subscription_expires_at
    )
    const limits = getTierLimits(currentTier)
    const limit = limits[feature]

    let allowed = true
    if (typeof limit === 'boolean') {
      allowed = limit
    } else if (typeof limit === 'number') {
      if (typeof currentCount === 'number') {
        allowed = currentCount < limit
      } else {
        allowed = limit > 0
      }
    }

    let upgradeTo: SubscriptionTier | null = null
    if (!allowed) {
      if (currentTier === 'free') {
        const proLimit = TIER_LIMITS_MAP.pro[feature]
        if (typeof proLimit === 'boolean' && proLimit) {
          upgradeTo = 'pro'
        } else if (typeof proLimit === 'number' && typeof limit === 'number' && proLimit > limit) {
          upgradeTo = 'pro'
        } else {
          upgradeTo = 'ultra'
        }
      } else if (currentTier === 'pro') {
        upgradeTo = 'ultra'
      }
    }

    return {
      allowed,
      limit,
      currentTier,
      upgradeTo,
    }
  }, [
    feature,
    currentCount,
    state.profile?.subscription_tier,
    state.profile?.subscription_expires_at,
  ])
}

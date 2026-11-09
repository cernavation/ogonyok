/**
 * СЕРВЕРНЫЙ МОДУЛЬ ТАРИФОВ И ПРИНУЖДЕНИЯ ЛИМИТОВ (ЭТАП 4)
 * 
 * Серверный единый источник истины (SSOT) для определения реального тарифа пользователя.
 * Клиентскому значению сервер никогда не доверяет: тариф всегда запрашивается из БД
 * с проверкой срока действия подписки.
 */

import { getServerSupabase } from '../supabase/server'
import {
  normalizeTier,
  getTierLimits,
  type SubscriptionTier,
  type TierLimits,
} from '../ogonek/permissions'

/**
 * Получает эффективный тариф пользователя непосредственно из базы данных.
 * Использует функцию базы данных effective_tier(user_id) или проверяет profiles.
 */
export async function getEffectiveTier(userId: string): Promise<SubscriptionTier> {
  if (!userId) return 'free'

  const supabase = getServerSupabase()
  if (!supabase) {
    console.warn('[getEffectiveTier] Supabase client unavailable, defaulting to free')
    return 'free'
  }

  try {
    // 1. Попытка вызова RPC effective_tier(user_id)
    const { data: rpcTier, error: rpcError } = await supabase.rpc('effective_tier', {
      user_id: userId,
    })

    if (!rpcError && typeof rpcTier === 'string') {
      return normalizeTier(rpcTier)
    }

    // 2. Фолбэк: прямой SELECT subscription_tier, subscription_valid_until из profiles
    const { data: profile, error: selectError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_valid_until')
      .eq('id', userId)
      .maybeSingle()

    if (selectError || !profile) {
      return 'free'
    }

    return normalizeTier(profile.subscription_tier, profile.subscription_valid_until)
  } catch (err) {
    console.error('[getEffectiveTier] Error fetching tier:', err)
    return 'free'
  }
}

/**
 * Проверяет серверное право доступа пользователя к функции
 */
export async function checkServerEntitlement<F extends keyof TierLimits = keyof TierLimits>(
  userId: string,
  feature: F,
  currentValue?: number
): Promise<{ allowed: boolean; tier: SubscriptionTier; limit: TierLimits[F]; error?: string }> {
  const tier = await getEffectiveTier(userId)
  const limits = getTierLimits(tier)
  const limitVal = limits[feature]

  if (typeof limitVal === 'boolean') {
    return {
      allowed: limitVal,
      tier,
      limit: limitVal,
      error: limitVal ? undefined : `Функция доступна только на платных тарифах`,
    }
  }

  if (typeof limitVal === 'number' && typeof currentValue === 'number') {
    const allowed = currentValue < limitVal
    return {
      allowed,
      tier,
      limit: limitVal,
      error: allowed ? undefined : `Превышен суточный лимит: ${currentValue} / ${limitVal}`,
    }
  }

  return { allowed: true, tier, limit: limitVal }
}

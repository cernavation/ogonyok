import { getServerSupabase } from '../supabase/server.ts'
import { getEffectiveTier } from './tier.ts'
import { getTierLimits, type SubscriptionTier, type TierLimits } from '../ogonek/permissions.ts'

export interface QuotaConsumptionResult {
  ok: boolean
  feature: keyof TierLimits
  limit: number
  tier: SubscriptionTier
  remaining: number
  current: number
  error?: string
}

// In-memory fallback для локальных тестов
const localUsageCounters = new Map<string, number>()

/**
 * Серверное атомарное списание квоты по тарифу пользователя.
 * Лимит извлекается строго на сервере из permissions.ts. Клиент не может передать свой лимит.
 */
export async function consumeServerQuota(
  userId: string,
  feature: keyof TierLimits,
  explicitTier?: SubscriptionTier
): Promise<QuotaConsumptionResult> {
  const tier = explicitTier || await getEffectiveTier(userId)
  const limits = getTierLimits(tier)
  const limitValue = limits[feature]

  const limitNumber = typeof limitValue === 'number' ? limitValue : (limitValue ? 1 : 0)

  // 1. Попытка вызова RPC функции в PostgreSQL
  try {
    const supabase = getServerSupabase()
    const { data, error } = await supabase.rpc('consume_quota', {
      p_kind: feature,
      p_limit: limitNumber,
      p_user_id: userId,
    })

    if (!error && data && typeof data === 'object') {
      const resp = data as any
      return {
        ok: Boolean(resp.ok),
        feature,
        limit: limitNumber,
        tier,
        remaining: typeof resp.remaining === 'number' ? resp.remaining : 0,
        current: typeof resp.current === 'number' ? resp.current : 0,
        error: resp.ok ? undefined : 'quota_exceeded',
      }
    }
  } catch {
    // В случае отсутствия соединения используем локальный fallback
  }

  // 2. In-memory fallback
  const today = new Date().toISOString().slice(0, 10)
  const key = `${userId}:${feature}:${today}`
  const current = localUsageCounters.get(key) || 0

  if (limitNumber <= 0 || current >= limitNumber) {
    return {
      ok: false,
      feature,
      limit: limitNumber,
      tier,
      remaining: 0,
      current,
      error: 'quota_exceeded',
    }
  }

  localUsageCounters.set(key, current + 1)
  return {
    ok: true,
    feature,
    limit: limitNumber,
    tier,
    remaining: limitNumber - (current + 1),
    current: current + 1,
  }
}

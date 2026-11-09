'use client'

import React from 'react'
import { Lock, Sparkles } from 'lucide-react'
import { useEntitlement, type EntitlementResult } from '@/lib/ogonek/use-entitlement'
import { type TierLimits, TIER_NAMES } from '@/lib/ogonek/permissions'

export interface GateProps<F extends keyof TierLimits> {
  feature: F
  currentCount?: number
  children: React.ReactNode
  fallback?: React.ReactNode | ((entitlement: EntitlementResult<F>) => React.ReactNode)
  onBlocked?: (entitlement: EntitlementResult<F>) => void
  showUpgradeCard?: boolean
}

/**
 * Gate-компонент для ограничения интерфейса по тарифу.
 * 
 * Пример:
 * ```tsx
 * <Gate feature="videoCalls" onBlocked={() => notify('Требуется Премиум')}>
 *   <VideoCallButton />
 * </Gate>
 * ```
 */
export function Gate<F extends keyof TierLimits>({
  feature,
  currentCount,
  children,
  fallback,
  onBlocked,
  showUpgradeCard = false,
}: GateProps<F>) {
  const entitlement = useEntitlement(feature, currentCount)

  if (entitlement.allowed) {
    return <>{children}</>
  }

  if (fallback) {
    return (
      <div
        onClick={() => onBlocked?.(entitlement)}
        className="contents"
      >
        {typeof fallback === 'function' ? fallback(entitlement) : fallback}
      </div>
    )
  }

  if (showUpgradeCard) {
    const requiredName = entitlement.upgradeTo
      ? TIER_NAMES[entitlement.upgradeTo]
      : 'Премиум'

    return (
      <div className="p-4 rounded-2xl bg-[var(--surface2)] border border-[var(--line)] text-center my-3">
        <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-400 mx-auto flex items-center justify-center mb-2">
          <Lock size={18} />
        </div>
        <h4 className="text-sm font-bold text-[var(--text)] mb-1">
          Доступно на тарифе {requiredName}
        </h4>
        <p className="text-xs text-[var(--muted)] max-w-xs mx-auto mb-3">
          Для доступа к этой функции перейдите на тариф {requiredName}
        </p>
        <button
          type="button"
          onClick={() => onBlocked?.(entitlement)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          <Sparkles size={14} />
          Подробнее о тарифе
        </button>
      </div>
    )
  }

  // По умолчанию, если нет fallback и showUpgradeCard=false, перехватываем клик
  return (
    <div
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onBlocked?.(entitlement)
      }}
      className="inline-block opacity-60 cursor-pointer"
      title={`Доступно на тарифе ${entitlement.upgradeTo ? TIER_NAMES[entitlement.upgradeTo] : 'Премиум'}`}
    >
      {children}
    </div>
  )
}

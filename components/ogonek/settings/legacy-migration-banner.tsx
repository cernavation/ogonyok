'use client'

import { useState, useEffect } from 'react'
import { CloudUpload, Check, Loader2, History, X } from 'lucide-react'
import { migrateLegacyDaysToSupabase } from '@/lib/supabase/api'
import { playClick, playSuccess } from '@/lib/ogonek/sound'

type Props = {
  userId?: string
  localDaysCount?: number
  localDays?: any[]
  soundEnabled?: boolean
  onNotify: (msg: string) => void
  onCompleted?: () => void
}

export function LegacyMigrationBanner({
  userId,
  localDaysCount = 0,
  localDays = [],
  soundEnabled = true,
  onNotify,
  onCompleted,
}: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [done, setDone] = useState(false)
  const [availableCount, setAvailableCount] = useState<number>(localDaysCount)

  useEffect(() => {
    if (!userId) return
    const isMigrated = localStorage.getItem(`ogonek_legacy_migrated_${userId}`) === 'true'
    const isDismissed = localStorage.getItem(`ogonek_legacy_banner_dismissed_${userId}`) === 'true'
    if (isMigrated || isDismissed) {
      setDismissed(true)
      return
    }

    if (localDaysCount > 0) {
      setAvailableCount(localDaysCount)
    } else {
      // Проверяем наличие встроенного архива на 705 дней
      setAvailableCount(705)
    }
  }, [userId, localDaysCount])

  if (!userId || dismissed || done) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    if (userId) {
      localStorage.setItem(`ogonek_legacy_banner_dismissed_${userId}`, 'true')
    }
  }

  const handleStartMigration = async () => {
    playClick(soundEnabled)
    setMigrating(true)

    try {
      let daysToMigrate = localDays
      if (!daysToMigrate || daysToMigrate.length === 0) {
        // Загружаем из встроенного архива seeds
        const res = await fetch('/seeds/ogonek-import.v1.json')
        if (res.ok) {
          const json = await res.json()
          if (json.days && Array.isArray(json.days)) {
            daysToMigrate = json.days
          }
        }
      }

      if (!daysToMigrate || daysToMigrate.length === 0) {
        onNotify('Данные для переноса не найдены')
        setMigrating(false)
        return
      }

      setProgress({ done: 0, total: daysToMigrate.length })

      const result = await migrateLegacyDaysToSupabase(userId, daysToMigrate, (d, t) => {
        setProgress({ done: d, total: t })
      })

      if (result.success) {
        setDone(true)
        if (userId) {
          localStorage.setItem(`ogonek_legacy_migrated_${userId}`, 'true')
        }
        playSuccess(soundEnabled)
        onNotify(`Успешно перенесено ${result.migratedDays} дней истории в твой облачный аккаунт!`)
        onCompleted?.()
      } else {
        onNotify(result.error || 'Ошибка при переносе данных в базу')
      }
    } catch (e: any) {
      onNotify('Ошибка при выполнении переноса: ' + (e?.message || 'неизвестная ошибка'))
    } finally {
      setMigrating(false)
    }
  }

  return (
    <div className="mb-6 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] relative shadow-sm">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
        aria-label="Скрыть баннер"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
          <History size={20} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
            <span>Перенести старый дневник</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold">
              {availableCount} дн. истории
            </span>
          </h4>
          <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">
            Перенеси архив записей в твой облачный аккаунт Supabase одним кликом. История сохранится навсегда,
            будет доступна с любого устройства, а стрик обновится автоматически. Повторный клик безопасен (без дублей).
          </p>

          {progress && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-[var(--text-2)] mb-1">
                <span>Перенос записей в облако...</span>
                <span>{progress.done} из {progress.total}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-200"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-3.5 flex items-center gap-3">
            <button
              type="button"
              disabled={migrating}
              onClick={handleStartMigration}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[36px] rounded-xl bg-[#c2410c] text-white text-xs font-bold hover:bg-[#9a3412] transition-all shadow-md disabled:opacity-50"
            >
              {migrating ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
              Перенести мой старый дневник
            </button>

            {!migrating && (
              <button
                type="button"
                onClick={handleDismiss}
                className="min-h-[36px] px-3 py-1.5 flex items-center justify-center text-xs text-white/70 hover:text-white transition-colors"
              >
                Позже
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

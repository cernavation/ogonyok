'use client'

import { useState } from 'react'
import { Flame, Lock, Check, AlertCircle, Sparkles } from 'lucide-react'
import { canChangeLevel, LEVEL_MIN, LEVEL_MAX } from '@/lib/ogonek/diary-engine'
import { playClick, playSuccess } from '@/lib/ogonek/sound'

type Props = {
  currentLevel: number
  levelChangedAtISO: string | null
  soundEnabled?: boolean
  onChangeLevel: (newLevel: number) => Promise<{ ok: boolean; error?: string }> | void
  onNotify: (msg: string) => void
}

const LEVEL_CONFIG = [
  { level: 1, title: 'Уровень 1 · Лёгкий старт', quota: '1 гордость и 1 благодарность в день', desc: 'Занимает 2–3 минуты. Идеально для начала пути и формирования привычки.' },
  { level: 2, title: 'Уровень 2 · Комфортный', quota: '2 гордости и 2 благодарности в день', desc: 'Устойчивая дисциплина без перегруза.' },
  { level: 3, title: 'Уровень 3 · Оптимальный', quota: '3 гордости и 3 благодарности в день', desc: 'Золотая середина: глубокая фиксация дня и внутреннего ресурса.' },
  { level: 4, title: 'Уровень 4 · Высокая планка', quota: '4 гордости и 4 благодарности в день', desc: 'Для тех, кто стремится к максимальной продуктивности.' },
  { level: 5, title: 'Уровень 5 · Гроссмейстер', quota: '5 гордостей и 5 благодарностей в день', desc: 'Самый жёсткий режим. Требует ежедневного преодоления и внимательности.' },
]

export function DifficultyLevelPanel({
  currentLevel = 3,
  levelChangedAtISO,
  soundEnabled = true,
  onChangeLevel,
  onNotify,
}: Props) {
  const [level, setLevel] = useState(currentLevel)
  const [busy, setBusy] = useState(false)

  const check = canChangeLevel(levelChangedAtISO)

  const handleSelectLevel = async (targetLevel: number) => {
    if (targetLevel === level) return
    if (!check.allowed) {
      onNotify(`Смена уровня заблокирована: осталось ${check.daysLeft} дн.`)
      return
    }

    playClick(soundEnabled)
    setBusy(true)

    try {
      const res = await onChangeLevel(targetLevel)
      if (res && !res.ok) {
        onNotify(res.error || 'Не удалось сменить уровень')
      } else {
        setLevel(targetLevel)
        playSuccess(soundEnabled)
        onNotify(`Уровень сложности изменён на ${targetLevel}! Следующая смена через 30 дней.`)
      }
    } catch (e) {
      onNotify('Ошибка при сохранении уровня')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="settings-card rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#ff5722]/15 flex items-center justify-center text-[#ff5722]">
            <Flame size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">Уровень сложности дневника</h3>
            <p className="text-xs text-white/60">Правила 1–2 ТЗ: сколько гордостей и благодарностей в день</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff5722]/10 border border-[#ff5722]/30 text-[#ff5722] text-xs font-bold">
          <span>Уровень {level}</span>
        </div>
      </div>

      {/* Статус блокировки на 30 дней */}
      {!check.allowed ? (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2">
          <Lock size={16} className="text-amber-400 shrink-0" />
          <div>
            <strong>Смена уровня заблокирована:</strong> менять уровень сложности можно не чаще 1 раза в 30 дней.
            <div className="mt-0.5 text-amber-300 font-medium">
              Следующая смена через {check.daysLeft} дн.
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs flex items-center gap-2">
          <Check size={16} className="text-emerald-400 shrink-0" />
          <span>Смена уровня сейчас доступна. Выберите уровень на следующие 30 дней.</span>
        </div>
      )}

      {/* Сетка уровней 1..5 */}
      <div className="space-y-2">
        {LEVEL_CONFIG.map((cfg) => {
          const isSelected = level === cfg.level
          const isDisabled = !check.allowed && !isSelected

          return (
            <button
              key={cfg.level}
              type="button"
              disabled={isDisabled || busy}
              onClick={() => handleSelectLevel(cfg.level)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                isSelected
                  ? 'bg-[#ff5722]/10 border-[#ff5722] shadow-sm'
                  : isDisabled
                  ? 'opacity-40 bg-white/[0.01] border-white/5 cursor-not-allowed'
                  : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isSelected ? 'text-[#ff5722]' : 'text-white'}`}>
                    {cfg.title}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#ff5722] text-white">
                      Текущий
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium text-white/80 mt-0.5">{cfg.quota}</div>
                <div className="text-[11px] text-white/50 mt-1 leading-snug">{cfg.desc}</div>
              </div>

              <div className="shrink-0 mt-1">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected
                      ? 'border-[#ff5722] bg-[#ff5722] text-white'
                      : 'border-white/20'
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

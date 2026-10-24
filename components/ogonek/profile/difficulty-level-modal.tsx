'use client'

import React, { useMemo, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Flame,
  History,
  Lock,
  Shield,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { playClick, playSuccess } from '@/lib/ogonek/sound'

export type DifficultyLevelMeta = {
  level: number
  title: string
  subtitle: string
  pridesDaily: number
  gratitudesDaily: number
  extraRequirement: string
  color: string
}

export const DIFFICULTY_LEVELS: DifficultyLevelMeta[] = [
  {
    level: 1,
    title: 'Лёгкий',
    subtitle: 'Мягкий старт для формирования привычки',
    pridesDaily: 1,
    gratitudesDaily: 0,
    extraRequirement: 'Хотя бы 1 победа или 1 благодарность в день',
    color: '#00ba7c',
  },
  {
    level: 2,
    title: 'Базовый',
    subtitle: 'Классический баланс силы и осознанности',
    pridesDaily: 1,
    gratitudesDaily: 1,
    extraRequirement: '1 победа и 1 благодарность каждый день',
    color: '#1d9bf0',
  },
  {
    level: 3,
    title: 'Продвинутый',
    subtitle: 'Дисциплина и глубокая рефлексия',
    pridesDaily: 2,
    gratitudesDaily: 2,
    extraRequirement: '2 победы + 2 благодарности + вечерний обзор',
    color: '#ff7a18',
  },
  {
    level: 4,
    title: 'Мастер',
    subtitle: 'Высокая интенсивность без права на лень',
    pridesDaily: 3,
    gratitudesDaily: 3,
    extraRequirement: '3 победы + 3 благодарности + утренний фокус',
    color: '#f4212e',
  },
  {
    level: 5,
    title: 'Легенда',
    subtitle: 'Экстремальный уровень самодисциплины',
    pridesDaily: 5,
    gratitudesDaily: 5,
    extraRequirement: '5 побед + 5 благодарностей + 100% фокус 7 дней в неделю',
    color: '#ffd700',
  },
]

type Props = {
  onClose: () => void
  onNotify: (msg: string) => void
  soundEnabled?: boolean
}

const COOLDOWN_DAYS = 30

export function DifficultyLevelModal({ onClose, onNotify, soundEnabled = true }: Props) {
  const { state, setDifficultyLevel } = useOgonekStore()
  const currentLevel = state.profile.difficultyLevel || 2
  const history = state.profile.levelHistory || []

  const [selectedLevel, setSelectedLevel] = useState<number>(currentLevel)
  const [changeReason, setChangeReason] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info')

  // Calculate cooldown
  const lastChange = history.length > 0 ? history[history.length - 1] : null
  const lastChangeDate = lastChange ? new Date(lastChange.changedAtISO) : null

  const { isLocked, daysRemaining, unlockDateStr } = useMemo(() => {
    if (!lastChangeDate) {
      return { isLocked: false, daysRemaining: 0, unlockDateStr: '' }
    }
    const msInDay = 24 * 60 * 60 * 1000
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - lastChangeDate.getTime()) / msInDay)
    const remaining = COOLDOWN_DAYS - diffDays
    const unlockDate = new Date(lastChangeDate.getTime() + COOLDOWN_DAYS * msInDay)

    return {
      isLocked: remaining > 0,
      daysRemaining: Math.max(0, remaining),
      unlockDateStr: unlockDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    }
  }, [lastChangeDate])

  const currentMeta = DIFFICULTY_LEVELS.find((l) => l.level === currentLevel) || DIFFICULTY_LEVELS[1]

  const handleSaveLevel = async () => {
    if (selectedLevel === currentLevel) return
    if (isLocked) {
      onNotify(`Смена уровня заблокирована ещё на ${daysRemaining} дн. (правило 30 дней)`)
      return
    }

    playSuccess(soundEnabled)
    await setDifficultyLevel(selectedLevel, changeReason.trim() || undefined)
    onNotify(`Уровень сложности изменён на «Уровень ${selectedLevel} · ${DIFFICULTY_LEVELS[selectedLevel - 1].title}» 🔥`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--bg-elev)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text)] flex items-center gap-2">
                Уровень сложности
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-extrabold text-white"
                  style={{ background: currentMeta.color }}
                >
                  Уровень {currentLevel}
                </span>
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {currentMeta.title} · Правила поддержания стрика
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Описание / История */}
        <div className="flex border-b border-[var(--border)] bg-[var(--bg)] px-5 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Уровни и правила
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <History className="w-3.5 h-3.5" /> История изменений ({history.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {activeTab === 'info' ? (
            <>
              {/* Cooldown banner */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  isLocked
                    ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200'
                    : 'border-green-500/30 bg-green-500/10 text-green-200'
                }`}
              >
                {isLocked ? (
                  <Lock className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                ) : (
                  <Unlock className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs">
                  <span className="font-bold">
                    {isLocked ? 'Кулдаун активен (защита от читерства):' : 'Смена доступна:'}
                  </span>{' '}
                  {isLocked
                    ? `Уровень можно менять не чаще 1 раза в 30 дней. Следующая смена станет доступна ${unlockDateStr} (осталось ${daysRemaining} дн.).`
                    : 'Вы можете выбрать новый уровень сложности. После сохранения запустится 30-дневный кулдаун.'}
                </div>
              </div>

              {/* Levels List */}
              <div className="flex flex-col gap-2.5">
                {DIFFICULTY_LEVELS.map((lvl) => {
                  const isSelected = selectedLevel === lvl.level
                  const isCurrent = currentLevel === lvl.level

                  return (
                    <div
                      key={lvl.level}
                      onClick={() => !isLocked && setSelectedLevel(lvl.level)}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border)] bg-[var(--bg)] hover:border-white/20'
                      } ${!isLocked ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* 5 Flames indicator */}
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((idx) => (
                              <Flame
                                key={idx}
                                className={`w-3.5 h-3.5 ${
                                  idx <= lvl.level
                                    ? 'text-orange-500 fill-orange-500'
                                    : 'text-white/20'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-extrabold text-sm text-[var(--text)]">
                            Уровень {lvl.level} · {lvl.title}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 text-[var(--text-muted)]">
                              Текущий
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-[var(--text-muted)]">{lvl.subtitle}</p>

                      <div className="flex items-center gap-3 text-[11px] font-semibold text-[var(--text-2)] pt-1 border-t border-white/5">
                        <span>🎯 {lvl.pridesDaily} побед/день</span>
                        <span>❤️ {lvl.gratitudesDaily} благодарностей/день</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Optional Reason if changing */}
              {!isLocked && selectedLevel !== currentLevel && (
                <div className="flex flex-col gap-1.5 pt-2 animate-in fade-in">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Причина смены (необязательно для истории):
                  </label>
                  <input
                    type="text"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="Например: Перехожу на усиленный режим подготовки к марафону"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}
            </>
          ) : (
            /* History Tab */
            <div className="flex flex-col gap-3">
              {history.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  История изменений пока пуста. Уровень был установлен при регистрации.
                </div>
              ) : (
                history
                  .slice()
                  .reverse()
                  .map((entry) => {
                    const dateStr = new Date(entry.changedAtISO).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    return (
                      <div
                        key={entry.id}
                        className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-[var(--text-muted)] text-[11px]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {dateStr}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-[var(--text)]">
                          <span>Уровень {entry.oldLevel}</span>
                          <span className="text-[var(--text-muted)]">→</span>
                          <span className="text-[var(--accent)]">Уровень {entry.newLevel}</span>
                        </div>
                        {entry.reason && (
                          <p className="text-[11px] text-[var(--text-muted)] italic">
                            «{entry.reason}»
                          </p>
                        )}
                      </div>
                    )
                  })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'info' && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)] bg-[var(--bg)]">
            <span className="text-[11px] text-[var(--text-muted)]">
              Настройка приватности: Настройки → Приватность
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
              >
                Закрыть
              </button>
              {!isLocked && selectedLevel !== currentLevel && (
                <button
                  type="button"
                  onClick={handleSaveLevel}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 transition-all shadow-md"
                >
                  Сохранить
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

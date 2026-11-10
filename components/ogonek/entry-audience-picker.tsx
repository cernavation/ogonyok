'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Globe,
  Lock,
  Users,
  Shield,
  Check,
  ChevronDown,
  AlertTriangle,
  Layers,
  X,
} from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import type { VisibilityLevel, OgonekGroup } from '@/lib/ogonek/types'

interface Props {
  visibility: VisibilityLevel
  selectedGroupIds?: string[]
  availableGroups?: OgonekGroup[]
  onChange: (visibility: VisibilityLevel, groupIds: string[]) => void
  onApplyToAll?: () => void
  soundEnabled?: boolean
  compact?: boolean
  disabled?: boolean
}

export function EntryAudiencePicker({
  visibility,
  selectedGroupIds = [],
  availableGroups = [],
  onChange,
  onApplyToAll,
  soundEnabled = true,
  compact = false,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Закрытие при клике снаружи
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Лейбл чипа
  const getLabel = () => {
    if (visibility === 'private') return 'Лично'
    if (visibility === 'friends') return 'Соратникам'
    if (visibility === 'public') return 'Всем'
    if (visibility === 'groups') {
      if (selectedGroupIds.length === 0) return 'Группы (0)'
      if (selectedGroupIds.length === 1) {
        const found = availableGroups.find((g) => g.id === selectedGroupIds[0])
        return found ? found.name : '1 группа'
      }
      return `Группы (${selectedGroupIds.length})`
    }
    return 'Лично'
  }

  const getIcon = () => {
    if (visibility === 'private') return <Lock size={12} className="text-zinc-400" />
    if (visibility === 'friends') return <Users size={12} className="text-amber-400" />
    if (visibility === 'public') return <Globe size={12} className="text-sky-400" />
    return <Shield size={12} className="text-purple-400" />
  }

  const getColorClasses = () => {
    if (visibility === 'private') {
      return 'bg-zinc-800/80 text-zinc-300 border-zinc-700/80 hover:bg-zinc-700/80'
    }
    if (visibility === 'friends') {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
    }
    if (visibility === 'public') {
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-500/25'
    }
    return 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25'
  }

  const handleSelectBase = (level: VisibilityLevel) => {
    playClick(soundEnabled)
    if (level === 'groups') {
      // По умолчанию выбираем первую доступную группу, если ещё ничего не выбрано
      const nextGroupIds = selectedGroupIds.length > 0
        ? selectedGroupIds
        : (availableGroups[0] ? [availableGroups[0].id] : [])
      onChange('groups', nextGroupIds)
    } else {
      onChange(level, [])
      setOpen(false)
    }
  }

  const handleToggleGroup = (groupId: string) => {
    playClick(soundEnabled)
    const exists = selectedGroupIds.includes(groupId)
    let next: string[]
    if (exists) {
      next = selectedGroupIds.filter((id) => id !== groupId)
    } else {
      next = [...selectedGroupIds, groupId]
    }
    // Если сняли все галочки, всё равно остаёмся в groups с пустым списком
    onChange('groups', next)
  }

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Кнопка-чип выбора аудитории */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          playClick(soundEnabled)
          setOpen((v) => !v)
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border transition-all text-xs font-semibold ${
          compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
        } ${getColorClasses()} shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={`Аудитория записи: ${getLabel()}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {getIcon()}
        <span className="truncate max-w-[110px]">{getLabel()}</span>
        <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Выпадающее меню аудитории */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl text-xs select-none">
          <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-[var(--border)] px-1">
            <span className="font-bold text-[var(--text)] uppercase tracking-wider text-[10px]">
              Кому видно запись:
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[var(--text-2)] hover:text-[var(--text)] p-0.5 rounded"
              aria-label="Закрыть"
            >
              <X size={12} />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            {/* 1. Лично */}
            <button
              type="button"
              onClick={() => handleSelectBase('private')}
              className={`flex items-center justify-between w-full p-2 rounded-xl transition text-left ${
                visibility === 'private'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'hover:bg-[var(--bg-hover)] text-[var(--text)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-zinc-400" />
                <div>
                  <div className="font-bold">Лично для меня</div>
                  <div className="text-[10px] text-[var(--text-2)]">Только в вашем дневнике</div>
                </div>
              </div>
              {visibility === 'private' && <Check size={14} className="text-[var(--accent)]" />}
            </button>

            {/* 2. Соратникам */}
            <button
              type="button"
              onClick={() => handleSelectBase('friends')}
              className={`flex items-center justify-between w-full p-2 rounded-xl transition text-left ${
                visibility === 'friends'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'hover:bg-[var(--bg-hover)] text-[var(--text)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={14} className="text-amber-400" />
                <div>
                  <div className="font-bold">Соратникам</div>
                  <div className="text-[10px] text-[var(--text-2)]">Только подтверждённым соратникам</div>
                </div>
              </div>
              {visibility === 'friends' && <Check size={14} className="text-amber-400" />}
            </button>

            {/* 3. Всем */}
            <button
              type="button"
              onClick={() => handleSelectBase('public')}
              className={`flex items-center justify-between w-full p-2 rounded-xl transition text-left ${
                visibility === 'public'
                  ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30'
                  : 'hover:bg-[var(--bg-hover)] text-[var(--text)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-sky-400" />
                <div>
                  <div className="font-bold">Всем в ленту</div>
                  <div className="text-[10px] text-[var(--text-2)]">Публично для всех соратников</div>
                </div>
              </div>
              {visibility === 'public' && <Check size={14} className="text-sky-400" />}
            </button>

            {/* Предупреждение при публикации Всем */}
            {visibility === 'public' && (
              <div className="flex items-start gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] leading-tight my-0.5">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>Запись увидят все пользователи в глобальной ленте Огонька.</span>
              </div>
            )}

            {/* 4. Отдельные группы */}
            <div className="mt-1 pt-1 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => handleSelectBase('groups')}
                className={`flex items-center justify-between w-full p-2 rounded-xl transition text-left ${
                  visibility === 'groups'
                    ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30'
                    : 'hover:bg-[var(--bg-hover)] text-[var(--text)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-purple-400" />
                  <div>
                    <div className="font-bold">Выбранным группам</div>
                    <div className="text-[10px] text-[var(--text-2)]">Семья, Спортсмены и другие</div>
                  </div>
                </div>
                {visibility === 'groups' && <Check size={14} className="text-purple-400" />}
              </button>

              {/* Список групп с чекбоксами (если выбран режим groups) */}
              {visibility === 'groups' && (
                <div className="mt-1.5 pl-2 pr-1 py-1 flex flex-col gap-1 max-h-36 overflow-y-auto">
                  {availableGroups.length === 0 ? (
                    <div className="text-[11px] text-[var(--text-2)] py-1 italic">
                      У вас пока нет групп. Создайте группу в разделе «Соратники».
                    </div>
                  ) : (
                    availableGroups.map((grp) => {
                      const isChecked = selectedGroupIds.includes(grp.id)
                      return (
                        <label
                          key={grp.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm shrink-0">{grp.avatar || '👥'}</span>
                            <span className="truncate text-xs text-[var(--text)] font-medium">
                              {grp.name}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleGroup(grp.id)}
                            className="rounded border-[var(--border)] text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                          />
                        </label>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Применить ко всем записям дня */}
          {onApplyToAll && (
            <div className="mt-2 pt-1.5 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  onApplyToAll()
                  setOpen(false)
                }}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 rounded-xl text-center text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10 transition"
              >
                <Layers size={12} />
                <span>Применить ко всем записям дня</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { Check, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  KPI_KINDS,
  KPI_PRESETS,
  clampKpiTarget,
  getKpiKind,
} from '@/lib/ogonek/kpi'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { KpiKind, MonthlyKpi } from '@/lib/ogonek/types'
import { ModalShell } from '../modal-shell'

type Props = {
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
  /** Если передана — режим редактирования существующей цели */
  editing?: MonthlyKpi | null
}

/**
 * Модальное окно создания / редактирования месячной KPI-цели.
 * Реально пишет в use-ogonek-store через addMonthlyKpi / updateMonthlyKpi / removeMonthlyKpi.
 */
export function AddKpiModal({ onClose, onNotify, soundEnabled = true, editing = null }: Props) {
  const { addMonthlyKpi, updateMonthlyKpi, removeMonthlyKpi } = useOgonekStore()

  const [title, setTitle] = useState(editing?.title ?? '')
  const [kind, setKind] = useState<KpiKind>(editing?.kind ?? 'prides')
  const [targetValue, setTargetValue] = useState<string>(
    String(editing?.target ?? getKpiKind(editing?.kind ?? 'prides').defaultTarget)
  )

  const meta = getKpiKind(kind)
  const parsedTarget = Number(targetValue.replace(',', '.'))
  const targetValid = Number.isFinite(parsedTarget) && parsedTarget > 0

  const applyPreset = (preset: { title: string; kind: KpiKind; target: number }) => {
    playClick(soundEnabled)
    setTitle(preset.title)
    setKind(preset.kind)
    setTargetValue(String(preset.target))
  }

  const changeKind = (next: KpiKind) => {
    playClick(soundEnabled)
    setKind(next)
    const nextMeta = getKpiKind(next)
    setTargetValue(String(nextMeta.defaultTarget))
    if (!title.trim() || KPI_KINDS.some((k) => k.label === title.trim())) {
      setTitle(nextMeta.label)
    }
  }

  const handleSave = () => {
    if (!targetValid) {
      onNotify('Введите корректный ориентир цели')
      return
    }
    const finalTitle = title.trim() || meta.label
    const target = clampKpiTarget(kind, parsedTarget)

    if (editing) {
      updateMonthlyKpi(editing.id, { title: finalTitle, kind, target })
      playSuccess(soundEnabled)
      onNotify('Месячная цель обновлена ✓')
    } else {
      addMonthlyKpi({ title: finalTitle, kind, target })
      playSuccess(soundEnabled)
      onNotify('Новая месячная KPI-цель добавлена ✓')
    }
    onClose()
  }

  const handleDelete = () => {
    if (!editing) return
    removeMonthlyKpi(editing.id)
    playClick(soundEnabled)
    onNotify('Цель удалена')
    onClose()
  }

  return (
    <ModalShell
      title={editing ? 'Изменить месячную цель' : 'Новая месячная KPI-цель'}
      onClose={onClose}
    >
      <div className="kpi-modal">
        {!editing && (
          <div className="kpi-modal__presets">
            <span className="kpi-modal__presets-label">Быстрый старт</span>
            <div className="kpi-preset-row">
              {KPI_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  className={`kpi-preset-chip ${
                    title === preset.title && kind === preset.kind ? 'is-active' : ''
                  }`}
                  onClick={() => applyPreset(preset)}
                >
                  <span aria-hidden="true">{preset.emoji}</span>
                  {preset.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="kpi-field">
          <span className="kpi-field__label">Название цели</span>
          <input
            className="kpi-input"
            value={title}
            maxLength={120}
            placeholder={meta.label}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="kpi-field">
          <span className="kpi-field__label">Что измеряем</span>
          <div className="kpi-kind-grid" role="radiogroup" aria-label="Тип цели">
            {KPI_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={kind === k.id}
                className={`kpi-kind-card ${kind === k.id ? 'is-active' : ''}`}
                style={kind === k.id ? { borderColor: k.color } : undefined}
                onClick={() => changeKind(k.id)}
              >
                <span className="kpi-kind-card__emoji" aria-hidden="true">
                  {k.emoji}
                </span>
                <span className="kpi-kind-card__name" style={{ color: kind === k.id ? k.color : undefined }}>
                  {k.label}
                </span>
                <span className="kpi-kind-card__hint">{k.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="kpi-field">
          <span className="kpi-field__label">
            Ориентир {meta.unit ? <em>({meta.unit})</em> : null}
          </span>
          <input
            type="number"
            inputMode="decimal"
            className="kpi-input"
            value={targetValue}
            min={meta.min}
            max={meta.max}
            step={meta.step}
            onChange={(e) => setTargetValue(e.target.value)}
          />
          <span className="kpi-field__hint">
            Диапазон: {meta.min}–{meta.max}
            {meta.unit ? ` ${meta.unit}` : ''}
          </span>
        </label>

        <div className="kpi-modal__footer">
          {editing && (
            <button type="button" className="kpi-ghost-btn kpi-ghost-btn--danger" onClick={handleDelete}>
              <Trash2 size={15} /> Удалить
            </button>
          )}
          <button
            type="button"
            className="kpi-primary-btn"
            onClick={handleSave}
            disabled={!targetValid}
          >
            <Check size={16} /> {editing ? 'Сохранить изменения' : 'Добавить цель'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

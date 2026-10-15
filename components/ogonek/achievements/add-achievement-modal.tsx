'use client'

import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { useState } from 'react'
import {
  ACHIEVEMENT_CATEGORIES,
  computeAchievementProgress,
  getAchievementCategory,
  regulateAchievement,
  sanitizeRegulation,
} from '@/lib/ogonek/achievement-regulation'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type {
  AchievementCategoryId,
  AchievementEvidenceFile,
  AchievementRegulation,
} from '@/lib/ogonek/types'
import { ModalShell } from '../modal-shell'
import { AchievementEvidenceUploader } from './achievement-evidence-uploader'
import { AchievementRegulationCard } from './achievement-regulation-card'

type Props = {
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

type Step = 'category' | 'topic' | 'regulation'

function todayInput(): string {
  return new Date().toISOString().slice(0, 10)
}

function tempEvidenceId(): string {
  return `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Мастер верифицированной ачивки:
 *  1. выбор категории → 2. тема → 3. ИИ-регламент + сбор доказательств → отправка.
 */
export function AddAchievementModal({ onClose, onNotify, soundEnabled = true }: Props) {
  const { addVerifiedAchievement } = useOgonekStore()

  const [step, setStep] = useState<Step>('category')
  const [categoryId, setCategoryId] = useState<AchievementCategoryId | null>(null)
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [achievedAt, setAchievedAt] = useState(todayInput())
  const [regulation, setRegulation] = useState<AchievementRegulation | null>(null)
  const [evidence, setEvidence] = useState<AchievementEvidenceFile[]>([])
  const [loading, setLoading] = useState(false)

  const category = categoryId ? getAchievementCategory(categoryId) : null

  const progress = computeAchievementProgress({ regulation, evidence })
  const canSubmit = Boolean(regulation) && progress.complete

  const chooseCategory = (id: AchievementCategoryId) => {
    playClick(soundEnabled)
    const meta = getAchievementCategory(id)
    setCategoryId(id)
    setTitle((prev) => prev || meta.defaultTitle)
    setStep('topic')
  }

  const buildLocalRegulation = (): AchievementRegulation | null => {
    if (!categoryId) return null
    return regulateAchievement(categoryId, topic, false)
  }

  const requestRegulation = async () => {
    if (!categoryId) return
    if (!topic.trim()) {
      onNotify('Опиши достижение, чтобы ИИ построил регламент')
      return
    }

    playClick(soundEnabled)
    setLoading(true)
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const local = buildLocalRegulation()
        if (local) {
          setRegulation(local)
          setStep('regulation')
          onNotify('Оффлайн: регламент построен локально')
        }
        return
      }

      const res = await fetch('/api/achievements/regulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, topic: topic.trim() }),
      })

      if (!res.ok) throw new Error('Regulate request failed')

      const data = (await res.json()) as { regulation?: unknown; fallback?: boolean }
      const safe = sanitizeRegulation(data.regulation, categoryId, topic.trim())
      setRegulation(safe)
      setStep('regulation')
      playSuccess(soundEnabled)
      onNotify(data.fallback ? 'Регламент построен локально (ИИ недоступен)' : 'ИИ-ассистент выдал строгий регламент ✓')
    } catch {
      const local = buildLocalRegulation()
      if (local) {
        setRegulation(local)
        setStep('regulation')
        onNotify('Не удалось связаться с ИИ — регламент построен локально')
      } else {
        onNotify('Не удалось построить регламент')
      }
    } finally {
      setLoading(false)
    }
  }

  const attachEvidence = (file: Omit<AchievementEvidenceFile, 'id' | 'addedAtISO'>) => {
    setEvidence((prev) => [
      ...prev,
      { ...file, id: tempEvidenceId(), addedAtISO: new Date().toISOString() },
    ])
  }

  const removeEvidence = (id: string) => {
    playClick(soundEnabled)
    setEvidence((prev) => prev.filter((f) => f.id !== id))
  }

  const persist = (submit: boolean) => {
    if (!categoryId || !regulation) return
    const status = submit ? 'submitted' : 'draft'
    addVerifiedAchievement({
      categoryId,
      title: title.trim() || regulation.interpretedTopic || 'Ачивка',
      topic: topic.trim(),
      achievedAtISO: new Date(`${achievedAt}T12:00:00`).toISOString(),
      regulation,
      evidence,
      status,
    })
    playSuccess(soundEnabled)
    onNotify(
      submit
        ? 'Ачивка отправлена верификатору на проверку ✓'
        : 'Ачивка сохранена как черновик'
    )
    onClose()
  }

  const stepIndex = step === 'category' ? 0 : step === 'topic' ? 1 : 2

  return (
    <ModalShell title="Новая верифицированная ачивка" onClose={onClose}>
      <div className="ach-wizard">
        <ol className="ach-wizard-steps" aria-label="Шаги создания ачивки">
          {['Категория', 'Тема', 'Регламент доказательств'].map((label, index) => (
            <li key={label} className={index === stepIndex ? 'is-active' : index < stepIndex ? 'is-done' : ''}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {step === 'category' && (
          <div className="ach-wizard-body">
            <p className="ach-wizard-lead">
              Выбери категорию достижения — ИИ-ассистент подберёт строгий регламент доказательств.
            </p>
            <div className="ach-cat-grid">
              {ACHIEVEMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="ach-cat-card"
                  style={{ borderColor: `${cat.color}44` }}
                  onClick={() => chooseCategory(cat.id)}
                >
                  <span className="ach-cat-emoji" aria-hidden="true">
                    {cat.emoji}
                  </span>
                  <span className="ach-cat-name" style={{ color: cat.color }}>
                    {cat.label}
                  </span>
                  <span className="ach-cat-tagline">{cat.tagline}</span>
                  <span className="ach-cat-desc">{cat.description}</span>
                  <span className="ach-cat-examples">
                    {cat.examples.slice(0, 2).map((ex) => (
                      <span key={ex} className="ach-cat-example">
                        {ex}
                      </span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'topic' && category && (
          <div className="ach-wizard-body">
            <button type="button" className="ach-wizard-back" onClick={() => setStep('category')}>
              <ArrowLeft size={14} /> Другая категория
            </button>

            <div className="ach-wizard-chip">
              <span className="ach-cat-emoji" aria-hidden="true">
                {category.emoji}
              </span>
              {category.label}
            </div>

            <label className="ach-field">
              <span className="ach-label">Название ачивки</span>
              <input
                className="ach-input"
                value={title}
                maxLength={120}
                placeholder={category.defaultTitle}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label className="ach-field">
              <span className="ach-label">
                <Wand2 size={13} /> Что именно ты совершил?
              </span>
              <textarea
                className="ach-textarea"
                value={topic}
                maxLength={300}
                rows={3}
                placeholder={category.topicPlaceholder}
                onChange={(e) => setTopic(e.target.value)}
              />
              <span className="ach-counter">{topic.length}/300</span>
            </label>

            <label className="ach-field">
              <span className="ach-label">
                <CalendarDays size={13} /> Дата свершения
              </span>
              <input
                type="date"
                className="ach-input"
                value={achievedAt}
                max={todayInput()}
                onChange={(e) => setAchievedAt(e.target.value)}
              />
            </label>

            <button
              type="button"
              className="ach-primary-btn"
              onClick={requestRegulation}
              disabled={loading || !topic.trim()}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'ИИ анализирует тему…' : 'Получить регламент от ИИ'}
            </button>
          </div>
        )}

        {step === 'regulation' && regulation && (
          <div className="ach-wizard-body">
            <button
              type="button"
              className="ach-wizard-back"
              onClick={() => setStep('topic')}
            >
              <ArrowLeft size={14} /> Изменить тему
            </button>

            <AchievementRegulationCard regulation={regulation} />

            <div className="ach-reg-regen">
              <button type="button" className="ach-ghost-btn" onClick={requestRegulation} disabled={loading}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Перестроить регламент
              </button>
            </div>

            <AchievementEvidenceUploader
              requirements={regulation.requirements}
              evidence={evidence}
              onAttach={attachEvidence}
              onRemove={removeEvidence}
              onNotify={onNotify}
              soundEnabled={soundEnabled}
            />

            <div className="ach-wizard-footer">
              <button type="button" className="ach-ghost-btn" onClick={() => persist(false)}>
                <Save size={15} /> Сохранить черновик
              </button>
              <button
                type="button"
                className="ach-primary-btn"
                onClick={() => persist(true)}
                disabled={!canSubmit}
                title={canSubmit ? 'Отправить заявку верификатору' : 'Сначала приложи все обязательные доказательства'}
              >
                <Send size={15} /> Отправить на верификацию
              </button>
            </div>
            {!canSubmit && (
              <p className="ach-wizard-hint">
                Обязательных доказательств: {progress.requiredCovered} / {progress.requiredTotal}. Без
                полного комплекта заявку отправить нельзя.
              </p>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  )
}

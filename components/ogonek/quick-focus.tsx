'use client'

import { Check, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import { playSuccess } from '@/lib/ogonek/sound'

const PLACEHOLDERS = ['Главный шаг', 'Для себя', 'Если останется время'] as const

type Props = {
  initialFocus?: [string, string, string]
  onSave?: (focus: [string, string, string]) => void
  notify: (msg: string) => void
  soundEnabled?: boolean
}

export function QuickFocus({
  initialFocus,
  onSave,
  notify,
  soundEnabled = true,
}: Props) {
  const [focus, setFocus] = useState<[string, string, string]>(() => {
    return initialFocus || ['', '', '']
  })
  const [locked, setLocked] = useState(() => {
    return Boolean(initialFocus && initialFocus.some((f) => f.trim().length > 0))
  })

  useEffect(() => {
    if (initialFocus && initialFocus.some((f) => f.trim().length > 0)) {
      setFocus(initialFocus)
      setLocked(true)
    }
  }, [initialFocus])

  const handleInputChange = (index: 0 | 1 | 2, value: string) => {
    setFocus((prev) => {
      const next: [string, string, string] = [...prev]
      next[index] = value
      return next
    })
  }

  const handleSave = () => {
    setLocked(true)
    if (onSave) {
      onSave(focus)
    }
    playSuccess(soundEnabled)
    notify('Фокус зафиксирован и сохранён в локальном хранилище. Теперь действуй.')
  }

  return (
    <section id="focus" className={`focus-card ${locked ? 'locked' : ''}`} aria-labelledby="focus-title">
      <div className="section-kicker">
        <Target size={16} /> Утренний фокус <span>Сегодня, 09:14</span>
      </div>
      <h2 id="focus-title">Что задумал сделать сегодня великого?</h2>
      <div className="focus-grid">
        {focus.map((val, i) => (
          <div className="focus-input" key={i}>
            <span>{i + 1}</span>
            <input
              disabled={locked}
              value={val}
              onChange={(e) => handleInputChange(i as 0 | 1 | 2, e.target.value)}
              placeholder={PLACEHOLDERS[i]}
              aria-label={`Фокус ${i + 1}: ${PLACEHOLDERS[i]}`}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="small-action"
        onClick={handleSave}
        disabled={locked}
      >
        {locked ? (
          <>
            <Check size={16} /> Фокус зафиксирован
          </>
        ) : (
          <>
            <Check size={16} /> Сохранить фокус
          </>
        )}
      </button>
    </section>
  )
}

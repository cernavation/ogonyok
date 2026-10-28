'use client'

import { Check, Clock, Sparkles, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  STORY_TEMPLATES,
  createMyStory,
  formatStoryAge,
  getStoryTemplate,
  type StoryTemplateContext,
} from '@/lib/ogonek/stories'
import type { MyStory } from '@/lib/ogonek/types'
import { ModalShell } from './modal-shell'
import { getInitials } from '@/lib/ogonek/initials'

type Props = {
  context: StoryTemplateContext
  myStories: MyStory[]
  myAvatarSrc: string | null
  displayName: string
  username: string
  onPublish: (story: MyStory) => void
  onDelete: (id: string) => void
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const LIFETIME_OPTIONS: Array<{ hours: 12 | 24 | 48; label: string }> = [
  { hours: 12, label: '12 часов' },
  { hours: 24, label: '24 часа' },
  { hours: 48, label: '48 часов' },
]

export function StoryComposerModal({
  context,
  myStories,
  myAvatarSrc,
  displayName,
  username,
  onPublish,
  onDelete,
  onClose,
  onNotify,
  soundEnabled = true,
}: Props) {
  useBodyScrollLock(true)

  const [templateId, setTemplateId] = useState(STORY_TEMPLATES[0].id)
  const [content, setContent] = useState('')
  const [lifetimeHours, setLifetimeHours] = useState<12 | 24 | 48>(24)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const template = useMemo(() => getStoryTemplate(templateId), [templateId])

  // При смене шаблона подставляем живые значения из контекста
  useEffect(() => {
    const seeded = createMyStory(templateId, context)
    const initialText = seeded.headline + (seeded.detail ? `\n${seeded.detail}` : '')
    setContent(initialText.slice(0, 280))
  }, [templateId, context])

  // Авто-высота textarea
  const handleTextChange = (val: string) => {
    setContent(val)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`
    }
  }

  const handlePublish = () => {
    playSuccess(soundEnabled)
    const base = createMyStory(templateId, context)
    const trimmed = content.trim().slice(0, 280) || base.headline
    const expiresAt = new Date(Date.now() + lifetimeHours * 3600 * 1000).toISOString()

    const story: MyStory = {
      ...base,
      headline: trimmed,
      detail: '',
      expires_at: expiresAt,
      expiresAtISO: expiresAt,
    }
    onPublish(story)
    onNotify('История опубликована — друзья увидят яркий кружок ✨')
    onClose()
  }

  const handleDelete = (id: string) => {
    playClick(soundEnabled)
    onDelete(id)
    onNotify('Кадр истории удалён')
  }

  return (
    <ModalShell title="Моя история" onClose={onClose}>
      <div className="story-composer">
        {/* Живой предпросмотр 9:16 */}
        <div className="story-composer__preview">
          <div
            className="story-composer__card"
            style={{ background: `linear-gradient(150deg, ${template.from}, ${template.to})` }}
          >
            <span
              className="story-composer__glow"
              style={{ background: `radial-gradient(circle at 76% 6%, ${template.accent}, transparent 60%)` }}
              aria-hidden="true"
            />
            <div className="story-composer__head">
              <span className="story-composer__ring">
                <span className="story-composer__ava" style={{ background: '#1d4ed8', color: '#ffffff' }}>
                  {myAvatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={myAvatarSrc} alt="" />
                  ) : (
                    getInitials(displayName)
                  )}
                </span>
              </span>
              <span className="story-composer__head-text">
                <span className="story-composer__head-name">
                  {displayName}
                  <span className="story-composer__verified flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[var(--primary)] text-white" aria-hidden="true"><Check size={8} strokeWidth={3} /></span>
                </span>
                <span className="story-composer__head-meta">@{username} · твоя история</span>
              </span>
            </div>

            <div className="story-composer__card-body flex flex-col justify-center items-center text-center px-4 py-6">
              <span className="story-composer__kicker text-xs font-bold tracking-wider uppercase mb-1" style={{ color: template.accent }}>
                {template.kicker}
              </span>
              <span className="story-composer__emoji text-4xl mb-3">{template.emoji}</span>
              <p className="text-lg sm:text-xl font-semibold leading-relaxed break-words max-w-full text-white text-center">
                {content || 'Твой кадр'}
              </p>
              <div className="mt-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 text-[11px] text-white/90 font-mono">
                <Clock size={11} className="text-white/70" />
                <span>{lifetimeHours}ч</span>
              </div>
            </div>
          </div>
        </div>

        {/* Редактор */}
        <div className="story-composer__editor">
          <p className="story-composer__label">Шаблон кадра</p>
          <div className="story-composer__templates" role="group" aria-label="Шаблоны кадра">
            {STORY_TEMPLATES.map((t) => {
              const active = t.id === templateId
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`story-composer__template ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    playClick(soundEnabled)
                    setTemplateId(t.id)
                  }}
                  aria-pressed={active}
                  style={active ? { borderColor: t.accent } : undefined}
                >
                  <span aria-hidden="true">{t.emoji}</span>
                  {t.label}
                </button>
              )
            })}
          </div>

          <label className="story-composer__field">
            <div className="flex items-center justify-between">
              <span>Текст истории</span>
              <span className="text-xs text-[var(--text-3)] font-mono">{content.length}/280</span>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleTextChange(e.target.value)}
              maxLength={280}
              rows={4}
              placeholder="О чём твой кадр? (до 280 символов)"
              className="w-full resize-none rounded-xl p-3 bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-[15px] focus:outline-none focus:border-[var(--accent)] transition-colors leading-relaxed"
            />
          </label>

          {/* Выбор времени жизни сторис */}
          <div className="flex flex-col gap-1.5">
            <span className="story-composer__label flex items-center gap-1.5">
              <Clock size={13} /> Время жизни сторис
            </span>
            <div className="flex items-center gap-2">
              {LIFETIME_OPTIONS.map((opt) => {
                const isSelected = lifetimeHours === opt.hours
                return (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      setLifetimeHours(opt.hours)
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-white text-black shadow-md font-bold'
                        : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button type="button" className="x-primary-btn story-composer__publish mt-2" onClick={handlePublish}>
            <Upload size={16} />
            Опубликовать историю ({lifetimeHours}ч)
          </button>

          {myStories.length > 0 && (
            <div className="story-composer__existing">
              <p className="story-composer__label">
                <Sparkles size={13} aria-hidden="true" /> Уже в истории ({myStories.length})
              </p>
              <div className="story-composer__chips">
                {myStories.map((s) => (
                  <span key={s.id} className="story-composer__chip">
                    <span aria-hidden="true">{s.emoji}</span>
                    <span className="story-composer__chip-text">
                      <span className="story-composer__chip-title">{s.headline}</span>
                      <span className="story-composer__chip-age">{formatStoryAge(s.createdAtISO)}</span>
                    </span>
                    <button
                      type="button"
                      className="story-composer__chip-del"
                      onClick={() => handleDelete(s.id)}
                      aria-label={`Удалить кадр «${s.headline}»`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

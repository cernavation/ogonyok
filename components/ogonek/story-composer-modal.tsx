'use client'

import { Check, Sparkles, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

import { getInitials } from '@/lib/ogonek/initials'

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
  const [templateId, setTemplateId] = useState(STORY_TEMPLATES[0].id)
  const [headline, setHeadline] = useState('')
  const [detail, setDetail] = useState('')

  const template = useMemo(() => getStoryTemplate(templateId), [templateId])

  // При смене шаблона подставляем живые значения из контекста
  useEffect(() => {
    const seeded = createMyStory(templateId, context)
    setHeadline(seeded.headline)
    setDetail(seeded.detail)
  }, [templateId, context])

  const handlePublish = () => {
    playSuccess(soundEnabled)
    const base = createMyStory(templateId, context)
    const story: MyStory = {
      ...base,
      headline: headline.trim().slice(0, 120) || base.headline,
      detail: detail.trim().slice(0, 200) || base.detail,
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

            <div className="story-composer__card-body">
              <span className="story-composer__kicker" style={{ color: template.accent }}>
                {template.kicker}
              </span>
              <span className="story-composer__emoji">{template.emoji}</span>
              <span className="story-composer__headline">{headline || 'Твой кадр'}</span>
              <span className="story-composer__detail">{detail}</span>
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
            <span>Заголовок</span>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={120}
              placeholder="О чём твой кадр?"
            />
          </label>

          <label className="story-composer__field">
            <span>Подпись</span>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Пара слов поддержки себе"
            />
          </label>

          <button type="button" className="x-primary-btn story-composer__publish" onClick={handlePublish}>
            <Upload size={16} />
            Опубликовать историю
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

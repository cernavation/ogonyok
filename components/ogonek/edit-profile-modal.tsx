'use client'

import {
  AtSign,
  BadgeCheck,
  Camera,
  Check,
  Globe,
  ImageIcon,
  Link2,
  MapPin,
  Plus,
  Sparkles,
  Target,
  Trash2,
  User,
  Wand2,
} from 'lucide-react'
import { useCallback, useId, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { savePhoto } from '@/lib/ogonek/photos'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  AVATAR_PRESETS,
  BANNER_PRESETS,
  GOAL_SUGGESTIONS,
  SOCIAL_PLATFORMS,
  getBannerPreset,
  getSocialPlatformMeta,
  normalizeSocialUrl,
} from '@/lib/ogonek/profile-presets'
import type { OgonekProfile, ProfileSocialLink, ProfileSocialPlatform } from '@/lib/ogonek/types'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { ModalShell } from './modal-shell'

type Props = {
  profile: OgonekProfile
  onSave: (patch: Partial<OgonekProfile>) => void
  onReset: () => void
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const BIO_MAX = 400
const NAME_MAX = 80
const USERNAME_MAX = 40

function initialsFrom(name: string): string {
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return 'AC'
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
}

function newLinkId(): string {
  return `link-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function EditProfileModal({
  profile,
  onSave,
  onReset,
  onClose,
  onNotify,
  soundEnabled = true,
}: Props) {
  const [draft, setDraft] = useState<OgonekProfile>(profile)
  const [savedFlash, setSavedFlash] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const flashTimer = useRef<NodeJS.Timeout | null>(null)
  const titleId = useId()

  const avatarSrc = usePhotoUrl(draft.avatarImage)
  const bannerSrc = usePhotoUrl(draft.bannerImage)
  const bannerPreset = useMemo(() => getBannerPreset(draft.bannerPreset), [draft.bannerPreset])

  const flashSaved = useCallback(() => {
    setSavedFlash(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1400)
  }, [])

  /** Мгновенно применяет патч: обновляет локальный черновик и пишет в store */
  const applyPatch = useCallback(
    (patch: Partial<OgonekProfile>) => {
      setDraft((prev) => ({ ...prev, ...patch }))
      onSave(patch)
      flashSaved()
    },
    [onSave, flashSaved]
  )

  const handleAvatarFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    playClick(soundEnabled)
    try {
      const id = await savePhoto(file)
      applyPatch({ avatarImage: id })
      playSuccess(soundEnabled)
      onNotify('Аватар обновлён и сохранён')
    } catch {
      onNotify('Не удалось загрузить аватар')
    }
  }

  const handleBannerFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    playClick(soundEnabled)
    try {
      const id = await savePhoto(file)
      applyPatch({ bannerImage: id })
      playSuccess(soundEnabled)
      onNotify('Обложка профиля обновлена')
    } catch {
      onNotify('Не удалось загрузить обложку')
    }
  }

  const updateLink = (id: string, patch: Partial<ProfileSocialLink>) => {
    const next = draft.socialLinks.map((link) =>
      link.id === id ? { ...link, ...patch } : link
    )
    applyPatch({ socialLinks: next })
  }

  const addLink = () => {
    playClick(soundEnabled)
    const usedPlatforms = new Set(draft.socialLinks.map((l) => l.platform))
    const nextPlatform =
      SOCIAL_PLATFORMS.find((p) => !usedPlatforms.has(p.id))?.id ?? 'custom'
    const meta = getSocialPlatformMeta(nextPlatform)
    applyPatch({
      socialLinks: [
        ...draft.socialLinks,
        { id: newLinkId(), platform: nextPlatform, label: meta.label, url: '' },
      ],
    })
  }

  const removeLink = (id: string) => {
    playClick(soundEnabled)
    applyPatch({ socialLinks: draft.socialLinks.filter((link) => link.id !== id) })
  }

  const handleDone = () => {
    playSuccess(soundEnabled)
    onNotify('Профиль сохранён ✓')
    onClose()
  }

  const handleReset = () => {
    playClick(soundEnabled)
    onReset()
    onNotify('Профиль сброшен к исходному виду')
  }

  const initials = initialsFrom(draft.displayName)

  return (
    <ModalShell title="Редактировать профиль" onClose={onClose}>
      <div id={titleId} className="epm">
        {/* ── Cover / banner picker ─────────────────────────────── */}
        <section className="epm-section" aria-label="Обложка профиля">
          <div className="epm-section-head">
            <span className="epm-section-title">
              <ImageIcon size={15} /> Обложка профиля
            </span>
            {savedFlash && (
              <span className="epm-saved">
                <Check size={13} /> Сохранено
              </span>
            )}
          </div>

          {/* Live banner preview */}
          <div
            className="epm-banner-preview"
            style={{
              background: bannerSrc ? undefined : bannerPreset.background,
            }}
          >
            {bannerSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerSrc} alt="Обложка профиля" className="epm-banner-img" />
            )}
            {!bannerSrc && bannerPreset.mountains && (
              <svg
                className="epm-banner-mountains"
                viewBox="0 0 600 80"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M0,80 L0,50 L80,20 L160,45 L240,10 L320,35 L380,5 L460,30 L530,15 L600,25 L600,80 Z"
                  fill="#0a1929"
                  opacity="0.8"
                />
                <path
                  d="M0,80 L0,65 L60,40 L140,60 L200,30 L280,55 L360,25 L440,50 L520,35 L600,45 L600,80 Z"
                  fill="#050d17"
                  opacity="0.6"
                />
              </svg>
            )}
            <div className="epm-banner-actions">
              <button
                type="button"
                className="epm-banner-btn"
                onClick={() => bannerInputRef.current?.click()}
              >
                <Camera size={14} /> Загрузить фото
              </button>
              {draft.bannerImage && (
                <button
                  type="button"
                  className="epm-banner-btn epm-banner-btn--danger"
                  onClick={() => {
                    playClick(soundEnabled)
                    applyPatch({ bannerImage: null })
                  }}
                >
                  <Trash2 size={14} /> Убрать
                </button>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleBannerFile}
              aria-label="Загрузить фото обложки"
            />
          </div>

          {/* Preset swatches */}
          <p className="epm-hint">Или выбери готовую обложку:</p>
          <div className="epm-swatch-grid" role="listbox" aria-label="Готовые обложки">
            {BANNER_PRESETS.map((preset) => {
              const active = !draft.bannerImage && draft.bannerPreset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  title={preset.label}
                  className={`epm-swatch ${active ? 'is-active' : ''}`}
                  style={{ background: preset.background }}
                  onClick={() => {
                    playClick(soundEnabled)
                    applyPatch({ bannerPreset: preset.id, bannerImage: null })
                  }}
                >
                  {active && <Check size={16} />}
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Avatar picker ─────────────────────────────────────── */}
        <section className="epm-section" aria-label="Аватар профиля">
          <span className="epm-section-title">
            <User size={15} /> Аватар
          </span>
          <div className="epm-avatar-row">
            <button
              type="button"
              className="epm-avatar"
              style={{
                background: avatarSrc ? undefined : draft.avatarColor,
              }}
              onClick={() => avatarInputRef.current?.click()}
              aria-label="Загрузить новый аватар"
              title="Нажми, чтобы загрузить фото"
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="Аватар" />
              ) : (
                <span>{initials}</span>
              )}
              <span className="epm-avatar-overlay">
                <Camera size={20} />
              </span>
            </button>

            <div className="epm-avatar-controls">
              <div className="epm-avatar-buttons">
                <button
                  type="button"
                  className="epm-chip-btn"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera size={13} /> Загрузить фото
                </button>
                {draft.avatarImage && (
                  <button
                    type="button"
                    className="epm-chip-btn epm-chip-btn--danger"
                    onClick={() => {
                      playClick(soundEnabled)
                      applyPatch({ avatarImage: null })
                    }}
                  >
                    <Trash2 size={13} /> Убрать
                  </button>
                )}
              </div>
              <p className="epm-hint">Или выбери акцентный градиент:</p>
              <div className="epm-avatar-colors" role="listbox" aria-label="Цвета аватара">
                {AVATAR_PRESETS.map((preset) => {
                  const active = !draft.avatarImage && draft.avatarColor === preset.background
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      title={preset.label}
                      className={`epm-color-dot ${active ? 'is-active' : ''}`}
                      style={{ background: preset.background }}
                      onClick={() => {
                        playClick(soundEnabled)
                        applyPatch({ avatarColor: preset.background, avatarImage: null })
                      }}
                    >
                      {active && <Check size={13} />}
                    </button>
                  )
                })}
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarFile}
              aria-label="Загрузить фото аватара"
            />
          </div>
        </section>

        {/* ── Identity fields ───────────────────────────────────── */}
        <section className="epm-section" aria-label="Основные данные">
          <label className="epm-field">
            <span className="epm-label">
              <User size={13} /> Имя
            </span>
            <input
              className="epm-input"
              value={draft.displayName}
              maxLength={NAME_MAX}
              placeholder="Как тебя зовут"
              onChange={(e) => applyPatch({ displayName: e.target.value })}
            />
          </label>

          <label className="epm-field">
            <span className="epm-label">
              <AtSign size={13} /> Имя пользователя
            </span>
            <div className="epm-input-prefix">
              <span className="epm-prefix">@</span>
              <input
                className="epm-input epm-input--with-prefix"
                value={draft.username}
                maxLength={USERNAME_MAX}
                placeholder="username"
                onChange={(e) =>
                  applyPatch({
                    username: e.target.value.replace(/[\s@]/g, '').toLowerCase(),
                  })
                }
              />
            </div>
          </label>

          <label className="epm-field">
            <span className="epm-label">О себе</span>
            <textarea
              className="epm-textarea"
              value={draft.bio}
              maxLength={BIO_MAX}
              rows={3}
              placeholder="Расскажи, чем гордишься и куда идёшь"
              onChange={(e) => applyPatch({ bio: e.target.value })}
            />
            <span className="epm-counter">
              {draft.bio.length}/{BIO_MAX}
            </span>
          </label>

          <div className="epm-grid-2">
            <label className="epm-field">
              <span className="epm-label">
                <MapPin size={13} /> Город
              </span>
              <input
                className="epm-input"
                value={draft.city}
                maxLength={80}
                placeholder="Город / страна"
                onChange={(e) => applyPatch({ city: e.target.value })}
              />
            </label>

            <label className="epm-field">
              <span className="epm-label">
                <Globe size={13} /> Сайт
              </span>
              <input
                className="epm-input"
                value={draft.website}
                maxLength={300}
                placeholder="https://..."
                onChange={(e) => applyPatch({ website: e.target.value })}
              />
            </label>
          </div>

          <div className="epm-toggle-row">
            <div className="epm-toggle-info">
              <BadgeCheck size={16} className="text-[#1d9bf0]" />
              <div>
                <b>Синяя галочка</b>
                <small>Показывать бейдж «Верифицирован» в профиле</small>
              </div>
            </div>
            <button
              type="button"
              className={`epm-switch ${draft.verified ? 'is-on' : ''}`}
              aria-pressed={draft.verified}
              onClick={() => {
                playClick(soundEnabled)
                applyPatch({ verified: !draft.verified })
              }}
            >
              <i />
            </button>
          </div>
        </section>

        {/* ── Social links ──────────────────────────────────────── */}
        <section className="epm-section" aria-label="Соцсети и ссылки">
          <div className="epm-section-head">
            <span className="epm-section-title">
              <Link2 size={15} /> Соцсети и ссылки
            </span>
            <button type="button" className="epm-add-btn" onClick={addLink}>
              <Plus size={14} /> Добавить
            </button>
          </div>

          {draft.socialLinks.length === 0 && (
            <p className="epm-empty">Пока нет ссылок. Добавь Telegram, Instagram или сайт.</p>
          )}

          <div className="epm-links">
            {draft.socialLinks.map((link) => {
              const meta = getSocialPlatformMeta(link.platform)
              return (
                <div key={link.id} className="epm-link-row">
                  <span
                    className="epm-link-dot"
                    style={{ background: meta.color }}
                    aria-hidden="true"
                  />
                  <select
                    className="epm-select"
                    value={link.platform}
                    onChange={(e) => {
                      const platform = e.target.value as ProfileSocialPlatform
                      const nextMeta = getSocialPlatformMeta(platform)
                      updateLink(link.id, {
                        platform,
                        label: nextMeta.label,
                        url: normalizeSocialUrl(platform, link.url),
                      })
                    }}
                    aria-label="Платформа ссылки"
                  >
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="epm-input epm-link-input"
                    value={link.url}
                    placeholder={meta.placeholder}
                    onChange={(e) => updateLink(link.id, { url: e.target.value })}
                    onBlur={(e) =>
                      updateLink(link.id, {
                        url: normalizeSocialUrl(link.platform, e.target.value),
                      })
                    }
                    aria-label={`Ссылка ${meta.label}`}
                  />
                  <button
                    type="button"
                    className="epm-icon-btn"
                    onClick={() => removeLink(link.id)}
                    aria-label={`Удалить ссылку ${meta.label}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Monthly main goal ─────────────────────────────────── */}
        <section className="epm-section epm-section--goal" aria-label="Главная цель месяца">
          <span className="epm-section-title">
            <Target size={15} className="text-[#ff6b35]" /> Главная цель месяца
          </span>
          <textarea
            className="epm-textarea epm-textarea--goal"
            value={draft.monthlyGoal}
            maxLength={200}
            rows={2}
            placeholder="Одна большая цель на этот месяц"
            onChange={(e) => applyPatch({ monthlyGoal: e.target.value })}
          />
          <div className="epm-goal-chips">
            {GOAL_SUGGESTIONS.slice(0, 4).map((goal) => (
              <button
                key={goal}
                type="button"
                className={`epm-goal-chip ${draft.monthlyGoal === goal ? 'is-active' : ''}`}
                onClick={() => {
                  playClick(soundEnabled)
                  applyPatch({ monthlyGoal: goal })
                }}
                title={goal}
              >
                <Wand2 size={12} /> {goal.length > 34 ? `${goal.slice(0, 34)}…` : goal}
              </button>
            ))}
          </div>
          <p className="epm-hint">
            <Sparkles size={12} /> Цель синхронизируется с профилем и видна в шапке.
          </p>
        </section>

        {/* ── Footer ────────────────────────────────────────────── */}
        <footer className="epm-footer">
          <button type="button" className="epm-reset-btn" onClick={handleReset}>
            <Trash2 size={14} /> Сбросить профиль
          </button>
          <button type="button" className="epm-done-btn" onClick={handleDone}>
            <Check size={16} /> Готово
          </button>
        </footer>
      </div>
    </ModalShell>
  )
}

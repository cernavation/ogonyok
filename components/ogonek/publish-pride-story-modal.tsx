'use client'

import { Check, ImagePlus, Loader2, Lock, Sparkles, Trash2, Upload } from 'lucide-react'
import { useMemo, useState, type ChangeEvent } from 'react'
import { savePhoto } from '@/lib/ogonek/photos'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { STORY_BACKGROUNDS, createPrideStory, getStoryBackground } from '@/lib/ogonek/stories'
import type { MyStory, VisibilityLevel } from '@/lib/ogonek/types'
import { normalizeVisibility, visibilityMeta } from '@/lib/ogonek/visibility'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { ModalShell } from './modal-shell'
import { VisibilitySwitcher } from './visibility-switcher'

type Props = {
  /** Текст публикуемой гордости */
  prideText: string
  /** Индекс гордости в дне */
  prideIndex: number
  /** Сила гордости 1..10 (для подписи кадра) */
  scale?: number
  /** id дня-источника */
  dayId?: number | null
  /** Человекочитаемая метка дня: «12 октября» */
  dayLabel?: string
  displayName: string
  username: string
  avatarColor: string
  avatarSrc: string | null
  verified: boolean
  /** Приватность, унаследованная от гордости */
  defaultVisibility?: VisibilityLevel
  onPublish: (story: MyStory) => void
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

import { getInitials } from '@/lib/ogonek/initials'

/**
 * ЭТАП 9 — Публикация КОНКРЕТНОЙ гордости в Сторис.
 * Позволяет выбрать фон (градиент), приложить фото, задать подпись и приватность.
 */
export function PublishPrideStoryModal({
  prideText,
  prideIndex,
  scale,
  dayId,
  dayLabel,
  displayName,
  username,
  avatarColor,
  avatarSrc,
  verified,
  defaultVisibility = 'public',
  onPublish,
  onClose,
  onNotify,
  soundEnabled = true,
}: Props) {
  const [backgroundId, setBackgroundId] = useState(() => STORY_BACKGROUNDS[0].id)
  const [photo, setPhoto] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [headline, setHeadline] = useState(() => prideText.slice(0, 120))
  const [detail, setDetail] = useState('')
  const [visibility, setVisibility] = useState<VisibilityLevel>(() =>
    normalizeVisibility(defaultVisibility)
  )

  const bg = useMemo(() => getStoryBackground(backgroundId), [backgroundId])
  const photoSrc = usePhotoUrl(photo)
  const activeVisibility = visibilityMeta(visibility)

  const clampScale = typeof scale === 'number' && scale > 0 ? Math.min(10, Math.max(1, Math.round(scale))) : null

  const previewHeadline = headline.trim() || prideText || 'Гордость дня'
  const detailFallback = `Гордость №${prideIndex + 1}${clampScale ? ` · ${clampScale}/10` : ''}${
    dayLabel ? ` · ${dayLabel}` : ''
  }`
  const previewDetail = detail.trim() || detailFallback

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    playClick(soundEnabled)
    setUploading(true)
    try {
      const id = await savePhoto(file)
      setPhoto(id)
      onNotify('Фото добавлено в кадр')
    } catch {
      onNotify('Не удалось добавить фото')
    } finally {
      setUploading(false)
    }
  }

  const handlePublish = () => {
    if (!previewHeadline.trim()) return
    playSuccess(soundEnabled)
    const story = createPrideStory({
      dayId: dayId ?? null,
      dayLabel,
      prideIndex,
      prideText,
      scale: clampScale ?? undefined,
      backgroundId,
      photo,
      visibility,
      headline,
      detail,
    })
    onPublish(story)
    onNotify('💪 Гордость опубликована в Сторис — кружок «Моя история» зажжён')
    onClose()
  }

  return (
    <ModalShell title="Опубликовать гордость в Сторис" onClose={onClose}>
      <p className="text-[13px] leading-[18px] text-[#71767b]">
        Выбери фон и фото, добавь подпись — гордость превратится в вертикальный кадр 9:16.
      </p>

      <div className="mt-4 grid gap-5 md:grid-cols-[210px_1fr]">
        {/* Живой предпросмотр 9:16 */}
        <div className="mx-auto w-[210px] max-w-full">
          <div
            className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-white/10"
            style={{ background: `linear-gradient(150deg, ${bg.from}, ${bg.to})` }}
          >
            {photoSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoSrc}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-65"
              />
            )}
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.78) 100%), radial-gradient(circle at 78% 6%, ${bg.accent}, transparent 60%)`,
                opacity: 0.9,
              }}
              aria-hidden="true"
            />
            <div className="relative flex h-full flex-col p-3.5">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-8 w-8 flex-none place-items-center rounded-full p-0.5"
                  style={{ background: 'linear-gradient(135deg, #ff6b35, #ffa600)' }}
                >
                  <span
                    className="grid h-full w-full place-items-center overflow-hidden rounded-full text-[11px] font-extrabold text-white"
                    style={{ background: avatarColor }}
                  >
                    {avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                    ) : (
                      getInitials(displayName)
                    )}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 truncate text-[11px] font-extrabold text-white">
                    {displayName}
                    {verified && (
                      <span className="flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full bg-[#1d9bf0] text-white">
                        <Check size={8} strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[9px] text-white/60">@{username} · сторис</span>
                </span>
              </div>

              <div className="mt-auto">
                <span
                  className="mb-1.5 block text-[9px] font-black tracking-[0.2em]"
                  style={{ color: bg.accent }}
                >
                  ГОРДОСТЬ ДНЯ
                </span>
                <span className="mb-1.5 block text-[26px] leading-[1.02]" aria-hidden="true">
                  💪
                </span>
                <span className="block break-words text-[22px] font-black leading-[1.03] text-white">
                  {previewHeadline}
                </span>
                <span className="mt-1.5 block text-[11px] leading-[15px] text-white/80">
                  {previewDetail}
                </span>
              </div>
            </div>
          </div>

          <div
            className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold"
            style={{ color: activeVisibility.color }}
          >
            <Lock size={12} />
            {activeVisibility.shortLabel} · {activeVisibility.label.toLowerCase()}
          </div>
        </div>

        {/* Редактор */}
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Выбор фона */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-[#71767b]">
              <Sparkles size={13} /> Фон кадра
            </p>
            <div className="flex flex-wrap gap-2">
              {STORY_BACKGROUNDS.map((background) => {
                const active = background.id === backgroundId
                return (
                  <button
                    key={background.id}
                    type="button"
                    className={`h-10 w-10 rounded-xl border-2 transition-transform duration-150 hover:scale-105 ${
                      active ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ background: `linear-gradient(150deg, ${background.from}, ${background.to})` }}
                    onClick={() => {
                      playClick(soundEnabled)
                      setBackgroundId(background.id)
                    }}
                    aria-pressed={active}
                    aria-label={`Фон: ${background.label}`}
                    title={background.label}
                  />
                )
              })}
            </div>
          </div>

          {/* Фото */}
          <div className="flex items-center gap-2">
            <label className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-800/80 px-3 py-2.5 transition-colors hover:bg-white/[0.03]">
              {uploading ? (
                <Loader2 size={18} className="flex-none animate-spin text-[#1d9bf0]" />
              ) : (
                <ImagePlus size={18} className="flex-none text-[#1d9bf0]" />
              )}
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-bold text-[#e7e9ea]">
                  {photo ? 'Фото добавлено ✓' : 'Приложить своё фото'}
                </b>
                <small className="block text-[11px] text-[#71767b]">JPG / PNG — станет фоном кадра</small>
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="sr-only"
                aria-label="Приложить фото к сторис"
              />
            </label>
            {photo && (
              <button
                type="button"
                className="grid h-9 w-9 flex-none place-items-center rounded-xl text-[#71767b] transition-colors hover:bg-white/[0.08] hover:text-white"
                onClick={() => {
                  playClick(soundEnabled)
                  setPhoto(null)
                }}
                aria-label="Убрать фото"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Заголовок и подпись */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-[#71767b]">Заголовок кадра</span>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={120}
              placeholder="О чём твоя гордость?"
              className="rounded-xl border border-zinc-800/80 bg-black px-3 py-2.5 text-[14px] text-[#e7e9ea] placeholder:text-[#71767b] focus:border-[#1d9bf0] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-[#71767b]">Подпись</span>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder={detailFallback}
              className="resize-none rounded-xl border border-zinc-800/80 bg-black px-3 py-2.5 text-[14px] text-[#e7e9ea] placeholder:text-[#71767b] focus:border-[#1d9bf0] focus:outline-none"
            />
          </label>

          {/* Приватность сторис */}
          <div className="rounded-xl border border-zinc-800/80 p-3">
            <VisibilitySwitcher
              value={visibility}
              onChange={setVisibility}
              label="Кто увидит сторис"
              soundEnabled={soundEnabled}
              showHint
            />
          </div>

          <button
            type="button"
            className="mt-1 flex items-center justify-center gap-2 rounded-full bg-[#1d9bf0] px-5 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-[#1a8cd8]"
            onClick={handlePublish}
          >
            <Upload size={17} />
            Опубликовать в Сторис
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

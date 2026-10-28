'use client'

import {
  Check,
  Copy,
  Download,
  FileCode,
  ImageDown,
  Link as LinkIcon,
  Loader2,
  Share2,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { downloadBlob } from '@/lib/ogonek/card-export'
import {
  PROFILE_CARD_THEMES,
  buildProfileShareUrl,
  exportProfileCardAsPng,
  formatProfileAsText,
  generateProfileCardSvg,
  svgToDataUrl,
  urlToDataUrl,
  type ProfileCardThemeId,
  type ProfileStats,
} from '@/lib/ogonek/profile-share'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { OgonekProfile } from '@/lib/ogonek/types'
import { ModalShell } from './modal-shell'

type Props = {
  profile: OgonekProfile
  stats: ProfileStats
  /** Уже разрешённый URL аватара (blob:/data:/http:) */
  avatarSrc: string | null
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

type FlashKey = 'link' | 'text' | 'png' | 'svg' | 'image' | 'share' | null

export function ShareProfileModal({
  profile,
  stats,
  avatarSrc,
  onClose,
  onNotify,
  soundEnabled = true,
}: Props) {
  const [themeId, setThemeId] = useState<ProfileCardThemeId>('ember')
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [flash, setFlash] = useState<FlashKey>(null)
  const [busy, setBusy] = useState<FlashKey>(null)

  const shareUrl = useMemo(() => buildProfileShareUrl(profile.username), [profile.username])

  // Превращаем аватар в data URL, чтобы он корректно встраивался в SVG/PNG
  useEffect(() => {
    let cancelled = false
    if (!avatarSrc) {
      setAvatarDataUrl(null)
      return
    }
    urlToDataUrl(avatarSrc)
      .then((data) => {
        if (!cancelled) setAvatarDataUrl(data)
      })
      .catch(() => {
        if (!cancelled) setAvatarDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [avatarSrc])

  const svg = useMemo(
    () => generateProfileCardSvg(profile, stats, { themeId, avatarDataUrl, shareUrl }),
    [profile, stats, themeId, avatarDataUrl, shareUrl]
  )
  const previewUrl = useMemo(() => svgToDataUrl(svg), [svg])
  const shareText = useMemo(
    () => formatProfileAsText(profile, stats, shareUrl),
    [profile, stats, shareUrl]
  )

  const flashFor = (key: FlashKey) => {
    setFlash(key)
    setTimeout(() => setFlash((current) => (current === key ? null : current)), 1900)
  }

  const handleCopyLink = async () => {
    playClick(soundEnabled)
    try {
      await navigator.clipboard.writeText(shareUrl)
      flashFor('link')
      onNotify('Ссылка на профиль скопирована!')
    } catch {
      onNotify('Не удалось скопировать ссылку')
    }
  }

  const handleCopyText = async () => {
    playClick(soundEnabled)
    try {
      await navigator.clipboard.writeText(shareText)
      flashFor('text')
      onNotify('Текст визитки скопирован!')
    } catch {
      onNotify('Не удалось скопировать текст')
    }
  }

  const handleDownloadPng = async () => {
    playClick(soundEnabled)
    setBusy('png')
    try {
      const blob = await exportProfileCardAsPng(profile, stats, {
        themeId,
        avatarDataUrl,
        shareUrl,
      })
      downloadBlob(blob, `ogonek-card-${profile.username}.png`)
      flashFor('png')
      playSuccess(soundEnabled)
      onNotify('Карточка-визитка сохранена в PNG')
    } catch {
      onNotify('Ошибка при экспорте PNG')
    } finally {
      setBusy(null)
    }
  }

  const handleDownloadSvg = () => {
    playClick(soundEnabled)
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      downloadBlob(blob, `ogonek-card-${profile.username}.svg`)
      flashFor('svg')
      onNotify('Векторная визитка сохранена в SVG')
    } catch {
      onNotify('Ошибка при экспорте SVG')
    }
  }

  const handleCopyImage = async () => {
    playClick(soundEnabled)
    setBusy('image')
    try {
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        throw new Error('Clipboard image unsupported')
      }
      const blob = await exportProfileCardAsPng(profile, stats, {
        themeId,
        avatarDataUrl,
        shareUrl,
      })
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      flashFor('image')
      onNotify('Изображение визитки скопировано в буфер!')
    } catch {
      onNotify('Браузер не поддерживает копирование картинки')
    } finally {
      setBusy(null)
    }
  }

  const handleNativeShare = async () => {
    playClick(soundEnabled)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${profile.displayName} · Огонёк`,
          text: shareText,
          url: shareUrl,
        })
        flashFor('share')
      } catch {
        // Пользователь отменил — не считаем это ошибкой
      }
      return
    }
    handleCopyLink()
  }

  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <ModalShell title="Поделиться профилем" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="modal-intro flex items-center gap-2">
          <Sparkles size={15} className="text-orange-500 flex-none" />
          Сгенерируй красивую визитку силы и поделись ей одной ссылкой.
        </p>

        {/* Preview */}
        <div className="prof-share-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`Визитка профиля ${profile.displayName}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>

        {/* Theme picker */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[#71767b] uppercase tracking-wide flex-none">
            Стиль
          </span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Стиль визитки">
            {PROFILE_CARD_THEMES.map((theme) => {
              const active = theme.id === themeId
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    playClick(soundEnabled)
                    setThemeId(theme.id)
                  }}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors"
                  style={{
                    borderColor: active ? theme.accent : 'var(--line)',
                    color: active ? theme.accent : 'var(--text)',
                    background: active ? `${theme.accent}1f` : 'transparent',
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-none"
                    style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` }}
                    aria-hidden="true"
                  />
                  {theme.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle,#16181c)] px-3 py-2">
            <div className="text-[18px] font-black text-[var(--text)]">
              {stats.streakDays}+
            </div>
            <div className="text-[11px] text-[var(--muted)]">дней стрика</div>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle,#16181c)] px-3 py-2">
            <div className="text-[18px] font-black text-[var(--text)]">
              ★ {stats.avgAiScore.toFixed(1)}
            </div>
            <div className="text-[11px] text-[var(--muted)]">балл ИИ</div>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle,#16181c)] px-3 py-2">
            <div className="text-[18px] font-black text-[var(--text)]">
              {stats.totalPrides.toLocaleString('ru-RU')}
            </div>
            <div className="text-[11px] text-[var(--muted)]">гордостей</div>
          </div>
        </div>

        {/* Link row */}
        <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle,#0e1013)] px-3 py-2">
          <LinkIcon size={15} className="text-[#1d9bf0] flex-none" />
          <span className="flex-1 min-w-0 truncate text-[13px] text-[var(--muted)]">{shareUrl}</span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-none rounded-full px-3 py-1 text-[13px] font-bold text-[#1d9bf0] hover:bg-[var(--bg-hover)] transition-colors"
          >
            {flash === 'link' ? 'Скопировано ✓' : 'Копировать'}
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="x-primary-btn w-full col-span-2"
            onClick={handleNativeShare}
            disabled={busy !== null}
          >
            <Share2 size={17} />
            {canShare ? 'Поделиться визиткой' : 'Скопировать ссылку'}
          </button>

          <button type="button" className="secondary-btn w-full" onClick={handleCopyText}>
            {flash === 'text' ? <Check size={16} /> : <Copy size={16} />}
            Текст
          </button>

          <button
            type="button"
            className="secondary-btn w-full"
            onClick={handleDownloadPng}
            disabled={busy === 'png'}
          >
            {busy === 'png' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            PNG
          </button>

          <button type="button" className="secondary-btn w-full" onClick={handleDownloadSvg}>
            <FileCode size={16} />
            SVG
          </button>

          <button
            type="button"
            className="secondary-btn w-full"
            onClick={handleCopyImage}
            disabled={busy === 'image'}
          >
            {busy === 'image' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : flash === 'image' ? (
              <Check size={16} />
            ) : (
              <ImageDown size={16} />
            )}
            Картинка
          </button>
        </div>

        <div className="text-[11px] text-center text-[#71767b]">
          Векторная графика высокого разрешения (Retina 2x) · @{profile.username}
        </div>
      </div>
    </ModalShell>
  )
}

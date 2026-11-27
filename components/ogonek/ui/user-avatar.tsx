'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { getInitials } from '@/lib/ogonek/initials'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { VerifiedBadge } from './verified-badge'

export type UserAvatarProps = {
  /** Primary image URL / IndexedDB ref / data URL / blob */
  avatarUrl?: string | null
  /** Deprecated alias kept for seamless callers migration */
  avatarImage?: string | null
  /** Shorthand image prop matching <Avatar src=... /> */
  src?: string | null
  /** Solid color or gradient for fallback circle when image is absent */
  avatarColor?: string | null
  displayName?: string | null
  name?: string | null
  username?: string | null
  initials?: string | null
  alt?: string
  size?: number
  hasStory?: boolean
  storySeen?: boolean
  /** Thin accent/blue border ring around avatar */
  ring?: boolean
  ringColor?: string
  isOnline?: boolean
  /** Shows unified blue VerifiedBadge on avatar corner */
  showVerified?: boolean
  verified?: boolean
  /** Border toggle around the circle itself */
  bordered?: boolean
  /** Fill parent box dimensions (100% width & height) instead of fixed inline px */
  fillContainer?: boolean
  /** Optional custom overlay content when image is replaced (e.g. Lock for anonymous) */
  fallbackContent?: ReactNode
  className?: string
  onClick?: () => void
}

const DEFAULT_AVATAR_COLOR = '#FF5C00'

/**
 * Единый компонент аватара пользователя Priday.
 * Всегда приоритетно показывает реальное фото (avatarUrl / avatarImage / src),
 * при ошибке или отсутствии фото рендерит монограмму с avatarColor из public.profiles.
 */
export function UserAvatar({
  avatarUrl,
  avatarImage,
  src,
  avatarColor,
  displayName,
  name,
  username,
  initials,
  alt,
  size = 40,
  hasStory = false,
  storySeen = false,
  ring = false,
  ringColor,
  isOnline = false,
  showVerified = false,
  verified = false,
  bordered = true,
  fillContainer = false,
  fallbackContent,
  className = '',
  onClick,
}: UserAvatarProps) {
  const rawImage = avatarUrl || avatarImage || src || null
  const resolvedPhotoUrl = usePhotoUrl(rawImage)
  const effectiveSrc =
    resolvedPhotoUrl ||
    (rawImage &&
    (rawImage.startsWith('http://') ||
      rawImage.startsWith('https://') ||
      rawImage.startsWith('data:') ||
      rawImage.startsWith('blob:') ||
      rawImage.startsWith('/'))
      ? rawImage
      : null)

  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setImgFailed(false)
  }, [effectiveSrc])

  const label = displayName || name || (username ? `@${username}` : 'Пользователь')
  const computedInitials = initials || getInitials(displayName || name || '', username || '')
  const bg = avatarColor || DEFAULT_AVATAR_COLOR
  const innerSize = hasStory ? Math.max(16, size - 6) : size
  const fontSize = Math.max(10, Math.round(innerSize * 0.38))

  const outerRingClass = hasStory
    ? storySeen
      ? 'p-[2px] bg-[#3a3f45]'
      : 'p-[2.5px] bg-gradient-to-tr from-[#FF5C00] via-[#FF7A18] to-[#f91880]'
    : ring
    ? 'p-[2px] bg-[#1d9bf0]'
    : ''

  const showImg = Boolean(effectiveSrc && !imgFailed && !fallbackContent)
  const badgeSizePx = Math.max(13, Math.round(size * 0.34))

  const outerStyle = fillContainer ? { width: '100%', height: '100%' } : { width: size, height: size }
  const resolvedInnerPx = ring && !hasStory ? Math.max(16, size - 4) : innerSize
  const innerStyle = fillContainer
    ? {
        width: '100%',
        height: '100%',
        background: showImg ? 'var(--surface2, #202327)' : bg,
        fontSize,
      }
    : {
        width: resolvedInnerPx,
        height: resolvedInnerPx,
        background: showImg ? 'var(--surface2, #202327)' : bg,
        fontSize,
      }

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full select-none ${outerRingClass} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      style={outerStyle}
      onClick={onClick}
      aria-hidden={alt ? undefined : 'true'}
    >
      <span
        className={`relative flex items-center justify-center overflow-hidden rounded-full font-bold text-white ${
          bordered ? 'border border-[var(--line)]' : ''
        }`}
        style={innerStyle}
      >
        {fallbackContent ? (
          fallbackContent
        ) : showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={effectiveSrc!}
            alt={alt ?? label}
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span>{computedInitials}</span>
        )}
      </span>

      {showVerified && verified && (
        <span className="absolute -bottom-0.5 -right-0.5 z-10 inline-flex">
          <VerifiedBadge px={badgeSizePx} bordered />
        </span>
      )}

      {isOnline && (
        <span
          className="absolute bottom-0 right-0 z-10 rounded-full bg-[#00ba7c]"
          style={{
            width: Math.max(10, Math.round(size * 0.25)),
            height: Math.max(10, Math.round(size * 0.25)),
            border: `2px solid ${ringColor || 'var(--bg, #09090B)'}`,
          }}
          title="В сети"
        />
      )}
    </span>
  )
}

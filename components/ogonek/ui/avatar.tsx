'use client'

export type AvatarProps = {
  src?: string | null
  initials?: string
  alt?: string
  size?: number
  hasStory?: boolean
  storySeen?: boolean
  isOnline?: boolean
  avatarColor?: string
  className?: string
  onClick?: () => void
}

export function Avatar({
  src,
  initials = '?',
  alt = '',
  size = 40,
  hasStory = false,
  storySeen = false,
  isOnline = false,
  avatarColor,
  className = '',
  onClick,
}: AvatarProps) {
  const innerSize = hasStory ? size - 6 : size

  const ringClass = hasStory
    ? storySeen
      ? 'p-[2px] bg-white/20'
      : 'p-[2.5px] bg-gradient-to-tr from-[#FF5C00] via-[#FF7A18] to-[#f91880]'
    : ''

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${ringClass} ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-full font-bold select-none border border-[var(--line)] bg-[var(--surface2)] text-[var(--text)]"
        style={{
          width: innerSize,
          height: innerSize,
          background: avatarColor || undefined,
          fontSize: Math.round(innerSize * 0.4),
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {isOnline && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-[#09090B] bg-[#00ba7c]"
          style={{ width: Math.max(10, size * 0.28), height: Math.max(10, size * 0.28) }}
          title="В сети"
        />
      )}
    </div>
  )
}

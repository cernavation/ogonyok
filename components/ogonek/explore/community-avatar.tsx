'use client'

import { Check } from 'lucide-react'
import type { CommunityUser } from '@/lib/ogonek/explore-content'

type Props = {
  user: Pick<CommunityUser, 'initials' | 'avatarColor' | 'verified'> & { avatarUrl?: string }
  size?: number
  /** Тонкое кольцо «вы читаете этого человека» */
  ring?: boolean
  showVerified?: boolean
}

/**
 * Аватар участника сообщества: фото или градиент-заглушка с инициалами,
 * синий значок верификации и (опционально) кольцо подписки.
 */
export function CommunityAvatar({ user, size = 42, ring = false, showVerified = true }: Props) {
  const badge = Math.max(13, Math.round(size * 0.34))
  return (
    <span
      className={`xh-avatar ${ring ? 'is-ring' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          className="w-full h-full object-cover rounded-full"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="xh-avatar__img"
          style={{ background: user.avatarColor || 'var(--accent)', fontSize: Math.max(13, Math.round(size * 0.4)) }}
        >
          {user.initials}
        </span>
      )}
      {showVerified && user.verified && (
        <span
          className="xh-avatar__verified"
          style={{ width: badge, height: badge }}
        >
          <Check size={Math.round(badge * 0.66)} strokeWidth={3.5} />
        </span>
      )}
    </span>
  )
}

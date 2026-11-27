'use client'

import type { CommunityUser } from '@/lib/ogonek/explore-content'
import { UserAvatar } from '../ui'

type Props = {
  user: Pick<CommunityUser, 'initials' | 'avatarColor' | 'verified'> & {
    avatarUrl?: string | null
    name?: string
    username?: string
  }
  size?: number
  /** Тонкое кольцо «вы читаете этого человека» */
  ring?: boolean
  showVerified?: boolean
}

/**
 * Аватар участника сообщества на базе единого <UserAvatar /> и синей галочки <VerifiedBadge />.
 */
export function CommunityAvatar({ user, size = 42, ring = false, showVerified = true }: Props) {
  return (
    <UserAvatar
      avatarUrl={user.avatarUrl}
      avatarColor={user.avatarColor}
      name={user.name}
      username={user.username}
      initials={user.initials}
      size={size}
      ring={ring}
      showVerified={showVerified}
      verified={user.verified}
    />
  )
}

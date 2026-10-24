'use client'

import { accountInitials } from '@/lib/ogonek/accounts'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import type { AuthAccount } from '@/lib/ogonek/types'

type Props = {
  account: AuthAccount
  /** Диаметр аватара в пикселях */
  size?: number
  /** Показать акцентное кольцо «активный аккаунт» */
  active?: boolean
  className?: string
}

/**
 * Аватар аккаунта: фото из IndexedDB (если есть) либо инициалы на градиенте.
 * Используется в переключателе аккаунтов, панели настроек и экране входа.
 */
export function AccountAvatar({ account, size = 40, active = false, className = '' }: Props) {
  const url = usePhotoUrl(account.snapshot.avatarImage)

  return (
    <span
      className={`account-avatar ${active ? 'is-active' : ''} ${className}`.trim()}
      style={{
        width: size,
        height: size,
        minWidth: size,
        fontSize: Math.max(13, Math.round(size * 0.4)),
        background: account.snapshot.avatarColor,
      }}
      aria-hidden="true"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        <span>{accountInitials(account)}</span>
      )}
    </span>
  )
}

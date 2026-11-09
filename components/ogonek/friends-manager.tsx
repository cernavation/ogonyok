'use client'

import React from 'react'
import { ComradesView } from './views/comrades-view'

interface Props {
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

/**
 * МЕНЕДЖЕР СОРАТНИКОВ (ЭТАП 6)
 * Полная замена устаревшего FriendsManager:
 * - Серверный поиск соратников по всей базе
 * - Управление заявками (входящие / исходящие)
 * - Подписки и блокировки
 * - Пустое состояние со ссылкой и QR-кодом
 */
export function FriendsManager({ onNotify, soundEnabled = true }: Props) {
  return (
    <div className="w-full">
      <ComradesView
        onNavigate={() => {}}
        onNotify={onNotify}
        soundEnabled={soundEnabled}
      />
    </div>
  )
}

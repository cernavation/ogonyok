'use client'

import { ModalShell } from '../modal-shell'
import { AuthForm, type AuthMode } from './auth-form'

type Props = {
  onClose: () => void
  onNotify: (message: string) => void
  initialMode?: AuthMode
  onAuthenticated?: (accountId: string) => void
}

/**
 * ЭТАП 18 — МОДАЛЬНОЕ ОКНО ВХОДА/РЕГИСТРАЦИИ.
 * Открывается из меню аккаунта, настроек и панели профиля, чтобы добавить
 * новую личность или войти под другой почтой, не покидая интерфейс.
 */
export function AuthModal({ onClose, onNotify, initialMode = 'signin', onAuthenticated }: Props) {
  return (
    <ModalShell title="Аккаунты Огонька" onClose={onClose}>
      <AuthForm
        variant="modal"
        initialMode={initialMode}
        onNotify={onNotify}
        onAuthenticated={(accountId) => {
          onAuthenticated?.(accountId)
          onClose()
        }}
      />
    </ModalShell>
  )
}

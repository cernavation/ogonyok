'use client'

import { Keyboard } from 'lucide-react'
import { ModalShell } from './modal-shell'

type Props = {
  onClose: () => void
}

const SHORTCUTS = [
  {
    category: 'Навигация',
    items: [
      { key: 'J', description: 'Перейти к следующей карточке дня' },
      { key: 'K', description: 'Перейти к предыдущей карточке дня' },
      { key: '/', description: 'Быстрый переход к поиску и тегам' },
    ],
  },
  {
    category: 'Действия',
    items: [
      { key: 'C', description: 'Открыть форму «Записать день» (Composer)' },
      { key: 'Esc', description: 'Закрыть любое всплывающее окно или фото' },
      { key: '?', description: 'Открыть эту шпаргалку по горячим клавишам' },
    ],
  },
] as const

export function HotkeysModal({ onClose }: Props) {
  return (
    <ModalShell title="Горячие клавиши" onClose={onClose}>
      <div className="hotkeys-container">
        <p className="modal-intro" style={{ marginBottom: 16 }}>
          Быстрая навигация в стиле X.com для работы без мыши.
        </p>

        {SHORTCUTS.map((section) => (
          <div key={section.category} className="hotkeys-section" style={{ marginBottom: 20 }}>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--orange-light)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 10,
              }}
            >
              {section.category}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {section.items.map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: '#0d0f11',
                    border: '1px solid var(--line)',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>
                    {item.description}
                  </span>
                  <kbd
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 28,
                      height: 26,
                      padding: '0 7px',
                      background: 'var(--surface2)',
                      border: '1px solid #3c4043',
                      borderRadius: 6,
                      color: 'var(--text)',
                      fontSize: 12,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      boxShadow: '0 2px 0 #111',
                    }}
                  >
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}

        <footer style={{ marginTop: 20, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Keyboard size={14} /> Нажмите <kbd style={{ padding: '1px 5px', borderRadius: 4, background: '#1c1e22', border: '1px solid #333' }}>Esc</kbd> чтобы закрыть
          </span>
        </footer>
      </div>
    </ModalShell>
  )
}

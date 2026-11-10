'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Регистрация Service Worker после полной загрузки страницы для максимального TTI
      const handleLoad = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            // Проверка обновлений при каждом открытии страницы
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[SW] Обнаружена новая версия приложения. Активируем...')
                    newWorker.postMessage({ type: 'SKIP_WAITING' })
                  }
                })
              }
            })
          })
          .catch(() => {
            // Игнорируем ошибки в dev-режиме или при неподдерживаемых контекстах
          })

        // При смене контроллера (активации нового SW) гарантируем доставку свежих ресурсов
        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true
            console.log('[SW] Новый Service Worker активирован.')
          }
        })
      }

      if (document.readyState === 'complete') {
        handleLoad()
      } else {
        window.addEventListener('load', handleLoad)
        return () => window.removeEventListener('load', handleLoad)
      }
    }
  }, [])

  return null
}

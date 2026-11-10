// Service Worker for «Огонёк» PWA
const CACHE_NAME = 'ogonek-pwa-v3'
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
]

// 1. Установка: предзагрузка базовой оболочки и немедленная готовность
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// 2. Активация: удаление старых версий кэша и захват управления всеми вкладками
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

// 3. Обработка сообщений от страницы (принудительное обновление)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// 4. Перехват сетевых запросов
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // ПРАВИЛО 1: НИКОГДА не кэшировать API, авторизованные запросы и методы кроме GET
  const hasAuthHeader =
    request.headers.has('Authorization') ||
    request.headers.has('apikey') ||
    request.headers.has('x-user-id')

  const isApiOrAuth =
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/storage/v1/') ||
    hasAuthHeader ||
    request.method !== 'GET'

  if (isApiOrAuth) {
    return // Пропускаем напрямую в сеть без кэширования
  }

  // ПРАВИЛО 2: Навигационные запросы страниц (HTML) — Network-first с fallback на кэш
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          const rootCached = await caches.match('/')
          return rootCached || Response.error()
        })
    )
    return
  }

  // ПРАВИЛО 3: Статические неизменяемые ассеты (_next/static, шрифты, иконки) — Stale-While-Revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            }
            return networkResponse
          })
          .catch(() => cachedResponse)

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // ПРАВИЛО 4: По умолчанию — сеть с fallback на кэш
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})

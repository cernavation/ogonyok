// Service Worker for «Winlog» PWA (v3 — Zero API Cache Policy)
const CACHE_NAME = 'ogonek-pwa-v3'
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

/**
 * Проверка: является ли запрос API или динамическим бэкенд-эндпоинтом.
 * Service Worker НИКОГДА не кэширует такие запросы (Strict No-Cache Policy).
 */
function isApiOrBackendRequest(url, request) {
  if (request.method !== 'GET') return true
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return true

  const pathname = url.pathname
  const hostname = url.hostname

  if (pathname.startsWith('/api/')) return true
  if (pathname.startsWith('/rest/v1/')) return true
  if (pathname.startsWith('/auth/v1/')) return true
  if (pathname.startsWith('/storage/v1/')) return true
  if (pathname.startsWith('/realtime/v1/')) return true

  if (hostname.includes('supabase.co')) return true
  if (hostname.includes('metered.ca')) return true
  if (hostname.includes('googleapis.com')) return true

  return false
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. СТРОГИЙ ЗАПРЕТ КЭШИРОВАНИЯ API, SUPABASE, WEBRTC И МУТАЦИЙ
  if (isApiOrBackendRequest(url, request)) {
    return
  }

  // 2. Navigation requests: Network-first с кэш-фолбэком для офлайна
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
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

  // 3. Static assets (_next/static, icons, fonts, styles): Stale-While-Revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2')
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

  // По умолчанию: прямой сетевой запрос с кэш-фолбэком
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})

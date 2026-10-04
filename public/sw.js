const CACHE_NAME = 'muze-tasks-v1'
const STATIC_ASSETS = [
  '/',
  '/login',
  '/dashboard',
  '/tasks',
  '/calendar',
  '/projects',
  '/settings',
  '/manifest.json',
]

const CACHE_STRATEGIES = {
  // Static assets - cache first
  static: 'cache-first',
  // API responses - network first with fallback
  api: 'network-first',
  // Images - stale while revalidate
  images: 'stale-while-revalidate',
}

async function installSW() {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(STATIC_ASSETS)
  console.log('[SW] Installed and cached static assets')
}

async function activateSW() {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames
      .filter(name => name !== CACHE_NAME)
      .map(name => caches.delete(name))
  )
  console.log('[SW] Activated, old caches cleaned')
  return self.clients.claim()
}

async function fetchWithStrategy(request) {
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return fetch(request)
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return fetch(request)
  }

  const isStaticAsset = STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.startsWith(asset))
  const isApiRequest = url.pathname.startsWith('/api/')
  const isImageRequest = request.destination === 'image' || /\.(png|jpg|jpeg|svg|webp|gif|ico)$/.test(url.pathname)

  // Cache-first for static assets
  if (isStaticAsset) {
    const cached = await caches.match(request)
    if (cached) return cached
    try {
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME)
        cache.put(request, response.clone())
      }
      return response
    } catch {
      return new Response('Offline', { status: 503 })
    }
  }

  // Network-first for API requests
  if (isApiRequest) {
    try {
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME)
        cache.put(request, response.clone())
      }
      return response
    } catch {
      const cached = await caches.match(request)
      if (cached) return cached
      return new Response(JSON.stringify({ error: 'Offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  // Stale-while-revalidate for images
  if (isImageRequest) {
    const cached = await caches.match(request)
    const fetchPromise = fetch(request).then(response => {
      if (response.ok) {
        const cache = caches.open(CACHE_NAME)
        cache.then(c => c.put(request, response.clone()))
      }
      return response
    }).catch(() => cached)
    
    return cached || fetchPromise
  }

  // Default: network first with cache fallback
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response('Offline', { status: 503 })
  }
}

self.addEventListener('install', event => {
  event.waitUntil(installSW())
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(activateSW())
})

self.addEventListener('fetch', event => {
  event.respondWith(fetchWithStrategy(event.request))
})

// Background sync for offline task creation
self.addEventListener('sync', event => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks())
  }
})

async function syncTasks() {
  // This would sync offline-created tasks when online
  console.log('[SW] Syncing tasks...')
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_COMPLETE' })
  })
}

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: true,
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clientList => {
        for (const client of clientList) {
          if (client.url === event.notification.data && 'focus' in client) {
            return client.focus()
          }
        }
        return self.clients.openWindow(event.notification.data)
      })
    )
  }
})

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'sync-calendar') {
    event.waitUntil(syncCalendar())
  }
})

async function syncCalendar() {
  console.log('[SW] Syncing calendar...')
  // Would sync Google Calendar events in background
}
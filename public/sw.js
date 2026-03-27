// ============================================================
// SERVICE WORKER — Big Man Fast Food
// Cache statique + stratégie network-first pour l'API
// ============================================================

const CACHE_NAME = 'bigman-v1'

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
]

// Installation : mise en cache des assets statiques
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch : network-first, fallback cache
self.addEventListener('fetch', (e) => {
  // Ignorer les requêtes non GET et les API Supabase
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('supabase.co')) return
  if (e.request.url.includes('fonts.googleapis')) return

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Mettre en cache les nouvelles ressources statiques
        if (response.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        }
        return response
      })
      .catch(() => caches.match(e.request))
  )
})

// Offline support: the app shell and every asset it references are cached on install;
// later requests are served from cache and refreshed in the background.
const CACHE = 'pt-anatomy-v1'
const SHELL = ['./', 'models/body.glb', 'manifest.webmanifest', 'icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      const html = await (await fetch('./', { cache: 'reload' })).text()
      const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1])
      await cache.addAll([...SHELL, ...assets])
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return
  if (request.mode === 'navigate') {
    // Network first so a new deploy shows up on the next open; the cached shell covers offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('./', copy))
          return response
        })
        .catch(() => caches.match('./', { ignoreVary: true })),
    )
    return
  }
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreVary: true })
      const refresh = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone())
        return response
      })
      if (!cached) return refresh
      event.waitUntil(refresh.catch(() => {}))
      return cached
    }),
  )
})

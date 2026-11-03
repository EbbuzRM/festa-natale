const CACHE = 'festa-natale-v4'

// Il service worker può essere pubblicato in una sottocartella (GitHub Pages):
// tutti i percorsi si ricavano dal suo scope, non dalla radice del dominio.
const SCOPE = self.registration.scope
const url = (path) => new URL(path, SCOPE).toString()

const SHELL = [
  url('./'),
  url('index.html'),
  url('manifest.webmanifest'),
  url('favicon.svg'),
  url('fonts/archivo-latin.woff2'),
  url('fonts/spectral-500-latin.woff2'),
  url('fonts/spectral-600-latin.woff2'),
]

const INDEX = url('index.html')

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const target = new URL(request.url)

  // navigazioni: rete prima, cache come rete di sicurezza (funziona offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(INDEX, copy))
          return response
        })
        .catch(() => caches.match(INDEX).then((cached) => cached ?? Response.error())),
    )
    return
  }

  // asset (compresi i font): cache prima, poi rete, e metto in cache quello che passa
  if (target.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
      }),
    )
  }
})

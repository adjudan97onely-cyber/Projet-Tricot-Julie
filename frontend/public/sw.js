const CACHE_NAME = 'julie-creations-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/images/icon.png',
  '/assets/images/favicon.png',
  '/assets/images/splash-image.png',
];

// Installation : mise en cache des ressources statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation : suppression des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch : stratégie Network-first avec fallback cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Ne pas intercepter les requêtes API (backend Railway)
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback vers la page principale pour la navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Hors ligne', { status: 503 });
        });
      })
  );
});

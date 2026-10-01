const CACHE_NAME = 'ruta-segura-v13';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. Instalar: cachear archivos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Archivos cacheados');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('⚠️ Error cacheando:', err))
  );
  self.skipWaiting();
});

// 2. Activar: limpiar cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Borrando caché vieja:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch: STALE-WHILE-REVALIDATE
// Sirve del caché inmediatamente, pero busca versión fresca en paralelo
self.addEventListener('fetch', event => {
  // Para archivos locales (HTML, JS, CSS, imágenes): stale-while-revalidate
  if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // Si la respuesta es válida, actualizar caché para la próxima
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
          // Devolver caché inmediatamente, actualizar en segundo plano
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Para peticiones externas (Supabase, Leaflet, FormSubmit): network-first
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Si es un recurso que vale cachear (imágenes, CDN), guardarlo
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

// 4. Mensaje para forzar update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
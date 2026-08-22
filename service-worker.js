const CACHE_NAME = 'ruta-segura-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icono_ruta_segura_192.png',
  './icono_ruta_segura_512.png'
];

// Instalar el Service Worker y cachear archivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Archivos cacheados');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('⚠️ Algunos archivos no se cachearon:', err))
  );
  // Forzar activación inmediata
  self.skipWaiting();
});

// Activar el Service Worker
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
  // Tomar control inmediato de todas las pestañas
  self.clients.claim();
});

// Interceptar peticiones y servir desde caché si no hay internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, lo sirve. Si no, lo busca en internet
        return response || fetch(event.request);
      })
      .catch(() => {
        // Si falla todo, mostrar página offline
        return caches.match('./index.html');
      })
  );
});
// Escuchar mensaje para forzar actualización
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
const CACHE = 'ruta-segura-v4';

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch (err) {
    console.log('Push sin datos válidos');
  }

  const title = data.title || '🚨 Ruta Segura';
  const body = data.body || 'Nueva notificación';
  const icon = data.icon || './icon-192.png';

  e.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      badge: icon,
      tag: data.tag || 'general',
      vibrate: [500, 200, 500],
      data: { url: data.data?.url || '/ruta-segura/' }
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  
  // URL a la que debe abrir al tocar la notificación
  const url = e.notification.data?.url || '/ruta-segura/';
  
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Si ya hay una ventana abierta de Ruta Segura, la enfoca
      for (const client of clientList) {
        if (client.url.includes('ruta-segura') && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abre Ruta Segura directamente
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

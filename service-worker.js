// Ruta Segura SW v3.1 - caché PWA + push propio + alarma completa al tocar
const CACHE = 'ruta-segura-v3';
const SUPA_URL = 'https://vqezdcdalprvjdtdrqzx.supabase.co';
const SUPA_ANON = 'sb_publishable_5RI8bz70kqj7H2TIX6H8uQ_LlZnQtKO';

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  if (e.request.url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fresco = fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        });
        return cached || fresco;
      })
    );
  }
});

self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let lat = null, lon = null;
    try {
      const r = await fetch(SUPA_URL + '/rest/v1/sos_ruta?select=id,lat,lon&order=id.desc&limit=1', {
        headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON }
      });
      const d = await r.json();
      if (d && d[0] && d[0].lat != null) { lat = d[0].lat; lon = d[0].lon; }
    } catch (err) {}
    const url = (lat != null)
      ? ('/ruta-segura/?sos=1&lat=' + lat + '&lon=' + lon)
      : '/ruta-segura/?sos=1';
    await self.registration.showNotification('\ud83d\udea8 Ruta Segura', {
      body: 'SOS de tu contacto. Toc\u00e1 para la alarma completa.',
      data: { url: url, lat: lat, lon: lon },
      tag: 'sos-ruta',
      requireInteraction: true
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  const url = data.url || '/ruta-segura/?sos=1';
  e.waitUntil((async () => {
    const clientes = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientes) {
      if ('focus' in c) {
        await c.focus();
        c.postMessage({ tipo: 'sos-push', lat: data.lat, lon: data.lon });
        return;
      }
    }
    await clients.openWindow(url);
  })());
});
// Escuchar mensajes de la app principal
self.addEventListener('message', function(event) {
  if (event.data && event.data.tipo === 'sos-push') {
    const data = event.data;
    
    // Mostrar notificación nativa del sistema
    self.registration.showNotification('🚨 EMERGENCIA Ruta Segura', {
      body: 'Tu contacto activó el SOS. Tocá para ver la ubicación.',
      icon: './icon-192.png', // O el ícono que uses
      badge: './icon-192.png',
      tag: 'sos-emergencia',
      requireInteraction: true,
      data: { lat: data.lat, lon: data.lon }
    });
  }
});

// Cuando el usuario toca la notificación
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Abrir la app y enviar el mensaje para que dispare la alarma
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          client.postMessage({
            tipo: 'sos-push',
            lat: event.notification.data.lat,
            lon: event.notification.data.lon
          });
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

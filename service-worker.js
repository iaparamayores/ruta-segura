// Ruta Segura SW v3 - caché PWA + push propio VAPID (sin OneSignal)
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

// PUSH propio: notificación aunque el celu esté apagado / bloqueado
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let cuerpo = '\u00a1Emergencia! Toc\u00e1 para ver la ubicaci\u00f3n.';
    let url = '/ruta-segura/';
    try {
      const r = await fetch(SUPA_URL + '/rest/v1/sos_ruta?select=id,lat,lon&order=id.desc&limit=1', {
        headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON }
      });
      const d = await r.json();
      if (d && d[0] && d[0].lat != null) {
        url = 'https://maps.google.com/?q=' + d[0].lat + ',' + d[0].lon;
        cuerpo = 'SOS de tu contacto. Toc\u00e1 para ver el mapa.';
      }
    } catch (err) {}
    await self.registration.showNotification('\ud83d\udea8 Ruta Segura', {
      body: cuerpo,
      data: { url: url },
      tag: 'sos-ruta'
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/ruta-segura/';
  e.waitUntil(clients.openWindow(url));
});

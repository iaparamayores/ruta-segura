// Ruta Segura SW v3.6 - URL absoluta fija + scope corregido
const CACHE = 'ruta-segura-v6';
const SUPA_URL = 'https://vqezdcdalprvjdtdrqzx.supabase.co';
const SUPA_ANON = 'sb_publishable_5RI8bz70kqj7H2TIX6H8uQ_LlZnQtKO';
const APP_URL = 'https://iaparamayores.github.io/ruta-segura/';

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
    let payload = {};
    try {
      payload = e.data ? e.data.json() : {};
    } catch (err) {
      console.error('Error parsing push payload', err);
    }

    const title = payload.title || '🚨 Ruta Segura';
    const body = payload.body || 'Tocá para ver más detalles.';
    const icon = payload.icon || './icon-192.png';
    const badge = payload.badge || './icon-192.png';
    const tag = payload.tag || 'ruta-segura-general';
    const requireInteraction = payload.requireInteraction !== false;
    
    let vibrate = [500, 200, 500];
    if (payload.data && payload.data.tipo === 'sos') {
      vibrate = [1000, 500, 1000, 500, 1000];
    } else if (payload.data && payload.data.tipo === 'alerta_nocturna') {
      vibrate = [2000, 500, 2000, 500, 2000];
    }

    let url = APP_URL;
    
    if (payload.data && payload.data.tipo === 'sos') {
       let lat = payload.data.lat;
       let lon = payload.data.lon;
       if (!lat || !lon) {
           try {
              const r = await fetch(SUPA_URL + '/rest/v1/sos_ruta?select=id,lat,lon&order=id.desc&limit=1', {
                headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON }
              });
              const d = await r.json();
              if (d && d[0] && d[0].lat != null) { lat = d[0].lat; lon = d[0].lon; }
           } catch(err) {}
       }
       url = (lat != null) ? (APP_URL + '?sos=1&lat=' + lat + '&lon=' + lon) : (APP_URL + '?sos=1');
    }

    await self.registration.showNotification(title, {
      body: body,
      icon: icon,
      badge: badge,
      tag: tag,
      requireInteraction: requireInteraction,
      vibrate: vibrate,
      data: { 
        url: url, 
        lat: payload.data ? payload.data.lat : null, 
        lon: payload.data ? payload.data.lon : null,
        tipo: payload.data ? payload.data.tipo : 'general'
      }
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  
  // Usamos la URL absoluta fija que sabemos que funciona
  const url = data.url || APP_URL;
  
  e.waitUntil((async () => {
    const clientes = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    
    // Buscar si ya hay una ventana de Ruta Segura abierta
    for (const c of clientes) {
      if (c.url.includes('ruta-segura') && 'focus' in c) {
        await c.focus();
        if (data.tipo === 'sos' || data.tipo === 'sos-push') {
            c.postMessage({ tipo: 'sos-push', lat: data.lat, lon: data.lon });
        }
        return;
      }
    }
    
    // Si no, abrir la URL absoluta directamente
    if (clients.openWindow) {
      await clients.openWindow(url);
    }
  })());
});

self.addEventListener('message', (e) => {
  const data = e.data;
  if (data && data.tipo === 'test-notification') {
    self.registration.showNotification(data.titulo || '🧪 Prueba', {
      body: data.cuerpo || 'Notificación de prueba local',
      icon: data.icon || './icon-192.png',
      badge: data.badge || './icon-192.png',
      tag: data.tag || 'test-local',
      requireInteraction: true,
      vibrate: [500, 200, 500]
    });
  }
});

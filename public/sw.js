// Zendapp Web Service Worker (PWA Offline & Installable)
const CACHE_NAME = 'zendapp-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/logo_round.png',
  '/assets/fondoGeneral.png',
  '/assets/fondoApp.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => console.log('SW cache error:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Omitir esquemas no soportados (extensiones, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Omitir llamadas a Supabase y APIs dinámicas
  if (
    url.origin.includes('supabase.co') ||
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/')
  ) {
    return;
  }

  // Omitir archivos internos de Vite en desarrollo
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.search.includes('?t=') ||
    url.search.includes('?import')
  ) {
    return;
  }

  // Navegación de páginas (HTML / rutas de React Router)
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              if (event.request.url.startsWith('http')) {
                cache.put(event.request, clone).catch(() => {});
              }
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cached) return cached;
          return new Response(
            '<!doctype html><html><head><meta charset="utf-8"><title>Zendapp Offline</title></head><body style="text-align:center;padding:40px;font-family:sans-serif;"><h2>Sin conexión</h2><p>Verifica tu conexión a internet para continuar.</p></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Recursos estáticos (imágenes, fuentes, estilos)
  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            if (event.request.url.startsWith('http')) {
              cache.put(event.request, clone).catch(() => {});
            }
          });
        }
        return response;
      } catch {
        return new Response('', { status: 404, statusText: 'Not Found' });
      }
    })
  );
});

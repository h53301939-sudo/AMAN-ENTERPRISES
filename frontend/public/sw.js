/**
 * Pepsi Distribution PWA Service Worker
 * Version: 1.0.1
 */

const CACHE_NAME = 'pepsi-pwa-v1.0.2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-192x192.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png'
];

// 1. Install Event: Cache Core Shell Assets and Activate Immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Core assets pre-caching non-fatal warning:', err);
      });
    })
  );
  // Activate immediately without waiting
  self.skipWaiting();
});

// 2. Activate Event: Clean Old Caches and Take Control Immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Strict Zero-Stale-Data Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests and http/https schemes (ignore chrome-extension etc.)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 🚫 RULE 1: STRICT NETWORK-ONLY for all API requests, Auth, and WebSockets
  // NEVER cache sensitive sales, inventory, authentication or database API responses
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io') || url.pathname.includes('/auth/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ 
            message: 'You are currently offline. Please check your internet connection.',
            offline: true 
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // 🌐 RULE 2: STRICT NETWORK-FIRST (NO-CACHE) for HTML Navigation / SPA Routes
  // Ensures new frontend deployments and chunk updates are received immediately without manual refresh
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback to cached SPA shell
          const cachedIndex = await caches.match('/') || await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          return new Response('Offline: Please reconnect to internet', {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // ⚡ RULE 3: STALE-WHILE-REVALIDATE for Static Assets (Images, Hashed JS/CSS, Fonts)
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2|woff|ttf|ico)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => null);

        // Return cached version if present, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// 4. Message Event: Skip Waiting Trigger for in-app updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

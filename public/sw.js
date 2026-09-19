// Smart Ledger Service Worker for Offline Resilience & Periodic Sync
const CACHE_NAME = 'smart-ledger-v2.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignore chrome-extension://, chrome://
  if (event.request.url.startsWith("chrome-extension://") || event.request.url.startsWith("chrome://")) return;

  // 2. Only cache GET requests
  if (event.request.method !== 'GET') return;

  // 3. Never cache external auth, fonts, or APIs
  if (
    url.hostname === 'apis.google.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('google.com')
  ) {
    return;
  }

  // Stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache successful GET responses
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try {
              cache.put(event.request, responseClone);
            } catch (error) {
              console.warn("Cache skipped", error);
            }
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'smart-ledger-backup-check') {
    console.log('[ServiceWorker] Periodic background sync triggered for 24h backup check');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CHECK_AUTOMATIC_BACKUP' });
        });
      })
    );
  }
});

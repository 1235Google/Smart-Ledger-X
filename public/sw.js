// Smart Ledger Service Worker - Hardened Offline Resilience
const CACHE_NAME = 'smart-ledger-v3.0';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/site.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
];

// Install: precache essential static assets safely without failing on single 404s
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('[SW] Precache skipped for asset:', asset, err?.message || err);
          })
        )
      );
    }).catch((err) => {
      console.warn('[SW] Cache open failed on install:', err);
    })
  );
});

// Activate: clean up old and broken caches to prevent stale or corrupted cache entries
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', key);
            return caches.delete(key).catch((err) => {
              console.warn('[SW] Failed to delete old cache:', key, err);
            });
          }
        })
      );
    }).catch((err) => {
      console.warn('[SW] Activate cache cleanup failed:', err);
    }).then(() => self.clients.claim())
  );
});

// Fetch: bulletproof caching with strict validation and safe catch-alls
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 1. Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Validate URL and scheme
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Only handle standard http and https protocols (ignore chrome-extension://, chrome://, data:, blob:)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // 3. Only cache same-origin resources; never intercept external APIs, auth, or CDNs
  if (url.origin !== self.location.origin) {
    return;
  }

  // 4. Exclude API endpoints, dev server routes, WebSockets, and range (partial) requests
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.includes('hot-update') ||
    request.headers.has('range')
  ) {
    return;
  }

  // 5. Strategy: Network-First for HTML navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Verify response is 200 OK, non-opaque, and same-origin before caching
          if (
            networkResponse &&
            networkResponse.ok &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            try {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone).catch((putErr) => {
                  console.warn('[SW] Navigation cache.put ignored:', putErr?.message || putErr);
                });
              }).catch((openErr) => {
                console.warn('[SW] Cache open failed during navigation put:', openErr);
              });
            } catch (cloneErr) {
              console.warn('[SW] Navigation response clone failed:', cloneErr);
            }
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback for navigation: return cached index.html or root
          return caches.match(request)
            .then((cached) => cached || caches.match('/index.html') || caches.match('/'))
            .catch(() => {
              return new Response('Offline: Please check your internet connection.', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' },
              });
            });
        })
    );
    return;
  }

  // 6. Strategy: Stale-While-Revalidate with network fallback for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          // Strictly cache ONLY successful (200 OK), non-opaque ('basic') responses
          if (
            networkResponse &&
            networkResponse.ok &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic' &&
            !networkResponse.headers.get('content-range')
          ) {
            try {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone).catch((putErr) => {
                    console.warn('[SW] Asset cache.put ignored:', putErr?.message || putErr);
                  });
                })
                .catch((openErr) => {
                  console.warn('[SW] Cache open failed during asset put:', openErr);
                });
            } catch (cloneErr) {
              console.warn('[SW] Asset response clone failed:', cloneErr);
            }
          }
          return networkResponse;
        })
        .catch((fetchErr) => {
          // If network fetch fails, return cached response if present
          if (cachedResponse) {
            return cachedResponse;
          }
          throw fetchErr;
        });

      // Return cached asset immediately if available, otherwise wait for network fetch
      return cachedResponse || networkFetch;
    }).catch(() => {
      // Fallback: If cache lookup and fetch both fail, attempt direct fetch
      return fetch(request).catch(() => {
        return new Response('Asset not available offline', {
          status: 404,
          statusText: 'Not Found',
        });
      });
    })
  );
});

// Periodic background sync event
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'smart-ledger-backup-check') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          try {
            client.postMessage({ type: 'CHECK_AUTOMATIC_BACKUP' });
          } catch {
            // Ignore messaging errors
          }
        });
      }).catch(() => {})
    );
  }
});

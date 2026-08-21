// Smart Ledger Service Worker for Offline Resilience & Periodic Sync
const CACHE_NAME = 'smart-ledger-v2.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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

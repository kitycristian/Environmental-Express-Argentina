const CACHE_NAME = 'eea-v8';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request.clone()).catch(() => {
        if (['POST', 'PATCH'].includes(event.request.method) &&
            url.pathname.includes('/inspections')) {
          return event.request.json().then(body => {
            saveToSyncQueue({ url: url.pathname, method: event.request.method, body });
            return new Response(JSON.stringify({ queued: true, offline: true }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        }
        return new Response(JSON.stringify({ error: 'Sin conexión' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Network-first for all app assets — never serve stale JS/CSS
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-inspections') {
    event.waitUntil(syncPendingInspections());
  }
});

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('eea-sync', 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('queue', { autoIncrement: true });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function saveToSyncQueue(item) {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').add({ ...item, timestamp: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

async function syncPendingInspections() {
  const db = await openSyncDB();
  const tx = db.transaction('queue', 'readwrite');
  const store = tx.objectStore('queue');
  const items = await new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });

  for (const item of items) {
    try {
      await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      });
    } catch (e) {
      return;
    }
  }

  const clearTx = db.transaction('queue', 'readwrite');
  clearTx.objectStore('queue').clear();
}

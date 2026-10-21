// Flat Management System - Progressive Web App Service Worker
const CACHE_NAME = 'flat-app-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/manifest.json',
  '/icons/icon.svg',
  '/js/api.js',
  '/js/offline-store.js',
  '/js/notifications.js',
  '/js/app.js',
  '/js/views/dashboard.js',
  '/js/views/rooms.js',
  '/js/views/members.js',
  '/js/views/bills.js',
  '/js/views/food.js',
  '/js/views/payments.js',
  '/js/views/reports.js',
  '/js/views/portal.js',
  '/js/views/admins.js',
  '/js/views/settings.js',
  '/js/views/audit.js'
];

// Install Event - Pre-cache essential app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline app shell');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up older caches
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

// Fetch Event - Stale-while-revalidate for static files, Network-first for APIs
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests for cache
  if (request.method !== 'GET') return;

  // For API endpoints, use network first, fallback to cached clone if offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200 && !url.pathname.includes('/auth/')) {
            const responseClone = response.clone();
            caches.open('flat-api-cache').then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify({ offline: true, error: 'Network unavailable. Showing offline mode.' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // For static assets, serve from cache first, then update cache in background
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Push Notifications Listener (Phone Lock Screen & Notification Tray)
self.addEventListener('push', (event) => {
  let payload = { title: 'Flat Management Notice', body: 'New update in flat system' };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'Flat Management Notice', body: event.data.text() };
    }
  }

  const options = {
    body: payload.body,
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    vibrate: [200, 100, 200],
    data: payload.url || '/'
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data || '/');
    })
  );
});

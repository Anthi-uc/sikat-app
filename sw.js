// sw.js — Service Worker SIKAT
// Strategy: Cache-First for static assets, fallback to network

const CACHE_NAME = 'sikat-v2.3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './css/views.css',
  './css/laporan.css',
  './js/app.js',
  './js/router.js',
  './js/auth.js',
  './js/storage.js',
  './js/categories.js',
  './js/transaction-form.js',
  './js/calculator.js',
  './js/validator.js',
  './js/charts.js',
  './js/views/home.js',
  './js/views/transaksi.js',
  './js/views/rekap.js',
  './js/views/labarugi.js',
  './js/views/produksi.js',
  './js/views/profil.js',
  './js/views/login.js',
  './js/views/register.js',
  './js/views/panduan.js',
  './js/views/kebijakan.js',
  './js/views/kontak.js',
  './js/views/versi.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
];

// ── Install: cache all static assets ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache assets individually so one failure doesn't block the rest
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn(`[SW] Could not cache: ${url}`, err)
          )
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-First with network fallback ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Skip non-GET and browser-extension requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Not in cache — try network, then cache the response
      return fetch(event.request)
        .then((response) => {
          // Only cache valid responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          return response;
        })
        .catch(() => {
          // Network failed and not in cache — return offline fallback for navigation
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

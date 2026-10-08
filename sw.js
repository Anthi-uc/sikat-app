// sw.js — Service Worker SIKAT
// Strategy: Cache-First for local assets, Stale-While-Revalidate for CDN

const CACHE_NAME = 'sikat-v2.7';
const CDN_CACHE_NAME = 'sikat-cdn-v2.7';

// Local assets — cache-first strategy
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './css/views.css',
  './css/laporan.css',
  './js/app.js',
  './js/profil-usaha.js',
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
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-32.png',
  './assets/icons/icon-16.png',
];

// CDN resources — will be cached on first successful fetch
const CDN_RESOURCES = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
];

// ── Install: cache all local static assets ────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching local assets...');
        // Cache local assets one by one, log any failures
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url)
              .then(() => console.log(+'[SW] ✓ Cached: '))
              .catch(err => console.error(+'[SW] ✗ Failed to cache: ', err))
          )
        );
      })
      .then(() => {
        console.log('[SW] Local assets cached, now pre-caching CDN resources...');
        return caches.open(CDN_CACHE_NAME);
      })
      .then((cdnCache) => {
        // Try to pre-cache CDN resources (best-effort, won't block install)
        return Promise.allSettled(
          CDN_RESOURCES.map(url =>
            fetch(url, { mode: 'cors' })
              .then(response => {
                if (response.ok) {
                  console.log(+'[SW] ✓ Pre-cached CDN: ');
                  return cdnCache.put(url, response);
                }
                throw new Error(+'HTTP ');
              })
              .catch(err => console.warn(+'[SW] ⚠ CDN pre-cache failed (will retry on first use): ', err))
          )
        );
      })
      .then(() => {
        console.log('[SW] Install complete, activating...');
        return self.skipWaiting();
      })
  );
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker:', CACHE_NAME);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== CDN_CACHE_NAME)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete, claiming clients');
        return self.clients.claim();
      })
  );
});

// ── Fetch: Strategy dispatcher ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET and browser-extension requests
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);
  
  // CDN resources: Stale-While-Revalidate (cache-first, update in background)
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(handleCDNRequest(request));
    return;
  }

  // Local resources: Cache-First with network fallback
  event.respondWith(handleLocalRequest(request));
});

// ── Handle CDN requests: Stale-While-Revalidate ───────────────────────────────
async function handleCDNRequest(request) {
  const cache = await caches.open(CDN_CACHE_NAME);
  const cached = await cache.match(request);

  // Return cached version immediately if available
  if (cached) {
    console.log('[SW] Serving CDN from cache:', request.url);
    
    // Update cache in background (don't await)
    fetch(request, { mode: 'cors' })
      .then(response => {
        if (response.ok) {
          console.log('[SW] Updated CDN cache:', request.url);
          cache.put(request, response.clone());
        }
      })
      .catch(() => {
        // Ignore background update failures
      });
    
    return cached;
  }

  // Not in cache — fetch from network
  try {
    console.log('[SW] Fetching CDN from network:', request.url);
    const response = await fetch(request, { mode: 'cors' });
    
    if (response.ok) {
      console.log('[SW] Caching new CDN response:', request.url);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] CDN fetch failed (offline?):', request.url, error);
    
    // Return a minimal fallback response to prevent app crash
    if (request.url.includes('chart.js')) {
      return new Response('window.Chart = window.Chart || {};', {
        headers: { 'Content-Type': 'application/javascript' }
      });
    }
    if (request.url.includes('xlsx')) {
      return new Response('window.XLSX = window.XLSX || {};', {
        headers: { 'Content-Type': 'application/javascript' }
      });
    }
    
    return new Response('/* CDN resource unavailable */', {
      status: 503,
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
}

// ── Handle local requests: Cache-First with network fallback ──────────────────
async function handleLocalRequest(request) {
  const cached = await caches.match(request);
  
  if (cached) {
    console.log('[SW] Serving from cache:', request.url);
    return cached;
  }

  // Not in cache — try network
  try {
    console.log('[SW] Fetching from network:', request.url);
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      console.log('[SW] Caching new response:', request.url);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Network fetch failed:', request.url, error);
    
    // Offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) {
        console.log('[SW] Serving offline fallback: index.html');
        return fallback;
      }
    }
    
    return new Response('Aplikasi offline dan resource tidak tersedia di cache', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

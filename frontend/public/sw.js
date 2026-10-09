// Service Worker: lets the app open and show the last saved schedule without a connection.

const VERSION = 'v4';
const APP_CACHE = `schedule-app-${VERSION}`;
const API_CACHE = `schedule-api-${VERSION}`;

// Backend routes that can be read offline (GET only)
const API_ROUTES = ['/schedules', '/teachers', '/classrooms', '/groups', '/subjects', '/availability', '/conflicts', '/statistics', '/diagnostics'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(['/', '/index.html']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== APP_CACHE && n !== API_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return; // writes always go straight to the network

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    event.respondWith(request.mode === 'navigate' ? pageNetworkFirst(request) : staticAsset(request));
  } else if (API_ROUTES.some((route) => url.pathname === route || url.pathname.startsWith(route + '/'))) {
    event.respondWith(apiNetworkFirst(request));
  }
});

// Pages: network first (to get new versions) and, if it fails, the saved copy
async function pageNetworkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(APP_CACHE);
    cache.put('/index.html', response.clone());
    return response;
  } catch {
    return (await caches.match('/index.html')) || (await caches.match('/')) || offlineResponse();
  }
}

// App files (JS, CSS, images): served from the cache and refreshed in the background
async function staticAsset(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  const fromNetwork = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await fromNetwork) || offlineResponse();
}

// Backend data: network first; offline, the last saved response flagged with X-From-Cache
async function apiNetworkFirst(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (!cached) return offlineResponse();
    const headers = new Headers(cached.headers);
    headers.set('X-From-Cache', '1');
    return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
  }
}

function offlineResponse() {
  return new Response(JSON.stringify({ detail: 'Sin conexión y sin datos guardados todavía' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

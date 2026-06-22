/**
 * sw.js — Service Worker para GestionProyectos PWA
 * Estrategia:
 *   - Cache-First para assets estáticos (HTML, CSS, JS, iconos)
 *   - Network-First para llamadas a la API (/auth, /projects, /time, /dashboard)
 */

const CACHE_NAME   = 'gestionproyectos-v8';
const API_PATTERNS = ['/auth/', '/projects/', '/time/', '/dashboard/metrics', '/clients/', '/export', '/archivo'];

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/nuevo',
  '/clientes',
  '/calendario',
  '/reportes',
  '/archivo',
  '/static/css/styles.css',
  '/static/js/api.js',
  '/static/js/auth.js',
  '/static/js/dashboard.js',
  '/static/js/tracker.js',
  '/static/js/proyecto_form.js',
  '/static/js/clientes.js',
  '/static/js/calendario.js',
  '/static/js/reportes.js',
  '/static/js/archivo.js',
  '/manifest.json',
];

// ── Install: pre-cachear assets estáticos ────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: limpiar caches viejos ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: interceptar requests ───────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo interceptar mismo origen
  if (url.origin !== self.location.origin) return;

  // Estrategia Network-First para la API
  const isApi = API_PATTERNS.some(p => url.pathname.startsWith(p));
  if (isApi) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Estrategia Cache-First para assets estáticos
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sin conexión y sin cache → página offline básica
    return new Response('<h1 style="font-family:sans-serif;text-align:center;padding:40px;">Sin conexión. Conéctate para usar GestionProyectos.</h1>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    // Sin red → intentar desde cache
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'Sin conexión' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

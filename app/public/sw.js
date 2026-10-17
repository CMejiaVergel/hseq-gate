/*
 * Service worker de HSEQ Gate (PWA, copiado de Smart Plant 3D).  Objetivo: que la app abra sin conexión en el visor y en sala.
 *
 *   página (index.html)        red primero; sin red, la copia guardada → cada despliegue se ve al recargar
 *   /hseq/assets/*  (con hash)   caché primero: el nombre cambia en cada build, nunca queda viejo
 *   modelos de mandos y manos  (CDN jsdelivr) caché primero, para que también aparezcan sin red
 *
 * Al instalarse lee index.html y guarda todos los chunks que enlaza, así basta una visita con red.
 * Para invalidar todo, sube VERSION.
 */
const VERSION = 'hseqgate-v1'
const BASE = new URL('./', self.location).pathname            // '/hseq/'
const CORE = ['./', 'manifest.json', 'favicon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/logo-voltac.png', 'icons/logo-voltac-claro.png']

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION)
    await cache.addAll(CORE)
    /* chunks enlazados desde index.html (script, modulepreload, css) */
    const html = await (await cache.match('./')).text()
    const assets = [...new Set(html.match(/assets\/[^"' )]+/g) || [])]
    await Promise.all(assets.map((a) => cache.add(a).catch(() => null)))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k)
    await self.clients.claim()
  })())
})

async function cacheFirst(req) {
  const cache = await caches.open(VERSION)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok) cache.put(req, res.clone())
  return res
}

async function networkFirst(req) {
  const cache = await caches.open(VERSION)
  try {
    const res = await fetch(req)
    if (res.ok) cache.put('./', res.clone())
    return res
  } catch {
    return (await cache.match('./')) || Response.error()
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (req.mode === 'navigate' && url.pathname.startsWith(BASE)) { e.respondWith(networkFirst(req)); return }
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith(BASE + 'assets/') || url.pathname.startsWith(BASE + 'icons/')) e.respondWith(cacheFirst(req))
    return
  }
  if (url.hostname === 'cdn.jsdelivr.net') e.respondWith(cacheFirst(req))
})

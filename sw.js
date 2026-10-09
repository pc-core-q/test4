/**
 * Minimal service worker (storefront only).
 * - Same-origin files: network-first, falling back to cache (so deployments are picked up immediately, and the shell works offline).
 * - Fonts / Firebase SDK / product images (ImageKit, ImgBB): stale-while-revalidate.
 * - NEVER touched: /admin/, config/admin-config.js, Firestore/Auth API calls, anything else cross-origin.
 * Bump VERSION to force clients to drop old caches.
 */
const VERSION = 'v1';
const CORE = `core-${VERSION}`, MEDIA = `media-${VERSION}`;
const SHELL = ['./', 'index.html', 'shop.html', 'product.html', 'cart.html', 'checkout.html', 'assets/css/main.css', 'assets/icons/favicon.svg', 'manifest.json'];
const MEDIA_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com', 'ik.imagekit.io', 'i.ibb.co'];
const MEDIA_MAX = 150;

self.addEventListener('install', e => e.waitUntil(caches.open(CORE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => ![CORE, MEDIA].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())));

async function networkFirst(req) {
  try { const res = await fetch(req); if (res.ok) (await caches.open(CORE)).put(req, res.clone()); return res; }
  catch { return (await caches.match(req, { ignoreSearch: true })) || caches.match('index.html'); }
}
async function staleWhileRevalidate(req) {
  const cache = await caches.open(MEDIA), hit = await cache.match(req);
  const net = fetch(req).then(async res => {
    if (res.ok || res.type === 'opaque') { await cache.put(req, res.clone()); trim(cache); }
    return res;
  }).catch(() => hit);
  return hit || net;
}
async function trim(cache) { const ks = await cache.keys(); if (ks.length > MEDIA_MAX) await Promise.all(ks.slice(0, ks.length - MEDIA_MAX).map(k => cache.delete(k))); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.includes('/admin/') || url.pathname.endsWith('/config/admin-config.js')) return; // always live
    e.respondWith(networkFirst(req));
  } else if (MEDIA_HOSTS.includes(url.hostname)) {
    e.respondWith(staleWhileRevalidate(req));
  }
});

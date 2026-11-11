// WhyFeed service worker: offline app shell. No user data ever leaves the device.
const V = 'whyfeed-pwa-v1';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(['./', './manifest.webmanifest', './icons/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((res) => { const cp = res.clone(); caches.open(V).then((c) => c.put('./', cp)); return res; }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(r).then((hit) => {
    const net = fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});

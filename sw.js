// cache the app shell (not API responses)
const CACHE = 'workorders-v1';
const ASSETS = ['./','./index.html','./style.css','./app.js','./manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // network-first for API requests (those with ?action=)
  if (u.searchParams.has('action')) {
    e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));
  } else {
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
  }
});

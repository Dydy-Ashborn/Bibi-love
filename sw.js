/* Bibi Love — service worker : coque hors-ligne.
 * Stratégie : cache-first sur la coque, réseau pour Firestore (jamais mis en cache). */
const CACHE = 'bibi-love-v1';
const SHELL = [
  './', './index.html', './css/style.css',
  './js/app.js', './js/host.js', './js/player.js', './js/store.js',
  './js/game.js', './js/util.js', './js/firebase.js', './js/config.js',
  './js/data/questions.js', './manifest.webmanifest', './icons/icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // On ne touche qu'aux GET de notre propre origine : le SDK Firebase, les polices
  // et toute requête tierce passent directement au réseau, sans interception.
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});

/* Bibi Love — service worker.
 *
 * Stratégie : RÉSEAU D'ABORD pour le code de l'app (HTML/CSS/JS), cache en secours.
 * C'est un renversement volontaire par rapport à la v1, qui était en cache-first :
 * un navigateur ayant ouvert l'app une seule fois gardait éternellement l'ancien CSS,
 * et aucun correctif déployé ne l'atteignait jamais. Le bug s'est manifesté par un
 * chrono de finale visible pendant toutes les manches alors que le code était corrigé.
 *
 * Les polices et images, elles, restent en cache-first : leur nom ne change pas mais
 * leur contenu non plus.
 */
const VERSION = 'v16';
const CACHE   = 'bibi-love-' + VERSION;

const SHELL = [
  './', './index.html', './css/style.css',
  './js/app.js', './js/host.js', './js/player.js', './js/store.js',
  './js/game.js', './js/util.js', './js/firebase.js', './js/config.js',
  './js/plan.js', './js/live.js',
  './js/data/questions.js', './js/data/verdicts.js', './js/data/idees.js',
  './manifest.webmanifest', './icons/icon.svg',
  './vendor/fontawesome/fa.css', './vendor/fontawesome/fa-solid-subset.woff2'
];

const IMMUABLE = /\.(woff2|woff|ttf|png|svg|jpg|jpeg|webp)$/i;

self.addEventListener('install', e => {
  // addAll échoue en bloc si un seul fichier manque : on met en cache un par un.
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // On ne touche qu'aux GET de notre propre origine : le SDK Firebase et les requêtes
  // tierces passent directement au réseau, sans interception (sinon le navigateur
  // reçoit index.html à la place d'un module et refuse de l'exécuter).
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // Polices et images : cache d'abord, elles ne changent pas de contenu.
  if (IMMUABLE.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetchAndCache(e.request)));
    return;
  }

  // Code de l'app : réseau d'abord, cache en secours si hors-ligne.
  e.respondWith(
    fetchAndCache(e.request).catch(() =>
      caches.match(e.request).then(hit =>
        hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});

function fetchAndCache(request) {
  return fetch(request).then(res => {
    if (res && res.ok) {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(request, clone));
    }
    return res;
  });
}

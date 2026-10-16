// Lets the app open without internet. Always tries the network first so
// updates arrive straight away; if that fails or takes over 3 seconds, it uses
// the copy saved on the phone. From Substitutor.

const CACHE = 'propoker-v5';
const FILES = [
  './',
  './index.html',
  './style.css',
  './js/app.js',
  './js/blinds.js',
  './js/clock.js',
  './js/tables.js',
  './js/chips.js',
  './js/share.js',
  './js/money.js',
  './js/tournament.js',
  './js/summary.js',
  './js/storage.js',
  './js/alerts.js',
  './js/i18n.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './fonts/inter.woff2',
  './fonts/barlow-condensed-700.woff2',
  './screenshots/tour/phone-clock-light.webp',
  './screenshots/tour/phone-tables.webp',
  './screenshots/tour/phone-players.webp',
  './screenshots/tour/phone-count.webp',
  './screenshots/tour/phone-settle.webp',
  './screenshots/tour/phone-chips.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  e.respondWith(fromNetworkOrCache(request));
});

async function fromNetworkOrCache(request) {
  const cache = await caches.open(CACHE);
  // GitHub Pages lets browsers keep files for 10 minutes; 'no-cache' makes the
  // browser check for a newer copy, so a new page never gets an old app.js.
  const network = fetch(request.mode === 'navigate' ? request : new Request(request, { cache: 'no-cache' })).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  try {
    const response = await Promise.race([network, timeout]);
    if (response) return response;
  } catch {
    // Offline: fall through to the saved copy.
  }
  const saved = await cache.match(request, { ignoreSearch: true })
    ?? (request.mode === 'navigate' ? await cache.match('./index.html') : undefined);
  return saved ?? network;
}

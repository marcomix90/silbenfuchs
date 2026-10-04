/* Service Worker: App-Shell offline verfuegbar halten. */
const CACHE = 'silbenfuchs-v3';
const DATEIEN = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/silben.js',
  'js/speech.js',
  'js/stimme.js',
  'js/sound.js',
  'js/effekte.js',
  'fonts/andika-400.woff2',
  'fonts/andika-700.woff2',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(treffer => {
      const netz = fetch(e.request).then(r => {
        if (r.ok) {
          const kopie = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, kopie));
        }
        return r;
      });
      if (treffer) {
        netz.catch(() => {}); // im Hintergrund auffrischen
        return treffer;
      }
      return netz.catch(() => caches.match('index.html'));
    })
  );
});

/* FamBoard – Service Worker
   Shell wird gecacht, damit die App auch ohne Netz startet.
   Die Daten selbst kommen von Firebase und werden dort nie gecacht. */
const CACHE = 'famboard-v9';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  // Firebase niemals anfassen – das regelt das SDK selbst
  if(/firebaseio|firebasedatabase|googleapis|identitytoolkit/.test(url.hostname)) return;

  // Seitenaufrufe: erst Netz, bei Fehler die gecachte Shell
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).catch(()=>caches.match('./index.html').then(r=>r || caches.match('./')))
    );
    return;
  }

  // Bibliotheken von fremden CDNs: aus dem Cache, sonst holen und ablegen
  if(url.origin !== self.location.origin){
    e.respondWith(
      caches.match(req).then(hit=>hit || fetch(req).then(res=>{
        if(res.ok || res.type === 'opaque'){
          const copy = res.clone();
          caches.open(CACHE).then(c=>c.put(req, copy));
        }
        return res;
      }).catch(()=>hit))
    );
    return;
  }

  // Eigene Dateien: Cache zuerst, im Hintergrund aktualisieren
  e.respondWith(
    caches.match(req).then(hit=>{
      const net = fetch(req).then(res=>{
        if(res.ok) caches.open(CACHE).then(c=>c.put(req, res.clone()));
        return res;
      }).catch(()=>hit);
      return hit || net;
    })
  );
});

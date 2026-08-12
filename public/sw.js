/* Butley – Service Worker
   Shell wird gecacht, damit die App auch ohne Netz startet.
   Die Daten selbst kommen von Firebase und werden dort nie gecacht. */
const CACHE = 'butley-v26';
const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/figur.js',
  './js/texte.js',
  './js/push.js',
  './manifest.webmanifest',
  './fonts/literata-600.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon-32.png',
  './icons/favicon.ico'
];

/* Jede Datei einzeln ablegen statt addAll: addAll bricht komplett ab, sobald
   eine einzige Datei fehlt - dann haette die App gar keinen Offline-Betrieb mehr,
   ohne dass es jemand merkt. So faellt nur die fehlende Datei aus. */
self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.all(SHELL.map(pfad=>c.add(pfad).catch(()=>null))))
      .then(()=>self.skipWaiting())
  );
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

  /* Eigene Dateien.

     Bis B6.2 galt hier fuer alles "Cache zuerst, im Hintergrund aktualisieren".
     Das ergibt beim Deploy genau den Mischzustand, vor dem die Betriebsregel
     zum einzelnen Commit warnt - nur aus einer anderen Richtung: `index.html`
     kommt ueber den navigate-Zweig darueber frisch aus dem Netz, `app.js` und
     `styles.css` aber aus dem Cache. Die App laeuft dann mit neuem Markup und
     alter Logik, und erst der zweite Start zieht nach. Nach B6.2 stand deshalb
     ein leeres Figurband auf Heute und keiner der Wege aus den Karten
     funktionierte - beides Code, den es im Cache noch nicht gab.

     Die drei Dateien, die sich bei jedem Release aendern, kommen jetzt zuerst
     aus dem Netz und fallen nur ohne Verbindung auf den Cache zurueck. Sie sind
     zusammen unter 300 kB; der Preis ist ein Bruchteil einer Sekunde beim
     Start, der Gewinn ist, dass "neu laden" wieder bedeutet, was es sagt.
     Schriften und Symbole bleiben Cache zuerst - die aendern sich fast nie. */
  const wechselhaft = /\/(app|figur|texte|push)\.js$|\/styles\.css$/.test(url.pathname);
  if(wechselhaft){
    e.respondWith(
      fetch(req).then(res=>{
        if(res.ok) caches.open(CACHE).then(c=>c.put(req, res.clone()));
        return res;
      }).catch(()=>caches.match(req))
    );
    return;
  }

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

/* ---------- Push (C2, Kapitel 3.7) ----------

   Zwei Ereignisse, mehr braucht es nicht: Eine Nachricht kommt an, und jemand
   tippt sie an.

   `userVisibleOnly: true` steht im Abo, und die Browser nehmen das wörtlich:
   Wer ein push-Ereignis empfängt und nichts anzeigt, bekommt vom Push-Dienst
   eine Verwarnung und nach mehreren Malen kein Abo mehr. Deshalb zeigt der
   catch-Zweig unten lieber eine allgemeine Meldung als gar keine — eine
   unschöne Benachrichtigung ist besser als ein stillgelegtes Abo. */

self.addEventListener('push', e=>{
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch(err){ d = {}; }
  const titel = d.titel || 'Butley';
  const optionen = {
    body: d.text || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-96.png',
    /* Gleiche Kennung ersetzt die vorige Meldung, statt eine zweite daneben zu
       legen. Ohne das stapeln sich bei einer Einkaufsliste, die dreimal
       nacheinander geändert wird, drei Meldungen mit demselben Inhalt. */
    tag: d.tag || 'butley',
    data: { bereich: d.bereich || 'heute' }
  };
  e.waitUntil(self.registration.showNotification(titel, optionen));
});

self.addEventListener('notificationclick', e=>{
  e.notification.close();
  const bereich = (e.notification.data && e.notification.data.bereich) || 'heute';
  const ziel = './#' + bereich;
  /* Ein offenes Fenster wird nach vorn geholt, statt ein zweites zu öffnen.
     Auf dem Homescreen-iPhone gibt es ohnehin nur eines; am Schreibtisch wäre
     ein zweiter Tab derselben App der schnellste Weg zu zwei Zuständen, die
     sich gegenseitig überschreiben. */
  e.waitUntil((async ()=>{
    const fenster = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    for(const f of fenster){
      if(f.url.indexOf(self.registration.scope) === 0 && 'focus' in f){
        try { await f.navigate(ziel); } catch(err){ /* navigate ist nicht überall erlaubt */ }
        return f.focus();
      }
    }
    if(self.clients.openWindow) return self.clients.openWindow(ziel);
  })());
});


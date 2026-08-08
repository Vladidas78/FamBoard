/* Prüfstand: Butley lokal rendern und jeden Bereich abfotografieren.
   Aufruf:  node pruefstand/schiessen.mjs <ausgabeordner> [--breit]
   Firebase wird durch die Ersatzmodule daneben ersetzt, Daten kommen aus
   firebase-database.js. Kein Netz, keine echte Datenbank. */

import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';

const WURZEL = new URL('..', import.meta.url).pathname;
const PUBLIC = join(WURZEL, 'public');
const STUB = join(WURZEL, 'pruefstand');
const AUS = process.argv[2] || join(WURZEL, 'bilder');
const BREIT = process.argv.includes('--breit');
mkdirSync(AUS, { recursive: true });

const TYPEN = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json',
  '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2' };

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const datei = join(PUBLIC, p);
  if (!existsSync(datei)) { res.writeHead(404); res.end('weg'); return; }
  res.writeHead(200, { 'Content-Type': TYPEN[extname(datei)] || 'application/octet-stream' });
  res.end(readFileSync(datei));
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

/* Was fotografiert wird. `vor` läuft im Seitenkontext, bevor geschossen wird. */
/* `unter` sind die echten Panel-IDs aus index.html, nicht die sichtbaren Namen.
   Erster Anlauf stand hier auf „woche/rezepte/naehrwerte" — zeigeUnter fand
   dann kein Panel, schaltete alle ab und der Bereich war leer. Genau der
   Fehler, den die Seitenleiste beim ersten Bauen auch hatte. */
const BILDER = [
  { name:'heute',        bereich:'heute' },
  { name:'kalender',     bereich:'kalender' },
  { name:'essen-woche',  bereich:'essen',   unter:'plan' },
  { name:'essen-rezepte',bereich:'essen',   unter:'recipes' },
  { name:'essen-naehr',  bereich:'essen',   unter:'nutrition' },
  { name:'einkauf-liste',bereich:'einkauf', unter:'shop' },
  { name:'einkauf-art',  bereich:'einkauf', unter:'artikel' },
  { name:'notizen',      bereich:'notizen' },
  { name:'einstellungen',bereich:'settings' },
];

const fehler = [];

for (const modus of ['hell', 'dunkel']) {
  const ctx = await browser.newContext({
    viewport: BREIT ? { width: 1280, height: 1100 } : { width: 402, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: modus === 'dunkel' ? 'dark' : 'light',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  });

  const seite = await ctx.newPage();

  // Firebase-Module durch die Ersatzmodule ersetzen
  await seite.route('https://www.gstatic.com/firebasejs/**', route => {
    const url = route.request().url();
    const name = url.split('/').pop();
    const pfad = join(STUB, name);
    if (!existsSync(pfad)) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(pfad, 'utf8') });
  });
  // XLSX wird nur beim Import/Export gebraucht — leerer Platzhalter reicht
  await seite.route('https://cdnjs.cloudflare.com/**', route =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.XLSX={utils:{},write:()=>{},read:()=>{}};' }));

  seite.on('pageerror', e => fehler.push(`[${modus}] Seitenfehler: ${e.message}`));
  seite.on('console', m => { if (m.type() === 'error') fehler.push(`[${modus}] Konsole: ${m.text()}`); });

  await seite.addInitScript(() => {
    try { localStorage.setItem('famboard.haushalt', 'hh-pruefstand'); } catch (e) {}
    // Service Worker im Prüfstand aus dem Weg
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('aus'));
  });

  await seite.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await seite.waitForTimeout(700);

  const angemeldet = await seite.evaluate(() => !document.body.classList.contains('pre-auth'));
  if (!angemeldet) fehler.push(`[${modus}] Login-Gate ist nicht aufgegangen.`);

  /* Umgeschaltet wird über die echten Bedienelemente, nicht über Klassen von
     Hand: Sonst prüft der Prüfstand seine eigene Nachbildung statt der App. */
  for (const b of BILDER) {
    await seite.evaluate(({ bereich, unter }) => {
      const tab = document.querySelector(`nav .tab[data-tab="${bereich}"]`);
      if (tab) tab.click();
      else {
        // Einstellungen sind kein Bereich mehr (Kapitel 3.2) und haben keinen Reiter
        document.querySelectorAll('main > section').forEach(s => s.classList.remove('active'));
        const s = document.getElementById(bereich); if (s) s.classList.add('active');
      }
      if (unter) {
        const u = document.querySelector(`#${bereich} .unternav .unter[data-unter="${unter}"]`);
        if (u) u.click();
        else throw new Error(`Unterbereich ${bereich}/${unter} gibt es nicht`);
      }
      window.scrollTo(0, 0);
    }, b);
    await seite.waitForTimeout(350);
    /* Auf breiten Flächen ohne fullPage: Die Seitenleiste steht fest, und ein
       Vollseitenbild zeichnet feste Elemente nur auf Bildschirmhöhe — die
       Leiste bräche darunter ab und sähe nach einem Fehler aus, der keiner ist. */
    await seite.screenshot({
      path: join(AUS, `${b.name}-${modus}${BREIT ? '-breit' : ''}.png`),
      fullPage: !BREIT,
    });
  }

  await ctx.close();
}

await browser.close();
server.close();

if (fehler.length) {
  console.log('FEHLER WÄHREND DES RENDERNS:');
  [...new Set(fehler)].forEach(f => console.log('  ' + f));
} else {
  console.log('Ohne Fehler gerendert.');
}
console.log('Bilder in ' + AUS);

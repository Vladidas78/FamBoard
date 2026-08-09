/* Prüfstand: Butley lokal rendern und jeden Bereich abfotografieren.
   Aufruf:  node pruefstand/schiessen.mjs <ausgabeordner> [--breit]
   Firebase wird durch die Ersatzmodule daneben ersetzt, Daten kommen aus
   firebase-database.js. Kein Netz, keine echte Datenbank. */

import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { WURZEL, STUB, BROWSER, starteServer, pruefeAufbau } from './pfade.mjs';

pruefeAufbau();
const AUS = process.argv[2] || join(WURZEL, 'bilder');
const BREIT = process.argv.includes('--breit');
mkdirSync(AUS, { recursive: true });

const server = await starteServer();
const PORT = server.address().port;

const browser = await chromium.launch(BROWSER);
let bilder = 0;

/* Was fotografiert wird. `vor` läuft im Seitenkontext, bevor geschossen wird. */
/* `unter` sind die echten Panel-IDs aus index.html, nicht die sichtbaren Namen.
   Erster Anlauf stand hier auf „woche/rezepte/naehrwerte" — zeigeUnter fand
   dann kein Panel, schaltete alle ab und der Bereich war leer. Genau der
   Fehler, den die Seitenleiste beim ersten Bauen auch hatte. */
const BILDER = [
  { name:'heute',        bereich:'heute' },
  { name:'kalender',     bereich:'kalender' },
  /* Das Terminformular steht auf `hidden` und kam deshalb in keinem der
     bisherigen Bilder vor — genau dort lagen am 09.08. auf dem iPhone Datum
     und Ort übereinander. Ein Formular, das der Prüfstand nie öffnet, ist ein
     blinder Fleck; `vor` macht ihn sichtbar. */
  { name:'kalender-termin', bereich:'kalender',
    vor: () => document.getElementById('terminNeu').click() },
  { name:'essen-woche',  bereich:'essen',   unter:'plan' },
  /* Der Abschnitt „Mahlzeiten" ist eingeklappt und stand deshalb in keinem
     Bild. Dort sass bis v14 das zweite eckige Systemkaestchen der App.
     Merksatz: Der Prüfstand sieht nur, was von selbst offen ist. */
  { name:'essen-mahlzeiten', bereich:'essen', unter:'plan',
    vor: () => document.getElementById('mealHead').click() },
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

  /* Ein Vollseitenbild dehnt die Sichtfläche auf die ganze Seitenhöhe.
     `position:fixed` rechnet dann gegen diese gedehnte Fläche. Der Toast ist
     im Ruhezustand nicht ausgeblendet, sondern über
     `transform:translate(-50%,160%)` unter den unteren Rand geschoben — beim
     Dehnen rutscht er sichtbar ins Bild. In jedem der achtzehn Bilder stand
     deshalb eine „Rückgängig"-Pille, die kein Nutzer je zu sehen bekommt.
     Und weil darauf eine .22s-Überblendung läuft, unterschieden sich zwei
     Läufe desselben Codes im Bild: acht von neun dunklen Ansichten wichen
     voneinander ab. Ein Bildvergleich zwischen zwei Ständen war damit wertlos.
     Verborgen wird nur, was ohne `.show` ohnehin verborgen sein soll. */
  await seite.addStyleTag({ content: '.toast:not(.show){ display:none !important; }' });

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
      /* Nur Bereich und Unterbereich hinüberreichen. Das ganze Objekt geht
         nicht: `vor` ist eine Funktion, und Playwright kann sie nicht in den
         Seitenkontext serialisieren. */
    }, { bereich: b.bereich, unter: b.unter });
    if (b.vor) { await seite.evaluate(b.vor); await seite.waitForTimeout(200); }
    await seite.waitForTimeout(350);
    /* Auf breiten Flächen ohne fullPage: Die Seitenleiste steht fest, und ein
       Vollseitenbild zeichnet feste Elemente nur auf Bildschirmhöhe — die
       Leiste bräche darunter ab und sähe nach einem Fehler aus, der keiner ist. */
    await seite.screenshot({
      path: join(AUS, `${b.name}-${modus}${BREIT ? '-breit' : ''}.png`),
      fullPage: !BREIT,
    });
    bilder++;

    /* Zusätzlich ein Schirmbild vom Seitenende — nur schmal.
       Das Vollseitenbild taugt für den Inhalt, nicht für die Fußleiste: Sie
       ist `position:fixed` und landet gegen die gedehnte Sichtfläche mitten
       im Bild. Ob sie unten Inhalt verdeckt, ist dort nicht zu sehen, und
       genau das ist die Frage bei einer festen Leiste über einer Liste, die
       beliebig lang wird. Ans Ende gescrollt, weil oben nichts steht, was
       nicht auch das Vollseitenbild zeigt.
       Auf breiten Flächen entfällt es: Dort ist das Bild ohnehin schon
       schirmgroß, und die Navigation steht als Seitenleiste links. */
    if (!BREIT) {
      await seite.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await seite.waitForTimeout(250);
      await seite.screenshot({
        path: join(AUS, `${b.name}-${modus}-schirm.png`),
        fullPage: false,
      });
      bilder++;
    }
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
console.log(bilder + ' Bilder' + (BREIT ? '' : ', davon ' + (bilder / 2) + ' Schirmbilder vom Seitenende'));
console.log('Bilder in ' + AUS);

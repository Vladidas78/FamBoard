/* Prüfstand — gemeinsame Pfade, Browser-Optionen und Miniserver.

   Warum es diese Datei gibt: In klicktest.mjs und onboardingtest.mjs stand
   '/tmp/b6/public' fest im Code — der Sandbox-Pfad einer einzelnen Sitzung.
   In jeder anderen Umgebung lieferte der Miniserver dann 404, und Playwright
   meldete ERR_HTTP_RESPONSE_CODE_FAILURE. Das sieht aus wie eine kaputte App
   und ist ein Pfadfehler. Zwei von drei Prüfläufen waren damit still an einen
   Ort gebunden, den es nur einmal gab.

   Deshalb steht die Auflösung jetzt genau einmal hier, relativ zu dieser
   Datei. Der Prüfstand läuft von jedem Ort aus, aus dem der Repo-Ordner
   ausgecheckt ist. Dieselbe Regel wie im Frontend: Was nur einmal steht,
   kann nicht auseinanderlaufen. */

import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';

/* fileURLToPath statt new URL(..).pathname: Letzteres liefert unter Windows
   '/C:/Users/...' mit führendem Schrägstrich und ist dort unbrauchbar. */
export const STUB   = dirname(fileURLToPath(import.meta.url));
export const WURZEL = dirname(STUB);
export const PUBLIC = join(WURZEL, 'public');

/* Der mitgelieferte Chromium liegt in der Sandbox unter /opt/pw-browsers.
   Fehlt er, sucht Playwright seinen eigenen, statt mit
   "Executable doesn't exist" abzubrechen. */
const MITGELIEFERT = '/opt/pw-browsers/chromium';
export const BROWSER = existsSync(MITGELIEFERT)
  ? { executablePath: MITGELIEFERT }
  : {};

const TYPEN = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/* Miniserver über public/. Kein Netz, keine Zwischenspeicherung.
   Rückgabe ist der laufende Server — Port über .address().port.

   Fester Port statt 0: Der Kalender zeigt die ICS-Adresse als Text an, und
   die trägt den Port. Mit zufälligem Port unterschieden sich zwei Läufe
   desselben Codes im Bild — die einzigen zwei von achtzehn. Ein Bildvergleich
   zwischen zwei Ständen war damit für den Kalender wertlos, und genau dieser
   Vergleich hat in B6 zweimal einen Fehler gefunden. Ist der Port belegt,
   nimmt der Server einen freien; dann ist nur dieser eine Lauf nicht
   vergleichbar. */
export async function starteServer(port = 8788) {
  const s = createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const datei = join(PUBLIC, p);
    if (!existsSync(datei)) { r.writeHead(404); r.end('weg'); return; }
    r.writeHead(200, { 'Content-Type': TYPEN[extname(datei)] || 'application/octet-stream' });
    r.end(readFileSync(datei));
  });
  await new Promise((fertig) => {
    s.once('error', (e) => {
      if (e.code !== 'EADDRINUSE') throw e;
      console.warn(`Port ${port} belegt — nehme einen freien. Kalenderbilder sind in diesem Lauf nicht vergleichbar.`);
      s.listen(0, fertig);
    });
    s.listen(port, fertig);
  });
  return s;
}

/* Feste Uhrzeit für jeden Lauf.

   Ohne sie zeigen zwei Läufe desselben Codes verschiedene Bilder: Die
   Begrüßung auf Heute wechselt mit der Tageszeit ("Guten Morgen" wurde am
   09.08. um 10:56 zu "Guten Tag"), das Datum steht in der Kopfzeile, und
   "überfällig" hängt am heutigen Tag. Ein Bildvergleich zwischen zwei
   Ständen war damit über Nacht wertlos — dieselbe Art Beweglichkeit wie der
   zufällige Port und die verblassende Toast-Pille, nur langsamer und
   deshalb schwerer zu bemerken.

   Sonntag, 9. August 2026, 09:00 Uhr Berliner Zeit. Der Tag ist bewusst
   derselbe, an dem die Bilder zuletzt entstanden sind; so bleiben die
   vorhandenen Vergleichsbilder gültig. Die Testdaten im Ersatzmodul rechnen
   sich aus derselben Uhr, bleiben also stimmig.

   `setFixedTime`, nicht `install`: Letzteres friert auch die Zeitgeber ein,
   und die App braucht sie — der Toast blendet über `setTimeout` aus. Hier
   steht nur die Uhr still.

   Ein Nebeneffekt, den man kennen muss: Zeitspannen messen sich damit immer
   als null. Die Vier-Stunden-Frist des Ansichtszustands (IA-11) ist im
   Prüfstand also immer offen — dass sie nach vier Stunden schließt, kann er
   nicht zeigen. */
export const ZEITPUNKT = new Date('2026-08-09T09:00:00+02:00');

export async function haltDieUhrAn(kontext) {
  await kontext.clock.setFixedTime(ZEITPUNKT);
}

/* Früh und laut scheitern, statt den Browser auf ein leeres Verzeichnis zu
   schicken. Ohne diese Prüfung kommt der Fehler erst als Browsermeldung an
   und liest sich wie ein Anwendungsfehler. */
export function pruefeAufbau() {
  const fehlt = [
    join(PUBLIC, 'index.html'),
    join(STUB, 'firebase-database.js'),
  ].filter(d => !existsSync(d));
  if (fehlt.length) {
    console.error('Prüfstand findet den Repo-Ordner nicht:\n  ' + fehlt.join('\n  '));
    process.exit(1);
  }
}

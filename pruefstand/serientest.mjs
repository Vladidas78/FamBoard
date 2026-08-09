/* Prueft O-25: Wirkt "Nur dieser Termin" bzw. "Ganze Reihe" wirklich auf die
   Daten — und ueberlebt eine Reihe das blosse Oeffnen und Speichern?

   Warum es diesen Lauf gibt: klicktest und onboardingtest gehen Wege ab, das
   Schiessen macht Bilder. Keiner von beiden sieht in die Datenbank. O-25 ist
   aber genau eine Datenfrage — ob aus einem Klick eine herausgeloeste Ausgabe
   wird oder die ganze Reihe kippt, steht nicht im Bild. Bis v16 loeschte
   einmal Oeffnen und Speichern die Wiederholung ohne Meldung; dass das nicht
   wiederkommt, kann nur ein Lauf zeigen, der die geschriebenen Zweige liest. */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STUB, BROWSER, starteServer, pruefeAufbau, haltDieUhrAn } from './pfade.mjs';

pruefeAufbau();
const s = await starteServer();
const b = await chromium.launch(BROWSER);
const c = await b.newContext({ viewport: { width: 402, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
await haltDieUhrAn(c);
const p = await c.newPage();
await p.route('https://www.gstatic.com/firebasejs/**', ro => ro.fulfill({
  status: 200, contentType: 'text/javascript',
  body: readFileSync(join(STUB, ro.request().url().split('/').pop()), 'utf8')
}));
await p.route('https://cdnjs.cloudflare.com/**', ro => ro.fulfill({
  status: 200, contentType: 'text/javascript', body: 'window.XLSX={utils:{},write:()=>{},read:()=>{}};'
}));

const fehler = [];
p.on('pageerror', e => fehler.push('Seitenfehler: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) fehler.push('Konsole: ' + m.text()); });
await p.addInitScript(() => {
  try { localStorage.setItem('famboard.haushalt', 'hh-pruefstand'); } catch (e) {}
  if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('aus'));
});
await p.goto(`http://127.0.0.1:${s.address().port}/index.html`, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);

const sag = (was, ok, zusatz = '') => {
  console.log((ok ? 'ok   ' : 'FEHL ') + was + (zusatz ? ' — ' + zusatz : ''));
  if (!ok) fehler.push(was + (zusatz ? ' (' + zusatz + ')' : ''));
};
/* Liest die Termine so, wie sie in der Datenbank stehen — nicht aus dem Zustand
   im Speicher. Sonst prueft der Lauf, was die App sich merkt, statt dessen was
   sie schreibt, und eine vergessene Zweigschreibung faellt nicht auf. */
const ausDb = () => p.evaluate(() => {
  const P = globalThis.__pruefstand || {};
  const hh = (((P.BAUM || {}).haushalte || {})[P.HH] || {});
  return JSON.parse(JSON.stringify((((hh.data || {}).kalender || {}).gemeinsam) || {}));
});

const reihe = await (async () => {
  const alle = await ausDb();
  const id = Object.keys(alle).find(k => alle[k].rrule);
  return id ? Object.assign({ id }, alle[id]) : null;
})();
if (!reihe) {
  console.log('In den Testdaten steht keine Reihe — nichts zu pruefen.');
  await b.close(); s.close();
  process.exit(1);
}
console.log('Reihe:', reihe.id, reihe.titel, reihe.rrule, 'ab', reihe.datum);

/* Eine spaetere Ausgabe der Reihe ansteuern — bewusst nicht der Starttag: nur
   dort zeigt sich, ob die App die angeklickte Ausgabe kennt oder still den
   Serienbeginn nimmt.

   Tage aus `exdate` werden uebersprungen. Der erste Anlauf traf genau den Tag,
   den die Testdaten als Ausnahme fuehren — der Kalender war dort zu Recht leer,
   und der Lauf meldete einen Fehler, den es nicht gab. Ein Pruefstand, der sich
   seinen Testtag fest verdrahtet, misst irgendwann die Testdaten statt die App. */
const ausgabe = await p.evaluate(({ d, ex }) => {
  const t = new Date(d + 'T12:00:00');
  for (let woche = 0; woche < 8; woche++) {
    t.setDate(t.getDate() + 7);
    const iso = t.toISOString().slice(0, 10);
    if (!ex.includes(iso)) return iso;
  }
  return null;
}, { d: reihe.datum, ex: reihe.exdate || [] });
if (!ausgabe) {
  console.log('Keine freie Ausgabe in den naechsten acht Wochen — Testdaten pruefen.');
  await b.close(); s.close();
  process.exit(1);
}
console.log('Geprüfte Ausgabe:', ausgabe);

async function oeffneAusgabe(tag) {
  await p.click('nav .tab[data-tab="kalender"]');
  await p.waitForTimeout(200);
  await p.evaluate(t => {
    const knopf = document.querySelector(`.kal-tag[data-tag="${t}"]`);
    if (knopf) knopf.click();
  }, tag);
  await p.waitForTimeout(250);
  const da = await p.evaluate(id => {
    const li = document.querySelector(`.kal-zeile[data-id="${id}"]`);
    if (!li) return false;
    li.querySelector('.kal-zeile-btn').click();
    return true;
  }, reihe.id);
  await p.waitForTimeout(250);
  return da;
}

/* 1 — die Reihe erscheint an der spaeteren Ausgabe ueberhaupt */
const gefunden = await oeffneAusgabe(ausgabe);
sag('Reihe erscheint an der Ausgabe eine Woche spaeter', gefunden, ausgabe);

/* 2 — Vorgabe ist die enge, umkehrbare Wahl */
const vorgabe = await p.evaluate(() => {
  const an = document.querySelector('#terminUmfangRow .filter-pill.active');
  const feld = document.getElementById('terminUmfangFeld');
  return { wahl: an ? an.dataset.umfang : null, sichtbar: feld ? !feld.hidden : false,
           datum: document.getElementById('terminDatum').value };
});
sag('Umfangwahl erscheint beim Bearbeiten einer Reihe', vorgabe.sichtbar);
sag('Vorgabe ist "Nur dieser Termin"', vorgabe.wahl === 'einzeln', String(vorgabe.wahl));
sag('Datumsfeld zeigt die angeklickte Ausgabe, nicht den Serienbeginn',
    vorgabe.datum === ausgabe, vorgabe.datum + ' erwartet ' + ausgabe);

/* 3 — Der Rueckfall aus v16: oeffnen, speichern, nichts wollen.
       Danach muss die Reihe noch eine Reihe sein. */
await p.click('#terminSpeichern');
await p.waitForTimeout(600);
let db = await ausDb();
sag('Nach blossem Oeffnen und Speichern lebt die Wiederholung noch',
    !!(db[reihe.id] && db[reihe.id].rrule), 'rrule=' + (db[reihe.id] || {}).rrule);
sag('Der Tag steht jetzt im exdate der Reihe',
    ((db[reihe.id] || {}).exdate || []).includes(ausgabe));
const geloest = Object.keys(db).filter(k => db[k].recurrenceId === ausgabe);
sag('Genau eine herausgeloeste Ausgabe entstanden', geloest.length === 1, geloest.join(','));
if (geloest.length === 1) {
  const a = db[geloest[0]];
  sag('Sie traegt dieselbe uid wie die Reihe', a.uid === reihe.uid, a.uid + ' / ' + reihe.uid);
  sag('Sie traegt selbst keine Wiederholung', !a.rrule);
}
sag('Der Titel der Reihe blieb unangetastet',
    (db[reihe.id] || {}).titel === reihe.titel, (db[reihe.id] || {}).titel);

/* 4 — "Ganze Reihe": der Titel aendert sich, exdate und rrule ueberleben */
const exVorher = ((db[reihe.id] || {}).exdate || []).slice();
await oeffneAusgabe(ausgabe === reihe.datum ? ausgabe : reihe.datum);
await p.evaluate(() => {
  const pille = [...document.querySelectorAll('#terminUmfangRow .filter-pill')]
    .find(x => x.dataset.umfang === 'reihe');
  if (pille) pille.click();
});
await p.waitForTimeout(200);
await p.fill('#terminTitel', 'Reihe umbenannt');
await p.click('#terminSpeichern');
await p.waitForTimeout(600);
db = await ausDb();
const r = db[reihe.id] || {};
sag('"Ganze Reihe" benennt die Reihe um', r.titel === 'Reihe umbenannt', String(r.titel));
sag('Die Wiederholung ueberlebt das Speichern der Reihe', r.rrule === reihe.rrule, String(r.rrule));
sag('Die Ausnahmen bleiben erhalten',
    exVorher.every(t => (r.exdate || []).includes(t)),
    JSON.stringify(r.exdate) + ' erwartet mindestens ' + JSON.stringify(exVorher));
sag('sequence zaehlt hoch', (r.sequence || 0) > (reihe.sequence || 0),
    (reihe.sequence || 0) + ' -> ' + (r.sequence || 0));

/* 5 — der Feed. Das ist der eigentliche Zweck von K-10: Ein abonnierender
       Kalender soll eine geaenderte Ausgabe als Aenderung lesen, nicht als
       Loeschung mit Neuanlage. Dafuer braucht er EXDATE an der Reihe,
       RECURRENCE-ID an der Ausnahme und SEQUENCE an beiden.

       `baueIcs` ist von aussen nicht erreichbar — richtig so, es ist Innenleben.
       Geprueft wird deshalb das, was der Abonnent wirklich bekommt: der Text
       unter `ics/<token>`. Den schreibt `schreibeIcs` erst, wenn ein Link
       besteht, also wird hier einer erzeugt. */
await p.click('nav .tab[data-tab="kalender"]');
await p.waitForTimeout(200);
await p.evaluate(() => { const k = document.getElementById('icsKopieren'); if (k) k.click(); });
await p.waitForTimeout(500);
/* Noch einmal speichern, damit der Feed den Stand von oben enthaelt */
await oeffneAusgabe(reihe.datum);
await p.click('#terminSpeichern');
await p.waitForTimeout(700);

const feed = await p.evaluate(() => {
  const P = globalThis.__pruefstand || {};
  const zweig = (P.BAUM || {}).ics || {};
  const token = Object.keys(zweig)[0];
  return token ? (zweig[token].text || '') : null;
});
if (feed === null) {
  sag('ICS-Zweig wurde geschrieben', false, 'unter ics/<token> steht nichts');
} else {
  sag('ICS enthaelt EXDATE', feed.includes('EXDATE'));
  sag('ICS enthaelt RECURRENCE-ID', feed.includes('RECURRENCE-ID'));
  sag('ICS enthaelt SEQUENCE', feed.includes('SEQUENCE'));
  sag('ICS enthaelt RRULE', feed.includes('RRULE'));
  /* Dieselbe uid an Reihe und Ausnahme — daran erkennt der Kalender, dass die
     Ausnahme zur Reihe gehoert. Zwei verschiedene uids waeren zwei Termine. */
  const uids = (feed.match(/^UID:.*$/gm) || []).map(z => z.slice(4).trim());
  sag('Reihe und herausgeloeste Ausgabe teilen sich eine uid',
      uids.filter(u => u === reihe.uid).length >= 2,
      uids.join(' '));
}

await b.close(); s.close();
console.log(fehler.length ? 'FEHLER:\n  ' + [...new Set(fehler)].join('\n  ') : 'Keine Fehler.');
process.exit(fehler.length ? 1 : 0);

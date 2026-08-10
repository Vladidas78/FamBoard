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

/* Spiegelt WIEDERHOLUNGEN aus app.js. Seit die Testdaten fuer O-27 auch eine
   Regel enthalten, die die App **nicht** kennt, reicht "irgendein Termin mit
   rrule" nicht mehr: Der O-25-Teil braucht eine Reihe, die sich wirklich
   wiederholt, der O-27-Teil genau die andere. */
const BEKANNTE_WDH = ['FREQ=DAILY', 'FREQ=WEEKLY', 'FREQ=WEEKLY;INTERVAL=2', 'FREQ=MONTHLY'];

const reihe = await (async () => {
  const alle = await ausDb();
  const id = Object.keys(alle).find(k => BEKANNTE_WDH.includes(alle[k].rrule));
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

/* 6 — O-27: eine Regel, die die App nicht kennt, darf weder als Rohtext in der
       Oberflaeche stehen noch beim Speichern verlorengehen. */
const fremd = await (async () => {
  const alle = await ausDb();
  const id = Object.keys(alle).find(k => alle[k].rrule && !BEKANNTE_WDH.includes(alle[k].rrule));
  return id ? Object.assign({ id }, alle[id]) : null;
})();
if (!fremd) {
  sag('Testdaten enthalten eine unbekannte RRULE fuer O-27', false);
} else {
  console.log('Unbekannte Regel:', fremd.id, fremd.titel, fremd.rrule, 'am', fremd.datum);
  await p.click('nav .tab[data-tab="kalender"]');
  await p.waitForTimeout(200);
  await p.evaluate(t => { const k = document.querySelector(`.kal-tag[data-tag="${t}"]`); if (k) k.click(); }, fremd.datum);
  await p.waitForTimeout(300);

  const zeile = await p.evaluate(id => {
    const li = document.querySelector(`.kal-zeile[data-id="${id}"]`);
    return li ? { text: li.textContent.replace(/\s+/g, ' ').trim(), html: li.innerHTML } : null;
  }, fremd.id);
  if (!zeile) {
    sag('Termin mit unbekannter Regel erscheint an seinem Starttag', false, fremd.datum);
  } else {
    sag('Termin mit unbekannter Regel erscheint an seinem Starttag', true);
    sag('Die Rohzeichenkette steht NICHT in der Zeile', !zeile.text.includes('FREQ='), zeile.text);
    sag('Stattdessen steht dort ein Name', zeile.text.includes('Eigene Wiederholung'));
    sag('Der Rohwert bleibt im Titel nachlesbar', zeile.html.includes(fremd.rrule));

    /* Der eigentliche Schaden: oeffnen, „Ganze Reihe", speichern — und die
       Wiederholung ist weg. Genau das darf nicht mehr passieren. */
    await p.evaluate(id => {
      const li = document.querySelector(`.kal-zeile[data-id="${id}"]`);
      if (li) li.querySelector('.kal-zeile-btn').click();
    }, fremd.id);
    await p.waitForTimeout(300);
    const pille = await p.evaluate(() => {
      const an = document.querySelector('#terminWdhRow .filter-pill.active');
      return an ? { rrule: an.dataset.rrule, text: an.textContent.trim() } : null;
    });
    sag('Im Formular ist eine Wiederholungspille aktiv', !!pille, JSON.stringify(pille));
    if (pille) sag('Sie traegt den Rohwert weiter', pille.rrule === fremd.rrule, pille.rrule);

    await p.evaluate(() => {
      const b2 = [...document.querySelectorAll('#terminUmfangRow .filter-pill')].find(x => x.dataset.umfang === 'reihe');
      if (b2) b2.click();
    });
    await p.waitForTimeout(200);
    await p.click('#terminSpeichern');
    await p.waitForTimeout(700);
    const nachher = (await ausDb())[fremd.id] || {};
    sag('Nach „Ganze Reihe" speichern lebt die unbekannte Regel noch',
        nachher.rrule === fremd.rrule, String(nachher.rrule));
  }
}

/* 7 — O-26: der Feed traegt Personennamen. Wird eine Person umbenannt, muss er
       nachziehen, ohne dass jemand einen Termin anfasst. */
const feedVon = () => p.evaluate(() => {
  const P = globalThis.__pruefstand || {};
  const zweig = (P.BAUM || {}).ics || {};
  const token = Object.keys(zweig)[0];
  return token ? (zweig[token].text || '') : null;
});
const vorher = await feedVon();
if (vorher === null) {
  sag('Feed steht fuer die Personenprobe bereit', false);
} else {
  const person = await p.evaluate(() => {
    const P = globalThis.__pruefstand || {};
    const hh = (((P.BAUM || {}).haushalte || {})[P.HH] || {});
    const alle = (hh.data || {}).personen || {};
    const termine = (((hh.data || {}).kalender || {}).gemeinsam) || {};
    /* Nur eine Person, die auch wirklich an einem Termin haengt — sonst steht
       ihr Name in keiner DESCRIPTION und die Probe beweist nichts. */
    const benutzt = new Set();
    Object.values(termine).forEach(t => { if (Array.isArray(t.wer)) t.wer.forEach(x => benutzt.add(x)); });
    const id = Object.keys(alle).find(k => benutzt.has(k));
    return id ? { id, name: alle[id].name } : null;
  });
  if (!person) {
    sag('Eine Person haengt an einem Termin', false);
  } else {
    sag('Alter Name steht im Feed', vorher.includes(person.name), person.name);
    /* Bewusst ein Name, der den alten **nicht** enthaelt. Mit "Vladi-neu"
       waere die Gegenprobe "alter Name ist weg" nie fehlgeschlagen, weil
       "Vladi" darin steckt — eine Pruefung, die nie anschlaegt (Regel 13). */
    const neu = 'Umbenannt';
    await p.click('nav .tab[data-tab="heute"]');
    await p.waitForTimeout(150);
    await p.click('#kopfKonto');
    await p.waitForTimeout(300);
    const gesetzt = await p.evaluate(({ id, neu }) => {
      const zeile = document.querySelector(`.person-zeile[data-id="${id}"]`);
      if (!zeile) return false;
      const kopf = zeile.querySelector('button');
      if (kopf) kopf.click();
      const feld = zeile.querySelector('.person-name-feld');
      if (!feld) return false;
      feld.value = neu;
      feld.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, { id: person.id, neu });
    await p.waitForTimeout(700);
    if (!gesetzt) {
      sag('Personenname liess sich aendern', false);
    } else {
      const nachher = await feedVon();
      sag('Der Feed traegt den neuen Namen — ohne dass ein Termin angefasst wurde',
          nachher.includes(neu), neu);
      sag('Der alte Name steht nicht mehr drin', !nachher.includes(person.name), person.name);
    }
  }
}

await b.close(); s.close();
console.log(fehler.length ? 'FEHLER:\n  ' + [...new Set(fehler)].join('\n  ') : 'Keine Fehler.');
process.exit(fehler.length ? 1 : 0);

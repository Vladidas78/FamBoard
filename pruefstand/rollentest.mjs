/* Einmalprüfung zu D-23: Sieht ein Mitglied (nicht Eigentümer) den Grund,
   warum „Haushalt löschen" ausgegraut ist? Patcht dafür kurz die Rolle im
   Stub und stellt sie danach wieder her. */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { WURZEL, STUB, BROWSER, starteServer, pruefeAufbau, haltDieUhrAn } from './pfade.mjs';

pruefeAufbau();
const AUS = process.argv[2] || join(WURZEL, 'bilder-rolle');
mkdirSync(AUS, { recursive: true });
const stubDatei = join(STUB, 'firebase-database.js');
const original = readFileSync(stubDatei, 'utf8');
let fehler = 0;

try {
  for (const [name, rolle] of [['eigentuemer', 'owner'], ['mitglied', 'mitglied']]) {
    const gepatcht = original.replace("[UID]:{ rolle:'owner'", `[UID]:{ rolle:'${rolle}'`);
    if (gepatcht === original && rolle !== 'owner') { console.log('FEHLER: Rolle im Stub nicht gefunden'); fehler++; }
    writeFileSync(stubDatei, gepatcht, 'utf8');

    const s = await starteServer(8792);
    const b = await chromium.launch(BROWSER);
    const c = await b.newContext({ viewport:{width:402,height:900}, locale:'de-DE', timezoneId:'Europe/Berlin', deviceScaleFactor:2 });
    await haltDieUhrAn(c);
    const p = await c.newPage();
    await p.route('https://www.gstatic.com/firebasejs/**', ro => ro.fulfill({ status:200, contentType:'text/javascript',
      body: readFileSync(join(STUB, ro.request().url().split('/').pop()), 'utf8') }));
    await p.route('https://cdnjs.cloudflare.com/**', ro => ro.fulfill({ status:200, contentType:'text/javascript',
      body:'window.XLSX={utils:{},write:()=>{},read:()=>{}};' }));
    await p.addInitScript(() => { try{ localStorage.setItem('famboard.haushalt','hh-pruefstand'); }catch(e){}
      if(navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('aus')); });
    await p.goto(`http://127.0.0.1:${s.address().port}/index.html`, { waitUntil:'networkidle' });
    await p.waitForTimeout(700);
    await p.click('#kopfKonto');
    await p.waitForTimeout(400);

    const befund = await p.evaluate(() => {
      const kn = document.getElementById('hhLoeschen');
      const gr = document.getElementById('hhLoeschenOut');
      const hn = document.getElementById('hhNameHint');
      const sp = document.getElementById('hhNameSave');
      return { aus: kn ? kn.disabled : null, grund: gr ? gr.textContent.trim() : null,
               speichernAus: sp ? sp.disabled : null, nameHinweis: hn ? hn.textContent.trim() : null };
    });
    const erwartet = rolle === 'owner'
      ? (befund.aus === false && befund.speichernAus === false && befund.grund === '')
      : (befund.aus === true  && befund.speichernAus === true  && /Eigentümer/.test(befund.grund || ''));
    console.log(`${erwartet ? 'ok  ' : 'FEHLER'} ${name}: löschen aus=${befund.aus}, speichern aus=${befund.speichernAus}`);
    console.log(`      Grund unter dem Knopf: "${befund.grund}"`);
    console.log(`      Hinweis am Namensfeld: "${befund.nameHinweis}"`);
    if (!erwartet) fehler++;

    await p.evaluate(() => document.getElementById('hhLoeschen').scrollIntoView({ block:'center' }));
    await p.waitForTimeout(300);
    const kasten = await p.evaluate(() => {
      const r = document.getElementById('hhLoeschen').getBoundingClientRect();
      return { x: 8, y: Math.max(0, r.top - 150), width: 386, height: 240 };
    });
    await p.screenshot({ path: join(AUS, `loeschen-${name}.png`), clip: kasten });
    await c.close(); await b.close(); s.close();
  }
} finally {
  writeFileSync(stubDatei, original, 'utf8');
}
console.log(fehler ? `${fehler} Fehler.` : 'Keine Fehler.');
process.exit(fehler ? 1 : 0);

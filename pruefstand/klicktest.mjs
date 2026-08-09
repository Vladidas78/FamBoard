/* Prueft die Wege durch die App: in die Einstellungen, aus den Heute-Karten
   heraus, und ob das Figurband der Butley-Stufe sofort folgt. */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STUB, BROWSER, starteServer, pruefeAufbau, haltDieUhrAn } from './pfade.mjs';
pruefeAufbau();
const s = await starteServer();
const b=await chromium.launch(BROWSER);
const c=await b.newContext({viewport:{width:402,height:900},locale:'de-DE',timezoneId:'Europe/Berlin'});
await haltDieUhrAn(c);
const p=await c.newPage();
await p.route('https://www.gstatic.com/firebasejs/**',ro=>ro.fulfill({status:200,contentType:'text/javascript',body:readFileSync(join(STUB,ro.request().url().split('/').pop()),'utf8')}));
await p.route('https://cdnjs.cloudflare.com/**',ro=>ro.fulfill({status:200,contentType:'text/javascript',body:'window.XLSX={utils:{},write:()=>{},read:()=>{}};'}));
const fehler=[];
p.on('pageerror',e=>fehler.push('Seitenfehler: '+e.message));
p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))fehler.push('Konsole: '+m.text());});
await p.addInitScript(()=>{try{localStorage.setItem('famboard.haushalt','hh-pruefstand');}catch(e){}
  if(navigator.serviceWorker) navigator.serviceWorker.register=()=>Promise.reject(new Error('aus'));});
await p.goto(`http://127.0.0.1:${s.address().port}/index.html`,{waitUntil:'networkidle'});
await p.waitForTimeout(700);
// Jeden Weg in die Einstellungen einmal gehen
for (const sel of ['#kopfHaushalt','#kopfKonto']) {
  await p.click('nav .tab[data-tab="heute"]');
  await p.waitForTimeout(150);
  await p.click(sel);
  await p.waitForTimeout(250);
  const sichtbar = await p.evaluate(()=>document.getElementById('settings').classList.contains('active'));
  console.log(sel, '-> Einstellungen offen:', sichtbar);
}
/* Jeder Weg aus einer Heute-Karte muss im richtigen Bereich landen.
   In B6.2 trugen diese vier Knoepfe ihr Ziel, aber niemand hoerte zu. */
const WEGE = [['kalender','kalender',null],['essen','essen','plan'],['einkauf','einkauf','shop'],['notizen','notizen',null]];
for (const [ziel, bereich, unter] of WEGE) {
  await p.click('nav .tab[data-tab="heute"]');
  await p.waitForTimeout(120);
  await p.click(`#heute .karte-weiter[data-ziel="${ziel}"]`);
  await p.waitForTimeout(200);
  const ok = await p.evaluate(({bereich, unter})=>{
    const b = document.getElementById(bereich);
    const bOk = !!b && b.classList.contains('active');
    const uOk = !unter || !!document.getElementById(unter)?.classList.contains('active');
    return bOk && uOk;
  }, {bereich, unter});
  console.log('Weiter ->', ziel, ':', ok ? 'ok' : 'FEHLGESCHLAGEN');
  if(!ok) fehler.push('Weg aus Heute nach ' + ziel + ' fuehrt nirgendwohin');
}

/* Figurband muss der Butley-Stufe sofort folgen, ohne Neuladen */
await p.click('#kopfKonto'); await p.waitForTimeout(200);
for (const [stufe, erwartet] of [['aus', true], ['voll', false]]) {
  await p.click(`#butleyUmschalter [data-stufe="${stufe}"]`);
  await p.waitForTimeout(200);
  const versteckt = await p.evaluate(()=>{
    const el = document.getElementById('heuteFigurBand');
    return !el || getComputedStyle(el).display === 'none';
  });
  console.log('Butley', stufe, '-> Band versteckt:', versteckt, versteckt === erwartet ? 'ok' : 'FALSCH');
  if(versteckt !== erwartet) fehler.push('Figurband folgt der Stufe "' + stufe + '" nicht sofort');
}

/* ---------- O-25: Serien ----------
   Die Bilder zeigen, dass die Wahl dasteht. Ob sie wirkt, zeigt kein Bild.
   Betriebsregel 13 verlangt, dass eine Pruefung anschlaegt: Jede Behauptung
   hier wuerde gegen den Stand v16 fehlschlagen — dort aenderte jedes Speichern
   die ganze Reihe. */
async function tagOeffnen(versatz){
  const iso = await p.evaluate((v)=>{
    const d = new Date(); d.setDate(d.getDate()+v);
    const s = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const t = document.querySelector('.kal-tag[data-tag="'+s+'"]');
    if(t) t.click();
    return s;
  }, versatz);
  await p.waitForTimeout(220);
  return iso;
}
async function zeilenAm(versatz){
  await tagOeffnen(versatz);
  return p.evaluate(()=>[...document.querySelectorAll('#kalTag .kal-zeile-btn')].map(z=>z.innerText.replace(/\s+/g,' ').trim()));
}

await p.click('nav .tab[data-tab="kalender"]');
await p.waitForTimeout(250);

/* 1. Die Reihe wiederholt sich ueberhaupt. Genau das tat sie bis zum 09.08.
      nicht, weil die Testdaten eine RRULE trugen, die die App nicht kennt. */
const wiederholt = (await zeilenAm(1)).length && (await zeilenAm(15)).length;
console.log('Reihe wiederholt sich (Tag +1 und +15):', wiederholt ? 'ok' : 'FEHLGESCHLAGEN');
if(!wiederholt) fehler.push('Die Serie in den Testdaten wiederholt sich nicht');

/* 2. Keine Rohzeichenkette in der Terminzeile. */
const roh = (await zeilenAm(1)).some(z=>/FREQ=|BYDAY=|INTERVAL=/.test(z));
console.log('Keine RRULE im Klartext:', roh ? 'FEHLGESCHLAGEN' : 'ok');
if(roh) fehler.push('Die Terminzeile zeigt die RRULE als Rohtext');

/* 3. Der ausgenommene Tag ist leer, der Ersatztermin steht am Tag darauf. */
const ausgenommen = (await zeilenAm(8)).length === 0;
const ersatz = (await zeilenAm(9)).some(z=>z.includes('einzeln geändert'));
console.log('Ausgenommener Tag leer:', ausgenommen ? 'ok' : 'FEHLGESCHLAGEN',
            '| Ersatztermin da:', ersatz ? 'ok' : 'FEHLGESCHLAGEN');
if(!ausgenommen) fehler.push('exdate wird beim Zeichnen nicht beachtet');
if(!ersatz) fehler.push('Die herausgeloeste Ausgabe fehlt oder ist nicht als solche erkennbar');

/* 4. Das Formular zeigt die angeklickte Ausgabe, nicht den Serienbeginn.
      Bis v16 stand hier immer der Beginn. */
await tagOeffnen(15);
await p.click('#kalTag .kal-zeile-btn');
await p.waitForTimeout(300);
/* Ohne Pruefung auf `null` bricht der Lauf ab, sobald ein Element fehlt — und
   ein Abbruch meldet nichts, er meldet nur sich selbst. Dieselbe Regel wie fuer
   `setStatus` nach dem Ausfall vom 07.08.: Was nur nachsieht, greift nie hart zu. */
const formular = await p.evaluate(()=>{
  const el = id => document.getElementById(id);
  const aktiv = document.querySelector('#terminUmfangRow .filter-pill.active');
  return {
    datum: el('terminDatum') ? el('terminDatum').value : null,
    wahlDa: !!el('terminUmfangFeld') && !el('terminUmfangFeld').hidden,
    vorgabe: aktiv ? aktiv.textContent : null,
    wdhVersteckt: !!el('terminWdhFeld') && el('terminWdhFeld').hidden
  };
});
const erwartetesDatum = await p.evaluate(()=>{
  const d = new Date(); d.setDate(d.getDate()+15);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
});
console.log('Formular zeigt die Ausgabe:', formular.datum === erwartetesDatum ? 'ok' : 'FEHLGESCHLAGEN ('+formular.datum+' statt '+erwartetesDatum+')');
console.log('Wahl sichtbar:', formular.wahlDa ? 'ok' : 'FEHLGESCHLAGEN', '| Vorgabe:', formular.vorgabe, '| Wiederholung versteckt:', formular.wdhVersteckt);
if(formular.datum !== erwartetesDatum) fehler.push('Das Formular zeigt den Serienbeginn statt der angeklickten Ausgabe');
if(!formular.wahlDa) fehler.push('Die Wahl "Aenderung gilt fuer" fehlt bei einer Serienausgabe');
if(formular.vorgabe !== 'Nur dieser Termin') fehler.push('Vorgabe ist nicht "Nur dieser Termin"');

/* 5. Speichern mit „Nur dieser Termin" aendert genau diesen einen Tag. */
await p.fill('#terminTitel', 'Müllabfuhr verlegt');
await p.click('#terminSpeichern');
await p.waitForTimeout(400);
const nachher15 = await zeilenAm(15);
const nachher22 = await zeilenAm(22);
const nurEiner = nachher15.some(z=>z.includes('verlegt')) && !nachher22.some(z=>z.includes('verlegt')) && nachher22.length > 0;
console.log('Nur dieser Termin geaendert:', nurEiner ? 'ok' : 'FEHLGESCHLAGEN');
if(!nurEiner) fehler.push('"Nur dieser Termin" hat die ganze Reihe geaendert oder die Reihe zerstoert');

/* 6. Der ICS-Feed traegt EXDATE und RECURRENCE-ID. Ohne beides widersprechen
      sich App und Abo-Kalender still. */
/* `app.js` laeuft als Modul — nichts davon steht global. Der Feed wird aber in
   den Datenbaum geschrieben, und den legt der Stub offen. */
const ics = await p.evaluate(()=>{
  const baum = (globalThis.__pruefstand||{}).BAUM || {};
  const eintraege = Object.keys(baum.ics || {}).map(k=>baum.ics[k]);
  return eintraege.length ? String(eintraege[eintraege.length-1].text || '') : '';
});
const icsOk = /EXDATE;VALUE=DATE:\d{8}/.test(ics) && /RECURRENCE-ID;VALUE=DATE:\d{8}/.test(ics);
console.log('ICS traegt EXDATE und RECURRENCE-ID:', icsOk ? 'ok' : 'FEHLGESCHLAGEN');
if(!icsOk) fehler.push('EXDATE oder RECURRENCE-ID fehlt im ICS-Feed');

await b.close(); s.close();
console.log(fehler.length ? 'FEHLER:\n  '+[...new Set(fehler)].join('\n  ') : 'Keine Fehler.');

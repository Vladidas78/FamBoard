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

/* Heute-Haken. Kapitel 3.2 verlangt "offene Posten direkt abhakbar". Bis v28
   schrieb der Haken auf Heute immer nach `checked`; einmalige Extras liest die
   Liste aber ueber `doneWk` am Extra selbst. Der Toast kam, der Posten blieb,
   die Zahl blieb. Gepruft wird je ein Posten beider Sorten gegen Zahl, Zeile
   und Liste, beim ersten auch das Zuruecknehmen ueber den Toast. */
await p.click('nav .tab[data-tab="heute"]'); await p.waitForTimeout(150);
const zahlHeute = ()=>p.evaluate(()=>Number(document.getElementById('heuteEinkaufZahl').textContent || 0));
const standVon = (name)=>p.evaluate((name)=>({
  nochDa: Array.from(document.querySelectorAll('#heuteEinkauf .hz-titel')).some(el=>el.textContent===name),
  inListe: Array.from(document.querySelectorAll('#shop .shop-item')).filter(li=>li.textContent.includes(name)).map(li=>li.classList.contains('checked'))
}), name);
for (const [name, sorte, zurueck] of [['Bananen','einmaliges Extra',true],['Basilikum','Rezept-Posten',false]]) {
  const vorher = await zahlHeute();
  const zeile = p.locator('#heuteEinkauf .heute-zeile', { hasText: name });
  if(await zeile.count() !== 1){ fehler.push('Heute zeigt "'+name+'" nicht unter Einkauf'); continue; }
  await zeile.locator('.haken').click(); await p.waitForTimeout(250);
  const danach = await standVon(name);
  const zahl = await zahlHeute();
  const ok = zahl === vorher-1 && !danach.nochDa && danach.inListe.length === 1 && danach.inListe[0] === true;
  console.log('Heute-Haken ('+sorte+'):', ok ? 'ok' : 'FEHLGESCHLAGEN', 'Zahl', vorher, '->', zahl, '| Zeile weg:', !danach.nochDa, '| Liste erledigt:', danach.inListe.join(','));
  if(!ok) fehler.push('Heute-Haken wirkt nicht bei '+sorte+' ("'+name+'")');
  if(!zurueck) continue;
  await p.click('#toastAction'); await p.waitForTimeout(250);
  const wieder = await standVon(name);
  const rueckOk = (await zahlHeute()) === vorher && wieder.nochDa && wieder.inListe[0] === false;
  console.log('Heute-Haken zurueckgenommen ('+sorte+'):', rueckOk ? 'ok' : 'FEHLGESCHLAGEN');
  if(!rueckOk) fehler.push('Ruecknahme des Heute-Hakens wirkt nicht bei '+sorte);
}

/* Abteilungen (18.10.2026): Die Fixture speichert eine Reihenfolge mit zehn Abteilungen.
   Seit v30 gibt es dreizehn - die gespeicherte Reihenfolge muss bleiben, die neuen
   haengen hinten an, und Sauerteigbrot steht im Backshop statt bei Trockenwaren. */
const abt = await p.evaluate(()=>{
  const text = document.getElementById('shopGroups').innerText;
  const brot = text.indexOf('Sauerteigbrot'), backshop = text.indexOf('Backshop'), trocken = text.indexOf('Trockenwaren');
  return { backshopVorBrot: backshop >= 0 && brot >= 0 && backshop < brot, trockenVorBackshop: trocken >= 0 && trocken < backshop };
});
const abtOk = abt.backshopVorBrot && abt.trockenVorBackshop;
console.log('Backshop haengt hinten an und traegt Sauerteigbrot:', abtOk ? 'ok' : 'FEHLGESCHLAGEN', JSON.stringify(abt));
if(!abtOk) fehler.push('Abteilungen: Backshop fehlt, steht falsch oder traegt das Brot nicht');

/* ---------- v31: Budget, Preise, Leerzustand (18.10.2026) ----------
   Betriebsregel 13: Jede Behauptung hier schlaegt am Stand v30 an - dort gibt
   es weder #heuteBudget noch .preis-btn, und die vier Heute-Karten stehen
   auch bei leerem Haushalt. Die Zahlen werden aus dem Text gelesen, den der
   Nutzer sieht, nicht aus einem Datenattribut nur fuer den Pruefstand. */
const euro = (text)=>{
  const m = String(text).match(/(-?\d+(?:[.,]\d+)?)\s*€/g) || [];
  return m.map(x=>parseFloat(x.replace(/\s*€/,'').replace(',','.')));
};
const budgetLesen = ()=>p.evaluate(()=>{
  const k = document.getElementById('heuteBudget');
  const sec = document.getElementById('heuteKarteBudget');
  const q = (sel)=>{ const el = k && k.querySelector(sel); return el ? el.textContent : ''; };
  return { da: !!k && !!sec && !sec.hidden, zeile: q('.budget-zeile'), legende: q('.budget-legende'),
           ohnePreis: q('.budget-ohne-preis'), festlegen: !!(k && k.querySelector('.budget-festlegen') && !k.querySelector('.budget-festlegen').hidden) };
});
await p.click('nav .tab[data-tab="heute"]'); await p.waitForTimeout(150);
const b1 = await budgetLesen();
const z1 = euro(b1.zeile), l1 = euro(b1.legende);
/* "noch X € von Y €" -> [rest, ziel]; "verbraucht A € · geplant B €" -> [a, b] */
const stimmig = b1.da && z1.length === 2 && l1.length === 2 && Math.abs((l1[0] + l1[1] + z1[0]) - z1[1]) < 0.011;
console.log('Budgetkarte auf Heute:', stimmig ? 'ok' : 'FEHLGESCHLAGEN', JSON.stringify(b1));
if(!stimmig) fehler.push('Budgetkarte fehlt oder die Zahlen gehen nicht auf (verbraucht + geplant + Rest = Ziel)');
/* Abhaken eines Postens mit Preis: der Betrag wandert von geplant nach verbraucht.
   Feta traegt in der Fixture 1,60 EUR und steht in beiden Rezepten der Woche. */
await p.click('nav .tab[data-tab="einkauf"]'); await p.waitForTimeout(150);
const preisKnoepfe = await p.evaluate(()=>Array.from(document.querySelectorAll('#shop .shop-item .preis-btn')).map(b=>b.textContent));
const mitPreis = preisKnoepfe.filter(t=>/\d,\d{2} €/.test(t)).length, ohne = preisKnoepfe.filter(t=>t==='Preis').length;
console.log('Preis-Schaltflaechen in der Liste:', (mitPreis && ohne) ? 'ok' : 'FEHLGESCHLAGEN', mitPreis, 'mit Preis,', ohne, 'ohne');
if(!(mitPreis && ohne)) fehler.push('Preis-Schaltflaeche fehlt in der Einkaufsliste');
const fetaPreis = await p.evaluate(()=>{ const li = Array.from(document.querySelectorAll('#shop .shop-item')).find(l=>l.querySelector('.nm') && l.querySelector('.nm').textContent==='Feta'); const pb = li && li.querySelector('.preis-btn'); return pb ? pb.textContent : null; });
const fp = euro(fetaPreis || '')[0] || 0;
await p.evaluate(()=>{ const li = Array.from(document.querySelectorAll('#shop .shop-item')).find(l=>l.querySelector('.nm') && l.querySelector('.nm').textContent==='Feta'); if(li) li.querySelector('input[type=checkbox]').click(); });
await p.waitForTimeout(250);
await p.click('nav .tab[data-tab="heute"]'); await p.waitForTimeout(150);
const b2 = await budgetLesen();
const l2 = euro(b2.legende);
const gewandert = fp > 0 && l2.length === 2 && Math.abs((l2[0] - l1[0]) - fp) < 0.011 && Math.abs((l1[1] - l2[1]) - fp) < 0.011;
console.log('Abhaken verschiebt den Preis (Feta ' + fetaPreis + '):', gewandert ? 'ok' : 'FEHLGESCHLAGEN', JSON.stringify({vorher:l1, nachher:l2}));
if(!gewandert) fehler.push('Nach dem Abhaken wandert der Preis nicht von geplant nach verbraucht');
const planenVoll = await p.evaluate(()=>{ const s = document.getElementById('heutePlanen'); return !!s && s.hidden; });
console.log('Planen-Karte bei vollem Tag versteckt:', planenVoll ? 'ok' : 'FEHLGESCHLAGEN');
if(!planenVoll) fehler.push('"Diese Woche planen?" erscheint, obwohl der Tag Inhalt hat');

/* Leerer Haushalt (?leer=1, wie onboardingtest.mjs): keine der vier Karten,
   dafuer die Planungsfrage mit hoechstens sieben Tageszeilen. */
const cLeer = await b.newContext({viewport:{width:402,height:900},locale:'de-DE',timezoneId:'Europe/Berlin'});
await haltDieUhrAn(cLeer);
const pl = await cLeer.newPage();
await pl.route('https://www.gstatic.com/firebasejs/**',ro=>ro.fulfill({status:200,contentType:'text/javascript',body:readFileSync(join(STUB,ro.request().url().split('/').pop()),'utf8')}));
await pl.route('https://cdnjs.cloudflare.com/**',ro=>ro.fulfill({status:200,contentType:'text/javascript',body:'window.XLSX={utils:{},write:()=>{},read:()=>{}};'}));
pl.on('pageerror',e=>fehler.push('Seitenfehler (leer): '+e.message));
pl.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))fehler.push('Konsole (leer): '+m.text());});
await pl.addInitScript(()=>{try{localStorage.setItem('famboard.haushalt','hh-pruefstand'); localStorage.removeItem('famboard.ansicht');}catch(e){}
  if(navigator.serviceWorker) navigator.serviceWorker.register=()=>Promise.reject(new Error('aus'));});
await pl.goto(`http://127.0.0.1:${s.address().port}/index.html?leer=1`,{waitUntil:'networkidle'});
await pl.waitForTimeout(800);
const leer = await pl.evaluate(()=>{
  const h = id=>{ const el = document.getElementById(id); return el ? el.hidden : null; };
  return { termine:h('heuteKarteTermine'), essen:h('heuteKarteEssen'), einkauf:h('heuteKarteEinkauf'), aufgaben:h('heuteKarteAufgaben'),
           planen:h('heutePlanen'), zeilen:document.querySelectorAll('#heutePlanenTage .planen-zeile').length,
           keineRezepte:!!document.querySelector('#heuteLaengerNicht .planen-keine'),
           budgetFestlegen:(()=>{ const f = document.querySelector('#heuteBudget .budget-festlegen'); return !!f && !f.hidden; })() };
});
const leerOk = leer.termine === true && leer.essen === true && leer.einkauf === true && leer.aufgaben === true
            && leer.planen === false && leer.zeilen >= 1 && leer.zeilen <= 7 && leer.keineRezepte && leer.budgetFestlegen;
console.log('Leerer Haushalt - nur Planungsfrage und Budget-Aufforderung:', leerOk ? 'ok' : 'FEHLGESCHLAGEN', JSON.stringify(leer));
if(!leerOk) fehler.push('Leerzustand auf Heute: Karten nicht versteckt oder Planungsfrage fehlt');
await cLeer.close();

/* v32: Ring statt Balken, Vorschlaege mit Plus auch unter dem Artikel-Suchfeld. */
await p.click('nav .tab[data-tab="heute"]'); await p.waitForTimeout(150);
const ring = await p.evaluate(()=>{ const r=document.querySelector('#heuteBudget .budget-ring'); if(!r) return null;
  return { wert: r.querySelector('.br-wert').textContent, noch: r.querySelector('.br-noch').textContent,
    dash: r.querySelector('.br-verbraucht').style.strokeDasharray, sichtbar: getComputedStyle(r).display !== 'none' }; });
const ringOk = !!ring && ring.sichtbar && /\d/.test(ring.wert) && ring.noch === 'noch' && /\d/.test(ring.dash);
console.log('Budget-Ring auf Heute:', ringOk ? 'ok' : 'FEHLGESCHLAGEN', JSON.stringify(ring));
if(!ringOk) fehler.push('Budget-Ring fehlt oder traegt keinen Wert');
await p.click('nav .tab[data-tab="einkauf"]'); await p.waitForTimeout(150);
await p.click('#einkauf .unter[data-unter="artikel"]'); await p.waitForTimeout(150);
await p.fill('#artSearch', 'kar'); await p.waitForTimeout(200);
const av = await p.evaluate(()=>{ const b=document.getElementById('artVorschlaege'); if(!b) return null;
  const feld=document.getElementById('artSearch').getBoundingClientRect(), box=b.getBoundingClientRect();
  return { hidden: b.hidden, anzahl: b.querySelectorAll('.vorschlag .v-plus').length, direktDarunter: box.top >= feld.bottom && box.top - feld.bottom < 40,
    namen: Array.from(b.querySelectorAll('.v-name')).map(e=>e.textContent.trim()).slice(0,3) }; });
const avOk = !!av && !av.hidden && av.anzahl > 0 && av.direktDarunter;
console.log('Artikel-Vorschlaege unter dem Feld mit Plus:', avOk ? 'ok' : 'FEHLGESCHLAGEN', JSON.stringify(av));
if(!avOk) fehler.push('Vorschlaege unter dem Artikel-Suchfeld fehlen oder stehen nicht direkt darunter');
if(avOk){ await p.click('#artVorschlaege .vorschlag'); await p.waitForTimeout(250);
  const leer = await p.evaluate(()=>document.getElementById('artSearch').value === '' && document.getElementById('artVorschlaege').hidden);
  console.log('Plus uebernimmt und leert das Feld:', leer ? 'ok' : 'FEHLGESCHLAGEN');
  if(!leer) fehler.push('Nach dem Plus bleibt das Artikel-Suchfeld gefuellt'); }

/* v33: Auswahl-Leiste im Artikelstamm bleibt ueber der Fussleiste sichtbar und nennt die Budget-Wirkung. */
await p.click('nav .tab[data-tab="einkauf"]'); await p.waitForTimeout(120);
await p.click('#einkauf .unter[data-unter="artikel"]'); await p.waitForTimeout(150);
await p.fill('#artSearch', ''); await p.waitForTimeout(150);
await p.evaluate(()=>window.scrollTo(0, 0));
await p.locator('#artikelListe .art-row .art-pick').first().click(); await p.waitForTimeout(250);
const leiste = await p.evaluate(()=>{ const l=document.getElementById('artAuswahl'); if(!l || l.hidden) return {sichtbar:false};
  const r=l.getBoundingClientRect(); const nav=document.querySelector('nav').getBoundingClientRect();
  return { sichtbar:true, unterkante:Math.round(r.bottom), navOben:Math.round(nav.top), imBild: r.bottom <= nav.top && r.top >= 0,
    budget:(document.getElementById('artAuswahlBudget')||{}).textContent, scrollY:Math.round(scrollY) }; });
const leisteOk = leiste.sichtbar && leiste.imBild && /€/.test(leiste.budget||'');
console.log('Auswahl-Leiste ueber der Fussleiste mit Budget:', leisteOk ? 'ok' : 'FEHLGESCHLAGEN', JSON.stringify(leiste));
if(!leisteOk) fehler.push('Auswahl-Leiste ist nicht ueber der Fussleiste sichtbar oder nennt kein Budget');
await p.click('#artAuswahlWeg'); await p.waitForTimeout(150);

/* v35, O-38: Rezeptdetail als eigene Flaeche. Betriebsregel 13: Am Stand v34
   gibt es kein #rezeptDetail - jede Zeile hier schlaegt dort an. Gelesen wird,
   was der Nutzer sieht (Titel, Chips, Mengen, Postenzahl), nicht der Zustand
   im Speicher. */
await p.click('nav .tab[data-tab="essen"]'); await p.waitForTimeout(120);
await p.click('#essen .unter[data-unter="recipes"]'); await p.waitForTimeout(150);
await p.fill('#recSearch', ''); await p.waitForTimeout(150);
const postenVorher = await p.evaluate(()=>document.querySelectorAll('#shop .shop-item').length);
await p.evaluate(()=>{ const k = document.querySelector('#recipeList .recipe-item[data-id="r1"] .recipe-head'); if(k) k.click(); });
await p.waitForTimeout(300);
const detail = await p.evaluate(()=>{
  const d = document.getElementById('rezeptDetail');
  if(!d) return null;
  const sichtbar = el=>!!el && !el.hidden && getComputedStyle(el).display !== 'none';
  const liste = document.getElementById('recipeList');
  return { offen: sichtbar(d), listeWeg: !liste || liste.offsetParent === null,
    titel: (document.getElementById('rdTitel')||{}).textContent, chips: document.querySelectorAll('#rdChips .rd-chip').length,
    mengen: Array.from(document.querySelectorAll('#rdZutaten .rd-menge')).map(e=>e.textContent.trim()),
    schritte: document.querySelectorAll('#rdSchritte li').length,
    naehr: document.querySelectorAll('#rdNaehr tr').length };
});
const detailOk = !!detail && detail.offen && detail.listeWeg && detail.titel === 'Ofengemüse mit Feta' && detail.chips === 3 && detail.schritte === 3 && detail.naehr === 4;
console.log('Rezeptdetail oeffnet sich mit Titel, drei Chips, drei Schritten, Naehrstoffen:', detailOk ? 'ok' : 'FEHLGESCHLAGEN', JSON.stringify(detail));
if(!detailOk) fehler.push('Rezeptdetail fehlt, zeigt die Kachelliste weiter oder traegt nicht Titel/Chips/Schritte/Naehrstoffe von r1');
if(detail && detail.offen){
  await p.click('#rdPortionen .rd-plus'); await p.waitForTimeout(200);
  const mengenNachher = await p.evaluate(()=>Array.from(document.querySelectorAll('#rdZutaten .rd-menge')).map(e=>e.textContent.trim()));
  const zahl = s=>parseFloat(String(s).replace(',','.'));
  const mehr = mengenNachher.length === detail.mengen.length && mengenNachher.length > 0 && mengenNachher.every((m,i)=>zahl(m) > zahl(detail.mengen[i]));
  console.log('Stepper + erhoeht die Mengen:', mehr ? 'ok' : 'FEHLGESCHLAGEN', detail.mengen[0], '->', mengenNachher[0]);
  if(!mehr) fehler.push('Portions-Stepper im Rezeptdetail erhoeht die Mengen nicht');
  await p.click('#rdAufListe'); await p.waitForTimeout(300);
  const postenNachher = await p.evaluate(()=>document.querySelectorAll('#shop .shop-item').length);
  console.log('"Zur Einkaufsliste" erhoeht die Postenzahl:', postenNachher > postenVorher ? 'ok' : 'FEHLGESCHLAGEN', postenVorher, '->', postenNachher);
  if(!(postenNachher > postenVorher)) fehler.push('"Zur Einkaufsliste hinzufuegen" setzt keine Posten auf die Liste');
  await p.click('#rdZurueck'); await p.waitForTimeout(200);
  const zu = await p.evaluate(()=>({ detail: document.getElementById('rezeptDetail').hidden, liste: document.getElementById('recipeList').offsetParent !== null }));
  console.log('"Zurueck" schliesst das Detail und zeigt die Kacheln:', (zu.detail && zu.liste) ? 'ok' : 'FEHLGESCHLAGEN', JSON.stringify(zu));
  if(!(zu.detail && zu.liste)) fehler.push('"Zurueck" im Rezeptdetail fuehrt nicht zur Kachelliste');
  /* (e) Ein Rezept ohne minuten/schwierigkeit zeigt nur den kcal-Chip. */
  await p.evaluate(()=>{ const k = document.querySelector('#recipeList .recipe-item[data-id="r2"] .recipe-head'); if(k) k.click(); });
  await p.waitForTimeout(250);
  const r2 = await p.evaluate(()=>({ titel:(document.getElementById('rdTitel')||{}).textContent, chips:Array.from(document.querySelectorAll('#rdChips .rd-chip')).map(c=>c.textContent.trim()) }));
  const r2Ok = r2.titel === 'Spaghetti Bolognese' && r2.chips.length === 1 && /kcal/.test(r2.chips[0]);
  console.log('Rezept ohne Minuten/Schwierigkeit zeigt nur den kcal-Chip:', r2Ok ? 'ok' : 'FEHLGESCHLAGEN', JSON.stringify(r2));
  if(!r2Ok) fehler.push('Chips ohne Wert werden im Rezeptdetail nicht ausgeblendet');
  await p.click('#rdZurueck'); await p.waitForTimeout(150);
}

await b.close(); s.close();
console.log(fehler.length ? 'FEHLER:\n  '+[...new Set(fehler)].join('\n  ') : 'Keine Fehler.');

/* Prueft den Beitrittsfluss aus E1-E3: Wahlschritt statt Auto-Haushalt,
   Beitritt per Einladungscode, Beitrittsanfrage per Haushalts-ID mit
   Freigabe und Ablehnung, die Eigentuemer-Karte auf Heute - und dass ein
   Mitglied ohne Eigentuemer-Rolle diese Karte nicht sieht.

   Der sechste Abschnitt ist die Regressionspruefung zu P2 (13.08.2026):
   Ein frisch angelegter Haushalt laeuft hier den ECHTEN Anlagepfad entlang
   (data ist anfangs leer), nicht den ?leer=1-Wunschzustand des
   Onboarding-Laufs - genau auf diesem Pfad hat die alte seed()-Vorbelegung
   das Onboarding fuer jeden neuen Haushalt verhindert. */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { WURZEL, STUB, BROWSER, starteServer, pruefeAufbau, haltDieUhrAn } from './pfade.mjs';
pruefeAufbau();
const AUS = process.argv[2] || join(WURZEL, 'bilder'); mkdirSync(AUS,{recursive:true});
const s = await starteServer();
const b = await chromium.launch(BROWSER);
const fehler = [];
const gut = (name, ok, extra)=>{
  console.log(`${name}: ${ok ? 'ok' : 'FEHLGESCHLAGEN'}${extra ? ' ' + extra : ''}`);
  if(!ok) fehler.push(name);
};

/* mitHaushalt=false laesst localStorage leer - ein frisches Geraet, wie es
   ein neu registriertes Konto hat. Die uebrigen Laeufe setzen die ID wie
   ueberall im Pruefstand. */
async function seite(query='', mitHaushalt=true){
  const c = await b.newContext({viewport:{width:402,height:900},deviceScaleFactor:2,locale:'de-DE',timezoneId:'Europe/Berlin'});
  await haltDieUhrAn(c);
  const p = await c.newPage();
  await p.route('https://www.gstatic.com/firebasejs/**',ro=>ro.fulfill({status:200,contentType:'text/javascript',body:readFileSync(join(STUB,ro.request().url().split('/').pop()),'utf8')}));
  await p.route('https://cdnjs.cloudflare.com/**',ro=>ro.fulfill({status:200,contentType:'text/javascript',body:'window.XLSX={utils:{},write:()=>{},read:()=>{}};'}));
  p.on('pageerror',e=>fehler.push('Seitenfehler: '+e.message));
  p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))fehler.push('Konsole: '+m.text());});
  await p.addInitScript((mitHaushalt)=>{try{
      if(mitHaushalt) localStorage.setItem('famboard.haushalt','hh-pruefstand');
      localStorage.removeItem('famboard.ansicht');
    }catch(e){}
    if(navigator.serviceWorker) navigator.serviceWorker.register=()=>Promise.reject(new Error('aus'));}, mitHaushalt);
  await p.goto(`http://127.0.0.1:${s.address().port}/index.html${query}`,{waitUntil:'networkidle'});
  await p.waitForTimeout(800);
  return p;
}
const sichtbar = (p, id)=>p.evaluate(id=>{const el=document.getElementById(id); return !!el && !el.hidden;}, id);
const baum = (p, pfad)=>p.evaluate(pfad=>{
  let k = globalThis.__pruefstand.BAUM;
  for(const t of String(pfad).split('/').filter(Boolean)){ if(k==null||typeof k!=='object') return null; k = k[t]; }
  return k === undefined ? null : k;
}, pfad);

/* --- 1. Wahlschritt: neues Konto ohne Mitgliedschaft, neuer Haushalt --- */
let p = await seite('?neu=1', false);
gut('Wahlschritt erscheint ohne Mitgliedschaft', await sichtbar(p,'wahlschritt'));
gut('Kein Haushalt ungefragt angelegt', (await p.evaluate(()=>Object.keys(globalThis.__pruefstand.BAUM.users||{}).length)) === 0);
gut('Name aus dem Konto vorbefuellt', (await p.evaluate(()=>document.getElementById('wsName').value)) === 'Vladi');
await p.screenshot({path: join(AUS,'wahlschritt-1-wahl.png')});
/* Der Stub-Nutzer bringt einen displayName mit - fuer die Pflichtfeld-Pruefung
   das Feld erst leeren (eine E-Mail-Registrierung hat noch keinen Namen). */
await p.fill('#wsName','');
await p.click('#wsNeu'); await p.waitForTimeout(200);
gut('Ohne Namen haelt der Wahlschritt an', await p.evaluate(()=>document.getElementById('wsName').classList.contains('fehlerhaft')));
await p.fill('#wsName','Vladi');
await p.click('#wsNeu'); await p.waitForTimeout(600);
gut('Wahlschritt zu, Onboarding auf', !(await sichtbar(p,'wahlschritt')) && await sichtbar(p,'onboarding'));
const anzahl = await p.evaluate(()=>document.querySelectorAll('#obPunkte .ob-punkt').length);
console.log('Onboarding-Schritte laut App:', anzahl);
let beispielBild = false;
for(let i=0;i<anzahl;i++){
  if(i===1) await p.fill('#obHaushaltName','Haushalt Kulakow');
  const beispiele = await sichtbar(p,'obBeispieleFeld');
  if(beispiele && !beispielBild){
    beispielBild = true;
    await p.screenshot({path: join(AUS,'onboarding-beispiele.png')});
    await p.check('#obBeispiele');
  }
  await p.click('#obWeiter'); await p.waitForTimeout(260);
}
gut('Beispielrezepte-Schritt kam vor', beispielBild);
gut('Onboarding schliesst', await p.evaluate(()=>document.getElementById('onboarding').hidden));
{
  const users = await p.evaluate(()=>globalThis.__pruefstand.BAUM.users);
  const uid = await p.evaluate(()=>globalThis.__pruefstand.UID);
  const hhIds = Object.keys((users[uid]||{}).haushalte||{});
  gut('Genau ein neuer Haushalt am Konto', hhIds.length === 1 && hhIds[0] !== 'hh-pruefstand', hhIds.join(','));
  const hh = await baum(p, 'haushalte/' + hhIds[0]);
  gut('Merker bei Anlage explizit, danach fertig', hh && hh.data && hh.data.settings && hh.data.settings.onboardingFertig === true);
  gut('members-Eintrag traegt den Namen', hh && hh.members && hh.members[uid] && hh.members[uid].name === 'Vladi' && hh.members[uid].rolle === 'owner');
  gut('Angehaktes Angebot spielt sechs Beispielrezepte ein', hh && hh.data && Array.isArray(hh.data.recipes) && hh.data.recipes.length === 6);
}
await p.context().close();

/* --- 2. Regressionspruefung P2: echter Anlagepfad ohne Haekchen --- */
p = await seite('?neu=1', false);
await p.fill('#wsName','Vladi');
await p.click('#wsNeu'); await p.waitForTimeout(600);
gut('P2: Onboarding erscheint auf dem echten Anlagepfad', await sichtbar(p,'onboarding'));
for(let i=0;i<anzahl;i++){ await p.click('#obWeiter'); await p.waitForTimeout(200); }
{
  const users = await p.evaluate(()=>globalThis.__pruefstand.BAUM.users);
  const uid = await p.evaluate(()=>globalThis.__pruefstand.UID);
  const hhId = Object.keys((users[uid]||{}).haushalte||{})[0];
  const hh = await baum(p, 'haushalte/' + hhId);
  const rezepte = (hh && hh.data && hh.data.recipes) || [];
  gut('Ohne Haekchen bleibt der Haushalt leer', rezepte.length === 0, `(${rezepte.length} Rezepte)`);
}
await p.context().close();

/* --- 3. Beitritt per Einladungscode: sofort drin, Kurz-Onboarding --- */
p = await seite('?neu=1', false);
await p.click('#wsBeitreten'); await p.waitForTimeout(200);
gut('Beitrittsfeld erscheint', await sichtbar(p,'wsBeitrittFeld'));
await p.screenshot({path: join(AUS,'wahlschritt-2-beitreten.png')});
await p.fill('#wsName','Nils');
await p.fill('#wsCode','pruefcode12345678901234');
await p.click('#wsSenden'); await p.waitForTimeout(700);
gut('Code: Wahlschritt zu, Kurz-Onboarding auf', !(await sichtbar(p,'wahlschritt')) && await sichtbar(p,'onboarding'));
const kurzAnzahl = await p.evaluate(()=>document.querySelectorAll('#obPunkte .ob-punkt').length);
gut('Kurz-Onboarding hat drei Schritte', kurzAnzahl === 3, `(${kurzAnzahl})`);
gut('Kurz-Onboarding nennt den Haushalt', (await p.evaluate(()=>document.getElementById('obText').textContent)).includes('Haushalt Krüger'));
await p.screenshot({path: join(AUS,'kurz-onboarding-1.png')});
for(let i=0;i<kurzAnzahl;i++){ await p.click('#obWeiter'); await p.waitForTimeout(200); }
gut('Kurz-Onboarding schliesst', await p.evaluate(()=>document.getElementById('onboarding').hidden));
gut('Eingeloester Code ist geloescht', (await baum(p,'einladungen/pruefcode12345678901234')) === null);
gut('Mitglied mit Namen eingetragen', ((await baum(p,'haushalte/hh-pruefstand/members/pruefstand-uid'))||{}).name === 'Nils');
await p.context().close();

/* --- 4. Beitrittsanfrage per Haushalts-ID: warten, Freigabe, drin --- */
p = await seite('?neu=1', false);
await p.click('#wsBeitreten'); await p.waitForTimeout(200);
await p.fill('#wsName','Rosa');
await p.fill('#wsCode','hh-pruefstand');
await p.click('#wsSenden'); await p.waitForTimeout(600);
gut('ID fuehrt in den Wartezustand, nicht hinein', await sichtbar(p,'wsWarten'));
gut('Anfrage liegt unter beitrittsanfragen', ((await baum(p,'beitrittsanfragen/hh-pruefstand/pruefstand-uid'))||{}).status === 'offen');
gut('Spiegel unter users/anfragen', (await baum(p,'users/pruefstand-uid/anfragen/hh-pruefstand')) !== null);
gut('Noch kein Mitglied', (await baum(p,'haushalte/hh-pruefstand/members/pruefstand-uid')) === null);
await p.screenshot({path: join(AUS,'wahlschritt-3-warten.png')});
/* Jetzt spielt der Lauf die Gegenseite: Ein Eigentuemer nimmt an - derselbe
   Doppelschritt, den beantworteAnfrage ausfuehrt. */
await p.evaluate(()=>{
  const S = globalThis.__pruefstand;
  S.schreib('haushalte/hh-pruefstand/members/' + S.UID, { rolle:'mitglied', beigetreten: Date.now(), name:'Rosa' });
  S.schreib('beitrittsanfragen/hh-pruefstand/' + S.UID + '/status', 'angenommen');
});
await p.waitForTimeout(700);
gut('Nach Freigabe: Wahlschritt zu, Kurz-Onboarding auf', !(await sichtbar(p,'wahlschritt')) && await sichtbar(p,'onboarding'));
gut('Kontozuordnung geschrieben', (await baum(p,'users/pruefstand-uid/haushalte/hh-pruefstand')) === true);
gut('Anfrage und Spiegel aufgeraeumt', (await baum(p,'beitrittsanfragen/hh-pruefstand/pruefstand-uid')) === null
  && (await baum(p,'users/pruefstand-uid/anfragen')) === null);
await p.context().close();

/* --- 4b. Tippfehler in der ID: klare Ansage, kein Geisterhaushalt --- */
p = await seite('?neu=1', false);
await p.click('#wsBeitreten'); await p.waitForTimeout(200);
await p.fill('#wsName','Rosa');
await p.fill('#wsCode','hh-vertippt00000000000');
await p.click('#wsSenden'); await p.waitForTimeout(600);
gut('Tippfehler: bleibt im Beitrittsschritt', await sichtbar(p,'wsBeitrittFeld'));
gut('Tippfehler: verstaendliche Meldung', (await p.evaluate(()=>document.getElementById('wsOut').textContent)).includes('Stimmt die Haushalts-ID'));
gut('Tippfehler: kein Geisterhaushalt entstanden', (await baum(p,'haushalte/hh-vertippt00000000000')) === null);
gut('Tippfehler: keine Anfrage liegen geblieben', (await baum(p,'beitrittsanfragen/hh-vertippt00000000000')) === null
  && (await baum(p,'users/pruefstand-uid/anfragen')) === null);
await p.context().close();

/* --- 5. Ablehnung: zurueck zur Wahl, nichts bleibt liegen --- */
p = await seite('?neu=1', false);
await p.click('#wsBeitreten'); await p.waitForTimeout(200);
await p.fill('#wsName','Rosa');
await p.fill('#wsCode','hh-pruefstand');
await p.click('#wsSenden'); await p.waitForTimeout(600);
await p.evaluate(()=>{
  const S = globalThis.__pruefstand;
  S.schreib('beitrittsanfragen/hh-pruefstand/' + S.UID + '/status', 'abgelehnt');
});
await p.waitForTimeout(700);
gut('Ablehnung fuehrt zurueck zur Wahl', await sichtbar(p,'wsWahl') && await sichtbar(p,'wahlschritt'));
gut('Ablehnung wird gesagt', (await p.evaluate(()=>document.getElementById('wsOut').textContent)).includes('abgelehnt'));
gut('Abgelehnte Anfrage aufgeraeumt', (await baum(p,'beitrittsanfragen/hh-pruefstand/pruefstand-uid')) === null);
await p.context().close();

/* --- 6. Eigentuemer-Karte auf Heute: sehen, annehmen --- */
p = await seite('?anfrage=1');
gut('Eigentuemer sieht die Anfrage-Karte', await sichtbar(p,'beitrittsBand'));
gut('Karte nennt den Namen', (await p.evaluate(()=>document.getElementById('beitrittsBand').textContent)).includes('Mara'));
await p.screenshot({path: join(AUS,'beitritt-karte.png')});
await p.click('#beitrittsBand button[data-antwort="ja"]'); await p.waitForTimeout(500);
gut('Aufnehmen traegt das Mitglied ein', (((await baum(p,'haushalte/hh-pruefstand/members/neue-uid'))||{}).rolle) === 'mitglied');
gut('Anfrage steht auf angenommen', (((await baum(p,'beitrittsanfragen/hh-pruefstand/neue-uid'))||{}).status) === 'angenommen');
gut('Karte verschwindet nach der Antwort', !(await sichtbar(p,'beitrittsBand')));
await p.context().close();

/* --- 7. Ein Mitglied ohne Eigentuemer-Rolle sieht die Karte nicht --- */
const stubDatei = join(STUB, 'firebase-database.js');
const original = readFileSync(stubDatei, 'utf8');
try{
  const gepatcht = original.replace("[UID]:{ rolle:'owner'", "[UID]:{ rolle:'mitglied'");
  if(gepatcht === original){ gut('Rolle im Stub gefunden', false); }
  writeFileSync(stubDatei, gepatcht, 'utf8');
  p = await seite('?anfrage=1');
  gut('Mitglied sieht die Anfrage-Karte nicht', !(await sichtbar(p,'beitrittsBand')));
  await p.context().close();
}finally{
  writeFileSync(stubDatei, original, 'utf8');
}

await b.close();
s.close();
if(fehler.length){
  console.log(`\n${fehler.length} Befund(e):`);
  fehler.forEach(f=>console.log('  - ' + f));
  process.exit(1);
}
console.log('\nKeine Fehler.');

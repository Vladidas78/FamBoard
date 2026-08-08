/* Prueft Onboarding und Schnellanlegen — beides erscheint nur unter
   Bedingungen, die der normale Bilderlauf nicht herstellt. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
const PUBLIC='/tmp/b6/public', STUB='/tmp/b6/pruefstand';
const AUS = process.argv[2] || '/tmp/b6/bilder'; mkdirSync(AUS,{recursive:true});
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon'};
const s=createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=join(PUBLIC,p);
 if(!existsSync(f)){r.writeHead(404);r.end();return;} r.writeHead(200,{'Content-Type':T[extname(f)]||'application/octet-stream'}); r.end(readFileSync(f));});
await new Promise(r=>s.listen(0,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const fehler=[];
async function seite(query='', frisch=true){
  const c=await b.newContext({viewport:{width:402,height:900},deviceScaleFactor:2,locale:'de-DE',timezoneId:'Europe/Berlin'});
  const p=await c.newPage();
  await p.route('https://www.gstatic.com/firebasejs/**',ro=>ro.fulfill({status:200,contentType:'text/javascript',body:readFileSync(join(STUB,ro.request().url().split('/').pop()),'utf8')}));
  await p.route('https://cdnjs.cloudflare.com/**',ro=>ro.fulfill({status:200,contentType:'text/javascript',body:'window.XLSX={utils:{},write:()=>{},read:()=>{}};'}));
  p.on('pageerror',e=>fehler.push('Seitenfehler: '+e.message));
  p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))fehler.push('Konsole: '+m.text());});
  await p.addInitScript((frisch)=>{try{localStorage.setItem('famboard.haushalt','hh-pruefstand'); if(frisch) localStorage.removeItem('famboard.ansicht');}catch(e){}
    if(navigator.serviceWorker) navigator.serviceWorker.register=()=>Promise.reject(new Error('aus'));}, frisch);
  await p.goto(`http://127.0.0.1:${s.address().port}/index.html${query}`,{waitUntil:'networkidle'});
  await p.waitForTimeout(800);
  return p;
}

/* --- Onboarding: fuenf Schritte im leeren Haushalt --- */
let p = await seite('?leer=1');
const offen = await p.evaluate(()=>{const o=document.getElementById('onboarding'); return o && !o.hidden;});
console.log('Onboarding erscheint im leeren Haushalt:', offen ? 'ok' : 'FEHLGESCHLAGEN');
if(!offen) fehler.push('Onboarding erscheint nicht');
for(let i=0;i<5;i++){
  const t = await p.evaluate(()=>document.getElementById('obTitel').textContent);
  await p.screenshot({path: join(AUS, `onboarding-${i+1}.png`)});
  console.log(`  Schritt ${i+1}: ${t}`);
  if(i===1) await p.fill('#obHaushaltName','Haushalt Kulakow');
  await p.click('#obWeiter'); await p.waitForTimeout(260);
}
const zu = await p.evaluate(()=>document.getElementById('onboarding').hidden);
console.log('Nach fuenf Schritten geschlossen:', zu ? 'ok' : 'FEHLGESCHLAGEN');
if(!zu) fehler.push('Onboarding schliesst nicht');
const nochmal = await p.reload({waitUntil:'networkidle'}).then(()=>p.waitForTimeout(900)).then(()=>
  p.evaluate(()=>document.getElementById('onboarding').hidden));
console.log('Nach Neuladen einmalig geblieben:', nochmal ? 'ok' : 'FEHLGESCHLAGEN');
if(!nochmal) fehler.push('Onboarding kommt wieder');
await p.context().close();

/* --- Schnellanlegen --- */
p = await seite();
await p.click('nav .tab[data-tab="essen"]');
await p.click('#essen .unternav .unter[data-unter="recipes"]');
await p.waitForTimeout(200);
await p.click('#openSchnell'); await p.waitForTimeout(300);
await p.screenshot({path: join(AUS,'schnellanlegen.png')});
await p.fill('#schnellName','Ofenkartoffel mit Quark');
await p.fill('#schnellZutaten','4 Kartoffeln\n200 g Quark\n1 Bund Schnittlauch');
await p.click('#schnellSpeichern'); await p.waitForTimeout(400);
const drin = await p.evaluate(()=>[...document.querySelectorAll('#recipeList .recipe-item')].some(e=>e.textContent.includes('Ofenkartoffel')));
console.log('Rezept steht in der Liste:', drin ? 'ok' : 'FEHLGESCHLAGEN');
if(!drin) fehler.push('Schnellanlegen speichert nicht');

/* --- Ansichtszustand: Woche merken, Bereich wechseln, zurueck ---
   Eigene Seite mit frisch=false: Das initScript darf den gemerkten Zustand
   beim Neuladen nicht wegwerfen, sonst prueft der Test sein eigenes Aufraeumen.
   Genau daran ist er beim ersten Lauf gescheitert. */
await p.context().close();
p = await seite('', false);
await p.click('nav .tab[data-tab="essen"]');
await p.click('#essen .unternav .unter[data-unter="plan"]');
await p.waitForTimeout(200);
await p.click('#nextWeek'); await p.click('#nextWeek'); await p.waitForTimeout(250);
const kwVor = await p.evaluate(()=>document.getElementById('kwNum').textContent);
await p.click('nav .tab[data-tab="kalender"]'); await p.waitForTimeout(150);
await p.click('nav .tab[data-tab="essen"]'); await p.waitForTimeout(150);
const gemerkt = await p.evaluate(()=>{ try{ return JSON.parse(localStorage.getItem('famboard.ansicht')); }catch(e){ return null; } });
console.log('Ansichtszustand gesichert:', gemerkt && gemerkt.bereich === 'essen' && gemerkt.unter.essen === 'plan' ? 'ok' : 'FEHLGESCHLAGEN', '(' + kwVor + ')');
if(!(gemerkt && gemerkt.bereich === 'essen')) fehler.push('Ansichtszustand wird nicht gesichert');
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1000);
const nachher = await p.evaluate(()=>({bereich:(document.querySelector('main > section.active')||{}).id, kw:document.getElementById('kwNum').textContent}));
const ok = nachher.bereich === 'essen' && nachher.kw === kwVor;
console.log('Nach Neustart wiederhergestellt:', ok ? 'ok' : 'FEHLGESCHLAGEN', JSON.stringify(nachher));
if(!ok) fehler.push('Ansichtszustand wird nicht wiederhergestellt');

await b.close(); s.close();
console.log(fehler.length ? '\nFEHLER:\n  '+[...new Set(fehler)].join('\n  ') : '\nKeine Fehler.');

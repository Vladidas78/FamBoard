import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
const PUBLIC='/tmp/b6/public', STUB='/tmp/b6/pruefstand';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon'};
const s=createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=join(PUBLIC,p);
 if(!existsSync(f)){r.writeHead(404);r.end();return;} r.writeHead(200,{'Content-Type':T[extname(f)]||'application/octet-stream'}); r.end(readFileSync(f));});
await new Promise(r=>s.listen(0,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const c=await b.newContext({viewport:{width:402,height:900},locale:'de-DE',timezoneId:'Europe/Berlin'});
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

await b.close(); s.close();
console.log(fehler.length ? 'FEHLER:\n  '+[...new Set(fehler)].join('\n  ') : 'Keine Fehler.');

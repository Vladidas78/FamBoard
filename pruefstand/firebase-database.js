/* Prüfstand-Ersatz für firebase-database.js.
   Hält den Datenbestand im Speicher, damit die App mit realistischen Daten
   zeichnet. Schreibzugriffe landen im selben Baum und lösen — wie bei Firebase —
   den Zuhörer erneut aus. Genau dieses Wiedereintreten hat in B2 die
   Betriebsregeln 7 und 8 erzwungen; der Prüfstand bildet es deshalb nach. */

const UID = 'pruefstand-uid';
const HH = 'hh-pruefstand';

/* ---- Wochenschlüssel für die laufende Woche, gleiche Rechnung wie app.js ---- */
function montagVon(d){ const x=new Date(d); const t=(x.getDay()+6)%7; x.setDate(x.getDate()-t); x.setHours(0,0,0,0); return x; }
function isoWoche(d){
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (t.getUTCDay()+6)%7;
  t.setUTCDate(t.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(),0,4));
  const fDayNum = (firstThursday.getUTCDay()+6)%7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fDayNum + 3);
  const week = 1 + Math.round((t - firstThursday)/(7*24*3600*1000));
  return { year: t.getUTCFullYear(), week };
}
const MONTAG = montagVon(new Date());
const W = isoWoche(MONTAG);
const WK = W.year + '-W' + String(W.week).padStart(2,'0');
function iso(d){ const x=new Date(d); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); }
function tagPlus(n){ const x=new Date(MONTAG); x.setDate(x.getDate()+n); return iso(x); }
const HEUTE_ISO = iso(new Date());
const HEUTE_IDX = (new Date().getDay()+6)%7;
const TAGE = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];

/* ---- Rezepte ---- */
const REZEPTE = [
  { id:'r1', name:'Ofengemüse mit Feta', type:'rezept', servings:4, fav:true, kcal:520, prot:22, carbs:28, fat:34, tags:['Ofen','Vegetarisch'],
    steps:'Gemüse würfeln, mit Öl und Gewürzen mischen, 35 Minuten bei 200 °C backen. Feta darüber bröseln.',
    ingredients:[{name:'Zucchini',amount:2,unit:'stk'},{name:'Paprika',amount:2,unit:'stk'},{name:'Kirschtomaten',amount:250,unit:'g'},
                 {name:'Feta',amount:200,unit:'g'},{name:'Olivenöl',amount:3,unit:'el'},{name:'Rosmarin',amount:1,unit:'tl'}] },
  { id:'r2', name:'Spaghetti Bolognese', type:'rezept', servings:4, fav:true, kcal:680, prot:34, carbs:78, fat:24, tags:['Schnell'],
    steps:'Zwiebeln anschwitzen, Hackfleisch anbraten, Tomaten dazu, 30 Minuten köcheln.',
    ingredients:[{name:'Spaghetti',amount:500,unit:'g'},{name:'Rinderhackfleisch',amount:500,unit:'g'},
                 {name:'Passierte Tomaten',amount:700,unit:'g'},{name:'Zwiebeln',amount:2,unit:'stk'},{name:'Knoblauch',amount:2,unit:'stk'}] },
  { id:'r3', name:'Linsensuppe', type:'rezept', servings:4, fav:false, kcal:390, prot:21, carbs:52, fat:8, tags:['Vegetarisch'],
    steps:'Alles in einen Topf, 40 Minuten köcheln lassen.',
    ingredients:[{name:'Rote Linsen',amount:300,unit:'g'},{name:'Karotten',amount:3,unit:'stk'},
                 {name:'Sellerie',amount:1,unit:'stk'},{name:'Gemüsebrühe',amount:1,unit:'l'}] },
  { id:'r4', name:'Hähnchenbrustsandwich', type:'snack', servings:2, fav:false, kcal:560, prot:42, carbs:46, fat:22, tags:['Schnell','Snack'],
    steps:'',
    ingredients:[{name:'Hähnchenbrustfilet',amount:2,unit:'stk'},{name:'Sauerteigbrot',amount:4,unit:'stk'},
                 {name:'Mayonnaise',amount:2,unit:'el'},{name:'Salat',amount:1,unit:'stk'}] },
  { id:'r5', name:'Kaiserschmarrn', type:'rezept', servings:4, fav:false, kcal:610, prot:17, carbs:72, fat:27, tags:['Süß'],
    steps:'Teig anrühren, in der Pfanne stocken lassen, zerreißen, mit Puderzucker bestäuben.',
    ingredients:[{name:'Mehl',amount:250,unit:'g'},{name:'Milch',amount:400,unit:'ml'},{name:'Eier',amount:4,unit:'stk'},
                 {name:'Butter',amount:50,unit:'g'},{name:'Puderzucker',amount:2,unit:'el'}] },
  { id:'r6', name:'Griechischer Salat', type:'rezept', servings:2, fav:false, kcal:340, prot:12, carbs:14, fat:26, tags:['Schnell','Vegetarisch'],
    steps:'Alles würfeln, mit Öl und Oregano anmachen.',
    ingredients:[{name:'Tomaten',amount:4,unit:'stk'},{name:'Gurke',amount:1,unit:'stk'},{name:'Feta',amount:150,unit:'g'},
                 {name:'Oliven',amount:100,unit:'g'},{name:'Rote Zwiebel',amount:1,unit:'stk'}] },
  { id:'r7', name:'Porridge mit Beeren', type:'rezept', servings:2, fav:false, kcal:320, prot:14, carbs:45, fat:9, tags:['Schnell'],
    steps:'Haferflocken mit Milch aufkochen, Beeren darauf.',
    ingredients:[{name:'Haferflocken',amount:100,unit:'g'},{name:'Milch',amount:400,unit:'ml'},{name:'Heidelbeeren',amount:150,unit:'g'}] },
  { id:'r8', name:'Pizza Margherita', type:'rezept', servings:4, fav:true, kcal:720, prot:28, carbs:88, fat:28, tags:['Ofen'],
    steps:'Teig ausrollen, belegen, 12 Minuten bei 250 °C.',
    ingredients:[{name:'Pizzateig',amount:2,unit:'stk'},{name:'Mozzarella',amount:250,unit:'g'},
                 {name:'Passierte Tomaten',amount:200,unit:'g'},{name:'Basilikum',amount:1,unit:'stk'}] },
];

/* ---- Wochenplan: laufende Woche, gemischt aus Rezept, Reste und auswärts ---- */
const PLAN = {};
PLAN[TAGE[0]] = { abend:{kind:'recipe', id:'r2', servings:4}, snack:{kind:'recipe', id:'r4', servings:2} };
PLAN[TAGE[1]] = { abend:{kind:'recipe', id:'r1', servings:4} };
PLAN[TAGE[2]] = { abend:{kind:'leftover', from:TAGE[1], fromSlot:'abend'} };
PLAN[TAGE[3]] = { abend:{kind:'recipe', id:'r3', servings:4}, snack:{kind:'recipe', id:'r4', servings:2} };
PLAN[TAGE[4]] = { abend:{kind:'recipe', id:'r8', servings:4} };
PLAN[TAGE[5]] = { abend:{kind:'out', text:'Bei Oma'} };
PLAN[TAGE[6]] = { abend:{kind:'recipe', id:'r6', servings:2} };

/* ---- Personen (B4) ---- */
const PERSONEN = {
  p1:{ name:'Vladi',  farbe:'#8A6520', angelegt:1785000000000, uid:UID, geburtstag:'1991-03-14' },
  p2:{ name:'Anna',   farbe:'#4E7A52', angelegt:1785000000000, geburtstag:'1992-11-02' },
  p3:{ name:'Mika',   farbe:'#A8442A', angelegt:1785000000000, geburtstag:'2019-06-21' },
  p4:{ name:'Jonas',  farbe:'#3D6A8A', angelegt:1785000000000 },
};

/* ---- Notizen (B3) ---- */
const NOTIZEN = {
  n1:{ name:'Haushalt', angelegt:1785100000000, eintraege:{
        e1:{ text:'Waschmaschine entkalken', angelegt:1785100000001, faellig:HEUTE_ISO, wer:'p1' },
        e2:{ text:'Fenster putzen', angelegt:1785100000002 },
        e3:{ text:'Altpapier rausbringen', angelegt:1785100000003, erledigt:1786000000000 } } },
  n2:{ name:'Besorgungen', angelegt:1785200000000, eintraege:{
        e4:{ text:'Paket abholen', angelegt:1785200000001, faellig:tagPlus(HEUTE_IDX-1), wer:'p2' },
        e5:{ text:'Geschenk für Mika', angelegt:1785200000002, faellig:tagPlus(HEUTE_IDX+3) } } },
  n3:{ name:'Urlaub', angelegt:1785300000000, eintraege:{
        e6:{ text:'Reisepässe prüfen', angelegt:1785300000001 } } },
};

/* ---- Kalender (B5) ---- */
const TERMINE = {
  t1:{ titel:'Zahnarzt Mika', datum:HEUTE_ISO, zeit:'09:30', bis:'10:15', wer:['p3'], ort:'Praxis Dr. Bauer',
       uid:'t1@butley', sequence:0, herkunft:'butley', angelegt:1786000000001 },
  t2:{ titel:'Elternabend', datum:HEUTE_ISO, zeit:'19:00', bis:'20:30', wer:['p1','p2'], ort:'Grundschule',
       uid:'t2@butley', sequence:0, herkunft:'butley', angelegt:1786000000002 },
  /* Absichtlich lang: prueft, ob Titel umbrechen statt an den Rand zu laufen */
  t6:{ titel:'Ausflug ins Playmobil-Funpark Land mit Übernachtung', datum:HEUTE_ISO, zeit:'08:00',
       bis:'18:00', wer:['p2','p3','p4'], ort:'Zirndorf bei Nürnberg',
       uid:'t6@butley', sequence:0, herkunft:'butley', angelegt:1786000000006 },
  /* Bis zum 09.08. stand hier `FREQ=WEEKLY;BYDAY=<Tag>`. Diese Zeichenkette
     kommt in keiner der vier Abfragen von `terminAmTag` vor - die Serie
     erschien nur an ihrem Starttag, und `wdhLabel` zeigte die Rohzeichenkette
     sichtbar in der Terminzeile. Ueber Serien konnte der Pruefstand damit
     nichts sagen, ausgerechnet bei O-25. Testdaten duerfen nur Werte
     enthalten, die die App selbst erzeugt - `WIEDERHOLUNGEN` in app.js ist die
     Liste dieser Werte. */
  t3:{ titel:'Müllabfuhr', datum:tagPlus(HEUTE_IDX+1), ganztag:true, wer:'haushalt',
       rrule:'FREQ=WEEKLY',
       /* O-25 - eine Woche faellt aus. Der Ersatztermin steht als t7 daneben. */
       exdate:[tagPlus(HEUTE_IDX+8)],
       uid:'t3@butley', sequence:1, herkunft:'butley', angelegt:1786000000003 },
  /* Die herausgeloeste Ausgabe: dieselbe uid wie die Reihe, `recurrenceId` auf
     dem Tag, den sie ersetzt, eigenes Datum einen Tag spaeter. */
  t7:{ titel:'Müllabfuhr', datum:tagPlus(HEUTE_IDX+9), ganztag:true, wer:'haushalt',
       uid:'t3@butley', recurrenceId:tagPlus(HEUTE_IDX+8),
       sequence:0, herkunft:'butley', angelegt:1786000000007 },
  t4:{ titel:'Sport', datum:tagPlus(HEUTE_IDX+2), zeit:'18:00', bis:'19:30', wer:['p1'],
       uid:'t4@butley', sequence:0, herkunft:'butley', angelegt:1786000000004 },
  t5:{ titel:'Geburtstag Jonas', datum:tagPlus(HEUTE_IDX+4), ganztag:true, wer:'haushalt',
       uid:'t5@butley', sequence:0, herkunft:'butley', angelegt:1786000000005 },
  /* O-27 - eine Regel, die die App nicht kennt. Das ist die eine erlaubte
     Ausnahme von Betriebsregel 15: Der Wert steht hier nicht aus Versehen,
     sondern weil genau dieser Fall geprueft werden soll. Es ist derselbe
     String, der bis zum 09.08. unbeabsichtigt in den Testdaten stand und
     sichtbar in der Terminzeile landete. Er gehoert an einen eigenen Termin -
     stuende er an t3, koennte der Serienlauf ueber O-25 nichts mehr sagen. */
  t9:{ titel:'Sperrmüll', datum:tagPlus(HEUTE_IDX+3), ganztag:true, wer:['p2'],
       rrule:'FREQ=WEEKLY;BYDAY=MO',
       uid:'t9@butley', sequence:0, herkunft:'butley', angelegt:1786000000009 },
};

/* ---- Artikelstamm und Einkaufsliste (B2) ---- */
const CUSTOM = [
  {name:'Katzenfutter'}, {name:'Mineralwasser'}, {name:'Spülmaschinentabs'}, {name:'Toilettenpapier'},
  {name:'Kaffeebohnen'}, {name:'Orangensaft'}, {name:'Zahnpasta'}, {name:'Müllbeutel'},
  {name:'Butter'}, {name:'Joghurt'}, {name:'Bananen'}, {name:'Waschmittel'},
];
const EXTRAS = [
  {id:'x1', name:'Katzenfutter',    from:'katzenfutter',    recurring:true },
  {id:'x2', name:'Mineralwasser',   from:'mineralwasser',   recurring:true },
  {id:'x3', name:'Spülmaschinentabs', from:'spulmaschinentabs' },
  {id:'x4', name:'Bananen',         from:'bananen' },
];

const DATEN = {
  settings:{
    personen:4,
    slots:{ fruehstueck:{on:false,personen:4}, mittag:{on:false,personen:4},
            abend:{on:true,personen:4}, snack:{on:true,personen:1} },
    artikelMigriert:true,
    icsToken:'pruefstandtoken1234',
    catOrder:['obst','fleisch','kuehl','trocken','gewuerze','konserven','tk','getraenke','haushalt','sonstiges'],
  },
  recipes: REZEPTE,
  weeks:{ [WK]:{ plan:PLAN, checked:{ bananen:true }, removed:{}, qty:{}, nutriPortions:{} } },
  excluded:['olivenol','salz'],
  extras: EXTRAS,
  customIngredients: CUSTOM,
  catOverrides:{ katzenfutter:'haushalt', spulmaschinentabs:'haushalt', toilettenpapier:'haushalt',
                 zahnpasta:'haushalt', mullbeutel:'haushalt', waschmittel:'haushalt',
                 mineralwasser:'getraenke', orangensaft:'getraenke', kaffeebohnen:'trocken' },
  marketOverrides:{ katzenfutter:'Fressnapf', mineralwasser:'Getränke Rot', zahnpasta:'dm' },
  notizen: NOTIZEN,
  personen: PERSONEN,
  kalender:{ gemeinsam: TERMINE },
};

/* Mit ?leer=1 startet der Pruefstand einen frisch angelegten Haushalt -
   nur so laesst sich das Onboarding ueberhaupt sehen. */
const LEER = typeof location !== 'undefined' && /[?&]leer=1/.test(location.search);

/* ---- Der Baum ---- */
const BAUM = {
  users:{ [UID]:{ haushalte:{ [HH]:true } } },
  haushalte:{ [HH]:{
    meta:{ name:'Haushalt Krüger', owner:UID, erstellt:1785000000000 },
    members:{ [UID]:{ rolle:'owner', beigetreten:1785000000000 },
              'zweite-uid':{ rolle:'mitglied', beigetreten:1785500000000 } },
    data: LEER ? { settings:{ personen:4, slots:DATEN.settings.slots } } : DATEN,
    images:{},
  } },
  einladungen:{},
  ics:{},
};

/* Firebase behaelt seinen Bestand ueber ein Neuladen hinweg; ein Modul im
   Speicher tut das nicht. Ohne diese Bruecke waere jeder Neustart ein neuer
   Haushalt - und "das Onboarding kommt nur einmal" nicht pruefbar. */
try{
  const gemerkt = sessionStorage.getItem('pruefstand.baum');
  if(gemerkt) Object.assign(BAUM, JSON.parse(gemerkt));
}catch(e){}
function sichern(){ try{ sessionStorage.setItem('pruefstand.baum', JSON.stringify(BAUM)); }catch(e){} }

/* ---- API ---- */
function teile(p){ return String(p).split('/').filter(Boolean); }
function lies(pfad){
  if(pfad === '.info/connected') return true;
  let k = BAUM;
  for(const t of teile(pfad)){ if(k == null || typeof k !== 'object') return null; k = k[t]; }
  return k === undefined ? null : k;
}
function schreib(pfad, wert){
  setTimeout(sichern, 0);
  const t = teile(pfad);
  let k = BAUM;
  for(let i=0;i<t.length-1;i++){ if(typeof k[t[i]] !== 'object' || k[t[i]] === null) k[t[i]] = {}; k = k[t[i]]; }
  if(wert === null || wert === undefined) delete k[t[t.length-1]];
  else k[t[t.length-1]] = wert;
}

const ZUHOERER = [];   // { pfad, cb }

export function getDatabase(){ return { _pruefstand:true }; }
export function ref(db, pfad){ return { _pfad: pfad }; }

function schnappschuss(pfad){
  const v = lies(pfad);
  return { val: ()=>v, exists: ()=>v !== null && v !== undefined, key: teile(pfad).pop() || null };
}

export function get(r){ return Promise.resolve(schnappschuss(r._pfad)); }

export function set(r, wert){
  schreib(r._pfad, wert);
  melde(r._pfad);
  return Promise.resolve();
}
export function remove(r){
  schreib(r._pfad, null);
  melde(r._pfad);
  return Promise.resolve();
}

/* Firebase meldet jede Änderung an jeden Zuhörer, dessen Pfad die geänderte
   Stelle enthält. Genau das lässt Rückrufe wiedereintreten (Betriebsregel 7). */
function melde(pfad){
  ZUHOERER.forEach(z=>{
    if(pfad === z.pfad || pfad.indexOf(z.pfad + '/') === 0){
      Promise.resolve().then(()=>z.cb(schnappschuss(z.pfad)));
    }
  });
}

export function onValue(r, cb){
  const z = { pfad: r._pfad, cb };
  ZUHOERER.push(z);
  Promise.resolve().then(()=>cb(schnappschuss(z.pfad)));
  return ()=>{ const i = ZUHOERER.indexOf(z); if(i>=0) ZUHOERER.splice(i,1); };
}

/* Für den Prüfstand von außen einsehbar */
globalThis.__pruefstand = { BAUM, WK, HH, UID, HEUTE_ISO };

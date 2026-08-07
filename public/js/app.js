/* Butley — Anwendungslogik, ausgelagert aus index.html am 06.08.2026 (T-1/T-2) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithRedirect, getRedirectResult,
  updateProfile, updateEmail, updatePassword, linkWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import { getDatabase, ref, set, remove, get, onValue } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-database.js";

const DAYS = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];

/* =========================================================================
   1. Firebase: Konten, Haushalte, Datenbank
   Daten liegen unter haushalte/<id>/data · Bilder unter haushalte/<id>/images
   Mitgliedschaft: haushalte/<id>/members/<uid> · Konto-Zuordnung: users/<uid>/haushalte
   ========================================================================= */
/* Haushalt aus der Zeit vor dem Login (z. B. "hh-qsq6wowzlugqdn6r"): wird automatisch
   übernommen, wenn dieses Gerät die ID schon in localStorage hat, oder beim Registrieren
   manuell im Feld "Bestehende Haushalts-ID übernehmen" eingetragen wird — siehe unten. */
const HH_KEY = "famboard.haushalt";           // zuletzt aktiver Haushalt auf diesem Gerät
const INVITE_RE = /[#&]invite=([A-Za-z0-9_-]{10,})/;
const LEGACY_LINK_RE = /[#&]h=([A-Za-z0-9_-]{8,})/;

/* Einladungscode bzw. alten #h=-Link aus der Adresse abgreifen, bevor wir sie entfernen */
let pendingInvite = null;
{
  const mInvite = location.hash.match(INVITE_RE);
  const mLegacy = location.hash.match(LEGACY_LINK_RE);
  if(mInvite) pendingInvite = mInvite[1];
  else if(mLegacy){ try{ localStorage.setItem(HH_KEY, mLegacy[1]); }catch(e){} }
  if(mInvite || mLegacy) history.replaceState(null, '', location.pathname + location.search);
}

let HAUSHALT_ID = null;   // erst bekannt, sobald Login + Haushalt aufgelöst sind
let BASE = null;
let CACHE_KEY = null;

const firebaseConfig = {
  apiKey: "AIzaSyAd8gUlEEbA4HU4RXUuEqLwoDDUEKFwTZ4",
  authDomain: "famplan-e8e4c.firebaseapp.com",
  databaseURL: "https://famplan-e8e4c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "famplan-e8e4c",
  storageBucket: "famplan-e8e4c.firebasestorage.app",
  messagingSenderId: "537038536809",
  appId: "1:537038536809:web:411d6d6e26f549ec2722f8"
};
const fbApp = initializeApp(firebaseConfig);
const auth  = getAuth(fbApp);
const db    = getDatabase(fbApp);

/* Firebase-Schlüssel vertragen kein . # $ [ ] / — deshalb kodieren */
function encKey(k){ return encodeURIComponent(String(k)).replace(/\./g,'%2E'); }
function decKey(k){ try{ return decodeURIComponent(k); }catch(e){ return k; } }

let istOnline = false;
let aktivesHaushaltName = '';
function zeigeFehler(text){
  const el = document.getElementById('fehler');
  if(!el) return;
  el.textContent = text;
  el.style.display = 'block';
}
function verbergeFehler(){
  const el = document.getElementById('fehler');
  if(el) el.style.display = 'none';
}
function setOnline(v){
  istOnline = v;
  const n = document.getElementById('netnote');
  if(n){
    n.style.display = v ? 'none' : 'block';
    n.textContent = 'Offline — Änderungen werden nachgereicht, sobald ihr wieder Netz habt';
  }
  const el = document.getElementById('storageNote');
  if(el) el.textContent = (v ? 'Verbunden' : 'Offline') + (aktivesHaushaltName ? ' · ' + aktivesHaushaltName : '');
}

/* =========================================================================
   1b. Login-Gate: Registrieren/Anmelden (E-Mail oder Google), danach
   Haushalt auflösen — übernehmen, per Einladung beitreten oder neu anlegen
   ========================================================================= */
let authMode = 'login'; // 'login' | 'register'

function randId(prefix, len){
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for(let i=0;i<len;i++) s += alphabet[Math.floor(Math.random()*alphabet.length)];
  return prefix + s;
}

/* ---------- Fehlerzustand an einzelnen Eingabefeldern ----------
   Der Zustand ist im Stylesheet als .fehlerhaft bzw. [aria-invalid] definiert.
   Die Meldung landet in einem <p class="feld-fehler"> direkt unter dem Feld,
   ausser es gibt bereits einen eigenen Platz mit data-fehler-fuer="<id>" —
   noetig dort, wo das Feld in einem Raster sitzt und ein Geschwisterelement
   die Spalten durcheinanderbraechte. */
function feldFehlerStelle(el){
  const eigen = el.id && document.querySelector('[data-fehler-fuer="'+el.id+'"]');
  if(eigen) return eigen;
  const nachbar = el.nextElementSibling;
  if(nachbar && nachbar.classList && nachbar.classList.contains('feld-fehler')) return nachbar;
  const p = document.createElement('p');
  p.className = 'feld-fehler';
  p.hidden = true;
  el.parentNode.insertBefore(p, el.nextSibling);
  return p;
}
function feldFehler(el, text){
  if(!el) return;
  el.classList.add('fehlerhaft');
  el.setAttribute('aria-invalid','true');
  if(text){
    const p = feldFehlerStelle(el);
    if(!p.id) p.id = 'fehler-' + (el.id || Math.random().toString(36).slice(2,7));
    p.textContent = text;
    p.hidden = false;
    el.setAttribute('aria-describedby', p.id);
  }
  try{ el.focus(); }catch(_){}
}
function feldFehlerWeg(el){
  if(!el || !el.classList.contains('fehlerhaft')) return;
  el.classList.remove('fehlerhaft');
  el.removeAttribute('aria-invalid');
  el.removeAttribute('aria-describedby');
  const eigen = el.id && document.querySelector('[data-fehler-fuer="'+el.id+'"]');
  const nachbar = el.nextElementSibling;
  const p = eigen || (nachbar && nachbar.classList && nachbar.classList.contains('feld-fehler') ? nachbar : null);
  if(p){ p.textContent=''; p.hidden = true; }
}
/* Sobald der Nutzer das Feld anfasst, ist die Meldung erledigt. Ein einziger
   Zuhoerer statt einer Anmeldung je Feld. */
document.addEventListener('input', e=>{
  if(e.target && e.target.classList && e.target.classList.contains('fehlerhaft')) feldFehlerWeg(e.target);
}, true);

function authHideMessages(){
  document.getElementById('authError').style.display = 'none';
  document.getElementById('authInfo').style.display = 'none';
}
function authShowError(text){
  const e = document.getElementById('authError');
  e.textContent = text; e.style.display = 'block';
  document.getElementById('authInfo').style.display = 'none';
}
function authShowInfo(text){
  const i = document.getElementById('authInfo');
  i.textContent = text; i.style.display = 'block';
  document.getElementById('authError').style.display = 'none';
}
function authSetMode(mode){
  authMode = mode;
  document.getElementById('authTabLogin').classList.toggle('active', mode==='login');
  document.getElementById('authTabRegister').classList.toggle('active', mode==='register');
  document.getElementById('authClaimField').style.display = mode==='register' ? 'block' : 'none';
  document.getElementById('authNameField').style.display = mode==='register' ? 'block' : 'none';
  document.getElementById('authSubmit').textContent = mode==='register' ? 'Konto erstellen' : 'Anmelden';
  document.getElementById('authPassword').setAttribute('autocomplete', mode==='register' ? 'new-password' : 'current-password');
  authHideMessages();
}
document.getElementById('authTabLogin').addEventListener('click', ()=>authSetMode('login'));
document.getElementById('authTabRegister').addEventListener('click', ()=>authSetMode('register'));
if(pendingInvite){
  authSetMode('register');
  authShowInfo('Ihr folgt einem Einladungslink — meldet euch an oder erstellt ein Konto, um dem Haushalt beizutreten.');
}

const AUTH_ERR_DE = {
  'auth/invalid-email': 'Ungültige E-Mail-Adresse.',
  'auth/missing-password': 'Bitte ein Passwort eingeben.',
  'auth/weak-password': 'Das Passwort muss mindestens 6 Zeichen haben.',
  'auth/email-already-in-use': 'Für diese E-Mail gibt es schon ein Konto — oben auf „Anmelden“ wechseln.',
  'auth/invalid-credential': 'E-Mail oder Passwort stimmt nicht.',
  'auth/wrong-password': 'E-Mail oder Passwort stimmt nicht.',
  'auth/user-not-found': 'Kein Konto mit dieser E-Mail gefunden.',
  'auth/too-many-requests': 'Zu viele Versuche — kurz warten und nochmal probieren.',
  'auth/network-request-failed': 'Keine Verbindung. Netz prüfen und nochmal versuchen.',
  'auth/popup-closed-by-user': 'Anmeldung abgebrochen.',
  'auth/operation-not-allowed': 'Diese Anmeldeart ist in Firebase noch nicht aktiviert.'
};
function authErrText(err){
  return AUTH_ERR_DE[err.code] || ('Anmeldung fehlgeschlagen (' + (err.code || err.message) + ').');
}

document.getElementById('authSubmit').addEventListener('click', async ()=>{
  authHideMessages();
  const email = document.getElementById('authEmail').value.trim();
  const pw = document.getElementById('authPassword').value;
  if(!email || !pw){ authShowError('Bitte E-Mail und Passwort eingeben.'); return; }
  document.getElementById('authBox').classList.add('auth-busy');
  try{
    if(authMode === 'register'){
      await createUserWithEmailAndPassword(auth, email, pw);
    } else {
      await signInWithEmailAndPassword(auth, email, pw);
    }
    // onAuthStateChanged übernimmt ab hier die Haushalts-Auflösung
  }catch(err){
    authShowError(authErrText(err));
  }finally{
    document.getElementById('authBox').classList.remove('auth-busy');
  }
});

document.getElementById('authForgot').addEventListener('click', async ()=>{
  authHideMessages();
  const email = document.getElementById('authEmail').value.trim();
  if(!email){ authShowError('E-Mail-Adresse oben eintragen, dann nochmal klicken.'); return; }
  try{
    await sendPasswordResetEmail(auth, email);
    authShowInfo('Link zum Passwort-Zurücksetzen ist unterwegs — E-Mail-Postfach prüfen.');
  }catch(err){
    authShowError(authErrText(err));
  }
});

document.getElementById('authGoogle').addEventListener('click', async ()=>{
  authHideMessages();
  // Bei Google navigiert die Seite komplett weg und wieder zurück — Eingaben aus dem
  // Formular (Alt-ID, Haushaltsname) zwischenspeichern, damit sie danach nicht weg sind
  try{
    if(authMode === 'register'){
      sessionStorage.setItem('famboard.pendingClaim', document.getElementById('authClaimId').value.trim());
      sessionStorage.setItem('famboard.pendingName', document.getElementById('authHaushaltName').value.trim());
    }
  }catch(e){}
  try{
    await signInWithRedirect(auth, new GoogleAuthProvider());
    // Seite lädt danach neu; getRedirectResult/onAuthStateChanged übernehmen den Rest
  }catch(err){
    authShowError(authErrText(err));
  }
});

document.getElementById('acctSignOut').addEventListener('click', async ()=>{
  if(!confirm('Auf diesem Gerät abmelden?')) return;
  try{ await signOut(auth); location.reload(); }catch(e){}
});

/* ---------- Haushalt nach Login auflösen ---------- */
async function ladeMitgliedschaften(uid){
  const snap = await get(ref(db, 'users/' + uid + '/haushalte'));
  return snap.exists() ? Object.keys(snap.val()) : [];
}

/* Klappt laut database.rules.json nur, wenn der Haushalt noch kein einziges Mitglied hat
   (frisch angelegt oder ein verwaister Alt-Haushalt aus der Zeit vor dem Login) */
async function versucheClaim(hhId, uid){
  try{
    await set(ref(db, 'haushalte/' + hhId + '/members/' + uid), { rolle:'owner', beigetreten: Date.now() });
    await set(ref(db, 'haushalte/' + hhId + '/meta'), { name:'Mein Haushalt', owner:uid, erstellt: Date.now() });
    await set(ref(db, 'users/' + uid + '/haushalte/' + hhId), true);
    return true;
  }catch(e){ return false; }
}

async function tritteUeberEinladungBei(code, uid){
  const snap = await get(ref(db, 'einladungen/' + code));
  if(!snap.exists()) throw { message: 'Einladungslink ist ungültig oder schon abgelaufen.' };
  const hhId = snap.val().haushalt;
  await set(ref(db, 'haushalte/' + hhId + '/members/' + uid), { rolle:'mitglied', beigetreten: Date.now(), viaCode: code });
  await set(ref(db, 'users/' + uid + '/haushalte/' + hhId), true);
  return hhId;
}

async function erzeugeNeuenHaushalt(uid, name){
  const hhId = randId('hh-', 20);
  await set(ref(db, 'haushalte/' + hhId + '/members/' + uid), { rolle:'owner', beigetreten: Date.now() });
  await set(ref(db, 'haushalte/' + hhId + '/meta'), { name: name || 'Mein Haushalt', owner:uid, erstellt: Date.now() });
  await set(ref(db, 'users/' + uid + '/haushalte/' + hhId), true);
  return hhId;
}

async function loadHaushaltMeta(hhId){
  try{
    const snap = await get(ref(db, 'haushalte/' + hhId + '/meta/name'));
    return snap.exists() ? snap.val() : '';
  }catch(e){ return ''; }
}

let meineRolle = null;
async function aktiviereHaushalt(hhId){
  HAUSHALT_ID = hhId;
  BASE = 'haushalte/' + hhId;
  CACHE_KEY = 'famboard.cache.' + hhId;
  try{ localStorage.setItem(HH_KEY, hhId); }catch(e){}
  aktivesHaushaltName = (await loadHaushaltMeta(hhId)) || hhId;
  try{
    const snap = await get(ref(db, 'haushalte/' + hhId + '/members/' + auth.currentUser.uid + '/rolle'));
    meineRolle = snap.exists() ? snap.val() : null;
  }catch(e){ meineRolle = null; }
  setOnline(istOnline);
  renderMemberList();
  renderSettingsTab();
}

function renderHhSwitch(ids){
  const card = document.getElementById('hhSwitchCard');
  const list = document.getElementById('hhSwitchList');
  if(!ids || ids.length < 2){ card.style.display = 'none'; list.innerHTML = ''; return; }
  card.style.display = 'block';
  Promise.all(ids.map(id=>loadHaushaltMeta(id).then(name=>({id, name: name || id})))).then(items=>{
    list.innerHTML = items.map(it=>
      '<button type="button" class="' + (it.id === HAUSHALT_ID ? 'active' : '') + '" data-hh="' + it.id + '">' + it.name + '</button>'
    ).join('');
    Array.prototype.forEach.call(list.querySelectorAll('button'), b=>b.addEventListener('click', async ()=>{
      if(b.dataset.hh === HAUSHALT_ID) return;
      await aktiviereHaushalt(b.dataset.hh);
      renderHhSwitch(ids);
      loadState();
    }));
  });
}

async function loesePfadNachLogin(user){
  const acctEl = document.getElementById('acctEmail');
  if(acctEl) acctEl.textContent = user.email || 'Konto ' + user.uid.slice(0,6);

  let mitgliedschaften = await ladeMitgliedschaften(user.uid);

  // 1) Einladungscode aus dem Link hat Vorrang
  if(pendingInvite){
    const code = pendingInvite;
    pendingInvite = null;
    try{
      const hhId = await tritteUeberEinladungBei(code, user.uid);
      mitgliedschaften = await ladeMitgliedschaften(user.uid);
      await aktiviereHaushalt(hhId);
      renderHhSwitch(mitgliedschaften);
      return;
    }catch(err){
      zeigeFehler(err.message || 'Einladung konnte nicht eingelöst werden.');
      // fällt durch zu den übrigen Fällen, Konto ist ja schon angelegt
    }
  }

  // 2) Schon Mitglied irgendwo? Auf diesem Gerät zuletzt aktiven Haushalt bevorzugen
  if(mitgliedschaften.length){
    let vorschlag = null;
    try{ vorschlag = localStorage.getItem(HH_KEY); }catch(e){}
    const hhId = (vorschlag && mitgliedschaften.indexOf(vorschlag) !== -1) ? vorschlag : mitgliedschaften[0];
    await aktiviereHaushalt(hhId);
    renderHhSwitch(mitgliedschaften);
    return;
  }

  // 3) Manuell eingetragene Alt-ID beim Registrieren — für den Umstieg von der alten,
  //    linkbasierten Version auf echte Konten (siehe ANLEITUNG.md). Bei Google-Anmeldung
  //    kommt der Wert aus sessionStorage, weil die Seite für den Redirect neu lädt.
  const claimFeld = document.getElementById('authClaimId');
  let manuelleId = claimFeld ? claimFeld.value.trim() : '';
  let gespeicherterName = '';
  try{
    if(!manuelleId) manuelleId = sessionStorage.getItem('famboard.pendingClaim') || '';
    gespeicherterName = sessionStorage.getItem('famboard.pendingName') || '';
    sessionStorage.removeItem('famboard.pendingClaim');
    sessionStorage.removeItem('famboard.pendingName');
  }catch(e){}
  if(manuelleId){
    if(await versucheClaim(manuelleId, user.uid)){
      await aktiviereHaushalt(manuelleId);
      renderHhSwitch([manuelleId]);
      return;
    }
    zeigeFehler('Die Haushalts-ID „' + manuelleId + '“ gehört schon zu einem Konto. Bittet stattdessen um einen Einladungslink.');
  }

  // 4) Kandidat aus dem localStorage dieses Geräts (z. B. alter #h=-Link)
  let legacyKandidat = null;
  try{ legacyKandidat = localStorage.getItem(HH_KEY); }catch(e){}
  if(legacyKandidat && await versucheClaim(legacyKandidat, user.uid)){
    await aktiviereHaushalt(legacyKandidat);
    renderHhSwitch([legacyKandidat]);
    return;
  }

  // 5) Sonst: neuen, leeren Haushalt anlegen
  const nameFeld = document.getElementById('authHaushaltName');
  const name = (nameFeld && nameFeld.value.trim()) || gespeicherterName;
  const neuerId = await erzeugeNeuenHaushalt(user.uid, name);
  await aktiviereHaushalt(neuerId);
  renderHhSwitch([neuerId]);
}

let appGestartet = false;
onAuthStateChanged(auth, async (user)=>{
  if(!user){
    document.body.classList.add('pre-auth');
    return;
  }
  try{
    await loesePfadNachLogin(user);
    document.body.classList.remove('pre-auth');
    if(!appGestartet){ appGestartet = true; loadState(); }
  }catch(err){
    authShowError('Haushalt konnte nicht geladen werden (' + (err.code || err.message) + ').');
  }
});
getRedirectResult(auth).catch(err=>{ if(err && err.code) authShowError(authErrText(err)); });

/* =========================================================================
   2. Zustand
   ========================================================================= */
const APP_VERSION = 4;

const SEED_RECIPES = [
  {id:"r1", name:"Hähnchen mit Reis & Brokkoli", servings:4,
    ingredients:[{name:"Hähnchenbrust",amount:400,unit:"g"},{name:"Reis",amount:200,unit:"g"},{name:"Brokkoli",amount:300,unit:"g"},{name:"Sojasauce",amount:2,unit:"EL"}],
    description:"Reis kochen. Hähnchen würfeln und anbraten. Brokkoli dämpfen, alles mit Sojasauce vermengen.",
    kcal:520, prot:38, carbs:52, fat:14},
  {id:"r2", name:"Spaghetti Bolognese", servings:4,
    ingredients:[{name:"Spaghetti",amount:250,unit:"g"},{name:"Hackfleisch",amount:300,unit:"g"},{name:"passierte Tomaten",amount:400,unit:"g"},{name:"Zwiebel",amount:1,unit:"Stk"}],
    description:"Zwiebel und Hack anbraten, Tomaten dazu, 20 Min köcheln. Spaghetti kochen und servieren.",
    kcal:610, prot:30, carbs:70, fat:18},
  {id:"r3", name:"Kartoffelgratin mit Gemüse", servings:4,
    ingredients:[{name:"Kartoffeln",amount:600,unit:"g"},{name:"Sahne",amount:200,unit:"ml"},{name:"Karotten",amount:200,unit:"g"},{name:"Gouda",amount:100,unit:"g"}],
    description:"Kartoffeln und Karotten in Scheiben schichten, mit Sahne übergießen, Käse drüber, 40 Min backen.",
    kcal:480, prot:14, carbs:55, fat:20},
  {id:"r4", name:"Linsen-Curry mit Reis", servings:4,
    ingredients:[{name:"rote Linsen",amount:200,unit:"g"},{name:"Reis",amount:180,unit:"g"},{name:"Kokosmilch",amount:200,unit:"ml"},{name:"Curry-Paste",amount:2,unit:"EL"}],
    description:"Curry-Paste anrösten, Linsen und Kokosmilch dazu, köcheln bis weich. Mit Reis servieren.",
    kcal:450, prot:20, carbs:60, fat:10},
  {id:"r5", name:"Fischfilet mit Kartoffeln", servings:4,
    ingredients:[{name:"Fischfilet",amount:300,unit:"g"},{name:"Kartoffeln",amount:500,unit:"g"},{name:"Zitrone",amount:1,unit:"Stk"},{name:"Butter",amount:20,unit:"g"}],
    description:"Kartoffeln kochen. Fisch in Butter braten, mit Zitrone beträufeln.",
    kcal:410, prot:34, carbs:38, fat:11},
  {id:"r6", name:"Gemüsepfanne mit Nudeln", servings:4,
    ingredients:[{name:"Nudeln",amount:220,unit:"g"},{name:"Paprika",amount:200,unit:"g"},{name:"Zucchini",amount:200,unit:"g"},{name:"Feta",amount:100,unit:"g"}],
    description:"Gemüse in der Pfanne braten, Nudeln kochen, alles mischen und mit Feta bestreuen.",
    kcal:430, prot:15, carbs:65, fat:9}
];

const SLOTS = [
  {id:'fruehstueck', label:'Frühstück',   def:4, an:false},
  {id:'mittag',      label:'Mittagessen', def:4, an:false},
  {id:'abend',       label:'Abendessen',  def:4, an:true },
  {id:'snack',       label:'Snack',       def:1, an:true }
];
const SLOT_BY_ID = {}; SLOTS.forEach(s=>{ SLOT_BY_ID[s.id]=s; });

function slotCfg(id){
  const d = SLOT_BY_ID[id] || {def:4, an:false};
  const c = ((state.settings||{}).slots || {})[id] || {};
  return {
    on: (c.on === undefined) ? d.an : !!c.on,
    personen: (c.personen && c.personen > 0) ? c.personen : d.def
  };
}
function activeSlots(){ return SLOTS.filter(s=>slotCfg(s.id).on); }
function istSnack(r){ return r && r.type === 'snack'; }
function poolFor(slotId){ return state.recipes.filter(r=>istSnack(r) === (slotId === 'snack')); }

function emptyState(){
  return {
    version: APP_VERSION,
    settings: { personen: 4, slots: {} },
    recipes: [],
    plan: {},          // { wk: { Montag: {id, servings} } }
    checked: {},       // { wk: { key: true } }
    removed: {},       // { wk: { key: true } }
    qty: {},           // { wk: { key: "2 kg" } }  manuell überschriebene Mengen
    nutriPortions: {}, // { wk: { Montag: 1.5 } }  eigene Portionenzahl fürs Nährwerte-Pro-Person
    excluded: [],      // normalisierte Zutatennamen
    catOverrides: {},  // { normKey: catId }
    marketOverrides: {}, // { normKey: "Rewe" } — welcher Laden für diese Zutat
    extras: [],        // { id, name, qty, cat, recurring, doneWk, from }
    haushalt: [],              // { id, name, cat, market } — Alt-Katalog, seit T-9 nur noch Sicherung
    customIngredients: [],     // { name } — Artikelstamm: selbst angelegte Artikel
    notizen: {}                // { listeId: { name, angelegt, eintraege: { id: {text, angelegt, erledigt?, faellig?} } } }
  };
}
let state = emptyState();
let currentMonday = getMondayOf(new Date());
const viewServings = {};   // Rezeptansicht: temporäre Portionszahl, wird nicht gespeichert

/* Der Statustext ist reine Anzeige - er darf den Start niemals aufhalten.
   Bis 07.08.2026 stand hier ein ungeprueftes getElementById: Beim Umbau der
   Navigation fiel #status aus dem HTML, setStatus warf, und weil es unmittelbar
   vor dem Anhaengen des Firebase-Zuhoerers laeuft, brach die Startfunktion ab.
   Ergebnis: Die App zeigte einen leeren Haushalt, obwohl alle Daten da waren.
   Nichts, was nur anzeigt, darf hart auf ein Element zugreifen. */
function setStatus(m){
  const el = document.getElementById('status');
  if(el) el.textContent = m;
}
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function parseTags(s){
  const seen = {};
  return String(s||'').split(',').map(t=>t.trim()).filter(t=>{
    if(!t) return false;
    const k = t.toLowerCase();
    if(seen[k]) return false;
    seen[k] = true;
    return true;
  });
}

/* =========================================================================
   3. Zutatennamen normalisieren (Zwiebel = Zwiebeln)
   ========================================================================= */
const IRREGULAR = {
  'eier':'ei','eiern':'ei','äpfel':'apfel','würste':'wurst','gläser':'glas','tomaten':'tomate',
  'kartoffeln':'kartoffel','zwiebeln':'zwiebel','möhren':'möhre','karotten':'karotte',
  'nudeln':'nudel','blätter':'blatt','körner':'korn','gewürze':'gewürz'
};
function singular(w){
  if(IRREGULAR[w]) return IRREGULAR[w];
  if(w.length < 5) return w;
  if(/(chen|lein|ken|hen)$/.test(w)) return w;             // Hähnchen, Brötchen bleiben
  if(/n$/.test(w)){
    const stem = w.slice(0,-1);
    if(/(e|el|er)$/.test(stem)) return stem;                // Tomaten→Tomate, Zwiebeln→Zwiebel
  }
  if(/s$/.test(w) && w.length > 5 && !/(ss|us|is|as|es|os)$/.test(w)) return w.slice(0,-1);
  return w;
}
function normKey(name){
  const s = String(name==null?'':name).toLowerCase().trim().replace(/\s+/g,' ');
  if(!s) return '';
  if(IRREGULAR[s]) return IRREGULAR[s];
  const parts = s.split(' ');
  parts[parts.length-1] = singular(parts[parts.length-1]);
  return parts.join(' ');
}

/* =========================================================================
   4. Supermarkt-Abteilungen
   ========================================================================= */
const CATS = [
  {id:'obst',      label:'Obst & Gemüse',         icon:'🥕'},
  {id:'fleisch',   label:'Fleisch & Fisch',       icon:'🥩'},
  {id:'kuehl',     label:'Kühlregal',             icon:'🧀'},
  {id:'trocken',   label:'Trockenwaren & Backen', icon:'🌾'},
  {id:'gewuerze',  label:'Gewürze',               icon:'🧂'},
  {id:'konserven', label:'Konserven & Saucen',    icon:'🥫'},
  {id:'tk',        label:'Tiefkühl',              icon:'🧊'},
  {id:'getraenke', label:'Getränke',              icon:'🧃'},
  {id:'haushalt',  label:'Haushalt & Drogerie',   icon:'🧻'},
  {id:'sonstiges', label:'Sonstiges',             icon:'🛒'}
];
const CAT_LABEL = {}; CATS.forEach(c=>{ CAT_LABEL[c.id]=c; });

/* Reihenfolge der Abteilungen ist einstellbar; fällt auf die Standardreihenfolge
   zurück, falls noch nichts gespeichert ist oder die Liste nicht mehr passt. */
function defaultCatOrder(){ return CATS.map(c=>c.id); }
function catOrder(){
  const o = (state.settings && state.settings.catOrder) || [];
  const ids = defaultCatOrder();
  const gueltig = o.length === ids.length && ids.every(id=>o.indexOf(id)>=0);
  return gueltig ? o : defaultCatOrder();
}
function orderedCats(){ return catOrder().map(id=>CAT_LABEL[id]); }

const CAT_KEYWORDS = {
  obst: ['zwiebel','knoblauch','kartoffel','karotte','möhre','brokkoli','blumenkohl','zucchini','aubergine','paprika','tomate','gurke','salat','rucola','spinat','lauch','porree','sellerie','kohlrabi','weißkohl','rotkohl','wirsing','spitzkohl','champignon','pilz','kürbis','süßkartoffel','radieschen','rote bete','zitrone','limette','orange','apfel','banane','birne','erdbeere','himbeere','heidelbeere','beere','traube','mango','avocado','ingwer','petersilie','basilikum','schnittlauch','koriander','dill','rosmarin','thymian','minze','kräuter','frühlingszwiebel','lauchzwiebel','chili','fenchel','pastinake','rettich','kresse','staudensellerie','schalotte','melone','pfirsich','pflaume','kiwi','ananas'],
  fleisch: ['hähnchen','hühnchen','huhn','pute','truthahn','rind','hackfleisch','hack','schwein','schnitzel','kotelett','steak','filet','speck','bacon','schinken','wurst','salami','bratwurst','chorizo','lamm','ente','gans','gulasch','lachs','fisch','garnele','shrimp','kabeljau','seelachs','forelle','dorade','scampi','muschel','tintenfisch','leberkäse','frikadelle'],
  kuehl: ['milch','sahne','schmand','crème fraîche','creme fraiche','joghurt','jogurt','quark','butter','margarine','käse','gouda','feta','mozzarella','parmesan','frischkäse','hüttenkäse','ricotta','mascarpone','halloumi','emmentaler','bergkäse','ei','tofu','seitan','pudding','buttermilch','kefir','skyr','sauerrahm','blätterteig','pizzateig','mürbeteig','frische hefe','räuchertofu','aufschnitt','hafermilch','mandelmilch'],
  trocken: ['mehl','zucker','reis','nudel','spaghetti','penne','fusilli','tagliatelle','pasta','spätzle','couscous','bulgur','quinoa','linse','kichererbse','haferflocke','müsli','grieß','stärke','backpulver','natron','nuss','mandel','walnuss','cashew','pinienkern','sesam','sonnenblumenkern','kürbiskern','rosine','dattel','honig','sirup','öl','olivenöl','rapsöl','essig','balsamico','brot','toast','brötchen','baguette','semmelbrösel','panko','schokolade','kakao','kaffee','tee','tortilla','wrap','chips','cracker','trockenhefe','hefe'],
  gewuerze: ['salz','pfeffer','paprikapulver','curry','currypulver','kreuzkümmel','kümmel','oregano','majoran','muskat','gewürz','brühe','vanille','zimt','chiliflocken','chilipulver','lorbeer','lorbeerblatt','nelken','kardamom','sternanis','ingwerpulver','knoblauchpulver','zwiebelpulver','currypaste'],
  konserven: ['passierte tomaten','tomatenmark','dosentomaten','gehackte tomaten','kokosmilch','kidneybohne','weiße bohne','mais','ketchup','senf','mayonnaise','sojasauce','sojasoße','pesto','olive','kaper','marmelade','konfitüre','nutella','erdnussbutter','fond','sauce','soße','ajvar','sambal','sriracha','tahini','apfelmus','sauerkraut','thunfisch','antipasti'],
  tk: ['tiefkühl','tk-','pommes','eiscreme','speiseeis','blattspinat','fischstäbchen'],
  getraenke: ['wasser','mineralwasser','saft','apfelsaft','orangensaft','traubensaft','tomatensaft','kirschsaft','multivitaminsaft','wein','bier','sekt','cola','limonade','schorle','prosecco'],
  haushalt: ['klopapier','toilettenpapier','küchenrolle','kuechenrolle','taschentücher','waschmittel','weichspüler','spülmittel','spuelmittel','spülmaschinentab','geschirrspültab','putzmittel','allzweckreiniger','wc-reiniger','wc reiniger','müllbeutel','muellbeutel','alufolie','frischhaltefolie','backpapier','batterien','kerzen','streichhölzer','feuerzeug','seife','duschgel','shampoo','zahnpasta','zahnbürste','rasierklinge','katzenfutter','katzenstreu','hundefutter','windeln','feuchttücher','müllsack','schwamm','handschuhe']
};
const KEYWORD_INDEX = [];
Object.keys(CAT_KEYWORDS).forEach(cat=>CAT_KEYWORDS[cat].forEach(kw=>KEYWORD_INDEX.push({kw, cat})));
KEYWORD_INDEX.sort((a,b)=>b.kw.length - a.kw.length);   // längste Treffer zuerst

function guessCategory(name){
  const n = String(name||'').toLowerCase();
  for(let i=0;i<KEYWORD_INDEX.length;i++){
    if(n.indexOf(KEYWORD_INDEX[i].kw) >= 0) return KEYWORD_INDEX[i].cat;
  }
  return 'sonstiges';
}
function categoryOf(name){
  const k = normKey(name);
  if(state.catOverrides && state.catOverrides[k]) return state.catOverrides[k];
  return guessCategory(name);
}
/* Supermarkt-Tag: frei vergebbar, keine Rate-Erkennung wie bei Kategorien —
   nur eine Zutat weiß selbst, in welchem Laden sie meistens gekauft wird. */
function marketOf(name){
  const k = normKey(name);
  return (state.marketOverrides && state.marketOverrides[k]) || '';
}

/* =========================================================================
   4b. Nährwerte pro 100 g (grobe Schätzwerte, gleiches Muster wie CAT_KEYWORDS)
   ========================================================================= */
const NUTRITION_DB = {
  'hähnchen':{kcal:110,prot:23,carbs:0,fat:1.2}, 'hühnchen':{kcal:110,prot:23,carbs:0,fat:1.2}, 'huhn':{kcal:110,prot:23,carbs:0,fat:1.2},
  'pute':{kcal:105,prot:22,carbs:0,fat:1.5}, 'truthahn':{kcal:105,prot:22,carbs:0,fat:1.5},
  'hackfleisch':{kcal:250,prot:17,carbs:0,fat:20}, 'hack':{kcal:250,prot:17,carbs:0,fat:20},
  'rind':{kcal:215,prot:18,carbs:0,fat:15},
  'schwein':{kcal:200,prot:20,carbs:0,fat:12}, 'schnitzel':{kcal:196,prot:19,carbs:12,fat:8}, 'kotelett':{kcal:230,prot:18,carbs:0,fat:17},
  'speck':{kcal:541,prot:37,carbs:1.4,fat:42}, 'bacon':{kcal:541,prot:37,carbs:1.4,fat:42},
  'wurst':{kcal:300,prot:13,carbs:2,fat:27}, 'salami':{kcal:400,prot:22,carbs:1,fat:34}, 'schinken':{kcal:145,prot:22,carbs:1,fat:6},
  'lachs':{kcal:208,prot:20,carbs:0,fat:13}, 'fisch':{kcal:90,prot:20,carbs:0,fat:1}, 'kabeljau':{kcal:82,prot:18,carbs:0,fat:0.7}, 'seelachs':{kcal:90,prot:20,carbs:0,fat:1},
  'garnele':{kcal:99,prot:21,carbs:0.2,fat:1.7}, 'shrimp':{kcal:99,prot:21,carbs:0.2,fat:1.7},
  'ei':{kcal:155,prot:13,carbs:1.1,fat:11,gStk:60},
  'tofu':{kcal:76,prot:8,carbs:2,fat:4.5},
  'milch':{kcal:64,prot:3.3,carbs:4.8,fat:3.6}, 'buttermilch':{kcal:38,prot:3.3,carbs:4.5,fat:0.5},
  'sahne':{kcal:292,prot:2.4,carbs:3.4,fat:30}, 'schmand':{kcal:220,prot:3,carbs:3.5,fat:22}, 'crème fraîche':{kcal:290,prot:2.5,carbs:3,fat:30}, 'creme fraiche':{kcal:290,prot:2.5,carbs:3,fat:30},
  'joghurt':{kcal:62,prot:3.8,carbs:4.5,fat:3.5}, 'jogurt':{kcal:62,prot:3.8,carbs:4.5,fat:3.5}, 'skyr':{kcal:63,prot:11,carbs:4,fat:0.2},
  'quark':{kcal:67,prot:12,carbs:4,fat:0.2},
  'butter':{kcal:717,prot:0.7,carbs:0.6,fat:81},
  'frischkäse':{kcal:245,prot:7,carbs:3.5,fat:23},
  'mozzarella':{kcal:280,prot:18,carbs:2,fat:22}, 'feta':{kcal:264,prot:14,carbs:4,fat:21}, 'parmesan':{kcal:392,prot:35,carbs:4,fat:26},
  'gouda':{kcal:356,prot:25,carbs:2,fat:28}, 'käse':{kcal:350,prot:25,carbs:2,fat:27},
  'reis':{kcal:350,prot:7,carbs:77,fat:0.6},
  'nudel':{kcal:350,prot:12,carbs:71,fat:1.5}, 'spaghetti':{kcal:350,prot:12,carbs:71,fat:1.5}, 'pasta':{kcal:350,prot:12,carbs:71,fat:1.5},
  'kartoffel':{kcal:77,prot:2,carbs:17,fat:0.1,gStk:150}, 'süßkartoffel':{kcal:86,prot:1.6,carbs:20,fat:0.1},
  'brot':{kcal:250,prot:8,carbs:49,fat:1.5}, 'brötchen':{kcal:275,prot:9,carbs:53,fat:1.7,gStk:50}, 'toast':{kcal:270,prot:8,carbs:50,fat:3.5},
  'mehl':{kcal:340,prot:10,carbs:73,fat:1},
  'haferflocke':{kcal:372,prot:13,carbs:60,fat:7},
  'quinoa':{kcal:368,prot:14,carbs:64,fat:6},
  'linse':{kcal:353,prot:25,carbs:52,fat:1.5},
  'kichererbse':{kcal:364,prot:19,carbs:61,fat:6},
  'couscous':{kcal:376,prot:13,carbs:77,fat:1.6}, 'bulgur':{kcal:342,prot:12,carbs:76,fat:1.3},
  'zwiebel':{kcal:40,prot:1.1,carbs:7.9,fat:0.1,gStk:120}, 'schalotte':{kcal:60,prot:2.5,carbs:12,fat:0.1,gStk:30},
  'knoblauch':{kcal:149,prot:6.4,carbs:33,fat:0.5,gStk:5},
  'karotte':{kcal:41,prot:0.9,carbs:10,fat:0.2,gStk:80}, 'möhre':{kcal:41,prot:0.9,carbs:10,fat:0.2,gStk:80},
  'brokkoli':{kcal:34,prot:2.8,carbs:7,fat:0.4},
  'blumenkohl':{kcal:25,prot:1.9,carbs:5,fat:0.3},
  'zucchini':{kcal:17,prot:1.2,carbs:3.1,fat:0.3,gStk:250},
  'aubergine':{kcal:25,prot:1,carbs:6,fat:0.2,gStk:250},
  'paprika':{kcal:31,prot:1,carbs:6,fat:0.3,gStk:150},
  'tomate':{kcal:18,prot:0.9,carbs:3.9,fat:0.2,gStk:120},
  'gurke':{kcal:15,prot:0.7,carbs:3.6,fat:0.1,gStk:300},
  'salat':{kcal:15,prot:1.4,carbs:2.9,fat:0.2}, 'rucola':{kcal:25,prot:2.6,carbs:2.1,fat:0.7}, 'spinat':{kcal:23,prot:2.9,carbs:3.6,fat:0.4},
  'champignon':{kcal:22,prot:3.1,carbs:3.3,fat:0.3}, 'pilz':{kcal:22,prot:3.1,carbs:3.3,fat:0.3},
  'kürbis':{kcal:26,prot:1,carbs:6.5,fat:0.1},
  'lauch':{kcal:25,prot:1.5,carbs:4,fat:0.3}, 'porree':{kcal:25,prot:1.5,carbs:4,fat:0.3},
  'sellerie':{kcal:16,prot:0.7,carbs:3,fat:0.2}, 'kohlrabi':{kcal:27,prot:1.9,carbs:4.7,fat:0.1},
  'apfel':{kcal:52,prot:0.3,carbs:14,fat:0.2,gStk:150}, 'birne':{kcal:57,prot:0.4,carbs:15,fat:0.1,gStk:150},
  'banane':{kcal:89,prot:1.1,carbs:23,fat:0.3,gStk:120},
  'zitrone':{kcal:29,prot:1.1,carbs:9,fat:0.3,gStk:100}, 'limette':{kcal:30,prot:0.7,carbs:11,fat:0.2,gStk:60},
  'avocado':{kcal:160,prot:2,carbs:9,fat:15,gStk:200},
  'erdbeere':{kcal:32,prot:0.7,carbs:7.7,fat:0.3}, 'himbeere':{kcal:52,prot:1.2,carbs:12,fat:0.7}, 'heidelbeere':{kcal:57,prot:0.7,carbs:14,fat:0.3},
  'traube':{kcal:69,prot:0.7,carbs:18,fat:0.2}, 'mango':{kcal:60,prot:0.8,carbs:15,fat:0.4},
  'honig':{kcal:304,prot:0.3,carbs:82,fat:0},
  'zucker':{kcal:400,prot:0,carbs:100,fat:0},
  'olivenöl':{kcal:884,prot:0,carbs:0,fat:100}, 'rapsöl':{kcal:884,prot:0,carbs:0,fat:100}, 'öl':{kcal:884,prot:0,carbs:0,fat:100},
  'mandel':{kcal:579,prot:21,carbs:22,fat:50}, 'walnuss':{kcal:654,prot:15,carbs:14,fat:65}, 'cashew':{kcal:553,prot:18,carbs:30,fat:44},
  'erdnuss':{kcal:567,prot:26,carbs:16,fat:49}, 'pinienkern':{kcal:673,prot:14,carbs:13,fat:68}, 'sesam':{kcal:573,prot:18,carbs:12,fat:50},
  'sojasauce':{kcal:60,prot:6,carbs:6,fat:0.1}, 'sojasoße':{kcal:60,prot:6,carbs:6,fat:0.1},
  'ketchup':{kcal:100,prot:1.2,carbs:24,fat:0.2}, 'mayonnaise':{kcal:680,prot:1,carbs:3,fat:75}, 'senf':{kcal:66,prot:4,carbs:5,fat:3.4},
  'kokosmilch':{kcal:200,prot:2,carbs:3,fat:20},
  'passierte tomaten':{kcal:22,prot:1.2,carbs:4,fat:0.2}, 'tomatenmark':{kcal:82,prot:4.3,carbs:14,fat:0.5}, 'dosentomaten':{kcal:18,prot:1,carbs:3.5,fat:0.2},
  'kidneybohne':{kcal:127,prot:8.7,carbs:19,fat:0.5}, 'mais':{kcal:96,prot:3.4,carbs:19,fat:1.5},
  'thunfisch':{kcal:116,prot:26,carbs:0,fat:1},
  'schokolade':{kcal:545,prot:5,carbs:59,fat:31}, 'kakao':{kcal:228,prot:20,carbs:11,fat:11}
};
const NUTRI_INDEX = [];
Object.keys(NUTRITION_DB).forEach(k=>NUTRI_INDEX.push({kw:k, v:NUTRITION_DB[k]}));
NUTRI_INDEX.sort((a,b)=>b.kw.length - a.kw.length);   // längste Treffer zuerst

function guessNutrition(name){
  const n = String(name||'').toLowerCase();
  for(let i=0;i<NUTRI_INDEX.length;i++){
    if(n.indexOf(NUTRI_INDEX[i].kw) >= 0) return NUTRI_INDEX[i].v;
  }
  return null;
}

/* Gewicht pro Einheit für alles, was nicht in Gramm/Milliliter angegeben ist —
   grob geschätzt, reicht für eine Kalorien-Näherung, keine Feinwaage. */
const UNIT_GRAMS = {
  el:15, essl:15, essloeffel:15,
  tl:5, teel:5, teeloeffel:5,
  prise:1, msp:0.5,
  scheibe:25, scheiben:25,
  zehe:5, zehen:5,
  bund:80, bd:80,
  dose:400, dosen:400, glas:350, glaeser:350, gläser:350,
  packung:250, pck:250, pk:250, packg:250,
  becher:200,
  blatt:2, blaetter:2, blätter:2
};
function gramsFor(ing){
  const uf = unitFamily(ing.unit);
  const amt = ing.amount || 0;
  if(uf.fam === 'mass') return amt * uf.factor;   // g/kg/mg → g
  if(uf.fam === 'vol')  return amt * uf.factor;   // ml/l/cl/dl ≈ g (Dichte ~1, Näherung)
  const u = String(ing.unit||'').toLowerCase().trim();
  if(u && UNIT_GRAMS[u] !== undefined) return amt * UNIT_GRAMS[u];
  const nutri = guessNutrition(ing.name);
  if((u === '' || u === 'stk' || u === 'stück' || u === 'stueck') && nutri && nutri.gStk){
    return amt * nutri.gStk;
  }
  return amt * 100;   // unbekannte Stückgröße — grobe Annahme 100 g/Stück
}
/* Summiert Nährwerte über alle Zutaten eines Rezepts (absolute Werte fürs ganze Rezept,
   passend zum bestehenden Schema kcal/prot/carbs/fat pro Portion*servings). */
function computeRecipeNutrition(ingredients){
  let kcal=0, prot=0, carbs=0, fat=0, unbekannt=0;
  (ingredients||[]).forEach(ing=>{
    const nutri = guessNutrition(ing.name);
    if(!nutri){ if(ing.name) unbekannt++; return; }
    const g = gramsFor(ing);
    kcal  += nutri.kcal  * g/100;
    prot  += nutri.prot  * g/100;
    carbs += nutri.carbs * g/100;
    fat   += nutri.fat   * g/100;
  });
  return { kcal:Math.round(kcal), prot:Math.round(prot*10)/10, carbs:Math.round(carbs*10)/10, fat:Math.round(fat*10)/10, unbekannt:unbekannt };
}

/* =========================================================================
   5. Bilder verkleinern
   ========================================================================= */
function fileToResizedDataURL(file, maxDim, quality){
  maxDim = maxDim || 600; quality = quality || 0.68;
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        let w=img.width, h=img.height;
        if(w>=h && w>maxDim){ h=Math.round(h*maxDim/w); w=maxDim; }
        else if(h>w && h>maxDim){ w=Math.round(w*maxDim/h); h=maxDim; }
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror=reject; img.src=reader.result;
    };
    reader.onerror=reject; reader.readAsDataURL(file);
  });
}

/* =========================================================================
   6. Datum & ISO-Woche
   ========================================================================= */
function getMondayOf(d){
  const x = new Date(d); x.setHours(0,0,0,0);
  const day = (x.getDay()+6)%7;
  x.setDate(x.getDate()-day);
  return x;
}
function isoWeek(d){
  const t = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const dayNum = (t.getUTCDay()+6)%7;
  t.setUTCDate(t.getUTCDate()-dayNum+3);
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(),0,4));
  const fDayNum = (firstThursday.getUTCDay()+6)%7;
  firstThursday.setUTCDate(firstThursday.getUTCDate()-fDayNum+3);
  const week = 1 + Math.round((t-firstThursday)/(7*24*3600*1000));
  return {week, year:t.getUTCFullYear()};
}
function weekKeyOf(monday){ const w=isoWeek(monday); return w.year+'-W'+String(w.week).padStart(2,'0'); }
function fmtDate(d){ return d.getDate()+'.'+(d.getMonth()+1)+'.'; }
function sameDay(a,b){ return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }

/* =========================================================================
   7. Laden, migrieren, speichern
   ========================================================================= */
function migrate(raw){
  raw = raw || {};
  const s = emptyState();
  s.settings = Object.assign({personen:4}, raw.settings);

  s.recipes = (raw.recipes || []).map(r=>Object.assign({}, r, {
    servings: (r.servings && r.servings > 0) ? r.servings : 4,
    ingredients: r.ingredients || [],
    fav: !!r.fav
  }));

  // plan: "r3"  ->  {id:"r3", servings:4}
  const plan = {};
  Object.keys(raw.plan || {}).forEach(wk=>{
    plan[wk] = {};
    const w = raw.plan[wk] || {};
    Object.keys(w).forEach(day=>{
      const v = w[day];
      if(!v) return;
      plan[wk][day] = (typeof v === 'string') ? {id:v, servings:s.settings.personen} : v;
    });
  });
  s.plan = plan;

  // alte Schlüssel "name|fam" -> normalisierter Name
  const convertKeys = obj=>{
    const out = {};
    Object.keys(obj || {}).forEach(wk=>{
      out[wk] = {};
      Object.keys(obj[wk] || {}).forEach(k=>{
        if(k.indexOf('x|') === 0){ out[wk][k] = obj[wk][k]; return; }
        const nk = normKey(k.split('|')[0]);
        if(nk) out[wk][nk] = obj[wk][k];
      });
    });
    return out;
  };
  s.checked = convertKeys(raw.checked);
  s.removed = convertKeys(raw.removed);
  s.qty = raw.qty || {};

  const ex = [];
  (raw.excluded || []).forEach(n=>{ const k=normKey(n); if(k && ex.indexOf(k)<0) ex.push(k); });
  s.excluded = ex;
  s.catOverrides = raw.catOverrides || {};
  s.marketOverrides = raw.marketOverrides || {};
  s.extras = raw.extras || [];
  return s;
}

/* ---------- Firebase <-> Zustand ---------- */
const imageCache = {};
let planAlt = false;      // alter Wochenplan erkannt -> einmalig neu schreiben
let slotsFehlen = false;  // Mahlzeiten-Einstellung fehlt -> einmalig anlegen                 // Bilder liegen getrennt und werden erst bei Bedarf geholt
let haushaltMigriert = false;  // alte, wöchentlich wiederkehrende Haushalt-Einträge -> neuer Katalog
let artikelMigriert = false;   // B2/IA-4: Haushalt-Katalog geht im gemeinsamen Artikelstamm auf
let migrationsCats = [];       // [[normKey, catId], …] aus der Artikel-Migration
let migrationsMarkets = [];    // [[normKey, laden], …] aus der Artikel-Migration

function fromRemote(d){
  d = d || {};
  const s = emptyState();
  s.settings = Object.assign({personen:4, slots:{}}, d.settings);
  if(!d.settings || !d.settings.slots){
    // erste Fassung ohne Mahlzeiten: Abendessen an, Snack an, Rest aus
    s.settings.slots = {
      abend: {on:true,  personen: s.settings.personen || 4},
      snack: {on:true,  personen: 1}
    };
    slotsFehlen = true;
  }
  s.recipes = (d.recipes || []).filter(Boolean).map(r=>Object.assign({}, r, {
    type: r.type === 'snack' ? 'snack' : 'rezept',
    servings: (r.servings && r.servings > 0) ? r.servings : 4,
    ingredients: (r.ingredients || []).filter(Boolean),
    tags: Array.isArray(r.tags) ? r.tags.filter(Boolean) : [],
    fav: !!r.fav
  }));
  s.excluded = (d.excluded || []).filter(Boolean);
  s.extras   = (d.extras   || []).filter(Boolean);
  s.haushalt = (d.haushalt || []).filter(Boolean);
  s.customIngredients = (d.customIngredients || []).filter(Boolean);
  s.notizen  = d.notizen || {};
  Object.keys(d.catOverrides || {}).forEach(k=>{ s.catOverrides[decKey(k)] = d.catOverrides[k]; });
  Object.keys(d.marketOverrides || {}).forEach(k=>{ s.marketOverrides[decKey(k)] = d.marketOverrides[k]; });
  Object.keys(d.weeks || {}).forEach(wk=>{
    const w = d.weeks[wk] || {};
    s.plan[wk] = {};
    Object.keys(w.plan || {}).forEach(day=>{
      const v = w.plan[day];
      if(!v) return;
      if(typeof v === 'string'){                       // ganz alte Fassung
        s.plan[wk][day] = {abend:{kind:'recipe', id:v, servings:4}};
        planAlt = true;
      } else if(v.id){                                 // ein Gericht pro Tag
        s.plan[wk][day] = {abend:{kind:'recipe', id:v.id, servings:v.servings || 4}};
        planAlt = true;
      } else {
        s.plan[wk][day] = v;
      }
    });
    s.checked[wk] = {}; s.removed[wk] = {}; s.qty[wk] = {};
    Object.keys(w.checked || {}).forEach(k=>{ s.checked[wk][decKey(k)] = w.checked[k]; });
    Object.keys(w.removed || {}).forEach(k=>{ s.removed[wk][decKey(k)] = w.removed[k]; });
    Object.keys(w.qty     || {}).forEach(k=>{ s.qty[wk][decKey(k)]     = w.qty[k];     });
    s.nutriPortions[wk] = Object.assign({}, w.nutriPortions || {});
  });

  // Übergangslösung: in einer früheren Fassung war "Haushalt" ein wöchentlich wiederkehrender
  // Eintrag unter "Eigene Einträge". Einmalig in den neuen, eigenständigen Katalog übernehmen.
  const alteHaushaltExtras = s.extras.filter(x=>x.cat==='haushalt' && x.recurring && !x.from);
  if(alteHaushaltExtras.length){
    alteHaushaltExtras.forEach(x=>{
      if(!s.haushalt.some(h=>h.name.toLowerCase()===x.name.toLowerCase())){
        s.haushalt.push({id:'h'+Date.now()+Math.random().toString(36).slice(2,5), name:x.name, cat:'haushalt'});
      }
    });
    s.extras = s.extras.filter(x=>!(x.cat==='haushalt' && x.recurring && !x.from));
    haushaltMigriert = true;
  }

  /* B2 / IA-4 — „Zutaten" und „Haushalt & Drogerie" waren zwei Listen mit
     denselben Feldern. Ab hier ist es eine. Einmalig je Haushalt:
     jeder Haushalt-Eintrag wird ein ganz normaler Artikel, seine Abteilung und
     sein Laden wandern auf den normalisierten Schlüssel — dorthin, wo alle
     anderen sie schon haben. Einträge der Einkaufsliste, die auf eine
     Haushalt-ID zeigten, werden auf denselben Schlüssel umgehängt.

     Der alte Zweig `data/haushalt` wird NICHT gelöscht. Er bleibt als
     Sicherung liegen; gelesen wird er nach der Migration nicht mehr. */
  if(!s.settings.artikelMigriert || haushaltMigriert){
    const idZuKey = {};
    (s.haushalt||[]).forEach(h=>{
      if(!h || !h.name) return;
      const k = normKey(h.name);
      if(!k) return;
      idZuKey[h.id] = k;
      if(!s.customIngredients.some(c=>normKey(c.name)===k)) s.customIngredients.push({name:h.name});
      if(!s.catOverrides[k]){ s.catOverrides[k] = h.cat || 'haushalt'; migrationsCats.push([k, s.catOverrides[k]]); }
      if(h.market && !s.marketOverrides[k]){ s.marketOverrides[k] = h.market; migrationsMarkets.push([k, h.market]); }
    });
    s.extras.forEach(x=>{ if(x.from && idZuKey[x.from]) x.from = idZuKey[x.from]; });
    s.settings.artikelMigriert = true;
    artikelMigriert = true;
  }
  return s;
}
function recipesForRemote(){
  return state.recipes.map(r=>{
    const o = Object.assign({}, r);
    delete o.image;
    o.hasImage = !!o.hasImage;
    return o;
  });
}

/* ---------- gezielte Schreibzugriffe: nur der geänderte Zweig geht raus ---------- */
function put(path, value){
  const r = ref(db, BASE + '/' + path);
  const p = (value === null || value === undefined) ? remove(r) : set(r, value);
  p.catch(err=>{
    zeigeFehler(err.code === 'PERMISSION_DENIED'
      ? 'Speichern nicht erlaubt. Entweder ist die anonyme Anmeldung in Firebase noch aus, oder die Sicherheitsregeln passen nicht.'
      : 'Speichern fehlgeschlagen: ' + err.message);
  });
  return p;
}
const saveRecipes  = ()          => put('data/recipes', recipesForRemote());
const saveExcluded = ()          => put('data/excluded', state.excluded.length ? state.excluded : null);
const saveExtras   = ()          => put('data/extras', (state.extras||[]).length ? state.extras : null);
const saveHaushalt = ()          => put('data/haushalt', (state.haushalt||[]).length ? state.haushalt : null);
const saveCustomIngredients = () => put('data/customIngredients', (state.customIngredients||[]).length ? state.customIngredients : null);
const savePersonen = ()          => put('data/settings/personen', state.settings.personen);
const savePlanSlot = (wk,day,slot,e) => put('data/weeks/'+wk+'/plan/'+day+'/'+slot, e || null);
const saveSlots    = ()          => put('data/settings/slots', state.settings.slots);
const saveCatOrder = ()          => put('data/settings/catOrder', (state.settings.catOrder && state.settings.catOrder.length) ? state.settings.catOrder : null);
const saveArtikelMigriert = ()   => put('data/settings/artikelMigriert', true);
const saveChecked  = (wk,key,on) => put('data/weeks/'+wk+'/checked/'+encKey(key), on ? true : null);
const saveRemoved  = (wk,key,on) => put('data/weeks/'+wk+'/removed/'+encKey(key), on ? true : null);
const saveQty      = (wk,key,v)  => put('data/weeks/'+wk+'/qty/'+encKey(key), v || null);
const saveNutriPortions = (wk,day,v) => put('data/weeks/'+wk+'/nutriPortions/'+day, (v && v!==1) ? v : null);
const saveCatOv    = (key,cat)   => put('data/catOverrides/'+encKey(key), cat);
const saveMarketOv = (key,markt) => put('data/marketOverrides/'+encKey(key), markt || null);
const saveImage    = (id,data)   => put('images/'+id, data);
const deleteImage  = (id)        => put('images/'+id, null);

function saveAllPlans(){
  Object.keys(state.plan).forEach(wk=>put('data/weeks/'+wk+'/plan', state.plan[wk] || null));
}
function saveWeekMaps(wk){
  const enc = o=>{ const out={}; Object.keys(o||{}).forEach(k=>{ if(o[k]) out[encKey(k)] = o[k]; });
                   return Object.keys(out).length ? out : null; };
  put('data/weeks/'+wk+'/checked', enc(state.checked[wk]));
  put('data/weeks/'+wk+'/removed', enc(state.removed[wk]));
  put('data/weeks/'+wk+'/qty',     enc(state.qty[wk]));
}

/* ---------- Bilder: erst laden, wenn das Rezept aufgeklappt wird ---------- */
async function loadImage(id){
  if(imageCache[id] !== undefined) return imageCache[id];
  imageCache[id] = null;
  try{
    const snap = await get(ref(db, BASE + '/images/' + id));
    imageCache[id] = snap.exists() ? snap.val() : null;
  }catch(e){ imageCache[id] = null; }
  return imageCache[id];
}
function imgOf(r){ return imageCache[r.id] || null; }

/* ---------- Start ---------- */
/* Anmeldung selbst läuft jetzt über das Login-Gate (onAuthStateChanged, siehe oben) —
   loadState() wird erst aufgerufen, wenn HAUSHALT_ID feststeht, und erneut bei jedem
   Haushalts-Wechsel. unsubscribeData sorgt dafür, dass beim Wechsel nicht zwei
   Haushalte gleichzeitig mitgeschrieben werden. */
let ersterSnapshot = true;
let unsubscribeData = null;
let onlineListenerAttached = false;

async function loadState(){
  // 1. Oberfläche sofort zeichnen — unabhängig von Netz und Datenbank.
  //    Der Wochenplan zeigt damit von der ersten Sekunde an die laufende Woche.
  renderAll();
  setStatus('Verbinde …');

  // 2. Falls vorhanden, den letzten Stand dieses Haushalts auf diesem Gerät einsetzen
  try{
    const cached = localStorage.getItem(CACHE_KEY);
    if(cached){ state = fromRemote(JSON.parse(cached)); pruneExtras(); renderAll(); }
  }catch(e){}

  if(!onlineListenerAttached){
    onlineListenerAttached = true;
    onValue(ref(db, '.info/connected'), snap=>setOnline(!!snap.val()));
  }

  // 3. alten Zuhörer abmelden, falls wir gerade den Haushalt gewechselt haben
  if(unsubscribeData){ unsubscribeData(); unsubscribeData = null; }
  ersterSnapshot = true;

  // 4. dauerhaft zuhören: jede Änderung von jedem Gerät kommt hier an
  unsubscribeData = onValue(ref(db, BASE + '/data'), snap=>{
    const d = snap.val();
    if(!d && ersterSnapshot){ ersterSnapshot = false; seed(); return; }
    ersterSnapshot = false;
    planAlt = false; slotsFehlen = false; haushaltMigriert = false;
    artikelMigriert = false; migrationsCats = []; migrationsMarkets = [];
    state = fromRemote(d);
    if(planAlt){ saveAllPlans(); }
    if(slotsFehlen){ saveSlots(); }
    if(haushaltMigriert){ saveHaushalt(); saveExtras(); }
    if(artikelMigriert){
      /* Erst sichern, dann schreiben: Jeder Schreibzugriff meldet sich sofort
         wieder als Momentaufnahme zurueck und laesst diesen Block ein zweites
         Mal laufen. Ohne die Kopien waeren die Listen dann schon geleert und
         Abteilung und Laden gingen still verloren. */
      const cats = migrationsCats.slice(), maerkte = migrationsMarkets.slice();
      const artikel = (state.customIngredients||[]).slice();
      const eintraege = (state.extras||[]).slice();
      migrationsCats = []; migrationsMarkets = [];
      /* Der Merker geht zuerst raus. Sonst sieht der Rueckruf, den schon der
         erste Schreibzugriff ausloest, eine noch unmigrierte Datenbank und
         migriert erneut — endlos. */
      saveArtikelMigriert();
      /* gezielte Zweigschreibung, kein globales Speichern (T-6) */
      if(artikel.length)   put('data/customIngredients', artikel);
      if(eintraege.length) put('data/extras', eintraege);
      cats.forEach(pp=>saveCatOv(pp[0], pp[1]));
      maerkte.forEach(pp=>saveMarketOv(pp[0], pp[1]));
    }
    if(pruneExtras()) saveExtras();
    try{ localStorage.setItem(CACHE_KEY, JSON.stringify(d || {})); }catch(e){}
    verbergeFehler();
    setStatus('');
    renderAll();
  }, err=>{
    zeigeFehler('Kein Zugriff auf die Datenbank (' + err.message + '). Sind die Sicherheitsregeln veröffentlicht?');
    setStatus('');
    renderAll();
  });
}
function seed(){
  const s = migrate({recipes: SEED_RECIPES});
  put('data/recipes', s.recipes.map(r=>Object.assign({type:'rezept'}, r)));
  put('data/settings/personen', 4);
  put('data/settings/slots', {abend:{on:true, personen:4}, snack:{on:true, personen:1}});
}
// einmalige Einträge, die in einer früheren Woche erledigt wurden, verschwinden
function pruneExtras(){
  const nowWk = weekKeyOf(getMondayOf(new Date()));
  const vorher = (state.extras || []).length;
  state.extras = (state.extras || []).filter(x=>x.recurring || !x.doneWk || x.doneWk === nowWk);
  return vorher !== state.extras.length;
}

function renderAll(){
  renderWeekNav(); renderMealConfig(); renderDayTrack();
  renderRecipeList(); renderShop(); renderCatOrder();
  renderNutritionReport(); refreshIngNameDatalist();
  /* Zusatzansichten abgeschirmt: keine von ihnen darf die Kernbereiche mitreissen (Kapitel 2.6, Regel 2) */
  try{ renderNotizen(); }catch(e){ console.warn('Notizen konnten nicht gezeichnet werden:', e); }
}

/* =========================================================================
   8. Wochennavigation & Haushaltsgröße
   ========================================================================= */
function renderWeekNav(){
  const w = isoWeek(currentMonday);
  const sun = new Date(currentMonday); sun.setDate(sun.getDate()+6);
  document.getElementById('kwNum').textContent = 'KW '+w.week;
  document.getElementById('kwYear').textContent = w.year;
  document.getElementById('kwRange').textContent = fmtDate(currentMonday)+' – '+fmtDate(sun);
}
function changeWeek(delta){
  currentMonday = new Date(currentMonday);
  currentMonday.setDate(currentMonday.getDate()+delta*7);
  renderWeekNav(); renderDayTrack(); renderShop(); renderNutritionReport();
}
document.getElementById('prevWeek').addEventListener('click',()=>changeWeek(-1));
document.getElementById('nextWeek').addEventListener('click',()=>changeWeek(1));
document.getElementById('todayBtn').addEventListener('click',()=>{
  currentMonday=getMondayOf(new Date()); renderWeekNav(); renderDayTrack(); renderShop(); renderNutritionReport();
});
(function(){
  const el = document.getElementById('weeknav');
  let x0=null;
  el.addEventListener('touchstart',e=>{ x0=e.touches[0].clientX; },{passive:true});
  el.addEventListener('touchend',e=>{
    if(x0===null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if(Math.abs(dx)>50) changeWeek(dx<0?1:-1);
    x0=null;
  },{passive:true});
})();

document.getElementById('fillWeek').addEventListener('click', ()=>{
  const wk = weekKeyOf(currentMonday);
  let anzahl = 0;
  DAYS.forEach((day, idx)=>{
    activeSlots().forEach(sl=>{
      const cur = ((state.plan[wk] || {})[day] || {})[sl.id];
      if(cur) return;   // Tag/Mahlzeit ist schon belegt — auch "auswärts" und Reste bleiben stehen
      const id = suggestFor(idx, sl.id);
      if(id){ setPlanSlot(wk, day, sl.id, id); anzahl++; }
    });
  });
  renderDayTrack(); renderShop();
  setStatus(anzahl ? anzahl+' Mahlzeiten ergänzt ✓' : 'Nichts zu ergänzen — schon alles geplant oder noch keine Rezepte vorhanden.');
  setTimeout(()=>setStatus(''), 2500);
});

function renderMealConfig(){
  const box = document.getElementById('mealRows');
  const an = activeSlots().length;
  document.getElementById('mealCount').textContent = '('+an+' aktiv)';
  box.innerHTML = SLOTS.map(sl=>{
    const c = slotCfg(sl.id);
    return '<div class="mealrow '+(c.on?'':'is-off')+'" data-slot="'+sl.id+'">' +
      '<label class="sw"><input type="checkbox" '+(c.on?'checked':'')+'>' +
        '<span class="'+(c.on?'':'off')+'">'+sl.label+'</span></label>' +
      '<span class="stepper">' +
        '<button type="button" class="sp-minus" aria-label="Weniger Personen">−</button>' +
        '<span class="val">'+c.personen+' Pers.</span>' +
        '<button type="button" class="sp-plus" aria-label="Mehr Personen">+</button>' +
      '</span></div>';
  }).join('');

  const merke = (id, patch)=>{
    state.settings.slots = state.settings.slots || {};
    const c = slotCfg(id);
    state.settings.slots[id] = Object.assign({on:c.on, personen:c.personen}, patch);
    saveSlots(); renderMealConfig(); renderDayTrack(); renderShop();
  };
  Array.prototype.forEach.call(box.querySelectorAll('.mealrow'), row=>{
    const id = row.dataset.slot;
    row.querySelector('input[type=checkbox]').addEventListener('change', e=>merke(id, {on:e.target.checked}));
    row.querySelector('.sp-minus').addEventListener('click', ()=>merke(id, {personen: Math.max(1, slotCfg(id).personen-1)}));
    row.querySelector('.sp-plus').addEventListener('click',  ()=>merke(id, {personen: Math.min(30, slotCfg(id).personen+1)}));
  });
}
document.getElementById('mealHead').addEventListener('click', ()=>{
  document.getElementById('mealHead').closest('.collapse-section').classList.toggle('collapsed');
});

/* =========================================================================
   9. Vorschlagslogik
   ========================================================================= */
function suggestFor(dayIdx, slotId){
  const wk = weekKeyOf(currentMonday);
  const weekPlan = state.plan[wk] || {};
  const pool = poolFor(slotId);
  if(!pool.length) return null;

  const eintrag = (day)=>((weekPlan[day] || {})[slotId] || null);
  const prev = dayIdx>0 ? eintrag(DAYS[dayIdx-1]) : null;
  const prevId = (prev && prev.kind !== 'out' && prev.kind !== 'leftover') ? prev.id : null;
  const used = DAYS.map(eintrag).filter(e=>e && e.id).map(e=>e.id);

  const scored = pool.map(r=>{
    let sc = 10 + Math.random()*3;
    if(r.id===prevId) sc -= 8;
    if(used.indexOf(r.id)>=0) sc -= 5;
    return {r:r, s:sc};
  });
  scored.sort((a,b)=>b.s-a.s);
  return scored[0] ? scored[0].r.id : null;
}

/* =========================================================================
   10. Tages-Kalender
   ========================================================================= */
function istKochEintrag(e){ return !!(e && e.id && e.kind !== 'out' && e.kind !== 'leftover'); }

/* Gemeinsame Schreibfunktion für einen Plan-Slot — genutzt vom Wochenplan selbst,
   vom "Zur Woche hinzufügen"-Button bei den Rezepten und vom "Woche füllen"-Button. */
function setPlanSlot(wk, day, slotId, wert){
  state.plan[wk] = state.plan[wk] || {};
  state.plan[wk][day] = state.plan[wk][day] || {};
  let eintrag = null;
  if(wert === '__out'){
    eintrag = {kind:'out'};
  } else if(wert && wert.indexOf('__lo|') === 0){
    const t = wert.split('|');
    eintrag = {kind:'leftover', from:t[1], fromSlot:t[2] || 'abend'};
  } else if(wert){
    const alt = state.plan[wk][day][slotId];
    eintrag = {kind:'recipe', id:wert,
               servings:(alt && alt.servings) || slotCfg(slotId).personen};
  }
  if(eintrag) state.plan[wk][day][slotId] = eintrag;
  else delete state.plan[wk][day][slotId];
  savePlanSlot(wk, day, slotId, eintrag);
}

function restenQuelle(wk, e){
  const w = state.plan[wk] || {};
  const q = ((w[e.from] || {})[e.fromSlot || e.slot || 'abend']) || null;
  if(!istKochEintrag(q)) return null;
  return state.recipes.filter(x=>x.id===q.id)[0] || null;
}

function tagKcal(dayEntries){
  let sum = 0;
  activeSlots().forEach(sl=>{
    const e = dayEntries[sl.id];
    if(!istKochEintrag(e)) return;
    const r = state.recipes.filter(x=>x.id===e.id)[0];
    if(r) sum += (r.kcal || 0);
  });
  return Math.round(sum);
}

/* Auswahlfeld: Rezepte, auswärts, Reste von anderen Tagen */
function slotSelect(wk, day, slotId, e){
  const pool = poolFor(slotId);
  const cur  = istKochEintrag(e) ? e.id : (e && e.kind === 'out' ? '__out'
             : (e && e.kind === 'leftover' ? '__lo|'+e.from+'|'+(e.fromSlot||'abend') : ''));

  let opts = '<option value="">— leer —</option>';
  if(pool.length){
    opts += '<optgroup label="'+(slotId==='snack'?'Snacks':'Rezepte')+'">' +
      pool.map(r=>'<option value="'+r.id+'" '+(r.id===cur?'selected':'')+'>'+escapeHtml(r.name)+'</option>').join('') +
      '</optgroup>';
  }

  // Reste: alles, was in dieser Woche schon gekocht wird
  const reste = [];
  DAYS.forEach(d=>{
    activeSlots().forEach(sl=>{
      if(d===day && sl.id===slotId) return;
      const q = ((state.plan[wk] || {})[d] || {})[sl.id];
      if(!istKochEintrag(q)) return;
      const r = state.recipes.filter(x=>x.id===q.id)[0];
      if(!r) return;
      const val = '__lo|'+d+'|'+sl.id;
      reste.push('<option value="'+val+'" '+(val===cur?'selected':'')+'>Reste vom '+d+' — '+escapeHtml(r.name)+'</option>');
    });
  });

  opts += '<optgroup label="Sonstiges">' +
    '<option value="__out" '+(cur==='__out'?'selected':'')+'>Auswärts / wird nicht gekocht</option>' +
    reste.join('') + '</optgroup>';

  return '<select class="slot-select" data-day="'+day+'" data-slot="'+slotId+'" style="flex:1;">'+opts+'</select>';
}

function renderSlot(wk, day, sl, e){
  let body;
  if(e && e.kind === 'out'){
    body = '<div class="slot-special">🚪 Auswärts — wird nicht gekocht</div>';
  } else if(e && e.kind === 'leftover'){
    const r = restenQuelle(wk, e);
    body = r
      ? '<div class="slot-special">♻️ Reste vom '+escapeHtml(e.from)+' — '+escapeHtml(r.name)+'</div>'
      : '<div class="slot-special gone">♻️ Reste vom '+escapeHtml(e.from)+' — Gericht ist nicht mehr geplant</div>';
  } else if(istKochEintrag(e)){
    const r = state.recipes.filter(x=>x.id===e.id)[0];
    if(r){
      const pers = e.servings || slotCfg(sl.id).personen;
      body = '<div class="meal-chip">'+escapeHtml(r.name) +
        (istSnack(r) ? '' :
          '<div class="meal-nutri"><span>'+(r.kcal||0)+' kcal/Port.</span><span>E '+(r.prot||0)+'</span><span>K '+(r.carbs||0)+'</span><span>F '+(r.fat||0)+'</span></div>') +
        '</div>' +
        '<div class="day-persons"><span class="lbl">Für wie viele?</span>' +
          '<span class="stepper">' +
            '<button type="button" class="pers-minus" data-day="'+day+'" data-slot="'+sl.id+'" aria-label="Weniger Personen">−</button>' +
            '<span class="val">'+pers+' Pers.</span>' +
            '<button type="button" class="pers-plus" data-day="'+day+'" data-slot="'+sl.id+'" aria-label="Mehr Personen">+</button>' +
          '</span></div>';
    } else {
      body = '<div class="slot-special gone">Gericht wurde gelöscht</div>';
    }
  } else {
    body = '<div class="meal-empty">nichts geplant</div>';
  }

  return '<div class="slot">' +
    '<span class="slot-name">'+sl.label+'</span>' +
    body +
    '<div class="day-actions">' +
      slotSelect(wk, day, sl.id, e) +
      '<button class="btn btn-soft btn-sm suggest" data-day="'+day+'" data-slot="'+sl.id+'" title="Vorschlag">🎲</button>' +
      '<button class="btn btn-soft btn-sm slot-search-open" data-day="'+day+'" data-slot="'+sl.id+'" title="Suchen">🔍</button>' +
    '</div></div>';
}

const expandedPastDays = {};   // { 'wk|Tag': true } — von Hand wieder aufgeklappte vergangene Tage

function renderDayTrack(){
  const track = document.getElementById('dayTrack');
  const wk = weekKeyOf(currentMonday);
  const weekPlan = state.plan[wk] || {};
  const today = new Date(); today.setHours(0,0,0,0);
  const slots = activeSlots();
  track.innerHTML = '';

  if(!slots.length){
    track.innerHTML = '<div class="empty">Alle Mahlzeiten sind abgeschaltet. Oben unter „Mahlzeiten“ wieder einschalten.</div>';
    return;
  }

  DAYS.forEach((day, idx)=>{
    const date = new Date(currentMonday); date.setDate(date.getDate()+idx); date.setHours(0,0,0,0);
    const eintraege = weekPlan[day] || {};
    const kcal = tagKcal(eintraege);
    const dayKey = wk+'|'+day;
    const istVergangen = date.getTime() < today.getTime();
    const eingeklappt = istVergangen && !expandedPastDays[dayKey];

    const col = document.createElement('div');
    col.className = 'day-col'
      + (sameDay(date, today) ? ' today' : '')
      + (istVergangen ? ' past' : '')
      + (eingeklappt ? ' collapsed' : '');
    col.dataset.idx = idx;

    const topHtml = istVergangen
      ? '<button class="day-top day-top-toggle" type="button" data-daykey="'+dayKey+'">' +
          '<span class="day-name">'+day+'</span><span class="day-date">'+fmtDate(date)+'</span>' +
          '<span class="day-chev">'+(eingeklappt?'▸':'▾')+'</span>' +
        '</button>'
      : '<div class="day-top"><span class="day-name">'+day+'</span><span class="day-date">'+fmtDate(date)+'</span></div>';

    if(eingeklappt){
      const kurz = slots.map(sl=>{
        const e = eintraege[sl.id];
        if(!istKochEintrag(e)) return null;
        const r = state.recipes.filter(x=>x.id===e.id)[0];
        return r ? r.name : null;
      }).filter(Boolean).join(' · ');
      col.innerHTML = topHtml + '<div class="day-summary">'+(kurz ? escapeHtml(kurz) : 'nichts geplant')+'</div>';
    } else {
      const hatEintraege = Object.keys(eintraege).length > 0;
      col.innerHTML = topHtml +
        (kcal ? '<div class="day-kcal">≈ '+kcal+' kcal pro Person</div>' : '') +
        slots.map(sl=>renderSlot(wk, day, sl, eintraege[sl.id] || null)).join('') +
        (hatEintraege ? '<button class="day-reset-btn" type="button" data-day="'+day+'" title="Diesen Tag zurücksetzen">🗑 Tag zurücksetzen</button>' : '');
    }
    track.appendChild(col);
  });

  Array.prototype.forEach.call(track.querySelectorAll('.day-top-toggle'), el=>{
    el.addEventListener('click', ()=>{
      const k = el.dataset.daykey;
      if(expandedPastDays[k]) delete expandedPastDays[k]; else expandedPastDays[k] = true;
      renderDayTrack();
    });
  });

  Array.prototype.forEach.call(track.querySelectorAll('.day-reset-btn'), b=>b.addEventListener('click', e=>{
    const day = e.currentTarget.dataset.day;
    const wkNow = weekKeyOf(currentMonday);
    const backup = JSON.parse(JSON.stringify((state.plan[wkNow]||{})[day] || {}));
    if(!Object.keys(backup).length) return;
    if(!confirm('„'+day+'“ komplett zurücksetzen? Rezepte selbst bleiben erhalten.')) return;
    state.plan[wkNow] = state.plan[wkNow] || {};
    state.plan[wkNow][day] = {};
    put('data/weeks/'+wkNow+'/plan/'+day, null);
    renderDayTrack(); renderShop(); renderNutritionReport();
    showToast(day+' zurückgesetzt', ()=>{
      state.plan[wkNow][day] = backup;
      put('data/weeks/'+wkNow+'/plan/'+day, backup);
      renderDayTrack(); renderShop(); renderNutritionReport();
    });
  }));

  const setSlot = (day, slotId, wert)=>{
    const wkNow = weekKeyOf(currentMonday);
    setPlanSlot(wkNow, day, slotId, wert);
    renderDayTrack(); renderShop();
  };

  Array.prototype.forEach.call(track.querySelectorAll('.slot-select'), sel=>{
    sel.addEventListener('change', e=>setSlot(e.target.dataset.day, e.target.dataset.slot, e.target.value));
  });
  Array.prototype.forEach.call(track.querySelectorAll('.suggest'), btn=>{
    btn.addEventListener('click', e=>{
      const el = e.currentTarget;
      const idx = parseInt(el.closest('.day-col').dataset.idx, 10);
      const id = suggestFor(idx, el.dataset.slot);
      if(!id){
        setStatus(el.dataset.slot === 'snack'
          ? 'Noch keine Snacks angelegt — im Reiter Rezepte unter „+ Neues Rezept“ auf Snack umstellen.'
          : 'Noch keine Rezepte vorhanden.');
        setTimeout(()=>setStatus(''), 3500);
        return;
      }
      setSlot(el.dataset.day, el.dataset.slot, id);
    });
  });
  Array.prototype.forEach.call(track.querySelectorAll('.slot-search-open'), btn=>{
    btn.addEventListener('click', e=>openSlotSearch(e.currentTarget.dataset.day, e.currentTarget.dataset.slot));
  });

  const bump = (day, slotId, delta)=>{
    const wkNow = weekKeyOf(currentMonday);
    const eintrag = ((state.plan[wkNow] || {})[day] || {})[slotId];
    if(!istKochEintrag(eintrag)) return;
    eintrag.servings = Math.min(30, Math.max(1, (eintrag.servings || slotCfg(slotId).personen) + delta));
    savePlanSlot(wkNow, day, slotId, eintrag);
    renderDayTrack(); renderShop();
  };
  Array.prototype.forEach.call(track.querySelectorAll('.pers-minus'), b=>
    b.addEventListener('click', e=>bump(e.currentTarget.dataset.day, e.currentTarget.dataset.slot, -1)));
  Array.prototype.forEach.call(track.querySelectorAll('.pers-plus'), b=>
    b.addEventListener('click', e=>bump(e.currentTarget.dataset.day, e.currentTarget.dataset.slot, 1)));


  /* Heute zeigt das Essen des Tages - mitziehen, sobald der Plan sich aendert.
     Abgeschirmt: Heute ist eine Zusatzansicht und darf den Wochenplan nicht
     mitreissen, wenn dort etwas schiefgeht. */
  try{ renderHeute(); }catch(e){ console.warn('Heute konnte nicht gezeichnet werden:', e); }
}

/* ---------- Rezept-Suche fürs Auswählen im Wochenplan (statt/zusätzlich zum Dropdown) ---------- */
let slotSearchTarget = null;   // {day, slotId}
let slotSearchQuery = '';
let slotSearchTagFilter = '';

function openSlotSearch(day, slotId){
  slotSearchTarget = {day:day, slotId:slotId};
  slotSearchQuery = ''; slotSearchTagFilter = '';
  const sl = SLOT_BY_ID[slotId];
  document.getElementById('slotSearchTitle').textContent = (sl?sl.label:'Mahlzeit') + ' — ' + day;
  document.getElementById('slotSearchInput').value = '';
  document.getElementById('slotSearchOverlay').style.display = 'flex';
  renderSlotSearchResults();
  setTimeout(()=>document.getElementById('slotSearchInput').focus(), 50);
}
function closeSlotSearch(){
  document.getElementById('slotSearchOverlay').style.display = 'none';
  slotSearchTarget = null;
}
document.getElementById('slotSearchClose').addEventListener('click', closeSlotSearch);
document.getElementById('slotSearchOverlay').addEventListener('click', e=>{
  if(e.target.id === 'slotSearchOverlay') closeSlotSearch();
});
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape' && document.getElementById('slotSearchOverlay').style.display !== 'none') closeSlotSearch();
});
document.getElementById('slotSearchInput').addEventListener('input', e=>{
  slotSearchQuery = e.target.value.trim();
  renderSlotSearchResults();
});

function renderSlotSearchResults(){
  if(!slotSearchTarget) return;
  const pool = poolFor(slotSearchTarget.slotId);

  const tagsBox = document.getElementById('slotSearchTags');
  const seen = {}; const tags = [];
  pool.forEach(r=>(r.tags||[]).forEach(t=>{ const k=t.toLowerCase(); if(!seen[k]){ seen[k]=true; tags.push(t); } }));
  tags.sort((a,b)=>a.localeCompare(b,'de'));
  tagsBox.innerHTML = tags.map(t=>
    '<span class="chip'+(slotSearchTagFilter.toLowerCase()===t.toLowerCase()?' tag-active':'')+'" data-tag="'+escapeHtml(t)+'">'+escapeHtml(t)+'</span>'
  ).join('');
  Array.prototype.forEach.call(tagsBox.querySelectorAll('.chip'), chip=>chip.addEventListener('click', ()=>{
    const t = chip.dataset.tag;
    slotSearchTagFilter = (slotSearchTagFilter.toLowerCase()===t.toLowerCase()) ? '' : t;
    renderSlotSearchResults();
  }));

  const gefiltert = pool.filter(r=>matchesSearch(r, slotSearchQuery) && matchesTag(r, slotSearchTagFilter));
  const box = document.getElementById('slotSearchResults');
  box.innerHTML = gefiltert.length
    ? gefiltert.map(r=>
        '<button type="button" class="ssr-item" data-id="'+r.id+'">' +
          '<span>'+escapeHtml(r.name)+'</span>' +
          '<span class="ssr-tags">'+(r.tags||[]).map(t=>'<span class="tag-badge">'+escapeHtml(t)+'</span>').join('')+'</span>' +
        '</button>')
        .join('')
    : '<div class="empty">Nichts gefunden.</div>';
  Array.prototype.forEach.call(box.querySelectorAll('.ssr-item'), b=>b.addEventListener('click', e=>{
    const id = e.currentTarget.dataset.id;
    const target = slotSearchTarget;
    if(!target) return;
    const wk = weekKeyOf(currentMonday);
    setPlanSlot(wk, target.day, target.slotId, id);
    const r = state.recipes.filter(x=>x.id===id)[0];
    closeSlotSearch();
    renderDayTrack(); renderShop();
    showToast((r?r.name:'Eintrag')+' für '+target.day+' eingetragen');
  }));
}

/* =========================================================================
   11. Rezepte
   ========================================================================= */
function scaleAmount(amount, factor){
  const v = (amount||0) * factor;
  if(!v) return '';
  return (Math.round(v*100)/100).toString().replace('.',',');
}
let recipeQuery = '';
let activeTagFilter = '';
let favOnly = false;
function matchesSearch(r, q){
  if(!q) return true;
  const needle = q.toLowerCase();
  if((r.name||'').toLowerCase().indexOf(needle) >= 0) return true;
  if((r.tags||[]).some(t=>t.toLowerCase().indexOf(needle) >= 0)) return true;
  return (r.ingredients||[]).some(i=>(i.name||'').toLowerCase().indexOf(needle) >= 0);
}
function matchesTag(r, tag){
  if(!tag) return true;
  return (r.tags||[]).some(t=>t.toLowerCase()===tag.toLowerCase());
}
function alleRezeptTags(){
  const seen = {}; const out = [];
  state.recipes.forEach(r=>(r.tags||[]).forEach(t=>{
    const k = t.toLowerCase();
    if(!seen[k]){ seen[k]=true; out.push(t); }
  }));
  out.sort((a,b)=>a.localeCompare(b,'de'));
  return out;
}
function renderTagFilterChips(){
  const box = document.getElementById('tagFilterRow');
  if(!box) return;
  const tags = alleRezeptTags();
  if(!tags.length){ box.innerHTML=''; box.style.display='none'; return; }
  box.style.display='flex';
  box.innerHTML = tags.map(t=>
    '<span class="chip'+(activeTagFilter.toLowerCase()===t.toLowerCase()?' tag-active':'')+'" data-tag="'+escapeHtml(t)+'">'+escapeHtml(t)+'</span>'
  ).join('');
  Array.prototype.forEach.call(box.querySelectorAll('.chip'), chip=>chip.addEventListener('click', ()=>{
    const t = chip.dataset.tag;
    activeTagFilter = (activeTagFilter.toLowerCase()===t.toLowerCase()) ? '' : t;
    renderRecipeList();
  }));
}
function weekPickerHtml(r){
  const slotsForR = activeSlots().filter(sl => istSnack(r) === (sl.id==='snack'));
  if(!slotsForR.length){
    return '<div class="week-picker" data-id="'+r.id+'">' +
      '<p class="ex-hint" style="margin:0;">Für '+(istSnack(r)?'Snacks':'Rezepte')+' ist gerade keine passende Mahlzeit aktiv — unter Wochenplan → Mahlzeiten einschalten.</p>' +
    '</div>';
  }
  const isCurrentWeek = weekKeyOf(currentMonday) === weekKeyOf(getMondayOf(new Date()));
  const todayIdx = (new Date().getDay()+6)%7;
  const defaultDay = isCurrentWeek ? DAYS[todayIdx] : DAYS[0];
  return '<div class="week-picker" data-id="'+r.id+'">' +
    '<div class="wp-row">' +
      '<select class="wp-day">' + DAYS.map(d=>'<option value="'+d+'" '+(d===defaultDay?'selected':'')+'>'+d+'</option>').join('') + '</select>' +
      '<select class="wp-slot">' + slotsForR.map(sl=>'<option value="'+sl.id+'">'+sl.label+'</option>').join('') + '</select>' +
      '<button class="btn btn-primary btn-sm wp-confirm" type="button">Eintragen</button>' +
    '</div>' +
    '<p class="ex-hint" style="margin:6px 0 0;">Für KW '+isoWeek(currentMonday).week+'</p>' +
  '</div>';
}
function renderRecipeList(){
  const list = document.getElementById('recipeList');
  const nSnack = state.recipes.filter(istSnack).length;
  document.getElementById('recCount').textContent =
    '('+(state.recipes.length-nSnack)+(nSnack?' + '+nSnack+' Snacks':'')+')';

  const openIds = Array.prototype.map.call(list.querySelectorAll('.recipe-item.open'), el=>el.dataset.id);
  const descOpenIds = Array.prototype.map.call(list.querySelectorAll('.recipe-item .desc-wrap.desc-open'), el=>el.closest('.recipe-item').dataset.id);

  renderTagFilterChips();

  if(!state.recipes.length){
    list.innerHTML='<div class="empty">Noch keine Rezepte. Leg über „+ Neues Rezept“ eins an oder importiere eure Excel.</div>';
    return;
  }

  const favBtn = document.getElementById('favOnlyToggle');
  if(favBtn) favBtn.classList.toggle('active', favOnly);

  const gefiltert = state.recipes.filter(r=>matchesSearch(r, recipeQuery) && matchesTag(r, activeTagFilter) && (!favOnly || r.fav));
  if(!gefiltert.length){
    list.innerHTML='<div class="empty">Keine Rezepte gefunden'+(recipeQuery?' für „'+escapeHtml(recipeQuery)+'“':'')+(activeTagFilter?' mit Tag „'+escapeHtml(activeTagFilter)+'“':'')+(favOnly?' bei den Favoriten':'')+'.</div>';
    return;
  }

  list.innerHTML = gefiltert.map(r=>{
    const base = r.servings || 4;
    const shown = viewServings[r.id] || base;
    const f = shown / base;
    return '' +
    '<div class="recipe-item" data-id="'+r.id+'">' +
      '<div class="recipe-head" data-toggle="'+r.id+'">' +
        '<span class="chev">▶</span> '+escapeHtml(r.name) + (istSnack(r)?'<span class="snack-badge">Snack</span>':'') +
        (r.tags||[]).map(t=>'<span class="tag-badge">'+escapeHtml(t)+'</span>').join('') +
        (istSnack(r) ? '' : '<button class="fav-star'+(r.fav?' active':'')+'" type="button" data-favid="'+r.id+'" aria-label="'+(r.fav?'Favorit entfernen':'Als Favorit markieren')+'" style="margin-left:auto;">'+(r.fav?'★':'☆')+'</button>') +
      '</div>' +
      '<div class="recipe-body">' +
        (imgOf(r) ? '<img class="recipe-img" src="'+imgOf(r)+'" alt="'+escapeHtml(r.name)+'">' : (r.hasImage ? '<div class="img-loading">Bild wird geladen …</div>' : '')) +
        '<div class="portion-bar">' +
          '<span class="lbl">Mengen für</span>' +
          '<span class="stepper">' +
            '<button type="button" class="rv-minus" data-id="'+r.id+'" aria-label="Weniger Portionen">−</button>' +
            '<span class="val">'+shown+' Pers.</span>' +
            '<button type="button" class="rv-plus" data-id="'+r.id+'" aria-label="Mehr Portionen">+</button>' +
          '</span>' +
        '</div>' +
        '<div>' + (r.ingredients||[]).map(i=>
          '<div class="ing-line"><span class="q">'+scaleAmount(i.amount,f)+' '+escapeHtml(i.unit||'')+'</span><span>'+escapeHtml(i.name)+'</span></div>'
        ).join('') + '</div>' +
        (istSnack(r) ? '' :
          '<div class="nutri-row"><span>'+(r.kcal||0)+' kcal/Portion</span><span>Eiweiß '+(r.prot||0)+'g</span><span>KH '+(r.carbs||0)+'g</span><span>Fett '+(r.fat||0)+'g</span></div>') +
        (r.description
          ? '<div class="desc-wrap">' +
              '<button class="desc-toggle" type="button" data-desctoggle>' +
                '<span class="chev">▶</span><span class="desc-label">Beschreibung anzeigen</span>' +
              '</button>' +
              '<div class="desc-body">'+escapeHtml(r.description)+'</div>' +
            '</div>' : '') +
        (istSnack(r) ? '' : '<div class="img-controls">' +
          '<label class="btn btn-soft btn-sm" for="imgup-'+r.id+'" style="cursor:pointer;">📷 '+(r.hasImage?'Bild ändern':'Bild hochladen')+'</label>' +
          '<input type="file" id="imgup-'+r.id+'" accept="image/*" data-imgfor="'+r.id+'" style="display:none;">' +
          (r.hasImage?'<button class="btn btn-ghost btn-loeschen btn-sm rm-img" data-id="'+r.id+'" type="button">Bild entfernen</button>':'') +
        '</div>') +
        '<div class="add-to-week-row">' +
          '<button class="btn btn-soft btn-sm add-to-week" data-id="'+r.id+'" type="button">+ Zur Woche</button>' +
          '<button class="btn btn-soft btn-sm edit-recipe" data-id="'+r.id+'" type="button">✏️ Bearbeiten</button>' +
          '<button class="btn btn-ghost btn-loeschen btn-sm del-recipe" data-id="'+r.id+'" type="button">Entfernen</button>' +
        '</div>' +
        weekPickerHtml(r) +
      '</div>' +
    '</div>';
  }).join('');

  openIds.forEach(id=>{ const el=list.querySelector('.recipe-item[data-id="'+id+'"]'); if(el) el.classList.add('open'); });
  descOpenIds.forEach(id=>{
    const el=list.querySelector('.recipe-item[data-id="'+id+'"] .desc-wrap');
    if(el){ el.classList.add('desc-open'); const l=el.querySelector('.desc-label'); if(l) l.textContent='Beschreibung ausblenden'; }
  });

  Array.prototype.forEach.call(list.querySelectorAll('[data-toggle]'), b=>b.addEventListener('click', async ()=>{
    const item = b.closest('.recipe-item');
    item.classList.toggle('open');
    const id = item.dataset.id;
    const r = state.recipes.filter(x=>x.id===id)[0];
    if(item.classList.contains('open') && r && r.hasImage && imageCache[id] === undefined){
      await loadImage(id); renderRecipeList();
    }
    updateWakeLock();
  }));
  Array.prototype.forEach.call(list.querySelectorAll('[data-desctoggle]'), b=>b.addEventListener('click',()=>{
    const w=b.closest('.desc-wrap'); w.classList.toggle('desc-open');
    const l=b.querySelector('.desc-label'); if(l) l.textContent = w.classList.contains('desc-open')?'Beschreibung ausblenden':'Beschreibung anzeigen';
  }));

  const rv = (id, delta)=>{
    const r = state.recipes.filter(x=>x.id===id)[0]; if(!r) return;
    const cur = viewServings[id] || r.servings || 4;
    viewServings[id] = Math.min(30, Math.max(1, cur+delta));
    renderRecipeList();
  };
  Array.prototype.forEach.call(list.querySelectorAll('.rv-minus'), b=>b.addEventListener('click', e=>rv(e.currentTarget.dataset.id,-1)));
  Array.prototype.forEach.call(list.querySelectorAll('.rv-plus'),  b=>b.addEventListener('click', e=>rv(e.currentTarget.dataset.id, 1)));

  Array.prototype.forEach.call(list.querySelectorAll('.edit-recipe'), b=>b.addEventListener('click', e=>{
    openEditRecipe(e.currentTarget.dataset.id);
  }));

  Array.prototype.forEach.call(list.querySelectorAll('.fav-star'), b=>b.addEventListener('click', e=>{
    e.stopPropagation();
    const r = state.recipes.filter(x=>x.id===e.currentTarget.dataset.favid)[0];
    if(!r) return;
    r.fav = !r.fav;
    saveRecipes(); renderRecipeList();
  }));
  Array.prototype.forEach.call(list.querySelectorAll('.del-recipe'), b=>b.addEventListener('click', async e=>{
    const id=e.target.dataset.id;
    state.recipes=state.recipes.filter(r=>r.id!==id);
    Object.keys(state.plan).forEach(wk=>Object.keys(state.plan[wk]||{}).forEach(d=>{
      const en=state.plan[wk][d]; if(en && en.id===id) state.plan[wk][d]=null;
    }));
    deleteImage(id); saveRecipes(); saveAllPlans(); renderAll();
  }));
  Array.prototype.forEach.call(list.querySelectorAll('input[data-imgfor]'), inp=>inp.addEventListener('change', async e=>{
    const id=e.target.dataset.imgfor; const file=e.target.files[0]; if(!file) return;
    setStatus('Bild wird verarbeitet …');
    try{
      const data=await fileToResizedDataURL(file);
      const r=state.recipes.filter(x=>x.id===id)[0];
      if(r){ imageCache[id]=data; r.hasImage=true; saveImage(id,data); saveRecipes(); renderRecipeList(); }
      setStatus('Bild gespeichert ✓'); setTimeout(()=>setStatus(''),1200);
    }catch(err){ setStatus('Das Bild ließ sich nicht laden. Versuch ein anderes Format.'); setTimeout(()=>setStatus(''),2500); }
    e.target.value='';
  }));
  Array.prototype.forEach.call(list.querySelectorAll('.rm-img'), b=>b.addEventListener('click', async e=>{
    const r=state.recipes.filter(x=>x.id===e.target.dataset.id)[0];
    if(r){ imageCache[r.id]=null; r.hasImage=false; deleteImage(r.id); saveRecipes(); renderRecipeList(); }
  }));

  Array.prototype.forEach.call(list.querySelectorAll('.add-to-week'), b=>b.addEventListener('click', e=>{
    e.currentTarget.closest('.recipe-item').classList.toggle('show-week-picker');
  }));
  Array.prototype.forEach.call(list.querySelectorAll('.wp-confirm'), b=>b.addEventListener('click', e=>{
    const panel = e.currentTarget.closest('.week-picker');
    const id = panel.dataset.id;
    const day = panel.querySelector('.wp-day').value;
    const slotId = panel.querySelector('.wp-slot').value;
    const wk = weekKeyOf(currentMonday);
    setPlanSlot(wk, day, slotId, id);
    const r = state.recipes.filter(x=>x.id===id)[0];
    panel.closest('.recipe-item').classList.remove('show-week-picker');
    renderDayTrack(); renderShop();
    showToast((r?r.name:'Eintrag')+' für '+day+' eingetragen');
  }));
}

/* =========================================================================
   12. Excel-Import / -Export
   ========================================================================= */
const UNITS = ['g','kg','mg','ml','l','cl','dl','stk','stück','stueck','el','tl','prise','prisen','bund','dose','dosen','packung','pck','pkg','scheibe','scheiben','zehe','zehen','tasse','tassen','becher','glas','kopf','stange','stangen','blatt','blätter','tropfen','msp'];
const UNIT_DISPLAY = {stk:'Stk','stück':'Stk',stueck:'Stk',el:'EL',tl:'TL',g:'g',kg:'kg',mg:'mg',ml:'ml',l:'l',cl:'cl',dl:'dl',prise:'Prise',prisen:'Prise',bund:'Bund',dose:'Dose',dosen:'Dose',packung:'Packung',pck:'Packung',pkg:'Packung',scheibe:'Scheibe',scheiben:'Scheibe',zehe:'Zehe',zehen:'Zehe',tasse:'Tasse',tassen:'Tasse',becher:'Becher',glas:'Glas',kopf:'Kopf',stange:'Stange',stangen:'Stange',blatt:'Blatt','blätter':'Blatt',tropfen:'Tropfen',msp:'Msp'};

function parseIngredient(line){
  let s = String(line||'').trim();
  if(!s) return null;
  let amount = 0, unit = '';
  const numMatch = s.match(/^(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?)\s*/);
  if(numMatch){
    const raw = numMatch[1];
    if(raw.indexOf('/')>=0){ const p=raw.split('/').map(x=>parseFloat(x.trim())); amount = p[1]? p[0]/p[1] : 0; }
    else amount = parseFloat(raw.replace(',','.'));
    s = s.slice(numMatch[0].length).trim();
  }
  const tok = s.split(/\s+/)[0] || '';
  const tokClean = tok.replace(/\.$/,'').toLowerCase();
  if(UNITS.indexOf(tokClean)>=0){ unit = UNIT_DISPLAY[tokClean] || tok; s = s.slice(tok.length).trim(); }
  const name = s.replace(/^[-–,:]\s*/,'').trim();
  if(!name) return null;
  return {name:name, amount:amount, unit:unit};
}
function ingredientsToText(list){
  return (list||[]).map(i=>[i.amount||'', i.unit||'', i.name].filter(Boolean).join(' ').trim()).join('; ');
}
function parseIngredientsCell(cell){
  return String(cell||'').split(/[;\n]/).map(parseIngredient).filter(Boolean);
}

const HEADER_MAP = {
  name:'name', rezept:'name', rezeptname:'name', gericht:'name',
  zutaten:'ing', zutat:'ing', 'zutatenliste':'ing',
  beschreibung:'desc', zubereitung:'desc', anleitung:'desc', notizen:'desc',
  portionen:'servings', portion:'servings', personen:'servings', servings:'servings', 'für personen':'servings',
  typ:'type', art:'type', kategorie:'type',
  kcal:'kcal', kalorien:'kcal', 'kcal/portion':'kcal', energie:'kcal',
  'eiweiß':'prot', eiweiss:'prot', protein:'prot',
  kohlenhydrate:'carbs', kh:'carbs', carbs:'carbs',
  fett:'fat'
};
function normHeader(h){
  return String(h||'').trim().toLowerCase().replace(/\s*\(g\)\s*$/,'').replace(/\s+/g,' ');
}
function setIoResult(msg, cls){
  const el=document.getElementById('ioResult');
  el.textContent=msg; el.className='io-result '+(cls||'');
}
function recipesToRows(list){
  return list.map(r=>({
    'Name': r.name,
    'Zutaten': ingredientsToText(r.ingredients),
    'Beschreibung': r.description||'',
    'Typ': r.type==='snack' ? 'Snack' : 'Rezept',
    'Portionen': r.servings||4,
    'kcal': r.kcal||'',
    'Eiweiß': r.prot||'',
    'Kohlenhydrate': r.carbs||'',
    'Fett': r.fat||''
  }));
}
function downloadWorkbook(rows, filename){
  if(typeof XLSX === 'undefined'){ setIoResult('Die Excel-Bibliothek fehlt. Lade die Seite neu, dann klappt es.','err'); return; }
  const ws = XLSX.utils.json_to_sheet(rows, {header:['Name','Zutaten','Beschreibung','Typ','Portionen','kcal','Eiweiß','Kohlenhydrate','Fett']});
  ws['!cols'] = [{wch:32},{wch:60},{wch:50},{wch:9},{wch:10},{wch:8},{wch:9},{wch:15},{wch:8}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rezepte');
  XLSX.writeFile(wb, filename);
}

document.getElementById('btnTemplate').addEventListener('click', ()=>{
  const example = [{
    id:'x', name:'Beispiel: Hähnchen mit Reis', type:'rezept', servings:4,
    ingredients:[{name:'Hähnchenbrust',amount:400,unit:'g'},{name:'Reis',amount:200,unit:'g'},{name:'Brokkoli',amount:300,unit:'g'},{name:'Sojasauce',amount:2,unit:'EL'}],
    description:'Reis kochen, Hähnchen anbraten, Brokkoli dämpfen, alles vermengen.',
    kcal:520, prot:38, carbs:52, fat:14
  },{
    id:'y', name:'Beispiel: Kindergarten-Brotzeit', type:'snack', servings:1,
    ingredients:[{name:'Apfel',amount:1,unit:'Stk'},{name:'Vollkornbrot',amount:2,unit:'Scheibe'},{name:'Frischkäse',amount:20,unit:'g'}],
    description:'', kcal:0, prot:0, carbs:0, fat:0
  }];
  downloadWorkbook(recipesToRows(example), 'Rezepte-Vorlage.xlsx');
  setIoResult('Vorlage heruntergeladen.','ok');
});
document.getElementById('btnExport').addEventListener('click', ()=>{
  if(!state.recipes.length){ setIoResult('Es gibt noch keine Rezepte zum Exportieren.','err'); return; }
  const d=new Date(), stamp=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  downloadWorkbook(recipesToRows(state.recipes), 'Rezepte-'+stamp+'.xlsx');
  setIoResult(state.recipes.length+' Rezepte exportiert.','ok');
});

document.getElementById('fileInput').addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  if(typeof XLSX === 'undefined'){ setIoResult('Die Excel-Bibliothek fehlt. Lade die Seite neu, dann klappt es.','err'); return; }
  setIoResult('Datei wird gelesen …','');
  try{
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, {type:'array'});
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, {defval:''});
    if(!raw.length){ setIoResult('Die Datei enthält keine Zeilen.','err'); e.target.value=''; return; }

    const imported = [];
    raw.forEach(row=>{
      const rec = {name:'', ing:'', desc:'', servings:'', type:'', kcal:0, prot:0, carbs:0, fat:0};
      Object.keys(row).forEach(k=>{
        const field = HEADER_MAP[normHeader(k)];
        if(field) rec[field] = row[k];
      });
      const name = String(rec.name||'').trim();
      if(!name) return;
      const serv = parseFloat(String(rec.servings).replace(',','.'));
      const typ = String(rec.type||'').toLowerCase().indexOf('snack') >= 0 ? 'snack' : 'rezept';
      imported.push({
        id:'r'+Date.now()+Math.random().toString(36).slice(2,7),
        name: name, type: typ,
        servings: (serv && serv>0) ? serv : (typ==='snack' ? 1 : 4),
        ingredients: parseIngredientsCell(rec.ing),
        description: String(rec.desc||'').trim(),
        kcal: parseFloat(String(rec.kcal).replace(',','.'))||0,
        prot: parseFloat(String(rec.prot).replace(',','.'))||0,
        carbs: parseFloat(String(rec.carbs).replace(',','.'))||0,
        fat: parseFloat(String(rec.fat).replace(',','.'))||0
      });
    });

    if(!imported.length){
      setIoResult('Keine gültigen Rezepte gefunden. Prüfe, ob es eine Spalte „Name“ gibt.','err');
      e.target.value=''; return;
    }

    const mode = document.querySelector('input[name=impMode]:checked').value;
    let added=0, updated=0;
    if(mode==='replace'){
      state.recipes = imported; added = imported.length;
    } else {
      imported.forEach(ni=>{
        let idx = -1;
        for(let i=0;i<state.recipes.length;i++){
          if(state.recipes[i].name.toLowerCase().trim() === ni.name.toLowerCase().trim()){ idx=i; break; }
        }
        if(idx>=0){
          ni.id = state.recipes[idx].id;
          ni.hasImage = !!state.recipes[idx].hasImage;   // Bild behalten
          state.recipes[idx] = ni; updated++;
        } else { state.recipes.push(ni); added++; }
      });
    }
    saveRecipes();
    renderAll();
    setIoResult(
      mode==='replace'
        ? imported.length+' Rezepte importiert, die alten sind ersetzt.'
        : added+' neu hinzugefügt, '+updated+' aktualisiert.',
      'ok'
    );
    document.getElementById('recSectionHead').closest('.collapse-section').classList.remove('collapsed');
  }catch(err){
    setIoResult('Die Datei ließ sich nicht lesen: '+err.message,'err');
  }
  e.target.value='';
});

/* =========================================================================
   13. Neues-Rezept-Panel
   ========================================================================= */
const addPanel=document.getElementById('addPanel');
const ioPanel=document.getElementById('ioPanel');
function openAddPanel(){ ioPanel.style.display='none'; addPanel.style.display='block'; addPanel.scrollIntoView({behavior:'smooth',block:'start'}); document.getElementById('r-name').focus(); }
function closeAddPanel(){ addPanel.style.display='none'; resetAddForm(); }
function resetAddForm(){
  editingRecipeId = null;
  const rezeptRadio = document.querySelector('input[name=rType][value="rezept"]');
  if(rezeptRadio) rezeptRadio.checked = true;
  ['r-name','r-tags','r-description','r-kcal','r-protein-g','r-carbs-g','r-fat-g'].forEach(id=>{ document.getElementById(id).value=''; });
  document.getElementById('ingRows').innerHTML=''; addIngRow();
  pendingImage=null; document.getElementById('addImgPreview').innerHTML='';
  syncTypFelder();
  document.getElementById('addPanelTitle').textContent = 'Neues Rezept';
  document.getElementById('saveRecipe').textContent = 'Rezept speichern';
}
async function openEditRecipe(id){
  const r = state.recipes.filter(x=>x.id===id)[0];
  if(!r) return;
  editingRecipeId = id;
  const radio = document.querySelector('input[name=rType][value="'+(istSnack(r)?'snack':'rezept')+'"]');
  if(radio) radio.checked = true;
  syncTypFelder();
  document.getElementById('r-name').value = r.name || '';
  document.getElementById('r-servings').value = r.servings || (istSnack(r) ? 1 : 4);
  document.getElementById('r-tags').value = (r.tags||[]).join(', ');
  document.getElementById('r-description').value = r.description || '';
  document.getElementById('r-kcal').value = r.kcal || '';
  document.getElementById('r-protein-g').value = r.prot || '';
  document.getElementById('r-carbs-g').value = r.carbs || '';
  document.getElementById('r-fat-g').value = r.fat || '';
  document.getElementById('ingRows').innerHTML = '';
  (r.ingredients||[]).forEach(ing=>addIngRow(ing));
  if(!(r.ingredients||[]).length) addIngRow();
  pendingImage = null;
  if(r.hasImage && imageCache[id] === undefined){ await loadImage(id); }
  document.getElementById('addImgPreview').innerHTML = (r.hasImage && imgOf(r)) ? '<img src="'+imgOf(r)+'" alt="Vorschau">' : '';
  document.getElementById('addPanelTitle').textContent = 'Rezept bearbeiten';
  document.getElementById('saveRecipe').textContent = 'Änderungen speichern';
  openAddPanel();
}
document.getElementById('openAdd').addEventListener('click', ()=>{ addPanel.style.display==='none' ? openAddPanel() : closeAddPanel(); });
document.getElementById('closeAdd').addEventListener('click', closeAddPanel);
document.getElementById('openIO').addEventListener('click', ()=>{
  if(ioPanel.style.display==='none'){
    addPanel.style.display='none'; ioPanel.style.display='block'; setIoResult('','');
    ioPanel.scrollIntoView({behavior:'smooth',block:'start'});
  } else { ioPanel.style.display='none'; }
});
document.getElementById('closeIO').addEventListener('click', ()=>{ ioPanel.style.display='none'; });
document.getElementById('recSearch').addEventListener('input', e=>{
  recipeQuery = e.target.value.trim();
  renderRecipeList();
});
document.getElementById('favOnlyToggle').addEventListener('click', ()=>{
  favOnly = !favOnly;
  renderRecipeList();
});
document.getElementById('recSectionHead').addEventListener('click', ()=>{
  document.getElementById('recSectionHead').closest('.collapse-section').classList.toggle('collapsed');
});

let ingRowCount=0;
let pendingImage=null;
let editingRecipeId=null;   // gesetzt, solange das Formular ein bestehendes Rezept bearbeitet

function aktuellerTyp(){
  const el = document.querySelector('input[name=rType]:checked');
  return el ? el.value : 'rezept';
}
function syncTypFelder(){
  const snack = aktuellerTyp() === 'snack';
  Array.prototype.forEach.call(document.querySelectorAll('#addPanel .only-rezept'), el=>{
    el.style.display = snack ? 'none' : '';
  });
  document.getElementById('r-name').placeholder = snack
    ? 'z. B. Kindergarten-Brotzeit' : 'z. B. Ofengemüse mit Feta';
  document.getElementById('r-servings').value = snack ? '1' : '4';
}
Array.prototype.forEach.call(document.querySelectorAll('input[name=rType]'), el=>
  el.addEventListener('change', syncTypFelder));
document.getElementById('r-image-input').addEventListener('change', async e=>{
  const file=e.target.files[0]; if(!file) return;
  setStatus('Bild wird verarbeitet …');
  try{
    pendingImage=await fileToResizedDataURL(file);
    document.getElementById('addImgPreview').innerHTML='<img src="'+pendingImage+'" alt="Vorschau">';
    setStatus('');
  }catch(err){ setStatus('Das Bild ließ sich nicht laden. Versuch ein anderes Format.'); setTimeout(()=>setStatus(''),2500); }
});
function refreshIngNameDatalist(){
  const dl = document.getElementById('ingNames');
  if(!dl) return;
  const names = allIngredientNames();
  dl.innerHTML = Object.keys(names).map(k=>'<option value="'+escapeHtml(names[k])+'">').join('');
}
function addIngRow(pref){
  refreshIngNameDatalist();
  const c=document.getElementById('ingRows');
  const id='ir'+(ingRowCount++);
  const row=document.createElement('div');
  row.className='ing-input-row'; row.id=id;
  row.innerHTML=
    '<input class="in-name" list="ingNames" placeholder="Zutat" value="'+(pref?escapeHtml(pref.name):'')+'">' +
    '<input class="in-amt" type="number" step="any" placeholder="Menge" value="'+(pref?pref.amount:'')+'">' +
    '<input class="in-unit" list="units" placeholder="Einheit" value="'+(pref?escapeHtml(pref.unit):'')+'">' +
    '<button type="button" class="x" aria-label="Zeile entfernen">✕</button>';
  row.querySelector('.x').addEventListener('click',()=>row.remove());
  c.appendChild(row);
}
document.getElementById('addIngRow').addEventListener('click',()=>addIngRow());

function ingRowsToIngredients(){
  return Array.prototype.map.call(document.querySelectorAll('#ingRows .ing-input-row'), row=>({
    name: row.querySelector('.in-name').value.trim(),
    amount: parseFloat(row.querySelector('.in-amt').value)||0,
    unit: row.querySelector('.in-unit').value.trim()
  })).filter(i=>i.name);
}
document.getElementById('calcNutri').addEventListener('click', ()=>{
  const ingredients = ingRowsToIngredients();
  if(!ingredients.length){ showToast('Erst Zutaten eintragen, dann berechnen.'); return; }
  const n = computeRecipeNutrition(ingredients);
  document.getElementById('r-kcal').value = n.kcal;
  document.getElementById('r-protein-g').value = n.prot;
  document.getElementById('r-carbs-g').value = n.carbs;
  document.getElementById('r-fat-g').value = n.fat;
  showToast(n.unbekannt ? 'Berechnet — '+n.unbekannt+' Zutat(en) nicht erkannt, Werte ggf. unvollständig' : 'Nährwerte berechnet ✓');
});

document.getElementById('saveRecipe').addEventListener('click', async ()=>{
  const name=document.getElementById('r-name').value.trim();
  if(!name){ feldFehler(document.getElementById('r-name'), 'Ohne Namen lässt sich das Rezept später nicht wiederfinden.'); return; }
  const ingredients = ingRowsToIngredients();
  const serv = parseInt(document.getElementById('r-servings').value,10);
  const typ = aktuellerTyp();
  let kcalIn  = parseFloat(document.getElementById('r-kcal').value)||0;
  let protIn  = parseFloat(document.getElementById('r-protein-g').value)||0;
  let carbsIn = parseFloat(document.getElementById('r-carbs-g').value)||0;
  let fatIn   = parseFloat(document.getElementById('r-fat-g').value)||0;
  // Nichts eingetragen? Dann aus den Zutaten schätzen, statt einfach bei 0 zu bleiben.
  if(typ!=='snack' && !kcalIn && !protIn && !carbsIn && !fatIn && ingredients.length){
    const n = computeRecipeNutrition(ingredients);
    kcalIn=n.kcal; protIn=n.prot; carbsIn=n.carbs; fatIn=n.fat;
  }
  const bestehend = editingRecipeId ? state.recipes.filter(x=>x.id===editingRecipeId)[0] : null;
  const id = bestehend ? bestehend.id : 'r'+Date.now();
  const eintrag = {
    id:id, name:name, ingredients:ingredients, type:typ,
    servings: (serv && serv>0) ? serv : (typ==='snack' ? 1 : 4),
    tags: parseTags(document.getElementById('r-tags').value),
    description: typ==='snack' ? '' : document.getElementById('r-description').value.trim(),
    hasImage: typ==='snack' ? false : (pendingImage ? true : !!(bestehend && bestehend.hasImage)),
    fav: bestehend ? !!bestehend.fav : false,
    kcal: typ==='snack' ? 0 : kcalIn,
    prot: typ==='snack' ? 0 : protIn,
    carbs:typ==='snack' ? 0 : carbsIn,
    fat:  typ==='snack' ? 0 : fatIn
  };
  if(bestehend){
    state.recipes[state.recipes.indexOf(bestehend)] = eintrag;
  } else {
    state.recipes.push(eintrag);
  }
  if(pendingImage){ imageCache[id] = pendingImage; saveImage(id, pendingImage); }
  saveRecipes();
  const warBearbeitung = !!bestehend;
  closeAddPanel();
  document.getElementById('recSectionHead').closest('.collapse-section').classList.remove('collapsed');
  renderAll();
  setStatus(warBearbeitung ? 'Änderungen gespeichert ✓' : 'Rezept gespeichert ✓'); setTimeout(()=>setStatus(''),1500);
});

/* =========================================================================
   13b. Rezept-Import (Link / Text / Foto) über die Cloudflare-Function
   ========================================================================= */
const importPanel = document.getElementById('importPanel');
let importImageDataUrl = null;    // hohe Auflösung, geht an Claude
let importImageThumbUrl = null;   // 600 px, wird als Rezeptbild gespeichert
function openImportPanel(){
  addPanel.style.display='none'; ioPanel.style.display='none';
  importPanel.style.display='block'; setImportResult('','');
  importPanel.scrollIntoView({behavior:'smooth',block:'start'});
}
function closeImportPanel(){ importPanel.style.display='none'; }
function setImportResult(msg, cls){
  const el=document.getElementById('importResult');
  el.textContent = msg; el.className = 'io-result'+(cls?(' '+cls):'');
}
document.getElementById('openImport').addEventListener('click', ()=>{
  importPanel.style.display==='none' ? openImportPanel() : closeImportPanel();
});
document.getElementById('closeImport').addEventListener('click', closeImportPanel);
Array.prototype.forEach.call(document.querySelectorAll('input[name=impSrc]'), el=>
  el.addEventListener('change', ()=>{
    const mode = document.querySelector('input[name=impSrc]:checked').value;
    document.querySelector('.imp-src-url').style.display = mode==='url' ? '' : 'none';
    document.querySelector('.imp-src-text').style.display = mode==='text' ? '' : 'none';
    document.querySelector('.imp-src-image').style.display = mode==='image' ? '' : 'none';
  }));
document.getElementById('imp-image-input').addEventListener('change', async e=>{
  const file=e.target.files[0]; if(!file) return;
  setImportResult('Foto wird verarbeitet …','');
  try{
    // Zum Ablesen von gedrucktem Text braucht es mehr Auflösung als fürs Rezeptbild:
    // 1400 px zum Vorlesen an Claude, 600 px als gespeichertes Bild.
    importImageDataUrl  = await fileToResizedDataURL(file, 1400, 0.8);
    importImageThumbUrl = await fileToResizedDataURL(file);
    document.getElementById('impImgPreview').innerHTML = '<img src="'+importImageThumbUrl+'" alt="Vorschau">';
    setImportResult('','');
  }catch(err){ setImportResult('Das Foto ließ sich nicht laden. Versuch ein anderes Format.','err'); }
});
/* Verkleinert ein Bild, das schon als Data-URL vorliegt (z. B. vom Server geholtes
   Vorschaubild) — analog zu fileToResizedDataURL, nur ohne FileReader davor. */
function dataUrlToResized(dataUrl, maxDim, quality){
  maxDim = maxDim || 600; quality = quality || 0.68;
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width, h=img.height;
      if(w>=h && w>maxDim){ h=Math.round(h*maxDim/w); w=maxDim; }
      else if(h>w && h>maxDim){ w=Math.round(w*maxDim/h); h=maxDim; }
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror=reject; img.src=dataUrl;
  });
}
function uebernehmeImportiertesRezept(r, bildDataUrl, quelle){
  resetAddForm();
  document.getElementById('r-name').value = r.name || '';
  document.getElementById('r-servings').value = r.servings || 4;
  document.getElementById('r-tags').value = r.tags || '';
  let besch = r.description || '';
  if(quelle){ besch = (besch ? besch.replace(/\s+$/,'') + '\n\n' : '') + 'Quelle: ' + quelle; }
  document.getElementById('r-description').value = besch;
  const ingredients = parseIngredientsCell(r.ingredients_text);
  document.getElementById('ingRows').innerHTML = '';
  ingredients.forEach(ing=>addIngRow(ing));
  if(!ingredients.length) addIngRow();
  if(r.kcal) document.getElementById('r-kcal').value = r.kcal;
  if(r.protein_g) document.getElementById('r-protein-g').value = r.protein_g;
  if(r.carbs_g) document.getElementById('r-carbs-g').value = r.carbs_g;
  if(r.fat_g) document.getElementById('r-fat-g').value = r.fat_g;
  if(bildDataUrl){
    pendingImage = bildDataUrl;
    document.getElementById('addImgPreview').innerHTML = '<img src="'+bildDataUrl+'" alt="Vorschau">';
  }
  openAddPanel();
  showToast('Rezept eingelesen — bitte prüfen und speichern ✓');
}
document.getElementById('startImport').addEventListener('click', async ()=>{
  const mode = document.querySelector('input[name=impSrc]:checked').value;
  const body = {mode: mode};
  if(mode==='url'){
    const url = document.getElementById('imp-url').value.trim();
    if(!url){ setImportResult('Erst einen Link eintragen.','err'); feldFehler(document.getElementById('imp-url')); return; }
    body.url = url;
  } else if(mode==='text'){
    const text = document.getElementById('imp-text').value.trim();
    if(!text){ setImportResult('Erst Text einfügen.','err'); feldFehler(document.getElementById('imp-text')); return; }
    body.text = text;
  } else if(mode==='image'){
    if(!importImageDataUrl){ setImportResult('Erst ein Foto auswählen.','err'); return; }
    body.imageDataUrl = importImageDataUrl;
  }

  /* IA-12 — Abgleich gegen vorhandene Schreibweisen.
     Der Import ist die groesste Dublettenquelle, weil er Namen erfindet, die es
     im Haushalt noch nicht gibt (Kuerbis/Kuerbisse, Mayo/Mayonnaise). Deshalb
     bekommt er die bereits benutzten Namen mit und soll sie uebernehmen statt
     neue zu bilden. normKey entdoppelt schon, der Anzeigename ist der erste
     gefundene. Deckel bei 400 Namen: mehr kostet Tokens ohne Nutzen, und wer
     400 verschiedene Zutaten hat, hat die haeufigen laengst dabei. */
  body.bekannteZutaten = Object.values(allIngredientNames())
    .sort((a,b)=>a.localeCompare(b,'de'))
    .slice(0,400);

  if(!auth.currentUser){ setImportResult('Bitte kurz warten, bis die Anmeldung fertig ist.','err'); return; }

  const btn = document.getElementById('startImport');
  btn.disabled = true;
  setImportResult('Rezept wird gelesen … das kann ein paar Sekunden dauern.','');
  try{
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch('/api/import-recipe', {
      method:'POST',
      headers:{'content-type':'application/json', 'authorization':'Bearer '+idToken},
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if(!data.ok){ setImportResult(data.error || 'Konnte kein Rezept erkennen.','err'); return; }

    // Bild: beim Foto-Import das eigene, sonst das vom Server geholte Vorschaubild
    let bild = null;
    if(mode==='image'){
      bild = importImageThumbUrl;
    } else if(data.recipe.image_data_url){
      try{ bild = await dataUrlToResized(data.recipe.image_data_url); }
      catch(e){ bild = null; }   // kaputtes Bild darf den Import nicht kippen
    }

    uebernehmeImportiertesRezept(data.recipe, bild, mode==='url' ? body.url : null);

    // Eingaben leeren — der Link steht ab jetzt unten in der Beschreibung
    document.getElementById('imp-url').value = '';
    document.getElementById('imp-text').value = '';
    document.getElementById('impImgPreview').innerHTML = '';
    document.getElementById('imp-image-input').value = '';
    importImageDataUrl = null; importImageThumbUrl = null;
    setImportResult('','');
    closeImportPanel();

    if(typeof data.uebrig === 'number'){
      showToast('Rezept eingelesen — noch ' + data.uebrig + ' Importe heute übrig');
    }
  } catch(err){
    setImportResult('Verbindung zum Server fehlgeschlagen.','err');
  } finally {
    btn.disabled = false;
  }
});

/* =========================================================================
   14. Toast mit Rückgängig
   ========================================================================= */
let toastTimer=null, toastUndo=null;
function showToast(text, undoFn){
  const t=document.getElementById('toast');
  document.getElementById('toastText').textContent=text;
  const btn=document.getElementById('toastAction');
  toastUndo = undoFn || null;
  btn.style.display = undoFn ? 'block' : 'none';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{ t.classList.remove('show'); toastUndo=null; }, 6000);
}
document.getElementById('toastAction').addEventListener('click', async ()=>{
  if(toastUndo){
    const fn=toastUndo; toastUndo=null;
    document.getElementById('toast').classList.remove('show');
    await fn();
  }
});

/* =========================================================================
   15. Einkaufsliste
   ========================================================================= */
const MASS={g:1,kg:1000,mg:0.001}, VOL={ml:1,l:1000,cl:10,dl:100};
function unitFamily(u){
  const k=(u||'').toLowerCase();
  if(MASS[k]!==undefined) return {fam:'mass', factor:MASS[k]};
  if(VOL[k]!==undefined)  return {fam:'vol',  factor:VOL[k]};
  return {fam:'unit:'+(k||'stk'), factor:1};
}
function trim(n){ return (Math.round(n*100)/100).toString().replace('.',','); }
function fmtQty(fam,base,unit){
  if(fam==='mass') return base>=1000 ? trim(base/1000)+' kg' : trim(base)+' g';
  if(fam==='vol')  return base>=1000 ? trim(base/1000)+' l'  : trim(base)+' ml';
  // ganze Stücke aufrunden — eine halbe Zwiebel kauft man nicht
  const v = (fam==='unit:stk') ? Math.ceil(base) : base;
  return trim(v)+(unit ? ' '+unit : ' Stk');
}

function buildItems(wk){
  const weekPlan = state.plan[wk] || {};
  state.checked[wk] = state.checked[wk] || {};
  state.removed[wk] = state.removed[wk] || {};
  state.qty[wk]     = state.qty[wk]     || {};

  const agg = {};
  let planned = 0;

  Object.keys(weekPlan).forEach(day=>{
    const eintraege = weekPlan[day] || {};
    SLOTS.forEach(sl=>{
    const entry = eintraege[sl.id];
    if(!istKochEintrag(entry)) return;          // Reste und auswärts zählen nicht
    if(!slotCfg(sl.id).on) return;              // abgeschaltete Mahlzeit ignorieren
    const r = state.recipes.filter(x=>x.id===entry.id)[0];
    if(!r) return;
    planned++;
    const base = r.servings || 4;
    const pers = entry.servings || slotCfg(sl.id).personen;
    const f = base > 0 ? pers/base : 1;
    (r.ingredients||[]).forEach(ing=>{
      const key = normKey(ing.name);
      if(!key) return;
      if(state.excluded.indexOf(key) >= 0) return;
      if(state.removed[wk][key]) return;
      if(!agg[key]) agg[key] = {key:key, name:ing.name, units:{}};
      const uf = unitFamily(ing.unit);
      if(!agg[key].units[uf.fam]) agg[key].units[uf.fam] = {fam:uf.fam, base:0, unit:ing.unit};
      agg[key].units[uf.fam].base += (ing.amount||0)*uf.factor*f;
    });
    });
  });

  const items = Object.keys(agg).map(k=>{
    const it = agg[k];
    const auto = Object.keys(it.units).map(f=>fmtQty(it.units[f].fam, it.units[f].base, it.units[f].unit)).join(' + ');
    return {
      key: it.key, kind:'recipe', name: it.name,
      qty: state.qty[wk][it.key] || auto,
      edited: !!state.qty[wk][it.key],
      cat: categoryOf(it.name),
      market: marketOf(it.name),
      checked: !!state.checked[wk][it.key]
    };
  });

  (state.extras||[]).forEach(x=>{
    if(!x.recurring && x.doneWk && x.doneWk !== wk) return;
    items.push({
      key: 'x|'+x.id, kind:'extra', name: x.name,
      qty: x.qty || '', edited: false, recurring: !!x.recurring, from: x.from || null,
      cat: x.cat || guessCategory(x.name),
      market: x.market || marketOf(x.name),
      checked: x.recurring ? !!state.checked[wk]['x|'+x.id] : (x.doneWk === wk)
    });
  });

  items.sort((a,b)=>a.name.localeCompare(b.name,'de'));
  return {items:items, planned:planned};
}

/* =========================================================================
   15b. Nährwerte-Report
   ========================================================================= */
function computeDayNutrition(wk, day){
  const eintraege = (state.plan[wk]||{})[day] || {};
  const out = {totalKcal:0,totalProt:0,totalCarbs:0,totalFat:0,perPersonKcal:0,perPersonProt:0,perPersonCarbs:0,perPersonFat:0};
  SLOTS.forEach(sl=>{
    const entry = eintraege[sl.id];
    if(!istKochEintrag(entry)) return;
    if(!slotCfg(sl.id).on) return;
    const r = state.recipes.filter(x=>x.id===entry.id)[0];
    if(!r) return;
    const base = r.servings || 4;
    const pers = entry.servings || slotCfg(sl.id).personen;
    const f = base > 0 ? pers/base : 1;
    out.totalKcal  += (r.kcal||0)*f;
    out.totalProt  += (r.prot||0)*f;
    out.totalCarbs += (r.carbs||0)*f;
    out.totalFat   += (r.fat||0)*f;
    const proPortion = base > 0 ? 1/base : 1;   // Anteil einer einzelnen Portion am Rezept
    out.perPersonKcal  += (r.kcal||0)*proPortion;
    out.perPersonProt  += (r.prot||0)*proPortion;
    out.perPersonCarbs += (r.carbs||0)*proPortion;
    out.perPersonFat   += (r.fat||0)*proPortion;
  });
  return out;
}
function nutriPortionsFor(wk, day){
  const v = (state.nutriPortions[wk]||{})[day];
  return (typeof v === 'number' && v > 0) ? v : 1;
}
function renderNutritionReport(){
  const wk = weekKeyOf(currentMonday);
  const label = document.getElementById('nutriWeekLabel');
  if(!label) return;   // Tab noch nicht im DOM (z. B. beim allerersten Render)
  label.textContent = 'Nährwerte · KW '+isoWeek(currentMonday).week;

  const rows = DAYS.map(day=>({day:day, d:computeDayNutrition(wk, day), portionen:nutriPortionsFor(wk, day)}));
  const sum = rows.reduce((acc,row)=>{
    const f = row.portionen;
    acc.totalKcal += row.d.totalKcal; acc.totalProt += row.d.totalProt; acc.totalCarbs += row.d.totalCarbs; acc.totalFat += row.d.totalFat;
    acc.eigenKcal  += row.d.perPersonKcal  * f;
    acc.eigenProt  += row.d.perPersonProt  * f;
    acc.eigenCarbs += row.d.perPersonCarbs * f;
    acc.eigenFat   += row.d.perPersonFat   * f;
    return acc;
  }, {totalKcal:0,totalProt:0,totalCarbs:0,totalFat:0,eigenKcal:0,eigenProt:0,eigenCarbs:0,eigenFat:0});

  document.getElementById('nutriDays').innerHTML = rows.map(row=>{
    const hat = row.d.totalKcal > 0;
    const f = row.portionen;
    return '<div class="nutri-day-row'+(hat?'':' empty')+'">' +
      '<div class="nutri-day-label">'+row.day+'</div>' +
      '<div class="nutri-day-vals">' +
        '<span>'+Math.round(row.d.totalKcal)+' kcal gesamt</span>' +
        '<span>'+Math.round(row.d.perPersonKcal*f)+' kcal bei deinen Portionen</span>' +
        '<span>E '+Math.round(row.d.perPersonProt*f)+' g</span>' +
        '<span>KH '+Math.round(row.d.perPersonCarbs*f)+' g</span>' +
        '<span>F '+Math.round(row.d.perPersonFat*f)+' g</span>' +
      '</div>' +
      '<div class="nutri-portion-row">' +
        '<label>Portionen an diesem Tag: <input type="number" class="nutri-portion-input" data-day="'+row.day+'" min="0" step="0.5" value="'+f+'"></label>' +
      '</div>' +
    '</div>';
  }).join('');

  const activeDays = rows.filter(row=>row.d.totalKcal > 0).length || 1;
  document.getElementById('nutriWeekSum').innerHTML =
    '<div class="nutri-week-total"><strong>Gesamt (Haushalt):</strong> '+Math.round(sum.totalKcal)+' kcal · E '+Math.round(sum.totalProt)+' g · KH '+Math.round(sum.totalCarbs)+' g · F '+Math.round(sum.totalFat)+' g</div>' +
    '<div class="nutri-week-total"><strong>Bei deinen Portionen:</strong> '+Math.round(sum.eigenKcal)+' kcal · E '+Math.round(sum.eigenProt)+' g · KH '+Math.round(sum.eigenCarbs)+' g · F '+Math.round(sum.eigenFat)+' g</div>' +
    '<div class="nutri-week-avg">Ø pro Tag: '+Math.round(sum.eigenKcal/activeDays)+' kcal · E '+Math.round(sum.eigenProt/activeDays)+' g · KH '+Math.round(sum.eigenCarbs/activeDays)+' g · F '+Math.round(sum.eigenFat/activeDays)+' g</div>';

  Array.prototype.forEach.call(document.querySelectorAll('.nutri-portion-input'), inp=>inp.addEventListener('change', e=>{
    const day = e.currentTarget.dataset.day;
    const v = parseFloat(e.currentTarget.value);
    const val = (v && v>0) ? v : 1;
    state.nutriPortions[wk] = state.nutriPortions[wk] || {};
    state.nutriPortions[wk][day] = val;
    saveNutriPortions(wk, day, val);
    renderNutritionReport();
  }));
}

/* Leert die "Erledigt"-Gruppe der Einkaufsliste, damit sie sich nicht endlos füllt:
   einmalige eigene Einträge werden ganz gelöscht, aus Rezepten stammende Zutaten werden
   für diese Woche als "entfernt" markiert (wie beim einzelnen 🗑). Wiederkehrende
   "jede Woche wieder"-Einträge bleiben unangetastet, die setzen sich ohnehin wöchentlich zurück. */
function leereErledigte(wk, doneItems){
  const removedKeys = [];
  const backupExtras = [];
  doneItems.forEach(it=>{
    if(it.kind==='recipe'){
      if(!state.removed[wk][it.key]){
        state.removed[wk][it.key] = true;
        saveRemoved(wk, it.key, true);
        removedKeys.push(it.key);
      }
    } else if(it.kind==='extra' && !it.recurring){
      const idx = state.extras.findIndex(x=>('x|'+x.id)===it.key);
      if(idx>=0){
        backupExtras.push(state.extras[idx]);
        state.extras.splice(idx,1);
      }
    }
  });
  if(backupExtras.length) saveExtras();
  const anzahl = removedKeys.length + backupExtras.length;
  renderShop();
  if(!anzahl){ showToast('Nichts zu leeren — wiederkehrende Einträge bleiben stehen.'); return; }
  showToast(anzahl+' Erledigte geleert', ()=>{
    removedKeys.forEach(k=>{ delete state.removed[wk][k]; saveRemoved(wk, k, false); });
    if(backupExtras.length){ state.extras = state.extras.concat(backupExtras); saveExtras(); }
    renderShop();
  });
}

function renderShop(){
  const wk = weekKeyOf(currentMonday);
  document.getElementById('shopWeekLabel').textContent = 'Einkaufsliste · KW '+isoWeek(currentMonday).week;
  /* Der Artikelstamm zeigt an jeder Zeile, ob sie schon auf der Liste steht —
     er muss also mitziehen, sobald sich die Liste ändert. Abgeschirmt, damit
     eine Zusatzansicht nie die Einkaufsliste mitreißt (Kapitel 2.6, Regel 2). */
  try{ renderArtikel(); }catch(e){ console.warn('Artikelstamm konnte nicht gezeichnet werden:', e); }

  const box = document.getElementById('shopGroups');
  const emptyMsg = document.getElementById('shopEmpty');
  const swipeHint = document.getElementById('swipeHint');
  const built = buildItems(wk);
  const items = built.items;

  if(!items.length){
    box.innerHTML=''; swipeHint.style.display='none'; emptyMsg.style.display='block';
    emptyMsg.textContent = built.planned
      ? 'Alles abgehakt oder ausgeschlossen. Schöne Woche.'
      : 'Für diese Woche ist noch nichts geplant. Wähl im Wochenplan ein paar Gerichte.';
    const ms = document.getElementById('shopMarketSummary'); ms.style.display='none'; ms.innerHTML='';
    return;
  }
  emptyMsg.style.display='none'; swipeHint.style.display='block';

  const open = items.filter(i=>!i.checked);
  const done = items.filter(i=>i.checked);

  const marketSummary = document.getElementById('shopMarketSummary');
  const laeden = [];
  open.forEach(i=>{ if(i.market && laeden.indexOf(i.market)<0) laeden.push(i.market); });
  laeden.sort((a,b)=>a.localeCompare(b,'de'));
  if(laeden.length){
    marketSummary.style.display = 'block';
    marketSummary.innerHTML = '🏬 <strong>Läden für die offene Liste:</strong> '+laeden.map(escapeHtml).join(' · ');
  } else {
    marketSummary.style.display = 'none';
    marketSummary.innerHTML = '';
  }

  const itemHtml = it =>
    '<li class="shop-item '+(it.checked?'checked':'')+'" data-key="'+escapeHtml(it.key)+'">' +
      '<div class="shop-inner">' +
        '<input type="checkbox" '+(it.checked?'checked':'')+' aria-label="'+escapeHtml(it.name)+' abhaken">' +
        '<button class="name-btn" type="button">'+escapeHtml(it.name)+
          (it.kind==='extra' && it.recurring ? '<span class="rep-badge">jede Woche</span>' : '')+
          (it.market ? '<span class="market-badge">🏬 '+escapeHtml(it.market)+'</span>' : '')+
        '</button>' +
        /* B2 — „jede Woche wieder" wird dort umgelegt, wo man es merkt:
           an der Zeile. Das frühere Formular „Eigene Einträge" ist entfallen. */
        (it.kind==='extra'
          ? '<button class="rep-btn'+(it.recurring?' an':'')+'" type="button" aria-pressed="'+(it.recurring?'true':'false')+'" title="Jede Woche wieder auf die Liste" aria-label="'+escapeHtml(it.name)+' jede Woche wieder">↻</button>'
          : '') +
        '<button class="qty-btn '+(it.edited?'edited':'')+' '+(it.qty?'':'empty')+'" type="button">'+escapeHtml(it.qty || 'Menge')+'</button>' +
        '<button class="del-item" type="button" title="Löschen" aria-label="'+escapeHtml(it.name)+' löschen">🗑</button>' +
      '</div>' +
      '<div class="cat-picker">' +
        orderedCats().map(c=>'<button class="cat-opt '+(c.id===it.cat?'on':'')+'" type="button" data-cat="'+c.id+'">'+c.icon+' '+c.label+'</button>').join('') +
      '</div>' +
    '</li>';

  let html = '';
  orderedCats().forEach(c=>{
    const group = open.filter(i=>i.cat===c.id);
    if(!group.length) return;
    html += '<div class="cat-group">' +
      '<div class="cat-title">'+c.icon+' '+c.label+'<span class="cat-n">'+group.length+'</span></div>' +
      '<ul class="shop-list">'+group.map(itemHtml).join('')+'</ul></div>';
  });
  if(done.length){
    html += '<div class="cat-group done">' +
      '<div class="cat-title">✓ Erledigt' +
        '<button class="btn btn-ghost btn-loeschen btn-sm clear-done-btn" type="button" style="margin-left:auto;">🗑 Erledigte leeren</button>' +
        '<span class="cat-n">'+done.length+'</span>' +
      '</div>' +
      '<ul class="shop-list">'+done.map(itemHtml).join('')+'</ul></div>';
  }
  box.innerHTML = html;

  const clearDoneBtn = box.querySelector('.clear-done-btn');
  if(clearDoneBtn) clearDoneBtn.addEventListener('click', ()=>leereErledigte(wk, done));

  const byKey = {}; items.forEach(i=>{ byKey[i.key]=i; });

  Array.prototype.forEach.call(box.querySelectorAll('.shop-item'), li=>{
    const key = li.dataset.key;
    const it = byKey[key];
    if(!it) return;
    const inner = li.querySelector('.shop-inner');

    const toggleCheck = async ()=>{
      if(it.kind==='extra'){
        const x = state.extras.filter(e=>('x|'+e.id)===key)[0];
        if(!x) return;
        if(x.recurring){
          state.checked[wk][key] = !state.checked[wk][key];
          saveChecked(wk, key, state.checked[wk][key]);
        } else {
          x.doneWk = (x.doneWk===wk) ? null : wk;
          saveExtras();
        }
      } else {
        state.checked[wk][key] = !state.checked[wk][key];
        saveChecked(wk, key, state.checked[wk][key]);
      }
      renderShop();
    };

    const removeItem = async ()=>{
      if(it.kind==='extra'){
        let idx = -1;
        for(let i=0;i<state.extras.length;i++){ if(('x|'+state.extras[i].id)===key){ idx=i; break; } }
        if(idx<0) return;
        const backup = state.extras[idx];
        state.extras.splice(idx,1);
        saveExtras(); renderShop();
        showToast(backup.name+' gelöscht', ()=>{
          state.extras.splice(idx,0,backup); saveExtras(); renderShop();
        });
      } else {
        state.removed[wk][key] = true;
        saveRemoved(wk, key, true); renderShop();
        showToast(it.name+' von dieser Liste entfernt', ()=>{
          delete state.removed[wk][key]; saveRemoved(wk, key, false); renderShop();
        });
      }
    };

    li.querySelector('input[type=checkbox]').addEventListener('change', toggleCheck);
    li.querySelector('.del-item').addEventListener('click', removeItem);

    /* „jede Woche wieder" umlegen. Beim Einschalten faellt ein evtl. gesetztes
       doneWk weg, beim Ausschalten der Haken dieser Woche — sonst steht der
       Eintrag als erledigt da, ohne dass jemand ihn abgehakt hat. */
    const repBtn = li.querySelector('.rep-btn');
    if(repBtn) repBtn.addEventListener('click', async ()=>{
      const x = state.extras.filter(en=>('x|'+en.id)===key)[0];
      if(!x) return;
      x.recurring = !x.recurring;
      if(x.recurring){
        x.doneWk = null;
      } else if(state.checked[wk] && state.checked[wk][key]){
        delete state.checked[wk][key];
        saveChecked(wk, key, false);
      }
      saveExtras(); renderShop();
      showToast(x.recurring
        ? '„'+x.name+'" kommt jetzt jede Woche wieder'
        : '„'+x.name+'" steht nur noch auf dieser Liste');
    });

    // Name antippen -> Abteilung wählen
    li.querySelector('.name-btn').addEventListener('click', ()=>{
      Array.prototype.forEach.call(box.querySelectorAll('.shop-item.picking'), o=>{ if(o!==li) o.classList.remove('picking'); });
      li.classList.toggle('picking');
    });
    Array.prototype.forEach.call(li.querySelectorAll('.cat-opt'), btn=>btn.addEventListener('click', async e=>{
      const cat = e.currentTarget.dataset.cat;
      if(it.kind==='extra'){
        const x = state.extras.filter(en=>('x|'+en.id)===key)[0];
        if(x){ x.cat = cat; saveExtras(); }
      } else {
        state.catOverrides[normKey(it.name)] = cat;
        saveCatOv(normKey(it.name), cat);
      }
      renderShop();
    }));

    // Menge antippen -> anpassen
    li.querySelector('.qty-btn').addEventListener('click', async ()=>{
      const eingabe = prompt('Menge für '+it.name+':', it.qty || '');
      if(eingabe === null) return;
      const val = eingabe.trim();
      if(it.kind==='extra'){
        const x = state.extras.filter(en=>('x|'+en.id)===key)[0];
        if(x){ x.qty = val; saveExtras(); }
      } else {
        if(val) state.qty[wk][key] = val; else delete state.qty[wk][key];
        saveQty(wk, key, val);
      }
      renderShop();
    });

    // Swipe: -> abhaken, <- löschen
    let x0=null,y0=null,dragging=false;
    inner.addEventListener('touchstart',e=>{ x0=e.touches[0].clientX; y0=e.touches[0].clientY; dragging=false; },{passive:true});
    inner.addEventListener('touchmove',e=>{
      if(x0===null) return;
      const dx=e.touches[0].clientX-x0, dy=e.touches[0].clientY-y0;
      if(!dragging && Math.abs(dx)<Math.abs(dy)){ x0=null; return; }
      dragging=true;
      inner.style.transform='translateX('+Math.max(-120,Math.min(120,dx))+'px)';
      li.classList.toggle('hint-right', dx>20);
      li.classList.toggle('hint-left', dx<-20);
    },{passive:true});
    inner.addEventListener('touchend', async e=>{
      if(x0===null) return;
      const dx=e.changedTouches[0].clientX-x0;
      inner.style.transform=''; li.classList.remove('hint-right','hint-left'); x0=null;
      if(dx>60) await toggleCheck();
      else if(dx<-60) await removeItem();
    },{passive:true});
  });


  /* Heute liest aus derselben Liste - mitziehen, sobald sie sich aendert.
     Abgeschirmt wie oben: die Einkaufsliste hat Vorrang. */
  try{ renderHeute(); }catch(e){ console.warn('Heute konnte nicht gezeichnet werden:', e); }
}

/* ---------- Abteilungen sortieren ---------- */
function renderCatOrder(){
  const box = document.getElementById('catOrderList');
  if(!box) return;
  const order = catOrder();
  box.innerHTML = order.map((id,i)=>{
    const c = CAT_LABEL[id];
    return '<li class="cat-order-row" data-id="'+id+'">' +
      '<span class="col-label">'+c.icon+' '+c.label+'</span>' +
      '<span class="col-arrows">' +
        '<button type="button" class="co-up" '+(i===0?'disabled':'')+' aria-label="Nach oben">↑</button>' +
        '<button type="button" class="co-down" '+(i===order.length-1?'disabled':'')+' aria-label="Nach unten">↓</button>' +
      '</span>' +
    '</li>';
  }).join('');

  const verschieben = (id, delta)=>{
    const o = catOrder().slice();
    const i = o.indexOf(id);
    const j = i + delta;
    if(j<0 || j>=o.length) return;
    const t = o[i]; o[i]=o[j]; o[j]=t;
    state.settings.catOrder = o;
    saveCatOrder(); renderCatOrder(); renderShop();
  };
  Array.prototype.forEach.call(box.querySelectorAll('.co-up'), b=>b.addEventListener('click', e=>
    verschieben(e.currentTarget.closest('.cat-order-row').dataset.id, -1)));
  Array.prototype.forEach.call(box.querySelectorAll('.co-down'), b=>b.addEventListener('click', e=>
    verschieben(e.currentTarget.closest('.cat-order-row').dataset.id, 1)));
}

/* ---------- Einkaufsliste teilen ---------- */
document.getElementById('shareShop').addEventListener('click', async ()=>{
  const wk = weekKeyOf(currentMonday);
  const built = buildItems(wk);
  const open = built.items.filter(i=>!i.checked);
  if(!open.length){
    setStatus('Nichts zu teilen — die Liste ist leer.');
    setTimeout(()=>setStatus(''),2500);
    return;
  }
  const byCat = {};
  open.forEach(it=>{ (byCat[it.cat] = byCat[it.cat] || []).push(it); });
  let text = 'Einkaufsliste · KW '+isoWeek(currentMonday).week+'\n\n';
  orderedCats().forEach(c=>{
    const g = byCat[c.id] || [];
    if(!g.length) return;
    text += c.icon+' '+c.label+'\n';
    g.forEach(it=>{ text += '- '+it.name+(it.qty?' ('+it.qty+')':'')+'\n'; });
    text += '\n';
  });
  text = text.trim();
  try{
    if(navigator.share){
      await navigator.share({title:'Einkaufsliste', text: text});
    } else {
      await navigator.clipboard.writeText(text);
      setStatus('Liste in die Zwischenablage kopiert.');
      setTimeout(()=>setStatus(''),3000);
    }
  }catch(e){ /* Teilen abgebrochen — nichts zu tun */ }
});

document.getElementById('resetWeekPlanBtn').addEventListener('click', ()=>{
  const wk = weekKeyOf(currentMonday);
  const belegt = Object.keys(state.plan[wk]||{}).some(day=>Object.keys((state.plan[wk]||{})[day]||{}).length);
  if(!belegt){ showToast('Diese Woche ist schon leer.'); return; }
  if(!confirm('Alle Einträge im Wochenplan für KW '+isoWeek(currentMonday).week+' entfernen? Rezepte selbst bleiben erhalten.')) return;
  const backup = JSON.parse(JSON.stringify(state.plan[wk] || {}));
  state.plan[wk] = {};
  put('data/weeks/'+wk+'/plan', null);
  renderAll();
  showToast('Wochenplan zurückgesetzt', ()=>{
    state.plan[wk] = backup;
    put('data/weeks/'+wk+'/plan', backup);
    renderAll();
  });
});
document.getElementById('resetChecks').addEventListener('click', async ()=>{
  const wk=weekKeyOf(currentMonday);
  const backupChecked = state.checked[wk], backupRemoved = state.removed[wk], backupQty = state.qty[wk];
  const backupExtras = (state.extras||[]).map(x=>({id:x.id, doneWk:x.doneWk}));
  state.checked[wk]={}; state.removed[wk]={}; state.qty[wk]={};
  (state.extras||[]).forEach(x=>{ if(x.doneWk===wk) x.doneWk=null; });
  saveWeekMaps(wk); saveExtras(); renderShop();
  showToast('Liste zurückgesetzt', ()=>{
    state.checked[wk]=backupChecked||{}; state.removed[wk]=backupRemoved||{}; state.qty[wk]=backupQty||{};
    backupExtras.forEach(b=>{ const x=state.extras.filter(e=>e.id===b.id)[0]; if(x) x.doneWk=b.doneWk; });
    saveWeekMaps(wk); saveExtras(); renderShop();
  });
});

/* =========================================================================
   16. Artikelstamm — eine Liste statt dreier Reiter

   IA-4  Zutaten, Haushalt & Drogerie und Immer zuhause sind ein Bereich
   IA-5  Standardansicht sind die manuell angelegten Artikel
   IA-6  Umschalter Lebensmittel / Drogerie & Haushalt, aus der Abteilung
   IA-8  Mehrfachauswahl statt Einkaufs-Vorlagen
   IA-14 „Immer zuhause" nur bei Rezeptzutaten — bei manuellen wirkt es nicht
   IA-16 Ein unbekannter Begriff wird dauerhafter Artikel, kein Einmaleintrag
   ========================================================================= */

/* Alle im Haushalt bekannten Zutatennamen, entdoppelt über normKey.
   Wird auch vom Rezept-Import gebraucht (IA-12) und vom Namensvorschlag. */
function allIngredientNames(){
  const names={};
  state.recipes.forEach(r=>(r.ingredients||[]).forEach(i=>{
    const k=normKey(i.name); if(k && !names[k]) names[k]=i.name;
  }));
  (state.customIngredients||[]).forEach(c=>{
    const k=normKey(c.name); if(k && !names[k]) names[k]=c.name;
  });
  return names;
}

/* Der Artikelstamm: manuell angelegte Artikel und Rezeptzutaten, über normKey
   zu je einer Zeile zusammengeführt. `manuell` heißt „selbst angelegt",
   `recipes` sagt, in welchen Gerichten der Artikel vorkommt. Beides kann
   gleichzeitig zutreffen — eine selbst angelegte Zwiebel taucht auch in
   Rezepten auf. */
function baueArtikelstamm(){
  const map = {};
  state.recipes.forEach(r=>(r.ingredients||[]).forEach(i=>{
    const k = normKey(i.name); if(!k) return;
    if(!map[k]) map[k] = {key:k, name:i.name, manuell:false, recipes:[]};
    if(map[k].recipes.indexOf(r.name) < 0) map[k].recipes.push(r.name);
  }));
  (state.customIngredients||[]).forEach(c=>{
    if(!c || !c.name) return;
    const k = normKey(c.name); if(!k) return;
    if(!map[k]) map[k] = {key:k, name:c.name, manuell:true, recipes:[]};
    else map[k].manuell = true;
  });
  Object.keys(map).forEach(k=>{
    const it = map[k];
    it.cat = categoryOf(it.name);
    it.market = marketOf(it.name);
    it.ausgeschlossen = state.excluded.indexOf(k) >= 0;
  });
  return map;
}

/* IA-6 — die Warengruppe steckt in der Abteilung, kein eigenes Feld am Artikel. */
function istNonFood(catId){ return catId === 'haushalt'; }

function artikelIstAufListe(key, weeklyKeys){
  const wk = weekKeyOf(currentMonday);
  const inExtras = (state.extras||[]).some(x=>x.from===key && (x.recurring || !x.doneWk || x.doneWk===wk));
  return inExtras || !!(weeklyKeys && weeklyKeys[key]);
}

/* Legt einen Artikel dauerhaft im Katalog an, falls es ihn noch nicht gibt.
   Gibt den normalisierten Schlüssel zurück — oder '' bei leerem Namen. */
function legeArtikelAn(name){
  const sauber = String(name||'').trim();
  const k = normKey(sauber);
  if(!k) return '';
  const bekannt = state.recipes.some(r=>(r.ingredients||[]).some(i=>normKey(i.name)===k))
    || (state.customIngredients||[]).some(c=>normKey(c.name)===k);
  if(!bekannt){
    state.customIngredients.push({name:sauber});
    saveCustomIngredients();
  }
  return k;
}

/* Setzt Artikel auf die Einkaufsliste. `namen` sind Anzeigenamen; die Zuordnung
   zum Katalog läuft über normKey, damit ein Artikel nie doppelt draufkommt. */
function setzeAufListe(namen){
  const wk = weekKeyOf(currentMonday);
  const neu = [];
  (namen||[]).forEach(n=>{
    const name = String(n||'').trim();
    const k = normKey(name);
    if(!k) return;
    const schonDrauf = (state.extras||[]).some(x=>x.from===k && (x.recurring || !x.doneWk || x.doneWk===wk));
    if(schonDrauf) return;
    neu.push({
      id: 'e'+Date.now()+Math.random().toString(36).slice(2,5),
      name: name, qty:'', cat: categoryOf(name), market: marketOf(name),
      recurring:false, doneWk:null, from: k
    });
  });
  if(!neu.length) return 0;
  neu.forEach(x=>state.extras.push(x));
  saveExtras(); renderShop();
  return neu.length;
}

/* ---------- Ansichtszustand (IA-11: bleibt innerhalb der Sitzung) ---------- */
let artSuche = '';
let artGruppe = 'food';        // 'food' | 'nonfood'
let artHerkunft = 'manuell';   // 'manuell' | 'alle'
let artAuswahl = [];           // normKeys

function renderArtikel(){
  const box = document.getElementById('artikelListe');
  if(!box) return;                       // Zusatzansicht darf nie hart zugreifen
  const cnt   = document.getElementById('artCount');
  const leer  = document.getElementById('artikelLeer');
  const neuEl = document.getElementById('artNeu');

  const map = baueArtikelstamm();
  const wk = weekKeyOf(currentMonday);
  const weeklyKeys = {};
  buildItems(wk).items.forEach(x=>{ if(x.kind==='recipe') weeklyKeys[x.key]=true; });

  const suche = artSuche.trim().toLowerCase();
  const keys = Object.keys(map).filter(k=>{
    const it = map[k];
    if(istNonFood(it.cat) !== (artGruppe === 'nonfood')) return false;
    if(artHerkunft === 'manuell' && !it.manuell) return false;
    if(suche && it.name.toLowerCase().indexOf(suche) < 0) return false;
    return true;
  });
  if(cnt) cnt.textContent = keys.length ? '('+keys.length+')' : '';

  /* IA-16 — steht der getippte Begriff in keinem Katalog, kann er hier direkt
     angelegt werden. Der Katalog entsteht als Nebenprodukt, ohne Pflegeaufwand. */
  if(neuEl){
    const bekannt = !!suche && Object.keys(map).some(k=>map[k].name.toLowerCase() === suche);
    /* Ab zwei Zeichen. Ein einzelner Buchstabe ist ein Tippfehler auf dem Weg
       zum Wort, kein Artikel — und er landet sonst dauerhaft im Katalog. */
    if(suche.length >= 2 && !bekannt){
      neuEl.hidden = false;
      neuEl.innerHTML = '<button class="art-neu-btn" type="button">+ „'+escapeHtml(artSuche.trim())+'" als Artikel anlegen</button>';
      const b = neuEl.querySelector('.art-neu-btn');
      if(b) b.addEventListener('click', ()=>{
        const name = artSuche.trim();
        legeArtikelAn(name);
        artSuche = '';
        const feld = document.getElementById('artSearch');
        if(feld){ feld.value = ''; feld.focus(); }
        renderArtikel();
        showToast('„'+name+'" ist jetzt im Katalog');
      });
    } else {
      neuEl.hidden = true; neuEl.innerHTML = '';
    }
  }

  if(!keys.length){
    box.innerHTML = '';
    if(leer){
      leer.hidden = false;
      leer.textContent = suche
        ? 'Nichts gefunden.'
        : (artHerkunft === 'manuell'
            ? 'Noch nichts selbst angelegt. Neue Artikel entstehen von allein, sobald ihr sie in der Einkaufsliste eintippt.'
            : 'Sobald Rezepte da sind, erscheinen hier ihre Zutaten.');
    }
    zeichneArtAuswahl();
    return;
  }
  if(leer){ leer.hidden = true; leer.textContent = ''; }

  const zeile = k=>{
    const it = map[k];
    const c = CAT_LABEL[it.cat] || CAT_LABEL.sonstiges;
    const aufListe = artikelIstAufListe(k, weeklyKeys);
    const gewaehlt = artAuswahl.indexOf(k) >= 0;
    const plusAttrs = it.ausgeschlossen
      ? 'disabled title="Als \'immer zuhause\' markiert"'
      : (aufListe ? 'disabled title="Schon auf der Liste"' : 'title="Auf die Einkaufsliste"');
    /* IA-14 — der Schalter erscheint nur bei Rezeptzutaten. Bei manuellen
       Artikeln täte er nichts: sie landen nie von allein auf der Liste. */
    const zuhause = it.recipes.length
      ? ' · <button class="art-zuhause'+(it.ausgeschlossen?' an':'')+'" type="button" data-key="'+escapeHtml(k)+'" aria-pressed="'+(it.ausgeschlossen?'true':'false')+'">'+(it.ausgeschlossen?'✓ immer zuhause':'immer zuhause')+'</button>'
      : '';
    return '<li class="art-row'+(gewaehlt?' gewaehlt':'')+'" data-key="'+escapeHtml(k)+'">' +
      '<button class="art-pick" type="button" aria-pressed="'+(gewaehlt?'true':'false')+'" aria-label="'+escapeHtml(it.name)+' auswählen">' +
        '<span class="art-box">✓</span>' +
        '<span class="art-body">' +
          '<span class="art-name">'+escapeHtml(it.name)+(it.manuell?' <span class="extra-badge">manuell</span>':'')+'</span>' +
          '<span class="art-meta">'+c.icon+' '+c.label+'</span>' +
        '</span>' +
      '</button>' +
      '<span class="art-tools">' +
        '<button class="hh-add-list art-add" type="button" data-key="'+escapeHtml(k)+'" '+plusAttrs+'>'+((aufListe && !it.ausgeschlossen)?'✓':'+')+'</button>' +
        (it.manuell ? '<button class="ci-del art-del" type="button" data-key="'+escapeHtml(k)+'" title="Aus dem Katalog löschen" aria-label="'+escapeHtml(it.name)+' löschen">🗑</button>' : '') +
      '</span>' +
      '<div class="art-fuss">' +
        '<button class="market-tag-btn" type="button" data-key="'+escapeHtml(k)+'" data-name="'+escapeHtml(it.name)+'">'+(it.market?'🏬 '+escapeHtml(it.market):'🏬 Laden zuordnen')+'</button>' +
        zuhause +
      '</div>' +
      (it.recipes.length ? '<div class="in-recipes">'+it.recipes.map(n=>'<span class="in-tag">'+escapeHtml(n)+'</span>').join('')+'</div>' : '') +
    '</li>';
  };

  /* Lebensmittel werden nach Abteilung gruppiert. Die Drogerie-Seite hat nur
     eine Abteilung — dort wäre eine Überschrift bloße Wiederholung des
     Umschalters, also bleibt sie eine flache Liste. */
  let html = '';
  if(artGruppe === 'nonfood'){
    const sortiert = keys.slice().sort((a,b)=>map[a].name.localeCompare(map[b].name,'de'));
    html = '<ul class="art-liste">'+sortiert.map(zeile).join('')+'</ul>';
  } else {
    orderedCats().forEach(c=>{
      const gruppe = keys.filter(k=>map[k].cat===c.id).sort((a,b)=>map[a].name.localeCompare(map[b].name,'de'));
      if(!gruppe.length) return;
      html += '<div class="cat-group"><div class="cat-title">'+c.icon+' '+c.label+'<span class="cat-n">'+gruppe.length+'</span></div>' +
        '<ul class="art-liste">'+gruppe.map(zeile).join('')+'</ul></div>';
    });
  }
  box.innerHTML = html;

  /* Auswählen — IA-8 */
  Array.prototype.forEach.call(box.querySelectorAll('.art-pick'), b=>b.addEventListener('click', e=>{
    const k = e.currentTarget.closest('.art-row').dataset.key;
    const i = artAuswahl.indexOf(k);
    if(i >= 0) artAuswahl.splice(i,1); else artAuswahl.push(k);
    renderArtikel();
  }));

  /* Einzeln auf die Liste */
  Array.prototype.forEach.call(box.querySelectorAll('.art-add'), b=>b.addEventListener('click', e=>{
    const k = e.currentTarget.dataset.key;
    const it = map[k];
    if(!it) return;
    if(setzeAufListe([it.name])) showToast(it.name+' steht auf der Einkaufsliste');
  }));

  /* Aus dem Katalog löschen — nur bei selbst angelegten Artikeln */
  Array.prototype.forEach.call(box.querySelectorAll('.art-del'), b=>b.addEventListener('click', e=>{
    const k = e.currentTarget.dataset.key;
    const idx = (state.customIngredients||[]).findIndex(c=>normKey(c.name)===k);
    if(idx < 0) return;
    const backup = state.customIngredients[idx];
    state.customIngredients.splice(idx,1);
    const aus = artAuswahl.indexOf(k); if(aus >= 0) artAuswahl.splice(aus,1);
    saveCustomIngredients(); renderArtikel(); refreshIngNameDatalist();
    showToast(backup.name+' aus dem Katalog gelöscht', ()=>{
      state.customIngredients.splice(idx,0,backup);
      saveCustomIngredients(); renderArtikel(); refreshIngNameDatalist();
    });
  }));

  /* Laden zuordnen */
  Array.prototype.forEach.call(box.querySelectorAll('.market-tag-btn'), b=>b.addEventListener('click', e=>{
    const key = e.currentTarget.dataset.key;
    const name = e.currentTarget.dataset.name;
    const eingabe = prompt('In welchem Laden kauft ihr „'+name+'" meistens? (leer lassen, um es wieder zu entfernen)', marketOf(name));
    if(eingabe === null) return;
    const neu = eingabe.trim();
    if(neu) state.marketOverrides[key] = neu; else delete state.marketOverrides[key];
    saveMarketOv(key, neu);
    renderShop();               // zeichnet den Artikelstamm gleich mit
  }));

  /* „Immer zuhause" — IA-14 */
  Array.prototype.forEach.call(box.querySelectorAll('.art-zuhause'), b=>b.addEventListener('click', e=>{
    const k = e.currentTarget.dataset.key;
    const i = state.excluded.indexOf(k);
    if(i >= 0) state.excluded.splice(i,1); else state.excluded.push(k);
    saveExcluded(); renderShop();
  }));

  zeichneArtAuswahl();
}

/* Klebende Leiste am unteren Rand, solange etwas ausgewählt ist */
function zeichneArtAuswahl(){
  const leiste = document.getElementById('artAuswahl');
  const knopf  = document.getElementById('artAufListe');
  if(!leiste || !knopf) return;
  if(!artAuswahl.length){ leiste.hidden = true; return; }
  leiste.hidden = false;
  knopf.textContent = artAuswahl.length === 1
    ? '1 Artikel auf die Liste'
    : artAuswahl.length+' Artikel auf die Liste';
}

(function(){
  const feld = document.getElementById('artSearch');
  if(feld) feld.addEventListener('input', e=>{ artSuche = e.target.value; renderArtikel(); });

  Array.prototype.forEach.call(document.querySelectorAll('#artGruppeRow .filter-pill'), b=>b.addEventListener('click', e=>{
    artGruppe = e.currentTarget.dataset.gruppe;
    Array.prototype.forEach.call(document.querySelectorAll('#artGruppeRow .filter-pill'), x=>x.classList.toggle('active', x===e.currentTarget));
    renderArtikel();
  }));
  Array.prototype.forEach.call(document.querySelectorAll('#artHerkunftRow .filter-pill'), b=>b.addEventListener('click', e=>{
    artHerkunft = e.currentTarget.dataset.herkunft;
    Array.prototype.forEach.call(document.querySelectorAll('#artHerkunftRow .filter-pill'), x=>x.classList.toggle('active', x===e.currentTarget));
    renderArtikel();
  }));

  const weg = document.getElementById('artAuswahlWeg');
  if(weg) weg.addEventListener('click', ()=>{ artAuswahl = []; renderArtikel(); });

  const auf = document.getElementById('artAufListe');
  if(auf) auf.addEventListener('click', ()=>{
    const map = baueArtikelstamm();
    const namen = artAuswahl.map(k=>map[k] && map[k].name).filter(Boolean);
    const n = setzeAufListe(namen);
    artAuswahl = [];
    renderArtikel();
    showToast(n === 1 ? '1 Artikel auf der Liste' : n+' Artikel auf der Liste');
  });
})();

/* =========================================================================
   17. Suchfeld in der Einkaufsliste — IA-7 / IA-16

   Tippen schlägt bekannte Artikel vor, Enter setzt drauf. Steht der Begriff in
   keinem Katalog, wird er ohne Nachfrage als dauerhafter Artikel angelegt und
   landet zugleich auf der Liste. Der Katalog wächst damit beim Einkaufen mit,
   ohne dass jemand ihn pflegt.
   ========================================================================= */
function renderShopVorschlaege(){
  const feld = document.getElementById('shopSearch');
  const box  = document.getElementById('shopVorschlaege');
  if(!feld || !box) return;
  const roh = feld.value.trim();
  const suche = roh.toLowerCase();
  if(!suche){ box.hidden = true; box.innerHTML = ''; return; }

  const wk = weekKeyOf(currentMonday);
  const map = baueArtikelstamm();
  const weeklyKeys = {};
  buildItems(wk).items.forEach(x=>{ if(x.kind==='recipe') weeklyKeys[x.key]=true; });

  const treffer = Object.keys(map)
    .filter(k=>map[k].name.toLowerCase().indexOf(suche) >= 0 && !artikelIstAufListe(k, weeklyKeys))
    .sort((a,b)=>map[a].name.localeCompare(map[b].name,'de'))
    .slice(0,6);
  const bekannt = Object.keys(map).some(k=>map[k].name.toLowerCase() === suche);

  let html = treffer.map(k=>{
    const c = CAT_LABEL[map[k].cat] || CAT_LABEL.sonstiges;
    return '<button class="vorschlag" type="button" data-name="'+escapeHtml(map[k].name)+'">' +
      '<span class="v-plus">+</span>' +
      '<span class="v-name">'+escapeHtml(map[k].name)+'</span>' +
      '<span class="v-cat">'+c.icon+' '+c.label+'</span>' +
    '</button>';
  }).join('');
  if(!bekannt && roh.length >= 2){
    html += '<button class="vorschlag neu" type="button" data-name="'+escapeHtml(roh)+'">' +
      '<span class="v-plus">+</span>' +
      '<span class="v-name">„'+escapeHtml(roh)+'" auf die Liste' +
        '<span class="v-sub">wird als Artikel im Katalog angelegt</span>' +
      '</span>' +
    '</button>';
  }
  if(!html){ box.hidden = true; box.innerHTML = ''; return; }

  box.hidden = false;
  box.innerHTML = html;
  Array.prototype.forEach.call(box.querySelectorAll('.vorschlag'), b=>b.addEventListener('click', e=>{
    uebernehmeSuchbegriff(e.currentTarget.dataset.name);
  }));
}

function uebernehmeSuchbegriff(name){
  const sauber = String(name||'').trim();
  if(!sauber) return;
  legeArtikelAn(sauber);
  const n = setzeAufListe([sauber]);
  const feld = document.getElementById('shopSearch');
  if(feld){ feld.value = ''; feld.focus(); }
  renderShopVorschlaege();
  showToast(n ? sauber+' steht auf der Liste' : sauber+' steht schon auf der Liste');
}

(function(){
  const feld = document.getElementById('shopSearch');
  if(!feld) return;
  feld.addEventListener('input', renderShopVorschlaege);
  feld.addEventListener('keydown', e=>{
    if(e.key !== 'Enter') return;
    e.preventDefault();
    const wert = feld.value.trim();
    if(wert.length < 2) return;
    /* Enter nimmt den ersten Vorschlag, sonst den getippten Begriff selbst. */
    const box = document.getElementById('shopVorschlaege');
    const erster = box && !box.hidden ? box.querySelector('.vorschlag') : null;
    uebernehmeSuchbegriff(erster ? erster.dataset.name : wert);
  });
})();

/* =========================================================================
   18. Notizen (B3) — frei aufbaubare Listen, jeder Eintrag abhakbar

   K-7  Zuständigkeit und Fälligkeit sind ein Angebot, keine Pflicht
   K-8  Eigener Hauptbereich, kein Unterpunkt
   B4   Zuständigkeit fehlt hier bewusst — sie braucht Personenobjekte.
        Ein Freitextfeld jetzt hieße, es später auf Personen abzubilden;
        genau die Migration, die wir uns bei T-9 gerade geleistet haben.

   Datenform:
     data/notizen/<listeId> = { name, angelegt, eintraege: { <id>: {…} } }
     Eintrag = { text, angelegt, erledigt?: true, faellig?: 'JJJJ-MM-TT' }

   `eintraege` ist ein Objekt, kein Feld: So schreibt ein Haken genau
   `…/eintraege/<id>/erledigt` und nicht die ganze Liste (T-6). `erledigt`
   und `faellig` werden nur geschrieben, wenn sie zutreffen — `null` räumt
   den Schlüssel weg, statt `false` abzulegen.
   ========================================================================= */

const saveNotizListe   = (lid, wert)      => put('data/notizen/'+lid, wert);
const saveNotizName    = (lid, name)      => put('data/notizen/'+lid+'/name', name);
const saveNotizEintrag = (lid, eid, wert) => put('data/notizen/'+lid+'/eintraege/'+eid, wert);
const saveNotizFeld    = (lid, eid, feld, wert) => put('data/notizen/'+lid+'/eintraege/'+eid+'/'+feld, wert);

function neueId(prefix){ return prefix + Date.now() + Math.random().toString(36).slice(2,5); }

/* Ansichtszustand nach IA-11: bleibt innerhalb der Sitzung erhalten. */
let offeneNotizListe = null;

function notizListen(){
  const n = state.notizen || {};
  return Object.keys(n)
    .map(id=>Object.assign({id:id}, n[id]))
    .sort((a,b)=>(a.angelegt||0) - (b.angelegt||0));
}
function notizEintraege(liste){
  const e = (liste && liste.eintraege) || {};
  return Object.keys(e)
    .map(id=>Object.assign({id:id}, e[id]))
    .sort((a,b)=>(a.angelegt||0) - (b.angelegt||0));
}
function notizZaehlung(liste){
  const alle = notizEintraege(liste);
  const offen = alle.filter(e=>!e.erledigt).length;
  return {gesamt: alle.length, offen: offen, erledigt: alle.length - offen};
}

/* ---------- Fälligkeit ---------- */
function heuteIso(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
/* Kurzform für die Zeile. „Heute" und „Morgen" statt eines Datums, weil man
   beim Überfliegen keine Kalenderrechnung machen will. */
function faelligText(iso){
  if(!iso) return '';
  const heute = heuteIso();
  if(iso === heute) return 'heute';
  const d = new Date(iso + 'T00:00:00');
  if(isNaN(d)) return iso;
  const morgen = new Date(); morgen.setDate(morgen.getDate()+1);
  const morgenIso = morgen.getFullYear() + '-' + String(morgen.getMonth()+1).padStart(2,'0') + '-' + String(morgen.getDate()).padStart(2,'0');
  if(iso === morgenIso) return 'morgen';
  if(iso < heute) return 'überfällig · ' + fmtDate(d);
  return fmtDate(d);
}

/* ---------- Übersicht ---------- */
function renderNotizUebersicht(){
  const box = document.getElementById('notizListen');
  if(!box) return;
  const leer = document.getElementById('notizLeer');
  const lage = document.getElementById('notizLage');
  const listen = notizListen();

  const offenGesamt = listen.reduce((n,l)=>n + notizZaehlung(l).offen, 0);
  if(lage){
    lage.textContent = listen.length
      ? listen.length + (listen.length === 1 ? ' Liste · ' : ' Listen · ') + offenGesamt + ' offen'
      : 'Noch nichts angelegt';
  }

  if(!listen.length){
    box.innerHTML = '';
    if(leer){
      leer.hidden = false;
      leer.textContent = 'Noch keine Liste. Was der Haushalt aufschreiben will, entscheidet er selbst.';
    }
    return;
  }
  if(leer){ leer.hidden = true; leer.textContent = ''; }

  box.innerHTML = listen.map(l=>{
    const z = notizZaehlung(l);
    const anteil = z.gesamt ? Math.round((z.erledigt / z.gesamt) * 100) : 0;
    return '<div class="karte notiz-karte">' +
      '<button class="notiz-karte-btn" type="button" data-id="'+escapeHtml(l.id)+'">' +
        '<span class="nk-zeile">' +
          '<span class="nk-text">' +
            '<span class="nk-name">'+escapeHtml(l.name || 'Ohne Namen')+'</span>' +
            '<span class="nk-zahl zahl">'+z.offen+' von '+z.gesamt+' offen</span>' +
          '</span>' +
          '<span class="nk-pfeil">›</span>' +
        '</span>' +
        '<span class="nk-balken"><span class="nk-balken-fuell" style="width:'+anteil+'%"></span></span>' +
      '</button>' +
    '</div>';
  }).join('');

  Array.prototype.forEach.call(box.querySelectorAll('.notiz-karte-btn'), b=>b.addEventListener('click', e=>{
    offeneNotizListe = e.currentTarget.dataset.id;
    renderNotizen();
  }));
}

/* ---------- Geöffnete Liste ---------- */
function renderNotizDetail(){
  const box = document.getElementById('notizEintraege');
  if(!box) return;
  const listen = notizListen();
  const liste = listen.filter(l=>l.id === offeneNotizListe)[0];
  if(!liste){ offeneNotizListe = null; return; }

  const titel = document.getElementById('notizDetailTitel');
  const lage  = document.getElementById('notizDetailLage');
  const z = notizZaehlung(liste);
  if(titel) titel.textContent = liste.name || 'Ohne Namen';
  if(lage)  lage.textContent  = z.offen + ' von ' + z.gesamt + ' offen';

  const alle = notizEintraege(liste);
  const offen = alle.filter(e=>!e.erledigt);
  const erledigt = alle.filter(e=>e.erledigt);

  /* Die Fälligkeit sitzt als Textknopf in der Fußzeile der Zeile — dieselbe
     Bauform wie „Laden zuordnen" im Artikelstamm. Ein Symbolknopf daneben wäre
     ein drittes Ziel in einer Reihe, die schon Haken und Papierkorb hat. */
  const zeile = (e, istErledigt) => {
    const zustand = !e.faellig ? '' : (e.faellig < heuteIso() ? ' ueberfaellig' : (e.faellig === heuteIso() ? ' heute' : ''));
    return '<li class="notiz-zeile'+(istErledigt?' erledigt':'')+'" data-id="'+escapeHtml(e.id)+'">' +
      '<div class="nz-oben">' +
        '<button class="haken'+(istErledigt?' an':'')+'" type="button" role="checkbox" aria-checked="'+(istErledigt?'true':'false')+'" aria-label="'+escapeHtml(e.text)+(istErledigt?' zurücksetzen':' erledigen')+'">✓</button>' +
        '<div class="nz-text">' +
          '<span class="nz-titel">'+escapeHtml(e.text)+'</span>' +
          (istErledigt ? '' :
            '<span class="nz-fuss">' +
              '<button class="nz-datum'+zustand+'" type="button">'+(e.faellig ? escapeHtml(faelligText(e.faellig)) : 'Fällig zuordnen')+'</button>' +
            '</span>') +
        '</div>' +
        '<button class="nz-weg" type="button" aria-label="'+escapeHtml(e.text)+' löschen">🗑</button>' +
      '</div>' +
      (istErledigt ? '' :
        '<div class="nz-datum-feld">' +
          '<input type="date" class="nz-datum-input" value="'+escapeHtml(e.faellig||'')+'" aria-label="Fällig am">' +
          '<button class="nz-datum-weg" type="button">Ohne Datum</button>' +
        '</div>') +
    '</li>';
  };

  let html = '';
  if(!alle.length){
    html = '<p class="notiz-leer">Diese Liste ist leer. Der erste Eintrag steht dir frei.</p>';
  } else {
    if(offen.length){
      html += '<div class="notiz-block"><div class="notiz-kopf">Offen <span class="zahl">'+offen.length+'</span></div>' +
        '<div class="karte"><ul class="notiz-liste">'+offen.map(e=>zeile(e,false)).join('')+'</ul></div></div>';
    }
    if(erledigt.length){
      html += '<div class="notiz-block"><div class="notiz-kopf">Erledigt <span class="zahl">'+erledigt.length+'</span>' +
        '<button class="notiz-erledigte-weg" type="button">Erledigte leeren</button></div>' +
        '<div class="karte"><ul class="notiz-liste">'+erledigt.map(e=>zeile(e,true)).join('')+'</ul></div></div>';
    }
  }
  box.innerHTML = html;

  const lid = liste.id;

  Array.prototype.forEach.call(box.querySelectorAll('.haken'), b=>b.addEventListener('click', e=>{
    const eid = e.currentTarget.closest('.notiz-zeile').dataset.id;
    const eintrag = (liste.eintraege||{})[eid];
    if(!eintrag) return;
    const neu = !eintrag.erledigt;
    eintrag.erledigt = neu ? true : undefined;
    if(!neu) delete eintrag.erledigt;
    saveNotizFeld(lid, eid, 'erledigt', neu ? true : null);
    renderNotizen();
  }));

  Array.prototype.forEach.call(box.querySelectorAll('.nz-weg'), b=>b.addEventListener('click', e=>{
    const eid = e.currentTarget.closest('.notiz-zeile').dataset.id;
    const sicherung = (liste.eintraege||{})[eid];
    if(!sicherung) return;
    delete liste.eintraege[eid];
    saveNotizEintrag(lid, eid, null);
    renderNotizen();
    showToast(sicherung.text + ' gelöscht', ()=>{
      state.notizen[lid].eintraege = state.notizen[lid].eintraege || {};
      state.notizen[lid].eintraege[eid] = sicherung;
      saveNotizEintrag(lid, eid, sicherung);
      renderNotizen();
    });
  }));

  /* Fälligkeit: das Feld klappt an der Zeile auf, wie der Abteilungswähler
     in der Einkaufsliste. Ein Datumsfeld ist auf dem Telefon der einzige
     Weg, der sich nicht wie Tippen anfühlt. */
  Array.prototype.forEach.call(box.querySelectorAll('.nz-datum'), b=>b.addEventListener('click', e=>{
    const li = e.currentTarget.closest('.notiz-zeile');
    Array.prototype.forEach.call(box.querySelectorAll('.notiz-zeile.datum-offen'), o=>{ if(o!==li) o.classList.remove('datum-offen'); });
    li.classList.toggle('datum-offen');
    if(li.classList.contains('datum-offen')){
      const feld = li.querySelector('.nz-datum-input');
      if(feld) feld.focus();
    }
  }));
  Array.prototype.forEach.call(box.querySelectorAll('.nz-datum-input'), inp=>inp.addEventListener('change', e=>{
    const eid = e.currentTarget.closest('.notiz-zeile').dataset.id;
    const eintrag = (liste.eintraege||{})[eid];
    if(!eintrag) return;
    const wert = e.currentTarget.value || '';
    if(wert) eintrag.faellig = wert; else delete eintrag.faellig;
    saveNotizFeld(lid, eid, 'faellig', wert || null);
    renderNotizen();
  }));
  Array.prototype.forEach.call(box.querySelectorAll('.nz-datum-weg'), b=>b.addEventListener('click', e=>{
    const eid = e.currentTarget.closest('.notiz-zeile').dataset.id;
    const eintrag = (liste.eintraege||{})[eid];
    if(!eintrag) return;
    delete eintrag.faellig;
    saveNotizFeld(lid, eid, 'faellig', null);
    renderNotizen();
  }));

  const weg = box.querySelector('.notiz-erledigte-weg');
  if(weg) weg.addEventListener('click', ()=>{
    const sicherung = {};
    erledigt.forEach(e=>{ sicherung[e.id] = (liste.eintraege||{})[e.id]; delete liste.eintraege[e.id]; });
    Object.keys(sicherung).forEach(eid=>saveNotizEintrag(lid, eid, null));
    renderNotizen();
    showToast(erledigt.length + ' Erledigte gelöscht', ()=>{
      state.notizen[lid].eintraege = state.notizen[lid].eintraege || {};
      Object.keys(sicherung).forEach(eid=>{
        state.notizen[lid].eintraege[eid] = sicherung[eid];
        saveNotizEintrag(lid, eid, sicherung[eid]);
      });
      renderNotizen();
    });
  });
}

function renderNotizen(){
  const uebersicht = document.getElementById('notizUebersicht');
  const detail = document.getElementById('notizDetail');
  if(!uebersicht || !detail) return;
  const gibtEs = offeneNotizListe && (state.notizen || {})[offeneNotizListe];
  if(!gibtEs) offeneNotizListe = null;
  uebersicht.hidden = !!offeneNotizListe;
  detail.hidden = !offeneNotizListe;
  if(offeneNotizListe) renderNotizDetail(); else renderNotizUebersicht();
  /* Heute liest aus denselben Daten — abgeschirmt wie überall sonst. */
  try{ renderHeuteAufgaben(); }catch(e){ console.warn('Aufgaben auf Heute:', e); }
}

/* ---------- Anlegen, umbenennen, löschen ---------- */
function legeNotizListeAn(){
  const name = prompt('Wie soll die Liste heißen?', '');
  if(name === null) return;
  const sauber = name.trim();
  if(!sauber) return;
  const id = neueId('n');
  const liste = {name: sauber, angelegt: Date.now(), eintraege: {}};
  state.notizen = state.notizen || {};
  state.notizen[id] = liste;
  saveNotizListe(id, {name: sauber, angelegt: liste.angelegt});
  offeneNotizListe = id;
  renderNotizen();
}

function legeNotizEintragAn(){
  const feld = document.getElementById('notizEintragText');
  if(!feld || !offeneNotizListe) return;
  const text = feld.value.trim();
  if(!text){ feldFehler(feld, 'Ohne Text kann der Eintrag nicht angelegt werden.'); return; }
  const liste = (state.notizen || {})[offeneNotizListe];
  if(!liste) return;
  const eid = neueId('p');
  const eintrag = {text: text, angelegt: Date.now()};
  liste.eintraege = liste.eintraege || {};
  liste.eintraege[eid] = eintrag;
  saveNotizEintrag(offeneNotizListe, eid, eintrag);
  feld.value = '';
  renderNotizen();
  feld.focus();
}

(function(){
  const neu = document.getElementById('notizListeNeu');
  if(neu) neu.addEventListener('click', legeNotizListeAn);

  const zurueck = document.getElementById('notizZurueck');
  if(zurueck) zurueck.addEventListener('click', ()=>{ offeneNotizListe = null; renderNotizen(); });

  const feld = document.getElementById('notizEintragText');
  if(feld) feld.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); legeNotizEintragAn(); } });

  const um = document.getElementById('notizListeUmbenennen');
  if(um) um.addEventListener('click', ()=>{
    const liste = (state.notizen || {})[offeneNotizListe];
    if(!liste) return;
    const name = prompt('Neuer Name der Liste:', liste.name || '');
    if(name === null) return;
    const sauber = name.trim();
    if(!sauber) return;
    liste.name = sauber;
    saveNotizName(offeneNotizListe, sauber);
    renderNotizen();
  });

  const weg = document.getElementById('notizListeLoeschen');
  if(weg) weg.addEventListener('click', ()=>{
    const lid = offeneNotizListe;
    const liste = (state.notizen || {})[lid];
    if(!liste) return;
    const z = notizZaehlung(liste);
    if(z.gesamt && !confirm('Liste „'+(liste.name||'')+'" mit '+z.gesamt+' Einträgen löschen?')) return;
    const sicherung = JSON.parse(JSON.stringify(liste));
    delete state.notizen[lid];
    saveNotizListe(lid, null);
    offeneNotizListe = null;
    renderNotizen();
    showToast('Liste „'+(sicherung.name||'')+'" gelöscht', ()=>{
      state.notizen[lid] = sicherung;
      saveNotizListe(lid, sicherung);
      renderNotizen();
    });
  });
})();

/* ---------- Aufgaben auf Heute ----------
   Nur was heute fällig oder überfällig ist. Ohne Fälligkeit erscheint ein
   Eintrag hier gar nicht — damit ist das Datum ein Angebot mit spürbarem
   Nutzen statt eines Feldes, das man ausfüllt, weil es da ist. Ist nichts
   fällig, bleibt die Karte leer; das ist nach Kapitel 3.2 eine Auskunft. */
function renderHeuteAufgaben(){
  const el = document.getElementById('heuteAufgaben');
  if(!el) return;
  const heute = heuteIso();
  const faellig = [];
  notizListen().forEach(l=>{
    notizEintraege(l).forEach(e=>{
      if(e.erledigt || !e.faellig) return;
      if(e.faellig <= heute) faellig.push({liste:l, eintrag:e});
    });
  });
  if(!faellig.length){
    el.innerHTML = (state.notizen && Object.keys(state.notizen).length)
      ? '<p class="ex-hint">Heute ist nichts fällig.</p>'
      : '<p class="ex-hint">Sobald es Notizen mit Fälligkeit gibt, stehen hier die fälligen Aufgaben.</p>';
    return;
  }
  faellig.sort((a,b)=>(a.eintrag.faellig||'').localeCompare(b.eintrag.faellig||''));
  el.innerHTML = '<ul class="notiz-liste heute-aufgaben">' + faellig.map(f=>
    '<li class="notiz-zeile" data-liste="'+escapeHtml(f.liste.id)+'" data-id="'+escapeHtml(f.eintrag.id)+'">' +
      '<div class="nz-oben">' +
        '<button class="haken" type="button" role="checkbox" aria-checked="false" aria-label="'+escapeHtml(f.eintrag.text)+' erledigen">✓</button>' +
        '<div class="nz-text">' +
          '<span class="nz-titel">'+escapeHtml(f.eintrag.text)+'</span>' +
          '<span class="nz-fuss"><span class="nz-marke'+(f.eintrag.faellig < heute ? ' ueberfaellig' : ' heute')+'">'+escapeHtml(f.liste.name||'')+' · '+escapeHtml(faelligText(f.eintrag.faellig))+'</span></span>' +
        '</div>' +
      '</div>' +
    '</li>').join('') + '</ul>';

  Array.prototype.forEach.call(el.querySelectorAll('.haken'), b=>b.addEventListener('click', e=>{
    const li = e.currentTarget.closest('.notiz-zeile');
    const lid = li.dataset.liste, eid = li.dataset.id;
    const eintrag = (((state.notizen||{})[lid]||{}).eintraege||{})[eid];
    if(!eintrag) return;
    eintrag.erledigt = true;
    saveNotizFeld(lid, eid, 'erledigt', true);
    renderNotizen();
    showToast(eintrag.text + ' erledigt', ()=>{
      delete eintrag.erledigt;
      saveNotizFeld(lid, eid, 'erledigt', null);
      renderNotizen();
    });
  }));
}

/* =========================================================================
   19. Bildschirm an halten — beim Einkaufen und bei offenem Rezept
   ========================================================================= */
let wakeLock = null;
async function requestWakeLock(){
  if(!('wakeLock' in navigator)) return;
  try{
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', ()=>{ wakeLock = null; });
  }catch(e){ /* z.B. Tab im Hintergrund — einfach ignorieren */ }
}
function releaseWakeLock(){
  if(wakeLock){ wakeLock.release().catch(()=>{}); wakeLock = null; }
}
function wakeLockGewuenscht(){
  /* Die Liste ist seit B1 Unterbereich von Einkauf - beides muss offen sein,
     sonst bliebe der Bildschirm auch in Heute oder Rezepten wach. */
  const shopAktiv = document.getElementById('einkauf').classList.contains('active')
                 && document.getElementById('shop').classList.contains('active');
  const rezeptOffen = !!document.querySelector('#recipes .recipe-item.open');
  return shopAktiv || rezeptOffen;
}
function updateWakeLock(){
  if(wakeLockGewuenscht()) requestWakeLock(); else releaseWakeLock();
}
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'visible' && wakeLockGewuenscht()) requestWakeLock();
});

/* =========================================================================
   20. Navigation, Kopfzeile, Heute
   ========================================================================= */

/* IA-15 - fuenf Bereiche statt acht Reiter, zwei davon mit Unterbereichen.
   Der Selektor ist bewusst "main > section": Die Unterbereiche liegen als
   .unterpanel innerhalb der Bereiche und duerfen vom Bereichswechsel nicht
   mit zurueckgesetzt werden - sonst verliert Essen beim Weggehen seine
   Ansicht (IA-11, Ansichtszustand bleibt in der Sitzung erhalten). */
function zeigeBereich(name){
  Array.prototype.forEach.call(document.querySelectorAll('nav .tab'),
    b=>b.classList.toggle('active', b.dataset.tab === name));
  Array.prototype.forEach.call(document.querySelectorAll('main > section'),
    s=>s.classList.toggle('active', s.id === name));
  updateWakeLock();
}

function zeigeUnter(bereichId, name){
  const wurzel = document.getElementById(bereichId);
  if(!wurzel) return;
  Array.prototype.forEach.call(wurzel.querySelectorAll(':scope > .unternav .unter'),
    b=>b.classList.toggle('active', b.dataset.unter === name));
  Array.prototype.forEach.call(wurzel.querySelectorAll(':scope > .unterpanel'),
    p=>p.classList.toggle('active', p.id === name));
  updateWakeLock();
}

Array.prototype.forEach.call(document.querySelectorAll('nav .tab'),
  t=>t.addEventListener('click', ()=>zeigeBereich(t.dataset.tab)));

Array.prototype.forEach.call(document.querySelectorAll('.unternav'), leiste=>{
  const bereichId = leiste.closest('section').id;
  Array.prototype.forEach.call(leiste.querySelectorAll('.unter'),
    b=>b.addEventListener('click', ()=>zeigeUnter(bereichId, b.dataset.unter)));
});

/* ---------- Kopfzeile ----------
   Kapitel 3.2: Haushaltsname links, Konto rechts. Beide Knoepfe fuehren
   vorerst in den Einstellungsbereich - Blaetter statt Vollbild kommen mit B6.
   Einstellungen sind kein Bereich mehr, deshalb leuchtet dort kein Reiter. */
function initialenAus(text){
  const teile = String(text || '').trim().split(/[\s@._-]+/).filter(Boolean);
  if(!teile.length) return '\u2013';
  const a = teile[0][0] || '';
  const b = teile.length > 1 ? (teile[1][0] || '') : '';
  return (a + b).toUpperCase();
}

function renderKopfzeile(){
  const nameEl = document.getElementById('kopfHaushaltName');
  if(nameEl){
    const eigen = aktivesHaushaltName && aktivesHaushaltName !== HAUSHALT_ID;
    nameEl.textContent = eigen ? aktivesHaushaltName : 'Haushalt';
  }
  const iniEl = document.getElementById('kopfInitialen');
  if(iniEl){
    const nutzer = (auth.currentUser && (auth.currentUser.displayName || auth.currentUser.email)) || '';
    iniEl.textContent = initialenAus(nutzer);
  }
}

document.getElementById('kopfHaushalt').addEventListener('click', ()=>{
  zeigeBereich('settings');
  window.scrollTo({ top:0, behavior:'smooth' });
});
document.getElementById('kopfKonto').addEventListener('click', ()=>{
  zeigeBereich('settings');
  const ziel = document.getElementById('acctEmail');
  if(ziel) ziel.closest('.card').scrollIntoView({ behavior:'smooth', block:'start' });
});

/* ---------- Heute ----------
   Geruest nach Kapitel 3.2. Termine und Aufgaben bleiben leer, bis Kalender (B5)
   und Notizen (B3) existieren - MD-15: ein leeres Feld ist eine Auskunft, keine
   Mahnung, also steht dort kein Aufruf, sondern was passieren wird.
   Heute rechnet immer mit der laufenden Woche, nie mit der im Wochenplan
   angezeigten - sonst zeigt "Heute" die Woche, in der jemand geblaettert hat. */
function renderHeute(){
  const jetzt = new Date(); jetzt.setHours(0,0,0,0);
  const wk = weekKeyOf(getMondayOf(jetzt));
  const tag = DAYS[(jetzt.getDay() + 6) % 7];

  const datumEl = document.getElementById('heuteDatum');
  if(datumEl) datumEl.textContent = tag + ', ' + fmtDate(jetzt);

  /* Essen */
  const essenEl = document.getElementById('heuteEssen');
  const eintraege = ((state.plan[wk] || {})[tag]) || {};
  let essenZeilen = [];
  activeSlots().forEach(sl=>{
    const e = eintraege[sl.id];
    if(!e || !e.id) return;
    const r = state.recipes.find(x=>x.id === e.id);
    if(!r) return;
    essenZeilen.push('<div class="heute-zeile"><span class="heute-was">' + escapeHtml(sl.label) +
      '</span><span class="heute-wer">' + escapeHtml(r.name) + '</span></div>');
  });
  if(essenEl){
    essenEl.innerHTML = essenZeilen.length
      ? essenZeilen.join('')
      : '<p class="ex-hint">Fuer heute ist nichts eingeplant.</p>';
  }

  /* Aufgaben — kommt aus den Notizen, eigener Abschnitt weiter unten */
  try{ renderHeuteAufgaben(); }catch(e){ console.warn('Aufgaben auf Heute:', e); }

  /* Einkauf */
  const einkaufEl = document.getElementById('heuteEinkauf');
  if(einkaufEl){
    let offen = [];
    try{
      offen = buildItems(wk).items.filter(i=>!i.checked);
    }catch(e){ offen = []; }
    if(!offen.length){
      einkaufEl.innerHTML = '<p class="ex-hint">Die Einkaufsliste ist abgearbeitet.</p>';
    }else{
      const zeigen = offen.slice(0, 5)
        .map(i=>'<span class="chip">' + escapeHtml(i.name) + '</span>').join('');
      const rest = offen.length > 5 ? ('<span class="chip">und ' + (offen.length - 5) + ' weitere</span>') : '';
      einkaufEl.innerHTML = '<p class="ex-hint">' + offen.length +
        (offen.length === 1 ? ' Posten offen.' : ' Posten offen.') + '</p>' +
        '<div class="chips">' + zeigen + rest + '</div>';
    }
  }
}

/* Kommt die App aus dem Hintergrund zurück, springt sie auf die laufende Woche */
function zurueckZurAktuellenWoche(){
  const jetzt = getMondayOf(new Date());
  if(jetzt.getTime() === currentMonday.getTime()) return;
  currentMonday = jetzt;
  renderWeekNav(); renderDayTrack(); renderShop();
}
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) zurueckZurAktuellenWoche(); });
window.addEventListener('focus', zurueckZurAktuellenWoche);
window.addEventListener('pageshow', zurueckZurAktuellenWoche);

/* Einladungslink für weitere Konten/Geräte: legt einen Code unter einladungen/<code>
   an, der auf den aktuellen Haushalt zeigt (siehe database.rules.json + tritteUeberEinladungBei) */
document.getElementById('copyInvite').addEventListener('click', async ()=>{
  const out = document.getElementById('inviteOut');
  if(!auth.currentUser || !HAUSHALT_ID){ out.textContent = 'Bitte kurz warten, bis die Anmeldung fertig ist.'; return; }
  out.textContent = 'Erzeuge Link …';
  try{
    const code = randId('', 24);
    await set(ref(db, 'einladungen/' + code), { haushalt: HAUSHALT_ID, erstelltVon: auth.currentUser.uid, erstellt: Date.now() });
    const link = location.origin + location.pathname + '#invite=' + code;
    try{
      await navigator.clipboard.writeText(link);
      out.textContent = 'Kopiert. Auf dem anderen Gerät öffnen, dort ein Konto erstellen oder anmelden — tritt danach automatisch diesem Haushalt bei.';
    }catch(e){
      out.textContent = link;
    }
    renderMemberList();
  }catch(e){
    out.textContent = 'Konnte keinen Einladungslink erzeugen (' + (e.code || e.message) + ').';
  }
});

/* Mitgliederliste im Reiter „Haushalt“ */
async function renderMemberList(){
  const box = document.getElementById('memberList');
  if(!box || !HAUSHALT_ID) return;
  try{
    const snap = await get(ref(db, 'haushalte/' + HAUSHALT_ID + '/members'));
    const members = snap.exists() ? snap.val() : {};
    const rows = Object.keys(members).map(uid=>{
      const m = members[uid] || {};
      const bistDu = auth.currentUser && uid === auth.currentUser.uid;
      const label = m.name || (bistDu ? 'Ihr' : 'Mitglied ' + uid.slice(0,6));
      return '<li class="member-row"><span>' + label + (bistDu ? ' (ihr)' : '') + '</span><span class="role">' + (m.rolle || 'mitglied') + '</span></li>';
    });
    box.innerHTML = rows.join('') || '<li class="hh-empty">Noch keine Mitglieder geladen.</li>';
  }catch(e){ box.innerHTML = ''; }
}

/* Nachträglich einem weiteren Haushalt beitreten — deckt den Fall ab, dass beim ersten
   Login (z. B. über Google, ohne das Alt-ID-Feld auszufüllen) schon ein neuer, leerer
   Haushalt entstanden ist und man danach noch den eigentlichen Haushalt claimen oder
   einer Einladung folgen möchte. "hh-…" wird als Haushalts-ID behandelt, alles andere
   als Einladungscode. */
document.getElementById('joinHhBtn').addEventListener('click', async ()=>{
  const out = document.getElementById('joinHhOut');
  const inp = document.getElementById('joinHhInput');
  const val = (inp.value || '').trim();
  if(!auth.currentUser){ out.textContent = 'Bitte kurz warten, bis die Anmeldung fertig ist.'; return; }
  if(!val){ out.textContent = 'Bitte eine Haushalts-ID oder einen Einladungscode eingeben.'; return; }
  out.textContent = 'Prüfe …';
  try{
    let hhId;
    if(/^hh-/.test(val)){
      const ok = await versucheClaim(val, auth.currentUser.uid);
      if(!ok) throw { message: 'Diese Haushalts-ID gehört schon zu einem Konto. Fragt stattdessen nach einem Einladungslink.' };
      hhId = val;
    } else {
      hhId = await tritteUeberEinladungBei(val, auth.currentUser.uid);
    }
    await aktiviereHaushalt(hhId);
    const mitgliedschaften = await ladeMitgliedschaften(auth.currentUser.uid);
    renderHhSwitch(mitgliedschaften);
    loadState();
    out.textContent = 'Beigetreten — ihr seht jetzt „' + aktivesHaushaltName + '“.';
    inp.value = '';
  }catch(e){
    out.textContent = e.message || ('Beitreten fehlgeschlagen (' + (e.code || '') + ').');
  }
});

/* =========================================================================
   21. Einstellungen: Haushaltsname, eigenes Profil (Name/E-Mail/Passwort)
   ========================================================================= */
const AUTH_ERR_DE_2 = {
  'auth/requires-recent-login': 'Das geht aus Sicherheitsgründen nur kurz nach dem Anmelden. Einmal ab- und wieder anmelden, dann nochmal versuchen.',
  'auth/email-already-in-use': 'Diese E-Mail-Adresse wird schon von einem anderen Konto benutzt.',
  'auth/credential-already-in-use': 'Für dieses Konto ist schon ein Passwort hinterlegt.',
  'auth/provider-already-linked': 'Für dieses Konto ist schon ein Passwort hinterlegt.'
};
function authErrText2(err){
  return AUTH_ERR_DE_2[err.code] || AUTH_ERR_DE[err.code] || ('Fehlgeschlagen (' + (err.code || err.message) + ').');
}

function renderSettingsTab(){
  const emailEl = document.getElementById('acctEmail');
  if(emailEl && auth.currentUser) emailEl.textContent = auth.currentUser.email || ('Konto ' + auth.currentUser.uid.slice(0,6));

  const nameInput = document.getElementById('profilNameInput');
  if(nameInput && auth.currentUser) nameInput.value = auth.currentUser.displayName || '';

  const hhInput = document.getElementById('hhNameInput');
  const hhSave = document.getElementById('hhNameSave');
  const hhHint = document.getElementById('hhNameHint');
  if(hhInput){
    hhInput.value = (aktivesHaushaltName && aktivesHaushaltName !== HAUSHALT_ID) ? aktivesHaushaltName : '';
    const binIchOwner = meineRolle === 'owner';
    if(hhSave) hhSave.disabled = !binIchOwner;
    if(hhHint) hhHint.textContent = binIchOwner
      ? 'So heißt euer Haushalt in der Übersicht und für alle Mitglieder.'
      : 'Nur der Eigentümer dieses Haushalts kann den Namen ändern.';
  }

  const pwLabel = document.getElementById('profilPwLabel');
  const hatPasswort = !!(auth.currentUser && auth.currentUser.providerData.some(p=>p.providerId==='password'));
  if(pwLabel) pwLabel.textContent = hatPasswort ? 'Passwort ändern' : 'Passwort hinzufügen (bisher nur Google-Anmeldung)';
  const pwBtn = document.getElementById('profilPwSave');
  if(pwBtn) pwBtn.textContent = hatPasswort ? 'Speichern' : 'Hinzufügen';


  /* Haushaltsname und Initialen stehen seit B1 in der Kopfzeile. */
  try{ renderKopfzeile(); }catch(e){ console.warn('Kopfzeile konnte nicht gezeichnet werden:', e); }
}

document.getElementById('hhNameSave').addEventListener('click', async ()=>{
  const out = document.getElementById('hhNameOut');
  const val = (document.getElementById('hhNameInput').value || '').trim();
  if(!val){ out.textContent = 'Bitte einen Namen eintragen.'; return; }
  try{
    await set(ref(db, 'haushalte/' + HAUSHALT_ID + '/meta/name'), val);
    aktivesHaushaltName = val;
    setOnline(istOnline);
    const mitgliedschaften = await ladeMitgliedschaften(auth.currentUser.uid);
    renderHhSwitch(mitgliedschaften);
    out.textContent = 'Gespeichert.';
  }catch(e){
    out.textContent = authErrText2(e);
  }
});

document.getElementById('profilNameSave').addEventListener('click', async ()=>{
  const out = document.getElementById('profilNameOut');
  const val = (document.getElementById('profilNameInput').value || '').trim();
  if(!val){ out.textContent = 'Bitte einen Namen eintragen.'; return; }
  out.textContent = 'Speichere …';
  try{
    await updateProfile(auth.currentUser, { displayName: val });
    const mitgliedschaften = await ladeMitgliedschaften(auth.currentUser.uid);
    await Promise.all(mitgliedschaften.map(hh=>
      set(ref(db, 'haushalte/' + hh + '/members/' + auth.currentUser.uid + '/name'), val).catch(()=>{})
    ));
    renderMemberList();
    out.textContent = 'Gespeichert.';
  }catch(e){
    out.textContent = authErrText2(e);
  }
});

document.getElementById('profilEmailSave').addEventListener('click', async ()=>{
  const out = document.getElementById('profilEmailOut');
  const val = (document.getElementById('profilEmailInput').value || '').trim();
  if(!val){ out.textContent = 'Bitte eine neue E-Mail-Adresse eintragen.'; return; }
  out.textContent = 'Ändere …';
  try{
    await updateEmail(auth.currentUser, val);
    document.getElementById('profilEmailInput').value = '';
    renderSettingsTab();
    out.textContent = 'Gespeichert — künftig mit ' + val + ' anmelden.';
  }catch(e){
    out.textContent = (e.code === 'auth/operation-not-allowed')
      ? 'Firebase verlangt hier eine Bestätigung per Link statt einer direkten Änderung — dieses Projekt hat "Email enumeration protection" aktiv. Für jetzt: E-Mail-Adresse stattdessen direkt in der Firebase-Konsole unter Authentication ändern.'
      : authErrText2(e);
  }
});

document.getElementById('profilPwSave').addEventListener('click', async ()=>{
  const out = document.getElementById('profilPwOut');
  const val = document.getElementById('profilPwInput').value;
  if(!val || val.length < 6){ out.textContent = 'Mindestens 6 Zeichen eintragen.'; return; }
  out.textContent = 'Speichere …';
  try{
    const hatPasswort = auth.currentUser.providerData.some(p=>p.providerId==='password');
    if(hatPasswort){
      await updatePassword(auth.currentUser, val);
    }else{
      await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, val));
      renderSettingsTab();
    }
    document.getElementById('profilPwInput').value = '';
    out.textContent = hatPasswort ? 'Gespeichert.' : 'Hinzugefügt — ihr könnt euch jetzt auch mit E-Mail und Passwort anmelden.';
  }catch(e){
    out.textContent = authErrText2(e);
  }
});

/* Service Worker: sorgt dafür, dass die App auch ohne Netz startet */
if('serviceWorker' in navigator && location.protocol.indexOf('http') === 0){
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}

addIngRow();
syncTypFelder();
/* loadState() wird nicht mehr hier, sondern von onAuthStateChanged aufgerufen,
   sobald Login und Haushalt feststehen (siehe Abschnitt 1b weiter oben). */

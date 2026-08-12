/* Butley — Push-Benachrichtigungen, Client-Seite (Kapitel 3.7, K-6, P-10, O-21)

   Eigenes Modul und kein Anhängsel des Kalenders: Kapitel 3.7 sagt das
   ausdrücklich, und app.js steht bei 5681 Zeilen — die Grenze aus T-1 liegt bei
   etwa 6000. Neue Bereiche entstehen deshalb als eigene Datei, wie figur.js und
   texte.js.

   Was hier passiert und was nicht:

   - Das Abo eines Geräts liegt unter haushalte/<id>/data/push/<uid>. Ein Konto
     hat genau ein Abo je Haushalt. Meldet sich dasselbe Konto auf einem zweiten
     Gerät an, ersetzt das neue Abo das alte — das ist eine bewusste Vereinfachung
     für Stufe 1 und in O-31 als Grenze benannt.
   - Gesendet wird hier nichts. Das macht der Worker unter /api/push (C3) und der
     Cron-Auftrag (C4). Der Client trägt nur ein, aus und stellt ein.
   - Die Erlaubnis wird NIE von selbst erfragt. iOS verlangt eine Nutzergeste,
     und Kapitel 3.7 verlangt "pro Person einstellbar" — beides führt zu
     demselben Bau: Es gibt einen Schalter, und nur er fragt.

   iOS ist die Vorbedingung, nicht die Fußnote (O-21): 6x iPhone, 3x gemischt,
   0x reines Android. Dort gibt es die Push-API ueberhaupt erst, wenn die App vom
   Homescreen aus laeuft. Ist das nicht der Fall, steht der Grund als Text neben
   dem ausgegrauten Schalter — Betriebsregel 18. */

import { txt } from './texte.js';

/* Öffentlicher VAPID-Schlüssel. Kein Geheimnis: Er steht in jeder Anfrage an den
   Push-Dienst und identifiziert nur den Absender. Der private Gegenpart liegt
   als Secret im Worker und verlässt Cloudflare nie. */
export const VAPID_OEFFENTLICH =
  'BCg0QLOEJWWP9q4aa1LSLssncZJhPwD9_dOa_x85zh37vw3TufK6GsIqdclSXIOVsyhnd3_VXpqb3n_n1lq5nOw';

/* ---------- Lage feststellen ---------- */

export function vomHomescreen() {
  return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
}

export function istApple() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/* Warum Push hier nicht geht — oder null, wenn es geht.

   Die Reihenfolge ist Absicht: Auf einem iPhone im Safari-Tab fehlt die
   Push-API, und die Meldung "dein Browser kann das nicht" wäre falsch. Der
   Grund ist nicht der Browser, sondern der fehlende Homescreen. */
export function hindernis() {
  if (istApple() && !vomHomescreen()) return 'homescreen';
  if (!('serviceWorker' in navigator)) return 'browser';
  if (!('PushManager' in window)) return 'browser';
  if (!('Notification' in window)) return 'browser';
  if (Notification.permission === 'denied') return 'verweigert';
  return null;
}

export function hindernisText(grund) {
  if (grund === 'homescreen') return txt('push.nur_vom_homescreen');
  if (grund === 'verweigert') return txt('push.erlaubnis_verweigert');
  if (grund === 'browser') return txt('push.browser_kann_das_nicht');
  return '';
}

/* ---------- Abo ---------- */

function b64UrlZuBytes(b64) {
  const roh = atob((b64 + '='.repeat((4 - b64.length % 4) % 4))
    .replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
  return bytes;
}

function bytesZuB64Url(puffer) {
  const bytes = new Uint8Array(puffer);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function registrierung() {
  /* ready statt register: Der Service Worker wird in app.js angemeldet. Wer hier
     ein zweites Mal registriert, bekommt bei laufendem Update eine zweite
     Instanz und ein Abo, das zur falschen gehört. */
  return navigator.serviceWorker.ready;
}

export async function vorhandenesAbo() {
  if (hindernis()) return null;
  try {
    const reg = await registrierung();
    return await reg.pushManager.getSubscription();
  } catch (e) {
    console.warn('[push] Abo nicht lesbar:', e);
    return null;
  }
}

/* Fragt die Erlaubnis und legt das Abo an. Darf nur aus einem Klick heraus
   aufgerufen werden — sonst verwirft iOS die Anfrage wortlos. */
export async function abonnieren() {
  const grund = hindernis();
  if (grund) return { ok: false, grund };

  const erlaubnis = await Notification.requestPermission();
  if (erlaubnis !== 'granted') return { ok: false, grund: 'verweigert' };

  const reg = await registrierung();
  const abo = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64UrlZuBytes(VAPID_OEFFENTLICH)
  });
  return { ok: true, abo, daten: aboDaten(abo) };
}

export async function abbestellen() {
  const abo = await vorhandenesAbo();
  if (!abo) return true;
  try { await abo.unsubscribe(); } catch (e) { console.warn('[push] Abbestellen:', e); }
  return true;
}

/* Die Form, in der ein Abo in der Datenbank liegt. Genau diese vier Felder
   verlangt die Sicherheitsregel unter haushalte/<id>/data/push/<uid>. */
export function aboDaten(abo) {
  const roh = abo.toJSON();
  return {
    endpunkt: roh.endpoint,
    p256dh: roh.keys.p256dh,
    auth: roh.keys.auth,
    angelegt: Date.now()
  };
}

/* Läuft das gespeicherte Abo noch, und ist es dasselbe wie im Browser?

   Ein Push-Dienst kann ein Abo jederzeit fallen lassen — nach einer Neuinstallation,
   nach langem Nichtgebrauch, nach einem Browserwechsel. Dann steht in der Datenbank
   ein Endpunkt, an den niemand mehr etwas zustellen kann, und der Nutzer sieht
   einen eingeschalteten Schalter ohne Wirkung. Das ist dieselbe Bauart wie der
   Dunkelmodus vor B6: vorhanden, dokumentiert, nie wirksam. */
export async function abgleichen(gespeichert) {
  const abo = await vorhandenesAbo();
  if (!abo) return { zustand: 'aus', daten: null };
  const daten = aboDaten(abo);
  if (!gespeichert || gespeichert.endpunkt !== daten.endpunkt) {
    return { zustand: 'neu', daten };
  }
  return { zustand: 'an', daten: null };
}

/* ---------- Probe ---------- */

/* Eine Benachrichtigung ohne Server, direkt aus dem Service Worker.

   Sie beweist nicht, dass Push funktioniert — nur, dass die Erlaubnis steht und
   der Service Worker anzeigen darf. Der echte Weg über den Push-Dienst kommt mit
   C3. Trotzdem gehört sie hierher: Ohne sie ist C2 ein Schalter, der nichts tut,
   und niemand merkt, wenn er nichts tut. */
export async function probeAnzeigen() {
  if (hindernis()) return false;
  if (Notification.permission !== 'granted') return false;
  const reg = await registrierung();
  await reg.showNotification(txt('push.probe_titel'), {
    body: txt('push.probe_text'),
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-96.png',
    tag: 'butley-probe',
    data: { bereich: 'heute' }
  });
  return true;
}

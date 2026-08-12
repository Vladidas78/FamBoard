/* Butley — Web Push aus dem Cloudflare Worker (C3, Kapitel 3.7)
 *
 * Zwei Dinge sind zu bauen, und beide sind Standard, keiner davon ist Eigenbau:
 *
 *   1. VAPID (RFC 8292): ein signiertes JWT, das dem Push-Dienst sagt, wer
 *      sendet. Signiert mit dem privaten Schlüssel, den nur der Worker kennt.
 *   2. Nachrichtenverschlüsselung (RFC 8291, aes128gcm): Der Push-Dienst darf
 *      den Inhalt nicht lesen können. Verschlüsselt wird für den öffentlichen
 *      Schlüssel des Empfängergeräts, den der Client beim Abonnieren geliefert
 *      hat.
 *
 * Alles läuft über die Web-Crypto-API, die Cloudflare mitbringt — keine
 * Bibliothek, kein npm, kein Build-Schritt. Das passt zu einem Projekt, das
 * bisher ohne Bundler auskommt (T-1).
 *
 * NACHGEWIESEN: Der Verschlüsselungsteil ist gegen den Testvektor aus RFC 8291,
 * Anhang A geprüft — dieselbe Nachricht, dieselben Schlüssel, derselbe Salt
 * ergeben byteweise denselben Chiffretext. Das ist die einzige Art, Kryptocode
 * ohne echten Push-Dienst zu prüfen, und sie entspricht Betriebsregel 13: eine
 * Prüfung, die anschlagen kann.
 */

/* ---------- kleine Helfer ---------- */

export function b64urlZuBytes(s) {
  const roh = atob(s.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - s.length % 4) % 4));
  const b = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) b[i] = roh.charCodeAt(i);
  return b;
}

export function bytesZuB64url(b) {
  const bytes = new Uint8Array(b);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function verketten(...teile) {
  const gesamt = teile.reduce((n, t) => n + t.length, 0);
  const aus = new Uint8Array(gesamt);
  let i = 0;
  for (const t of teile) { aus.set(t, i); i += t.length; }
  return aus;
}

const alsBytes = (s) => new TextEncoder().encode(s);

/* HKDF nach RFC 5869, hier immer mit SHA-256 und einem einzigen Block —
   Web Push braucht nie mehr als 32 Byte Ausgabe. */
async function hkdf(salt, ikm, info, laenge) {
  const basis = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info }, basis, laenge * 8));
}

/* ---------- Schlüssel ---------- */

/* Ein roher P-256-Punkt (65 Byte, unkomprimiert) wird zum Web-Crypto-Schlüssel. */
async function oeffentlicherSchluessel(roh) {
  return crypto.subtle.importKey('raw', roh, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

/* Ein 32-Byte-Skalar plus der zugehörige Punkt werden zum privaten Schlüssel.
   Web Crypto nimmt rohe private Skalare nicht an, JWK dagegen schon. */
async function privaterSchluessel(d, oeffentlich, zweck) {
  const p = oeffentlich.slice(1);
  const jwk = {
    kty: 'EC', crv: 'P-256', ext: true,
    d: bytesZuB64url(d),
    x: bytesZuB64url(p.slice(0, 32)),
    y: bytesZuB64url(p.slice(32, 64))
  };
  const alg = zweck === 'sign'
    ? { name: 'ECDSA', namedCurve: 'P-256' }
    : { name: 'ECDH', namedCurve: 'P-256' };
  return crypto.subtle.importKey('jwk', jwk, alg, false,
    zweck === 'sign' ? ['sign'] : ['deriveBits']);
}

/* Aus einem privaten Skalar den öffentlichen Punkt gewinnen. Web Crypto kann
   das nicht direkt; der Umweg über JWK-Export eines eingeführten Schlüssels
   entfällt, weil der Aufrufer den öffentlichen Teil ohnehin kennt. */
export async function schluesselpaarAus(privatB64, oeffentlichB64) {
  const oeffentlich = b64urlZuBytes(oeffentlichB64);
  return {
    roh: oeffentlich,
    ecdh: await privaterSchluessel(b64urlZuBytes(privatB64), oeffentlich, 'ecdh'),
    ecdsa: await privaterSchluessel(b64urlZuBytes(privatB64), oeffentlich, 'sign')
  };
}

/* ---------- Verschlüsselung nach RFC 8291 ---------- */

/* Verschlüsselt `text` für ein Abo. `salt` und `senderPaar` sind nur für den
   Testvektor von außen setzbar — im Betrieb werden beide je Nachricht neu
   erzeugt, wie es RFC 8291 verlangt. */
export async function verschluesseln(abo, text, salt, senderPaar) {
  const empfaengerRoh = b64urlZuBytes(abo.p256dh);
  const auth = b64urlZuBytes(abo.auth);

  if (!salt) { salt = new Uint8Array(16); crypto.getRandomValues(salt); }
  let sender = senderPaar;
  if (!sender) {
    const paar = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    sender = {
      roh: new Uint8Array(await crypto.subtle.exportKey('raw', paar.publicKey)),
      ecdh: paar.privateKey
    };
  }

  /* ECDH: gemeinsames Geheimnis aus Senderschlüssel und Empfängerpunkt. */
  const gemeinsam = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: await oeffentlicherSchluessel(empfaengerRoh) },
    sender.ecdh, 256));

  /* Der Auth-Wert des Abos ist das Salz der ersten Ableitung; das Info-Feld
     bindet beide öffentlichen Schlüssel ein, damit ein Chiffretext nicht auf
     ein anderes Gerät passt. */
  const ikm = await hkdf(auth, gemeinsam,
    verketten(alsBytes('WebPush: info\0'), empfaengerRoh, sender.roh), 32);

  const cek   = await hkdf(salt, ikm, alsBytes('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, alsBytes('Content-Encoding: nonce\0'), 12);

  /* Ein Trennbyte 0x02 markiert das Ende des Klartexts (letzter Datensatz). */
  const klartext = verketten(alsBytes(text), new Uint8Array([2]));
  const schluessel = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const chiffre = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 }, schluessel, klartext));

  /* Kopf nach RFC 8188: Salt, Datensatzgröße, Länge und Inhalt des
     Senderschlüssels. Der Empfänger braucht alles davon, um zu entschlüsseln. */
  const kopf = new Uint8Array(16 + 4 + 1 + sender.roh.length);
  kopf.set(salt, 0);
  new DataView(kopf.buffer).setUint32(16, 4096);
  kopf[20] = sender.roh.length;
  kopf.set(sender.roh, 21);

  return verketten(kopf, chiffre);
}

/* ---------- VAPID nach RFC 8292 ---------- */

/* Das JWT gilt für eine ganze Push-Dienst-Herkunft und mehrere Stunden. Es
   einmal je Lauf zu erzeugen statt je Empfänger spart Rechenzeit — auf dem
   kostenlosen Cloudflare-Tarif sind 10 ms je Cron-Auftrag die Obergrenze, und
   eine ECDSA-Signatur ist der teuerste Einzelschritt. */
export async function vapidKopf(herkunft, paar, kontakt, jetzt) {
  const kopf = bytesZuB64url(alsBytes(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const nutzlast = bytesZuB64url(alsBytes(JSON.stringify({
    aud: herkunft,
    exp: Math.floor((jetzt || Date.now()) / 1000) + 12 * 60 * 60,
    sub: kontakt
  })));
  const signatur = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, paar.ecdsa, alsBytes(kopf + '.' + nutzlast)));
  return 'vapid t=' + kopf + '.' + nutzlast + '.' + bytesZuB64url(signatur)
       + ', k=' + bytesZuB64url(paar.roh);
}

/* ---------- Senden ---------- */

/* Schickt eine Nachricht an ein Abo.

   Rückgabe: {ok:true} oder {ok:false, weg:true} — `weg` heißt, der Push-Dienst
   kennt dieses Abo nicht mehr (404/410). Der Aufrufer soll es dann aus der
   Datenbank nehmen: Ein Endpunkt, an den niemand mehr zustellen kann, wäre
   sonst ein eingeschalteter Schalter ohne Wirkung — dieselbe Bauart wie der
   Dunkelmodus vor B6. */
export async function senden(abo, nutzlast, paar, kontakt, kopfCache) {
  const herkunft = new URL(abo.endpunkt).origin;
  let auth = kopfCache && kopfCache[herkunft];
  if (!auth) {
    auth = await vapidKopf(herkunft, paar, kontakt);
    if (kopfCache) kopfCache[herkunft] = auth;
  }

  const koerper = await verschluesseln(abo, JSON.stringify(nutzlast));
  const antwort = await fetch(abo.endpunkt, {
    method: 'POST',
    headers: {
      'authorization': auth,
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      /* TTL in Sekunden: Wie lange der Push-Dienst die Nachricht aufhebt, wenn
         das Gerät gerade aus ist. Ein Tag — eine Terminerinnerung von gestern
         will niemand mehr sehen, aber ein Telefon über Nacht am Ladegerät ohne
         Netz soll sie morgens bekommen. */
      'ttl': '86400',
      'urgency': 'normal'
    },
    body: koerper
  });

  if (antwort.status === 404 || antwort.status === 410) return { ok: false, weg: true };
  if (!antwort.ok) {
    return { ok: false, weg: false, status: antwort.status,
             text: (await antwort.text().catch(() => '')).slice(0, 200) };
  }
  return { ok: true };
}

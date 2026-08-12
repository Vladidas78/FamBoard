/* Butley — Worker-Route /api/push (C3, Kapitel 3.7)
 *
 * WER DARF SENDEN? Diese Frage beantwortet nicht dieser Worker, sondern
 * Firebase.
 *
 * Der naheliegende Weg wäre, das Anmelde-Token des Aufrufers hier selbst zu
 * prüfen: Googles öffentliche Schlüssel holen, RS256 nachrechnen, Aussteller
 * und Ablauf vergleichen, die Schlüssel zwischenspeichern. Das ist machbar und
 * wäre ein zweiter Ort, an dem steht, wer zu einem Haushalt gehört — neben den
 * Sicherheitsregeln, die es ohnehin wissen. Zwei Stellen mit demselben Wissen
 * laufen auseinander (K-13, T-9).
 *
 * Stattdessen benutzt der Worker das Token, statt es zu prüfen: Er holt die
 * Abo-Liste des Haushalts mit dem Token des Aufrufers. Gelingt das, ist der
 * Aufrufer nachweislich Mitglied — die Regel hat es gerade entschieden.
 * Scheitert es, war er es nicht. Kein eigener Prüfcode, kein Geheimnis im
 * Worker, kein zweiter Türsteher. Das ist derselbe Gedanke wie T-12, nur
 * andersherum: Dort holt der Worker etwas Öffentliches, hier leiht er sich die
 * Rechte dessen, der fragt.
 *
 * Was der Worker damit NICHT kann: von sich aus senden. Genau dafür ist der
 * Weckruf-Zweig nach T-14 da (C4).
 */

import { schluesselpaarAus, senden } from './push-senden.js';

const DB = 'https://famplan-e8e4c-default-rtdb.europe-west1.firebasedatabase.app';

/* Wie viele Empfänger je Aufruf. Auf dem kostenlosen Cloudflare-Tarif liegen
   die Grenzen bei 50 Unteranfragen und 10 ms Rechenzeit je Aufruf; jede
   Nachricht kostet eine ECDH-Ableitung. Fünfzehn ist mit Abstand genug für
   einen Haushalt (Z-3 deckelt bei 10 Personen) und lässt Luft für das Lesen
   und das Aufräumen. Wird der Deckel erreicht, steht es in der Antwort — ein
   stilles Abschneiden wäre schlimmer als eine Grenze, die man sieht. */
const MAX_EMPFAENGER = 15;

function antwort(daten, status) {
  return new Response(JSON.stringify(daten), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export async function handlePush(request, env) {
  if (request.method !== 'POST') return antwort({ ok: false, fehler: 'Nur POST.' }, 405);

  if (!env.VAPID_PRIVAT || !env.VAPID_OEFFENTLICH) {
    return antwort({ ok: false, fehler: 'VAPID-Schluessel sind im Worker nicht gesetzt.' }, 500);
  }

  let d;
  try { d = await request.json(); } catch (e) { d = null; }
  if (!d || !d.token || !d.haushalt || !d.titel) {
    return antwort({ ok: false, fehler: 'token, haushalt und titel sind noetig.' }, 400);
  }
  if (!/^[A-Za-z0-9_-]{8,}$/.test(d.haushalt)) {
    return antwort({ ok: false, fehler: 'Haushalts-ID sieht nicht danach aus.' }, 400);
  }

  /* Der Türsteher: Diese Anfrage gelingt nur, wenn das Token zu einem Mitglied
     gehört. Firebase antwortet sonst mit 401 und einer Meldung, die wir nicht
     weiterreichen — sie gehört in die Konsole des Betreibers, nicht in eine
     API-Antwort. */
  const pfad = DB + '/haushalte/' + encodeURIComponent(d.haushalt)
             + '/data/push.json?auth=' + encodeURIComponent(d.token);
  const gelesen = await fetch(pfad);
  if (gelesen.status === 401 || gelesen.status === 403) {
    return antwort({ ok: false, fehler: 'Kein Zugriff auf diesen Haushalt.' }, 403);
  }
  if (!gelesen.ok) {
    return antwort({ ok: false, fehler: 'Die Abos liessen sich nicht lesen.' }, 502);
  }
  const abos = (await gelesen.json()) || {};

  /* Der Absender bekommt seine eigene Meldung nicht. Wer eine Aufgabe zuweist,
     weiss selbst am besten, dass er sie zugewiesen hat — eine Benachrichtigung
     darueber waere die Sorte Rueckmeldung, die man nach dem dritten Mal
     abschaltet, und mit ihr alle anderen (MD-15). */
  const empfaenger = Object.keys(abos)
    .filter(uid => uid !== d.absender && abos[uid] && abos[uid].endpunkt)
    .slice(0, MAX_EMPFAENGER);
  const gedeckelt = Object.keys(abos).filter(uid => uid !== d.absender).length > MAX_EMPFAENGER;

  if (!empfaenger.length) return antwort({ ok: true, gesendet: 0, gedeckelt: false });

  const paar = await schluesselpaarAus(env.VAPID_PRIVAT, env.VAPID_OEFFENTLICH);
  const kontakt = env.VAPID_KONTAKT || 'mailto:butley@example.invalid';
  const nutzlast = {
    titel: String(d.titel).slice(0, 120),
    text: String(d.text || '').slice(0, 300),
    bereich: ['heute', 'kalender', 'essen', 'einkauf', 'notizen'].indexOf(d.bereich) >= 0
      ? d.bereich : 'heute',
    tag: String(d.tag || 'butley').slice(0, 40)
  };

  const kopfCache = {};
  let gesendet = 0;
  const abgelaufen = [];
  for (const uid of empfaenger) {
    try {
      const e = await senden(abos[uid], nutzlast, paar, kontakt, kopfCache);
      if (e.ok) gesendet++;
      else if (e.weg) abgelaufen.push(uid);
    } catch (e) {
      /* Ein Empfänger, der nicht geht, darf die übrigen nicht aufhalten. */
    }
  }

  /* Abos, die der Push-Dienst nicht mehr kennt, aus der Datenbank nehmen —
     wieder mit den Rechten des Aufrufers, nicht mit eigenen. Ohne das bleibt
     ein toter Endpunkt stehen, und der Schalter im Geraet des anderen zeigt
     weiter "an", ohne dass je etwas ankaeme. */
  for (const uid of abgelaufen) {
    await fetch(DB + '/haushalte/' + encodeURIComponent(d.haushalt)
      + '/data/push/' + encodeURIComponent(uid) + '.json?auth='
      + encodeURIComponent(d.token), { method: 'DELETE' }).catch(() => null);
  }

  return antwort({ ok: true, gesendet, abgelaufen: abgelaufen.length, gedeckelt });
}

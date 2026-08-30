/* Butley — Weckrufe (C4, Kapitel 3.7): Route /api/weckruf und Cron-Lauf.
 *
 * Der Wecker nach T-14: Der Client rechnet Erinnerungen voraus und legt sie
 * unter weckrufe/<token> an der RTDB-Wurzel ab (nur um/titel/text, A1). Dieser
 * Worker holt alle fuenf Minuten das Faellige und sendet per Web Push.
 *
 * Zwei Teile:
 *
 *   1. weckrufRoute — "anmelden/auffrischen". Der Worker leiht sich das
 *      Firebase-Token des Aufrufers (T-16-Muster wie /api/push), liest damit
 *      weckrufToken und die Abo-Liste des Haushalts und legt die Abo-Kopie in
 *      KV ab. Die Abo-Daten liegen NIE im oeffentlichen Zweig — das war Svens
 *      Kernproblem (Annahme 7), und die KV-Kopie ist die Antwort darauf.
 *      Ehrlicher Preis: ein zweiter Ort mit Abo-Wissen (K-13/T-9-Doppelung);
 *      Quelle bleibt data/push, aufgefrischt bei jedem Aufruf dieser Route.
 *
 *   2. weckrufCron — der eigentliche Wecker. Ein Lauf je fuenf Minuten:
 *      genau EIN KV-List (A12), je Token eine Faelligkeits-Query (60 Minuten
 *      Nachholgrenze), je faelligem Eintrag Dedup ueber ws:-Schluessel,
 *      Senden ueber senden() aus push-senden.js. KV-Operationen zaehlen als
 *      Unteranfragen gegen die 50er-Grenze (Noras Befund) — deshalb der
 *      Gesamt-Ops-Zaehler mit hartem Abbruch bei 45 und Sendedeckel 12 (A9).
 *      Was liegen bleibt, holt der naechste Lauf ueber die Nachholgrenze.
 */

import { schluesselpaarAus, senden } from './push-senden.js';

const DB = 'https://famplan-e8e4c-default-rtdb.europe-west1.firebasedatabase.app';

/* Harter Deckel fuer alle Operationen eines Cron-Laufs (KV-List, KV-Gets,
   Dedup-Get/Put, RTDB- und Push-fetches). 45 laesst Luft unter der 50er-
   Subrequest-Grenze; der abschliessende wl:stand-Put kommt notfalls als 46.
   Operation und der Rest wartet auf den naechsten Lauf. */
const OPS_DECKEL = 45;

/* Hoechstens so viele Push-Nachrichten je Lauf (A9, von Erik verfuegt). */
const SENDE_DECKEL = 12;

/* Nachholgrenze: Ein Weckruf, der aelter ist als eine Stunde, wird nicht mehr
   gesendet — eine Erinnerung von vorgestern will niemand mehr sehen. */
const NACHHOL_MS = 60 * 60 * 1000;

function antwort(daten, status) {
  return new Response(JSON.stringify(daten), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

/* Aus der rohen Abo-Liste (data/push) die schlanke KV-Kopie bauen: je Nutzer
   nur endpunkt/p256dh/auth — mehr braucht das Senden nicht, und mehr soll der
   zweite Abo-Ort auch nicht wissen. */
function aboKopie(abos) {
  const kopie = {};
  for (const uid of Object.keys(abos || {})) {
    const a = abos[uid];
    if (a && a.endpunkt && a.p256dh && a.auth) {
      kopie[uid] = { endpunkt: a.endpunkt, p256dh: a.p256dh, auth: a.auth };
    }
  }
  return kopie;
}

/* ---------- Route POST /api/weckruf ---------- */

/* Nimmt {hh, idToken}, liest mit den geliehenen Rechten des Aufrufers das
   weckrufToken und die Abos und legt beides als wr:<token> in KV ab —
   geschrieben wird nur bei Abweichung, damit App-Start-Aufrufe (A3/A14) das
   KV-Schreibbudget nicht leerlaufen lassen. */
export async function weckrufRoute(request, env) {
  if (request.method !== 'POST') return antwort({ ok: false, fehler: 'Nur POST.' }, 405);

  if (!env.WECKRUFE) {
    return antwort({ ok: false, fehler: 'KV-Namespace WECKRUFE ist im Worker nicht gebunden.' }, 500);
  }

  let d;
  try { d = await request.json(); } catch (e) { d = null; }
  if (!d || !d.hh || !d.idToken) {
    return antwort({ ok: false, fehler: 'hh und idToken sind noetig.' }, 400);
  }
  if (!/^[A-Za-z0-9_-]{8,}$/.test(d.hh)) {
    return antwort({ ok: false, fehler: 'Haushalts-ID sieht nicht danach aus.' }, 400);
  }

  /* Der Tuersteher (T-16): Beide Lesezugriffe gelingen nur, wenn das Token zu
     einem Mitglied gehoert — das entscheidet die Firebase-Regel, nicht wir. */
  const basis = DB + '/haushalte/' + encodeURIComponent(d.hh);
  const auth = '?auth=' + encodeURIComponent(d.idToken);

  const tokenAntwort = await fetch(basis + '/data/settings/weckrufToken.json' + auth);
  if (tokenAntwort.status === 401 || tokenAntwort.status === 403) {
    return antwort({ ok: false, fehler: 'Kein Zugriff auf diesen Haushalt.' }, 403);
  }
  if (!tokenAntwort.ok) {
    return antwort({ ok: false, fehler: 'Das weckrufToken liess sich nicht lesen.' }, 502);
  }
  const token = await tokenAntwort.json();

  /* Kein weckrufToken: Der Haushalt nutzt keine Erinnerungen — nichts zu tun,
     nichts zu schreiben. Gleiche Zeichenform wie neuesToken() im Client. */
  if (typeof token !== 'string' || !/^[a-z0-9]{16,64}$/.test(token)) {
    return new Response(null, { status: 204 });
  }

  const pushAntwort = await fetch(basis + '/data/push.json' + auth);
  if (pushAntwort.status === 401 || pushAntwort.status === 403) {
    return antwort({ ok: false, fehler: 'Kein Zugriff auf diesen Haushalt.' }, 403);
  }
  if (!pushAntwort.ok) {
    return antwort({ ok: false, fehler: 'Die Abos liessen sich nicht lesen.' }, 502);
  }
  const abos = aboKopie((await pushAntwort.json()) || {});

  /* Schreiben nur bei Abweichung: erst lesen, dann vergleichen. Der Zeitstempel
     `aktualisiert` bleibt beim Vergleich aussen vor, sonst waere nie etwas gleich. */
  const schluessel = 'wr:' + token;
  let vorhanden = null;
  try { vorhanden = await env.WECKRUFE.get(schluessel, 'json'); } catch (e) { vorhanden = null; }
  if (vorhanden && vorhanden.hh === d.hh
      && JSON.stringify(vorhanden.abos || {}) === JSON.stringify(abos)) {
    return antwort({ ok: true, geschrieben: false });
  }

  try {
    await env.WECKRUFE.put(schluessel, JSON.stringify({
      hh: d.hh, abos, aktualisiert: Date.now()
    }));
  } catch (e) {
    return antwort({ ok: false, fehler: 'Die Abo-Kopie liess sich nicht ablegen.' }, 502);
  }

  return antwort({ ok: true, geschrieben: true });
}

/* ---------- Cron-Lauf ---------- */

/* wl:stand schreiben — das Lebenszeichen (A10). Rudi gewann gegen Arnes
   Sparsamkeit: einmal je Stunde auch ohne Versand, sonst waere ein stiller
   Cron-Ausfall unsichtbar. Zaehlt als Operation, bricht aber nie ab — ein
   Heartbeat, der dem eigenen Deckel zum Opfer faellt, waere keiner. */
async function schreibeStand(env, gesendet, fehler) {
  try {
    await env.WECKRUFE.put('wl:stand', JSON.stringify({
      t: Date.now(), gesendet, fehler: fehler || ''
    }));
  } catch (e) {
    console.error('weckrufCron: wl:stand liess sich nicht schreiben:', e && e.message);
  }
}

export async function weckrufCron(env) {
  if (!env.WECKRUFE) {
    console.error('weckrufCron: KV-Namespace WECKRUFE ist nicht gebunden.');
    return;
  }
  if (!env.VAPID_PRIVAT || !env.VAPID_OEFFENTLICH) {
    console.error('weckrufCron: VAPID-Schluessel sind nicht gesetzt.');
    return;
  }

  const jetzt = Date.now();
  /* Der Lauf zur vollen Stunde (Cron feuert zu :00, :05, …) macht zusaetzlich
     Selbstheilung und schreibt den Heartbeat auch ohne Versand. */
  const stundenlauf = new Date(jetzt).getUTCMinutes() < 5;

  let ops = 0;          // alle Operationen: KV + RTDB + Push (Noras Befund: KV zaehlt mit)
  let gesendet = 0;     // Push-Nachrichten in diesem Lauf
  let fehler = '';      // erste Fehlermeldung fuer wl:stand
  let voll = false;     // Ops- oder Sendedeckel erreicht — Rest holt der naechste Lauf

  const paar = await schluesselpaarAus(env.VAPID_PRIVAT, env.VAPID_OEFFENTLICH);
  const kontakt = env.VAPID_KONTAKT || 'mailto:butley@example.invalid';
  const kopfCache = {};

  try {
    /* Genau EIN KV-List je Lauf (A12): 288 Laeufe/Tag = 29 % des List-Budgets. */
    ops++;
    const liste = await env.WECKRUFE.list({ prefix: 'wr:' });

    for (const eintrag of liste.keys) {
      if (voll) break;
      const token = eintrag.name.slice(3);

      /* Je Token: 1 KV-Get + 1 RTDB-Query, stuendlich + 1 hh-Probe. Reicht das
         Budget dafuer nicht mehr, ist der Lauf voll. */
      if (ops + 2 > OPS_DECKEL) { voll = true; break; }

      ops++;
      let kopie = null;
      try { kopie = await env.WECKRUFE.get(eintrag.name, 'json'); } catch (e) { kopie = null; }
      if (!kopie || !kopie.hh) {
        console.error('weckrufCron: KV-Eintrag unlesbar:', eintrag.name);
        continue;
      }

      /* Selbstheilung statt Abmelde-Route: Ist der Zweig weg (Client hat null
         geschrieben oder der Haushalt ist fort), fliegt die KV-Kopie raus. */
      if (stundenlauf) {
        if (ops + 1 > OPS_DECKEL) { voll = true; break; }
        ops++;
        try {
          const probe = await fetch(DB + '/weckrufe/' + encodeURIComponent(token) + '/hh.json');
          if (probe.ok && (await probe.json()) === null) {
            if (ops + 1 > OPS_DECKEL) { voll = true; break; }
            ops++;
            await env.WECKRUFE.delete(eintrag.name);
            continue;
          }
        } catch (e) {
          /* Probe gescheitert — dann eben naechste Stunde. */
        }
      }

      /* Nur das Faellige holen, nicht den 30-Tage-Vorrat: orderBy-Query mit
         60-Minuten-Nachholgrenze. Der orderBy-Wert MUSS in URL-encodierten
         Anfuehrungszeichen stehen (Noras Befund). */
      ops++;
      let faellig = null;
      try {
        const abfrage = await fetch(DB + '/weckrufe/' + encodeURIComponent(token)
          + '/liste.json?orderBy=%22um%22&startAt=' + (jetzt - NACHHOL_MS) + '&endAt=' + jetzt);
        if (abfrage.ok) faellig = await abfrage.json();
        else fehler = fehler || ('RTDB-Query Status ' + abfrage.status);
      } catch (e) {
        fehler = fehler || ('RTDB-Query: ' + (e && e.message));
      }
      if (!faellig) continue;

      /* Faellige Eintraege nach `um` aufsteigend — die aelteste Erinnerung
         zuerst, falls der Sendedeckel mittendrin greift. */
      const ids = Object.keys(faellig)
        .filter(id => faellig[id] && typeof faellig[id].um === 'number')
        .sort((a, b) => faellig[a].um - faellig[b].um);

      const abos = Object.keys(kopie.abos || {});

      for (const id of ids) {
        if (!abos.length) break;

        /* Sendedeckel: Der naechste Eintrag braucht ein Push je Abo — passt
           das nicht mehr hinein, bleibt er liegen (Nachholgrenze faengt ihn). */
        if (gesendet + abos.length > SENDE_DECKEL) { voll = true; break; }
        /* Ops-Budget fuer Dedup-Get, alle Sendungen und den Dedup-Put — ein
           Eintrag wird ganz oder gar nicht bearbeitet, sonst entstuenden
           Sendungen ohne Dedup-Vermerk. */
        if (ops + 1 + abos.length + 1 > OPS_DECKEL) { voll = true; break; }

        ops++;
        let schonGesendet = null;
        try { schonGesendet = await env.WECKRUFE.get('ws:' + token + ':' + id); } catch (e) {
          /* Dedup-Zustand unbekannt -> NICHT senden (A11-Geist): lieber eine
             Erinnerung verspaetet als doppelt. */
          fehler = fehler || 'Dedup-Get gescheitert';
          continue;
        }
        if (schonGesendet) continue;

        /* Der Client formuliert titel/text fertig, der Worker formatiert
           nichts. `tag` = Weckruf-ID, damit Meldungen einander nicht
           ersetzen (A5). */
        const w = faellig[id];
        const nutzlast = {
          titel: String(w.titel || '').slice(0, 120),
          text: String(w.text || '').slice(0, 300),
          tag: String(id).slice(0, 60)
        };

        const weg = [];
        for (const uid of abos) {
          ops++;
          try {
            const e = await senden(kopie.abos[uid], nutzlast, paar, kontakt, kopfCache);
            if (e.ok) gesendet++;
            else if (e.weg) weg.push(uid);
            else fehler = fehler || ('Push Status ' + (e.status || '?'));
          } catch (e) {
            /* Ein Empfaenger, der nicht geht, haelt die uebrigen nicht auf. */
            fehler = fehler || ('Senden: ' + (e && e.message));
          }
        }

        /* Dedup-Vermerk NACH dem Sendedurchgang — auch wenn einzelne
           Empfaenger scheiterten, sonst bekaemen die erreichten die Meldung
           im naechsten Lauf noch einmal. Scheitert der Put selbst, bricht der
           ganze Lauf ab (A11): niemals weitersenden ohne Dedup. */
        ops++;
        try {
          await env.WECKRUFE.put('ws:' + token + ':' + id, '1', { expirationTtl: 86400 });
        } catch (e) {
          const meldung = 'Dedup-Put gescheitert: ' + (e && e.message);
          console.error('weckrufCron:', meldung);
          await schreibeStand(env, gesendet, meldung);
          return;
        }

        /* Abos, die der Push-Dienst nicht mehr kennt (404/410), aus der
           KV-Kopie nehmen — das 410-Aufraeumen haelt den zweiten Abo-Ort sauber. */
        if (weg.length) {
          for (const uid of weg) {
            delete kopie.abos[uid];
            abos.splice(abos.indexOf(uid), 1);
          }
          if (ops + 1 <= OPS_DECKEL) {
            ops++;
            try {
              await env.WECKRUFE.put(eintrag.name, JSON.stringify({
                hh: kopie.hh, abos: kopie.abos, aktualisiert: Date.now()
              }));
            } catch (e) {
              /* Aufraeumen darf den Lauf nicht kippen; naechste Route-Auffrischung heilt. */
            }
          }
        }
      }
    }
  } catch (e) {
    fehler = fehler || ('Lauf: ' + (e && e.message));
    console.error('weckrufCron: Lauf gescheitert:', e && e.message);
  }

  /* Heartbeat: stuendlich immer (A10), sonst nur wenn es etwas zu melden gab. */
  if (stundenlauf || gesendet > 0 || fehler) {
    ops++;
    await schreibeStand(env, gesendet, fehler);
  }
}

// Butley — Cloudflare Worker
//
// Der Worker macht zwei Dinge:
//   1. /api/... beantwortet er selbst (aktuell nur der Rezept-Import)
//   2. alles andere reicht er an die statischen Dateien aus ./public weiter
//      (index.html, sw.js, Icons …) — das ist die ASSETS-Bindung aus wrangler.jsonc
//
// Ohne diesen Worker gäbe es beim Projekt nur statische Dateien; Cloudflare lässt
// dann weder Umgebungsvariablen noch KV-Bindings zu.

import { handleImportRecipe } from './import-recipe.js';
import { handlePush } from './push-route.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/import-recipe') {
      return handleImportRecipe(request, env);
    }

    // Push weiterreichen (C3). Wer senden darf, entscheidet Firebase, nicht
    // dieser Worker — Einzelheiten in push-route.js.
    if (url.pathname === '/api/push') {
      return handlePush(request, env);
    }

    // ICS-Feed (K-10). Der Pfad traegt ein langes, zufaelliges Token; darin liegt
    // der gesamte Schutz, denn Google und Apple schicken beim Abholen keine
    // Anmeldedaten mit. Der fertige Text steht unter ics/<token> in der
    // Datenbank und ist dort per Regel oeffentlich lesbar — der Worker braucht
    // deshalb kein Firebase-Geheimnis.
    if (url.pathname.startsWith('/ics/')) {
      const token = url.pathname.slice(5).replace(/\.ics$/, '');
      if (!/^[a-z0-9]{16,64}$/.test(token)) {
        return new Response('Nicht gefunden.', { status: 404 });
      }
      const quelle = 'https://famplan-e8e4c-default-rtdb.europe-west1.firebasedatabase.app/ics/'
        + encodeURIComponent(token) + '/text.json';
      let text = null;
      try {
        const antwort = await fetch(quelle, { cf: { cacheTtl: 60, cacheEverything: true } });
        if (antwort.ok) text = await antwort.json();
      } catch (e) { /* faellt unten auf 404 */ }
      if (typeof text !== 'string' || !text) {
        return new Response('Nicht gefunden.', { status: 404 });
      }
      return new Response(text, {
        headers: {
          'content-type': 'text/calendar; charset=utf-8',
          'content-disposition': 'inline; filename="butley.ics"',
          // Kurz zwischenspeichern: Apple fragt teils im Minutentakt.
          'cache-control': 'public, max-age=300'
        }
      });
    }

    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ ok: false, error: 'Unbekannter Endpunkt.' }), {
        status: 404,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }

    // Alles Übrige: die App selbst
    return env.ASSETS.fetch(request);
  }
};

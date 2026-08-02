// FamBoard — Cloudflare Worker
//
// Der Worker macht zwei Dinge:
//   1. /api/... beantwortet er selbst (aktuell nur der Rezept-Import)
//   2. alles andere reicht er an die statischen Dateien aus ./public weiter
//      (index.html, sw.js, Icons …) — das ist die ASSETS-Bindung aus wrangler.jsonc
//
// Ohne diesen Worker gäbe es beim Projekt nur statische Dateien; Cloudflare lässt
// dann weder Umgebungsvariablen noch KV-Bindings zu.

import { handleImportRecipe } from './import-recipe.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/import-recipe') {
      return handleImportRecipe(request, env);
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

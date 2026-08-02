// Rezept-Import — Endpunkt POST /api/import-recipe
// Extrahiert ein Rezept aus einer URL, rohem Text oder einem Foto und liefert es
// strukturiert im FamBoard-Format zurück. Ruft dafür die Anthropic API (Claude) auf.
//
// Voraussetzungen (siehe ANLEITUNG.md):
//   - Secret ANTHROPIC_API_KEY               (Worker → Settings → Variables and Secrets)
//   - optional KV-Binding IMPORT_LIMITS      (in wrangler.jsonc eintragen)
//   - optional IMPORT_LIMIT_FREE / IMPORT_LIMIT_PREMIUM (Zahlen, Standard 10 / 100)
//
// Nur angemeldete FamBoard-Nutzer dürfen importieren: Der Client schickt sein
// Firebase-ID-Token im Authorization-Header, die Function prüft es bei Google nach.

const MODEL = 'claude-sonnet-5';
const ANTHROPIC_VERSION = '2023-06-01';
const FIREBASE_API_KEY_FALLBACK = 'AIzaSyAd8gUlEEbA4HU4RXUuEqLwoDDUEKFwTZ4'; // öffentlich, kein Geheimnis
const LIMIT_FREE_DEFAULT = 10;
const LIMIT_PREMIUM_DEFAULT = 100;

const TOOL = {
  name: 'rezept_uebernehmen',
  description: 'Liefert ein strukturiertes Kochrezept passend zum FamBoard-Format.',
  input_schema: {
    type: 'object',
    properties: {
      gefunden: { type: 'boolean', description: 'false, wenn im Material kein Rezept mit Zutaten erkennbar war.' },
      name: { type: 'string', description: 'Name des Gerichts.' },
      servings: { type: 'integer', description: 'Anzahl Personen/Portionen, für die die Mengenangaben gelten. Unklar -> 4.' },
      ingredients_text: {
        type: 'string',
        description: 'Alle Zutaten in einer Zeile, getrennt durch Semikolon. Format je Zutat: "Menge Einheit Name", ' +
          'z. B. "400 g Hähnchenbrust; 200 g Reis; 2 EL Sojasauce; 1 Zwiebel". Übliche Einheiten: g, kg, ml, l, Stk, ' +
          'EL, TL, Bund, Dose, Zehe, Prise. Keine Menge/Einheit erkennbar -> nur den Namen der Zutat eintragen.'
      },
      description: { type: 'string', description: 'Zubereitung als Fließtext bzw. nummerierte Schritte.' },
      tags: { type: 'string', description: 'Passende Schlagworte, kommagetrennt, z. B. "Vegetarisch, Low Carb". Leer lassen, wenn nichts eindeutig passt.' },
      kcal: { type: 'number', description: 'Kalorien fürs gesamte Rezept (alle Portionen zusammen), nur falls explizit angegeben — sonst 0.' },
      protein_g: { type: 'number', description: 'Eiweiß in Gramm fürs gesamte Rezept, nur falls angegeben — sonst 0.' },
      carbs_g: { type: 'number', description: 'Kohlenhydrate in Gramm fürs gesamte Rezept, nur falls angegeben — sonst 0.' },
      fat_g: { type: 'number', description: 'Fett in Gramm fürs gesamte Rezept, nur falls angegeben — sonst 0.' }
    },
    required: ['gefunden', 'name', 'ingredients_text', 'servings']
  }
};

const SYSTEM_PROMPT =
  'Du extrahierst Kochrezepte für die App FamBoard aus Webseiten-Inhalten, rohem Text oder Fotos und lieferst sie ' +
  'ausschließlich über das Tool "rezept_uebernehmen" strukturiert zurück. Erfinde keine Zutaten, Mengen oder ' +
  'Nährwerte, die nicht im Material stehen. Nährwerte nur eintragen, wenn sie explizit angegeben sind — die App ' +
  'kann sie sonst selbst aus den Zutaten schätzen. Wenn im Material erkennbar kein Rezept mit Zutatenliste steckt, ' +
  'setze gefunden auf false und die übrigen Felder auf plausible Leerwerte.';

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

/* ---------- Anmeldung prüfen ---------- */

// Prüft das Firebase-ID-Token bei Google nach. Gültig -> { uid, email }, sonst null.
async function pruefeAnmeldung(request, env) {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const key = env.FIREBASE_API_KEY || FIREBASE_API_KEY_FALLBACK;
  try {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + key, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = (data.users || [])[0];
    if (!user || !user.localId) return null;
    return { uid: user.localId, email: (user.email || '').toLowerCase() };
  } catch (e) {
    return null;
  }
}

/* ---------- Tageslimit & Premium-Staffelung ---------- */

// Datum in deutscher Zeit, damit das Limit um Mitternacht hier zurückgeht (nicht in UTC).
function heuteBerlin() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }); // YYYY-MM-DD
}

function limitFuer(tier, env) {
  if (tier === 'unbegrenzt') return Infinity;
  if (tier === 'premium') return parseInt(env.IMPORT_LIMIT_PREMIUM, 10) || LIMIT_PREMIUM_DEFAULT;
  return parseInt(env.IMPORT_LIMIT_FREE, 10) || LIMIT_FREE_DEFAULT;
}

// Stufe kommt aus dem KV-Store: Schlüssel "tier:<e-mail>" oder "tier:<uid>",
// Wert "premium", "unbegrenzt" oder "gesperrt". Fehlt der Eintrag, gilt "free".
async function ermittleStufe(kv, user) {
  if (!kv) return 'free';
  const kandidaten = [];
  if (user.email) kandidaten.push('tier:' + user.email);
  kandidaten.push('tier:' + user.uid);
  for (const k of kandidaten) {
    const val = await kv.get(k);
    if (val) return val.trim().toLowerCase();
  }
  return 'free';
}

async function pruefeUndZaehle(kv, user, env) {
  const stufe = await ermittleStufe(kv, user);
  if (stufe === 'gesperrt') {
    return { erlaubt: false, fehler: 'Dieses Konto darf den Rezept-Import nicht nutzen.' };
  }
  if (!kv) return { erlaubt: true, zaehle: null }; // kein KV eingerichtet -> nur Anmeldung zählt

  const limit = limitFuer(stufe, env);
  const schluessel = 'used:' + user.uid + ':' + heuteBerlin();
  const bisher = parseInt(await kv.get(schluessel), 10) || 0;
  if (bisher >= limit) {
    return {
      erlaubt: false,
      fehler: 'Tageslimit erreicht (' + limit + ' Importe' +
        (stufe === 'free' ? '). Für mehr bitte beim Haushalts-Owner melden.' : ').')
    };
  }
  return {
    erlaubt: true,
    stufe: stufe,
    uebrig: limit === Infinity ? null : (limit - bisher - 1),
    // erst hochzählen, wenn wirklich ein kostenpflichtiger API-Aufruf ansteht
    zaehle: () => kv.put(schluessel, String(bisher + 1), { expirationTtl: 60 * 60 * 48 })
  };
}

/* ---------- Material besorgen ---------- */

function extractJsonLdRecipe(html) {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const b of blocks) {
    try {
      const data = JSON.parse(b[1].trim());
      const items = Array.isArray(data) ? data : (data['@graph'] || [data]);
      for (const item of items) {
        const type = item && item['@type'];
        const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.indexOf('Recipe') >= 0);
        if (isRecipe) return item;
      }
    } catch (e) { /* kaputtes JSON-LD überspringen */ }
  }
  return null;
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function istGesperrteAdresse(hostname) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local')) return true;
  if (/^127\./.test(h) || h === '0.0.0.0' || h === '::1') return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  return false;
}

const BROWSER_UA = 'Mozilla/5.0 (compatible; FamBoardBot/1.0; +https://famboard.flavor7878.workers.dev)';

// Bild-URL aus strukturierten Rezeptdaten ziehen — die Schreibweise variiert je Seite.
function bildAusJsonLd(ld) {
  const img = ld && ld.image;
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) {
    const first = img[0];
    if (typeof first === 'string') return first;
    return (first && first.url) || null;
  }
  return img.url || null;
}

function metaAusHtml(html, namen) {
  for (const n of namen) {
    const re = new RegExp('<meta[^>]+(?:property|name)=["\']' + n + '["\'][^>]*content=["\']([^"\']+)["\']', 'i');
    const m = re.exec(html);
    if (m) return m[1];
    const re2 = new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']' + n + '["\']', 'i');
    const m2 = re2.exec(html);
    if (m2) return m2[1];
  }
  return null;
}

// Lädt ein Bild und gibt es als Data-URL zurück. Der Client verkleinert es danach
// selbst — hier geht es nur darum, die CORS-Sperre des Browsers zu umgehen.
async function ladeBildAlsDataUrl(url) {
  if (!url) return null;
  try {
    const abs = new URL(url);
    if (istGesperrteAdresse(abs.hostname)) return null;
    const res = await fetch(abs.toString(), {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const typ = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (!/^image\//.test(typ)) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 4000000) return null;
    const bytes = new Uint8Array(buf);
    let binaer = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binaer += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return 'data:' + typ + ';base64,' + btoa(binaer);
  } catch (e) {
    return null;
  }
}

/* ---------- Videoplattformen ---------- */

function youtubeVideoId(u) {
  const h = u.hostname.replace(/^www\.|^m\./, '');
  if (h === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  if (!/(^|\.)youtube\.com$/.test(h) && h !== 'youtube-nocookie.com') return null;
  const v = u.searchParams.get('v');
  if (v) return v;
  const m = /^\/(shorts|embed|live|v)\/([^/?#]+)/.exec(u.pathname);
  return m ? m[2] : null;
}

function istTikTok(u) {
  const h = u.hostname.replace(/^www\./, '');
  return h === 'tiktok.com' || h.endsWith('.tiktok.com');
}

async function holeOembed(endpoint, ziel) {
  try {
    const res = await fetch(endpoint + '?format=json&url=' + encodeURIComponent(ziel), {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function ladeTikTok(u) {
  // Kurzlinks (vm.tiktok.com/…) zuerst auflösen, oEmbed mag sie nicht immer.
  let ziel = u.toString();
  if (/^(vm|vt)\./.test(u.hostname)) {
    try {
      const r = await fetch(ziel, { redirect: 'follow', headers: { 'User-Agent': BROWSER_UA }, signal: AbortSignal.timeout(8000) });
      if (r.url) ziel = r.url.split('?')[0];
    } catch (e) { /* dann eben mit dem Kurzlink versuchen */ }
  }
  const data = await holeOembed('https://www.tiktok.com/oembed', ziel);
  if (!data || !data.title) {
    throw new Error('Von diesem TikTok-Link ließ sich nichts abrufen. Kopier die Beschreibung und nutze „Text einfügen".');
  }
  const text = 'TikTok-Video von ' + (data.author_name || 'unbekannt') + '.\n' +
    'Beschreibung/Caption des Videos:\n' + data.title;
  return { text: text, imageUrl: data.thumbnail_url || null };
}

async function ladeYouTube(u, videoId, env) {
  // Bester Weg: offizielle Data-API — liefert die vollständige Beschreibung.
  if (env.YOUTUBE_API_KEY) {
    try {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/videos?part=snippet&id=' + encodeURIComponent(videoId) +
        '&key=' + env.YOUTUBE_API_KEY,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const data = await res.json();
        const sn = data.items && data.items[0] && data.items[0].snippet;
        if (sn) {
          const thumbs = sn.thumbnails || {};
          const bild = (thumbs.maxres || thumbs.standard || thumbs.high || thumbs.medium || {}).url || null;
          return {
            text: 'YouTube-Video „' + (sn.title || '') + '" von ' + (sn.channelTitle || 'unbekannt') + '.\n' +
              'Videobeschreibung:\n' + (sn.description || '').slice(0, 8000),
            imageUrl: bild
          };
        }
      }
    } catch (e) { /* auf die Notlösungen unten zurückfallen */ }
  }

  // Ohne Schlüssel: Beschreibung aus der Seite fischen (klappt nicht immer).
  try {
    const res = await fetch('https://www.youtube.com/watch?v=' + encodeURIComponent(videoId), {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'de-DE,de;q=0.9' },
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      const html = await res.text();
      const m = /"shortDescription":"((?:\\.|[^"\\])*)"/.exec(html);
      if (m) {
        const besch = JSON.parse('"' + m[1] + '"');
        if (besch && besch.trim()) {
          return {
            text: 'YouTube-Video „' + (metaAusHtml(html, ['og:title']) || '') + '".\n' +
              'Videobeschreibung:\n' + besch.slice(0, 8000),
            imageUrl: metaAusHtml(html, ['og:image'])
          };
        }
      }
    }
  } catch (e) { /* weiter zur letzten Notlösung */ }

  // Letzte Möglichkeit: oEmbed — nur Titel, meist zu wenig für ein Rezept.
  const data = await holeOembed('https://www.youtube.com/oembed', 'https://www.youtube.com/watch?v=' + videoId);
  if (data && data.title) {
    return {
      text: 'YouTube-Video „' + data.title + '" von ' + (data.author_name || 'unbekannt') + '.\n' +
        '(Die Videobeschreibung war nicht abrufbar — es liegt nur der Titel vor.)',
      imageUrl: data.thumbnail_url || null
    };
  }
  throw new Error('Von diesem YouTube-Link ließ sich nichts abrufen. Kopier die Videobeschreibung und nutze „Text einfügen".');
}

function istInstagram(u) {
  const h = u.hostname.replace(/^www\./, '');
  return h === 'instagram.com' || h.endsWith('.instagram.com');
}

/* ---------- Normale Webseiten ---------- */

async function ladeWebseite(parsed) {
  const res = await fetch(parsed.toString(), {
    headers: { 'User-Agent': BROWSER_UA },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error('Die Seite hat einen Fehler zurückgegeben (Status ' + res.status + ').');
  const html = (await res.text()).slice(0, 900000);
  const ld = extractJsonLdRecipe(html);
  const bild = (ld && bildAusJsonLd(ld)) || metaAusHtml(html, ['og:image', 'twitter:image']);
  if (ld) {
    return {
      text: 'Strukturierte Rezeptdaten (JSON-LD) von der Webseite:\n' + JSON.stringify(ld).slice(0, 8000),
      imageUrl: bild
    };
  }
  const text = htmlToText(html).slice(0, 10000);
  if (!text) throw new Error('Auf der Seite ließ sich kein lesbarer Inhalt finden.');
  return {
    text: 'Text der Webseite (automatisch aus dem HTML extrahiert, kann Navigation/Werbung enthalten):\n' + text,
    imageUrl: bild
  };
}

// Verteiler: erkennt die Plattform und holt das passende Material.
async function ladeSeitenMaterial(url, env) {
  let parsed;
  try { parsed = new URL(url); } catch (e) { throw new Error('Das ist keine gültige Internetadresse.'); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Nur http/https-Adressen werden unterstützt.');
  }
  if (istGesperrteAdresse(parsed.hostname)) {
    throw new Error('Diese Adresse kann nicht geladen werden.');
  }

  if (istInstagram(parsed)) {
    throw new Error('Instagram lässt sich nicht auslesen. Tipp: Caption im Reel antippen, kopieren und hier auf „Text einfügen" wechseln.');
  }
  if (istTikTok(parsed)) return ladeTikTok(parsed);
  const ytId = youtubeVideoId(parsed);
  if (ytId) return ladeYouTube(parsed, ytId, env);

  return ladeWebseite(parsed);
}

function baueNutzerNachricht(mode, body, material) {
  if (mode === 'image') {
    const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(body.imageDataUrl || '');
    if (!m) throw new Error('Kein gültiges Bild erhalten.');
    if (m[2].length > 7000000) throw new Error('Das Foto ist zu groß.');
    return [
      { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
      { type: 'text', text: 'Lies das Rezept von diesem Foto ab (Kochbuch, Zettel o. Ä.) und liefere es strukturiert.' }
    ];
  }
  if (mode === 'text') {
    const t = String(body.text || '').trim();
    if (!t) throw new Error('Kein Text erhalten.');
    return 'Hier ist ein roh eingefügter Rezepttext, strukturiere ihn:\n\n' + t.slice(0, 10000);
  }
  if (mode === 'url') {
    return 'Extrahiere das Rezept aus diesem Material:\n\n' + material;
  }
  throw new Error('Unbekannter Modus.');
}

/* ---------- Einstieg ---------- */

export async function handleImportRecipe(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Nur POST erlaubt.' }, 405);
  }
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse({ ok: false, error: 'ANTHROPIC_API_KEY ist im Worker nicht gesetzt (Settings → Variables and Secrets).' }, 500);
  }

  const user = await pruefeAnmeldung(request, env);
  if (!user) {
    return jsonResponse({ ok: false, error: 'Nicht angemeldet. Bitte die Seite neu laden und erneut versuchen.' }, 401);
  }

  const kontingent = await pruefeUndZaehle(env.IMPORT_LIMITS, user, env);
  if (!kontingent.erlaubt) {
    return jsonResponse({ ok: false, error: kontingent.fehler }, 429);
  }

  let body;
  try { body = await request.json(); } catch (e) { return jsonResponse({ ok: false, error: 'Ungültige Anfrage.' }, 400); }

  const mode = body && body.mode;
  if (['url', 'text', 'image'].indexOf(mode) < 0) {
    return jsonResponse({ ok: false, error: 'Unbekannter Import-Modus.' }, 400);
  }

  let userContent;
  let bildUrl = null;
  try {
    let material = null;
    if (mode === 'url') {
      const quelle = await ladeSeitenMaterial(String(body.url || '').trim(), env);
      material = quelle.text;
      bildUrl = quelle.imageUrl;
    }
    userContent = baueNutzerNachricht(mode, body, material);
  } catch (e) {
    return jsonResponse({ ok: false, error: e.message || 'Material konnte nicht geladen werden.' }, 400);
  }

  // Ab hier entstehen Kosten -> Zähler hochsetzen
  if (kontingent.zaehle) { try { await kontingent.zaehle(); } catch (e) { /* Zähler darf den Import nicht blockieren */ } }

  let apiRes;
  try {
    apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: TOOL.name },
        messages: [{ role: 'user', content: userContent }]
      })
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: 'Die Anthropic-API war nicht erreichbar.' }, 502);
  }

  if (!apiRes.ok) {
    let detail = '';
    try { detail = (await apiRes.json()).error?.message || ''; } catch (e) { /* ignore */ }
    return jsonResponse({ ok: false, error: 'Fehler von der Anthropic-API (Status ' + apiRes.status + '). ' + detail }, 502);
  }

  const data = await apiRes.json();
  const toolUse = (data.content || []).find(b => b.type === 'tool_use' && b.name === TOOL.name);
  if (!toolUse) return jsonResponse({ ok: false, error: 'Keine strukturierte Antwort erhalten.' }, 502);

  const r = toolUse.input || {};
  if (!r.gefunden) {
    return jsonResponse({ ok: false, error: 'Da war kein Rezept mit Zutaten erkennbar.' }, 200);
  }

  // Bild erst jetzt holen — nur wenn wirklich ein Rezept herauskam.
  const bildDataUrl = await ladeBildAlsDataUrl(bildUrl);

  return jsonResponse({
    ok: true,
    uebrig: kontingent.uebrig,
    recipe: {
      image_data_url: bildDataUrl,
      name: r.name || '',
      servings: r.servings || 4,
      ingredients_text: r.ingredients_text || '',
      description: r.description || '',
      tags: r.tags || '',
      kcal: r.kcal || 0,
      protein_g: r.protein_g || 0,
      carbs_g: r.carbs_g || 0,
      fat_g: r.fat_g || 0
    }
  });
}

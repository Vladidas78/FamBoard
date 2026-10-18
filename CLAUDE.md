# CLAUDE.md — Butley (FamBoard)

Butley ist eine PWA für Haushaltsplanung: Cloudflare Worker mit statischen
Assets aus `public/`, Daten in Firebase RTDB, Konten über Firebase Auth.
Dieser Ordner ist die Git-Arbeitskopie; **die Dokumentation liegt im
Obsidian-Vault**, nicht hier.

## Einstieg — zuerst lesen, in dieser Reihenfolge

1. `C:\Users\Vladi\Desktop\Obsidian Vault\Vladis Vault\FamPlan - App\Butley — Chatstart Claude Code.md` — Einstieg samt Pflicht-Schritt 0 (Zugriffs- und Werkzeugprüfung)
2. Ebendort `Butley\Butley — Handover 18.10.2026.md` — maßgeblicher Tagesstand
3. Ebendort `Butley\Butley — Projektdokument.md` — Quelle der Wahrheit; Kapitel 5 (Entscheidungen) schlägt alles, Kapitel 2.5 trägt die Betriebsregeln 1–24

Fehlt der Vault-Zugriff: anhalten und nach `/add-dir` fragen. Nicht raten.

## Harte Regeln (Kurzform — Langform im Chatstart und in Kapitel 2.5)

- **Deutsch. Ehrlich, Widerspruch erwünscht. Nicht ungefragt loslegen** —
  erst Bestandsaufnahme und Entscheidungsvorlage, Vladi entscheidet.
- **Git nur lesend** (`git --no-optional-locks status --short` / `log` /
  `diff --stat --ignore-cr-at-eol` / `show`). **Nie committen, nie pushen,
  nichts stagen** — das macht Vladi in Git Gui. Je Paket: Dateiliste und
  Commit-Nachricht vorschlagen. Jeder Push deployt live.
- Alle Änderungen eines Pakets in **einen** Commit denken.
- **Nie mitcommitten** (Zeilenenden-Rauschen): `.gitignore`, `ANLEITUNG.md`,
  `ANLEITUNG (1).md`, `Butley-Designstand-05.08.2026.md`,
  `Butley_-_Masterdokument.md`, `butley-designstand.html`,
  `butley-tokens.css`, `public/antworten.html`. Auch `node_modules` und `.claude/` (persönliche Pfade, Repo ist öffentlich) nie.
- Ändert sich etwas unter `public/`: **`CACHE` in `public/sw.js` hochzählen**.
- **`database.rules.json` wird nur von Hand in der Firebase-Konsole scharf** —
  jede Regeländerung ausdrücklich ansagen.
- Oberflächentexte nur über `public/js/texte.js` (`txt()`, `data-t`);
  `REST_ERWARTET` in `pruefe-texte.py` nur bewusst mit datiertem Kommentar
  ändern. `txt` ist als Name reserviert, `t` ist ein Termin.
- Keine Secrets lesen, schreiben oder ausgeben (VAPID, ANTHROPIC_API_KEY —
  nur im Cloudflare-Dashboard). Der `apiKey` in `app.js` ist bewusst öffentlich.

## Prüfpflicht vor jedem Commit-Paket

Drei Prüfer und sechs Prüfstand-Läufe grün, Bilder angesehen; zwei
`schiessen`-Läufe byteweise identisch (48 Bilder):

```
py pruefe-verweise.py && py pruefe-stil.py && py pruefe-texte.py
node pruefstand/klicktest.mjs
node pruefstand/onboardingtest.mjs
node pruefstand/serientest.mjs
node pruefstand/rollentest.mjs
node pruefstand/beitrittstest.mjs
node pruefstand/schiessen.mjs <ordner>
```

Playwright fehlt? `npm install playwright` + `npx playwright install chromium`
(bleibt untracked). `rollentest`/`beitrittstest` patchen den Stub auf Platte —
nicht parallel laufen lassen.

## Nach der Arbeit

Doku im Vault nachziehen (Projektdokument-Protokoll, Kapitel 11, Handover,
`00 START HIER`); neue T-/O-/Nummern erst nach Blick auf die nächste freie
Nummer in Kapitel 5/11 vergeben.

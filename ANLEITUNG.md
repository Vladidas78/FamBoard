# FamBoard — Einrichtung

Seit diesem Update braucht FamBoard ein echtes Konto (E-Mail/Passwort oder Google) statt
einer geheimen Haushalts-ID im Link. Eure bestehenden Daten gehen dabei nicht verloren —
siehe Schritt 5.

---

## Schritt 1 — Sicherheitsregeln in Firebase eintragen

1. Firebase-Konsole → **Realtime Database** → Reiter **Regeln**
2. Alles markieren, löschen, den Inhalt von `database.rules.json` einfügen
3. **Veröffentlichen**

Die Regeln lassen nur noch an einen Haushalt heran, wer als Mitglied eingetragen ist
(`haushalte/<id>/members/<eure-uid>`) — nicht mehr jeden, der bloß angemeldet ist und die
ID kennt.

**Wichtig bei jedem Update von `database.rules.json`:** Die Datei im Repo ändert sich
nur im Code — sie muss zusätzlich jedes Mal manuell hier eingefügt und veröffentlicht
werden, das passiert nicht automatisch beim Deployen über Cloudflare Pages.

## Schritt 2 — Anmeldearten in Firebase aktivieren

1. Firebase-Konsole → **Authentication** → Reiter **Sign-in method**
2. **E-Mail/Passwort** aktivieren
3. **Google** aktivieren, Support-E-Mail eintragen (Firebase fragt danach), speichern
4. Unter **Settings → Authorized domains** eure tatsächliche Live-Adresse eintragen —
   bei euch aktuell `famboard.flavor7878.workers.dev` (steht oben im Cloudflare-Pages-
   Projekt; kann `.pages.dev` oder `.workers.dev` heißen, je nach Cloudflare-Projekttyp) —
   und später eine eigene Domain, falls ihr eine anbindet. Sonst schlägt die Google-
   Anmeldung dort fehl (`auth/unauthorized-domain`).

Die alte anonyme Anmeldung wird nicht mehr gebraucht und kann in Firebase deaktiviert
bleiben oder ausgeschaltet werden.

## Schritt 3 — Repo auf GitHub und mit Cloudflare Pages verbinden

FamBoard liegt als Git-Repository auf GitHub (`github.com/Vladidas78/FamBoard`) und wird
von Cloudflare Pages automatisch von dort veröffentlicht — kein manuelles Hochladen mehr.

1. github.com → neues, leeres Repository anlegen (falls noch nicht geschehen)
2. Lokal mit **Git Gui** (kommt mit Git für Windows) oder **GitHub Desktop**: Remote
   hinzufügen, committen, **Push**
3. dash.cloudflare.com → **Compute (Workers)** → **Pages** → **Create** →
   **Connect to Git** → das GitHub-Repo auswählen
4. Build-Einstellungen: Framework preset **None**, Build command **leer**, Output
   directory **/**
5. **Save and Deploy**

Du bekommst eine Adresse wie `https://famboard.pages.dev` oder, je nach Cloudflare-
Projekttyp, `https://famboard.<dein-konto>.workers.dev` — bei euch aktuell
`https://famboard.flavor7878.workers.dev`.

## Schritt 4 — Auf dem Handy installieren

- **iPhone:** Adresse in **Safari** öffnen (Chrome kann das nicht) → Teilen-Symbol →
  *Zum Home-Bildschirm*
- **Android:** Adresse in Chrome öffnen → Menü ⋮ → *App installieren*

Danach startet die App ohne Browserleiste und öffnet sich auch ohne Netz — im Supermarkt
mit schlechtem Empfang siehst du deine Liste. Häkchen, die du offline setzt, gehen raus,
sobald wieder Verbindung da ist.

## Schritt 5 — Erstes Login: bestehende Daten übernehmen

Beim ersten Öffnen erscheint jetzt ein Anmeldebildschirm. So kommt ihr an eure alten
Daten (den bisherigen Haushalt `hh-…`):

- **Auf dem Gerät, mit dem du FamBoard schon genutzt hast:** Einfach ein Konto erstellen
  (E-Mail/Passwort oder Google). Das Gerät kennt eure alte Haushalts-ID noch aus dem
  Browser-Speicher und übernimmt sie automatisch — ihr landet direkt in eurem
  bestehenden Wochenplan.
- **Auf jedem anderen Gerät oder falls die automatische Übernahme nicht klappt:** Beim
  Registrieren erscheint ein Feld *„Schon FamBoard genutzt? Haushalts-ID hier
  übernehmen“*. Dort eure alte ID eintragen (z. B. `hh-qsq6wowzlugqdn6r`, steht in
  euren Notizen). Das funktioniert nur **einmal** — wer zuerst kommt, wird Owner des
  Haushalts, danach läuft alles über Einladungslinks (siehe unten).
- **Ganz neuer Haushalt:** Feld leer lassen, optional einen Namen vergeben — FamBoard
  legt einen frischen, leeren Haushalt mit den sechs Beispielrezepten an.

Rezepte, die ihr vorher schon per Excel gesichert habt, holt ihr euch bei Bedarf über
**Rezepte → ⇄ Excel → Datei importieren**, Modus *Alles ersetzen*.

---

## Rezept-Import per Link, Text oder Foto einrichten

Reiter **Rezepte → 🤖 Rezept importieren** liest ein Rezept von einer Webseite, aus
eingefügtem Text oder von einem Foto ein und füllt das Formular „Neues Rezept" damit
vor — geprüft und gespeichert wird von Hand. Dafür ruft ein Cloudflare Worker
(`src/worker.js` → `src/import-recipe.js`) die Anthropic-API auf (Modell Sonnet).

### Was der Link-Import kann

| Quelle | Ergebnis |
|---|---|
| Rezeptseiten | sehr gut — strukturierte Rezeptdaten (JSON-LD) inkl. Bild |
| TikTok | Caption des Videos plus Vorschaubild |
| YouTube / Shorts | Videobeschreibung plus Vorschaubild |
| Instagram | nicht möglich — Meta sperrt den Zugriff |

**Wichtig bei Videos:** Ausgelesen wird nur, was der Creator *geschrieben* hat — Caption
bzw. Videobeschreibung. Was im Video gesprochen oder eingeblendet wird, kommt nicht an.
Steht das Rezept nur im Video selbst, meldet der Import, dass nichts zu finden war.

Für Instagram (und als Notlösung überall sonst): Caption kopieren und in FamBoard auf
**Text einfügen** wechseln.

Nach einem erfolgreichen Import wird der Link automatisch unten in der Beschreibung als
`Quelle: …` eingetragen, und das gefundene Bild landet direkt als Rezeptbild.

### YouTube-Beschreibungen zuverlässig auslesen (optional)

Ohne Schlüssel versucht der Worker, die Beschreibung aus der YouTube-Seite zu fischen —
das klappt mal, mal nicht, weil YouTube Server-Zugriffe oft abweist. Zuverlässig wird es
mit einem kostenlosen API-Schlüssel:

1. console.cloud.google.com → Projekt `famplan-e8e4c` auswählen (dasselbe wie Firebase)
2. **APIs & Services** → **Library** → *YouTube Data API v3* → **Enable**
3. **APIs & Services** → **Credentials** → **Create credentials** → **API key**
4. In Cloudflare unter **Variables and Secrets** als `YOUTUBE_API_KEY` eintragen
   (Type **Secret**), danach neu deployen

Das kostenlose Kontingent liegt weit über dem, was FamBoard je braucht.

### Wie das Projekt aufgebaut ist

FamBoard läuft als **Cloudflare Worker mit statischen Assets** (nicht als Pages-Projekt):

```
wrangler.jsonc     Konfiguration: Name, Assets-Ordner, Bindings
public/            die App selbst — index.html, sw.js, manifest, icons/
src/worker.js      beantwortet /api/… , alles andere geht an public/
src/import-recipe.js   die eigentliche Import-Logik
```

Wichtig: Der Ordner `functions/` (Pages-Konvention) funktioniert hier **nicht**. Solange
ein Worker nur statische Dateien ausliefert, lässt Cloudflare außerdem weder
Umgebungsvariablen noch KV-Bindings zu — die Meldung lautet dann *„Variables cannot be
added to a Worker that only has static assets."* Erst durch `main: src/worker.js` in
`wrangler.jsonc` wird daraus ein richtiger Worker.

### Anthropic-API-Key hinterlegen

1. platform.claude.com → **Settings → API keys** → **Create Key**, am besten in einem
   eigenen Workspace mit eigenem Ausgabenlimit (siehe unten). Key beginnt mit `sk-ant-`
   und wird nur einmal angezeigt.
2. dash.cloudflare.com → **Workers & Pages** → Projekt **famboard** → **Settings** →
   **Variables and Secrets** → **Add**
3. Name `ANTHROPIC_API_KEY`, Wert der Key, Type **Secret**
4. Speichern

Das geht erst, **nachdem** die neue Struktur mit `src/worker.js` einmal deployt wurde —
vorher zeigt Cloudflare dort nur den Hinweis auf statische Assets.

Der Key liegt nur im Worker und ist im ausgelieferten Code (`index.html`) nicht
sichtbar. Jeder Import kostet grob 1–2 Cent.

### Ausgabenlimit setzen (unbedingt machen)

platform.claude.com → **Manage → Limits** → monatliches Ausgabenlimit eintragen. Noch
besser: vorher unter dem Workspace-Umschalter oben links (steht standardmäßig auf
**Default**) einen eigenen Workspace `FamBoard` anlegen, diesem ein eigenes Limit geben
und den API-Key darin erzeugen. Dann ist der Schaden auch dann begrenzt, wenn der Key
abhandenkommt.

Guthaben ist Prepaid — ohne aufgeladenes Guthaben schlägt jeder Import fehl,
unabhängig vom Limit.

### Wer darf wie oft importieren?

Der Import ist **nur für angemeldete FamBoard-Nutzer** nutzbar: Die App schickt das
Firebase-Token mit, der Worker prüft es bei Google nach. Fremde, die die Adresse
`/api/import-recipe` kennen, kommen damit nicht durch.

Zusätzlich gibt es ein Tageslimit pro Konto, gestaffelt nach Stufe. Dafür braucht es
einen KV-Speicher:

1. dash.cloudflare.com → **Storage & Databases** → **KV** → **Create** →
   Name `famboard-limits`
2. Die **Namespace-ID** kopieren (steht in der Übersicht neben dem Namen)
3. In `wrangler.jsonc` den auskommentierten Block am Ende aktivieren: hinter der
   schließenden Klammer von `"assets"` ein Komma setzen und einfügen:

   ```jsonc
   "kv_namespaces": [
     { "binding": "IMPORT_LIMITS", "id": "hier-die-kopierte-id" }
   ]
   ```

4. Committen und pushen — Cloudflare deployt neu und das Binding ist aktiv

Das Binding gehört bewusst in `wrangler.jsonc` und nicht in die Weboberfläche: Bei
einem Workers-Projekt überschreibt die Konfigurationsdatei bei jedem Deploy, was im
Dashboard eingetragen wurde. Secrets (der API-Key) sind davon ausgenommen und bleiben
erhalten.

Standardlimits: **10 Importe pro Tag** für normale Konten, **100** für Premium. Ändern
lässt sich das über die optionalen Variablen `IMPORT_LIMIT_FREE` und
`IMPORT_LIMIT_PREMIUM` (gleiche Stelle wie `ANTHROPIC_API_KEY`, aber Type **Text**).

**Jemanden auf Premium setzen:** KV-Namespace in der Cloudflare-Oberfläche öffnen
(**Storage & Databases → KV → famboard-limits → KV Pairs**) und einen Eintrag anlegen:

| Key | Value | Wirkung |
|---|---|---|
| `tier:anna@example.com` | `premium` | 100 Importe pro Tag |
| `tier:anna@example.com` | `unbegrenzt` | kein Tageslimit |
| `tier:anna@example.com` | `gesperrt` | darf gar nicht importieren |

Statt der E-Mail geht auch `tier:<firebase-uid>`. Wer keinen Eintrag hat, ist
automatisch auf der normalen Stufe. Änderungen wirken sofort, ohne neues Deployment.
Das Tageslimit läuft nach deutscher Zeit und geht um Mitternacht zurück.

Ohne KV-Binding funktioniert der Import trotzdem — dann greift nur die Anmeldepflicht,
aber kein Tageslimit.

**„ANTHROPIC_API_KEY ist im Worker nicht gesetzt"** — das Secret fehlt oder wurde nach
dem Eintragen noch nicht neu deployt.

**„Variables cannot be added to a Worker that only has static assets"** — der Worker
(`src/worker.js` + `wrangler.jsonc`) ist noch nicht deployt. Erst pushen, dann lässt
sich das Secret eintragen.

**Import meldet 404 oder „Verbindung zum Server fehlgeschlagen"** — `src/` oder
`wrangler.jsonc` wurden nicht mitgepusht, oder `main` fehlt in `wrangler.jsonc`.

**„Nicht angemeldet. Bitte die Seite neu laden"** — die Anmeldung war beim Klick noch
nicht fertig oder das Token ist abgelaufen; neu laden reicht.

**„Tageslimit erreicht"** — entweder abwarten bis Mitternacht oder das Konto im
KV-Speicher auf `premium` setzen.

## Weitere Personen einladen

Reiter **Haushalt** → Karte **Mitglieder** → **🔗 Einladungslink erzeugen**. Der Link
enthält einen einmaligen, zufälligen Code (keine Haushalts-ID mehr). Wer ihn öffnet und
sich anmeldet oder registriert, tritt automatisch als Mitglied eurem Haushalt bei und
sieht ab dann Wochenplan und Einkaufsliste — der Link gehört also nur an Leute, die
dazugehören. Jeder Klick auf „Einladungslink erzeugen“ macht einen neuen Code; alte
Codes bleiben nutzbar.

Gehört jemand zu mehreren Haushalten (z. B. bei befreundeten Familien), erscheint im
Reiter **Haushalt** oben eine Auswahl **Aktiver Haushalt** zum Umschalten.

## Konto und Haushaltsname verwalten

Reiter **Einstellungen** bündelt alles rund ums Konto: Haushaltsname (nur der
Owner kann ihn ändern), euer eigener Anzeigename für die Mitgliederliste,
E-Mail-Adresse und Passwort ändern, sowie — falls ihr euch bisher nur über Google
angemeldet habt — nachträglich ein Passwort hinzufügen, um euch danach auch mit
E-Mail/Passwort anmelden zu können. Mitglieder, Einladungslink und "Weiterem
Haushalt beitreten" liegen ebenfalls hier.

## Nachträglich einem Haushalt beitreten

Ist beim ersten Login (z. B. über Google, ohne das Alt-ID-Feld beim Registrieren
auszufüllen) aus Versehen ein neuer, leerer Haushalt entstanden, ist das kein Problem:
Reiter **Haushalt** → Karte **Weiterem Haushalt beitreten** → dort die eigentliche
Haushalts-ID (`hh-…`) oder einen Einladungscode eintragen → **Beitreten**. Das Konto
gehört danach zu beiden Haushalten, umschalten geht über **Aktiver Haushalt** oben in
demselben Reiter. Der leere Haushalt lässt sich aktuell nicht löschen, stört aber auch
nicht weiter, wenn er einfach ignoriert wird.

## Neue Version einspielen

Datei ändern → in Git Gui (oder GitHub Desktop) taucht sie als Änderung auf →
Commit-Nachricht eintippen → **Commit** → **Push**. Cloudflare Pages erkennt den neuen
Stand auf GitHub automatisch und deployed ihn von selbst. Alte Stände bleiben in der
Cloudflare-Deployment-Historie erhalten, du kannst dort jederzeit zurückrollen. Auf dem
Handy die App einmal schließen und neu öffnen; der Service Worker holt die neue Fassung
beim übernächsten Start spätestens (die `CACHE`-Version in `sw.js` bei größeren
Änderungen mit hochzählen, sonst merkt es der Service Worker manchmal erst spät).

---

## Wenn etwas nicht läuft

**„Für diese E-Mail gibt es schon ein Konto“**
Oben im Anmeldebildschirm auf **Anmelden** statt Registrieren wechseln.

**„E-Mail oder Passwort stimmt nicht“**
Tippfehler prüfen, sonst über **Passwort vergessen?** ein neues setzen.

**„Diese Anmeldeart ist in Firebase noch nicht aktiviert“**
Firebase → Authentication → Sign-in method → **E-Mail/Passwort** bzw. **Google**
aktivieren (Schritt 2).

**Google-Anmeldung klappt lokal, aber nicht auf der Live-Adresse**
Firebase → Authentication → Settings → **Authorized domains** → eure tatsächliche
Live-Adresse ergänzen (bei euch `famboard.flavor7878.workers.dev`).

**„Kein Zugriff auf die Datenbank … stimmen die Regeln?“**
Die Regeln aus Schritt 1 sind nicht veröffentlicht, oder euer Konto ist (noch) kein
Mitglied dieses Haushalts.

**„Die Haushalts-ID gehört schon zu einem Konto“**
Jemand hat diesen Haushalt schon übernommen — fragt die Person nach einem
Einladungslink, statt die ID erneut einzutragen.

**Die Seite bleibt leer**
Browserkonsole öffnen (auf dem Rechner F12). Meist ist es eine blockierte Verbindung zu
`gstatic.com` — dort liegt das Firebase-SDK.

---

## Wie die Daten liegen

```
users/<uid>/
  haushalte/<haushalts-id>          true — Mitgliedschaften dieses Kontos

einladungen/<code>/
  haushalt                          welcher Haushalt
  erstelltVon, erstellt

haushalte/<haushalts-id>/
  meta/            { name, owner, erstellt }
  members/<uid>/   { rolle: owner|mitglied, beigetreten, viaCode? }
  data/
    settings/personen
    recipes/            alle Rezepte, ohne Bilder
    excluded/           „immer zuhause“
    extras/             eigene Einträge
    catOverrides/       von euch korrigierte Abteilungen
    weeks/<KW>/
      plan/<Wochentag>  { id, servings }
      checked/          abgehakt
      removed/          von Hand entfernt
      qty/              überschriebene Mengen
  images/<rezept-id>    Bilder, getrennt und nur bei Bedarf geladen
```

Ein Häkchen in der Einkaufsliste schreibt genau einen dieser Einträge, nicht den ganzen
Datenbestand. Bilder werden erst geholt, wenn du ein Rezept aufklappst.

## Zur Sicherheit

Der `apiKey` in der `index.html` ist kein Geheimnis — er identifiziert nur das Projekt
und steht bei jeder Firebase-Web-App im Quelltext. Der eigentliche Schutz kommt jetzt
aus echten Konten plus der Mitgliederliste je Haushalt (Schritt 1): Nur wer als
Mitglied eingetragen ist, kommt an die Daten heran — nicht mehr jeder, der eine lange
ID errät oder einen alten Link findet.

Einladungslinks sind trotzdem sensibel: Wer den Code kennt, kann sich damit selbst als
Mitglied eintragen, solange er noch nicht eingelöst wurde. Nur an Leute weitergeben, die
wirklich dazugehören sollen. Mitglieder rauswerfen oder Rollen ändern gibt es in der
Oberfläche noch nicht — bei Bedarf direkt in der Firebase-Konsole unter
`haushalte/<id>/members` bearbeiten.

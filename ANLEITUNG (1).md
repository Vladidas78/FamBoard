# FamBoard — Einrichtung

Vier Schritte. Danach hast du eine App auf dem Homescreen, die sich zwischen euren
Geräten abgleicht und sich bei jeder Änderung automatisch neu veröffentlicht.

---

## Schritt 1 — Sicherheitsregeln in Firebase eintragen

Beim Anlegen der Datenbank hast du den Testmodus gewählt. Der lässt **jeden** lesen und
schreiben und läuft nach 30 Tagen ab. Ersetz ihn jetzt:

1. Firebase-Konsole → **Realtime Database** → Reiter **Regeln**
2. Alles markieren, löschen, den Inhalt von `database.rules.json` einfügen
3. **Veröffentlichen**

Danach kommt nur noch an die Daten heran, wer angemeldet ist **und** die Haushalts-ID kennt.

## Schritt 2 — Repo auf GitHub und mit Cloudflare Pages verbinden

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

Du bekommst eine Adresse wie `https://famboard.pages.dev`. Ruf sie auf: Wenn unten im
Reiter „Immer zuhause“ *Verbunden · Haushalt hh-…* steht, läuft alles.

## Schritt 3 — Auf dem Handy installieren

- **iPhone:** Adresse in **Safari** öffnen (Chrome kann das nicht) → Teilen-Symbol →
  *Zum Home-Bildschirm*
- **Android:** Adresse in Chrome öffnen → Menü ⋮ → *App installieren*

Danach startet die App ohne Browserleiste und öffnet sich auch ohne Netz — im Supermarkt
mit schlechtem Empfang siehst du deine Liste. Häkchen, die du offline setzt, gehen raus,
sobald wieder Verbindung da ist.

## Schritt 4 — Rezepte einspielen

Die Datenbank startet mit den sechs Beispielrezepten. Deine echten holst du dir zurück über
**Rezepte → ⇄ Excel → Datei importieren**, Modus *Alles ersetzen*.

---

## Zweites Gerät verbinden

Reiter **Immer zuhause** → *Weiteres Gerät verbinden* → **Link kopieren**. Diesen Link auf
dem anderen Handy öffnen, dort ebenfalls zum Homescreen hinzufügen. Der Link enthält eure
Haushalts-ID und ist damit der Schlüssel zu euren Daten — er gehört nicht in öffentliche
Gruppen.

## Neue Version einspielen

Datei ändern → in Git Gui (oder GitHub Desktop) taucht sie als Änderung auf →
Commit-Nachricht eintippen → **Commit** → **Push**. Cloudflare Pages erkennt den neuen
Stand auf GitHub automatisch und deployed ihn von selbst — kein manuelles Hochladen mehr.
Alte Stände bleiben in der Cloudflare-Deployment-Historie erhalten, du kannst dort
jederzeit zurückrollen. Auf dem Handy die App einmal schließen und neu öffnen; der Service
Worker holt die neue Fassung beim übernächsten Start spätestens.

---

## Wenn etwas nicht läuft

**„Anmeldung fehlgeschlagen (auth/operation-not-allowed)“**
Firebase → Authentication → Sign-in method → **Anonym** aktivieren.

**„Kein Zugriff auf die Datenbank … stimmen die Regeln?“**
Die Regeln aus Schritt 1 sind nicht veröffentlicht, oder die Haushalts-ID ist kürzer als
12 Zeichen.

**Die Seite bleibt leer**
Browserkonsole öffnen (auf dem Rechner F12). Meist ist es eine blockierte Verbindung zu
`gstatic.com` — dort liegt das Firebase-SDK.

**Anmeldung klappt lokal, aber nicht auf der pages.dev-Adresse**
Firebase → Authentication → Settings → **Authorized domains** → deine `.pages.dev`-Adresse
ergänzen.

---

## Wie die Daten liegen

```
haushalte/<haushalts-id>/
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

Der `apiKey` in der `index.html` ist kein Geheimnis — er identifiziert nur das Projekt und
steht bei jeder Firebase-Web-App im Quelltext. Der Schutz kommt aus zwei Dingen: den Regeln
aus Schritt 1 und der Haushalts-ID, die als langer Zufallscode wirkt. Wenn du die ID
wechseln willst, änderst du in der `index.html` den Wert von `DEFAULT_HAUSHALT` und lädst
neu hoch; die Daten unter der alten ID kannst du in der Firebase-Konsole löschen.

Wenn später echte Logins für befreundete Familien dazukommen, ersetzt eine Benutzerkennung
diese ID — die Datenstruktur bleibt, wie sie ist.

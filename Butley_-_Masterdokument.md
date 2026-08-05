# Butley — Projektdokument

Masterdokument. Stand 05.08.2026.
Ersetzt: Handover Projektkonzept, Informationsarchitektur, Marke & Design,
FamBoard-Roadmap, FamBoard-Backlog. Der technische Snapshot vom 02.08.2026 bleibt als
Anhang gültig und ist in Kapitel 2 eingearbeitet.

**Regel für dieses Dokument:** Es wird gepflegt, nicht neu geschrieben. Jede Entscheidung
bekommt eine Nummer, ein Datum und eine Begründung und landet in Kapitel 5. Was dort
steht, wird nicht neu diskutiert — es wird bei Bedarf mit einer neuen Nummer widerrufen.

---

## Inhalt

1. Vision & Zielbild
2. IST-Zustand
3. SOLL-Zustand
4. Lücke IST → SOLL
5. Entscheidungsregister
6. Marke & Design
7. Daten- & Rollenmodell
8. Rechtliches & Kostenmodell Stufe 2
9. Roadmap & Release-Schnitt
10. Tools & Ressourcen
11. Offene Punkte

---

# 1. Vision & Zielbild

## 1.1 Was die App ist

Ein Ort, an dem ein Haushalt sich organisiert: Essen, Einkauf, Termine, Aufgaben. Kein
Werkzeugkasten für Einzelne, sondern etwas, das von mehreren Leuten im selben Haushalt
gleichzeitig benutzt wird.

Der Ausgangspunkt war ein einzelner Claude-Artifact namens „Wochenküche" — Wochenplanung
fürs Essen. Daraus wurde FamBoard, daraus wird Butley.

## 1.2 Zwei Stufen

**Stufe 1 — privat.** Eigener Haushalt plus Freundeskreis, Verteilung per Link. Keine
Einnahmen, keine Werbung, keine Sichtbarkeit. Erfolgskriterium: Die App wird im eigenen
Haushalt täglich benutzt, und die laufenden Kosten bleiben im niedrigen ein- bis
zweistelligen Bereich pro Monat.

**Stufe 2 — öffentlich.** Basisfunktionen dauerhaft kostenlos, kostenpflichtig sind
ausschließlich die KI-Funktionen (Rezept-Import). Kein Produkt-am-Markt-Ansatz mit
Marketing und Wachstumsdruck — die Bezahlschranke deckt Kosten, sie erwirtschaftet nichts.

Haushaltsgröße: bis 5 Personen kostenlos, bis 10 im Premium-Umfang.

## 1.3 Zielgruppe

Familien, Paare, WGs, Einzelnutzer. Ausdrücklich **nicht** auf „Familie" verengt — das war
der Auslöser für die Umbenennung (Kapitel 6).

## 1.4 Das eigentliche Risiko

Familien-Organizer scheitern fast nie an fehlenden Funktionen, sondern am **Zweitnutzer**:
Eine Person richtet ein und pflegt, der Rest zieht nicht mit. Nach spätestens acht Wochen
ist die App ein Werkzeug einer einzelnen Person, das den Aufwand nicht mehr rechtfertigt.

Diese Warnung ist nicht ausgeräumt. Frage 21 des Fragebogens zielt genau darauf. Fällt sie
negativ aus, ist der Heute-Bildschirm nicht mehr Teil des Redesigns, sondern dessen
Voraussetzung — und die Roadmap muss vor Beginn neu bewertet werden.

**Alles in diesem Dokument steht unter diesem Vorbehalt.**

---

# 2. IST-Zustand

Reine Bestandsaufnahme, keine Wertung. Stand 02.08.2026, unverändert gültig.

## 2.1 Betrieb

| | |
|---|---|
| Live | `famboard.flavor7878.workers.dev` |
| Repo | `github.com/Vladidas78/FamBoard`, Branch `main` |
| Lokal | `C:\Users\Vladi\OneDrive\Dokumente\FamBoard-Repo\famboard` |
| Deploy | automatisch bei Push, `npx wrangler deploy` |
| Backend | Firebase RTDB `famplan-e8e4c`, Region europe-west1 |
| Service Worker | Cache-Version `famboard-v10` |
| Letzter Commit | `cb3c978` |

## 2.2 Aufbau

Cloudflare **Worker mit statischen Assets**, kein Pages-Projekt mehr. Der Wechsel war
nötig, weil ein `functions/`-Ordner bei einem Workers-Projekt nicht läuft und Cloudflare
weder Umgebungsvariablen noch KV-Bindings zulässt, solange ein Worker nur statische Dateien
ausliefert.

```
wrangler.jsonc          Name, Assets-Ordner, KV-Binding
public/                 die App — index.html (4054 Zeilen), sw.js, manifest, icons/
src/worker.js           Router: /api/… selbst, alles andere an public/
src/import-recipe.js    Rezept-Import (514 Zeilen)
database.rules.json     Firebase-Regeln (manuell in die Konsole einzuspielen)
ANLEITUNG.md            Einrichtung von A bis Z
```

## 2.3 Vorhandene Funktionen

**Sieben Reiter:** Wochenplan, Einkaufsliste, Rezepte, Zutaten, Haushalt & Drogerie,
Haushalt, Nährwerte — plus **Einstellungen**.

- **Wochenplan** — vier Mahlzeiten (Frühstück, Mittagessen, Abendessen, Snack) mit
  Personenzahl je Mahlzeit, Portionsskalierung, Reste-Marker („Reste vom Tag XY"),
  Auswärts-Marker, Reset pro Tag und pro Woche mit Undo, Zufallsauswahl, Suchfenster mit
  Tag-Filtern
- **Rezepte** — anlegen, bearbeiten, Favoriten, Tags, Bilder, Excel-Import/-Export;
  Snacks als eigener Typ ohne Nährwerte und Bild
- **Einkaufsliste** — automatisch aus dem Wochenplan, Sortierung nach Abteilung,
  Ladenzuordnung, „Erledigte leeren", einmalige Einträge
- **Zutaten / Haushalt & Drogerie / Haushalt** — Artikelkataloge, (+) auf die Liste,
  „Immer zuhause"-Markierung, Abteilungs-Sortierung
- **Nährwerte** — feste Tabelle `NUTRITION_DB`, Berechnung offline beim Speichern,
  Tages- und Wochenauswertung
- **Login** — E-Mail/Passwort und Google über Firebase Auth, Mehrfach-Haushalte,
  Einladungslinks, Einstellungen-Reiter
- **KI-Rezeptimport** — Rezeptseiten (JSON-LD), TikTok, YouTube inkl. Shorts, Foto;
  automatisches Rezeptbild; Modell `claude-sonnet-5`, 1–2 Cent pro Import

## 2.4 Bewusst nicht gebaut

- Mitglieder entfernen, Rollen ändern, Haushalt löschen — nur in der Firebase-Konsole
- Import-Stufen verwalten — nur im Cloudflare-KV-Browser
- Instagram-Import — von Meta gesperrt
- Videotranskription — im Worker nicht leistbar

## 2.5 Betriebsregeln, die gelten

1. `database.rules.json` nach **jeder** Änderung manuell in der Firebase-Konsole
   veröffentlichen. Passiert nicht beim Deploy.
2. `CACHE` in `public/sw.js` bei jedem Frontend-Update hochzählen.
3. Kein globales Speichern — jede Änderung schreibt gezielt ihren Zweig (`put(path, value)`).
4. Firebase-Keys vertragen kein `. # $ [ ] /` → `encKey()` / `decKey()`.
5. Excel-Import bleibt rückwärtskompatibel (fehlende Spalten → Defaults).
6. Live-Domain ist `.workers.dev` — relevant für Firebase → Authentication → Authorized domains.

## 2.6 Bekannte Fallen

- Wird ein Konto in der Firebase-Auth-Konsole gelöscht, bleibt der `members`-Eintrag in der
  RTDB stehen und blockiert erneutes Claimen desselben Haushalts. Dann
  `haushalte/<id>/members` von Hand leeren.
- KV-Bindings gehören in `wrangler.jsonc`, **nicht** ins Dashboard — die Konfigurationsdatei
  überschreibt Dashboard-Bindings bei jedem Deploy. Secrets sind ausgenommen.
- Alte reale Haushalts-ID mit den echten Daten: `hh-qsq6wowzlugqdn6r`.

## 2.7 Nutzungskontext

- Aktive Nutzer: der Betreiber und seine Frau. Ein Freund wartet auf Fertigstellung.
- Parallel im Einsatz: FamilyWall (nur Termine), WhatsApp, Papier (2–3×/Jahr).
- Testhaushalte: 3–4 konkrete Haushalte, teils ohne System, teils Notion, teils
  WhatsApp-Gruppe. Fragebogen läuft.

---

# 3. SOLL-Zustand

## 3.1 Personen, Konten und Haushalte

**Person ≠ Konto.** Personen sind Datenobjekte im Haushalt: Name, Farbe, Avatar, optional
Geburtsdatum. Manche Personen haben zusätzlich ein Login. Kinder sind **keine Nutzer** —
damit entfällt DSGVO Art. 8 vollständig.

Geburtsdatum hängt an der Person, nicht an der Registrierung. Registrierung bleibt E-Mail
plus Passwort. Geburtstage werden aus Personendaten abgeleitet und sind keine echten
Kalendertermine.

Ein Nutzer kann in **mehreren Haushalten** sein. Das ist keine Randfunktion: Student in WG
und Elternhaus, oder eigene Familie plus Haushalt der Großmutter. Es braucht einen
dauerhaft sichtbaren Umschalter.

**Rollen:** Besitzer (mehrere möglich) und Mitglied. Der Besitzer darf Haushaltsname
ändern, Personen anlegen und löschen, Mitglieder entfernen, den Haushalt löschen und das
KI-Kontingent verwalten. **Der letzte Besitzer kann den Haushalt nicht verlassen** — er
muss vorher jemanden zum Besitzer machen oder den Haushalt löschen.

**Beim Verlassen** bleiben alle Inhalte ohne Nachfrage erhalten: Rezepte, Listen, Pläne,
gemeinsame Termine. Private Termine der Person werden gelöscht. Die Person bleibt als
„ehemalig" bestehen, sonst verlieren alte Zuordnungen ihre Referenz. Die Kontoverknüpfung
wird gelöst. Es gibt **keine** Frage „soll alles bleiben?" — das wäre ein Löschknopf für
fremde Arbeit.

Benachrichtigungen sind **pro Haushalt** getrennt einstellbar.

## 3.2 Informationsarchitektur

### Das Problem

Die App hat heute acht Reiter. Für Stufe 1 kämen Kalender, Personen und Notizen/To-Dos
dazu — elf. Elf Einträge am unteren Rand eines Handys funktionieren nicht.

Der Auslöser ist die Zahl, das Problem ein anderes: Die heutige Navigation ist keine
Informationsarchitektur, sondern eine Feature-Liste in Reiterform.

- **Drei Reiter beschreiben denselben Gegenstand.** „Zutaten", „Haushalt & Drogerie" und
  „Haushalt" speichern alle einen Artikel mit Namen, Abteilung und Laden. Dass zwei davon
  fast gleich heißen, ist das Symptom, nicht die Ursache.
- **„Nährwerte" ist kein Bereich, sondern eine Auswertung** — ein eigener Reiter für eine
  Sicht auf die Daten eines anderen.
- **Es gibt keinen Einstieg.** Wer die App öffnet, landet im Wochenplan, also in einem
  Planungswerkzeug. Genau das ist der wunde Punkt beim Zweitnutzer: Er will nicht planen,
  er will nachsehen.

### Die Zielstruktur

```
┌─ Kopfzeile (immer sichtbar) ───────────────────────────┐
│  [Haushaltsname ▾]                            [Avatar] │
│   └ Haushalt wechseln                          └ Personen
│   └ Weiterem Haushalt beitreten                └ Mitglieder & Einladung
│                                                └ Einstellungen
│                                                └ Konto / Abmelden
└────────────────────────────────────────────────────────┘

Hauptnavigation:   Heute  ·  Kalender  ·  Essen  ·  Einkauf

Heute      Termine des Tages · was es zu essen gibt · offene Einkaufsposten
           · fällige Aufgaben. Der Butler wohnt hier.
Kalender   Monatsansicht (Standard) · Wochenansicht · Termin anlegen
Essen      Woche  |  Rezepte  |  Nährwerte
Einkauf    Liste  |  Artikel
```

Die Reihenfolge folgt einer Logik: heute → wann → was → womit.

**Wohin die alten Reiter wandern**

| heute | künftig |
|---|---|
| Wochenplan | Essen › Woche |
| Einkaufsliste | Einkauf › Liste |
| Rezepte | Essen › Rezepte |
| Zutaten | Einkauf › Artikel |
| Haushalt & Drogerie | Einkauf › Artikel |
| Haushalt | Einkauf › Artikel (Filter + Abteilungs-Sortierung) |
| Nährwerte | Essen › Nährwerte |
| Einstellungen | Kopfzeile › Avatar |
| — neu — | Heute, Kalender, Personen, Notizen/To-Dos |

### Heute

Der teuerste Teil des Umbaus und der wichtigste. Er ist die einzige Antwort auf das
Zweitnutzer-Problem, die nicht aus Überredung besteht: Der Zweitnutzer öffnet einen
Bildschirm, nicht acht Reiter, und sieht dort etwas, das ihn betrifft.

Inhalt nach Priorität:

1. **Termine des Tages.** Steht heute nichts an, die nächsten Tage.
2. **Was es heute zu essen gibt**, aus dem Wochenplan, nach Mahlzeiten.
3. **Einkaufsliste** — offene Posten direkt abhakbar, nicht nur als Zahl, darunter „alle
   anzeigen". Damit kostet der häufigste Fall null Bereichswechsel. Der Einkauf steht in
   der Navigation ganz rechts, an der schlechtesten Position, wird aber am häufigsten
   gebraucht.
4. **Fällige Aufgaben**, sobald das Modul existiert.

Ist der Bildschirm leer, ist er leer. Das ist eine ehrliche Auskunft und besser als ein
Planungsraster, das dem Zweitnutzer suggeriert, er müsse jetzt etwas tun.

Heute ist der **Startbildschirm** beim Kaltstart.

### Kalender

Monatsansicht als Standard, Wochenansicht umschaltbar. Termine je Person farblich,
Zuordnung zu einzelnen Personen oder zum ganzen Haushalt. Wiederholungen als
**iCalendar-RRULE-Teilmenge**, keine Eigenbaulösung: täglich, wöchentlich, jeder x-te
Wochen- oder Monatstag. Ganztägige und mehrtägige Termine.

**Keine Kopplung** zwischen Terminen und Essens-Wochenplan — komplex, kaum Mehrwert.

Migration von FamilyWall geschieht per Hand, es sind wenige Einträge. Die Latte liegt
niedrig: FamilyWall wird heute ausschließlich für Termine genutzt.

Weil der Heute-Bildschirm die Termine des Tages ohnehin zeigt, ist der Kalender-Reiter für
Übersicht und Eingabe da, nicht für den täglichen Blick.

### Essen

Der heutige Kern, funktional unverändert. Nährwerte wandern hierher, weil sie nichts
anderes sind als eine dritte Sicht auf den Wochenplan.

Neu: **Schnellanlegen für Rezepte.** Name, Zutaten untereinander, speichern. Alles Weitere
— Portionen, Zubereitung, Nährwerte, Bild — optional und eingeklappt.

Begründung: Ein Hähnchenbrustsandwich ist ein Rezept. Es ist ein Abendessen mit vier
Zutaten ohne Zubereitungstext. Was davon abhält, es anzulegen, ist nicht die Sache, sondern
das Formular, das nach Arbeit aussieht. Wer es doch anlegt, gewinnt: Es steht im Wochenplan
zur Auswahl, die Zutaten wandern automatisch auf die Liste, die Portionen skalieren, beim
nächsten Mal ist es ein Klick statt vier Suchvorgängen. Ohne Schnellanlegen schließen sich
genau die einfachen Gerichte vom Hauptmechanismus aus — und das sind die, die man am
häufigsten isst.

### Einkauf

Getrennt in das, was man **jetzt** braucht, und die Stammdaten.

**Liste** — unverändert im Prinzip, mit einer Ergänzung:

> **Suchfeld ganz oben.** Tippen schlägt bekannte Artikel vor, Enter setzt drauf. Steht der
> Begriff in keinem Katalog, wird er als einmaliger Eintrag angelegt — ohne Nachfrage, ohne
> Dialog.

Das ist der Bring!-Ablauf und der Grund, warum die App gegen die WhatsApp-Nachricht an sich
selbst antreten kann. Von allen Maßnahmen dieses Kapitels die mit dem besten Verhältnis von
Aufwand zu Wirkung.

**Artikel** — siehe 3.3.

### Kopfzeile

Haushalt, Personen, Mitglieder, Einstellungen und Konto gehören nicht in die
Hauptnavigation. Sie werden pro Nutzer vielleicht zehnmal im Leben geöffnet.

Der **Haushaltsname als antippbarer Kopf** ist zugleich der geforderte Umschalter, nach dem
Muster der Slack-Workspaces. Er muss permanent sichtbar sein, weil ein Haushaltswechsel
jeden Datensatz austauscht — wer nicht sieht, in welchem Haushalt er ist, trägt Termine und
Einkäufe in den falschen ein.

### Mobil und Desktop

**Mobil** — Hauptnavigation unten (vier Einträge), Kopfzeile oben. Unterbereiche als
segmentierte Umschalter am Kopf des jeweiligen Bereichs.

**Desktop** — kein unteres Navigationsband, sondern Seitenleiste links mit den vier
Bereichen und ihren Unterpunkten flach ausgeklappt. Auf dem Desktop kostet Tiefe unnötige
Klicks, weil Platz da ist.

Zwei Ansichten nur auf dem Desktop:

- Kalender-Monat mit Tagesdetail nebeneinander
- Wochenplan als echtes 7-Spalten-Raster statt Tages-Track

## 3.3 Der Artikelstamm

### Was zusammengelegt wird

| Reiter heute | Inhalt | Felder |
|---|---|---|
| Zutaten | Rezeptzutaten + `customIngredients` | `catOverrides`, `marketOverrides`, `excluded`, (+) |
| Haushalt & Drogerie | `haushalt` | `cat`, `market`, (+) |
| Haushalt | nichts Eigenes | Editor für `excluded` + Abteilungs-Sortierung |

Zwei Reiter speichern dasselbe Objekt mit denselben Feldern, der dritte ist ein Schalter für
ein Feld des ersten. Daraus wird **eine Liste**.

Die Trennung Lebensmittel/Drogerie geschieht bereits eine Ebene tiefer: Ein
Haushalt-&-Drogerie-Artikel bekommt `cat: 'haushalt'`, also eine ganz normale Abteilung.
Sortiert nach Abteilung steht Klopapier unter „Haushalt" und Zwiebeln unter „Obst & Gemüse".
Das ein zweites Mal als Reiter abzubilden ist doppelt.

### Warum reine Zusammenlegung nicht reicht

Rezeptzutaten muss man fast nie von Hand suchen — sie landen automatisch über den
Wochenplan auf der Liste. Der (+)-Button an einer Rezeptzutat ist der Sonderfall.

Getränke, Drogerie, Katzenfutter kommen **ausschließlich** von Hand auf die Liste. Genau die
sind heute die Minderheit in einer Ansicht, die von Rezeptzutaten dominiert wird und mit
jedem importierten Rezept weiter wächst. Die Ansicht ist nach der falschen Gruppe optimiert:
Was oft gebraucht wird, steht hinten.

### Aufbau

```
Einkauf › Artikel
┌──────────────────────────────────────────┐
│ 🔍 Suchen                                │
│ [Meine Artikel]  Rezeptzutaten  Alle     │  ← Herkunft, Standard links
│ Alle · Lebensmittel · Drogerie & Haushalt│  ← grobe Warengruppe
└──────────────────────────────────────────┘
  🥤 Getränke
     Mineralwasser          🏬 Rewe   (+)
     Apfelsaft                        (+)
  🧽 Haushalt & Drogerie
     Klopapier                        (+)
```

- **Standardansicht sind die manuell angelegten Artikel.** Die eigentliche Antwort auf das
  Mengenproblem, und sie kostet fast nichts — die Herkunft ist im Datenmodell längst bekannt.
- **Suchfeld ganz oben.** Ab etwa fünfzig Artikeln schlägt Tippen jede Sortierung.
- **Umschalter Lebensmittel / Drogerie & Haushalt**, abgeleitet aus einem einmaligen
  food/non-food-Kennzeichen je Abteilung. Kein neues Feld pro Artikel, kein Pflegeaufwand.
- **Mehrfachauswahl:** antippen, antippen, „5 Artikel auf die Liste". Für Zusammenstellungen,
  die keine Mahlzeit sind — Grillabend, Putzmittel nachkaufen, Vorbereitung für Besuch.
- **Abteilungs-Sortierung** zieht als Einstellung hierher.

### Verworfen: Favoriten und Häufigkeits-Sortierung

**Favoriten** wären eine dritte Ordnung neben Abteilung und Herkunft und müssten gepflegt
werden. „Ich markiere später die wichtigen" ist in jeder App der Beginn einer Liste, die nach
acht Wochen nicht mehr stimmt. Vor allem: Die gewünschte Menge ist zu etwa neunzig Prozent
identisch mit „meine manuell angelegten Artikel" — die gibt es ohne Zutun.

**Automatische Sortierung nach Häufigkeit** ist inhaltlich richtig gedacht, zerstört aber
Muskelgedächtnis. Man greift dorthin, wo Mineralwasser letzte Woche stand, und findet
Katzenfutter. Bei einer Funktion, die mit halber Aufmerksamkeit im Supermarkt bedient wird,
ist Vorhersagbarkeit mehr wert als Optimalität.

Backlog-Option, falls das Suchen nach dem Umbau weiterhin weh tut: ein fester
**Schnellzugriff** mit sechs bis acht Kacheln, einmal pro Woche neu berechnet, nicht laufend.
Datengrundlage wäre `checked` pro Kalenderwoche, eingegrenzt auf manuelle Artikel. Erst mit
echten Nutzungsdaten bauen, nicht auf Verdacht.

### Der Haken beim Flag „immer zuhause"

`excluded` wirkt technisch nur auf Rezeptzutaten — es filtert sie aus der automatisch
erzeugten Liste. Manuelle Artikel landen nie von allein auf der Liste, dort gibt es nichts zu
filtern.

Entscheidung: Das Flag wird nur bei Rezeptzutaten angezeigt. Ehrlich, wenn auch inkonsistent.
Die Alternative — Umdeutung in „nie automatisch auf die Liste" und Ausgrauen bei manuellen
Artikeln — erzeugt einen Schalter, der aussieht, als täte er etwas.

## 3.4 Dubletten und Schreibweisen

**Was funktioniert.** Beide Quellen laufen über denselben normalisierten Schlüssel.
`normKey("Kürbis")` ergibt für die manuell angelegte Zutat und die Rezeptzutat denselben
Wert; beim Aufbau der Liste werden sie zu einer Zeile zusammengeführt. Das Anlegen-Feld
blockt zusätzlich vorher ab. Beispiel: Kürbis manuell angelegt → Kennzeichen „manuell",
löschbar. Später kommt ein Rezept mit Kürbis → Kennzeichen verschwindet, die Rezepte werden
unter der Zeile aufgeführt, das Löschsymbol geht weg, weil eine Zutat aus einem Rezept nicht
wegwerfbar ist.

**Wo es bricht.** Unterschiedliche Schreibweisen. Die Normalisierung fängt Zwiebel/Zwiebeln
und Tomate/Tomaten ab, nicht aber Kürbis/Kürbisse, Mayo/Mayonnaise oder
Hähnchenbrust/Hähnchenbrustfilet. Der KI-Import ist die größte Quelle solcher Dubletten, weil
er Schreibweisen erfindet, die es im Haushalt noch nicht gibt. Der Schaden wächst mit jedem
Import.

**Maßnahme jetzt:** Dem Import die vorhandenen Zutatennamen mitgeben, mit der Anweisung,
bestehende Schreibweisen zu übernehmen statt neue zu erfinden. Ein Absatz im Prompt,
geschätzt eine halbe Session. Wird vorgezogen, weil der Schaden sonst weiter wächst.

**Maßnahme später:** Ein „ist dasselbe wie …" je Artikelzeile, das einen Alias anlegt.
Rezepte zeigen weiter ihren eigenen Text, die Einkaufsliste bündelt. Wird nötig, sobald
mehrere Personen Rezepte importieren.

## 3.5 Ansichtszustand

Betrifft ausschließlich Ansichtszustände, nie Daten: welche Woche der Wochenplan zeigt,
welcher Filter aktiv ist, wie weit gescrollt wurde.

**Regel:** Der Zustand bleibt innerhalb einer Sitzung für alle Bereiche erhalten. Er wird
zurückgesetzt, wenn die App länger als etwa vier Stunden im Hintergrund war oder ein
Datumswechsel stattgefunden hat. Beim Kaltstart landet man auf „Heute", der Wochenplan in der
laufenden Woche.

Anwendungsfall: KW 34 planen, in den Kalender wechseln um zu sehen, ob man an bestimmten
Tagen weg ist, zurück — und wieder in KW 34 stehen, nicht in der laufenden.

Die bestehende Logik „aus dem Hintergrund zurück → laufende Woche" wird damit nicht gelöscht,
sondern um eine Frist ergänzt.

## 3.6 Module: was gebaut wird und was nicht

**Stufe 1 baut:**

| vorhanden | neu |
|---|---|
| Wochenplan, Rezepte, Einkaufsliste | Personen |
| Zutaten/Haushalt/Vorrat → Artikel | Kalender |
| Nährwerte, Einstellungen | Notizen/To-Dos |
| | Butler-Onboarding, Redesign, i18n-Struktur |

**Notizen/To-Dos:** frei aufbaubare Listen, optional mit Zuständigkeit und Fälligkeit. Jeder
Haushalt entscheidet den Umfang selbst.

**Dauerhaft gestrichen:** Fotobuch und Dokumentenablage — Speicherkosten, Haftungsrisiko, und
Google Fotos beziehungsweise Drive machen es kostenlos und besser.

**Später/offen:** Kontakte (löst kein vorhandenes Problem), Budget (eigenes Produkt),
Instagram-Import (nur falls Meta öffnet), Videotranskription (nicht im Worker, deutlich
teurer).

## 3.7 Push-Benachrichtigungen

Eigenes Modul, nicht Nebenprodukt des Kalenders.

- Auslöser: Termine, To-Dos, Einkaufsliste aktualisiert
- Terminerinnerungen brauchen einen zeitgesteuerten Auftrag im Cloudflare Worker plus
  Push-Dienst
- Pro Person einstellbar — weniger ist mehr, und mindestens ein Haushaltsmitglied will keine
- iOS: Push funktioniert nur bei einer zum Homescreen hinzugefügten PWA. Das muss im
  Onboarding aktiv angesprochen werden, sonst ist die Funktion für iPhone-Nutzer still kaputt

## 3.8 Technik

**Codebase aufteilen mit Build-Setup**, aber gestuft: erst Design-Grundlagen in der
bestehenden Datei, dann aufteilen, dann Reiter umbauen. Kein kompletter Neubau.

Der Grund ist Durchsatz, nicht Ästhetik: `index.html` hat 4054 Zeilen, das Ziel liegt bei
9000–12000. Ab etwa 6000 Zeilen sind keine vollständigen Dateiersetzungen mehr möglich — und
genau die sollen beibehalten werden.

**Bilder müssen von Base64-in-RTDB nach Cloudflare R2.** Bedingung dafür, dass die kostenlose
Basisnutzung tragfähig ist: RTDB rechnet pro heruntergeladenem GB ab, und Rezeptbilder sind
der mit Abstand größte Posten.

**i18n: Struktur ja, Übersetzung nein.** Alle Texte in eine Sprachdatei auslagern,
ausgeliefert wird zunächst nur Deutsch. Tiefe deutsche Abhängigkeiten, die pro Sprache neu
aufgebaut werden müssten: `CAT_KEYWORDS`, `NUTRITION_DB`, die KI-Import-Prompts. Das ist der
eigentliche Grund, warum Übersetzung nicht Stufe 1 ist.

**PWA bleibt Basis.** Store-App ist kein geplanter Schritt, nur „später/offen": laufende
Kosten, Review-Prozesse, und bei Link-Verteilung besteht kein Auffindbarkeitsbedarf.

---

# 4. Lücke IST → SOLL

| Bereich | IST | SOLL | Größe |
|---|---|---|---|
| Navigation | 8 flache Reiter | 4 Bereiche + Kopfzeile | groß |
| Einstieg | Wochenplan | Heute-Bildschirm | groß, existiert nicht |
| Artikelkataloge | 3 Reiter | 1 Bereich mit Filtern | mittel |
| Kalender | nicht vorhanden | Kernmodul | sehr groß |
| Personen | nicht vorhanden | Datenobjekt mit Farbe/Avatar | mittel |
| Notizen/To-Dos | nicht vorhanden | frei aufbaubare Listen | mittel |
| Push | nicht vorhanden | eigenes Modul | groß |
| Gestaltung | gewachsener Prototyp | Merkmalsystem hell/dunkel | groß |
| Marke | FamBoard, Messing auf Anthrazit | Butley, hell, Figur | groß |
| Verwaltung | Firebase-/KV-Konsole | in der Oberfläche | mittel |
| Bilder | Base64 in RTDB | Cloudflare R2 | klein, aber Vorbedingung |
| Codebase | eine Datei, 4054 Zeilen | aufgeteilt mit Build | mittel |
| Sprache | Deutsch hart verdrahtet | Sprachdatei, nur Deutsch ausgeliefert | mittel |

Zwei Dinge stehen unter allem und sind keine Funktionen:

- **Der Zweitnutzer.** Kein Punkt dieser Tabelle hilft, wenn Frage 21 negativ ausfällt.
- **Die Bildmigration nach R2.** Ohne sie ist die kostenlose Basisnutzung in Stufe 2 nicht
  tragfähig. Sie steht in keiner bisherigen Roadmap und in keiner Schätzung.

---

# 5. Entscheidungsregister

Alle bisher getroffenen Entscheidungen an einer Stelle. Was hier steht, wird nicht neu
diskutiert. Die Nummern IA-* und MD-* stammen aus den Einzelkapiteln und bleiben unverändert.
Die Nummern Z-*, P-*, K-* und T-* sind hier erstmals vergeben; die zugehörigen Entscheidungen
sind älter, das Datum ist auf „≤ 03.08.2026" gesetzt, weil das genaue Datum nicht protokolliert
wurde.

## Zielbild und Geschäftsmodell

| # | Entscheidung | Datum | Begründung |
|---|---|---|---|
| Z-1 | Zwei Stufen: privat, dann öffentlich | ≤ 03.08.2026 | Erlaubt echten Betrieb ohne Marktdruck |
| Z-2 | Nur KI-Funktionen kostenpflichtig, Basis dauerhaft kostenlos | ≤ 03.08.2026 | Der Import ist die einzige Funktion mit laufenden Grenzkosten |
| Z-3 | Bis 5 Personen kostenlos, bis 10 Premium | ≤ 03.08.2026 | Deckelt Datenvolumen je Haushalt |
| Z-4 | Zielgruppe umfasst WGs, Paare, Einzelnutzer | ≤ 03.08.2026 | Verengung auf Familie schließt reale Testhaushalte aus |
| Z-5 | Kein Marketing, kein Wachstumsziel | ≤ 03.08.2026 | Erfolgskriterium ist eigene Nutzung bei gedeckten Kosten |
| Z-6 | Fotobuch und Dokumentenablage dauerhaft gestrichen | ≤ 03.08.2026 | Speicherkosten und Haftung; Google macht es kostenlos und besser |

## Personen, Rollen, Haushalte

| # | Entscheidung | Datum | Begründung |
|---|---|---|---|
| P-1 | Person ≠ Konto | ≤ 03.08.2026 | Kinder und Gäste brauchen Sichtbarkeit, aber kein Login |
| P-2 | Kinder sind keine Nutzer | ≤ 03.08.2026 | DSGVO Art. 8 entfällt vollständig |
| P-3 | Geburtsdatum optional an der Person, nicht bei Registrierung | ≤ 03.08.2026 | Datenminimierung; Geburtstage sind abgeleitet, keine Termine |
| P-4 | Ein Nutzer in mehreren Haushalten, sichtbarer Umschalter | ≤ 03.08.2026 | WG plus Elternhaus, eigene Familie plus Großmutter |
| P-5 | Rollen Besitzer und Mitglied, mehrere Besitzer möglich | ≤ 03.08.2026 | Vermeidet Alleinabhängigkeit von einer Person |
| P-6 | Der letzte Besitzer kann nicht verlassen | ≤ 03.08.2026 | Sonst entsteht ein verwaister Haushalt ohne Verwaltung |
| P-7 | Beim Verlassen bleiben Inhalte ohne Nachfrage | ≤ 03.08.2026 | Eine Ja/Nein-Frage wäre ein Löschknopf für fremde Arbeit |
| P-8 | Ausgetretene bleiben als „ehemalig" erhalten | ≤ 03.08.2026 | Sonst verlieren alte Zuordnungen ihre Referenz |
| P-9 | Geschlechtsabfrage im Onboarding gestrichen | ≤ 03.08.2026 | Kein Zweck, Datenminimierung |
| P-10 | Benachrichtigungen pro Haushalt einstellbar | ≤ 03.08.2026 | Wer in zwei Haushalten ist, will nicht zweimal alles |

## Kalender und Module

| # | Entscheidung | Datum | Begründung |
|---|---|---|---|
| K-1 | Kalender ist Kernmodul der Stufe 1 | ≤ 03.08.2026 | Ersetzt FamilyWall, das heute nur dafür genutzt wird |
| K-2 | Monat Standard, Woche umschaltbar | ≤ 03.08.2026 | Übersicht schlägt Detail bei Haushaltsterminen |
| K-3 | Wiederholungen als iCalendar-RRULE-Teilmenge | ≤ 03.08.2026 | Standard statt Eigenbau, exportierbar |
| K-4 | Keine Kopplung Termine ↔ Essensplan | ≤ 03.08.2026 | Komplex, kaum Mehrwert |
| K-5 | Getrennte Zweige für gemeinsame und private Termine von Anfang an | ≤ 03.08.2026 | RTDB vergibt Leserechte nur pro Zweig — ein Feld `privat` wäre wirkungslos |
| K-6 | Push ist eigenes Modul, pro Person einstellbar | ≤ 03.08.2026 | Mindestens ein Haushaltsmitglied will keine |
| K-7 | Notizen/To-Dos frei aufbaubar, mit optionaler Zuständigkeit | ≤ 03.08.2026 | Jeder Haushalt entscheidet den Umfang selbst |

## Technik

| # | Entscheidung | Datum | Begründung |
|---|---|---|---|
| T-1 | Codebase aufteilen mit Build-Setup, gestuft | ≤ 03.08.2026 | Ab ca. 6000 Zeilen sind vollständige Dateiersetzungen nicht mehr möglich |
| T-2 | Erst Design-Grundlagen, dann aufteilen, dann Reiter | ≤ 03.08.2026 | Verhindert, dass dieselben Stellen dreimal angefasst werden |
| T-3 | Bilder von Base64-in-RTDB nach Cloudflare R2 | ≤ 03.08.2026 | RTDB rechnet pro GB ab; Vorbedingung für kostenlose Basisnutzung |
| T-4 | i18n-Struktur ja, Übersetzung nein | ≤ 03.08.2026 | `CAT_KEYWORDS`, `NUTRITION_DB` und Prompts müssten je Sprache neu gebaut werden |
| T-5 | PWA bleibt, Store-App nicht geplant | ≤ 03.08.2026 | Laufende Kosten und Review-Prozesse ohne Auffindbarkeitsbedarf |
| T-6 | Kein globales Speichern, gezielte Zweigschreibung | vorher | Bestehende Betriebsregel, gilt weiter |

## Informationsarchitektur

| # | Entscheidung | Datum | Begründung |
|---|---|---|---|
| IA-1 | Vier Bereiche: Heute, Kalender, Essen, Einkauf | 04.08.2026 | Elf Reiter sind mobil nicht bedienbar; Benennung nach Tätigkeit statt Modulname |
| IA-2 | Heute-Bildschirm wird gebaut und ist Startbildschirm | 04.08.2026 | Einziger Hebel gegen das Zweitnutzer-Problem, der nicht aus Überredung besteht |
| IA-3 | Haushalt, Personen, Einstellungen in die Kopfzeile | 04.08.2026 | Selten geöffnet; Haushaltsname muss dauerhaft sichtbar sein |
| IA-4 | Zutaten, Haushalt & Drogerie, Haushalt werden zu „Artikel" | 04.08.2026 | Gleiches Objekt, gleiche Felder; Warengruppen-Trennung steckt in der Abteilung |
| IA-5 | Standardansicht der Artikel sind die manuell angelegten | 04.08.2026 | Rezeptzutaten kommen automatisch auf die Liste, manuelle nicht |
| IA-6 | Umschalter Lebensmittel / Drogerie, abgeleitet aus der Abteilung | 04.08.2026 | Trennung nötig, ohne neues Feld pro Artikel |
| IA-7 | Suchfeld in der Einkaufsliste, Unbekanntes ohne Nachfrage anlegen | 04.08.2026 | Bester Aufwand-Wirkung-Schnitt; Voraussetzung gegen WhatsApp |
| IA-8 | Mehrfachauswahl statt Einkaufs-Vorlagen | 04.08.2026 | Löst dasselbe ohne neues Datenobjekt |
| IA-9 | Schnellanlegen für Rezepte | 04.08.2026 | Einfache Gerichte schließen sich sonst vom Hauptmechanismus aus |
| IA-10 | Nährwerte werden Unterbereich von Essen | 04.08.2026 | Auswertung des Wochenplans, kein eigener Bereich |
| IA-11 | Ansichtszustand bleibt in der Sitzung, Frist ca. 4 Stunden | 04.08.2026 | Planen mit Blick in den Kalender darf die Woche nicht verlieren |
| IA-12 | Import-Abgleich gegen vorhandene Schreibweisen wird vorgezogen | 04.08.2026 | Dublettenschaden wächst mit jedem Import |
| IA-13 | Favoriten und Häufigkeits-Sortierung verworfen | 04.08.2026 | Pflegeaufwand bzw. Zerstörung von Muskelgedächtnis |
| IA-14 | Flag „immer zuhause" nur bei Rezeptzutaten sichtbar | 04.08.2026 | Bei manuellen Artikeln wirkungslos; ein Schalter ohne Wirkung ist schlimmer als keiner |

## Marke und Design

| # | Entscheidung | Datum | Begründung |
|---|---|---|---|
| MD-1 | Die App heißt **Butley** | 05.08.2026 | Weltweit keine Marke, keine App, Domain gesichert; ohne Erklärung verständlich |
| MD-2 | App-Name und Figurenname sind identisch | 05.08.2026 | Vorgabe „ein Name, ein Logo"; „Butley" liest sich als Nachname |
| MD-3 | `butley.app`, `.com` wird nicht verfolgt | 05.08.2026 | Landesneutral, 14 $/Jahr ohne Preisstaffel |
| MD-4 | Markenanmeldung später als Wort-Bild-Marke | 05.08.2026 | Gegenüber BUTLR leichter durchsetzbar |
| MD-5 | Anwaltstermin vor dem ersten zahlenden Nutzer | 05.08.2026 | Nach der Entscheidung für Stufe 2, vor Investitionen in den Auftritt |
| MD-6 | Figur als SVG-Bausatz, 6–7 Zustände, keine Fließanimation | 05.08.2026 | Gleichbleibendes Aussehen, verlustfreie Skalierung, geringe Grenzkosten |
| MD-7 | Die Figur trägt nie exklusive Information | 05.08.2026 | Andernfalls ist der Abschalter eine Lüge |
| MD-8 | Dreistufiger Abschalter: vollständig / nur Hilfe / aus | 05.08.2026 | Ausweg für den Zweitnutzer, ohne ihm die Funktion zu nehmen |
| MD-9 | Icon ohne Gesicht, Maskottchen mit Gesicht | 05.08.2026 | Mimik ist bei 32 Pixeln nicht lesbar |
| MD-10 | Ausstiegsklausel nach zwei Sessions | 05.08.2026 | Der Aufwand für die Figur darf nicht zur Falle werden |
| MD-11 | Markenfarbe weder Grün noch Rot | 05.08.2026 | Beide sind als Status belegt |
| MD-12 | Eine Webschrift für die Marke, Systemschrift für die Oberfläche | 05.08.2026 | Ladezeit und Offline-Fähigkeit; Systemschrift ist in dichten Listen besser lesbar |
| MD-13 | Tabellenziffern für alle Mengen und Nährwerte | 05.08.2026 | Verhindert horizontales Springen bei Änderungen |
| MD-14 | Butler-Ton nur in Onboarding, leeren Zuständen, Ankündigungen | 05.08.2026 | Wiederholung entwertet ihn, besonders beim Zweitnutzer |
| MD-15 | Keine Formulierungen, die Druck erzeugen | 05.08.2026 | Ein leerer Bildschirm ist eine Auskunft, keine Mahnung |
| MD-16 | Firebase-Projekt-ID bleibt `famplan-e8e4c` | 05.08.2026 | Nicht änderbar, für Nutzer unsichtbar |
| MD-17 | Domainwechsel erst nach Abschluss des Redesigns | 05.08.2026 | Bestandsnutzer sollen den Link nicht mitten im Umbau verlieren |
| MD-18 | Die Figur erscheint auch außerhalb des Onboardings: Heute-Bildschirm, leere Zustände, Bereichshilfe, Update-Ankündigungen | 05.08.2026 | **Korrigiert die frühere Festlegung „nur Onboarding-Maskottchen".** Der Umfang bleibt trotzdem UI, keine Regel- oder KI-Engine — MD-7 und MD-8 begrenzen ihn |

## Widerrufen und erledigt

| Frühere Festlegung | Status |
|---|---|
| Namenskandidaten Nestor, Bruno, Hugo, Theo, Milo | **Erledigt durch MD-1.** Nicht wieder aufnehmen |
| „Butler ist nur Onboarding-Maskottchen" | **Ersetzt durch MD-18** |
| Roadmap-Phasen 1–3 (Stand 02.08.2026) | **Ersetzt durch Kapitel 9.** Inhalte übernommen, Reihenfolge nicht |
| „Kalender: später/offen" | **Ersetzt durch K-1** |
| Messing-Verlauf auf Anthrazit | **Ersetzt durch Kapitel 6.5** |

---

# 6. Marke & Design

## 6.1 Warum umbenannt wird

„FamBoard" war ein Arbeitsname, seinerzeit bewusst gewählt trotz existierender Apps
gleichen Namens — mit der Begründung, dass eine privat per Link verteilte App keine
praktischen Folgen zu befürchten hat. Diese Begründung war an Stufe 1 gebunden und fällt
aus zwei Gründen weg:

**„Fam" verengt.** WGs, Paare ohne Kinder und Einzelnutzer sind ausdrücklich mitgemeint. Ein
Name, der „Familie" ruft, sortiert einen Teil davon aus, bevor die App geöffnet wird.

**Stufe 2 ist ein Bezahlprodukt.** Damit wird aus einem Namensdoppel ein Rechtsrisiko.

Der Zeitpunkt ist der günstigste, den es je geben wird: kein Store-Eintrag, keine
Nutzerbasis außer dem eigenen Haushalt, keine Suchmaschinenhistorie.

## 6.2 Der Name

**Butley** ist *Butler* mit der englischen Nachnamens-Endung *-ley*. Damit leistet das Wort
zwei Dinge: Es ist der Name der App, und es ist der Name der Figur — es liest sich als
englischer Nachname wie Jeeves, Carson oder Hudson. Ein Name, ein Logo, ohne dass die Figur
zusätzlich einen Vornamen braucht.

Der Bezug ist ohne Umweg verständlich, auch im Deutschen. Das war das Kriterium, an dem alle
Kunstnamen gescheitert sind: Ein Name, der eine Fußnote braucht, ist falsch.

### Prüfung

| Prüfung | Ergebnis |
|---|---|
| TMview (DPMA, EUIPO, USPTO, WIPO) | **Null Treffer** auf „Butley" |
| Apple App Store / Google Play | Keine App dieses Namens |
| Google | Ortsname in Suffolk, Klosterruine Butley Priory, Theaterstück von Simon Gray |
| `butley.app` | **Registriert**, 14,20 $/Jahr bei Cloudflare, keine Preisstaffel |
| `butley.com` | Vergeben, ohne Bedeutung für das Vorhaben |

Dass ein Name weltweit keinen einzigen Markentreffer hat, war nach acht geprüften
Alternativen bei keinem anderen Kandidaten der Fall.

### Restrisiko

Es existiert die klanglich verwandte Marke **BUTLR** in vier lebenden Eintragungen:

| Marke | Klassen | Amt | Inhaber |
|---|---|---|---|
| BUTLR | 9, 39, 42 | EUIPO | Andrea Batticani (2015) |
| BUTLR | 9 | WIPO | Butlr Technologies |
| BUTLR | 9 | USA | Butlr Technologies |
| THE BUTLR | 9, 35, 36, 39, 41, 42, 45 | Großbritannien | The Butlr Ltd (2025) |

Klasse 9 ist Software, Klasse 42 Software as a Service. Für Deutschland relevant ist allein
die EUIPO-Eintragung.

*Butley* und *Butlr* klingen ähnlich, aber nicht gleich — langes i gegen Schwa-Laut, im
Deutschen deutlicher unterscheidbar als im Englischen. Die Nähe liegt weniger im Klang als in
der gemeinsamen Anspielung auf „Butler". Ob daraus eine Verwechslungsgefahr folgt, ist eine
Ermessensfrage, keine Rechenaufgabe. **Dieses Kapitel ersetzt keine Rechtsberatung.**

Für Stufe 1 ohne Bedeutung: Ein privat verteilter Link ohne Einnahmen und ohne Werbung
erzeugt weder Sichtbarkeit noch einen wirtschaftlichen Anreiz für eine Auseinandersetzung.
Eine Marke muss nicht angemeldet werden, um einen Namen zu benutzen.

Für Stufe 2 überschaubar, mit drei entlastenden Umständen: Die EUIPO-Marke von 2015
unterliegt dem Benutzungszwang und ist bei Nichtbenutzung angreifbar; die britische Marke
wirkt nur in Großbritannien; eine spätere eigene Anmeldung erfolgt als Wort-Bild-Marke, und
die Kombination aus Name und Figur gilt als eigenständiges Zeichen.

**Maßnahme:** Vor dem ersten zahlenden Nutzer eine Beratungsstunde bei einem Markenanwalt.
Nicht früher, nicht später.

### Verworfene Alternativen

Festgehalten, damit die Suche nicht in drei Monaten von vorn beginnt.

| Kandidat | Grund |
|---|---|
| FamBoard | „Fam" verengt; mehrfach belegt |
| Nestor, Bruno, Hugo, Theo, Milo | Frühere Kandidatenliste, durch MD-1 erledigt |
| Vesta, Hestia | Über 250 US-Marken auf VESTA, mehrere Smart-Home-Apps, dazu VestaCP und HestiaCP |
| Vestalo, Curano, Larimo, Domavo, Fidaro | Brauchen eine Erklärung, klanglich austauschbar |
| Servano, Larivo, Vestano, Fidano | Belegt oder bei Domain-Händlern geparkt |
| Bellworth | Immobilienfirma in Malaysia, britische Baufirma; `.com` vergeben |
| Cadwell | US-Medizintechnik, 260 Mitarbeiter; dauerhaft geteilte Suchergebnisse |
| Hobley, Hobwell, Pantler, Larderer | Inhaltlich dicht, aber niemandem bekannt |
| Butlery | Gute zweite Wahl; benennt den Ort, nicht die Figur |
| SimpliHome | Etablierte Möbelmarke, verwandte Branche — echtes Risiko |
| HomeDesk | Mindestens vierfach belegt |
| dailyhousehold | Nicht schützbar, nicht auffindbar, nicht merkbar |

**Erkenntnis:** Jedes aussprechbare dreisilbige Kunstwort mit lateinischem Klang ist entweder
vergeben oder geparkt. Freie Namen finden sich in Wortbildungen, die niemand als Produktnamen
erwartet.

## 6.3 Die Figur

**Ein Symbol mit Mimik, keine gezeichnete Person.** Augen, Mund, optional zwei Hände. Kein
fließender Bewegungsablauf — die Figur wechselt ihren Ausdruck, wenn der Inhalt wechselt, und
steht ansonsten still.

Das ist bewusst weniger, als technisch möglich wäre. Eine flüssig animierte Figur ist
aufwendig, altert schnell und wird beim dritten Mal übersehen. Ein Wechsel bei „Weiter" ist
einfach, kostet fast nichts und fällt trotzdem auf.

### Bausatz statt Bildersatz

Eine SVG-Grundform mit austauschbaren Teilen: Körper fest, Augen in wenigen Formen (offen,
zusammengekniffen, geschlossen), Mund als ein Pfad mit wenigen Varianten, Hände optional in
zwei Positionen. Ein Zustand ist damit eine Zeile Konfiguration, kein neues Bild. Die
Zustände sehen garantiert gleich aus, skalieren verlustfrei, und der zwölfte Ausdruck kostet
Minuten statt Stunden.

### Zustände

| Zustand | Verwendung |
|---|---|
| Ruhend | Standard, Kopfzeile, Hilfe-Symbol |
| Begrüßend | Onboarding-Start, erste Anmeldung |
| Erklärend | Hilfe zu einem Bereich, Onboarding-Schritte |
| Bestätigend | Abgeschlossene Aktionen, Ende des Onboardings |
| Ratlos | Leere Zustände |
| Ankündigend | Neue Funktion nach einem Update |
| Schlafend | Optional, wenn die Figur abgeschaltet ist |

### Zwei bindende Regeln

**Die Figur trägt niemals Information, die es nicht auch ohne sie gibt.** Sie darf
formulieren, was ohnehin auf dem Bildschirm steht. Sobald der Tagesüberblick ausschließlich
aus ihrem Mund kommt, ist der Abschalter eine Lüge.

**Sie meldet sich nie unaufgefordert zweimal zum selben Thema.** Präsent, nicht aufdringlich
— das ist der Unterschied zwischen einem Butler und einer Büroklammer.

### Abschalter

| Stufe | Verhalten |
|---|---|
| Vollständig (Standard) | Begrüßung, Tageszusammenfassung, leere Zustände, Ankündigungen |
| Nur Hilfe | Erscheint nur beim Antippen des Hilfe-Symbols |
| Aus | Keine Figur, Hilfe als reines Fragezeichen |

### Icon ≠ Maskottchen

Bei 32 Pixeln ist keine Mimik lesbar. Zwei Auflösungsstufen derselben Marke: App-Icon und
Favicon als reduzierte Silhouette ohne Gesicht, Maskottchen ab etwa 64 Pixeln als dieselbe
Form mit Gesicht.

### Ausstiegsklausel

Überzeugt der Bausatz nach etwa zwei Sessions nicht, bleibt es beim statischen Symbol ohne
Mimik. Der Name funktioniert in beiden Fällen. Die Klausel steht hier, damit der Aufwand
nicht zur Falle wird.

## 6.4 Form des Logos — Vorschlag, offen

**Vorschlag: die Servierglocke.** Die gewölbte Haube, unter der in besseren Häusern der
Teller serviert wird — und die in der Silhouette kaum von der Tischglocke zu unterscheiden
ist, mit der man nach dem Butler läutet.

- **Zwei Lesarten, beide richtig.** Speiseglocke verweist auf das Essen, Tischglocke auf den
  Dienst. Eine App für Essensplanung und Haushalt braucht genau diese Doppelung.
- **Sie funktioniert als Silhouette.** Eine Kuppel über einer Grundlinie ist bei 32 Pixeln
  eindeutig. Eine gezeichnete Person ist es nicht.
- **Sie trägt ein Gesicht.** Die Wölbung ist die Fläche für Augen und Mund, die Hände sitzen
  seitlich an.
- **Sie ist niemandes Eigentum** — anders als Fliege oder Frack, die auch Kellner-, Liefer-
  und Concierge-Apps benutzen.

Alternativen: Silbertablett (flacher, schwerer erkennbar), Fliege allein (verbreitet),
abstrakte Rundform mit Fliege (beliebiger).

## 6.5 Farbwelt — Vorschlag, offen

Vorgabe: hell als Standard, Anthrazit und Messing nicht in bisheriger Form fortführen.

Die Markenfarbe darf **weder Grün noch Rot** sein. Beide sind semantisch belegt: Grün für
Erledigtes — in der Einkaufsliste die häufigste Interaktion überhaupt —, Rot für Löschen und
Fehler. Eine Markenfarbe, die mit einem Status verwechselt wird, kostet mehr, als sie
einbringt.

| Rolle | Farbe | Begründung |
|---|---|---|
| Grundfläche | Warmes Papierweiß, nicht Reinweiß | Reinweiß wirkt klinisch und blendet in der Küche am Morgen |
| Schrift | Sehr dunkles, leicht warmes Braunschwarz | Reines Schwarz auf warmem Grund wirkt hart |
| Marke / Bedienelemente | **Tiefes Nachtblau**, fast schwarz | Die Farbe des Fracks; unterscheidet sich vom Signalblau jeder Produktivitäts-App |
| Akzent | **Messing / Bernstein** | Trägt die Wiedererkennung; als Fläche und Rahmen, nicht als Fließtext |
| Erfolg | Gedecktes Grün | Ausschließlich Status |
| Warnung / Löschen | Gedecktes Rot | Ausschließlich Status |

Messing bleibt erhalten, aber in umgekehrter Verwendung: bisher heller Verlauf auf dunklem
Grund, künftig gesetzter Akzent auf hellem Grund. Das ist eine andere Wirkung, nicht dieselbe
in klein.

**Dunkelmodus:** dieselben Rollen, andere Werte. Der Grund wird zu einem warmen Dunkelbraun
statt zu Schwarz, Messing bleibt unverändert und trägt dort die Marke stärker. Beide Modi
entstehen aus **einem** Satz Merkmale.

## 6.6 Typografie — Vorschlag, offen

Randbedingung: eine HTML-Datei ohne Bauprozess, offline lauffähig. Jede Webschrift kostet
Ladezeit und muss mitgeliefert werden.

| Verwendung | Schrift |
|---|---|
| Wortmarke, Überschriften, Begrüßung der Figur | Eine Serifenschrift mit Charakter |
| Gesamte Oberfläche, Fließtext, Listen | Systemschrift (`system-ui`) |
| Mengen, Nährwerte, Zahlen in Tabellen | Systemschrift mit `font-variant-numeric: tabular-nums` |

Die Systemschrift kostet keinen Ladevorgang, sieht auf iOS und Android nativ aus und ist in
dichten Listen besser lesbar als jede geladene Alternative. Die Serifenschrift trägt allein
die Marke und tritt nur dort auf, wo sie auffällt.

Tabellenziffern sind kein Detail: Ohne sie springen Mengenangaben in der Einkaufsliste und
Nährwerte in der Wochenübersicht bei jeder Änderung horizontal.

Konkrete Schriftwahl offen. Kriterien: freie Lizenz, gute Darstellung in kleinen Graden,
vollständiger Umlaut- und Akzentsatz für die geplanten Sprachpakete.

## 6.7 Ton der Sprache

**Duzen**, ohne Ausnahme.

**Butler-Ton nur dort, wo er einmalig ist:** Onboarding, leere Zustände,
Feature-Ankündigungen. Überall sonst knapp und neutral. Formulierungen wie „Sehr wohl" sind
beim ersten Mal charmant und beim zweihundertsten Mal eine Zumutung — besonders für den
Zweitnutzer, der die App nicht ausgesucht hat.

**Nie mit schlechtem Gewissen arbeiten.** Kein „Du hast diese Woche noch nichts geplant",
kein Zähler unerledigter Aufgaben als Vorwurf.

| Situation | Richtig | Falsch |
|---|---|---|
| Leerer Tag | „Heute steht nichts an." | „Du hast heute noch nichts geplant!" |
| Bestätigung | „Auf der Liste." | „Sehr wohl, wurde vermerkt." |
| Onboarding | „Sehr erfreut. Fangen wir mit dem Haushalt an." | „Haushalt anlegen" |

## 6.8 Umsetzung im Code

**Merkmale als CSS-Variablen** in einem einzigen `:root`-Block: Farben, Abstände, Radien,
Schriftgrade. Der Dunkelmodus überschreibt ausschließlich Farbwerte.

Modusumschaltung über `prefers-color-scheme` mit manueller Übersteuerung in den Einstellungen
— Systemvorgabe als Standard, eigene Wahl gewinnt.

Die Figur als **Inline-SVG**, nicht als Bilddatei. Nur so lassen sich Farben aus den
CSS-Variablen beziehen und Zustände ohne Nachladen wechseln.

## 6.9 Was die Umbenennung auslöst

| Betroffen | Maßnahme |
|---|---|
| Sichtbarer Name, Titel, Kopfzeile | Ersetzen |
| `manifest.json` — Name, Kurzname, Icons | Ersetzen |
| App-Icon in allen Größen | Neu, aus der neuen Silhouette |
| Service-Worker-Cache-Version | Hochzählen, sonst behalten Bestandsnutzer die alte Oberfläche |
| GitHub-Repository | Umbenennen, günstig und folgenlos |
| Worker-URL | Bleibt vorerst; `butley.app` erst nach dem Redesign |
| Firebase-Projekt `famplan-e8e4c` | **Bleibt.** Projekt-IDs sind nicht änderbar und unsichtbar |
| Lokale Speicherschlüssel | Bleiben. Umbenennung würde Ansichtszustände zurücksetzen, ohne Nutzen |

Der Domainwechsel gehört ans Ende des Redesigns. Wer den alten Link gespeichert hat, soll ihn
nicht mitten in der Umbauphase verlieren.

---

# 7. Daten- & Rollenmodell

**Status: teilweise ausgearbeitet.** Der Bestand ist gebaut und dokumentiert, die neuen
Zweige sind in ihren Grundzügen entschieden, aber noch nicht im Detail modelliert. Dieses
Kapitel ist der nächste inhaltliche Arbeitsschritt nach der Roadmap.

## 7.1 Bestand

```
users/<uid>/haushalte/<id> = true
haushalte/<id>/meta          { name, owner, erstellt }
haushalte/<id>/members/<uid> { rolle: owner|mitglied, beigetreten, viaCode?, name? }
haushalte/<id>/data/…        Rezepte, Einstellungen, Slots, Wochenpläne,
                             checked/removed/qty, Extras, catOverrides
haushalte/<id>/images/<id>   Base64, lazy geladen
einladungen/<code>           { haushalt, erstelltVon, erstellt }
```

Ein Haushalt ohne jeglichen `members`-Eintrag gilt als verwaist und kann von jedem
angemeldeten Konto geclaimt werden — der Migrationsweg für Altdaten. Die Sicherheit beruht
auf den langen, zufälligen Haushalts-IDs, nicht auf Enumerationsschutz.

## 7.2 Entschieden, aber noch nicht modelliert

```
haushalte/<id>/personen/<personId>              { name, farbe, avatar, geburtsdatum?, ehemalig? }
haushalte/<id>/kalender/gemeinsam/<terminId>
haushalte/<id>/kalender/privat/<uid>/<terminId>
haushalte/<id>/notizen/<listenId>/…
```

Die Trennung der Kalenderzweige ist zwingend und wird **von Anfang an** angelegt, auch wenn
private Termine erst später gebaut werden (K-5): RTDB vergibt Leserechte nur pro Zweig, ein
Feld `sichtbarkeit: privat` an einem Termin im gemeinsamen Zweig wäre wirkungslos.

## 7.3 Offen

- Verknüpfung Person ↔ Konto: Feld an der Person oder an `members`?
- Terminformat im Detail: RRULE-Teilmenge, Zeitzone, ganztägig, mehrtägig
- Bilder nach R2: Schlüsselschema, Zugriffsschutz, Migrationspfad der Bestandsbilder
- Sicherheitsregeln für die neuen Zweige
- Alias-Modell für Zutaten-Dubletten

## 7.4 Aktuelle Sicherheitsregeln

Die veröffentlichte Fassung von `database.rules.json` liegt im Repo und im Handover vom
02.08.2026. Kernpunkte: Lesen und Schreiben nur für Mitglieder des jeweiligen Haushalts;
`meta` nur für Besitzer; ein Mitglied darf die eigene `members`-Zeile ändern, solange `rolle`
unverändert bleibt (kein Selbstupgrade zum Besitzer); Bilder maximal 400 000 Zeichen.

---

# 8. Rechtliches & Kostenmodell Stufe 2

**Status: nicht ausgearbeitet.** Dieses Kapitel ist die größte inhaltliche Lücke des
Dokuments.

## 8.1 Der Bruch, der benannt werden muss

Die bisher härteste Leitplanke des Projekts lautete: **keine Infrastruktur, die eine
Zahlungsmethode voraussetzt.** An ihr sind Netlify, Vercel, Firebase Hosting und Firebase
Cloud Storage gescheitert.

Stufe 2 verlangt das Gegenteil: Einnahmen bedeuten Zahlungsabwicklung, Rechnungsstellung,
Umsatzsteuer, Impressum, AGB, Widerrufsbelehrung und eine Datenschutzerklärung, die einer
Prüfung standhält. Das ist kein Detail am Ende der Roadmap, sondern ein anderer Betriebsmodus.

Die Konsequenz ist nicht, Stufe 2 aufzugeben — sondern sie nicht nebenbei zu entscheiden.

## 8.2 Zu klären, bevor der erste Euro fließt

| Thema | Frage |
|---|---|
| Rechtsform | Kleinunternehmer nach § 19 UStG oder von Anfang an regelbesteuert? |
| Zahlungsabwicklung | Stripe, Paddle oder Lemon Squeezy? Paddle und Lemon Squeezy treten als Merchant of Record auf und übernehmen die Umsatzsteuer in allen EU-Ländern — teurer, aber deutlich weniger Verwaltung |
| Preis | Was kostet der KI-Import wirklich, inklusive Fehlversuchen und Missbrauch? |
| Impressum & AGB | Pflicht ab dem ersten entgeltlichen Angebot |
| Datenschutzerklärung | Muss Firebase, Cloudflare und Anthropic als Auftragsverarbeiter benennen |
| Auftragsverarbeitung | AV-Verträge mit Google, Cloudflare, Anthropic |
| Marke | Beratungsstunde zu BUTLR (MD-5) |
| Haftung | Nährwertangaben sind berechnet, nicht geprüft — Haftungsausschluss nötig |

## 8.3 Laufende Kosten heute

| Posten | Kosten |
|---|---|
| Cloudflare Worker + KV | kostenlos im Rahmen des Freikontingents |
| Firebase RTDB | kostenlos, solange das Downloadvolumen klein bleibt — **deshalb T-3** |
| Firebase Auth | kostenlos |
| Anthropic API | 1–2 Cent pro Import, Prepaid mit Ausgabenlimit |
| `butley.app` | 14,20 $/Jahr |

Der Rezept-Import ist die einzige Funktion mit laufenden Grenzkosten. Genau deshalb ist er
die einzige, die in Stufe 2 Geld kostet.

---

# 9. Roadmap & Release-Schnitt

**Status: Vorschlag. Nicht entschieden.** Dieses Kapitel ist der nächste Arbeitsschritt.

## 9.1 Zeitbudget

5 Stunden pro Woche, harte Grenze. Das entspricht etwa **zwei Sessions à 2–3 Stunden**.

Der Code kommt vom Assistenten. Entschieden, eingesetzt, committet, deployt und getestet
wird selbst. Nicht beschleunigbar: Testen und Bugfixing (2–5 Runden pro Feature),
Entscheidungen, Grafiken.

## 9.2 Aufwand, konsolidiert

Die frühere Schätzung von 31–52 Sessions enthielt weder die Codebase-Aufteilung noch die
R2-Bildmigration noch Notizen/To-Dos noch die Verwaltungsfunktionen — alles beschlossene
Bestandteile der Stufe 1. Diese Tabelle ersetzt sie und ist überschneidungsfrei gerechnet.

| Position | Sessions |
|---|---|
| Design-Grundlagen: Farb- und Schriftmerkmale, hell und dunkel | 2–3 |
| Komponenten vereinheitlichen | 3–4 |
| Codebase aufteilen, Build-Setup | 2–3 |
| Navigation umbauen: vier Bereiche, Kopfzeile, Unterbereiche | 3–4 |
| Heute-Bildschirm | 3–5 |
| Bestehende Bereiche auf das neue Design umbauen | 4–6 |
| Artikel zusammenlegen: drei Reiter → einer, Filter, food/non-food | 3–4 |
| Suchfeld Einkaufsliste + Mehrfachauswahl | 1–2 |
| Schnellanlegen Rezept | 1 |
| Import-Abgleich Schreibweisen | 0,5 |
| Ansichtszustand-Regel | 0,5 |
| Personen-Modell | 2–3 |
| Figur: SVG-Bausatz, 6–7 Zustände | 2–3 |
| Logo und Icon-Satz in allen Größen | 1 |
| Butler-Onboarding: Ablauf und Texte | 3–5 |
| Umbenennung in Code, Manifest, Cache, Repository | 0,5 |
| i18n-Struktur | 2–3 |
| Bilder von Base64 nach R2 | 1–2 |
| Verwaltung aus der Oberfläche: Mitglieder, Haushalt löschen, KI-Stufen | 2–3 |
| Notizen/To-Dos | 2–4 |
| Kalender | 8–15 |
| Push-Benachrichtigungen | 3–5 |
| **Summe** | **49,5 – 77,5** |

Bei zwei Sessions pro Woche: **25–39 Wochen, also 6–10 Monate.** Das ist deutlich mehr als
die früher genannten 4–6 Monate. Der Unterschied liegt nicht in neuen Wünschen, sondern in
vier Positionen, die vorher schlicht nicht gezählt wurden.

## 9.3 Vorschlag für den Schnitt

Ein Zug über 6–10 Monate ohne sichtbares Ergebnis ist bei 5 Stunden pro Woche riskant. Drei
Wellen mit jeweils einem auslieferbaren Zustand:

**Welle A — Fundament und Marke (ca. 15–22 Sessions)**
Design-Grundlagen, Komponenten, Codebase-Aufteilung, Umbenennung, Logo und Icons, Figur als
Bausatz, R2-Migration, Import-Abgleich.
*Ergebnis:* dieselbe App, neuer Name, neues Gesicht, tragfähige Grundlage. Nichts fehlt, was
heute da ist.

**Welle B — Neue Ordnung (ca. 16–25 Sessions)**
Navigation, Heute-Bildschirm, Artikel zusammenlegen, Suchfeld, Mehrfachauswahl,
Schnellanlegen, Ansichtszustand, Personen-Modell, Onboarding, Verwaltung aus der Oberfläche.
*Ergebnis:* der Zustand, den dieses Dokument als Informationsarchitektur beschreibt. Der
Punkt, an dem die App für den Zweitnutzer erstmals etwas anderes ist als ein Planungsraster.

**Welle C — Neue Module (ca. 18–31 Sessions)**
Kalender, Notizen/To-Dos, Push, i18n-Struktur.
*Ergebnis:* FamilyWall wird abgelöst, Stufe 1 ist vollständig.

**Begründung für diese Reihenfolge:** Welle A muss zuerst, weil Design-Merkmale und
Dateiaufteilung alles Spätere billiger machen (T-2). Welle B vor C, weil ein Kalender, der in
eine Acht-Reiter-Navigation eingehängt wird, zweimal gebaut werden muss. Und weil das
Zweitnutzer-Problem in Welle B gelöst wird oder gar nicht — nach Welle C wäre es zu spät, um
die Antwort noch zu ändern.

## 9.4 Was vor Welle B steht

**Die Auswertung des Fragebogens.** Konkret drei Fragen:

- **Frage 21** — ziehen wirklich alle mit? Fällt sie negativ aus, wird die Reihenfolge neu
  bewertet, nicht nur ergänzt.
- **Frage 16** — Interesse an Notizen/To-Dos. Fällt es stark aus, wird der Bereich zu voll
  für einen Unterpunkt und die Vierer-Navigation muss neu bewertet werden.
- **Frage 17** — Bedarf für private Termine. Entscheidet, ob der private Zweig in Stufe 1
  gebaut oder nur angelegt wird.
- **Frage 19** — Zahlungsbereitschaft für den KI-Import. Entscheidet, ob Kapitel 8 überhaupt
  gebraucht wird.

## 9.5 Aus der alten Roadmap übernommen, ohne feste Zuordnung

- Timer aus Rezepten ziehen — Zeitangaben in der Zubereitung erkennen und antippbar machen
- „Zuletzt gekocht am" je Rezept
- Wochenpläne als Vorlage speichern und laden
- `CAT_KEYWORDS` laufend nachschärfen
- Verwaiste Einträge aufräumen, insbesondere `members`-Leichen nach dem Löschen eines
  Auth-Kontos
- Schnellzugriff-Kacheln in der Artikelliste (nur mit echten Nutzungsdaten)
- Alias-Modell für Zutaten-Dubletten
- Instagram-Import, Videotranskription — extern blockiert bzw. zu teuer

---

# 10. Tools & Ressourcen

| Zweck | Werkzeug |
|---|---|
| Hosting | Cloudflare Worker mit statischen Assets |
| Datenbank | Firebase Realtime Database `famplan-e8e4c`, europe-west1 |
| Anmeldung | Firebase Auth (E-Mail/Passwort, Google) |
| Ratenbegrenzung | Cloudflare KV, Namespace `famboard-limits` |
| KI-Import | Anthropic API, Modell `claude-sonnet-5` |
| Bilder (geplant) | Cloudflare R2 |
| Versionsverwaltung | GitHub `Vladidas78/FamBoard`, Branch `main`, Git Gui |
| Dokumentation | Notion; Obsidian-Vault lokal für Notizen |
| Domain | `butley.app` bei Cloudflare |
| Icons | PIL mit 4-fachem Supersampling |

**Umgebungsvariablen in Cloudflare**

| Variable | Art |
|---|---|
| `ANTHROPIC_API_KEY` | Secret, Pflicht |
| `YOUTUBE_API_KEY` | Secret, optional — ohne ihn sind YouTube-Beschreibungen unzuverlässig |
| `IMPORT_LIMIT_FREE` | Text, optional, Standard 10 |
| `IMPORT_LIMIT_PREMIUM` | Text, optional, Standard 100 |

**Import-Stufen** als KV-Einträge, wirken sofort ohne Deployment: `tier:<e-mail>` =
`premium` (100/Tag), `unbegrenzt` oder `gesperrt`. Ohne Eintrag gilt 10/Tag. Der Zähler läuft
nach deutscher Zeit und wird erst hochgesetzt, wenn wirklich ein kostenpflichtiger Aufruf
ansteht — fehlgeschlagene Links zählen nicht.

**Ausgeschlossene Infrastruktur** — mit Begründung, damit die Prüfung nicht wiederholt wird:

| Ausgeschlossen | Grund |
|---|---|
| Cloudflare Pages | Kein Serverless im Workers-Projekt |
| Netlify | Credit-Modell zu restriktiv |
| Vercel | Einschränkungen bei kommerzieller Nutzung |
| Firebase Hosting | Functions erfordern Abrechnungskonto |
| GitHub Pages | Kein Serverless |
| Firebase Cloud Storage | Abrechnungspflicht seit Februar 2026 |

## Arbeitsweise

- Sprache: Deutsch
- Erwartet schonungslose Ehrlichkeit und begründeten Widerspruch, ausdrücklich kein
  Schönreden
- Erwartet viele Rückfragen, beantwortet sie ausführlich
- Code immer als **vollständige Dateien**, niemals als Schnipsel oder Diff
- Testet selbst im Browser mit Konsole, schickt bei Bugs Screenshots — darauf konkret und
  schrittweise eingehen, nicht ohne Datenlage raten

---

# 11. Offene Punkte

Sortiert danach, was zuerst entschieden werden muss.

## Blockierend

| # | Punkt | Wovon abhängig |
|---|---|---|
| O-1 | **Auswertung des Fragebogens**, insbesondere Frage 21 | Testhaushalte antworten |
| O-2 | **Release-Schnitt** — Wellen A/B/C annehmen oder anders schneiden? | O-1 |
| O-3 | **Zeitpunkt der Umbenennung** — mit dem Redesign oder vorgezogen? Vorgezogen kommt die Marke früh im Haushalt an; zusammen spart einen Update-Zyklus | Entscheidung |

## Gestaltung

| # | Punkt |
|---|---|
| O-4 | **Form des Logos** — Vorschlag Servierglocke, Entscheidung ausstehend |
| O-5 | **Konkrete Farbwerte** — Richtung vorgeschlagen, Werte ausstehend |
| O-6 | **Schriftwahl** — Prinzip entschieden, Schrift ausstehend |

## Struktur

| # | Punkt |
|---|---|
| O-7 | **Notizen/To-Dos: eigener Bereich oder Unterbereich?** Hängt an Frage 16. Fällt das Interesse stark aus, muss die Vierer-Navigation neu bewertet werden |
| O-8 | **Private Termine in Stufe 1 bauen?** Hängt an Frage 17. Die Zweige werden unabhängig davon angelegt (K-5) |
| O-9 | **Benennung des Unterbereichs „Artikel"** — Alternativen: Katalog, Sortiment. „Vorrat" wäre irreführend, weil kein Bestand geführt wird |

## Technik und Recht

| # | Punkt |
|---|---|
| O-10 | **Datenmodell im Detail** — Kapitel 7.3 |
| O-11 | **Kostenmodell und Rechtliches der Stufe 2** — Kapitel 8, komplett offen |
| O-12 | **Sprachpakete** — Englisch, Spanisch, Französisch, Portugiesisch geplant. Die Ansprache der Figur muss je Sprache neu gefunden werden; eine Übersetzung des deutschen Butler-Tons trägt nicht. Betrifft Stufe 2 |
| O-13 | **Notion-Backlog als filterbare Datenbank** umbauen |

---

## Änderungshistorie

| Datum | Änderung |
|---|---|
| 05.08.2026 | Masterdokument angelegt. Zusammenführung von Konzept-Handover, Informationsarchitektur, Marke & Design, Roadmap, Backlog und technischem Snapshot. Neu vergeben: Entscheidungsnummern Z-*, P-*, K-*, T-*. Neu: MD-18. Neu gerechnet: Aufwand (Kapitel 9.2). Neu vorgeschlagen: Release-Schnitt in drei Wellen (Kapitel 9.3) |

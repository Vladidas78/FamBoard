# Butley — Designstand

**Stand:** 05.08.2026
**Phase:** Welle A, Schritt 1 (Design-Grundlagen) abgeschlossen
**Figma:** https://www.figma.com/design/DfriCtSsyJbjhHDSehM7Bh
**Beigelegte Dateien:** `butley-tokens.css`, `butley-designstand.html`

---

## 1. Entscheidungen dieser Sitzung

| Nr. | Entscheidung | Begründung |
|---|---|---|
| D-1 | Messing bleibt Akzentfarbe, Untergrund wird hell | Messing belegt keine Funktion und verspricht keine Domäne — anders als Grün (Küche, erledigt), Rot (löschen) und Blau (Link). Kommt aus dem Namen, nicht aus einem Farbrad. Bestehendes Erkennungsmerkmal aus FamBoard. |
| D-2 | Verworfen: Salbei/Küche, Tinte/Leinen, Terrakotta/Sand | Salbei verspricht Kochen und kollidiert mit „abgehakt". Tinte ist am besten lesbar, aber austauschbar. Terrakotta verbraucht die stärkste Signalfarbe für Dekoration. |
| D-3 | Eine Schrift statt zwei, Vorschlag Inter | Charakter kommt aus Farbe, Figur und Sprache. Ziffernlesbarkeit zählt mehr als Ausdruck (Portionen, Nährwerte, Mengen). |
| D-4 | Bedienelemente mindestens 44 px hoch | Mindestmaß für Daumen. Die App wird einhändig im Supermarkt bedient. |
| D-5 | Button-Rangordnung: Primär einmal, Sekundär höchstens zweimal, Ruhig beliebig oft | Zwei primäre Buttons auf einem Bildschirm heißen fast immer, dass er zwei Aufgaben vermischt. |
| D-6 | Erledigte Einkaufsposten bleiben sichtbar (durchgestrichen) | Verschwinden lassen entzieht die Rückmeldung, dass etwas passiert ist. |
| D-7 | Snack-Karte ohne Bildfläche, nicht mit Platzhalter | Snacks sind ein eigener Rezepttyp ohne Bild. Ein grauer Platzhalter sähe nach fehlenden Daten aus statt nach Absicht. |
| D-8 | Hell und Dunkel als zwei getrennte Figma-Sammlungen | Der Umschalter (Modes) ist im kostenlosen Tarif nicht verfügbar. Im Code ohnehin zwei Blöcke — kostet nur die Vorschau in Figma. |

---

## 2. Farbwerte

### Hell

| Rolle | Wert | CSS |
|---|---|---|
| Fläche Seite | `#FAF7F2` | `--flaeche-seite` |
| Fläche Karte | `#FFFFFF` | `--flaeche-karte` |
| Linie | `#E7E0D6` | `--linie` |
| Text | `#262220` | `--text` |
| Text leise | `#6E6560` | `--text-leise` |
| Messing Aktion | `#8A6520` | `--messing-aktion` |
| Messing gedrückt | `#6E5019` | `--messing-gedrueckt` |
| Messing Marke | `#B08D57` | `--messing-marke` |
| Messing Fläche | `#F3E7D2` | `--messing-flaeche` |
| Auf Aktion | `#FFFFFF` | `--auf-aktion` |
| Status erledigt | `#4E7A52` | `--erledigt` |
| Status löschen | `#A8442A` | `--loeschen` |

### Dunkel

| Rolle | Wert |
|---|---|
| Fläche Seite | `#1B1917` |
| Fläche Karte | `#24211E` |
| Linie | `#383029` |
| Text | `#F1ECE4` |
| Text leise | `#A29889` |
| Messing Aktion | `#D9A94A` |
| Messing gedrückt | `#C0912F` |
| Messing Marke | `#C9A46A` |
| Messing Fläche | `#3A2E16` |
| Auf Aktion | `#33240A` |
| Status erledigt | `#7FB185` |
| Status löschen | `#E08A6B` |

### Maße

Abstände 4 / 8 / 12 / 16 / 24 / 32 · Radien 8 / 12 / 16 / rund · Bedienelement 44 · Chip 36

---

## 3. Komponenten

**Button** — 9 Varianten (Stil × Zustand)
Stil: Primär, Sekundär, Ruhig · Zustand: Standard, Gedrückt, Deaktiviert
Höhe 44, Radius 8, Innenabstand seitlich 24, Schrift 15 Medium

**Eingabefeld** — 4 Varianten (Leer, Gefüllt, Fokus, Fehler)
Höhe 44, Radius 8, Innenabstand seitlich 16, Schrift 15 Regular
Fokus: 2 px Messing · Fehler: 2 px Terrakotta · Fläche bleibt immer Kartenfarbe

**Chip** — 3 Varianten (Standard, Gewählt, Erledigt)
Höhe 36, Radius rund, Innenabstand seitlich 12, Schrift 14 Medium
Gewählt: Messingfläche, Messingrand, Messingtext · Erledigt: durchgestrichen, Text leise

**Karte** — 2 Varianten (Rezept, Snack)
Breite 280, Radius 12, Innenabstand 16
Rezept: Bildfläche 140 hoch · Snack: ohne Bildfläche

Alle Werte sind an Variablen gebunden. Kein fester Farb-, Abstands- oder Radiuswert in einem Bauteil.

---

## 4. Offene Punkte

| Nr. | Punkt | Anmerkung |
|---|---|---|
| O-A | Messing Aktion wirkt auf großer Fläche olivbrauner als erwartet | Wert bewusst dunkel, damit er als Textfarbe auf Weiß lesbar bleibt. Alternative: Aktion und Marke stärker trennen. |
| O-B | Primär und Primär-gedrückt liegen farblich nah beieinander | Auf dem Bildschirm der Unterschied zwischen „getippt" und „danebengetippt". |
| O-C | Deaktivierter Button nutzt die Linienfarbe als Fläche | Wirkt eher wie ein leeres Feld als wie ein abgeschalteter Knopf. Bessere Lösung wäre, deaktivierte Buttons gar nicht zu zeigen — Frage für Welle B. |
| O-D | Schrift nicht endgültig entschieden | Inter als Vorschlag, nicht festgelegt. |
| O-E | Marke fehlt vollständig | Logo, App-Icons, Butler-Figur. 2–3 Sessions allein für den SVG-Bausatz der Figur. Braucht eine Vorstellung vom Nutzer, nicht nur eine Umsetzung. |

---

## 5. Tarifgrenzen Figma (kostenlos)

- **Modes:** nur einer pro Sammlung — daher zwei getrennte Farbsammlungen statt Hell/Dunkel-Umschalter
- **Seiten:** maximal drei — alle Komponenten liegen auf einer Seite „Komponenten"; eine Seite ist für Welle B frei
- **Werkzeugaufrufe:** kontingentiert — betrifft nur den assistierten Zugriff, nicht die Arbeit in der Datei

Aufrüstung auf Professional kostet rund 16 $ pro Monat und Bearbeiter und widerspricht dem Grundsatz „keine Zahlungsmethode nötig". Bis Welle B ist das nicht erforderlich.

---

## 6. Nächste Schritte

1. Datei in Figma durchsehen, Kommentare direkt an den Stellen setzen
2. Offene Punkte O-A bis O-D entscheiden
3. `butley-tokens.css` in `index.html` übernehmen (`:root` plus Dunkelmodus-Block)
4. Danach: Codebase aufteilen, dann Komponenten im Code vereinheitlichen
5. Marke (O-E) — der einzige Posten, der nicht ohne Vorgabe beginnen kann

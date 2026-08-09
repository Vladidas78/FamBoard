#!/usr/bin/env python3
"""
Prueft das Stylesheet auf drei Fehlerarten, die weder pruefe-verweise.py noch
der Pruefstand finden koennen - weil nichts abstuerzt, nichts fehlt und der
Prueflauf in Chromium laeuft, der Fehler aber in Safari auf dem iPhone sitzt.

Alle drei sind echte Vorfaelle aus diesem Projekt, keine erfundenen Regeln:

1. Intrinsische Mindestbreite in Rasterspuren (v15, 09.08.2026)
   `.grid2` stand auf `grid-template-columns:1fr 150px`. Ein blankes `1fr` ist
   `minmax(auto,1fr)`, und das `auto` ist eine Untergrenze: Die Spur wird nie
   schmaler als der min-content-Beitrag ihres Inhalts. Datums- und Zeitfelder
   bringen in Safari eine grosse intrinsische Breite mit, die `width:100%`
   nicht aufhebt. Auf dem iPhone lagen die Rahmen von Datum und Ort sichtbar
   uebereinander. Dieselbe Ursache wie der abgeschnittene Papierkorb der
   Einkaufszeile in v14 - dort am Flex-Element, hier in der Rasterspur.

2. safe-area ohne viewport-fit (v15, 09.08.2026)
   `env(safe-area-inset-*)` liefert 0, solange die Viewport-Angabe kein
   `viewport-fit=cover` traegt. Sechs Regeln standen im Stylesheet und keine
   hat je gegriffen. Dieselbe Bauart wie der Dunkelmodus vor B6: vorhanden,
   dokumentiert, nie eingeschaltet.

3. Systemkaestchen (MD-26)
   Ein Kaestchen ohne `appearance:none` erscheint eckig in Systemfarbe und
   laesst den Bereich aussehen, als gehoere er nicht zur App. In v14 war das
   Ganztaegig-Kaestchen im Terminformular das letzte seiner Art.

Aufruf:

    python3 pruefe-stil.py

Rueckgabewert 0 = in Ordnung, 1 = mindestens ein Befund.
"""

import re
import sys
from pathlib import Path

HIER = Path(__file__).parent
CSS = HIER / "public" / "css" / "styles.css"
HTML = HIER / "public" / "index.html"

# Wer eine Ausnahme braucht, schreibt diesen Vermerk samt Begruendung in die
# Zeile. Absicht ist dann sichtbar - Vergessen sieht anders aus als Entscheiden.
VERMERK = "stil-ok"


def zeilen_mit(text):
    return list(enumerate(text.split("\n"), start=1))


def pruefe_raster(css):
    """Blankes `1fr` in grid-template-columns. `minmax(0,1fr)` ist gemeint."""
    befunde = []
    for nr, zeile in zeilen_mit(css):
        if "grid-template-columns" not in zeile or VERMERK in zeile:
            continue
        spuren = zeile.split("grid-template-columns", 1)[1]
        # minmax(...) und repeat(auto-fill, minmax(...)) sind in Ordnung -
        # herausnehmen, was danach an blankem 1fr uebrig bleibt, ist der Befund.
        ohne_minmax = re.sub(r"minmax\([^)]*\)", "", spuren)
        if re.search(r"(?<![\w.(])\d*\.?\d*fr", ohne_minmax):
            befunde.append((nr, zeile.strip()))
    return befunde


def pruefe_safe_area(css, html):
    """env(safe-area-inset-*) ohne viewport-fit=cover ist wirkungslos."""
    treffer = [nr for nr, z in zeilen_mit(css) if "env(safe-area-inset-" in z]
    if not treffer:
        return []
    viewport = re.search(r'<meta\s+name="viewport"\s+content="([^"]*)"', html)
    inhalt = viewport.group(1) if viewport else ""
    if "viewport-fit=cover" in inhalt.replace(" ", ""):
        return []
    return [(treffer, inhalt or "<meta name=\"viewport\"> fehlt")]


def pruefe_datumsfelder(css):
    """Datums- und Zeitfelder ohne appearance:none behalten in Safari eine
    Mindestbreite, gegen die width:100% nicht ankommt. Der Fehler faellt nur
    auf dem iPhone auf - Chromium setzt diese Felder schmal."""
    treffer = re.search(
        r"input\[type=date\][^{}]*\{([^{}]*)\}", css)
    if treffer and "appearance" in treffer.group(1):
        return []
    return [treffer is not None]


def pruefe_kaestchen(css):
    """Kaestchen, die Groesse setzen, aber die Systemdarstellung behalten."""
    befunde = []
    alle = css.split("\n")
    bloecke = re.finditer(r"([^\n{}]*input[^\n{}]*)\{([^{}]*)\}", css)
    for b in bloecke:
        wahl, koerper = b.group(1).strip(), b.group(2)
        if "checkbox" not in wahl and "checkbox" not in koerper:
            continue
        # Der Vermerk darf auch hinter der schliessenden Klammer stehen - dort
        # ist er beim Lesen am ehesten zu sehen. Deshalb ganze Zeilen pruefen,
        # nicht nur Wahl und Koerper.
        von = css[: b.start()].count("\n")
        bis = css[: b.end()].count("\n")
        if VERMERK in "\n".join(alle[von: bis + 1]):
            continue
        # Zustandsregeln (:checked, :hover, :focus) haengen an einer Grundregel,
        # die die Darstellung schon abgeschaltet hat - sie einzeln zu melden
        # brachte beim ersten Lauf zwei Fehlmeldungen auf drei Befunde.
        if re.search(r":(checked|hover|focus|active|disabled)", wahl):
            continue
        # `width:auto` setzt keine Groesse, sondern nimmt eine zurueck.
        if not re.search(r"\bwidth\s*:\s*(?!auto)[^;]+", koerper):
            continue
        if "appearance" in koerper:
            continue
        nr = css[: b.start()].count("\n") + 1
        befunde.append((nr, wahl))
    return befunde


def main():
    css = CSS.read_text(encoding="utf-8")
    html = HTML.read_text(encoding="utf-8")

    raster = pruefe_raster(css)
    safe = pruefe_safe_area(css, html)
    kaestchen = pruefe_kaestchen(css)
    # Im HTML steht type="date" mit Anfuehrungszeichen, im Stylesheet
    # [type=date] ohne. Der erste Anlauf pruefte auf die CSS-Schreibweise und
    # lief deshalb nie an - gefunden nur durch die Gegenprobe.
    benutzt_datumsfeld = re.search(r'type\s*=\s*["\']?(date|time)["\']?', html)
    datum = pruefe_datumsfelder(css) if benutzt_datumsfeld else []

    anzahl_raster = sum(1 for _, z in zeilen_mit(css) if "grid-template-columns" in z)
    anzahl_safe = sum(1 for _, z in zeilen_mit(css) if "env(safe-area-inset-" in z)
    print(f"{anzahl_raster} Rasterangaben, {anzahl_safe} safe-area-Regeln geprueft.")

    if raster:
        print("\nBLANKES 1fr IN EINER RASTERSPUR:")
        for nr, zeile in raster:
            print(f"  styles.css Zeile {nr}: {zeile[:96]}")
        print("  `1fr` ist `minmax(auto,1fr)` - die Spur wird nie schmaler als ihr")
        print("  Inhalt. Gemeint ist fast immer `minmax(0,1fr)`. Wenn doch nicht:")
        print(f"  `/* {VERMERK}: <Grund> */` in die Zeile schreiben.")

    if safe:
        zeilen, inhalt = safe[0]
        print("\nSAFE-AREA OHNE viewport-fit=cover:")
        print(f"  styles.css Zeile {', '.join(str(z) for z in zeilen)}")
        print(f"  Viewport-Angabe: {inhalt}")
        print("  Diese Regeln rechnen alle mit 0px. `viewport-fit=cover` ergaenzen")
        print("  oder die Regeln entfernen - beides ist ehrlicher als der Zustand.")

    if kaestchen:
        print("\nKAESTCHEN MIT SYSTEMDARSTELLUNG (MD-26):")
        for nr, wahl in kaestchen:
            print(f"  styles.css Zeile {nr}: {wahl[:96]}")
        print("  Ohne `appearance:none` erscheint es eckig in Systemfarbe.")
        print(f"  Absicht? Dann `/* {VERMERK}: <Grund> */` in die Regel schreiben.")

    if datum:
        print("\nDATUMS- ODER ZEITFELD MIT SYSTEMDARSTELLUNG:")
        print("  index.html benutzt input[type=date], styles.css schaltet die")
        print("  Systemdarstellung nicht ab. In Safari behaelt so ein Feld eine")
        print("  Mindestbreite, gegen die width:100% nicht ankommt - es wird")
        print("  breiter als seine Spalte und schiebt sich unter das Nachbarfeld.")
        print("  `input[type=date], input[type=time]{ appearance:none; }` ergaenzen.")

    if raster or safe or kaestchen or datum:
        return 1

    print("In Ordnung: keine offenen Rasterspuren, safe-area wirksam,"
          " kein Systemkaestchen, Datumsfelder gezaehmt.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

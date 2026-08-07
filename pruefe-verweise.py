#!/usr/bin/env python3
"""
Prueft, ob jedes Element, das app.js anspricht, im HTML auch existiert.

Anlass: Am 07.08.2026 fielen beim Umbau der Navigation drei Elemente aus
`<main>`, die keinem Bereich gehoerten - #status, #netnote, #fehler. setStatus()
lief daraufhin auf null, die Startfunktion brach ab, der Firebase-Zuhoerer wurde
nie angehaengt, und die App zeigte einen leeren Haushalt, obwohl alle Daten da
waren. Der Fehler war unsichtbar: kein Absturz, keine Meldung, nur leere Listen.

Nach jeder Aenderung an index.html oder app.js einmal ausfuehren:

    python3 pruefe-verweise.py

Rueckgabewert 0 = in Ordnung, 1 = es fehlt etwas.
"""

import re
import sys
from pathlib import Path

HIER = Path(__file__).parent
HTML = HIER / "public" / "index.html"
JS = HIER / "public" / "js" / "app.js"


def main():
    html = HTML.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")

    vorhanden = set(re.findall(r'id="([^"]+)"', html))
    gesucht = (set(re.findall(r"getElementById\(\s*'([^']+)'\s*\)", js))
               | set(re.findall(r'getElementById\(\s*"([^"]+)"\s*\)', js))
               | set(re.findall(r"querySelector(?:All)?\(\s*'#([A-Za-z0-9_-]+)", js)))

    fehlend = sorted(g for g in gesucht if g not in vorhanden)

    print(f"{len(gesucht)} Verweise aus app.js geprueft, {len(vorhanden)} IDs im HTML.")
    if fehlend:
        print("\nFEHLEN IM HTML:")
        for f in fehlend:
            zeilen = [str(i + 1) for i, z in enumerate(js.split("\n")) if f"'{f}'" in z or f'"{f}"' in z]
            print(f"  #{f}  (app.js Zeile {', '.join(zeilen[:4])})")
        print("\nDas laesst die App still scheitern - Elemente ergaenzen, nicht die Aufrufe entfernen.")
        return 1

    print("In Ordnung: Jedes angesprochene Element existiert.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

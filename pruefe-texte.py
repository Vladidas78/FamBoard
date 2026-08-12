#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Butley — dritter statischer Pruefer, neben pruefe-verweise.py und pruefe-stil.py.

Er haelt public/js/texte.js, public/index.html und public/js/app.js in Deckung.
Dieselbe Aufgabe wie pruefe-verweise.py, nur fuer Texte statt fuer IDs.

Fuenf Regeln, alle aus echten Vorfaellen beim Bau von C1:

1. Jeder Schluessel im HTML steht im Katalog.
   Sonst schreibt uebersetzeSeite() den Schluesselnamen auf den Bildschirm.

2. Der Text im HTML ist zeichengleich mit dem Text im Katalog.
   Das HTML traegt den deutschen Text weiterhin (erster Frame, Rueckfall ohne
   Modul). Zwei Orte fuer denselben Satz laufen auseinander, sobald jemand nur
   einen davon anfasst - dieselbe Falle wie bei K-13. Diese Regel schliesst sie.

3. Jeder t(...)-Aufruf in app.js hat einen Eintrag.
   Meldungen und Fehlertexte liegen in Pfaden, die kein Bild zeigt
   (Betriebsregel 12). Statisch ist es trotzdem pruefbar.

4. Kein Schluessel im Katalog ist unbenutzt.
   Eine Sprachdatei, in der Karteileichen mitwandern, laesst jeden Uebersetzer
   Arbeit machen, die niemand sieht.

5. Die Indizes in data-t-teil zeigen auf vorhandene Textknoten.
   Der Index zaehlt die Textknoten mit sichtbarem Inhalt - auch die ohne
   Schluessel. Genau daran ist der erste Anlauf gescheitert: "Butley" faellt
   als Wortmarke aus der Schluesselvergabe, aber nicht aus der Zaehlung. Aus
   "Butley 0.9.0 . Stufe 1" wurde "- Stufe 1 0.9.0 . Stufe 1". Kein Pruefer
   hat das gefunden, sondern der byteweise Bildvergleich; seitdem prueft es
   diese Regel.

Ausnahmen bekommen /* texte-ok: <Grund> */ in die Zeile.
"""
import re, sys
from html.parser import HTMLParser

HTML = 'public/index.html'
APP = 'public/js/app.js'
KATALOG = 'public/js/texte.js'


def lies(p):
    return open(p, encoding='utf-8').read()


def katalog_lesen(quelle):
    """Die de-Eintraege aus texte.js. Bewusst kein JSON-Parser: Die Datei ist
       JavaScript und soll es bleiben - Kommentare tragen dort die Begruendungen."""
    m = re.search(r"\bde:\s*\{(.*?)\n  \},", quelle, re.S)
    if not m:
        print('FEHLER: In texte.js ist kein de-Block zu finden.')
        sys.exit(1)
    eintraege = {}
    for zeile in m.group(1).split('\n'):
        t = re.match(r"\s*'((?:[^'\\]|\\.)*)':\s*'((?:[^'\\]|\\.)*)',\s*$", zeile)
        if t:
            entschluessel = lambda s: s.replace("\\'", "'").replace('\\n', '\n').replace('\\\\', '\\')
            eintraege[entschluessel(t.group(1))] = entschluessel(t.group(2))
    return eintraege


class Leser(HTMLParser):
    """Sammelt Schluessel samt dem Text, der im HTML danebensteht."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stapel = []
        self.paare = []          # (schluessel, text_im_html, art, zeile)
        self.teil_fehler = []
        self.stumm = 0

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag in ('script', 'style', 'svg'):
            self.stumm += 1
        z = self.getpos()[0]
        for attr, name, art in (('data-t-ph', 'placeholder', 'placeholder'),
                                ('data-t-aria', 'aria-label', 'aria-label'),
                                ('data-t-titel', 'title', 'title')):
            if attr in d:
                self.paare.append((d[attr], d.get(name, ''), art, z))
        if tag not in ('br', 'hr', 'img', 'input', 'meta', 'link', 'source'):
            self.stapel.append([tag, d.get('data-t'), d.get('data-t-teil'), [], z])

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'svg') and self.stumm:
            self.stumm -= 1
        for i in range(len(self.stapel) - 1, -1, -1):
            if self.stapel[i][0] == tag:
                el = self.stapel.pop(i)
                self.abschluss(el)
                break

    def abschluss(self, el):
        tag, schluessel, teil, knoten, z = el
        if schluessel:
            self.paare.append((schluessel, ' '.join(k.strip() for k in knoten).strip(), 'Text', z))
        if teil:
            for paar in teil.split('|'):
                idx, s = paar.split(':', 1)
                if int(idx) >= len(knoten):
                    self.teil_fehler.append((s, int(idx), len(knoten), z))
                else:
                    self.paare.append((s, knoten[int(idx)].strip(), 'Textknoten', z))

    def handle_data(self, daten):
        if self.stumm or not self.stapel or not daten.strip():
            return
        self.stapel[-1][3].append(daten)


def main():
    html, app, quelle = lies(HTML), lies(APP), lies(KATALOG)
    katalog = katalog_lesen(quelle)
    ausnahmen = set(re.findall(r'texte-ok:\s*\S+\s*\|\s*(\S+)', quelle))

    p = Leser()
    p.feed(html)

    fehler = []
    benutzt = set()

    # 1 + 2: HTML gegen Katalog
    for schluessel, text, art, z in p.paare:
        benutzt.add(schluessel)
        if schluessel not in katalog:
            fehler.append(f'{HTML}:{z}  {art}: Schluessel fehlt im Katalog: {schluessel}')
        elif katalog[schluessel] != text and schluessel not in ausnahmen:
            fehler.append(f'{HTML}:{z}  {art}: Text weicht ab ({schluessel})\n'
                          f'        HTML:    {text!r}\n        Katalog: {katalog[schluessel]!r}')

    # 5: Indizes in data-t-teil
    for schluessel, idx, anzahl, z in p.teil_fehler:
        fehler.append(f'{HTML}:{z}  data-t-teil zeigt auf Textknoten {idx}, '
                      f'es gibt nur {anzahl} ({schluessel})')

    # 3: t()/tf() in app.js
    for m in re.finditer(r"\bt[f]?\(\s*'((?:[^'\\]|\\.)*)'", app):
        s = m.group(1)
        benutzt.add(s)
        if s not in katalog:
            z = app[:m.start()].count('\n') + 1
            fehler.append(f'{APP}:{z}  t(): Schluessel fehlt im Katalog: {s}')

    # 4: unbenutzte Schluessel
    verwaist = sorted(set(katalog) - benutzt)
    for s in verwaist:
        fehler.append(f'{KATALOG}  unbenutzter Schluessel: {s}')

    if fehler:
        print(f'{len(fehler)} Befund(e):\n')
        for f in fehler:
            print('  ' + f)
        sys.exit(1)

    aus_html = {s for s, *_ in p.paare}
    print(f'{len(katalog)} Schluessel geprueft: {len(p.paare)} Fundstellen im HTML, '
          f'{len(benutzt - aus_html)} Aufrufe in app.js.')
    print('In Ordnung: Katalog und Oberflaeche decken sich, keine Karteileichen.')


if __name__ == '__main__':
    main()

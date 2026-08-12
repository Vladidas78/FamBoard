#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Butley — dritter statischer Pruefer, neben pruefe-verweise.py und pruefe-stil.py.

Er haelt public/js/texte.js, public/index.html und public/js/app.js in Deckung.
Dieselbe Aufgabe wie pruefe-verweise.py, nur fuer Texte statt fuer IDs.

Fuenf Regeln, alle aus echten Vorfaellen beim Bau von C1:

1. Jeder Schluessel im HTML steht im Katalog.
   Sonst schreibt uebersetzeSeite() den Schluesselnamen auf den Bildschirm.

0. Der Name txt ist reserviert und darf nirgends als Bezeichner stehen.
   Die Funktion heisst nicht t, weil `t` in app.js seit dem Kalender fuer einen
   Termin steht - an 28 Stellen, als Parameter in werText(t), werPunkte(t),
   terminAmTag(t) und in einem Dutzend map(t=>...). Der erste Anlauf von C1b
   hat genau dort t('schluessel') eingesetzt, und der Kalender baute sein
   Raster nicht mehr auf. Wird txt eines Tages als Variablenname benutzt,
   passiert dasselbe still wieder - deshalb diese Regel.

2. Der Text im HTML ist zeichengleich mit dem Text im Katalog.
   Das HTML traegt den deutschen Text weiterhin (erster Frame, Rueckfall ohne
   Modul). Zwei Orte fuer denselben Satz laufen auseinander, sobald jemand nur
   einen davon anfasst - dieselbe Falle wie bei K-13. Diese Regel schliesst sie.

3. Jeder txt(...)-Aufruf in app.js hat einen Eintrag.
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

6. Der Rest ist gedeckelt.
   C1b hat die Zeichenketten uebersetzt, die vollstaendig Text sind. Was in
   einem zusammengesetzten HTML-Fragment steckt ('<p class="x">Text</p>'),
   blieb stehen: Das herauszuschneiden hiesse, die Zeichenroutinen umzubauen,
   und das ist ein eigener Schritt. Diese Regel haelt die Luecke fest, statt
   sie zu vergessen (Betriebsregel 19) - wer neuen harten Text in app.js
   schreibt, laesst den Pruefer anschlagen.

Ausnahmen bekommen /* texte-ok: <Grund> */ in die Zeile.
"""

# Stand nach C1b. Gezaehlt wird jede deutsche Zeichenkette in app.js ausserhalb
# von Kommentaren, die keinen Schluessel hat - also auch die bewusst nicht
# uebersetzten: CAT_KEYWORDS, NUTRITION_DB, SEED_RECIPES, IRREGULAR, die
# Excel-Spaltennamen und die Texte, die in HTML-Fragmenten stecken.
# Wird die Zahl kleiner, hier nachziehen. Wird sie groesser, ist harter Text
# dazugekommen - dann entweder einen Schluessel vergeben oder die Zahl bewusst
# erhoehen. Beides ist eine Entscheidung, kein Versehen.
REST_ERWARTET = 431
import re, sys
from html.parser import HTMLParser

HTML = 'public/index.html'
APP = 'public/js/app.js'
KATALOG = 'public/js/texte.js'


def lies(p):
    return open(p, encoding='utf-8').read()


def zaehle_rest(app):
    """Deutsche Zeichenketten in app.js, die keinen Schluessel haben. Zaehlt nur,
       was ausserhalb von Kommentaren steht und wie Text fuer Menschen aussieht."""
    zeilen = app.split('\n')
    komm, blk = set(), False
    for i, z in enumerate(zeilen, 1):
        t = z.strip()
        if blk:
            komm.add(i)
            if '*/' in z:
                blk = False
            continue
        if t.startswith('//'):
            komm.add(i)
        elif '/*' in z and '*/' not in z:
            blk = True
            komm.add(i)
        elif t.startswith('/*'):
            komm.add(i)
    n = 0
    for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"", app):
        s = m.group(1) if m.group(1) is not None else m.group(2)
        if app[:m.start()].count('\n') + 1 in komm:
            continue
        if len(s) < 2 or not re.search(r'[A-Za-zAeOeUeaeoeuess\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df]', s):
            continue
        if not (re.search(r'[\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df]', s)
                or (' ' in s.strip() and re.search(r'[a-z] [a-zA-Z0-9\u00c4\u00d6\u00dc]', s))):
            continue
        n += 1
    return n


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

    # 0: txt als Bezeichner
    for m in re.finditer(r'\b(?:const|let|var|function)\s+txt\b|\(\s*txt\s*[,)]|\btxt\s*=>', app):
        z = app[:m.start()].count('\n') + 1
        fehler.append(f'{APP}:{z}  txt wird als Bezeichner benutzt: {m.group(0).strip()!r} '
                      f'- der Name ist fuer die Textfunktion reserviert')

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
    for m in re.finditer(r"\btxtf?\(\s*'((?:[^'\\]|\\.)*)'", app):
        s = m.group(1)
        benutzt.add(s)
        if s not in katalog:
            z = app[:m.start()].count('\n') + 1
            fehler.append(f'{APP}:{z}  t(): Schluessel fehlt im Katalog: {s}')

    # 6: Deckel fuer den nicht umgestellten Rest
    rest = zaehle_rest(app)
    if rest > REST_ERWARTET:
        fehler.append(f'{APP}  {rest - REST_ERWARTET} neue deutsche Zeichenkette(n) ohne '
                      f'Schluessel (erwartet hoechstens {REST_ERWARTET}, gezaehlt {rest})')

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

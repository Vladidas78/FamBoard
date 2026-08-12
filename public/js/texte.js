/* Butley — Sprachdatei (T-4, Kapitel 3.8)

   Die Struktur, nicht die Übersetzung: Ausgeliefert wird nur Deutsch. Was hier
   steht, ist der vollständige deutsche Bestand an Oberflächentexten — eine
   Stelle statt fünfhundert. Eine weitere Sprache ist ein zweiter Block unter
   TEXTE und sonst nichts.

   Drei Dinge stehen bewusst NICHT hier, weil sie je Sprache neu gebaut werden
   müssen und keine Übersetzung sind (Kapitel 3.8):
     CAT_KEYWORDS   Zuordnung Artikel -> Abteilung, deutsche Wortstämme
     NUTRITION_DB   Nährwerttabelle mit deutschen Lebensmittelnamen
     Import-Prompts die Anweisungen an das Modell in src/import-recipe.js
   Sie bleiben, wo sie sind. Ein Sprachpaket ohne sie ist unvollständig — das
   ist der Grund, warum O-12 Stufe 2 ist und nicht hier mitläuft.

   Fehlt ein Schlüssel, erscheint der Schlüssel selbst auf dem Bildschirm und
   eine Meldung in der Konsole. Das ist Absicht: Ein stiller Rückfall auf
   Deutsch würde eine unvollständige Übersetzung unsichtbar machen
   (Betriebsregel 13 — eine Prüfung, die nie anschlägt, ist schlimmer als
   keine). Statisch abgesichert ist es durch pruefe-texte.py.

   Der deutsche Text steht zusätzlich weiterhin im HTML. Nicht als zweite
   Wahrheit, sondern damit der erste Frame nicht leer ist und die App auch
   dann lesbar bleibt, wenn dieses Modul nicht lädt. pruefe-texte.py hält
   beide zeichengleich — dieselbe Bauart wie pruefe-verweise.py für IDs. */

export const SPRACHEN = ['de'];
export const VORGABE = 'de';

export const TEXTE = {
  de: {
    /* --- Anmeldung und Haushaltsübernahme --- */
    'anmeldung.anmelden': 'Anmelden',
    'anmeldung.du_beispiel_de': 'du@beispiel.de',
    'anmeldung.e_mail': 'E-Mail',
    'anmeldung.haushalts_id_hier_uebernehmen': 'Haushalts-ID hier übernehmen, sonst leer lassen',
    'anmeldung.mein_haushalt': 'Mein Haushalt',
    'anmeldung.meldet_euch_an_um': 'Meldet euch an, um euren Haushalt zu sehen',
    'anmeldung.mind_6_zeichen': 'mind. 6 Zeichen',
    'anmeldung.mit_google_anmelden': '🔵 Mit Google anmelden',
    'anmeldung.name_eures_neuen_haushalts': 'Name eures neuen Haushalts',
    'anmeldung.oder': 'oder',
    'anmeldung.optional_nur_falls_oben': 'optional, nur falls oben keine ID eingetragen ist',
    'anmeldung.passwort': 'Passwort',
    'anmeldung.passwort_vergessen': 'Passwort vergessen?',
    'anmeldung.registrieren': 'Registrieren',
    'anmeldung.schon_famboard_genutzt': 'Schon FamBoard genutzt?',
    'anmeldung.z_b_hh_xxxxxxxxxxxxxxxxxxxx': 'z. B. hh-xxxxxxxxxxxxxxxxxxxx',

    /* --- Kopfzeile --- */
    'kopfzeile.0_von_0_offen': '0 von 0 offen',
    'kopfzeile.einkauf': 'Einkauf',
    'kopfzeile.einstellungen': 'Einstellungen',
    'kopfzeile.essen': 'Essen',
    'kopfzeile.haushalt': 'Haushalt',
    'kopfzeile.heute': 'Heute',
    'kopfzeile.kalender': 'Kalender',
    'kopfzeile.konto_und_einstellungen': 'Konto und Einstellungen',
    'kopfzeile.liste': 'Liste',
    'kopfzeile.liste_loeschen': 'Liste löschen',
    'kopfzeile.liste_umbenennen': 'Liste umbenennen',
    'kopfzeile.notizen': 'Notizen',
    'kopfzeile.weiter': 'Weiter',
    'kopfzeile.zu_heute': 'Zu heute',
    'kopfzeile.zurueck': 'Zurück',
    'kopfzeile.zurueck_zur_uebersicht': 'Zurück zur Übersicht',

    /* --- Navigation --- */
    'navigation.artikel': 'Artikel',
    'navigation.einkauf': 'Einkauf',
    'navigation.essen': 'Essen',
    'navigation.heute': 'Heute',
    'navigation.kalender': 'Kalender',
    'navigation.liste': 'Liste',
    'navigation.naehrwerte': 'Nährwerte',
    'navigation.notizen': 'Notizen',
    'navigation.rezepte': 'Rezepte',
    'navigation.woche': 'Woche',

    /* --- Heute --- */
    'heute.einkauf': 'Einkauf',
    'heute.faellige_aufgaben': 'Fällige Aufgaben',
    'heute.ganze_liste': 'Ganze Liste',
    'heute.kalender': 'Kalender',
    'heute.mehr_steht_heute_nicht': 'Mehr steht heute nicht an.',
    'heute.notizen': 'Notizen',
    'heute.termine': 'Termine',
    'heute.was_es_heute_gibt': 'Was es heute gibt',
    'heute.wochenplan': 'Wochenplan',

    /* --- Kalender --- */
    'kalender.aenderung_gilt_fuer': 'Änderung gilt für',
    'kalender.bis': 'Bis',
    'kalender.datum': 'Datum',
    'kalender.ein_abo_link_fuer': 'Ein Abo-Link für den ganzen Haushalt. Apple holt ihn je nach Einstellung alle paar Minuten, Google alle 8 bis 24 Stunden. Einseitig — was ihr dort ändert, kommt nicht zurück (K-10).',
    'kalender.ganztaegig': 'Ganztägig',
    'kalender.hallenbad_nord': 'Hallenbad Nord',
    'kalender.in_anderen_kalender_uebernehmen': 'In anderen Kalender übernehmen',
    'kalender.link_erzeugen': '🔗 Link erzeugen',
    'kalender.link_zurueckziehen': 'Link zurückziehen',
    'kalender.loeschen': 'Löschen',
    'kalender.monat': 'Monat',
    'kalender.neuer_termin': 'Neuer Termin',
    'kalender.optional': 'optional',
    'kalender.ort': 'Ort',
    'kalender.schliessen': 'Schließen',
    'kalender.speichern': 'Speichern',
    'kalender.termin_anlegen': 'Termin anlegen',
    'kalender.von': 'Von',
    'kalender.was': 'Was',
    'kalender.wer': 'Wer',
    'kalender.wiederholung': 'Wiederholung',
    'kalender.woche': 'Woche',
    'kalender.z_b_elternabend_klasse': 'z. B. Elternabend Klasse 4b',

    /* --- Essen — Woche, Rezepte, Nährwerte --- */
    'essen.400_g_haehnchenbrust_200': '400 g Hähnchenbrust; 200 g Reis; 300 g Brokkoli; 2 EL Sojasauce',
    'essen.alles_ersetzen': 'Alles ersetzen',
    'essen.ausfuehrlich': 'Ausführlich',
    'essen.auswertung_auf_basis_der': 'Auswertung auf Basis der im Wochenplan eingetragenen Rezepte. „Gesamt“ ist die\n          Summe für den ganzen Haushalt an dem Tag. Trag bei „Portionen an diesem Tag“ ein, wie viele Portionen\n          du selbst isst — manche Tage sind das zwei, manche nur eine — die Werte „bei deinen Portionen“ rechnen\n          damit. Snacks zählen mit, sobald für sie Nährwerte hinterlegt sind — ohne Werte bleiben sie bei null.',
    'essen.beschreibung': 'Beschreibung',
    'essen.beschreibung_zubereitung': 'Beschreibung / Zubereitung',
    'essen.bild': 'Bild',
    'essen.bild_waehlen': '📷 Bild wählen',
    'essen.das_ergebnis_landet_zur': 'Das Ergebnis landet zur Kontrolle im Formular „Neues Rezept" — geprüft wird vor dem Speichern.',
    'essen.datei_importieren': '⬆ Datei importieren',
    'essen.die_spalte': 'Die Spalte',
    'essen.diese_woche_komplett_zuruecksetzen': '🗑 Diese Woche komplett zurücksetzen',
    'essen.einzeln_zutat_menge_einheit': '— einzeln: Zutat · Menge · Einheit',
    'essen.eiweiss': 'Eiweiß',
    'essen.eiweiss_g': 'Eiweiß (g)',
    'essen.enthaelt_alle_zutaten_in': 'enthält alle Zutaten in einer Zelle, getrennt durch Semikolon:',
    'essen.ergaenzen': 'Ergänzen',
    'essen.essen': 'Essen',
    'essen.excel': '⇄ Excel',
    'essen.excel_import_export': 'Excel-Import & Export',
    'essen.favoriten': '★ Favoriten',
    'essen.fett': 'Fett',
    'essen.fett_g': 'Fett (g)',
    'essen.foto': 'Foto',
    'essen.foto_vom_rezept': 'Foto vom Rezept',
    'essen.foto_waehlen': '📷 Foto wählen',
    'essen.ganze_woche_fuellen': '🎲 Ganze Woche füllen',
    'essen.gleiche_namen_werden_aktualisiert': '(gleiche Namen werden aktualisiert)',
    'essen.high_protein_low_carb': 'High Protein, Low Carb, Vegetarisch …',
    'essen.https': 'https://…',
    'essen.ist_entweder': 'ist entweder',
    'essen.kcal': 'kcal',
    'essen.kh_g': 'KH (g)',
    'essen.kohlenhydrate': 'Kohlenhydrate',
    'essen.kurz_notieren_wie_s': 'Kurz notieren, wie\'s gemacht wird …',
    'essen.kw': 'KW —',
    'essen.link': 'Link',
    'essen.link_zur_rezeptseite_oder': 'Link zur Rezeptseite oder zum Video',
    'essen.mahlzeiten': 'Mahlzeiten',
    'essen.menge_und_einheit_werden': 'Menge und Einheit werden automatisch erkannt (g, kg, ml, l, Stk, EL, TL, Bund, Dose, Zehe …). Steht keine Einheit da, wird „Stk“ angenommen.',
    'essen.mengen_fuer': 'Mengen für',
    'essen.naechste_woche': 'Nächste Woche',
    'essen.naehrwerte': 'Nährwerte',
    'essen.naehrwerte_aus_zutaten_berechnen': '🧮 Nährwerte aus Zutaten berechnen',
    'essen.name': 'Name',
    'essen.neues_rezept': 'Neues Rezept',
    'essen.oder': 'oder',
    'essen.ohne_zubereitung_und_bild': '— ohne Zubereitung und Bild',
    'essen.optional': '— optional',
    'essen.optional_mit_komma_trennen': '— optional, mit Komma trennen',
    'essen.personen': '— Personen',
    'essen.pfeile_oder_wischen_auf': 'Pfeile ‹ › oder Wischen auf der Leiste wechseln die Woche',
    'essen.portionen': 'Portionen',
    'essen.rezept': 'Rezept',
    'essen.rezept_einlesen': 'Rezept einlesen',
    'essen.rezept_importieren': '🤖 Rezept importieren',
    'essen.rezept_importieren_2': 'Rezept importieren',
    'essen.rezept_oder_zutat_suchen': '🔍 Rezept oder Zutat suchen …',
    'essen.rezept_speichern': 'Rezept speichern',
    'essen.rezepte': 'Rezepte',
    'essen.rezepte_exportieren': '⬇ Rezepte exportieren',
    'essen.rezeptseiten_tiktok_und_youtube': 'Rezeptseiten, TikTok und YouTube (auch Shorts). Bei Videos wird gelesen, was\n          in der Beschreibung steht — Gesprochenes im Video nicht. Instagram lässt sich nicht auslesen: dort die Caption\n          kopieren und „Text einfügen" nehmen.',
    'essen.rezepttext': 'Rezepttext',
    'essen.sagt_fuer_wie_viele': 'sagt, für wie viele Personen die Mengen gelten. Fehlt die Spalte, rechnet die App mit 4.',
    'essen.schliessen': 'Schließen',
    'essen.schnell_anlegen': '+ Schnell anlegen',
    'essen.snack': 'Snack',
    'essen.snacks_brauchen_nur_name': '. Snacks brauchen nur Name und Zutaten und erscheinen im Snack-Feld des Wochenplans. Nährwertspalten werden auch bei Snacks übernommen und zählen dann in der Auswertung mit. Fehlt die Spalte, gilt alles als Rezept.',
    'essen.spalten_der_datei': 'Spalten der Datei',
    'essen.tag_waehlen': 'Tag wählen',
    'essen.tags': 'Tags',
    'essen.text_einfuegen': 'Text einfügen',
    'essen.typ': 'Typ',
    'essen.vorige_woche': 'Vorige Woche',
    'essen.vorlage_herunterladen': '📄 Vorlage herunterladen',
    'essen.was_ihr_nicht_plant': 'Was ihr nicht plant, schaltet ihr hier ab. Die Personenzahl gilt als Vorgabe für neue Einträge und lässt sich pro Tag ändern.',
    'essen.woche': 'Woche',
    'essen.woche_gesamt': 'Woche gesamt',
    'essen.z_b_aus_einem': '— z. B. aus einem Kochbuch',
    'essen.z_b_ofengemuese_mit': 'z. B. Ofengemüse mit Feta',
    'essen.zur_aktuellen_woche': 'Zur aktuellen Woche',
    'essen.zutat': '+ Zutat',
    'essen.zutaten': 'Zutaten',
    'essen.zutaten_und_zubereitung_reinkopieren': 'Zutaten und Zubereitung reinkopieren …',

    /* --- Einkauf — Liste und Artikel --- */
    'einkauf.abteilungen_sortieren': 'Abteilungen sortieren',
    'einkauf.alle_auch_rezeptzutaten': 'Alle, auch Rezeptzutaten',
    'einkauf.antippen_waehlt_aus_mehrere': 'Antippen wählt aus, mehrere gehen zusammen auf die Liste. Das (+) setzt einen einzelnen sofort drauf.',
    'einkauf.artikel': 'Artikel',
    'einkauf.artikel_suchen_oder_anlegen': '🔍 Artikel suchen oder anlegen',
    'einkauf.auf_die_liste': 'Auf die Liste',
    'einkauf.aufheben': 'Aufheben',
    'einkauf.drogerie_haushalt': 'Drogerie & Haushalt',
    'einkauf.einkauf': 'Einkauf',
    'einkauf.einkaufsliste': 'Einkaufsliste',
    'einkauf.fuer_diese_woche_ist': 'Für diese Woche ist noch nichts geplant.',
    'einkauf.lebensmittel': 'Lebensmittel',
    'einkauf.liste': 'Liste',
    'einkauf.liste_zuruecksetzen': 'Liste zurücksetzen',
    'einkauf.meine_artikel': 'Meine Artikel',
    'einkauf.name_antippen_aendert_die': 'Name antippen ändert die Abteilung · Menge antippen passt sie an',
    'einkauf.reihenfolge_in_der_die': 'Reihenfolge, in der die Abteilungen in der Einkaufsliste erscheinen — passt sie an euren Supermarkt an.',
    'einkauf.teilen': '📤 Teilen',
    'einkauf.was_es_noch_nicht': 'Was es noch nicht gibt, wird beim Draufsetzen als Artikel angelegt — beim nächsten Mal steht es als Vorschlag da.',
    'einkauf.wischen_abhaken_loeschen': 'Wischen: → abhaken · ← löschen',

    /* --- Notizen --- */
    'notizen.eintrag_hinzufuegen': 'Eintrag hinzufügen',
    'notizen.liste_anlegen': 'Liste anlegen',

    /* --- Einstellungen --- */
    'einstellungen.abmelden': 'Abmelden',
    'einstellungen.aendern': 'Ändern',
    'einstellungen.aktiver_haushalt': 'Aktiver Haushalt',
    'einstellungen.anlegen': 'Anlegen',
    'einstellungen.auf_dem_iphone_nur': 'Auf dem iPhone nur vom Homescreen aus.',
    'einstellungen.aus': 'Aus',
    'einstellungen.beitreten': 'Beitreten',
    'einstellungen.darstellung': 'Darstellung',
    'einstellungen.darstellungsmodus': 'Darstellungsmodus',
    'einstellungen.dunkel': 'Dunkel',
    'einstellungen.e_mail': 'E-Mail',
    'einstellungen.einladungslink_erzeugen': '🔗 Einladungslink erzeugen',
    'einstellungen.erinnerungen_erreichen_dich_dort': 'Erinnerungen erreichen dich dort nur, wenn Butley auf dem Homescreen liegt: Teilen antippen, „Zum Home-Bildschirm“ wählen. Das ist eine Vorgabe von Apple, keine von uns.',
    'einstellungen.fuer_einen_zusaetzlichen_haushalt': 'Für einen zusätzlichen Haushalt, den ihr schon von früher kennt (Haushalts-ID, z. B.',
    'einstellungen.haushalt': 'Haushalt',
    'einstellungen.haushalt_loeschen': 'Haushalt löschen',
    'einstellungen.hell': 'Hell',
    'einstellungen.hh': 'hh-…',
    'einstellungen.hh_oder_einladungscode': 'hh-… oder Einladungscode',
    'einstellungen.ihr_gehoert_zu_mehreren': 'Ihr gehört zu mehreren Haushalten. Wählt, welchen ihr auf diesem Gerät seht.',
    'einstellungen.konto': 'Konto',
    'einstellungen.mitglieder_einladung': 'Mitglieder & Einladung',
    'einstellungen.modus': 'Modus',
    'einstellungen.name': 'Name',
    'einstellungen.neue_adresse_de': 'neue@adresse.de',
    'einstellungen.neues_passwort_mind_6': 'neues Passwort, mind. 6 Zeichen',
    'einstellungen.nur_hilfe': 'Nur Hilfe',
    'einstellungen.oder_um_einen_einladungscode': '), oder um einen Einladungscode einzulösen, den ihr per Nachricht bekommen habt.',
    'einstellungen.passwort_aendern': 'Passwort ändern',
    'einstellungen.personen': 'Personen',
    'einstellungen.so_heisst_euer_haushalt': 'So heißt euer Haushalt in der Übersicht und für alle Mitglieder.',
    'einstellungen.speichern': 'Speichern',
    'einstellungen.stufe_1': '· Stufe 1',
    'einstellungen.system': 'System',
    'einstellungen.systemvorgabe_ist_der_standard': 'Systemvorgabe ist der Standard, deine eigene Wahl gewinnt.',
    'einstellungen.vollstaendig': 'Vollständig',
    'einstellungen.weiterem_haushalt_beitreten': 'Weiterem Haushalt beitreten',
    'einstellungen.wer_den_einladungslink_oeffnet': 'Wer den Einladungslink öffnet und sich anmeldet, sieht Wochenplan und Einkaufsliste und kann beides ändern — also nur an Leute geben, die dazugehören.',
    'einstellungen.wer_zum_haushalt_gehoert': 'Wer zum Haushalt gehört — auch ohne eigenes Konto. Die Farbe taucht an Aufgaben und Terminen auf.',
    'einstellungen.wie_praesent_butley_ist': 'Wie präsent Butley ist',
    'einstellungen.wie_praesent_soll_er': 'Wie präsent soll er sein?',
    'einstellungen.wird_den_anderen_mitgliedern': 'Wird den anderen Mitgliedern angezeigt.',
    'einstellungen.z_b_familie_mueller': 'z. B. Familie Müller',
    'einstellungen.z_b_mila': 'z. B. Mila',
    'einstellungen.z_b_vladi': 'z. B. Vladi',

    /* --- Schnellanlegen (IA-9) --- */
    'schnellanlegen.2_haehnchenbrustfilet_4_scheiben': '2 Hähnchenbrustfilet\n4 Scheiben Sauerteigbrot\n2 EL Mayonnaise',
    'schnellanlegen.abbrechen': 'Abbrechen',
    'schnellanlegen.eine_pro_zeile': '— eine pro Zeile',
    'schnellanlegen.haehnchenbrustsandwich': 'Hähnchenbrustsandwich',
    'schnellanlegen.name': 'Name',
    'schnellanlegen.portionen_zubereitung_naehrwerte_und': 'Portionen, Zubereitung, Nährwerte und Bild sind optional. Ohne sie ist das Rezept trotzdem im Wochenplan wählbar, und die Zutaten wandern auf die Einkaufsliste.',
    'schnellanlegen.rezept_anlegen': 'Rezept anlegen',
    'schnellanlegen.schliessen': 'Schließen',
    'schnellanlegen.speichern': 'Speichern',
    'schnellanlegen.zutaten': 'Zutaten',

    /* --- Onboarding --- */
    'onboarding.laesst_sich_jederzeit_aendern': 'Lässt sich jederzeit ändern.',
    'onboarding.mein_haushalt': 'Mein Haushalt',
    'onboarding.name_des_haushalts': 'Name des Haushalts',
    'onboarding.ohne_homescreen_keine_erinnerungen': 'Ohne Homescreen keine Erinnerungen. Das ist eine Vorgabe von Apple, keine von mir.',
    'onboarding.ueberspringen': 'Überspringen',
    'onboarding.weiter': 'Weiter',

    /* --- Suchfenster --- */
    'suche.rezept_waehlen': 'Rezept wählen',
    'suche.schliessen': 'Schließen',
    'suche.suchen': '🔍 Suchen …',

    /* --- Meldungen und Rückgängig --- */
    'meldung.rueckgaengig': 'Rückgängig',

    /* --- Allgemein --- */
    'allgemein.bund': 'Bund',
    'allgemein.dose': 'Dose',
    'allgemein.el': 'EL',
    'allgemein.g': 'g',
    'allgemein.hauptbereiche': 'Hauptbereiche',
    'allgemein.kg': 'kg',
    'allgemein.l': 'l',
    'allgemein.ml': 'ml',
    'allgemein.packung': 'Packung',
    'allgemein.prise': 'Prise',
    'allgemein.scheibe': 'Scheibe',
    'allgemein.stk': 'Stk',
    'allgemein.tl': 'TL',
  },
};

let aktiv = VORGABE;
const gemeldet = new Set();

export function sprache() { return aktiv; }

/* Der Text zu einem Schlüssel. Kein zweites Argument mit deutschem Ersatz —
   sonst stünde der Text doch wieder an fünfhundert Stellen. */
export function t(schluessel) {
  const paket = TEXTE[aktiv] || TEXTE[VORGABE];
  const wert = paket[schluessel];
  if (wert === undefined) {
    if (!gemeldet.has(schluessel)) {
      gemeldet.add(schluessel);
      console.warn('[texte] kein Eintrag für', schluessel, '(' + aktiv + ')');
    }
    return schluessel;
  }
  return wert;
}

/* Platzhalter {name} füllen: t2('einkauf.x_von_y', {x:3, y:7}).
   Bewusst keine Zeichenkettenverkettung im Aufrufer — die Wortstellung ist in
   anderen Sprachen eine andere, und genau daran scheitern zusammengesetzte
   Sätze. */
export function tf(schluessel, werte) {
  return t(schluessel).replace(/\{(\w+)\}/g, (ganz, name) =>
    (werte && werte[name] !== undefined) ? werte[name] : ganz);
}

export function setzeSprache(code) {
  if (!TEXTE[code]) return false;
  aktiv = code;
  document.documentElement.lang = code;
  uebersetzeSeite();
  return true;
}

/* Schreibt alle ausgezeichneten Stellen aus dem Katalog neu.

   Läuft auch für Deutsch, obwohl das HTML bereits deutsch ist. Das ist der
   Selbsttest: Deckt der Katalog eine Stelle nicht, steht der Schlüssel
   danach sichtbar im Bild — und der Prüfstand zeigt es beim nächsten Lauf.
   Ohne diesen Durchlauf fiele ein Loch erst bei der ersten Übersetzung auf,
   also frühestens in Stufe 2. */
export function uebersetzeSeite(wurzel) {
  const w = wurzel || document;
  w.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  w.querySelectorAll('[data-t-ph]').forEach(el => { el.placeholder = t(el.dataset.tPh); });
  w.querySelectorAll('[data-t-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.tAria));
  });
  w.querySelectorAll('[data-t-titel]').forEach(el => {
    el.setAttribute('title', t(el.dataset.tTitel));
  });

  /* Elemente, die Text UND Kindelemente enthalten. Hier kann textContent
     nicht gesetzt werden — das löschte die Kinder. Ein <span> um den Text
     wäre der bequeme Weg, erzeugt aber eine eigene Inline-Box: Die Glyphen
     landen auf anderen Subpixeln, und acht der 48 Prüfbilder änderten sich,
     ohne dass sich etwas geändert hätte. Deshalb wird der Textknoten selbst
     beschrieben, mitsamt dem Leerraum, der ihn umgibt — der trägt bei
     Inline-Elementen den Wortabstand. */
  w.querySelectorAll('[data-t-teil]').forEach(el => {
    const knoten = [...el.childNodes].filter(k => k.nodeType === 3 && k.nodeValue.trim());
    el.dataset.tTeil.split('|').forEach(paar => {
      const [i, schluessel] = paar.split(':');
      const k = knoten[+i];
      if (!k) return;
      const vor = k.nodeValue.match(/^\s*/)[0];
      const nach = k.nodeValue.match(/\s*$/)[0];
      k.nodeValue = vor + t(schluessel) + nach;
    });
  });
}

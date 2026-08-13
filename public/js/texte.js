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
    'anmeldung.anmeldung_abgebrochen': 'Anmeldung abgebrochen.',
    'anmeldung.anmeldung_fehlgeschlagen': 'Anmeldung fehlgeschlagen (',
    'anmeldung.auf_diesem_geraet_abmelden': 'Auf diesem Gerät abmelden?',
    'anmeldung.bitte_e_mail_und_passwort': 'Bitte E-Mail und Passwort eingeben.',
    'anmeldung.bitte_ein_passwort_eingeben': 'Bitte ein Passwort eingeben.',
    'anmeldung.das_passwort_muss_mindestens_6': 'Das Passwort muss mindestens 6 Zeichen haben.',
    'anmeldung.diese_anmeldeart_ist_in_firebase': 'Diese Anmeldeart ist in Firebase noch nicht aktiviert.',
    'anmeldung.du_beispiel_de': 'du@beispiel.de',
    'anmeldung.e_mail': 'E-Mail',
    'anmeldung.e_mail_adresse_oben_eintragen': 'E-Mail-Adresse oben eintragen, dann nochmal klicken.',
    'anmeldung.e_mail_oder_passwort_stimmt': 'E-Mail oder Passwort stimmt nicht.',
    'anmeldung.einladung_konnte_nicht_eingeloest_werden': 'Einladung konnte nicht eingelöst werden.',
    'anmeldung.einladungslink_ist_ungueltig_oder_schon': 'Einladungslink ist ungültig oder schon abgelaufen.',
    'anmeldung.einstellungen_konnten_nicht_gezeichnet_werden': 'Einstellungen konnten nicht gezeichnet werden:',
    'anmeldung.fuer_diese_e_mail_gibt': 'Für diese E-Mail gibt es schon ein Konto — oben auf „Anmelden“ wechseln.',
    'anmeldung.haushalt_konnte_nicht_geladen_werden': 'Haushalt konnte nicht geladen werden (',
    'anmeldung.ihr_folgt_einem_einladungslink_meldet': 'Ihr folgt einem Einladungslink — meldet euch an oder erstellt ein Konto, um dem Haushalt beizutreten.',
    'anmeldung.kein_konto_mit_dieser_e': 'Kein Konto mit dieser E-Mail gefunden.',
    'anmeldung.keine_verbindung_netz_pruefen_und': 'Keine Verbindung. Netz prüfen und nochmal versuchen.',
    'anmeldung.link_zum_passwort_zuruecksetzen_ist': 'Link zum Passwort-Zurücksetzen ist unterwegs — E-Mail-Postfach prüfen.',
    'anmeldung.mein_haushalt': 'Mein Haushalt',
    'anmeldung.meldet_euch_an_um': 'Meldet euch an, um euren Haushalt zu sehen',
    'anmeldung.mind_6_zeichen': 'mind. 6 Zeichen',
    'anmeldung.mit_google_anmelden': '🔵 Mit Google anmelden',
    'anmeldung.mitgliederliste_konnte_nicht_gezeichnet_werden': 'Mitgliederliste konnte nicht gezeichnet werden:',
    'anmeldung.oder': 'oder',
    'anmeldung.offline_aenderungen_werden_nachgereicht_sobald': 'Offline — Änderungen werden nachgereicht, sobald ihr wieder Netz habt',
    'anmeldung.passwort': 'Passwort',
    'anmeldung.passwort_vergessen': 'Passwort vergessen?',
    'anmeldung.registrieren': 'Registrieren',
    'anmeldung.texte_seite_nicht_uebersetzt': '[texte] Seite nicht übersetzt:',
    'anmeldung.ungueltige_e_mail_adresse': 'Ungültige E-Mail-Adresse.',
    'anmeldung.zu_viele_versuche_kurz_warten': 'Zu viele Versuche — kurz warten und nochmal probieren.',

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
    'navigation.abends_auswaerts': 'abends auswärts',
    'navigation.alles_bereit': 'Alles bereit.',
    'navigation.artikel': 'Artikel',
    'navigation.aufgaben_auf_heute': 'Aufgaben auf Heute:',
    'navigation.beigetreten_ihr_seht_jetzt': 'Beigetreten — ihr seht jetzt „',
    'navigation.beitreten_fehlgeschlagen': 'Beitreten fehlgeschlagen (',
    'navigation.bitte_eine_haushalts_id_oder': 'Bitte eine Haushalts-ID oder einen Einladungscode eingeben.',
    'navigation.bitte_kurz_warten_bis_die': 'Bitte kurz warten, bis die Anmeldung fertig ist.',
    'navigation.bring_mit_was_du_schon': 'Bring mit, was du schon hast.',
    'navigation.du_landest_jetzt_auf_heute': 'Du landest jetzt auf „Heute“. Dort steht, was ansteht — und wenn nichts ansteht, steht dort nichts.',
    'navigation.ein_haushalt_ist_der_gemeinsame': 'Ein Haushalt ist der gemeinsame Ort. Du kannst später in mehreren sein und jederzeit wechseln.',
    'navigation.eine_sache_noch_wenn_du': 'Eine Sache noch, wenn du ein iPhone hast.',
    'navigation.einkauf': 'Einkauf',
    'navigation.erinnerungen_erreichen_dich_auf_dem': 'Erinnerungen erreichen dich auf dem iPhone nur, wenn Butley auf dem Homescreen liegt. Teilen antippen, „Zum Home-Bildschirm“ wählen — das war es.',
    'navigation.erzeuge_link': 'Erzeuge Link …',
    'navigation.essen': 'Essen',
    'navigation.fangen_wir_an': 'Fangen wir an',
    'navigation.fangen_wir_mit_dem_haushalt': 'Fangen wir mit dem Haushalt an.',
    'navigation.gut_zu_wissen': 'Gut zu wissen',
    'navigation.heute': 'Heute',
    'navigation.ich_bin_butley_ich_halte': 'Ich bin Butley. Ich halte zusammen, was in deinem Haushalt anliegt — Termine, Essen, Einkauf und alles, was aufgeschrieben werden will.',
    'navigation.kalender': 'Kalender',
    'navigation.konnte_keinen_einladungslink_erzeugen': 'Konnte keinen Einladungslink erzeugen (',
    'navigation.kopiert_auf_dem_anderen_geraet': 'Kopiert. Auf dem anderen Gerät öffnen, dort ein Konto erstellen oder anmelden — tritt danach automatisch diesem Haushalt bei.',
    'navigation.liste': 'Liste',
    'navigation.naehrwerte': 'Nährwerte',
    'navigation.notizen': 'Notizen',
    'navigation.ohne_namen_laesst_sich_das': 'Ohne Namen lässt sich das Rezept später nicht wiederfinden.',
    'navigation.personen_brauchen_kein_eigenes_konto': 'Personen brauchen kein eigenes Konto. Kinder und Gäste bekommen einfach einen Namen und eine Farbe — anlegen kannst du sie jederzeit in den Einstellungen.',
    'navigation.pruefe': 'Prüfe …',
    'navigation.rezepte': 'Rezepte',
    'navigation.rezepte_musst_du_nicht_abtippen': 'Rezepte musst du nicht abtippen. Unter Essen lese ich eure Excel-Tabelle ein — oder du gibst mir einen Link, einen Text oder ein Foto, und ich hole das Rezept selbst heraus. Einkaufsartikel entstehen von allein, sobald du sie das erste Mal in die Liste tippst.',
    'navigation.sehr_erfreut': 'Sehr erfreut.',
    'navigation.termine_auf_heute': 'Termine auf Heute:',
    'navigation.vom_vortag': 'vom Vortag',
    'navigation.wer_gehoert_dazu': 'Wer gehört dazu?',
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
    'kalender.abo_link_erzeugt': 'Abo-Link erzeugt',
    'kalender.aendert_alle_termine_der_reihe': 'Ändert alle Termine der Reihe, auch die vergangenen. Das Datum verschiebt den Beginn.',
    'kalender.aenderung_gilt_fuer': 'Änderung gilt für',
    'kalender.alle_2_wochen': 'Alle 2 Wochen',
    'kalender.bis': 'Bis',
    'kalender.butley_unbekannte_rrule': 'Butley: unbekannte RRULE „',
    'kalender.datum': 'Datum',
    'kalender.der_bisherige_link_wird_ungueltig': 'Der bisherige Link wird ungültig. Alle, die den Kalender abonniert haben, müssen ihn neu einrichten. Fortfahren?',
    'kalender.die_reihe_bleibt_wie_sie': 'Die Reihe bleibt, wie sie ist — ',
    'kalender.die_serie_wird_im_kalender': '" — die Serie wird im Kalender nur an ihrem Starttag gezeigt, steht im ICS-Feed aber vollständig.',
    'kalender.eigene_wiederholung': 'Eigene Wiederholung',
    'kalender.ein_abo_link_fuer': 'Ein Abo-Link für den ganzen Haushalt. Apple holt ihn je nach Einstellung alle paar Minuten, Google alle 8 bis 24 Stunden. Einseitig — was ihr dort ändert, kommt nicht zurück (K-10).',
    'kalender.ein_datum_braucht_der_termin': 'Ein Datum braucht der Termin.',
    'kalender.ganze_reihe': 'Ganze Reihe',
    'kalender.ganztaegig': 'Ganztägig',
    'kalender.geloescht': '" gelöscht',
    'kalender.hallenbad_nord': 'Hallenbad Nord',
    'kalender.in_anderen_kalender_uebernehmen': 'In anderen Kalender übernehmen',
    'kalender.kopieren_ging_nicht_link_steht': 'Kopieren ging nicht — Link steht oben zum Markieren',
    'kalender.link_erzeugen': '🔗 Link erzeugen',
    'kalender.link_kopieren': '🔗 Link kopieren',
    'kalender.link_kopiert': 'Link kopiert',
    'kalender.link_zurueckziehen': 'Link zurückziehen',
    'kalender.loeschen': 'Löschen',
    'kalender.maerz': 'März',
    'kalender.monat': 'Monat',
    'kalender.neuer_link_erzeugt_der_alte': 'Neuer Link erzeugt, der alte ist ungültig',
    'kalender.neuer_termin': 'Neuer Termin',
    'kalender.nur_dieser_eine_termin_wird': '. Nur dieser eine Termin wird herausgelöst.',
    'kalender.nur_dieser_termin': 'Nur dieser Termin',
    'kalender.nur_dieser_termin_geaendert': 'Nur dieser Termin geändert',
    'kalender.ohne_bezeichnung_laesst_sich_der': 'Ohne Bezeichnung lässt sich der Termin nicht speichern.',
    'kalender.optional': 'optional',
    'kalender.ort': 'Ort',
    'kalender.schliessen': 'Schließen',
    'kalender.speichern': 'Speichern',
    'kalender.taeglich': 'Täglich',
    'kalender.termin_angelegt': 'Termin angelegt',
    'kalender.termin_anlegen': 'Termin anlegen',
    'kalender.von': 'Von',
    'kalender.was': 'Was',
    'kalender.wer': 'Wer',
    'kalender.wiederholung': 'Wiederholung',
    'kalender.woche': 'Woche',
    'kalender.woechentlich': 'Wöchentlich',
    'kalender.z_b_elternabend_klasse': 'z. B. Elternabend Klasse 4b',

    /* --- Essen — Woche, Rezepte, Nährwerte --- */
    'essen.400_g_haehnchenbrust_200': '400 g Hähnchenbrust; 200 g Reis; 300 g Brokkoli; 2 EL Sojasauce',
    'essen.aenderungen_speichern': 'Änderungen speichern',
    'essen.alle_eintraege_im_wochenplan_fuer': 'Alle Einträge im Wochenplan für KW ',
    'essen.alles_abgehakt_oder_ausgeschlossen_schoene': 'Alles abgehakt oder ausgeschlossen. Schöne Woche.',
    'essen.alles_ersetzen': 'Alles ersetzen',
    'essen.als_favorit_markieren': 'Als Favorit markieren',
    'essen.artikelstamm_konnte_nicht_gezeichnet_werden': 'Artikelstamm konnte nicht gezeichnet werden:',
    'essen.ausfuehrlich': 'Ausführlich',
    'essen.auswaerts': 'auswärts',
    'essen.auswertung_auf_basis_der': 'Auswertung auf Basis der im Wochenplan eingetragenen Rezepte. „Gesamt“ ist die\n          Summe für den ganzen Haushalt an dem Tag. Trag bei „Portionen an diesem Tag“ ein, wie viele Portionen\n          du selbst isst — manche Tage sind das zwei, manche nur eine — die Werte „bei deinen Portionen“ rechnen\n          damit. Snacks zählen mit, sobald für sie Nährwerte hinterlegt sind — ohne Werte bleiben sie bei null.',
    'essen.beispiel_haehnchen_mit_reis': 'Beispiel: Hähnchen mit Reis',
    'essen.beschreibung': 'Beschreibung',
    'essen.beschreibung_zubereitung': 'Beschreibung / Zubereitung',
    'essen.bild': 'Bild',
    'essen.bild_hochladen': 'Bild hochladen',
    'essen.bild_waehlen': '📷 Bild wählen',
    'essen.bild_wird_verarbeitet': 'Bild wird verarbeitet …',
    'essen.bitte_kurz_warten_bis_die': 'Bitte kurz warten, bis die Anmeldung fertig ist.',
    'essen.das_bild_liess_sich_nicht': 'Das Bild ließ sich nicht laden. Versuch ein anderes Format.',
    'essen.das_ergebnis_landet_zur': 'Das Ergebnis landet zur Kontrolle im Formular „Neues Rezept" — geprüft wird vor dem Speichern.',
    'essen.das_foto_liess_sich_nicht': 'Das Foto ließ sich nicht laden. Versuch ein anderes Format.',
    'essen.datei_importieren': '⬆ Datei importieren',
    'essen.datei_wird_gelesen': 'Datei wird gelesen …',
    'essen.die_datei_enthaelt_keine_zeilen': 'Die Datei enthält keine Zeilen.',
    'essen.die_datei_liess_sich_nicht': 'Die Datei ließ sich nicht lesen: ',
    'essen.die_excel_bibliothek_fehlt_lade': 'Die Excel-Bibliothek fehlt. Lade die Seite neu, dann klappt es.',
    'essen.die_spalte': 'Die Spalte',
    'essen.diese_woche_ist_schon_leer': 'Diese Woche ist schon leer.',
    'essen.diese_woche_komplett_zuruecksetzen': '🗑 Diese Woche komplett zurücksetzen',
    'essen.einzeln_zutat_menge_einheit': '— einzeln: Zutat · Menge · Einheit',
    'essen.eiweiss': 'Eiweiß',
    'essen.eiweiss_g': 'Eiweiß (g)',
    'essen.entfernen_rezepte_selbst_bleiben_erhalten': ' entfernen? Rezepte selbst bleiben erhalten.',
    'essen.enthaelt_alle_zutaten_in': 'enthält alle Zutaten in einer Zelle, getrennt durch Semikolon:',
    'essen.ergaenzen': 'Ergänzen',
    'essen.erledigte_geleert': ' Erledigte geleert',
    'essen.erst_ein_foto_auswaehlen': 'Erst ein Foto auswählen.',
    'essen.erst_einen_link_eintragen': 'Erst einen Link eintragen.',
    'essen.erst_text_einfuegen': 'Erst Text einfügen.',
    'essen.erst_zutaten_eintragen_dann_berechnen': 'Erst Zutaten eintragen, dann berechnen.',
    'essen.es_gibt_noch_keine_rezepte': 'Es gibt noch keine Rezepte zum Exportieren.',
    'essen.essen': 'Essen',
    'essen.excel': '⇄ Excel',
    'essen.excel_import_export': 'Excel-Import & Export',
    'essen.favoriten': '★ Favoriten',
    'essen.fett': 'Fett',
    'essen.fett_g': 'Fett (g)',
    'essen.foto': 'Foto',
    'essen.foto_vom_rezept': 'Foto vom Rezept',
    'essen.foto_waehlen': '📷 Foto wählen',
    'essen.foto_wird_verarbeitet': 'Foto wird verarbeitet …',
    'essen.frischkaese': 'Frischkäse',
    'essen.fuer': ' für ',
    'essen.fuer_2': ' für „',
    'essen.fuer_diese_woche_ist_noch': 'Für diese Woche ist noch nichts geplant. Wähl im Wochenplan ein paar Gerichte.',
    'essen.ganze_woche_fuellen': '🎲 Ganze Woche füllen',
    'essen.geloescht': ' gelöscht',
    'essen.gleiche_namen_werden_aktualisiert': '(gleiche Namen werden aktualisiert)',
    'essen.haehnchenbrust': 'Hähnchenbrust',
    'essen.heute_konnte_nicht_gezeichnet_werden': 'Heute konnte nicht gezeichnet werden:',
    'essen.high_protein_low_carb': 'High Protein, Low Carb, Vegetarisch …',
    'essen.https': 'https://…',
    'essen.importe_heute_uebrig': ' Importe heute übrig',
    'essen.ist_entweder': 'ist entweder',
    'essen.kcal': 'kcal',
    'essen.keine_gueltigen_rezepte_gefunden_pruefe': 'Keine gültigen Rezepte gefunden. Prüfe, ob es eine Spalte „Name“ gibt.',
    'essen.kh_g': 'KH (g)',
    'essen.kohlenhydrate': 'Kohlenhydrate',
    'essen.kommt_jetzt_jede_woche_wieder': '" kommt jetzt jede Woche wieder',
    'essen.komplett_zuruecksetzen_rezepte_selbst_bleiben': '“ komplett zurücksetzen? Rezepte selbst bleiben erhalten.',
    'essen.konnte_kein_rezept_erkennen': 'Konnte kein Rezept erkennen.',
    'essen.kurz_notieren_wie_s': 'Kurz notieren, wie\'s gemacht wird …',
    'essen.kw': 'KW —',
    'essen.link': 'Link',
    'essen.link_zur_rezeptseite_oder': 'Link zur Rezeptseite oder zum Video',
    'essen.liste_in_die_zwischenablage_kopiert': 'Liste in die Zwischenablage kopiert.',
    'essen.liste_zurueckgesetzt': 'Liste zurückgesetzt',
    'essen.mahlzeiten': 'Mahlzeiten',
    'essen.menge_fuer': 'Menge für ',
    'essen.menge_und_einheit_werden': 'Menge und Einheit werden automatisch erkannt (g, kg, ml, l, Stk, EL, TL, Bund, Dose, Zehe …). Steht keine Einheit da, wird „Stk“ angenommen.',
    'essen.mengen_fuer': 'Mengen für',
    'essen.mit_tag': ' mit Tag „',
    'essen.naechste_woche': 'Nächste Woche',
    'essen.naehrwerte': 'Nährwerte',
    'essen.naehrwerte_aus_zutaten_berechnen': '🧮 Nährwerte aus Zutaten berechnen',
    'essen.naehrwerte_berechnet': 'Nährwerte berechnet ✓',
    'essen.naehrwerte_kw': 'Nährwerte · KW ',
    'essen.name': 'Name',
    'essen.neu_hinzugefuegt': ' neu hinzugefügt, ',
    'essen.neues_rezept': 'Neues Rezept',
    'essen.nichts_zu_ergaenzen_schon_alles': 'Nichts zu ergänzen — schon alles geplant oder noch keine Rezepte vorhanden.',
    'essen.nichts_zu_leeren_wiederkehrende_eintraege': 'Nichts zu leeren — wiederkehrende Einträge bleiben stehen.',
    'essen.nichts_zu_teilen_die_liste': 'Nichts zu teilen — die Liste ist leer.',
    'essen.noch_keine_rezepte_vorhanden': 'Noch keine Rezepte vorhanden.',
    'essen.noch_keine_snacks_angelegt_im': 'Noch keine Snacks angelegt — im Reiter Rezepte unter „+ Neues Rezept“ auf Snack umstellen.',
    'essen.oder': 'oder',
    'essen.ohne_namen_laesst_sich_das': 'Ohne Namen lässt sich das Rezept später nicht wiederfinden.',
    'essen.ohne_zubereitung_und_bild': '— ohne Zubereitung und Bild',
    'essen.optional': '— optional',
    'essen.optional_mit_komma_trennen': '— optional, mit Komma trennen',
    'essen.personen': '— Personen',
    'essen.pfeile_oder_wischen_auf': 'Pfeile ‹ › oder Wischen auf der Leiste wechseln die Woche',
    'essen.portionen': 'Portionen',
    'essen.reis_kochen_haehnchen_anbraten_brokkoli': 'Reis kochen, Hähnchen anbraten, Brokkoli dämpfen, alles vermengen.',
    'essen.rezept': 'Rezept',
    'essen.rezept_bearbeiten': 'Rezept bearbeiten',
    'essen.rezept_eingelesen_bitte_pruefen_und': 'Rezept eingelesen — bitte prüfen und speichern ✓',
    'essen.rezept_eingelesen_noch': 'Rezept eingelesen — noch ',
    'essen.rezept_einlesen': 'Rezept einlesen',
    'essen.rezept_gespeichert': 'Rezept gespeichert ✓',
    'essen.rezept_importieren': '🤖 Rezept importieren',
    'essen.rezept_importieren_2': 'Rezept importieren',
    'essen.rezept_oder_zutat_suchen': '🔍 Rezept oder Zutat suchen …',
    'essen.rezept_speichern': 'Rezept speichern',
    'essen.rezept_wird_gelesen_das_kann': 'Rezept wird gelesen … das kann ein paar Sekunden dauern.',
    'essen.rezepte': 'Rezepte',
    'essen.rezepte_exportieren': '⬇ Rezepte exportieren',
    'essen.rezepte_exportiert': ' Rezepte exportiert.',
    'essen.rezepte_importiert_die_alten_sind': ' Rezepte importiert, die alten sind ersetzt.',
    'essen.rezeptseiten_tiktok_und_youtube': 'Rezeptseiten, TikTok und YouTube (auch Shorts). Bei Videos wird gelesen, was\n          in der Beschreibung steht — Gesprochenes im Video nicht. Instagram lässt sich nicht auslesen: dort die Caption\n          kopieren und „Text einfügen" nehmen.',
    'essen.rezepttext': 'Rezepttext',
    'essen.sagt_fuer_wie_viele': 'sagt, für wie viele Personen die Mengen gelten. Fehlt die Spalte, rechnet die App mit 4.',
    'essen.schliessen': 'Schließen',
    'essen.schnell_anlegen': '+ Schnell anlegen',
    'essen.snack': 'Snack',
    'essen.snacks_brauchen_nur_name': '. Snacks brauchen nur Name und Zutaten und erscheinen im Snack-Feld des Wochenplans. Nährwertspalten werden auch bei Snacks übernommen und zählen dann in der Auswertung mit. Fehlt die Spalte, gilt alles als Rezept.',
    'essen.spalten_der_datei': 'Spalten der Datei',
    'essen.steht_nur_noch_auf_dieser': '" steht nur noch auf dieser Liste',
    'essen.tag_waehlen': 'Tag wählen',
    'essen.tags': 'Tags',
    'essen.text_einfuegen': 'Text einfügen',
    'essen.typ': 'Typ',
    'essen.verbindung_zum_server_fehlgeschlagen': 'Verbindung zum Server fehlgeschlagen.',
    'essen.von_dieser_liste_entfernt': ' von dieser Liste entfernt',
    'essen.vorige_woche': 'Vorige Woche',
    'essen.vorlage_heruntergeladen': 'Vorlage heruntergeladen.',
    'essen.vorlage_herunterladen': '📄 Vorlage herunterladen',
    'essen.was_ihr_nicht_plant': 'Was ihr nicht plant, schaltet ihr hier ab. Die Personenzahl gilt als Vorgabe für neue Einträge und lässt sich pro Tag ändern.',
    'essen.woche': 'Woche',
    'essen.woche_gesamt': 'Woche gesamt',
    'essen.wochenplan_zurueckgesetzt': 'Wochenplan zurückgesetzt',
    'essen.z_b_aus_einem': '— z. B. aus einem Kochbuch',
    'essen.z_b_ofengemuese_mit': 'z. B. Ofengemüse mit Feta',
    'essen.z_b_ofengemuese_mit_feta': 'z. B. Ofengemüse mit Feta',
    'essen.zur_aktuellen_woche': 'Zur aktuellen Woche',
    'essen.zurueckgesetzt': ' zurückgesetzt',
    'essen.zutat': '+ Zutat',
    'essen.zutaten': 'Zutaten',
    'essen.zutaten_und_zubereitung_reinkopieren': 'Zutaten und Zubereitung reinkopieren …',

    /* --- Einkauf — Liste und Artikel --- */
    'einkauf.1_artikel_auf_die_liste': '1 Artikel auf die Liste',
    'einkauf.abteilungen_sortieren': 'Abteilungen sortieren',
    'einkauf.alle_auch_rezeptzutaten': 'Alle, auch Rezeptzutaten',
    'einkauf.antippen_waehlt_aus_mehrere': 'Antippen wählt aus, mehrere gehen zusammen auf die Liste. Das (+) setzt einen einzelnen sofort drauf.',
    'einkauf.artikel': 'Artikel',
    'einkauf.artikel_auf_der_liste': ' Artikel auf der Liste',
    'einkauf.artikel_auf_die_liste': ' Artikel auf die Liste',
    'einkauf.artikel_suchen_oder_anlegen': '🔍 Artikel suchen oder anlegen',
    'einkauf.auf_die_liste': 'Auf die Liste',
    'einkauf.auf_die_liste_2': '" auf die Liste',
    'einkauf.aufheben': 'Aufheben',
    'einkauf.aus_dem_katalog_geloescht': ' aus dem Katalog gelöscht',
    'einkauf.drogerie_haushalt': 'Drogerie & Haushalt',
    'einkauf.einkauf': 'Einkauf',
    'einkauf.einkaufsliste': 'Einkaufsliste',
    'einkauf.fuer_diese_woche_ist': 'Für diese Woche ist noch nichts geplant.',
    'einkauf.getraenke': 'Getränke',
    'einkauf.gewuerze': 'Gewürze',
    'einkauf.in_welchem_laden_kauft_ihr': 'In welchem Laden kauft ihr „',
    'einkauf.ist_jetzt_im_katalog': '" ist jetzt im Katalog',
    'einkauf.kuehlregal': 'Kühlregal',
    'einkauf.laden_zuordnen': '🏬 Laden zuordnen',
    'einkauf.lebensmittel': 'Lebensmittel',
    'einkauf.liste': 'Liste',
    'einkauf.liste_zuruecksetzen': 'Liste zurücksetzen',
    'einkauf.meine_artikel': 'Meine Artikel',
    'einkauf.meistens_leer_lassen_um_es': '" meistens? (leer lassen, um es wieder zu entfernen)',
    'einkauf.name_antippen_aendert_die': 'Name antippen ändert die Abteilung · Menge antippen passt sie an',
    'einkauf.nichts_gefunden': 'Nichts gefunden.',
    'einkauf.noch_nichts_selbst_angelegt_neue': 'Noch nichts selbst angelegt. Neue Artikel entstehen von allein, sobald ihr sie in der Einkaufsliste eintippt.',
    'einkauf.obst_gemuese': 'Obst & Gemüse',
    'einkauf.reihenfolge_in_der_die': 'Reihenfolge, in der die Abteilungen in der Einkaufsliste erscheinen — passt sie an euren Supermarkt an.',
    'einkauf.sobald_rezepte_da_sind_erscheinen': 'Sobald Rezepte da sind, erscheinen hier ihre Zutaten.',
    'einkauf.steht_auf_der_einkaufsliste': ' steht auf der Einkaufsliste',
    'einkauf.steht_schon_auf_der_liste': ' steht schon auf der Liste',
    'einkauf.teilen': '📤 Teilen',
    'einkauf.tiefkuehl': 'Tiefkühl',
    'einkauf.was_es_noch_nicht': 'Was es noch nicht gibt, wird beim Draufsetzen als Artikel angelegt — beim nächsten Mal steht es als Vorschlag da.',
    'einkauf.wischen_abhaken_loeschen': 'Wischen: → abhaken · ← löschen',

    /* --- Notizen --- */
    'notizen.aufgaben_auf_heute': 'Aufgaben auf Heute:',
    'notizen.eintraegen_loeschen': ' Einträgen löschen?',
    'notizen.eintrag_hinzufuegen': 'Eintrag hinzufügen',
    'notizen.erledigte_geloescht': ' Erledigte gelöscht',
    'notizen.faellig_zuordnen': 'Fällig zuordnen',
    'notizen.geloescht': ' gelöscht',
    'notizen.geloescht_2': '" gelöscht',
    'notizen.liste_anlegen': 'Liste anlegen',
    'notizen.neuer_name_der_liste': 'Neuer Name der Liste:',
    'notizen.noch_keine_liste_was_der': 'Noch keine Liste. Was der Haushalt aufschreiben will, entscheidet er selbst.',
    'notizen.noch_nichts_angelegt': 'Noch nichts angelegt',
    'notizen.ohne_namen': 'Ohne Namen',
    'notizen.ohne_text_kann_der_eintrag': 'Ohne Text kann der Eintrag nicht angelegt werden.',
    'notizen.ueberfaellig': 'überfällig · ',
    'notizen.wie_soll_die_liste_heissen': 'Wie soll die Liste heißen?',

    /* --- Einstellungen --- */
    'einstellungen.abmelden': 'Abmelden',
    'einstellungen.aendere': 'Ändere …',
    'einstellungen.aendern': 'Ändern',
    'einstellungen.aktiver_haushalt': 'Aktiver Haushalt',
    'einstellungen.anfragen_jemand_dort_muss': ') anfragen: Jemand dort muss die Anfrage annehmen. Alte FamBoard-Haushalte ohne Konto übernimmt die ID direkt.',
    'einstellungen.anlegen': 'Anlegen',
    'einstellungen.auf_dem_iphone_nur': 'Auf dem iPhone nur vom Homescreen aus.',
    'einstellungen.aus': 'Aus',
    'einstellungen.begruessung_leere_zustaende_und_ankuendigungen': 'Begrüßung, leere Zustände und Ankündigungen.',
    'einstellungen.beitreten': 'Beitreten',
    'einstellungen.bitte_eine_neue_e_mail': 'Bitte eine neue E-Mail-Adresse eintragen.',
    'einstellungen.bitte_einen_namen_eintragen': 'Bitte einen Namen eintragen.',
    'einstellungen.darstellung': 'Darstellung',
    'einstellungen.darstellungsmodus': 'Darstellungsmodus',
    'einstellungen.das_geht_aus_sicherheitsgruenden_nur': 'Das geht aus Sicherheitsgründen nur kurz nach dem Anmelden. Einmal ab- und wieder anmelden, dann nochmal versuchen.',
    'einstellungen.der_haushalt_ist_unveraendert': '). Der Haushalt ist unverändert.',
    'einstellungen.diese_e_mail_adresse_wird': 'Diese E-Mail-Adresse wird schon von einem anderen Konto benutzt.',
    'einstellungen.dunkel': 'Dunkel',
    'einstellungen.e_mail': 'E-Mail',
    'einstellungen.einladungscode_einloesen_gilt_sofort': 'Einladungscode einlösen (gilt sofort) — oder mit einer Haushalts-ID (',
    'einstellungen.einladungslink_erzeugen': '🔗 Einladungslink erzeugen',
    'einstellungen.erinnerungen_erreichen_dich_dort': 'Erinnerungen erreichen dich dort nur, wenn Butley auf dem Homescreen liegt: Teilen antippen, „Zum Home-Bildschirm“ wählen. Das ist eine Vorgabe von Apple, keine von uns.',
    'einstellungen.erscheint_nur_wenn_du_das': 'Erscheint nur, wenn du das Fragezeichen antippst.',
    'einstellungen.firebase_verlangt_hier_eine_bestaetigung': 'Firebase verlangt hier eine Bestätigung per Link statt einer direkten Änderung — dieses Projekt hat "Email enumeration protection" aktiv. Für jetzt: E-Mail-Adresse stattdessen direkt in der Firebase-Konsole unter Authentication ändern.',
    'einstellungen.fuer_dieses_konto_ist_schon': 'Für dieses Konto ist schon ein Passwort hinterlegt.',
    'einstellungen.gespeichert_kuenftig_mit': 'Gespeichert — künftig mit ',
    'einstellungen.haushalt': 'Haushalt',
    'einstellungen.haushalt_loeschen': 'Haushalt löschen',
    'einstellungen.haushalts_id_wer_sie_kennt': 'Haushalts-ID — wer sie kennt, kann nicht hinein, sondern nur anklopfen: Die Beitrittsanfrage muss hier jemand annehmen.',
    'einstellungen.hell': 'Hell',
    'einstellungen.hh': 'hh-…',
    'einstellungen.hh_oder_einladungscode': 'hh-… oder Einladungscode',
    'einstellungen.hinzufuegen': 'Hinzufügen',
    'einstellungen.hinzugefuegt_ihr_koennt_euch_jetzt': 'Hinzugefügt — ihr könnt euch jetzt auch mit E-Mail und Passwort anmelden.',
    'einstellungen.id_kopieren': 'ID kopieren',
    'einstellungen.ihr_gehoert_zu_mehreren': 'Ihr gehört zu mehreren Haushalten. Wählt, welchen ihr auf diesem Gerät seht.',
    'einstellungen.keine_figur_die_hilfe_bleibt': 'Keine Figur. Die Hilfe bleibt als reines Fragezeichen erhalten.',
    'einstellungen.kopiert': 'Kopiert.',
    'einstellungen.konto': 'Konto',
    'einstellungen.kopfzeile_konnte_nicht_gezeichnet_werden': 'Kopfzeile konnte nicht gezeichnet werden:',
    'einstellungen.loeschen_fehlgeschlagen': 'Löschen fehlgeschlagen (',
    'einstellungen.mindestens_6_zeichen_eintragen': 'Mindestens 6 Zeichen eintragen.',
    'einstellungen.mitglieder_einladung': 'Mitglieder & Einladung',
    'einstellungen.modus': 'Modus',
    'einstellungen.name': 'Name',
    'einstellungen.neue_adresse_de': 'neue@adresse.de',
    'einstellungen.neues_passwort_mind_6': 'neues Passwort, mind. 6 Zeichen',
    'einstellungen.nur_der_eigentuemer_dieses_haushalts': 'Nur der Eigentümer dieses Haushalts kann ihn löschen.',
    'einstellungen.nur_der_eigentuemer_dieses_haushalts_2': 'Nur der Eigentümer dieses Haushalts kann den Namen ändern.',
    'einstellungen.nur_hilfe': 'Nur Hilfe',
    'einstellungen.passwort_aendern': 'Passwort ändern',
    'einstellungen.passwort_hinzufuegen_bisher_nur_google': 'Passwort hinzufügen (bisher nur Google-Anmeldung)',
    'einstellungen.personen': 'Personen',
    'einstellungen.rezepte_plaene_listen_notizen_und': 'Rezepte, Pläne, Listen, Notizen und Termine dieses Haushalts sind danach weg — auch für alle anderen Mitglieder. Nochmal tippen bestätigt, ein Bereichswechsel bricht ab.',
    'einstellungen.so_heisst_euer_haushalt': 'So heißt euer Haushalt in der Übersicht und für alle Mitglieder.',
    'einstellungen.so_heisst_euer_haushalt_in': 'So heißt euer Haushalt in der Übersicht und für alle Mitglieder.',
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
    'einstellungen.wird_geloescht': 'Wird gelöscht …',
    'einstellungen.wirklich_loeschen_endgueltig': 'Wirklich löschen — endgültig',
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
    'onboarding.ich_bin_butley_ihr_seid': 'Ich bin Butley — ich halte hier Termine, Essen und Einkauf zusammen. Du bist jetzt Mitglied im Haushalt „{haushalt}“. Alles, was dort schon steht, siehst du gleich.',
    'onboarding.laesst_sich_jederzeit_aendern': 'Lässt sich jederzeit ändern.',
    'onboarding.loeschen_geht_jederzeit_rezept': 'Löschen geht jederzeit — Rezept öffnen, Papierkorb.',
    'onboarding.mein_haushalt': 'Mein Haushalt',
    'onboarding.name_des_haushalts': 'Name des Haushalts',
    'onboarding.ohne_homescreen_keine_erinnerungen': 'Ohne Homescreen keine Erinnerungen. Das ist eine Vorgabe von Apple, keine von mir.',
    'onboarding.sechs_beispielrezepte_einspielen': 'Sechs Beispielrezepte einspielen',
    'onboarding.ueberspringen': 'Überspringen',
    'onboarding.weiter': 'Weiter',
    'onboarding.wenn_ihr_moegt_lege_ich': 'Wenn ihr mögt, lege ich euch sechs Beispielrezepte hinein — zum Angucken, wie Rezepte, Wochenplan und Einkaufsliste zusammenspielen. Sonst startet ihr leer und bringt Eigenes mit.',
    'onboarding.zum_ausprobieren': 'Zum Ausprobieren?',

    /* --- Wahlschritt (E2) --- */
    'wahl.abmelden': 'Abmelden',
    'wahl.anfrage_an': 'Anfrage an',
    'wahl.anfrage_gesendet': 'Anfrage gesendet.',
    'wahl.anfrage_nicht_moeglich_stimmt': 'Anfrage nicht möglich. Stimmt die Haushalts-ID? Anfragen gehen nur an bestehende Haushalte.',
    'wahl.anfrage_zurueckziehen': 'Anfrage zurückziehen',
    'wahl.beides_bekommt_ihr_von_jemandem': 'Beides bekommt ihr von jemandem, der schon drin ist: Einstellungen → Mitglieder & Einladung.',
    'wahl.beitreten_oder_anfragen': 'Beitreten / anfragen',
    'wahl.bitte_code_oder_haushalts_id': 'Bitte einen Einladungscode oder eine Haushalts-ID eintragen.',
    'wahl.code_oder_hh': 'Code oder hh-…',
    'wahl.das_hat_nicht_geklappt': 'Das hat nicht geklappt (',
    'wahl.dein_name': 'Dein Name',
    'wahl.die_anfrage_wurde_abgelehnt': 'Die Anfrage wurde abgelehnt. Du kannst mit einem Einladungscode beitreten oder einen eigenen Haushalt anlegen.',
    'wahl.einem_haushalt_beitreten': 'Einem Haushalt beitreten',
    'wahl.einladungscode_oder_haushalts_id': 'Einladungscode oder Haushalts-ID',
    'wahl.fast_geschafft': 'Fast geschafft.',
    'wahl.lege_an': 'Lege an …',
    'wahl.mit_einem_einladungscode_bist': 'Mit einem Einladungscode bist du sofort drin. Mit einer Haushalts-ID (hh-…) frage ich für dich an — jemand aus dem Haushalt gibt dann frei.',
    'wahl.neuen_haushalt_anlegen': 'Neuen Haushalt anlegen',
    'wahl.sag_mir_kurz_wer': 'Sag mir kurz, wer du bist — und wohin es geht.',
    'wahl.sobald_jemand_aus_dem': 'Sobald jemand aus dem Haushalt freigibt, geht es hier von selbst weiter.',
    'wahl.wird_den_anderen_im_haushalt': 'Wird den anderen im Haushalt angezeigt. Lässt sich jederzeit ändern.',
    'wahl.zu_wem_solls_gehen': 'Zu wem soll es gehen?',
    'wahl.zurueck': 'Zurück',

    /* --- Beitrittsanfragen (E3) --- */
    'beitritt.ablehnen': 'Ablehnen',
    'beitritt.anfrage_gesendet_sobald_ein': 'Anfrage gesendet. Sobald jemand dort freigibt, taucht der Haushalt oben im Umschalter auf.',
    'beitritt.antwort_fehlgeschlagen': 'Antwort fehlgeschlagen (',
    'beitritt.aufgenommen_ueber_den_haushaltsnamen_oben': 'Aufgenommen — über den Haushaltsnamen oben links könnt ihr umschalten.',
    'beitritt.aufnehmen': 'Aufnehmen',
    'beitritt.die_anfrage_wurde_abgelehnt': 'Die Beitrittsanfrage wurde abgelehnt.',
    'beitritt.eure_anfrage_laeuft_schon': 'Eure Anfrage läuft schon — jemand dort muss sie annehmen.',
    'beitritt.in_diesem_haushalt_seid_ihr': 'In diesem Haushalt seid ihr schon.',
    'beitritt.moechte_diesem_haushalt_beitreten': 'möchte diesem Haushalt beitreten.',

    /* --- Suchfenster --- */
    'suche.rezept_waehlen': 'Rezept wählen',
    'suche.schliessen': 'Schließen',
    'suche.suchen': '🔍 Suchen …',

    /* --- Benachrichtigungen (C2) --- */
    'push.auf_diesem_geraet': 'Auf diesem Gerät',
    'push.aufgabe_titel': 'Für {name}',
    'push.ausgeschaltet': 'Aus. Es geht nichts verloren — es steht alles in der App.',
    'push.benachrichtigungen': 'Benachrichtigungen',
    'push.browser_kann_das_nicht': 'Dieser Browser kann keine Benachrichtigungen anzeigen.',
    'push.eingeschaltet': 'An. Sobald es etwas zu melden gibt, kommt es hier an.',
    'push.einkauf_eine': 'Ein Artikel ist dazugekommen.',
    'push.einkauf_mehrere': '{n} Artikel sind dazugekommen.',
    'push.einkauf_titel': 'Einkaufsliste',
    'push.erlaubnis_verweigert': 'Du hast Benachrichtigungen für Butley abgelehnt. Das lässt sich nur in den Einstellungen deines Browsers zurücknehmen.',
    'push.erneuert': 'Die Anmeldung war abgelaufen und ist erneuert.',
    'push.ging_nicht': 'Das hat nicht geklappt. Versuch es später noch einmal.',
    'push.nur_vom_homescreen': 'Auf dem iPhone nur vom Homescreen aus: Teilen antippen, „Zum Home-Bildschirm“ wählen. Das ist eine Vorgabe von Apple, keine von uns.',
    'push.probe_erklaerung': 'Zeigt eine Benachrichtigung, wie sie später ankommt.',
    'push.probe_senden': 'Probe senden',
    'push.probe_text': 'So sieht eine Nachricht aus. Wenn du das liest, ist alles eingerichtet.',
    'push.probe_titel': 'Butley meldet sich',
    'push.toast_an': 'Benachrichtigungen sind an',
    'push.toast_aus': 'Benachrichtigungen sind aus',

    /* --- Meldungen und Rückgängig --- */
    'meldung.rueckgaengig': 'Rückgängig',

    /* --- Allgemein --- */
    'allgemein.bund': 'Bund',
    'allgemein.der_abo_link_konnte_nicht': 'Der Abo-Link konnte nicht geschrieben werden. Sind die Sicherheitsregeln veroeffentlicht?',
    'allgemein.dose': 'Dose',
    'allgemein.el': 'EL',
    'allgemein.fruehstueck': 'Frühstück',
    'allgemein.g': 'g',
    'allgemein.hauptbereiche': 'Hauptbereiche',
    'allgemein.kalender_konnte_nicht_gezeichnet_werden': 'Kalender konnte nicht gezeichnet werden:',
    'allgemein.kein_zugriff_auf_die_datenbank': 'Kein Zugriff auf die Datenbank (',
    'allgemein.kg': 'kg',
    'allgemein.l': 'l',
    'allgemein.ml': 'ml',
    'allgemein.notizen_konnten_nicht_gezeichnet_werden': 'Notizen konnten nicht gezeichnet werden:',
    'allgemein.packung': 'Packung',
    'allgemein.personen_konnten_nicht_gezeichnet_werden': 'Personen konnten nicht gezeichnet werden:',
    'allgemein.prise': 'Prise',
    'allgemein.scheibe': 'Scheibe',
    'allgemein.sind_die_sicherheitsregeln_veroeffentlicht': '). Sind die Sicherheitsregeln veröffentlicht?',
    'allgemein.speichern_fehlgeschlagen': 'Speichern fehlgeschlagen: ',
    'allgemein.speichern_nicht_erlaubt_entweder_ist': 'Speichern nicht erlaubt. Entweder ist die anonyme Anmeldung in Firebase noch aus, oder die Sicherheitsregeln passen nicht.',
    'allgemein.stk': 'Stk',
    'allgemein.tl': 'TL',

    /* --- personen --- */
    'personen.geloescht': ' gelöscht',
    'personen.gibt_es_schon': '" gibt es schon.',
    'personen.ist_jetzt_ehemalig_bestehende_zuordnungen': ' ist jetzt ehemalig — bestehende Zuordnungen bleiben',
    'personen.mit_konto_verknuepft': 'mit Konto verknüpft',
    'personen.ohne_namen_laesst_sich_niemand': 'Ohne Namen lässt sich niemand anlegen.',
  },
};

let aktiv = VORGABE;
const gemeldet = new Set();

export function sprache() { return aktiv; }

/* Der Text zu einem Schlüssel. Kein zweites Argument mit deutschem Ersatz —
   sonst stünde der Text doch wieder an fünfhundert Stellen.

   Sie heißt txt und nicht t, wie sonst überall üblich: In app.js ist `t` seit
   dem Kalender der Name für einen Termin — an 28 Stellen, als Parameter in
   werText(t), werPunkte(t), terminAmTag(t) und in einem Dutzend map(t=>…).
   Innerhalb dieser Funktionen hätte t('schluessel') versucht, den Termin
   aufzurufen. Der erste Anlauf von C1b ist genau daran gescheitert — der
   Kalender baute sein Raster nicht mehr auf. pruefe-texte.py hält den Namen
   deshalb frei. */
export function txt(schluessel) {
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

/* Platzhalter {name} füllen: txtf('einkauf.x_von_y', {x:3, y:7}).
   Bewusst keine Zeichenkettenverkettung im Aufrufer — die Wortstellung ist in
   anderen Sprachen eine andere, und genau daran scheitern zusammengesetzte
   Sätze. */
export function txtf(schluessel, werte) {
  return txt(schluessel).replace(/\{(\w+)\}/g, (ganz, name) =>
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
  w.querySelectorAll('[data-t]').forEach(el => { el.textContent = txt(el.dataset.t); });
  w.querySelectorAll('[data-t-ph]').forEach(el => { el.placeholder = txt(el.dataset.tPh); });
  w.querySelectorAll('[data-t-aria]').forEach(el => {
    el.setAttribute('aria-label', txt(el.dataset.tAria));
  });
  w.querySelectorAll('[data-t-titel]').forEach(el => {
    el.setAttribute('title', txt(el.dataset.tTitel));
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
      k.nodeValue = vor + txt(schluessel) + nach;
    });
  });
}

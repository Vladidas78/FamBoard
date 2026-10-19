/* Butley – Richtpreise und Zutaten-Angleich (v37, 19.10.2026)

   Reine Daten, keine Logik. app.js bildet die Schluessel selbst ueber normKey,
   deshalb stehen hier Anzeigenamen, wie sie in Rezepten und im Artikelstamm
   vorkommen.

   RICHTPREISE: Euro je Packung (Packungsgroesse wie im Artikelstamm-Export vom
   18.10.2026). Quelle: elf Kassenzettel REWE, Kaufland, Lidl aus Bad Rappenau,
   Bad Wimpfen und Freiberg (29.04.–17.10.2026), Regalpreis ohne Aktion. Wo kein
   Bon vorlag, die Schaetzung aus dem Export. Ein selbst eingetragener Preis geht
   immer vor; der Richtpreis erscheint als "ca." und zaehlt im Budget mit.
   Bei jedem neuen Bon-Abgleich hier nachziehen. */
export const RICHTPREISE = {
  /* Drogerie & Haushalt */
  'Klopapier': 4.95, 'Waschmittel (Bunt)': 5.50, 'Waschmittel (Schwarz)': 5.50,
  'Toiletten Putzmittel': 1.50, 'Toilettensteine': 1.80, 'Feuchttücher': 2.99,
  'Wischtücher (feucht)': 1.75, 'Mülltüte (Restmüll)': 2.29, 'Mülltüte (Papier BIO)': 2.50,
  'Mülltüte ((BIO)': 1.55, 'Schwamm (Küche)': 1.20, 'Küchenschwämme': 1.50,
  'Trockenshampoo': 3.50, 'Shampoo': 2.50, 'Duschgel': 1.50, 'Waschgel Xenia': 4.00,
  'Flüssigseife': 1.50, 'Deo Vladi': 2.50, 'Creme für Erika': 3.85, 'Zahnbürsten': 2.50,
  'Rohrreiniger': 3.79, 'Spültabs': 10.99, 'Staubfänger': 3.00, 'Wand Radiergummi': 2.00,
  'Kleine Abfallbeutel': 1.50, 'Brita Filter': 5.50, 'Wasserfilter Oma': 5.50,
  'Allzweckreiniger': 1.50, 'Glasreiniger': 1.30, 'Küchenrolle': 2.50, 'Taschentücher': 1.30,
  'Backpapier': 1.59, 'Alufolie': 2.00, 'Frischhaltefolie': 1.50, 'Gefrierbeutel': 1.50,
  'Klarspüler': 2.00, 'Spülmaschinensalz': 1.00, 'Zahnpasta': 1.50, 'Wattepads': 1.00,

  /* Getraenke */
  'Spaßgetränke': 1.50, 'Wasser (OMA)': 2.34, 'Wasser (Diana)': 4.74, 'Saft (Oma)': 1.49,
  'Kaffeebohnen': 11.00, 'Blaubeer Tee': 2.00, 'Milch': 0.95, 'Milch (Oma)': 0.95,
  'White Monster': 1.59,

  /* Wurst, Fleisch, Fisch */
  'Salami': 1.80, 'Krakauer Wurst': 5.49, 'Kochschinken': 1.49, 'Wurst': 1.80,
  'Wurst Veggi': 2.99, 'Hähnchenfleisch': 6.79, 'Gyrosfleisch': 5.50, 'Würstchen KiTa': 2.49,
  'Salo': 4.50, 'geräucherter Fisch (Russischer Laden)': 5.00, 'Garnelen': 3.49,
  'Hackfleisch gemischt': 4.49, 'Hackfleisch Rind': 5.50, 'Bratwurst': 8.70,

  /* Russischer Laden */
  'Pelmeni': 6.00, 'Vareniki': 4.50, 'Bortsch': 3.50,

  /* Kaese & Kuehlregal */
  'Käse': 1.89, 'Streukäse': 2.20, 'Babybell': 3.00, 'Mascarpone': 2.20, 'Schlagsahne': 0.90,
  'Schmand mit Kräutern': 1.20, 'Skyr': 1.99, 'Milchreis': 1.80, 'Tofu geräuchert': 2.00,
  'Tzatziki': 2.69, 'Eier': 2.79, 'Gries (High Protein)': 1.59, 'Gries': 1.59, 'Butter': 2.69,
  'Joghurt': 0.90, 'Magerquark': 1.00, 'Frischkäse': 1.19, 'Mozzarella': 0.90,
  'Mozzarellabällchen': 1.50, 'Parmesan': 4.29, 'Fetakäse': 1.60, 'Kochsahne': 0.99,
  'Joghurtsauce': 0.99, 'Cheddar': 2.00,

  /* Brot & Backwaren */
  'Brot': 1.79, 'Brot - Oma': 1.79, 'Brötchen - Oma': 1.19, 'Aufbackbrötchen': 1.50,
  'Rosinenbrötchen': 1.39, 'Wraps': 1.19, 'Käsestangen': 2.50, 'Toastbrot': 0.79,

  /* Obst & Gemuese */
  'Apfel': 2.00, 'Birnen': 2.99, 'Obst': 4.00, 'Wassermelone': 3.30, 'Avocado': 1.19,
  'Snackgurken': 1.99, 'Salatgurke': 0.99, 'Karotten': 1.49, 'Suppengrün': 1.30,
  'Bananen': 1.10, 'Trauben': 1.79, 'Paprika': 2.00, 'Kopfsalat': 0.69, 'Zwiebel': 1.49,
  'Knoblauch': 1.20, 'Kartoffeln': 2.49, 'Süßkartoffeln': 2.50, 'Tomaten': 1.69,
  'Mango': 1.50, 'Rotkohl': 1.50,

  /* Trockenes, Konserven, Saucen */
  'Nudeln': 0.69, 'Orzo Nudeln': 1.50, 'Tomatensauce': 1.29, 'Marmelade': 2.20, 'Snacks': 1.40,
  'Reis': 2.50, 'Klebreis': 2.50, 'Mehl': 0.80, 'Müsli': 2.50, 'Müsli High Protein': 3.50,
  'Tomatenmark': 0.90, 'passierte Tomaten': 0.90, 'gehackte Tomaten': 0.59, 'Kokosmilch': 1.55,
  'Linsen': 1.80, 'Kichererbsen': 1.49, 'Bohnen': 0.90, 'Ketchup': 1.20, 'Mayonnaise': 1.50,
  'Senf': 1.00, 'Honig': 2.69, 'Gemüsebrühe': 0.99, 'Öl': 2.99, 'Olivenöl': 5.00,
  'Essiggurken': 1.50,

  /* Tiefkuehl */
  'Schlemmerfilet': 3.00, 'Gemüse-TK': 1.49, 'Kräuter-TK': 1.00, 'Pizza': 1.79,

  /* Andere Schreibweisen derselben Packung - fuer Rezepte, die spaeter mit diesen
     Namen dazukommen (Import, Foto). Der Angleich unten erfasst sie nur einmal. */
  'Hackfleisch': 4.49, 'Hack (gemischt)': 4.49, 'Rinderhack': 5.50, 'Hähnchenbrust': 6.79,
  'Hähnchenbrustfilet': 6.79, 'Feta': 1.60, 'Gurke': 0.99, 'Möhren': 1.49, 'Sahne': 0.90,
  'Cremefine': 0.99, 'Schmand': 1.20, 'Toast': 0.79, 'Tk Kräuter': 1.00, 'Bandnudeln': 0.69,
  'Wiener Würstchen': 2.49, 'Cherrytomaten': 1.69, 'Garnellen': 3.49, 'Pilmeni': 6.00
};

/* Option B (Vladi, 19.10.2026): Rezeptzutaten tragen den Namen des
   Artikelstamms. Links der Name im Rezept, rechts der Stamm-Name. Nur
   Eintraege, deren Schluessel sich wirklich aendert - "Zwiebeln" und
   "Tomate" fasst normKey ohnehin zusammen. Dazu zwei Tippfehler im Stamm. */
export const ZUTATEN_ANGLEICH = {
  'Bandnudeln': 'Nudeln', 'BIO Kokosmilch': 'Kokosmilch', 'bunte Paprikaschoten': 'Paprika',
  'Buttergemüse': 'Gemüse-TK', 'Cherrytomaten': 'Tomaten', 'Cremefine': 'Kochsahne',
  'Essiggürkchen': 'Essiggurken', 'Feta': 'Fetakäse', 'Garnelen (Kräuter)': 'Garnelen',
  'stückige Tomaten': 'gehackte Tomaten', 'geriebener Mozzarella': 'Streukäse',
  'griechischer Joghurt': 'Joghurt', 'Gurke': 'Salatgurke', 'Hack (gemischt)': 'Hackfleisch gemischt',
  'Hackfleisch': 'Hackfleisch gemischt', 'Hähnchenbrust': 'Hähnchenfleisch',
  'Hähnchenbrustfilet': 'Hähnchenfleisch', 'Hirtenkäse light': 'Fetakäse',
  'Hühnerbrühe': 'Gemüsebrühe', 'Hühnerbrühe (Pulver)': 'Gemüsebrühe',
  'Knoblauchzeh': 'Knoblauch', 'Knoblauchzehen': 'Knoblauch', 'Knollensellerie': 'Suppengrün',
  'Kokosöl': 'Öl', 'Minigurken': 'Snackgurken', 'Möhren': 'Karotten', 'Petersilie': 'Kräuter-TK',
  'Porree': 'Suppengrün', 'reife Mango': 'Mango', 'Reis nach Bedarf': 'Reis',
  'Rinderhack': 'Hackfleisch Rind', 'rote Zwiebel': 'Zwiebel', 'Sahne': 'Schlagsahne',
  'Salat': 'Kopfsalat', 'Schmand': 'Schmand mit Kräutern', 'Tellerlinsen': 'Linsen',
  'Tk Kräuter': 'Kräuter-TK', 'Toast': 'Toastbrot', 'Weißer Klebreis': 'Klebreis',
  'Wiener Würstchen': 'Würstchen KiTa', 'gehäuft Zucker': 'Zucker',
  /* Stamm */
  'Garnellen': 'Garnelen', 'Pilmeni': 'Pelmeni'
};

/* Gewuerze und Grundzutaten, die beim Angleich auf "Immer zuhause" gehen. */
export const ANGLEICH_ZUHAUSE = [
  'Cayennepfeffer', 'Chili', 'Curry', 'Garam Masala', 'Zucker', 'geröstete Sesamsamen',
  'Kokosblütenzucker', 'Kreuzkümmel', 'Maisstärke', 'Muskat', 'Oregano', 'Paprikapulver',
  'Paprikapulver rosenscharf', 'Pfeffer', 'Salz', 'Salz & Pfeffer', 'Tandoori-Gewürz'
];

/* Der Angleich ist eine Datenpflege fuer genau einen Haushalt. Erkannt wird er
   an seinen Rezepten: Erst wenn mindestens zehn dieser 17 Namen vorkommen,
   laeuft er - jeder andere Haushalt bleibt unberuehrt. */
export const ANGLEICH_REZEPTE = [
  'Kichererbsen-Curry mit Kokosmilch', 'Linseneintopf mit Wiener Würstchen', 'Bauerntopf',
  'Cremiges Tandoori-Hähnchen mit Tomatensauce', 'Burgerteller (Hähnchen) mit Kartoffelspalten',
  'Bratkartoffeln & Hähnchen in Sauce', 'Pelmeni', 'Süßkartoffel-Hackfleisch-Auflauf mit Feta',
  'Sticky Rice mit Mango (Khao Niaow Ma Muang)', 'Knuspriger Döner Salat', 'Gyros Risoni Salat',
  'Chicken Alfredo', 'Schlemmerfilet mit Reis und Buttergemüse', 'Burger-Toast aus dem Sandwichmaker',
  'Orzo Salat mit Garnelen', 'Suppe mit Fleischbällchen', 'Grobe Bratwurst mit Kartoffelbrei und Gemüse'
];
export const ANGLEICH_MINDESTENS = 10;

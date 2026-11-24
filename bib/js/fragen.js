// Die Fragen aus „Lernort-Bewertung.xlsx“ (+ „Zugänglichkeit“, „Anbindung“ statt Minuten-Anfahrt): 6 Kategorien, je Frage 0–4 Punkte (Texte = Spalten „0 Punkte“ bis „4 Punkte“).
// w = Standard-Gewicht der Kategorie (in den Einstellungen änderbar). ko: true = K.-o.-Frage (0 Punkte → Note höchstens 5,00).

const DEFAULT_CATS = [
  {
    id: 'ruhe', name: 'Ruhe & Konzentration', short: 'Ruhe', w: 0.25, color: '#4f8fe8',
    desc: 'Lautstärke, Ablenkung durch Leute, Telefonate & Gruppen',
    qs: [
      { id: 'f1', q: 'Lautstärke', ko: true, opts: ['laute Gespräche oder Musik überall', 'ständiges Stimmengewirr', 'gedämpftes Gemurmel', 'meist leise, nur einzelne Geräusche', 'praktisch Stille'] },
      { id: 'f2', q: 'Ablenkung durch Leute', opts: ['ständig läuft jemand direkt an deinem Platz vorbei', 'viel Durchgangsverkehr', 'ab und zu laufen Leute vorbei', 'selten Bewegung in deiner Nähe', 'du bekommst fast nichts mit'] },
      { id: 'f3', q: 'Telefonate & Gruppen', opts: ['dauernd, direkt neben dir', 'häufig', 'manchmal', 'selten, es gibt eine Ruheregel', 'nie, klare Ruhezone'] },
    ],
  },
  {
    id: 'platz', name: 'Arbeitsplatz & Ausstattung', short: 'Arbeitsplatz', w: 0.2, color: '#e5a019',
    desc: 'Platz am Tisch, Stuhl, Steckdosen, WLAN',
    qs: [
      { id: 'f4', q: 'Platz am Tisch', opts: ['kein Tisch, Laptop auf den Knien', 'nur der Laptop passt knapp', 'Laptop + 1 Heft', 'Laptop + Buch + Block passen bequem', 'viel Platz, du kannst alles ausbreiten'] },
      { id: 'f5', q: 'Stuhl', opts: ['Hocker ohne Lehne, tut nach 30 Min. weh', 'hart, nach 1 Std. unbequem', 'okay für 1–2 Std.', '2–3 Std. bequem', 'ergonomisch, stundenlang bequem'] },
      { id: 'f6', q: 'Steckdosen', opts: ['keine', 'wenige, weit weg oder meist belegt', 'gibt es, aber du musst danach suchen', 'an den meisten Plätzen', 'an jedem Platz, evtl. mit USB'] },
      { id: 'f7', q: 'WLAN', opts: ['keins', 'bricht ab, kaum nutzbar', 'reicht zum Surfen, Videos ruckeln', 'stabil, Videos laufen', 'schnell, Videocalls problemlos'] },
    ],
  },
  {
    id: 'klima', name: 'Atmosphäre & Klima', short: 'Atmosphäre', w: 0.15, color: '#e0679a',
    desc: 'Licht, Temperatur & Luft, Sauberkeit, Lernstimmung',
    qs: [
      { id: 'f8', q: 'Licht', opts: ['zu dunkel oder flackert', 'zu dunkel oder grell', 'ausreichend Kunstlicht', 'hell, etwas Tageslicht', 'viel Tageslicht + gutes Licht am Platz'] },
      { id: 'f9', q: 'Temperatur & Luft', opts: ['stickig, oder Jacke nötig', 'oft unangenehm', 'schwankt', 'meist angenehm', 'immer angenehm, frische Luft'] },
      { id: 'f10', q: 'Sauberkeit', opts: ['dreckig, klebrige Tische', 'oft unordentlich', 'okay', 'sauber', 'sehr gepflegt'] },
      { id: 'f11', q: 'Lernstimmung', opts: ['niemand lernt, eher ein Freizeitort', 'nur wenige lernen', 'gemischt', 'die meisten lernen', 'alle arbeiten konzentriert, das steckt an'] },
    ],
  },
  {
    id: 'weg', name: 'Verfügbarkeit & Erreichbarkeit', short: 'Verfügbarkeit', w: 0.2, color: '#14a39a',
    desc: 'Platz bekommen, Öffnungszeiten, Anbindung, Zugänglichkeit, Kosten pro Besuch',
    qs: [
      { id: 'f12', q: 'Platz bekommen', ko: true, opts: ['fast nie', 'nur wenn du sehr früh kommst', 'zu Stoßzeiten schwierig', 'meistens', 'immer, oder du kannst reservieren'] },
      { id: 'f13', q: 'Öffnungszeiten', opts: ['unter 4 Std. am Tag oder passen gar nicht', 'nur werktags, kurz', 'werktags ca. 9–18 Uhr', 'lang (z. B. 8–22 Uhr), auch samstags', 'sehr lang oder 24/7, auch am Wochenende'] },
      { id: 'f14', q: 'Anbindung & Erreichbarkeit', opts: ['kaum erreichbar: abgelegen, nur mit Auto oder sehr langem Fußweg', 'umständlich: Bus/Bahn selten, mehrmals umsteigen oder weiter Fußweg', 'okay: Bus oder Bahn in der Nähe, fährt aber nicht so oft', 'gut angebunden: Haltestelle in der Nähe, fährt regelmäßig, Fahrradständer', 'super angebunden: mehrere Linien direkt vor der Tür, auch spät noch, gut zu Fuß oder mit dem Rad'] },
      { id: 'f21', q: 'Zugänglichkeit', opts: ['große Hürden: Anmeldung oder Ausweis nötig und Tasche muss draußen bleiben, Spind nur mit eigenem Schloss', 'umständlich: Tasche und Jacke müssen in den Spind, du brauchst ein Schloss oder eine Münze, die du oft nicht dabei hast', 'Spind ist Pflicht, klappt aber meistens (z. B. 1-€-Münze als Pfand)', 'kleine Regeln: z. B. nur Jacke abgeben oder Getränke nur in Flaschen, Spinde kostenlos und genug da', 'einfach reingehen: du darfst alles mitnehmen, nichts abgeben, keine Anmeldung'] },
      { id: 'f15', q: 'Kosten pro Besuch', opts: ['über 10 €', '5–10 €', 'du musst etwas kaufen, ca. 3–5 €', 'kleiner oder freiwilliger Beitrag', 'kostenlos, du musst nichts kaufen'] },
    ],
  },
  {
    id: 'komfort', name: 'Versorgung & Komfort', short: 'Versorgung', w: 0.1, color: '#9277e0',
    desc: 'Toiletten, Essen & Trinken, Pausen',
    qs: [
      { id: 'f16', q: 'Toiletten', opts: ['keine', 'weit weg, kostenpflichtig oder dreckig', 'vorhanden, aber mäßig', 'nah und sauber', 'direkt nebenan, sehr sauber'] },
      { id: 'f17', q: 'Essen & Trinken', opts: ['nichts erlaubt, nichts in der Nähe', 'nur Wasser erlaubt', 'nur außerhalb des Raums, Café in der Nähe', 'Trinken am Platz, Essen in einem eigenen Bereich', 'Essen und Trinken am Platz, Café oder Mensa vor Ort'] },
      { id: 'f18', q: 'Pausen', opts: ['wenn du kurz weggehst, ist dein Platz weg', 'Platz unsicher, Pause nur draußen an der Straße', 'Platz bleibt frei, aber kein schöner Pausenort', 'Platz bleibt frei + Pausenbereich oder draußen', 'Platz bleibt frei + Pausenbereich + Grünes in der Nähe'] },
    ],
  },
  {
    id: 'ich', name: 'Persönliche Erfahrung', short: 'Persönlich', w: 0.1, color: '#e8774f',
    desc: 'Wie viel hast du geschafft?, Würdest du wiederkommen?',
    qs: [
      { id: 'f19', q: 'Wie viel hast du geschafft?', opts: ['fast nichts', 'deutlich weniger als geplant', 'etwa die Hälfte', 'fast alles', 'alles oder sogar mehr'] },
      { id: 'f20', q: 'Würdest du wiederkommen?', opts: ['nie wieder', 'nur im Notfall', 'wenn nichts anderes frei ist', 'gern', 'das ist mein Lieblingsort'] },
    ],
  },
];

// Punkteskala (Blatt „Anleitung“)
const POINT_WORDS = ['sehr schlecht', 'schlecht', 'okay', 'gut', 'sehr gut'];

// Bewertungsstufen
const LEVELS = [
  { min: 8.5, name: 'Top-Lernort', cls: 'top' },
  { min: 7, name: 'Gut', cls: 'good' },
  { min: 5, name: 'Okay', cls: 'ok' },
  { min: -Infinity, name: 'Eher meiden', cls: 'bad' },
];

// Beispiel aus der Excel-Tabelle (Stadtbibliothek; dort Note 7,90, mit der Frage „Zugänglichkeit“ etwas anders)
const EXAMPLE_PLACE = {
  name: 'Stadtbibliothek', where: 'Beispiel aus der Tabelle',
  answers: { f1: 3, f2: 2, f3: 3, f4: 4, f5: 3, f6: 2, f7: 4, f8: 3, f9: 3, f10: 4, f11: 2,
    f12: 2, f13: 4, f14: 3, f21: 3, f15: 4, f16: 4, f17: 2, f18: 3, f19: 3, f20: 4 },
};

/**
 * Zweisilbige Woerter mit Bild fuer "Silben verbinden", nach denselben Stufen wie
 * beim Silbenlesen. Im Spiel kommen alle Woerter bis einschliesslich der aktuellen Stufe vor.
 */
const NACH_STUFE = [
  // Stufe 1 - Lange Laute: kurze, offene Silben aus ein bis zwei Buchstaben
  [
    ['Ho', 'se', '👖'], ['Na', 'se', '👃'], ['Ro', 'se', '🌹'], ['Ha', 'se', '🐰'],
    ['Do', 'se', '🥫'], ['So', 'fa', '🛋️'], ['La', 'ma', '🦙'], ['O', 'ma', '👵'],
    ['O', 'pa', '👴'], ['U', 'fo', '🛸'], ['Ki', 'wi', '🥝'], ['Au', 'to', '🚗'],
  ],
  // Stufe 2 - Kurze Laute: Silben mit drei Buchstaben, Umlaute, X
  [
    ['Kä', 'se', '🧀'], ['Lö', 'we', '🦁'], ['Ta', 'xi', '🚕'], ['Be', 'sen', '🧹'],
    ['I', 'gel', '🦔'], ['Ti', 'ger', '🐯'], ['Ga', 'bel', '🍴'], ['Ka', 'mel', '🐫'],
  ],
  // Stufe 3 - Au, Ei, Eu, Sch (und ie, ch)
  [
    ['Ei', 'mer', '🪣'], ['Sei', 'fe', '🧼'], ['Lei', 'ter', '🪜'], ['Bie', 'ne', '🐝'],
    ['Rau', 'pe', '🐛'], ['Tau', 'be', '🕊️'], ['Zie', 'ge', '🐐'], ['Ku', 'chen', '🍰'],
    ['Schu', 'le', '🏫'], ['Mu', 'schel', '🐚'], ['Sche', 're', '✂️'],
  ],
  // Stufe 4 - Silben mit Ende: geschlossene Silben, doppelte Mitlaute, ck
  [
    ['Pan', 'da', '🐼'], ['Ap', 'fel', '🍎'], ['Bir', 'ne', '🍐'], ['Tor', 'te', '🎂'],
    ['Am', 'pel', '🚦'], ['Wol', 'ke', '☁️'], ['Son', 'ne', '☀️'], ['Tul', 'pe', '🌷'],
    ['Ker', 'ze', '🕯️'], ['Pin', 'sel', '🖌️'], ['Ham', 'mer', '🔨'], ['Tas', 'se', '☕'],
    ['Kof', 'fer', '🧳'], ['Kat', 'ze', '🐱'], ['So', 'cke', '🧦'], ['Ja', 'cke', '🧥'],
  ],
  // Stufe 5 - Zwei Mitlaute am Silbenanfang
  [
    ['Ze', 'bra', '🦓'], ['Bre', 'zel', '🥨'], ['Kro', 'ne', '👑'], ['Bril', 'le', '👓'],
    ['Trom', 'mel', '🥁'],
  ],
];

export const WOERTER = NACH_STUFE.flatMap((liste, i) =>
  liste.map(([erste, zweite, bild]) => ({ wort: erste + zweite, silben: [erste, zweite], bild, stufe: i + 1 })));

export function mischen(liste) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * `anzahl` Woerter bis zur Stufe `stufe` mit verschiedenen ersten und zweiten Silben,
 * damit die Zuordnung eindeutig ist. Woerter aus `vorige` (letzte Runde) werden
 * vermieden, solange der Pool dann noch reicht.
 */
export function waehleWoerter(stufe, anzahl, vorige = []) {
  const pool = WOERTER.filter(w => w.stufe <= stufe);
  const versuch = (kandidaten) => {
    const auswahl = [];
    for (const w of mischen(kandidaten)) {
      if (auswahl.some(a => a.silben[0] === w.silben[0] || a.silben[1] === w.silben[1])) continue;
      auswahl.push({ ...w });
      if (auswahl.length === anzahl) break;
    }
    return auswahl;
  };
  const auswahl = versuch(pool.filter(w => !vorige.includes(w.wort)));
  return auswahl.length === anzahl ? auswahl : versuch(pool);
}

/** Zweisilbige Woerter mit Bild fuer "Silben verbinden". */
export const WOERTER = [
  ['Ro', 'se', '🌹'], ['Ho', 'se', '👖'], ['Na', 'se', '👃'], ['Ha', 'se', '🐰'],
  ['Kä', 'se', '🧀'], ['Do', 'se', '🥫'], ['Be', 'sen', '🧹'], ['Sei', 'fe', '🧼'],
  ['Ei', 'mer', '🪣'], ['Lei', 'ter', '🪜'], ['O', 'ma', '👵'], ['O', 'pa', '👴'],
  ['U', 'fo', '🛸'], ['I', 'gel', '🦔'], ['Au', 'to', '🚗'], ['So', 'fa', '🛋️'],
  ['Ki', 'wi', '🥝'], ['La', 'ma', '🦙'], ['Ze', 'bra', '🦓'], ['Ti', 'ger', '🐯'],
  ['Lö', 'we', '🦁'], ['Bie', 'ne', '🐝'], ['Rau', 'pe', '🐛'], ['Tau', 'be', '🕊️'],
  ['Ka', 'mel', '🐫'], ['Pan', 'da', '🐼'], ['Ga', 'bel', '🍴'], ['Ap', 'fel', '🍎'],
  ['Bir', 'ne', '🍐'], ['Ku', 'chen', '🍰'], ['Tor', 'te', '🎂'], ['Bre', 'zel', '🥨'],
  ['Am', 'pel', '🚦'], ['Wol', 'ke', '☁️'], ['Son', 'ne', '☀️'], ['Tul', 'pe', '🌷'],
  ['Ker', 'ze', '🕯️'], ['Pin', 'sel', '🖌️'], ['Ham', 'mer', '🔨'], ['Kro', 'ne', '👑'],
  ['Bril', 'le', '👓'], ['Sche', 're', '✂️'], ['Tas', 'se', '☕'], ['Ta', 'xi', '🚕'],
  ['Schu', 'le', '🏫'], ['Mu', 'schel', '🐚'], ['So', 'cke', '🧦'], ['Ja', 'cke', '🧥'],
  ['Kof', 'fer', '🧳'], ['Zie', 'ge', '🐐'], ['Trom', 'mel', '🥁'], ['Kat', 'ze', '🐱'],
].map(([erste, zweite, bild]) => ({ wort: erste + zweite, silben: [erste, zweite], bild }));

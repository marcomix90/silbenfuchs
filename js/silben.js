/** Silben nach Schwierigkeitsstufen + Anlaut-Tabelle fuer die Tipps. */

const VOKALE = ['a', 'e', 'i', 'o', 'u'];
const kombi = (konsonanten, vokale = VOKALE) => konsonanten.flatMap(k => vokale.map(v => k + v));

export const STUFEN = [
  {
    name: 'Lange Laute',
    beispiel: 'ma · lo · su',
    // Konsonanten, die man lang ziehen kann: mmmm-aaaa
    silben: kombi(['m', 'l', 's', 'r', 'n', 'f', 'w']),
  },
  {
    name: 'Kurze Laute',
    beispiel: 'ta · bo · ku',
    silben: kombi(['t', 'b', 'd', 'h', 'k', 'p', 'g', 'z', 'j']),
  },
  {
    name: 'Au, Ei, Eu, Sch',
    beispiel: 'mau · bei · scho',
    silben: [
      'mau', 'lau', 'sau', 'rau', 'bau', 'hau', 'kau', 'tau',
      'mei', 'lei', 'sei', 'rei', 'bei', 'hei', 'wei', 'zei',
      'neu', 'heu', 'leu', 'reu', 'deu',
      'scha', 'sche', 'schi', 'scho', 'schu', 'schau', 'schei',
    ],
  },
  {
    name: 'Silben mit Ende',
    beispiel: 'mal · rot · bin',
    silben: [
      'mal', 'mil', 'mon', 'mus', 'lam', 'lin', 'los', 'lut',
      'sam', 'sel', 'sin', 'son', 'ram', 'rin', 'rot', 'rum',
      'nam', 'nel', 'not', 'fan', 'fel', 'fin', 'fol', 'wal',
      'wil', 'tan', 'tom', 'bal', 'bin', 'bus', 'dam', 'din',
      'hal', 'hin', 'hut', 'kan', 'kim', 'kol', 'pal', 'pin',
    ],
  },
  {
    name: 'Zwei Mitlaute',
    beispiel: 'bla · tri · schmo',
    silben: [
      'bla', 'ble', 'bli', 'blo', 'blu', 'bra', 'bre', 'bri', 'bro', 'bru',
      'fla', 'fli', 'flo', 'fra', 'fri', 'fro', 'gla', 'glu', 'gra', 'gro',
      'kla', 'klo', 'kra', 'kro', 'pla', 'plu', 'pra', 'pro', 'tra', 'tri',
      'tro', 'dra', 'dro', 'schla', 'schlo', 'schma', 'schmi', 'schna', 'schne',
      'schra', 'spa', 'spi', 'spo', 'sta', 'sti', 'sto', 'zwa', 'zwe', 'zwi',
    ],
  },
];

/** Laute in Silben: laengste Schreibung zuerst; sp/st nur am Silbenanfang. */
const LAUTE = {
  sch: { bild: '🐑', wort: 'Schaf' },
  sp: { bild: '🕷️', wort: 'Spinne' },
  st: { bild: '⭐', wort: 'Stern' },
  au: { bild: '🚗', wort: 'Auto' },
  ei: { bild: '🍦', wort: 'Eis' },
  eu: { bild: '🦉', wort: 'Eule' },
  a: { bild: '🐜', wort: 'Ameise' },
  e: { bild: '🍓', wort: 'Erdbeere' },
  i: { bild: '🦔', wort: 'Igel' },
  o: { bild: '👵', wort: 'Oma' },
  u: { bild: '🛸', wort: 'Ufo' },
  m: { bild: '🐭', wort: 'Maus' },
  l: { bild: '🦁', wort: 'Löwe' },
  s: { bild: '☀️', wort: 'Sonne' },
  r: { bild: '🚀', wort: 'Rakete' },
  n: { bild: '👃', wort: 'Nase' },
  f: { bild: '🐟', wort: 'Fisch' },
  w: { bild: '🐳', wort: 'Wal' },
  t: { bild: '🍅', wort: 'Tomate' },
  b: { bild: '⚽', wort: 'Ball' },
  d: { bild: '🦕', wort: 'Dino' },
  h: { bild: '🏠', wort: 'Haus' },
  k: { bild: '🐱', wort: 'Katze' },
  p: { bild: '🐧', wort: 'Pinguin' },
  g: { bild: '🍴', wort: 'Gabel' },
  z: { bild: '🦓', wort: 'Zebra' },
  j: { bild: '🧥', wort: 'Jacke' },
};

export const istVokal = (laut) => /^(a|e|i|o|u|au|ei|eu)$/.test(laut);

/** Zerlegt eine Silbe in ihre Laute: "schmi" -> ["sch", "m", "i"]. */
export function zerlege(silbe) {
  const teile = [];
  let i = 0;
  while (i < silbe.length) {
    const rest = silbe.slice(i);
    const treffer = ['sch', 'sp', 'st', 'au', 'ei', 'eu']
      .find(l => rest.startsWith(l) && (i === 0 || (l !== 'sp' && l !== 'st')));
    const laut = treffer || silbe[i];
    teile.push({ laut, ...(LAUTE[laut] || { bild: '❓', wort: laut }) });
    i += laut.length;
  }
  return teile;
}

/** Schreibweise fuer die Sprachausgabe, damit "me" nicht wie "Mäh" klingt. */
export function fuerStimme(silbe) {
  let s = silbe.replace(/^sp/, 'schp').replace(/^st/, 'scht');
  if (/[aeou]$/.test(s) && !/(au|eu)$/.test(s)) s += 'h';
  else if (/[^e]i$/.test(s)) s += 'e';
  return s;
}

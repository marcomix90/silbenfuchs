/** Spracheingabe (Web Speech API) + nachsichtiger Vergleich gesprochener Silben. */

// Die Erkennung schreibt einzelne Silben gern als Buchstaben: "be" -> "B"
const BUCHSTABEN = {
  a: 'a', b: 'be', c: 'ze', d: 'de', e: 'e', f: 'ef', g: 'ge', h: 'ha', i: 'i',
  j: 'jot', k: 'ka', l: 'el', m: 'em', n: 'en', o: 'o', p: 'pe', q: 'ku', r: 'er',
  s: 'es', t: 'te', u: 'u', v: 'fau', w: 'we', x: 'iks', y: 'ypsilon', z: 'zet',
};

/**
 * Bringt Text auf eine "Lautschrift", in der gleich klingende Schreibungen
 * zusammenfallen: "Kuh" = "ku", "See" = "se", "Mai" = "mei", "Rad" = "rat".
 */
export function lautNormal(text) {
  return (text || '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-zäöü]+/g, ' ')
    .trim()
    .split(' ')
    .map(w => (w.length === 1 && BUCHSTABEN[w]) || w)
    .join(' ')
    .replace(/ie/g, 'i')
    .replace(/([aeiouäöü])h/g, '$1')        // Dehnungs-h
    .replace(/a[iy]|ey/g, 'ei')
    .replace(/äu|o[iy]/g, 'eu')
    .replace(/ä/g, 'e')
    .replace(/ph|v/g, 'f')
    .replace(/ck/g, 'k').replace(/c(?=[aou])/g, 'k')
    .replace(/tz|ts|ds/g, 'z')
    .replace(/qu/g, 'kw').replace(/x/g, 'ks').replace(/y/g, 'i')
    .replace(/\bsch(?=[pt])/g, 's')          // "Schpa" = "Spa"
    .replace(/([a-zöü])\1+/g, '$1')          // doppelte Buchstaben
    .replace(/b\b/g, 'p').replace(/d\b/g, 't').replace(/g\b/g, 'k') // Auslaut
    .trim();
}

const vokale = (w) => w.replace(/[^aeiouöü]/g, '');

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Wurde die Silbe gesagt? `alternativen` sind die Varianten der Erkennung.
 * locker: auch "mal" fuer "ma" und ein Tippfehler bei laengeren Silben.
 */
export function passt(silbe, alternativen, locker = true) {
  const ziel = lautNormal(silbe);
  for (const alt of alternativen) {
    const norm = lautNormal(alt);
    if (!norm) continue;
    const zusammen = norm.replace(/ /g, '');
    if (zusammen === ziel) return true;
    // Kinder wiederholen gern: "ma ma", "Mama"
    if (zusammen.length % ziel.length === 0 && ziel.repeat(zusammen.length / ziel.length) === zusammen) return true;
    for (const wort of norm.split(' ')) {
      if (wort === ziel) return true;
      if (!locker) continue;
      // ein Mitlaut zu viel oder daneben ist ok, ein falscher Selbstlaut ist ein echter Lesefehler
      if (vokale(wort) !== vokale(ziel)) continue;
      if (wort.startsWith(ziel) && wort.length <= ziel.length + 1) return true;   // "mal" fuer "ma"
      if (ziel.length >= 3 && wort.length >= ziel.length && levenshtein(wort, ziel) <= 1) return true;
    }
  }
  return false;
}

/** Duenne Huelle um SpeechRecognition. */
export class Mikrofon {
  constructor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.verfuegbar = !!SR;
    this.laeuft = false;
    if (!SR) return;
    this.erkennung = new SR();
    this.erkennung.lang = 'de-DE';
    this.erkennung.interimResults = true;
    this.erkennung.maxAlternatives = 5;
    this.erkennung.continuous = false;
  }

  /**
   * onZwischen(alternativen[]) -> true beendet vorzeitig (Treffer),
   * onFertig(alternativen[]) - leer, wenn nichts verstanden wurde,
   * onFehler(code)
   */
  start({ onZwischen, onFertig, onFehler }) {
    if (!this.verfuegbar || this.laeuft) return;
    let alternativen = [];
    let erledigt = false;
    const fertig = (liste) => {
      if (erledigt) return;
      erledigt = true;
      onFertig?.(liste);
    };
    this.erkennung.onresult = (e) => {
      const liste = [];
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        for (let j = 0; j < r.length; j++) liste.push(r[j].transcript);
      }
      alternativen = liste;
      const final = [...e.results].every(r => r.isFinal);
      if (!final && onZwischen?.(liste)) {
        fertig(liste);
        this.stop();
      }
    };
    this.erkennung.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // landet in onend
      erledigt = true;
      onFehler?.(e.error);
    };
    this.erkennung.onend = () => {
      this.laeuft = false;
      fertig(alternativen);
    };
    try { this.erkennung.start(); this.laeuft = true; }
    catch { this.laeuft = false; onFehler?.('start-fehlgeschlagen'); }
  }

  stop() { if (this.laeuft) { try { this.erkennung.stop(); } catch {} } }
  abbrechen() {
    if (!this.laeuft) return;
    this.erkennung.onresult = this.erkennung.onend = this.erkennung.onerror = null;
    this.laeuft = false;
    try { this.erkennung.abort(); } catch {}
  }
}

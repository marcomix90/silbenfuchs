/** Spielmodus "Silben verbinden": erste Silbe + Bild links, zweite Silbe rechts verbinden. */
import { WOERTER } from './woerter.js';
import { sounds } from './sound.js';
import { sprich } from './stimme.js';
import { konfetti, belohnung } from './effekte.js';

const ANZAHL = 3;
const PUNKTE_RICHTIG = 5;        // Verbindung ohne vorherigen Fehler bei diesem Wort
const PUNKTE_NACH_FEHLER = 2;
const BONUS_FEHLERFREI = 5;      // alle Woerter einer Runde ohne Fehler
const HINWEIS_NACH = 2;          // Fehler bei einem Wort, bis der Fuchs es vorliest

const LOB = ['Super!', 'Toll!', 'Klasse!', 'Prima!', 'Genau!', 'Richtig!', 'Spitze!'];
const NEIN = ['Das passt nicht zusammen.', 'Hmm, das ist kein Wort.', 'Das war nicht das Richtige.'];
const zufallAus = (liste) => liste[Math.floor(Math.random() * liste.length)];
const SVG = 'http://www.w3.org/2000/svg';

function mischen(liste) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Verbinden {
  /**
   * schreib(text, anfang) - Schreibweise laut Einstellung,
   * punkteGeben(punkte, vonElement) -> Promise (Sterne, Level-up),
   * blase(text), fuchs(klasse)
   */
  constructor({ schreib, punkteGeben, blase, fuchs }) {
    Object.assign(this, { schreib, punkteGeben, blase, fuchs });
    this.feld = document.getElementById('feld');
    this.svg = document.getElementById('linien');
    this.links = document.getElementById('links');
    this.rechts = document.getElementById('rechts');
    this.vorige = [];
    this.runde = 0;          // Zaehler, damit alte Timer nach Rundenwechsel nichts mehr tun
    this.aktiv = false;

    this.feld.addEventListener('pointerdown', (ev) => this.runter(ev));
    this.feld.addEventListener('pointermove', (ev) => this.bewegen(ev));
    this.feld.addEventListener('pointerup', (ev) => this.hoch(ev));
    this.feld.addEventListener('pointercancel', () => this.abbrechen());
    new ResizeObserver(() => this.zeichnen()).observe(this.feld);
  }

  start() {
    this.aktiv = true;
    this.neueRunde();
  }

  stop() {
    this.aktiv = false;
    this.runde++;
    this.abbrechen();
  }

  neueRunde() {
    this.runde++;
    this.abbrechen();
    this.woerter = this.waehleWoerter();
    this.paare = [];         // [linkeKarte, rechteKarte] der richtigen Verbindungen
    this.fehlerRunde = 0;
    for (const w of this.woerter) w.fehler = 0;

    this.links.innerHTML = this.woerter.map((w, i) => `
      <button class="wort-karte rein" type="button" data-seite="links" data-i="${i}" style="--i:${i}">
        <span class="wort-bild">${w.bild}</span>
        <span class="wort-silbe">${this.schreib(w.silben[0].toLowerCase(), true)}</span>
        <span class="punkt"></span>
      </button>`).join('');

    // rechte Spalte mischen, aber nie genau in der Reihenfolge der linken
    let reihenfolge;
    do reihenfolge = mischen(this.woerter.map((_, i) => i));
    while (reihenfolge.every((x, i) => x === i));
    this.rechts.innerHTML = reihenfolge.map((i, pos) => `
      <button class="silben-karte rein" type="button" data-seite="rechts" data-silbe="${this.woerter[i].silben[1]}" style="--i:${pos + ANZAHL}">
        <span class="punkt"></span>
        <span class="wort-silbe">${this.schreib(this.woerter[i].silben[1], false)}</span>
      </button>`).join('');

    // Einflug-Animation danach entfernen, sonst startet sie nach dem Wackeln neu
    this.feld.querySelectorAll('.rein').forEach(k =>
      k.addEventListener('animationend', () => k.classList.remove('rein'), { once: true }));
    this.zeichnen();
    this.fuchs();
    this.blase('Welche Silben gehören zusammen? Zieh einen Strich vom Bild zur passenden Silbe!');
  }

  /** 3 Woerter mit verschiedenen ersten und zweiten Silben, nicht aus der letzten Runde. */
  waehleWoerter() {
    const auswahl = [];
    for (const w of mischen(WOERTER.filter(w => !this.vorige.includes(w.wort)))) {
      if (auswahl.some(a => a.silben[0] === w.silben[0] || a.silben[1] === w.silben[1])) continue;
      auswahl.push({ ...w });
      if (auswahl.length === ANZAHL) break;
    }
    this.vorige = auswahl.map(w => w.wort);
    return auswahl;
  }

  // ---------- Zeichnen ----------
  /** Mittelpunkt des Anschlusspunkts einer Karte, relativ zum Feld. */
  punktVon(karte) {
    const f = this.feld.getBoundingClientRect();
    const r = karte.querySelector('.punkt').getBoundingClientRect();
    return { x: r.left + r.width / 2 - f.left, y: r.top + r.height / 2 - f.top };
  }

  linie(von, nach, klasse) {
    const l = document.createElementNS(SVG, 'line');
    l.setAttribute('x1', von.x); l.setAttribute('y1', von.y);
    l.setAttribute('x2', nach.x); l.setAttribute('y2', nach.y);
    l.setAttribute('class', `linie ${klasse}`);
    l.setAttribute('pathLength', '1');
    this.svg.append(l);
    return l;
  }

  /** Feste Linien neu zeichnen (z. B. nach Drehen des Handys). */
  zeichnen() {
    this.svg.querySelectorAll('.fest').forEach(l => l.remove());
    for (const [a, b] of this.paare || []) this.linie(this.punktVon(a), this.punktVon(b), 'fest');
  }

  // ---------- Ziehen und Tippen ----------
  waehle(karte) {
    this.auswahl?.classList.remove('gewaehlt');
    this.auswahl = karte;
    karte?.classList.add('gewaehlt');
  }

  runter(ev) {
    const karte = ev.target.closest('[data-seite]');
    if (!karte || karte.classList.contains('fertig')) return;
    ev.preventDefault();
    // zweiter Tipp auf die andere Seite verbindet (fuer Kinder, die nicht ziehen moegen)
    if (this.auswahl && this.auswahl.dataset.seite !== karte.dataset.seite) {
      this.pruefen(this.auswahl, karte);
      return;
    }
    sounds.klick();
    this.waehle(karte);
    const start = this.punktVon(karte);
    this.ziehen = { id: ev.pointerId, start, x: ev.clientX, y: ev.clientY, bewegt: false };
    this.temp = this.linie(start, start, 'temp');
    this.feld.setPointerCapture(ev.pointerId);
  }

  bewegen(ev) {
    const z = this.ziehen;
    if (!z || ev.pointerId !== z.id) return;
    if (Math.hypot(ev.clientX - z.x, ev.clientY - z.y) > 8) z.bewegt = true;
    const f = this.feld.getBoundingClientRect();
    this.temp.setAttribute('x2', ev.clientX - f.left);
    this.temp.setAttribute('y2', ev.clientY - f.top);
    const ziel = this.zielUnter(ev);
    this.feld.querySelectorAll('.ueber').forEach(k => k !== ziel && k.classList.remove('ueber'));
    ziel?.classList.add('ueber');
  }

  hoch(ev) {
    const z = this.ziehen;
    if (!z || ev.pointerId !== z.id) return;
    this.ziehen = null;
    this.temp?.remove();
    this.feld.querySelectorAll('.ueber').forEach(k => k.classList.remove('ueber'));
    const ziel = this.zielUnter(ev);
    if (ziel) this.pruefen(this.auswahl, ziel);
    else if (z.bewegt) this.waehle(null);   // ins Leere gezogen
    // nur getippt: Auswahl bleibt, der naechste Tipp auf die andere Seite verbindet
  }

  /** Freie Karte der Gegenseite unter dem Finger. */
  zielUnter(ev) {
    const karte = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-seite]');
    if (!karte || !this.auswahl || karte.classList.contains('fertig')) return null;
    return karte.dataset.seite !== this.auswahl.dataset.seite ? karte : null;
  }

  abbrechen() {
    this.ziehen = null;
    this.temp?.remove();
    this.waehle(null);
  }

  // ---------- Auswerten ----------
  pruefen(a, b) {
    this.waehle(null);
    const links = a.dataset.seite === 'links' ? a : b;
    const rechts = links === a ? b : a;
    const wort = this.woerter[links.dataset.i];
    const von = this.punktVon(links), nach = this.punktVon(rechts);
    if (rechts.dataset.silbe === wort.silben[1]) this.richtig(wort, links, rechts, von, nach);
    else this.falsch(wort, links, rechts, von, nach);
  }

  async richtig(wort, links, rechts, von, nach) {
    const runde = this.runde;
    this.paare.push([links, rechts]);
    links.classList.add('fertig');
    rechts.classList.add('fertig');
    this.linie(von, nach, 'fest neu');
    sounds.richtig();
    this.fuchs('huepf');
    const f = this.feld.getBoundingClientRect();
    konfetti(f.left + (von.x + nach.x) / 2, f.top + (von.y + nach.y) / 2, 35);

    const [erste, zweite] = wort.silben;
    this.blase(`${zufallAus(LOB)} ${erste} + ${zweite} = ${wort.wort} ${wort.bild}`);
    sprich(wort.wort);

    const fertig = this.paare.length === ANZAHL;
    await this.punkteGeben(wort.fehler ? PUNKTE_NACH_FEHLER : PUNKTE_RICHTIG, rechts);
    if (fertig && runde === this.runde) this.rundeGeschafft(runde);
  }

  async rundeGeschafft(runde) {
    const fehlerfrei = this.fehlerRunde === 0;
    belohnung(this.feld);
    const text = fehlerfrei ? 'Alle Wörter ohne Fehler verbunden!' : 'Alle Wörter verbunden!';
    this.blase(`🎉 ${text}${fehlerfrei ? ` +${BONUS_FEHLERFREI} extra` : ''}`);
    const gesprochen = sprich(`Super! ${text}`);
    if (fehlerfrei) await this.punkteGeben(BONUS_FEHLERFREI, this.feld, gesprochen);
    else await gesprochen;
    await new Promise(r => setTimeout(r, 800));
    if (runde === this.runde && this.aktiv) this.neueRunde();
  }

  falsch(wort, links, rechts, von, nach) {
    wort.fehler++;
    this.fehlerRunde++;
    const l = this.linie(von, nach, 'falsch');
    setTimeout(() => l.remove(), 900);
    sounds.falsch();
    this.fuchs('gruebel');
    for (const k of [links, rechts]) {
      k.classList.remove('wackel');
      void k.offsetWidth;
      k.classList.add('wackel');
      k.addEventListener('animationend', () => k.classList.remove('wackel'), { once: true });
    }
    const erste = wort.silben[0];
    const zweite = rechts.dataset.silbe;
    if (wort.fehler >= HINWEIS_NACH) {
      // Hinweis: das Wort zum Bild vorlesen, die Silbe muss das Kind selbst finden
      this.blase(`💡 Hör mal: ${wort.bild} „${wort.wort}“. ${erste} … welche Silbe fehlt?`);
      sprich(`Hör mal: ${wort.wort}. ${wort.wort}. Welche Silbe fehlt?`);
    } else {
      const text = zufallAus(NEIN);
      this.blase(`${text} ${erste} + ${zweite} – probier eine andere Silbe!`);
      sprich(`${text} Probier es nochmal!`);
    }
  }
}

/** Spielmodus "Silben verbinden": erste Silbe + Bild links, zweite Silbe rechts verbinden. */
import { waehleWoerter, mischen } from './woerter.js';
import { sounds } from './sound.js';
import { sprich } from './stimme.js';
import { konfetti, belohnung } from './effekte.js';

const ANZAHL = 3;
const PUNKTE_RICHTIG = 5;        // Verbindung ohne vorherigen Fehler bei diesem Wort
const PUNKTE_NACH_FEHLER = 2;
const BONUS_FEHLERFREI = 5;      // alle Woerter einer Runde ohne Fehler
const HINWEIS_NACH = 2;          // Fehler bei einem Wort, bis der Fuchs es vorliest
const FANGRADIUS = 40;           // px: so weit daneben darf ein Finger eine Karte noch greifen
const ZIELRADIUS = 24;           // px: ab hier rastet die Linie an der Zielsilbe ein

const LOB = ['Super!', 'Toll!', 'Klasse!', 'Prima!', 'Genau!', 'Richtig!', 'Spitze!'];
const NEIN = ['Das passt nicht zusammen.', 'Hmm, das ist kein Wort.', 'Das war nicht das Richtige.'];
const zufallAus = (liste) => liste[Math.floor(Math.random() * liste.length)];
const SVG = 'http://www.w3.org/2000/svg';

export class Verbinden {
  /**
   * schreib(text, anfang) - Schreibweise laut Einstellung,
   * punkteGeben(punkte, vonElement) -> Promise (Sterne, Level-up),
   * blase(text), fuchs(klasse), stufe() - aktuelle Schwierigkeitsstufe (1-5)
   */
  constructor({ schreib, punkteGeben, blase, fuchs, stufe }) {
    Object.assign(this, { schreib, punkteGeben, blase, fuchs, stufe });
    this.feld = document.getElementById('feld');
    this.svg = document.getElementById('linien');
    this.links = document.getElementById('links');
    this.rechts = document.getElementById('rechts');
    this.vorige = [];
    this.runde = 0;          // Zaehler, damit alte Timer nach Rundenwechsel nichts mehr tun
    this.aktiv = false;

    // auf der ganzen Buehne lauschen, damit auch Beruehrungen knapp neben dem Feld zaehlen
    this.flaeche = this.feld.closest('.buehne');
    this.flaeche.addEventListener('pointerdown', (ev) => this.runter(ev));
    this.flaeche.addEventListener('pointermove', (ev) => this.bewegen(ev));
    this.flaeche.addEventListener('pointerup', (ev) => this.hoch(ev));
    this.flaeche.addEventListener('pointercancel', (ev) => this.abbrechenFuer(ev));
    this.flaeche.addEventListener('lostpointercapture', (ev) => this.abbrechenFuer(ev));
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
    this.svg.replaceChildren();   // auch Reste alter Linien sicher entfernen
    this.woerter = waehleWoerter(this.stufe(), ANZAHL, this.vorige);
    this.vorige = this.woerter.map(w => w.wort);
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

  /** Freie Karten einer Seite ('links'/'rechts'); ohne Angabe alle freien. */
  freieKarten(seite) {
    const sel = seite ? `[data-seite="${seite}"]` : '[data-seite]';
    return [...this.feld.querySelectorAll(sel)].filter(k => !k.classList.contains('fertig'));
  }

  /** Naechste freie Karte zum Finger, hoechstens `radius` daneben (Karte oder Punkt). */
  karteNahe(ev, seite, radius = FANGRADIUS) {
    let beste = null, besterAbstand = radius;
    for (const k of this.freieKarten(seite)) {
      const abstand = Math.min(abstandZuRechteck(ev, k.getBoundingClientRect()),
        abstandZuRechteck(ev, k.querySelector('.punkt').getBoundingClientRect()));
      if (abstand <= besterAbstand) { beste = k; besterAbstand = abstand; }
    }
    return beste;
  }

  runter(ev) {
    if (this.ziehen) return;   // zweiter Finger oder Handballen waehrend des Ziehens
    const gegenseite = this.auswahl && (this.auswahl.dataset.seite === 'links' ? 'rechts' : 'links');
    // zweiter Tipp auf die andere Seite verbindet (fuer Kinder, die nicht ziehen moegen)
    const ziel = gegenseite && this.karteNahe(ev, gegenseite);
    if (ziel) {
      ev.preventDefault();
      this.pruefen(this.auswahl, ziel);
      return;
    }
    const karte = this.karteNahe(ev);
    if (!karte) return;
    ev.preventDefault();
    sounds.klick();
    this.waehle(karte);
    const start = this.punktVon(karte);
    this.ziehen = { id: ev.pointerId, start, x: ev.clientX, y: ev.clientY, bewegt: false };
    this.tempEntfernen();
    this.temp = this.linie(start, start, 'temp');
    try { this.flaeche.setPointerCapture(ev.pointerId); } catch {}
  }

  bewegen(ev) {
    const z = this.ziehen;
    if (!z || ev.pointerId !== z.id) return;
    if (Math.hypot(ev.clientX - z.x, ev.clientY - z.y) > 8) z.bewegt = true;
    // Magnet: ist ein Ziel in Reichweite, rastet das Linienende an dessen Punkt ein
    const ziel = this.zielFuer(ev);
    let ende;
    if (ziel) ende = this.punktVon(ziel);
    else {
      const f = this.feld.getBoundingClientRect();
      ende = { x: ev.clientX - f.left, y: ev.clientY - f.top };
    }
    this.temp.setAttribute('x2', ende.x);
    this.temp.setAttribute('y2', ende.y);
    this.temp.classList.toggle('rastet', !!ziel);
    this.feld.querySelectorAll('.ueber').forEach(k => k !== ziel && k.classList.remove('ueber'));
    ziel?.classList.add('ueber');
  }

  hoch(ev) {
    const z = this.ziehen;
    if (!z || ev.pointerId !== z.id) return;
    this.ziehen = null;
    this.tempEntfernen();
    const ziel = this.zielFuer(ev);
    if (ziel) this.pruefen(this.auswahl, ziel);
    else if (z.bewegt) this.waehle(null);   // auf der eigenen Seite oder ausserhalb losgelassen
    // nur getippt: Auswahl bleibt, der naechste Tipp auf die andere Seite verbindet
  }

  /** Ziel beim Ziehen: freie Karte der Gegenseite, sobald der Finger nah an ihr oder ihrem Punkt ist. */
  zielFuer(ev) {
    if (!this.auswahl) return null;
    return this.karteNahe(ev, this.auswahl.dataset.seite === 'links' ? 'rechts' : 'links', ZIELRADIUS);
  }

  tempEntfernen() {
    this.svg.querySelectorAll('.temp').forEach(l => l.remove());
    this.temp = null;
    this.feld.querySelectorAll('.ueber').forEach(k => k.classList.remove('ueber'));
  }

  /** Abbruch durch den Browser (z. B. Wischgeste vom Rand) fuer den ziehenden Finger. */
  abbrechenFuer(ev) {
    if (this.ziehen && ev.pointerId === this.ziehen.id) this.abbrechen();
  }

  abbrechen() {
    this.ziehen = null;
    this.tempEntfernen();
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

/** Abstand eines Fingers zu einem Rechteck (0, wenn er darin liegt). */
function abstandZuRechteck(ev, r) {
  const dx = Math.max(r.left - ev.clientX, 0, ev.clientX - r.right);
  const dy = Math.max(r.top - ev.clientY, 0, ev.clientY - r.bottom);
  return Math.hypot(dx, dy);
}

/** Silbenfuchs: Silbe erscheint, Kind liest vor, Spracherkennung prueft. */
import { STUFEN, zerlege, istVokal, fuerStimme } from './silben.js';
import { Mikrofon, passt } from './speech.js';
import { sounds, tonAn, entsperren } from './sound.js';
import { sprich, stimmeAn, stumm } from './stimme.js';
import { belohnung, sterneFliegen, konfetti, ballons } from './effekte.js';

const SPEICHER = 'silbenfuchs-v1';
const TIPP_NACH = 2;        // Fehlversuche bis zum Tipp
const LOESUNG_NACH = 4;     // Fehlversuche bis zur Aufloesung
const PUNKTE_ERSTER = 10;
const PUNKTE_ZWEITER = 7;
const PUNKTE_MIT_TIPP = 4;
const PUNKTE_NACHGESPROCHEN = 2;
const SERIE_BONUS = 5;      // alle 5 richtigen in Folge

const TITEL = [
  ['🥚', 'ein', 'Silben-Ei'], ['🐣', 'ein', 'Küken'], ['🐦', 'ein', 'Spatz'],
  ['🦔', 'ein', 'Igel'], ['🐰', 'ein', 'Hase'], ['🦊', 'ein', 'Fuchs'],
  ['🦉', 'eine', 'Eule'], ['🦁', 'ein', 'Löwe'], ['🐉', 'ein', 'Drache'],
  ['👑', 'ein', 'Silben-König'],
];
const titel = (level) => TITEL[Math.min(level, TITEL.length) - 1];

const LOB = ['Super!', 'Toll gemacht!', 'Klasse!', 'Prima!', 'Spitze!', 'Wunderbar!', 'Genau!', 'Richtig!', 'Bravo!'];
const MUT = ['Fast! Versuch es nochmal.', 'Schau genau hin und probier es nochmal!', 'Nochmal – du schaffst das!'];
const FRAGE = ['Lies mir die Silbe vor!', 'Was steht hier?', 'Kannst du das lesen?', 'Und diese Silbe?'];
const zufallAus = (liste) => liste[Math.floor(Math.random() * liste.length)];
const warte = (ms) => new Promise(r => setTimeout(r, ms));

// ---------- Spielstand ----------
const STANDARD = {
  punkte: 0, richtig: 0, serie: 0,
  einstellungen: {
    eingabe: 'auto', schrift: 'normal', vokale: false, genauigkeit: 'locker',
    stufe: 'auto', stimme: true, toene: true,
  },
};

function laden() {
  try {
    const s = JSON.parse(localStorage.getItem(SPEICHER));
    if (s) return { ...STANDARD, ...s, einstellungen: { ...STANDARD.einstellungen, ...s.einstellungen } };
  } catch {}
  return structuredClone(STANDARD);
}
const speichern = () => { try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch {} };

let stand = laden();
const e = () => stand.einstellungen;

/** Level aus Punkten: Level n braucht 40 + 10·n Punkte bis zum naechsten. */
function levelInfo(punkte) {
  let level = 1, start = 0;
  for (;;) {
    const bedarf = 40 + level * 10;
    if (punkte < start + bedarf) return { level, fortschritt: (punkte - start) / bedarf };
    start += bedarf;
    level++;
  }
}

const autoStufe = (level) => Math.min(STUFEN.length, Math.ceil(level / 2));
const aktuelleStufe = () =>
  e().stufe === 'auto' ? autoStufe(levelInfo(stand.punkte).level) : Number(e().stufe);

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const el = {
  karte: $('karte'), silbe: $('silbe'), tipp: $('tipp'), gehoert: $('gehoert'),
  blase: $('blase'), fuchs: $('fuchs'), punkte: $('punkte'), punkteZahl: $('punkte-zahl'),
  mikroBtn: $('mikro-btn'), eltern: $('eltern'), tippBtn: $('tipp-btn'),
  anhoerenBtn: $('anhoeren-btn'), weiterBtn: $('weiter-btn'),
};

function zeigeScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('aktiv', s.id === `screen-${name}`));
}

/** Schreibweise laut Einstellung; `anfang` = Wortanfang (gross im Modus "Ma"). */
function schreib(text, anfang = true) {
  if (e().schrift === 'gross') return text.toUpperCase();
  if (e().schrift === 'normal' && anfang) return text[0].toUpperCase() + text.slice(1);
  return text;
}

function silbeHtml(silbe, vokaleFaerben) {
  return zerlege(silbe)
    .map((l, i) => {
      const t = schreib(l.laut, i === 0);
      return vokaleFaerben && istVokal(l.laut) ? `<span class="vokal">${t}</span>` : t;
    })
    .join('');
}

function blase(text) {
  el.blase.textContent = text;
  el.blase.classList.remove('neu');
  void el.blase.offsetWidth;
  el.blase.classList.add('neu');
}

function fuchs(klasse) {
  el.fuchs.classList.remove('huepf', 'gruebel');
  void el.fuchs.offsetWidth;
  if (klasse) el.fuchs.classList.add(klasse);
}

function kopfAktualisieren() {
  const { level, fortschritt } = levelInfo(stand.punkte);
  const [bild, , name] = titel(level);
  $('level-bild').textContent = bild;
  $('level-text').textContent = `Level ${level}`;
  $('balken-fuell').style.width = `${Math.round(fortschritt * 100)}%`;
  el.punkteZahl.textContent = stand.punkte;
  $('start-bild').textContent = bild;
  $('start-level').textContent = `Level ${level}`;
  $('start-titel').textContent = name;
  $('start-punkte').textContent = stand.punkte;
}

// ---------- Eingabe ----------
const mikro = new Mikrofon();
let mikroGesperrt = false;

const nimmMikro = () =>
  e().eingabe === 'mikro' || (e().eingabe === 'auto' && mikro.verfuegbar && !mikroGesperrt);

function eingabeAnzeigen() {
  const mitMikro = nimmMikro();
  el.mikroBtn.hidden = !mitMikro;
  el.eltern.hidden = mitMikro;
  const hinweis = $('mikro-hinweis');
  hinweis.hidden = mikro.verfuegbar;
  hinweis.textContent = 'Dieser Browser kann keine Spracheingabe (am besten Chrome oder Safari nehmen). '
    + 'Ein Erwachsener kann stattdessen auf ✔ oder ✘ tippen.';
}

/** Mikro-Zustand: 'wartet' (startet noch), 'hoert' (nimmt auf) oder aus. */
function hoert(zustand) {
  el.mikroBtn.classList.toggle('wartet', zustand === 'wartet');
  el.mikroBtn.classList.toggle('hoert', zustand === 'hoert');
  el.karte.classList.toggle('hoert', zustand === 'hoert');
}

async function zuhoeren() {
  if (!runde || runde.fertig || besetzt) return;
  if (mikro.laeuft) { mikro.stop(); return; }
  if (!mikro.verfuegbar) {
    blase('Dieser Browser kann leider nicht zuhören. Schalte in den Einstellungen auf „Eltern bewerten“.');
    return;
  }
  stumm();
  el.gehoert.textContent = '';
  hoert('wartet');
  blase('Moment … ⏳');
  const locker = e().genauigkeit === 'locker';
  const silbe = runde.silbe;
  mikro.start({
    onBereit: () => {
      hoert('hoert');
      blase('Jetzt! Ich höre zu … 👂');
    },
    onZwischen: (alt) => passt(silbe, alt, locker),
    onFertig: (alt) => {
      hoert(false);
      if (runde?.silbe !== silbe) return;
      if (!alt.length) {
        runde.nichtsGehoert++;
        blase(runde.nichtsGehoert >= 2
          ? `Ich habe nichts gehört. Tipp: Sag die Silbe zweimal hintereinander, z. B. „${schreib(silbe)} – ${schreib(silbe)}“.`
          : 'Ich habe nichts gehört. Warte auf „Jetzt!“ und lies dann laut vor.');
        return;
      }
      if (passt(silbe, alt, locker)) richtig();
      else falsch(alt[alt.length - 1]);
    },
    onFehler: (code) => {
      hoert(false);
      mikroFehler(code);
    },
  });
}

function mikroFehler(code) {
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    mikroGesperrt = true;
    eingabeAnzeigen();
    blase('Ich darf das Mikrofon nicht benutzen. Ein Erwachsener kann es erlauben – oder mit ✔ und ✘ bewerten.');
  } else if (code === 'network') {
    blase('Für das Zuhören brauche ich Internet. Ist das WLAN an?');
  } else if (code === 'audio-capture') {
    blase('Ich finde kein Mikrofon. 🤔');
  } else {
    blase('Hoppla, das hat nicht geklappt. Drück nochmal aufs Mikro!');
  }
}

// ---------- Runden ----------
let runde = null;
let besetzt = false;     // waehrend Belohnung/Level-up keine Eingaben
const verlauf = [];

function waehleSilbe() {
  const s = aktuelleStufe();
  // im Automatik-Modus ab und zu Silben aus frueheren Stufen wiederholen
  const wiederholen = e().stufe === 'auto' && s > 1 && Math.random() < 0.3;
  const stufe = wiederholen ? Math.floor(Math.random() * (s - 1)) : s - 1;
  const pool = STUFEN[stufe].silben.filter(x => !verlauf.includes(x));
  const silbe = zufallAus(pool);
  verlauf.push(silbe);
  if (verlauf.length > 8) verlauf.shift();
  return silbe;
}

function silbeZeigen() {
  el.silbe.innerHTML = silbeHtml(runde.silbe, e().vokale || runde.tipp);
}

function neueRunde() {
  mikro.abbrechen();
  hoert(false);
  runde = { silbe: waehleSilbe(), fehler: 0, nichtsGehoert: 0, tipp: false, geloest: false, fertig: false };
  silbeZeigen();
  el.karte.className = 'karte';
  void el.karte.offsetWidth;
  el.karte.classList.add('rein');
  el.tipp.hidden = true;
  el.tipp.innerHTML = '';
  el.gehoert.textContent = '';
  el.tippBtn.hidden = false;
  el.anhoerenBtn.hidden = true;
  el.weiterBtn.classList.remove('leuchtet');
  fuchs();
  blase(zufallAus(FRAGE));
}

async function richtig() {
  if (!runde || runde.fertig) return;
  runde.fertig = true;
  besetzt = true;

  let punkte;
  if (runde.geloest) punkte = PUNKTE_NACHGESPROCHEN;
  else if (runde.tipp) punkte = PUNKTE_MIT_TIPP;
  else punkte = runde.fehler === 0 ? PUNKTE_ERSTER : PUNKTE_ZWEITER;

  let bonus = 0;
  if (runde.geloest) stand.serie = 0;
  else {
    stand.serie++;
    stand.richtig++;
    if (stand.serie % SERIE_BONUS === 0) bonus = SERIE_BONUS;
  }
  const levelVorher = levelInfo(stand.punkte).level;
  stand.punkte += punkte + bonus;
  speichern();

  const lob = runde.geloest ? 'Gut nachgesprochen!' : zufallAus(LOB);
  sounds.richtig();
  silbeZeigen();
  el.karte.classList.add('jubel');
  fuchs('huepf');
  plusZeigen(punkte + bonus);
  belohnung(el.karte);
  blase(bonus ? `${lob} 🔥 ${stand.serie} richtig hintereinander! +${bonus} extra` : lob);
  el.gehoert.textContent = '';
  const gesprochen = sprich(lob);

  await sterneFliegen(el.karte, el.punkte, Math.ceil((punkte + bonus) / 2));
  el.punkte.classList.remove('pop');
  void el.punkte.offsetWidth;
  el.punkte.classList.add('pop');
  kopfAktualisieren();

  const levelNachher = levelInfo(stand.punkte).level;
  await gesprochen;
  if (levelNachher > levelVorher) await levelGeschafft(levelNachher, levelVorher);
  else await warte(500);
  besetzt = false;
  if (runde) neueRunde();  // null, wenn inzwischen zurueck zum Start
}

function plusZeigen(wert) {
  const p = document.createElement('span');
  p.className = 'plus';
  p.textContent = `+${wert}`;
  el.karte.append(p);
  p.addEventListener('animationend', () => p.remove());
}

async function falsch(gehoert) {
  if (!runde || runde.fertig) return;
  runde.fehler++;
  stand.serie = 0;
  speichern();
  sounds.falsch();
  el.karte.classList.remove('wackel');
  void el.karte.offsetWidth;
  el.karte.classList.add('wackel');
  fuchs('gruebel');
  el.gehoert.textContent = gehoert ? `Ich habe „${gehoert}“ verstanden.` : '';

  if (runde.geloest) {
    blase('Hör nochmal genau hin und sprich mir nach!');
    await sprich(`Hör genau hin: ${fuerStimme(runde.silbe)}`);
    return;
  }
  if (runde.fehler >= LOESUNG_NACH) return loesen();
  if (runde.fehler >= TIPP_NACH && !runde.tipp) return tippZeigen();
  const text = zufallAus(MUT);
  blase(text);
  await sprich(text);
}

async function tippZeigen() {
  if (!runde || runde.fertig || runde.tipp) return;
  runde.tipp = true;
  sounds.tipp();
  const laute = zerlege(runde.silbe);
  el.tipp.innerHTML = laute.map((l, i) => `
    <div class="laut${istVokal(l.laut) ? ' vokal' : ''}" style="--i:${i}">
      <span class="laut-bild">${l.bild}</span>
      <span class="laut-text">${schreib(l.laut, i === 0)}</span>
      <span class="laut-wort">${l.wort}</span>
    </div>`).join('<span class="laut-plus">+</span>');
  el.tipp.hidden = false;
  el.tippBtn.hidden = true;
  silbeZeigen();
  blase('💡 Tipp: Sprich die Anfangslaute nacheinander und zieh sie zusammen!');
  await sprich(`Ein Tipp! Hör auf die Anfänge: ${laute.map(l => l.wort).join(', ')}. Zieh die Laute zusammen!`);
}

async function loesen() {
  runde.geloest = true;
  if (!runde.tipp) await tippZeigen();
  el.karte.classList.add('geloest');
  el.tippBtn.hidden = true;
  el.anhoerenBtn.hidden = false;
  el.weiterBtn.classList.add('leuchtet');
  const geschrieben = schreib(runde.silbe);
  blase(`Das heißt „${geschrieben}“. Sprich mir nach – oder tippe auf ⏭.`);
  await sprich(`Das heißt: ${fuerStimme(runde.silbe)}. Sprich mir nach!`);
}

function levelGeschafft(level, levelVorher) {
  return new Promise((weiter) => {
    sounds.levelUp();
    konfetti(0, 0, 180, true);
    ballons(10);
    const [bild, artikel, name] = titel(level);
    $('levelup-bild').textContent = bild;
    $('levelup-titel').textContent = `Level ${level}!`;
    $('levelup-text').textContent = `Du bist jetzt ${artikel} ${name}!`;
    const neueStufe = e().stufe === 'auto' && autoStufe(level) > autoStufe(levelVorher);
    const neu = $('levelup-neu');
    neu.hidden = !neueStufe;
    if (neueStufe) {
      const st = STUFEN[autoStufe(level) - 1];
      neu.textContent = `Neue Silben: ${st.name} (${st.beispiel})`;
    }
    const overlay = $('levelup');
    overlay.hidden = false;
    sprich(`Hurra! Level ${level}! Du bist jetzt ${artikel} ${name}!`);
    $('levelup-btn').onclick = () => {
      sounds.klick();
      stumm();
      overlay.hidden = true;
      weiter();
    };
  });
}

// ---------- Einstellungen ----------
const dialog = $('einstellungen');
const form = dialog.querySelector('form');

const stufeAuswahl = $('stufe-auswahl');
stufeAuswahl.innerHTML = '<option value="auto">automatisch nach Level</option>'
  + STUFEN.map((s, i) => `<option value="${i + 1}">Stufe ${i + 1}: ${s.name} (${s.beispiel})</option>`).join('');

function einstellungenAnwenden() {
  tonAn(e().toene);
  stimmeAn(e().stimme);
  eingabeAnzeigen();
  if (runde) silbeZeigen();
}

function formularFuellen() {
  for (const [name, wert] of Object.entries(e())) {
    const feld = form.elements[name];
    if (!feld) continue;
    if (feld.type === 'checkbox') feld.checked = wert;
    else feld.value = String(wert);
  }
}

form.addEventListener('change', () => {
  const alteStufe = e().stufe;
  for (const name of Object.keys(e())) {
    const feld = form.elements[name];
    if (!feld) continue;
    e()[name] = feld.type === 'checkbox' ? feld.checked : feld.value;
  }
  speichern();
  einstellungenAnwenden();
  if (e().stufe !== alteStufe) verlauf.length = 0;
});

$('einstellungen-btn').addEventListener('click', () => {
  formularFuellen();
  dialog.showModal();
});

$('reset-btn').addEventListener('click', () => {
  if (!confirm('Wirklich alle Punkte und Level löschen?')) return;
  stand = { ...structuredClone(STANDARD), einstellungen: e() };
  speichern();
  kopfAktualisieren();
});

// ---------- Bedienung ----------
$('los-btn').addEventListener('click', () => {
  entsperren();
  sounds.klick();
  zeigeScreen('spiel');
  neueRunde();
  sprich(el.blase.textContent);
});

$('zurueck-btn').addEventListener('click', () => {
  mikro.abbrechen();
  stumm();
  runde = null;
  kopfAktualisieren();
  zeigeScreen('start');
});

el.mikroBtn.addEventListener('click', zuhoeren);
$('eltern-richtig').addEventListener('click', () => { if (!besetzt) richtig(); });
$('eltern-falsch').addEventListener('click', () => { if (!besetzt) falsch(null); });
el.tippBtn.addEventListener('click', () => { if (!besetzt) tippZeigen(); });
el.anhoerenBtn.addEventListener('click', () => { if (runde) sprich(fuerStimme(runde.silbe)); });
el.weiterBtn.addEventListener('click', () => {
  if (besetzt || !runde) return;
  sounds.klick();
  stumm();
  if (!runde.geloest) { stand.serie = 0; speichern(); }
  neueRunde();
});

// Leertaste = Mikro (praktisch am Rechner)
document.addEventListener('keydown', (ev) => {
  if (ev.code !== 'Space' || !$('screen-spiel').classList.contains('aktiv') || dialog.open) return;
  ev.preventDefault();
  if (nimmMikro()) zuhoeren();
});

// ---------- Installation / Offline ----------
let installEvent = null;
addEventListener('beforeinstallprompt', (ev) => {
  ev.preventDefault();
  installEvent = ev;
  $('install-btn').hidden = false;
});
$('install-btn').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  $('install-btn').hidden = true;
});

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

einstellungenAnwenden();
kopfAktualisieren();

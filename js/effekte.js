/** Belohnungs-Animationen: Konfetti, fliegende Sterne, huepfende Tiere, Ballons. */
import { sounds } from './sound.js';

const FARBEN = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff', '#ff9f45'];
const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const zufall = (a, b) => a + Math.random() * (b - a);
const mitte = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

// ---------- Konfetti auf einer Canvas-Ebene ----------
let canvas, c2d, teilchen = [], laeuft = false;

function canvasHolen() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.className = 'effekt-ebene';
  document.body.append(canvas);
  c2d = canvas.getContext('2d');
  const groesse = () => {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    c2d.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  };
  addEventListener('resize', groesse);
  groesse();
}

function schritt() {
  c2d.clearRect(0, 0, innerWidth, innerHeight);
  teilchen = teilchen.filter(t => t.y < innerHeight + 30 && t.leben > 0);
  for (const t of teilchen) {
    t.vy += 0.25;
    t.vx *= 0.99;
    t.x += t.vx;
    t.y += t.vy;
    t.drehung += t.vd;
    t.leben--;
    c2d.save();
    c2d.translate(t.x, t.y);
    c2d.rotate(t.drehung);
    c2d.globalAlpha = Math.min(1, t.leben / 30);
    c2d.fillStyle = t.farbe;
    if (t.rund) { c2d.beginPath(); c2d.arc(0, 0, t.g / 2, 0, Math.PI * 2); c2d.fill(); }
    else c2d.fillRect(-t.g / 2, -t.g / 4, t.g, t.g / 2);
    c2d.restore();
  }
  if (teilchen.length) requestAnimationFrame(schritt);
  else { laeuft = false; c2d.clearRect(0, 0, innerWidth, innerHeight); }
}

/** Konfetti-Explosion an Position x/y (oder Regen von oben mit regen=true). */
export function konfetti(x, y, anzahl = 70, regen = false) {
  if (ruhig()) return;
  canvasHolen();
  for (let i = 0; i < anzahl; i++) {
    const winkel = zufall(0, Math.PI * 2);
    const tempo = zufall(4, 11);
    teilchen.push({
      x: regen ? zufall(0, innerWidth) : x,
      y: regen ? zufall(-innerHeight * 0.6, -10) : y,
      vx: regen ? zufall(-1.5, 1.5) : Math.cos(winkel) * tempo,
      vy: regen ? zufall(1, 4) : Math.sin(winkel) * tempo - 5,
      g: zufall(7, 13),
      farbe: FARBEN[i % FARBEN.length],
      drehung: zufall(0, 6), vd: zufall(-0.25, 0.25),
      rund: Math.random() < 0.3,
      leben: regen ? 260 : 140,
    });
  }
  if (!laeuft) { laeuft = true; requestAnimationFrame(schritt); }
}

// ---------- Emoji-Animationen mit der Web Animations API ----------
function emoji(zeichen, x, y, groesse = 40) {
  const el = document.createElement('div');
  el.className = 'effekt-emoji';
  el.textContent = zeichen;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.fontSize = `${groesse}px`;
  document.body.append(el);
  return el;
}

/** Sterne fliegen von `von` zum Punktezaehler `nach`. */
export function sterneFliegen(von, nach, anzahl = 5) {
  const start = mitte(von);
  const ziel = mitte(nach);
  if (ruhig()) return Promise.resolve();
  const fluege = Array.from({ length: anzahl }, (_, i) => {
    const el = emoji('⭐', start.x, start.y, 34);
    const bogenX = zufall(-120, 120), bogenY = zufall(-160, -60);
    return el.animate([
      { transform: 'translate(-50%,-50%) scale(0.3)', opacity: 0 },
      { transform: `translate(calc(-50% + ${bogenX}px), calc(-50% + ${bogenY}px)) scale(1.3)`, opacity: 1, offset: 0.35 },
      { transform: `translate(calc(-50% + ${ziel.x - start.x}px), calc(-50% + ${ziel.y - start.y}px)) scale(0.5)`, opacity: 0.9 },
    ], { duration: 900, delay: i * 90, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'both' })
      .finished.then(() => { el.remove(); sounds.plopp(); });
  });
  return Promise.all(fluege);
}

/** Ein Tier huepft quer ueber den Bildschirm. */
export function tierHuepft() {
  if (ruhig()) return;
  const tier = ['🐸', '🐰', '🦘', '🐿️', '🐥', '🦊'][Math.floor(Math.random() * 6)];
  const y = innerHeight * 0.72;
  const el = emoji(tier, -60, y, 56);
  const breite = innerWidth + 120;
  const spruenge = 4;
  const frames = [];
  for (let i = 0; i <= spruenge * 2; i++) {
    const hoch = i % 2 === 1;
    frames.push({
      transform: `translate(${(breite / (spruenge * 2)) * i}px, ${hoch ? -110 : 0}px) scaleX(-1) rotate(${hoch ? -12 : 0}deg)`,
      easing: hoch ? 'ease-in' : 'ease-out',
    });
  }
  el.animate(frames, { duration: 1800, fill: 'both' }).finished.then(() => el.remove());
}

/** Bunte Ballons steigen auf. */
export function ballons(anzahl = 7) {
  if (ruhig()) return;
  for (let i = 0; i < anzahl; i++) {
    const el = emoji(Math.random() < 0.8 ? '🎈' : '🎉', zufall(20, innerWidth - 40), innerHeight + 20, zufall(38, 58));
    el.style.filter = `hue-rotate(${Math.floor(zufall(0, 360))}deg)`;
    el.animate([
      { transform: 'translate(0, 0) rotate(0deg)' },
      { transform: `translate(${zufall(-30, 30)}px, -${innerHeight * 0.55}px) rotate(${zufall(-10, 10)}deg)`, offset: 0.5 },
      { transform: `translate(${zufall(-40, 40)}px, -${innerHeight + 120}px) rotate(0deg)` },
    ], { duration: zufall(2200, 3000), delay: i * 120, easing: 'ease-in', fill: 'both' })
      .finished.then(() => el.remove());
  }
}

/** Zufaellige kleine Belohnung fuer eine richtige Antwort. */
export function belohnung(karte) {
  const { x, y } = mitte(karte);
  const auswahl = [() => konfetti(x, y), tierHuepft, () => ballons()];
  auswahl[Math.floor(Math.random() * auswahl.length)]();
}

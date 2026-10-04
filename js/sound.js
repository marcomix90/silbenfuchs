/** Kleine Sounds ueber die WebAudio-API - keine Audiodateien noetig. */
let ctx = null;
let an = true;

const ctxHolen = () => (ctx ??= new (window.AudioContext || window.webkitAudioContext)());

export function tonAn(wert) { an = wert; }

/** Muss einmal aus einem Klick heraus laufen, sonst bleibt iOS stumm. */
export function entsperren() {
  try { const c = ctxHolen(); if (c.state === 'suspended') c.resume(); } catch {}
}

function ton(freq, dauer = 0.12, typ = 'sine', vol = 0.16, verzug = 0) {
  if (!an) return;
  try {
    const c = ctxHolen();
    const t = c.currentTime + verzug;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = typ;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dauer + 0.02);
  } catch {}
}

export const sounds = {
  klick: () => ton(660, 0.06, 'triangle', 0.08),
  mikro: () => { ton(880, 0.08, 'sine', 0.1); ton(1175, 0.1, 'sine', 0.1, 0.07); },
  richtig: () => [523, 659, 784, 1047].forEach((f, i) => ton(f, 0.18, 'triangle', 0.14, i * 0.08)),
  // bewusst sanft: Fehler sollen nicht bestrafen
  falsch: () => { ton(392, 0.16, 'sine', 0.1); ton(330, 0.22, 'sine', 0.1, 0.14); },
  tipp: () => { ton(1319, 0.25, 'sine', 0.1); ton(1568, 0.35, 'sine', 0.08, 0.12); },
  levelUp: () => {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => ton(f, 0.22, 'square', 0.07, i * 0.12));
    ton(1319, 0.6, 'triangle', 0.12, 0.75);
  },
  plopp: () => ton(300 + Math.random() * 500, 0.08, 'sine', 0.08),
};

/** Sprachausgabe (speechSynthesis) mit deutscher Stimme. */
let an = true;
let stimme = null;

const verfuegbar = 'speechSynthesis' in window;

function waehleStimme() {
  const alle = speechSynthesis.getVoices().filter(v => v.lang?.toLowerCase().startsWith('de'));
  const deDE = alle.filter(v => v.lang.replace('_', '-').toLowerCase() === 'de-de');
  stimme = deDE.find(v => /google/i.test(v.name)) || deDE.find(v => v.localService) || deDE[0] || alle[0] || null;
}

if (verfuegbar) {
  waehleStimme();
  speechSynthesis.addEventListener?.('voiceschanged', waehleStimme);
}

export function stimmeAn(wert) { an = wert; if (!wert) stumm(); }

export function stumm() { if (verfuegbar) speechSynthesis.cancel(); }

/** Spricht den Text; das Promise loest auf, wenn fertig - oder nach geschaetzter Sprechdauer,
 *  falls der Browser kein onend meldet (passiert ohne installierte Stimme). */
export function sprich(text, { tempo = 0.85, hoehe = 1.1 } = {}) {
  return new Promise((fertig) => {
    if (!an || !verfuegbar) return fertig();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    if (stimme) u.voice = stimme;
    u.rate = tempo;
    u.pitch = hoehe;
    const timer = setTimeout(fertig, 1500 + text.length * 90 / tempo);
    u.onend = u.onerror = () => { clearTimeout(timer); fertig(); };
    speechSynthesis.speak(u);
  });
}

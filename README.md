# 🦊 Silbenfuchs – Silben lesen lernen

Eine PWA (Progressive Web App) für Erstklässler: Eine Silbe erscheint groß auf dem
Bildschirm, das Kind liest sie laut vor, die Spracherkennung prüft die Antwort.
Gebaut ohne Framework und ohne Build-Schritt – nur HTML, CSS und ES-Module.

## Spielablauf

1. Eine Silbe erscheint (z. B. **Ma**), das Kind liest vor. Standardmäßig bewertet ein
   Erwachsener mit ✔/✘; alternativ prüft die Spracherkennung (🎤, siehe Einstellungen).
2. **Richtig** → Punkte, Sterne fliegen zum Punktestand, dazu eine zufällige kleine
   Animation (Konfetti, hüpfendes Tier oder Ballons) und ein Lob vom Fuchs.
3. **Falsch** → der Fuchs ermutigt zum nächsten Versuch und zeigt, was er verstanden hat.
   * nach **2 Fehlversuchen** gibt es einen **Tipp**: Die Silbe wird in ihre Laute
     zerlegt, jeder mit Anlautbild (🐭 Maus + 🐜 Ameise), die Selbstlaute werden rot.
   * nach **4 Fehlversuchen** wird **aufgelöst**: Der Fuchs liest die Silbe vor, das
     Kind darf nachsprechen (oder mit ⏭ weiter).
4. 💡 holt den Tipp jederzeit, ⏭ überspringt eine Silbe.

### Punkte und Level

| Situation | Punkte |
|---|---|
| beim ersten Versuch richtig | 10 |
| beim zweiten Versuch richtig | 7 |
| richtig nach dem Tipp | 4 |
| nach der Auflösung nachgesprochen | 2 |
| 5 richtige in Folge | +5 extra |

Level *n* braucht 40 + 10·*n* Punkte. Jedes Level hat einen Tier-Titel
(🥚 Silben-Ei → 🐣 Küken → 🐦 Spatz → … → 👑 Silben-König), beim Aufstieg gibt es
Konfetti-Regen und Ballons. Alle zwei Level kommen neue Silben dazu:

| Stufe | ab Level | Silben |
|---|---|---|
| 1 Lange Laute | 1 | ma, lo, su … (M, L, S, R, N, F, W) |
| 2 Kurze Laute | 3 | ta, bo, ku … (T, B, D, H, K, P, G, Z, J) |
| 3 Au, Ei, Eu, Sch | 5 | mau, bei, heu, scho … |
| 4 Silben mit Ende | 7 | mal, rot, bin … |
| 5 Zwei Mitlaute | 9 | bla, tri, schmo, spa … |

30 % der Silben kommen zur Wiederholung aus früheren Stufen. Die Silben stehen in
`js/silben.js` und lassen sich dort leicht erweitern.

### Einstellungen (⚙️ auf dem Startbildschirm)

* **Antwort prüfen:** *Eltern bewerten* (✔/✘-Knöpfe, Standard), Mikrofon oder
  automatisch (Mikrofon, falls der Browser Spracherkennung kann, sonst ✔/✘).
  Die Spracherkennung tut sich mit einzelnen Silben schwer, deshalb ist sie nicht
  mehr voreingestellt.
* **Schrift:** MA / Ma / ma, optional Selbstlaute immer rot.
* **Spracherkennung:** *großzügig* akzeptiert auch „mal“ für „ma“ oder einen
  Mitlaut daneben; ein falscher Selbstlaut zählt immer als Fehler. *genau* will die
  Silbe exakt.
* **Silben:** automatisch nach Level oder eine Stufe fest üben.
* Vorlesestimme und Geräusche an/aus, Fortschritt löschen.

Der Spielstand liegt im `localStorage` des Geräts.

## Spracherkennung

Genutzt wird die Web Speech API (`de-DE`). Einzelne Silben sind für Spracherkennung
schwierig, weil sie meist als Wort gedeutet werden – deshalb vergleicht
`js/speech.js` lautlich: „Kuh“ = *ku*, „See“ = *se*, „Mai“ = *mei*, „Mohn“ = *mon*,
„B“ = *be*, „Mama“ = *ma*.

| Browser | Spracheingabe |
|---|---|
| Chrome / Edge (Android, Desktop) | ✅ (braucht Internet, die Erkennung läuft bei Google) |
| Safari (iPhone/iPad ab iOS 14.5) | ✅ (Siri muss aktiviert sein) |
| Firefox | ❌ → Eltern-Modus |

Die Spracheingabe funktioniert nur über **HTTPS** (oder `localhost`) – GitHub Pages
passt also.

## Lokal starten

```bash
cd silbenfuchs
python3 -m http.server 8000
# dann im Browser: http://localhost:8000
```

## Auf GitHub Pages veröffentlichen

1. Auf GitHub ein leeres Repository `silbenfuchs` anlegen.
2. Hochladen:
   ```bash
   git remote add origin git@github.com:<benutzer>/silbenfuchs.git
   git push -u origin main
   ```
3. Im Repository unter **Settings → Pages → Build and deployment → Source**
   „**GitHub Actions**“ wählen. Der Workflow `.github/workflows/pages.yml`
   veröffentlicht danach jeden Push auf `main`.
4. Die App liegt dann unter `https://<benutzer>.github.io/silbenfuchs/`.

**Installieren:** In Chrome auf dem Startbildschirm „📲 App installieren“ antippen;
unter iOS über Safari → Teilen → „Zum Home-Bildschirm“.

Nach Änderungen an Dateien die Versionsnummer `CACHE` in `sw.js` hochzählen, damit
installierte Apps die neue Version laden.

## Aufbau

```
index.html            Start, Spiel, Level-Overlay, Einstellungsdialog
css/style.css         Gestaltung und Animationen
js/app.js             Spielablauf, Punkte, Level, Einstellungen
js/silben.js          Silben-Stufen, Anlauttabelle, Zerlegung in Laute
js/speech.js          Spracherkennung und lautlicher Vergleich
js/stimme.js          Vorlesestimme (speechSynthesis)
js/sound.js           Geräusche über WebAudio
js/effekte.js         Konfetti, Sterne, Tiere, Ballons
sw.js                 Service Worker (offline)
fonts/                Andika – Schrift von SIL für Leseanfänger (OFL, siehe fonts/OFL.txt)
```

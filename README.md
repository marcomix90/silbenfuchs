# 🦊 Silbenfuchs – Silben lesen lernen

Eine PWA (Progressive Web App) für Erstklässler mit zwei Spielen:

* **🗣️ Silben lesen** – eine Silbe erscheint groß, das Kind liest sie laut vor.
* **🔗 Silben verbinden** – aus zwei Silben ein Wort zusammensetzen.

Gebaut ohne Framework und ohne Build-Schritt – nur HTML, CSS und ES-Module.

## Silben lesen

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

## Silben verbinden

Links stehen drei Bilder mit der ersten Silbe ihres Wortes (🌹 **Ro**), rechts die
zweiten Silben in gemischter Reihenfolge (**se**). Das Kind zieht mit dem Finger
einen Strich von links nach rechts – oder tippt erst links, dann rechts.
Punkte und Karten müssen nicht genau getroffen werden: Eine Berührung knapp daneben
greift die nächste Karte, und kurz vor der Zielsilbe (ca. 24 px vor Karte oder Punkt)
rastet die Linie dort ein (blaue Linie). Weitere Finger werden
während des Ziehens ignoriert.

* Jede Verbindung wird sofort ausgewertet: **richtig** → grüne Linie, Konfetti,
  der Fuchs liest das Wort vor; **falsch** → rote Linie verschwindet wieder, die
  Karten wackeln.
* Nach **2 Fehlern beim selben Wort** liest der Fuchs das Wort zum Bild vor.
* Sind alle drei verbunden, gibt es eine Belohnung und automatisch neue Wörter;
  ⏭ holt sofort neue.
* Punkte: 5 pro Verbindung (2, wenn es bei dem Wort vorher einen Fehler gab),
  +5 extra für eine Runde ganz ohne Fehler.

Die Wörter (rund 50, alle mit Emoji-Bild) stehen in `js/woerter.js`, eingeteilt in
dieselben fünf Stufen wie beim Silbenlesen. Im Spiel kommen alle Wörter bis
einschließlich der aktuellen Stufe vor (automatisch nach Level oder fest in den
Einstellungen):

| Stufe | neu dazu | Beispiele |
|---|---|---|
| 1 | Silben aus ein bis zwei Buchstaben | Ho-se, Au-to, O-ma, Ki-wi |
| 2 | Silben mit drei Buchstaben, Umlaute, X | Ti-ger, Lö-we, Ta-xi |
| 3 | Au, Ei, ie, Sch, ch | Sei-fe, Bie-ne, Mu-schel, Ku-chen |
| 4 | geschlossene Silben, doppelte Mitlaute, ck | Son-ne, Ap-fel, So-cke |
| 5 | zwei Mitlaute am Silbenanfang | Trom-mel, Kro-ne, Ze-bra |

Pro Runde werden nur Wörter mit verschiedenen ersten und zweiten Silben gewählt,
damit die Zuordnung eindeutig ist.

## Punkte und Level

Beide Spiele sammeln Punkte für denselben Level-Fortschritt. Silben lesen:

| Situation | Punkte |
|---|---|
| beim ersten Versuch richtig | 10 |
| beim zweiten Versuch richtig | 7 |
| richtig nach dem Tipp | 4 |
| nach der Auflösung nachgesprochen | 2 |
| 5 richtige in Folge | +5 extra |

Level *n* braucht 40 + 10·*n* Punkte. Jedes Level hat einen Tier-Titel
(🥚 Silben-Ei → 🐣 Küken → 🐦 Spatz → … → 👑 Silben-König), beim Aufstieg gibt es
Konfetti-Regen und Ballons. Im Spiel „Silben lesen“ kommen alle zwei Level neue Silben dazu:

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
* **Silben:** automatisch nach Level oder eine Stufe fest üben (gilt für beide Spiele).
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
js/app.js             Silben lesen, Punkte, Level, Einstellungen
js/verbinden.js       Spiel „Silben verbinden“ (Ziehen/Tippen, Linien, Auswertung)
js/woerter.js         zweisilbige Wörter mit Bild
js/silben.js          Silben-Stufen, Anlauttabelle, Zerlegung in Laute
js/speech.js          Spracherkennung und lautlicher Vergleich
js/stimme.js          Vorlesestimme (speechSynthesis)
js/sound.js           Geräusche über WebAudio
js/effekte.js         Konfetti, Sterne, Tiere, Ballons
sw.js                 Service Worker (offline)
fonts/                Andika – Schrift von SIL für Leseanfänger (OFL, siehe fonts/OFL.txt)
```

# Skat lernen

Web-App fürs iPhone, mit der du Skat vom ersten Kartenzählen bis zum ernstzunehmenden Spieler lernst. Regeln nach der Internationalen Skatordnung (ISkO).

## So lernst du: 30 Tage, jeden Tag eine Einheit

Die App führt dich wie ein Sprachkurs durch einen festen Plan – 15 bis 25 Minuten am Tag.

- **Lernpfad mit 30 Tagen in 5 Stufen**: Grundlagen (Tag 1–5) → Reizen & Werten (6–11) → Taktik (12–19) → Mitzählen & Planen (20–25) → Am Tisch bestehen (26–30). Jeder Tag hat zwei bis drei Aufgaben: Lektion, Übung, Wiederholung, Taktik oder Übungsspiele. Der nächste Tag öffnet sich, wenn der aktuelle erledigt ist.
- **Kurze Einheiten mit Sofort-Feedback**: eine Karte oder Frage pro Bildschirm, Fortschrittsbalken, Erklärung nach jeder Antwort. Falsch beantwortete Aufgaben kommen am Ende der Einheit noch einmal.
- **Wiederholung in wachsenden Abständen**: Was du falsch machst, ist sofort wieder fällig. Was sitzt, kommt nach 1, 2, 4, 7, 14 und 30 Tagen wieder.
- **Serie, XP und Tagesziel**: Jeder Lerntag verlängert die Serie; ein Joker rettet sie, wenn du einen Tag verpasst. Der Plan zeigt, ob du im Zeitplan liegst.
- **Stufentests**: Am Ende jeder Stufe ein gemischter Test (bestanden ab 80 %). Wer schon etwas kann, überspringt damit ganze Stufen.
- **Erfolge** für Serien, bestandene Tests und besondere Spiele.

Nach 30 Tagen kennst du Regeln, Reizen und Abrechnung sicher, hast die wichtigsten Spielzüge geübt und rund 45 Spiele hinter dir, davon 16 ohne Hilfen. Wirklich sicher gegen erfahrene Spieler macht dich danach vor allem eines: weiterspielen. Dafür gibt es die Ziele der Stufe 5 unter *Fortschritt*.

## Was drin ist

- **Geführte Spiele** für den Einstieg: Die App spielt mit dir und erklärt bei jedem Zug, was gefragt ist, was du darfst und wer den Stich bekommt – erst ohne Reizen, dann als Partner, dann ein ganzes Spiel mit Reizen und Skat.
- **27 Lektionen**, von „Worum geht es?“ bis zu Kartenlesen, Verteilungs-Wahrscheinlichkeiten, Endspiel, Ablauf am echten Tisch und den Hausregeln Kontra, Ramsch und Bock.
- **15 Übungen** mit unbegrenzt neuen Aufgaben (Augen zählen, Trumpf, Bedienen, Stichsieger, Spitzen, Spielwert, Reizwerte, Abrechnen, Blatt bewerten, Drücken, Schmieren, Mitzählen, Trümpfe zählen, Wer ist frei?, Was steht?) und **23 Taktik-Aufgaben**.
- **Begriffe zum Antippen**: Fachwörter wie Trumpf, Stich oder bedienen öffnen eine kurze Erklärung.
- **Übungsspiel** gegen zwei Computergegner: Reizen, Skat aufnehmen oder Hand, Drücken, Farbe/Grand/Null, Schneider/Schwarz angesagt, Ouvert, Überreizen. Tipps mit Begründung, Coach-Hinweise bei Fehlern, Mitzähl-Proben, Spielverlauf und Liste mit Seeger-Fabian-Wertung.
- **Hilfe-Stufen**: Lernen (alles angezeigt) · Normal · Profi (ohne Hilfen). Der Plan schaltet in Stufe 4 und 5 selbst auf weniger Hilfen um.
- **Kartenblatt**: deutsches Blatt (Eichel, Grün, Rot, Schellen · Ober, Unter) als Standard, französisches Turnierbild umschaltbar unter *Fortschritt*.
- Fortschritt wird lokal gespeichert, die App läuft offline. Regeln nach ISkO.

## Aufs iPhone bringen

1. GitHub Pages einschalten: *Settings → Pages → Deploy from a branch → `main` / `docs`*.
   (Für private Repositories braucht GitHub Pages einen bezahlten Plan – sonst das Repo öffentlich machen.)
2. Die Pages-Adresse in **Safari** öffnen → Teilen → **Zum Home-Bildschirm**.
3. Die App startet dann wie eine normale App, auch ohne Internet.

## Entwicklung

```
npm run build   # baut docs/ (GitHub Pages) und dist/skat-lernen.html (claude.ai-Artifact)
npm test        # Regel-, Übungs- und Browser-Tests
npm run train   # kalibriert die Gewinnchancen per Simulation neu (src/model.js)
```

| Datei | Inhalt |
| --- | --- |
| `src/engine.js` | Regeln: Karten, Bedienen, Stiche, Spitzen, Spielwert, Reizen, Abrechnung |
| `src/ai.js` | Spielstrategie mit Begründungen, Coach, Blattbewertung |
| `src/bot.js` | Entscheidungen der Computergegner |
| `src/model.js` | Gewinnchancen-Modelle (erzeugt von `tools/train.mjs`) |
| `src/content.js` | Stufen, Lektionen, Taktik-Aufgaben |
| `src/drills.js` | Übungsgeneratoren |
| `src/plan.js` | 30-Tage-Plan, Serie, Wiederholungs-Abstände |
| `src/app.js`, `src/styles.css`, `src/shell.html` | Oberfläche |

# Skat lernen

Web-App fürs iPhone, mit der du Skat vom ersten Kartenzählen bis zum ernstzunehmenden Spieler lernst. Regeln nach der Internationalen Skatordnung (ISkO).

## Was drin ist

- **Lernpfad in 5 Stufen**: Einsteiger → Grundkenntnisse → Hobbyspieler → Fortgeschritten → Ernstzunehmender Spieler. 20 kurze Lektionen mit Quiz.
- **12 Übungen** mit unbegrenzt neuen Aufgaben (Augen zählen, Trumpf, Bedienen, Stichsieger, Spitzen, Spielwert, Reizwerte, Blatt bewerten, Drücken, Schmieren, Mitzählen, Trümpfe zählen) und **16 Taktik-Aufgaben**.
- **Übungsspiel** gegen zwei Computergegner: Reizen, Skat aufnehmen oder Hand, Drücken, Farbe/Grand/Null, Schneider/Schwarz angesagt, Ouvert, Überreizen. Tipps mit Begründung, Coach-Hinweise bei Fehlern, Mitzähl-Proben, Spielverlauf und Liste mit Seeger-Fabian-Wertung.
- **Hilfe-Stufen**: Lernen (alles angezeigt) · Normal · Profi (ohne Hilfen, zählt für Stufe 5).
- Fortschritt wird lokal gespeichert, die App läuft offline.

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
| `src/app.js`, `src/styles.css`, `src/shell.html` | Oberfläche |

/* 30-Tage-Plan, Serie und Wiederholung (ohne Oberfläche, damit es sich testen lässt)
 * Aufgaben eines Tages: ['g', n] geführtes Spiel · ['l', id] Lektion · ['d', id] Übung · ['r'] Wiederholung
 *   ['t', n] n Taktik-Aufgaben · ['x', n] Stufentest · ['p', n, modus?] n Übungsspiele (modus: mindestens 'normal' oder 'profi')
 */
(function (G) {
  'use strict';

  const DAYS = [
    // Stufe 1 · Grundlagen
    { stage: 1, title: 'Dein erstes Spiel', tasks: [['g', 1], ['l', 'ueberblick'], ['l', 'karten']] },
    { stage: 1, title: 'Augen und Trumpf', tasks: [['d', 'augen'], ['l', 'trumpf'], ['d', 'trumpf']] },
    { stage: 1, title: 'Bedienen und Stechen', tasks: [['l', 'bedienen'], ['d', 'bedienen'], ['r']] },
    { stage: 1, title: 'Stiche gewinnen', tasks: [['l', 'stich'], ['d', 'stich'], ['g', 2]] },
    { stage: 1, title: 'Stufentest Grundlagen', tasks: [['r'], ['x', 1]] },
    // Stufe 2 · Reizen & Werten
    { stage: 2, title: 'Grand, Null und der Skat', tasks: [['l', 'grandnull'], ['l', 'skat'], ['r']] },
    { stage: 2, title: 'Spitzen', tasks: [['l', 'spitzen'], ['d', 'spitzen'], ['r']] },
    { stage: 2, title: 'Der Spielwert', tasks: [['l', 'spielwert'], ['d', 'spielwert']] },
    { stage: 2, title: 'Reizen', tasks: [['l', 'reizen'], ['d', 'reizwerte'], ['r']] },
    { stage: 2, title: 'Abrechnen', tasks: [['l', 'abrechnung'], ['d', 'abrechnen'], ['g', 3]] },
    { stage: 2, title: 'Stufentest Reizen', tasks: [['r'], ['x', 2], ['p', 2]] },
    // Stufe 3 · Taktik
    { stage: 3, title: 'Ein Blatt bewerten', tasks: [['l', 'bewerten'], ['d', 'reizen'], ['p', 2]] },
    { stage: 3, title: 'Reizen mit Köpfchen', tasks: [['l', 'reizpraxis'], ['r'], ['p', 2]] },
    { stage: 3, title: 'Richtig drücken', tasks: [['l', 'druecken'], ['d', 'druecken'], ['p', 2]] },
    { stage: 3, title: 'Allein spielen', tasks: [['l', 'alleinspieler'], ['r'], ['p', 2]] },
    { stage: 3, title: 'Zu zweit dagegen', tasks: [['l', 'gegenspieler'], ['d', 'schmieren'], ['p', 2]] },
    { stage: 3, title: 'Nullspiele', tasks: [['l', 'nullspiel'], ['t', 6], ['p', 2]] },
    { stage: 3, title: 'Spielpraxis', tasks: [['r'], ['t', 6], ['p', 3]] },
    { stage: 3, title: 'Stufentest Taktik', tasks: [['r'], ['x', 3], ['p', 2]] },
    // Stufe 4 · Mitzählen & Planen
    { stage: 4, title: 'Augen mitzählen', tasks: [['l', 'mitzaehlen'], ['d', 'mitzaehlen'], ['p', 2, 'normal']] },
    { stage: 4, title: 'Trümpfe zählen', tasks: [['l', 'zaehlen'], ['d', 'truempfe'], ['p', 2, 'normal']] },
    { stage: 4, title: 'Karten lesen', tasks: [['l', 'lesen'], ['d', 'frei'], ['p', 2, 'normal']] },
    { stage: 4, title: 'Grand und Chancen', tasks: [['l', 'grand'], ['l', 'chancen'], ['p', 3, 'normal']] },
    { stage: 4, title: 'Zusammenspiel', tasks: [['l', 'partner'], ['t', 6], ['p', 2, 'normal']] },
    { stage: 4, title: 'Stufentest Mitzählen', tasks: [['l', 'risiko'], ['r'], ['x', 4]] },
    // Stufe 5 · Am Tisch bestehen
    { stage: 5, title: 'Die letzten Stiche', tasks: [['l', 'endspiel'], ['d', 'hoechste'], ['p', 3, 'profi']] },
    { stage: 5, title: 'Am echten Tisch', tasks: [['l', 'tisch'], ['t', 6], ['p', 3, 'profi']] },
    { stage: 5, title: 'Hausregeln', tasks: [['l', 'kneipe'], ['r'], ['p', 3, 'profi']] },
    { stage: 5, title: 'Generalprobe', tasks: [['r'], ['t', 6], ['p', 4, 'profi']] },
    { stage: 5, title: 'Abschlussprüfung', tasks: [['x', 5], ['p', 3, 'profi']] },
  ];
  DAYS.forEach((d, i) => { d.n = i + 1; });

  // Kalendertag als Zahl (Ortszeit); Wochentag 0 = Montag
  const dayNum = (date) => { const d = date || new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
  const weekday = (n) => (((n + 3) % 7) + 7) % 7;

  // Serie: zählt Tage in Folge mit mindestens einer abgeschlossenen Einheit. Ein „Joker“ überbrückt einen verpassten Tag.
  function streakTouch(s, t) {
    if (s.last === t) return false;
    if (s.last === t - 1) s.n++;
    else if (s.last === t - 2 && s.freeze > 0) { s.freeze--; s.n++; s.bridged = t - 1; }
    else s.n = 1;
    s.last = t;
    s.best = Math.max(s.best || 0, s.n);
    if (s.n % 7 === 0 && s.freeze < 2) s.freeze++;
    return true;
  }
  const streakNow = (s, t) => (s.last != null && (s.last >= t - 1 || (s.last === t - 2 && s.freeze > 0)) ? s.n : 0);

  // Wiederholung in wachsenden Abständen (Karteikasten): richtig → ein Fach weiter, falsch → zurück an den Anfang
  const GAPS = [0, 1, 2, 4, 7, 14, 30];
  function srsUpdate(srs, key, ok, t) {
    const e = srs[key] || { b: 0, d: t };
    e.b = ok ? Math.min(e.b + 1, GAPS.length - 1) : 0;
    e.d = t + GAPS[e.b];
    srs[key] = e;
    return e;
  }
  const srsDue = (srs, keys, t) => keys.filter((k) => srs[k] && srs[k].d <= t).sort((a, b) => srs[a].d - srs[b].d || srs[a].b - srs[b].b);

  const MODE_RANK = { lern: 0, normal: 1, profi: 2 };

  G.SPLAN = { DAYS, dayNum, weekday, streakTouch, streakNow, GAPS, srsUpdate, srsDue, MODE_RANK };
})(typeof globalThis !== 'undefined' ? globalThis : window);

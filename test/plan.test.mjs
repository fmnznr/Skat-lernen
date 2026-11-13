// Prüft den 30-Tage-Plan, die Serie und die Wiederholung: node test/plan.test.mjs
import { createRequire } from 'module';
import assert from 'assert/strict';
const require = createRequire(import.meta.url);
for (const f of ['engine', 'model', 'ai', 'bot', 'content', 'drills', 'plan']) require('../src/' + f + '.js');
const C = globalThis.SCONTENT, D = globalThis.SDRILLS, PL = globalThis.SPLAN;
const { PATH } = await import('./course.test.mjs');

// --- Aufbau des Plans ---
assert.equal(PL.DAYS.length, 30, '30 Tage');
const seen = { l: [], d: [], g: [], x: [] };
let games = 0, profi = 0;
PL.DAYS.forEach((d, i) => {
  assert.equal(d.n, i + 1);
  assert.ok(d.title && d.tasks.length >= 2 && d.tasks.length <= 3, 'Tag ' + d.n + ': 2–3 Aufgaben');
  if (i) assert.ok(d.stage >= PL.DAYS[i - 1].stage, 'Stufen steigen an');
  for (const t of d.tasks) {
    assert.ok('gldrtxp'.includes(t[0]), 'Aufgabenart ' + t[0]);
    if (seen[t[0]]) seen[t[0]].push(t[1]);
    if (t[0] === 'l') { const l = C.LESSONS.find((x) => x.id === t[1]); assert.ok(l, 'Lektion ' + t[1]); assert.equal(l.stage, d.stage, 'Lektion ' + t[1] + ' liegt in Stufe ' + d.stage); }
    if (t[0] === 'd') { assert.ok(D.DRILLS[t[1]], 'Übung ' + t[1]); assert.ok(D.DRILLS[t[1]].stage <= d.stage, 'Übung ' + t[1] + ' kommt nicht vor ihrer Stufe'); }
    if (t[0] === 'x') assert.equal(t[1], d.stage, 'Test passt zur Stufe');
    if (t[0] === 'p') { games += t[1]; if (t[2] === 'profi') profi += t[1]; assert.ok(!t[2] || PL.MODE_RANK[t[2]] != null); }
  }
});
// jede Lektion, Übung und jedes geführte Spiel genau einmal, in der Reihenfolge des Kurses
assert.deepEqual(seen.l, C.LESSONS.map((l) => l.id), 'alle Lektionen in Kursreihenfolge');
assert.deepEqual([...seen.d].sort(), [...D.ORDER].sort(), 'alle Übungen genau einmal');
assert.deepEqual(seen.g, [1, 2, 3]);
assert.deepEqual(seen.x, [1, 2, 3, 4, 5]);
assert.ok(games >= 40 && profi >= 15, 'genug Spielpraxis: ' + games + ' Spiele, ' + profi + ' im Profi-Modus');
// Reihenfolge im Plan = Reihenfolge, die der Kurs-Test prüft
const order = [];
for (const d of PL.DAYS) for (const t of d.tasks) { if (t[0] === 'l') order.push(t[1]); if (t[0] === 'g') order.push('g' + t[1]); }
assert.deepEqual(order, PATH, 'Plan und Kurs-Test haben dieselbe Reihenfolge');
// eine Übung kommt erst, wenn ihre Lektion dran war
for (const l of C.LESSONS.filter((x) => x.drill)) {
  const dl = PL.DAYS.find((d) => d.tasks.some((t) => t[0] === 'l' && t[1] === l.id)).n;
  const dd = PL.DAYS.find((d) => d.tasks.some((t) => t[0] === 'd' && t[1] === l.drill)).n;
  assert.ok(dd >= dl, 'Übung ' + l.drill + ' nach Lektion ' + l.id);
}
// an Taktik-Tagen sind genug Aufgaben freigeschaltet (gleiche Regel wie in app.js)
const after = (t) => (t.game === 'Null' ? 'nullspiel' : t.stage >= 4 ? 'zaehlen' : /^Alleinspieler/.test(t.role) ? 'alleinspieler' : 'gegenspieler');
const lessonDay = (id) => PL.DAYS.find((d) => d.tasks.some((t) => t[0] === 'l' && t[1] === id)).n;
for (const d of PL.DAYS) for (const t of d.tasks) if (t[0] === 't') {
  const open = C.TACTICS.filter((x) => lessonDay(after(x)) <= d.n).length;
  assert.ok(open >= t[1], 'Tag ' + d.n + ': ' + open + ' Taktik-Aufgaben frei, ' + t[1] + ' verlangt');
}

// --- Serie ---
const s = { n: 0, last: null, best: 0, freeze: 1 };
assert.equal(PL.streakNow(s, 100), 0);
assert.equal(PL.streakTouch(s, 100), true); assert.equal(s.n, 1);
assert.equal(PL.streakTouch(s, 100), false, 'zweite Einheit am selben Tag zählt nicht doppelt');
PL.streakTouch(s, 101); assert.equal(s.n, 2);
assert.equal(PL.streakNow(s, 102), 2, 'heute noch nichts gelernt: Serie steht noch');
assert.equal(PL.streakNow(s, 103), 2, 'ein verpasster Tag: der Joker hält die Serie');
PL.streakTouch(s, 103); assert.equal(s.n, 3); assert.equal(s.freeze, 0); assert.equal(s.bridged, 102);
assert.equal(PL.streakNow(s, 105), 0, 'ohne Joker reißt die Serie');
PL.streakTouch(s, 106); assert.equal(s.n, 1); assert.equal(s.best, 3);
for (let t = 107; t <= 112; t++) PL.streakTouch(s, t);
assert.equal(s.n, 7); assert.equal(s.freeze, 1, 'nach 7 Tagen gibt es einen neuen Joker');

// --- Wiederholung ---
const srs = {};
PL.srsUpdate(srs, 'a', true, 10); assert.deepEqual(srs.a, { b: 1, d: 11 });
PL.srsUpdate(srs, 'a', true, 11); assert.deepEqual(srs.a, { b: 2, d: 13 });
PL.srsUpdate(srs, 'a', false, 13); assert.deepEqual(srs.a, { b: 0, d: 13 }, 'Fehler: sofort wieder fällig');
PL.srsUpdate(srs, 'b', true, 5);
assert.deepEqual(PL.srsDue(srs, ['a', 'b', 'c'], 13), ['b', 'a'], 'ältestes zuerst, Unbekanntes nicht');
assert.deepEqual(PL.srsDue(srs, ['a', 'b'], 5), []);
for (let i = 0; i < 20; i++) PL.srsUpdate(srs, 'b', true, 20);
assert.equal(srs.b.d, 20 + PL.GAPS[PL.GAPS.length - 1], 'Abstand wächst nicht über das letzte Fach hinaus');

// --- Kalender ---
assert.equal(PL.weekday(PL.dayNum(new Date(2026, 10, 13, 12))), 4, '13.11.2026 ist ein Freitag');
assert.equal(PL.dayNum(new Date(2026, 10, 14, 0, 5)) - PL.dayNum(new Date(2026, 10, 13, 23, 55)), 1, 'Tageswechsel um Mitternacht Ortszeit');

console.log('Plan ok: 30 Tage, ' + seen.l.length + ' Lektionen, ' + seen.d.length + ' Übungen, ' + games + ' Spiele (' + profi + ' Profi)');

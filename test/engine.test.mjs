// node test/engine.test.mjs
import { createRequire } from 'module';
import assert from 'assert/strict';
const require = createRequire(import.meta.url);
require('../src/engine.js');
try { require('../src/model.js'); } catch (e) { /* noch nicht trainiert */ }
require('../src/ai.js');
require('../src/bot.js');
const E = globalThis.SE, A = globalThis.SAI, B = globalThis.SBOT;

let n = 0;
const t = (name, fn) => { fn(); n++; };
const c = (s, r) => E.card(s, r); // s: 0 Karo 1 Herz 2 Pik 3 Kreuz ; r: 0 7,1 8,2 9,3 D,4 K,5 10,6 A,7 B
const K = 3, P = 2, H = 1, D = 0;
const R = { 7: 0, 8: 1, 9: 2, D: 3, K: 4, 10: 5, A: 6, B: 7 };

t('Augen gesamt 120', () => {
  let s = 0; for (let i = 0; i < 32; i++) s += E.pts(i);
  assert.equal(s, 120);
});

t('Trumpf im Farbspiel', () => {
  assert.ok(E.isTrump(c(D, R.B), H));
  assert.ok(E.isTrump(c(H, R[7]), H));
  assert.ok(!E.isTrump(c(P, R.A), H));
  assert.ok(E.isTrump(c(P, R.B), E.GT_GRAND));
  assert.ok(!E.isTrump(c(H, R.A), E.GT_GRAND));
  assert.ok(!E.isTrump(c(K, R.B), E.GT_NULL));
});

t('Stichsieger', () => {
  // Herz-Spiel: Pik-A, Herz-7, Pik-10 -> Herz-7 sticht
  assert.equal(E.trickWinnerIndex([c(P, R.A), c(H, R[7]), c(P, R[10])], H), 1);
  // Karo-Bube schlägt Herz-Ass in Herz
  assert.equal(E.trickWinnerIndex([c(H, R.A), c(D, R.B), c(H, R[10])], H), 1);
  // Kreuz-Bube schlägt Pik-Bube
  assert.equal(E.trickWinnerIndex([c(P, R.B), c(K, R.B), c(H, R.B)], E.GT_GRAND), 1);
  // Abwurf zählt nicht
  assert.equal(E.trickWinnerIndex([c(P, R[9]), c(K, R.A), c(P, R[7])], E.GT_GRAND), 0);
  // Null: 10 unter Bube, Bube unter Dame
  assert.equal(E.trickWinnerIndex([c(H, R[10]), c(H, R.B), c(H, R[9])], E.GT_NULL), 1);
  assert.equal(E.trickWinnerIndex([c(H, R.D), c(H, R.B), c(H, R.K)], E.GT_NULL), 2);
  // Farbspiel: Zehn schlägt König
  assert.equal(E.trickWinnerIndex([c(P, R.K), c(P, R[10]), c(P, R.D)], K), 1);
});

t('Bedienen: Bube gehört zum Trumpf', () => {
  const hand = [c(P, R.B), c(P, R[7]), c(H, R.A)];
  // Pik angespielt im Kreuzspiel: Pik-Bube ist Trumpf, muss Pik-7 spielen
  assert.deepEqual(E.legalCards(hand, [c(P, R.A)], K), [c(P, R[7])]);
  // Trumpf angespielt: Pik-Bube muss bedient werden
  assert.deepEqual(E.legalCards(hand, [c(K, R[9])], K), [c(P, R.B)]);
  // Null: Bube gehört zu Pik
  assert.deepEqual(E.legalCards(hand, [c(P, R.A)], E.GT_NULL).sort(), [c(P, R.B), c(P, R[7])].sort());
});

t('Spitzen', () => {
  const h = [c(K, R.B), c(P, R.B), c(D, R.B), c(H, R.A), c(H, R[10])];
  assert.deepEqual(E.spitzen(h, H), { mit: true, n: 2 });
  const h2 = [c(H, R.B), c(H, R.A)];
  assert.deepEqual(E.spitzen(h2, H), { mit: false, n: 2 });
  const h3 = [c(K, R.B), c(P, R.B), c(H, R.B), c(D, R.B), c(K, R.A), c(K, R[10])];
  assert.deepEqual(E.spitzen(h3, K), { mit: true, n: 6 });
  assert.deepEqual(E.spitzen(h3, E.GT_GRAND), { mit: true, n: 4 });
  assert.deepEqual(E.spitzen([c(D, R.B)], E.GT_GRAND), { mit: false, n: 3 });
});

t('Spielwerte', () => {
  const h = [c(K, R.B), c(P, R.B)];
  assert.equal(E.announcedValue(K, h, { hand: false }), 36); // mit 2, Spiel 3 x 12
  assert.equal(E.announcedValue(D, h, { hand: true }), 36); // mit 2 Spiel 3 Hand 4 x 9
  assert.equal(E.announcedValue(E.GT_GRAND, h, { hand: false }), 72);
  assert.equal(E.announcedValue(E.GT_NULL, h, { hand: true, ouvert: true }), 59);
  assert.ok(E.BID_VALUES.slice(0, 8).join() === '18,20,22,23,24,27,30,33');
  assert.equal(E.nextBid(18), 20);
  assert.equal(E.nextBid(24), 27);
  assert.equal(E.BID_VALUES[E.BID_VALUES.length - 1], 264);
});

t('Reizen: alle passen -> eingepasst', () => {
  const st = E.newGame(0, E.deal(0, E.mulberry32(1)));
  E.bidAction(st, st.mh, { type: 'pass' });
  E.bidAction(st, st.hh, { type: 'pass' });
  assert.equal(st.bidding.waiting, 'vh18');
  E.bidAction(st, st.vh, { type: 'pass' });
  assert.equal(st.phase, 'eingepasst');
});

t('Reizen: Ablauf', () => {
  const st = E.newGame(2, E.deal(2, E.mulberry32(2))); // vh=0, mh=1, hh=2
  E.bidAction(st, 1, { type: 'say', value: 18 });
  E.bidAction(st, 0, { type: 'yes' });
  E.bidAction(st, 1, { type: 'say', value: 20 });
  E.bidAction(st, 0, { type: 'pass' });
  // Hinterhand sagt Mittelhand
  assert.equal(st.bidding.sayer, 2); assert.equal(st.bidding.hearer, 1);
  E.bidAction(st, 2, { type: 'say', value: 22 });
  E.bidAction(st, 1, { type: 'yes' });
  E.bidAction(st, 2, { type: 'pass' });
  assert.equal(st.phase, 'skat'); assert.equal(st.declarer, 1); assert.equal(st.bid, 22);
});

t('Überreizt', () => {
  // Alleinspieler bekommt 63 Augen
  const tricks = [
    { winner: 0, cards: [{ p: 0, c: c(D, R.A) }, { p: 1, c: c(H, R.A) }, { p: 2, c: c(P, R.A) }] },
    { winner: 0, cards: [{ p: 0, c: c(D, R[10]) }, { p: 1, c: c(H, R[10]) }, { p: 2, c: c(P, R[10]) }] },
    { winner: 1, cards: [{ p: 0, c: c(K, R.A) }, { p: 1, c: c(K, R[10]) }, { p: 2, c: c(K, R.K) }] },
  ];
  // Herz, nur Herz-Bube -> ohne 2 -> 3 x 10 = 30
  const r = E.evaluate({ declarer: 0, bid: 30, game: { gt: H, hand: false }, declCards12: [c(H, R.B)], tricks, skatPts: 0 });
  assert.equal(r.declPts, 63); assert.equal(r.value, 30); assert.ok(r.won); assert.equal(r.score, 30);
  const r2 = E.evaluate({ declarer: 0, bid: 33, game: { gt: H, hand: false }, declCards12: [c(H, R.B)], tricks, skatPts: 0 });
  assert.ok(r2.overbid); assert.ok(!r2.won); assert.equal(r2.value, 40); assert.equal(r2.score, -80);
  // Schneider angesagt, nicht erreicht
  const r3 = E.evaluate({ declarer: 0, bid: 18, game: { gt: K, hand: true, schneiderAng: true }, declCards12: [c(K, R.B), c(P, R.B)], tricks, skatPts: 0 });
  assert.ok(!r3.won); assert.equal(r3.value, (2 + 1 + 1 + 1 + 1) * 12);
});

t('Zufallsspiele: Konsistenz', () => {
  const rng = E.mulberry32(42);
  let games = 0, declWins = 0, played = 0;
  for (let i = 0; i < 400; i++) {
    const st = B.runGame(i % 3, rng);
    if (st.phase === 'eingepasst') continue;
    games++;
    assert.equal(st.phase, 'done');
    const tot = st.tricks.reduce((a, t) => a + t.pts, 0) + E.sumPts(st.discard);
    if (!st.result.early) assert.equal(tot, 120);
    if (st.result.won) declWins++;
    played++;
    for (const t of st.tricks) assert.equal(t.cards.length, 3);
  }
  console.log('  Bot-Spiele:', games, 'Alleinspieler gewinnt', Math.round(declWins / played * 100) + '%');
});

console.log(n + ' Tests bestanden');

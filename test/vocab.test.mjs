// Prüft, dass Einsteiger-Texte keine Begriffe späterer Stufen verwenden: node test/vocab.test.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
for (const f of ['engine', 'model', 'ai', 'bot', 'content', 'drills']) require('../src/' + f + '.js');
const E = globalThis.SE, A = globalThis.SAI, B = globalThis.SBOT, C = globalThis.SCONTENT, D = globalThis.SDRILLS;

// Begriffe, die erst ab Stufe 2 oder später erklärt werden
const LATER = /Nebenfarbe|blank|freispiel|spielst du die Farbe frei|\bfrei\b(?! wählen)|\bsteht\b|\bstehen\b|Spitzen|\b(?:mit|ohne) [1-9](?!\d)|Spielwert|Reizwert|Handspiel|\bHand\b|Schneider|Schwarz|Ouvert|Grand|Null|überreizt|Seeger|Mittelhand|Hinterhand|eingepasst|Lückenregel|Matador|Stufen/;
const strip = (t) => String(t).replace(/<[^>]+>/g, ' ').replace(/\{\{fr:[\s\S]*?\|de:/g, '');
const problems = [];
const check = (where, t) => { const m = strip(t).match(LATER); if (m) problems.push(where + ': „' + m[0] + '“ in „' + strip(t).trim().slice(0, 110) + '“'); };

for (const l of C.LESSONS.filter((x) => x.stage === 1)) {
  l.pages.forEach((p, i) => check('Lektion ' + l.id + ' Seite ' + (i + 1), p.replace('Wer Alleinspieler wird, entscheidet das Reizen vor dem Spiel.', '')));
  l.quiz.forEach((q) => { check('Quiz ' + l.id, q.q); q.o.forEach((o) => check('Quiz ' + l.id, o)); check('Quiz ' + l.id, q.why); });
}
for (const id of ['augen', 'trumpf', 'bedienen', 'stich']) {
  check('Übung ' + id + ' (Vorgehen)', D.DRILLS[id].how);
  for (let k = 0; k < 300; k++) {
    const q = D.DRILLS[id].gen({ i: k % 10, adv: false });
    check('Übung ' + id, q.text); check('Übung ' + id, q.explain);
    (q.options || []).forEach((o) => check('Übung ' + id, o));
  }
}
// Tipps und Coach-Hinweise, wie sie in den geführten Spielen 1 und 2 (Farbspiele) erscheinen
const rng = E.mulberry32(7);
let n = 0;
for (let g = 0; g < 400; g++) {
  const st = B.runGame(g % 3, rng);
  if (st.phase === 'eingepasst' || st.game.gt >= 4) continue;
  // Spiel noch einmal von vorn, diesmal mit Begründungen
  const re = E.newGame(st.dealer, { hands: st.origHands, skat: st.origSkat });
  re.declarer = st.declarer; re.bid = st.bid; re.phase = 'declare';
  re.hands[re.declarer] = st.hands[re.declarer].length ? st.hands[re.declarer] : st.origHands[re.declarer];
  re.hands = st.tricks.length === 10 ? [0, 1, 2].map((p) => st.tricks.map((t) => t.cards.find((x) => x.p === p).c)) : re.hands;
  re.discard = st.discard.slice(); re.skatTaken = st.skatTaken;
  E.declare(re, { gt: st.game.gt, hand: st.game.hand });
  while (re.phase === 'play') {
    const r = A.choose(re, re.turn);
    check('Tipp', r.reason); n++;
    const cm = A.coach(re, re.turn, r.card); if (cm) check('Coach', cm);
    E.playCard(re, re.turn, r.card);
  }
}
const uniq = [...new Set(problems)];
console.log(n + ' Tipps geprüft');
if (uniq.length) { console.log(uniq.slice(0, 30).join('\n')); console.log(uniq.length + ' Probleme'); process.exit(1); }
console.log('Wortschatz Stufe 1 ok');

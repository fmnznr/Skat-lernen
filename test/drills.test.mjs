// node test/drills.test.mjs – erzeugt viele Aufgaben und prüft ihre Form
import { createRequire } from 'module';
import assert from 'assert/strict';
const require = createRequire(import.meta.url);
for (const f of ['engine', 'model', 'ai', 'bot', 'content', 'drills']) require('../src/' + f + '.js');
const D = globalThis.SDRILLS, C = globalThis.SCONTENT, E = globalThis.SE;
const t0 = Date.now();
for (const id of D.ORDER) {
  const t1 = Date.now();
  for (let i = 0; i < 40; i++) {
    const q = D.DRILLS[id].gen();
    assert.ok(q.text, id);
    if (q.kind === 'choice' || q.kind === 'seq') { assert.ok(q.options.length >= 2, id); assert.ok(q.answer >= 0 && q.answer < q.options.length, id + ' answer ' + q.answer); assert.equal(new Set(q.options).size, q.options.length, id + ' doppelte Optionen ' + q.options); }
    if (q.kind === 'pick') { assert.ok(q.hand.length > 0); assert.ok(q.answer.length > 0, id); }
    if (q.kind === 'trick') assert.equal(q.cards.length, 3);
  }
  console.log(id.padEnd(12), ((Date.now() - t1) / 40).toFixed(1) + ' ms/Aufgabe');
}
for (const t of C.TACTICS) {
  const q = D.tacticQuestion(t);
  for (const a of q.answer) assert.ok(q.legal.includes(a), t.id + ' Lösung nicht erlaubt');
  assert.equal(new Set(t.hand).size, t.hand.length, t.id + ' doppelte Karte');
  const all = t.hand.concat(t.trick.map((x) => x[1]));
  assert.equal(new Set(all).size, all.length, t.id + ' Karte doppelt im Stich');
}
// Lektionen: Antworten gültig
for (const l of C.LESSONS) for (const q of l.quiz) assert.ok(q.a < q.o.length, l.id);
console.log('Übungen ok', Date.now() - t0, 'ms');

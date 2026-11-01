// Kalibriert die Blattbewertung per Simulation: node tools/train.mjs [faktor]
// Erzeugt src/model.js (logistische Regression je Spielart).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
require('../src/engine.js');
require('../src/ai.js');
require('../src/bot.js');
const E = globalThis.SE, A = globalThis.SAI, B = globalThis.SBOT;
const F = Number(process.argv[2] || 1);
const rng = E.mulberry32(20261031);

function fit(X, y, names, l2 = 1e-3, iters = 3000) {
  const n = X.length, d = names.length;
  const mu = Array(d).fill(0), sd = Array(d).fill(0);
  for (const x of X) for (let j = 0; j < d; j++) mu[j] += x[j] / n;
  for (const x of X) for (let j = 0; j < d; j++) sd[j] += (x[j] - mu[j]) ** 2 / n;
  for (let j = 0; j < d; j++) sd[j] = Math.sqrt(sd[j]) || 1;
  const Z = X.map((x) => x.map((v, j) => (v - mu[j]) / sd[j]));
  let w = Array(d).fill(0), b = 0;
  const m = Array(d + 1).fill(0), v = Array(d + 1).fill(0);
  const lr = 0.05, b1 = 0.9, b2 = 0.999;
  for (let it = 1; it <= iters; it++) {
    const g = Array(d + 1).fill(0);
    for (let i = 0; i < n; i++) {
      let z = b; for (let j = 0; j < d; j++) z += w[j] * Z[i][j];
      const e = 1 / (1 + Math.exp(-z)) - y[i];
      for (let j = 0; j < d; j++) g[j] += e * Z[i][j] / n;
      g[d] += e / n;
    }
    for (let j = 0; j < d; j++) g[j] += l2 * w[j];
    for (let j = 0; j <= d; j++) {
      m[j] = b1 * m[j] + (1 - b1) * g[j];
      v[j] = b2 * v[j] + (1 - b2) * g[j] * g[j];
      const step = lr * (m[j] / (1 - b1 ** it)) / (Math.sqrt(v[j] / (1 - b2 ** it)) + 1e-8);
      if (j < d) w[j] -= step; else b -= step;
    }
  }
  // Güte
  let ll = 0, acc = 0;
  for (let i = 0; i < n; i++) {
    let z = b; for (let j = 0; j < d; j++) z += w[j] * Z[i][j];
    const p = 1 / (1 + Math.exp(-z));
    ll += y[i] ? Math.log(p + 1e-12) : Math.log(1 - p + 1e-12);
    acc += (p > 0.5) === !!y[i] ? 1 : 0;
  }
  const r = (a) => a.map((x) => Math.round(x * 10000) / 10000);
  return { model: { w: r(w), b: Math.round(b * 10000) / 10000, mu: r(mu), sd: r(sd) }, ll: ll / n, acc: acc / n, rate: y.reduce((a, b) => a + b, 0) / n };
}

function gtFor(kind, hand) {
  if (kind === 'grand') return 4;
  if (kind === 'null') return 5;
  let best = 0, bn = -1;
  for (let s = 0; s < 4; s++) {
    const n = hand.filter((c) => E.isTrump(c, s)).length;
    if (n > bn) { bn = n; best = s; }
  }
  return best;
}
function relevant(kind, hand, gt) {
  if (kind === 'suit') return hand.filter((c) => E.isTrump(c, gt)).length >= 4;
  if (kind === 'grand') { const f = A.featGrand(hand); return f.jacks >= 2 || (f.jacks >= 1 && f.aces >= 2); }
  const f = A.featNull(hand); return f.unsafe <= 3;
}

function simulate(st, decl, gt, handCards, discard) {
  st.declarer = decl; st.bid = 18; st.phase = 'declare';
  st.hands[decl] = handCards.slice();
  st.discard = discard.slice();
  st.skatTaken = true;
  E.declare(st, { gt, hand: false });
  B.playOut(st);
  return st.result.won ? 1 : 0;
}

function collect(kind, mode, N) {
  const X = [], y = [];
  const names = A.FEATS[kind];
  let tries = 0;
  while (X.length < N && tries < N * 40) {
    tries++;
    const dealer = Math.floor(rng() * 3);
    const dealt = E.deal(dealer, rng);
    const st = E.newGame(dealer, dealt);
    const decl = Math.floor(rng() * 3);
    const h10 = dealt.hands[decl];
    const gt = gtFor(kind, mode === 'pre' ? h10 : h10);
    if (!relevant(kind, h10, gt)) continue;
    const vh = decl === st.vh;
    let handCards, discard, feats;
    if (mode === 'post') {
      handCards = h10; discard = dealt.skat;
      feats = A.features(h10, gt, { vh, skat: gt === 5 ? 0 : E.sumPts(discard) });
    } else {
      const bd = A.bestDiscard(h10.concat(dealt.skat), gt, vh);
      handCards = bd.hand; discard = bd.discard;
      feats = A.features(h10, gt, { vh, skat: 0 });
    }
    // Andere Hände: Skatkarten liegen nicht bei den Gegnern
    const win = simulate(st, decl, gt, handCards, discard);
    X.push(names.map((k) => feats[k]));
    y.push(win);
  }
  return { X, y, names };
}

const out = { post: {}, pre: {} };
const N = { suit: 9000, grand: 5000, null: 5000 };
const t0 = Date.now();
for (const mode of ['post', 'pre']) {
  for (const kind of ['suit', 'grand', 'null']) {
    const d = collect(kind, mode, Math.round(N[kind] * F));
    const r = fit(d.X, d.y, d.names);
    out[mode][kind] = r.model;
    A.setModels(out);
    console.log(mode, kind, 'n=' + d.X.length, 'Gewinnrate', r.rate.toFixed(3), 'acc', r.acc.toFixed(3), 'll', r.ll.toFixed(3), ((Date.now() - t0) / 1000).toFixed(1) + 's');
    console.log('   ', d.names.map((nm, i) => nm + ':' + r.model.w[i].toFixed(2)).join(' '));
  }
}
fs.writeFileSync(new URL('../src/model.js', import.meta.url), '/* Automatisch erzeugt von tools/train.mjs – Gewinnwahrscheinlichkeiten je Spielart */\n(function (G) { G.SKAT_MODELS = ' + JSON.stringify(out) + '; if (G.SAI) G.SAI.setModels(G.SKAT_MODELS); })(typeof globalThis !== \'undefined\' ? globalThis : window);\n');
console.log('src/model.js geschrieben');

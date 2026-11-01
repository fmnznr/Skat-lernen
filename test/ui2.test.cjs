// Sonderfälle im Spiel: node test/ui2.test.cjs [ausgabeordner]
const { chromium } = require('playwright');
const path = require('path');
for (const f of ['engine', 'model', 'ai', 'bot']) require('../src/' + f + '.js');
const E = globalThis.SE, B = globalThis.SBOT;
const out = process.argv[2] || require('os').tmpdir();
const M = (o) => Object.assign({ mode: 'lern', bubbles: ['', '', ''], msg: '', coach: [], hints: 0, hold: null, sel: [], hint: null, countAt: 99, countDone: false, decl: { gt: null, sa: false, sw: false, ov: false }, warned: false, advice: false, recorded: false, shown: false }, o);

// A: Mensch ist Vorhand, beide passen
const A = E.newGame(2, E.deal(2, E.mulberry32(11)));
E.bidAction(A, A.mh, { type: 'pass' }); E.bidAction(A, A.hh, { type: 'pass' });
// B: Lena spielt Null ouvert
let Bst;
for (let s = 1; s < 500; s++) {
  const st = E.newGame(0, E.deal(0, E.mulberry32(s)));
  st.declarer = 1; st.bid = 18; st.phase = 'skat';
  E.takeSkat(st);
  const h = st.hands[1];
  const best = globalThis.SAI.bestDiscard(h, 5, false);
  E.doDiscard(st, best.discard);
  E.declare(st, { gt: 5, hand: false, ouvert: true });
  Bst = st; break;
}
// C: normaler Modus, Mitzähl-Probe nach dem 1. Stich
const Cst = E.newGame(0, E.deal(0, E.mulberry32(5)));
Cst.declarer = 2; Cst.bid = 18; Cst.phase = 'skat';
B.declare(Cst);
if (Cst.game.gt === 5) { Cst.game.gt = 3; }

async function run(name, gm, prog, fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(([g, p]) => { if (window.name !== 'seeded') { localStorage.setItem('skat.game.v1', g); if (p) localStorage.setItem('skat.progress.v1', p); window.name = 'seeded'; } }, [JSON.stringify(gm), prog ? JSON.stringify(prog) : null]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await page.goto('file://' + path.resolve(__dirname, '../docs/index.html') + '#spielen');
  await page.waitForSelector('#table');
  await fn(page);
  console.log(name, errors.length ? 'FEHLER: ' + errors.join(' | ') : 'ok');
  await browser.close();
  return errors.length;
}
async function playOut(page, maxSteps) {
  page.setDefaultTimeout(3000);
  for (let i = 0; i < (maxSteps || 1500); i++) {
    await page.waitForTimeout(40);
    try {
      if (await page.$('.sheet:not([hidden]) [data-a="next"]')) return true;
      if (await page.$('.sheet:not([hidden]) [data-v]')) { await page.click('.sheet [data-v]'); await page.screenshot({ path: out + '/c-count.png' }); await page.click('.sheet [data-go]'); continue; }
      if (await page.$('[data-a="tipp"]')) { await page.click('[data-a="tipp"]'); const h = await page.$('#hand .card.hint'); if (h) await h.click({ position: { x: 8, y: 40 } }); continue; }
      if (await page.$('#hand .card:not(.dim)') && (await page.$$('#hand .card.dim')).length >= 0 && await page.$('.me.turn')) { await page.click('#hand .card:not(.dim)', { position: { x: 8, y: 40 } }); }
    } catch (e) { /* weiter */ }
  }
  return false;
}
(async () => {
  let errs = 0;
  errs += await run('A Vorhand 18 + Hand Grand Schneider', { st: A, m: M({}) }, null, async (page) => {
    await page.click('[data-bid="play18"]');
    await page.click('[data-a="hand"]');
    await page.click('.gopt[data-g="4"]');
    await page.click('.toggle[data-t="sa"]');
    await page.screenshot({ path: out + '/a-hand.png' });
    await page.click('[data-a="declare"]');
    const done = await playOut(page);
    await page.screenshot({ path: out + '/a-result.png' });
    if (!done) throw new Error('A nicht beendet');
  });
  errs += await run('B Null ouvert Gegner', { st: Bst, m: M({ msg: 'Lena spielt Null ouvert' }) }, null, async (page) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: out + '/b-ouvert.png' });
    const n = await page.$$eval('.openhand .chip', (x) => x.length);
    if (n < 9) throw new Error('offene Karten fehlen: ' + n);
    await playOut(page);
  });
  errs += await run('C Mitzähl-Probe + Neuladen', { st: Cst, m: M({ mode: 'normal', countAt: 1 }) }, { settings: { help: 'normal', tempo: 'schnell' } }, async (page) => {
    for (let i = 0; i < 200 && !(await page.$('.sheet:not([hidden]) [data-v]')); i++) {
      await page.waitForTimeout(50);
      try { if (await page.$('.me.turn')) await page.click('#hand .card:not(.dim)', { position: { x: 8, y: 40 }, timeout: 500 }); } catch (e) { /* */ }
    }
    if (!(await page.$('.sheet:not([hidden]) [data-v]'))) throw new Error('keine Mitzähl-Probe');
    await page.click('.sheet [data-v]');
    await page.screenshot({ path: out + '/c-count.png' });
    await page.click('.sheet [data-go]');
    const pre = await page.evaluate(() => { const g = JSON.parse(localStorage.getItem('skat.game.v1')); return { t: g.st.tricks.length, p: g.st.phase, h: g.st.hands.map((x) => x.length).join('/') }; });
    await page.waitForTimeout(1500); // Browser schreibt localStorage verzögert fest
    await page.reload();
    await page.waitForSelector('#table');
    const n = await page.evaluate(() => JSON.parse(localStorage.getItem('skat.game.v1')).st.tricks.length);
    if (n < 1) { const post = await page.evaluate(() => { const g = JSON.parse(localStorage.getItem('skat.game.v1')); return { t: g.st.tricks.length, p: g.st.phase, h: g.st.hands.map((x) => x.length).join('/'), d: g.st.dealer }; }); throw new Error('Spiel nicht fortgesetzt ' + JSON.stringify(pre) + ' -> ' + JSON.stringify(post)); }
    await playOut(page);
  });
  process.exit(errs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

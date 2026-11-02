// Geführte Spiele durchspielen: node test/guide.test.cjs [ausgabeordner]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || require('os').tmpdir();
const LATER = /Nebenfarbe|blank|freispiel|\bfrei\b(?! wählen)|\bsteht\b|Spitzen|\b(?:mit|ohne) [1-9](?!\d)|Spielwert|Reizwert|Handspiel|\bHand\b|Schneider|Schwarz|Ouvert|Grand|\bNull\b|überreizt|Mittelhand|Hinterhand|\bVH\b|\bMH\b|\bHH\b|Geber/;
const vocab = new Set();
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await page.goto('file://' + path.resolve(__dirname, '../docs/index.html'));
  await page.waitForSelector('.startcard');
  await page.screenshot({ path: out + '/g0-start.png' });
  await page.click('.startcard');
  page.setDefaultTimeout(4000);
  for (const n of [1, 2, 3]) {
    await page.waitForSelector('#guide');
    let shots = 0, done = false;
    for (let i = 0; i < 1500 && !done; i++) {
      await page.waitForTimeout(60);
      try {
        if (n < 3 && await page.$('#table')) {
          const txt = await page.$eval('#table', (e) => e.innerText);
          const m = txt.match(LATER);
          if (m) vocab.add('Spiel ' + n + ': „' + m[0] + '“ in „' + txt.slice(Math.max(0, txt.indexOf(m[0]) - 60), txt.indexOf(m[0]) + 40).replace(/\s+/g, ' ') + '“');
        }
        if (await page.$('.sheet:not([hidden]) [data-a="gagain"]')) { await page.screenshot({ path: out + '/g' + n + '-ergebnis.png' }); done = true; break; }
        if (await page.$('[data-a="gnext"]')) { if (n === 1 && shots === 0) { await page.screenshot({ path: out + '/g1-intro.png' }); shots++; } await page.click('[data-a="gnext"]'); continue; }
        if (await page.$('[data-a="gtrick"]')) { if (shots < 3) { await page.screenshot({ path: out + '/g' + n + '-stich.png' }); shots = 3; } await page.click('[data-a="gtrick"]'); continue; }
        if (await page.$('[data-bid]')) {
          if (n === 3) await page.screenshot({ path: out + '/g3-reizen.png' });
          const txt = await page.$eval('#guide', (e) => e.innerText);
          const want = /„Ja“|Sage \d+|18 spielen/.exec(txt);
          const sel = want ? (want[0].startsWith('„Ja') ? '[data-bid="yes"]' : want[0].startsWith('Sage') ? '[data-bid="say"]' : '[data-bid="play18"]') : '[data-bid="pass"]';
          await page.click(sel); continue;
        }
        if (await page.$('[data-a="take"]')) { await page.click('[data-a="take"]'); continue; }
        if (await page.$('[data-a="discard"]')) {
          await page.screenshot({ path: out + '/g3-druecken.png' });
          for (let z = 0; z < 3; z++) { const h = await page.$('#hand .card.hint:not(.sel)'); if (!h) break; await h.click({ position: { x: 8, y: 40 } }); }
          await page.click('[data-a="discard"]'); continue;
        }
        if (await page.$('[data-a="declare"]')) { await page.screenshot({ path: out + '/g3-ansage.png' }); await page.click('[data-a="declare"]'); continue; }
        if (await page.$('[data-a="next"]')) { await page.click('[data-a="next"]'); continue; }
        if (await page.$('#guide .eyebrow') && (await page.$eval('#guide', (e) => e.innerText)).startsWith('DU BIST DRAN') || await page.$('#hand .card.hint')) {
          if (shots < 2) { await page.screenshot({ path: out + '/g' + n + '-zug.png' }); shots = 2; }
          const h = await page.$('#hand .card.hint');
          if (h) await h.click({ position: { x: 8, y: 40 } });
        }
      } catch (e) { /* Zustand geändert */ }
    }
    console.log('Geführtes Spiel', n, done ? 'beendet' : 'NICHT beendet');
    if (!done) errors.push('Spiel ' + n + ' nicht beendet');
    if (n < 3) { await page.click('[data-a="gnextguide"]'); }
  }
  // Begriff antippen
  await page.evaluate(() => { location.hash = '#lektion-bedienen'; });
  await page.waitForSelector('#lnext');
  await page.click('.lpage .term');
  await page.waitForSelector('#gloss:not([hidden])');
  await page.screenshot({ path: out + '/g-begriff.png' });
  await page.click('#gloss [data-close]');
  // Übung mit Vorgehen
  await page.evaluate(() => { location.hash = '#uebung-bedienen'; });
  await page.waitForSelector('.how');
  await page.screenshot({ path: out + '/g-uebung.png' });
  if (vocab.size) { console.log([...vocab].slice(0, 15).join('\n')); errors.push(vocab.size + ' Wortschatz-Probleme in geführten Spielen'); }
  console.log(errors.length ? 'FEHLER: ' + errors.join(' | ') : 'Keine Fehler');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();

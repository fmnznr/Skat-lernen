// Browser-Smoketest: node test/ui.test.cjs [ausgabeordner]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || require('os').tmpdir();
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await page.goto('file://' + path.resolve(__dirname, '../docs/index.html'));
  await page.waitForSelector('.levelcard');
  await page.screenshot({ path: out + '/01-lernen.png' });
  // Lektion durchklicken
  await page.click('a[href="#lektion-ueberblick"]');
  await page.waitForSelector('#lnext');
  for (let i = 0; i < 6; i++) { const b = await page.$('#lnext'); if (!b) break; await b.click(); }
  await page.click('#lquiz');
  for (let i = 0; i < 3; i++) { await page.click('.opt[data-i="1"]'); await page.click('#qnext'); }
  await page.screenshot({ path: out + '/02-lektion.png' });
  // Übungen: je eine Runde jeder Übung anklicken
  const drills = ['augen', 'trumpf', 'bedienen', 'stich', 'spitzen', 'spielwert', 'reizwerte', 'reizen', 'druecken', 'schmieren', 'mitzaehlen', 'truempfe', 'taktik'];
  for (const d of drills) {
    await page.evaluate((d) => { location.hash = d === 'taktik' ? '#taktik' : '#uebung-' + d; }, d);
    await page.waitForSelector('#qcard');
    for (let k = 0; k < 10; k++) {
      // Sequenz weiterklicken
      while (await page.$('#seqnext')) await page.click('#seqnext');
      if (await page.$('#again')) break;
      if (await page.$('.opt:not([disabled])')) await page.click('.opt:not([disabled])');
      else if (await page.$('.minitrick button.card')) await page.click('.minitrick button.card');
      else if (await page.$('.pickhand button.card')) {
        const cards = await page.$$('.pickhand button.card:not(.dim)');
        const ck = await page.$('#check');
        if (ck) { await cards[0].click(); const c2 = await page.$$('.pickhand button.card:not(.dim):not(.sel)'); const btn = await page.$('#check'); if (await btn.isDisabled()) await c2[0].click(); await page.click('#check'); }
        else await cards[0].click();
      }
      if (k === 0 && (d === 'druecken' || d === 'schmieren' || d === 'taktik')) await page.screenshot({ path: out + '/03-uebung-' + d + '.png' });
      await page.click('#dnext');
    }
  }
  await page.screenshot({ path: out + '/04-ergebnis.png' });
  // Spiel: mehrere Spiele mit Tipp-Zügen
  await page.evaluate(() => { location.hash = '#spielen'; });
  await page.waitForSelector('#table');
  await page.screenshot({ path: out + '/05-reizen.png' });
  let games = 0, guard = 0, shotPlay = false, shotDecl = false;
  page.setDefaultTimeout(3000);
  while (games < 6 && guard++ < 3000) {
    await page.waitForTimeout(40);
    try {
    if (await page.$('.sheet:not([hidden]) [data-a="next"]')) {
      if (games === 0) await page.screenshot({ path: out + '/07-abrechnung.png' });
      games++; await page.click('.sheet [data-a="next"]'); continue;
    }
    if (await page.$('.sheet:not([hidden]) [data-v]')) { await page.click('.sheet [data-v]'); await page.click('.sheet [data-go]'); continue; }
    const bid = await page.$('[data-bid="say"], [data-bid="yes"], [data-bid="play18"]');
    if (bid) { await bid.click(); continue; }
    if (await page.$('[data-a="take"]')) { await page.click('[data-a="take"]'); continue; }
    if (await page.$('[data-a="discard"]')) {
      if (await page.$('[data-a="dtipp"]')) await page.click('[data-a="dtipp"]');
      for (let z = 0; z < 3; z++) { const h = await page.$('#hand .card.hint:not(.sel)'); if (!h) break; await h.click({ position: { x: 8, y: 40 } }); }
      while ((await page.$$('#hand .card.sel')).length < 2) await (await page.$('#hand .card:not(.sel)')).click({ position: { x: 8, y: 40 } });
      if (!shotDecl) { await page.screenshot({ path: out + '/06a-druecken.png' }); }
      await page.click('[data-a="discard"]'); continue;
    }
    if (await page.$('[data-a="declare"]')) {
      const rec = await page.$('.gopt.rec');
      await (rec || (await page.$('.gopt:not([disabled])'))).click();
      if (!shotDecl) { await page.screenshot({ path: out + '/06b-ansage.png' }); shotDecl = true; }
      await page.click('[data-a="declare"]'); continue;
    }
    if (await page.$('[data-a="next"]')) { await page.click('[data-a="next"]'); continue; }
    if (await page.$('[data-a="tipp"]')) {
      await page.click('[data-a="tipp"]');
      if (!shotPlay && (await page.$$('.trick .slot')).length >= 1) { await page.screenshot({ path: out + '/06-spiel.png' }); shotPlay = true; }
      const h = await page.$('#hand .card.hint');
      if (h) await h.click({ position: { x: 8, y: 40 } });
    }
    } catch (e) { /* Zustand hat sich geändert – nächste Runde */ }
  }
  page.setDefaultTimeout(30000);
  console.log('Spiele beendet:', games);
  await page.evaluate(() => { location.hash = '#liste'; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: out + '/08-liste.png' });
  await page.evaluate(() => { location.hash = '#fortschritt'; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: out + '/09-fortschritt.png', fullPage: false });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => { location.hash = '#lernen'; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: out + '/10-dunkel.png' });
  await page.evaluate(() => { location.hash = '#spielen'; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/11-dunkel-spiel.png' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  console.log('Horizontaler Überlauf:', overflow);
  console.log(errors.length ? errors.join('\n') : 'Keine JS-Fehler');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();

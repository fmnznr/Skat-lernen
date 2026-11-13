// Browser-Smoketest: node test/ui.test.cjs [ausgabeordner]
const { chromium } = require('playwright');
const path = require('path');
const { runSession } = require('./drive.cjs');
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
  await page.waitForSelector('.today');
  await page.screenshot({ path: out + '/01-lernen.png' });
  await page.click('.node.locked');
  await page.waitForSelector('.sheet:not([hidden]) .tasks');
  await page.click('.sheet [data-x]');
  // Lektion durchklicken
  await page.evaluate(() => { location.hash = '#lektion-ueberblick'; });
  if (!(await runSession(page))) errors.push('Lektion nicht beendet');
  await page.screenshot({ path: out + '/02-lektion.png' });
  // Übungen, Wiederholung und Tests: je eine Runde
  const units = ['uebung-augen', 'uebung-trumpf', 'uebung-bedienen', 'uebung-stich', 'uebung-spitzen', 'uebung-spielwert', 'uebung-reizwerte', 'uebung-abrechnen', 'uebung-reizen', 'uebung-druecken', 'uebung-schmieren', 'uebung-mitzaehlen', 'uebung-truempfe', 'uebung-frei', 'uebung-hoechste', 'taktik', 'wiederholen', 'test-1', 'test-2', 'test-3', 'test-4', 'test-5'];
  for (const d of units) {
    await page.evaluate((d) => { location.hash = '#' + d; }, d);
    let shot = false;
    const ok = await runSession(page, async (k, what) => { if (!shot && what === 'antwort' && /druecken|schmieren|taktik|frei|test-3/.test(d)) { shot = true; await page.screenshot({ path: out + '/03-' + d + '.png' }); } });
    if (!ok) errors.push(d + ' nicht beendet');
  }
  await page.screenshot({ path: out + '/04-ergebnis.png' });
  await page.evaluate(() => { location.hash = '#ueben'; });
  await page.waitForSelector('.reviewcard');
  await page.screenshot({ path: out + '/04b-ueben.png' });
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

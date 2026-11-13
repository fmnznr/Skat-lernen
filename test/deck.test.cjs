// Prüft das deutsche Blatt: keine französischen Begriffe im sichtbaren Text. node test/deck.test.cjs [ausgabeordner]
const { chromium } = require('playwright');
const path = require('path');
const { runSession } = require('./drive.cjs');
const out = process.argv[2] || require('os').tmpdir();
const FR = /\b(Kreuz|Pik|Herz|Karo|Bube|Buben|Dame)\w*/;
const BAD_ART = /\b(der|die|eine|keine) (\w+-)?Ober\b(?! \w+ (Unter|und))/;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await page.goto('file://' + path.resolve(__dirname, '../docs/index.html'));
  await page.waitForSelector('.today');
  const problems = [];
  const check = async (where) => {
    const txt = await page.evaluate(() => document.querySelector('#screen').innerText + ' ' + [...document.querySelectorAll('#screen [aria-label]')].map((e) => e.getAttribute('aria-label')).join(' '));
    for (const line of txt.split('\n')) {
      if (/französischen Blatt|Französisch|Turnierbild|entspricht der Ober/.test(line)) continue;
      const m = line.match(FR); if (m) problems.push(where + ': „' + m[0] + '“ in: ' + line.slice(0, 120));
      const a = line.match(BAD_ART); if (a) problems.push(where + ': Artikel „' + a[0] + '“ in: ' + line.slice(0, 120));
    }
  };
  const lessons = await page.evaluate(() => window.SCONTENT.LESSONS.map((l) => '#lektion-' + l.id));
  // Lektionen, Taktik und Übungen: jede Seite, Frage und Erklärung prüfen
  for (const d of lessons.concat(['#taktik', '#uebung-augen', '#taktik', '#uebung-trumpf', '#uebung-bedienen', '#uebung-stich', '#uebung-spitzen', '#uebung-abrechnen', '#uebung-druecken', '#uebung-schmieren', '#uebung-reizen', '#uebung-frei', '#uebung-hoechste', '#wiederholen', '#test-5'])) {
    await page.evaluate((h) => { location.hash = h; }, d);
    let shot = false;
    await runSession(page, async (k, what) => {
      await check(d + ' ' + what);
      if (!shot && what === 'antwort' && d === '#uebung-druecken') { shot = true; await page.screenshot({ path: out + '/de-druecken.png' }); }
      if (!shot && what === 'antwort' && d === '#taktik') { shot = true; await page.screenshot({ path: out + '/de-taktik.png' }); }
    });
    await check(d + ' Auswertung');
  }
  for (const h of ['#lernen', '#ueben', '#fortschritt']) { await page.evaluate((h) => { location.hash = h; }, h); await page.waitForTimeout(150); await check(h); }
  await page.evaluate(() => { location.hash = '#lektion-karten'; });
  await page.waitForSelector('#snext'); await page.click('#snext');
  await page.screenshot({ path: out + '/de-lektion.png' });
  await page.evaluate(() => { location.hash = '#fortschritt'; });
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('#seg-deck').scrollIntoView());
  await page.screenshot({ path: out + '/de-einstellung.png' });
  await page.evaluate(() => { location.hash = '#spielen'; });
  await page.waitForSelector('#table');
  for (let i = 0; i < 400; i++) {
    await page.waitForTimeout(40);
    if (await page.$('[data-a="tipp"]')) { await page.click('[data-a="tipp"]'); break; }
    const b = await page.$('[data-bid="pass"]'); if (b) await b.click();
    if (await page.$('[data-a="next"]')) await page.click('[data-a="next"]');
  }
  await page.screenshot({ path: out + '/de-spiel.png' });
  console.log(problems.length ? [...new Set(problems)].join('\n') : 'Keine französischen Begriffe gefunden');
  console.log(errors.length ? 'JS-Fehler: ' + errors.join(' | ') : 'Keine JS-Fehler');
  await browser.close();
  process.exit(problems.length || errors.length ? 1 : 0);
})();

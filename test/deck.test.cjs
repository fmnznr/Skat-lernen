// Prüft das deutsche Blatt: keine französischen Begriffe im sichtbaren Text. node test/deck.test.cjs [ausgabeordner]
const { chromium } = require('playwright');
const path = require('path');
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
  await page.waitForSelector('.levelcard');
  const problems = [];
  const check = async (where) => {
    const txt = await page.evaluate(() => document.querySelector('#screen').innerText + ' ' + [...document.querySelectorAll('#screen [aria-label]')].map((e) => e.getAttribute('aria-label')).join(' '));
    for (const line of txt.split('\n')) {
      if (/französischen Blatt|Französisch|Turnierbild|entspricht der Ober/.test(line)) continue;
      const m = line.match(FR); if (m) problems.push(where + ': „' + m[0] + '“ in: ' + line.slice(0, 120));
      const a = line.match(BAD_ART); if (a) problems.push(where + ': Artikel „' + a[0] + '“ in: ' + line.slice(0, 120));
    }
  };
  const lessons = await page.$$eval('a[href^="#lektion-"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
  for (const href of lessons) {
    await page.evaluate((h) => { location.hash = h; }, href);
    await page.waitForSelector('#lnext, #lquiz');
    while (await page.$('#lnext')) await page.click('#lnext');
    await check(href + ' Seiten');
    await page.click('#lquiz');
    for (let i = 0; i < 6; i++) {
      await check(href + ' Quiz');
      await page.click('.opt[data-i="0"]');
      await check(href + ' Erklärung');
      await page.click('#qnext');
      if (!(await page.$('.opt'))) break;
    }
  }
  if (lessons.length) { await page.evaluate(() => { location.hash = '#lektion-trumpf'; }); await page.waitForTimeout(200); }
  // Taktik + Übungen
  for (const d of ['#taktik', '#uebung-augen', '#taktik', '#uebung-trumpf', '#uebung-bedienen', '#uebung-stich', '#uebung-spitzen', '#uebung-druecken', '#uebung-schmieren', '#uebung-reizen']) {
    await page.evaluate((h) => { location.hash = h; }, d);
    await page.waitForSelector('#qcard');
    for (let k = 0; k < 10; k++) {
      await check(d);
      if (await page.$('.opt:not([disabled])')) await page.click('.opt:not([disabled])');
      else if (await page.$('.minitrick button.card')) await page.click('.minitrick button.card');
      else if (await page.$('.pickhand button.card')) {
        if (await page.$('#check')) { const cs = await page.$$('.pickhand button.card'); await cs[0].click(); if (await page.$('#check[disabled]')) await (await page.$$('.pickhand button.card:not(.sel)'))[0].click(); await page.click('#check'); }
        else await page.click('.pickhand button.card:not(.dim)');
      }
      await check(d + ' Lösung');
      if (k === 0 && d === '#uebung-druecken') await page.screenshot({ path: out + '/de-druecken.png' });
      if (k === 0 && d === '#taktik') await page.screenshot({ path: out + '/de-taktik.png' });
      await page.click('#dnext');
    }
  }
  await page.evaluate(() => { location.hash = '#lektion-karten'; });
  await page.waitForSelector('#lnext'); await page.click('#lnext');
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

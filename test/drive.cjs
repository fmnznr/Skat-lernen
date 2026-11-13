// Hilfen für die Browser-Tests: klickt eine Einheit (Lektion, Übung, Test) bis zur Auswertung durch
async function answer(page) {
  if (await page.$('.opt:not([disabled])')) return page.click('.opt:not([disabled])');
  if (await page.$('.minitrick button.card')) return page.click('.minitrick button.card');
  if (await page.$('#check')) {
    for (let g = 0; g < 4 && (await page.$('#check[disabled]')); g++) await (await page.$$('.pickhand button.card:not(.sel)'))[0].click();
    return page.click('#check');
  }
  if (await page.$('.pickhand button.card:not(.dim)')) return page.click('.pickhand button.card:not(.dim)');
}
// hook(k, 'seite' | 'frage' | 'antwort') wird vor jedem Klick aufgerufen
async function runSession(page, hook) {
  await page.emulateMedia({ reducedMotion: 'reduce' }); // ohne Animationen klickt der Test deutlich schneller
  await page.waitForSelector('.sess');
  for (let k = 0; k < 300; k++) {
    if (await page.$('.sess.sum')) return true;
    if (await page.$('#snext')) {
      if (hook) await hook(k, (await page.$('.sfoot.fb')) ? 'antwort' : 'seite');
      await page.click('#snext');
      continue;
    }
    if (hook) await hook(k, 'frage');
    await answer(page);
  }
  return false;
}
module.exports = { answer, runSession };

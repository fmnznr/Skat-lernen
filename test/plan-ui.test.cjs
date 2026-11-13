// Browser-Test für Lernpfad, Tagesziel, Serie und Überspringen: node test/plan-ui.test.cjs [ausgabeordner]
const { chromium } = require('playwright');
const path = require('path');
const { runSession } = require('./drive.cjs');
const out = process.argv[2] || require('os').tmpdir();
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await page.goto('file://' + path.resolve(__dirname, '../docs/index.html'));
  await page.waitForSelector('.today');
  // Fortschritt so vorbereiten, dass die ersten k Tage erledigt sind (plus Zusätze)
  const seed = async (k, extra) => {
    await page.evaluate(([k, extra]) => {
      const PL = window.SPLAN, t = PL.dayNum();
      const P = { v: 1, updatedAt: 1, lessons: {}, drills: {}, tactics: {}, games: [], list: [], guides: {}, exams: {}, xp: 0, days: {}, srs: {}, plan: { start: null, flags: {}, base: {}, doneOn: {}, skip: {} }, streak: { n: 0, last: null, best: 0, freeze: 1 } };
      for (const d of PL.DAYS.slice(0, k)) {
        d.tasks.forEach((x, i) => {
          if (x[0] === 'g') P.guides[x[1]] = { done: true };
          if (x[0] === 'l') P.lessons[x[1]] = { done: true, quiz: 3 };
          if (x[0] === 'd') P.drills[x[1]] = { best: 90, last: 90, sessions: 1 };
          if (x[0] === 'x') P.exams[x[1]] = { best: 90, passed: true };
          if (x[0] === 'r' || x[0] === 't') P.plan.flags[d.n + ':' + i] = true;
          if (x[0] === 'p') { P.plan.base[d.n] = { t: 1 }; for (let g = 0; g < x[1]; g++) P.games.push({ t: 2, decl: true, won: true, mode: 'profi', hints: 0, coach: 0, gt: 3, sf: 60 }); }
        });
        P.plan.doneOn[d.n] = t - 1;
      }
      if (k) { P.plan.start = t - k; P.xp = k * 40; P.days[t - 1] = 40; P.streak = { n: k, last: t - 1, best: k, freeze: 1 }; }
      extra = extra || {};
      for (const key in extra) { if (key === 'plan' || key === 'streak') Object.assign(P[key], extra[key]); else if (typeof extra[key] === 'object') Object.assign((P[key] = P[key] || {}), extra[key]); else P[key] = extra[key]; }
      localStorage.setItem('skat.progress.v1', JSON.stringify(P));
      localStorage.removeItem('skat.game.v1');
      location.hash = '#lernen';
      location.reload();
    }, [k, extra]);
    await page.waitForSelector('.today');
  };
  const text = (sel) => page.$eval(sel, (e) => e.innerText);

  // 1) Neuer Nutzer: Tag 1, alles andere gesperrt
  expect(/Tag 1 von 30/i.test(await text('.today')), 'Start: Tag 1 erwartet');
  expect((await page.$$('.node.locked')).length === 29, 'Start: 29 gesperrte Tage');
  expect((await page.$$('.node')).length === 30, '30 Knoten im Lernpfad');
  expect(await page.$('.intro'), 'Start: Einführung fehlt');

  // 2) Tag 3: nur die Wiederholung fehlt noch → abschließen bringt das Tagesziel und verlängert die Serie
  await seed(2, { lessons: { bedienen: { done: true, quiz: 3 } }, drills: { bedienen: { best: 90, last: 90, sessions: 1 } } });
  expect(/Tag 3 von 30/i.test(await text('.today')), 'Tag 3 erwartet: ' + (await text('.today')).slice(0, 40));
  expect((await text('.hud-i.fire')).trim() === '2', 'Serie 2 erwartet, war ' + (await text('.hud-i.fire')));
  expect(/Wiederholung/.test(await text('#go')), 'Nächste Aufgabe sollte die Wiederholung sein');
  expect((await page.$eval('.ring text', (e) => e.textContent)) === '2/3', 'Ring 2/3 erwartet');
  await page.screenshot({ path: out + '/p1-tag3.png' });
  await page.click('#go');
  expect(await runSession(page), 'Wiederholung nicht beendet');
  expect(await page.$('.sline.day'), 'Auswertung: „Tag geschafft“ fehlt');
  expect(await page.$('.sline.fire'), 'Auswertung: Serie fehlt');
  await page.screenshot({ path: out + '/p2-tag-geschafft.png' });
  await page.click('#snextask');
  await page.waitForSelector('.goalhit');
  expect(/Tag 4 von 30/i.test(await text('.today')), 'Nach Tag 3 sollte Tag 4 anstehen');
  expect((await text('.hud-i.fire')).trim() === '3', 'Serie 3 erwartet');
  expect((await page.$$('.node.done')).length === 3, '3 erledigte Knoten erwartet');
  await page.screenshot({ path: out + '/p3-tagesziel.png' });
  await page.evaluate(() => document.querySelector('.node.cur').scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: out + '/p4-pfad.png' });
  // erledigter Tag lässt sich öffnen und wiederholen
  await page.click('.node.done');
  await page.waitForSelector('.sheet:not([hidden]) .tasks a');
  await page.click('.sheet [data-x]');

  // 3) Spiele-Aufgabe: Tag 12 braucht 2 Spiele, die erst ab jetzt zählen
  await seed(11, { lessons: { bewerten: { done: true, quiz: 2 } }, drills: { reizen: { best: 85, last: 85, sessions: 2 } } });
  expect(/Tag 12 von 30/i.test(await text('.today')), 'Tag 12 erwartet');
  expect(/0\/2/.test(await text('.tasks li.next')), 'Spiele-Zähler sollte bei 0/2 beginnen: ' + (await text('.tasks li.next')));
  expect((await page.$('#go')).getAttribute && (await page.getAttribute('#go', 'href')) === '#spielen', 'Start führt zum Spieltisch');

  // 4) Verpasster Tag: Joker hält die Serie, zwei verpasste Tage nicht
  const now = await page.evaluate(() => window.SPLAN.dayNum());
  await seed(5, { streak: { n: 5, last: now - 2, best: 5, freeze: 1 }, plan: { start: now - 9 } });
  expect((await text('.hud-i.fire')).trim() === '5', 'Joker sollte die Serie halten');
  expect(/zurück/.test(await text('.pace')), 'Rückstand sollte angezeigt werden: ' + (await text('.pace')));
  await seed(5, { streak: { n: 5, last: now - 3, best: 5, freeze: 1 } });
  expect((await text('.hud-i.fire')).trim() === '0', 'Serie sollte gerissen sein');

  // 5) Stufe per Test übersprungen
  await seed(0, { plan: { skip: { 1: true, 2: true } } });
  expect(/Tag 12 von 30/i.test(await text('.today')), 'Nach dem Überspringen von Stufe 1 und 2 steht Tag 12 an');

  // 6) Plan geschafft
  await seed(30);
  expect(await page.$('.today.fin'), 'Abschlusskarte fehlt');
  expect((await page.$$('.node.done')).length === 30, 'alle 30 Knoten erledigt');
  await page.screenshot({ path: out + '/p5-geschafft.png' });
  await page.evaluate(() => { location.hash = '#fortschritt'; });
  await page.waitForSelector('.streakcard');
  expect((await page.$$('.ach.on')).length >= 8, 'Erfolge sollten freigeschaltet sein');
  await page.screenshot({ path: out + '/p6-fortschritt.png', fullPage: true });
  expect(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'horizontaler Überlauf');

  console.log(errors.length ? 'FEHLER:\n' + errors.join('\n') : 'Lernpfad ok');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();

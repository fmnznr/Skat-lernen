/* Übungen: erzeugen beliebig viele Aufgaben mit Lösung und Erklärung */
(function (G) {
  'use strict';
  const E = G.SE, A = G.SAI, B = G.SBOT;
  const { cardName, suitOf, rankOf, pts, isTrump, effSuit, GT_GRAND, GT_NULL } = E;
  const SL = ['d', 'h', 'p', 'k'];
  const RL = ['7', '8', '9', 'D', 'K', '10', 'A', 'B'];
  const tok = (c) => '{' + SL[suitOf(c)] + RL[rankOf(c)] + '}';
  const row = (cs) => '[[' + cs.map((c) => SL[suitOf(c)] + RL[rankOf(c)]).join(' ') + ']]';
  const parse = (s) => SL.indexOf(s[0]) * 8 + RL.indexOf(s.slice(1));
  const R = Math.random;
  const ri = (n) => Math.floor(R() * n);
  const pick = (a) => a[ri(a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const deck = () => shuffle([...Array(32).keys()]);
  const gname = (gt) => E.GAME_NAMES[gt] + (gt < 4 ? 'spiel' : '');
  const randGame = (wNull) => { const x = R(); if (x < (wNull || 0.15)) return GT_NULL; if (x < (wNull || 0.15) + 0.25) return GT_GRAND; return ri(4); };

  function numOptions(correct, extra) {
    const set = new Set([correct]);
    const cands = shuffle((extra || []).concat([1, 2, 3, 4, 6, 7, 10, 11].map((d) => correct + (R() < 0.5 ? d : -d))));
    for (const c of cands) { if (set.size >= 4) break; if (c >= 0 && c !== correct) set.add(c); }
    let k = 1; while (set.size < 4) { set.add(correct + k * 5); k++; }
    const opts = shuffle([...set]);
    return { options: opts.map(String), answer: opts.indexOf(correct) };
  }

  function trumpOrderText(gt) {
    if (gt === GT_NULL) return 'Im Null gibt es keine Trümpfe. Reihenfolge je Farbe: A K D B 10 9 8 7.';
    if (gt === GT_GRAND) return 'Im Grand sind nur die vier Buben Trumpf.';
    return 'Trümpfe im ' + gname(gt) + ': die vier Buben, dann ' + E.SUIT_NAMES[gt] + ' Ass, Zehn, König, Dame, 9, 8, 7.';
  }

  // ---------------- einzelne Übungen ----------------
  const DRILLS = {};

  DRILLS.augen = {
    title: 'Augen zählen', stage: 1, desc: 'Wie viele Augen liegen auf dem Tisch?',
    gen() {
      const n = 2 + ri(4);
      const cs = deck().slice(0, n);
      const s = E.sumPts(cs);
      const o = numOptions(s, [s - 1 > 0 ? s + 6 : s + 6]);
      return { kind: 'choice', text: 'Wie viele Augen sind das?' + row(cs), ...o, explain: cs.map((c) => cardName(c) + ' ' + pts(c)).join(' + ') + ' = <b>' + s + '</b>' };
    },
  };

  DRILLS.trumpf = {
    title: 'Trumpf erkennen', stage: 1, desc: 'Ist die Karte Trumpf? Welche ist höher?',
    gen() {
      const gt = R() < 0.75 ? ri(4) : R() < 0.6 ? GT_GRAND : GT_NULL;
      if (R() < 0.5) {
        let c;
        const x = R();
        if (x < 0.35) c = E.card(ri(4), 7); // Bube
        else if (x < 0.6 && gt < 4) c = E.card(gt, ri(7));
        else c = ri(32);
        const t = isTrump(c, gt);
        return {
          kind: 'choice', text: '<span class="game">' + gname(gt) + '</span> Ist ' + tok(c) + ' Trumpf?', options: ['Ja, Trumpf', 'Nein'], answer: t ? 0 : 1,
          explain: (t ? cardName(c) + ' ist Trumpf. ' : cardName(c) + ' ist kein Trumpf. ') + trumpOrderText(gt),
        };
      }
      // welche ist höher – gleiche effektive Farbe
      let a, b;
      for (;;) {
        a = ri(32); b = ri(32);
        if (a === b) continue;
        if (effSuit(a, gt) !== effSuit(b, gt)) continue;
        if (gt !== GT_NULL && R() < 0.5 && !isTrump(a, gt)) continue;
        break;
      }
      const higher = E.strength(a, gt) > E.strength(b, gt) ? 0 : 1;
      const isT = isTrump(a, gt);
      return {
        kind: 'choice', text: '<span class="game">' + gname(gt) + '</span> Welche Karte ist höher?', options: [tok(a), tok(b)], answer: higher,
        explain: (isT ? 'Beide sind Trumpf. ' : 'Beide sind ' + E.SUIT_NAMES[suitOf(a)] + '. ') + trumpOrderText(gt) + (gt < 5 && !isT ? ' In Fehlfarben: A 10 K D 9 8 7.' : ''),
      };
    },
  };

  DRILLS.bedienen = {
    title: 'Erlaubte Karten', stage: 1, desc: 'Tippe alle Karten an, die du legen darfst.',
    gen() {
      const gt = randGame(0.15);
      const d = deck();
      const lead = d[0];
      let hand = d.slice(1, 7);
      if (R() < 0.6 && gt !== GT_NULL) {
        const jack = E.card(suitOf(lead), 7);
        if (jack !== lead && !hand.includes(jack)) hand[0] = jack;
      }
      hand = E.sortHand(hand, gt);
      const legal = E.legalCards(hand, [lead], gt);
      const le = effSuit(lead, gt);
      const suitTxt = le === 4 ? 'Trumpf' : E.SUIT_NAMES[le];
      const follow = hand.some((c) => effSuit(c, gt) === le);
      let ex = 'Ausgespielt ist ' + suitTxt + '. ';
      ex += follow ? 'Du hast ' + suitTxt + ' und musst bedienen: ' + legal.map(tok).join(' ') + '.' : 'Du hast kein ' + suitTxt + ' und darfst jede Karte legen.';
      if (gt !== GT_NULL && le !== 4 && hand.includes(E.card(le, 7))) ex += ' ' + tok(E.card(le, 7)) + ' ist Trumpf und zählt nicht zu ' + suitTxt + '.';
      if (gt !== GT_NULL && le === 4 && hand.some((c) => rankOf(c) === 7)) ex += ' Buben sind Trumpf und müssen Trumpf bedienen.';
      return { kind: 'pick', multi: true, gt, text: '<span class="game">' + gname(gt) + '</span> Ausgespielt wird ' + tok(lead) + '. Welche Karten darfst du legen?', hand, answer: legal, explain: ex };
    },
  };

  DRILLS.stich = {
    title: 'Stichsieger', stage: 1, desc: 'Welche Karte gewinnt den Stich?',
    gen() {
      const gt = randGame(0.12);
      const d = deck();
      const lead = d[0];
      const cs = [lead];
      for (const c of d.slice(1)) {
        if (cs.length === 3) break;
        if (R() < 0.6 && effSuit(c, gt) !== effSuit(lead, gt) && !(isTrump(c, gt) && R() < 0.5)) continue;
        cs.push(c);
      }
      const w = E.trickWinnerIndex(cs, gt);
      const wc = cs[w];
      let ex = cardName(wc) + ' gewinnt. ';
      if (isTrump(wc, gt) && !isTrump(lead, gt)) ex += 'Sie ist Trumpf und sticht.';
      else if (w === 0) ex += 'Es wurde ' + (isTrump(lead, gt) ? 'Trumpf' : E.SUIT_NAMES[suitOf(lead)]) + ' ausgespielt und keine höhere Karte dieser Farbe ' + (gt !== GT_NULL ? 'oder Trumpf ' : '') + 'gelegt.';
      else ex += 'Sie ist die höchste Karte der ausgespielten Farbe.';
      const off = cs.filter((c) => effSuit(c, gt) !== effSuit(lead, gt) && !isTrump(c, gt));
      if (off.length) ex += ' ' + off.map(tok).join(' ') + ' ist abgeworfen und zählt nicht.';
      return { kind: 'trick', gt, text: '<span class="game">' + gname(gt) + '</span> Wer gewinnt den Stich? Die erste Karte wurde ausgespielt.', cards: cs, answer: w, explain: ex };
    },
  };

  function spitzenLabel(sp) { return (sp.mit ? 'mit ' : 'ohne ') + sp.n; }
  DRILLS.spitzen = {
    title: 'Spitzen zählen', stage: 2, desc: 'Mit oder ohne wie viele?',
    gen() {
      const gt = R() < 0.75 ? ri(4) : GT_GRAND;
      let hand;
      for (;;) {
        hand = deck().slice(0, 10);
        const sp = E.spitzen(hand, gt);
        if (gt < 4 && hand.filter((c) => isTrump(c, gt)).length < 4) continue;
        if (sp.n >= 5 && R() < 0.6) continue;
        break;
      }
      hand = E.sortHand(hand, gt);
      const sp = E.spitzen(hand, gt);
      const correct = spitzenLabel(sp);
      const set = new Set([correct]);
      const cands = shuffle([{ mit: !sp.mit, n: sp.n }, { mit: sp.mit, n: sp.n + 1 }, { mit: sp.mit, n: Math.max(1, sp.n - 1) }, { mit: !sp.mit, n: sp.n + 1 }, { mit: sp.mit, n: sp.n + 2 }]);
      for (const c of cands) { if (set.size >= 4) break; if (gt === GT_GRAND && c.n > 4) continue; set.add(spitzenLabel(c)); }
      const opts = shuffle([...set]);
      const order = E.matadorOrder(gt).slice(0, Math.min(sp.n + 1, gt === GT_GRAND ? 4 : 11));
      const ex = 'Von oben: ' + order.map((c) => tok(c) + (hand.includes(c) ? '✓' : '✗')).join(' ') + ' → <b>' + correct + '</b>' + (sp.mit ? ' (Kreuz-Bube vorhanden: zähle die Trümpfe ohne Lücke).' : ' (Kreuz-Bube fehlt: zähle die fehlenden Trümpfe bis zum ersten eigenen).');
      return { kind: 'choice', text: '<span class="game">' + gname(gt) + '</span> Dein Blatt (der Skat zählt hier nicht):' + row(hand), options: opts, answer: opts.indexOf(correct), explain: ex };
    },
  };

  DRILLS.spielwert = {
    title: 'Spielwert berechnen', stage: 2, desc: 'Stufen × Grundwert',
    gen() {
      const gt = R() < 0.1 ? GT_NULL : R() < 0.75 ? ri(4) : GT_GRAND;
      if (gt === GT_NULL) {
        const hand = R() < 0.5, ouv = R() < 0.5;
        const v = E.nullValue(hand, ouv);
        const label = 'Null' + (ouv ? ' ouvert' : '') + (hand ? ' Hand' : '');
        const opts = shuffle([23, 35, 46, 59].map(String));
        return { kind: 'choice', text: 'Wie viel ist <b>' + label + '</b> wert?', options: opts, answer: opts.indexOf(String(v)), explain: 'Feste Werte: Null 23, Null Hand 35, Null ouvert 46, Null ouvert Hand 59.' };
      }
      const sp = { mit: R() < 0.5, n: gt === GT_GRAND ? 1 + ri(4) : 1 + ri(R() < 0.8 ? 3 : 6) };
      const hand = R() < 0.3;
      const schneider = R() < 0.3;
      const schwarz = schneider && R() < 0.15;
      const sAng = hand && schneider && R() < 0.3;
      const items = E.levelsFor({ ...sp, hand, schneider, schwarz, schneiderAng: sAng });
      const lv = items.reduce((a, i) => a + i.v, 0);
      const v = lv * E.BASE[gt];
      const desc = [E.GAME_NAMES[gt], spitzenLabel(sp)];
      if (hand) desc.push('Hand');
      if (sAng) desc.push('Schneider angesagt');
      const res = schwarz ? 'Der Alleinspieler macht alle Stiche (Schwarz).' : schneider ? 'Der Alleinspieler gewinnt mit 95 Augen (Schneider).' : 'Der Alleinspieler gewinnt mit 72 Augen.';
      const o = numOptions(v, [(lv - 1) * E.BASE[gt], (lv + 1) * E.BASE[gt], lv * E.BASE[(gt + 1) % 5]]);
      return {
        kind: 'choice', text: 'Spiel: <b>' + desc.join(', ') + '</b>. ' + res + ' Wie viel ist das Spiel wert?', ...o,
        explain: items.map((i) => i.label + ' (' + i.v + ')').join(' + ') + ' = ' + lv + ' Stufen × ' + E.BASE[gt] + ' (' + E.GAME_NAMES[gt] + ') = <b>' + v + '</b>',
      };
    },
  };

  DRILLS.reizwerte = {
    title: 'Reizwerte', stage: 2, desc: 'Die Reizreihe sicher beherrschen',
    gen() {
      const t = R();
      if (t < 0.4) {
        const i = ri(20);
        const x = E.BID_VALUES[i], nx = E.BID_VALUES[i + 1];
        const set = new Set([nx, x + 1, x + 2, E.BID_VALUES[i + 2]]);
        let k = 3; while (set.size < 4) set.add(x + k++);
        const opts = shuffle([...set]);
        return { kind: 'choice', text: 'Welcher Reizwert folgt auf <b>' + x + '</b>?', options: opts.map(String), answer: opts.indexOf(nx), explain: 'Die Reihe: ' + E.BID_VALUES.slice(0, 22).join(', ') + ' …' };
      }
      if (t < 0.7) {
        const gt = R() < 0.8 ? ri(4) : GT_GRAND;
        const sp = { mit: R() < 0.5, n: 1 + ri(gt === GT_GRAND ? 4 : 4) };
        const v = (sp.n + 1) * E.BASE[gt];
        const o = numOptions(v, [sp.n * E.BASE[gt], (sp.n + 2) * E.BASE[gt]]);
        return { kind: 'choice', text: 'Dein bestes Spiel: <b>' + E.GAME_NAMES[gt] + ' ' + spitzenLabel(sp) + '</b>. Bis wohin kannst du höchstens reizen (ohne Hand)?', ...o, explain: '(' + sp.n + ' + 1) × ' + E.BASE[gt] + ' = <b>' + v + '</b>. Höher wäre überreizt – es sei denn, du spielst Hand oder holst Schneider.' };
      }
      // Welches Spiel ergibt den Wert?
      const gt = ri(4);
      const lv = 2 + ri(4);
      const v = lv * E.BASE[gt];
      const correct = E.GAME_NAMES[gt] + ' mit/ohne ' + (lv - 1);
      const set = new Set([correct]);
      while (set.size < 4) {
        const g2 = ri(5), l2 = 2 + ri(4);
        if (l2 * E.BASE[g2] === v) continue;
        set.add(E.GAME_NAMES[g2] + ' mit/ohne ' + (l2 - 1));
      }
      const opts = shuffle([...set]);
      return { kind: 'choice', text: 'Welches Spiel ist genau <b>' + v + '</b> wert (ohne Hand, ohne Schneider)?', options: opts, answer: opts.indexOf(correct), explain: (lv - 1) + ' Spitzen + 1 Spiel = ' + lv + ' Stufen × ' + E.BASE[gt] + ' = ' + v + '.' };
    },
  };

  function posName(p) { return ['Vorhand', 'Mittelhand', 'Hinterhand'][p]; }
  DRILLS.reizen = {
    title: 'Blatt bewerten', stage: 3, desc: 'Wie weit reizt du mit diesem Blatt?',
    gen() {
      let hand, pos, bl;
      for (let k = 0; k < 200; k++) {
        hand = deck().slice(0, 10);
        pos = ri(3);
        bl = A.bidLimit(hand, pos === 0);
        if (bl.limit > 0 || R() < 0.25) break;
      }
      const vh = pos === 0;
      const opts = A.bidOptions(hand, vh);
      // Antwortmöglichkeiten: Passe + Werte der Spiele
      const vals = [];
      for (const o of opts) {
        if (o.gt === GT_NULL) vals.push({ v: o.value, txt: 'bis ' + o.value + ' (Null)' });
        else vals.push({ v: o.value, txt: 'bis ' + o.value + ' (' + E.GAME_NAMES[o.gt] + ' ' + spitzenLabel(o.sp) + ')' });
      }
      const uniq = [];
      const seen = new Set();
      for (const x of vals) if (!seen.has(x.v)) { seen.add(x.v); uniq.push(x); }
      let choices = [{ v: 0, txt: 'Passen' }];
      const correctV = bl.limit;
      const corr = uniq.find((x) => x.v === correctV);
      if (corr) choices.push(corr);
      for (const x of shuffle(uniq)) { if (choices.length >= 4) break; if (!choices.some((y) => y.v === x.v)) choices.push(x); }
      if (correctV && !choices.some((x) => x.v === correctV)) choices.push({ v: correctV, txt: 'bis ' + correctV });
      choices = [choices[0]].concat(choices.slice(1).sort((a, b) => a.v - b.v));
      const ans = choices.findIndex((x) => x.v === correctV);
      const lines = opts.slice(0, 4).map((o) => '<li>' + E.GAME_NAMES[o.gt] + (o.gt < 5 ? ' ' + spitzenLabel(o.sp) : '') + ': Wert ' + o.value + ', Gewinnchance ca. ' + Math.round(o.p * 100) + '\u00a0%</li>').join('');
      let ex = (correctV ? 'Empfehlung: <b>bis ' + correctV + '</b>' + (bl.choice && bl.choice.hand ? ' (als Handspiel)' : '') + '.' : 'Empfehlung: <b>Passen</b> – kein Spiel erreicht etwa 50 % Gewinnchance.') + '<ul class="opts">' + lines + '</ul>';
      ex += '<p class="note">Gewinnchancen sind Schätzungen aus simulierten Spielen (mit Skataufnahme).</p>';
      return { kind: 'choice', gt: opts[0].gt, text: 'Du sitzt in <b>' + posName(pos) + '</b>. Wie weit reizt du?' + row(E.sortHand(hand, opts[0].gt === GT_NULL ? 3 : opts[0].gt)), options: choices.map((x) => x.txt), answer: ans, explain: ex, near: (i) => Math.abs(choices.findIndex((x) => x.v === correctV) - i) === 1 };
    },
  };

  function discardReason(cards12, d, gt) {
    const rest = cards12.filter((c) => !d.includes(c));
    const why = [];
    const p = E.sumPts(d);
    if (gt !== GT_NULL) {
      if (p) why.push(p + ' Augen sicher im Skat');
      const suits = new Set(d.map(suitOf));
      for (const s of suits) {
        if (gt < 4 && s === gt) continue;
        if (d.some((c) => rankOf(c) === 7)) continue;
        if (!rest.some((c) => suitOf(c) === s && !isTrump(c, gt))) why.push(E.SUIT_NAMES[s] + ' ist danach blank – dort kannst du stechen');
      }
      for (const c of d) if (rankOf(c) === 5 && !cards12.includes(E.card(suitOf(c), 6))) why.push(cardName(c) + ' hatte kein Ass als Schutz');
    } else {
      why.push('Die hohen Karten aus Farben mit Lücken sind weg');
    }
    return why.length ? why.join('; ') + '.' : 'Diese Kombination ergibt die beste Gewinnchance.';
  }
  DRILLS.druecken = {
    title: 'Drücken', stage: 3, desc: 'Welche zwei Karten legst du in den Skat?',
    gen() {
      let cards12, ch;
      for (let k = 0; k < 100; k++) {
        const d = deck();
        cards12 = d.slice(0, 12);
        ch = A.chooseGame({ declarer: 0, vh: 0, bid: 18 }, cards12, false);
        if (ch.p > 0.45) break;
      }
      const gt = ch.gt;
      const best = A.bestDiscard(cards12, gt, true);
      const hand = E.sortHand(cards12, gt);
      return {
        kind: 'pick', multi: true, count: 2, gt, hand,
        text: 'Du hast den Skat aufgenommen und spielst <b>' + gname(gt) + '</b>. Welche zwei Karten drückst du?',
        answer: best.discard,
        check(sel) {
          const h = cards12.filter((c) => !sel.includes(c));
          let p = A.pFixed(h, gt, true, gt === GT_NULL ? 0 : E.sumPts(sel));
          if (gt !== GT_NULL && sel.some((c) => rankOf(c) === 7)) p -= 0.03;
          const same = sel.every((c) => best.discard.includes(c));
          const ok = same || p >= best.p - 0.015;
          return { ok, near: !ok && p >= best.p - 0.05, msg: (same ? 'Genau die beste Wahl.' : ok ? 'Gleich gut wie die Empfehlung.' : 'Besser: ' + best.discard.map(tok).join(' ') + '.') + ' ' + discardReason(cards12, best.discard, gt) + ' <span class="note">(Gewinnchance deiner Wahl ca. ' + Math.round(Math.max(0, p) * 100) + '\u00a0%, beste ca. ' + Math.round(best.p * 100) + '\u00a0%)</span>' };
        },
      };
    },
  };

  // Situationen aus echten (simulierten) Spielen: Gegenspieler sitzt hinten
  function findSituation(test, tries) {
    for (let k = 0; k < (tries || 60); k++) {
      const dealer = ri(3);
      const st = E.newGame(dealer, E.deal(dealer, R));
      while (st.phase === 'bidding') { const p = E.biddingActor(st); E.bidAction(st, p, B.bidAction(st, p)); }
      if (st.phase === 'eingepasst') continue;
      B.declare(st);
      if (st.game.gt === GT_NULL || st.game.ouvert) continue;
      while (st.phase === 'play') {
        if (st.turn === 0) {
          const r = test(st);
          if (r) return r;
        }
        E.playCard(st, st.turn, B.play(st, st.turn));
      }
    }
    return null;
  }
  const whoName = (st, p) => (p === st.declarer ? 'Alleinspieler' : 'Partner');

  DRILLS.schmieren = {
    title: 'Schmieren & Abwerfen', stage: 3, desc: 'Du bist Gegenspieler und spielst als Letzter.',
    gen() {
      const r = findSituation((st) => {
        if (st.declarer === 0 || st.trick.length !== 2) return null;
        const legal = E.legalFor(st, 0);
        if (legal.length < 2) return null;
        const gt = st.game.gt;
        const cs = st.trick.map((x) => x.c);
        const wi = E.trickWinnerIndex(cs, gt);
        const partnerWins = st.trick[wi].p !== st.declarer;
        const winners = legal.filter((c) => E.beats(c, cs[wi], gt));
        let ans, ex;
        if (partnerWins) {
          const mx = Math.max(...legal.map(pts));
          if (mx < 10) return null;
          ans = legal.filter((c) => pts(c) === mx);
          ex = 'Dein Partner gewinnt den Stich, niemand kommt mehr nach dir. <b>Schmieren</b>: Gib ' + ans.map(tok).join(' oder ') + ' (' + mx + ' Augen).';
        } else if (winners.length) {
          if (E.sumPts(cs) < 3) return null;
          ans = winners;
          ex = 'Der Alleinspieler liegt vorn, aber du kannst ihn schlagen: ' + winners.map(tok).join(' ') + '. Die ' + E.sumPts(cs) + ' Augen gehören dann euch.';
        } else {
          const mn = Math.min(...legal.map(pts));
          if (Math.max(...legal.map(pts)) < 10) return null;
          ans = legal.filter((c) => pts(c) === mn);
          ex = 'Der Stich geht an den Alleinspieler – du kannst ihn nicht schlagen. Gib ihm so wenig wie möglich: ' + ans.map(tok).join(' oder ') + '.';
        }
        return {
          kind: 'pick', multi: false, gt, hand: E.sortHand(st.hands[0], gt), legal,
          trick: st.trick.map((x) => ({ who: whoName(st, x.p), c: x.c })),
          text: '<span class="game">' + gname(gt) + '</span> Du bist Gegenspieler und spielst als Letzter. Welche Karte legst du?',
          answer: ans, explain: ex,
        };
      });
      return r || DRILLS.stich.gen();
    },
  };

  DRILLS.mitzaehlen = {
    title: 'Mitzählen', stage: 4, desc: 'Merke dir die Augen Stich für Stich.',
    gen() {
      let st;
      for (;;) {
        const dealer = ri(3);
        st = E.newGame(dealer, E.deal(dealer, R));
        while (st.phase === 'bidding') { const p = E.biddingActor(st); E.bidAction(st, p, B.bidAction(st, p)); }
        if (st.phase === 'eingepasst') continue;
        B.declare(st);
        if (st.game.gt === GT_NULL) continue;
        B.playOut(st);
        break;
      }
      const k = 4 + ri(3);
      const tricks = st.tricks.slice(0, k);
      const declPts = tricks.filter((t) => t.winner === st.declarer).reduce((a, t) => a + t.pts, 0);
      const o = numOptions(declPts, [declPts + 10, declPts - 10, 120 - declPts - tricks.length]);
      return {
        kind: 'seq', gt: st.game.gt,
        steps: tricks.map((t) => ({ cards: t.cards.map((x) => x.c), won: t.winner === st.declarer ? 'Alleinspieler' : 'Gegenspieler', pts: t.pts })),
        text: 'Wie viele Augen hat der <b>Alleinspieler</b> nach diesen ' + k + ' Stichen (ohne Skat)?', ...o,
        explain: tricks.map((t, i) => (i + 1) + '. Stich: ' + t.pts + ' → ' + (t.winner === st.declarer ? 'Alleinspieler' : 'Gegner')).join('<br>') + '<br>Alleinspieler: <b>' + declPts + '</b>',
      };
    },
  };

  DRILLS.truempfe = {
    title: 'Trümpfe zählen', stage: 4, desc: 'Wie viele Trümpfe sind noch draußen?',
    gen() {
      let st, k;
      for (;;) {
        const dealer = ri(3);
        st = E.newGame(dealer, E.deal(dealer, R));
        while (st.phase === 'bidding') { const p = E.biddingActor(st); E.bidAction(st, p, B.bidAction(st, p)); }
        if (st.phase === 'eingepasst') continue;
        B.declare(st);
        if (st.game.gt === GT_NULL) continue;
        k = 3 + ri(4);
        while (st.phase === 'play' && st.tricks.length < k) E.playCard(st, st.turn, B.play(st, st.turn));
        if (st.trick.length === 0 && st.phase === 'play') break;
      }
      const gt = st.game.gt;
      const total = gt === GT_GRAND ? 4 : 11;
      const mine = st.hands[0].filter((c) => isTrump(c, gt)).length;
      const fallen = st.tricks.reduce((a, t) => a + t.cards.filter((x) => isTrump(x.c, gt)).length, 0);
      const known = st.declarer === 0 ? st.discard.filter((c) => isTrump(c, gt)).length : 0;
      const rest = total - mine - fallen - known;
      const o = numOptions(rest, [rest + 1, rest - 1, total - fallen]);
      return {
        kind: 'choice', gt, hand: E.sortHand(st.hands[0], gt),
        tricksShown: st.tricks.map((t) => t.cards.map((x) => x.c)),
        text: '<span class="game">' + gname(gt) + '</span> ' + k + ' Stiche sind gespielt (siehe oben), unten deine Karten' + (st.declarer === 0 ? ' – du bist Alleinspieler, gedrückt: ' + st.discard.map(tok).join(' ') : '') + '. Wie viele Trümpfe haben die anderen noch' + (st.declarer === 0 ? '' : ' (oder liegen im Skat)') + '?',
        ...o,
        explain: total + ' Trümpfe insgesamt − ' + mine + ' bei dir − ' + fallen + ' gefallen' + (known ? ' − ' + known + ' gedrückt' : '') + ' = <b>' + rest + '</b>',
      };
    },
  };

  // Taktik-Aufgaben aus content.js
  function tacticQuestion(t) {
    const gtMap = { Karo: 0, Herz: 1, Pik: 2, Kreuz: 3, Grand: 4, Null: 5 };
    const gt = gtMap[t.game];
    const hand = E.sortHand(t.hand.map(parse), gt);
    const trick = t.trick.map(([who, c]) => ({ who, c: parse(c) }));
    const legal = E.legalCards(hand, trick.map((x) => x.c), gt);
    return {
      kind: 'pick', multi: false, gt, hand, legal, trick, title: t.title,
      text: '<span class="game">' + (gt < 4 ? t.game + 'spiel' : t.game) + '</span> ' + t.role + '. Welche Karte spielst du?',
      answer: t.ok.map(parse), explain: t.why,
    };
  }

  const ORDER = ['augen', 'trumpf', 'bedienen', 'stich', 'spitzen', 'spielwert', 'reizwerte', 'reizen', 'druecken', 'schmieren', 'mitzaehlen', 'truempfe'];
  G.SDRILLS = { DRILLS, ORDER, tacticQuestion, tok, row, parse };
})(typeof globalThis !== 'undefined' ? globalThis : window);

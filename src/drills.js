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
  // Etikett über der Aufgabe: sagt direkt, was Trumpf ist
  const gtag = (gt) => '<span class="game">' + (gt < 4 ? 'Trumpf: ' + E.SUIT_NAMES[gt] + ' + Buben' : gt === GT_GRAND ? 'Grand · nur Buben Trumpf' : 'Null · kein Trumpf') + '</span>';
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
    if (gt === GT_NULL) return 'Im Null gibt es keine Trümpfe. Reihenfolge je Farbe: Ass, König, Dame, Bube, Zehn, 9, 8, 7.';
    if (gt === GT_GRAND) return 'Im Grand sind nur die vier Buben Trumpf.';
    return 'Trümpfe im ' + gname(gt) + ': die vier Buben, dann ' + E.SUIT_NAMES[gt] + ' Ass, Zehn, König, Dame, 9, 8, 7.';
  }

  // ---------------- einzelne Übungen ----------------
  const DRILLS = {};

  // ctx: { i: Nummer der Aufgabe in der Runde (0–9), adv: Grand/Null schon gelernt }
  const ctxOf = (ctx) => Object.assign({ i: 9, adv: true }, ctx || {});
  const need = (e) => (e === 4 ? 'Trumpf' : E.SUIT_NAMES[e]);
  const steps = (arr) => '<ol class="think">' + arr.filter(Boolean).map((x) => '<li>' + x + '</li>').join('') + '</ol>';
  const toks = (cs) => cs.map(tok).join(' ');
  const TRUMP_ORDER = 'Kreuz-Bube, Pik-Bube, Herz-Bube, Karo-Bube, dann Ass, Zehn, König, Dame, 9, 8, 7 der Trumpffarbe';
  const SUIT_ORDER = 'Ass, Zehn, König, Dame, 9, 8, 7';
  const NULL_ORDER = 'Ass, König, Dame, Bube, Zehn, 9, 8, 7';

  DRILLS.augen = {
    title: 'Augen zählen', stage: 1, desc: 'Wie viele Augen liegen auf dem Tisch?',
    how: 'Zähle die Augen jeder Karte zusammen: Ass 11 · Zehn 10 · König 4 · Dame 3 · Bube 2 · 9, 8, 7 zählen 0.',
    gen(ctx) {
      const c = ctxOf(ctx);
      const n = c.i < 4 ? 2 + ri(2) : 2 + ri(4);
      const cs = deck().slice(0, n);
      const s = E.sumPts(cs);
      const o = numOptions(s, [s + 6]);
      return { kind: 'choice', text: 'Wie viele Augen sind das?' + row(cs), ...o, explain: cs.map((x) => tok(x) + ' ' + pts(x)).join(' + ') + ' = <b>' + s + ' Augen</b>' };
    },
  };

  DRILLS.trumpf = {
    title: 'Trumpf erkennen', stage: 1, desc: 'Ist die Karte Trumpf? Welche ist stärker?',
    how: 'Trumpf sind im Farbspiel die vier Buben und alle Karten der Trumpffarbe. Die Buben sind die stärksten Trümpfe.',
    gen(ctx) {
      const c = ctxOf(ctx);
      const gt = c.adv && c.i >= 6 && R() < 0.6 ? (R() < 0.5 ? GT_GRAND : GT_NULL) : ri(4);
      const trumpDef = gt === GT_NULL ? 'Im Null gibt es keine Trümpfe.' : gt === GT_GRAND ? 'Im Grand sind nur die vier Buben Trumpf.' : 'Trumpf sind die vier Buben und alle ' + E.SUIT_NAMES[gt] + '-Karten.';
      if (c.i < 5 || R() < 0.5) {
        let x;
        const r = R();
        if (r < 0.4) x = E.card(ri(4), 7);
        else if (r < 0.7 && gt < 4) x = E.card(gt, ri(7));
        else x = ri(32);
        const t = isTrump(x, gt);
        let why;
        if (gt === GT_NULL) why = tok(x) + ' ist kein Trumpf.';
        else if (rankOf(x) === 7) why = tok(x) + ' ist ein Bube – Buben sind ' + (gt === GT_GRAND ? 'im Grand die einzigen Trümpfe.' : 'immer Trumpf, egal welche Farbe Trumpf ist.');
        else if (gt < 4 && suitOf(x) === gt) why = tok(x) + ' ist eine ' + E.SUIT_NAMES[gt] + '-Karte – also Trumpf.';
        else why = tok(x) + ' ist ' + (gt < 4 ? 'weder Bube noch ' + E.SUIT_NAMES[gt] : 'kein Bube') + ' – also kein Trumpf. Seine Farbe ist eine Fehlfarbe.';
        return { kind: 'choice', text: gtag(gt) + ' Ist ' + tok(x) + ' Trumpf?', options: ['Ja, Trumpf', 'Nein'], answer: t ? 0 : 1, explain: steps([trumpDef, why]) };
      }
      let a, b;
      for (;;) {
        a = ri(32); b = ri(32);
        if (a === b || effSuit(a, gt) !== effSuit(b, gt)) continue;
        if (gt < 4 && R() < 0.5 && !isTrump(a, gt)) continue;
        break;
      }
      const hi = E.strength(a, gt) > E.strength(b, gt) ? 0 : 1;
      const both = isTrump(a, gt);
      const order = both ? 'Reihenfolge der Trümpfe: ' + (gt === GT_GRAND ? 'Kreuz-Bube, Pik-Bube, Herz-Bube, Karo-Bube' : TRUMP_ORDER) + '.' : 'Beide sind ' + E.SUIT_NAMES[suitOf(a)] + '-Karten. Reihenfolge: ' + (gt === GT_NULL ? NULL_ORDER : SUIT_ORDER) + '.';
      return {
        kind: 'choice', text: gtag(gt) + ' Welche Karte ist stärker?', options: [tok(a), tok(b)], answer: hi,
        explain: steps([both ? 'Beide sind Trumpf. ' + order : order, tok(hi ? b : a) + ' ist stärker.']),
      };
    },
  };

  DRILLS.bedienen = {
    title: 'Erlaubte Karten', stage: 1, desc: 'Welche Karten darfst du legen?',
    how: 'Tippe <b>alle</b> Karten an, die du legen darfst (oft mehrere), dann auf „Prüfen“.<br>1. Welche Farbe ist gefragt? 2. Hast du sie? Dann musst du eine davon legen. 3. Sonst darfst du jede Karte legen.',
    gen(ctx) {
      const c = ctxOf(ctx);
      let gt, tricky;
      if (c.i < 3) { gt = ri(4); tricky = false; } else if (c.i < 7 || !c.adv) { gt = ri(4); tricky = true; } else { gt = R() < 0.5 ? GT_GRAND : GT_NULL; tricky = true; }
      let lead, hand;
      for (;;) {
        const d = deck();
        lead = d[0];
        if (!tricky && rankOf(lead) === 7) continue;
        const le = effSuit(lead, gt);
        hand = [];
        for (const x of d.slice(1)) {
          if (hand.length >= 6) break;
          if (!tricky && rankOf(x) === 7 && gt !== GT_NULL) continue;
          hand.push(x);
        }
        const jack = E.card(suitOf(lead), 7);
        if (tricky && jack !== lead && !hand.includes(jack) && R() < 0.6) hand[0] = jack;
        const follows = hand.some((x) => effSuit(x, gt) === le);
        if (!follows && R() < 0.5) continue; // meist muss man bedienen
        break;
      }
      hand = E.sortHand(hand, gt);
      const legal = E.legalCards(hand, [lead], gt);
      const le = effSuit(lead, gt);
      const follow = hand.filter((x) => effSuit(x, gt) === le);
      const s = [];
      let s1 = 'Ausgespielt ist ' + tok(lead) + ' – gefragt ist <b>' + need(le) + '</b>.';
      if (gt === GT_NULL) s1 += ' Im Null gibt es keinen Trumpf.';
      else if (rankOf(lead) === 7) s1 += ' Buben sind Trumpf.';
      s.push(s1);
      s.push(follow.length ? 'Du hast ' + need(le) + ': ' + toks(follow) + '. Also musst du eine davon legen.' : 'Du hast kein ' + need(le) + '. Also darfst du jede Karte legen.');
      const myJack = E.card(le < 4 ? le : 0, 7);
      if (le < 4 && hand.includes(myJack)) s.push(gt === GT_NULL ? tok(myJack) + ' gehört im Null zu ' + need(le) + ' – dort ist der Bube kein Trumpf.' : tok(myJack) + ' zählt nicht als ' + need(le) + ' – Buben sind Trumpf.');
      if (le === 4 && hand.some((x) => rankOf(x) === 7)) s.push('Auch ' + toks(hand.filter((x) => rankOf(x) === 7)) + ' ist Trumpf.');
      const mark = c.i < 5 && gt !== GT_NULL;
      const text = gtag(gt) + ' Ausgespielt wird ' + tok(lead) + (mark && isTrump(lead, gt) ? ' (ein Trumpf)' : '') + '. Welche deiner Karten darfst du legen?' + (mark ? '<br><span class="note">Hilfe: Deine Trümpfe haben unten einen goldenen Streifen.</span>' : '');
      return { kind: 'pick', multi: true, gt, mark, text, hand, answer: legal, explain: steps(s) };
    },
  };

  DRILLS.stich = {
    title: 'Stichsieger', stage: 1, desc: 'Welche Karte gewinnt den Stich?',
    how: '1. Liegt ein Trumpf im Stich? Dann gewinnt der höchste Trumpf. 2. Sonst gewinnt die höchste Karte der Farbe, die zuerst gelegt wurde. Tippe die Gewinner-Karte an.',
    gen(ctx) {
      const c = ctxOf(ctx);
      const gt = c.adv && c.i >= 7 && R() < 0.6 ? (R() < 0.5 ? GT_GRAND : GT_NULL) : ri(4);
      const allowTrump = c.i >= 3;
      let cs;
      for (;;) {
        const d = deck();
        const lead = d[0];
        if (!allowTrump && isTrump(lead, gt)) continue;
        cs = [lead];
        for (const x of d.slice(1)) {
          if (cs.length === 3) break;
          if (!allowTrump && isTrump(x, gt)) continue;
          if (R() < 0.6 && effSuit(x, gt) !== effSuit(lead, gt) && !(isTrump(x, gt) && R() < 0.5)) continue;
          cs.push(x);
        }
        break;
      }
      const w = E.trickWinnerIndex(cs, gt);
      const lead = cs[0], le = effSuit(lead, gt), wc = cs[w];
      const trumps = cs.filter((x) => isTrump(x, gt));
      const off = cs.filter((x) => effSuit(x, gt) !== le && !isTrump(x, gt));
      const s = ['Ausgespielt wurde ' + tok(lead) + ' – gefragt ist <b>' + need(le) + '</b>.'];
      if (gt === GT_NULL) s.push('Im Null gibt es keinen Trumpf.');
      else if (le === 4) s.push('Es wurde Trumpf gespielt. Reihenfolge: ' + (gt === GT_GRAND ? 'Kreuz-Bube, Pik-Bube, Herz-Bube, Karo-Bube' : TRUMP_ORDER) + '.');
      else if (trumps.length) s.push('Im Stich liegt Trumpf: ' + toks(trumps) + '. Trumpf schlägt jede andere Farbe.');
      else s.push('Im Stich liegt kein Trumpf.');
      if (off.length) s.push(toks(off) + ' wurde abgeworfen und kann nicht gewinnen.');
      s.push('→ ' + tok(wc) + ' gewinnt: ' + (isTrump(wc, gt) ? 'der höchste Trumpf im Stich.' : 'die höchste ' + need(le) + '-Karte (' + (gt === GT_NULL ? NULL_ORDER : SUIT_ORDER) + ').'));
      return { kind: 'trick', gt, text: gtag(gt) + ' Wer gewinnt den Stich? Die erste Karte wurde ausgespielt.', cards: cs, answer: w, explain: steps(s) };
    },
  };

  function spitzenLabel(sp) { return (sp.mit ? 'mit ' : 'ohne ') + sp.n; }
  DRILLS.spitzen = {
    title: 'Spitzen zählen', stage: 2, desc: 'Mit oder ohne wie viele?', how: 'Beginne beim Kreuz-Buben. Hast du ihn, zähle die Trümpfe von oben ohne Lücke („mit“). Fehlt er, zähle, wie viele Trümpfe von oben fehlen („ohne“).',
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
      return { kind: 'choice', text: gtag(gt) + ' Dein Blatt (der Skat zählt hier nicht):' + row(hand), options: opts, answer: opts.indexOf(correct), explain: ex };
    },
  };

  DRILLS.spielwert = {
    title: 'Spielwert berechnen', stage: 2, desc: 'Stufen × Grundwert', how: 'Stufen = Spitzen + 1 + Extras (Hand, Schneider …). Spielwert = Stufen × Grundwert. Grundwerte: Karo 9, Herz 10, Pik 11, Kreuz 12, Grand 24.',
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
    title: 'Reizwerte', stage: 2, desc: 'Die Reizreihe sicher beherrschen', how: 'Reizwerte sind mögliche Spielwerte: 18, 20, 22, 23, 24, 27, 30, 33, 35, 36, 40, 44 …',
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
    title: 'Blatt bewerten', stage: 3, desc: 'Wie weit reizt du mit diesem Blatt?', how: 'Überlege, welches Spiel du gewinnen kannst, und reize höchstens bis zu seinem Wert.',
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
      if (p) why.push(p + ' Augen sind dir sicher');
      const suits = new Set(d.map(suitOf));
      for (const s of suits) {
        if (gt < 4 && s === gt) continue;
        if (d.some((c) => rankOf(c) === 7)) continue;
        if (!rest.some((c) => suitOf(c) === s && !isTrump(c, gt))) why.push('danach hast du kein ' + E.SUIT_NAMES[s] + ' mehr – wird ' + E.SUIT_NAMES[s] + ' gespielt, kannst du stechen');
      }
      for (const c of d) if (rankOf(c) === 5 && !cards12.includes(E.card(suitOf(c), 6))) why.push(cardName(c) + ' hatte kein Ass als Schutz');
    } else {
      why.push('Die hohen Karten aus Farben mit Lücken sind weg');
    }
    if (!why.length) return 'Diese Kombination ergibt die beste Gewinnchance.';
    const t = why.join('; ');
    return t[0].toUpperCase() + t.slice(1) + '.';
  }
  DRILLS.druecken = {
    title: 'Drücken', stage: 3, desc: 'Welche zwei Karten legst du in den Skat?', how: 'Tippe zwei Karten an. Gut zum Drücken: volle Karten, die sonst verloren gingen, oder die letzten Karten einer Farbe. Keine Trümpfe.',
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
    title: 'Schmieren & Abwerfen', stage: 3, desc: 'Du bist Gegenspieler und spielst als Letzter.', how: 'Wer liegt vorn? Dein Partner: gib viele Augen (schmieren). Der Alleinspieler: schlag ihn, wenn du kannst – sonst gib wenig.',
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
          text: gtag(gt) + ' Du bist Gegenspieler und spielst als Letzter. Welche Karte legst du?',
          answer: ans, explain: ex,
        };
      });
      return r || DRILLS.stich.gen();
    },
  };

  DRILLS.mitzaehlen = {
    title: 'Mitzählen', stage: 4, desc: 'Merke dir die Augen Stich für Stich.', how: 'Zähle nach jedem Stich die Augen und addiere nur die Stiche des Alleinspielers.',
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
    title: 'Trümpfe zählen', stage: 4, desc: 'Wie viele Trümpfe sind noch draußen?', how: '11 Trümpfe im Farbspiel (4 im Grand) – minus deine – minus die gefallenen.',
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
        text: gtag(gt) + ' ' + k + ' Stiche sind gespielt (siehe oben), unten deine Karten' + (st.declarer === 0 ? ' – du bist Alleinspieler, gedrückt: ' + st.discard.map(tok).join(' ') : '') + '. Wie viele Trümpfe haben die anderen noch' + (st.declarer === 0 ? '' : ' (oder liegen im Skat)') + '?',
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
      how: 'Wer liegt im Stich vorn? Kommt noch jemand nach dir? Was bringt deiner Seite die meisten Augen?',
      text: gtag(gt) + ' ' + t.role + '. Welche Karte spielst du?',
      answer: t.ok.map(parse), explain: t.why,
    };
  }

  const ORDER = ['augen', 'trumpf', 'bedienen', 'stich', 'spitzen', 'spielwert', 'reizwerte', 'reizen', 'druecken', 'schmieren', 'mitzaehlen', 'truempfe'];
  G.SDRILLS = { DRILLS, ORDER, tacticQuestion, tok, row, parse, discardReason };
})(typeof globalThis !== 'undefined' ? globalThis : window);

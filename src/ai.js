/* Computergegner, Tipps und Blattbewertung.
 * Die Spielstrategie ist regelbasiert, damit jede Empfehlung begründet werden kann.
 */
(function (G) {
  'use strict';
  const E = G.SE;
  const { isTrump, effSuit, strength, beats, pts, suitOf, rankOf, cardName, GT_NULL, GT_GRAND } = E;
  const SN = E.SUIT_NAMES;

  // ---------- Wissensstand eines Spielers ----------
  function makeView(st, me) {
    const gt = st.game.gt;
    const hand = st.hands[me].slice();
    const played = [];
    for (const t of st.tricks) for (const x of t.cards) played.push(x.c);
    for (const x of st.trick) played.push(x.c);
    const known = new Set(hand.concat(played));
    const isDecl = me === st.declarer;
    if (isDecl) for (const c of st.discard) known.add(c);
    let ouvertHand = null;
    if (st.game.ouvert && !isDecl) {
      ouvertHand = st.hands[st.declarer].slice();
      for (const c of ouvertHand) known.add(c);
    }
    const unseen = [];
    for (let c = 0; c < 32; c++) if (!known.has(c)) unseen.push(c);
    const pp = E.pointsSoFar(st);
    const declPts = pp[st.declarer] + (isDecl && gt !== GT_NULL ? E.sumPts(st.discard) : 0);
    const defPts = pp[0] + pp[1] + pp[2] - pp[st.declarer];
    return {
      st, me, gt, hand, played, unseen, isDecl, declarer: st.declarer,
      partner: isDecl ? null : 3 - me - st.declarer,
      trick: st.trick.slice(), voids: st.voids, ouvertHand,
      declPts, defPts, trickNo: st.tricks.length, tricks: st.tricks,
    };
  }

  const isT = (v, c) => isTrump(c, v.gt);
  const eff = (v, c) => effSuit(c, v.gt);
  const unseenOf = (v, e) => v.unseen.filter((c) => effSuit(c, v.gt) === e);

  // Kann Spieler p diese effektive Farbe noch haben?
  function mayHold(v, p, c) {
    if (p === v.me) return v.hand.includes(c);
    if (v.ouvertHand) {
      if (p === v.declarer) return v.ouvertHand.includes(c);
    }
    if (v.voids[p][eff(v, c)]) return false;
    return v.unseen.includes(c);
  }
  function knownVoid(v, p, e) {
    if (v.voids[p][e]) return true;
    return !v.unseen.some((c) => effSuit(c, v.gt) === e && mayHold(v, p, c));
  }
  function mightBeVoid(v, p, e) {
    if (knownVoid(v, p, e)) return true;
    if (v.ouvertHand && p === v.declarer) return false;
    const n = v.unseen.filter((c) => effSuit(c, v.gt) === e && mayHold(v, p, c)).length;
    return n <= 2;
  }
  // Könnte Spieler p die Karte best überstechen/übernehmen? (vorsichtig)
  function threat(v, p, best, leadEff) {
    const gt = v.gt;
    const higherFollow = v.unseen.some((x) => effSuit(x, gt) === leadEff && beats(x, best, gt) && mayHold(v, p, x));
    if (higherFollow) return true;
    if (leadEff !== 4 && mightBeVoid(v, p, leadEff)) {
      return v.unseen.some((x) => effSuit(x, gt) === 4 && beats(x, best, gt) && mayHold(v, p, x));
    }
    return false;
  }
  // Höchste noch mögliche Karte ihrer Farbe?
  function isMaster(v, c) {
    const e = eff(v, c);
    return !v.unseen.some((x) => effSuit(x, v.gt) === e && strength(x, v.gt) > strength(c, v.gt));
  }

  const byStrAsc = (v) => (a, b) => {
    const ta = isT(v, a), tb = isT(v, b);
    if (ta !== tb) return ta ? 1 : -1;
    return strength(a, v.gt) - strength(b, v.gt);
  };
  const lowest = (v, cards) => cards.slice().sort((a, b) => pts(a) - pts(b) || byStrAsc(v)(a, b))[0];
  const highestStr = (v, cards) => cards.slice().sort(byStrAsc(v)).pop();
  const lowestStr = (v, cards) => cards.slice().sort(byStrAsc(v))[0];

  function trickState(v) {
    const cards = v.trick.map((x) => x.c);
    const wi = E.trickWinnerIndex(cards, v.gt);
    return {
      cards,
      leadEff: effSuit(cards[0], v.gt),
      best: cards[wi],
      bestP: v.trick[wi].p,
      ptsSoFar: E.sumPts(cards),
      after: v.trick.length === 1 ? [(v.me + 1) % 3] : [],
    };
  }

  // Abwerfen: wenig Augen, möglichst aus kurzen Farben, keine stehenden Karten
  function discardChoice(v, legal) {
    const nonT = legal.filter((c) => !isT(v, c));
    const pool = nonT.length ? nonT : legal;
    const count = (s) => v.hand.filter((c) => !isT(v, c) && suitOf(c) === s).length;
    return pool.slice().sort((a, b) => {
      const ma = isMaster(v, a) ? 1 : 0, mb = isMaster(v, b) ? 1 : 0;
      return pts(a) - pts(b) || ma - mb || count(suitOf(a)) - count(suitOf(b)) || strength(a, v.gt) - strength(b, v.gt);
    })[0];
  }

  // ================= Farbspiel / Grand =================
  function declarerLead(v) {
    const trumps = v.hand.filter((c) => isT(v, c));
    const sides = v.hand.filter((c) => !isT(v, c));
    const oppT = v.unseen.filter((c) => isT(v, c));
    const opps = [0, 1, 2].filter((p) => p !== v.me);
    if (!sides.length) {
      const top = highestStr(v, trumps);
      if (isMaster(v, top)) return { card: top, reason: 'Du hast nur noch Trümpfe. ' + cardName(top) + ' ist der höchste – er gewinnt sicher.', tag: 'trumpf' };
      const c = lowest(v, trumps);
      return { card: c, reason: 'Nur noch Trümpfe, aber nicht der höchste. Gib den Trumpf mit den wenigsten Augen (' + cardName(c) + ') – die vollen Trümpfe stehen danach.', tag: 'trumpf' };
    }
    if (oppT.length && trumps.length) {
      const top = highestStr(v, trumps);
      if (isMaster(v, top) && (trumps.length >= oppT.length || trumps.length >= 3)) {
        return { card: top, reason: 'Trumpf ziehen: ' + cardName(top) + ' ist der höchste Trumpf im Spiel. Die Gegner müssen Trumpf bedienen und verlieren ihre Trümpfe.', tag: 'trumpf' };
      }
      if (trumps.length >= oppT.length + 2) {
        const jacks = trumps.filter((c) => rankOf(c) === 7 && !isMaster(v, c));
        const small = trumps.filter((c) => pts(c) < 10 && rankOf(c) !== 7);
        const c = jacks.length ? lowestStr(v, jacks) : small.length ? lowestStr(v, small) : lowestStr(v, trumps);
        return { card: c, reason: 'Trumpf ziehen: Du hast ' + trumps.length + ' Trümpfe, die Gegner nur noch ' + oppT.length + '. Mit ' + cardName(c) + ' lockst du ihre hohen Trümpfe heraus.', tag: 'trumpf' };
      }
    }
    // stehende Nebenkarten abziehen
    const masters = sides.filter((c) => isMaster(v, c) && pts(c) >= 10).sort((a, b) => pts(b) - pts(a));
    for (const c of masters) {
      const s = suitOf(c);
      const restInSuit = unseenOf(v, s).length;
      const safe = !oppT.length || (opps.every((p) => !knownVoid(v, p, s)) && restInSuit >= 2);
      if (safe) return { card: c, reason: cardName(c) + ' ist die höchste Karte in ' + SN[s] + (oppT.length ? ' und beide Gegner können wohl noch bedienen' : ' und die Gegner haben keine Trümpfe mehr') + ' – sichere ' + pts(c) + ' Augen.', tag: 'ass' };
    }
    if (!oppT.length) {
      const m = sides.filter((c) => isMaster(v, c));
      if (m.length) return { card: m[0], reason: 'Die Gegner haben keine Trümpfe mehr. ' + cardName(m[0]) + ' steht – der Stich gehört dir.', tag: 'ass' };
    }
    // Farbe entwickeln: lange Nebenfarbe, kleine Karte; keine ungeschützte Zehn
    const bySuit = {};
    for (const c of sides) (bySuit[suitOf(c)] = bySuit[suitOf(c)] || []).push(c);
    const suits = Object.keys(bySuit).map(Number).sort((a, b) => bySuit[b].length - bySuit[a].length);
    for (const s of suits) {
      const cs = bySuit[s].filter((c) => !(rankOf(c) === 5 && !isMaster(v, c)) || bySuit[s].length === 1);
      if (cs.length) {
        const c = lowest(v, cs);
        if (pts(c) < 10) {
          if (bySuit[s].length === 1 && trumps.length) return { card: c, reason: cardName(c) + ' ist deine letzte ' + SN[s] + '-Karte. Danach bist du in ' + SN[s] + ' frei und kannst stechen.', tag: 'farbe' };
          return { card: c, reason: 'Kleine Karte aus deiner längsten Nebenfarbe (' + SN[s] + '): so spielst du die Farbe frei und verlierst nur wenige Augen.', tag: 'farbe' };
        }
      }
    }
    if (trumps.length) {
      const c = lowest(v, trumps);
      return { card: c, reason: 'Kein guter Nebenfarbenzug – ein Trumpf mit wenig Augen ist am sichersten.', tag: 'trumpf' };
    }
    return { card: lowest(v, sides), reason: 'Die Karte mit den wenigsten Augen.', tag: 'farbe' };
  }

  function declarerFollow(v, legal) {
    const ts = trickState(v);
    const canFollow = legal.some((c) => eff(v, c) === ts.leadEff);
    const winners = legal.filter((c) => beats(c, ts.best, v.gt));
    const last = v.trick.length === 2;
    const trumps = v.hand.filter((c) => isT(v, c));
    const oppT = v.unseen.filter((c) => isT(v, c));
    if (winners.length) {
      const safe = last ? winners : winners.filter((c) => ts.after.every((p) => !threat(v, p, c, ts.leadEff)));
      if (safe.length) {
        const pick = lowestStr(v, safe);
        const ruff = !canFollow;
        const total = ts.ptsSoFar + pts(pick);
        if (!ruff || ts.ptsSoFar > 0 || trumps.length > oppT.length) {
          return { card: pick, reason: (ruff ? 'Stechen: ' : '') + 'Mit ' + cardName(pick) + ' gewinnst du den Stich sicher' + (total ? ' (' + total + ' Augen)' : '') + '. Nimm dafür die kleinste Karte, die reicht.', tag: 'stich' };
        }
      } else if (!canFollow && ts.ptsSoFar >= 10) {
        const pick = highestStr(v, winners);
        return { card: pick, reason: 'Im Stich liegen ' + ts.ptsSoFar + ' Augen. Stich hoch mit ' + cardName(pick) + ', damit der letzte Gegner nicht überstechen kann.', tag: 'stich' };
      }
    }
    if (canFollow) {
      const c = lowest(v, legal);
      return { card: c, reason: 'Du kannst den Stich nicht sicher gewinnen. Gib die Karte mit den wenigsten Augen.', tag: 'klein' };
    }
    const c = discardChoice(v, legal);
    return { card: c, reason: 'Abwerfen: ' + cardName(c) + ' kostet am wenigsten' + (isT(v, c) ? '' : ' und macht ' + SN[suitOf(c)] + ' kürzer') + '.', tag: 'abwurf' };
  }

  function defenderLead(v) {
    const sides = v.hand.filter((c) => !isT(v, c));
    const D = v.declarer, P = v.partner;
    const shortWay = (v.me + 1) % 3 === D; // Alleinspieler sitzt direkt hinter mir
    if (!sides.length) {
      const c = lowestStr(v, v.hand);
      return { card: c, reason: 'Du hast nur noch Trümpfe. Spiele den kleinsten.', tag: 'trumpf' };
    }
    const declVoid = (s) => knownVoid(v, D, s);
    const declTrumps = v.unseen.some((c) => isT(v, c) && mayHold(v, D, c));
    // Asse und stehende Zehnen
    const masters = sides.filter((c) => isMaster(v, c) && pts(c) >= 10 && !(declVoid(suitOf(c)) && declTrumps)).sort((a, b) => pts(b) - pts(a));
    if (masters.length) {
      const c = masters[0];
      return { card: c, reason: cardName(c) + ' ist die höchste Karte in ' + SN[suitOf(c)] + '. Hol die Augen, bevor der Alleinspieler frei wird und sticht.', tag: 'ass' };
    }
    // Partner ist frei, Alleinspieler nicht: Partner kann stechen
    if (v.trickNo > 0) {
      for (let s = 0; s < 4; s++) {
        if (v.gt < 4 && s === v.gt) continue;
        const mine = sides.filter((c) => suitOf(c) === s);
        if (!mine.length) continue;
        const partnerVoid = knownVoid(v, P, s);
        const partnerTrumps = v.unseen.some((c) => isT(v, c) && mayHold(v, P, c));
        if (partnerVoid && partnerTrumps && !declVoid(s)) {
          const c = lowest(v, mine);
          return { card: c, reason: 'Dein Partner hat kein ' + SN[s] + ' mehr und kann stechen. Spiel ihm die Farbe zu.', tag: 'partner' };
        }
      }
    }
    // Kurzer Weg – lange Farbe, langer Weg – kurze Farbe
    const bySuit = {};
    for (const c of sides) (bySuit[suitOf(c)] = bySuit[suitOf(c)] || []).push(c);
    let suits = Object.keys(bySuit).map(Number);
    const nonVoid = suits.filter((s) => !(declVoid(s) && declTrumps));
    if (nonVoid.length) suits = nonVoid;
    const bad10 = (s) => bySuit[s].length === 1 && rankOf(bySuit[s][0]) === 5 && !isMaster(v, bySuit[s][0]);
    suits.sort((a, b) => (shortWay ? bySuit[b].length - bySuit[a].length : bySuit[a].length - bySuit[b].length) || (bad10(a) ? 1 : 0) - (bad10(b) ? 1 : 0));
    const s = suits[0];
    const cands = bySuit[s].filter((c) => !(rankOf(c) === 5 && !isMaster(v, c)));
    const c = lowest(v, cands.length ? cands : bySuit[s]);
    const why = shortWay
      ? 'Kurzer Weg – lange Farbe: Der Alleinspieler sitzt direkt hinter dir. Spiel deine lange Farbe (' + SN[s] + '), dein Partner sitzt dahinter und kann reagieren.'
      : 'Langer Weg – kurze Farbe: Der Alleinspieler sitzt am Ende. Spiel eine kurze Farbe (' + SN[s] + '), dann kannst du sie bald selbst stechen.';
    return { card: c, reason: why, tag: 'weg' };
  }

  function defenderFollow(v, legal) {
    const ts = trickState(v);
    const D = v.declarer, P = v.partner;
    const last = v.trick.length === 2;
    const canFollow = legal.some((c) => eff(v, c) === ts.leadEff);
    const declPlayed = v.trick.some((x) => x.p === D);
    const partnerBest = ts.bestP === P;
    const winners = legal.filter((c) => beats(c, ts.best, v.gt));

    const smear = (why) => {
      let pool = legal.slice();
      if (!canFollow) {
        const side = legal.filter((c) => !isT(v, c));
        if (side.length && Math.max(...side.map(pts)) >= 10) pool = side;
        else {
          const t10 = legal.filter((c) => isT(v, c) && rankOf(c) !== 7 && pts(c) >= 10 && !isMaster(v, c));
          pool = side.length ? side.concat(t10) : legal.filter((c) => rankOf(c) !== 7).concat(legal.filter((c) => rankOf(c) === 7));
        }
      }
      const c = pool.slice().sort((a, b) => pts(b) - pts(a) || (isMaster(v, a) ? 1 : 0) - (isMaster(v, b) ? 1 : 0))[0];
      if (pts(c) === 0) return null;
      return { card: c, reason: why + ' Gib ' + cardName(c) + ' (' + pts(c) + ' Augen).', tag: 'schmieren' };
    };

    if (partnerBest) {
      const secure = declPlayed || !threat(v, D, ts.best, ts.leadEff);
      if (secure) {
        const r = smear('Schmieren: Dein Partner gewinnt den Stich sicher.');
        if (r) return r;
      } else {
        // selbst sicher übernehmen?
        const safeW = winners.filter((c) => !threat(v, D, c, ts.leadEff) && pts(c) >= 10);
        if (safeW.length) {
          const c = safeW.sort((a, b) => pts(b) - pts(a))[0];
          return { card: c, reason: 'Der Alleinspieler könnte die Karte deines Partners schlagen, aber nicht ' + cardName(c) + '. So sicherst du ' + (ts.ptsSoFar + pts(c)) + ' Augen.', tag: 'stich' };
        }
      }
      const c = canFollow ? lowest(v, legal) : discardChoice(v, legal);
      return { card: c, reason: 'Noch ist offen, wer den Stich bekommt – der Alleinspieler kommt nach dir. Gib wenig Augen.', tag: 'klein' };
    }
    // Alleinspieler liegt vorn (oder spielt noch nach mir)
    if (winners.length) {
      const after = ts.after; // Spieler nach mir
      const safe = winners.filter((c) => after.every((p) => p === P || !threat(v, p, c, ts.leadEff)));
      if (safe.length) {
        let pick;
        if (canFollow) {
          const full = safe.filter((c) => pts(c) >= 10).sort((a, b) => pts(b) - pts(a));
          pick = full.length && !isT(v, full[0]) ? full[0] : lowestStr(v, safe);
        } else pick = lowestStr(v, safe);
        const ruff = !canFollow;
        if (!ruff || ts.ptsSoFar >= 3 || last) {
          return { card: pick, reason: (ruff ? 'Stechen: ' : '') + 'Nimm dem Alleinspieler den Stich ab – mit ' + cardName(pick) + ' gehört er sicher euch' + (ts.ptsSoFar + pts(pick) ? ' (' + (ts.ptsSoFar + pts(pick)) + ' Augen)' : '') + '.', tag: 'stich' };
        }
      } else if (!canFollow && ts.ptsSoFar >= 10) {
        const pick = highestStr(v, winners);
        return { card: pick, reason: 'Viele Augen im Stich (' + ts.ptsSoFar + '). Stich hoch, damit der Alleinspieler nicht drüber kann.', tag: 'stich' };
      }
    }
    if (!last && !declPlayed) {
      // Alleinspieler kommt noch: klein bleiben
      const c = canFollow ? lowest(v, legal) : discardChoice(v, legal);
      return { card: c, reason: 'Der Alleinspieler kommt nach dir. Gib ihm keine Augen mit.', tag: 'klein' };
    }
    const c = canFollow ? lowest(v, legal) : discardChoice(v, legal);
    return { card: c, reason: 'Der Stich geht an den Alleinspieler. Gib ihm so wenig Augen wie möglich.', tag: 'klein' };
  }

  // ================= Nullspiel =================
  function nullDeclarer(v, legal) {
    const gt = v.gt;
    if (!v.trick.length) {
      // sicherste Karte: es gibt höhere ungesehene Karten derselben Farbe, die Gegner bedienen müssen
      let best = null, bestScore = -1e9;
      for (const c of legal) {
        const s = suitOf(c);
        const higher = v.unseen.filter((x) => suitOf(x) === s && strength(x, gt) > strength(c, gt)).length;
        const lower = v.unseen.filter((x) => suitOf(x) === s && strength(x, gt) < strength(c, gt)).length;
        const score = (higher > 0 ? 10 : -50) - lower * 3 + higher - strength(c, gt) * 0.1;
        if (score > bestScore) { bestScore = score; best = c; }
      }
      return { card: best, reason: 'Null: Spiel eine Karte, die die Gegner überbieten müssen – möglichst niedrig in einer Farbe, in der noch höhere Karten draußen sind.', tag: 'null' };
    }
    const ts = trickState(v);
    const canFollow = legal.some((c) => suitOf(c) === suitOf(ts.cards[0]));
    if (canFollow) {
      const under = legal.filter((c) => !beats(c, ts.best, gt));
      if (under.length) {
        const c = under.sort((a, b) => strength(b, gt) - strength(a, gt))[0];
        return { card: c, reason: 'Null: Bleib unter der höchsten Karte im Stich – und zwar mit der höchsten Karte, die noch drunter passt.', tag: 'null' };
      }
      const c = legal.sort((a, b) => strength(b, gt) - strength(a, gt))[0];
      return { card: c, reason: 'Du kommst nicht drunter. Wenn schon, dann die höchste Karte loswerden.', tag: 'null' };
    }
    // Abwerfen: gefährlichste Karte
    const c = nullDanger(v, legal);
    return { card: c, reason: 'Null: Du bist frei – wirf deine gefährlichste hohe Karte ab (' + cardName(c) + ').', tag: 'null' };
  }
  function nullDanger(v, cards) {
    const gt = v.gt;
    let best = cards[0], bs = -1e9;
    for (const c of cards) {
      const s = suitOf(c);
      const lowerOut = v.unseen.filter((x) => suitOf(x) === s && strength(x, gt) < strength(c, gt)).length;
      const myLower = v.hand.filter((x) => suitOf(x) === s && strength(x, gt) < strength(c, gt)).length;
      const sc = strength(c, gt) + (lowerOut - myLower) * 2;
      if (sc > bs) { bs = sc; best = c; }
    }
    return best;
  }
  function nullDefender(v, legal) {
    const gt = v.gt, D = v.declarer;
    if (!v.trick.length) {
      let best = null, bs = -1e9;
      for (const c of legal) {
        const s = suitOf(c);
        if (knownVoid(v, D, s)) continue;
        let sc = -strength(c, gt) * 2;
        if (v.ouvertHand) {
          const dh = v.ouvertHand.filter((x) => suitOf(x) === s);
          if (!dh.length) continue;
          const dmin = Math.min(...dh.map((x) => strength(x, gt)));
          sc += dmin > strength(c, gt) ? 30 + dmin - strength(c, gt) : -10;
        }
        if (sc > bs) { bs = sc; best = c; }
      }
      if (best == null) best = legal.sort((a, b) => strength(a, gt) - strength(b, gt))[0];
      return { card: best, reason: 'Gegen Null: Spiel eine niedrige Karte einer Farbe, die der Alleinspieler noch hat – er muss drunter bleiben können.', tag: 'null' };
    }
    const ts = trickState(v);
    const canFollow = legal.some((c) => suitOf(c) === suitOf(ts.cards[0]));
    const declPlayed = v.trick.some((x) => x.p === D);
    if (declPlayed) {
      if (ts.bestP === D) {
        const under = legal.filter((c) => !beats(c, ts.best, gt));
        if (under.length) {
          const c = canFollow ? under.sort((a, b) => strength(b, gt) - strength(a, gt))[0] : nullHighDiscard(v, under);
          return { card: c, reason: 'Der Alleinspieler liegt vorn – bleib drunter, dann bekommt er den Stich.', tag: 'null' };
        }
      }
      const c = canFollow ? legal.sort((a, b) => strength(b, gt) - strength(a, gt))[0] : nullHighDiscard(v, legal);
      return { card: c, reason: 'Der Stich ist für den Alleinspieler verloren. Wirf eine hohe Karte ab.', tag: 'null' };
    }
    // Alleinspieler kommt nach mir: Messlatte niedrig halten
    if (canFollow) {
      const c = legal.sort((a, b) => strength(a, gt) - strength(b, gt))[0];
      return { card: c, reason: 'Der Alleinspieler kommt nach dir. Spiel möglichst niedrig, damit er schwer drunter bleiben kann.', tag: 'null' };
    }
    const c = nullHighDiscard(v, legal);
    return { card: c, reason: 'Du bist frei: Wirf eine hohe Karte ab.', tag: 'null' };
  }
  function nullHighDiscard(v, cards) {
    return cards.slice().sort((a, b) => strength(b, v.gt) - strength(a, v.gt))[0];
  }

  function choose(st, me) {
    const v = makeView(st, me);
    const legal = E.legalFor(st, me);
    if (legal.length === 1) return { card: legal[0], reason: 'Du hast nur diese eine erlaubte Karte.', tag: 'zwang' };
    let r;
    if (v.gt === GT_NULL) r = v.isDecl ? nullDeclarer(v, legal) : nullDefender(v, legal);
    else if (v.isDecl) r = v.trick.length ? declarerFollow(v, legal) : declarerLead(v);
    else r = v.trick.length ? defenderFollow(v, legal) : defenderLead(v);
    if (!r || !legal.includes(r.card)) r = { card: lowest(v, legal), reason: 'Die Karte mit den wenigsten Augen.', tag: 'klein' };
    return r;
  }

  // ---------- Coach: klare Fehler erkennen ----------
  function coach(st, me, played) {
    const v = makeView(st, me);
    const legal = E.legalFor(st, me);
    if (legal.length <= 1 || v.gt === GT_NULL) return null;
    if (!v.trick.length) {
      if (!v.isDecl && isT(v, played) && v.hand.some((c) => !isT(v, c)) && v.trickNo < 6) {
        return 'Als Gegenspieler spielt man selten Trumpf aus – damit hilfst du meist dem Alleinspieler, seine Trümpfe zu sparen.';
      }
      return null;
    }
    const ts = trickState(v);
    const last = v.trick.length === 2;
    if (!last) return null;
    const winsNow = beats(played, ts.best, v.gt);
    const partnerBest = !v.isDecl && ts.bestP === v.partner;
    if (partnerBest) {
      const maxP = Math.max(...legal.map(pts));
      if (pts(played) + 3 < maxP && maxP >= 10) {
        const c = legal.find((x) => pts(x) === maxP);
        return 'Hier hättest du schmieren können: Dein Partner hatte den Stich sicher. ' + cardName(c) + ' hätte euch ' + maxP + ' Augen gebracht.';
      }
      return null;
    }
    // Gegner/Alleinspieler liegt vorn und ich bin letzter
    const winners = legal.filter((c) => beats(c, ts.best, v.gt));
    if (!winsNow && winners.length && ts.ptsSoFar >= 10) {
      return 'Du hättest den Stich mit ' + cardName(lowestStr(v, winners)) + ' gewinnen können – es lagen ' + ts.ptsSoFar + ' Augen drin.';
    }
    if (!winsNow) {
      const minP = Math.min(...legal.map(pts));
      if (pts(played) >= 10 && minP <= 4) {
        return 'Du hast ' + pts(played) + ' Augen an die Gegenseite verschenkt. Wenn du den Stich nicht bekommst, gib die kleinste Karte.';
      }
    }
    return null;
  }

  // ================= Blattbewertung =================
  // Merkmale eines Blattes für eine Spielart
  function featSuit(hand, t) {
    const f = {};
    const has = (c) => hand.includes(c);
    f.cj = has(31) ? 1 : 0; f.sj = has(23) ? 1 : 0; f.hj = has(15) ? 1 : 0; f.dj = has(7) ? 1 : 0;
    const jacks = f.cj + f.sj + f.hj + f.dj;
    const tsuit = hand.filter((c) => suitOf(c) === t && rankOf(c) !== 7);
    f.trumps = jacks + tsuit.length;
    f.tA = has(t * 8 + 6) ? 1 : 0;
    f.t10 = has(t * 8 + 5) ? 1 : 0;
    let aces = 0, a10 = 0, tenNoA = 0, voids = 0, singles = 0, losers = 0, sidePts = 0;
    for (let s = 0; s < 4; s++) {
      if (s === t) continue;
      const cs = hand.filter((c) => suitOf(c) === s && rankOf(c) !== 7);
      const A = cs.some((c) => rankOf(c) === 6), T = cs.some((c) => rankOf(c) === 5), K = cs.some((c) => rankOf(c) === 4);
      sidePts += E.sumPts(cs);
      if (!cs.length) voids++;
      if (cs.length === 1 && !A) singles++;
      if (A) aces++;
      if (A && T) a10++;
      if (T && !A) tenNoA++;
      const standing = A ? (T ? (K ? 3 : 2) : 1) : 0;
      losers += Math.max(0, Math.min(cs.length, 3) - standing);
    }
    Object.assign(f, { aces, a10, tenNoA, voids, singles, losers, sidePts });
    f.tv = Math.min(f.trumps, 7) * voids;
    return f;
  }
  function featGrand(hand) {
    const f = {};
    const has = (c) => hand.includes(c);
    f.cj = has(31) ? 1 : 0; f.sj = has(23) ? 1 : 0; f.hj = has(15) ? 1 : 0; f.dj = has(7) ? 1 : 0;
    f.jacks = f.cj + f.sj + f.hj + f.dj;
    let aces = 0, a10 = 0, tenNoA = 0, losers = 0, standing = 0, longS = 0, voids = 0;
    for (let s = 0; s < 4; s++) {
      const cs = hand.filter((c) => suitOf(c) === s && rankOf(c) !== 7);
      const rs = cs.map(rankOf);
      const A = rs.includes(6), T = rs.includes(5), K = rs.includes(4), D = rs.includes(3);
      if (!cs.length) voids++;
      if (A) aces++;
      if (A && T) a10++;
      if (T && !A) tenNoA++;
      const st = A ? (T ? (K ? (D ? 4 : 3) : 2) : 1) : 0;
      standing += st;
      let l = Math.max(0, cs.length - st);
      if (cs.length >= 5 && st >= 2) l = Math.max(0, l - (cs.length - 4));
      losers += l;
      if (cs.length >= 4 && A && T) longS++;
    }
    Object.assign(f, { aces, a10, tenNoA, losers, standing, longS, voids });
    return f;
  }
  // Lückenregel: Karte i (aufsteigend, 0-basiert) ist sicher, wenn ihr Nullrang <= 2*i
  function featNull(hand) {
    let unsafe = 0, badSuits = 0, highUnsafe = 0, voids = 0, maxR = 0;
    for (let s = 0; s < 4; s++) {
      const rs = hand.filter((c) => suitOf(c) === s).map((c) => E.NULL_STR[rankOf(c)]).sort((a, b) => a - b);
      if (!rs.length) { voids++; continue; }
      let u = 0;
      rs.forEach((r, i) => { if (r > 2 * i) { u++; highUnsafe = Math.max(highUnsafe, r - 2 * i); } });
      unsafe += u;
      if (u) badSuits++;
      maxR = Math.max(maxR, rs[0]);
    }
    return { unsafe, badSuits, highUnsafe, voids, maxLow: maxR };
  }

  const FEATS = {
    suit: ['cj', 'sj', 'hj', 'dj', 'trumps', 'tA', 't10', 'aces', 'a10', 'tenNoA', 'voids', 'singles', 'losers', 'sidePts', 'tv', 'vh', 'skat'],
    grand: ['cj', 'sj', 'hj', 'dj', 'jacks', 'aces', 'a10', 'tenNoA', 'losers', 'standing', 'longS', 'voids', 'vh', 'skat'],
    null: ['unsafe', 'badSuits', 'highUnsafe', 'voids', 'maxLow', 'vh'],
  };
  function features(hand, gt, extra) {
    let f;
    if (gt === GT_NULL) f = featNull(hand);
    else if (gt === GT_GRAND) f = featGrand(hand);
    else f = featSuit(hand, gt);
    f.vh = extra.vh ? 1 : 0;
    f.skat = (extra.skat || 0) / 10;
    return f;
  }
  const kindOf = (gt) => (gt === GT_NULL ? 'null' : gt === GT_GRAND ? 'grand' : 'suit');

  // Modelle werden durch tools/train.mjs erzeugt (logistische Regression)
  let MODELS = G.SKAT_MODELS || null;
  function setModels(m) { MODELS = m; }
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  function predict(modelName, kind, f) {
    const m = MODELS && MODELS[modelName] && MODELS[modelName][kind];
    if (!m) return fallbackP(kind, f);
    let z = m.b;
    const names = FEATS[kind];
    for (let i = 0; i < names.length; i++) z += m.w[i] * ((f[names[i]] - m.mu[i]) / m.sd[i]);
    return sigmoid(z);
  }
  function fallbackP(kind, f) {
    if (kind === 'null') return sigmoid(2 - f.unsafe * 1.6);
    if (kind === 'grand') return sigmoid(-4 + f.jacks * 0.9 + f.cj * 0.5 + f.aces * 0.6 + f.a10 * 0.6 - f.losers * 0.5 + f.vh * 0.4);
    return sigmoid(-6 + f.trumps * 0.85 + f.cj * 0.4 + f.sj * 0.2 + f.aces * 0.6 + f.a10 * 0.4 - f.losers * 0.3 + f.voids * 0.2 + f.vh * 0.3);
  }

  // Wahrscheinlichkeit, mit fester Hand (nach dem Drücken / Hand) zu gewinnen
  function pFixed(hand10, gt, vh, skatPts) {
    return predict('post', kindOf(gt), features(hand10, gt, { vh, skat: skatPts }));
  }
  // Wahrscheinlichkeit vor dem Skataufnehmen
  function pBeforeSkat(hand10, gt, vh) {
    return predict('pre', kindOf(gt), features(hand10, gt, { vh, skat: 0 }));
  }

  // Bestes Drücken für Spielart gt bei 12 Karten
  function bestDiscard(cards12, gt, vh) {
    let best = null;
    for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
      const d = [cards12[i], cards12[j]];
      const h = cards12.filter((_, k) => k !== i && k !== j);
      const sp = gt === GT_NULL ? 0 : E.sumPts(d);
      let p = pFixed(h, gt, vh, sp);
      if (gt !== GT_NULL && d.some((c) => rankOf(c) === 7)) p -= 0.03; // Buben drückt man nicht
      if (!best || p > best.p + 1e-9 || (Math.abs(p - best.p) < 1e-9 && sp > best.sp)) best = { discard: d, hand: h, p, sp };
    }
    return best;
  }

  const AVG_SKAT = 120 / 32 * 2; // ~7,5 Augen

  // Spielwert-Schätzung beim Reizen (nur eigene 10 Karten)
  function estValue(hand10, gt, handGame) {
    return E.announcedValue(gt, hand10, { hand: handGame });
  }

  // Für das Reizen: beste Optionen mit Gewinnchance
  function bidOptions(hand10, vh) {
    const opts = [];
    for (let gt = 0; gt <= 5; gt++) {
      const p = pBeforeSkat(hand10, gt, vh);
      const pH = pFixed(hand10, gt, vh, gt === GT_NULL ? 0 : AVG_SKAT);
      opts.push({ gt, p, pHand: pH, value: estValue(hand10, gt, false), valueHand: estValue(hand10, gt, true), sp: E.spitzen(hand10, gt) });
    }
    return opts.sort((a, b) => b.p - a.p);
  }
  // Höchster Reizwert, den man noch vertreten kann
  function bidLimit(hand10, vh, risk) {
    const thr = risk == null ? 0.5 : risk;
    let limit = 0, choice = null;
    for (const o of bidOptions(hand10, vh)) {
      if (o.p >= thr && o.value > limit) { limit = o.value; choice = o; }
      if (o.pHand >= thr + 0.12 && o.valueHand > limit) { limit = o.valueHand; choice = { ...o, hand: true }; }
    }
    return { limit, choice };
  }

  // Entscheidungen des Alleinspielers
  function decideHand(st) {
    const p = st.declarer;
    const h = st.hands[p];
    const vh = p === st.vh;
    let best = null;
    for (let gt = 0; gt <= 5; gt++) {
      const val = E.announcedValue(gt, h.concat(st.skat), { hand: true });
      if (gt === GT_NULL && val < st.bid) continue;
      const pr = pFixed(h, gt, vh, gt === GT_NULL ? 0 : AVG_SKAT);
      if (val >= st.bid && (!best || pr > best.p)) best = { gt, p: pr };
    }
    // Hand nur bei sehr starkem Blatt
    return best && best.p >= 0.92 ? best : null;
  }
  function chooseGame(st, cards12, hand) {
    const p = st.declarer, vh = p === st.vh;
    let cands = [];
    for (let gt = 0; gt <= 5; gt++) {
      const bd = bestDiscard(cards12, gt, vh);
      const val = E.announcedValue(gt, cards12, { hand });
      if (gt === GT_NULL && val < st.bid) continue;
      cands.push({ gt, ...bd, value: val, ok: val >= st.bid });
    }
    const ok = cands.filter((c) => c.ok);
    const pool = ok.length ? ok : cands;
    pool.sort((a, b) => b.p - a.p || b.value - a.value);
    return pool[0];
  }

  // Null ouvert, wenn ganz sicher
  function nullOuvertOk(hand10) {
    const f = featNull(hand10);
    return f.unsafe === 0;
  }

  G.SAI = {
    makeView, choose, coach, isMaster, threat, knownVoid,
    featSuit, featGrand, featNull, features, FEATS, kindOf, predict, setModels, pFixed, pBeforeSkat,
    bestDiscard, bidOptions, bidLimit, decideHand, chooseGame, nullOuvertOk, AVG_SKAT,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

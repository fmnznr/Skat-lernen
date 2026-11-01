/* Skat-Regelwerk nach Internationaler Skatordnung (ISkO).
 * Karten: id = farbe * 8 + rang
 *   farbe: 0 Karo, 1 Herz, 2 Pik, 3 Kreuz
 *   rang:  0 7, 1 8, 2 9, 3 Dame, 4 König, 5 Zehn, 6 Ass, 7 Bube
 * Spielart (gt): 0-3 Farbspiel (Trumpffarbe), 4 Grand, 5 Null
 */
(function (G) {
  'use strict';

  const SUIT_NAMES = ['Karo', 'Herz', 'Pik', 'Kreuz'];
  const SUIT_SYM = ['♦', '♥', '♠', '♣'];
  const RANK_SHORT = ['7', '8', '9', 'D', 'K', '10', 'A', 'B'];
  const RANK_NAMES = ['Sieben', 'Acht', 'Neun', 'Dame', 'König', 'Zehn', 'Ass', 'Bube'];
  const POINTS = [0, 0, 0, 3, 4, 10, 11, 2];
  // Rangfolge im Nullspiel: 7 8 9 10 B D K A
  const NULL_STR = [0, 1, 2, 5, 6, 3, 7, 4];
  const GT_GRAND = 4, GT_NULL = 5;
  const GAME_NAMES = ['Karo', 'Herz', 'Pik', 'Kreuz', 'Grand', 'Null'];
  const BASE = [9, 10, 11, 12, 24];
  const JACKS = [31, 23, 15, 7]; // Kreuz-, Pik-, Herz-, Karo-Bube

  // Kartenbild: französisch (Kreuz, Pik, Herz, Karo) oder deutsch (Eichel, Grün, Rot, Schellen)
  const DECKS = {
    fr: { suits: ['Karo', 'Herz', 'Pik', 'Kreuz'], ranks: ['Sieben', 'Acht', 'Neun', 'Dame', 'König', 'Zehn', 'Ass', 'Bube'], short: ['7', '8', '9', 'D', 'K', '10', 'A', 'B'] },
    de: { suits: ['Schellen', 'Rot', 'Grün', 'Eichel'], ranks: ['Sieben', 'Acht', 'Neun', 'Ober', 'König', 'Zehn', 'Ass', 'Unter'], short: ['7', '8', '9', 'O', 'K', '10', 'A', 'U'] },
  };
  let DECK = 'fr';
  function setDeck(id) {
    const d = DECKS[id] ? id : 'fr';
    DECK = d;
    const x = DECKS[d];
    for (let i = 0; i < 4; i++) { SUIT_NAMES[i] = x.suits[i]; GAME_NAMES[i] = x.suits[i]; }
    for (let i = 0; i < 8; i++) { RANK_NAMES[i] = x.ranks[i]; RANK_SHORT[i] = x.short[i]; }
    return d;
  }
  const deck = () => DECK;

  const suitOf = (c) => c >> 3;
  const rankOf = (c) => c & 7;
  const pts = (c) => POINTS[c & 7];
  const card = (s, r) => s * 8 + r;
  const sumPts = (cards) => cards.reduce((a, c) => a + POINTS[c & 7], 0);

  function cardName(c) {
    return SUIT_NAMES[suitOf(c)] + '-' + RANK_NAMES[rankOf(c)];
  }
  function cardShort(c) {
    return SUIT_SYM[suitOf(c)] + RANK_SHORT[rankOf(c)];
  }

  function isTrump(c, gt) {
    if (gt === GT_NULL) return false;
    if ((c & 7) === 7) return true;
    return gt < 4 && (c >> 3) === gt;
  }
  // effektive Farbe: 4 = Trumpf
  function effSuit(c, gt) {
    return isTrump(c, gt) ? 4 : c >> 3;
  }
  // Stärke innerhalb der effektiven Farbe
  function strength(c, gt) {
    const r = c & 7;
    if (gt === GT_NULL) return NULL_STR[r];
    if (r === 7) return 20 + (c >> 3);
    return r;
  }
  // Schlägt Karte a die bisher beste Karte b (b gehört zur Ausspielfarbe oder ist Trumpf)?
  function beats(a, b, gt) {
    const ea = effSuit(a, gt), eb = effSuit(b, gt);
    if (ea === eb) return strength(a, gt) > strength(b, gt);
    return ea === 4;
  }
  function trickWinnerIndex(cards, gt) {
    let best = 0;
    for (let i = 1; i < cards.length; i++) if (beats(cards[i], cards[best], gt)) best = i;
    return best;
  }
  function legalCards(hand, trickCards, gt) {
    if (!trickCards.length) return hand.slice();
    const le = effSuit(trickCards[0], gt);
    const f = hand.filter((c) => effSuit(c, gt) === le);
    return f.length ? f : hand.slice();
  }

  // Sortierung für die Handanzeige
  function sortHand(hand, gt) {
    const g = gt == null ? 3 : gt;
    const suitRank = (s) => {
      // Farben abwechselnd schwarz/rot: Kreuz, Herz, Pik, Karo
      const order = [3, 1, 2, 0];
      return order.indexOf(s);
    };
    return hand.slice().sort((a, b) => {
      const ea = effSuit(a, g), eb = effSuit(b, g);
      if (ea !== eb) {
        if (ea === 4) return -1;
        if (eb === 4) return 1;
        return suitRank(ea) - suitRank(eb);
      }
      return strength(b, g) - strength(a, g);
    });
  }

  // Spitzen (Matadore): {mit: bool, n}
  function matadorOrder(gt) {
    if (gt === GT_GRAND) return JACKS.slice();
    return JACKS.concat([6, 5, 4, 3, 2, 1, 0].map((r) => card(gt, r)));
  }
  function spitzen(cards, gt) {
    if (gt === GT_NULL) return { mit: false, n: 0 };
    const order = matadorOrder(gt);
    const set = new Set(cards);
    const mit = set.has(order[0]);
    let n = 0;
    for (const c of order) {
      if (set.has(c) === mit) n++;
      else break;
    }
    return { mit, n };
  }

  function nullValue(hand, ouvert) {
    if (ouvert) return hand ? 59 : 46;
    return hand ? 35 : 23;
  }

  // Stufen für ein Farb-/Grandspiel
  function levelsFor(p) {
    const sAng = !!(p.schneiderAng || p.schwarzAng || p.ouvert);
    const swAng = !!(p.schwarzAng || p.ouvert);
    const items = [];
    items.push({ label: (p.mit ? 'mit ' : 'ohne ') + p.n, v: p.n });
    items.push({ label: 'Spiel', v: 1 });
    if (p.hand) items.push({ label: 'Hand', v: 1 });
    if (p.schneider || sAng) items.push({ label: 'Schneider', v: 1 });
    if (sAng) items.push({ label: 'Schneider angesagt', v: 1 });
    if (p.schwarz || swAng) items.push({ label: 'Schwarz', v: 1 });
    if (swAng) items.push({ label: 'Schwarz angesagt', v: 1 });
    if (p.ouvert) items.push({ label: 'Ouvert', v: 1 });
    return items;
  }

  // Wert eines angesagten Spiels vor dem Ausspielen (ohne Schneider/Schwarz-Ergebnis)
  function announcedValue(gt, cards12, opts) {
    if (gt === GT_NULL) return nullValue(opts.hand, opts.ouvert);
    const sp = spitzen(cards12, gt);
    const items = levelsFor({ ...sp, hand: opts.hand, schneiderAng: opts.schneiderAng, schwarzAng: opts.schwarzAng, ouvert: opts.ouvert });
    return items.reduce((a, i) => a + i.v, 0) * BASE[gt];
  }

  // Alle möglichen Reizwerte
  const BID_VALUES = (() => {
    const s = new Set([23, 35, 46, 59]);
    for (const b of [9, 10, 11, 12]) for (let l = 2; l <= 18; l++) s.add(b * l);
    for (let l = 2; l <= 11; l++) s.add(24 * l);
    return [...s].filter((v) => v >= 18).sort((a, b) => a - b);
  })();
  function nextBid(v) {
    for (const b of BID_VALUES) if (b > v) return b;
    return null;
  }

  function gameLabel(game) {
    if (!game) return '';
    let s = GAME_NAMES[game.gt];
    if (game.gt === GT_NULL) {
      if (game.ouvert) s += ' ouvert';
      if (game.hand) s += ' Hand';
      return s;
    }
    if (game.hand) s += ' Hand';
    if (game.ouvert) s += ' ouvert';
    else if (game.schwarzAng) s += ', Schwarz angesagt';
    else if (game.schneiderAng) s += ', Schneider angesagt';
    return s;
  }

  // ---------- Ergebnis ----------
  // st: {declarer, bid, game:{gt,hand,schneiderAng,schwarzAng,ouvert}, declCards12, tricks:[{winner, cards:[{p,c}]}], skatPts}
  function evaluate(st) {
    const g = st.game;
    const gt = g.gt;
    let declPts = st.skatPts || 0;
    let declTricks = 0;
    for (const t of st.tricks) {
      if (t.winner === st.declarer) {
        declTricks++;
        declPts += sumPts(t.cards.map((x) => x.c));
      }
    }
    if (gt === GT_NULL) declPts = st.tricks.filter((t) => t.winner === st.declarer).reduce((a, t) => a + sumPts(t.cards.map((x) => x.c)), 0);
    const oppPts = 120 - declPts;
    const res = { gt, declPts, oppPts, declTricks, bid: st.bid, overbid: false, items: [], base: 0 };
    if (gt === GT_NULL) {
      res.won = declTricks === 0;
      res.value = nullValue(g.hand, g.ouvert);
      res.items = [{ label: gameLabel(g), v: res.value }];
      res.reason = res.won ? 'Der Alleinspieler hat keinen Stich bekommen.' : 'Der Alleinspieler hat einen Stich bekommen.';
    } else {
      const sp = spitzen(st.declCards12, gt);
      const schneider = declPts >= 90 || declPts <= 30;
      const schwarz = declTricks === st.tricks.length && st.tricks.length === 10 || declTricks === 0;
      const items = levelsFor({ ...sp, hand: g.hand, schneider, schwarz, schneiderAng: g.schneiderAng, schwarzAng: g.schwarzAng, ouvert: g.ouvert });
      const levels = items.reduce((a, i) => a + i.v, 0);
      res.base = BASE[gt];
      res.items = items;
      res.levels = levels;
      res.spitzen = sp;
      let won;
      if (g.schwarzAng || g.ouvert) {
        won = declTricks === 10;
        res.reason = won ? 'Alle Stiche gemacht – Schwarz wie angesagt.' : 'Schwarz war angesagt, aber die Gegner haben einen Stich bekommen.';
      } else if (g.schneiderAng) {
        won = declPts >= 90;
        res.reason = won ? 'Schneider wie angesagt erreicht (' + declPts + ' Augen).' : 'Schneider angesagt, aber nur ' + declPts + ' Augen.';
      } else {
        won = declPts >= 61;
        res.reason = won ? 'Der Alleinspieler hat ' + declPts + ' Augen (mindestens 61).' : 'Der Alleinspieler hat nur ' + declPts + ' Augen (61 nötig).';
      }
      res.value = levels * BASE[gt];
      res.won = won;
      if (res.value < st.bid) {
        res.overbid = true;
        res.won = false;
        res.valueBefore = res.value;
        res.value = Math.ceil(st.bid / BASE[gt]) * BASE[gt];
        res.reason = 'Überreizt: Das Spiel ist nur ' + res.valueBefore + ' wert, gereizt wurde ' + st.bid + '.';
      }
    }
    res.score = res.won ? res.value : -2 * res.value;
    // Seeger-Fabian: +50 / -50 für den Alleinspieler, +40 je Gegenspieler bei verlorenem Spiel
    res.sfDecl = res.won ? res.value + 50 : -2 * res.value - 50;
    res.sfOpp = res.won ? 0 : 40;
    return res;
  }

  // ---------- Spielzustand ----------
  function shuffled(rng) {
    const d = [];
    for (let i = 0; i < 32; i++) d.push(i);
    for (let i = 31; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Austeilen wie am Tisch: 3 - Skat 2 - 4 - 3
  function deal(dealer, rng) {
    const d = shuffled(rng || Math.random);
    const hands = [[], [], []];
    const skat = [];
    let i = 0;
    const order = [(dealer + 1) % 3, (dealer + 2) % 3, dealer];
    for (const p of order) for (let k = 0; k < 3; k++) hands[p].push(d[i++]);
    skat.push(d[i++], d[i++]);
    for (const p of order) for (let k = 0; k < 4; k++) hands[p].push(d[i++]);
    for (const p of order) for (let k = 0; k < 3; k++) hands[p].push(d[i++]);
    return { hands, skat };
  }

  function newGame(dealer, dealt) {
    const vh = (dealer + 1) % 3, mh = (dealer + 2) % 3, hh = dealer;
    return {
      phase: 'bidding',
      dealer, vh, mh, hh,
      hands: dealt.hands.map((h) => h.slice()),
      skat: dealt.skat.slice(),
      origHands: dealt.hands.map((h) => h.slice()),
      origSkat: dealt.skat.slice(),
      bidding: { stage: 1, sayer: mh, hearer: vh, bid: 0, waiting: 'say', winner: null, log: [], passed: [false, false, false] },
      declarer: null,
      bid: 0,
      game: null,
      skatTaken: false,
      discard: [],
      trick: [],
      leader: vh,
      turn: vh,
      tricks: [],
      voids: [[false, false, false, false, false], [false, false, false, false, false], [false, false, false, false, false]],
      result: null,
    };
  }

  // Wer ist beim Reizen am Zug?
  function biddingActor(st) {
    const b = st.bidding;
    if (b.waiting === 'say') return b.sayer;
    if (b.waiting === 'hear') return b.hearer;
    if (b.waiting === 'vh18') return st.vh;
    return null;
  }

  function finishBidding(st, declarer) {
    st.bidding.waiting = null;
    if (declarer == null) {
      st.phase = 'eingepasst';
      return;
    }
    st.declarer = declarer;
    st.bid = st.bidding.bid;
    st.phase = 'skat';
  }

  // action: {type:'say', value} | {type:'pass'} | {type:'yes'} | {type:'play18'}
  function bidAction(st, p, action) {
    const b = st.bidding;
    const log = (txt) => b.log.push({ p, txt });
    if (b.waiting === 'say') {
      if (p !== b.sayer) throw new Error('nicht am Zug');
      if (action.type === 'say') {
        if (action.value <= b.bid) throw new Error('zu niedrig');
        b.bid = action.value;
        log(String(action.value));
        b.waiting = 'hear';
        return;
      }
      if (action.type === 'pass') {
        log('Passe');
        b.passed[p] = true;
        nextStage(st, b.hearer);
        return;
      }
    } else if (b.waiting === 'hear') {
      if (p !== b.hearer) throw new Error('nicht am Zug');
      if (action.type === 'yes') {
        log('Ja');
        b.waiting = 'say';
        return;
      }
      if (action.type === 'pass') {
        log('Passe');
        b.passed[p] = true;
        nextStage(st, b.sayer);
        return;
      }
    } else if (b.waiting === 'vh18') {
      if (p !== st.vh) throw new Error('nicht am Zug');
      if (action.type === 'play18') {
        b.bid = 18;
        log('18');
        finishBidding(st, st.vh);
        return;
      }
      if (action.type === 'pass') {
        log('Passe');
        b.passed[p] = true;
        finishBidding(st, null);
        return;
      }
    }
    throw new Error('ungültige Reizaktion');
  }

  function nextStage(st, winner) {
    const b = st.bidding;
    if (b.stage === 1) {
      b.stage = 2;
      b.winner = winner;
      b.sayer = st.hh;
      b.hearer = winner;
      b.waiting = 'say';
      return;
    }
    // Stufe 2 beendet
    if (b.bid === 0) {
      // niemand hat etwas gesagt
      if (winner === st.vh && !b.passed[st.vh]) {
        b.stage = 3;
        b.waiting = 'vh18';
        return;
      }
      finishBidding(st, null);
      return;
    }
    finishBidding(st, winner);
  }

  function takeSkat(st) {
    st.hands[st.declarer] = st.hands[st.declarer].concat(st.skat);
    st.skatTaken = true;
    st.phase = 'discard';
  }

  function doDiscard(st, cards2) {
    const h = st.hands[st.declarer];
    if (cards2.length !== 2 || !cards2.every((c) => h.includes(c))) throw new Error('2 Karten drücken');
    st.discard = cards2.slice();
    st.hands[st.declarer] = h.filter((c) => !cards2.includes(c));
    st.phase = 'declare';
  }

  function playHand(st) {
    st.skatTaken = false;
    st.discard = st.skat.slice();
    st.phase = 'declare';
  }

  // game: {gt, hand, schneiderAng, schwarzAng, ouvert}
  function canDeclare(st, game) {
    const hand = !st.skatTaken;
    if (!!game.hand !== hand) return 'Hand nur, wenn der Skat nicht aufgenommen wurde.';
    if (game.gt === GT_NULL) {
      if (game.schneiderAng || game.schwarzAng) return 'Im Nullspiel gibt es kein Schneider/Schwarz.';
      if (nullValue(hand, game.ouvert) < st.bid) return 'Der Nullwert (' + nullValue(hand, game.ouvert) + ') liegt unter dem Reizwert ' + st.bid + '.';
      return null;
    }
    if ((game.schneiderAng || game.schwarzAng || game.ouvert) && !hand) return 'Schneider, Schwarz und Ouvert kann man nur beim Handspiel ansagen.';
    return null;
  }

  function declare(st, game) {
    const err = canDeclare(st, game);
    if (err) throw new Error(err);
    const g = { gt: game.gt, hand: !!game.hand, schneiderAng: !!(game.schneiderAng || game.schwarzAng || (game.ouvert && game.gt !== GT_NULL)), schwarzAng: !!(game.schwarzAng || (game.ouvert && game.gt !== GT_NULL)), ouvert: !!game.ouvert };
    st.game = g;
    st.declCards12 = st.hands[st.declarer].concat(st.discard);
    st.phase = 'play';
    st.leader = st.vh;
    st.turn = st.vh;
    st.trick = [];
  }

  function legalFor(st, p) {
    return legalCards(st.hands[p], st.trick.map((x) => x.c), st.game.gt);
  }

  // Karte spielen; gibt ggf. abgeschlossenen Stich zurück
  function playCard(st, p, c) {
    if (st.phase !== 'play') throw new Error('nicht in der Spielphase');
    if (p !== st.turn) throw new Error('nicht am Zug');
    const legal = legalFor(st, p);
    if (!legal.includes(c)) throw new Error('Karte nicht erlaubt');
    const gt = st.game.gt;
    if (st.trick.length) {
      const le = effSuit(st.trick[0].c, gt);
      if (effSuit(c, gt) !== le) st.voids[p][le] = true;
    }
    st.hands[p] = st.hands[p].filter((x) => x !== c);
    st.trick.push({ p, c });
    if (st.trick.length < 3) {
      st.turn = (p + 1) % 3;
      return null;
    }
    const wi = trickWinnerIndex(st.trick.map((x) => x.c), gt);
    const winner = st.trick[wi].p;
    const t = { leader: st.trick[0].p, cards: st.trick, winner, pts: sumPts(st.trick.map((x) => x.c)) };
    st.tricks.push(t);
    st.trick = [];
    st.leader = winner;
    st.turn = winner;
    const nullLost = gt === GT_NULL && winner === st.declarer;
    const schwarzLost = (st.game.schwarzAng || st.game.ouvert) && gt !== GT_NULL && winner !== st.declarer;
    if (st.tricks.length === 10 || nullLost || schwarzLost) finish(st);
    return t;
  }

  function finish(st) {
    st.phase = 'done';
    st.result = evaluate({
      declarer: st.declarer,
      bid: st.bid,
      game: st.game,
      declCards12: st.declCards12,
      tricks: st.tricks,
      skatPts: st.game.gt === GT_NULL ? 0 : sumPts(st.discard),
    });
    st.result.early = st.tricks.length < 10;
  }

  function pointsSoFar(st) {
    const r = [0, 0, 0];
    for (const t of st.tricks) r[t.winner] += t.pts;
    return r;
  }

  G.SE = {
    DECKS, setDeck, deck, SUIT_NAMES, SUIT_SYM, RANK_SHORT, RANK_NAMES, POINTS, NULL_STR, GT_GRAND, GT_NULL, GAME_NAMES, BASE, JACKS, BID_VALUES,
    suitOf, rankOf, pts, card, sumPts, cardName, cardShort, isTrump, effSuit, strength, beats, trickWinnerIndex, legalCards, sortHand,
    matadorOrder, spitzen, nullValue, levelsFor, announcedValue, nextBid, gameLabel, evaluate,
    shuffled, mulberry32, deal, newGame, biddingActor, bidAction, takeSkat, doDiscard, playHand, canDeclare, declare, legalFor, playCard, pointsSoFar,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

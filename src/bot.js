/* Entscheidungen der Computergegner */
(function (G) {
  'use strict';
  const E = G.SE, A = G.SAI;

  function bidAction(st, p, risk) {
    const b = st.bidding;
    const { limit } = A.bidLimit(st.hands[p], p === st.vh, risk);
    if (b.waiting === 'say') {
      const nb = E.nextBid(b.bid);
      return nb && nb <= limit ? { type: 'say', value: nb } : { type: 'pass' };
    }
    if (b.waiting === 'hear') return b.bid <= limit ? { type: 'yes' } : { type: 'pass' };
    if (b.waiting === 'vh18') return limit >= 18 ? { type: 'play18' } : { type: 'pass' };
    return { type: 'pass' };
  }

  // Skat aufnehmen oder Hand, drücken, ansagen
  function declare(st) {
    const hand = A.decideHand(st);
    if (hand) {
      E.playHand(st);
      E.declare(st, { gt: hand.gt, hand: true });
      return;
    }
    E.takeSkat(st);
    const ch = A.chooseGame(st, st.hands[st.declarer], false);
    E.doDiscard(st, ch.discard);
    const ouvert = ch.gt === E.GT_NULL && A.nullOuvertOk(st.hands[st.declarer]) && st.declarer !== st.vh;
    E.declare(st, { gt: ch.gt, hand: false, ouvert });
  }

  function play(st, p) {
    return A.choose(st, p).card;
  }

  // Komplettes Spiel nur mit Bots (für Tests und Training)
  function runGame(dealer, rng, risks) {
    const st = E.newGame(dealer, E.deal(dealer, rng));
    let guard = 0;
    while (st.phase === 'bidding' && guard++ < 200) {
      const p = E.biddingActor(st);
      E.bidAction(st, p, bidAction(st, p, risks ? risks[p] : undefined));
    }
    if (st.phase === 'eingepasst') return st;
    declare(st);
    playOut(st);
    return st;
  }
  function playOut(st) {
    while (st.phase === 'play') E.playCard(st, st.turn, play(st, st.turn));
    return st;
  }

  G.SBOT = { bidAction, declare, play, runGame, playOut };
})(typeof globalThis !== 'undefined' ? globalThis : window);

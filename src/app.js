/* Oberfläche: Lernpfad, Lektionen, Übungen, Übungsspiel, Fortschritt */
(function () {
  'use strict';
  const E = window.SE, A = window.SAI, B = window.SBOT, C = window.SCONTENT, D = window.SDRILLS;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const SYM = E.SUIT_SYM, RS = E.RANK_SHORT;
  const rand = (n) => Math.floor(Math.random() * n);

  // ================= Speicher =================
  const LS_P = 'skat.progress.v1', LS_G = 'skat.game.v1', LS_GG = 'skat.guide.v1';
  const lsGet = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* kein Speicher */ } };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* */ } };
  const defaults = () => ({ v: 1, updatedAt: 0, lessons: {}, drills: {}, tactics: {}, games: [], list: [], guides: {}, countChecks: { ok: 0, total: 0 }, settings: { help: 'lern', tempo: 'normal', deck: 'de', sound: true }, dealer: null,
    xp: 0, days: {}, perfect: 0, streak: { n: 0, last: null, best: 0, freeze: 1, bridged: null }, plan: { start: null, flags: {}, base: {}, doneOn: {}, skip: {} }, srs: {}, exams: {}, ach: {} });
  let P = normalize(lsGet(LS_P));
  function normalize(x) {
    const d = defaults();
    if (!x || typeof x !== 'object') return d;
    const o = Object.assign(d, x);
    o.settings = Object.assign(defaults().settings, x.settings || {});
    o.countChecks = Object.assign({ ok: 0, total: 0 }, x.countChecks || {});
    o.guides = Object.assign({}, x.guides || {});
    o.streak = Object.assign(defaults().streak, x.streak || {});
    o.plan = Object.assign(defaults().plan, x.plan || {});
    for (const k of ['days', 'srs', 'exams', 'ach']) o[k] = Object.assign({}, x[k] || {});
    o.xp = Number(x.xp) || 0; o.perfect = Number(x.perfect) || 0;
    return o;
  }
  function save() {
    P.updatedAt = Date.now();
    if (P.games.length > 200) P.games = P.games.slice(-200);
    if (P.list.length > 120) P.list = P.list.slice(-120);
    lsSet(LS_P, P);
    Cloud.push();
  }

  // Fortschritt geräteübergreifend sichern, wenn die Seite als claude.ai-Artifact läuft
  const Cloud = {
    ref: null, busy: false, dirty: false, t: null,
    async init() {
      try {
        if (!window.claude || typeof window.claude.use !== 'function') return;
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        if (!db || !user) return;
        const id = await user.id();
        if (!id) return;
        const ref = db.doc('data/users/' + id + '/skat');
        const snap = await ref.get();
        this.ref = ref;
        if (snap.exists) {
          const remote = snap.data() && snap.data().progress;
          if (remote && (remote.updatedAt || 0) > (P.updatedAt || 0)) {
            P = normalize(JSON.parse(JSON.stringify(remote)));
            lsSet(LS_P, P);
            applyDeck();
            route();
            return;
          }
        }
        if (P.updatedAt) this.push();
      } catch (e) { this.ref = null; }
    },
    push() {
      if (!this.ref) return;
      clearTimeout(this.t);
      this.t = setTimeout(() => this.write(), 2500);
    },
    async write() {
      if (!this.ref) return;
      if (this.busy) { this.dirty = true; return; }
      this.busy = true;
      try { await this.ref.set({ progress: JSON.parse(JSON.stringify(P)) }); } catch (e) { if (e && (e.code === 'revoked' || e.code === 'not_granted' || e.code === 'invalid_argument')) this.ref = null; }
      this.busy = false;
      if (this.dirty) { this.dirty = false; this.push(); }
    },
  };

  // ================= Kartenbild =================
  // Farbzeichen des deutschen Blatts als SVG (Schellen, Rot, Grün, Eichel)
  const SPRITE = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">'
    + '<symbol id="gs0" viewBox="0 0 24 24"><circle cx="12" cy="4.2" r="1.7" fill="none" stroke="#a8690c" stroke-width="1.3"/><circle cx="12" cy="13.6" r="8" fill="#f2b62b" stroke="#a8690c" stroke-width=".9"/><path d="M4.3 11.4h15.4v2.8H4.3z" fill="#c4302b"/><path d="M8.6 18h6.8" stroke="#6b430b" stroke-width="1.7" stroke-linecap="round"/><circle cx="9" cy="8.6" r="1.4" fill="#fff3c4" opacity=".8"/></symbol>'
    + '<symbol id="gs1" viewBox="0 0 24 24"><path d="M12 21.4C5.6 16.5 2.4 13 2.4 8.9c0-3 2.3-5.4 5.2-5.4 1.8 0 3.4.9 4.4 2.4 1-1.5 2.6-2.4 4.4-2.4 2.9 0 5.2 2.4 5.2 5.4 0 4.1-3.2 7.6-9.6 12.5z" fill="#d22b2b"/><path d="M6 7.5c.5-1.2 1.4-1.8 2.4-1.9" stroke="#f6b3b3" stroke-width="1.3" fill="none" stroke-linecap="round"/></symbol>'
    + '<symbol id="gs2" viewBox="0 0 24 24"><path d="M12 1.6C8 4.9 3.7 8.8 3.7 13.2c0 3.3 2.5 5.5 5.4 5.5 1.3 0 2.2-.4 2.9-1 .7.6 1.6 1 2.9 1 2.9 0 5.4-2.2 5.4-5.5C20.3 8.8 16 4.9 12 1.6z" fill="#3e9a34"/><path d="M12 4.6v18" stroke="#24631d" stroke-width="1.6" stroke-linecap="round"/><path d="M12 9.5l-3.6 2.6M12 9.5l3.6 2.6M12 13.3l-4.6 2.3M12 13.3l4.6 2.3" stroke="#24631d" stroke-width=".9" stroke-linecap="round"/></symbol>'
    + '<symbol id="gs3" viewBox="0 0 24 24"><path d="M12 1.3v3.2" stroke="#4a2c10" stroke-width="1.6" stroke-linecap="round"/><path d="M6.7 10.6c0 6.3 2.6 11.3 5.3 12 2.7-.7 5.3-5.7 5.3-12z" fill="#b8762f"/><path d="M9.3 13c.3 2.8 1 5 2 6.6" stroke="#e2ae72" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M4.9 11.3c0-4.4 3.1-7.4 7.1-7.4s7.1 3 7.1 7.4c0 .6-.4 1-1 1H5.9c-.6 0-1-.4-1-1z" fill="#6b4220"/><path d="M7.3 9.3h9.4M6.4 11h11.2M9 6.8l1.4 4.6M12 5.6v5.8M15 6.8l-1.4 4.6" stroke="#4a2c10" stroke-width=".7" opacity=".7"/></symbol>'
    + '</svg>';
  const isDe = () => E.deck() === 'de';
  const suitMark = (s) => (isDe() ? '<svg class="si" aria-hidden="true"><use href="#gs' + s + '"/></svg>' : SYM[s]);
  // Begriffe des französischen Blatts in die des deutschen übersetzen
  const DE_TERMS = [
    [/\bder ((?:[A-ZÄÖÜ][a-zäöü]+-)?)Dame\b/g, 'dem $1Ober'],
    [/Buben/g, 'Unter'], [/Bube/g, 'Unter'], [/Dame/g, 'Ober'],
    [/Kreuz/g, 'Eichel'], [/Pik/g, 'Grün'], [/Herz/g, 'Rot'], [/Karo/g, 'Schellen'],
  ];
  function T(text) {
    let t = String(text);
    const keep = [];
    t = t.replace(/\{\{fr:([\s\S]*?)\|de:([\s\S]*?)\}\}/g, (_, fr, de) => { keep.push(isDe() ? de : fr); return '\u0000' + (keep.length - 1) + '\u0000'; });
    if (isDe()) for (const [re, to] of DE_TERMS) t = t.replace(re, to);
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[Number(i)]);
  }
  function applyDeck() {
    E.setDeck(P.settings.deck);
    document.documentElement.classList.toggle('deck-de', isDe());
  }

  // ================= Bausteine =================
  function cardHTML(c, o) {
    o = o || {};
    const s = E.suitOf(c), r = E.rankOf(c);
    const face = r === 3 || r === 4 || r === 7;
    const cls = ['card', 's' + s];
    if (r === 7) cls.push('jack');
    if (o.cls) cls.push(o.cls);
    const center = face ? '<span class="pip face"><span>' + RS[r] + '<small>' + suitMark(s) + '</small></span></span>' : '<span class="pip">' + suitMark(s) + '</span>';
    const tag = o.button ? 'button' : 'div';
    return '<' + tag + ' class="' + cls.join(' ') + '" data-c="' + c + '"' + (o.button ? ' type="button"' : '') + ' aria-label="' + E.cardName(c) + '"><span class="ix">' + RS[r] + '<i>' + suitMark(s) + '</i></span>' + center + '</' + tag + '>';
  }
  const backHTML = () => '<div class="card back" aria-hidden="true"></div>';
  const chip = (c) => '<span class="chip s' + E.suitOf(c) + '" title="' + E.cardName(c) + '">' + suitMark(E.suitOf(c)) + RS[E.rankOf(c)] + '</span>';
  // Fachbegriffe antippbar machen
  const GL = C.GLOSSARY;
  const GL_KEYS = Object.keys(GL);
  const WCH = 'A-Za-zÄÖÜäöüß';
  const TERM_RE = new RegExp('(^|[^' + WCH + '])(' + GL_KEYS.map((k) => GL[k].re).join('|') + ')(?![' + WCH + '])', 'g');
  const GL_MATCH = GL_KEYS.map((k) => [new RegExp('^(?:' + GL[k].re + ')$'), k]);
  function linkTerms(html) {
    const used = new Set();
    return html.split(/(<[^>]+>)/).map((seg) => {
      if (seg[0] === '<') return seg;
      return seg.replace(TERM_RE, (m, pre, w) => {
        const hit = GL_MATCH.find(([re]) => re.test(w));
        if (!hit || used.has(hit[1])) return m;
        used.add(hit[1]);
        return pre + '<span class="term" data-term="' + hit[1] + '" role="button" tabindex="0">' + w + '</span>';
      });
    }).join('');
  }
  function showTerm(k) {
    const g = GL[k];
    if (!g) return;
    let el = $('#gloss');
    if (!el) { el = document.createElement('div'); el.id = 'gloss'; document.body.appendChild(el); el.onclick = (ev) => { if (ev.target === el || ev.target.closest('[data-close]')) el.hidden = true; }; }
    el.innerHTML = '<div class="gl-in" role="dialog" aria-modal="true"><div class="eyebrow">Begriff</div><h3>' + esc(T(g.t)) + '</h3><p>' + rich(g.d, { terms: false }) + '</p><button class="btn small" data-close="1">Verstanden</button></div>';
    el.hidden = false;
  }
  function rich(t, o) {
    let h = T(t)
      .replace(/\[\[([^\]]+)\]\]/g, (_, s) => '<span class="crow">' + s.trim().split(/\s+/).map((x) => cardHTML(D.parse(x))).join('') + '</span>')
      .replace(/\{([dhpk])(10|[789DKAB])\}/g, (_, su, rk) => chip(D.parse(su + rk)));
    if (isDe()) h = h.replace(/[♦♥♠♣]/g, (m) => suitMark('♦♥♠♣'.indexOf(m)));
    if (!o || o.terms !== false) h = linkTerms(h);
    return h;
  }
  function toast(msg, ms) {
    const el = $('#toast');
    el.innerHTML = rich(msg, { terms: false });
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, ms || 2600);
  }
  function openSheet(html, onClick) {
    const s = $('#sheet');
    s.classList.toggle('noanim', !s.hidden);
    s.innerHTML = '<div class="inner" role="dialog" aria-modal="true">' + html + '</div>';
    s.hidden = false;
    s.onclick = (ev) => { if (onClick) onClick(ev); };
  }
  function closeSheet() { const s = $('#sheet'); s.hidden = true; s.innerHTML = ''; s.onclick = null; }
  const pct = (x) => Math.round(x * 100) + '\u00a0%';
  const ICON = {
    lernen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 12h5"/></svg>',
    ueben: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
    spielen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="10" height="14" rx="2" transform="rotate(-10 8 12)"/><rect x="11" y="4" width="10" height="14" rx="2" transform="rotate(8 16 11)"/></svg>',
    fortschritt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    flame: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.6 1.6c.5 3.4-1 5.2-2.7 7C8.2 10.400 6 12.300 6 15.600 6 19.300 8.700 22 12 22s6-2.700 6-6.400c0-2.300-1-4.100-2.200-5.700-.5 1.500-1.300 2.400-2.300 2.900.6-3.700-.2-7.900-.9-11.200z"/><path fill="#fff" opacity=".55" d="M12 20.300c-1.700 0-3-1.300-3-3.100 0-1.700 1.300-2.700 3-4.800 1.700 2.100 3 3.100 3 4.800 0 1.800-1.300 3.100-3 3.100z"/></svg>',
    bolt: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 1.500 4 13.500h6.200L9 22.500l10-12.600h-6.400z"/></svg>',
    lock: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.500"/><path d="M8 11V7.500a4 4 0 0 1 8 0V11"/></svg>',
    check: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.500l4.500 4.500L19 7.500"/></svg>',
    cross: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6.500 6.500l11 11M17.500 6.500l-11 11"/></svg>',
    close: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    repeat: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a8 8 0 0 1 13.700-5.300L20 8M20 3.500V8h-4.500M20 13a8 8 0 0 1-13.700 5.300L4 16M4 20.500V16h4.500"/></svg>',
    bulb: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21.500h4M12 2.500a6.500 6.500 0 0 0-3.800 11.800c.5.400.8 1 .8 1.700h6c0-.7.300-1.300.8-1.700A6.500 6.500 0 0 0 12 2.500z"/></svg>',
    trophy: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.500A3.500 3.500 0 0 0 7.500 11M17 6h3v1.500a3.500 3.500 0 0 1-3.500 3.500M12 14v4M8.500 21h7M9.500 18h5"/></svg>',
  };

  // ================= Stufen =================
  const LEVELS = C.LEVELS;
  const lessonDone = (id) => !!(P.lessons[id] && P.lessons[id].done);
  const drillBest = (id) => (P.drills[id] && P.drills[id].best) || 0;
  const dTitle = (id) => D.DRILLS[id].title;
  function reqLessons(stage) {
    const ls = C.LESSONS.filter((l) => l.stage === stage);
    const done = ls.filter((l) => lessonDone(l.id)).length;
    const next = ls.find((l) => !lessonDone(l.id));
    return { t: 'Lektionen der Stufe ' + stage, ok: done === ls.length, pv: done + '/' + ls.length, href: next ? '#lektion-' + next.id : null, label: next ? 'Lektion „' + next.title + '“' : '' };
  }
  const reqDrill = (id) => ({ t: 'Übung „' + dTitle(id) + '“ mit 80 %', ok: drillBest(id) >= 80, pv: drillBest(id) ? drillBest(id) + ' %' : '–', href: '#uebung-' + id, label: 'Übung „' + dTitle(id) + '“' });
  function reqTactics(maxStage, need) {
    const ts = C.TACTICS.filter((t) => t.stage <= maxStage);
    const n = ts.filter((t) => P.tactics[t.id]).length;
    return { t: 'Taktik-Aufgaben gelöst', ok: n >= need, pv: n + '/' + need, href: '#taktik', label: 'Taktik-Aufgaben' };
  }
  const GUIDES = [
    { n: 1, stage: 1, t: 'Dein erstes Spiel', d: 'Karten, Stiche, Trumpf – jeder Zug wird erklärt' },
    { n: 2, stage: 1, t: 'Zu zweit gegen einen', d: 'Als Partnerin von Lena: gemeinsam gegen Tom' },
    { n: 3, stage: 2, after: true, t: 'Reizen und Skat', d: 'Ein ganzes Spiel, vom Reizen bis zur Abrechnung' },
  ];
  const guideDone = (n) => !!(P.guides[n] && P.guides[n].done);
  const reqGuide = (n) => { const g = GUIDES[n - 1]; return { t: 'Geführtes Spiel „' + g.t + '“', ok: guideDone(n), pv: guideDone(n) ? '✓' : '–', href: '#gefuehrt-' + n, label: 'Geführtes Spiel „' + g.t + '“' }; };
  const reqGames = (n) => ({ t: n + ' Übungsspiele gespielt', ok: P.games.length >= n, pv: Math.min(P.games.length, n) + '/' + n, href: '#spielen', label: 'Übungsspiel' });
  function reqProfi(n) {
    const k = P.games.filter((g) => g.mode === 'profi').length;
    return { t: n + ' Spiele im Profi-Modus (ohne Hilfen)', ok: k >= n, pv: Math.min(k, n) + '/' + n, href: '#spielen-profi', label: 'Spiel im Profi-Modus', profi: true };
  }
  const reqCount = (n) => ({ t: n + ' Mitzähl-Proben im Spiel richtig', ok: P.countChecks.ok >= n, pv: Math.min(P.countChecks.ok, n) + '/' + n, href: '#spielen-normal', label: 'Spiel mit Mitzähl-Probe', profi: true });
  function reqDecl() {
    const g = P.games.slice(-40).filter((x) => x.decl);
    const w = g.filter((x) => x.won).length;
    const rate = g.length ? w / g.length : 0;
    return { t: 'Als Alleinspieler ≥ 65 % gewonnen (mind. 8 Spiele, letzte 40)', ok: g.length >= 8 && rate >= 0.65, pv: g.length ? Math.round(rate * 100) + ' % von ' + g.length : '–', href: '#spielen', label: 'Übungsspiel' };
  }
  function reqCoach() {
    const g = P.games.filter((x) => x.mode === 'profi').slice(-10);
    const avg = g.length ? g.reduce((a, x) => a + x.coach, 0) / g.length : 9;
    return { t: 'Höchstens 0,5 Patzer pro Spiel (letzte 10 Profi-Spiele)', ok: g.length >= 10 && avg <= 0.5, pv: g.length ? avg.toFixed(1).replace('.', ',') + ' (' + g.length + ')' : '–', href: '#spielen-profi', label: 'Spiel im Profi-Modus', profi: true };
  }
  const examPassed = (n) => !!(P.exams[n] && P.exams[n].passed);
  const reqExam = (n) => ({ t: n < 5 ? 'Stufentest ' + n + ' bestanden' : 'Abschlussprüfung bestanden', ok: examPassed(n), pv: P.exams[n] ? P.exams[n].best + ' %' : '–', href: '#test-' + n, label: n < 5 ? 'Stufentest ' + n : 'Abschlussprüfung' });
  const REQ = {
    2: () => [reqGuide(1), reqGuide(2), reqLessons(1), reqDrill('augen'), reqDrill('trumpf'), reqDrill('bedienen'), reqDrill('stich'), reqExam(1)],
    3: () => [reqLessons(2), reqGuide(3), reqDrill('spitzen'), reqDrill('spielwert'), reqDrill('reizwerte'), reqDrill('abrechnen'), reqExam(2), reqGames(3)],
    4: () => [reqLessons(3), reqDrill('reizen'), reqDrill('druecken'), reqDrill('schmieren'), reqTactics(3, 9), reqExam(3), reqGames(10)],
    5: () => [reqLessons(4), reqLessons(5), reqDrill('mitzaehlen'), reqDrill('truempfe'), reqDrill('frei'), reqDrill('hoechste'), reqTactics(4, 18), reqExam(4), reqExam(5), reqProfi(15), reqCount(5), reqDecl(), reqCoach()],
  };
  function levelInfo() {
    let level = 1;
    for (let n = 2; n <= 5; n++) { if (REQ[n]().every((r) => r.ok)) level = n; else break; }
    const next = level < 5 ? { n: level + 1, reqs: REQ[level + 1]() } : null;
    const part = next ? next.reqs.filter((r) => r.ok).length / next.reqs.length : 1;
    return { level, next, part };
  }
  function levelCard() {
    const li = levelInfo();
    const L = LEVELS[li.level - 1];
    const lad = LEVELS.map((x, i) => '<span class="' + (i < li.level ? 'on' : i === li.level ? 'part' : '') + '" style="--p:' + Math.round(li.part * 100) + '%"></span>').join('');
    const sub = li.next ? 'Nächste Stufe: ' + LEVELS[li.next.n - 1].name + ' · ' + li.next.reqs.filter((r) => r.ok).length + ' von ' + li.next.reqs.length + ' Zielen erreicht' : 'Höchste Stufe erreicht – du spielst Skat auf Vereinsniveau.';
    return '<div class="levelcard"><div class="lv"><div class="num">' + li.level + '</div><div><div class="eyebrow" style="color:inherit;opacity:.75">Stufe ' + li.level + ' von 5</div><h2>' + L.name + '</h2></div></div><div class="ladder">' + lad + '</div><div class="sub">' + sub + '</div></div>';
  }

  // ================= 30-Tage-Plan, XP, Serie =================
  const PL = window.SPLAN;
  const DAYS = PL.DAYS;
  const today = () => PL.dayNum();
  const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
  const LESSON = (id) => C.LESSONS.find((l) => l.id === id);
  const skipped = (stage) => !!P.plan.skip[stage];
  // Stoff gilt als bekannt, wenn die Lektion gemacht oder die Stufe per Test übersprungen ist
  const knows = (id) => { const l = LESSON(id); return lessonDone(id) || !!(l && skipped(l.stage)); };
  const modeOk = (g, mode) => !mode || PL.MODE_RANK[g.mode || 'lern'] >= PL.MODE_RANK[mode];
  function gamesFor(d, t) {
    const b = P.plan.base[d.n];
    return b ? P.games.filter((g) => g.t >= b.t && modeOk(g, t[2])).length : 0;
  }
  function taskDone(d, i) {
    const t = d.tasks[i];
    if (t[0] === 'g') return guideDone(t[1]);
    if (t[0] === 'l') return lessonDone(t[1]);
    if (t[0] === 'd') return drillBest(t[1]) >= 80 || drillEnough(t[1]);
    if (t[0] === 'x') return examPassed(t[1]);
    if (t[0] === 'p') return gamesFor(d, t) >= t[1];
    return !!P.plan.flags[d.n + ':' + i];
  }
  // Wer nach vier Runden bei 60 % steht, kommt im Plan weiter; die Übung bleibt in der Wiederholung
  const drillEnough = (id) => !!(P.drills[id] && P.drills[id].sessions >= 4 && P.drills[id].best >= 60);
  const dayDone = (d) => skipped(d.stage) || d.tasks.every((_, i) => taskDone(d, i));
  const curDay = () => DAYS.find((d) => !dayDone(d)) || null;
  function taskInfo(d, i) {
    const t = d.tasks[i], done = taskDone(d, i);
    const o = { done, k: t[0] };
    if (t[0] === 'g') { const g = GUIDES[t[1] - 1]; Object.assign(o, { icon: ICON.spielen, label: 'Geführtes Spiel', short: g.t, sub: g.t + ' – ' + g.d, href: '#gefuehrt-' + g.n }); }
    else if (t[0] === 'l') { const l = LESSON(t[1]); Object.assign(o, { icon: ICON.lernen, label: 'Lektion: ' + T(l.title), short: T(l.title), sub: 'ca. ' + l.min + ' Minuten', href: '#lektion-' + l.id }); }
    else if (t[0] === 'd') { const b = drillBest(t[1]); Object.assign(o, { icon: ICON.ueben, label: 'Übung: ' + dTitle(t[1]), short: dTitle(t[1]), sub: b && !done ? 'Bestwert ' + b + ' % – 80 % brauchst du' : '10 Aufgaben · bestanden ab 80 %', href: '#uebung-' + t[1], pv: b ? b + ' %' : '' }); }
    else if (t[0] === 'r') Object.assign(o, { icon: ICON.repeat, label: 'Wiederholung', short: 'Wiederholung', sub: 'Gemischte Aufgaben – deine Fehler zuerst', href: '#wiederholen' });
    else if (t[0] === 't') Object.assign(o, { icon: ICON.bulb, label: t[1] + ' Taktik-Aufgaben', short: 'Taktik-Aufgaben', sub: 'Welche Karte ist jetzt richtig?', href: '#taktik' });
    else if (t[0] === 'x') Object.assign(o, { icon: ICON.trophy, label: t[1] < 5 ? 'Stufentest ' + t[1] : 'Abschlussprüfung', short: t[1] < 5 ? 'Stufentest' : 'Abschlussprüfung', sub: 'Gemischte Aufgaben · bestanden ab 80 %', href: '#test-' + t[1], pv: P.exams[t[1]] ? P.exams[t[1]].best + ' %' : '' });
    else { const n = Math.min(gamesFor(d, t), t[1]); Object.assign(o, { icon: ICON.spielen, label: t[1] + ' Übungsspiele' + (t[2] === 'profi' ? ' im Profi-Modus' : ''), short: 'Übungsspiel', sub: t[2] === 'profi' ? 'Ohne Hilfen – wie am echten Tisch' : t[2] === 'normal' ? 'Modus „Normal“: mit Mitzähl-Probe, ohne Augenanzeige' : 'Gegen Lena und Tom, mit Tipps und Coach', href: '#spielen' + (t[2] ? '-' + t[2] : ''), pv: n + '/' + t[1] }); }
    return o;
  }
  // Hält fest, welche Tage fertig sind, und startet die Zählung für den aktuellen Tag
  function syncPlan() {
    const t = today(), fresh = [];
    let changed = false;
    for (const d of DAYS) {
      if (dayDone(d)) {
        if (P.plan.doneOn[d.n] == null) { P.plan.doneOn[d.n] = t; changed = true; if (!skipped(d.stage)) fresh.push(d); }
        continue;
      }
      if (!P.plan.base[d.n]) { P.plan.base[d.n] = { t: Date.now() }; changed = true; }
      break;
    }
    if (changed) save();
    return fresh;
  }
  function planFlag(kind) {
    const d = curDay();
    if (!d) return;
    const i = d.tasks.findIndex((t, k) => t[0] === kind && !P.plan.flags[d.n + ':' + k]);
    if (i >= 0) P.plan.flags[d.n + ':' + i] = true;
  }
  const goalToday = () => Object.keys(P.plan.doneOn).some((k) => P.plan.doneOn[k] === today() && !skipped(DAYS[k - 1].stage));
  function paceText() {
    const cur = curDay();
    if (!cur) return 'Alle 30 Tage geschafft';
    if (P.plan.start == null) return '15–25 Minuten am Tag';
    const cal = today() - P.plan.start + 1;
    const diff = cur.n - cal;
    if (diff >= 2) return (diff - 1) + (diff === 2 ? ' Tag' : ' Tage') + ' voraus';
    if (diff === 1) return 'Tagesziel erreicht – du liegst im Plan';
    if (diff === 0) return 'Du liegst im Plan';
    return -diff + (diff === -1 ? ' Tag' : ' Tage') + ' zurück – eine zweite Einheit holt auf';
  }
  function award(xp) {
    const t = today();
    P.xp += xp;
    P.days[t] = (P.days[t] || 0) + xp;
    if (P.plan.start == null) P.plan.start = t;
    const inc = PL.streakTouch(P.streak, t);
    save();
    return inc;
  }
  const streakNow = () => PL.streakNow(P.streak, today());
  const ACH = [
    { id: 'start', t: 'Erster Stich', d: 'Das erste geführte Spiel beendet', ok: () => guideDone(1) },
    { id: 'perfekt', t: 'Fehlerfrei', d: 'Eine Runde ohne einen Fehler', ok: () => P.perfect > 0 },
    { id: 's3', t: 'Dranbleiben', d: '3 Tage in Folge gelernt', ok: () => P.streak.best >= 3 },
    { id: 's7', t: 'Eine Woche', d: '7 Tage in Folge gelernt', ok: () => P.streak.best >= 7 },
    { id: 's14', t: 'Zwei Wochen', d: '14 Tage in Folge gelernt', ok: () => P.streak.best >= 14 },
    { id: 's30', t: 'Ein Monat', d: '30 Tage in Folge gelernt', ok: () => P.streak.best >= 30 },
    { id: 'x1', t: 'Regelfest', d: 'Stufentest 1 bestanden', ok: () => examPassed(1) },
    { id: 'x2', t: 'Reizkundig', d: 'Stufentest 2 bestanden', ok: () => examPassed(2) },
    { id: 'x3', t: 'Taktiker', d: 'Stufentest 3 bestanden', ok: () => examPassed(3) },
    { id: 'x4', t: 'Mitzähler', d: 'Stufentest 4 bestanden', ok: () => examPassed(4) },
    { id: 'g10', t: 'Stammgast', d: '10 Übungsspiele gespielt', ok: () => P.games.length >= 10 },
    { id: 'g50', t: 'Dauerbrenner', d: '50 Übungsspiele gespielt', ok: () => P.games.length >= 50 },
    { id: 'grand', t: 'Großes Spiel', d: 'Einen Grand als Alleinspieler gewonnen', ok: () => P.games.some((g) => g.decl && g.won && g.gt === 4) },
    { id: 'null', t: 'Kein Stich', d: 'Ein Nullspiel als Alleinspieler gewonnen', ok: () => P.games.some((g) => g.decl && g.won && g.gt === 5) },
    { id: 'profi', t: 'Ohne Netz', d: 'Im Profi-Modus als Alleinspieler gewonnen', ok: () => P.games.some((g) => g.decl && g.won && g.mode === 'profi') },
    { id: 'zaehler', t: 'Im Kopf', d: '5 Mitzähl-Proben richtig', ok: () => P.countChecks.ok >= 5 },
    { id: 'x5', t: 'Skat-Diplom', d: 'Abschlussprüfung bestanden', ok: () => examPassed(5) },
    { id: 'plan', t: '30 Tage', d: 'Den ganzen Plan geschafft', ok: () => !curDay() },
  ];
  function checkAch() {
    const fresh = [];
    for (const a of ACH) if (!P.ach[a.id] && a.ok()) { P.ach[a.id] = today(); fresh.push(a); }
    if (fresh.length) save();
    return fresh;
  }
  // kurze Töne für richtig, falsch, geschafft
  let AC = null;
  function beep(kind) {
    if (!P.settings.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      AC = AC || new Ctx();
      const seq = { ok: [[660, 0], [880, 0.09]], no: [[233, 0], [185, 0.13]], win: [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]] }[kind];
      for (const [f, at] of seq) {
        const o = AC.createOscillator(), g = AC.createGain(), t0 = AC.currentTime + at;
        o.type = kind === 'no' ? 'triangle' : 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
        o.connect(g); g.connect(AC.destination);
        o.start(t0); o.stop(t0 + 0.22);
      }
    } catch (e) { /* kein Ton */ }
  }

  // ================= Router =================
  let view = '';
  let lastMain = '#lernen';
  const SESSION_VIEWS = { lektion: 1, uebung: 1, taktik: 1, wiederholen: 1, test: 1 };
  function route() {
    const h = (location.hash || '#lernen').slice(1);
    const i = h.indexOf('-');
    const name = i < 0 ? h : h.slice(0, i);
    const arg = i < 0 ? '' : h.slice(i + 1);
    clearTimeout(gameTimer);
    closeSheet();
    view = name;
    syncPlan();
    const tabOf = { lernen: 'lernen', lektion: 'lernen', gefuehrt: 'lernen', test: 'lernen', ueben: 'ueben', uebung: 'ueben', taktik: 'ueben', wiederholen: 'ueben', spielen: 'spielen', liste: 'spielen', fortschritt: 'fortschritt' };
    document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tabOf[name]));
    const table = name === 'spielen' || name === 'gefuehrt';
    $('#app').classList.toggle('fullscreen', table || !!SESSION_VIEWS[name]);
    document.body.classList.toggle('felt', table);
    const scr = $('#screen');
    scr.scrollTop = 0;
    if (name === 'lektion' && LESSON(arg)) return viewLesson(arg);
    if (name === 'uebung' && D.DRILLS[arg]) return viewDrill(arg);
    if (name === 'taktik') return viewDrill('taktik');
    if (name === 'wiederholen') return viewReview();
    if (name === 'test' && arg >= 1 && arg <= 5) return viewExam(Number(arg));
    $('#app').classList.toggle('fullscreen', table);
    if (name === 'ueben') { lastMain = '#ueben'; return viewDrills(); }
    if (name === 'spielen') return viewGame(arg);
    if (name === 'gefuehrt' && GUIDES[Number(arg) - 1]) return viewGuide(Number(arg));
    if (name === 'liste') return viewList();
    if (name === 'fortschritt') return viewProgress();
    view = 'lernen';
    lastMain = '#lernen';
    return viewLearn();
  }
  const screen = (html) => { $('#screen').innerHTML = html; };

  // ================= Lernpfad =================
  const OFFS = [0, 46, 72, 46, 0, -46, -72, -46];
  function hud() {
    const s = streakNow(), lit = P.streak.last === today();
    return '<div class="hud"><a class="hud-i fire' + (lit ? ' lit' : '') + '" href="#fortschritt" aria-label="Serie: ' + s + ' Tage in Folge">' + ICON.flame + '<b>' + s + '</b></a>'
      + '<a class="hud-i bolt" href="#fortschritt" aria-label="' + P.xp + ' Erfahrungspunkte">' + ICON.bolt + '<b>' + P.xp + '</b><small>XP</small></a></div>';
  }
  function weekStrip() {
    const t = today(), mon = t - PL.weekday(t);
    return '<div class="week" aria-label="Diese Woche">' + ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((n, i) => {
      const d = mon + i;
      const cls = P.days[d] ? 'on' : P.streak.bridged === d ? 'joker' : '';
      return '<span class="' + cls + (d === t ? ' now' : '') + (d > t ? ' future' : '') + '"><i>' + (P.days[d] ? ICON.check : '') + '</i>' + n + '</span>';
    }).join('') + '</div>';
  }
  const ring = (done, total) => {
    const c = 2 * Math.PI * 20, p = total ? done / total : 0;
    return '<svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" class="rt"/><circle cx="24" cy="24" r="20" class="rv" stroke-dasharray="' + (c * p).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 24 24)"/><text x="24" y="29" text-anchor="middle">' + done + '/' + total + '</text></svg>';
  };
  const taskRow = (x, cls, link) => {
    const inner = '<span class="tk">' + (x.done ? ICON.check : x.icon) + '</span><span class="tx"><span class="t">' + esc(x.label) + '</span><span class="d">' + esc(x.sub) + '</span></span>' + (x.pv ? '<span class="pv">' + x.pv + '</span>' : '');
    return '<li class="' + (x.done ? 'done ' : '') + cls + '">' + (link ? '<a href="' + x.href + '">' + inner + '</a>' : '<span class="a">' + inner + '</span>') + '</li>';
  };
  function todayCard() {
    const cur = curDay();
    if (!cur) {
      const due = dueKeys().length;
      return '<section class="today fin"><div class="eyebrow">30 von 30 Tagen</div><h2>Du hast den Plan geschafft!</h2><p>Jetzt zählt Spielpraxis. Halte dein Niveau mit einer kurzen Wiederholung und ein paar Spielen im Profi-Modus am Tag.</p><div class="btns"><a class="btn brass" href="#spielen-profi">Profi-Spiel</a><a class="btn ghostw" href="#wiederholen">Wiederholen' + (due ? ' (' + due + ')' : '') + '</a></div></section>';
    }
    const infos = cur.tasks.map((_, i) => taskInfo(cur, i));
    const nd = infos.filter((x) => x.done).length;
    const nx = infos.find((x) => !x.done);
    const rest = goalToday() && nd === 0;
    let h = '';
    if (rest) h += '<div class="goalhit">' + ICON.check + '<div><b>Tagesziel erreicht!</b><br>Morgen geht es mit Tag ' + cur.n + ' weiter. Wenn du magst, arbeite schon vor.</div></div>';
    h += '<section class="today' + (rest ? ' rest' : '') + '"><div class="today-h"><div><div class="eyebrow">' + (rest ? 'Als Nächstes' : 'Heute') + ' · Tag ' + cur.n + ' von 30</div><h2>' + esc(cur.title) + '</h2><div class="pace">' + paceText() + '</div></div>' + ring(nd, infos.length) + '</div>';
    h += '<ol class="tasks">' + infos.map((x) => taskRow(x, x === nx ? 'next' : '', true)).join('') + '</ol>';
    h += '<a class="btn big ' + (rest ? 'ghostw' : 'brass') + '" id="go" href="' + nx.href + '">' + (rest ? 'Schon vorarbeiten' : (nd || P.xp ? 'Weiter: ' : 'Start: ') + esc(nx.short)) + '</a></section>';
    return h;
  }
  function pathHTML() {
    const cur = curDay(), cn = cur ? cur.n : 31, cs = cur ? cur.stage : 6;
    let h = '<div class="path">';
    for (const L of LEVELS) {
      const ds = DAYS.filter((d) => d.stage === L.n);
      const last = ds[ds.length - 1].n;
      const done = ds.filter((d) => d.n < cn).length;
      h += '<div class="unit u' + L.n + '"><div><div class="eyebrow">Stufe ' + L.n + ' · Tag ' + ds[0].n + '–' + last + '</div><h3>' + L.short + '</h3><p>' + L.desc + '</p></div><span class="ucount">' + done + '/' + ds.length + '</span></div>';
      if (L.n < 5 && !examPassed(L.n) && cn < last && (L.n === cs || L.n === cs + 1)) h += '<a class="jump" href="#test-' + L.n + '">' + ICON.trophy + '<span>Kannst du das schon? Mit dem Stufentest überspringen</span></a>';
      h += '<div class="nodes u' + L.n + '">' + ds.map((d) => {
        const state = d.n < cn ? 'done' : d.n === cn ? 'cur' : 'locked';
        return '<button class="node ' + state + '" data-day="' + d.n + '" style="--x:' + OFFS[(d.n - 1) % OFFS.length] + 'px" aria-label="Tag ' + d.n + ': ' + esc(d.title) + (state === 'locked' ? ' (gesperrt)' : state === 'done' ? ' (erledigt)' : '') + '">'
          + (state === 'cur' ? '<span class="startb">' + (P.xp ? 'Weiter' : 'Start') + '</span>' : '')
          + '<span class="disc">' + (state === 'done' ? ICON.check : state === 'locked' ? ICON.lock : d.n) + '</span><span class="nl"><b>Tag ' + d.n + '</b> ' + esc(d.title) + '</span></button>';
      }).join('') + '</div>';
    }
    return h + '</div>';
  }
  function daySheet(n) {
    const d = DAYS[n - 1], cur = curDay(), cn = cur ? cur.n : 31;
    const locked = n > cn;
    let h = '<div class="eyebrow">Tag ' + n + ' von 30 · Stufe ' + d.stage + '</div><h2>' + esc(d.title) + '</h2>';
    if (locked) h += '<p class="note">Noch gesperrt. Schließe zuerst Tag ' + cn + ' ab – oder überspringe die Stufe mit dem Stufentest.</p>';
    else if (n < cn) h += '<p class="note">Erledigt. Du kannst jede Einheit wiederholen.</p>';
    h += '<ol class="tasks plain">' + d.tasks.map((_, i) => { const x = taskInfo(d, i); if (n < cn) { x.done = true; if (x.k === 'p') x.pv = ''; } return taskRow(x, '', !locked); }).join('') + '</ol>';
    h += '<button class="btn soft" data-x="1">Schließen</button>';
    openSheet(h, (ev) => { if (ev.target.closest('a') || ev.target.closest('[data-x]') || ev.target.id === 'sheet') closeSheet(); });
  }
  function viewLearn() {
    let h = '<div class="page home"><div class="brand"><h1>Skat lernen</h1>' + hud() + '</div>';
    if (!P.xp && !guideDone(1)) h += '<div class="intro"><b>In 30 Tagen an den Skattisch.</b> Jeden Tag eine Einheit von 15 bis 25 Minuten: erst verstehen, dann üben, dann spielen. Was du falsch machst, kommt automatisch wieder dran.</div>';
    h += weekStrip() + todayCard() + pathHTML();
    h += '<p class="note" style="text-align:center">Regeln nach der Internationalen Skatordnung. Dein Fortschritt wird auf diesem Gerät gespeichert.</p></div>';
    screen(h);
    document.querySelectorAll('.node').forEach((b) => (b.onclick = () => daySheet(Number(b.dataset.day))));
  }

  // ================= Einheit: Lektion, Übung, Wiederholung, Test =================
  let S = null;
  const quizQ = (l, i) => { const q = l.quiz[i]; return { kind: 'choice', text: q.q, options: q.o, answer: q.a, explain: q.why }; };
  const stepGen = (id, i) => ({ t: 'q', gen: id, gi: i, key: 'd:' + id });
  const stepQuiz = (l, i) => ({ t: 'q', q: quizQ(l, i), key: 'q:' + l.id + ':' + i, quiz: true });
  const stepTactic = (t) => ({ t: 'q', q: D.tacticQuestion(t), key: 't:' + t.id, tactic: t.id });
  function stepsForKey(k) {
    const [a, b, c] = k.split(':');
    if (a === 'd') return D.DRILLS[b] ? [stepGen(b, 9), stepGen(b, 9)] : [];
    if (a === 'q') { const l = LESSON(b); return l && l.quiz[c] ? [stepQuiz(l, Number(c))] : []; }
    const t = C.TACTICS.find((x) => x.id === b);
    return t ? [stepTactic(t)] : [];
  }
  const tacticAfter = (t) => (t.game === 'Null' ? 'nullspiel' : t.stage >= 4 ? 'zaehlen' : /^Alleinspieler/.test(t.role) ? 'alleinspieler' : 'gegenspieler');
  function tacticPool(n) {
    let pool = C.TACTICS.filter((t) => knows(tacticAfter(t)));
    if (pool.length < 4) pool = C.TACTICS.filter((t) => t.stage === 3);
    const box = (t) => (P.srs['t:' + t.id] ? P.srs['t:' + t.id].b : -1);
    return shuffle(pool.filter((t) => !P.tactics[t.id])).concat(shuffle(pool.filter((t) => P.tactics[t.id])).sort((a, b) => box(a) - box(b))).slice(0, n);
  }
  function unlockedKeys() {
    const ks = new Set();
    for (const l of C.LESSONS) if (knows(l.id)) { l.quiz.forEach((_, i) => ks.add('q:' + l.id + ':' + i)); if (l.drill) ks.add('d:' + l.drill); }
    for (const id of D.ORDER) if (P.drills[id]) ks.add('d:' + id);
    for (const t of C.TACTICS) if (knows(tacticAfter(t))) ks.add('t:' + t.id);
    return [...ks];
  }
  const dueKeys = () => PL.srsDue(P.srs, unlockedKeys(), today());
  function reviewSteps(n) {
    const all = unlockedKeys(), due = dueKeys();
    const steps = [], used = new Set();
    const add = (k) => { if (used.has(k) || steps.length >= n) return; used.add(k); for (const s of stepsForKey(k)) if (steps.length < n) steps.push(s); };
    const hard = due.filter((k) => k[0] !== 'q'), facts = due.filter((k) => k[0] === 'q');
    hard.slice(0, 3).forEach(add);
    facts.slice(0, 3).forEach(add);
    hard.forEach(add);
    shuffle(all.filter((k) => k[0] === 't' && !P.srs[k])).slice(0, 2).forEach(add);
    facts.forEach(add);
    const box = (k) => (P.srs[k] ? P.srs[k].b : 0);
    shuffle(all.filter((k) => k[0] !== 'q')).sort((a, b) => box(a) - box(b)).forEach(add);
    shuffle(all).forEach(add);
    return shuffle(steps);
  }
  function examSteps(n) {
    const steps = [], qs = [];
    const some = (a, k) => shuffle(a).slice(0, k);
    const drills = n < 5 ? D.ORDER.filter((id) => D.DRILLS[id].stage === n) : some(D.ORDER.filter((id) => D.DRILLS[id].stage >= 2), 6);
    for (const id of drills) steps.push(stepGen(id, 9), stepGen(id, 9));
    for (const l of C.LESSONS.filter((x) => (n < 5 ? x.stage === n : x.stage >= 4))) l.quiz.forEach((_, i) => qs.push(stepQuiz(l, i)));
    steps.push(...some(qs, 4), ...some(C.TACTICS.filter((t) => (n < 5 ? t.stage === n : true)), 4).map(stepTactic));
    return shuffle(steps);
  }
  function startSession(o) {
    S = Object.assign({ i: 0, ans: null, sel: [], seqAt: 0, res: {}, sum: 0, n: 0, combo: 0, quizOk: 0, t0: Date.now(), done: false, out: null, back: lastMain }, o);
    renderSession();
  }
  function viewLesson(id) {
    const l = LESSON(id);
    const steps = l.pages.map((p, i) => ({ t: 'info', html: p, at: i + 1, of: l.pages.length }));
    l.quiz.forEach((_, i) => steps.push(stepQuiz(l, i)));
    if (l.drill) for (let i = 0; i < 3; i++) steps.push(stepGen(l.drill, i));
    startSession({ kind: 'lesson', id, title: T(l.title), eyebrow: 'Stufe ' + l.stage + ' · Lektion', steps });
  }
  function viewDrill(id) {
    if (id === 'taktik') {
      const d = curDay(), t = d && d.tasks.find((x, i) => x[0] === 't' && !taskDone(d, i));
      return startSession({ kind: 'tactics', title: 'Taktik-Aufgaben', steps: tacticPool(t ? t[1] : 6).map(stepTactic) });
    }
    startSession({ kind: 'drill', id, title: dTitle(id), steps: Array.from({ length: 10 }, (_, i) => stepGen(id, i)) });
  }
  function viewReview() {
    const steps = reviewSteps(10);
    if (!steps.length) {
      screen('<div class="page"><a class="back" href="' + lastMain + '">← Zurück</a><div class="qcard"><h2>Noch nichts zu wiederholen</h2><p>Sobald du die erste Lektion abgeschlossen hast, sammelt die App hier deine Aufgaben – Fehler zuerst.</p><a class="btn" href="#lernen">Zum Lernpfad</a></div></div>');
      $('#app').classList.remove('fullscreen');
      return;
    }
    startSession({ kind: 'review', title: 'Wiederholung', steps });
  }
  function viewExam(n) {
    const cur = curDay();
    const inPlan = !cur || cur.tasks.some((t) => t[0] === 'x' && t[1] === n) || cur.stage > n;
    startSession({ kind: 'exam', id: n, title: n < 5 ? 'Stufentest ' + n : 'Abschlussprüfung', steps: examSteps(n), skip: !inPlan });
  }
  function curStep() {
    const st = S.steps[S.i];
    if (st.t === 'q' && !st.q) st.q = D.DRILLS[st.gen].gen({ i: st.gi, adv: knows('grandnull') });
    return st;
  }
  function settle(score, extra) {
    const st = S.steps[S.i];
    S.ans = Object.assign({ score }, extra || {});
    if (!st.again) {
      S.n++; S.sum += score;
      (S.res[st.key] = S.res[st.key] || []).push(score);
      if (st.quiz && score >= 1) S.quizOk++;
    }
    if (score >= 1) { S.combo++; if (st.tactic && !P.tactics[st.tactic]) { P.tactics[st.tactic] = true; save(); } }
    else { S.combo = 0; if (score < 0.5 && (st.rep || 0) < 2) S.steps.push(Object.assign({}, st, { again: true, rep: (st.rep || 0) + 1 })); }
    beep(score > 0 ? 'ok' : 'no');
    renderSession();
  }
  function sessNext() {
    S.i++; S.ans = null; S.sel = []; S.seqAt = 0;
    if (S.i >= S.steps.length) { S.done = true; finishSession(); }
    renderSession();
  }
  function finishSession() {
    const t = today();
    const score = S.n ? Math.round(S.sum / S.n * 100) : 100;
    const o = { score, pass: true, secs: Math.round((Date.now() - S.t0) / 1000) };
    for (const k in S.res) {
      const r = S.res[k], avg = r.reduce((a, b) => a + b, 0) / r.length;
      PL.srsUpdate(P.srs, k, k[0] === 'd' ? avg >= 0.8 : avg >= 1, t);
    }
    let xp = 10 + Math.round(S.sum);
    if (S.kind === 'lesson') { const prev = P.lessons[S.id]; P.lessons[S.id] = { done: true, quiz: Math.max(S.quizOk, prev ? prev.quiz || 0 : 0) }; }
    if (S.kind === 'drill') {
      const d = P.drills[S.id] || { best: 0, sessions: 0 };
      o.record = score > d.best && d.sessions > 0;
      d.best = Math.max(d.best, score); d.last = score; d.sessions++;
      P.drills[S.id] = d;
      o.pass = score >= 80;
      o.enough = !o.pass && drillBest(S.id) < 80 && drillEnough(S.id);
    }
    if (S.kind === 'exam') {
      const e = P.exams[S.id] || { best: 0, passed: false };
      e.best = Math.max(e.best, score);
      o.pass = score >= 80;
      if (o.pass) { if (!e.passed) xp += 20; e.passed = true; if (S.skip) { for (let s = 1; s <= S.id; s++) P.plan.skip[s] = true; o.skipped = true; } }
      P.exams[S.id] = e;
    }
    if (S.kind === 'review') planFlag('r');
    if (S.kind === 'tactics') planFlag('t');
    if (S.n >= 3 && S.sum === S.n) { xp += 5; P.perfect++; o.perfect = true; }
    o.xp = xp;
    o.streakInc = award(xp);
    o.days = syncPlan();
    o.ach = checkAch();
    S.out = o;
    beep(o.pass ? 'win' : 'no');
  }
  function renderSummary() {
    const o = S.out;
    const head = {
      lesson: 'Lektion geschafft!', review: 'Wiederholung geschafft!', tactics: 'Taktik trainiert!',
      drill: o.pass ? 'Übung bestanden!' : 'Fast – noch eine Runde',
      exam: o.pass ? (S.id === 5 ? 'Prüfung bestanden!' : 'Stufentest bestanden!') : 'Noch nicht bestanden',
    }[S.kind];
    let sub = o.perfect ? 'Ohne einen einzigen Fehler.' : '';
    if (S.kind === 'drill' && !o.pass) sub = 'Du hattest ' + o.score + ' % beim ersten Versuch, 80 % brauchst du. Die nächste Runde bringt neue Aufgaben.';
    if (S.kind === 'drill' && o.pass && o.record) sub = 'Neuer Bestwert!';
    if (o.enough) sub = 'Du hattest ' + o.score + '\u00a0%. Für den Plan reicht dein Bestwert von ' + drillBest(S.id) + '\u00a0% – die Übung kommt in der Wiederholung wieder, bis sie sitzt.';
    if (S.kind === 'exam' && !o.pass) sub = 'Du hattest ' + o.score + ' %, 80 % brauchst du. Wiederhole die Übungen dieser Stufe und versuch es noch einmal.';
    if (o.skipped) sub = 'Du überspringst alles bis einschließlich Stufe ' + S.id + '.';
    if (S.kind === 'lesson' && !sub) sub = 'Das Gelernte kommt in den nächsten Tagen in der Wiederholung wieder.';
    const mm = Math.floor(o.secs / 60) + ':' + String(o.secs % 60).padStart(2, '0');
    let h = '<div class="sess sum' + (o.pass ? '' : ' fail') + '"><div class="sbody"><div class="sin sumin"><div class="burst">' + (o.pass ? ICON.check : ICON.repeat) + '</div><div class="eyebrow">' + esc(S.title) + '</div><h1>' + head + '</h1>' + (sub ? '<p class="sumsub">' + sub + '</p>' : '');
    h += '<div class="tiles"><div class="tile xp"><span>Erfahrung</span><b>+' + o.xp + ' XP</b></div><div class="tile acc"><span>Genauigkeit</span><b>' + o.score + ' %</b></div><div class="tile time"><span>Zeit</span><b>' + mm + '</b></div></div>';
    const lines = [];
    if (o.streakInc) lines.push('<div class="sline fire">' + ICON.flame + '<span><b>' + P.streak.n + (P.streak.n === 1 ? ' Tag' : ' Tage') + ' in Folge</b>' + (P.streak.n === 1 ? 'Deine Serie beginnt. Komm morgen wieder!' : 'Deine Serie wächst.') + '</span></div>');
    for (const d of o.days) lines.push('<div class="sline day">' + ICON.check + '<span><b>Tag ' + d.n + ' geschafft</b>' + esc(d.title) + ' – Tagesziel erreicht.</span></div>');
    for (const a of o.ach) lines.push('<div class="sline ach">' + ICON.trophy + '<span><b>Erfolg: ' + a.t + '</b>' + a.d + '</span></div>');
    h += lines.join('') + '</div></div><footer class="sfoot">';
    const cur = curDay();
    const nx = cur && !o.days.length ? cur.tasks.map((_, i) => taskInfo(cur, i)).find((x) => !x.done) : null;
    if (!o.pass && !o.enough) h += '<button class="btn big" id="again">Noch eine Runde</button><a class="btn soft" href="' + S.back + '">Später</a>';
    else if (nx) h += '<a class="btn big" id="snextask" href="' + nx.href + '">Weiter: ' + esc(nx.short) + '</a><a class="btn soft" href="#lernen">Zum Lernpfad</a>';
    else h += '<a class="btn big" id="snextask" href="#lernen">' + (o.days.length ? 'Fertig für heute' : 'Zum Lernpfad') + '</a>' + (S.kind === 'drill' || S.kind === 'tactics' || S.kind === 'review' ? '<button class="btn soft" id="again">Noch eine Runde</button>' : '');
    h += '</footer></div>';
    screen(h);
    const ag = $('#again');
    if (ag) ag.onclick = () => route();
    const na = $('#snextask');
    // gleiche Adresse (z. B. zwei Spiele-Aufgaben hintereinander) lädt sonst nicht neu
    if (na) na.onclick = (ev) => { if (na.getAttribute('href') === location.hash) { ev.preventDefault(); route(); } };
  }
  function questionHTML(st, q, ans) {
    let h = '<div class="qhead">' + (st.again ? '<span class="again">' + ICON.repeat + 'Noch einmal</span>' : '<span class="eyebrow">' + esc(q.title ? T(q.title) : st.gen ? dTitle(st.gen) : 'Kurze Frage') + '</span>') + '</div>';
    if (q.kind === 'seq' && S.seqAt < q.steps.length) {
      const s = q.steps[S.seqAt];
      return h + '<div class="qtext">Merke dir die Augen. Stich ' + (S.seqAt + 1) + ' von ' + q.steps.length + ':</div><div class="minitrick">' + s.cards.map((c) => '<figure>' + cardHTML(c) + '</figure>').join('') + '</div><p style="text-align:center"><b>→ ' + s.won + '</b></p>';
    }
    const how = S.kind !== 'exam' && (q.how || (st.gen && D.DRILLS[st.gen].how));
    if (how && !ans) h += '<details class="how"' + (st.gen && st.gi < 2 && !st.again && S.kind !== 'review' ? ' open' : '') + '><summary>So gehst du vor</summary>' + rich(how, { terms: false }) + '</details>';
    if (q.tricksShown) h += '<div class="tricklist' + (q.tricksBy ? ' named' : '') + '">' + q.tricksShown.map((t, i) => '<div class="tl"><span class="tn">' + (i + 1) + '.</span>' + t.map((c, k) => (q.tricksBy ? '<span class="tc">' + cardHTML(c) + '<small>' + q.tricksBy[i][k] + '</small></span>' : cardHTML(c))).join('') + '</div>').join('') + '</div>';
    h += '<div class="qtext">' + rich(q.text) + '</div>';
    if (q.trick) h += '<div class="minitrick">' + q.trick.map((x) => '<figure>' + cardHTML(x.c) + '<figcaption>' + esc(x.who) + '</figcaption></figure>').join('') + '<figure><div class="card ghostcard"></div><figcaption>Du</figcaption></figure></div>';
    if (q.kind === 'choice' || q.kind === 'seq') {
      if (q.hand && q.kind === 'choice') h += '<div class="eyebrow">Deine Karten</div><div class="pickhand" style="--cw:40px">' + q.hand.map((c) => cardHTML(c)).join('') + '</div>';
      h += '<div class="opts">' + q.options.map((o, i) => {
        let cls = 'opt';
        if (ans) { if (i === q.answer) cls += ' right'; else if (i === ans.i) cls += ' wrong'; }
        return '<button class="' + cls + '" data-i="' + i + '"' + (ans ? ' disabled' : '') + '>' + rich(o, { terms: false }) + '</button>';
      }).join('') + '</div>';
    } else if (q.kind === 'trick') {
      h += '<div class="minitrick">' + q.cards.map((c, i) => {
        let cls = 'tap';
        if (ans) { if (i === q.answer) cls += ' good'; else if (i === ans.i) cls += ' badpick'; }
        return '<figure>' + cardHTML(c, { button: !ans, cls }) + '<figcaption>' + (i === 0 ? 'ausgespielt' : i + 1 + '. Karte') + '</figcaption></figure>';
      }).join('') + '</div>';
    } else if (q.kind === 'pick') {
      h += '<div class="pickhand">' + q.hand.map((c) => {
        let cls = '';
        if (!ans && S.sel.includes(c)) cls = 'sel';
        if (q.legal && !q.legal.includes(c) && !ans) cls += ' dim';
        if (q.mark && E.isTrump(c, q.gt)) cls += ' trumpmark';
        if (ans) { if (q.answer.includes(c)) cls = 'good'; else if (S.sel.includes(c)) cls = 'badpick'; }
        return cardHTML(c, { button: !ans, cls });
      }).join('') + '</div>';
    }
    return h;
  }
  function renderSession() {
    if (S.done) return renderSummary();
    const st = curStep(), q = st.q, ans = S.ans;
    const seqMid = q && q.kind === 'seq' && S.seqAt < q.steps.length;
    let h = '<div class="sess"><header class="sbar"><a class="sx" href="' + S.back + '" aria-label="Einheit beenden">' + ICON.close + '</a><div class="sprog" role="progressbar" aria-valuemin="0" aria-valuemax="' + S.steps.length + '" aria-valuenow="' + S.i + '"><i style="width:' + Math.max(4, Math.round(S.i / S.steps.length * 100)) + '%"></i></div>' + (S.combo >= 3 ? '<span class="scombo">' + ICON.flame + S.combo + '</span>' : '') + '</header>';
    h += '<div class="sbody" id="sbody"><div class="sin" id="qcard">';
    if (st.t === 'info') h += '<div class="qhead"><span class="eyebrow">' + esc(S.eyebrow) + ' · ' + st.at + '/' + st.of + '</span></div>' + (st.at === 1 ? '<h1 class="ltitle">' + esc(S.title) + '</h1>' : '') + '<div class="lpage new">' + rich(st.html) + '</div>';
    else h += questionHTML(st, q, ans);
    h += '</div></div>';
    if (st.t === 'info' || seqMid) h += '<footer class="sfoot"><button class="btn big" id="snext">Weiter</button></footer>';
    else if (ans) {
      const cls = ans.score >= 1 ? 'ok' : ans.score > 0 ? 'mid' : 'no';
      const praise = ['Richtig!', 'Genau!', 'Stimmt!', 'Sauber!'][S.n % 4];
      h += '<footer class="sfoot fb ' + cls + '"><div class="fbh">' + (cls === 'no' ? ICON.cross : ICON.check) + '<b>' + (cls === 'ok' ? (S.combo >= 3 ? S.combo + ' in Folge!' : praise) : cls === 'mid' ? 'Fast.' : 'Nicht ganz.') + '</b></div><div class="fbt">' + rich(ans.msg || q.explain) + (cls === 'no' && !st.again && (st.rep || 0) < 2 ? '<p class="note">Die Aufgabe kommt am Ende noch einmal.</p>' : '') + '</div><button class="btn big" id="snext">Weiter</button></footer>';
    } else if (q.kind === 'pick' && q.multi) {
      const need = q.count || 0;
      h += '<footer class="sfoot"><button class="btn big" id="check"' + ((need ? S.sel.length !== need : !S.sel.length) ? ' disabled' : '') + '>' + (need ? 'Diese ' + need + ' drücken' : 'Prüfen') + '</button></footer>';
    }
    h += '</div>';
    const keep = $('#sbody') && S.keepScroll ? $('#sbody').scrollTop : 0;
    screen(h);
    if (S.keepScroll) { $('#sbody').scrollTop = keep; S.keepScroll = false; }
    const nb = $('#snext');
    if (nb) nb.onclick = () => { if (seqMid) { S.seqAt++; renderSession(); } else sessNext(); };
    if (st.t === 'info' || ans || seqMid) return;
    const qc = $('#qcard');
    const answer = (score, extra) => { S.keepScroll = true; settle(score, extra); };
    if (q.kind === 'choice' || q.kind === 'seq') qc.querySelectorAll('.opt').forEach((b) => (b.onclick = () => {
      const i = Number(b.dataset.i);
      answer(i === q.answer ? 1 : q.near && q.near(i) ? 0.5 : 0, { i });
    }));
    if (q.kind === 'trick') qc.querySelectorAll('.minitrick .card').forEach((b, i) => (b.onclick = () => answer(i === q.answer ? 1 : 0, { i })));
    if (q.kind === 'pick') qc.querySelectorAll('.pickhand .card').forEach((b) => (b.onclick = () => {
      const c = Number(b.dataset.c);
      if (q.legal && !q.legal.includes(c)) return toast('Diese Karte darfst du nicht legen – du musst bedienen.');
      if (!q.multi) { S.sel = [c]; return answer(q.answer.includes(c) ? 1 : 0); }
      if (S.sel.includes(c)) S.sel = S.sel.filter((x) => x !== c);
      else if (!q.count || S.sel.length < q.count) S.sel.push(c);
      S.keepScroll = true;
      renderSession();
    }));
    const ck = $('#check');
    if (ck) ck.onclick = () => {
      if (q.check) { const r = q.check(S.sel); return answer(r.ok ? 1 : r.near ? 0.5 : 0, { msg: r.msg }); }
      const a = new Set(q.answer), s = new Set(S.sel);
      answer(a.size === s.size && [...a].every((x) => s.has(x)) ? 1 : 0);
    };
  }

  // ================= Üben =================
  function viewDrills() {
    const cur = curDay(), cs = cur ? cur.stage : 5;
    const due = dueKeys().length, any = unlockedKeys().length;
    let h = '<div class="page"><div class="brand"><h1>Üben</h1>' + hud() + '</div>';
    h += '<a class="reviewcard' + (any ? '' : ' off') + '" href="#wiederholen"><span class="rc-i">' + ICON.repeat + '</span><span><span class="t">Wiederholen</span><span class="d">' + (!any ? 'Füllt sich nach deiner ersten Lektion.' : due ? due + (due === 1 ? ' Thema ist' : ' Themen sind') + ' heute fällig – Fehler kommen zuerst.' : 'Heute ist nichts fällig. Eine Extrarunde schadet nie.') + '</span></span>' + (due ? '<span class="badge-n">' + due + '</span>' : '') + '</a>';
    h += '<p class="note">Jede Übung erzeugt neue Aufgaben. Bestanden ist sie ab 80 % beim ersten Versuch.</p>';
    for (const L of LEVELS) {
      const ids = D.ORDER.filter((id) => D.DRILLS[id].stage === L.n);
      if (!ids.length) continue;
      h += '<section class="block' + (L.n > cs ? ' later' : '') + '"><div class="block-h"><h3>Stufe ' + L.n + ' · ' + L.short + '</h3></div>' + (L.n > cs ? '<p class="later-note">Kommt später – passt, wenn du Stufe ' + L.n + ' erreicht hast.</p>' : '');
      for (const id of ids) {
        const d = D.DRILLS[id], b = drillBest(id), e = P.srs['d:' + id];
        const isDue = e && e.d <= today() && P.drills[id];
        h += '<a class="row" href="#uebung-' + id + '"><span class="mark' + (b >= 80 ? ' done' : b ? ' part' : '') + '">' + (b >= 80 ? '✓' : '') + '</span><span><span class="t">' + d.title + '</span>' + (isDue ? ' <span class="duetag">fällig</span>' : '') + '<br><span class="d">' + d.desc + '</span></span><span class="score' + (b >= 80 ? ' good' : '') + '">' + (b ? b + ' %' : '–') + '</span></a>';
      }
      if (L.n === 3) {
        const n = C.TACTICS.filter((t) => P.tactics[t.id]).length;
        h += '<a class="row" href="#taktik"><span class="mark' + (n >= C.TACTICS.length ? ' done' : n ? ' part' : '') + '">' + (n >= C.TACTICS.length ? '✓' : '') + '</span><span><span class="t">Taktik-Aufgaben</span><br><span class="d">' + C.TACTICS.length + ' typische Spielsituationen mit Erklärung</span></span><span class="score">' + n + '/' + C.TACTICS.length + '</span></a>';
      }
      h += '</section>';
    }
    h += '<section class="block"><div class="block-h"><h3>Stufentests</h3></div>' + [1, 2, 3, 4, 5].map((n) => '<a class="row" href="#test-' + n + '"><span class="mark' + (examPassed(n) ? ' done' : '') + '">' + (examPassed(n) ? '✓' : '') + '</span><span><span class="t">' + (n < 5 ? 'Stufentest ' + n + ' · ' + LEVELS[n - 1].short : 'Abschlussprüfung') + '</span><br><span class="d">Gemischte Aufgaben, bestanden ab 80 %</span></span><span class="score' + (examPassed(n) ? ' good' : '') + '">' + (P.exams[n] ? P.exams[n].best + ' %' : '–') + '</span></a>').join('') + '</section>';
    h += '</div>';
    screen(h);
  }

  // ================= Übungsspiel =================
  const NAMES = ['Du', 'Lena', 'Tom'];
  const RISK = [0.5, 0.55, 0.46];
  const POS = (st, p) => (p === st.vh ? 'Vorhand' : p === st.mh ? 'Mittelhand' : 'Hinterhand');
  const POSK = (st, p) => (p === st.vh ? 'VH' : p === st.mh ? 'MH' : 'HH');
  let GMN = lsGet(LS_G), GMG = lsGet(LS_GG);
  let GM = null;
  let gameTimer = null;
  const guided = () => !!(GM && GM.m.guide);
  const tempo = () => (guided() ? { bot: 1100, hold: 0 } : { langsam: { bot: 1000, hold: 1800 }, normal: { bot: 650, hold: 1200 }, schnell: { bot: 320, hold: 650 } }[P.settings.tempo] || { bot: 650, hold: 1200 });
  const help = () => (guided() ? 'lern' : (GM && GM.m.mode) || P.settings.help);
  const saveGame = () => { if (!GM) return; if (GM.m.guide) { GMG = GM; lsSet(LS_GG, GM); } else { GMN = GM; lsSet(LS_G, GM); } };
  const onTable = () => view === 'spielen' || view === 'gefuehrt';
  const newM = (o) => Object.assign({ mode: P.settings.help, bubbles: ['', '', ''], msg: '', coach: [], hints: 0, hold: null, sel: [], hint: null, countAt: 5 + rand(3), countDone: false, decl: { gt: null, sa: false, sw: false, ov: false }, warned: false, advice: false, recorded: false, shown: false }, o || {});

  function newDeal() {
    P.dealer = P.dealer == null ? rand(3) : (P.dealer + 1) % 3;
    save();
    const st = E.newGame(P.dealer, E.deal(P.dealer, Math.random));
    GM = { st, m: newM() };
    saveGame();
  }
  function nextGame() {
    if (guided()) { const n = GM.m.guide.n; GM = { st: guideDeal(n), m: newM({ guide: { n, i: 0 } }) }; saveGame(); }
    else newDeal();
  }
  function viewGame(want) {
    GM = GMN;
    // Aufgabe aus dem Plan verlangt einen Modus mit weniger Hilfen
    if (PL.MODE_RANK[want] && PL.MODE_RANK[P.settings.help] < PL.MODE_RANK[want]) {
      P.settings.help = want; save();
      toast(want === 'profi' ? 'Profi-Modus eingeschaltet: keine Tipps, keine Markierungen.' : 'Modus „Normal“ eingeschaltet: Tipps nur auf Knopfdruck, mit Mitzähl-Probe.', 3600);
      if (GM && GM.st && GM.m && !GM.m.recorded && !GM.st.tricks.length && GM.st.phase === 'bidding' && !GM.st.bidding.log.length) GM = null;
    }
    if (GM && GM.m && GM.m.recorded && PL.MODE_RANK[want] && PL.MODE_RANK[GM.m.mode] < PL.MODE_RANK[want]) GM = null;
    if (!GM || !GM.st || !GM.m) newDeal();
    if (GM.m.hold && GM.m.hold.trick) GM.m.hold = null;
    if (GM.m.hold && GM.m.hold.count) GM.m.hold = null;
    gameStep();
  }
  function gameStep() {
    clearTimeout(gameTimer);
    if (!onTable()) return;
    renderGame();
    saveGame();
    const { st, m } = GM;
    if (m.hold) return;
    if (m.guide && m.guide.i < guideIntro(st, m.guide.n).length) return;
    const T = tempo();
    if (st.phase === 'bidding') {
      const a = E.biddingActor(st);
      if (a !== 0) gameTimer = setTimeout(() => { botBid(a); gameStep(); }, T.bot);
    } else if (st.phase === 'skat' && st.declarer !== 0) {
      gameTimer = setTimeout(() => {
        B.declare(st);
        m.bubbles = ['', '', ''];
        m.msg = '<b>' + NAMES[st.declarer] + '</b> spielt <b>' + E.gameLabel(st.game) + '</b>' + (st.game.hand ? '' : ' (Skat aufgenommen)') + '. Reizwert ' + st.bid + '.';
        if (m.guide) m.guideNote = NAMES[st.declarer] + ' hat das Reizen gewonnen und spielt <b>' + E.gameLabel(st.game) + '</b>. Trumpf: ' + (st.game.gt < 4 ? E.SUIT_NAMES[st.game.gt] + ' und die vier Buben.' : st.game.gt === 4 ? 'nur die vier Buben.' : 'keiner (Null).') + ' Du und ' + NAMES[3 - st.declarer] + ' seid jetzt Partner.';
        gameStep();
      }, T.bot + 400);
    } else if (st.phase === 'play' && st.turn !== 0) {
      gameTimer = setTimeout(() => doPlay(st.turn, B.play(st, st.turn)), T.bot);
    } else if (st.phase === 'done' && !m.shown) {
      m.shown = true;
      recordGame();
      showResult();
    }
  }
  function botBid(a) {
    const st = GM.st;
    const act = B.bidAction(st, a, RISK[a]);
    E.bidAction(st, a, act);
    GM.m.bubbles[a] = act.type === 'say' ? String(act.value) : act.type === 'yes' ? 'Ja' : act.type === 'play18' ? '18' : 'Passe';
    GM.m.msg = '';
  }
  function humanBid(act) {
    const st = GM.st;
    E.bidAction(st, 0, act);
    GM.m.bubbles[0] = act.type === 'say' ? String(act.value) : act.type === 'yes' ? 'Ja' : act.type === 'play18' ? '18' : 'Passe';
    GM.m.msg = '';
    gameStep();
  }
  function doPlay(p, c) {
    const { st, m } = GM;
    if (p === 0) {
      const cm = A.coach(st, 0, c);
      m.msg = '';
      m.lastCoach = cm || null;
      if (cm) { m.coach.push(cm); if (help() !== 'profi' && !m.guide) m.msg = '<span class="coach"><b>Coach:</b> ' + rich(cm) + '</span>'; }
    }
    m.hint = null;
    m.guideNote = null;
    const t = E.playCard(st, p, c);
    if (t) {
      m.hold = { trick: t };
      renderGame();
      saveGame();
      if (!m.guide) gameTimer = setTimeout(releaseTrick, tempo().hold);
    } else gameStep();
  }
  function releaseTrick() {
    const { st, m } = GM;
    if (!m.hold || !m.hold.trick) return;
    clearTimeout(gameTimer);
    const tr = $('.trick');
    if (tr) tr.classList.add('collect', 'to' + m.hold.trick.winner);
    setTimeout(() => {
      m.hold = null;
      if (m.msg && m.msg.indexOf('coach') < 0) m.msg = '';
      m.lastCoach = null;
      if (!m.guide && help() !== 'lern' && st.phase === 'play' && st.game.gt !== E.GT_NULL && !m.countDone && st.tricks.length === m.countAt) {
        m.countDone = true;
        return countCheck();
      }
      gameStep();
    }, 260);
  }

  function countCheck() {
    const { st, m } = GM;
    m.hold = { count: true };
    saveGame();
    const declPts = st.tricks.filter((t) => t.winner === st.declarer).reduce((a, t) => a + t.pts, 0);
    const opts = [declPts];
    const cands = [declPts + 3, declPts - 4, declPts + 7, declPts - 10, declPts + 11, declPts - 2].filter((x) => x >= 0 && x <= 120);
    for (const x of cands.sort(() => Math.random() - 0.5)) { if (opts.length >= 4) break; if (!opts.includes(x)) opts.push(x); }
    opts.sort((a, b) => a - b);
    const who = st.declarer === 0 ? 'du' : NAMES[st.declarer] + ' (Alleinspieler)';
    const render = (chosen) => {
      let h = '<div class="eyebrow">Mitzähl-Probe</div><h2>Wie viele Augen hat ' + who + ' bis jetzt?</h2><p class="note">Nur die Stiche, ohne Skat. Nach ' + st.tricks.length + ' Stichen.</p><div class="opts">';
      h += opts.map((o) => '<button class="opt' + (chosen != null ? (o === declPts ? ' right' : o === chosen ? ' wrong' : '') : '') + '" data-v="' + o + '"' + (chosen != null ? ' disabled' : '') + '>' + o + ' Augen</button>').join('') + '</div>';
      if (chosen != null) h += '<div class="feedback ' + (chosen === declPts ? 'ok' : 'no') + '"><b class="h">' + (chosen === declPts ? 'Richtig mitgezählt.' : 'Es sind ' + declPts + ' Augen.') + '</b>Die Gegenspieler haben ' + (st.tricks.reduce((a, t) => a + t.pts, 0) - declPts) + ' Augen in ihren Stichen.</div><button class="btn" data-go="1">Weiterspielen</button>';
      openSheet(h, (ev) => {
        const b = ev.target.closest('button');
        if (!b) return;
        if (b.dataset.v != null && chosen == null) {
          const v = Number(b.dataset.v);
          P.countChecks.total++;
          if (v === declPts) P.countChecks.ok++;
          save();
          render(v);
        } else if (b.dataset.go) { closeSheet(); m.hold = null; gameStep(); }
      });
    };
    render(null);
  }

  function recordGame() {
    const { st, m } = GM;
    if (m.recorded) return;
    m.recorded = true;
    const r = st.result;
    if (m.guide) {
      const won = st.declarer === 0 ? r.won : !r.won;
      const first = !guideDone(m.guide.n);
      P.guides[m.guide.n] = { done: true, won: won || (P.guides[m.guide.n] && P.guides[m.guide.n].won) || false };
      m.gain = gain(first ? 20 : 8);
      saveGame();
      return;
    }
    const humanDecl = st.declarer === 0;
    const won = humanDecl ? r.won : !r.won;
    const sf = [0, 0, 0];
    sf[st.declarer] = r.sfDecl;
    if (!r.won) for (let p = 0; p < 3; p++) if (p !== st.declarer) sf[p] = r.sfOpp;
    P.games.push({ t: Date.now(), decl: humanDecl, won, mode: m.mode, hints: m.hints, coach: m.coach.length, gt: st.game.gt, sf: sf[0] });
    P.list.push({ decl: st.declarer, label: E.gameLabel(st.game), value: r.value, score: r.score, won: r.won, sf });
    m.gain = gain(8 + (won ? 4 : 0) + (m.mode === 'profi' ? 3 : 0));
    saveGame();
  }
  // XP gutschreiben und festhalten, was sich dadurch im Plan getan hat
  function gain(xp) {
    const before = curDay();
    const streakInc = award(xp);
    const days = syncPlan();
    const ach = checkAch();
    let task = '';
    if (before && !days.length) { const i = before.tasks.findIndex((t, k) => t[0] === 'p' && !taskDone(before, k)); if (i >= 0) task = 'Tagesaufgabe: ' + taskInfo(before, i).pv + ' Spiele'; }
    if (streakInc || days.length) beep('win');
    return { xp, streak: streakInc ? P.streak.n : 0, days: days.map((d) => ({ n: d.n, title: d.title })), ach: ach.map((a) => a.t), task };
  }
  function gainHTML(g) {
    if (!g) return '';
    let h = '<div class="gain"><span class="g-xp">' + ICON.bolt + '+' + g.xp + ' XP</span>';
    if (g.streak) h += '<span class="g-fire">' + ICON.flame + g.streak + (g.streak === 1 ? ' Tag' : ' Tage') + ' in Folge</span>';
    if (g.task) h += '<span>' + g.task + '</span>';
    for (const d of g.days) h += '<span class="g-day">' + ICON.check + 'Tag ' + d.n + ' geschafft – Tagesziel erreicht</span>';
    for (const a of g.ach) h += '<span class="g-ach">' + ICON.trophy + 'Erfolg: ' + a + '</span>';
    return h + '</div>';
  }

  function valueLine(r) {
    if (r.gt === E.GT_NULL) return r.value;
    return r.items.map((i) => i.label).join(' · ') + ' = ' + r.levels + ' × ' + r.base + ' = ' + (r.overbid ? r.valueBefore : r.value);
  }
  function showResult() {
    const { st, m } = GM;
    if (m.guide) return showGuideResult();
    const r = st.result;
    const humanDecl = st.declarer === 0;
    const won = humanDecl ? r.won : !r.won;
    const head = humanDecl ? (r.won ? 'Gewonnen!' : 'Verloren') : r.won ? NAMES[st.declarer] + ' hat gewonnen' : 'Ihr habt gewonnen!';
    const myS = P.list.length ? P.list[P.list.length - 1].sf[0] : 0;
    let h = '<div class="eyebrow">' + (won ? 'Spiel für dich' : 'Spiel gegen dich') + '</div><h2>' + head + '</h2><p>' + esc(r.reason) + (r.early ? ' Das Spiel endet vorzeitig.' : '') + '</p><div class="reckon">';
    h += '<div><span>Alleinspieler</span><span>' + NAMES[st.declarer] + '</span></div>';
    h += '<div><span>Spiel · Reizwert</span><span>' + E.gameLabel(st.game) + ' · ' + st.bid + '</span></div>';
    if (r.gt === E.GT_NULL) h += '<div><span>Stiche des Alleinspielers</span><span>' + r.declTricks + '</span></div>';
    else h += '<div><span>Augen Alleinspieler : Gegner</span><span>' + r.declPts + ' : ' + r.oppPts + '</span></div>';
    h += '<div><span>Spielwert</span><span>' + valueLine(r) + '</span></div>';
    if (r.overbid) h += '<div><span>Überreizt – abgerechnet wird</span><span>' + r.value + '</span></div>';
    h += '<div class="tot"><span>Ergebnis ' + (humanDecl ? '(du)' : '(' + NAMES[st.declarer] + ')') + '</span><span>' + (r.score > 0 ? '+' : '') + r.score + '</span></div>';
    h += '<div><span>Seeger-Fabian für dich</span><span>' + (myS > 0 ? '+' : '') + myS + '</span></div></div>';
    h += '<div><div class="eyebrow">Skat</div><span class="crow">' + st.origSkat.map((c) => cardHTML(c)).join('') + '</span>' + (st.skatTaken ? '<div class="eyebrow" style="margin-top:6px">Gedrückt</div><span class="crow">' + st.discard.map((c) => cardHTML(c)).join('') + '</span>' : '') + '</div>';
    if (m.coach.length) h += '<div><div class="eyebrow">Hinweise vom Coach</div><ul class="coachlist">' + m.coach.map((x) => '<li>' + rich(x) + '</li>').join('') + '</ul></div>';
    else if (m.mode !== 'lern') h += '<p class="note">Kein Hinweis vom Coach – sauber gespielt.</p>';
    h += gainHTML(m.gain);
    const dayHit = m.gain && m.gain.days.length;
    h += '<div class="btns"><button class="btn soft" data-a="hist">Spielverlauf</button>' + (dayHit ? '<a class="btn brass" href="#lernen">Zum Lernpfad</a><button class="btn soft" data-a="next">Nächstes Spiel</button>' : '<button class="btn" data-a="next">Nächstes Spiel</button>') + '</div>';
    openSheet(h, (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.a === 'next') { closeSheet(); nextGame(); gameStep(); }
      if (b.dataset.a === 'hist') showHistory();
    });
  }
  function showHistory() {
    const st = GM.st;
    let h = '<div class="eyebrow">Spielverlauf</div><h2>' + E.gameLabel(st.game) + '</h2><div class="tricklist" style="--cw:40px">';
    st.tricks.forEach((t, i) => {
      h += '<div class="tl"><span style="width:20px">' + (i + 1) + '.</span>' + t.cards.map((x) => '<span style="display:flex;flex-direction:column;align-items:center;gap:2px">' + cardHTML(x.c) + '<span style="font-size:10px">' + NAMES[x.p] + '</span></span>').join('') + '<span>→ ' + NAMES[t.winner] + ' (' + t.pts + ')</span></div>';
    });
    h += '</div><div class="eyebrow">Ausgangskarten</div>';
    for (let p = 0; p < 3; p++) h += '<div><b>' + NAMES[p] + '</b> (' + POS(st, p) + ')<span class="crow" style="--cw:30px">' + E.sortHand(st.origHands[p], st.game.gt).map((c) => cardHTML(c)).join('') + '</span></div>';
    h += '<div class="btns"><button class="btn soft" data-a="back">Zurück zur Abrechnung</button><button class="btn" data-a="next">Nächstes Spiel</button></div>';
    openSheet(h, (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.a === 'back') showResult();
      if (b.dataset.a === 'next') { closeSheet(); nextGame(); gameStep(); }
    });
  }

  // ================= Geführte Spiele =================
  const stepsHTML = (arr) => '<ol class="think">' + arr.filter(Boolean).map((x) => '<li>' + x + '</li>').join('') + '</ol>';
  const who = (p) => (p === 0 ? 'du' : NAMES[p]);
  const Who = (p) => (p === 0 ? 'Du' : NAMES[p]);
  const vb = (p, du, er) => (p === 0 ? du : er);
  function roleOf(st, p) {
    if (p === 0) return '';
    if (p === st.declarer) return ' (Alleinspieler)';
    if (st.declarer !== 0) return p === 1 ? ' (deine Partnerin)' : ' (dein Partner)';
    return '';
  }

  function guideDeal(n) {
    for (let tries = 0; tries < 20000; tries++) {
      const relax = tries > 15000;
      const dealer = 2; // du bist Vorhand
      const dealt = E.deal(dealer, Math.random);
      if (n === 1) {
        const h = dealt.hands[0];
        let best = null;
        for (let gt = 0; gt < 4; gt++) {
          const nt = h.filter((c) => E.isTrump(c, gt)).length;
          const p = A.pFixed(h, gt, true, A.AVG_SKAT);
          if (!best || p > best.p) best = { gt, p, nt };
        }
        if (!relax && (best.p < 0.85 || best.nt < 6)) continue;
        const st = E.newGame(dealer, dealt);
        st.bidding.waiting = null; st.declarer = 0; st.bid = 18; st.phase = 'skat';
        E.playHand(st);
        E.declare(st, { gt: best.gt, hand: true });
        return st;
      }
      if (n === 2) {
        const tom = A.bidOptions(dealt.hands[2], false)[0];
        if (!relax && (tom.gt >= 4 || tom.p < 0.65)) continue;
        const st = E.newGame(dealer, dealt);
        st.bidding.waiting = null; st.declarer = 2; st.bid = 18; st.phase = 'skat';
        B.declare(st);
        if (!relax && (st.game.gt >= 4 || st.game.ouvert)) continue;
        return st;
      }
      const me = A.bidLimit(dealt.hands[0], true, 0.5);
      const l1 = A.bidLimit(dealt.hands[1], false, RISK[1]).limit;
      const l2 = A.bidLimit(dealt.hands[2], false, RISK[2]).limit;
      let ok = me.limit >= 22 && me.choice && me.choice.gt < 4 && !me.choice.hand && Math.max(l1, l2) < me.limit && Math.max(l1, l2) >= 18;
      if (ok) {
        const all12 = dealt.hands[0].concat(dealt.skat);
        const gt = me.choice.gt;
        const a = E.spitzen(dealt.hands[0], gt), b = E.spitzen(all12, gt);
        ok = a.mit === b.mit && a.n === b.n && A.chooseGame({ declarer: 0, vh: 0, bid: me.limit }, all12, false).gt === gt;
      }
      if (!relax && !ok) continue;
      return E.newGame(dealer, dealt);
    }
    return E.newGame(2, E.deal(2, Math.random));
  }

  function viewGuide(n) {
    const keep = GMG && GMG.m && GMG.m.guide && GMG.m.guide.n === n && !GMG.m.recorded;
    GM = keep ? GMG : { st: guideDeal(n), m: newM({ guide: { n, i: 0 } }) };
    saveGame();
    gameStep();
  }

  const PTS_TABLE = '<table class="pts"><tr><td>Ass</td><td>11</td></tr><tr><td>Zehn</td><td>10</td></tr><tr><td>König</td><td>4</td></tr><tr><td>Dame</td><td>3</td></tr><tr><td>Bube</td><td>2</td></tr><tr><td>9, 8, 7</td><td>0</td></tr></table>';
  function guideIntro(st, n) {
    const gt = st.game ? st.game.gt : null;
    const tn = gt != null && gt < 4 ? E.SUIT_NAMES[gt] : '';
    if (n === 1) {
      const nT = st.hands[0].filter((c) => E.isTrump(c, gt)).length + st.tricks.reduce((a, t) => a + t.cards.filter((x) => x.p === 0 && E.isTrump(x.c, gt)).length, 0);
      return [
        '<b>Willkommen am Skattisch!</b> Ihr seid zu dritt: du, Lena (oben links) und Tom (oben rechts). Jeder hat 10 Karten. In diesem Spiel spielst <b>du allein gegen Lena und Tom</b>.',
        '<b>Dein Ziel:</b> Jede Karte zählt Punkte, sie heißen Augen – Ass 11, Zehn 10, König 4, Dame 3, Bube 2, die 9, 8 und 7 zählen nichts. Du brauchst am Ende <b>61 der 120 Augen</b>.',
        '<b>Trumpf</b> sind die stärksten Karten: hier <b>' + tn + '</b> und dazu immer die vier Buben. Deine Trümpfe haben unten einen goldenen Streifen – du hast ' + nT + ' davon.<br>Gespielt wird reihum: Jeder legt eine Karte, die stärkste gewinnt alle drei. Das ist ein <b>Stich</b>. <b>Du fängst an</b> – ich erkläre dir jeden Zug.',
      ];
    }
    if (n === 2) {
      const D = st.declarer, Pn = 3 - D;
      return [
        '<b>Diesmal spielt ' + NAMES[D] + ' allein</b>, mit <b>' + tn + '</b> als Trumpf (dazu die vier Buben – deine sind gold markiert). Du und ' + NAMES[Pn] + ' seid Partner: Eure Augen zählen zusammen, euch reichen <b>60</b>.',
        '<b>Der wichtigste Trick zu zweit:</b> Gewinnt ' + NAMES[Pn] + ' einen Stich sicher, gib eine Karte mit vielen Augen dazu – ein Ass oder eine Zehn. Das heißt schmieren. Gewinnt ' + NAMES[D] + ' den Stich, gib ' + (D === 2 ? 'ihm' : 'ihr') + ' möglichst wenig.<br>' + (st.vh === 0 ? '<b>Du spielst aus.</b>' : '<b>' + NAMES[st.vh] + ' spielt aus.</b>'),
      ];
    }
    return [
      '<b>Jetzt spielst du ein ganzes Spiel</b> – vom Reizen über Skat und Drücken bis zur Abrechnung. Alles dafür kennst du aus den Lektionen. Ich rechne mit dir zusammen.',
      '<b>So beginnt es:</b> ' + NAMES[st.mh] + ' nennt dir Zahlen. Du sagst „Ja“, solange dein bestes Spiel mindestens so viel wert ist – sonst „Passe“.',
    ];
  }

  function bidActText(x) {
    const pr = x.p === 1 ? 'sie' : 'er';
    if (x.txt === 'Passe') return NAMES[x.p] + ' passt – ' + pr + ' steigt aus.';
    if (x.txt === 'Ja') return NAMES[x.p] + ' sagt „Ja“ – ' + pr + ' hat auch ein Spiel, das so viel wert ist.';
    return NAMES[x.p] + ' sagt <b>' + x.txt + '</b> – ' + pr + ' hat ein Spiel, das mindestens ' + x.txt + ' wert ist.';
  }
  function guideBid(st) {
    const b = st.bidding;
    const a = E.biddingActor(st);
    const bl = A.bidLimit(st.hands[0], st.vh === 0, 0.5);
    const lim = bl.limit, ch = bl.choice;
    let worth = 'Dein Blatt ist zu schwach für ein eigenes Spiel.';
    if (lim && ch) worth = 'Dein bestes Spiel: <b>' + E.GAME_NAMES[ch.gt] + (ch.gt < 5 && !ch.hand ? ' ' + (ch.sp.mit ? 'mit ' : 'ohne ') + ch.sp.n + '</b> – ' + ch.sp.n + ' Spitzen + 1 = ' + (ch.sp.n + 1) + ' Stufen × ' + E.BASE[ch.gt] + ' = <b>' + lim + '</b>.' : '</b>, Wert <b>' + lim + '</b>.');
    const last = b.log[b.log.length - 1];
    const lastTxt = last && last.p !== 0 ? bidActText(last) + ' ' : '';
    let t;
    if (a === 0) {
      if (b.waiting === 'hear') t = lastTxt + 'Ist dein bestes Spiel mindestens ' + b.bid + ' wert? ' + worth + ' ' + (b.bid <= lim ? lim + ' reicht für ' + b.bid + ' → sag <b>„Ja“</b>.' : lim + ' ist weniger als ' + b.bid + ' → sag <b>„Passe“</b>, sonst überreizt du dich.');
      else if (b.waiting === 'say') { const nb = E.nextBid(b.bid); t = lastTxt + 'Jetzt nennst du die nächste Zahl: <b>' + nb + '</b>. ' + worth + ' ' + (nb <= lim ? lim + ' reicht für ' + nb + ' → sag <b>„' + nb + '“</b>.' : lim + ' reicht nicht für ' + nb + ' → sag <b>„Passe“</b>.'); }
      else t = 'Alle anderen haben gepasst. Du darfst für 18 spielen. ' + worth + ' ' + (lim >= 18 ? 'Das reicht → tippe auf „18 spielen“.' : 'Das reicht nicht → tippe auf „Passe“.');
    } else t = lastTxt + (b.waiting === 'hear' ? NAMES[b.hearer] + ' überlegt …' : b.sayer === 0 ? '' : NAMES[b.sayer] + ' überlegt …');
    return rich(t);
  }

  function guideTurn(st, m) {
    const gt = st.game.gt;
    const hand = st.hands[0];
    const s = [];
    if (m.guideNote) s.push(m.guideNote);
    if (!st.trick.length) {
      s.push('Du spielst aus – du darfst <b>jede Karte</b> legen. Die anderen müssen dann bedienen.');
    } else {
      const lead = st.trick[0];
      const le = E.effSuit(lead.c, gt);
      const nd = le === 4 ? 'Trumpf' : E.SUIT_NAMES[le];
      let s1 = 'Gefragt ist <b>' + nd + '</b> – ' + who(lead.p) + roleOf(st, lead.p) + ' hat ' + chip(lead.c) + ' ausgespielt.';
      if (le === 4 && E.rankOf(lead.c) === 7) s1 += ' Buben sind immer Trumpf.';
      s.push(s1);
      const follow = hand.filter((c) => E.effSuit(c, gt) === le);
      if (follow.length) {
        let s2 = 'Du hast ' + nd + ': ' + follow.map(chip).join(' ') + '. Dann <b>musst</b> du eine davon legen (bedienen). Nur diese Karten sind hell.';
        if (le < 4 && gt !== E.GT_NULL && hand.includes(E.card(le, 7))) s2 += ' ' + chip(E.card(le, 7)) + ' zählt nicht dazu – er ist Trumpf.';
        s.push(s2);
      } else {
        s.push('Du hast kein ' + nd + '. Dann darfst du <b>jede Karte</b> legen' + (gt === E.GT_NULL ? '.' : ': einen Trumpf (stechen) oder eine andere Karte (abwerfen).'));
      }
      const cs = st.trick.map((x) => x.c);
      const bp = st.trick[E.trickWinnerIndex(cs, gt)].p;
      s.push('Im Moment liegt ' + who(bp) + roleOf(st, bp) + ' mit ' + chip(cs[E.trickWinnerIndex(cs, gt)]) + ' vorn.');
    }
    const r = A.choose(st, 0);
    m.hint = [r.card];
    s.push('<b>Vorschlag:</b> ' + chip(r.card) + ' (hochgestellt) – ' + r.reason + ' Du darfst aber auch eine andere erlaubte Karte nehmen.');
    return '<div class="eyebrow">Du bist dran</div>' + rich(stepsHTML(s));
  }

  function explainTrick(st, t, m) {
    const gt = st.game.gt;
    const cs = t.cards;
    const le = E.effSuit(cs[0].c, gt);
    const nd = le === 4 ? 'Trumpf' : E.SUIT_NAMES[le];
    const s = [Who(cs[0].p) + ' ' + vb(cs[0].p, 'hast', 'hat') + ' ' + chip(cs[0].c) + ' ausgespielt – gefragt war ' + nd + '.'];
    for (const x of cs.slice(1)) {
      const e = E.effSuit(x.c, gt);
      if (e === le) s.push(Who(x.p) + ' ' + vb(x.p, 'hast', 'hat') + ' ' + chip(x.c) + ' gelegt (bedient).');
      else if (e === 4) s.push(Who(x.p) + ' ' + vb(x.p, 'hattest', 'hatte') + ' kein ' + nd + ' und ' + vb(x.p, 'hast', 'hat') + ' mit ' + chip(x.c) + ' gestochen.');
      else s.push(Who(x.p) + ' ' + vb(x.p, 'hattest', 'hatte') + ' kein ' + nd + ' und ' + vb(x.p, 'hast', 'hat') + ' ' + chip(x.c) + ' abgeworfen.');
    }
    const wc = cs.find((x) => x.p === t.winner).c;
    const why = E.isTrump(wc, gt) ? (le === 4 ? 'der höchste Trumpf im Stich' : 'ein Trumpf – und Trumpf schlägt jede andere Farbe') : 'die höchste ' + nd + '-Karte im Stich';
    s.push('<b>' + (t.winner === 0 ? 'Du bekommst' : NAMES[t.winner] + ' bekommt') + ' den Stich</b>: ' + chip(wc) + ' ist ' + why + '.');
    const parts = cs.filter((x) => E.pts(x.c)).map((x) => chip(x.c) + ' ' + E.pts(x.c));
    s.push(parts.length ? 'Augen im Stich: ' + parts.join(' + ') + ' = <b>' + t.pts + '</b>' : 'Im Stich sind keine Augen – nur Luschen.');
    if (gt !== E.GT_NULL) {
      const pp = E.pointsSoFar(st);
      const dp = pp[st.declarer], op = pp[0] + pp[1] + pp[2] - dp;
      const D = st.declarer;
      if (D === 0) s.push('Stand: du <b>' + dp + '</b> – ' + NAMES[1] + ' und ' + NAMES[2] + ' ' + op + '. Du brauchst 61' + (st.skatTaken ? ' (dazu kommen ' + E.sumPts(st.discard) + ' gedrückte Augen).' : ' – der Skat zählt am Ende noch für dich.'));
      else s.push('Stand: ' + (D === 1 ? 'du und ' + NAMES[2] : 'du und ' + NAMES[1]) + ' <b>' + op + '</b> – ' + NAMES[D] + ' ' + dp + '. ' + NAMES[D] + ' braucht 61, euch reichen 60.');
    } else s.push(t.winner === st.declarer ? 'Der Alleinspieler hat einen Stich bekommen – damit ist das Nullspiel verloren.' : 'Der Alleinspieler darf keinen Stich bekommen.');
    if (m.lastCoach) s.push('<b>Hinweis:</b> ' + m.lastCoach);
    return '<div class="eyebrow">Stich ' + st.tricks.length + ' von 10</div>' + rich(stepsHTML(s));
  }

  function guideBox(st, m) {
    const g = m.guide;
    const intro = guideIntro(st, g.n);
    if (g.i < intro.length) return { solo: '<div class="eyebrow">Erklärung ' + (g.i + 1) + ' von ' + intro.length + '</div><div class="gtext">' + rich(intro[g.i]) + '</div><button class="btn" data-a="gnext">Weiter</button>' };
    if (m.hold && m.hold.trick) return { solo: '<div class="gtext">' + explainTrick(st, m.hold.trick, m) + '</div><button class="btn" data-a="gtrick">' + (st.phase === 'done' ? 'Zum Ergebnis' : 'Weiter') + '</button>' };
    if (st.phase === 'bidding') { const t = guideBid(st); return E.biddingActor(st) === 0 ? { inner: t } : { solo: '<div class="eyebrow">Reizen</div><div class="gtext">' + t + '</div>' }; }
    if (st.phase === 'eingepasst') return { inner: rich('Alle haben gepasst – niemand wollte allein spielen. Dann wird neu gegeben.') };
    if (st.phase === 'skat') return st.declarer === 0 ? { inner: rich('<b>Du hast das Reizen gewonnen</b> und spielst allein! Zuerst nimmst du den Skat auf: Die zwei Karten aus der Mitte kommen zu deinen. Tippe auf „Skat aufnehmen“.') } : { solo: '<div class="gtext">' + NAMES[st.declarer] + ' hat das Reizen gewonnen und überlegt, was Trumpf wird …</div>' };
    if (st.phase === 'discard') {
      if (!m.recD) { m.recD = discardAdvice(st); m.hint = m.recD.discard.slice(); }
      const why = D.discardReason(st.hands[0], m.recD.discard, m.recD.gt);
      return { inner: rich('Jetzt hast du 12 Karten und legst 2 davon verdeckt weg – das heißt drücken. Ihre Augen zählen am Ende für dich.<br><b>Vorschlag:</b> ' + m.recD.discard.map(chip).join(' ') + ' (hochgestellt). ' + why + '<br>Tippe beide an (' + m.sel.length + '/2) und dann auf „Diese 2 drücken“.') };
    }
    if (st.phase === 'declare') {
      if (!m.recD || m.recD.gt == null) m.recD = { gt: gameAdvice(st).gt };
      if (m.decl.gt == null) { m.decl.gt = m.recD.gt; m.decl.nov = false; m.sortGt = m.recD.gt; }
      const o = declOptsFor(st, m.decl).find((x) => x.gt === m.recD.gt && !x.ov);
      const tr = m.recD.gt < 4 ? E.SUIT_NAMES[m.recD.gt] + ' (dazu die vier Buben)' : m.recD.gt === 4 ? 'Grand (nur die Buben sind Trumpf)' : 'Null (ohne Trumpf)';
      const sp = E.spitzen(st.hands[0].concat(st.discard), m.recD.gt);
      const calc = m.recD.gt < 5 ? ' (' + (sp.mit ? 'mit ' : 'ohne ') + sp.n + ': ' + (sp.n + 1) + ' Stufen × ' + E.BASE[m.recD.gt] + ')' : '';
      return { inner: rich('Jetzt sagst du an, was Trumpf ist. Am besten die Farbe, von der du die meisten Karten hast – zusammen mit deinen Buben.<br><b>Vorschlag: ' + tr + '</b>. Dieses Spiel ist ' + o.v + ' wert' + calc + (o.v >= st.bid ? ' – mindestens so viel wie gereizt (' + st.bid + '). Passt!' : '.') + ' Tippe auf „Ansagen“.') };
    }
    if (st.phase === 'play') {
      if (st.turn === 0) return { solo: guideTurn(st, m) };
      return { solo: '<div class="gtext">' + (m.guideNote ? rich(m.guideNote) + '<br>' : '') + NAMES[st.turn] + roleOf(st, st.turn) + ' ist dran …</div>' };
    }
    if (st.phase === 'done') return { solo: '<div class="gtext">Das Spiel ist vorbei.</div><button class="btn" data-a="result">Zum Ergebnis</button>' };
    return {};
  }

  const LEARNED = {
    1: ['Ein Stich: Jeder legt eine Karte, die stärkste gewinnt.', 'Bedienen: Wer die gefragte Farbe hat, muss sie legen.', 'Trumpf schlägt alle anderen Farben – Buben sind immer Trumpf.', 'Der Alleinspieler braucht 61 Augen.'],
    2: ['Zu zweit gegen den Alleinspieler – euch reichen 60 Augen.', 'Schmieren: dem Partner Augen geben, wenn sein Stich sicher ist.', 'Dem Alleinspieler möglichst wenig Augen geben.'],
    3: ['Reizen: Zahlen sagen – nie mehr, als dein Blatt wert ist.', 'Skat aufnehmen und zwei Karten drücken.', 'Trumpf ansagen und das Spiel durchspielen.'],
  };
  function showGuideResult() {
    const { st, m } = GM;
    const n = m.guide.n, r = st.result;
    const me = st.declarer === 0;
    const won = me ? r.won : !r.won;
    let h = '<div class="eyebrow">Geführtes Spiel ' + n + '</div><h2>' + (won ? (me ? 'Gewonnen!' : 'Ihr habt gewonnen!') : me ? 'Diesmal verloren' : NAMES[st.declarer] + ' hat gewonnen') + '</h2>';
    let p;
    if (r.gt === E.GT_NULL) p = r.reason;
    else if (me) p = 'Du hattest am Ende <b>' + r.declPts + ' Augen</b>' + (E.sumPts(st.discard) ? ' – davon ' + E.sumPts(st.discard) + ' aus dem Skat, den zwei verdeckten Karten, die dem Alleinspieler gehören' : '') + '. Zum Gewinnen brauchst du 61.';
    else p = 'Ihr hattet zusammen <b>' + r.oppPts + ' Augen</b>, ' + NAMES[st.declarer] + ' ' + r.declPts + '. ' + NAMES[st.declarer] + ' brauchte 61.';
    h += '<p>' + rich(p) + '</p>';
    if (n === 3 && me && r.gt !== E.GT_NULL) h += '<p>' + rich('Spielwert: ' + valueLine(r) + '. Gereizt hattest du ' + st.bid + (r.overbid ? ' – das war zu viel (überreizt).' : ' – das passt.')) + '</p>';
    h += '<div><div class="eyebrow">Das hast du geübt</div><ul class="coachlist">' + LEARNED[n].map((x) => '<li>' + rich(x) + '</li>').join('') + '</ul></div>';
    h += gainHTML(m.gain);
    const cur = curDay();
    const nx = cur && !(m.gain && m.gain.days.length) ? cur.tasks.map((_, i) => taskInfo(cur, i)).find((x) => !x.done) : null;
    h += '<div class="btns">' + (nx ? '<a class="btn" href="' + nx.href + '">Weiter: ' + esc(nx.short) + '</a>' : '<a class="btn" href="#lernen">Zum Lernpfad</a>') + '<button class="btn soft" data-a="gagain">Noch einmal</button>' + (nx ? '<a class="btn soft" href="#lernen">Zum Lernpfad</a>' : '') + '</div>';
    openSheet(h, (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.a === 'gagain') { closeSheet(); nextGame(); gameStep(); }
    });
  }

  // ---------- Tipps ----------
  function bidAdvice(st) {
    const vh = st.vh === 0;
    const opts = A.bidOptions(st.hands[0], vh).slice(0, 3);
    const bl = A.bidLimit(st.hands[0], vh, 0.5);
    const lines = opts.map((o) => '<li>' + E.GAME_NAMES[o.gt] + (o.gt < 5 ? ' ' + (o.sp.mit ? 'mit ' : 'ohne ') + o.sp.n : '') + ': Wert ' + o.value + ' · Chance ca. ' + pct(o.p) + '</li>').join('');
    return '<div class="advice"><b>' + (bl.limit ? 'Empfehlung: bis ' + bl.limit + ' reizen' + (bl.choice && bl.choice.hand ? ' (als Hand)' : '') : 'Empfehlung: passen') + '</b><ul>' + lines + '</ul></div>';
  }
  function skatAdvice(st) {
    const h = st.hands[0];
    const vh = st.vh === 0;
    let best = null;
    for (let gt = 0; gt <= 5; gt++) {
      const v = E.announcedValue(gt, h.concat(st.skat), { hand: true });
      if (gt === E.GT_NULL && v < st.bid) continue;
      const p = A.pFixed(h, gt, vh, gt === E.GT_NULL ? 0 : A.AVG_SKAT);
      if (!best || p > best.p) best = { gt, p };
    }
    const pre = A.bidOptions(h, vh)[0];
    const hand = best && best.p >= 0.85;
    return '<div class="advice"><b>' + (hand ? 'Empfehlung: Hand spielen (' + E.GAME_NAMES[best.gt] + ')' : 'Empfehlung: Skat aufnehmen') + '</b><br>' + (best ? 'Hand ' + E.GAME_NAMES[best.gt] + ': Chance ca. ' + pct(best.p) + ' · ' : '') + 'mit Skat ' + E.GAME_NAMES[pre.gt] + ': ca. ' + pct(pre.p) + '</div>';
  }
  function discardAdvice(st) {
    return A.chooseGame(st, st.hands[0], false);
  }
  function gameAdvice(st) {
    const h = st.hands[0], vh = st.vh === 0, hand = !st.skatTaken;
    const cards = hand ? h : h.concat(st.discard);
    let best = null;
    for (let gt = 0; gt <= 5; gt++) {
      const v = E.announcedValue(gt, cards, { hand });
      if (gt === E.GT_NULL && v < st.bid) continue;
      const p = A.pFixed(h, gt, vh, gt === E.GT_NULL ? 0 : hand ? A.AVG_SKAT : E.sumPts(st.discard));
      const score = p + (v >= st.bid ? 1 : 0);
      if (!best || score > best.score) best = { gt, p, v, score };
    }
    return best;
  }

  // ---------- Ansage ----------
  const GAME_OPTS = [
    { gt: 3, cls: 's3' }, { gt: 2, cls: 's2' }, { gt: 1, cls: 's1' }, { gt: 0, cls: 's0' },
    { gt: 4, cls: '' }, { gt: 5, cls: '' }, { gt: 5, ov: true, cls: '' },
  ];
  const optLabel = (o) => E.GAME_NAMES[o.gt] + (o.ov ? ' ouvert' : '');
  const optSym = (o) => (o.gt < 4 ? suitMark(o.gt) : o.gt === 4 ? RS[7] : '0');
  function declOptsFor(st, d) {
    const hand = !st.skatTaken;
    const cards12 = hand ? st.hands[0].slice() : st.hands[0].concat(st.discard);
    return GAME_OPTS.map((o, i) => {
      const opts = o.gt === E.GT_NULL ? { hand, ouvert: !!o.ov } : { hand, schneiderAng: d.sa, schwarzAng: d.sw, ouvert: d.ov };
      const v = E.announcedValue(o.gt, cards12, opts);
      let txt;
      if (o.gt === E.GT_NULL) txt = 'fester Wert ' + v;
      else {
        const sp = E.spitzen(cards12, o.gt);
        const items = E.levelsFor({ ...sp, hand, schneiderAng: d.sa, schwarzAng: d.sw, ouvert: d.ov });
        const lv = items.reduce((a, x) => a + x.v, 0);
        txt = (sp.mit ? 'mit ' : 'ohne ') + sp.n + ' · ' + lv + ' × ' + E.BASE[o.gt] + ' = ' + v;
      }
      const blocked = o.gt === E.GT_NULL && v < st.bid;
      return { i, ...o, l: optLabel(o), s: optSym(o), v, txt, low: v < st.bid, blocked };
    });
  }

  // ---------- Darstellung ----------
  function renderGame() {
    const { st, m } = GM;
    const H = help();
    const gt = st.game ? st.game.gt : null;
    const myTurn = st.phase === 'play' && st.turn === 0 && !m.hold;
    const legal = myTurn ? E.legalFor(st, 0) : null;
    const pts = E.pointsSoFar(st);
    let panel = panelHTML(st, m, H);
    if (m.guide) {
      const gb = guideBox(st, m);
      if (gb.solo) panel = '<div class="panel guide" id="guide">' + gb.solo + '</div>';
      else if (gb.inner) panel = panel ? panel.replace('<div class="panel">', '<div class="panel guide" id="guide"><div class="gtext">' + gb.inner + '</div>') : '<div class="panel guide" id="guide">' + gb.inner + '</div>';
    }
    let h = '<div class="table' + (panel ? ' haspanel' : '') + (m.guide ? ' guided' : '') + '" id="table">';
    // Kopf
    const nr = P.list.length + (m.recorded ? 0 : 1);
    if (m.guide) h += '<div class="tbar"><a href="#lernen" aria-label="Zurück zum Lernpfad">← Lernpfad</a><div class="ttl">Geführtes Spiel ' + m.guide.n + ' · ' + GUIDES[m.guide.n - 1].t + '</div><span style="width:60px"></span></div>';
    else h += '<div class="tbar"><a href="#lernen" aria-label="Menü">← Menü</a><div class="ttl">Spiel ' + nr + ' · ' + ({ lern: 'Lernmodus', normal: 'Normal', profi: 'Profi' }[H]) + '</div><a href="#liste">Liste</a></div>';
    // Gegner
    h += '<div class="opps">' + [1, 2].map((p) => {
      const isTurn = (st.phase === 'bidding' && E.biddingActor(st) === p) || (st.phase === 'play' && st.turn === p && !m.hold);
      let b = m.guide ? '' : '<span class="badge">' + POSK(st, p) + '</span>';
      if (st.declarer === p && st.phase !== 'bidding') b += '<span class="badge decl">Alleinspieler</span>';
      if (st.dealer === p && !m.guide) b += '<span class="badge">Geber</span>';
      if (m.guide && st.phase === 'play' && st.declarer !== 0 && p !== st.declarer) b += '<span class="badge">Partner' + (p === 1 ? 'in' : '') + '</span>';
      const n = st.hands[p].length;
      let x = '<div class="opp ' + (p === 1 ? 'l' : 'r') + (isTurn ? ' turn' : '') + '"><div class="who"><div class="avatar">' + NAMES[p][0] + '</div><div><div class="nm">' + NAMES[p] + '</div><div class="badges">' + b + '</div></div></div>';
      if (st.game && st.game.ouvert && st.declarer === p && st.phase === 'play') x += '<div class="openhand">' + E.sortHand(st.hands[p], gt).map(chip).join('') + '</div>';
      else x += '<div class="backs">' + Array.from({ length: n }, backHTML).join('') + '</div>';
      if (m.bubbles[p] && (st.phase === 'bidding' || st.phase === 'skat' || st.phase === 'eingepasst')) x += '<div class="bubble">' + esc(m.bubbles[p]) + '</div>';
      return x + '</div>';
    }).join('') + '</div>';
    // Mitte
    h += '<div class="center" id="center">';
    const showTrick = m.hold && m.hold.trick ? m.hold.trick.cards : st.trick;
    if (st.phase === 'play' || (st.phase === 'done' && m.hold)) {
      h += '<div class="trick">' + showTrick.map((x) => '<div class="slot p' + x.p + '">' + cardHTML(x.c, { cls: H === 'lern' && E.isTrump(x.c, gt) ? 'trumpmark' : '' }) + '</div>').join('') + '</div>';
    } else if (st.phase === 'bidding' || (st.phase === 'skat' && !st.skatTaken)) {
      h += '<div class="skatpile">' + backHTML() + backHTML() + '</div>';
    }
    h += '</div>';
    // Infozeile
    let info = [];
    if (st.game && m.guide) {
      info.push(T(gt < 4 ? 'Trumpf: ' + E.SUIT_NAMES[gt] + ' + Buben' : gt === 4 ? 'Trumpf: nur Buben' : 'Null: kein Trumpf'));
      info.push('Stich ' + (m.hold && m.hold.trick ? st.tricks.length : Math.min(st.tricks.length + 1, 10)) + '/10');
      if (gt !== E.GT_NULL) {
        const dp = pts[st.declarer] + (st.declarer === 0 && st.skatTaken ? E.sumPts(st.discard) : 0);
        const op = pts[0] + pts[1] + pts[2] - pts[st.declarer];
        info.push(st.declarer === 0 ? 'Augen: du ' + dp + ' · Lena + Tom ' + op : 'Augen: ihr ' + op + ' · ' + NAMES[st.declarer] + ' ' + dp);
      }
    } else if (st.game) {
      info.push(E.gameLabel(st.game) + (st.declarer === 0 ? ' (du)' : ' (' + NAMES[st.declarer] + ')'));
      info.push('Reizwert ' + st.bid);
      info.push('Stich ' + (m.hold && m.hold.trick ? st.tricks.length : Math.min(st.tricks.length + 1, 10)) + '/10');
      if (H === 'lern' && gt !== E.GT_NULL) {
        const dp = pts[st.declarer] + (st.declarer === 0 && st.skatTaken ? E.sumPts(st.discard) : 0);
        const op = pts[0] + pts[1] + pts[2] - pts[st.declarer];
        info.push(st.declarer === 0 ? 'Augen: du ' + dp + ' : ' + op + ' Gegner' : 'Augen: Alleinspieler ' + dp + ' : ' + op + ' ihr');
        const v = A.makeView(st, 0);
        const outT = v.unseen.filter((c) => E.isTrump(c, gt)).length;
        info.push('Trümpfe draußen: ' + outT);
      }
    } else if (st.phase === 'bidding' && m.guide) {
      if (st.bidding.bid) info.push('Höchste Zahl bisher: ' + st.bidding.bid);
    } else if (st.phase === 'bidding') {
      info.push('Du bist ' + POS(st, 0));
      if (st.bidding.bid) info.push('Gereizt: ' + st.bidding.bid);
    }
    if (info.length) h += '<div class="infobar">' + info.map((x) => '<span>' + esc(x) + '</span>').join('') + '</div>';
    // Nachricht
    if (!m.guide) h += '<div class="msg" id="msg">' + (m.msg || statusText(st, m)) + '</div>';
    // Panel je Phase
    h += panel;
    // Aktionen
    const acts = [];
    if (st.phase === 'play' && H !== 'profi' && myTurn && !m.guide) acts.push('<button class="btn small tbtn" data-a="tipp">Tipp</button>');
    if (st.phase === 'play' && st.tricks.length && !m.guide) acts.push('<button class="btn small tbtn" data-a="last">Letzter Stich</button>');
    if (st.phase === 'done' && !m.hold) acts.push('<button class="btn small brass" data-a="result">Abrechnung</button><button class="btn small" data-a="next">Nächstes Spiel</button>');
    if (acts.length) h += '<div class="actions">' + acts.join('') + '</div>';
    // eigene Hand
    let hand = st.hands[0];
    hand = E.sortHand(hand, gt == null ? (m.sortGt != null ? m.sortGt : 3) : gt);
    const n = hand.length;
    const W = Math.min(window.innerWidth || 390, 640) - 20;
    let cw = (window.innerHeight || 800) >= 760 ? 70 : 64;
    let ov = n > 1 ? Math.floor((W - cw * n) / (n - 1)) : 0;
    if (ov > 6) ov = 6;
    if (ov < -cw * 0.62) { cw = Math.max(52, Math.floor(W / (1 + (n - 1) * 0.4))); ov = n > 1 ? Math.floor((W - cw * n) / (n - 1)) : 0; }
    const meTurn = (st.phase === 'bidding' && E.biddingActor(st) === 0) || myTurn;
    h += '<div class="me' + (meTurn ? ' turn' : '') + '"><div class="meline">' + (m.guide ? '' : '<span class="badge">' + POSK(st, 0) + ' · ' + POS(st, 0) + '</span>') + (st.declarer === 0 && st.phase !== 'bidding' ? '<span class="badge decl">Alleinspieler</span>' : '') + (st.dealer === 0 && !m.guide ? '<span class="badge">Geber</span>' : '') + (m.bubbles[0] && st.phase === 'bidding' ? '<span class="bubble" style="padding:1px 8px">' + esc(m.bubbles[0]) + '</span>' : '') + '</div>';
    h += '<div class="hand' + (cw + ov < cw * 0.8 ? ' tight' : '') + '" id="hand" style="--cw:' + cw + 'px;--ov:' + ov + 'px">' + hand.map((c) => {
      let cls = [];
      if (st.phase === 'discard' && m.sel.includes(c)) cls.push('sel');
      if (m.hint && m.hint.includes(c)) cls.push('hint');
      if (legal && H !== 'profi' && !legal.includes(c)) cls.push('dim');
      if (H === 'lern' && gt != null && E.isTrump(c, gt)) cls.push('trumpmark');
      return cardHTML(c, { button: true, cls: cls.join(' ') });
    }).join('') + '</div></div>';
    h += '</div>';
    screen(h);
    bindGame();
  }

  function statusText(st, m) {
    if (st.phase === 'bidding') {
      const b = st.bidding;
      const a = E.biddingActor(st);
      if (a === 0) {
        if (b.waiting === 'say') return 'Du sagst ' + NAMES[b.hearer] + ': Reizt du weiter?';
        if (b.waiting === 'hear') return NAMES[b.sayer] + ' sagt <b>' + b.bid + '</b>. Hältst du mit?';
        return 'Alle haben gepasst. Spielst du für 18?';
      }
      if (b.waiting === 'say') return NAMES[b.sayer] + ' sagt ' + (b.hearer === 0 ? 'dir' : NAMES[b.hearer]) + ' …';
      if (b.waiting === 'hear') return (b.hearer === 0 ? 'Du hörst' : NAMES[b.hearer] + ' hört') + ' …';
      return NAMES[st.vh] + ' überlegt …';
    }
    if (st.phase === 'eingepasst') return 'Alle haben gepasst – das Spiel ist eingepasst.';
    if (st.phase === 'skat') return st.declarer === 0 ? 'Du hast das Reizen gewonnen (' + st.bid + ').' : NAMES[st.declarer] + ' hat das Reizen gewonnen (' + st.bid + ') und überlegt …';
    if (st.phase === 'discard') return 'Wähle 2 Karten zum Drücken.';
    if (st.phase === 'declare') return 'Sag dein Spiel an.';
    if (st.phase === 'play') {
      if (m.hold && m.hold.trick) { const t = m.hold.trick; return (t.winner === 0 ? 'Dein Stich' : 'Stich an ' + NAMES[t.winner]) + ' · ' + t.pts + ' Augen'; }
      if (st.turn === 0) {
        if (!st.trick.length) return st.tricks.length ? 'Du spielst aus.' : 'Du bist Vorhand und spielst aus.';
        const le = E.effSuit(st.trick[0].c, st.game.gt);
        return 'Du bist dran' + ' – ' + (le === 4 ? 'Trumpf' : E.SUIT_NAMES[le]) + ' ist gefragt.';
      }
      return NAMES[st.turn] + (st.trick.length ? ' ist dran.' : ' spielt aus.');
    }
    if (st.phase === 'done') return 'Spiel beendet.';
    return '';
  }

  function panelHTML(st, m, H) {
    if (st.phase === 'bidding' && E.biddingActor(st) === 0) {
      const b = st.bidding;
      let btns = '';
      if (b.waiting === 'say') { const nb = E.nextBid(b.bid); btns = '<button class="btn" data-bid="say" data-v="' + nb + '">Sage ' + nb + '</button><button class="btn soft" data-bid="pass">Passe</button>'; }
      else if (b.waiting === 'hear') btns = '<button class="btn" data-bid="yes">Ja (' + b.bid + ')</button><button class="btn soft" data-bid="pass">Passe</button>';
      else btns = '<button class="btn" data-bid="play18">18 spielen</button><button class="btn soft" data-bid="pass">Passe</button>';
      const adv = m.guide ? '' : H === 'lern' || m.advice ? bidAdvice(st) : H === 'normal' ? '<button class="btn small soft" data-a="advice">Tipp anzeigen</button>' : '';
      const role = b.waiting === 'say' ? 'Du sagst' : b.waiting === 'hear' ? 'Du hörst' : 'Vorhand';
      return '<div class="panel">' + (m.guide ? '' : '<h3>Reizen · ' + role + '</h3>') + adv + '<div class="btns">' + btns + '</div></div>';
    }
    if (st.phase === 'eingepasst') return '<div class="panel"><h3>Eingepasst</h3><p>Niemand wollte spielen. Der nächste Spieler gibt neu.</p><button class="btn" data-a="next">Neu geben</button></div>';
    if (st.phase === 'skat' && st.declarer === 0) {
      if (m.guide) return '<div class="panel"><div class="btns"><button class="btn" data-a="take">Skat aufnehmen</button></div></div>';
      const adv = H === 'lern' || m.advice ? skatAdvice(st) : H === 'normal' ? '<button class="btn small soft" data-a="advice">Tipp anzeigen</button>' : '';
      return '<div class="panel"><h3>Du spielst! Reizwert ' + st.bid + '</h3><p>Nimmst du den Skat auf oder spielst du Hand?</p>' + adv + '<div class="btns"><button class="btn" data-a="take">Skat aufnehmen</button><button class="btn soft" data-a="hand">Hand spielen</button></div></div>';
    }
    if (st.phase === 'discard') {
      let adv = '';
      if (m.guide) adv = '';
      else if (m.recD) adv = '<div class="advice"><b>Empfehlung:</b> ' + E.GAME_NAMES[m.recD.gt] + ' spielen, ' + m.recD.discard.map(chip).join(' ') + ' drücken (Chance ca. ' + pct(m.recD.p) + ').</div>';
      else if (H !== 'profi') adv = '<button class="btn small soft" data-a="dtipp">Tipp anzeigen</button>';
      return '<div class="panel">' + (m.guide ? '' : '<h3>Drücken (' + m.sel.length + '/2)</h3><p class="note">Tippe zwei Karten an. Ihre Augen zählen für dich.</p>') + adv + '<button class="btn" data-a="discard"' + (m.sel.length !== 2 ? ' disabled' : '') + '>Diese 2 drücken</button></div>';
    }
    if (st.phase === 'declare') {
      const d = m.decl;
      const hand = !st.skatTaken;
      const opts = declOptsFor(st, d);
      const rec = H === 'profi' ? null : m.recD ? m.recD.gt : H === 'lern' ? gameAdvice(st).gt : null;
      let g = '<div class="gamegrid">' + opts.map((o) => {
        if (o.gt === E.GT_NULL && (d.sa || d.sw || d.ov)) return '';
        if (m.guide && o.gt >= 4) return '';
        const sel = d.gt === o.gt && !!d.nov === !!o.ov;
        return '<button class="gopt' + (o.low ? ' low' : '') + (sel ? ' sel' : '') + (rec === o.gt && !o.ov && H !== 'profi' ? ' rec' : '') + '" data-g="' + o.i + '"' + (o.blocked ? ' disabled' : '') + '><span class="gn"><span class="' + o.cls + '">' + o.s + '</span> ' + o.l + '</span><span class="gv">' + (m.guide ? 'Wert ' + o.v + (o.low ? ' – zu wenig, gereizt: ' + st.bid : '') : H === 'profi' ? '' : o.txt + (o.low ? ' · unter ' + st.bid : '')) + '</span></button>';
      }).join('') + '</div>';
      let tg = '';
      if (hand && d.gt !== E.GT_NULL && !m.guide) tg = '<div class="toggles"><button class="toggle' + (d.sa ? ' on' : '') + '" data-t="sa">Schneider angesagt</button><button class="toggle' + (d.sw ? ' on' : '') + '" data-t="sw">Schwarz angesagt</button><button class="toggle' + (d.ov ? ' on' : '') + '" data-t="ov">Ouvert</button></div>';
      const chosen = opts.find((o) => o.gt === d.gt && !!o.ov === !!d.nov);
      const warn = chosen && chosen.low ? '<div class="advice">Achtung: ' + chosen.l + ' ist nur ' + chosen.v + ' wert, gereizt sind ' + st.bid + '. Damit wärst du überreizt und verlierst.</div>' : '';
      const tip = H === 'normal' && rec == null ? '<button class="btn small soft" data-a="gtipp">Tipp anzeigen</button>' : '';
      const note = hand && !m.guide ? '<p class="note">Beim Handspiel kennst du den Skat nicht. Die Werte rechnen nur mit deinen Karten – der Skat zählt am Ende bei den Spitzen mit.</p>' : '';
      return '<div class="panel">' + (m.guide ? '' : '<h3>Spiel ansagen' + (hand ? ' (Hand)' : '') + '</h3>') + note + g + tg + tip + warn + '<button class="btn" data-a="declare"' + (chosen ? '' : ' disabled') + '>' + (chosen ? (chosen.low ? 'Trotzdem ' : '') + 'Ansagen: ' + chosen.l + ' (' + chosen.v + ')' : 'Spiel wählen') + '</button></div>';
    }
    return '';
  }

  function illegalReason(st, c) {
    const gt = st.game.gt;
    const le = E.effSuit(st.trick[0].c, gt);
    if (le === 4) return 'Trumpf ist ausgespielt – du musst Trumpf bedienen' + (gt !== E.GT_NULL ? ' (auch Buben sind Trumpf).' : '.');
    let s = 'Du musst ' + E.SUIT_NAMES[le] + ' bedienen.';
    if (E.rankOf(c) === 7 && E.suitOf(c) === le && gt !== E.GT_NULL) s += ' ' + chip(c) + ' ist Trumpf und zählt nicht als ' + E.SUIT_NAMES[le] + '.';
    return s;
  }

  function bindGame() {
    const { st, m } = GM;
    const root = $('#table');
    root.onclick = (ev) => {
      const t = ev.target;
      if (t.closest('.term')) return;
      const cardBtn = t.closest('#hand .card');
      if (cardBtn) return onHandCard(Number(cardBtn.dataset.c), cardBtn);
      const b = t.closest('button');
      if (!b) { if (m.hold && m.hold.trick && t.closest('#center') && !m.guide) releaseTrick(); return; }
      if (b.dataset.bid) {
        const k = b.dataset.bid;
        if (k === 'say') humanBid({ type: 'say', value: Number(b.dataset.v) });
        else humanBid({ type: k });
        return;
      }
      const a = b.dataset.a;
      if (a === 'advice') { m.advice = true; m.hints++; renderGame(); }
      if (a === 'next') { closeSheet(); nextGame(); gameStep(); }
      if (a === 'gnext') { m.guide.i++; gameStep(); }
      if (a === 'gtrick') releaseTrick();
      if (a === 'result') showResult();
      if (a === 'take') { E.takeSkat(st); m.sel = []; m.recD = null; m.msg = 'Im Skat lagen ' + st.skat.map(chip).join(' ') + '.'; gameStep(); }
      if (a === 'hand') { E.playHand(st); m.recD = null; m.decl = { gt: null, sa: false, sw: false, ov: false }; m.msg = ''; gameStep(); }
      if (a === 'dtipp') { m.recD = discardAdvice(st); m.hint = m.recD.discard.slice(); m.hints++; renderGame(); }
      if (a === 'gtipp') { m.recD = { gt: gameAdvice(st).gt }; m.hints++; renderGame(); }
      if (a === 'discard' && m.sel.length === 2) {
        E.doDiscard(st, m.sel.slice());
        m.sel = []; m.hint = null; m.msg = '';
        m.decl = { gt: m.recD ? m.recD.gt : null, sa: false, sw: false, ov: false };
        gameStep();
      }
      if (a === 'declare') {
        const d = m.decl;
        const opt = GAME_OPTS.find((o) => o.gt === d.gt && !!o.ov === !!d.nov);
        if (!opt) return;
        const hand = !st.skatTaken;
        const game = opt.gt === E.GT_NULL ? { gt: 5, hand, ouvert: !!opt.ov } : { gt: opt.gt, hand, schneiderAng: d.sa, schwarzAng: d.sw, ouvert: d.ov };
        const err = E.canDeclare(st, game);
        if (err) return toast(err);
        E.declare(st, game);
        m.msg = 'Du spielst <b>' + E.gameLabel(st.game) + '</b>.';
        m.bubbles = ['', '', ''];
        m.sortGt = null;
        gameStep();
      }
      if (b.dataset.g != null) {
        const o = GAME_OPTS[Number(b.dataset.g)];
        m.decl.gt = o.gt; m.decl.nov = !!o.ov;
        if (o.gt === E.GT_NULL) { m.decl.sa = m.decl.sw = m.decl.ov = false; }
        m.sortGt = o.gt;
        renderGame();
      }
      if (b.dataset.t) {
        const k = b.dataset.t;
        m.decl[k] = !m.decl[k];
        if (k === 'sw' && m.decl.sw) m.decl.sa = true;
        if (k === 'ov' && m.decl.ov) { m.decl.sa = true; m.decl.sw = true; }
        if (k === 'sa' && !m.decl.sa) { m.decl.sw = false; m.decl.ov = false; }
        if (k === 'sw' && !m.decl.sw) m.decl.ov = false;
        renderGame();
      }
      if (a === 'tipp') {
        const r = A.choose(st, 0);
        m.hint = [r.card]; m.hints++;
        m.msg = '<span class="coach"><b>Tipp:</b> ' + rich(r.reason) + '</span>';
        renderGame();
      }
      if (a === 'last') {
        const t = st.tricks[st.tricks.length - 1];
        openSheet('<div class="eyebrow">Letzter Stich</div><div class="lasttrick">' + t.cards.map((x) => '<span style="display:flex;flex-direction:column;align-items:center;gap:4px">' + cardHTML(x.c) + '<span class="note">' + NAMES[x.p] + '</span></span>').join('') + '</div><p style="text-align:center">' + (t.winner === 0 ? 'Dein Stich' : 'Stich an ' + NAMES[t.winner]) + (help() === 'lern' ? ' · ' + t.pts + ' Augen' : '') + '</p><button class="btn" data-x="1">Schließen</button>', (ev) => { if (ev.target.closest('button') || ev.target === $('#sheet')) closeSheet(); });
      }
    };
  }
  function onHandCard(c, el) {
    const { st, m } = GM;
    if (m.guide && m.guide.i < guideIntro(st, m.guide.n).length) return toast('Lies erst die Erklärung und tippe auf „Weiter“.');
    if (st.phase === 'discard' && st.declarer === 0) {
      if (m.sel.includes(c)) m.sel = m.sel.filter((x) => x !== c);
      else if (m.sel.length < 2) m.sel.push(c);
      else toast('Du hast schon 2 Karten gewählt. Tippe eine an, um sie abzuwählen.');
      return renderGame();
    }
    if (st.phase === 'play' && st.turn === 0 && !m.hold) {
      const legal = E.legalFor(st, 0);
      if (!legal.includes(c)) {
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
        return toast(illegalReason(st, c));
      }
      doPlay(0, c);
      return;
    }
    if (st.phase === 'bidding' || st.phase === 'skat') {
      // Sortierung umschalten zum Bewerten
      m.sortGt = m.sortGt == null ? 4 : m.sortGt === 4 ? 5 : m.sortGt === 5 ? null : null;
      toast(m.sortGt === 4 ? 'Sortierung: Grand (Buben vorn)' : m.sortGt === 5 ? 'Sortierung: Null' : 'Sortierung: Farbspiel', 1200);
      renderGame();
    }
  }

  // ================= Liste =================
  function viewList() {
    let h = '<div class="page"><a class="back" href="#spielen">← Zum Tisch</a><div class="brand"><h1>Liste</h1><span class="eyebrow">Spielwerte · Seeger-Fabian</span></div>';
    if (!P.list.length) { h += '<p>Noch keine Spiele. Die Liste füllt sich wie ein Skatblock nach jedem Spiel.</p></div>'; return screen(h); }
    const tot = [0, 0, 0], sf = [0, 0, 0];
    let rows = '';
    P.list.forEach((g, i) => {
      tot[g.decl] += g.score;
      for (let p = 0; p < 3; p++) sf[p] += g.sf[p];
      rows += '<tr><td>' + (i + 1) + '</td><td>' + esc(NAMES[g.decl] + ': ' + g.label) + '</td>' + [0, 1, 2].map((p) => '<td class="' + (p === g.decl && g.score < 0 ? 'neg' : '') + '">' + (p === g.decl ? (g.score > 0 ? '+' : '') + g.score : '') + '</td>').join('') + '</tr>';
    });
    h += '<div class="block scroll-x"><table class="liste"><thead><tr><th>Nr</th><th>Spiel</th><th>Du</th><th>Lena</th><th>Tom</th></tr></thead><tbody>' + rows + '<tr class="sum"><td></td><td>Summe Spielwerte</td>' + tot.map((x) => '<td class="' + (x < 0 ? 'neg' : '') + '">' + x + '</td>').join('') + '</tr><tr class="sum"><td></td><td>Seeger-Fabian</td>' + sf.map((x) => '<td class="' + (x < 0 ? 'neg' : '') + '">' + x + '</td>').join('') + '</tr></tbody></table></div>';
    h += '<p class="note">Seeger-Fabian: gewonnenes Spiel Wert + 50, verlorenes −2 × Wert − 50. Verliert der Alleinspieler, bekommen beide Gegenspieler je 40.</p>';
    h += '<button class="btn soft" id="clearlist">Liste leeren</button></div>';
    screen(h);
    $('#clearlist').onclick = () => {
      openSheet('<h2>Liste leeren?</h2><p>Die Spiele bleiben in deinem Fortschritt gezählt, nur die Liste beginnt neu.</p><div class="btns"><button class="btn soft" data-x="no">Abbrechen</button><button class="btn" data-x="yes">Leeren</button></div>', (ev) => {
        const b = ev.target.closest('button'); if (!b) return;
        if (b.dataset.x === 'yes') { P.list = []; save(); }
        closeSheet(); viewList();
      });
    };
  }

  // ================= Fortschritt =================
  // Kalenderdatei mit täglichem Termin für die restlichen Plantage (Ortszeit, mit Hinweis zum Termin)
  function icsHref(hhmm) {
    const [hh, mm] = hhmm.split(':').map(Number);
    const d = new Date(), p2 = (n) => String(n).padStart(2, '0');
    const stamp = d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + 'T' + p2(hh) + p2(mm) + '00';
    const cur = curDay();
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Skat lernen//DE', 'BEGIN:VEVENT', 'UID:skat-lernen-' + stamp + '@skat-lernen', 'DTSTAMP:' + stamp, 'DTSTART:' + stamp, 'DURATION:PT20M',
      'RRULE:FREQ=DAILY;COUNT=' + (cur ? 31 - cur.n : 30), 'SUMMARY:Skat lernen – Tageseinheit', 'DESCRIPTION:15 bis 25 Minuten. Deine Serie wartet.',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Skat lernen', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  }
  function viewProgress() {
    const li = levelInfo();
    let h = '<div class="page"><div class="brand"><h1>Fortschritt</h1>' + hud() + '</div>';
    // Serie und Kalender der letzten fünf Wochen
    const t = today(), s = streakNow(), mon = t - PL.weekday(t);
    h += '<section class="streakcard"><div class="sc-top"><div class="sc-n' + (P.streak.last === t ? ' lit' : '') + '">' + ICON.flame + '<b>' + s + '</b></div><div><h2>' + (s === 1 ? '1 Tag' : s + ' Tage') + ' in Folge</h2><p>' + (P.streak.last === t ? 'Heute schon gelernt.' : s ? 'Lerne heute, damit deine Serie hält.' : 'Eine Einheit heute startet deine Serie.') + ' Längste Serie: ' + P.streak.best + '. Joker: ' + P.streak.freeze + ' – er rettet die Serie, wenn du einen Tag verpasst.</p></div></div>';
    h += '<div class="cal"><span class="ch">Mo</span><span class="ch">Di</span><span class="ch">Mi</span><span class="ch">Do</span><span class="ch">Fr</span><span class="ch">Sa</span><span class="ch">So</span>';
    for (let d = mon - 28; d < mon + 7; d++) h += '<span class="cd' + (P.days[d] ? ' on' : P.streak.bridged === d ? ' joker' : '') + (d === t ? ' now' : '') + (d > t ? ' future' : '') + '" title="' + (P.days[d] ? P.days[d] + ' XP' : '') + '"></span>';
    h += '</div>';
    const wk = [0, 1, 2, 3, 4, 5, 6].map((i) => P.days[t - 6 + i] || 0), mx = Math.max(30, ...wk);
    h += '<div class="xpbars" aria-label="XP der letzten 7 Tage">' + wk.map((v, i) => '<span><em>' + (v || '') + '</em><i style="height:' + Math.round(v / mx * 100) + '%"></i><small>' + ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][PL.weekday(t - 6 + i)] + '</small></span>').join('') + '</div><p class="note">XP der letzten 7 Tage · insgesamt ' + P.xp + ' XP</p></section>';
    const cur = curDay();
    h += '<section class="block"><div class="block-h"><h3>30-Tage-Plan</h3><span class="eyebrow">' + (cur ? 'Tag ' + cur.n + ' von 30' : 'geschafft') + '</span></div><div class="planbar"><div class="pb"><i style="width:' + Math.round(((cur ? cur.n - 1 : 30) / 30) * 100) + '%"></i></div><span>' + paceText() + '</span></div></section>';
    h += '<section class="block"><div class="block-h"><h3>Erfolge</h3><span class="eyebrow">' + ACH.filter((a) => P.ach[a.id]).length + '/' + ACH.length + '</span></div><div class="achs">' + ACH.map((a) => '<div class="ach' + (P.ach[a.id] ? ' on' : '') + '"><span class="ai">' + (P.ach[a.id] ? ICON.trophy : ICON.lock) + '</span><b>' + a.t + '</b><small>' + a.d + '</small></div>').join('') + '</div></section>';
    h += levelCard();
    for (let n = 2; n <= 5; n++) {
      const reqs = REQ[n]();
      const done = n <= li.level;
      h += '<section class="block"><div class="block-h"><h3>Stufe ' + n + ' · ' + LEVELS[n - 1].name + '</h3><span class="eyebrow">' + (done ? 'erreicht' : reqs.filter((r) => r.ok).length + '/' + reqs.length) + '</span></div>';
      h += reqs.map((r) => '<a class="req' + (r.ok ? ' ok' : '') + '" href="' + (r.href || '#fortschritt') + '" style="text-decoration:none"><span class="ck">' + (r.ok ? '✓' : '') + '</span><span>' + esc(r.t) + '</span><span class="pv">' + esc(r.pv) + '</span></a>').join('');
      h += '</section>';
    }
    const g = P.games;
    const dg = g.filter((x) => x.decl);
    const sfTot = g.reduce((a, x) => a + (x.sf || 0), 0);
    h += '<div class="stats"><div class="stat"><div class="v">' + g.length + '</div><div class="l">Spiele</div></div><div class="stat"><div class="v">' + (dg.length ? Math.round(dg.filter((x) => x.won).length / dg.length * 100) + '%' : '–') + '</div><div class="l">als Alleinspieler gewonnen</div></div><div class="stat"><div class="v">' + sfTot + '</div><div class="l">Seeger-Fabian gesamt</div></div></div>';
    h += '<section class="block"><div class="block-h"><h3>Einstellungen</h3></div>';
    h += '<div class="setting"><b>Hilfen im Spiel</b><div class="seg" id="seg-help">' + [['lern', 'Lernen'], ['normal', 'Normal'], ['profi', 'Profi']].map(([k, l]) => '<button data-k="' + k + '" class="' + (P.settings.help === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div><div class="d">' + ({ lern: 'Erlaubte Karten markiert, Augen und Trümpfe werden angezeigt, Empfehlungen beim Reizen, Coach.', normal: 'Tipps auf Knopfdruck, Coach, Mitzähl-Probe im Spiel. Keine Augenanzeige.', profi: 'Keine Tipps, keine Markierungen. Der Coach meldet sich erst in der Abrechnung. Zählt für Stufe 5.' }[P.settings.help]) + ' Gilt ab dem nächsten Spiel.</div></div>';
    h += '<div class="setting"><b>Kartenblatt</b><div class="seg" id="seg-deck" style="grid-template-columns:1fr 1fr">' + [['de', 'Deutsch'], ['fr', 'Französisch']].map(([k, l]) => '<button data-k="' + k + '" class="' + (P.settings.deck === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div><div class="d">' + (P.settings.deck === 'de' ? 'Eichel, Grün, Rot, Schellen · Ober und Unter' : 'Kreuz, Pik, Herz, Karo · Dame und Bube (Turnierbild)') + '</div><div class="crow" style="--cw:40px">' + [31, 23, 15, 7, 30].map((c) => cardHTML(c)).join('') + '</div></div>';
    h += '<div class="setting"><b>Tägliche Erinnerung</b><div class="d">Trägt für die restlichen Tage des Plans einen täglichen Termin mit Hinweis in deinen Kalender ein.</div><div class="remind"><input type="time" id="rtime" value="' + esc(P.settings.remind || '19:00') + '" aria-label="Uhrzeit der Erinnerung"><a class="btn small" id="rlink" download="skat-lernen.ics" href="' + icsHref(P.settings.remind || '19:00') + '">In den Kalender eintragen</a></div></div>';
    h += '<div class="setting"><b>Töne</b><div class="seg" id="seg-sound" style="grid-template-columns:1fr 1fr">' + [['1', 'An'], ['', 'Aus']].map(([k, l]) => '<button data-k="' + k + '" class="' + (!!P.settings.sound === !!k ? 'on' : '') + '">' + l + '</button>').join('') + '</div><div class="d">Kurze Töne bei richtigen und falschen Antworten.</div></div>';
    h += '<div class="setting"><b>Spieltempo</b><div class="seg" id="seg-tempo">' + [['langsam', 'Langsam'], ['normal', 'Normal'], ['schnell', 'Schnell']].map(([k, l]) => '<button data-k="' + k + '" class="' + (P.settings.tempo === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div></div>';
    h += '<div class="setting"><b>Daten</b><div class="d">Mitzähl-Proben: ' + P.countChecks.ok + ' von ' + P.countChecks.total + ' richtig · Lektionen: ' + C.LESSONS.filter((l) => lessonDone(l.id)).length + '/' + C.LESSONS.length + '</div><button class="btn soft small" id="reset" style="align-self:flex-start">Fortschritt zurücksetzen</button></div></section>';
    h += '<p class="note" style="text-align:center">Skat-Regeln nach der Internationalen Skatordnung (ISkO). Gegner und Gewinnchancen beruhen auf einer regelbasierten Strategie und simulierten Spielen.</p></div>';
    screen(h);
    document.querySelectorAll('#seg-help button').forEach((b) => (b.onclick = () => { P.settings.help = b.dataset.k; save(); viewProgress(); }));
    $('#rtime').onchange = (ev) => { if (!/^\d\d:\d\d$/.test(ev.target.value)) return; P.settings.remind = ev.target.value; save(); $('#rlink').href = icsHref(P.settings.remind); };
    document.querySelectorAll('#seg-sound button').forEach((b) => (b.onclick = () => { P.settings.sound = !!b.dataset.k; save(); if (P.settings.sound) beep('ok'); viewProgress(); }));
    document.querySelectorAll('#seg-tempo button').forEach((b) => (b.onclick = () => { P.settings.tempo = b.dataset.k; save(); viewProgress(); }));
    document.querySelectorAll('#seg-deck button').forEach((b) => (b.onclick = () => { P.settings.deck = b.dataset.k; save(); applyDeck(); viewProgress(); }));
    $('#reset').onclick = () => {
      openSheet('<h2>Alles zurücksetzen?</h2><p>Lektionen, Übungen, Spiele, Serie, XP und der 30-Tage-Plan werden gelöscht. Das lässt sich nicht rückgängig machen.</p><div class="btns"><button class="btn soft" data-x="no">Abbrechen</button><button class="btn" data-x="yes" style="background:var(--bad)">Zurücksetzen</button></div>', (ev) => {
        const b = ev.target.closest('button'); if (!b) return;
        if (b.dataset.x === 'yes') { const s = P.settings; P = defaults(); P.settings = s; save(); GM = GMN = GMG = null; lsDel(LS_G); lsDel(LS_GG); }
        closeSheet(); viewProgress();
      });
    };
  }

  // ================= Start =================
  function start() {
    document.body.insertAdjacentHTML('afterbegin', SPRITE);
    applyDeck();
    document.querySelectorAll('.tabbar a').forEach((a) => { a.insertAdjacentHTML('afterbegin', ICON[a.dataset.tab]); });
    window.addEventListener('hashchange', route);
    document.addEventListener('click', (ev) => { const t = ev.target.closest && ev.target.closest('.term'); if (t) { ev.stopPropagation(); ev.preventDefault(); showTerm(t.dataset.term); } }, true);
    document.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList && ev.target.classList.contains('term')) { ev.preventDefault(); showTerm(ev.target.dataset.term); } });
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (onTable() && GM) renderGame(); }, 150); });
    checkAch();
    route();
    Cloud.init();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

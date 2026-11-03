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
  const defaults = () => ({ v: 1, updatedAt: 0, lessons: {}, drills: {}, tactics: {}, games: [], list: [], guides: {}, countChecks: { ok: 0, total: 0 }, settings: { help: 'lern', tempo: 'normal', deck: 'de' }, dealer: null });
  let P = normalize(lsGet(LS_P));
  function normalize(x) {
    const d = defaults();
    if (!x || typeof x !== 'object') return d;
    const o = Object.assign(d, x);
    o.settings = Object.assign(defaults().settings, x.settings || {});
    o.countChecks = Object.assign({ ok: 0, total: 0 }, x.countChecks || {});
    o.guides = Object.assign({}, x.guides || {});
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
  const reqDrill = (id) => ({ t: 'Übung „' + dTitle(id) + '“ mit 80\u00a0%', ok: drillBest(id) >= 80, pv: drillBest(id) ? drillBest(id) + '\u00a0%' : '–', href: '#uebung-' + id, label: 'Übung „' + dTitle(id) + '“' });
  function reqTactics(maxStage, need) {
    const ts = C.TACTICS.filter((t) => t.stage <= maxStage);
    const n = ts.filter((t) => P.tactics[t.id]).length;
    return { t: 'Taktik-Aufgaben gelöst', ok: n >= need, pv: n + '/' + need, href: '#taktik', label: 'Taktik-Aufgaben' };
  }
  const GUIDES = [
    { n: 1, stage: 1, t: 'Dein erstes Spiel', d: 'Karten, Stiche, Trumpf – jeder Zug wird erklärt' },
    { n: 2, stage: 1, t: 'Zu zweit gegen einen', d: 'Als Partnerin von Lena: gemeinsam gegen Tom' },
    { n: 3, stage: 2, after: true, t: 'Reizen und Skat', d: 'Abschluss von Stufe 2: ein ganzes Spiel, vom Reizen bis zur Abrechnung' },
  ];
  const guideDone = (n) => !!(P.guides[n] && P.guides[n].done);
  const reqGuide = (n) => { const g = GUIDES[n - 1]; return { t: 'Geführtes Spiel „' + g.t + '“', ok: guideDone(n), pv: guideDone(n) ? '✓' : '–', href: '#gefuehrt-' + n, label: 'Geführtes Spiel „' + g.t + '“' }; };
  const reqGames = (n) => ({ t: n + ' Übungsspiele gespielt', ok: P.games.length >= n, pv: Math.min(P.games.length, n) + '/' + n, href: '#spielen', label: 'Übungsspiel' });
  function reqProfi(n) {
    const k = P.games.filter((g) => g.mode === 'profi').length;
    return { t: n + ' Spiele im Profi-Modus (ohne Hilfen)', ok: k >= n, pv: Math.min(k, n) + '/' + n, href: '#spielen', label: 'Spiel im Profi-Modus', profi: true };
  }
  const reqCount = (n) => ({ t: n + ' Mitzähl-Proben im Spiel richtig', ok: P.countChecks.ok >= n, pv: Math.min(P.countChecks.ok, n) + '/' + n, href: '#spielen', label: 'Spiel mit Mitzähl-Probe', profi: true });
  function reqDecl() {
    const g = P.games.slice(-40).filter((x) => x.decl);
    const w = g.filter((x) => x.won).length;
    const rate = g.length ? w / g.length : 0;
    return { t: 'Als Alleinspieler ≥ 65\u00a0% gewonnen (mind. 8 Spiele, letzte 40)', ok: g.length >= 8 && rate >= 0.65, pv: g.length ? Math.round(rate * 100) + '\u00a0% von ' + g.length : '–', href: '#spielen', label: 'Übungsspiel' };
  }
  function reqCoach() {
    const g = P.games.filter((x) => x.mode === 'profi').slice(-10);
    const avg = g.length ? g.reduce((a, x) => a + x.coach, 0) / g.length : 9;
    return { t: 'Höchstens 0,5 Patzer pro Spiel (letzte 10 Profi-Spiele)', ok: g.length >= 10 && avg <= 0.5, pv: g.length ? avg.toFixed(1).replace('.', ',') + ' (' + g.length + ')' : '–', href: '#spielen', label: 'Spiel im Profi-Modus', profi: true };
  }
  const REQ = {
    2: () => [reqGuide(1), reqGuide(2), reqLessons(1), reqDrill('augen'), reqDrill('trumpf'), reqDrill('bedienen'), reqDrill('stich')],
    3: () => [reqLessons(2), reqGuide(3), reqDrill('spitzen'), reqDrill('spielwert'), reqDrill('reizwerte'), reqGames(3)],
    4: () => [reqLessons(3), reqDrill('reizen'), reqDrill('druecken'), reqDrill('schmieren'), reqTactics(3, 9), reqGames(10)],
    5: () => [reqLessons(4), reqDrill('mitzaehlen'), reqDrill('truempfe'), reqTactics(4, 13), reqProfi(15), reqCount(5), reqDecl(), reqCoach()],
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
    return '<a class="levelcard" href="#fortschritt" style="text-decoration:none"><div class="lv"><div class="num">' + li.level + '</div><div><div class="eyebrow" style="color:inherit;opacity:.75">Stufe ' + li.level + ' von 5</div><h2>' + L.name + '</h2></div></div><div class="ladder">' + lad + '</div><div class="sub">' + sub + '</div></a>';
  }
  function nextUp() {
    const li = levelInfo();
    if (!li.next) return { href: '#spielen', t: 'Weiterspielen', d: 'Halte dein Niveau im Profi-Modus.' };
    const r = li.next.reqs.find((x) => !x.ok);
    return { href: r.href, t: r.label, d: r.t };
  }

  // ================= Router =================
  let view = '';
  function route() {
    const h = (location.hash || '#lernen').slice(1);
    const i = h.indexOf('-');
    const name = i < 0 ? h : h.slice(0, i);
    const arg = i < 0 ? '' : h.slice(i + 1);
    clearTimeout(gameTimer);
    closeSheet();
    view = name;
    const tabOf = { lernen: 'lernen', lektion: 'lernen', gefuehrt: 'lernen', ueben: 'ueben', uebung: 'ueben', taktik: 'ueben', spielen: 'spielen', liste: 'spielen', fortschritt: 'fortschritt' };
    document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tabOf[name]));
    const table = name === 'spielen' || name === 'gefuehrt';
    $('#app').classList.toggle('fullscreen', table);
    document.body.classList.toggle('felt', table);
    const scr = $('#screen');
    scr.scrollTop = 0;
    if (name === 'lektion' && C.LESSONS.some((l) => l.id === arg)) return viewLesson(arg);
    if (name === 'uebung' && D.DRILLS[arg]) return viewDrill(arg);
    if (name === 'taktik') return viewDrill('taktik');
    if (name === 'ueben') return viewDrills();
    if (name === 'spielen') return viewGame();
    if (name === 'gefuehrt' && GUIDES[Number(arg) - 1]) return viewGuide(Number(arg));
    if (name === 'liste') return viewList();
    if (name === 'fortschritt') return viewProgress();
    view = 'lernen';
    return viewLearn();
  }
  const screen = (html) => { $('#screen').innerHTML = html; };

  // ================= Lernpfad =================
  function viewLearn() {
    const nu = nextUp();
    let h = '<div class="page"><div class="brand"><h1>Skat lernen</h1><span class="eyebrow">Regeln nach ISkO</span></div>';
    if (!guideDone(1)) {
      h += '<a class="startcard" href="#gefuehrt-1"><div class="eyebrow">Neu beim Skat?</div><div class="t">Spiel dein erstes Spiel</div><p>Du brauchst kein Vorwissen. Die App spielt mit dir und erklärt bei jedem Zug, was du darfst und warum.</p><span class="btn brass">Erstes Spiel starten</span></a>';
    }
    h += levelCard();
    if (guideDone(1)) h += '<a class="nextup" href="' + nu.href + '"><div><div class="eyebrow">Als Nächstes</div><div class="t">' + esc(nu.t) + '</div><div class="d">' + esc(nu.d) + '</div></div><span class="btn small">Los</span></a>';
    const lv = levelInfo().level;
    for (const L of LEVELS.slice(0, 4)) {
      const ls = C.LESSONS.filter((l) => l.stage === L.n);
      const done = ls.filter((l) => lessonDone(l.id)).length;
      h += '<section class="block' + (L.n > lv ? ' later' : '') + '"><div class="block-h"><h3>Stufe ' + L.n + ' · ' + L.short + '</h3><span class="eyebrow">' + done + '/' + ls.length + '</span></div>' + (L.n > lv ? '<p class="later-note">Kommt später – baut auf Stufe ' + (L.n - 1) + ' auf.</p>' : '');
      const guideRow = (g) => '<a class="row" href="#gefuehrt-' + g.n + '"><span class="mark' + (guideDone(g.n) ? ' done' : '') + '">' + (guideDone(g.n) ? '✓' : '') + '</span><span><span class="t">Geführtes Spiel: ' + g.t + '</span><br><span class="d">' + g.d + '</span></span><span class="score">' + ICON.spielen + '</span></a>';
      for (const g of GUIDES.filter((x) => x.stage === L.n && !x.after)) h += guideRow(g);
      ls.forEach((l, k) => {
        const st = P.lessons[l.id];
        const dr = l.drill ? drillBest(l.drill) : null;
        h += '<a class="row" href="#lektion-' + l.id + '"><span class="mark' + (st && st.done ? ' done' : '') + '">' + (st && st.done ? '✓' : '') + '</span><span><span class="t">' + esc(T(l.title)) + '</span><br><span class="d">' + l.min + ' Min.' + (l.drill ? ' · Übung: ' + dTitle(l.drill) : '') + '</span></span><span class="score' + (dr >= 80 ? ' good' : '') + '">' + (l.drill ? (dr ? dr + '\u00a0%' : '–') : (st && st.done ? st.quiz + '/' + l.quiz.length : '')) + '</span></a>';
      });
      for (const g of GUIDES.filter((x) => x.stage === L.n && x.after)) h += guideRow(g);
      h += '</section>';
    }
    const r5 = REQ[5]();
    h += '<section class="block"><div class="block-h"><h3>Stufe 5 · ' + LEVELS[4].short + '</h3><span class="eyebrow">' + r5.filter((r) => r.ok).length + '/' + r5.length + '</span></div><div class="row" style="cursor:default"><span class="mark"></span><span><span class="t">Prüfung am Tisch</span><br><span class="d">Spiele ohne Hilfen, zähle mit, mach kaum Fehler. Die Ziele stehen unter Fortschritt.</span></span><span></span></div>';
    h += '<a class="row" href="#spielen"><span class="mark"></span><span><span class="t">Übungsspiel</span><br><span class="d">Gegen Lena und Tom, mit Tipps und Coach</span></span><span class="score">' + P.games.length + '</span></a></section>';
    h += '<p class="note" style="text-align:center">Dein Fortschritt wird auf diesem Gerät gespeichert.</p></div>';
    screen(h);
  }

  // ================= Lektion =================
  let LS = null;
  function viewLesson(id) {
    const l = C.LESSONS.find((x) => x.id === id);
    if (!LS || LS.id !== id) LS = { id, page: 0, q: -1, answers: [] };
    renderLesson(l);
  }
  function renderLesson(l) {
    const idx = C.LESSONS.indexOf(l);
    let h = '<div class="page lesson"><a class="back" href="#lernen">← Lernpfad</a><div><div class="eyebrow">Stufe ' + l.stage + ' · Lektion ' + (C.LESSONS.filter((x) => x.stage === l.stage).indexOf(l) + 1) + '</div><h1>' + esc(T(l.title)) + '</h1></div>';
    const total = l.pages.length + l.quiz.length;
    const at = LS.q < 0 ? LS.page + 1 : l.pages.length + LS.q + 1;
    h += '<div class="steps">' + Array.from({ length: total }, (_, i) => '<span class="' + (i < at ? 'on' : '') + '"></span>').join('') + '</div>';
    for (let i = 0; i <= Math.min(LS.page, l.pages.length - 1); i++) h += '<div class="lpage' + (i === LS.page && LS.q < 0 && i > 0 ? ' new' : '') + '">' + rich(l.pages[i]) + '</div>';
    if (LS.q < 0) {
      h += LS.page < l.pages.length - 1 ? '<button class="btn" id="lnext">Weiter</button>' : '<button class="btn brass" id="lquiz">Kurzes Quiz (' + l.quiz.length + ' Fragen)</button>';
    } else if (LS.q < l.quiz.length) {
      const q = l.quiz[LS.q];
      const ans = LS.answers[LS.q];
      h += '<div class="qcard" id="qcard"><div class="eyebrow">Frage ' + (LS.q + 1) + ' von ' + l.quiz.length + '</div><div class="qtext">' + rich(q.q) + '</div><div class="opts">';
      q.o.forEach((o, i) => {
        let cls = 'opt';
        if (ans != null) { if (i === q.a) cls += ' right'; else if (i === ans) cls += ' wrong'; }
        h += '<button class="' + cls + '" data-i="' + i + '"' + (ans != null ? ' disabled' : '') + '>' + rich(o, { terms: false }) + '</button>';
      });
      h += '</div>';
      if (ans != null) h += '<div class="feedback ' + (ans === q.a ? 'ok' : 'no') + '"><b class="h">' + (ans === q.a ? 'Richtig.' : 'Nicht ganz.') + '</b>' + rich(q.why) + '</div><button class="btn" id="qnext">' + (LS.q < l.quiz.length - 1 ? 'Nächste Frage' : 'Auswerten') + '</button>';
      h += '</div>';
    } else {
      const ok = LS.answers.filter((a, i) => a === l.quiz[i].a).length;
      const next = C.LESSONS[idx + 1];
      h += '<div class="qcard"><div class="eyebrow">Lektion abgeschlossen</div><div class="result-big">' + ok + ' / ' + l.quiz.length + '</div><p>' + (ok === l.quiz.length ? 'Alles richtig.' : 'Lies die markierten Stellen bei Gelegenheit noch einmal.') + '</p><div class="btns">';
      if (l.drill) h += '<a class="btn brass" href="#uebung-' + l.drill + '">Üben: ' + dTitle(l.drill) + '</a>';
      if (next) h += '<a class="btn' + (l.drill ? ' ghost' : '') + '" href="#lektion-' + next.id + '">Nächste Lektion</a>';
      h += '<a class="btn soft" href="#lernen">Zum Lernpfad</a></div></div>';
    }
    h += '</div>';
    screen(h);
    const scr = $('#screen');
    const b1 = $('#lnext'); if (b1) b1.onclick = () => { LS.page++; renderLesson(l); scr.scrollTop = scr.scrollHeight; };
    const b2 = $('#lquiz'); if (b2) b2.onclick = () => { LS.q = 0; renderLesson(l); scr.scrollTop = scr.scrollHeight; };
    const qc = $('#qcard');
    if (qc) qc.querySelectorAll('.opt').forEach((b) => (b.onclick = () => { LS.answers[LS.q] = Number(b.dataset.i); renderLesson(l); scr.scrollTop = scr.scrollHeight; }));
    const b3 = $('#qnext'); if (b3) b3.onclick = () => {
      LS.q++;
      if (LS.q >= l.quiz.length) {
        const ok = LS.answers.filter((a, i) => a === l.quiz[i].a).length;
        const prev = P.lessons[l.id];
        P.lessons[l.id] = { done: true, quiz: Math.max(ok, prev ? prev.quiz || 0 : 0) };
        save();
      }
      renderLesson(l);
      scr.scrollTop = scr.scrollHeight;
    };
  }

  // ================= Übungen =================
  function viewDrills() {
    const lv = levelInfo().level;
    let h = '<div class="page"><div class="brand"><h1>Üben</h1><span class="eyebrow">je 10 Aufgaben</span></div>';
    h += '<p class="note">Jede Übung erzeugt neue Aufgaben. Ab 80 % gilt sie als gemeistert.</p>';
    for (const L of LEVELS.slice(0, 4)) {
      const ids = D.ORDER.filter((id) => D.DRILLS[id].stage === L.n);
      if (!ids.length) continue;
      h += '<section class="block' + (L.n > lv ? ' later' : '') + '"><div class="block-h"><h3>Stufe ' + L.n + ' · ' + L.short + '</h3></div>' + (L.n > lv ? '<p class="later-note">Kommt später – passt, wenn du Stufe ' + L.n + ' erreicht hast.</p>' : '');
      for (const id of ids) {
        const d = D.DRILLS[id], b = drillBest(id);
        h += '<a class="row" href="#uebung-' + id + '"><span class="mark' + (b >= 80 ? ' done' : b ? ' part' : '') + '">' + (b >= 80 ? '✓' : '') + '</span><span><span class="t">' + d.title + '</span><br><span class="d">' + d.desc + '</span></span><span class="score' + (b >= 80 ? ' good' : '') + '">' + (b ? b + '\u00a0%' : '–') + '</span></a>';
      }
      if (L.n === 3) {
        const n = C.TACTICS.filter((t) => P.tactics[t.id]).length;
        h += '<a class="row" href="#taktik"><span class="mark' + (n >= 13 ? ' done' : n ? ' part' : '') + '">' + (n >= 13 ? '✓' : '') + '</span><span><span class="t">Taktik-Aufgaben</span><br><span class="d">' + C.TACTICS.length + ' typische Spielsituationen mit Erklärung</span></span><span class="score">' + n + '/' + C.TACTICS.length + '</span></a>';
      }
      h += '</section>';
    }
    h += '</div>';
    screen(h);
  }

  let DS = null;
  function viewDrill(id) {
    const tactic = id === 'taktik';
    let queue = null;
    if (tactic) {
      const unsolved = C.TACTICS.filter((t) => !P.tactics[t.id]);
      const rest = C.TACTICS.filter((t) => P.tactics[t.id]);
      queue = unsolved.concat(rest.sort(() => Math.random() - 0.5)).slice(0, 10);
    }
    DS = { id, tactic, queue, n: tactic ? queue.length : 10, i: 0, res: [], q: null, done: false, sel: [], seqAt: 0 };
    nextQuestion();
  }
  function nextQuestion() {
    if (DS.i >= DS.n) { DS.done = true; return renderDrill(); }
    DS.q = DS.tactic ? D.tacticQuestion(DS.queue[DS.i]) : D.DRILLS[DS.id].gen({ i: DS.i, adv: lessonDone('grandnull') });
    DS.answered = null; DS.sel = []; DS.seqAt = 0;
    renderDrill();
  }
  function finishDrill() {
    const score = Math.round(DS.res.reduce((a, b) => a + b, 0) / DS.n * 100);
    if (!DS.tactic) {
      const d = P.drills[DS.id] || { best: 0, sessions: 0 };
      d.best = Math.max(d.best, score); d.last = score; d.sessions++;
      P.drills[DS.id] = d;
    }
    save();
    return score;
  }
  function renderDrill() {
    const title = DS.tactic ? 'Taktik-Aufgaben' : D.DRILLS[DS.id].title;
    let h = '<div class="page"><a class="back" href="#ueben">← Üben</a><div class="brand"><h1 style="font-size:26px">' + title + '</h1></div>';
    h += '<div class="dots">' + Array.from({ length: DS.n }, (_, i) => '<span class="' + (i < DS.res.length ? (DS.res[i] >= 1 ? 'ok' : 'no') : i === DS.i ? 'cur' : '') + '"></span>').join('') + '</div>';
    if (DS.done) {
      const score = finishDrill();
      const ok = DS.res.filter((x) => x >= 1).length;
      h += '<div class="qcard"><div class="eyebrow">Ergebnis</div><div class="result-big">' + score + ' %</div><p>' + ok + ' von ' + DS.n + ' richtig. ' + (score >= 80 ? 'Gemeistert!' : 'Ab 80 % gilt die Übung als gemeistert.') + '</p>';
      if (!DS.tactic) h += '<p class="note">Bestwert: ' + drillBest(DS.id) + ' %</p>';
      h += '<div class="btns"><button class="btn" id="again">Noch eine Runde</button><a class="btn soft" href="#ueben">Zur Übersicht</a></div></div></div>';
      screen(h);
      $('#again').onclick = () => viewDrill(DS.id);
      return;
    }
    const q = DS.q;
    h += '<div class="qcard" id="qcard">' + (q.title ? '<div class="eyebrow">' + esc(T(q.title)) + '</div>' : '');
    if (q.kind === 'seq' && DS.seqAt < q.steps.length) {
      const s = q.steps[DS.seqAt];
      h += '<div class="qtext">Merke dir die Augen. Stich ' + (DS.seqAt + 1) + ' von ' + q.steps.length + ':</div>';
      h += '<div class="minitrick">' + s.cards.map((c) => '<figure>' + cardHTML(c) + '</figure>').join('') + '</div><p style="text-align:center"><b>→ ' + s.won + '</b></p><button class="btn" id="seqnext">Weiter</button></div></div>';
      screen(h);
      $('#seqnext').onclick = () => { DS.seqAt++; renderDrill(); };
      return;
    }
    if (q.tricksShown) h += '<div class="tricklist">' + q.tricksShown.map((t, i) => '<div class="tl"><span style="width:18px">' + (i + 1) + '.</span>' + t.map((c) => cardHTML(c)).join('') + '</div>').join('') + '</div>';
    const ans = DS.answered;
    const how = q.how || (!DS.tactic && D.DRILLS[DS.id].how);
    if (how && !ans) h += '<div class="how"><b>So gehst du vor:</b> ' + rich(how, { terms: false }) + '</div>';
    h += '<div class="qtext">' + rich(q.text) + '</div>';
    if (q.trick) h += '<div class="minitrick">' + q.trick.map((x) => '<figure>' + cardHTML(x.c) + '<figcaption>' + esc(x.who) + '</figcaption></figure>').join('') + '<figure><div class="card" style="opacity:.25;background:transparent;border:2px dashed currentColor;box-shadow:none"></div><figcaption>Du</figcaption></figure></div>';
    if (q.kind === 'choice' || q.kind === 'seq') {
      if (q.hand && q.kind === 'choice') h += '<div class="pickhand" style="--cw:44px">' + q.hand.map((c) => cardHTML(c)).join('') + '</div>';
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
        if (!ans && DS.sel.includes(c)) cls = 'sel';
        if (q.legal && !q.legal.includes(c) && !ans) cls += ' dim';
        if (q.mark && E.isTrump(c, q.gt)) cls += ' trumpmark';
        if (ans) { if (q.answer.includes(c)) cls = 'good'; else if (DS.sel.includes(c)) cls = 'badpick'; }
        return cardHTML(c, { button: !ans, cls });
      }).join('') + '</div>';
      if (q.multi && !ans) {
        const need = q.count || 0;
        h += '<button class="btn" id="check"' + ((need ? DS.sel.length !== need : !DS.sel.length) ? ' disabled' : '') + '>' + (need ? 'Diese ' + need + ' drücken' : 'Prüfen') + '</button>';
      }
    }
    if (ans) {
      h += '<div class="feedback ' + (ans.score >= 1 ? 'ok' : ans.score > 0 ? 'mid' : 'no') + '"><b class="h">' + (ans.score >= 1 ? 'Richtig.' : ans.score > 0 ? 'Fast.' : 'Leider falsch.') + '</b>' + rich(ans.msg || q.explain) + '</div><button class="btn" id="dnext">' + (DS.i < DS.n - 1 ? 'Nächste Aufgabe' : 'Auswerten') + '</button>';
    }
    h += '</div></div>';
    screen(h);
    const qc = $('#qcard');
    const settle = (score, extra) => { DS.answered = Object.assign({ score }, extra || {}); DS.res.push(score); renderDrill(); const s = $('#screen'); s.scrollTop = s.scrollHeight; };
    if (!ans) {
      if (q.kind === 'choice' || q.kind === 'seq') qc.querySelectorAll('.opt').forEach((b) => (b.onclick = () => {
        const i = Number(b.dataset.i);
        settle(i === q.answer ? 1 : q.near && q.near(i) ? 0.5 : 0, { i });
      }));
      if (q.kind === 'trick') qc.querySelectorAll('.minitrick .card').forEach((b, i) => (b.onclick = () => settle(i === q.answer ? 1 : 0, { i })));
      if (q.kind === 'pick') qc.querySelectorAll('.pickhand .card').forEach((b) => (b.onclick = () => {
        const c = Number(b.dataset.c);
        if (q.legal && !q.legal.includes(c)) return toast('Diese Karte darfst du nicht legen – du musst bedienen.');
        if (!q.multi) { DS.sel = [c]; return settle(q.answer.includes(c) ? 1 : 0); }
        if (DS.sel.includes(c)) DS.sel = DS.sel.filter((x) => x !== c);
        else if (!q.count || DS.sel.length < q.count) DS.sel.push(c);
        renderDrill();
      }));
      const ck = $('#check');
      if (ck) ck.onclick = () => {
        if (q.check) { const r = q.check(DS.sel); settle(r.ok ? 1 : r.near ? 0.5 : 0, { msg: r.msg }); return; }
        const a = new Set(q.answer), s = new Set(DS.sel);
        const ok = a.size === s.size && [...a].every((x) => s.has(x));
        settle(ok ? 1 : 0);
      };
    } else {
      $('#dnext').onclick = () => {
        if (DS.tactic && DS.answered.score >= 1) { P.tactics[DS.queue[DS.i].id] = true; save(); }
        DS.i++; nextQuestion();
      };
    }
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
  function viewGame() {
    GM = GMN;
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
      P.guides[m.guide.n] = { done: true, won: won || (P.guides[m.guide.n] && P.guides[m.guide.n].won) || false };
      save();
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
    save();
    saveGame();
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
    h += '<div class="btns"><button class="btn soft" data-a="hist">Spielverlauf</button><button class="btn" data-a="next">Nächstes Spiel</button></div>';
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
    h += '<div class="btns">' + (n === 1 ? '<button class="btn" data-a="gnextguide">Weiter: ' + GUIDES[1].t + '</button>' : '<a class="btn" href="#lernen">Weiter im Lernpfad</a>') + '<button class="btn soft" data-a="gagain">Noch einmal</button>' + (n === 1 ? '<a class="btn soft" href="#lernen">Zum Lernpfad</a>' : '') + '</div>';
    openSheet(h, (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.a === 'gnextguide') { closeSheet(); location.hash = '#gefuehrt-' + (n + 1); }
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
  function viewProgress() {
    const li = levelInfo();
    let h = '<div class="page"><div class="brand"><h1>Fortschritt</h1></div>' + levelCard();
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
    h += '<div class="setting"><b>Spieltempo</b><div class="seg" id="seg-tempo">' + [['langsam', 'Langsam'], ['normal', 'Normal'], ['schnell', 'Schnell']].map(([k, l]) => '<button data-k="' + k + '" class="' + (P.settings.tempo === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div></div>';
    h += '<div class="setting"><b>Daten</b><div class="d">Mitzähl-Proben: ' + P.countChecks.ok + ' von ' + P.countChecks.total + ' richtig · Lektionen: ' + C.LESSONS.filter((l) => lessonDone(l.id)).length + '/' + C.LESSONS.length + '</div><button class="btn soft small" id="reset" style="align-self:flex-start">Fortschritt zurücksetzen</button></div></section>';
    h += '<p class="note" style="text-align:center">Skat-Regeln nach der Internationalen Skatordnung (ISkO). Gegner und Gewinnchancen beruhen auf einer regelbasierten Strategie und simulierten Spielen.</p></div>';
    screen(h);
    document.querySelectorAll('#seg-help button').forEach((b) => (b.onclick = () => { P.settings.help = b.dataset.k; save(); viewProgress(); }));
    document.querySelectorAll('#seg-tempo button').forEach((b) => (b.onclick = () => { P.settings.tempo = b.dataset.k; save(); viewProgress(); }));
    document.querySelectorAll('#seg-deck button').forEach((b) => (b.onclick = () => { P.settings.deck = b.dataset.k; save(); applyDeck(); viewProgress(); }));
    $('#reset').onclick = () => {
      openSheet('<h2>Alles zurücksetzen?</h2><p>Lektionen, Übungen, Spiele und die Liste werden gelöscht. Das lässt sich nicht rückgängig machen.</p><div class="btns"><button class="btn soft" data-x="no">Abbrechen</button><button class="btn" data-x="yes" style="background:var(--bad)">Zurücksetzen</button></div>', (ev) => {
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
    route();
    Cloud.init();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

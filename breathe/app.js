'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const A = window.BreathAudio;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const KINDS = {
    in: { label: 'Breathe in', name: 'Inhale', voice: 'Breathe in', desc: 'Fill the lungs, slow and smooth' },
    in2: { label: 'Top up', name: 'Top-up inhale', voice: 'And in', desc: 'A short second sip on a full breath' },
    holdIn: { label: 'Hold', name: 'Hold full', voice: 'Hold', desc: 'Pause with lungs full, throat soft' },
    out: { label: 'Breathe out', name: 'Exhale', voice: 'Breathe out', desc: 'Let the air go, slow or released' },
    holdOut: { label: 'Hold', name: 'Hold empty', voice: 'Hold', desc: 'Pause with lungs empty' },
    rest: { label: 'Breathe naturally', name: 'Natural breathing', voice: 'Rest. Breathe naturally', desc: 'Recover between rounds' },
  };
  const HOLDS = new Set(['holdIn', 'holdOut']);
  const CATS = {
    settle: { name: 'Settle', blurb: 'Slow the body down. Lower heart rate, longer exhales, a quiet mind.' },
    focus: { name: 'Focus', blurb: 'Balanced breathing. Calm and alert at the same time.' },
    charge: { name: 'Charge', blurb: 'Wake the system up. Energy, warmth and alertness.' },
  };
  const DEFAULT_MUSIC = { settle: 'warm', focus: 'ocean', charge: 'pulse' };
  const OPEN_GUESS = 60; // seconds assumed for an open hold before we have your history

  /* ---------------- storage ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  const prefs = Object.assign(
    { chimes: true, voice: false, breathSound: true, haptics: true, checkin: true, cueVol: 0.7, musicVol: 0.45 },
    store.get('br.prefs', {}),
  );
  const savePrefs = () => store.set('br.prefs', prefs);
  let custom = store.get('br.custom', []);
  const saveCustom = () => store.set('br.custom', custom);
  let log = store.get('br.log', []);
  const saveLog = () => store.set('br.log', log);
  const cfgAll = store.get('br.cfg', {});
  const cfg = (id) => cfgAll[id] || (cfgAll[id] = {});
  const saveCfg = () => store.set('br.cfg', cfgAll);

  /* ---------------- pattern maths ---------------- */
  const BUILTIN = window.BREATH_PATTERNS || [];
  const all = () => BUILTIN.concat(custom);
  const byId = (id) => all().find((p) => p.id === id);
  const isCustom = (p) => custom.includes(p);
  const isTimed = (p) => p.sets.length === 1 && p.sets[0].reps === 1;
  const hasOpen = (p) => p.sets.some((s) => s.phases.some((f) => f.open));

  function openGuess(p) {
    const holds = log.filter((r) => r.pid === p.id && r.holds && r.holds.length).flatMap((r) => r.holds).slice(-6);
    return holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : OPEN_GUESS;
  }
  const phaseSec = (f, guess) => (f.open ? Math.min(f.s, guess) : f.s);
  const cycleSec = (set, guess = OPEN_GUESS) => set.phases.reduce((a, f) => a + phaseSec(f, guess), 0);
  const roundSec = (p, guess) => p.sets.reduce((a, s) => a + s.reps * cycleSec(s, guess), 0);
  const roundBreaths = (p) => p.sets.reduce((a, s) => a + s.reps * s.phases.filter((f) => f.k === 'in').length, 0);

  function stats(p) {
    const T = roundSec(p);
    const rate = T ? (roundBreaths(p) / T) * 60 : 0;
    let tin = 0, tout = 0;
    for (const s of p.sets) for (const f of s.phases) {
      if (f.k === 'in' || f.k === 'in2') tin += f.s * s.reps;
      if (f.k === 'out') tout += f.s * s.reps;
    }
    return { rate, ratio: tin ? tout / tin : 0 };
  }

  // What a pattern does to the body, judged from rate and exhale weighting.
  function classify(p) {
    const { rate, ratio } = stats(p);
    const fastSet = p.sets.some((s) => s.reps >= 8 && cycleSec(s) <= 4); // 15+ breaths/min bursts
    if (fastSet || rate >= 14) return 'charge';
    if (rate <= 8 && ratio >= 1.3) return 'settle';
    if (rate > 10 && ratio < 1) return 'charge';
    return 'focus';
  }

  const fmtRate = (r) => (r >= 10 ? Math.round(r) : r.toFixed(1).replace(/\.0$/, ''));
  const fmtSec = (s) => (s % 1 ? String(Math.round(s * 10) / 10) : String(s));
  function fmtClock(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }
  function fmtDur(sec) {
    sec = Math.round(sec);
    if (sec < 60) return sec + ' s';
    const m = Math.round(sec / 60);
    return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  }

  // Session length: timed patterns pick minutes, the rest pick rounds.
  function lengthOf(p) {
    const c = cfg(p.id);
    return isTimed(p) ? (c.minutes || p.minutes || 5) : (c.rounds || p.rounds || 3);
  }
  function roundsFor(p) {
    if (!isTimed(p)) return lengthOf(p);
    return Math.max(1, Math.round((lengthOf(p) * 60) / cycleSec(p.sets[0])));
  }
  function musicFor(p) { const c = cfg(p.id); return c.music || DEFAULT_MUSIC[p.cat] || 'none'; }

  function summaryLine(p) {
    const { rate, ratio } = stats(p);
    const bits = [];
    if (isTimed(p)) {
      bits.push(fmtRate(rate) + ' breaths/min');
      if (ratio >= 1.25) bits.push('exhale ' + (Math.round(ratio * 10) / 10) + '× inhale');
      else if (ratio && ratio <= 0.8) bits.push('inhale-weighted');
    } else {
      const big = p.sets.find((s) => s.reps > 1);
      if (big) bits.push(big.reps + ' breaths a round');
      if (hasOpen(p)) bits.push('timed holds');
    }
    return bits.join(' · ');
  }

  /* ---------------- breath wave (SVG) ---------------- */
  // Lung volume over one round: rises on inhales, flat on holds, falls on exhales.
  function wave(p, { w = 300, ht = 70, labels = true, maxCycles = 3 } = {}) {
    const items = []; // {k, d, s, open, mark}
    for (const set of p.sets) {
      const n = Math.min(set.reps, set.reps > 1 ? maxCycles : 1);
      for (let r = 0; r < n; r++) for (const f of set.phases) items.push({ k: f.k, s: f.s, open: f.open, d: f.open ? 14 : f.s });
      if (set.reps > n) items[items.length - 1].mark = '×' + set.reps;
    }
    const T = items.reduce((a, it) => a + it.d, 0) || 1;
    const padX = 4, top = labels ? 16 : 4, bot = labels ? 18 : 4;
    const H = ht - top - bot, X = (t) => padX + (t / T) * (w - padX * 2), Y = (v) => top + (1 - v) * H;
    let v = 0, t = 0;
    let d = `M${X(0).toFixed(1)},${Y(0).toFixed(1)}`;
    const texts = [], marks = [];
    items.forEach((it, i) => {
      const next = items[i + 1];
      let to = v;
      if (it.k === 'in') to = next && next.k === 'in2' ? 0.82 : 1;
      else if (it.k === 'in2') to = 1;
      else if (it.k === 'out') to = 0;
      const x0 = X(t), x1 = X(t + it.d);
      if (it.k === 'rest') {
        const n = Math.max(1, Math.round(it.d / 5)), seg = (x1 - x0) / n;
        let y0 = Y(v);
        for (let j = 0; j < n; j++) {
          const xa = x0 + seg * j, xb = xa + seg;
          d += ` C${(xa + seg * 0.25).toFixed(1)},${Y(0.35).toFixed(1)} ${(xa + seg * 0.5).toFixed(1)},${Y(0.35).toFixed(1)} ${(xa + seg * 0.5).toFixed(1)},${Y(0.3).toFixed(1)}`;
          d += ` S${(xb - seg * 0.1).toFixed(1)},${y0.toFixed(1)} ${xb.toFixed(1)},${y0.toFixed(1)}`;
        }
        to = v;
      } else if (to === v) d += ` L${x1.toFixed(1)},${Y(v).toFixed(1)}`;
      else {
        const k = (x1 - x0) * 0.45;
        d += ` C${(x0 + k).toFixed(1)},${Y(v).toFixed(1)} ${(x1 - k).toFixed(1)},${Y(to).toFixed(1)} ${x1.toFixed(1)},${Y(to).toFixed(1)}`;
      }
      if (labels && x1 - x0 >= 13 && (p.sets.length === 1 || it.d >= 1)) {
        texts.push(`<text x="${((x0 + x1) / 2).toFixed(1)}" y="${ht - 4}" class="w-lab ${it.k}">${it.open ? 'tap' : fmtSec(it.s)}</text>`);
      }
      if (labels && it.mark) marks.push(`<text x="${(x1 - 2).toFixed(1)}" y="11" class="w-mark" text-anchor="end">${it.mark}</text>`);
      v = to; t += it.d;
    });
    const area = d + ` L${X(T).toFixed(1)},${Y(0).toFixed(1)} Z`;
    return `<svg viewBox="0 0 ${w} ${ht}" class="wave" aria-hidden="true">
      <path d="${area}" class="w-area"/><path d="${d}" class="w-line"/>${texts.join('')}${marks.join('')}</svg>`;
  }

  /* ---------------- navigation ---------------- */
  const stack = ['home'];
  const onShow = { home: renderHome, journal: renderJournal, setup: renderSetup, editor: () => {}, session: () => {}, summary: () => {} };
  const onLeave = { setup: stopPreview, session: () => { if (S) finish(false, true); } };

  function render() {
    const top = stack[stack.length - 1];
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === top));
    $('#tabbar').hidden = !(top === 'home' || top === 'journal');
    $$('.tabbtn').forEach((b) => b.classList.toggle('active', b.dataset.tab === top));
    onShow[top]();
    const sc = $('#' + top + ' .scroll') || $('#' + top);
    if (sc && !sc.dataset.keep) sc.scrollTop = 0;
  }
  function go(id) { stack.push(id); history.pushState({ depth: stack.length }, ''); render(); }
  function replaceTop(id) { stack[stack.length - 1] = id; render(); }
  const back = () => history.back();
  const toRoot = () => { if (stack.length > 1) history.go(-(stack.length - 1)); };
  window.addEventListener('popstate', (e) => {
    const depth = (e.state && e.state.depth) || 1;
    while (stack.length > depth) { const gone = stack.pop(); if (onLeave[gone]) onLeave[gone](); }
    render();
  });
  history.replaceState({ depth: 1 }, '');
  $$('.tabbtn').forEach((b) => b.addEventListener('click', () => { stack[0] = b.dataset.tab; render(); }));
  $$('[data-back]').forEach((b) => b.addEventListener('click', back));

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // Press-and-hold repeat for steppers.
  function holdRepeat(btn, fn) {
    let timer = 0, delay = 0;
    const stop = () => { clearTimeout(timer); timer = 0; };
    const run = () => { fn(); delay = Math.max(50, delay * 0.8); timer = setTimeout(run, delay); };
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); delay = 380; timer = setTimeout(run, delay); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  }

  /* ---------------- home ---------------- */
  let current = null; // pattern on the setup screen

  function suggestion() {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 11) return { id: 'cyclic-hyper', when: 'This morning' };
    if (hr >= 11 && hr < 17) return { id: 'coherent', when: 'This afternoon' };
    if (hr >= 17 && hr < 21) return { id: 'cyclic-sigh', when: 'This evening' };
    return { id: '478', when: 'Tonight' };
  }

  function card(p, big) {
    const b = h('button', 'pcard ' + p.cat + (big ? ' big' : ''));
    const txt = h('div', 'pc-text');
    if (big) txt.appendChild(h('span', 'eyebrow', big));
    txt.appendChild(h('b', '', p.name));
    if (p.tagline) txt.appendChild(h('span', 'pc-tag', p.tagline));
    const len = isTimed(p) ? lengthOf(p) + ' min' : lengthOf(p) + ' rounds';
    txt.appendChild(h('span', 'pc-meta', [len, summaryLine(p)].filter(Boolean).join(' · ')));
    const art = h('div', 'pc-art'); art.innerHTML = wave(p, { w: 120, ht: 44, labels: false, maxCycles: 2 });
    b.append(txt, art);
    b.addEventListener('click', () => { current = p; go('setup'); });
    return b;
  }

  function renderHome() {
    const mins = todayMinutes();
    $('#today').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
      + (mins !== '0' ? ' · ' + mins + ' min today' : '');
    const lib = $('#library'); lib.textContent = '';
    const sug = suggestion(), sp = byId(sug.id);
    if (sp) lib.appendChild(card(sp, sug.when));
    for (const [cat, info] of Object.entries(CATS)) {
      const list = BUILTIN.filter((p) => p.cat === cat);
      if (!list.length) continue;
      const sec = h('section', 'group');
      const head = h('div', 'group-head'); head.appendChild(h('h2', 'cat-' + cat, info.name));
      sec.append(head, h('p', 'group-blurb', info.blurb));
      const grid = h('div', 'cards'); list.forEach((p) => grid.appendChild(card(p)));
      sec.appendChild(grid); lib.appendChild(sec);
    }
    const sec = h('section', 'group');
    const head = h('div', 'group-head'); head.appendChild(h('h2', '', 'Your patterns'));
    sec.append(head);
    const grid = h('div', 'cards');
    custom.forEach((p) => grid.appendChild(card(p)));
    const add = h('button', 'pcard add');
    add.innerHTML = '<span class="plus">+</span><b>New pattern</b><span class="pc-tag">Design your own rhythm</span>';
    add.addEventListener('click', () => openEditor(null));
    grid.appendChild(add);
    sec.appendChild(grid); lib.appendChild(sec);
  }

  /* ---------------- setup ---------------- */
  let previewTimer = 0, previewing = false;
  function stopPreview() { clearTimeout(previewTimer); if (previewing) A.stopMusic(1.2); previewing = false; }

  function renderSetup() {
    const p = current; if (!p) return;
    const v = $('#setup');
    v.dataset.cat = p.cat;
    $('.nav-title', v).textContent = p.name;
    $('#setupCat').textContent = CATS[p.cat].name;
    $('#setupName').textContent = p.name;
    $('#setupTagline').textContent = p.tagline || '';
    $('#setupTagline').hidden = !p.tagline;
    $('#setupRhythm').innerHTML = wave(p);
    $('#setupMeta').textContent = summaryLine(p);
    $('#editPatternBtn').textContent = isCustom(p) ? 'Edit' : 'Customize';
    renderLength();
    $('#caution').hidden = !(p.caution || p.cat === 'charge');
    $('#setupHow').textContent = p.how || '';
    $('#setupHow').previousElementSibling.hidden = !p.how;
    $('#setupScience').textContent = p.science || '';
    $('#scienceLabel').hidden = !p.science;
    const refs = $('#setupRefs'); refs.textContent = '';
    (p.refs || []).forEach((r) => {
      const li = h('li'); const a = h('a', '', r.t); a.href = r.u; a.target = '_blank'; a.rel = 'noopener';
      li.appendChild(a); refs.appendChild(li);
    });
    renderMusicGrid();
    syncPrefInputs();
  }

  function renderLength() {
    const p = current, timed = isTimed(p), n = lengthOf(p);
    $('#lenValue').textContent = timed ? n + ' min' : n + (n === 1 ? ' round' : ' rounds');
    let note;
    if (timed) {
      const cyc = cycleSec(p.sets[0]), breaths = roundsFor(p);
      note = `${breaths} breaths of ${fmtSec(Math.round(cyc * 10) / 10)} s`;
    } else {
      const total = roundSec(p, openGuess(p)) * n;
      note = (hasOpen(p) ? 'About ' : '') + fmtDur(total) + (hasOpen(p) ? ', depending on your holds' : '');
    }
    $('#lenNote').textContent = note;
  }
  function stepLength(dir) {
    const p = current, c = cfg(p.id), timed = isTimed(p);
    const steps = timed ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 45, 60] : [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];
    const cur = lengthOf(p);
    let i = steps.findIndex((x) => x >= cur); if (i < 0) i = steps.length - 1;
    if (steps[i] !== cur && dir < 0) i++;
    const nv = steps[Math.max(0, Math.min(steps.length - 1, i + dir))];
    if (timed) c.minutes = nv; else c.rounds = nv;
    saveCfg(); renderLength();
  }
  holdRepeat($('#lenDown'), () => stepLength(-1));
  holdRepeat($('#lenUp'), () => stepLength(1));

  function renderMusicGrid() {
    const grid = $('#musicGrid'); grid.textContent = '';
    const sel = musicFor(current);
    const opts = [['none', 'None', 'Just the cues']].concat(Object.entries(A.SOUNDSCAPES).map(([k, m]) => [k, m.name, m.blurb]));
    for (const [k, name, blurb] of opts) {
      const b = h('button', 'mtile' + (k === sel ? ' on' : ''));
      b.append(h('b', '', name), h('span', '', blurb));
      b.setAttribute('aria-pressed', String(k === sel));
      b.addEventListener('click', async () => {
        cfg(current.id).music = k; saveCfg(); renderMusicGrid();
        clearTimeout(previewTimer);
        if (k === 'none') { stopPreview(); return; }
        await A.resume(); applyLevels();
        A.startMusic(k, musicOpts(current)); previewing = true;
        previewTimer = setTimeout(stopPreview, 9000);
      });
      grid.appendChild(b);
    }
  }

  // Lock the music to the breath: drum tempo and chord changes land on cycle boundaries.
  function musicOpts(p, at) {
    const target = { settle: 56, focus: 66, charge: 88 }[p.cat] || 60;
    const o = { bpm: target, pace: 1 };
    if (at != null) o.at = at;
    if (isTimed(p)) {
      const cyc = cycleSec(p.sets[0]);
      const beats = Math.max(1, Math.round((cyc * target) / 60));
      o.bpm = (beats * 60) / cyc;
      o.pace = 14 / (cyc * Math.max(1, Math.round(14 / cyc)));
    }
    return o;
  }

  function syncPrefInputs() {
    $$('[data-pref]').forEach((el) => {
      const k = el.dataset.pref;
      if (el.type === 'checkbox') el.checked = !!prefs[k]; else el.value = prefs[k];
    });
  }
  $$('[data-pref]').forEach((el) => el.addEventListener('input', () => {
    const k = el.dataset.pref;
    prefs[k] = el.type === 'checkbox' ? el.checked : parseFloat(el.value);
    savePrefs(); applyLevels();
  }));
  if (!('vibrate' in navigator)) $('#hapticRow').hidden = true;

  let muted = false;
  function applyLevels() {
    if (!A.running && !S) return;
    A.setLevels({
      cues: muted ? 0 : prefs.cueVol,
      breath: muted || !prefs.breathSound ? 0 : prefs.cueVol,
      music: muted ? 0 : prefs.musicVol,
    });
  }

  $('#editPatternBtn').addEventListener('click', () => openEditor(current));
  $('#startBtn').addEventListener('click', () => {
    if (prefs.checkin) openCheckin(); else begin(null);
  });

  /* ---------------- check-in ---------------- */
  const SCALES = [
    { key: 'tension', name: 'Tension', lo: 'Calm', hi: 'Tense' },
    { key: 'energy', name: 'Energy', lo: 'Drained', hi: 'Charged' },
  ];
  function checkinUI(el, values, before) {
    el.textContent = '';
    for (const sc of SCALES) {
      const row = h('div', 'scale');
      const head = h('div', 'scale-head'); head.append(h('b', '', sc.name), h('span', 'scale-val'));
      const dots = h('div', 'scale-dots');
      const paint = () => {
        $$('button', dots).forEach((b, i) => {
          b.classList.toggle('on', values[sc.key] === i + 1);
          b.classList.toggle('was', !!before && before[sc.key] === i + 1);
        });
        $('.scale-val', head).textContent = values[sc.key] ? (values[sc.key] <= 2 ? sc.lo : values[sc.key] >= 4 ? sc.hi : 'In between') : '';
      };
      for (let i = 1; i <= 5; i++) {
        const b = h('button', '', String(i));
        b.setAttribute('aria-label', `${sc.name} ${i} of 5`);
        b.addEventListener('click', () => { values[sc.key] = values[sc.key] === i ? undefined : i; paint(); });
        dots.appendChild(b);
      }
      const ends = h('div', 'scale-ends'); ends.append(h('span', '', sc.lo), h('span', '', sc.hi));
      row.append(head, dots, ends); el.appendChild(row); paint();
    }
    return values;
  }
  let beforeVals = {};
  function openCheckin() {
    beforeVals = {};
    checkinUI($('#checkBefore'), beforeVals);
    $('#checkSheet').hidden = false;
    // Audio and speech can only be unlocked inside a tap, so warm them up now.
    A.resume(); if (prefs.voice) A.primeVoice();
  }
  $('#checkSkip').addEventListener('click', () => { $('#checkSheet').hidden = true; begin(null); });
  $('#checkGo').addEventListener('click', () => {
    $('#checkSheet').hidden = true;
    begin(beforeVals.tension || beforeVals.energy ? Object.assign({}, beforeVals) : null);
  });
  $$('.sheet-backdrop').forEach((bd) => bd.addEventListener('click', (e) => {
    if (e.target === bd || e.target.closest('[data-close]')) bd.hidden = true;
  }));

  /* ---------------- session engine ----------------
   * Time comes from the AudioContext clock, so cues are sample-accurate and
   * pausing (which suspends the context) freezes everything in place.
   */
  let S = null;
  const LOOK = 0.06;  // schedule the next phase this far ahead of its start
  const LEAD = 3;     // "get ready" seconds

  function buildPlan(p) {
    const plan = [{ k: 'ready', s: LEAD, round: 0 }];
    const rounds = roundsFor(p);
    const guess = openGuess(p);
    let lvl = 0.42;
    for (let r = 0; r < rounds; r++) {
      p.sets.forEach((set, si) => {
        // many quick breaths: count reps and tick instead of narrating each phase
        const fast = set.reps >= 8 && cycleSec(set) / set.phases.length < 2.5;
        for (let rep = 0; rep < set.reps; rep++) {
          set.phases.forEach((f, fi) => {
            plan.push({ k: f.k, s: f.s, open: !!f.open, est: phaseSec(f, guess), round: r, set: si, rep, reps: set.reps, fast, first: rep === 0 && fi === 0 });
          });
        }
      });
    }
    // orb size at the end of each phase
    plan.forEach((ph, i) => {
      ph.from = lvl;
      const nx = plan[i + 1];
      if (ph.k === 'in') lvl = nx && nx.k === 'in2' ? 0.86 : 1;
      else if (ph.k === 'in2') lvl = 1;
      else if (ph.k === 'out') lvl = 0.42;
      else if (ph.k === 'rest') lvl = 0.6;
      ph.to = lvl;
    });
    // remaining planned seconds after each phase
    let acc = 0, open = false;
    for (let i = plan.length - 1; i >= 0; i--) {
      plan[i].after = acc; plan[i].openAhead = open || plan[i].open;
      if (plan[i].k !== 'ready') acc += plan[i].est;
      open = plan[i].openAhead;
    }
    return { plan, rounds, total: acc };
  }

  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
      if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch { /* not allowed right now */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S && !S.paused) keepAwake(true); });

  async function begin(before) {
    const p = current;
    if (prefs.voice) A.primeVoice(); // before any await, while we're still inside the tap
    clearTimeout(previewTimer); previewing = false;
    await A.resume();
    muted = false; $('#muteBtn').classList.remove('off');
    applyLevels();
    const { plan, rounds, total } = buildPlan(p);
    const t = A.now() + 0.15;
    S = { p, plan, rounds, total, i: -1, start: t, end: t, t0: t + LEAD, paused: false, breaths: 0, holds: [], before, voiceT: 0, ended: false };
    const sv = $('#session'); sv.dataset.cat = p.cat;
    $('#sessName').textContent = p.name;
    $('#sessTrack').innerHTML = '<i></i>';
    $('#pauseBtn').classList.remove('paused');
    sv.classList.remove('paused');
    const m = musicFor(p);
    if (m !== 'none') A.startMusic(m, musicOpts(p, S.t0)); else A.stopMusic(0.5);
    if (prefs.chimes) A.cue('start', t, LEAD);
    keepAwake(true);
    go('session');
    enterPhase(0, t);
    S.timer = setInterval(tick, 20);
    requestAnimationFrame(frame);
  }

  function enterPhase(i, at) {
    S.i = i; S.start = at;
    const ph = S.plan[i];
    S.end = at + ph.s;
    if (ph.k === 'ready') return;
    if (ph.k === 'in') S.breaths++;
    if (prefs.chimes) A.cue(ph.k, at, ph.fast ? Math.min(ph.s, 1) : ph.s);
    if (prefs.breathSound) A.breath(ph.k, at, ph.s);
    if (prefs.voice) {
      const parts = [];
      const newRound = ph.set === 0 && ph.first && ph.round > 0;
      if (newRound && !isTimed(S.p)) parts.push(ph.round === S.rounds - 1 ? 'Last round' : 'Round ' + (ph.round + 1));
      if (ph.fast) { if (ph.first) parts.push(ph.reps + ' breaths'); }
      else if (ph.open) parts.push('Hold. Tap when you need to breathe');
      else parts.push(KINDS[ph.k].voice);
      if (parts.length) {
        const wait = Math.max(0, (at - A.now()) * 1000);
        clearTimeout(S.voiceT);
        S.voiceT = setTimeout(() => A.speak(parts.join('. ')), wait);
      }
    }
    if (prefs.haptics && !ph.fast && navigator.vibrate) {
      setTimeout(() => navigator.vibrate(ph.k === 'in' ? 40 : HOLDS.has(ph.k) ? [15, 60, 15] : 25), Math.max(0, (at - A.now()) * 1000));
    }
  }

  function tick() {
    if (!S || S.paused || S.ended) return;
    const now = A.now();
    if (now >= S.end - LOOK) advance(S.end);
  }

  function advance(at) {
    const ph = S.plan[S.i];
    if (ph.open) S.holds.push(Math.round((at - S.start) * 10) / 10);
    if (S.i + 1 >= S.plan.length) { finish(true); return; }
    enterPhase(S.i + 1, at);
  }

  // Tap during an open hold = "I need to breathe".
  $('#stage').addEventListener('click', () => {
    if (!S || S.paused) return;
    const ph = S.plan[S.i];
    if (ph.open) { const now = A.now(); S.end = now; advance(now); }
  });

  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
  function frame() {
    if (!S || S.ended) return;
    requestAnimationFrame(frame);
    if (S.paused) return;
    const now = A.now(), ph = S.plan[S.i];
    const dur = S.end - S.start;
    const pr = Math.min(1, Math.max(0, (now - S.start) / dur));
    let sc = ph.from + (ph.to - ph.from) * (ph.fast ? pr : ease(pr));
    if (HOLDS.has(ph.k)) sc += Math.sin(now * 2.2) * 0.008;
    if (ph.k === 'rest') sc = 0.6 + Math.sin((now - S.start) * (Math.PI * 2 / 5)) * 0.08;
    $('#orb').style.transform = `scale(${sc.toFixed(4)})`;

    const ring = ph.fast ? (ph.rep + pr) / ph.reps : pr;
    $('#ringFill').style.strokeDashoffset = (100 - ring * 100).toFixed(2);

    const label = ph.k === 'ready' ? 'Get ready' : ph.open ? 'Hold' : KINDS[ph.k].label;
    let count;
    if (ph.open) count = fmtClock(now - S.start);
    else if (ph.fast) count = `${ph.rep + 1}<small>/${ph.reps}</small>`;
    else count = String(Math.max(1, Math.ceil(S.end - now - 0.05)));
    $('#phaseCount').classList.toggle('clock', !!ph.open);
    setText('#phaseLabel', label);
    setHTML('#phaseCount', count);
    let hint = '';
    if (ph.open) hint = 'Tap anywhere when you need to breathe';
    else if (ph.k === 'ready') hint = 'Sit comfortably. Soften the shoulders.';
    else if (ph.k === 'rest') hint = 'Next round in ' + fmtClock(S.end - now);
    else if (ph.k === 'in2') hint = 'One more short sip of air';
    setText('#phaseHint', hint);
    $('#stage').classList.toggle('tappable', !!ph.open);

    const elapsed = Math.max(0, now - S.t0);
    const left = (ph.k === 'ready' ? 0 : ph.open ? Math.max(0, ph.est - (now - S.start)) : Math.max(0, S.end - now)) + ph.after;
    setText('#tElapsed', fmtClock(elapsed));
    setText('#tLeft', (ph.openAhead ? '~' : '−') + fmtClock(left));
    const pos = ph.k === 'ready' ? '' : isTimed(S.p) ? `Breath ${S.breaths} of ${S.rounds}` : `Round ${ph.round + 1} of ${S.rounds}`;
    setText('#tPos', pos);
    $('#sessTrack i').style.width = ((elapsed / Math.max(1, elapsed + left)) * 100).toFixed(2) + '%';
  }
  const lastText = {};
  function setText(sel, v) { if (lastText[sel] !== v) { lastText[sel] = v; $(sel).textContent = v; } }
  function setHTML(sel, v) { if (lastText[sel] !== v) { lastText[sel] = v; $(sel).innerHTML = v; } }

  function pause(on) {
    if (!S) return;
    S.paused = on;
    $('#pauseBtn').classList.toggle('paused', on);
    $('#session').classList.toggle('paused', on);
    if (on) {
      clearTimeout(S.voiceT); A.hush(); A.suspend(); keepAwake(false);
      setText('#phaseLabel', 'Paused'); setHTML('#phaseCount', ''); setText('#phaseHint', 'Tap play to continue');
    } else { A.resume(); keepAwake(true); }
  }
  $('#pauseBtn').addEventListener('click', () => { if (S) pause(!S.paused); });
  $('#muteBtn').addEventListener('click', () => {
    muted = !muted; $('#muteBtn').classList.toggle('off', muted);
    if (muted) A.hush();
    applyLevels();
  });
  $('#endBtn').addEventListener('click', () => { if (S) finish(false); });

  function finish(completed, fromNav) {
    if (!S || S.ended) return;
    const s = S;
    s.ended = true;
    clearInterval(s.timer); clearTimeout(s.voiceT);
    if (s.paused) A.resume();
    const now = A.now();
    const ph = s.plan[s.i];
    if (!completed && ph && ph.open) s.holds.push(Math.round((now - s.start) * 10) / 10);
    const active = Math.max(0, now - s.t0);
    A.silenceBreath();
    if (completed && prefs.chimes) A.cue('end', now + 0.2, 4);
    if (completed && prefs.voice) A.speak('Session complete. Take a moment.');
    else if (!completed) A.hush();
    A.stopMusic(completed ? 6 : 1.5);
    keepAwake(false);
    S = null;

    if (active < 20 && !completed) { if (!fromNav) back(); return; }
    const rec = {
      id: 'r' + Date.now().toString(36),
      pid: s.p.id, name: s.p.name, cat: s.p.cat,
      at: Date.now() - Math.round(active * 1000),
      dur: Math.round(active), planned: Math.round(s.total),
      breaths: s.breaths, rounds: ph && ph.k !== 'ready' ? ph.round + (completed ? 1 : 0) : 0,
      completed, holds: s.holds.length ? s.holds : undefined,
      before: s.before || undefined,
    };
    log.push(rec); saveLog();
    if (fromNav) return;
    showSummary(rec);
    replaceTop('summary');
  }

  /* ---------------- summary ---------------- */
  let sumRec = null, afterVals = {};
  function showSummary(rec) {
    sumRec = rec; afterVals = {};
    const v = $('#summary'); v.dataset.cat = rec.cat;
    $('#doneMark').innerHTML = '<svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="30" fill="currentColor" opacity=".16"/><path d="M20 33l8 8 16-17" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    $('#sumTitle').textContent = rec.completed ? 'Session complete' : 'Session ended';
    $('#sumSub').textContent = rec.name + ' · ' + new Date(rec.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const st = $('#sumStats'); st.textContent = '';
    const rate = rec.dur ? (rec.breaths / rec.dur) * 60 : 0;
    statTile(st, fmtClock(rec.dur), 'Time');
    statTile(st, String(rec.breaths), 'Breaths');
    statTile(st, fmtRate(rate), 'Per minute');
    renderHolds($('#sumHolds'), rec);
    const ck = $('#sumCheck'); ck.textContent = '';
    if (prefs.checkin || rec.before) {
      const sec = h('section', 'card');
      sec.appendChild(h('h3', '', 'How do you feel now?'));
      const box = h('div'); sec.appendChild(box);
      checkinUI(box, afterVals, rec.before);
      if (rec.before) sec.appendChild(h('p', 'hint', 'The outlined dot is where you started.'));
      ck.appendChild(sec);
    }
    $('#sumNote').value = '';
  }
  function statTile(el, val, label) {
    const d = h('div', 'stat'); d.append(h('b', '', val), h('span', '', label)); el.appendChild(d);
  }
  function renderHolds(el, rec) {
    el.textContent = '';
    if (!rec.holds || !rec.holds.length) return;
    const sec = h('section', 'card');
    const best = Math.max(...rec.holds);
    sec.appendChild(h('h3', '', 'Breath holds'));
    rec.holds.forEach((x, i) => {
      const row = h('div', 'hold-row');
      const bar = h('div', 'hold-bar'); const fill = h('i'); fill.style.width = (x / best) * 100 + '%'; bar.appendChild(fill);
      row.append(h('span', '', 'Round ' + (i + 1)), bar, h('b', '', fmtClock(x)));
      sec.appendChild(row);
    });
    const prev = log.filter((r) => r.pid === rec.pid && r.id !== rec.id && r.holds && r.holds.length).flatMap((r) => r.holds);
    if (prev.length) {
      const pb = Math.max(...prev);
      sec.appendChild(h('p', 'hint', best > pb ? `New personal best, up from ${fmtClock(pb)}.` : `Personal best: ${fmtClock(pb)}.`));
    }
    el.appendChild(sec);
  }
  $('#sumDone').addEventListener('click', () => {
    if (sumRec) {
      const after = (afterVals.tension || afterVals.energy) ? Object.assign({}, afterVals) : undefined;
      const note = $('#sumNote').value.trim() || undefined;
      Object.assign(sumRec, { after, note });
      saveLog();
    }
    sumRec = null;
    toRoot();
  });

  /* ---------------- journal ---------------- */
  const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function todayMinutes() {
    const k = dayKey(Date.now());
    const m = log.filter((r) => dayKey(r.at) === k).reduce((a, r) => a + r.dur, 0) / 60;
    return m > 0 && m < 1 ? '<1' : String(Math.round(m));
  }
  function streak() {
    const days = new Set(log.map((r) => dayKey(r.at)));
    const d = new Date(); let n = 0;
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not done yet doesn't break it
    while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function renderJournal() {
    const st = $('#stats'); st.textContent = '';
    const weekAgo = Date.now() - 7 * 864e5;
    const week = log.filter((r) => r.at >= weekAgo).reduce((a, r) => a + r.dur, 0);
    statTile(st, todayMinutes(), 'Min today');
    statTile(st, String(Math.round(week / 60)), 'Min this week');
    statTile(st, String(streak()), 'Day streak');
    statTile(st, String(log.length), 'Sessions');
    renderChart();
    renderInsights();
    renderHistory();
  }

  function renderChart() {
    const el = $('#chart'); el.textContent = '';
    const days = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push(d); }
    const per = days.map((d) => {
      const k = dayKey(d), o = { settle: 0, focus: 0, charge: 0 };
      log.filter((r) => dayKey(r.at) === k).forEach((r) => { o[r.cat] = (o[r.cat] || 0) + r.dur / 60; });
      return o;
    });
    const max = Math.max(10, ...per.map((o) => o.settle + o.focus + o.charge));
    days.forEach((d, i) => {
      const col = h('div', 'col');
      const stack2 = h('div', 'bar');
      for (const c of ['charge', 'focus', 'settle']) {
        if (!per[i][c]) continue;
        const seg = h('i', 'seg ' + c); seg.style.height = (per[i][c] / max) * 100 + '%'; stack2.appendChild(seg);
      }
      const total = Math.round(per[i].settle + per[i].focus + per[i].charge);
      col.title = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) + ': ' + total + ' min';
      col.append(stack2, h('span', i === 13 ? 'today' : '', d.toLocaleDateString(undefined, { weekday: 'narrow' })));
      el.appendChild(col);
    });
    $('#chartLegend').innerHTML = Object.entries(CATS).map(([k, c]) => `<span><i class="seg ${k}"></i>${c.name}</span>`).join('');
  }

  function avg(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
  function renderInsights() {
    const el = $('#insights'); el.textContent = '';
    const lines = [];
    const shift = (cat, key) => {
      const d = log.filter((r) => r.cat === cat && r.before && r.after && r.before[key] && r.after[key]).map((r) => r.after[key] - r.before[key]);
      return d.length ? { v: avg(d), n: d.length } : null;
    };
    const say = (v, up, down) => (Math.abs(v) < 0.15 ? 'barely changes' : (v < 0 ? down : up) + ' by ' + Math.abs(v).toFixed(1));
    const s = shift('settle', 'tension'); if (s) lines.push(['settle', `Settle sessions: tension ${say(s.v, 'rises', 'drops')}`, `${s.n} check-in${s.n > 1 ? 's' : ''}`]);
    const f = shift('focus', 'tension'); if (f) lines.push(['focus', `Focus sessions: tension ${say(f.v, 'rises', 'drops')}`, `${f.n} check-in${f.n > 1 ? 's' : ''}`]);
    const c = shift('charge', 'energy'); if (c) lines.push(['charge', `Charge sessions: energy ${say(c.v, 'rises', 'drops')}`, `${c.n} check-in${c.n > 1 ? 's' : ''}`]);

    const sec = h('section', 'card');
    sec.appendChild(h('h3', '', 'How breathing moves you'));
    if (!lines.length) sec.appendChild(h('p', 'hint', 'Use the check-in before and after sessions. Your average shift in tension and energy will appear here.'));
    lines.forEach(([cat, txt, n]) => { const r = h('div', 'insight ' + cat); r.append(h('i', 'seg ' + cat), h('span', '', txt), h('small', '', n)); sec.appendChild(r); });

    // Breath-hold progress for patterns with open holds.
    const withHolds = {};
    log.filter((r) => r.holds && r.holds.length).forEach((r) => { (withHolds[r.pid] = withHolds[r.pid] || []).push(r); });
    for (const recs of Object.values(withHolds)) {
      const pts = recs.slice(-16).map((r) => avg(r.holds));
      const best = Math.max(...recs.flatMap((r) => r.holds));
      const r = h('div', 'insight hold ' + recs[0].cat);
      r.append(h('span', '', `${recs[0].name}: best hold ${fmtClock(best)}`), spark(pts));
      sec.appendChild(r);
    }
    el.appendChild(sec);
  }
  function spark(pts) {
    const w = 90, ht = 26, mx = Math.max(...pts), mn = Math.min(...pts);
    const xy = pts.map((v, i) => [pts.length === 1 ? w / 2 : (i / (pts.length - 1)) * (w - 4) + 2, ht - 3 - ((v - mn) / (mx - mn || 1)) * (ht - 6)]);
    const span = h('span', 'spark');
    span.innerHTML = `<svg viewBox="0 0 ${w} ${ht}" width="${w}" height="${ht}"><polyline points="${xy.map((p) => p.join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${xy[xy.length - 1][0]}" cy="${xy[xy.length - 1][1]}" r="2.5" fill="currentColor"/></svg>`;
    return span;
  }

  function renderHistory() {
    const el = $('#history'); el.textContent = '';
    if (!log.length) { el.appendChild(h('p', 'empty', 'No sessions yet. Your practice will collect here.')); return; }
    let lastDay = '';
    let list = null;
    [...log].reverse().slice(0, 150).forEach((r) => {
      const k = dayKey(r.at);
      if (k !== lastDay) {
        lastDay = k;
        const d = new Date(r.at);
        const today = dayKey(Date.now()) === k, yest = dayKey(Date.now() - 864e5) === k;
        el.appendChild(h('h4', 'list-label', today ? 'Today' : yest ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })));
        list = h('div', 'list'); el.appendChild(list);
      }
      const row = h('div', 'hrow');
      const main = h('button', 'hmain');
      main.append(h('i', 'seg ' + r.cat));
      const txt = h('div', 'htext');
      txt.append(h('b', '', r.name + (r.completed ? '' : ' (ended early)')));
      const meta = [new Date(r.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }), fmtClock(r.dur), r.breaths + ' breaths'];
      if (r.holds) meta.push('best hold ' + fmtClock(Math.max(...r.holds)));
      txt.append(h('span', '', meta.join(' · ')));
      main.appendChild(txt);
      const chips = h('div', 'hchips');
      for (const sc of SCALES) {
        const b = r.before && r.before[sc.key], a = r.after && r.after[sc.key];
        if (b && a) chips.appendChild(h('span', 'chip ' + (a < b ? 'down' : a > b ? 'up' : ''), `${sc.name} ${b}→${a}`));
      }
      if (chips.childNodes.length) main.appendChild(chips);
      row.appendChild(main);
      const more = h('div', 'hmore'); more.hidden = true;
      if (r.note) more.appendChild(h('p', '', r.note));
      const del = h('button', 'link danger-text', 'Delete session');
      del.addEventListener('click', () => {
        if (!confirm('Delete this session?')) return;
        log = log.filter((x) => x.id !== r.id); saveLog(); renderJournal();
      });
      more.appendChild(del);
      row.appendChild(more);
      main.addEventListener('click', () => { more.hidden = !more.hidden; });
      list.appendChild(row);
    });
  }

  $('#exportBtn').addEventListener('click', () => {
    if (!log.length) { toast('Nothing to export yet'); return; }
    const cols = ['date', 'pattern', 'category', 'seconds', 'breaths', 'completed', 'holds', 'tension_before', 'tension_after', 'energy_before', 'energy_after', 'note'];
    const q = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
    const rows = log.map((r) => [new Date(r.at).toISOString(), r.name, r.cat, r.dur, r.breaths, r.completed, (r.holds || []).join(' '),
      r.before && r.before.tension, r.after && r.after.tension, r.before && r.before.energy, r.after && r.after.energy, r.note].map(q).join(','));
    const blob = new Blob([cols.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'breathe-journal.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  /* ---------------- editor ---------------- */
  let draft = null, draftSrc = null, catTouched = false;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function openEditor(src) {
    draftSrc = src && isCustom(src) ? src : null;
    if (src) {
      draft = clone(src);
      if (!draftSrc) { draft.name = src.name + ' (mine)'; delete draft.refs; delete draft.science; }
    } else {
      draft = { name: '', cat: 'settle', minutes: 5, rounds: 3, sets: [{ reps: 1, phases: [{ k: 'in', s: 4 }, { k: 'out', s: 6 }] }] };
    }
    catTouched = !!src;
    $('#editorTitle').textContent = draftSrc ? 'Edit pattern' : src ? 'Customize' : 'New pattern';
    $('#edName').value = draft.name;
    $('#edHow').value = draft.how || '';
    $('#deletePattern').hidden = !draftSrc;
    go('editor');
    renderEditor();
  }

  function renderEditor() {
    renderEditorTop();

    const wrap = $('#edSets'); wrap.textContent = '';
    draft.sets.forEach((set, si) => {
      const box = h('div', 'set');
      const head = h('div', 'set-head');
      head.appendChild(h('h4', 'list-label', draft.sets.length > 1 ? 'Set ' + (si + 1) : 'Steps'));
      if (draft.sets.length > 1) {
        const rm = h('button', 'link danger-text', 'Remove set');
        rm.addEventListener('click', () => { draft.sets.splice(si, 1); renderEditor(); });
        head.appendChild(rm);
      }
      box.appendChild(head);
      const list = h('div', 'list');
      set.phases.forEach((f, fi) => {
        const row = h('div', 'row step');
        const kb = h('button', 'kind ' + f.k);
        kb.append(h('i'), h('span', '', KINDS[f.k].name));
        kb.addEventListener('click', () => pickKind(f));
        const stp = h('div', 'stepper');
        const dn = h('button', '', '−'), up = h('button', '', '+'), out = h('output', '', f.open ? 'max ' + fmtSec(f.s) + ' s' : fmtSec(f.s) + ' s');
        const stepOf = (s, dir) => { const x = dir < 0 ? s - 0.01 : s; return x < 2 ? 0.1 : x < 10 ? 0.5 : x < 60 ? 1 : 5; };
        const bump = (dir) => {
          const st = stepOf(f.s, dir);
          f.s = Math.round(Math.min(600, Math.max(0.3, f.s + st * dir)) * 10) / 10;
          out.textContent = f.open ? 'max ' + fmtSec(f.s) + ' s' : fmtSec(f.s) + ' s';
          clearTimeout(bump.t); bump.t = setTimeout(renderEditorTop, 120);
        };
        holdRepeat(dn, () => bump(-1)); holdRepeat(up, () => bump(1));
        stp.append(dn, out, up);
        const del = h('button', 'x', '×'); del.setAttribute('aria-label', 'Remove step');
        del.disabled = set.phases.length === 1 && draft.sets.length === 1;
        del.addEventListener('click', () => {
          set.phases.splice(fi, 1);
          if (!set.phases.length) draft.sets.splice(si, 1);
          renderEditor();
        });
        row.append(kb, stp, del);
        list.appendChild(row);
        if (HOLDS.has(f.k)) {
          const r2 = h('label', 'row sub');
          const sw = h('input', 'switch'); sw.type = 'checkbox'; sw.checked = !!f.open;
          sw.addEventListener('change', () => {
            f.open = sw.checked;
            if (f.open && f.s < 60) f.s = 180;
            if (!f.open) delete f.open;
            renderEditor();
          });
          r2.append(h('span', '', 'Hold until I tap (logs your hold time)'), sw);
          list.appendChild(r2);
        }
      });
      const add = h('button', 'row add-step', '+ Add step');
      add.addEventListener('click', () => {
        const last = set.phases[set.phases.length - 1];
        const k = !last ? 'in' : last.k === 'in' || last.k === 'in2' || last.k === 'holdIn' ? 'out' : 'in';
        set.phases.push({ k, s: last ? Math.min(last.s, 60) : 4 });
        renderEditor();
      });
      list.appendChild(add);
      const rep = h('div', 'row');
      const rs = h('div', 'stepper');
      const rdn = h('button', '', '−'), rup = h('button', '', '+'), rout = h('output', '', '×' + set.reps);
      const rb = (dir) => {
        set.reps = Math.max(1, Math.min(200, set.reps + dir * (set.reps >= 20 ? 5 : 1)));
        rout.textContent = '×' + set.reps;
        clearTimeout(rb.t); rb.t = setTimeout(renderEditorTop, 120);
      };
      holdRepeat(rdn, () => rb(-1)); holdRepeat(rup, () => rb(1));
      rs.append(rdn, rout, rup);
      rep.append(h('span', '', 'Repeat'), rs);
      list.appendChild(rep);
      box.appendChild(list);
      wrap.appendChild(box);
    });
  }
  // Refresh just the preview while a stepper is held, so the buttons under your finger stay put.
  function renderEditorTop() {
    if (!catTouched) draft.cat = classify(draft);
    $('#editor').dataset.cat = draft.cat;
    $('#edRhythm').innerHTML = wave(draft);
    const { rate, ratio } = stats(draft);
    $('#edMeta').textContent = (isTimed(draft) ? 'One breath ' : 'One round ') + fmtSec(Math.round(roundSec(draft) * 10) / 10) + ' s · ' + fmtRate(rate) + ' breaths/min'
      + (ratio >= 1.15 ? ' · exhale ' + (Math.round(ratio * 10) / 10) + '× inhale' : ratio && ratio <= 0.85 ? ' · inhale-weighted' : '');
    $$('#edCat button').forEach((b) => b.classList.toggle('on', b.dataset.cat === draft.cat));
    const sug = classify(draft);
    $('#edSuggest').textContent = sug === draft.cat ? 'This rhythm reads as ' + CATS[sug].name.toLowerCase() + '.' : 'This rhythm reads more like ' + CATS[sug].name.toLowerCase() + '.';
  }

  function pickKind(f) {
    const list = $('#kindList'); list.textContent = '';
    for (const [k, info] of Object.entries(KINDS)) {
      const b = h('button', 'row kindopt' + (k === f.k ? ' on' : ''));
      const left = h('span', 'kind ' + k); left.append(h('i'), h('span', '', info.name));
      b.append(left, h('small', '', info.desc));
      b.addEventListener('click', () => {
        f.k = k;
        if (!HOLDS.has(k)) delete f.open;
        $('#kindSheet').hidden = true; renderEditor();
      });
      list.appendChild(b);
    }
    $('#kindSheet').hidden = false;
  }

  $$('#edCat button').forEach((b) => b.addEventListener('click', () => { draft.cat = b.dataset.cat; catTouched = true; renderEditor(); }));
  $('#addSet').addEventListener('click', () => {
    if (draft.sets.length === 1 && draft.sets[0].reps === 1) draft.sets[0].reps = 10;
    draft.sets.push({ reps: 1, phases: [{ k: 'holdOut', s: 15 }] });
    renderEditor();
  });
  $('#saveBtn').addEventListener('click', () => {
    draft.name = $('#edName').value.trim() || 'My pattern';
    draft.how = $('#edHow').value.trim() || undefined;
    draft.tagline = summaryLine(draft);
    if (!draft.sets.length) { toast('Add at least one step'); return; }
    if (draftSrc) {
      const keepId = draftSrc.id;
      Object.keys(draftSrc).forEach((k) => delete draftSrc[k]);
      Object.assign(draftSrc, draft, { id: keepId });
      current = draftSrc;
    } else {
      draft.id = 'u' + Date.now().toString(36);
      custom.push(draft);
      current = draft;
    }
    saveCustom();
    toast('Saved');
    const fromSetup = stack[stack.length - 2] === 'setup';
    if (fromSetup) back(); else replaceTop('setup');
  });
  $('#deletePattern').addEventListener('click', () => {
    if (!draftSrc || !confirm('Delete “' + draftSrc.name + '”?')) return;
    custom = custom.filter((p) => p !== draftSrc); saveCustom();
    toRoot();
  });

  /* ---------------- keyboard ---------------- */
  document.addEventListener('keydown', (e) => {
    if (!S || e.target.closest('input, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); const ph = S.plan[S.i]; if (ph.open && !S.paused) $('#stage').click(); else pause(!S.paused); }
    if (e.key === 'Escape') finish(false);
  });

  /* ---------------- boot ---------------- */
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();

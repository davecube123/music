'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const DRUMS = [
    ['CR', 'Crash'], ['RD', 'Ride'], ['HH', 'Hi-hat'], ['HP', 'HH foot'], ['SS', 'X-stick'],
    ['SN', 'Snare'], ['T1', 'Tom 1'], ['T2', 'Tom 2'], ['FT', 'Floor'], ['BD', 'Kick'],
  ];
  const DRUM_NAME = Object.fromEntries(DRUMS);
  const VEL = { X: 1, x: 0.72, o: 0.8, g: 0.28 };
  const VEL_CLASS = { X: 'v3', x: 'v2', g: 'v1', o: 'vo' };

  /* ---------------- storage ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };
  const prefs = Object.assign(
    { click: true, countIn: true, cue: true, strum: true, drumVol: 0.9, clickVol: 0.55, cueVol: 0.6, strumVol: 0.9, lyricSize: 19, tab: 'lyrics' },
    store.get('bb.prefs', {}),
  );
  if (prefs.strumVol === 0.7) prefs.strumVol = 0.9; // old default was too quiet
  const savePrefs = () => store.set('bb.prefs', prefs);
  const songKey = (id) => 'bb.song.' + id;
  const loadLocal = (id) => store.get(songKey(id), {});
  const saveLocal = (id, patch) => store.set(songKey(id), Object.assign(loadLocal(id), patch));

  /* ---------------- song model ---------------- */
  const SONGS = (window.SONGS || []).filter((s) => s && s.id && s.sections);
  const clean = (s) => String(s || '').replace(/[\s|]/g, '');

  function buildPatterns(src, defSteps) {
    const out = {};
    for (const [name, p] of Object.entries(src || {})) {
      const steps = p.steps || defSteps;
      const tracks = {};
      let len = steps;
      for (const [k, v] of Object.entries(p)) {
        if (k === 'steps' || k === 'beats') continue;
        tracks[k] = clean(v);
        len = Math.max(len, tracks[k].length);
      }
      out[name] = { name, steps, beats: p.beats || 0, bars: Math.ceil(len / steps), tracks };
    }
    return out;
  }

  function prepareSong(raw) {
    const local = loadLocal(raw.id);
    const steps = raw.steps || 16;
    const patterns = Object.assign(buildPatterns(raw.patterns, steps), buildPatterns(local.patterns, steps));
    const timeline = [];
    const sections = raw.sections.map((s, si) => {
      const start = timeline.length;
      const seq = s.seq ? s.seq.trim().split(/\s+/) : null;
      const nBars = seq ? seq.length : s.bars;
      for (let b = 0; b < nBars; b++) {
        let pn = seq ? seq[b] : s.pattern;
        let pb = b % ((patterns[pn] && patterns[pn].bars) || 1);
        if (b === 0 && s.first) { pn = s.first; pb = 0; }
        if (b === nBars - 1 && s.fill) { pn = s.fill; pb = 0; }
        if (!patterns[pn]) { console.warn('Unknown pattern', pn, 'in', raw.title); patterns[pn] = { name: pn, steps, bars: 1, tracks: {} }; }
        const cb = s.chords ? s.chords.split('|') : null;
        const chords = cb ? cb[b % cb.length].trim().split(/\s+/).filter(Boolean) : null;
        const strum = clean(s.strum != null ? s.strum : raw.strum || '');
        const strumBeats = s.strumBeats || raw.strumBeats || raw.beats || 4;
        timeline.push({ si, b, pn, pb, chords: chords && chords.length ? chords : null, strum: strum || null, strumBeats });
      }
      return { name: s.name, bars: nBars, chords: s.chords || '', inst: !!s.inst, rate: s.bpm ? s.bpm / raw.bpm : 1, start, end: timeline.length - 1, color: secColor(s.name) };
    });
    const used = new Set();
    Object.values(patterns).forEach((p) => Object.keys(p.tracks).forEach((k) => used.add(k)));
    return {
      raw, id: raw.id, title: raw.title, artist: raw.artist || '', bpm: raw.bpm, beats: raw.beats || 4,
      timeSig: raw.timeSig || '4/4', patterns, timeline, sections, capo: raw.capo || 0,
      // semitones from the shapes you finger to the pitch you hear (capo up, down-tuning negative)
      shift: (raw.capo || 0) + (raw.transpose || 0),
      tuneLabel: raw.capo ? `Capo ${raw.capo}` : (raw.tuning || ''),
      hasChords: raw.sections.some((x) => x.chords),
      mixed: raw.sections.some((x) => x.seq),
      hasStrum: !!raw.strum || raw.sections.some((x) => x.strum),
      drums: DRUMS.map((d) => d[0]).filter((k) => used.has(k)),
      lyrics: local.lyrics != null ? local.lyrics : (raw.lyrics || ''),
    };
  }

  function secColor(name) {
    const n = name.toLowerCase();
    if (/pre/.test(n) && /chorus/.test(n)) return '#c86bfa';
    if (/chorus|refrain|hook/.test(n)) return '#ff6a3d';
    if (/verse/.test(n)) return '#39d0b4';
    if (/bridge/.test(n)) return '#7c8cff';
    if (/solo|instrumental|break|interlude/.test(n)) return '#ffb03b';
    if (/intro|outro|end|coda|tag/.test(n)) return '#8b92a5';
    return '#5aa9ff';
  }

  /* ---------------- audio engine ---------------- */
  let ctx, drumBus, clickBus, cueBus, strumBus, noiseBuf, openHat = null;
  const METAL = [263, 400, 421, 474, 587, 845];

  function initAudio() {
    if (ctx) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* iOS < 16.4 */ }
    ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.1;
    comp.connect(ctx.destination);
    drumBus = ctx.createGain(); drumBus.connect(comp);
    clickBus = ctx.createGain(); clickBus.connect(ctx.destination);
    cueBus = ctx.createGain(); cueBus.connect(ctx.destination);
    // own gentle compressor so the drums don't squash the strum (and loud strokes can't clip)
    const strumComp = ctx.createDynamicsCompressor();
    strumComp.threshold.value = -8; strumComp.ratio.value = 3; strumComp.attack.value = 0.003; strumComp.release.value = 0.08;
    strumComp.connect(ctx.destination);
    strumBus = ctx.createGain(); strumBus.connect(strumComp);
    applyVolumes();
    const len = ctx.sampleRate * 3;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  function applyVolumes() {
    if (!ctx) return;
    drumBus.gain.value = prefs.drumVol;
    clickBus.gain.value = prefs.clickVol;
    cueBus.gain.value = prefs.cueVol;
    strumBus.gain.value = prefs.strumVol;
  }

  function env(t, peak, decay, dest, attack = 0.001) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(dest || drumBus);
    return g;
  }
  function noise(t, dur) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.start(t, Math.random() * Math.max(0, 2.8 - dur));
    s.stop(t + dur + 0.05);
    return s;
  }
  function filt(type, f, q = 0.7) {
    const b = ctx.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    return b;
  }
  function osc(type, t, f0, f1, glide, dur) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function metal(t, decay, peak, type, f) {
    const g = env(t, peak, decay);
    const fl = filt(type, f, type === 'bandpass' ? 1.2 : 0.7);
    fl.connect(g);
    METAL.forEach((m) => osc('square', t, m * 1.9, 0, 0, decay).connect(fl));
  }
  function chokeOpen(t) {
    if (!openHat) return;
    const p = openHat.gain;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else p.cancelScheduledValues(t);
    p.setTargetAtTime(0.0001, t, 0.012);
    openHat = null;
  }
  function tom(t, v, f) {
    osc('sine', t, f * 1.35, f, 0.08, 0.5).connect(env(t, v * 0.9, 0.45));
    noise(t, 0.04).connect(filt('lowpass', 1800)).connect(env(t, v * 0.18, 0.04));
  }

  const SYN = {
    BD(t, v) {
      osc('sine', t, 155, 46, 0.13, 0.45).connect(env(t, v * 1.15, 0.42));
      noise(t, 0.02).connect(filt('lowpass', 2600)).connect(env(t, v * 0.25, 0.02));
    },
    SN(t, v) {
      const dec = v < 0.4 ? 0.09 : 0.21;
      noise(t, dec).connect(filt('highpass', 1100)).connect(env(t, v * 0.8, dec));
      osc('triangle', t, 205, 155, 0.08, 0.12).connect(env(t, v * 0.55, 0.1));
    },
    SS(t, v) {
      noise(t, 0.05).connect(filt('bandpass', 2200, 2)).connect(env(t, v * 0.9, 0.05));
      osc('triangle', t, 900, 700, 0.03, 0.04).connect(env(t, v * 0.35, 0.035));
    },
    HH(t, v, ch) {
      chokeOpen(t);
      if (ch === 'o') {
        const g = env(t, v * 0.32, 0.55);
        noise(t, 0.55).connect(filt('highpass', 6500)).connect(g);
        metal(t, 0.4, v * 0.04, 'highpass', 8000);
        openHat = g;
        return;
      }
      noise(t, 0.06).connect(filt('highpass', 7500)).connect(env(t, v * 0.42, 0.05));
    },
    HP(t, v) {
      chokeOpen(t);
      noise(t, 0.05).connect(filt('bandpass', 3800, 1.5)).connect(env(t, v * 0.4, 0.045));
    },
    RD(t, v, ch) {
      if (ch === 'o') {
        metal(t, 1.0, v * 0.12, 'bandpass', 3000);
        osc('sine', t, 2350, 0, 0, 0.8).connect(env(t, v * 0.12, 0.8));
      } else {
        metal(t, 1.2, v * 0.06, 'bandpass', 7000);
        noise(t, 0.3).connect(filt('highpass', 8000)).connect(env(t, v * 0.12, 0.3));
      }
    },
    CR(t, v) {
      noise(t, 1.8).connect(filt('highpass', 4200)).connect(env(t, v * 0.42, 1.7, null, 0.003));
      metal(t, 1.3, v * 0.05, 'highpass', 5000);
    },
    T1(t, v) { tom(t, v, 220); },
    T2(t, v) { tom(t, v, 165); },
    FT(t, v) { tom(t, v, 110); },
  };

  function click(t, accent, count) {
    const f = count ? (accent ? 1320 : 990) : (accent ? 1760 : 1180);
    osc('triangle', t, f, 0, 0, 0.05).connect(env(t, accent ? 0.7 : 0.45, 0.045, clickBus));
  }

  /* ---------------- chord cue (soft held root + chord tones) ---------------- */
  // Not rhythmic on purpose: one gentle tone per chord change, held until the next,
  // so the drums carry the groove and the cue only anchors pitch and harmony.
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const QUALITY = [
    [/^(m|min)(?!aj)7/, [0, 3, 7, 10]], [/^(m|min)(?!aj)/, [0, 3, 7]], [/^maj7/, [0, 4, 7, 11]],
    [/^7/, [0, 4, 7, 10]], [/^6/, [0, 4, 7, 9]], [/^sus2/, [0, 2, 7]], [/^sus/, [0, 5, 7]],
    [/^add9/, [0, 4, 7, 14]], [/^4/, [0, 5, 7]], [/^dim7/, [0, 3, 6, 9]], [/^dim/, [0, 3, 6]], [/^(aug|\+)/, [0, 4, 8]],
  ];
  function chordTones(name) {
    const m = String(name).replace(/\/.*$/, '').match(/^([A-G])([#b]?)(.*)$/);
    if (!m) return null;
    const root = (NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
    const q = QUALITY.find(([re]) => re.test(m[3]));
    return { root, intervals: q ? q[1] : [0, 4, 7] };
  }
  const isRest = (c) => !c || c === '-' || /^n\.?c\.?$/i.test(c);

  let cueVoices = [];
  function cueRelease(t) {
    cueVoices.forEach(({ o, g }) => {
      const p = g.gain;
      if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else p.cancelScheduledValues(t);
      p.setTargetAtTime(0.0001, t, 0.09);
      try { o.stop(t + 0.8); } catch { /* already stopped */ }
    });
    cueVoices = [];
  }
  function cue(name, t) {
    cueRelease(t);
    const c = isRest(name) ? null : chordTones(name);
    if (!c) return;
    const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
    const base = 48 + (((c.root + song.shift) % 12) + 12) % 12; // root in the C3–B3 range
    const tone = filt('lowpass', 1600);
    tone.connect(cueBus);
    const voice = (midi, type, level) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = hz(midi);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level, t + 0.05);
      g.gain.setTargetAtTime(level * 0.45, t + 0.05, 0.7); // settle into a quiet hold
      o.connect(g).connect(tone);
      o.start(t);
      cueVoices.push({ o, g });
    };
    voice(base, 'sine', 0.32);
    voice(base, 'triangle', 0.1);
    c.intervals.slice(1).forEach((iv) => voice(base + 12 + iv, 'sine', 0.06));
  }
  function cueSilence(t) { if (ctx) cueRelease(t); }

  /* ---------------- strum track (rhythm only, no pitch) ---------------- */
  // A strummed guitar's rhythm without its notes: filtered noise swept across the
  // "strings" — downstrokes sweep up and sound fuller, upstrokes sweep down and lighter.
  function strumSweep(t, f0, f1, q, peak, dur, att) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + 0.035);
    noise(t, dur).connect(bp).connect(env(t, peak, dur, strumBus, att));
  }
  function strumSound(t, ch) {
    const v = ch === 'd' || ch === 'u' ? 0.6 : 1;
    if (ch === 'D' || ch === 'd') {        // downstroke: low → high sweep, with some body
      strumSweep(t, 450, 2200, 0.55, v * 1.7, 0.22, 0.006);
      noise(t, 0.12).connect(filt('highpass', 3200)).connect(env(t, v * 0.35, 0.12, strumBus, 0.006));
      osc('triangle', t, 125, 100, 0.06, 0.1).connect(env(t, v * 0.3, 0.09, strumBus));
    } else if (ch === 'U' || ch === 'u') { // upstroke: high → low sweep, lighter
      strumSweep(t, 3200, 1400, 0.6, v * 1.05, 0.15, 0.004);
      noise(t, 0.08).connect(filt('highpass', 3500)).connect(env(t, v * 0.3, 0.08, strumBus, 0.004));
    } else if (ch === 'x') {               // muted chuck
      noise(t, 0.06).connect(filt('bandpass', 1500, 0.8)).connect(env(t, 1.5, 0.05, strumBus));
      osc('sine', t, 170, 90, 0.03, 0.05).connect(env(t, 0.45, 0.045, strumBus));
    } else if (ch === 'p') {               // single picked note, as a soft tick
      noise(t, 0.09).connect(filt('bandpass', 2000, 1.4)).connect(env(t, 1.3, 0.085, strumBus, 0.002));
      osc('triangle', t, 330, 0, 0, 0.09).connect(env(t, 0.18, 0.08, strumBus));
    }
  }
  const STRUM_GLYPH = { D: '↓', d: '↓', U: '↑', u: '↑', x: '✕', p: '•', '-': '' };
  // events in a bar: the pattern covers `strumBeats` beats and repeats to fill the bar's meter
  function strumEvents(bar) {
    const tl = song.timeline[bar];
    if (!tl || !tl.strum) return [];
    const L = tl.strum.length, perBeat = L / tl.strumBeats, n = Math.round(barBeats(bar) * perBeat);
    return Array.from({ length: n }, (_, g) => tl.strum[g % L]);
  }

  /* ---------------- chord shapes (guitar diagrams) ---------------- */
  // Frets from low E to high e; x = muted. Shapes are as played (relative to the capo).
  const SHAPES = {
    C: 'x32010', C7: 'x32310', Cmaj7: 'x32000', Cadd9: 'x32030', D: 'xx0232', D7: 'xx0212', Dm: 'xx0231',
    Dm7: 'xx0211', Dsus2: 'xx0230', Dsus4: 'xx0233', Dmaj7: 'xx0222', E: '022100', E7: '020100', Em: '022000',
    Em7: '022030', Emaj7: '021100', Esus4: '022200', F: '133211', Fmaj7: 'xx3210', F6: 'xx3231', G: '320003',
    G7: '320001', G6: '320000', Gmaj7: '320002', A: 'x02220', A7: 'x02020', A6: 'x02222', Am: 'x02210',
    Am7: 'x02010', Amaj7: 'x02120', Asus2: 'x02200', Asus4: 'x02230', B7: 'x21202', Bm: 'x24432', B: 'x24442',
    Bb: 'x13331', 'F#': '244322', 'F#m': '244222', 'C#m': 'x46654', 'C#m7': 'x46454', 'G#m': '466444',
    Abdim7: 'xx0101',
    // slash chords / inversions
    'D4/A': 'x00233', 'G/D': 'xx0433', 'Bm/A': 'x04432', 'F#7/E': '0x4320', 'D/C#': 'x4x232', 'E7/G#': '4x0100',
    'A/G#': '4x2220', 'G/F#': '2x0003', 'Dm/C': 'x3x231', 'G7/B': 'x2x001', 'C/B': 'x2x010', 'Bb/A': 'x0333x',
    'D/F#': '2x0232', 'A7/C#': 'x42223', 'B7/D#': 'x6x475', 'C/E': '032010', 'C/G': '332010', 'G/B': 'x20003', 'Am/G': '3x2210', 'D/A': 'x00232',
  };
  // movable fallbacks: [root on low E, root on A], relative frets
  const MOVABLE = {
    '': [[0, 2, 2, 1, 0, 0], [null, 0, 2, 2, 2, 0]], m: [[0, 2, 2, 0, 0, 0], [null, 0, 2, 2, 1, 0]],
    7: [[0, 2, 0, 1, 0, 0], [null, 0, 2, 0, 2, 0]], m7: [[0, 2, 0, 0, 0, 0], [null, 0, 2, 0, 1, 0]],
    maj7: [[0, 2, 1, 1, 0, 0], [null, 0, 2, 1, 2, 0]], sus4: [[0, 2, 2, 2, 0, 0], [null, 0, 2, 2, 3, 0]],
    sus2: [[0, 2, 4, 4, 0, 0], [null, 0, 2, 2, 0, 0]], 6: [[0, 2, 2, 1, 2, 0], [null, 0, 2, 2, 2, 2]],
  };
  const shapeCache = {};
  function shapeFor(name) {
    if (name in shapeCache) return shapeCache[name];
    const parse = (str) => str.split('').map((c) => (c === 'x' ? null : +c));
    let frets = null;
    if (SHAPES[name]) frets = parse(SHAPES[name]);
    else {
      const bare = String(name).replace(/\/.*$/, '');
      if (SHAPES[bare]) frets = parse(SHAPES[bare]);
      else {
        const m = bare.match(/^([A-G])([#b]?)(.*)$/);
        if (m) {
          const root = (NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
          let q = m[3];
          if (!MOVABLE[q]) q = /^m(?!aj)/.test(q) ? (/7/.test(q) ? 'm7' : 'm') : /maj7/.test(q) ? 'maj7' : /7/.test(q) ? '7' : /sus|^4/.test(q) ? 'sus4' : '';
          const fe = (root - 4 + 12) % 12, fa = (root - 9 + 12) % 12;
          const useE = fe <= fa;
          frets = MOVABLE[q][useE ? 0 : 1].map((f) => (f == null ? null : f + (useE ? fe : fa)));
        }
      }
    }
    return (shapeCache[name] = frets);
  }

  function chordSVG(name) {
    const frets = isRest(name) ? null : shapeFor(name);
    if (!frets) return `<svg viewBox="0 0 60 74"><text class="cd-none" x="30" y="42" text-anchor="middle">${isRest(name) ? 'no chord' : '?'}</text></svg>`;
    const L = 12, ss = 8.4, T = 16, fs = 11.4;
    const played = frets.filter((f) => f != null && f > 0);
    const max = played.length ? Math.max(...played) : 0;
    const base = max <= 4 ? 1 : Math.min(...played);
    const x = (i) => L + i * ss;
    let out = '';
    for (let i = 0; i < 6; i++) out += `<line class="cd-grid" x1="${x(i)}" y1="${T}" x2="${x(i)}" y2="${T + 5 * fs}"/>`;
    for (let r = 0; r <= 5; r++) out += `<line class="cd-grid" x1="${L}" y1="${T + r * fs}" x2="${x(5)}" y2="${T + r * fs}"/>`;
    if (base === 1) out += `<line class="cd-nut" x1="${L}" y1="${T}" x2="${x(5)}" y2="${T}"/>`;
    else out += `<text class="cd-fr" x="${L - 3}" y="${T + fs * 0.5 + 3}" text-anchor="end">${base}</text>`;
    // barre: lowest fret held on the first played string and the top string
    const first = frets.findIndex((f) => f != null);
    const mf = played.length ? Math.min(...played) : 0;
    const on = frets.map((f, i) => (f === mf ? i : -1)).filter((i) => i >= 0);
    const solid = frets.slice(first).every((f) => f != null && f >= mf);
    if (mf && solid && on.length >= 2 && frets[first] === mf && frets[5] === mf) {
      const cy = T + (mf - base + 0.5) * fs;
      out += `<rect class="cd-dot" x="${x(first) - 3.6}" y="${cy - 3.6}" width="${x(5) - x(first) + 7.2}" height="7.2" rx="3.6"/>`;
    }
    frets.forEach((f, i) => {
      if (f == null) out += `<path class="cd-x" d="M${x(i) - 2.6} ${T - 9.6}l5.2 5.2m0 -5.2l-5.2 5.2"/>`;
      else if (f === 0) out += `<circle class="cd-mark" cx="${x(i)}" cy="${T - 7}" r="2.6"/>`;
      else out += `<circle class="cd-dot" cx="${x(i)}" cy="${T + (f - base + 0.5) * fs}" r="3.6"/>`;
    });
    return `<svg viewBox="0 0 60 ${T + 5 * fs + 3}" role="img" aria-label="${esc(name)} chord shape">${out}</svg>`;
  }

  // Chord sounding at a fraction (0..1) through a bar.
  function chordAt(bar, frac) {
    const c = bar >= 0 && song.timeline[bar] && song.timeline[bar].chords;
    return c ? c[Math.min(c.length - 1, Math.floor(frac * c.length + 1e-9))] : null;
  }
  function nextChordAfter(bar, frac) {
    const cur = chordAt(bar, frac);
    for (let b = bar; b < Math.min(song.timeline.length, bar + 8); b++) {
      const c = song.timeline[b].chords;
      if (!c) continue;
      for (let j = 0; j < c.length; j++) {
        if (b === bar && (j + 1) / c.length <= frac + 1e-9) continue;
        if (c[j] !== cur && c[j] !== '-') return c[j];
      }
    }
    return null;
  }

  /* ---------------- app state ---------------- */
  let song = null;
  const S = { bpm: 120, pos: 0, loop: false, muted: new Set(), edit: false };
  const P = { playing: false, bar: 0, step: 0, nextTime: 0, timer: null, queue: [], startBar: 0, jump: null };
  const D = { bar: -99, step: -1, grid: null, gridSteps: 0, lyricSec: -1, lyricLine: -1, chartBars: [] };

  const pat = (name) => song.patterns[name];
  const barSteps = (bar) => (bar < 0 ? song.beats : pat(song.timeline[bar].pn).steps);
  const barBeats = (bar) => (bar < 0 ? song.beats : pat(song.timeline[bar].pn).beats || song.beats);
  // A section may set its own bpm (songs that speed up); it scales with the user's tempo.
  const rateAt = (bar) => song.sections[song.timeline[bar < 0 ? P.startBar : bar].si].rate;
  const stepDur = (bar) => (barBeats(bar) * 60 / (S.bpm * rateAt(bar))) / barSteps(bar);
  function beatOf(bar, step) {
    const per = barSteps(bar) / barBeats(bar);
    const q = step / per;
    return Math.abs(q - Math.round(q)) < 1e-6 ? Math.round(q) : -1;
  }

  /* ---------------- scheduler (look-ahead) ---------------- */
  function start() {
    initAudio();
    if (ctx.state !== 'running') ctx.resume();
    P.startBar = S.pos;
    P.bar = prefs.countIn ? -(song.beats <= 2 ? 2 : 1) : S.pos;
    P.step = 0;
    P.jump = null;
    P.cueChord = undefined;
    P.queue = [];
    P.nextTime = ctx.currentTime + 0.1;
    P.playing = true;
    P.timer = setInterval(schedule, 25);
    schedule();
    $('#playBtn').classList.add('playing');
    $('#playBtn').setAttribute('aria-label', 'Stop');
    wake(true);
  }

  function stop(ended) {
    clearInterval(P.timer);
    cueSilence(ctx.currentTime);
    P.playing = false;
    P.queue = [];
    if (ended) S.pos = 0;
    else if (D.bar >= 0) S.pos = song.sections[song.timeline[D.bar].si].start;
    $('#playBtn').classList.remove('playing');
    $('#playBtn').setAttribute('aria-label', 'Play');
    wake(false);
    D.lyricLine = -1;
    showPosition(S.pos, -1);
  }

  function schedule() {
    while (P.playing && P.bar !== null && P.nextTime < ctx.currentTime + 0.12) {
      playStep(P.bar, P.step, P.nextTime);
      P.queue.push({ t: P.nextTime, bar: P.bar, step: P.step });
      P.nextTime += stepDur(P.bar);
      if (++P.step >= barSteps(P.bar)) { P.step = 0; P.bar = nextBar(P.bar); }
    }
    if (P.playing && P.bar === null && ctx.currentTime > P.nextTime + 0.3) stop(true);
  }

  function nextBar(b) {
    if (b < -1) return b + 1;
    if (b === -1) return P.startBar;
    if (P.jump != null) { const j = P.jump; P.jump = null; return j; }
    if (S.loop) {
      const sec = song.sections[song.timeline[b].si];
      if (b === sec.end) return sec.start;
    }
    return b + 1 < song.timeline.length ? b + 1 : null;
  }

  function playStep(bar, step, t) {
    const beat = beatOf(bar, step);
    if (bar < 0) { if (beat >= 0) click(t, beat === 0, true); return; }
    if (prefs.click && beat >= 0) click(t, beat === 0, false);
    const tl = song.timeline[bar];
    const p = pat(tl.pn);
    const i = tl.pb * p.steps + step;
    if (prefs.strum && tl.strum) {
      const ev = strumEvents(bar), E = ev.length;
      for (let g = Math.ceil(step * E / p.steps - 1e-9); g < (step + 1) * E / p.steps - 1e-9; g++) {
        if (ev[g] && ev[g] !== '-') strumSound(t + (g * p.steps / E - step) * stepDur(bar), ev[g]);
      }
    }
    if (prefs.cue && song.hasChords) {
      // sound a cue where the chord changes (and at the top of each section), on the exact step
      const n = tl.chords ? tl.chords.length : 1;
      for (let j = Math.ceil(step * n / p.steps - 1e-9); j < (step + 1) * n / p.steps - 1e-9; j++) {
        const name = tl.chords ? tl.chords[j] : 'N.C.';
        if (name === P.cueChord && !(tl.b === 0 && j === 0)) continue;
        P.cueChord = name;
        cue(name, t + (j * p.steps / n - step) * stepDur(bar));
      }
    }
    for (const k in p.tracks) {
      if (S.muted.has(k) || !SYN[k]) continue;
      const ch = p.tracks[k][i];
      if (ch && VEL[ch]) SYN[k](t, VEL[ch], ch);
    }
  }

  function frame() {
    if (P.playing && ctx) {
      const now = ctx.currentTime - (ctx.outputLatency || 0) - (ctx.baseLatency || 0);
      let ev = null;
      while (P.queue.length && P.queue[0].t <= now) ev = P.queue.shift();
      if (ev) showPosition(ev.bar, ev.step);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- wake lock ---------------- */
  let lock = null;
  async function wake(on) {
    try {
      if (on && 'wakeLock' in navigator && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); }
      if (!on && lock) { await lock.release(); lock = null; }
    } catch { lock = null; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && P.playing) wake(true); });

  /* ---------------- rendering ---------------- */
  function showPosition(bar, step) {
    const barChanged = bar !== D.bar;
    D.bar = bar; D.step = step;
    if (barBeats(bar) !== D.dotBeats) renderBeatDots(barBeats(bar));
    const dots = $$('#beatDots .dot');
    const beat = step >= 0 ? beatOf(bar, step) : -1;
    if (beat >= 0 || step < 0) dots.forEach((d, i) => { d.classList.toggle('on', i === beat && bar >= 0); d.classList.toggle('count', i === beat && bar < 0); });

    if (bar < 0) {
      const n = song.beats * (bar + (song.beats <= 2 ? 2 : 1)) + Math.max(beat, 0) + 1;
      if (beat >= 0) $('#posLabel').innerHTML = `Count-in <small>${n}</small>`;
      return;
    }
    const tl = song.timeline[bar];
    const sec = song.sections[tl.si];
    if (barChanged) {
      $('#posLabel').innerHTML = `${esc(sec.name)} <small>· bar ${tl.b + 1}/${sec.bars}${song.mixed ? ` · ${barBeats(bar)}/4` : ''}${sec.rate !== 1 ? ` · ${Math.round(S.bpm * sec.rate)} bpm` : ''}</small>`;
      renderGridBar(bar);
      $$('#sections .sec').forEach((el, i) => {
        el.classList.toggle('active', i === tl.si);
        el.classList.toggle('done', i < tl.si);
        if (i !== tl.si) el.querySelector('.fill').style.width = '';
      });
    }
    const p = pat(tl.pn);
    const prog = (tl.b + Math.max(step, 0) / p.steps) / sec.bars;
    const fill = $$('#sections .fill')[tl.si];
    if (fill) fill.style.width = (step < 0 && tl.b === 0 ? 0 : prog * 100) + '%';
    if (D.grid) D.grid.forEach((row) => row.forEach((c, i) => c.classList.toggle('now', i === step)));
    if (song.hasStrum) {
      if (barChanged) {
        const ev = strumEvents(bar);
        $('#strumStrip').innerHTML = ev.map((c, i) => `<i class="${c === 'D' || c === 'U' ? 'hard' : ''}${i % (ev.length / barBeats(bar)) === 0 ? ' beat' : ''}">${STRUM_GLYPH[c] || ''}</i>`).join('');
        $('#strumStrip').classList.toggle('empty', !ev.length);
        D.strumCells = $$('#strumStrip i');
      }
      const n = D.strumCells.length;
      const cur = step >= 0 && n ? Math.floor((step / p.steps) * n + 1e-9) : -1;
      if (cur !== D.strumCur) { D.strumCells.forEach((el, i) => el.classList.toggle('on', i === cur)); D.strumCur = cur; }
    }
    updateLyrics(tl.si, prog);
    if (song.hasChords) {
      const frac = Math.max(step, 0) / p.steps;
      const c = chordAt(bar, frac) || 'N.C.', n = nextChordAfter(bar, frac);
      if (c !== D.chord) {
        D.chord = c;
        $('#chordNow').textContent = isRest(c) ? '—' : c;
        $('#diagNow').innerHTML = chordSVG(c);
        $$('#shapes .shape').forEach((el) => el.classList.toggle('on', el.dataset.chord === c));
      }
      if (n !== D.next) {
        D.next = n;
        $('#nextBox').hidden = !n;
        if (n) { $('#chordNext').textContent = n; $('#diagNext').innerHTML = chordSVG(n); }
      }
      if (barChanged) {
        D.chartBars.forEach((el, i) => el.classList.toggle('on', i === bar));
        const el = D.chartBars[bar];
        if (el && prefs.tab === 'chords' && D.bar >= 0) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  /* ---------------- chords tab ---------------- */
  const collapse = (list) => list.filter((c, i) => i === 0 || c !== list[i - 1]);
  function renderChordsTab() {
    D.chartBars = [];
    const seen = [];
    song.timeline.forEach((tl) => (tl.chords || []).forEach((c) => { if (!isRest(c) && !seen.includes(c)) seen.push(c); }));
    $('#shapesCapo').textContent = song.tuneLabel ? `· ${song.tuneLabel.toLowerCase()}` : '';
    $('#shapes').innerHTML = seen.map((c) => `<div class="shape" data-chord="${esc(c)}"><b>${esc(c)}</b><div class="diagram">${chordSVG(c)}</div></div>`).join('');
    const chart = $('#chart');
    chart.innerHTML = '';
    song.sections.forEach((sec) => {
      const box = document.createElement('div');
      box.className = 'chart-sec';
      box.innerHTML = `<h4><i style="background:${sec.color}"></i>${esc(sec.name)} <small>· ${sec.bars} bars${sec.rate !== 1 ? ` · ${Math.round(song.bpm * sec.rate)} bpm` : ''}</small></h4>`;
      const bars = document.createElement('div');
      bars.className = 'bars';
      for (let b = sec.start; b <= sec.end; b++) {
        const tl = song.timeline[b];
        const el = document.createElement('button');
        el.className = 'bar';
        const list = tl.chords ? collapse(tl.chords) : ['N.C.'];
        el.innerHTML = list.map((c) => (isRest(c) ? '<span class="rest">—</span>' : `<span>${esc(c)}</span>`)).join('')
          + (song.mixed ? `<em class="meter">${barBeats(b)}/4</em>` : '');
        el.onclick = () => jumpToBar(b);
        bars.appendChild(el);
        D.chartBars[b] = el;
      }
      box.appendChild(bars);
      chart.appendChild(box);
    });
  }

  // compact progression for a section header, e.g. "A D A D G Gmaj7 …"
  function sectionChords(sec) {
    if (!sec.chords) return '';
    const list = collapse(sec.chords.split(/[\s|]+/).filter(Boolean)).filter((c) => !isRest(c));
    return list.join(' ');
  }

  /* ---------------- tabs ---------------- */
  function setTab(name) {
    if (name === 'chords' && !song.hasChords) name = 'lyrics';
    prefs.tab = name; savePrefs();
    $$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === name));
    $$('.tabpanel').forEach((p) => p.classList.toggle('on', p.dataset.panel === name));
  }

  function renderSections() {
    const box = $('#sections');
    box.innerHTML = '';
    song.sections.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'sec';
      b.style.flexGrow = s.bars;
      b.style.background = `color-mix(in srgb, ${s.color} 22%, #252a37)`;
      b.title = `${s.name} (${s.bars} bars)`;
      b.innerHTML = `<div class="fill" style="background:${s.color}"></div><span>${esc(s.name)}</span>`;
      b.onclick = () => jumpTo(i);
      box.appendChild(b);
    });
  }

  function jumpTo(si) { jumpToBar(song.sections[si].start); }
  function jumpToBar(bar) {
    const tl = song.timeline[bar], sec = song.sections[tl.si];
    if (P.playing) {
      if (P.bar < 0) P.startBar = bar;
      else { P.jump = bar; toast(`Next bar → ${sec.name}${tl.b ? ` bar ${tl.b + 1}` : ''}`); }
    } else {
      S.pos = bar;
      showPosition(S.pos, -1);
    }
  }

  function renderBeatDots(n = song.beats) {
    D.dotBeats = n;
    $('#beatDots').innerHTML = Array.from({ length: n }, (_, i) => `<i class="dot${i === 0 ? ' first' : ''}"></i>`).join('');
  }

  function buildGrid(steps, beats = song.beats) {
    const g = $('#grid');
    g.innerHTML = '';
    D.grid = [];
    D.gridSteps = steps;
    D.gridBeats = beats;
    const per = steps / beats;
    song.drums.forEach((k) => {
      const row = document.createElement('div');
      row.className = 'grow' + (S.muted.has(k) ? ' muted' : '');
      row.dataset.k = k;
      const lab = document.createElement('button');
      lab.className = 'glabel' + (S.muted.has(k) ? ' muted' : '');
      lab.textContent = DRUM_NAME[k];
      lab.onclick = () => toggleMute(k);
      const cells = document.createElement('div');
      cells.className = 'gcells';
      cells.style.gridTemplateColumns = `repeat(${steps}, 1fr)`;
      const list = [];
      for (let i = 0; i < steps; i++) {
        const c = document.createElement('button');
        c.className = 'gc' + (Math.floor(i / per) % 2 === 0 ? ' beat' : '');
        c.dataset.i = i;
        c.onclick = () => editCell(k, i);
        cells.appendChild(c);
        list.push(c);
      }
      row.append(lab, cells);
      g.appendChild(row);
      D.grid.push(list);
    });
  }

  function renderGridBar(bar) {
    const tl = song.timeline[bar];
    const p = pat(tl.pn);
    if (p.steps !== D.gridSteps || barBeats(bar) !== D.gridBeats || !D.grid) buildGrid(p.steps, barBeats(bar));
    $('#patName').textContent = `· ${tl.pn}${p.bars > 1 ? ` ${tl.pb + 1}/${p.bars}` : ''}`;
    song.drums.forEach((k, r) => {
      const str = p.tracks[k] || '';
      D.grid[r].forEach((c, i) => {
        const ch = str[tl.pb * p.steps + i];
        c.classList.remove('v1', 'v2', 'v3', 'vo');
        if (VEL_CLASS[ch]) c.classList.add(VEL_CLASS[ch]);
      });
    });
  }

  function toggleMute(k) {
    if (S.muted.has(k)) S.muted.delete(k); else S.muted.add(k);
    saveLocal(song.id, { muted: [...S.muted] });
    $$('#grid .grow').forEach((row) => {
      const m = S.muted.has(row.dataset.k);
      row.classList.toggle('muted', m);
      row.querySelector('.glabel').classList.toggle('muted', m);
    });
  }

  function editCell(k, i) {
    if (!S.edit || D.bar < 0) return;
    const tl = song.timeline[D.bar];
    const p = pat(tl.pn);
    const idx = tl.pb * p.steps + i;
    const cycle = (k === 'HH' || k === 'RD') ? ['-', 'x', 'X', 'g', 'o'] : ['-', 'x', 'X', 'g'];
    let str = (p.tracks[k] || '').padEnd(p.bars * p.steps, '-');
    const cur = VEL[str[idx]] ? str[idx] : '-';
    const nxt = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
    str = str.slice(0, idx) + nxt + str.slice(idx + 1);
    p.tracks[k] = str;
    const local = loadLocal(song.id);
    const lp = local.patterns || {};
    lp[p.name] = Object.assign({ steps: p.steps }, p.tracks);
    saveLocal(song.id, { patterns: lp });
    renderGridBar(D.bar);
  }

  /* ---------------- lyrics ---------------- */
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const baseName = (s) => norm(s).replace(/\d+$/, '');

  function parseLyrics(text) {
    const blocks = [];
    let cur = null;
    String(text || '').split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*\[(.+?)\]\s*$/);
      if (m) { cur = { name: m[1].split(':')[0].trim(), lines: [] }; blocks.push(cur); return; }
      if (!cur) { cur = { name: null, lines: [] }; blocks.push(cur); }
      cur.lines.push(line);
    });
    blocks.forEach((b) => {
      while (b.lines.length && !b.lines[0].trim()) b.lines.shift();
      while (b.lines.length && !b.lines[b.lines.length - 1].trim()) b.lines.pop();
    });
    return blocks.filter((b) => b.name || b.lines.length);
  }

  function blockFor(name, blocks) {
    const n = norm(name), b = baseName(name);
    return blocks.find((x) => x.name && norm(x.name) === n)
      || blocks.find((x) => x.name && norm(x.name) === b)
      || blocks.find((x) => x.name && baseName(x.name) === b) || null;
  }

  function lineHtml(l) {
    const t = l.trim();
    if (!t) return '<span class="ln blank"><br></span>';
    const instr = /^\(.*\)$/.test(t);
    return `<span class="ln${instr ? ' instr' : ' sing'}">${esc(l)}</span>\n`;
  }

  function renderLyrics() {
    const box = $('#lyrics');
    D.lyricSec = -1; D.lyricLine = -1;
    const blocks = parseLyrics(song.lyrics);
    box.classList.remove('static');
    if (!blocks.length) {
      box.innerHTML = `<div class="lyrics-empty">No lyrics yet. Tap <b>Edit</b> to paste them, using headers that match the sections: ${song.sections.map((s) => `<code>[${esc(s.name)}]</code>`).join(' ')}</div>`;
      return;
    }
    if (blocks.every((b) => !b.name)) {
      box.classList.add('static');
      box.innerHTML = `<div class="lblock"><p>${blocks[0].lines.map(lineHtml).join('')}</p></div>`;
      return;
    }
    const usedBlocks = new Set();
    box.innerHTML = song.sections.map((s, i) => {
      const bl = blockFor(s.name, blocks);
      if (bl) usedBlocks.add(bl);
      const body = bl && bl.lines.length ? bl.lines.map(lineHtml).join('') : '<span class="ln instr">—</span>';
      const ch = sectionChords(s);
      return `<div class="lblock" data-si="${i}"><h4>${esc(s.name)} <small>· ${s.bars} bars</small>${ch ? `<span class="lchords">${esc(ch)}</span>` : ''}</h4><p>${body}</p></div>`;
    }).join('') + blocks.filter((b) => !usedBlocks.has(b) && b.name).map((b) =>
      `<div class="lblock" style="opacity:.4"><h4>[${esc(b.name)}] <small>· no matching section</small></h4><p>${b.lines.map(lineHtml).join('')}</p></div>`,
    ).join('');
    $$('#lyrics .lblock[data-si]').forEach((el) => { el.onclick = () => jumpTo(+el.dataset.si); });
  }

  function updateLyrics(si, prog) {
    const box = $('#lyrics');
    if (box.classList.contains('static')) return;
    const blocks = $$('#lyrics .lblock[data-si]');
    const el = blocks[si];
    if (!el) return;
    if (D.lyricSec !== si) {
      blocks.forEach((b, i) => b.classList.toggle('active', i === si));
      D.lyricSec = si; D.lyricLine = -1;
      if (P.playing && prefs.tab === 'lyrics') el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    const lines = el.querySelectorAll('.ln.sing');
    const li = lines.length ? Math.min(lines.length - 1, Math.floor(prog * lines.length)) : -1;
    if (li !== D.lyricLine) {
      lines.forEach((l, i) => l.classList.toggle('cur', i === li && P.playing));
      D.lyricLine = li;
    }
  }

  /* ---------------- tempo ---------------- */
  let saveT = null;
  function setBpm(v) {
    v = Math.round(Math.min(300, Math.max(20, Number(v) || song.bpm)));
    S.bpm = v;
    if (document.activeElement !== $('#bpmInput')) $('#bpmInput').value = v;
    $('#bpmSlider').value = v;
    $('#pct').textContent = Math.round((v / song.bpm) * 100) + '%';
    $$('.chips [data-pct]').forEach((c) => c.classList.toggle('on', Math.round(song.bpm * c.dataset.pct / 100) === v));
    clearTimeout(saveT);
    saveT = setTimeout(() => saveLocal(song.id, { bpm: v === song.bpm ? undefined : v }), 300);
  }

  function holdRepeat(btn, delta) {
    let t1, t2;
    const end = () => { clearTimeout(t1); clearInterval(t2); };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setBpm(S.bpm + delta);
      t1 = setTimeout(() => { t2 = setInterval(() => setBpm(S.bpm + delta), 70); }, 400);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, end));
  }

  const taps = [];
  function tap() {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
    taps.push(now);
    if (taps.length > 6) taps.shift();
    const btn = $('#tapBtn');
    btn.classList.add('flash');
    setTimeout(() => btn.classList.remove('flash'), 90);
    if (taps.length >= 2) {
      const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
      setBpm(60000 / avg);
    }
  }

  /* ---------------- views ---------------- */
  function renderLibrary() {
    const q = norm($('#search').value);
    const list = SONGS.filter((s) => !q || norm(s.title + s.artist).includes(q));
    $('#songList').innerHTML = list.length ? list.map((s) => {
      const local = loadLocal(s.id);
      const hue = [...s.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
      const ini = s.title.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
      return `<li><button class="song-card" data-id="${esc(s.id)}">
        <span class="song-art" style="background:linear-gradient(135deg,hsl(${hue} 80% 55%),hsl(${(hue + 40) % 360} 70% 40%))">${esc(ini)}</span>
        <span class="song-info"><b>${esc(s.title)}</b><span>${esc(s.artist || '')}</span></span>
        <span class="song-tags"><b>${local.bpm || s.bpm}</b> bpm<br>${esc(s.timeSig || '4/4')}</span>
      </button></li>`;
    }).join('') : '<li class="empty">No songs match.</li>';
    $('#songCount').textContent = `${SONGS.length} songs`;
    $$('.song-card').forEach((b) => { b.onclick = () => { location.hash = '#/song/' + encodeURIComponent(b.dataset.id); }; });
  }

  function openSong(id) {
    const raw = SONGS.find((s) => s.id === id);
    if (!raw) { location.hash = ''; return; }
    if (P.playing) stop();
    song = prepareSong(raw);
    const local = loadLocal(id);
    S.muted = new Set(local.muted || []);
    S.pos = 0; S.loop = false; S.edit = false;
    D.bar = -99; D.grid = null; D.gridSteps = 0; D.chord = D.next = undefined;
    ['#nowChord', '#nowChips', '#chordsTab'].forEach((id) => { $(id).hidden = !song.hasChords; });
    $('#strumRow').hidden = !song.hasStrum; $('#strumBtn').hidden = !song.hasStrum; D.strumCells = []; D.strumCur = -2;
    $('#nextBox').hidden = true;
    $('#capoLabel').textContent = song.tuneLabel;
    $('#songTitle').textContent = song.title;
    $('#songMeta').textContent = [song.artist, song.timeSig, `${song.timeline.length} bars`].filter(Boolean).join(' · ');
    $('#origBpm').textContent = song.bpm;
    $('#loopBtn').setAttribute('aria-pressed', 'false');
    $('#editBtn').setAttribute('aria-pressed', 'false');
    $('#editBtn').textContent = 'Edit';
    $('#grid').classList.remove('editing');
    setBpm(local.bpm || song.bpm);
    renderSections();
    renderBeatDots();
    renderLyrics();
    if (song.hasChords) renderChordsTab();
    setTab(prefs.tab);
    showPosition(0, -1);
    $('#playerScroll').scrollTop = 0;
    document.title = `${song.title} · Backbeat`;
  }

  function route() {
    const m = location.hash.match(/^#\/song\/(.+)$/);
    if (m) {
      openSong(decodeURIComponent(m[1]));
      $('#library').classList.remove('active');
      $('#player').classList.add('active');
    } else {
      if (P.playing) stop();
      song = null;
      document.title = 'Backbeat';
      renderLibrary();
      $('#player').classList.remove('active');
      $('#library').classList.add('active');
    }
  }

  /* ---------------- helpers ---------------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, 1600);
  }
  const sheet = (id, show) => { $(id).hidden = !show; };
  function setToggle(btn, on) { btn.setAttribute('aria-pressed', String(on)); }

  /* ---------------- wiring ---------------- */
  function wire() {
    $('#search').addEventListener('input', renderLibrary);
    $('#backBtn').onclick = () => { location.hash = ''; };
    $('#playBtn').onclick = () => (P.playing ? stop() : start());
    const stepBar = (d) => {
      if (P.playing) return;
      S.pos = Math.min(song.timeline.length - 1, Math.max(0, S.pos + d));
      showPosition(S.pos, -1);
    };
    $('#barPrev').onclick = () => stepBar(-1);
    $('#barNext').onclick = () => stepBar(1);

    holdRepeat($('#bpmDown'), -1);
    holdRepeat($('#bpmUp'), 1);
    $('#bpmSlider').addEventListener('input', (e) => setBpm(e.target.value));
    const bi = $('#bpmInput');
    bi.addEventListener('change', () => setBpm(bi.value));
    bi.addEventListener('blur', () => { bi.value = S.bpm; });
    bi.addEventListener('keydown', (e) => { if (e.key === 'Enter') bi.blur(); });
    bi.addEventListener('focus', () => bi.select());
    $('#tapBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); tap(); });
    $$('.chips [data-pct]').forEach((c) => { c.onclick = () => setBpm(song.bpm * c.dataset.pct / 100); });

    const clickBtn = $('#clickBtn'), countBtn = $('#countBtn'), loopBtn = $('#loopBtn'), mixBtn = $('#mixBtn');
    setToggle(clickBtn, prefs.click);
    setToggle(countBtn, prefs.countIn);
    clickBtn.onclick = () => { prefs.click = !prefs.click; setToggle(clickBtn, prefs.click); savePrefs(); };
    countBtn.onclick = () => { prefs.countIn = !prefs.countIn; setToggle(countBtn, prefs.countIn); savePrefs(); };
    loopBtn.onclick = () => {
      S.loop = !S.loop; setToggle(loopBtn, S.loop);
      const b = P.playing ? D.bar : S.pos;
      if (b >= 0) toast(S.loop ? `Looping ${song.sections[song.timeline[b].si].name}` : 'Loop off');
    };
    const strumBtn = $('#strumBtn');
    setToggle(strumBtn, prefs.strum);
    strumBtn.onclick = () => { prefs.strum = !prefs.strum; setToggle(strumBtn, prefs.strum); savePrefs(); toast(prefs.strum ? 'Strum track on' : 'Strum track off'); };
    $('#strumVol').value = prefs.strumVol;
    $('#strumVol').oninput = (e) => { prefs.strumVol = +e.target.value; applyVolumes(); savePrefs(); };
    const cueBtn = $('#cueBtn');
    setToggle(cueBtn, prefs.cue);
    cueBtn.onclick = () => {
      prefs.cue = !prefs.cue; setToggle(cueBtn, prefs.cue); savePrefs();
      if (P.playing) {
        if (prefs.cue) { P.cueChord = chordAt(D.bar, 0); cue(P.cueChord, ctx.currentTime + 0.02); } else cueSilence(ctx.currentTime);
      }
      toast(prefs.cue ? 'Chord cue on' : 'Chord cue off');
    };
    $('#cueVol').value = prefs.cueVol;
    $('#cueVol').oninput = (e) => { prefs.cueVol = +e.target.value; applyVolumes(); savePrefs(); };
    mixBtn.onclick = () => { const m = $('#mixer'); m.hidden = !m.hidden; setToggle(mixBtn, !m.hidden); };
    $('#drumVol').value = prefs.drumVol;
    $('#clickVol').value = prefs.clickVol;
    $('#drumVol').oninput = (e) => { prefs.drumVol = +e.target.value; applyVolumes(); savePrefs(); };
    $('#clickVol').oninput = (e) => { prefs.clickVol = +e.target.value; applyVolumes(); savePrefs(); };

    const editBtn = $('#editBtn');
    editBtn.onclick = () => {
      S.edit = !S.edit;
      setToggle(editBtn, S.edit);
      editBtn.textContent = S.edit ? 'Done' : 'Edit';
      $('#grid').classList.toggle('editing', S.edit);
      if (S.edit) toast('Tap cells to change hits');
    };
    $$('.tab').forEach((t) => { t.onclick = () => setTab(t.dataset.tab); });

    const applyFont = () => document.documentElement.style.setProperty('--lyric-size', prefs.lyricSize + 'px');
    $('#fontUp').onclick = () => { prefs.lyricSize = Math.min(34, prefs.lyricSize + 2); applyFont(); savePrefs(); };
    $('#fontDown').onclick = () => { prefs.lyricSize = Math.max(13, prefs.lyricSize - 2); applyFont(); savePrefs(); };
    applyFont();

    // song menu
    $('#menuBtn').onclick = () => sheet('#menuSheet', true);
    $('#menuSheet').onclick = (e) => { if (e.target.id === 'menuSheet') sheet('#menuSheet', false); };
    $('#closeMenu').onclick = () => sheet('#menuSheet', false);
    $('#resetTempo').onclick = () => { setBpm(song.bpm); sheet('#menuSheet', false); };
    $('#unmuteAll').onclick = () => { [...S.muted].forEach(toggleMute); sheet('#menuSheet', false); };
    $('#resetDrums').onclick = () => {
      const local = loadLocal(song.id); delete local.patterns; store.set(songKey(song.id), local);
      const keep = { bar: P.playing ? D.bar : S.pos };
      song = Object.assign(prepareSong(song.raw), { lyrics: song.lyrics });
      D.grid = null; D.gridSteps = 0;
      if (keep.bar >= 0) renderGridBar(keep.bar);
      sheet('#menuSheet', false);
      toast('Drum pattern restored');
    };

    // lyrics editor
    const template = () => song.sections.filter((s, i, a) => a.findIndex((x) => x.name === s.name) === i).map((s) => `[${s.name}]\n\n`).join('');
    $('#editLyricsBtn').onclick = () => {
      $('#lyricsText').value = song.lyrics || template();
      $('#sectionHint').textContent = `[${(song.sections[1] || song.sections[0]).name}]`;
      sheet('#lyricsSheet', true);
    };
    $('#lyricsCancel').onclick = () => sheet('#lyricsSheet', false);
    $('#lyricsRevert').onclick = () => { $('#lyricsText').value = song.raw.lyrics || template(); };
    $('#lyricsFind').onclick = () => {
      const q = `${song.title} ${song.artist} lyrics`;
      window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank', 'noopener');
    };
    $('#lyricsPaste').onclick = async () => {
      try {
        const clip = await navigator.clipboard.readText();
        if (!clip.trim()) throw new Error('empty');
        $('#lyricsText').value = clip;
        toast('Pasted, now tap Save');
      } catch {
        $('#lyricsText').focus();
        toast('Long-press the box and choose Paste');
      }
    };
    $('#lyricsClear').onclick = () => { $('#lyricsText').value = ''; $('#lyricsText').focus(); };
    $('#lyricsSave').onclick = () => {
      let txt = $('#lyricsText').value.replace(/\r\n/g, '\n');
      const hasHeaders = /^\s*\[.+\]\s*$/m.test(txt);
      if (txt.trim() && !hasHeaders) {
        const r = autoSection(txt);
        txt = r.text;
        toast(`Matched ${r.used} verses to the song's parts`);
      }
      song.lyrics = txt;
      saveLocal(song.id, { lyrics: txt === (song.raw.lyrics || '') ? undefined : txt });
      renderLyrics();
      if (D.bar >= 0) showPosition(D.bar, P.playing ? D.step : -1);
      sheet('#lyricsSheet', false);
    };

    // Plain pasted lyrics (no [headers]): split into stanzas at blank lines and
    // hand them, in order, to the song's sung sections.
    function autoSection(text) {
      const stanzas = text.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
      const vocal = song.sections.filter((x) => !x.inst);
      let k = 0;
      const out = song.sections.map((sec) => {
        if (sec.inst) return `[${sec.name}]\n(instrumental)`;
        const last = sec === vocal[vocal.length - 1];
        const body = last ? stanzas.slice(k).join('\n\n') : (stanzas[k] || '');
        k = last ? stanzas.length : k + 1;
        return `[${sec.name}]\n${body}`;
      });
      return { text: out.join('\n\n'), used: Math.min(stanzas.length, vocal.length) };
    }

    // keyboard
    document.addEventListener('keydown', (e) => {
      if (!song || /INPUT|TEXTAREA/.test(document.activeElement.tagName) || !$('#lyricsSheet').hidden) return;
      if (e.code === 'Space') { e.preventDefault(); P.playing ? stop() : start(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); setBpm(S.bpm + (e.shiftKey ? 5 : 1)); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); setBpm(S.bpm - (e.shiftKey ? 5 : 1)); }
      else if (e.key === 't') tap();
      else if (e.key === 'l') loopBtn.click();
    });

    window.addEventListener('hashchange', route);
  }

  wire();
  route();
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // When an updated version takes over, reload once so new songs appear right away
    // (not on first install, and never in the middle of playing).
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      if (P.playing) { toast('Update ready, it loads when you stop'); return; }
      reloading = true;
      location.reload();
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
      })
      .catch(() => {});
  }
})();

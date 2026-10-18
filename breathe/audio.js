'use strict';
/*
 * All sound is synthesised with Web Audio, so it works offline and needs no assets.
 *   - cue(kind, t, dur): a short tone at the start of each phase
 *   - breath(kind, t, dur): a soft noise "breath" that swells and falls with you
 *   - speak(text): voice prompts through speechSynthesis
 *   - music(name): generative background soundscapes
 */
window.BreathAudio = (() => {
  let ctx = null;
  let master, cueBus, musicBus, breathBus, verbSend, noiseBuf;
  let breathSrc, breathFilter, breathGain, breathLevel = 0, breathFreq = 500;
  let music = null;
  let musicTimer = 0;
  let voice = null;

  /* ---------------- setup ---------------- */
  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'playback' });
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* unsupported */ }

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 3;
    comp.attack.value = 0.01; comp.release.value = 0.4;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);

    const verb = ctx.createConvolver();
    verb.buffer = impulse(4.5, 2.4);
    verbSend = ctx.createGain(); verbSend.gain.value = 1;
    const wet = ctx.createGain(); wet.gain.value = 0.55;
    verbSend.connect(verb); verb.connect(wet); wet.connect(master);

    cueBus = bus(0.7, 0.35);
    musicBus = bus(0.5, 0.9);
    breathBus = bus(0.5, 0.25);

    noiseBuf = makeNoise(6);
    breathFilter = ctx.createBiquadFilter();
    breathFilter.type = 'bandpass'; breathFilter.Q.value = 0.8; breathFilter.frequency.value = breathFreq;
    breathGain = ctx.createGain(); breathGain.gain.value = 0;
    breathSrc = ctx.createBufferSource(); breathSrc.buffer = noiseBuf; breathSrc.loop = true;
    breathSrc.connect(breathFilter); breathFilter.connect(breathGain); breathGain.connect(breathBus);
    breathSrc.start();
    return ctx;
  }

  function bus(level, send) {
    const g = ctx.createGain(); g.gain.value = level; g.connect(master);
    const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(verbSend);
    return g;
  }

  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // Pinkish noise (Paul Kellet's economy filter), easier on the ear than white.
  function makeNoise(sec) {
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    }
    return buf;
  }

  async function resume() { init(); if (ctx.state !== 'running') await ctx.resume(); }
  const suspend = () => ctx && ctx.state === 'running' && ctx.suspend();
  const now = () => (ctx ? ctx.currentTime : 0);
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  /* ---------------- building blocks ---------------- */
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(dest, { f0, f1, t, glide = 0.5, a = 0.04, peak = 0.3, dur = 1.4, type = 'sine' }) {
    const o = ctx.createOscillator(); o.type = type;
    const g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
    env(g, t, a, peak, dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // Struck metal: inharmonic partials with long, independent decays.
  function bell(dest, f, t, peak = 0.25, dur = 3, partials = [[1, 1], [2.76, 0.4], [5.4, 0.18], [8.93, 0.08]]) {
    for (const [ratio, amp] of partials) {
      for (const det of [-0.6, 0.6]) {
        tone(dest, { f0: f * ratio + det, t, a: 0.006, peak: (peak * amp) / 2, dur: dur / Math.sqrt(ratio) });
      }
    }
  }

  function noiseHit(dest, t, { type = 'bandpass', freq = 2000, q = 1, peak = 0.3, dur = 0.1, a = 0.003 }) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, t, a, peak, dur);
    s.connect(f); f.connect(g); g.connect(dest);
    const off = Math.random() * (noiseBuf.duration - dur - 0.1);
    s.start(t, off); s.stop(t + dur + 0.05);
  }

  /* ---------------- phase cues ---------------- */
  function cue(kind, t, dur) {
    if (!ctx) return;
    t = Math.max(t, ctx.currentTime);
    const fast = dur < 1.2;
    if (fast) { // rapid breathing: tiny ticks so the rhythm stays clear but quiet
      const f = kind === 'out' ? 520 : 780;
      tone(cueBus, { f0: f, t, a: 0.003, peak: 0.12, dur: 0.12 });
      return;
    }
    switch (kind) {
      case 'in': tone(cueBus, { f0: midi(62), f1: midi(69), t, glide: Math.min(0.9, dur * 0.5), a: 0.08, peak: 0.26, dur: 1.8 });
        tone(cueBus, { f0: midi(74), f1: midi(81), t, glide: Math.min(0.9, dur * 0.5), a: 0.1, peak: 0.05, dur: 1.4 }); break;
      case 'in2': tone(cueBus, { f0: midi(74), f1: midi(76), t, glide: 0.2, a: 0.03, peak: 0.2, dur: 0.8 }); break;
      case 'out': tone(cueBus, { f0: midi(69), f1: midi(60), t, glide: Math.min(1.2, dur * 0.5), a: 0.08, peak: 0.24, dur: 2.2 });
        tone(cueBus, { f0: midi(57), f1: midi(48), t, glide: Math.min(1.2, dur * 0.5), a: 0.1, peak: 0.08, dur: 2 }); break;
      case 'holdIn': bell(cueBus, midi(76), t, 0.18, 2.6); break;
      case 'holdOut': bell(cueBus, midi(64), t, 0.18, 2.6); break;
      case 'rest': bell(cueBus, midi(57), t, 0.2, 3.5); break;
      case 'start': bell(cueBus, midi(69), t, 0.25, 4); break;
      case 'end': [69, 76, 81].forEach((n, i) => bell(cueBus, midi(n), t + i * 0.45, 0.22, 5)); break;
      default: break;
    }
  }

  /* The breath sound: filtered noise that swells on the inhale and falls away on the exhale. */
  function breath(kind, t, dur) {
    if (!ctx) return;
    t = Math.max(t, ctx.currentTime);
    const g = breathGain.gain, f = breathFilter.frequency;
    g.cancelScheduledValues(t); f.cancelScheduledValues(t);
    g.setValueAtTime(breathLevel, t); f.setValueAtTime(breathFreq, t);
    const peak = dur < 1.2 ? 0.5 : 0.85;
    if (kind === 'in' || kind === 'in2') {
      const top = kind === 'in2' ? 1600 : 1300;
      g.linearRampToValueAtTime(peak, t + Math.min(dur * 0.35, 1.2));
      g.linearRampToValueAtTime(peak * 0.55, t + dur);
      f.exponentialRampToValueAtTime(top, t + dur);
      breathLevel = peak * 0.55; breathFreq = top;
    } else if (kind === 'out') {
      g.linearRampToValueAtTime(peak * 0.8, t + Math.min(dur * 0.2, 0.8));
      g.linearRampToValueAtTime(0.0001, t + dur);
      f.exponentialRampToValueAtTime(380, t + dur);
      breathLevel = 0.0001; breathFreq = 380;
    } else {
      g.linearRampToValueAtTime(0.0001, t + Math.min(0.6, dur));
      breathLevel = 0.0001;
    }
  }

  function silenceBreath() {
    if (!ctx) return;
    const t = ctx.currentTime;
    breathGain.gain.cancelScheduledValues(t);
    breathGain.gain.setTargetAtTime(0, t, 0.15);
    breathLevel = 0;
  }

  /* ---------------- voice ---------------- */
  function pickVoice() {
    if (!('speechSynthesis' in window)) return null;
    const vs = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
    const pref = ['Samantha', 'Karen', 'Moira', 'Serena', 'Daniel', 'Google UK English Female', 'Google US English'];
    for (const name of pref) { const v = vs.find((x) => x.name.includes(name)); if (v) return v; }
    return vs.find((v) => v.localService) || vs[0] || null;
  }
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };

  let voiceVol = 0.8;
  function speak(text) {
    if (!('speechSynthesis' in window) || !text) return;
    if (!voice) voice = pickVoice();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = 0.88; u.pitch = 0.95; u.volume = voiceVol;
    speechSynthesis.speak(u);
  }
  const hush = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); };
  // iOS only lets speech start from a user gesture; an empty utterance unlocks it.
  function primeVoice() {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u);
  }

  /* ---------------- background music ----------------
   * Each soundscape is a small scheduler: tick(until) schedules events up to `until`.
   * Continuous sources go in `held` so they can be stopped.
   */
  const SOUNDSCAPES = {
    solemn: {
      name: 'Solemn', blurb: 'Low strings, D minor',
      make(out, held, opts) {
        drone(out, held, midi(38), 0.07, 'sine');
        const chords = [[38, 45, 50, 53, 57], [34, 46, 50, 53, 58], [31, 43, 50, 55, 58], [33, 45, 52, 57, 61], [38, 45, 50, 53, 62]];
        let next = opts.at, i = 0;
        const len = 14 / opts.pace;
        return (until) => {
          while (next < until) {
            for (const n of chords[i % chords.length]) pad(out, midi(n), next, len + 5, { type: 'sawtooth', cutoff: 520, peak: 0.035, detune: 6 });
            i++; next += len;
          }
        };
      },
    },
    warm: {
      name: 'Warm', blurb: 'Soft major pads',
      make(out, held, opts) {
        const chords = [[41, 53, 57, 60, 64], [38, 50, 57, 60, 65], [34, 50, 53, 57, 62], [36, 48, 55, 59, 64]];
        const sparkle = [72, 74, 76, 79, 81, 84];
        let next = opts.at, i = 0, sp = ctx.currentTime + 3;
        const len = 12 / opts.pace;
        return (until) => {
          while (next < until) {
            for (const n of chords[i % chords.length]) pad(out, midi(n), next, len + 5, { type: 'triangle', cutoff: 1400, peak: 0.04, detune: 8 });
            i++; next += len;
          }
          while (sp < until) {
            tone(out, { f0: midi(sparkle[(Math.random() * sparkle.length) | 0]), t: sp, a: 0.01, peak: 0.03, dur: 3 });
            sp += 2.5 + Math.random() * 5;
          }
        };
      },
    },
    pulse: {
      name: 'Percussive', blurb: 'Frame drum and shaker',
      make(out, held, opts) {
        drone(out, held, midi(38), 0.045, 'triangle', 300);
        const bpm = opts.bpm;
        const step = 60 / bpm / 2; // eighth notes
        //            1 . & . 2 . & . 3 . & . 4 . & .   (8 eighths per bar)
        const dum = [1, 0, 0, 0.5, 0, 0, 0.8, 0];
        const tek = [0, 0, 0.6, 0, 0.7, 0, 0, 0.5];
        let next = opts.at, i = 0;
        return (until) => {
          while (next < until) {
            const s = i % 8;
            if (dum[s]) frameDrum(out, next, dum[s]);
            if (tek[s]) noiseHit(out, next, { freq: 2600, q: 1.2, peak: 0.12 * tek[s], dur: 0.09 });
            noiseHit(out, next + (s % 2 ? step * 0.08 : 0), { type: 'highpass', freq: 6500, q: 0.5, peak: s % 2 ? 0.025 : 0.045, dur: 0.06 });
            i++; next += step;
          }
        };
      },
    },
    ocean: {
      name: 'Ocean', blurb: 'Slow waves',
      make(out, held, opts) {
        let next = opts.at;
        return (until) => {
          while (next < until) {
            const d = 7 + Math.random() * 6;
            wave(out, next, d);
            next += d * (0.55 + Math.random() * 0.2);
          }
        };
      },
    },
    bowls: {
      name: 'Bowls', blurb: 'Singing bowls, open space',
      make(out, held, opts) {
        drone(out, held, midi(50), 0.025, 'sine');
        const notes = [50, 53, 55, 57, 60, 62];
        let next = opts.at + 0.5;
        return (until) => {
          while (next < until) {
            const f = midi(notes[(Math.random() * notes.length) | 0]);
            bell(out, f, next, 0.16, 12, [[1, 1], [2.71, 0.35], [5.15, 0.12]]);
            next += 6 + Math.random() * 7;
          }
        };
      },
    },
  };

  function drone(out, held, f, level, type = 'sine', cutoff = 600) {
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(level, ctx.currentTime, 2);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff;
    for (const det of [-4, 4]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
      o.connect(lp); o.start(); held.push(o);
    }
    lp.connect(g); g.connect(out);
  }

  function pad(out, f, t, dur, { type, cutoff, peak, detune }) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.35);
    g.gain.setValueAtTime(peak, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.3;
    for (const det of [-detune, detune]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.1);
    }
    lp.connect(g); g.connect(out);
  }

  function frameDrum(out, t, vel) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.25);
    const g = ctx.createGain(); env(g, t, 0.004, 0.55 * vel, 0.7);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.8);
    noiseHit(out, t, { type: 'lowpass', freq: 900, q: 0.7, peak: 0.12 * vel, dur: 0.12 });
  }

  function wave(out, t, d) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.4;
    f.frequency.setValueAtTime(250, t);
    f.frequency.exponentialRampToValueAtTime(1100 + Math.random() * 500, t + d * 0.45);
    f.frequency.exponentialRampToValueAtTime(220, t + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35 + Math.random() * 0.2, t + d * 0.45);
    g.gain.linearRampToValueAtTime(0, t + d);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t, Math.random() * 4); s.stop(t + d + 0.1);
  }

  function startMusic(name, opts = {}) {
    stopMusic(1.5);
    if (!name || name === 'none' || !SOUNDSCAPES[name]) return;
    init();
    const out = ctx.createGain(); out.gain.value = 0;
    out.gain.setTargetAtTime(1, ctx.currentTime, 1);
    out.connect(musicBus);
    const held = [];
    const tick = SOUNDSCAPES[name].make(out, held, Object.assign({ pace: 1, bpm: 60, at: ctx.currentTime + 0.1 }, opts));
    music = { name, out, held, tick };
    tick(ctx.currentTime + 1.5);
    musicTimer = setInterval(() => { if (music && ctx.state === 'running') music.tick(ctx.currentTime + 1.5); }, 250);
  }

  function stopMusic(fade = 2.5) {
    if (!music) return;
    clearInterval(musicTimer);
    const m = music; music = null;
    const t = ctx.currentTime;
    m.out.gain.cancelScheduledValues(t);
    m.out.gain.setValueAtTime(m.out.gain.value, t);
    m.out.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => { m.held.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } }); m.out.disconnect(); }, fade * 1000 + 200);
  }

  function setLevels({ cues, music: mus, breath: br }) {
    init();
    const t = ctx.currentTime;
    if (cues != null) { cueBus.gain.setTargetAtTime(cues * 0.9, t, 0.05); voiceVol = Math.min(1, cues + 0.15); }
    if (mus != null) musicBus.gain.setTargetAtTime(mus * 0.8, t, 0.05);
    if (br != null) breathBus.gain.setTargetAtTime(br * 0.7, t, 0.05);
  }

  return {
    init, resume, suspend, now, cue, breath, silenceBreath, speak, hush, primeVoice,
    startMusic, stopMusic, setLevels, SOUNDSCAPES,
    get musicName() { return music ? music.name : null; },
    get running() { return !!ctx && ctx.state === 'running'; },
  };
})();

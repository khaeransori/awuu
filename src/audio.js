// All sound is synthesized with WebAudio: no files, works offline.
let ctx = null, master, sfxBus, musBus, noiseBuf, comp;
export const audioState = { sfx: true, music: true };

let userPaused = false;
// iPhone: keep playing when the ringer switch is on silent (like a video/game app).
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

// iOS Safari only unlocks audio inside touchend/click, and can leave the
// context 'suspended' or 'interrupted' (calls, lock screen, app switch).
// Call this from every user gesture; it is cheap once running.
export function initAudio() {
  if (ctx) {
    if (ctx.state !== 'running' && !userPaused) {
      ctx.resume().catch(() => {});
      // iOS sometimes needs a sound started inside the same gesture
      try { const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050); b.connect(ctx.destination); b.start(0); } catch (e) {}
    }
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC();
  } catch (e) {
    return;
  }
  try { const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050); b.connect(ctx.destination); b.start(0); } catch (e) {}
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.connect(ctx.destination);
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(comp);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = audioState.sfx ? 0.8 : 0;
  sfxBus.connect(master);
  musBus = ctx.createGain();
  musBus.gain.value = audioState.music ? 0.32 : 0;
  musBus.connect(master);
  const len = ctx.sampleRate * 1;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  if (pendingSong) playMusic(pendingSong);
}
export function suspendAudio(on) {
  userPaused = on;
  if (!ctx) return;
  if (on) ctx.suspend().catch(() => {});
  else ctx.resume().catch(() => {});
}
export function setSfx(on) {
  audioState.sfx = on;
  if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.02);
}
export function setMusic(on) {
  audioState.music = on;
  if (musBus) musBus.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.05);
}

function now() { return ctx.currentTime; }
function gainEnv(t, a, peak, d, dest) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  g.connect(dest || sfxBus);
  return g;
}
function tone(type, f0, f1, t, dur, peak, dest, a = 0.008) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = gainEnv(t, a, peak, dur, dest);
  o.connect(g);
  o.start(t);
  o.stop(t + a + dur + 0.05);
  return o;
}
function noise(t, dur, peak, filterType, f0, f1, dest, q = 1) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = gainEnv(t, 0.005, peak, dur, dest);
  s.connect(f);
  f.connect(g);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function ok() { return ctx && ctx.state === 'running' && audioState.sfx; }

export const sfx = {
  click() { if (!ok()) return; const t = now(); tone('square', 660, 880, t, 0.06, 0.12); },
  meow(p = 1) {
    if (!ok()) return;
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3.5;
    const base = 520 * p;
    o.frequency.setValueAtTime(base * 0.8, t);
    o.frequency.exponentialRampToValueAtTime(base * 1.45, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(base * 0.75, t + 0.42);
    f.frequency.setValueAtTime(800 * p, t);
    f.frequency.exponentialRampToValueAtTime(2400 * p, t + 0.14);
    f.frequency.exponentialRampToValueAtTime(900 * p, t + 0.42);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
    g.gain.setValueAtTime(0.42, t + 0.28);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(f); f.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t + 0.55);
    tone('sine', base * 1.6, base * 1.1, t + 0.02, 0.35, 0.06);
  },
  catch(combo = 1) {
    if (!ok()) return;
    const t = now();
    const shift = Math.min(combo - 1, 8);
    [0, 4, 7, 12].forEach((n, i) => tone('square', midi(72 + shift + n), 0, t + i * 0.055, 0.12, 0.09));
    tone('triangle', midi(84 + shift), 0, t + 0.22, 0.3, 0.12);
  },
  jump() { if (!ok()) return; const t = now(); tone('square', 260, 620, t, 0.13, 0.1); },
  land() { if (!ok()) return; const t = now(); noise(t, 0.08, 0.12, 'lowpass', 600, 200); },
  pounce() {
    if (!ok()) return;
    const t = now();
    noise(t, 0.28, 0.35, 'bandpass', 500, 2600, null, 1.2);
    tone('sine', 180, 90, t, 0.18, 0.25);
  },
  howl() {
    if (!ok()) return;
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lg = ctx.createGain();
    lg.gain.value = 10;
    lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(700, t);
    f.frequency.linearRampToValueAtTime(1800, t + 0.5);
    f.frequency.linearRampToValueAtTime(900, t + 1.8);
    for (const osc of [o, o2]) {
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(540, t + 0.45);
      osc.frequency.linearRampToValueAtTime(500, t + 1.3);
      osc.frequency.exponentialRampToValueAtTime(300, t + 1.9);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.2);
    g.gain.setValueAtTime(0.32, t + 1.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
    const g2 = ctx.createGain();
    g2.gain.value = 0.6;
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(sfxBus);
    [o, o2, lfo].forEach((x) => { x.start(t); x.stop(t + 2.05); });
    noise(t, 0.6, 0.05, 'bandpass', 1200, 900, null, 2);
  },
  bark() {
    if (!ok()) return;
    const t = now();
    for (const d of [0, 0.2]) {
      tone('square', 240, 130, t + d, 0.11, 0.18);
      noise(t + d, 0.08, 0.2, 'bandpass', 900, 500, null, 2);
    }
  },
  pinch() { if (!ok()) return; const t = now(); tone('square', 1200, 600, t, 0.05, 0.12); tone('square', 1300, 700, t + 0.08, 0.05, 0.12); },
  bonk() {
    if (!ok()) return;
    const t = now();
    tone('sine', 380, 70, t, 0.3, 0.4);
    noise(t, 0.12, 0.25, 'lowpass', 1500, 300);
    [0, 1, 2].forEach((i) => tone('triangle', midi(88 - i * 2), 0, t + 0.15 + i * 0.1, 0.1, 0.06));
  },
  boing() {
    if (!ok()) return;
    const t = now();
    const o = tone('sine', 140, 520, t, 0.3, 0.3);
    const l = ctx.createOscillator();
    l.frequency.value = 30;
    const lg = ctx.createGain();
    lg.gain.value = 40;
    l.connect(lg); lg.connect(o.frequency);
    l.start(t); l.stop(t + 0.35);
  },
  poof() { if (!ok()) return; const t = now(); noise(t, 0.35, 0.3, 'lowpass', 2500, 300); tone('sine', 900, 300, t, 0.2, 0.06); },
  power() {
    if (!ok()) return;
    const t = now();
    [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => tone('triangle', midi(67 + n), 0, t + i * 0.045, 0.14, 0.13));
  },
  medal() {
    if (!ok()) return;
    const t = now();
    [0, 7, 12, 16, 19, 24, 28].forEach((n, i) => tone('sine', midi(76 + n), 0, t + i * 0.06, 0.35, 0.12));
  },
  tick() { if (!ok()) return; const t = now(); tone('square', 1500, 0, t, 0.03, 0.07); },
  count(i) { if (!ok()) return; const t = now(); tone('square', i ? 523 : 1046, 0, t, i ? 0.15 : 0.4, 0.16); },
  star(i) { if (!ok()) return; const t = now(); [0, 7, 12].forEach((n, k) => tone('triangle', midi(76 + i * 4 + n), 0, t + k * 0.04, 0.4, 0.14)); },
  splash() { if (!ok()) return; const t = now(); noise(t, 0.25, 0.18, 'highpass', 2000, 800); },
  denied() { if (!ok()) return; const t = now(); tone('square', 180, 140, t, 0.15, 0.1); },
  hmph() { if (!ok()) return; const t = now(); tone('sawtooth', 220, 150, t, 0.2, 0.16); noise(t, 0.15, 0.1, 'lowpass', 900, 300); },
  sparkle() { if (!ok()) return; const t = now(); for (let i = 0; i < 6; i++) tone('sine', midi(88 + ((i * 5) % 12)), 0, t + i * 0.05, 0.2, 0.07); },
  bossHit() {
    if (!ok()) return;
    const t = now();
    tone('sawtooth', 300, 120, t, 0.4, 0.25);
    noise(t, 0.2, 0.3, 'lowpass', 1800, 200);
    sfx.meow(0.55);
  },
  fanfare(good = true) {
    if (!ok()) return;
    const t = now();
    const seq = good ? [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36], [79, 0.56], [84, 0.68]] : [[67, 0], [64, 0.18], [60, 0.36]];
    seq.forEach(([n, d]) => { tone('square', midi(n), 0, t + d, 0.22, 0.12); tone('triangle', midi(n - 12), 0, t + d, 0.25, 0.14); });
  },
};

// ---------------------------------------------------------------- music
const SONGS = {
  menu: { bpm: 100, root: 60, prog: [0, 5, 3, 4], seed: 3, lead: 'triangle', drums: 1 },
  park: { bpm: 118, root: 62, prog: [0, 3, 4, 0], seed: 11, lead: 'square', drums: 2 },
  village: { bpm: 122, root: 60, prog: [0, 5, 3, 4], seed: 21, lead: 'square', drums: 2 },
  forest: { bpm: 112, root: 57, prog: [5, 3, 0, 4], seed: 31, lead: 'triangle', drums: 2 },
  beach: { bpm: 126, root: 65, prog: [0, 4, 5, 3], seed: 41, lead: 'square', drums: 3 },
  snow: { bpm: 114, root: 64, prog: [0, 5, 1, 4], seed: 51, lead: 'sine', drums: 2, bells: true },
  result: { bpm: 96, root: 60, prog: [0, 3, 4, 0], seed: 7, lead: 'triangle', drums: 1 },
};
const SCALE = [0, 2, 4, 5, 7, 9, 11];
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function compile(song) {
  const R = rng(song.seed);
  const bars = 8;
  const steps = bars * 16;
  const lead = new Array(steps).fill(null);
  const bass = new Array(steps).fill(null);
  const rhythms = [
    [0, 3, 6, 8, 10, 12, 14],
    [0, 2, 4, 7, 8, 12],
    [0, 4, 6, 8, 11, 12, 14],
    [0, 2, 3, 6, 8, 10, 14],
  ];
  let deg = 2;
  const motifs = [];
  for (let m = 0; m < 2; m++) {
    const rh = rhythms[Math.floor(R() * rhythms.length)];
    const moves = rh.map(() => Math.floor(R() * 5) - 2);
    motifs.push({ rh, moves });
  }
  for (let bar = 0; bar < bars; bar++) {
    const chord = song.prog[bar % 4];
    const motif = motifs[(bar >> 1) % 2];
    const rh = motif.rh;
    rh.forEach((s, k) => {
      if (bar % 4 === 3 && s > 8) return;
      deg += motif.moves[k] + (bar >= 4 && k === 0 ? 1 : 0);
      const tones = [chord, chord + 2, chord + 4, chord + 7];
      if (s % 4 === 0) {
        let best = tones[0], bd = 99;
        for (const tn of tones) for (const o of [-7, 0, 7]) { const d = Math.abs(tn + o - deg); if (d < bd) { bd = d; best = tn + o; } }
        deg = best;
      }
      deg = Math.max(0, Math.min(11, deg));
      const oct = Math.floor(deg / 7);
      const note = song.root + 12 + SCALE[((deg % 7) + 7) % 7] + oct * 12;
      lead[bar * 16 + s] = { n: note, len: s % 4 === 0 ? 0.22 : 0.13 };
    });
    const r = song.root - 12 + SCALE[chord % 7] + (chord >= 7 ? 12 : 0);
    for (const s of [0, 6, 8, 12, 14]) bass[bar * 16 + s] = { n: s === 12 || s === 6 ? r + 12 : r, len: 0.18 };
    if (bar % 4 === 3) lead[bar * 16 + 12] = { n: song.root + 24, len: 0.4 };
  }
  return { ...song, leadN: lead, bassN: bass, steps };
}

const mus = { song: null, name: null, step: 0, next: 0, timer: null, tempo: 1 };
let pendingSong = null;
export function playMusic(name) {
  if (mus.name === name && mus.timer) return;
  stopMusic();
  pendingSong = name;
  if (!ctx) return;
  mus.name = name;
  mus.song = compile(SONGS[name] || SONGS.menu);
  mus.step = 0;
  mus.next = ctx.currentTime + 0.12;
  mus.tempo = 1;
  mus.timer = setInterval(schedule, 30);
}
export function stopMusic() {
  if (mus.timer) clearInterval(mus.timer);
  mus.timer = null;
  mus.name = null;
}
export function setTempo(k) { mus.tempo = k; }
function schedule() {
  if (!ctx || ctx.state !== 'running') { if (ctx) mus.next = ctx.currentTime + 0.1; return; }
  const S = mus.song;
  const spb = 60 / (S.bpm * mus.tempo) / 4;
  if (mus.next < ctx.currentTime - 0.2) mus.next = ctx.currentTime + 0.05;
  while (mus.next < ctx.currentTime + 0.15) {
    playStep(S, mus.step, mus.next, spb);
    mus.next += spb;
    mus.step = (mus.step + 1) % S.steps;
  }
}
function playStep(S, i, t, spb) {
  if (!audioState.music) return;
  const L = S.leadN[i];
  if (L) {
    tone(S.lead, midi(L.n), 0, t, L.len, S.lead === 'square' ? 0.07 : 0.16, musBus);
    if (S.bells) tone('sine', midi(L.n + 12), 0, t, L.len * 1.6, 0.05, musBus);
  }
  const B = S.bassN[i];
  if (B) tone('triangle', midi(B.n), 0, t, B.len, 0.28, musBus);
  const s = i % 16;
  if (S.drums >= 1 && (s === 0 || s === 8)) { tone('sine', 150, 45, t, 0.14, 0.5, musBus, 0.002); }
  if (S.drums >= 2 && (s === 4 || s === 12)) noise(t, 0.1, 0.16, 'bandpass', 1800, 1200, musBus, 0.8);
  if (S.drums >= 2 && s % 2 === 0) noise(t, 0.03, 0.05, 'highpass', 7000, 0, musBus);
  if (S.drums >= 3 && s % 4 === 2) noise(t, 0.05, 0.07, 'highpass', 5000, 0, musBus);
}

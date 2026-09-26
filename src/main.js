import * as THREE from 'three';
import { Game } from './game.js';
import { LEVELS } from './levels.js';
import { SKINS, CAT_TYPES, CAT_ORDER } from './models.js';
import { THEMES } from './world.js';
import { initAudio, playMusic, sfx, setMusic, setSfx, suspendAudio, audioState } from './audio.js';
import { save, persist, totalStars, totalMedals, storageOk, resetSave } from './save.js';
import { catFace, wolfFace, iconCSS } from './art.js';
import { CUT } from './blocks.js';

const $ = (id) => document.getElementById(id);
const touch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

const iconStyle = document.createElement('style');
iconStyle.textContent = iconCSS();
document.head.appendChild(iconStyle);

// ============================================================ renderer
const canvas = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('loading').innerHTML = '<p style="max-width:80vw;text-align:center">Maaf, HP/browser ini belum mendukung WebGL. Coba buka di Chrome terbaru.</p>';
  throw e;
}
renderer.setClearColor(0xaee4ff);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xaee4ff, 48, 120);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
const hemi = new THREE.HemisphereLight(0xffffff, 0xa9bdd6, 2.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3dc, 2.3);
sun.position.set(-4, 10, 6);
scene.add(sun);

let adapt = 1;
function pixelRatio() {
  const dpr = window.devicePixelRatio || 1;
  const q = save.settings.quality;
  if (q === 'hemat') return Math.min(dpr, 1);
  if (q === 'bagus') return Math.min(dpr, 2);
  return Math.max(0.75, Math.min(dpr, 1.5) * adapt);
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 64 : 50;
  camera.updateProjectionMatrix();
  stickHome();
}

// ============================================================ game + hooks
const TUT = touch
  ? [
      'Geser jempol di sisi kiri layar untuk lari',
      'Kejar Kucing Oren, lalu tabrak untuk menangkap!',
      'Hore! Tekan LOMPAT untuk naik ke tumpukan kotak',
      'Tekan TERKAM untuk melesat cepat ke arah kucing',
      'Setiap kucing mengisi tombol AUUU',
      'AUUU sudah penuh! Tekan AUUU biar kucing kaget',
    ]
  : [
      'Tekan WASD atau tombol panah untuk lari',
      'Kejar Kucing Oren, lalu tabrak untuk menangkap!',
      'Hore! Tekan SPASI untuk melompat ke tumpukan kotak',
      'Tekan J untuk TERKAM, melesat cepat ke arah kucing',
      'Setiap kucing mengisi AUUU',
      'AUUU sudah penuh! Tekan K biar kucing kaget',
    ];

const hooks = {
  onTheme(t) {
    renderer.setClearColor(t.sky);
    scene.fog.color.set(t.sky);
    document.body.style.background = hex(t.sky);
  },
  onFloat(pos, text, cls) { floatAt(pos, text, cls); },
  onCombo(n) { replay($('combo'), `COMBO x${n}!`); },
  onBanner(text) { replay($('banner'), text); },
  onMission(m) { toast(`<i class="i-medal on"></i><span>Misi selesai! ${m.text}</span>`); },
  onHint(text) { showHint(text); },
  onHowl() { if (!game.tut) showHint(null); },
  onHowlReady() { if (!game.tut && game.mode !== 'menu') toast(`<span>AUUU sudah penuh! ${touch ? 'Tekan tombol ungu' : 'Tekan K'}</span>`); },
  onEnd(res) { showResult(res); },
  tutText(n) { return TUT[n] || null; },
};
const game = new Game(scene, camera, hooks);
const skinById = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
game.wolf.setSkin(skinById(save.skin));
game.load(0, 'menu');

// ============================================================ DOM helpers
function replay(el, html) {
  el.innerHTML = html;
  el.hidden = false;
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
}
let toastTimer = null;
function toast(html) {
  const el = $('toast');
  replay(el, html);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2900);
}
function showHint(text) {
  const el = $('hint');
  if (!text) { el.hidden = true; return; }
  el.textContent = text;
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}
const _v = new THREE.Vector3();
function floatAt(pos, text, cls) {
  _v.set(pos.x, pos.y + 1.6, pos.z).project(camera);
  if (_v.z > 1) return;
  const x = ((_v.x + 1) / 2) * window.innerWidth;
  const y = ((1 - _v.y) / 2) * window.innerHeight;
  const d = document.createElement('div');
  d.className = 'fl ' + (cls || 'pts');
  d.textContent = text;
  d.style.left = Math.max(40, Math.min(window.innerWidth - 40, x)) + 'px';
  d.style.top = Math.max(70, y) + 'px';
  $('floaters').appendChild(d);
  d.addEventListener('animationend', () => d.remove());
  setTimeout(() => d.remove(), 1500);
}

// ============================================================ screens
const SCREENS = ['scrTitle', 'scrLevels', 'scrIntro', 'scrPause', 'scrResult', 'scrSkins', 'scrAlbum', 'scrSettings'];
let current = null;
function show(id) {
  for (const s of SCREENS) $(s).hidden = s !== id;
  current = id;
}
function hud(on) {
  $('hud').hidden = !on;
  $('controls').hidden = !(on && touch);
  if (!on) {
    $('arrows').innerHTML = '';
    arrowEls.length = 0;
    showHint(null);
    $('keysHint').hidden = true;
  }
}

let selMode = 'level', curLevel = 0, curMode = 'level';
let skinsBefore = [];

function toTitle() {
  game.menuFocus = false;
  if (game.mode !== 'menu') game.load(0, 'menu');
  hud(false);
  releaseWake();
  show('scrTitle');
  $('saveNote').hidden = storageOk;
  if (!storageOk) $('saveNote').textContent = 'Di mode ini progres tidak bisa disimpan, jadi semua pulau langsung dibuka.';
  playMusic('menu');
}
function openLevels(mode) {
  selMode = mode;
  $('levelsTitle').textContent = mode === 'free' ? 'Main Bebas: pilih pulau' : 'Pilih Pulau';
  renderLevels();
  show('scrLevels');
}
function renderLevels() {
  $('totStars').textContent = totalStars();
  $('totMedals').textContent = totalMedals();
  const list = $('levelList');
  list.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const rec = save.levels[i];
    const unlocked = i < save.unlocked;
    const T = THEMES[L.theme];
    const b = document.createElement('button');
    b.className = 'lcard' + (unlocked ? '' : ' locked');
    const stars = [0, 1, 2].map((k) => `<i class="i-star${k < rec.stars ? ' on' : ''}"></i>`).join('');
    const medals = rec.medals.map((m) => `<i class="i-medal${m ? ' on' : ''}"></i>`).join('');
    b.innerHTML = `
      <div class="isle" style="background:${hex(T.sky)}"><div class="top" style="background-color:${hex(T.grass[0])}"></div><div class="side" style="background-color:${hex(T.side)}"></div>${catFace(L.tip.cat, !unlocked)}</div>
      <span class="num">Pulau ${i + 1}</span>
      <span class="nm">${L.name}</span>
      ${unlocked ? `<span class="st">${stars}${medals}</span><span class="best">${rec.best ? 'Rekor: ' + rec.best + ' poin' : 'Belum dimainkan'}</span>` : `<span class="lockmsg"><i class="i-lock"></i>Dapatkan 1 bintang di pulau ${i}</span>`}`;
    b.addEventListener('click', () => {
      if (!unlocked) { sfx.denied(); return; }
      sfx.click();
      startLevel(i, selMode);
    });
    list.appendChild(b);
  });
}
function unlockedSkins() { return SKINS.filter(skinUnlocked).map((s) => s.id); }
function skinUnlocked(s) {
  if (!s.req) return true;
  if (s.req.stars) return totalStars() >= s.req.stars;
  if (s.req.medals) return totalMedals() >= s.req.medals;
  return false;
}
function startLevel(i, mode, skipIntro) {
  curLevel = i;
  curMode = mode;
  skinsBefore = unlockedSkins();
  game.menuFocus = false;
  game.load(i, mode);
  hud(false);
  playMusic(LEVELS[i].theme);
  if (skipIntro) { beginCountdown(); return; }
  renderIntro();
  show('scrIntro');
}
function renderIntro() {
  const L = LEVELS[curLevel];
  const free = curMode === 'free';
  $('inEyebrow').textContent = free ? `Main Bebas · Pulau ${curLevel + 1}` : `Pulau ${curLevel + 1} dari ${LEVELS.length}`;
  $('inName').textContent = L.name;
  $('inText').textContent = free ? 'Tanpa batas waktu! Tangkap kucing sepuasnya. Tekan tombol jeda kalau mau selesai.' : L.intro;
  $('inTargets').hidden = free;
  $('inTargets').innerHTML = free ? '' : L.stars.map((s, k) => `<span class="tg">${'<i class="i-star on"></i>'.repeat(k + 1)}<b>${s}</b>&nbsp;poin</span>`).join('');
  $('inTip').innerHTML = `${catFace(L.tip.cat)}<p>${L.tip.text}</p>`;
  $('inWarn').hidden = !L.warn;
  $('inWarn').textContent = L.warn || '';
  const rec = save.levels[curLevel];
  $('inMissions').hidden = free;
  $('inMissions').innerHTML = free ? '' : `<p class="lbl2" style="margin-top:2px">Misi bonus</p>` + L.missions.map((m, k) => `<div class="mis${rec.medals[k] ? ' done' : ''}"><i class="i-medal${rec.medals[k] ? ' on' : ''}"></i><span>${m.text}</span></div>`).join('');
}
let wakeLock = null;
function requestWake() {
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((w) => (wakeLock = w)).catch(() => {}); } catch (e) {}
}
function releaseWake() {
  try { if (wakeLock) wakeLock.release(); } catch (e) {}
  wakeLock = null;
}
let cdTimers = [];
function beginCountdown() {
  cdTimers.forEach(clearTimeout);
  cdTimers = [];
  show(null);
  hud(true);
  setupHud();
  game.state = 'countdown';
  requestWake();
  const el = $('countdown');
  el.hidden = false;
  const steps = ['3', '2', '1', 'TANGKAP!'];
  steps.forEach((s, k) => {
    cdTimers.push(setTimeout(() => {
      el.className = k === 3 ? 'word' : '';
      el.innerHTML = `<span>${s}</span>`;
      sfx.count(k < 3 ? 1 : 0);
      if (k === 3) game.begin();
    }, k * 650));
  });
  cdTimers.push(setTimeout(() => { el.hidden = true; }, 4 * 650 + 300));
  if (!touch) {
    $('keysHint').hidden = false;
    cdTimers.push(setTimeout(() => ($('keysHint').hidden = true), 9000));
  }
  if (touch && window.innerWidth < window.innerHeight && !rotateShown) {
    rotateShown = true;
    const r = $('rotateTip');
    r.hidden = false;
    cdTimers.push(setTimeout(() => (r.hidden = true), 3600));
  }
}
let rotateShown = false;

function togglePause() {
  if (game.state === 'play') {
    game.pause(true);
    syncToggles();
    show('scrPause');
  } else if (game.state === 'paused' && current === 'scrPause') resume();
}
function resume() {
  show(null);
  game.pause(false);
}
function quit() {
  cdTimers.forEach(clearTimeout);
  $('countdown').hidden = true;
  if (curMode === 'free' && (game.state === 'paused' || game.state === 'play')) {
    game.state = 'play';
    game.quitFree();
    return;
  }
  persist();
  toTitle();
}

// ============================================================ HUD
const hudCache = {};
function setupHud() {
  const L = LEVELS[curLevel];
  const free = curMode === 'free';
  $('scoreCard').querySelector('.bar').hidden = free;
  const marks = [...document.querySelectorAll('#scoreCard .mark')];
  marks.forEach((m, k) => { m.style.left = (L.stars[k] / L.stars[2]) * 100 + '%'; m.classList.remove('on'); });
  $('timer').classList.toggle('free', free);
  $('ccIcon').innerHTML = catFace('oren');
  $('powers').innerHTML = '';
  for (const k in hudCache) delete hudCache[k];
}
function setText(id, v) {
  if (hudCache[id] === v) return;
  hudCache[id] = v;
  $(id).textContent = v;
}
function updateHud() {
  const g = game, w = g.wolf, L = LEVELS[curLevel];
  setText('score', String(g.score));
  setText('count', String(g.count));
  if (curMode === 'level') {
    const t = Math.max(0, Math.ceil(g.timeLeft));
    setText('timer', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
    const low = t <= 10 && g.state === 'play';
    if (hudCache.low !== low) { hudCache.low = low; $('timer').classList.toggle('low', low); }
    const pct = Math.min(100, (g.score / L.stars[2]) * 100);
    if (hudCache.pct !== pct) { hudCache.pct = pct; $('barFill').style.width = pct + '%'; }
    const marks = document.querySelectorAll('#scoreCard .mark');
    L.stars.forEach((s, k) => {
      const on = g.score >= s;
      if (on && !marks[k].classList.contains('on')) { marks[k].classList.add('on', 'pop'); sfx.star(k); }
    });
  } else {
    setText('timer', 'BEBAS');
  }
  const hm = Math.round(w.howlMeter * 100) / 100;
  if (hudCache.hm !== hm) {
    hudCache.hm = hm;
    const b = $('btnHowl');
    b.style.setProperty('--m', hm);
    b.classList.toggle('ready', hm >= 1);
  }
  const cd = Math.round((1 - w.pounceCD / 1.0) * 20) / 20;
  if (hudCache.cd !== cd) {
    hudCache.cd = cd;
    const b = $('btnPounce');
    b.style.setProperty('--m', cd);
    b.classList.toggle('cool', cd < 1);
  }
  const act = [];
  if (w.boost > 0) act.push(['CEPAT', Math.ceil(w.boost), '#ffffff']);
  if (w.magnet > 0) act.push(['MAGNET', Math.ceil(w.magnet), '#4cc9f0']);
  if (w.double > 0) act.push(['POIN x2', Math.ceil(w.double), '#ffd60a']);
  const key = act.map((a) => a.join()).join('|');
  if (hudCache.pw !== key) {
    hudCache.pw = key;
    $('powers').innerHTML = act.map(([n, s, c]) => `<div class="pw"><i style="background:${c}">${s}</i>${n}</div>`).join('');
  }
}

// offscreen cat pointers
const arrowEls = [];
const _p = new THREE.Vector3();
function updateArrows() {
  const box = $('arrows');
  if (game.state !== 'play') {
    if (arrowEls.length) { box.innerHTML = ''; arrowEls.length = 0; }
    return;
  }
  const W = window.innerWidth, H = window.innerHeight;
  const wp = game.wolf.body.pos;
  const c = [];
  for (const cat of game.cats) {
    if (cat.state === 'caught') continue;
    _p.copy(cat.body.pos);
    _p.y += 0.5;
    _p.project(camera);
    let x = _p.x, y = _p.y;
    if (_p.z > 1) { x = -x; y = -y; }
    else if (Math.abs(x) < 0.97 && Math.abs(y) < 0.94) continue;
    const special = cat.T.gold || cat.T.boss;
    const d = Math.hypot(cat.body.pos.x - wp.x, cat.body.pos.z - wp.z);
    c.push({ cat, x, y, pri: special ? -1 : d });
  }
  c.sort((a, b) => a.pri - b.pri);
  const n = Math.min(3, c.length);
  while (arrowEls.length < n) {
    const d = document.createElement('div');
    d.className = 'arrow';
    d.innerHTML = '<div class="face"></div><div class="ptr"></div>';
    box.appendChild(d);
    arrowEls.push(d);
  }
  while (arrowEls.length > n) arrowEls.pop().remove();
  for (let i = 0; i < n; i++) {
    const { cat, x, y } = c[i];
    const el = arrowEls[i];
    const k = Math.min(0.9 / Math.max(Math.abs(x), 1e-4), 0.84 / Math.max(Math.abs(y), 1e-4));
    let px = ((x * k + 1) / 2) * W, py = ((1 - y * k) / 2) * H;
    px = Math.max(34, Math.min(W - 34, px));
    py = Math.max(90, Math.min(H - 40, py));
    if (touch) {
      if (px < 240 && py > H - 190) py = H - 190;
      if (px > W - 270 && py > H - 230) py = H - 230;
    }
    el.style.left = px + 'px';
    el.style.top = py + 'px';
    el.lastChild.style.transform = `rotate(${Math.atan2(-y, x)}rad)`;
    if (el.dataset.id !== cat.id) {
      el.dataset.id = cat.id;
      el.firstChild.innerHTML = catFace(cat.id);
      el.classList.toggle('gold', !!cat.T.gold);
      el.classList.toggle('boss', !!cat.T.boss);
    }
  }
}

// see-through circle so trees and roofs never hide the wolf
const _cv = new THREE.Vector3();
const _db = new THREE.Vector2();
function updateCutout() {
  const on = (game.mode !== 'menu' || game.menuFocus) && game.state !== 'intro';
  if (!on) { CUT.radius.value = 0; return; }
  const w = game.wolf.body.pos;
  _cv.set(w.x, w.y + 0.9, w.z).project(camera);
  renderer.getDrawingBufferSize(_db);
  CUT.center.value.set(((_cv.x + 1) / 2) * _db.x, ((_cv.y + 1) / 2) * _db.y);
  CUT.depth.value = _cv.z * 0.5 + 0.5 - 0.002;
  CUT.radius.value = Math.min(_db.x, _db.y) * 0.19;
  CUT.minY.value = w.y + 0.7;
}

// ============================================================ results
const TITLES = ['Hampir! Coba lagi ya', 'Bagus!', 'Hebat!', 'LUAR BIASA!'];
let starTimers = [];
function showResult(res) {
  hud(false);
  releaseWake();
  starTimers.forEach(clearTimeout);
  starTimers = [];
  const free = res.mode === 'free';
  const L = LEVELS[res.li];
  $('rsTitle').textContent = free ? 'Main bebas selesai!' : TITLES[res.stars];
  $('rsStars').hidden = free;
  $('rsStars').innerHTML = [0, 1, 2].map((k) => `<i class="i-star${k < res.stars ? ' on' : ''}"></i>`).join('');
  const starEls = [...$('rsStars').children];
  starEls.forEach((s, k) => starTimers.push(setTimeout(() => { s.classList.add('show'); if (k < res.stars) sfx.star(k); }, 350 + k * 380)));
  $('rsScore').textContent = res.score;
  $('rsCount').textContent = res.count;
  $('rsBest').textContent = free ? '-' : save.levels[res.li].best;
  $('rsBestBox').hidden = free;
  $('rsNew').hidden = free || !res.newBest || res.score === 0;
  $('rsBreak').innerHTML = CAT_ORDER.filter((id) => res.caughtBy[id]).map((id) => `<span class="bd">${catFace(id)}×${res.caughtBy[id]}</span>`).join('') || '<p class="sub">Belum ada kucing yang tertangkap.</p>';
  $('rsMissions').hidden = free;
  $('rsMissions').innerHTML = free ? '' : L.missions.map((m, k) => {
    const done = save.levels[res.li].medals[k];
    const fresh = res.missions[k];
    return `<div class="mis${done ? ' done' : ''}"><i class="i-medal${done ? ' on' : ''}"></i><span>${m.text}</span>${fresh ? '<span class="newtag">SELESAI</span>' : ''}</div>`;
  }).join('');
  const un = [];
  if (res.unlockedNext) un.push(`Pulau baru terbuka: ${LEVELS[res.li + 1].name}!`);
  const nowSkins = unlockedSkins();
  for (const id of nowSkins) if (!skinsBefore.includes(id)) un.push(`Serigala baru: ${skinById(id).name}! Cek di Serigalaku`);
  $('rsUnlocks').innerHTML = un.map((t) => `<div class="unlock">${t}</div>`).join('');
  const hasNext = !free && res.li + 1 < LEVELS.length && save.unlocked > res.li + 1;
  $('btnNext').hidden = !hasNext;
  $('btnAgain').textContent = free ? 'Main lagi' : 'Ulangi';
  $('btnAgain').className = hasNext ? 'btn blue' : 'btn big green';
  show('scrResult');
  sfx.fanfare(free || res.stars > 0);
  playMusic('result');
}

// ============================================================ skins / album / settings
function openSkins() {
  game.menuFocus = true;
  const ws = game.world.marks.wolfStart;
  game.wolf.place(ws.x, ws.z);
  game.wolf.body.vel.set(0, 0, 0);
  renderSkins();
  show('scrSkins');
}
function renderSkins() {
  document.querySelectorAll('.jsStars').forEach((e) => (e.textContent = totalStars()));
  document.querySelectorAll('.jsMedals').forEach((e) => (e.textContent = totalMedals()));
  const list = $('skinList');
  list.innerHTML = '';
  for (const s of SKINS) {
    const ok = skinUnlocked(s);
    const b = document.createElement('button');
    b.className = 'skin' + (save.skin === s.id ? ' sel' : '') + (ok ? '' : ' locked');
    const req = !s.req ? 'Awal' : s.req.stars ? `<i class="i-star on"></i>${s.req.stars}` : `<i class="i-medal on"></i>${s.req.medals}`;
    b.innerHTML = `${wolfFace(s, !ok)}<span>${s.name}</span><span class="req">${ok ? (save.skin === s.id ? 'Dipakai' : 'Pakai') : req}</span>`;
    b.addEventListener('click', () => {
      if (!ok) { sfx.denied(); return; }
      save.skin = s.id;
      persist();
      game.wolf.setSkin(s);
      game.wolf.howlT = 1.3;
      sfx.howl();
      renderSkins();
    });
    list.appendChild(b);
  }
}
function openAlbum() {
  $('albumTotal').textContent = `Total kucing yang pernah ditangkap: ${save.total}`;
  $('albumGrid').innerHTML = CAT_ORDER.map((id) => {
    const n = save.album[id] || 0;
    const T = CAT_TYPES[id];
    return `<div class="acard${n ? '' : ' locked'}">${catFace(id, !n)}<b>${n ? T.name : '???'}</b><p>${n ? T.desc : 'Belum pernah ditangkap. Cari di pulau-pulau!'}</p><span class="cnt">Ditangkap: ${n}</span><span class="cnt">${T.value} poin</span></div>`;
  }).join('');
  show('scrAlbum');
}
function syncToggles() {
  for (const id of ['sMusic', 'pMusic']) $(id).classList.toggle('on', save.settings.music);
  for (const id of ['sSfx', 'pSfx']) $(id).classList.toggle('on', save.settings.sfx);
  document.querySelectorAll('#sQuality button').forEach((b) => b.classList.toggle('on', b.dataset.q === save.settings.quality));
  $('sFs').classList.toggle('on', save.settings.fullscreen !== false);
  $('sFs').hidden = !canFullscreen(); // iPhone Safari: no element fullscreen (installed app is already fullscreen)
}
function toggleMusic() { save.settings.music = !save.settings.music; setMusic(save.settings.music); persist(); syncToggles(); }
function toggleSfx() { save.settings.sfx = !save.settings.sfx; setSfx(save.settings.sfx); persist(); syncToggles(); sfx.click(); }
function confirmBtn(btn, label, fn) {
  if (btn.dataset.armed) {
    delete btn.dataset.armed;
    btn.textContent = label;
    btn.classList.remove('danger');
    fn();
    return;
  }
  btn.dataset.armed = '1';
  btn.textContent = 'Yakin? Tekan sekali lagi';
  btn.classList.add('danger');
  setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = label; btn.classList.remove('danger'); } }, 3500);
}

// ============================================================ wiring
function on(id, fn) {
  $(id).addEventListener('click', (e) => {
    initAudio();
    fn(e);
  });
}
function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
function canFullscreen() {
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}
// Fullscreen is on by default. Browsers only allow it inside a user gesture,
// so we (re)enter on the first tap and on every button tap while enabled.
function goFullscreen() {
  if (save.settings.fullscreen === false || isFullscreen() || !canFullscreen()) return;
  try {
    const el = document.documentElement;
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen();
    if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
  } catch (e) {}
}
function exitFullscreen() {
  if (!isFullscreen()) return;
  try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {}
}
function toggleFs() {
  save.settings.fullscreen = save.settings.fullscreen === false;
  persist(); syncToggles(); sfx.click();
  if (save.settings.fullscreen) goFullscreen(); else exitFullscreen();
}
on('btnPlay', () => { sfx.click(); goFullscreen(); openLevels('level'); });
on('btnFree', () => { sfx.click(); goFullscreen(); openLevels('free'); });
on('btnSkins', () => { sfx.click(); openSkins(); });
on('btnAlbum', () => { sfx.click(); openAlbum(); });
on('btnSettings', () => { sfx.click(); syncToggles(); show('scrSettings'); });
on('btnStart', () => { sfx.click(); beginCountdown(); });
on('btnPause', () => { sfx.click(); togglePause(); });
on('btnResume', () => { sfx.click(); resume(); });
on('btnRestart', () => { sfx.click(); startLevel(curLevel, curMode, true); });
on('btnQuit', () => { sfx.click(); quit(); });
on('btnMenu', () => { sfx.click(); toTitle(); });
on('btnAgain', () => { sfx.click(); startLevel(curLevel, curMode, true); });
on('btnNext', () => { sfx.click(); startLevel(curLevel + 1, 'level'); });
on('sMusic', toggleMusic);
on('pMusic', toggleMusic);
on('sSfx', toggleSfx);
on('sFs', toggleFs);
on('pSfx', toggleSfx);
document.querySelectorAll('#sQuality button').forEach((b) =>
  b.addEventListener('click', () => { save.settings.quality = b.dataset.q; adapt = 1; persist(); syncToggles(); resize(); sfx.click(); })
);
on('btnUnlockAll', (e) => confirmBtn(e.currentTarget, 'Buka semua pulau', () => { save.unlocked = LEVELS.length; persist(); toast('<span>Semua pulau sudah dibuka</span>'); }));
on('btnReset', (e) => confirmBtn(e.currentTarget, 'Hapus progres', () => { resetSave(); game.wolf.setSkin(skinById('abu')); syncToggles(); toast('<span>Progres sudah dihapus</span>'); }));
document.querySelectorAll('[data-back]').forEach((b) =>
  b.addEventListener('click', () => {
    sfx.click();
    if (current === 'scrIntro') { game.load(0, 'menu'); openLevels(selMode); playMusic('menu'); }
    else toTitle();
  })
);

// first tap: unlock audio
function firstTap() {
  initAudio();
  playMusic(current === 'scrTitle' || !current ? 'menu' : LEVELS[curLevel].theme);
  $('tapFirst').hidden = true;
  window.removeEventListener('pointerdown', firstTap, true);
  window.removeEventListener('keydown', firstTap, true);
}
window.addEventListener('pointerdown', firstTap, true);
window.addEventListener('click', (e) => { if (!(e.target.closest && e.target.closest('#sFs'))) goFullscreen(); }, true);
window.addEventListener('keydown', (e) => { if (e.key !== 'Escape') goFullscreen(); }, true);
window.addEventListener('keydown', firstTap, true);

// ============================================================ input
const inp = game.inp;
const stick = { id: null, ox: 0, oy: 0 };
const SR = 54;
const stickEl = $('stick'), knob = $('knob'), zone = $('stickZone');
function stickHome() {
  if (stick.id !== null) return;
  const portrait = window.innerWidth < window.innerHeight;
  stickEl.style.left = 96 + 'px';
  stickEl.style.top = window.innerHeight - (portrait ? 150 : 104) + 'px';
}
function moveStick(e) {
  let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
  const d = Math.hypot(dx, dy);
  if (d > SR) {
    stick.ox = e.clientX - (dx / d) * SR;
    stick.oy = e.clientY - (dy / d) * SR;
    dx = (dx / d) * SR;
    dy = (dy / d) * SR;
    stickEl.style.left = stick.ox + 'px';
    stickEl.style.top = stick.oy + 'px';
  }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  let mx = dx / SR, mz = dy / SR;
  const m = Math.hypot(mx, mz);
  if (m < 0.14) { mx = mz = 0; }
  else { const k = Math.min(1, (m - 0.14) / 0.72) / m; mx *= k; mz *= k; }
  inp.mx = mx;
  inp.mz = mz;
}
zone.addEventListener('pointerdown', (e) => {
  if (stick.id !== null) return;
  e.preventDefault();
  stick.id = e.pointerId;
  stick.ox = e.clientX;
  stick.oy = e.clientY;
  stickEl.style.left = e.clientX + 'px';
  stickEl.style.top = e.clientY + 'px';
  stickEl.classList.add('active');
  try { zone.setPointerCapture(e.pointerId); } catch (er) {}
  moveStick(e);
});
zone.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) moveStick(e); });
const endStick = (e) => {
  if (e.pointerId !== stick.id) return;
  stick.id = null;
  inp.mx = inp.mz = 0;
  knob.style.transform = '';
  stickEl.classList.remove('active');
  stickHome();
};
zone.addEventListener('pointerup', endStick);
zone.addEventListener('pointercancel', endStick);
zone.addEventListener('lostpointercapture', endStick);

function bindAct(el, fn) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.classList.add('pressed');
    fn();
    try { el.setPointerCapture(e.pointerId); } catch (er) {}
  });
  const up = () => el.classList.remove('pressed');
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
}
bindAct($('btnJump'), () => (inp.jump = true));
bindAct($('btnPounce'), () => (inp.pounce = true));
bindAct($('btnHowl'), () => (inp.howl = true));

const keys = {};
let usingKeys = false;
window.addEventListener('keydown', (e) => {
  const c = e.code;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c) && (game.state === 'play' || game.state === 'countdown')) e.preventDefault();
  keys[c] = true;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) usingKeys = true;
  if (e.repeat) return;
  if (c === 'Space') inp.jump = true;
  if (c === 'KeyJ' || c === 'ShiftLeft' || c === 'ShiftRight' || c === 'KeyX') inp.pounce = true;
  if (c === 'KeyK' || c === 'KeyE' || c === 'KeyC') inp.howl = true;
  if (c === 'KeyP' || c === 'Escape') { if (game.state === 'play' || game.state === 'paused') togglePause(); }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
function keyboardInput() {
  if (!usingKeys || stick.id !== null || game.mode === 'menu') return;
  let x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let z = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  const m = Math.hypot(x, z);
  if (m > 0) { x /= m; z /= m; }
  inp.mx = x;
  inp.mz = z;
}
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (game.state === 'play') togglePause();
    suspendAudio(true);
  } else suspendAudio(false);
});
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ============================================================ loop
let last = performance.now();
let perfAcc = 0, perfN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (!(dt > 0)) dt = 0.016;
  if (dt > 0.1) dt = 0.1;
  keyboardInput();
  const n = Math.ceil(dt / (1 / 50));
  for (let i = 0; i < n; i++) game.update(dt / n);
  if (game.state === 'play' || game.state === 'countdown') updateHud();
  updateArrows();
  updateCutout();
  renderer.render(scene, camera);
  if (game.state === 'play' && save.settings.quality === 'auto') {
    perfAcc += dt;
    perfN++;
    if (perfN >= 150) {
      const avg = perfAcc / perfN;
      if (avg > 0.026 && adapt > 0.6) { adapt -= 0.15; resize(); }
      perfAcc = perfN = 0;
    }
  }
}

// ============================================================ boot
setMusic(save.settings.music);
setSfx(save.settings.sfx);
audioState.music = save.settings.music;
audioState.sfx = save.settings.sfx;
if (!storageOk) save.unlocked = LEVELS.length;
resize();
toTitle();
requestAnimationFrame((t) => {
  last = t;
  frame(t);
  setTimeout(() => { $('loading').hidden = true; }, 150);
});
window.__awuu = { game, save, THREE, renderer };

import * as THREE from 'three';
import { makeRadialTexture } from './blocks.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

// ---------------------------------------------------------------- cube particles
export class Particles {
  constructor(scene, max = 600) {
    this.max = max;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x222222 });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.setColorAt(0, _c.set(0xffffff));
    scene.add(this.mesh);
    this.list = [];
  }
  emit(x, y, z, o = {}) {
    const n = o.n || 10;
    const cols = Array.isArray(o.color) ? o.color : [o.color ?? 0xffffff];
    for (let i = 0; i < n; i++) {
      if (this.list.length >= this.max) this.list.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = (o.speed ?? 4) * (0.4 + Math.random() * 0.8);
      const up = o.up ?? 4;
      const life = (o.life ?? 0.8) * (0.7 + Math.random() * 0.6);
      this.list.push({
        x: x + (Math.random() - 0.5) * (o.spread ?? 0.3),
        y: y + (Math.random() - 0.5) * (o.spread ?? 0.3),
        z: z + (Math.random() - 0.5) * (o.spread ?? 0.3),
        vx: Math.cos(a) * sp + (o.vx || 0),
        vy: up * (0.5 + Math.random() * 0.8),
        vz: Math.sin(a) * sp + (o.vz || 0),
        life, max: life,
        size: (o.size ?? 0.18) * (0.7 + Math.random() * 0.6),
        grav: o.grav ?? 12,
        drag: o.drag ?? 1.5,
        spin: (Math.random() - 0.5) * 10,
        rot: Math.random() * 6,
        color: cols[Math.floor(Math.random() * cols.length)],
      });
    }
  }
  update(dt) {
    const L = this.list;
    let j = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy -= p.grav * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.rot += p.spin * dt;
      L[j++] = p;
    }
    L.length = j;
    const m = this.mesh;
    for (let i = 0; i < j; i++) {
      const p = L[i];
      const k = Math.min(1, (p.life / p.max) * 1.6);
      const s = p.size * k;
      _e.set(p.rot, p.rot * 0.7, 0);
      _q.setFromEuler(_e);
      _s.set(s, s, s);
      _p.set(p.x, p.y, p.z);
      _m.compose(_p, _q, _s);
      m.setMatrixAt(i, _m);
      m.setColorAt(i, _c.set(p.color));
    }
    m.count = j;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
  clear() { this.list.length = 0; this.mesh.count = 0; }
}

// ---------------------------------------------------------------- blob shadows
export class Shadows {
  constructor(scene, max = 64) {
    const tex = makeRadialTexture('rgba(20,30,40,0.42)', 'rgba(20,30,40,0)');
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    this.mesh.count = 0;
    this.max = max;
    this.n = 0;
    scene.add(this.mesh);
  }
  begin() { this.n = 0; }
  add(x, y, z, size) {
    if (this.n >= this.max) return;
    _p.set(x, y + 0.03, z);
    _q.identity();
    _s.set(size, 1, size);
    _m.compose(_p, _q, _s);
    this.mesh.setMatrixAt(this.n++, _m);
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- rings (howl wave, pickups)
export class Rings {
  constructor(scene) {
    this.pool = [];
    this.scene = scene;
    const geo = new THREE.RingGeometry(0.85, 1, 40);
    geo.rotateX(-Math.PI / 2);
    this.geo = geo;
  }
  spawn(x, y, z, o = {}) {
    let r = this.pool.find((p) => !p.alive);
    if (!r) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.renderOrder = 5;
      this.scene.add(mesh);
      r = { mesh };
      this.pool.push(r);
    }
    r.alive = true;
    r.t = 0;
    r.dur = o.dur ?? 0.8;
    r.from = o.from ?? 0.5;
    r.to = o.to ?? 6;
    r.mesh.material.color.set(o.color ?? 0xffffff);
    r.mesh.position.set(x, y + 0.1, z);
    r.mesh.visible = true;
    r.opacity = o.opacity ?? 0.8;
  }
  update(dt) {
    for (const r of this.pool) {
      if (!r.alive) continue;
      r.t += dt;
      const k = r.t / r.dur;
      if (k >= 1) { r.alive = false; r.mesh.visible = false; continue; }
      const e = 1 - Math.pow(1 - k, 3);
      const s = r.from + (r.to - r.from) * e;
      r.mesh.scale.set(s, 1, s);
      r.mesh.material.opacity = r.opacity * (1 - k);
    }
  }
  clear() { for (const r of this.pool) { r.alive = false; r.mesh.visible = false; } }
}

// ---------------------------------------------------------------- speech icons over heads
function iconTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.lineJoin = 'round';
  if (kind === 'heart') {
    g.fillStyle = '#ff4d8d';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(64, 108);
    g.bezierCurveTo(10, 70, 12, 22, 44, 22);
    g.bezierCurveTo(56, 22, 62, 30, 64, 38);
    g.bezierCurveTo(66, 30, 72, 22, 84, 22);
    g.bezierCurveTo(116, 22, 118, 70, 64, 108);
    g.closePath();
    g.stroke();
    g.fill();
  } else {
    const bg = { '!': '#ffd60a', '!!': '#ff5d5d', '?': '#8fd3ff', zzz: '#c8b6ff', '♪': '#ffffff' }[kind] || '#fff';
    g.fillStyle = bg;
    g.strokeStyle = '#1f2a44';
    g.lineWidth = 8;
    g.beginPath();
    const x0 = 14, y0 = 14, w0 = 100, h0 = 84, r0 = 26;
    g.moveTo(x0 + r0, y0);
    g.arcTo(x0 + w0, y0, x0 + w0, y0 + h0, r0);
    g.arcTo(x0 + w0, y0 + h0, x0, y0 + h0, r0);
    g.lineTo(76, y0 + h0);
    g.lineTo(64, 118);
    g.lineTo(52, y0 + h0);
    g.arcTo(x0, y0 + h0, x0, y0, r0);
    g.arcTo(x0, y0, x0 + w0, y0, r0);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#1f2a44';
    g.font = 'bold 64px Fredoka, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(kind, 64, 58);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export class Icons {
  constructor(scene) {
    this.scene = scene;
    this.tex = {};
    this.pool = [];
  }
  show(kind, target, o = {}) {
    if (!this.tex[kind]) this.tex[kind] = iconTexture(kind);
    let s = this.pool.find((p) => !p.alive);
    if (!s) {
      const mat = new THREE.SpriteMaterial({ map: this.tex[kind], transparent: true, depthTest: false });
      const sp = new THREE.Sprite(mat);
      sp.renderOrder = 10;
      this.scene.add(sp);
      s = { sp };
      this.pool.push(s);
    }
    s.sp.material.map = this.tex[kind];
    s.sp.material.needsUpdate = true;
    s.alive = true;
    s.t = 0;
    s.dur = o.dur ?? 0.9;
    s.target = target; // object with pos (Vector3) & height or a Vector3
    s.h = o.h ?? 1.6;
    s.size = o.size ?? 0.8;
    s.float = o.float ?? 0;
    s.fixed = target.isVector3 ? target.clone() : null;
    s.sp.visible = true;
  }
  update(dt) {
    for (const s of this.pool) {
      if (!s.alive) continue;
      s.t += dt;
      if (s.t >= s.dur) { s.alive = false; s.sp.visible = false; continue; }
      const base = s.fixed || s.target.pos;
      const pop = Math.min(1, s.t * 8);
      const out = s.t > s.dur - 0.2 ? (s.dur - s.t) / 0.2 : 1;
      const k = pop * out * (pop < 1 ? 1.2 : 1);
      s.sp.position.set(base.x, base.y + s.h + s.t * s.float, base.z);
      s.sp.scale.set(s.size * k, s.size * k, 1);
      s.sp.material.opacity = out;
    }
  }
  clear() { for (const s of this.pool) { s.alive = false; s.sp.visible = false; } }
}

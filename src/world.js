import * as THREE from 'three';
import { Builder, MAT, SEA_TEX } from './blocks.js';
import { mulberry32, hash2 } from './util.js';

export const WATER = 1, ICE = 2, BOUNCE = 4, PATH = 8;

export const THEMES = {
  park: {
    grass: [0x86d95f, 0x7ccf57], path: 0xecd6a2, side: 0x9b6b3f, sideTop: 0x62b247, deep: 0x7a5230,
    sea: 0x3aa8f0, sky: 0xaee4ff, water: 0x4fc3f7, leaf: [0x4caf50, 0x66bb44, 0x3f9f3a], trunk: 0x8b5a2b,
    fence: 0xffffff, fenceKind: 'picket',
  },
  village: {
    grass: [0x93db62, 0x89d15a], path: 0xcfa96e, side: 0x9b6b3f, sideTop: 0x6db64a, deep: 0x7a5230,
    sea: 0x3aa8f0, sky: 0xbfe6ff, water: 0x4fc3f7, leaf: [0x52b04a, 0x6cc04a, 0x44a043], trunk: 0x7d5230,
    fence: 0xb07a45, fenceKind: 'wood',
  },
  forest: {
    grass: [0x62b34b, 0x5aa945], path: 0xb89466, side: 0x7d5a38, sideTop: 0x4c953a, deep: 0x5e422a,
    sea: 0x2e9bd6, sky: 0xb6e3d4, water: 0x48b5e8, leaf: [0x2f8a3a, 0x3b9a44, 0x2a7a35], trunk: 0x6b4426,
    fence: 0x8d8d8d, fenceKind: 'stone',
  },
  beach: {
    grass: [0xf6e0a2, 0xf0d793], path: 0xd9b77a, side: 0xe0bd78, sideTop: 0xe8c987, deep: 0xc9a266,
    sea: 0x1fb3e0, sky: 0x9ae6ff, water: 0x37c6ee, leaf: [0x3fae4a, 0x55c052], trunk: 0xa0703f,
    fence: 0xe8c07a, fenceKind: 'rope',
  },
  snow: {
    grass: [0xeaf2fb, 0xdfe9f6], path: 0xc3d0e6, side: 0x9fb8d6, sideTop: 0xd6e3f3, deep: 0x7f9bbd,
    sea: 0x4d9ed8, sky: 0xd4ecff, water: 0x7fd3f7, leaf: [0x2f7a4a, 0x3a8a55], trunk: 0x6b4a33,
    fence: 0xb8e4ff, fenceKind: 'ice', ice: [0xc4ecff, 0xb3e2fb],
  },
};

export class World {
  constructor(W, D, theme) {
    this.W = W;
    this.D = D;
    this.theme = theme;
    const n = W * D;
    this.ground = new Float32Array(n);
    this.col = new Float32Array(n);
    this.flag = new Uint8Array(n);
    this.occ = new Uint8Array(n);
    this.tcol = new Uint32Array(n);
    this.b = new Builder();
    this.reserve = [];
    this.marks = { dogRoutes: [], crabs: [] };
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) this.tcol[z * W + x] = theme.grass[(x + z) & 1];
  }
  I(x, z) { return z * this.W + x; }
  inb(x, z) { return x >= 0 && z >= 0 && x < this.W && z < this.D; }
  colC(x, z) { return this.inb(x, z) ? this.col[z * this.W + x] : 99; }
  colAt(x, z) { return this.colC(Math.floor(x), Math.floor(z)); }
  flagAt(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    return this.inb(ix, iz) ? this.flag[iz * this.W + ix] : 0;
  }
  gC(x, z) { return this.inb(x, z) ? this.ground[this.I(x, z)] : 0; }
  setGround(x, z, h, color) {
    if (!this.inb(x, z)) return;
    const i = this.I(x, z);
    this.ground[i] = h;
    this.col[i] = h;
    this.flag[i] &= ~WATER;
    if (color !== undefined) this.tcol[i] = color;
  }
  path(x, z, color) {
    if (!this.inb(x, z)) return;
    const i = this.I(x, z);
    if (this.flag[i] & WATER) return;
    this.flag[i] |= PATH;
    this.tcol[i] = color;
  }
  water(x, z) {
    if (!this.inb(x, z)) return;
    const i = this.I(x, z);
    this.ground[i] = -0.5;
    this.col[i] = -0.5;
    this.flag[i] = WATER;
    this.tcol[i] = this.theme.path;
  }
  solid(x, z, top) {
    if (!this.inb(x, z)) return;
    const i = this.I(x, z);
    this.col[i] = Math.max(this.col[i], top);
    this.occ[i] = 1;
  }
  occupy(x, z, w = 1, d = 1) {
    for (let zz = z; zz < z + d; zz++) for (let xx = x; xx < x + w; xx++) if (this.inb(xx, zz)) this.occ[this.I(xx, zz)] = 1;
  }
  free(x, z, w = 1, d = 1, pad = 0, allowPath = false) {
    const g0 = this.gC(x, z);
    for (let zz = z - pad; zz < z + d + pad; zz++)
      for (let xx = x - pad; xx < x + w + pad; xx++) {
        if (!this.inb(xx, zz)) return false;
        const i = this.I(xx, zz);
        if (this.occ[i]) return false;
        if (this.flag[i] & WATER) return false;
        if (!allowPath && this.flag[i] & PATH) return false;
        if (this.ground[i] !== g0) return false;
      }
    const cx = x + w / 2, cz = z + d / 2;
    for (const r of this.reserve) if (Math.hypot(cx - r.x, cz - r.z) < r.r + Math.max(w, d) / 2) return false;
    return true;
  }
  findFree(R, w = 1, d = 1, pad = 0, opt = {}) {
    const m = opt.margin ?? 1;
    for (let t = 0; t < 80; t++) {
      const x = m + Math.floor(R() * (this.W - w - 2 * m + 1));
      const z = (opt.zMin ?? m) + Math.floor(R() * ((opt.zMax ?? this.D - m) - (opt.zMin ?? m) - d + 1));
      if (opt.test && !opt.test(x, z)) continue;
      if (this.free(x, z, w, d, pad, opt.allowPath)) return { x, z };
    }
    return null;
  }

  // ------------------------------------------------------------ meshes
  buildTerrain() {
    const b = new Builder();
    const W = this.W, D = this.D, t = this.theme;
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let z = 0; z < D; z++)
      for (let x = 0; x < W; x++) {
        const i = this.I(x, z);
        const h = this.ground[i];
        const shade = 0.965 + hash2(x, z) * 0.07;
        b.quad([x, h, z + 1], [x + 1, h, z + 1], [x + 1, h, z], [x, h, z], 0, 1, 0, this.tcol[i], 1, 1, shade);
        for (const [dx, dz] of DIRS) {
          const nx = x + dx, nz = z + dz;
          const edge = !this.inb(nx, nz);
          const nh = edge ? -3.4 : this.ground[this.I(nx, nz)];
          if (nh >= h) continue;
          const band = Math.min(0.25, h - nh);
          const isWater = this.flag[i] & WATER;
          const topCol = isWater ? t.path : this.flag[i] & PATH ? t.path : this.tcol[i] === t.grass[0] || this.tcol[i] === t.grass[1] ? t.sideTop : this.tcol[i];
          this._side(b, x, z, dx, dz, h - band, h, topCol, 0.85);
          if (h - band > nh) {
            const mid = edge ? Math.max(nh, -1.2) : nh;
            if (h - band > mid) this._side(b, x, z, dx, dz, mid, h - band, t.side, 0.9);
            if (edge && mid > nh) this._side(b, x, z, dx, dz, nh, mid, t.deep, 0.85);
          }
        }
      }
    const mesh = new THREE.Mesh(b.build(), MAT.world);
    return mesh;
  }
  _side(b, x, z, dx, dz, y0, y1, color, shade) {
    const vh = y1 - y0;
    if (dx === 1) b.quad([x + 1, y0, z + 1], [x + 1, y0, z], [x + 1, y1, z], [x + 1, y1, z + 1], 1, 0, 0, color, 1, vh, shade);
    else if (dx === -1) b.quad([x, y0, z], [x, y0, z + 1], [x, y1, z + 1], [x, y1, z], -1, 0, 0, color, 1, vh, shade);
    else if (dz === 1) b.quad([x, y0, z + 1], [x + 1, y0, z + 1], [x + 1, y1, z + 1], [x, y1, z + 1], 0, 0, 1, color, 1, vh, shade);
    else b.quad([x + 1, y0, z], [x, y0, z], [x, y1, z], [x + 1, y1, z], 0, 0, -1, color, 1, vh, shade);
  }
  buildWater() {
    const b = new Builder();
    let n = 0;
    for (let z = 0; z < this.D; z++)
      for (let x = 0; x < this.W; x++) {
        if (!(this.flag[this.I(x, z)] & WATER)) continue;
        n++;
        const y = -0.14;
        b.quad([x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z], [x, y, z], 0, 1, 0, this.theme.water, 1, 1, 0.95 + hash2(x * 3, z) * 0.1);
      }
    if (!n) return null;
    const m = new THREE.Mesh(b.build(), MAT.water);
    m.renderOrder = 3;
    return m;
  }
  build() {
    const group = new THREE.Group();
    this.terrain = this.buildTerrain();
    group.add(this.terrain);
    const deco = new THREE.Mesh(this.b.build(), MAT.deco);
    group.add(deco);
    const water = this.buildWater();
    if (water) group.add(water);
    this.waterMesh = water;
    // sea
    const seaGeo = new THREE.PlaneGeometry(700, 700, 1, 1);
    const uv = seaGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 175, uv.getY(i) * 175);
    const sea = new THREE.Mesh(seaGeo, new THREE.MeshLambertMaterial({ color: this.theme.sea, map: SEA_TEX }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(this.W / 2, -3.05, this.D / 2);
    group.add(sea);
    this.sea = sea;
    this.group = group;
    this.computeSpawns();
    return group;
  }
  computeSpawns() {
    this.spawns = [];
    for (let z = 1; z < this.D - 1; z++)
      for (let x = 1; x < this.W - 1; x++) {
        const i = this.I(x, z);
        if (this.flag[i] & (WATER | BOUNCE)) continue;
        const c = this.col[i];
        if (c > 3.3) continue;
        let ok = 0;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = this.colC(x + dx, z + dz);
          if (Math.abs(n - c) <= 0.55) ok++;
        }
        if (ok >= 3) this.spawns.push({ x, z });
      }
  }
  dispose() {
    this.group.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        if (o === this.sea) o.material.dispose();
      }
    });
  }
}

// ================================================================= decor helpers
function cellG(w, x, z) { return w.gC(x, z); }

function treeRound(w, x, z, R) {
  const t = w.theme, b = w.b, g = cellG(w, x, z);
  w.solid(x, z, 99);
  w.occupy(x - 1, z - 1, 3, 3);
  const cx = x + 0.5, cz = z + 0.5;
  const th = 1.8 + Math.floor(R() * 3) * 0.3;
  b.box(cx, g + th / 2, cz, 0.7, th, 0.7, t.trunk, { jit: 0.05 });
  const leaf = t.leaf[Math.floor(R() * t.leaf.length)];
  b.box(cx, g + th + 0.9, cz, 2.6, 1.8, 2.6, leaf, { jit: 0.05 });
  b.box(cx, g + th + 2.1, cz, 1.7, 0.8, 1.7, leaf, { shade: 1.08 });
  if (R() < 0.5) for (let k = 0; k < 3; k++) {
    const a = R() * Math.PI * 2;
    b.box(cx + Math.sin(a) * 1.31, g + th + 0.6 + R() * 0.8, cz + Math.cos(a) * 1.31, 0.22, 0.22, 0.22, R() < 0.5 ? 0xff4d4d : 0xffc93c, { fit: true });
  }
}
function pine(w, x, z, R, snowy) {
  const t = w.theme, b = w.b, g = cellG(w, x, z);
  w.solid(x, z, 99);
  w.occupy(x - 1, z - 1, 3, 3);
  const cx = x + 0.5, cz = z + 0.5;
  b.box(cx, g + 0.6, cz, 0.55, 1.2, 0.55, t.trunk);
  const leaf = t.leaf[Math.floor(R() * t.leaf.length)];
  const tiers = [[2.8, 1.0], [2.2, 1.0], [1.6, 0.9], [1.0, 0.8], [0.45, 0.6]];
  let y = g + 1.2;
  const scale = 0.85 + R() * 0.35;
  for (const [s, h] of tiers) {
    const S = s * scale;
    b.box(cx, y + h / 2, cz, S, h, S, leaf, { jit: 0.04 });
    if (snowy) b.box(cx, y + h + 0.04, cz, S * 0.8, 0.08, S * 0.8, 0xffffff);
    y += h * 0.85;
  }
}
function palm(w, x, z, R) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, 99);
  w.occupy(x - 1, z - 1, 3, 3);
  const lean = (R() < 0.5 ? -1 : 1) * 0.12;
  let px = x + 0.5, py = g, pz = z + 0.5;
  for (let i = 0; i < 6; i++) {
    b.box(px, py + 0.3, pz, 0.45, 0.6, 0.45, i % 2 ? 0xa0703f : 0x8f6135);
    py += 0.58;
    px += lean * (i / 3);
  }
  const top = py + 0.1;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + R();
    b.box(px + Math.sin(a) * 0.9, top - 0.15, pz + Math.cos(a) * 0.9, 0.5, 0.1, 1.9, k % 2 ? 0x3fae4a : 0x55c052, { rot: [0.35, a, 0] });
  }
  b.box(px, top, pz, 0.6, 0.3, 0.6, 0x3fae4a);
  for (let k = 0; k < 3; k++) b.box(px + (k - 1) * 0.25, top - 0.35, pz + 0.25, 0.22, 0.22, 0.22, 0x6b4226, { fit: true });
}
function bush(w, x, z, R) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, g + 0.9);
  const c = w.theme.leaf[Math.floor(R() * w.theme.leaf.length)];
  b.box(x + 0.5, g + 0.45, z + 0.5, 0.98, 0.9, 0.98, c, { jit: 0.06 });
  if (R() < 0.4) for (let k = 0; k < 3; k++) b.box(x + 0.2 + R() * 0.6, g + 0.3 + R() * 0.5, z + 0.995, 0.12, 0.12, 0.03, 0xe63946, { fit: true });
}
function rock(w, x, z, R, big) {
  const b = w.b, g = cellG(w, x, z);
  const col = [0x9aa0a6, 0x8a9096, 0xa9aeb3][Math.floor(R() * 3)];
  if (big) {
    for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) w.solid(x + dx, z + dz, g + 1.5);
    b.box(x + 1, g + 0.75, z + 1, 1.96, 1.5, 1.96, col, { jit: 0.05 });
    b.box(x + 0.9, g + 1.6, z + 1.1, 1.2, 0.3, 1.1, col, { shade: 1.08 });
  } else {
    w.solid(x, z, g + 0.7);
    b.box(x + 0.5, g + 0.35, z + 0.5, 0.9, 0.7, 0.85, col, { jit: 0.06 });
  }
}
function crate(w, x, z, levels) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, g + levels);
  for (let l = 0; l < levels; l++) {
    b.box(x + 0.5, g + l + 0.5, z + 0.5, 0.98, 0.98, 0.98, 0xc68642, { jit: 0.05 });
    b.box(x + 0.5, g + l + 0.5, z + 0.5, 1.0, 0.16, 1.0, 0x9c6230);
  }
}
function flowers(w, x, z, R) {
  const b = w.b, g = cellG(w, x, z);
  const cols = [0xff5d8f, 0xffd23f, 0xffffff, 0xb388ff, 0xff8c42, 0x4cc9f0];
  const c = cols[Math.floor(R() * cols.length)];
  for (let k = 0; k < 3; k++) {
    const fx = x + 0.2 + R() * 0.6, fz = z + 0.2 + R() * 0.6;
    const h = 0.25 + R() * 0.15;
    b.box(fx, g + h / 2, fz, 0.05, h, 0.05, 0x3f9f3a, { fit: true });
    b.box(fx, g + h + 0.06, fz, 0.18, 0.12, 0.18, c, { fit: true });
    b.box(fx, g + h + 0.06, fz, 0.07, 0.13, 0.07, 0xffe066, { fit: true });
  }
  w.occupy(x, z);
}
function grassTuft(w, x, z, R) {
  const b = w.b, g = cellG(w, x, z);
  const c = w.theme.sideTop;
  for (let k = 0; k < 3; k++) b.box(x + 0.25 + R() * 0.5, g + 0.12, z + 0.25 + R() * 0.5, 0.08, 0.24, 0.08, c, { fit: true, rot: [0, R(), (R() - 0.5) * 0.4] });
}
function lamp(w, x, z) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, 99);
  b.box(x + 0.5, g + 0.15, z + 0.5, 0.5, 0.3, 0.5, 0x3d405b);
  b.box(x + 0.5, g + 1.4, z + 0.5, 0.16, 2.5, 0.16, 0x3d405b);
  b.box(x + 0.5, g + 2.8, z + 0.5, 0.42, 0.4, 0.42, 0xfff3b0);
  b.box(x + 0.5, g + 3.05, z + 0.5, 0.52, 0.1, 0.52, 0x3d405b);
}
function bench(w, x, z, alongX) {
  const b = w.b, g = cellG(w, x, z);
  const L = 1.8;
  if (alongX) {
    b.box(x + 1, g + 0.42, z + 0.5, L, 0.1, 0.5, 0xc0813f);
    b.box(x + 1, g + 0.72, z + 0.78, L, 0.35, 0.08, 0xc0813f);
    for (const s of [0.2, 1.8]) b.box(x + s, g + 0.2, z + 0.5, 0.1, 0.4, 0.45, 0x444444);
    w.solid(x, z, g + 0.5); w.solid(x + 1, z, g + 0.5);
  } else {
    b.box(x + 0.5, g + 0.42, z + 1, 0.5, 0.1, L, 0xc0813f);
    b.box(x + 0.78, g + 0.72, z + 1, 0.08, 0.35, L, 0xc0813f);
    for (const s of [0.2, 1.8]) b.box(x + 0.5, g + 0.2, z + s, 0.45, 0.4, 0.1, 0x444444);
    w.solid(x, z, g + 0.5); w.solid(x, z + 1, g + 0.5);
  }
}
function mushroom(w, x, z) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, g + 1.1);
  w.flag[w.I(x, z)] |= BOUNCE;
  b.box(x + 0.5, g + 0.4, z + 0.5, 0.4, 0.8, 0.4, 0xfff4e0);
  b.box(x + 0.5, g + 0.95, z + 0.5, 1.2, 0.35, 1.2, 0xff3b3b);
  b.box(x + 0.5, g + 1.18, z + 0.5, 0.8, 0.14, 0.8, 0xff5252);
  for (const [dx, dz] of [[-0.3, -0.2], [0.25, 0.3], [0.3, -0.3], [-0.2, 0.3]]) b.box(x + 0.5 + dx, g + 1.14, z + 0.5 + dz, 0.2, 0.1, 0.2, 0xffffff, { fit: true });
}
function jumpPad(w, x, z) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, g + 0.2);
  w.flag[w.I(x, z)] |= BOUNCE;
  b.box(x + 0.5, g + 0.1, z + 0.5, 0.96, 0.2, 0.96, 0x3a86ff);
  b.box(x + 0.5, g + 0.21, z + 0.5, 0.7, 0.04, 0.7, 0xffd60a);
  b.box(x + 0.5, g + 0.24, z + 0.45, 0.14, 0.03, 0.4, 0x3a86ff, { fit: true });
  b.box(x + 0.5, g + 0.24, z + 0.28, 0.34, 0.03, 0.12, 0x3a86ff, { fit: true });
}
function log(w, x, z, alongX) {
  const b = w.b, g = cellG(w, x, z);
  const L = 3;
  for (let k = 0; k < L; k++) w.solid(alongX ? x + k : x, alongX ? z : z + k, g + 0.7);
  if (alongX) {
    b.box(x + L / 2, g + 0.35, z + 0.5, L - 0.1, 0.7, 0.7, 0x8b5a2b);
    for (const s of [0.04, L - 0.04]) b.box(x + s, g + 0.35, z + 0.5, 0.06, 0.56, 0.56, 0xd9b27c);
  } else {
    b.box(x + 0.5, g + 0.35, z + L / 2, 0.7, 0.7, L - 0.1, 0x8b5a2b);
    for (const s of [0.04, L - 0.04]) b.box(x + 0.5, g + 0.35, z + s, 0.56, 0.56, 0.06, 0xd9b27c);
  }
}
function fenceCell(w, x, z, alongX, color) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, g + 1.0);
  const cx = x + 0.5, cz = z + 0.5;
  b.box(cx, g + 0.5, cz, 0.2, 1.0, 0.2, color, { shade: 0.92 });
  if (alongX) {
    b.box(cx, g + 0.72, cz, 1.0, 0.12, 0.1, color);
    b.box(cx, g + 0.38, cz, 1.0, 0.12, 0.1, color);
  } else {
    b.box(cx, g + 0.72, cz, 0.1, 0.12, 1.0, color);
    b.box(cx, g + 0.38, cz, 0.1, 0.12, 1.0, color);
  }
}
function hay(w, x, z, levels) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, g + levels);
  for (let l = 0; l < levels; l++) {
    b.box(x + 0.5, g + l + 0.5, z + 0.5, 0.98, 0.98, 0.98, 0xf2cf5b, { jit: 0.04 });
    b.box(x + 0.5, g + l + 0.5, z + 0.5, 1.0, 0.98, 0.12, 0xc9a13a);
  }
}
function barrel(w, x, z) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, g + 1.0);
  b.box(x + 0.5, g + 0.5, z + 0.5, 0.8, 1.0, 0.8, 0x9c6230);
  b.box(x + 0.5, g + 0.5, z + 0.5, 0.86, 0.1, 0.86, 0x555555);
  b.box(x + 0.5, g + 0.85, z + 0.5, 0.86, 0.08, 0.86, 0x555555);
  b.box(x + 0.5, g + 0.15, z + 0.5, 0.86, 0.08, 0.86, 0x555555);
}
function house(w, x, z, W, D, R, flat, wallColor) {
  const b = w.b, g = cellG(w, x, z);
  const H = 3;
  const top = flat ? g + H + 0.1 : 99;
  for (let dz = 0; dz < D; dz++) for (let dx = 0; dx < W; dx++) w.solid(x + dx, z + dz, top);
  const cx = x + W / 2, cz = z + D / 2;
  b.box(cx, g + H / 2, cz, W - 0.04, H, D - 0.04, wallColor, { jit: 0.03 });
  b.box(cx, g + 0.15, cz, W + 0.06, 0.3, D + 0.06, 0x8d8d8d);
  // door + windows on +z side (facing camera)
  b.box(cx, g + 0.85, z + D + 0.01, 0.9, 1.5, 0.08, 0x7a4b2a);
  b.box(cx + 0.28, g + 0.85, z + D + 0.06, 0.1, 0.1, 0.04, 0xffd60a, { fit: true });
  const winC = 0xbfe9ff;
  for (const s of [-1, 1]) {
    if (W >= 4) {
      b.box(cx + s * (W / 2 - 0.9), g + 1.7, z + D + 0.01, 0.8, 0.8, 0.08, winC);
      b.box(cx + s * (W / 2 - 0.9), g + 1.7, z + D + 0.03, 0.9, 0.1, 0.06, 0xffffff);
    }
    b.box(s < 0 ? x - 0.01 : x + W + 0.01, g + 1.7, cz, 0.08, 0.8, 0.8, winC);
  }
  if (flat) {
    b.box(cx, g + H + 0.05, cz, W - 0.1, 0.1, D - 0.1, 0x9aa5b1);
    b.box(cx, g + H + 0.2, z + 0.1, W, 0.3, 0.2, wallColor, { shade: 0.85 });
    b.box(cx, g + H + 0.2, z + D - 0.1, W, 0.3, 0.2, wallColor, { shade: 0.85 });
    b.box(x + 0.1, g + H + 0.2, cz, 0.2, 0.3, D, wallColor, { shade: 0.85 });
    b.box(x + W - 0.1, g + H + 0.2, cz, 0.2, 0.3, D, wallColor, { shade: 0.85 });
  } else {
    const roofC = [0xd1495b, 0x3d5a80, 0x6a4c93, 0xe07a5f][Math.floor(R() * 4)];
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const dd = (D + 0.6) * (1 - i / steps);
      b.box(cx, g + H + 0.25 + i * 0.5, cz, W + 0.5, 0.5, dd, roofC, { shade: 1 - i * 0.04 });
    }
    b.box(cx + W / 4, g + H + 1.6, cz - D / 5, 0.5, 1.4, 0.5, 0x8d6e63);
  }
}
function hut(w, x, z, R) {
  house(w, x, z, 3, 3, R, false, [0xfff1d0, 0xbde0fe, 0xffc8dd][Math.floor(R() * 3)]);
  w.occupy(x - 2, z - 2, 7, 7);
}
function snowman(w, x, z) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, 99);
  const cx = x + 0.5, cz = z + 0.5;
  b.box(cx, g + 0.45, cz, 0.95, 0.9, 0.95, 0xffffff);
  b.box(cx, g + 1.2, cz, 0.72, 0.62, 0.72, 0xffffff);
  b.box(cx, g + 1.8, cz, 0.56, 0.52, 0.56, 0xffffff);
  b.box(cx, g + 1.78, cz + 0.36, 0.1, 0.1, 0.3, 0xff8c42, { fit: true });
  for (const s of [-1, 1]) b.box(cx + s * 0.12, g + 1.9, cz + 0.29, 0.08, 0.08, 0.03, 0x111111, { fit: true });
  b.box(cx, g + 2.1, cz, 0.62, 0.08, 0.62, 0x222222);
  b.box(cx, g + 2.3, cz, 0.4, 0.34, 0.4, 0x222222);
  b.box(cx, g + 1.52, cz, 0.76, 0.1, 0.76, 0xe63946);
  b.box(cx + 0.2, g + 1.3, cz + 0.38, 0.14, 0.4, 0.06, 0xe63946, { fit: true });
  for (const s of [-1, 1]) b.box(cx + s * 0.55, g + 1.35, cz, 0.5, 0.06, 0.06, 0x6b4a33, { rot: [0, 0, s * 0.5] });
}
function igloo(w, x, z) {
  const b = w.b, g = cellG(w, x, z);
  for (let dz = 0; dz < 3; dz++) for (let dx = 0; dx < 3; dx++) w.solid(x + dx, z + dz, 99);
  const cx = x + 1.5, cz = z + 1.5;
  b.box(cx, g + 0.5, cz, 2.9, 1.0, 2.9, 0xf2f8ff);
  b.box(cx, g + 1.3, cz, 2.4, 0.6, 2.4, 0xe8f2ff);
  b.box(cx, g + 1.8, cz, 1.6, 0.4, 1.6, 0xf2f8ff);
  b.box(cx, g + 0.55, z + 3.05, 0.9, 1.1, 0.5, 0xe8f2ff);
  b.box(cx, g + 0.5, z + 3.31, 0.6, 0.8, 0.02, 0x2b3a55);
}
function iceBlock(w, x, z, h) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, g + h);
  b.box(x + 0.5, g + h / 2, z + 0.5, 0.98, h, 0.98, 0x9fd8ff, { jit: 0.04 });
}
function gift(w, x, z, R) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, g + 0.9);
  const c = [0xe63946, 0x3a86ff, 0x8338ec, 0x06d6a0][Math.floor(R() * 4)];
  b.box(x + 0.5, g + 0.45, z + 0.5, 0.9, 0.9, 0.9, c);
  b.box(x + 0.5, g + 0.45, z + 0.5, 0.94, 0.92, 0.18, 0xffd60a);
  b.box(x + 0.5, g + 0.45, z + 0.5, 0.18, 0.92, 0.94, 0xffd60a);
  b.box(x + 0.5, g + 1.0, z + 0.5, 0.36, 0.18, 0.2, 0xffd60a, { fit: true });
}
function sandCastle(w, x, z) {
  const b = w.b, g = cellG(w, x, z);
  for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) w.solid(x + dx, z + dz, g + 1.0);
  const S = 0xe9c46a;
  b.box(x + 1, g + 0.5, z + 1, 1.96, 1.0, 1.96, S);
  for (const sx of [0.3, 1.7]) for (const sz of [0.3, 1.7]) {
    b.box(x + sx, g + 1.3, z + sz, 0.5, 0.6, 0.5, S, { shade: 1.05 });
    b.box(x + sx, g + 1.65, z + sz, 0.3, 0.1, 0.3, S, { shade: 0.95 });
  }
  b.box(x + 1, g + 1.5, z + 1, 0.6, 1.0, 0.6, S, { shade: 1.08 });
  b.box(x + 1, g + 2.2, z + 1, 0.05, 0.5, 0.05, 0x6b4226);
  b.box(x + 1.15, g + 2.35, z + 1, 0.25, 0.18, 0.03, 0xe63946, { fit: true });
  b.box(x + 1, g + 0.35, z + 1.99, 0.4, 0.6, 0.04, 0xc9a13a);
}
function umbrella(w, x, z, R) {
  const b = w.b, g = cellG(w, x, z);
  w.solid(x, z, 99);
  const cx = x + 0.5, cz = z + 0.5;
  b.box(cx, g + 1.2, cz, 0.12, 2.4, 0.12, 0xf1f1f1);
  const c1 = [0xe63946, 0x3a86ff, 0xff8c42, 0x8338ec][Math.floor(R() * 4)];
  for (let i = 0; i < 4; i++) b.box(cx, g + 2.35 + i * 0.12, cz, 2.8 - i * 0.7, 0.14, 2.8 - i * 0.7, i % 2 ? 0xffffff : c1);
  // towel next to it
  const tc = [0x06d6a0, 0xffd60a, 0xff70a6][Math.floor(R() * 3)];
  if (w.inb(x + 1, z) && w.free(x + 1, z, 1, 2)) {
    b.box(x + 1.5, g + 0.02, z + 1, 0.9, 0.04, 1.8, tc, { fit: true });
    b.box(x + 1.5, g + 0.03, z + 1, 0.9, 0.04, 0.2, 0xffffff, { fit: true });
  }
}
function starfish(w, x, z, R) {
  const b = w.b, g = cellG(w, x, z);
  const c = R() < 0.5 ? 0xff70a6 : 0xff9f1c;
  const a0 = R();
  for (let i = 0; i < 5; i++) {
    const a = a0 + (i / 5) * Math.PI * 2;
    b.box(x + 0.5 + Math.sin(a) * 0.15, g + 0.03, z + 0.5 + Math.cos(a) * 0.15, 0.1, 0.05, 0.32, c, { fit: true, rot: [0, a, 0] });
  }
}
function borderFence(w) {
  const t = w.theme, b = w.b, W = w.W, D = w.D;
  const kind = t.fenceKind, c = t.fence;
  const segs = [];
  for (let i = 0; i < W; i++) { segs.push([i + 0.5, 0, true]); segs.push([i + 0.5, D, true]); }
  for (let i = 0; i < D; i++) { segs.push([0, i + 0.5, false]); segs.push([W, i + 0.5, false]); }
  for (const [x, z, alongX] of segs) {
    const g = w.gC(Math.min(W - 1, Math.floor(x)), Math.min(D - 1, Math.floor(z)));
    const gy = Math.max(0, g);
    if (kind === 'picket') {
      b.box(x, gy + 0.45, z, alongX ? 0.2 : 0.1, 0.9, alongX ? 0.1 : 0.2, c);
      b.box(x, gy + 0.55, z, alongX ? 1 : 0.06, 0.1, alongX ? 0.06 : 1, c, { shade: 0.9 });
      b.box(x + (alongX ? 0.5 : 0), gy + 0.3, z + (alongX ? 0 : 0.5), 0.2, 0.6, 0.2, c);
    } else if (kind === 'wood') {
      b.box(x, gy + 0.6, z, alongX ? 1 : 0.1, 0.14, alongX ? 0.1 : 1, c);
      b.box(x, gy + 0.3, z, alongX ? 1 : 0.1, 0.14, alongX ? 0.1 : 1, c);
      b.box(x + (alongX ? 0.5 : 0), gy + 0.4, z + (alongX ? 0 : 0.5), 0.18, 0.8, 0.18, c, { shade: 0.85 });
    } else if (kind === 'stone') {
      b.box(x, gy + 0.3, z, alongX ? 1.02 : 0.5, 0.6, alongX ? 0.5 : 1.02, c, { jit: 0.08 });
    } else if (kind === 'rope') {
      b.box(x + (alongX ? 0.5 : 0), Math.max(gy, -0.2) + 0.4, z + (alongX ? 0 : 0.5), 0.14, 0.9, 0.14, 0xa0703f);
      b.box(x, Math.max(gy, -0.2) + 0.7, z, alongX ? 1 : 0.05, 0.05, alongX ? 0.05 : 1, 0xf1e3c2);
    } else if (kind === 'ice') {
      b.box(x, gy + 0.35, z, alongX ? 1.02 : 0.45, 0.7, alongX ? 0.45 : 1.02, c, { jit: 0.05 });
    }
  }
}
function scatter(w, R, n, fn, opt = {}) {
  let placed = 0;
  for (let k = 0; k < n; k++) {
    const p = w.findFree(R, opt.w || 1, opt.d || 1, opt.pad ?? 0, opt);
    if (!p) continue;
    fn(w, p.x, p.z, R);
    placed++;
  }
  return placed;
}
function hill(w, cx, cz, r, maxH, stepW = 1.2, stepH = 0.5) {
  for (let z = Math.floor(cz - r); z <= cz + r; z++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if (!w.inb(x, z) || x < 1 || z < 1 || x > w.W - 2 || z > w.D - 2) continue;
      const i = w.I(x, z);
      if (w.flag[i] & (WATER | PATH)) continue;
      const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
      const lvl = Math.min(maxH, Math.floor((r - d) / stepW + 1) * stepH);
      if (lvl > w.ground[i]) {
        const shade = lvl >= maxH ? 1 : 0;
        w.setGround(x, z, lvl, w.theme.grass[(x + z + shade) & 1]);
      }
    }
}
function randomRoute(w, R, n, test) {
  const pts = [];
  for (let k = 0; k < 200 && pts.length < n; k++) {
    const s = w.spawns[Math.floor(R() * w.spawns.length)];
    if (!s) break;
    if (w.col[w.I(s.x, s.z)] > 0.01) continue;
    if (test && !test(s)) continue;
    if (pts.some((p) => Math.hypot(p.x - s.x - 0.5, p.z - s.z - 0.5) < 7)) continue;
    pts.push({ x: s.x + 0.5, z: s.z + 0.5 });
  }
  return pts;
}

// ================================================================= generators
function genPark(seed) {
  const R = mulberry32(seed);
  const t = THEMES.park;
  const w = new World(40, 40, t);
  w.marks.wolfStart = { x: 20.5, z: 28.5 };
  w.reserve.push({ x: 20.5, z: 28.5, r: 2.5 });
  // pond
  const pc = { x: 9.5, z: 9.5, r: 4.3 };
  for (let z = 3; z < 17; z++) for (let x = 3; x < 17; x++) if (Math.hypot(x + 0.5 - pc.x, z + 0.5 - pc.z) < pc.r) w.water(x, z);
  // paths + plaza
  for (let i = 1; i < 39; i++) for (const k of [19, 20]) { w.path(i, k, t.path); w.path(k, i, t.path); }
  for (let z = 14; z < 26; z++) for (let x = 14; x < 26; x++) if (Math.hypot(x + 0.5 - 20, z + 0.5 - 20) < 4.6) w.path(x, z, t.path);
  // fountain
  for (let z = 19; z < 21; z++) for (let x = 19; x < 21; x++) w.solid(x, z, 0.8);
  w.b.box(20, 0.4, 20, 2.3, 0.8, 2.3, 0xb8c4d0);
  w.b.box(20, 0.81, 20, 1.9, 0.04, 1.9, 0x5ecbff);
  w.b.box(20, 1.2, 20, 0.4, 0.8, 0.4, 0xb8c4d0);
  w.b.box(20, 1.7, 20, 0.8, 0.2, 0.8, 0xb8c4d0);
  w.b.box(20, 1.85, 20, 0.5, 0.12, 0.5, 0x5ecbff);
  // stage
  for (let z = 6; z < 12; z++) for (let x = 27; x < 33; x++) w.setGround(x, z, 1.5, (x + z) & 1 ? 0xd9a066 : 0xcf955a);
  for (let z = 8; z < 10; z++) { w.setGround(26, z, 1.0, 0xcf955a); w.setGround(25, z, 0.5, 0xd9a066); }
  w.occupy(25, 6, 8, 6);
  w.b.box(32.8, 2.6, 9, 0.15, 2.2, 0.15, 0xffffff);
  w.b.box(27.2, 2.6, 9, 0.15, 2.2, 0.15, 0xffffff);
  for (let i = 0; i < 6; i++) w.b.box(27.5 + i, 3.55, 9, 0.9, 0.3, 0.06, [0xff5d8f, 0xffd23f, 0x4cc9f0][i % 3], { fit: true });
  // crate pyramid
  const px = 29, pz = 29;
  for (let z = 0; z < 5; z++) for (let x = 0; x < 5; x++) {
    const ring = Math.min(x, z, 4 - x, 4 - z);
    crate(w, px + x, pz + z, ring + 1);
  }
  w.occupy(px - 1, pz - 1, 7, 7);
  // lily pads
  for (let k = 0; k < 7; k++) {
    const a = R() * Math.PI * 2, r = R() * 3;
    w.b.box(pc.x + Math.sin(a) * r, -0.1, pc.z + Math.cos(a) * r, 0.6, 0.04, 0.6, 0x4caf50, { fit: true });
  }
  // pond rim stones
  for (let z = 2; z < 18; z++) for (let x = 2; x < 18; x++) {
    const d = Math.hypot(x + 0.5 - pc.x, z + 0.5 - pc.z);
    if (d >= pc.r && d < pc.r + 1 && R() < 0.35 && w.free(x, z)) { w.solid(x, z, 0.35); w.b.box(x + 0.5, 0.17, z + 0.5, 0.8, 0.35, 0.8, 0x9aa0a6, { jit: 0.08 }); }
  }
  for (const [x, z] of [[16, 17], [23, 17], [16, 22], [23, 22]]) lamp(w, x, z);
  bench(w, 15, 23, true); bench(w, 23, 15, true);
  scatter(w, R, 12, treeRound, { pad: 1, margin: 2 });
  scatter(w, R, 14, bush, { margin: 2 });
  scatter(w, R, 8, (w2, x, z) => crate(w2, x, z, 1 + (R() < 0.3 ? 1 : 0)), { margin: 2 });
  scatter(w, R, 34, flowers);
  scatter(w, R, 30, grassTuft);
  borderFence(w);
  return w;
}

function genVillage(seed) {
  const R = mulberry32(seed);
  const t = THEMES.village;
  const w = new World(44, 44, t);
  w.marks.wolfStart = { x: 22, z: 37.5 };
  w.reserve.push({ x: 22, z: 37.5, r: 2.5 });
  for (let i = 0; i < 44; i++) {
    for (const k of [13, 14, 30, 31]) w.path(i, k, (i + k) & 1 ? t.path : 0xc79f63);
    for (const k of [21, 22]) w.path(k, i, (i + k) & 1 ? t.path : 0xc79f63);
  }
  // fountain square
  for (let z = 20; z < 24; z++) for (let x = 19; x < 25; x++) w.path(x, z, 0xd8d2c4);
  for (let z = 21; z < 23; z++) for (let x = 21; x < 23; x++) w.solid(x, z, 0.9);
  w.b.box(22, 0.45, 22, 2.2, 0.9, 2.2, 0xa8b2bd);
  w.b.box(22, 0.91, 22, 1.8, 0.04, 1.8, 0x5ecbff);
  w.b.box(22, 1.5, 22, 0.35, 1.2, 0.35, 0xa8b2bd);
  // houses: planned lots per quadrant
  const lots = [
    [3, 3, 6, 5, true], [11, 4, 5, 4, false], [26, 3, 5, 5, false], [34, 4, 6, 5, true],
    [3, 18, 5, 5, false], [11, 19, 5, 4, true], [27, 18, 5, 4, false], [35, 19, 5, 5, true],
    [4, 34, 5, 4, false], [33, 35, 6, 4, false],
  ];
  const palette = [0xf4a261, 0xe9c46a, 0x90be6d, 0x8ecae6, 0xf28482, 0xcdb4db, 0xffafcc, 0xa3c4f3];
  lots.forEach(([x, z, W, D, flat], k) => {
    if (!w.free(x, z, W, D, 0)) return;
    house(w, x, z, W, D, R, flat, palette[k % palette.length]);
    if (flat) {
      // crate stairs up to the roof on the +z side at the left
      const sx = x - 1, sz = z + D - 1;
      if (w.free(sx, sz) && w.free(sx - 1, sz)) {
        crate(w, sx, sz, 2);
        crate(w, sx - 1, sz, 1);
      } else if (w.free(x + W, sz) && w.free(x + W + 1, sz)) {
        crate(w, x + W, sz, 2);
        crate(w, x + W + 1, sz, 1);
      }
    }
    w.occupy(x - 1, z - 1, W + 2, D + 2);
  });
  // gardens with fences
  const gardens = [[12, 34, 7, 5], [26, 34, 6, 5], [26, 8, 0, 0]];
  for (const [gx, gz, GW, GD] of gardens) {
    if (!GW) continue;
    if (!w.free(gx, gz, GW, GD)) continue;
    for (let z = gz; z < gz + GD; z++) for (let x = gx; x < gx + GW; x++) {
      const edge = x === gx || x === gx + GW - 1 || z === gz || z === gz + GD - 1;
      const gate = z === gz + GD - 1 && (x === gx + 2 || x === gx + 3);
      if (edge && !gate) fenceCell(w, x, z, z === gz || z === gz + GD - 1, t.fence);
      else if (!edge) {
        w.tcol[w.I(x, z)] = (x + z) & 1 ? 0x8b5e3c : 0x7f5535;
        if (z % 2 === 0) for (let k = 0; k < 2; k++) w.b.box(x + 0.3 + k * 0.4, 0.15, z + 0.5, 0.12, 0.3, 0.12, 0x6ab04c, { fit: true });
        else w.b.box(x + 0.5, 0.12, z + 0.5, 0.2, 0.24, 0.2, 0xff8c42, { fit: true });
      }
    }
    w.occupy(gx, gz, GW, GD);
  }
  for (const [x, z] of [[20, 12], [23, 15], [20, 29], [23, 32], [8, 15], [36, 12], [8, 29], [36, 32]]) if (w.free(x, z, 1, 1, 0, true)) lamp(w, x, z);
  scatter(w, R, 10, (w2, x, z) => hay(w2, x, z, R() < 0.35 ? 2 : 1), { margin: 2 });
  scatter(w, R, 8, barrel, { margin: 2 });
  scatter(w, R, 9, treeRound, { pad: 1, margin: 2 });
  scatter(w, R, 8, bush, { margin: 2 });
  scatter(w, R, 5, (w2, x, z) => crate(w2, x, z, 1), { margin: 2 });
  scatter(w, R, 26, flowers);
  scatter(w, R, 30, grassTuft);
  borderFence(w);
  w.marks.dogRoutes.push([{ x: 22, z: 14 }, { x: 40, z: 14 }, { x: 40, z: 31 }, { x: 22, z: 31 }, { x: 4, z: 31 }, { x: 4, z: 14 }]);
  return w;
}

function genForest(seed) {
  const R = mulberry32(seed);
  const t = THEMES.forest;
  const w = new World(46, 46, t);
  // creek
  const creekX = (z) => Math.round(23 + Math.sin(z * 0.23) * 3);
  for (let z = 0; z < 46; z++) { const cx = creekX(z); w.water(cx, z); w.water(cx + 1, z); }
  for (const bz of [10, 34]) {
    const cx = creekX(bz);
    for (let dz = 0; dz < 2; dz++) for (let x = cx - 1; x <= cx + 2; x++) {
      w.setGround(x, bz + dz, 0.2, (x + dz) & 1 ? 0xb07a45 : 0xa06d3c);
      w.flag[w.I(x, bz + dz)] |= PATH;
    }
    for (let x = cx - 1; x <= cx + 2; x++) {
      w.b.box(x + 0.5, 0.65, bz + 0.05, 1, 0.1, 0.1, 0x8b5a2b);
      w.b.box(x + 0.5, 0.65, bz + 1.95, 1, 0.1, 0.1, 0x8b5a2b);
      w.b.box(x + 0.5, 0.42, bz + 0.05, 0.1, 0.45, 0.1, 0x8b5a2b);
      w.b.box(x + 0.5, 0.42, bz + 1.95, 0.1, 0.45, 0.1, 0x8b5a2b);
    }
  }
  w.marks.wolfStart = { x: 11.5, z: 40.5 };
  w.reserve.push({ x: 11.5, z: 40.5, r: 2.5 });
  hill(w, 10, 12, 6.5, 2.0);
  hill(w, 35, 30, 7, 2.5);
  hill(w, 36, 9, 4.5, 2.0, 1.4, 1.0);
  hill(w, 12, 28, 4.5, 1.5);
  // mushrooms (bounce)
  scatter(w, R, 6, mushroom, { margin: 3 });
  scatter(w, R, 5, (w2, x, z) => rock(w2, x, z, R, true), { w: 2, d: 2, pad: 1, margin: 2 });
  scatter(w, R, 5, (w2, x, z) => log(w2, x, z, true), { w: 3, d: 1, pad: 1, margin: 2 });
  scatter(w, R, 3, (w2, x, z) => log(w2, x, z, false), { w: 1, d: 3, pad: 1, margin: 2 });
  scatter(w, R, 30, (w2, x, z) => pine(w2, x, z, R, false), { pad: 1, margin: 2 });
  scatter(w, R, 6, treeRound, { pad: 1, margin: 2 });
  scatter(w, R, 10, (w2, x, z) => rock(w2, x, z, R, false), { margin: 2 });
  scatter(w, R, 12, bush, { margin: 2 });
  scatter(w, R, 16, flowers);
  scatter(w, R, 50, grassTuft);
  borderFence(w);
  w.marks.dogRoutes.push([{ x: 6, z: 22 }, { x: 16, z: 20 }, { x: 16, z: 36 }, { x: 5, z: 36 }]);
  w.marks.dogRoutes.push([{ x: 30, z: 18 }, { x: 42, z: 20 }, { x: 42, z: 40 }, { x: 30, z: 40 }]);
  return w;
}

function genBeach(seed) {
  const R = mulberry32(seed);
  const t = THEMES.beach;
  const w = new World(48, 48, t);
  for (let z = 0; z < 9; z++) for (let x = 0; x < 48; x++) w.water(x, z);
  for (let x = 0; x < 48; x++) w.tcol[w.I(x, 9)] = (x & 1) ? 0xdcc288 : 0xd6bb80;
  // pier
  for (let z = 0; z < 10; z++) for (let x = 30; x < 33; x++) {
    w.setGround(x, z, 0.3, (x + z) & 1 ? 0xb07a45 : 0xa06d3c);
    w.flag[w.I(x, z)] |= PATH;
  }
  for (const [x, z] of [[30, 0], [32.8, 0], [30, 4], [32.8, 4]]) w.b.box(x + 0.1, -0.5, z + 0.1, 0.2, 1.6, 0.2, 0x7a4b2a);
  jumpPad(w, 31, 1);
  w.marks.wolfStart = { x: 24, z: 38.5 };
  w.reserve.push({ x: 24, z: 38.5, r: 2.5 });
  // lifeguard tower
  for (let z = 14; z < 16; z++) for (let x = 7; x < 9; x++) w.solid(x, z, 2.5);
  crate(w, 9, 15, 2);
  crate(w, 10, 15, 1);
  w.b.box(8, 1.2, 15, 2.0, 0.2, 2.0, 0xffffff);
  for (const sx of [7.1, 8.9]) for (const sz of [14.1, 15.9]) w.b.box(sx, 1.2, sz, 0.18, 2.4, 0.18, 0xffffff);
  w.b.box(8, 2.45, 15, 2.0, 0.1, 2.0, 0xe63946);
  for (const sx of [7.1, 8.9]) for (const sz of [14.1, 15.9]) w.b.box(sx, 3.3, sz, 0.1, 1.6, 0.1, 0xffffff);
  w.b.box(8, 4.15, 15, 2.6, 0.2, 2.6, 0xe63946);
  w.b.box(8, 4.3, 15, 1.6, 0.14, 1.6, 0xffffff);
  w.occupy(6, 13, 6, 4);
  // volleyball net
  for (const x of [34, 40]) { w.solid(x, 24, 99); w.b.box(x + 0.5, 1.2, 24.5, 0.14, 2.4, 0.14, 0xffffff); }
  for (let x = 35; x < 40; x++) w.b.box(x + 0.5, 1.9, 24.5, 1, 0.6, 0.04, 0xf1f1f1, { uvs: 4 });
  w.occupy(33, 23, 9, 3);
  scatter(w, R, 3, hut, { w: 3, d: 3, pad: 1, margin: 2, zMin: 38 });
  scatter(w, R, 5, sandCastle, { w: 2, d: 2, pad: 1, margin: 2, zMin: 12 });
  scatter(w, R, 6, umbrella, { pad: 1, margin: 2, zMin: 12 });
  scatter(w, R, 12, palm, { pad: 1, margin: 2, zMin: 13 });
  scatter(w, R, 5, jumpPad, { margin: 3, zMin: 13 });
  scatter(w, R, 8, (w2, x, z) => rock(w2, x, z, R, false), { margin: 1, zMin: 10, zMax: 16 });
  scatter(w, R, 6, (w2, x, z) => crate(w2, x, z, 1 + (R() < 0.4 ? 1 : 0)), { margin: 2, zMin: 12 });
  scatter(w, R, 14, starfish, { zMin: 10 });
  borderFence(w);
  for (let k = 0; k < 3; k++) w.marks.crabs.push({ x: 8 + k * 14 + R() * 4, z: 11 + R() * 5 });
  w.marks.dogRoutes.push([{ x: 6, z: 28 }, { x: 24, z: 30 }, { x: 42, z: 30 }, { x: 24, z: 22 }]);
  return w;
}

function genSnow(seed) {
  const R = mulberry32(seed);
  const t = THEMES.snow;
  const w = new World(50, 50, t);
  w.marks.wolfStart = { x: 25, z: 43.5 };
  w.reserve.push({ x: 25, z: 43.5, r: 2.5 });
  // castle
  const X0 = 15, X1 = 34, Z0 = 2, Z1 = 13;
  const STONE = 0xc9d6ea;
  for (let z = Z0; z <= Z1; z++) for (let x = X0; x <= X1; x++) {
    const wall = x === X0 || x === X1 || z === Z0 || z === Z1;
    const gate = z === Z1 && x >= 23 && x <= 26;
    if (wall && !gate) {
      w.solid(x, z, 3.0);
      w.b.box(x + 0.5, 1.5, z + 0.5, 1.0, 3.0, 1.0, STONE, { jit: 0.04 });
      const outer = z === Z0 || z === Z1 ? true : true;
      if (outer && (x + z) % 2 === 0) w.b.box(x + 0.5, 3.25, z + 0.5, 0.7, 0.5, 0.7, STONE, { shade: 1.05 });
    } else if (!wall) {
      w.tcol[w.I(x, z)] = (x + z) & 1 ? 0xdde6f3 : 0xd2dcec;
      w.flag[w.I(x, z)] |= PATH;
    }
  }
  // gate arch
  w.b.box(24.99, 3.3, Z1 + 0.5, 4.0, 0.6, 1.0, STONE, { shade: 0.95 });
  w.b.box(25, 3.8, Z1 + 1.02, 1.2, 0.5, 0.06, 0x3a86ff, { fit: true });
  // towers
  for (const [tx, tz] of [[X0 - 1, Z0 - 1], [X1, Z0 - 1], [X0 - 1, Z1], [X1, Z1]]) {
    for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) w.solid(tx + dx, tz + dz, 99);
    w.b.box(tx + 1, 2.5, tz + 1, 2.0, 5, 2.0, STONE, { shade: 0.97 });
    for (let i = 0; i < 4; i++) w.b.box(tx + 1, 5.25 + i * 0.5, tz + 1, 2.4 - i * 0.6, 0.5, 2.4 - i * 0.6, 0x4d7cc9);
    w.b.box(tx + 1, 7.4, tz + 1, 0.06, 0.8, 0.06, 0x555555);
    w.b.box(tx + 1.25, 7.6, tz + 1, 0.45, 0.3, 0.04, 0xe63946, { fit: true });
  }
  // stairs inside to walls
  crate(w, 17, 12, 1); iceStair(w, 16, 12, 2);
  crate(w, 32, 12, 1); iceStair(w, 33, 12, 2);
  // throne
  w.solid(24, 3, 1.2); w.solid(25, 3, 1.2);
  w.b.box(25, 0.6, 3.5, 2, 1.2, 1, 0x8338ec);
  w.b.box(25, 1.8, 3.1, 2, 1.4, 0.2, 0x8338ec);
  w.b.box(25, 2.6, 3.1, 1.2, 0.3, 0.22, 0xffc300);
  w.occupy(X0 - 1, Z0 - 1, X1 - X0 + 3, Z1 - Z0 + 3);
  w.marks.bossStart = { x: 25, z: 8 };
  // ice patches
  for (let k = 0; k < 6; k++) {
    const cx = 5 + R() * 40, cz = 17 + R() * 28, r = 2.5 + R() * 2;
    for (let z = Math.floor(cz - r); z <= cz + r; z++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if (!w.inb(x, z) || Math.hypot(x + 0.5 - cx, z + 0.5 - cz) > r) continue;
      const i = w.I(x, z);
      if (w.occ[i] || w.flag[i] & PATH) continue;
      w.flag[i] |= ICE;
      w.tcol[i] = t.ice[(x + z) & 1];
    }
  }
  // ice walls
  for (let k = 0; k < 7; k++) {
    const along = R() < 0.5, L = 3 + Math.floor(R() * 3);
    const p = w.findFree(R, along ? L : 1, along ? 1 : L, 1, { margin: 2, zMin: 16 });
    if (!p) continue;
    for (let i = 0; i < L; i++) iceBlock(w, along ? p.x + i : p.x, along ? p.z : p.z + i, i === Math.floor(L / 2) ? 2 : 1);
  }
  scatter(w, R, 2, igloo, { w: 3, d: 3, pad: 1, margin: 2, zMin: 16 });
  scatter(w, R, 6, snowman, { margin: 2, zMin: 16, pad: 1 });
  scatter(w, R, 18, (w2, x, z) => pine(w2, x, z, R, true), { pad: 1, margin: 2, zMin: 15 });
  scatter(w, R, 7, gift, { margin: 2 });
  scatter(w, R, 5, (w2, x, z) => crate(w2, x, z, 1), { margin: 2, zMin: 16 });
  borderFence(w);
  w.marks.dogRoutes.push([{ x: 6, z: 20 }, { x: 20, z: 22 }, { x: 18, z: 38 }, { x: 5, z: 40 }]);
  w.marks.dogRoutes.push([{ x: 44, z: 20 }, { x: 30, z: 24 }, { x: 32, z: 40 }, { x: 45, z: 42 }]);
  return w;
}
function iceStair(w, x, z, levels) {
  const g = w.gC(x, z);
  w.solid(x, z, g + levels);
  for (let l = 0; l < levels; l++) w.b.box(x + 0.5, g + l + 0.5, z + 0.5, 0.98, 0.98, 0.98, 0xa8dcff, { jit: 0.04 });
}

const GENS = { park: genPark, village: genVillage, forest: genForest, beach: genBeach, snow: genSnow };

export function generateWorld(theme, seed) {
  const w = GENS[theme](seed);
  w.themeName = theme;
  w.build();
  // validate dog routes against real spawns
  w.marks.dogRoutes = w.marks.dogRoutes.map((r) => r.map((p) => nearestOpen(w, p.x, p.z)));
  if (w.marks.bossStart) w.marks.bossStart = nearestOpen(w, w.marks.bossStart.x, w.marks.bossStart.z);
  return w;
}
export function nearestOpen(w, x, z) {
  let best = null, bd = 1e9;
  for (const s of w.spawns) {
    const d = (s.x + 0.5 - x) ** 2 + (s.z + 0.5 - z) ** 2;
    if (d < bd && w.col[w.I(s.x, s.z)] <= w.ground[w.I(s.x, s.z)] + 0.01) { bd = d; best = s; }
  }
  return best ? { x: best.x + 0.5, z: best.z + 0.5 } : { x, z };
}
export { randomRoute };

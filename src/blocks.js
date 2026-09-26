import * as THREE from 'three';

const _c = new THREE.Color();
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _e = new THREE.Euler();

// Unit-cube faces. Corners are CCW seen from outside. a/b = axis index of u/v edges.
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], a: 2, b: 1 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], a: 2, b: 1 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], a: 0, b: 2 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], a: 0, b: 2 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], a: 0, b: 1 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], a: 0, b: 1 },
];
export const SKIP = { px: 1, nx: 2, py: 4, ny: 8, pz: 16, nz: 32 };

export class Builder {
  constructor() {
    this.p = [];
    this.n = [];
    this.u = [];
    this.c = [];
    this.idx = [];
    this.vc = 0;
  }
  // Box centred at x,y,z. o: {skip, fit, uvs, jit, rot:[x,y,z]}
  box(x, y, z, w, h, d, color, o) {
    const skip = (o && o.skip) || 0;
    const fit = o && o.fit;
    const uvs = (o && o.uvs) || 1;
    _c.set(color);
    if (o && o.jit) _c.multiplyScalar(1 + (Math.random() * 2 - 1) * o.jit);
    if (o && o.shade) _c.multiplyScalar(o.shade);
    const rot = o && o.rot;
    if (rot) {
      _e.set(rot[0], rot[1], rot[2]);
      _m.makeRotationFromEuler(_e);
    }
    const size = [w, h, d];
    for (let f = 0; f < 6; f++) {
      if (skip & (1 << f)) continue;
      const F = FACES[f];
      _n.set(F.n[0], F.n[1], F.n[2]);
      if (rot) _n.transformDirection(_m);
      const uw = fit ? 1 : size[F.a] * uvs;
      const vh = fit ? 1 : size[F.b] * uvs;
      for (let k = 0; k < 4; k++) {
        const cc = F.c[k];
        _v.set((cc[0] - 0.5) * w, (cc[1] - 0.5) * h, (cc[2] - 0.5) * d);
        if (rot) _v.applyMatrix4(_m);
        this.p.push(x + _v.x, y + _v.y, z + _v.z);
        this.n.push(_n.x, _n.y, _n.z);
        this.u.push(k === 1 || k === 2 ? uw : 0, k >= 2 ? vh : 0);
        this.c.push(_c.r, _c.g, _c.b);
      }
      const b = this.vc;
      this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      this.vc += 4;
    }
    return this;
  }
  // Quad from 4 corner arrays (CCW from the front).
  quad(p0, p1, p2, p3, nx, ny, nz, color, uw = 1, vh = 1, shade = 1) {
    _c.set(color).multiplyScalar(shade);
    for (const p of [p0, p1, p2, p3]) {
      this.p.push(p[0], p[1], p[2]);
      this.n.push(nx, ny, nz);
      this.c.push(_c.r, _c.g, _c.b);
    }
    this.u.push(0, 0, uw, 0, uw, vh, 0, vh);
    const b = this.vc;
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    this.vc += 4;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.vc > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
}

function makeBlockTexture() {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const img = g.createImageData(s, s);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const e = Math.min(x, y, s - 1 - x, s - 1 - y);
      let v = 0.94 + rnd() * 0.06;
      if (e < 2) v *= 0.7;
      else if (e < 4) v *= 0.86;
      else if ((x < 8 || y < 8) && e < 7) v = Math.min(1, v * 1.04);
      const i = (y * s + x) * 4;
      const b = Math.round(v * 255);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeRadialTexture(inner = 'rgba(0,0,0,0.45)', outer = 'rgba(0,0,0,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.6, inner);
  gr.addColorStop(1, outer);
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const TEX = makeBlockTexture();
export const SEA_TEX = TEX.clone();
SEA_TEX.repeat.set(1, 1);
SEA_TEX.needsUpdate = true;

// See-through circle around the wolf for tall decorations between it and the camera.
export const CUT = {
  center: { value: new THREE.Vector2(-9999, -9999) },
  depth: { value: 0 },
  radius: { value: 0 },
  minY: { value: 0 },
};
function cutoutMaterial() {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, map: TEX });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCutC = CUT.center;
    sh.uniforms.uCutD = CUT.depth;
    sh.uniforms.uCutR = CUT.radius;
    sh.uniforms.uCutY = CUT.minY;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWY;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vWY;\nuniform vec2 uCutC;\nuniform float uCutD;\nuniform float uCutR;\nuniform float uCutY;')
      .replace('void main() {', `void main() {
        if (uCutR > 0.0 && vWY > uCutY && gl_FragCoord.z < uCutD) {
          float dd = distance(gl_FragCoord.xy, uCutC) / uCutR;
          if (dd < 0.62) discard;
          if (dd < 1.0 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 1.0) discard;
        }`);
  };
  m.customProgramCacheKey = () => 'cutout-v1';
  return m;
}

export const MAT = {
  world: new THREE.MeshLambertMaterial({ vertexColors: true, map: TEX }),
  deco: cutoutMaterial(),
  char: new THREE.MeshLambertMaterial({ vertexColors: true, map: TEX }),
  gold: new THREE.MeshLambertMaterial({ vertexColors: true, map: TEX, emissive: 0x6a4400 }),
  glow: new THREE.MeshLambertMaterial({ vertexColors: true, map: TEX, emissive: 0x3a3a3a }),
  water: new THREE.MeshLambertMaterial({ vertexColors: true, map: TEX, transparent: true, opacity: 0.72, depthWrite: false }),
  silWolf: new THREE.MeshBasicMaterial({ color: 0x9ff0ff, depthFunc: THREE.GreaterDepth, depthWrite: false }),
  silCat: new THREE.MeshBasicMaterial({ color: 0xffb35c, depthFunc: THREE.GreaterDepth, depthWrite: false }),
};

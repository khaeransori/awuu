import * as THREE from 'three';
import { Builder, MAT } from './blocks.js';

const FIT = { fit: true };
const R = (rot) => ({ fit: true, rot });

function M(fn, mat) {
  const b = new Builder();
  fn(b);
  return new THREE.Mesh(b.build(), mat || MAT.char);
}
function G(x = 0, y = 0, z = 0, name) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (name) g.name = name;
  return g;
}

// ---------------------------------------------------------------- data
export const SKINS = [
  { id: 'abu', name: 'Si Abu', req: null, fur: 0x8d93a3, dark: 0x5f6576, light: 0xe8eaf0, eye: 0x2a9df4, inner: 0xf2a7b5 },
  { id: 'salju', name: 'Salju', req: { stars: 3 }, fur: 0xf1f5fb, dark: 0xaebfd8, light: 0xffffff, eye: 0x33b5e5, inner: 0xffc2d1 },
  { id: 'malam', name: 'Malam', req: { medals: 3 }, fur: 0x3d3856, dark: 0x25223a, light: 0x9a92c6, eye: 0xffd23f, inner: 0xc77dff },
  { id: 'api', name: 'Api', req: { stars: 8 }, fur: 0xe8552d, dark: 0xa8321a, light: 0xffd6a5, eye: 0x2b2d42, inner: 0xffb703 },
  { id: 'pelangi', name: 'Pelangi', req: { medals: 7 }, fur: 0xff70a6, dark: 0x5ec8ff, light: 0xffe66d, eye: 0x7b2cbf, inner: 0x9ef01a },
  { id: 'emas', name: 'Emas', req: { stars: 15 }, fur: 0xffc93c, dark: 0xe09f1f, light: 0xfff1c1, eye: 0x1d3557, inner: 0xff8fab, gold: true },
];

export const CAT_TYPES = {
  oren: { name: 'Kucing Oren', value: 1, fur: 0xf5963a, belly: 0xffe3bf, stripe: 0xd06a1c, eye: 0x6ab04c, speed: 4.5, detect: 5.2, pitch: 1, desc: 'Paling santai. Gampang ditangkap!' },
  abu: { name: 'Kucing Abu', value: 2, fur: 0x9ba4b0, belly: 0xe6e9ee, stripe: 0x6f7885, eye: 0x3fa7ff, speed: 5.9, detect: 6.2, pitch: 1.15, desc: 'Larinya cepat! Pakai TERKAM.' },
  belang: { name: 'Kucing Belang', value: 2, fur: 0xf7f3ec, belly: 0xffffff, stripe: null, eye: 0xf4a300, speed: 5.2, detect: 5.6, zig: true, patches: true, pitch: 1.3, desc: 'Larinya zig-zag, bikin bingung!' },
  ninja: { name: 'Kucing Ninja', value: 3, fur: 0x2e2d3b, belly: 0x4a4960, stripe: null, eye: 0xffe14d, speed: 5.0, detect: 5.2, ninja: true, pitch: 0.9, desc: 'Bisa menghilang, POOF! Pakai AUUU biar dia kaget.' },
  gendut: { name: 'Kucing Gendut', value: 3, fur: 0xf2b266, belly: 0xffffff, stripe: 0xd98b3a, eye: 0x6ab04c, speed: 2.8, detect: 4.2, fat: true, pitch: 0.7, desc: 'Berat banget! Harus pakai TERKAM.' },
  emas: { name: 'Kucing Emas', value: 5, fur: 0xffcf3f, belly: 0xfff2b3, stripe: 0xf0a500, eye: 0x3fa7ff, speed: 7.0, detect: 8, gold: true, pitch: 1.45, desc: 'Langka dan super cepat. Cuma muncul sebentar!' },
  raja: { name: 'Raja Kucing', value: 20, fur: 0xdfe2ea, belly: 0xffffff, stripe: 0xb5bac8, eye: 0x9b5de5, speed: 5.0, detect: 9, boss: true, hp: 3, pitch: 0.55, desc: 'Bos besar di Istana Salju. TERKAM 3 kali!' },
};
export const CAT_ORDER = ['oren', 'abu', 'belang', 'ninja', 'gendut', 'emas', 'raja'];

// ---------------------------------------------------------------- wolf
function addSilhouettes(root, mat, order = 2) {
  const list = [];
  root.traverse((o) => {
    if (o.isMesh && !o.userData.sil) list.push(o);
  });
  for (const m of list) {
    const s = new THREE.Mesh(m.geometry, mat);
    s.userData.sil = true;
    s.renderOrder = 1;
    m.renderOrder = order;
    m.add(s);
  }
}

export function buildWolf(skin) {
  const C = skin;
  const mat = C.gold ? MAT.gold : MAT.char;
  const root = G();
  const inner = G(0, 0, 0, 'inner');
  root.add(inner);
  const body = G(0, 0, 0, 'body');
  inner.add(body);
  body.add(
    M((b) => {
      b.box(0, 0.97, 0, 0.84, 0.66, 1.3, C.fur, FIT);
      b.box(0, 1.31, -0.1, 0.56, 0.06, 0.95, C.dark, FIT);
      b.box(0, 0.62, 0.04, 0.6, 0.06, 0.9, C.light, FIT);
      b.box(0, 0.94, 0.665, 0.6, 0.44, 0.04, C.light, FIT);
      b.box(0, 1.08, 0.5, 0.94, 0.56, 0.34, C.fur, FIT);
    }, mat)
  );
  const head = G(0, 1.36, 0.72, 'head');
  body.add(head);
  head.add(
    M((b) => {
      b.box(0, 0.12, 0.12, 0.72, 0.62, 0.66, C.fur, FIT);
      b.box(0, 0.45, 0.08, 0.46, 0.06, 0.46, C.dark, FIT);
      b.box(0, -0.03, 0.61, 0.4, 0.28, 0.3, C.light, FIT);
      b.box(0, 0.09, 0.77, 0.17, 0.12, 0.06, 0x2b2b2b, FIT);
      b.box(0, -0.12, 0.765, 0.18, 0.03, 0.02, 0x5a3a3a, FIT);
      for (const s of [-1, 1]) {
        b.box(s * 0.18, 0.22, 0.455, 0.19, 0.19, 0.03, 0xffffff, FIT);
        b.box(s * 0.17, 0.2, 0.475, 0.11, 0.14, 0.03, C.eye, FIT);
        b.box(s * 0.17, 0.2, 0.49, 0.05, 0.08, 0.01, 0x111111, FIT);
        b.box(s * 0.145, 0.245, 0.497, 0.04, 0.04, 0.01, 0xffffff, FIT);
        b.box(s * 0.17, 0.35, 0.46, 0.2, 0.04, 0.03, C.dark, R([0, 0, -s * 0.18]));
        b.box(s * 0.24, 0.54, 0.02, 0.22, 0.26, 0.14, C.fur, FIT);
        b.box(s * 0.25, 0.72, 0.02, 0.12, 0.14, 0.12, C.fur, FIT);
        b.box(s * 0.24, 0.54, 0.095, 0.12, 0.17, 0.02, C.inner, FIT);
        b.box(s * 0.41, -0.02, 0.2, 0.1, 0.3, 0.34, C.light, FIT);
      }
    }, mat)
  );
  const legs = [];
  const LP = [[-0.26, 0.45], [0.26, 0.45], [-0.26, -0.45], [0.26, -0.45]];
  LP.forEach(([x, z], i) => {
    const p = G(x, 0.66, z, 'leg' + i);
    body.add(p);
    p.add(
      M((b) => {
        b.box(0, -0.29, 0, 0.24, 0.58, 0.26, C.fur, FIT);
        b.box(0, -0.6, 0.03, 0.28, 0.12, 0.32, C.light, FIT);
      }, mat)
    );
    legs.push(p);
  });
  const tail = G(0, 1.15, -0.62, 'tail');
  tail.rotation.x = 0.5;
  body.add(tail);
  tail.add(
    M((b) => {
      b.box(0, 0, -0.34, 0.28, 0.28, 0.7, C.fur, FIT);
      b.box(0, 0.01, -0.3, 0.2, 0.05, 0.5, C.dark, FIT);
      b.box(0, 0, -0.77, 0.24, 0.24, 0.16, C.light, FIT);
    }, mat)
  );
  addSilhouettes(root, MAT.silWolf);
  // dizzy stars (not silhouetted)
  const dizzy = G(0, 2.25, 0.6, 'dizzy');
  for (let i = 0; i < 3; i++) {
    const s = M((b) => {
      b.box(0, 0, 0, 0.22, 0.22, 0.08, 0xffd60a, FIT);
      b.box(0, 0, 0, 0.12, 0.34, 0.1, 0xffd60a, FIT);
      b.box(0, 0, 0, 0.34, 0.12, 0.1, 0xffd60a, FIT);
    }, MAT.glow);
    s.userData.a = (i / 3) * Math.PI * 2;
    dizzy.add(s);
  }
  dizzy.visible = false;
  inner.add(dizzy);
  return { root, inner, body, head, legs, tail, dizzy, kind: 'wolf' };
}

// ---------------------------------------------------------------- cats
const catTemplates = {};
function buildCatTemplate(id) {
  const T = CAT_TYPES[id];
  const fat = !!T.fat;
  const boss = !!T.boss;
  const mat = T.gold ? MAT.gold : MAT.char;
  const root = G();
  const inner = G(0, 0, 0, 'inner');
  root.add(inner);
  if (boss) inner.scale.setScalar(2.1);
  const body = G(0, 0, 0, 'body');
  inner.add(body);
  const tw = fat ? 0.72 : 0.46;
  const th = fat ? 0.58 : 0.4;
  const td = fat ? 0.9 : 0.78;
  const ty = fat ? 0.6 : 0.52;
  const ORANGE = 0xf08a24;
  const BLACK = 0x2d2d2d;
  body.add(
    M((b) => {
      b.box(0, ty, 0, tw, th, td, T.fur, FIT);
      b.box(0, ty - th / 2 - 0.02, 0.02, tw * 0.78, 0.05, td * 0.75, T.belly, FIT);
      b.box(0, ty - 0.03, td / 2 + 0.012, tw * 0.7, th * 0.6, 0.03, T.belly, FIT);
      if (T.stripe) for (const z of [-0.24, 0, 0.24]) b.box(0, ty + th / 2 + 0.012, z * (td / 0.78), tw + 0.024, 0.03, 0.08, T.stripe, FIT);
      if (T.patches) {
        b.box(0.1, ty + th / 2 + 0.014, 0.12, 0.26, 0.03, 0.3, ORANGE, FIT);
        b.box(-0.1, ty + th / 2 + 0.014, -0.2, 0.24, 0.03, 0.26, BLACK, FIT);
        b.box(tw / 2 + 0.014, ty, 0.06, 0.03, 0.22, 0.3, ORANGE, FIT);
        b.box(-tw / 2 - 0.014, ty + 0.02, -0.16, 0.03, 0.2, 0.28, BLACK, FIT);
      }
      if (T.ninja) b.box(0, ty + 0.02, 0, tw + 0.03, 0.08, td * 0.5, 0xe63946, FIT);
      if (boss) {
        b.box(0, ty + th / 2 + 0.03, -0.06, tw + 0.08, 0.05, td * 0.8, 0xd62839, FIT);
        b.box(tw / 2 + 0.04, ty - 0.02, -0.06, 0.05, th * 0.9, td * 0.8, 0xd62839, FIT);
        b.box(-tw / 2 - 0.04, ty - 0.02, -0.06, 0.05, th * 0.9, td * 0.8, 0xd62839, FIT);
        b.box(0, ty + 0.12, td / 2 - 0.02, tw + 0.1, 0.1, 0.12, 0xffc300, FIT);
      }
    }, mat)
  );
  const hy = ty + th / 2 + 0.16;
  const hz = td / 2 - 0.02;
  const head = G(0, hy, hz, 'head');
  body.add(head);
  const hw = fat ? 0.6 : 0.54;
  head.add(
    M((b) => {
      b.box(0, 0.05, 0.08, hw, 0.44, 0.46, T.fur, FIT);
      b.box(0, -0.08, 0.325, 0.26, 0.13, 0.04, T.belly, FIT);
      b.box(0, -0.02, 0.35, 0.08, 0.05, 0.02, 0xff8fa3, FIT);
      for (const s of [-1, 1]) {
        b.box(s * 0.13, 0.1, 0.318, 0.15, 0.17, 0.02, 0xffffff, FIT);
        b.box(s * 0.13, 0.09, 0.333, 0.1, 0.13, 0.015, T.eye, FIT);
        b.box(s * 0.13, 0.09, 0.343, 0.04, 0.1, 0.01, 0x111111, FIT);
        b.box(s * 0.105, 0.13, 0.35, 0.035, 0.035, 0.01, 0xffffff, FIT);
        b.box(s * (hw / 2 - 0.07), 0.33, 0.03, 0.16, 0.14, 0.1, T.fur, FIT);
        b.box(s * (hw / 2 - 0.05), 0.43, 0.03, 0.08, 0.08, 0.08, T.fur, FIT);
        b.box(s * (hw / 2 - 0.07), 0.32, 0.085, 0.08, 0.09, 0.02, 0xffb3c6, FIT);
        b.box(s * 0.27, -0.04, 0.3, 0.24, 0.016, 0.016, 0xffffff, R([0, 0, s * 0.14]));
        b.box(s * 0.27, -0.09, 0.3, 0.24, 0.016, 0.016, 0xffffff, R([0, 0, -s * 0.1]));
      }
      if (T.patches) {
        b.box(-0.15, 0.24, 0.08, 0.26, 0.1, 0.47, ORANGE, FIT);
        b.box(0.17, 0.25, 0.08, 0.22, 0.08, 0.465, BLACK, FIT);
      }
      if (T.ninja) {
        b.box(0, 0.18, 0.08, hw + 0.03, 0.08, 0.48, 0xe63946, FIT);
        b.box(0.06, 0.19, -0.22, 0.05, 0.05, 0.18, 0xe63946, R([0.5, 0.35, 0]));
        b.box(-0.05, 0.16, -0.22, 0.05, 0.05, 0.18, 0xe63946, R([-0.35, -0.35, 0]));
      }
      if (boss) {
        b.box(0, 0.32, 0.06, 0.34, 0.08, 0.34, 0xffc300, FIT);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 0.13, 0.4, 0.06 + sz * 0.13, 0.07, 0.1, 0.07, 0xffc300, FIT);
        b.box(0, 0.42, 0.21, 0.07, 0.12, 0.05, 0xffc300, FIT);
        b.box(0, 0.32, 0.236, 0.08, 0.05, 0.02, 0xe63946, FIT);
      }
      if (T.gold) b.box(0, 0.3, 0.08, 0.1, 0.06, 0.1, 0xffffff, FIT);
    }, mat)
  );
  const lh = fat ? 0.34 : 0.34;
  const legs = [];
  const lx = tw / 2 - 0.1;
  const lz = td / 2 - 0.13;
  [[-lx, lz], [lx, lz], [-lx, -lz], [lx, -lz]].forEach(([x, z], i) => {
    const p = G(x, lh, z, 'leg' + i);
    body.add(p);
    p.add(
      M((b) => {
        b.box(0, -lh / 2, 0, 0.13, lh, 0.14, T.fur, FIT);
        b.box(0, -lh + 0.03, 0.02, 0.15, 0.06, 0.17, T.belly, FIT);
      }, mat)
    );
    legs.push(p);
  });
  const tail = G(0, ty + th / 2 - 0.08, -td / 2 + 0.02, 'tail');
  tail.rotation.x = 0.9;
  body.add(tail);
  tail.add(
    M((b) => {
      b.box(0, 0, -0.28, 0.1, 0.1, 0.56, T.fur, FIT);
      b.box(0, 0, -0.58, 0.11, 0.11, 0.1, T.stripe || (T.patches ? ORANGE : T.belly), FIT);
    }, mat)
  );
  // silhouettes only on torso + head (cheap)
  for (const g of [body, head]) {
    const m = g.children.find((c) => c.isMesh);
    const s = new THREE.Mesh(m.geometry, MAT.silCat);
    s.renderOrder = 1;
    s.userData.sil = true;
    m.add(s);
  }
  root.userData.height = boss ? (hy + 0.5) * 2.1 : hy + 0.5;
  return root;
}

export function buildCat(id) {
  if (!catTemplates[id]) catTemplates[id] = buildCatTemplate(id);
  const root = catTemplates[id].clone(true);
  const rig = {
    root,
    inner: root.getObjectByName('inner'),
    body: root.getObjectByName('body'),
    head: root.getObjectByName('head'),
    tail: root.getObjectByName('tail'),
    legs: [0, 1, 2, 3].map((i) => root.getObjectByName('leg' + i)),
    height: catTemplates[id].userData.height,
    kind: 'cat',
  };
  if (CAT_TYPES[id].boss) {
    const bm = MAT.char.clone();
    bm.emissive = new THREE.Color(0x000000);
    rig.mat = bm;
    root.traverse((o) => {
      if (o.isMesh && !o.userData.sil) o.material = bm;
    });
  }
  return rig;
}

// ---------------------------------------------------------------- dog
const dogTemplates = {};
function buildDogTemplate(variant) {
  const husky = variant === 'husky';
  const C = husky
    ? { fur: 0x6f7788, light: 0xf8f9fa, dark: 0x3f4555, eye: 0x4cc9f0, collar: 0x3a86ff }
    : { fur: 0xb97d4b, light: 0xf3d7ae, dark: 0x7a4e2b, eye: 0x3b2414, collar: 0xe63946 };
  const root = G();
  const inner = G(0, 0, 0, 'inner');
  root.add(inner);
  const body = G(0, 0, 0, 'body');
  inner.add(body);
  body.add(
    M((b) => {
      b.box(0, 0.82, 0, 0.72, 0.56, 1.1, C.fur, FIT);
      b.box(0, 0.53, 0.05, 0.52, 0.05, 0.8, C.light, FIT);
      if (husky) b.box(0, 0.8, 0.56, 0.5, 0.4, 0.04, C.light, FIT);
      else b.box(0.2, 1.11, -0.1, 0.34, 0.03, 0.4, C.dark, FIT);
    })
  );
  const head = G(0, 1.12, 0.6, 'head');
  body.add(head);
  head.add(
    M((b) => {
      b.box(0, 0.12, 0.12, 0.64, 0.56, 0.58, C.fur, FIT);
      b.box(0, -0.04, 0.53, 0.42, 0.3, 0.3, C.light, FIT);
      b.box(0, 0.08, 0.7, 0.2, 0.14, 0.06, 0x222222, FIT);
      b.box(0, -0.15, 0.69, 0.14, 0.08, 0.04, 0xff6b81, FIT);
      for (const s of [-1, 1]) {
        b.box(s * 0.16, 0.22, 0.415, 0.16, 0.16, 0.03, 0xffffff, FIT);
        b.box(s * 0.15, 0.21, 0.435, 0.09, 0.11, 0.02, C.eye, FIT);
        b.box(s * 0.13, 0.245, 0.447, 0.03, 0.03, 0.01, 0xffffff, FIT);
        if (husky) {
          b.box(s * 0.2, 0.5, 0.05, 0.18, 0.22, 0.12, C.fur, FIT);
          b.box(s * 0.2, 0.66, 0.05, 0.1, 0.12, 0.1, C.fur, FIT);
          b.box(s * 0.16, 0.3, 0.42, 0.16, 0.06, 0.02, C.light, FIT);
        } else {
          b.box(s * 0.37, 0.08, 0.08, 0.1, 0.46, 0.3, C.dark, R([0, 0, s * 0.12]));
        }
      }
      b.box(0, -0.2, 0.05, 0.7, 0.1, 0.5, C.collar, FIT);
      b.box(0, -0.29, 0.31, 0.12, 0.12, 0.04, 0xffd60a, FIT);
    })
  );
  const legs = [];
  [[-0.22, 0.38], [0.22, 0.38], [-0.22, -0.38], [0.22, -0.38]].forEach(([x, z], i) => {
    const p = G(x, 0.56, z, 'leg' + i);
    body.add(p);
    p.add(
      M((b) => {
        b.box(0, -0.25, 0, 0.2, 0.5, 0.22, C.fur, FIT);
        b.box(0, -0.51, 0.03, 0.23, 0.1, 0.27, C.light, FIT);
      })
    );
    legs.push(p);
  });
  const tail = G(0, 1.0, -0.54, 'tail');
  tail.rotation.x = husky ? 1.2 : 0.9;
  body.add(tail);
  tail.add(M((b) => b.box(0, 0, -0.2, 0.14, 0.14, husky ? 0.5 : 0.4, husky ? C.light : C.fur, FIT)));
  return root;
}
export function buildDog(variant = 'coklat') {
  if (!dogTemplates[variant]) dogTemplates[variant] = buildDogTemplate(variant);
  const root = dogTemplates[variant].clone(true);
  return {
    root,
    inner: root.getObjectByName('inner'),
    body: root.getObjectByName('body'),
    head: root.getObjectByName('head'),
    tail: root.getObjectByName('tail'),
    legs: [0, 1, 2, 3].map((i) => root.getObjectByName('leg' + i)),
    kind: 'dog',
  };
}

// ---------------------------------------------------------------- crab
let crabTemplate = null;
function buildCrabTemplate() {
  const RED = 0xff5a36;
  const root = G();
  const inner = G(0, 0, 0, 'inner');
  root.add(inner);
  inner.add(
    M((b) => {
      b.box(0, 0.36, 0, 0.9, 0.34, 0.62, RED, FIT);
      b.box(0, 0.55, 0, 0.7, 0.06, 0.46, 0xff7b55, FIT);
      for (const s of [-1, 1]) {
        b.box(s * 0.16, 0.66, 0.2, 0.06, 0.26, 0.06, RED, FIT);
        b.box(s * 0.16, 0.82, 0.2, 0.16, 0.16, 0.16, 0xffffff, FIT);
        b.box(s * 0.16, 0.82, 0.285, 0.08, 0.1, 0.02, 0x111111, FIT);
        for (let k = 0; k < 3; k++) b.box(s * 0.56, 0.2, -0.18 + k * 0.18, 0.34, 0.07, 0.07, 0xe0431f, R([0, 0, s * -0.5]));
      }
      b.box(0, 0.33, 0.315, 0.3, 0.05, 0.02, 0x7a1d0b, FIT);
    })
  );
  for (const s of [-1, 1]) {
    const c = G(s * 0.55, 0.42, 0.34, s < 0 ? 'clawL' : 'clawR');
    c.add(
      M((b) => {
        b.box(0, 0, 0, 0.26, 0.22, 0.26, RED, FIT);
        b.box(0, -0.03, 0.2, 0.22, 0.1, 0.22, 0xe0431f, FIT);
      })
    );
    const top = G(0, 0.07, 0.1, 'pincer');
    top.add(M((b) => b.box(0, 0.03, 0.12, 0.2, 0.08, 0.24, 0xff7b55, FIT)));
    c.add(top);
    inner.add(c);
  }
  return root;
}
export function buildCrab() {
  if (!crabTemplate) crabTemplate = buildCrabTemplate();
  const root = crabTemplate.clone(true);
  return {
    root,
    inner: root.getObjectByName('inner'),
    claws: [root.getObjectByName('clawL'), root.getObjectByName('clawR')],
    kind: 'crab',
  };
}

// ---------------------------------------------------------------- power-ups
export const POWERS = {
  tulang: { name: 'CEPAT!', label: 'Tulang Kilat', color: '#ffffff', dur: 7 },
  ikan: { name: 'MAGNET IKAN!', label: 'Ikan Magnet', color: '#4cc9f0', dur: 7 },
  jam: { name: '+10 DETIK!', label: 'Jam Ajaib', color: '#ffc300', dur: 0 },
  bintang: { name: 'POIN x2!', label: 'Bintang Ganda', color: '#ffd60a', dur: 8 },
};
const powerTemplates = {};
function buildPowerTemplate(kind) {
  const root = G();
  const spin = G(0, 1.0, 0, 'spin');
  root.add(spin);
  let m;
  if (kind === 'tulang') {
    m = M((b) => {
      b.box(0, 0, 0, 0.8, 0.2, 0.2, 0xfdfdfd, FIT);
      for (const s of [-1, 1]) for (const t of [-1, 1]) b.box(s * 0.42, t * 0.11, 0, 0.22, 0.22, 0.22, 0xfdfdfd, FIT);
    }, MAT.glow);
    m.rotation.z = 0.5;
  } else if (kind === 'ikan') {
    m = M((b) => {
      b.box(0, 0, 0, 0.66, 0.36, 0.16, 0x4cc9f0, FIT);
      b.box(0.02, -0.1, 0, 0.5, 0.12, 0.18, 0xcaf0f8, FIT);
      b.box(-0.44, 0, 0, 0.2, 0.44, 0.1, 0x3a86ff, FIT);
      b.box(0.08, 0.2, 0, 0.26, 0.08, 0.06, 0x3a86ff, FIT);
      for (const s of [-1, 1]) b.box(0.22, 0.06, s * 0.085, 0.08, 0.08, 0.02, 0x111111, FIT);
    }, MAT.glow);
  } else if (kind === 'jam') {
    m = M((b) => {
      b.box(0, 0, 0, 0.7, 0.7, 0.2, 0xffc300, FIT);
      for (const s of [-1, 1]) {
        b.box(0, 0, s * 0.105, 0.52, 0.52, 0.02, 0xffffff, FIT);
        b.box(0, 0.1, s * 0.12, 0.05, 0.22, 0.02, 0x222222, FIT);
        b.box(0.08, 0, s * 0.12, 0.18, 0.05, 0.02, 0x222222, FIT);
        b.box(s * 0.24, 0.42, 0, 0.18, 0.12, 0.18, 0xffc300, FIT);
      }
    }, MAT.glow);
  } else {
    m = M((b) => {
      b.box(0, 0, 0, 0.3, 0.3, 0.22, 0xffd60a, FIT);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        b.box(Math.sin(a) * 0.24, Math.cos(a) * 0.24, 0, 0.2, 0.38, 0.18, 0xffd60a, R([0, 0, -a]));
      }
    }, MAT.glow);
  }
  spin.add(m);
  return root;
}
export function buildPower(kind) {
  if (!powerTemplates[kind]) powerTemplates[kind] = buildPowerTemplate(kind);
  const root = powerTemplates[kind].clone(true);
  return { root, spin: root.getObjectByName('spin') };
}

// ---------------------------------------------------------------- shared animation
// st: {phase, amt, air, sit, stretch, t}
export function animLegs(rig, phase, amt, air) {
  const L = rig.legs;
  if (air) {
    L[0].rotation.x = -0.7;
    L[1].rotation.x = -0.6;
    L[2].rotation.x = 0.7;
    L[3].rotation.x = 0.6;
    return;
  }
  const s = Math.sin(phase) * amt;
  L[0].rotation.x = s;
  L[3].rotation.x = s;
  L[1].rotation.x = -s;
  L[2].rotation.x = -s;
}

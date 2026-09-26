import * as THREE from 'three';
import { buildWolf, buildCat, buildDog, buildCrab, buildPower, CAT_TYPES, POWERS, animLegs } from './models.js';
import { generateWorld, WATER } from './world.js';
import { SEA_TEX } from './blocks.js';
import { Particles, Shadows, Rings, Icons } from './fx.js';
import { sfx, setTempo } from './audio.js';
import { LEVELS } from './levels.js';
import { clamp, damp, angleLerp, rand, weighted } from './util.js';
import { save, persist } from './save.js';

const GRAV = 25;
const STEP = 0.55;
const ZERO = { mx: 0, mz: 0, jump: false, pounce: false, howl: false };

class Body {
  constructor(r) {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.r = r;
    this.onGround = true;
    this.yaw = 0;
    this.inWater = false;
    this.onIce = false;
    this.onBounce = false;
    this.landed = false;
    this.landSpeed = 0;
  }
}
function collides(w, x, z, y, r) {
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r), z0 = Math.floor(z - r), z1 = Math.floor(z + r);
  for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) if (w.colC(ix, iz) > y + STEP) return true;
  return false;
}
export function groundUnder(w, x, z, r) {
  r *= 0.55;
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r), z0 = Math.floor(z - r), z1 = Math.floor(z + r);
  let m = -99;
  for (let iz = z0; iz <= z1; iz++)
    for (let ix = x0; ix <= x1; ix++) {
      const c = w.colC(ix, iz);
      if (c < 50 && c > m) m = c;
    }
  return m === -99 ? 0 : m;
}
function stepBody(w, b, dt) {
  let hit = false;
  const nx = b.pos.x + b.vel.x * dt;
  if (collides(w, nx, b.pos.z, b.pos.y, b.r)) { hit = true; b.vel.x = 0; } else b.pos.x = nx;
  const nz = b.pos.z + b.vel.z * dt;
  if (collides(w, b.pos.x, nz, b.pos.y, b.r)) { hit = true; b.vel.z = 0; } else b.pos.z = nz;
  b.pos.x = clamp(b.pos.x, b.r, w.W - b.r);
  b.pos.z = clamp(b.pos.z, b.r, w.D - b.r);
  const g = groundUnder(w, b.pos.x, b.pos.z, b.r);
  const was = b.onGround;
  b.vel.y -= GRAV * dt;
  if (b.vel.y < -30) b.vel.y = -30;
  b.pos.y += b.vel.y * dt;
  b.landed = false;
  if (b.pos.y <= g) {
    if (!was) { b.landed = true; b.landSpeed = -b.vel.y; }
    b.pos.y = g; b.vel.y = 0; b.onGround = true;
  } else if (was && b.vel.y <= 0 && b.pos.y - g < 0.6) {
    b.pos.y = g; b.vel.y = 0; b.onGround = true;
  } else b.onGround = false;
  const f = w.flagAt(b.pos.x, b.pos.z);
  b.inWater = !!(f & WATER) && b.pos.y < 0.05;
  b.onIce = !!(f & 2) && b.onGround;
  b.onBounce = !!(f & 4) && b.onGround && Math.abs(b.pos.y - w.colAt(b.pos.x, b.pos.z)) < 0.06;
  return hit;
}
function steer(world, b, ax, az, side, climb = 1.2) {
  const base = Math.atan2(ax, az);
  const offs = [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 1.9, -1.9, 2.5, -2.5];
  for (const o of offs) {
    const a = base + o * side;
    const dx = Math.sin(a), dz = Math.cos(a);
    let ok = true;
    for (const s of [0.7, 1.5]) {
      const x = b.pos.x + dx * s, z = b.pos.z + dz * s;
      if (world.colAt(x, z) > b.pos.y + climb) { ok = false; break; }
      if (!b.inWater && world.flagAt(x, z) & WATER) { ok = false; break; }
    }
    if (ok) return { x: dx, z: dz };
  }
  return { x: Math.sin(base), z: Math.cos(base) };
}

// ================================================================ WOLF
class Wolf {
  constructor(game) {
    this.game = game;
    this.body = new Body(0.38);
    this.rig = null;
    this.t = 0;
    this.reset();
  }
  get pos() { return this.body.pos; }
  setSkin(skin) {
    if (this.rig) this.game.scene.remove(this.rig.root);
    this.rig = buildWolf(skin);
    this.game.scene.add(this.rig.root);
    this.animate(0);
  }
  reset() {
    Object.assign(this, { pounceT: 0, pounceCD: 0, stun: 0, invuln: 0, boost: 0, magnet: 0, double: 0, howlMeter: 0, howlT: 0, jumpBuf: 0, coyote: 0, phase: 0, targetYaw: 0, dustT: 0, fxT: 0, moved: 0, squash: 0, lookYaw: 0 });
    this.body.vel.set(0, 0, 0);
  }
  place(x, z) {
    this.body.pos.set(x, groundUnder(this.game.world, x, z, this.body.r), z);
    this.body.yaw = 0;
    this.targetYaw = 0;
    this.body.onGround = true;
  }
  hitBy(src, stun) {
    const b = this.body, g = this.game;
    const dx = b.pos.x - src.x, dz = b.pos.z - src.z, d = Math.hypot(dx, dz) || 1;
    b.vel.x = (dx / d) * 7;
    b.vel.z = (dz / d) * 7;
    b.vel.y = 5;
    b.onGround = false;
    this.stun = stun;
    this.invuln = stun + 1.4;
    this.pounceT = 0;
    sfx.bonk();
    g.shake(0.35);
    g.floatText(b.pos, 'Pusing!', 'bad');
    g.fx.emit(b.pos.x, b.pos.y + 1.8, b.pos.z, { n: 10, color: [0xffd60a, 0xffffff], speed: 3, up: 3, life: 0.6, size: 0.16 });
    if (navigator.vibrate) try { navigator.vibrate(80); } catch (e) {}
  }
  startPounce(mx, mz) {
    const b = this.body, g = this.game;
    let dx = Math.sin(b.yaw), dz = Math.cos(b.yaw);
    const m = Math.hypot(mx, mz);
    if (m > 0.2) { dx = mx / m; dz = mz / m; }
    const t = g.pounceTarget(b.pos, dx, dz);
    if (t) {
      const ex = t.body.pos.x - b.pos.x, ez = t.body.pos.z - b.pos.z, el = Math.hypot(ex, ez) || 1;
      dx = ex / el; dz = ez / el;
    }
    this.pdx = dx; this.pdz = dz;
    this.pounceT = 0.3;
    this.pounceCD = 1.0;
    b.vel.y = Math.max(b.vel.y, 4.6);
    b.onGround = false;
    this.coyote = 0;
    b.yaw = Math.atan2(dx, dz);
    this.targetYaw = b.yaw;
    sfx.pounce();
    g.stats.pounces++;
    g.fx.emit(b.pos.x, b.pos.y + 0.2, b.pos.z, { n: 8, color: g.dustColor(), speed: 2.5, up: 2, life: 0.5, size: 0.2 });
  }
  update(dt, inp) {
    const b = this.body, g = this.game;
    this.t += dt;
    this.pounceCD = Math.max(0, this.pounceCD - dt);
    this.stun = Math.max(0, this.stun - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.boost = Math.max(0, this.boost - dt);
    this.magnet = Math.max(0, this.magnet - dt);
    this.double = Math.max(0, this.double - dt);
    let mx = inp.mx, mz = inp.mz;
    if (this.stun > 0) { mx = mz = 0; }
    let mag = Math.hypot(mx, mz);
    if (mag > 1) { mx /= mag; mz /= mag; mag = 1; }
    const maxS = (this.boost > 0 ? 9.6 : 6.6) * (b.inWater ? 0.55 : 1);
    if (this.pounceT > 0) {
      this.pounceT -= dt;
      const ps = b.inWater ? 11 : 17;
      b.vel.x = this.pdx * ps;
      b.vel.z = this.pdz * ps;
    } else {
      const acc = b.onIce ? 1.6 : b.onGround ? 16 : 8;
      const k = 1 - Math.exp(-acc * dt);
      b.vel.x += (mx * maxS - b.vel.x) * k;
      b.vel.z += (mz * maxS - b.vel.z) * k;
    }
    if (mag > 0.15 && this.pounceT <= 0) this.targetYaw = Math.atan2(mx, mz);
    b.yaw = angleLerp(b.yaw, this.targetYaw, 1 - Math.exp(-14 * dt));
    this.moved += Math.hypot(b.vel.x, b.vel.z) * dt;
    // jump with buffer + coyote time
    if (inp.jump) { this.jumpBuf = 0.15; inp.jump = false; }
    this.jumpBuf -= dt;
    if (b.onGround) this.coyote = 0.12; else this.coyote -= dt;
    if (this.jumpBuf > 0 && this.coyote > 0 && this.stun <= 0) {
      b.vel.y = b.inWater ? 7.4 : 8.8;
      b.onGround = false;
      this.coyote = 0;
      this.jumpBuf = 0;
      sfx.jump();
      g.stats.jumps++;
      this.squash = -0.25;
    }
    if (inp.pounce) {
      inp.pounce = false;
      if (this.pounceCD <= 0 && this.stun <= 0) this.startPounce(mx, mz);
    }
    if (inp.howl) {
      inp.howl = false;
      if (this.howlMeter >= 1 && this.stun <= 0) g.howl();
      else if (g.state === 'play') sfx.denied();
    }
    const wasWater = b.inWater;
    const hit = stepBody(g.world, b, dt);
    if (hit && this.pounceT > 0 && Math.hypot(b.vel.x, b.vel.z) < 1) this.pounceT = 0;
    if (b.onBounce) {
      b.vel.y = 15.5;
      b.onGround = false;
      sfx.boing();
      g.rings.spawn(b.pos.x, b.pos.y, b.pos.z, { color: 0xffd60a, to: 2.5, dur: 0.4 });
      this.squash = -0.35;
    }
    if (b.landed) {
      this.squash = Math.min(0.35, b.landSpeed * 0.025);
      if (b.landSpeed > 8) { sfx.land(); g.fx.emit(b.pos.x, b.pos.y + 0.1, b.pos.z, { n: 8, color: g.dustColor(), speed: 3, up: 1.5, life: 0.45, size: 0.18 }); }
    }
    if (!wasWater && b.inWater) {
      sfx.splash();
      g.fx.emit(b.pos.x, -0.1, b.pos.z, { n: 14, color: [0xffffff, 0x8fe3ff], speed: 3, up: 5, life: 0.6, size: 0.16 });
    }
    // trail fx
    const sp = Math.hypot(b.vel.x, b.vel.z);
    this.dustT -= dt;
    if (this.dustT <= 0 && sp > 4 && b.onGround) {
      this.dustT = b.inWater ? 0.12 : 0.16;
      if (b.inWater) g.fx.emit(b.pos.x, -0.12, b.pos.z, { n: 2, color: 0xffffff, speed: 1.5, up: 2, life: 0.4, size: 0.12 });
      else g.fx.emit(b.pos.x, b.pos.y + 0.05, b.pos.z, { n: 1, color: g.dustColor(), speed: 0.8, up: 1, life: 0.4, size: 0.2, grav: 2 });
    }
    this.fxT -= dt;
    if (this.fxT <= 0) {
      this.fxT = 0.1;
      if (this.boost > 0 && sp > 2) g.fx.emit(b.pos.x, b.pos.y + 0.6, b.pos.z, { n: 2, color: [0xffffff, 0xaee4ff], speed: 0.5, up: 0.5, life: 0.35, size: 0.2, grav: 0 });
      if (this.double > 0) g.fx.emit(b.pos.x, b.pos.y + 1 + Math.random(), b.pos.z, { n: 1, color: 0xffd60a, speed: 1.5, up: 1, life: 0.5, size: 0.12, grav: 0, spread: 1.4 });
      if (this.magnet > 0 && Math.random() < 0.35) g.rings.spawn(b.pos.x, b.pos.y, b.pos.z, { color: 0x4cc9f0, from: 9, to: 1, dur: 0.7, opacity: 0.5 });
    }
    this.animate(dt);
  }
  animate(dt) {
    const r = this.rig, b = this.body;
    if (!r) return;
    r.root.position.copy(b.pos);
    r.root.rotation.y = b.yaw;
    const sp = Math.hypot(b.vel.x, b.vel.z);
    const amt = clamp(sp / 6.6, 0, 1);
    this.phase += dt * (3 + sp * 1.7);
    const air = !b.onGround;
    let pitch = 0;
    if (this.pounceT > 0) {
      pitch = -0.28;
      r.legs[0].rotation.x = r.legs[1].rotation.x = -1.25;
      r.legs[2].rotation.x = r.legs[3].rotation.x = 1.15;
    } else if (this.howlT > 0) {
      this.howlT -= dt;
      pitch = -0.55;
      r.legs[0].rotation.x = r.legs[1].rotation.x = 0.5;
      r.legs[2].rotation.x = r.legs[3].rotation.x = -1.1;
    } else {
      animLegs(r, this.phase, 0.95 * amt, air);
      if (air) pitch = clamp(-b.vel.y * 0.03, -0.35, 0.35);
    }
    r.body.rotation.x = damp(r.body.rotation.x, pitch, 14, dt);
    const bob = Math.abs(Math.sin(this.phase)) * 0.08 * amt;
    r.body.position.y = bob + (this.howlT > 0 ? -0.18 : 0);
    // head
    let hy = 0, hp = 0;
    if (this.howlT > 0) hp = -0.75;
    else {
      const t = this.game.nearestCat(b.pos, 7);
      if (t) {
        let a = Math.atan2(t.body.pos.x - b.pos.x, t.body.pos.z - b.pos.z) - b.yaw;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        hy = clamp(a, -0.6, 0.6);
      }
    }
    this.lookYaw = damp(this.lookYaw, hy, 8, dt);
    r.head.rotation.y = this.lookYaw;
    r.head.rotation.x = damp(r.head.rotation.x, hp, 10, dt);
    const happy = this.game.t - this.game.lastCatchT < 1.5 ? 1 : 0;
    r.tail.rotation.y = Math.sin(this.t * (sp > 1 || happy ? 16 : 6)) * (0.35 + 0.3 * happy);
    r.tail.rotation.x = 0.5 + amt * 0.25 + (this.stun > 0 ? -0.6 : 0);
    // squash & stretch
    this.squash = damp(this.squash, 0, 10, dt);
    const sq = this.squash;
    r.inner.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
    // dizzy stars
    r.dizzy.visible = this.stun > 0;
    if (this.stun > 0) {
      r.dizzy.rotation.y += dt * 6;
      r.dizzy.children.forEach((s, i) => {
        const a = s.userData.a;
        s.position.set(Math.sin(a) * 0.45, Math.sin(this.t * 6 + i) * 0.06, Math.cos(a) * 0.45);
        s.rotation.z += dt * 5;
      });
    }
    r.inner.visible = !(this.invuln > 0 && this.stun <= 0 && Math.floor(this.t * 14) % 2 === 0);
  }
}

// ================================================================ CAT
class Cat {
  constructor(game, id, x, z, extra) {
    this.game = game;
    this.id = id;
    this.T = CAT_TYPES[id];
    this.extra = !!extra;
    const r = this.T.boss ? 0.6 : this.T.fat ? 0.36 : 0.27;
    this.body = new Body(r);
    this.body.pos.set(x, groundUnder(game.world, x, z, r), z);
    this.body.yaw = Math.random() * Math.PI * 2;
    this.rig = buildCat(id);
    this.base = this.T.boss ? 2.1 : 1;
    game.scene.add(this.rig.root);
    Object.assign(this, { state: 'wander', t: Math.random() * 10, phase: 0, idle: Math.random() * 2, wt: null, wtT: 0, freeze: 0, tpCD: 2, alertCD: 0, stuck: 0, hp: this.T.hp || 1, hitCD: 0, bumpCD: 0, side: Math.random() < 0.5 ? 1 : -1, escape: 0, escDir: null, life: this.T.gold ? 22 : Infinity, caughtT: 0, spawnT: 0, sit: 0, flash: 0, fxT: 0 });
    this.animate(0, 0, false, false);
  }
  get pos() { return this.body.pos; }
  remove() {
    this.game.scene.remove(this.rig.root);
    if (this.rig.mat) this.rig.mat.dispose();
    this.dead = true;
  }
  teleport() {
    const g = this.game, b = this.body;
    const smoke = { n: 20, color: [0x2e2d3b, 0x5a5a70, 0xb0b0c8], speed: 3, up: 2.5, life: 0.8, size: 0.32, grav: -1 };
    g.fx.emit(b.pos.x, b.pos.y + 0.4, b.pos.z, smoke);
    sfx.poof();
    g.floatText(b.pos, 'POOF!', 'poof');
    const p = g.randomSpawn(11);
    b.pos.set(p.x, p.y, p.z);
    b.vel.set(0, 0, 0);
    g.fx.emit(b.pos.x, b.pos.y + 0.4, b.pos.z, smoke);
    this.tpCD = 5.5;
    this.state = 'wander';
    this.idle = 1.2;
  }
  update(dt) {
    const g = this.game, b = this.body, w = g.wolf, T = this.T;
    this.t += dt;
    this.spawnT += dt;
    if (this.state === 'caught') {
      this.caughtT += dt;
      const k = Math.min(1, this.caughtT / 0.65);
      this.rig.root.position.y = b.pos.y + k * 1.6;
      this.rig.root.rotation.y += dt * 16;
      this.rig.inner.scale.setScalar(this.base * Math.max(0.001, 1 - k * k) * (1 + Math.sin(k * 9) * 0.15));
      if (k >= 1) this.remove();
      return;
    }
    this.tpCD -= dt; this.alertCD -= dt; this.hitCD -= dt; this.bumpCD -= dt;
    if (this.flash > 0) {
      this.flash -= dt;
      const k = Math.max(0, this.flash / 0.4);
      this.rig.mat.emissive.setRGB(k * 0.9, k * 0.3, k * 0.3);
    }
    if (T.gold) {
      if (g.state === 'play') {
        this.life -= dt;
        if (this.life <= 0) { g.catEscaped(this); return; }
      }
      this.fxT -= dt;
      if (this.fxT <= 0) { this.fxT = 0.12; g.fx.emit(b.pos.x, b.pos.y + 0.6, b.pos.z, { n: 1, color: [0xffd60a, 0xffffff], speed: 1, up: 1.5, life: 0.6, size: 0.12, grav: 0, spread: 0.8 }); }
    }
    let tx = 0, tz = 0, speed = 0, sitting = false;
    const dx = b.pos.x - w.body.pos.x, dz = b.pos.z - w.body.pos.z;
    const d = Math.hypot(dx, dz) || 0.001;
    if (this.freeze > 0) {
      this.freeze -= dt;
      const k = Math.exp(-8 * dt);
      b.vel.x *= k; b.vel.z *= k;
      stepBody(g.world, b, dt);
      this.animate(dt, 0, false, true);
      return;
    }
    const magnet = w.magnet > 0 && d < 10 && !T.boss;
    if (magnet) {
      tx = -dx / d; tz = -dz / d; speed = 3.6;
      this.state = 'pulled';
    } else if (d < T.detect || (this.state === 'flee' && d < T.detect * 1.7)) {
      if (this.state !== 'flee') {
        this.state = 'flee';
        if (this.alertCD <= 0) {
          g.icons.show('!', this, { h: this.rig.height + 0.35, dur: 0.8, size: T.boss ? 1.2 : 0.75 });
          this.alertCD = 4;
          if (Math.random() < 0.3) sfx.meow(T.pitch * 1.15);
        }
      }
      if (T.ninja && d < 3.0 && this.tpCD <= 0 && (this.tpN || 0) < 2) { this.tpN = (this.tpN || 0) + 1; this.teleport(); return; }
      let ax = dx / d, az = dz / d;
      if (T.zig) {
        const s = Math.sin(this.t * 5.5) * 0.95;
        const px = -az, pz = ax;
        ax += px * s; az += pz * s;
      }
      const W = g.world.W, D = g.world.D, m = 3.5;
      if (b.pos.x < m) ax += ((m - b.pos.x) / m) * 1.3;
      if (b.pos.x > W - m) ax -= ((b.pos.x - (W - m)) / m) * 1.3;
      if (b.pos.z < m) az += ((m - b.pos.z) / m) * 1.3;
      if (b.pos.z > D - m) az -= ((b.pos.z - (D - m)) / m) * 1.3;
      const l = Math.hypot(ax, az) || 1;
      ax /= l; az /= l;
      if (this.escape > 0) { this.escape -= dt; ax = this.escDir.x; az = this.escDir.z; }
      const dir = steer(g.world, b, ax, az, this.side, 1.2);
      tx = dir.x; tz = dir.z;
      speed = T.speed * (T.boss ? 1 + (3 - this.hp) * 0.08 : 1);
      if (g.mode === 'menu') speed *= 0.8;
    } else {
      if (this.state !== 'wander') { this.state = 'wander'; this.idle = rand(0.4, 1.2); }
      if (this.idle > 0) {
        this.idle -= dt;
        sitting = this.idle > 0.25;
      } else {
        this.wtT -= dt;
        if (!this.wt || this.wtT <= 0 || Math.hypot(this.wt.x - b.pos.x, this.wt.z - b.pos.z) < 0.6) {
          if (this.wt && Math.random() < 0.55) { this.idle = rand(1.2, 3.5); this.wt = null; }
          else { this.wt = g.nearbyPoint(b.pos, 7); this.wtT = 6; }
        }
        if (this.wt) {
          const ex = this.wt.x - b.pos.x, ez = this.wt.z - b.pos.z, el = Math.hypot(ex, ez) || 1;
          const dir = steer(g.world, b, ex / el, ez / el, this.side, 0.6);
          tx = dir.x; tz = dir.z; speed = 1.5;
        }
      }
    }
    if (b.inWater) speed *= 0.6;
    const acc = b.onIce ? 2.2 : b.onGround ? 10 : 4;
    const k = 1 - Math.exp(-acc * dt);
    b.vel.x += (tx * speed - b.vel.x) * k;
    b.vel.z += (tz * speed - b.vel.z) * k;
    const hit = stepBody(g.world, b, dt);
    if (b.onBounce) { b.vel.y = 14; b.onGround = false; }
    if (hit && b.onGround && speed > 2) {
      const ahead = g.world.colAt(b.pos.x + tx * 0.75, b.pos.z + tz * 0.75);
      if (ahead - b.pos.y <= 1.25) { b.vel.y = 7.8; b.onGround = false; }
    }
    const moved = Math.hypot(b.vel.x, b.vel.z);
    if (this.state === 'flee' && moved < speed * 0.3) {
      this.stuck += dt;
      if (this.stuck > 0.45) {
        this.stuck = 0;
        this.side *= -1;
        const a = Math.atan2(tx, tz) + this.side * (1.3 + Math.random());
        this.escDir = { x: Math.sin(a), z: Math.cos(a) };
        this.escape = 0.6;
      }
    } else this.stuck = Math.max(0, this.stuck - dt);
    if (moved > 0.3) b.yaw = angleLerp(b.yaw, Math.atan2(b.vel.x, b.vel.z), 1 - Math.exp(-10 * dt));
    else if (sitting && this.state === 'wander') b.yaw = angleLerp(b.yaw, Math.atan2(-dx, -dz), 1 - Math.exp(-1.5 * dt));
    this.animate(dt, moved, sitting, false);
  }
  animate(dt, sp, sitting, frozen) {
    const r = this.rig, b = this.body;
    r.root.position.copy(b.pos);
    r.root.rotation.y = b.yaw;
    const amt = clamp(sp / 5, 0, 1);
    this.phase += dt * (5 + sp * 2.6);
    animLegs(r, this.phase, amt, !b.onGround);
    this.sit = damp(this.sit, sitting ? 1 : 0, 8, dt);
    const s = this.sit;
    r.body.rotation.x = -0.4 * s;
    r.body.position.y = Math.abs(Math.sin(this.phase)) * 0.05 * amt - 0.06 * s;
    if (s > 0.02) {
      r.legs[2].rotation.x = r.legs[3].rotation.x = -1.35 * s;
      r.legs[0].rotation.x = r.legs[1].rotation.x = 0.4 * s;
    }
    const fleeing = this.state === 'flee';
    r.tail.rotation.y = Math.sin(this.t * (fleeing ? 12 : 2.5)) * (fleeing ? 0.4 : 0.6);
    r.tail.rotation.x = 0.9 + (fleeing ? 0.35 : 0) - s * 0.5;
    r.head.rotation.y = sitting ? Math.sin(this.t * 0.9) * 0.45 : 0;
    r.head.rotation.x = frozen ? -0.25 : 0;
    r.inner.position.x = frozen ? Math.sin(this.t * 55) * 0.035 * this.base : 0;
    const p = Math.min(1, this.spawnT * 3.5);
    const pop = p < 1 ? 0.2 + 0.8 * p + Math.sin(p * Math.PI) * 0.25 : 1;
    r.inner.scale.setScalar(this.base * pop);
  }
}

// ================================================================ HAZARDS
class Dog {
  constructor(game, variant, route) {
    this.game = game;
    this.body = new Body(0.4);
    this.route = route;
    this.ri = 1 % route.length;
    const p = route[0];
    this.body.pos.set(p.x, groundUnder(game.world, p.x, p.z, 0.4), p.z);
    this.rig = buildDog(variant);
    game.scene.add(this.rig.root);
    Object.assign(this, { state: 'patrol', rest: 0, chase: 0, t: 0, phase: 0, stuck: 0, side: 1 });
  }
  get pos() { return this.body.pos; }
  remove() { this.game.scene.remove(this.rig.root); }
  scare() { this.state = 'rest'; this.rest = 3; this.game.icons.show('?', this, { h: 2.0, dur: 1 }); }
  update(dt) {
    const g = this.game, b = this.body, w = g.wolf;
    this.t += dt;
    const dx = w.body.pos.x - b.pos.x, dz = w.body.pos.z - b.pos.z, d = Math.hypot(dx, dz) || 0.001;
    const dy = Math.abs(w.body.pos.y - b.pos.y);
    let tx = 0, tz = 0, speed = 0;
    const live = g.state === 'play';
    if (this.state === 'rest') {
      this.rest -= dt;
      if (this.rest <= 0) this.state = 'patrol';
    } else if (this.state === 'chase') {
      this.chase -= dt;
      const dir = steer(g.world, b, dx / d, dz / d, this.side, 0.55);
      tx = dir.x; tz = dir.z; speed = 5.2;
      if (this.chase <= 0 || d > 11 || w.stun > 0 || !live) { this.state = 'rest'; this.rest = 1.2; }
      if (d < 1.05 && dy < 1.0 && w.invuln <= 0 && w.pounceT <= 0 && live) {
        w.hitBy(b.pos, 1.4);
        g.stats.dogHits++;
        this.state = 'rest';
        this.rest = 3.5;
        g.icons.show('♪', this, { h: 2.0, dur: 1.2 });
      }
    } else {
      const p = this.route[this.ri];
      const ex = p.x - b.pos.x, ez = p.z - b.pos.z, el = Math.hypot(ex, ez) || 1;
      if (el < 0.9) this.ri = (this.ri + 1) % this.route.length;
      const dir = steer(g.world, b, ex / el, ez / el, this.side, 0.55);
      tx = dir.x; tz = dir.z; speed = 2.3;
      if (d < 6.5 && dy < 1.4 && w.stun <= 0 && w.invuln <= 0 && live) {
        this.state = 'chase';
        this.chase = 3.2;
        sfx.bark();
        g.icons.show('!!', this, { h: 2.0, dur: 0.9 });
      }
    }
    if (b.inWater) speed *= 0.6;
    const k = 1 - Math.exp(-(b.onIce ? 2 : 9) * dt);
    b.vel.x += (tx * speed - b.vel.x) * k;
    b.vel.z += (tz * speed - b.vel.z) * k;
    stepBody(g.world, b, dt);
    const sp = Math.hypot(b.vel.x, b.vel.z);
    if (speed > 1 && sp < speed * 0.25) {
      this.stuck += dt;
      if (this.stuck > 1.5) { this.stuck = 0; this.side *= -1; if (this.state === 'patrol') this.ri = (this.ri + 1) % this.route.length; }
    } else this.stuck = 0;
    if (sp > 0.3) b.yaw = angleLerp(b.yaw, Math.atan2(b.vel.x, b.vel.z), 1 - Math.exp(-8 * dt));
    const r = this.rig;
    r.root.position.copy(b.pos);
    r.root.rotation.y = b.yaw;
    this.phase += dt * (4 + sp * 2);
    const resting = this.state === 'rest';
    animLegs(r, this.phase, clamp(sp / 5, 0, 1), !b.onGround);
    if (resting && sp < 0.5) { r.legs[2].rotation.x = r.legs[3].rotation.x = -1.2; r.body.rotation.x = damp(r.body.rotation.x, -0.35, 8, dt); }
    else r.body.rotation.x = damp(r.body.rotation.x, 0, 8, dt);
    r.tail.rotation.y = Math.sin(this.t * (resting ? 18 : 8)) * 0.5;
    r.head.rotation.x = this.state === 'chase' ? 0.1 : Math.sin(this.t * 2) * 0.05;
  }
}

class Crab {
  constructor(game, x, z) {
    this.game = game;
    this.body = new Body(0.42);
    this.body.pos.set(x, groundUnder(game.world, x, z, 0.42), z);
    this.x0 = x;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.pause = 0;
    this.t = Math.random() * 5;
    this.hitCD = 0;
    this.rig = buildCrab();
    game.scene.add(this.rig.root);
  }
  get pos() { return this.body.pos; }
  remove() { this.game.scene.remove(this.rig.root); }
  scare() { this.pause = 3; this.game.icons.show('?', this, { h: 1.3, dur: 1 }); }
  update(dt) {
    const g = this.game, b = this.body, w = g.wolf;
    this.t += dt;
    this.hitCD -= dt;
    let vx = 0;
    if (this.pause > 0) this.pause -= dt;
    else {
      vx = this.dir * 2.8;
      if ((this.dir > 0 && b.pos.x > this.x0 + 4.5) || (this.dir < 0 && b.pos.x < this.x0 - 4.5)) { this.dir *= -1; this.pause = rand(0.3, 1.1); }
    }
    b.vel.x = damp(b.vel.x, vx, 10, dt);
    b.vel.z = damp(b.vel.z, 0, 10, dt);
    const hit = stepBody(g.world, b, dt);
    if (hit) { this.dir *= -1; this.pause = 0.4; }
    const dx = w.body.pos.x - b.pos.x, dz = w.body.pos.z - b.pos.z, d = Math.hypot(dx, dz);
    if (d < 1.0 && Math.abs(w.body.pos.y - b.pos.y) < 0.9 && w.invuln <= 0 && w.pounceT <= 0 && this.hitCD <= 0 && g.state === 'play') {
      sfx.pinch();
      w.hitBy(b.pos, 1.0);
      g.stats.dogHits++;
      this.hitCD = 2;
      this.pause = 1.5;
    }
    const r = this.rig;
    r.root.position.copy(b.pos);
    r.root.rotation.y = 0;
    r.inner.position.y = Math.abs(Math.sin(this.t * 14)) * 0.05 * (Math.abs(b.vel.x) > 0.5 ? 1 : 0);
    r.inner.rotation.z = Math.sin(this.t * 14) * 0.05 * (Math.abs(b.vel.x) > 0.5 ? 1 : 0);
    for (const c of r.claws) c.children[1].rotation.x = -Math.abs(Math.sin(this.t * 7)) * 0.6;
  }
}

class Power {
  constructor(game, kind, p) {
    this.game = game;
    this.kind = kind;
    this.pos = new THREE.Vector3(p.x, p.y, p.z);
    this.life = 16;
    this.t = 0;
    this.rig = buildPower(kind);
    this.rig.root.position.copy(this.pos);
    game.scene.add(this.rig.root);
    this.ringT = 0;
  }
  remove() { this.game.scene.remove(this.rig.root); this.dead = true; }
  update(dt) {
    const g = this.game;
    this.t += dt;
    this.life -= dt;
    const s = this.rig.spin;
    s.rotation.y += dt * 2.6;
    s.position.y = 1.0 + Math.sin(this.t * 3) * 0.15;
    const pop = Math.min(1, this.t * 3);
    s.scale.setScalar(pop * (1 + Math.sin(this.t * 6) * 0.05));
    this.rig.root.visible = this.life > 3 || Math.floor(this.t * 8) % 2 === 0;
    this.ringT -= dt;
    if (this.ringT <= 0) { this.ringT = 1.1; g.rings.spawn(this.pos.x, this.pos.y, this.pos.z, { color: 0xffffff, from: 0.4, to: 1.4, dur: 1, opacity: 0.6 }); }
    if (this.life <= 0) { this.remove(); return; }
    const w = g.wolf.body.pos;
    if (Math.hypot(w.x - this.pos.x, w.z - this.pos.z) < 1.1 && Math.abs(w.y - this.pos.y) < 1.7) {
      g.applyPower(this.kind, this.pos);
      this.remove();
    }
  }
}

// ================================================================ GAME
export class Game {
  constructor(scene, camera, hooks) {
    this.scene = scene;
    this.camera = camera;
    this.hooks = hooks;
    this.fx = new Particles(scene);
    this.shadows = new Shadows(scene);
    this.rings = new Rings(scene);
    this.icons = new Icons(scene);
    this.wolf = new Wolf(this);
    this.cats = [];
    this.dogs = [];
    this.crabs = [];
    this.powers = [];
    this.state = 'idle';
    this.mode = 'menu';
    this.inp = { mx: 0, mz: 0, jump: false, pounce: false, howl: false };
    this.cam = { pos: new THREE.Vector3(20, 20, 40), look: new THREE.Vector3(20, 0, 20), shake: 0, orbit: 0 };
    this.t = 0;
    this.clock = 0;
    this.lastCatchT = -9;
    this.menuFocus = false;
  }
  dustColor() {
    const th = this.world && this.world.themeName;
    return th === 'beach' ? [0xf6e0a2, 0xe8cf8a] : th === 'snow' ? [0xffffff, 0xe3edf9] : [0xd9c29a, 0xc2a47a];
  }
  clearEntities() {
    for (const c of this.cats) if (!c.dead) c.remove();
    for (const d of this.dogs) d.remove();
    for (const c of this.crabs) c.remove();
    for (const p of this.powers) if (!p.dead) p.remove();
    this.cats = []; this.dogs = []; this.crabs = []; this.powers = [];
    this.fx.clear(); this.rings.clear(); this.icons.clear();
  }
  load(li, mode) {
    this.clearEntities();
    if (this.world) { this.scene.remove(this.world.group); this.world.dispose(); }
    const L = LEVELS[li];
    this.L = L; this.li = li; this.mode = mode;
    this.world = generateWorld(L.theme, L.seed);
    this.scene.add(this.world.group);
    this.hooks.onTheme && this.hooks.onTheme(this.world.theme);
    const ws = this.world.marks.wolfStart;
    this.wolf.reset();
    this.wolf.place(ws.x, ws.z);
    this.score = 0; this.count = 0; this.combo = 0; this.lastCatch = -9; this.clock = 0;
    this.timeLeft = mode === 'level' ? L.time : Infinity;
    this.lastTick = 99;
    this.caughtBy = {};
    this.stats = { dogHits: 0, pounces: 0, howls: 0, jumps: 0 };
    this.missionDone = [false, false];
    this.howlCatch = 0;
    this.nextPower = mode === 'menu' ? 1e9 : 7;
    this.goldenQ = mode === 'level' ? [...L.golden] : [];
    this.nextGoldFree = 40;
    this.respawnQ = [];
    this.boss = null;
    this.maxCats = mode === 'menu' ? 7 : L.maxCats;
    this.mix = mode === 'menu' ? { oren: 3, abu: 1, belang: 1, gendut: 1 } : L.mix;
    for (let i = 0; i < this.maxCats; i++) this.spawnCat(weighted(this.mix), 6, true);
    if (L.boss && mode !== 'menu') {
      const bs = this.world.marks.bossStart;
      this.boss = this.addCat('raja', bs.x, bs.z);
    }
    if (mode !== 'menu') {
      const routes = this.world.marks.dogRoutes;
      for (let i = 0; i < L.dogs && routes.length; i++) this.dogs.push(new Dog(this, L.theme === 'snow' ? 'husky' : 'coklat', routes[i % routes.length]));
      this.world.marks.crabs.slice(0, L.crabs).forEach((p) => this.crabs.push(new Crab(this, p.x, p.z)));
    }
    this.state = mode === 'menu' ? 'menu' : 'intro';
    this.tut = mode === 'level' && L.tutorial ? { step: 0, t: 0 } : null;
    setTempo(1);
    this.snapCamera();
  }
  begin() {
    this.state = 'play';
    this.clock = 0;
    this.wolf.moved = 0;
    if (this.tut) this.tutStep(0);
    else this.hooks.onHint && this.hooks.onHint(null);
  }
  pause(on) {
    if (on && this.state === 'play') this.state = 'paused';
    else if (!on && this.state === 'paused') this.state = 'play';
  }
  addCat(id, x, z, extra) {
    const c = new Cat(this, id, x, z, extra);
    this.cats.push(c);
    return c;
  }
  spawnCat(id, minDist, silent) {
    const p = this.randomSpawn(minDist);
    const c = this.addCat(id, p.x, p.z);
    if (!silent) this.fx.emit(p.x, p.y + 0.4, p.z, { n: 10, color: 0xffffff, speed: 2.5, up: 2, life: 0.5, size: 0.25, grav: 0 });
    return c;
  }
  randomSpawn(minDist = 8) {
    const S = this.world.spawns, w = this.wolf.body.pos;
    let s = null;
    for (let i = 0; i < 50; i++) {
      s = S[Math.floor(Math.random() * S.length)];
      if (Math.hypot(s.x + 0.5 - w.x, s.z + 0.5 - w.z) >= minDist) break;
    }
    return { x: s.x + 0.5, y: this.world.col[this.world.I(s.x, s.z)], z: s.z + 0.5 };
  }
  nearbyPoint(pos, r) {
    const w = this.world;
    for (let i = 0; i < 12; i++) {
      const x = pos.x + (Math.random() * 2 - 1) * r, z = pos.z + (Math.random() * 2 - 1) * r;
      const ix = Math.floor(x), iz = Math.floor(z);
      if (!w.inb(ix, iz) || ix < 1 || iz < 1 || ix > w.W - 2 || iz > w.D - 2) continue;
      if (w.flag[w.I(ix, iz)] & WATER) continue;
      if (w.colC(ix, iz) > pos.y + 0.6) continue;
      return { x: ix + 0.5, z: iz + 0.5 };
    }
    return null;
  }
  nearestCat(pos, maxD = 1e9) {
    let best = null, bd = maxD;
    for (const c of this.cats) {
      if (c.state === 'caught') continue;
      const d = Math.hypot(c.body.pos.x - pos.x, c.body.pos.z - pos.z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  pounceTarget(pos, dx, dz) {
    let best = null, bs = -1;
    for (const c of this.cats) {
      if (c.state === 'caught') continue;
      const ex = c.body.pos.x - pos.x, ez = c.body.pos.z - pos.z, d = Math.hypot(ex, ez);
      if (d > 5.5 || d < 0.01) continue;
      const dot = (ex * dx + ez * dz) / d;
      if (dot < 0.45) continue;
      const score = dot * 2 - d / 5.5;
      if (score > bs) { bs = score; best = c; }
    }
    return best;
  }
  shake(a) { this.cam.shake = Math.max(this.cam.shake, a); }
  floatText(pos, text, cls) { this.hooks.onFloat && this.hooks.onFloat(pos, text, cls); }
  activeCats() { return this.cats.filter((c) => c.state !== 'caught' && !c.T.gold && !c.T.boss && !c.extra).length; }

  howl() {
    const w = this.wolf, p = w.body.pos;
    w.howlMeter = 0;
    w.howlT = 1.4;
    this.howlCatch = 0;
    this.stats.howls++;
    sfx.howl();
    this.rings.spawn(p.x, p.y, p.z, { color: 0xc8b6ff, from: 1, to: 15, dur: 1.1, opacity: 0.9 });
    this.rings.spawn(p.x, p.y + 0.4, p.z, { color: 0xffffff, from: 0.5, to: 11, dur: 1.4, opacity: 0.7 });
    this.shake(0.35);
    for (const c of this.cats) {
      if (c.state === 'caught') continue;
      if (Math.hypot(c.body.pos.x - p.x, c.body.pos.z - p.z) < 14) {
        c.freeze = c.T.boss ? 2.2 : 3.6;
        c.state = 'wander';
        this.icons.show('!!', c, { h: c.rig.height + 0.35, dur: 1.2, size: c.T.boss ? 1.2 : 0.8 });
      }
    }
    for (const d of [...this.dogs, ...this.crabs]) if (Math.hypot(d.body.pos.x - p.x, d.body.pos.z - p.z) < 14) d.scare();
    this.hooks.onHowl && this.hooks.onHowl();
  }
  bump(c) {
    c.bumpCD = 0.9;
    const w = this.wolf.body;
    const dx = w.pos.x - c.body.pos.x, dz = w.pos.z - c.body.pos.z, d = Math.hypot(dx, dz) || 1;
    w.vel.x = (dx / d) * 7; w.vel.z = (dz / d) * 7; w.vel.y = 4; w.onGround = false;
    sfx.hmph();
    this.icons.show('?', c, { h: c.rig.height + 0.35, dur: 0.9, size: c.T.boss ? 1.2 : 0.75 });
    if (this.mode !== 'menu') this.floatText(c.body.pos, 'Pakai TERKAM!', 'hint');
    this.shake(0.15);
  }
  bossHit(c) {
    c.hitCD = 0.8;
    c.hp--;
    const w = this.wolf;
    w.pounceT = 0;
    if (c.hp <= 0) return this.catchCat(c);
    const dx = c.body.pos.x - w.body.pos.x, dz = c.body.pos.z - w.body.pos.z, d = Math.hypot(dx, dz) || 1;
    c.body.vel.set((dx / d) * 9, 7, (dz / d) * 9);
    c.body.onGround = false;
    w.body.vel.x = -(dx / d) * 5; w.body.vel.z = -(dz / d) * 5;
    c.flash = 0.4;
    c.freeze = 0;
    sfx.bossHit();
    this.shake(0.45);
    this.fx.emit(c.body.pos.x, c.body.pos.y + 1.5, c.body.pos.z, { n: 16, color: [0xffd60a, 0xffffff], speed: 5, up: 4, life: 0.7, size: 0.22 });
    this.floatText(c.body.pos, c.hp === 2 ? 'AUW! 2 lagi!' : 'AUW! 1 lagi!', 'big');
    for (let k = 0; k < 2; k++) {
      const a = Math.random() * Math.PI * 2;
      const x = clamp(c.body.pos.x + Math.sin(a) * 1.5, 1.5, this.world.W - 1.5), z = clamp(c.body.pos.z + Math.cos(a) * 1.5, 1.5, this.world.D - 1.5);
      if (this.world.colAt(x, z) > c.body.pos.y + 0.6) continue;
      const kit = this.addCat('oren', x, z, true);
      kit.body.pos.y = c.body.pos.y;
      this.fx.emit(x, c.body.pos.y + 0.4, z, { n: 8, color: 0xffffff, speed: 2, up: 2, life: 0.4, size: 0.2 });
    }
  }
  catchCat(c) {
    c.state = 'caught';
    c.caughtT = 0;
    const w = this.wolf, p = c.body.pos;
    this.lastCatchT = this.t;
    this.fx.emit(p.x, p.y + 0.5, p.z, { n: 14, color: [0xff4d8d, 0xff85b3, 0xffffff], speed: 3.5, up: 4, life: 0.8, size: 0.2 });
    this.icons.show('heart', p.clone(), { h: c.rig.height, dur: 0.9, size: 0.7, float: 1.5 });
    if (this.mode === 'menu') {
      this.respawnQ.push(this.t + 2);
      return;
    }
    this.combo = this.t - this.lastCatch < 3.0 ? this.combo + 1 : 1;
    this.lastCatch = this.t;
    const pts = c.T.value * (w.double > 0 ? 2 : 1);
    const bonus = Math.min(3, Math.max(0, this.combo - 1));
    this.score += pts + bonus;
    this.count++;
    this.caughtBy[c.id] = (this.caughtBy[c.id] || 0) + 1;
    save.album[c.id] = (save.album[c.id] || 0) + 1;
    save.total++;
    const was = w.howlMeter;
    w.howlMeter = Math.min(1, w.howlMeter + (c.T.boss ? 1 : 0.2));
    if (was < 1 && w.howlMeter >= 1) this.hooks.onHowlReady && this.hooks.onHowlReady();
    this.floatText(p, '+' + (pts + bonus), c.T.value >= 3 || pts + bonus >= 4 ? 'big' : 'pts');
    if (this.combo >= 2) this.hooks.onCombo && this.hooks.onCombo(this.combo);
    sfx.meow(c.T.pitch);
    sfx.catch(this.combo);
    this.shake(c.T.boss ? 0.7 : 0.12);
    if (navigator.vibrate) try { navigator.vibrate(c.T.boss ? 200 : 25); } catch (e) {}
    const frozen = c.freeze > 0;
    if (frozen) this.howlCatch++;
    this.checkMission('combo3', this.combo >= 3);
    this.checkMission('combo5', this.combo >= 5);
    this.checkMission('air', !w.body.onGround);
    this.checkMission('roof', w.body.pos.y >= 2.5);
    this.checkMission('ninja2', (this.caughtBy.ninja || 0) >= 2);
    this.checkMission('howl3', this.howlCatch >= 3);
    this.checkMission('gold', !!c.T.gold);
    this.checkMission('fat3', (this.caughtBy.gendut || 0) >= 3);
    this.checkMission('boss', !!c.T.boss);
    if (c.T.boss) {
      this.hooks.onBanner && this.hooks.onBanner('RAJA KUCING TERTANGKAP!', 'gold');
      for (let k = 0; k < 4; k++) this.fx.emit(p.x, p.y + 2, p.z, { n: 30, color: [0xff4d8d, 0xffd60a, 0x4cc9f0, 0x06d6a0, 0xffffff], speed: 7, up: 9, life: 1.6, size: 0.22, grav: 9 });
    } else if (!c.T.gold && !c.extra) this.respawnQ.push(this.t + 1.2);
    if (this.tut && this.tut.step === 1) this.tutStep(2);
  }
  catEscaped(c) {
    const p = c.body.pos;
    this.fx.emit(p.x, p.y + 0.4, p.z, { n: 16, color: [0xffd60a, 0xffffff], speed: 3, up: 3, life: 0.7, size: 0.25, grav: -1 });
    sfx.poof();
    this.floatText(p, 'Kabur!', 'poof');
    c.remove();
  }
  checkMission(id, cond) {
    if (this.mode !== 'level' || !cond) return;
    const i = this.L.missions.findIndex((m) => m.id === id);
    if (i < 0 || this.missionDone[i]) return;
    this.missionDone[i] = true;
    sfx.medal();
    this.hooks.onMission && this.hooks.onMission(this.L.missions[i]);
  }
  applyPower(kind, pos) {
    const w = this.wolf, P = POWERS[kind];
    if (kind === 'tulang') w.boost = P.dur;
    else if (kind === 'ikan') w.magnet = P.dur;
    else if (kind === 'bintang') w.double = P.dur;
    else if (kind === 'jam') this.timeLeft += 10;
    sfx.power();
    this.rings.spawn(pos.x, pos.y, pos.z, { color: 0xffd60a, from: 0.5, to: 4, dur: 0.6 });
    this.fx.emit(pos.x, pos.y + 1, pos.z, { n: 16, color: [0xffd60a, 0xffffff, 0x4cc9f0], speed: 4, up: 4, life: 0.7, size: 0.18 });
    this.floatText(pos, P.name, 'power');
  }
  spawnGold() {
    const p = this.randomSpawn(12);
    const c = this.addCat('emas', p.x, p.z);
    this.fx.emit(p.x, p.y + 0.6, p.z, { n: 24, color: [0xffd60a, 0xffffff], speed: 4, up: 4, life: 0.8, size: 0.2 });
    sfx.sparkle();
    this.hooks.onBanner && this.hooks.onBanner('KUCING EMAS MUNCUL!', 'gold');
    return c;
  }
  tutStep(n) {
    if (!this.tut) return;
    this.tut.step = n;
    this.tut.t = 0;
    const H = this.hooks.tutText;
    this.hooks.onHint && this.hooks.onHint(H ? H(n) : null);
    if (n >= 5) this.tut = null;
  }
  updateTutorial(dt) {
    const T = this.tut;
    if (!T) return;
    T.t += dt;
    const w = this.wolf;
    if (T.step === 0) { if (w.moved > 5) this.tutStep(1); }
    else if (T.step === 2 && (this.stats.jumps > 0 || T.t > 7)) this.tutStep(3);
    else if (T.step === 3 && (this.stats.pounces > 0 || T.t > 9)) this.tutStep(4);
    else if (T.step === 4 && T.t > 3) { this.hooks.onHint && this.hooks.onHint(null); if (w.howlMeter >= 1) this.tutStep(5); }
  }
  finish() {
    if (this.state !== 'play') return;
    this.state = 'result';
    const L = this.L, li = this.li;
    let stars = 0;
    L.stars.forEach((s, i) => { if (this.score >= s) stars = i + 1; });
    const ndi = L.missions.findIndex((m) => m.id === 'nodog');
    if (ndi >= 0 && this.stats.dogHits === 0 && stars >= 1) this.missionDone[ndi] = true;
    const rec = save.levels[li];
    const newBest = this.score > rec.best;
    rec.best = Math.max(rec.best, this.score);
    const prevStars = rec.stars;
    rec.stars = Math.max(rec.stars, stars);
    rec.medals = rec.medals.map((m, i) => m || this.missionDone[i]);
    let unlockedNext = false;
    if (stars >= 1 && li + 1 < LEVELS.length && save.unlocked < li + 2) { save.unlocked = li + 2; unlockedNext = true; }
    if (L.tutorial) save.tutorialDone = true;
    persist();
    setTempo(1);
    this.hooks.onEnd({ stars, prevStars, score: this.score, count: this.count, caughtBy: { ...this.caughtBy }, missions: [...this.missionDone], newBest, unlockedNext, li, mode: 'level' });
  }
  quitFree() {
    persist();
    this.state = 'result';
    this.hooks.onEnd({ stars: 0, score: this.score, count: this.count, caughtBy: { ...this.caughtBy }, missions: [], li: this.li, mode: 'free' });
  }
  aiInput(dt) {
    const w = this.wolf, inp = this.inp;
    inp.mx = inp.mz = 0;
    if (this.menuFocus) return;
    this.aiT = (this.aiT || 0) - dt;
    if (!this.aiTarget || this.aiTarget.state === 'caught' || this.aiTarget.dead || this.aiT <= 0) {
      this.aiTarget = this.nearestCat(w.body.pos);
      this.aiT = 4;
    }
    const t = this.aiTarget;
    if (!t) return;
    const dx = t.body.pos.x - w.body.pos.x, dz = t.body.pos.z - w.body.pos.z, d = Math.hypot(dx, dz) || 1;
    const dir = steer(this.world, w.body, dx / d, dz / d, 1, 1.2);
    inp.mx = dir.x * 0.85;
    inp.mz = dir.z * 0.85;
    const sp = Math.hypot(w.body.vel.x, w.body.vel.z);
    if (d < 3.2 && w.pounceCD <= 0 && Math.random() < 0.03) inp.pounce = true;
    if (w.body.onGround && sp < 1.5 && Math.random() < 0.05) inp.jump = true;
  }
  snapCamera() {
    const c = this.cam;
    if (this.state === 'intro') {
      c.look.set(this.world.W / 2, 0, this.world.D / 2);
      c.pos.set(this.world.W / 2, 34, this.world.D / 2 + 30);
    } else {
      const w = this.wolf.body.pos;
      c.look.set(w.x, w.y + 0.5, w.z);
      c.pos.set(w.x + 10, w.y + 7, w.z + 10);
    }
  }
  updateCamera(dt) {
    const cam = this.camera, c = this.cam, w = this.wolf.body;
    const portrait = cam.aspect < 1;
    const P = new THREE.Vector3(), L = new THREE.Vector3();
    let lam = 4;
    if (this.state === 'menu') {
      if (this.menuFocus) {
        this.wolf.body.yaw += dt * 0.7;
        this.wolf.targetYaw = this.wolf.body.yaw;
        L.set(w.pos.x + (portrait ? 0 : -0.9), w.pos.y + (portrait ? 1.3 : 0.9), w.pos.z);
        P.set(w.pos.x, w.pos.y + (portrait ? 2.6 : 2.1), w.pos.z + (portrait ? 6.4 : 4.6));
        lam = 3;
      } else {
        c.orbit += dt * 0.1;
        const R = portrait ? 14 : 11;
        L.set(w.pos.x, w.pos.y + (portrait ? 2.5 : 0.6), w.pos.z);
        P.set(w.pos.x + Math.sin(c.orbit) * R, w.pos.y + (portrait ? 13 : 7.5), w.pos.z + Math.cos(c.orbit) * R);
        lam = 2;
      }
    } else if (this.state === 'intro') {
      L.set(this.world.W / 2, 0, this.world.D / 2);
      P.set(this.world.W / 2 + Math.sin(this.t * 0.2) * 6, 34, this.world.D / 2 + 30);
      lam = 1.5;
    } else {
      const H = portrait ? 16 : 11.5, Dz = portrait ? 12.5 : 10;
      L.set(w.pos.x + w.vel.x * 0.22, Math.max(0, w.pos.y) * 0.7 + 0.5, w.pos.z + w.vel.z * 0.22);
      P.set(L.x, L.y + H, L.z + Dz);
      lam = this.state === 'countdown' ? 2.5 : 5;
    }
    c.pos.x = damp(c.pos.x, P.x, lam, dt); c.pos.y = damp(c.pos.y, P.y, lam, dt); c.pos.z = damp(c.pos.z, P.z, lam, dt);
    c.look.x = damp(c.look.x, L.x, lam * 1.4, dt); c.look.y = damp(c.look.y, L.y, lam * 1.4, dt); c.look.z = damp(c.look.z, L.z, lam * 1.4, dt);
    c.shake = Math.max(0, c.shake - dt * 1.6);
    const s = c.shake * c.shake * 0.8;
    cam.position.set(c.pos.x + (Math.random() - 0.5) * s, c.pos.y + (Math.random() - 0.5) * s, c.pos.z + (Math.random() - 0.5) * s);
    cam.lookAt(c.look);
  }
  update(dt) {
    if (!this.world) return;
    this.t += dt;
    if (this.state === 'paused') { this.updateCamera(0); return; }
    const playing = this.state === 'play';
    const active = playing || this.state === 'menu';
    if (this.mode === 'menu') this.aiInput(dt);
    if (playing) {
      this.clock += dt;
      if (this.mode === 'level') {
        this.timeLeft -= dt;
        const sec = Math.ceil(this.timeLeft);
        if (sec <= 10 && sec !== this.lastTick && sec > 0) { this.lastTick = sec; sfx.tick(); }
        setTempo(this.timeLeft < 15 ? 1.18 : 1);
        if (this.timeLeft <= 0) { this.timeLeft = 0; this.finish(); }
      }
      if (this.goldenQ.length && this.clock >= this.goldenQ[0]) { this.goldenQ.shift(); this.spawnGold(); }
      if (this.mode === 'free' && this.clock >= this.nextGoldFree) { this.nextGoldFree += 55; this.spawnGold(); }
      if (this.clock >= this.nextPower) {
        this.nextPower = this.clock + rand(10, 15);
        const kinds = this.L.powers.filter((k) => this.mode === 'level' || k !== 'jam');
        if (this.powers.filter((p) => !p.dead).length < 2 && kinds.length) this.powers.push(new Power(this, kinds[Math.floor(Math.random() * kinds.length)], this.randomSpawn(6)));
      }
      this.updateTutorial(dt);
    }
    while (this.respawnQ.length && this.t >= this.respawnQ[0]) {
      this.respawnQ.shift();
      if (this.activeCats() < this.maxCats) this.spawnCat(weighted(this.mix), 9);
    }
    this.wolf.update(dt, active ? this.inp : ZERO);
    for (const c of this.cats) c.update(dt);
    this.cats = this.cats.filter((c) => !c.dead);
    for (const d of this.dogs) d.update(dt);
    for (const c of this.crabs) c.update(dt);
    for (const p of this.powers) if (!p.dead) p.update(dt);
    this.powers = this.powers.filter((p) => !p.dead);
    if (active) this.checkCatches();
    this.fx.update(dt);
    this.rings.update(dt);
    this.icons.update(dt);
    // shadows
    const S = this.shadows, W = this.world;
    S.begin();
    const sh = (b, size) => {
      const g = groundUnder(W, b.pos.x, b.pos.z, b.r);
      const k = clamp(1 - (b.pos.y - g) / 5, 0.3, 1);
      S.add(b.pos.x, Math.max(g, b.inWater ? -0.14 : g), b.pos.z, size * k);
    };
    sh(this.wolf.body, 1.5);
    for (const c of this.cats) if (c.state !== 'caught') sh(c.body, c.T.boss ? 2.6 : c.T.fat ? 1.3 : 0.95);
    for (const d of this.dogs) sh(d.body, 1.3);
    for (const c of this.crabs) sh(c.body, 1.2);
    for (const p of this.powers) S.add(p.pos.x, p.pos.y, p.pos.z, 0.9);
    S.end();
    SEA_TEX.offset.x += dt * 0.04;
    SEA_TEX.offset.y += dt * 0.02;
    if (W.waterMesh) W.waterMesh.position.y = Math.sin(this.t * 1.5) * 0.03;
    this.updateCamera(dt);
  }
  checkCatches() {
    const w = this.wolf, wp = w.body.pos;
    if (w.stun > 0) return;
    for (const c of this.cats) {
      if (c.state === 'caught') continue;
      const cp = c.body.pos;
      const dx = cp.x - wp.x, dz = cp.z - wp.z, dy = cp.y - wp.y;
      const d = Math.hypot(dx, dz);
      const pouncing = w.pounceT > 0;
      const reach = (pouncing ? 1.5 : 1.0) + c.body.r * (c.T.boss ? 1.3 : 0.6);
      if (d < reach && dy > -1.3 && dy < (c.T.boss ? 2.6 : 1.4)) {
        if (c.T.boss) {
          if (pouncing && c.hitCD <= 0) this.bossHit(c);
          else if (!pouncing && c.bumpCD <= 0) this.bump(c);
        } else if (c.T.fat && !pouncing) {
          if (c.bumpCD <= 0) this.bump(c);
        } else this.catchCat(c);
      }
    }
  }
}

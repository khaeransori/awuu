import { chromium } from 'playwright';
import path from 'path';

const file = 'file://' + path.resolve('dist/awuu.html');
const shots = process.env.SHOTS || 'test-shots';
import fs from 'fs';
fs.mkdirSync(shots, { recursive: true });

const vw = +(process.env.VW || 844), vh = +(process.env.VH || 390);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + e.stack));
await page.goto(file);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${shots}/01-title.png` });

const level = +(process.env.LEVEL || 0);
// tap to start + play
await page.evaluate(() => document.getElementById('btnPlay').click());
await page.waitForTimeout(500);
await page.screenshot({ path: `${shots}/02-levels.png` });
if (level > 0) await page.evaluate(() => { window.__awuu.save.unlocked = 5; });
await page.evaluate((l) => { document.getElementById('btnPlay').click(); }, level);
await page.waitForTimeout(300);
await page.evaluate((l) => document.querySelectorAll('.lcard')[l].click(), level);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${shots}/03-intro.png` });
await page.evaluate(() => document.getElementById('btnStart').click());
await page.waitForTimeout(3200);
await page.screenshot({ path: `${shots}/04-play.png` });
// drive the wolf toward cats using the game's own AI helper for a while
const t0 = Date.now();
let i = 0;
while (Date.now() - t0 < 14000) {
  await page.evaluate(() => {
    const g = window.__awuu.game;
    const w = g.wolf.body.pos;
    const c = g.nearestCat(w);
    if (!c) return;
    const dx = c.body.pos.x - w.x, dz = c.body.pos.z - w.z, d = Math.hypot(dx, dz) || 1;
    g.inp.mx = dx / d; g.inp.mz = dz / d;
    if (d < 3 && Math.random() < 0.3) g.inp.pounce = true;
    if (Math.random() < 0.05) g.inp.jump = true;
  });
  await page.waitForTimeout(150);
  if (++i === 40) await page.screenshot({ path: `${shots}/05-play2.png` });
}
const st = await page.evaluate(() => {
  const g = window.__awuu.game;
  return { state: g.state, score: g.score, count: g.count, time: g.timeLeft, cats: g.cats.length, wolf: g.wolf.body.pos.toArray().map((v) => +v.toFixed(2)), howl: g.wolf.howlMeter };
});
console.log('STATE', JSON.stringify(st));
await page.evaluate(() => { const g = window.__awuu.game; g.wolf.howlMeter = 1; g.inp.howl = true; });
await page.waitForTimeout(400);
await page.screenshot({ path: `${shots}/06-howl.png` });
// finish quickly
await page.evaluate(() => { window.__awuu.game.timeLeft = 0.2; });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${shots}/07-result.png` });
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t = performance.now(); function f() { n++; if (performance.now() - t < 2000) requestAnimationFrame(f); else res(n / 2); } requestAnimationFrame(f); }));
console.log('FPS (swiftshader)', fps);
console.log('ERRORS', errors.length ? [...new Set(errors)].slice(0,15).map(e=>e.slice(0,400)).join('\n') : 'none');
await browser.close();

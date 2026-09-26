import { chromium } from 'playwright';
import path from 'path';
const file = 'file://' + path.resolve('dist/awuu.html');
const shots = process.env.SHOTS || 'test-shots';
import('fs').then((fs) => fs.mkdirSync(shots, { recursive: true }));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
await page.goto(file);
await page.waitForTimeout(1500);
await page.evaluate(() => { window.__awuu.save.unlocked = 5; document.getElementById('btnPlay').click(); });
await page.waitForTimeout(200);
await page.evaluate(() => document.querySelectorAll('.lcard')[4].click());
await page.waitForTimeout(800);
await page.evaluate(() => document.getElementById('btnStart').click());
await page.waitForTimeout(3300);
const info = await page.evaluate(() => { const g = window.__awuu.game; return { boss: !!g.boss, bossPos: g.boss && g.boss.body.pos.toArray() }; });
console.log('BOSS', JSON.stringify(info));
for (let hit = 0; hit < 4; hit++) {
  await page.evaluate(() => {
    const g = window.__awuu.game, b = g.boss, w = g.wolf;
    if (!b || b.state === 'caught') return;
    b.freeze = 3; // hold still for the test
    w.body.pos.set(b.body.pos.x, b.body.pos.y, b.body.pos.z + 2.2);
    w.body.yaw = Math.PI; w.pounceCD = 0;
    g.inp.mx = 0; g.inp.mz = -1; g.inp.pounce = true;
  });
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => { const g = window.__awuu.game; return { hp: g.boss.hp, st: g.boss.state, score: g.score, cats: g.cats.length }; });
  console.log('after pounce', hit, JSON.stringify(s));
  if (hit === 0) await page.screenshot({ path: `${shots}/boss-hit.png` });
  await page.waitForTimeout(900);
}
await page.evaluate(() => { window.__awuu.game.inp.mz = 0; });
await page.screenshot({ path: `${shots}/boss-caught.png` });
const ri = await page.evaluate(() => { const r = window.__awuu; return null; });
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();

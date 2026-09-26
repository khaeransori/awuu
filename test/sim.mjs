import { chromium } from 'playwright';
import path from 'path';
const file = 'file://' + path.resolve('dist/awuu.html');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 240 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
await page.goto(file);
await page.waitForTimeout(1500);
const runs = +(process.env.RUNS || 2);
for (let li = 0; li < 5; li++) {
  const res = await page.evaluate(([li, runs]) => {
    const g = window.__awuu.game;
    const out = [];
    for (let r = 0; r < runs; r++) {
      g.load(li, 'level');
      g.begin();
      const dt = 1 / 60;
      let stuckT = 0, lastPos = g.wolf.body.pos.clone(), react = 0, target = null;
      let steps = 0;
      while (g.state === 'play' && steps < 60 * 200) {
        steps++;
        const w = g.wolf.body.pos;
        react -= dt;
        if (react <= 0 || !target || target.state === 'caught' || target.dead) {
          target = g.nearestCat(w);
          react = 0.35; // human-ish re-target delay
        }
        if (target) {
          const dx = target.body.pos.x - w.x, dz = target.body.pos.z - w.z, d = Math.hypot(dx, dz) || 1;
          g.inp.mx = dx / d; g.inp.mz = dz / d;
          if (d < 3.5 && Math.random() < 0.05) g.inp.pounce = true;
          if (target.body.pos.y > w.y + 0.5 && d < 3) g.inp.jump = true;
        }
        if (g.wolf.howlMeter >= 1 && Math.random() < 0.02) g.inp.howl = true;
        stuckT += dt;
        if (stuckT > 0.5) {
          if (lastPos.distanceTo(w) < 0.5) g.inp.jump = true;
          lastPos.copy(w);
          stuckT = 0;
        }
        g.update(dt);
      }
      out.push({ pos: g.wolf.body.pos.toArray().map(v=>+v.toFixed(1)), score: g.score, count: g.count, by: g.caughtBy, missions: g.missionDone, dogHits: g.stats.dogHits });
    }
    return out;
  }, [li, runs]);
  console.log('L' + (li + 1), JSON.stringify(res));
}
console.log(errors.length ? errors.slice(0, 5).join('\n') : 'no errors');
await browser.close();

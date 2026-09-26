import { chromium } from 'playwright';
import path from 'path';
const file = 'file://' + path.resolve('dist/awuu.html');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
await page.goto(file);
await page.waitForTimeout(1500);
for (let li = 0; li < 5; li++) {
  const r = await page.evaluate((li) => {
    const { game, renderer } = window.__awuu;
    game.load(li, 'level'); game.begin();
    for (let i = 0; i < 30; i++) game.update(1 / 60);
    renderer.info.autoReset = true;
    renderer.render(game.scene, game.camera);
    const t0 = performance.now();
    for (let i = 0; i < 300; i++) game.update(1 / 60);
    const upd = (performance.now() - t0) / 300;
    return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, updMs: +upd.toFixed(2) };
  }, li);
  console.log('L' + (li + 1), JSON.stringify(r));
}
await browser.close();

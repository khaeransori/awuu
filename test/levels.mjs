import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const file = 'file://' + path.resolve('dist/awuu.html');
const shots = process.env.SHOTS || 'test-shots';
fs.mkdirSync(shots, { recursive: true });
const vw = +(process.env.VW || 844), vh = +(process.env.VH || 390);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: vw, height: vh }, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(file);
await page.waitForTimeout(1500);
const levels = (process.env.LEVELS || '1,2,3,4').split(',').map(Number);
for (const li of levels) {
  await page.evaluate((li) => {
    const a = window.__awuu;
    a.save.unlocked = 5;
    document.getElementById('btnPlay').click();
  }, li);
  await page.waitForTimeout(200);
  await page.evaluate((li) => document.querySelectorAll('.lcard')[li].click(), li);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/L${li + 1}-a-intro.png` });
  await page.evaluate(() => document.getElementById('btnStart').click());
  await page.waitForTimeout(3300);
  // wander a bit
  for (let k = 0; k < 25; k++) {
    await page.evaluate((k) => {
      const g = window.__awuu.game;
      const a = k * 0.35;
      g.inp.mx = Math.sin(a); g.inp.mz = -Math.cos(a) * 0.6;
    }, k);
    await page.waitForTimeout(120);
  }
  await page.screenshot({ path: `${shots}/L${li + 1}-b-play.png` });
  if (process.env.EXTRA) {
    await page.evaluate(process.env.EXTRA);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${shots}/L${li + 1}-c-extra.png` });
  }
  await page.evaluate(() => { const g = window.__awuu.game; g.inp.mx = g.inp.mz = 0; g.timeLeft = 0.1; });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('btnMenu').click());
  await page.waitForTimeout(600);
}
console.log(errors.length ? errors.slice(0, 8).join('\n') : 'no errors');
await browser.close();

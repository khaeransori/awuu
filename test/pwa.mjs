import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
const root = path.resolve('dist/pwa');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, s) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); s.end(d); } });
}).listen(8765);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
await page.goto('http://localhost:8765/');
await page.waitForTimeout(2500);
const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
console.log('SW active', sw);
// save some progress
await page.evaluate(() => { const a = window.__awuu; a.save.levels[0].stars = 2; a.save.unlocked = 2; localStorage.setItem('awuu-serigala-v1', JSON.stringify(a.save)); });
srv.close();
await ctx.setOffline(true);
await page.reload();
await page.waitForTimeout(2500);
const ok = await page.evaluate(() => ({ title: document.title, hasGame: !!window.__awuu, stars: window.__awuu && window.__awuu.save.levels[0].stars }));
console.log('OFFLINE reload', JSON.stringify(ok));
await browser.close();
process.exit(0);

// Builds an installable offline PWA folder + zip from dist/awuu.html
import fs from 'fs';
import { execSync } from 'child_process';
import sharp from 'sharp';
import { svgAny, svgMask } from './icon.mjs';

const dir = 'dist/pwa';
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });


await sharp(Buffer.from(svgAny)).resize(192, 192).png().toFile(`${dir}/icon-192.png`);
await sharp(Buffer.from(svgAny)).resize(512, 512).png().toFile(`${dir}/icon-512.png`);
await sharp(Buffer.from(svgMask)).resize(512, 512).png().toFile(`${dir}/icon-maskable.png`);
await sharp(Buffer.from(svgAny)).resize(180, 180).png().toFile(`${dir}/apple-touch-icon.png`);

const manifest = {
  name: 'Awuu! Serigala Tangkap Kucing',
  short_name: 'Awuu!',
  description: 'Game 3D kotak-kotak: serigala menangkap kucing sebanyak-banyaknya.',
  lang: 'id',
  start_url: './',
  scope: './',
  display: 'fullscreen',
  orientation: 'landscape',
  background_color: '#aee4ff',
  theme_color: '#aee4ff',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(`${dir}/manifest.webmanifest`, JSON.stringify(manifest, null, 2));

const version = 'awuu-' + Date.now().toString(36);
fs.writeFileSync(`${dir}/sw.js`, `const CACHE = '${version}';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('./index.html'))));
});
`);

let html = fs.readFileSync('dist/awuu.html', 'utf8');
html = html.replace('<!--PWA-->', `<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="icon-192.png">`);
html = html.replace('<!--SW-->', `<script>if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(function(){});</script>`);
fs.writeFileSync(`${dir}/index.html`, html);

fs.writeFileSync(`${dir}/CARA-PASANG.txt`, `AWUU! SERIGALA TANGKAP KUCING — versi aplikasi (PWA)

1. Upload SEMUA file di folder ini ke hosting statis HTTPS mana saja:
   - GitHub Pages, Netlify Drop (app.netlify.com/drop), Cloudflare Pages, atau subfolder di arktik.id
2. Buka alamatnya sekali di HP pakai Chrome (Android) atau Safari (iPhone) selagi ada internet.
3. Android: menu titik tiga > "Tambahkan ke Layar utama" / "Instal aplikasi".
   iPhone: tombol Bagikan > "Tambah ke Layar Utama".
4. Selesai. Ikon Awuu! muncul di layar HP, bisa dimainkan tanpa internet,
   dan progres (bintang, medali, skin) tersimpan.
`);

try { fs.rmSync('dist/awuu-pwa.zip'); } catch (e) {}
execSync(`cd ${dir} && zip -q -r ../awuu-pwa.zip .`);
console.log('pwa ok', fs.readdirSync(dir));

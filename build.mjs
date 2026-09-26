import * as esbuild from 'esbuild';
import fs from 'fs';
import { svgAny } from './icon.mjs';

const out = 'dist';
fs.mkdirSync(out, { recursive: true });

const res = await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: process.argv.includes('--dev') ? false : true,
  format: 'iife',
  target: ['es2022'],
  write: false,
  legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const font = (w) => fs.readFileSync(`node_modules/@fontsource/fredoka/files/fredoka-latin-${w}-normal.woff2`).toString('base64');
const fontCss = [500, 600, 700]
  .map((w) => `@font-face{font-family:'Fredoka';font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${font(w)}) format('woff2');}`)
  .join('');
const css = fs.readFileSync('src/style.css', 'utf8');
const body = fs.readFileSync('src/body.html', 'utf8');
const title = 'Awuu! Serigala Tangkap Kucing';

// Full standalone document (offline file / PWA)
const full = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#aee4ff">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Awuu!">
<!--PWA-->
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(svgAny)}">
<title>${title}</title>
<style>${fontCss}${css}</style>
</head>
<body>
${body}
<script>${js}</script>
<!--SW-->
</body>
</html>
`;
fs.writeFileSync(`${out}/awuu.html`, full);

// Artifact page (skeleton is added by the host)
const art = `<title>Awuu! Serigala</title>
<style>${fontCss}${css}</style>
${body}
<script>${js}</script>
`;
fs.writeFileSync(`${out}/awuu-artifact.html`, art);

console.log('js', (js.length / 1024).toFixed(0) + 'KB', 'full', (full.length / 1024).toFixed(0) + 'KB');

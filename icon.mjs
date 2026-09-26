// App icon (blocky wolf face) shared by the page favicon and the PWA icons.
const r = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const C = { fur: '#8d93a3', dark: '#5f6576', light: '#e8eaf0', eye: '#2a9df4', inner: '#f2a7b5' };
let face = '';
face += r(1.5, 0.5, 3.5, 5, C.fur) + r(11, 0.5, 3.5, 5, C.fur);
face += r(2.5, 2, 1.5, 3, C.inner) + r(12, 2, 1.5, 3, C.inner);
face += r(1, 4, 14, 10, C.fur) + r(4, 4, 8, 1.2, C.dark);
face += r(0, 9, 2, 4, C.light) + r(14, 9, 2, 4, C.light);
face += r(3, 7, 3.6, 3.2, '#fff') + r(9.4, 7, 3.6, 3.2, '#fff');
face += r(3.8, 7.6, 2.2, 2.6, C.eye) + r(10, 7.6, 2.2, 2.6, C.eye);
face += r(4.4, 8, 1, 1.8, '#111') + r(10.6, 8, 1, 1.8, '#111');
face += r(3.8, 7.6, 0.8, 0.8, '#fff') + r(10, 7.6, 0.8, 0.8, '#fff');
face += r(3, 6, 3.4, 0.7, C.dark) + r(9.6, 6, 3.4, 0.7, C.dark);
face += r(4.6, 10.5, 6.8, 3.5, C.light) + r(6.6, 10.6, 2.8, 1.6, '#2b2b2b');
face += `<rect x="1" y="4" width="14" height="10" fill="none" stroke="#1f2a44" stroke-width="0.8"/>`;
const icon = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">
<rect width="64" height="64" fill="#aee4ff"/>
<rect y="46" width="64" height="18" fill="#86d95f"/>
<g transform="translate(${8 + pad} ${6 + pad}) scale(${(48 - pad * 2) / 16})">${face}</g></svg>`;
export const svgAny = icon(0);
export const svgMask = icon(6);

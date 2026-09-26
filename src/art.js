// Small blocky SVG portraits used by the menus and the HUD.
import { CAT_TYPES } from './models.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const r = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;

export function catFace(id, locked = false) {
  const T = CAT_TYPES[id];
  const L = '#9aa3b5';
  const fur = locked ? L : hex(T.fur);
  const belly = locked ? '#b7bfce' : hex(T.belly);
  const eye = locked ? '#7c869a' : hex(T.eye);
  const stripe = T.stripe && !locked ? hex(T.stripe) : null;
  let s = '';
  if (T.boss && !locked) s += r(4, 0, 8, 2, '#ffc300') + r(4, -1, 1, 1, '#ffc300') + r(7.5, -1.2, 1, 1.2, '#ffc300') + r(11, -1, 1, 1, '#ffc300') + r(7.4, 0.4, 1.2, 1, '#e63946');
  s += r(1.5, 1.5, 3.5, 3.5, fur) + r(11, 1.5, 3.5, 3.5, fur);
  s += r(2.5, 2.5, 1.5, 2, locked ? '#b7bfce' : '#ffb3c6') + r(12, 2.5, 1.5, 2, locked ? '#b7bfce' : '#ffb3c6');
  s += r(1, 4, 14, 10.5, fur);
  if (stripe) s += r(6, 4, 1.2, 2, stripe) + r(8.8, 4, 1.2, 2, stripe) + r(7.4, 4, 1.2, 1.4, stripe);
  if (T.patches && !locked) s += r(1, 4, 5, 3, '#f08a24') + r(11, 4, 4, 2.6, '#2d2d2d');
  if (T.ninja && !locked) s += r(1, 5.2, 14, 1.6, '#e63946') + r(14.5, 5.4, 1.5, 0.8, '#e63946');
  if (locked) {
    s += `<text x="8" y="12.4" font-size="7.5" font-weight="700" text-anchor="middle" fill="#ffffff" font-family="Fredoka, sans-serif">?</text>`;
  } else {
    s += r(3, 7.2, 4, 4, '#ffffff') + r(9, 7.2, 4, 4, '#ffffff');
    s += r(4, 7.8, 2.4, 3.2, eye) + r(9.6, 7.8, 2.4, 3.2, eye);
    s += r(4.8, 8, 1, 2.8, '#111111') + r(10.4, 8, 1, 2.8, '#111111');
    s += r(4, 7.8, 0.9, 0.9, '#ffffff') + r(9.6, 7.8, 0.9, 0.9, '#ffffff');
    s += r(5, 11.4, 6, 3.1, belly) + r(7, 11.4, 2, 1, '#ff8fa3');
    s += r(0, 12, 3.2, 0.4, '#ffffff') + r(12.8, 12, 3.2, 0.4, '#ffffff') + r(0, 13.1, 3.2, 0.4, '#ffffff') + r(12.8, 13.1, 3.2, 0.4, '#ffffff');
  }
  const outline = `<rect x="1" y="4" width="14" height="10.5" fill="none" stroke="#1f2a44" stroke-width="0.8"/>`;
  return `<svg viewBox="-0.5 -1.5 17 17" shape-rendering="crispEdges" aria-hidden="true">${s}${outline}</svg>`;
}

export function wolfFace(skin, locked = false) {
  const c = (k) => (locked ? { fur: '#9aa3b5', dark: '#7c869a', light: '#c2c9d6', eye: '#7c869a', inner: '#b7bfce' }[k] : hex(skin[k]));
  let s = '';
  s += r(1.5, 0.5, 3.5, 5, c('fur')) + r(11, 0.5, 3.5, 5, c('fur'));
  s += r(2.5, 2, 1.5, 3, c('inner')) + r(12, 2, 1.5, 3, c('inner'));
  s += r(1, 4, 14, 10, c('fur'));
  s += r(4, 4, 8, 1.2, c('dark'));
  s += r(0, 9, 2, 4, c('light')) + r(14, 9, 2, 4, c('light'));
  s += r(3, 7, 3.6, 3.2, '#ffffff') + r(9.4, 7, 3.6, 3.2, '#ffffff');
  s += r(3.8, 7.6, 2.2, 2.6, c('eye')) + r(10, 7.6, 2.2, 2.6, c('eye'));
  s += r(4.4, 8, 1, 1.8, '#111111') + r(10.6, 8, 1, 1.8, '#111111');
  s += r(3.8, 7.6, 0.8, 0.8, '#ffffff') + r(10, 7.6, 0.8, 0.8, '#ffffff');
  s += r(3, 6, 3.4, 0.7, c('dark')) + r(9.6, 6, 3.4, 0.7, c('dark'));
  s += r(4.6, 10.5, 6.8, 4.5, c('light'));
  s += r(6.6, 10.6, 2.8, 1.6, '#2b2b2b');
  s += r(7, 13.2, 2, 0.6, '#5a3a3a');
  const outline = `<rect x="1" y="4" width="14" height="10" fill="none" stroke="#1f2a44" stroke-width="0.8"/>`;
  return `<svg viewBox="-0.5 0 17 16" shape-rendering="crispEdges" aria-hidden="true">${s}${outline}</svg>`;
}

const STAR_PATH = 'M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5L7 14.3l-5.3-5 7.2-.9z';
function uri(svg) { return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`; }
export function iconCSS() {
  const star = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${STAR_PATH}" fill="${fill}" stroke="#1f2a44" stroke-width="2" stroke-linejoin="round"/></svg>`;
  const medal = (a, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 1h4l2 8H9zM13 1h4l-2 8h-4z" fill="${b}" stroke="#1f2a44" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="15" r="7.2" fill="${a}" stroke="#1f2a44" stroke-width="2"/><path d="M12 11l1.3 2.7 2.9.3-2.2 2 .7 2.9L12 17.4l-2.7 1.5.7-2.9-2.2-2 2.9-.3z" fill="#ffffff" opacity=".85"/></svg>`;
  const lock = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="#1f2a44" stroke-width="3"/><rect x="4" y="10" width="16" height="12" rx="3" fill="#6b7285" stroke="#1f2a44" stroke-width="2"/></svg>`;
  return `
.i-star,.mark{background-image:${uri(star('#c9d0dc'))}}
.i-star.on,.mark.on{background-image:${uri(star('#ffd60a'))}}
.i-medal{background-image:${uri(medal('#c9d0dc', '#aeb6c4'))}}
.i-medal.on{background-image:${uri(medal('#ffb703', '#3a86ff'))}}
.i-lock{background-image:${uri(lock)}}
`;
}

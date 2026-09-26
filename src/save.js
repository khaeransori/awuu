import { LEVELS } from './levels.js';
const KEY = 'awuu-serigala-v1';

function fresh() {
  return {
    levels: LEVELS.map(() => ({ stars: 0, best: 0, medals: [false, false] })),
    unlocked: 1,
    skin: 'abu',
    album: {},
    total: 0,
    settings: { music: true, sfx: true, quality: 'auto' },
    tutorialDone: false,
  };
}

export let storageOk = true;
export const save = load();

function load() {
  const s = fresh();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.levels)) {
        d.levels.forEach((l, i) => { if (s.levels[i]) Object.assign(s.levels[i], l); });
        s.unlocked = Math.max(1, Math.min(LEVELS.length, d.unlocked | 0));
        s.skin = d.skin || 'abu';
        s.album = d.album || {};
        s.total = d.total | 0;
        s.settings = Object.assign(s.settings, d.settings || {});
        s.tutorialDone = !!d.tutorialDone;
      }
    }
    window.localStorage.setItem(KEY + '-t', '1');
    window.localStorage.removeItem(KEY + '-t');
  } catch (e) {
    storageOk = false;
  }
  return s;
}
export function persist() {
  if (!storageOk) return;
  try { window.localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { storageOk = false; }
}
export function totalStars() { return save.levels.reduce((a, l) => a + l.stars, 0); }
export function totalMedals() { return save.levels.reduce((a, l) => a + l.medals.filter(Boolean).length, 0); }
export function resetSave() {
  const f = fresh();
  Object.assign(save, f);
  persist();
}

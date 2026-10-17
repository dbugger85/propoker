// Saves the tournaments in the browser (localStorage). The open one is in
// `propoker.setup` and `propoker.tournament` (its id in `propoker.current`);
// the others are filed away whole in `propoker.saved.<id>` ({ id, created, setup, game }).

import { buildLevels } from './blinds.js';
import { DEFAULT_CHIPS, smallestChip } from './chips.js';

const SETUP_KEY = 'propoker.setup';
const GAME_KEY = 'propoker.tournament';
const CURRENT_KEY = 'propoker.current';
const SAVED_PREFIX = 'propoker.saved.';
const SEEN_KEY = 'propoker.seen';
const THEME_KEY = 'propoker.theme';
const INSTALL_KEY = 'propoker.installHidden';
const TABLE_VIEW_KEY = 'propoker.tableView';
const DEALER_KEY = 'propoker.dealer';

export const DEFAULT_SETUP = {
  v: 1,
  name: '',
  currency: 'NOK',
  buyIn: 200,
  fee: 0,
  startingChips: 10000,
  smallestChip: 25, // follows the chip set
  chipSet: DEFAULT_CHIPS,
  preset: 'standard',
  levelMinutes: 20,
  breakMinutes: 10,
  anteStyle: 'none',
  targetHours: null, // how long the tournament should last; the blinds are then worked out to fit
  levels: [],
  startStack: null, // your own starting chips [{ color, value, count }], or the app's suggestion
  customLevels: null, // your own levels, kept while you look at a preset, so Custom brings them back
  rebuy: { on: true, price: 200, chips: 10000, untilLevel: 4 },
  addOn: { on: true, price: 200, chips: 15000 },
  lateUntilLevel: 4,
  seatsPerTable: 9,
  randomSeats: true,
  payouts: { mode: 'auto', percents: [50, 30, 20], fixed: [], roundTo: 10, minCash: true },
  sounds: { on: true, vibrate: true },
  players: [],
  knownNames: [],
};

function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && value.v === 1 ? value : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (e.g. private mode); the app still works.
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function loadSetup() {
  const saved = read(SETUP_KEY) ?? {};
  const d = structuredClone(DEFAULT_SETUP);
  const s = { ...d, ...saved, rebuy: { ...d.rebuy, ...saved.rebuy }, addOn: { ...d.addOn, ...saved.addOn }, payouts: { ...d.payouts, ...saved.payouts }, sounds: { ...d.sounds, ...saved.sounds } };
  s.smallestChip = smallestChip(s.chipSet);
  if (!s.levels.length) s.levels = buildLevels(s);
  return s;
}

export const saveSetup = (s) => write(SETUP_KEY, s);
export const loadGame = () => read(GAME_KEY);
export const saveGame = (t) => write(GAME_KEY, t);
export const clearGame = () => remove(GAME_KEY);

// ---------- several tournaments ----------

const newKey = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// The open tournament's id and when it was made
export function currentInfo() {
  const info = read(CURRENT_KEY);
  if (info?.id) return info;
  const made = { v: 1, id: newKey(), created: loadGame()?.startedAt ?? Date.now() };
  write(CURRENT_KEY, made);
  return made;
}

// Worth keeping: started, or with players or a name
export const worthKeeping = (setup, game) => !!(game || setup?.players?.length || setup?.name?.trim());

export function savedTournaments() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(SAVED_PREFIX)) {
        const e = read(key);
        if (e?.setup) out.push(e);
      }
    }
  } catch {}
  return out;
}

export const saveSaved = (entry) => write(SAVED_PREFIX + entry.id, { v: 1, ...entry });
export const deleteSaved = (id) => remove(SAVED_PREFIX + id);

// Puts the open tournament away (when worth keeping) and opens `entry`
// ({ id, created, setup, game }; without an id it's a new one). The saved names go along.
export function switchTo(entry) {
  const setup = read(SETUP_KEY);
  const game = loadGame();
  const info = currentInfo();
  if (worthKeeping(setup, game)) saveSaved({ id: info.id, created: info.created, setup, game });
  const id = entry.id ?? newKey();
  deleteSaved(id);
  write(CURRENT_KEY, { v: 1, id, created: entry.created ?? Date.now() });
  write(SETUP_KEY, { ...entry.setup, v: 1, knownNames: setup?.knownNames ?? entry.setup.knownNames ?? [] });
  if (entry.game) saveGame(entry.game);
  else clearGame();
}

// Forgets the open tournament: a blank one takes its place (the saved names stay).
export function clearCurrent() {
  const names = read(SETUP_KEY)?.knownNames ?? [];
  remove(CURRENT_KEY);
  clearGame();
  write(SETUP_KEY, { v: 1, knownNames: names });
}

// When the app was last open with the clock showing, to notice that it ran while the app was closed.
export function loadSeen() {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveSeen(time) {
  try {
    localStorage.setItem(SEEN_KEY, String(time));
  } catch {}
}

// 'auto' (follow the phone), 'light' or 'dark'.
export function loadTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveTheme(theme) {
  try {
    if (theme === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

export function loadInstallHidden() {
  try {
    return localStorage.getItem(INSTALL_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveInstallHidden() {
  try {
    localStorage.setItem(INSTALL_KEY, '1');
  } catch {}
}

// The Tables page: 'drawn' (poker tables seen from above) or 'grid' (a list of seats). Kept on this phone.
export function loadTableView() {
  try {
    return localStorage.getItem(TABLE_VIEW_KEY) === 'grid' ? 'grid' : 'drawn';
  } catch {
    return 'drawn';
  }
}

export function saveTableView(view) {
  try {
    if (view === 'grid') localStorage.setItem(TABLE_VIEW_KEY, 'grid');
    else localStorage.removeItem(TABLE_VIEW_KEY);
  } catch {}
}

// Show where the dealer stands on the drawn tables (on unless turned off). Kept on this phone.
export function loadDealer() {
  try {
    return localStorage.getItem(DEALER_KEY) !== '0';
  } catch {
    return true;
  }
}

export function saveDealer(on) {
  try {
    if (on) localStorage.removeItem(DEALER_KEY);
    else localStorage.setItem(DEALER_KEY, '0');
  } catch {}
}

// ---------- the TV view and your own look ----------

// What the TV window shows (kept on this device, shared with the TV window)
export const TV_KEY = 'propoker.tv';
export const TV_PANELS = ['blinds', 'prizes', 'players', 'tables', 'out'];
export const TV_DEFAULT = { v: 1, panels: ['blinds', 'prizes', 'players'], cycle: 15, facts: true, chips: true, sound: 'tv' };
export function loadTv() {
  const s = { ...TV_DEFAULT, ...read(TV_KEY) };
  s.panels = (Array.isArray(s.panels) ? s.panels : TV_DEFAULT.panels).filter((p) => TV_PANELS.includes(p));
  return s;
}
export const saveTv = (s) => write(TV_KEY, { ...s, v: 1 });

// The TV window says it's there every few seconds, so the main window leaves the sounds to it.
const TV_SEEN_KEY = 'propoker.tvSeen';
export function markTvSeen(time) {
  try {
    localStorage.setItem(TV_SEEN_KEY, String(time));
  } catch {}
}
export function tvOpen(now) {
  try {
    return now - (Number(localStorage.getItem(TV_SEEN_KEY)) || 0) < 10000;
  } catch {
    return false;
  }
}

// Your own logo, name and accent colour (like ProQuiz): { name, accent: '#rrggbb' | null, logo: data URL | null, plate }
export const BRAND_KEY = 'propoker.brand';
export const NO_BRAND = { v: 1, name: '', accent: null, logo: null, plate: false };
export const cleanBrand = (b) => ({
  v: 1,
  name: typeof b?.name === 'string' ? b.name.slice(0, 60) : '',
  accent: /^#[0-9a-f]{6}$/i.test(b?.accent ?? '') ? b.accent.toLowerCase() : null,
  logo: typeof b?.logo === 'string' && /^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(b.logo) ? b.logo : null,
  plate: !!b?.plate,
});
export const loadBrand = () => cleanBrand(read(BRAND_KEY) ?? NO_BRAND);
export const saveBrand = (b) => write(BRAND_KEY, cleanBrand(b));

// Saves the setup, the tournament in progress and the last summary in the browser (localStorage).

import { buildLevels } from './blinds.js';
import { DEFAULT_CHIPS, smallestChip } from './chips.js';

const SETUP_KEY = 'propoker.setup';
const GAME_KEY = 'propoker.tournament';
const LAST_KEY = 'propoker.lastSummary';
const SEEN_KEY = 'propoker.seen';
const THEME_KEY = 'propoker.theme';
const INSTALL_KEY = 'propoker.installHidden';
const TABLE_VIEW_KEY = 'propoker.tableView';

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
  levels: [],
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
export const loadLast = () => read(LAST_KEY);
export const saveLast = (summary) => write(LAST_KEY, summary);

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

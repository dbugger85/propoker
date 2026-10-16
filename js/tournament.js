// The tournament in progress: players, knockouts and places, rebuys and
// add-ons, late entries, undo, chips and the prizes. No DOM code here.
//
// The functions change the tournament `t` in place; the app saves it after.
// Anything that changes players or tables first saves a copy for Undo.

import { buildLevels, levelNumber } from './blinds.js';
import { seatAll, seatOne } from './tables.js';
import { totals, prizes } from './money.js';

const HISTORY = 20;
let lastId = 0;
export const newId = () => `p${Date.now().toString(36)}${(lastId++).toString(36)}`;

export function createTournament(setup, now, rng = Math.random) {
  const { players: list, knownNames, ...settings } = setup;
  const levels = (setup.levels?.length ? setup.levels : buildLevels(setup)).map((l) => ({ ...l }));
  const base = list.map((p) => ({ id: p.id, name: p.name, status: 'in', rebuys: 0, addOn: false, paid: false, place: null, outBy: null, outLevel: null, outAt: null, chipsOut: 0 }));
  const { tables, players } = seatAll(base, settings.seatsPerTable, settings.randomSeats, rng);
  return { v: 1, startedAt: now, settings: structuredClone(settings), levels, clock: { levelIndex: 0, levelMs: 0, runningSince: null }, players, tables, history: [], finished: false, deal: null };
}

function snapshot(t) {
  t.history.push(structuredClone({ players: t.players, tables: t.tables, finished: t.finished, deal: t.deal }));
  if (t.history.length > HISTORY) t.history.shift();
}

export function undo(t) {
  const last = t.history.pop();
  if (!last) return false;
  Object.assign(t, last);
  return true;
}

export const player = (t, id) => t.players.find((p) => p.id === id);
export const inPlay = (t) => t.players.filter((p) => p.status === 'in');
export const currentLevelNumber = (t) => levelNumber(t.levels, t.clock.levelIndex);
export const onBreak = (t) => !!t.levels[t.clock.levelIndex]?.break;

export const rebuysOpen = (t) => t.settings.rebuy.on && currentLevelNumber(t) <= t.settings.rebuy.untilLevel;
export const lateOpen = (t) => currentLevelNumber(t) <= t.settings.lateUntilLevel;
// The break right after the rebuy cut-off is add-on time.
export const addOnTime = (t) => t.settings.addOn.on && onBreak(t) && currentLevelNumber(t) === t.settings.rebuy.untilLevel;

// Places come from the order people went out: the first out is last.
// When one player is left, they're first and the tournament is over.
export function recomputePlaces(t) {
  const out = t.players.filter((p) => p.status !== 'in').sort((a, b) => a.outAt - b.outAt);
  out.forEach((p, i) => (p.place = t.players.length - i));
  const left = inPlay(t);
  if (t.deal) return;
  for (const p of left) p.place = null;
  t.finished = left.length === 1 && t.players.length > 1;
  if (t.finished) left[0].place = 1;
}

export function knockOut(t, id, byId, now) {
  const p = player(t, id);
  if (!p || p.status !== 'in') return;
  snapshot(t);
  Object.assign(p, { status: 'out', outBy: byId ?? null, outLevel: currentLevelNumber(t), outAt: now });
  recomputePlaces(t);
}

// Left the game. If they took their chips with them, those leave the chip count.
export function leave(t, id, chipsStay, now) {
  const p = player(t, id);
  if (!p || p.status !== 'in') return;
  snapshot(t);
  Object.assign(p, { status: 'left', outBy: null, outLevel: currentLevelNumber(t), outAt: now, chipsOut: chipsStay ? 0 : boughtChips(t, p) });
  recomputePlaces(t);
}

// A rebuy: more chips for someone still in, or back in for someone knocked out.
export function rebuy(t, id, rng = Math.random) {
  const p = player(t, id);
  if (!p) return;
  snapshot(t);
  p.rebuys++;
  if (p.status !== 'in') {
    const seat = seatOne(t.players, t.tables, t.settings.seatsPerTable, rng);
    t.tables = seat.tables;
    Object.assign(p, { status: 'in', place: null, outBy: null, outLevel: null, outAt: null, chipsOut: 0, table: seat.table, seat: seat.seat });
  }
  recomputePlaces(t);
}

// Undoing one rebuy by mistake: the Undo button covers it.
export function setAddOn(t, id, on) {
  const p = player(t, id);
  if (!p || p.addOn === on) return;
  snapshot(t);
  p.addOn = on;
}

export function setPaid(t, id, paid) {
  const p = player(t, id);
  if (!p || p.paid === paid) return;
  snapshot(t);
  p.paid = paid;
}

export function rename(t, id, name) {
  const p = player(t, id);
  if (p && name.trim()) p.name = name.trim();
}

// A late entry: a full starting stack, a buy-in, and a seat at the emptiest table.
export function addLate(t, name, rng = Math.random) {
  snapshot(t);
  const seat = seatOne(t.players, t.tables, t.settings.seatsPerTable, rng);
  t.tables = seat.tables;
  const p = { id: newId(), name: name.trim(), status: 'in', rebuys: 0, addOn: false, paid: false, place: null, outBy: null, outLevel: null, outAt: null, chipsOut: 0, table: seat.table, seat: seat.seat, late: true };
  t.players.push(p);
  recomputePlaces(t);
  return p;
}

// For changes made elsewhere (tables.js moves, seat swaps): save a copy for Undo first.
export function change(t, fn) {
  snapshot(t);
  fn();
}

export const boughtChips = (t, p) => t.settings.startingChips + p.rebuys * t.settings.rebuy.chips + (p.addOn ? t.settings.addOn.chips : 0);

export function chipsInPlay(t) {
  return t.players.reduce((sum, p) => sum + boughtChips(t, p) - (p.chipsOut || 0), 0);
}

export function averageStack(t) {
  const left = inPlay(t).length;
  return left ? Math.round(chipsInPlay(t) / left / (t.settings.smallestChip || 1)) * (t.settings.smallestChip || 1) : 0;
}

export const knockouts = (t, id) => t.players.filter((p) => p.outBy === id).length;

export const money = (t) => totals(t.players, t.settings);
export const prizeList = (t) => prizes(money(t).pool, t.players.length, t.settings.payouts, t.settings.buyIn);

export function prizeOf(t, p) {
  if (t.deal && p.id in t.deal) return t.deal[p.id];
  if (!p.place) return 0;
  return prizeList(t)[p.place - 1] ?? 0;
}

// What the players still in would share if they stopped now: the prizes not yet won.
export function remainingPrizes(t) {
  const left = inPlay(t).length;
  return prizeList(t).slice(0, left).reduce((a, b) => a + b, 0);
}

// Ending early with a deal: the players still in get places 1, 2, 3… in the
// order given, and the amounts agreed.
export function endWithDeal(t, shares, now) {
  snapshot(t);
  t.deal = {};
  shares.forEach(({ id, amount }, i) => {
    const p = player(t, id);
    t.deal[id] = amount;
    Object.assign(p, { place: i + 1, outAt: now });
  });
  t.finished = true;
}

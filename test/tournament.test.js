import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../js/tournament.js';
import { shareText } from '../js/summary.js';

const setup = (n, extra = {}) => ({
  name: 'Test', currency: 'NOK', buyIn: 200, fee: 0, startingChips: 10000, smallestChip: 25, preset: 'standard',
  anteStyle: 'none', levels: [], rebuy: { on: true, price: 200, chips: 10000, untilLevel: 4 }, addOn: { on: true, price: 200, chips: 15000 },
  lateUntilLevel: 4, seatsPerTable: 9, randomSeats: true, payouts: { mode: 'auto', roundTo: 10, minCash: true },
  players: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` })), ...extra,
});

test('a game to the end: places, prizes, undo', () => {
  const t = T.createTournament(setup(4), 0);
  assert.equal(t.players.length, 4);
  assert.equal(T.money(t).pool, 800);
  T.knockOut(t, 'p0', 'p1', 1);
  assert.equal(T.player(t, 'p0').place, 4);
  T.knockOut(t, 'p2', 'p1', 2);
  assert.equal(T.player(t, 'p2').place, 3);
  assert.equal(t.finished, false);
  T.knockOut(t, 'p3', null, 3);
  assert.equal(t.finished, true);
  assert.equal(T.player(t, 'p1').place, 1);
  assert.equal(T.prizeOf(t, T.player(t, 'p1')), 800);
  assert.equal(T.knockouts(t, 'p1'), 2);
  T.undo(t);
  assert.equal(t.finished, false);
  assert.equal(T.player(t, 'p3').status, 'in');
  assert.equal(T.player(t, 'p1').place, null);
});

test('undoing a knockout in the middle leaves no gap', () => {
  const t = T.createTournament(setup(5), 0);
  T.knockOut(t, 'p0', null, 1);
  T.knockOut(t, 'p1', null, 2);
  T.undo(t);
  T.undo(t);
  T.knockOut(t, 'p1', null, 3);
  assert.equal(T.player(t, 'p1').place, 5);
  assert.equal(T.player(t, 'p0').place, null);
});

test('rebuys, add-ons and chips', () => {
  const t = T.createTournament(setup(3), 0);
  T.rebuy(t, 'p0');
  T.setAddOn(t, 'p1', true);
  assert.equal(T.money(t).pool, 1000);
  assert.equal(T.chipsInPlay(t), 30000 + 10000 + 15000);
  assert.equal(T.averageStack(t), Math.round(55000 / 3 / 25) * 25);
  T.knockOut(t, 'p2', null, 1);
  T.rebuy(t, 'p2');
  assert.equal(T.player(t, 'p2').status, 'in', 'back in after a rebuy');
  assert.ok(T.player(t, 'p2').seat);
  assert.equal(T.rebuysOpen(t), true);
  t.clock.levelIndex = 5;
  assert.equal(T.rebuysOpen(t), false);
});

test('leaving with chips, late entry', () => {
  const t = T.createTournament(setup(3), 0);
  T.leave(t, 'p0', false, 1);
  assert.equal(T.chipsInPlay(t), 20000);
  assert.equal(T.player(t, 'p0').place, 3);
  const late = T.addLate(t, '  Zed ');
  assert.equal(late.name, 'Zed');
  assert.equal(t.players.length, 4);
  assert.equal(T.player(t, 'p0').place, 4, 'places follow the number of entrants');
});

test('a deal at the end', () => {
  const t = T.createTournament(setup(10), 0);
  for (let i = 0; i < 7; i++) T.knockOut(t, `p${i}`, null, i);
  const left = T.inPlay(t);
  assert.equal(T.remainingPrizes(t), 2000);
  T.endWithDeal(t, left.map((p) => ({ id: p.id, amount: 2000 / 3 })), 9);
  assert.equal(t.finished, true);
  assert.equal(T.prizeOf(t, left[0]), 2000 / 3);
});

test('the share text', () => {
  const t = T.createTournament(setup(3), 0);
  T.knockOut(t, 'p0', 'p1', 1);
  T.knockOut(t, 'p2', 'p1', 2);
  const text = shareText(t, { tr: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => v[k]) : s), cash: (a) => `${a} kr`, when: '16.10.2026' });
  assert.match(text, /🥇 P1: 600 kr/);
  assert.match(text, /Most knockouts: P1 \(2\)/);
  assert.match(text, /P1: \+400 kr/);
  assert.match(text, /P0: -200 kr/);
});

test('chip counts: totals, difference, leader', () => {
  const t = T.createTournament(setup(3), 0);
  assert.equal(T.countDifference(t), null, 'nobody counted yet');
  assert.deepEqual(T.chipLeader(t), []);
  T.countStacks(t, { p0: 12000, p1: 9000 }, 5);
  assert.equal(T.countedTotal(t), 21000);
  assert.equal(T.countDifference(t), null, 'p2 not counted yet');
  assert.equal(T.player(t, 'p0').stackLevel, 1);
  T.countStacks(t, { p2: 8000 }, 6);
  assert.equal(T.player(t, 'p0').stack, 12000, 'the others keep their count');
  assert.equal(T.countDifference(t), -1000, '29 000 counted, 30 000 in play');
  assert.deepEqual(T.chipLeader(t).map((p) => p.id), ['p0']);
  assert.deepEqual(t.counts.map((c) => c.total), [21000, 29000]);
  T.countStacks(t, { p1: 12000 }, 7);
  assert.deepEqual(T.chipLeader(t).map((p) => p.id), ['p0', 'p1'], 'a tie');
  assert.equal(T.stackInBB(23400, 800), 29);
});

test('chip counts: rebuys, add-ons, knockouts, late entries and undo', () => {
  const t = T.createTournament(setup(3), 0);
  T.rebuy(t, 'p0');
  assert.equal(T.player(t, 'p0').stack, null, 'no count, no stack');
  T.countStacks(t, { p0: 15000, p1: 10000, p2: 5000 }, 1);
  T.rebuy(t, 'p2');
  assert.equal(T.player(t, 'p2').stack, 15000, 'a rebuy adds its chips');
  T.setAddOn(t, 'p1', true);
  assert.equal(T.player(t, 'p1').stack, 25000);
  T.setAddOn(t, 'p1', false);
  assert.equal(T.player(t, 'p1').stack, 10000);
  T.knockOut(t, 'p2', 'p0', 2);
  assert.equal(T.player(t, 'p2').stack, null);
  T.rebuy(t, 'p2');
  assert.equal(T.player(t, 'p2').stack, 10000, 'back in with the rebuy chips');
  const late = T.addLate(t, 'Zed');
  assert.equal(late.stack, 10000, 'a late entry starts with the starting stack');
  T.countStacks(t, { p0: 1 }, 3);
  assert.equal(t.counts.length, 2);
  T.undo(t);
  assert.equal(T.player(t, 'p0').stack, 15000, 'undo takes the count back');
  assert.equal(t.counts.length, 1);
});

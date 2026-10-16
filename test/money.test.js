import { test } from 'node:test';
import assert from 'node:assert/strict';
import { owed, totals, autoPlaces, split, prizes, payoutProblem, formatMoney, groupDigits } from '../js/money.js';

const s = { buyIn: 200, fee: 0, rebuy: { price: 200 }, addOn: { price: 100 } };
const auto = { mode: 'auto', roundTo: 10, minCash: true };

test('what players owe and the pool', () => {
  const players = [{ rebuys: 2, addOn: true, paid: true }, { rebuys: 0, addOn: false, paid: false }];
  assert.equal(owed(players[0], s), 700);
  assert.deepEqual(totals(players, s), { moneyIn: 900, fees: 0, pool: 900, unpaid: 200 });
  assert.equal(totals(players, { ...s, fee: 20 }).pool, 860);
});

test('paid places', () => {
  assert.equal(autoPlaces(4), 1);
  assert.equal(autoPlaces(5), 2);
  assert.equal(autoPlaces(10), 3);
  assert.equal(autoPlaces(20), 4);
  assert.equal(autoPlaces(45), 7);
});

test('prizes add up to the pool, rounded to 10', () => {
  assert.deepEqual(split(2200, [50, 30, 20]), [1100, 660, 440]);
  const p = split(2333, [50, 30, 20]);
  assert.equal(p.reduce((a, b) => a + b), 2333);
  assert.deepEqual(p.slice(1), [690, 460]);
  assert.deepEqual(prizes(2400, 12, auto, 200), [1200, 720, 480]);
});

test('min cash: one place fewer when the last would win less than a buy-in', () => {
  // 8 players × 100 = 800; 3 places → 20 % = 160 < 200 → 2 places
  assert.deepEqual(prizes(800, 8, auto, 200), [520, 280]);
  assert.deepEqual(prizes(800, 8, { ...auto, minCash: false }, 200), [400, 240, 160]);
});

test('own percentages', () => {
  assert.deepEqual(prizes(1000, 10, { mode: 'percent', percents: [70, 30], roundTo: 10 }, 100), [700, 300]);
  assert.deepEqual(prizes(1000, 1, { mode: 'percent', percents: [70, 30], roundTo: 10 }, 100), [1000]);
  assert.deepEqual(payoutProblem(1000, { mode: 'percent', percents: [70, 20] }), { code: 'percent', diff: 10 });
});

test('fixed amounts, the rest to the winner', () => {
  const fixed = { mode: 'fixed', fixed: [600, 200] };
  assert.deepEqual(prizes(2000, 10, fixed, 200), [1200, 600, 200]);
  assert.deepEqual(prizes(2000, 2, fixed, 200), [1400, 600], 'no more places than players');
  assert.deepEqual(payoutProblem(500, fixed), { code: 'fixed', diff: 300 });
  assert.equal(payoutProblem(2000, fixed), null);
});

test('money format', () => {
  assert.equal(formatMoney(2200, 'NOK', 'no'), '2\u00a0200\u00a0kr');
  assert.equal(formatMoney(2200, 'EUR', 'en'), '€2\u00a0200');
  assert.equal(formatMoney(-12000, 'NOK', 'en'), '−NOK\u00a012\u00a0000');
  assert.equal(groupDigits(1234567), '1\u00a0234\u00a0567');
  assert.equal(groupDigits(950), '950');
});

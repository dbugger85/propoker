import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLevels, roundBlind, smallBlind, nextLevel, ensureLevel, levelNumber, nextPlay, totalMinutes, expectedChips } from '../js/blinds.js';

const blinds = (levels) => levels.map((l) => (l.break ? 'break' : `${l.sb}/${l.bb}`));

test('standard with 10,000 chips', () => {
  const levels = buildLevels({ preset: 'standard', startingChips: 10000 });
  assert.deepEqual(blinds(levels).slice(0, 10), ['50/100', '100/200', '150/300', '200/400', 'break', '300/600', '400/800', '600/1200', '800/1600', 'break']);
  assert.equal(levels[0].minutes, 20);
  assert.equal(levels[4].minutes, 10);
  assert.equal(blinds(levels).at(-1), '20000/40000');
});

test('turbo and deep', () => {
  const turbo = buildLevels({ preset: 'turbo', startingChips: 10000 });
  assert.deepEqual(blinds(turbo).slice(0, 7), ['50/100', '100/200', '200/400', '300/600', '400/800', 'break', '600/1200']);
  assert.equal(turbo[0].minutes, 12);
  const deep = buildLevels({ preset: 'deep', startingChips: 10000 });
  assert.deepEqual(blinds(deep).slice(0, 6), ['25/50', '50/100', '75/150', '100/200', 'break', '125/250']);
  assert.equal(deep[0].minutes, 25);
});

test('other stacks are scaled and rounded', () => {
  assert.deepEqual(blinds(buildLevels({ preset: 'standard', startingChips: 5000 })).slice(0, 4), ['25/50', '50/100', '75/150', '100/200']);
  const odd = buildLevels({ preset: 'standard', startingChips: 3333 });
  for (const l of odd.filter((l) => !l.break)) assert.equal(l.bb % 25, 0);
  const bbs = odd.filter((l) => !l.break).map((l) => l.bb);
  assert.deepEqual(bbs, [...new Set(bbs)].sort((a, b) => a - b), 'no duplicates, rising');
});

test('rounding', () => {
  assert.equal(roundBlind(33), 25);
  assert.equal(roundBlind(1234), 1200);
  assert.equal(roundBlind(12345), 12000);
  assert.equal(smallBlind(150), 75);
  assert.equal(smallBlind(100, 100), 50);
});

test('custom level minutes and antes', () => {
  const levels = buildLevels({ preset: 'standard', levelMinutes: 15, anteStyle: 'bb' });
  assert.equal(levels[0].minutes, 15);
  assert.equal(levels[0].ante, 0);
  assert.equal(levels[5].ante, levels[5].bb, 'big blind ante after the first break');
  const classic = buildLevels({ preset: 'standard', anteStyle: 'classic', anteFromLevel: 1 });
  assert.equal(classic[0].ante, 25);
  assert.equal(classic[5].ante, 50);
});

test('the list never runs out', () => {
  const levels = buildLevels({ preset: 'turbo' });
  const n = levels.length;
  ensureLevel(levels, n + 1);
  assert.equal(levels.length, n + 2);
  assert.equal(levels[n].bb, 75000);
  assert.equal(nextLevel([{ sb: 50, bb: 100, ante: 0, minutes: 20 }]).bb, 150);
});

test('level numbers skip breaks', () => {
  const levels = buildLevels({ preset: 'standard' });
  assert.equal(levelNumber(levels, 0), 1);
  assert.equal(levelNumber(levels, 4), 4, 'the break after level 4');
  assert.equal(levelNumber(levels, 5), 5);
  assert.equal(nextPlay(levels, 3).bb, 600);
});

test('a tournament length works out the blinds', () => {
  const setup = { preset: 'standard', startingChips: 10000, targetHours: 3, players: 10, rebuy: { on: true, chips: 10000 }, addOn: { on: true, chips: 15000 } };
  const levels = buildLevels(setup);
  assert.equal(totalMinutes(levels), 170, 'about 3 hours with 20-minute levels and breaks');
  const bbs = levels.filter((l) => !l.break).map((l) => l.bb);
  assert.equal(bbs[0], 100);
  assert.equal(bbs.at(-1), 15000, 'ends near 1/20 of the chips (270 000 / 20)');
  assert.deepEqual(bbs, [...new Set(bbs)].sort((a, b) => a - b), 'no duplicates, rising');
  for (const bb of bbs) assert.equal(bb % 25, 0);
  // More time: more and smaller steps, same end
  const longer = buildLevels({ ...setup, targetHours: 5 }).filter((l) => !l.break);
  assert.ok(longer.length > bbs.length);
  assert.equal(longer.at(-1).bb, 15000);
  // Too few steps to fill the time: longer levels instead
  const two = buildLevels({ ...setup, players: 2, rebuy: { on: false }, addOn: { on: false }, targetHours: 6 });
  assert.ok(two[0].minutes > 20);
  assert.ok(Math.abs(totalMinutes(two) - 360) <= 30);
  assert.equal(expectedChips({ players: [], startingChips: 1000 }), 8000, '8 players until 2 are added');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CHIPS, makeStack, stackValue, enoughFor, colourUp, smallestChip } from '../js/chips.js';
import { buildLevels } from '../js/blinds.js';

const counts = (s) => s.map((c) => `${c.count}×${c.value}`).join(' ');

test('a 10,000 stack from the default set', () => {
  const s = makeStack(10000, DEFAULT_CHIPS);
  assert.equal(stackValue(s), 10000);
  assert.equal(counts(s), '8×25 13×100 5×500 6×1000');
});

test('small and odd stacks', () => {
  assert.equal(stackValue(makeStack(1500, DEFAULT_CHIPS)), 1500);
  assert.equal(stackValue(makeStack(15000, DEFAULT_CHIPS)), 15000);
  assert.equal(makeStack(1010, DEFAULT_CHIPS), null, 'can’t be made with 25s');
  assert.equal(smallestChip(DEFAULT_CHIPS), 25);
});

test('values don’t have to be the money', () => {
  const set = [{ color: 'white', value: 1 }, { color: 'red', value: 5 }, { color: 'blue', value: 10 }, { color: 'black', value: 100 }];
  const s = makeStack(500, set);
  assert.equal(stackValue(s), 500);
  assert.ok(s.every((c) => c.count >= 0));
});

test('enough chips for how many players', () => {
  const set = DEFAULT_CHIPS.map((c) => ({ ...c, have: 100 }));
  const s = makeStack(10000, set);
  assert.equal(enoughFor(s, set), 7); // 100 red ÷ 13
  assert.equal(enoughFor(s, DEFAULT_CHIPS), null, 'counts not given');
});

test('colour up when the small chips are no longer needed', () => {
  const levels = buildLevels({ preset: 'standard', startingChips: 10000 });
  assert.deepEqual(colourUp(DEFAULT_CHIPS, levels, 0), []);
  const at = levels.findIndex((l) => l.bb === 1200); // 600/1200 on
  assert.deepEqual(colourUp(DEFAULT_CHIPS, levels, at).map((c) => c.value), [25]);
  const later = levels.findIndex((l) => l.bb === 2000); // 1000/2000 on
  assert.deepEqual(colourUp(DEFAULT_CHIPS, levels, later).map((c) => c.value), [25, 100]);
});

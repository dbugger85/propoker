import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLevels } from '../js/blinds.js';
import * as C from '../js/clock.js';

const MIN = 60000;
const fresh = () => ({ levelIndex: 0, levelMs: 0, runningSince: null });

test('runs from timestamps and pauses', () => {
  const levels = buildLevels({ preset: 'standard' });
  let c = C.resume(fresh(), 1000);
  assert.equal(C.remaining(c, levels, 1000 + 5 * MIN), 15 * MIN);
  c = C.pause(c, 1000 + 5 * MIN);
  assert.equal(C.elapsed(c, 1e12), 5 * MIN, 'paused time stands still');
  c = C.resume(c, 2e6);
  assert.equal(C.elapsed(c, 2e6 + MIN), 6 * MIN);
});

test('catches up over several levels', () => {
  const levels = buildLevels({ preset: 'standard' });
  const c = C.catchUp(C.resume(fresh(), 0), levels, 45 * MIN);
  assert.equal(c.levelIndex, 2);
  assert.equal(C.elapsed(c, 45 * MIN), 5 * MIN);
  const throughBreak = C.catchUp(C.resume(fresh(), 0), levels, 85 * MIN);
  assert.equal(throughBreak.levelIndex, 4, 'the break');
  assert.equal(C.elapsed(throughBreak, 85 * MIN), 5 * MIN);
});

test('runs past the end of the list', () => {
  const levels = buildLevels({ preset: 'turbo' });
  const n = levels.length;
  const c = C.catchUp(C.resume(fresh(), 0), levels, 100 * 12 * MIN);
  assert.ok(c.levelIndex > n);
  assert.ok(levels.length > c.levelIndex);
});

test('skip, back and minutes', () => {
  const levels = buildLevels({ preset: 'standard' });
  let c = C.skip(fresh(), levels, 0);
  assert.equal(c.levelIndex, 1);
  c = { ...c, levelMs: 5 * MIN };
  assert.deepEqual(C.back(c, 0), { levelIndex: 1, levelMs: 0, runningSince: null }, 'restarts the level');
  assert.equal(C.back({ ...c, levelMs: 3000 }, 0).levelIndex, 0, 'goes back a level near the start');
  assert.equal(C.addTime({ ...c, levelMs: 5 * MIN }, levels, MIN, 0).levelMs, 4 * MIN);
  assert.equal(C.addTime({ ...c, levelMs: 30000 }, levels, MIN, 0).levelMs, 0);
  assert.equal(C.addTime(c, levels, -30 * MIN, 0).levelMs, 20 * MIN - 1000);
});

test('time until the break', () => {
  const levels = buildLevels({ preset: 'standard' });
  assert.equal(C.untilBreak(fresh(), levels, 0), 80 * MIN);
  assert.equal(C.untilBreak({ levelIndex: 4, levelMs: 0, runningSince: null }, levels, 0), 0);
});

test('the expected clock times of the coming levels', () => {
  const levels = [{ minutes: 20 }, { minutes: 20 }, { break: true, minutes: 10 }, { minutes: 20 }];
  const min = 60000;
  const c = { levelIndex: 1, levelMs: 5 * min, runningSince: null }; // paused 5 min into level 2
  const s = C.schedule(c, levels, 100 * min);
  assert.deepEqual(Object.keys(s), ['1', '2', '3']);
  assert.deepEqual(s[1], { start: 95 * min, end: 115 * min }, 'paused: as if it went on now');
  assert.deepEqual(s[2], { start: 115 * min, end: 125 * min });
  assert.deepEqual(s[3], { start: 125 * min, end: 145 * min });
  const later = C.schedule(c, levels, 110 * min); // still paused 10 min later
  assert.equal(later[3].start, 135 * min, 'a pause moves every time on');
});

// The level clock, from timestamps only, so a locked phone or a reload never
// loses time. No DOM code here.
//
// The clock is { levelIndex, levelMs, runningSince }: levelMs is the time
// already run in the current level, and runningSince the moment it was last
// started (null while paused). The functions return a new clock; `levels` may
// grow when a game outlasts its list.

import { ensureLevel } from './blinds.js';

const MIN = 60000;
export const levelLength = (levels, i) => levels[i].minutes * MIN;

export const elapsed = (c, now) => c.levelMs + (c.runningSince == null ? 0 : now - c.runningSince);
export const running = (c) => c.runningSince != null;

// Moves on to the right level if the time has run past the end of the current
// one (over several levels if the phone slept), carrying the rest over.
export function catchUp(c, levels, now, smallest) {
  let i = c.levelIndex;
  let t = elapsed(c, now);
  ensureLevel(levels, i, smallest);
  while (t >= levelLength(levels, i)) {
    t -= levelLength(levels, i);
    i++;
    ensureLevel(levels, i, smallest);
  }
  if (i === c.levelIndex && c.runningSince == null) return c;
  return { levelIndex: i, levelMs: t, runningSince: c.runningSince == null ? null : now };
}

export const remaining = (c, levels, now) => levelLength(levels, c.levelIndex) - elapsed(c, now);

export function pause(c, now) {
  return c.runningSince == null ? c : { ...c, levelMs: elapsed(c, now), runningSince: null };
}

export function resume(c, now) {
  return c.runningSince == null ? { ...c, runningSince: now } : c;
}

const at = (c, i, now) => ({ levelIndex: i, levelMs: 0, runningSince: c.runningSince == null ? null : now });

export function skip(c, levels, now, smallest) {
  ensureLevel(levels, c.levelIndex + 1, smallest);
  return at(c, c.levelIndex + 1, now);
}

// Like a music player: restarts the level if more than 10 seconds have run, else goes to the one before.
export function back(c, now) {
  if (elapsed(c, now) > 10000 || c.levelIndex === 0) return at(c, c.levelIndex, now);
  return at(c, c.levelIndex - 1, now);
}

// +1 minute on the clock = 1 minute less run. Never below 0 or past the end.
export function addTime(c, levels, ms, now) {
  const e = elapsed(c, now) - ms;
  const levelMs = Math.min(Math.max(0, e), levelLength(levels, c.levelIndex) - 1000);
  return { ...c, levelMs, runningSince: c.runningSince == null ? null : now };
}

// Time until the next break starts (null if there is none, 0 during a break).
export function untilBreak(c, levels, now) {
  if (levels[c.levelIndex].break) return 0;
  let t = remaining(c, levels, now);
  for (let j = c.levelIndex + 1; j < levels.length; j++) {
    if (levels[j].break) return t;
    t += levelLength(levels, j);
  }
  return null;
}

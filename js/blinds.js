// Blind structures: the three presets, scaled to the starting stack and
// rounded to amounts you can actually put out with chips. No DOM code here.

// Each ladder lists the big blinds in "units"; one unit is the first big blind.
// Standard and Turbo start at 100 big blinds, Deep at 200.
export const PRESETS = {
  turbo: { minutes: 12, breakEvery: 5, breakMinutes: 10, stackInBB: 100, ladder: [1, 2, 4, 6, 8, 12, 16, 24, 32, 50, 80, 120, 160, 240, 320, 500] },
  standard: { minutes: 20, breakEvery: 4, breakMinutes: 10, stackInBB: 100, ladder: [1, 2, 3, 4, 6, 8, 12, 16, 20, 30, 40, 60, 80, 120, 160, 200, 300, 400] },
  deep: { minutes: 25, breakEvery: 4, breakMinutes: 10, stackInBB: 200, ladder: [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 60, 80, 120, 160, 200, 240] },
};
export const PRESET_ORDER = ['turbo', 'standard', 'deep'];

// To the smallest chip up to 1,000, to 100 up to 10,000, then to 1,000.
export function roundBlind(x, smallest = 25) {
  const step = x <= 1000 ? smallest : x <= 10000 ? Math.max(100, smallest) : Math.max(1000, smallest);
  return Math.max(smallest, Math.round(x / step) * step);
}

export function smallBlind(bb, smallest = 25) {
  const sb = Math.round(bb / 2 / smallest) * smallest;
  return sb > 0 && sb < bb ? sb : bb / 2;
}

export function anteFor(bb, style, smallest = 25) {
  if (style === 'bb') return bb;
  if (style === 'classic') return Math.max(smallest, Math.round((bb * 0.1) / smallest) * smallest);
  return 0;
}

export const playLevel = (bb, minutes, smallest, ante = 0) => ({ sb: smallBlind(bb, smallest), bb, ante, minutes });

// The full list of levels and breaks for a preset.
// `anteFromLevel`: the first level with an ante (default: the first level after the first break).
// `targetHours`: how long the tournament should last; the blinds are then worked out to fit (see `fitLevels`).
export function buildLevels(o = {}) {
  const { preset = 'standard', startingChips = 10000, smallestChip = 25, levelMinutes, breakMinutes, anteStyle = 'none', anteFromLevel, targetHours } = o;
  const p = PRESETS[preset] ?? PRESETS.standard;
  const minutes = levelMinutes || p.minutes;
  const unit = startingChips / p.stackInBB;
  const bbs = targetHours ? null : [];
  if (!targetHours) {
    let last = 0;
    for (const u of p.ladder) {
      const bb = roundBlind(u * unit, smallestChip);
      if (bb <= last) continue; // two rounded to the same amount
      bbs.push((last = bb));
    }
  }
  const fit = targetHours ? fitLevels({ ...o, first: roundBlind(unit, smallestChip), minutes, breakMinutes: breakMinutes || p.breakMinutes, breakEvery: p.breakEvery }) : { bbs, minutes };
  const anteFrom = anteFromLevel || p.breakEvery + 1;
  const levels = [];
  fit.bbs.forEach((bb, i) => {
    const n = i + 1;
    if (n > 1 && (n - 1) % p.breakEvery === 0) levels.push({ break: true, minutes: breakMinutes || p.breakMinutes });
    levels.push(playLevel(bb, fit.minutes, smallestChip, n >= anteFrom ? anteFor(bb, anteStyle, smallestChip) : 0));
  });
  return levels;
}

// Rough chips in play near the end: every starting stack, plus about half the
// players rebuying once and most taking the add-on. Before 2 players are added, 8 are assumed.
export function expectedChips({ players = [], startingChips = 10000, rebuy, addOn } = {}) {
  const count = Array.isArray(players) ? players.length : players;
  const n = count >= 2 ? count : 8;
  return n * startingChips + (rebuy?.on ? Math.round(n * 0.5) * (rebuy.chips || 0) : 0) + (addOn?.on ? Math.round(n * 0.75) * (addOn.chips || 0) : 0);
}

// Big blinds that look right (100, 150, 200, 250, 300, 400, 500, 600, 750, 800, 1 000 …),
// from `first` up to the first one at or above `end`; all multiples of the smallest chip.
export function niceBlinds(first, end, smallest = 25) {
  const out = [first];
  for (let p = 1; out.at(-1) < end && p < 1e12; p *= 10) {
    for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8]) {
      const v = m * p;
      if (v > out.at(-1) && v % smallest === 0) out.push(v);
      if (out.at(-1) >= end) break;
    }
  }
  return out;
}

// Minutes for n play levels, with a break after every `breakEvery` levels.
export const fitMinutes = (n, minutes, breakEvery, breakMinutes) => n * minutes + Math.floor((n - 1) / breakEvery) * breakMinutes;

// The big blinds for a tournament of `targetHours`: as many levels as fit in
// the time, rising from the first big blind until the big blind is about 1/20
// of the chips in play (the usual point where a tournament is over).
// With too few steps to fill the time, the levels get longer instead.
export function fitLevels({ targetHours, first, minutes, breakMinutes, breakEvery, smallestChip = 25, ...o }) {
  const target = targetHours * 60;
  const end = Math.max(first * 2, expectedChips(o) / 20);
  const nice = niceBlinds(first, end, smallestChip);
  let n = 2;
  while (n < 60 && Math.abs(fitMinutes(n + 1, minutes, breakEvery, breakMinutes) - target) <= Math.abs(fitMinutes(n, minutes, breakEvery, breakMinutes) - target)) n++;
  if (n > nice.length) {
    n = nice.length;
    minutes = Math.max(1, Math.round((target - Math.floor((n - 1) / breakEvery) * breakMinutes) / n));
  }
  // Each step about the same size: the nice value closest to an even rise, always higher than the last
  const top = nice.at(-1);
  const bbs = [];
  for (let i = 0; i < n; i++) {
    const want = Math.log(first * (top / first) ** (i / (n - 1)));
    const left = nice.length - (n - i); // leave enough values for the levels still to come
    let best = nice.findIndex((v) => v > (bbs.at(-1) ?? 0));
    for (let k = best; k <= left; k++) if (Math.abs(Math.log(nice[k]) - want) < Math.abs(Math.log(nice[best]) - want)) best = k;
    bbs.push(nice[best]);
  }
  return { bbs, minutes };
}

// The level after the last one in the list, when a game outlasts it: 1.5× the big blind.
export function nextLevel(levels, smallest = 25) {
  const plays = levels.filter((l) => !l.break);
  const last = plays.at(-1) ?? { bb: 100, ante: 0, minutes: 20 };
  const bb = roundBlind(last.bb * 1.5, smallest);
  const ante = last.ante ? (last.ante === last.bb ? bb : anteFor(bb, 'classic', smallest)) : 0;
  return playLevel(bb, last.minutes, smallest, ante);
}

// Makes sure levels[index] exists (adding levels as needed), and returns the list.
export function ensureLevel(levels, index, smallest = 25) {
  while (levels.length <= index) levels.push(nextLevel(levels, smallest));
  return levels;
}

// "Level 5": the number of the play level at index i, counting only real levels.
// At a break it's the level just played.
export function levelNumber(levels, i) {
  let n = 0;
  for (let j = 0; j <= i && j < levels.length; j++) if (!levels[j].break) n++;
  return n;
}

// The first play level after index i, or null.
export function nextPlay(levels, i) {
  for (let j = i + 1; j < levels.length; j++) if (!levels[j].break) return levels[j];
  return null;
}

// Rough length of the whole list, in minutes.
export const totalMinutes = (levels) => levels.reduce((s, l) => s + l.minutes, 0);

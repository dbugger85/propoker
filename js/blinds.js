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
export function buildLevels({ preset = 'standard', startingChips = 10000, smallestChip = 25, levelMinutes, breakMinutes, anteStyle = 'none', anteFromLevel } = {}) {
  const p = PRESETS[preset] ?? PRESETS.standard;
  const minutes = levelMinutes || p.minutes;
  const unit = startingChips / p.stackInBB;
  const anteFrom = anteFromLevel || p.breakEvery + 1;
  const levels = [];
  let n = 0;
  let last = 0;
  for (const u of p.ladder) {
    const bb = roundBlind(u * unit, smallestChip);
    if (bb <= last) continue; // two rounded to the same amount
    last = bb;
    n++;
    if (n > 1 && (n - 1) % p.breakEvery === 0) levels.push({ break: true, minutes: breakMinutes || p.breakMinutes });
    levels.push(playLevel(bb, minutes, smallestChip, n >= anteFrom ? anteFor(bb, anteStyle, smallestChip) : 0));
  }
  return levels;
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

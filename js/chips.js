// The chip set: which colours you have, what each is worth in the game, and
// how a stack is made up of them. Chip values are game points, not money.
// No DOM code here.

// Real chip colours (fixed, like the flags; not theme colours).
export const CHIP_COLORS = {
  white: '#f4f4f0',
  red: '#c8262f',
  blue: '#1f5fbf',
  green: '#1e8a4c',
  black: '#1b1d22',
  purple: '#6b3fa6',
  yellow: '#f2c230',
  orange: '#ec7a1c',
  pink: '#e86ba7',
  grey: '#8a919c',
  brown: '#7a4a24',
};

// A chip's colour is one of the names above, or the organiser's own as "#rrggbb".
const HEX = /^#[0-9a-f]{6}$/i;
export const isCustomColor = (color) => HEX.test(color ?? '');
export const chipHex = (color) => CHIP_COLORS[color] ?? (isCustomColor(color) ? color.toLowerCase() : '#888888');

// Light chips (white, yellow, a pale custom colour) get grey spots and a darker edge, or they'd vanish.
export function isLight(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

// The chip drawn from above, as SVG: the colour, six edge spots, and a thin inner ring.
export function chipSvg(color) {
  const hex = chipHex(color);
  const light = isLight(hex);
  const spot = light ? '#66718a' : '#ffffff';
  const edge = light ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.3)';
  const spots = [0, 60, 120, 180, 240, 300].map((a) => `<rect x="13.5" y="1" width="5" height="5.5" rx="1" fill="${spot}" transform="rotate(${a} 16 16)"/>`).join('');
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15.25" fill="${hex}" stroke="${edge}" stroke-width="1.5"/>${spots}<circle cx="16" cy="16" r="9.5" fill="none" stroke="${spot}" stroke-width="1.2" stroke-dasharray="2.5 2" opacity="0.85"/></svg>`;
}

export const DEFAULT_CHIPS = [
  { color: 'white', value: 25, have: null },
  { color: 'red', value: 100, have: null },
  { color: 'green', value: 500, have: null },
  { color: 'black', value: 1000, have: null },
];

export const sortChips = (set) => [...set].filter((c) => c.value > 0).sort((a, b) => a.value - b.value);
export const smallestChip = (set) => sortChips(set)[0]?.value ?? 1;
export const stackValue = (counts) => counts.reduce((s, c) => s + c.value * c.count, 0);

// A sensible way to make up `amount` from the chip set: some of each small
// chip (enough to make change for about two of the next one up), the rest in
// the biggest chips that fit. Returns [{ color, value, count }] smallest
// first, or null when the amount can't be made exactly.
export function makeStack(amount, set) {
  const chips = sortChips(set);
  if (!chips.length || amount <= 0) return chips.length ? chips.map((c) => ({ ...c, count: 0 })) : null;
  const counts = chips.map(() => 0);
  let left = amount;
  for (let i = 0; i < chips.length - 1; i++) {
    const want = Math.min(20, Math.max(4, Math.round((2 * chips[i + 1].value) / chips[i].value)));
    const n = Math.min(want, Math.floor((left * 0.4) / chips[i].value)); // never more than 40 % of what's left in small chips
    counts[i] = n;
    left -= n * chips[i].value;
  }
  for (let i = chips.length - 1; i >= 0; i--) {
    const n = Math.floor(left / chips[i].value);
    counts[i] += n;
    left -= n * chips[i].value;
  }
  if (left) return null;
  return chips.map((c, i) => ({ ...c, count: counts[i] }));
}

// How many players the chips you have are enough for (null when the counts aren't given).
export function enoughFor(stack, set) {
  if (!stack) return null;
  let players = Infinity;
  for (const c of stack) {
    if (!c.count) continue;
    const have = set.find((x) => x.color === c.color && x.value === c.value)?.have;
    if (have == null || have === '') return null;
    players = Math.min(players, Math.floor(have / c.count));
  }
  return players === Infinity ? null : players;
}

// Chips no longer needed from level `from` on: every blind and ante left can be
// paid with bigger chips, so these can be coloured up (swapped for bigger ones).
export function colourUp(set, levels, from) {
  const chips = sortChips(set);
  const plays = levels.slice(from).filter((l) => !l.break);
  if (!plays.length) return [];
  const gone = [];
  for (let i = 0; i < chips.length - 1; i++) {
    const next = chips[i + 1].value;
    if (plays.every((l) => l.sb % next === 0 && l.bb % next === 0 && (l.ante || 0) % next === 0)) gone.push(chips[i]);
    else break;
  }
  return gone;
}

// Seating: the first draw, late entries, and the moves that keep the tables
// even (balancing, breaking a table, the final table). No DOM code here.
//
// Players carry { table, seat }; tables are [{ n, open }]. `rng` returns a
// number in [0, 1) like Math.random, so tests can make it predictable.

const pick = (list, rng) => list[Math.floor(rng() * list.length)];

export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const tableCount = (players, seats) => Math.max(1, Math.ceil(players / seats));

// The first draw: players dealt one at a time round the tables, so the sizes
// differ by at most one, each in a random seat. Without `random`, in the order
// they were added and seats 1, 2, 3…
export function seatAll(players, seats, random = true, rng = Math.random) {
  const count = tableCount(players.length, seats);
  const tables = Array.from({ length: count }, (_, i) => ({ n: i + 1, open: true }));
  const order = random ? shuffle(players, rng) : players;
  const groups = tables.map(() => []);
  order.forEach((p, i) => groups[i % count].push(p));
  const seated = new Map();
  groups.forEach((group, t) => {
    const seatNos = Array.from({ length: seats }, (_, i) => i + 1);
    const chosen = random ? shuffle(seatNos, rng) : seatNos;
    group.forEach((p, i) => seated.set(p.id, { table: t + 1, seat: chosen[i] }));
  });
  return { tables, players: players.map((p) => ({ ...p, ...seated.get(p.id) })) };
}

const atTable = (players, n) => players.filter((p) => p.status === 'in' && p.table === n);

export function freeSeats(players, n, seats) {
  const taken = new Set(atTable(players, n).map((p) => p.seat));
  return Array.from({ length: seats }, (_, i) => i + 1).filter((s) => !taken.has(s));
}

const openTables = (tables) => tables.filter((t) => t.open);

// Fewest players first (ties: the lowest number).
function byCount(players, tables) {
  return openTables(tables)
    .map((t) => ({ n: t.n, count: atTable(players, t.n).length }))
    .sort((a, b) => a.count - b.count || a.n - b.n);
}

// A seat for someone new (a late entry, or back in after a rebuy): the
// emptiest table, a random free seat. Opens a new table when all are full.
export function seatOne(players, tables, seats, rng = Math.random) {
  for (const { n } of byCount(players, tables)) {
    const free = freeSeats(players, n, seats);
    if (free.length) return { tables, table: n, seat: pick(free, rng) };
  }
  const closed = tables.find((t) => !t.open);
  const n = closed ? closed.n : Math.max(0, ...tables.map((t) => t.n)) + 1;
  const next = closed ? tables.map((t) => (t.n === n ? { ...t, open: true } : t)) : [...tables, { n, open: true }];
  return { tables: next, table: n, seat: pick(Array.from({ length: seats }, (_, i) => i + 1), rng) };
}

// The moves the tables need right now:
//   final table: everyone left fits at one table → all to the lowest-numbered, new random seats
//   break:       one table fewer is enough → the emptiest table closes, its players spread out
//   balance:     the fullest table has 2+ more than the emptiest → one moves over, until even
// Returns { moves: [{ id, name, from, to, reason }], close: [n], final }.
export function plan(players, tables, seats, rng = Math.random) {
  const sim = players.map((p) => ({ ...p }));
  const open = new Set(openTables(tables).map((t) => t.n));
  const left = sim.filter((p) => p.status === 'in');
  const moves = [];
  const close = [];
  const move = (p, to, reason) => {
    moves.push({ id: p.id, name: p.name, from: { table: p.table, seat: p.seat }, to, reason });
    p.table = to.table;
    p.seat = to.seat;
  };
  const counts = () => byCount(sim, [...open].map((n) => ({ n, open: true })));

  if (open.size > 1 && left.length <= seats) {
    const target = Math.min(...open);
    const seatNos = shuffle(Array.from({ length: seats }, (_, i) => i + 1), rng);
    shuffle(left, rng).forEach((p, i) => move(p, { table: target, seat: seatNos[i] }, 'final'));
    return { moves, close: [...open].filter((n) => n !== target), final: true };
  }

  while (open.size > 1 && left.length <= (open.size - 1) * seats) {
    const list = counts();
    const fewest = list[0].count;
    const gone = Math.max(...list.filter((t) => t.count === fewest).map((t) => t.n)); // tie: the highest number
    open.delete(gone);
    close.push(gone);
    for (const p of shuffle(atTable(sim, gone), rng)) {
      const n = counts().find((t) => freeSeats(sim, t.n, seats).length)?.n;
      move(p, { table: n, seat: pick(freeSeats(sim, n, seats), rng) }, 'break');
    }
  }

  for (;;) {
    const list = counts();
    const low = list[0];
    const high = list.at(-1);
    if (!low || high.count - low.count < 2) break;
    move(pick(atTable(sim, high.n), rng), { table: low.n, seat: pick(freeSeats(sim, low.n, seats), rng) }, 'balance');
  }
  return { moves, close, final: false };
}

// Carries out the moves (after the organiser has moved the people).
export function applyMoves(players, tables, { moves, close }) {
  const to = new Map(moves.map((m) => [m.id, m.to]));
  return {
    players: players.map((p) => (to.has(p.id) ? { ...p, ...to.get(p.id) } : p)),
    tables: tables.map((t) => (close.includes(t.n) ? { ...t, open: false } : t)),
  };
}

// Swaps two seats by hand (or moves a player to an empty seat).
export function swapSeats(players, a, b) {
  const pa = players.find((p) => p.status === 'in' && p.table === a.table && p.seat === a.seat);
  const pb = players.find((p) => p.status === 'in' && p.table === b.table && p.seat === b.seat);
  return players.map((p) => {
    if (p === pa) return { ...p, ...b };
    if (p === pb) return { ...p, ...a };
    return p;
  });
}

// Where the seats go on the drawn table: a stadium (an oval with straight
// sides) in a box `aspect` times as wide as it is tall, its edge `inset` (a
// share of the height) in from the box. Seat 1 is at the bottom middle, the
// dealer's view, then clockwise. Spaced evenly along the edge, not by angle,
// so the long sides don't crowd. Returns [{ seat, x, y }] in percent of the box.
export function seatPositions(seats, aspect = 1.5, inset = 0.14) {
  const r = 0.5 - inset;
  const h = Math.max(0, aspect / 2 - inset - r); // half the straight side
  const cx = aspect / 2;
  const cy = 0.5;
  const perimeter = 4 * h + 2 * Math.PI * r;
  const at = (s) => {
    if (s < h) return [cx - s, cy + r];
    s -= h;
    if (s < Math.PI * r) return [cx - h - r * Math.sin(s / r), cy + r * Math.cos(s / r)];
    s -= Math.PI * r;
    if (s < 2 * h) return [cx - h + s, cy - r];
    s -= 2 * h;
    if (s < Math.PI * r) return [cx + h + r * Math.sin(s / r), cy - r * Math.cos(s / r)];
    return [cx + h - (s - Math.PI * r), cy + r];
  };
  return Array.from({ length: seats }, (_, i) => {
    const [x, y] = at((i * perimeter) / seats);
    return { seat: i + 1, x: (100 * x) / aspect, y: 100 * y };
  });
}

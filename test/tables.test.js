import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seatAll, seatOne, plan, applyMoves, swapSeats, freeSeats, seatPositions, dealerSpot } from '../js/tables.js';

// A predictable "random"
const seq = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, status: 'in' }));
const sizes = (players, tables) => tables.filter((t) => t.open).map((t) => players.filter((p) => p.status === 'in' && p.table === t.n).length);

test('the first draw evens out the tables', () => {
  const { tables, players } = seatAll(people(20), 9, true, seq());
  assert.equal(tables.length, 3);
  assert.deepEqual(sizes(players, tables).sort(), [6, 7, 7]);
  for (const t of tables) {
    const seats = players.filter((p) => p.table === t.n).map((p) => p.seat);
    assert.equal(new Set(seats).size, seats.length, 'no two in one seat');
    assert.ok(seats.every((s) => s >= 1 && s <= 9));
  }
});

test('without random seats: in order', () => {
  const { players } = seatAll(people(3), 9, false);
  assert.deepEqual(players.map((p) => [p.table, p.seat]), [[1, 1], [1, 2], [1, 3]]);
});

test('balancing moves one from the fullest to the emptiest', () => {
  let { tables, players } = seatAll(people(16), 8, true, seq()); // 8 + 8
  const t2 = players.filter((p) => p.table === 2).slice(0, 2).map((p) => p.id);
  players = players.map((p) => (t2.includes(p.id) ? { ...p, status: 'out' } : p)); // 8 + 6
  const r = plan(players, tables, 8, seq(3));
  assert.equal(r.moves.length, 1);
  assert.equal(r.moves[0].from.table, 1);
  assert.equal(r.moves[0].to.table, 2);
  assert.equal(r.moves[0].reason, 'balance');
  const after = applyMoves(players, tables, r);
  assert.deepEqual(sizes(after.players, after.tables), [7, 7]);
  assert.equal(plan(after.players, after.tables, 8).moves.length, 0);
});

test('breaking a table when one fewer is enough', () => {
  let { tables, players } = seatAll(people(21), 9, true, seq()); // 7 + 7 + 7
  const out = players.filter((p) => p.table === 3).slice(0, 4).map((p) => p.id);
  players = players.map((p) => (out.includes(p.id) ? { ...p, status: 'out' } : p)); // 17 left: fits at 2 tables
  const r = plan(players, tables, 9, seq(5));
  assert.deepEqual(r.close, [3]);
  assert.ok(r.moves.every((m) => m.from.table === 3 && m.reason === 'break'));
  const after = applyMoves(players, tables, r);
  assert.deepEqual(sizes(after.players, after.tables).sort(), [8, 9]);
});

test('final table', () => {
  let { tables, players } = seatAll(people(12), 9, true, seq()); // 6 + 6
  players = players.map((p, i) => (i < 3 ? { ...p, status: 'out' } : p)); // 9 left
  const r = plan(players, tables, 9, seq(7));
  assert.equal(r.final, true);
  assert.equal(r.moves.length, 9);
  assert.ok(r.moves.every((m) => m.to.table === 1));
  assert.equal(new Set(r.moves.map((m) => m.to.seat)).size, 9);
  assert.deepEqual(r.close, [2]);
});

test('a late entry sits at the emptiest table, or a new one', () => {
  const { tables, players } = seatAll(people(5), 3, true, seq()); // 3 + 2
  const s = seatOne(players, tables, 3, seq());
  assert.equal(s.table, 2);
  assert.ok(freeSeats(players, 2, 3).includes(s.seat));
  const full = seatAll(people(6), 3, true, seq());
  assert.equal(seatOne(full.players, full.tables, 3, seq()).table, 3);
});

test('swapping seats by hand', () => {
  const { players } = seatAll(people(2), 9, false);
  const swapped = swapSeats(players, { table: 1, seat: 1 }, { table: 1, seat: 5 });
  assert.deepEqual(swapped.map((p) => p.seat), [5, 2]);
});

test('seats round the drawn table', () => {
  const aspect = 1.5;
  for (let n = 2; n <= 12; n++) {
    const spots = seatPositions(n, aspect);
    assert.equal(spots.length, n);
    assert.ok(spots.every((s) => s.x > 0 && s.x < 100 && s.y > 0 && s.y < 100), `inside the box with ${n}`);
    // Neighbours about the same distance apart (in real proportions)
    const gaps = spots.map((s, i) => {
      const t = spots[(i + 1) % n];
      return Math.hypot(((t.x - s.x) * aspect) / 100, (t.y - s.y) / 100);
    });
    if (n >= 4) assert.ok(Math.min(...gaps) / Math.max(...gaps) > 0.8, `even with ${n}: ${gaps}`);
  }
  const [one, two] = seatPositions(9, aspect);
  assert.deepEqual([Math.round(one.x), Math.round(one.y)], [50, 86], 'seat 1 at the bottom middle');
  assert.ok(two.x < one.x, 'then clockwise, to the left');
});

test('seats round a table with a dealer', () => {
  const dealer = dealerSpot();
  for (let n = 2; n <= 12; n++) {
    const spots = seatPositions(n, 1.5, 0.14, true);
    assert.equal(spots.length, n);
    const gap = Math.min(...spots.map((s) => Math.hypot(((s.x - dealer.x) * 1.5) / 100, (s.y - dealer.y) / 100)));
    const between = Math.hypot(((spots[1].x - spots[0].x) * 1.5) / 100, (spots[1].y - spots[0].y) / 100);
    if (n >= 4) assert.ok(gap > between * 0.8, `room for the dealer with ${n}`);
  }
  const spots = seatPositions(9, 1.5, 0.14, true);
  assert.ok(spots[0].x > 50 && spots[0].y < 50, 'seat 1 on the dealer’s left: top, right of the middle');
  assert.ok(spots[8].x < 50 && spots[8].y < 50, 'the last seat on the dealer’s right');
});

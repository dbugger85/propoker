// The money: what each player owes, the prize pool, paid places and the
// prizes, and who sends money to whom at the end. No DOM code here.

export const CURRENCIES = ['NOK', 'SEK', 'DKK', 'EUR', 'USD', 'GBP'];

// What one player has bought: buy-in, rebuys and the add-on.
export const owed = (p, s) => s.buyIn + p.rebuys * s.rebuy.price + (p.addOn ? s.addOn.price : 0);
// What they have paid so far (nobody has at the start). Older saves had only paid: true/false.
export const paidOf = (p, s) => p.paidIn ?? (p.paid ? owed(p, s) : 0);
// What they still have to pay: after a rebuy they owe again.
export const dueOf = (p, s) => Math.max(0, owed(p, s) - paidOf(p, s));

export function totals(players, s) {
  const moneyIn = players.reduce((sum, p) => sum + owed(p, s), 0);
  const fees = players.length * (s.fee || 0);
  const collected = players.reduce((sum, p) => sum + Math.min(paidOf(p, s), owed(p, s)), 0);
  return { moneyIn, fees, pool: Math.max(0, moneyIn - fees), collected, unpaid: moneyIn - collected };
}

// Settling up with the fewest transfers (like sending with Vipps). `balances`
// is [{ id, amount }]: plus receives, minus pays. The biggest payer pays the
// biggest receiver first, then on down the lists. Returns [{ from, to, amount }].
export function transfers(balances) {
  const pay = balances.filter((b) => b.amount < 0).map((b) => ({ id: b.id, left: -b.amount })).sort((a, b) => b.left - a.left);
  const get = balances.filter((b) => b.amount > 0).map((b) => ({ id: b.id, left: b.amount })).sort((a, b) => b.left - a.left);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < pay.length && j < get.length) {
    const amount = Math.min(pay[i].left, get[j].left);
    if (amount > 0) out.push({ from: pay[i].id, to: get[j].id, amount });
    pay[i].left -= amount;
    get[j].left -= amount;
    if (pay[i].left <= 0) i++;
    if (get[j].left <= 0) j++;
  }
  return out;
}

// Paid places by the number of players (not rebuys): about one in five to seven.
export function autoPlaces(entrants) {
  const steps = [[40, 7], [30, 6], [21, 5], [14, 4], [8, 3], [5, 2]];
  return steps.find(([min]) => entrants >= min)?.[1] ?? 1;
}

export const PERCENTS = {
  1: [100],
  2: [65, 35],
  3: [50, 30, 20],
  4: [45, 27, 18, 10],
  5: [40, 25, 16, 11, 8],
  6: [38, 23, 15, 10, 8, 6],
  7: [35, 22, 14, 10, 8, 6, 5],
};

// Each prize rounded down to `roundTo`; what's left goes to first place, so the prizes add up to the pool.
export function split(pool, percents, roundTo = 10) {
  const r = roundTo > 0 ? roundTo : 1;
  const prizes = percents.map((pc) => Math.floor((pool * pc) / 100 / r) * r);
  if (prizes.length) prizes[0] += pool - prizes.reduce((a, b) => a + b, 0);
  return prizes;
}

// The prizes for 1st, 2nd, 3rd… The payouts setting is one of:
//   auto:    places and percentages from the tables above (one place fewer while the last would win less than a buy-in)
//   percent: your own percentages
//   fixed:   fixed amounts for 2nd, 3rd… and the rest to the winner
export function prizes(pool, entrants, payouts, buyIn) {
  const roundTo = payouts.roundTo ?? 10;
  if (payouts.mode === 'fixed') {
    const fixed = (payouts.fixed ?? []).slice(0, Math.max(0, entrants - 1)).map((a) => Math.max(0, a || 0));
    return [pool - fixed.reduce((a, b) => a + b, 0), ...fixed];
  }
  if (payouts.mode === 'percent') {
    const percents = (payouts.percents ?? [100]).slice(0, Math.max(1, entrants));
    return split(pool, percents, roundTo);
  }
  let places = Math.min(autoPlaces(entrants), Math.max(1, entrants));
  let result = split(pool, PERCENTS[places], roundTo);
  while (payouts.minCash !== false && places > 1 && result.at(-1) < buyIn) {
    places--;
    result = split(pool, PERCENTS[places], roundTo);
  }
  return result;
}

// What's wrong with the payouts, in plain words (or '' when fine). Used by the editor.
export function payoutProblem(pool, payouts) {
  if (payouts.mode === 'percent') {
    const sum = (payouts.percents ?? []).reduce((a, b) => a + (b || 0), 0);
    if (Math.abs(sum - 100) > 0.001) return { code: 'percent', diff: Math.round((100 - sum) * 100) / 100 };
  }
  if (payouts.mode === 'fixed') {
    const sum = (payouts.fixed ?? []).reduce((a, b) => a + (b || 0), 0);
    if (sum > pool) return { code: 'fixed', diff: sum - pool };
  }
  return null;
}

// Thousands are split by a space that never wraps (owner's wish): 10 000.
const NBSP = '\u00a0';
export const groupDigits = (n) => `${n < 0 ? '−' : ''}${String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}`;

// Money: always the currency code first, then the amount, in every language (owner's wish): NOK 1 000.
export const formatMoney = (amount, currency = 'NOK') => `${amount < 0 ? '−' : ''}${currency}${NBSP}${groupDigits(Math.abs(amount))}`;

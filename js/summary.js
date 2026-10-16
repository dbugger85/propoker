// The end of the night: results, settle-up and the text for the group chat.
// No DOM code here; the words and money format come from the app.

import { prizeOf, knockouts, money, player } from './tournament.js';
import { owed, paidOf, dueOf, transfers } from './money.js';

// Everyone by place (players still in without a place last, in seat order).
export function results(t) {
  return [...t.players]
    .sort((a, b) => (a.place ?? 1e9) - (b.place ?? 1e9))
    .map((p) => ({ id: p.id, name: p.name, place: p.place, prize: prizeOf(t, p), left: p.status === 'left', outBy: (p.outBy && player(t, p.outBy)?.name) || null, paid: paidOf(p, t.settings), owed: owed(p, t.settings), net: prizeOf(t, p) - owed(p, t.settings), rebuys: p.rebuys, addOn: p.addOn, knockouts: knockouts(t, p.id) }));
}

// Who sends money to whom at the end, with the fewest transfers. Money already
// paid in is with `holder`: a player's id, or BANK (someone not playing), who
// pays it out. Everyone else: their prize minus what they still owe.
export const BANK = 'bank';
export function settlement(t, holder = t.settings.holder ?? BANK) {
  const s = t.settings;
  const m = money(t);
  const balances = t.players.map((p) => ({ id: p.id, amount: prizeOf(t, p) - dueOf(p, s) }));
  // The holder pays out what was paid in, keeping the house fee
  const held = m.collected - m.fees;
  const own = balances.find((b) => b.id === holder);
  if (own) own.amount -= held;
  else balances.push({ id: BANK, amount: -held });
  return transfers(balances.map((b) => ({ ...b, amount: Math.round(b.amount) })));
}

export function mostKnockouts(t) {
  const best = Math.max(0, ...t.players.map((p) => knockouts(t, p.id)));
  return best ? { count: best, names: t.players.filter((p) => knockouts(t, p.id) === best).map((p) => p.name) } : null;
}

const MEDALS = ['🥇', '🥈', '🥉'];

// tr(text, vars) translates; cash(amount) formats money; when is the date as text.
export function shareText(t, { tr, cash, when }) {
  const rows = results(t);
  const m = money(t);
  const lines = [`♠ ${t.settings.name || tr('Poker night')} – ${when}`, ''];
  // The full ranking, with the prize for those who won one
  for (const r of rows) lines.push(`${MEDALS[r.place - 1] ?? `${r.place ?? '–'}.`} ${r.name}${r.prize > 0 ? `: ${cash(r.prize)}` : ''}`);
  if (t.deal) lines.push(tr('(Deal between the last {n})', { n: Object.keys(t.deal).length }));
  lines.push('', tr('{n} players, prize pool {pool}', { n: t.players.length, pool: cash(m.pool) }));
  const rebuys = t.players.reduce((s, p) => s + p.rebuys, 0);
  const addOns = t.players.filter((p) => p.addOn).length;
  if (rebuys || addOns) lines.push(tr('Rebuys: {r}, add-ons: {a}', { r: rebuys, a: addOns }));
  if (m.fees) lines.push(tr('House fee: {fee}', { fee: cash(m.fees) }));
  const ko = mostKnockouts(t);
  if (ko) lines.push(tr('Most knockouts: {names} ({n})', { names: ko.names.join(', '), n: ko.count }));
  const moves = settlement(t);
  const nameOf = (id) => (id === BANK ? tr('The bank') : t.players.find((p) => p.id === id)?.name);
  lines.push('', tr('Settle up:'));
  if (!moves.length) lines.push(tr('Everyone is square'));
  for (const x of moves) lines.push(`${nameOf(x.from)} → ${nameOf(x.to)}: ${cash(x.amount)}`);
  return lines.join('\n');
}

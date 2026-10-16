// The end of the night: results, settle-up and the text for the group chat.
// No DOM code here; the words and money format come from the app.

import { prizeOf, knockouts, money } from './tournament.js';
import { owed } from './money.js';

// Everyone by place (players still in without a place last, in seat order).
export function results(t) {
  return [...t.players]
    .sort((a, b) => (a.place ?? 1e9) - (b.place ?? 1e9))
    .map((p) => ({ id: p.id, name: p.name, place: p.place, prize: prizeOf(t, p), paid: owed(p, t.settings), net: prizeOf(t, p) - owed(p, t.settings), rebuys: p.rebuys, addOn: p.addOn, knockouts: knockouts(t, p.id) }));
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
  for (const r of rows.filter((r) => r.prize > 0)) lines.push(`${MEDALS[r.place - 1] ?? `${r.place}.`} ${r.name}: ${cash(r.prize)}`);
  if (t.deal) lines.push(tr('(Deal between the last {n})', { n: Object.keys(t.deal).length }));
  lines.push('', tr('{n} players, prize pool {pool}', { n: t.players.length, pool: cash(m.pool) }));
  const rebuys = t.players.reduce((s, p) => s + p.rebuys, 0);
  const addOns = t.players.filter((p) => p.addOn).length;
  if (rebuys || addOns) lines.push(tr('Rebuys: {r}, add-ons: {a}', { r: rebuys, a: addOns }));
  if (m.fees) lines.push(tr('House fee: {fee}', { fee: cash(m.fees) }));
  const ko = mostKnockouts(t);
  if (ko) lines.push(tr('Most knockouts: {names} ({n})', { names: ko.names.join(', '), n: ko.count }));
  lines.push('', tr('Settle up:'));
  for (const r of [...rows].sort((a, b) => b.net - a.net)) lines.push(`${r.name}: ${r.net > 0 ? '+' : ''}${cash(r.net)}`);
  return lines.join('\n');
}

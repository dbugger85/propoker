import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickSettings, encodeSettings, decodeSettings, applySettings, encodeTournament, decodeTournament } from '../js/share.js';
import * as T from '../js/tournament.js';
import { DEFAULT_SETUP } from '../js/storage.js';
import { buildLevels } from '../js/blinds.js';

const mine = () => ({ ...structuredClone(DEFAULT_SETUP), levels: buildLevels(DEFAULT_SETUP), name: 'Friday', players: [{ id: 'a', name: 'Nora' }, { id: 'b', name: 'Emil' }], knownNames: ['Ola'] });

test('settings through a link and back', async () => {
  const s = mine();
  s.buyIn = 300;
  s.chipSet[0].have = 150;
  const code = await encodeSettings(pickSettings(s));
  assert.match(code, /^[zj][A-Za-z0-9_-]+$/, 'safe in an address');
  assert.ok(code.length < 1200, `short enough: ${code.length}`);
  const back = await decodeSettings(code);
  assert.equal(back.buyIn, 300);
  assert.deepEqual(back.players, ['Nora', 'Emil'], 'the names come along');
  assert.equal(back.name, undefined, 'not the name');
  assert.equal(back.chipSet[0].have, null, 'not how many chips you own');
  assert.deepEqual(back.levels, s.levels);
});

test('with players, and into someone else’s setup', async () => {
  const shared = await decodeSettings(await encodeSettings(pickSettings(mine(), true)));
  assert.deepEqual(shared.players, ['Nora', 'Emil']);
  const theirs = { ...structuredClone(DEFAULT_SETUP), name: 'Their night', players: [{ id: 'x', name: 'Kari' }], knownNames: ['Kari'] };
  theirs.chipSet[0].have = 99;
  const next = applySettings(theirs, shared);
  assert.equal(next.name, 'Their night', 'their name stays');
  assert.equal(next.chipSet[0].have, 99, 'what they own stays');
  assert.deepEqual(next.players.map((p) => p.name), ['Nora', 'Emil']);
  assert.deepEqual(next.knownNames, ['Nora', 'Emil', 'Kari']);
  const without = applySettings(theirs, await decodeSettings(await encodeSettings(pickSettings(mine(), false))));
  assert.deepEqual(without.players.map((p) => p.name), ['Kari'], 'their players stay when the link has none');
});

test('a broken link', async () => {
  assert.equal(await decodeSettings('zNOTVALID'), null);
  assert.equal(await decodeSettings(''), null);
  assert.equal(await decodeSettings('j' + btoa('{"v":2}')), null);
});

test('a running tournament to another device', async () => {
  const s = mine();
  s.players = Array.from({ length: 14 }, (_, i) => ({ id: `p${i}`, name: `Player number ${i}` }));
  const t = T.createTournament(s, 1000);
  T.knockOut(t, 'p3', 'p4', 2000);
  T.pay(t, 'p5', 200);
  t.clock = { levelIndex: 3, levelMs: 120000, runningSince: 5000 };
  const code = await encodeTournament(t);
  assert.ok(code.length < 4000, `fits in a link: ${code.length}`);
  const back = await decodeTournament(code);
  assert.deepEqual(back.clock, t.clock);
  assert.deepEqual(back.players, t.players);
  assert.deepEqual(back.history, [], 'not the undo history');
  assert.equal(await decodeTournament(await encodeSettings(pickSettings(s))), null, 'a settings link is not a tournament');
});

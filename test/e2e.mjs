// Browser test of a whole tournament, on a phone-sized screen, plus a tablet sideways.
//
//   npm install && npm run e2e                               # tests local files
//   BASE_URL=https://dbugger85.github.io/propoker/ npm run e2e   # tests the live site
//
// Needs Chromium (CHROMIUM=/path/to/chromium if not /usr/bin/chromium).
// Screenshots go to test/screenshots/ (ignored by git).

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = fileURLToPath(new URL('./screenshots', import.meta.url));
mkdirSync(shots, { recursive: true });

let server = null;
let base = process.env.BASE_URL;
if (!base) {
  server = spawn('python3', ['-m', 'http.server', '8775', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  base = 'http://127.0.0.1:8775/';
  for (let i = 0; i < 50; i++) {
    try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
}

const NAMES = ['Anna', 'Ben', 'Carl', 'Dana', 'Erik', 'Fia', 'Gro', 'Hans', 'Ida', 'Jon', 'Kari', 'Lars'];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium' });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const nativeDialogs = [];
  page.on('dialog', (d) => { nativeDialogs.push(d.type()); d.dismiss(); }); // the app should only use its own popups
  const shot = (name, fullPage = true) => page.waitForTimeout(300).then(() => page.screenshot({ path: `${shots}/${name}.png`, fullPage }));
  const game = () => page.evaluate(() => JSON.parse(localStorage.getItem('propoker.tournament')));
  const text = async (sel) => (await page.textContent(sel)).replace(/\s/g, ' ');
  const isOpen = (id) => page.$eval(`#${id}`, (d) => d.open);
  const toPage = async (i) => { await page.click(`#page-dots button[data-page="${i}"]`); await page.waitForTimeout(500); };

  await page.goto(base + '?lang=en');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('propoker.installHidden', '1'); });
  await page.reload();
  await shot('1-home');

  // Setup: 12 players, 6 seats a table, fixed payouts
  await page.click('#new-btn');
  for (const n of NAMES) {
    await page.fill('#new-player-name', n);
    await page.press('#new-player-name', 'Enter');
  }
  assert.equal(await page.$$eval('#s-players li', (l) => l.length), 12);
  await page.fill('#s-seats', '6');
  assert.equal(await page.textContent('#s-tables-note'), '12 players at 2 tables');
  await page.click('#s-presets button:has-text("Turbo")');
  assert.equal(await page.inputValue('#s-minutes'), '12');
  await page.click('#s-presets button:has-text("Standard")');
  assert.match(await page.textContent('#s-levels li:first-child'), /50 \/ 100/);

  await page.click('#s-edit-payouts');
  await page.click('#p-modes button:has-text("Fixed amounts")');
  await page.fill('#p-rows input >> nth=0', '500');
  await page.fill('#p-rows input >> nth=1', '200');
  assert.deepEqual(await page.$$eval('#p-preview .amount', (a) => a.map((x) => x.textContent.replace(/\s/g, ' '))), ['NOK 1 700', 'NOK 500', 'NOK 200']);
  await shot('2-payouts', false);
  await page.click('#p-done');
  await shot('3-setup');

  await page.click('#start-btn');
  await page.waitForSelector('#ask-dialog[open]');
  assert.equal(await page.textContent('#ask-title'), 'The seat draw');
  await shot('4-draw', false);
  await page.click('#ask-ok');
  let g = await game();
  assert.equal(g.tables.length, 2);
  assert.deepEqual([1, 2].map((n) => g.players.filter((p) => p.table === n).length), [6, 6]);

  // The clock
  assert.equal(await page.textContent('#c-pause'), 'Start the clock');
  await page.click('#c-pause');
  assert.equal(await page.textContent('#c-pause'), 'Pause');
  await shot('5-clock');
  // 21 minutes later (as if the phone was locked): level 2
  await page.evaluate(() => {
    const t = JSON.parse(localStorage.getItem('propoker.tournament'));
    t.clock.runningSince -= 21 * 60000;
    localStorage.setItem('propoker.tournament', JSON.stringify(t));
  });
  await page.reload();
  await page.waitForTimeout(700);
  assert.equal(await page.textContent('#c-level'), 'Level 2');
  assert.equal(await page.textContent('#c-blinds'), '100 / 200');
  assert.match(await page.textContent('#c-count'), /^1[89]:\d\d$/);
  await page.click('#c-skip');
  assert.equal(await page.isVisible('#overlay'), true);
  assert.equal(await page.textContent('#ov-main'), '150 / 300');
  await shot('6-new-level', false);
  await page.click('#overlay');
  await page.click('#c-back'); // restarts level 3? less than 10 s run: back to level 2
  assert.equal(await page.textContent('#c-level'), 'Level 2');

  // Swap two players by hand, across tables
  await toPage(2);
  g = await game();
  const a = g.players.find((p) => p.table === 1);
  const b = g.players.find((p) => p.table === 2);
  await page.click(`#tables-grid .table-card:nth-child(1) .seats button:nth-child(${a.seat})`);
  assert.match(await page.textContent('#tables-tip'), new RegExp(a.name));
  await page.click(`#tables-grid .table-card:nth-child(2) .seats button:nth-child(${b.seat})`);
  g = await game();
  assert.deepEqual([g.players.find((p) => p.id === a.id).table, g.players.find((p) => p.id === b.id).table], [2, 1]);
  await shot('7-tables');
  // And to an empty seat at the same table
  const empty = [1, 2, 3, 4, 5, 6].find((s) => !g.players.some((p) => p.table === 1 && p.seat === s));
  assert.equal(empty, undefined, 'six players, six seats');

  // Players: a rebuy, a knockout with Undo
  await toPage(1);
  await page.click('#in-list li:first-child button');
  await page.click('#action-buttons button:has-text("Rebuy")');
  assert.match(await page.textContent('#toast-text'), /Rebuy for/);
  await page.click('#in-list li:first-child button');
  await page.click('#action-buttons button:has-text("Knocked out")');
  await page.waitForSelector('#ask-dialog[open]');
  assert.match(await page.textContent('#ask-title'), /^Rebuy for/);
  await page.click('#ask-cancel'); // No, out
  await page.waitForSelector('#pick-dialog[open]');
  await page.click('#pick-list li:first-child button');
  assert.match(await page.textContent('#toast-text'), /is out in 12th/);
  await shot('8-players');
  await page.click('#toast-action'); // Undo
  assert.equal(await page.$$eval('#in-list li', (l) => l.length), 12);

  // Money: the pool, paying
  await toPage(3);
  assert.match(await text('#m-facts'), /NOK 2 600/);
  await page.click('#m-payments li:first-child button');
  assert.match(await page.textContent('#m-unpaid'), /11 owe/);
  await shot('9-money');

  // Knock out from table 1 until the tables need moves; carry them out
  await toPage(1);
  const knockOut = async () => {
    await page.click('#in-list li:first-child button');
    await page.click('#action-buttons button:has-text("Knocked out")');
    await page.waitForTimeout(150);
    if (await isOpen('ask-dialog')) await page.click('#ask-cancel');
    await page.waitForTimeout(150);
    if (await isOpen('pick-dialog')) await page.click('#pick-skip');
    await page.waitForTimeout(250);
  };
  const seen = new Set();
  for (let left = 12; left > 1; left--) {
    if (await page.isVisible('#screen-summary')) break;
    await knockOut();
    if (await isOpen('moves-dialog')) {
      const title = await page.textContent('#moves-title');
      if (!seen.has(title)) await shot(`10-moves-${seen.size}`, false);
      seen.add(title);
      await page.click('#moves-done');
      g = await game();
      const open = g.tables.filter((t) => t.open).map((t) => g.players.filter((p) => p.status === 'in' && p.table === t.n).length);
      assert.ok(Math.max(...open) - Math.min(...open) <= 1, `tables even after "${title}": ${open}`);
    }
  }
  assert.ok(seen.has('Balance the tables'), 'balanced once');
  assert.ok(seen.has('Final table!'), 'reached the final table');
  g = await game();
  assert.equal(g.tables.filter((t) => t.open).length, 1);

  // The end
  await page.waitForSelector('#screen-summary:not([hidden])');
  assert.match(await page.textContent('#sum-title'), /wins!$/);
  assert.equal(await page.$$eval('#sum-results li', (l) => l.length), 12);
  assert.deepEqual(await page.$$eval('#sum-results .amount', (a) => a.map((x) => x.textContent.replace(/\s/g, ' '))), ['NOK 1 900', 'NOK 500', 'NOK 200']);
  await shot('11-summary');
  await page.click('#sum-undo');
  assert.equal(await page.isVisible('#screen-game'), true);
  assert.equal((await game()).finished, false);
  await knockOut();
  await page.waitForSelector('#screen-summary:not([hidden])');

  // Back home: the last tournament
  await page.click('#sum-new');
  await page.click('#ask-ok');
  assert.equal(await page.isVisible('#screen-setup'), true);
  assert.equal(await page.$$eval('#s-players li', (l) => l.length), 12, 'same players again');
  await page.click('#setup-back');
  assert.equal(await page.isVisible('#last-card'), true);

  // A deal: end early with three left
  await page.click('#new-btn');
  await page.click('#start-btn');
  await page.click('#ask-ok');
  for (let i = 0; i < 9; i++) {
    await knockOut();
    if (await isOpen('moves-dialog')) await page.click('#moves-done');
  }
  await page.click('#settings-btn');
  await page.click('#g-end');
  await page.waitForSelector('#deal-dialog[open]');
  assert.equal(await page.$$eval('#deal-rows input', (l) => l.length), 3);
  await page.fill('#deal-rows input >> nth=0', '1');
  assert.match(await text('#deal-error'), /not NOK 2 400/);
  await page.fill('#deal-rows input >> nth=0', String(2400 - 1100 - 800 + 300));
  await page.fill('#deal-rows input >> nth=1', '700');
  await page.fill('#deal-rows input >> nth=2', '900');
  assert.equal(await text('#deal-error'), '');
  await shot('12-deal', false);
  await page.click('#deal-ok');
  await page.waitForSelector('#screen-summary:not([hidden])');

  // Tablet sideways: the clock and a side panel
  const tab = await browser.newPage({ viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  tab.on('pageerror', (e) => errors.push(e.message));
  await tab.goto(base + '?lang=en');
  await tab.evaluate(() => { localStorage.clear(); localStorage.setItem('propoker.installHidden', '1'); });
  await tab.reload();
  await tab.click('#new-btn');
  for (const n of NAMES.slice(0, 8)) {
    await tab.fill('#new-player-name', n);
    await tab.press('#new-player-name', 'Enter');
  }
  await tab.click('#start-btn');
  await tab.click('#ask-ok');
  assert.equal(await tab.$eval('body', (b) => b.classList.contains('wide')), true);
  await tab.click('#panel-tabs button:has-text("Tables")');
  assert.equal(await tab.isVisible('#page-tables'), true);
  assert.equal(await tab.isVisible('#page-players'), false);
  await tab.screenshot({ path: `${shots}/13-tablet.png` });

  // Norwegian
  await tab.goto(base + '?lang=no');
  assert.equal(await tab.textContent('#c-pause'), 'Start klokka');
  await tab.screenshot({ path: `${shots}/14-tablet-no.png` });

  assert.deepEqual(errors, []);
  assert.deepEqual(nativeDialogs, []);
  console.log('e2e passed');
} finally {
  await browser.close();
  server?.kill();
}

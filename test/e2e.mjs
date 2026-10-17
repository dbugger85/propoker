// Browser test of a whole tournament, on a phone-sized screen, plus a tablet sideways.
//
//   npm install && npm run e2e                               # tests local files
//   BASE_URL=https://dbugger85.github.io/propoker/ npm run e2e   # tests the live site
//
// Needs Chromium (CHROMIUM=/path/to/chromium if not /usr/bin/chromium).
// Screenshots go to test/screenshots/ (ignored by git).

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
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
  // Number boxes split the thousands as you type
  await page.fill('#s-chips', '');
  await page.type('#s-chips', '15000');
  assert.equal(await page.inputValue('#s-chips'), '15\u00a0000');
  assert.equal(await page.inputValue('#s-rebuy-chips'), '15\u00a0000', 'rebuy chips follow');
  await page.fill('#s-chips', '10000');
  assert.equal(await page.inputValue('#s-chips'), '10\u00a0000');
  // Typing a chip value keeps the same box (the keyboard stays), and the chips sort when you leave it
  const firstValue = page.locator('#s-chipset .chip-row:nth-child(1) [data-field="value"]');
  await firstValue.fill('');
  await firstValue.type('5000');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.field), 'value', 'still typing in the same box');
  await page.click('#s-chipset .chip-row:nth-child(2) [data-field="have"]');
  await page.waitForTimeout(100);
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('propoker.setup')).chipSet.map((c) => c.value)), [100, 500, 1000, 5000], 'sorted by value');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.field), 'have', 'the box tapped keeps the focus');
  await page.locator('#s-chipset .chip-row:nth-child(4) [data-field="value"]').fill('25');
  await page.click('#s-name');
  await page.waitForTimeout(100);
  // Chips out of order (as from an older version): "Sort by value" shows, and sorts them
  assert.equal(await page.isVisible('#s-sort-chips'), false, 'in order: no button');
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('propoker.setup')); s.chipSet.reverse(); localStorage.setItem('propoker.setup', JSON.stringify(s)); });
  await page.reload();
  await page.click('#t-list li button.open'); // the tournament being set up, from the main menu
  await page.click('#s-sort-chips');
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('propoker.setup')).chipSet.map((c) => c.value)), [25, 100, 500, 1000]);
  assert.equal(await page.isVisible('#s-sort-chips'), false);
  // Your own starting stack
  await page.click('#s-stacks button:has-text("Choose the chips")');
  await page.fill('#stack-rows input >> nth=0', '10');
  await page.fill('#stack-rows input >> nth=1', '10');
  await page.fill('#stack-rows input >> nth=2', '4');
  await page.fill('#stack-rows input >> nth=3', '6');
  assert.match(await text('#stack-total'), /9 250/);
  await page.click('#stack-save');
  assert.equal(await page.inputValue('#s-chips'), '9\u00a0250');
  assert.match(await text('#s-stacks'), /10 × 25/);
  await page.click('#s-stacks button:has-text("Your own chips")');
  await page.click('#stack-auto');
  await page.fill('#s-chips', '10000');
  // A chip in your own colour, from the phone's colour picker
  await page.click('#s-chipset .chip-row:nth-child(2) button.picker');
  await page.click('#pick-list button:has-text("Own colour")');
  await page.$eval('#color-input', (e) => { e.value = '#12ab34'; e.dispatchEvent(new Event('change')); });
  assert.equal(await page.$eval('#s-chipset .chip-row:nth-child(2) circle', (c) => c.getAttribute('fill')), '#12ab34');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('propoker.setup')).chipSet[1].color), '#12ab34');
  // The level popup: big blind first; the ante can follow it
  await page.click('#s-levels li:nth-child(2) button');
  assert.equal(await page.evaluate(() => document.querySelector('#level-blind-fields input').id), 'l-bb');
  await page.click('#l-ante-bb');
  assert.equal(await page.inputValue('#l-ante'), '200');
  await page.fill('#l-bb', '');
  await page.type('#l-bb', '300');
  assert.equal(await page.inputValue('#l-ante'), '300', 'a BB ante follows the big blind');
  assert.equal(await page.inputValue('#l-sb'), '150');
  await page.click('#l-cancel');
  await page.click('#s-presets button:has-text("Turbo")');
  assert.equal(await page.inputValue('#s-minutes'), '12');
  await page.click('#s-presets button:has-text("Standard")');
  assert.match(await page.textContent('#s-levels li:first-child'), /50 \/ 100/);
  // Your own levels: editing one makes it Custom; a preset is the default again, Custom brings yours back
  const pressed = () => page.textContent('#s-presets button[aria-pressed="true"]');
  await page.click('#s-levels li:first-child button');
  await page.fill('#l-bb', '150');
  await page.click('#level-form button[type="submit"]');
  assert.match(await pressed(), /^Custom/);
  assert.match(await page.textContent('#s-levels li:first-child'), /75 \/ 150/);
  await page.click('#s-presets button:has-text("Standard")');
  assert.match(await page.textContent('#s-levels li:first-child'), /50 \/ 100/, 'back to the default');
  await page.click('#s-presets button:has-text("Custom")');
  assert.match(await page.textContent('#s-levels li:first-child'), /75 \/ 150/, 'your own levels again');
  await page.reload();
  await page.click('#t-list li button.open');
  assert.match(await page.textContent('#s-levels li:first-child'), /75 \/ 150/, 'kept after a reload');
  await page.click('#s-presets button:has-text("Standard")');
  // Drag the first break up, to between level 2 and level 3
  const breakAt = async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('propoker.setup')).levels.findIndex((l) => l.break)));
  assert.equal(await breakAt(), 4);
  await page.$eval('#s-levels li.break', (e) => e.scrollIntoView({ block: 'center' }));
  const grip = await page.locator('#s-levels li.break .drag').first().boundingBox();
  const target = await page.locator('#s-levels li:nth-child(3)').boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  for (let y = grip.y + grip.height / 2; y > target.y + 4; y -= 6) await page.mouse.move(grip.x + grip.width / 2, y);
  await page.mouse.up();
  assert.equal(await breakAt(), 2, 'the break moved up two levels');
  assert.match(await pressed(), /^Custom/);
  assert.match(await page.textContent('#s-levels li:nth-child(4)'), /3\s*150 \/ 300/, 'level 3 comes after the break');
  await page.click('#s-presets button:has-text("Standard")');

  // A tournament length: the blinds are worked out to fit, then back to the plain structure
  await page.click('#s-target button');
  await page.click('#pick-list button:has-text("3 h")');
  assert.match(await page.textContent('#s-length'), /levels of 20 min, 2 h 50 min in all/);
  assert.equal(await page.textContent('#s-target button'), '3 h');
  await shot('2-length', false);
  await page.click('#s-target button');
  await page.click('#pick-list button:has-text("Not set")');
  assert.match(await page.textContent('#s-length'), /The last level repeats/);

  await page.click('#s-edit-payouts');
  await page.click('#p-modes button:text-is("Fixed")');
  await page.fill('#p-rows input >> nth=0', '500');
  await page.fill('#p-rows input >> nth=1', '200');
  assert.deepEqual(await page.$$eval('#p-preview .amount', (a) => a.map((x) => x.textContent.replace(/\s/g, ' '))), ['NOK 1 700', 'NOK 500', 'NOK 200']);
  await shot('2-payouts', false);
  await page.click('#p-done');
  assert.equal(await page.$eval('#screen-setup', (e) => e.innerText.includes('null')), false, 'no "null" on the page');
  await shot('3-setup');

  // Share the settings as a link (with the names), and open it on another phone
  await page.evaluate(() => { navigator.share = async (d) => { window.sharedUrl = d.url; }; });
  await page.click('#share-settings');
  const sharedUrl = await page.waitForFunction(() => window.sharedUrl).then((h) => h.jsonValue());
  assert.match(sharedUrl, /#s=z[A-Za-z0-9_-]+$/);
  const other = await browser.newPage({ viewport: { width: 390, height: 844 } });
  other.on('pageerror', (e) => errors.push(e.message));
  await other.goto(base + '?lang=en');
  await other.evaluate(() => { localStorage.clear(); localStorage.setItem('propoker.installHidden', '1'); });
  await other.goto(sharedUrl.replace(/^.*#/, base + '?lang=en#'));
  await other.waitForSelector('#ask-dialog[open]');
  assert.equal(await other.textContent('#ask-title'), 'Use these settings?');
  await other.click('#ask-ok');
  await other.waitForSelector('#screen-setup:not([hidden])');
  const theirs = await other.evaluate(() => JSON.parse(localStorage.getItem('propoker.setup')));
  const mineNow = await page.evaluate(() => JSON.parse(localStorage.getItem('propoker.setup')));
  assert.deepEqual(theirs.payouts, mineNow.payouts, 'the payouts came along');
  assert.deepEqual(theirs.levels, mineNow.levels, 'and the blinds');
  assert.equal(theirs.seatsPerTable, 6);
  assert.deepEqual(theirs.players.map((p) => p.name), NAMES, 'and the names');
  assert.equal(await other.evaluate(() => location.hash), '', 'the link is used once');
  await other.close();

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
  assert.equal(await page.$$eval('#tables-grid .drawn-table', (l) => l.length), 2, 'drawn tables by default');
  assert.equal(await page.$$eval('#tables-grid .drawn-table:nth-child(1) .seat-marker:not(.empty)', (l) => l.length), 6);
  assert.match(await page.getAttribute(`#tables-grid .drawn-table:nth-child(1) .seat-marker[data-seat="${a.seat}"]`, 'aria-label'), new RegExp(`^Seat ${a.seat}, ${a.name}`));
  await page.click(`#tables-grid .drawn-table:nth-child(1) .seat-marker[data-seat="${a.seat}"]`);
  assert.match(await page.textContent('#tables-tip'), new RegExp(a.name));
  assert.equal(await page.$$eval('#tables-grid .seat-marker.target', (l) => l.length), 11, 'every other seat is ringed');
  await shot('7a-tables-picking');
  await page.click(`#tables-grid .drawn-table:nth-child(2) .seat-marker[data-seat="${b.seat}"]`);
  g = await game();
  assert.deepEqual([g.players.find((p) => p.id === a.id).table, g.players.find((p) => p.id === b.id).table], [2, 1]);
  await shot('7-tables');
  // The list view is still there for those who like it, and remembered
  await page.click('#table-view button:has-text("List")');
  assert.equal(await page.$$eval('#tables-grid .table-card', (l) => l.length), 2);
  assert.equal(await page.evaluate(() => localStorage.getItem('propoker.tableView')), 'grid');
  await shot('7b-tables-list');
  await page.click('#table-view button:has-text("Tables")');
  // The dealer's place, top middle; the cog turns it off (and remembers)
  assert.equal(await page.$$eval('#tables-grid .dealer-spot', (l) => l.length), 2);
  await page.click('#settings-btn');
  // The coming levels with their expected clock times
  assert.match(await page.textContent('#g-levels li.now .lv-time'), /^\d\d:\d\d–\d\d:\d\d$/);
  await page.click('#g-dealer');
  await page.click('#g-done');
  assert.equal(await page.$$eval('#tables-grid .dealer-spot', (l) => l.length), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('propoker.dealer')), '0');
  await page.click('#settings-btn');
  await page.click('#g-dealer');
  await page.click('#g-done');
  // And to an empty seat at the same table
  const empty = [1, 2, 3, 4, 5, 6].find((s) => !g.players.some((p) => p.table === 1 && p.seat === s));
  assert.equal(empty, undefined, 'six players, six seats');

  // Continue on another device: the whole tournament in a link
  await page.evaluate(() => { window.sharedUrl = null; navigator.share = async (d) => { window.sharedUrl = d.url; }; });
  await page.click('#settings-btn');
  await page.click('#g-handover');
  await page.click('#ask-ok');
  const handover = await page.waitForFunction(() => window.sharedUrl).then((h) => h.jsonValue());
  assert.match(handover, /#t=z[A-Za-z0-9_-]+$/);
  const tablet = await browser.newPage({ viewport: { width: 390, height: 844 } });
  tablet.on('pageerror', (e) => errors.push(e.message));
  await tablet.goto(base + '?lang=en');
  await tablet.evaluate(() => { localStorage.clear(); localStorage.setItem('propoker.installHidden', '1'); });
  await tablet.goto(handover.replace(/^.*#/, base + '?lang=en#'));
  await tablet.waitForSelector('#ask-dialog[open]');
  assert.equal(await tablet.textContent('#ask-title'), 'Continue this tournament here?');
  assert.match(await tablet.textContent('#ask-text'), /12 of 12 players left · Level 2/);
  await tablet.click('#ask-ok');
  await tablet.waitForSelector('#screen-game:not([hidden])');
  const there = await tablet.evaluate(() => JSON.parse(localStorage.getItem('propoker.tournament')));
  g = await game();
  assert.deepEqual(there.players, g.players, 'same players and seats');
  assert.deepEqual(there.clock, g.clock, 'same clock');
  assert.equal(await tablet.textContent('#c-level'), await page.textContent('#c-level'));
  await tablet.close();

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

  // Rename during the tournament, with the pencil next to the name
  await page.click('#in-list li:first-child button');
  const oldName = await page.textContent('#action-title span');
  await page.click('#action-title button.rename');
  await page.fill('#ask-input', `${oldName} B`);
  await page.click('#ask-ok');
  assert.ok((await game()).players.some((p) => p.name === `${oldName} B`));
  await page.click('#in-list li:first-child button');
  await page.click('#action-title button.rename');
  await page.fill('#ask-input', oldName);
  await page.click('#ask-ok');

  // Money: the pool, paying
  await toPage(3);
  assert.match(await text('#m-facts'), /NOK 2 600/);
  // Payments: nobody has paid at the start; one pays everything, one pays part
  assert.match(await page.textContent('#m-unpaid'), /12 owe/);
  await page.click('#m-payments li:first-child button');
  await page.click('#action-buttons button:has-text("Paid everything")');
  assert.match(await page.textContent('#m-unpaid'), /11 owe/);
  await page.click('#m-payments li:first-child button');
  await page.click('#action-buttons button:has-text("Paid part")');
  await page.fill('#ask-input', '100');
  await page.click('#ask-ok');
  assert.match(await text('#m-payments'), /paid NOK 100/);
  assert.match(await text('#m-facts'), /Still to pay\s*NOK 2 100/);
  await shot('9-money');

  // Chip counts: skip to the break, count everyone, then a rebuy adds to a stack
  await toPage(0);
  assert.equal(await page.isVisible('#count-btn'), false, 'no count button while playing');
  for (let i = 0; i < 8 && !(await page.$eval('#clock', (c) => c.classList.contains('on-break'))); i++) {
    await page.click('#c-skip');
    await page.click('#overlay');
  }
  assert.equal(await page.textContent('#c-blinds'), 'Break');
  await page.click('#count-btn');
  await page.waitForSelector('#count-dialog[open]');
  const boxes = await page.$$('#count-rows input');
  assert.equal(boxes.length, 12);
  assert.equal(await page.$$eval('#count-rows h3', (h) => h.map((x) => x.textContent)).then((t) => t.join()), 'Table 1,Table 2');
  assert.match(await text('#count-sum'), /12 players not counted yet/);
  g = await game();
  const inPlay = g.players.reduce((s, p) => s + 10000 + p.rebuys * 10000 + (p.addOn ? 15000 : 0), 0);
  await boxes[0].fill('20000');
  await boxes[0].press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), await boxes[1].getAttribute('aria-label'), 'Enter goes to the next box');
  for (const b of boxes.slice(1)) await b.fill('10000');
  assert.match(await text('#count-sum'), /Adds up/);
  await boxes[1].fill('12500');
  assert.match(await text('#count-sum'), /2 500 too many/);
  await boxes[1].fill('8000');
  assert.match(await text('#count-sum'), /2 000 missing/);
  await boxes[1].fill('10000');
  assert.equal(inPlay, 130000);
  await shot('9b-count', false);
  await page.click('#count-save');
  g = await game();
  assert.equal(g.players.filter((p) => p.stack != null).length, 12);
  assert.match(await text('#c-facts'), /Leader: \w+, 20 000/);
  await toPage(1);
  const leaderRow = page.locator('#in-list li:has(.badge.leader)');
  assert.equal(await leaderRow.count(), 1);
  assert.match((await leaderRow.textContent()).replace(/\s/g, " "), /20 000 · \d+ BB/);
  await page.click('#sort-btn');
  assert.equal(await page.locator('#in-list li:first-child .badge.leader').count(), 1, 'sorted by stack');
  await page.click('#sort-btn');
  await shot('9c-stacks');
  await toPage(2);
  assert.equal(await page.$$eval('#tables-grid .seat-marker.leader', (l) => l.length), 1);
  assert.match(await text('#tables-grid .seat-marker.leader .marker-stack'), /20 000/);
  await shot('9d-tables-stacks');
  await toPage(1);
  // A rebuy after the count adds its chips (the rebuy cut-off is passed, so allow it anyway)
  const second = await page.locator('#in-list li:nth-child(2) .name').evaluate((e) => e.firstChild.textContent);
  await page.click('#in-list li:nth-child(2) button');
  await page.click('#action-buttons button:has-text("Rebuy")');
  if (await isOpen('ask-dialog')) await page.click('#ask-ok');
  g = await game();
  assert.equal(g.players.find((p) => p.name === second).stack, 20000);
  await page.click('#toast-action'); // Undo the rebuy
  await page.click('#undo-btn'); // and the count
  g = await game();
  assert.equal(g.players.filter((p) => p.stack != null).length, 0, 'undo removes the count');
  assert.equal(await page.isVisible('#sort-btn'), false);
  // One player's count from their options
  await page.click('#in-list li:first-child button');
  await page.click('#action-buttons button:has-text("Chip count")');
  assert.equal(await page.$$eval('#count-rows input', (l) => l.length), 1);
  await page.keyboard.type('9000');
  await page.click('#count-save');
  assert.match(await text("#in-list li:first-child .sub.stack"), /9 000/);

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
  // Settle up: transfers, and who has the money paid in
  assert.equal(await page.isVisible('#sum-holder'), true);
  const moves = await page.$$eval('#sum-moves li', (l) => l.map((x) => x.textContent.replace(/\s/g, ' ')));
  assert.ok(moves.some((m) => /^The bank → /.test(m)), `the bank pays out: ${moves}`);
  await page.click('#sum-holder-pick button');
  await page.click('#pick-list li:nth-child(2) button');
  assert.ok((await page.$$eval('#sum-moves li', (l) => l.map((x) => x.textContent))).every((m) => !m.startsWith('The bank')), 'a player has the money now');
  assert.deepEqual(await page.$$eval('#sum-results .amount', (a) => a.map((x) => x.textContent.replace(/\s/g, ' '))), ['NOK 1 900', 'NOK 500', 'NOK 200']);
  await shot('11-summary');
  assert.equal(await page.textContent('#sum-undo'), 'Undo the last knockout');
  await page.click('#sum-undo');
  assert.equal(await page.isVisible('#screen-game'), true);
  assert.equal((await game()).finished, false);
  await knockOut();
  await page.waitForSelector('#screen-summary:not([hidden])');

  // Play again: a new tournament with the same setup and players
  await page.click('#sum-new');
  assert.equal(await page.isVisible('#screen-setup'), true);
  assert.equal(await page.$$eval('#s-players li', (l) => l.length), 12, 'same players again');

  // Saved names: remove a player, forget their name, add someone new
  const gone = await page.textContent('#s-players li:first-child .name');
  await page.click('#s-players li:first-child button');
  assert.ok((await page.$$eval('#known-names button', (b) => b.map((x) => x.textContent))).includes(gone));
  await page.click('#known-names button.link'); // Edit
  await shot('2-forget', false);
  await page.click(`#known-names button.forget:text-is("${gone}")`);
  assert.equal(await page.isVisible('#known-names'), false, 'no saved names left to show');
  assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('propoker.setup')))).knownNames.includes(gone), false);
  await page.fill('#new-player-name', 'Zed');
  await page.press('#new-player-name', 'Enter');

  // Reset all settings: back to the defaults, players stay; Undo brings them back
  await page.fill('#s-buyin', '350');
  await page.click('#reset-setup');
  await page.click('#ask-ok');
  assert.equal(await page.inputValue('#s-buyin'), '200');
  assert.equal(await page.$$eval('#s-players li', (l) => l.length), 12, 'the players stay');
  await page.click('#toast-action'); // Undo
  assert.equal(await page.inputValue('#s-buyin'), '350');
  await page.fill('#s-buyin', '200');
  await page.click('#setup-back');

  // The main menu lists both: the new one and the finished one
  const subs = () => page.$$eval('#t-list li .sub', (l) => l.map((x) => x.textContent));
  assert.equal((await subs()).length, 2);
  assert.ok((await subs()).some((s) => /^Not started · 12 players$/.test(s)));
  assert.ok((await subs()).some((s) => /^Winner: .+ · 12 players$/.test(s)));
  await shot('1b-menu', false);

  // A deal: start the new one from the list, end early with three left
  await page.click('#t-list li button.open:has-text("Not started")');
  await page.click('#start-btn');
  await page.click('#ask-ok');
  for (let i = 0; i < 9; i++) {
    await knockOut();
    if (await isOpen('moves-dialog')) await page.click('#moves-done');
  }
  // To the main menu and back into the game, the clock still where it was
  await page.click('#home-btn');
  assert.ok((await subs()).some((s) => /Level \d+ · 3 of 12 players left/.test(s)), `${await subs()}`);
  await page.click('#t-list li button.open:has-text("3 of 12")');
  assert.equal(await page.isVisible('#screen-game'), true);
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
  assert.equal(await page.textContent('#sum-undo'), 'Undo the deal');

  // Export everything, delete one, import the file: it's back
  await page.click('#sum-home');
  await page.evaluate(() => { navigator.canShare = () => false; });
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
  const file = `${shots}/export.json`;
  await download.saveAs(file);
  const exported = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(exported.tournaments.length, 2);
  await page.click('#t-list li:last-child button.more');
  await page.click('#action-buttons button:text-is("Delete")');
  await page.click('#ask-ok');
  assert.equal((await subs()).length, 1);
  await page.setInputFiles('#import-file', file);
  await page.click('#ask-ok');
  assert.equal((await subs()).length, 2, 'imported again');
  // A new tournament with a copy of a setup
  await page.click('#t-list li:first-child button.more');
  await page.click('#action-buttons button:has-text("New tournament with this setup")');
  assert.equal(await page.$$eval('#s-players li', (l) => l.length), 12);
  await page.click('#setup-back');
  assert.equal((await subs()).length, 3);

  // Fixing mistakes: a rebuy by mistake brings someone back in; take it back
  const fix = await browser.newPage({ viewport: { width: 390, height: 844 } });
  fix.on('pageerror', (e) => errors.push(e.message));
  await fix.goto(base + '?lang=en');
  await fix.evaluate(() => { localStorage.clear(); localStorage.setItem('propoker.installHidden', '1'); });
  await fix.reload();
  await fix.click('#new-btn');
  for (const n of NAMES.slice(0, 5)) { await fix.fill('#new-player-name', n); await fix.press('#new-player-name', 'Enter'); }
  await fix.click('#start-btn');
  await fix.click('#ask-ok');
  await fix.click('#page-dots button[data-page="1"]');
  await fix.waitForTimeout(500);
  const fixGame = () => fix.evaluate(() => JSON.parse(localStorage.getItem('propoker.tournament')));
  const out = async (name) => {
    await fix.click(`#in-list li button:has-text("${name}")`);
    await fix.click('#action-buttons button:has-text("Knocked out")');
    await fix.click('#ask-cancel'); // no rebuy
    await fix.click('#pick-list li button:has-text("Ben")');
    await fix.waitForTimeout(200);
  };
  await out('Anna');
  await out('Carl');
  await fix.click('#out-list li button:has-text("Anna")');
  await fix.click('#action-buttons button:has-text("Rebuy and back in")');
  await fix.waitForTimeout(200);
  assert.equal((await fixGame()).players.find((p) => p.name === 'Anna').status, 'in', 'back in by mistake');
  await fix.click('#in-list li button:has-text("Anna")');
  await fix.click('#action-buttons button:has-text("Take back the rebuy")');
  let fg = await fixGame();
  const anna = fg.players.find((p) => p.name === 'Anna');
  assert.deepEqual([anna.status, anna.place, anna.rebuys], ['out', 5, 0], 'out again in her old place, no rebuy');
  assert.equal(fg.players.find((p) => p.id === anna.outBy).name, 'Ben');
  assert.match(await fix.textContent('#toast-text'), /Anna is out again in 5th/);
  // Carl actually went out first: change his place
  await fix.click('#out-list li button:has-text("Carl")');
  await fix.click('#action-buttons button:has-text("Change place")');
  await fix.click('#pick-list li button:has-text("5th")');
  fg = await fixGame();
  assert.deepEqual(['Anna', 'Carl'].map((n) => fg.players.find((p) => p.name === n).place), [4, 5]);
  // And Anna wasn't out at all
  await fix.click('#out-list li button:has-text("Anna")');
  await fix.click('#action-buttons button:has-text("Not out after all")');
  fg = await fixGame();
  assert.equal(fg.players.find((p) => p.name === 'Anna').status, 'in');
  assert.equal(fg.players.find((p) => p.name === 'Carl').place, 5);
  await fix.close();

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

  // The TV view: a second window that follows the main one, with your logo and colour
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const admin = await ctx.newPage();
  admin.on('pageerror', (e) => errors.push(e.message));
  await admin.goto(base + '?lang=en');
  await admin.evaluate(() => { localStorage.clear(); localStorage.setItem('propoker.installHidden', '1'); });
  await admin.reload();
  await admin.click('#new-btn');
  for (const n of NAMES.slice(0, 6)) { await admin.fill('#new-player-name', n); await admin.press('#new-player-name', 'Enter'); }
  await admin.click('#start-btn');
  await admin.click('#ask-ok');
  await admin.click('#settings-btn');
  await admin.click('#g-tv');
  await admin.click('#tv-panels label:has-text("Tables") input');
  assert.deepEqual((await admin.evaluate(() => JSON.parse(localStorage.getItem('propoker.tv')))).panels, ['blinds', 'prizes', 'players', 'tables']);
  const [tvPage] = await Promise.all([ctx.waitForEvent('page'), admin.click('#tv-open')]);
  tvPage.on('pageerror', (e) => errors.push(e.message));
  await tvPage.waitForSelector('#screen-tv:not([hidden])');
  await tvPage.click('#tv-go');
  assert.equal(await tvPage.textContent('#tv-blinds'), await admin.textContent('#c-blinds'));
  assert.equal(await tvPage.textContent('#tv-panel-title'), 'Blind levels');
  assert.equal(await tvPage.$$eval('#tv-dots span', (d) => d.length), 4);
  // A knockout in the main window shows on the TV
  await admin.click('#in-list li button:has-text("Anna")');
  await admin.click('#action-buttons button:has-text("Knocked out")');
  await admin.click('#ask-cancel'); // no rebuy
  await admin.click('#pick-list li button:has-text("Ben")');
  await tvPage.waitForFunction(() => document.querySelector('#tv-facts .fact-value')?.textContent === '5 / 6');
  // Pausing too
  await admin.click('#page-dots button[data-page="0"], #panel-tabs button:has-text("Clock")').catch(() => {});
  await admin.evaluate(() => document.getElementById('c-pause').click()); // start the clock
  await tvPage.waitForFunction(() => !document.getElementById('tv-clock').classList.contains('paused'));
  // Your logo, name and colour: on the TV at once
  await admin.click('#home-btn');
  await admin.click('#look-btn');
  await admin.setInputFiles('#look-file', `${root}icons/icon-192.png`);
  await admin.fill('#look-name', 'Poker Club');
  await admin.click('#look-accents .swatch >> nth=1');
  await admin.waitForTimeout(300);
  await admin.screenshot({ path: `${shots}/15-look.png` });
  await admin.click('#look-done');
  assert.equal(await admin.isVisible('#brand-logo'), true, 'the logo in place of the name');
  await tvPage.waitForFunction(() => document.querySelector('#tv-brand img') && document.getElementById('tv-brand').textContent.includes('Poker Club'));
  assert.match(await tvPage.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--green')), /hsl\(221/, 'the blue accent');
  await tvPage.waitForTimeout(400);
  await tvPage.screenshot({ path: `${shots}/15-tv.png` });
  await ctx.close();

  assert.deepEqual(errors, []);
  assert.deepEqual(nativeDialogs, []);
  console.log('e2e passed');
} finally {
  await browser.close();
  server?.kill();
}

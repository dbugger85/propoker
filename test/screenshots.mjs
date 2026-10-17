// Makes the README's screenshots (screenshots/) and the link preview picture
// (icons/preview.png). Run it when the look changes: npm run screenshots
// A made-up poker night: 14 players at 2 tables, level 6 with 12:34 left,
// three knocked out, a few rebuys and add-ons. Phone (390×844) light and dark,
// and an iPad sideways (1180×820). Small WebP copies for the start page's tour go in screenshots/tour/.
import { spawn, execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const ROOT = new URL('..', import.meta.url).pathname;
const BASE = 'http://127.0.0.1:8776/';
const server = spawn('python3', ['-m', 'http.server', '8776', '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium' });
const out = (name) => `${ROOT}screenshots/${name}.png`;

const NAMES = ['Nora', 'Emil', 'Jakob', 'Ella', 'Noah', 'Sofie', 'Lukas', 'Ingrid', 'Oskar', 'Maja', 'Henrik', 'Thea', 'Filip', 'Sara'];
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 };
const tablet = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };

// The same seats every time: a fixed "random"
const SEED = `(() => { let s = 7; Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; })();`;

async function scene(scheme, device = phone) {
  const page = await browser.newPage({ ...device, colorScheme: scheme });
  await page.clock.setFixedTime(new Date('2026-10-16T21:12:00')); // a Friday evening, for the clock times
  await page.addInitScript(SEED);
  await page.goto(BASE + '?lang=en');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('propoker.installHidden', '1'); });
  await page.reload();
  await page.click('#new-btn');
  await page.fill('#s-name', 'Friday poker');
  await page.fill('#s-seats', '8');
  for (const n of NAMES) {
    await page.fill('#new-player-name', n);
    await page.press('#new-player-name', 'Enter');
  }
  await page.click('#start-btn');
  await page.click('#ask-ok');
  // The evening so far, written straight into the saved tournament
  await page.evaluate(() => {
    const t = JSON.parse(localStorage.getItem('propoker.tournament'));
    const by = (name) => t.players.find((p) => p.name === name);
    const now = Date.now();
    t.startedAt = now - 105 * 60000;
    t.clock = { levelIndex: 6, levelMs: (20 * 60 - 754) * 1000, runningSince: now }; // level 6, 12:34 left
    for (const [name, rebuys] of [['Emil', 2], ['Ella', 1], ['Lukas', 1]]) by(name).rebuys = rebuys;
    for (const name of ['Nora', 'Jakob', 'Ella', 'Sofie', 'Maja']) by(name).addOn = true;
    for (const p of t.players) p.paidIn = ['Filip', 'Thea'].includes(p.name) ? 0 : p.name === 'Emil' ? 400 : 200 * (1 + p.rebuys) + (p.addOn ? 200 : 0); // Emil still owes a rebuy
    [['Sara', 'Emil', 2], ['Henrik', 'Nora', 4], ['Oskar', 'Emil', 5]].forEach(([name, killer, level], i) =>
      Object.assign(by(name), { status: 'out', outBy: by(killer).id, outLevel: level, outAt: now - (60 - i * 10) * 60000 }));
    const out = t.players.filter((p) => p.status === 'out').sort((a, b) => a.outAt - b.outAt);
    out.forEach((p, i) => (p.place = t.players.length - i));
    // Counted at the break after level 4
    const stacks = { Nora: 41200, Emil: 28600, Jakob: 23400, Ella: 31800, Noah: 9800, Sofie: 26500, Lukas: 14300, Ingrid: 18900, Maja: 22100, Thea: 12700, Filip: 7500 };
    for (const [name, stack] of Object.entries(stacks)) Object.assign(by(name), { stack, stackLevel: 4 });
    t.counts = [{ at: now - 30 * 60000, level: 4, total: Object.values(stacks).reduce((a, b) => a + b, 0) }];
    localStorage.setItem('propoker.tournament', JSON.stringify(t));
    localStorage.setItem('propoker.seen', String(now));
  });
  await page.reload();
  await page.waitForTimeout(400);
  if (await page.$eval('#moves-dialog', (d) => d.open)) await page.click('#moves-later');
  return page;
}

const toPage = async (page, i) => {
  await page.click(`#page-dots button[data-page="${i}"]`);
  await page.waitForTimeout(700);
};

try {
  for (const scheme of ['light', 'dark']) {
    const page = await scene(scheme);
    await page.screenshot({ path: out(`phone-clock-${scheme}`) });
    if (scheme === 'light') {
      await toPage(page, 1);
      await page.screenshot({ path: out('phone-players') });
      await toPage(page, 2);
      await page.screenshot({ path: out('phone-tables') });
      await toPage(page, 3);
      await page.screenshot({ path: out('phone-money') });
      // The cog: the coming levels with their clock times, and the chip count
      await page.click('#settings-btn');
      await page.$eval('#g-levels', (e) => e.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: out('phone-levels') });
      await page.click('#g-count');
      await page.waitForTimeout(300);
      await page.screenshot({ path: out('phone-count') });
      await page.click('#count-cancel');
      // The main menu, with two other evenings filed away
      await page.evaluate(() => {
        const day = 86400000;
        const now = Date.now();
        const names = ['Nora', 'Emil', 'Jakob', 'Ella', 'Noah', 'Sofie', 'Lukas', 'Ingrid', 'Oskar', 'Maja'];
        const players = names.map((name, i) => ({ id: `o${i}`, name, place: i + 1 }));
        localStorage.setItem('propoker.saved.t-last', JSON.stringify({ v: 1, id: 't-last', created: now - 7 * day, setup: { name: 'Friday poker 9 Oct', players }, game: { startedAt: now - 7 * day, finished: true, deal: null, players: [players[1], ...players.filter((p) => p.name !== 'Emil')].map((p, i) => ({ ...p, place: i + 1 })), settings: { name: 'Friday poker 9 Oct' }, levels: [], clock: { levelIndex: 0 } } }));
        localStorage.setItem('propoker.saved.t-xmas', JSON.stringify({ v: 1, id: 't-xmas', created: now + 60 * day, setup: { name: 'Christmas poker', players: names.slice(0, 9).map((name, i) => ({ id: `x${i}`, name })) }, game: null }));
      });
      await page.click('#home-btn');
      await page.waitForTimeout(300);
      await page.screenshot({ path: out('phone-menu') });
      await page.click('#t-list li button.open:has-text("Friday poker")');
      await page.waitForTimeout(300);
      // The setup's chip set and payouts
      const setup = await browser.newPage({ ...phone, colorScheme: scheme });
      await setup.goto(BASE + '?lang=en');
      await setup.evaluate((s) => localStorage.setItem('propoker.setup', s), await page.evaluate(() => localStorage.getItem('propoker.setup')));
      await setup.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('propoker.setup'));
        s.chipSet = s.chipSet.map((c, i) => ({ ...c, have: [150, 150, 100, 100][i] }));
        localStorage.setItem('propoker.setup', JSON.stringify(s));
        localStorage.setItem('propoker.installHidden', '1');
        localStorage.removeItem('propoker.tournament');
      });
      await setup.reload();
      await setup.click('#t-list li button.open');
      await setup.$eval('#s-chipset', (e) => e.closest('fieldset').scrollIntoView());
      await setup.evaluate(() => window.scrollBy(0, -12));
      await setup.screenshot({ path: out('phone-chips') });
      await setup.close();
    }
    await page.close();
  }

  // The end of the night
  const end = await scene('light');
  await end.evaluate(() => {
    const t = JSON.parse(localStorage.getItem('propoker.tournament'));
    const left = t.players.filter((p) => p.status === 'in');
    const order = ['Lukas', 'Thea', 'Filip', 'Ingrid', 'Maja', 'Noah', 'Sofie', 'Ella', 'Jakob']; // Nora and Emil are left
    const now = Date.now();
    order.forEach((name, i) => Object.assign(left.find((p) => p.name === name), { status: 'out', outBy: left.find((p) => p.name === 'Nora').id, outLevel: 7 + Math.floor(i / 2), outAt: now - (10 - i) * 60000 }));
    localStorage.setItem('propoker.tournament', JSON.stringify(t));
  });
  await end.reload();
  await end.waitForTimeout(300);
  // Knock out the last one through the app, so the summary is made the normal way
  await end.click('#page-dots button[data-page="1"]');
  await end.waitForTimeout(600);
  await end.click('#in-list li button:has-text("Emil")');
  await end.click('#action-buttons button:has-text("Knocked out")');
  await end.waitForTimeout(300);
  await end.waitForSelector('#screen-summary:not([hidden])');
  await end.screenshot({ path: out('phone-summary') });
  await end.$eval('#sum-moves', (e) => e.parentElement.querySelector('h3:nth-of-type(1)') && e.scrollIntoView({ block: 'center' }));
  await end.waitForTimeout(300);
  await end.screenshot({ path: out('phone-settle') });
  await end.close();

  // iPad sideways
  for (const scheme of ['light', 'dark']) {
    const page = await scene(scheme, tablet);
    await page.screenshot({ path: out(`ipad-${scheme}`) });
    if (scheme === 'light') {
      await page.click('#panel-tabs button:has-text("Tables")');
      await page.screenshot({ path: out('ipad-tables') });
    }
    await page.close();
  }

  // The link preview (1200×630)
  const preview = await scene('dark', { viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await preview.screenshot({ path: `${ROOT}icons/preview.png` });
  await preview.close();
} finally {
  await browser.close();
  server.kill();
}
// Small copies for the tour on the start page
for (const name of ['phone-clock-light', 'phone-tables', 'phone-players', 'phone-count', 'phone-settle', 'phone-chips']) {
  execFileSync('magick', [out(name), '-quality', '72', `${ROOT}screenshots/tour/${name}.webp`]);
}
console.log('screenshots done');

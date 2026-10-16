// Makes the README's screenshots (screenshots/) and the link preview picture
// (icons/preview.png). Run it when the look changes: npm run screenshots
// A made-up poker night: 14 players at 2 tables, level 6 with 12:34 left,
// three knocked out, a few rebuys and add-ons. Phone (390×844) light and dark,
// and an iPad sideways (1180×820).
import { spawn } from 'node:child_process';
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
    for (const p of t.players) p.paid = !['Filip', 'Thea'].includes(p.name);
    [['Sara', 'Emil', 2], ['Henrik', 'Nora', 4], ['Oskar', 'Emil', 5]].forEach(([name, killer, level], i) =>
      Object.assign(by(name), { status: 'out', outBy: by(killer).id, outLevel: level, outAt: now - (60 - i * 10) * 60000 }));
    const out = t.players.filter((p) => p.status === 'out').sort((a, b) => a.outAt - b.outAt);
    out.forEach((p, i) => (p.place = t.players.length - i));
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
      await setup.click('#new-btn');
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
console.log('screenshots done');

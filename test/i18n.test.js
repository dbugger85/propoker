// Every English text in the app has a Norwegian version.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NO } from '../js/i18n.js';
import { CHIP_COLORS } from '../js/chips.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

function texts() {
  const js = read('js/app.js') + read('js/summary.js');
  const html = read('index.html');
  const found = new Set();
  for (const m of js.matchAll(/tr\(\s*'((?:[^'\\]|\\.)*)'/g)) found.add(m[1]);
  for (const m of js.matchAll(/\[\s*'[a-z-]+'\s*,\s*'([^']+)'\s*\]/g)) found.add(m[1]); // [value, label] lists
  for (const m of html.matchAll(/<([a-z0-9]+)[^>]*\sdata-t(?:-html)?(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)) found.add(m[2].trim());
  for (const m of html.matchAll(/aria-label="([^"]+)"[^>]*data-t-label/g)) found.add(m[1]);
  for (const m of html.matchAll(/placeholder="([^"]+)"[^>]*data-t-placeholder/g)) found.add(m[1]);
  found.add(html.match(/<title>(.*?)<\/title>/)[1]);
  found.add(html.match(/name="description" content="(.*?)"/)[1]);
  // Made from names in the code
  for (const p of ['Turbo', 'Standard', 'Deep', 'Custom']) found.add(p);
  for (const c of Object.keys(CHIP_COLORS)) found.add(c[0].toUpperCase() + c.slice(1));
  return found;
}

test('everything is translated', () => {
  const missing = [...texts()].filter((t) => !(t in NO));
  assert.deepEqual(missing, []);
});

test('the gaps match', () => {
  for (const [en, no] of Object.entries(NO)) {
    const gaps = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
    assert.equal(gaps(no), gaps(en), en);
  }
});

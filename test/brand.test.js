import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToHsl, accentVars, accentCss } from '../js/brand.js';
import { cleanBrand } from '../js/storage.js';

test('hex to hsl', () => {
  assert.deepEqual(hexToHsl('#ff0000'), { h: 0, s: 100, l: 50 });
  assert.deepEqual(hexToHsl('#808080'), { h: 0, s: 0, l: 50 });
  assert.equal(hexToHsl('#2563eb').h, 221);
});

test('an accent re-hues the green, for light and dark', () => {
  assert.equal(accentVars('#2563eb', false)['--green'], 'hsl(221 70% 30%)');
  assert.equal(accentVars('#2563eb', true)['--green'], 'hsl(221 65% 55%)');
  assert.equal(accentVars('#808080', false)['--green'], 'hsl(0 0% 30%)', 'grey stays grey');
  assert.equal(accentVars('#2563eb', true)['--bg'], 'hsl(221 47% 7%)', 'the background too');
  const css = accentCss('#2563eb');
  assert.match(css, /^:root \{ --green: hsl\(221/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.equal(accentCss(null), '');
});

test('the saved look is checked', () => {
  assert.deepEqual(cleanBrand({ name: 'x'.repeat(80), accent: '#ABCDEF', logo: 'javascript:alert(1)', plate: 1 }), { v: 1, name: 'x'.repeat(60), accent: '#abcdef', logo: null, plate: true });
  assert.equal(cleanBrand({ logo: 'data:image/png;base64,AAAA' }).logo, 'data:image/png;base64,AAAA');
  assert.equal(cleanBrand(null).accent, null);
});

// Your own accent colour: the app's felt green re-hued to it, for the light
// and the dark look (like ProQuiz). No DOM code here; app.js puts the CSS in a <style>.

export const ACCENTS = ['#2563eb', '#7c3aed', '#0d9488', '#ea580c', '#dc2626'];

export function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// The colour variables for one look: dark text on a light background, or the other way round
export function accentVars(hex, dark) {
  const { h, s } = hexToHsl(hex);
  const c = (sat, light, alpha) => (alpha == null ? `hsl(${h} ${Math.min(s, sat)}% ${light}%)` : `hsl(${h} ${Math.min(s, sat)}% ${light}% / ${alpha})`);
  return dark
    ? { '--green': c(65, 55), '--on-green': c(60, 8), '--green-soft': c(35, 14), '--glow-a': c(60, 45, 0.22), '--felt': c(60, 26, 0.5) }
    : { '--green': c(70, 30), '--on-green': '#ffffff', '--green-soft': c(45, 91), '--glow-a': c(60, 45, 0.3), '--felt': c(65, 24, 0.92) };
}

// The CSS for both looks, with the same selectors as style.css (the phone's choice, or the theme button)
export function accentCss(hex) {
  if (!hex) return '';
  const block = (dark) => Object.entries(accentVars(hex, dark)).map(([k, v]) => `${k}: ${v};`).join(' ');
  return `:root { ${block(false)} }\n@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${block(true)} } }\n:root[data-theme="dark"] { ${block(true)} }`;
}

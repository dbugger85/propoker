// Your own accent colour, for the whole app (like ProQuiz): the felt green, the
// background, the panels, the lines, the glow, the seats and the big announcement
// re-hued to it, for the light and the dark look. Gold (money) and red stay.
// No DOM code here; app.js puts the CSS in a <style>.

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

// The colour variables for one look: dark text on a light background, or the other way round.
// Each tone keeps its lightness; its hue becomes the accent's, its saturation at most the accent's.
export function accentVars(hex, dark) {
  const { h, s } = hexToHsl(hex);
  const tone = (hue) => (sat, light, alpha) => `hsl(${(hue + 360) % 360} ${Math.min(s, sat)}% ${light}%${alpha == null ? '' : ` / ${alpha}`})`;
  const c = tone(h);
  const warm = tone(h + 50); // the other two glows, either side of the accent
  const cool = tone(h - 50);
  return dark
    ? {
        '--green': c(65, 55), '--on-green': c(60, 8), '--green-soft': c(35, 14), '--felt': c(60, 26, 0.5), '--felt-solid': c(60, 20, 0.92),
        '--bg': c(47, 7), '--card': c(37, 14), '--line': c(32, 22), '--glass': c(36, 18, 0.5), '--glass-strong': c(36, 21, 0.88),
        '--glow-a': c(60, 45, 0.22), '--glow-b': warm(60, 50, 0.14), '--glow-c': cool(70, 55, 0.2), '--seat': c(65, 6, 0.78),
      }
    : {
        '--green': c(70, 30), '--on-green': '#ffffff', '--green-soft': c(45, 91), '--felt': c(65, 24, 0.92),
        '--bg': c(27, 93), '--line': c(15, 85),
        '--glow-a': c(60, 45, 0.3), '--glow-b': warm(70, 55, 0.22), '--glow-c': cool(80, 60, 0.18), '--seat': c(65, 9, 0.68),
      };
}

// The CSS for both looks, with the same selectors as style.css (the phone's choice, or the theme button)
export function accentCss(hex) {
  if (!hex) return '';
  const block = (dark) => Object.entries(accentVars(hex, dark)).map(([k, v]) => `${k}: ${v};`).join(' ');
  return `:root { ${block(false)} }\n@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${block(true)} } }\n:root[data-theme="dark"] { ${block(true)} }`;
}

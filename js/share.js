// Settings in a link ("#s="): everything from setup except the name and how
// many chips you own, with the players' names. And a running tournament in a
// link ("#t="), to carry on with it on another phone or tablet. Packed small
// (deflate) and put after "#" in the address, so it never goes to a server.
// No DOM code here.

const KEYS = ['currency', 'buyIn', 'fee', 'startingChips', 'smallestChip', 'chipSet', 'startStack', 'preset', 'levelMinutes', 'breakMinutes', 'anteStyle', 'levels', 'customLevels', 'rebuy', 'addOn', 'lateUntilLevel', 'seatsPerTable', 'randomSeats', 'payouts'];

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function squeeze(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

// The settings to share (players only if asked)
export function pickSettings(setup, withPlayers = true) {
  const out = { v: 1 };
  for (const k of KEYS) if (setup[k] !== undefined) out[k] = structuredClone(setup[k]);
  out.chipSet = (setup.chipSet ?? []).map(({ color, value }) => ({ color, value, have: null }));
  if (withPlayers) out.players = setup.players.map((p) => p.name);
  return out;
}

// "z" + deflated, or "j" + plain where the browser can't deflate
export async function encode(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (typeof CompressionStream === 'undefined') return `j${toB64(bytes)}`;
  return `z${toB64(await squeeze(bytes, new CompressionStream('deflate-raw')))}`;
}

async function decode(code) {
  try {
    const bytes = fromB64(code.slice(1));
    const plain = code[0] === 'z' ? await squeeze(bytes, new DecompressionStream('deflate-raw')) : code[0] === 'j' ? bytes : null;
    return plain && JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}

export const encodeSettings = encode;

// Back to settings, or null if the link is broken
export async function decodeSettings(code) {
  const s = await decode(code);
  return s && s.v === 1 && Array.isArray(s.levels) && Array.isArray(s.chipSet) && Number.isFinite(s.buyIn) ? s : null;
}

// A running tournament, without its undo history (that stays on the old device)
export const encodeTournament = (t) => encode({ ...t, history: [], pending: null });

export async function decodeTournament(code) {
  const t = await decode(code);
  return t && t.v === 1 && Array.isArray(t.players) && Array.isArray(t.levels) && t.clock && t.settings ? t : null;
}

// Shared settings into your own setup: your name, chips you own and known names stay.
// Players come along only if the link has them.
export function applySettings(setup, shared) {
  const next = { ...setup };
  for (const k of KEYS) if (shared[k] !== undefined) next[k] = structuredClone(shared[k]);
  next.chipSet = shared.chipSet.map((c) => ({ color: c.color, value: c.value, have: setup.chipSet?.find((x) => x.color === c.color && x.value === c.value)?.have ?? null }));
  if (Array.isArray(shared.players)) {
    next.players = shared.players.filter((n) => typeof n === 'string' && n.trim()).map((name, i) => ({ id: `s${Date.now().toString(36)}${i}`, name: name.trim() }));
    const known = new Set(next.players.map((p) => p.name.toLowerCase()));
    next.knownNames = [...next.players.map((p) => p.name), ...(setup.knownNames ?? []).filter((n) => !known.has(n.toLowerCase()))].slice(0, 60);
  }
  return next;
}

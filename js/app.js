// Screens, buttons and popups. The rules live in blinds.js, clock.js,
// tables.js, money.js and tournament.js (no DOM code there).

import { loadSetup, saveSetup, loadGame, saveGame, clearGame, loadLast, saveLast, loadSeen, saveSeen, loadTheme, saveTheme, loadInstallHidden, saveInstallHidden, loadTableView, saveTableView } from './storage.js';
import { PRESETS, PRESET_ORDER, buildLevels, anteFor, levelNumber, nextPlay, nextLevel, totalMinutes, playLevel } from './blinds.js';
import * as C from './clock.js';
import * as T from './tournament.js';
import { plan, applyMoves, swapSeats, tableCount, seatPositions } from './tables.js';
import { CURRENCIES, prizes, payoutProblem, formatMoney, groupDigits, owed, PERCENTS } from './money.js';
import { results, shareText, mostKnockouts } from './summary.js';
import { CHIP_COLORS, makeStack, enoughFor, colourUp, smallestChip, sortChips, chipSvg, chipHex, isCustomColor } from './chips.js';
import { lang, LANGS, FLAGS, tr, setLang, translatePage } from './i18n.js';
import { unlockAudio, alert, keepScreenOn, releaseScreen } from './alerts.js';

const $ = (id) => document.getElementById(id);

let setup = loadSetup();
let game = loadGame();

// ---------- helpers ----------

function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on')) e.addEventListener(key.slice(2), value);
    else if (key === 'class') e.className = value;
    else if (value === true) e.setAttribute(key, '');
    else if (value !== false && value != null) e.setAttribute(key, value);
  }
  e.append(...[].concat(children).filter((c) => c != null && c !== false));
  return e;
}

// Our own popup instead of the browser's confirm() and prompt(). Resolves to
// true (or the typed text) for OK, false for the Cancel button, null when closed.
function ask({ title, text = '', input = '', value = '', ok = tr('OK'), cancel = tr('Cancel'), danger = false }) {
  const dlg = $('ask-dialog');
  const field = $('ask-input');
  $('ask-title').textContent = title;
  $('ask-text').textContent = text;
  $('ask-text').hidden = !text;
  field.hidden = !input;
  field.placeholder = input;
  field.value = value;
  $('ask-ok').textContent = ok;
  $('ask-ok').className = danger ? 'primary grow danger-fill' : 'primary grow';
  $('ask-cancel').textContent = cancel;
  return new Promise((resolve) => {
    const done = (result) => {
      dlg.onclose = null;
      dlg.close();
      resolve(result);
    };
    $('ask-form').onsubmit = (e) => {
      e.preventDefault();
      if (input && !field.value.trim()) return field.focus();
      done(input ? field.value.trim() : true);
    };
    $('ask-cancel').onclick = () => done(false);
    dlg.onclose = () => resolve(null);
    dlg.showModal();
    if (input) value ? field.select() : field.focus();
  });
}

// Pick one from a list (instead of the phone's own dropdown). Resolves to the
// value, SKIP for the optional skip button, or null.
const SKIP = Symbol('skip');
function pickFrom(title, items, value, skip) {
  const dlg = $('pick-dialog');
  $('pick-title').textContent = title;
  return new Promise((resolve) => {
    const done = (v) => {
      dlg.onclose = null;
      dlg.close();
      resolve(v);
    };
    $('pick-list').replaceChildren(
      ...items.map((it) =>
        el('li', { class: 'player' }, [
          el('button', { type: 'button', class: it.value === value ? 'chosen' : '', onclick: () => done(it.value) }, [
            el('span', { class: 'name' }, [it.label, it.sub ? el('span', { class: 'sub' }, it.sub) : null]),
          ]),
        ]),
      ),
    );
    $('pick-skip').hidden = !skip;
    $('pick-skip').textContent = skip ?? '';
    $('pick-skip').onclick = () => done(SKIP);
    $('pick-cancel').onclick = () => done(null);
    dlg.onclose = () => resolve(null);
    dlg.showModal();
  });
}

function picker(label, onclick, ariaLabel) {
  return el('button', { type: 'button', class: 'picker', onclick, 'aria-label': ariaLabel }, el('span', {}, label));
}

function toast(message, action) {
  const t = $('toast');
  $('toast-text').textContent = message;
  const btn = $('toast-action');
  btn.hidden = !action;
  if (action) {
    btn.textContent = action.label;
    btn.onclick = () => {
      t.hidden = true;
      action.onclick();
    };
  }
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), action ? 6000 : 4000);
}

const locale = lang === 'no' ? 'nb-NO' : 'en-GB';
const chips = groupDigits;
const cash = (n, currency = (game ?? setup).settings?.currency ?? setup.currency) => formatMoney(n, currency);
const ord = (n) => (lang === 'no' ? `${n}.` : `${n}${[, 'st', 'nd', 'rd'][(n % 100 >> 3) ^ 1 && n % 10] || 'th'}`);
const blindsText = (l) => `${chips(l.sb)} / ${chips(l.bb)}`;
const dateText = (time) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(time);

function clockText(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

function hoursText(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? tr('{h} h {m} min', { h, m }) : tr('{m} min', { m });
}

// Number boxes are text boxes that open the number keyboard (inputmode),
// because a type="number" box can't show the thousands split. Whole numbers
// get the split as you type: 10 000.
const plain = (text) => text.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
const boxText = (v) => (v == null || v === '' ? '' : Number.isInteger(Number(v)) ? groupDigits(Number(v)) : String(v));
function setNum(input, v) {
  input.value = boxText(v);
}

// A number from a box, or null while it's empty or out of range.
function num(input, min = 0, max = Infinity) {
  const text = plain(input.value);
  const v = Number(text);
  return text !== '' && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

// While typing: split the thousands again, and keep the cursor after the same digit.
document.addEventListener('input', (e) => {
  const box = e.target;
  if (!box.matches?.('input[inputmode="numeric"]')) return;
  const before = box.value;
  if (!/^[\d\s\u00a0\u202f]*$/.test(before)) return;
  const digitsLeft = before.slice(0, box.selectionStart ?? before.length).replace(/\D/g, '').length;
  const digits = before.replace(/\D/g, '');
  const after = digits ? groupDigits(Number(digits)) : '';
  if (after === before) return;
  box.value = after;
  let pos = 0;
  for (let seen = 0; pos < after.length && seen < digitsLeft; pos++) if (/\d/.test(after[pos])) seen++;
  box.setSelectionRange(pos, pos);
}, true);

function show(name) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== `screen-${name}`;
  window.scrollTo(0, 0);
  $('settings-btn').hidden = name !== 'game';
  layout();
}

const fact = (label, value, { sub, gold } = {}) =>
  el('div', { class: 'fact' }, [el('div', { class: 'fact-label' }, label), el('div', { class: gold ? 'fact-value gold' : 'fact-value' }, value), sub ? el('div', { class: 'fact-sub' }, sub) : null]);

// ---------- home ----------

function renderHome() {
  const last = loadLast();
  $('last-card').hidden = !last;
  if (last) {
    $('last-date').textContent = dateText(last.at);
    $('last-title').textContent = last.name;
    $('last-line').textContent = last.winner ? tr('Winner: {name} · {n} players', { name: last.winner, n: last.players }) : tr('{n} players', { n: last.players });
  }
}

$('new-btn').addEventListener('click', () => {
  renderSetup();
  show('setup');
});

$('last-share').addEventListener('click', () => {
  const last = loadLast();
  if (last) shareOut(last.text);
});

async function shareOut(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast(tr('Copied. Paste it in the group chat'));
  } catch {
    await ask({ title: tr('Share'), text, cancel: tr('Close') });
  }
}

// ---------- setup ----------

let showAllLevels = false;
const ANTES = [['none', 'None'], ['bb', 'BB ante'], ['classic', 'Classic']];

function saveS() {
  // Your own levels are kept on their own, so looking at a preset never loses them
  if (setup.preset === 'custom') setup.customLevels = structuredClone(setup.levels);
  saveSetup(setup);
}

// After a change to the chips, the preset or the antes: a preset makes the
// whole list again; a custom list only gets the new minutes and antes.
function rebuildLevels() {
  if (setup.preset !== 'custom') setup.levels = buildLevels(setup);
  else applyAntes(setup.levels);
}

function applyAntes(levels) {
  const firstBreak = levels.findIndex((l) => l.break);
  levels.forEach((l, i) => {
    if (!l.break) l.ante = i > firstBreak && firstBreak >= 0 ? anteFor(l.bb, setup.anteStyle, setup.smallestChip) : setup.anteStyle === 'none' ? 0 : l.ante;
  });
}

function renderSetup() {
  $('s-name').value = setup.name;
  $('s-name').placeholder = tr('Poker night {date}', { date: dateText(Date.now()) });
  setNum($('s-buyin'), setup.buyIn);
  setNum($('s-chips'), setup.startingChips);
  setNum($('s-fee'), setup.fee);
  setNum($('s-minutes'), setup.levelMinutes);
  setNum($('s-break'), setup.breakMinutes);
  $('s-rebuy-on').checked = setup.rebuy.on;
  setNum($('s-rebuy-price'), setup.rebuy.price);
  setNum($('s-rebuy-chips'), setup.rebuy.chips);
  setNum($('s-rebuy-until'), setup.rebuy.untilLevel);
  $('s-addon-on').checked = setup.addOn.on;
  setNum($('s-addon-price'), setup.addOn.price);
  setNum($('s-addon-chips'), setup.addOn.chips);
  setNum($('s-late-until'), setup.lateUntilLevel);
  setNum($('s-seats'), setup.seatsPerTable);
  $('s-random').checked = setup.randomSeats;
  renderSetupParts();
}

// Everything on the setup screen that follows from the boxes.
function renderSetupParts() {
  $('s-currency').replaceChildren(
    picker(setup.currency, async () => {
      const v = await pickFrom(tr('Currency'), CURRENCIES.map((c) => ({ value: c, label: c })), setup.currency);
      if (v) {
        setup.currency = v;
        saveS();
        renderSetupParts();
      }
    }),
  );
  renderChipSet();
  $('s-presets').replaceChildren(
    ...[...PRESET_ORDER, 'custom'].map((p) =>
      el('button', { type: 'button', 'aria-pressed': String(setup.preset === p), onclick: () => choosePreset(p) }, [
        tr(p === 'custom' ? 'Custom' : p[0].toUpperCase() + p.slice(1)),
        el('span', { class: 'seg-sub' }, p === 'custom' ? tr('Your own') : tr('{m} min', { m: PRESETS[p].minutes })),
      ]),
    ),
  );
  $('s-antes').replaceChildren(
    ...ANTES.map(([v, label]) =>
      el('button', { type: 'button', 'aria-pressed': String(setup.anteStyle === v), onclick: () => { setup.anteStyle = v; rebuildLevels(); saveS(); renderSetupParts(); } }, tr(label)),
    ),
  );
  renderLevelList($('s-levels'), setup.levels, { onEdit: (i) => editSetupLevel(i), limit: showAllLevels ? Infinity : 8 });
  const hidden = setup.levels.length - 8;
  $('s-levels').append(...(hidden > 0 ? [el('li', {}, el('button', { type: 'button', class: 'levels-more link', onclick: () => { showAllLevels = !showAllLevels; renderSetupParts(); } }, showAllLevels ? tr('Show fewer') : tr('Show all {n} rows', { n: setup.levels.length })))] : []));
  const plays = setup.levels.filter((l) => !l.break).length;
  $('s-length').textContent = tr('{n} levels, {time} in all. The last level repeats, 1.5× bigger, if the game goes on', { n: plays, time: hoursText(totalMinutes(setup.levels)) });
  $('s-rebuy-box').hidden = !setup.rebuy.on;
  $('s-addon-box').hidden = !setup.addOn.on;

  const n = setup.players.length;
  const count = tableCount(n, setup.seatsPerTable);
  $('s-tables-note').textContent = n < 2 ? '' : count === 1 ? tr('{n} players at one table', { n }) : tr('{n} players at {t} tables', { n, t: count });
  $('s-count').textContent = n ? `(${n})` : '';
  $('s-players').replaceChildren(
    ...setup.players.map((p) =>
      el('li', {}, [
        el('span', { class: 'name' }, p.name),
        el('button', { type: 'button', class: 'icon', 'aria-label': tr('Remove {name}', { name: p.name }), onclick: () => { setup.players = setup.players.filter((x) => x.id !== p.id); saveS(); renderSetupParts(); } }, '✕'),
      ]),
    ),
  );
  const added = new Set(setup.players.map((p) => p.name.toLowerCase()));
  $('known-names').replaceChildren(
    ...setup.knownNames.filter((name) => !added.has(name.toLowerCase())).map((name) => el('button', { type: 'button', onclick: () => addSetupPlayer(name) }, name)),
  );
  renderPayoutBox($('s-payouts'), setup.payouts, estimatedPool(), Math.max(n, 2), setup.buyIn, setup.currency);
  $('setup-error').textContent = '';
}

// ---------- the chip set ----------

// A chip, drawn (chipSvg in chips.js). The colour is a name or a checked "#rrggbb", so the markup is safe.
function chipDot(c, big) {
  const dot = el('span', { class: big ? 'chip-dot big' : 'chip-dot', 'aria-hidden': 'true' });
  dot.innerHTML = chipSvg(c.color);
  return dot;
}
const colorName = (color) => (isCustomColor(color) ? tr('Own colour') : tr(color[0].toUpperCase() + color.slice(1)));

// A stack as chips: ⬤ 8 × 25  ⬤ 13 × 100 …
function stackLine(label, amount, extra) {
  const stack = makeStack(amount, setup.chipSet);
  if (!stack) return el('div', { class: 'stack-line bad' }, [el('span', { class: 'stack-label' }, label), tr('{chips} can’t be made with these chips', { chips: chips(amount) })]);
  return el('div', { class: 'stack-line' }, [
    el('span', { class: 'stack-label' }, `${label}: ${chips(amount)}`),
    ...stack.filter((c) => c.count).map((c) => el('span', { class: 'stack-chip' }, [chipDot(c), `${c.count} × ${chips(c.value)}`])),
    extra,
  ]);
}

// The phone's own colour picker, for a chip colour not in the list. Resolves to "#rrggbb", or null.
const OWN = 'own';
function pickColour(start) {
  const input = $('color-input');
  input.value = start;
  return new Promise((resolve) => {
    input.onchange = () => resolve(input.value);
    input.oncancel = () => resolve(null);
    try {
      input.showPicker();
    } catch {
      input.click();
    }
  });
}

function renderChipSet() {
  // Sorting while typing would move the box away from the finger, so the rows stay in the order added
  $('s-chipset').replaceChildren(
    ...setup.chipSet.map((c, i) => {
      const value = el('input', { type: 'text', inputmode: 'numeric', min: '1', value: boxText(c.value), 'aria-label': tr('Value') });
      value.addEventListener('input', () => {
        const v = num(value, 1);
        if (v == null) return;
        c.value = v;
        chipsChanged(false);
      });
      const have = el('input', { type: 'text', inputmode: 'numeric', min: '0', value: boxText(c.have), placeholder: '–', 'aria-label': tr('You have') });
      have.addEventListener('input', () => {
        c.have = have.value.trim() === '' ? null : num(have, 0);
        chipsChanged(false);
      });
      return el('div', { class: 'chip-row' }, [
        picker([chipDot(c, true)], async () => {
          const own = isCustomColor(c.color) ? c.color : null;
          const items = Object.keys(CHIP_COLORS).map((k) => ({ value: k, label: el('span', { class: 'pick-dot' }, [chipDot({ color: k }, true), colorName(k)]) }));
          items.push({ value: OWN, label: el('span', { class: 'pick-dot' }, [own ? chipDot(c, true) : el('span', { class: 'chip-dot big own', 'aria-hidden': 'true' }), tr('Own colour…')]) });
          const v = await pickFrom(tr('Colour'), items, own ? OWN : c.color);
          if (!v) return;
          c.color = v === OWN ? (await pickColour(chipHex(c.color))) ?? c.color : v;
          chipsChanged();
        }, colorName(c.color)),
        value,
        have,
        el('button', { type: 'button', class: 'icon', 'aria-label': tr('Remove {name}', { name: colorName(c.color) }), disabled: setup.chipSet.length <= 1, onclick: () => { setup.chipSet.splice(i, 1); chipsChanged(); } }, '✕'),
      ]);
    }),
  );
  renderStacks();
}

function renderStacks() {
  const start = makeStack(setup.startingChips, setup.chipSet);
  const players = setup.players.length;
  const enough = enoughFor(start, setup.chipSet);
  // replaceChildren() would write a null as the word "null", so the blanks are filtered out
  $('s-stacks').replaceChildren(...[
    stackLine(tr('Each player starts with'), setup.startingChips),
    setup.rebuy.on ? stackLine(tr('A rebuy'), setup.rebuy.chips) : null,
    setup.addOn.on ? stackLine(tr('The add-on'), setup.addOn.chips) : null,
    enough == null ? null : el('p', { class: players > enough ? 'enough bad' : 'enough' }, enough === 1 ? tr('Your chips are enough for 1 player') : tr('Your chips are enough for {n} players', { n: enough })),
  ].filter(Boolean));
}

// After a change to the chip set: the blinds follow the smallest chip.
function chipsChanged(redraw = true) {
  const smallest = smallestChip(setup.chipSet);
  if (smallest !== setup.smallestChip) {
    setup.smallestChip = smallest;
    rebuildLevels();
    redraw = true;
  }
  saveS();
  if (redraw) renderSetupParts();
  else renderStacks();
}

$('s-add-chip').addEventListener('click', () => {
  const used = new Set(setup.chipSet.map((c) => c.color));
  const color = Object.keys(CHIP_COLORS).find((k) => !used.has(k)) ?? 'grey';
  const top = sortChips(setup.chipSet).at(-1)?.value ?? 100;
  setup.chipSet.push({ color, value: top * 5, have: null });
  chipsChanged();
});

const estimatedPool = () => Math.max(0, setup.players.length * (setup.buyIn - (setup.fee || 0)));

// Turbo, Standard and Deep are always the defaults. Custom brings back your own
// levels; the first time, it starts from the structure you were on.
function choosePreset(p) {
  setup.preset = p;
  if (p !== 'custom') {
    setup.levelMinutes = PRESETS[p].minutes;
    setup.breakMinutes = PRESETS[p].breakMinutes;
    rebuildLevels();
  } else if (setup.customLevels?.length) {
    setup.levels = structuredClone(setup.customLevels);
    setup.levelMinutes = setup.levels.find((l) => !l.break)?.minutes ?? setup.levelMinutes;
    setup.breakMinutes = setup.levels.find((l) => l.break)?.minutes ?? setup.breakMinutes;
  }
  setNum($('s-minutes'), setup.levelMinutes);
  setNum($('s-break'), setup.breakMinutes);
  saveS();
  renderSetupParts();
}

function addSetupPlayer(name) {
  name = name.trim();
  if (!name) return;
  if (setup.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return toast(tr('{name} is already in', { name }));
  setup.players.push({ id: T.newId(), name });
  saveS();
  renderSetupParts();
}

$('add-player-form').addEventListener('submit', (e) => {
  e.preventDefault();
  addSetupPlayer($('new-player-name').value);
  $('new-player-name').value = '';
  $('new-player-name').focus();
});

// The boxes: saved as you type; half-typed numbers wait until they're valid.
const bindNumber = (id, min, set, after = renderSetupParts, max) =>
  $(id).addEventListener('input', () => {
    const v = num($(id), min, max);
    if (v == null) return;
    set(v);
    saveS();
    after();
  });
$('s-name').addEventListener('input', () => { setup.name = $('s-name').value; saveS(); });
bindNumber('s-buyin', 0, (v) => {
  // The rebuy and add-on usually cost the same as the buy-in, so they follow it until changed
  if (setup.rebuy.price === setup.buyIn) setNum($('s-rebuy-price'), (setup.rebuy.price = v));
  if (setup.addOn.price === setup.buyIn) setNum($('s-addon-price'), (setup.addOn.price = v));
  setup.buyIn = v;
});
bindNumber('s-chips', 100, (v) => {
  if (setup.rebuy.chips === setup.startingChips) setNum($('s-rebuy-chips'), (setup.rebuy.chips = v));
  if (setup.addOn.chips === setup.startingChips * 1.5) setNum($('s-addon-chips'), (setup.addOn.chips = v * 1.5));
  setup.startingChips = v;
  rebuildLevels();
});
bindNumber('s-fee', 0, (v) => (setup.fee = v));
bindNumber('s-minutes', 1, (v) => {
  setup.levelMinutes = v;
  for (const l of setup.levels) if (!l.break) l.minutes = v;
});
bindNumber('s-break', 1, (v) => {
  setup.breakMinutes = v;
  for (const l of setup.levels) if (l.break) l.minutes = v;
});
bindNumber('s-rebuy-price', 0, (v) => (setup.rebuy.price = v));
bindNumber('s-rebuy-chips', 0, (v) => (setup.rebuy.chips = v));
bindNumber('s-rebuy-until', 0, (v) => (setup.rebuy.untilLevel = v));
bindNumber('s-addon-price', 0, (v) => (setup.addOn.price = v));
bindNumber('s-addon-chips', 0, (v) => (setup.addOn.chips = v));
bindNumber('s-late-until', 0, (v) => (setup.lateUntilLevel = v));
bindNumber('s-seats', 2, (v) => (setup.seatsPerTable = v), renderSetupParts, 12);
for (const [id, set] of [['s-rebuy-on', (v) => (setup.rebuy.on = v)], ['s-addon-on', (v) => (setup.addOn.on = v)], ['s-random', (v) => (setup.randomSeats = v)]]) {
  $(id).addEventListener('change', () => {
    set($(id).checked);
    saveS();
    renderSetupParts();
  });
}
$('s-edit-payouts').addEventListener('click', async () => {
  const p = await editPayouts(setup.payouts, estimatedPool(), Math.max(setup.players.length, 2), setup.buyIn, setup.currency);
  if (!p) return;
  setup.payouts = p;
  saveS();
  renderSetupParts();
});
$('s-add-level').addEventListener('click', () => {
  setup.preset = 'custom';
  setup.levels.push(nextLevel(setup.levels, setup.smallestChip));
  saveS();
  renderSetupParts();
});
$('s-add-break').addEventListener('click', () => {
  setup.preset = 'custom';
  setup.levels.push({ break: true, minutes: setup.breakMinutes });
  saveS();
  renderSetupParts();
});
$('setup-back').addEventListener('click', () => {
  renderHome();
  show('home');
});

async function editSetupLevel(i) {
  const result = await editLevel(setup.levels[i], i, setup.levels, true);
  if (!result) return;
  setup.preset = 'custom';
  if (result === 'remove') setup.levels.splice(i, 1);
  else setup.levels[i] = result;
  saveS();
  renderSetupParts();
}

function setupProblem() {
  if (setup.players.length < 2) return tr('Add at least 2 players');
  if (!setup.levels.some((l) => !l.break)) return tr('Add at least one level');
  if (!makeStack(setup.startingChips, setup.chipSet)) return tr('The starting stack can’t be made with your chips');
  const problem = payoutProblem(estimatedPool(), setup.payouts);
  if (problem?.code === 'percent') return tr('The payout percentages must add up to 100');
  return '';
}

$('start-btn').addEventListener('click', () => {
  const problem = setupProblem();
  $('setup-error').textContent = problem;
  if (problem) return;
  if (!setup.name.trim()) setup.name = $('s-name').placeholder;
  const names = new Set(setup.players.map((p) => p.name.toLowerCase()));
  setup.knownNames = [...setup.players.map((p) => p.name), ...setup.knownNames.filter((n) => !names.has(n.toLowerCase()))].slice(0, 60);
  saveS();
  game = T.createTournament(setup, Date.now());
  setup.name = ''; // a new name (with the date) next time
  saveS();
  saveGame(game);
  openGame();
  goToPage(0);
  if (game.tables.length > 1 || setup.randomSeats) {
    showSeating();
  }
});

// ---------- the list of levels (setup and the cog) ----------

function renderLevelList(ul, levels, { from = 0, now = -1, onEdit, limit = Infinity }) {
  const items = [];
  levels.forEach((l, i) => {
    if (i < from || i >= from + limit) return;
    const n = levelNumber(levels, i);
    items.push(
      el('li', { class: [l.break ? 'break' : '', i === now ? 'now' : ''].join(' ') }, [
        el('button', { type: 'button', onclick: () => onEdit(i) }, l.break
          ? [el('span', { class: 'lv-n' }, ''), el('span', { class: 'lv-blinds' }, tr('Break')), el('span', { class: 'lv-ante' }, ''), el('span', { class: 'lv-min' }, tr('{m} min', { m: l.minutes }))]
          : [el('span', { class: 'lv-n' }, String(n)), el('span', { class: 'lv-blinds' }, blindsText(l)), el('span', { class: 'lv-ante' }, l.ante ? tr('Ante {a}', { a: chips(l.ante) }) : ''), el('span', { class: 'lv-min' }, tr('{m} min', { m: l.minutes }))]),
      ]),
    );
  });
  ul.replaceChildren(...items);
}

// One level's popup. Resolves to the changed level, 'remove', or null.
function editLevel(level, i, levels, canRemove) {
  const dlg = $('level-dialog');
  $('level-title').textContent = level.break ? tr('Break') : tr('Level {n}', { n: levelNumber(levels, i) });
  $('level-blind-fields').hidden = !!level.break;
  setNum($('l-sb'), level.sb ?? '');
  setNum($('l-bb'), level.bb ?? '');
  setNum($('l-ante'), level.ante ?? 0);
  setNum($('l-minutes'), level.minutes);
  $('l-remove').hidden = !canRemove;
  // Typing the big blind fills in half for the small blind
  $('l-bb').oninput = () => {
    const bb = num($('l-bb'), 1);
    if (bb) setNum($('l-sb'), Math.max(1, Math.round(bb / 2)));
  };
  return new Promise((resolve) => {
    const done = (v) => {
      dlg.onclose = null;
      dlg.close();
      resolve(v);
    };
    $('level-form').onsubmit = (e) => {
      e.preventDefault();
      const minutes = num($('l-minutes'), 0.1);
      if (!minutes) return $('l-minutes').focus();
      if (level.break) return done({ break: true, minutes });
      const bb = num($('l-bb'), 1);
      const sb = num($('l-sb'), 0);
      if (!bb) return $('l-bb').focus();
      if (sb == null) return $('l-sb').focus();
      done({ sb, bb, ante: num($('l-ante'), 0) ?? 0, minutes });
    };
    $('l-remove').onclick = () => done('remove');
    $('l-cancel').onclick = () => done(null);
    dlg.onclose = () => resolve(null);
    dlg.showModal();
  });
}

// ---------- payouts ----------

const MODES = [['auto', 'Automatic'], ['percent', 'Percentages'], ['fixed', 'Fixed amounts']];
const ROUNDING = [1, 5, 10, 20, 50, 100];

// The prizes as a short list: 1st 1,100 kr, 2nd 660 kr…
function prizeItems(amounts, currency) {
  return amounts.map((a, i) => el('li', { class: 'plain' }, [el('span', { class: 'place' }, ord(i + 1)), el('span', { class: 'name' }, ''), el('span', { class: 'amount gold' }, cash(a, currency))]));
}

function renderPayoutBox(box, payouts, pool, entrants, buyIn, currency) {
  const list = prizes(pool, entrants, payouts, buyIn);
  const how = { auto: tr('Automatic'), percent: tr('Percentages'), fixed: tr('Fixed amounts, the rest to the winner') }[payouts.mode];
  box.replaceChildren(...[
    el('p', { class: 'muted small' }, pool ? tr('{how}. With {n} players the prize pool is {pool}:', { how, n: entrants, pool: cash(pool, currency) }) : tr('{how}. Add players to see the prizes', { how })),
    pool ? el('ul', { class: 'list inner' }, prizeItems(list, currency)) : null,
  ].filter(Boolean));
}

// The payouts popup. Works on a copy; resolves to the new payouts, or null for Cancel.
function editPayouts(current, pool, entrants, buyIn, currency) {
  const dlg = $('payout-dialog');
  const p = structuredClone(current);
  if (!p.percents?.length) p.percents = [...PERCENTS[Math.min(3, Math.max(1, entrants))]];
  if (!p.fixed?.length) p.fixed = [Math.round(buyIn * 3), buyIn];

  const render = () => {
    $('p-modes').replaceChildren(
      ...MODES.map(([m, label]) => el('button', { type: 'button', 'aria-pressed': String(p.mode === m), onclick: () => { p.mode = m; render(); } }, tr(label))),
    );
    $('p-explain').textContent = {
      auto: tr('Paid places follow the number of players: 1 up to 4 players, 2 from 5, 3 from 8, 4 from 14, 5 from 21, 6 from 30 and 7 from 40.'),
      percent: tr('Choose how many places are paid and what percent of the prize pool each gets.'),
      fixed: tr('Fixed amounts for some places, for example the buy-in back for 3rd. The rest of the prize pool goes to the winner.'),
    }[p.mode];
    const rows = [];
    if (p.mode === 'percent') {
      p.percents.forEach((pc, i) => {
        const input = el('input', { type: 'text', inputmode: 'decimal', min: '0', max: '100', value: String(pc), 'aria-label': ord(i + 1) });
        input.addEventListener('input', () => {
          p.percents[i] = num(input, 0, 100) ?? 0;
          renderPreview();
        });
        rows.push(el('label', { class: 'pay-row' }, [el('span', {}, ord(i + 1)), input, el('span', { class: 'pay-unit' }, '%')]));
      });
    }
    if (p.mode === 'fixed') {
      rows.push(el('div', { class: 'pay-row' }, [el('span', {}, ord(1)), el('span', { class: 'pay-unit' }, ''), el('span', { class: 'pay-fixed muted' }, tr('The rest'))]));
      p.fixed.forEach((a, i) => {
        const input = el('input', { type: 'text', inputmode: 'numeric', min: '0', value: boxText(a), 'aria-label': ord(i + 2) });
        input.addEventListener('input', () => {
          p.fixed[i] = num(input, 0) ?? 0;
          renderPreview();
        });
        rows.push(el('label', { class: 'pay-row money' }, [el('span', {}, ord(i + 2)), el('span', { class: 'pay-unit' }, currency), input]));
      });
    }
    $('p-rows').replaceChildren(...rows);
    $('p-add-row').hidden = p.mode === 'auto';
    $('p-remove').disabled = p.mode === 'percent' ? p.percents.length <= 1 : p.fixed.length < 1;
    $('p-mincash-box').hidden = p.mode !== 'auto';
    $('p-mincash').checked = p.minCash !== false;
    $('p-round').parentElement.hidden = p.mode === 'fixed';
    $('p-round').replaceChildren(
      picker(cash(p.roundTo ?? 10, currency), async () => {
        const v = await pickFrom(tr('Round prizes to'), ROUNDING.map((r) => ({ value: r, label: cash(r, currency) })), p.roundTo);
        if (v) {
          p.roundTo = v;
          render();
        }
      }),
    );
    renderPreview();
  };
  const renderPreview = () => {
    const problem = payoutProblem(pool, p);
    $('p-error').textContent = !problem ? '' : problem.code === 'percent' ? tr('The percentages add up to {sum} %, not 100', { sum: Math.round((100 - problem.diff) * 100) / 100 }) : tr('The fixed amounts are {diff} more than the prize pool', { diff: cash(problem.diff, currency) });
    $('p-preview-title').textContent = tr('With {n} players and {pool}', { n: entrants, pool: cash(pool, currency) });
    $('p-preview').replaceChildren(...prizeItems(prizes(pool, entrants, p, buyIn), currency));
  };
  $('p-add').onclick = () => {
    if (p.mode === 'percent') p.percents.push(0);
    else p.fixed.push(p.fixed.at(-1) ?? buyIn);
    render();
  };
  $('p-remove').onclick = () => {
    if (p.mode === 'percent') p.percents.pop();
    else p.fixed.pop();
    render();
  };
  $('p-mincash').onchange = () => {
    p.minCash = $('p-mincash').checked;
    renderPreview();
  };
  render();
  return new Promise((resolve) => {
    const done = (v) => {
      dlg.onclose = null;
      dlg.close();
      resolve(v);
    };
    $('p-done').onclick = () => {
      if (payoutProblem(pool, p)?.code === 'percent') return;
      done(p);
    };
    $('p-cancel').onclick = () => done(null);
    dlg.onclose = () => resolve(null);
    dlg.showModal();
  });
}

// ---------- the tournament ----------

const S = () => game.settings;
const level = () => game.levels[game.clock.levelIndex];
let warnedLevel = -1; // the level whose one-minute beep has sounded
let seenTimer = 0;

function save() {
  saveGame(game);
}

function openGame() {
  replan();
  renderGame();
  show('game');
  keepScreenOn();
}

function sounds() {
  return { sound: S().sounds.on, vibrate: S().sounds.vibrate };
}

// Every half second: move the clock on, beep, redraw.
function tick() {
  if (!game || game.finished || $('screen-game').hidden) return;
  const now = Date.now();
  const before = game.clock.levelIndex;
  const wasOpen = T.rebuysOpen(game);
  game.clock = C.catchUp(game.clock, game.levels, now, S().smallestChip);
  if (game.clock.levelIndex !== before) {
    save();
    levelChanged(before, wasOpen);
  }
  const left = C.remaining(game.clock, game.levels, now);
  if (C.running(game.clock) && left <= 60000 && left > 50000 && warnedLevel !== game.clock.levelIndex) {
    warnedLevel = game.clock.levelIndex;
    alert('warning', sounds());
  }
  renderClock();
  if (now - seenTimer > 15000) {
    seenTimer = now;
    saveSeen(now);
  }
}

const colourUpText = (up) => tr('Colour up: the {chips} chips are not needed any more', { chips: up.map((c) => `${colorName(c.color).toLowerCase()} ${chips(c.value)}`).join(', ') });

// The chip values under the clock, for the players. Chips not needed any more are struck out.
let legendKey = '';
function renderChipLegend() {
  const set = S().chipSet;
  if (!set) return;
  const gone = new Set(colourUp(set, game.levels, game.clock.levelIndex).map((c) => c.value));
  const key = JSON.stringify([set, [...gone]]);
  if (key === legendKey) return;
  legendKey = key;
  $('c-chips').replaceChildren(...sortChips(set).map((c) => el('span', { class: gone.has(c.value) ? 'stack-chip gone' : 'stack-chip' }, [chipDot(c), chips(c.value)])));
}

// A new level or a break: a chime and the big announcement for a few seconds.
function levelChanged(before, rebuysWereOpen) {
  const now = game.levels[game.clock.levelIndex];
  const prev = game.levels[before];
  alert(now.break || prev?.break ? 'break' : 'level', sounds());
  let sub = '';
  const up = S().chipSet ? colourUp(S().chipSet, game.levels, game.clock.levelIndex).filter((x) => !colourUp(S().chipSet, game.levels, before).some((y) => y.value === x.value)) : [];
  if (now.break && T.addOnTime(game)) sub = tr('Add-ons now');
  else if (now.break && up.length) sub = colourUpText(up);
  else if (rebuysWereOpen && !T.rebuysOpen(game)) sub = tr('Rebuys are closed');
  else if (now.ante) sub = tr('Ante {a}', { a: chips(now.ante) });
  if (now.break) {
    const next = nextPlay(game.levels, game.clock.levelIndex);
    announce(tr('Break'), clockText(now.minutes * 60000), sub || (next ? tr('Next: {blinds}', { blinds: blindsText(next) }) : ''), tr('A good time to count the chips'));
  } else {
    announce(tr('Level {n}', { n: T.currentLevelNumber(game) }), blindsText(now), sub);
  }
  renderGame();
}

function announce(title, main, sub, note = '') {
  $('ov-title').textContent = title;
  $('ov-main').textContent = main;
  $('ov-sub').textContent = sub;
  $('ov-note').textContent = note;
  $('overlay').hidden = false;
  clearTimeout(announce.timer);
  announce.timer = setTimeout(() => ($('overlay').hidden = true), 5000);
}
$('overlay').addEventListener('click', () => ($('overlay').hidden = true));

function renderGame() {
  if (!game) return;
  renderClock();
  renderPlayers();
  renderTables();
  renderMoney();
  fitPages();
}

function renderClock() {
  const now = Date.now();
  const c = game.clock;
  const l = level();
  const n = T.currentLevelNumber(game);
  const left = C.remaining(c, game.levels, now);
  const running = C.running(c);
  const notStarted = !running && c.levelIndex === 0 && c.levelMs === 0;
  const label = l.break ? tr('Break') : tr('Level {n}', { n });
  $('c-level').textContent = running || notStarted ? label : `${label} · ${tr('Paused')}`;
  $('c-count').textContent = clockText(left);
  $('c-progress').style.width = `${(100 * C.elapsed(c, now)) / C.levelLength(game.levels, c.levelIndex)}%`;
  const next = nextPlay(game.levels, c.levelIndex);
  $('c-blinds').textContent = l.break ? tr('Break') : blindsText(l);
  $('c-ante').textContent = !l.break && l.ante ? tr('Ante {a}', { a: chips(l.ante) }) : '';
  $('c-next').textContent = next ? tr('Next: {blinds}', { blinds: blindsText(next) + (next.ante ? ` · ${tr('ante {a}', { a: chips(next.ante) })}` : '') }) : '';
  $('clock').classList.toggle('paused', !running);
  $('clock').classList.toggle('warn', running && left <= 60000);
  $('clock').classList.toggle('on-break', !!l.break);
  $('c-pause').textContent = running ? tr('Pause') : notStarted ? tr('Start the clock') : tr('Resume');
  $('c-pause').className = running ? '' : 'primary';
  $('c-mute').textContent = S().sounds.on ? tr('Sound on') : tr('Muted');

  // The compact clock above the other pages
  $('mini-level').textContent = $('c-level').textContent;
  $('mini-blinds').textContent = $('c-blinds').textContent;
  $('mini-count').textContent = $('c-count').textContent;
  $('mini-clock').classList.toggle('paused', !running);

  // Facts: once a second is plenty, but they're cheap
  const left2 = T.inPlay(game).length;
  const avg = T.averageStack(game);
  const bb = l.break ? next?.bb : l.bb;
  const toBreak = C.untilBreak(c, game.levels, now);
  const pool = T.money(game).pool;
  const leader = T.chipLeader(game);
  $('c-facts').replaceChildren(
    fact(tr('Players'), `${left2} / ${game.players.length}`, { sub: leader.length ? tr('Chip leader: {name}, {chips}', { name: leader.map((p) => p.name).join(', '), chips: chips(leader[0].stack) }) : '' }),
    fact(tr('Average stack'), chips(avg), { sub: bb ? tr('{n} big blinds', { n: Math.round(avg / bb) }) : '' }),
    fact(tr('Prize pool'), cash(pool), { gold: true }),
    fact(tr('Next break'), toBreak == null ? '–' : toBreak === 0 ? tr('Now') : clockText(toBreak)),
  );
  $('count-btn').hidden = !l.break;
  renderChipLegend();
  const status = [];
  if (T.addOnTime(game)) status.push(tr('Add-ons now'));
  const up = S().chipSet ? colourUp(S().chipSet, game.levels, c.levelIndex).filter((x) => !colourUp(S().chipSet, game.levels, 0).includes(x)) : [];
  if (l.break && up.length) status.push(colourUpText(up));
  if (S().rebuy.on && T.rebuysOpen(game)) status.push(tr('Rebuys until the end of level {n}', { n: S().rebuy.untilLevel }));
  else if (T.lateOpen(game)) status.push(tr('Late entry until the end of level {n}', { n: S().lateUntilLevel }));
  $('c-status').textContent = status.join(' · ');
}

$('c-pause').addEventListener('click', () => {
  const now = Date.now();
  game.clock = C.running(game.clock) ? C.pause(game.clock, now) : C.resume(game.clock, now);
  save();
  renderClock();
});
$('c-skip').addEventListener('click', () => {
  const before = game.clock.levelIndex;
  const wasOpen = T.rebuysOpen(game);
  game.clock = C.skip(game.clock, game.levels, Date.now(), S().smallestChip);
  save();
  levelChanged(before, wasOpen);
});
$('c-back').addEventListener('click', () => {
  game.clock = C.back(game.clock, Date.now());
  warnedLevel = -1;
  save();
  renderGame();
});
$('c-minus').addEventListener('click', () => {
  game.clock = C.addTime(game.clock, game.levels, -60000, Date.now());
  save();
  renderClock();
});
$('c-plus').addEventListener('click', () => {
  game.clock = C.addTime(game.clock, game.levels, 60000, Date.now());
  warnedLevel = -1;
  save();
  renderClock();
});
$('c-mute').addEventListener('click', () => {
  S().sounds.on = !S().sounds.on;
  save();
  renderClock();
});

// ---------- players ----------

const seatText = (p) => tr('Table {t}, seat {s}', { t: p.table, s: p.seat });
// The big blind now (at a break: the next level's)
const currentBB = () => (level().break ? nextPlay(game.levels, game.clock.levelIndex)?.bb : level().bb);
// "23 400 · 29 BB", or '' when not counted
function stackText(stack) {
  if (stack == null) return '';
  const bb = T.stackInBB(stack, currentBB());
  return bb == null ? chips(stack) : `${chips(stack)} · ${tr('{n} BB', { n: bb })}`;
}
let sortByStack = false;
const multiTable = () => game.tables.filter((t) => t.open).length > 1;

function badges(p, leaders = []) {
  return el('span', { class: 'badges' }, [
    leaders.includes(p) ? el('span', { class: 'badge leader' }, tr('Chip leader')) : null,
    p.rebuys ? el('span', { class: 'badge rebuy' }, p.rebuys > 1 ? tr('{n} rebuys', { n: p.rebuys }) : tr('Rebuy')) : null,
    p.addOn ? el('span', { class: 'badge addon' }, tr('Add-on')) : null,
    !p.paid ? el('span', { class: 'badge owes' }, cash(owed(p, S()))) : null,
  ]);
}

function renderPlayers() {
  const anyCount = T.inPlay(game).some((p) => p.stack != null);
  const bySeat = (a, b) => a.table - b.table || a.seat - b.seat;
  const inP = T.inPlay(game).sort(sortByStack && anyCount ? (a, b) => (b.stack ?? -1) - (a.stack ?? -1) || bySeat(a, b) : bySeat);
  const out = game.players.filter((p) => p.status !== 'in').sort((a, b) => a.place - b.place);
  const leaders = T.chipLeader(game);
  $('in-count').textContent = `(${inP.length})`;
  $('sort-btn').hidden = !anyCount;
  $('sort-btn').textContent = sortByStack ? tr('Sort by seat') : tr('Sort by stack');
  $('in-list').replaceChildren(
    ...inP.map((p) =>
      el('li', { class: 'player' }, [
        el('button', { type: 'button', onclick: () => openActions(p.id) }, [
          el('span', { class: 'name' }, [p.name, el('span', { class: 'sub' }, seatText(p)), p.stack != null ? el('span', { class: 'sub stack' }, stackText(p.stack)) : null]),
          badges(p, leaders),
        ]),
      ]),
    ),
  );
  $('out-title').hidden = !out.length;
  $('out-list').replaceChildren(
    ...out.map((p) => {
      const by = p.outBy && T.player(game, p.outBy);
      const why = p.status === 'left' ? tr('Left in level {n}', { n: p.outLevel }) : by ? tr('Out in level {n}, by {name}', { n: p.outLevel, name: by.name }) : tr('Out in level {n}', { n: p.outLevel });
      const prize = T.prizeOf(game, p);
      return el('li', { class: 'player out' }, [
        el('button', { type: 'button', onclick: () => openActions(p.id) }, [
          el('span', { class: 'place' }, ord(p.place)),
          el('span', { class: 'name' }, [p.name, el('span', { class: 'sub' }, why)]),
          prize ? el('span', { class: 'amount gold' }, cash(prize)) : badges(p),
        ]),
      ]);
    }),
  );
  $('undo-btn').disabled = !game.history.length;
}

// A player's options popup
function openActions(id) {
  const p = T.player(game, id);
  const dlg = $('action-dialog');
  $('action-title').textContent = p.name;
  const paidLine = p.paid ? tr('Paid {sum}', { sum: cash(owed(p, S())) }) : tr('Owes {sum}', { sum: cash(owed(p, S())) });
  $('action-text').textContent = p.status === 'in' ? [seatText(p), stackText(p.stack), paidLine].filter(Boolean).join(' · ') : paidLine;
  const act = (label, fn, cls = '') => el('button', { type: 'button', class: cls, onclick: () => { dlg.close(); fn(); } }, label);
  const buttons = [];
  if (p.status === 'in') {
    buttons.push(act(tr('Knocked out'), () => knockOutFlow(p), 'primary'));
    if (S().rebuy.on) buttons.push(act(tr('Rebuy'), () => doRebuy(p)));
    if (S().addOn.on) buttons.push(p.addOn ? act(tr('Take back the add-on'), () => change(() => T.setAddOn(game, p.id, false))) : act(tr('Add-on'), () => doAddOn(p)));
  } else if (S().rebuy.on) {
    buttons.push(act(tr('Rebuy and back in'), () => doRebuy(p), 'primary'));
  }
  buttons.push(act(p.paid ? tr('Not paid after all') : tr('Has paid {sum}', { sum: cash(owed(p, S())) }), () => change(() => T.setPaid(game, p.id, !p.paid))));
  if (p.status === 'in') buttons.push(act(tr('Change seat'), () => { goToPage(2); selectSeat({ table: p.table, seat: p.seat }); }));
  if (p.status === 'in') buttons.push(act(tr('Chip count…'), () => openCount(p.id)));
  buttons.push(act(tr('Rename'), () => renameFlow(p)));
  if (p.status === 'in') buttons.push(act(tr('Left the game'), () => leaveFlow(p)));
  $('action-buttons').replaceChildren(...buttons);
  $('action-cancel').onclick = () => dlg.close();
  dlg.showModal();
}

// After any change to the players: the seat moves, save, redraw, and the end.
function change(fn) {
  fn();
  afterChange();
}

function afterChange({ showMoves = true } = {}) {
  replan();
  save();
  renderGame();
  if (game.finished) return finish();
  if (showMoves && game.pending?.moves.length) openMoves();
}

// Works out the seat moves the tables need now (from where people actually sit).
function replan() {
  if (!game || game.finished) return;
  const r = plan(game.players, game.tables, S().seatsPerTable);
  game.pending = r.moves.length ? r : null;
}

async function knockOutFlow(p) {
  if (S().rebuy.on && T.rebuysOpen(game)) {
    const r = await ask({ title: tr('Rebuy for {name}?', { name: p.name }), text: tr('Rebuys are open until the end of level {n}.', { n: S().rebuy.untilLevel }), ok: tr('Rebuy, stays in'), cancel: tr('No, out') });
    if (r === null) return;
    if (r) return doRebuy(p, true);
  }
  const others = T.inPlay(game).filter((x) => x.id !== p.id);
  let by = null;
  if (others.length > 1) {
    by = await pickFrom(tr('Who knocked {name} out?', { name: p.name }), others.map((x) => ({ value: x.id, label: x.name, sub: multiTable() ? seatText(x) : '' })), null, tr('Skip'));
    if (by === null) return;
    if (by === SKIP) by = null;
  } else {
    by = others[0]?.id ?? null; // heads-up: the other one
  }
  T.knockOut(game, p.id, by, Date.now());
  afterChange();
  if (!game.finished) toast(tr('{name} is out in {place}', { name: p.name, place: ord(p.place) }), { label: tr('Undo'), onclick: undo });
}

async function doRebuy(p, confirmed = false) {
  if (!confirmed && !T.rebuysOpen(game)) {
    const ok = await ask({ title: tr('Rebuys are closed'), text: tr('Rebuys were open until the end of level {n}. Allow one anyway?', { n: S().rebuy.untilLevel }), ok: tr('Rebuy') });
    if (!ok) return;
  }
  const wasOut = p.status !== 'in';
  T.rebuy(game, p.id);
  afterChange();
  toast(wasOut ? tr('{name} is back in: {seat}', { name: p.name, seat: seatText(p) }) : tr('Rebuy for {name}: {chips} chips', { name: p.name, chips: chips(S().rebuy.chips) }), { label: tr('Undo'), onclick: undo });
}

async function doAddOn(p) {
  const level = T.currentLevelNumber(game);
  if (level > S().rebuy.untilLevel && !T.onBreak(game)) {
    const ok = await ask({ title: tr('Add-on'), text: tr('Add-ons are usually taken at the break after level {n}. Allow one anyway?', { n: S().rebuy.untilLevel }), ok: tr('Add-on') });
    if (!ok) return;
  }
  change(() => T.setAddOn(game, p.id, true));
  toast(tr('Add-on for {name}: {chips} chips', { name: p.name, chips: chips(S().addOn.chips) }), { label: tr('Undo'), onclick: undo });
}

async function renameFlow(p) {
  const name = await ask({ title: tr('Rename {name}', { name: p.name }), input: tr('Player name'), value: p.name, ok: tr('Save') });
  if (!name) return;
  T.rename(game, p.id, name);
  save();
  renderGame();
}

async function leaveFlow(p) {
  const stay = await ask({ title: tr('{name} leaves the game', { name: p.name }), text: tr('Do their chips stay in play, or do they take them out of the game?'), ok: tr('Chips stay in play'), cancel: tr('Chips leave too') });
  if (stay === null) return;
  T.leave(game, p.id, stay, Date.now());
  afterChange();
  toast(tr('{name} left in {place}', { name: p.name, place: ord(p.place) }), { label: tr('Undo'), onclick: undo });
}

function undo() {
  if (!T.undo(game)) return;
  afterChange({ showMoves: false });
  if (!$('screen-summary').hidden) openGame();
  toast(tr('Undone'));
}
$('undo-btn').addEventListener('click', undo);
$('sort-btn').addEventListener('click', () => {
  sortByStack = !sortByStack;
  renderPlayers();
});

$('late-btn').addEventListener('click', async () => {
  if (!T.lateOpen(game)) {
    const ok = await ask({ title: tr('Late entry is closed'), text: tr('Late entry was open until the end of level {n}. Add a player anyway?', { n: S().lateUntilLevel }), ok: tr('Add player') });
    if (!ok) return;
  }
  const name = await ask({ title: tr('Add player'), text: tr('They get {chips} chips and a seat at the table with the most room.', { chips: chips(S().startingChips) }), input: tr('Player name'), ok: tr('Add') });
  if (!name) return;
  const p = T.addLate(game, name);
  afterChange();
  toast(tr('{name}: {seat}', { name: p.name, seat: seatText(p) }), { label: tr('Undo'), onclick: undo });
});

// ---------- chip counts ----------

// Every player still in, table by table in seat order, so you can walk round
// the table. With `only`, just that player. Empty boxes keep the last count.
function openCount(only) {
  const dlg = $('count-dialog');
  const bb = currentBB();
  const left = T.inPlay(game).filter((p) => !only || p.id === only).sort((a, b) => a.table - b.table || a.seat - b.seat);
  const inputs = new Map();
  const rows = [];
  let table = null;
  for (const p of left) {
    if (!only && multiTable() && p.table !== table) rows.push(el('h3', { class: 'count-table' }, tr('Table {n}', { n: (table = p.table) })));
    const input = el('input', { type: 'text', inputmode: 'numeric', min: '0', enterkeyhint: 'next', placeholder: p.stack != null ? chips(p.stack) : '–', 'aria-label': tr('Chips for {name}', { name: p.name }) });
    const inBB = el('span', { class: 'count-bb muted small' });
    const showBB = () => (inBB.textContent = num(input, 0) != null && bb ? tr('{n} BB', { n: T.stackInBB(num(input, 0), bb) }) : '');
    input.addEventListener('input', () => { showBB(); renderCountSum(); });
    showBB();
    inputs.set(p.id, input);
    rows.push(el('label', { class: 'count-row' }, [
      el('span', { class: 'count-seat' }, String(p.seat)),
      el('span', { class: 'name' }, [p.name, p.stack != null ? el('span', { class: 'sub' }, tr('Last count {chips}, level {n}', { chips: chips(p.stack), n: p.stackLevel ?? '–' })) : null]),
      input,
      inBB,
    ]));
  }
  // Enter goes to the next box, so you can count a table without lifting the keyboard
  const list = [...inputs.values()];
  list.forEach((input, i) => input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (list[i + 1]) list[i + 1].focus();
    else input.blur();
  }));
  $('count-rows').replaceChildren(...rows);
  $('count-text').textContent = only ? tr('The chips {name} has now', { name: left[0]?.name }) : tr('Type in each player’s chips, table by table. A box left empty keeps the last count');
  const typed = () => Object.fromEntries([...inputs].map(([id, input]) => [id, num(input, 0)]).filter(([, v]) => v != null));

  // Counted so far against the chips in play (a warning, never a block)
  function renderCountSum() {
    const stacks = typed();
    const all = T.inPlay(game);
    const value = (p) => stacks[p.id] ?? p.stack;
    const total = all.reduce((s, p) => s + (value(p) ?? 0), 0);
    const missing = all.filter((p) => value(p) == null).length;
    const inPlay = T.chipsInPlay(game);
    const diff = total - inPlay;
    $('count-sum').replaceChildren(
      el('div', { class: 'count-totals' }, [
        el('span', {}, [tr('Counted so far'), el('strong', {}, chips(total))]),
        el('span', {}, [tr('Chips in play'), el('strong', {}, chips(inPlay))]),
      ]),
      el('div', { class: missing ? 'count-diff muted' : diff ? 'count-diff bad' : 'count-diff good' },
        missing ? (missing === 1 ? tr('1 player not counted yet') : tr('{n} players not counted yet', { n: missing })) : !diff ? tr('Adds up') : diff > 0 ? tr('{chips} too many', { chips: chips(diff) }) : tr('{chips} missing', { chips: chips(-diff) })),
    );
  }
  renderCountSum();

  $('count-cancel').onclick = () => dlg.close();
  $('count-save').onclick = () => {
    dlg.close();
    const stacks = typed();
    if (!Object.keys(stacks).length) return;
    T.countStacks(game, stacks, Date.now());
    afterChange({ showMoves: false });
    toast(tr('Chips counted'), { label: tr('Undo'), onclick: undo });
  };
  dlg.showModal();
  if (only) list[0]?.focus();
}
$('count-btn').addEventListener('click', () => openCount());
$('g-count').addEventListener('click', () => {
  $('settings-dialog').close();
  openCount();
});

// ---------- tables ----------

let selected = null; // { table, seat } tapped first when moving someone by hand
let tableView = loadTableView();
const VIEWS = [['drawn', 'Tables'], ['grid', 'List']];
const TABLE_ASPECT = 1.5; // the drawn table's box, as in .poker-table's aspect-ratio

function selectSeat(s) {
  selected = s;
  renderTables();
}

function renderTables() {
  const seats = S().seatsPerTable;
  const moving = new Set(game.pending?.moves.map((m) => m.id) ?? []);
  const open = game.tables.filter((t) => t.open);
  const banner = $('moves-banner');
  banner.hidden = !game.pending;
  if (game.pending) {
    banner.replaceChildren(
      el('strong', {}, movesTitle(game.pending)),
      el('span', {}, game.pending.moves.length === 1 ? tr('One player needs to move.') : tr('{n} players need to move.', { n: game.pending.moves.length })),
      el('div', {}, el('button', { type: 'button', onclick: openMoves }, tr('Show the moves'))),
    );
  }
  const who = selected && T.inPlay(game).find((p) => p.table === selected.table && p.seat === selected.seat);
  $('tables-tip').textContent = who ? tr('Now tap the new seat for {name}', { name: who.name }) : tr('To move someone by hand, tap them, then the new seat');
  $('table-view').replaceChildren(
    ...VIEWS.map(([v, label]) => el('button', { type: 'button', 'aria-pressed': String(tableView === v), onclick: () => { tableView = v; saveTableView(v); renderTables(); } }, tr(label))),
  );
  $('tables-grid').classList.toggle('drawn', tableView === 'drawn');
  if (tableView === 'drawn') return $('tables-grid').replaceChildren(...open.map((t) => drawnTable(t, seats, moving)));
  $('tables-grid').replaceChildren(
    ...open.map((t) => {
      const here = T.inPlay(game).filter((p) => p.table === t.n);
      const max = Math.max(seats, ...here.map((p) => p.seat));
      return el('div', { class: 'table-card' }, [
        el('div', { class: 'table-head' }, [el('span', { class: 'table-name' }, tr('Table {n}', { n: t.n })), el('span', { class: 'muted small' }, here.length === 1 ? tr('1 player') : tr('{n} players', { n: here.length }))]),
        el('div', { class: 'seats' },
          Array.from({ length: max }, (_, i) => {
            const seat = i + 1;
            const p = here.find((x) => x.seat === seat);
            const isSel = selected && selected.table === t.n && selected.seat === seat;
            return el('button', { type: 'button', class: [p ? '' : 'empty', isSel ? 'selected' : '', p && moving.has(p.id) ? 'moving' : ''].join(' '), onclick: () => tapSeat({ table: t.n, seat }, p) }, [
              el('span', { class: 'seat-no' }, tr('Seat {n}', { n: seat })),
              el('span', { class: 'seat-name' }, p ? p.name : tr('Empty')),
            ]);
          }),
        ),
      ]);
    }),
  );
}

// One table seen from above: the felt, the rail, and the seats round the edge.
function drawnTable(t, seats, moving) {
  const here = T.inPlay(game).filter((p) => p.table === t.n);
  const max = Math.max(seats, ...here.map((p) => p.seat));
  const leaders = new Set(T.chipLeader(game).map((p) => p.id));
  const moveOf = new Map(game.pending?.moves.map((m) => [m.id, m.to]) ?? []);
  const markers = seatPositions(max, TABLE_ASPECT).map(({ seat, x, y }) => {
    const p = here.find((q) => q.seat === seat);
    const isSel = selected && selected.table === t.n && selected.seat === seat;
    const to = p && moveOf.get(p.id);
    const cls = ['seat-marker', p ? '' : 'empty', isSel ? 'selected' : selected ? 'target' : '', p && leaders.has(p.id) ? 'leader' : '', to ? 'moving' : ''].filter(Boolean).join(' ');
    const label = p ? [tr('Seat {n}', { n: seat }), p.name, p.stack != null ? tr('{chips} chips', { chips: chips(p.stack) }) : '', to ? tr('moves to table {t}, seat {s}', { t: to.table, s: to.seat }) : ''].filter(Boolean).join(', ') : tr('Seat {n}, empty', { n: seat });
    return el('button', { type: 'button', class: cls, style: `left: ${x}%; top: ${y}%`, 'data-seat': seat, 'aria-label': label, onclick: () => tapSeat({ table: t.n, seat }, p) }, p
      ? [
          el('span', { class: 'marker-seat' }, String(seat)),
          el('span', { class: 'marker-name' }, p.name),
          p.stack != null ? el('span', { class: 'marker-stack' }, chips(p.stack)) : null,
          to ? el('span', { class: 'marker-move' }, `→ ${to.table === t.n ? to.seat : `${tr('T{n}', { n: to.table })} · ${to.seat}`}`) : null,
        ]
      : [el('span', { class: 'marker-seat' }, String(seat))]);
  });
  return el('div', { class: 'drawn-table' }, [
    el('div', { class: selected ? 'poker-table picking' : 'poker-table' }, [
      el('div', { class: 'felt' }, [
        el('span', { class: 'felt-name' }, tr('Table {n}', { n: t.n })),
        el('span', { class: 'felt-count' }, here.length === 1 ? tr('1 player') : tr('{n} players', { n: here.length })),
      ]),
      ...markers,
    ]),
  ]);
}

function tapSeat(seat, p) {
  if (!selected) {
    if (p) selectSeat(seat);
    return;
  }
  if (selected.table === seat.table && selected.seat === seat.seat) return selectSeat(null);
  const from = selected;
  selected = null;
  T.change(game, () => (game.players = swapSeats(game.players, from, seat)));
  afterChange({ showMoves: false });
}

const movesTitle = (r) => (r.final ? tr('Final table!') : r.close.length ? tr('Break table {n}', { n: r.close.join(', ') }) : tr('Balance the tables'));

function openMoves() {
  const r = game.pending;
  if (!r) return;
  const dlg = $('moves-dialog');
  $('moves-title').textContent = movesTitle(r);
  $('moves-text').textContent = r.final
    ? tr('Everyone left fits at one table. New seats for all:')
    : r.close.length
      ? tr('One table fewer is enough now. These players move:')
      : tr('One table has two more players than another. Move this player:');
  const render = () =>
    $('moves-list').replaceChildren(
      ...r.moves.map((m, i) =>
        el('li', { class: 'plain' }, [
          el('div', { class: 'move move-wrap' }, [
            el('div', { class: 'move-row' }, [el('span', { class: 'name' }, m.name)]),
            el('div', { class: 'from-to' }, r.final ? tr('Seat {n}', { n: m.to.seat }) : `${tr('Table {t}, seat {s}', { t: m.from.table, s: m.from.seat })} → ${tr('Table {t}, seat {s}', { t: m.to.table, s: m.to.seat })}`),
          ]),
          m.reason === 'balance'
            ? el('button', { type: 'button', class: 'link', onclick: async () => {
                const taken = new Set(r.moves.map((x) => x.id));
                const options = T.inPlay(game).filter((p) => p.table === m.from.table && (!taken.has(p.id) || p.id === m.id));
                const id = await pickFrom(tr('Who moves from table {n}?', { n: m.from.table }), options.map((p) => ({ value: p.id, label: p.name, sub: tr('Seat {n}', { n: p.seat }) })), m.id);
                dlg.showModal();
                if (!id) return;
                const p = T.player(game, id);
                r.moves[i] = { ...m, id, name: p.name, from: { table: p.table, seat: p.seat } };
                save();
                render();
                renderTables();
              } }, tr('Someone else'))
            : null,
        ]),
      ),
    );
  render();
  $('moves-later').onclick = () => dlg.close();
  $('moves-done').onclick = () => {
    dlg.close();
    T.change(game, () => Object.assign(game, applyMoves(game.players, game.tables, r)));
    game.pending = null;
    afterChange({ showMoves: false });
    toast(r.final ? tr('Good luck at the final table!') : tr('Seats updated'));
  };
  if (!dlg.open) dlg.showModal();
}

// After the start: the seat draw, so people know where to sit.
function showSeating() {
  const byTable = game.tables.map((t) => `${tr('Table {n}', { n: t.n })}: ${T.inPlay(game).filter((p) => p.table === t.n).sort((a, b) => a.seat - b.seat).map((p) => `${p.seat} ${p.name}`).join(', ')}`);
  ask({ title: tr('The seat draw'), text: byTable.join('\n\n'), ok: tr('Everyone is seated'), cancel: tr('Show the tables') }).then((r) => {
    if (r === false) goToPage(2);
  });
}

// ---------- money ----------

function renderMoney() {
  const m = T.money(game);
  const list = T.prizeList(game);
  $('m-facts').replaceChildren(
    fact(tr('Prize pool'), cash(m.pool), { gold: true }),
    fact(tr('Money in'), cash(m.moneyIn), { sub: m.fees ? tr('House fee {fee}', { fee: cash(m.fees) }) : '' }),
    fact(tr('Still to pay'), cash(m.unpaid)),
    fact(tr('Paid places'), String(list.filter((a) => a > 0).length)),
  );
  const byPlace = new Map(game.players.filter((p) => p.place).map((p) => [p.place, p]));
  $('m-prizes').replaceChildren(
    ...list.map((a, i) =>
      el('li', { class: 'plain' }, [el('span', { class: 'place' }, ord(i + 1)), el('span', { class: 'name' }, byPlace.get(i + 1)?.name ?? ''), el('span', { class: 'amount gold' }, cash(a))]),
    ),
  );
  const unpaid = game.players.filter((p) => !p.paid).length;
  $('m-unpaid').textContent = unpaid ? tr('({n} owe)', { n: unpaid }) : tr('(all paid)');
  $('m-payments').replaceChildren(
    ...[...game.players].sort((a, b) => a.paid - b.paid || a.name.localeCompare(b.name)).map((p) =>
      el('li', { class: 'player' }, [
        el('button', { type: 'button', onclick: () => change(() => T.setPaid(game, p.id, !p.paid)) }, [
          el('span', { class: 'name' }, [p.name, el('span', { class: 'sub' }, [tr('Buy-in'), p.rebuys ? ` + ${p.rebuys > 1 ? tr('{n} rebuys', { n: p.rebuys }) : tr('rebuy')}` : '', p.addOn ? ` + ${tr('add-on')}` : ''].join(''))]),
          el('span', { class: p.paid ? 'badge addon' : 'badge owes' }, p.paid ? tr('Paid') : tr('Owes')),
          el('span', { class: 'amount' }, cash(owed(p, S()))),
        ]),
      ]),
    ),
  );
}

$('m-edit-payouts').addEventListener('click', async () => {
  const p = await editPayouts(S().payouts, T.money(game).pool, game.players.length, S().buyIn, S().currency);
  if (!p) return;
  T.change(game, () => (S().payouts = p));
  save();
  renderGame();
});

// ---------- settings during the tournament (the cog) ----------

function renderSettingsLevels() {
  renderLevelList($('g-levels'), game.levels, {
    from: game.clock.levelIndex,
    now: game.clock.levelIndex,
    onEdit: async (i) => {
      const dlg = $('settings-dialog');
      dlg.close();
      const result = await editLevel(game.levels[i], i, game.levels, i > game.clock.levelIndex);
      if (result === 'remove') game.levels.splice(i, 1);
      else if (result) {
        // The level that's running keeps the time it has run
        if (i === game.clock.levelIndex) game.clock = C.addTime(game.clock, game.levels, 0, Date.now());
        game.levels[i] = result;
      }
      save();
      renderGame();
      openSettings();
    },
  });
}

function openSettings() {
  $('g-sound').checked = S().sounds.on;
  $('g-vibrate').checked = S().sounds.vibrate;
  setNum($('g-rebuy-until'), S().rebuy.untilLevel);
  setNum($('g-late-until'), S().lateUntilLevel);
  setNum($('g-seats'), S().seatsPerTable);
  $('g-rebuy-until').closest('label').hidden = !S().rebuy.on;
  renderSettingsLevels();
  $('settings-dialog').showModal();
}
$('settings-btn').addEventListener('click', openSettings);
$('g-done').addEventListener('click', () => $('settings-dialog').close());
$('g-sound').addEventListener('change', () => { S().sounds.on = $('g-sound').checked; save(); renderClock(); });
$('g-vibrate').addEventListener('change', () => { S().sounds.vibrate = $('g-vibrate').checked; save(); });
for (const [id, min, max, set] of [
  ['g-rebuy-until', 0, 99, (v) => (S().rebuy.untilLevel = v)],
  ['g-late-until', 0, 99, (v) => (S().lateUntilLevel = v)],
  ['g-seats', 2, 12, (v) => (S().seatsPerTable = v)],
]) {
  $(id).addEventListener('input', () => {
    const v = num($(id), min, max);
    if (v == null) return;
    set(v);
    replan();
    save();
    renderGame();
  });
}
$('g-add-level').addEventListener('click', () => {
  game.levels.push(nextLevel(game.levels, S().smallestChip));
  save();
  renderSettingsLevels();
});
$('g-add-break').addEventListener('click', () => {
  game.levels.push({ break: true, minutes: S().breakMinutes || 10 });
  save();
  renderSettingsLevels();
});
$('g-end').addEventListener('click', async () => {
  $('settings-dialog').close();
  const left = T.inPlay(game);
  if (left.length > 1) return openDeal();
  finish();
});

// Ending early: the prizes still to be won, shared out as the players agree.
function openDeal() {
  const dlg = $('deal-dialog');
  const left = T.inPlay(game);
  const total = T.remainingPrizes(game);
  const roundTo = S().payouts.roundTo || 1;
  const even = left.map(() => Math.floor(total / left.length / roundTo) * roundTo);
  if (even.length) even[0] += total - even.reduce((a, b) => a + b, 0);
  $('deal-text').textContent = tr('{n} players are still in, and {sum} is left to win. Split evenly below; change the amounts if you agreed on something else. The list order gives the places.', { n: left.length, sum: cash(total) });
  const inputs = left.map((p, i) => el('input', { type: 'text', inputmode: 'numeric', min: '0', value: boxText(even[i]), 'aria-label': p.name }));
  const check = () => {
    const sum = inputs.reduce((s, x) => s + (num(x, 0) ?? 0), 0);
    $('deal-error').textContent = sum === total ? '' : tr('The amounts add up to {sum}, not {total}', { sum: cash(sum), total: cash(total) });
    return sum === total;
  };
  inputs.forEach((x) => x.addEventListener('input', check));
  $('deal-rows').replaceChildren(...left.map((p, i) => el('label', { class: 'pay-row money' }, [el('span', {}, `${ord(i + 1)} ${p.name}`), el('span', { class: 'pay-unit' }, S().currency), inputs[i]])));
  check();
  $('deal-cancel').onclick = () => dlg.close();
  $('deal-ok').onclick = () => {
    if (!check()) return;
    dlg.close();
    T.endWithDeal(game, left.map((p, i) => ({ id: p.id, amount: num(inputs[i], 0) })), Date.now());
    finish();
  };
  dlg.showModal();
}

// ---------- the end ----------

function finish() {
  $('toast').hidden = true;
  game.clock = C.pause(game.clock, Date.now());
  game.finishedAt ??= Date.now();
  game.pending = null;
  save();
  const winner = game.players.find((p) => p.place === 1);
  saveLast({ v: 1, at: game.startedAt, name: S().name, winner: winner?.name, players: game.players.length, text: summaryText() });
  renderSummary();
  show('summary');
}

const summaryText = () => shareText(game, { tr, cash: (a) => cash(a), when: dateText(game.startedAt) });

function renderSummary() {
  const rows = results(game);
  const m = T.money(game);
  const winner = rows[0];
  $('sum-title').textContent = winner ? tr('{name} wins!', { name: winner.name }) : S().name;
  const date = dateText(game.startedAt);
  $('sum-line').textContent = [S().name, S().name.includes(date) ? null : date, hoursText(((game.finishedAt ?? Date.now()) - game.startedAt) / 60000)].filter(Boolean).join(' · ');
  $('sum-results').replaceChildren(
    ...rows.map((r) =>
      el('li', { class: 'plain' }, [
        el('span', { class: 'place' }, r.place ? ord(r.place) : ''),
        el('span', { class: 'name' }, [r.name, el('span', { class: 'sub muted small' }, [r.rebuys ? (r.rebuys > 1 ? tr('{n} rebuys', { n: r.rebuys }) : tr('1 rebuy')) : '', r.knockouts ? (r.knockouts > 1 ? tr('{n} knockouts', { n: r.knockouts }) : tr('1 knockout')) : ''].filter(Boolean).join(' · '))]),
        r.prize ? el('span', { class: 'amount gold' }, cash(r.prize)) : null,
      ]),
    ),
  );
  $('sum-settle').replaceChildren(
    ...[...rows].sort((a, b) => b.net - a.net).map((r) =>
      el('li', { class: 'plain' }, [
        el('span', { class: 'name' }, [r.name, el('span', { class: 'sub muted small' }, tr('Paid {sum}', { sum: cash(r.paid) }))]),
        el('span', { class: `amount ${r.net > 0 ? 'plus' : r.net < 0 ? 'minus' : ''}` }, `${r.net > 0 ? '+' : ''}${cash(r.net)}`),
      ]),
    ),
  );
  const ko = mostKnockouts(game);
  $('sum-facts').replaceChildren(
    fact(tr('Prize pool'), cash(m.pool), { gold: true }),
    fact(tr('Players'), String(game.players.length), { sub: tr('Rebuys: {r}, add-ons: {a}', { r: game.players.reduce((s, p) => s + p.rebuys, 0), a: game.players.filter((p) => p.addOn).length }) }),
    fact(tr('Levels played'), String(T.currentLevelNumber(game))),
    fact(tr('Most knockouts'), ko ? String(ko.count) : '–', { sub: ko?.names.join(', ') }),
  );
}

$('sum-share').addEventListener('click', () => shareOut(summaryText()));
$('sum-undo').addEventListener('click', () => {
  T.undo(game);
  game.finishedAt = null;
  save();
  openGame();
});
$('sum-new').addEventListener('click', async () => {
  const ok = await ask({ title: tr('New tournament'), text: tr('This tournament is saved as the last one, so you can share it again from the start page.'), ok: tr('New tournament') });
  if (!ok) return;
  clearGame();
  game = null;
  releaseScreen();
  renderSetup();
  show('setup');
});

// ---------- pages: swipe on a phone, tabs on a tablet sideways ----------

const PAGES = [['page-clock', 'Clock'], ['page-players', 'Players'], ['page-tables', 'Tables'], ['page-money', 'Money']];
let tab = 1; // the tablet's side panel: Players
const wideQuery = matchMedia('(min-width: 860px) and (min-height: 560px) and (orientation: landscape)');
const isWide = () => wideQuery.matches && !$('screen-game').hidden;

$('page-dots').replaceChildren(...PAGES.map(([, label], i) => el('button', { type: 'button', 'data-page': i, onclick: () => goToPage(i) }, tr(label))));
$('panel-tabs').replaceChildren(...PAGES.slice(1).map(([, label], i) => el('button', { type: 'button', onclick: () => goToPage(i + 1) }, tr(label))));

function pageIndex() {
  const pages = $('game-pages');
  return Math.round(pages.scrollLeft / pages.clientWidth) || 0;
}

function goToPage(i) {
  if (isWide()) {
    if (i > 0) tab = i;
    layout();
    return;
  }
  const pages = $('game-pages');
  pages.scrollTo({ left: i * pages.clientWidth, behavior: 'smooth' });
}

function layout() {
  document.body.classList.toggle('wide', isWide());
  PAGES.forEach(([id], i) => $(id).classList.toggle('tab-active', i === tab));
  $('panel-tabs').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i + 1 === tab)));
  fitPages();
}
wideQuery.addEventListener('change', layout);

// The pages sit side by side, so their box is as tall as the longest one; it's
// cut to the page showing, so the screen ends below it. Waits until a swipe has settled.
let fitTimer;
function fitPages() {
  const pages = $('game-pages');
  if (isWide()) {
    pages.style.height = '';
    return;
  }
  const i = pageIndex();
  const h = `${$(PAGES[i][0]).offsetHeight}px`;
  if (pages.style.height !== h) pages.style.height = h;
  $('page-dots').querySelectorAll('button').forEach((b, j) => b.classList.toggle('active', i === j));
  $('mini-clock').hidden = i === 0;
  if (i !== 2 && selected) {
    selected = null;
    renderTables();
  }
}
$('game-pages').addEventListener('scroll', () => {
  const i = pageIndex();
  $('page-dots').querySelectorAll('button').forEach((b, j) => b.classList.toggle('active', i === j));
  clearTimeout(fitTimer);
  fitTimer = setTimeout(() => {
    fitTimer = null;
    fitPages();
  }, 150);
});
for (const [id] of PAGES) new ResizeObserver(() => !fitTimer && fitPages()).observe($(id));
$('mini-clock').addEventListener('click', () => goToPage(0));

// ---------- theme ----------

const THEMES = { auto: ['🌓', 'Auto'], light: ['☀', 'Light'], dark: ['☾', 'Dark'] };
const NEXT_THEME = { auto: 'light', light: 'dark', dark: 'auto' };
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
let theme = loadTheme();

function applyTheme() {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  const [icon, label] = THEMES[theme];
  $('theme-toggle').replaceChildren(el('span', { class: 'theme-icon' }, icon), el('span', { class: 'theme-label' }, tr(label)));
  $('theme-toggle').setAttribute('aria-label', tr('Theme: {theme}. Tap to change.', { theme: tr(label) }));
  const dark = theme === 'dark' || (theme === 'auto' && darkQuery.matches);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0a0f1c' : '#f1eee8';
}
$('theme-toggle').addEventListener('click', () => {
  theme = NEXT_THEME[theme];
  saveTheme(theme);
  applyTheme();
});
darkQuery.addEventListener('change', applyTheme);
applyTheme();

// ---------- install button ----------
// Chrome and Edge fire beforeinstallprompt, so our button opens their install popup.
// iPhones and iPads can only install from Safari's Share menu, so there the button shows the steps.

function setupInstall() {
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (installed || loadInstallHidden()) return;
  const card = $('install-card');
  let installPrompt = null;
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    card.hidden = false;
  });
  addEventListener('appinstalled', () => (card.hidden = true));
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) card.hidden = false;
  $('install-btn').addEventListener('click', async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      installPrompt = null;
      if (outcome === 'accepted') card.hidden = true;
    } else if (ios) {
      $('ios-install-dialog').showModal();
    }
  });
  $('install-hide').addEventListener('click', () => {
    card.hidden = true;
    saveInstallHidden();
  });
  $('ios-install-close').addEventListener('click', () => $('ios-install-dialog').close());
}

// ---------- start ----------

document.addEventListener('pointerdown', unlockAudio);
document.addEventListener('click', unlockAudio);
document.addEventListener('visibilitychange', () => {
  if (!game || game.finished) return;
  if (document.visibilityState === 'visible') {
    keepScreenOn();
    tick();
  } else saveSeen(Date.now());
});
addEventListener('pagehide', () => game && !game.finished && saveSeen(Date.now()));
setInterval(tick, 500);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
setupInstall();

translatePage();
{
  const other = lang === 'no' ? 'en' : 'no';
  $('lang-toggle').innerHTML = `<span class="flag">${FLAGS[lang]}</span>`;
  $('lang-toggle').setAttribute('aria-label', tr('Language: {lang}. Tap for {other}.', { lang: LANGS[lang], other: LANGS[other] }));
  $('lang-toggle').addEventListener('click', () => setLang(other));
}

// The clock kept running while the app was closed: keep that, or stop it where it was?
async function checkAway() {
  const seen = loadSeen();
  const now = Date.now();
  if (!seen || !C.running(game.clock) || now - seen < 120000) return;
  const then = C.pause(C.catchUp(game.clock, game.levels, seen, S().smallestChip), seen);
  const later = C.catchUp(game.clock, game.levels, now, S().smallestChip);
  const where = (c) => tr('level {n}, {time} left', { n: levelNumber(game.levels, c.levelIndex), time: clockText(C.remaining(c, game.levels, c.runningSince ?? now)) });
  const keep = await ask({
    title: tr('The clock kept running'),
    text: tr('The app was closed for {m} min, and the clock ran on. Keep it running (now {later}), or stop it where it was ({then})?', { m: Math.round((now - seen) / 60000), later: where(later), then: where(then) }),
    ok: tr('Keep it running'),
    cancel: tr('Stop where it was'),
  });
  if (keep === false) {
    game.clock = then;
    save();
    renderGame();
  }
  saveSeen(Date.now());
}

function start() {
  if (game?.finished) {
    renderSummary();
    show('summary');
  } else if (game) {
    openGame();
    checkAway();
  } else {
    renderHome();
    show('home');
  }
}
start();

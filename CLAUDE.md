# ProPoker

A poker tournament manager for the organiser's own phone or tablet: a blind clock with sounds, players and knockouts, rebuys and add-ons, several tables with seat draw and balancing, the chip set, the prize pool and payouts, and an end-of-night summary for the group chat. A sister app to Substitutor (`~/Work/substitutor`): same stack, same glass look. `PLAN.md` has the plan; section 9 is the dated log of every decision the owner made (add new ones there, newest last). Section 10 (chip counts and the drawn table view) is built.

The owner is a beginner: explain in plain words. Commit and push only when asked, and never put the claude.ai session link in commits.

## Commands
- `npm start` – serves the app at http://localhost:8000
- `npm test` – unit tests for the logic (node --test), including "every text is translated"
- `npm run e2e` – Playwright plays a whole tournament on a phone (12 players, 2 tables, drawn tables and seat swaps, a chip count at a break, rebuy, knockouts, balancing, final table, summary, a deal) plus a tablet sideways and Norwegian. Needs `/usr/bin/chromium`. Screenshots in `test/screenshots/` (gitignored); look at them after UI changes.
- `npm run screenshots` – the README pictures (`screenshots/`) and `icons/preview.png`, from a made-up evening (14 players, level 6). Run it when the look changes.

Run `npm test` and `npm run e2e` after any change.

## Deploy
Public repo `dbugger85/propoker`, GitHub Pages from `main` / root, live at https://dbugger85.github.io/propoker/ (canonical and Open Graph tags in `index.html` point there; change them if a domain like propoker.no is bought). `git push` redeploys in about a minute.

## Rules
- Plain HTML/CSS/JS, ES modules, no framework, no build step. Only relative paths.
- `js/*.js` other than `app.js` hold no DOM code, so node can test them.
- Never the browser's `alert`/`confirm`/`prompt` or `<select>`: use `ask()` and `pickFrom()` in `app.js` (the e2e test fails on a native popup).
- All colours are CSS variables: light in `:root`, dark repeated under `prefers-color-scheme: dark` and `:root[data-theme="dark"]`; change both. Exception: real chip colours (`CHIP_COLORS` in `chips.js`) and the flags.
- Tap targets ≥ 48px (44 for small secondary ones). Phone first (~390px).
- Thousands are split by a no-break space (owner's wish): `groupDigits()` for chips, `formatMoney()` for money (both in `money.js`). Never `toLocaleString()`.
- The English text is the translation key: `tr('Add player')`. Add every new text to `NO` in `js/i18n.js`; `test/i18n.test.js` finds missing ones (tr() calls, `data-t` in the HTML, `[value, 'Label']` lists).
- When you add, rename or remove a file the app loads, update `FILES` in `sw.js`.

## Files
| File | What |
|---|---|
| `index.html` | Head scripts (saved theme before drawing; tablet upright scaling, from Substitutor), the four screens (`#screen-home`, `#screen-setup`, `#screen-game`, `#screen-summary`), the level overlay and the popups |
| `style.css` | All styles. The clock is green felt glass (`--felt*`); glass section; tablet section at the end |
| `js/app.js` | All UI, in sections: helpers, home, setup, chip set, level list, payouts editor, tournament (tick, clock, players, tables, money, settings/cog, deal), the end, pages/tabs, theme, install, start |
| `js/blinds.js` | Presets (Turbo 12 min / Standard 20 / Deep 25, as ladders in units of the first big blind), scaling and rounding to the smallest chip, antes, `nextLevel` (1.5× when the list runs out), `levelNumber` |
| `js/clock.js` | `{ levelIndex, levelMs, runningSince }` from timestamps only: catch-up over several levels, pause, skip, back (restart if > 10 s, else previous), ±1 min, time to the break |
| `js/tables.js` | Seat draw (round-robin, random seats), `seatOne` for late/back-in players, `plan()` = final table → break tables → balance, `applyMoves`, `swapSeats`, `seatPositions` (seats evenly round the drawn table's stadium edge) |
| `js/money.js` | What each owes, pool (minus house fee per player), paid places, payouts (auto / percent / fixed amounts with the rest to the winner), rounding down with the rest to 1st, min-cash, money and digit formatting |
| `js/chips.js` | Chip set (colour, value, how many you have), `makeStack` (how a stack is made of chips), `enoughFor`, `colourUp` (chips no longer needed) |
| `js/tournament.js` | The live tournament: create, knockouts, places from the order players went out, rebuy (also back in), add-on, paid, late entry, leave (chips stay or go), undo (last 20 copies of players/tables/counts), chips in play, prizes, deal, chip counts (`countStacks`, `countedTotal`, `countDifference`, `chipLeader`, `stackInBB`) |
| `js/summary.js` | Results, most knockouts, the share text |
| `js/storage.js` | localStorage, all keys `propoker.*` |
| `js/alerts.js` | Web Audio beeps (1 min left, new level, break), vibration, Wake Lock |
| `js/i18n.js` | English/Norwegian |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline (network first, 3 s), install. `icons/icon.svg` (PrimeTime-style glass disc with a spade) is the source; PNGs via `rsvg-convert` |

## How it works
- **Setup** saves as you type (`propoker.setup`); players and names from last time stay. A preset button rebuilds the levels; editing a level, Add level or Add break makes it Custom. Minutes per level/break apply to all levels. The smallest chip in the chip set rounds the blinds. The level list shows 8 rows until "Show all".
- **Chip set**: values are game points, not money (owner's wish: chips need not be 1:1 with the buy-in). Setup shows each stack (start, rebuy, add-on) as chips and, when "You have" is filled in, how many players the chips are enough for. On the clock page a legend shows the chips; ones no longer needed are struck out, and at a break the status line and overlay say "Colour up".
- **The tournament** (`propoker.tournament`, opens straight away on load). The clock starts paused ("Start the clock"). `tick()` every 500 ms: catch-up, the one-minute beep, a chime and a 5 s overlay at each new level or break. `propoker.seen` is saved every 15 s; opening the app more than 2 min after that with the clock running asks "keep it running, or stop where it was".
- **Phone**: four swipeable pages with labelled dots (Clock, Players, Tables, Money) and a small clock strip above the other pages. **Tablet sideways** (`body.wide`, ≥ 860×560 landscape): the clock fills the left, the right is a panel with tabs; `.pages` becomes `display: contents` in a grid.
- **Players**: tap a player for Knocked out (rebuy question while rebuys are open, then "who knocked them out", skippable), Rebuy, Add-on, paid, Change seat, Rename, Left the game. Rebuys/late entry/add-ons after the cut-off ask "allow anyway?". A toast with Undo after each action, and an Undo button.
- **Chip counts**: each player has `stack` (last count, or null) and `stackLevel`; `game.counts` is the history. At a break the clock page shows **Count chips** (also in the cog, and "Chip count…" in a player's options for one player). The popup lists players table by table in seat order; empty boxes keep the last count; Enter jumps to the next box; the bottom compares with chips in play (warning only). Rebuys/add-ons after a count add to the stack, a knockout clears it, late/back-in players get a known stack once there's been a count. The chip leader shows as the Players fact's sub-line, a badge on the Players page and a gold ring on the drawn table; the Players page can sort by stack.
- **Tables**: drawn by default (`drawnTable()`: a felt stadium with a `--rail`, seats placed by `seatPositions`, aspect 3:2 to match `TABLE_ASPECT`); the **List** toggle (`propoker.tableView`, per device) shows the old seat grid. Phone: tables stacked; tablet upright (≥ 680 px): two side by side; sideways: stacked in the panel. Pending movers pulse amber with "→ seat". After every change `replan()` works out the moves from where people sit (`game.pending`); the popup opens with them, a banner stays until "They have moved". "Someone else" picks another player from the same table for a balance move. **Manual moves** (owner's wish): tap a player's seat, then any seat at any table; two players swap, an empty seat is a move.
- **Money**: pool, money in, still to pay, paid places, prizes by place, and a Payments list (tap to mark paid). Payouts can be changed during the game.
- **The end**: when one player is left, or the cog's End tournament (with players left: a deal, split evenly by default). The summary has results, settle-up (prize minus paid), facts, Share (share sheet, else copy), Back to the tournament (undo), New tournament. `propoker.lastSummary` feeds the home card's "Share again".

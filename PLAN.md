# ProPoker – Implementation Plan

> Renamed from ProBlinds on 2026-10-16 (owner's choice). The first version is built and live; see CLAUDE.md for how it works. **Next up: section 10 (table view and chip counts), planned, not built.**

> **Status (2026-10-16):** plan only, nothing built yet. ProPoker is a poker tournament manager that runs on the organiser's own phone or tablet: a blind clock, players and knockouts, several tables with seating and balancing, and the money (buy-ins, rebuys, add-ons, prize pool, payouts, end-of-night summary). It is a sister app to Substitutor (`~/Work/substitutor`) and copies its stack and look. Section 9 holds the decisions so far; add every new decision there, newest last.

## 1. Tech stack and files

Same as Substitutor, on purpose, so the two apps feel the same and the same test scripts work.

- Plain HTML, CSS and JavaScript (ES modules). No framework, no build step, no runtime dependencies. `playwright-core` only for the browser test.
- Static site on GitHub Pages (`main` / root). Only relative paths (`./style.css`, `./js/app.js`), so it works at the domain root and under `/propoker/`.
- Offline: a service worker (network first, cache after 3 s or when offline, `cache: 'no-cache'` on file fetches) and a web manifest. Install card with Android prompt and iPhone steps.
- Saved in `localStorage` on every change. The clock stores timestamps, never counts ticks, so it is right after a locked screen or a reload. Screen Wake Lock while the clock runs.
- English and Norwegian (`?lang=`, saved choice, phone language), a round SVG flag in the top bar.
- Glass look with Barlow Condensed + Inter bundled, light and dark via CSS variables, Auto/Light/Dark button.
- No browser `alert`/`confirm`/`prompt` or `<select>`: the app's own `ask()` and picker popups (the e2e test fails on a native popup).

```
index.html             the one page: all screens and popups
style.css              all styles; colours as CSS variables (light and dark sets)
js/app.js              the UI (sections: helpers, home, setup, clock, players, tables, money, summary, settings, theme, install, start-up)
js/blinds.js           pure: blind presets, scaling to the starting stack, nice rounding, break placement
js/clock.js            pure: level timer maths (elapsed, catch-up over several levels, pause, skip, back, +/-1 min)
js/tables.js           pure: random seating, balancing moves, breaking a table, final table, seat swaps
js/money.js            pure: money in, fees, prize pool, paid places, payout percentages and rounding, settle-up
js/tournament.js       pure: the tournament state (knockouts and places, rebuys, add-ons, late entry, undo snapshots, chips in play, average stack)
js/summary.js          pure: the share text for the group chat
js/storage.js          localStorage load/save (with v and defaults)
js/i18n.js             English keys → Norwegian, tr(), language choice, translatePage()
js/alerts.js           sounds (Web Audio), vibration, Wake Lock (copied from Substitutor, more sound types)
sw.js, manifest.webmanifest, icons/ (icon.svg source, PNGs made with rsvg-convert), fonts/ (copied)
robots.txt, sitemap.xml, CNAME (when the domain is decided)
test/blinds.test.js, clock.test.js, tables.test.js, money.test.js, tournament.test.js, summary.test.js, i18n.test.js
test/e2e.mjs           Playwright: a whole tournament on a phone, plus iPad upright and sideways
test/screenshots.mjs   README pictures and icons/preview.png
package.json           start / test / e2e / screenshots scripts, like Substitutor
README.md, CLAUDE.md, PLAN.md (this file)
```

Rule from Substitutor that carries over: the `js/*.js` files other than `app.js` must hold no DOM code, so `node --test` can test them.

## 2. Screens

Phone first (about 390 px wide). Everything is one page with sections shown or hidden, like Substitutor's `#screen-*`.

### Home (no tournament running)
- Logo tile, "PROPOKER" title with the domain after it, tagline ("The clock, the tables and the money for your poker night").
- Big **New tournament** button. Under it, a card for the **last tournament** (date, winner, prize pool) with **Share again** and **Same settings again**.
- Install card, short intro text (for Google), small GitHub link.

### Setup (one long form in glass boxes, saved as you type)
1. **Tournament**: name (default "Poker night" + date), buy-in, starting chips, optional house fee per buy-in (for food/drinks; default 0).
2. **Blinds**: three preset buttons Turbo / Standard / Deep plus Custom; minutes per level; ante style; the full level list below (level, SB/BB, ante, break rows) that can be edited row by row (tap a row → popup), with "Add level", "Add break", "Remove".
3. **Rebuys and add-ons**: rebuys on/off, price, chips, "allowed until the end of level N"; add-on on/off, price, chips (offered at the break after level N). Late registration until level N (default: same as rebuys).
4. **Tables**: seats per table (default 9), "Draw seats at random" on/off. Shows "12 players → 2 tables of 6".
5. **Players**: a text box + Add, chips with names from last time (tap to add), the list with ✕ to remove. Count shown.
6. **Payouts**: preview from the current player count ("3 paid places: 2,200 / 1,320 / 880 kr"), with Edit (places, preset percentages, custom amounts).
7. **Start tournament** (disabled with a plain reason until valid: at least 2 players, a buy-in, at least 1 level).

### Clock (the tournament's main page)
Phone: three swipeable pages with dots, like Substitutor's list/field pages: **Clock | Players | Tables**. Pages 2 and 3 carry a compact clock strip at the top (level, time, blinds).
- **Clock page**: "Level 5" (or "BREAK"), huge countdown MM:SS (Barlow Condensed), "Blinds 300 / 600" (and "Ante 600" when on), "Next 400 / 800", progress bar, a row of small facts: players left (9 of 12), average stack, prize pool, next break in. Buttons: **Pause/Resume** (primary), **Back**, **Skip**, a ⋯ for −1 min / +1 min / mute. A status line: "Rebuys and late entry open until the end of level 4". At a level change a full-screen glass overlay shows the new blinds for 4 seconds with a chime; at a break, "Break 10:00" and "Add-ons now" if applicable.
- **Players page**: Add player (late entry) at the top, then two lists: **In play** (name, table/seat tag, rebuys/add-on badges, "owes" or "paid" marker) and **Out** (place, who knocked them out). Tap a player → actions popup: Knocked out, Rebuy, Add-on, Move seat, Mark paid, Rename, Left the game. An **Undo** button at the top (greyed when nothing to undo).
- **Tables page**: one card per table: seats 1..N with names, empty seats faint. A banner when the tables need balancing ("Move Anna: table 2 seat 5 → table 1 seat 3", Done / Choose someone else), "Break table 3" and "Final table!" announcements. Tap a seat then another to swap or move by hand.

### Tablet
- Upright: the Substitutor viewport script scales the page up to 15%; the clock page's countdown gets bigger (a `min-width: 600px` rule).
- Sideways (≥860 px wide, landscape): no swiping. A grid: the clock fills the left 7/12 like a TV blind clock (level, countdown at ~200 px, blinds, next blinds, break, the facts row along the bottom), and the right 5/12 is a side panel with three tabs (Players / Tables / Money) that scrolls on its own while the clock stays put. `body.with-panel` like Substitutor's `body.with-field`.

### Popups (`<dialog>`s)
Knockout flow (who knocked them out? → rebuy instead?), seat moves, level-change/break overlay, payouts editor, settings (⚙: edit upcoming levels, level minutes, rebuy cut-off, payouts, sounds, seats per table; Cancel restores a copy like Substitutor), player picker, `ask-dialog`, summary, iOS install steps, "The clock ran while the app was closed" question (see edge cases).

### Summary (when one player is left, or "End tournament")
Results table (place, name, prize, rebuys, knockouts), prize pool and money in, duration and levels played, "Most knockouts". **Settle up** list: each person's net (prize − what they paid), so everyone sees who sends money to whom. Buttons: **Share** (phone's share sheet, else copy), **New tournament**, **Same settings again**. The summary is kept as `propoker.lastSummary` so it can be shared again from Home.

## 3. Data model (localStorage)

All keys start with `propoker.`. Anything with the wrong `v` is ignored (bump `v` or migrate in `storage.js` when the shape changes).

- `propoker.setup` – the form, saved as you type, reused next time:
  `{ v: 1, name, currency: 'NOK', buyIn: 200, fee: 0, startingChips: 10000, smallestChip: 25, preset: 'standard'|'turbo'|'deep'|'custom', levelMinutes: 20, breakMinutes: 10, anteStyle: 'none'|'bb'|'classic', anteFromLevel, levels: [{ sb, bb, ante, minutes, break: false }], rebuy: { on: true, price: 200, chips: 10000, untilLevel: 4 }, addOn: { on: true, price: 200, chips: 15000 }, lateUntilLevel: 4, seatsPerTable: 9, randomSeats: true, payouts: { mode: 'auto'|'percent'|'fixed', percents: [50, 30, 20], fixed: [600, 200] /* 2nd, 3rd… */, roundTo: 10, minCash: true }, sounds: { on: true, oneMinute: true, levelChange: true, vibrate: true }, players: [{ id, name }], knownNames: ['Anna', 'Ben', ...] }`
- `propoker.tournament` – the live game; if present on load the app opens straight on the clock:
  `{ v: 1, startedAt, settings: <a frozen copy of setup minus players/knownNames>, levels: [...], levelIndex, levelMs, runningSince, muted, players: [{ id, name, status: 'in'|'out'|'left', table, seat, rebuys, addOn, paid, place, outBy, outLevel, outAt, chipsOut }], tables: [{ n, seatsPerTable, open: true }], pendingMoves: [{ id, from: {table, seat}, to: {table, seat}, reason: 'balance'|'break'|'final' }], log: [{ at, text }], history: [<up to 20 earlier copies of players + tables + pendingMoves>], finished: false }`
  Time: `levelMs` is time already run in the current level; while running, elapsed = `levelMs + (now − runningSince)`; `runningSince` is null while paused. Exactly Substitutor's `clockMs`/`runningSince` idea.
- `propoker.lastSummary` – `{ v: 1, at, name, text, results: [...] }` for "Share again".
- `propoker.theme` – `'light'` or `'dark'` (missing = Auto). `propoker.lang` – `'en'`/`'no'`. `propoker.installHidden` – `'1'`.

## 4. Rules and algorithms (plain words)

### Blind presets
Each preset is a ladder of big blinds measured in "units", where one unit is the first big blind. The first big blind comes from the starting stack: **Standard and Turbo start at 100 big blinds** (unit = starting chips ÷ 100), **Deep starts at 200** (unit = starting chips ÷ 200). The small blind is half the big blind. With the default 10,000 chips this gives:

**Standard** – 20-minute levels, a 10-minute break after every 4 levels (so every 80 minutes). About 4–5 hours for 10–20 players.

| Level | Blinds | | Level | Blinds |
|---|---|---|---|---|
| 1 | 50 / 100 | | 10 | 1,500 / 3,000 |
| 2 | 100 / 200 | | 11 | 2,000 / 4,000 |
| 3 | 150 / 300 | | 12 | 3,000 / 6,000 |
| 4 | 200 / 400 | | break | |
| break | | | 13 | 4,000 / 8,000 |
| 5 | 300 / 600 | | 14 | 6,000 / 12,000 |
| 6 | 400 / 800 | | 15 | 8,000 / 16,000 |
| 7 | 600 / 1,200 | | 16 | 10,000 / 20,000 |
| 8 | 800 / 1,600 | | 17 | 15,000 / 30,000 |
| break | | | 18 | 20,000 / 40,000 |
| 9 | 1,000 / 2,000 | | | |

**Turbo** – 12-minute levels, a break after every 5 levels (every hour). Steeper ladder, about 2–3 hours: 50/100, 100/200, 200/400, 300/600, 400/800, *break*, 600/1,200, 800/1,600, 1,200/2,400, 1,600/3,200, 2,500/5,000, *break*, 4,000/8,000, 6,000/12,000, 8,000/16,000, 12,000/24,000, 16,000/32,000, 25,000/50,000.

**Deep** – 25-minute levels, a break after every 4 levels (every 100 minutes). Gentle ladder, 5+ hours: 25/50, 50/100, 75/150, 100/200, *break*, 125/250, 150/300, 200/400, 250/500, *break*, 300/600, 400/800, 500/1,000, 600/1,200, *break*, 800/1,600, 1,000/2,000, 1,500/3,000, 2,000/4,000, *break*, 3,000/6,000, 4,000/8,000, 5,000/10,000, 6,000/12,000.

**Other starting stacks** (`blinds.js` does this): multiply the ladder by the unit, then round each big blind to a sensible chip amount: to the nearest smallest chip (default 25) up to 1,000, to the nearest 100 up to 10,000, then to the nearest 1,000. The small blind is half, rounded to the smallest chip. If two levels round to the same number, the duplicate is dropped. Example: 5,000 chips Standard → 25/50, 50/100, 75/150, 100/200, 150/300… The ladder never runs out: if the game outlasts the list, the app keeps adding levels that are 1.5× the last one, rounded.

**Antes**: `none` (default), `bb` (big blind ante: one ante the size of the big blind, posted by the big blind, from a chosen level – default from the first level after the first break), or `classic` (every player posts about 10% of the big blind, rounded to the smallest chip). Only shown on the clock when on.

### Timer
- Elapsed in the level = `levelMs + (now − runningSince)` while running. The screen redraws twice a second, but the time always comes from the timestamps, so a locked phone or a reload changes nothing.
- When elapsed ≥ the level's minutes, the app moves to the next level and carries the remainder over (if the phone slept through 25 minutes of 20-minute levels, it lands in the next level at 5:00, not at 0:00). A break is simply a level with `break: true` and the break length.
- **Pause** sets `runningSince` to null after folding the time into `levelMs`. **Resume** sets `runningSince = now`. **Skip** jumps to the next level at 0:00. **Back** restarts the current level if more than 10 seconds have run, otherwise goes to the previous level (like a music player). **−1 / +1 minute** adjust `levelMs`. All of these work while paused.
- Warnings: a double beep plus vibration at 1:00 left, a three-tone chime and a 4-second overlay at the level change, a longer chime at a break's start and end. A mute switch on the clock. Sound needs a tap first, so `unlockAudio()` runs on every tap (Substitutor's trick). iPhones in silent mode play no sound, and iOS ignores vibration; Wake Lock keeps the screen on so this rarely matters.
- Wake Lock is requested when the clock runs and re-requested on `visibilitychange`; released when paused or finished.

### Seating
- Number of tables = players ÷ seats per table, rounded up (12 players, 9 seats → 2 tables). Players are shuffled and dealt one at a time to the tables, so table sizes differ by at most one. Seats within a table are random too. Seat numbers are 1..N clockwise; the app does not track the dealer button (the table does that).
- A late entry sits at the table with the fewest players, in a random free seat.
- Random seating can be turned off: then everyone starts at table 1 with seats in the order added (for the "one table, who cares" night).

### Balancing, breaking, final table (`tables.js`, run after every knockout, late entry, or "left")
1. **Final table**: if players left ≤ seats per table and more than one table is open, everyone moves to the lowest-numbered table with a fresh random seat draw. Announcement: "Final table! Table 1: seat 1 Anna, seat 2 Ben…".
2. **Break a table**: if players left ≤ (open tables − 1) × seats per table, the table with the fewest players (tie: the highest number) closes. Its players take free seats at the other tables, emptiest table first, random seat. Announcement lists every move.
3. **Balance**: if the fullest table has 2 or more players more than the emptiest, one player moves from the fullest to a random free seat at the emptiest. The app picks the player at random (there is no button tracking); "Choose someone else" lets the organiser pick (poker rooms move the player who would be next big blind). Repeat until the difference is at most 1.
- Moves are shown in a popup and stay as a banner on the Tables page until **Done**. The data is updated when Done is tapped, so the Tables page always shows where people actually sit.
- Manual: tap a seat, then another seat (or an empty one), to swap or move.

### Payouts (`money.js`)
- **Paid places by player count** (not counting rebuys), unless set by hand: 2–4 players → 1 place, 5–7 → 2, 8–13 → 3, 14–20 → 4, 21–29 → 5, 30–39 → 6, 40+ → 7. Roughly one paid place per 5–7 players.
- **Three ways to split** (chosen in the payouts editor):
  - **Automatic**: paid places from the table above, percentages from the presets below.
  - **Percentages**: you choose the number of places and each place's percent.
  - **Fixed amounts** (owner's wish 2026-10-16): a fixed amount for some places (e.g. 2nd 600 kr, 3rd 200 kr = the buy-in back), and **the rest goes to the winner**. If the pool is smaller than the fixed amounts, the editor says so in red.
- **Percent presets**: 1 → 100; 2 → 65/35; 3 → 50/30/20; 4 → 45/27/18/10; 5 → 40/25/16/11/8; 6 → 38/23/15/10/8/6; 7 → 35/22/14/10/8/6/5. Custom: edit the percentages (must add up to 100; the editor shows the running total) or type the amounts directly (the editor shows what is left to hand out).
- **Rounding**: each prize = pool × percent, rounded **down** to the rounding unit (default 10 in the chosen currency); whatever is left over goes to first place. So the prizes always add up to the pool exactly, and nobody gets 733.33.
- **Min-cash rule** (on by default): if the last paid place would win less than one buy-in, pay one place fewer and recompute. The payouts box says so in plain words.
- Payouts update live as rebuys and add-ons come in; the clock's facts row shows the current pool, and the Players page shows "3 places: 2,200 / 1,320 / 880".

### Money accounting
- Each player owes: buy-in + rebuys × rebuy price + (add-on ? add-on price : 0). A **Paid** tick per player; the Players page can show who still owes.
- Money in = the sum of everything owed. House fee = fee × number of buy-ins (not rebuys). **Prize pool = money in − fees** (minus bounties if that later option is turned on).
- Settle up at the end: net per person = prize won − what they paid. Positive numbers receive, negative send. Shown in the summary and in the share text.
- Amounts are shown with `Intl.NumberFormat` for the chosen currency and the app's language (so "2 200 kr" / "kr 2,200" sort themselves out).

### Chips and average stack
- Chips in play = Σ over players (starting chips + rebuys × rebuy chips + add-on chips if taken), minus chips a player who "left" took out of the room. Knocked-out players' chips stayed on the tables, so they still count.
- Average stack = chips in play ÷ players left, rounded to the smallest chip; also shown as big blinds ("8,900 ≈ 15 BB").

### Knockouts and places
- "Knocked out" → optional "Who knocked them out?" (picker; Skip allowed) → if rebuys are still open: "Rebuy and stay in?" (Yes → `rebuys + 1`, stays in; No → out). Place = number of players still in before this knockout (the last one standing is 1st). A toast "Anna out in 7th – Undo".
- When exactly one player is in, the tournament is finished: the clock stops and the summary opens.

### Undo
- Before any change to players or tables, a copy of `players`, `tables` and `pendingMoves` is pushed on `history` (last 20). **Undo** pops one. The clock fields are never part of the copy, so undoing a knockout does not move the time.

## 5. Edge cases
- **Undo a knockout**: Undo (or the toast) puts the player back in play at the old seat. `place` is stored, but `tournament.js` recomputes all places from the order players went out (`outAt`) after every change, so an undo in the middle never leaves a gap.
- **Two out in the same hand**: in the knockout popup, "Also out in this hand" lets you pick others. They share the same place, and if both places are paid, the two prizes are added and split equally.
- **Late registration**: "Add player" on the Players page until the cut-off level; after that the button asks "Late entry is closed. Add anyway?" They get a full starting stack, a buy-in on their tab and a seat at the emptiest table.
- **Rebuy after the cut-off**: allowed with a confirm ("Rebuys closed after level 4. Allow anyway?"). The organiser is the boss; the app only reminds.
- **Player leaves with chips**: "Left the game" → "Did their chips stay in play?" If no, their bought chips are taken out of the chip count. They get a place like a knockout (no eliminator) and still owe their buy-in/rebuys.
- **Odd rounding**: the leftover from rounding down always goes to 1st, so the prizes always sum to the pool. If custom percentages don't add up to 100 the editor says how far off they are and Start/Done waits. Custom amounts that don't add up show the difference in red.
- **Pause during a break**: works the same as any level (fold the time in, stop). The break overlay shows PAUSED. Resuming does not restart the break.
- **The app was closed for a while**: on load, if the clock was running and more than 2 minutes passed since the last save, ask: "The clock ran 14 min while the app was closed. Keep it (now level 6, 3:12) or go back to where it was (level 5, 17:12, paused)?" Default: keep.
- **Seat moves ignored**: pending moves stay as a banner; a new knockout recomputes them from the current (not the pending) seating, so the banner always shows a consistent set.
- **Editing blinds mid-game**: the settings popup edits upcoming levels only; the current level keeps its time. Deleting the current level is not allowed.
- **Changing the buy-in mid-game**: allowed with a warning; everyone's tab recomputes.
- **Final table deal**: "End tournament" with players left opens a split editor: equal split of the remaining prize money by default, amounts editable, must sum to what is left. The remaining players share the top places, and the summary says "Deal".
- **Zero or one player**: Start stays disabled with "Add at least 2 players".
- **Storage unavailable** (private mode): the app still runs; nothing is saved (same `try/catch` as Substitutor).
- **Background sounds on iOS**: Safari does not play sound from a background tab. The plan relies on Wake Lock (screen stays on) and notes this in the README.

## 6. Deploy
- Public repo `dbugger85/propoker`, GitHub Pages from `main` / root, no build step. `git push` redeploys in about a minute. Commit and push only when asked, and never put the claude.ai session link in commits.
- Domain to decide (open question). Suggested: `propoker.no` at Domeneshop, same DNS as Substitutor (four A records 185.199.108–111.153, `www` CNAME `dbugger85.github.io`), a `CNAME` file in the repo, Enforce HTTPS. The header shows ".no" after the name like Substitutor and PrimeTime's ".re". Until then it runs at `https://dbugger85.github.io/propoker/`.
- `robots.txt`, `sitemap.xml`, hreflang and Open Graph tags like Substitutor, `icons/preview.png` made by the screenshot script.

## 7. Build order (each step is something you can open and try)
1. **Skeleton**: copy from Substitutor `index.html`'s head (theme and tablet scripts), `style.css` (rename the pitch colours to felt/gold, see palette), `fonts/`, `sw.js`, `manifest.webmanifest`, `storage.js`, `i18n.js` (emptied), `alerts.js`, `package.json`, the test scaffolding. New icon (a poker chip with a clock hand). Try: the page opens with the title and theme button.
2. **Blind logic** (`blinds.js` + tests): presets, scaling, rounding, breaks, "keep going" levels. Try: `npm test`.
3. **Setup screen**: tournament box, blinds box with the preset buttons and the editable level list, saved as you type. Try: pick Deep, see the list change; reload keeps it.
4. **Clock** (`clock.js` + tests, clock page in `app.js`): start with the setup's levels, countdown, pause/resume/skip/back/±1 min, level and break overlays, saved state and "ran while closed" question. Try: start, lock the phone 2 minutes, unlock: time is right.
5. **Sounds and wake lock**: beeps, chimes, vibration, mute, Wake Lock. Try on a real phone.
6. **Players and knockouts** (`tournament.js` + tests): players in setup with "names from last time", Players page, knockout flow with eliminator, places, undo, finish when one is left, a plain summary. Try a 4-player game to the end.
7. **Money** (`money.js` + tests): buy-in, fee, rebuys and add-ons with cut-offs, prize pool, paid places, percentage presets, rounding, min-cash, payouts editor in setup and in ⚙. Try: 10 players, 3 rebuys, see the pool and the prizes change.
8. **Summary and share** (`summary.js` + test): results, settle-up, share sheet / copy, `lastSummary` and the Home card. Try sharing to yourself.
9. **Tables** (`tables.js` + tests): random seating at start, the Tables page, late entry seating, manual swaps.
10. **Balancing, breaking, final table**: moves popup and banner, "Choose someone else". Try: 12 players at 2 tables, knock out 4, see the break-table announcement; down to 9, the final table.
11. **Tablet**: upright scaling check; sideways TV clock + side panel with tabs. Try in a desktop browser at 1180×820.
12. **Norwegian**: translate everything, the flag, `i18n.test.js` passes.
13. **PWA**: install card, iOS steps, service worker file list, offline check (airplane mode).
14. **Browser test and pictures**: `test/e2e.mjs` plays a full tournament (shift `runningSince` in localStorage to fast-forward levels like Substitutor's screenshot script), phone + iPad both ways; `test/screenshots.mjs` for the README; write README and CLAUDE.md.
15. **Deploy**: repo, Pages, domain, Search Console.

## 8. Open questions (with a recommended default)
1. **Currency and rounding unit** – default NOK, prizes rounded to 10 kr (option: 50 kr). Currency is a setting per tournament, so visitors elsewhere can pick EUR/USD/GBP/SEK/DKK.
2. **Late registration** – default: allowed until the same level as rebuys (end of level 4 in Standard), with a full starting stack and a normal buy-in.
3. **House fee / rake** – default none. Option: a fixed amount per buy-in (not per rebuy) kept out of the prize pool, shown in the summary as "Food and drinks".
4. **Ante style** – default none (fewer chips to count at home). Options: big blind ante from the first level after the first break, or classic antes.
5. **Bounties** – default off in v1; the data model leaves room (`bounty` per player paid to the eliminator). A later idea unless you want it now.
6. **Rebuy rule** – default: the app offers a rebuy when someone is knocked out during the rebuy period, and the player actions also have "Rebuy" at any time until the cut-off (for "rebuy when under the starting stack" house rules). The app never checks stack sizes.
7. **Add-on** – default: on, offered at the break that ends the rebuy period, same price as the buy-in, 1.5× the starting chips.
8. **Seats per table** – default 9 (8 for a cosier home game). Final table size = seats per table.
9. **Sounds** – default: double beep at 1 minute left, three-tone chime at a level change, longer chime for breaks, vibration on Android, mute button. Option later: a 10-second countdown tick.
10. **Who moves when balancing** – default: a random player from the fullest table, with "Choose someone else". Alternative: always ask.
11. **Paid-places table** – the one in section 4, or your club's habit?
12. **Domain** – `propoker.no` at Domeneshop (recommended), or stay on github.io for now.
13. **Palette** – felt green and gold (see below), or navy and gold?

### Suggested palette (keeps the family look)
Same warm off-white page in light and navy `#0a0f1c` in dark, the same glass variables. The accent `--green` becomes a deeper felt green (`#1a6b45` light, `#3fbf7a` dark). A new `--gold` for money (`#8a6200` on light, `#e8c35a` on dark) with a soft version for badges. The still glow: felt green top-left, gold top-right, a cool blue bottom-right. The big clock panel on the tablet uses a `--felt` tinted glass (deep green with white text), like Substitutor's pitch, so it reads like a poker table. Fonts unchanged.

## 9. Decisions (newest last)

**2026-10-16**
- Name: ProPoker.
- One device: the organiser's own phone or tablet runs everything. No second screen in v1.
- Several tables: random seating, table balancing with "move seat X at table Y to seat Z at table W", breaking tables, final table.
- Real money: buy-ins, rebuys, add-ons, prize pool, payouts with presets (50/30/20 and others) and custom, adjusting to the number of players; an end-of-night summary shareable to a group chat.
- Rebuys with a cut-off level; add-ons too.
- Works on phones and tablets and matches the look of the owner's other apps (Substitutor/PrimeTime glass look).
- Core features accepted: setup (name, buy-in, starting chips, tables, Turbo/Standard/Deep or custom blinds with breaks, rebuy/add-on rules, players typed or reused), clock screen (big countdown, current/next blinds, sound + vibration, pause/resume/skip/back, side facts), tablet landscape as a TV-like clock, phone swipes between clock and players, knockouts with eliminator, rebuy, add-on.
- Later ideas, not v1: second screen, season stats/leaderboard, chip set calculator.
- Stack: same as Substitutor (plain JS, GitHub Pages, offline PWA, localStorage, timestamps for the clock, Wake Lock, English + Norwegian, glass look, light/dark, unit tests + Playwright). No session links in commits; commit/push only when asked.
- Manual moves (owner's wish): tap a player's seat, then any seat at any table; two players swap places, an empty seat is a move.
- Chip set (owner's wish): the chip colours and their values, set in setup; chip values are game points, not money. The app shows how each stack (start, rebuy, add-on) is made of chips, whether the chips you have are enough, and when a colour can be coloured up. The smallest chip rounds the blinds (replaces the "smallest chip" box).
- Name changed to **ProPoker** (folder `~/Work/propoker`, storage keys `propoker.*`).
- Thousands are split by a space that never wraps (10 000), in both languages, for chips and money.
- Icon in PrimeTime's style (gradient, glass disc with a rim light, a white symbol), with a spade; the disc and spade a little larger, the spade a little higher.
- Built in this session: everything in section 7, with README screenshots (`npm run screenshots`). Published as the public repo dbugger85/propoker, live on GitHub Pages at https://dbugger85.github.io/propoker/ (no own domain yet).
- Next (owner's wish 2026-10-16): a drawn **table view** and **chip counts at breaks**. Planned in section 10, built the same day (see 10.4).
- Number boxes (owner's wish 2026-10-16): **right-aligned, not centred**, and **with the thousands split** (10 000) as you type. They're text boxes that open the number keyboard (`inputmode`), since a `type="number"` box can't show the space.
- Input boxes (owner's wish 2026-10-16): **no glass look**, but recessed wells (a faint fill, a hairline border, a soft green border while typing). Buttons stay glass.
- Chips (owner's wish 2026-10-16): **drawn as vector graphics** (SVG: six edge spots and an inner ring) instead of CSS gradients, which looked fuzzy; white and yellow chips get grey spots and a darker edge so they show on a light background. **Own colour…** in the colour list picks any colour with the phone's colour picker.
- Money (owner's wish 2026-10-16): **always the currency code first**, the same in every language and currency: NOK 1 000, SEK 1 000, EUR 1 000 (no kr, € or £), also beside the payout and deal boxes. The currency stays, because it's what tells money apart from chip amounts.
- Own blinds (owner's wish 2026-10-16): Turbo / Standard / Deep are always the defaults; **Custom** keeps your own levels separately (`customLevels`), so switching to a preset to compare never loses them, and no "are you sure?" is needed. Editing a level while on a preset starts a new own list from that preset.

## 10. Table view and chip counts (planned 2026-10-16, built 2026-10-16)

Two features that fit together: the table view shows each seat's latest chip count. Build the chip counts first (smaller, and the table view then has something to show), then the table view. Each step can be opened and tried.

### 10.1 Chip counts at breaks

**What it's for:** at a break the organiser goes round the tables and types in each player's stack. The app then knows who has how many chips, not only what they bought.

**Where:**
- At every break the clock page shows a **Count chips** button under the facts (and the break overlay mentions it). It can also be opened at any time from the cog, and from a player's options ("Chip count…" for one player).
- The count opens a popup (`#count-dialog`, a scrolling dialog like the payouts editor) with every player still in, **table by table, in seat order**, so you can walk round the table. Each row: name, seat, a number box (`inputmode="numeric"`, prefilled with the last count if there is one, else empty), and the stack in big blinds next to it as you type.
- Enter in a box jumps to the next box (fast counting on a phone).
- At the bottom: **Counted so far** vs **Chips in play** (`T.chipsInPlay()`), and the difference in plain words: "12 500 too many" / "2 000 missing" / "Adds up". A mismatch is a warning, not a block (someone may have miscounted or a rebuy wasn't entered); Save still works. Players left empty keep their last count (or none).
- **Save** stores the counts; **Cancel** throws them away.

**Data** (in `propoker.tournament`):
- On each player: `stack: number | null` (the last counted stack) and `stackLevel: number | null` (the level number when counted).
- On the tournament: `counts: [{ at, level, total }]`, a short history for the summary (optional).
- Rebuys and add-ons after a count add their chips to `stack` (so the count stays useful until the next one); a knockout sets `stack` to 0 / null.
- Saving a count goes through `T.change()` so **Undo** covers it.

**Rules (`tournament.js`, pure, with tests):**
- `countStacks(t, { id: stack }, now)` sets the stacks, records the level.
- `countedTotal(t)` and `countDifference(t)` (counted − chips in play, for players with a count).
- `chipLeader(t)`: the player still in with the biggest counted stack (ties: all of them).
- `stackInBB(stack, level)` → whole big blinds.
- Tests: totals, difference, leader, rebuy after a count, undo.

**Shown:**
- Players page: the stack under the seat ("Table 1, seat 4 · 23 400 · 29 BB") and a small crown/"Chip leader" badge. Optional sort: by seat (default) or by stack.
- Clock facts: "Chip leader: Nora, 41 200" as a fact tile once there's a count (replaces nothing; the facts grid gets a fifth tile or the leader goes in the status line; decide when building).
- Summary: the last count's chip leader before the end is not needed; keep the summary as it is.
- Share text unchanged.

**Translations:** every new text into `NO` (the i18n test will catch missing ones).

**e2e:** at a break, open Count chips, fill all boxes, check the difference line, save, check the Players page shows stacks and the leader; a rebuy afterwards adds to the stack; Undo removes the count.

### 10.2 Table view (a drawn poker table)

**What it's for:** the Tables page shows each table as a real poker table seen from above, a green felt oval with the seats around the edge, instead of the grid of seat buttons. Like Substitutor's field view (`renderField()` and the `.pitch` styles are the model to copy).

**Look:**
- An oval (stadium shape) in felt glass (`--felt`, the same tinted glass as the clock), a rim in a darker "rail" colour (new variable `--rail`, light and dark sets), a thin inner line, and "Table 2" written faintly in the middle with the number of players.
- Seats as round markers placed evenly around the oval (seat 1 at the bottom middle, then clockwise, like the dealer's view). Each marker: the seat number small on top, the name (shortened with an ellipsis), and the latest chip count small underneath when there is one. Empty seats are faint dashed circles with the number only.
- Markers in the clock's glass style (white text on dark felt glass), like Substitutor's player chips.
- The chip leader's marker gets a gold ring; players who must move (pending moves) pulse amber with an arrow to their new seat number.

**Placing the seats** (pure function in `tables.js` or a new `tableview.js`, tested): `seatPositions(seats)` → `[{ seat, x, y }]` in percent of the box, evenly spaced along the oval's edge (use the stadium's perimeter so spacing looks even on the long sides, not plain angles). Works for 2–12 seats.

**Using it:**
- Tap a player, then any seat at any table: swap or move, exactly as now (`tapSeat()` and `swapSeats()` stay). The chosen marker lifts and the free/target seats get a ring, like Substitutor's "Swap with…".
- Tap an empty seat first: nothing (as now).
- The pending-moves banner stays above the tables.

**Layout:**
- Phone: one table per screen width, stacked down the Tables page (scrolling), the oval about 330×220 px. A small "list" toggle at the top switches back to the current seat grid for people who prefer it (`setup` or tournament setting `tableView: 'drawn' | 'grid'`, default drawn).
- Tablet sideways: in the right panel, the tables stacked; with only one table (final table) it fills the panel.
- Tablet upright: two tables side by side if there's room (≥ 680 px wide).

**Accessibility:** markers are buttons with `aria-label` "Seat 4, Nora, 23 400 chips"; empty "Seat 5, empty".

**Translations, tests:** new texts into `NO`; unit test for `seatPositions` (count, all inside the box, evenly spaced); e2e: swap two players on the drawn table across tables, screenshot the Tables page; update `npm run screenshots` (the README's `phone-tables.png` and `ipad-tables.png`) and the README text.

### 10.3 Order of work
1. Chip-count rules + tests (`tournament.js`).
2. Count chips popup, the break button, stacks on the Players page, chip leader.
3. e2e for counting; translations.
4. `seatPositions` + test.
5. The drawn table on the Tables page (phone), tap to move/swap.
6. Tablet layouts, the grid/drawn toggle.
7. Stacks and leader on the drawn table; pending moves on it.
8. e2e, screenshots, README, CLAUDE.md, this section's status → built.

### 10.4 Built (2026-10-16): what changed from the plan
- **Chip leader on the clock page**: as the sub-line of the Players fact tile ("Chip leader: Nora, 41 200"), not a fifth tile or the status line, so the grid stays even.
- **Count popup boxes start empty** with the last count shown faintly inside (and "Last count …, level n" under the name), so a box left empty clearly keeps the old count and the level of a count isn't changed by just pressing Save.
- **"Counted so far" vs "Chips in play"**: until everyone still in has a count, it says "n players not counted yet" instead of a difference.
- **Late entries and players back in after a rebuy** get a known stack (starting or rebuy chips) once there has been a count; before the first count nobody has one.
- **The drawn/list choice** is kept per device (`propoker.tableView`), not in the tournament, so it stays from night to night. The toggle reads **Tables / List**.
- `seatPositions` lives in `tables.js` (no new file).
- `sw.js` now also caches `chips.js` (it was missing, so the app didn't open offline before the first online visit cached it).


# ProPoker

**The clock, the tables and the money for your poker night, on one phone or tablet.**

Open it at **https://dbugger85.github.io/propoker/**. It's free, with no sign-up, and works without signal. It's in English and Norwegian.

<p>
  <img src="screenshots/phone-clock-light.png" width="240" alt="The blind clock">
  <img src="screenshots/phone-tables.png" width="240" alt="Two poker tables seen from above, with each player's chips">
  <img src="screenshots/phone-clock-dark.png" width="240" alt="The clock in dark mode">
</p>

## What it does

- **A big blind clock** with sounds: two beeps at one minute left, and a chime and a big announcement at every new level and break. It keeps the right time even if the phone locks.
- **Three blind structures**: Turbo (12-minute levels), Standard (20) and Deep (25), with breaks. You can also build your own, level by level.
- **Players and knockouts**, with who knocked whom out. Also rebuys, add-ons, late entry, players who leave, and undo for every step.
- **Several tables**, drawn as real poker tables seen from above: a random seat draw, then the app tells you when to move a player, when to close a table, and when it's the final table. You can also move players yourself.
- **Chip counts** at the breaks: type in each stack, and the app shows the chip leader and each player's stack in big blinds.
- **Your chip set**: each colour's value, and how many of each colour every player gets. Chips are game points, not money.
- **Money**: buy-ins, rebuys and add-ons. It shows who has paid, the prize pool and the prizes.
- **At the end**: results, who owes whom, and a text to share in the group chat.

On a tablet held sideways, the clock fills the left half like a TV, with players, tables and money on the right.

<img src="screenshots/ipad-light.png" width="740" alt="ProPoker on an iPad held sideways">

## How to run a tournament

### 1. Set up
Tap **New tournament** and fill in from top to bottom. Everything is saved as you type, and the players are kept for next time. Names from earlier nights show up as buttons you can tap to add.

- **Tournament**: name, currency, buy-in, starting chips, and an optional house fee per player (for food and drinks; it doesn't go into the prize pool).
- **Chips**: your chip colours (from the list, or **Own colour…** for any colour) and what each is worth. Fill in **You have** to check that your chips are enough for everyone. The blinds are rounded to your smallest chip.
- **Blinds**: pick Turbo, Standard or Deep, or tap a level to change it. Minutes per level and per break apply to every level. Antes are optional: one ante the size of the big blind (BB ante), or a small ante from every player (Classic).
- **Rebuys and add-ons**: the price, the chips, and the last level they're allowed. The add-on is offered at the break after the last rebuy level.
- **Tables**: seats per table (2–12), and whether seats are drawn at random.
- **Payouts**:
  - **Automatic**: 1 paid place up to 4 players, 2 from 5, 3 from 8, 4 from 14 and so on. It pays one place fewer if the last one would win less than the buy-in.
  - **Percentages**: you choose the places and each place's percent.
  - **Fixed amounts**: for example 500 kr for 2nd and the buy-in back for 3rd, with the rest to the winner.

<p>
  <img src="screenshots/phone-chips.png" width="240" alt="The chip set in setup">
</p>

Tap **Start tournament**. The seat draw shows where everyone sits.

### 2. Play
- **Start the clock** when everyone is seated. **Pause** stops it. The arrow buttons go to the next level, or back (the first tap restarts the level, a second goes to the one before). ±1 min adjusts the time.
- **Swipe** between the four pages: Clock, Players, Tables and Money. On a tablet held sideways, use the tabs instead.
- **Tap a player** to knock them out, give a rebuy or an add-on, mark them as paid, change their seat, rename them, or record that they left. If you tap by mistake, use **Undo**.
- **Late entry**: **Add player** on the Players page. The new player gets a seat where there's most room.
- When tables need evening out, a popup lists **who moves where**. Tap **They have moved** once it's done, or **Someone else** to pick a different player.
- **The Tables page** shows each table from above, with the seats round the edge. Players who must move pulse orange, with their new seat. **List** at the top switches to a plain list of seats.
- **Move players by hand**: on the Tables page, tap a player and then the new seat, at the same table or another one. If the seat is taken, the two players swap.
- **Count chips** at a break (the button under the clock, or the cog at any time): type in each player's chips, table by table; Enter jumps to the next box. At the bottom it says whether the total adds up with the chips in play. The Players page then shows each stack, the chip leader, and can sort by stack. Rebuys and add-ons after a count are added to the stack. To count one player, tap them and pick **Chip count…**.
- At a break the clock page says when the smallest chips are no longer needed (**colour up**).
- The **cog** (⚙) changes sounds, cut-off levels, seats per table and the coming levels. It also has **End tournament**: if players are still in, they can make a deal and split the rest of the prize money.

<p>
  <img src="screenshots/phone-players.png" width="240" alt="Players with rebuys and add-ons">
  <img src="screenshots/phone-money.png" width="240" alt="Prize pool, prizes and payments">
  <img src="screenshots/phone-summary.png" width="240" alt="The summary at the end">
</p>

### 3. The end
When one player is left, the summary shows the places, prizes and **settle up**: each player's prize minus what they paid. **Share** sends it to the group chat. **Back to the tournament** undoes the last knockout if it was a mistake. The last tournament stays on the start page, so you can share it again later.

## Install it like an app
- **Android (Chrome)**: tap **Install** on the start page.
- **iPhone/iPad (Safari)**: tap **Share** → **Add to Home Screen**.

It works offline once it has been opened. Everything is stored only on your device.

## For developers
Plain HTML, CSS and JavaScript: no framework and no build step. See [CLAUDE.md](CLAUDE.md) for how it's built and [PLAN.md](PLAN.md) for the plan and the decisions.

```
npm install
npm start            # http://localhost:8000
npm test             # the rules: blinds, clock, tables, money, chips, translations
npm run e2e          # a whole tournament in a browser (needs Chromium)
npm run screenshots  # the pictures in this README
```

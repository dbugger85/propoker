// English and Norwegian (bokmål). The English text is the key, so the code
// stays readable: tr('Add player') gives "Ny spiller" in Norwegian.
// {name}-style gaps are filled from the second argument.
//
// The language comes from "?lang=no" / "?lang=en" in the address, then the
// saved choice (the round flag in the top bar), then the phone's language.
// Changing it reloads the page.

const KEY = 'propoker.lang';

export const NO = {
  // Head and the start page
  'ProPoker – poker tournament clock, tables and payouts': 'ProPoker – klokke, bord og premier for pokerturneringer',
  'Free app for poker nights, with no ads and no tracking: a big blind clock, players and knockouts, rebuys and add-ons, tables drawn from above with seating and balancing, chip counts, who has paid, payouts and who pays whom at the end. Works offline on any phone or tablet.':
    'Gratis app for pokerkvelden, uten reklame og sporing: stor blindklokke, spillere og utslag, rebuys og add-ons, bord tegnet ovenfra med plassering og balansering, sjetongtelling, hvem som har betalt, premier og hvem som betaler hvem til slutt. Virker uten nett på mobil og nettbrett.',
  'Clock, tables and money for poker night': 'Klokke, bord og penger for pokerkvelden',
  'ProPoker runs your poker tournament from one phone or tablet: a big blind clock with sounds, players and knockouts, rebuys and add-ons, seating and table balancing on tables drawn from above, chip counts at the breaks, who has paid, the prize pool and payouts, and at the end who sends what to whom.':
    'ProPoker styrer pokerturneringen fra én mobil eller ett nettbrett: stor blindklokke med lyd, spillere og utslag, rebuys og add-ons, plassering og balansering på bord tegnet ovenfra, sjetongtelling i pausene, hvem som har betalt, premiepott og utbetaling, og til slutt hvem som sender hva til hvem.',
  '100% free': '100 % gratis',
  'No ads': 'Ingen reklame',
  'No tracking': 'Ingen sporing',
  'No account': 'Ingen konto',
  'Works offline': 'Virker uten nett',
  'About ProPoker': 'Om ProPoker',
  'What it does': 'Dette kan den',
  'The blind clock': 'Blindklokka',
  'Tables from above': 'Bordene ovenfra',
  'Players and knockouts': 'Spillere og utslag',
  'Chip counts': 'Sjetongtelling',
  'Who pays whom': 'Hvem betaler hvem',
  'Your chip set': 'Sjetongene dine',
  'New tournament': 'Ny turnering',
  'Winner: {name} · {n} players': 'Vinner: {name} · {n} spillere',
  '{n} players': '{n} spillere',
  'Install the app': 'Installer appen',
  'Quick to open, works without signal.': 'Rask å åpne, virker uten dekning.',
  Install: 'Installer',
  'Not now': 'Ikke nå',
  'Open source – help make it better on GitHub': 'Åpen kildekode – bidra på GitHub',
  'Install on iPhone': 'Installer på iPhone',
  'Tap the <strong>Share</strong> button <span class="share-icon" aria-hidden="true"></span> in Safari’s toolbar.': 'Trykk på <strong>Del</strong>-knappen <span class="share-icon" aria-hidden="true"></span> i Safari.',
  'Scroll down and tap <strong>Add to Home Screen</strong>.': 'Bla ned og trykk <strong>Legg til på Hjem-skjerm</strong>.',
  'Tap <strong>Add</strong>. ProPoker is now on your home screen.': 'Trykk <strong>Legg til</strong>. ProPoker ligger nå på Hjem-skjermen.',
  'Got it': 'Skjønner',
  'Language: {lang}. Tap for {other}.': 'Språk: {lang}. Trykk for {other}.',
  'Theme: {theme}. Tap to change.': 'Tema: {theme}. Trykk for å bytte.',
  Auto: 'Auto',
  Light: 'Lyst',
  Dark: 'Mørkt',
  'Copied. Paste it in the group chat': 'Kopiert. Lim det inn i gruppechatten',
  Share: 'Del',
  Close: 'Lukk',
  OK: 'OK',
  Cancel: 'Avbryt',
  Back: 'Tilbake',
  Done: 'Ferdig',
  'Your tournaments': 'Dine turneringer',
  'Export everything': 'Eksporter alt',
  'Import': 'Importer',
  'Main menu': 'Hovedmeny',
  'Share results': 'Del resultatene',
  'Play again': 'Spill igjen',
  'Undo the deal': 'Angre avtalen',
  'Undo the last knockout': 'Angre siste utslag',
  'Not started · {n} players': 'Ikke startet · {n} spillere',
  'Finished · {n} players': 'Ferdig · {n} spillere',
  'Options for {name}': 'Valg for {name}',
  'Open setup': 'Åpne oppsettet',
  'See the results': 'Se resultatene',
  'Back to the game': 'Tilbake til spillet',
  'New tournament with this setup': 'Ny turnering med dette oppsettet',
  'Delete': 'Slett',
  'Delete {name}?': 'Slette {name}?',
  'The setup, the players and the results are gone for good': 'Oppsettet, spillerne og resultatene forsvinner for godt',
  '{name} deleted': '{name} er slettet',
  'Saved as {file}': 'Lagret som {file}',
  'This isn’t a ProPoker file': 'Dette er ikke en ProPoker-fil',
  'Import {n} tournaments?': 'Importere {n} turneringer?',
  'Ones you already have are replaced by the ones in the file. The others stay': 'De du allerede har, byttes ut med de i filen. De andre blir',
  '{n} tournaments imported': '{n} turneringer importert',
  'It’s added to your tournaments.': 'Den legges til blant turneringene dine.',
  'They become a new tournament.': 'De blir en ny turnering.',
  'Saved as a new tournament in the main menu': 'Lagret som en ny turnering i hovedmenyen',
  Edit: 'Rediger',
  'Reset all settings': 'Tilbakestill alt',
  'Reset all settings?': 'Tilbakestille alle innstillinger?',
  'Buy-in, chips, blinds, rebuys, tables and payouts go back to how they were at the start. The players and saved names stay': 'Buy-in, sjetonger, blinds, rebuys, bord og premier blir som de var fra start. Spillerne og de lagrede navnene blir',
  Reset: 'Tilbakestill',
  'Settings reset': 'Innstillingene er tilbakestilt',
  Save: 'Lagre',
  Remove: 'Fjern',
  Add: 'Legg til',
  Later: 'Senere',
  Skip: 'Hopp over',
  Undo: 'Angre',
  Undone: 'Angret',
  '{h} h {m} min': '{h} t {m} min',
  '{m} min': '{m} min',

  // Setup
  Tournament: 'Turnering',
  Name: 'Navn',
  'Poker night {date}': 'Pokerkveld {date}',
  'Poker night': 'Pokerkveld',
  Currency: 'Valuta',
  'Buy-in': 'Buy-in',
  'Starting chips': 'Startsjetonger',
  'Game points, not money': 'Spillpoeng, ikke penger',
  'House fee per player': 'Avgift per spiller',
  'For food and drinks; kept out of the prize pool': 'Til mat og drikke; holdes utenfor premiepotten',
  Chips: 'Sjetonger',
  'Your chip colours and what each is worth in the game. The blinds are rounded to the smallest chip. Fill in how many you have to check there are enough':
    'Fargene på sjetongene deres og hva hver er verdt i spillet. Blindene rundes av til den minste sjetongen. Fyll inn hvor mange dere har for å sjekke at det holder',
  Colour: 'Farge',
  Value: 'Verdi',
  'You have': 'Dere har',
  'Add colour': 'Legg til farge',
  'Each player starts with': 'Hver spiller starter med',
  'A rebuy': 'En rebuy',
  'The add-on': 'Add-on',
  '{chips} can’t be made with these chips': '{chips} kan ikke settes sammen av disse sjetongene',
  'Your chips are enough for 1 player': 'Sjetongene holder til 1 spiller',
  'Your chips are enough for {n} players': 'Sjetongene holder til {n} spillere',
  White: 'Hvit',
  Red: 'Rød',
  Blue: 'Blå',
  Green: 'Grønn',
  Black: 'Svart',
  Purple: 'Lilla',
  Yellow: 'Gul',
  Orange: 'Oransje',
  Pink: 'Rosa',
  Grey: 'Grå',
  Brown: 'Brun',
  Blinds: 'Blinds',
  Turbo: 'Turbo',
  Standard: 'Standard',
  Deep: 'Dyp',
  Custom: 'Egen',
  'Your own': 'Din egen',
  'Tournament length': 'Turneringens lengde',
  'The blinds are worked out to fit': 'Blindsene regnes ut så det passer',
  'Not set': 'Ikke valgt',
  'Levels from the structure': 'Nivåer fra strukturen',
  '{h} h': '{h} t',
  '{n} levels of {m} min, {time} in all. By the last level the big blind is about 1/20 of all chips (counting {p} players and some rebuys and add-ons), so the game should be over': '{n} nivåer à {m} min, {time} i alt. På siste nivå er big blind omtrent 1/20 av alle sjetongene (regnet med {p} spillere og noen rebuys og add-ons), så spillet bør være ferdig',
  'Minutes per level': 'Minutter per nivå',
  'Minutes per break': 'Minutter per pause',
  Antes: 'Ante',
  None: 'Ingen',
  'BB ante': 'BB-ante',
  Classic: 'Klassisk',
  'Add level': 'Legg til nivå',
  'Add break': 'Legg til pause',
  'Show fewer': 'Vis færre',
  'Show all {n} rows': 'Vis alle {n} radene',
  '{n} levels, {time} in all. The last level repeats, 1.5× bigger, if the game goes on': '{n} nivåer, {time} i alt. Varer spillet lenger, kommer nye nivåer, 1,5 × større',
  'Rebuys and add-ons': 'Rebuys og add-ons',
  Rebuys: 'Rebuys',
  'Rebuy price': 'Pris for rebuy',
  'Rebuy chips': 'Sjetonger for rebuy',
  'Rebuys until level': 'Rebuys t.o.m. nivå',
  'Offered at the break after the last rebuy level': 'Tilbys i pausen etter siste rebuy-nivå',
  'Add-on price': 'Pris for add-on',
  'Add-on chips': 'Sjetonger for add-on',
  'Late entry until level': 'Påmelding t.o.m. nivå',
  Tables: 'Bord',
  'Seats per table': 'Plasser per bord',
  'Draw seats at random': 'Trekk plasser tilfeldig',
  '{n} players at one table': '{n} spillere ved ett bord',
  '{n} players at {t} tables': '{n} spillere ved {t} bord',
  Players: 'Spillere',
  'Player name': 'Spillernavn',
  'Remove {name}': 'Fjern {name}',
  '{name} is already in': '{name} er allerede med',
  Payouts: 'Utbetaling',
  'Change payouts': 'Endre utbetaling',
  'Start tournament': 'Start turneringen',
  'Add at least 2 players': 'Legg til minst 2 spillere',
  'Add at least one level': 'Legg til minst ett nivå',
  'The starting stack can’t be made with your chips': 'Startstacken kan ikke settes sammen av sjetongene deres',
  'The payout percentages must add up to 100': 'Prosentene for utbetaling må bli 100 til sammen',

  // Levels
  Break: 'Pause',
  'Level {n}': 'Nivå {n}',
  'ante {a}': 'ante {a}',
  'Ante {a}': 'Ante {a}',
  'Small blind': 'Lille blind',
  'Big blind': 'Store blind',
  Ante: 'Ante',
  Minutes: 'Minutter',

  // Payouts
  Automatic: 'Automatisk',
  Percentages: 'Prosent',
  Fixed: 'Fast',
  'Fixed amounts, the rest to the winner': 'Faste beløp, resten til vinneren',
  '{how}. With {n} players the prize pool is {pool}:': '{how}. Med {n} spillere er premiepotten {pool}:',
  '{how}. Add players to see the prizes': '{how}. Legg til spillere for å se premiene',
  'Paid places follow the number of players: 1 up to 4 players, 2 from 5, 3 from 8, 4 from 14, 5 from 21, 6 from 30 and 7 from 40.':
    'Antall premierte følger antall spillere: 1 opp til 4 spillere, 2 fra 5, 3 fra 8, 4 fra 14, 5 fra 21, 6 fra 30 og 7 fra 40.',
  'Choose how many places are paid and what percent of the prize pool each gets.': 'Velg hvor mange som får premie og hvor mange prosent av potten hver får.',
  'Fixed amounts for some places, for example the buy-in back for 3rd. The rest of the prize pool goes to the winner.':
    'Faste beløp for noen plasser, for eksempel buy-in tilbake for 3. plass. Resten av premiepotten går til vinneren.',
  'The rest': 'Resten',
  'Add place': 'Legg til plass',
  'Remove place': 'Fjern plass',
  'Round prizes to': 'Rund av premiene til',
  'Fewer places if the last would win less than the buy-in': 'Færre premier hvis den siste ville fått mindre enn buy-in',
  'The percentages add up to {sum} %, not 100': 'Prosentene blir {sum} %, ikke 100',
  'The fixed amounts are {diff} more than the prize pool': 'De faste beløpene er {diff} mer enn premiepotten',
  'With {n} players and {pool}': 'Med {n} spillere og {pool}',

  // The clock
  Clock: 'Klokke',
  Money: 'Penger',
  Pause: 'Stopp',
  Paused: 'Stoppet',
  'Start the clock': 'Start klokka',
  Resume: 'Fortsett',
  'Next level': 'Neste nivå',
  '−1 min': '−1 min',
  '+1 min': '+1 min',
  'Sound on': 'Lyd på',
  Muted: 'Lyd av',
  'Next: {blinds}': 'Neste: {blinds}',
  'Average stack': 'Snittstack',
  '{n} big blinds': '{n} store blinds',
  'Prize pool': 'Premiepott',
  'Next break': 'Neste pause',
  Now: 'Nå',
  'Add-ons now': 'Add-ons nå',
  'Rebuys are closed': 'Rebuy er stengt',
  'Rebuys until the end of level {n}': 'Rebuys til slutten av nivå {n}',
  'Late entry until the end of level {n}': 'Sen påmelding til slutten av nivå {n}',
  'Colour up: the {chips} chips are not needed any more': 'Veksle opp: {chips}-sjetongene trengs ikke lenger',
  'The clock kept running': 'Klokka gikk videre',
  'The app was closed for {m} min, and the clock ran on. Keep it running (now {later}), or stop it where it was ({then})?':
    'Appen var lukket i {m} min, og klokka gikk videre. La den gå (nå {later}), eller stopp den der den var ({then})?',
  'level {n}, {time} left': 'nivå {n}, {time} igjen',
  'Keep it running': 'La den gå',
  'Stop where it was': 'Stopp der den var',

  // Players
  'In play': 'Med i spillet',
  Out: 'Ute',
  'Add player': 'Ny spiller',
  'Table {t}, seat {s}': 'Bord {t}, plass {s}',
  '{n} rebuys': '{n} rebuys',
  Rebuy: 'Rebuy',
  'Add-on': 'Add-on',
  'Paid {sum}': 'Betalt {sum}',
  'Owes {sum}': 'Skylder {sum}',
  'Knocked out': 'Slått ut',
  'Take back the add-on': 'Angre add-on',
  'Rebuy and back in': 'Rebuy og inn igjen',
  'Change seat': 'Bytt plass',
  'Rename {name}': 'Endre navn på {name}',
  'Left the game': 'Forlot spillet',
  'Out by {name}': 'Slått ut av {name}',
  'Rebuy for {name}?': 'Rebuy for {name}?',
  'Rebuys are open until the end of level {n}.': 'Rebuy er åpent til slutten av nivå {n}.',
  'Rebuy, stays in': 'Rebuy, fortsetter',
  'No, out': 'Nei, ute',
  'Who knocked {name} out?': 'Hvem slo ut {name}?',
  '{name} is out in {place}': '{name} er ute på {place} plass',
  'Rebuys were open until the end of level {n}. Allow one anyway?': 'Rebuy var åpent til slutten av nivå {n}. Tillate likevel?',
  '{name} is back in: {seat}': '{name} er med igjen: {seat}',
  'Rebuy for {name}: {chips} chips': 'Rebuy for {name}: {chips} sjetonger',
  'Add-ons are usually taken at the break after level {n}. Allow one anyway?': 'Add-on tas vanligvis i pausen etter nivå {n}. Tillate likevel?',
  'Add-on for {name}: {chips} chips': 'Add-on for {name}: {chips} sjetonger',
  '{name} leaves the game': '{name} forlater spillet',
  'Do their chips stay in play, or do they take them out of the game?': 'Blir sjetongene igjen i spillet, eller tas de ut?',
  'Chips stay in play': 'Sjetongene blir igjen',
  'Chips leave too': 'Sjetongene tas ut',
  '{name} left in {place}': '{name} gikk på {place} plass',
  'Late entry is closed': 'Sen påmelding er stengt',
  'Late entry was open until the end of level {n}. Add a player anyway?': 'Sen påmelding var åpen til slutten av nivå {n}. Legge til likevel?',
  'They get {chips} chips and a seat at the table with the most room.': 'Spilleren får {chips} sjetonger og en plass ved bordet med mest plass.',
  '{name}: {seat}': '{name}: {seat}',

  // Chip counts
  'Own colour': 'Egen farge',
  'Own colour…': 'Egen farge…',
  'Count chips': 'Tell sjetonger',
  'A good time to count the chips': 'Fin tid for å telle sjetongene',
  'Leader: {name}, {chips}': 'Leder: {name}, {chips}',
  'Chip leader': 'Chipleder',
  '{n} BB': '{n} BB',
  'Sort by stack': 'Sorter etter stack',
  'Sort by seat': 'Sorter etter plass',
  'Sort by value': 'Sorter etter verdi',
  'Take back a rebuy': 'Angre en rebuy',
  'Take back the rebuy (back out)': 'Angre rebuyen (ute igjen)',
  'Change place': 'Endre plassering',
  'Knocked out by': 'Slått ut av',
  'Not out after all': 'Ikke ute likevel',
  '{name} is out again in {place}': '{name} er ute igjen på {place} plass',
  'Rebuy taken back for {name}': 'Rebuy angret for {name}',
  'now {name}': 'nå {name}',
  'Which place did {name} finish in?': 'Hvilken plass kom {name} på?',
  '{name} is now {place}': '{name} er nå på {place} plass',
  Nobody: 'Ingen',
  'Chip count': 'Tell sjetonger',
  'Chips for {name}': 'Sjetonger for {name}',
  'Counted in level {n}': 'Talt i nivå {n}',
  'The chips {name} has now': 'Sjetongene {name} har nå',
  'Type in each player’s chips, table by table. A box left empty keeps the last count': 'Skriv inn sjetongene til hver spiller, bord for bord. En tom rute beholder forrige telling',
  'Counted so far': 'Talt så langt',
  'Chips in play': 'Sjetonger i spill',
  '1 player not counted yet': '1 spiller er ikke talt ennå',
  '{n} players not counted yet': '{n} spillere er ikke talt ennå',
  'Adds up': 'Stemmer',
  '{chips} too many': '{chips} for mye',
  '{chips} missing': '{chips} mangler',
  'Chips counted': 'Sjetongene er talt',

  // Tables
  'Table {n}': 'Bord {n}',
  '1 player': '1 spiller',
  'Seat {n}': 'Plass {n}',
  Empty: 'Ledig',
  'One player needs to move.': 'Én spiller må flytte.',
  '{n} players need to move.': '{n} spillere må flytte.',
  'Show the moves': 'Vis flyttingene',
  'Now tap the new seat for {name}': 'Trykk nå på den nye plassen til {name}',
  'Tap a player, then their new seat': 'Trykk på en spiller, så på ny plass',
  'Final table!': 'Finalebord!',
  'Break table {n}': 'Bord {n} legges ned',
  'Balance the tables': 'Jevn ut bordene',
  'Everyone left fits at one table. New seats for all:': 'Alle som er igjen får plass ved ett bord. Nye plasser for alle:',
  'One table fewer is enough now. These players move:': 'Nå holder det med ett bord færre. Disse spillerne flytter:',
  'One table has two more players than another. Move this player:': 'Ett bord har to spillere mer enn et annet. Flytt denne spilleren:',
  'Who moves from table {n}?': 'Hvem flytter fra bord {n}?',
  'Someone else': 'En annen',
  'They have moved': 'De har flyttet',
  'Good luck at the final table!': 'Lykke til ved finalebordet!',
  'Seats updated': 'Plassene er oppdatert',
  List: 'Liste',
  Dealer: 'Dealer',
  'Show the dealer at the tables': 'Vis dealeren ved bordene',
  '{chips} chips': '{chips} sjetonger',
  'moves to table {t}, seat {s}': 'flytter til bord {t}, plass {s}',
  'Seat {n}, empty': 'Plass {n}, ledig',
  'T{n}': 'B{n}',
  'The seat draw': 'Bordtrekningen',
  'Everyone is seated': 'Alle sitter',
  'Show the tables': 'Vis bordene',

  // Money
  'Money in': 'Penger inn',
  'House fee {fee}': 'Avgift {fee}',
  'Still to pay': 'Utestående',
  'Paid places': 'Premierte',
  Prizes: 'Premier',
  Payments: 'Betaling',
  '({n} owe)': '({n} skylder)',
  '(all paid)': '(alle har betalt)',
  rebuy: 'rebuy',
  'add-on': 'add-on',
  Paid: 'Betalt',
  Owes: 'Skylder',

  // Settings and a deal
  'Tournament settings': 'Turneringsinnstillinger',
  Sounds: 'Lyd',
  Vibrate: 'Vibrasjon',
  'Coming levels': 'Kommende nivåer',
  'Tap a level to change it. Drag a break by its handle to move it': 'Trykk på et nivå for å endre det. Dra en pause i håndtaket for å flytte den',
  'Drag to move the break': 'Dra for å flytte pausen',
  'End tournament': 'Avslutt turneringen',
  'End with a deal': 'Avslutt med en avtale',
  '{n} players are still in, and {sum} is left to win. Split evenly below; change the amounts if you agreed on something else. The list order gives the places.':
    '{n} spillere er fortsatt med, og {sum} gjenstår i premier. Delt likt nedenfor; endre beløpene hvis dere ble enige om noe annet. Rekkefølgen gir plasseringene.',
  'The amounts add up to {sum}, not {total}': 'Beløpene blir {sum}, ikke {total}',

  // The end
  '{name} wins!': '{name} vinner!',
  'Settle up': 'Oppgjør',
  'Settle up:': 'Oppgjør:',
  'Share these settings': 'Del disse innstillingene',
  'Poker settings': 'Pokerinnstillinger',
  'Link copied': 'Lenken er kopiert',
  'Buy-in {sum}': 'Buy-in {sum}',
  'Use these settings?': 'Bruke disse innstillingene?',
  'This link is broken': 'Denne lenken virker ikke',
  'Continue on another device': 'Fortsett på en annen enhet',
  'Makes a link with the whole tournament: players, seats, the clock, payments and chip counts. Open it on the other device and carry on there. The two don’t keep each other up to date, so use only the new one afterwards.': 'Lager en lenke med hele turneringen: spillere, plasser, klokka, betaling og sjetongtelling. Åpne den på den andre enheten og fortsett der. De to holder ikke hverandre oppdatert, så bruk bare den nye etterpå.',
  'Make the link': 'Lag lenken',
  '{n} of {m} players left': '{n} av {m} spillere igjen',
  'Continue this tournament here?': 'Fortsette turneringen her?',
  'Continue here': 'Fortsett her',
  'Use them': 'Bruk dem',
  'Ante same as big blind': 'Ante lik big blind',
  'Choose the chips': 'Velg sjetongene',
  'Your own chips · change': 'Egne sjetonger · endre',
  'The starting stack': 'Startstacken',
  'How many of each chip every player gets': 'Hvor mange av hver sjetong hver spiller får',
  'Each player starts with {chips}': 'Hver spiller starter med {chips}',
  'Automatic (the app suggests)': 'Automatisk (appen foreslår)',
  'The bank': 'Banken',
  'Everyone is square': 'Alle er skuls',
  'Someone not playing': 'En som ikke spiller',
  'The money paid in is with': 'Pengene som er betalt inn, er hos',
  'Who sends what to whom, with as few transfers as possible (for example with Vipps)': 'Hvem som sender hva til hvem, med så få overføringer som mulig (for eksempel med Vipps)',
  'Won and lost': 'Vunnet og tapt',
  'Prize won minus what each player bought': 'Premie minus det hver spiller kjøpte for',
  'Bought for {sum}': 'Kjøpt for {sum}',
  'Payment': 'Betaling',
  'Paid everything ({sum})': 'Har betalt alt ({sum})',
  'Paid part': 'Har betalt en del',
  'How much has {name} paid in all?': 'Hvor mye har {name} betalt i alt?',
  'Not paid': 'Ikke betalt',
  'owes {sum}': 'skylder {sum}',
  'paid {sum}': 'betalt {sum}',
  'of {sum}': 'av {sum}',
  '1 rebuy': '1 rebuy',
  '{n} knockouts': '{n} utslag',
  '1 knockout': '1 utslag',
  'Rebuys: {r}, add-ons: {a}': 'Rebuys: {r}, add-ons: {a}',
  'Levels played': 'Nivåer spilt',
  'Most knockouts': 'Flest utslag',
  'Most knockouts: {names} ({n})': 'Flest utslag: {names} ({n})',
  '(Deal between the last {n})': '(Avtale mellom de siste {n})',
  '{n} players, prize pool {pool}': '{n} spillere, premiepott {pool}',
  'House fee: {fee}': 'Avgift: {fee}',
};

export const LANGS = { en: 'English', no: 'Norsk' };

// Round flags for the language button: drawn, not emoji, so they look the same
// on every phone. The flag's own colours (fixed, not theme colours); the button crops them to a circle.
export const FLAGS = {
  en: `<svg viewBox="15 0 30 30" aria-hidden="true"><path d="M0 0h60v30H0z" fill="#012169"/>
    <path d="M0 0l60 30M60 0L0 30" stroke="#fff" stroke-width="6"/>
    <path d="M0 0l60 30M60 0L0 30" stroke="#c8102e" stroke-width="2"/>
    <path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/>
    <path d="M30 0v30M0 15h60" stroke="#c8102e" stroke-width="6"/></svg>`,
  no: `<svg viewBox="2 0 16 16" aria-hidden="true"><path d="M0 0h22v16H0z" fill="#ba0c2f"/>
    <path d="M6 0h4v16H6zM0 6h22v4H0z" fill="#fff"/>
    <path d="M7 0h2v16H7zM0 7h22v2H0z" fill="#00205b"/></svg>`,
};

function pick() {
  try {
    const asked = new URLSearchParams(location.search).get('lang');
    if (LANGS[asked]) {
      localStorage.setItem(KEY, asked);
      return asked;
    }
    const saved = localStorage.getItem(KEY);
    if (LANGS[saved]) return saved;
  } catch {}
  const phone = (navigator.languages ?? [navigator.language]).find((l) => /^(en|nb|nn|no)\b/i.test(l ?? ''));
  return /^(nb|nn|no)/i.test(phone ?? '') ? 'no' : 'en';
}

export const lang = typeof location === 'undefined' ? 'en' : pick();

export function tr(text, vars) {
  const s = (lang === 'no' && NO[text]) || text;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s;
}

// Switch language: save it and reload on that language's own address.
export function setLang(code) {
  try {
    localStorage.setItem(KEY, code);
  } catch {}
  const url = new URL(location.href);
  url.searchParams.set('lang', code);
  location.replace(url);
}

// Translates the page's own text: elements marked data-t (their text),
// data-t-html (their HTML), data-t-placeholder and data-t-label.
export function translatePage() {
  document.documentElement.lang = lang === 'no' ? 'nb' : 'en';
  if (lang === 'en') return;
  for (const e of document.querySelectorAll('[data-t]')) e.textContent = tr(e.textContent.trim());
  for (const e of document.querySelectorAll('[data-t-html]')) e.innerHTML = tr(e.innerHTML.trim());
  for (const e of document.querySelectorAll('[data-t-placeholder]')) e.placeholder = tr(e.placeholder);
  for (const e of document.querySelectorAll('[data-t-label]')) e.setAttribute('aria-label', tr(e.getAttribute('aria-label')));
  document.title = tr(document.title);
  const desc = document.querySelector('meta[name="description"]');
  desc.content = tr(desc.content);
  for (const m of document.querySelectorAll('meta[property="og:title"], meta[property="og:description"]')) m.content = tr(m.content);
  document.querySelector('meta[property="og:locale"]').content = 'nb_NO';
}

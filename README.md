# richup-monopoly

A real-time, browser-based Monopoly-style board game you can play with friends over a private invite link. No accounts, no downloads — just open the page, create a room and share the code.

## What it is

Two to eight players take turns rolling dice, buying city properties, building houses and hotels, collecting rent and trying to bankrupt everyone else. The full rule set includes:

- Buying and auctioning unowned properties
- Building houses evenly across a colour group, then upgrading to hotels
- Rent scaling with development and with the number of airports or companies owned
- Mortgage / unmortgage (mortgage value back plus 10% interest to lift)
- Surprise and Treasure card draws (move, collect, pay, get-out-of-jail, repairs)
- Jail: roll doubles to escape, pay the fine, or use a get-out-of-jail card
- Live trading: propose any combination of cash, properties and jail cards; the other player accepts, declines or sends a counter-offer
- Bankruptcy: assets transfer to the creditor; last person standing wins

AI bots fill empty seats and play automatically. Bot difficulty is configurable (easy, medium, hard) and affects how aggressively they buy, bid and build.

## Two boards

**Classic** — the familiar 40-tile loop with eight colour groups, four airports, two companies and its own Surprise/Treasure deck. Up to 4 players.

**World Tour** — a larger 56-tile board themed around real cities across every region, ten colour groups, six airports, four companies and a richer 16+16 card deck. Up to 8 players.

Adding a new map is a single file in `shared/src/maps/` — export a `MapDef` object with the tile list, colour groups and card decks, then register it in `shared/src/maps/index.ts`.

## Running it locally

```bash
npm install
npm run dev
```

This starts the game server on port 3001 and the Vite dev server on port 5173. Open `http://localhost:5173` in as many browser tabs as you like.

To run just the tests:

```bash
npm test
```

To build everything for production:

```bash
npm run build
npm start        # serves the built client from the same port as the API
```

## How rooms work

- The host creates a room and gets a five-character code plus a shareable invite link (e.g. `/?room=XYZAB`).
- Guests paste the code or click the link to join.
- The host configures the game before starting: board choice, starting cash, pass-Start bonus, turn timer, income tax mode, auction rules, vacation cash pot and bot difficulty.
- AI bots can be added to fill remaining seats.
- Once started, the room stays alive until everyone leaves. Closing and reopening the tab restores your session from `localStorage`.

## Lobby settings

| Setting | Default | Description |
|---|---|---|
| Starting cash | $1500 | How much each player starts with |
| Pass-Start bonus | $200 | Collected each time you lap the board |
| Max players | 4 / 8 | Capped by the selected map |
| Turn timer | off | Auto-ends an idle turn after N seconds |
| Income tax mode | Flat | Either flat dollar amount or 10% of net worth |
| Auction declined properties | on | Unowned properties go to auction if the current player declines to buy |
| Double rent on full colour set | on | Unimproved rent doubles when you own every property in a group |
| Taxes pile up on Vacation | on | Tax payments accumulate in a pot; landing on Vacation collects the whole thing |
| Bot difficulty | Medium | Easy bots are loose with money; Hard bots buy aggressively and bid high |

## Game UI

- **Player HUD** — a compact horizontal strip at the top of the screen shows every player's avatar, cash and net worth at a glance, with the active player highlighted.
- **3D dice** — CSS 3D dice spin and land on the rolled face, with a short roll animation each turn.
- **Token animation** — tokens step tile-by-tile around the board when a player moves, making it easy to follow the journey.
- **Deed card modal** — clicking any ownable tile opens a deed card with the full rent table and buy/manage actions.
- **Auction timer** — a 5-second countdown bar per-player in the auction modal; a player who doesn't bid in time automatically passes.
- **Counter-offers** — in the trade modal you can counter an incoming offer instead of just accepting or declining.
- **Win screen** — a full-screen overlay with confetti and a net-worth leaderboard when the game ends.

## Project layout

```
shared/    Pure game engine, types, maps and card decks (Vitest tests live here)
server/    Node + Express + Socket.io — authoritative state, rooms, bots
client/    React + TypeScript + Vite — board renderer and all UI
```

The server is the single source of truth. Every action goes through the engine as a pure function (state in → state out, no side effects), which makes the logic straightforward to test and reason about.

## Tech

- TypeScript across the whole monorepo (npm workspaces)
- React 18, Vite 5
- Socket.io 4 for real-time room sync
- Vitest for deterministic engine tests (seeded PRNG so results are reproducible)
- Zero database — everything lives in memory, which keeps the setup simple
